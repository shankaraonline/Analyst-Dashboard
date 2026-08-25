import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncGoogleSheetUrl } from '../utils/googleSheetSync';

const DashboardContext = createContext(null);
const API_BASE_URL = 'http://localhost:5000/api';

export const DEFAULT_CATEGORIES = [
  { id: 'facebook', label: 'Facebook Page', icon: 'facebook' },
  { id: 'instagram', label: 'Instagram Insights', icon: 'instagram' },
  { id: 'youtube', label: 'YouTube Analytics', icon: 'youtube' },
  { id: 'linkedin', label: 'LinkedIn B2B', icon: 'linkedin' }
];

export const AVAILABLE_VERTICAL_PRESETS = [
  { id: 'facebook', label: 'Facebook Page & Ads', icon: 'facebook' },
  { id: 'instagram', label: 'Instagram Insights', icon: 'instagram' },
  { id: 'youtube', label: 'YouTube Analytics', icon: 'youtube' },
  { id: 'linkedin', label: 'LinkedIn B2B', icon: 'linkedin' },
  { id: 'whatsapp', label: 'WhatsApp Marketing', icon: 'whatsapp' },
  { id: 'website_audits', label: 'Website Audits & Traffic', icon: 'website' }
];

export const DEFAULT_STARTER_PROJECT = {
  name: 'Social Media Analytics',
  website: 'https://example.com',
  category: 'Digital Marketing',
  color: '#6366F1',
  description: 'Multi-channel social performance and live Google Sheet tracking.',
  googleSheetUrl: '',
  lastSyncedAt: null,
  categories: ['facebook', 'instagram', 'youtube', 'linkedin']
};

export function DashboardProvider({ children }) {
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem('social_bi_projects_v9');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [activeProjectId, setActiveProjectId] = useState(() => {
    try {
      const saved = localStorage.getItem('social_bi_projects_v9');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed[0].id || parsed[0]._id;
      }
    } catch (e) {}
    return null;
  });

  const [currentView, setCurrentView] = useState('overview');
  const [portalMode, setPortalMode] = useState('client'); // 'client' | 'admin'
  const [activePlatformTab, setActivePlatformTab] = useState('facebook');
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // In-memory / session parsed spreadsheet data with fast session cache
  const [sessionSpreadsheetMap, setSessionSpreadsheetMap] = useState(() => {
    try {
      const saved = sessionStorage.getItem('social_bi_session_sheet_data');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      if (Object.keys(sessionSpreadsheetMap).length > 0) {
        sessionStorage.setItem('social_bi_session_sheet_data', JSON.stringify(sessionSpreadsheetMap));
      }
    } catch (e) {}
  }, [sessionSpreadsheetMap]);

  // Custom verticals list
  const [customVerticals, setCustomVerticals] = useState(() => {
    try {
      const saved = localStorage.getItem('social_bi_custom_verticals');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('social_bi_custom_verticals', JSON.stringify(customVerticals));
    } catch (e) {
      console.warn('Could not save custom verticals to localStorage:', e);
    }
  }, [customVerticals]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // -------------------------------------------------------------
  // Fast Background Sync from MongoDB (Non-blocking)
  // -------------------------------------------------------------
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch(`${API_BASE_URL}/projects`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.projects && data.projects.length > 0) {
            setProjects(data.projects);
            if (!activeProjectId) {
              const firstId = data.projects[0].id || data.projects[0]._id;
              setActiveProjectId(firstId);
            }
            return;
          } else if (data.success && (!data.projects || data.projects.length === 0)) {
            // Create starter project if database is completely empty
            const createRes = await fetch(`${API_BASE_URL}/projects`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(DEFAULT_STARTER_PROJECT),
              signal: AbortSignal.timeout(3000)
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
      } catch (err) {
        console.warn('MongoDB sync in background, using local cache:', err.message);
      }

      // If no projects exist in state or storage, create local starter fallback
      if (projects.length === 0) {
        const fallbackProject = { id: `proj-${Date.now()}`, ...DEFAULT_STARTER_PROJECT };
        setProjects([fallbackProject]);
        setActiveProjectId(fallbackProject.id);
      }
    }

    loadProjects();
  }, []);

  // Save to localStorage as secondary backup
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('social_bi_projects_v9', JSON.stringify(projects));
    }
  }, [projects]);

  const activeProject = projects.find(p => (p.id || p._id) === activeProjectId) || projects[0] || null;

  // Active sheet data from in-memory session map
  const activeProjectIdStr = activeProject ? (activeProject.id || activeProject._id) : null;
  const sheetData = (activeProjectIdStr && sessionSpreadsheetMap[activeProjectIdStr]) || {
    facebook: [],
    instagram: [],
    youtube: [],
    linkedin: [],
    whatsapp: [],
    website_audits: []
  };

  // Switch to Client View
  const viewClientDashboard = (projectId) => {
    if (projectId) {
      setActiveProjectId(projectId);
      const proj = projects.find(p => (p.id || p._id) === projectId);
      if (proj?.googleSheetUrl && !sessionSpreadsheetMap[projectId]) {
        syncProjectFromGoogleSheet(projectId, proj.googleSheetUrl, true);
      }
    }
    setPortalMode('client');
    setCurrentView('overview');
    showNotification('Opened Client Presentation Dashboard');
  };

  // Switch to Admin Portal
  const viewAdminPortal = () => {
    setPortalMode('admin');
    setCurrentView('admin');
    showNotification('Switched to Admin Panel');
  };

  // Update specific platform table data in memory
  const updatePlatformData = (platform, newRows) => {
    if (!activeProjectIdStr) return;
    setSessionSpreadsheetMap(prev => ({
      ...prev,
      [activeProjectIdStr]: {
        ...(prev[activeProjectIdStr] || {}),
        [platform]: newRows
      }
    }));
    showNotification(`Loaded ${newRows.length} rows into ${platform.toUpperCase()} session.`);
  };

  // 1-Click Sync project with its Google Sheet URL (Fetches live data & saves URL to MongoDB)
  const syncProjectFromGoogleSheet = async (projectId = activeProjectId, overrideUrl = null, silent = false) => {
    const proj = projects.find(p => (p.id || p._id) === projectId);
    const targetUrl = overrideUrl || proj?.googleSheetUrl;

    if (!targetUrl || !targetUrl.trim()) {
      if (!silent) showNotification('Please add a Google Sheet URL first.', 'error');
      return false;
    }

    setIsSyncing(true);
    try {
      // 1. Attempt fast server-side live sync (< 500ms)
      try {
        const res = await fetch(`${API_BASE_URL}/projects/${projectId}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetUrl: targetUrl.trim(), categories: proj?.categories })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const pid = json.project?.id || json.project?._id || projectId;
            setSessionSpreadsheetMap(prev => ({
              ...prev,
              [pid]: json.data
            }));
            setProjects(prev => prev.map(p => {
              if ((p.id || p._id) !== pid) return p;
              return {
                ...p,
                googleSheetUrl: targetUrl,
                lastSyncedAt: json.syncedAt
              };
            }));
            let rowCount = 0;
            Object.keys(json.data || {}).forEach(k => {
              rowCount += (json.data[k] || []).length;
            });
            if (!silent) showNotification(`Synced live with Google Sheet! (${rowCount} monthly rows)`, 'success');
            return true;
          }
        } else {
          const errData = await res.json().catch(() => null);
          if (errData && errData.error) {
            if (!silent) showNotification(errData.error, 'error');
            return false;
          }
        }
      } catch (serverErr) {
        console.warn('Backend sync unavailable, falling back to client-side sync:', serverErr.message);
      }

      // 2. Client-side fallback fetch (only if backend server was unreachable)
      const categories = proj?.categories || ['facebook', 'instagram', 'youtube', 'linkedin'];
      const parsedData = await syncGoogleSheetUrl(targetUrl, categories);
      const now = new Date().toLocaleString();
      let totalRows = 0;
      Object.keys(parsedData).forEach(k => {
        totalRows += (parsedData[k] || []).length;
      });

      setSessionSpreadsheetMap(prev => ({
        ...prev,
        [projectId]: parsedData
      }));

      setProjects(prev => prev.map(p => {
        const pid = p.id || p._id;
        if (pid !== projectId) return p;
        return {
          ...p,
          googleSheetUrl: targetUrl,
          lastSyncedAt: now
        };
      }));

      // Update URL and lastSyncedAt in MongoDB
      await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleSheetUrl: targetUrl,
          lastSyncedAt: now
        })
      }).catch(() => {});

      if (!silent) showNotification(`Synced live with Google Sheet! (${totalRows} monthly rows)`, 'success');
      return true;
    } catch (err) {
      console.error('Google Sheet Sync Error:', err);
      if (!silent) showNotification(err.message || 'Sync failed. Please check sheet sharing permissions.', 'error');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Update project settings (name, website, googleSheetUrl, categories) in MongoDB
  const updateProjectSettings = async (projectId, updates) => {
    setProjects(prev => prev.map(p => {
      const pid = p.id || p._id;
      if (pid !== projectId) return p;
      return {
        ...p,
        ...updates
      };
    }));

    try {
      await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      showNotification('Project settings saved to MongoDB.');
    } catch (err) {
      console.warn('Could not update project in MongoDB:', err);
    }
  };

  // Clear session data
  const clearProjectData = (platform = null) => {
    if (!activeProjectIdStr) return;
    if (platform) {
      setSessionSpreadsheetMap(prev => ({
        ...prev,
        [activeProjectIdStr]: {
          ...(prev[activeProjectIdStr] || {}),
          [platform]: []
        }
      }));
    } else {
      setSessionSpreadsheetMap(prev => ({
        ...prev,
        [activeProjectIdStr]: {
          facebook: [],
          instagram: [],
          youtube: [],
          linkedin: [],
          whatsapp: [],
          website_audits: []
        }
      }));
    }
    showNotification(platform ? `Cleared ${platform.toUpperCase()} data.` : 'Cleared all channel data.');
  };

  // Create a new client workspace in MongoDB (saves Name, Website, Verticals & Google Sheet URL)
  const createNewProject = async ({
    name,
    website = '',
    categories = ['facebook', 'instagram', 'youtube', 'linkedin'],
    googleSheetUrl = ''
  }) => {
    const payload = {
      name: name.trim(),
      website: website.trim(),
      categories: categories.length > 0 ? categories : ['facebook', 'instagram', 'youtube', 'linkedin'],
      googleSheetUrl: (googleSheetUrl || '').trim()
    };

    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.project) {
          const newId = data.project.id || data.project._id;
          setProjects(prev => [data.project, ...prev]);
          setActiveProjectId(newId);

          // If Google Sheet URL was provided on creation, trigger live sync
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

    // Fallback local creation
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

  const deleteProject = async (id) => {
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
      await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'DELETE'
      });
      showNotification('Project deleted from MongoDB.');
    } catch (err) {
      console.warn('Could not delete project from MongoDB:', err);
    }
  };

  // Computed summary metrics from live session sheetData
  const computedMetrics = React.useMemo(() => {
    const fb = sheetData.facebook || [];
    const ig = sheetData.instagram || [];
    const yt = sheetData.youtube || [];
    const li = sheetData.linkedin || [];
    const wa = sheetData.whatsapp || [];
    const web = sheetData.website_audits || [];

    const totalFbReach = fb.reduce((sum, r) => sum + (Number(r.reach) || 0), 0);
    const totalIgReach = ig.reduce((sum, r) => sum + (Number(r.reach) || 0), 0);
    const totalYtViews = yt.reduce((sum, r) => sum + (Number(r.totalViews) || Number(r.views) || 0), 0);
    const totalLiImpr = li.reduce((sum, r) => sum + (Number(r.impressions) || 0), 0);

    const totalAdSpend = fb.reduce((sum, r) => sum + (Number(r.adSpend) || 0), 0);

    // Latest followers
    const latestFbFollowers = fb.length > 0 ? (Number(fb[fb.length - 1].totalPageFollowers) || Number(fb[fb.length - 1].totalFollowers) || 0) : 0;
    const latestIgFollowers = ig.length > 0 ? (Number(ig[ig.length - 1].totalFollowers) || 0) : 0;
    const latestYtSubs = yt.length > 0 ? (Number(yt[yt.length - 1].totalSubscribers) || 0) : 0;
    const latestLiFollowers = li.length > 0 ? (Number(li[li.length - 1].totalFollowers) || 0) : 0;

    const totalAudience = latestFbFollowers + latestIgFollowers + latestYtSubs + latestLiFollowers;
    const combinedReachViews = totalFbReach + totalIgReach + totalYtViews + totalLiImpr;

    return {
      totalAdSpend,
      combinedReachViews,
      totalAudience,
      totalFbReach,
      totalIgReach,
      totalYtViews,
      totalLiImpr,
      latestFbFollowers,
      latestIgFollowers,
      latestYtSubs,
      latestLiFollowers,
      waCount: wa.length,
      webCount: web.length
    };
  }, [sheetData]);

  // -------------------------------------------------------------
  // Dynamic Verticals / Channels Management
  // -------------------------------------------------------------
  const allVerticals = React.useMemo(() => {
    const map = new Map();
    // 1. Base Presets
    AVAILABLE_VERTICAL_PRESETS.forEach(p => map.set(p.id, p));
    // 2. Custom Verticals created & saved
    customVerticals.forEach(v => map.set(v.id, v));
    // 3. Any category present in any project
    projects.forEach(p => {
      (p.categories || []).forEach(catId => {
        if (!map.has(catId)) {
          map.set(catId, {
            id: catId,
            label: catId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            icon: 'custom',
            isCustom: true
          });
        }
      });
    });
    return Array.from(map.values()).map(v => ({
      ...v,
      isCustom: !AVAILABLE_VERTICAL_PRESETS.some(p => p.id === v.id)
    }));
  }, [customVerticals, projects]);

  const addCustomVertical = (rawName) => {
    if (!rawName || !rawName.trim()) return null;
    const name = rawName.trim();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    const existsPreset = AVAILABLE_VERTICAL_PRESETS.some(p => p.id === id);
    const existsCustom = customVerticals.some(p => p.id === id);

    if (!existsPreset && !existsCustom) {
      const newVertical = {
        id,
        label: name,
        icon: 'custom',
        isCustom: true
      };
      setCustomVerticals(prev => [...prev, newVertical]);
    }

    // Automatically enable it in the active project
    if (activeProject) {
      const currentCats = activeProject.categories || [];
      if (!currentCats.includes(id)) {
        const updated = [...currentCats, id];
        updateProjectSettings(activeProject.id || activeProject._id, { categories: updated });
      }
    }
    showNotification(`Added vertical "${name}" to All Verticals!`);
    return id;
  };

  const deleteCustomVertical = (id) => {
    setCustomVerticals(prev => prev.filter(v => v.id !== id));
    // Remove from all projects
    setProjects(prev => prev.map(p => {
      if (p.categories && p.categories.includes(id)) {
        const updatedCats = p.categories.filter(c => c !== id);
        updateProjectSettings(p.id || p._id, { categories: updatedCats });
        return { ...p, categories: updatedCats };
      }
      return p;
    }));
    showNotification('Removed custom vertical.');
  };

  return (
    <DashboardContext.Provider
      value={{
        projects,
        activeProjectId,
        setActiveProjectId,
        activeProject,
        sheetData,
        updatePlatformData,
        clearProjectData,
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
        activePlatformTab,
        setActivePlatformTab,
        computedMetrics,
        isLoading,
        notification,
        showNotification,
        customVerticals,
        allVerticals,
        addCustomVertical,
        deleteCustomVertical
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
