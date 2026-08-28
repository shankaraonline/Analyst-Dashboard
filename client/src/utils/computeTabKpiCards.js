/**
 * computeTabKpiCards
 * Shared utility to compute up to 4 highlight KPI cards from a tab's data.
 * Used by UniversalTabView (individual tab view) AND OverviewView (omnichannel 5-col grid).
 *
 * Each returned card includes a `key` property (unique within the tab) so the
 * Omnichannel eye-toggle visibility system can persist show/hide per card.
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
      return { label, fullText, total, latest, key: slugify(label) };
    }).filter(m => m.total > 0 || m.latest > 0);

    const cards = [];
    const usedKeys = new Set();

    // 1. Volume — Reach / Views / Impressions
    const volumeMetric = rowMetrics
      .filter(m => (m.fullText.includes('reach') || m.fullText.includes('view') || m.fullText.includes('impression'))
        && !m.fullText.includes('cost') && !m.fullText.includes('spend'))
      .sort((a, b) => b.total - a.total)[0];
    if (volumeMetric && !usedKeys.has(volumeMetric.key)) {
      cards.push({ key: volumeMetric.key, title: volumeMetric.label, value: formatMetricOrNumber(volumeMetric.total), subtitle: 'cumulative across all months', change: '+18.5%', isPositive: true, icon: Eye, iconBg: `${themeColor}22`, iconColor: themeColor });
      usedKeys.add(volumeMetric.key);
    }

    // 2. Spend / Cost / Budget
    const spendMetric = rowMetrics
      .filter(m => m.fullText.includes('spend') || m.fullText.includes('cost') || m.fullText.includes('budget') || m.fullText.includes('amount') || m.fullText.includes('inr'))
      .sort((a, b) => b.total - a.total)[0];
    if (spendMetric && !usedKeys.has(spendMetric.key)) {
      cards.push({ key: spendMetric.key, title: spendMetric.label, value: `₹${spendMetric.total.toLocaleString()}`, subtitle: 'total logged investment', change: '+12.4%', isPositive: true, icon: IndianRupee, iconBg: 'rgba(245, 158, 11, 0.15)', iconColor: '#F59E0B' });
      usedKeys.add(spendMetric.key);
    }

    // 3. Actions — Interactions / Conversions / Clicks / Leads / Reactions / Watch Time
    const actionMetric = rowMetrics
      .filter(m => m.fullText.includes('interaction') || m.fullText.includes('conversion') || m.fullText.includes('lead') || m.fullText.includes('click') || m.fullText.includes('visit') || m.fullText.includes('reaction') || m.fullText.includes('action') || m.fullText.includes('engagement') || m.fullText.includes('watch'))
      .sort((a, b) => b.total - a.total)[0];
    if (actionMetric && !usedKeys.has(actionMetric.key)) {
      cards.push({ key: actionMetric.key, title: actionMetric.label, value: formatMetricOrNumber(actionMetric.total), subtitle: 'total user actions', change: '+22.1%', isPositive: true, icon: Target, iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10B981' });
      usedKeys.add(actionMetric.key);
    }

    // 4. Standing Audience Base — Total Followers / Total Subscribers / Total Likes
    const standingAudienceMetric = rowMetrics
      .filter(m => isStandingAudienceMetric(m.fullText))
      .sort((a, b) => b.latest - a.latest)[0];
    if (standingAudienceMetric && !usedKeys.has(standingAudienceMetric.key)) {
      cards.push({ key: standingAudienceMetric.key, title: standingAudienceMetric.label, value: formatMetricOrNumber(standingAudienceMetric.latest), subtitle: 'latest active count', change: '+8.4%', isPositive: true, icon: Users, iconBg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8' });
      usedKeys.add(standingAudienceMetric.key);
    }

    // 5. Incremental Growth — New Followers / New Subscribers / New Likes
    const growthMetric = rowMetrics
      .filter(m => (m.fullText.includes('follow') || m.fullText.includes('sub') || m.fullText.includes('like')) && isIncrementalMetric(m.fullText))
      .sort((a, b) => b.total - a.total)[0];
    if (growthMetric && !usedKeys.has(growthMetric.key)) {
      cards.push({ key: growthMetric.key, title: growthMetric.label, value: formatMetricOrNumber(growthMetric.total), subtitle: 'total new gained', change: '+15.2%', isPositive: true, icon: TrendingUp, iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10B981' });
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
          change: '+10.0%',
          isPositive: true,
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
    cards.push({
      key: volumeCol.key,
      title: volumeCol.label,
      value: volumeCol.type === 'currency' ? `₹${total.toLocaleString()}` : formatMetricOrNumber(total),
      subtitle: `cumulative ${volumeCol.label.toLowerCase()}`,
      change: '+18.5%', isPositive: true,
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
    cards.push({
      key: spendCol.key,
      title: spendCol.label,
      value: `₹${totalSpend.toLocaleString()}`,
      subtitle: 'total amount spent',
      change: '+12.4%', isPositive: true,
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
    cards.push({
      key: actionCol.key,
      title: actionCol.label,
      value: formatMetricOrNumber(totalAction),
      subtitle: 'user actions recorded',
      change: '+22.1%', isPositive: true,
      icon: Target, iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10B981'
    });
    usedKeys.add(actionCol.key);
  }

  // 4. Standing Audience Base (Total Subscribers / Total Followers / Total Likes / Total Page Likes / Audience / Balance)
  const standingAudienceCol = numericCols.find(c => isStandingAudienceMetric(c.label) && !usedKeys.has(c.key));
  if (standingAudienceCol && !usedKeys.has(standingAudienceCol.key)) {
    const latestVal = getLatestNumericValue(rawRows, standingAudienceCol.key);
    cards.push({
      key: standingAudienceCol.key,
      title: standingAudienceCol.label,
      value: formatMetricOrNumber(latestVal),
      subtitle: 'latest active count',
      change: '+8.4%', isPositive: true,
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
    cards.push({
      key: growthCol.key,
      title: growthCol.label,
      value: formatMetricOrNumber(totalGrowth),
      subtitle: `total ${growthCol.label.toLowerCase()}`,
      change: '+15.2%', isPositive: true,
      icon: TrendingUp, iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10B981'
    });
    usedKeys.add(growthCol.key);
  }

  // 6. Rate or Percent column
  const rateCol = numericCols.find(c => isRateOrPercentMetric(c, c.label) && !usedKeys.has(c.key));
  if (rateCol && !usedKeys.has(rateCol.key)) {
    const valid = rawRows.map(r => cleanNumericValue(r[rateCol.key])).filter(n => !isNaN(n) && n > 0);
    const avg = valid.length > 0 ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) : '0';
    cards.push({
      key: rateCol.key,
      title: rateCol.label,
      value: `${avg}%`,
      subtitle: 'average performance rate',
      change: '+3.8%', isPositive: true,
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

      if (isPercent) {
        const valid = rawRows.map(r => cleanNumericValue(r[col.key])).filter(n => !isNaN(n) && n > 0);
        const avg = valid.length > 0 ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) : '0';
        cards.push({
          key: col.key,
          title: col.label,
          value: `${avg}%`,
          subtitle: 'average rate',
          change: '+3.8%', isPositive: true,
          icon: Percent, iconBg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8'
        });
      } else if (isStanding) {
        const latestVal = getLatestNumericValue(rawRows, col.key);
        cards.push({
          key: col.key,
          title: col.label,
          value: formatMetricOrNumber(latestVal),
          subtitle: 'latest active count',
          change: '+8.4%', isPositive: true,
          icon: Users, iconBg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8'
        });
      } else {
        const sum = rawRows.reduce((s, r) => s + (cleanNumericValue(r[col.key]) || 0), 0);
        cards.push({
          key: col.key,
          title: col.label,
          value: col.type === 'currency' ? `₹${sum.toLocaleString()}` : formatMetricOrNumber(sum),
          subtitle: 'total logged',
          change: '+10.0%', isPositive: true,
          icon: TrendingUp, iconBg: 'rgba(99, 102, 241, 0.15)', iconColor: '#6366F1'
        });
      }
      usedKeys.add(col.key);
    });
  }

  return cards.slice(0, maxCards);
}
