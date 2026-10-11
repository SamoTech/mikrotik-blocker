# Project Brain — MikroTik Configuration Manager

**Canonical repository:** [SamoTech/mikrotik-blocker](https://github.com/SamoTech/mikrotik-blocker)  
**Last reviewed:** 2026-10-11  
**Status:** Active engineering guidance  
**Authority:** This file explains how to reason about and operate the project. `ROADMAP.md` remains the canonical source for roadmap state, phase priorities, and release gates.

## 1. Mission and product identity

Build a trustworthy, open-source MikroTik RouterOS configuration management system. The original domain/IP firewall blocker remains a first-class product module, but it is not the whole product.

The product lifecycle is:

```text
Discover → Snapshot → Normalize → Understand → Audit
         → Define intent → Compile → Validate → Diff
         → Approve → (future separately authorized executor)
         → Verify → Observe drift → Reconcile
```

The core promise is not “generate a lot of block rules.” It is to produce configuration changes an operator can understand, validate, review, test, and reverse with documented evidence.

## 2. Non-negotiable invariants

1. **Safety is an architectural property.** Read-only behavior must be the default and validated in code, not merely described in UI text.
2. **No hidden router mutation.** Existing deployment plans are non-executable artifacts. No feature may introduce a live write path as a side effect of parsing, audit, simulation, dry-run, CLI inspection, or documentation examples.
3. **Fail closed on unknowns.** Unknown RouterOS version, unsupported syntax, missing snapshot outcomes, invalid fingerprints, secret-bearing objects, unsupported capabilities, stale approvals, and uncertain targets must block state-changing eligibility.
4. **Determinism matters.** For identical normalized inputs and versioned rules, parsers, finding engines, snapshots, audits, manifests, diffs, IDs, and fingerprints should produce identical output except explicitly declared operational metadata.
5. **Integrity hashes do not replace semantic validation.** Recomputing a digest must not turn a structurally invalid, tampered, secret-bearing, stale, or misbound object into a valid artifact.
6. **Version behavior is explicit.** RouterOS 6 and 7 differences must be represented in compatibility metadata, tests, and user-facing output. Never infer compatibility silently.
7. **Evidence precedes recommendations.** A finding should include observed evidence, affected resource, confidence, severity rationale, applicable RouterOS versions, official source, and suggested next action.
8. **AI is advisory.** AI may explain or propose structured intent. Deterministic parsers, schemas, compatibility checks, validators, and human authorization control executable outcomes.
9. **Never leak secrets.** Credentials, tokens, private keys, password fields, embedded URL credentials, and equivalent values must not enter logs, test snapshots, exported evidence, or documentation examples.
10. **No production claim without evidence.** Say “implemented” only when code exists; “tested” only when the relevant test ran; “verified” only when a concrete result supports it. Label foundation, partial, planned, and verified states distinctly.

## 3. Source-of-truth hierarchy

Resolve conflicts in this order:

1. Official MikroTik documentation/manuals for RouterOS semantics and compatibility.
2. Executable tests, negative tests, and verified RouterOS fixtures.
3. `ROADMAP.md` for project priorities, phase status, acceptance criteria, and release gates.
4. Accepted Architecture Decision Records under `docs/architecture/`.
5. Existing safety contracts under `docs/configuration/` and `docs/knowledge-base/`.
6. Implemented code, if it agrees with the contracts above.
7. README/product docs, examples, issues, pull requests, and third-party commentary.

If code contradicts a higher-level contract, do not quietly adjust the contract to rationalize the code. Identify the conflict and fix the lower-level implementation, or submit an explicit ADR and roadmap change when the architecture genuinely needs to change.

## 4. Current architecture map

- `frontend/`: Vite/React web UI.
- `api/`: serverless API handlers used by the deployed web app.
- `backend/`: separate Express/RouterOS package; treat its relationship to `api/` as a potential duplication/ownership question, not as interchangeable without inspection.
- `cli/`: offline command-line interface.
- `tools/`: deterministic RouterOS model, parser, semantic representation, compiler, finding engine, policy simulation, validation/approval/change-set/snapshot/fleet foundations, and tests.
- `schemas/`: machine-readable contracts.
- `recipes/`: reusable firewall recipe registry.
- `docs/firewall/`: firewall reference material.
- `docs/configuration/`: dry-run, snapshot, approval, validation and deployment safety contracts.
- `docs/architecture/`: ADRs and architecture contracts.
- `docs/knowledge-base/`: official MikroTik source/provenance model.
- `.github/workflows/`: CI and configuration tooling checks.
- `ROADMAP.md`: canonical sequence of work and acceptance criteria.

Do not assume the directories have identical production status or deployment roles. Before changing an area, trace callers, deployment target, package dependencies, tests and docs.

## 5. Existing foundation versus gaps

The repository contains deterministic foundations for the configuration parser and semantic model, compiler, compatibility handling, diff/change-set/snapshot/validation/approval/deployment-plan contracts, read-only REST connector, connection profiles and health checks, inventory/capability binding, fleet inventory/targeting/snapshots, and an open PR for fleet-wide audit.

Important distinctions:

- PRs #2–#6 are already merged and provide the capability, inventory, targeting, integrity, and fleet-snapshot prerequisites. PR #7 remains open and proposes fleet-wide audit; its branch-head feature is not part of `main` until merged.
- Treat current PR #7 as the remaining fleet-audit increment. Recheck its current head SHA, exact-head CI/tooling results, Vercel status, and mergeability before any merge.
- The repository has focused tooling tests in `tools/`; `.github/workflows/tooling.yml` invokes many of them. `.github/workflows/ci.yml` checks selected API syntax and builds the frontend. Verify actual workflow triggers and run results before claiming coverage for a PR.
- The branch listing showed `main` as unprotected. Verify repository settings directly before assuming mandatory checks or review do or do not exist through other settings.
- There are both `api/` and `backend/` Node projects. Establish ownership, deployment, authentication, CORS, secrets handling and parity before consolidating or adding endpoints.
- README and ROADMAP describe a larger management product than the repository’s short public description. Keep positioning and current capability labels synchronized.

This is an initial repository review, not a complete code audit. Inspect actual implementation and current CI evidence before declaring a security issue or test failure confirmed.

## 6. Recommended execution order

### Gate 0 — Establish the exact baseline
1. Fetch current `main` SHA, branch inventory, open PRs, workflow files and recent workflow results.
2. For each open PR, inspect changed files, full diff, dependency on earlier PRs, tests, base SHA, head SHA, mergeability and CI runs.
3. Keep existing branch state intact; do not force-push or modify production configuration to make a check green.
4. Create a dependency graph for open fleet PRs. Prefer the smallest safe merge order and retest after each integration.
5. Record a baseline report with evidence links and a dated status.

### Gate 1 — Validation and CI reliability
1. Ensure tooling tests trigger for relevant `tools/`, `schemas/`, `cli/`, and documentation contract changes.
2. Use lockfile-driven `npm ci` when lockfiles exist and package layout supports it; verify first.
3. Standardize supported Node versions across workflows based on package/runtime requirements.
4. Run parser, semantic, compiler, compatibility, findings, simulation, validation, approval, change-set, snapshot, fleet inventory, fleet operation, fleet snapshot and fleet audit tests where present.
5. Include negative/tampering/secret-redaction tests; a passing happy path is insufficient.
6. Ensure failures make jobs fail, coverage is visible, and skipped jobs are not mistaken for passes.
7. Do not change required-check settings blindly; identify branch protection/rulesets and contexts first.

### Gate 2 — Complete the read-only fleet audit increment
1. Review PR #7 against the already-merged prerequisites from PRs #2–#6.
2. Verify audit consumes only validated inventory and snapshots and is explicitly mutation-disabled.
3. Verify complete router outcome coverage, canonical finding ordering, explicit partial failure, exact fingerprint binding, RouterOS capability/version checks and secret-field rejection.
4. Test tampered IDs/fingerprints, omitted routers, duplicate routers, mismatched profiles, malformed nested snapshots, unknown capabilities and mixed RouterOS major versions.
5. Merge only when dependencies are integrated and relevant checks pass. Then verify `main` has the code and rerun downstream tests.
6. Update `ROADMAP.md` only after implementation lands; distinguish code landed from broader audit UX or scheduled operation still being absent.

### Gate 3 — Make findings operationally trustworthy
1. Establish a shared finding schema used by single-router and fleet audit.
2. Each finding needs a stable rule ID, resource/path, evidence, severity, confidence, version applicability, official source, impact, recommendation, remediation class, suppression/acknowledgment state, and deterministic identity rules.
3. Preserve partial and unknown information instead of coercing it into “safe”.
4. Add RouterOS 6/7 fixtures and negative tests for unsupported constructs.
5. Track false positives and false negatives; a health score must not conceal a critical finding or imply compliance certification.

### Gate 4 — Build the official knowledge catalog
1. Reuse `docs/knowledge-base/` and its existing schema rather than creating a parallel source registry.
2. Each record should cite a precise official MikroTik URL and section, version applicability, evidence, confidence, test/fixture references, remediation classification and last verification date.
3. A stale or unreachable source must create a review condition; it must not silently validate a production rule.
4. Add CI validation for schema conformity, unique IDs, required provenance and URL format. Link checking can be scheduled separately to avoid flaky PR gates.
5. Never fabricate an official citation or promote third-party advice to authoritative RouterOS behavior.

### Gate 5 — Parser and semantic model completeness
1. Treat RouterOS export input as untrusted.
2. Enforce input size, encoding and resource limits. Never execute imported scripts.
3. Preserve unknown syntax with source line context or emit an explicit unsupported result; never silently drop statements.
4. Test quoted strings, escapes, multiline values, comments, unusual Unicode, malformed input, CRLF, empty input and large exports.
5. Define canonicalization so fingerprints remain stable without claiming semantically distinct configurations are equivalent.
6. Make parser diagnostics actionable and reference line/section locations.

### Gate 6 — Change artifacts and future execution boundary
1. Maintain the invariant: a deployment plan is non-executable and does not open a router connection.
2. Strengthen artifact integrity, expiry, approval binding, target binding and audit history.
3. Keep apply execution in a separate future design/ADR. Do not add write methods to the read-only connector.
4. Before any live executor, define operator authorization, least-privilege credentials, secure secret storage, preflight, per-device safe behavior, connection-loss cases, post-change verification, rollback execution, idempotency and audit retention.
5. Require lab-router tests for RouterOS versions and representative hardware before production status.
6. Never claim automatic rollback until rollback has been executed and tested under simulated and real failure conditions.

### Gate 7 — Product convergence
1. Establish which of `api/` and `backend/` owns production endpoints and RouterOS connectivity.
2. Map external routes and consumers before removing or combining anything.
3. Add end-to-end contract tests across CLI, compiler, manifest, doctor API, and web UI.
4. Keep offline/local functionality usable without credentials or a live router.
5. Treat analytics as optional and privacy-aware; do not upload raw configuration by default.
6. Explain risks, partial coverage, version limits, and unsupported RouterOS constructs to users.

### Gate 8 — Drift before GitOps or AI expansion
1. Reuse exact fingerprint-bound validated snapshots.
2. Define semantic categories: expected, unknown, benign normalization, operational drift and security-relevant drift.
3. Preserve history and acknowledgments without deleting evidence.
4. Produce reconciliation plans only; no automatic writes until a separate executor contract is accepted.
5. Add GitOps workflows after the drift model is reliable. AI copiloting comes later and must call deterministic tools rather than invent RouterOS facts.

## 7. Security threat model

Treat uploaded exports, device REST responses, user-entered hostnames/IPs/CIDRs/ASNs/URLs, imported recipes/manifests/inventory/snapshot JSON, AI-generated intent, GitHub issue/PR text, third-party documentation and dependency error payloads as untrusted.

Required controls:
- strict schema validation and bounds checks
- URL and network-target validation for SSRF-sensitive code paths
- rejection of embedded URL credentials
- explicit private-network handling appropriate to router management; do not blindly block all private IPs because routers often use private addresses
- egress allowlists or operator-configured targets where feasible
- request timeouts, bounded retries and response size limits
- output encoding in UI
- no shell interpolation of user-controlled input
- secret redaction before persistence/logging
- no credential material in fingerprints/artifacts
- least privilege for future live connections
- dependency and workflow security checks
- explicit failure states and no silent fallback into a more privileged path

This is a design checklist, not a claim that each control is currently verified.

## 8. Required tests for significant changes

Add applicable cases: happy path and deterministic repeatability; malformed/unsupported input; version mismatch and unknown capability; altered object with recomputed fingerprint; omitted/duplicate/reordered fleet members; stale/expired/mismatched approval; nested secret fields; partial router failures; timeout/empty/oversized responses; stable ordering under shuffled input; backwards compatibility for existing manifest/CLI/API behavior; and regression tests for the defect.

Tests must assert outcomes, not just “does not throw”. For mutation-sensitive paths, assert that no connection/write code is invoked during validation or dry-run.

## 9. Pull request protocol for humans and agents

Before editing: read this file, `ROADMAP.md`, relevant ADR/contracts, adjacent tests; inspect branch/base/head and parallel work; state intended behavior and safety impact; choose one small acceptance criterion.

During implementation: reuse existing modules; do not create another parser, validator, inventory, finding schema or provenance system; preserve explicit compatibility/error states; update tests alongside implementation; avoid unrelated refactors, lockfile churn and dependency expansion; never broaden permissions or add router writes as a shortcut.

Before merge: run relevant commands and report outcomes; review for secret leakage, unsafe defaults and documentation contradictions; verify target branch and current base; ensure CI is green on the actual PR head SHA; merge only when dependencies/checks pass; verify `main` after merge; record changes, evidence, risks and next action.

## 10. Definition of done

A task is complete only when acceptance criteria are met; relevant negative/tampering/safety tests ran; output is recorded; official RouterOS provenance exists where needed; docs and roadmap status are synchronized; no new unreviewed mutation path exists; relevant CI passes on the final commit; and remaining risks/unverified environments are disclosed.

“Code written”, “commit created”, “CI triggered”, “CI passed”, “deployed”, and “verified on a router” are different states. Never collapse them into one claim.

## 11. Project decision loop

```text
OBSERVE → ASSESS → PLAN → EXECUTE → VERIFY → RECORD → DECIDE
```

Every iteration ends with one of: **MERGE**, **REVISE**, **DEFER**, or **BLOCK**. A block must name the missing evidence or unmet prerequisite.

## 12. Immediate next work

PR #7 has merged as `b7f382149a6dde96053c9d9a3432761f5e21d2b7`; the fleet-audit implementation is present on `main`. Its pre-merge CI and Vercel checks passed, but the available workflow-run connector did not return post-merge runs, so a full post-merge suite is not claimed as verified.

Prioritize:
1. Land and validate the read-only semantic drift foundation using the existing snapshot validator and `tools/routeros-diff.js` rather than creating a parallel diff engine.
2. Ensure tooling CI executes the drift test and runs when architecture contracts or `ROADMAP.md` change.
3. Keep expected variances explicit, approved by reference, time-bounded, and visible in reports; preserve unknown states and security-relevant classifications.
4. Next after this foundation: persist drift history and acknowledgments, then add scheduled snapshots/freshness reporting and alert integrations.
5. Keep live router mutation and executable reconciliation out of scope until a separate executor ADR, security review and lab-validation plan are accepted.

## 13. Documentation map

- `ROADMAP.md`: phases, priorities, acceptance criteria and release gates; canonical roadmap.
- `README.md`: public entry point and high-level direction.
- `docs/architecture/ADR-*.md`: binding architecture decisions.
- `docs/architecture/fleet-configuration-snapshots.md`: fleet snapshot invariants.
- `docs/configuration/SAFE-DEPLOYMENT-BOUNDARY.md`: non-executable deployment-plan contract.
- `docs/configuration/APPROVALS.md`, `CHANGE-SETS.md`, `DRY-RUN.md`, `SNAPSHOTS.md`, `VERIFICATION-ROLLBACK-CONTRACT.md`: safety lifecycle contracts.
- `docs/knowledge-base/README.md`: official-source provenance policy.
- `.github/workflows/ci.yml`: API syntax and frontend build workflow.
- `.github/workflows/tooling.yml`: deterministic RouterOS/CLI tooling tests.

If these documents disagree, stop and resolve the contradiction explicitly rather than selecting whichever is convenient.
