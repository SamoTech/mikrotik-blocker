# Official MikroTik Knowledge Base

This directory defines the provenance contract for RouterOS configuration knowledge used by MikroTik Configuration Manager.

## Source policy

Production configuration guidance must be grounded in official MikroTik documentation whenever the relevant behavior is documented there. Third-party material may be used for research or discovery, but it is not sufficient provenance for a production rule or remediation recommendation.

## Knowledge record contract

Each knowledge record must provide:

- `id`: stable machine-readable identifier.
- `title`: concise human-readable title.
- `domain`: RouterOS domain or feature area.
- `routeros`: supported RouterOS version range when version-specific behavior matters.
- `source`: official documentation provenance.
- `intent`: the operational question or behavior being described.
- `evidence`: the documented behavior relied upon by the rule.
- `severity`: informational, low, medium, high, or critical when the record is used by Doctor.
- `confidence`: high, medium, or low, reflecting evidence quality rather than model certainty.
- `remediation`: whether the record is informational, review-only, generated, or safe-to-apply.
- `tests`: fixtures or deterministic checks that validate the interpretation.
- `lastVerified`: date the official source was last checked.

## Provenance requirements

A production record must identify an official MikroTik documentation URL and a meaningful section or anchor. The URL must resolve to MikroTik-owned documentation. If the official documentation does not establish a claim, the record must not present that claim as an authoritative RouterOS fact.

## Version awareness

RouterOS behavior can differ between major versions. Records must state a version range when the documented behavior is version-specific. Unknown version behavior must remain explicitly unknown rather than inferred.

## Safety boundary

Knowledge records explain RouterOS behavior. They do not authorize mutations. Any state-changing action must pass through the Change Set lifecycle with validation, review, backup, rollback, and verification requirements defined by the main roadmap.

## Machine-readable schema

The canonical JSON Schema is [`schemas/knowledge-record.schema.json`](./schemas/knowledge-record.schema.json).
