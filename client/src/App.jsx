import React from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import Layout from './components/layout/Layout';
import OverviewView from './views/OverviewView';
import UniversalTabView from './views/UniversalTabView';
import AdminUploadView from './views/AdminUploadView';
import AdminLoginModal from './components/auth/AdminLoginModal';

function DashboardContent() {
  const { currentView, isLoading, isAuthModalOpen, closeLoginModal } = useDashboard();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '80vh',
          gap: '16px'
        }}
      >
        <div className="pulse-dot" style={{ width: '16px', height: '16px' }} />
        <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Loading spreadsheet intelligence data...
        </span>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView />;
      case 'admin':
        return <AdminUploadView />;
      default:
        // Render universal dynamic tab view for any tab ID
        return <UniversalTabView tabId={currentView} />;
    }
  };

  return (
    <>
      <Layout>{renderView()}</Layout>
      <AdminLoginModal isOpen={isAuthModalOpen} onClose={closeLoginModal} />
    </>
  );
}

export default function App() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
