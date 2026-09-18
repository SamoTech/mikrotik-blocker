# RouterOS Dry-Run Pipeline

The dry-run pipeline composes the configuration-management safety foundation without connecting to or mutating a router.

```text
RouterOS export
   ↓
Parser
   ↓
Semantic model
   ↓
Semantic diff
   ↓
Change Set
   ↓
Pre-change snapshot
   ↓
Rollback preparation
   ↓
Optional human approval artifact
   ↓
Validation Gate
   ↓
Deployment Plan
```

The CLI entry point is:

`node tools/routeros-dry-run.js <actual.rsc> <desired-state.json> [--approval approval.json] [--json]`

Without an approval artifact, a Change Set that requires approval remains blocked. The pipeline never auto-approves a change.

With a previously approved artifact, the pipeline validates and attaches that artifact before generating the Deployment Plan. The approval remains an explicit operator action performed outside the dry-run pipeline.

Dry-run guarantees:

- `mode` is `dry-run`
- `read_only` is `true`
- `mutation_performed` is `false`
- deployment plans remain `executable: false`
- router connection remains disabled
- execution status remains `not_started`
- snapshots and rollback artifacts are generated locally as review data
- parser/semantic/diff/validation failures block the deployment plan

Dry-run is not a deployment mechanism. It is the offline integration point for reviewing the complete safety pipeline before a future execution layer is introduced.
