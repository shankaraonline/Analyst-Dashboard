/**
 * Detect if a value is a Time string (12-hour or 24-hour)
 * e.g. "8:26 AM", "1:01 PM", "11:45 PM", "14:30", "08:26:00", "8:26:00 AM", "8 AM"
 */
export function isTimeString(val) {
  if (val === null || val === undefined || val === '') return false;
  const str = String(val).trim();
  if (!str) return false;

  // 12-hour or 24-hour time patterns: "8:26 AM", "1:01 PM", "14:30", "08:26:00", "8:26:00 AM"
  if (/^\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?$/i.test(str)) return true;

  // Time with AM/PM: "8 AM", "12 PM", "8am", "12pm"
  if (/^\d{1,2}\s*[ap]m$/i.test(str)) return true;

  return false;
}

/**
 * Detect if a value is a Date string or Date object
 * e.g. "June 1, 2026", "June 29, 2026", "2026-06-29", "29/06/2026", "01-06-2026", "29 June 2026"
 */
export function isDateString(val) {
  if (val === null || val === undefined || val === '') return false;
  if (val instanceof Date) return true;
  const str = String(val).trim();
  if (!str) return false;

  // ISO date / timestamp: 2026-06-29 or 2026-06-29T... or 2026-06-29 08:26:00
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[T\s].*)?$/.test(str)) return true;

  // Common slash/dash date: 29/06/2026, 06/29/2026, 29-06-2026, 01-06-2026, 1/6/26
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(str)) return true;

  // Text date containing month word: "June 1, 2026", "June 29, 2026", "29 June 2026", "Jun 29, 2026"
  const monthWord = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;
  if (monthWord.test(str) && /\d/.test(str)) return true;

  return false;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/**
 * Parses a date cell value into { year: '2025', month: 'Aug', monthNum: 8 }
 * Accurately extracts the year (never extracts the day of the month as year!)
 */
export function parseDateCell(val) {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return {
      year: String(val.getFullYear()),
      month: MONTH_NAMES[val.getMonth()],
      monthNum: val.getMonth() + 1
    };
  }

  // Handle Excel serial date numbers (e.g. 44000 to 55000)
  if (typeof val === 'number' && val > 35000 && val < 60000) {
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      return {
        year: String(jsDate.getFullYear()),
        month: MONTH_NAMES[jsDate.getMonth()],
        monthNum: jsDate.getMonth() + 1
      };
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  // 1. Check for named month: e.g. "August 22, 2025", "Aug 29, 2025", "29 June 2026"
  const monthMatch = str.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);
  if (monthMatch) {
    const mStr = monthMatch[1].toLowerCase();
    const mIdx = FULL_MONTHS.findIndex(m => m.startsWith(mStr.slice(0, 3)));
    const yMatch = str.match(/\b(20\d{2})\b/);
    if (yMatch && mIdx !== -1) {
      return {
        year: yMatch[1],
        month: MONTH_NAMES[mIdx],
        monthNum: mIdx + 1
      };
    }
  }

  // 2. ISO format: "2025-08-22" or "2025/08/22"
  const isoMatch = str.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const mNum = parseInt(isoMatch[2], 10);
    if (mNum >= 1 && mNum <= 12) {
      return {
        year: y,
        month: MONTH_NAMES[mNum - 1],
        monthNum: mNum
      };
    }
  }

  // 3. DD/MM/YYYY or MM/DD/YYYY: "22/08/2025" or "22-08-2025"
  const slashMatch = str.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  if (slashMatch) {
    const y = slashMatch[3];
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    let mNum = p2;
    if (p1 <= 12 && p2 > 12) {
      mNum = p1; // MM/DD/YYYY
    } else if (p2 <= 12) {
      mNum = p2; // DD/MM/YYYY
    }
    if (mNum >= 1 && mNum <= 12) {
      return {
        year: y,
        month: MONTH_NAMES[mNum - 1],
        monthNum: mNum
      };
    }
  }

  // 4. Standalone 4-digit year
  const justYear = str.match(/\b(20\d{2})\b/);
  if (justYear) {
    return {
      year: justYear[1],
      month: null,
      monthNum: null
    };
  }

  return null;
}

/**
 * Detect if a value is a Phone Number, Mobile Number, or Serial ID
 * e.g., 9920227704, +919430071615, 09154985598, +91 99202-27704, 4.91765E+12, 5,972,175,250
 */
export function isPhoneOrIdString(val) {
  if (val === null || val === undefined || val === '') return false;
  if (typeof val === 'number') {
    // 10 to 13 digit integer (e.g. 9920227704, 5972175250, 919920227704)
    if (val >= 1000000000 && val <= 9999999999999 && Number.isInteger(val)) {
      return true;
    }
    return false;
  }
  const str = String(val).trim();
  if (!str) return false;

  // Scientific notation phone number exported from Excel (e.g. "4.91765E+12", "3.93474E+11")
  if (/^\d(?:\.\d+)?[eE]\+?\d{2}$/i.test(str)) {
    const num = Number(str);
    if (!isNaN(num) && num >= 1e10 && num <= 1e15) {
      return true;
    }
  }

  // Alphanumeric tokens / hashes / coupon codes / IDs (e.g. "bfcSQtjxZPmVCgNBubUSa", "HNRAWAdZtgFWIRMhDKQRe", "G98K4G", "OSRDIXPO")
  if (/[a-zA-Z]/.test(str) && /\d/.test(str) && !str.includes('%') && !/^[₹$€£]/.test(str) && !/^\d+(?:\.\d+)?\s*[kmb]$/i.test(str) && !isTimeString(str) && !isDateString(str)) {
    return true;
  }

  // Pure digits or digits with formatting
  const digitsOnly = str.replace(/[^0-9]/g, '');

  // 10-digit mobile number: e.g. 9910575955 or 5972175250
  if (/^\d{10}$/.test(digitsOnly)) return true;

  // 11-14 digits with country code e.g. 919920227704 or +919920227704
  if (str.startsWith('+') && digitsOnly.length >= 10 && digitsOnly.length <= 14) return true;
  if (/^(?:91|0)\d{10}$/.test(digitsOnly)) return true;
  if (digitsOnly.length >= 10 && digitsOnly.length <= 13 && (str.includes('-') || str.includes(' ') || str.includes(','))) {
    return true;
  }

  return false;
}

/**
 * Detect non-calculable headers (Phone, Name, Email, Status, Country, ID, Date, Time, etc.)
 */
export function isNonCalculableHeader(header = '') {
  if (!header || typeof header !== 'string') return false;
  const raw = header.trim();
  if (raw.includes('@')) return true; // Email header
  if (isTimeString(raw) || isDateString(raw)) return true;
  if (isPhoneOrIdString(raw)) return true;

  const h = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Exclude explicit watch time / duration metrics in analytics
  if (h.includes('watchtime') || h.includes('watchhour') || h.includes('viewduration') || h.includes('timeperview')) {
    return false;
  }

  return (
    h.includes('phone') ||
    h.includes('mobile') ||
    h.includes('contact') ||
    h.includes('cell') ||
    h.includes('tel') ||
    h.includes('whatsapp') ||
    h.includes('calling') ||
    h.includes('call') ||
    h.includes('pincode') ||
    h.includes('pin') ||
    h.includes('zip') ||
    h.includes('postal') ||
    h.includes('aadhaar') ||
    h.includes('aadhar') ||
    h.includes('pan') ||
    h.includes('serial') ||
    h.includes('srno') ||
    h.includes('sno') ||
    h === 'id' ||
    h.endsWith('id') ||
    h.includes('roll') ||
    h.includes('email') ||
    h.includes('mail') ||
    h.includes('name') ||
    h.includes('user') ||
    h.includes('client') ||
    h.includes('customer') ||
    h.includes('patient') ||
    h.includes('doctor') ||
    h.includes('package') ||
    h.includes('country') ||
    h.includes('nationality') ||
    h.includes('status') ||
    h.includes('remark') ||
    h.includes('comment') ||
    h.includes('feedback') ||
    h.includes('query') ||
    h.includes('reason') ||
    h.includes('address') ||
    h.includes('city') ||
    h.includes('state') ||
    h.includes('wants') ||
    // Date & Time terms
    h.includes('date') ||
    h.includes('time') ||
    h.includes('datetime') ||
    h.includes('timestamp') ||
    h.includes('timing') ||
    h.includes('schedule') ||
    h.includes('slot') ||
    h.includes('createdat') ||
    h.includes('updatedat') ||
    h.includes('day') ||
    h.includes('month') ||
    h.includes('year') ||
    h.includes('hour') ||
    h.includes('minute') ||
    h.includes('second')
  );
}

/**
 * Robust number cleaner that handles:
 * - Indian number system: "2,41,930", "1,79,186", "1,22,705"
 * - Standard number system: "144,894", "10,000"
 * - Decimals and percentages: "15.4%", "12.5k", "1.2M"
 * - Currency: "₹ 2,41,930", "$100", "€50", "1500 INR"
 * - NA / Null / Empty / undefined: returns 0
 * - Dates, Times, Phone numbers, IDs, and arbitrary text: returns 0 (NEVER calculated into sums)
 */
export function cleanNumericValue(val) {
  if (val === null || val === undefined || val === '' || val === 'NA' || val === 'na' || val === 'N/A' || val === 'n/a' || val === '-') {
    return 0;
  }

  // Dates and times must NEVER be calculated into sums or totals
  if (isTimeString(val) || isDateString(val)) {
    return 0;
  }

  // Prevent phone numbers, IDs, and emails from ever being calculated
  if (isPhoneOrIdString(val)) {
    return 0;
  }
  if (typeof val === 'string' && val.includes('@')) {
    return 0;
  }

  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  
  const str = String(val).trim();
  if (!str) return 0;

  // Percentage: e.g. "15.4%", "-2.5%"
  if (/^-?[\d,]+(?:\.\d+)?\s*%$/.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  // Currency: e.g. "₹ 2,41,930", "$100", "€50", "1500 INR"
  if (/^[₹$€£]\s*-?[\d,]+(?:\.\d+)?$/i.test(str) || /^-?[\d,]+(?:\.\d+)?\s*(?:inr|rs\.?|usd|eur|gbp)$/i.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  // k / K suffix: e.g. "10.5k"
  if (/^-?[\d,]+(?:\.\d+)?\s*k$/i.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }

  // M / m suffix: e.g. "1.2m"
  if (/^-?[\d,]+(?:\.\d+)?\s*m$/i.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 1000000);
  }

  // B / b suffix: e.g. "1.5b"
  if (/^-?[\d,]+(?:\.\d+)?\s*b$/i.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 1000000000);
  }

  // Pure numeric string (integer or decimal, optional commas, optional sign)
  if (/^-?[\d,]+(?:\.\d+)?$/.test(str)) {
    const cleanStr = str.replace(/,/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Any string containing letters/words (e.g. "8 Days Panchakarma Package", "Sudesh Rani", "India", "G98K4G")
  // is TEXT and MUST NOT be converted to a number by stripping characters!
  return 0;
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

/**
 * Robust detector for month/period/date column headers across all formats
 * Strictly excludes times (like "8:26 AM") and full specific day dates (like "June 1, 2026")
 */
export function isPeriodOrMonthHeader(label) {
  if (!label || typeof label !== 'string') return false;
  const str = label.trim();

  // If it's a time string (e.g. "8:26 AM", "1:01 PM"), it's NEVER a period/month header!
  if (isTimeString(str)) return false;

  // If it's an email or phone, it's NOT a month header
  if (str.includes('@') || isPhoneOrIdString(str)) return false;

  // Month names (Jan, January, Feb, etc.)
  const monthRegex = /\b(?:jan(?:u|ur|uar|uary)?|feb(?:r|ru|ruar|ruary)?|mar(?:c|ch)?|apr(?:i|il)?|may|jun(?:e)?|jul(?:y)?|aug(?:u|us|ust)?|sep(?:t|te|tem|tember)?|oct(?:o|ob|ober)?|nov(?:e|em|ember)?|dec(?:e|em|ember)?)\b/i;

  // Period patterns: "2024", "2025", "2026", "Jan-26", "01/26", "Q1 2026"
  const periodRegex = /\b20\d{2}\b|\b[a-zA-Z]{3,9}\s*[-/]?\s*\d{2,4}\b|\b\d{1,2}[-/]\d{2,4}\b|\bQ[1-4]\s*(?:20\d{2}|\d{2})?\b/i;

  if (monthRegex.test(str)) {
    // If it has a specific day number like "June 1, 2026", "29-Jun-2026", it's a daily entry date, NOT a monthly breakdown column
    if (/\b(?:[12]\d|3[01]|0?[1-9])\s*(?:st|nd|rd|th)?\s*,\s*\d{4}/i.test(str)) return false;
    return true;
  }

  return periodRegex.test(str) && !/total|reach|view|spend|cost|follow|like|sub|click|action|visit|impression|package|name|phone|email/i.test(str);
}

/**
 * Intelligent detector for true Wide-format (time-series) spreadsheets
 * Returns true ONLY when columns represent multiple time periods/months AND
 * the rows are KPI metric names, NOT individual user records (enquiries, leads, calls).
 */
export function isWideSpreadsheet(columns = [], rawRows = []) {
  if (!columns || columns.length < 3 || !rawRows || rawRows.length === 0) return false;

  // Must have at least 2 columns matching month/period headers (excluding times and daily dates)
  const monthCols = columns.filter(c => isPeriodOrMonthHeader(c.label) && !isTimeString(c.label));
  if (monthCols.length < 2) return false;

  // Check if rows look like user/enquiry records (emails, phone numbers, client names):
  // Wide format sheets have metric labels as rows (e.g. "Total Followers", "Impressions", "Reach"), NOT customer entries!
  const sampleRows = rawRows.slice(0, 8);
  const hasCustomerRecords = sampleRows.some(row => {
    return Object.values(row).some(val => {
      if (!val) return false;
      const s = String(val).trim();
      if (s.includes('@') && s.includes('.')) return true;
      if (isPhoneOrIdString(val)) return true;
      return false;
    });
  });
  if (hasCustomerRecords) return false;

  // In a real wide sheet, the majority of values in monthCols must be numbers
  let numCount = 0;
  let totalChecked = 0;
  sampleRows.forEach(row => {
    monthCols.forEach(col => {
      const val = row[col.key];
      if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-') {
        totalChecked++;
        if (typeof val === 'number') {
          numCount++;
        } else if (typeof val === 'string') {
          const s = val.trim();
          if (/^[₹$€£]?\s*-?[\d,.]+%?[kmb]?$/i.test(s) && !isTimeString(s) && !isDateString(s)) {
            numCount++;
          }
        }
      }
    });
  });

  if (totalChecked > 0 && (numCount / totalChecked) < 0.5) {
    return false;
  }

  return true;
}
