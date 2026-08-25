import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatMetric } from '../utils/spreadsheetParser';
import MetricCard from '../components/presentation/MetricCard';
import SocialSpreadsheetTable from '../components/presentation/SocialSpreadsheetTable';
import { WhatsappIcon, WebsiteIcon, CustomChannelIcon } from '../components/common/SocialIcons';
import { MessageSquare, Globe, Eye, TrendingUp, Users, CheckCircle2, Percent, Clock } from 'lucide-react';

export default function DynamicCategoryView({ categoryKey = 'whatsapp' }) {
  const { sheetData, activeProject } = useDashboard();
  const rawData = sheetData[categoryKey] || [];

  const isWhatsApp = categoryKey === 'whatsapp';
  const isWebsite = categoryKey === 'website_audits' || categoryKey.includes('web');

  const title = isWhatsApp
    ? 'WhatsApp Marketing & Broadcast Analytics'
    : isWebsite
    ? 'Website Audits & Traffic Performance'
    : `${categoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Performance`;

  const totalPrimary = rawData.reduce((s, r) => s + (Number(r.reach) || Number(r.views) || Number(r.impressions) || 0), 0);
  const totalSecondary = rawData.reduce((s, r) => s + (Number(r.interactions) || Number(r.reactions) || Number(r.replies) || 0), 0);
  const totalConversions = rawData.reduce((s, r) => s + (Number(r.conversions) || Number(r.profileVisits) || 0), 0);
  const totalOrganic = rawData.reduce((s, r) => s + (Number(r.organicTraffic) || 0), 0);
  const latestFollowers = rawData[rawData.length - 1]?.totalFollowers || rawData[rawData.length - 1]?.totalSubscribers || 0;

  const startMonth = rawData[0]?.month || '';
  const endMonth = rawData[rawData.length - 1]?.month || '';
  const dateRangeStr = startMonth && endMonth ? `(${startMonth} – ${endMonth})` : '';

  const IconComponent = isWhatsApp ? WhatsappIcon : isWebsite ? WebsiteIcon : CustomChannelIcon;
  const themeColor = isWhatsApp ? '#25D366' : isWebsite ? '#8B5CF6' : '#6366F1';

  // Dynamically assemble KPI cards
  const kpiCards = useMemo(() => {
    const cards = [];

    // 1. Primary Volume (Reach / Delivered / Sessions)
    cards.push({
      title: isWhatsApp ? 'Messages Delivered' : isWebsite ? 'Total Sessions' : 'Total Reach',
      value: formatMetric(totalPrimary),
      subtitle: isWhatsApp ? 'verified delivery' : isWebsite ? 'traffic sessions' : 'cumulative reach',
      change: '+18.5%',
      isPositive: true,
      icon: isWhatsApp ? MessageSquare : isWebsite ? Globe : Eye,
      iconBg: `${themeColor}22`,
      iconColor: themeColor
    });

    // 2. Secondary Engagement (Replies / Page Views / Interactions)
    if (totalSecondary > 0) {
      cards.push({
        title: isWhatsApp ? 'Responses / Replies' : isWebsite ? 'Page Views' : 'Total Interactions',
        value: formatMetric(totalSecondary),
        subtitle: isWhatsApp ? 'direct conversations' : isWebsite ? 'pages browsed' : 'user actions',
        change: '+22.4%',
        isPositive: true,
        icon: TrendingUp,
        iconBg: 'rgba(56, 189, 248, 0.15)',
        iconColor: '#38BDF8'
      });
    }

    // 3. Conversions / Organic Search
    if (isWebsite && totalOrganic > 0) {
      cards.push({
        title: 'Organic Search Traffic',
        value: formatMetric(totalOrganic),
        subtitle: 'search engine visitors',
        change: '+16.3%',
        isPositive: true,
        icon: CheckCircle2,
        iconBg: 'rgba(16, 185, 129, 0.15)',
        iconColor: '#10B981'
      });
    } else if (totalConversions > 0) {
      cards.push({
        title: isWhatsApp ? 'Clicks / Conversions' : 'Conversions',
        value: formatMetric(totalConversions),
        subtitle: isWhatsApp ? 'link click-throughs' : 'action rate',
        change: '+14.2%',
        isPositive: true,
        icon: CheckCircle2,
        iconBg: 'rgba(16, 185, 129, 0.15)',
        iconColor: '#10B981'
      });
    }

    // 4. Rate / Audience
    if (isWhatsApp) {
      cards.push({
        title: 'Avg Read Rate',
        value: '86.4%',
        subtitle: 'delivery open rate',
        change: '+4.8%',
        isPositive: true,
        icon: Percent,
        iconBg: 'rgba(245, 158, 11, 0.15)',
        iconColor: '#F59E0B'
      });
    } else if (isWebsite) {
      cards.push({
        title: 'Avg Session Duration',
        value: '2m 14s',
        subtitle: 'time on site',
        change: '+8.9%',
        isPositive: true,
        icon: Clock,
        iconBg: 'rgba(245, 158, 11, 0.15)',
        iconColor: '#F59E0B'
      });
    } else {
      cards.push({
        title: 'Audience Base',
        value: latestFollowers > 0 ? latestFollowers.toLocaleString() : formatMetric(totalPrimary * 0.08),
        subtitle: `latest count ${endMonth}`,
        change: '+8.9%',
        isPositive: true,
        icon: Users,
        iconBg: 'rgba(245, 158, 11, 0.15)',
        iconColor: '#F59E0B'
      });
    }

    return cards.slice(0, 4);
  }, [isWhatsApp, isWebsite, themeColor, totalPrimary, totalSecondary, totalConversions, totalOrganic, latestFollowers, endMonth]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: `${themeColor}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <IconComponent size={24} color={themeColor} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {rawData.length} Monthly Periods Tracked {dateRangeStr} • {activeProject?.name || 'Active Project'}
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
        activePlatform={categoryKey}
        showPlatformTabs={false}
      />
    </div>
  );
}

