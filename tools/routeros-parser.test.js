'use strict';

const assert = require('assert');
const { parse, splitCommands, tokenize, detectVersion } = require('./routeros-parser');

const fixture = `# RouterOS 7.21.4\n/system identity\nset name="core-router"\n/ip address\nadd address=192.0.2.1/24 interface=bridge-lan comment="LAN gateway"\n/ip firewall filter\nadd chain=input action=accept connection-state=established,related comment="allow established"\nadd chain=input action=drop in-interface-list=WAN comment="drop WAN"\n`;

const resultA = parse(fixture);
const resultB = parse(fixture);
assert.deepStrictEqual(resultA, resultB);
assert.strictEqual(resultA.routeros.version, '7.21.4');
assert.strictEqual(resultA.routeros.major, 7);
assert.strictEqual(resultA.statistics.resources, 4);
assert.strictEqual(resultA.resources[1].attributes.address, '192.0.2.1/24');
assert.strictEqual(resultA.resources[1].attributes.comment, 'LAN gateway');
assert.strictEqual(resultA.resources[1].identity, '192.0.2.1/24');
assert.ok(resultA.source.sha256.length === 64);

const quoted = tokenize('/system identity set name="A router \\"quoted\\""');
assert.strictEqual(quoted.unterminatedQuote, false);

const commands = splitCommands('/ip firewall filter add chain=input action=drop \\\n comment="continued"\n');
assert.strictEqual(commands.commands.length, 1);
assert.ok(commands.commands[0].raw.includes('continued'));

const unknown = parse('/some/future/menu mystery thing=value\n');
assert.strictEqual(unknown.statistics.opaqueCommands, 1);
assert.strictEqual(unknown.diagnostics[0].code, 'UNKNOWN_VERB');

assert.strictEqual(detectVersion('# version: 6.49.18\n').major, 6);
assert.strictEqual(detectVersion('# no version here\n').version, 'unknown');

console.log('routeros-parser tests passed');
