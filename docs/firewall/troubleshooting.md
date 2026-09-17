# Firewall Blocking Troubleshooting

## Block does nothing

Check rule order first. Confirm the packet is entering the expected chain and that an earlier accept rule is not terminating processing.

Then verify the destination actually matches the address-list. Check both IPv4 and IPv6 when the client is dual-stack.

## Domain works sometimes

Inspect DNS answers over time. Dynamic services can return different addresses by resolver, geography, CDN, or time. Re-run resolution and compare the generated objects.

Check CNAME targets and alternate service hostnames. Blocking only the apex domain is often insufficient.

## ASN block is too broad

Identify which prefixes caused the match and determine whether the ASN is shared. Replace broad ASN coverage with narrower prefixes or domain-derived addresses where practical.

## IPv4 blocked but IPv6 works

Inspect AAAA results and the `/ipv6 firewall` policy. An IPv4 address-list does not automatically constrain IPv6 traffic.

## Layer7 does not match

Confirm protocol and transport. A TCP-oriented signature will not match QUIC/HTTP3 traffic carried over UDP. Also consider TLS encryption, SNI visibility, fragmentation, and application-specific protocols.

## Router performance drops

Disable or narrow Layer7 rules, reduce logging, reduce unnecessary broad prefixes, and inspect connection and CPU counters. Large IP lists can also increase processing cost depending on hardware and rule placement.

## Safe diagnosis sequence

```text
1. /ip firewall filter print stats
2. /ip firewall address-list print where list=<name>
3. inspect IPv4/IPv6 resolution
4. inspect rule order
5. inspect connection state
6. test from one controlled client
7. only then broaden the policy
```
