'use strict';

const assert = require('assert');
const {
  createRouterInventory,
  addRouter,
  fingerprintInventory,
  validateInventory,
  stableRouterId
} = require('./routeros-inventory');

const profile = {
  id: 'profile-1',
  name: 'Core Router',
  base_url: 'https://router.example',
  mode: 'read-only',
  credential_values_included: false,
  write_operations_enabled: false
};

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

const changed = addRouter(inventory, {
  connection_profile: { ...profile, id: 'profile-2', name: 'Branch Router', base_url: 'https://branch.example' },
  site: 'Giza'
});
assert.notStrictEqual(changed.fingerprint, inventory.fingerprint);
assert.strictEqual(validateInventory(changed).valid, true);
assert.throws(() => addRouter(changed, {
  connection_profile: { ...profile, id: 'profile-2', name: 'Branch Router', base_url: 'https://branch.example' }
}), /already exists/);

assert.throws(() => createRouterInventory({ id: 'attacker-controlled' }), /User-controlled inventory IDs are forbidden/);
assert.throws(() => createRouterInventory({ routers: [{ connection_profile: { ...profile, write_operations_enabled: true } }] }), /read-only connection profiles/);
assert.throws(() => createRouterInventory({ routers: [{ connection_profile: profile, metadata: { api_token: 'secret' } }] }), /Secret-bearing inventory field/);

const tampered = JSON.parse(JSON.stringify(inventory));
tampered.routers[0].site = 'Tampered';
assert.strictEqual(validateInventory(tampered).valid, false, 'Tampered inventory must fail integrity validation.');

console.log('routeros-inventory tests passed');
