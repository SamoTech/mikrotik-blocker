# Growth Strategy

The project should earn stars because it solves a recurring MikroTik problem, not because it asks for stars.

## The distribution unit

The smallest shareable unit is a **Firewall Recipe** or **Firewall Doctor finding**.

Each artifact should be understandable in under one minute, reproducible from the repository, safe to review before deployment and useful without installing the full application.

## GitHub discovery

Optimize repository metadata and content around the phrases network administrators actually search for:

- MikroTik firewall
- RouterOS firewall
- MikroTik blocklist
- RouterOS address list
- MikroTik domain blocking
- MikroTik ASN blocking
- MikroTik IPv6 firewall
- RouterOS firewall scripts
- MikroTik security
- RouterOS automation

Use these terms naturally in the README, documentation titles, recipe names, examples and release notes.

## Star-worthy README structure

The first screen now answers five questions immediately:

1. What problem does this solve?
2. Why is it different from a static blocklist?
3. What does a RouterOS result look like?
4. Can I use it without installing anything?
5. How can I contribute a recipe or diagnostic finding?

## Product-led shareable artifacts

The repository now has concrete artifacts for sharing:

- `tools/firewall-doctor.js` — offline RouterOS export analysis
- `tools/policy-simulator.js` — deterministic policy scope estimation
- `schemas/policy-manifest.schema.json` — machine-readable policy contract
- `recipes/` — reproducible recipe registry
- `action.yml` — reusable GitHub Action entry point
- `docs/SHAREABLE_DEMOS.md` — copyable demo flows

## Shareable demonstrations

Create small demonstrations that show a measurable before/after:

- domain → live infrastructure → generated policy
- ASN → current prefixes → RouterOS address-list
- IPv4-only policy → detected IPv6 gap
- firewall export → detected configuration issue → remediation
- policy manifest → estimated scope → review
- stale recipe → changed network data → refreshed policy

These demonstrations are more compelling than generic feature lists.

## Community loop

Use GitHub Issues and Pull Requests as the public contribution funnel:

- Request a recipe
- Report a stale prefix
- Report a false positive
- Submit a platform mapping
- Submit a RouterOS example
- Share a production-tested policy

Issue templates now collect RouterOS version, evidence, IPv4/IPv6 status, false-positive risk and rollback information where relevant.

## GitHub Action distribution

The root `action.yml` makes the Firewall Doctor consumable from configuration repositories. A network team can keep a sanitized RouterOS export under version control and have every pull request analyzed automatically.

```yaml
- uses: actions/checkout@v4
- uses: SamoTech/mikrotik-blocker@main
  with:
    file: router.rsc
```

## Release strategy

Prefer small, meaningful releases:

- new recipe
- RouterOS compatibility fix
- resolver improvement
- validation improvement
- data-source improvement
- firewall safety improvement

Release notes should include a concrete example whenever possible.

## Launch sequence

1. Publish the new product positioning and README.
2. Publish one Firewall Doctor demo using the checked-in fixture.
3. Publish the Policy Manifest example.
4. Publish the DNS hardening recipe as the first registry contribution.
5. Invite MikroTik administrators to submit false positives and recipes with the issue templates.
6. Turn validated community submissions into versioned recipes.
7. Publish release notes around real fixes and compatibility improvements.

## Avoid vanity growth

Do not use fake stars, star exchanges, spam comments, mass unsolicited promotion, misleading benchmarks, or claims that cannot be reproduced.

The project's reputation is more valuable than a temporary spike in stars.

## North-star conversion funnel

```text
GitHub search / technical post
          ↓
     README demo
          ↓
  Try a recipe / Doctor
          ↓
  Generate / validate policy
          ↓
       Review
          ↓
       Deploy
          ↓
      Trust result
          ↓
  Star / fork / contribute
          ↓
     More recipes
          ↓
   More organic discovery
```
