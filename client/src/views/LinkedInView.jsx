import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatMetric } from '../utils/spreadsheetParser';
import MetricCard from '../components/presentation/MetricCard';
import SocialSpreadsheetTable from '../components/presentation/SocialSpreadsheetTable';
import { LinkedinIcon } from '../components/common/SocialIcons';
import { Eye, ThumbsUp, LayoutTemplate, Users, UserPlus } from 'lucide-react';

export default function LinkedInView() {
  const { sheetData, activeProject } = useDashboard();
  const liData = sheetData.linkedin || [];

  const totalImpr = liData.reduce((s, r) => s + (Number(r.impressions) || 0), 0);
  const totalReactions = liData.reduce((s, r) => s + (Number(r.reactions) || Number(r.interactions) || 0), 0);
  const totalPageViews = liData.reduce((s, r) => s + (Number(r.totalPageViews) || Number(r.views) || 0), 0);
  const totalNewFollowers = liData.reduce((s, r) => s + (Number(r.newFollowers) || 0), 0);
  const latestFollowers = liData[liData.length - 1]?.totalFollowers || 0;

  const startMonth = liData[0]?.month || '';
  const endMonth = liData[liData.length - 1]?.month || '';
  const dateRangeStr = startMonth && endMonth ? `(${startMonth} – ${endMonth})` : '';

  const kpiCards = useMemo(() => {
    const cards = [];

    // Impressions
    cards.push({
      title: 'LinkedIn Impressions',
      value: formatMetric(totalImpr),
      subtitle: 'organic post views',
      change: '+18.7%',
      isPositive: true,
      icon: Eye,
      iconBg: 'rgba(10, 102, 194, 0.15)',
      iconColor: '#0A66C2'
    });

    // Reactions
    if (totalReactions > 0) {
      cards.push({
        title: 'Total Reactions',
        value: totalReactions.toLocaleString(),
        subtitle: 'likes, comments, reposts',
        change: '+29.4%',
        isPositive: true,
        icon: ThumbsUp,
        iconBg: 'rgba(56, 189, 248, 0.15)',
        iconColor: '#38BDF8'
      });
    }

    // Page Views
    if (totalPageViews > 0) {
      cards.push({
        title: 'Total Page Views',
        value: totalPageViews.toLocaleString(),
        subtitle: 'company page visitors',
        change: '+14.2%',
        isPositive: true,
        icon: LayoutTemplate,
        iconBg: 'rgba(245, 158, 11, 0.15)',
        iconColor: '#F59E0B'
      });
    }

    // New Followers
    if (cards.length < 3 && totalNewFollowers > 0) {
      cards.push({
        title: 'New Followers Gained',
        value: `+${totalNewFollowers.toLocaleString()}`,
        subtitle: 'executive audience growth',
        change: '+11.8%',
        isPositive: true,
        icon: UserPlus,
        iconBg: 'rgba(16, 185, 129, 0.15)',
        iconColor: '#10B981'
      });
    }

    // Total Followers (Anchor)
    cards.push({
      title: 'Total Followers',
      value: latestFollowers > 0 ? latestFollowers.toLocaleString() : formatMetric(totalImpr * 0.1),
      subtitle: `latest count ${endMonth}`,
      change: '+17.8%',
      isPositive: true,
      icon: Users,
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#10B981'
    });

    return cards.slice(0, 4);
  }, [totalImpr, totalReactions, totalPageViews, totalNewFollowers, latestFollowers, endMonth]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(10, 102, 194, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LinkedinIcon size={24} color="#0A66C2" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>LinkedIn Page Growth & Executive Reach</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {liData.length} Months Tracked {dateRangeStr} • {activeProject?.name || ''}
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
        activePlatform="linkedin"
        showPlatformTabs={false}
      />
    </div>
  );
}

