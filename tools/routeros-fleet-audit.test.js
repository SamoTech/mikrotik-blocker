'use strict';

const assert = require('assert');
const { createConnectionProfile } = require('./routeros-connection-profile');
const { createCapabilityRecord } = require('./routeros-capability-matrix');
const { createFleetInventory } = require('./routeros-fleet-inventory');
const { createSnapshot } = require('./routeros-snapshot');
const { createFleetSnapshot } = require('./routeros-fleet-snapshot');
const { createFleetAuditReport, validateFleetAuditReport, auditFingerprint } = require('./routeros-fleet-audit');

function profile(name, url) {
  return createConnectionProfile({ name, base_url: url, auth_reference: name.toLowerCase().replace(/\s+/g, '-'), created_at: '2026-09-19T00:00:00.000Z' });
}

function routerSnapshot(fingerprint, major, capturedAt) {
  return createSnapshot({
    fingerprint,
    routeros: { version: `${major}.21.4`, major },
    source: { name: 'rest' },
    resources: [{ kind: 'system.resource', path: '/system/resource', identity: 'system.resource', attributes: { uptime: '1d' }, status: 'recognized' }],
    diagnostics: []
  }, { captured_at: capturedAt });
}

const core = profile('Core Router', 'https://core.example');
const branch = profile('Branch Router', 'https://branch.example');
const coreCapability = createCapabilityRecord({
  connection_profile: core,
  routeros_version: '7.21.4',
  capabilities: { supported_operations: ['read', 'snapshot', 'audit'], api: { rest_available: true, rest_readonly: true }, resources: ['system/resource'] }
});
const branchCapability = createCapabilityRecord({
  connection_profile: branch,
  routeros_version: '6.49.15',
  capabilities: { supported_operations: ['read', 'snapshot'], api: { rest_available: true, rest_readonly: true }, resources: ['system/resource'] }
});
const fleet = createFleetInventory({ routers: [
  { connection_profile: core, name: 'Core', site: 'Cairo', tags: ['prod'], capability: coreCapability },
  { connection_profile: branch, name: 'Branch', site: 'Giza', tags: ['branch'], capability: branchCapability }
] });

const snapshot = createFleetSnapshot({
  fleet,
  entries: [
    { router_id: fleet.routers[0].id, status: 'captured', snapshot: routerSnapshot('core-actual', 7, '2026-09-20T01:00:00Z') },
    { router_id: fleet.routers[1].id, status: 'captured', snapshot: routerSnapshot('branch-actual', 6, '2026-09-20T01:00:01Z') }
  ]
});

const report = createFleetAuditReport(snapshot, fleet, { generated_at: '2026-09-20T02:00:00Z' });
assert.strictEqual(report.read_only, true);
assert.strictEqual(report.mutation_enabled, false);
assert.strictEqual(validateFleetAuditReport(report, { fleet_fingerprint: fleet.fingerprint, snapshot_fingerprint: snapshot.content_fingerprint }).valid, true);
assert.strictEqual(auditFingerprint(report), report.fingerprint);
assert.strictEqual(report.summary.captured, 2);
assert.strictEqual(report.summary.failed, 0);
assert.strictEqual(report.summary.routeros_major_distribution.length, 2);
assert.ok(report.findings.some(finding => finding.code === 'FLEET_MIXED_ROUTEROS_MAJORS'));

const failedSnapshot = createFleetSnapshot({
  fleet,
  entries: [
    { router_id: fleet.routers[0].id, status: 'failed', error: 'Connection timed out.' },
    { router_id: fleet.routers[1].id, status: 'captured', snapshot: routerSnapshot('branch-actual', 6, '2026-09-20T01:00:01Z') }
  ]
});
const failedReport = createFleetAuditReport(failedSnapshot, fleet);
assert.ok(failedReport.findings.some(finding => finding.code === 'FLEET_ROUTER_SNAPSHOT_FAILED' && finding.severity === 'high'));
assert.strictEqual(failedReport.summary.failed, 1);

const mismatchSnapshot = createFleetSnapshot({
  fleet,
  entries: [
    { router_id: fleet.routers[0].id, status: 'captured', snapshot: routerSnapshot('core-actual', 6, '2026-09-20T01:00:00Z') },
    { router_id: fleet.routers[1].id, status: 'captured', snapshot: routerSnapshot('branch-actual', 6, '2026-09-20T01:00:01Z') }
  ]
});
const mismatchReport = createFleetAuditReport(mismatchSnapshot, fleet);
assert.ok(mismatchReport.findings.some(finding => finding.code === 'FLEET_ROUTEROS_VERSION_MISMATCH' && finding.router_id === fleet.routers[0].id));

const tampered = JSON.parse(JSON.stringify(report));
tampered.findings[0].evidence = 'tampered';
tampered.fingerprint = auditFingerprint(tampered);
assert.strictEqual(validateFleetAuditReport(tampered, { fleet_fingerprint: fleet.fingerprint, snapshot_fingerprint: snapshot.content_fingerprint }).valid, false);

const secret = JSON.parse(JSON.stringify(report));
secret.findings.push({ code: 'LEAK', severity: 'high', router_id: '*', title: 'bad', evidence: { api_token: 'must-not-persist' }, remediation: 'none' });
secret.findings.sort((a, b) => (a.code + a.router_id).localeCompare(b.code + b.router_id));
secret.fingerprint = auditFingerprint(secret);
assert.strictEqual(validateFleetAuditReport(secret, { fleet_fingerprint: fleet.fingerprint, snapshot_fingerprint: snapshot.content_fingerprint }).valid, false);

assert.throws(() => createFleetAuditReport(snapshot, fleet, { id: 'attacker' }), /User-controlled fleet audit IDs/);
assert.throws(() => createFleetAuditReport(snapshot, fleet, { fingerprint: 'attacker' }), /User-controlled fleet audit IDs/);

console.log('routeros-fleet-audit.test.js: all tests passed');
