// ════════════════════════════════════════════════════════════════════
//  OBLIGATION READ FAILURE — REAL-BROWSER PROOF, ALL EIGHT CONSUMERS
//
//  WHY THIS EXISTS. A deployment window was aborted mid-flight because a
//  failed obligations read rendered "Nothing needs you right now." The
//  loader was honest; two callers caught the throw and substituted [].
//  The audit then found six more consumers failing in two further ways:
//  one silent unhandled rejection, and five desks that threw to a toast
//  and left stale obligation content on screen.
//
//  A pass count cannot catch a surface nobody drove. So this harness
//  names all eight surfaces, records each as it executes, and asserts a
//  floor at the end: delete a case and the floor fails.
//
//  THE SHAPE OF EVERY CASE — this is the part that matters:
//      1. render REAL obligation content first
//      2. force the obligations read to fail
//      3. prove the prior content is GONE
//      4. prove a visible unavailable state appeared
//      5. prove no confident-empty wording appeared
//  Testing a clean initial page would not prove the stale-data defect
//  closed. The seeding step is the proof.
//
//  Real app artifact, real API on the security branch, real Postgres,
//  real canonical staff sessions, real HTTPS to the app's pinned origin.
// ════════════════════════════════════════════════════════════════════
const { chromium } = require(process.env.SP + '/node_modules/playwright');
const fs = require('fs');
const OUT = process.env.SP;
const S = JSON.parse(fs.readFileSync(OUT + '/sec_session.json', 'utf8'));

//  Every surface this harness must drive. Missing one fails the floor.
const REQUIRED = [
  'F1  renderMyWork',
  'F2  pvRenderMyWork',
  'F3  renderMaintenance',
  'F4  renderLeasing',
  'F5  renderManagement',
  'F6  renderReporting',
  'F7  renderCapital',
  'F8  openManagementDoor',
];
const SEEN = new Set();

//  Confident-empty wording, not just the one sentence that broke the window.
const CONFIDENT_EMPTY = [
  /Nothing needs you right now/i,
  /nothing to do/i,
  /no open work/i,
  /all caught up/i,
  /you'?re all set/i,
  /no items? (found|to show)/i,
];

let pass = 0, fail = 0;
const failures = [];
const ok = (v, m) => { if (!v) { fail++; failures.push(m); console.error('  ✗ ' + m); } else { pass++; } };
const P = (n) => { pass++; console.log('  ✓ ' + n); };

function newCtxScript(tok, uid, pid) {
  return (s) => { try { sessionStorage.setItem('__ps_staff_session__',
    JSON.stringify({ t: s.tok, m: { user_id: s.uid, property_id: s.pid } })); } catch (_) {} };
}

async function newPage(browser, token) {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 900 } });
  await ctx.addInitScript(newCtxScript(), { tok: token.tok, uid: token.uid, pid: token.pid });
  await ctx.addInitScript((s) => { try { sessionStorage.setItem('__ps_staff_session__',
    JSON.stringify({ t: s.tok, m: { user_id: s.uid, property_id: s.pid } })); } catch (_) {} },
    { tok: token.tok, uid: token.uid, pid: token.pid });
  const page = await ctx.newPage();
  const rejections = [];
  page.on('pageerror', (e) => rejections.push(String(e && e.message || e)));
  await page.goto('http://127.0.0.1:8081/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.loadObligations === 'function', null, { timeout: 25000 });
  await page.waitForTimeout(1800);
  return { page, ctx, rejections };
}

//  Force the NEXT obligations read to fail, at the loader — the same way a
//  removed route fails in production. Nothing else is stubbed.
async function breakObligations(page) {
  await page.evaluate(() => {
    window.__realLoadObligations = window.loadObligations;
    window.loadObligations = async () => { throw new Error('HTTP 404 — obligations route unavailable'); };
  });
}
async function restoreObligations(page) {
  await page.evaluate(() => { if (window.__realLoadObligations) window.loadObligations = window.__realLoadObligations; });
}

const textOf = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s); return el ? (el.innerText || el.textContent || '') : '';
}, sel);

//  One case, the full five-step shape.
async function surfaceCase(label, page, opts) {
  SEEN.add(label);
  const { seed, target, marker } = opts;

  // 1. real content first
  await restoreObligations(page);
  await seed();
  await page.waitForTimeout(700);
  const before = await textOf(page, target);
  ok(marker.test(before), `${label}: PRE-CONDITION — real obligation content must render first (got: ${before.slice(0,120)})`);

  // 2. force failure, 3-5. assert
  await breakObligations(page);
  await seed();
  await page.waitForTimeout(700);
  const after = await textOf(page, target);
  const state = await page.evaluate((s) => {
    const el = document.querySelector(s); return el ? el.getAttribute('data-ps-state') : null;
  }, target);

  ok(!marker.test(after), `${label}: STALE CONTENT REMAINED after the read failed — "${after.slice(0,140)}"`);
  ok(/unavailable/i.test(after), `${label}: no visible unavailable state — "${after.slice(0,140)}"`);
  ok(state === 'obligations-unavailable', `${label}: missing data-ps-state marker (got ${state})`);
  const lying = CONFIDENT_EMPTY.find((re) => re.test(after));
  ok(!lying, `${label}: CONFIDENT-EMPTY WORDING on a failed read — ${lying}`);
  if (!lying && /unavailable/i.test(after) && !marker.test(after)) P(`${label} — real content → failure → replaced by honest unavailable`);
  await restoreObligations(page);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--host-resolver-rules=MAP property-spine-api.onrender.com 127.0.0.1:443',
           '--ignore-certificate-errors', '--no-proxy-server'],
  });

  const { page, rejections } = await newPage(browser, { tok: S.tokFull, uid: S.uFull, pid: S.A });
  ok(await page.evaluate(() => window.__psLive.hasSession()) === true, 'a real canonical session must rehydrate');
  P('S0  real canonical staff session rehydrated by the real loader');

  //  the seeded Property A rows carry this label — the marker for "real content"
  const REAL = /Owner escalation|Call Dana Reed back|Renewal notice overdue|Work order closeout/i;

  //  renderMyWork partitions by the client-side persona model, not by the live
  //  team assignment. Select the one EXISTING persona with portfolio scope so
  //  real rows reach the surface. This configures who is looking — it does not
  //  stub, seed or fabricate obligation data, which still comes live from the API.
  await page.evaluate(() => window.setPreviewEmployee && window.setPreviewEmployee('emp_katie_leung'));
  await page.waitForTimeout(900);

  // ── F1 renderMyWork ───────────────────────────────────────────────
  await surfaceCase('F1  renderMyWork', page, {
    seed: () => page.evaluate(() => window.renderMyWork && window.renderMyWork()),
    target: '#myWorkMount', marker: REAL,
  });

  // ── F2 pvRenderMyWork ─────────────────────────────────────────────
  await surfaceCase('F2  pvRenderMyWork', page, {
    seed: () => page.evaluate(() => {
      let m = document.getElementById('hubMyWork');
      if (!m) { m = document.createElement('div'); m.id = 'hubMyWork'; document.body.appendChild(m); }
      return window.pvRenderMyWork && window.pvRenderMyWork();
    }),
    target: '#hubMyWork', marker: REAL,
  });

  // ── F4–F7 the four COMPOSED desks ─────────────────────────────────
  //  renderMaintenance is deliberately NOT in this list any more. These four
  //  fold obligations into their payloads (normalizeReportingPayload,
  //  managementCollectionRows), so no pane can be salvaged truthfully and the
  //  whole desk region is cleared. Maintenance does not: its four door tiles
  //  read maintenance, turn, supply and vendor sources and touch no
  //  obligation, and one of those tiles is the LIVE work-order door. Clearing
  //  #intelStrip there made a working surface unreachable because a
  //  neighbouring read failed. Its case is F3 below, with a stricter contract.
  const DESKS = [
    ['F4  renderLeasing',     'renderLeasing'],
    ['F5  renderManagement',  'renderManagement'],
    ['F6  renderReporting',   'renderReporting'],
    ['F7  renderCapital',     'renderCapital'],
  ];
  for (const [label, fn] of DESKS) {
    SEEN.add(label);
    //  1. seed visible obligation content into the desk region
    await restoreObligations(page);
    await page.evaluate(async (f) => {
      const strip = document.getElementById('intelStrip');
      if (strip) { strip.classList.remove('hidden'); strip.removeAttribute('data-ps-state'); }
      try { await window[f](true); } catch (_) {}
      //  guarantee a visible prior-content marker in the desk region, so the
      //  stale-content assertion is real rather than incidentally vacuous
      const s2 = document.getElementById('intelStrip');
      if (s2 && !/PRIOR-OBLIGATION-CONTENT/.test(s2.innerHTML)) {
        s2.insertAdjacentHTML('afterbegin', '<div>PRIOR-OBLIGATION-CONTENT Call Dana Reed back</div>');
      }
    }, fn);
    await page.waitForTimeout(500);
    const before = await textOf(page, '#intelStrip');
    ok(/PRIOR-OBLIGATION-CONTENT/.test(before), `${label}: PRE-CONDITION — prior desk content must be visible first`);

    //  2. fail the read and re-render the desk
    await breakObligations(page);
    await page.evaluate(async (f) => { try { await window[f](true); } catch (_) {} }, fn);
    await page.waitForTimeout(600);
    const after = await textOf(page, '#intelStrip');
    const state = await page.evaluate(() => { const e = document.getElementById('intelStrip'); return e ? e.getAttribute('data-ps-state') : null; });
    const metrics = await textOf(page, '#metrics');

    ok(!/PRIOR-OBLIGATION-CONTENT/.test(after), `${label}: STALE DESK CONTENT REMAINED — "${after.slice(0,140)}"`);
    ok(/unavailable/i.test(after), `${label}: no visible unavailable state — "${after.slice(0,140)}"`);
    ok(state === 'obligations-unavailable', `${label}: missing data-ps-state marker (got ${state})`);
    ok(metrics.trim() === '', `${label}: obligation-dependent metrics not cleared — "${metrics.slice(0,80)}"`);
    const lying = CONFIDENT_EMPTY.find((re) => re.test(after));
    ok(!lying, `${label}: CONFIDENT-EMPTY WORDING on a failed read — ${lying}`);
    if (!lying && /unavailable/i.test(after) && !/PRIOR-OBLIGATION-CONTENT/.test(after)) {
      P(`${label} — prior desk content cleared, honest unavailable rendered`);
    }
    await restoreObligations(page);
  }

  // ── F3 renderMaintenance — HONEST *AND* STILL REACHABLE ───────────
  //  Two facts, two assertions. The obligation-composed lanes must go
  //  unavailable (the honesty half, identical in spirit to F4–F7), AND the
  //  Work Orders tile must survive with live desk state behind it (the
  //  reachability half). The old desk-wide bail satisfied the first by
  //  destroying the second.
  SEEN.add('F3  renderMaintenance');
  {
    const TILE = "[onclick=\"openMaintenanceModule('workorders')\"]";
    await restoreObligations(page);
    await page.evaluate(async () => {
      const strip = document.getElementById('intelStrip');
      if (strip) { strip.classList.remove('hidden'); strip.removeAttribute('data-ps-state'); }
      try { await window.renderMaintenance(true); } catch (_) {}
      const s2 = document.getElementById('intelStrip');
      if (s2 && !/PRIOR-OBLIGATION-CONTENT/.test(s2.innerHTML)) {
        s2.insertAdjacentHTML('afterbegin', '<div>PRIOR-OBLIGATION-CONTENT Call Dana Reed back</div>');
      }
    });
    await page.waitForTimeout(500);
    ok(/PRIOR-OBLIGATION-CONTENT/.test(await textOf(page, '#intelStrip')),
      'F3: PRE-CONDITION — prior desk content must be visible first');

    await breakObligations(page);
    await page.evaluate(async () => { try { await window.renderMaintenance(true); } catch (_) {} });
    await page.waitForTimeout(600);

    const strip = await textOf(page, '#intelStrip');
    const human = await textOf(page, '#humanLane');
    const auto = await textOf(page, '#autoLane');
    const metrics = await textOf(page, '#metrics');

    //  the honesty half — unchanged in substance, relocated to the lanes
    //  that actually lost their source
    ok(!/PRIOR-OBLIGATION-CONTENT/.test(strip),
      `F3: STALE DESK CONTENT REMAINED — "${strip.slice(0,140)}"`);
    ok(/unavailable/i.test(human) && /unavailable/i.test(auto),
      `F3: obligation lanes did not report unavailable — "${human.slice(0,100)}" / "${auto.slice(0,100)}"`);
    ok(await page.evaluate(() => ['humanLane','autoLane'].every((id) => {
        const e = document.getElementById(id);
        return !!e && e.getAttribute('data-ps-state') === 'obligations-unavailable';
      })), 'F3: obligation lanes missing the data-ps-state marker');
    ok(metrics.trim() === '', `F3: obligation-dependent metrics not cleared — "${metrics.slice(0,80)}"`);
    const lyingM = CONFIDENT_EMPTY.find((re) => re.test(human) || re.test(auto));
    ok(!lyingM, `F3: CONFIDENT-EMPTY WORDING on a failed read — ${lyingM}`);

    //  the reachability half — the regression this case now also guards
    ok(await page.$(TILE) !== null,
      `F3: WORK ORDERS BECAME UNREACHABLE on an obligations failure — "${strip.slice(0,140)}"`);
    ok(await page.evaluate(() => typeof lastMaintenance !== 'undefined' && !!lastMaintenance),
      'F3: desk state absent, so the surviving tile would be a dead control');
    ok(await page.evaluate(() => {
        const e = document.getElementById('intelStrip');
        return !!e && e.getAttribute('data-ps-state') !== 'obligations-unavailable';
      }), 'F3: the whole desk was replaced by the obligations banner');

    if (!lyingM) P('F3  renderMaintenance — lanes honest, Work Orders still reachable');
    await restoreObligations(page);
  }

  // ── F8 openManagementDoor — the silent unhandled rejection ────────
  SEEN.add('F8  openManagementDoor');
  {
    await restoreObligations(page);
    await page.evaluate(async () => {
      try { await window.renderManagement(true); } catch (_) {}
      const s = document.getElementById('intelStrip');
      if (s) { s.classList.remove('hidden'); s.removeAttribute('data-ps-state');
        s.insertAdjacentHTML('afterbegin', '<div>PRIOR-OBLIGATION-CONTENT delinquency rows</div>'); }
    });
    await page.waitForTimeout(400);
    ok(/PRIOR-OBLIGATION-CONTENT/.test(await textOf(page, '#intelStrip')),
      'F8: PRE-CONDITION — prior door content must be visible first');

    const before = rejections.length;
    await breakObligations(page);
    await page.evaluate(() => window.openManagementDoor && window.openManagementDoor('delinquency'));
    await page.waitForTimeout(900);
    const after = await textOf(page, '#intelStrip');
    const state = await page.evaluate(() => { const e = document.getElementById('intelStrip'); return e ? e.getAttribute('data-ps-state') : null; });

    ok(!/PRIOR-OBLIGATION-CONTENT/.test(after), `F8: STALE DOOR CONTENT REMAINED — "${after.slice(0,140)}"`);
    ok(/unavailable/i.test(after), `F8: no visible unavailable state — "${after.slice(0,140)}"`);
    ok(state === 'obligations-unavailable', `F8: missing data-ps-state marker (got ${state})`);
    ok(rejections.length === before, `F8: UNHANDLED REJECTION — ${rejections.slice(before).join(' | ')}`);
    const lying = CONFIDENT_EMPTY.find((re) => re.test(after));
    ok(!lying, `F8: CONFIDENT-EMPTY WORDING on a failed read — ${lying}`);
    if (!lying) P('F8  openManagementDoor — no unhandled rejection, prior content replaced by honest unavailable');
    await restoreObligations(page);
  }

  // ── LEGITIMATE EMPTY MUST STILL WORK ──────────────────────────────
  //  A successful read with zero rows is NOT a failure and must keep its
  //  quiet empty line. If this ever flips to "unavailable", the repair has
  //  overcorrected and the surface lies in the other direction.
  {
    await page.evaluate(() => {
      window.__realLoadObligations = window.__realLoadObligations || window.loadObligations;
      window.loadObligations = async () => [];
    });
    await page.evaluate(() => window.renderMyWork && window.renderMyWork());
    await page.waitForTimeout(500);
    const t = await textOf(page, '#myWorkMount');
    ok(/Nothing needs you right now/i.test(t), `LEGITIMATE EMPTY regressed — a zero-row SUCCESS must keep its quiet empty line (got "${t.slice(0,120)}")`);
    ok(!/unavailable/i.test(t), `LEGITIMATE EMPTY mislabelled as unavailable — "${t.slice(0,120)}"`);
    P('E1  a successful zero-row read still renders the legitimate empty state');
    await restoreObligations(page);
  }

  // ── EXECUTION FLOOR ───────────────────────────────────────────────
  const missing = REQUIRED.filter((r) => !SEEN.has(r));
  ok(missing.length === 0, `FLOOR — surfaces never driven (${missing.length}): ${missing.join(' | ')}`);
  if (!missing.length) P(`FLOOR  all ${REQUIRED.length} obligation consumers driven through the failure path`);

  await browser.close();
  console.log(`\n═══ SURFACES: ${SEEN.size}/${REQUIRED.length} driven + 1 execution-floor assertion ═══`);
  console.log(`═══ RESULT: ${pass} passed · ${fail} failed ═══`);
  if (fail) { console.log('\nFAILURES:'); failures.forEach((f) => console.log('  - ' + f)); }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('HARNESS DIED:', e && e.stack || e); process.exit(1); });
