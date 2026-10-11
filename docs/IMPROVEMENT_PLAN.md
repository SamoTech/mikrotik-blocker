# Engineering Improvement Plan

**Review date:** 2026-10-11  
**Repository:** [SamoTech/mikrotik-blocker](https://github.com/SamoTech/mikrotik-blocker)  
**Companion guide:** [PROJECT_BRAIN.md](./PROJECT_BRAIN.md)  
**Canonical priority source:** `ROADMAP.md`

## Executive assessment

The project has a meaningful deterministic RouterOS configuration foundation. It is not yet appropriate to treat the larger multi-router management lifecycle as production-complete. The immediate risk is not lack of features; it is integrating the current fleet PR chain safely, verifying CI coverage, and preserving an enforceable read-only boundary while the feature surface expands.

This plan is additive. It does not supersede `ROADMAP.md` and does not claim that code has been tested or deployed by this document author.

## Verified repository observations

1. `ROADMAP.md` is explicitly the canonical project roadmap and still lists fleet-wide audit as in progress; open PR #7 proposes a deterministic read-only fleet audit.
2. The open PR series includes #2 capability model, #3 inventory integration, #4 operation targeting, #5 fleet state integrity hardening, #6 configuration snapshots, and #7 fleet-wide audit. These are related incremental branches. Inspect and establish dependency order before merging; do not assume they can be merged arbitrarily.
3. `.github/workflows/ci.yml` checks selected API JavaScript syntax and builds the frontend.
4. `.github/workflows/tooling.yml` runs broad tests under `tools/` plus manifest/parser/CLI smoke checks, but its path filters do not visibly include every documentation/architecture contract path.
5. The branch API response reported `main` as unprotected. Verify repository rulesets/branch protection in settings; this alone does not prove every possible repository policy is absent.
6. The repository contains both `api/` and `backend/` package surfaces. Ownership, production routing, authentication and responsibilities should be documented before consolidation.
7. Existing contracts explicitly say the live REST connector is read-only and deployment plans are non-executable.

## P0 — Integrate the fleet foundation safely

**Outcome:** `main` contains a coherent, test-backed fleet inventory → snapshot → audit chain.

Tasks:
- Fetch PR metadata and changed file lists for #2–#7.
- Compare each branch base/head to current `main`, identify shared files/dependencies, and inspect each patch in full.
- Run existing tests on each branch or a verified integration branch.
- Verify capability records bind to exact router/profile identities and normalized RouterOS version.
- Verify inventory fingerprints cover canonical inventory fields and cannot be supplied by callers.
- Verify fleet snapshots cover every selected router exactly once with either a validated capture or sanitized failure.
- Verify audit rejects missing/duplicate routers, mismatched snapshots, unknown/mismatched capabilities, secret-bearing fields and caller-forged IDs/fingerprints.
- Merge in dependency order only after checks pass; resolve conflicts semantically.
- Confirm final code exists on `main`, not only on feature branches.

**Exit criteria:** main contains intended incremental capabilities, targeted tests pass on the final base commit, and fleet operations remain read-only.

## P0 — CI coverage and branch-integrity verification

**Outcome:** critical deterministic/safety tests cannot silently be skipped on relevant changes.

Tasks:
- Verify workflow triggers for PR file lists, particularly architecture/configuration contracts and schemas.
- Add appropriate path coverage or a minimal documentation/schema validation workflow so contracts are checked when modified.
- Confirm `tooling.yml` runs all relevant existing tests, including fleet operation, fleet snapshot and fleet audit tests where present.
- Confirm validation scripts exit non-zero on invalid data.
- Align Node.js versions across workflows after verifying supported engines and lockfiles.
- Prefer `npm ci` for clean reproducible installs where lockfiles/package layout support it.
- Inspect latest run results on the exact final head SHA.
- Determine whether branch protection/rulesets should require relevant checks; do not modify settings without checking automated writers/contributors.

**Exit criteria:** relevant changes invoke required safety checks; results refer to current commit SHAs; merge policy matches actual governance needs.

## P1 — Make current maturity legible

**Outcome:** documentation distinguishes implemented, foundation-only, planned and verified-on-hardware behavior.

Tasks:
- Maintain a capability-status matrix linked to the canonical roadmap.
- Label read-only live connection, offline dry-run and non-executable deployment plans distinctly.
- Ensure no UI, README, demo or badge implies live writes or verified production rollback without evidence.
- Link each major capability to implementation, test and contract docs.
- Keep unmerged PR functionality out of current-capability claims.

## P1 — Unify findings and provenance

Use a shared finding contract for single-router and fleet audit, with stable rule ID/version, target router/resource and source location, severity and rationale, evidence/confidence, RouterOS applicability, official source URL/section, remediation class, expected impact, rollback reference where applicable, deterministic identity rules, and suppression/acknowledgment separate from original evidence.

Test stable IDs, canonical ordering, duplicate findings, unknown values, missing provenance, unsupported versions and partial fleet failures.

## P1 — Harden parser and artifact boundaries

Treat imported configuration and artifacts as untrusted. Add size/resource limits; test escaping, quoting, comments, multiline values, CRLF, Unicode, empty/malformed exports and unsupported syntax; preserve line/source context; validate nested objects semantically after checking hashes; test nested secret fields, caller-supplied IDs/fingerprints, stale approvals, mismatched Change Set binding, altered target inventory and partial failure. Error messages must help operators without exposing secrets or raw credential-bearing responses.

## P1 — Close backend/API ownership

Map Vercel/serverless routes, Express routes, frontend callers, deployment settings and environment variables. Identify whether `backend/` is active, legacy or local-only. Assign one owner per API responsibility. Audit authentication, CORS, DNS resolution, user-controlled URLs and router targets for SSRF/credential exposure. Do not delete or merge packages until production usage is proven. Add route tests for authorization, bounds, timeouts, sanitized errors and secret redaction.

## P2 — Authoritative knowledge catalog

Extend the existing `docs/knowledge-base/` contract. Validate schema, unique IDs, official MikroTik-owned sources, meaningful section anchors, version scope, last-verified date and test references. Separate source discovery from authoritative acceptance. Flag stale sources; never promote uncertain claims into verified rules. Start with a small catalog of high-impact rules.

## P2 — Drift before reconciliation

Sequence: periodic read-only snapshots; freshness and coverage reports; semantic actual-vs-desired diff; classify benign normalization, expected variance, unknown, operational drift and security-relevant drift; preserve history and acknowledgments; produce reconciliation plans only. Execution requires a separately accepted executor ADR.

## P3 — AI copilot only after deterministic tools mature

Allowed: explain validated findings, answer using official-source citations, convert operator requests into structured intent drafts, explain semantic diffs/risks, and generate candidate remediation artifacts for deterministic validation.

Disallowed: arbitrary CLI/script execution on routers, configuration bypassing schemas/compatibility checks, autonomous privilege expansion or secret retrieval, automatic approval or writes, and presenting uncertainty as confirmed RouterOS behavior.

## Metrics

- safety-test pass rate on target commit
- RouterOS-version fixture coverage
- secret-leak regressions (target: zero)
- audit determinism under shuffled input
- actionable findings with valid official provenance
- snapshot coverage and partial-failure visibility
- relevant PR checks skipped (target: zero)
- maintainer-confirmed versus false-positive findings
- rollback test success rate before any production execution release

Do not use raw block-list size or AI output volume as primary success metrics.

## Release gates

**Internal foundation:** deterministic tests pass; failure modes are explicit; no live writes.  
**Beta read-only management:** connection security and snapshot/audit coverage verified; version scope documented; error/partial-result UX complete.  
**Production change management:** separate executor architecture accepted; least privilege, integrity-checked approvals, preflight, backup, per-device failure isolation, post-change verification, rollback execution, audit logs and lab/hardware matrix all verified.  
**AI assistance:** only after tools and provenance are reliable, and never as an authorization authority.

## Immediate next action

Review the open fleet PR chain #2–#7 from earliest prerequisite through #7, validate each diff and CI run, then merge in dependency order. Do not jump to broad UI work, GitOps writeback or AI autonomy before this foundation is integrated and verified.
