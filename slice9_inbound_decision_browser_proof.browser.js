// ════════════════════════════════════════════════════════════════════
//  Slice 9 — INBOUND-OPPORTUNITY DECISION, REAL-BROWSER ACCEPTANCE.
//  Real app, real API branch behind the pinned origin, isolated Postgres,
//  canonical staff sessions. Fail-closed. Desktop + 390px mobile screenshots.
//  Run: SP=<dir with slice9_session.json + node_modules/playwright> node <this>
// ════════════════════════════════════════════════════════════════════
const { chromium } = require(process.env.SP + '/node_modules/playwright');
const fs = require('fs');
const OUT = process.env.SP;
const S = JSON.parse(fs.readFileSync(OUT + '/slice9_session.json', 'utf8'));
let pass = 0, fail = 0;
const ok = (v, m) => { if (!v) { fail++; console.error('  ✗ ' + m); throw new Error(m); } pass++; console.log('  ✓ ' + m); };

async function newPage(browser, token, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1180, height: 900 }, deviceScaleFactor: 2 });
  if (token) await ctx.addInitScript((s) => { try { sessionStorage.setItem('__ps_staff_session__',
    JSON.stringify({ t: s.tok, m: { user_id: s.uid, property_id: s.pid } })); } catch (_) {} }, token);
  const page = await ctx.newPage();
  const net = [];
  page.on('request', r => { if (/onrender\.com/.test(r.url())) net.push({ url: r.url(), method: r.method() }); });
  page.on('pageerror', () => {});
  await page.goto('http://127.0.0.1:8081/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__psLive && typeof window.openInboundDecision === 'function', null, { timeout: 25000 });
  await page.waitForTimeout(1200);
  return { page, net, ctx };
}
const drawerText = (page) => page.evaluate(() => (document.getElementById('sheetBody') || {}).textContent || '');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--host-resolver-rules=MAP property-spine-api.onrender.com 127.0.0.1:443', '--ignore-certificate-errors', '--no-proxy-server'] });

  // ── ASSIGNED OPERATOR: claim then open ─────────────────────────────
  let { page } = await newPage(browser, { tok: S.tokFull, uid: S.uFull, pid: S.A });
  await page.evaluate(async (id) => { await window.__psLive.claimObligation({ obligationId: id }); }, S.obD1);
  await page.evaluate(async (id) => { await openInboundDecision(id); }, S.obD1);
  await page.waitForTimeout(800);
  let t = await drawerText(page);
  ok(/replied after the opportunity was closed/i.test(await page.evaluate(() => document.getElementById('sheetTitle').textContent)),
    'B1  the header is the plain sentence');
  ok(/Circumstances changed, still interested/.test(t), 'B2  the EXACT inbound message renders');
  ok(/Dana/.test(t), 'B3  the person\'s safe name renders');
  ok(!/UNASSIGNED/.test(t), 'B4  the assigned operator sees themselves as owner (not UNASSIGNED)');
  ok(/Opportunity from/.test(t) && /budget didn't fit/i.test(t), 'B5  ONE candidate with plain close reason');
  ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(t), 'B6  no UUID is displayed anywhere');
  ok(!/rank|score|recommend|best match/i.test(t), 'B7  no ranking or recommendation language');
  ok(await page.evaluate(() => document.getElementById('ibdConfirm') && document.getElementById('ibdConfirm').disabled),
    'B8  one candidate still requires explicit confirmation (button starts disabled)');
  await page.screenshot({ path: OUT + '/ibd_1_one_candidate.png' });

  // ── COVERAGE OPERATOR opens the UNASSIGNED several-candidate case ──
  const cover = await newPage(browser, { tok: S.tokCover, uid: S.uCover, pid: S.A });
  await cover.page.evaluate(async (id) => { await openInboundDecision(id); }, S.obD2);
  await cover.page.waitForTimeout(800);
  let t2 = await drawerText(cover.page);
  ok(/UNASSIGNED/.test(t2), 'B9  a coverage operator opens the unassigned decision, ownership stated');
  ok((t2.match(/Opportunity from/g) || []).length === 3, 'B10 several candidates all offered (3)');
  ok(/move timing didn't fit/i.test(t2) && /Open/.test(t2), 'B11 each carries plain state and reason');
  await cover.page.screenshot({ path: OUT + '/ibd_2_several_candidates.png' });

  // ── UNAUTHORIZED PROPERTY cannot ───────────────────────────────────
  const other = await newPage(browser, { tok: S.tokB, uid: S.uB, pid: S.B });
  await other.page.evaluate(async (id) => { await openInboundDecision(id); }, S.obD1);
  await other.page.waitForTimeout(600);
  ok(/could not be read/i.test(await drawerText(other.page)),
    'B12 another property\'s operator cannot read the decision');

  // ── ZERO CANDIDATES stays open with the exact sentence ─────────────
  await page.evaluate(async (id) => { await openInboundDecision(id); }, S.obDZ);
  await page.waitForTimeout(700);
  t = await drawerText(page);
  ok(/No opportunity can be identified yet\. This decision remains open\./.test(t),
    'B13 zero candidates shows the exact open sentence');
  ok(!(await page.evaluate(() => !!document.getElementById('ibdConfirm'))),
    'B14 and offers no confirm action to mis-click');
  await page.screenshot({ path: OUT + '/ibd_3_zero_candidates.png' });

  // ── FAILED RESOLUTION stays visible ────────────────────────────────
  await page.evaluate(async (id) => { await openInboundDecision(id); }, S.obD1);
  await page.waitForTimeout(700);
  const failOut = await page.evaluate(async (ob) => {
    window.__inboundDecision.selected = '00000000-0000-0000-0000-000000000000';
    try { await submitInboundDecision(); } catch (_) {}
    await new Promise(r => setTimeout(r, 600));
    return document.getElementById('sheetBody').textContent;
  }, S.obD1);
  ok(/stays open/i.test(failOut), 'B15 a failed resolution shows the blocked reason and stays open');
  //  obD1 was CLAIMED earlier (open -> in_progress), so the open-filtered list
  //  correctly excludes it. The truthful claim: it is still IN the queue and
  //  NOT complete after the failed resolution.
  const stillMine = await page.evaluate(async () => {
    const r = await window.__psLive.loadResource('operatorObligations', {});
    return (r.data.items || []).map(o => ({ id: o.id, status: o.status }));
  });
  const d1row = stillMine.find(o => o.id === S.obD1);
  ok(d1row && d1row.status !== 'complete', 'B16 the obligation remains in the queue, not complete, after the failure');

  // ── SUCCESSFUL SELECTION reopens exactly one ───────────────────────
  await page.evaluate(async (id) => { await openInboundDecision(id); }, S.obD2);
  await page.waitForTimeout(700);
  await page.evaluate(async (opp) => {
    window.__inboundDecision.selected = opp;
    const b = document.getElementById('ibdConfirm'); b.disabled = false;
    await submitInboundDecision();
  }, S.d2.opps[0]);
  await page.waitForTimeout(900);
  t = await drawerText(page);
  ok(/Decision recorded/i.test(await page.evaluate(() => document.getElementById('sheetTitle').textContent))
     || /reopened/i.test(t), 'B17 a plain receipt renders after success');
  ok(/remains attached to the conversation/i.test(t), 'B18 the receipt says the reply stays on the conversation');
  await page.screenshot({ path: OUT + '/ibd_4_receipt.png' });

  //  Server truth: exactly ONE reopen, the sibling untouched, decision gone.
  const truth = await page.evaluate(async (S) => {
    const tok = JSON.parse(sessionStorage.getItem('__ps_staff_session__')).t;
    const det = await fetch('https://property-spine-api.onrender.com/operator/obligations/' + S.obD2 + '/inbound-decision',
      { headers: { 'x-staff-session': tok } });
    const open = await (await fetch('https://property-spine-api.onrender.com/operator/obligations?status=open',
      { headers: { 'x-staff-session': tok } })).json();
    const d = await det.json();
    return { status: d.obligation && d.obligation.status, openIds: (open.items || []).map(o => o.id),
             cands: (d.candidates || []).map(c => ({ id: c.opportunity_id, state: c.state })) };
  }, S);
  ok(truth.status === 'complete', 'B19 the decision is complete on the server');
  ok(!truth.openIds.includes(S.obD2), 'B20 and it LEFT the open queue — only after successful resolution');
  const reopened = truth.cands.find(c => c.id === S.d2.opps[0]);
  const sibling = truth.cands.find(c => c.id === S.d2.opps[1]);
  ok(reopened && reopened.state === 'open', 'B21 the SELECTED opportunity is reopened');
  ok(sibling && sibling.state === 'closed', 'B22 the other closed opportunity remains terminal');

  // ── DUPLICATE ACTION is idempotent (no second reopen) ──────────────
  const dup = await page.evaluate(async (S) => {
    const tok = JSON.parse(sessionStorage.getItem('__ps_staff_session__')).t;
    const r = await fetch('https://property-spine-api.onrender.com/operator/obligations/' + S.obD2 + '/inbound-decision/resolve',
      { method: 'POST', headers: { 'content-type': 'application/json', 'x-staff-session': tok },
        body: JSON.stringify({ opportunity_id: S.d2.opps[0] }) });
    return await r.json();
  }, S);
  ok(dup.idempotent === true, 'B23 a duplicate confirm is idempotent — no duplicate reopen event');

  // ── NO SESSION: honest message, zero live decision calls ───────────
  const anon = await newPage(browser, null);
  anon.net.length = 0;
  await anon.page.evaluate(async (id) => { await openInboundDecision(id); }, S.obD1);
  await anon.page.waitForTimeout(500);
  ok(/Sign in to open this decision/i.test(await drawerText(anon.page)), 'B24 no session → honest sign-in message');
  ok(anon.net.filter(n => /inbound-decision/.test(n.url)).length === 0, 'B25 and ZERO live decision requests — no fixture fallback');

  // ── 390px MOBILE ───────────────────────────────────────────────────
  const mob = await newPage(browser, { tok: S.tokCover, uid: S.uCover, pid: S.A }, { width: 390, height: 844 });
  await mob.page.evaluate(async (id) => { await openInboundDecision(id); }, S.obD1);
  await mob.page.waitForTimeout(800);
  ok(/replied after the opportunity was closed/i.test(await mob.page.evaluate(() => document.getElementById('sheetTitle').textContent)),
    'B26 the decision renders at 390px');
  await mob.page.screenshot({ path: OUT + '/ibd_5_mobile_390.png' });

  await browser.close();
  console.log(`\n  inbound decision browser: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('DIED: ' + e.message); console.log(`\n  inbound decision browser: ${pass} passed, ${fail + 1} failed`); process.exit(1); });
