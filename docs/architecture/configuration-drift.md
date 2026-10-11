# Read-only Configuration Drift

## Purpose

The drift engine compares one validated actual configuration snapshot with an explicit, complete desired-state document. It reuses `tools/routeros-diff.js`; it does not create a second semantic comparison implementation.

## Input contract

- Actual state must be a valid `routeros-snapshot` artifact whose content fingerprint verifies.
- Desired state must declare `schema_version: "1.0"`, `complete: true`, and a `resources` array. Partial intent is rejected because omitted resources otherwise look like removals.
- Desired state and report data reject secret-bearing field names.
- Expected variances require an exact change type and identity, a human-readable reason, an approval/change reference, and an explicit expiry timestamp. The caller must supply a fixed `evaluated_at` when variances are present. Expired variances no longer classify as expected.
- Report identity and fingerprints are derived internally; callers cannot supply them.

## Classifications

- `expected_variance`: exact, documented, unexpired exception match. The item remains in the report and is not deleted or hidden.
- `unknown`: semantic conflict or opaque resource; the engine cannot safely assert what the difference means.
- `benign_normalization`: path separator and attribute-key ordering differences normalized by the shared semantic diff are not emitted as drift items. The report records this normalization contract; no claim is made that arbitrary configuration differences are harmless.
- `operational_drift`: other deterministic differences outside the current security-sensitive resource families.
- `security_relevant_drift`: changes involving firewall, IPv6 firewall, user/group, or certificate resource kinds. This is a conservative routing classification, not a severity score or compliance claim.

These classifications do not replace authoritative MikroTik provenance for future rule-based security findings. Opaque resources and duplicate identities remain unknown/conflicted rather than being treated as compliant.

## Safety boundary

The report is read-only, has `mutation_enabled: false`, and explicitly sets `reconciliation_executable: false`. It contains no router connector or write path. No automatic reconciliation, router writes, approval, or rollback execution is implemented.

## Current limitations

- This is a deterministic comparison foundation, not a scheduled service.
- It does not persist history, provide alert integrations, or offer accept/reject workflows.
- Benign normalization is handled by the shared semantic diff and is not currently counted as an observed item.
- Security-relevant classification is based on resource kind only; it does not claim that every change is malicious or high severity.
