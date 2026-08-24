import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import {
  LayoutDashboard,
  UploadCloud,
  Eye,
  Settings
} from 'lucide-react';
import { InstagramIcon, YoutubeIcon, LinkedinIcon, FacebookIcon } from '../common/SocialIcons';

export default function Sidebar() {
  const {
    currentView,
    setCurrentView,
    activeProject,
    portalMode,
    viewClientDashboard,
    viewAdminPortal
  } = useDashboard();

  const navItems = [
    { id: 'overview', label: 'Omnichannel Overview', icon: LayoutDashboard },
    { id: 'facebook', label: 'Facebook Page', icon: FacebookIcon, color: '#1877F2' },
    { id: 'instagram', label: 'Instagram Insights', icon: InstagramIcon, color: '#E1306C' },
    { id: 'youtube', label: 'YouTube Analytics', icon: YoutubeIcon, color: '#FF0000' },
    { id: 'linkedin', label: 'LinkedIn B2B', icon: LinkedinIcon, color: '#0A66C2' }
  ];

  return (
    <aside
      style={{
        width: '260px',
        borderRight: '1px solid var(--border-color)',
        background: 'var(--bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'background-color 0.25s ease, border-color 0.25s ease'
      }}
    >
      {/* Brand Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', marginBottom: '28px' }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              height: '44px',
              maxWidth: '195px',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>

        {/* Navigation Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Main Social Channels (In Client Mode or when navigating from Admin) */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: '8px' }}>
              Channels & Insights
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      border: `1px solid ${isActive ? 'rgba(99, 102, 241, 0.25)' : 'transparent'}`,
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={18} color={item.color || (isActive ? 'var(--accent-primary)' : 'currentColor')} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Admin Navigation Section (Visible only in Admin Mode) */}
          {portalMode === 'admin' && (
            <div>
              <div style={{ fontSize: '0.7rem', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: '8px' }}>
                Admin Operations
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
                  <span>Worksheets & Projects</span>
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Client View Status + Admin Switcher or Admin Quick Jump */}
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
                  {activeProject.client}
                </div>
              </div>
            )}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => viewAdminPortal()}
              style={{
                width: '100%',
                justifyContent: 'center',
                borderColor: 'rgba(245, 158, 11, 0.35)',
                color: '#F59E0B',
                background: 'rgba(245, 158, 11, 0.08)',
                fontWeight: 600,
                padding: '9px 12px'
              }}
            >
              <Settings size={15} /> Admin Portal
            </button>
          </div>
        ) : (
          /* Admin mode quick jump button */
          <button
            className="btn btn-primary btn-sm"
            onClick={() => viewClientDashboard()}
            style={{
              width: '100%',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              padding: '10px'
            }}
          >
            <Eye size={16} /> View Client Dashboard
          </button>
        )}
      </div>
    </aside>
  );
}
