import React, { createContext, useContext, useState, useEffect } from 'react';
import { USER_SPREADSHEET_DATA } from '../data/userSpreadsheetData';

const DashboardContext = createContext(null);

export const DEFAULT_PROJECTS = [
  {
    id: 'proj-sri-sri-ayurveda',
    name: 'Sri Sri Ayurveda Hospital',
    client: 'srisriayurvedahospital.org',
    category: 'Healthcare & Wellness',
    color: '#6366F1',
    description: 'Monthly social media metrics tracking across Facebook, Instagram, YouTube, and LinkedIn.',
    createdAt: '2026-08-21',
    spreadsheetData: JSON.parse(JSON.stringify(USER_SPREADSHEET_DATA))
  },
  {
    id: 'proj-ecommerce-q3',
    name: 'E-Commerce Growth Campaign',
    client: 'Apex Brands',
    category: 'Retail & D2C',
    color: '#10B981',
    description: 'Meta Ads performance, Instagram engagement, and YouTube video conversions.',
    createdAt: '2026-08-05',
    spreadsheetData: JSON.parse(JSON.stringify(USER_SPREADSHEET_DATA))
  }
];

export function DashboardProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [currentView, setCurrentView] = useState('overview'); // overview, facebook, instagram, youtube, linkedin, admin
  const [portalMode, setPortalMode] = useState('client'); // 'client' | 'admin'
  const [activePlatformTab, setActivePlatformTab] = useState('facebook');
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize projects
  useEffect(() => {
    try {
      const saved = localStorage.getItem('social_bi_master_projects_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setProjects(parsed);
          setActiveProjectId(parsed[0].id);
          setIsLoading(false);
          return;
        }
      }
      setProjects(DEFAULT_PROJECTS);
      setActiveProjectId(DEFAULT_PROJECTS[0].id);
    } catch (e) {
      console.error('Error loading projects:', e);
      setProjects(DEFAULT_PROJECTS);
      setActiveProjectId(DEFAULT_PROJECTS[0].id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('social_bi_master_projects_v5', JSON.stringify(projects));
    }
  }, [projects]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || null;
  const sheetData = activeProject?.spreadsheetData || USER_SPREADSHEET_DATA;

  // Switch to Client View
  const viewClientDashboard = (projectId) => {
    if (projectId) setActiveProjectId(projectId);
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

  // Update specific platform table data
  const updatePlatformData = (platform, newRows) => {
    setProjects(prev => prev.map(proj => {
      if (proj.id !== activeProjectId) return proj;
      return {
        ...proj,
        spreadsheetData: {
          ...proj.spreadsheetData,
          [platform]: newRows
        }
      };
    }));
    showNotification(`Updated ${platform.toUpperCase()} dataset (${newRows.length} rows loaded).`);
  };

  // Reset project data to full original master spreadsheet
  const resetProjectToMaster = () => {
    setProjects(prev => prev.map(proj => {
      if (proj.id !== activeProjectId) return proj;
      return {
        ...proj,
        spreadsheetData: JSON.parse(JSON.stringify(USER_SPREADSHEET_DATA))
      };
    }));
    showNotification('Loaded full sample dataset for this project!');
  };

  // Clear all data or specific platform data for active project
  const clearProjectData = (platform = null) => {
    setProjects(prev => prev.map(proj => {
      if (proj.id !== activeProjectId) return proj;
      if (platform) {
        return {
          ...proj,
          spreadsheetData: {
            ...proj.spreadsheetData,
            [platform]: []
          }
        };
      }
      return {
        ...proj,
        spreadsheetData: {
          facebook: [],
          instagram: [],
          youtube: [],
          linkedin: []
        }
      };
    }));
    showNotification(platform ? `Cleared ${platform.toUpperCase()} data.` : 'Cleared all channel data for this workspace.');
  };

  // Create a new client workspace with clean/empty channels
  const createNewProject = ({ name, client, category, color, description, prefillSampleData = false }) => {
    const newProj = {
      id: `proj-${Date.now()}`,
      name: name || 'New Social Campaign',
      client: client || 'Direct Client',
      category: category || 'Social Growth',
      color: color || '#6366F1',
      description: description || 'Monthly social media metrics tracking.',
      createdAt: new Date().toISOString().split('T')[0],
      spreadsheetData: prefillSampleData
        ? JSON.parse(JSON.stringify(USER_SPREADSHEET_DATA))
        : {
            facebook: [],
            instagram: [],
            youtube: [],
            linkedin: []
          }
    };

    setProjects(prev => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    showNotification(`Created workspace "${newProj.name}"! Ready for your worksheets.`);
    return newProj;
  };

  const deleteProject = (id) => {
    if (projects.length <= 1) {
      showNotification('Cannot delete the last remaining project workspace.', 'warning');
      return;
    }
    const remaining = projects.filter(p => p.id !== id);
    setProjects(remaining);
    if (activeProjectId === id) {
      setActiveProjectId(remaining[0].id);
    }
    showNotification('Project deleted.');
  };

  // Computed summary metrics
  const computedMetrics = React.useMemo(() => {
    const fb = sheetData.facebook || [];
    const ig = sheetData.instagram || [];
    const yt = sheetData.youtube || [];
    const li = sheetData.linkedin || [];

    const totalFbReach = fb.reduce((sum, r) => sum + (r.reach || 0), 0);
    const totalIgReach = ig.reduce((sum, r) => sum + (r.reach || 0), 0);
    const totalYtViews = yt.reduce((sum, r) => sum + (r.totalViews || 0), 0);
    const totalLiImpr = li.reduce((sum, r) => sum + (r.impressions || 0), 0);

    const totalAdSpend = fb.reduce((sum, r) => sum + (r.adSpend || 0), 0);

    // Latest followers
    const latestFbFollowers = fb.length > 0 ? (fb[fb.length - 1].totalPageFollowers || 0) : 0;
    const latestIgFollowers = ig.length > 0 ? (ig[ig.length - 1].totalFollowers || 0) : 0;
    const latestYtSubs = yt.length > 0 ? (yt[yt.length - 1].totalSubscribers || 0) : 0;
    const latestLiFollowers = li.length > 0 ? (li[li.length - 1].totalFollowers || 0) : 0;

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
      latestLiFollowers
    };
  }, [sheetData]);

  return (
    <DashboardContext.Provider
      value={{
        projects,
        activeProjectId,
        setActiveProjectId,
        activeProject,
        sheetData,
        updatePlatformData,
        resetProjectToMaster,
        clearProjectData,
        createNewProject,
        deleteProject,
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
        showNotification
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
