import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import {
  LayoutDashboard,
  UploadCloud,
  Eye,
  Settings,
  Lock,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { getTabIconComponent } from '../../views/UniversalTabView';

export default function Sidebar() {
  const {
    currentView,
    setCurrentView,
    activeProject,
    activeTabs,
    sheetData,
    portalMode,
    viewClientDashboard,
    viewAdminPortal,
    isAdminAuthenticated,
    logoutAdmin,
    openLoginModal
  } = useDashboard();

  return (
    <aside
      style={{
        width: '260px',
        minWidth: '260px',
        borderRight: '1px solid var(--border-color)',
        background: 'var(--bg-sidebar)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100vh',
        boxSizing: 'border-box'
      }}
    >
      <div>
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingLeft: '8px' }}>
          <img
            src="/logo.png"
            alt="Shankara Online Solutions"
            style={{
              height: '42px',
              maxWidth: '180px',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* Navigation Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main Navigation */}
          <div>
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '8px',
                paddingLeft: '8px'
              }}
            >
              Main Views
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                onClick={() => setCurrentView('overview')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: currentView === 'overview' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  color: currentView === 'overview' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  border: `1px solid ${currentView === 'overview' ? 'rgba(99, 102, 241, 0.3)' : 'transparent'}`,
                  fontSize: '0.875rem',
                  fontWeight: currentView === 'overview' ? 700 : 500,
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.15s ease'
                }}
              >
                <LayoutDashboard size={18} color={currentView === 'overview' ? '#6366F1' : 'var(--text-secondary)'} />
                <span>Omnichannel View</span>
              </button>
            </nav>
          </div>

          {/* Dynamic Auto-Discovered Platform Tabs */}
          {activeTabs && activeTabs.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '8px',
                  paddingLeft: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>Channels &amp; Ledgers</span>
                <span style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', padding: '1px 6px', borderRadius: '10px' }}>
                  {activeTabs.length}
                </span>
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '35vh', overflowY: 'auto', paddingRight: '2px' }}>
                {activeTabs.map(tab => {
                  const isActive = currentView === tab.id;
                  const { icon: TabIcon, color: tabColor } = getTabIconComponent(tab.name);
                  const rowCount = (sheetData[tab.id] || []).length || tab.rowCount || 0;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setCurrentView(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: isActive ? `${tabColor}18` : 'transparent',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        border: `1px solid ${isActive ? `${tabColor}44` : 'transparent'}`,
                        fontSize: '0.8125rem',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        width: '100%',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <TabIcon size={16} color={tabColor} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tab.name}
                        </span>
                      </div>
                      {rowCount > 0 && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '1px 5px',
                            borderRadius: '6px',
                            background: isActive ? `${tabColor}33` : 'var(--bg-main)',
                            color: isActive ? tabColor : 'var(--text-muted)',
                            fontWeight: 600
                          }}
                        >
                          {rowCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Admin Management Navigation (Only if Authenticated or in Admin mode) */}
          {portalMode === 'admin' && (
            <div>
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#F59E0B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '8px',
                  paddingLeft: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ShieldCheck size={12} color="#F59E0B" />
                <span>Admin Management</span>
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={() => setCurrentView('admin')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: currentView === 'admin' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                    color: currentView === 'admin' ? '#F59E0B' : 'var(--text-secondary)',
                    border: `1px solid ${currentView === 'admin' ? 'rgba(245, 158, 11, 0.3)' : 'transparent'}`,
                    fontSize: '0.875rem',
                    fontWeight: currentView === 'admin' ? 700 : 500,
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <UploadCloud size={18} color="#F59E0B" />
                  <span>Worksheets &amp; Projects</span>
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Client View Status + Admin Switcher / Auth */}
      <div>
        {portalMode === 'client' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeProject && (
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeProject.name}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {activeTabs.length} tabs • {activeProject.website || 'Direct'}
                </div>
              </div>
            )}

            {isAdminAuthenticated ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => viewAdminPortal()}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    borderColor: 'rgba(245, 158, 11, 0.35)',
                    color: '#F59E0B',
                    background: 'rgba(245, 158, 11, 0.08)',
                    fontWeight: 700,
                    padding: '9px 10px',
                    fontSize: '0.8rem'
                  }}
                >
                  <Settings size={14} /> Admin Portal
                </button>
                <button
                  onClick={logoutAdmin}
                  title="Log out Admin"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                    borderRadius: '8px',
                    padding: '0 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => openLoginModal()}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  borderColor: 'rgba(99, 102, 241, 0.35)',
                  color: '#6366F1',
                  background: 'rgba(99, 102, 241, 0.08)',
                  fontWeight: 600,
                  padding: '9px 12px'
                }}
              >
                <Lock size={14} /> Admin Login
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => viewClientDashboard()}
              style={{
                width: '100%',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                padding: '10px',
                fontWeight: 700
              }}
            >
              <Eye size={16} /> View Client Dashboard
            </button>
            <button
              onClick={logoutAdmin}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#EF4444',
                padding: '7px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <LogOut size={13} /> Log out Admin
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
