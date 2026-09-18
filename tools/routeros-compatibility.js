'use strict';

const crypto = require('crypto');

const SCHEMA_VERSION = '1.0.0';

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function parseVersion(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  const match = text.match(/^(\\d+)(?:\\.(\\d+))?(?:\\.(\\d+))?(?:[-+].*)?$/);
  if (!match) return null;
  return {
    raw: text,
    major: Number(match[1]),
    minor: Number(match[2] || 0),
    patch: Number(match[3] || 0),
  };
}

function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) throw new TypeError('Both RouterOS versions must be valid.');
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

function versionInRange(version, range = {}) {
  if (!parseVersion(version)) return false;
  if (range.minimum && compareVersions(version, range.minimum) < 0) return false;
  if (range.maximum && compareVersions(version, range.maximum) > 0) return false;
  return true;
}

function evaluateCompatibility(input = {}) {
  const actual = input.actual || {};
  const target = input.target || {};
  const actualVersion = actual.version || actual.routeros_version;
  const targetVersion = target.version || target.routeros_version;
  const checks = [];
  const errors = [];
  const warnings = [];

  function check(id, passed, message) {
    checks.push({ id, status: passed ? 'passed' : 'blocked', ...(message ? { message } : {}) });
    if (!passed) errors.push(message);
  }

  const actualParsed = parseVersion(actualVersion);
  const targetParsed = parseVersion(targetVersion);

  check(
    'routeros.actual.version',
    Boolean(actualParsed),
    'Actual RouterOS version is required and must be a valid semantic version.'
  );
  check(
    'routeros.target.version',
    Boolean(targetParsed),
    'Target RouterOS version is required and must be a valid semantic version.'
  );

  if (actualParsed && targetParsed) {
    check(
      'routeros.major.match',
      actualParsed.major === targetParsed.major,
      'Actual and target RouterOS major versions must match.'
    );
  }

  const range = target.compatibility || {};
  if (range.minimum || range.maximum) {
    const validRange = (!range.minimum || parseVersion(range.minimum)) &&
      (!range.maximum || parseVersion(range.maximum));
    check('routeros.target.range.schema', validRange, 'RouterOS compatibility range is invalid.');
    if (validRange && actualParsed) {
      check(
        'routeros.target.range',
        versionInRange(actualVersion, range),
        'Actual RouterOS version is outside the declared compatibility range.'
      );
    }
  } else {
    checks.push({
      id: 'routeros.target.range',
      status: 'passed',
      message: 'No additional target version range declared.'
    });
  }

  if (target.compatibility?.allowed_majors) {
    const majors = target.compatibility.allowed_majors;
    const validMajors = Array.isArray(majors) && majors.every(Number.isInteger);
    check('routeros.allowed_majors.schema', validMajors, 'allowed_majors must be an array of integers.');
    if (validMajors && actualParsed) {
      check(
        'routeros.allowed_majors',
        majors.includes(actualParsed.major),
        'Actual RouterOS major version is not in the allowed_majors set.'
      );
    }
  }

  if (actualParsed && targetParsed && actualParsed.major === targetParsed.major && actualParsed.raw !== targetParsed.raw) {
    warnings.push('RouterOS patch/minor versions differ; exact feature compatibility is not inferred automatically.');
  }

  const valid = errors.length === 0;
  const result = {
    schema_version: SCHEMA_VERSION,
    compatibility: {
      valid,
      status: valid ? 'passed' : 'blocked',
      read_only: true,
      actual: actualVersion || null,
      target: targetVersion || null,
      checks,
      errors,
      warnings,
    }
  };
  result.fingerprint = sha256(JSON.stringify(result));
  return result;
}

module.exports = {
  SCHEMA_VERSION,
  parseVersion,
  compareVersions,
  versionInRange,
  evaluateCompatibility,
};
