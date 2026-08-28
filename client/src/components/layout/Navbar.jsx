import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { FolderKanban, Eye, Building2, RefreshCw, Lock, ShieldCheck, LogOut } from 'lucide-react';

export default function Navbar() {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    portalMode,
    viewClientDashboard,
    syncProjectFromGoogleSheet,
    isSyncing,
    isAdminAuthenticated,
    openLoginModal,
    logoutAdmin
  } = useDashboard();

  return (
    <header
      style={{
        height: '96px',
        minHeight: '96px',
        flexShrink: 0,
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-sidebar)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        boxSizing: 'border-box'
      }}
    >
      {/* Left Section: Project Switcher or Active Title */}
      {portalMode === 'admin' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F59E0B',
              flexShrink: 0
            }}
          >
            <FolderKanban size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Admin Portal
              </span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '1px 6px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <ShieldCheck size={10} /> SuperAdmin
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={activeProjectId || ''}
                onChange={(e) => setActiveProjectId(e.target.value)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: '220px'
                }}
              >
                {projects.map(p => (
                  <option key={p.id || p._id} value={p.id || p._id}>
                    {p.name} {p.description ? `(${p.description})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366F1',
              flexShrink: 0
            }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', lineHeight: 1.25 }}>
              {activeProject?.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{activeProject?.description || 'Client Performance Overview'}</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span>Live Executive View</span>
            </div>
          </div>
        </div>
      )}

      {/* Right Section: Sync Button & View Switcher / Auth Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick Sync Button if project has Google Sheet URL and user is Admin */}
        {activeProject?.googleSheetUrl && isAdminAuthenticated && (
          <button
            onClick={() => syncProjectFromGoogleSheet(activeProject.id || activeProject._id)}
            disabled={isSyncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            title={activeProject.lastSyncedAt ? `Last synced: ${activeProject.lastSyncedAt}` : 'Sync latest live data from Google Sheet'}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Live Sheet 🔄'}</span>
          </button>
        )}

        {portalMode === 'admin' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => viewClientDashboard()}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '8px 16px',
                borderRadius: '8px'
              }}
            >
              <Eye size={15} /> View Client Dashboard
            </button>
            <button
              onClick={logoutAdmin}
              title="Log out Admin"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          !isAdminAuthenticated && (
            <button
              onClick={openLoginModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#6366F1',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Lock size={13} />
              <span>Admin Login</span>
            </button>
          )
        )}
      </div>
    </header>
  );
}
