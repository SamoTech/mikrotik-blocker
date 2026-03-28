# 🔒 MikroTik Blocker

A production-ready web app that auto-resolves domains into RouterOS-ready block scripts for MikroTik routers. Supports ASN CIDR ranges, deep DNS resolution, IPv6, and Layer7 protocol matching.

**Live:** [mikrotik-blocker.vercel.app](https://mikrotik-blocker.vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SamoTech/mikrotik-blocker)

---

## ✨ Features

- 🌐 **Bulk domain input** — paste multiple domains at once
- 🔍 **Deep IP resolution** — 7-layer engine covering ASN ranges, CNAME chains, PTR sweep, announced CIDRs
- 📊 **ASN CIDR blocking** — fetches all announced prefixes via BGPView for 50+ known platforms
- 🟣 **IPv6 support** — resolves AAAA records + IPv6 CIDR ranges + `/ipv6 firewall` rules
- 🔍 **Layer7 protocol blocking** — matches HTTP `Host` header and TLS SNI — blocks by domain name regardless of IP changes
- 📦 **Category blocklists** — Ads, Adult, Malware via oisd.nl (30-min cache)
- ⚙️ **Script options** — output mode (Both / CIDR only / IPs only), custom list name, inbound src block
- 📋 **RouterOS script generator** — ready-to-paste `.rsc` for RouterOS 6.x and 7.x
- ⬇️ **Export `.rsc` file** — download and run on any MikroTik device
- 🖥️ **Manual terminal steps** — copy individual command blocks step by step
- 🔄 **Auto-refresh scheduler** — re-resolve and refresh every X hours via Vercel Cron
- 📈 **Stats bar** — 9 live metrics after every resolve

---

## 🧠 Resolution Engine — 7 Layers

Every domain goes through all layers in parallel. Results are merged and deduplicated.

```
Input domain
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1 — ASN Prefixes (BGPView)                            │
│  50+ platforms mapped to ASNs → fetches all announced CIDRs │
│  facebook.com → AS32934/63293 → 157.240.0.0/16, ...        │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2 — DoH Multi-Source (ALL in parallel)                │
│  Google DNS + Cloudflare + Quad9 queried simultaneously     │
│  Results merged — each provider may return different IPs    │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3 — Public Blocklists (oisd.nl)                       │
│  Ads / Adult / Malware domain lists — 30-min in-memory cache│
│  Up to 500 domains per category resolved in parallel        │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4 — Subdomain Variants                                │
│  www · m · mobile · app · api · cdn · static               │
│  media · assets · img · video  (12 variants per domain)     │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 5 — CNAME Chain Unwrap (max 3 hops)                   │
│  Follows CNAME aliases across all DoH providers             │
│  instagram.com → instagram.c10r.facebook.com → IPs         │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 6 — IP → Announced CIDR (ip-api.com batch)            │
│  For non-ASN domains: maps resolved IPs to their /CIDR      │
│  104.21.5.7 → 104.21.0.0/17 (full Cloudflare block)        │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 7 — Reverse DNS PTR Sweep + Sibling Re-resolve        │
│  PTR records on resolved IPs → discover sibling hostnames   │
│  Re-resolves siblings → catches extra IPs on same /24 block │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
  Output: CIDR v4 + CIDR v6 + IPs v4 + IPs v6
  User chooses: Both / CIDR only / IPs only
```

---

## 🔍 Layer7 Protocol Blocking

Layer7 blocking works at the **packet payload level** — it inspects the first 2 KB of each TCP stream and matches domain names directly, regardless of IP address changes.

### What it matches

| Traffic | Pattern |
|---|---|
| HTTP (port 80) | `Host:` header in the request |
| HTTPS (port 443) | SNI hostname in TLS `ClientHello` |

### Generated regex structure

```
^.*(Host: [^\r]*example\.com|\x16\x03[\x00-\x03]...SNI...example\.com)
```

- HTTP part — case-insensitive `Host:` header match
- TLS part — follows exact TLS record structure to locate the SNI extension bytes

### Generated RouterOS commands

```rsc
/ip firewall layer7-protocol
:if ([:len [find name=l7-facebook_com]] = 0) do={
  add name=l7-facebook_com regexp="^.*(Host: [^\r]*facebook\.com|\x16\x03...)"
}

/ip firewall filter
:if ([:len [find chain=forward layer7-protocol=l7-facebook_com action=drop]] = 0) do={
  add chain=forward layer7-protocol=l7-facebook_com action=drop comment="L7-block facebook.com" place-before=0
}
```

> ⚠️ **Warning:** Layer7 inspection is CPU-intensive as it scans every packet payload. Use on **edge/border routers** with moderate traffic only. For ISP-level or high-throughput environments, use ASN CIDR mode instead.

---

## 🗂️ Project Structure

```
mikrotik-blocker/
├── api/
│   ├── resolve.js              ← POST /api/resolve  (main engine v4.1)
│   ├── health.js               ← GET  /api/health
│   ├── mikrotik/push.js        ← POST /api/mikrotik/push
│   └── package.json            ← { "node-routeros": "^1.6.0" }
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DomainInput.jsx
│   │   │   ├── ScriptOutput.jsx
│   │   │   ├── ManualTerminal.jsx
│   │   │   ├── SchedulerPanel.jsx
│   │   │   └── StatsBar.jsx
│   │   ├── hooks/useResolver.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
├── backend/                    ← local Express dev server (optional)
├── vercel.json
└── docker-compose.yml
```

---

## 🚀 API Reference

### `POST /api/resolve`

**Request body:**

```json
{
  "domains":     ["facebook.com", "tiktok.com"],
  "listName":    "blocked",
  "outputMode":  "both",
  "addFilter":   true,
  "addSrcBlock": false,
  "includeIPv6": true,
  "addLayer7":   false,
  "category":    null
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `domains` | `string[]` | `[]` | List of domains to resolve (max 50) |
| `listName` | `string` | `"blocked"` | RouterOS address-list name |
| `outputMode` | `string` | `"both"` | `both` / `cidr-only` / `ips-only` |
| `addFilter` | `bool` | `true` | Add `/ip firewall filter` drop rule |
| `addSrcBlock` | `bool` | `false` | Also block inbound src traffic |
| `includeIPv6` | `bool` | `true` | Include AAAA + `/ipv6 firewall` rules |
| `addLayer7` | `bool` | `false` | Add Layer7 HTTP Host + TLS SNI rules |
| `category` | `string\|null` | `null` | `ads` / `adult` / `malware` |

**Response:**

```json
{
  "resolved": [
    {
      "domain":      "facebook.com",
      "method":      "ASN+DNS",
      "asns":        ["32934", "63293"],
      "cnames":      ["star-mini.c10r.facebook.com"],
      "cidrs":       [{ "cidr": "157.240.0.0/16", "description": "FACEBOOK" }],
      "cidrsV6":     [{ "cidr": "2a03:2880::/32",  "description": "FACEBOOK" }],
      "ips":         ["157.240.241.35", "157.240.20.35"],
      "ipsV6":       ["2a03:2880:f003:c07:face:b00c::167"],
      "layer7Regex": "^.*(Host: [^\r]*facebook\.com|...)",
      "totalAddresses": 12,
      "error": null
    }
  ],
  "script": "# MikroTik Blocker script...",
  "stats": {
    "totalDomains":  2,
    "totalCIDRs":    6,
    "totalCIDRsV6":  2,
    "totalIPs":      14,
    "totalIPsV6":    8,
    "asnResolved":   2,
    "cnamesFound":   3,
    "layer7Rules":   0,
    "failed":        0
  }
}
```

---

## 📜 Example Script Output

### With Layer7 enabled (`addLayer7: true`)

```rsc
# ================================================
# MikroTik Blocker — Auto-Generated Script
# Date    : 2026-03-28T17:00:00.000Z
# Domains : facebook.com, tiktok.com
# List    : blocked
# Mode    : both + IPv6 + Layer7
# ================================================

# Step 1 — Layer7 protocol patterns (HTTP Host + TLS SNI)
# Blocks domain by NAME — works even when IPs change
/ip firewall layer7-protocol
:if ([:len [find name=l7-facebook_com]] = 0) do={
  add name=l7-facebook_com regexp="^.*(Host: [^\r]*facebook\.com|...)"
}

# Step 1b — Apply Layer7 forward drop rules
/ip firewall filter
:if ([:len [find chain=forward layer7-protocol=l7-facebook_com action=drop]] = 0) do={
  add chain=forward layer7-protocol=l7-facebook_com action=drop comment="L7-block facebook.com" place-before=0
}

# Step 2 — Remove existing IP entries
/ip firewall address-list remove [find list=blocked comment~"facebook.com"]

# Step 3a — IPv4 address list
/ip firewall address-list
# facebook.com — ASN ranges (32934, 63293)
add list=blocked address=157.240.0.0/16  comment="facebook.com-range"
add list=blocked address=129.134.0.0/17  comment="facebook.com-range"
# facebook.com — DNS IPs
add list=blocked address=157.240.241.35  comment="facebook.com-ip"

# Step 3b — IPv6 address list
/ipv6 firewall address-list
add list=blocked address=2a03:2880::/32   comment="facebook.com-range6"

# Step 4 — IP firewall drop rules (address-list)
/ip firewall filter
:if ([:len [find chain=forward dst-address-list=blocked action=drop]] = 0) do={
  add chain=forward dst-address-list=blocked action=drop comment="Block blocked" place-before=0
}
/ipv6 firewall filter
:if ([:len [find chain=forward dst-address-list=blocked action=drop]] = 0) do={
  add chain=forward dst-address-list=blocked action=drop comment="Block blocked IPv6" place-before=0
}

# Step 5 — Verify
/ip firewall address-list print where list=blocked
/ip firewall filter print where dst-address-list=blocked
/ip firewall layer7-protocol print
/ipv6 firewall address-list print where list=blocked
```

---

## 🗃️ Built-in Platform → ASN Map (50+ platforms)

| Category | Platforms | ASNs |
|---|---|---|
| **Social** | Facebook, Instagram, WhatsApp, Messenger, Meta, Threads, TikTok, Twitter/X, Snapchat, Telegram, Discord, Reddit, LinkedIn, Pinterest | AS32934, AS396986, AS13414, AS36561, AS62041, AS36459, AS54113, AS14413... |
| **Streaming** | YouTube, Netflix, Hulu, Disney+, Prime Video, Twitch, Spotify | AS15169, AS2906, AS23286, AS40027, AS16509, AS46489, AS35228 |
| **Gaming** | Steam, Epic Games, EA/Origin, Blizzard/Battle.net, Roblox | AS32590, AS46489, AS12222, AS57976, AS49604 |
| **VPN** | NordVPN, ExpressVPN, ProtonVPN | AS212238, AS25820, AS62371 |
| **Gambling** | Bet365, PokerStars | AS43215, AS19905 |

---

## ⚙️ Script Options

| Option | UI Control | Effect |
|---|---|---|
| `both` | ◑ Both | CIDR ranges + individual IPs |
| `cidr-only` | 📊 CIDR Only | ASN prefixes only (most powerful, fewest entries) |
| `ips-only` | 🔵 IPs Only | DNS-resolved IPs only (lightest) |
| Add firewall rule | ✅ Checkbox | Adds `/ip firewall filter` drop rule |
| Block inbound src | ⬜ Checkbox | Also adds `src-address-list` drop rule |
| Include IPv6 | ✅ Checkbox | AAAA records + `/ipv6 firewall` block |
| Layer7 | ⬜ Checkbox | HTTP Host + TLS SNI regex match |

---

## 🚀 Deploy to Vercel

### One-click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SamoTech/mikrotik-blocker)

### Manual

```bash
npx vercel --prod
```

No environment variables required — the app is fully stateless. All resolution is on-demand.

---

## 💻 Local Development

**Prerequisites:** Node.js >= 18

### Option A — Vercel Dev (recommended)

```bash
npm install -g vercel
vercel dev
# Frontend + /api/* serverless functions at http://localhost:3000
```

### Option B — Separate servers

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

### Docker

```bash
docker-compose up --build
```

---

## ⚠️ Constraints

| Constraint | Value |
|---|---|
| Max domains per request | 50 |
| Vercel function timeout | 30s (`resolve`), 15s (`push`), 5s (`health`) |
| Blocklist cache TTL | 30 minutes (in-memory, resets on cold start) |
| Layer7 regex size limit | 2 KB per pattern (RouterOS limit) |
| Runtime | Node.js 18+ (native `fetch`, no extra packages) |
| Storage | None — fully stateless |

---

## 📄 License

MIT
