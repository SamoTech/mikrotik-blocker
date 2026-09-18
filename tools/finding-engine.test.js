'use strict';

const assert = require('assert');
const {
  createFinding,
  normalizeFinding,
  attachProvenance,
  sortFindings,
  summarizeFindings,
  validateFinding,
} = require('./finding-engine');

const base = createFinding({
  id: 'IPV6_COVERAGE',
  severity: 'high',
  title: 'IPv6 coverage',
  evidence: 'IPv4 firewall resources exist without IPv6 resources.',
  fix: 'Review IPv6 policy.',
});

assert.strictEqual(base.check_id, 'IPV6_COVERAGE');
assert.strictEqual(base.rule_id, 'IPV6_COVERAGE');
assert.strictEqual(base.status, 'open');
assert.deepStrictEqual(base.resource_refs, []);

const normalized = normalizeFinding({ id: 'X', severity: 'bogus', title: 'X', evidence: 'e' });
assert.strictEqual(normalized.severity, 'informational');

const withSource = attachProvenance(base, {
  id: 'firewall.ipv6-coverage',
  confidence: 'high',
  remediation: 'review-only',
  source: { url: 'https://help.mikrotik.com/docs/spaces/ROS/pages/48660574/Filter', title: 'Filter', section: 'Filter rules' },
});
assert.strictEqual(withSource.provenance.knowledge_id, 'firewall.ipv6-coverage');
assert.strictEqual(withSource.provenance.source.url, 'https://help.mikrotik.com/docs/spaces/ROS/pages/48660574/Filter');

const sorted = sortFindings([
  createFinding({ id: 'LOW', severity: 'low', title: 'Low', evidence: 'e' }),
  createFinding({ id: 'CRIT', severity: 'critical', title: 'Critical', evidence: 'e' }),
  createFinding({ id: 'HIGH', severity: 'high', title: 'High', evidence: 'e' }),
]);
assert.deepStrictEqual(sorted.map(f => f.id), ['CRIT', 'HIGH', 'LOW']);

assert.deepStrictEqual(summarizeFindings(sorted), {
  findings: 3, critical: 1, high: 1, medium: 0, low: 1, informational: 0,
});

assert.strictEqual(validateFinding(base).valid, true);
assert.strictEqual(validateFinding({}).valid, false);

console.log('finding-engine tests passed');
