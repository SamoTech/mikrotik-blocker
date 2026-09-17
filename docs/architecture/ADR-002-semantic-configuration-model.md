# ADR-002: Semantic RouterOS Configuration Model

Status: Accepted  
Date: 2026-09-17  
Roadmap: Phase 1 — RouterOS Configuration Intelligence

## Decision

Introduce a semantic normalization layer above the deterministic RouterOS export parser.

The parser remains responsible for lossless syntax extraction. The semantic layer converts recognized RouterOS paths into stable resource objects consumed by Doctor, Diff, Compiler and future live connectors.

## Design

Each semantic resource contains:

- `kind` — stable resource family, for example `firewall.filter`, `interface`, `ip.address`
- `path` — canonical RouterOS menu path
- `identity` — deterministic identity derived from resource attributes
- `attributes` — normalized key/value configuration
- `source` — source line range and original command index
- `version` — detected RouterOS compatibility information
- `status` — `recognized`, `partial`, or `opaque`

Unknown syntax is retained by the parser and surfaced as `opaque`; semantic normalization must never silently discard it.

## Identity Rules

Identity must be deterministic and stable across formatting-only changes. Where RouterOS provides an explicit immutable identifier, it is preferred. Otherwise the normalizer uses a canonical tuple of path plus resource-defining attributes.

Generated or volatile values must not become semantic identity unless unavoidable.

## Normalization Rules

- Preserve original values where interpretation is uncertain.
- Normalize whitespace and quoting without changing meaning.
- Normalize boolean and numeric representations only when RouterOS semantics are known.
- Keep list-valued attributes structurally distinguishable from scalar values.
- Preserve command ordering separately from semantic identity because RouterOS rule order can be operationally significant.
- Keep source references for every normalized resource.

## Initial Resource Families

The first semantic coverage target is:

`system`, `interface`, `ip`, `ipv6`, `routing`, `ip/firewall`, `user`, `certificate`, `ppp`, `queue`, `system/script`, and `system/scheduler`.

Coverage is incremental. Unsupported submenus remain available through the lossless parser representation.

## Consumers

```text
.rsc export
   -> deterministic parser
   -> semantic normalizer
   -> configuration model
      -> Doctor
      -> Diff
      -> Compiler
      -> Snapshot
      -> Live connector
```

## Safety

The semantic model is read-only. It does not execute RouterOS commands. Any future mutation must pass through the Change Set lifecycle defined by the canonical roadmap.

## Consequences

Positive:

- One configuration representation can serve all future modules.
- Audit rules stop duplicating ad-hoc parsing.
- Semantic diffs become possible.
- RouterOS 6/7 compatibility can be attached to resource families.

Trade-off:

- The model must evolve as RouterOS exposes new resource types.
- Some commands cannot be safely interpreted and therefore remain partially normalized or opaque.

## Acceptance Tests

A valid export must produce deterministic semantic output across repeated runs. Formatting-only changes must not alter resource identity. Unknown commands must remain visible with source references. Ordering-sensitive resources must preserve original order metadata.
