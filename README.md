# MikroTik Configuration Manager

[![MikroTik Firewall Blocker](https://raw.githubusercontent.com/SamoTech/mikrotik-blocker/main/frontend/public/og-image.png)](https://mikrotik-blocker.vercel.app)

**Open-source configuration management, auditing, policy generation and automation for MikroTik RouterOS.**

MikroTik Blocker is evolving into a full **MikroTik Configuration Management System**. The existing domain/firewall blocker remains a first-class module while the platform expands into RouterOS configuration intelligence, auditing, safe remediation, configuration-as-code and controlled multi-router management.

**Try it:** https://mikrotik-blocker.vercel.app  
**Firewall Doctor:** https://mikrotik-blocker.vercel.app/doctor  
**Source:** https://github.com/SamoTech/mikrotik-blocker

## Canonical Project Roadmap

**[ROADMAP.md](./ROADMAP.md) is the single source of truth for project direction, architecture priorities, development phases, acceptance criteria and release gates.**

If another document, issue, example or planning note conflicts with `ROADMAP.md`, update that material or explicitly change the roadmap before implementing the conflicting direction.

## Product Direction

```text
Discover
   ↓
Understand Configuration
   ↓
Audit
   ↓
Define Desired State
   ↓
Generate + Validate
   ↓
Review Diff
   ↓
Deploy Safely
   ↓
Verify
   ↓
Detect Drift
   ↓
Manage as Code
```

The platform is built around five rules:

- Official MikroTik documentation is the authoritative source for RouterOS behavior and compatibility.
- Recommendations must be explainable and traceable to evidence.
- Configuration changes are reviewable and reversible by default.
- RouterOS 6/7 compatibility is explicit.
- AI can assist, but deterministic parsing and validation remain authoritative.

## Current Modules

- **Firewall Blocker** — domain/IP/ASN intelligence and RouterOS firewall policy generation.
- **Firewall Recipe Registry** — reusable, tested policy recipes with provenance and compatibility metadata.
- **Policy Compiler** — intent-to-policy foundations and machine-readable Policy Manifests.
- **Firewall Doctor** — RouterOS firewall analysis, findings, health scoring and safe remediation artifacts.
- **Policy Simulator** — policy behavior validation foundation.
- **RouterOS Reference Layer** — canonical firewall documentation and examples.
- **CLI** — offline inspection, validation and recipe workflows.

## Near-Term Direction

The next development sequence is defined by `ROADMAP.md`:

1. RouterOS Configuration Domain Model
2. Deterministic RouterOS export parser
3. Official MikroTik Documentation Knowledge Base
4. Expand Firewall Doctor into RouterOS Doctor
5. Unified findings and provenance model
6. Configuration Compiler / desired-state model
7. Semantic configuration diff
8. Safe Change Set and rollback engine
9. Live REST/API connector
10. Multi-router inventory
11. Configuration drift detection
12. GitOps / Configuration as Code
13. AI Configuration Copilot

## Safety Model

The system is intentionally designed around:

```text
Snapshot
  → Validate
  → Diff
  → Approve
  → Apply
  → Verify
       ↓
    Rollback
```

Generated changes must not silently mutate a production router. Operators should review generated configuration on a lab router or backup before deployment.

## Documentation

- [Canonical Roadmap](./ROADMAP.md)
- [Product Vision](./docs/PRODUCT_VISION.md)
- [Firewall Reference](./docs/firewall/README.md)
- [Recipe Registry](./recipes/README.md)
- [Growth Strategy](./docs/GROWTH.md)

## Contributing

Start with `ROADMAP.md` before proposing or implementing a major feature. New configuration rules should include tests, RouterOS-version applicability and official MikroTik documentation provenance where available.
