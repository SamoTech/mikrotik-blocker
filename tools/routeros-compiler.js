#!/usr/bin/env node
'use strict';

/**
 * Deterministic RouterOS configuration compiler.
 *
 * The compiler turns an explicit desired-state document into canonical RSC
 * commands and a validation report. It does not connect to or mutate routers.
 * Unknown/unsupported resource kinds fail closed.
 */

const { canonicalPath, canonicalValue } = require('./routeros-semantic');

const SUPPORTED = new Set([
  'system.identity',
  'interface',
  'ip.address',
  'ip.dhcp-client',
  'ip.dhcp-server',
  'ip.dns',
  'ip.route',
  'firewall.filter',
  'firewall.nat',
  'firewall.mangle',
  'firewall.raw',
  'firewall.address-list',
  'ipv6.address',
  'ipv6.route',
  'ipv6.firewall.filter',
  'ipv6.firewall.address-list',
]);

const VERB_ORDER = { add: 1, set: 2, enable: 3, disable: 4, remove: 5 };

function assertDesiredState(desired) {
  if (!desired || typeof desired !== 'object') throw new TypeError('Desired state must be an object');
  if (!Array.isArray(desired.resources)) throw new TypeError('Desired state resources must be an array');
  if (desired.routeros && typeof desired.routeros !== 'object') throw new TypeError('Desired state routeros must be an object');
}

function escapeValue(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./,:@+-]+$/.test(text)) return text;
  return '"' + text.replace(/\/g, '\\').replace(/"/g, '\"') + '"';
}

function renderAttributes(attributes = {}) {
  return Object.keys(attributes).sort().map(key => {
    if (!/^[A-Za-z0-9_.-]+$/.test(key)) throw new Error(`Unsupported RouterOS attribute name: ${key}`);
    return `${key}=${escapeValue(attributes[key])}`;
  }).join(' ');
}

function normalizeResource(resource, index) {
  if (!resource || typeof resource !== 'object') throw new TypeError(`Resource ${index} must be an object`);
  const kind = String(resource.kind || '').trim();
  if (!SUPPORTED.has(kind)) throw new Error(`Unsupported desired-state resource kind: ${kind || '(missing)'}`);
  const path = canonicalPath(resource.path);
  const attributes = canonicalValue(resource.attributes || {});
  const state = resource.state || 'present';
  if (!['present', 'absent'].includes(state)) throw new Error(`Unsupported resource state for ${kind}: ${state}`);
  return { kind, path, attributes, state, order: Number.isInteger(resource.order) ? resource.order : index };
}

function compile(desired, options = {}) {
  assertDesiredState(desired);
  const resources = desired.resources.map(normalizeResource);
  const errors = [];
  const warnings = [];
  const seen = new Set();

  for (const resource of resources) {
    const identity = resource.attributes['.id'] || resource.attributes.id || resource.attributes.name ||
      resource.attributes.address || resource.attributes.list || resource.attributes.chain;
    if (resource.state === 'present' && !identity && !resource.attributes.chain && !resource.attributes.address) {
      warnings.push(`${resource.kind} has no explicit identity; generation is deterministic but reconciliation may require a semantic diff.`);
    }
    const duplicateKey = `${resource.kind}|${JSON.stringify(resource.attributes)}|${resource.state}`;
    if (seen.has(duplicateKey)) warnings.push(`Duplicate desired resource: ${resource.kind}`);
    seen.add(duplicateKey);
  }

  const grouped = new Map();
  for (const resource of resources) {
    if (!grouped.has(resource.path)) grouped.set(resource.path, []);
    grouped.get(resource.path).push(resource);
  }

  const lines = [];
  const sortedPaths = [...grouped.keys()].sort();
  for (const menuPath of sortedPaths) {
    lines.push(menuPath);
    const entries = grouped.get(menuPath).sort((a, b) =>
      (VERB_ORDER[a.state === 'absent' ? 'remove' : 'add'] - VERB_ORDER[b.state === 'absent' ? 'remove' : 'add']) ||
      (a.order - b.order) ||
      JSON.stringify(a.attributes).localeCompare(JSON.stringify(b.attributes))
    );
    for (const resource of entries) {
      const attrs = renderAttributes(resource.attributes);
      if (resource.state === 'absent') {
        if (!resource.attributes['.id']) {
          errors.push(`Cannot compile absent resource ${resource.kind} without .id.`);
          continue;
        }
        lines.push(`remove [find .id=${escapeValue(resource.attributes['.id'])}]`);
      } else {
        lines.push(`add${attrs ? ' ' + attrs : ''}`);
      }
    }
    lines.push('');
  }

  const output = lines.join('\n').trim() + (lines.length ? '\n' : '');
  return {
    schema_version: '1.0',
    compiler: { name: 'RouterOS Configuration Compiler', version: '1.0' },
    routeros: desired.routeros || null,
    input: { resources: resources.length },
    validation: { valid: errors.length === 0, errors, warnings },
    rsc: output,
    resources: resources.map(r => ({
      kind: r.kind, path: r.path, state: r.state, attributes: r.attributes, order: r.order,
    })),
    deterministic: true,
    dry_run: options.dry_run !== false,
  };
}

if (require.main === module) {
  const fs = require('fs');
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node tools/routeros-compiler.js <desired-state.json> [--json]');
    process.exit(2);
  }
  try {
    const result = compile(JSON.parse(fs.readFileSync(file, 'utf8')));
    console.log(process.argv.includes('--json') ? JSON.stringify(result, null, 2) : result.rsc);
    process.exit(result.validation.valid ? 0 : 1);
  } catch (error) {
    console.error(`Compiler error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { compile, assertDesiredState, escapeValue, renderAttributes, SUPPORTED };
