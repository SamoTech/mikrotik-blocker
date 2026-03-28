// ============================================================
// MikroTik Blocker — api/resolve.js  v3.0
// 4-Layer IP Resolution Engine + IPv6
// Layer 1: ASN prefixes (BGPView) → CIDR v4 + v6
// Layer 2: DNS over HTTPS (Google → Cloudflare) → A + AAAA
// Layer 3: Public blocklists (oisd.nl) → domain lists
// Layer 4: Subdomain variants → www, m, app, cdn...
// ============================================================

const ASN_MAP = {
  'facebook.com':          ['32934', '63293'],
  'instagram.com':         ['32934', '63293'],
  'whatsapp.com':          ['32934', '63293'],
  'messenger.com':         ['32934', '63293'],
  'meta.com':              ['32934', '63293'],
  'threads.net':           ['32934', '63293'],
  'tiktok.com':            ['396986', '138699'],
  'tiktokcdn.com':         ['396986', '138699'],
  'bytedance.com':         ['396986'],
  'musically.com':         ['396986'],
  'youtube.com':           ['15169'],
  'google.com':            ['15169'],
  'googleapis.com':        ['15169'],
  'googlevideo.com':       ['15169'],
  'googleusercontent.com': ['15169'],
  'gstatic.com':           ['15169'],
  'twitter.com':           ['13414'],
  'x.com':                 ['13414'],
  't.co':                  ['13414'],
  'twimg.com':             ['13414'],
  'netflix.com':           ['2906'],
  'nflxvideo.net':         ['2906'],
  'snapchat.com':          ['36561'],
  'snap.com':              ['36561'],
  'telegram.org':          ['62041'],
  't.me':                  ['62041'],
  'discord.com':           ['36459'],
  'discordapp.com':        ['36459'],
  'twitch.tv':             ['46489'],
  'twitchsvc.net':         ['46489'],
  'reddit.com':            ['54113'],
  'redd.it':               ['54113'],
  'linkedin.com':          ['14413'],
  'licdn.com':             ['14413'],
  'pinterest.com':         ['54230'],
  'pinimg.com':            ['54230'],
  'amazon.com':            ['16509'],
  'amazonaws.com':         ['16509'],
  'cloudfront.net':        ['16509'],
  'hulu.com':              ['23286'],
  'disneyplus.com':        ['40027'],
  'primevideo.com':        ['16509'],
  'spotify.com':           ['35228'],
  'scdn.co':               ['35228'],
  'roblox.com':            ['49604'],
  'steampowered.com':      ['32590'],
  'steamstatic.com':       ['32590'],
  'epicgames.com':         ['46489'],
  'ea.com':                ['12222'],
  'origin.com':            ['12222'],
  'blizzard.com':          ['57976'],
  'battle.net':            ['57976'],
  'nordvpn.com':           ['212238'],
  'expressvpn.com':        ['25820'],
  'protonvpn.com':         ['62371'],
  'bet365.com':            ['43215'],
  'pokerstars.com':        ['19905'],
};

const SUBDOMAIN_VARIANTS = ['', 'www', 'm', 'mobile', 'app', 'api', 'cdn', 'static', 'media'];

// ── Layer 1: ASN → CIDR prefixes (v4 + v6) ──────────────────
async function getASNPrefixes(asn) {
  try {
    const res = await fetch(`https://api.bgpview.io/asn/${asn}/prefixes`, {
      headers: { 'User-Agent': 'MikroTik-Blocker/3.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { v4: [], v6: [] };
    const data = await res.json();
    const v4 = (data.data?.ipv4_prefixes || []).map(p => ({
      cidr: p.prefix, description: p.name || p.description || asn, version: 4,
    }));
    const v6 = (data.data?.ipv6_prefixes || []).map(p => ({
      cidr: p.prefix, description: p.name || p.description || asn, version: 6,
    }));
    return { v4, v6 };
  } catch (_) {
    return { v4: [], v6: [] };
  }
}

// ── Layer 2: DNS over HTTPS (A + AAAA) ───────────────────────
async function dohResolve(name, type = 'A') {
  const recordType = type === 'AAAA' ? 28 : 1;
  const endpoints = [
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/dns-json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const records = (data.Answer || [])
        .filter(r => r.type === recordType)
        .map(r => r.data)
        .filter(ip => ip && ip !== '0.0.0.0' && !ip.startsWith('0.'));
      if (records.length > 0) return records;
    } catch (_) { continue; }
  }
  return [];
}

// ── Layer 3: Public blocklists (oisd.nl) ─────────────────────
const BLOCKLIST_CACHE = new Map();
const BLOCKLIST_TTL = 1000 * 60 * 30;

async function fetchBlocklist(category) {
  const LISTS = {
    ads:    'https://small.oisd.nl',
    nsfw:   'https://nsfw.oisd.nl',
    adult:  'https://nsfw.oisd.nl',
    malware:'https://nsfw.oisd.nl',
  };
  const url = LISTS[category];
  if (!url) return [];
  const cached = BLOCKLIST_CACHE.get(category);
  if (cached && Date.now() - cached.ts < BLOCKLIST_TTL) return cached.data;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    const domains = text
      .split('\n')
      .filter(l => !l.startsWith('#') && !l.startsWith('!') && l.trim())
      .map(l => l.replace(/^0\.0\.0\.0\s+/, '').replace(/^127\.0\.0\.1\s+/, '').trim())
      .filter(d => d && d.includes('.') && !d.includes(' '))
      .slice(0, 500);
    BLOCKLIST_CACHE.set(category, { data: domains, ts: Date.now() });
    return domains;
  } catch (_) { return []; }
}

// ── Layer 4: Resolve all subdomain variants (A + AAAA) ─────────
async function resolveAllVariants(domain, enableIPv6 = true) {
  const allIPv4 = new Set();
  const allIPv6 = new Set();
  const variants = SUBDOMAIN_VARIANTS.map(sub => (sub ? `${sub}.${domain}` : domain));

  const queries = variants.flatMap(v => [
    dohResolve(v, 'A').then(ips => ({ type: 4, ips })),
    ...(enableIPv6 ? [dohResolve(v, 'AAAA').then(ips => ({ type: 6, ips }))] : []),
  ]);

  const results = await Promise.allSettled(queries);
  results.forEach(r => {
    if (r.status === 'fulfilled') {
      r.value.ips.forEach(ip => (r.value.type === 6 ? allIPv6 : allIPv4).add(ip));
    }
  });
  return { ipv4: [...allIPv4], ipv6: [...allIPv6] };
}

// ── Main resolver ─────────────────────────────────────────────
async function resolveDomain(domain, enableIPv6 = true) {
  const clean = domain
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
    .trim()
    .toLowerCase();

  const asnKey = Object.keys(ASN_MAP).find(
    k => clean === k || clean.endsWith(`.${k}`)
  );
  const matchedASNs = asnKey ? ASN_MAP[asnKey] : null;

  const [asnResults, dnsResult] = await Promise.all([
    matchedASNs
      ? Promise.all(matchedASNs.map(getASNPrefixes)).then(arr => ({
          v4: arr.flatMap(r => r.v4),
          v6: arr.flatMap(r => r.v6),
        }))
      : Promise.resolve({ v4: [], v6: [] }),
    resolveAllVariants(clean, enableIPv6),
  ]);

  const cidrs    = [...new Map(asnResults.v4.map(r => [r.cidr, r])).values()];
  const cidrsV6  = [...new Map(asnResults.v6.map(r => [r.cidr, r])).values()];
  const ips      = dnsResult.ipv4;
  const ipsV6    = dnsResult.ipv6;

  const total = cidrs.length + cidrsV6.length + ips.length + ipsV6.length;

  return {
    domain:  clean,
    method:  matchedASNs ? 'ASN+DNS' : 'DNS',
    asns:    matchedASNs || [],
    cidrs,          // IPv4 CIDR ranges
    cidrsV6,        // IPv6 CIDR ranges
    ips,            // IPv4 individual
    ipsV6,          // IPv6 individual
    totalAddresses: total,
    error: total === 0 ? 'No IPs or ranges resolved' : null,
  };
}

// ── Script generator ──────────────────────────────────────────
function generateScript(resolved, options = {}) {
  const listName    = (options.listName || 'blocked').replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputMode  = options.outputMode || 'both';  // both | cidr-only | ips-only
  const addFilter   = options.addFilter !== false;
  const addSrcBlock = options.addSrcBlock === true;
  const includeIPv6 = options.includeIPv6 !== false;

  const lines = [
    `# ================================================`,
    `# MikroTik Blocker — Auto-Generated Script`,
    `# Date    : ${new Date().toISOString()}`,
    `# Domains : ${resolved.map(r => r.domain).filter(Boolean).join(', ')}`,
    `# List    : ${listName}`,
    `# Mode    : ${outputMode}${includeIPv6 ? ' + IPv6' : ''}`,
    `# ================================================`,
    '',
    `# Step 1 — Remove existing entries`,
  ];

  for (const r of resolved) {
    if (!r.domain) continue;
    lines.push(`/ip firewall address-list remove [find list=${listName} comment~"${r.domain}"]`);
    if (includeIPv6 && (r.cidrsV6?.length || r.ipsV6?.length)) {
      lines.push(`/ipv6 firewall address-list remove [find list=${listName} comment~"${r.domain}"]`);
    }
  }

  // ─ IPv4 block ─
  lines.push('', `# Step 2a — IPv4 address list`);
  lines.push('/ip firewall address-list');
  for (const r of resolved) {
    if (!r.domain) continue;
    if (outputMode !== 'ips-only' && r.cidrs?.length > 0) {
      lines.push(`# ${r.domain} — ASN ranges (${r.asns.join(', ')})`);
      for (const { cidr } of r.cidrs)
        lines.push(`add list=${listName} address=${cidr} comment="${r.domain}-range"`);
    }
    if (outputMode !== 'cidr-only' && r.ips?.length > 0) {
      lines.push(`# ${r.domain} — DNS IPs`);
      for (const ip of r.ips)
        lines.push(`add list=${listName} address=${ip} comment="${r.domain}-ip"`);
    }
    if (r.error) lines.push(`# WARNING: ${r.domain} — ${r.error}`);
  }

  // ─ IPv6 block ─
  if (includeIPv6) {
    const hasIPv6 = resolved.some(r => r.cidrsV6?.length || r.ipsV6?.length);
    if (hasIPv6) {
      lines.push('', `# Step 2b — IPv6 address list`);
      lines.push('/ipv6 firewall address-list');
      for (const r of resolved) {
        if (!r.domain) continue;
        if (outputMode !== 'ips-only' && r.cidrsV6?.length > 0) {
          lines.push(`# ${r.domain} — ASN IPv6 ranges`);
          for (const { cidr } of r.cidrsV6)
            lines.push(`add list=${listName} address=${cidr} comment="${r.domain}-range6"`);
        }
        if (outputMode !== 'cidr-only' && r.ipsV6?.length > 0) {
          lines.push(`# ${r.domain} — IPv6 addresses`);
          for (const ip of r.ipsV6)
            lines.push(`add list=${listName} address=${ip} comment="${r.domain}-ip6"`);
        }
      }
    }
  }

  // ─ Firewall rules ─
  if (addFilter) {
    lines.push(
      '', `# Step 3 — Firewall drop rules`,
      `/ip firewall filter`,
      `:if ([:len [find chain=forward dst-address-list=${listName} action=drop]] = 0) do={`,
      `  add chain=forward dst-address-list=${listName} action=drop comment="Block ${listName}" place-before=0`,
      `}`,
    );
    if (addSrcBlock) {
      lines.push(
        `:if ([:len [find chain=forward src-address-list=${listName} action=drop]] = 0) do={`,
        `  add chain=forward src-address-list=${listName} action=drop comment="Block ${listName} inbound" place-before=0`,
        `}`,
      );
    }
    if (includeIPv6) {
      lines.push(
        `/ipv6 firewall filter`,
        `:if ([:len [find chain=forward dst-address-list=${listName} action=drop]] = 0) do={`,
        `  add chain=forward dst-address-list=${listName} action=drop comment="Block ${listName} IPv6" place-before=0`,
        `}`,
      );
    }
  }

  lines.push(
    '', `# Step 4 — Verify`,
    `/ip firewall address-list print where list=${listName}`,
    `/ip firewall filter print where dst-address-list=${listName}`,
    ...(includeIPv6 ? [
      `/ipv6 firewall address-list print where list=${listName}`,
    ] : []),
  );

  return lines.join('\n');
}

// ── Vercel Handler ────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    domains     = [],
    listName    = 'blocked',
    outputMode  = 'both',
    addFilter   = true,
    addSrcBlock = false,
    includeIPv6 = true,
    category    = null,
  } = req.body || {};

  let inputDomains = Array.isArray(domains) ? domains : [];
  if (category) {
    const listDomains = await fetchBlocklist(category);
    inputDomains = [...inputDomains, ...listDomains];
  }

  const cleanDomains = [...new Set(
    inputDomains
      .map(d => String(d)
        .replace(/^https?:\/\//i, '')
        .replace(/\/.*$/, '')
        .replace(/^www\./, '')
        .trim()
        .toLowerCase()
      )
      .filter(d => /^[a-z0-9][a-z0-9.-]{1,253}\.[a-z]{2,}$/.test(d))
  )].slice(0, 50);

  if (cleanDomains.length === 0)
    return res.status(400).json({ error: 'No valid domains provided' });

  try {
    const results = await Promise.allSettled(
      cleanDomains.map(d => resolveDomain(d, includeIPv6))
    );
    const resolved = results.map(r =>
      r.status === 'fulfilled'
        ? r.value
        : { domain: '', cidrs: [], cidrsV6: [], ips: [], ipsV6: [], asns: [], error: r.reason?.message }
    );

    const script = generateScript(resolved, { listName, outputMode, addFilter, addSrcBlock, includeIPv6 });

    const stats = {
      totalDomains: resolved.filter(r => r.domain).length,
      totalCIDRs:   resolved.reduce((a, r) => a + (r.cidrs?.length || 0), 0),
      totalCIDRsV6: resolved.reduce((a, r) => a + (r.cidrsV6?.length || 0), 0),
      totalIPs:     resolved.reduce((a, r) => a + (r.ips?.length || 0), 0),
      totalIPsV6:   resolved.reduce((a, r) => a + (r.ipsV6?.length || 0), 0),
      asnResolved:  resolved.filter(r => r.asns?.length > 0).length,
      failed:       resolved.filter(r => r.error).length,
    };

    return res.status(200).json({ resolved, script, stats });
  } catch (err) {
    return res.status(500).json({ error: 'Resolution failed', detail: err.message });
  }
};
