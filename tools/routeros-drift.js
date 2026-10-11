'use strict';

const { canonicalValue, sha256 } = require('./routeros-semantic');
const { diff } = require('./routeros-diff');
const { validateSnapshot } = require('./routeros-snapshot');

const SCHEMA_VERSION = '1.0.0';
const SECRET_KEYS = /(?:password|passwd|secret|private[-_]?key|passphrase|token|credential|authorization|cookie|api[-_]?key)/i;
const SECURITY_SENSITIVE_KINDS = /^(?:firewall\.|ipv6\.firewall\.|user(?:\.group)?$|certificate$)/;

function assertNoSecrets(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecrets(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (SECRET_KEYS.test(key)) throw new Error(`Secret-bearing drift field is forbidden: ${path}.${key}`);
    assertNoSecrets(item, `${path}.${key}`);
  }
}

function validateDesiredState(desired) {
  const errors = [];
  if (!desired || typeof desired !== 'object' || Array.isArray(desired)) {
    return { valid: false, errors: ['Desired state must be an object.'] };
  }
  if (desired.schema_version !== '1.0' && desired.schema_version !== SCHEMA_VERSION) {
    errors.push('Unsupported desired-state schema version.');
  }
  if (desired.complete !== true) errors.push('Desired state must explicitly declare complete: true; partial intent cannot define drift.');
  if (!Array.isArray(desired.resources)) errors.push('Desired-state resources must be an array.');
  try { assertNoSecrets(desired); } catch (error) { errors.push(error.message); }
  if (Array.isArray(desired.resources)) {
    desired.resources.forEach((resource, index) => {
      if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
        errors.push(`Desired resource ${index} must be an object.`);
      } else if (typeof resource.kind !== 'string' || !resource.kind.trim()) {
        errors.push(`Desired resource ${index} requires a kind.`);
      } else if (resource.state !== undefined && !['present', 'absent'].includes(resource.state)) {
        errors.push(`Desired resource ${index} has an unsupported state.`);
      }
    });
  }
  if (desired.expected_variances !== undefined && !Array.isArray(desired.expected_variances)) {
    errors.push('expected_variances must be an array when provided.');
  }
  if (Array.isArray(desired.expected_variances)) {
    const seen = new Set();
    desired.expected_variances.forEach((variance, index) => {
      if (!variance || typeof variance !== 'object' ||
          !['add', 'remove', 'change'].includes(variance.type) ||
          typeof variance.identity !== 'string' || !variance.identity ||
          typeof variance.reason !== 'string' || !variance.reason.trim() ||
          typeof variance.approval_ref !== 'string' || !variance.approval_ref.trim() ||
          typeof variance.expires_at !== 'string' || !Number.isFinite(Date.parse(variance.expires_at))) {
        errors.push(`Expected variance ${index} requires type, identity, reason, approval_ref, and a valid expires_at timestamp.`);
        return;
      }
      const key = `${variance.type}|${variance.identity}`;
      if (seen.has(key)) errors.push(`Duplicate expected variance: ${key}`);
      seen.add(key);
    });
  }
  return { valid: errors.length === 0, errors };
}

function matchingExpectedVariance(change, expectedVariances, evaluatedAtMs) {
  return expectedVariances.find(item =>
    item.type === change.type && item.identity === change.identity &&
    Date.parse(item.expires_at) > evaluatedAtMs
  ) || null;
}

function classifyChange(change, expectedVariances, evaluatedAtMs) {
  if (change.type === 'conflict' || change.kind === 'opaque') return 'unknown';
  if (matchingExpectedVariance(change, expectedVariances, evaluatedAtMs)) return 'expected_variance';
  return SECURITY_SENSITIVE_KINDS.test(change.kind || '') ? 'security_relevant_drift' : 'operational_drift';
}

function fingerprintPayload(report) {
  return canonicalValue({
    schema_version: report.schema_version,
    snapshot_fingerprint: report.snapshot_fingerprint,
    desired_fingerprint: report.desired_fingerprint,
    evaluated_at: report.evaluated_at,
    items: report.items,
    summary: report.summary,
    normalization: report.normalization,
    read_only: true,
    mutation_enabled: false,
    reconciliation_executable: false,
  });
}

function reportFingerprint(report) {
  return sha256(JSON.stringify(fingerprintPayload(report)));
}

function createDriftReport(snapshot, desired, options = {}) {
  if (options.id !== undefined || options.fingerprint !== undefined) {
    throw new Error('User-controlled drift report IDs and fingerprints are forbidden.');
  }
  const desiredValidation = validateDesiredState(desired);
  if (!desiredValidation.valid) throw new Error('Invalid desired state: ' + desiredValidation.errors.join(' '));
  const snapshotValidation = validateSnapshot(snapshot);
  if (!snapshotValidation.valid) throw new Error('Invalid actual snapshot: ' + snapshotValidation.errors.join(' '));
  if (snapshot.read_only !== true) throw new Error('Actual snapshot must be read-only.');

  const evaluatedAt = options.evaluated_at || null;
  const evaluatedAtMs = evaluatedAt === null ? NaN : Date.parse(evaluatedAt);
  if (evaluatedAt !== null && !Number.isFinite(evaluatedAtMs)) throw new Error('evaluated_at must be a valid timestamp.');
  const variances = desired.expected_variances || [];
  if (variances.length && !Number.isFinite(evaluatedAtMs)) {
    throw new Error('evaluated_at is required when expected variances are configured.');
  }

  const desiredPayload = canonicalValue({
    schema_version: desired.schema_version,
    complete: desired.complete,
    routeros: desired.routeros || null,
    resources: desired.resources,
    expected_variances: variances,
  });
  const desiredFingerprint = sha256(JSON.stringify(desiredPayload));
  const actual = {
    resources: snapshot.resources,
    routeros: snapshot.snapshot.routeros,
    source: snapshot.snapshot.source,
    fingerprint: snapshot.snapshot.semantic_fingerprint,
  };
  const semanticDiff = diff(actual, desired);
  const changes = semanticDiff.changes.map(change => {
    const variance = matchingExpectedVariance(change, variances, evaluatedAtMs);
    return {
      ...change,
      classification: classifyChange(change, variances, evaluatedAtMs),
      expected_variance: variance ? {
        reason: variance.reason,
        approval_ref: variance.approval_ref,
        expires_at: variance.expires_at,
      } : null,
    };
  });
  const conflicts = semanticDiff.conflicts.map(conflict => ({
    ...conflict,
    classification: 'unknown',
  }));
  const items = [...changes, ...conflicts].sort((a, b) => a.id.localeCompare(b.id));
  const summary = {
    actual_resources: snapshot.resources.length,
    desired_resources: desired.resources.length,
    total_items: items.length,
    expected_variance: items.filter(item => item.classification === 'expected_variance').length,
    unknown: items.filter(item => item.classification === 'unknown').length,
    benign_normalization: 0,
    operational_drift: items.filter(item => item.classification === 'operational_drift').length,
    security_relevant_drift: items.filter(item => item.classification === 'security_relevant_drift').length,
    conflicts: semanticDiff.summary.conflicts,
  };
  const report = {
    schema_version: SCHEMA_VERSION,
    id: null,
    snapshot_fingerprint: snapshot.snapshot.content_fingerprint,
    desired_fingerprint: desiredFingerprint,
    evaluated_at: evaluatedAt,
    items,
    summary,
    normalization: {
      semantic_diff_applied: true,
      canonical_attribute_key_order: true,
      canonical_resource_path_separators: true,
      normalized_equivalents_reported_as_drift: false,
    },
    read_only: true,
    mutation_enabled: false,
    reconciliation_executable: false,
    fingerprint: null,
  };
  report.id = 'drift:' + sha256(JSON.stringify(canonicalValue({
    snapshot_fingerprint: report.snapshot_fingerprint,
    desired_fingerprint: report.desired_fingerprint,
    items: report.items,
    summary: report.summary,
  }))).slice(0, 20);
  report.fingerprint = reportFingerprint(report);
  return Object.freeze(report);
}

function validateDriftReport(report, expected = {}) {
  const errors = [];
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return { valid: false, errors: ['Drift report must be an object.'] };
  }
  if (report.schema_version !== SCHEMA_VERSION) errors.push('Unsupported drift report schema.');
  if (report.read_only !== true || report.mutation_enabled !== false) errors.push('Drift report must be read-only with mutation disabled.');
  if (report.reconciliation_executable !== false) errors.push('Drift report must not contain an executable reconciliation plan.');
  if (!Array.isArray(report.items) || !report.summary || typeof report.summary !== 'object') errors.push('Drift report items and summary are required.');
  if (expected.snapshot_fingerprint !== undefined && report.snapshot_fingerprint !== expected.snapshot_fingerprint) errors.push('Drift snapshot fingerprint mismatch.');
  if (expected.desired_fingerprint !== undefined && report.desired_fingerprint !== expected.desired_fingerprint) errors.push('Drift desired-state fingerprint mismatch.');
  if (Array.isArray(report.items)) {
    try { assertNoSecrets(report.items); } catch (error) { errors.push(error.message); }
    for (const item of report.items) {
      if (!item || typeof item.classification !== 'string' ||
          !['expected_variance', 'unknown', 'operational_drift', 'security_relevant_drift'].includes(item.classification)) {
        errors.push('Drift item classification is invalid.');
        break;
      }
    }
  }
  if (report.id !== 'drift:' + sha256(JSON.stringify(canonicalValue({
    snapshot_fingerprint: report.snapshot_fingerprint,
    desired_fingerprint: report.desired_fingerprint,
    items: report.items,
    summary: report.summary,
  }))).slice(0, 20)) errors.push('Drift report ID mismatch.');
  if (report.fingerprint !== reportFingerprint(report)) errors.push('Drift report fingerprint mismatch.');
  return { valid: errors.length === 0, errors };
}

module.exports = {
  SCHEMA_VERSION,
  validateDesiredState,
  createDriftReport,
  validateDriftReport,
  reportFingerprint,
};
