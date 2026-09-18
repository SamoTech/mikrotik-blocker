'use strict';

const crypto = require('crypto');
const { canonicalValue } = require('./routeros-semantic');
const { validateChangeSet } = require('./routeros-validation-gate');

const SCHEMA_VERSION = '1.0.0';
const STATUSES = new Set(['not_started', 'passed', 'failed', 'blocked']);

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function integrityPayload(plan) {
  return canonicalValue({
    schema_version: plan.schema_version,
    verification: plan.verification,
    change_set_id: plan.change_set_id,
    change_set_fingerprint: plan.change_set_fingerprint,
    rollback: plan.rollback,
    read_only: plan.read_only,
  });
}

function createVerificationPlan(changeSet, context = {}) {
  if (!changeSet || typeof changeSet !== 'object') throw new TypeError('Change Set is required');

  const gate = validateChangeSet(changeSet, context);
  const checks = [
    { id: 'verification.change_set', status: gate.valid ? 'passed' : 'blocked', message: gate.valid ? 'Change Set passed the validation gate.' : 'Change Set is not eligible for verification.' },
    { id: 'verification.execution', status: 'blocked', message: 'Live execution is not implemented in this phase.' },
    { id: 'verification.connectivity', status: 'blocked', message: 'Router connectivity is disabled by the safe deployment boundary.' },
  ];

  const plan = {
    schema_version: SCHEMA_VERSION,
    verification: {
      id: 'verification:' + sha256(JSON.stringify(canonicalValue({
        change_set_id: changeSet.change_set.id,
        change_set_fingerprint: changeSet.fingerprint || null,
      }))).slice(0, 20),
      status: gate.valid ? 'not_started' : 'blocked',
      required: changeSet.verification?.required !== false,
      checks,
      success_condition: 'all required verification checks must pass',
      failure_action: 'prepare rollback and require explicit operator action',
      automatic_rollback: false,
      execution: {
        live_router: false,
        mutation_performed: false,
        status: 'not_started',
      },
    },
    change_set_id: changeSet.change_set.id,
    change_set_fingerprint: changeSet.fingerprint || null,
    rollback: {
      required: changeSet.rollback?.required === true,
      prepared: changeSet.rollback?.prepared === true,
      artifact_reference: changeSet.rollback?.artifact ? 'embedded' : null,
      execution: 'manual-explicit-operator-action',
    },
    read_only: true,
    integrity: { algorithm: 'sha256', value: null, verified: false },
  };

  plan.integrity.value = sha256(JSON.stringify(integrityPayload(plan)));
  plan.integrity.verified = true;
  return plan;
}

function validateVerificationPlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== 'object') return { valid: false, errors: ['Verification Plan must be an object.'] };
  if (plan.schema_version !== SCHEMA_VERSION) errors.push('Unsupported verification schema version.');
  if (plan.read_only !== true) errors.push('Verification Plan must be read-only.');
  if (!plan.verification || !STATUSES.has(plan.verification.status)) errors.push('Invalid verification status.');
  if (plan.verification?.automatic_rollback !== false) errors.push('Automatic rollback must remain disabled.');
  if (plan.verification?.execution?.live_router !== false) errors.push('Live router execution must remain disabled.');
  if (plan.verification?.execution?.mutation_performed !== false) errors.push('Verification Plan cannot report mutation.');
  if (plan.verification?.execution?.status !== 'not_started') errors.push('Verification execution must remain not_started.');
  if (plan.rollback?.execution !== 'manual-explicit-operator-action') errors.push('Rollback must remain explicit operator action.');
  if (plan.integrity?.algorithm !== 'sha256' || plan.integrity?.verified !== true) errors.push('Invalid integrity metadata.');
  if (!errors.length && plan.integrity.value !== sha256(JSON.stringify(integrityPayload(plan)))) errors.push('Verification Plan integrity mismatch.');
  return { valid: errors.length === 0, errors };
}

module.exports = { createVerificationPlan, validateVerificationPlan, SCHEMA_VERSION };
