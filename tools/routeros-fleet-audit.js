'use strict';

const crypto = require('crypto');
const { canonicalValue } = require('./routeros-semantic');
const { validateFleetInventory } = require('./routeros-fleet-inventory');
const { validateFleetSnapshot } = require('./routeros-fleet-snapshot');

const SCHEMA_VERSION = '1.0.0';
const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

function assertNoSecrets(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecrets(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (/(?:password|passwd|secret|private[-_]?key|passphrase|token|credential|authorization|cookie|api[-_]?key)/i.test(key)) {
      throw new Error(`Secret-bearing fleet audit field is forbidden: ${path}.${key}`);
    }
    assertNoSecrets(item, `${path}.${key}`);
  }
}

function auditFingerprint(report) {
  const payload = canonicalValue({
    schema_version: report.schema_version,
    fleet_fingerprint: report.fleet_fingerprint,
    snapshot_fingerprint: report.snapshot_fingerprint,
    findings: report.findings,
    summary: report.summary,
    read_only: true,
    mutation_enabled: false
  });
  return crypto.createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
}

function sortFindings(findings) {
  return [...findings].sort((a, b) =>
    (SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]) ||
    a.code.localeCompare(b.code) ||
    a.router_id.localeCompare(b.router_id)
  );
}

function createFleetAuditReport(snapshot, fleet, options = {}) {
  if (options.id !== undefined || options.fingerprint !== undefined) {
    throw new Error('User-controlled fleet audit IDs and fingerprints are forbidden.');
  }
  const fleetValidation = validateFleetInventory(fleet);
  if (!fleetValidation.valid) throw new Error('Invalid fleet inventory: ' + fleetValidation.errors.join(' '));
  const snapshotValidation = validateFleetSnapshot(snapshot, { fleet });
  if (!snapshotValidation.valid) throw new Error('Fleet snapshot validation failed: ' + snapshotValidation.errors.join(' '));

  const routers = new Map(fleet.routers.map(router => [router.id, router]));
  const findings = [];
  const versions = new Map();

  for (const entry of snapshot.entries) {
    const router = routers.get(entry.router_id);
    if (entry.status === 'failed') {
      findings.push({
        code: 'FLEET_ROUTER_SNAPSHOT_FAILED',
        severity: 'high',
        router_id: entry.router_id,
        title: 'Router snapshot capture failed',
        evidence: entry.error || 'Snapshot capture failed.',
        remediation: 'Re-run read-only snapshot capture for this router before treating the fleet baseline as complete.'
      });
      continue;
    }

    const major = Number(entry.snapshot?.snapshot?.routeros?.major);
    const expectedMajor = Number(router?.capability?.routeros?.major);
    if (Number.isInteger(major)) versions.set(major, (versions.get(major) || 0) + 1);
    if (Number.isInteger(expectedMajor) && Number.isInteger(major) && expectedMajor !== major) {
      findings.push({
        code: 'FLEET_ROUTEROS_VERSION_MISMATCH',
        severity: 'high',
        router_id: entry.router_id,
        title: 'Captured RouterOS major version differs from discovered capability',
        evidence: `Capability major=${expectedMajor}; snapshot major=${major}.`,
        remediation: 'Refresh capability discovery and capture a new read-only snapshot before compatibility-sensitive audit or deployment planning.'
      });
    }
  }

  const versionDistribution = [...versions.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([major, count]) => ({ major, count }));
  if (versionDistribution.length > 1) {
    findings.push({
      code: 'FLEET_MIXED_ROUTEROS_MAJORS',
      severity: 'medium',
      router_id: '*',
      title: 'Fleet contains multiple RouterOS major versions',
      evidence: versionDistribution.map(item => `RouterOS ${item.major}: ${item.count}`).join('; '),
      remediation: 'Treat version-specific configuration rules as compatibility-scoped; do not assume one generated syntax target applies to the entire fleet.'
    });
  }

  const sortedFindings = sortFindings(findings);
  assertNoSecrets(sortedFindings);
  const summary = {
    routers: fleet.routers.length,
    captured: snapshot.entries.filter(entry => entry.status === 'captured').length,
    failed: snapshot.entries.filter(entry => entry.status === 'failed').length,
    findings: sortedFindings.length,
    highest_severity: sortedFindings[0]?.severity || 'info',
    routeros_major_distribution: versionDistribution
  };

  const report = {
    schema_version: SCHEMA_VERSION,
    id: null,
    fleet_fingerprint: fleet.fingerprint,
    snapshot_fingerprint: snapshot.content_fingerprint,
    generated_at: options.generated_at || null,
    findings: sortedFindings,
    summary,
    read_only: true,
    mutation_enabled: false,
    fingerprint: null
  };
  const seed = canonicalValue({ fleet_fingerprint: report.fleet_fingerprint, snapshot_fingerprint: report.snapshot_fingerprint, findings: report.findings, summary: report.summary });
  report.id = 'fleet-audit:' + crypto.createHash('sha256').update(JSON.stringify(seed), 'utf8').digest('hex').slice(0, 20);
  report.fingerprint = auditFingerprint(report);
  return Object.freeze(report);
}

function validateFleetAuditReport(report, expected = {}) {
  const errors = [];
  if (!report || typeof report !== 'object') return { valid: false, errors: ['Fleet audit report must be an object.'] };
  if (report.schema_version !== SCHEMA_VERSION) errors.push('Unsupported fleet audit schema.');
  if (report.read_only !== true) errors.push('Fleet audit report must be read-only.');
  if (report.mutation_enabled !== false) errors.push('Fleet audit report mutation must be disabled.');
  if (!report.id || !report.fingerprint || !report.fleet_fingerprint || !report.snapshot_fingerprint) errors.push('Fleet audit integrity metadata is incomplete.');
  if (!Array.isArray(report.findings)) errors.push('Fleet audit findings must be an array.');
  if (!report.summary || typeof report.summary !== 'object') errors.push('Fleet audit summary is required.');
  if (expected.fleet_fingerprint !== undefined && report.fleet_fingerprint !== expected.fleet_fingerprint) errors.push('Fleet audit fleet fingerprint mismatch.');
  if (expected.snapshot_fingerprint !== undefined && report.snapshot_fingerprint !== expected.snapshot_fingerprint) errors.push('Fleet audit snapshot fingerprint mismatch.');
  if (Array.isArray(report.findings)) {
    try { assertNoSecrets(report.findings); } catch (error) { errors.push(error.message); }
    for (const finding of report.findings) {
      if (!finding || typeof finding.code !== 'string' || !SEVERITY_ORDER.hasOwnProperty(finding.severity) || typeof finding.router_id !== 'string') {
        errors.push('Fleet audit finding schema is invalid.');
      }
    }
    const sorted = sortFindings(report.findings);
    if (JSON.stringify(sorted) !== JSON.stringify(report.findings)) errors.push('Fleet audit findings are not in canonical order.');
  }
  if (report.id !== (() => {
    const seed = canonicalValue({ fleet_fingerprint: report.fleet_fingerprint, snapshot_fingerprint: report.snapshot_fingerprint, findings: report.findings, summary: report.summary });
    return 'fleet-audit:' + crypto.createHash('sha256').update(JSON.stringify(seed), 'utf8').digest('hex').slice(0, 20);
  })()) errors.push('Fleet audit ID mismatch.');
  if (report.fingerprint !== auditFingerprint(report)) errors.push('Fleet audit fingerprint mismatch.');
  return { valid: errors.length === 0, errors };
}

module.exports = { SCHEMA_VERSION, SEVERITY_ORDER, createFleetAuditReport, validateFleetAuditReport, auditFingerprint };
