# Approval Workflow

The approval workflow is the final human-control boundary before any future deployment mechanism.

Lifecycle:

```
Change Set
  -> Pre-change Snapshot
  -> Validation Gate
  -> Approval Artifact
  -> Future Deployment Boundary
```

An Approval Artifact records the exact Change Set fingerprint it authorizes. Approval is never inferred from validation success.

Statuses are:

- `pending`
- `approved`
- `rejected`
- `expired`

Rules:

- Automatic approval is forbidden.
- The artifact is read-only and integrity-fingerprinted.
- Approval must reference the Change Set ID and fingerprint.
- Approved artifacts require approver identity and timestamp.
- Rejected artifacts require a reason.
- Expired approvals cannot authorize deployment.
- The current repository does not apply changes to live routers.

The implementation is in `tools/routeros-approval.js`. The validation gate validates the approval artifact before considering a Change Set eligible for a future deployment boundary.
