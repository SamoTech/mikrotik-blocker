# Pre-Change Snapshots

A pre-change snapshot is the immutable offline representation of the semantic RouterOS state against which a Change Set was generated.

Lifecycle:

```
Semantic Model -> Semantic Diff -> Change Set -> Pre-Change Snapshot
-> Validation Gate -> Approval -> Future Apply -> Verification -> Rollback
```

Snapshots provide a deterministic state reference before future state-changing operations. They contain semantic resources, diagnostics, RouterOS metadata, source metadata and an integrity fingerprint.

The content fingerprint is SHA-256 based and excludes capture time. Secret-like attributes are redacted before serialization and fingerprinting.

A snapshot can only be attached to a Change Set when its semantic fingerprint matches the Change Set actual configuration fingerprint. Structural validity alone is insufficient.

The validation gate is fail-closed. Missing snapshots, corruption, fingerprint mismatches, conflicts, critical risk, missing rollback preparation or missing required approval block eligibility.

Current limitation: snapshot creation is offline. This phase does not connect to a router or retrieve live state.

Future live-router integration will capture a fresh snapshot immediately before an approved state-changing operation and compare live state with the planned Change Set before apply.
