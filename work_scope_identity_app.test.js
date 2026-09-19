'use strict';
// Component interactions with controlled API replies; owned HTTP is separate.
const assert=require('./tests/assert_reporter'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('./tests/browser_runtime');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}}),posted=[];
  await page.exposeFunction('captureWork',p=>{posted.push(p);return {data:{receipt:{unit:'101',what_happens_next:[]}}};});
  await page.setContent('<main id="psUnitTriageCapture"></main>');
  await page.evaluate(()=>{window.__psLive={hasSession:()=>true,
   unitTriageOpenWalks:async()=>({data:{}}),unitTriageRisk:async()=>({data:{}}),
   proposeUnitTriage:async()=>({data:{proposal:{vacancy:'uncertain',initial_condition:'uncertain',inspection_completeness:'initial_triage',findings:[],required_work:[{work:'Bed B mentioned in prose'},{work:'Clean floor'}]},work_targets:[{space_id:'bed-a',space_label:'<Bed A>'},{space_id:'bed-b',space_label:'Bed B'}]}}),confirmUnitTriage:p=>window.captureWork(p)};});
  await page.addScriptTag({content:fs.readFileSync(process.env.WORK_SCOPE_PARENT_SOURCE||path.join(__dirname,'unit-triage-door.js'),'utf8')});
  await page.locator('#utUnit').fill('101');await page.locator('#utText').fill('Bed B needs work');await page.locator('#utPropose').click();await page.locator('#utConfirm').waitFor();
  assert.equal(await page.locator('.ut-work-scope').count(),2,'each work item has an explicit location control');
  assert.equal(await page.locator('.ut-work-scope').first().inputValue(),'unspecified','prose cannot choose a bed');
  assert.equal(await page.locator('option[value="space:bed-a"]').first().textContent(),'Rentable space: <Bed A>','label remains text');
  assert.equal(await page.locator('bed').count(),0,'label did not inject HTML');
  await page.locator('.ut-work-scope').nth(1).selectOption('space:bed-b');await page.locator('[data-drop="work"][data-i="0"]').click();await page.locator('#utConfirm').click();await page.waitForFunction(()=>window.__psUnitTriage._state.receipt!==null);
  assert.deepEqual(posted[0].required_work,[{work_text:'Clean floor',origin:'proposed',scope_kind:'rentable_space',space_id:'bed-b'}],'removing earlier work preserves selected identity');
  await page.locator('#utPropose').click();await page.locator('.ut-work-scope').first().selectOption('unit_wide');await page.locator('#utConfirm').click();await page.waitForFunction(()=>window.__psUnitTriage._state.receipt!==null);
  assert.deepEqual(posted[1].required_work,[{work_text:'Bed B mentioned in prose',origin:'proposed',scope_kind:'unit_wide'},{work_text:'Clean floor',origin:'proposed',scope_kind:'unspecified'}],'unit-wide and unspecified have no space id');
  console.log('work_scope_identity_app: browser component passed');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
