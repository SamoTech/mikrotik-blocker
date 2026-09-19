'use strict';

const assert = require('assert');
const { createConnectionProfile } = require('./routeros-connection-profile');
const { createCapabilityRecord } = require('./routeros-capability-matrix');
const { createFleetInventory, validateFleetInventory, fleetFingerprint } = require('./routeros-fleet-inventory');

function profile(name, url) {
  return createConnectionProfile({ name, base_url: url, auth_reference: name.toLowerCase().replace(/\s+/g, '-'), created_at: '2026-09-19T00:00:00.000Z' });
}

const core = profile('Core Router', 'https://core.example');
const branch = profile('Branch Router', 'https://branch.example');
const coreCapability = createCapabilityRecord({
  connection_profile: core, routeros_version: '7.21.4',
  capabilities: { supported_operations: ['read', 'snapshot', 'audit'], api: { rest_available: true, rest_readonly: true }, resources: ['system/resource', 'ip/firewall/filter'] }
});
const branchCapability = createCapabilityRecord({
  connection_profile: branch, routeros_version: '7.20.1',
  capabilities: { supported_operations: ['read'], api: { rest_available: true, rest_readonly: true }, resources: ['system/resource'] }
});

const fleet = createFleetInventory({
  routers: [
    { connection_profile: core, name: 'Core', site: 'Cairo', tags: ['prod'], capability: coreCapability },
    { connection_profile: branch, name: 'Branch', site: 'Giza', tags: ['branch'], capability: branchCapability }
  ]
});
assert.strictEqual(fleet.read_only, true);
assert.strictEqual(fleet.mutation_enabled, false);
assert.strictEqual(validateFleetInventory(fleet).valid, true);

const reversed = createFleetInventory({
  routers: [
    { connection_profile: branch, name: 'Branch', site: 'Giza', tags: ['branch'], capability: branchCapability },
    { connection_profile: core, name: 'Core', site: 'Cairo', tags: ['prod'], capability: coreCapability }
  ]
});
assert.strictEqual(reversed.fingerprint, fleet.fingerprint);

assert.throws(() => createFleetInventory({ routers: [{ connection_profile: core, capability: branchCapability }] }), /does not match its connection profile/);
assert.throws(() => createFleetInventory({
  routers: [
    { connection_profile: core, capability: coreCapability },
    { connection_profile: core, capability: coreCapability }
  ]
}), /Duplicate router identity/);

const tampered = JSON.parse(JSON.stringify(fleet));
tampered.routers[0].capability.capabilities.resources.push('system/package');
assert.strictEqual(validateFleetInventory(tampered).valid, false);

const crossTampered = JSON.parse(JSON.stringify(fleet));
crossTampered.routers[0].capability.router_id = crossTampered.routers[1].id;
assert.strictEqual(validateFleetInventory(crossTampered).valid, false);

const secretBearing = JSON.parse(JSON.stringify(fleet));
secretBearing.routers[0].metadata = { api_token: 'should-never-appear' };
assert.strictEqual(validateFleetInventory(secretBearing).valid, false);
secretBearing.fingerprint = fleetFingerprint(secretBearing);
assert.strictEqual(validateFleetInventory(secretBearing).valid, false);
assert.ok(validateFleetInventory(secretBearing).errors.some(error => /Secret-bearing inventory field/.test(error)));

const writeEnabled = JSON.parse(JSON.stringify(fleet));
writeEnabled.routers[0].capability.mutation_enabled = true;
assert.strictEqual(validateFleetInventory(writeEnabled).valid, false);

assert.throws(() => createFleetInventory({ id: 'attacker', routers: [] }), /User-controlled fleet inventory IDs/);
assert.throws(() => createFleetInventory({ fingerprint: 'attacker', routers: [] }), /User-controlled fleet inventory IDs/);

console.log('routeros-fleet-inventory tests passed');
