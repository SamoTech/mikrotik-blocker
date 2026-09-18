# ADR-006 — Pre-Change Snapshot and Validation Gate

## Status
Accepted

## Decision

Introduce an immutable, deterministic pre-change snapshot and a fail-closed validation gate between Change Set generation and future approval/deployment.

```
Semantic Model
      ↓
Semantic Diff
      ↓
Change Set
      ↓
Pre-Change Snapshot
      ↓
Validation Gate
      ↓
Approval
      ↓
Future Apply
      ↓
Verification
      ↓
Rollback if required
```

The snapshot records the semantic state used by the Change Set, RouterOS/source metadata, diagnostics and integrity fingerprint. Capture time is metadata only and does not affect the deterministic content fingerprint.

A snapshot may be attached only when its semantic fingerprint corresponds to the Change Set actual fingerprint. Corruption and mismatches fail closed.

The validation gate checks Change Set structure, diff validity, conflicts, critical risk, snapshot integrity and correspondence, rollback readiness, RouterOS compatibility context and explicit approval when required.

## Safety boundaries

- No live router access in this phase.
- No automatic deployment.
- No router mutation.
- No automatic approval.
- Validation is fail-closed.
- Snapshot fingerprints must correspond to the actual state used for the Change Set.
- Rollback remains a separate safety artifact.
- Secret-like values are redacted from snapshot artifacts and integrity fingerprints.

Future live connectivity must capture a fresh snapshot before apply and must not bypass this gate.
