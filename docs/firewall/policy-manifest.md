# Policy Manifest

The Policy Manifest is the machine-readable contract between firewall intelligence and RouterOS deployment.

A manifest keeps five things together: why a policy exists, what evidence supports it, what it covers, what risk it carries, and how to reverse it.

## Lifecycle

`Intent → Evidence → Resolution → Risk → Policy → Validation → Deployment → Rollback`

The canonical schema is [`schemas/policy-manifest.schema.json`](../../schemas/policy-manifest.schema.json). A complete example is [`tools/policy-manifest.example.json`](../../tools/policy-manifest.example.json).

## Design rules

1. Evidence must be attributable to sources and generation time.
2. IPv4 and IPv6 coverage are separate facts; never infer IPv6 coverage from IPv4.
3. Shared infrastructure must be disclosed before broad CIDRs are recommended.
4. A policy is reviewable before deployment.
5. Every generated policy should have a rollback path.
6. The manifest is the stable interface; `.rsc`, CLI output, API responses and future GitHub Actions can be generated from it.

## Future compatibility

The schema is intentionally small. New generators can consume the manifest without depending on the web UI, while CI can validate manifests independently of a live router.
