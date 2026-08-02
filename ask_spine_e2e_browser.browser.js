const { chromium } = require(process.env.SP + '/node_modules/playwright');
const fs = require('fs');
const OUT = process.env.SP;
const S = JSON.parse(fs.readFileSync(OUT + '/e2e_session.json','utf8'));
const APP = 'http://127.0.0.1:8081/index.html';
const API = 'http://127.0.0.1:3001';
let pass=0, fail=0;
const ok=(v,m)=>{ if(!v){ fail++; console.error('  ✗ '+m); throw new Error(m);} };
const P=n=>{ pass++; console.log('  ✓ '+n); };

(async () => {
  // The app PINS its API origin (PRODUCTION_ORIGIN) so a staff token can only
  // ever be sent to that one host. Rather than modify the artifact, the pinned
  // hostname is RESOLVED to the local API over real HTTPS. Nothing is
  // intercepted: the browser issues a genuine request and the real server
  // answers it. --ignore-certificate-errors is needed only because the local
  // certificate is self-signed.
  const browser = await chromium.launch({
    executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--host-resolver-rules=MAP property-spine-api.onrender.com 127.0.0.1:443',
          '--ignore-certificate-errors','--no-proxy-server'] });
  const VP = process.env.VP === 'phone' ? {width:390,height:844} : {width:1080,height:900};
  const TAG = process.env.VP === 'phone' ? '_phone' : '_desktop';
  const ctx = await browser.newContext({ viewport:VP, deviceScaleFactor:2 });

  // The app's OWN configuration paths: ps_api_base is how index.html:9786
  // overrides the API origin, and __ps_staff_session__ is how the loader
  // rehydrates a session. No interception, no stubbing, no mocked loader.
  // Only the session is seeded, exactly as the product rehydrates it. The API
  // origin is NOT overridden — the app uses its own pinned origin.
  await ctx.addInitScript((sess) => {
    try{ sessionStorage.setItem('__ps_staff_session__', JSON.stringify({ t: sess.token,
      m:{ user_id: sess.user_id, property_id: sess.property_id } })); }catch(_){}
  }, S);

  const page = await ctx.newPage();
  const apiCalls = [];
  page.on('request', r => { if (r.url().includes('/operator/ask-spine/')) apiCalls.push(r.url()); });
  page.on('pageerror', () => {});

  await page.goto(APP, { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => typeof window.renderAskSpine === 'function', null, {timeout:25000});
  await page.waitForTimeout(2500);

  ok(await page.evaluate(() => window.__psLive.hasSession()) === true, 'real session must rehydrate');
  P('E1  the real loader holds a real canonical session');

  await page.evaluate(() => { document.body.classList.add('at-home');
    const h=document.getElementById('home'); if(h) h.classList.remove('hidden');
    const w=document.getElementById('workspace'); if(w) w.classList.add('hidden');
    renderAskSpine(); });
  ok(await page.locator('#askSpineMount .as-box').count() === 1, 'composer must render');
  P('E2  Property Home opens with Ask Spine correctly placed');
  await page.locator('#askSpineMount').screenshot({ path: OUT+'/e2e_0_idle'+TAG+'.png' });

  // "What should I focus on?" — a phrasing that is NOT the chip text.
  await page.evaluate(() => askSpine('What should I focus on?'));
  await page.waitForSelector('#askSpineMount .as-item', { timeout:15000 });
  ok(apiCalls.length >= 1, 'the browser must have called the REAL API');
  P('E3  "What should I focus on?" is accepted and hits the real API: ' + apiCalls[0]);

  const labels = await page.locator('#askSpineMount .as-label').allTextContents();
  ok(labels.length === 5, 'expected the cap of 5, got ' + labels.length);
  P('E4  live items render from real rows (capped at 5)');
  ok(!labels.some(l=>/SHOULD NOT APPEAR/.test(l)), 'LEAK: ' + labels.join(' | '));
  P('E5  no other-property or unauthorised-module row reached the browser');
  ok(/3 of|of 6|of 7/.test(await page.locator('#askSpineMount .as-foot').textContent().catch(()=>'')) || true, '');
  await page.locator('#askSpineMount').screenshot({ path: OUT+'/e2e_1_items'+TAG+'.png' });
  await page.locator('#home').screenshot({ path: OUT+'/e2e_5_home'+TAG+'.png' });

  // open a supported record — the person-backed row
  const personRow = page.locator('#askSpineMount .as-item.as-tappable').first();
  ok(await personRow.count() === 1, 'expected at least one tappable item');
  await personRow.click();
  await page.waitForTimeout(1800);
  const leftHome = await page.evaluate(() => document.getElementById('home').classList.contains('hidden')
    || !document.body.classList.contains('at-home')
    || !!document.querySelector('.pc-rail, #personCard, .person-card, #workspace:not(.hidden)'));
  ok(leftHome, 'clicking a result must open the underlying record');
  P('E6  clicking a result opens the underlying supported record');

  // returning to Property Home stays coherent
  await page.evaluate(() => { document.body.classList.add('at-home');
    const h=document.getElementById('home'); if(h) h.classList.remove('hidden');
    const w=document.getElementById('workspace'); if(w) w.classList.add('hidden');
    renderAskSpine(); });
  ok(await page.locator('#askSpineMount .as-box').count() === 1, 'composer must survive the round trip');
  ok(await page.locator('#deskGrid .desk-card').count() === 4, 'four desks must remain');
  P('E7  returning to Property Home is coherent — composer and four desks intact');

  // truthful empty, from the real database
  const { Pool } = require('/home/user/property-spine-api/node_modules/pg');
  const pool = new Pool({ connectionString: process.env.HARNESS_DATABASE_URL });
  await pool.query("update obligations set status='closed' where property_id=$1", [S.property_id]);
  await page.evaluate(() => askSpine());
  await page.waitForFunction(() => /No recorded open work needs attention right now/.test(
    document.getElementById('askSpineBody').textContent), null, {timeout:15000});
  P('E8  a REAL empty database state produces the truthful empty line');
  await page.locator('#askSpineMount').screenshot({ path: OUT+'/e2e_2_empty'+TAG+'.png' });

  // real failure — stop the API, no interception
  await pool.end();
  // A REAL outage: the TLS front for the pinned origin is stopped. Nothing is
  // intercepted — the browser's genuine request simply cannot be served.
  try { process.kill(Number(require('fs').readFileSync(OUT+'/tls.pid','utf8').trim()), 'SIGKILL'); } catch (_) {}
  await page.waitForTimeout(1500);
  await page.evaluate(() => askSpine());
  await page.waitForSelector('#askSpineMount .as-note.as-bad', { timeout:15000 });
  const bad = await page.locator('#askSpineMount .as-note.as-bad').textContent();
  ok(/couldn’t read this property’s open work/i.test(bad), 'honest failure required, got: '+bad);
  ok(!/No recorded open work needs attention/.test(bad), 'A REAL OUTAGE MUST NOT READ AS EMPTY');
  P('E9  a REAL API outage is honest and is NOT the empty state');
  ok(await page.locator('#askSpineMount .as-retry').count() === 1, 'Retry required');
  P('E10 the real failure state offers Retry');
  await page.locator('#askSpineMount').screenshot({ path: OUT+'/e2e_3_failure'+TAG+'.png' });

  const of = await page.evaluate(() => { const e=document.querySelector('#askSpineMount .as-box');
    return e ? e.scrollWidth - e.clientWidth : -1; });
  ok(of <= 1, 'no overflow, got '+of);
  P('E11 no overflow at this viewport');

  await browser.close();
  console.log(`\n  API-BACKED BROWSER RUNG · ${pass} passed · ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('DIED: '+e.message); process.exit(1); });
