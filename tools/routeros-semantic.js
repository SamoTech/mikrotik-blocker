'use strict';

/**
 * Semantic normalization for the deterministic RouterOS parser.
 *
 * This layer intentionally does not execute or rewrite RouterOS commands.
 * Unknown syntax remains represented by the parser and is returned as opaque.
 */

const crypto = require('crypto');

const KIND_MAP = [
  [/^\/system\/identity$/, 'system.identity'],
  [/^\/system\/resource$/, 'system.resource'],
  [/^\/system\/package$/, 'system.package'],
  [/^\/system\/clock$/, 'system.clock'],
  [/^\/system\/ntp(?:\/|$)/, 'system.ntp'],
  [/^\/system\/script$/, 'system.script'],
  [/^\/system\/scheduler$/, 'system.scheduler'],
  [/^\/interface(?:\/|$)/, 'interface'],
  [/^\/ip\/address$/, 'ip.address'],
  [/^\/ip\/dhcp-client$/, 'ip.dhcp-client'],
  [/^\/ip\/dhcp-server$/, 'ip.dhcp-server'],
  [/^\/ip\/dns$/, 'ip.dns'],
  [/^\/ip\/route$/, 'ip.route'],
  [/^\/ip\/firewall\/filter$/, 'firewall.filter'],
  [/^\/ip\/firewall\/nat$/, 'firewall.nat'],
  [/^\/ip\/firewall\/mangle$/, 'firewall.mangle'],
  [/^\/ip\/firewall\/raw$/, 'firewall.raw'],
  [/^\/ip\/firewall\/address-list$/, 'firewall.address-list'],
  [/^\/ip\/firewall\/service-port$/, 'firewall.service-port'],
  [/^\/ipv6\/address$/, 'ipv6.address'],
  [/^\/ipv6\/route$/, 'ipv6.route'],
  [/^\/ipv6\/firewall\/filter$/, 'ipv6.firewall.filter'],
  [/^\/ipv6\/firewall\/address-list$/, 'ipv6.firewall.address-list'],
  [/^\/routing\//, 'routing'],
  [/^\/user$/, 'user'],
  [/^\/user\/group$/, 'user.group'],
  [/^\/certificate$/, 'certificate'],
  [/^\/ppp\//, 'ppp'],
  [/^\/queue\//, 'queue'],
];

const ORDER_SENSITIVE = new Set([
  'firewall.filter', 'firewall.nat', 'firewall.mangle', 'firewall.raw',
  'ipv6.firewall.filter', 'routing'
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = canonicalValue(value[key]);
      return out;
    }, {});
  }
  return value;
}

function canonicalPath(value) {
  return String(value || '/').trim().replace(/\s+/g, '/');
}

function inferKind(path) {
  const normalizedPath = canonicalPath(path);
  for (const [pattern, kind] of KIND_MAP) if (pattern.test(normalizedPath)) return kind;
  return null;
}

function resourceIdentity(kind, attrs) {
  const preferred = attrs['.id'] || attrs.id || attrs.name || attrs.address || attrs['list'] || attrs['chain'];
  if (preferred) return `${kind}:${String(preferred)}`;
  const stable = { kind, attributes: canonicalValue(attrs) };
  return `${kind}:sha256:${sha256(JSON.stringify(stable)).slice(0, 24)}`;
}

function normalize(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new TypeError('Parser result is required');

  const entries = Array.isArray(parsed.resources)
    ? parsed.resources
    : Array.isArray(parsed.commands)
      ? parsed.commands
      : [];

  const resources = [];
  const diagnostics = Array.isArray(parsed.diagnostics) ? [...parsed.diagnostics] : [];
  const inventory = {};
  const identityCounts = new Map();

  entries.forEach((command, index) => {
    const originalPath = command.path || command.section || '/';
    const normalizedPath = canonicalPath(originalPath);
    const inferredKind = inferKind(originalPath);
    const kind = inferredKind || command.kind || 'opaque';
    const attrs = canonicalValue(command.attributes || command.attrs || {});
    const baseIdentity = inferredKind
      ? resourceIdentity(kind, attrs)
      : (command.identity || `opaque:${index}`);
    const occurrence = identityCounts.get(baseIdentity) || 0;
    identityCounts.set(baseIdentity, occurrence + 1);
    const identity = occurrence === 0 ? baseIdentity : `${baseIdentity}#${occurrence + 1}`;

    const source = {
      commandIndex: index,
      line: command.line || command.lineNumber || null,
      endLine: command.endLine || command.line || command.lineNumber || null,
      raw: command.raw || null,
    };

    const resource = {
      kind,
      path: normalizedPath,
      originalPath,
      identity,
      attributes: attrs,
      source,
      status: inferredKind ? 'recognized' : 'opaque',
    };

    if (command.verb) resource.verb = command.verb;
    if (ORDER_SENSITIVE.has(kind) || kind === 'opaque') resource.order = index;

    resources.push(resource);
    inventory[kind] = (inventory[kind] || 0) + 1;
  });

  const semantic = {
    schemaVersion: '1.0.0',
    parser: parsed.parser || { name: 'routeros-parser', schemaVersion: parsed.schemaVersion || null },
    routeros: parsed.routeros || parsed.version || null,
    source: parsed.source || null,
    resources,
    inventory,
    diagnostics,
  };

  semantic.statistics = {
    resourceCount: resources.length,
    recognizedCount: resources.filter((resource) => resource.status === 'recognized').length,
    opaqueCount: resources.filter((resource) => resource.status === 'opaque').length,
  };

  semantic.fingerprint = sha256(JSON.stringify(canonicalValue({
    schemaVersion: semantic.schemaVersion,
    routeros: semantic.routeros,
    resources,
    diagnostics,
  })));

  return semantic;
}

module.exports = { normalize, inferKind, resourceIdentity, canonicalValue, canonicalPath, sha256 };
