'use strict';

const crypto = require('crypto');
const { canonicalValue } = require('./routeros-semantic');
const { normalizeRouter, stableRouterId, assertNoSecrets } = require('./routeros-inventory');
const { validateCapabilityRecord } = require('./routeros-capability-matrix');

const SCHEMA_VERSION = '1.0.0';

function canonicalFleet(fleet) {
  const routers = [...fleet.routers].map(router => canonicalValue({
    id: router.id, name: router.name, connection_profile_id: router.connection_profile_id,
    site: router.site, tags: router.tags, enabled: router.enabled, metadata: router.metadata,
    capability: router.capability
  })).sort((a, b) => a.id.localeCompare(b.id));
  return canonicalValue({ schema_version: fleet.schema_version, read_only: true, mutation_enabled: false, routers });
}

function fleetFingerprint(fleet) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalFleet(fleet)), 'utf8').digest('hex');
}

function createFleetInventory(options = {}) {
  if (options.id !== undefined || options.fingerprint !== undefined) throw new Error('User-controlled fleet inventory IDs and fingerprints are forbidden.');
  if (!Array.isArray(options.routers)) throw new TypeError('Fleet inventory routers must be an array.');

  const routers = options.routers.map(input => {
    if (!input || typeof input !== 'object' || !input.connection_profile) throw new TypeError('Each fleet router requires a connection profile.');
    if (!input.capability) throw new TypeError('Each fleet router requires a capability record.');
    const router = normalizeRouter(input);
    const capability = JSON.parse(JSON.stringify(input.capability));
    const validation = validateCapabilityRecord(capability);
    if (!validation.valid) throw new Error('Invalid router capability record: ' + validation.errors.join(' '));
    if (capability.router_id !== stableRouterId(input.connection_profile)) throw new Error('Capability router identity does not match its connection profile.');
    if (capability.connection_profile_id !== input.connection_profile.id) throw new Error('Capability connection profile does not match its router inventory profile.');
    assertNoSecrets({ router, capability });
    return { ...router, capability };
  });

  const ids = new Set();
  for (const router of routers) {
    if (ids.has(router.id)) throw new Error('Duplicate router identity in fleet inventory.');
    ids.add(router.id);
  }

  routers.sort((a, b) => a.id.localeCompare(b.id));
  const fleet = { schema_version: SCHEMA_VERSION, read_only: true, mutation_enabled: false, routers, fingerprint: null };
  fleet.fingerprint = fleetFingerprint(fleet);
  return Object.freeze(fleet);
}

function validateFleetInventory(fleet) {
  const errors = [];
  if (!fleet || fleet.schema_version !== SCHEMA_VERSION) errors.push('Unsupported fleet inventory schema.');
  if (!fleet || fleet.read_only !== true) errors.push('Fleet inventory must be read-only.');
  if (!fleet || fleet.mutation_enabled !== false) errors.push('Fleet inventory mutation must be disabled.');
  if (!fleet || !Array.isArray(fleet.routers)) errors.push('Fleet inventory routers must be an array.');

  const ids = new Set();
  if (Array.isArray(fleet?.routers)) {
    for (const router of fleet.routers) {
      try { assertNoSecrets(router); } catch (error) { errors.push(error.message); }
      if (!router?.id || ids.has(router.id)) errors.push('Fleet router identities must be present and unique.');
      if (router?.id) ids.add(router.id);
      if (!router?.capability) {
        errors.push('Every fleet router requires a capability record.');
        continue;
      }
      const capabilityValidation = validateCapabilityRecord(router.capability);
      if (!capabilityValidation.valid) errors.push(...capabilityValidation.errors);
      if (router.capability.router_id !== router.id) errors.push('Capability router identity mismatch.');
      if (router.capability.connection_profile_id !== router.connection_profile_id) errors.push('Capability connection profile mismatch.');
    }
  }

  if (fleet && fleet.fingerprint !== fleetFingerprint(fleet)) errors.push('Fleet inventory fingerprint mismatch.');
  return { valid: errors.length === 0, errors };
}

module.exports = { SCHEMA_VERSION, createFleetInventory, validateFleetInventory, fleetFingerprint };
