// ============================================================
// MikroTik Blocker — api/resolve.js  v4.3
// Optimized for Vercel free plan (10s hard timeout)
//
// Perf changes vs v4.2:
//  • Subdomain variants cut from 12 → 4 (root, www, m, cdn)
//  • DoH queries batched with concurrency limit (max 8 at once)
//  • PTR sweep + ipinfo SKIPPED when ASN already resolved
//  • Per-fetch timeout reduced: BGPView 5s, DoH 3s, ipinfo 3s
//  • Max domains per request reduced to 10 (was 50)
//  • CNAME depth reduced to 2 (was 3)
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

// Reduced to 4 most impactful variants (was 12)
const SUBDOMAIN_VARIANTS = ['', 'www', 'm', 'cdn'];

// Only 2 DoH endpoints — Quad9 dropped to reduce request count
const DOH_ENDPOINTS = [
  (name, type) => `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
  (name, type) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
];

// ── Concurrency limiter ─────────────────────────────────────
async function pLimit(tasks, limit) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]().catch(e => ({ error: e }));
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ── Rate limiter ─────────────────────────────────────────
const _rateBuckets = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX       = 20;

function isRateLimited(ip) {
  const now    = Date.now();
  const bucket = _rateBuckets.get(ip) || { count: 0, start: now };
  if (now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    _rateBuckets.set(ip, { count: 1, start: now });
    return false;
  }
  bucket.count++;
  _rateBuckets.set(ip, bucket);
  return bucket.count > RATE_LIMIT_MAX;
}
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS * 2;
  for (const [ip, b] of _rateBuckets)
    if (b.start < cutoff) _rateBuckets.delete(ip);
}, 300_000);

// ── Helpers ─────────────────────────────────────────────
function isValidIP(ip) {
  return ip && ip !== '0.0.0.0' && !ip.startsWith('0.') && !ip.startsWith('127.');
}

function buildLayer7Regex(domain) {
  const escaped = domain.replace(/\./g, '\\.');
  const httpPart = `[Hh][Oo][Ss][Tt]: [^\\r]*${escaped}`;
  const tlsPart  = `\\x16\\x03[\\x00-\\x03].{2}\\x00.{2}\\x01.{3}\\x00.{2}\\x03.{33}\\x00.{2}\\x00\\x00.{2}\\x00${escaped}`;
  return `^.*(${httpPart}|${tlsPart})`;
}

// ── Layer 1: ASN → CIDR ────────────────────────────────────
async function getASNPrefixes(asn) {
  try {
    const res = await fetch(`https://api.bgpview.io/asn/${asn}/prefixes`, {
      headers: { 'User-Agent': 'MikroTik-Blocker/4.3', Accept: 'application/json' },
      signal: AbortSignal.timeout(5000), // reduced from 8s
    });
    if (!res.ok) return { v4: [], v6: [] };
    const data = await res.json();
    const v4 = (data.data?.ipv4_prefixes || []).map(p => ({
      cidr: p.prefix, description: p.name || p.description || `AS${asn}`, version: 4,
    }));
    const v6 = (data.data?.ipv6_prefixes || []).map(p => ({
      cidr: p.prefix, description: p.name || p.description || `AS${asn}`, version: 6,
    }));
    return { v4, v6 };
  } catch (_) { return { v4: [], v6: [] }; }
}

// ── Layer 2+5: DoH + CNAME unwrap (depth max 2) ────────────
async function dohResolveDeep(name, type = 'A', _depth = 0) {
  const allIPs    = new Set();
  const allCNAMEs = new Set();

  const queries = DOH_ENDPOINTS.map(ep =>
    fetch(ep(name, type), {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(3000), // reduced from 5s
    })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
  );

  const responses = await Promise.all(queries);
  for (const data of responses) {
    if (!data) continue;
    for (const rec of (data.Answer || [])) {
      if      (rec.type === 1  && type === 'A')    { if (isValidIP(rec.data)) allIPs.add(rec.data); }
      else if (rec.type === 28 && type === 'AAAA') { if (rec.data) allIPs.add(rec.data); }
      else if (rec.type === 5) {
        const target = rec.data.replace(/\.$/, '');
        if (target && target !== name) allCNAMEs.add(target);
      }
    }
  }

  // Max CNAME depth 2 (was 3)
  if (_depth < 2) {
    const cnameResults = await Promise.allSettled(
      [...allCNAMEs].map(c => dohResolveDeep(c, type, _depth + 1))
    );
    for (const r of cnameResults) {
      if (r.status === 'fulfilled') {
        r.value.ips.forEach(ip => allIPs.add(ip));
        r.value.cnames.forEach(c => allCNAMEs.add(c));
      }
    }
  }
  return { ips: allIPs, cnames: allCNAMEs };
}

// ── Layer 3: Blocklists ─────────────────────────────────────
const BLOCKLIST_CACHE = new Map();
const BLOCKLIST_TTL   = 1000 * 60 * 30;
const BLOCKLIST_URLS  = {
  ads:     'https://small.oisd.nl',
  adult:   'https://nsfw.oisd.nl',
  malware: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling/hosts',
};

async function fetchBlocklist(category) {
  const url = BLOCKLIST_URLS[category];
  if (!url) return [];
  const cached = BLOCKLIST_CACHE.get(category);
  if (cached && Date.now() - cached.ts < BLOCKLIST_TTL) return cached.data;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    const domains = text
      .split('\n')
      .filter(l => !l.startsWith('#') && !l.startsWith('!') && l.trim())
      .map(l => l.replace(/^0\.0\.0\.0\s+/, '').replace(/^127\.0\.0\.1\s+/, '').trim())
      .filter(d => d && d.includes('.') && !d.includes(' '))
      .slice(0, 200); // reduced from 500
    BLOCKLIST_CACHE.set(category, { data: domains, ts: Date.now() });
    return domains;
  } catch (_) { return []; }
}

// ── Layer 4: Subdomain variants (batched, max 8 concurrent) ──
async function resolveAllVariants(domain, enableIPv6) {
  const allIPv4   = new Set();
  const allIPv6   = new Set();
  const allCNAMEs = new Set();

  const variants = SUBDOMAIN_VARIANTS.map(sub => (sub ? `${sub}.${domain}` : domain));

  const tasks = variants.flatMap(v => [
    () => dohResolveDeep(v, 'A').then(r    => ({ t: 4,       ...r })),
    ...(enableIPv6 ? [() => dohResolveDeep(v, 'AAAA').then(r => ({ t: 6, ...r }))] : []),
  ]);

  const results = await pLimit(tasks, 8);
  for (const r of results) {
    if (!r || r.error) continue;
    if (r.t === 4) r.ips.forEach(ip => allIPv4.add(ip));
    if (r.t === 6) r.ips.forEach(ip => allIPv6.add(ip));
    if (r.cnames) r.cnames.forEach(c => allCNAMEs.add(c));
  }

  return { ipv4: [...allIPv4], ipv6: [...allIPv6], cnames: [...allCNAMEs] };
}

// ── Layer 6: IP → CIDR (only when no ASN match, max 10 IPs) ─
async function getAnnouncedCIDRs(ips) {
  if (!ips.length) return [];
  const cidrs = new Map();
  const batch = ips.slice(0, 10); // reduced from 20
  const results = await Promise.allSettled(
    batch.map(ip =>
      fetch(`https://ipinfo.io/${ip}/json`, {
        headers: { Accept: 'application/json', 'User-Agent': 'MikroTik-Blocker/4.3' },
        signal: AbortSignal.timeout(3000),
      })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
    )
  );
  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const { ip, org, bogon } = r.value;
    if (bogon || !ip) continue;
    const parts  = ip.split('.');
    const cidr24 = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    cidrs.set(cidr24, { cidr: cidr24, description: org || 'unknown', version: 4, source: 'ipinfo' });
  }
  return [...cidrs.values()];
}

// ── Main resolver ─────────────────────────────────────────
async function resolveDomain(domain, enableIPv6 = true, addLayer7 = false) {
  const clean = domain
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
    .trim()
    .toLowerCase();

  const asnKey      = Object.keys(ASN_MAP).find(k => clean === k || clean.endsWith(`.${k}`));
  const matchedASNs = asnKey ? ASN_MAP[asnKey] : null;

  // Run ASN + DNS in parallel
  const [asnResults, variantResult] = await Promise.all([
    matchedASNs
      ? Promise.all(matchedASNs.map(getASNPrefixes)).then(arr => ({
          v4: arr.flatMap(r => r.v4),
          v6: arr.flatMap(r => r.v6),
        }))
      : Promise.resolve({ v4: [], v6: [] }),
    resolveAllVariants(clean, enableIPv6),
  ]);

  const allIPv4 = new Set(variantResult.ipv4);
  const allIPv6 = new Set(variantResult.ipv6);

  // Skip ipinfo entirely when ASN already resolved (saves ~1-2s)
  let extraCIDRs = [];
  if (!matchedASNs && allIPv4.size > 0)
    extraCIDRs = await getAnnouncedCIDRs([...allIPv4]);

  // Skip PTR sweep entirely (saves ~2-3s) — tradeoff for speed

  const cidrs  = [
    ...new Map(asnResults.v4.map(r => [r.cidr, r])).values(),
    ...new Map(extraCIDRs.map(r  => [r.cidr, r])).values(),
  ];
  const cidrsV6 = [...new Map(asnResults.v6.map(r => [r.cidr, r])).values()];
  const ips     = [...allIPv4];
  const ipsV6   = [...allIPv6];

  const layer7Regex = addLayer7 ? buildLayer7Regex(clean) : null;
  const total = cidrs.length + cidrsV6.length + ips.length + ipsV6.length;

  return {
    domain, method: matchedASNs ? 'ASN+DNS' : (extraCIDRs.length ? 'DNS+CIDR' : 'DNS'),
    asns: matchedASNs || [], cnames: variantResult.cnames,
    cidrs, cidrsV6, ips, ipsV6, layer7Regex,
    totalAddresses: total,
    error: total === 0 ? 'No IPs or ranges resolved' : null,
  };
}

// ── Script generator ──────────────────────────────────────
function generateScript(resolved, options = {}) {
  const listName    = (options.listName || 'blocked').replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputMode  = options.outputMode  || 'both';
  const addFilter   = options.addFilter   !== false;
  const addSrcBlock = options.addSrcBlock === true;
  const includeIPv6 = options.includeIPv6 !== false;
  const addLayer7   = options.addLayer7   === true;
  const routerOS    = options.routerOS    || 'v7';

  const fw   = routerOS === 'v7' ? '/ip/firewall'              : '/ip firewall';
  const fw6  = routerOS === 'v7' ? '/ipv6/firewall'            : '/ipv6 firewall';
  const fwL7 = routerOS === 'v7' ? '/ip/firewall/layer7-protocol' : '/ip firewall layer7-protocol';

  const lines = [
    `# ================================================`,
    `# MikroTik Blocker — Auto-Generated Script`,
    `# Date      : ${new Date().toISOString()}`,
    `# Domains   : ${resolved.map(r => r.domain).filter(Boolean).join(', ')}`,
    `# List      : ${listName}`,
    `# Mode      : ${outputMode}${includeIPv6 ? ' + IPv6' : ''}${addLayer7 ? ' + Layer7' : ''}`,
    `# RouterOS  : ${routerOS}`,
    `# ================================================`, '',
  ];

  if (addLayer7) {
    lines.push(`# Step 1 — Layer7 patterns`, fwL7);
    for (const r of resolved) {
      if (!r.domain || !r.layer7Regex) continue;
      const ruleName = `l7-${r.domain.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      lines.push(
        `:if ([:len [find name=${ruleName}]] = 0) do={`,
        `  add name=${ruleName} regexp="${r.layer7Regex}"`, `}`,
      );
    }
    lines.push('', `# Step 1b — Layer7 forward drop`, `${fw}/filter`);
    for (const r of resolved) {
      if (!r.domain) continue;
      const ruleName = `l7-${r.domain.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      lines.push(
        `:if ([:len [find chain=forward layer7-protocol=${ruleName} action=drop]] = 0) do={`,
        `  add chain=forward layer7-protocol=${ruleName} action=drop comment="L7-block ${r.domain}" place-before=0`,
        `}`,
      );
    }
    lines.push('');
  }

  const s1 = addLayer7 ? '2' : '1';
  lines.push(`# Step ${s1} — Remove existing entries`);
  for (const r of resolved) {
    if (!r.domain) continue;
    lines.push(`${fw}/address-list remove [find list=${listName} comment~"${r.domain}"]`);
    if (includeIPv6 && (r.cidrsV6?.length || r.ipsV6?.length))
      lines.push(`${fw6}/address-list remove [find list=${listName} comment~"${r.domain}"]`);
  }

  lines.push('', `# Step ${addLayer7 ? '3a' : '2a'} — IPv4 address list`, `${fw}/address-list`);
  for (const r of resolved) {
    if (!r.domain) continue;
    if (outputMode !== 'ips-only'  && r.cidrs?.length > 0) {
      lines.push(`# ${r.domain} — CIDR (${r.asns?.join(', ') || r.method})`);
      for (const { cidr } of r.cidrs) lines.push(`add list=${listName} address=${cidr} comment="${r.domain}-range"`);
    }
    if (outputMode !== 'cidr-only' && r.ips?.length   > 0) {
      lines.push(`# ${r.domain} — IPs`);
      for (const ip of r.ips) lines.push(`add list=${listName} address=${ip} comment="${r.domain}-ip"`);
    }
    if (r.error) lines.push(`# WARNING: ${r.domain} — ${r.error}`);
  }

  if (includeIPv6 && resolved.some(r => r.cidrsV6?.length || r.ipsV6?.length)) {
    lines.push('', `# Step ${addLayer7 ? '3b' : '2b'} — IPv6 address list`, `${fw6}/address-list`);
    for (const r of resolved) {
      if (!r.domain) continue;
      if (outputMode !== 'ips-only'  && r.cidrsV6?.length > 0) {
        lines.push(`# ${r.domain} — IPv6 CIDR`);
        for (const { cidr } of r.cidrsV6) lines.push(`add list=${listName} address=${cidr} comment="${r.domain}-range6"`);
      }
      if (outputMode !== 'cidr-only' && r.ipsV6?.length   > 0) {
        lines.push(`# ${r.domain} — IPv6 IPs`);
        for (const ip of r.ipsV6) lines.push(`add list=${listName} address=${ip} comment="${r.domain}-ip6"`);
      }
    }
  }

  if (addFilter) {
    const stepFW = addLayer7 ? '4' : '3';
    lines.push(
      '', `# Step ${stepFW} — Firewall drop rules`,
      `${fw}/filter`,
      `:if ([:len [find chain=forward dst-address-list=${listName} action=drop]] = 0) do={`,
      `  add chain=forward dst-address-list=${listName} action=drop comment="Block ${listName}" place-before=0`,
      `}`,
    );
    if (addSrcBlock) lines.push(
      `:if ([:len [find chain=forward src-address-list=${listName} action=drop]] = 0) do={`,
      `  add chain=forward src-address-list=${listName} action=drop comment="Block ${listName} inbound" place-before=0`,
      `}`,
    );
    if (includeIPv6) lines.push(
      `${fw6}/filter`,
      `:if ([:len [find chain=forward dst-address-list=${listName} action=drop]] = 0) do={`,
      `  add chain=forward dst-address-list=${listName} action=drop comment="Block ${listName} IPv6" place-before=0`,
      `}`,
    );
  }

  const stepV = addLayer7 ? '5' : '4';
  lines.push(
    '', `# Step ${stepV} — Verify`,
    `${fw}/address-list print where list=${listName}`,
    `${fw}/filter print where dst-address-list=${listName}`,
    ...(addLayer7   ? [`${fwL7} print`] : []),
    ...(includeIPv6 ? [`${fw6}/address-list print where list=${listName}`] : []),
  );

  return lines.join('\n');
}

// ── Vercel Handler ────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const clientIP = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(clientIP))
    return res.status(429).json({ error: 'Too many requests — max 20 per minute per IP' });

  const {
    domains     = [],
    listName    = 'blocked',
    outputMode  = 'both',
    addFilter   = true,
    addSrcBlock = false,
    includeIPv6 = true,
    addLayer7   = false,
    routerOS    = 'v7',
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
        .replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
        .replace(/^www\./, '').trim().toLowerCase()
      )
      .filter(d => /^[a-z0-9][a-z0-9.-]{1,253}\.[a-z]{2,}$/.test(d))
  )].slice(0, 10); // max 10 domains (was 50)

  if (cleanDomains.length === 0)
    return res.status(400).json({ error: 'No valid domains provided' });

  try {
    const results = await Promise.allSettled(
      cleanDomains.map(d => resolveDomain(d, includeIPv6, addLayer7))
    );
    const resolved = results.map(r =>
      r.status === 'fulfilled'
        ? r.value
        : { domain: '', cidrs: [], cidrsV6: [], ips: [], ipsV6: [], asns: [], cnames: [], layer7Regex: null, error: String(r.reason?.message || r.reason) }
    );

    const script = generateScript(resolved, { listName, outputMode, addFilter, addSrcBlock, includeIPv6, addLayer7, routerOS });
    const stats  = {
      totalDomains: resolved.filter(r => r.domain).length,
      totalCIDRs:   resolved.reduce((a, r) => a + (r.cidrs?.length   || 0), 0),
      totalCIDRsV6: resolved.reduce((a, r) => a + (r.cidrsV6?.length || 0), 0),
      totalIPs:     resolved.reduce((a, r) => a + (r.ips?.length     || 0), 0),
      totalIPsV6:   resolved.reduce((a, r) => a + (r.ipsV6?.length   || 0), 0),
      asnResolved:  resolved.filter(r => r.asns?.length  > 0).length,
      cnamesFound:  resolved.reduce((a, r) => a + (r.cnames?.length  || 0), 0),
      layer7Rules:  addLayer7 ? resolved.filter(r => r.domain).length : 0,
      failed:       resolved.filter(r => r.error).length,
    };

    return res.status(200).json({ resolved, script, stats });
  } catch (err) {
    return res.status(500).json({ error: 'Resolution failed', detail: String(err.message) });
  }
};
