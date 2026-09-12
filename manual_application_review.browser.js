"use strict";
// Class 3: component browser contract. Actual app + owned HTTP proof is separate.
const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('../api-fable-review-20260907/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  // The actual production role split: an authorized colleague established the
  // complete offer; the leasing operator may send it but cannot author terms.
  for(const change of ['unchanged','rent','deposit','start','end','fee_code','fee_label','fee_amount','fee_cadence','remove_fee','concessions','target']){
   const page=await browser.newPage();await page.setContent('<main id="review"></main>');await page.addScriptTag({content:fs.readFileSync('application-offer-review.js','utf8')});
   await page.evaluate(change=>{
    window.calls={offers:[],sends:[]};
    const terms={schema_version:1,property_id:'property',person_id:'person',target:{unit_id:'unit',space_id:'bed'},rent:'1025.00',security_deposit:'500.00',lease_start_date:'2026-10-05',lease_end_date:'2027-10-04',fees:[{code:'application',label:'Application fee',amount:'25.00',cadence:'per_applicant',governed_charge_id:'governed-fee',source:'property_governed_charges'}],concessions:{status:'none'}};
    if(change==='concessions')terms.concessions={status:'structured',amount:'50.00'};
    if(change==='target')terms.target.unit_id='different-unit';
    const live={loadResource:async()=>({data:{person:{id:'person'},relationship:{vitals:{}}}}),leaseableUnits:async t=>({data:{selection_basis:'requested_term',requested_start:t.requested_start,requested_end:t.requested_end,eligible_targets:[{unit_id:'unit',space_id:'bed',unit_number:'3B',space_label:'Bed B',rentable_space_count:2,intended_move_in:t.requested_start}]}}),createApplicationOffer:async p=>{calls.offers.push(p);throw Error('NO_APPLICATION_OFFER_AUTHORITY');}};
    window.psMountApplicationOfferReview(document.getElementById('review'),{conversionId:'conversion',personId:'person',live,sendCapability:{allowed:false},manualEmailPreparation:{allowed:true,draft_offers:[{id:'authorized-draft',space_id:'bed',terms}]},sendApplication:async p=>{calls.sends.push(p);return {prepared:true,sent:false,invitation_id:'invitation',send_obligation_id:'child',recipient_snapshot:'prospect@example.invalid',link:'https://example.invalid/application'};}});
   },change);
   await page.locator('#lqTargetStart').fill(change==='start'?'2026-10-06':'2026-10-05');await page.locator('#lqTargetEnd').fill(change==='end'?'2027-10-05':'2027-10-04');await page.locator('#lqFindHomes').click();await page.locator('[data-space="bed"]').click();
   await page.locator('#lqOfferRent').fill(change==='rent'?'1026':'1025');
   if(change==='deposit')await page.locator('#lqOfferDep').fill('501');
   for(const [field,selector,value] of [['fee_code','.lqFeeCode','other'],['fee_label','.lqFeeLabel','Changed label'],['fee_amount','.lqFeeAmount','26'],['fee_cadence','.lqFeeCadence','monthly']])if(change===field){if(field==='fee_cadence')await page.locator(selector).selectOption(value);else await page.locator(selector).fill(value);}
   if(change==='remove_fee')await page.locator('#lqNoFees').check();
   await page.locator('#lqNoConcessions').check();await page.locator('#lqOfferConfirm').click();
   await page.waitForFunction(()=>document.getElementById('lqOfferErr')?.textContent||document.getElementById('lqEmailRecipient'));
   const calls=await page.evaluate(()=>window.calls);
   if(change==='unchanged'){
    assert.equal(calls.offers.length,0,'unchanged complete authorized terms must not ask Mike to reauthor the offer');
    assert.equal(calls.sends.length,1);assert.equal(calls.sends[0].application_offer_id,'authorized-draft');
   }else{
    assert.equal(calls.offers.length,1,change+' must use the governed correction');assert.equal(calls.offers[0].supersedes_application_offer_id,'authorized-draft');assert.equal(calls.sends.length,0,'an unauthorized edit must never prepare or send');assert.equal(await page.locator('#lqOfferErr').innerText(),'NO_APPLICATION_OFFER_AUTHORITY');
   }
   console.log('PASS two-person component: '+change);await page.close();
  }
  for(const lost of [false,true]){
   const page=await browser.newPage();await page.setContent('<main id="review"></main>');
   await page.addScriptTag({content:fs.readFileSync('application-offer-review.js','utf8')});
   await page.evaluate(lost=>{
    window.calls={prepare:[],attest:[],recover:[]};
    const live={loadResource:async()=>({data:{person:{id:'person'},relationship:{vitals:{}}}}),
     leaseableUnits:async t=>({data:{selection_basis:'requested_term',requested_start:t.requested_start,requested_end:t.requested_end,eligible_targets:[{unit_id:'unit',space_id:'bed',unit_number:'3B',space_label:'Bed B',rentable_space_count:2,intended_move_in:t.requested_start}]}}),
     createApplicationOffer:async p=>({data:{application_offer_id:'offer',application_terms:{schema_version:1,property_id:'property',person_id:'person',target:{unit_id:'unit',space_id:p.space_id},rent:p.rent,security_deposit:p.security_deposit,lease_start_date:p.lease_start_date,lease_end_date:p.lease_end_date,fees:p.fees,concessions:p.concessions}}}),
     attestApplicationEmail:async p=>{calls.attest.push(p);return {data:{status:'manually_sent',receipt:'Send attested.'}};},
     regenerateApplicationLink:async p=>{calls.recover.push(p);return {data:{invitation_id:'replacement',send_obligation_id:'replacement-child',link:'https://example.invalid/t/application/replacement'}};}};
    window.psMountApplicationOfferReview(document.getElementById('review'),{conversionId:'conversion',personId:'person',live,
     sendCapability:{allowed:false,display_reason:'Text consent is absent.'},manualEmailPreparation:{allowed:true},
     sendApplication:async p=>{calls.prepare.push(p);return {prepared:true,sent:false,dispatched:false,invitation_id:'invitation',send_obligation_id:'send-child',recipient_snapshot:'prospect@example.invalid',link:lost?null:'https://example.invalid/t/application/prepared'};}});
   },lost);
   await page.locator('#lqTargetStart').fill('2026-10-05');await page.locator('#lqTargetEnd').fill('2027-10-04');await page.locator('#lqFindHomes').click();await page.locator('[data-space="bed"]').click();
   assert(await page.locator('input[value="sms"]').isDisabled(),'unconsented text is not offered');
   assert(await page.locator('input[value="manual_email"]').isChecked(),'the governed manual option is selected');
   await page.locator('#lqOfferRent').fill('1025');await page.locator('#lqOfferDep').fill('1025');await page.locator('#lqNoFees').check();await page.locator('#lqNoConcessions').check();
   await page.getByRole('button',{name:'Prepare application for email',exact:true}).click();
   await page.getByText('Application prepared for email',{exact:true}).waitFor();
   assert(await page.locator('#lqRecordEmailSent').isDisabled(),'preparation does not attest a send');
   assert.equal(await page.evaluate(()=>calls.attest.length),0);
   assert((await page.locator('body').innerText()).includes('Spine has not sent this email.'));
   if(lost){await page.getByRole('button',{name:'Replace lost link',exact:true}).click();await page.locator('#lqPreparedLink').waitFor();}
   await page.getByRole('button',{name:'Copy link',exact:true}).click();assert.equal(await page.evaluate(()=>calls.attest.length),0,'copying never records a send');
   await page.locator('#lqEmailSentCheck').check();await page.getByRole('button',{name:'Record email send',exact:true}).click();await page.getByText('Email send recorded',{exact:true}).waitFor();
   const calls=await page.evaluate(()=>window.calls);
   assert.equal(calls.prepare.length,1);assert.equal(calls.prepare[0].delivery_method,'manual_email');assert.equal(calls.prepare[0].space_id,'bed');
   assert.equal(calls.attest.length,1);assert.deepEqual(calls.attest[0],{invitationId:lost?'replacement':'invitation',send_obligation_id:lost?'replacement-child':'send-child',recipient_snapshot:'prospect@example.invalid'});
   assert.equal(calls.recover.length,lost?1:0);
   console.log('PASS manual email component: '+(lost?'lost-token replacement preserves exact invitation/send-child custody':'prepare, copy, explicit send attestation stay distinct'));
   await page.close();
  }
  for(const ambiguous of [false,true]){
   const page=await browser.newPage();await page.setContent('<main id="review"></main>');await page.addScriptTag({content:fs.readFileSync('application-offer-review.js','utf8')});
   await page.evaluate(ambiguous=>{
    window.offers=[];window.sendAttempts=0;var live={loadResource:async()=>({data:{person:{id:'person'},relationship:{vitals:{}}}}),
      leaseableUnits:async t=>({data:{selection_basis:'requested_term',requested_start:t.requested_start,requested_end:t.requested_end,eligible_targets:[{unit_id:'unit',space_id:'bed',unit_number:'3B',space_label:'Bed B',rentable_space_count:2,intended_move_in:t.requested_start}]}}),
      createApplicationOffer:async p=>{offers.push(p);return {data:{application_offer_id:'correction',application_terms:{schema_version:1,property_id:'property',person_id:'person',target:{unit_id:'unit',space_id:p.space_id},rent:p.rent,security_deposit:p.security_deposit,lease_start_date:p.lease_start_date,lease_end_date:p.lease_end_date,fees:p.fees,concessions:p.concessions}}};}};
    window.psMountApplicationOfferReview(document.getElementById('review'),{conversionId:'conversion',personId:'person',live,sendCapability:{allowed:false},manualEmailPreparation:{allowed:true,draft_offers:[{id:'other-bed',space_id:'other',terms:{rent:999}},{id:'exact-draft',space_id:'bed',terms:{rent:1250,security_deposit:1025,lease_start_date:'2026-01-01',lease_end_date:'2026-12-31',fees:[]}}],ambiguous_space_ids:ambiguous?['bed']:[]},sendApplication:async()=>{if(++window.sendAttempts===1)throw Error('Preparation unavailable. Retry.');return {prepared:true,sent:false,invitation_id:'invitation',send_obligation_id:'child',recipient_snapshot:'prospect@example.invalid',link:'https://example.invalid/t/application/test'};}});
   },ambiguous);
   await page.locator('#lqTargetStart').fill('2026-10-05');await page.locator('#lqTargetEnd').fill('2027-10-04');await page.locator('#lqFindHomes').click();await page.locator('[data-space="bed"]').click();
   assert.equal(await page.locator('#lqOfferRent').inputValue(),'1250','the selected exact bed reads its canonical draft');
   assert.equal(await page.locator('#lqOfferStart').inputValue(),'2026-10-05','requested date rights stay the checked term, not a prior draft date');
   if(ambiguous){assert(await page.locator('#lqOfferConfirm').isDisabled(),'ambiguous drafts cannot silently choose a predecessor');assert.equal(await page.evaluate(()=>offers.length),0);}
   else{
    await page.locator('#lqOfferRent').fill('1025');await page.locator('#lqNoFees').check();await page.locator('#lqNoConcessions').check();await page.locator('#lqOfferConfirm').click();await page.getByText('Preparation unavailable. Retry.',{exact:true}).waitFor();
    await page.locator('#lqOfferBack').click();await page.locator('#lqFindHomes').click();await page.locator('[data-space="bed"]').click();
    assert.equal(await page.locator('#lqOfferRent').inputValue(),'1025','Back retains corrected terms from application_terms response');assert.equal(await page.locator('#lqOfferDep').inputValue(),'1025');assert.equal(await page.locator('#lqOfferStart').inputValue(),'2026-10-05');assert.equal(await page.locator('#lqOfferEnd').inputValue(),'2027-10-04');
    await page.locator('#lqNoFees').check();await page.locator('#lqNoConcessions').check();await page.locator('#lqOfferConfirm').click();await page.getByText('Application prepared for email',{exact:true}).waitFor();const offers=await page.evaluate(()=>window.offers);assert.equal(offers.length,1,'Back reuses corrected offer if the complete review is unchanged');assert.equal(offers[0].supersedes_application_offer_id,'exact-draft');assert.equal(offers[0].rent,'1025');
   }
   console.log('PASS canonical draft component: '+(ambiguous?'ambiguous exact-space drafts remain blocked':'reload correction retains exact predecessor and checked dates'));await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
