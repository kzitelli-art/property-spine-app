"use strict";
const fs=require('fs'),assert=require('./tests/assert_reporter');
const {chromium}=require('./tests/browser_runtime');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await page.setContent('<main id="psFollowupsEntry"></main>');
  const styles=Array.from(fs.readFileSync('index.html','utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi),m=>m[1]).join('\n');
  await page.addStyleTag({content:styles});
  await page.evaluate(()=>{
   window.calls={offers:[],sends:[],targets:[]};
   window.__psLive={hasSession:()=>true,loadResource:async name=>name==='personCard'?{data:{person:{id:'p'},relationship:{vitals:{budget:'0',unit_type:'high-floor studio',move_month:'2026-10',occupants:'2',pets:'one cat'}}}}:{data:{stages:{post_tour:[],application:[],lease_sent:[]}}},
    leaseableUnits:async term=>{calls.targets.push(term);return{data:{selection_basis:'requested_term',requested_start:term&&term.requested_start,requested_end:term&&term.requested_end,eligible_targets:[{unit_id:'u',space_id:'b',unit_number:'101',space_label:'Bed B',rentable_space_count:2,intended_move_in:term&&term.requested_start,requested_end:term&&term.requested_end}]}};},
    createApplicationOffer:async p=>{calls.offers.push(p);if(calls.offers.length<=2)await new Promise(r=>window.releaseOffer=r);return{data:{application_offer_id:'offer',application_terms:{schema_version:1,property_id:'property',person_id:'p',target:{unit_id:'u',space_id:p.space_id},rent:p.rent,security_deposit:p.security_deposit,lease_start_date:p.lease_start_date,lease_end_date:p.lease_end_date,fees:p.fees,concessions:p.concessions}}};},
    sendApplicationFromConversion:async p=>{calls.sends.push(p);return{data:{sent:true,receipt:'Application sent'}};}};
  });
  if(fs.existsSync('application-offer-review.js'))await page.addScriptTag({content:fs.readFileSync('application-offer-review.js','utf8')});
  await page.addScriptTag({content:fs.readFileSync('followups-door.js','utf8')});
  await page.evaluate(()=>window.__psFollowups.mount(document.getElementById('psFollowupsEntry')));
  await page.waitForSelector('[data-ps-state="data"]');
  await page.evaluate(()=>window.__psFollowups.openApplicationSend({conversion_id:'c',person_id:'p',person_name:'Prospect'}));
  assert.equal(await page.locator('#lqTargetStart').count(),1,'post-tour must open the same date-first review before targeting or sending');
  await page.locator('#lqTargetStart').fill('2026-10-05');await page.locator('#lqTargetEnd').fill('2027-09-30');
  await page.locator('#lqFindHomes').click();await page.locator('[data-space="b"]').click();
  assert.equal(await page.evaluate(()=>calls.sends.length),0,'choosing the home does not send');
  await page.locator('#lqOfferRent').fill('1200');await page.locator('#lqOfferDep').fill('0');
  await page.locator('#lqNoFees').check();await page.locator('#lqNoConcessions').check();
  await page.locator('#lqOfferConfirm').click();await page.waitForFunction(()=>calls.offers.length===1);
  await page.locator('[data-act="cancel"]').click();await page.evaluate(()=>window.releaseOffer());
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(()=>calls.sends.length),0,'cancel during offer creation must not continue into a send');
  await page.evaluate(()=>window.__psFollowups.openApplicationSend({conversion_id:'c',person_id:'p',person_name:'Prospect'}));
  await page.locator('#lqTargetStart').fill('2026-10-05');await page.locator('#lqTargetEnd').fill('2027-09-30');
  await page.locator('#lqFindHomes').click();await page.locator('[data-space="b"]').click();
  await page.locator('#lqOfferRent').fill('1200');await page.locator('#lqOfferDep').fill('0');
  await page.locator('#lqNoFees').check();await page.locator('#lqNoConcessions').check();
  await page.locator('#lqOfferConfirm').click();await page.waitForFunction(()=>calls.offers.length===2);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#lqOfferBack').click();await page.evaluate(()=>window.releaseOffer());
  await page.waitForTimeout(50);assert.deepEqual(errors,[],'Back must not let stale offer response touch a replaced review');assert.equal(await page.evaluate(()=>calls.sends.length),0,'Back during offer preparation must invalidate the old review');
  await page.locator('#lqFindHomes').click();await page.locator('[data-space="b"]').click();
  await page.locator('#lqOfferRent').fill('1200');await page.locator('#lqOfferDep').fill('0');
  await page.locator('#lqNoFees').check();await page.locator('#lqNoConcessions').check();await page.locator('#lqOfferConfirm').click();
  await page.waitForFunction(()=>calls.sends.length===1);
  const calls=await page.evaluate(()=>window.calls);
  assert.equal(calls.offers.length,2,'Back preserves the late canonical offer without creating another unchanged draft');assert.equal(calls.offers[0].conversionId,'c');assert.equal(calls.offers[0].space_id,'b');
  assert.equal(calls.offers[0].lease_start_date,'2026-10-05');assert.equal(calls.offers[0].lease_end_date,'2027-09-30');
  assert.equal(calls.sends[0].application_offer_id,'offer');assert.equal(calls.sends[0].space_id,'b');
  console.log('PASS actual post-tour controller -> shared review -> complete offer -> exact composite send (stub adapters)');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
