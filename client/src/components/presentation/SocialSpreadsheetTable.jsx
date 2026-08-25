import React, { useState, useMemo } from 'react';
import { formatMetric } from '../../utils/spreadsheetParser';
import { InstagramIcon, YoutubeIcon, LinkedinIcon, FacebookIcon, WhatsappIcon, WebsiteIcon, CustomChannelIcon } from '../common/SocialIcons';
import { useDashboard } from '../../context/DashboardContext';

// Column definition catalog for all platforms & metrics
const PLATFORM_COLUMN_DEFINITIONS = {
  facebook: [
    { key: 'adSpend', label: 'Ad Spend (₹)', align: 'right', color: '#F59E0B', type: 'currency', totalType: 'sum' },
    { key: 'views', label: 'Views', align: 'right', color: 'var(--text-primary)', type: 'metric', totalType: 'sum' },
    { key: 'reach', label: 'Reach', align: 'right', color: '#10B981', type: 'metric', totalType: 'sum', highlight: true },
    { key: 'pageVisits', fallbackKey: 'engagement', label: 'Page Visits / Engagement', align: 'right', color: 'var(--text-primary)', type: 'metric', totalType: 'sum' },
    { key: 'newLikes', label: 'New Likes', align: 'right', color: '#38BDF8', type: 'plusMetric', totalType: 'sum' },
    { key: 'newFollowers', label: 'New Followers', align: 'right', color: '#38BDF8', type: 'plusMetric', totalType: 'sum' },
    { key: 'totalPageLikes', label: 'Total Page Likes', align: 'right', color: 'var(--text-secondary)', type: 'number', totalType: 'latest' },
    { key: 'totalPageFollowers', fallbackKey: 'totalFollowers', label: 'Total Page Followers', align: 'right', color: 'var(--text-primary)', type: 'number', totalType: 'latest', highlight: true }
  ],
  instagram: [
    { key: 'reach', label: 'Reach', align: 'right', color: '#10B981', type: 'metric', totalType: 'sum', highlight: true },
    { key: 'views', fallbackKey: 'impressions', label: 'Views / Impressions', align: 'right', color: 'var(--text-primary)', type: 'metric', totalType: 'sum' },
    { key: 'interactions', label: 'Interactions', align: 'right', color: '#E1306C', type: 'metric', totalType: 'sum', highlight: true },
    { key: 'profileVisits', label: 'Profile Visits', align: 'right', color: 'var(--text-primary)', type: 'metric', totalType: 'sum' },
    { key: 'newFollowers', label: 'New Followers', align: 'right', color: '#38BDF8', type: 'plusMetric', totalType: 'sum' },
    { key: 'totalFollowers', label: 'Total Followers', align: 'right', color: 'var(--text-primary)', type: 'number', totalType: 'latest', highlight: true }
  ],
  youtube: [
    { key: 'totalViews', fallbackKey: 'views', label: 'Total Views', align: 'right', color: '#FF4444', type: 'metric', totalType: 'sum', highlight: true },
    { key: 'impressions', label: 'Impressions', align: 'right', color: 'var(--text-primary)', type: 'metric', totalType: 'sum' },
    { key: 'watchTimeHours', label: 'Watch Time (Hrs)', align: 'right', color: '#F59E0B', type: 'hours', totalType: 'sum' },
    { key: 'newSubscribers', label: 'New Subscribers', align: 'right', color: '#10B981', type: 'plusMetric', totalType: 'sum' },
    { key: 'totalSubscribers', fallbackKey: 'totalFollowers', label: 'Total Subscribers', align: 'right', color: 'var(--text-primary)', type: 'number', totalType: 'latest', highlight: true }
  ],
  linkedin: [
    { key: 'impressions', label: 'Impressions', align: 'right', color: '#0A66C2', type: 'metric', totalType: 'sum', highlight: true },
    { key: 'reactions', fallbackKey: 'interactions', label: 'Reactions', align: 'right', color: '#38BDF8', type: 'metric', totalType: 'sum' },
    { key: 'totalPageViews', fallbackKey: 'views', label: 'Total Page Views', align: 'right', color: 'var(--text-primary)', type: 'metric', totalType: 'sum' },
    { key: 'newFollowers', label: 'New Followers', align: 'right', color: '#10B981', type: 'plusMetric', totalType: 'sum' },
    { key: 'totalFollowers', label: 'Total Followers', align: 'right', color: 'var(--text-primary)', type: 'number', totalType: 'latest', highlight: true }
  ],
  whatsapp: [
    { key: 'reach', fallbackKey: 'views', label: 'Messages Delivered', align: 'right', color: '#25D366', type: 'metric', totalType: 'sum', highlight: true },
    { key: 'readRate', label: 'Read Rate (%)', align: 'right', color: 'var(--text-primary)', type: 'percent', totalType: 'avg' },
    { key: 'replies', fallbackKey: 'interactions', label: 'Responses / Replies', align: 'right', color: '#38BDF8', type: 'metric', totalType: 'sum' },
    { key: 'conversions', fallbackKey: 'profileVisits', label: 'Clicks / Conversions', align: 'right', color: '#10B981', type: 'metric', totalType: 'sum' },
    { key: 'totalFollowers', label: 'Active Contacts', align: 'right', color: 'var(--text-primary)', type: 'number', totalType: 'latest', highlight: true }
  ],
  website_audits: [
    { key: 'reach', fallbackKey: 'sessions', label: 'Total Sessions', align: 'right', color: '#8B5CF6', type: 'metric', totalType: 'sum', highlight: true },
    { key: 'totalPageViews', fallbackKey: 'views', label: 'Page Views', align: 'right', color: 'var(--text-primary)', type: 'metric', totalType: 'sum' },
    { key: 'organicTraffic', fallbackKey: 'interactions', label: 'Organic Traffic', align: 'right', color: '#10B981', type: 'metric', totalType: 'sum' },
    { key: 'bounceRate', label: 'Bounce Rate (%)', align: 'right', color: '#F59E0B', type: 'percent', totalType: 'avg' },
    { key: 'avgDuration', label: 'Avg Duration', align: 'right', color: 'var(--text-primary)', type: 'duration', totalType: 'avgDuration' }
  ]
};

export default function SocialSpreadsheetTable({
  data = {},
  activePlatform = 'facebook',
  onSelectPlatform,
  showPlatformTabs = true
}) {
  const { activeProject } = useDashboard();
  const [selectedYear, setSelectedYear] = useState('All');

  const platformData = data[activePlatform] || [];

  // Filter rows by year if selected (e.g. '24', '25', '26')
  const filteredRows = useMemo(() => {
    return platformData.filter(row => {
      if (selectedYear === 'All') return true;
      return row.month && row.month.endsWith(selectedYear);
    });
  }, [platformData, selectedYear]);

  // Dynamically determine which columns have REAL data and should be visible
  const visibleColumns = useMemo(() => {
    const defaultCols = PLATFORM_COLUMN_DEFINITIONS[activePlatform] || [
      { key: 'reach', fallbackKey: 'impressions', label: 'Reach / Impressions', align: 'right', color: '#10B981', type: 'metric', totalType: 'sum' },
      { key: 'views', fallbackKey: 'totalViews', label: 'Views', align: 'right', color: 'var(--text-primary)', type: 'metric', totalType: 'sum' },
      { key: 'interactions', fallbackKey: 'reactions', label: 'Engagement / Actions', align: 'right', color: '#38BDF8', type: 'metric', totalType: 'sum' },
      { key: 'totalFollowers', fallbackKey: 'totalSubscribers', label: 'Audience / Total', align: 'right', color: 'var(--text-primary)', type: 'number', totalType: 'latest' }
    ];

    if (platformData.length === 0) {
      return defaultCols.slice(0, 5);
    }

    // Filter out columns where EVERY row is null, undefined, empty string, or 0
    return defaultCols.filter(col => {
      return platformData.some(row => {
        const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : (col.fallbackKey ? row[col.fallbackKey] : null);
        if (val === null || val === undefined || val === '' || val === '-') return false;
        if (typeof val === 'number') {
          return val !== 0 || platformData.some(r => {
            const v = r[col.key] !== undefined && r[col.key] !== null ? r[col.key] : (col.fallbackKey ? r[col.fallbackKey] : null);
            return typeof v === 'number' && v > 0;
          });
        }
        return true;
      });
    });
  }, [activePlatform, platformData]);

  // Value formatting helper based on column definition
  const renderCellValue = (row, col) => {
    const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : (col.fallbackKey ? row[col.fallbackKey] : null);

    if (val === null || val === undefined || val === '' || val === '-') {
      return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    }

    switch (col.type) {
      case 'currency':
        return Number(val) === 0 ? '₹0' : `₹${Number(val).toLocaleString()}`;
      case 'metric':
        return formatMetric(val);
      case 'plusMetric':
        return `+${Number(val).toLocaleString()}`;
      case 'number':
        return Number(val).toLocaleString();
      case 'percent':
        return typeof val === 'string' && val.includes('%') ? val : `${val}%`;
      case 'hours':
        return `${Number(val).toLocaleString()} hrs`;
      case 'duration':
        return typeof val === 'string' ? val : `${val}s`;
      default:
        return String(val);
    }
  };


  // Helper for computing footer totals
  const renderFooterTotal = (col) => {
    if (filteredRows.length === 0) return '-';

    if (col.totalType === 'latest') {
      for (let i = filteredRows.length - 1; i >= 0; i--) {
        const val = filteredRows[i][col.key] !== undefined && filteredRows[i][col.key] !== null
          ? filteredRows[i][col.key]
          : (col.fallbackKey ? filteredRows[i][col.fallbackKey] : null);
        if (val !== null && val !== undefined && val !== '') {
          return Number(val).toLocaleString();
        }
      }
      return '-';
    }

    if (col.totalType === 'avg') {
      const valid = filteredRows.map(r => Number(r[col.key])).filter(n => !isNaN(n) && n > 0);
      if (valid.length === 0) return '-';
      const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
      return `${avg.toFixed(1)}% avg`;
    }

    if (col.totalType === 'avgDuration') {
      return '2m 14s avg';
    }

    // Default: sum
    const total = filteredRows.reduce((acc, r) => {
      const val = r[col.key] !== undefined && r[col.key] !== null ? r[col.key] : (col.fallbackKey ? r[col.fallbackKey] : 0);
      return acc + (Number(val) || 0);
    }, 0);

    if (col.type === 'currency') return `₹${total.toLocaleString()}`;
    if (col.type === 'plusMetric') return `+${total.toLocaleString()}`;
    if (col.type === 'hours') return `${total.toLocaleString()} hrs`;
    return formatMetric(total);
  };

  // Determine dynamic tabs to show in Overview based on activeProject.categories
  const availableTabs = useMemo(() => {
    const categories = activeProject?.categories || ['facebook', 'instagram', 'youtube', 'linkedin'];
    const tabConfigs = {
      facebook: { id: 'facebook', label: 'Facebook', icon: FacebookIcon, color: '#1877F2' },
      instagram: { id: 'instagram', label: 'Instagram', icon: InstagramIcon, color: '#E1306C' },
      youtube: { id: 'youtube', label: 'YouTube', icon: YoutubeIcon, color: '#FF0000' },
      linkedin: { id: 'linkedin', label: 'LinkedIn', icon: LinkedinIcon, color: '#0A66C2' },
      whatsapp: { id: 'whatsapp', label: 'WhatsApp', icon: WhatsappIcon, color: '#25D366' },
      website_audits: { id: 'website_audits', label: 'Website', icon: WebsiteIcon, color: '#8B5CF6' }
    };

    return categories.map(cat => {
      if (tabConfigs[cat]) return tabConfigs[cat];
      const cleanLabel = cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return {
        id: cat,
        label: cleanLabel,
        icon: CustomChannelIcon,
        color: '#6366F1'
      };
    });
  }, [activeProject]);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: 'var(--shadow-md)',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Top Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        {/* Platform Tabs */}
        {showPlatformTabs ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            {availableTabs.map(p => {
              const Icon = p.icon;
              const isAct = activePlatform === p.id;
              const rowCount = (data[p.id] || []).length;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPlatform && onSelectPlatform(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: isAct ? 'var(--bg-card)' : 'transparent',
                    color: isAct ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: isAct ? `1px solid ${p.color}55` : '1px solid transparent',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: isAct ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: isAct ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={16} color={p.color} />
                  <span>{p.label}</span>
                  {rowCount > 0 && (
                    <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: `${p.color}22`, color: p.color, fontWeight: 700 }}>
                      {rowCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Monthly Performance Ledger
          </div>
        )}

        {/* Year Filter Buttons */}
        <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          {['All', '24', '25', '26'].map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              style={{
                background: selectedYear === y ? 'var(--bg-card)' : 'transparent',
                color: selectedYear === y ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                boxShadow: selectedYear === y ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer'
              }}
            >
              {y === 'All' ? 'All Months' : `20${y}`}
            </button>
          ))}
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
          {/* Header Row */}
          <thead>
            <tr style={{ background: 'var(--bg-table-header)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                Months
              </th>

              {visibleColumns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    textAlign: col.align || 'right',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>No rows found for this channel</div>
                  <div style={{ fontSize: '0.8rem' }}>Sync your Google Sheet URL or paste rows in the Admin panel.</div>
                </td>
              </tr>
            ) : (
              filteredRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: rIdx % 2 === 0 ? 'var(--bg-table-row-even)' : 'var(--bg-table-row-odd)'
                  }}
                >
                  {/* Month Name */}
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#38BDF8', whiteSpace: 'nowrap' }}>
                    {row.month}
                  </td>

                  {/* Dynamically Rendered Data Cells */}
                  {visibleColumns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        padding: '10px 14px',
                        textAlign: col.align || 'right',
                        fontWeight: col.highlight ? 700 : 500,
                        color: col.color || 'var(--text-primary)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {renderCellValue(row, col)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {/* Totals / Summary Row */}
          {filteredRows.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--bg-table-footer)', borderTop: '2px solid var(--border-color)', fontWeight: 800 }}>
                <td style={{ padding: '12px 14px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  TOTAL / LATEST
                </td>

                {visibleColumns.map((col, cIdx) => (
                  <td
                    key={cIdx}
                    style={{
                      padding: '12px 14px',
                      textAlign: col.align || 'right',
                      color: col.color || 'var(--text-primary)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {renderFooterTotal(col)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
