"use strict";
// Class 3: actual history renderer and app styles, synthetic API-shaped data.
const fs=require('fs'), assert=require('./tests/assert_reporter');
const {chromium}=require('./tests/browser_runtime');
(async()=>{
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('function pcLiveHistoryHtml(card){');
  const end=html.indexOf('function pcLiveInfoHtml(st){',start);
  assert(start>=0&&end>start);
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.setContent('<main id="test"></main>');
    await page.addStyleTag({content:[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n')});
    await page.evaluate(()=>{
      window.pcLiveEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      window.pcLiveDay=()=>'';window.pcLiveDate=()=>'';
    });
    await page.addScriptTag({content:html.slice(start,end)});
    const entry={source:'outcome',summary:'Mike recorded the tour outcome — Ready to Apply',
      actor:{name:'Mike'},claim_strength:'asserted',detail:{standing:'ready_to_apply',notes:'Tour went great. Wants a high floor. <img src=x onerror="window.injected=true">'}};
    await page.evaluate(e=>{document.getElementById('test').innerHTML=pcLiveHistoryHtml({history:[e]});},entry);
    assert((await page.locator('#test').innerText()).includes(entry.detail.notes),'Original outcome notes must be visible');
    assert.equal(await page.locator('#test img').count(),0,'Notes must render as text');
    assert(await page.locator('.pcx-outcome-note').isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390),'Mobile history must not overflow horizontally');
    await page.evaluate(()=>{document.getElementById('test').innerHTML=pcLiveHistoryHtml({history:[{source:'outcome',summary:'Standing not established',detail:{notes:null}}]});});
    assert.equal(await page.locator('.pcx-outcome-note').count(),0,'Missing notes stay absent');
    console.log('PASS actual mobile history renderer: original notes, escaped content and absent notes');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
