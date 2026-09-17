# ASN and CIDR Blocking

## Purpose

ASN and BGP-prefix blocking is the broadest network-level method supported by this project. It is useful when a service operates many domains or rapidly changing endpoints.

## Resolution model

The resolver combines live routing data with DNS-derived addresses and retains static fallback prefixes for selected platforms. This makes generation resilient when a live data source is unavailable, but static data must be treated as potentially stale.

## ASN risks

An ASN identifies an autonomous system, not necessarily one application. Cloud, CDN, hosting, and shared-provider ASNs can contain unrelated destinations.

Before using an ASN-wide block, determine:

- whether the ASN is dedicated to the target service
- whether the target service uses third-party infrastructure
- whether unrelated services share the same prefixes
- whether a narrower prefix or DNS-derived set can meet the objective

## CIDR risks

A broader prefix can block destinations that are not part of the intended service. Never expand a CIDR merely to simplify a script without checking its ownership and routing context.

## Data record

Every catalog entry should ideally contain:

```text
service
asn
prefix
address_family
source
verified_at
scope
notes
```

## Update strategy

Prefer live announced-prefix data for generation. Use static fallback data only when live sources fail or for known infrastructure that requires deterministic emergency behavior. Do not silently treat fallback data as current routing truth.

## Example

```rsc
/ip firewall address-list
add list=blocked_service address=198.51.100.0/24 comment="service CIDR"

/ip firewall filter
add chain=forward dst-address-list=blocked_service action=drop comment="Block service CIDR"
```

The example uses documentation address space and is illustrative only.
