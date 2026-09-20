# Fleet-wide Audit Foundation

## Purpose

The fleet-wide audit foundation evaluates a validated, read-only fleet snapshot without contacting or mutating routers. It is the deterministic audit stage between snapshot capture and later drift detection or deployment planning.

## Input boundary

The audit accepts:

- a validated fleet inventory;
- a validated fleet configuration snapshot bound to that inventory fingerprint.

The audit rejects invalid or tampered snapshots before producing findings. It does not accept caller-supplied audit IDs or fingerprints.

## Current deterministic findings

The foundation reports only evidence available from the snapshot and inventory:

- `FLEET_ROUTER_SNAPSHOT_FAILED` — high severity when a selected router has an explicit failed capture outcome;
- `FLEET_ROUTEROS_VERSION_MISMATCH` — high severity when a captured snapshot's RouterOS major version differs from the discovered capability record;
- `FLEET_MIXED_ROUTEROS_MAJORS` — medium severity when the fleet contains multiple RouterOS major versions.

These are structural/integrity findings, not claims about undocumented RouterOS behavior. Security-specific rules must be added only with deterministic evidence and authoritative MikroTik provenance where applicable.

## Integrity contract

Audit output is:

- deterministic for equivalent snapshot and inventory content;
- bound to both the fleet fingerprint and snapshot content fingerprint;
- canonically ordered by severity, rule code and router identity;
- read-only with mutation disabled;
- secret-free by construction and validated recursively;
- protected against user-controlled IDs and fingerprints.

Changing a finding, summary, fleet binding or snapshot binding invalidates the audit fingerprint and/or audit ID.

## Lifecycle position

```text
Fleet Inventory
      |
      +----> exact inventory fingerprint
      |
Fleet Configuration Snapshot
      |
      +----> semantic/integrity validation
      |
Fleet-wide Audit
      |
      +----> deterministic findings
      |
      +----> version distribution
      |
      +----> later drift detection / policy analysis
```

No deployment, rollback, router mutation or automatic approval is introduced by this foundation.
