import React, { useState, useMemo } from 'react';
import { cleanNumericValue, isPeriodOrMonthHeader } from '../../utils/spreadsheetParser';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet } from 'lucide-react';

export default function UniversalSpreadsheetTable({
  columns = [],
  rows = [],
  tabName = 'Spreadsheet',
  showYearFilter = true,
  searchable = true,
  selectedYear: controlledYear,   // controlled from parent
  onYearChange                    // callback to bubble year up
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
  //    Wide format  → scan column LABELS for 2-digit or 4-digit years
  //    Normal format → scan row VALUES in the date column
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
  //    Wide format + specific year  → keep non-month descriptor cols + only the matching year's month cols
  //    Everything else              → show all columns
  const visibleColumns = useMemo(() => {
    if (!isWideFormat || selectedYear === 'All') return columns;
    return columns.filter(c => {
      if (!isPeriodOrMonthHeader(c.label)) return true; // keep descriptor columns like "Key Metrics", "Metric Name"
      const label = c.label;
      return label.includes(selectedYear) || label.includes(`20${selectedYear}`);
    });
  }, [columns, isWideFormat, selectedYear]);

  // 5. Filter rows
  //    Wide format → year lives in column headers; skip row-level year filter
  //    Normal format → filter by year in date column
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

  // Check if a row represents a cumulative balance metric (Followers, Subscribers, Page Likes, Balance)
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

  // Row total for wide format (sum for volume/reach/spend/actions; latest month balance for followers)
  const getWideRowTotal = (row) => {
    if (isBalanceRow(row)) {
      for (let i = wideMonthCols.length - 1; i >= 0; i--) {
        const col = wideMonthCols[i];
        const val = row[col.key];
        if (val !== null && val !== undefined && val !== '' && val !== '-') {
          const num = typeof val === 'number' ? val : cleanNumericValue(val);
          if (!isNaN(num) && num > 0) return num;
        }
      }
      return 0;
    }

    return wideMonthCols.reduce((sum, col) => {
      const val = row[col.key];
      if (val === null || val === undefined || val === '' || val === '-') return sum;
      const num = typeof val === 'number' ? val : cleanNumericValue(val);
      return !isNaN(num) ? sum + num : sum;
    }, 0);
  };

  // 6. Sort rows
  //    Wide format, no explicit sort → default by row total descending
  //    Wide format, '__rowTotal__' sort key → sort by computed row total
  //    Everything else → existing column-value sort
  const sortedRows = useMemo(() => {
    if (isWideFormat) {
      const key = sortConfig.key;
      return [...filteredRows].sort((a, b) => {
        if (!key || key === '__rowTotal__') {
          // Default / explicit total sort
          const diff = getWideRowTotal(b) - getWideRowTotal(a);
          return sortConfig.direction === 'asc' ? -diff : diff;
        }
        // Sort by a specific month column
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
  }, [filteredRows, sortConfig, isWideFormat, wideMonthCols]);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return { key: null, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // 4. Value Formatter
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

  // 5. Smart Footer Totals
  const renderFooterTotal = (col) => {
    if (sortedRows.length === 0) return '-';

    // In wide format, rows represent different metric attributes (Views, Reach, Interactions, Followers).
    // Summing down the column is invalid because it mixes different metrics together.
    // Horizontal totals are calculated per metric row in the "Total" column.
    if (isWideFormat) {
      return '—';
    }

    if (col.type === 'date' || col.type === 'text') {
      return '-';
    }

    const lowerLabel = col.label.toLowerCase();

    if (
      lowerLabel.includes('total follower') ||
      lowerLabel.includes('total sub') ||
      lowerLabel.includes('balance') ||
      lowerLabel.includes('total page like') ||
      lowerLabel.includes('cumulative')
    ) {
      for (let i = sortedRows.length - 1; i >= 0; i--) {
        const val = sortedRows[i][col.key];
        if (val !== null && val !== undefined && val !== '') {
          return typeof val === 'number' ? val.toLocaleString() : String(val);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
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

      {/* Spreadsheet Table Container */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
          {/* Header Row */}
          <thead>
            <tr style={{ background: 'var(--bg-table-header)', borderBottom: '2px solid var(--border-color)' }}>
              {visibleColumns.map((col, idx) => {
                const isSorted = sortConfig.key === col.key;
                return (
                  <th
                    key={col.key || idx}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: '12px 14px',
                      textAlign: col.align || 'right',
                      fontWeight: 700,
                      color: col.highlight ? '#38BDF8' : 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: col.align === 'left' ? 'flex-start' : 'flex-end', gap: '6px' }}>
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
                    background: 'rgba(99,102,241,0.06)',
                    borderLeft: '2px solid rgba(99,102,241,0.25)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <span>Total</span>
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
                <td colSpan={visibleColumns.length} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>No rows found</div>
                  <div style={{ fontSize: '0.8rem' }}>Sync your Google Sheet in the Admin panel to display data.</div>
                </td>
              </tr>
            ) : (
              sortedRows.map((row, rIdx) => (
                <tr
                  key={row._rowId || rIdx}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: rIdx % 2 === 0 ? 'var(--bg-table-row-even)' : 'var(--bg-table-row-odd)',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {visibleColumns.map((col, cIdx) => (
                    <td
                      key={col.key || cIdx}
                      style={{
                        padding: '10px 14px',
                        textAlign: col.align || 'right',
                        fontWeight: col.highlight ? 700 : 500,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {renderCellValue(row, col)}
                    </td>
                  ))}
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
              ))
            )}
          </tbody>

          {/* Totals / Summary Footer Row */}
          {sortedRows.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--bg-table-footer)', borderTop: '2px solid var(--border-color)', fontWeight: 800 }}>
                {visibleColumns.map((col, cIdx) => (
                  <td
                    key={col.key || cIdx}
                    style={{
                      padding: '12px 14px',
                      textAlign: col.align || 'right',
                      color: cIdx === 0 ? 'var(--text-primary)' : (col.highlight ? '#38BDF8' : 'var(--text-primary)'),
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cIdx === 0
                      ? (isWideFormat ? 'ROW TOTALS' : 'TOTAL / LATEST')
                      : renderFooterTotal(col)}
                  </td>
                ))}
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
    </div>
  );
}
