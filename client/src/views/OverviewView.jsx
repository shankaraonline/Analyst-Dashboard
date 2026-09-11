import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatMetric, isPeriodOrMonthHeader } from '../utils/spreadsheetParser';
import { computeTabKpiCards, computeManualTabKpiCards } from '../utils/computeTabKpiCards';
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

  // Tab configuration helper: extracts { selectedRows, selectedCols } for a tab
  const getTabConfig = (tabId) => {
    const val = omnichannelKpiVisibility[tabId];
    if (!val) return { selectedRows: [], selectedCols: null, isExplicitlySaved: false };
    if (Array.isArray(val)) {
      // Legacy automatic array from previous heuristic -> treat as empty so no cards are auto-generated!
      return { selectedRows: [], selectedCols: null, isExplicitlySaved: false };
    }
    return {
      selectedRows: Array.isArray(val.selectedRows) ? val.selectedRows : [],
      selectedCols: Array.isArray(val.selectedCols) ? val.selectedCols : null,
      isExplicitlySaved: true
    };
  };

  const [draftTabSelections, setDraftTabSelections] = React.useState({});
  const [savingTabId, setSavingTabId] = React.useState(null);
  const [saveSuccessTabId, setSaveSuccessTabId] = React.useState(null);

  const activeProjIdentifier = activeProject ? (activeProject.id || activeProject._id) : null;

  // Clear in-flight drafts whenever active project changes
  React.useEffect(() => {
    setDraftTabSelections({});
    setSavingTabId(null);
    setSaveSuccessTabId(null);
  }, [activeProjIdentifier]);

  // Get active selection for tab (either in-flight draft, or saved config from DB)
  const getActiveTabSelection = (tabId) => {
    if (draftTabSelections[tabId] !== undefined) {
      return draftTabSelections[tabId];
    }
    return getTabConfig(tabId);
  };

  const handleTabRowSelectionChange = (tabId, newRows) => {
    const current = getActiveTabSelection(tabId);
    setDraftTabSelections(prev => ({
      ...prev,
      [tabId]: {
        selectedRows: newRows,
        selectedCols: current.selectedCols
      }
    }));
  };

  const handleTabColSelectionChange = (tabId, newCols) => {
    const current = getActiveTabSelection(tabId);
    setDraftTabSelections(prev => ({
      ...prev,
      [tabId]: {
        selectedRows: current.selectedRows,
        selectedCols: newCols
      }
    }));
  };

  const handleSaveTabChannelInsight = async (tabId) => {
    const draft = getActiveTabSelection(tabId);
    setSavingTabId(tabId);
    try {
      await setTabKpiVisibility(tabId, {
        selectedRows: draft.selectedRows || [],
        selectedCols: draft.selectedCols || null
      });
      // Clear draft for this tab so it syncs with saved state
      setDraftTabSelections(prev => {
        const next = { ...prev };
        delete next[tabId];
        return next;
      });
      setSaveSuccessTabId(tabId);
      setTimeout(() => {
        setSaveSuccessTabId(prev => (prev === tabId ? null : prev));
      }, 3000);
    } finally {
      setSavingTabId(null);
    }
  };

  // ── Section 2: Per-tab Channel Insight cards generated from saved manual row & col selections ──
  const allTabCardEntries = React.useMemo(() => {
    return activeTabs.map(tab => {
      const rawRows = sheetData[tab.id] || [];
      const cols = tab.columns && tab.columns.length > 0 ? tab.columns : [];
      const { icon: TabIcon, color: tColor } = getTabIconComponent(tab.name);
      const tabConfig = getTabConfig(tab.id);

      // Strict manual generation: ONLY compute cards if tabConfig.selectedRows has rows explicitly chosen by user
      const cards = (tabConfig.selectedRows && tabConfig.selectedRows.length > 0)
        ? computeManualTabKpiCards(
            rawRows,
            cols,
            tColor,
            tabConfig.selectedRows,
            tabConfig.selectedCols
          )
        : [];
      return { tab, TabIcon, tColor, cards, tabConfig };
    }).filter(e => e.cards.length > 0);
  }, [activeTabs, sheetData, omnichannelKpiVisibility]);

  // Filtered channel cards list
  const displayedChannelCardsList = React.useMemo(() => {
    const list = [];
    allTabCardEntries.forEach(({ tab, TabIcon, tColor, cards, tabConfig }) => {
      cards.forEach(card => {
        list.push({ tab, TabIcon, tColor, card, tabConfig });
      });
    });
    return list;
  }, [allTabCardEntries]);

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
            {activeProject?.description ? activeProject.description : 'Omnichannel Performance Intelligence'} • {activeTabs.length} Discovered Tabs ({computedOverview?.totalRowsCount || 0} total rows)
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

      {/* ── Section 1: Omnichannel Summary KPI Cards (Commented out per user request — will work later) ── */}
      {/*
      {displayedSummaryCards.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Layers size={13} color="#6366F1" />
              Omnichannel Summary — All Tabs Combined
            </div>
          </div>
        </div>
      )}
      */}

      {/* ── Section 2: All Channel Insights (Strictly Manual from DB) ── */}
      <div>
        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={17} color="#6366F1" />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>All Channel Insights</span>
            <span style={{ fontSize: '0.7rem', padding: '2px 9px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', color: '#6366F1', fontWeight: 700 }}>
              {displayedChannelCardsList.length} metrics saved
            </span>
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              <Eye size={12} />
              <span>Select rows &amp; months in any ledger below, then click &quot;Save Channel Insight&quot;</span>
            </div>
          )}
        </div>

        {displayedChannelCardsList.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: isAdmin ? '10px' : '14px',
            alignItems: 'stretch'
          }}>
            {displayedChannelCardsList.map(({ tab, TabIcon, tColor, card, tabConfig }) => {
              return (
                <div
                  key={`${tab.id}_${card.key}`}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Channel label + optional eye toggle row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isAdmin ? '4px' : '6px', minHeight: isAdmin ? '18px' : '22px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                      <TabIcon size={isAdmin ? 11 : 12} color={tColor} />
                      <span style={{ fontSize: isAdmin ? '0.6rem' : '0.65rem', fontWeight: 700, color: tColor, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tab.name}
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={async () => {
                          const next = (tabConfig.selectedRows || []).filter(l => l.trim().toLowerCase() !== card.rowLabel?.toLowerCase());
                          await setTabKpiVisibility(tab.id, {
                            selectedRows: next,
                            selectedCols: tabConfig.selectedCols
                          });
                          setDraftTabSelections(prev => {
                            const n = { ...prev };
                            delete n[tab.id];
                            return n;
                          });
                        }}
                        title="Click to remove this card from Channel Insights"
                        style={{
                          background: `${tColor}18`,
                          border: `1px solid ${tColor}40`,
                          cursor: 'pointer',
                          padding: '1px 5px',
                          color: tColor,
                          borderRadius: '4px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '0.58rem',
                          fontWeight: 600,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <EyeOff size={10} />
                        <span>Hide</span>
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
                      compact={isAdmin}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-color)',
            borderRadius: '14px',
            padding: '24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem'
          }}>
            No Channel Insights created yet. Check the metric row and month boxes in any ledger below and click <strong style={{ color: '#6366F1' }}>Save Channel Insight</strong> to publish cards here.
          </div>
        )}
      </div>

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
              isAdmin={isAdmin}
              selectedRowKeys={getActiveTabSelection(currentTab.id).selectedRows || []}
              onRowSelectionChange={(keys) => handleTabRowSelectionChange(currentTab.id, keys)}
              selectedColKeys={getActiveTabSelection(currentTab.id).selectedCols}
              onColSelectionChange={(keys) => handleTabColSelectionChange(currentTab.id, keys)}
              onSaveChannelInsight={() => handleSaveTabChannelInsight(currentTab.id)}
              isSaving={savingTabId === currentTab.id}
              saveSuccess={saveSuccessTabId === currentTab.id}
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
