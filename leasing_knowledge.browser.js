"use strict";
// Class 3: real app + full API over an owned local database. Only API origin
// is transformed, following ask_spine_dashboard_real_api.browser.js.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const apiRoot=path.resolve(process.env.KNOWLEDGE_API_ROOT||'../api-leasing-knowledge');
const {chromium}=require(path.join(apiRoot,'node_modules/playwright'));
const boundary=require(path.join(apiRoot,'tests/e2e/proof_boundary'));
async function main(){
  await boundary.assertDatabase();const dir=path.dirname(process.env.E2E_PROOF_MANIFEST);
  const session=JSON.parse(fs.readFileSync(path.join(dir,'knowledge-browser-session.json')));
  const html=fs.readFileSync('index.html','utf8').split('https://property-spine-api.onrender.com').join(session.base);
  const server=http.createServer((req,res)=>{const route=new URL(req.url,'http://127.0.0.1:5179').pathname;if(route==='/'||route==='/index.html'){res.setHeader('content-type','text/html; charset=utf-8');res.end(html);return;}const f=path.resolve('.'+decodeURIComponent(route));if(!f.startsWith(process.cwd()+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}res.setHeader('content-type',f.endsWith('.js')?'text/javascript':'application/octet-stream');fs.createReadStream(f).pipe(res);});
  await new Promise(r=>server.listen(5179,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:950}});
    await context.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)?route.continue():route.abort();});
    await context.addInitScript(s=>sessionStorage.setItem('__ps_staff_session__',JSON.stringify({t:s.token,m:{user_id:s.user_id,property_id:s.property_id}})),session);
    const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>console.log('page error',e.message));console.log('browser launched');await page.goto('http://127.0.0.1:5179',{waitUntil:'domcontentloaded'});
    console.log('page loaded');await page.waitForFunction(()=>window.__psLive&&window.__psLive.hasSession());
    await page.evaluate(()=>window.__psLive.verifySession());
    console.log('session verified');await page.screenshot({path:path.join(dir,'knowledge-start.png')});await page.locator('#gearBtn').click();await page.getByRole('button',{name:'Leasing knowledge',exact:true}).click();
    await page.locator('#lkTopic').selectOption('virtual_tours');
    const text='Representative 2BR / 1BA tour: https://my.matterport.com/show/?m=M7Lgne1gA72';
    await page.getByRole('textbox',{name:'Approved answer'}).fill(text);
    await page.getByRole('button',{name:'Save approved answer'}).click();
    await page.getByRole('status').filter({hasText:'Answer saved'}).waitFor();
    await page.screenshot({path:path.join(dir,'knowledge-editor.png')});
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.evaluate(()=>{document.body.classList.add('at-home');document.getElementById('home').classList.remove('hidden');renderAskSpine();});
    await page.locator('#askSpineIdleInput').fill('send me Skyline Matterport');await page.locator('#askSpineIdleInput').press('Enter');
    const link=page.locator('#askSpineMount a[href="https://my.matterport.com/show/?m=M7Lgne1gA72"]');await link.waitFor();assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
    await page.screenshot({path:path.join(dir,'knowledge-ask.png')});
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{_askSpineOpen=false;renderAskSpine();openLeasingKnowledge();});await page.locator('#lkTopic').waitFor();
    assert.ok(await page.locator('#leasingKnowledgeDialog').isVisible());await page.screenshot({path:path.join(dir,'knowledge-mobile.png')});
    await page.evaluate(()=>window.__psLive.clearSession());assert.equal(await page.locator('#leasingKnowledgeDialog').count(),0);
    console.log('PASS browser editor save, in-app Ask Spine clickable tour, mobile editor, sign-out clears knowledge');
  }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
