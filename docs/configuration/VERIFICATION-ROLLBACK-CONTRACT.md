# Post-Change Verification and Rollback Contract

This contract defines the interface for the future execution layer. It does not connect to a router, apply configuration, verify live state, or execute rollback.

The intended lifecycle is:

```text
Approved Change Set
      ↓
Future Apply
      ↓
Verification Plan
      ↓
Post-Change Checks
      ↓
PASS → Commit
FAIL → Prepare Rollback → Explicit Operator Action
```

The contract requires:

- deterministic verification-plan identity
- Change Set linkage
- read-only artifacts
- explicit verification status
- no live router connection in this phase
- no reported mutation
- automatic rollback disabled
- rollback represented as an explicit operator action
- integrity-protected artifact data

A future executor must provide concrete checks appropriate to the RouterOS resource types being changed, such as configuration fingerprint comparison, resource existence/attributes, service reachability, and management-plane safety checks. Those checks must be version-aware and evidence-backed before execution is enabled.

This contract intentionally separates verification policy from execution. It does not authorize or implement live changes.
