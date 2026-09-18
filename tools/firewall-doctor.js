#!/usr/bin/env node
'use strict';

/**
 * MikroTik RouterOS Doctor — semantic configuration analyzer.
 *
 * The deterministic RouterOS parser owns syntax extraction. The semantic model
 * owns normalized resources. Doctor consumes that model and attaches official
 * knowledge provenance where a finding has a documented basis.
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('./routeros-parser');
const { normalize } = require('./routeros-semantic');
const { createFinding, attachProvenance, sortFindings, summarizeFindings } = require('./finding-engine');

const KNOWLEDGE = new Map([
  ['firewall.filter-order', require('../docs/knowledge-base/records/firewall-filter-order.json')],
  ['firewall.ipv6-coverage', require('../docs/knowledge-base/records/firewall-ipv6-coverage.json')],
]);

function parseAttrs(line) {
  const attrs = {};
  const re = /([\w-]+)=("(?:[^"\\]|\\.)*"|\S+)/g;
  let m;
  while ((m = re.exec(line))) attrs[m[1]] = m[2].replace(/^"|"$/g, '');
  return attrs;
}

function knowledgeFor(id) {
  return KNOWLEDGE.get(id) || null;
}

function withKnowledge(finding, knowledgeId) {
  const normalized = createFinding(finding);
  return attachProvenance(normalized, knowledgeFor(knowledgeId));
}

function analyzeModel(model) {
  if (!model || !Array.isArray(model.resources)) throw new TypeError('Semantic RouterOS model is required');

  const findings = [];
  const rules = [];
  const addressLists = new Map();
  const ipv4Rules = model.resources.filter(r => r.kind === 'firewall.filter');
  const ipv6Rules = model.resources.filter(r => r.kind === 'ipv6.firewall.filter');
  const ipv4Lists = model.resources.filter(r => r.kind === 'firewall.address-list');
  const ipv6Lists = model.resources.filter(r => r.kind === 'ipv6.firewall.address-list');

  const hasIPv4 = ipv4Rules.length > 0;
  const hasIPv6 = ipv6Rules.length > 0;
  let hasEstablished = false;
  let hasManagementProtection = false;
  let layer7Count = 0;

  for (const resource of [...ipv4Rules, ...ipv6Rules]) {
    const attrs = resource.attributes || {};
    const family = resource.kind === 'firewall.filter' ? 4 : 6;
    if (family === 4 && attrs['connection-state'] && /(?:^|,)established(?:,|$)|(?:^|,)related(?:,|$)/.test(attrs['connection-state'])) hasEstablished = true;
    if (family === 4 && attrs.action === 'drop' && ['8291', '22', '8728', '8729'].includes(attrs['dst-port'])) hasManagementProtection = true;
    if (family === 4 && attrs['layer7-protocol']) layer7Count++;
    rules.push({ family, resource });
  }

  for (const resource of [...ipv4Lists, ...ipv6Lists]) {
    const attrs = resource.attributes || {};
    const family = resource.kind === 'firewall.address-list' ? 4 : 6;
    const key = `${family}|${attrs.list || ''}|${attrs.address || ''}`;
    addressLists.set(key, (addressLists.get(key) || 0) + 1);
  }

  if (hasIPv4 && !hasIPv6) {
    findings.push(withKnowledge({
      id: 'IPV6_COVERAGE', severity: 'high', title: 'IPv4 policy without IPv6 firewall coverage',
      evidence: 'The semantic model contains IPv4 firewall filter resources but no IPv6 firewall filter resources.',
      fix: 'Review the intended IPv6 design and mirror required controls in /ipv6 firewall filter when IPv6 is enabled.',
    }, 'firewall.ipv6-coverage'));
  }
  if (hasIPv4 && !hasEstablished) findings.push(withKnowledge({ id: 'STATEFUL_BASELINE', severity: 'medium', title: 'No established/related baseline detected', evidence: 'No IPv4 filter resource matched connection-state=established or related.', fix: 'Review rule ordering and add an appropriate stateful baseline for your router design.' }, 'firewall.filter-order'));
  if (layer7Count >= 3) findings.push({ id: 'LAYER7_COST', severity: 'medium', title: 'Multiple Layer7 rules detected', evidence: `${layer7Count} Layer7 matchers were detected in semantic firewall resources.`, fix: 'Prefer address-list/RAW classification where possible; keep Layer7 narrowly scoped because it can be expensive.' });
  if (hasIPv4 && !hasManagementProtection) findings.push({ id: 'MGMT_REVIEW', severity: 'medium', title: 'Management access protection needs review', evidence: 'No obvious drop rule for common management ports was detected in semantic IPv4 filter resources.', fix: 'Verify that WinBox/SSH/API management is restricted to trusted source addresses or interfaces.' });

  for (const [key, count] of addressLists) {
    if (count > 1) {
      const [, list, address] = key.split('|');
      findings.push({ id: 'DUPLICATE_ADDRESS', severity: 'low', title: 'Duplicate address-list entry', evidence: `${list} contains ${address} ${count} times.`, fix: 'Deduplicate generated/static entries to reduce configuration noise.' });
    }
  }

  const terminal = new Set();
  for (const rule of rules) {
    const a = rule.resource.attributes || {};
    const key = ['chain', 'src-address', 'dst-address', 'src-address-list', 'dst-address-list', 'protocol', 'dst-port', 'in-interface', 'out-interface'].map(k => `${k}=${a[k] || ''}`).join('&');
    if (terminal.has(key)) findings.push(withKnowledge({ id: 'SHADOWED_RULE', severity: 'medium', title: 'Potentially shadowed duplicate rule', evidence: `Resource ${rule.resource.identity} repeats an earlier match signature at source line ${rule.resource.line || '?'}.`, fix: 'Review rule order and remove or intentionally reorder duplicate rules.' }, 'firewall.filter-order'));
    if (a.action === 'drop' || a.action === 'reject') terminal.add(key);
  }

  const normalizedFindings = sortFindings(findings.map(f => createFinding({\n    ...f,\n    engine: { name: 'RouterOS Doctor', model: model.schemaVersion },\n    routeros: model.routeros,\n  })));

  return {
    schema_version: '2.0',
    engine: { name: 'RouterOS Doctor', model: model.schemaVersion },
    routeros: model.routeros,
    source: model.source,
    summary: {
      ...summarizeFindings(normalizedFindings),
    },
    coverage: { ipv4: hasIPv4, ipv6: hasIPv6, ipv4_rules: ipv4Rules.length, ipv6_rules: ipv6Rules.length, ipv4_address_lists: ipv4Lists.length, ipv6_address_lists: ipv6Lists.length },
    model: { fingerprint: model.fingerprint, resources: model.statistics },
    findings: normalizedFindings,
  };
}

function analyze(config) {
  const parsed = parse(String(config || ''));
  const model = normalize(parsed);
  return analyzeModel(model);
}

function formatReport(result) {
  const lines = [`RouterOS Doctor — ${result.summary.findings} finding(s)`, `Coverage: IPv4=${result.coverage.ipv4 ? 'yes' : 'no'} IPv6=${result.coverage.ipv6 ? 'yes' : 'no'}`, `Model: ${result.model.fingerprint}`, ''];
  if (!result.findings.length) lines.push('No findings. This is not a proof of a secure configuration; review remains necessary.');
  for (const f of result.findings) {
    lines.push(`[${f.severity.toUpperCase()}] ${f.title}`);
    lines.push(`  Evidence: ${f.evidence}`);
    if (f.provenance) lines.push(`  Source: ${f.provenance.source.title} — ${f.provenance.source.section}`);
    lines.push(`  Fix: ${f.fix}`, '');
  }
  return lines.join('\n');
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node tools/firewall-doctor.js <router-export.rsc> [--json]'); process.exit(2); }
  const result = analyze(fs.readFileSync(path.resolve(file), 'utf8'));
  console.log(process.argv.includes('--json') ? JSON.stringify(result, null, 2) : formatReport(result));
  process.exit(result.summary.critical || result.summary.high ? 1 : 0);
}

module.exports = { analyze, analyzeModel, formatReport, parseAttrs, knowledgeFor };
