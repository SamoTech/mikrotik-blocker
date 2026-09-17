# Shareable Demos

The project should be easy to understand from one screen and easy to share without asking users to trust an opaque IP list.

## Demo 1 — Service to policy

```text
facebook.com
        ↓
DNS + CNAME + ASN evidence
        ↓
IPv4 / IPv6 coverage
        ↓
Risk disclosure
        ↓
RouterOS address-list + filter policy
        ↓
Review + rollback
```

## Demo 2 — RouterOS export diagnosis

```bash
node cli/mikrotik-blocker.js inspect router.rsc
```

The output is designed to be pasted into an issue, pull request or support thread: finding ID, severity, evidence and suggested remediation.

## Demo 3 — Policy contract

```bash
node cli/mikrotik-blocker.js manifest validate tools/policy-manifest.example.json
node cli/mikrotik-blocker.js simulate tools/policy-manifest.example.json
```

The same manifest can eventually drive `.rsc`, API deployment, CI and signed release artifacts.

## Demo 4 — GitHub Action

```yaml
- uses: actions/checkout@v4
- uses: SamoTech/mikrotik-blocker@main
  with:
    file: router.rsc
```

The action is intended for configuration repositories where a RouterOS export is reviewed as code.

## Growth principle

The shareable artifact is the evidence-backed recipe or diagnostic result, not a generic promotional message. Every shared result should lead back to a reproducible source file, documented assumptions and a rollback path.
