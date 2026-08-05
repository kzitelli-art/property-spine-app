// ════════════════════════════════════════════════════════════════════
//  WORK ORDERS MUST SURVIVE AN OBLIGATIONS FAILURE — REAL-BROWSER PROOF
//
//  WHY THIS EXISTS. A failed /operator/obligations read made the LIVE
//  work-order door unreachable. renderMaintenance() called
//  deskObligationsUnavailable() and returned. That did two things nobody
//  intended:
//
//    1. deskObligationsUnavailable() replaces #intelStrip outright — and
//       #intelStrip is the element that carries the four door tiles. The
//       Work Orders tile was collateral damage of a banner about
//       something else.
//    2. The `return` fired BEFORE `lastMaintenance` was assigned, so even
//       a tile that had survived would have hit openMaintenanceModule()'s
//       `if(!st)` guard and toasted "Open Maintenance first."
//
//  The Work Orders door reads no obligation of any kind. The route to it
//  did. That is real coupling, and this harness is the condition that
//  keeps it uncoupled.
//
//  WHAT MAKES THIS A PROOF AND NOT A RESTATEMENT:
//
//   · The obligations read fails as a REAL HTTP 503 from a real server,
//     travelling through the app's own frozen __psLive loader. No page
//     function is patched to simulate the failure. loadObligations()
//     throws because the wire said 503, which is what production does.
//   · The stub implements the API's SERVER contract only — the bare
//     { property_id, count, work_orders } that src/maintenance/
//     maintenance.js:651 actually returns. The { data, meta } envelope is
//     built by the real frozen loader in the page. Modelling a contract
//     production never produces is precisely the defect that let the
//     original break through 99 green assertions; the stub is not
//     allowed to be the thing that unwraps.
//   · Navigation is REAL CLICKS. A surface is not shipped until the proof
//     enters it the way the operator enters it (owner ruling, 2026-08-05).
//     The desk is opened by clicking the desk card; the door is opened by
//     clicking the tile.
//   · The door's own entry point is instrumented, so "navigation reached
//     it" is OBSERVED, not inferred from what ended up on screen.
//
//  FALSIFICATION. Run it against a copied tree with the routing fix
//  reverted and it must go red:
//      node work_orders_reachable_when_obligations_fail.browser.js <dir>
//
//  Usage:
//      SP=/path/with/node_modules/playwright \
//        node work_orders_reachable_when_obligations_fail.browser.js [appDir]
// ════════════════════════════════════════════════════════════════════
const path = require('path');
const fs = require('fs');
const http = require('http');

const SP = process.env.SP;
if (!SP) { console.error('SP must point at a dir containing node_modules/playwright'); process.exit(2); }
const { chromium } = require(SP + '/node_modules/playwright');

const APP_DIR = path.resolve(process.argv[2] || __dirname);
const LIVE_ORIGIN = 'https://property-spine-api.onrender.com';

let pass = 0, fail = 0;
const failures = [];
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); console.error('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
};
const section = (t) => console.log('\n' + t + '\n' + '-'.repeat(t.length));

//  Every case this harness must drive. Deleting one fails the floor, so a
//  green run cannot be produced by quietly dropping a case.
const REQUIRED = ['A obligations-fail route', 'B control obligations-ok', 'C honest lanes'];
const SEEN = new Set();

// ── THE SERVER CONTRACT, AS THE API ACTUALLY RETURNS IT ─────────────
//  Shapes taken from src/maintenance/maintenance.js:651 and the fields
//  work-lifecycle-door.js reads (work_order / current / proof).
const WO_ROWS = [
  { work_order: { id: 'wo-nav-1', unit_number: '701', title: 'radiator knocking', reference: 'WO-701-A' },
    current: { state: 'reported', accountable: 'UNASSIGNED', resident_exception: null, resident_coordination: null },
    proof: { satisfied: false } },
  { work_order: { id: 'wo-nav-2', unit_number: '312', title: 'kitchen faucet dripping', reference: 'WO-312-B' },
    current: { state: 'accepted', accountable: { name: 'Marcus Vale' }, accepted_at: '2026-08-05T14:02:00Z',
               resident_exception: null, resident_coordination: null },
    proof: { satisfied: false } },
];
const WO_PAYLOAD = { property_id: 'prop-harness', count: WO_ROWS.length, work_orders: WO_ROWS };

//  Flipped per case. The obligations read is the thing under test.
let OBLIGATIONS_FAIL = true;
const apiCalls = [];

function stubApi() {
  return http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    apiCalls.push(req.method + ' ' + u.pathname);
    const json = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    //  THE AUTHORITY HANDSHAKE. §21 — the browser requests, the SERVER
    //  decides. The shell refuses to leave preview until /operator/me
    //  confirms the rehydrated token and names the property and the
    //  entitled modules. Shape from src/identity/operator.js:235.
    if (u.pathname === '/operator/me') {
      return json(200, { id: 'user-harness', name: 'Dana Reed', role: 'property_manager',
                         property_id: 'prop-harness', property_name: 'Harness Property',
                         allowed_modules: ['management', 'leasing', 'maintenance', 'capital'],
                         platform_role: 'member' });
    }
    if (u.pathname === '/operator/obligations') {
      //  THE INDUCED FAILURE — a real HTTP status from a real server, not a
      //  patched function. This is what the API returns when the read dies.
      if (OBLIGATIONS_FAIL) return json(503, { error: 'unavailable', detail: 'The live obligations read is unavailable. Retry.' });
      return json(200, { items: [] });
    }
    if (u.pathname === '/operator/work-orders/status') return json(200, WO_PAYLOAD);
    if (u.pathname === '/operator/work-orders/technicians') return json(200, { technicians: [] });
    return json(200, {});
  });
}

function staticApp(dir) {
  const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
                  '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
  return http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(dir, rel);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end('not found');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
}

const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
const textOf = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s); return el ? (el.innerText || el.textContent || '') : '';
}, sel);

//  Wording that would be a lie on a failed read.
const CONFIDENT_EMPTY = [/\bClear\.?$/im, /nothing needs you/i, /all caught up/i, /no open work/i];

const TILE = "[onclick=\"openMaintenanceModule('workorders')\"]";
const DESK_CARD = "[onclick=\"openDesk('maintenance')\"]";

//  Receipts. Written only for a run against the working tree — a
//  falsification run must not overwrite the evidence it is falsifying.
const SHOT_DIR = path.join(__dirname, 'docs', 'work-orders-obligations-failure');
const WRITE_SHOTS = APP_DIR === __dirname;
async function shot(page, name, opts) {
  if (!WRITE_SHOTS) return;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  //  The lanes sit below the desk fold, so a viewport shot of the lane
  //  assertion would be byte-identical to the tile shot and prove nothing.
  //  Anything claiming the lanes captures the full page.
  await page.screenshot(Object.assign({ path: path.join(SHOT_DIR, name), fullPage: false }, opts || {}));
}

(async () => {
  console.log('APP DIR : ' + APP_DIR);
  const api = stubApi(); const apiPort = await listen(api);
  const app = staticApp(APP_DIR); const appPort = await listen(app);
  console.log('stub api: 127.0.0.1:' + apiPort + '   app: 127.0.0.1:' + appPort);

  //  The pre-installed Chromium. PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD is set in
  //  this environment, so the driver's own build number will not match what
  //  is on disk — point at the binary rather than downloading a second one.
  const CHROME = process.env.PS_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(fs.existsSync(CHROME) ? { executablePath: CHROME } : {});
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 1300 } });

  //  The pinned production origin, redirected at the TRANSPORT layer. The
  //  loader is frozen, non-writable and non-configurable by design — which
  //  is the point: nothing in the page is patched to make this pass.
  await ctx.route(LIVE_ORIGIN + '/**', async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const r = await fetch('http://127.0.0.1:' + apiPort + u.pathname + u.search, {
      method: req.method(), headers: req.headers(),
      body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postData(),
    });
    await route.fulfill({ status: r.status, contentType: 'application/json', body: await r.text() });
  });

  //  Session continuity through the app's own rehydration path.
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('__ps_staff_session__', JSON.stringify({
        t: 'harness-staff-token', m: { user_id: 'user-harness', property_id: 'prop-harness' } }));
    } catch (e) { /* the assertions below will show it */ }
  });

  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e && e.message || e)));

  await page.goto('http://127.0.0.1:' + appPort + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.startApp === 'function', null, { timeout: 20000 });
  await page.evaluate(() => window.startApp());
  await page.waitForFunction(() => document.body.classList.contains('entered'), null, { timeout: 20000 });

  section('PRE-CONDITIONS — the shipped page, before anything is clicked');
  ok('a rehydrated session boots the signed-in shell',
    await page.evaluate(() => window.__psLive.hasSession() && !document.body.classList.contains('preview-mode')));
  ok('the page registers the live work-order door',
    await page.evaluate(() => !!(window.__psWorkOrders && typeof window.__psWorkOrders.open === 'function')));
  ok('the fixture library IS present in the page (so "no fixtures" means refused, not absent)',
    await page.evaluate(() => {
      const lib = window.__WO_FLOW_LIBRARY || {};
      return Object.keys(lib).reduce((a, k) => a + (lib[k] || []).length, 0) > 0;
    }));

  //  Instrument the door's own entry point so reaching it is OBSERVED.
  const instrument = () => page.evaluate(() => {
    window.__navOpenedDoor = 0;
    if (!window.__doorWrapped) {
      const real = window.__psWorkOrders.open;
      window.__psWorkOrders.open = function () { window.__navOpenedDoor++; return real.apply(this, arguments); };
      window.__doorWrapped = true;
    }
  });
  await instrument();

  const openDeskByClick = async () => {
    await page.evaluate(() => { document.getElementById('home').classList.remove('hidden'); });
    await page.waitForSelector(DESK_CARD, { timeout: 15000 });
    await page.click(DESK_CARD);
    await page.waitForTimeout(1200);
  };

  // ══════════════════════════════════════════════════════════════════
  section('A. OBLIGATIONS READ FAILS — the desk must still route to Work Orders');
  SEEN.add('A obligations-fail route');
  OBLIGATIONS_FAIL = true;
  {
    apiCalls.length = 0;
    await page.evaluate(() => { window.__navOpenedDoor = 0; });
    await openDeskByClick();

    // ── 1. THE FAILURE IS REAL, AND IT REACHED THE PAGE ──────────────
    ok('the obligations read actually went to the live origin and failed',
      apiCalls.some((c) => c === 'GET /operator/obligations'), apiCalls.join(', '));
    ok('...and the desk observed it as a failure, not an empty list',
      await page.evaluate(async () => {
        try { await window.loadObligations(true); return false; } catch (e) { return /503|unavailable/i.test(e.message); }
      }));

    // ── 2. THE DESK SURVIVED ─────────────────────────────────────────
    const stripText = await textOf(page, '#intelStrip');
    ok('THE WORK ORDERS TILE IS ON SCREEN after the obligations failure',
      await page.$(TILE) !== null, stripText.slice(0, 160));
    //  `lastMaintenance` is a module-scoped `let`, so it is NOT on window —
    //  the bare identifier is what openMaintenanceModule()'s `if(!st)` guard
    //  actually reads, and that is what must be truthy.
    ok('...and the desk state exists, so the tile is not a dead control',
      await page.evaluate(() => typeof lastMaintenance !== 'undefined' && !!lastMaintenance));
    ok('the desk was NOT replaced by the whole-desk obligations banner',
      await page.evaluate(() => {
        const e = document.getElementById('intelStrip');
        return e.getAttribute('data-ps-state') !== 'obligations-unavailable';
      }), stripText.slice(0, 160));
    ok('the other three tiles survived too', (await page.$$('.mh-door')).length === 4,
      String((await page.$$('.mh-door')).length));
    await shot(page, '01-desk-survives-obligations-failure.png');

    // ── 3. THE REAL CLICK REACHES THE LIVE DOOR ──────────────────────
    //  A missing tile is the defect itself, not a reason to die. Trap #1 of
    //  this release was a harness whose death printed nothing and read like a
    //  clean stop. If the tile is gone, every assertion below is FAILED
    //  explicitly and the run reports a readable red.
    const tileGone = (await page.$(TILE)) === null;
    if (tileGone) {
      ['CLICKING THE TILE REACHES window.__psWorkOrders.open()',
       '...and the live door\'s own host element is what rendered',
       '...and no "Open Maintenance first" toast fired',
       'the click performed the live work-order read over the pinned origin',
       'real rows from the live read are on screen',
       '...and it is the queue, not a single row',
       'no fixture resident names reached the screen',
       'the retired fixture dashboard did not render',
      ].forEach((n) => ok(n, false, 'WORK ORDERS IS UNREACHABLE — no tile to click'));
    } else {
    await page.click(TILE);
    await page.waitForSelector('#workOrdersBody .wo-row, #workOrdersBody [data-wo-empty], #workOrdersBody [data-wo-unavailable]',
      { timeout: 20000 });

    ok('CLICKING THE TILE REACHES window.__psWorkOrders.open()',
      await page.evaluate(() => window.__navOpenedDoor === 1),
      'navOpenedDoor=' + await page.evaluate(() => window.__navOpenedDoor));
    ok('...and the live door\'s own host element is what rendered',
      await page.evaluate(() => !!document.getElementById('workOrdersBody')));
    ok('...and no "Open Maintenance first" toast fired',
      !/Open Maintenance first/i.test(await textOf(page, 'body')));

    // ── 4. IT IS THE LIVE READ, AND LIVE ROWS ────────────────────────
    ok('the click performed the live work-order read over the pinned origin',
      apiCalls.includes('GET /operator/work-orders/status'), apiCalls.join(', '));
    const doorText = await textOf(page, '#intelStrip');
    ok('real rows from the live read are on screen',
      /radiator knocking/.test(doorText), doorText.slice(0, 200));
    ok('...and it is the queue, not a single row',
      (await page.$$eval('#workOrdersBody .wo-row', (e) => e.length)) === 2,
      String(await page.$$eval('#workOrdersBody .wo-row', (e) => e.length)));
    ok('no fixture resident names reached the screen',
      !/\(215\) 555-01/.test(doorText) && !/__flow_demo/.test(doorText), doorText.slice(0, 200));
    ok('the retired fixture dashboard did not render',
      !/RESPOND|SET PLAN|more to plan/i.test(doorText));
    await shot(page, '02-door-reached-by-clicking-the-tile.png');
    }
  }

  // ══════════════════════════════════════════════════════════════════
  section('C. THE OBLIGATION LANES STILL TELL THE TRUTH');
  SEEN.add('C honest lanes');
  {
    await openDeskByClick();
    const human = await textOf(page, '#humanLane');
    const auto = await textOf(page, '#autoLane');
    ok('the Needs Attention lane says the work could not be READ',
      /unavailable/i.test(human), human.slice(0, 140));
    ok('the System / AI lane says the same', /unavailable/i.test(auto), auto.slice(0, 140));
    //  Null-safe on purpose: the pre-fix code cleared the whole .lanes
    //  section, so these elements did not merely lose their marker — they
    //  stopped existing. That must read as a failure, not a crash.
    ok('both lanes carry the obligations-unavailable marker',
      await page.evaluate(() => ['humanLane', 'autoLane'].every((id) => {
        const e = document.getElementById(id);
        return !!e && e.getAttribute('data-ps-state') === 'obligations-unavailable';
      })));
    const lying = CONFIDENT_EMPTY.find((re) => re.test(human) || re.test(auto));
    ok('neither lane used confident-empty wording on a failed read', !lying, String(lying));
    ok('obligation-dependent metrics are cleared',
      (await textOf(page, '#metrics')).trim() === '');

    //  THE ASSERTION THAT MATTERS MOST HERE. body.maintenance-v6-mode hides
    //  .lanes, so every lane assertion above can pass while the operator sees
    //  a desk that looks perfectly healthy. Visibility is a separate fact
    //  from presence and needs its own assertion — this caught a real hole.
    ok('the obligations failure is VISIBLE on the desk, not only in a hidden lane',
      await page.evaluate(() => {
        const n = document.querySelector('#intelStrip [data-ps-state="obligations-unavailable"]');
        if (!n) return false;
        const r = n.getBoundingClientRect();
        return getComputedStyle(n).display !== 'none' && r.width > 0 && r.height > 0;
      }), 'no visible unavailable notice inside #intelStrip');
    ok('...and it did not replace the desk to say so',
      await page.$(TILE) !== null);
    await shot(page, '03-obligation-lanes-honest-unavailable.png', { fullPage: true });
  }

  // ══════════════════════════════════════════════════════════════════
  section('B. CONTROL — obligations OK: nothing was over-corrected');
  SEEN.add('B control obligations-ok');
  OBLIGATIONS_FAIL = false;
  {
    await page.evaluate(() => { window.__navOpenedDoor = 0; });
    await openDeskByClick();
    const human = await textOf(page, '#humanLane');
    ok('a SUCCESSFUL read does not render an unavailable lane',
      !/unavailable/i.test(human), human.slice(0, 140));
    ok('...and the lanes drop the unavailable marker',
      await page.evaluate(() => ['humanLane', 'autoLane'].every((id) => {
        const e = document.getElementById(id);
        return !!e && e.getAttribute('data-ps-state') !== 'obligations-unavailable';
      })));
    const healthyTile = (await page.$(TILE)) !== null;
    ok('a recovered desk carries NO stale unavailable notice',
      await page.evaluate(() => !document.querySelector('#intelStrip [data-ps-state="obligations-unavailable"]')));
    ok('the Work Orders tile is still present on the healthy desk', healthyTile);
    if (healthyTile) {
      await page.click(TILE);
      await page.waitForSelector('#workOrdersBody', { timeout: 20000 });
      ok('and it still reaches the live door',
        await page.evaluate(() => window.__navOpenedDoor === 1));
    } else {
      ok('and it still reaches the live door', false, 'no tile to click');
    }
  }

  section('PAGE HEALTH');
  ok('no uncaught page errors during the whole run', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  // ── FLOOR ─────────────────────────────────────────────────────────
  const missing = REQUIRED.filter((r) => !SEEN.has(r));
  if (missing.length) { fail++; failures.push('CASES NOT DRIVEN: ' + missing.join(', ')); }

  await browser.close(); api.close(); app.close();

  console.log('\n' + '='.repeat(64));
  console.log(pass + ' passed, ' + fail + ' failed');
  if (fail) { console.log('\nFAILURES:'); failures.forEach((f) => console.log('  - ' + f)); }
  console.log('='.repeat(64));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('HARNESS DIED: ' + (e && e.stack || e)); process.exit(2); });
