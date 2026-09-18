'use strict';

const assert = require('assert');
const {
  parseVersion,
  compareVersions,
  versionInRange,
  evaluateCompatibility,
} = require('./routeros-compatibility');

assert.deepStrictEqual(parseVersion('7.21.4'), {
  raw: '7.21.4',
  major: 7,
  minor: 21,
  patch: 4,
});
assert.strictEqual(compareVersions('7.21.4', '7.20.0') > 0, true);
assert.strictEqual(versionInRange('7.21.4', { minimum: '7.20.0', maximum: '7.22.0' }), true);

assert.strictEqual(
  evaluateCompatibility({
    actual: { version: '7.21.4' },
    target: { version: '7.21.4' },
  }).compatibility.valid,
  true
);

assert.strictEqual(
  evaluateCompatibility({
    actual: { version: '6.49.18' },
    target: { version: '7.21.4' },
  }).compatibility.valid,
  false
);

assert.strictEqual(
  evaluateCompatibility({
    actual: { version: '7.19.2' },
    target: {
      version: '7.21.4',
      compatibility: { minimum: '7.20.0' },
    },
  }).compatibility.valid,
  false
);

assert.strictEqual(
  evaluateCompatibility({
    actual: { version: 'unknown' },
    target: { version: '7.21.4' },
  }).compatibility.valid,
  false
);

const repeatA = evaluateCompatibility({
  actual: { version: '7.21.4' },
  target: { version: '7.21.4' },
});
const repeatB = evaluateCompatibility({
  actual: { version: '7.21.4' },
  target: { version: '7.21.4' },
});
assert.deepStrictEqual(repeatA, repeatB);

console.log('routeros-compatibility.test.js: all tests passed');
