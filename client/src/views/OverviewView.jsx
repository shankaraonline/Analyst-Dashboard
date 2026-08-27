import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatMetric } from '../utils/spreadsheetParser';
import { computeTabKpiCards } from '../utils/computeTabKpiCards';
import MetricCard from '../components/presentation/MetricCard';
import UniversalSpreadsheetTable from '../components/presentation/UniversalSpreadsheetTable';
import PdfExportModal from '../components/export/PdfExportModal';
import { getTabIconComponent } from './UniversalTabView';
import { IndianRupee, Users, Eye, EyeOff, Target, Layers, FileSpreadsheet, Download } from 'lucide-react';

export default function OverviewView() {
  const [isPdfModalOpen, setIsPdfModalOpen] = React.useState(false);
  const [tabYearFilters, setTabYearFilters] = React.useState({});

  const {
    activeProject,
    activeTabs,
    sheetData,
    activePlatformTab,
    setActivePlatformTab,
    computedOverview,
    omnichannelKpiVisibility,
    setTabKpiVisibility,
    portalMode,
  } = useDashboard();

  const isAdmin = portalMode === 'admin';

  // Active tab for the spreadsheet table at the bottom
  const selectedTabId = activePlatformTab || (activeTabs && activeTabs[0] ? activeTabs[0].id : null);
  const currentTab = (activeTabs && activeTabs.find(t => t.id === selectedTabId)) || (activeTabs && activeTabs[0]) || null;
  const currentTabRows = selectedTabId ? (sheetData[selectedTabId] || []) : [];

  const columns = React.useMemo(() => {
    if (currentTab && currentTab.columns && currentTab.columns.length > 0) return currentTab.columns;
    if (currentTabRows.length === 0) return [];
    return Object.keys(currentTabRows[0])
      .filter(k => k !== '_rowId')
      .map((k, idx) => ({
        key: k,
        label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: idx === 0 ? 'date' : 'metric',
        align: idx === 0 ? 'left' : 'right'
      }));
  }, [currentTab, currentTabRows]);

  // Visibility helper
  const isCardVisible = (tabId, cardKey) => {
    const v = omnichannelKpiVisibility[tabId];
    return v === null || v === undefined || v.includes(cardKey);
  };

  // ── Section 1: 4 Overall Omnichannel Summary KPI cards ──
  const overallKpiCards = React.useMemo(() => {
    const cards = [];
    if (!computedOverview) return cards;
    if ((computedOverview.totalVolume || 0) > 0)
      cards.push({ key: 'combined_reach', title: 'Combined Reach & Views', value: formatMetric(computedOverview.totalVolume), subtitle: 'across all tabs', change: '+24.6%', isPositive: true, icon: Eye, iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10B981' });
    if ((computedOverview.totalSpend || 0) > 0)
      cards.push({ key: 'total_spend', title: 'Total Tracked Spend', value: `₹${computedOverview.totalSpend.toLocaleString()}`, subtitle: 'campaign investments', change: '+14.2%', isPositive: true, icon: IndianRupee, iconBg: 'rgba(245, 158, 11, 0.15)', iconColor: '#F59E0B' });
    if ((computedOverview.totalActions || 0) > 0)
      cards.push({ key: 'total_actions', title: 'Total Actions & Leads', value: formatMetric(computedOverview.totalActions), subtitle: 'user actions & leads', change: '+18.4%', isPositive: true, icon: Target, iconBg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8' });
    if ((computedOverview.totalAudience || 0) > 0)
      cards.push({ key: 'total_audience', title: 'Total Audience Base', value: formatMetric(computedOverview.totalAudience), subtitle: 'followers & balance', change: '+7.9%', isPositive: true, icon: Users, iconBg: 'rgba(99, 102, 241, 0.15)', iconColor: '#6366F1' });
    return cards.slice(0, 4);
  }, [computedOverview]);

  // Summary cards filtered for display
  const displayedSummaryCards = React.useMemo(() => {
    return overallKpiCards.map(card => {
      const visible = isCardVisible('summary', card.key);
      return { ...card, visible };
    }).filter(card => isAdmin || card.visible);
  }, [overallKpiCards, omnichannelKpiVisibility, isAdmin]);

  // ── Section 2: Per-tab KPI cards — the same auto-detected cards as each tab view ──
  const allTabCardEntries = React.useMemo(() => {
    return activeTabs.map(tab => {
      const rawRows = sheetData[tab.id] || [];
      const cols = tab.columns && tab.columns.length > 0 ? tab.columns : [];
      const { icon: TabIcon, color: tColor } = getTabIconComponent(tab.name);
      const cards = computeTabKpiCards(rawRows, cols, tColor);
      return { tab, TabIcon, tColor, cards };
    }).filter(e => e.cards.length > 0);
  }, [activeTabs, sheetData]);

  const totalChannelCards = allTabCardEntries.reduce((s, e) => s + e.cards.length, 0);
  const hiddenChannelCount = allTabCardEntries.reduce((sum, { tab, cards }) => {
    const v = omnichannelKpiVisibility[tab.id];
    if (!v) return sum;
    return sum + cards.filter(c => !v.includes(c.key)).length;
  }, 0);

  // Filtered channel cards list: in Client mode, only show visible cards
  const displayedChannelCardsList = React.useMemo(() => {
    const list = [];
    allTabCardEntries.forEach(({ tab, TabIcon, tColor, cards }) => {
      cards.forEach(card => {
        const visible = isCardVisible(tab.id, card.key);
        if (!isAdmin && !visible) return;
        list.push({ tab, TabIcon, tColor, card, visible });
      });
    });
    return list;
  }, [allTabCardEntries, omnichannelKpiVisibility, isAdmin]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Header Banner ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Multi-Tab Omnichannel Intelligence {isAdmin && '• Admin Mode'}
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>
            {activeProject?.name || 'Project Dashboard'}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Website: <strong>{activeProject?.website || 'Direct'}</strong> • {activeTabs.length} Discovered Tabs ({computedOverview?.totalRowsCount || 0} total rows)
          </p>
        </div>
        <button
          onClick={() => setIsPdfModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: '#ffffff', border: 'none', padding: '10px 20px', fontWeight: 700, fontSize: '0.875rem', borderRadius: '10px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', cursor: 'pointer' }}
        >
          <Download size={15} />
          <span>Download PDF</span>
        </button>
      </div>

      {/* ── Section 1: Omnichannel Summary KPI Cards (With Eye Toggles) ── */}
      {displayedSummaryCards.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Layers size={13} color="#6366F1" />
              Omnichannel Summary — All Tabs Combined
            </div>
            {isAdmin && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Toggle eye icon on summary cards to show/hide in Client Dashboard &amp; PDF
              </div>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            alignItems: 'stretch'
          }}>
            {displayedSummaryCards.map((card) => {
              return (
                <div
                  key={card.key}
                  style={{
                    opacity: isAdmin && !card.visible ? 0.38 : 1,
                    transition: 'opacity 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', minHeight: '22px' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Summary Metric
                      </span>
                      <button
                        onClick={() => {
                          const allKeys = overallKpiCards.map(c => c.key);
                          const current = omnichannelKpiVisibility['summary'] ?? allKeys;
                          const next = card.visible
                            ? current.filter(k => k !== card.key)
                            : [...current, card.key];
                          setTabKpiVisibility('summary', next);
                        }}
                        title={card.visible ? 'Visible to clients — click to hide' : 'Hidden from clients — click to show'}
                        style={{
                          background: card.visible ? 'rgba(99, 102, 241, 0.12)' : 'rgba(100, 116, 139, 0.15)',
                          border: `1px solid ${card.visible ? 'rgba(99, 102, 241, 0.35)' : 'rgba(100, 116, 139, 0.3)'}`,
                          cursor: 'pointer',
                          padding: '2px 6px',
                          color: card.visible ? '#6366F1' : 'var(--text-muted)',
                          borderRadius: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {card.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>{card.visible ? 'Show' : 'Hide'}</span>
                      </button>
                    </div>
                  )}

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <MetricCard
                      title={card.title}
                      value={card.value}
                      subtitle={card.subtitle}
                      change={card.change}
                      isPositive={card.isPositive}
                      icon={card.icon}
                      iconBg={card.iconBg}
                      iconColor={card.iconColor}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section 2: All Channel Insights ── */}
      {displayedChannelCardsList.length > 0 && (
        <div>
          {/* Section header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileSpreadsheet size={17} color="#6366F1" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>All Channel Insights</span>
              <span style={{ fontSize: '0.7rem', padding: '2px 9px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', color: '#6366F1', fontWeight: 700 }}>
                {isAdmin ? `${totalChannelCards} metrics · ${activeTabs.length} channels` : `${displayedChannelCardsList.length} highlighted metrics`}
              </span>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                <Eye size={12} />
                <span>Click the eye icon on any card to show/hide it in Client Dashboard &amp; PDF export</span>
                {hiddenChannelCount > 0 && (
                  <span style={{ fontWeight: 700, color: '#F59E0B', marginLeft: '4px' }}>({hiddenChannelCount} hidden from clients)</span>
                )}
              </div>
            )}
          </div>

          {/* Cards grid: 5 columns in admin mode / auto-fit in client mode */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isAdmin ? 'repeat(5, 1fr)' : 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            alignItems: 'stretch'
          }}>
            {displayedChannelCardsList.map(({ tab, TabIcon, tColor, card, visible }) => {
              return (
                <div
                  key={`${tab.id}_${card.key}`}
                  style={{
                    opacity: isAdmin && !visible ? 0.38 : 1,
                    transition: 'opacity 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Channel label + optional eye toggle row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', minHeight: '22px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                      <TabIcon size={11} color={tColor} />
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: tColor, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tab.name}
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          const allCards = computeTabKpiCards(sheetData[tab.id] || [], tab.columns || [], tColor);
                          const allKeys = allCards.map(c => c.key);
                          const current = omnichannelKpiVisibility[tab.id] ?? allKeys;
                          const next = visible
                            ? current.filter(k => k !== card.key)   // hide
                            : [...current, card.key];               // show
                          setTabKpiVisibility(tab.id, next);
                        }}
                        title={visible ? 'Visible to clients — click to hide' : 'Hidden from clients — click to show'}
                        style={{
                          background: visible ? `${tColor}18` : 'rgba(100, 116, 139, 0.15)',
                          border: `1px solid ${visible ? `${tColor}40` : 'rgba(100, 116, 139, 0.3)'}`,
                          cursor: 'pointer',
                          padding: '2px 5px',
                          color: visible ? tColor : 'var(--text-muted)',
                          borderRadius: '5px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>{visible ? 'Show' : 'Hide'}</span>
                      </button>
                    )}
                  </div>

                  {/* Metric card wrapper to fill height equally */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <MetricCard
                      title={card.title}
                      value={card.value}
                      subtitle={card.subtitle}
                      change={card.change}
                      isPositive={card.isPositive}
                      icon={card.icon}
                      iconBg={card.iconBg}
                      iconColor={card.iconColor}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section 3: Tab Pills Switcher + Live Spreadsheet Table ── */}
      {activeTabs.length > 0 ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={18} color="#6366F1" />
              <span>Discovered Spreadsheet Tabs ({activeTabs.length})</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              {activeTabs.map(tab => {
                const isSelected = selectedTabId === tab.id;
                const { icon: TabIcon, color: tColor } = getTabIconComponent(tab.name);
                const rCount = (sheetData[tab.id] || []).length || tab.rowCount || 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActivePlatformTab(tab.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isSelected ? 'var(--bg-card)' : 'transparent', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', border: isSelected ? `1px solid ${tColor}55` : '1px solid transparent', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8125rem', fontWeight: isSelected ? 700 : 500, cursor: 'pointer', boxShadow: isSelected ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s ease' }}
                  >
                    <TabIcon size={16} color={tColor} />
                    <span>{tab.name}</span>
                    {rCount > 0 && (
                      <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: `${tColor}22`, color: tColor, fontWeight: 700 }}>{rCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {currentTab ? (
            <UniversalSpreadsheetTable
              columns={columns}
              rows={currentTabRows}
              tabId={currentTab.id}
              tabName={currentTab.name}
              selectedYear={tabYearFilters[currentTab.id] || 'All'}
              onYearChange={(y) => setTabYearFilters(prev => ({ ...prev, [currentTab.id]: y }))}
            />
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a tab above to inspect its live data table.
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-color-subtle)', borderRadius: '16px', padding: '40px 24px', textAlign: 'center' }}>
          <FileSpreadsheet size={40} color="#6366F1" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>No Spreadsheet Tabs Loaded Yet</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 18px' }}>
            Connect your multi-tab Google Sheet in the Admin Panel or upload an Excel file. Every tab will automatically appear here as an interactive channel ledger.
          </p>
        </div>
      )}

      {/* PDF Export Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        tabYearFilters={tabYearFilters}
      />
    </div>
  );
}
