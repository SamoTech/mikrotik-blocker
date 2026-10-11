'use strict';

const assert = require('assert');
const { createSnapshot } = require('./routeros-snapshot');
const { createDriftReport, validateDriftReport, validateDesiredState } = require('./routeros-drift');

const resources = [
  {
    kind: 'firewall.filter',
    path: '/ip/firewall/filter',
    identity: 'firewall.filter:comment=Allow management',
    attributes: { chain: 'input', comment: 'Allow management', action: 'accept' },
    source: { commandIndex: 0, line: 1, endLine: 1, raw: null },
    status: 'recognized',
    order: 0,
  },
  {
    kind: 'system.identity',
    path: '/system/identity',
    identity: 'system.identity:name=router-a',
    attributes: { name: 'router-a' },
    source: { commandIndex: 1, line: 2, endLine: 2, raw: null },
    status: 'recognized',
    order: 1,
  },
];
const snapshot = createSnapshot({
  fingerprint: 'semantic-actual-001',
  routeros: { major: 7, version: '7.21.4' },
  source: { name: 'fixture' },
  resources,
  diagnostics: [],
}, { captured_at: '2026-10-11T10:00:00Z' });

const desired = {
  schema_version: '1.0',
  complete: true,
  routeros: { major: 7 },
  resources: [
    { kind: 'firewall.filter', path: '/ip firewall filter', attributes: { chain: 'input', comment: 'Allow management', action: 'drop' }, order: 0 },
    { kind: 'system.identity', path: '/system identity', attributes: { name: 'router-a' }, order: 1 },
    { kind: 'ip.address', path: '/ip address', attributes: { address: '192.0.2.10/24', interface: 'ether2' } },
  ],
};

const report = createDriftReport(snapshot, desired, { evaluated_at: '2026-10-11T12:00:00Z' });
assert.strictEqual(report.read_only, true);
assert.strictEqual(report.mutation_enabled, false);
assert.strictEqual(report.reconciliation_executable, false);
assert.strictEqual(report.summary.security_relevant_drift, 1);
assert.strictEqual(report.summary.operational_drift, 1);
assert.strictEqual(report.summary.unknown, 0);
assert.strictEqual(report.summary.benign_normalization, 0);
assert.strictEqual(validateDriftReport(report, { snapshot_fingerprint: snapshot.snapshot.content_fingerprint }).valid, true);

const repeat = createDriftReport(snapshot, desired, { evaluated_at: '2026-10-11T12:00:00Z' });
assert.deepStrictEqual(report, repeat);

const withVariance = {
  ...desired,
  expected_variances: [{
    type: 'change',
    identity: 'firewall.filter:comment=Allow management',
    reason: 'Approved maintenance window',
    approval_ref: 'CHG-1042',
    expires_at: '2026-10-12T00:00:00Z',
  }],
};
const expectedReport = createDriftReport(snapshot, withVariance, { evaluated_at: '2026-10-11T12:00:00Z' });
assert.strictEqual(expectedReport.summary.expected_variance, 1);
assert.deepStrictEqual(expectedReport.items.find(item => item.classification === 'expected_variance').expected_variance, {
  reason: 'Approved maintenance window',
  approval_ref: 'CHG-1042',
  expires_at: '2026-10-12T00:00:00Z',
});
assert.strictEqual(expectedReport.summary.security_relevant_drift, 0);

const expiredReport = createDriftReport(snapshot, withVariance, { evaluated_at: '2026-10-13T00:00:00Z' });
assert.strictEqual(expiredReport.summary.expected_variance, 0);
assert.strictEqual(expiredReport.summary.security_relevant_drift, 1);

assert.strictEqual(validateDesiredState({ schema_version: '1.0', resources: [] }).valid, false);
assert.strictEqual(validateDesiredState({ schema_version: '1.0', complete: true, resources: [{ kind: 'user', attributes: { api_token: 'secret' } }] }).valid, false);
assert.throws(() => createDriftReport(snapshot, desired, { id: 'caller-controlled' }), /User-controlled drift report IDs/);

const tampered = JSON.parse(JSON.stringify(report));
tampered.summary.operational_drift = 99;
assert.strictEqual(validateDriftReport(tampered).valid, false);
const tamperedEvaluationTime = JSON.parse(JSON.stringify(report));
tamperedEvaluationTime.evaluated_at = '2026-10-13T00:00:00Z';
assert.strictEqual(validateDriftReport(tamperedEvaluationTime).valid, false);
const secret = JSON.parse(JSON.stringify(report));
secret.items.push({ id: 'leak', classification: 'unknown', evidence: { api_token: 'never persist' } });
assert.strictEqual(validateDriftReport(secret).valid, false);
assert.throws(() => createDriftReport(snapshot, { ...desired, complete: false }), /complete: true/);

console.log('routeros-drift.test.js: all tests passed');
