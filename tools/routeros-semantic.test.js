'use strict';

const assert = require('assert');
const { parse } = require('./routeros-parser');
const { normalize, inferKind, resourceIdentity } = require('./routeros-semantic');

const exportText = `# RouterOS 7.16
/system identity
set name="core-router"
/ip address
add address=192.0.2.1/24 interface=ether1
/ip firewall filter
add chain=input action=accept connection-state=established,related
/unknown/menu
add foo=bar
`;

const parsed = parse(exportText);
const model = normalize(parsed);

assert.strictEqual(inferKind('/ip/firewall/filter'), 'firewall.filter');
assert.strictEqual(inferKind('/ip/address'), 'ip.address');
assert.strictEqual(inferKind('/does/not/exist'), null);
assert.strictEqual(model.schemaVersion, '1.0.0');
assert.strictEqual(model.routeros.major, 7);
assert.strictEqual(model.inventory['firewall.filter'], 1);
assert.strictEqual(model.inventory['ip.address'], 1);
assert.strictEqual(model.statistics.resourceCount, 4);
assert.strictEqual(model.statistics.recognizedCount, 3);
assert.strictEqual(model.statistics.opaqueCount, 1);
assert.strictEqual(model.resources.some(r => r.kind === 'opaque'), true);
assert.strictEqual(model.resources.find(r => r.kind === 'firewall.filter').order, 2);
assert.strictEqual(resourceIdentity('interface', { name: 'ether1' }), 'interface:ether1');

const reorderedAttributes = normalize(parse(exportText.replace(
  'add address=192.0.2.1/24 interface=ether1',
  'add interface=ether1 address=192.0.2.1/24'
)));
assert.strictEqual(
  model.resources.find(r => r.kind === 'ip.address').identity,
  reorderedAttributes.resources.find(r => r.kind === 'ip.address').identity
);

const second = normalize(parse(exportText.replace('# RouterOS 7.16', '# RouterOS 7.16')));
assert.strictEqual(model.fingerprint, second.fingerprint);

console.log('routeros-semantic.test.js: all tests passed');
