/**
 * Robust number cleaner that handles:
 * - Indian number system: "2,41,930", "1,79,186", "1,22,705"
 * - Standard number system: "144,894", "10,000"
 * - Decimals and percentages: "15.4%", "12.5k", "1.2M"
 * - NA / Null / Empty / undefined: returns 0 or null
 */
export function cleanNumericValue(val) {
  if (val === null || val === undefined || val === '' || val === 'NA' || val === 'na' || val === 'N/A' || val === 'n/a' || val === '-') {
    return 0;
  }
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  
  const str = String(val).trim();
  if (!str) return 0;

  // Percentage
  if (str.endsWith('%')) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  // k / K
  if (/k$/i.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }

  // M / m
  if (/m$/i.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 1000000);
  }

  // Strip all commas, spaces, currency symbols
  const cleanStr = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Standardize Month strings like "Janurary 2026", "Jan-26", "Jan 2026", "Sept-24", "April-25", "Apr - 25" -> "Jan-26"
 * Also handles Date objects and Excel serial dates.
 */
export function normalizeMonth(raw) {
  if (raw === null || raw === undefined || raw === '') return '';

  // Handle JS Date object
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = months[raw.getMonth()];
    const y = String(raw.getFullYear()).slice(-2);
    return `${m}-${y}`;
  }

  // Handle Excel serial date numbers (e.g. ~44000 to ~48000 for 2020-2030)
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

  // Check if string contains month names
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

  // Match month word and year
  for (const item of monthMap) {
    if (item.regex.test(str)) {
      // Find year digits in string
      const yearMatch = str.match(/(?:20)?(\d{2})\b/);
      const year = yearMatch ? yearMatch[1] : '26';
      return `${item.short}-${year}`;
    }
  }

  // Fallback regex for standard pattern "Mmm-YY" or "Mmm YY"
  const cleaned = str.replace(/\s+/g, '');
  const match = cleaned.match(/([a-zA-Z]+)-?(\d{2,4})/);
  if (match) {
    const m = match[1].toLowerCase();
    let month = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
    for (const item of monthMap) {
      if (item.regex.test(m)) {
        month = item.short;
        break;
      }
    }
    const y = match[2].length === 4 ? match[2].slice(2) : match[2];
    return `${month}-${y}`;
  }

  return '';
}

/**
 * Format numbers with K/M abbreviations for clean display
 */
export function formatMetric(num, decimals = 1) {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (isNaN(n)) return '0';
  
  if (Math.abs(n) >= 1_000_000) {
    return (n / 1_000_000).toFixed(decimals).replace(/\.0$/, '') + 'M';
  }
  if (Math.abs(n) >= 1_000) {
    return (n / 1_000).toFixed(decimals).replace(/\.0$/, '') + 'K';
  }
  return n.toLocaleString();
}
