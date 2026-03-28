# Changelog

All notable changes to MikroTik Blocker are documented here.
Format: `[version] — date`

---

## [v4.1] — 2026-03-28

### Added
- `feat` Layer7 protocol blocking — HTTP `Host` header + TLS SNI regex (RouterOS POSIX ERE)
- `feat` Layer7 toggle in UI with CPU warning banner
- `feat` `L7 Rules` metric in StatsBar
- `feat` `layer7Regex` field in API response per resolved domain
- `feat` Step numbering shifts dynamically when Layer7 is enabled

---

## [v4.0] — 2026-03-28

### Added
- `feat` DoH multi-source: Google + Cloudflare + Quad9 all queried in parallel, results merged
- `feat` CNAME chain unwrap — follows aliases up to 3 hops deep
- `feat` IP → announced CIDR via ip-api.com batch API for non-ASN domains
- `feat` Reverse DNS PTR sweep — discovers sibling hostnames and re-resolves them
- `feat` 3 new subdomain variants: `assets`, `img`, `video` (12 total)
- `feat` `cnames` array in API response per domain
- `feat` `cnamesFound` metric in stats

### Improved
- `improve` `method` field now returns `ASN+DNS`, `DNS+CIDR`, or `DNS`

---

## [v3.0] — 2026-03-15

### Added
- `feat` Full IPv6 support — AAAA records, `/ipv6 firewall address-list`, CIDRv6
- `feat` ASN map expanded to 50+ platforms
- `feat` BGPView integration for fetching ASN prefix ranges (v4 + v6)
- `feat` StatsBar with 8 live metrics after each resolve
- `feat` Layer 4 subdomain variants: `www`, `m`, `mobile`, `app`, `api`, `cdn`, `static`, `media`
- `feat` Output mode selector: Both / CIDR only / IPs only

---

## [v2.0] — 2026-02-10

### Added
- `feat` Category blocklists: Ads, Adult, Malware via oisd.nl (30-min cache)
- `feat` MikroTik API push — auto-apply generated script via RouterOS API
- `feat` Scheduler panel — auto-refresh every X hours via Vercel Cron
- `feat` Manual Terminal tab with step-by-step copyable command blocks
- `feat` `.rsc` file export and download

---

## [v1.0] — 2026-01-20

### Added
- `feat` Initial release
- `feat` Domain input with DNS resolution via Google DoH
- `feat` RouterOS script generator with address-list + firewall filter rule
- `feat` Copy to clipboard and `.rsc` file download
- `feat` Vercel one-click deploy
