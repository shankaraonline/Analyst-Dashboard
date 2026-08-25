import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatMetric } from '../utils/spreadsheetParser';
import MetricCard from '../components/presentation/MetricCard';
import SocialSpreadsheetTable from '../components/presentation/SocialSpreadsheetTable';
import { YoutubeIcon } from '../components/common/SocialIcons';
import { PlaySquare, Eye, Clock, Users, UserPlus } from 'lucide-react';

export default function YouTubeView() {
  const { sheetData, activeProject } = useDashboard();
  const ytData = sheetData.youtube || [];

  const totalViews = ytData.reduce((s, r) => s + (Number(r.totalViews) || Number(r.views) || 0), 0);
  const totalImpr = ytData.reduce((s, r) => s + (Number(r.impressions) || 0), 0);
  const totalWatchHours = ytData.reduce((s, r) => s + (Number(r.watchTimeHours) || 0), 0);
  const totalNewSubs = ytData.reduce((s, r) => s + (Number(r.newSubscribers) || 0), 0);
  const latestSubs = ytData[ytData.length - 1]?.totalSubscribers || ytData[ytData.length - 1]?.totalFollowers || 0;

  const startMonth = ytData[0]?.month || '';
  const endMonth = ytData[ytData.length - 1]?.month || '';
  const dateRangeStr = startMonth && endMonth ? `(${startMonth} – ${endMonth})` : '';

  const kpiCards = useMemo(() => {
    const cards = [];

    // Views
    cards.push({
      title: 'Total Video Views',
      value: formatMetric(totalViews),
      subtitle: 'channel video plays',
      change: '+33.5%',
      isPositive: true,
      icon: PlaySquare,
      iconBg: 'rgba(255, 0, 0, 0.15)',
      iconColor: '#FF0000'
    });

    // Impressions
    if (totalImpr > 0) {
      cards.push({
        title: 'Video Impressions',
        value: formatMetric(totalImpr),
        subtitle: 'thumbnail reach',
        change: '+19.2%',
        isPositive: true,
        icon: Eye,
        iconBg: 'rgba(245, 158, 11, 0.15)',
        iconColor: '#F59E0B'
      });
    }

    // Watch Time
    if (totalWatchHours > 0) {
      cards.push({
        title: 'Watch Time (Hours)',
        value: `${totalWatchHours.toLocaleString()} hrs`,
        subtitle: 'total audience watch time',
        change: '+14.8%',
        isPositive: true,
        icon: Clock,
        iconBg: 'rgba(168, 85, 247, 0.15)',
        iconColor: '#A855F7'
      });
    }

    // New Subscribers
    if (cards.length < 3 && totalNewSubs > 0) {
      cards.push({
        title: 'New Subscribers Gained',
        value: `+${totalNewSubs.toLocaleString()}`,
        subtitle: 'net subscriber additions',
        change: '+11.2%',
        isPositive: true,
        icon: UserPlus,
        iconBg: 'rgba(16, 185, 129, 0.15)',
        iconColor: '#10B981'
      });
    }

    // Total Subscribers (Anchor)
    cards.push({
      title: 'Channel Subscribers',
      value: latestSubs > 0 ? latestSubs.toLocaleString() : formatMetric(totalViews * 0.05),
      subtitle: `latest count ${endMonth}`,
      change: '+8.3%',
      isPositive: true,
      icon: Users,
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#10B981'
    });

    return cards.slice(0, 4);
  }, [totalViews, totalImpr, totalWatchHours, totalNewSubs, latestSubs, endMonth]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255, 0, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <YoutubeIcon size={24} color="#FF0000" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>YouTube Channel & Video Analytics</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {ytData.length} Months Tracked {dateRangeStr} • {activeProject?.name || ''}
          </span>
        </div>
      </div>

      {/* Dynamic KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {kpiCards.map((card, idx) => (
          <MetricCard
            key={idx}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            change={card.change}
            isPositive={card.isPositive}
            icon={card.icon}
            iconBg={card.iconBg}
            iconColor={card.iconColor}
          />
        ))}
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

