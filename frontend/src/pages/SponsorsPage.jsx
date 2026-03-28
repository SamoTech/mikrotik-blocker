import React from 'react';
import PageShell from '../components/PageShell';

const TIERS = [
  {
    id: 'gold',
    label: '🥇 Gold Sponsors',
    color: '#f0a500',
    bg: 'rgba(240,165,0,0.07)',
    border: 'rgba(240,165,0,0.25)',
    perks: ['Logo in README + app header', 'Priority feature requests', 'Dedicated support channel'],
    price: '$100 / month',
    sponsors: [],
  },
  {
    id: 'silver',
    label: '🥈 Silver Sponsors',
    color: '#a0aec0',
    bg: 'rgba(160,174,192,0.07)',
    border: 'rgba(160,174,192,0.25)',
    perks: ['Name in README', 'Feature request priority', 'Monthly update emails'],
    price: '$25 / month',
    sponsors: [],
  },
  {
    id: 'backer',
    label: '💛 Backers',
    color: '#5b8def',
    bg: 'rgba(91,141,239,0.07)',
    border: 'rgba(91,141,239,0.2)',
    perks: ['Name in SPONSORS.md', 'Thank-you shoutout'],
    price: '$5 / month',
    sponsors: [],
  },
];

const LINKS = [
  { label: 'GitHub Sponsors', href: 'https://github.com/sponsors/SamoTech', icon: '💖', color: '#e05252' },
];

export default function SponsorsPage() {
  return (
    <PageShell title="Sponsors" icon="💛">
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
        MikroTik Blocker is free and open-source, built and maintained in spare time.
        If this tool saves you time or protects your network, consider supporting its development.
      </p>

      {/* Sponsor buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2.5rem' }}>
        {LINKS.map(l => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              border: `1px solid ${l.color}`,
              color: l.color,
              background: `${l.color}14`,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'background 0.15s',
            }}
          >
            {l.icon} {l.label}
          </a>
        ))}
      </div>

      {/* Tiers */}
      {TIERS.map(tier => (
        <div key={tier.id} style={{
          border: `1px solid ${tier.border}`,
          borderRadius: '12px',
          background: tier.bg,
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: tier.color, margin: 0 }}>{tier.label}</h2>
            <span style={{
              fontSize: '0.78rem', fontWeight: 600,
              background: `${tier.color}22`,
              color: tier.color,
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
            }}>{tier.price}</span>
          </div>

          <ul style={{ margin: '0.75rem 0 0.75rem 1rem', padding: 0, color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 2 }}>
            {tier.perks.map(p => <li key={p}>{p}</li>)}
          </ul>

          {tier.sponsors.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
              Be the first {tier.label.toLowerCase()} sponsor →
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {tier.sponsors.map(s => (
                <a key={s.name} href={s.url} target="_blank" rel="noreferrer" style={{
                  padding: '0.2rem 0.7rem', borderRadius: '6px',
                  background: 'var(--surface2)', color: 'var(--text)',
                  textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600,
                }}>{s.name}</a>
              ))}
            </div>
          )}
        </div>
      ))}

      <div style={{
        marginTop: '2rem', padding: '1rem 1.25rem',
        borderRadius: '10px', background: 'var(--surface)',
        border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)',
      }}>
        <strong style={{ color: 'var(--text)' }}>💡 Enterprise / custom sponsorship?</strong>
        &nbsp;Email us at{' '}
        <a href="mailto:samo.hossam@gmail.com" style={{ color: 'var(--primary)' }}>samo.hossam@gmail.com</a>
      </div>
    </PageShell>
  );
}
