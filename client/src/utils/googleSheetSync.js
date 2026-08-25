import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { parseAllHorizontalBlocks, parseUniversalVerticalTable, parsePastedExcelText } from './excelParser.js';

/**
 * Extracts Google Spreadsheet ID from various URL formats
 */
export function extractSpreadsheetId(url = '') {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Standard format: /spreadsheets/d/SPREADSHEET_ID/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];

  // If user pasted raw ID directly
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Fetch helper with fast backend proxy and quick timeout fallback
 */
async function fetchBinaryWithFallback(primaryUrl) {
  // 1. Try direct fetch with fast 3s timeout
  try {
    const res = await fetch(primaryUrl, { mode: 'cors', signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch (err) {
    // CORS or network error, proceed to fallback
  }

  // 2. Try fast corsproxy.io fallback (max 3s)
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(primaryUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch (err) {
    // Fallback failed, try next
  }

  // 3. Try allorigins.win fallback (max 3s)
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(primaryUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch (err) {
    // Fallback failed
  }

  throw new Error('Unable to fetch Google Sheet. Please ensure the sheet sharing is set to "Anyone with the link can view".');
}

/**
 * Fetch and parse a complete multi-tab Google Sheet using its public URL
 */
export async function syncGoogleSheetUrl(sheetUrl, targetCategories = []) {
  const sheetId = extractSpreadsheetId(sheetUrl);
  if (!sheetId) {
    throw new Error('Invalid Google Sheet URL. Please provide a valid URL like: https://docs.google.com/spreadsheets/d/.../edit');
  }

  // Google Sheets universal .xlsx export endpoint
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  const arrayBuffer = await fetchBinaryWithFallback(exportUrl);

  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const sheetNames = workbook.SheetNames;

  const result = {};

  // Standard predefined categories
  ['facebook', 'instagram', 'youtube', 'linkedin'].forEach(cat => {
    result[cat] = [];
  });

  // Also initialize any custom categories
  targetCategories.forEach(cat => {
    const key = cat.toLowerCase().replace(/\s+/g, '_');
    if (!result[key]) result[key] = [];
  });

  // Process every tab in the Google Sheet
  sheetNames.forEach(sName => {
    const lowerName = sName.toLowerCase().trim();
    const worksheet = workbook.Sheets[sName];
    if (!worksheet) return;

    // Convert sheet to TSV
    const tsv = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
    if (!tsv || !tsv.trim()) return;

    const parsed = Papa.parse(tsv.trim(), { header: false, skipEmptyLines: true });
    const rows = parsed.data || [];
    if (rows.length === 0) return;

    // Determine target category key from tab name or categories
    let matchedCategory = null;
    if (lowerName.includes('insta') || lowerName === 'ig') matchedCategory = 'instagram';
    else if (lowerName.includes('face') || lowerName === 'fb') matchedCategory = 'facebook';
    else if (lowerName.includes('you') || lowerName === 'yt') matchedCategory = 'youtube';
    else if (lowerName.includes('link') || lowerName === 'li') matchedCategory = 'linkedin';
    else if (lowerName.includes('whatsapp') || lowerName.includes('wa')) matchedCategory = 'whatsapp';
    else if (lowerName.includes('website') || lowerName.includes('audit') || lowerName.includes('web')) matchedCategory = 'website_audits';
    else {
      // Check if user defined a custom category matching this tab name
      for (const cat of targetCategories) {
        const catClean = cat.toLowerCase().trim();
        if (lowerName.includes(catClean) || catClean.includes(lowerName)) {
          matchedCategory = cat.toLowerCase().replace(/\s+/g, '_');
          break;
        }
      }
      if (!matchedCategory && !lowerName.startsWith('sheet') && lowerName !== 'data') {
        matchedCategory = lowerName.replace(/\s+/g, '_');
      }
    }

    // 1. Try horizontal block parsing
    const allBlocks = parseAllHorizontalBlocks(rows, matchedCategory || 'instagram');
    let foundHorizontal = false;

    Object.keys(allBlocks).forEach(plat => {
      if (allBlocks[plat] && allBlocks[plat].length > 0) {
        result[plat] = allBlocks[plat];
        foundHorizontal = true;
      }
    });

    // 2. Try universal vertical table parsing
    if (!foundHorizontal) {
      const verticalResult = parseUniversalVerticalTable(rows, matchedCategory);
      if (verticalResult && verticalResult.rows && verticalResult.rows.length > 0) {
        const targetKey = verticalResult.platform || matchedCategory || 'instagram';
        result[targetKey] = verticalResult.rows;
      } else {
        const pastedFallback = parsePastedExcelText(tsv, matchedCategory || 'instagram');
        if (pastedFallback && pastedFallback.length > 0) {
          result[matchedCategory || 'instagram'] = pastedFallback;
        }
      }
    }
  });

  return result;
}
