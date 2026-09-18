# ADR-004 — Semantic Configuration Diff

## Status

Accepted

## Context

The Configuration Compiler can generate deterministic RouterOS RSC from desired state, but generation alone does not establish what will actually change on a router.

Raw text diffs are insufficient because RouterOS exports can differ in whitespace, menu formatting, attribute ordering and other syntactic details without representing a semantic change. The platform therefore needs a diff layer operating on the normalized Configuration Domain Model.

## Decision

Introduce a deterministic, read-only semantic diff engine in `tools/routeros-diff.js`.

The engine compares:

- an actual normalized RouterOS semantic model
- an explicit desired-state document

The result is a stable change contract containing:

- `add`
- `remove`
- `change`
- `conflict`
- summary counts including `unchanged`

Each change contains identity, resource kind/path, before/after state, attribute-level changes, order changes where operationally relevant, risk and review requirements.

## Identity

The diff uses the same semantic identity function as the Configuration Domain Model. Preferred RouterOS attributes such as `.id`, `id`, `name`, `address`, `list` and `chain` are used when available; otherwise a deterministic attribute hash is used.

Duplicate identities are conflicts rather than silently reconciled.

## Safety

The diff engine is strictly read-only.

It must:

- never connect to a router
- never mutate configuration
- redact secret-like attributes in output
- mark removals for review
- treat order changes in order-sensitive RouterOS families as high risk
- expose conflicts instead of guessing

The diff is an input to Change Set generation, not a deployment mechanism.

## Determinism

Inputs are canonicalized before comparison and output changes/conflicts are sorted by stable IDs. The final diff receives a deterministic fingerprint.

## Non-goals

This ADR does not introduce:

- router connectivity
- automatic deployment
- rollback execution
- policy compilation
- AI interpretation

Those remain later lifecycle stages.

## Acceptance

The implementation is accepted when unit tests cover add/remove/change/unchanged, order-sensitive changes, duplicate conflicts, secret redaction and deterministic output, and CI executes those tests.
