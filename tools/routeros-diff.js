#!/usr/bin/env node
'use strict';

/**
 * Deterministic semantic diff between an actual RouterOS semantic model and
 * an explicit desired-state document.
 *
 * This layer is read-only. It produces review data; it does not compile,
 * connect to, or mutate a router.
 */

const {
  canonicalValue,
  resourceIdentity,
  sha256,
} = require('./routeros-semantic');

const SECRET_KEYS = /(?:password|passwd|secret|private[-_]?key|passphrase|token|credential)/i;
const ORDER_SENSITIVE = new Set([
  'firewall.filter',
  'firewall.nat',
  'firewall.mangle',
  'firewall.raw',
  'ipv6.firewall.filter',
  'routing',
]);

function assertInputs(actual, desired) {
  if (!actual || typeof actual !== 'object') throw new TypeError('Actual semantic model is required');
  if (!Array.isArray(actual.resources)) throw new TypeError('Actual semantic model resources must be an array');
  if (!desired || typeof desired !== 'object') throw new TypeError('Desired state is required');
  if (!Array.isArray(desired.resources)) throw new TypeError('Desired state resources must be an array');
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = SECRET_KEYS.test(key) ? '[REDACTED]' : redact(value[key]);
      return out;
    }, {});
  }
  return value;
}

function desiredIdentity(resource) {
  const attrs = resource.attributes || {};
  return resourceIdentity(resource.kind, attrs);
}

function normalizeDesired(resources) {
  return resources.map((resource, index) => {
    if (!resource || typeof resource !== 'object') throw new TypeError(`Desired resource ${index} must be an object`);
    const kind = String(resource.kind || '').trim();
    if (!kind) throw new TypeError(`Desired resource ${index} is missing kind`);
    const attributes = canonicalValue(resource.attributes || {});
    const state = resource.state || 'present';
    if (!['present', 'absent'].includes(state)) {
      throw new TypeError(`Unsupported desired state for ${kind}: ${state}`);
    }
    const identity = desiredIdentity({ kind, attributes });
    return {
      kind,
      path: resource.path || null,
      identity,
      attributes,
      state,
      order: Number.isInteger(resource.order) ? resource.order : index,
    };
  });
}

function duplicateMap(resources, side) {
  const map = new Map();
  const duplicates = [];
  for (const resource of resources) {
    const key = resource.identity;
    if (map.has(key)) {
      duplicates.push({
        side,
        identity: key,
        kind: resource.kind,
        path: resource.path || null,
      });
      continue;
    }
    map.set(key, resource);
  }
  return { map, duplicates };
}

function attributeDiff(before = {}, after = {}) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].sort().flatMap(key => {
    const a = before[key];
    const b = after[key];
    if (JSON.stringify(canonicalValue(a)) === JSON.stringify(canonicalValue(b))) return [];
    return [{
      key,
      before: redact(a),
      after: redact(b),
    }];
  });
}

function stableResource(resource) {
  if (!resource) return null;
  return redact({
    kind: resource.kind,
    path: resource.path || null,
    identity: resource.identity,
    attributes: resource.attributes || {},
    order: resource.order,
    state: resource.state || 'present',
  });
}

function changeId(type, identity) {
  return `diff:${type}:${sha256(identity).slice(0, 16)}`;
}

function diff(actual, desired) {
  assertInputs(actual, desired);

  const actualResources = actual.resources.map((resource, index) => ({
    kind: resource.kind,
    path: resource.path || null,
    identity: resource.identity || resourceIdentity(resource.kind, resource.attributes || {}),
    attributes: canonicalValue(resource.attributes || {}),
    order: Number.isInteger(resource.order) ? resource.order : index,
    state: resource.status === 'opaque' ? 'opaque' : 'present',
  }));

  const desiredResources = normalizeDesired(desired.resources);
  const actualIndex = duplicateMap(actualResources, 'actual');
  const desiredIndex = duplicateMap(desiredResources, 'desired');

  const conflicts = [
    ...actualIndex.duplicates.map(item => ({
      id: changeId('conflict', `actual:${item.identity}`),
      type: 'conflict',
      kind: item.kind,
      identity: item.identity,
      path: item.path,
      reason: 'Duplicate actual identity; reconciliation is ambiguous.',
      requires_review: true,
    })),
    ...desiredIndex.duplicates.map(item => ({
      id: changeId('conflict', `desired:${item.identity}`),
      type: 'conflict',
      kind: item.kind,
      identity: item.identity,
      path: item.path,
      reason: 'Duplicate desired identity; reconciliation is ambiguous.',
      requires_review: true,
    })),
  ];

  const changes = [];
  const allIds = new Set([...actualIndex.map.keys(), ...desiredIndex.map.keys()]);

  for (const identity of [...allIds].sort()) {
    const before = actualIndex.map.get(identity) || null;
    const after = desiredIndex.map.get(identity) || null;

    if (!before && after) {
      if (after.state === 'absent') continue;
      changes.push({
        id: changeId('add', identity),
        type: 'add',
        kind: after.kind,
        identity,
        path: after.path,
        before: null,
        after: stableResource(after),
        attribute_changes: attributeDiff({}, after.attributes),
        order_change: null,
        risk: 'review',
        requires_review: true,
      });
      continue;
    }

    if (before && !after) {
      changes.push({
        id: changeId('remove', identity),
        type: 'remove',
        kind: before.kind,
        identity,
        path: before.path,
        before: stableResource(before),
        after: null,
        attribute_changes: attributeDiff(before.attributes, {}),
        order_change: null,
        risk: 'high',
        requires_review: true,
      });
      continue;
    }

    if (after.state === 'absent') {
      changes.push({
        id: changeId('remove', identity),
        type: 'remove',
        kind: before.kind,
        identity,
        path: before.path,
        before: stableResource(before),
        after: stableResource(after),
        attribute_changes: attributeDiff(before.attributes, {}),
        order_change: null,
        risk: 'high',
        requires_review: true,
      });
      continue;
    }

    const attributes = attributeDiff(before.attributes, after.attributes);
    const orderChanged = ORDER_SENSITIVE.has(before.kind) &&
      Number.isInteger(before.order) && Number.isInteger(after.order) &&
      before.order !== after.order;

    if (attributes.length || orderChanged || before.kind !== after.kind || before.path !== after.path) {
      changes.push({
        id: changeId('change', identity),
        type: 'change',
        kind: after.kind,
        identity,
        path: after.path || before.path,
        before: stableResource(before),
        after: stableResource(after),
        attribute_changes: attributes,
        order_change: orderChanged ? { before: before.order, after: after.order } : null,
        risk: orderChanged ? 'high' : 'review',
        requires_review: orderChanged,
      });
    }
  }

  changes.sort((a, b) => a.id.localeCompare(b.id));
  conflicts.sort((a, b) => a.id.localeCompare(b.id));

  const summary = {
    added: changes.filter(c => c.type === 'add').length,
    removed: changes.filter(c => c.type === 'remove').length,
    changed: changes.filter(c => c.type === 'change').length,
    unchanged: actualResources.filter(r => desiredIndex.map.has(r.identity) &&
      !changes.some(c => c.identity === r.identity) &&
      !conflicts.some(c => c.identity === r.identity)).length,
    conflicts: conflicts.length,
  };

  const result = {
    schema_version: '1.0',
    diff: {
      name: 'RouterOS Semantic Configuration Diff',
      version: '1.0',
      deterministic: true,
      read_only: true,
    },
    routeros: desired.routeros || actual.routeros || null,
    actual: {
      source: actual.source || null,
      fingerprint: actual.fingerprint || null,
      resources: actualResources.length,
    },
    desired: {
      resources: desiredResources.length,
    },
    summary,
    conflicts,
    changes,
  };

  result.fingerprint = sha256(JSON.stringify(canonicalValue(result)));
  return result;
}

if (require.main === module) {
  const fs = require('fs');
  const actualFile = process.argv[2];
  const desiredFile = process.argv[3];
  if (!actualFile || !desiredFile) {
    console.error('Usage: node tools/routeros-diff.js <actual-semantic.json> <desired-state.json> [--json]');
    process.exit(2);
  }
  try {
    const actual = JSON.parse(fs.readFileSync(actualFile, 'utf8'));
    const desired = JSON.parse(fs.readFileSync(desiredFile, 'utf8'));
    const result = diff(actual, desired);
    console.log(process.argv.includes('--json') ? JSON.stringify(result, null, 2) : JSON.stringify(result.summary, null, 2));
    process.exit(result.summary.conflicts ? 1 : 0);
  } catch (error) {
    console.error(`Diff error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { diff, redact, attributeDiff, normalizeDesired, SECRET_KEYS, ORDER_SENSITIVE };
