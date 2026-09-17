# Address Lists

Address lists are the primary reusable object for IP-based blocking in this project.

## Ownership

A generated list should have a predictable name and comments identifying the source domain, platform, or catalog entry. This makes updates and rollback selective.

Example:

```rsc
/ip firewall address-list
add list=blocked_sites address=203.0.113.10 comment="example.com"
```

## What belongs in a list

Use address lists for concrete IP addresses and network prefixes that the firewall should match. Keep domain-resolution logic outside the list itself when a service requires DNS/ASN/BGP discovery.

## Separate scopes

Avoid using one shared list for unrelated policies. Separate lists when they have different ownership, update cadence, logging requirements, or enforcement semantics.

## Dynamic maintenance

The generator should:

1. resolve current data
2. normalize and deduplicate entries
3. identify entries previously owned by that generator
4. update only owned entries
5. leave unrelated administrator-managed entries intact

## Performance

Large lists are generally preferable to repeatedly inspecting every packet payload with Layer7 rules, but actual impact depends on list size, traffic rate, router hardware, and rule placement.

## Naming convention

Prefer deterministic names such as:

```text
blocked_<service>
blocked_<service>_v6
l7_<service>
```

Avoid names that depend on timestamps or random IDs when repeatable maintenance is required.
