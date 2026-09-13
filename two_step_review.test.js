"use strict";
// Actual render/load functions in Chromium, explicit transport adapters only.
// The HTTP/browser journey separately proves the real server's receipts.
const fs=require('node:fs'),assert=require('./tests/assert_reporter');
const {chromium}=require('./tests/browser_runtime');
const html=fs.readFileSync(process.env.TWO_STEP_APP_SOURCE||'index.html','utf8');
function section(start,end){const a=html.indexOf(start),b=html.indexOf(end,a+start.length);if(a<0||b<0)throw Error('Missing actual source section: '+start);return html.slice(a,b);}
const source=section('var __psMoveIn =','/* ── funds:')+section('function psArProgress(d,n){','function psArAudit(d,n){')+section('function psArPayload(out){','\n');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:900}});
  page.setDefaultTimeout(5000);
  await page.setContent('<main><section id="moveInSection" data-mi-lease="lease-a"></section><div id="progress"></div></main>');
  await page.addStyleTag({content:Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi),m=>m[1]).join('\n')});
  await page.evaluate(()=>{
   window.esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   window.scope={user_id:'staff-a',property_id:'property-a'};
   window.pending=[];
   window.__psLive={sessionMeta:()=>scope,moveInState:async()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))};
   // These independent sections have their own harnesses. No substitute move-in
   // state, progression, response unwrapping or scoped loader is supplied here.
   for(const name of ['psMoveInFunds','psMoveInReadiness','psMoveInPossession','psMoveInBlockers','psMoveInAction'])window[name]=()=>'';
  });
  await page.addScriptTag({content:source});
  async function begin(lease='lease-a'){await page.evaluate(id=>{document.getElementById('moveInSection').setAttribute('data-mi-lease',id);window.loading=psMoveInLoad(id,'application-a');},lease);}
  async function resolve(data){await page.evaluate(data=>{pending.shift().resolve({data,meta:{source:'live',status:200}});},data);await page.evaluate(()=>loading);}
  await begin();await resolve({state:'forward_lease',lease:{start_date:'2027-08-01'},current_rent_roll_tenancy:false,possession:false});
  assert.doesNotMatch(await page.locator('#moveInSection').innerText(),/cannot be displayed/,'a known canonical state must not be reported as unsupported');
  assert.equal(await page.locator('#moveInSection h3').textContent(),'Move-in begins 2027-08-01','the actual canonical loader envelope reaches the known-state renderer');
  assert.match(await page.locator('#moveInSection').textContent(),/Not yet on the rent roll/);
  assert.match(await page.locator('#moveInSection').textContent(),/Possession pending/);
  await begin();await resolve({state:'future_unrecognized_state'});
  assert.match(await page.locator('#moveInSection').innerText(),/state cannot be displayed/,'a genuinely unknown server state remains unsupported');
  assert.equal(await page.locator('#moveInSection [data-mi-action]').count(),0,'unknown states grant no write');
  for(const status of [403,503]){
   await begin();await page.evaluate(status=>pending.shift().reject({status,message:'read refused'}),status);await page.evaluate(()=>loading);
   assert.match(await page.locator('#moveInSection').innerText(),status===503?/state unavailable/:/could not be loaded/,'access refusal and unavailable deployment remain distinct');
  }
  // Same-lease requests must obey generation, independently of completion order.
  await begin();await begin();
  await page.evaluate(()=>pending[1].resolve({data:{state:'keys_not_ready'},meta:{source:'live'}}));await page.evaluate(()=>loading);
  await page.evaluate(()=>pending[0].resolve({data:{state:'possession_delivered'},meta:{source:'live'}}));
  await page.evaluate(()=>Promise.resolve());
  assert.equal(await page.locator('#moveInSection h3').textContent(),'Access preparation remains open','a late earlier request cannot replace the later canonical state');
  await page.evaluate(()=>pending=[]);
  await begin();
  await page.evaluate(()=>{document.getElementById('moveInSection').setAttribute('data-mi-lease','lease-b');document.getElementById('moveInSection').textContent='Another lease';});
  await resolve({state:'possession_delivered'});
  assert.equal(await page.locator('#moveInSection').innerText(),'Another lease','a response never fills a different displayed lease');
  for(const changedScope of [{user_id:'staff-a',property_id:'property-b'},{user_id:'staff-b',property_id:'property-a'},null]){
   await page.evaluate(()=>scope={user_id:'staff-a',property_id:'property-a'});await begin();
   await page.evaluate(s=>{scope=s;document.getElementById('moveInSection').textContent='Scope changed';},changedScope);
   await resolve({state:'possession_delivered'});
   assert.equal(await page.locator('#moveInSection').innerText(),'Scope changed','a changed property, actor or signed-out session discards a late response');
  }
  console.log('PASS canonical move-in payload, honest errors and stale response custody');
  const packet={id:'packet-a',carries_governing_instrument:true,lifecycle_status:'executed',company_executed_at:'2026-09-13T12:00:00Z',signing_parties:[{signer_role:'tenant',complete:true}]};
  const offer={id:'offer-a',acknowledged_at:'2026-09-12T12:00:00Z'};
  const receipt={event_id:'audit-a',packet_id:'packet-a',actor_user_id:'signer-a',at:'2026-09-13T12:00:00Z',application_decision:'approve',decisions:[{decision:'application_approved'},{decision:'company_signed'}]};
  async function progress(d,n={code:'active'}){await page.evaluate(({d,n})=>document.getElementById('progress').innerHTML=psArProgress(d,n),{d,n});return page.locator('#progress').textContent();}
  const legacy={status:'active',application_offer:offer,packet,proposed_terms_confirmation:{id:'confirmation-a',source:'operator'}};
  let text=await progress(legacy);
  assert.match(text,/Application approved/);assert.match(text,/Proposed terms confirmed/,'an acknowledged offer does not erase a human confirmation');
  assert.match(text,/Company countersignature/);assert.doesNotMatch(text,/Execute/,'separate historical acts are not relabeled Execute');
  const derived={...legacy,proposed_terms_confirmation:{id:'confirmation-a',source:'authored_offer_acknowledged'}};
  text=await progress(derived);
  assert.match(text,/Authored offer acknowledged/);assert.match(text,/Company countersignature/);assert.doesNotMatch(text,/Execute/,'derived preparation alone proves no Execute act');
  assert.doesNotMatch(text,/Proposed terms confirmed/,'system preparation is not shown as human confirmation');
  text=await progress({...derived,status:'submitted',packet:{...packet,lifecycle_status:'resident_executed',company_executed_at:null}},{code:'execute_lease'});
  assert.equal(await page.locator('#progress .ps-ar-step.current').textContent(),'Application approval and company signatureCurrent step');
  assert.equal(await page.locator('#progress .ps-ar-step.done').filter({hasText:'Application approval and company signature'}).count(),0,'a prepared/signed packet does not manufacture application approval');
  text=await progress({...derived,execution_decision:receipt});
  assert.match(text,/Application approved and signed for the company \(Execute\)/);
  assert.equal(await page.locator('#progress .ps-ar-step.done').filter({hasText:'(Execute)'}).count(),1,'the actual current-packet Execute receipt completes the combined act');
  text=await progress({...derived,execution_decision:{...receipt,decisions:[{decision:'application_already_approved'},{decision:'company_signed'}]}});
  assert.match(text,/Application approved/);assert.match(text,/Signed for the company \(Execute\)/);
  assert.doesNotMatch(text,/Application approved and signed/,'Execute with earlier approval does not claim a new approval');
  for(const invalid of [{...receipt,packet_id:'other-packet'},{...receipt,event_id:null},null]){
   text=await progress({...derived,execution_decision:invalid});assert.doesNotMatch(text,/Execute/,'missing or foreign execution receipt cannot rewrite history');
  }
  console.log('PASS legacy history, derived preparation, actual Execute and prior-approval provenance');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
