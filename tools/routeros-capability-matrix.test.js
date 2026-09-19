'use strict';

const assert = require('assert');
const { createConnectionProfile } = require('./routeros-connection-profile');
const {
  createCapabilityRecord,
  validateCapabilityRecord,
  normalizeVersion,
  normalizeCapabilities
} = require('./routeros-capability-matrix');

const profile = createConnectionProfile({
  name: 'Core Router',
  base_url: 'https://router.example',
  auth_reference: 'core-router-credential',
  created_at: '2026-09-19T00:00:00.000Z'
});

const record = createCapabilityRecord({
  connection_profile: profile,
  routeros_version: '7.21.4',
  capabilities: {
    supported_operations: ['audit', 'read', 'snapshot', 'read'],
    api: { rest_available: true, rest_readonly: true },
    resources: ['ip/firewall/filter', 'system/resource', 'ip/firewall/filter']
  }
});

assert.strictEqual(record.read_only, true);
assert.strictEqual(record.mutation_enabled, false);
assert.deepStrictEqual(record.routeros, { raw: '7.21.4', major: 7, minor: 21, patch: 4 });
assert.deepStrictEqual(record.capabilities.supported_operations, ['audit', 'read', 'snapshot']);
assert.deepStrictEqual(record.capabilities.resources, ['ip/firewall/filter', 'system/resource']);
assert.strictEqual(validateCapabilityRecord(record).valid, true);

const tampered = JSON.parse(JSON.stringify(record));
tampered.capabilities.resources.push('system/package');
assert.strictEqual(validateCapabilityRecord(tampered).valid, false);

assert.throws(
  () => createCapabilityRecord({ connection_profile: profile, routeros_version: '7.21.4', capabilities: { supported_operations: ['write'] } }),
  /Unsupported inventory operation/
);
assert.throws(
  () => createCapabilityRecord({ connection_profile: profile, routeros_version: '7.21.4', capabilities: { api: { authorization: 'secret' } } }),
  /Secret-bearing capability field/
);
assert.throws(
  () => createCapabilityRecord({ id: 'attacker', connection_profile: profile }),
  /User-controlled capability IDs/
);
assert.throws(
  () => createCapabilityRecord({ connection_profile: { ...profile, fingerprint: 'tampered' } }),
  /valid read-only connection profile/
);
assert.throws(() => normalizeVersion('RouterOS-seven'), /major.minor/);
assert.deepStrictEqual(normalizeCapabilities({}), {
  supported_operations: [],
  rest: { available: false, readonly: false },
  resources: []
});

console.log('routeros-capability-matrix tests passed');
