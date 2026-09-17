#!/usr/bin/env node
'use strict';

/** Offline scope estimator. It does not claim to predict application behavior.
 * Input: Policy Manifest JSON. Output: deterministic coverage/scope warnings.
 */
const fs = require('fs');

function simulate(manifest) {
  const e = manifest.evidence || {};
  const cidrs = e.cidrs || [];
  const v4 = e.ipv4 || [];
  const v6 = e.ipv6 || [];
  const warnings = [];
  const risk = manifest.risk || {};
  if (!manifest.coverage?.ipv6 && v6.length) warnings.push('IPv6 evidence exists but coverage is disabled.');
  if (risk.shared_infrastructure) warnings.push('Shared infrastructure is marked; collateral impact requires review.');
  if (cidrs.some(c => /\/(?:[0-9]|1[0-9]|2[0-3])$/.test(c))) warnings.push('At least one broad CIDR is present; review scope before deployment.');
  if (manifest.coverage?.layer7) warnings.push('Layer7 is enabled; validate CPU/performance impact on the target router.');
  return {
    schema_version: '1.0',
    target: manifest.target,
    estimated_scope: { ipv4_addresses: v4.length, ipv6_addresses: v6.length, cidrs: cidrs.length },
    coverage: manifest.coverage || {},
    risk: risk.level || 'unknown',
    warnings,
    disclaimer: 'This is a static scope estimator, not a packet-level or application-level traffic simulator.'
  };
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node tools/policy-simulator.js <manifest.json>'); process.exit(2); }
  console.log(JSON.stringify(simulate(JSON.parse(fs.readFileSync(file, 'utf8'))), null, 2));
}
module.exports = { simulate };
