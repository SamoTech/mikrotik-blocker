'use strict';

const crypto = require('crypto');
const { canonicalValue } = require('./routeros-semantic');

const SCHEMA_VERSION = '1.0.0';
const SECRET_KEY_PATTERN = /(password|passwd|secret|private[-_]?key|passphrase|token|credential|authorization|cookie|api[-_]?key)/i;

function assertString(value, message) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(message);
  return value.trim();
}

function stableRouterId(connectionProfile) {
  const canonical = canonicalValue({
    connection_profile_id: connectionProfile.id,
    base_url: connectionProfile.base_url
  });
  return 'router:' + crypto.createHash('sha256').update(JSON.stringify(canonical), 'utf8').digest('hex').slice(0, 20);
}

function canonicalRouter(router) {
  return canonicalValue({
    id: router.id,
    name: router.name,
    connection_profile_id: router.connection_profile_id,
    site: router.site || null,
    tags: Array.isArray(router.tags) ? [...router.tags].sort() : [],
    enabled: router.enabled === true,
    metadata: router.metadata || null
  });
}

function fingerprintInventory(inventory) {
  const routers = [...(inventory.routers || [])]
    .map(canonicalRouter)
    .sort((a, b) => a.id.localeCompare(b.id));
  return crypto.createHash('sha256')
    .update(JSON.stringify(canonicalValue({ schema_version: inventory.schema_version, routers })), 'utf8')
    .digest('hex');
}

function assertNoSecrets(value, path = '$') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) throw new Error(`Secret-bearing inventory field is forbidden: ${path}.${key}`);
    assertNoSecrets(child, `${path}.${key}`);
  }
}

function normalizeTags(tags) {
  if (tags == null) return [];
  if (!Array.isArray(tags)) throw new TypeError('Router tags must be an array.');
  const normalized = [...new Set(tags.map(tag => assertString(tag, 'Router tags must contain non-empty strings.')))];
  if (normalized.some(tag => tag.length > 64)) throw new Error('Router tag is too long.');
  return normalized.sort();
}

function createRouterInventory(options = {}) {
  if (options.id !== undefined) throw new Error('User-controlled inventory IDs are forbidden.');
  const inventory = {
    schema_version: SCHEMA_VERSION,
    routers: [],
    read_only: true,
    mutation_enabled: false,
    fingerprint: null
  };
  if (options.routers !== undefined) {
    if (!Array.isArray(options.routers)) throw new TypeError('Inventory routers must be an array.');
    for (const router of options.routers) inventory.routers.push(normalizeRouter(router));
  }
  inventory.routers.sort((a, b) => a.id.localeCompare(b.id));
  inventory.fingerprint = fingerprintInventory(inventory);
  return inventory;
}

function normalizeRouter(input = {}) {
  if (!input.connection_profile || typeof input.connection_profile !== 'object') {
    throw new TypeError('A validated connection profile is required.');
  }
  const profile = input.connection_profile;
  if (!profile.id || !profile.base_url) throw new TypeError('Connection profile id and base_url are required.');
  if (profile.credential_values_included !== false || profile.write_operations_enabled !== false || profile.mode !== 'read-only') {
    throw new Error('Router inventory accepts only read-only connection profiles.');
  }

  const router = {
    id: stableRouterId(profile),
    name: assertString(input.name || profile.name, 'Router name is required.'),
    connection_profile_id: profile.id,
    site: input.site == null ? null : assertString(input.site, 'Router site must be a non-empty string.'),
    tags: normalizeTags(input.tags),
    enabled: input.enabled !== false,
    metadata: input.metadata == null ? null : JSON.parse(JSON.stringify(input.metadata))
  };
  assertNoSecrets(router.metadata);
  return router;
}

function addRouter(inventory, input) {
  validateInventory(inventory);
  const router = normalizeRouter(input);
  if (inventory.routers.some(existing => existing.id === router.id)) throw new Error('Router already exists in inventory.');
  const next = JSON.parse(JSON.stringify(inventory));
  next.routers.push(router);
  next.routers.sort((a, b) => a.id.localeCompare(b.id));
  next.fingerprint = fingerprintInventory(next);
  return next;
}

function validateInventory(inventory) {
  const errors = [];
  if (!inventory || inventory.schema_version !== SCHEMA_VERSION) errors.push('Unsupported router inventory schema.');
  if (!inventory || inventory.read_only !== true) errors.push('Router inventory must be read-only.');
  if (!inventory || inventory.mutation_enabled !== false) errors.push('Router inventory mutation must be disabled.');
  if (!inventory || !Array.isArray(inventory.routers)) errors.push('Router inventory routers must be an array.');
  if (Array.isArray(inventory?.routers)) {
    const ids = new Set();
    for (const router of inventory.routers) {
      try { assertNoSecrets(router); } catch (error) { errors.push(error.message); }
      if (!router?.id || ids.has(router.id)) errors.push('Router inventory IDs must be present and unique.');
      if (router?.id) ids.add(router.id);
      if (!router?.connection_profile_id) errors.push('Every router requires a connection profile reference.');
    }
  }
  if (inventory && inventory.fingerprint !== fingerprintInventory(inventory)) errors.push('Router inventory fingerprint mismatch.');
  return { valid: errors.length === 0, errors };
}

module.exports = {
  SCHEMA_VERSION,
  stableRouterId,
  normalizeRouter,
  createRouterInventory,
  addRouter,
  fingerprintInventory,
  validateInventory
};
