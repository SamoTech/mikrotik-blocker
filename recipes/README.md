# Firewall Recipes

Firewall Recipes are the reusable building blocks of MikroTik Blocker.

A recipe describes an administrator's intent and the evidence and RouterOS policy needed to implement it safely.

## Recipe contract

Every recipe should document:

```yaml
id: block-example
name: Example Service
category: social
routeros:
  min: "7.0"
  max: "*"
intent: "Block Example Service from LAN clients"
methods:
  - address-list
  - cidr
sources:
  - dns
  - bgp
risk: medium
confidence: 0.85
refresh: 24h
ipv4: true
ipv6: true
rollback: supported
```

Then provide:

1. `README.md` — human explanation
2. `recipe.yaml` — machine-readable metadata
3. `policy.rsc` — generated/reference RouterOS policy
4. `tests/` — expected validation cases
5. `CHANGELOG.md` — material network-data or policy changes

## Current registry

- [`dns-hardening/`](./dns-hardening/) — controlled public DNS resolver policy template

## Required quality rules

A recipe must not claim that a service is blocked simply because its main domain resolves to an IP.

Recipes should identify:

- dedicated versus shared infrastructure
- CDN dependencies
- IPv4 and IPv6 coverage
- DNS dependencies
- QUIC / UDP considerations where relevant
- RouterOS feature requirements
- false-positive risks
- rollback procedure
- data-source provenance

## Suggested categories

- `security/`
- `social/`
- `streaming/`
- `gaming/`
- `ads/`
- `malware/`
- `vpn/`
- `dns/`
- `cloud/`
- `enterprise/`
- `regional/`

## Contribution philosophy

Do not submit a huge CIDR dump without explaining why those networks belong to the target.

Prefer evidence-backed, reproducible recipes over large copied lists.

A recipe that becomes stale should be updated, marked stale, or removed rather than silently left in the catalog.
