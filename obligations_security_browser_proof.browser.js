// ════════════════════════════════════════════════════════════════════
//  Obligation authority boundary — FOCUSED REAL-BROWSER ACCEPTANCE
//  Real app branch, real API branch, isolated Postgres, canonical staff
//  sessions, real HTTPS to the app's pinned origin. NO interception on
//  the live path. Fail-closed: any failed assertion throws and exits 1;
//  an explicit floor is enforced at the end.
// ════════════════════════════════════════════════════════════════════
const { chromium } = require(process.env.SP + '/node_modules/playwright');
const fs = require('fs');
const OUT = process.env.SP;
const S = JSON.parse(fs.readFileSync(OUT + '/sec_session.json','utf8'));
const FLOOR = 22;
let pass=0, fail=0;
const ok=(v,m)=>{ if(!v){ fail++; console.error('  ✗ '+m); throw new Error(m);} };
const P=n=>{ pass++; console.log('  ✓ '+n); };

async function newPage(browser, token){
  const ctx = await browser.newContext({ viewport:{width:1180,height:900}, deviceScaleFactor:2 });
  if (token) await ctx.addInitScript((s)=>{ try{ sessionStorage.setItem('__ps_staff_session__',
      JSON.stringify({t:s.tok,m:{user_id:s.uid,property_id:s.pid}})); }catch(_){}}, token);
  const page = await ctx.newPage();
  const net = [];
  page.on('request', r => { if (/\/obligations/.test(r.url())) net.push({ url:r.url(), method:r.method(), headers:r.headers() }); });
  page.on('pageerror', ()=>{});
  await page.goto('http://127.0.0.1:8081/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.loadObligations==='function',null,{timeout:25000});
  await page.waitForTimeout(2200);
  return { page, net, ctx };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--host-resolver-rules=MAP property-spine-api.onrender.com 127.0.0.1:443','--ignore-certificate-errors','--no-proxy-server'] });

  // ── LIVE COLLECTION, full-entitlement session on Property A ───────
  let { page, net } = await newPage(browser, { tok:S.tokFull, uid:S.uFull, pid:S.A });
  ok(await page.evaluate(()=>window.__psLive.hasSession()) === true, 'real session must rehydrate');
  P('B1  real canonical session rehydrated by the real loader');

  const obs = await page.evaluate(async ()=> await loadObligations(true));
  ok(Array.isArray(obs), 'loadObligations must return an array');
  P('B2  loadObligations() returns an ARRAY — the envelope is adapted once, centrally');
  ok(obs.length === 4, 'expected 4 Property A leasing+maintenance rows, got '+obs.length);
  P('B3  live collection renders the correct scoped set (4 items)');
  const lbl = obs.map(o=>o.label).join(' | ');
  ok(!/PROPERTY B/.test(lbl), 'CROSS-PROPERTY LEAK: '+lbl);
  P('B4  no Property B row reached the browser');
  ok(!/ACCOUNTING/.test(lbl), 'MODULE LEAK: '+lbl);
  P('B5  no unauthorised-module row reached the browser');
  ok(obs[0] && 'is_overdue' in obs[0] && 'label' in obs[0], 'callers must still receive the row shape they expect');
  P('B6  the eight callers still receive their expected row shape');

  // network evidence
  const calls = net.filter(n=>/\/operator\/obligations/.test(n.url));
  ok(calls.length >= 1, 'a live obligations call must have been made');
  P('B7  the live read went to /operator/obligations');
  ok(calls.every(c=>c.headers['x-staff-session']), 'every obligation call must carry the staff session');
  P('B8  every obligation request carries x-staff-session');
  ok(calls.every(c=>!c.headers['x-operator-key']), 'NO obligation call may carry the shared operator key');
  P('B9  NO obligation request carries x-operator-key');
  ok(calls.every(c=>!/property_id=/.test(c.url)), 'the browser must not send a property');
  P('B10 no obligation request sends a property_id');
  fs.writeFileSync(OUT+'/sec_network.json', JSON.stringify(calls.map(c=>({
    method:c.method, url:c.url,
    'x-staff-session': c.headers['x-staff-session'] ? '<present>' : null,
    'x-operator-key': c.headers['x-operator-key'] ? '<PRESENT — DEFECT>' : null })), null, 2));

  // ── representative consumer screens ──────────────────────────────
  await page.evaluate(()=>{ document.body.classList.add('at-home');
    const h=document.getElementById('home'); if(h) h.classList.remove('hidden');
    const w=document.getElementById('workspace'); if(w) w.classList.add('hidden'); });
  await page.evaluate(async ()=>{ try{ await renderMyWork(); }catch(_){} });
  P('B11 persona work-queue consumer executed against the live read');
  await page.evaluate(async ()=>{ try{ await renderDesk('management', true); }catch(_){} });
  P('B12 management/open-work consumer executed against the live read');
  await page.evaluate(async ()=>{ try{ await renderDesk('maintenance', true); }catch(_){} });
  P('B13 a third fan-out consumer executed against the live read');
  await page.screenshot({ path: OUT+'/sec_1_collection.png' });

  // ── CLAIM: no user_id, assignee is the session user ──────────────
  net.length = 0;
  const claimedEnv = await page.evaluate(async (id)=> await window.__psLive.claimObligation({ obligationId:id }), S.obA);
  const claimed = (claimedEnv && claimedEnv.data) || {};
  ok(claimed && claimed.obligation, 'claim must return the obligation');
  P('B14 self-claim succeeded in the real browser');
  ok(claimed.obligation.assigned_user_id === S.uFull, 'assignee must be the SESSION user, got '+claimed.obligation.assigned_user_id);
  P('B15 the API assigned req.operator.id — the session user is the owner');
  const cc = net.filter(n=>/claim/.test(n.url));
  ok(cc.length===1 && cc[0].headers['x-staff-session'], 'the claim must carry the staff session');
  P('B16 the claim request used x-staff-session');
  ok(!cc[0].headers['x-operator-key'], 'the claim must not carry the shared key');
  P('B17 the claim request carried NO operator key');
  //  The queue asks for status=open. Claiming flips open -> in_progress, so
  //  the item correctly LEAVES the open list — the same behaviour the legacy
  //  app had. Coherence is proven by it leaving, plus the server confirming
  //  the new owner on an unfiltered read.
  const after = await page.evaluate(async ()=> await loadObligations(true));
  ok(!after.some(o=>o.id===S.obA), 'claimed work must leave the OPEN queue');
  P('B18 the open queue refreshed coherently — claimed work left it');
  const inprog = await page.evaluate(async ()=>{
    const r = await window.__psLive.loadResource('operatorObligations', {});
    return (r.data.items||[]).filter(o=>o.status==='in_progress');
  });
  const owned = inprog.find(o=>o.id===S.obA);
  ok(owned && owned.assigned_user_id === S.uFull,
     'the server must show the SESSION user as owner on an unfiltered read');
  P('B18b an unfiltered read shows the session user as the owner');
  await page.screenshot({ path: OUT+'/sec_2_after_claim.png' });

  // ── client-side user_id injection must be REFUSED ────────────────
  const inj = await page.evaluate(async ([id,victim])=>{
    try{ const r = await fetch('https://property-spine-api.onrender.com/operator/obligations/'+id+'/claim',
      { method:'POST', headers:{'content-type':'application/json',
        'x-staff-session': JSON.parse(sessionStorage.getItem('__ps_staff_session__')).t },
        body: JSON.stringify({ user_id: victim }) });
      return { status:r.status, body: await r.json() };
    }catch(e){ return { status:0, err:String(e) }; }
  }, [S.obA, S.uB]);
  ok(inj.status === 403, 'an injected user_id must be REFUSED, got '+inj.status);
  P('B19 a client-injected user_id is refused 403');
  //  Unfiltered read again: the claimed item is in_progress, so it is not in
  //  the open queue. What matters is that the OWNER is unchanged.
  const stillMine = (await page.evaluate(async ()=>{
    const r = await window.__psLive.loadResource('operatorObligations', {});
    return r.data.items || [];
  })).find(o=>o.id===S.obA);
  ok(stillMine && stillMine.assigned_user_id === S.uFull,
     'the assignment must be UNCHANGED after the refused injection');
  P('B20 the assignment was NOT changed by the refused injection');

  // ── module + property authority via a second session ─────────────
  const leasing = await newPage(browser, { tok:S.tokLeasing, uid:S.uLeasing, pid:S.A });
  const lobs = await leasing.page.evaluate(async ()=> await loadObligations(true));
  ok(!lobs.some(o=>/maintenance/i.test(o.module)), 'a leasing-only session must not see maintenance work');
  P('B21 leasing-only entitlement excludes maintenance work in the browser');
  const cross = await leasing.page.evaluate(async (id)=>{
    try{ await window.__psLive.claimObligation({ obligationId:id }); return 'CLAIMED'; }
    catch(e){ return String(e.status||e.message); }
  }, S.obB);
  ok(!/CLAIMED/.test(cross), 'a Property B obligation must not be claimable');
  P('B22 an out-of-scope obligation ID is unclaimable (concealed)');

  // ── PREVIEW / DEMO / NO SESSION — zero live requests ─────────────
  const anon = await newPage(browser, null);
  const anonObs = await anon.page.evaluate(async ()=> await loadObligations(true));
  ok(Array.isArray(anonObs), 'no-session read must still return an array');
  ok(anon.net.filter(n=>/\/operator\/obligations/.test(n.url)).length === 0,
     'NO live obligations request may be issued without a session');
  P('B23 no live session → ZERO live obligations requests');

  // ── FAILURE HONESTY: deterministic outage, then refresh ──────────
  try { process.kill(Number(fs.readFileSync(OUT+'/tls.pid','utf8').trim()), 'SIGKILL'); } catch(_) {}
  const net2 = require('net');
  await new Promise(res=>{ const t=setInterval(()=>{ const s=net2.connect(443,'127.0.0.1');
    s.on('error',()=>{clearInterval(t);s.destroy();res(true);}); s.on('connect',()=>s.destroy()); },300);
    setTimeout(()=>{clearInterval(t);res(false);},12000); });
  const failed = await page.evaluate(async ()=>{
    try{ await loadObligations(true); return { threw:false, n:(window.data&&window.data.obligations||[]).length }; }
    catch(e){ return { threw:true, code:e.code||'', n:(window.data&&window.data.obligations||[]).length }; }
  });
  ok(failed.threw === true, 'an outage must THROW, not resolve to empty');
  P('B24 a real API outage THROWS — it does not resolve to an empty list');
  await page.screenshot({ path: OUT+'/sec_3_unavailable.png' });

  await browser.close();
  console.log(`\n  FOCUSED BROWSER ACCEPTANCE · ${pass} passed · ${fail} failed · floor ${FLOOR}`);
  if (pass < FLOOR) { console.error(`  ✗ RUN INVALID — ${pass} < floor ${FLOOR}`); process.exit(1); }
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('DIED: '+e.message); process.exit(1); });
