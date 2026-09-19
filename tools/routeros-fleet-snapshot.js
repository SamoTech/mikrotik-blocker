'use strict';

const crypto = require('crypto');
const { canonicalValue } = require('./routeros-semantic');
const { validateFleetInventory } = require('./routeros-fleet-inventory');
const { validateSnapshot, redactSecrets } = require('./routeros-snapshot');

const SCHEMA_VERSION = '1.0.0';
const STATUSES = new Set(['captured', 'failed']);

function assertNoSecrets(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecrets(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (/(?:password|passwd|secret|private[-_]?key|passphrase|token|credential|authorization|cookie|api[-_]?key)/i.test(key)) {
      throw new Error(`Secret-bearing fleet snapshot field is forbidden: ${path}.${key}`);
    }
    assertNoSecrets(item, `${path}.${key}`);
  }
}

function canonicalEntries(snapshot) {
  return [...snapshot.entries]
    .map(entry => canonicalValue({
      router_id: entry.router_id,
      connection_profile_id: entry.connection_profile_id,
      status: entry.status,
      snapshot: entry.snapshot,
      error: entry.error
    }))
    .sort((a, b) => a.router_id.localeCompare(b.router_id));
}

function snapshotFingerprint(snapshot) {
  const payload = canonicalValue({
    schema_version: snapshot.schema_version,
    fleet_fingerprint: snapshot.fleet_fingerprint,
    read_only: true,
    mutation_enabled: false,
    entries: canonicalEntries(snapshot)
  });
  return crypto.createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
}

function createFleetSnapshot(options = {}) {
  if (options.id !== undefined || options.fingerprint !== undefined) {
    throw new Error('User-controlled fleet snapshot IDs and fingerprints are forbidden.');
  }
  const fleet = options.fleet;
  const fleetValidation = validateFleetInventory(fleet);
  if (!fleetValidation.valid) throw new Error('Invalid fleet inventory: ' + fleetValidation.errors.join(' '));
  if (!Array.isArray(options.entries)) throw new TypeError('Fleet snapshot entries must be an array.');

  const routers = new Map(fleet.routers.map(router => [router.id, router]));
  const seen = new Set();
  const entries = options.entries.map(input => {
    if (!input || typeof input !== 'object' || typeof input.router_id !== 'string') {
      throw new TypeError('Every fleet snapshot entry requires a router_id.');
    }
    if (seen.has(input.router_id)) throw new Error('Duplicate router snapshot entry: ' + input.router_id);
    seen.add(input.router_id);
    const router = routers.get(input.router_id);
    if (!router) throw new Error('Fleet snapshot entry references an unknown router: ' + input.router_id);
    if (!STATUSES.has(input.status)) throw new Error('Unsupported fleet snapshot entry status: ' + input.status);

    const entry = {
      router_id: router.id,
      connection_profile_id: router.connection_profile_id,
      status: input.status,
      snapshot: input.status === 'captured' ? redactSecrets(input.snapshot) : null,
      error: input.status === 'failed' ? redactSecrets(input.error || 'Snapshot capture failed.') : null
    };

    if (entry.status === 'captured') {
      const validation = validateSnapshot(entry.snapshot);
      if (!validation.valid) throw new Error('Invalid router snapshot for ' + router.id + ': ' + validation.errors.join(' '));
    }
    assertNoSecrets(entry);
    return entry;
  });

  entries.sort((a, b) => a.router_id.localeCompare(b.router_id));
  if (entries.length !== routers.size) throw new Error('Fleet snapshot must contain exactly one outcome for every fleet router.');
  const snapshot = {
    schema_version: SCHEMA_VERSION,
    id: null,
    fleet_fingerprint: fleet.fingerprint,
    captured_at: options.captured_at || null,
    entries,
    read_only: true,
    mutation_enabled: false,
    content_fingerprint: null
  };
  const seed = canonicalValue({ fleet_fingerprint: snapshot.fleet_fingerprint, entries: canonicalEntries(snapshot) });
  snapshot.id = 'fleet-snapshot:' + crypto.createHash('sha256').update(JSON.stringify(seed), 'utf8').digest('hex').slice(0, 20);
  snapshot.content_fingerprint = snapshotFingerprint(snapshot);
  return Object.freeze(snapshot);
}

function validateFleetSnapshot(snapshot, expected = {}) {
  const errors = [];
  if (!snapshot || typeof snapshot !== 'object') return { valid: false, errors: ['Fleet snapshot must be an object.'] };
  if (snapshot.schema_version !== SCHEMA_VERSION) errors.push('Unsupported fleet snapshot schema.');
  if (snapshot.read_only !== true) errors.push('Fleet snapshot must be read-only.');
  if (snapshot.mutation_enabled !== false) errors.push('Fleet snapshot mutation must be disabled.');
  if (!Array.isArray(snapshot.entries)) errors.push('Fleet snapshot entries must be an array.');
  if (!snapshot.id || !snapshot.content_fingerprint || !snapshot.fleet_fingerprint) errors.push('Fleet snapshot integrity metadata is incomplete.');

  if (expected.fleet) {
    const fleetValidation = validateFleetInventory(expected.fleet);
    if (!fleetValidation.valid) errors.push(...fleetValidation.errors);
    if (snapshot.fleet_fingerprint !== expected.fleet.fingerprint) errors.push('Fleet snapshot does not match expected fleet inventory fingerprint.');
  }
  if (expected.fleet_fingerprint !== undefined && snapshot.fleet_fingerprint !== expected.fleet_fingerprint) {
    errors.push('Fleet snapshot fleet fingerprint mismatch.');
  }

  const routers = expected.fleet ? new Map(expected.fleet.routers.map(router => [router.id, router])) : null;
  const seen = new Set();
  if (Array.isArray(snapshot.entries)) {
    for (const entry of snapshot.entries) {
      try { assertNoSecrets(entry); } catch (error) { errors.push(error.message); }
      if (!entry || typeof entry.router_id !== 'string' || seen.has(entry.router_id)) {
        errors.push('Fleet snapshot router identities must be present and unique.');
        continue;
      }
      seen.add(entry.router_id);
      if (!STATUSES.has(entry.status)) errors.push('Unsupported fleet snapshot entry status.');
      const router = routers?.get(entry.router_id);
      if (routers && !router) errors.push('Fleet snapshot references a router outside the expected fleet.');
      if (router && entry.connection_profile_id !== router.connection_profile_id) errors.push('Fleet snapshot connection profile mismatch.');
      if (entry.status === 'captured') {
        const validation = validateSnapshot(entry.snapshot);
        if (!validation.valid) errors.push(...validation.errors);
      }
      if (entry.status === 'failed' && entry.snapshot !== null) errors.push('Failed fleet snapshot entries must not contain a router snapshot.');
    }
    if (routers && seen.size !== routers.size) errors.push('Fleet snapshot must contain exactly one outcome for every fleet router.');
  }

  if (snapshot.content_fingerprint !== snapshotFingerprint(snapshot)) errors.push('Fleet snapshot content fingerprint mismatch.');
  return { valid: errors.length === 0, errors };
}

module.exports = { SCHEMA_VERSION, STATUSES, createFleetSnapshot, validateFleetSnapshot, snapshotFingerprint };
