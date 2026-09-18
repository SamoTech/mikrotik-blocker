'use strict';

const assert = require('assert');
const { parse } = require('./routeros-parser');
const { normalize } = require('./routeros-semantic');
const { runDryRun } = require('./routeros-dry-run');

const actualRsc = [
  '/system resource',
  'set [find] comment="baseline"',
  '/ip firewall filter',
  'add chain=forward action=accept comment="existing"',
].join('\n');

const actualModel = normalize(parse(actualRsc));
const desired = {
  routeros: actualModel.routeros,
  resources: [
    ...actualModel.resources.map(r => ({
      kind: r.kind,
      path: r.path,
      attributes: r.attributes,
    })),
    {
      kind: 'firewall.filter',
      path: '/ip/firewall/filter',
      attributes: { chain: 'forward', action: 'drop', comment: 'managed' },
    },
  ],
};

const result = runDryRun(actualRsc, desired, { source_path: 'fixture.rsc' });

assert.strictEqual(result.mode, 'dry-run');
assert.strictEqual(result.read_only, true);
assert.strictEqual(result.mutation_performed, false);
assert.ok(result.snapshot.snapshot.content_fingerprint);
assert.ok(result.change_set.snapshot.captured);
assert.ok(result.change_set.rollback.prepared);
assert.strictEqual(result.deployment.deployment.executable, false);
assert.strictEqual(result.deployment.deployment.boundary, 'no-live-mutation');
assert.strictEqual(result.deployment.deployment.router_connection, 'disabled');
assert.strictEqual(result.deployment.deployment.execution_status, 'not_started');
assert.strictEqual(result.deployment.deployment.status, 'blocked');
assert.ok(result.deployment.deployment.reason);

const cleanDesired = {
  routeros: actualModel.routeros,
  resources: actualModel.resources.map(r => ({
    kind: r.kind,
    path: r.path,
    attributes: r.attributes,
  })),
};
const clean = runDryRun(actualRsc, cleanDesired, { source_path: 'fixture.rsc' });
assert.strictEqual(clean.diff.summary.added, 0);
assert.strictEqual(clean.diff.summary.removed, 0);
assert.strictEqual(clean.diff.summary.changed, 0);
assert.strictEqual(clean.diff.summary.conflicts, 0);
assert.strictEqual(clean.deployment.deployment.status, 'ready');
assert.strictEqual(clean.deployment.deployment.executable, false);

console.log('routeros-dry-run.test.js: all tests passed');
