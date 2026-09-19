'use strict';

const assert = require('assert');
const { createConnectionProfile } = require('./routeros-connection-profile');
const { createRouterInventory, addRouter, validateInventory, stableRouterId } = require('./routeros-inventory');

const profile = createConnectionProfile({
  name: 'Core Router',
  base_url: 'https://router.example',
  auth_reference: 'core-router-credential',
  created_at: '2026-09-19T00:00:00.000Z'
});

const inventory = createRouterInventory({
  routers: [{
    connection_profile: profile,
    site: 'Cairo',
    tags: ['core', 'production'],
    metadata: { model: 'RB3011', routeros_major: 7 }
  }]
});

assert.strictEqual(inventory.read_only, true);
assert.strictEqual(inventory.mutation_enabled, false);
assert.strictEqual(validateInventory(inventory).valid, true);
assert.strictEqual(inventory.routers[0].id, stableRouterId(profile));

const reordered = createRouterInventory({
  routers: [{
    connection_profile: profile,
    site: 'Cairo',
    tags: ['production', 'core'],
    metadata: { routeros_major: 7, model: 'RB3011' }
  }]
});
assert.strictEqual(reordered.fingerprint, inventory.fingerprint, 'Inventory fingerprint must be order-independent.');

const branchProfile = createConnectionProfile({
  name: 'Branch Router',
  base_url: 'https://branch.example',
  auth_reference: 'branch-router-credential',
  created_at: '2026-09-19T00:00:00.000Z'
});
const changed = addRouter(inventory, { connection_profile: branchProfile, site: 'Giza' });
assert.notStrictEqual(changed.fingerprint, inventory.fingerprint);
assert.strictEqual(validateInventory(changed).valid, true);
assert.throws(() => addRouter(changed, { connection_profile: branchProfile }), /already exists/);

assert.throws(() => createRouterInventory({ id: 'attacker-controlled' }), /User-controlled inventory IDs are forbidden/);
assert.throws(() => createRouterInventory({ routers: [{ connection_profile: { ...profile, write_operations_enabled: true } }] }), /valid read-only connection profile/);
assert.throws(() => createRouterInventory({ routers: [{ connection_profile: profile, metadata: { api_token: 'secret' } }] }), /Secret-bearing inventory field/);
assert.throws(() => createRouterInventory({ routers: [{ connection_profile: { ...profile, fingerprint: 'tampered' } }] }), /valid read-only connection profile/);

const tampered = JSON.parse(JSON.stringify(inventory));
tampered.routers[0].site = 'Tampered';
assert.strictEqual(validateInventory(tampered).valid, false, 'Tampered inventory must fail integrity validation.');

console.log('routeros-inventory tests passed');
