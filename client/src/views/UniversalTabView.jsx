import React, { useMemo, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { computeTabKpiCards } from '../utils/computeTabKpiCards';
import MetricCard from '../components/presentation/MetricCard';
import UniversalSpreadsheetTable from '../components/presentation/UniversalSpreadsheetTable';
import { isWideSpreadsheet, parseDateCell, isDateString } from '../utils/spreadsheetParser';
import {
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
  LinkedinIcon,
  WhatsappIcon,
  WebsiteIcon,
  CustomChannelIcon
} from '../components/common/SocialIcons';

import { inferColumnType } from '../utils/googleSheetSync';

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
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');

  const handleYearChange = (y) => {
    setSelectedYear(y);
    setSelectedMonth('All');
  };

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
      .map((k, idx) => {
        const sampleValues = rawRows.slice(0, 10).map(r => r[k]).filter(v => v != null && v !== '');
        const inferred = inferColumnType(k, sampleValues);
        return {
          key: k,
          label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: inferred,
          align: (inferred === 'text' || inferred === 'date' || inferred === 'time' || idx === 0) ? 'left' : 'right'
        };
      });
  }, [currentTab, rawRows]);

  // Filter rows for KPI cards when year or month is selected on ledger/standard sheets
  const filteredRows = useMemo(() => {
    const isWide = isWideSpreadsheet(columns, rawRows);
    if (isWide) return rawRows;

    const dateCol = columns.find(c => c.type === 'date') ||
      columns.find(c => isDateString(c.label) || c.label.toLowerCase().includes('date')) ||
      columns[0] || null;

    if (!dateCol) return rawRows;

    return rawRows.filter(row => {
      const parsed = parseDateCell(row[dateCol.key]);
      if (!parsed) return true;

      if (selectedYear !== 'All') {
        const yStr = selectedYear.startsWith('20') ? selectedYear : `20${selectedYear}`;
        if (parsed.year !== yStr && parsed.year !== selectedYear) return false;
      }
      if (selectedMonth !== 'All') {
        if (parsed.month !== selectedMonth && String(parsed.monthNum) !== selectedMonth) return false;
      }
      return true;
    });
  }, [rawRows, columns, selectedYear, selectedMonth]);

  // Dynamically compute Top 4 KPI Cards from the tab using shared utility (recalculates with filtered rows!)
  const kpiCards = useMemo(() => {
    return computeTabKpiCards(filteredRows, columns, themeColor);
  }, [filteredRows, columns, themeColor]);

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
            {selectedYear !== 'All' || selectedMonth !== 'All' ? (
              <span style={{ color: '#6366F1', fontWeight: 600 }}>
                {filteredRows.length} Filtered Entries ({selectedMonth !== 'All' ? `${selectedMonth} ` : ''}{selectedYear !== 'All' ? selectedYear : ''}) · of {rawRows.length} Total
              </span>
            ) : (
              `${rawRows.length} Recorded Entries ${dateRangeStr}`
            )} • {activeProject?.name || 'Active Project'}
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
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />
    </div>
  );
}
