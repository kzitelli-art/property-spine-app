/* Actual shared review in Chromium; fake adapters, no provider network. */
"use strict";
const fs=require('node:fs'),path=require('node:path');
const assert=require('./tests/assert_reporter');
const {chromium}=require('./tests/browser_runtime');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent('<main id="host"></main>');
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'application-offer-review.js'),'utf8')});
  await page.evaluate(()=>{
   window.calls={offers:[],sends:[]};
   const live={
    loadResource:async()=>({data:{person:{id:'person-1'},relationship:{vitals:{}}}}),
    leaseableUnits:async term=>({data:{selection_basis:'requested_term',requested_start:term.requested_start,requested_end:term.requested_end,
     eligible_targets:[{unit_id:'unit-1',space_id:'bed-1',unit_number:'101',space_label:'Bed A',rentable_space_count:2,intended_move_in:term.requested_start}]}}),
    createApplicationOffer:async p=>{calls.offers.push(p);return {data:{application_offer_id:'offer-1'}};}
   };
   window.psMountApplicationOfferReview(document.getElementById('host'),{live,conversionId:'conversion-1',personId:'person-1',
    sendApplication:async p=>{calls.sends.push(p);if(calls.sends.length===1)throw Error('dispatch retry');return {sent:true,receipt:'Application sent'};}});
  });
  await page.locator('#lqTargetStart').fill('2026-10-01');
  await page.locator('#lqTargetEnd').fill('2027-09-30');
  await page.locator('#lqFindHomes').click();
  await page.locator('[data-space="bed-1"]').click();
  assert.equal(await page.evaluate(()=>calls.sends.length),0,'home selection does not dispatch');
  await page.locator('#lqOfferRent').fill('0');
  await page.locator('#lqOfferDep').fill('0');
  await page.locator('#lqNoFees').check();
  await page.locator('#lqOfferConfirm').click();
  assert.match(await page.locator('#lqOfferErr').textContent(),/no.concessions/i,'explicit concessions choice required');
  assert.equal(await page.evaluate(()=>calls.offers.length),0,'incomplete acknowledgment does not create an offer');
  await page.locator('#lqNoConcessions').check();
  await page.locator('#lqOfferConfirm').click();
  await page.waitForFunction(()=>document.getElementById('lqOfferErr').textContent.includes('dispatch retry'));
  for(const id of ['lqOfferRent','lqOfferDep','lqOfferStart','lqOfferEnd','lqAddFee'])
   assert.equal(await page.locator('#'+id).isDisabled(),true,id+' stays frozen for retry');
  await page.locator('#lqOfferConfirm').click();
  await page.waitForFunction(()=>document.getElementById('host').textContent.includes('Application sent'));
  const calls=await page.evaluate(()=>window.calls);
  assert.equal(calls.offers.length,1,'retry reuses the authored offer');
  assert.equal(calls.sends.length,2,'one failed send and one retry');
  assert.equal(Number(calls.offers[0].rent),0,'known zero rent retained');
  assert.equal(Number(calls.offers[0].security_deposit),0,'known zero deposit retained');
  assert.deepEqual(calls.offers[0].fees,[],'no-fees choice retained');
  assert.deepEqual(calls.offers[0].concessions,{status:'none'});
  assert.equal(calls.offers[0].lease_start_date,'2026-10-01');
  assert.equal(calls.offers[0].lease_end_date,'2027-09-30');
  assert.equal(calls.sends[0].application_offer_id,'offer-1');
  assert.equal(calls.sends[0].space_id,'bed-1');
  assert.deepEqual(calls.sends[1],calls.sends[0],'retry preserves the exact offer and target');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
