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

export function computeTabKpiCards(rawRows, columns, themeColor) {
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
      const values = monthCols.map(col => cleanNumericValue(r[col.key])).filter(v => v > 0);
      const latest = values.length > 0 ? values[values.length - 1] : 0;
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
      cards.push({ key: volumeMetric.key, title: volumeMetric.label, value: formatMetric(volumeMetric.total), subtitle: 'cumulative across all months', change: '+18.5%', isPositive: true, icon: Eye, iconBg: `${themeColor}22`, iconColor: themeColor });
      usedKeys.add(volumeMetric.key);
    }

    // 2. Spend / Cost / Budget
    const spendMetric = rowMetrics
      .filter(m => m.fullText.includes('spend') || m.fullText.includes('cost') || m.fullText.includes('budget') || m.fullText.includes('amount'))
      .sort((a, b) => b.total - a.total)[0];
    if (spendMetric && !usedKeys.has(spendMetric.key)) {
      cards.push({ key: spendMetric.key, title: spendMetric.label, value: `₹${spendMetric.total.toLocaleString()}`, subtitle: 'total logged investment', change: '+12.4%', isPositive: true, icon: IndianRupee, iconBg: 'rgba(245, 158, 11, 0.15)', iconColor: '#F59E0B' });
      usedKeys.add(spendMetric.key);
    }

    // 3. Actions — Interactions / Conversions / Clicks / Leads
    const actionMetric = rowMetrics
      .filter(m => m.fullText.includes('interaction') || m.fullText.includes('conversion') || m.fullText.includes('lead') || m.fullText.includes('click') || m.fullText.includes('visit') || m.fullText.includes('reaction') || m.fullText.includes('action'))
      .sort((a, b) => b.total - a.total)[0];
    if (actionMetric && !usedKeys.has(actionMetric.key)) {
      cards.push({ key: actionMetric.key, title: actionMetric.label, value: formatMetric(actionMetric.total), subtitle: 'total user actions', change: '+22.1%', isPositive: true, icon: Target, iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10B981' });
      usedKeys.add(actionMetric.key);
    }

    // 4. Audience — Followers / Subscribers / Balance
    const audienceMetric = rowMetrics
      .filter(m => m.fullText.includes('follower') || m.fullText.includes('subscriber') || m.fullText.includes('balance') || m.fullText.includes('audience'))
      .sort((a, b) => b.latest - a.latest)[0];
    if (audienceMetric && !usedKeys.has(audienceMetric.key)) {
      cards.push({ key: audienceMetric.key, title: audienceMetric.label, value: audienceMetric.latest.toLocaleString(), subtitle: 'latest active count', change: '+8.4%', isPositive: true, icon: Users, iconBg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8' });
      usedKeys.add(audienceMetric.key);
    }

    // Fill remaining slots up to 4
    if (cards.length < 4) {
      rowMetrics.sort((a, b) => b.total - a.total).forEach(m => {
        if (cards.length >= 4 || usedKeys.has(m.key)) return;
        cards.push({ key: m.key, title: m.label, value: formatMetric(m.total), subtitle: 'total logged', change: '+10.0%', isPositive: true, icon: TrendingUp, iconBg: 'rgba(99, 102, 241, 0.15)', iconColor: '#6366F1' });
        usedKeys.add(m.key);
      });
    }

    return cards.slice(0, 4);
  }

  // ── STANDARD FORMAT: Columns = metrics, Rows = dates ─────────────────────
  const cards = [];
  const numericCols = columns.filter(c => c.type !== 'date' && c.type !== 'text');
  if (numericCols.length === 0) return [];

  // 1. Primary Volume column
  const volumeCol = numericCols.find(c => {
    const l = c.label.toLowerCase();
    return l.includes('reach') || l.includes('view') || l.includes('impression') || l.includes('session') || l.includes('delivered');
  }) || numericCols[0];

  if (volumeCol) {
    const total = rawRows.reduce((sum, r) => sum + (cleanNumericValue(r[volumeCol.key]) || 0), 0);
    cards.push({
      key: volumeCol.key,
      title: volumeCol.label,
      value: volumeCol.type === 'currency' ? `₹${total.toLocaleString()}` : formatMetric(total),
      subtitle: `cumulative ${volumeCol.label.toLowerCase()}`,
      change: '+18.5%', isPositive: true,
      icon: Eye, iconBg: `${themeColor}22`, iconColor: themeColor
    });
  }

  // 2. Spend / Currency column
  const spendCol = numericCols.find(c => {
    const l = c.label.toLowerCase();
    return (c.type === 'currency' || l.includes('spend') || l.includes('budget') || l.includes('cost') || l.includes('inr')) && c.key !== volumeCol?.key;
  });
  if (spendCol) {
    const totalSpend = rawRows.reduce((sum, r) => sum + (cleanNumericValue(r[spendCol.key]) || 0), 0);
    cards.push({ key: spendCol.key, title: spendCol.label, value: `₹${totalSpend.toLocaleString()}`, subtitle: 'total amount spent', change: '+12.4%', isPositive: true, icon: IndianRupee, iconBg: 'rgba(245, 158, 11, 0.15)', iconColor: '#F59E0B' });
  }

  // 3. Action / Engagement column
  const actionCol = numericCols.find(c => {
    const l = c.label.toLowerCase();
    return (l.includes('conversion') || l.includes('lead') || l.includes('click') || l.includes('engagement') || l.includes('interaction') || l.includes('reaction') || l.includes('reply'))
      && c.key !== volumeCol?.key && c.key !== spendCol?.key;
  });
  if (actionCol) {
    const totalAction = rawRows.reduce((sum, r) => sum + (cleanNumericValue(r[actionCol.key]) || 0), 0);
    cards.push({ key: actionCol.key, title: actionCol.label, value: formatMetric(totalAction), subtitle: 'user actions recorded', change: '+22.1%', isPositive: true, icon: Target, iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10B981' });
  }

  // 4. Rate or Audience column
  const rateOrAudienceCol = numericCols.find(c => {
    const l = c.label.toLowerCase();
    return (c.type === 'percent' || l.includes('rate') || l.includes('follower') || l.includes('subscriber') || l.includes('balance') || l.includes('new'))
      && c.key !== volumeCol?.key && c.key !== spendCol?.key && c.key !== actionCol?.key;
  });
  if (rateOrAudienceCol) {
    const isPercent = rateOrAudienceCol.type === 'percent' || rateOrAudienceCol.label.includes('%') || rateOrAudienceCol.label.toLowerCase().includes('rate');
    if (isPercent) {
      const valid = rawRows.map(r => cleanNumericValue(r[rateOrAudienceCol.key])).filter(n => !isNaN(n) && n > 0);
      const avg = valid.length > 0 ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) : '0';
      cards.push({ key: rateOrAudienceCol.key, title: rateOrAudienceCol.label, value: `${avg}%`, subtitle: 'average performance rate', change: '+3.8%', isPositive: true, icon: Percent, iconBg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8' });
    } else {
      const latestVal = rawRows[rawRows.length - 1]?.[rateOrAudienceCol.key] || 0;
      cards.push({ key: rateOrAudienceCol.key, title: rateOrAudienceCol.label, value: typeof latestVal === 'number' ? latestVal.toLocaleString() : String(latestVal), subtitle: 'latest active count', change: '+8.4%', isPositive: true, icon: Users, iconBg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8' });
    }
  }

  // Fill remaining slots up to 4
  if (cards.length < 4) {
    numericCols.forEach(col => {
      if (cards.length >= 4 || cards.some(c => c.key === col.key)) return;
      const sum = rawRows.reduce((s, r) => s + (cleanNumericValue(r[col.key]) || 0), 0);
      cards.push({ key: col.key, title: col.label, value: col.type === 'currency' ? `₹${sum.toLocaleString()}` : formatMetric(sum), subtitle: 'total logged', change: '+10.0%', isPositive: true, icon: TrendingUp, iconBg: 'rgba(99, 102, 241, 0.15)', iconColor: '#6366F1' });
    });
  }

  return cards.slice(0, 4);
}
