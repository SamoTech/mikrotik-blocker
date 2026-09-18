# Structured Change Sets

A Change Set is the safety boundary between configuration planning and deployment.

Use `createChangeSet(diff)` to create a deterministic review artifact, then `prepareRollback(changeSet)` to prepare its rollback artifact.

It contains the target RouterOS version, actual fingerprint, exact changes, risk, conflicts, approval state, snapshot requirement, verification requirement and rollback state.

This layer never connects to or modifies a router. Future deployment code must consume this contract rather than bypass it.