'use strict';

// Thin, offline-only entry point for the composite GitHub Action.
// Exit codes: 0 = accepted findings, 1 = high/critical findings (when gated),
// 2 = invalid input or operational/runtime failure.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function mapAnalyzerExitCode(code, failOnHigh) {
  if (code === 0) return 0;
  if (code === 1) return failOnHigh ? 1 : 0;
  return 2;
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

  const resolved = path.resolve(file);
  try {
    if (!fs.statSync(resolved).isFile()) {
      console.error('Firewall Doctor Action: input file must be a regular file.');
      return 2;
    }
    fs.accessSync(resolved, fs.constants.R_OK);
  } catch {
    console.error('Firewall Doctor Action: input file is missing or unreadable.');
    return 2;
  }

  const analyzer = path.join(__dirname, 'firewall-doctor.js');
  const result = spawnSync(process.execPath, [analyzer, resolved], { stdio: 'inherit' });
  if (result.error || result.status === null) {
    console.error('Firewall Doctor Action: analyzer failed to start or was terminated.');
    return 2;
  }
  return mapAnalyzerExitCode(result.status, failOnHigh === 'true');
}

if (require.main === module) {
  process.exitCode = run(process.argv[2], process.argv[3] === undefined ? 'true' : process.argv[3]);
}

module.exports = { mapAnalyzerExitCode, run };
