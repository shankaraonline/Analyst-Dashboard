import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatMetric } from '../utils/spreadsheetParser';
import MetricCard from '../components/presentation/MetricCard';
import SocialSpreadsheetTable from '../components/presentation/SocialSpreadsheetTable';
import { YoutubeIcon } from '../components/common/SocialIcons';
import { PlaySquare, Eye, Clock, Users } from 'lucide-react';

export default function YouTubeView() {
  const { sheetData } = useDashboard();
  const ytData = sheetData.youtube || [];

  const totalViews = ytData.reduce((s, r) => s + (r.totalViews || 0), 0);
  const totalImpr = ytData.reduce((s, r) => s + (r.impressions || 0), 0);
  const totalWatchHours = ytData.reduce((s, r) => s + (r.watchTimeHours || 0), 0);
  const latestSubs = ytData[ytData.length - 1]?.totalSubscribers || 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255, 0, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <YoutubeIcon size={24} color="#FF0000" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>YouTube Channel & Video Analytics</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{ytData.length} Months Tracked (Jul-24 to Jul-26)</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-cols-4">
        <MetricCard
          title="Total Video Views"
          value={formatMetric(totalViews)}
          subtitle="channel views"
          change="+33.5%"
          isPositive={true}
          icon={PlaySquare}
          iconBg="rgba(255, 0, 0, 0.15)"
          iconColor="#FF0000"
        />

        <MetricCard
          title="Video Impressions"
          value={formatMetric(totalImpr)}
          subtitle="thumbnail impressions"
          change="+19.2%"
          isPositive={true}
          icon={Eye}
          iconBg="rgba(245, 158, 11, 0.15)"
          iconColor="#F59E0B"
        />

        <MetricCard
          title="Watch Time (Hours)"
          value={`${totalWatchHours.toLocaleString()} hrs`}
          subtitle="total watched time"
          change="+14.8%"
          isPositive={true}
          icon={Clock}
          iconBg="rgba(168, 85, 247, 0.15)"
          iconColor="#A855F7"
        />

        <MetricCard
          title="Channel Subscribers"
          value={latestSubs.toLocaleString()}
          subtitle="latest count Jul-26"
          change="+8.3%"
          isPositive={true}
          icon={Users}
          iconBg="rgba(16, 185, 129, 0.15)"
          iconColor="#10B981"
        />
      </div>

      {/* Spreadsheet Table */}
      <SocialSpreadsheetTable
        data={sheetData}
        activePlatform="youtube"
        showPlatformTabs={false}
      />
    </div>
  );
}
