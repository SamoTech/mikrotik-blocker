# IPv6 Firewall Filter Rules

IPv6 is a separate firewall policy domain in RouterOS. A block implemented only under `/ip firewall` does not cover equivalent IPv6 traffic.

## Basic pattern

```rsc
/ipv6 firewall address-list
add list=blocked_sites_v6 address=2001:db8::10 comment="example.com"

/ipv6 firewall filter
add chain=forward dst-address-list=blocked_sites_v6 action=drop comment="Block blocked_sites_v6"
```

## Operational requirements

- Resolve and maintain AAAA records where domain blocking is intended to cover IPv6.
- Maintain IPv6 prefixes separately from IPv4 prefixes.
- Review existing `input`, `forward`, and `output` IPv6 policies before insertion.
- Test dual-stack clients; an IPv4-only test can falsely suggest that the block works.

## Data hygiene

Do not place an IPv4 address in an IPv6 list or mix unrelated list semantics. Keep list naming explicit when a project maintains parallel IPv4 and IPv6 data.

## RouterOS generation

Generated examples must state the RouterOS generation they target. Validate syntax on the actual RouterOS release used in production before broad deployment.
