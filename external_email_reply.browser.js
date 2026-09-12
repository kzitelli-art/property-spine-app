"use strict";
// Class 3: actual Person Card composer/handlers with scoped API-shaped adapters.
const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('../api-fable-review-20260907/node_modules/playwright');
(async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const start=html.indexOf('function pcLiveComposerHtml(st){'),end=html.indexOf('function pcLiveCommsHtml(st){',start);assert(start>=0&&end>start);
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  for(const scenario of ['record','lost_response','foreign_owner','future_time','missing_email','rejected_edit','refresh_failure','closed','different_person']){
  const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'America/New_York'});await page.route('https://component.invalid/**',route=>route.fulfill({contentType:'text/html',body:'<main id="composer"></main><p id="notice"></p>'}));await page.goto('https://component.invalid/');page.on('pageerror',e=>console.error('PAGE ERROR '+e.message));
  await page.addStyleTag({content:[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n')});
  await page.evaluate(scenario=>{
   window.state={card:{person:{id:'person',name:'Email Prospect',phone:null,email:'prospect@example.invalid'}},detail:{conversation_id:'conversation',mode:'human_takeover',human_owner:{user_id:'staff',obligation_id:'work',status:'in_progress'}},opts:{conversation_id:'conversation'},compose:'',sending:false};
   if(scenario==='foreign_owner')state.detail.human_owner.user_id='other-staff';
   if(scenario==='missing_email')state.card.person.email=null;
   window.calls=[];window.pcLiveState=()=>state;window.pcLiveIsClosed=()=>scenario==='closed';window.pcLiveConversationId=()=>state.opts.conversation_id;window.pcLiveFirstName=s=>s.split(' ')[0];
   window.pcLiveEsc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   window.pcRenderLiveCard=()=>{document.getElementById('composer').innerHTML=pcLiveComposerHtml(state);document.getElementById('notice').textContent=state.notice?.text||'';};
   window.pcLiveSetNotice=(tone,text)=>{state.notice={tone,text};pcRenderLiveCard();};
   window.pcLiveRefreshAll=async()=>{if(scenario==='refresh_failure')throw Error('Read unavailable');pcRenderLiveCard();};
   window.__psLive={sessionMeta:()=>({user_id:'staff'}),sendConversationReply:async p=>{
    calls.push(JSON.parse(JSON.stringify(p)));
    if(scenario==='lost_response'&&calls.length===1){state.detail.messages=[{channel:'text',direction:'outbound',body:p.body}];throw Error('Response lost');}
    if(scenario==='rejected_edit'&&calls.length===1){const e=Error('Recipient changed');e.status=409;throw e;}
    if(scenario==='different_person')await new Promise(resolve=>window.release=resolve);
    return {data:{recorded:true,replayed:calls.length>1,dispatched:false,provider_delivery:'not_verified',comm_event:{id:'event'},external_email_reply:{recipient:p.recipient,occurred_at:p.occurred_at,actor_user_id:'staff'}}};}};
  },scenario);
  await page.addScriptTag({content:html.slice(start,end)});await page.evaluate(()=>pcRenderLiveCard());
  if(scenario==='missing_email'||scenario==='closed'){assert.equal(await page.locator('#pcxRecordEmail').count(),0);assert.equal(await page.evaluate(()=>calls.length),0);}
  else{
   assert.equal(await page.getByRole('button',{name:'Record sent email',exact:true}).count(),1,'email-only prospects can record an external reply through the existing composer');
   assert(await page.locator('#pcxRecordEmail').isDisabled(),'empty/unattested form never records');
   assert.equal(await page.locator('#pcxEmailTo').getAttribute('readonly'),'');
   await page.locator('#pcxEmailBody').fill('Here is the floor plan. <img src=x onerror=alert(1)>');
   await page.locator('#pcxEmailTime').fill(scenario==='future_time'?'2099-08-01T14:30:01':'2026-08-01T14:30:01');
   await page.locator('#pcxEmailReference').fill('Manual email reference');
   assert(await page.locator('#pcxRecordEmail').isDisabled(),'body/time alone never attests an email');
   await page.locator('#pcxEmailAttest').check();
   if(scenario==='foreign_owner'){assert(await page.locator('#pcxRecordEmail').isDisabled());assert.equal(await page.evaluate(()=>calls.length),0);}
   else{
    await page.locator('#pcxRecordEmail').click();
    if(scenario==='different_person'){
     await page.waitForFunction(()=>window.release);
     await page.evaluate(()=>{window.state={...state,opts:{conversation_id:'other'},notice:null};window.release();});
     await page.waitForTimeout(25);assert.equal(await page.evaluate(()=>state.notice),null,'a completed request cannot overwrite another person card');
    }else{
     await page.waitForFunction(()=>document.getElementById('notice').textContent);
     if(scenario==='future_time')assert.equal(await page.evaluate(()=>calls.length),0,'future send time makes no write');
     else{
      if(scenario==='lost_response'){
       assert(await page.locator('#pcxEmailBody').isDisabled(),'uncertain recording locks the exact request until replay');
       assert((await page.locator('#notice').innerText()).includes('could not be confirmed'),'same-body text never masquerades as email confirmation');
       await page.getByRole('button',{name:'Retry recording',exact:true}).click();await page.waitForFunction(()=>calls.length===2&&state.sending===false);
       const calls=await page.evaluate(()=>window.calls);assert.deepEqual(calls[0],calls[1],'lost-response retry carries identical key/body/recipient/time/reference');
      }
      if(scenario==='rejected_edit'){
       assert(!(await page.locator('#pcxEmailBody').isDisabled()),'definite server rejection permits correction');await page.locator('#pcxEmailBody').fill('Corrected recorded body');await page.locator('#pcxRecordEmail').click();await page.waitForFunction(()=>calls.length===2&&state.sending===false);
       const calls=await page.evaluate(()=>window.calls);assert.notEqual(calls[0].idempotency_key,calls[1].idempotency_key);
      }
      const call=(await page.evaluate(()=>window.calls)).at(-1);assert.equal(call.channel,'email');assert.equal(call.already_sent,true);assert.equal(call.recipient,'prospect@example.invalid');assert.equal(call.occurred_at,'2026-08-01T18:30:01.000Z','actual local sent time carries explicit timezone');assert.equal(call.external_reference,'Manual email reference');
      assert((await page.locator('#notice').innerText()).includes(scenario==='refresh_failure'?'could not be refreshed':'Delivery is not verified'));
      assert.equal(await page.evaluate(()=>state.detail.mode),'human_takeover');
     }
    }
   }
   assert.equal(await page.locator('#composer img').count(),0,'email body is rendered as text');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390),'mobile composer does not overflow');
  }
  console.log('PASS external email component: '+scenario);
  await page.close();
  }
  const page=await browser.newPage();await page.setContent('<main></main>');
  const labelStart=html.indexOf('function pcLiveDeliveryLabel(message){'),labelEnd=html.indexOf('function pcLiveMessageList(st){',labelStart);await page.addScriptTag({content:html.slice(labelStart,labelEnd)});
  assert.equal(await page.evaluate(()=>pcLiveDeliveryLabel({channel:'email',provider_status:'recorded_external',external_email_reply:{kind:'external_email_reply'}})),'Email recorded by staff · delivery unverified');
  assert.equal(await page.evaluate(()=>pcLiveDeliveryLabel({channel:'text',provider_status:'delivered'})),'Delivered');await page.close();console.log('PASS external provenance label and existing text delivery semantics');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
