# Semantic Configuration Diff

The semantic diff compares a RouterOS export that has already passed through the parser and semantic normalizer with an explicit desired-state document.

Use it offline:

```bash
node tools/routeros-parser.js router.rsc --json > actual-parser.json
node tools/routeros-semantic.js actual-parser.json > actual-semantic.json
node tools/routeros-diff.js actual-semantic.json desired-state.json --json
```

The engine is read-only. It does not connect to or modify a router.

The result reports:

- `add`: desired resource is missing from actual state
- `remove`: actual resource is absent from desired state
- `change`: the same semantic resource differs
- `unchanged`: counted resources with no change
- `conflict`: duplicate/ambiguous identities

Attribute changes are represented individually. Secret-like attributes are redacted before appearing in diff output.

Firewall and other order-sensitive families preserve and compare resource order. An order change is marked high risk and requires review.

A conflict is fail-closed: operators must resolve identity ambiguity before reconciliation.

The diff is intentionally separate from the compiler. Compiler output can later be attached to a reviewed Change Set, but the diff itself never performs deployment.
