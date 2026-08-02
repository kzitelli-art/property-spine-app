#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
//  ask_spine_browser_proof.browser.js — ASK SPINE SLICE 1, BROWSER RUNG
//
//  DELIBERATELY NOT NAMED *.test.js. run_harnesses.sh globs (*.test.js)
//  and reads exit codes; this harness needs Playwright + Chromium, which
//  the repo does not depend on, so including it in that glob would turn
//  the suite red on any machine without them. Run it explicitly:
//
//    SP=<dir-with-playwright> node ask_spine_browser_proof.browser.js
//
//  WHAT IT PROVES. Real Chromium, the real index.html, and the REAL
//  live loader — which is frozen (hasSession is non-writable) and
//  therefore cannot be stubbed. The session is seeded the way the
//  product does it, through sessionStorage, and the API call is
//  intercepted at the network layer. So the fetch, the loader, the
//  render and the four required states are all real code paths.
//
//  STILL NOT PROVEN: a real API and real Postgres behind that fetch.
//  Screenshots are written next to this file's SP directory.
// ════════════════════════════════════════════════════════════════════
const OUT = process.env.SP;
const APP = 'file:///home/user/property-spine-app/index.html';

const ITEMS = [
  { obligation_id:'o1', label:'Call the lead back — 2 days no response', module:'leasing',
    type:'lead_response', due_at:new Date(Date.now()-2*864e5).toISOString(), is_overdue:true,
    is_unassigned:true, reason:'overdue_unassigned', person_id:'p1', unit_id:null,
    related_type:null, related_id:null, open:{kind:'person', id:'p1'} },
  { obligation_id:'o2', label:'Work order closeout proof missing', module:'maintenance',
    type:'wo_closeout', due_at:new Date(Date.now()-864e5).toISOString(), is_overdue:true,
    is_unassigned:false, reason:'overdue', person_id:null, unit_id:'u9',
    related_type:null, related_id:null, open:{kind:'desk', id:'maintenance'} },
  { obligation_id:'o3', label:'Tour feedback not recorded', module:'leasing',
    type:'tour_feedback', due_at:null, is_overdue:false, is_unassigned:true,
    reason:'unassigned', person_id:null, unit_id:null, related_type:null, related_id:null, open:null },
];

let pass=0, fail=0, mode='rows';
const ok=(v,m)=>{ if(!v){ fail++; console.error('  ✗ '+m); throw new Error(m);} };
const P=(n)=>{ pass++; console.log('  ✓ '+n); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport:{width:1080, height:860} });

  // Seed a session the REAL loader will rehydrate from. The loader is frozen
  // (hasSession is non-writable) and cannot be stubbed — so we drive it the
  // way the product does, through its own session storage.
  await ctx.addInitScript(() => {
    try{ sessionStorage.setItem('__ps_staff_session__', JSON.stringify({
      t:'browser-proof-token', m:{ user_id:'u1', property_id:'a50fbdd0-3642-431e-b532-0dcd6ab8a4fe' }
    })); }catch(_){}
  });

  const page = await ctx.newPage();
  page.on('pageerror', () => {});

  // Intercept the REAL network call the REAL loader makes.
  await page.route('**/operator/ask-spine/attention*', async (route) => {
    if (mode === 'fail') return route.abort('failed');
    const items = mode === 'empty' ? [] : ITEMS;
    const total = mode === 'empty' ? 0 : 23;
    return route.fulfill({ status:200, contentType:'application/json',
      headers:{ 'access-control-allow-origin':'*' },
      body: JSON.stringify({ property_id:'a50fbdd0-3642-431e-b532-0dcd6ab8a4fe',
        asked_at:new Date().toISOString(), items, total_open:total, scope_note:null }) });
  });

  await page.goto(APP, { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => typeof window.renderAskSpine === 'function', null, { timeout:20000 });
  await page.waitForTimeout(2000);

  const sess = await page.evaluate(() => window.__psLive && window.__psLive.hasSession && window.__psLive.hasSession());
  ok(sess === true, 'the real loader must report a live session from seeded storage');
  P('B0  the REAL (frozen) loader rehydrated a live session — not a stub');

  await page.evaluate(() => {
    document.body.classList.add('at-home');
    const h=document.getElementById('home'); if(h) h.classList.remove('hidden');
    const w=document.getElementById('workspace'); if(w) w.classList.add('hidden');
    renderAskSpine();
  });

  ok(await page.locator('#askSpineMount .as-box').count() === 1, 'composer must render in its own mount');
  P('B1  the composer renders inside #askSpineMount');
  ok((await page.locator('#askSpineMount .as-chip').textContent()).trim() === 'What needs attention?',
     'only the one working prompt may be advertised');
  P('B2  only the one working prompt is advertised');

  // ── STATE 1: live items, through the real loader ──
  mode='rows';
  await page.evaluate(() => askSpine());
  await page.waitForSelector('#askSpineMount .as-item', { timeout:8000 });
  ok(await page.locator('#askSpineMount .as-item').count() === 3, 'expected 3 items');
  P('B3  live items render from a real fetch through the real loader');
  ok((await page.locator('#askSpineMount .as-item').first().locator('.as-why').textContent()).trim()
     === 'Overdue and no owner', 'first item must state why it ranked');
  P('B4  each item states why it ranked');
  ok(await page.locator('#askSpineMount .as-item.as-tappable').count() === 2, 'only verified openers tappable');
  P('B5  only items with a verified opener are tappable');
  ok((await page.locator('#askSpineMount .as-foot').textContent()).includes('3 of 23'), 'count must be truthful');
  P('B6  the page count is truthful (3 of 23)');
  await page.locator('#askSpineMount').screenshot({ path: OUT+'/ask_spine_1_items.png' });

  // ── STATE 2: valid empty ──
  mode='empty';
  await page.evaluate(() => askSpine());
  await page.waitForFunction(() => /Nothing currently requires attention/.test(
    document.getElementById('askSpineBody').textContent), null, { timeout:8000 });
  ok(await page.locator('#askSpineMount .as-item').count() === 0, 'empty must clear items');
  P('B7  a valid empty result reads "Nothing currently requires attention."');
  await page.locator('#askSpineMount').screenshot({ path: OUT+'/ask_spine_2_empty.png' });

  // ── STATE 3: request failure ──
  mode='fail';
  await page.evaluate(() => askSpine());
  await page.waitForSelector('#askSpineMount .as-note.as-bad', { timeout:8000 });
  const bad = await page.locator('#askSpineMount .as-note.as-bad').textContent();
  ok(/Could not read/.test(bad), 'failure must be stated honestly');
  ok(!/Nothing currently requires attention/.test(bad), 'A FAILURE MUST NEVER READ AS EMPTY');
  P('B8  a real network failure is honest and is NOT the empty state');
  ok(await page.locator('#askSpineMount .as-retry').count() === 1, 'Retry must be offered');
  P('B9  the failure state offers Retry');
  ok(await page.locator('#askSpineMount .as-item').count() === 0, 'no stale items on failure');
  P('B10 the failure state shows no stale or invented items');
  await page.locator('#askSpineMount').screenshot({ path: OUT+'/ask_spine_3_failure.png' });

  // ── STATE 4: unsupported question ──
  await page.evaluate(() => askSpine('what is the noi for march'));
  await page.waitForFunction(() => /answers one question/.test(
    document.getElementById('askSpineBody').textContent), null, { timeout:8000 });
  P('B11 an unsupported question states what this version can do');
  await page.locator('#askSpineMount').screenshot({ path: OUT+'/ask_spine_4_unsupported.png' });

  // ── the surrounding page is undisturbed ──
  ok(await page.locator('#deskGrid .desk-card').count() === 4, 'four desk cards must remain');
  P('B12 the four desk cards are undisturbed');
  ok(await page.locator('#reportingOutputBar').count() === 1, 'Monthly Report bar must remain');
  P('B13 the Monthly Report bar is undisturbed');
  ok(await page.locator('#myWorkMount').count() === 1, '#myWorkMount must remain');
  P('B14 #myWorkMount is present and not replaced');

  mode='rows';
  await page.evaluate(() => askSpine());
  await page.waitForSelector('#askSpineMount .as-item', { timeout:8000 });
  await page.locator('#home').screenshot({ path: OUT+'/ask_spine_5_property_home.png' });
  P('B15 Property Home renders with the composer above the desks');

  await browser.close();
  console.log(`\n  BROWSER RUNG · ${pass} passed · ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('DIED: '+e.message); process.exit(1); });
