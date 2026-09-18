# Safe Deployment Boundary

The deployment boundary is intentionally non-executing.

The current lifecycle is:

`Semantic Model → Semantic Diff → Change Set → Pre-Change Snapshot → Validation Gate → Human Approval → Deployment Plan`

A Deployment Plan is a read-only artifact describing what would be eligible for deployment after all gates pass. It is not an executor and does not open a RouterOS connection.

## Guarantees

- Validation Gate must pass before a plan can be ready.
- Required human approval must be valid and explicitly approved.
- The plan is always `read_only: true`.
- `deployment.executable` is always `false`.
- Router connectivity is explicitly disabled.
- Execution remains `not_started`.
- The plan contains integrity metadata for tamper detection.
- Failed validation produces a blocked, non-executable plan.
- No RouterOS API, SSH, WinBox, or other live mutation path is introduced by this module.

## Why this boundary exists

Configuration management should separate decision preparation from execution. A future deployment executor can consume a validated plan only after a separately designed execution contract exists.

That future contract must define:

1. connection and credential handling
2. pre-flight connectivity checks
3. transaction or safe-mode behavior
4. apply ordering
5. post-change verification
6. failure handling
7. rollback execution
8. audit events
9. authorization and approval expiry
10. explicit operator controls

None of those operations are performed by the current Deployment Plan module.

## Example

`createDeploymentPlan(changeSet, context)` returns either:

- `status: "ready"` with `executable: false`, or
- `status: "blocked"` with the Validation Gate evidence.

This makes the safety boundary testable without requiring a router or credentials.
