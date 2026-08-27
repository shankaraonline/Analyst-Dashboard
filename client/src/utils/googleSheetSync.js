import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Extracts Google Spreadsheet ID from any URL format
 */
export function extractSpreadsheetId(url = '') {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Clean numeric string into clean number or raw value
 */
export function cleanValue(val) {
  if (val === null || val === undefined || val === '' || val === 'NA' || val === 'na' || val === 'N/A' || val === 'n/a' || val === '-') {
    return null;
  }
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }
  const str = String(val).trim();
  if (!str) return null;

  // Currency
  if (/^[₹$€£]\s*[\d,.]+/i.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? str : num;
  }

  // Percentage
  if (str.endsWith('%')) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? str : num;
  }

  // K suffix
  if (/^[\d,.]+\s*k$/i.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? str : Math.round(num * 1000);
  }

  // M suffix
  if (/^[\d,.]+\s*m$/i.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? str : Math.round(num * 1000000);
  }

  // Normal pure number
  if (/^-?[\d,]+(\.\d+)?$/.test(str) && !/^\d{4}-\d{2}/.test(str)) {
    const cleanStr = str.replace(/,/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? str : parsed;
  }

  return str;
}

export function inferColumnType(header = '', sampleValues = []) {
  const h = String(header || '').toLowerCase().trim();

  if (h.includes('month') || h.includes('date') || h === 'mo' || h === 'period' || h.includes('day') || h.includes('year')) {
    return 'date';
  }
  if (h.includes('spend') || h.includes('cost') || h.includes('budget') || h.includes('price') || h.includes('amount') || h.includes('revenue') || h.includes('inr') || h.includes('cpl') || h.includes('cpc') || h.includes('cpm')) {
    return 'currency';
  }
  if (h.includes('rate') || h.includes('percent') || h.includes('%') || h.includes('ctr') || h.includes('roi') || h.includes('roas') || h.includes('bounce') || h.includes('delivery')) {
    return 'percent';
  }
  if (h.includes('time') || h.includes('duration') || h.includes('hours') || h.includes('hrs')) {
    return 'duration';
  }
  if (h.includes('new') || h.includes('gained') || h.includes('added') || h.includes('+')) {
    return 'plusMetric';
  }
  if (h.includes('total') || h.includes('cumulative') || h.includes('subscribers') || h.includes('followers') || h.includes('balance') || h.includes('contacts')) {
    return 'number';
  }

  const numericCount = sampleValues.filter(v => typeof v === 'number').length;
  if (sampleValues.length > 0 && numericCount / sampleValues.length > 0.6) {
    return 'metric';
  }

  return 'text';
}

export function slugifyTabName(name = '') {
  const clean = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || `tab_${Date.now()}`;
}

export function parseWorksheetData(worksheet, sheetName = 'Sheet1') {
  const tsv = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
  if (!tsv || !tsv.trim()) return null;

  const parsed = Papa.parse(tsv.trim(), { header: false, skipEmptyLines: true });
  const rawRows = parsed.data || [];
  if (rawRows.length === 0) return null;

  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(rawRows.length, 6); r++) {
    const row = rawRows[r];
    if (!row) continue;
    const nonEmptyCells = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonEmptyCells.length >= 2) {
      headerRowIdx = r;
      break;
    }
  }

  const rawHeaderRow = rawRows[headerRowIdx] || [];
  const columns = [];
  const colKeys = [];

  rawHeaderRow.forEach((cell, idx) => {
    const rawLabel = String(cell || '').trim();
    if (!rawLabel && idx === 0) {
      const key = 'period';
      colKeys.push(key);
      columns.push({
        key,
        label: 'Period / Month',
        type: 'date',
        align: 'left',
        highlight: false
      });
      return;
    }
    if (!rawLabel) return;

    let key = rawLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!key || colKeys.includes(key)) {
      key = `${key || 'col'}_${idx + 1}`;
    }

    colKeys.push(key);
    columns.push({
      key,
      label: rawLabel,
      type: 'text',
      align: 'right',
      highlight: false
    });
  });

  if (columns.length === 0) return null;

  const dataRowsRaw = rawRows.slice(headerRowIdx + 1);
  const rows = [];

  dataRowsRaw.forEach((rawRow, rIdx) => {
    const hasData = rawRow.some(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (!hasData) return;

    const rowObj = { _rowId: rIdx + 1 };
    let rowHasMeaningfulData = false;

    columns.forEach((col, cIdx) => {
      const rawCell = rawRow[cIdx];
      const cleaned = cleanValue(rawCell);
      rowObj[col.key] = cleaned;
      if (cleaned !== null && cleaned !== '') {
        rowHasMeaningfulData = true;
      }
    });

    if (rowHasMeaningfulData) {
      rows.push(rowObj);
    }
  });

  if (rows.length === 0) return null;

  columns.forEach((col, idx) => {
    const sampleValues = rows.map(r => r[col.key]).filter(v => v !== null && v !== undefined && v !== '');
    const inferredType = inferColumnType(col.label, sampleValues);
    col.type = inferredType;
    col.align = (inferredType === 'text' || inferredType === 'date' || idx === 0) ? 'left' : 'right';

    const lowerLabel = col.label.toLowerCase();
    if (
      lowerLabel.includes('reach') ||
      lowerLabel.includes('view') ||
      lowerLabel.includes('spend') ||
      lowerLabel.includes('conversion') ||
      lowerLabel.includes('impression') ||
      lowerLabel.includes('follower') ||
      lowerLabel.includes('lead')
    ) {
      col.highlight = true;
    }
  });

  const tabId = slugifyTabName(sheetName);

  return {
    id: tabId,
    name: sheetName.trim(),
    columns,
    rows,
    rowCount: rows.length
  };
}

/**
 * Client-side sync fallback
 */
export async function syncGoogleSheetUrl(sheetUrl) {
  const sheetId = extractSpreadsheetId(sheetUrl);
  if (!sheetId) {
    throw new Error('Invalid Google Sheet URL');
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  const response = await fetch(exportUrl);
  if (!response.ok) {
    throw new Error(`Google Sheet export returned status ${response.status}. Ensure link sharing is "Anyone with link can view".`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const sheetNames = workbook.SheetNames || [];

  const tabs = [];
  const sheetData = {};

  sheetNames.forEach(sName => {
    const worksheet = workbook.Sheets[sName];
    if (!worksheet) return;

    try {
      const parsedTab = parseWorksheetData(worksheet, sName);
      if (parsedTab && parsedTab.rows.length > 0) {
        tabs.push({
          id: parsedTab.id,
          name: parsedTab.name,
          columns: parsedTab.columns,
          rowCount: parsedTab.rowCount
        });
        sheetData[parsedTab.id] = parsedTab.rows;
      }
    } catch (e) {
      console.warn(`Error parsing tab ${sName}:`, e);
    }
  });

  return {
    tabs,
    sheetData,
    tabCount: tabs.length,
    totalRows: Object.values(sheetData).reduce((sum, r) => sum + r.length, 0)
  };
}
