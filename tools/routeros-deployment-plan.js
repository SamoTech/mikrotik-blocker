'use strict';

const crypto = require('crypto');
const { canonicalValue } = require('./routeros-semantic');
const { validateChangeSet } = require('./routeros-validation-gate');
const { validateApproval } = require('./routeros-approval');

const SCHEMA_VERSION = '1.0.0';
const DEPLOYMENT_STATUS = new Set(['blocked', 'ready', 'not_started']);

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function fingerprintPlan(plan) {
  const copy = JSON.parse(JSON.stringify(plan));
  delete copy.integrity;
  return sha256(JSON.stringify(canonicalValue(copy)));
}

function finalizePlan(plan) {
  return Object.freeze({
    ...plan,
    integrity: {
      algorithm: 'sha256',
      fingerprint: fingerprintPlan(plan)
    }
  });
}

function createDeploymentPlan(changeSet, context = {}) {
  if (!changeSet || typeof changeSet !== 'object') {
    throw new TypeError('Change Set is required.');
  }

  const gate = validateChangeSet(changeSet, context);
  if (!gate.valid) {
    return finalizePlan({
      schema_version: SCHEMA_VERSION,
      deployment: {
        status: 'blocked',
        executable: false,
        boundary: 'no-live-mutation',
        reason: 'Validation Gate did not pass.',
        change_set_id: changeSet.change_set?.id || null,
        change_set_fingerprint: changeSet.fingerprint || null,
        execution_status: 'not_started',
        router_connection: 'disabled'
      },
      gate,
      read_only: true
    });
  }

  const approval = changeSet.approval?.artifact;
  const approvalValidation = changeSet.change_set?.requires_approval
    ? validateApproval(approval, {
        change_set_id: changeSet.change_set.id,
        change_set_fingerprint: changeSet.approval.change_set_fingerprint
      })
    : { valid: true, errors: [], checks: [] };

  if (!approvalValidation.valid || (changeSet.change_set?.requires_approval && approval?.approval?.status !== 'approved')) {
    return finalizePlan({
      schema_version: SCHEMA_VERSION,
      deployment: {
        status: 'blocked',
        executable: false,
        boundary: 'no-live-mutation',
        reason: 'Human approval is missing or invalid.',
        change_set_id: changeSet.change_set?.id || null,
        change_set_fingerprint: changeSet.fingerprint || null,
        execution_status: 'not_started',
        router_connection: 'disabled'
      },
      gate,
      approval: approvalValidation,
      read_only: true
    });
  }

  return finalizePlan({
    schema_version: SCHEMA_VERSION,
    deployment: {
      id: 'deployment-plan:' + sha256(JSON.stringify(canonicalValue({
        change_set_id: changeSet.change_set.id,
        change_set_fingerprint: changeSet.fingerprint,
        approval_fingerprint: approval?.integrity?.fingerprint || null
      }))).slice(0, 20),
      status: 'ready',
      executable: false,
      boundary: 'no-live-mutation',
      change_set_id: changeSet.change_set.id,
      change_set_fingerprint: changeSet.fingerprint,
      approved_change_set_fingerprint: approval?.approval?.change_set_fingerprint || null,
      approval_fingerprint: approval?.integrity?.fingerprint || null,
      execution_status: 'not_started',
      executor: null,
      router_connection: 'disabled',
      rollback_required: changeSet.rollback?.required === true,
      verification_required: changeSet.verification?.required !== false
    },
    gate,
    read_only: true
  });
}

function validateDeploymentPlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== 'object') errors.push('Deployment Plan must be an object.');
  if (plan?.schema_version !== SCHEMA_VERSION) errors.push('Unsupported Deployment Plan schema version.');
  if (plan?.read_only !== true) errors.push('Deployment Plan must be read-only.');
  if (plan?.deployment?.boundary !== 'no-live-mutation') errors.push('Live mutation boundary is invalid.');
  if (plan?.deployment?.executable !== false) errors.push('Deployment Plan must not be executable.');
  if (!DEPLOYMENT_STATUS.has(plan?.deployment?.status)) errors.push('Unsupported deployment status.');
  if (plan?.deployment?.status === 'ready' && plan?.deployment?.execution_status !== 'not_started') {
    errors.push('Ready Deployment Plan cannot have started execution.');
  }
  if (plan?.deployment?.status === 'blocked') {
    if (plan?.deployment?.execution_status !== 'not_started') errors.push('Blocked Deployment Plan must not have started execution.');
    if (plan?.deployment?.router_connection !== 'disabled') errors.push('Blocked Deployment Plan must keep router connection disabled.');
  }

  if (plan?.integrity?.algorithm !== 'sha256' || typeof plan?.integrity?.fingerprint !== 'string') {
    errors.push('Deployment Plan integrity metadata is invalid.');
  } else {
    const actual = fingerprintPlan(plan);
    if (actual !== plan.integrity.fingerprint) errors.push('Deployment Plan fingerprint mismatch.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  SCHEMA_VERSION,
  DEPLOYMENT_STATUS,
  createDeploymentPlan,
  validateDeploymentPlan
};
