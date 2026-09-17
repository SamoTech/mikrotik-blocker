# MikroTik Firewall Blocker

[![MikroTik Firewall Blocker](https://raw.githubusercontent.com/SamoTech/mikrotik-blocker/main/frontend/public/og-image.png)](https://mikrotik-blocker.vercel.app)

A free, open-source reference and generator for MikroTik RouterOS firewall blocking. It resolves domains, ASNs, BGP prefixes, IPv4/IPv6 addresses, and DNS infrastructure into RouterOS-ready address-list, filter, and optional Layer7 rules.

**Live tool:** https://mikrotik-blocker.vercel.app  
**Source:** https://github.com/SamoTech/mikrotik-blocker

> **Project goal:** make this repository a practical, versioned source of MikroTik firewall blocking knowledge and reusable RouterOS implementations — not only a web UI.

## What this project is

MikroTik Firewall Blocker combines two layers:

1. **Reference knowledge** — documented blocking patterns, RouterOS syntax, design decisions, safety notes, and reproducible examples.
2. **Automation** — a resolver and script generator that turns domains and network identifiers into deployable RouterOS `.rsc` scripts.

The current application already supports bulk domains, ASN/CIDR resolution, DNS resolution, IPv6, category blocklists, script generation, validation, scheduling, and optional Layer7 matching.

## Canonical firewall knowledge

The repository now treats `docs/firewall/` as the canonical human- and AI-readable reference layer. Application code and generated scripts should follow the concepts documented there rather than maintaining competing definitions.

```text
docs/
└── firewall/
    ├── README.md                  # Canonical firewall index
    ├── architecture.md           # Packet-flow and enforcement model
    ├── address-lists.md          # Address-list design patterns
    ├── filter-rules.md           # IPv4 filter rules
    ├── ipv6-filter-rules.md      # IPv6 filter rules
    ├── layer7.md                 # Layer7 matching and limitations
    ├── dns-blocking.md           # DNS and DoH considerations
    ├── asn-cidr.md               # ASN/BGP/CIDR strategy
    ├── routeros6-vs-7.md         # Version differences
    ├── hardening.md              # Rule order, logging, rollback
    ├── troubleshooting.md        # Diagnostics and failure modes
    ├── examples/
    │   ├── basic-domain-block.rsc
    │   ├── address-list-block.rsc
    │   ├── ipv6-block.rsc
    │   └── layer7-block.rsc
    └── catalog/
        └── platforms.md          # Curated platform/ASN mappings
```

## Supported blocking methods

### Address-list + filter

The core enforcement pattern is an `/ip firewall address-list` referenced by a `forward` filter rule.

```rsc
/ip firewall address-list
add list=blocked_sites address=203.0.113.10 comment="example.com"

/ip firewall filter
add chain=forward dst-address-list=blocked_sites action=drop comment="Block blocked_sites"
```

For production networks, address-list based enforcement should normally be preferred over broad Layer7 inspection when the traffic model permits it.

### CIDR / ASN blocking

The resolver can obtain announced prefixes for known ASNs and merge them with DNS-derived addresses. The current resolver uses a primary BGP prefix source, a secondary BGPView fallback, and static CIDR fallbacks for selected ASNs.

This is useful when a service uses many hostnames or dynamic address pools, but ASN blocking can also catch unrelated services when an ASN is shared. CIDR scope must therefore be reviewed before deployment.

### IPv6

IPv6 must be handled explicitly. An IPv4-only block does not block equivalent IPv6 traffic. The application supports AAAA resolution, IPv6 prefixes, and `/ipv6 firewall` output.

### Layer7

Layer7 rules can inspect HTTP host data and TLS SNI patterns, but packet inspection is CPU-intensive. Modern encrypted traffic, QUIC/HTTP3, ECH, application protocols, and fragmented or obfuscated traffic can reduce effectiveness. Layer7 is therefore an optional enforcement method rather than the default.

## Safety model

A syntactically valid RouterOS script is not automatically safe to deploy.

Before deployment:

- confirm the target address-list does not collide with an existing policy
- review CIDR/ASN scope for shared infrastructure
- preserve router management access
- test broad blocks in a controlled environment
- use stable comments and rule names for audit and rollback
- validate both IPv4 and IPv6 behavior
- avoid unnecessary Layer7 inspection on high-throughput routers

The project includes script validation; administrators should still review generated firewall policy before production deployment.

## RouterOS versioning

Generated material should identify whether it targets RouterOS 6.x or 7.x. Do not assume every syntax example is interchangeable. The application exposes RouterOS version selection in its generation options.

## API

`POST /api/resolve` accepts domains and generation options and returns resolved addresses plus a RouterOS script. The current interface includes output mode, IPv6, filter generation, source blocking, Layer7, and category blocklist options.

`POST /api/validate` validates generated script content and reports errors, warnings, and informational findings.

## Architecture

The repository contains a Vercel API, an optional self-hosted Express backend, and a React/Vite frontend. The API resolver contains the domain/ASN mapping and multi-stage resolution engine; the backend contains reusable DNS, scheduling, and RouterOS script-generation services.

The resolver currently implements a multi-layer strategy covering ASN prefixes, multi-provider DoH, public blocklists, subdomain variants, CNAME traversal, IP-to-CIDR lookup, and reverse-DNS discovery.

## Data quality and source policy

Network ownership and routing prefixes change over time. Static CIDR tables are resilience fallbacks, not permanent truth. Live routing data should be preferred whenever available.

When adding or changing a platform mapping:

1. record the ASN/source and verification date
2. prefer authoritative routing or registry data over copied lists
3. document whether the ASN is dedicated or shared
4. distinguish a service's own ranges from generic cloud/CDN infrastructure
5. test both expected blocking and false-positive scope

## Example workflow

```text
Domain / ASN input
        ↓
Normalize + validate
        ↓
DNS + CNAME + ASN/BGP resolution
        ↓
Deduplicate IPv4 / IPv6 / CIDRs
        ↓
Select enforcement method
        ├── Address-list + filter
        ├── CIDR block
        └── Optional Layer7
        ↓
Generate RouterOS script
        ↓
Validate
        ↓
Human review
        ↓
Deploy / rollback
```

## Contributing

Contributions should improve RouterOS correctness, firewall documentation, network-data accuracy, resolver reliability, IPv4/IPv6 coverage, validation, or reproducible examples.

For firewall behavior changes, document the intended packet path, RouterOS version, rule-order assumptions, source of network data, and rollback behavior.

## License

MIT
