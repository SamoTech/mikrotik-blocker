import React from 'react';

export default function StatsBar({ stats }) {
  if (!stats) return null;

  const items = [
    { label: 'Domains',    value: stats.totalDomains,  color: 'var(--text)',    icon: '🌐' },
    { label: 'CIDR v4',   value: stats.totalCIDRs,    color: 'var(--primary)', icon: '📊' },
    { label: 'CIDR v6',   value: stats.totalCIDRsV6,  color: '#9b59b6',       icon: '🟣' },
    { label: 'IPs v4',    value: stats.totalIPs,      color: 'var(--success)', icon: '🔵' },
    { label: 'IPs v6',    value: stats.totalIPsV6,    color: '#2ecc71',       icon: '🟢' },
    { label: 'ASN Match', value: stats.asnResolved,   color: 'var(--warning)', icon: '⚡' },
    { label: 'Failed',    value: stats.failed,        color: stats.failed > 0 ? 'var(--danger)' : 'var(--text-muted)', icon: stats.failed > 0 ? '❌' : '✔️' },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
      gap: '0.5rem',
      marginBottom: '1rem',
    }}>
      {items.map(item => (
        <div key={item.label} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '0.6rem 0.5rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.1rem' }}>{item.icon}</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: item.color, lineHeight: 1.2 }}>
            {item.value ?? 0}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
