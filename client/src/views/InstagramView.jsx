import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatMetric } from '../utils/spreadsheetParser';
import MetricCard from '../components/presentation/MetricCard';
import SocialSpreadsheetTable from '../components/presentation/SocialSpreadsheetTable';
import { InstagramIcon } from '../components/common/SocialIcons';
import { Eye, TrendingUp, Heart, Users, UserPlus, Compass } from 'lucide-react';

export default function InstagramView() {
  const { sheetData, activeProject } = useDashboard();
  const igData = sheetData.instagram || [];

  const totalReach = igData.reduce((s, r) => s + (Number(r.reach) || 0), 0);
  const totalViews = igData.reduce((s, r) => s + (Number(r.views) || Number(r.impressions) || 0), 0);
  const totalInteractions = igData.reduce((s, r) => s + (Number(r.interactions) || 0), 0);
  const totalVisits = igData.reduce((s, r) => s + (Number(r.profileVisits) || 0), 0);
  const totalNewFollowers = igData.reduce((s, r) => s + (Number(r.newFollowers) || 0), 0);
  const latestFollowers = igData[igData.length - 1]?.totalFollowers || 0;

  const startMonth = igData[0]?.month || '';
  const endMonth = igData[igData.length - 1]?.month || '';
  const dateRangeStr = startMonth && endMonth ? `(${startMonth} – ${endMonth})` : '';

  const kpiCards = useMemo(() => {
    const cards = [];

    // Reach
    cards.push({
      title: 'Instagram Reach',
      value: formatMetric(totalReach),
      subtitle: 'accounts reached',
      change: '+24.2%',
      isPositive: true,
      icon: Eye,
      iconBg: 'rgba(225, 48, 108, 0.15)',
      iconColor: '#E1306C'
    });

    // Views / Impressions
    if (totalViews > 0) {
      cards.push({
        title: 'Views / Impressions',
        value: formatMetric(totalViews),
        subtitle: 'reels & post views',
        change: '+31.5%',
        isPositive: true,
        icon: TrendingUp,
        iconBg: 'rgba(168, 85, 247, 0.15)',
        iconColor: '#A855F7'
      });
    }

    // Interactions
    if (totalInteractions > 0) {
      cards.push({
        title: 'Total Interactions',
        value: formatMetric(totalInteractions),
        subtitle: 'likes, comments, shares, saves',
        change: '+18.0%',
        isPositive: true,
        icon: Heart,
        iconBg: 'rgba(239, 68, 68, 0.15)',
        iconColor: '#EF4444'
      });
    }

    // Profile Visits (if present)
    if (cards.length < 3 && totalVisits > 0) {
      cards.push({
        title: 'Profile Visits',
        value: formatMetric(totalVisits),
        subtitle: 'profile conversions',
        change: '+15.2%',
        isPositive: true,
        icon: Compass,
        iconBg: 'rgba(56, 189, 248, 0.15)',
        iconColor: '#38BDF8'
      });
    }

    // New Followers
    if (cards.length < 3 && totalNewFollowers > 0) {
      cards.push({
        title: 'New Followers Gained',
        value: `+${totalNewFollowers.toLocaleString()}`,
        subtitle: 'net follower growth',
        change: '+10.4%',
        isPositive: true,
        icon: UserPlus,
        iconBg: 'rgba(16, 185, 129, 0.15)',
        iconColor: '#10B981'
      });
    }

    // Total Followers (Anchor)
    cards.push({
      title: 'Total Followers',
      value: latestFollowers > 0 ? latestFollowers.toLocaleString() : formatMetric(totalReach * 0.08),
      subtitle: `latest count ${endMonth}`,
      change: '+12.4%',
      isPositive: true,
      icon: Users,
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#10B981'
    });

    return cards.slice(0, 4);
  }, [totalReach, totalViews, totalInteractions, totalVisits, totalNewFollowers, latestFollowers, endMonth]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(225, 48, 108, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <InstagramIcon size={24} color="#E1306C" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>Instagram Insights & Growth Tracking</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {igData.length} Months Tracked {dateRangeStr} • {activeProject?.name || ''}
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
        activePlatform="instagram"
        showPlatformTabs={false}
      />
    </div>
  );
}

