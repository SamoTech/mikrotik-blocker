#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { analyze, formatReport } = require('../tools/firewall-doctor');
const { validate } = require('../tools/validate-manifest');
const { simulate } = require('../tools/policy-simulator');

const args = process.argv.slice(2);
const command = args[0];

function usage() {
  console.log(`MikroTik Blocker CLI\n\nCommands:\n  inspect <router.rsc> [--json]    Analyze a RouterOS export\n  validate <router.rsc>            Analyze and fail on high/critical findings\n  manifest validate <file.json>   Validate a Policy Manifest\n  simulate <file.json>            Estimate policy scope and warnings\n  recipe search [term]             Search local recipe registry\n  recipe show <id>                 Show a recipe\n`);
}

function recipeDirs() {
  const root = path.join(__dirname, '..', 'recipes');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
}

if (!command || command === 'help' || command === '--help') { usage(); process.exit(0); }

if (command === 'inspect' || command === 'validate') {
  const file = args[1];
  if (!file || !fs.existsSync(file)) { console.error('RouterOS export file not found.'); process.exit(2); }
  const result = analyze(fs.readFileSync(file, 'utf8'));
  console.log(args.includes('--json') ? JSON.stringify(result, null, 2) : formatReport(result));
  if (command === 'validate' && (result.summary.high || result.summary.critical)) process.exit(1);
  process.exit(0);
}

if (command === 'manifest' && args[1] === 'validate') {
  const file = args[2];
  if (!file || !fs.existsSync(file)) { console.error('Manifest file not found.'); process.exit(2); }
  const result = validate(JSON.parse(fs.readFileSync(file, 'utf8')));
  console.log(result.valid ? 'Policy manifest: valid' : `Policy manifest: invalid\n${result.errors.map(e => `- ${e}`).join('\n')}`);
  process.exit(result.valid ? 0 : 1);
}

if (command === 'simulate') {
  const file = args[1];
  if (!file || !fs.existsSync(file)) { console.error('Manifest file not found.'); process.exit(2); }
  console.log(JSON.stringify(simulate(JSON.parse(fs.readFileSync(file, 'utf8'))), null, 2));
  process.exit(0);
}

if (command === 'recipe') {
  const sub = args[1];
  const dirs = recipeDirs();
  if (sub === 'search') {
    const term = (args[2] || '').toLowerCase();
    dirs.filter(d => !term || d.toLowerCase().includes(term)).forEach(d => console.log(d));
    process.exit(0);
  }
  if (sub === 'show') {
    const id = args[2];
    if (!id || !dirs.includes(id)) { console.error('Recipe not found.'); process.exit(2); }
    console.log(fs.readFileSync(path.join(__dirname, '..', 'recipes', id, 'recipe.yaml'), 'utf8'));
    process.exit(0);
  }
}

usage();
process.exit(2);
