import React from 'react';

export default function StatsBar({ stats }) {
  if (!stats) return null;

  const items = [
    { label: 'Domains',    value: stats.totalDomains,  icon: '🌐', color: 'var(--primary)' },
    { label: 'CIDR v4',   value: stats.totalCIDRs,    icon: '📊', color: '#5b8def' },
    { label: 'CIDR v6',   value: stats.totalCIDRsV6,  icon: '🟣', color: '#9b59b6' },
    { label: 'IPv4',       value: stats.totalIPs,      icon: '🔵', color: '#3498db' },
    { label: 'IPv6',       value: stats.totalIPsV6,    icon: '🟢', color: '#27ae60' },
    { label: 'ASN Match',  value: stats.asnResolved,   icon: '⚡', color: '#f0a500' },
    { label: 'CNAMEs',     value: stats.cnamesFound,   icon: '🔗', color: '#1abc9c' },
    { label: 'L7 Rules',   value: stats.layer7Rules,   icon: '🔍', color: '#e05252' },
    { label: 'Failed',     value: stats.failed,        icon: stats.failed > 0 ? '❌' : '✅', color: stats.failed > 0 ? '#e05252' : '#27ae60' },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
      gap: '0.5rem',
      marginBottom: '1rem',
    }}>
      {items.map(item => (
        <div key={item.label} style={{
          background: 'var(--surface)',
          border: `1px solid var(--border)`,
          borderRadius: '8px',
          padding: '0.5rem 0.4rem',
          textAlign: 'center',
          transition: 'border-color 0.2s',
          borderTop: `2px solid ${item.color}`,
        }}>
          <div style={{ fontSize: '1.1rem' }}>{item.icon}</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: item.color, lineHeight: 1.1 }}>
            {item.value ?? 0}
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
