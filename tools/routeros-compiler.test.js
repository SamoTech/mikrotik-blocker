'use strict';

const assert = require('assert');
const { compile } = require('./routeros-compiler');

const desired = {
  routeros: { major: 7 },
  resources: [
    { kind: 'firewall.filter', path: '/ip firewall filter', attributes: { chain: 'input', action: 'accept', comment: 'Allow LAN' }, order: 2 },
    { kind: 'firewall.address-list', path: '/ip firewall address-list', attributes: { list: 'blocked', address: '192.0.2.10' }, order: 1 },
  ],
};

const a = compile(desired);
const b = compile(JSON.parse(JSON.stringify(desired)));
assert.deepStrictEqual(a, b);
assert.strictEqual(a.validation.valid, true);
assert.ok(a.rsc.includes('/ip/firewall/address-list'));
assert.ok(a.rsc.includes('add action=accept chain=input comment="Allow LAN"'));
assert.strictEqual(a.deterministic, true);

const absent = compile({
  resources: [
    { kind: 'firewall.filter', path: '/ip firewall filter', state: 'absent', attributes: { '.id': '*1' } },
  ],
});
assert.strictEqual(absent.validation.valid, true);
assert.ok(absent.rsc.includes('remove [find .id="*1"]'));

assert.throws(() => compile({
  resources: [{ kind: 'future.thing', path: '/future thing', attributes: {} }],
}), /Unsupported desired-state resource kind/);

console.log('routeros-compiler tests passed');
