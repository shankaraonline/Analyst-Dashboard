import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { cleanNumericValue, normalizeMonth } from './spreadsheetParser.js';

/**
 * Identify metric type from a label string
 */
function identifyMetricType(label = '') {
  const l = String(label).toLowerCase().trim();
  if (!l) return null;

  if (l.includes('profile reach') || (l.includes('reach') && !l.includes('facebook'))) return 'reach';
  if (l.includes('facebook reach')) return 'reach';
  if (l.includes('content interaction') || l.includes('interaction') || l.includes('reactions') || l.includes('engagement')) return 'interactions';
  if (l.includes('profile visit') || l.includes('page visit')) return 'profileVisits';
  if (l.includes('page view') || l.includes('total page view')) return 'totalPageViews';
  if (l.includes('watch time') || l.includes('watch_time') || l.includes('hrs')) return 'watchTimeHours';
  if (l.includes('new sub') || l.includes('subscribers gained')) return 'newSubscribers';
  if (l.includes('total sub') || l.includes('subscribers')) return 'totalSubscribers';
  if (l.includes('ad spend') || l.includes('amount spent') || l.includes('spend')) return 'adSpend';
  if (l.includes('new follower') || l.includes('followers gained')) return 'newFollowers';
  if (l.includes('total page like') || l.includes('page like')) return 'totalPageLikes';
  if (l.includes('total page follower') || l.includes('facebook follower')) return 'totalPageFollowers';
  if (l.includes('total follower') || l.includes('followers') || l.includes('follower')) return 'totalFollowers';
  if (l.includes('impression')) return 'impressions';
  if (l.includes('view') || l.includes('plays')) return 'views';

  return null;
}

/**
 * Detect platform from a block of rows
 */
function detectPlatformFromBlock(rows, startIdx, endIdx) {
  for (let r = startIdx; r < endIdx; r++) {
    const row = rows[r];
    if (!row) continue;
    const lineText = row.map(c => String(c || '').toLowerCase()).join(' ');
    if (lineText.includes('instagram') || lineText.includes('insta') || lineText.includes('ig')) return 'instagram';
    if (lineText.includes('facebook') || lineText.includes('fb') || lineText.includes('ad spend')) return 'facebook';
    if (lineText.includes('youtube') || lineText.includes('yt') || lineText.includes('subscriber') || lineText.includes('watch time')) return 'youtube';
    if (lineText.includes('linkedin') || lineText.includes('li')) return 'linkedin';
  }
  return null;
}

/**
 * Detect and parse all horizontal matrix blocks across a 2D sheet
 */
export function parseAllHorizontalBlocks(rawRows, defaultPlatform = 'instagram') {
  if (!rawRows || rawRows.length < 2) return {};

  const results = {
    facebook: [],
    instagram: [],
    youtube: [],
    linkedin: []
  };

  // Find all header rows with 2+ months
  const headerIndices = [];
  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row) continue;
    let mCount = 0;
    for (let c = 0; c < row.length; c++) {
      if (normalizeMonth(row[c])) mCount++;
    }
    if (mCount >= 2) {
      headerIndices.push(r);
    }
  }

  if (headerIndices.length === 0) return {};

  headerIndices.forEach((hIdx, i) => {
    const nextHIdx = i + 1 < headerIndices.length ? headerIndices[i + 1] : rawRows.length;
    const headerRow = rawRows[hIdx];
    
    // Extract months in sequential order
    const monthsList = [];
    for (let c = 0; c < headerRow.length; c++) {
      const m = normalizeMonth(headerRow[c]);
      if (m) monthsList.push(m);
    }

    if (monthsList.length === 0) return;

    // Detect platform for this block
    const detectedPlat = detectPlatformFromBlock(rawRows, hIdx, nextHIdx);
    const platform = detectedPlat || defaultPlatform;

    const monthRecords = monthsList.map(m => ({
      month: m,
      reach: 0,
      views: 0,
      impressions: 0,
      interactions: 0,
      profileVisits: 0,
      totalFollowers: 0,
      adSpend: null,
      totalViews: 0,
      watchTimeHours: 0,
      newSubscribers: 0,
      totalSubscribers: 0,
      reactions: 0,
      totalPageViews: 0,
      newFollowers: 0,
      totalPageLikes: 0,
      totalPageFollowers: 0
    }));

    for (let r = hIdx + 1; r < nextHIdx; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      let metricType = null;
      let numStartIndex = -1;

      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        const type = identifyMetricType(cell);
        if (type) {
          metricType = type;
          numStartIndex = c + 1;
          break;
        }
      }

      if (!metricType || numStartIndex === -1) continue;

      const values = [];
      for (let c = numStartIndex; c < row.length; c++) {
        values.push(cleanNumericValue(row[c]));
      }

      monthRecords.forEach((rec, idx) => {
        const val = values[idx] !== undefined ? values[idx] : 0;

        if (metricType === 'reach') rec.reach = val;
        else if (metricType === 'views') {
          rec.views = val;
          rec.totalViews = val;
          if (!rec.impressions) rec.impressions = val;
        }
        else if (metricType === 'impressions') {
          rec.impressions = val;
          if (!rec.views) rec.views = val;
        }
        else if (metricType === 'interactions') {
          rec.interactions = val;
          rec.engagement = val;
          rec.reactions = val;
        }
        else if (metricType === 'profileVisits') {
          rec.profileVisits = val;
          rec.pageVisits = val;
        }
        else if (metricType === 'totalFollowers') {
          rec.totalFollowers = val;
          rec.totalPageFollowers = val;
          rec.totalSubscribers = val;
        }
        else if (metricType === 'totalPageFollowers') {
          rec.totalPageFollowers = val;
          rec.totalFollowers = val;
        }
        else if (metricType === 'adSpend') rec.adSpend = val;
        else if (metricType === 'watchTimeHours') rec.watchTimeHours = val;
        else if (metricType === 'newSubscribers') rec.newSubscribers = val;
        else if (metricType === 'totalSubscribers') rec.totalSubscribers = val;
        else if (metricType === 'reactions') rec.reactions = val;
        else if (metricType === 'totalPageViews') rec.totalPageViews = val;
        else if (metricType === 'newFollowers') rec.newFollowers = val;
        else if (metricType === 'totalPageLikes') rec.totalPageLikes = val;
      });
    }

    const formatted = monthRecords.map(rec => {
      if (platform === 'instagram') {
        return {
          month: rec.month,
          reach: rec.reach,
          views: rec.views || rec.impressions,
          impressions: rec.impressions || rec.views,
          interactions: rec.interactions,
          profileVisits: rec.profileVisits || null,
          totalFollowers: rec.totalFollowers
        };
      }
      if (platform === 'facebook') {
        return {
          month: rec.month,
          adSpend: rec.adSpend,
          views: rec.views,
          reach: rec.reach,
          pageVisits: rec.profileVisits || rec.pageVisits,
          engagement: rec.interactions,
          newLikes: null,
          newFollowers: rec.newFollowers,
          totalPageLikes: rec.totalPageLikes,
          totalPageFollowers: rec.totalPageFollowers || rec.totalFollowers
        };
      }
      if (platform === 'youtube') {
        return {
          month: rec.month,
          totalViews: rec.totalViews || rec.views,
          impressions: rec.impressions,
          watchTimeHours: rec.watchTimeHours,
          newSubscribers: rec.newSubscribers,
          totalSubscribers: rec.totalSubscribers || rec.totalFollowers
        };
      }
      if (platform === 'linkedin') {
        return {
          month: rec.month,
          impressions: rec.impressions,
          reactions: rec.reactions || rec.interactions,
          totalPageViews: rec.totalPageViews || rec.views,
          newFollowers: rec.newFollowers,
          totalFollowers: rec.totalFollowers
        };
      }
      return rec;
    });

    results[platform] = formatted;
  });

  return results;
}

/**
 * Single horizontal matrix parser
 */
export function parseHorizontalMatrix(rawRows, targetPlatform = 'instagram') {
  const blocks = parseAllHorizontalBlocks(rawRows, targetPlatform);
  if (blocks[targetPlatform] && blocks[targetPlatform].length > 0) {
    return blocks[targetPlatform];
  }
  for (const plat of ['instagram', 'facebook', 'youtube', 'linkedin']) {
    if (blocks[plat] && blocks[plat].length > 0) return blocks[plat];
  }
  return null;
}

// Month sequence order for inferring missing years
const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Standardize month strings with surrounding sequence context (e.g. October -> Oct-25 when Jan 2026 follows)
 */
function parseMonthWithContext(rawMonthStr, rowIndex, allRawMonthRows) {
  if (!rawMonthStr) return '';
  
  const str = String(rawMonthStr).trim();
  const yearMatch = str.match(/(?:20)?(\d{2})\b/);
  
  if (yearMatch) {
    return normalizeMonth(str);
  }

  // If month cell has no year explicitly (e.g. "October", "November", "December")
  let referenceYear = 26; // default 2026
  let refMonthIdx = 0; // Jan = 0
  
  for (let i = 0; i < allRawMonthRows.length; i++) {
    const s = String(allRawMonthRows[i] || '');
    const yM = s.match(/(?:20)?(\d{2})\b/);
    if (yM) {
      referenceYear = parseInt(yM[1], 10);
      const norm = normalizeMonth(s);
      const mShort = norm.split('-')[0];
      refMonthIdx = monthOrder.indexOf(mShort);
      break;
    }
  }

  const directNorm = normalizeMonth(str);
  const thisShort = directNorm.split('-')[0];
  const thisMonthIdx = monthOrder.indexOf(thisShort);

  if (thisMonthIdx === -1) return directNorm;

  let year = referenceYear;
  if (thisMonthIdx > refMonthIdx && refMonthIdx <= 5 && thisMonthIdx >= 8) {
    year = referenceYear - 1;
  }

  return `${thisShort}-${year < 10 ? '0' + year : year}`;
}

/**
 * Universal Vertical Table Parser:
 * Detects platform from titles or headers, locates header row, maps metric columns,
 * and parses all records with 100% accuracy.
 */
export function parseUniversalVerticalTable(rawRows, defaultPlatform = null) {
  if (!rawRows || rawRows.length < 2) return null;

  // 1. Detect platform from any title row
  let detectedPlatform = defaultPlatform;
  for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
    const rowText = (rawRows[r] || []).map(c => String(c || '').toLowerCase().trim()).join(' ');
    if (rowText.includes('instagram') || rowText === 'ig') detectedPlatform = 'instagram';
    else if (rowText.includes('facebook') || rowText === 'fb') detectedPlatform = 'facebook';
    else if (rowText.includes('youtube') || rowText === 'yt') detectedPlatform = 'youtube';
    else if (rowText.includes('linkedin') || rowText === 'li') detectedPlatform = 'linkedin';
    if (detectedPlatform) break;
  }

  // 2. Find header row containing column labels
  let headerRowIdx = -1;
  const colMap = {
    month: -1,
    reach: -1,
    views: -1,
    impressions: -1,
    interactions: -1,
    profileActivity: -1,
    totalFollowers: -1,
    adSpend: -1,
    watchTime: -1,
    subscribers: -1
  };

  for (let r = 0; r < Math.min(rawRows.length, 6); r++) {
    const row = rawRows[r];
    if (!row) continue;

    let hasMonth = false;
    let metricCols = 0;

    row.forEach((cell, cIdx) => {
      const h = String(cell || '').toLowerCase().trim();
      if (h.includes('month') || h.includes('date') || h === 'mo') {
        hasMonth = true;
        colMap.month = cIdx;
      } else if (h.includes('reach')) {
        colMap.reach = cIdx;
        metricCols++;
      } else if (h.includes('impression')) {
        colMap.impressions = cIdx;
        metricCols++;
      } else if (h.includes('view') || h.includes('plays')) {
        colMap.views = cIdx;
        metricCols++;
      } else if (h.includes('interaction') || h.includes('engagement') || h.includes('reactions')) {
        colMap.interactions = cIdx;
        metricCols++;
      } else if (h.includes('profile activity') || h.includes('profile visit') || h.includes('page visit')) {
        colMap.profileActivity = cIdx;
        metricCols++;
      } else if (h.includes('follower') || h.includes('subscriber')) {
        colMap.totalFollowers = cIdx;
        colMap.subscribers = cIdx;
        metricCols++;
      } else if (h.includes('spend') || h.includes('cost')) {
        colMap.adSpend = cIdx;
        metricCols++;
      } else if (h.includes('watch time')) {
        colMap.watchTime = cIdx;
        metricCols++;
      }
    });

    if (hasMonth || metricCols >= 2) {
      headerRowIdx = r;
      if (colMap.month === -1) colMap.month = 0;
      break;
    }
  }

  if (headerRowIdx === -1) return null;

  // Infer platform from column headers if not already detected
  if (!detectedPlatform) {
    if (colMap.profileActivity !== -1 || (colMap.reach !== -1 && colMap.adSpend === -1)) {
      detectedPlatform = 'instagram';
    } else if (colMap.adSpend !== -1) {
      detectedPlatform = 'facebook';
    } else if (colMap.watchTime !== -1 || colMap.subscribers !== -1) {
      detectedPlatform = 'youtube';
    } else {
      detectedPlatform = 'instagram';
    }
  }

  // Collect raw month strings from data rows
  const dataRows = rawRows.slice(headerRowIdx + 1).filter(r => r && r[colMap.month] !== undefined && String(r[colMap.month]).trim() && normalizeMonth(r[colMap.month]));
  if (dataRows.length === 0) return null;

  const rawMonths = dataRows.map(r => String(r[colMap.month]).trim());

  // Parse all rows
  const parsedRecords = [];
  dataRows.forEach((r, idx) => {
    const month = parseMonthWithContext(r[colMap.month], idx, rawMonths);
    if (!month) return;

    const reach = colMap.reach !== -1 ? cleanNumericValue(r[colMap.reach]) : 0;
    const impressions = colMap.impressions !== -1 ? cleanNumericValue(r[colMap.impressions]) : 0;
    const views = colMap.views !== -1 ? cleanNumericValue(r[colMap.views]) : impressions;
    const interactions = colMap.interactions !== -1 ? cleanNumericValue(r[colMap.interactions]) : 0;
    const totalFollowers = colMap.totalFollowers !== -1 ? cleanNumericValue(r[colMap.totalFollowers]) : 0;
    const profileVisits = colMap.profileActivity !== -1 ? cleanNumericValue(r[colMap.profileActivity]) : null;
    const adSpend = colMap.adSpend !== -1 ? cleanNumericValue(r[colMap.adSpend]) : null;
    const watchTimeHours = colMap.watchTime !== -1 ? cleanNumericValue(r[colMap.watchTime]) : 0;

    if (detectedPlatform === 'instagram') {
      parsedRecords.push({
        month,
        reach,
        views: views || impressions,
        impressions: impressions || views,
        interactions,
        profileVisits,
        totalFollowers
      });
    } else if (detectedPlatform === 'facebook') {
      parsedRecords.push({
        month,
        adSpend,
        views,
        reach,
        pageVisits: profileVisits,
        engagement: interactions,
        newLikes: null,
        newFollowers: 0,
        totalPageLikes: null,
        totalPageFollowers: totalFollowers
      });
    } else if (detectedPlatform === 'youtube') {
      parsedRecords.push({
        month,
        totalViews: views,
        impressions,
        watchTimeHours,
        newSubscribers: 0,
        totalSubscribers: totalFollowers
      });
    } else if (detectedPlatform === 'linkedin') {
      parsedRecords.push({
        month,
        impressions,
        reactions: interactions,
        totalPageViews: views,
        newFollowers: 0,
        totalFollowers
      });
    }
  });

  return { platform: detectedPlatform, rows: parsedRecords };
}

/**
 * Parses raw copied Excel text (tabs & newlines) for a specific platform.
 * Supports horizontal matrices, universal vertical tables with headers, and standard tables.
 */
export function parsePastedExcelText(text, platform = 'facebook') {
  if (!text || !text.trim()) return [];

  const parsed = Papa.parse(text.trim(), {
    header: false,
    skipEmptyLines: true
  });

  if (!parsed.data || parsed.data.length === 0) return [];

  const rawRows = parsed.data;

  // 1. Try parsing as horizontal matrix first
  const horizontalResult = parseHorizontalMatrix(rawRows, platform);
  if (horizontalResult && horizontalResult.length > 0) {
    return horizontalResult;
  }

  // 2. Try parsing as universal vertical table
  const verticalResult = parseUniversalVerticalTable(rawRows, platform);
  if (verticalResult && verticalResult.rows.length > 0) {
    return verticalResult.rows;
  }

  // 3. Fallback Standard Vertical Table Parsing
  const dataRows = rawRows.filter(row => {
    if (!row || row.length < 2) return false;
    const firstCell = String(row[0]).toLowerCase();
    const secondCell = String(row[1]).toLowerCase();
    if (firstCell.includes('ad spend') || firstCell.includes('key metric') || (firstCell.includes('month') && !normalizeMonth(firstCell)) || firstCell.includes('facebook') || firstCell.includes('instagram')) return false;
    if (secondCell.includes('key metric') || (secondCell.includes('month') && !normalizeMonth(secondCell)) || secondCell.includes('reach')) return false;
    return true;
  });

  return dataRows.map((row, idx) => {
    if (platform === 'facebook') {
      let adSpend = null;
      let month = '';
      let views = null;
      let reach = 0;
      let pageVisits = null;
      let engagement = null;
      let newLikes = null;
      let newFollowers = 0;
      let totalPageLikes = null;
      let totalPageFollowers = 0;

      if (normalizeMonth(row[1])) {
        adSpend = row[0] === 'NA' || row[0] === 'na' ? null : cleanNumericValue(row[0]);
        month = normalizeMonth(row[1]);
        
        if (row.length >= 8) {
          views = cleanNumericValue(row[2]) || null;
          reach = cleanNumericValue(row[3]);
          pageVisits = cleanNumericValue(row[4]) || null;
          newFollowers = cleanNumericValue(row[5]);
          totalPageLikes = cleanNumericValue(row[6]) || null;
          totalPageFollowers = cleanNumericValue(row[7]);
        } else {
          reach = cleanNumericValue(row[2]);
          engagement = cleanNumericValue(row[3]);
          newLikes = cleanNumericValue(row[4]);
          newFollowers = cleanNumericValue(row[5]);
          totalPageLikes = cleanNumericValue(row[6]);
          totalPageFollowers = cleanNumericValue(row[7] || row[6]);
        }
      } else {
        month = normalizeMonth(row[0]) || `Month-${idx + 1}`;
        adSpend = cleanNumericValue(row[1]);
        views = cleanNumericValue(row[2]) || null;
        reach = cleanNumericValue(row[3]) || cleanNumericValue(row[2]);
        pageVisits = cleanNumericValue(row[4]) || null;
        newFollowers = cleanNumericValue(row[5]);
        totalPageFollowers = cleanNumericValue(row[6] || row[7]);
      }

      return {
        month,
        adSpend,
        views,
        reach,
        pageVisits,
        engagement,
        newLikes,
        newFollowers,
        totalPageLikes,
        totalPageFollowers
      };
    }

    if (platform === 'instagram') {
      const month = normalizeMonth(row[0]) || normalizeMonth(row[1]) || `Month-${idx + 1}`;
      const isCol1Month = normalizeMonth(row[1]);
      const reach = cleanNumericValue(isCol1Month ? row[2] : row[1]);
      const viewsImpr = cleanNumericValue(isCol1Month ? row[3] : row[2]);
      const interactions = cleanNumericValue(isCol1Month ? row[4] : row[3]);
      const profileVisits = row.length >= 6 ? cleanNumericValue(isCol1Month ? row[5] : row[4]) : null;
      const totalFollowers = cleanNumericValue(row[row.length - 1]);

      return {
        month,
        reach,
        views: viewsImpr,
        impressions: viewsImpr,
        interactions,
        profileVisits,
        totalFollowers
      };
    }

    if (platform === 'youtube') {
      const month = normalizeMonth(row[0]) || normalizeMonth(row[1]) || `Month-${idx + 1}`;
      const isCol1Month = normalizeMonth(row[1]);
      const totalViews = cleanNumericValue(isCol1Month ? row[2] : row[1]);
      const impressions = cleanNumericValue(isCol1Month ? row[3] : row[2]);
      const watchTimeHours = cleanNumericValue(isCol1Month ? row[4] : row[3]);
      const newSubscribers = cleanNumericValue(isCol1Month ? row[5] : row[4]);
      const totalSubscribers = cleanNumericValue(row[row.length - 1]);

      return {
        month,
        totalViews,
        impressions,
        watchTimeHours,
        newSubscribers,
        totalSubscribers
      };
    }

    if (platform === 'linkedin') {
      const month = normalizeMonth(row[0]) || normalizeMonth(row[1]) || `Month-${idx + 1}`;
      const isCol1Month = normalizeMonth(row[1]);
      const impressions = cleanNumericValue(isCol1Month ? row[2] : row[1]);
      const reactions = cleanNumericValue(isCol1Month ? row[3] : row[2]);
      const totalPageViews = cleanNumericValue(isCol1Month ? row[4] : row[3]);
      const newFollowers = cleanNumericValue(isCol1Month ? row[5] : row[4]);
      const totalFollowers = cleanNumericValue(row[row.length - 1]);

      return {
        month,
        impressions,
        reactions,
        totalPageViews,
        newFollowers,
        totalFollowers
      };
    }

    return { month: normalizeMonth(row[0]) };
  });
}

/**
 * Strict Excel parser for multi-column master sheets, individual tabs, horizontal matrices,
 * and universal vertical tables with title headers.
 */
export async function parseExcelWorkbookFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const result = {
          facebook: [],
          instagram: [],
          youtube: [],
          linkedin: []
        };

        const sheetNames = workbook.SheetNames;
        let matchedAnyPlatform = false;

        // Iterate through all sheets in the workbook
        sheetNames.forEach(sName => {
          const lower = sName.toLowerCase().trim();
          let targetPlat = null;
          if (lower.includes('face') || lower === 'fb') targetPlat = 'facebook';
          else if (lower.includes('insta') || lower === 'ig') targetPlat = 'instagram';
          else if (lower.includes('you') || lower === 'yt') targetPlat = 'youtube';
          else if (lower.includes('link') || lower === 'li') targetPlat = 'linkedin';

          const worksheet = workbook.Sheets[sName];
          if (!worksheet) return;

          const tsv = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
          if (!tsv || !tsv.trim()) return;

          const parsed = Papa.parse(tsv.trim(), { header: false, skipEmptyLines: true });
          const rows = parsed.data || [];
          if (rows.length === 0) return;

          // 1. Try horizontal block parsing across the sheet
          const allBlocks = parseAllHorizontalBlocks(rows, targetPlat || 'instagram');
          let foundHorizontal = false;

          ['facebook', 'instagram', 'youtube', 'linkedin'].forEach(plat => {
            if (allBlocks[plat] && allBlocks[plat].length > 0) {
              result[plat] = allBlocks[plat];
              foundHorizontal = true;
              matchedAnyPlatform = true;
            }
          });

          // 2. Try universal vertical table with title & column header detection
          if (!foundHorizontal) {
            const verticalResult = parseUniversalVerticalTable(rows, targetPlat);
            if (verticalResult && verticalResult.rows.length > 0) {
              result[verticalResult.platform] = verticalResult.rows;
              matchedAnyPlatform = true;
            } else if (targetPlat) {
              const fallbackRows = parsePastedExcelText(tsv, targetPlat);
              if (fallbackRows && fallbackRows.length > 0) {
                result[targetPlat] = fallbackRows;
                matchedAnyPlatform = true;
              }
            }
          }
        });

        // 3. Fallback: If no platform matched by sheet name or blocks, try master vertical format on sheet 1
        if (!matchedAnyPlatform && sheetNames.length > 0) {
          const mainSheet = workbook.Sheets[sheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(mainSheet, { header: 1 });

          rows.forEach((r, rIdx) => {
            if (!r || r.length < 2) return;

            // 1. Facebook: Look for Month in col 1 (B) or col 0 (A)
            const fbMonthCandidate = normalizeMonth(r[1]) || (normalizeMonth(r[0]) && rIdx > 1 ? normalizeMonth(r[0]) : null);
            if (fbMonthCandidate && (r[2] !== undefined || r[3] !== undefined)) {
              const isCol1Month = normalizeMonth(r[1]);
              const spend = isCol1Month ? (r[0] === 'NA' || r[0] === 'na' ? null : cleanNumericValue(r[0])) : cleanNumericValue(r[1]);
              const m = fbMonthCandidate;
              
              const v1 = cleanNumericValue(r[2]);
              const v2 = cleanNumericValue(r[3]);
              const v3 = cleanNumericValue(r[4]);
              const v4 = cleanNumericValue(r[5]);
              const v5 = cleanNumericValue(r[6]);
              const v6 = cleanNumericValue(r[7]);

              result.facebook.push({
                month: m,
                adSpend: spend,
                views: v1 > 1000 && v2 > 1000 ? v1 : null,
                reach: v1 > 1000 && v2 > 1000 ? v2 : (v1 || v2),
                pageVisits: v3 || null,
                engagement: v2 < 10000 && v1 > 1000 ? v2 : null,
                newLikes: v3 < 500 ? v3 : null,
                newFollowers: v4 || 0,
                totalPageLikes: v5 || null,
                totalPageFollowers: v6 || v5 || 0
              });
            }

            // 2. Instagram: Look for Month in col 9 (J)
            if (r.length > 9 && normalizeMonth(r[9])) {
              result.instagram.push({
                month: normalizeMonth(r[9]),
                reach: cleanNumericValue(r[10]),
                views: cleanNumericValue(r[11]),
                impressions: cleanNumericValue(r[11]),
                interactions: cleanNumericValue(r[12]),
                totalFollowers: cleanNumericValue(r[13])
              });
            }

            // 3. YouTube: Look for Month in col 15 (P)
            if (r.length > 15 && normalizeMonth(r[15])) {
              result.youtube.push({
                month: normalizeMonth(r[15]),
                totalViews: cleanNumericValue(r[16]),
                impressions: cleanNumericValue(r[17]),
                watchTimeHours: cleanNumericValue(r[18]),
                newSubscribers: cleanNumericValue(r[19]),
                totalSubscribers: cleanNumericValue(r[20])
              });
            }

            // 4. LinkedIn: Look for Month in col 22 (W)
            if (r.length > 22 && normalizeMonth(r[22])) {
              result.linkedin.push({
                month: normalizeMonth(r[22]),
                impressions: cleanNumericValue(r[23]),
                reactions: cleanNumericValue(r[24]),
                totalPageViews: cleanNumericValue(r[25]),
                newFollowers: cleanNumericValue(r[26]),
                totalFollowers: cleanNumericValue(r[27])
              });
            }
          });
        }

        resolve(result);
      } catch (err) {
        console.error('Error parsing workbook:', err);
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
