'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mapFindingsExitCode, run } = require('./firewall-doctor-action');
const { analyze, formatReport } = require('./firewall-doctor');

assert.strictEqual(mapFindingsExitCode(false, true), 0);
assert.strictEqual(mapFindingsExitCode(true, true), 1);
assert.strictEqual(mapFindingsExitCode(true, false), 0);
assert.strictEqual(run('', 'true'), 2);
assert.strictEqual(run('tools/does-not-exist.rsc', 'true'), 2);
assert.strictEqual(run('tools/routeros-fixtures/routeros7-basic.rsc', 'sometimes'), 2);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firewall-doctor-action-'));
try {
  const configPath = path.join(tempDir, 'sanitized.rsc');
  const highFindingConfig = '/ip firewall filter\nadd chain=forward action=accept comment="SAFE_TEST_FIXTURE"\n';
  const analysis = analyze(highFindingConfig);
  assert.ok(analysis.summary.high > 0, 'fixture should reliably produce a high-severity finding');
  fs.writeFileSync(configPath, highFindingConfig, 'utf8');
  assert.strictEqual(run(configPath, 'true'), 1, 'high findings must fail when fail-on-high=true');
  assert.strictEqual(run(configPath, 'false'), 0, 'high findings must not fail when fail-on-high=false');

  // Reports must not dump arbitrary export comments or unrelated configuration values.
  const sentinel = 'SECRET_SENTINEL_DO_NOT_LOG';
  const report = formatReport(analyze('/ip firewall filter\nadd chain=forward action=drop comment="' + sentinel + '"\n'));
  assert.ok(!report.includes(sentinel), 'report must not echo arbitrary export comments');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

const fixture = path.join(__dirname, 'routeros-fixtures', 'routeros7-basic.rsc');
const fixtureRun = run(fixture, 'false');
assert.strictEqual(fixtureRun, 0, 'valid sanitized fixture should run successfully');

const action = fs.readFileSync(path.join(__dirname, '..', 'action.yml'), 'utf8');
const runner = fs.readFileSync(path.join(__dirname, 'firewall-doctor-action.js'), 'utf8');
assert.match(action, /using: composite/);
assert.match(action, /tools\/firewall-doctor-action\.js/);
assert.doesNotMatch(action, /password|api[_-]?token|router[_-]?credentials/i);
assert.doesNotMatch(runner, /ssh\s|fetch\s|curl\s|\/ip firewall/i);

console.log('Firewall Doctor Action tests passed');
