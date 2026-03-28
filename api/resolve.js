// ============================================================
// MikroTik Blocker — api/resolve.js  v4.2
// Deep IP Resolution Engine + Layer7 Protocol Blocking
//
// Layer 1 : ASN prefixes via BGPView  (CIDR v4 + v6)
// Layer 2 : DoH multi-source — Google + Cloudflare + Quad9
//           all queried in parallel, results merged
// Layer 3 : Public blocklists oisd.nl (30-min cache)
// Layer 4 : Subdomain variants  www / m / mobile / app /
//           api / cdn / static / media / assets / img / video
// Layer 5 : CNAME chain unwrap (max 3 hops)
// Layer 6 : IP → announced CIDR via ipinfo.io (HTTPS, free)
// Layer 7 : Reverse DNS PTR sweep → sibling re-resolve
// Layer 7P: RouterOS Layer7-protocol regex
//           (HTTP Host header + TLS SNI pattern)
//           blocks domain by NAME regardless of IP changes
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

const SUBDOMAIN_VARIANTS = [
  '', 'www', 'm', 'mobile', 'app', 'api',
  'cdn', 'static', 'media', 'assets', 'img', 'video',
];

const DOH_ENDPOINTS = [
  (name, type) => `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
  (name, type) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
  (name, type) => `https://dns.quad9.net:5053/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
];

// ── Rate limiter (token bucket per IP) ───────────────────────
const _rateBuckets = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;  // 1 minute
const RATE_LIMIT_MAX       = 20;      // max 20 requests per minute per IP

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

// Clean stale buckets every 5 minutes to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS * 2;
  for (const [ip, b] of _rateBuckets)
    if (b.start < cutoff) _rateBuckets.delete(ip);
}, 300_000);

// ── helpers ──────────────────────────────────────────────────
function isValidIP(ip) {
  return ip && ip !== '0.0.0.0' && !ip.startsWith('0.') && !ip.startsWith('127.');
}

/**
 * Build a RouterOS-compatible Layer7 regex for a domain.
 * Only called when addLayer7 = true to avoid unnecessary work.
 *
 * Matches:
 *   1. HTTP  Host: header   (plain HTTP, port 80)
 *   2. TLS   SNI extension  (HTTPS ClientHello, port 443)
 *
 * RouterOS regex engine is POSIX ERE with a 2 KB limit per pattern.
 */
function buildLayer7Regex(domain) {
  const escaped = domain.replace(/\./g, '\\.');
  const httpPart = `[Hh][Oo][Ss][Tt]: [^\\r]*${escaped}`;
  const tlsPart  = `\\x16\\x03[\\x00-\\x03].{2}\\x00.{2}\\x01.{3}\\x00.{2}\\x03.{33}\\x00.{2}\\x00\\x00.{2}\\x00${escaped}`;
  const regex    = `^.*(${httpPart}|${tlsPart})`;
  // Warn if over RouterOS 2 KB limit
  if (regex.length > 2000)
    console.warn(`[L7] Regex for ${domain} is ${regex.length} chars — may exceed RouterOS 2 KB limit`);
  return regex;
}

// ── Layer 1: ASN → CIDR (v4 + v6) ─────────────────────────
async function getASNPrefixes(asn) {
  try {
    const res = await fetch(`https://api.bgpview.io/asn/${asn}/prefixes`, {
      headers: { 'User-Agent': 'MikroTik-Blocker/4.2', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
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

// ── Layer 2+5: DoH multi-source + CNAME unwrap ───────────────
async function dohResolveDeep(name, type = 'A', _depth = 0) {
  const allIPs    = new Set();
  const allCNAMEs = new Set();

  const queries = DOH_ENDPOINTS.map(ep =>
    fetch(ep(name, type), {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(5000),
    })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
  );

  const responses = await Promise.all(queries);

  for (const data of responses) {
    if (!data) continue;
    for (const rec of (data.Answer || [])) {
      if (rec.type === 1  && type === 'A')    { if (isValidIP(rec.data)) allIPs.add(rec.data); }
      else if (rec.type === 28 && type === 'AAAA') { if (rec.data) allIPs.add(rec.data); }
      else if (rec.type === 5) {
        const target = rec.data.replace(/\.$/, '');
        if (target && target !== name) allCNAMEs.add(target);
      }
    }
  }

  if (_depth < 3) {
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

// ── Layer 3: Blocklists ──────────────────────────────────────
const BLOCKLIST_CACHE = new Map();
const BLOCKLIST_TTL   = 1000 * 60 * 30;

// Fixed: each category now points to the correct list URL
const BLOCKLIST_URLS = {
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

// ── Layer 4: Subdomain variants ───────────────────────────────
async function resolveAllVariants(domain, enableIPv6) {
  const allIPv4   = new Set();
  const allIPv6   = new Set();
  const allCNAMEs = new Set();

  const variants = SUBDOMAIN_VARIANTS.map(sub => (sub ? `${sub}.${domain}` : domain));

  const queries = variants.flatMap(v => [
    dohResolveDeep(v, 'A').then(r     => ({ t: 4,       ...r })),
    dohResolveDeep(v, 'CNAME').then(r => ({ t: 'cname', ...r })),
    ...(enableIPv6 ? [dohResolveDeep(v, 'AAAA').then(r => ({ t: 6, ...r }))] : []),
  ]);

  const results = await Promise.allSettled(queries);
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const { t, ips, cnames } = r.value;
    if (t === 4)       ips.forEach(ip => allIPv4.add(ip));
    else if (t === 6)  ips.forEach(ip => allIPv6.add(ip));
    cnames.forEach(c => allCNAMEs.add(c));
  }

  const extraCNAMEs = [...allCNAMEs].filter(c => !variants.includes(c));
  if (extraCNAMEs.length > 0) {
    const extra = await Promise.allSettled([
      ...extraCNAMEs.map(c => dohResolveDeep(c, 'A').then(r    => ({ t: 4, ...r }))),
      ...(enableIPv6 ? extraCNAMEs.map(c => dohResolveDeep(c, 'AAAA').then(r => ({ t: 6, ...r }))) : []),
    ]);
    for (const r of extra) {
      if (r.status !== 'fulfilled') continue;
      r.value.ips.forEach(ip =>
        r.value.t === 6 ? allIPv6.add(ip) : allIPv4.add(ip)
      );
    }
  }

  return { ipv4: [...allIPv4], ipv6: [...allIPv6], cnames: [...allCNAMEs] };
}

// ── Layer 6: IP → announced CIDR (ipinfo.io HTTPS, free tier) ─
async function getAnnouncedCIDRs(ips) {
  if (!ips.length) return [];
  const cidrs = new Map();
  // ipinfo.io free tier: single lookups, HTTPS, no key needed for basic fields
  // Batch: up to 20 IPs in parallel to stay within free tier rate limits
  const batch = ips.slice(0, 20);
  const results = await Promise.allSettled(
    batch.map(ip =>
      fetch(`https://ipinfo.io/${ip}/json`, {
        headers: { Accept: 'application/json', 'User-Agent': 'MikroTik-Blocker/4.2' },
        signal: AbortSignal.timeout(5000),
      })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
    )
  );
  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const { ip, org, bogon } = r.value;
    // ipinfo returns /prefix in the hostname field for some IPs
    // Fallback: derive /24 from IP as minimum CIDR
    if (bogon) continue;
    if (ip) {
      const parts  = ip.split('.');
      const cidr24 = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
      cidrs.set(cidr24, { cidr: cidr24, description: org || 'unknown', version: 4, source: 'ipinfo' });
    }
  }
  return [...cidrs.values()];
}

// ── Layer 7 (DNS): Reverse DNS PTR sweep ─────────────────────
async function reverseDNSSweep(ips, enableIPv6) {
  if (!ips.length) return { ipv4: [], ipv6: [] };
  const sample = ips.slice(0, 20);
  const ptrQueries = sample.map(ip => {
    const rev = ip.split('.').reverse().join('.') + '.in-addr.arpa';
    return dohResolveDeep(rev, 'PTR').catch(() => ({ ips: new Set(), cnames: new Set() }));
  });
  const ptrResults  = await Promise.allSettled(ptrQueries);
  const siblingHosts = new Set();
  for (const r of ptrResults) {
    if (r.status !== 'fulfilled') continue;
    r.value.cnames.forEach(h => siblingHosts.add(h.replace(/\.$/, '')));
  }
  if (!siblingHosts.size) return { ipv4: [], ipv6: [] };
  const reResolve = await Promise.allSettled([
    ...[...siblingHosts].map(h => dohResolveDeep(h, 'A').then(r    => ({ t: 4, ...r }))),
    ...(enableIPv6 ? [...siblingHosts].map(h => dohResolveDeep(h, 'AAAA').then(r => ({ t: 6, ...r }))) : []),
  ]);
  const newIPv4 = new Set();
  const newIPv6 = new Set();
  for (const r of reResolve) {
    if (r.status !== 'fulfilled') continue;
    r.value.ips.forEach(ip =>
      r.value.t === 6 ? newIPv6.add(ip) : newIPv4.add(ip)
    );
  }
  return { ipv4: [...newIPv4], ipv6: [...newIPv6] };
}

// ── Main resolver ─────────────────────────────────────────────
async function resolveDomain(domain, enableIPv6 = true, addLayer7 = false) {
  const clean = domain
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
    .trim()
    .toLowerCase();

  const asnKey      = Object.keys(ASN_MAP).find(k => clean === k || clean.endsWith(`.${k}`));
  const matchedASNs = asnKey ? ASN_MAP[asnKey] : null;

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

  let extraCIDRs = [];
  if (!matchedASNs && allIPv4.size > 0)
    extraCIDRs = await getAnnouncedCIDRs([...allIPv4]);

  if (allIPv4.size > 0) {
    const rdns = await reverseDNSSweep([...allIPv4], enableIPv6);
    rdns.ipv4.forEach(ip => allIPv4.add(ip));
    rdns.ipv6.forEach(ip => allIPv6.add(ip));
  }

  const cidrs   = [
    ...new Map(asnResults.v4.map(r  => [r.cidr, r])).values(),
    ...new Map(extraCIDRs.map(r     => [r.cidr, r])).values(),
  ];
  const cidrsV6  = [...new Map(asnResults.v6.map(r => [r.cidr, r])).values()];
  const ips      = [...allIPv4];
  const ipsV6    = [...allIPv6];

  // Layer7 regex — only built when addLayer7 is true (lazy)
  const layer7Regex = addLayer7 ? buildLayer7Regex(clean) : null;

  const total = cidrs.length + cidrsV6.length + ips.length + ipsV6.length;

  return {
    domain:      clean,
    method:      matchedASNs ? 'ASN+DNS' : (extraCIDRs.length ? 'DNS+CIDR' : 'DNS'),
    asns:        matchedASNs || [],
    cnames:      variantResult.cnames,
    cidrs,
    cidrsV6,
    ips,
    ipsV6,
    layer7Regex,
    totalAddresses: total,
    error: total === 0 ? 'No IPs or ranges resolved' : null,
  };
}

// ── Script generator ──────────────────────────────────────────
function generateScript(resolved, options = {}) {
  const listName    = (options.listName || 'blocked').replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputMode  = options.outputMode  || 'both';
  const addFilter   = options.addFilter   !== false;
  const addSrcBlock = options.addSrcBlock === true;
  const includeIPv6 = options.includeIPv6 !== false;
  const addLayer7   = options.addLayer7   === true;
  const routerOS    = options.routerOS    || 'v7'; // 'v6' or 'v7'

  // RouterOS 7 uses /ip/firewall (new path), v6 uses /ip firewall (space)
  const fw   = routerOS === 'v7' ? '/ip/firewall' : '/ip firewall';
  const fw6  = routerOS === 'v7' ? '/ipv6/firewall' : '/ipv6 firewall';
  const fwL7 = routerOS === 'v7' ? '/ip/firewall/layer7-protocol' : '/ip firewall layer7-protocol';

  const lines = [
    `# ================================================`,
    `# MikroTik Blocker — Auto-Generated Script`,
    `# Date      : ${new Date().toISOString()}`,
    `# Domains   : ${resolved.map(r => r.domain).filter(Boolean).join(', ')}`,
    `# List      : ${listName}`,
    `# Mode      : ${outputMode}${includeIPv6 ? ' + IPv6' : ''}${addLayer7 ? ' + Layer7' : ''}`,
    `# RouterOS  : ${routerOS}`,
    `# ================================================`,
    '',
  ];

  // ── Layer7 protocol rules ─────────────────────────────────────
  if (addLayer7) {
    lines.push(
      `# Step 1 — Layer7 protocol patterns (HTTP Host + TLS SNI)`,
      `# Blocks domain by NAME — works even when IPs change`,
      fwL7,
    );
    for (const r of resolved) {
      if (!r.domain || !r.layer7Regex) continue;
      const ruleName = `l7-${r.domain.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      lines.push(
        `:if ([:len [find name=${ruleName}]] = 0) do={`,
        `  add name=${ruleName} regexp="${r.layer7Regex}"`,
        `}`,
      );
    }
    lines.push('', `# Step 1b — Apply Layer7 forward drop rules`, `${fw}/filter`);
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

  // ── Remove old IP entries ─────────────────────────────────────
  const stepRemove = addLayer7 ? '2' : '1';
  lines.push(`# Step ${stepRemove} — Remove existing IP entries`);
  for (const r of resolved) {
    if (!r.domain) continue;
    lines.push(`${fw}/address-list remove [find list=${listName} comment~"${r.domain}"]`);
    if (includeIPv6 && (r.cidrsV6?.length || r.ipsV6?.length))
      lines.push(`${fw6}/address-list remove [find list=${listName} comment~"${r.domain}"]`);
  }

  // ── IPv4 address list ─────────────────────────────────────────
  const stepIPv4 = addLayer7 ? '3a' : '2a';
  lines.push('', `# Step ${stepIPv4} — IPv4 address list`);
  lines.push(`${fw}/address-list`);
  for (const r of resolved) {
    if (!r.domain) continue;
    if (outputMode !== 'ips-only' && r.cidrs?.length > 0) {
      lines.push(`# ${r.domain} — CIDR ranges (${r.asns?.join(', ') || r.method})`);
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

  // ── IPv6 address list ─────────────────────────────────────────
  if (includeIPv6) {
    const hasIPv6  = resolved.some(r => r.cidrsV6?.length || r.ipsV6?.length);
    const stepIPv6 = addLayer7 ? '3b' : '2b';
    if (hasIPv6) {
      lines.push('', `# Step ${stepIPv6} — IPv6 address list`);
      lines.push(`${fw6}/address-list`);
      for (const r of resolved) {
        if (!r.domain) continue;
        if (outputMode !== 'ips-only' && r.cidrsV6?.length > 0) {
          lines.push(`# ${r.domain} — IPv6 CIDR`);
          for (const { cidr } of r.cidrsV6)
            lines.push(`add list=${listName} address=${cidr} comment="${r.domain}-range6"`);
        }
        if (outputMode !== 'cidr-only' && r.ipsV6?.length > 0) {
          lines.push(`# ${r.domain} — IPv6 IPs`);
          for (const ip of r.ipsV6)
            lines.push(`add list=${listName} address=${ip} comment="${r.domain}-ip6"`);
        }
      }
    }
  }

  // ── Firewall drop rules ───────────────────────────────────────
  if (addFilter) {
    const stepFW = addLayer7 ? '4' : '3';
    lines.push(
      '', `# Step ${stepFW} — IP firewall drop rules (address-list)`,
      `${fw}/filter`,
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
        `${fw6}/filter`,
        `:if ([:len [find chain=forward dst-address-list=${listName} action=drop]] = 0) do={`,
        `  add chain=forward dst-address-list=${listName} action=drop comment="Block ${listName} IPv6" place-before=0`,
        `}`,
      );
    }
  }

  // ── Verify ────────────────────────────────────────────────────
  const stepVerify = addLayer7 ? '5' : '4';
  lines.push(
    '', `# Step ${stepVerify} — Verify`,
    `${fw}/address-list print where list=${listName}`,
    `${fw}/filter print where dst-address-list=${listName}`,
    ...(addLayer7   ? [`${fwL7} print`] : []),
    ...(includeIPv6 ? [`${fw6}/address-list print where list=${listName}`] : []),
  );

  return lines.join('\n');
}

// ── Vercel Handler ────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting
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
      cleanDomains.map(d => resolveDomain(d, includeIPv6, addLayer7))
    );
    const resolved = results.map(r =>
      r.status === 'fulfilled'
        ? r.value
        : { domain: '', cidrs: [], cidrsV6: [], ips: [], ipsV6: [], asns: [], cnames: [], layer7Regex: null, error: r.reason?.message }
    );

    const script = generateScript(resolved, { listName, outputMode, addFilter, addSrcBlock, includeIPv6, addLayer7, routerOS });

    const stats = {
      totalDomains:  resolved.filter(r => r.domain).length,
      totalCIDRs:    resolved.reduce((a, r) => a + (r.cidrs?.length   || 0), 0),
      totalCIDRsV6:  resolved.reduce((a, r) => a + (r.cidrsV6?.length || 0), 0),
      totalIPs:      resolved.reduce((a, r) => a + (r.ips?.length     || 0), 0),
      totalIPsV6:    resolved.reduce((a, r) => a + (r.ipsV6?.length   || 0), 0),
      asnResolved:   resolved.filter(r => r.asns?.length  > 0).length,
      cnamesFound:   resolved.reduce((a, r) => a + (r.cnames?.length  || 0), 0),
      layer7Rules:   addLayer7 ? resolved.filter(r => r.domain).length : 0,
      failed:        resolved.filter(r => r.error).length,
    };

    return res.status(200).json({ resolved, script, stats });
  } catch (err) {
    return res.status(500).json({ error: 'Resolution failed', detail: err.message });
  }
};
