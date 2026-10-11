'use strict';

// Offline-only entry point for the composite GitHub Action.
// Exit codes: 0 = clean or accepted findings, 1 = gated high/critical findings,
// 2 = invalid input or operational/runtime failure.
const fs = require('fs');
const path = require('path');
const { analyze, formatReport } = require('./firewall-doctor');

function mapFindingsExitCode(hasHighOrCritical, failOnHigh) {
  return hasHighOrCritical && failOnHigh ? 1 : 0;
}

function run(file, failOnHigh) {
  if (failOnHigh !== 'true' && failOnHigh !== 'false') {
    console.error('Firewall Doctor Action: fail-on-high must be "true" or "false".');
    return 2;
  }
  if (!file) {
    console.error('Firewall Doctor Action: input "file" is required.');
    return 2;
  }

  let config;
  try {
    const resolved = path.resolve(file);
    if (!fs.statSync(resolved).isFile()) {
      console.error('Firewall Doctor Action: input file must be a regular file.');
      return 2;
    }
    fs.accessSync(resolved, fs.constants.R_OK);
    config = fs.readFileSync(resolved, 'utf8');
  } catch {
    console.error('Firewall Doctor Action: input file is missing or unreadable.');
    return 2;
  }

  try {
    const result = analyze(config);
    console.log(formatReport(result));
    const hasHighOrCritical = Boolean(result.summary.high || result.summary.critical);
    return mapFindingsExitCode(hasHighOrCritical, failOnHigh === 'true');
  } catch (error) {
    console.error('Firewall Doctor Action: analysis failed; details suppressed to avoid logging configuration-derived data.');
    return 2;
  }
}

if (require.main === module) {
  process.exitCode = run(process.argv[2], process.argv[3] === undefined ? 'true' : process.argv[3]);
}

module.exports = { mapFindingsExitCode, run };
