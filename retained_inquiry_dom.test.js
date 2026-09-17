"use strict";
/* ════════════════════════════════════════════════════════════════════
 *  retained_inquiry_dom.test.js
 *
 *  An operator must be able to RECOVER a lost lead from the app, not from
 *  developer tools. This drives the real functions out of index.html in a
 *  real browser: the queue filter that decides whether the task is visible
 *  at all, the row that must offer a way in, and the panel that renders the
 *  inquiry.
 *
 *  Source-text assertions are deliberately not used here. A test that greps
 *  index.html for a string passes while the panel renders nothing, which is
 *  the exact failure this whole slice was sent back for twice.
 * ════════════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const assert = require("./tests/assert_reporter");
const { chromium } = require("./tests/browser_runtime");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

/** Lift a named function's source out of the page, brace-balanced. */
function lift(signature) {
  const start = html.indexOf(signature);
  if (start < 0) throw new Error("not found in index.html: " + signature);
  let i = html.indexOf("{", start), depth = 0;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return html.slice(start, j + 1); }
  }
  throw new Error("unbalanced: " + signature);
}

const SRC = [
  lift("function mwHighProfile(o){"),
  //  obRow is nested inside the queue renderer and closes over helpers; they
  //  are stubbed below. Lifting the REAL function is the point — a hand-copied
  //  version would pass while the shipped row had no way in.
  lift("function obRow(o, readOnly){"),
  lift("async function openRetainedInquiry(obligationId){"),
].join("\n\n");

const CONFLICT = { id: "ob-1", type: "prospect_identity_conflict", module: "leasing",
  label: "A prospect inquiry could not be matched to one person record.", status: "open" };

const SERVER = {
  obligation_id: "ob-1", status: "open", label: CONFLICT.label,
  retained_inquiry: {
    comm_event_id: "ce-1",
    message: "Hi - is the 2BR still available for August? I can tour Saturday.",
    received_at: "2026-09-17T14:03:00.000Z",
    channel: "website", source: "website-form",
    submitted: { phone: "+12155550177", email: null, name: "New Prospect" },
    attached_to_person: null,
    conflict_evidence: "canonical_phone",
    candidates: [{ person_id: "p-a", name: "Ada Lovelace" }, { person_id: "p-b", name: "Grace Hopper" }],
  },
  next_step: "Decide which person record this inquiry belongs to, or create a new one, through the person path. This read does not attach it.",
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<div id="drawer"></div><div id="sheetMini"></div><div id="sheetTitle"></div>
      <div id="sheetSub"></div><div id="sheetBody"></div>`);
    await page.addScriptTag({ content: `
      function $(id){ return document.getElementById(id); }
      function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => (
        {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
      //  Closure helpers obRow expects from its enclosing renderer.
      function obDueLabel(){ return ''; }
      const CAP_LABEL = {}, SURFACE_LABELS = { leasing: 'Leasing' };
      function canAct(){ return false; }   // NOT actionable by capability:
      //  the row must offer a way in on TYPE alone, or an operator without
      //  that capability silently loses the lead.
      window.__mode = 'ok';
      window.__psLive = {
        hasSession: () => window.__mode !== 'nosession',
        loadResource: async (name, params) => {
          window.__lastRead = { name, params };
          if (window.__mode === 'failed') { const e = new Error('read failed'); e.status = 500; throw e; }
          if (window.__mode === 'blocked') return { data: { obligation_id:'ob-1', status:'open', label:'x',
            retained_inquiry: null,
            blocked_reason: 'The retained inquiry could not be verified against this property. The task stays open; do not resolve it blind.' } };
          return { data: ${JSON.stringify(SERVER)} };
        },
      };
      ${SRC}
    ` });

    // ── 1. the task is visible at all ────────────────────────────────
    const visible = await page.evaluate(o => mwHighProfile(o), CONFLICT);
    assert.equal(visible, true, "an unattributable inquiry reaches the work queue");
    const routine = await page.evaluate(() => mwHighProfile(
      { id:'x', type:'leasing_task', module:'leasing', label:'Follow up on tour', status:'open' }));
    assert.equal(routine, false, "and it did not do that by making every routine task high-profile");

    // ── 1b. the queue row offers a way IN ────────────────────────────
    const rowHtml = await page.evaluate(o => obRow(o, false), CONFLICT);
    assert.match(rowHtml, /onclick="openRetainedInquiry\('ob-1'\)"/,
      "the queue row opens the retained inquiry — no developer tools needed");
    assert.match(rowHtml, /Open inquiry/, "and it says so, rather than reading as view-only");
    assert.doesNotMatch(rowHtml, /View only/, "it is not rendered as a dead end");
    assert.doesNotMatch(rowHtml, /12155550177|Ada Lovelace/,
      "the QUEUE ROW discloses no contact details — those live on the retained record");
    const other = await page.evaluate(() => obRow(
      { id:'y', type:'leasing_task', module:'leasing', label:'Follow up', status:'open' }, false));
    assert.doesNotMatch(other, /openRetainedInquiry/, "and no other task type was given that door");

    // ── 2. the panel renders the actual inquiry ──────────────────────
    await page.evaluate(() => openRetainedInquiry('ob-1'));
    await page.waitForFunction(() => !/Loading the inquiry/.test(document.getElementById('sheetBody').innerText));
    assert.deepEqual(await page.evaluate(() => window.__lastRead),
      { name: "retainedInquiry", params: { obligationId: "ob-1" } },
      "it reads the server's retained-inquiry contract");

    const body = await page.locator("#sheetBody").innerText();
    assert.match(body, /is the 2BR still available for August/, "the ORIGINAL MESSAGE is on screen");
    assert.match(body, /\+12155550177/, "the submitted phone is on screen");
    assert.match(body, /New Prospect/, "the submitted name is on screen");
    assert.match(body, /website-form/, "the source is on screen");
    assert.match(body, /Ada Lovelace/, "both candidate records are offered");
    assert.match(body, /Grace Hopper/, "both candidate records are offered");
    assert.match(body, /Nobody/, "it says plainly that it is attached to nobody");
    assert.match(body, /does not attach it/, "it does not pretend to resolve the conflict");

    //  ...and it is actually VISIBLE, not merely in the DOM. Rendered is not
    //  visible: ask the DOCUMENT what is at the element's centre.
    const onTop = await page.evaluate(() => {
      const el = document.getElementById('sheetBody');
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 200));
      return !!hit && (hit === el || el.contains(hit));
    });
    assert.equal(onTop, true, "the panel is visible to a person, not covered by the shell");

    // ── 3. no session, failed read, unverifiable evidence ────────────
    await page.evaluate(() => { window.__mode = 'nosession'; });
    await page.evaluate(() => openRetainedInquiry('ob-1'));
    await page.waitForFunction(() => /Sign in/.test(document.getElementById('sheetBody').innerText));
    const noSess = await page.locator("#sheetBody").innerText();
    assert.doesNotMatch(noSess, /2BR|Ada Lovelace|12155550177/, "no session shows NOTHING — not a fixture");

    await page.evaluate(() => { window.__mode = 'failed'; });
    await page.evaluate(() => openRetainedInquiry('ob-1'));
    await page.waitForFunction(() => /could not be read/.test(document.getElementById('sheetBody').innerText));
    const failed = await page.locator("#sheetBody").innerText();
    assert.match(failed, /HTTP 500/, "a failed read names what happened");
    assert.doesNotMatch(failed, /2BR|Ada Lovelace/, "a failed read invents nothing");
    assert.match(failed, /Try again/, "and offers the person a way forward");

    await page.evaluate(() => { window.__mode = 'blocked'; });
    await page.evaluate(() => openRetainedInquiry('ob-1'));
    await page.waitForFunction(() => /do not resolve it blind/.test(document.getElementById('sheetBody').innerText));
    const blocked = await page.locator("#sheetBody").innerText();
    assert.match(blocked, /could not be verified/, "an unverifiable link is shown as a real state");
    assert.doesNotMatch(blocked, /Nobody|does not attach/, "and not dressed up as an empty but healthy panel");

    console.log("PASS retained inquiry: visible in the queue, opens the real message, contact, source and candidates; honest on no-session, failed read and unverifiable link");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
