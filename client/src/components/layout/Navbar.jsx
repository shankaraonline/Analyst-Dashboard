import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { FolderKanban, Eye, Building2, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function Navbar() {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    portalMode,
    viewClientDashboard,
    syncProjectFromGoogleSheet,
    isSyncing
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
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(12px)',
        boxSizing: 'border-box',
        transition: 'background-color 0.25s ease, border-color 0.25s ease'
      }}
    >
      {/* Left Section */}
      {portalMode === 'admin' ? (
        /* Admin Mode: Project Selector */
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderKanban size={19} color="#F59E0B" />
            <span style={{ fontSize: '0.875rem', color: '#F59E0B', fontWeight: 700 }}>
              Admin Workspace:
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <select
              className="form-select"
              value={activeProjectId || ''}
              onChange={(e) => setActiveProjectId(e.target.value)}
              style={{
                paddingRight: '36px',
                fontWeight: 700,
                fontSize: '0.9rem',
                minWidth: '290px',
                padding: '9px 14px',
                cursor: 'pointer',
                background: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                borderRadius: '8px'
              }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.client ? `(${p.client})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        /* Client Mode: Clean Client Branding */
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
              <span>{activeProject?.client}</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span>Performance Overview</span>
            </div>
          </div>
        </div>
      )}

      {/* Right Section: Sync Button & View Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick Sync Button if project has Google Sheet URL */}
        {activeProject?.googleSheetUrl && (
          <button
            onClick={() => syncProjectFromGoogleSheet(activeProject.id)}
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

        {portalMode === 'admin' && (
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
        )}
      </div>
    </header>
  );
}
