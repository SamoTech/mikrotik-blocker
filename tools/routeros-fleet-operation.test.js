'use strict';

const assert = require('assert');
const { createConnectionProfile } = require('./routeros-connection-profile');
const { createCapabilityRecord } = require('./routeros-capability-matrix');
const { createFleetInventory } = require('./routeros-fleet-inventory');
const { createFleetOperationPlan, validateFleetOperationPlan, recordTargetOutcome } = require('./routeros-fleet-operation');

function profile(name, url) {
  return createConnectionProfile({ name, base_url: url, auth_reference: name.toLowerCase().replace(/\s+/g, '-'), created_at: '2026-09-19T00:00:00.000Z' });
}
const a = profile('A', 'https://a.example');
const b = profile('B', 'https://b.example');
function cap(profile) {
  return createCapabilityRecord({ connection_profile: profile, routeros_version: '7.21.4', capabilities: { supported_operations: ['read', 'snapshot'], api: { rest_available: true, rest_readonly: true }, resources: ['system/resource'] } });
}
const fleet = createFleetInventory({ routers: [{ connection_profile: a, name: 'A', site: 'Cairo', capability: cap(a) }, { connection_profile: b, name: 'B', site: 'Giza', capability: cap(b) }] });
const targetIds = fleet.routers.map(router => router.id);
const plan = createFleetOperationPlan(fleet, { operation: 'snapshot', target_router_ids: targetIds });
assert.strictEqual(plan.read_only, true);
assert.strictEqual(plan.mutation_enabled, false);
assert.deepStrictEqual(plan.targets.map(t => t.router_id), [...targetIds].sort());
assert.strictEqual(validateFleetOperationPlan(plan, fleet).valid, true);
const reversed = createFleetOperationPlan(fleet, { operation: 'snapshot', target_router_ids: [...targetIds].reverse() });
assert.strictEqual(reversed.fingerprint, plan.fingerprint);
assert.throws(() => createFleetOperationPlan(fleet, { operation: 'snapshot', target_router_ids: [targetIds[0]] }), /explicit non-empty/);
assert.throws(() => createFleetOperationPlan(fleet, { operation: 'write', target_router_ids: targetIds }), /Unsupported fleet operation/);
assert.throws(() => createFleetOperationPlan(fleet, { operation: 'snapshot', target_router_ids: [targetIds[0], targetIds[0]] }), /Duplicate/);
assert.throws(() => createFleetOperationPlan(fleet, { operation: 'snapshot', target_router_ids: [...targetIds, 'router:unknown'] }), /does not exist/);
const tampered = JSON.parse(JSON.stringify(plan));
tampered.targets[0].capability_fingerprint = 'tampered';
assert.strictEqual(validateFleetOperationPlan(tampered, fleet).valid, false);
const staleFleet = JSON.parse(JSON.stringify(fleet));
staleFleet.routers[0].capability.capabilities.resources.push('system/package');
assert.strictEqual(validateFleetOperationPlan(plan, staleFleet).valid, false);
const failed = recordTargetOutcome(plan, targetIds[0], 'failed');
assert.strictEqual(failed.execution.status, 'partial_failure');
assert.deepStrictEqual(failed.execution.failed, [targetIds[0]]);
assert.strictEqual(failed.targets.find(t => t.router_id === targetIds[0]).status, 'failed');
assert.strictEqual(failed.targets.find(t => t.router_id === targetIds[1]).status, 'pending');
console.log('routeros-fleet-operation tests passed');
