# Read-Only RouterOS REST Connector

Status: foundation only. No live deployment.

The connector establishes the Phase 6 boundary for RouterOS REST discovery. It currently permits only HTTP GET requests and exposes a small inspection contract for /rest/system/resource.

## Safety contract

- Read-only by construction.
- No PATCH, PUT, DELETE, or arbitrary POST/execute operations.
- No router mutation.
- No credential persistence.
- Credentials supplied by an integration layer are not returned in artifacts or error messages.
- Request paths reject traversal attempts.
- Requests have a timeout.
- Returned metadata explicitly records mode: read-only and mutation_performed: false.

RouterOS REST is available through the RouterOS web service and exposes CRUD operations plus arbitrary console commands. This project intentionally does not expose those mutating capabilities in this foundation. MikroTik documents REST over HTTPS at /rest and recommends avoiding plain HTTP because credentials can be exposed to passive eavesdropping.

## Initial inspection contract

The current inspection call reads GET /rest/system/resource and normalizes basic identity, architecture, RouterOS version and platform information.

The next connector stages should add read-only capability discovery and snapshot retrieval only after their contracts and tests are defined.

## Authentication boundary

RouterOS REST uses HTTP Basic Authentication. The connector does not choose, store, log, or serialize credentials. A future application integration must keep credentials outside configuration artifacts and audit output.

MikroTik also documents a dedicated rest-api user policy and notes that the default read group still carries broader permissions than a truly minimal read-only role. Production credential design must use a deliberately scoped custom policy rather than assuming the built-in read group is least privilege.

## Explicitly deferred

- Write operations.
- Arbitrary REST POST commands.
- Router configuration mutation.
- Automatic deployment.
- Credential storage.
- Multi-router inventory.
- Remote snapshot export.
- Automatic rollback.