# Fleet Configuration Snapshot Contract

## Purpose

Fleet configuration snapshots provide a deterministic, read-only baseline of actual router state for later fleet-wide audit and drift detection. Snapshot capture never performs router mutation and never stores credential values.

## Contract

Each fleet snapshot is bound to the exact fleet inventory fingerprint used to select the routers. Every router in that fleet must have exactly one outcome:

- `captured` — contains a validated RouterOS semantic snapshot.
- `failed` — contains a sanitized failure description and no router snapshot payload.

The snapshot records the connection-profile reference for each router, but not credential material. Router snapshots are validated through the existing snapshot integrity contract before being accepted.

`captured_at` is operational metadata and is intentionally excluded from the content fingerprint. Router ordering is canonicalized by router identity, so equivalent captures produce deterministic fingerprints.

The fleet snapshot is explicitly `read_only: true` and `mutation_enabled: false`. User-controlled snapshot IDs and fingerprints are rejected; both are derived deterministically.

## Failure isolation

A failed router is represented as an explicit failed outcome rather than being omitted. This prevents a partial fleet capture from being mistaken for a complete baseline and ensures failure of one router cannot silently alter the interpretation of other routers.

## Integrity and tamper resistance

Validation checks:

1. fleet inventory validity and exact fleet fingerprint binding
2. complete and unique router coverage
3. router-to-connection-profile binding
4. nested RouterOS snapshot integrity
5. secret-bearing field rejection
6. read-only and mutation-disabled invariants
7. deterministic content fingerprint

An attacker who modifies a snapshot and recomputes its fingerprint still cannot bypass semantic validation or fleet binding checks.

## Lifecycle position

```text
Actual Router State
      |
      v
Read-only Snapshot Retrieval
      |
      v
Semantic Snapshot Validation
      |
      v
Fleet Snapshot Integrity Boundary
      |
      +----> Fleet Audit
      |
      +----> Drift Detection
      |
      +----> Pre-change Snapshot / Verification
```

No write operation is introduced by this contract.
