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
 * Clean numeric string into clean number
 */
function cleanNumericValue(val) {
  if (val === null || val === undefined || val === '' || val === 'NA' || val === 'na' || val === 'N/A' || val === 'n/a' || val === '-') {
    return 0;
  }
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  const str = String(val).trim();
  if (!str) return 0;

  if (str.endsWith('%')) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  if (/k$/i.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }
  if (/m$/i.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 1000000);
  }

  const cleanStr = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalize month string
 */
function normalizeMonth(raw) {
  if (raw === null || raw === undefined || raw === '') return '';

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = months[raw.getMonth()];
    const y = String(raw.getFullYear()).slice(-2);
    return `${m}-${y}`;
  }

  if (typeof raw === 'number' && raw > 35000 && raw < 60000) {
    const jsDate = new Date(Math.round((raw - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const m = months[jsDate.getMonth()];
      const y = String(jsDate.getFullYear()).slice(-2);
      return `${m}-${y}`;
    }
  }

  let str = String(raw).trim();
  if (!str) return '';

  const monthMap = [
    { regex: /jan(?:u|ur|uar|uary)?/i, short: 'Jan' },
    { regex: /feb(?:r|ru|ruar|ruary)?/i, short: 'Feb' },
    { regex: /mar(?:c|ch)?/i, short: 'Mar' },
    { regex: /apr(?:i|il)?/i, short: 'Apr' },
    { regex: /may/i, short: 'May' },
    { regex: /jun(?:e)?/i, short: 'Jun' },
    { regex: /jul(?:y)?/i, short: 'Jul' },
    { regex: /aug(?:u|us|ust)?/i, short: 'Aug' },
    { regex: /sep(?:t|te|tem|tember)?/i, short: 'Sep' },
    { regex: /oct(?:o|ob|ober)?/i, short: 'Oct' },
    { regex: /nov(?:e|em|ember)?/i, short: 'Nov' },
    { regex: /dec(?:e|em|ember)?/i, short: 'Dec' }
  ];

  for (const item of monthMap) {
    if (item.regex.test(str)) {
      const yearMatch = str.match(/(?:20)?(\d{2})\b/);
      const year = yearMatch ? yearMatch[1] : '26';
      return `${item.short}-${year}`;
    }
  }
  return '';
}

function identifyMetricType(label = '') {
  const l = String(label).toLowerCase().trim();
  if (!l) return null;

  if (l.includes('ad spend') || l.includes('amount spent') || l.includes('spend') || l.includes('budget') || l.includes('cost') || l.includes('inr')) return 'adSpend';
  if (l.includes('reach') || l.includes('accounts reached')) return 'reach';
  if (l.includes('video view') || l.includes('total view') || l.includes('plays') || (l.includes('views') && !l.includes('page view'))) return 'views';
  if (l.includes('impression') || l.includes('impr')) return 'impressions';
  if (l.includes('interaction') || l.includes('engagement') || l.includes('reactions')) return 'interactions';
  if (l.includes('profile visit') || l.includes('page visit') || l.includes('profile activity')) return 'profileVisits';
  if (l.includes('page view') || l.includes('total page view')) return 'totalPageViews';
  if (l.includes('watch time') || l.includes('watch_time') || l.includes('hrs')) return 'watchTimeHours';
  if (l.includes('new sub') || l.includes('subscribers gained')) return 'newSubscribers';
  if (l.includes('total sub') || (l.includes('subscribers') && !l.includes('new'))) return 'totalSubscribers';
  if (l.includes('new follower') || l.includes('followers gained')) return 'newFollowers';
  if (l.includes('new like') || l.includes('likes gained')) return 'newLikes';
  if (l.includes('total page like') || l.includes('page like')) return 'totalPageLikes';
  if (l.includes('total page follower') || l.includes('page follower') || l.includes('facebook follower')) return 'totalPageFollowers';
  if (l.includes('total follower') || l.includes('followers')) return 'totalFollowers';
  if (l.includes('read rate') || l.includes('delivery rate')) return 'readRate';
  if (l.includes('reply') || l.includes('replies') || l.includes('responses')) return 'replies';
  if (l.includes('conversion') || l.includes('clicks') || l.includes('link click')) return 'conversions';
  if (l.includes('organic') || l.includes('seo')) return 'organicTraffic';
  if (l.includes('bounce')) return 'bounceRate';
  if (l.includes('duration') || l.includes('session time')) return 'avgDuration';
  if (l.includes('session')) return 'sessions';

  return null;
}

// Month sequence order for inferring missing years
const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonthWithContext(rawMonthStr, rowIndex, allRawMonthRows) {
  if (!rawMonthStr) return '';
  const str = String(rawMonthStr).trim();
  const yearMatch = str.match(/(?:20)?(\d{2})\b/);
  if (yearMatch) {
    return normalizeMonth(str);
  }

  let referenceYear = 26;
  let refMonthIdx = 0;
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
 * Fetches and parses Google Sheet on the backend with full universal column extraction
 */
export async function fetchAndParseGoogleSheet(sheetUrl, targetCategories = []) {
  const sheetId = extractSpreadsheetId(sheetUrl);
  if (!sheetId) {
    throw new Error('Invalid Google Sheet URL');
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  const response = await fetch(exportUrl);
  if (!response.ok) {
    throw new Error(`Google Sheet export returned status ${response.status}. Verify sheet sharing is set to "Anyone with the link can view".`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const sheetNames = workbook.SheetNames;

  const result = {};
  ['facebook', 'instagram', 'youtube', 'linkedin', 'whatsapp', 'website_audits'].forEach(c => { result[c] = []; });
  targetCategories.forEach(c => { result[c.toLowerCase().replace(/\s+/g, '_')] = []; });

  sheetNames.forEach(sName => {
    const lowerName = sName.toLowerCase().trim();
    const worksheet = workbook.Sheets[sName];
    if (!worksheet) return;

    const tsv = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
    if (!tsv || !tsv.trim()) return;

    const parsed = Papa.parse(tsv.trim(), { header: false, skipEmptyLines: true });
    const rows = parsed.data || [];
    if (rows.length === 0) return;

    // 1. Initial platform check from Tab name
    let targetPlat = null;
    if (lowerName.includes('insta') || lowerName === 'ig') targetPlat = 'instagram';
    else if (lowerName.includes('face') || lowerName === 'fb') targetPlat = 'facebook';
    else if (lowerName.includes('you') || lowerName === 'yt') targetPlat = 'youtube';
    else if (lowerName.includes('link') || lowerName === 'li') targetPlat = 'linkedin';
    else if (lowerName.includes('whatsapp') || lowerName === 'wa') targetPlat = 'whatsapp';
    else if (lowerName.includes('website') || lowerName === 'web') targetPlat = 'website_audits';
    else {
      for (const cat of targetCategories) {
        const catClean = cat.toLowerCase().trim();
        if (lowerName.includes(catClean) || catClean.includes(lowerName)) {
          targetPlat = cat.toLowerCase().replace(/\s+/g, '_');
          break;
        }
      }
    }

    // 2. If tab name is generic (e.g. "Sheet1", "Sheet 1"), inspect top 5 rows for banner / title text
    if (!targetPlat || lowerName.startsWith('sheet') || lowerName === 'data' || lowerName === 'page 1') {
      for (let r = 0; r < Math.min(rows.length, 5); r++) {
        const rowText = (rows[r] || []).map(c => String(c || '').toLowerCase().trim()).join(' ');
        if (rowText.includes('instagram') || rowText === 'ig') { targetPlat = 'instagram'; break; }
        if (rowText.includes('facebook') || rowText === 'fb') { targetPlat = 'facebook'; break; }
        if (rowText.includes('youtube') || rowText === 'yt') { targetPlat = 'youtube'; break; }
        if (rowText.includes('linkedin') || rowText === 'li') { targetPlat = 'linkedin'; break; }
        if (rowText.includes('whatsapp') || rowText === 'wa') { targetPlat = 'whatsapp'; break; }
        if (rowText.includes('website') || rowText.includes('audit')) { targetPlat = 'website_audits'; break; }
      }
    }

    // Find header row containing column names
    let headerRowIdx = -1;
    const colMap = { month: -1 };

    for (let r = 0; r < Math.min(rows.length, 6); r++) {
      const row = rows[r];
      if (!row) continue;
      let hasMonth = false;
      let metricCount = 0;

      row.forEach((cell, cIdx) => {
        const h = String(cell || '').toLowerCase().trim();
        if (!h) return;
        if (h.includes('month') || h.includes('date') || h === 'mo') {
          hasMonth = true;
          colMap.month = cIdx;
        } else {
          const type = identifyMetricType(h);
          if (type) {
            metricCount++;
            colMap[type] = cIdx;
          }
        }
      });
      if (hasMonth || metricCount >= 2) {
        headerRowIdx = r;
        if (colMap.month === -1) colMap.month = 0;
        break;
      }
    }

    // 3. If platform still not detected, infer from column headers
    if (!targetPlat || targetPlat.startsWith('sheet')) {
      if (colMap.profileVisits !== undefined || (colMap.reach !== undefined && colMap.impressions !== undefined)) {
        targetPlat = 'instagram';
      } else if (colMap.adSpend !== undefined || colMap.totalPageLikes !== undefined) {
        targetPlat = 'facebook';
      } else if (colMap.watchTimeHours !== undefined || colMap.newSubscribers !== undefined) {
        targetPlat = 'youtube';
      } else if (colMap.reactions !== undefined) {
        targetPlat = 'linkedin';
      } else if (colMap.readRate !== undefined || colMap.replies !== undefined) {
        targetPlat = 'whatsapp';
      } else if (colMap.organicTraffic !== undefined || colMap.bounceRate !== undefined) {
        targetPlat = 'website_audits';
      } else {
        targetPlat = lowerName.replace(/\s+/g, '_');
      }
    }

    const dataRows = (headerRowIdx !== -1 ? rows.slice(headerRowIdx + 1) : rows)
      .filter(r => r && r.length >= 2 && (normalizeMonth(r[0]) || normalizeMonth(r[1]) || (colMap.month !== -1 && normalizeMonth(r[colMap.month]))));

    const rawMonths = dataRows.map(r => String((colMap.month !== -1 ? r[colMap.month] : r[0]) || '').trim());

    const records = dataRows.map((r, idx) => {
      const monthCandidate = parseMonthWithContext(
        (colMap.month !== -1 ? r[colMap.month] : null) || r[0] || r[1],
        idx,
        rawMonths
      ) || `Month-${idx + 1}`;
      
      const getVal = (type, fallbackIdx) => {
        if (colMap[type] !== undefined && colMap[type] !== -1 && r[colMap[type]] !== undefined && r[colMap[type]] !== '') {
          return cleanNumericValue(r[colMap[type]]);
        }
        if (fallbackIdx !== undefined && r[fallbackIdx] !== undefined && r[fallbackIdx] !== '') {
          return cleanNumericValue(r[fallbackIdx]);
        }
        return null;
      };

      const reach = getVal('reach', 1);
      const views = getVal('views', 2);
      const impressions = getVal('impressions', 2);
      const interactions = getVal('interactions', 3);
      const profileVisits = getVal('profileVisits', 4);
      const totalFollowers = getVal('totalFollowers', r.length - 1) || getVal('totalPageFollowers') || getVal('totalSubscribers');
      const adSpend = getVal('adSpend', 0);
      const newFollowers = getVal('newFollowers');
      const newLikes = getVal('newLikes');
      const totalPageLikes = getVal('totalPageLikes');
      const totalPageFollowers = getVal('totalPageFollowers') || totalFollowers;
      const watchTimeHours = getVal('watchTimeHours');
      const newSubscribers = getVal('newSubscribers');
      const totalSubscribers = getVal('totalSubscribers') || totalFollowers;
      const readRate = getVal('readRate');
      const replies = getVal('replies');
      const conversions = getVal('conversions');
      const organicTraffic = getVal('organicTraffic');
      const bounceRate = getVal('bounceRate');
      const avgDuration = getVal('avgDuration');

      if (targetPlat === 'facebook') {
        return {
          month: monthCandidate,
          adSpend,
          views,
          reach: reach || views,
          pageVisits: profileVisits,
          engagement: interactions,
          newLikes,
          newFollowers,
          totalPageLikes,
          totalPageFollowers
        };
      }

      if (targetPlat === 'instagram') {
        return {
          month: monthCandidate,
          reach,
          views: views || impressions,
          impressions: impressions || views,
          interactions,
          profileVisits,
          totalFollowers
        };
      }

      if (targetPlat === 'youtube') {
        return {
          month: monthCandidate,
          totalViews: views || impressions,
          impressions,
          watchTimeHours,
          newSubscribers,
          totalSubscribers
        };
      }

      if (targetPlat === 'linkedin') {
        return {
          month: monthCandidate,
          impressions,
          reactions: interactions,
          totalPageViews: views,
          newFollowers,
          totalFollowers
        };
      }

      return {
        month: monthCandidate,
        reach,
        views,
        impressions,
        interactions,
        profileVisits,
        totalFollowers,
        readRate,
        replies,
        conversions,
        organicTraffic,
        bounceRate,
        avgDuration
      };
    });

    if (records.length > 0) {
      result[targetPlat] = records;
    }
  });

  return result;
}

