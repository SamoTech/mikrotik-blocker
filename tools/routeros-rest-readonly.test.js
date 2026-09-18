'use strict';

(async () => {
const assert = require('assert');
const {
  sanitizeBaseUrl,
  requestReadOnly,
  inspectRouter,
  discoverCapabilities,
  retrieveSnapshot
} = require('./routeros-rest-readonly');

assert.strictEqual(sanitizeBaseUrl('https://192.0.2.1/').origin, 'https://192.0.2.1');
assert.throws(() => sanitizeBaseUrl('ftp://192.0.2.1'), /HTTP or HTTPS/);
assert.throws(() => requestReadOnly({
  baseUrl: 'https://192.0.2.1',
  fetch: async () => ({})
}, '../system/resource'), /path traversal/);

let calls = [];
const fakeFetch = async (url, init) => {
  calls.push({ url: String(url), method: init.method });
  return {
    ok: true,
    status: 200,
    async text() {
      return JSON.stringify([{
        'board-name': 'test-router',
        'architecture-name': 'arm64',
        version: '7.21.4',
        platform: 'MikroTik'
      }]);
    }
  };
};

const result = await inspectRouter({
  baseUrl: 'https://192.0.2.1',
  fetch: fakeFetch
});

assert.strictEqual(result.mode, 'read-only');
assert.strictEqual(result.mutation_performed, false);
assert.strictEqual(result.capabilities.write_operations, false);
assert.strictEqual(result.capabilities.arbitrary_commands, false);
assert.strictEqual(result.router.version, '7.21.4');
assert.deepStrictEqual(calls, [{
  url: 'https://192.0.2.1/rest/system/resource',
  method: 'GET'
}]);


const discovery = await discoverCapabilities({
  baseUrl: 'https://192.0.2.1',
  fetch: fakeFetch
});
assert.strictEqual(discovery.capabilities.discovered['system/package'], true);
assert.strictEqual(discovery.capability_probe_count, 7);

const snapshot = await retrieveSnapshot({
  baseUrl: 'https://192.0.2.1',
  fetch: fakeFetch
}, ['system/resource', 'ip/firewall/filter']);
assert.strictEqual(snapshot.mode, 'read-only');
assert.strictEqual(snapshot.mutation_performed, false);
assert.ok(typeof snapshot.content_fingerprint === 'string');
assert.strictEqual(Object.keys(snapshot.resources).length, 2);
assert.deepStrictEqual(snapshot.errors, []);

await assert.rejects(
  () => requestReadOnly({
    baseUrl: 'https://192.0.2.1',
    fetch: fakeFetch
  }, 'ip/firewall/filter', { method: 'DELETE' }),
  /Only GET/
);

console.log('routeros-rest-readonly.test.js: all tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
