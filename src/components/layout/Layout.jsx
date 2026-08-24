import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useDashboard } from '../../context/DashboardContext';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function Layout({ children }) {
  const { notification } = useDashboard();

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <Navbar />

        <main className="page-body">
          {children}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--bg-card-solid)',
            border: `1px solid ${
              notification.type === 'danger' ? 'var(--color-danger)' :
              notification.type === 'warning' ? 'var(--color-warning)' : 'var(--color-success)'
            }`,
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 99999,
            animation: 'fadeIn 0.25s ease'
          }}
        >
          {notification.type === 'danger' ? (
            <XCircle size={20} color="var(--color-danger)" />
          ) : notification.type === 'warning' ? (
            <AlertTriangle size={20} color="var(--color-warning)" />
          ) : (
            <CheckCircle2 size={20} color="var(--color-success)" />
          )}
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {notification.message}
          </span>
        </div>
      )}
    </div>
  );
}
