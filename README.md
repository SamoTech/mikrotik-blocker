# MikroTik Firewall Blocker

[![MikroTik Firewall Blocker](https://raw.githubusercontent.com/SamoTech/mikrotik-blocker/main/frontend/public/og-image.png)](https://mikrotik-blocker.vercel.app)

**Open-source firewall intelligence, policy generation and automation for MikroTik RouterOS.**

MikroTik Blocker turns a simple requirement such as `block this service` into an explainable, reviewable and reversible RouterOS firewall policy.

**Try it:** https://mikrotik-blocker.vercel.app  
**Source:** https://github.com/SamoTech/mikrotik-blocker

> **The project is bigger than an IP blocker.** It is a Firewall Policy Compiler + Recipe Registry + Firewall Doctor for MikroTik.

## The 60-second demo

Input:

```text
facebook.com
tiktok.com
```

The engine can combine:

```text
Domain
  ↓
DNS / CNAME
  ↓
ASN / BGP prefixes
  ↓
IPv4 + IPv6
  ↓
Risk / scope analysis
  ↓
RouterOS policy
  ↓
Validation
  ↓
Deploy or download .rsc
```

Output can include address-lists, filter rules, IPv6 policy and optional Layer7 rules, depending on the selected strategy.

The important difference is that the project is designed to explain **why** an address was included and **what the generated policy will affect**, rather than returning an opaque list of IPs.

## Why this project exists

MikroTik RouterOS already provides a powerful firewall, including stateful filtering, RAW filtering, address lists, Layer7 matching and IPv6 support. citeturn0search2turn0search9

The difficult part is maintaining the intelligence around the rules:

- services change IPs
- CDNs move workloads
- ASNs announce new prefixes
- DNS answers change
- IPv6 can bypass an IPv4-only policy
- broad cloud ranges can create false positives
- firewall rule order changes the result
- expensive matchers can affect router performance

MikroTik Blocker is designed to handle that intelligence layer.

## Core capabilities

### Firewall Policy Compiler

```text
Intent
  → Evidence
  → Resolution
  → Risk analysis
  → Enforcement strategy
  → RouterOS policy
  → Validation
  → Deployment
```

The compiler can generate different enforcement strategies instead of treating every problem as a simple IP drop.

### Firewall Recipe Registry

Reusable, versioned recipes for common network policies:

- social platforms
- streaming
- gaming
- advertising and tracking
- malware infrastructure
- VPN / proxy infrastructure
- DNS resolvers
- cloud services
- enterprise policies
- regional CIDR policies

See [`recipes/`](./recipes/README.md).

### Firewall Doctor

The roadmap includes analysis of RouterOS exports to identify ineffective rules, ordering problems, duplicate entries, IPv6 gaps, expensive Layer7 policies, broad CIDRs and missing rollback markers.

### Live network intelligence

The resolver combines multiple evidence sources including ASN prefixes, DNS, CNAME relationships and CIDR information. The current implementation uses live BGP data with fallback data for resilience. Static mappings are treated as operational fallback data, not permanent truth.

### IPv4 + IPv6

A blocking policy is incomplete if it only considers IPv4. MikroTik provides separate IPv6 firewall facilities, so the project treats IPv6 coverage as a first-class policy property. citeturn0search3turn0search6

### Address-list first

Address lists are a core RouterOS mechanism that can be referenced by firewall filter, mangle and NAT facilities. citeturn0search0

For many high-volume blocking cases, the project therefore prefers address-list based enforcement over unnecessary packet-content inspection.

### Layer7 — optional, not magic

Layer7 can be useful for selected protocols, but it is not a universal solution. Modern encrypted traffic, QUIC/HTTP3, ECH and application-specific protocols can limit what payload inspection can reliably identify.

Use it deliberately and understand its CPU cost.

## Safety model

Generated syntax being valid does not mean a policy is safe.

Every serious policy should answer:

- What exactly is being blocked?
- Which evidence supports the block?
- Is the infrastructure dedicated or shared?
- Does IPv6 need separate handling?
- What RouterOS version is required?
- How expensive is the rule?
- Could the policy affect unrelated services?
- How is it rolled back?
- When should the intelligence be refreshed?

RouterOS processes firewall rules in order, so policy placement is part of correctness. citeturn0search2

## Canonical firewall knowledge base

The repository contains a dedicated reference layer under [`docs/firewall/`](./docs/firewall/).

```text
docs/firewall/
├── README.md
├── architecture.md
├── address-lists.md
├── filter-rules.md
├── ipv6-filter-rules.md
├── layer7.md
├── dns-blocking.md
├── asn-cidr.md
├── routeros6-vs-7.md
├── hardening.md
├── troubleshooting.md
├── agent-context.md
├── examples/
└── catalog/
```

This is the source of truth for the project's firewall concepts and reusable RouterOS patterns.

## API

### `POST /api/resolve`

Resolve domains and generate a RouterOS policy.

```json
{
  "domains": ["facebook.com", "tiktok.com"],
  "listName": "blocked",
  "outputMode": "both",
  "includeIPv6": true,
  "addLayer7": false
}
```

### `POST /api/validate`

Validate generated RouterOS script content and return errors, warnings and informational findings.

## Project architecture

```text
┌────────────────────────────────────────────┐
│              MikroTik Blocker              │
├────────────────────────────────────────────┤
│ Firewall Recipe Registry                   │
│        ↓                                   │
│ Firewall Intelligence / Resolution         │
│        ↓                                   │
│ Policy Compiler                            │
│        ↓                                   │
│ Validation + Risk Analysis                 │
│        ↓                                   │
│ RouterOS .rsc / API / Scheduler            │
└────────────────────────────────────────────┘
```

Implementation currently includes a Vercel API, React/Vite frontend and optional self-hosted backend.

## Roadmap

The long-term roadmap is intentionally focused on operational value:

1. Canonical firewall knowledge base
2. Safe policy manifests and deterministic rollback
3. Policy simulator and cost estimation
4. Firewall Doctor for RouterOS exports
5. Versioned community recipe registry
6. CLI + GitHub Action
7. Automated refresh and deployment history
8. Signed policy manifests and reproducible deployments
9. Community-maintained recipe packs

Read [`docs/PRODUCT_VISION.md`](./docs/PRODUCT_VISION.md) for the full product direction and [`docs/GROWTH.md`](./docs/GROWTH.md) for the community strategy.

## Contributing

The easiest way to contribute is to improve one small, reproducible piece:

- add a firewall recipe
- verify an ASN mapping
- improve RouterOS compatibility
- report a false positive
- add a RouterOS example
- improve validation
- document a failure mode

For firewall behavior changes, include the RouterOS version, packet path, rule-order assumptions, expected effect and rollback behavior.

## License

MIT
