import React from 'react';
import PageShell from '../components/PageShell';

const ENTRIES = [
  {
    version: 'v4.1',
    date: '2026-03-28',
    tag: 'latest',
    tagColor: '#27ae60',
    changes: [
      { type: 'feat', text: 'Layer7 protocol blocking — HTTP Host header + TLS SNI regex (RouterOS POSIX ERE)' },
      { type: 'feat', text: 'Layer7 toggle in UI with CPU warning banner' },
      { type: 'feat', text: 'L7 Rules metric added to StatsBar' },
      { type: 'feat', text: 'layer7Regex field in API response per domain' },
      { type: 'feat', text: 'Step numbering shifts dynamically when Layer7 enabled' },
    ],
  },
  {
    version: 'v4.0',
    date: '2026-03-28',
    tag: 'major',
    tagColor: '#5b8def',
    changes: [
      { type: 'feat', text: 'DoH multi-source: Google + Cloudflare + Quad9 all queried in parallel, results merged' },
      { type: 'feat', text: 'CNAME chain unwrap — follows aliases up to 3 hops deep' },
      { type: 'feat', text: 'IP → announced CIDR via ip-api.com batch API for non-ASN domains' },
      { type: 'feat', text: 'Reverse DNS PTR sweep — discovers sibling hostnames and re-resolves them' },
      { type: 'feat', text: '3 new subdomain variants: assets, img, video (12 total)' },
      { type: 'feat', text: 'cnames field in API response per domain' },
      { type: 'feat', text: 'cnamesFound metric in stats' },
      { type: 'improve', text: 'method field: ASN+DNS / DNS+CIDR / DNS' },
    ],
  },
  {
    version: 'v3.0',
    date: '2026-03-15',
    tag: null,
    changes: [
      { type: 'feat', text: 'IPv6 full support — AAAA records, /ipv6 firewall address-list, CIDRv6' },
      { type: 'feat', text: 'ASN map expanded to 50+ platforms' },
      { type: 'feat', text: 'BGPView integration for ASN prefix fetching (v4 + v6)' },
      { type: 'feat', text: 'StatsBar: 8 live metrics after each resolve' },
      { type: 'feat', text: 'Layer 4: subdomain variants (www, m, mobile, app, api, cdn, static, media)' },
      { type: 'feat', text: 'Output mode selector: Both / CIDR only / IPs only' },
    ],
  },
  {
    version: 'v2.0',
    date: '2026-02-10',
    tag: null,
    changes: [
      { type: 'feat', text: 'Category blocklists: Ads, Adult, Malware via oisd.nl' },
      { type: 'feat', text: 'MikroTik API push — auto-apply script via RouterOS API' },
      { type: 'feat', text: 'Scheduler panel — auto-refresh every X hours' },
      { type: 'feat', text: 'Manual terminal tab with step-by-step copyable commands' },
      { type: 'feat', text: 'Script export as .rsc file download' },
    ],
  },
  {
    version: 'v1.0',
    date: '2026-01-20',
    tag: null,
    changes: [
      { type: 'feat', text: 'Initial release' },
      { type: 'feat', text: 'Domain input with DNS resolution via Google DoH' },
      { type: 'feat', text: 'RouterOS script generator with address-list + filter rule' },
      { type: 'feat', text: 'Copy to clipboard and .rsc download' },
      { type: 'feat', text: 'Vercel one-click deploy' },
    ],
  },
];

const TYPE_STYLE = {
  feat:    { label: 'feat',    color: '#27ae60', bg: 'rgba(39,174,96,0.1)' },
  improve: { label: 'improve', color: '#5b8def', bg: 'rgba(91,141,239,0.1)' },
  fix:     { label: 'fix',     color: '#f0a500', bg: 'rgba(240,165,0,0.1)' },
  break:   { label: 'breaking',color: '#e05252', bg: 'rgba(224,82,82,0.1)' },
};

export default function ChangelogPage() {
  return (
    <PageShell title="Changelog" icon="📋">
      <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: '2rem' }}>
        All notable changes to MikroTik Blocker are documented here.
      </p>

      <div style={{ position: 'relative' }}>
        {/* Timeline line */}
        <div style={{
          position: 'absolute', left: '7px', top: 0, bottom: 0,
          width: '2px', background: 'var(--border)',
        }} />

        {ENTRIES.map((entry, i) => (
          <div key={entry.version} style={{ paddingLeft: '2rem', marginBottom: '2rem', position: 'relative' }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: 0, top: '4px',
              width: '16px', height: '16px',
              borderRadius: '50%',
              background: i === 0 ? 'var(--primary)' : 'var(--surface2)',
              border: `2px solid ${i === 0 ? 'var(--primary)' : 'var(--border)'}`,
            }} />

            {/* Version header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{entry.version}</h2>
              {entry.tag && (
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700,
                  background: `${entry.tagColor}22`, color: entry.tagColor,
                  padding: '0.1rem 0.5rem', borderRadius: '10px',
                }}>{entry.tag}</span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{entry.date}</span>
            </div>

            {/* Changes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {entry.changes.map((c, j) => {
                const style = TYPE_STYLE[c.type] || TYPE_STYLE.feat;
                return (
                  <div key={j} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.82rem' }}>
                    <span style={{
                      flexShrink: 0,
                      fontSize: '0.65rem', fontWeight: 700,
                      background: style.bg, color: style.color,
                      padding: '0.1rem 0.4rem', borderRadius: '4px',
                      marginTop: '2px', minWidth: '44px', textAlign: 'center',
                    }}>{style.label}</span>
                    <span style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{c.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
