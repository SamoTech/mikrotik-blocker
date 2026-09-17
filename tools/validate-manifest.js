#!/usr/bin/env node
'use strict';
const fs = require('fs');

function validate(m) {
  const errors = [];
  const required = ['schema_version','intent','target','evidence','coverage','risk','routeros','policy','rollback','provenance'];
  for (const key of required) if (!(key in m)) errors.push(`missing ${key}`);
  if (m.schema_version !== '1.0') errors.push('schema_version must be 1.0');
  if (m.intent && !['block_service','block_domain','block_category','harden_dns','apply_recipe','diagnose_router'].includes(m.intent)) errors.push('invalid intent');
  if (m.risk && !['low','medium','high','critical'].includes(m.risk.level)) errors.push('invalid risk.level');
  if (m.coverage && (m.coverage.confidence != null) && (m.coverage.confidence < 0 || m.coverage.confidence > 1)) errors.push('coverage.confidence must be 0..1');
  if (m.policy && !['address_list','raw','filter','layer7','dns','combined'].includes(m.policy.strategy)) errors.push('invalid policy.strategy');
  if (m.rollback && m.rollback.supported !== true) errors.push('rollback.supported must be true');
  if (m.provenance && !m.provenance.generated_at) errors.push('provenance.generated_at is required');
  return { valid: errors.length === 0, errors };
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node tools/validate-manifest.js <manifest.json>'); process.exit(2); }
  const result = validate(JSON.parse(fs.readFileSync(file, 'utf8')));
  console.log(result.valid ? 'Policy manifest: valid' : `Policy manifest: invalid\n${result.errors.map(e => `- ${e}`).join('\n')}`);
  process.exit(result.valid ? 0 : 1);
}
module.exports = { validate };
