import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { syncGoogleSheetUrl } from '../utils/googleSheetSync';
import { cleanNumericValue, isPeriodOrMonthHeader } from '../utils/spreadsheetParser';
import { computeChangeFromValues } from '../utils/computeTabKpiCards';

const DashboardContext = createContext(null);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

export const DEFAULT_STARTER_PROJECT = {
  name: 'Multi-Tab Performance Dashboard',
  description: 'Multi-tab Google Sheet intelligence and live ledger tracking.',
  googleSheetUrl: '',
  lastSyncedAt: null,
  color: '#6366F1'
};

export function DashboardProvider({ children }) {
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem('social_bi_projects_v11');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [activeProjectId, setActiveProjectId] = useState(() => {
    try {
      const saved = localStorage.getItem('social_bi_projects_v11');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id || parsed[0]._id;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [currentView, setCurrentView] = useState('overview'); // 'overview' | 'admin' | '<tab_id>'
  const [portalMode, setPortalMode] = useState('client'); // 'client' | 'admin'
  const [activePlatformTab, setActivePlatformTab] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Authentication State
  const [adminToken, setAdminToken] = useState(() => {
    try {
      return localStorage.getItem('social_bi_admin_token') || null;
    } catch {
      return null;
    }
  });
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const u = localStorage.getItem('social_bi_admin_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isAdminAuthenticated = Boolean(adminToken);

  // KPI Visibility preferences: { [tabId]: string[] } — admin-selected metric keys per tab
  // Loaded from MongoDB per-project; localStorage per-project cache prevents flicker
  const [omnichannelKpiVisibility, setOmnichannelKpiVisibility] = useState({});
  // Ref to track which project the visibility state currently belongs to
  const visibilityProjectRef = useRef(null);

  // In-memory / session parsed spreadsheet data cache (never saved to DB)
  const [sessionSpreadsheetMap, setSessionSpreadsheetMap] = useState(() => {
    try {
      const saved = sessionStorage.getItem('social_bi_session_sheet_data_v11');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // In-memory / session tabs metadata cache (never saved to DB)
  const [sessionTabsMap, setSessionTabsMap] = useState(() => {
    try {
      const saved = sessionStorage.getItem('social_bi_session_tabs_map_v11');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      if (Object.keys(sessionSpreadsheetMap).length > 0) {
        sessionStorage.setItem('social_bi_session_sheet_data_v11', JSON.stringify(sessionSpreadsheetMap));
      }
      if (Object.keys(sessionTabsMap).length > 0) {
        sessionStorage.setItem('social_bi_session_tabs_map_v11', JSON.stringify(sessionTabsMap));
      }
    } catch {
      // ignore
    }
  }, [sessionSpreadsheetMap, sessionTabsMap]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Helper for Authorization Headers on mutating requests
  const getAuthHeaders = (extraHeaders = {}) => {
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
    return headers;
  };

  // Admin Authentication Actions
  const loginAdmin = async (username, password) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        setAdminToken(data.token);
        setAdminUser(data.user);
        try {
          localStorage.setItem('social_bi_admin_token', data.token);
          localStorage.setItem('social_bi_admin_user', JSON.stringify(data.user));
        } catch {}
        setPortalMode('admin');
        setCurrentView('admin');
        showNotification('Authenticated as SuperAdmin', 'success');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Authentication failed' };
      }
    } catch (err) {
      return { success: false, error: 'Could not connect to authentication server.' };
    }
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdminUser(null);
    try {
      localStorage.removeItem('social_bi_admin_token');
      localStorage.removeItem('social_bi_admin_user');
    } catch {}
    setPortalMode('client');
    setCurrentView('overview');
    showNotification('Logged out from Admin Portal', 'info');
  };

  const openLoginModal = () => setIsAuthModalOpen(true);
  const closeLoginModal = () => setIsAuthModalOpen(false);

  // -------------------------------------------------------------
  // Load Lightweight Projects from MongoDB
  // -------------------------------------------------------------
  useEffect(() => {
    async function loadProjects() {
      let localSaved = [];
      try {
        const raw = localStorage.getItem('social_bi_projects_v11');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) localSaved = parsed;
        }
      } catch {
        // ignore
      }

      try {
        const res = await fetch(`${API_BASE_URL}/projects`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.projects)) {
            let dbProjects = data.projects;

            // Auto-migrate any local offline metadata to MongoDB if authenticated
            const localOnlyProjects = localSaved.filter(
              lp => lp.id && lp.id.startsWith('proj-') && !dbProjects.some(dp => dp.name?.trim().toLowerCase() === lp.name?.trim().toLowerCase())
            );

            if (localOnlyProjects.length > 0 && adminToken) {
              for (const lp of localOnlyProjects) {
                try {
                  const saveRes = await fetch(`${API_BASE_URL}/projects`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                      name: lp.name,
                      website: lp.website || '',
                      description: lp.description || '',
                      googleSheetUrl: lp.googleSheetUrl || '',
                      color: lp.color || '#6366F1'
                    })
                  });
                  if (saveRes.ok) {
                    const savedData = await saveRes.json();
                    if (savedData.success && savedData.project) {
                      dbProjects = [savedData.project, ...dbProjects];
                    }
                  }
                } catch (migrateErr) {
                  console.warn('Could not auto-migrate project metadata to MongoDB:', migrateErr.message);
                }
              }
            }

            if (dbProjects.length > 0) {
              setProjects(dbProjects);
              const firstId = activeProjectId && dbProjects.some(p => (p.id || p._id) === activeProjectId)
                ? activeProjectId
                : (dbProjects[0].id || dbProjects[0]._id);
              setActiveProjectId(firstId);

              // Auto on-demand sync for active project if sheet URL is present and not yet in session cache
              const currentProj = dbProjects.find(p => (p.id || p._id) === firstId);
              if (currentProj?.googleSheetUrl && !sessionSpreadsheetMap[firstId]) {
                syncProjectFromGoogleSheet(firstId, currentProj.googleSheetUrl, true);
              }
              return;
            } else {
              // Database completely empty, create initial project metadata if authenticated
              if (adminToken) {
                const createRes = await fetch(`${API_BASE_URL}/projects`, {
                  method: 'POST',
                  headers: getAuthHeaders(),
                  body: JSON.stringify(DEFAULT_STARTER_PROJECT),
                  signal: AbortSignal.timeout(5000)
                });
                if (createRes.ok) {
                  const created = await createRes.json();
                  if (created.success && created.project) {
                    setProjects([created.project]);
                    setActiveProjectId(created.project.id || created.project._id);
                    return;
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('MongoDB sync in background, using local cache:', err.message);
      }

      if (projects.length === 0) {
        const fallbackProject = { id: `proj-${Date.now()}`, ...DEFAULT_STARTER_PROJECT };
        setProjects([fallbackProject]);
        setActiveProjectId(fallbackProject.id);
      }
    }

    loadProjects();
  }, []);

  // Save lightweight projects to localStorage
  useEffect(() => {
    if (projects.length > 0) {
      const lightweight = projects.map(p => ({
        id: p.id || p._id,
        name: p.name,
        website: p.website || '',
        description: p.description || '',
        googleSheetUrl: p.googleSheetUrl || '',
        lastSyncedAt: p.lastSyncedAt || null,
        color: p.color || '#6366F1'
      }));
      localStorage.setItem('social_bi_projects_v11', JSON.stringify(lightweight));
    }
  }, [projects]);

  // Read URL query param to load specific workspace if shared: ?project=<id>
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlProjectId = params.get('project');
      if (urlProjectId && projects.some(p => (p.id || p._id) === urlProjectId)) {
        setActiveProjectId(urlProjectId);
      }
    } catch {}
  }, [projects]);

  const activeProject = useMemo(() => {
    return projects.find(p => (p.id || p._id) === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  const activeProjectIdStr = activeProject ? (activeProject.id || activeProject._id) : null;

  // Active tabs
  const activeTabs = useMemo(() => {
    if (!activeProjectIdStr) return [];
    return sessionTabsMap[activeProjectIdStr] || [];
  }, [sessionTabsMap, activeProjectIdStr]);

  // Active sheet data
  const sheetData = useMemo(() => {
    if (!activeProjectIdStr) return {};
    return sessionSpreadsheetMap[activeProjectIdStr] || {};
  }, [sessionSpreadsheetMap, activeProjectIdStr]);

  useEffect(() => {
    if (activeTabs.length > 0) {
      if (!activePlatformTab || !activeTabs.some(t => t.id === activePlatformTab)) {
        setActivePlatformTab(activeTabs[0].id);
      }
    } else {
      setActivePlatformTab(null);
    }
  }, [activeTabs]);

  // Switch to Client Presentation Mode
  const viewClientDashboard = () => {
    setPortalMode('client');
    if (currentView === 'admin') {
      setCurrentView('overview');
    }
    showNotification('Opened Client Presentation Dashboard');
  };

  // Switch to Admin Portal (with Auth Check)
  const viewAdminPortal = () => {
    if (adminToken) {
      setPortalMode('admin');
      setCurrentView('admin');
      showNotification('Switched to Admin Panel');
    } else {
      openLoginModal();
    }
  };

  // Live On-Demand Sync
  const syncProjectFromGoogleSheet = async (projectId = activeProjectId, overrideUrl = null, silent = false) => {
    const proj = projects.find(p => (p.id || p._id) === projectId);
    const targetUrl = overrideUrl || proj?.googleSheetUrl;

    if (!targetUrl || !targetUrl.trim()) {
      if (!silent) showNotification('Please enter a Google Sheet URL first.', 'error');
      return false;
    }

    setIsSyncing(true);
    try {
      // 1. Server-side live sync
      try {
        const res = await fetch(`${API_BASE_URL}/projects/${projectId}/sync`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ sheetUrl: targetUrl.trim() })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.tabs && json.sheetData) {
            const pid = json.project?.id || json.project?._id || projectId;
            
            setSessionSpreadsheetMap(prev => ({
              ...prev,
              [pid]: json.sheetData
            }));

            setSessionTabsMap(prev => ({
              ...prev,
              [pid]: json.tabs
            }));

            setProjects(prev => prev.map(p => {
              if ((p.id || p._id) !== pid) return p;
              return {
                ...p,
                googleSheetUrl: targetUrl,
                lastSyncedAt: json.syncedAt,
                tabCount: json.tabs.length,
                tabs: json.tabs
              };
            }));

            if (json.tabs.length > 0 && (!activePlatformTab || !json.tabs.some(t => t.id === activePlatformTab))) {
              setActivePlatformTab(json.tabs[0].id);
            }

            if (!silent) {
              showNotification(`Live synced ${json.tabs.length} tabs (${json.totalRows} rows)!`, 'success');
            }
            return true;
          }
        }
      } catch (serverErr) {
        console.warn('Backend sync error, trying client-side sync:', serverErr.message);
      }

      // 2. Client-side fallback sync
      const syncResult = await syncGoogleSheetUrl(targetUrl);
      const now = new Date().toLocaleString();

      setSessionSpreadsheetMap(prev => ({
        ...prev,
        [projectId]: syncResult.sheetData
      }));

      setSessionTabsMap(prev => ({
        ...prev,
        [projectId]: syncResult.tabs
      }));

      setProjects(prev => prev.map(p => {
        const pid = p.id || p._id;
        if (pid !== projectId) return p;
        return {
          ...p,
          googleSheetUrl: targetUrl,
          lastSyncedAt: now,
          tabCount: syncResult.tabs.length,
          tabs: syncResult.tabs
        };
      }));

      if (adminToken) {
        await fetch(`${API_BASE_URL}/projects/${projectId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            googleSheetUrl: targetUrl,
            lastSyncedAt: now
          })
        }).catch(() => {});
      }

      if (!silent) {
        showNotification(`Live synced ${syncResult.tabs.length} tabs (${syncResult.totalRows} rows)!`, 'success');
      }
      return true;
    } catch (err) {
      console.error('Google Sheet Sync Error:', err);
      if (!silent) showNotification(err.message || 'Sync failed. Verify sheet link sharing.', 'error');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Update project metadata in MongoDB
  const updateProjectSettings = async (projectId, updates) => {
    const cleanUpdates = {
      name: updates.name,
      website: updates.website,
      description: updates.description,
      googleSheetUrl: updates.googleSheetUrl,
      lastSyncedAt: updates.lastSyncedAt,
      color: updates.color
    };

    Object.keys(cleanUpdates).forEach(k => cleanUpdates[k] === undefined && delete cleanUpdates[k]);

    setProjects(prev => prev.map(p => {
      const pid = p.id || p._id;
      if (pid !== projectId) return p;
      return { ...p, ...cleanUpdates };
    }));

    if (!adminToken) {
      openLoginModal();
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(cleanUpdates)
      });
      if (res.status === 401) {
        openLoginModal();
        return;
      }
      showNotification('Project settings saved to MongoDB.');
    } catch (err) {
      console.warn('Could not update project in MongoDB:', err);
    }
  };

  // Add in-memory custom tab
  const addCustomTab = (tabId, tabName, columns, rows) => {
    if (!activeProjectIdStr) return;

    const cleanTabId = (tabId || tabName).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const finalName = tabName || cleanTabId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const updatedSheetData = {
      ...sheetData,
      [cleanTabId]: rows
    };

    let updatedTabs = [...activeTabs];
    const existingIdx = updatedTabs.findIndex(t => t.id === cleanTabId);
    const newTabMeta = {
      id: cleanTabId,
      name: finalName,
      columns: columns || [],
      rowCount: rows.length
    };

    if (existingIdx !== -1) {
      updatedTabs[existingIdx] = newTabMeta;
    } else {
      updatedTabs.push(newTabMeta);
    }

    setSessionSpreadsheetMap(prev => ({
      ...prev,
      [activeProjectIdStr]: updatedSheetData
    }));

    setSessionTabsMap(prev => ({
      ...prev,
      [activeProjectIdStr]: updatedTabs
    }));

    setActivePlatformTab(cleanTabId);
    showNotification(`Added tab "${finalName}" to current session!`);
    return cleanTabId;
  };

  // Delete tab from session
  const deleteTab = (tabId) => {
    if (!activeProjectIdStr) return;

    const updatedTabs = activeTabs.filter(t => t.id !== tabId);
    const updatedSheetData = { ...sheetData };
    delete updatedSheetData[tabId];

    setSessionSpreadsheetMap(prev => ({
      ...prev,
      [activeProjectIdStr]: updatedSheetData
    }));

    setSessionTabsMap(prev => ({
      ...prev,
      [activeProjectIdStr]: updatedTabs
    }));

    if (activePlatformTab === tabId) {
      setActivePlatformTab(updatedTabs[0]?.id || null);
    }
    showNotification('Tab removed from session.');
  };

  // Create new project in MongoDB
  const createNewProject = async ({
    name,
    website = '',
    description = '',
    googleSheetUrl = '',
    color = '#6366F1'
  }) => {
    if (!adminToken) {
      openLoginModal();
      return null;
    }

    const payload = {
      name: name.trim(),
      website: website.trim(),
      description: description.trim(),
      googleSheetUrl: (googleSheetUrl || '').trim(),
      color
    };

    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        openLoginModal();
        return null;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.project) {
          const newId = data.project.id || data.project._id;
          setProjects(prev => [data.project, ...prev]);
          setActiveProjectId(newId);

          if (data.project.googleSheetUrl) {
            syncProjectFromGoogleSheet(newId, data.project.googleSheetUrl);
          }

          showNotification(`Saved workspace "${data.project.name}" to MongoDB!`);
          return data.project;
        }
      }
    } catch (err) {
      console.warn('MongoDB API create failed, creating locally:', err);
    }

    const localProj = {
      id: `proj-${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setProjects(prev => [localProj, ...prev]);
    setActiveProjectId(localProj.id);
    showNotification(`Created workspace "${localProj.name}"!`);
    return localProj;
  };

  // Delete project from MongoDB
  const deleteProject = async (id) => {
    if (!adminToken) {
      openLoginModal();
      return;
    }

    if (projects.length <= 1) {
      showNotification('Cannot delete the last remaining project workspace.', 'warning');
      return;
    }
    const remaining = projects.filter(p => (p.id || p._id) !== id);
    setProjects(remaining);
    if (activeProjectId === id) {
      setActiveProjectId(remaining[0].id || remaining[0]._id);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        openLoginModal();
        return;
      }
      showNotification('Project deleted from MongoDB.');
    } catch (err) {
      console.warn('Could not delete project from MongoDB:', err);
    }
  };

  // Computed aggregated metrics across all tabs — with REAL change percentages
  const computedOverview = useMemo(() => {
    let totalRowsCount = 0;
    let totalSpend = 0;
    let totalVolume = 0;
    let totalActions = 0;
    let totalAudience = 0;

    // Track current-period vs previous-period values for real change computation
    let totalSpendCurrent = 0, totalSpendPrevious = 0;
    let totalVolumeCurrent = 0, totalVolumePrevious = 0;
    let totalActionsCurrent = 0, totalActionsPrevious = 0;
    let totalAudienceCurrent = 0, totalAudiencePrevious = 0;

    activeTabs.forEach(tab => {
      const rows = sheetData[tab.id] || [];
      totalRowsCount += rows.length;
      if (rows.length === 0) return;

      const cols = tab.columns && tab.columns.length > 0 ? tab.columns : [];
      const colKeys = cols.map(c => (typeof c === 'string' ? c : c.key));

      const numericCols = colKeys.filter(k => {
        if (!k || isPeriodOrMonthHeader(k)) return false;
        const sampleValues = rows.slice(0, 10).map(r => r[k]).filter(v => v !== undefined && v !== null && String(v).trim() !== '');
        if (sampleValues.length === 0) return false;
        const validNumCount = sampleValues.filter(v => typeof v === 'number' || (typeof v === 'string' && /^-?[\d,.]+%?$/.test(v.trim()))).length;
        return validNumCount >= sampleValues.length * 0.5;
      });

      const firstRealKey = Object.keys(rows[0]).find(k => k !== '_rowId') || Object.keys(rows[0])[0];
      const isWide = rows.length > 0 && isPeriodOrMonthHeader(firstRealKey) && numericCols.length > 5;

      if (isWide) {
        const standingAudienceRows = [];
        const changeAudienceRows = [];
        // Identify last two month columns for period-over-period change
        const lastCol = numericCols[numericCols.length - 1];
        const prevCol = numericCols.length >= 2 ? numericCols[numericCols.length - 2] : null;

        rows.forEach(row => {
          const rowKeys = Object.keys(row).filter(k => k !== '_rowId');
          const rowLabel = String(row[rowKeys[0]] || '').toLowerCase();
          let rowSum = 0;
          numericCols.forEach(k => {
            const raw = row[k];
            if (raw !== undefined && raw !== null) {
              rowSum += cleanNumericValue(raw);
            }
          });
          // Current and previous period values for this row
          const rowCurrent = cleanNumericValue(row[lastCol]);
          const rowPrevious = prevCol ? cleanNumericValue(row[prevCol]) : 0;

          if (rowLabel.includes('spend') || rowLabel.includes('spent') || rowLabel.includes('cost') || rowLabel.includes('budget') || rowLabel.includes('inr') || rowLabel.includes('amt') || rowLabel.includes('price') || rowLabel.includes('amount')) {
            totalSpend += rowSum;
            totalSpendCurrent += rowCurrent;
            totalSpendPrevious += rowPrevious;
          } else if (rowLabel.includes('reach') || rowLabel.includes('view') || rowLabel.includes('impr') || rowLabel.includes('traffic') || rowLabel.includes('visit')) {
            totalVolume += rowSum;
            totalVolumeCurrent += rowCurrent;
            totalVolumePrevious += rowPrevious;
          } else if (rowLabel.includes('action') || rowLabel.includes('lead') || rowLabel.includes('click') || rowLabel.includes('conv') || rowLabel.includes('order') || rowLabel.includes('session') || rowLabel.includes('interaction') || rowLabel.includes('engagement')) {
            totalActions += rowSum;
            totalActionsCurrent += rowCurrent;
            totalActionsPrevious += rowPrevious;
          } else if (rowLabel.includes('follow') || rowLabel.includes('sub') || rowLabel.includes('fan') || rowLabel.includes('aud')) {
            const isChange = rowLabel.includes('new') || rowLabel.includes('gain') || rowLabel.includes('lost') || rowLabel.includes('growth') || rowLabel.includes('added') || rowLabel.includes('+');
            if (isChange) {
              changeAudienceRows.push(rowSum);
            } else {
              // Stock balance metric in wide format -> take latest non-empty month
              for (let i = numericCols.length - 1; i >= 0; i--) {
                const raw = row[numericCols[i]];
                if (raw !== undefined && raw !== null && raw !== '' && raw !== '-') {
                  const num = cleanNumericValue(raw);
                  if (!isNaN(num) && num > 0) {
                    standingAudienceRows.push(num);
                    break;
                  }
                }
              }
              // Track current/previous for audience change
              totalAudienceCurrent += rowCurrent;
              totalAudiencePrevious += rowPrevious;
            }
          }
        });

        if (standingAudienceRows.length > 0) {
          standingAudienceRows.forEach(num => { totalAudience += num; });
        } else if (changeAudienceRows.length > 0) {
          changeAudienceRows.forEach(num => { totalAudience += num; });
        }
      } else {
        const spendCols = numericCols.filter(k => {
          const l = k.toLowerCase();
          return l.includes('spend') || l.includes('cost') || l.includes('budget') || l.includes('inr') || l.includes('amt') || l.includes('price');
        });
        const volumeCols = numericCols.filter(k => {
          const l = k.toLowerCase();
          return l.includes('reach') || l.includes('view') || l.includes('impr') || l.includes('traffic') || l.includes('visit');
        });
        const actionCols = numericCols.filter(k => {
          const l = k.toLowerCase();
          return l.includes('action') || l.includes('lead') || l.includes('click') || l.includes('conv') || l.includes('order');
        });
        const audienceCols = numericCols.filter(k => {
          const l = k.toLowerCase();
          return l.includes('follow') || l.includes('sub') || l.includes('fan') || l.includes('aud');
        });

        rows.forEach(row => {
          spendCols.forEach(k => {
            if (row[k] !== undefined && row[k] !== null) totalSpend += cleanNumericValue(row[k]);
          });
          volumeCols.forEach(k => {
            if (row[k] !== undefined && row[k] !== null) totalVolume += cleanNumericValue(row[k]);
          });
          actionCols.forEach(k => {
            if (row[k] !== undefined && row[k] !== null) totalActions += cleanNumericValue(row[k]);
          });
        });

        // Compute current/previous from last two rows for standard format
        const lastRow = rows[rows.length - 1];
        const prevRow = rows.length >= 2 ? rows[rows.length - 2] : null;
        spendCols.forEach(k => {
          if (lastRow?.[k] != null) totalSpendCurrent += cleanNumericValue(lastRow[k]);
          if (prevRow?.[k] != null) totalSpendPrevious += cleanNumericValue(prevRow[k]);
        });
        volumeCols.forEach(k => {
          if (lastRow?.[k] != null) totalVolumeCurrent += cleanNumericValue(lastRow[k]);
          if (prevRow?.[k] != null) totalVolumePrevious += cleanNumericValue(prevRow[k]);
        });
        actionCols.forEach(k => {
          if (lastRow?.[k] != null) totalActionsCurrent += cleanNumericValue(lastRow[k]);
          if (prevRow?.[k] != null) totalActionsPrevious += cleanNumericValue(prevRow[k]);
        });

        const standingAudienceCols = audienceCols.filter(k => {
          const l = k.toLowerCase();
          return !l.includes('new') && !l.includes('gain') && !l.includes('lost') && !l.includes('growth') && !l.includes('added') && !l.includes('+');
        });
        const changeAudienceCols = audienceCols.filter(k => {
          const l = k.toLowerCase();
          return l.includes('new') || l.includes('gain') || l.includes('lost') || l.includes('growth') || l.includes('added') || l.includes('+');
        });

        if (standingAudienceCols.length > 0) {
          standingAudienceCols.forEach(k => {
            let foundLatest = false;
            for (let i = rows.length - 1; i >= 0; i--) {
              const val = rows[i][k];
              if (val !== undefined && val !== null && val !== '' && val !== '-') {
                const num = cleanNumericValue(val);
                if (!isNaN(num) && num > 0) {
                  if (!foundLatest) {
                    totalAudience += num;
                    totalAudienceCurrent += num;
                    foundLatest = true;
                  } else {
                    totalAudiencePrevious += num;
                    break;
                  }
                }
              }
            }
          });
        } else if (changeAudienceCols.length > 0) {
          changeAudienceCols.forEach(k => {
            rows.forEach(row => {
              if (row[k] !== undefined && row[k] !== null) totalAudience += cleanNumericValue(row[k]);
            });
          });
          // Current/previous for change audience cols
          changeAudienceCols.forEach(k => {
            if (lastRow?.[k] != null) totalAudienceCurrent += cleanNumericValue(lastRow[k]);
            if (prevRow?.[k] != null) totalAudiencePrevious += cleanNumericValue(prevRow[k]);
          });
        }

        if (spendCols.length === 0 && volumeCols.length === 0 && actionCols.length === 0 && audienceCols.length === 0 && numericCols.length > 0) {
          const primaryCol = numericCols[0];
          rows.forEach(row => {
            if (row[primaryCol] !== undefined && row[primaryCol] !== null) {
              const num = cleanNumericValue(row[primaryCol]);
              totalAudience += num;
            }
          });
          // Current/previous for fallback primary column
          if (lastRow?.[primaryCol] != null) totalAudienceCurrent += cleanNumericValue(lastRow[primaryCol]);
          if (prevRow?.[primaryCol] != null) totalAudiencePrevious += cleanNumericValue(prevRow[primaryCol]);
        }
      }
    });

    return {
      totalTabs: activeTabs.length,
      totalRowsCount,
      totalSpend,
      totalVolume,
      totalActions,
      totalAudience,
      // Real computed change data for Summary KPI cards
      volumeChange: computeChangeFromValues(totalVolumeCurrent, totalVolumePrevious),
      spendChange: computeChangeFromValues(totalSpendCurrent, totalSpendPrevious),
      actionsChange: computeChangeFromValues(totalActionsCurrent, totalActionsPrevious),
      audienceChange: computeChangeFromValues(totalAudienceCurrent, totalAudiencePrevious)
    };
  }, [activeTabs, sheetData]);

  // Load KPI visibility from MongoDB — per-project with instant reset on switch
  useEffect(() => {
    if (!activeProjectIdStr) return;

    // Immediately reset visibility to per-project cache (prevents stale data from previous project)
    const cacheKey = `social_bi_kpi_visibility_${activeProjectIdStr}`;
    let cached = {};
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) cached = JSON.parse(raw);
    } catch {}
    setOmnichannelKpiVisibility(cached);
    visibilityProjectRef.current = activeProjectIdStr;

    // Then fetch authoritative data from MongoDB
    async function loadKpiVisibility() {
      try {
        const res = await fetch(`${API_BASE_URL}/projects/${activeProjectIdStr}/kpi-visibility`, {
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.kpiVisibility) {
            // Only apply if we haven't already switched projects while waiting
            if (visibilityProjectRef.current === activeProjectIdStr) {
              setOmnichannelKpiVisibility(data.kpiVisibility);
              try {
                localStorage.setItem(cacheKey, JSON.stringify(data.kpiVisibility));
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn('Could not load KPI visibility from MongoDB, using per-project cache:', err.message);
      }
    }
    loadKpiVisibility();
  }, [activeProjectIdStr]);

  // Set visibility for a specific tab and persist to MongoDB + per-project localStorage
  const setTabKpiVisibility = async (tabId, visibleKeys) => {
    const updated = { ...omnichannelKpiVisibility, [tabId]: visibleKeys };
    setOmnichannelKpiVisibility(updated);
    // Persist to per-project localStorage cache
    if (activeProjectIdStr) {
      try {
        localStorage.setItem(`social_bi_kpi_visibility_${activeProjectIdStr}`, JSON.stringify(updated));
      } catch {}
    }

    if (!activeProjectIdStr || !adminToken) return;
    try {
      await fetch(`${API_BASE_URL}/projects/${activeProjectIdStr}/kpi-visibility`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tabId, visibleKeys, config: visibleKeys })
      });
    } catch (err) {
      console.warn('Could not persist KPI visibility to MongoDB:', err.message);
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        projects,
        activeProjectId,
        setActiveProjectId,
        activeProject,
        activeTabs,
        sessionTabsMap,
        sheetData,
        activePlatformTab,
        setActivePlatformTab,
        addCustomTab,
        deleteTab,
        createNewProject,
        deleteProject,
        syncProjectFromGoogleSheet,
        updateProjectSettings,
        isSyncing,
        portalMode,
        setPortalMode,
        viewClientDashboard,
        viewAdminPortal,
        currentView,
        setCurrentView,
        computedOverview,
        omnichannelKpiVisibility,
        setTabKpiVisibility,
        isLoading,
        notification,
        showNotification,
        // Authentication properties
        adminToken,
        adminUser,
        isAdminAuthenticated,
        isAuthModalOpen,
        openLoginModal,
        closeLoginModal,
        loginAdmin,
        logoutAdmin
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
