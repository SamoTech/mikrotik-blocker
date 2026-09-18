# ADR-003: Unified Finding Contract

Status: Accepted

Date: 2026-09-18

## Context

RouterOS Doctor already produces useful findings, but individual analyzers can otherwise drift into different field names, severity handling, provenance structures, and ordering rules. That becomes a compatibility problem as RouterOS Doctor expands and additional analysis engines are introduced.

The semantic configuration model is the common input layer. Findings are the common output layer consumed by CLI, API, UI, remediation, reporting, and eventually change management.

## Decision

Introduce a shared finding contract in `tools/finding-engine.js`.

Every finding has a stable `id`, `check_id`, and `rule_id`, plus:

- `kind`
- `severity`
- `confidence`
- `title`
- `evidence`
- `resource_refs`
- `provenance`
- `remediation`
- `status`
- optional RouterOS and engine metadata
- legacy `fix` text for current consumers

The engine provides deterministic normalization, official knowledge provenance attachment, severity ordering, summary generation, and contract validation.

## Compatibility

Existing finding IDs remain unchanged. This is required because the safe remediation layer dispatches on finding IDs.

Existing consumer fields such as `severity`, `title`, `evidence`, `fix`, and `provenance` remain available.

The unified contract is additive rather than a breaking replacement.

## Safety

The finding engine is read-only. It must not generate or apply router mutations.

Remediation remains a separate layer. Findings may describe remediation, but applying a change requires the explicit Change Set lifecycle.

## Provenance

When a finding is backed by an official MikroTik knowledge record, provenance contains the knowledge record ID, official source metadata, confidence, and remediation classification.

Opaque or unsupported configuration must not be represented as verified behavior.

## Determinism

Findings are normalized and sorted by severity and then stable ID. The same semantic model must produce the same finding ordering and summary.

## Acceptance Criteria

- All current RouterOS Doctor findings satisfy the unified contract.
- Existing finding IDs remain stable.
- Official provenance remains attached.
- Current API/UI/remediation consumers continue to receive legacy fields.
- Finding engine has independent unit tests.
- CI validates the finding engine before downstream tooling.
