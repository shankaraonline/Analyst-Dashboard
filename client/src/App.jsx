import React from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import Layout from './components/layout/Layout';
import OverviewView from './views/OverviewView';
import InstagramView from './views/InstagramView';
import YouTubeView from './views/YouTubeView';
import LinkedInView from './views/LinkedInView';
import FacebookView from './views/FacebookView';
import DynamicCategoryView from './views/DynamicCategoryView';
import AdminUploadView from './views/AdminUploadView';

function DashboardContent() {
  const { currentView, isLoading } = useDashboard();

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
          Loading social intelligence data...
        </span>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView />;
      case 'facebook':
        return <FacebookView />;
      case 'instagram':
        return <InstagramView />;
      case 'youtube':
        return <YouTubeView />;
      case 'linkedin':
        return <LinkedInView />;
      case 'admin':
        return <AdminUploadView />;
      default:
        // Render dynamic category view for any custom channel (WhatsApp, Website, etc.)
        return <DynamicCategoryView categoryKey={currentView} />;
    }
  };

  return <Layout>{renderView()}</Layout>;
}

export default function App() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
