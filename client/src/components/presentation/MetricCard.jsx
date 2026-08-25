import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function MetricCard({
  title,
  value,
  subtitle,
  change = '+16.8%',
  isPositive = true,
  icon: Icon,
  iconBg = 'rgba(56, 189, 248, 0.12)',
  iconColor = '#38BDF8'
}) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '130px',
        position: 'relative',
        boxShadow: 'var(--shadow-md)',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}
        >
          {title}
        </span>

        {Icon && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: iconColor,
              flexShrink: 0
            }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      {/* Main Big Number */}
      <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 12px', letterSpacing: '-0.02em' }}>
        {value}
      </div>

      {/* Bottom Footer with Badge and Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: isPositive ? '#10B981' : '#EF4444',
            background: isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            padding: '2px 8px',
            borderRadius: '6px'
          }}
        >
          {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {change}
        </span>
        {subtitle && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
