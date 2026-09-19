'use strict';

const crypto = require('crypto');
const { canonicalValue } = require('./routeros-semantic');
const { validateFleetInventory } = require('./routeros-fleet-inventory');

const SCHEMA_VERSION = '1.0.0';
const ALLOWED_OPERATIONS = new Set(['read', 'snapshot', 'audit']);
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'skipped']);

function operationFingerprint(plan) {
  const copy = JSON.parse(JSON.stringify(plan));
  delete copy.fingerprint;
  return crypto.createHash('sha256').update(JSON.stringify(canonicalValue(copy)), 'utf8').digest('hex');
}

function createFleetOperationPlan(fleet, options = {}) {
  const validation = validateFleetInventory(fleet);
  if (!validation.valid) throw new Error('Fleet inventory validation failed: ' + validation.errors.join(' '));
  const operation = typeof options.operation === 'string' ? options.operation.trim() : '';
  if (!ALLOWED_OPERATIONS.has(operation)) throw new Error('Unsupported fleet operation: ' + operation);
  if (!Array.isArray(options.target_router_ids) || options.target_router_ids.length === 0) throw new Error('Fleet operation requires an explicit non-empty target router ID list.');
  const ids = [...new Set(options.target_router_ids)];
  if (ids.some(id => typeof id !== 'string' || !id.trim())) throw new Error('Fleet target router IDs must be non-empty strings.');
  if (ids.length !== options.target_router_ids.length) throw new Error('Duplicate fleet target router IDs are forbidden.');
  const byId = new Map(fleet.routers.map(router => [router.id, router]));
  const targets = ids.map(id => {
    const router = byId.get(id);
    if (!router) throw new Error('Fleet target router does not exist: ' + id);
    if (!(router.capability?.capabilities?.supported_operations || []).includes(operation)) throw new Error('Router does not support requested operation: ' + id + ' -> ' + operation);
    return { router_id: router.id, name: router.name, connection_profile_id: router.connection_profile_id, site: router.site, operation, capability_fingerprint: router.capability.fingerprint, status: 'pending' };
  }).sort((a, b) => a.router_id.localeCompare(b.router_id));
  const plan = { schema_version: SCHEMA_VERSION, operation, fleet_fingerprint: fleet.fingerprint, read_only: true, mutation_enabled: false, targets, execution: { status: 'planned', completed: [], failed: [], skipped: [] }, fingerprint: null };
  plan.fingerprint = operationFingerprint(plan);
  return Object.freeze(plan);
}

function validateFleetOperationPlan(plan, fleet) {
  const errors = [];
  if (!plan || plan.schema_version !== SCHEMA_VERSION) errors.push('Unsupported fleet operation plan schema.');
  if (!plan || !ALLOWED_OPERATIONS.has(plan.operation)) errors.push('Unsupported fleet operation.');
  if (!plan || plan.read_only !== true) errors.push('Fleet operation plan must be read-only.');
  if (!plan || plan.mutation_enabled !== false) errors.push('Fleet operation mutation must be disabled.');
  if (!plan || !Array.isArray(plan.targets) || plan.targets.length === 0) errors.push('Fleet operation must contain explicit targets.');
  const fleetValidation = validateFleetInventory(fleet);
  if (!fleetValidation.valid) errors.push(...fleetValidation.errors.map(error => 'Fleet: ' + error));
  if (fleet && plan?.fleet_fingerprint !== fleet.fingerprint) errors.push('Fleet fingerprint does not match operation plan.');
  if (Array.isArray(plan?.targets)) {
    const ids = new Set();
    for (const target of plan.targets) {
      if (!target?.router_id || ids.has(target.router_id)) errors.push('Operation targets must have unique router IDs.');
      if (target?.router_id) ids.add(target.router_id);
      const router = fleet?.routers?.find(item => item.id === target.router_id);
      if (!router) { errors.push('Operation target router does not exist: ' + target?.router_id); continue; }
      if (target.connection_profile_id !== router.connection_profile_id) errors.push('Operation target connection profile mismatch: ' + target.router_id);
      if (target.capability_fingerprint !== router.capability.fingerprint) errors.push('Operation target capability fingerprint mismatch: ' + target.router_id);
      if (!(router.capability.capabilities.supported_operations || []).includes(plan.operation)) errors.push('Operation target no longer supports requested operation: ' + target.router_id);
      if (target.operation !== plan.operation) errors.push('Operation target operation mismatch: ' + target.router_id);
      if (!['pending', ...TERMINAL_STATUSES].includes(target.status)) errors.push('Operation target status is invalid: ' + target.router_id);
    }
  }
  if (plan && plan.fingerprint !== operationFingerprint(plan)) errors.push('Fleet operation plan fingerprint mismatch.');
  return { valid: errors.length === 0, errors };
}

function recordTargetOutcome(plan, routerId, status) {
  if (!['completed', 'failed', 'skipped'].includes(status)) throw new Error('Unsupported target outcome: ' + status);
  const target = plan?.targets?.find(item => item.router_id === routerId);
  if (!target) throw new Error('Unknown operation target: ' + routerId);
  if (TERMINAL_STATUSES.has(target.status)) throw new Error('Terminal operation target outcome is immutable: ' + routerId);
  const next = JSON.parse(JSON.stringify(plan));
  next.targets.forEach(item => { if (item.router_id === routerId) item.status = status; });
  next.execution.completed = next.targets.filter(item => item.status === 'completed').map(item => item.router_id);
  next.execution.failed = next.targets.filter(item => item.status === 'failed').map(item => item.router_id);
  next.execution.skipped = next.targets.filter(item => item.status === 'skipped').map(item => item.router_id);
  next.execution.status = next.execution.failed.length ? 'partial_failure' : (next.execution.completed.length === next.targets.length ? 'completed' : 'in_progress');
  next.fingerprint = operationFingerprint(next);
  return next;
}

module.exports = { SCHEMA_VERSION, createFleetOperationPlan, validateFleetOperationPlan, recordTargetOutcome };
