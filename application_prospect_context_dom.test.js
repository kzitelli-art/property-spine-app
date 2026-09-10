"use strict";
const fs=require('fs'),assert=require('node:assert/strict');const{chromium}=require('../api-fable-review-20260907/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage();await page.setContent('<main id="host"></main>');await page.addScriptTag({content:fs.readFileSync('application-offer-review.js','utf8')});
 await page.evaluate(()=>{window.reads=[];window.mode='normal';window.mount=()=>window.psMountApplicationOfferReview(document.getElementById('host'),{conversionId:'c',personId:'p',live:{loadResource:async(name,params)=>{reads.push({name,params});if(mode==='failed')throw Error('read failed');return{data:{person:{id:mode==='foreign'?'other':'p'},relationship:{vitals:mode==='empty'?{}:{budget:'0',unit_type:'high-floor studio',move_month:'2026-10'}}}};}},sendApplication:()=>{throw Error('No send in this proof');}});mount();});
 assert.equal(await page.locator('#lqProspectContext').count(),1,'shared selection must carry existing prospect context');
 await page.waitForFunction(()=>document.getElementById('lqProspectContext').textContent.includes('high-floor studio'));
 const text=await page.locator('#lqProspectContext').innerText();assert.match(text,/Budget: 0/);assert.match(text,/Move month: 2026-10/);assert.equal(await page.locator('#lqTargetStart').inputValue(),'','month must not invent an exact lease date');assert.equal(await page.locator('#lqTargetEnd').inputValue(),'');
 assert.deepEqual(await page.evaluate(()=>reads[0]),{name:'personCard',params:{personId:'p'}});
 for(const mode of ['failed','foreign']){await page.evaluate(m=>{window.mode=m;mount();},mode);await page.waitForFunction(()=>document.getElementById('lqProspectContext').textContent.includes('unavailable'));assert.doesNotMatch(await page.locator('#lqProspectContext').innerText(),/high-floor studio|No preferences recorded/);}
 await page.evaluate(()=>{mode='empty';mount();});await page.waitForFunction(()=>document.getElementById('lqProspectContext').textContent.includes('No preferences recorded'));
 console.log('PASS shared prospect context: scoped existing reader; zero/text; no invented dates; empty versus failed; wrong-person refusal');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
