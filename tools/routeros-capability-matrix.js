'use strict';

const crypto = require('crypto');
const { canonicalValue } = require('./routeros-semantic');
const { validateConnectionProfile } = require('./routeros-connection-profile');
const { stableRouterId } = require('./routeros-inventory');

const SCHEMA_VERSION = '1.0.0';
const ALLOWED_OPERATIONS = new Set(['read', 'snapshot', 'audit']);
const SECRET_KEY_PATTERN = /(password|passwd|secret|private[-_]?key|passphrase|token|credential|authorization|cookie|api[-_]?key)/i;

function normalizeString(value, message) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(message);
  return value.trim();
}

function normalizeVersion(version) {
  if (version == null) return null;
  const value = normalizeString(version, 'RouterOS version must be a non-empty string.');
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(value);
  if (!match) throw new Error('RouterOS version must start with major.minor.');
  return { raw: value, major: Number(match[1]), minor: Number(match[2]), patch: match[3] == null ? null : Number(match[3]) };
}

function assertNoSecrets(value, path = '$') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) throw new Error('Secret-bearing capability field is forbidden: ' + path + '.' + key);
    assertNoSecrets(child, path + '.' + key);
  }
}

function normalizeCapabilities(capabilities = {}) {
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) throw new TypeError('Router capabilities must be an object.');
  const supported = Array.isArray(capabilities.supported_operations)
    ? [...new Set(capabilities.supported_operations.map(value => normalizeString(value, 'Supported operations must contain strings.')))].sort()
    : ['read', 'snapshot', 'audit'];
  for (const operation of supported) if (!ALLOWED_OPERATIONS.has(operation)) throw new Error('Unsupported inventory operation: ' + operation);
  const api = capabilities.api && typeof capabilities.api === 'object' ? { ...capabilities.api } : {};
  assertNoSecrets(api);
  return {
    supported_operations: supported,
    rest: {
      available: api.rest_available === true,
      readonly: api.rest_readonly !== false
    },
    resources: Array.isArray(capabilities.resources)
      ? [...new Set(capabilities.resources.map(value => normalizeString(value, 'Capability resources must contain strings.')))].sort()
      : []
  };
}

function capabilityFingerprint(capability) {
  return crypto.createHash('sha256').update(
    JSON.stringify(canonicalValue({
      schema_version: capability.schema_version,
      router_id: capability.router_id,
      routeros: capability.routeros,
      capabilities: capability.capabilities
    })),
    'utf8'
  ).digest('hex');
}

function createCapabilityRecord(input = {}) {
  if (input.id !== undefined || input.fingerprint !== undefined) throw new Error('User-controlled capability IDs and fingerprints are forbidden.');
  if (!input.connection_profile || typeof input.connection_profile !== 'object') throw new TypeError('A validated connection profile is required.');
  const profile = input.connection_profile;
  const validation = validateConnectionProfile(profile);
  if (!validation.valid) throw new Error('Capability discovery requires a valid read-only connection profile: ' + validation.errors.join(' '));
  const routerId = stableRouterId(profile);
  const record = {
    schema_version: SCHEMA_VERSION,
    router_id: routerId,
    connection_profile_id: profile.id,
    routeros: normalizeVersion(input.routeros_version),
    capabilities: normalizeCapabilities(input.capabilities),
    read_only: true,
    mutation_enabled: false,
    fingerprint: null
  };
  assertNoSecrets(record);
  record.fingerprint = capabilityFingerprint(record);
  return Object.freeze(record);
}

function validateCapabilityRecord(record) {
  const errors = [];
  if (!record || record.schema_version !== SCHEMA_VERSION) errors.push('Unsupported capability schema version.');
  if (!record || record.read_only !== true) errors.push('Capability record must be read-only.');
  if (!record || record.mutation_enabled !== false) errors.push('Capability mutation must be disabled.');
  if (!record?.router_id || !record?.connection_profile_id) errors.push('Capability record requires router and connection profile references.');
  try { assertNoSecrets(record); } catch (error) { errors.push(error.message); }
  if (record && record.fingerprint !== capabilityFingerprint(record)) errors.push('Capability fingerprint mismatch.');
  return { valid: errors.length === 0, errors };
}

module.exports = { SCHEMA_VERSION, normalizeVersion, normalizeCapabilities, capabilityFingerprint, createCapabilityRecord, validateCapabilityRecord };
