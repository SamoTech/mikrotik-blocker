'use strict';

const assert = require('assert');
const { createChangeSet, prepareRollback, attachSnapshot } = require('./routeros-change-set');
const { createSnapshot } = require('./routeros-snapshot');
const { createApproval, validateApproval, approve, reject, attachApproval } = require('./routeros-approval');
const { validateChangeSet } = require('./routeros-validation-gate');

const diff = {
  fingerprint: 'fp',
  routeros: { version: '7.21.4', major: 7 },
  actual: { fingerprint: 'actual' },
  summary: {},
  conflicts: [],
  changes: [{ id: 'a', type: 'add', kind: 'firewall.address-list', identity: 'x', path: '/ip/firewall/address-list', risk: 'low', requires_review: true, after: { attributes: { '.id': '*1' } }, attribute_changes: [], order_change: null }]
};
const base = createChangeSet(diff);
const prepared = prepareRollback(base);
const model = { fingerprint: 'actual', routeros: { version: '7.21.4', major: 7 }, source: { name: 'fixture' }, resources: [], diagnostics: [] };
const withSnapshot = attachSnapshot(prepared, createSnapshot(model));
const approval = createApproval(withSnapshot, { requested_by: 'operator', requested_at: '2026-09-18T10:00:00Z' });

assert.strictEqual(approval.approval.status, 'pending');
assert.strictEqual(approval.approval.automatic_approval, false);
assert.strictEqual(validateApproval(approval, { change_set_id: withSnapshot.change_set.id, change_set_fingerprint: withSnapshot.fingerprint }).valid, true);
assert.throws(() => approve(approval), /Approver identity/);

const approved = approve(approval, 'operator@example.invalid', '2026-09-18T10:05:00Z');
assert.strictEqual(approved.approval.status, 'approved');
assert.strictEqual(validateApproval(approved).valid, true);

const rejected = reject(approval, 'operator@example.invalid', 'Risk requires redesign', '2026-09-18T10:06:00Z');
assert.strictEqual(rejected.approval.status, 'rejected');
assert.strictEqual(validateApproval(rejected).valid, true);

const attached = attachApproval(withSnapshot, approved);
assert.strictEqual(attached.approval.status, 'approved');
assert.strictEqual(attached.approval.artifact.approval.change_set_fingerprint, attached.fingerprint);
assert.strictEqual(attached.fingerprint, withSnapshot.fingerprint);
assert.strictEqual(validateChangeSet(attached, { routeros_version: '7.21.4', routeros_major: 7 }).valid, true);

const tampered = { ...attached, target: { ...attached.target, desired_fingerprint: 'tampered' } };
assert.strictEqual(validateChangeSet(tampered, { routeros_version: '7.21.4', routeros_major: 7 }).valid, false);
assert.throws(() => attachApproval(tampered, approved), /Approval validation failed/);

console.log('routeros-approval.test.js: all tests passed');
