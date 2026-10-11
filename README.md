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


## GitHub Action: Firewall Doctor

The MikroTik Firewall Doctor Action analyzes a RouterOS export file (`.rsc`) in the GitHub Actions runner. It is an **offline analysis step**: it does not connect to a router, use router credentials, or apply configuration changes.

### Prerequisites

- A GitHub Actions runner with Node.js available (GitHub-hosted `ubuntu-latest` is the target).
- A checked-out workspace containing a RouterOS `.rsc` export.
- Use a sanitized fixture or approved configuration artifact. Router exports can contain usernames, public IP addresses, comments, keys, or other sensitive values; do not commit an unredacted production export to a public repository.
- The workflow needs only `contents: read` for checkout. The Action itself does not require repository write permissions or router secrets.

### Usage

The stable `v1.0.0` release is published. Pin the Action to that release tag, or use the full reviewed commit SHA for stronger supply-chain reproducibility.

### Automated Action releases

Future Action releases are created automatically by [`.github/workflows/release-action.yml`](./.github/workflows/release-action.yml) when a release-worthy Action change reaches `main`. The workflow runs the release-planner tests, Firewall Doctor regression tests, and a sanitized exit-code smoke matrix before creating a semantic version tag and GitHub Release. A failed validation blocks publication.

Use these conventional commit prefixes for changes to the Action:

- `fix(action): ...` or `perf(action): ...` — patch release (for example, `v1.0.1`).
- `feat(action): ...` — minor release (for example, `v1.1.0`).
- `feat(action)!: ...` or an Action-scoped commit with a `BREAKING CHANGE:` footer — major release.
- Documentation-only, test-only, and unrelated commits do not create a release.

The workflow uses the latest stable `vX.Y.Z` tag as its baseline, refuses to overwrite an existing tag, and generates release notes from the previous release. A manual `workflow_dispatch` defaults to dry-run mode; set `dry_run` to false only when you explicitly want to publish the calculated release.

```yaml
name: RouterOS configuration audit

on:
  pull_request:
    paths:
      - "router-config/**"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  firewall-doctor:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Analyze RouterOS export
        uses: SamoTech/mikrotik-blocker@v1.0.0
        with:
          file: router-config/routeros-export.rsc
          fail-on-high: "true"
```

The example assumes `router-config/routeros-export.rsc` exists in the checked-out consumer repository. Replace that path with the path to your own sanitized or approved export.

### Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `file` | Yes | — | Path to a readable RouterOS `.rsc` export in the workspace. |
| `fail-on-high` | No | `true` | When `true`, fail if critical or high-severity findings are present. When `false`, findings do not fail the job. Operational errors always fail. |

### Outputs

The Action declares no formal GitHub Actions outputs. It writes a human-readable report to the workflow log, including findings, evidence, remediation guidance and available provenance. Do not parse the human-readable log as a stable machine interface.

### Exit and failure behavior

- **Exit 0:** analysis completed and no blocking findings were detected, or findings were allowed by `fail-on-high: "false"`.
- **Exit 1:** critical/high findings were detected and `fail-on-high: "true"`.
- **Exit 2:** the input is missing, unreadable or invalid, or analysis encounters an operational/runtime failure.

Lower-severity findings are reported but do not fail the job. A successful audit is not proof that a router configuration is secure; review the findings and validate the intended design.

### Safety and data handling

- The Action reads a local export file and analyzes it in the runner.
- It does not open a RouterOS API/REST connection, invoke SSH, or apply firewall or other router configuration.
- No router username, password, API token or router connection profile is required.
- The report may include configuration-derived evidence. Use sanitized exports and restrict access to workflow logs when configuration details are sensitive.
- The Action is not a deployment or remediation mechanism.
