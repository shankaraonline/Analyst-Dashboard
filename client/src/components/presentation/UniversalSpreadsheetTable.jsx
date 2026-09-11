import React, { useState, useMemo } from 'react';
import { cleanNumericValue, isPeriodOrMonthHeader } from '../../utils/spreadsheetParser';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, CheckSquare, Check, Bookmark } from 'lucide-react';

export default function UniversalSpreadsheetTable({
  columns = [],
  rows = [],
  tabId = null,
  tabName = 'Spreadsheet',
  showYearFilter = true,
  searchable = true,
  selectedYear: controlledYear,   // controlled from parent
  onYearChange,                   // callback to bubble year up
  isAdmin = false,
  selectedRowKeys = [],           // array of selected row labels for Channel Insights (empty by default)
  onRowSelectionChange = null,    // (updatedKeys) => void
  selectedColKeys = null,         // array of selected column keys for calculations
  onColSelectionChange = null,    // (updatedKeys) => void
  onSaveChannelInsight = null,    // () => void
  isSaving = false,
  saveSuccess = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [internalYear, setInternalYear] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Use controlled year if provided, otherwise internal
  const selectedYear = controlledYear !== undefined ? controlledYear : internalYear;
  const setSelectedYear = (y) => {
    setInternalYear(y);
    if (onYearChange) onYearChange(y);
  };

  // 1. Detect "wide" (transposed) format:
  //    Wide = 2 or more column headers represent months / time periods
  //    In this layout rows = metric attributes, columns = months/time
  const isWideFormat = useMemo(() => {
    return columns.filter(c => isPeriodOrMonthHeader(c.label)).length >= 2;
  }, [columns]);

  // 2. Detect date column (for normal / long format only)
  const dateCol = useMemo(() => {
    if (isWideFormat) return null;
    return columns.find(c => c.type === 'date') || columns[0] || null;
  }, [columns, isWideFormat]);

  // 3. Available years
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    if (isWideFormat) {
      columns.forEach(c => {
        if (isPeriodOrMonthHeader(c.label)) {
          const m4 = c.label.match(/\b20(\d{2})\b/);
          if (m4) {
            yearsSet.add(m4[1]);
          } else {
            const m2 = c.label.match(/(?:[-/\s]|^)(\d{2})\b/);
            if (m2 && Number(m2[1]) >= 20 && Number(m2[1]) <= 35) {
              yearsSet.add(m2[1]);
            }
          }
        }
      });
    } else {
      if (!dateCol) return ['All'];
      rows.forEach(r => {
        const val = String(r[dateCol.key] || '');
        const match = val.match(/(?:20)?(2\d)\b/);
        if (match) yearsSet.add(match[1]);
      });
    }
    const sorted = Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
    return sorted.length > 0 ? ['All', ...sorted] : ['All'];
  }, [rows, dateCol, columns, isWideFormat]);

  // 4. Visible columns
  const visibleColumns = useMemo(() => {
    if (!isWideFormat || selectedYear === 'All') return columns;
    return columns.filter(c => {
      if (!isPeriodOrMonthHeader(c.label)) return true; // keep descriptor columns like "Key Metrics"
      const label = c.label;
      return label.includes(selectedYear) || label.includes(`20${selectedYear}`);
    });
  }, [columns, isWideFormat, selectedYear]);

  // 5. Filter rows
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (!isWideFormat && selectedYear !== 'All' && dateCol) {
        const val = String(row[dateCol.key] || '');
        if (!val.includes(selectedYear) && !val.includes(`20${selectedYear}`)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = Object.values(row).some(v => {
          if (v === null || v === undefined) return false;
          return String(v).toLowerCase().includes(q);
        });
        if (!matches) return false;
      }

      return true;
    });
  }, [rows, selectedYear, searchQuery, dateCol, isWideFormat]);

  // Wide format: month columns that are currently visible
  const wideMonthCols = useMemo(() => {
    if (!isWideFormat) return [];
    return visibleColumns.filter(c => isPeriodOrMonthHeader(c.label));
  }, [isWideFormat, visibleColumns]);

  // Row Metric Label extractor
  const getRowMetricLabel = (row) => {
    const rowKeys = Object.keys(row).filter(k => k !== '_rowId');
    if (rowKeys.length === 0) return '';
    const metricKey = rowKeys.find(k => !isPeriodOrMonthHeader(k)) || rowKeys[0];
    return String(row[metricKey] || '').trim();
  };

  // Month columns used for calculation (Total column & calculations)
  const calculationMonthCols = useMemo(() => {
    if (!isWideFormat) return [];
    if (selectedColKeys && selectedColKeys.length > 0) {
      const matched = wideMonthCols.filter(c => selectedColKeys.includes(c.key));
      return matched.length > 0 ? matched : wideMonthCols;
    }
    return wideMonthCols;
  }, [isWideFormat, wideMonthCols, selectedColKeys]);

  const isColActive = (colKey) => {
    if (!selectedColKeys || selectedColKeys.length === 0) return true;
    return selectedColKeys.includes(colKey);
  };

  const isRowActive = (rowLabel) => {
    if (!selectedRowKeys || !Array.isArray(selectedRowKeys) || selectedRowKeys.length === 0) return false;
    return selectedRowKeys.some(k => k.trim().toLowerCase() === rowLabel.toLowerCase());
  };

  // Helper to detect if a metric is incremental / flow / growth (to be SUMMED across active months)
  // e.g. "New Followers", "New Subscribers", "Followers Gained", "Added Subscribers", "Net Growth", etc.
  const isIncrementalRow = (row) => {
    const label = String(getRowMetricLabel(row) || '').toLowerCase();
    const fullText = Object.values(row)
      .filter(v => typeof v === 'string')
      .join(' ')
      .toLowerCase();
    const target = (label + ' ' + fullText).toLowerCase();

    // Explicit incremental / change / acquisition keywords
    return (
      target.includes('new') ||
      target.includes('gain') ||
      target.includes('add') ||
      target.includes('growth') ||
      target.includes('lost') ||
      target.includes('loss') ||
      target.includes('net') ||
      target.includes('+') ||
      target.includes('change') ||
      target.includes('view') ||
      target.includes('reach') ||
      target.includes('impression') ||
      target.includes('spend') ||
      target.includes('cost') ||
      target.includes('budget') ||
      target.includes('click') ||
      target.includes('interaction') ||
      target.includes('reaction') ||
      target.includes('engagement') ||
      target.includes('visit') ||
      target.includes('session') ||
      target.includes('post') ||
      target.includes('order') ||
      target.includes('lead')
    );
  };

  // Check if a row represents a standing cumulative balance metric (e.g. Total Page Followers, Total Subscribers, Account Balance)
  // Standing audience metrics take the latest non-empty month value instead of summing.
  // Note: Incremental metrics (e.g. "New Followers", "New Subscribers") are NEVER balance rows and are ALWAYS summed!
  const isBalanceRow = (row) => {
    if (isIncrementalRow(row)) return false;

    const label = String(getRowMetricLabel(row) || '').toLowerCase();
    const fullText = Object.values(row)
      .filter(v => typeof v === 'string')
      .join(' ')
      .toLowerCase();
    const target = (label + ' ' + fullText).toLowerCase();

    return (
      target.includes('total page follower') ||
      target.includes('total follower') ||
      target.includes('total subscriber') ||
      target.includes('cumulative') ||
      target.includes('follower') ||
      target.includes('subscriber') ||
      target.includes('balance') ||
      target.includes('page like') ||
      target.includes('total fan') ||
      target.includes('base') ||
      target.includes('audience')
    );
  };

  // Row total for wide format (computed over calculationMonthCols)
  const getWideRowTotal = (row) => {
    const colsToUse = calculationMonthCols;
    if (colsToUse.length === 0) return 0;

    if (isBalanceRow(row)) {
      for (let i = colsToUse.length - 1; i >= 0; i--) {
        const col = colsToUse[i];
        const val = row[col.key];
        if (val !== null && val !== undefined && val !== '' && val !== '-') {
          const num = typeof val === 'number' ? val : cleanNumericValue(val);
          if (!isNaN(num) && num > 0) return num;
        }
      }
      return 0;
    }

    return colsToUse.reduce((sum, col) => {
      const val = row[col.key];
      if (val === null || val === undefined || val === '' || val === '-') return sum;
      const num = typeof val === 'number' ? val : cleanNumericValue(val);
      return !isNaN(num) ? sum + num : sum;
    }, 0);
  };

  // 6. Sort rows
  const sortedRows = useMemo(() => {
    if (isWideFormat) {
      const key = sortConfig.key;
      return [...filteredRows].sort((a, b) => {
        if (!key || key === '__rowTotal__') {
          const diff = getWideRowTotal(b) - getWideRowTotal(a);
          return sortConfig.direction === 'asc' ? -diff : diff;
        }
        const aVal = a[key] ?? 0;
        const bVal = b[key] ?? 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    if (!sortConfig.key) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, sortConfig, isWideFormat, calculationMonthCols]);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return { key: null, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // ── Row & Column Checkbox Handlers ──
  const allRowLabels = useMemo(() => {
    return sortedRows
      .map(r => getRowMetricLabel(r))
      .filter(l => l && l.toLowerCase() !== 'row totals' && l.toLowerCase() !== 'total');
  }, [sortedRows]);

  const allRowsChecked = useMemo(() => {
    if (!selectedRowKeys || !Array.isArray(selectedRowKeys) || selectedRowKeys.length === 0) return false;
    return allRowLabels.length > 0 && allRowLabels.every(l => isRowActive(l));
  }, [selectedRowKeys, allRowLabels]);

  const someRowsChecked = useMemo(() => {
    if (!selectedRowKeys || !Array.isArray(selectedRowKeys) || selectedRowKeys.length === 0) return false;
    return allRowLabels.some(l => isRowActive(l));
  }, [selectedRowKeys, allRowLabels]);

  const handleToggleRow = (rowLabel) => {
    if (!onRowSelectionChange) return;
    const current = (selectedRowKeys !== null && selectedRowKeys !== undefined && Array.isArray(selectedRowKeys))
      ? selectedRowKeys
      : [];

    let next;
    if (current.some(k => k.trim().toLowerCase() === rowLabel.toLowerCase())) {
      next = current.filter(k => k.trim().toLowerCase() !== rowLabel.toLowerCase());
    } else {
      next = [...current, rowLabel];
    }
    onRowSelectionChange(next);
  };

  const handleToggleAllRows = () => {
    if (!onRowSelectionChange) return;
    if (allRowsChecked) {
      onRowSelectionChange([]);
    } else {
      onRowSelectionChange(allRowLabels);
    }
  };

  const handleToggleCol = (colKey) => {
    if (!onColSelectionChange) return;
    const allColKeys = wideMonthCols.map(c => c.key);
    const current = (selectedColKeys !== null && selectedColKeys !== undefined)
      ? selectedColKeys
      : allColKeys;

    let next;
    if (current.includes(colKey)) {
      next = current.filter(k => k !== colKey);
    } else {
      next = [...current, colKey];
    }
    onColSelectionChange(next);
  };

  const handleSelectAllCols = () => {
    if (!onColSelectionChange) return;
    onColSelectionChange(wideMonthCols.map(c => c.key));
  };

  const handleSelectLatestColOnly = () => {
    if (!onColSelectionChange || wideMonthCols.length === 0) return;
    const latest = wideMonthCols[wideMonthCols.length - 1];
    onColSelectionChange([latest.key]);
  };

  // 7. Value Formatter
  const renderCellValue = (row, col) => {
    const val = row[col.key];
    if (val === null || val === undefined || val === '' || val === '-') {
      return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    }

    switch (col.type) {
      case 'currency':
        return typeof val === 'number' ? `₹${val.toLocaleString()}` : String(val);
      case 'metric':
        return typeof val === 'number' ? val.toLocaleString() : String(val);
      case 'plusMetric':
        return typeof val === 'number' ? `+${val.toLocaleString()}` : `+${val}`;
      case 'number':
        return typeof val === 'number' ? val.toLocaleString() : String(val);
      case 'percent':
        return typeof val === 'number' ? `${val}%` : (String(val).includes('%') ? val : `${val}%`);
      case 'duration':
        return typeof val === 'number' ? `${val} hrs` : String(val);
      case 'date':
        return <span style={{ fontWeight: 700, color: '#38BDF8' }}>{String(val)}</span>;
      default:
        return String(val);
    }
  };

  // 8. Footer Totals
  const renderFooterTotal = (col) => {
    if (sortedRows.length === 0) return '-';

    if (isWideFormat) {
      return '—';
    }

    if (col.type === 'date' || col.type === 'text') {
      return '-';
    }

    const lowerLabel = col.label.toLowerCase();

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
      for (let i = sortedRows.length - 1; i >= 0; i--) {
        const val = sortedRows[i][col.key];
        if (val !== null && val !== undefined && val !== '' && val !== '-') {
          const num = typeof val === 'number' ? val : cleanNumericValue(val);
          return !isNaN(num) ? num.toLocaleString() : String(val);
        }
      }
      return '-';
    }

    if (col.type === 'percent' || lowerLabel.includes('rate') || lowerLabel.includes('duration')) {
      const valid = sortedRows.map(r => Number(r[col.key])).filter(n => !isNaN(n) && n > 0);
      if (valid.length === 0) return '-';
      const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
      return `${avg.toFixed(1)}% avg`;
    }

    const valid = sortedRows.map(r => Number(r[col.key])).filter(n => !isNaN(n));
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

  const totalColumnLabel = useMemo(() => {
    if (!isWideFormat) return 'Total';
    if (selectedColKeys && selectedColKeys.length === 1) {
      const col = wideMonthCols.find(c => c.key === selectedColKeys[0]);
      return col ? `Total (${col.label})` : 'Total';
    }
    if (selectedColKeys && selectedColKeys.length > 1 && selectedColKeys.length < wideMonthCols.length) {
      return `Total (${selectedColKeys.length} mos)`;
    }
    return 'Total';
  }, [isWideFormat, selectedColKeys, wideMonthCols]);

  const activeRowCount = useMemo(() => {
    return allRowLabels.filter(l => isRowActive(l)).length;
  }, [allRowLabels, selectedRowKeys]);

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
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {tabName} Ledger
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {sortedRows.length} total recorded entries • {visibleColumns.length} columns
              {isWideFormat && selectedYear !== 'All' && (
                <span style={{ marginLeft: '6px', color: '#6366F1', fontWeight: 700 }}>
                  · 20{selectedYear}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {searchable && (
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search rows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 12px 6px 30px',
                  borderRadius: '8px',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  width: '160px'
                }}
              />
            </div>
          )}

          {showYearFilter && availableYears.length > 2 && (
            <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {availableYears.map(y => (
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
                  {y === 'All' ? 'All' : `20${y}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin Quick Action Toolbar for Row/Column Selection */}
      {isAdmin && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.03) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
            <span style={{ fontWeight: 700, color: '#6366F1' }}>Channel Insights &amp; Totals Builder:</span>
            <span style={{ background: 'rgba(99,102,241,0.12)', color: '#6366F1', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '0.73rem' }}>
              {activeRowCount} of {allRowLabels.length} rows selected for Insights
            </span>
            {isWideFormat && (
              <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '0.73rem' }}>
                {calculationMonthCols.length} of {wideMonthCols.length} months active in Totals
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleToggleAllRows}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <CheckSquare size={13} color="#6366F1" />
              <span>{allRowsChecked ? 'Deselect All Rows' : 'Select All Rows'}</span>
            </button>
            {isWideFormat && (
              <>
                <span style={{ color: 'var(--border-color)', fontSize: '0.9rem' }}>|</span>
                <button
                  onClick={handleSelectAllCols}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  All Months
                </button>
                <button
                  onClick={handleSelectLatestColOnly}
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366F1', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Latest Month Only
                </button>
              </>
            )}
            {onSaveChannelInsight && (
              <>
                <span style={{ color: 'var(--border-color)', fontSize: '0.9rem' }}>|</span>
                <button
                  onClick={onSaveChannelInsight}
                  disabled={isSaving}
                  style={{
                    background: saveSuccess ? '#10B981' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {saveSuccess ? <Check size={13} /> : <CheckSquare size={13} />}
                  <span>{isSaving ? 'Saving...' : (saveSuccess ? 'Saved!' : 'Save Channel Insight')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Spreadsheet Table Container */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
          {/* Header Row */}
          <thead>
            <tr style={{ background: 'var(--bg-table-header)', borderBottom: '2px solid var(--border-color)' }}>
              {visibleColumns.map((col, idx) => {
                const isSorted = sortConfig.key === col.key;
                const isTextCol = col.type === 'text' || col.align === 'left' || col.label?.toLowerCase().includes('description') || col.label?.toLowerCase().includes('observation') || col.label?.toLowerCase().includes('insight');
                const isPeriodCol = isPeriodOrMonthHeader(col.label);
                const isColChecked = isColActive(col.key);

                return (
                  <th
                    key={col.key || idx}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: '12px 14px',
                      textAlign: col.align || (isTextCol ? 'left' : 'right'),
                      fontWeight: 700,
                      color: col.highlight ? '#38BDF8' : 'var(--text-primary)',
                      whiteSpace: isTextCol ? 'normal' : 'nowrap',
                      wordBreak: isTextCol ? 'break-word' : 'normal',
                      cursor: 'pointer',
                      userSelect: 'none',
                      background: (isPeriodCol && isColChecked && selectedColKeys && selectedColKeys.length < wideMonthCols.length)
                        ? 'rgba(99,102,241,0.06)'
                        : 'inherit'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: (col.align === 'left' || isTextCol) ? 'flex-start' : 'flex-end', gap: '6px' }}>
                      {/* Checkbox for first column header (Select All Rows) in Admin mode */}
                      {idx === 0 && isAdmin && (
                        <input
                          type="checkbox"
                          checked={allRowsChecked}
                          ref={el => { if (el) el.indeterminate = someRowsChecked && !allRowsChecked; }}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleAllRows();
                          }}
                          style={{ cursor: 'pointer', accentColor: '#6366F1', width: '14px', height: '14px', marginRight: '4px' }}
                          title="Select / Deselect all rows for Channel Insights"
                        />
                      )}

                      {/* Checkbox for period column headers in Admin mode */}
                      {isPeriodCol && isAdmin && (
                        <input
                          type="checkbox"
                          checked={isColChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleCol(col.key);
                          }}
                          style={{ cursor: 'pointer', accentColor: '#6366F1', width: '14px', height: '14px', marginRight: '4px' }}
                          title={`Include ${col.label} in Totals and calculations`}
                        />
                      )}

                      <span>{col.label}</span>

                      {isSorted ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={13} color="#6366F1" /> : <ArrowDown size={13} color="#6366F1" />
                      ) : (
                        <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
                      )}
                    </div>
                  </th>
                );
              })}
              {/* Wide format: extra "Total" column header */}
              {isWideFormat && (
                <th
                  onClick={() => handleSort('__rowTotal__')}
                  style={{
                    padding: '12px 14px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#6366F1',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    userSelect: 'none',
                    background: 'rgba(99,102,241,0.08)',
                    borderLeft: '2px solid rgba(99,102,241,0.25)'
                  }}
                  title={calculationMonthCols.length < wideMonthCols.length ? `Calculated from ${calculationMonthCols.length} selected month(s)` : 'Total across all recorded months'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <span>{totalColumnLabel}</span>
                    {sortConfig.key === '__rowTotal__' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={13} color="#6366F1" /> : <ArrowDown size={13} color="#6366F1" />
                    ) : (
                      <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
                    )}
                  </div>
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (isWideFormat ? 1 : 0)} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>No rows found</div>
                  <div style={{ fontSize: '0.8rem' }}>Sync your Google Sheet in the Admin panel to display data.</div>
                </td>
              </tr>
            ) : (
              sortedRows.map((row, rIdx) => {
                const rowLabel = getRowMetricLabel(row);
                const isRowSelectedForInsights = isRowActive(rowLabel);

                return (
                  <tr
                    key={row._rowId || rIdx}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      background: rIdx % 2 === 0 ? 'var(--bg-table-row-even)' : 'var(--bg-table-row-odd)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {visibleColumns.map((col, cIdx) => {
                      const rawVal = row[col.key];
                      const isLongText = typeof rawVal === 'string' && (rawVal.length > 25 || (rawVal.includes(' ') && rawVal.length > 15));
                      const isTextCol = col.type === 'text' || (!['currency', 'number', 'percent', 'date', 'duration', 'plusMetric', 'metric'].includes(col.type) && isLongText);

                      return (
                        <td
                          key={col.key || cIdx}
                          style={{
                            padding: '10px 14px',
                            textAlign: col.align || (isTextCol ? 'left' : 'right'),
                            fontWeight: col.highlight ? 700 : (cIdx === 0 ? 600 : 500),
                            whiteSpace: isTextCol ? 'normal' : 'nowrap',
                            wordBreak: isTextCol ? 'break-word' : 'normal',
                            overflowWrap: isTextCol ? 'break-word' : 'normal',
                            lineHeight: isTextCol ? 1.45 : 'inherit',
                            minWidth: isTextCol && isLongText ? '220px' : 'auto',
                            maxWidth: isTextCol && isLongText ? '600px' : 'none'
                          }}
                        >
                          {cIdx === 0 && isAdmin ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={isRowSelectedForInsights}
                                onChange={() => handleToggleRow(rowLabel)}
                                style={{
                                  cursor: 'pointer',
                                  accentColor: '#6366F1',
                                  width: '15px',
                                  height: '15px',
                                  flexShrink: 0
                                }}
                                title={isRowSelectedForInsights ? 'Included in Channel Insights (click to hide)' : 'Hidden from Channel Insights (click to show)'}
                              />
                              <span style={{ flex: 1 }}>{renderCellValue(row, col)}</span>
                            </div>
                          ) : (
                            renderCellValue(row, col)
                          )}
                        </td>
                      );
                    })}
                    {/* Wide format: row total cell */}
                    {isWideFormat && (
                      <td style={{
                        padding: '10px 14px',
                        textAlign: 'right',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        color: '#6366F1',
                        background: 'rgba(99,102,241,0.06)',
                        borderLeft: '2px solid rgba(99,102,241,0.25)'
                      }}>
                        {getWideRowTotal(row).toLocaleString()}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Totals / Summary Footer Row */}
          {sortedRows.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--bg-table-footer)', borderTop: '2px solid var(--border-color)', fontWeight: 800 }}>
                {visibleColumns.map((col, cIdx) => {
                  const isTextCol = col.type === 'text' || col.align === 'left';
                  return (
                    <td
                      key={col.key || cIdx}
                      style={{
                        padding: '12px 14px',
                        textAlign: col.align || (isTextCol ? 'left' : 'right'),
                        color: cIdx === 0 ? 'var(--text-primary)' : (col.highlight ? '#38BDF8' : 'var(--text-primary)'),
                        whiteSpace: isTextCol || cIdx === 0 ? 'normal' : 'nowrap'
                      }}
                    >
                      {cIdx === 0
                        ? (isWideFormat ? 'ROW TOTALS' : 'TOTAL / LATEST')
                        : renderFooterTotal(col)}
                    </td>
                  );
                })}
                {/* Wide format: Total column footer */}
                {isWideFormat && (
                  <td style={{
                    padding: '12px 14px',
                    textAlign: 'right',
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    background: 'rgba(99,102,241,0.04)',
                    borderLeft: '2px solid rgba(99,102,241,0.2)'
                  }}>
                    —
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Bottom Save Option as requested by user */}
      {isAdmin && onSaveChannelInsight && (
        <div style={{
          marginTop: '18px',
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'var(--bg-main)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366F1'
            }}>
              <Bookmark size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Channel Insights for {tabName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {selectedRowKeys && selectedRowKeys.length > 0 ? (
                  <span style={{ color: '#6366F1', fontWeight: 700 }}>
                    {selectedRowKeys.length} metric row{selectedRowKeys.length > 1 ? 's' : ''} selected
                  </span>
                ) : (
                  <span>Select any metric rows using the checkboxes above</span>
                )}
                {isWideFormat && (
                  <span> · {calculationMonthCols.length} of {wideMonthCols.length} months active for calculations</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {saveSuccess && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
                <Check size={16} /> Saved!
              </span>
            )}
            <button
              onClick={onSaveChannelInsight}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: saveSuccess ? '#10B981' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 22px',
                fontWeight: 700,
                fontSize: '0.875rem',
                borderRadius: '9px',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              {saveSuccess ? <Check size={16} /> : <CheckSquare size={16} />}
              <span>{isSaving ? 'Saving...' : (saveSuccess ? 'Saved!' : 'Save Channel Insight')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
