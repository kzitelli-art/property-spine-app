'use strict';
const fs=require('fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('followups-door.js','utf8');
const fn=s.slice(s.indexOf('function sendAttemptKey('),s.indexOf('function sendFailureMessage('));
let n=0;const state={sendKeys:{}};
const key=new Function('state','uid',fn+';return sendAttemptKey;')(state,()=>String(++n));
const a=key({conversion_id:'c'},{application_offer_id:'one'});
assert.equal(key({conversion_id:'c'},{application_offer_id:'one'}),a,'same offer retry must retain identity');
assert.notEqual(key({conversion_id:'c'},{application_offer_id:'two'}),a,'new reviewed offer must receive a new send identity');
assert.notEqual(key({conversion_id:'other'},{application_offer_id:'one'}),a,'conversion boundary is retained');
console.log('PASS send identity: same offer retry, revised offer, other conversion');

(async()=>{
 const html=fs.readFileSync('index.html','utf8');const start=html.indexOf('async function sendApplication(target)');const end=html.indexOf('// Exact leaseable targets',start);
 const calls=[];const live={hasSession:()=>true,sendApplicationFromConversion:async p=>{calls.push(p);throw Error('retry');}};
 const send=new Function('live','_currentConv','_applicationSendKeys',html.slice(start,end)+';return sendApplication;')(live,{conversion_id:'c'},{});
 const target={unit_id:'u',space_id:'b',application_offer_id:'one'};
 await send(target).catch(()=>{});await send(target).catch(()=>{});await send({...target,application_offer_id:'two'}).catch(()=>{});
 assert.equal(calls[0].idempotency_key,calls[1].idempotency_key);
 assert.notEqual(calls[0].idempotency_key,calls[2].idempotency_key,'conversation revised offer must receive new send identity');
 console.log('PASS conversation retry identity');
})().catch(e=>{console.error(e);process.exitCode=1;});
