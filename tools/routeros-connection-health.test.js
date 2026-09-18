'use strict';

const assert = require('assert');
const { createConnectionProfile } = require('./routeros-connection-profile');
const { checkConnectionHealth } = require('./routeros-connection-health');

const profile = createConnectionProfile({
  id: 'health-test',
  name: 'Health Test Router',
  base_url: 'https://192.0.2.1',
  auth_reference: 'health-test-credential'
});

const fetch = async (url, init) => {
  assert.strictEqual(String(url), 'https://192.0.2.1/rest/system/resource');
  assert.strictEqual(init.method, 'GET');
  return {
    ok: true,
    status: 200,
    async text() {
      return JSON.stringify([{
        'board-name': 'health-router',
        architecture: 'arm64',
        version: '7.21.4',
        platform: 'MikroTik'
      }]);
    }
  };
};

(async () => {
  const healthy = await checkConnectionHealth(profile, { fetch });
  assert.strictEqual(healthy.status, 'healthy');
  assert.strictEqual(healthy.reachable, true);
  assert.strictEqual(healthy.read_only, true);
  assert.strictEqual(healthy.router.version, '7.21.4');

  const invalid = await checkConnectionHealth({ ...profile, write_operations_enabled: true }, { fetch });
  assert.strictEqual(invalid.status, 'invalid-profile');
  assert.strictEqual(invalid.reachable, false);

  const failed = await checkConnectionHealth(profile, {
    fetch: async () => { throw new Error('connection refused'); }
  });
  assert.strictEqual(failed.status, 'unreachable');
  assert.strictEqual(failed.reachable, false);
  assert.strictEqual(failed.errors[0].code, 'CONNECTION_FAILED');

  console.log('routeros-connection-health.test.js: all tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
