'use strict';

const { execFileSync } = require('node:child_process');

const ACTION_PATHS = [
  'action.yml',
  'README.md',
  '.github/workflows/action-release-tag-smoke.yml',
  '.github/workflows/release-action.yml',
  'tools',
  'schemas',
  'docs/knowledge-base/records',
  'tests/action-consumer',
];

function parseVersion(tag) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(tag || '');
  if (!match) throw new Error('Expected a stable semantic version tag such as v1.2.3.');
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function parseCommitRecord(record) {
  const separator = record.indexOf('\x1f');
  if (separator < 0) return null;
  return {
    subject: record.slice(0, separator).trim(),
    body: record.slice(separator + 1).trim(),
  };
}

function releaseBumpForCommit(commit) {
  const match = /^([a-z]+)(?:\(([^)]+)\))?(!)?:\s+.+$/i.exec(commit.subject);
  if (!match || (match[2] || '').toLowerCase() !== 'action') return null;

  if (match[3] === '!' || /\bBREAKING[ -]CHANGE\s*:/i.test(commit.body)) return 'major';

  const type = match[1].toLowerCase();
  if (type === 'feat') return 'minor';
  if (type === 'fix' || type === 'perf') return 'patch';
  return null;
}

function calculateReleasePlan(lastTag, commits) {
  if (!lastTag) throw new Error('No existing stable vX.Y.Z tag was found; refusing to guess a release baseline.');

  const base = parseVersion(lastTag);
  const priorities = { patch: 1, minor: 2, major: 3 };
  let bump = null;
  const releaseCommits = [];

  for (const commit of commits) {
    const candidate = releaseBumpForCommit(commit);
    if (!candidate) continue;
    releaseCommits.push(commit.subject);
    if (!bump || priorities[candidate] > priorities[bump]) bump = candidate;
  }

  if (!bump) {
    return { release: false, lastTag, nextTag: null, bump: null, commits: [] };
  }

  if (bump === 'major') {
    base.major += 1;
    base.minor = 0;
    base.patch = 0;
  } else if (bump === 'minor') {
    base.minor += 1;
    base.patch = 0;
  } else {
    base.patch += 1;
  }

  return {
    release: true,
    lastTag,
    nextTag: 'v' + base.major + '.' + base.minor + '.' + base.patch,
    bump,
    commits: releaseCommits,
  };
}

function main() {
  const tags = execFileSync('git', ['tag', '--list', 'v[0-9]*', '--sort=-version:refname'], { encoding: 'utf8' })
    .split(/\r?\n/).map(tag => tag.trim()).filter(Boolean);
  const lastTag = tags[0];
  if (!lastTag) throw new Error('No existing stable vX.Y.Z tag was found; refusing to guess a release baseline.');

  const range = lastTag + '..HEAD';
  const args = ['log', '--format=%s%x1f%b%x1e', range, '--', ...ACTION_PATHS];
  const output = execFileSync('git', args, { encoding: 'utf8' });
  const commits = output.split('\x1e').map(parseCommitRecord).filter(Boolean);
  process.stdout.write(JSON.stringify(calculateReleasePlan(lastTag, commits)) + '\n');
}

module.exports = { calculateReleasePlan, parseVersion, releaseBumpForCommit };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('Action release planning failed: ' + error.message);
    process.exitCode = 2;
  }
}
