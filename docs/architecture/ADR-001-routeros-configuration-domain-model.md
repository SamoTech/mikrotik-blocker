# ADR-001: RouterOS Configuration Domain Model

- Status: Accepted
- Date: 2026-09-17
- Scope: Phase 1 — RouterOS Configuration Intelligence

## Decision

Introduce a normalized, loss-aware RouterOS configuration domain model as the shared contract between parser, auditor, compiler, diff engine and deployment layers.

The model is intentionally resource-oriented. A configuration document contains metadata, detected RouterOS version, section inventory, normalized resources, diagnostics and parser statistics.

Each resource preserves:

- RouterOS menu/path
- original command and line number
- normalized attributes
- command verb
- source section
- stable resource identity when one can be derived safely

Unknown or unsupported syntax is never silently discarded. It is represented as a diagnostic and retained as an opaque command record.

## Parsing policy

The first parser targets RouterOS `.rsc` exports. It uses deterministic lexical handling for comments, quoted strings, escaped characters and command boundaries. It does not execute RouterOS scripting and does not evaluate variables or conditionals.

This is deliberate: parsing must be safe, reproducible and independent of a live router.

## Version policy

RouterOS version information is extracted from common export/header signals when present. When it cannot be detected, the model records `unknown` rather than guessing.

## Compatibility policy

The normalized model must remain loss-aware. New RouterOS syntax should produce an explicit `unsupported`/`unknown` diagnostic rather than disappearing from the model.

## Consequences

Positive:

- one representation can be reused by Doctor, Compiler and Diff
- deterministic tests can use committed `.rsc` fixtures
- unsupported syntax becomes visible
- RouterOS 6/7 compatibility can be expressed as data

Trade-off:

- the model is broader than the current firewall-only analyzer
- semantic interpretation remains a later layer; parsing alone does not claim that a configuration is secure or correct

## Non-goals

This ADR does not define live API connectivity, desired-state reconciliation, AI behavior or automatic deployment. Those belong to later roadmap phases.
