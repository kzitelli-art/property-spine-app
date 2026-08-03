// ════════════════════════════════════════════════════════════════════
//  Ask Spine Slice 1 — MOBILE REAL-OUTAGE PROOF (390px)
//  Narrow and failure-only. Real app, real API, real Postgres, real
//  HTTPS to the app's pinned origin. NO interception.
//  Shutdown is deterministic: the TLS front is killed by recorded PID,
//  and the harness waits for an actually-failed request before asserting.
// ════════════════════════════════════════════════════════════════════
const { chromium } = require(process.env.SP + '/node_modules/playwright');
const fs = require('fs');
const OUT = process.env.SP;
const S = JSON.parse(fs.readFileSync(OUT + '/e2e_session.json','utf8'));
let pass=0, fail=0;
const ok=(v,m)=>{ if(!v){ fail++; console.error('  ✗ '+m); throw new Error(m);} };
const P=n=>{ pass++; console.log('  ✓ '+n); };

(async () => {
  const browser = await chromium.launch({
    executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--host-resolver-rules=MAP property-spine-api.onrender.com 127.0.0.1:443',
          '--ignore-certificate-errors','--no-proxy-server'] });
  const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  await ctx.addInitScript((sess) => {
    try{ sessionStorage.setItem('__ps_staff_session__', JSON.stringify({ t: sess.token,
      m:{ user_id: sess.user_id, property_id: sess.property_id } })); }catch(_){}
  }, S);
  const page = await ctx.newPage();
  let failedRequests = 0;
  page.on('requestfailed', r => { if (r.url().includes('/operator/ask-spine/')) failedRequests++; });
  page.on('pageerror', () => {});

  await page.goto('http://127.0.0.1:8081/index.html', { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => typeof window.renderAskSpine === 'function', null, {timeout:25000});
  await page.waitForTimeout(2500);
  await page.evaluate(() => { document.body.classList.add('at-home');
    const h=document.getElementById('home'); if(h) h.classList.remove('hidden');
    const w=document.getElementById('workspace'); if(w) w.classList.add('hidden');
    renderAskSpine(); });

  // 1. a SUCCESSFUL response must render first, so we can prove staleness is cleared
  await page.evaluate(() => askSpine('Anything overdue?'));
  await page.waitForSelector('#askSpineMount .as-item', { timeout:20000 });
  const before = await page.locator('#askSpineMount .as-item').count();
  ok(before > 0, 'a successful response must render first');
  P(`M1  mobile: a successful Ask Spine response renders (${before} items)`);

  // 2. deterministic outage — kill the TLS front by recorded PID
  const pid = Number(fs.readFileSync(OUT+'/tls.pid','utf8').trim());
  process.kill(pid, 'SIGKILL');
  // wait until the port genuinely refuses, so the outage is real before we ask
  const net = require('net');
  const refused = await new Promise(res => {
    const t = setInterval(() => {
      const s = net.connect(443,'127.0.0.1');
      s.on('error', () => { clearInterval(t); s.destroy(); res(true); });
      s.on('connect', () => { s.destroy(); });
    }, 300);
    setTimeout(() => { clearInterval(t); res(false); }, 12000);
  });
  ok(refused, 'the pinned origin must actually be down before asserting');
  P('M2  mobile: the API is deterministically down (PID kill, port refuses)');

  // 3. submit another SUPPORTED request and wait for the request to actually fail
  await page.evaluate(() => askSpine('What should I focus on?'));
  await page.waitForFunction(() => document.querySelector('#askSpineMount .as-note.as-bad') !== null,
    null, { timeout:25000 });
  ok(failedRequests >= 1, 'the browser must have issued a request that genuinely failed');
  P(`M3  mobile: the submitted request genuinely failed at the network (${failedRequests})`);

  const body = await page.locator('#askSpineBody').textContent();
  ok(await page.locator('#askSpineMount .as-item').count() === 0, 'STALE ITEMS REMAINED: ' + body.slice(0,120));
  P('M4  mobile: stale items are removed');
  ok(/couldn’t read this property’s open work/i.test(body), 'unavailable message required, got: '+body.slice(0,120));
  P('M5  mobile: the unavailable message appears');
  ok(await page.locator('#askSpineMount .as-retry').count() === 1, 'Retry required');
  P('M6  mobile: Retry appears');
  ok(!/No recorded open work needs attention/i.test(body), 'EMPTY-SUCCESS LANGUAGE ON FAILURE: '+body.slice(0,160));
  ok(!/nothing (needs|requires)/i.test(body), 'empty-success language leaked');
  P('M7  mobile: NO empty-success claim appears');
  const of = await page.evaluate(() => { const e=document.querySelector('#askSpineMount .as-box');
    return e ? e.scrollWidth - e.clientWidth : -1; });
  ok(of <= 1, 'horizontal overflow at 390px: '+of+'px');
  P('M8  mobile: no horizontal overflow at 390px');

  await page.locator('#askSpineMount').screenshot({ path: OUT+'/e2e_3_failure_phone.png' });
  await browser.close();
  console.log(`\n  MOBILE REAL-OUTAGE RUNG · ${pass} passed · ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('DIED: '+e.message); process.exit(1); });
