#!/usr/bin/env node
'use strict';

/**
 * Safe remediation layer for Firewall Doctor.
 *
 * It never modifies a router and never mutates the source export. It creates
 * an explicit review patch plus a rollback script for narrowly-scoped fixes.
 */

const { analyze } = require('./firewall-doctor');

const MARKER = '# MikroTik Blocker — Firewall Doctor remediation';

function remediationFor(finding) {
  switch (finding.id) {
    case 'IPV6_COVERAGE':
      return {
        id: 'add-ipv6-review-guard',
        title: 'Add an IPv6 review guard',
        rationale: 'The export has IPv4 firewall filtering but no IPv6 firewall filter section.',
        patch: [
          MARKER,
          '# REVIEW REQUIRED: confirm the intended IPv6 policy before applying.',
          '/ipv6 firewall filter',
          'add chain=forward action=drop dst-address-list=blocked comment="MikroTik Blocker: IPv6 review guard"',
        ].join('\n'),
        rollback: [
          '# MikroTik Blocker — rollback IPv6 review guard',
          '/ipv6 firewall filter remove [find comment="MikroTik Blocker: IPv6 review guard"]',
        ].join('\n'),
        safety: 'review_required',
      };
    case 'STATEFUL_BASELINE':
      return {
        id: 'add-stateful-review-guard',
        title: 'Add an established/related review rule',
        rationale: 'No established/related IPv4 baseline was detected.',
        patch: [
          MARKER,
          '# REVIEW REQUIRED: place this rule according to the router policy.',
          '/ip firewall filter',
          'add chain=forward action=accept connection-state=established,related comment="MikroTik Blocker: stateful baseline"',
        ].join('\n'),
        rollback: [
          '# MikroTik Blocker — rollback stateful baseline',
          '/ip firewall filter remove [find comment="MikroTik Blocker: stateful baseline"]',
        ].join('\n'),
        safety: 'review_required',
      };
    case 'MGMT_REVIEW':
      return {
        id: 'management-review-only',
        title: 'Generate a management-access review note',
        rationale: 'The analyzer did not find an obvious protection rule for common management ports.',
        patch: [
          MARKER,
          '# REVIEW ONLY — no automatic management rule is generated.',
          '# Restrict WinBox/SSH/API access to trusted source addresses/interfaces.',
          '# Verify the existing policy before changing management access.',
        ].join('\n'),
        rollback: '# No automatic rollback required: review-only recommendation.',
        safety: 'review_only',
      };
    case 'LAYER7_COST':
      return {
        id: 'layer7-review-only',
        title: 'Generate a Layer7 performance review note',
        rationale: 'Multiple Layer7 matchers were detected.',
        patch: [
          MARKER,
          '# REVIEW ONLY — no Layer7 rules are removed automatically.',
          '# Prefer address-list/RAW classification where practical.',
          '# Measure router CPU before and after any Layer7 change.',
        ].join('\n'),
        rollback: '# No automatic rollback required: review-only recommendation.',
        safety: 'review_only',
      };
    default:
      return null;
  }
}

function buildRemediation(config) {
  const analysis = analyze(config);
  const remediations = analysis.findings.map(remediationFor).filter(Boolean);
  const patch = remediations.map(r => `# ${r.title}\n${r.patch}`).join('\n\n');
  const rollback = remediations.map(r => r.rollback).join('\n\n');

  return {
    schema_version: '1.0',
    source: 'Firewall Doctor',
    safe_mode: true,
    summary: {
      findings: analysis.summary.findings,
      proposed_changes: remediations.filter(r => r.safety === 'review_required').length,
      review_only: remediations.filter(r => r.safety === 'review_only').length,
    },
    analysis,
    remediations,
    patch: patch || '# No remediation patch generated.',
    rollback: rollback || '# No rollback generated.',
    instructions: [
      'Export and back up the router configuration first.',
      'Review every generated command before applying it.',
      'Apply the patch manually or through your own controlled deployment process.',
      'Keep the rollback script with the change record.',
    ],
  };
}

module.exports = { buildRemediation, remediationFor };
