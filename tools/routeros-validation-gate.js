'use strict';

const { canonicalValue, sha256 } = require('./routeros-semantic');
const { validateSnapshot } = require('./routeros-snapshot');
const { validateApproval } = require('./routeros-approval');
const { evaluateCompatibility } = require('./routeros-compatibility');

const SCHEMA_VERSION = '1.0.0';
const ALLOWED_STATUSES = new Set(['passed', 'warning', 'failed', 'blocked']);

function validateChangeSet(cs, context = {}) {
  const checks = [], errors = [], warnings = [];
  const add = (id, status, message) => {
    if (!ALLOWED_STATUSES.has(status)) throw new TypeError('Unsupported validation status: ' + status);
    checks.push({ id, status, ...(message ? { message } : {}) });
  };
  const fail = (id, message) => { add(id, 'blocked', message); errors.push(message); };
  const pass = id => add(id, 'passed');
  const warn = (id, message) => { add(id, 'warning', message); warnings.push(message); };

  if (!cs || typeof cs !== 'object' || !cs.change_set) {
    fail('changeset.schema', 'Invalid Change Set schema.');
    return { schema_version: SCHEMA_VERSION, valid: false, status: 'blocked', errors, warnings, checks };
  }

  if (cs.change_set.read_only !== true) fail('changeset.read_only', 'Change Set must remain read-only.'); else pass('changeset.read_only');
  if (!Array.isArray(cs.changes) || !Array.isArray(cs.conflicts)) fail('changeset.structure', 'Change Set changes/conflicts must be arrays.'); else pass('changeset.structure');
  if (cs.validation && cs.validation.valid === false) fail('diff.validity', 'Semantic diff is invalid.'); else pass('diff.validity');
  if (cs.conflicts?.length) fail('diff.conflicts', 'Semantic diff contains conflicts.'); else pass('diff.conflicts');
  if (cs.risk?.level === 'critical') fail('risk.critical', 'Change Set contains critical risk.'); else pass('risk.critical');

  const req = cs.snapshot?.required !== false;
  if (req && cs.snapshot?.captured !== true) fail('snapshot.required', 'Required pre-change snapshot is not captured.'); else pass('snapshot.required');
  if (req) {
    if (!cs.snapshot?.reference) fail('snapshot.validation', 'Required snapshot reference is missing.');
    else {
      const r = validateSnapshot(cs.snapshot.reference, {
        actual_fingerprint: cs.target?.actual_fingerprint || undefined,
        routeros_major: context.routeros_major ?? cs.target?.routeros?.major,
      });
      if (!r.valid) r.errors.forEach(message => fail('snapshot.validation', message)); else pass('snapshot.validation');
    }
  }

  if (cs.snapshot?.captured === true && cs.snapshot?.semantic_fingerprint && cs.target?.actual_fingerprint &&
      cs.snapshot.semantic_fingerprint !== cs.target.actual_fingerprint) {
    fail('snapshot.fingerprint', 'Snapshot semantic fingerprint does not match Change Set actual fingerprint.');
  } else pass('snapshot.fingerprint');

  if (cs.rollback?.required && cs.rollback?.prepared !== true) fail('rollback.readiness', 'Required rollback artifact is not prepared.'); else pass('rollback.readiness');

  const actualVersion = context.routeros_version || cs.snapshot?.reference?.snapshot?.routeros?.version || null;
  const targetVersion = cs.target?.routeros?.version || null;
  const compatibility = evaluateCompatibility({
    actual: { version: actualVersion },
    target: {
      version: targetVersion,
      compatibility: cs.target?.routeros?.compatibility || {},
    },
  });
  if (!compatibility.compatibility.valid) {
    compatibility.compatibility.errors.forEach(message => fail('routeros.compatibility', message));
  } else {
    pass('routeros.compatibility');
    compatibility.compatibility.warnings.forEach(message => warn('routeros.compatibility.warning', message));
  }

  if (cs.change_set.requires_approval) {
    if (cs.approval?.status !== 'approved') fail('approval.required', 'Explicit approval is required before deployment.');
    else {
      const approval = cs.approval?.artifact;
      if (!approval) fail('approval.artifact', 'Approved Change Set is missing the approval artifact.');
      else {
        const ar = validateApproval(approval, {
          change_set_id: cs.change_set.id,
          change_set_fingerprint: approval.approval?.change_set_fingerprint,
        });
        if (!ar.valid) ar.errors.forEach(message => fail('approval.artifact', message)); else pass('approval.artifact');
        if (approval.approval?.status !== 'approved') fail('approval.status', 'Approval artifact is not approved.'); else pass('approval.status');
      }
    }
  } else pass('approval.required');

  const valid = errors.length === 0;
  return {
    schema_version: SCHEMA_VERSION,
    valid,
    status: valid ? 'passed' : 'blocked',
    errors,
    warnings,
    checks,
    compatibility,
    change_set_id: cs.change_set.id,
    change_set_fingerprint: cs.fingerprint || sha256(JSON.stringify(canonicalValue(cs))),
  };
}

module.exports = { validateChangeSet, ALLOWED_STATUSES };