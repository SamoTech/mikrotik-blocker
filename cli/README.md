# MikroTik Blocker CLI

The CLI exposes the analysis engine without the web UI.

```bash
node cli/mikrotik-blocker.js inspect router.rsc
node cli/mikrotik-blocker.js inspect router.rsc --json
node cli/mikrotik-blocker.js validate router.rsc
node cli/mikrotik-blocker.js recipe search dns
node cli/mikrotik-blocker.js recipe show dns-hardening
```

The current CLI is intentionally offline for RouterOS inspection. It does not connect to a router or apply changes.
