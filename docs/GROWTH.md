# Growth Strategy

The project should earn stars because it solves a recurring MikroTik problem, not because it asks for stars.

## The distribution unit

The smallest shareable unit is a **Firewall Recipe**.

A recipe should be:

- understandable in under one minute
- copyable in one click
- reproducible from the repository
- safe to review before deployment
- useful without installing the full application

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

The first screen should answer five questions immediately:

1. What problem does this solve?
2. Why is it different from a static blocklist?
3. Show me a real RouterOS result.
4. Can I use it without installing anything?
5. How can I contribute a recipe?

Avoid making visitors read the entire architecture before they see value.

## Shareable demonstrations

Create small demonstrations that show a measurable before/after:

- domain → live infrastructure → generated policy
- ASN → current prefixes → RouterOS address-list
- IPv4-only policy → detected IPv6 bypass
- firewall export → detected configuration issue → remediation
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

Each issue template should ask for enough technical evidence to reproduce the result.

## Release strategy

Prefer small, meaningful releases:

- new recipe
- RouterOS compatibility fix
- resolver improvement
- validation improvement
- data-source improvement
- firewall safety improvement

Release notes should include a concrete example whenever possible.

## Avoid vanity growth

Do not use fake stars, star exchanges, spam comments, mass unsolicited promotion, misleading benchmarks, or claims that cannot be reproduced.

The project's reputation is more valuable than a temporary spike in stars.

## North-star conversion funnel

```text
GitHub search / social post
          ↓
     README demo
          ↓
    Try one recipe
          ↓
  Generate / validate policy
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
