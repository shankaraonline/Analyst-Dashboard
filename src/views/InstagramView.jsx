import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatMetric } from '../utils/spreadsheetParser';
import MetricCard from '../components/presentation/MetricCard';
import SocialSpreadsheetTable from '../components/presentation/SocialSpreadsheetTable';
import { InstagramIcon } from '../components/common/SocialIcons';
import { Eye, TrendingUp, Heart, Users } from 'lucide-react';

export default function InstagramView() {
  const { sheetData } = useDashboard();
  const igData = sheetData.instagram || [];

  const totalReach = igData.reduce((s, r) => s + (r.reach || 0), 0);
  const totalViews = igData.reduce((s, r) => s + ((r.views || r.impressions) || 0), 0);
  const totalInteractions = igData.reduce((s, r) => s + (r.interactions || 0), 0);
  const latestFollowers = igData[igData.length - 1]?.totalFollowers || 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(225, 48, 108, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <InstagramIcon size={24} color="#E1306C" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>Instagram Insights & Growth Tracking</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{igData.length} Months Tracked (Jul-24 to Jul-26)</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-cols-4">
        <MetricCard
          title="Instagram Total Reach"
          value={formatMetric(totalReach)}
          subtitle="accounts reached"
          change="+24.2%"
          isPositive={true}
          icon={Eye}
          iconBg="rgba(225, 48, 108, 0.15)"
          iconColor="#E1306C"
        />

        <MetricCard
          title="Total Views / Impressions"
          value={formatMetric(totalViews)}
          subtitle="reels & post views"
          change="+31.5%"
          isPositive={true}
          icon={TrendingUp}
          iconBg="rgba(168, 85, 247, 0.15)"
          iconColor="#A855F7"
        />

        <MetricCard
          title="Total Interactions"
          value={formatMetric(totalInteractions)}
          subtitle="likes, comments, saves"
          change="+18.0%"
          isPositive={true}
          icon={Heart}
          iconBg="rgba(239, 68, 68, 0.15)"
          iconColor="#EF4444"
        />

        <MetricCard
          title="Total Followers"
          value={latestFollowers.toLocaleString()}
          subtitle="latest count Jul-26"
          change="+12.4%"
          isPositive={true}
          icon={Users}
          iconBg="rgba(16, 185, 129, 0.15)"
          iconColor="#10B981"
        />
      </div>

      {/* Spreadsheet Table */}
      <SocialSpreadsheetTable
        data={sheetData}
        activePlatform="instagram"
        showPlatformTabs={false}
      />
    </div>
  );
}
