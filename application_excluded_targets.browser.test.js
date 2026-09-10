"use strict";
// Class 3: shared component, synthetic transport; no provider or product writes.
const assert=require('node:assert/strict');
const {chromium}=require('../api-fable-review-20260907/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent('<main id="host"></main>');
  await page.addScriptTag({path:require('node:path').join(__dirname,'application-offer-review.js')});
  await page.evaluate(()=>{
   window.writes=0;
   window.psMountApplicationOfferReview(document.getElementById('host'),{conversionId:'c',live:{
    leaseableUnits:async term=>({data:{...term,selection_basis:'requested_term',eligible_targets:[],excluded_targets:[
     {unit_number:'101',space_label:'Bed <B>',offerable:false,refusal_reason:'Ready after requested start',availability_confidence:'expected',available_from:'2026-12-20'},
     {unit_number:'505',space_label:'Whole unit',offerable:false,refusal_reason:'Recorded lease rights block these dates'}
    ]}}),createApplicationOffer:()=>{window.writes++;}
   },sendApplication:()=>{window.writes++;}});
  });
  await page.locator('#lqTargetStart').fill('2026-12-01');
  await page.locator('#lqTargetEnd').fill('2027-11-30');
  await page.locator('#lqFindHomes').click();
  await page.waitForFunction(()=>!document.getElementById('lqFindHomes').disabled);
  const text=await page.locator('#lqUnitWrap').innerText();
  assert.match(text,/Ready after requested start/);
  assert.match(text,/Recorded lease rights block these dates/);
  assert.match(text,/Bed <B>/);
  assert.match(text,/Expected ready 2026-12-20/);
  assert.equal(await page.locator('#lqUnitWrap button').count(),0);
  assert.equal(await page.locator('#lqUnitWrap [data-space]').count(),0);
  assert.equal(await page.evaluate(()=>window.writes),0);
  console.log('PASS excluded targets: exact labels, canonical reasons, expected date, escaping, no action or write');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
