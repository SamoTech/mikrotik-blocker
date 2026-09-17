# Firewall Hardening, Ordering, Logging and Rollback

## Protect management first

Before installing a generated block, verify that the change cannot remove access to the router's management plane. Test from a known management source and keep an out-of-band recovery path where possible.

## Rule ordering

A firewall rule only works if traffic reaches it. Review all rules above it, especially broad `accept` rules and established/related handling. Never assume that `place-before=0` is automatically correct for every router policy.

## Least scope

Use the narrowest network object that satisfies the blocking objective. Prefer a specific IP/CIDR or service list over an entire shared ASN when that avoids unrelated traffic being affected.

## Logging

Logging should be intentional and bounded. A high-volume drop rule can generate enormous logs and consume CPU/storage. For troubleshooting, enable targeted or rate-limited logging temporarily, collect evidence, then disable it.

## Change ownership

Generated objects should have deterministic names and comments. This makes automated updates safer and prevents a refresh job from deleting administrator-managed rules by accident.

## Rollback

Every generated policy should have a rollback path based on the same list name and rule comment used during deployment. Prefer disable/remove of the specific generated rule and its owned entries rather than restoring the entire firewall.

## Maintenance

After deployment, monitor:

- firewall counters
- CPU/load
- connection behavior
- IPv4 and IPv6 reachability
- false positives
- stale or missing prefixes

A block that initially works can become incomplete as the target service changes its infrastructure.
