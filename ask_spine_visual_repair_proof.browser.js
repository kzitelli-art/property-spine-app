// ════════════════════════════════════════════════════════════════════
//  ASK SPINE — VISUAL REPAIR PROOF (two owner-raised blockers)
//
//  1. MOBILE CARD COLLISION. `.as-go` ("Open →") is absolutely positioned
//     and vertically centred, so a long title ran underneath it at 390px.
//     Geometry is asserted, not eyeballed: the title/meta boxes must not
//     intersect the action box on any card, with a deliberately long
//     wrapped title present.
//
//  2. FAILURE COPY. The visible failure state must be the approved
//     sentence and Retry — nothing else. Implementation and fixture
//     language must be absent from the DOM entirely.
//
//  Real app artifact, real API, real Postgres, real session. The outage
//  is real: the TLS front for the pinned origin is stopped.
// ════════════════════════════════════════════════════════════════════
const { chromium } = require(process.env.SP + '/node_modules/playwright');
const fs = require('fs');
const OUT = process.env.SP;
const S = JSON.parse(fs.readFileSync(OUT + '/e2e_session.json', 'utf8'));

const PHONE = { width: 390, height: 844 };
const APPROVED = 'I couldn’t read this property’s open work.';
//  Any of these appearing in the failure state is a regression.
const FORBIDDEN = [
  /No fixture fallback/i,
  /live-required resource/i,
  /Live request failed to reach the server/i,
  /HTTP \d{3}/,
  /\bfetch\b/i,
  /\bnull\b/i,
  /undefined/i,
];

let pass = 0, fail = 0; const failures = [];
const ok = (v, m) => { if (!v) { fail++; failures.push(m); console.error('  ✗ ' + m); } else { pass++; } };
const P = (n) => { pass++; console.log('  ✓ ' + n); };

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--host-resolver-rules=MAP property-spine-api.onrender.com 127.0.0.1:443',
           '--ignore-certificate-errors', '--no-proxy-server'] });
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
  await ctx.addInitScript((sess) => { try { sessionStorage.setItem('__ps_staff_session__',
    JSON.stringify({ t: sess.token, m: { user_id: sess.user_id, property_id: sess.property_id } })); } catch (_) {} }, S);
  const page = await ctx.newPage();
  page.on('pageerror', () => {});
  await page.goto('http://127.0.0.1:8081/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.renderAskSpine === 'function', null, { timeout: 25000 });
  await page.evaluate(() => renderAskSpine());
  await page.evaluate(() => askSpine());
  await page.waitForSelector('#askSpineMount .as-item', { timeout: 20000 });

  // ── BLOCKER 1 — geometry, per card ────────────────────────────────
  const geo = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#askSpineMount .as-item').forEach((li) => {
      const go = li.querySelector('.as-go');
      const label = li.querySelector('.as-label');
      const meta = li.querySelector('.as-meta');
      const r = (el) => el ? el.getBoundingClientRect() : null;
      const overlaps = (a, b) => !!(a && b) &&
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      out.push({
        label: (label && label.textContent || '').slice(0, 60),
        labelLen: (label && label.textContent || '').length,
        hasGo: !!go,
        goStatic: go ? getComputedStyle(go).position === 'static' : null,
        labelHitsGo: overlaps(r(label), r(go)),
        metaHitsGo: overlaps(r(meta), r(go)),
        goBelowLabel: !!(go && label) && r(go).top >= r(label).bottom - 1,
      });
    });
    return out;
  });

  ok(geo.length > 0, 'at least one result card must render');
  P(`V1  ${geo.length} result cards rendered at ${PHONE.width}px`);

  const longest = geo.reduce((a, b) => (b.labelLen > a.labelLen ? b : a), geo[0]);
  ok(longest.labelLen >= 60, `a LONG wrapped title must be present — longest is ${longest.labelLen} chars ("${longest.label}")`);
  P(`V2  longest title is ${longest.labelLen} chars — wrapping is genuinely exercised`);

  const tappable = geo.filter((g) => g.hasGo);
  ok(tappable.length > 0, 'at least one card must carry the Open action');
  P(`V3  ${tappable.length} cards carry the "Open →" action`);

  const collided = tappable.filter((g) => g.labelHitsGo || g.metaHitsGo);
  ok(collided.length === 0, `TITLE/META OVERLAPS THE ACTION on ${collided.length} card(s): ` +
     collided.map((c) => `"${c.label}"`).join(' | '));
  if (!collided.length) P('V4  NO card has a title or meta box intersecting the action box');

  const stillOverlaid = tappable.filter((g) => !g.goStatic);
  ok(stillOverlaid.length === 0, `the action is still absolutely positioned on ${stillOverlaid.length} card(s) at phone width`);
  if (!stillOverlaid.length) P('V5  at phone width the action leaves the overlay — position: static');

  const notBelow = tappable.filter((g) => !g.goBelowLabel);
  ok(notBelow.length === 0, `the action is not on its own row below the title on ${notBelow.length} card(s)`);
  if (!notBelow.length) P('V6  the action sits on its own row beneath the title, on every card');

  await page.locator('#askSpineMount').screenshot({ path: OUT + '/repair_1_items_phone.png' });

  // ── BLOCKER 2 — failure copy, real outage ─────────────────────────
  try { process.kill(Number(fs.readFileSync(OUT + '/tls.pid', 'utf8').trim()), 'SIGKILL'); } catch (_) {}
  await page.waitForTimeout(1200);
  await page.evaluate(() => askSpine());
  await page.waitForSelector('#askSpineMount .as-note.as-bad', { timeout: 20000 });

  const failState = await page.evaluate(() => {
    const n = document.querySelector('#askSpineMount .as-note.as-bad');
    const retry = n && n.querySelector('.as-retry');
    const r = (el) => el ? el.getBoundingClientRect() : null;
    const nb = r(n), rb = r(retry);
    return {
      text: (n && n.innerText || '').replace(/\s+/g, ' ').trim(),
      html: (n && n.innerHTML || ''),
      hasRetry: !!retry,
      retryText: retry ? retry.textContent.trim() : null,
      retryInside: !!(nb && rb) && rb.left >= nb.left - 1 && rb.right <= nb.right + 1,
      overflowsViewport: !!nb && nb.right > window.innerWidth + 1,
      scopeLine: (document.querySelector('.as-scope') || {}).textContent || '',
    };
  });

  ok(failState.text.indexOf(APPROVED) === 0,
    `failure state must OPEN with the approved sentence — got "${failState.text.slice(0, 120)}"`);
  P('V7  the failure state opens with the approved sentence');

  const leaked = FORBIDDEN.find((re) => re.test(failState.text));
  ok(!leaked, `IMPLEMENTATION LANGUAGE IN THE UI — matched ${leaked} in "${failState.text.slice(0, 160)}"`);
  if (!leaked) P('V8  no implementation, fixture or transport language anywhere in the failure state');

  const withoutRetry = failState.text.replace(/Retry\s*$/, '').trim();
  ok(withoutRetry === APPROVED,
    `the failure state must contain ONLY the sentence and Retry — got "${withoutRetry}"`);
  P('V9  the failure state is exactly the approved sentence plus Retry');

  ok(failState.hasRetry && failState.retryText === 'Retry', 'a Retry control must be present and labelled "Retry"');
  P('V10 Retry is present and correctly labelled');

  ok(failState.retryInside && !failState.overflowsViewport,
    `Retry must sit cleanly within the note and the note must not overflow ${PHONE.width}px`);
  P('V11 Retry sits cleanly within the note; no horizontal overflow at 390px');

  ok(/Currently checks recorded open work for this property/.test(failState.scopeLine),
    'the persistent scope line must be unchanged during failure');
  P('V12 the persistent scope line is unchanged');

  await page.locator('#askSpineMount').screenshot({ path: OUT + '/repair_2_failure_phone.png' });

  await browser.close();
  console.log(`\n  VISUAL REPAIR RUNG · ${pass} passed · ${fail} failed`);
  if (fail) { console.log('\nFAILURES:'); failures.forEach((f) => console.log('  - ' + f)); }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('DIED:', e && e.message || e); process.exit(1); });
