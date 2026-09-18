'use strict';
const assert = require('assert');
const { createSnapshot } = require('./routeros-snapshot');
const { createChangeSet, prepareRollback, attachSnapshot } = require('./routeros-change-set');
const { validateChangeSet } = require('./routeros-validation-gate');
const { createApproval, approve, attachApproval } = require('./routeros-approval');

const diff = {
  fingerprint: 'actual-fp',
  routeros: { version: '7.21.4', major: 7 },
  actual: { fingerprint: 'actual-fp' },
  summary: { added: 1, removed: 0, changed: 0, unchanged: 0, conflicts: 0 },
  conflicts: [],
  changes: [{ id: 'diff:add:x', type: 'add', kind: 'firewall.address-list', identity: 'x', path: '/ip/firewall/address-list', risk: 'review', requires_review: true, after: { attributes: { '.id': '*1' } }, attribute_changes: [], order_change: null }]
};
const model = { fingerprint: 'actual-fp', routeros: { version: '7.21.4', major: 7 }, source: { name: 'fixture.rsc' }, resources: [], diagnostics: [] };

let cs = createChangeSet(diff);
cs = prepareRollback(cs);
const snap = createSnapshot(model);
cs = attachSnapshot(cs, snap);

const pending = validateChangeSet(cs, { routeros_version: '7.21.4', routeros_major: 7 });
assert.strictEqual(pending.valid, false);

const approval = approve(createApproval(cs), 'operator@example.com');
cs = attachApproval(cs, approval);
const valid = validateChangeSet(cs, { routeros_version: '7.21.4', routeros_major: 7 });
assert.strictEqual(valid.valid, true);
assert.strictEqual(valid.status, 'passed');
assert.strictEqual(valid.compatibility.compatibility.valid, true);

assert.strictEqual(validateChangeSet({ ...cs, snapshot: { ...cs.snapshot, semantic_fingerprint: 'bad' } }, { routeros_version: '7.21.4', routeros_major: 7 }).valid, false);
assert.strictEqual(validateChangeSet({ ...cs, snapshot: { ...cs.snapshot, captured: false } }, { routeros_version: '7.21.4', routeros_major: 7 }).valid, false);
assert.strictEqual(validateChangeSet({ ...cs, conflicts: [{ id: 'c' }] }, { routeros_version: '7.21.4', routeros_major: 7 }).status, 'blocked');
assert.strictEqual(validateChangeSet({ ...cs, risk: { ...cs.risk, level: 'critical' } }, { routeros_version: '7.21.4', routeros_major: 7 }).status, 'blocked');
assert.strictEqual(validateChangeSet({ ...cs, rollback: { ...cs.rollback, prepared: false } }, { routeros_version: '7.21.4', routeros_major: 7 }).status, 'blocked');
assert.strictEqual(validateChangeSet(cs, { routeros_version: '6.49.18', routeros_major: 6 }).status, 'blocked');
assert.strictEqual(validateChangeSet({ ...cs, approval: { status: 'pending' } }, { routeros_version: '7.21.4', routeros_major: 7 }).status, 'blocked');
assert.strictEqual(validateChangeSet(cs, { routeros_version: 'unknown', routeros_major: 7 }).status, 'blocked');
assert.deepStrictEqual(
  validateChangeSet(cs, { routeros_version: '7.21.4', routeros_major: 7 }),
  validateChangeSet(cs, { routeros_version: '7.21.4', routeros_major: 7 })
);
console.log('routeros-validation-gate.test.js: all tests passed');