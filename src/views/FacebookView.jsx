import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatMetric } from '../utils/spreadsheetParser';
import MetricCard from '../components/presentation/MetricCard';
import SocialSpreadsheetTable from '../components/presentation/SocialSpreadsheetTable';
import { FacebookIcon } from '../components/common/SocialIcons';
import { DollarSign, Users, Eye, TrendingUp } from 'lucide-react';

export default function FacebookView() {
  const { sheetData } = useDashboard();
  const fbData = sheetData.facebook || [];

  const totalSpend = fbData.reduce((s, r) => s + (r.adSpend || 0), 0);
  const totalReach = fbData.reduce((s, r) => s + (r.reach || 0), 0);
  const totalViews = fbData.reduce((s, r) => s + (r.views || 0), 0);
  const latestFollowers = fbData[fbData.length - 1]?.totalPageFollowers || 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(24, 119, 242, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FacebookIcon size={24} color="#1877F2" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>Facebook Page & Meta Ad Metrics</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{fbData.length} Months Tracked (Jul-24 to Jul-26)</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-cols-4">
        <MetricCard
          title="Total Meta Ad Spend"
          value={`₹${totalSpend.toLocaleString()}`}
          subtitle="lifetime tracked spend"
          change="+18.5%"
          isPositive={true}
          icon={DollarSign}
          iconBg="rgba(245, 158, 11, 0.15)"
          iconColor="#F59E0B"
        />

        <MetricCard
          title="Facebook Reach"
          value={formatMetric(totalReach)}
          subtitle="cumulative accounts"
          change="+16.8%"
          isPositive={true}
          icon={Eye}
          iconBg="rgba(24, 119, 242, 0.15)"
          iconColor="#1877F2"
        />

        <MetricCard
          title="Total Video Views"
          value={formatMetric(totalViews)}
          subtitle="plays & clips"
          change="+24.0%"
          isPositive={true}
          icon={TrendingUp}
          iconBg="rgba(56, 189, 248, 0.15)"
          iconColor="#38BDF8"
        />

        <MetricCard
          title="Total Page Followers"
          value={latestFollowers.toLocaleString()}
          subtitle="latest count Jul-26"
          change="+5.4%"
          isPositive={true}
          icon={Users}
          iconBg="rgba(16, 185, 129, 0.15)"
          iconColor="#10B981"
        />
      </div>

      {/* Spreadsheet Table */}
      <SocialSpreadsheetTable
        data={sheetData}
        activePlatform="facebook"
        showPlatformTabs={false}
      />
    </div>
  );
}
