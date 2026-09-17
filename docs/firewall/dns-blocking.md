# DNS-Based Blocking

DNS resolution is an identification mechanism, not the firewall decision itself. This project resolves names into network objects and then generates RouterOS enforcement rules.

## Why DNS-only blocking is incomplete

A domain can use multiple records, CDNs, CNAMEs, multiple hostnames, IPv6, application APIs, or third-party infrastructure. Conversely, a shared IP may serve unrelated domains.

For that reason, a resolver should combine DNS answers with CNAME traversal and, where appropriate, routing/ASN data.

## DNS enforcement choices

### Block resolved IPs

Resolve A/AAAA records and place the resulting addresses in address lists. This is simple but requires refresh when answers change.

### Block the DNS resolver itself

Restricting access to unauthorized public DNS resolvers can reduce bypass through alternate resolvers, but it is a separate policy from blocking a destination service.

### Router DNS policy

When RouterOS is the DNS resolver for clients, DNS policy can complement IP filtering. Do not assume DNS policy alone prevents access when clients can use DoH/DoT, hard-coded resolvers, or alternate network paths.

## DoH considerations

The current resolver uses multiple public DNS-over-HTTPS sources for discovery. This improves lookup resilience but does not mean client traffic should be forced through those providers. Discovery and enforcement are separate concerns.

## Refresh strategy

Dynamic domain-derived address lists should be refreshed periodically. The refresh interval should account for TTL behavior, service churn, router resources, and the risk of stale addresses.

## Verification

After generating a block, test both the expected domain and known alternate subdomains or service endpoints. Do not conclude that a domain is fully blocked because the apex hostname no longer resolves.
