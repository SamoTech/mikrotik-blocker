'use strict';

const assert = require('assert');
const { createChangeSet } = require('./routeros-change-set');
const { createSnapshot } = require('./routeros-snapshot');
const { createApproval, approve, attachApproval } = require('./routeros-approval');
const { createDeploymentPlan, validateDeploymentPlan } = require('./routeros-deployment-plan');

const diff = {
  fingerprint: 'diff-test',
  routeros: { major: 7 },
  actual: { fingerprint: 'actual-test' },
  desired: { fingerprint: 'desired-test' },
  summary: { added: 1, removed: 0, changed: 0 },
  conflicts: [],
  changes: [{
    id: 'change-1',
    type: 'add',
    kind: 'firewall',
    identity: 'rule-1',
    path: '/ip/firewall/filter',
    requires_review: true,
    attribute_changes: [{ attribute: 'comment', before: null, after: 'managed' }]
  }]
};

const base = createChangeSet(diff);
const snapshot = createSnapshot({ fingerprint: 'actual-test', routeros: { major: 7 }, resources: [], diagnostics: [] }, {
  semantic_fingerprint: base.target.actual_fingerprint,
  source: { type: 'rsc-export' }
});
const withSnapshot = {
  ...base,
  snapshot: {
    ...base.snapshot,
    captured: true,
    reference: snapshot,
    semantic_fingerprint: snapshot.snapshot.semantic_fingerprint,
    content_fingerprint: snapshot.snapshot.content_fingerprint,
    validated: true
  }
};

const prepared = {
  ...withSnapshot,
  rollback: {
    ...withSnapshot.rollback,
    required: false,
    prepared: true
  },
  fingerprint: withSnapshot.fingerprint
};

const approval = approve(createApproval(prepared), 'operator@example');
const approved = attachApproval(prepared, approval);

const ready = createDeploymentPlan(approved, { routeros_major: 7 });
assert.strictEqual(ready.deployment.status, 'ready');
assert.strictEqual(ready.deployment.executable, false);
assert.strictEqual(ready.deployment.boundary, 'no-live-mutation');
assert.strictEqual(ready.deployment.execution_status, 'not_started');
assert.strictEqual(ready.deployment.router_connection, 'disabled');
assert.strictEqual(validateDeploymentPlan(ready).valid, true);

const tampered = JSON.parse(JSON.stringify(ready));
tampered.deployment.executable = true;
assert.strictEqual(validateDeploymentPlan(tampered).valid, false);

const blocked = createDeploymentPlan(base, { routeros_major: 7 });
assert.strictEqual(blocked.deployment.status, 'blocked');
assert.strictEqual(blocked.deployment.executable, false);
assert.strictEqual(blocked.deployment.execution_status, 'not_started');
assert.strictEqual(blocked.deployment.router_connection, 'disabled');
assert.strictEqual(validateDeploymentPlan(blocked).valid, true);

console.log('routeros-deployment-plan.test.js: all tests passed');
