'use strict';

const fs = require('fs');
const { parse } = require('./routeros-parser');
const { normalize } = require('./routeros-semantic');
const { diff } = require('./routeros-diff');
const { createChangeSet, attachSnapshot, prepareRollback } = require('./routeros-change-set');
const { createSnapshot } = require('./routeros-snapshot');
const { attachApproval } = require('./routeros-approval');
const { createDeploymentPlan } = require('./routeros-deployment-plan');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function runDryRun(actualRsc, desiredState, options = {}) {
  if (typeof actualRsc !== 'string') throw new TypeError('RouterOS export text is required');
  if (!desiredState || typeof desiredState !== 'object') throw new TypeError('Desired state is required');

  const parsed = parse(actualRsc);
  const actual = normalize(parsed);
  const comparison = diff(actual, desiredState);
  let changeSet = createChangeSet(comparison);

  const snapshot = createSnapshot(actual, {
    source: { type: 'rsc-export', path: options.source_path || null },
    routeros: actual.routeros || comparison.routeros || null,
  });
  changeSet = attachSnapshot(changeSet, snapshot);
  changeSet = prepareRollback(changeSet);

  let approval = null;
  if (options.approval) {
    approval = typeof options.approval === 'string' ? readJson(options.approval) : options.approval;
    changeSet = attachApproval(changeSet, approval);
  }

  const deployment = createDeploymentPlan(changeSet, {
    routeros_major: options.routeros_major ?? actual.routeros?.major ?? comparison.routeros?.major,
  });

  return {
    schema_version: '1.0.0',
    mode: 'dry-run',
    read_only: true,
    mutation_performed: false,
    actual,
    diff: comparison,
    change_set: changeSet,
    snapshot,
    approval: approval ? { supplied: true, status: approval.approval?.status || null } : { supplied: false },
    deployment,
  };
}

if (require.main === module) {
  const [, , actualFile, desiredFile, ...args] = process.argv;
  if (!actualFile || !desiredFile) {
    console.error('Usage: node tools/routeros-dry-run.js <actual.rsc> <desired-state.json> [--approval <approval.json>] [--json]');
    process.exit(2);
  }
  try {
    const approvalIndex = args.indexOf('--approval');
    const approvalPath = approvalIndex >= 0 ? args[approvalIndex + 1] : null;
    if (approvalIndex >= 0 && !approvalPath) throw new Error('--approval requires a file path');
    const result = runDryRun(
      fs.readFileSync(actualFile, 'utf8'),
      readJson(desiredFile),
      { source_path: actualFile, approval: approvalPath }
    );
    console.log(args.includes('--json') ? JSON.stringify(result, null, 2) : JSON.stringify({
      mode: result.mode,
      mutation_performed: result.mutation_performed,
      diff: result.diff.summary,
      change_set_status: result.change_set.change_set.state,
      approval_status: result.change_set.approval.status,
      deployment_status: result.deployment.deployment.status,
      executable: result.deployment.deployment.executable,
      boundary: result.deployment.deployment.boundary,
    }, null, 2));
    process.exit(result.deployment.deployment.status === 'blocked' ? 1 : 0);
  } catch (error) {
    console.error('Dry-run error: ' + error.message);
    process.exit(1);
  }
}

module.exports = { runDryRun };
