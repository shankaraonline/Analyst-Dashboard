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
  style = {}
}) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        minHeight: '155px',
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: 'var(--shadow-md)',
        transition: 'all 0.2s ease',
        ...style
      }}
    >
      {/* Top Header with uniform height */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', minHeight: '34px' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            lineHeight: 1.35,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
          title={title}
        >
          {title}
        </span>

        {Icon && (
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
      <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 10px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        {value}
      </div>

      {/* Bottom Footer with Badge and single-line ellipsis Subtitle for uniform height */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', minHeight: '22px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: isPositive ? '#10B981' : '#EF4444',
            background: isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            padding: '2px 7px',
            borderRadius: '6px',
            flexShrink: 0
          }}
        >
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </span>
        {subtitle && (
          <span
            style={{
              fontSize: '0.72rem',
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
