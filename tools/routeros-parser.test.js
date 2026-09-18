'use strict';

const assert = require('assert');
const { parse, splitCommands, tokenize, detectVersion } = require('./routeros-parser');

const fixture = `# RouterOS 7.21.4
/system identity
set name="core-router"
/ip address
add address=192.0.2.1/24 interface=bridge-lan comment="LAN gateway"
/ip firewall filter
add chain=input action=accept connection-state=established,related comment="allow established"
add chain=input action=drop in-interface-list=WAN comment="drop WAN"
`;

const resultA = parse(fixture);
const resultB = parse(fixture);
assert.deepStrictEqual(resultA, resultB);
assert.strictEqual(resultA.routeros.version, '7.21.4');
assert.strictEqual(resultA.routeros.major, 7);
assert.strictEqual(resultA.statistics.resources, 4);
assert.strictEqual(resultA.resources[1].attributes.address, '192.0.2.1/24');
assert.strictEqual(resultA.resources[1].attributes.comment, 'LAN gateway');
assert.strictEqual(resultA.resources[1].identity, '192.0.2.1/24');
assert.strictEqual(resultA.resources[1].path, '/ip address');
assert.strictEqual(resultA.resources[2].path, '/ip firewall filter');
assert.strictEqual(resultA.resources[2].verb, 'add');
assert.strictEqual(resultA.resources[2].opaque, false);
assert.ok(resultA.source.sha256.length === 64);

const quoted = tokenize('/system identity set name="A router \\"quoted\\""');
assert.strictEqual(quoted.unterminatedQuote, false);

const commands = splitCommands('/ip firewall filter add chain=input action=drop \\\n comment="continued"\n');
assert.strictEqual(commands.commands.length, 1);

const parsedInline = parse('/ip firewall filter add chain=input action=drop\n');
assert.strictEqual(parsedInline.resources[0].path, '/ip firewall filter');
assert.strictEqual(parsedInline.resources[0].attributes.action, 'drop');
assert.strictEqual(parsedInline.resources[0].opaque, false);

const unknown = parse('/some/future/menu mystery thing=value\n');
assert.strictEqual(unknown.statistics.opaqueCommands, 1);
assert.strictEqual(unknown.diagnostics[0].code, 'UNKNOWN_VERB');

assert.strictEqual(detectVersion('# version: 6.49.18\n').major, 6);
assert.strictEqual(detectVersion('# no version here\n').version, 'unknown');

console.log('routeros-parser tests passed');
