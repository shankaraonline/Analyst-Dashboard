import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from '../../context/DashboardContext';
import { formatMetric, cleanNumericValue, isPeriodOrMonthHeader } from '../../utils/spreadsheetParser';
import { computeTabKpiCards } from '../../utils/computeTabKpiCards';
import { getTabIconComponent } from '../../views/UniversalTabView';
import {
  Download,
  X,
  ArrowUp,
  ArrowDown,
  Layers,
  FileSpreadsheet,
  Eye,
  FileText,
  Printer,
  Layout,
  ChevronDown
} from 'lucide-react';

export default function PdfExportModal({ isOpen, onClose, tabYearFilters = {} }) {
  const dashboardState = useDashboard() || {};
  const {
    activeProject = null,
    activeTabs = [],
    sheetData = {},
    computedOverview = {},
    omnichannelKpiVisibility = {}
  } = dashboardState;
  const reportRef = useRef(null);

  // Helper: filter rows for a tab according to its selected year
  const getFilteredRows = (tabId) => {
    const allRows = sheetData[tabId] || [];
    const yearFilter = tabYearFilters[tabId]; // e.g. '26', '25', undefined/'All'
    if (!yearFilter || yearFilter === 'All') return allRows;

    // Resolve the date column key from the tab's column definitions
    const tab = activeTabs.find(t => t.id === tabId);
    const cols = (tab?.columns && tab.columns.length > 0) ? tab.columns : [];

    // Wide format: year/month are in COLUMN LABELS (e.g. "January 2026", "Jan-26"), not row data
    // → no row filtering needed; year selection filters columns, not rows
    const isWideFormat = cols.filter(c => isPeriodOrMonthHeader(c.label)).length >= 2;
    if (isWideFormat) return allRows;

    const dateCol = cols.find(c => c.type === 'date') || cols[0] || null;
    const dateKey = dateCol?.key || null;

    return allRows.filter(row => {
      // Use the known date key; fall back to scanning all non-_rowId string fields
      const candidates = dateKey
        ? [String(row[dateKey] ?? '')]
        : Object.entries(row)
            .filter(([k]) => k !== '_rowId')
            .map(([, v]) => String(v ?? ''));

      return candidates.some(
        val => val.includes(yearFilter) || val.includes(`20${yearFilter}`)
      );
    });
  };

  // Helper for computing tab layout (visible columns, wide format, row totals, row sorting)
  const getTabPdfData = (section) => {
    const tab = activeTabs.find(t => t.id === section.tabId);
    const rawRows = getFilteredRows(section.tabId);
    const baseCols = (tab?.columns && tab.columns.length > 0)
      ? tab.columns
      : (rawRows.length > 0
          ? Object.keys(rawRows[0]).filter(k => k !== '_rowId').map((k, idx) => ({
              key: k,
              label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              type: idx === 0 ? 'date' : 'metric',
              align: idx === 0 ? 'left' : 'right'
            }))
          : []);

    const isWide = baseCols.filter(c => isPeriodOrMonthHeader(c.label)).length >= 2;
    const yearFilter = tabYearFilters[section.tabId];

    let columns = baseCols;
    if (isWide && yearFilter && yearFilter !== 'All') {
      columns = baseCols.filter(c => {
        if (!isPeriodOrMonthHeader(c.label)) return true;
        return c.label.includes(yearFilter) || c.label.includes(`20${yearFilter}`);
      });
    }

    const monthCols = isWide ? columns.filter(c => isPeriodOrMonthHeader(c.label)) : [];

    const isBalanceRow = (row) => {
      const text = Object.values(row)
        .filter(v => typeof v === 'string')
        .join(' ')
        .toLowerCase();
      return (
        text.includes('follower') ||
        text.includes('subscriber') ||
        text.includes('balance') ||
        text.includes('page like') ||
        text.includes('total fan')
      );
    };

    const getRowTotal = (row) => {
      if (isBalanceRow(row)) {
        for (let i = monthCols.length - 1; i >= 0; i--) {
          const col = monthCols[i];
          const val = row[col.key];
          if (val !== null && val !== undefined && val !== '' && val !== '-') {
            const num = typeof val === 'number' ? val : cleanNumericValue(val);
            if (!isNaN(num) && num > 0) return num;
          }
        }
        return 0;
      }

      return monthCols.reduce((sum, col) => {
        const val = row[col.key];
        if (val === null || val === undefined || val === '' || val === '-') return sum;
        const num = typeof val === 'number' ? val : cleanNumericValue(val);
        return !isNaN(num) ? sum + num : sum;
      }, 0);
    };

    const rows = isWide
      ? [...rawRows].sort((a, b) => getRowTotal(b) - getRowTotal(a))
      : rawRows;

    return { tab, columns, rows, isWide, getRowTotal };
  };

  // Omnichannel Summary KPI cards (Combined metrics across all tabs, filtered by 'summary' visibility)
  const pdfSummaryCards = useMemo(() => {
    const cards = [];
    if (!computedOverview) return cards;
    const visibleSummaryKeys = omnichannelKpiVisibility?.summary;

    const all = [
      { key: 'combined_reach', title: 'Combined Reach & Views', value: formatMetric(computedOverview.totalVolume || 0), subtitle: 'across all tabs', color: '#10B981' },
      { key: 'total_spend', title: 'Total Tracked Spend', value: `₹${(computedOverview.totalSpend || 0).toLocaleString()}`, subtitle: 'campaign investments', color: '#F59E0B' },
      { key: 'total_actions', title: 'Total Actions & Leads', value: formatMetric(computedOverview.totalActions || 0), subtitle: 'user actions & leads', color: '#0284C7' },
      { key: 'total_audience', title: 'Total Audience Base', value: formatMetric(computedOverview.totalAudience || 0), subtitle: 'followers & balance', color: '#6366F1' },
    ].filter(c => {
      if (c.key === 'combined_reach' && (computedOverview.totalVolume || 0) <= 0) return false;
      if (c.key === 'total_spend' && (computedOverview.totalSpend || 0) <= 0) return false;
      if (c.key === 'total_actions' && (computedOverview.totalActions || 0) <= 0) return false;
      if (c.key === 'total_audience' && (computedOverview.totalAudience || 0) <= 0) return false;
      return true;
    });

    return all.filter(c => !visibleSummaryKeys || visibleSummaryKeys.includes(c.key));
  }, [computedOverview, omnichannelKpiVisibility]);

  // Per-tab pinned KPI cards — uses the same computeTabKpiCards logic as OverviewView
  // Only cards the admin toggled visible (via eye icon) are included.
  const pdfKpiCards = useMemo(() => {
    const tabSections = [];

    activeTabs.forEach(tab => {
      const rawRows = sheetData[tab.id] || [];
      const cols = (tab.columns && tab.columns.length > 0) ? tab.columns : [];
      const { color: tColor } = getTabIconComponent(tab.name);

      // Compute using shared utility (same as individual tab view)
      const allCards = computeTabKpiCards(rawRows, cols, tColor);

      // Filter by visibility preference (null = all visible)
      const visibleKeys = omnichannelKpiVisibility?.[tab.id];
      const cards = allCards
        .filter(card => !visibleKeys || visibleKeys.includes(card.key))
        .map(card => ({
          title: card.title,
          value: card.value,
          subtitle: card.subtitle,
          color: card.iconColor || tColor,
          tColor
        }));

      if (cards.length > 0) tabSections.push({ tab, cards });
    });

    return tabSections;
  }, [activeTabs, sheetData, omnichannelKpiVisibility]);

  const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [isGenerating, setIsGenerating] = useState(false);

  // Sections list with order and enabled state
  const [sections, setSections] = useState(() => {
    const list = [
      {
        id: 'overview_kpi',
        type: 'overview',
        name: 'Executive Performance Summary (Top 4 KPIs)',
        enabled: true,
        icon: Layers
      }
    ];

    activeTabs.forEach(t => {
      list.push({
        id: `tab_${t.id}`,
        type: 'tab',
        tabId: t.id,
        name: `${t.name} Ledger Table`,
        enabled: true,
        icon: FileSpreadsheet
      });
    });

    return list;
  });

  // Keep sections in sync when activeTabs change
  useEffect(() => {
    setSections(prev => {
      const existingMap = new Map(prev.map(s => [s.id, s]));
      const next = [];

      if (existingMap.has('overview_kpi')) {
        next.push(existingMap.get('overview_kpi'));
      } else {
        next.push({
          id: 'overview_kpi',
          type: 'overview',
          name: 'Executive Performance Summary (Top 4 KPIs)',
          enabled: true,
          icon: Layers
        });
      }

      activeTabs.forEach(t => {
        const tid = `tab_${t.id}`;
        if (existingMap.has(tid)) {
          next.push(existingMap.get(tid));
        } else {
          next.push({
            id: tid,
            type: 'tab',
            tabId: t.id,
            name: `${t.name} Ledger Table`,
            enabled: true,
            icon: FileSpreadsheet
          });
        }
      });

      return next;
    });
  }, [activeTabs]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Move section up
  const handleMoveUp = (e, index) => {
    e.stopPropagation();
    if (index === 0) return;
    setSections(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Move section down
  const handleMoveDown = (e, index) => {
    e.stopPropagation();
    if (index === sections.length - 1) return;
    setSections(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Toggle section enabled
  const handleToggle = (id) => {
    setSections(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  // Drag & drop handlers
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer.getData('text/plain'));
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    setSections(prev => {
      const copy = [...prev];
      const [movedItem] = copy.splice(sourceIndex, 1);
      copy.splice(targetIndex, 0, movedItem);
      return copy;
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Instant High-Fidelity Vector PDF Export Engine (Zero-Freeze & True Page Breaks)
  const handleDownloadPdf = () => {
    handleNativePrint();
  };

  // Native Vector High-Fidelity Print Engine
  const handleNativePrint = () => {
    if (!reportRef.current) return;

    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isLandscape = orientation === 'landscape';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title> </title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @page {
              size: A4 ${isLandscape ? 'landscape' : 'portrait'};
              margin: 8mm 8mm 10mm 8mm;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .page-break-section {
                page-break-inside: auto !important;
                break-inside: auto !important;
                margin-bottom: 16px !important;
              }
              .section-header {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              thead {
                display: table-header-group !important;
              }
              tfoot {
                display: table-footer-group !important;
              }
            }
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              color: #0F172A;
              background: #ffffff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            .page-break-section {
              page-break-inside: auto;
              break-inside: auto;
              margin-bottom: 16px;
            }
          </style>
        </head>
        <body>
          <div style="max-width: 100%; padding: 0;">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // Compute footer totals for PDF
  const computeFooterTotal = (rows, col, isWide = false) => {
    if (!rows || rows.length === 0) return '-';
    if (isWide) return '—';
    if (col.type === 'date' || col.type === 'text') return '-';

    const lowerLabel = col.label.toLowerCase();

    // Change/flow metrics that should be summed
    const isChange = (
      col.type === 'plusMetric' ||
      lowerLabel.includes('new') ||
      lowerLabel.includes('gain') ||
      lowerLabel.includes('lost') ||
      lowerLabel.includes('loss') ||
      lowerLabel.includes('growth') ||
      lowerLabel.includes('net') ||
      lowerLabel.includes('added') ||
      lowerLabel.includes('+')
    );

    // Stock/cumulative metrics (Followers, Page Followers, Subscribers, Balance, Fans, etc.) -> take latest value
    const isStockMetric = !isChange && (
      lowerLabel.includes('follower') ||
      lowerLabel.includes('subscriber') ||
      lowerLabel.includes('sub') ||
      lowerLabel.includes('audience') ||
      lowerLabel.includes('balance') ||
      lowerLabel.includes('page like') ||
      lowerLabel.includes('total like') ||
      lowerLabel.includes('fan') ||
      lowerLabel.includes('contact') ||
      lowerLabel.includes('connection') ||
      lowerLabel.includes('member') ||
      lowerLabel.includes('cumulative')
    );

    if (isStockMetric) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const val = rows[i][col.key];
        if (val !== null && val !== undefined && val !== '' && val !== '-') {
          const num = typeof val === 'number' ? val : cleanNumericValue(val);
          return !isNaN(num) ? num.toLocaleString() : String(val);
        }
      }
      return '-';
    }

    if (col.type === 'percent' || lowerLabel.includes('rate') || lowerLabel.includes('duration')) {
      const valid = rows.map(r => Number(r[col.key])).filter(n => !isNaN(n) && n > 0);
      if (valid.length === 0) return '-';
      const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
      return `${avg.toFixed(1)}% avg`;
    }

    const valid = rows.map(r => Number(r[col.key])).filter(n => !isNaN(n));
    if (valid.length === 0) return '-';
    const sum = valid.reduce((acc, v) => acc + v, 0);

    if (col.type === 'currency' || lowerLabel.includes('spend') || lowerLabel.includes('cost')) {
      return `₹${sum.toLocaleString()}`;
    }
    if (col.type === 'plusMetric') {
      return `+${sum.toLocaleString()}`;
    }
    return sum.toLocaleString();
  };

  if (!isOpen || !activeProject) return null;

  const enabledSections = sections.filter(s => s.enabled);
  const isLandscape = orientation === 'landscape';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-card-inner)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              <Download size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                PDF Report Builder & Customizer
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Reorder the flow of sections with Up/Down buttons or drag-and-drop.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body — Two Column Layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── LEFT PANEL: Customizer (40%) ── */}
          <div
            style={{
              width: '40%',
              minWidth: '340px',
              borderRight: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-card)'
            }}
          >
            {/* Customizer Header */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-card-inner)'
              }}
            >
              {/* Page Layout Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                  <Layout size={14} color="#6366F1" /> Page Layout:
                </span>
                <div style={{ position: 'relative', flex: 1 }}>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value)}
                    style={{
                      width: '100%',
                      appearance: 'none',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '7px 32px 7px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="landscape">Landscape (Wide Spreadsheets ✨)</option>
                    <option value="portrait">Portrait (Standard)</option>
                  </select>
                  <ChevronDown
                    size={14}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Drag or use arrows to arrange sections:</span>
                <span style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 700 }}>1 = Top of PDF</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {sections.map((section, index) => {
                  const Icon = section.icon || FileText;
                  const isEnabled = section.enabled;

                  return (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: isEnabled ? 'var(--bg-card-inner)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${isEnabled ? 'var(--border-color)' : 'transparent'}`,
                        borderRadius: '10px',
                        opacity: isEnabled ? 1 : 0.45,
                        transition: 'all 0.15s ease',
                        cursor: 'grab'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                        {/* Position Badge */}
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '7px',
                            background: isEnabled ? '#6366F1' : 'var(--border-color)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            flexShrink: 0
                          }}
                        >
                          {index + 1}
                        </div>

                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggle(section.id)}
                          style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#6366F1', flexShrink: 0 }}
                        />

                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '7px',
                            background: isEnabled ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isEnabled ? '#6366F1' : 'var(--text-muted)',
                            flexShrink: 0
                          }}
                        >
                          <Icon size={14} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {section.name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {section.type === 'overview'
                              ? 'KPI cards'
                              : `${getFilteredRows(section.tabId).length} rows`}
                          </div>
                        </div>
                      </div>

                      {/* Up / Down Reorder Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={(e) => handleMoveUp(e, index)}
                          style={{
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '5px',
                            padding: '4px 8px',
                            color: index === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.68rem',
                            fontWeight: 700
                          }}
                          title="Move Up"
                        >
                          <ArrowUp size={11} />
                          <span>Up</span>
                        </button>

                        <button
                          type="button"
                          disabled={index === sections.length - 1}
                          onClick={(e) => handleMoveDown(e, index)}
                          style={{
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '5px',
                            padding: '4px 8px',
                            color: index === sections.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                            cursor: index === sections.length - 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.68rem',
                            fontWeight: 700
                          }}
                          title="Move Down"
                        >
                          <ArrowDown size={11} />
                          <span>Down</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL: Live Preview (60%) ── */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-main)',
              overflow: 'hidden'
            }}
          >
            {/* Preview Panel Header */}
            <div
              style={{
                padding: '10px 18px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-card-inner)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Eye size={14} color="#10B981" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Live Document Preview</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                📄 {isLandscape ? 'Landscape' : 'Portrait'} • {enabledSections.length} section{enabledSections.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Scrollable Preview Content — actual PDF output, scaled to fit */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '16px',
                background: '#CBD5E1'
              }}
            >
              {/* Zoom wrapper: PDF is 1120px (landscape) / 820px (portrait).
                  We scale it down via CSS zoom so it fits the preview panel. */}
              <div
                style={{
                  zoom: isLandscape ? 0.58 : 0.78,
                  transformOrigin: 'top left',
                  width: isLandscape ? '1120px' : '820px',
                  background: '#ffffff',
                  color: '#0F172A',
                  padding: '36px',
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  boxSizing: 'border-box',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
                  borderRadius: '4px'
                }}
              >
                {/* ── PDF Header ── */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '2px solid #CBD5E1',
                    paddingBottom: '20px',
                    marginBottom: '24px'
                  }}
                >
                  <div style={{ maxWidth: isLandscape ? '760px' : '520px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                      Executive Performance &amp; Analytics Report
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', lineHeight: 1.2 }}>
                      {activeProject.name}
                    </h1>
                    {activeProject.description && (
                      <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                        {activeProject.description}
                      </p>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', gap: '20px' }}>
                      <span>Report Generated: <strong>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <img src="/logo.png" alt="Logo" style={{ height: '44px', maxWidth: '200px', objectFit: 'contain' }} />
                  </div>
                </div>

                {/* ── PDF Sections ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {enabledSections.map((section) => {
                    if (section.type === 'overview') {
                      const hasSummary = pdfSummaryCards.length > 0;
                      const hasChannelInsights = pdfKpiCards.length > 0;

                      if (!hasSummary && !hasChannelInsights) {
                        return (
                          <div key={section.id}>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginBottom: '8px', borderLeft: '4px solid #6366F1', paddingLeft: '10px' }}>
                              Executive Summary &amp; Performance Overview
                            </div>
                            <div style={{ color: '#94A3B8', fontSize: '0.8rem', padding: '12px' }}>
                              All summary and channel insight metrics have been hidden.
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={section.id} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', borderLeft: '4px solid #6366F1', paddingLeft: '10px' }}>
                            Executive Summary &amp; Performance Overview
                          </div>

                          {/* 1. Overall Omnichannel Summary Cards */}
                          {hasSummary && (
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                Omnichannel Overall Summary
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pdfSummaryCards.length}, 1fr)`, gap: '10px' }}>
                                {pdfSummaryCards.map((card, cIdx) => (
                                  <div key={cIdx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                                    <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{card.title}</div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: card.color, marginTop: '4px' }}>{card.value}</div>
                                    <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '2px' }}>{card.subtitle}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2. Channel Performance Highlights — Compact Multi-Column Grid (Like Omnichannel View) */}
                          {hasChannelInsights && (
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                Channel Highlights &amp; Insights
                              </div>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(4, 1fr)',
                                  gap: '8px'
                                }}
                              >
                                {pdfKpiCards.flatMap(({ tab, cards }) =>
                                  cards.map((card, cIdx) => (
                                    <div
                                      key={`${tab.id}_${cIdx}`}
                                      style={{
                                        background: '#F8FAFC',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '8px',
                                        padding: '9px 11px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        boxSizing: 'border-box'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px', overflow: 'hidden' }}>
                                        <span
                                          style={{
                                            fontSize: '0.6rem',
                                            fontWeight: 800,
                                            color: card.tColor || '#6366F1',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}
                                        >
                                          {tab.name}
                                        </span>
                                      </div>
                                      <div
                                        style={{
                                          fontSize: '0.64rem',
                                          color: '#64748B',
                                          fontWeight: 700,
                                          textTransform: 'uppercase',
                                          lineHeight: 1.25,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {card.title}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: '1.2rem',
                                          fontWeight: 800,
                                          color: card.color || '#0F172A',
                                          marginTop: '3px'
                                        }}
                                      >
                                        {card.value}
                                      </div>
                                      {card.subtitle && (
                                        <div
                                          style={{
                                            fontSize: '0.6rem',
                                            color: '#94A3B8',
                                            marginTop: '2px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}
                                        >
                                          {card.subtitle}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Tab / Ledger Table section
                    const { tab, columns, rows, isWide, getRowTotal } = getTabPdfData(section);
                    const orientation = isLandscape ? 'landscape' : 'portrait';
                    const tableFontSize = isWide ? (columns.length >= 8 ? (orientation === 'landscape' ? '0.66rem' : '0.58rem') : '0.68rem') : '0.7rem';

                    return (
                      <div key={section.id} style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderLeft: '4px solid #6366F1', paddingLeft: '10px' }}>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B' }}>
                            {tab?.name || section.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            {rows.length} total entries • {columns.length + (isWide ? 1 : 0)} columns
                          </div>
                        </div>
                        <div style={{ border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'hidden' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tableFontSize, tableLayout: 'auto' }}>
                            <thead>
                              <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #94A3B8' }}>
                                {columns.map((c, ci) => {
                                  const isFirstCol = ci === 0;
                                  const isDescCol = !isWide && (c.type === 'text' || c.label?.toLowerCase().includes('description') || c.label?.toLowerCase().includes('observation') || c.label?.toLowerCase().includes('insight'));
                                  const thAlign = isFirstCol || isDescCol ? 'left' : 'right';
                                  const thWhiteSpace = isDescCol ? 'normal' : 'nowrap';
                                  const thMinWidth = isWide ? (isFirstCol ? (orientation === 'landscape' ? '140px' : '110px') : '42px') : (isDescCol ? '160px' : '60px');
                                  const thPadding = isWide ? (orientation === 'landscape' ? '5px 6px' : '4px 3px') : '6px 8px';

                                  return (
                                    <th
                                      key={ci}
                                      style={{
                                        padding: thPadding,
                                        textAlign: thAlign,
                                        fontWeight: 800,
                                        color: '#0F172A',
                                        whiteSpace: thWhiteSpace,
                                        wordBreak: 'normal',
                                        minWidth: thMinWidth,
                                        borderRight: ci < columns.length - 1 ? '1px solid #E2E8F0' : 'none'
                                      }}
                                    >
                                      {c.label}
                                    </th>
                                  );
                                })}
                                {isWide && (
                                  <th
                                    style={{
                                      padding: isWide ? (orientation === 'landscape' ? '5px 6px' : '4px 4px') : '6px 8px',
                                      textAlign: 'right',
                                      fontWeight: 800,
                                      color: '#6366F1',
                                      whiteSpace: 'nowrap',
                                      minWidth: '50px',
                                      background: 'rgba(99,102,241,0.06)',
                                      borderLeft: '2px solid rgba(99,102,241,0.25)'
                                    }}
                                  >
                                    Total
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r, ri) => (
                                <tr
                                  key={ri}
                                  style={{
                                    borderBottom: '1px solid #E2E8F0',
                                    background: ri % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                                    pageBreakInside: 'avoid',
                                    breakInside: 'avoid'
                                  }}
                                >
                                  {columns.map((c, ci) => {
                                    const val = r[c.key];
                                    let displayVal = '-';
                                    if (val !== null && val !== undefined && val !== '') {
                                      if (c.type === 'currency') displayVal = typeof val === 'number' ? `₹${val.toLocaleString()}` : String(val);
                                      else if (c.type === 'plusMetric') displayVal = typeof val === 'number' ? `+${val.toLocaleString()}` : `+${val}`;
                                      else if (typeof val === 'number') displayVal = val.toLocaleString();
                                      else displayVal = String(val);
                                    }
                                    const isFirstCol = ci === 0;
                                    const isDescCol = !isWide && (c.type === 'text' || c.label?.toLowerCase().includes('description') || c.label?.toLowerCase().includes('observation') || c.label?.toLowerCase().includes('insight'));
                                    const tdAlign = isFirstCol || isDescCol ? 'left' : 'right';
                                    const tdWhiteSpace = (isWide && isFirstCol) || isDescCol ? 'normal' : 'nowrap';
                                    const tdMinWidth = isWide ? (isFirstCol ? (orientation === 'landscape' ? '140px' : '110px') : '42px') : (isDescCol ? '160px' : '60px');
                                    const tdPadding = isWide ? (orientation === 'landscape' ? '4px 6px' : '3px 4px') : '5px 8px';

                                    return (
                                      <td
                                        key={ci}
                                        style={{
                                          padding: tdPadding,
                                          textAlign: tdAlign,
                                          fontWeight: isFirstCol ? 700 : 500,
                                          color: isFirstCol ? '#0284C7' : '#334155',
                                          whiteSpace: tdWhiteSpace,
                                          wordBreak: 'normal',
                                          overflowWrap: 'break-word',
                                          lineHeight: isFirstCol || isDescCol ? 1.25 : 'inherit',
                                          minWidth: tdMinWidth,
                                          borderRight: ci < columns.length - 1 ? '1px solid #F1F5F9' : 'none'
                                        }}
                                      >
                                        {displayVal}
                                      </td>
                                    );
                                  })}
                                  {isWide && (
                                    <td
                                      style={{
                                        padding: isWide ? (orientation === 'landscape' ? '4px 6px' : '3px 4px') : '5px 8px',
                                        textAlign: 'right',
                                        fontWeight: 800,
                                        color: '#6366F1',
                                        whiteSpace: 'nowrap',
                                        minWidth: '50px',
                                        background: 'rgba(99,102,241,0.06)',
                                        borderLeft: '2px solid rgba(99,102,241,0.25)'
                                      }}
                                    >
                                      {getRowTotal(r).toLocaleString()}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: '#E2E8F0', borderTop: '2px solid #94A3B8', fontWeight: 800 }}>
                                {columns.map((c, ci) => {
                                  const isFirstCol = ci === 0;
                                  const isDescCol = !isWide && (c.type === 'text' || c.label?.toLowerCase().includes('description') || c.label?.toLowerCase().includes('observation'));
                                  return (
                                    <td
                                      key={ci}
                                      style={{
                                        padding: isWide ? '5px 4px' : '7px 8px',
                                        textAlign: isFirstCol || isDescCol ? 'left' : 'right',
                                        color: '#0F172A',
                                        whiteSpace: isDescCol || isFirstCol ? 'normal' : 'nowrap',
                                        borderRight: ci < columns.length - 1 ? '1px solid #CBD5E1' : 'none'
                                      }}
                                    >
                                      {ci === 0 ? (isWide ? 'ROW TOTALS' : 'TOTAL / LATEST') : computeFooterTotal(rows, c, isWide)}
                                    </td>
                                  );
                                })}
                                {isWide && (
                                  <td
                                    style={{
                                      padding: isWide ? '5px 4px' : '7px 8px',
                                      textAlign: 'right',
                                      color: '#64748B',
                                      fontWeight: 700,
                                      whiteSpace: 'nowrap',
                                      background: 'rgba(99,102,241,0.04)',
                                      borderLeft: '2px solid rgba(99,102,241,0.2)'
                                    }}
                                  >
                                    —
                                  </td>
                                )}
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── PDF Footer ── */}
                <div style={{ marginTop: '36px', borderTop: '1px solid #CBD5E1', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94A3B8' }}>
                  <span>Shankara Online Solutions • Executive Analytics Report</span>
                  <span>Generated from live database</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            background: 'var(--bg-card-inner)'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <strong>{enabledSections.length}</strong> sections configured ({isLandscape ? 'Landscape' : 'Portrait'})
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={onClose} style={{ fontSize: '0.78rem' }}>
              Cancel
            </button>

            {/* Print / Save Vector PDF Button */}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleNativePrint}
              style={{
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: '#6366F1',
                color: '#6366F1'
              }}
              title="Print or Save via Browser (100% Crisp Vector Quality)"
            >
              <Printer size={14} />
              <span>Print / Save as PDF (Vector)</span>
            </button>

            {/* Direct Download PDF Button */}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleDownloadPdf}
              disabled={isGenerating || enabledSections.length === 0}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Download size={14} />
              <span>{isGenerating ? 'Generating PDF...' : 'Download PDF File'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* HIDDEN PRINTABLE CONTAINER FOR HIGH-RES EXPORT — kept truly off-screen so it does NOT show behind the modal */}
      <div style={{ position: 'fixed', top: 0, left: '-99999px', pointerEvents: 'none', width: isLandscape ? '1120px' : '820px' }}>
        <div
          ref={reportRef}
          style={{
            width: isLandscape ? '1120px' : '820px',
            background: '#ffffff',
            color: '#0F172A',
            padding: '36px',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            boxSizing: 'border-box'
          }}
        >
          {/* 1. Header (Left: Name & Description, Right: Logo) */}
          <div
            className="pdf-doc-header page-break-section"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #CBD5E1',
              paddingBottom: '20px',
              marginBottom: '24px'
            }}
          >
            <div style={{ maxWidth: isLandscape ? '760px' : '520px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                Executive Performance & Analytics Report
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', lineHeight: 1.2 }}>
                {activeProject.name}
              </h1>
              {activeProject.description && (
                <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  {activeProject.description}
                </p>
              )}
              <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', gap: '20px' }}>
                <span>Report Generated: <strong>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <img
                src="/logo.png"
                alt="Shankara Online Solutions Logo"
                style={{ height: '44px', maxWidth: '200px', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* 2. Dynamically Ordered Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {enabledSections.map((section) => {
              if (section.type === 'overview') {
                const hasSummary = pdfSummaryCards.length > 0;
                const hasChannelInsights = pdfKpiCards.length > 0;

                if (!hasSummary && !hasChannelInsights) return null;

                return (
                  <div key={section.id} className="page-break-section" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', borderLeft: '4px solid #6366F1', paddingLeft: '10px' }}>
                      Executive Summary &amp; Performance Overview
                    </div>

                    {/* 1. Overall Omnichannel Summary Cards */}
                    {hasSummary && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                          Omnichannel Overall Summary
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pdfSummaryCards.length}, 1fr)`, gap: '8px' }}>
                          {pdfSummaryCards.map((card, cIdx) => (
                            <div key={cIdx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px' }}>
                              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{card.title}</div>
                              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: card.color, marginTop: '3px' }}>{card.value}</div>
                              <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: '1px' }}>{card.subtitle}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. Channel Performance Highlights */}
                    {hasChannelInsights && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                          Channel Highlights &amp; Insights
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '8px'
                          }}
                        >
                          {pdfKpiCards.flatMap(({ tab, cards }) =>
                            cards.map((card, cIdx) => (
                              <div
                                key={`${tab.id}_${cIdx}`}
                                style={{
                                  background: '#F8FAFC',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  boxSizing: 'border-box'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', overflow: 'hidden' }}>
                                  <span
                                    style={{
                                      fontSize: '0.58rem',
                                      fontWeight: 800,
                                      color: card.tColor || '#6366F1',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.05em',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {tab.name}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.62rem',
                                    color: '#64748B',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    lineHeight: 1.2,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {card.title}
                                </div>
                                <div
                                  style={{
                                    fontSize: '1.15rem',
                                    fontWeight: 800,
                                    color: card.color || '#0F172A',
                                    marginTop: '2px'
                                  }}
                                >
                                  {card.value}
                                </div>
                                {card.subtitle && (
                                  <div
                                    style={{
                                      fontSize: '0.58rem',
                                      color: '#94A3B8',
                                      marginTop: '1px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {card.subtitle}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Tab Section
              const { tab, columns, rows, isWide, getRowTotal } = getTabPdfData(section);
              const orientation = isLandscape ? 'landscape' : 'portrait';
              const tableFontSize = isWide ? (columns.length >= 8 ? (orientation === 'landscape' ? '0.66rem' : '0.58rem') : '0.68rem') : '0.7rem';

              return (
                <div key={section.id} className="page-break-section" style={{ marginTop: '12px' }}>
                  <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderLeft: '4px solid #6366F1', paddingLeft: '8px' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E293B' }}>
                      {tab?.name || section.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                      {rows.length} total entries • {columns.length + (isWide ? 1 : 0)} columns
                    </div>
                  </div>

                  {/* Clean Formatted Spreadsheet Table for PDF */}
                  <div style={{ border: '1px solid #CBD5E1', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tableFontSize, tableLayout: 'auto' }}>
                      <thead>
                        <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #94A3B8' }}>
                          {columns.map((c, ci) => {
                            const isFirstCol = ci === 0;
                            const isDescCol = !isWide && (c.type === 'text' || c.label?.toLowerCase().includes('description') || c.label?.toLowerCase().includes('observation') || c.label?.toLowerCase().includes('insight'));
                            const thAlign = isFirstCol || isDescCol ? 'left' : 'right';
                            const thWhiteSpace = isDescCol ? 'normal' : 'nowrap';
                            const thMinWidth = isWide ? (isFirstCol ? (orientation === 'landscape' ? '140px' : '110px') : '42px') : (isDescCol ? '160px' : '60px');
                            const thPadding = isWide ? (orientation === 'landscape' ? '5px 6px' : '4px 3px') : '6px 8px';

                            return (
                              <th
                                key={ci}
                                style={{
                                  padding: thPadding,
                                  textAlign: thAlign,
                                  fontWeight: 800,
                                  color: '#0F172A',
                                  whiteSpace: thWhiteSpace,
                                  wordBreak: 'normal',
                                  minWidth: thMinWidth,
                                  borderRight: ci < columns.length - 1 ? '1px solid #E2E8F0' : 'none'
                                }}
                              >
                                {c.label}
                              </th>
                            );
                          })}
                          {isWide && (
                            <th
                              style={{
                                padding: isWide ? (orientation === 'landscape' ? '5px 6px' : '4px 4px') : '6px 8px',
                                textAlign: 'right',
                                fontWeight: 800,
                                color: '#6366F1',
                                whiteSpace: 'nowrap',
                                minWidth: '50px',
                                background: 'rgba(99,102,241,0.06)',
                                borderLeft: '2px solid rgba(99,102,241,0.25)'
                              }}
                            >
                              Total
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, ri) => (
                          <tr
                            key={ri}
                            style={{
                              borderBottom: '1px solid #E2E8F0',
                              background: ri % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                              pageBreakInside: 'avoid',
                              breakInside: 'avoid'
                            }}
                          >
                            {columns.map((c, ci) => {
                              const val = r[c.key];
                              let displayVal = '-';
                              if (val !== null && val !== undefined && val !== '') {
                                if (c.type === 'currency') displayVal = typeof val === 'number' ? `₹${val.toLocaleString()}` : String(val);
                                else if (c.type === 'plusMetric') displayVal = typeof val === 'number' ? `+${val.toLocaleString()}` : `+${val}`;
                                else if (typeof val === 'number') displayVal = val.toLocaleString();
                                else displayVal = String(val);
                              }
                              const isFirstCol = ci === 0;
                              const isDescCol = !isWide && (c.type === 'text' || c.label?.toLowerCase().includes('description') || c.label?.toLowerCase().includes('observation') || c.label?.toLowerCase().includes('insight'));
                              const tdAlign = isFirstCol || isDescCol ? 'left' : 'right';
                              const tdWhiteSpace = (isWide && isFirstCol) || isDescCol ? 'normal' : 'nowrap';
                              const tdMinWidth = isWide ? (isFirstCol ? (orientation === 'landscape' ? '140px' : '110px') : '42px') : (isDescCol ? '160px' : '60px');
                              const tdPadding = isWide ? (orientation === 'landscape' ? '4px 6px' : '3px 4px') : '5px 8px';

                              return (
                                <td
                                  key={ci}
                                  style={{
                                    padding: tdPadding,
                                    textAlign: tdAlign,
                                    fontWeight: isFirstCol ? 700 : 500,
                                    color: isFirstCol ? '#0284C7' : '#334155',
                                    whiteSpace: tdWhiteSpace,
                                    wordBreak: 'normal',
                                    overflowWrap: 'break-word',
                                    lineHeight: isFirstCol || isDescCol ? 1.25 : 'inherit',
                                    minWidth: tdMinWidth,
                                    borderRight: ci < columns.length - 1 ? '1px solid #F1F5F9' : 'none'
                                  }}
                                >
                                  {displayVal}
                                </td>
                              );
                            })}
                            {isWide && (
                              <td
                                style={{
                                  padding: isWide ? (orientation === 'landscape' ? '4px 6px' : '3px 4px') : '5px 8px',
                                  textAlign: 'right',
                                  fontWeight: 800,
                                  color: '#6366F1',
                                  whiteSpace: 'nowrap',
                                  minWidth: '50px',
                                  background: 'rgba(99,102,241,0.06)',
                                  borderLeft: '2px solid rgba(99,102,241,0.25)'
                                }}
                              >
                                {getRowTotal(r).toLocaleString()}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#E2E8F0', borderTop: '2px solid #94A3B8', fontWeight: 800 }}>
                          {columns.map((c, ci) => {
                            const isFirstCol = ci === 0;
                            const isDescCol = !isWide && (c.type === 'text' || c.label?.toLowerCase().includes('description') || c.label?.toLowerCase().includes('observation'));
                            return (
                              <td
                                key={ci}
                                style={{
                                  padding: isWide ? '5px 4px' : '7px 8px',
                                  textAlign: isFirstCol || isDescCol ? 'left' : 'right',
                                  color: '#0F172A',
                                  whiteSpace: isDescCol || isFirstCol ? 'normal' : 'nowrap',
                                  borderRight: ci < columns.length - 1 ? '1px solid #CBD5E1' : 'none'
                                }}
                              >
                                {ci === 0 ? (isWide ? 'ROW TOTALS' : 'TOTAL / LATEST') : computeFooterTotal(rows, c, isWide)}
                              </td>
                            );
                          })}
                          {isWide && (
                            <td
                              style={{
                                padding: isWide ? '5px 4px' : '7px 8px',
                                textAlign: 'right',
                                color: '#64748B',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                background: 'rgba(99,102,241,0.04)',
                                borderLeft: '2px solid rgba(99,102,241,0.2)'
                              }}
                            >
                              —
                            </td>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. Footer */}
          <div
            style={{
              marginTop: '36px',
              borderTop: '1px solid #CBD5E1',
              paddingTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.68rem',
              color: '#94A3B8'
            }}
          >
            <span>Shankara Online Solutions • Executive Analytics Report</span>
            <span>Generated from live database</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
