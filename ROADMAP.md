# MikroTik Configuration Manager — Canonical Roadmap

**Status:** Active source of truth  
**Project:** `SamoTech/mikrotik-blocker`  
**Product direction:** MikroTik Configuration Management System for RouterOS  
**Last reviewed:** 2026-09-17

> This document is the canonical development roadmap for the repository. If another roadmap, issue, README section, planning note, or conversation conflicts with this file, this file wins until it is explicitly updated.

## 1. Product Mission

Build an open-source, explainable and safe configuration-management system for MikroTik RouterOS.

The system must help operators:

- discover and inventory routers
- understand RouterOS configuration as structured data
- audit security, reliability and configuration quality
- generate configuration from explicit intent and policies
- compare desired and actual configuration
- detect configuration drift
- validate changes before deployment
- deploy changes through controlled mechanisms
- verify the result and provide rollback
- maintain a versioned, community-reviewable knowledge base
- explain recommendations using authoritative MikroTik documentation

The existing domain-to-firewall-blocking capability remains a first-class module, not the definition of the whole product.

## 2. Product Principles

### 2.1 Official documentation first

MikroTik official documentation and manuals are the authoritative technical source for RouterOS behavior, syntax, capabilities, compatibility and operational guidance.

Every material audit rule, recommendation, generated policy pattern and compatibility claim should have provenance to an official MikroTik source whenever such a source exists.

Third-party sources may be used for discovery or supplementary context, but must never silently override official documentation.

### 2.2 Explainability

Every meaningful recommendation should answer:

1. What was detected?
2. What evidence was found?
3. Why does it matter?
4. Which RouterOS capability or documented practice supports the recommendation?
5. What change is proposed?
6. What is the risk?
7. How can it be rolled back?

### 2.3 Safe by default

The system is read-only until an operator explicitly approves a change.

No automatic deployment should be introduced without:

- pre-flight validation
- explicit diff
- backup/snapshot strategy
- compatibility checks
- approval boundary
- post-change verification
- rollback path

### 2.4 Version aware

RouterOS 6 and RouterOS 7 must be treated as different compatibility targets where behavior or syntax differs.

The engine must detect the target RouterOS version and refuse or flag incompatible generated configuration rather than guessing.

### 2.5 Configuration as data

RouterOS exports, API responses and generated policies should converge into a normalized internal configuration model.

The UI, auditor, compiler, diff engine and deployment layer should operate on that model instead of duplicating parsing logic.

### 2.6 No opaque AI authority

AI may explain, classify, propose and generate candidate changes. Deterministic parsers, validators and policy rules remain the authority for executable configuration.

AI output must never bypass validation or human approval.

### 2.7 Reversible changes

Every generated change that modifies router state must have a clear rollback strategy or be explicitly marked as non-reversible/review-only.

## 3. Target Architecture

```text
                    MikroTik Configuration Manager
                              |
          +-------------------+-------------------+
          |                   |                   |
       Discovery            Audit              Manage
          |                   |                   |
     Inventory          Security rules      Desired state
     Capabilities       Config quality       Policies/templates
     RouterOS version   Compliance           Change sets
          |                   |                   |
          +-------------------+-------------------+
                              |
                    Configuration Domain Model
                              |
          +-------------------+-------------------+
          |                   |                   |
        Parser             Compiler             Diff
          |                   |                   |
        Export          Intent -> Policy       Desired/Actual
                              |
                       Validation Engine
                              |
                    +---------+---------+
                    |                   |
                 Offline              Live
                    |                   |
                 .rsc             REST / API / SSH
                    |                   |
                    +---------+---------+
                              |
                       Safe Deployment
                              |
             Backup -> Approve -> Apply -> Verify
                              |
                           Rollback
```

## 4. Current Foundation

Already established in the repository:

- MikroTik domain/IP intelligence and RouterOS script generation
- IPv4 and IPv6-aware firewall policy generation
- Firewall Recipe Registry
- Policy Manifest concept and validation
- Firewall Doctor CLI
- Firewall Doctor web UI
- Firewall Doctor serverless API
- safe remediation concept producing reviewable patch and rollback artifacts
- Policy Simulator foundation
- canonical `docs/firewall/` reference layer
- RouterOS examples and fixtures
- CI validation
- shareable product demo/growth documentation
- CLI commands for inspection, validation and recipe discovery

These are foundations for the broader configuration-management platform.

## 5. Development Phases

### Phase 0 — Governance and Source of Truth

**Status: IN PROGRESS**

Deliverables:

- [x] Establish this `ROADMAP.md` as canonical roadmap
- [ ] Add roadmap validation/checklist to CI
- [ ] Define architecture decision record convention
- [ ] Define official-document provenance contract
- [ ] Define release/readiness gates
- [ ] Remove or mark obsolete roadmap documents that conflict with this file

Exit criteria:

- Every major feature maps to a phase and acceptance criteria.
- Documentation and code changes can be traced to a roadmap item.

### Phase 1 — RouterOS Configuration Intelligence

**Status: NEXT / FOUNDATIONAL**

Goal: turn raw RouterOS configuration into a reliable structured model.

Deliverables:

- [ ] RouterOS export parser with deterministic tokenization
- [ ] Normalized configuration domain model
- [ ] Section/resource inventory
- [ ] RouterOS version detection
- [ ] Hardware/platform metadata model
- [ ] Package/capability model
- [ ] Service/interface/IP/route/firewall/VPN/user/script/scheduler resources
- [ ] Parser error reporting with line references
- [ ] Fixture corpus covering RouterOS 6 and 7 exports
- [ ] Round-trip tests where safe
- [ ] Configuration normalization without changing semantics

Acceptance criteria:

- The same export produces deterministic normalized output.
- Parser failures identify the affected section and line.
- Unsupported syntax is preserved or explicitly reported, never silently discarded.

### Phase 2 — Official MikroTik Knowledge Base

**Status: NEXT**

Goal: create the authoritative knowledge layer used by audit, compiler and AI.

Deliverables:

- [ ] Documentation source registry
- [ ] Official-source metadata schema
- [ ] RouterOS feature/capability catalog
- [ ] Version compatibility matrix
- [ ] Configuration syntax references
- [ ] Security recommendation rules
- [ ] Operational best-practice rules
- [ ] Remediation metadata
- [ ] Rollback metadata
- [ ] Source URL/section provenance for every rule
- [ ] Documentation freshness/version tracking
- [ ] Automated link/source validation where practical

Acceptance criteria:

- No production audit rule without provenance.
- A user can inspect the source behind every recommendation.
- RouterOS-version applicability is explicit.

### Phase 3 — RouterOS Doctor

**Status: IN PROGRESS**

Goal: evolve Firewall Doctor into a complete RouterOS configuration auditor.

Deliverables:

- [x] Firewall analysis
- [x] Health score foundation
- [x] Severity model
- [x] Web upload/paste workflow
- [x] Remediation preview foundation
- [ ] System/security audit
- [ ] Management-access audit
- [ ] Services audit
- [ ] User/account audit
- [ ] Interface/bridge/VLAN audit
- [ ] IP/DHCP/DNS audit
- [ ] Routing/BGP/OSPF audit
- [ ] VPN audit
- [ ] Wireless audit
- [ ] Queue/QoS audit
- [ ] Logging/monitoring audit
- [ ] Script/scheduler audit
- [ ] IPv6 parity audit
- [ ] Configuration hygiene audit
- [ ] Compliance profiles
- [ ] Evidence line references
- [ ] Finding suppression/acknowledgement model

Acceptance criteria:

- Findings are deterministic and evidence-backed.
- Severity is based on documented impact, not arbitrary scoring.
- Every actionable finding has a remediation state: automatic-safe, review-required, or review-only.

### Phase 4 — Configuration Compiler

**Status: IN PROGRESS**

Goal: convert desired intent into validated RouterOS configuration.

Deliverables:

- [x] Intent schema foundation
- [x] Desired-state model foundation
- [x] Policy schema foundation
- [x] Configuration templates foundation
- [x] RouterOS-aware compiler foundation
- [ ] RouterOS 6/7 compatibility validation
- [x] Dependency ordering foundation
- [x] Idempotent generation foundation
- [x] RSC generation
- [ ] Policy Manifest generation
- [x] Before/after diff
- [x] Conflict detection
- [x] Dry-run support

Acceptance criteria:

- Re-running the same desired state does not create unnecessary changes.
- Generated configuration passes syntax/semantic validation before deployment.
- Unsupported features fail clearly.

### Phase 5 — Change Management and Safe Remediation

**Status: IN PROGRESS**

Goal: make every configuration change reviewable and reversible.

Deliverables:

- [x] Reviewable patch artifact foundation
- [x] Rollback artifact foundation
- [ ] Structured Change Set object
- [ ] Pre-change snapshot
- [ ] Risk classification
- [ ] Approval workflow
- [ ] Dry-run integration
- [ ] Safe Mode deployment workflow where applicable
- [ ] Post-change verification
- [ ] Automatic rollback trigger for failed verification
- [ ] Change history/audit log
- [ ] Signed or integrity-checked change artifacts

Acceptance criteria:

```text
Snapshot
  -> Validate
  -> Diff
  -> Approve
  -> Apply
  -> Verify
  -> Commit
       or
     Rollback
```

No direct mutation path should bypass this lifecycle without an explicit low-level escape hatch.

### Phase 6 — Live Router Connectivity

**Status: PLANNED**

Goal: connect the configuration engine to real routers safely.

Connectivity priorities:

1. Offline export/import
2. RouterOS REST API
3. RouterOS API
4. SSH/CLI where required

Deliverables:

- [ ] Connection profiles
- [ ] Credential isolation
- [ ] Capability discovery
- [ ] Read-only mode
- [ ] Connection health checks
- [ ] Snapshot retrieval
- [ ] Controlled write operations
- [ ] Timeout/retry policy
- [ ] Session safety
- [ ] RouterOS version compatibility gate
- [ ] Deployment verification

Security requirements:

- Never store plaintext router passwords in source control.
- Credentials must be isolated from configuration artifacts.
- Least privilege must be supported.
- Read-only operation must be possible.
- Sensitive values must be redacted from logs and exports.

### Phase 7 — Multi-Router Management

**Status: PLANNED**

Goal: manage a fleet rather than a single router.

Deliverables:

- [ ] Router inventory
- [ ] Tags/groups/sites
- [ ] Fleet health dashboard
- [ ] Configuration snapshots
- [ ] Fleet-wide audit
- [ ] Policy assignment
- [ ] Staged deployment
- [ ] Deployment batches
- [ ] Failure isolation
- [ ] Fleet rollback
- [ ] Router capability matrix
- [ ] Version distribution

Acceptance criteria:

- A failed router must not silently compromise the state of other routers.
- Fleet operations must show exactly which routers will change before execution.

### Phase 8 — Configuration Drift and Desired State

**Status: PLANNED**

Goal: continuously detect divergence between intended and actual configuration.

Deliverables:

- [ ] Desired-state repository
- [ ] Periodic snapshots
- [ ] Semantic diff engine
- [ ] Drift detection
- [ ] Drift severity
- [ ] Drift history
- [ ] Accept/reject drift
- [ ] Reconciliation plan
- [ ] Alert integrations
- [ ] Scheduled audits

Core model:

```text
Desired State
      |
      v
Actual State
      |
    Diff
      |
    Risk
      |
Reconciliation Plan
```

### Phase 9 — Configuration as Code / GitOps

**Status: PLANNED**

Goal: make RouterOS infrastructure versionable, reviewable and reproducible.

Proposed repository model:

```text
routers/
  cairo-core.yaml
  branch-01.yaml

policies/
  firewall.yaml
  management.yaml
  routing.yaml
  vpn.yaml

baselines/
  home.yaml
  enterprise.yaml

recipes/
  ...
```

Deliverables:

- [ ] YAML/JSON desired-state schema
- [ ] Git-backed configuration
- [ ] Generated RSC artifacts
- [ ] Semantic diffs
- [ ] CI validation
- [ ] Pull-request review workflow
- [ ] Policy tests
- [ ] Deployment manifests
- [ ] Rollback references
- [ ] Drift-to-PR workflow

### Phase 10 — AI Configuration Copilot

**Status: PLANNED**

Goal: provide an explainable AI interface over deterministic RouterOS tooling.

Capabilities:

- [ ] Explain configuration
- [ ] Explain findings
- [ ] Diagnose failures
- [ ] Answer documentation-grounded questions
- [ ] Propose configuration changes
- [ ] Generate candidate policies
- [ ] Generate migration plans
- [ ] Explain diffs
- [ ] Convert operator intent into structured policy
- [ ] Validate generated output through deterministic engines

AI safety contract:

```text
User Intent
   -> AI Interpretation
   -> Structured Change Proposal
   -> Deterministic Validation
   -> Documentation Check
   -> Diff
   -> Human Approval
   -> Deployment
```

AI must not be the final authority over executable router configuration.

### Phase 11 — Ecosystem and Community

**Status: PLANNED**

Goal: turn the project into a reusable open-source RouterOS configuration ecosystem.

Deliverables:

- [ ] Recipe registry expansion
- [ ] Community recipe contribution workflow
- [ ] Recipe tests
- [ ] Provenance requirements
- [ ] False-positive reporting
- [ ] Stale-data reporting
- [ ] Compatibility reports
- [ ] Public configuration examples
- [ ] CLI package/release
- [ ] API documentation
- [ ] GitHub Action integrations
- [ ] Contributor documentation
- [ ] Release automation

Growth principle:

The project should earn stars through useful tooling, documentation, reproducible examples and community contributions. No artificial star manipulation, spam or misleading claims.

## 6. Cross-Cutting Workstreams

These workstreams apply to every phase.

### Testing

- Unit tests for parsers and rules
- RouterOS 6/7 fixtures
- Golden configuration tests
- Regression tests for every bug
- Security tests
- API contract tests
- End-to-end web tests
- Deployment smoke tests

### Security

- Secret redaction
- Input size limits
- SSRF protection for router integrations
- Authentication/authorization boundaries
- Audit logs
- Dependency scanning
- Secure defaults
- No credential leakage in diagnostics

### Documentation

- User documentation
- Operator runbooks
- Architecture decision records
- Official-source provenance
- Migration guides
- RouterOS version notes
- Troubleshooting
- Examples

### Observability

- Structured logs
- Error IDs
- Deployment IDs
- Change IDs
- Audit events
- Performance metrics
- Failure classification

### UX

Every destructive or potentially disruptive action must clearly show:

- target router(s)
- RouterOS version
- exact changes
- expected impact
- risk
- source/evidence
- rollback path
- approval state

## 7. Definition of Done

A feature is not complete merely because its code works.

A roadmap item is considered done only when applicable requirements are satisfied:

- [ ] Implementation
- [ ] Unit/integration tests
- [ ] RouterOS fixture coverage
- [ ] Error handling
- [ ] Security review
- [ ] RouterOS version behavior documented
- [ ] Official documentation provenance
- [ ] User documentation
- [ ] CLI/API/UI integration as applicable
- [ ] Rollback behavior for state-changing features
- [ ] CI passes
- [ ] No known critical regression

## 8. Release Gates

### Experimental

May change APIs and behavior. Must be clearly marked.

### Beta

Core behavior is tested and documented. Breaking changes are controlled.

### Production

Requires:

- deterministic validation
- security review
- tested rollback for state-changing operations
- RouterOS version coverage documented
- official documentation provenance
- CI green
- deployment verification
- operational documentation

## 9. Priority Rules

When choosing what to build next, use this order:

1. Correctness and data integrity
2. Safety and security
3. RouterOS compatibility
4. Deterministic validation
5. Explainability and provenance
6. Operator workflow
7. Automation
8. Community/ecosystem growth
9. Cosmetic improvements

Do not prioritize a feature only because it is likely to generate attention if it weakens correctness or safety.

## 10. Current Execution Queue

The immediate sequence after this roadmap is established:

1. RouterOS Configuration Domain Model
2. Deterministic RouterOS export parser
3. Official MikroTik Documentation Knowledge Base contract
4. Expand Firewall Doctor into RouterOS Doctor
5. Unified findings/provenance model
6. Configuration Compiler / desired-state model
7. Semantic configuration diff — COMPLETE
8. Safe Change Set + rollback engine — NEXT
9. Live REST/API connector
10. Multi-router inventory
11. Drift detection
12. GitOps / Configuration as Code
13. AI Configuration Copilot

Do not skip ahead to AI or fleet deployment while the configuration model, validation and safety foundations are incomplete.

## 11. Source-of-Truth Hierarchy

When information conflicts, use this hierarchy:

1. Official MikroTik documentation/manuals for RouterOS behavior
2. Executable tests and verified RouterOS fixtures
3. Repository architecture/contracts in this roadmap
4. Implemented code
5. Product documentation
6. Issues/discussions/examples
7. External articles/community posts

If code conflicts with the intended architecture, the code is considered incorrect until the roadmap is deliberately changed.

## 12. Change Control for This Roadmap

Changes to this file are architectural decisions, not casual documentation edits.

A roadmap change should state:

- what changed
- why it changed
- affected phases
- migration impact
- compatibility impact

Large architectural changes should be accompanied by an Architecture Decision Record under `docs/architecture/`.

## 13. Product North Star

The project succeeds when an operator can take a MikroTik router from:

```text
Unknown configuration
        |
        v
Discover
        |
        v
Understand
        |
        v
Audit
        |
        v
Define desired state
        |
        v
Generate + validate
        |
        v
Review diff
        |
        v
Deploy safely
        |
        v
Verify
        |
        v
Monitor drift
```

while being able to answer, for every important configuration decision:

**What changed? Why? According to which MikroTik documentation? What will it affect? Was it validated? Can it be rolled back?**

That is the standard this repository should be built around.
