# DNS Hardening

A reviewable recipe for reducing bypass through public DNS resolvers. It is intentionally separate from application blocking.

## Intent

Control direct use of selected public DNS resolvers and keep DNS policy explicit.

## Safety

Do not blindly block an entire DNS provider ASN. Large providers host unrelated services. Prefer exact resolver addresses or a tightly scoped policy, and verify the router's own DNS forwarding design first.

## Coverage

- IPv4: recipe can target resolver addresses such as `1.1.1.1`, `8.8.8.8`, `9.9.9.9`, and `208.67.222.222`.
- IPv6: include the corresponding resolver addresses when IPv6 is enabled.
- DoH/DoT: requires separate policy controls; resolver IP blocking alone is not equivalent to encrypted-DNS discovery prevention.

## Validation checklist

1. Export the router configuration before deployment.
2. Confirm the router itself can still resolve DNS as intended.
3. Test IPv4 and IPv6 clients.
4. Test UDP/TCP 53 and any explicitly controlled encrypted-DNS endpoints.
5. Confirm management traffic remains reachable.

The recipe is a template for reproducible policy generation, not a claim that every network should block these services.
