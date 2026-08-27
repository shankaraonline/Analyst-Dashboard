import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { computeTabKpiCards } from '../utils/computeTabKpiCards';
import MetricCard from '../components/presentation/MetricCard';
import UniversalSpreadsheetTable from '../components/presentation/UniversalSpreadsheetTable';
import {
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
  LinkedinIcon,
  WhatsappIcon,
  WebsiteIcon,
  CustomChannelIcon
} from '../components/common/SocialIcons';

// Helper to choose the best icon for a tab based on its name
export function getTabIconComponent(tabName = '') {
  const l = String(tabName).toLowerCase();
  if (l.includes('insta') || l === 'ig') return { icon: InstagramIcon, color: '#E1306C' };
  if (l.includes('face') || l === 'fb') return { icon: FacebookIcon, color: '#1877F2' };
  if (l.includes('you') || l === 'yt') return { icon: YoutubeIcon, color: '#FF0000' };
  if (l.includes('link') || l === 'li') return { icon: LinkedinIcon, color: '#0A66C2' };
  if (l.includes('what') || l === 'wa') return { icon: WhatsappIcon, color: '#25D366' };
  if (l.includes('web') || l.includes('audit') || l.includes('traffic')) return { icon: WebsiteIcon, color: '#8B5CF6' };
  return { icon: CustomChannelIcon, color: '#6366F1' };
}

export default function UniversalTabView({ tabId }) {
  const { sheetData, activeProject, activeTabs } = useDashboard();

  // Find tab metadata
  const currentTab = useMemo(() => {
    return activeTabs.find(t => t.id === tabId) || {
      id: tabId,
      name: tabId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      columns: []
    };
  }, [activeTabs, tabId]);

  const rawRows = sheetData[tabId] || [];
  const { icon: TabIcon, color: themeColor } = getTabIconComponent(currentTab.name);

  // Compute dynamic columns if not present in tab metadata
  const columns = useMemo(() => {
    if (currentTab.columns && currentTab.columns.length > 0) {
      return currentTab.columns;
    }
    if (rawRows.length === 0) return [];
    
    // Fallback: extract keys from first row
    return Object.keys(rawRows[0])
      .filter(k => k !== '_rowId')
      .map((k, idx) => ({
        key: k,
        label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: idx === 0 ? 'date' : 'metric',
        align: idx === 0 ? 'left' : 'right'
      }));
  }, [currentTab, rawRows]);

  // Dynamically compute Top 4 KPI Cards from the tab using shared utility (always all 4 on channel tab view)
  const kpiCards = useMemo(() => {
    return computeTabKpiCards(rawRows, columns, themeColor);
  }, [rawRows, columns, themeColor]);

  // Date range subtitle
  const dateCol = columns.find(c => c.type === 'date');
  const dateRangeStr = useMemo(() => {
    if (!dateCol || rawRows.length === 0) return '';
    const start = rawRows[0]?.[dateCol.key];
    const end = rawRows[rawRows.length - 1]?.[dateCol.key];
    return start && end ? `(${start} – ${end})` : '';
  }, [dateCol, rawRows]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
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
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: `${themeColor}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <TabIcon size={24} color={themeColor} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>
            {currentTab.name}
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {rawRows.length} Monthly Entries {dateRangeStr} • {activeProject?.name || 'Active Project'}
          </span>
        </div>
      </div>

      {/* Top 4 Auto-Detected KPI Summary Cards */}
      {kpiCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
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
      )}

      {/* Universal Dynamic Spreadsheet Table */}
      <UniversalSpreadsheetTable
        columns={columns}
        rows={rawRows}
        tabId={currentTab.id}
        tabName={currentTab.name}
      />
    </div>
  );
}
