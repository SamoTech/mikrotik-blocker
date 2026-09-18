'use strict';
const assert=require('assert');
const {createChangeSet,prepareRollback}=require('./routeros-change-set');
const d={fingerprint:'fp',routeros:{major:7},actual:{fingerprint:'a'},summary:{},conflicts:[],changes:[
{id:'a',type:'add',kind:'firewall.address-list',identity:'x',path:'/ip/firewall/address-list',risk:'review',requires_review:true,after:{attributes:{'.id':'*1'}},attribute_changes:[],order_change:null},
{id:'b',type:'remove',kind:'firewall.filter',identity:'y',path:'/ip/firewall/filter',risk:'high',requires_review:true,before:{attributes:{'.id':'*2'}},attribute_changes:[],order_change:null}]};
const cs=createChangeSet(d);assert.strictEqual(cs.change_set.state,'draft');assert.strictEqual(cs.snapshot.required,true);assert.strictEqual(cs.risk.level,'high');
const rb=prepareRollback(cs);assert.strictEqual(rb.rollback.prepared,true);assert.strictEqual(rb.rollback.artifact.reversible,true);assert.strictEqual(rb.rollback.artifact.commands.length,2);
const blocked=createChangeSet({...d,conflicts:[{id:'c',type:'conflict'}]});assert.strictEqual(blocked.change_set.state,'blocked');assert.strictEqual(blocked.validation.valid,false);
console.log('routeros-change-set.test.js: all tests passed');