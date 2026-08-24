import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatMetric } from '../utils/spreadsheetParser';
import MetricCard from '../components/presentation/MetricCard';
import SocialSpreadsheetTable from '../components/presentation/SocialSpreadsheetTable';
import { DollarSign, Users } from 'lucide-react';
import { FacebookIcon, InstagramIcon, YoutubeIcon } from '../components/common/SocialIcons';

export default function OverviewView() {
  const {
    activeProject,
    sheetData,
    activePlatformTab,
    setActivePlatformTab,
    computedMetrics
  } = useDashboard();

  if (!activeProject) return null;

  const fbData = sheetData.facebook || [];
  const igData = sheetData.instagram || [];
  const ytData = sheetData.youtube || [];
  const liData = sheetData.linkedin || [];

  // Auto-switch platform tab if current tab has no rows but another platform has data
  const effectivePlatform = React.useMemo(() => {
    if (sheetData[activePlatformTab]?.length > 0) return activePlatformTab;
    for (const p of ['instagram', 'facebook', 'youtube', 'linkedin']) {
      if (sheetData[p]?.length > 0) return p;
    }
    return activePlatformTab;
  }, [sheetData, activePlatformTab]);

  // Latest month numbers
  const latestFb = fbData[fbData.length - 1] || {};
  const latestIg = igData[igData.length - 1] || {};
  const latestYt = ytData[ytData.length - 1] || {};

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Clean Info Banner */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Social Intelligence & Meta Insights
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>
            {activeProject.name}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Client: <strong>{activeProject.client}</strong> • Tracking 4 channels ({fbData.length + igData.length + ytData.length + liData.length} monthly rows)
          </p>
        </div>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid-cols-4">
        <MetricCard
          title="Facebook Page Reach"
          value={formatMetric(computedMetrics.totalFbReach)}
          subtitle="organic & viral reach"
          change="+16.8%"
          isPositive={true}
          icon={FacebookIcon}
          iconBg="rgba(24, 119, 242, 0.15)"
          iconColor="#1877F2"
        />

        <MetricCard
          title="Instagram Reach"
          value={formatMetric(computedMetrics.totalIgReach)}
          subtitle="reels & content reach"
          change="+24.2%"
          isPositive={true}
          icon={InstagramIcon}
          iconBg="rgba(225, 48, 108, 0.15)"
          iconColor="#E1306C"
        />

        <MetricCard
          title="YouTube Video Views"
          value={formatMetric(computedMetrics.totalYtViews)}
          subtitle="channel views"
          change="+33.5%"
          isPositive={true}
          icon={YoutubeIcon}
          iconBg="rgba(255, 0, 0, 0.15)"
          iconColor="#FF0000"
        />

        <MetricCard
          title="Total Audience Base"
          value={formatMetric(computedMetrics.totalAudience)}
          subtitle="followers & subs"
          change="+8.3%"
          isPositive={true}
          icon={Users}
          iconBg="rgba(16, 185, 129, 0.15)"
          iconColor="#10B981"
        />
      </div>

      {/* Meta Ad Spend & Latest Month Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Meta Ad Spend (Tracked)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F59E0B', marginTop: '2px' }}>
              ₹{computedMetrics.totalAdSpend.toLocaleString()}
            </div>
          </div>
          <DollarSign size={24} color="#F59E0B" />
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Latest FB Followers (Jul-26)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1877F2', marginTop: '2px' }}>
              {latestFb.totalPageFollowers?.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#10B981' }}>(+{latestFb.newFollowers || 0})</span>
            </div>
          </div>
          <FacebookIcon size={24} color="#1877F2" />
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Latest IG Followers (Jul-26)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#E1306C', marginTop: '2px' }}>
              {latestIg.totalFollowers?.toLocaleString()}
            </div>
          </div>
          <InstagramIcon size={24} color="#E1306C" />
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Latest YouTube Subs (Jul-26)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FF0000', marginTop: '2px' }}>
              {latestYt.totalSubscribers?.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#10B981' }}>(+{latestYt.newSubscribers || 0})</span>
            </div>
          </div>
          <YoutubeIcon size={24} color="#FF0000" />
        </div>
      </div>

      {/* Main Interactive Spreadsheet Presentation Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0 }}>
            📋 Project Social Spreadsheet Data (Jul 2024 – Jul 2026)
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Normalized from Meta / Excel Exports
          </span>
        </div>

        <SocialSpreadsheetTable
          data={sheetData}
          activePlatform={effectivePlatform}
          onSelectPlatform={setActivePlatformTab}
        />
      </div>
    </div>
  );
}
