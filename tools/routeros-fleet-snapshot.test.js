'use strict';

const assert = require('assert');
const { createConnectionProfile } = require('./routeros-connection-profile');
const { createCapabilityRecord } = require('./routeros-capability-matrix');
const { createFleetInventory } = require('./routeros-fleet-inventory');
const { createSnapshot } = require('./routeros-snapshot');
const { createFleetSnapshot, validateFleetSnapshot, snapshotFingerprint } = require('./routeros-fleet-snapshot');

function profile(name, url) {
  return createConnectionProfile({ name, base_url: url, auth_reference: name.toLowerCase().replace(/\s+/g, '-'), created_at: '2026-09-19T00:00:00.000Z' });
}

function snapshot(fingerprint, capturedAt) {
  return createSnapshot({
    fingerprint,
    routeros: { version: '7.21.4', major: 7 },
    source: { name: 'rest' },
    resources: [{ kind: 'system.resource', path: '/system/resource', identity: 'system.resource', attributes: { uptime: '1d' }, status: 'recognized' }],
    diagnostics: []
  }, { captured_at: capturedAt });
}

const core = profile('Core Router', 'https://core.example');
const branch = profile('Branch Router', 'https://branch.example');
const coreCapability = createCapabilityRecord({
  connection_profile: core,
  routeros_version: '7.21.4',
  capabilities: { supported_operations: ['read', 'snapshot', 'audit'], api: { rest_available: true, rest_readonly: true }, resources: ['system/resource'] }
});
const branchCapability = createCapabilityRecord({
  connection_profile: branch,
  routeros_version: '7.20.1',
  capabilities: { supported_operations: ['read', 'snapshot'], api: { rest_available: true, rest_readonly: true }, resources: ['system/resource'] }
});
const fleet = createFleetInventory({ routers: [
  { connection_profile: core, name: 'Core', site: 'Cairo', tags: ['prod'], capability: coreCapability },
  { connection_profile: branch, name: 'Branch', site: 'Giza', tags: ['branch'], capability: branchCapability }
] });

const coreSnapshot = snapshot('core-actual', '2026-09-19T01:00:00Z');
const branchSnapshot = snapshot('branch-actual', '2026-09-19T01:00:01Z');
const fleetSnapshot = createFleetSnapshot({
  fleet,
  captured_at: '2026-09-19T01:01:00Z',
  entries: [
    { router_id: fleet.routers[0].id, status: 'captured', snapshot: coreSnapshot },
    { router_id: fleet.routers[1].id, status: 'captured', snapshot: branchSnapshot }
  ]
});

assert.strictEqual(fleetSnapshot.read_only, true);
assert.strictEqual(fleetSnapshot.mutation_enabled, false);
assert.strictEqual(validateFleetSnapshot(fleetSnapshot, { fleet }).valid, true);
assert.strictEqual(Object.isFrozen(fleetSnapshot), true);
assert.strictEqual(snapshotFingerprint(fleetSnapshot), fleetSnapshot.content_fingerprint);

const reordered = createFleetSnapshot({
  fleet,
  captured_at: '2026-09-20T01:01:00Z',
  entries: [
    { router_id: fleet.routers[1].id, status: 'captured', snapshot: branchSnapshot },
    { router_id: fleet.routers[0].id, status: 'captured', snapshot: coreSnapshot }
  ]
});
assert.strictEqual(reordered.content_fingerprint, fleetSnapshot.content_fingerprint);
assert.strictEqual(reordered.id, fleetSnapshot.id);

const partial = JSON.parse(JSON.stringify(fleetSnapshot));
partial.entries.pop();
partial.content_fingerprint = snapshotFingerprint(partial);
assert.strictEqual(validateFleetSnapshot(partial, { fleet }).valid, false);
assert.ok(validateFleetSnapshot(partial, { fleet }).errors.some(error => /exactly one outcome/.test(error)));

const crossTampered = JSON.parse(JSON.stringify(fleetSnapshot));
crossTampered.entries[0].connection_profile_id = branch.id;
crossTampered.content_fingerprint = snapshotFingerprint(crossTampered);
assert.strictEqual(validateFleetSnapshot(crossTampered, { fleet }).valid, false);

const secretBearing = JSON.parse(JSON.stringify(fleetSnapshot));
secretBearing.entries[0].error = { api_token: 'must-not-persist' };
secretBearing.content_fingerprint = snapshotFingerprint(secretBearing);
assert.strictEqual(validateFleetSnapshot(secretBearing, { fleet }).valid, false);
assert.ok(validateFleetSnapshot(secretBearing, { fleet }).errors.some(error => /Secret-bearing fleet snapshot field/.test(error)));

const writeEnabled = JSON.parse(JSON.stringify(fleetSnapshot));
writeEnabled.mutation_enabled = true;
writeEnabled.content_fingerprint = snapshotFingerprint(writeEnabled);
assert.strictEqual(validateFleetSnapshot(writeEnabled, { fleet }).valid, false);

assert.throws(() => createFleetSnapshot({ id: 'attacker', fleet, entries: [] }), /User-controlled fleet snapshot IDs/);
assert.throws(() => createFleetSnapshot({ fingerprint: 'attacker', fleet, entries: [] }), /User-controlled fleet snapshot IDs/);
assert.throws(() => createFleetSnapshot({ fleet, entries: [{ router_id: fleet.routers[0].id, status: 'captured', snapshot: coreSnapshot }] }), /exactly one outcome/);
assert.throws(() => createFleetSnapshot({
  fleet,
  entries: [
    { router_id: fleet.routers[0].id, status: 'failed', error: 'Authorization token leaked' },
    { router_id: fleet.routers[1].id, status: 'captured', snapshot: branchSnapshot }
  ]
}), /Secret-bearing fleet snapshot field/);

const failedIsolated = createFleetSnapshot({
  fleet,
  entries: [
    { router_id: fleet.routers[0].id, status: 'failed', error: 'Connection timed out.' },
    { router_id: fleet.routers[1].id, status: 'captured', snapshot: branchSnapshot }
  ]
});
assert.strictEqual(validateFleetSnapshot(failedIsolated, { fleet }).valid, true);
assert.strictEqual(failedIsolated.entries.find(entry => entry.router_id === fleet.routers[0].id).status, 'failed');
assert.strictEqual(failedIsolated.entries.find(entry => entry.router_id === fleet.routers[1].id).status, 'captured');

console.log('routeros-fleet-snapshot.test.js: all tests passed');
