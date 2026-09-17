# MikroTik Firewall Reference

This directory is the canonical reference layer for MikroTik RouterOS firewall blocking in the MikroTik Firewall Blocker project.

## Scope

The reference covers:

- packet-flow concepts relevant to `input`, `forward`, and `output`
- address-list based blocking
- IPv4 and IPv6 filter enforcement
- domain/DNS based blocking
- ASN and CIDR blocking
- Layer7 inspection and its limitations
- RouterOS 6.x vs 7.x considerations
- ordering, logging, rollback, and troubleshooting
- reproducible `.rsc` examples
- curated platform and ASN mappings

## Design principle

Separate **identification** from **enforcement**.

Identification answers: what destination, domain, ASN, prefix, or traffic signature should be blocked?

Enforcement answers: where in the RouterOS packet path should the block happen, which list or matcher should be referenced, and how should the rule be maintained safely?

The application resolver performs identification and script generation. This documentation defines the intended firewall behavior and operational guardrails.

## Recommended path

For most IP-based blocks:

```text
source/destination identification
        ↓
address-list
        ↓
/ip firewall filter
chain=forward
        ↓
dst-address-list=<list>
action=drop
```

For IPv6, maintain a parallel `/ipv6 firewall address-list` and `/ipv6 firewall filter` policy.

Use Layer7 only where a packet-level signature is actually required and router CPU capacity has been considered.

## Documents

- `architecture.md` — packet flow and enforcement architecture
- `address-lists.md` — address-list patterns and lifecycle
- `filter-rules.md` — IPv4 filter patterns
- `ipv6-filter-rules.md` — IPv6 filter patterns
- `layer7.md` — Layer7 HTTP/TLS matching and limitations
- `dns-blocking.md` — DNS, DoH, and resolver-control patterns
- `asn-cidr.md` — ASN/BGP/prefix strategy
- `routeros6-vs-7.md` — version-aware guidance
- `hardening.md` — safe deployment, ordering, logging, and rollback
- `troubleshooting.md` — operational diagnostics
- `examples/` — ready-to-review RouterOS examples
- `catalog/platforms.md` — curated network/platform mappings

## Source discipline

Routing information is dynamic. Every catalog entry should carry a source and verification date where practical. Static data is a fallback and must not be treated as immutable network truth.

Firewall examples should state their RouterOS generation assumptions and avoid claims that depend on undocumented behavior.
