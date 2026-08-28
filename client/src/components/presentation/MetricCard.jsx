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
  iconColor = '#38BDF8',
  compact = false,
  style = {}
}) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: compact ? '12px' : '16px',
        padding: compact ? '10px 10px' : '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        minHeight: compact ? '92px' : '155px',
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: 'var(--shadow-md)',
        transition: 'all 0.2s ease',
        ...style
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px', minHeight: compact ? '20px' : '34px' }}>
        <span
          style={{
            fontSize: compact ? '0.62rem' : '0.72rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.2,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
          title={title}
        >
          {title}
        </span>

        {!compact && Icon && (
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: iconColor,
              flexShrink: 0
            }}
          >
            <Icon size={17} />
          </div>
        )}
      </div>

      {/* Main Big Number */}
      <div style={{ fontSize: compact ? '1.2rem' : '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: compact ? '3px 0 5px' : '6px 0 10px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        {value}
      </div>

      {/* Bottom Footer with Badge and Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', minHeight: compact ? '16px' : '22px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1px',
            fontSize: compact ? '0.58rem' : '0.7rem',
            fontWeight: 700,
            color: isPositive ? '#10B981' : '#EF4444',
            background: isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            padding: compact ? '1px 4px' : '2px 7px',
            borderRadius: '4px',
            flexShrink: 0
          }}
        >
          {isPositive ? <ArrowUpRight size={compact ? 9 : 12} /> : <ArrowDownRight size={compact ? 9 : 12} />}
          {change}
        </span>
        {subtitle && (
          <span
            style={{
              fontSize: compact ? '0.58rem' : '0.72rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={subtitle}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
