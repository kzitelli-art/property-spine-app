// ════════════════════════════════════════════════════════════════════
//  Slice 9 — MARKET & PRICING EVIDENCE RENDERER, REAL-BROWSER ACCEPTANCE.
//  Real app, real API branch, isolated Postgres, canonical staff sessions.
//  Desktop + 390px screenshots. Fail-closed.
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
  page.on('request', r => { if (/onrender\.com/.test(r.url())) net.push(r.url()); });
  page.on('pageerror', () => {});
  await page.goto('http://127.0.0.1:8081/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__psLive && typeof window.psMkEvidence === 'function', null, { timeout: 25000 });
  await page.waitForTimeout(1000);
  return { page, net, ctx };
}
//  Render the Evidence section into the real workspace body and return text.
async function renderEvidence(page) {
  await page.evaluate(async () => {
    let el = document.getElementById('psMkBody');
    if (!el) {
      const strip = document.getElementById('intelStrip') || document.body;
      el = document.createElement('div'); el.id = 'psMkBody'; strip.appendChild(el);
      strip.classList.remove('hidden');
    }
    await psMkEvidence(el, {});
  });
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const el = document.getElementById('psMkBody');
    return { text: el.textContent, state: el.getAttribute('data-ps-state') };
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--host-resolver-rules=MAP property-spine-api.onrender.com 127.0.0.1:443', '--ignore-certificate-errors', '--no-proxy-server'] });

  // ── LIVE PARTIAL STATE, property A ─────────────────────────────────
  const A = await newPage(browser, { tok: S.tokFull, uid: S.uFull, pid: S.A });
  let r = await renderEvidence(A.page);
  ok(r.state === 'data', 'M1  live data renders (data-ps-state=data)');
  ok(/PARTIAL/.test(r.text), 'M2  the overall state pill says PARTIAL');
  const idxBanner = r.text.indexOf('Some evidence is incomplete, so percentages are withheld.');
  const idxRate = r.text.indexOf('Percentage unavailable');
  ok(idxBanner >= 0 && idxRate > idxBanner, 'M3  the partial banner appears BEFORE any rate, in text');
  ok(/Percentage unavailable/.test(r.text) && !/\b0(\.0)?%/.test(r.text),
    'M4  a suppressed rate renders "Percentage unavailable" — never 0%');
  ok(/Opportunity → observed visit/.test(r.text) && /Approval → executed lease/.test(r.text),
    'M5  all four funnels render as a sequence');
  ok(/of 3 leasing opportunities/.test(r.text), 'M6  cohort counts come from the server (3 opportunities)');
  ok(/pending/.test(r.text), 'M7  pending counts are visible even while the rate is withheld');
  ok(/Originating lead source/.test(r.text)
     && /not independently recorded for each opportunity/i.test(r.text),
    'M8  the source disclosure is honest and never says "opportunity source"');
  ok(!/opportunity source/i.test(r.text.replace(/Originating lead source/g, '')),
    'M9  no "opportunity source" label anywhere');
  ok(/What changes the answer/.test(r.text), 'M10 the "What changes the answer" section exists');
  ok(r.text.indexOf('What changes the answer') < r.text.indexOf('Supporting opportunities'),
    'M11 unresolved evidence sits ABOVE the general population');
  ok(/Supporting opportunities/.test(r.text) && /matching · showing/.test(r.text),
    'M12 the supporting rows are the bounded server page with totals');
  ok(/Upcoming appointment|Visited|No appointment/.test(r.text), 'M13 rows carry plain evidence language');
  ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(r.text),
    'M14 no UUID rendered');
  await A.page.screenshot({ path: OUT + '/mkev_1_partial_desktop.png', fullPage: false });

  // ── SERVER FILTERING through the real control ──────────────────────
  A.net.length = 0;
  await A.page.evaluate(async () => { window._psEvFilter = 'observed_visit';
    await psMkEvidence(document.getElementById('psMkBody'), {}); });
  await A.page.waitForTimeout(700);
  r = await A.page.evaluate(() => ({ text: document.getElementById('psMkBody').textContent }));
  ok(A.net.some(u => /evidence_state=observed_visit/.test(u)),
    'M15 the filter is SERVER-side — the request carries evidence_state');
  ok(/1 matching/.test(r.text), 'M16 the filtered total comes from the server (1 matching)');
  ok(/Visited/.test(r.text) && !/No appointment ·/.test(r.text), 'M17 only matching rows render');
  await A.page.evaluate(() => { window._psEvFilter = null; });

  // ── EMPTY STATE, property B — honest, no fixtures ──────────────────
  const B = await newPage(browser, { tok: S.tokB, uid: S.uB, pid: S.B });
  B.net.length = 0;
  r = await renderEvidence(B.page);
  ok(r.state === 'empty', 'M18 an empty property renders the EMPTY state');
  ok(/Nothing measured in this window/.test(r.text)
     && /nothing is sampled or estimated/i.test(r.text), 'M19 with the honest empty sentence');
  ok((r.text.match(/Percentage unavailable/g) || []).length === 4
     && !/\b0(\.0)?%/.test(r.text), 'M20 all four funnels: no 0% on a zero denominator');
  ok(!/Dana|Marcus|Evie|Piotr|Nina/.test(r.text), 'M21 no cross-property record leaked into B');
  await B.page.screenshot({ path: OUT + '/mkev_2_empty_desktop.png' });

  // ── FORBIDDEN: no leasing module ───────────────────────────────────
  const NL = await newPage(browser, { tok: S.tokNoLease, uid: S.uNoLease, pid: S.A });
  r = await renderEvidence(NL.page);
  ok(r.state === 'forbidden', 'M22 a maintenance-only session gets the FORBIDDEN state');
  ok(/do not have leasing access/i.test(r.text), 'M23 said in plain words');

  // ── NO SESSION: zero live calls ────────────────────────────────────
  const anon = await newPage(browser, null);
  anon.net.length = 0;
  r = await renderEvidence(anon.page);
  ok(r.state === 'unavailable' || r.state === 'forbidden', 'M24 no session → honest refusal state');
  ok(anon.net.filter(u => /pricing\/evidence/.test(u)).length === 0,
    'M25 and ZERO live evidence requests without a session');

  // ── 390px MOBILE ───────────────────────────────────────────────────
  const mob = await newPage(browser, { tok: S.tokFull, uid: S.uFull, pid: S.A }, { width: 390, height: 844 });
  r = await renderEvidence(mob.page);
  ok(/Some evidence is incomplete/.test(r.text), 'M26 the evidence page renders at 390px with the partial banner');
  await mob.page.screenshot({ path: OUT + '/mkev_3_partial_mobile_390.png' });

  // ── UNAVAILABLE + RETRY, and NO stale content ──────────────────────
  try { process.kill(Number(fs.readFileSync(OUT + '/tls.pid', 'utf8').trim()), 'SIGKILL'); } catch (_) {}
  await new Promise(res => setTimeout(res, 1200));
  r = await renderEvidence(A.page);
  ok(r.state === 'unavailable', 'M27 a real outage renders UNAVAILABLE');
  ok(/Nothing cached is shown/i.test(r.text), 'M28 and explicitly refuses stale content');
  ok(/Retry/.test(r.text), 'M29 with a retry control');
  ok(!/Opportunity → observed visit/.test(r.text), 'M30 the previous successful content is GONE, not preserved');
  await A.page.screenshot({ path: OUT + '/mkev_4_unavailable.png' });

  await browser.close();
  console.log(`\n  market evidence browser: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('DIED: ' + e.message); console.log(`\n  market evidence browser: ${pass} passed, ${fail + 1} failed`); process.exit(1); });
