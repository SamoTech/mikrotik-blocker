'use strict';

const crypto = require('crypto');

const VERBS = new Set(['add', 'set', 'remove', 'enable', 'disable', 'reset', 'export']);

function stripInlineComment(line) {
  let quote = false;
  let escaped = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && quote) { escaped = true; continue; }
    if (ch === '"') { quote = !quote; continue; }
    if (ch === '#' && !quote) return line.slice(0, i);
  }
  return line;
}

function splitCommands(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const commands = [];
  let buffer = '';
  let startLine = 1;
  let quote = false;
  let escaped = false;

  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    const cleaned = stripInlineComment(lines[i]);
    if (!cleaned.trim()) continue;
    if (!buffer) startLine = lineNumber;
    buffer += (buffer ? '\n' : '') + cleaned.trim();

    for (let j = 0; j < cleaned.length; j += 1) {
      const ch = cleaned[j];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\' && quote) { escaped = true; continue; }
      if (ch === '"') quote = !quote;
    }

    if (!quote && !/\\\s*$/.test(cleaned)) {
      commands.push({ line: startLine, raw: buffer.trim() });
      buffer = '';
    } else if (!quote) {
      buffer = buffer.replace(/\\\s*$/, '').trim();
    }
  }

  if (buffer.trim()) commands.push({ line: startLine, raw: buffer.trim() });
  return { commands, lineCount: lines.length };
}

function tokenize(command) {
  const tokens = [];
  let token = '';
  let quote = false;
  let escaped = false;
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i];
    if (escaped) { token += ch; escaped = false; continue; }
    if (ch === '\\' && quote) { escaped = true; token += ch; continue; }
    if (ch === '"') { quote = !quote; token += ch; continue; }
    if (/\s/.test(ch) && !quote) {
      if (token) { tokens.push(token); token = ''; }
      continue;
    }
    token += ch;
  }
  if (token) tokens.push(token);
  return { tokens, unterminatedQuote: quote };
}

function unquote(value) {
  if (value.length >= 2 && value[0] === '"' && value[value.length - 1] === '"') {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return value;
}

function parseCommand(raw, line, sectionPath = '') {
  const { tokens, unterminatedQuote } = tokenize(raw);
  if (!tokens.length) return null;

  let path = sectionPath;
  let index = 0;
  let explicitPath = false;

  if (tokens[0].startsWith('/')) {
    explicitPath = true;
    const menu = [];
    while (index < tokens.length && !VERBS.has(tokens[index])) {
      menu.push(tokens[index]);
      index += 1;
    }
    path = menu.join(' ');
    if (index === tokens.length) return null;
  }

  const verbToken = tokens[index];
  const verb = VERBS.has(verbToken) ? verbToken : 'unknown';

  if (verb === 'unknown') {
    return {
      kind: path ? path.slice(1) : 'opaque',
      path,
      verb,
      line,
      attributes: {},
      raw,
      identity: null,
      opaque: true,
      diagnostic: {
        severity: 'warning',
        code: 'UNKNOWN_VERB',
        message: `Unsupported or unrecognized command verb: ${verbToken || '(missing)'}`,
        line
      }
    };
  }

  const attributes = {};
  for (const token of tokens.slice(index + 1)) {
    const eq = token.indexOf('=');
    if (eq <= 0) continue;
    const key = token.slice(0, eq);
    attributes[key] = unquote(token.slice(eq + 1));
  }

  const identity = attributes['.id'] || attributes.name || attributes['list'] || attributes['address'] || null;
  return {
    kind: path ? path.slice(1) : 'opaque',
    path,
    verb,
    line,
    attributes,
    raw,
    identity,
    opaque: !path,
    diagnostic: unterminatedQuote
      ? { severity: 'error', code: 'UNTERMINATED_QUOTE', message: 'Unterminated quoted value.', line }
      : null
  };
}

function detectVersion(text) {
  const patterns = [
    /RouterOS\s+([0-9]+(?:\.[0-9]+){1,2})/i,
    /version\s*[:=]\s*([0-9]+(?:\.[0-9]+){1,2})/i,
    /#\s*software\s+id\s*[:=].*?version\s*[:=]\s*([0-9]+(?:\.[0-9]+){1,2})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return { version: match[1], major: Number(match[1].split('.')[0]), versionSource: 'header' };
  }
  return { version: 'unknown', major: null, versionSource: 'unknown' };
}

function parse(text) {
  if (typeof text !== 'string') throw new TypeError('RouterOS export must be a string');
  const sourceHash = crypto.createHash('sha256').update(text).digest('hex');
  const { commands, lineCount } = splitCommands(text);
  const routeros = detectVersion(text);
  const resources = [];
  const diagnostics = [];
  const sections = [];
  let currentSection = '';

  for (const command of commands) {
    const { tokens } = tokenize(command.raw);
    if (tokens[0] && tokens[0].startsWith('/')) {
      const menu = [];
      let i = 0;
      while (i < tokens.length && !VERBS.has(tokens[i])) {
        menu.push(tokens[i]);
        i += 1;
      }
      if (i < tokens.length) currentSection = menu.join(' ');
      else {
        currentSection = menu.join(' ');
        if (!sections.includes(currentSection)) sections.push(currentSection);
        continue;
      }
    }

    const parsed = parseCommand(command.raw, command.line, currentSection);
    if (!parsed) continue;
    if (parsed.path && !sections.includes(parsed.path)) sections.push(parsed.path);
    if (parsed.diagnostic) diagnostics.push(parsed.diagnostic);
    resources.push({
      kind: parsed.kind,
      path: parsed.path,
      verb: parsed.verb,
      line: parsed.line,
      attributes: parsed.attributes,
      raw: parsed.raw,
      identity: parsed.identity,
      opaque: parsed.opaque
    });
  }

  return {
    schemaVersion: '1.0',
    source: { format: 'rsc-export', sha256: sourceHash, lineCount },
    routeros,
    inventory: { sections, resourceCount: resources.length },
    resources,
    diagnostics,
    statistics: {
      commands: commands.length,
      resources: resources.length,
      opaqueCommands: resources.filter(r => r.opaque).length,
      diagnostics: diagnostics.length
    }
  };
}

function format(result) { return JSON.stringify(result, null, 2); }

if (require.main === module) {
  const fs = require('fs');
  const file = process.argv[2];
  if (!file) { console.error('Usage: node tools/routeros-parser.js <router-export.rsc> [--json]'); process.exit(2); }
  const result = parse(fs.readFileSync(file, 'utf8'));
  console.log(format(result));
  process.exit(result.diagnostics.some(d => d.severity === 'error') ? 1 : 0);
}

module.exports = { parse, splitCommands, tokenize, detectVersion, parseCommand };
