'use strict';

const assert = require('assert');
const {
  sanitizeBaseUrl,
  createConnectionProfile,
  fingerprintConnectionProfile,
  validateConnectionProfile,
  redactConnectionProfile
} = require('./routeros-connection-profile');

assert.strictEqual(sanitizeBaseUrl('https://192.0.2.1/'), 'https://192.0.2.1');
assert.strictEqual(sanitizeBaseUrl('https://192.0.2.1/rest'), 'https://192.0.2.1');
assert.throws(() => sanitizeBaseUrl('http://192.0.2.1'), /HTTPS/);
assert.throws(() => sanitizeBaseUrl('https://user:pass@192.0.2.1'), /embedded credentials/);
assert.throws(() => sanitizeBaseUrl('https://192.0.2.1/?x=1'), /query/);
assert.throws(() => sanitizeBaseUrl('https://192.0.2.1/not-rest'), /origin or \/rest/);

const profile = createConnectionProfile({
  id: 'router-test',
  name: 'Test Router',
  base_url: 'https://192.0.2.1/rest/',
  auth_reference: 'router-test-credential',
  timeout_ms: 8000,
  created_at: '2026-09-18T00:00:00.000Z'
});

assert.strictEqual(profile.mode, 'read-only');
assert.strictEqual(profile.tls_required, true);
assert.strictEqual(profile.credential_values_included, false);
assert.strictEqual(profile.write_operations_enabled, false);
assert.strictEqual(profile.base_url, 'https://192.0.2.1');
assert.ok(profile.fingerprint);
assert.strictEqual(validateConnectionProfile(profile).valid, true);

const changed = { ...profile, timeout_ms: 9000 };
assert.notStrictEqual(fingerprintConnectionProfile(profile), fingerprintConnectionProfile(changed));
assert.strictEqual(validateConnectionProfile(changed).valid, false);

const withSecrets = { ...profile, password: 'super-secret', token: 'secret-token', private_key_material: 'PRIVATE' };
const redacted = redactConnectionProfile(withSecrets);
assert.strictEqual(JSON.stringify(redacted).includes('super-secret'), false);
assert.strictEqual(JSON.stringify(redacted).includes('secret-token'), false);
assert.strictEqual(JSON.stringify(redacted).includes('PRIVATE'), false);
assert.strictEqual(redacted.auth_reference, 'router-test-credential');

const tampered = { ...profile, write_operations_enabled: true };
assert.strictEqual(validateConnectionProfile(tampered).valid, false);

console.log('routeros-connection-profile.test.js: all tests passed');
