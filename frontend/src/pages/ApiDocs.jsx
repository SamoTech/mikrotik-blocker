import React from 'react';

const BASE = typeof window !== 'undefined' ? window.location.origin : 'https://mikrotik-blocker.vercel.app';

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/resolve',
    summary: 'Resolve domains and generate RouterOS script',
    body: {
      domains:     { type: 'string[]',  required: false, desc: 'List of domains to resolve (max 50)' },
      listName:    { type: 'string',    required: false, desc: 'RouterOS address-list name (default: "blocked")' },
      outputMode:  { type: 'string',    required: false, desc: '"both" | "cidr-only" | "ips-only" (default: "both")' },
      addFilter:   { type: 'boolean',   required: false, desc: 'Add firewall drop rule (default: true)' },
      addSrcBlock: { type: 'boolean',   required: false, desc: 'Block inbound (src) as well (default: false)' },
      includeIPv6: { type: 'boolean',   required: false, desc: 'Include IPv6 AAAA resolution (default: true)' },
      addLayer7:   { type: 'boolean',   required: false, desc: 'Add Layer7 HTTP Host + TLS SNI regex (default: false)' },
      routerOS:    { type: 'string',    required: false, desc: '"v6" | "v7" — affects firewall path syntax (default: "v7")' },
      category:    { type: 'string',    required: false, desc: '"ads" | "adult" | "malware" — fetch blocklist' },
    },
    response: { resolved: 'ResolvedDomain[]', script: 'string', stats: 'Stats' },
    example: JSON.stringify({
      domains: ['facebook.com', 'tiktok.com'],
      listName: 'social-block',
      routerOS: 'v7',
      includeIPv6: true,
      addLayer7: false,
    }, null, 2),
  },
  {
    method: 'POST',
    path: '/api/validate',
    summary: 'Validate a generated .rsc script for common issues',
    body: {
      script: { type: 'string', required: true, desc: 'Full .rsc script content to validate' },
    },
    response: { valid: 'boolean', errors: 'Issue[]', warnings: 'Issue[]', info: 'Info[]' },
    example: JSON.stringify({ script: '# MikroTik Blocker...\n/ip/firewall/address-list\nadd list=blocked address=1.2.3.4 comment="facebook.com-ip"' }, null, 2),
  },
  {
    method: 'GET',
    path: '/api/health',
    summary: 'Health check endpoint',
    body: {},
    response: { status: 'ok', version: 'string', uptime: 'number' },
    example: null,
  },
];

const TYPES = [
  { name: 'ResolvedDomain', fields: [
    ['domain',         'string',   'Cleaned domain name'],
    ['method',         'string',   '"ASN+DNS" | "DNS+CIDR" | "DNS"'],
    ['asns',           'string[]', 'Matched ASN numbers'],
    ['cnames',         'string[]', 'CNAME chain targets found'],
    ['cidrs',          'CIDR[]',   'IPv4 CIDR ranges'],
    ['cidrsV6',        'CIDR[]',   'IPv6 CIDR ranges'],
    ['ips',            'string[]', 'Resolved IPv4 addresses'],
    ['ipsV6',          'string[]', 'Resolved IPv6 addresses'],
    ['layer7Regex',    'string|null', 'RouterOS Layer7 regex (null if addLayer7=false)'],
    ['totalAddresses', 'number',   'Total IPs + CIDRs resolved'],
    ['error',          'string|null', 'Error message if resolution failed'],
  ]},
  { name: 'CIDR', fields: [
    ['cidr',        'string', 'CIDR notation e.g. 31.13.24.0/21'],
    ['description', 'string', 'ASN or org name'],
    ['version',     '4|6',    'IP version'],
    ['source',      'string', '"bgpview" | "ipinfo"'],
  ]},
  { name: 'Stats', fields: [
    ['totalDomains',  'number', 'Domains successfully resolved'],
    ['totalCIDRs',    'number', 'IPv4 CIDR ranges'],
    ['totalCIDRsV6',  'number', 'IPv6 CIDR ranges'],
    ['totalIPs',      'number', 'IPv4 addresses'],
    ['totalIPsV6',    'number', 'IPv6 addresses'],
    ['asnResolved',   'number', 'Domains matched via ASN map'],
    ['cnamesFound',   'number', 'CNAME targets discovered'],
    ['layer7Rules',   'number', 'Layer7 rules generated'],
    ['failed',        'number', 'Domains that failed to resolve'],
  ]},
  { name: 'Issue', fields: [
    ['code',    'string', 'Machine-readable issue code'],
    ['message', 'string', 'Human-readable description'],
    ['detail',  'any',    'Extra context (optional)'],
  ]},
];

const METHOD_COLORS = { GET: '#4caf7d', POST: '#5b8def', DELETE: '#e05252' };

export default function ApiDocs() {
  return (
    <div style={{
      maxWidth: '900px', margin: '0 auto', padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: 'var(--text)',
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
          📖 MikroTik Blocker API
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Base URL: <code>{BASE}</code></p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          All endpoints accept and return <code>application/json</code>. CORS is open.
        </p>
      </div>

      {ENDPOINTS.map(ep => (
        <div key={ep.path} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{
              background: METHOD_COLORS[ep.method], color: '#fff',
              borderRadius: '6px', padding: '0.2rem 0.6rem',
              fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em',
            }}>{ep.method}</span>
            <code style={{ fontSize: '1rem', color: 'var(--text)' }}>{ep.path}</code>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>{ep.summary}</p>

          {Object.keys(ep.body).length > 0 && (
            <>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Request Body</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Field', 'Type', 'Required', 'Description'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(ep.body).map(([field, meta]) => (
                    <tr key={field} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.35rem 0.5rem' }}><code>{field}</code></td>
                      <td style={{ padding: '0.35rem 0.5rem', color: 'var(--primary)' }}><code>{meta.type}</code></td>
                      <td style={{ padding: '0.35rem 0.5rem', color: meta.required ? 'var(--danger)' : 'var(--text-muted)' }}>{meta.required ? 'Yes' : 'No'}</td>
                      <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-muted)' }}>{meta.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Response</div>
          <pre style={{
            background: 'var(--surface2)', borderRadius: '8px',
            padding: '0.75rem', fontSize: '0.78rem',
            color: 'var(--text)', overflowX: 'auto', marginBottom: ep.example ? '1rem' : 0,
          }}>{JSON.stringify(ep.response, null, 2)}</pre>

          {ep.example && (
            <>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Example</div>
              <pre style={{
                background: 'var(--surface2)', borderRadius: '8px',
                padding: '0.75rem', fontSize: '0.78rem',
                color: 'var(--text)', overflowX: 'auto',
              }}>{`POST ${ep.path}\nContent-Type: application/json\n\n${ep.example}`}</pre>
            </>
          )}
        </div>
      ))}

      {/* Types reference */}
      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text)' }}>Types Reference</h2>
      {TYPES.map(t => (
        <div key={t.name} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem',
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{t.name}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Field', 'Type', 'Description'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.fields.map(([field, type, desc]) => (
                <tr key={field} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.35rem 0.5rem' }}><code>{field}</code></td>
                  <td style={{ padding: '0.35rem 0.5rem', color: 'var(--primary)' }}><code>{type}</code></td>
                  <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-muted)' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
