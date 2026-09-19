'use strict';

const { validateConnectionProfile } = require('./routeros-connection-profile');
const { inspectRouter } = require('./routeros-rest-readonly');

const SCHEMA_VERSION = '1.0.0';

async function checkConnectionHealth(profile, options = {}) {
  const validation = validateConnectionProfile(profile);
  if (!validation.valid) {
    return {
      schema_version: SCHEMA_VERSION,
      status: 'invalid-profile',
      reachable: false,
      read_only: true,
      router: null,
      errors: validation.errors
    };
  }

  try {
    const inspection = await inspectRouter({
      baseUrl: profile.base_url,
      timeoutMs: profile.timeout_ms,
      fetch: options.fetch
    });

    return {
      schema_version: SCHEMA_VERSION,
      status: 'healthy',
      reachable: true,
      read_only: true,
      router: inspection.router,
      capabilities: inspection.capabilities,
      errors: []
    };
  } catch (error) {
    return {
      schema_version: SCHEMA_VERSION,
      status: 'unreachable',
      reachable: false,
      read_only: true,
      router: null,
      errors: [{ code: 'CONNECTION_FAILED', message: error.message }]
    };
  }
}

module.exports = { SCHEMA_VERSION, checkConnectionHealth };
