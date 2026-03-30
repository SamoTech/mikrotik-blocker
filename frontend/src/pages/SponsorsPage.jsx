import React from 'react';
import PageShell from '../components/PageShell';

const TIERS = [
  {
    id: 'gold',
    label: '🥇 Gold Sponsor',
    color: '#f0a500',
    bg: 'rgba(240,165,0,0.07)',
    border: 'rgba(240,165,0,0.25)',
    perks: [
      'Logo + link in app header (seen on every page)',
      'Logo + link in GitHub README (top position)',
      'Priority feature requests',
      'Direct support channel',
      'Monthly usage report',
    ],
    price: '$100 / month',
    cta: 'Become Gold Sponsor',
    ctaHref: 'mailto:samo.hossam@gmail.com?subject=Gold%20Sponsorship%20%E2%80%94%20MikroTik%20Blocker&body=Hi%20Ossama%2C%0A%0AI%27m%20interested%20in%20the%20Gold%20sponsorship%20tier%20for%20MikroTik%20Blocker.%0A%0ACompany%3A%20%5Byour%20company%5D%0AWebsite%3A%20%5Byour%20website%5D%0A%0ALet%27s%20talk.',
    sponsors: [],
  },
  {
    id: 'silver',
    label: '🥈 Silver Sponsor',
    color: '#a0aec0',
    bg: 'rgba(160,174,192,0.07)',
    border: 'rgba(160,174,192,0.25)',
    perks: [
      'Name + link in GitHub README',
      'Name on Sponsors page',
      'Feature request priority',
    ],
    price: '$25 / month',
    cta: 'Become Silver Sponsor',
    ctaHref: 'mailto:samo.hossam@gmail.com?subject=Silver%20Sponsorship%20%E2%80%94%20MikroTik%20Blocker&body=Hi%20Ossama%2C%0A%0AI%27m%20interested%20in%20the%20Silver%20sponsorship%20tier.%0A%0AName%2FCompany%3A%20%5Byour%20name%5D%0AWebsite%3A%20%5Byour%20website%5D%0A%0AThanks.',
    sponsors: [],
  },
  {
    id: 'backer',
    label: '💛 Backer',
    color: '#5b8def',
    bg: 'rgba(91,141,239,0.07)',
    border: 'rgba(91,141,239,0.2)',
    perks: [
      'Name in SPONSORS.md',
      'Thank-you shoutout on social media',
    ],
    price: '$5 / month',
    cta: 'Sponsor on GitHub',
    ctaHref: 'https://github.com/sponsors/SamoTech',
    sponsors: [],
  },
];

const LINKS = [
  { label: 'GitHub Sponsors', href: 'https://github.com/sponsors/SamoTech', icon: '💖', color: '#e05252' },
];

const STATS = [
  { value: '100%', label: 'Free & Open Source' },
  { value: '0€',   label: 'Cost to users' },
  { value: '∞',    label: 'Networks protected' },
];

export default function SponsorsPage() {
  return (
    <PageShell title="Support MikroTik Blocker" icon="💛">

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {STATS.map(s => (
          <div key={s.label} style={{
            flex: '1 1 100px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '0.9rem 1rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: '2rem' }}>
        MikroTik Blocker is free and open-source, built and maintained in spare time.
        If this tool saves you time or protects your network, consider supporting its development.
        Sponsors get visibility in front of <strong>network engineers and MikroTik admins</strong> worldwide.
      </p>

      {/* GitHub Sponsors button */}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                Be the first {tier.label.split(' ').slice(1).join(' ').toLowerCase()} →
              </p>
              <a
                href={tier.ctaHref}
                target={tier.ctaHref.startsWith('mailto') ? '_self' : '_blank'}
                rel="noreferrer"
                style={{
                  fontSize: '0.78rem', fontWeight: 600,
                  padding: '0.3rem 0.9rem',
                  borderRadius: '6px',
                  border: `1px solid ${tier.color}`,
                  color: tier.color,
                  background: `${tier.color}18`,
                  textDecoration: 'none',
                }}
              >
                {tier.cta}
              </a>
            </div>
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

      {/* Enterprise CTA */}
      <div style={{
        marginTop: '2rem', padding: '1.25rem 1.5rem',
        borderRadius: '10px', background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}>
        <strong style={{ color: 'var(--text)', fontSize: '0.9rem' }}>🏢 Enterprise or custom deal?</strong>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.4rem 0 0.75rem' }}>
          Need a custom integration, white-label, or dedicated support SLA? Let’s talk.
        </p>
        <a
          href="mailto:samo.hossam@gmail.com?subject=Enterprise%20Inquiry%20%E2%80%94%20MikroTik%20Blocker"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            background: 'rgba(91,141,239,0.1)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.82rem',
          }}
        >
          📧 samo.hossam@gmail.com
        </a>
      </div>
    </PageShell>
  );
}
