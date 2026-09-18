'use strict';

/**
 * Read-only RouterOS REST connector foundation.
 * GET only; no mutation, arbitrary commands, or credential persistence.
 */

const SCHEMA_VERSION = '1.0.0';
const DEFAULT_TIMEOUT_MS = 5000;
const READ_ONLY_METHODS = new Set(['GET']);

function sanitizeBaseUrl(value) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('Router URL is required.');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Router URL must use HTTP or HTTPS.');
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
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
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
    capabilities: {
      read_only: true,
      rest_api: true,
      write_operations: false,
      arbitrary_commands: false
    },
    resources: { system_resource: resource.data }
  };
}

module.exports = {
  SCHEMA_VERSION,
  READ_ONLY_METHODS,
  sanitizeBaseUrl,
  requestReadOnly,
  inspectRouter
};
