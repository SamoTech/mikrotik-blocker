'use strict';

const crypto = require('crypto');
const { redactSecrets } = require('./routeros-snapshot');

const SCHEMA_VERSION = '1.0.0';
const DEFAULT_TIMEOUT_MS = 5000;
const READ_ONLY_METHODS = new Set(['GET']);
const MUTATION_OVERRIDE_HEADERS = new Set(['x-http-method-override','x-http-method','x-method-override']);

function sanitizeBaseUrl(value) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('Router URL is required.');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Router URL must use HTTP or HTTPS.');
  if (url.username || url.password) throw new Error('Router URL must not contain embedded credentials.');
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

function normalizeResponse(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  return value == null ? [] : [value];
}

async function requestReadOnly(options, path, requestOptions = {}) {
  const base = sanitizeBaseUrl(options.baseUrl);
  const relative = String(path || '').replace(/^\/+/, '');
  if (!relative) throw new Error('RouterOS REST path is required.');
  if (relative.includes('..')) throw new Error('RouterOS REST path traversal is not allowed.');

  const url = new URL('/rest/' + relative, base.origin + base.pathname + '/');
  const method = String(requestOptions.method || 'GET').toUpperCase();
  if (!READ_ONLY_METHODS.has(method)) throw new Error('Only GET is permitted by the read-only connector.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const headers = { Accept: 'application/json' };\n    for (const [key, value] of Object.entries(options.headers || {})) {\n      const normalized = String(key).toLowerCase();\n      if (MUTATION_OVERRIDE_HEADERS.has(normalized)) throw new Error('HTTP method override headers are forbidden by the read-only connector.');\n      headers[key] = value;\n    }
    const response = await options.fetch(url, { method, headers, signal: controller.signal });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (_) { body = text; }
    if (!response.ok) throw new Error('RouterOS REST request failed with HTTP ' + response.status + '.');
    return { path: '/' + relative, status: response.status, data: normalizeResponse(body) };
  } catch (error) {
    if (error && error.name === 'AbortError') throw new Error('RouterOS REST request timed out.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverCapabilities(options) {
  const inspection = await inspectRouter(options);
  const probes = ['system/package', 'interface', 'ip/address', 'ip/route', 'ip/firewall/filter', 'ip/firewall/nat', 'ip/service'];
  const results = {};
  for (const path of probes) {
    try { results[path] = await requestReadOnly(options, path); }
    catch (error) { results[path] = { path: '/' + path, status: null, data: [], error: error.message }; }
  }

  const available = {};
  for (const path of probes) available[path] = results[path].status === 200;

  return {
    ...inspection,
    capabilities: { ...inspection.capabilities, discovered: available },
    capability_probe_count: probes.length
  };
}

function fingerprintPayload(payload) {
  return {
    schema_version: payload.schema_version,
    mode: payload.mode,
    mutation_performed: payload.mutation_performed,
    router_base_url: payload.router_base_url,
    resources: redactSecrets(payload.resources),
    errors: redactSecrets(payload.errors)
  };
}

async function retrieveSnapshot(options, paths) {
  if (!options || typeof options.fetch !== 'function') throw new TypeError('A fetch implementation is required.');

  const selected = Array.isArray(paths) && paths.length
    ? paths
    : ['system/resource', 'system/package', 'interface', 'ip/address', 'ip/route',
       'ip/firewall/filter', 'ip/firewall/nat', 'ip/service'];

  const resources = {};
  const errors = [];
  for (const path of selected) {
    try { resources[path.replace(/^\/+/, '')] = await requestReadOnly(options, path); }
    catch (error) { errors.push({ path: '/' + String(path).replace(/^\/+/, ''), error: error.message }); }
  }

  const payload = {
    schema_version: SCHEMA_VERSION,
    mode: 'read-only',
    mutation_performed: false,
    router_base_url: sanitizeBaseUrl(options.baseUrl).origin,
    captured_at: new Date().toISOString(),
    resources: redactSecrets(resources),
    errors: redactSecrets(errors)
  };

  payload.content_fingerprint = crypto.createHash('sha256')
    .update(JSON.stringify(fingerprintPayload(payload)), 'utf8')
    .digest('hex');

  return payload;
}

async function inspectRouter(options) {
  if (!options || typeof options.fetch !== 'function') throw new TypeError('A fetch implementation is required.');

  const resource = await requestReadOnly(options, 'system/resource');
  const first = resource.data[0] || {};

  return {
    schema_version: SCHEMA_VERSION,
    mode: 'read-only',
    mutation_performed: false,
    router: {
      base_url: sanitizeBaseUrl(options.baseUrl).origin,
      identity: typeof first['board-name'] === 'string' ? first['board-name'] : null,
      architecture: first.architecture || first['architecture-name'] || null,
      version: typeof first.version === 'string' ? first.version : null,
      platform: typeof first.platform === 'string' ? first.platform : null
    },
    capabilities: { read_only: true, rest_api: true, write_operations: false, arbitrary_commands: false },
    resources: { system_resource: redactSecrets(resource.data) }
  };
}

module.exports = { SCHEMA_VERSION, READ_ONLY_METHODS, sanitizeBaseUrl, requestReadOnly, inspectRouter, discoverCapabilities, retrieveSnapshot };
