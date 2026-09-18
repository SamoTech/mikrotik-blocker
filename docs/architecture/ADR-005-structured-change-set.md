# ADR-005 — Structured Change Set and Rollback Contract

## Status
Accepted

## Decision
Introduce a deterministic Structured Change Set between semantic diff and any future deployment mechanism.

Semantic Diff -> Change Set -> Snapshot -> Validate -> Approve -> Apply -> Verify -> Commit or Rollback.

The Change Set is initially read-only. It records exact proposed changes, risk, approval state, snapshot requirement, verification requirement and rollback preparation.

Safety rules:
- conflicts block the Change Set
- critical risk blocks the Change Set
- removals are high risk by default
- state-changing sets require a snapshot
- approval is explicit
- rollback is prepared before future apply
- no router connection or mutation occurs here
- secret-like attributes are redacted

Rollback is an artifact only. Snapshot restore remains the fallback where a deterministic inverse cannot be safely reconstructed.