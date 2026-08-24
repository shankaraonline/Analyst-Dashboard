import React, { useState } from 'react';
import { formatMetric } from '../../utils/spreadsheetParser';
import { InstagramIcon, YoutubeIcon, LinkedinIcon, FacebookIcon } from '../common/SocialIcons';

export default function SocialSpreadsheetTable({
  data = {},
  activePlatform = 'facebook',
  onSelectPlatform,
  showPlatformTabs = true
}) {
  const [selectedYear, setSelectedYear] = useState('All');

  const platformData = data[activePlatform] || [];

  // Filter rows by year if selected (e.g. '24', '25', '26')
  const filteredRows = platformData.filter(row => {
    if (selectedYear === 'All') return true;
    return row.month && row.month.endsWith(selectedYear);
  });

  // Helper for computing totals
  const sumField = (field) => {
    return filteredRows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
  };

  const latestVal = (field) => {
    for (let i = filteredRows.length - 1; i >= 0; i--) {
      if (filteredRows[i][field] !== null && filteredRows[i][field] !== undefined) {
        return filteredRows[i][field];
      }
    }
    return 0;
  };

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: 'var(--shadow-md)',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Top Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        {/* Platform Tabs (Only shown in Omnichannel Overview) */}
        {showPlatformTabs ? (
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            {[
              { id: 'facebook', label: 'Facebook', icon: FacebookIcon, color: '#1877F2' },
              { id: 'instagram', label: 'Instagram', icon: InstagramIcon, color: '#E1306C' },
              { id: 'youtube', label: 'YouTube', icon: YoutubeIcon, color: '#FF0000' },
              { id: 'linkedin', label: 'LinkedIn', icon: LinkedinIcon, color: '#0A66C2' }
            ].map(p => {
              const Icon = p.icon;
              const isAct = activePlatform === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPlatform && onSelectPlatform(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: isAct ? 'var(--bg-card)' : 'transparent',
                    color: isAct ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: isAct ? `1px solid ${p.color}55` : '1px solid transparent',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: isAct ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: isAct ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={16} color={p.color} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Monthly Performance Ledger
          </div>
        )}

        {/* Year Filter Buttons */}
        <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          {['All', '24', '25', '26'].map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              style={{
                background: selectedYear === y ? 'var(--bg-card)' : 'transparent',
                color: selectedYear === y ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                boxShadow: selectedYear === y ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer'
              }}
            >
              {y === 'All' ? 'All Months' : `20${y}`}
            </button>
          ))}
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
          {/* Header Row */}
          <thead>
            <tr style={{ background: 'var(--bg-table-header)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-primary)' }}>Months</th>

              {activePlatform === 'facebook' && (
                <>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Ad Spend (₹)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Views</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Reach</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Page Visits / Engagement</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>New Followers</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Total Page Likes</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Total Page Followers</th>
                </>
              )}

              {activePlatform === 'instagram' && (
                <>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Reach</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Views / Impressions</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Interactions</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Profile Visits</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Total Followers</th>
                </>
              )}

              {activePlatform === 'youtube' && (
                <>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Total Views</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Impressions</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Watch Time (Hrs)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>New Subscribers</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Total Subscribers</th>
                </>
              )}

              {activePlatform === 'linkedin' && (
                <>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Impressions</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Reactions</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Total Page Views</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>New Followers</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Total Followers</th>
                </>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>No rows found for this channel</div>
                  <div style={{ fontSize: '0.75rem' }}>Upload an Excel file or paste copied rows in the Admin panel.</div>
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  background: idx % 2 === 0 ? 'var(--bg-table-row-even)' : 'var(--bg-table-row-odd)'
                }}
              >
                {/* Month Name */}
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#38BDF8' }}>
                  {row.month}
                </td>

                {/* Facebook Fields */}
                {activePlatform === 'facebook' && (
                  <>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {row.adSpend !== null && row.adSpend !== undefined ? (row.adSpend === 0 ? '₹0' : `₹${row.adSpend.toLocaleString()}`) : '-'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                      {row.views ? formatMetric(row.views) : '-'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#10B981' }}>
                      {formatMetric(row.reach)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                      {row.pageVisits ? `${formatMetric(row.pageVisits)} visits` : (row.engagement ? `${formatMetric(row.engagement)} eng` : '-')}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#38BDF8', fontWeight: 700 }}>
                      +{row.newFollowers || 0}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {row.totalPageLikes ? row.totalPageLikes.toLocaleString() : '-'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {row.totalPageFollowers ? row.totalPageFollowers.toLocaleString() : '-'}
                    </td>
                  </>
                )}

                {/* Instagram Fields */}
                {activePlatform === 'instagram' && (
                  <>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#10B981' }}>
                      {formatMetric(row.reach)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                      {row.views ? formatMetric(row.views) : (row.impressions ? formatMetric(row.impressions) : '-')}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#E1306C', fontWeight: 600 }}>
                      {formatMetric(row.interactions)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                      {row.profileVisits ? formatMetric(row.profileVisits) : '-'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {row.totalFollowers ? row.totalFollowers.toLocaleString() : '-'}
                    </td>
                  </>
                )}

                {/* YouTube Fields */}
                {activePlatform === 'youtube' && (
                  <>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#FF4444' }}>
                      {formatMetric(row.totalViews)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                      {formatMetric(row.impressions)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#F59E0B' }}>
                      {row.watchTimeHours} hrs
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#10B981', fontWeight: 700 }}>
                      +{row.newSubscribers}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {row.totalSubscribers ? row.totalSubscribers.toLocaleString() : '-'}
                    </td>
                  </>
                )}

                {/* LinkedIn Fields */}
                {activePlatform === 'linkedin' && (
                  <>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#0A66C2' }}>
                      {formatMetric(row.impressions)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#38BDF8' }}>
                      {row.reactions}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                      {row.totalPageViews}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#10B981', fontWeight: 700 }}>
                      +{row.newFollowers}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {row.totalFollowers ? row.totalFollowers.toLocaleString() : '-'}
                    </td>
                  </>
                )}
              </tr>
            )))}
          </tbody>

          {/* Totals / Summary Row */}
          <tfoot>
            <tr style={{ background: 'var(--bg-table-footer)', borderTop: '2px solid var(--border-color)', fontWeight: 800 }}>
              <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>TOTAL / LATEST</td>

              {activePlatform === 'facebook' && (
                <>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#F59E0B' }}>
                    ₹{sumField('adSpend').toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {formatMetric(sumField('views'))}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#10B981' }}>
                    {formatMetric(sumField('reach'))}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {formatMetric(sumField('pageVisits') || sumField('engagement'))}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#38BDF8' }}>
                    +{sumField('newFollowers').toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {latestVal('totalPageLikes')?.toLocaleString() || '-'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {latestVal('totalPageFollowers')?.toLocaleString()}
                  </td>
                </>
              )}

              {activePlatform === 'instagram' && (
                <>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#10B981' }}>
                    {formatMetric(sumField('reach'))}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {formatMetric(sumField('views') || sumField('impressions'))}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#E1306C' }}>
                    {formatMetric(sumField('interactions'))}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {formatMetric(sumField('profileVisits'))}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {latestVal('totalFollowers')?.toLocaleString()}
                  </td>
                </>
              )}

              {activePlatform === 'youtube' && (
                <>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#FF4444' }}>
                    {formatMetric(sumField('totalViews'))}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {formatMetric(sumField('impressions'))}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#F59E0B' }}>
                    {sumField('watchTimeHours').toLocaleString()} hrs
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#10B981' }}>
                    +{sumField('newSubscribers').toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {latestVal('totalSubscribers')?.toLocaleString()}
                  </td>
                </>
              )}

              {activePlatform === 'linkedin' && (
                <>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0A66C2' }}>
                    {formatMetric(sumField('impressions'))}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#38BDF8' }}>
                    {sumField('reactions')}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {sumField('totalPageViews')}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#10B981' }}>
                    +{sumField('newFollowers')}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {latestVal('totalFollowers')}
                  </td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
