// ============================================================
// MikroTik Blocker — api/resolve.js
// 4-Layer IP Resolution Engine
// Layer 1: ASN prefixes (BGPView)
// Layer 2: DNS over HTTPS (Google → Cloudflare fallback)
// Layer 3: Public blocklists (oisd.nl)
// Layer 4: Subdomain variants (www, m, app, cdn...)
// ============================================================

// ── ASN Map ─────────────────────────────────────────────────
const ASN_MAP = {
  'facebook.com':          ['32934', '63293'],
  'instagram.com':         ['32934', '63293'],
  'whatsapp.com':          ['32934', '63293'],
  'messenger.com':         ['32934', '63293'],
  'meta.com':              ['32934', '63293'],
  'threads.net':           ['32934', '63293'],
  'tiktok.com':            ['396986', '138699'],
  'tiktokcdn.com':         ['396986', '138699'],
  'bytedance.com':         ['396986', '138699'],
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

// ── Subdomain variants to probe ──────────────────────────────
const SUBDOMAIN_VARIANTS = ['', 'www', 'm', 'mobile', 'app', 'api', 'cdn', 'static', 'media'];

// ── Layer 1: ASN → CIDR prefixes ─────────────────────────────
async function getASNPrefixes(asn) {
  try {
    const res = await fetch(`https://api.bgpview.io/asn/${asn}/prefixes`, {
      headers: { 'User-Agent': 'MikroTik-Blocker/2.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.ipv4_prefixes || []).map(p => ({
      cidr: p.prefix,
      description: p.name || p.description || asn,
    }));
  } catch (_) {
    return [];
  }
}

// ── Layer 2: DNS over HTTPS ───────────────────────────────────
async function dohResolve(name) {
  const endpoints = [
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=A`,
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=A`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/dns-json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const ips = (data.Answer || [])
        .filter(r => r.type === 1)
        .map(r => r.data)
        .filter(ip => !ip.startsWith('0.') && ip !== '0.0.0.0');
      if (ips.length > 0) return ips;
    } catch (_) {
      continue;
    }
  }
  return [];
}

// ── Layer 3: Public blocklists (oisd.nl) ─────────────────────
const BLOCKLIST_CACHE = new Map();
const BLOCKLIST_TTL = 1000 * 60 * 30; // 30 min cache

async function fetchBlocklist(category) {
  const LISTS = {
    ads:    'https://small.oisd.nl',
    nsfw:   'https://nsfw.oisd.nl',
    adult:  'https://nsfw.oisd.nl',
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
  } catch (_) {
    return [];
  }
}

// ── Layer 4: Resolve all subdomain variants ───────────────────
async function resolveAllVariants(domain) {
  const allIPs = new Set();
  const variants = SUBDOMAIN_VARIANTS.map(sub => (sub ? `${sub}.${domain}` : domain));
  const results = await Promise.allSettled(variants.map(v => dohResolve(v)));
  results.forEach(r => {
    if (r.status === 'fulfilled') r.value.forEach(ip => allIPs.add(ip));
  });
  return [...allIPs];
}

// ── Main resolver ─────────────────────────────────────────────
async function resolveDomain(domain) {
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

  const [asnResults, dnsIPs] = await Promise.all([
    matchedASNs
      ? Promise.all(matchedASNs.map(getASNPrefixes)).then(r => r.flat())
      : Promise.resolve([]),
    resolveAllVariants(clean),
  ]);

  const cidrs = [...new Map(asnResults.map(r => [r.cidr, r])).values()];

  return {
    domain: clean,
    method: matchedASNs ? 'ASN+DNS' : 'DNS',
    asns: matchedASNs || [],
    cidrs,
    ips: dnsIPs,
    totalAddresses: cidrs.length + dnsIPs.length,
    error: cidrs.length === 0 && dnsIPs.length === 0
      ? 'No IPs or ranges resolved'
      : null,
  };
}

// ── Script generator ──────────────────────────────────────────
function generateScript(resolved, options = {}) {
  const listName    = (options.listName || 'blocked').replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputMode  = options.outputMode || 'both';   // 'both' | 'cidr-only' | 'ips-only'
  const addFilter   = options.addFilter !== false;
  const addSrcBlock = options.addSrcBlock === true;

  const now = new Date().toISOString();
  const domains = resolved.map(r => r.domain).join(', ');

  const lines = [
    `# ================================================`,
    `# MikroTik Blocker — Auto-Generated Script`,
    `# Date    : ${now}`,
    `# Domains : ${domains}`,
    `# List    : ${listName}`,
    `# Mode    : ${outputMode}`,
    `# ================================================`,
    '',
    `# Step 1 — Remove existing entries (clean update)`,
  ];

  for (const r of resolved) {
    if (!r.domain) continue;
    lines.push(`/ip firewall address-list remove [find list=${listName} comment~"${r.domain}"]`);
  }

  lines.push('', `# Step 2 — Add IP ranges and addresses`);
  lines.push('/ip firewall address-list');

  for (const r of resolved) {
    if (!r.domain) continue;

    if (outputMode !== 'ips-only' && r.cidrs?.length > 0) {
      lines.push(`# ${r.domain} — ASN ranges (${r.asns.join(', ')})`);
      for (const { cidr } of r.cidrs) {
        lines.push(`add list=${listName} address=${cidr} comment="${r.domain}-range"`);
      }
    }

    if (outputMode !== 'cidr-only' && r.ips?.length > 0) {
      lines.push(`# ${r.domain} — DNS resolved IPs`);
      for (const ip of r.ips) {
        lines.push(`add list=${listName} address=${ip} comment="${r.domain}-ip"`);
      }
    }

    if (r.error) {
      lines.push(`# WARNING: ${r.domain} — ${r.error}`);
    }
  }

  if (addFilter) {
    lines.push(
      '',
      `# Step 3 — Add firewall drop rules`,
      `/ip firewall filter`,
      `:if ([:len [find chain=forward dst-address-list=${listName} action=drop]] = 0) do={`,
      `  add chain=forward dst-address-list=${listName} action=drop comment="Block ${listName} outbound" place-before=0`,
      `}`,
    );

    if (addSrcBlock) {
      lines.push(
        `:if ([:len [find chain=forward src-address-list=${listName} action=drop]] = 0) do={`,
        `  add chain=forward src-address-list=${listName} action=drop comment="Block ${listName} inbound" place-before=0`,
        `}`,
      );
    }
  }

  lines.push(
    '',
    `# Step 4 — Verify`,
    `/ip firewall address-list print where list=${listName}`,
    `/ip firewall filter print where dst-address-list=${listName}`,
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
    domains,
    listName    = 'blocked',
    outputMode  = 'both',
    addFilter   = true,
    addSrcBlock = false,
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

  if (cleanDomains.length === 0) {
    return res.status(400).json({ error: 'No valid domains provided' });
  }

  try {
    const results = await Promise.allSettled(cleanDomains.map(resolveDomain));
    const resolved = results.map(r =>
      r.status === 'fulfilled'
        ? r.value
        : { domain: '', cidrs: [], ips: [], asns: [], error: r.reason?.message }
    );

    const script = generateScript(resolved, { listName, outputMode, addFilter, addSrcBlock });

    const stats = {
      totalDomains: resolved.filter(r => r.domain).length,
      totalCIDRs:   resolved.reduce((a, r) => a + (r.cidrs?.length || 0), 0),
      totalIPs:     resolved.reduce((a, r) => a + (r.ips?.length || 0), 0),
      asnResolved:  resolved.filter(r => r.asns?.length > 0).length,
      failed:       resolved.filter(r => r.error).length,
    };

    return res.status(200).json({ resolved, script, stats });
  } catch (err) {
    return res.status(500).json({ error: 'Resolution failed', detail: err.message });
  }
};
