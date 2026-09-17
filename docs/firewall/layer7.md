# Layer7 Blocking

Layer7 matching inspects packet payloads and compares them with a regular-expression pattern. It is different from address-list filtering because the decision depends on application-layer content rather than only on an IP/prefix match.

## Typical signatures

HTTP requests may expose a `Host` header. TLS ClientHello traffic may expose a Server Name Indication (SNI) hostname.

Example concept:

```rsc
/ip firewall layer7-protocol
add name=l7_example regexp="example\\.com"

/ip firewall filter
add chain=forward protocol=tcp layer7-protocol=l7_example action=drop comment="L7 block example"
```

The exact generated expression must match the traffic being inspected and the RouterOS implementation in use. Test generated expressions rather than assuming a generic regex covers every protocol variation.

## Limitations

Layer7 inspection is CPU-intensive because payloads are inspected. It is also not a universal HTTPS blocker. QUIC/HTTP3 uses UDP and will not be handled by a TCP-only matcher. Encryption, protocol changes, fragmentation, and newer privacy mechanisms can reduce or eliminate the visibility required for a match.

## Deployment guidance

Use Layer7 when a reliable packet-level signature is required and IP/CIDR enforcement is inadequate. Keep the rule scope narrow where possible, and monitor CPU and packet-processing impact.

## Testing

Test at least:

- direct HTTP
- TLS/SNI traffic
- multiple clients
- IPv4 and IPv6 where applicable
- application traffic that uses alternate domains or CDNs
- QUIC/UDP behavior when the service supports HTTP/3

A successful Layer7 match on one browser request is not proof that all application traffic is blocked.
