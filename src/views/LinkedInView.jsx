import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatMetric } from '../utils/spreadsheetParser';
import MetricCard from '../components/presentation/MetricCard';
import SocialSpreadsheetTable from '../components/presentation/SocialSpreadsheetTable';
import { LinkedinIcon } from '../components/common/SocialIcons';
import { Eye, ThumbsUp, LayoutTemplate, Users } from 'lucide-react';

export default function LinkedInView() {
  const { sheetData } = useDashboard();
  const liData = sheetData.linkedin || [];

  const totalImpr = liData.reduce((s, r) => s + (r.impressions || 0), 0);
  const totalReactions = liData.reduce((s, r) => s + (r.reactions || 0), 0);
  const totalPageViews = liData.reduce((s, r) => s + (r.totalPageViews || 0), 0);
  const latestFollowers = liData[liData.length - 1]?.totalFollowers || 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(10, 102, 194, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LinkedinIcon size={24} color="#0A66C2" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>LinkedIn Page Growth & Executive Reach</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{liData.length} Months Tracked (Feb-26 to Jul-26)</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-cols-4">
        <MetricCard
          title="LinkedIn Impressions"
          value={formatMetric(totalImpr)}
          subtitle="organic post views"
          change="+18.7%"
          isPositive={true}
          icon={Eye}
          iconBg="rgba(10, 102, 194, 0.15)"
          iconColor="#0A66C2"
        />

        <MetricCard
          title="Total Reactions"
          value={totalReactions.toLocaleString()}
          subtitle="likes & comments"
          change="+29.4%"
          isPositive={true}
          icon={ThumbsUp}
          iconBg="rgba(56, 189, 248, 0.15)"
          iconColor="#38BDF8"
        />

        <MetricCard
          title="Total Page Views"
          value={totalPageViews.toLocaleString()}
          subtitle="company page views"
          change="+14.2%"
          isPositive={true}
          icon={LayoutTemplate}
          iconBg="rgba(245, 158, 11, 0.15)"
          iconColor="#F59E0B"
        />

        <MetricCard
          title="Total Followers"
          value={latestFollowers.toLocaleString()}
          subtitle="latest count Jul-26"
          change="+17.8%"
          isPositive={true}
          icon={Users}
          iconBg="rgba(16, 185, 129, 0.15)"
          iconColor="#10B981"
        />
      </div>

      {/* Spreadsheet Table */}
      <SocialSpreadsheetTable
        data={sheetData}
        activePlatform="linkedin"
        showPlatformTabs={false}
      />
    </div>
  );
}
