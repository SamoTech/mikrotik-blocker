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
  [/^\/system\/ntp(\s|$)/, 'system.ntp'],
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

function inferKind(path) {
  for (const [pattern, kind] of KIND_MAP) if (pattern.test(path)) return kind;
  return null;
}

function resourceIdentity(kind, attrs, index) {
  const preferred = attrs['.id'] || attrs.id || attrs.name || attrs['list'] || attrs['chain'];
  if (preferred) return `${kind}:${String(preferred)}`;
  const stable = { kind, attributes: canonicalValue(attrs) };
  return `${kind}:sha256:${sha256(JSON.stringify(stable)).slice(0, 24)}:${index}`;
}

function normalize(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new TypeError('Parser result is required');
  const commands = Array.isArray(parsed.commands) ? parsed.commands : [];
  const resources = [];
  const diagnostics = Array.isArray(parsed.diagnostics) ? [...parsed.diagnostics] : [];
  const inventory = {};

  commands.forEach((command, index) => {
    const path = command.path || command.section || '/';
    const kind = inferKind(path);
    const attrs = canonicalValue(command.attributes || command.attrs || {});
    const source = {
      commandIndex: index,
      line: command.line || command.lineNumber || null,
      endLine: command.endLine || command.line || command.lineNumber || null,
      raw: command.raw || null,
    };

    if (!kind) {
      resources.push({
        kind: 'opaque', path, identity: `opaque:${index}`, attributes: attrs,
        source, status: 'opaque', order: index,
      });
      return;
    }

    const resource = {
      kind,
      path,
      identity: resourceIdentity(kind, attrs, index),
      attributes: attrs,
      source,
      status: 'recognized',
      order: index,
    };
    if (!ORDER_SENSITIVE.has(kind)) delete resource.order;
    resources.push(resource);
    inventory[kind] = (inventory[kind] || 0) + 1;
  });

  const semantic = {
    schemaVersion: '1.0.0',
    parser: parsed.parser || { name: 'routeros-parser' },
    routeros: parsed.routeros || parsed.version || null,
    source: parsed.source || null,
    resources,
    inventory,
    diagnostics,
  };

  semantic.fingerprint = sha256(JSON.stringify(canonicalValue({
    schemaVersion: semantic.schemaVersion,
    routeros: semantic.routeros,
    resources,
    diagnostics,
  })));
  return semantic;
}

module.exports = { normalize, inferKind, resourceIdentity, canonicalValue, sha256 };
