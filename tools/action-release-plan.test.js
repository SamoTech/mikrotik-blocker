'use strict';

const assert = require('node:assert/strict');
const { calculateReleasePlan, releaseBumpForCommit } = require('./action-release-plan');

assert.equal(releaseBumpForCommit({ subject: 'fix(action): handle unreadable exports', body: '' }), 'patch');
assert.equal(releaseBumpForCommit({ subject: 'perf(action): reduce report overhead', body: '' }), 'patch');
assert.equal(releaseBumpForCommit({ subject: 'feat(action): add JSON report output', body: '' }), 'minor');
assert.equal(releaseBumpForCommit({ subject: 'feat(action)!: change input contract', body: '' }), 'major');
assert.equal(releaseBumpForCommit({ subject: 'fix(action): change input contract', body: 'BREAKING CHANGE: the input contract changed.' }), 'major');
assert.equal(releaseBumpForCommit({ subject: 'docs(action): clarify usage', body: '' }), null);
assert.equal(releaseBumpForCommit({ subject: 'test(action): add regression case', body: '' }), null);
assert.equal(releaseBumpForCommit({ subject: 'fix(api): resolve endpoint issue', body: '' }), null);

assert.deepEqual(
  calculateReleasePlan('v1.0.0', [{ subject: 'fix(action): handle unreadable exports', body: '' }]),
  { release: true, lastTag: 'v1.0.0', nextTag: 'v1.0.1', bump: 'patch', commits: ['fix(action): handle unreadable exports'] }
);
assert.equal(calculateReleasePlan('v1.0.0', [{ subject: 'feat(action): add output', body: '' }]).nextTag, 'v1.1.0');
assert.equal(calculateReleasePlan('v1.0.0', [{ subject: 'feat(action)!: breaking change', body: '' }]).nextTag, 'v2.0.0');
assert.equal(calculateReleasePlan('v1.0.0', [
  { subject: 'fix(action): patch', body: '' },
  { subject: 'feat(action): feature', body: '' },
]).nextTag, 'v1.1.0');
assert.deepEqual(
  calculateReleasePlan('v1.0.0', [
    { subject: 'docs(action): clarify usage', body: '' },
    { subject: 'test(action): add regression case', body: '' },
    { subject: 'chore: update tooling', body: '' },
  ]),
  { release: false, lastTag: 'v1.0.0', nextTag: null, bump: null, commits: [] }
);
assert.throws(() => calculateReleasePlan(null, []), /No existing stable/);

console.log('Action release planner tests passed.');
