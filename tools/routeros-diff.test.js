'use strict';

const assert = require('assert');
const { diff, redact } = require('./routeros-diff');

function actual(resources) {
  return {
    schemaVersion: '1.0.0',
    routeros: { major: 7 },
    source: { name: 'fixture.rsc' },
    fingerprint: 'actual-fingerprint',
    resources,
  };
}

const base = {
  kind: 'firewall.filter',
  path: '/ip/firewall/filter',
  identity: 'firewall.filter:input-allow',
  attributes: { chain: 'input', comment: 'Allow management', action: 'accept' },
  order: 1,
  status: 'recognized',
};

const unchanged = diff(actual([base]), {
  routeros: { major: 7 },
  resources: [{
    kind: 'firewall.filter',
    path: '/ip firewall filter',
    attributes: { chain: 'input', comment: 'Allow management', action: 'accept' },
    order: 1,
  }],
});
assert.strictEqual(unchanged.summary.added, 0);
assert.strictEqual(unchanged.summary.removed, 0);
assert.strictEqual(unchanged.summary.changed, 0);
assert.strictEqual(unchanged.summary.unchanged, 1);

const changed = diff(actual([base]), {
  resources: [{
    kind: 'firewall.filter',
    path: '/ip firewall filter',
    attributes: { chain: 'input', comment: 'Allow management', action: 'drop' },
    order: 1,
  }],
});
assert.strictEqual(changed.summary.changed, 1);
assert.strictEqual(changed.changes[0].type, 'change');
assert.deepStrictEqual(changed.changes[0].attribute_changes, [{
  key: 'action',
  before: 'accept',
  after: 'drop',
}]);

const added = diff(actual([]), {
  resources: [{
    kind: 'firewall.address-list',
    path: '/ip firewall address-list',
    attributes: { list: 'blocked', address: '192.0.2.10' },
  }],
});
assert.strictEqual(added.summary.added, 1);

const removed = diff(actual([base]), { resources: [] });
assert.strictEqual(removed.summary.removed, 1);
assert.strictEqual(removed.changes[0].risk, 'high');

const orderedActual = {
  ...base,
  order: 1,
  identity: 'firewall.filter:rule',
};
const orderedDesired = {
  kind: 'firewall.filter',
  path: '/ip firewall filter',
  attributes: orderedActual.attributes,
  order: 4,
};
const ordered = diff(actual([orderedActual]), { resources: [orderedDesired] });
assert.strictEqual(ordered.summary.changed, 1);
assert.deepStrictEqual(ordered.changes[0].order_change, { before: 1, after: 4 });
assert.strictEqual(ordered.changes[0].risk, 'high');

const secrets = redact({
  password: 'super-secret',
  nested: { private_key: 'PRIVATE', safe: 'value' },
});
assert.strictEqual(secrets.password, '[REDACTED]');
assert.strictEqual(secrets.nested.private_key, '[REDACTED]');
assert.strictEqual(secrets.nested.safe, 'value');

const duplicate = diff(actual([base, { ...base }]), {
  resources: [{
    kind: 'firewall.filter',
    path: '/ip firewall filter',
    attributes: base.attributes,
  }],
});
assert.strictEqual(duplicate.summary.conflicts, 1);
assert.strictEqual(duplicate.conflicts[0].type, 'conflict');

const deterministicA = diff(actual([base]), {
  resources: [{
    kind: 'firewall.filter',
    path: '/ip firewall filter',
    attributes: { action: 'accept', comment: 'Allow management', chain: 'input' },
    order: 1,
  }],
});
const deterministicB = diff(actual([base]), {
  resources: [{
    kind: 'firewall.filter',
    path: '/ip firewall filter',
    attributes: { chain: 'input', action: 'accept', comment: 'Allow management' },
    order: 1,
  }],
});
assert.deepStrictEqual(deterministicA, deterministicB);

console.log('routeros-diff.test.js: all tests passed');
