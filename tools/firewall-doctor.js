#!/usr/bin/env node
'use strict';

/**
 * MikroTik Firewall Doctor — dependency-free RouterOS export analyzer.
 * Safe by design: it reads an export and proposes findings only. It never
 * connects to a router and never mutates the supplied configuration.
 */

function sectionOf(line) {
  const m = line.match(/^\/([^\s]+)/);
  return m ? m[1] : null;
}

function parseAttrs(line) {
  const attrs = {};
  const re = /([\w-]+)=("(?:[^"\\]|\\.)*"|\S+)/g;
  let m;
  while ((m = re.exec(line))) attrs[m[1]] = m[2].replace(/^"|"$/g, '');
  return attrs;
}

function analyze(config) {
  const lines = String(config || '').split(/\r?\n/);
  let section = '';
  const findings = [];
  const rules = [];
  const addressLists = new Map();
  let hasIPv4 = false;
  let hasIPv6 = false;
  let hasEstablished = false;
  let hasManagementProtection = false;
  let layer7Count = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith('#')) continue;
    const newSection = sectionOf(raw);
    if (newSection) { section = newSection; continue; }
    const attrs = parseAttrs(raw);

    if (section === 'ip firewall filter') {
      hasIPv4 = true;
      if (/connection-state=(?:established|related)/.test(raw)) hasEstablished = true;
      if (attrs.action === 'drop' && (attrs['dst-port'] === '8291' || attrs['dst-port'] === '22' || attrs['dst-port'] === '8728' || attrs['dst-port'] === '8729')) hasManagementProtection = true;
      if (attrs['layer7-protocol']) layer7Count++;
      if (attrs.action || attrs.chain) rules.push({ family: 4, section, line: i + 1, attrs, raw });
    }
    if (section === 'ipv6 firewall filter') {
      hasIPv6 = true;
      if (attrs.action || attrs.chain) rules.push({ family: 6, section, line: i + 1, attrs, raw });
    }
    if (section === 'ip firewall address-list' || section === 'ipv6 firewall address-list') {
      const key = `${section}|${attrs.list || ''}|${attrs.address || ''}`;
      const count = addressLists.get(key) || 0;
      addressLists.set(key, count + 1);
    }
  }

  if (hasIPv4 && !hasIPv6) findings.push({ id: 'IPV6_COVERAGE', severity: 'high', title: 'IPv4 policy without IPv6 firewall coverage', evidence: 'An IPv4 firewall section was found but no IPv6 firewall filter section was detected.', fix: 'Mirror intentional blocking controls in /ipv6 firewall filter and review IPv6 address-list coverage.' });
  if (hasIPv4 && !hasEstablished) findings.push({ id: 'STATEFUL_BASELINE', severity: 'medium', title: 'No established/related baseline detected', evidence: 'No IPv4 filter rule matched connection-state=established or related.', fix: 'Review rule ordering and add an appropriate stateful baseline for your router design.' });
  if (layer7Count >= 3) findings.push({ id: 'LAYER7_COST', severity: 'medium', title: 'Multiple Layer7 rules detected', evidence: `${layer7Count} Layer7 matchers were detected.`, fix: 'Prefer address-list/RAW classification where possible; keep Layer7 narrowly scoped because it can be expensive.' });
  if (hasIPv4 && !hasManagementProtection) findings.push({ id: 'MGMT_REVIEW', severity: 'medium', title: 'Management access protection needs review', evidence: 'No obvious drop rule for common management ports was detected.', fix: 'Verify that WinBox/SSH/API management is restricted to trusted source addresses or interfaces.' });

  for (const [key, count] of addressLists) {
    if (count > 1) {
      const [, list, address] = key.split('|');
      findings.push({ id: 'DUPLICATE_ADDRESS', severity: 'low', title: 'Duplicate address-list entry', evidence: `${list} contains ${address} ${count} times.`, fix: 'Deduplicate generated/static entries to reduce configuration noise.' });
    }
  }

  // Conservative shadow detection: only flag an exact same match key after a terminal action.
  const terminal = new Set();
  for (const rule of rules) {
    const a = rule.attrs;
    const key = ['chain', 'src-address', 'dst-address', 'src-address-list', 'dst-address-list', 'protocol', 'dst-port', 'in-interface', 'out-interface'].map(k => `${k}=${a[k] || ''}`).join('&');
    if (terminal.has(key)) findings.push({ id: 'SHADOWED_RULE', severity: 'medium', title: 'Potentially shadowed duplicate rule', evidence: `Rule at line ${rule.line} repeats an earlier match signature.`, fix: 'Review rule order and remove or intentionally reorder duplicate rules.' });
    if (a.action === 'drop' || a.action === 'reject') terminal.add(key);
  }

  const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
  findings.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  return {
    schema_version: '1.0',
    summary: { findings: findings.length, critical: findings.filter(f => f.severity === 'critical').length, high: findings.filter(f => f.severity === 'high').length, medium: findings.filter(f => f.severity === 'medium').length, low: findings.filter(f => f.severity === 'low').length },
    coverage: { ipv4: hasIPv4, ipv6: hasIPv6 },
    findings,
  };
}

function formatReport(result) {
  const lines = [`Firewall Doctor — ${result.summary.findings} finding(s)`, `Coverage: IPv4=${result.coverage.ipv4 ? 'yes' : 'no'} IPv6=${result.coverage.ipv6 ? 'yes' : 'no'}`, ''];
  if (!result.findings.length) lines.push('No findings. This is not a proof of a secure configuration; review remains necessary.');
  for (const f of result.findings) lines.push(`[${f.severity.toUpperCase()}] ${f.title}\n  Evidence: ${f.evidence}\n  Fix: ${f.fix}\n`);
  return lines.join('\n');
}

if (require.main === module) {
  const fs = require('fs');
  const file = process.argv[2];
  if (!file) { console.error('Usage: node tools/firewall-doctor.js <router-export.rsc> [--json]'); process.exit(2); }
  const result = analyze(fs.readFileSync(file, 'utf8'));
  console.log(process.argv.includes('--json') ? JSON.stringify(result, null, 2) : formatReport(result));
  process.exit(result.summary.critical || result.summary.high ? 1 : 0);
}

module.exports = { analyze, formatReport, parseAttrs };
