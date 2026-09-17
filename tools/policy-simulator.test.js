'use strict';
const assert = require('assert');
const { simulate } = require('./policy-simulator');
const result = simulate({
  target: 'example.com',
  evidence: { ipv4: ['203.0.113.10'], ipv6: [], cidrs: ['203.0.113.0/24'] },
  coverage: { ipv4: true, ipv6: false, layer7: false },
  risk: { level: 'medium', shared_infrastructure: true }
});
assert.strictEqual(result.estimated_scope.ipv4_addresses, 1);
assert.ok(result.warnings.some(w => w.includes('Shared infrastructure')));
console.log('Policy simulator tests passed');
