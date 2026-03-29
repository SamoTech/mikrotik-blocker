// ============================================================
// MikroTik Blocker — api/resolve.js  v4.4
// Fix: hardcoded CIDR fallback for major ASNs
//      BGPview is tried first (3s timeout), falls back to
//      static table if it fails/times out/429s
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

// Static CIDR fallback — used when BGPview is unavailable
// Sources: RIPE, ARIN, BGPview (last verified 2025)
const ASN_CIDR_FALLBACK = {
  // Meta / Facebook AS32934 + AS63293
  '32934': {
    v4: [
      '31.13.24.0/21','31.13.64.0/18','45.64.40.0/22',
      '66.220.144.0/20','69.63.176.0/20','69.171.224.0/19',
      '74.119.76.0/22','103.4.96.0/22','129.134.0.0/17',
      '157.240.0.0/17','173.252.64.0/18','179.60.192.0/22',
      '185.60.216.0/22','204.15.20.0/22',
    ],
    v6: [
      '2620:0:1c00::/40','2a03:2880::/32','2606:4700::/32',
    ],
  },
  '63293': {
    v4: ['129.134.128.0/17','163.70.128.0/17'],
    v6: ['2a03:2880:f000::/48'],
  },
  // Google / YouTube AS15169
  '15169': {
    v4: [
      '8.8.4.0/24','8.8.8.0/24','8.34.208.0/20','8.35.192.0/20',
      '23.236.48.0/20','23.251.128.0/19','34.0.0.0/9',
      '34.128.0.0/10','35.184.0.0/13','35.192.0.0/11',
      '64.233.160.0/19','66.102.0.0/20','66.249.64.0/19',
      '72.14.192.0/18','74.125.0.0/16','108.177.8.0/21',
      '142.250.0.0/15','172.217.0.0/16','172.253.0.0/16',
      '173.194.0.0/16','209.85.128.0/17','216.239.32.0/19',
      '216.58.192.0/19',
    ],
    v6: [
      '2001:4860::/32','2404:6800::/32','2607:f8b0::/32',
      '2800:3f0::/32','2a00:1450::/32','2c0f:fb50::/32',
    ],
  },
  // Twitter / X AS13414
  '13414': {
    v4: [
      '104.244.42.0/24','104.244.43.0/24','104.244.44.0/22',
      '192.133.76.0/22','199.16.156.0/22','199.59.148.0/22',
      '202.160.128.0/22','209.237.192.0/19',
    ],
    v6: ['2400:6680::/32','2606:4700::/32'],
  },
  // TikTok AS396986
  '396986': {
    v4: [
      '52.223.0.0/16','52.76.0.0/15','54.84.0.0/14',
      '54.144.0.0/12','54.160.0.0/11','54.192.0.0/12',
      '99.86.0.0/16','143.244.0.0/14','161.117.0.0/16',
    ],
    v6: ['2600:9000::/23'],
  },
  '138699': {
    v4: ['161.117.0.0/16','162.159.0.0/16'],
    v6: [],
  },
  // Netflix AS2906
  '2906': {
    v4: [
      '23.246.0.0/18','37.77.184.0/21','45.57.0.0/17',
      '64.120.128.0/17','66.197.128.0/17','108.175.32.0/20',
      '185.2.220.0/22','192.173.64.0/18','198.38.96.0/19',
      '198.45.48.0/20',
    ],
    v6: ['2406:da00:ff00::/48','2620:10d:c090::/44'],
  },
  // Snapchat AS36561
  '36561': {
    v4: ['52.0.0.0/11','54.88.0.0/13','107.21.0.0/16'],
    v6: ['2600:1f00::/24'],
  },
  // Telegram AS62041
  '62041': {
    v4: [
      '91.108.4.0/22','91.108.8.0/22','91.108.12.0/22',
      '91.108.16.0/22','91.108.20.0/22','91.108.56.0/22',
      '95.161.64.0/20','149.154.160.0/20','185.76.151.0/24',
    ],
    v6: ['2001:b28:f23d::/48','2001:b28:f23f::/48'],
  },
  // Discord AS36459
  '36459': {
    v4: [
      '66.22.196.0/22','162.159.128.0/17','198.41.128.0/17',
    ],
    v6: ['2400:cb00::/32'],
  },
  // Twitch/Epic AS46489
  '46489': {
    v4: [
      '23.160.0.0/14','45.113.128.0/17','192.16.0.0/12',
    ],
    v6: ['2600:9000::/23'],
  },
  // Reddit AS54113
  '54113': {
    v4: [
      '151.101.0.0/16','151.101.64.0/18','151.101.128.0/17',
    ],
    v6: ['2a04:4e42::/32'],
  },
  // LinkedIn AS14413
  '14413': {
    v4: [
      '108.174.0.0/20','144.2.0.0/16','185.63.144.0/22',
      '199.201.64.0/22',
    ],
    v6: ['2620:109::/32'],
  },
  // Amazon / AWS AS16509
  '16509': {
    v4: [
      '13.32.0.0/15','13.35.0.0/16','13.224.0.0/14',
      '52.84.0.0/15','52.222.128.0/17','54.230.0.0/15',
      '54.240.128.0/18','64.187.128.0/18','99.84.0.0/16',
      '143.204.0.0/16','204.246.164.0/22','205.251.192.0/19',
      '216.137.32.0/19',
    ],
    v6: ['2600:9000::/23','2620:107:300f::/48'],
  },
  // Spotify AS35228
  '35228': {
    v4: [
      '35.186.224.0/19','78.31.8.0/22','193.235.232.0/22',
    ],
    v6: ['2a00:1450:400c::/48'],
  },
  // Steam AS32590
  '32590': {
    v4: [
      '103.10.124.0/23','155.133.224.0/19','162.254.192.0/18',
      '185.25.182.0/23','205.196.6.0/24',
    ],
    v6: [],
  },
};

const SUBDOMAIN_VARIANTS = ['', 'www', 'm', 'cdn'];

const DOH_ENDPOINTS = [
  (name, type) => `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
  (name, type) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
];

async function pLimit(tasks, limit) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]().catch(e => ({ error: e }));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

const _rateBuckets = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function isRateLimited(ip) {
  const now = Date.now();
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

function isValidIP(ip) {
  return ip && ip !== '0.0.0.0' && !ip.startsWith('0.') && !ip.startsWith('127.');
}

function buildLayer7Regex(domain) {
  const escaped = domain.replace(/\./g, '\\.');
  const httpPart = `[Hh][Oo][Ss][Tt]: [^\\r]*${escaped}`;
  const tlsPart  = `\\x16\\x03[\\x00-\\x03].{2}\\x00.{2}\\x01.{3}\\x00.{2}\\x03.{33}\\x00.{2}\\x00\\x00.{2}\\x00${escaped}`;
  return `^.*(${httpPart}|${tlsPart})`;
}

// Get fallback CIDRs from static table
function getFallbackCIDRs(asn) {
  const entry = ASN_CIDR_FALLBACK[asn];
  if (!entry) return { v4: [], v6: [] };
  return {
    v4: entry.v4.map(cidr => ({ cidr, description: `AS${asn} (static)`, version: 4 })),
    v6: entry.v6.map(cidr => ({ cidr, description: `AS${asn} (static)`, version: 6 })),
  };
}

// Try BGPview first — fall back to static table
async function getASNPrefixes(asn) {
  try {
    const res = await fetch(`https://api.bgpview.io/asn/${asn}/prefixes`, {
      headers: { 'User-Agent': 'MikroTik-Blocker/4.4', Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return getFallbackCIDRs(asn);
    const data = await res.json();
    const v4 = (data.data?.ipv4_prefixes || []).map(p => ({
      cidr: p.prefix, description: p.name || p.description || `AS${asn}`, version: 4,
    }));
    const v6 = (data.data?.ipv6_prefixes || []).map(p => ({
      cidr: p.prefix, description: p.name || p.description || `AS${asn}`, version: 6,
    }));
    // If BGPview returned empty, use fallback
    if (!v4.length && !v6.length) return getFallbackCIDRs(asn);
    return { v4, v6 };
  } catch (_) {
    return getFallbackCIDRs(asn);
  }
}

async function dohResolveDeep(name, type = 'A', _depth = 0) {
  const allIPs    = new Set();
  const allCNAMEs = new Set();
  const queries = DOH_ENDPOINTS.map(ep =>
    fetch(ep(name, type), {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(3000),
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
      .slice(0, 200);
    BLOCKLIST_CACHE.set(category, { data: domains, ts: Date.now() });
    return domains;
  } catch (_) { return []; }
}

async function resolveAllVariants(domain, enableIPv6) {
  const allIPv4   = new Set();
  const allIPv6   = new Set();
  const allCNAMEs = new Set();
  const variants  = SUBDOMAIN_VARIANTS.map(sub => (sub ? `${sub}.${domain}` : domain));
  const tasks = variants.flatMap(v => [
    () => dohResolveDeep(v, 'A').then(r    => ({ t: 4, ...r })),
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

async function getAnnouncedCIDRs(ips) {
  if (!ips.length) return [];
  const cidrs = new Map();
  const results = await Promise.allSettled(
    ips.slice(0, 10).map(ip =>
      fetch(`https://ipinfo.io/${ip}/json`, {
        headers: { Accept: 'application/json', 'User-Agent': 'MikroTik-Blocker/4.4' },
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
    domain,
    method: matchedASNs ? 'ASN+DNS' : (extraCIDRs.length ? 'DNS+CIDR' : 'DNS'),
    asns: matchedASNs || [],
    cnames: variantResult.cnames,
    cidrs, cidrsV6, ips, ipsV6, layer7Regex,
    totalAddresses: total,
    error: total === 0 ? 'No IPs or ranges resolved' : null,
  };
}

function generateScript(resolved, options = {}) {
  const listName    = (options.listName || 'blocked').replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputMode  = options.outputMode  || 'both';
  const addFilter   = options.addFilter   !== false;
  const addSrcBlock = options.addSrcBlock === true;
  const includeIPv6 = options.includeIPv6 !== false;
  const addLayer7   = options.addLayer7   === true;
  const routerOS    = options.routerOS    || 'v7';

  const fw   = routerOS === 'v7' ? '/ip/firewall'                 : '/ip firewall';
  const fw6  = routerOS === 'v7' ? '/ipv6/firewall'               : '/ipv6 firewall';
  const fwL7 = routerOS === 'v7' ? '/ip/firewall/layer7-protocol' : '/ip firewall layer7-protocol';

  const lines = [
    `# ================================================`,
    `# MikroTik Blocker \u2014 Auto-Generated Script`,
    `# Date      : ${new Date().toISOString()}`,
    `# Domains   : ${resolved.map(r => r.domain).filter(Boolean).join(', ')}`,
    `# List      : ${listName}`,
    `# Mode      : ${outputMode}${includeIPv6 ? ' + IPv6' : ''}${addLayer7 ? ' + Layer7' : ''}`,
    `# RouterOS  : ${routerOS}`,
    `# ================================================`, '',
  ];

  if (addLayer7) {
    lines.push(`# Step 1 \u2014 Layer7 patterns`, fwL7);
    for (const r of resolved) {
      if (!r.domain || !r.layer7Regex) continue;
      const ruleName = `l7-${r.domain.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      lines.push(
        `:if ([:len [find name=${ruleName}]] = 0) do={`,
        `  add name=${ruleName} regexp="${r.layer7Regex}"`, `}`,
      );
    }
    lines.push('', `# Step 1b \u2014 Layer7 forward drop`, `${fw}/filter`);
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
  lines.push(`# Step ${s1} \u2014 Remove existing entries`);
  for (const r of resolved) {
    if (!r.domain) continue;
    lines.push(`${fw}/address-list remove [find list=${listName} comment~"${r.domain}"]`);
    if (includeIPv6 && (r.cidrsV6?.length || r.ipsV6?.length))
      lines.push(`${fw6}/address-list remove [find list=${listName} comment~"${r.domain}"]`);
  }

  lines.push('', `# Step ${addLayer7 ? '3a' : '2a'} \u2014 IPv4 address list`, `${fw}/address-list`);
  for (const r of resolved) {
    if (!r.domain) continue;
    if (outputMode !== 'ips-only'  && r.cidrs?.length > 0) {
      lines.push(`# ${r.domain} \u2014 CIDR (${r.asns?.join(', ') || r.method})`);
      for (const { cidr } of r.cidrs) lines.push(`add list=${listName} address=${cidr} comment="${r.domain}-range"`);
    }
    if (outputMode !== 'cidr-only' && r.ips?.length > 0) {
      lines.push(`# ${r.domain} \u2014 IPs`);
      for (const ip of r.ips) lines.push(`add list=${listName} address=${ip} comment="${r.domain}-ip"`);
    }
    if (r.error) lines.push(`# WARNING: ${r.domain} \u2014 ${r.error}`);
  }

  if (includeIPv6 && resolved.some(r => r.cidrsV6?.length || r.ipsV6?.length)) {
    lines.push('', `# Step ${addLayer7 ? '3b' : '2b'} \u2014 IPv6 address list`, `${fw6}/address-list`);
    for (const r of resolved) {
      if (!r.domain) continue;
      if (outputMode !== 'ips-only'  && r.cidrsV6?.length > 0) {
        lines.push(`# ${r.domain} \u2014 IPv6 CIDR`);
        for (const { cidr } of r.cidrsV6) lines.push(`add list=${listName} address=${cidr} comment="${r.domain}-range6"`);
      }
      if (outputMode !== 'cidr-only' && r.ipsV6?.length > 0) {
        lines.push(`# ${r.domain} \u2014 IPv6 IPs`);
        for (const ip of r.ipsV6) lines.push(`add list=${listName} address=${ip} comment="${r.domain}-ip6"`);
      }
    }
  }

  if (addFilter) {
    const stepFW = addLayer7 ? '4' : '3';
    lines.push(
      '', `# Step ${stepFW} \u2014 Firewall drop rules`,
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
    '', `# Step ${stepV} \u2014 Verify`,
    `${fw}/address-list print where list=${listName}`,
    `${fw}/filter print where dst-address-list=${listName}`,
    ...(addLayer7   ? [`${fwL7} print`] : []),
    ...(includeIPv6 ? [`${fw6}/address-list print where list=${listName}`] : []),
  );

  return lines.join('\n');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const clientIP = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(clientIP))
    return res.status(429).json({ error: 'Too many requests \u2014 max 20 per minute per IP' });

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
  )].slice(0, 10);

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
