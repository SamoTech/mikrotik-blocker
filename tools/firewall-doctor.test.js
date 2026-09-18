'use strict';
const assert = require('assert');
const { analyze, analyzeModel, parseAttrs } = require('./firewall-doctor');
const { parse } = require('./routeros-parser');
const { normalize } = require('./routeros-semantic');

assert.deepStrictEqual(parseAttrs('add chain=forward dst-port=443 action=drop comment="test rule"'), {
  chain: 'forward', 'dst-port': '443', action: 'drop', comment: 'test rule'
});

const ipv4Only = `/ip firewall filter\nadd chain=forward connection-state=established,related action=accept\nadd chain=forward dst-address-list=blocked action=drop\n/ip firewall address-list\nadd list=blocked address=203.0.113.10 comment="example"`;
const result = analyze(ipv4Only);
assert.strictEqual(result.coverage.ipv4, true);
assert.strictEqual(result.coverage.ipv6, false);
assert.ok(result.findings.some(f => f.id === 'IPV6_COVERAGE'));
const ipv6Finding = result.findings.find(f => f.id === 'IPV6_COVERAGE');
assert.strictEqual(ipv6Finding.provenance.knowledge_id, 'firewall.ipv6-coverage');
assert.ok(ipv6Finding.provenance.source.url.includes('help.mikrotik.com'));
assert.strictEqual(result.schema_version, '2.0');
assert.strictEqual(result.engine.name, 'RouterOS Doctor');
assert.ok(result.model.fingerprint);

const layer7 = `/ip firewall filter\nadd chain=forward layer7-protocol=a action=drop\nadd chain=forward layer7-protocol=b action=drop\nadd chain=forward layer7-protocol=c action=drop\nadd chain=forward layer7-protocol=d action=drop\n`;
assert.ok(analyze(layer7).findings.some(f => f.id === 'LAYER7_COST'));

const duplicate = `/ip firewall address-list\nadd list=blocked address=203.0.113.5\nadd list=blocked address=203.0.113.5`;
assert.ok(analyze(duplicate).findings.some(f => f.id === 'DUPLICATE_ADDRESS'));

const model = normalize(parse(`/ip firewall filter\nadd chain=input action=drop dst-port=22\n`));
const direct = analyzeModel(model);
assert.strictEqual(direct.model.fingerprint, model.fingerprint);
assert.strictEqual(direct.coverage.ipv4, true);

console.log('Firewall Doctor tests passed');
