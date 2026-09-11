/**
 * computeTabKpiCards
 * Shared utility to compute up to 4 highlight KPI cards from a tab's data.
 * Used by UniversalTabView (individual tab view) AND OverviewView (omnichannel 5-col grid).
 *
 * Each returned card includes a `key` property (unique within the tab) so the
 * Omnichannel eye-toggle visibility system can persist show/hide per card.
 *
 * ALL change percentages are computed from real data — nothing is hardcoded.
 */
import { formatMetric, cleanNumericValue, isPeriodOrMonthHeader } from './spreadsheetParser';
import { Eye, Target, Users, IndianRupee, TrendingUp, Percent } from 'lucide-react';

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function formatMetricOrNumber(num) {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (isNaN(n)) return '0';
  if (Math.abs(n) >= 10_000) {
    return formatMetric(n);
  }
  return n.toLocaleString();
}

// ── Real Change Computation Helpers ─────────────────────────────────────────

/**
 * Compute real percentage change between two values.
 * Returns { change: '+X.X%' | '-X.X%' | null, isPositive: boolean }
 * Returns null change when there's insufficient data to compute.
 */
export function computeChangeFromValues(current, previous) {
  if (current === null || current === undefined ||
      previous === null || previous === undefined ||
      previous === 0) {
    return { change: null, isPositive: true };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct >= 0 ? '+' : '';
  return {
    change: `${sign}${pct.toFixed(1)}%`,
    isPositive: pct >= 0
  };
}

/**
 * For WIDE format: compare the last two non-empty month values for a metric row.
 * Walks month columns right-to-left to find the two most recent non-empty values.
 */
function computeWideRowChange(row, monthCols) {
  let latest = null, previous = null;
  for (let i = monthCols.length - 1; i >= 0; i--) {
    const val = row[monthCols[i].key];
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-') {
      const num = cleanNumericValue(val);
      if (!isNaN(num)) {
        if (latest === null) {
          latest = num;
        } else {
          previous = num;
          break;
        }
      }
    }
  }
  return computeChangeFromValues(latest, previous);
}

/**
 * For STANDARD format: compare the last two non-empty row values for a metric column.
 * Walks rows bottom-to-top to find the two most recent non-empty values.
 */
function computeStandardColChange(rawRows, colKey) {
  let latest = null, previous = null;
  for (let i = rawRows.length - 1; i >= 0; i--) {
    const val = rawRows[i]?.[colKey];
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-') {
      const num = cleanNumericValue(val);
      if (!isNaN(num)) {
        if (latest === null) {
          latest = num;
        } else {
          previous = num;
          break;
        }
      }
    }
  }
  return computeChangeFromValues(latest, previous);
}

// ── Metric Classification Helpers ───────────────────────────────────────────

/**
 * Determines whether a metric is an incremental / flow metric (to be SUMMED across all rows/months)
 * vs a standing total / stock / balance metric (to take the LATEST value from the most recent row/month).
 */
function isIncrementalMetric(label) {
  const l = String(label).toLowerCase();
  // Explicit change keywords
  if (l.includes('new') || l.includes('gain') || l.includes('add') || l.includes('growth') || l.includes('lost') || l.includes('net') || l.includes('+') || l.includes('change')) {
    return true;
  }
  // Activity / flow metrics are always incremental
  if (l.includes('view') || l.includes('reach') || l.includes('impression') || l.includes('spend') || l.includes('cost') ||
      l.includes('budget') || l.includes('click') || l.includes('interaction') || l.includes('reaction') || l.includes('engagement') ||
      l.includes('lead') || l.includes('conversion') || l.includes('watch') || l.includes('hour') || l.includes('visit') ||
      l.includes('session') || l.includes('delivered') || l.includes('order') || l.includes('sale') || l.includes('reply') ||
      l.includes('comment') || l.includes('share') || l.includes('post') || l.includes('tweet') || l.includes('message')) {
    return true;
  }
  return false;
}

/**
 * Determines whether a metric represents current standing audience / balance / base
 */
function isStandingAudienceMetric(label) {
  const l = String(label).toLowerCase();
  if (isIncrementalMetric(label)) return false;
  return l.includes('follower') || l.includes('subscriber') || l.includes('fan') || l.includes('audience') ||
         l.includes('balance') || l.includes('base') || l.includes('like') || l.includes('total page') || l.includes('members');
}

/**
 * Determines whether a metric is a rate / percent
 */
function isRateOrPercentMetric(col, label) {
  const l = String(label).toLowerCase();
  return col?.type === 'percent' || l.includes('%') || l.includes('rate') || l.includes('ctr') || l.includes('cpc') || l.includes('cpa') || l.includes('cpm') || l.includes('ratio');
}

function getLatestNumericValue(rawRows, colKey) {
  for (let i = rawRows.length - 1; i >= 0; i--) {
    const val = rawRows[i]?.[colKey];
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-') {
      const num = cleanNumericValue(val);
      if (!isNaN(num)) return num;
    }
  }
  return 0;
}

function getLatestRowValue(row, monthCols) {
  for (let i = monthCols.length - 1; i >= 0; i--) {
    const val = row[monthCols[i].key];
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-') {
      const num = cleanNumericValue(val);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 0;
}

// ── Main KPI Card Computation ───────────────────────────────────────────────

export function computeTabKpiCards(rawRows, columns, themeColor, maxCards = 4) {
  if (!rawRows || rawRows.length === 0 || !columns || columns.length === 0) return [];

  const isWide = columns.filter(c => isPeriodOrMonthHeader(c.label)).length >= 2;

  // ── WIDE FORMAT: Rows = metric labels, Columns = months ──────────────────
  if (isWide) {
    const monthCols = columns.filter(c => isPeriodOrMonthHeader(c.label));

    const rowMetrics = rawRows.map(r => {
      const textParts = Object.keys(r)
        .filter(k => k !== '_rowId')
        .map(k => String(r[k] || ''))
        .filter(v => isNaN(Number(v)) && v.length > 1 && !isPeriodOrMonthHeader(v));

      const label = textParts[textParts.length - 1] || textParts[0] || 'Metric';
      const fullText = textParts.join(' ').toLowerCase();
      const total = monthCols.reduce((sum, col) => sum + cleanNumericValue(r[col.key]), 0);
      const latest = getLatestRowValue(r, monthCols);
      // Compute real month-over-month change from actual data
      const changeData = computeWideRowChange(r, monthCols);
      return { label, fullText, total, latest, key: slugify(label), change: changeData.change, isPositive: changeData.isPositive };
    }).filter(m => m.total > 0 || m.latest > 0);

    const cards = [];
    const usedKeys = new Set();

    // 1. Volume — Reach / Views / Impressions
    const volumeMetric = rowMetrics
      .filter(m => (m.fullText.includes('reach') || m.fullText.includes('view') || m.fullText.includes('impression'))
        && !m.fullText.includes('cost') && !m.fullText.includes('spend'))
      .sort((a, b) => b.total - a.total)[0];
    if (volumeMetric && !usedKeys.has(volumeMetric.key)) {
      cards.push({ key: volumeMetric.key, title: volumeMetric.label, value: formatMetricOrNumber(volumeMetric.total), subtitle: 'cumulative across all months', change: volumeMetric.change, isPositive: volumeMetric.isPositive, icon: Eye, iconBg: `${themeColor}22`, iconColor: themeColor });
      usedKeys.add(volumeMetric.key);
    }

    // 2. Spend / Cost / Budget
    const spendMetric = rowMetrics
      .filter(m => m.fullText.includes('spend') || m.fullText.includes('cost') || m.fullText.includes('budget') || m.fullText.includes('amount') || m.fullText.includes('inr'))
      .sort((a, b) => b.total - a.total)[0];
    if (spendMetric && !usedKeys.has(spendMetric.key)) {
      cards.push({ key: spendMetric.key, title: spendMetric.label, value: `₹${spendMetric.total.toLocaleString()}`, subtitle: 'total logged investment', change: spendMetric.change, isPositive: spendMetric.isPositive, icon: IndianRupee, iconBg: 'rgba(245, 158, 11, 0.15)', iconColor: '#F59E0B' });
      usedKeys.add(spendMetric.key);
    }

    // 3. Actions — Interactions / Conversions / Clicks / Leads / Reactions / Watch Time
    const actionMetric = rowMetrics
      .filter(m => m.fullText.includes('interaction') || m.fullText.includes('conversion') || m.fullText.includes('lead') || m.fullText.includes('click') || m.fullText.includes('visit') || m.fullText.includes('reaction') || m.fullText.includes('action') || m.fullText.includes('engagement') || m.fullText.includes('watch'))
      .sort((a, b) => b.total - a.total)[0];
    if (actionMetric && !usedKeys.has(actionMetric.key)) {
      cards.push({ key: actionMetric.key, title: actionMetric.label, value: formatMetricOrNumber(actionMetric.total), subtitle: 'total user actions', change: actionMetric.change, isPositive: actionMetric.isPositive, icon: Target, iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10B981' });
      usedKeys.add(actionMetric.key);
    }

    // 4. Standing Audience Base — Total Followers / Total Subscribers / Total Likes
    const standingAudienceMetric = rowMetrics
      .filter(m => isStandingAudienceMetric(m.fullText))
      .sort((a, b) => b.latest - a.latest)[0];
    if (standingAudienceMetric && !usedKeys.has(standingAudienceMetric.key)) {
      cards.push({ key: standingAudienceMetric.key, title: standingAudienceMetric.label, value: formatMetricOrNumber(standingAudienceMetric.latest), subtitle: 'latest active count', change: standingAudienceMetric.change, isPositive: standingAudienceMetric.isPositive, icon: Users, iconBg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8' });
      usedKeys.add(standingAudienceMetric.key);
    }

    // 5. Incremental Growth — New Followers / New Subscribers / New Likes
    const growthMetric = rowMetrics
      .filter(m => (m.fullText.includes('follow') || m.fullText.includes('sub') || m.fullText.includes('like')) && isIncrementalMetric(m.fullText))
      .sort((a, b) => b.total - a.total)[0];
    if (growthMetric && !usedKeys.has(growthMetric.key)) {
      cards.push({ key: growthMetric.key, title: growthMetric.label, value: formatMetricOrNumber(growthMetric.total), subtitle: 'total new gained', change: growthMetric.change, isPositive: growthMetric.isPositive, icon: TrendingUp, iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10B981' });
      usedKeys.add(growthMetric.key);
    }

    // Fill remaining slots up to maxCards
    if (cards.length < maxCards) {
      rowMetrics.sort((a, b) => b.total - a.total).forEach(m => {
        if (cards.length >= maxCards || usedKeys.has(m.key)) return;
        const isStanding = isStandingAudienceMetric(m.fullText);
        const val = isStanding ? m.latest : m.total;
        cards.push({
          key: m.key,
          title: m.label,
          value: formatMetricOrNumber(val),
          subtitle: isStanding ? 'latest active count' : 'total logged',
          change: m.change,
          isPositive: m.isPositive,
          icon: isStanding ? Users : TrendingUp,
          iconBg: isStanding ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
          iconColor: isStanding ? '#38BDF8' : '#6366F1'
        });
        usedKeys.add(m.key);
      });
    }

    return cards.slice(0, maxCards);
  }

  // ── STANDARD FORMAT: Columns = metrics, Rows = dates ─────────────────────
  const numericCols = columns.filter(c => c.type !== 'date' && c.type !== 'text');
  if (numericCols.length === 0) return [];

  const cards = [];
  const usedKeys = new Set();

  // 1. Primary Volume column (Reach / Views / Impressions / Sessions / Delivered)
  const volumeCol = numericCols.find(c => {
    const l = c.label.toLowerCase();
    return l.includes('reach') || l.includes('view') || l.includes('impression') || l.includes('session') || l.includes('delivered');
  });
  if (volumeCol && !usedKeys.has(volumeCol.key)) {
    const total = rawRows.reduce((sum, r) => sum + (cleanNumericValue(r[volumeCol.key]) || 0), 0);
    const volChange = computeStandardColChange(rawRows, volumeCol.key);
    cards.push({
      key: volumeCol.key,
      title: volumeCol.label,
      value: volumeCol.type === 'currency' ? `₹${total.toLocaleString()}` : formatMetricOrNumber(total),
      subtitle: `cumulative ${volumeCol.label.toLowerCase()}`,
      change: volChange.change, isPositive: volChange.isPositive,
      icon: Eye, iconBg: `${themeColor}22`, iconColor: themeColor
    });
    usedKeys.add(volumeCol.key);
  }

  // 2. Spend / Currency column
  const spendCol = numericCols.find(c => {
    const l = c.label.toLowerCase();
    return (c.type === 'currency' || l.includes('spend') || l.includes('budget') || l.includes('cost') || l.includes('inr')) && !usedKeys.has(c.key);
  });
  if (spendCol && !usedKeys.has(spendCol.key)) {
    const totalSpend = rawRows.reduce((sum, r) => sum + (cleanNumericValue(r[spendCol.key]) || 0), 0);
    const spdChange = computeStandardColChange(rawRows, spendCol.key);
    cards.push({
      key: spendCol.key,
      title: spendCol.label,
      value: `₹${totalSpend.toLocaleString()}`,
      subtitle: 'total amount spent',
      change: spdChange.change, isPositive: spdChange.isPositive,
      icon: IndianRupee, iconBg: 'rgba(245, 158, 11, 0.15)', iconColor: '#F59E0B'
    });
    usedKeys.add(spendCol.key);
  }

  // 3. Action / Engagement column (Interactions / Conversions / Clicks / Leads / Reactions / Watch Time / Engagement)
  const actionCol = numericCols.find(c => {
    const l = c.label.toLowerCase();
    return (l.includes('conversion') || l.includes('lead') || l.includes('click') || l.includes('engagement') || l.includes('interaction') || l.includes('reaction') || l.includes('reply') || l.includes('watch') || l.includes('hour')) && !usedKeys.has(c.key);
  });
  if (actionCol && !usedKeys.has(actionCol.key)) {
    const totalAction = rawRows.reduce((sum, r) => sum + (cleanNumericValue(r[actionCol.key]) || 0), 0);
    const actChange = computeStandardColChange(rawRows, actionCol.key);
    cards.push({
      key: actionCol.key,
      title: actionCol.label,
      value: formatMetricOrNumber(totalAction),
      subtitle: 'user actions recorded',
      change: actChange.change, isPositive: actChange.isPositive,
      icon: Target, iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10B981'
    });
    usedKeys.add(actionCol.key);
  }

  // 4. Standing Audience Base (Total Subscribers / Total Followers / Total Likes / Total Page Likes / Audience / Balance)
  const standingAudienceCol = numericCols.find(c => isStandingAudienceMetric(c.label) && !usedKeys.has(c.key));
  if (standingAudienceCol && !usedKeys.has(standingAudienceCol.key)) {
    const latestVal = getLatestNumericValue(rawRows, standingAudienceCol.key);
    const audChange = computeStandardColChange(rawRows, standingAudienceCol.key);
    cards.push({
      key: standingAudienceCol.key,
      title: standingAudienceCol.label,
      value: formatMetricOrNumber(latestVal),
      subtitle: 'latest active count',
      change: audChange.change, isPositive: audChange.isPositive,
      icon: Users, iconBg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8'
    });
    usedKeys.add(standingAudienceCol.key);
  }

  // 5. Incremental Growth (New Subscribers / New Followers / New Likes / Net Growth)
  const growthCol = numericCols.find(c => {
    const l = c.label.toLowerCase();
    return (l.includes('follower') || l.includes('subscriber') || l.includes('like') || l.includes('fan') || l.includes('member')) && isIncrementalMetric(c.label) && !usedKeys.has(c.key);
  });
  if (growthCol && !usedKeys.has(growthCol.key)) {
    const totalGrowth = rawRows.reduce((sum, r) => sum + (cleanNumericValue(r[growthCol.key]) || 0), 0);
    const grwChange = computeStandardColChange(rawRows, growthCol.key);
    cards.push({
      key: growthCol.key,
      title: growthCol.label,
      value: formatMetricOrNumber(totalGrowth),
      subtitle: `total ${growthCol.label.toLowerCase()}`,
      change: grwChange.change, isPositive: grwChange.isPositive,
      icon: TrendingUp, iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10B981'
    });
    usedKeys.add(growthCol.key);
  }

  // 6. Rate or Percent column
  const rateCol = numericCols.find(c => isRateOrPercentMetric(c, c.label) && !usedKeys.has(c.key));
  if (rateCol && !usedKeys.has(rateCol.key)) {
    const valid = rawRows.map(r => cleanNumericValue(r[rateCol.key])).filter(n => !isNaN(n) && n > 0);
    const avg = valid.length > 0 ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) : '0';
    const rateChange = computeStandardColChange(rawRows, rateCol.key);
    cards.push({
      key: rateCol.key,
      title: rateCol.label,
      value: `${avg}%`,
      subtitle: 'average performance rate',
      change: rateChange.change, isPositive: rateChange.isPositive,
      icon: Percent, iconBg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8'
    });
    usedKeys.add(rateCol.key);
  }

  // Fill remaining slots up to maxCards
  if (cards.length < maxCards) {
    numericCols.forEach(col => {
      if (cards.length >= maxCards || usedKeys.has(col.key)) return;
      const isStanding = isStandingAudienceMetric(col.label);
      const isPercent = isRateOrPercentMetric(col, col.label);
      const colChange = computeStandardColChange(rawRows, col.key);

      if (isPercent) {
        const valid = rawRows.map(r => cleanNumericValue(r[col.key])).filter(n => !isNaN(n) && n > 0);
        const avg = valid.length > 0 ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) : '0';
        cards.push({
          key: col.key,
          title: col.label,
          value: `${avg}%`,
          subtitle: 'average rate',
          change: colChange.change, isPositive: colChange.isPositive,
          icon: Percent, iconBg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8'
        });
      } else if (isStanding) {
        const latestVal = getLatestNumericValue(rawRows, col.key);
        cards.push({
          key: col.key,
          title: col.label,
          value: formatMetricOrNumber(latestVal),
          subtitle: 'latest active count',
          change: colChange.change, isPositive: colChange.isPositive,
          icon: Users, iconBg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8'
        });
      } else {
        const sum = rawRows.reduce((s, r) => s + (cleanNumericValue(r[col.key]) || 0), 0);
        cards.push({
          key: col.key,
          title: col.label,
          value: col.type === 'currency' ? `₹${sum.toLocaleString()}` : formatMetricOrNumber(sum),
          subtitle: 'total logged',
          change: colChange.change, isPositive: colChange.isPositive,
          icon: TrendingUp, iconBg: 'rgba(99, 102, 241, 0.15)', iconColor: '#6366F1'
        });
      }
      usedKeys.add(col.key);
    });
  }

  return cards.slice(0, maxCards);
}

/**
 * computeManualTabKpiCards
 * Generates Channel Insight cards dynamically based on user/admin selected rows and columns.
 *
 * @param {Array} rawRows - raw spreadsheet rows
 * @param {Array} columns - column definitions with key and label
 * @param {string} themeColor - tab theme color
 * @param {Array<string>|null} selectedRowKeys - row metric labels selected for insights
 * @param {Array<string>|null} selectedColKeys - column keys selected for calculation
 * @returns {Array} array of MetricCard descriptor objects
 */
export function computeManualTabKpiCards(rawRows, columns, themeColor = '#6366F1', selectedRowKeys = null, selectedColKeys = null) {
  if (!rawRows || rawRows.length === 0 || !columns || columns.length === 0) return [];
  // Strict manual selection: If no rows are explicitly selected by the user, generate NO cards.
  if (!selectedRowKeys || !Array.isArray(selectedRowKeys) || selectedRowKeys.length === 0) return [];

  const isWide = columns.filter(c => isPeriodOrMonthHeader(c.label)).length >= 2;

  if (isWide) {
    const allMonthCols = columns.filter(c => isPeriodOrMonthHeader(c.label));
    const activeCols = (selectedColKeys && selectedColKeys.length > 0)
      ? allMonthCols.filter(c => selectedColKeys.includes(c.key))
      : allMonthCols;

    if (activeCols.length === 0) return [];

    // Find descriptor column key (e.g. "Key Metrics", "Metric Name", etc.)
    const firstRow = rawRows[0] || {};
    const descriptorKey = Object.keys(firstRow).find(k => k !== '_rowId' && !isPeriodOrMonthHeader(k)) || Object.keys(firstRow)[0];

    const cards = [];

    rawRows.forEach(row => {
      const rowLabel = String(row[descriptorKey] || '').trim();
      if (!rowLabel || rowLabel.toLowerCase() === 'row totals' || rowLabel.toLowerCase() === 'total') return;

      // Only include rows explicitly chosen by the user
      const isSelected = selectedRowKeys.some(k => k.trim().toLowerCase() === rowLabel.toLowerCase() || slugify(k) === slugify(rowLabel));

      if (!isSelected) return;

      const fullText = (rowLabel + ' ' + Object.values(row).filter(v => typeof v === 'string').join(' ')).toLowerCase();
      const isIncremental = isIncrementalMetric(rowLabel) || isIncrementalMetric(fullText);
      const isBalance = !isIncremental && (isStandingAudienceMetric(rowLabel) || isStandingAudienceMetric(fullText));

      // Compute metric value across activeCols
      let val = 0;
      if (isBalance) {
        // Balance/stock metric: take latest non-empty value in activeCols
        for (let i = activeCols.length - 1; i >= 0; i--) {
          const cell = row[activeCols[i].key];
          if (cell !== undefined && cell !== null && String(cell).trim() !== '' && String(cell).trim() !== '-') {
            const num = cleanNumericValue(cell);
            if (!isNaN(num) && num > 0) {
              val = num;
              break;
            }
          }
        }
      } else {
        // Flow metric: sum across all activeCols
        activeCols.forEach(col => {
          const cell = row[col.key];
          if (cell !== undefined && cell !== null && String(cell).trim() !== '' && String(cell).trim() !== '-') {
            const num = cleanNumericValue(cell);
            if (!isNaN(num)) val += num;
          }
        });
      }

      // Format value & assign icon/colors
      let formattedValue = formatMetricOrNumber(val);
      let icon = Target;
      let iconBg = `${themeColor}22`;
      let iconColor = themeColor;

      if (fullText.includes('spend') || fullText.includes('cost') || fullText.includes('budget') || fullText.includes('price') || fullText.includes('amount') || fullText.includes('inr')) {
        formattedValue = `₹${val.toLocaleString()}`;
        icon = IndianRupee;
        iconBg = 'rgba(245, 158, 11, 0.15)';
        iconColor = '#F59E0B';
      } else if (isBalance || fullText.includes('follower') || fullText.includes('subscriber') || fullText.includes('fan') || fullText.includes('audience')) {
        formattedValue = formatMetricOrNumber(val);
        icon = Users;
        iconBg = 'rgba(99, 102, 241, 0.15)';
        iconColor = '#6366F1';
      } else if (fullText.includes('view') || fullText.includes('reach') || fullText.includes('impression')) {
        formattedValue = formatMetricOrNumber(val);
        icon = Eye;
        iconBg = 'rgba(16, 185, 129, 0.15)';
        iconColor = '#10B981';
      } else if (fullText.includes('rate') || fullText.includes('%')) {
        formattedValue = `${val.toFixed(1)}%`;
        icon = Percent;
        iconBg = 'rgba(168, 85, 247, 0.15)';
        iconColor = '#A855F7';
      }

      // Dynamic Trend & MoM / Period-over-Period Percentage Calculation
      let changeData = { change: null, isPositive: true };
      let subtitle = '';

      if (activeCols.length === 1) {
        // Single selected month (e.g. Aug-26)
        const selectedCol = activeCols[0];
        const currentIdx = allMonthCols.findIndex(c => c.key === selectedCol.key);
        const currVal = isBalance ? val : cleanNumericValue(row[selectedCol.key]);

        if (currentIdx > 0) {
          const prevCol = allMonthCols[currentIdx - 1];
          const prevVal = cleanNumericValue(row[prevCol.key]);
          changeData = computeChangeFromValues(currVal, prevVal);
          subtitle = `${selectedCol.label} · vs ${prevCol.label}`;
        } else {
          subtitle = `${selectedCol.label}`;
        }
      } else if (activeCols.length > 1) {
        // Multi-month selected window (e.g. 2, 3, 4, or all recorded months)
        const firstCol = activeCols[0];
        const lastCol = activeCols[activeCols.length - 1];
        const firstIdx = allMonthCols.findIndex(c => c.key === firstCol.key);
        const windowLen = activeCols.length;

        if (isBalance) {
          // Standing balance / stock metric (e.g. Total Followers)
          // Compare ending balance with initial balance at start of window
          const startVal = cleanNumericValue(row[firstCol.key]);
          const endVal = val;
          if (startVal !== null && endVal !== null && !isNaN(startVal) && !isNaN(endVal) && startVal > 0) {
            changeData = computeChangeFromValues(endVal, startVal);
            subtitle = `${firstCol.label} – ${lastCol.label} · vs ${firstCol.label}`;
          } else {
            subtitle = `${firstCol.label} – ${lastCol.label} (${windowLen} mos)`;
          }
        } else {
          // Flow / cumulative metric (Views, Reach, Spend, New Followers, etc.)
          // 1. If an equivalent prior period of same length exists, compare total vs prior period
          if (firstIdx >= windowLen) {
            const prevCols = allMonthCols.slice(firstIdx - windowLen, firstIdx);
            let prevSum = 0;
            let hasValid = false;
            prevCols.forEach(c => {
              const num = cleanNumericValue(row[c.key]);
              if (!isNaN(num)) {
                prevSum += num;
                hasValid = true;
              }
            });

            if (hasValid && prevSum > 0) {
              changeData = computeChangeFromValues(val, prevSum);
              subtitle = `${firstCol.label} – ${lastCol.label} · vs prior ${windowLen} mos`;
            } else {
              const firstVal = cleanNumericValue(row[firstCol.key]);
              const lastVal = cleanNumericValue(row[lastCol.key]);
              changeData = computeChangeFromValues(lastVal, firstVal);
              subtitle = `${firstCol.label} – ${lastCol.label} · vs ${firstCol.label}`;
            }
          } else if (firstIdx > 0) {
            // Partial prior period available: compare monthly averages
            const prevCols = allMonthCols.slice(0, firstIdx);
            let prevSum = 0;
            let hasValid = false;
            prevCols.forEach(c => {
              const num = cleanNumericValue(row[c.key]);
              if (!isNaN(num)) {
                prevSum += num;
                hasValid = true;
              }
            });

            const currAvg = val / windowLen;
            const prevAvg = prevSum / prevCols.length;
            if (hasValid && prevAvg > 0) {
              changeData = computeChangeFromValues(currAvg, prevAvg);
              subtitle = `${firstCol.label} – ${lastCol.label} · vs prior ${prevCols.length} mos avg`;
            } else {
              const firstVal = cleanNumericValue(row[firstCol.key]);
              const lastVal = cleanNumericValue(row[lastCol.key]);
              changeData = computeChangeFromValues(lastVal, firstVal);
              subtitle = `${firstCol.label} – ${lastCol.label} · vs ${firstCol.label}`;
            }
          } else {
            // Window starts at the first month (e.g. All 8 recorded months):
            // Show run-rate growth from starting month to ending month
            const firstVal = cleanNumericValue(row[firstCol.key]);
            const lastVal = cleanNumericValue(row[lastCol.key]);
            changeData = computeChangeFromValues(lastVal, firstVal);
            subtitle = `${firstCol.label} – ${lastCol.label} (${windowLen} mos) · vs ${firstCol.label}`;
          }
        }
      }

      cards.push({
        key: slugify(rowLabel),
        rowLabel,
        title: rowLabel,
        value: formattedValue,
        subtitle,
        change: changeData.change,
        isPositive: changeData.isPositive,
        icon,
        iconBg,
        iconColor
      });
    });

    return cards;
  }

  return [];
}

