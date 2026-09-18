'use strict';

const crypto = require('crypto');

const SCHEMA_VERSION = '1.0.0';

function assertString(value, message) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(message);
  return value.trim();
}

function sanitizeBaseUrl(value) {
  const raw = assertString(value, 'Router base URL is required.');
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('Router connection profiles require HTTPS.');
  if (url.username || url.password) throw new Error('Router connection profiles must not contain embedded credentials.');
  if (url.search || url.hash) throw new Error('Router connection profile URL must not contain query or fragment.');
  url.pathname = url.pathname.replace(/\/+$/, '');
  if (url.pathname && url.pathname !== '/' && url.pathname !== '/rest') {
    throw new Error('Router connection profile URL must use the router origin or /rest base path.');
  }
  return url.origin;
}

function normalizeAuthReference(value) {
  const ref = assertString(value, 'Credential reference is required.');
  if (/\s/.test(ref) || ref.length > 256) throw new Error('Credential reference is invalid.');
  return ref;
}

function createConnectionProfile(options = {}) {
  const name = assertString(options.name, 'Connection profile name is required.');
  if (name.length > 120) throw new Error('Connection profile name is too long.');

  const baseUrl = sanitizeBaseUrl(options.base_url);
  const authReference = normalizeAuthReference(options.auth_reference);
  const timeoutMs = options.timeout_ms == null ? 5000 : Number(options.timeout_ms);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    throw new Error('Connection timeout must be an integer between 1000 and 30000 ms.');
  }

  const profile = {
    schema_version: SCHEMA_VERSION,
    id: options.id ? assertString(options.id, 'Connection profile id is invalid.') : crypto.randomUUID(),
    name,
    base_url: baseUrl,
    auth_reference: authReference,
    mode: 'read-only',
    tls_required: true,
    timeout_ms: timeoutMs,
    credential_values_included: false,
    write_operations_enabled: false,
    created_at: options.created_at || new Date().toISOString()
  };

  profile.fingerprint = fingerprintConnectionProfile(profile);
  return profile;
}

function fingerprintConnectionProfile(profile) {
  const canonical = {
    schema_version: profile.schema_version,
    id: profile.id,
    name: profile.name,
    base_url: profile.base_url,
    mode: profile.mode,
    tls_required: profile.tls_required,
    timeout_ms: profile.timeout_ms,
    credential_values_included: false,
    write_operations_enabled: false
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonical), 'utf8').digest('hex');
}

function validateConnectionProfile(profile) {
  const errors = [];
  try { sanitizeBaseUrl(profile && profile.base_url); } catch (e) { errors.push(e.message); }
  try { normalizeAuthReference(profile && profile.auth_reference); } catch (e) { errors.push(e.message); }

  if (!profile || profile.schema_version !== SCHEMA_VERSION) errors.push('Unsupported connection profile schema.');
  if (!profile || profile.mode !== 'read-only') errors.push('Connection profile mode must be read-only.');
  if (!profile || profile.tls_required !== true) errors.push('TLS is required.');
  if (!profile || profile.credential_values_included !== false) errors.push('Credential values must not be included.');
  if (!profile || profile.write_operations_enabled !== false) errors.push('Write operations must be disabled.');
  if (!profile || !Number.isInteger(profile.timeout_ms) || profile.timeout_ms < 1000 || profile.timeout_ms > 30000) {
    errors.push('Connection timeout must be an integer between 1000 and 30000 ms.');
  }
  if (profile && profile.fingerprint !== fingerprintConnectionProfile(profile)) errors.push('Connection profile fingerprint mismatch.');

  return { valid: errors.length === 0, errors };
}

function redactConnectionProfile(profile) {
  if (!profile || typeof profile !== 'object') return profile;
  const copy = JSON.parse(JSON.stringify(profile));
  delete copy.password;
  delete copy.passphrase;
  delete copy.token;
  delete copy.secret;
  delete copy.credential;
  delete copy.private_key;
  delete copy.private_key_material;
  return copy;
}

module.exports = {
  SCHEMA_VERSION,
  sanitizeBaseUrl,
  createConnectionProfile,
  fingerprintConnectionProfile,
  validateConnectionProfile,
  redactConnectionProfile
};
