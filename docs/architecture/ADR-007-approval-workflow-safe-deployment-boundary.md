# ADR-007: Approval Workflow and Safe Deployment Boundary

## Status

Accepted — foundation only.

## Context

The configuration engine now has semantic models, semantic diffs, structured Change Sets, rollback artifacts, pre-change snapshots and a fail-closed validation gate. A deployment mechanism must not be introduced without an explicit human decision boundary.

## Decision

Introduce a deterministic, read-only Approval Artifact.

The artifact:

- references one Change Set ID and exact Change Set fingerprint
- records approval status
- records approver identity and timestamp when approved
- records rejection reason when rejected
- supports expiry
- is integrity-fingerprinted
- explicitly declares `human-approved-only`
- forbids automatic approval

The validation gate must validate the approval artifact before a Change Set can cross a future deployment boundary.

## Consequences

Positive:

- approval is auditable and bound to exact configuration intent
- stale or modified Change Sets cannot silently reuse approval
- deployment remains a separate capability
- approval decisions are deterministic and testable

Constraints:

- this phase does not connect to routers
- this phase does not execute RouterOS commands
- this phase does not automatically approve anything
- a future deployment implementation must preserve this boundary

## Future lifecycle

```
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

Only the first four stages are implemented by this decision.
