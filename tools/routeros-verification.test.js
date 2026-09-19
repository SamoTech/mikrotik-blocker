'use strict';

const assert = require('assert');
const { createChangeSet, prepareRollback, attachSnapshot } = require('./routeros-change-set');
const { createSnapshot } = require('./routeros-snapshot');
const { createApproval, approve, attachApproval } = require('./routeros-approval');
const { createVerificationPlan, validateVerificationPlan } = require('./routeros-verification');

const diff = {
  fingerprint: 'diff-verification',
  routeros: { version: '7.21.4', major: 7 },
  actual: { fingerprint: 'actual-verification' },
  summary: { added: 1, removed: 0, changed: 0, unchanged: 0, conflicts: 0 },
  conflicts: [],
  changes: [{
    id: 'change-1', type: 'add', kind: 'firewall.address-list',
    identity: 'rule-1', path: '/ip/firewall/address-list',
    risk: 'review', requires_review: true,
    after: { attributes: { '.id': '*1' } },
    attribute_changes: [], order_change: null,
  }],
};
let cs = createChangeSet(diff);
cs = attachSnapshot(cs, createSnapshot({
  fingerprint: 'actual-verification', routeros: { version: '7.21.4', major: 7 }, resources: [], diagnostics: []
}));
cs = prepareRollback(cs);
cs = attachApproval(cs, approve(createApproval(cs), 'operator@example.com'));

const plan = createVerificationPlan(cs, { routeros_version: '7.21.4', routeros_major: 7 });
assert.strictEqual(plan.read_only, true);
assert.strictEqual(plan.verification.status, 'not_started');
assert.strictEqual(plan.verification.automatic_rollback, false);
assert.strictEqual(plan.verification.execution.live_router, false);
assert.strictEqual(plan.verification.execution.mutation_performed, false);
assert.strictEqual(plan.rollback.execution, 'manual-explicit-operator-action');
assert.strictEqual(validateVerificationPlan(plan).valid, true);

const tampered = JSON.parse(JSON.stringify(plan));
tampered.verification.execution.mutation_performed = true;
assert.strictEqual(validateVerificationPlan(tampered).valid, false);

const blocked = createVerificationPlan(
  createChangeSet({ ...diff, conflicts: [{ id: 'conflict-1' }] }),
  { routeros_version: '7.21.4', routeros_major: 7 }
);
assert.strictEqual(blocked.verification.status, 'blocked');

console.log('routeros-verification.test.js: all tests passed');
