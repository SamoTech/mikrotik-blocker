# AI Agent Context

This file defines how AI agents should use the MikroTik Firewall Blocker repository as a source of MikroTik firewall knowledge.

## Authority order

1. Target RouterOS documentation and behavior verified on the target release.
2. `docs/firewall/` project reference and tested examples.
3. Current resolver/source data with an explicit source and verification date.
4. Application implementation in `api/` and `backend/`.
5. Historical changelog or comments.

## Agent rules

- Never present a static ASN/CIDR table as permanently current.
- Do not infer that an ASN is exclusive to a service without evidence.
- Distinguish IPv4 and IPv6 policy.
- Distinguish `input`, `forward`, and `output` chains.
- Check rule ordering before proposing a new filter rule.
- Prefer address-list enforcement when IP-based identification is sufficient.
- Treat Layer7 as a higher-cost, protocol-dependent method.
- State RouterOS version assumptions.
- Preserve existing firewall policy and management access.
- Prefer targeted updates and reversible changes.
- When data is uncertain or stale, say so and request/perform verification rather than inventing a prefix.

## Response format for generated firewall guidance

When an agent generates a production-oriented answer, it should identify:

```text
Target: RouterOS version
Objective: what is being blocked
Identification: domain / IP / CIDR / ASN / Layer7
Enforcement: input / forward / output
IPv4: included/excluded
IPv6: included/excluded
Rule order: assumptions
Data source: source + verification date
Rollback: how to remove/disable the generated objects
Risks: overblocking, stale data, protocol limitations
```

## Repository role

The web application is the automation surface. The `docs/firewall/` tree is the canonical reusable knowledge surface for humans, scripts, and AI agents.
