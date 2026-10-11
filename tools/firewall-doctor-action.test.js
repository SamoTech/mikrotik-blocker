'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { mapFindingsExitCode, run } = require('./firewall-doctor-action');

assert.strictEqual(mapFindingsExitCode(false, true), 0);
assert.strictEqual(mapFindingsExitCode(true, true), 1);
assert.strictEqual(mapFindingsExitCode(true, false), 0);
assert.strictEqual(run('', 'true'), 2);
assert.strictEqual(run('tools/does-not-exist.rsc', 'true'), 2);
assert.strictEqual(run('tools/routeros-fixtures/routeros7-basic.rsc', 'sometimes'), 2);

const fixture = path.join(__dirname, 'routeros-fixtures', 'routeros7-basic.rsc');
const acceptedRun = run(fixture, 'false');
assert.strictEqual(acceptedRun, 0, 'high/critical findings should be non-blocking when fail-on-high=false');
const gatedRun = run(fixture, 'true');
assert.ok(gatedRun === 0 || gatedRun === 1, 'valid input should return a findings status, not an operational error');

const action = fs.readFileSync(path.join(__dirname, '..', 'action.yml'), 'utf8');
const runner = fs.readFileSync(path.join(__dirname, 'firewall-doctor-action.js'), 'utf8');
assert.match(action, /using: composite/);
assert.match(action, /tools\/firewall-doctor-action\.js/);
assert.doesNotMatch(action, /password|api[_-]?token|router[_-]?credentials/i);
assert.doesNotMatch(runner, /ssh\s|fetch\s|curl\s|\/ip firewall/i);

console.log('Firewall Doctor Action tests passed');
