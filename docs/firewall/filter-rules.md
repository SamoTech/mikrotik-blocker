# IPv4 Firewall Filter Rules

## Placement

Use `chain=forward` for traffic traversing the router. Use `input` for traffic destined to the router itself and `output` for traffic originating from the router. A destination block for client traffic normally belongs in `forward`.

## Basic address-list block

```rsc
/ip firewall address-list
add list=blocked_sites address=203.0.113.10 comment="example.com"

/ip firewall filter
add chain=forward dst-address-list=blocked_sites action=drop comment="Block blocked_sites"
```

## Rule ordering

Firewall behavior depends on rule order. Place a block rule before any earlier rule that accepts the same traffic. Do not blindly use `place-before=0` in production without reviewing the full policy; an administrator may already have management, established/related, or bypass rules whose position is intentional.

## Established/related traffic

When using a conventional stateful firewall, review the position of established/related accept rules. A newly created connection can be blocked at the appropriate forward rule, while packets belonging to an already accepted connection may continue according to the connection-state policy.

## Logging

Logging every dropped packet from a high-volume list can overload the router and obscure useful events. Prefer temporary, rate-limited logging during diagnosis rather than permanent unrestricted logging.

## Dynamic updates

For generated address lists, use stable list names and comments so an update can remove or replace only entries owned by the generator. Avoid deleting an entire shared address-list unless ownership is explicit.

## Rollback

A production script should have a clearly identifiable block rule and list. Rollback should be possible with a targeted remove/disable operation rather than restoring the entire firewall configuration.
