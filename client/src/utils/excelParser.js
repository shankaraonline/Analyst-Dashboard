import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { cleanNumericValue, normalizeMonth } from './spreadsheetParser.js';

/**
 * Identify metric type from a label string with comprehensive synonyms
 */
export function identifyMetricType(label = '') {
  const l = String(label).toLowerCase().trim();
  if (!l) return null;

  // Ad Spend / Paid Ads
  if (l.includes('ad spend') || l.includes('amount spent') || l.includes('meta spend') || l.includes('spend') || l.includes('budget') || l.includes('cost') || l.includes('inr') || l.includes('spent')) {
    return 'adSpend';
  }

  // Reach
  if (l.includes('reach') || l.includes('accounts reached') || l.includes('people reached')) {
    return 'reach';
  }

  // Views / Video Plays / Reels
  if (l.includes('video view') || l.includes('total view') || l.includes('plays') || l.includes('total views') || (l.includes('views') && !l.includes('page view'))) {
    return 'views';
  }

  // Impressions
  if (l.includes('impression') || l.includes('impr')) {
    return 'impressions';
  }

  // Interactions / Engagement / Reactions
  if (l.includes('interaction') || l.includes('engagement') || l.includes('reactions') || l.includes('actions') || l.includes('engagements')) {
    return 'interactions';
  }

  // Profile Visits / Page Visits
  if (l.includes('profile visit') || l.includes('page visit') || l.includes('profile activity') || l.includes('profile views')) {
    return 'profileVisits';
  }

  // Page Views (Web or Page)
  if (l.includes('page view') || l.includes('total page view') || l.includes('site views') || l.includes('screen views')) {
    return 'totalPageViews';
  }

  // Watch Time (YouTube)
  if (l.includes('watch time') || l.includes('watch_time') || l.includes('watch hours') || l.includes('hrs') || l.includes('hours watched')) {
    return 'watchTimeHours';
  }

  // New Subscribers (YouTube)
  if (l.includes('new sub') || l.includes('subscribers gained') || l.includes('net sub') || l.includes('subs gained')) {
    return 'newSubscribers';
  }

  // Total Subscribers (YouTube)
  if (l.includes('total sub') || l.includes('subscriber count') || (l.includes('subscribers') && !l.includes('new'))) {
    return 'totalSubscribers';
  }

  // New Followers (Instagram, FB, LinkedIn)
  if (l.includes('new follower') || l.includes('followers gained') || l.includes('net follower') || l.includes('follower growth') || l.includes('new fans')) {
    return 'newFollowers';
  }

  // New Likes (Facebook)
  if (l.includes('new like') || l.includes('page likes gained') || l.includes('likes gained') || l.includes('net likes')) {
    return 'newLikes';
  }

  // Total Page Likes (Facebook)
  if (l.includes('total page like') || l.includes('page like') || l.includes('lifetime likes') || l.includes('total likes')) {
    return 'totalPageLikes';
  }

  // Total Page Followers (Facebook)
  if (l.includes('total page follower') || l.includes('page follower') || l.includes('facebook follower') || l.includes('fb follower')) {
    return 'totalPageFollowers';
  }

  // Total Followers (General)
  if (l.includes('total follower') || l.includes('followers') || l.includes('follower count') || l.includes('audience')) {
    return 'totalFollowers';
  }

  // WhatsApp & Messaging Metrics
  if (l.includes('read rate') || l.includes('delivery rate') || l.includes('open rate')) {
    return 'readRate';
  }
  if (l.includes('reply') || l.includes('replies') || l.includes('responses') || l.includes('incoming message')) {
    return 'replies';
  }
  if (l.includes('conversion') || l.includes('clicks') || l.includes('link click') || l.includes('ctr') || l.includes('leads')) {
    return 'conversions';
  }

  // Website Audits & Traffic
  if (l.includes('organic') || l.includes('seo') || l.includes('search traffic')) {
    return 'organicTraffic';
  }
  if (l.includes('bounce') || l.includes('exit rate')) {
    return 'bounceRate';
  }
  if (l.includes('duration') || l.includes('session time') || l.includes('time on site') || l.includes('avg time')) {
    return 'avgDuration';
  }
  if (l.includes('session') || l.includes('visits') || l.includes('traffic')) {
    return 'sessions';
  }

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
    if (lineText.includes('facebook') || lineText.includes('fb') || lineText.includes('ad spend') || lineText.includes('page like')) return 'facebook';
    if (lineText.includes('youtube') || lineText.includes('yt') || lineText.includes('subscriber') || lineText.includes('watch time')) return 'youtube';
    if (lineText.includes('linkedin') || lineText.includes('li')) return 'linkedin';
    if (lineText.includes('whatsapp') || lineText.includes('wa')) return 'whatsapp';
    if (lineText.includes('website') || lineText.includes('audit') || lineText.includes('traffic')) return 'website_audits';
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
    linkedin: [],
    whatsapp: [],
    website_audits: []
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
    const monthColIndices = [];
    for (let c = 0; c < headerRow.length; c++) {
      const m = normalizeMonth(headerRow[c]);
      if (m) {
        monthsList.push(m);
        monthColIndices.push(c);
      }
    }

    if (monthsList.length === 0) return;

    // Detect platform for this block
    const detectedPlat = detectPlatformFromBlock(rawRows, hIdx, nextHIdx);
    const platform = detectedPlat || defaultPlatform;

    const monthRecords = monthsList.map(m => ({
      month: m,
      reach: null,
      views: null,
      impressions: null,
      interactions: null,
      profileVisits: null,
      pageVisits: null,
      totalFollowers: null,
      adSpend: null,
      totalViews: null,
      watchTimeHours: null,
      newSubscribers: null,
      totalSubscribers: null,
      reactions: null,
      totalPageViews: null,
      newFollowers: null,
      newLikes: null,
      totalPageLikes: null,
      totalPageFollowers: null,
      readRate: null,
      replies: null,
      conversions: null,
      organicTraffic: null,
      bounceRate: null,
      avgDuration: null,
      sessions: null
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

      if (!metricType) continue;

      monthRecords.forEach((rec, idx) => {
        const targetCol = monthColIndices[idx] !== undefined ? monthColIndices[idx] : (numStartIndex + idx);
        const cellVal = row[targetCol];
        const val = cellVal !== undefined && cellVal !== null && cellVal !== '' ? cleanNumericValue(cellVal) : null;

        if (val !== null) {
          if (metricType === 'reach') rec.reach = val;
          else if (metricType === 'views') {
            rec.views = val;
            rec.totalViews = val;
          }
          else if (metricType === 'impressions') {
            rec.impressions = val;
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
          else if (metricType === 'newLikes') rec.newLikes = val;
          else if (metricType === 'totalPageLikes') rec.totalPageLikes = val;
          else if (metricType === 'readRate') rec.readRate = val;
          else if (metricType === 'replies') rec.replies = val;
          else if (metricType === 'conversions') rec.conversions = val;
          else if (metricType === 'organicTraffic') rec.organicTraffic = val;
          else if (metricType === 'bounceRate') rec.bounceRate = val;
          else if (metricType === 'avgDuration') rec.avgDuration = val;
          else if (metricType === 'sessions') rec.sessions = val;
        }
      });
    }

    const formatted = monthRecords.map(rec => {
      if (platform === 'instagram') {
        return {
          month: rec.month,
          reach: rec.reach,
          views: rec.views !== null ? rec.views : rec.impressions,
          impressions: rec.impressions !== null ? rec.impressions : rec.views,
          interactions: rec.interactions,
          profileVisits: rec.profileVisits,
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
          newLikes: rec.newLikes,
          newFollowers: rec.newFollowers,
          totalPageLikes: rec.totalPageLikes,
          totalPageFollowers: rec.totalPageFollowers || rec.totalFollowers
        };
      }
      if (platform === 'youtube') {
        return {
          month: rec.month,
          totalViews: rec.totalViews !== null ? rec.totalViews : rec.views,
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
          reactions: rec.reactions !== null ? rec.reactions : rec.interactions,
          totalPageViews: rec.totalPageViews !== null ? rec.totalPageViews : rec.views,
          newFollowers: rec.newFollowers,
          totalFollowers: rec.totalFollowers
        };
      }
      if (platform === 'whatsapp') {
        return {
          month: rec.month,
          reach: rec.reach || rec.views || rec.impressions,
          readRate: rec.readRate,
          replies: rec.replies || rec.interactions,
          interactions: rec.interactions || rec.replies,
          conversions: rec.conversions || rec.profileVisits,
          totalFollowers: rec.totalFollowers
        };
      }
      if (platform === 'website_audits') {
        return {
          month: rec.month,
          reach: rec.sessions || rec.reach || rec.views,
          totalPageViews: rec.totalPageViews || rec.impressions || rec.views,
          impressions: rec.impressions || rec.totalPageViews,
          organicTraffic: rec.organicTraffic || rec.interactions,
          bounceRate: rec.bounceRate,
          avgDuration: rec.avgDuration
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
  for (const plat of ['instagram', 'facebook', 'youtube', 'linkedin', 'whatsapp', 'website_audits']) {
    if (blocks[plat] && blocks[plat].length > 0) return blocks[plat];
  }
  return null;
}

// Month sequence order for inferring missing years
const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Standardize month strings with surrounding sequence context
 */
function parseMonthWithContext(rawMonthStr, rowIndex, allRawMonthRows) {
  if (!rawMonthStr) return '';
  
  const str = String(rawMonthStr).trim();
  const yearMatch = str.match(/(?:20)?(\d{2})\b/);
  
  if (yearMatch) {
    return normalizeMonth(str);
  }

  // If month cell has no year explicitly
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
 * Detects platform, dynamically maps EVERY column header, and reads all rows with 100% precision.
 */
export function parseUniversalVerticalTable(rawRows, defaultPlatform = null) {
  if (!rawRows || rawRows.length < 2) return null;

  // 1. Detect platform from any title row
  let detectedPlatform = null;
  for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
    const rowText = (rawRows[r] || []).map(c => String(c || '').toLowerCase().trim()).join(' ');
    if (rowText.includes('instagram') || rowText === 'ig') { detectedPlatform = 'instagram'; break; }
    else if (rowText.includes('facebook') || rowText === 'fb') { detectedPlatform = 'facebook'; break; }
    else if (rowText.includes('youtube') || rowText === 'yt') { detectedPlatform = 'youtube'; break; }
    else if (rowText.includes('linkedin') || rowText === 'li') { detectedPlatform = 'linkedin'; break; }
    else if (rowText.includes('whatsapp') || rowText === 'wa') { detectedPlatform = 'whatsapp'; break; }
    else if (rowText.includes('website') || rowText.includes('audit')) { detectedPlatform = 'website_audits'; break; }
  }

  if (!detectedPlatform && defaultPlatform && !defaultPlatform.startsWith('sheet') && defaultPlatform !== 'data') {
    detectedPlatform = defaultPlatform;
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
    newFollowers: -1,
    adSpend: -1,
    watchTime: -1,
    subscribers: -1,
    newSubscribers: -1,
    totalPageLikes: -1,
    newLikes: -1,
    totalPageFollowers: -1,
    readRate: -1,
    replies: -1,
    conversions: -1,
    organicTraffic: -1,
    bounceRate: -1,
    avgDuration: -1,
    sessions: -1
  };

  for (let r = 0; r < Math.min(rawRows.length, 6); r++) {
    const row = rawRows[r];
    if (!row) continue;

    let hasMonth = false;
    let metricCols = 0;

    row.forEach((cell, cIdx) => {
      const h = String(cell || '').toLowerCase().trim();
      if (!h) return;

      if (h.includes('month') || h.includes('date') || h === 'mo') {
        hasMonth = true;
        colMap.month = cIdx;
      } else {
        const metricType = identifyMetricType(h);
        if (metricType) {
          metricCols++;
          if (metricType === 'adSpend') colMap.adSpend = cIdx;
          else if (metricType === 'reach') colMap.reach = cIdx;
          else if (metricType === 'views') colMap.views = cIdx;
          else if (metricType === 'impressions') colMap.impressions = cIdx;
          else if (metricType === 'interactions') colMap.interactions = cIdx;
          else if (metricType === 'profileVisits') colMap.profileActivity = cIdx;
          else if (metricType === 'newFollowers') colMap.newFollowers = cIdx;
          else if (metricType === 'totalPageFollowers') colMap.totalPageFollowers = cIdx;
          else if (metricType === 'totalFollowers') colMap.totalFollowers = cIdx;
          else if (metricType === 'newLikes') colMap.newLikes = cIdx;
          else if (metricType === 'totalPageLikes') colMap.totalPageLikes = cIdx;
          else if (metricType === 'watchTimeHours') colMap.watchTime = cIdx;
          else if (metricType === 'newSubscribers') colMap.newSubscribers = cIdx;
          else if (metricType === 'totalSubscribers') colMap.subscribers = cIdx;
          else if (metricType === 'readRate') colMap.readRate = cIdx;
          else if (metricType === 'replies') colMap.replies = cIdx;
          else if (metricType === 'conversions') colMap.conversions = cIdx;
          else if (metricType === 'organicTraffic') colMap.organicTraffic = cIdx;
          else if (metricType === 'bounceRate') colMap.bounceRate = cIdx;
          else if (metricType === 'avgDuration') colMap.avgDuration = cIdx;
          else if (metricType === 'sessions') colMap.sessions = cIdx;
        }
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
    if (colMap.watchTime !== -1 || colMap.newSubscribers !== -1) {
      detectedPlatform = 'youtube';
    } else if (colMap.adSpend !== -1 || colMap.totalPageLikes !== -1 || colMap.newLikes !== -1) {
      detectedPlatform = 'facebook';
    } else if (colMap.readRate !== -1 || colMap.replies !== -1) {
      detectedPlatform = 'whatsapp';
    } else if (colMap.organicTraffic !== -1 || colMap.bounceRate !== -1) {
      detectedPlatform = 'website_audits';
    } else if (colMap.profileActivity !== -1 || colMap.reach !== -1) {
      detectedPlatform = 'instagram';
    } else {
      detectedPlatform = defaultPlatform || 'instagram';
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

    const readVal = (colIdx) => {
      if (colIdx === -1 || r[colIdx] === undefined || r[colIdx] === null || r[colIdx] === '') return null;
      return cleanNumericValue(r[colIdx]);
    };

    const reach = readVal(colMap.reach);
    const impressions = readVal(colMap.impressions);
    const views = readVal(colMap.views);
    const interactions = readVal(colMap.interactions);
    const totalFollowers = readVal(colMap.totalFollowers) || readVal(colMap.totalPageFollowers) || readVal(colMap.subscribers);
    const newFollowers = readVal(colMap.newFollowers);
    const profileVisits = readVal(colMap.profileActivity);
    const adSpend = readVal(colMap.adSpend);
    const watchTimeHours = readVal(colMap.watchTime);
    const newSubscribers = readVal(colMap.newSubscribers);
    const newLikes = readVal(colMap.newLikes);
    const totalPageLikes = readVal(colMap.totalPageLikes);
    const totalPageFollowers = readVal(colMap.totalPageFollowers) || totalFollowers;
    const readRate = readVal(colMap.readRate);
    const replies = readVal(colMap.replies);
    const conversions = readVal(colMap.conversions);
    const organicTraffic = readVal(colMap.organicTraffic);
    const bounceRate = readVal(colMap.bounceRate);
    const avgDuration = readVal(colMap.avgDuration);
    const sessions = readVal(colMap.sessions);

    if (detectedPlatform === 'instagram') {
      parsedRecords.push({
        month,
        reach,
        views: views !== null ? views : impressions,
        impressions: impressions !== null ? impressions : views,
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
        newLikes,
        newFollowers,
        totalPageLikes,
        totalPageFollowers
      });
    } else if (detectedPlatform === 'youtube') {
      parsedRecords.push({
        month,
        totalViews: views !== null ? views : impressions,
        impressions,
        watchTimeHours,
        newSubscribers,
        totalSubscribers: totalFollowers
      });
    } else if (detectedPlatform === 'linkedin') {
      parsedRecords.push({
        month,
        impressions,
        reactions: interactions,
        totalPageViews: views,
        newFollowers,
        totalFollowers
      });
    } else if (detectedPlatform === 'whatsapp') {
      parsedRecords.push({
        month,
        reach: reach || views || impressions,
        readRate,
        replies: replies || interactions,
        interactions: interactions || replies,
        conversions: conversions || profileVisits,
        totalFollowers
      });
    } else if (detectedPlatform === 'website_audits') {
      parsedRecords.push({
        month,
        reach: sessions || reach || views,
        totalPageViews: views || impressions,
        impressions: impressions || views,
        organicTraffic: organicTraffic || interactions,
        bounceRate,
        avgDuration
      });
    } else {
      parsedRecords.push({
        month,
        reach: reach || impressions || views,
        views,
        impressions,
        interactions,
        totalFollowers
      });
    }
  });

  return { platform: detectedPlatform, rows: parsedRecords };
}

/**
 * Parses raw copied Excel text (tabs & newlines) for a specific platform.
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

  // 3. Fallback Row by Row
  return rawRows.filter(r => r && r.length >= 2 && normalizeMonth(r[0] || r[1])).map((row, idx) => {
    const month = normalizeMonth(row[0]) || normalizeMonth(row[1]) || `Month-${idx + 1}`;
    return {
      month,
      reach: cleanNumericValue(row[1] || row[2]),
      views: cleanNumericValue(row[2] || row[3]),
      impressions: cleanNumericValue(row[2] || row[3]),
      interactions: cleanNumericValue(row[3] || row[4]),
      totalFollowers: cleanNumericValue(row[row.length - 1])
    };
  });
}

/**
 * Strict Excel parser for multi-column master sheets and multi-tab workbooks
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
          linkedin: [],
          whatsapp: [],
          website_audits: []
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
          else if (lower.includes('whatsapp') || lower === 'wa') targetPlat = 'whatsapp';
          else if (lower.includes('website') || lower === 'web') targetPlat = 'website_audits';

          const worksheet = workbook.Sheets[sName];
          if (!worksheet) return;

          const tsv = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
          if (!tsv || !tsv.trim()) return;

          const parsed = Papa.parse(tsv.trim(), { header: false, skipEmptyLines: true });
          const rows = parsed.data || [];
          if (rows.length === 0) return;

          // 1. Try horizontal block parsing
          const allBlocks = parseAllHorizontalBlocks(rows, targetPlat || 'instagram');
          let foundHorizontal = false;

          Object.keys(allBlocks).forEach(plat => {
            if (allBlocks[plat] && allBlocks[plat].length > 0) {
              result[plat] = allBlocks[plat];
              foundHorizontal = true;
              matchedAnyPlatform = true;
            }
          });

          // 2. Try universal vertical table
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

