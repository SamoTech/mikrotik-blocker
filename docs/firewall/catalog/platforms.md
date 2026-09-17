# Platform / ASN Catalog

This catalog is intentionally curated rather than presented as permanent truth. Network ownership, announced prefixes, CDN usage, and service topology can change.

## Current resolver mappings

The application currently maintains explicit domain-to-ASN mappings for platforms including Meta, TikTok/ByteDance, Google/YouTube, X/Twitter, Netflix, Telegram, Discord, Reddit, LinkedIn, Amazon/AWS, Spotify, Steam, Cloudflare, Quad9, and OpenDNS.

See `api/resolve.js` for the implementation mapping and static fallback data.

## Record format

Future catalog entries should use a structure equivalent to:

```text
Service: <name>
Domains: <domains>
ASN: <asn>
IPv4 prefixes: <prefixes>
IPv6 prefixes: <prefixes>
Source: <source>
Verified: <YYYY-MM-DD>
Scope: dedicated | shared | CDN | cloud | mixed
Notes: <operational caveats>
```

## Classification guidance

`dedicated` means the ASN/prefix is substantially associated with the target service.

`shared` means unrelated services may use the same infrastructure.

`CDN` or `cloud` means the network object may host many unrelated customers and should not be treated as a service-exclusive block without additional evidence.

`mixed` means the mapping contains different infrastructure types and needs per-prefix review.

## Rule

Never turn a catalog entry into a blanket firewall block solely because the service name appears next to an ASN. Review scope, source, date, and expected side effects first.
