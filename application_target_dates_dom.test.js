"use strict";
const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('../api-fable-review-20260907/node_modules/playwright');
const html=fs.readFileSync('application-offer-review.js','utf8'),start=html.indexOf('function chooseUnit(headingMsg)');
const source=html.slice(start,html.indexOf('\n        function reviewOffer',start));
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const page=await browser.newPage();await page.setContent('<main id="host"></main>');
    const result=await page.evaluate(async source=>{
      const host2=document.getElementById('host'),q=id=>document.getElementById(id),pending=[];
      const sessionMod={leaseableUnits:()=>new Promise(resolve=>pending.push(resolve))};
      const choose=new Function('host2','q','esc','sessionMod','reviewOffer','var applicationSelectionTerm=null;function loadProspectContext(){}'+source+';return chooseUnit;')(host2,q,String,sessionMod,()=>{});
      const submit=()=>{q('lqTargetStart').value='2026-10-01';q('lqTargetEnd').value='2027-09-30';q('lqFindHomes').click();};
      choose();submit();choose();submit();
      pending[0]({eligible:[],unsupported:[]});await new Promise(r=>setTimeout(r,5));
      const stillBusy=q('lqFindHomes').disabled;
      pending[1]({eligible:[],unsupported:[]});await new Promise(r=>setTimeout(r,5));
      const finished=!q('lqFindHomes').disabled;
      submit();pending[2]({eligible:[{unit_id:'u',space_id:'b',unit_number:'101',intended_move_in:'2026-10-01',turnover:{turn_gap_days:1,outgoing_lease_end_date:'2026-09-30',expected_ready_date:'2026-10-01'}}],unsupported:[]});await new Promise(r=>setTimeout(r,5));
      const targetText=q('lqUnitWrap').textContent;
      submit();q('lqTargetStart').value='2026-11-01';q('lqTargetStart').dispatchEvent(new Event('input'));
      pending[3]({eligible:[{unit_id:'stale',space_id:'old'}],unsupported:[]});await new Promise(r=>setTimeout(r,5));
      return {stillBusy,finished,targetText,changedDateChoices:q('lqUnitWrap').querySelectorAll('button').length};
    },source);
    assert.equal(result.stillBusy,true,'a stale request cannot release the new picker request');
    assert.equal(result.finished,true);
    assert.equal(result.changedDateChoices,0,'a response for prior dates cannot show choices');
    assert.doesNotMatch(result.targetText,/vacancy window/i,'date arithmetic does not establish vacant possession or maintenance time');
    assert.match(result.targetText,/Lease ends 2026-09-30/);assert.match(result.targetText,/Expected ready 2026-10-01/);
    console.log('PASS stale-request and recorded turn-date DOM controls');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
