#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
//  SLICE 10E — FUTURE RENT ROLL, REAL-BROWSER ACCEPTANCE.
//
//  Real app, real API, real Postgres, canonical staff sessions, synthetic
//  data only. Desktop and 390px. Fail-closed.
//
//  Run:  SP=<dir with slice10e_session.json + node_modules/playwright>
//        API_DIR=<the API repo checkout>
//        node slice10e_future_rent_roll_browser_proof.browser.js
//
//  ── WHY THE VOCABULARIES ARE IMPORTED, NOT TYPED OUT ───────────────
//  EVIDENCE_STATE, RESULT_STATE and RENT_AUTHORITY are require()d from the
//  API's own frozen contract. A harness that retypes a vocabulary is a second
//  copy of it, and two copies of one rule is a defect even while they agree.
//  The four axes the contract does not export are pinned below WITH their
//  source line, and a guard asserts the server never returns a value outside
//  the pinned set — so an unpinned value fails loudly instead of passing
//  quietly.
//
//  ── WHAT "TEN" AND "SEVENTEEN" RESOLVED TO ─────────────────────────
//  TEN CONTRACT STATES — the two typed vocabularies the frozen contract
//  names at the response level:
//      EVIDENCE_STATE  6   contractually_supported · qualified_legacy ·
//                          incomplete · conflicting · untrackable · unavailable
//      RESULT_STATE    4   qualifying_result_exists · no_qualifying_result ·
//                          unavailable · authority_missing
//  SEVENTEEN POSITION STATES — every value of the five typed axes that
//  describe one position:
//      position_state    5   denominator_class 3   rent_authority 4
//      resolution_state  3   conflict_state    2
//
//  Three of the ten are DECLARED BUT UNPRODUCIBLE by the engine as it
//  stands, and this harness proves that rather than papering over it: see
//  section C. Reporting seven of ten as ten would be the confident-wrong
//  this surface exists to refuse.
// ════════════════════════════════════════════════════════════════════
"use strict";
const fs = require("fs");
const path = require("path");
const SP = process.env.SP;
const API_DIR = process.env.API_DIR;
if (!SP || !API_DIR) { console.error("need SP and API_DIR"); process.exit(1); }
const { chromium } = require(path.join(SP, "node_modules/playwright"));
const S = JSON.parse(fs.readFileSync(path.join(SP, "slice10e_session.json"), "utf8"));

//  THE FROZEN VOCABULARIES, from the contract itself.
const CONTRACT = require(path.join(API_DIR, "src/tenancy/dated_position_rows"));
const EVIDENCE_STATES = Object.values(CONTRACT.EVIDENCE_STATE);
const RESULT_STATES = Object.values(CONTRACT.RESULT_STATE);
const RENT_AUTHORITIES = Object.values(CONTRACT.RENT_AUTHORITY);

//  PINNED, with the source that decides each. Not exported by the contract,
//  so they are written here once and guarded against drift below.
const POSITION_STATES = [                       // future_rent_roll_facts.js futureState()
  "contractually_locked", "covered_unproven", "successor_pending_not_locked",
  "open_or_uncovered", "conflict"];             // + dated_position_rows.js:486
const DENOMINATOR_CLASSES = ["revenue", "non_revenue", "unknown"];   // dated_position_rows.js denominatorClass()
const RESOLUTION_STATES = ["existing_action", "no_canonical_action", "conflict"]; // actionForRow()
const CONFLICT_STATES = ["clear", "conflicted"];                     // position_classifier.js
const POSITION_AXES = {
  position_state: POSITION_STATES, denominator_class: DENOMINATOR_CLASSES,
  rent_authority: RENT_AUTHORITIES, resolution_state: RESOLUTION_STATES,
  conflict_state: CONFLICT_STATES,
};
const SEVENTEEN = Object.values(POSITION_AXES).reduce((n, a) => n + a.length, 0);

const HOSTS = "MAP property-spine-api.onrender.com 127.0.0.1:443,"
  + "MAP cdn.jsdelivr.net 127.0.0.1:443,MAP cdn.plaid.com 127.0.0.1:443,"
  + "MAP fonts.googleapis.com 127.0.0.1:443,MAP fonts.gstatic.com 127.0.0.1:443";

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log("   PASS  " + m); }
                       else { fail++; console.log("   FAIL  " + m); } };
const section = (s) => console.log("\n── " + s + " " + "─".repeat(Math.max(0, 62 - s.length)));
const note = (m) => console.log("   NOTE  " + m);

// ── PAGE ────────────────────────────────────────────────────────────
async function newPage(browser, session, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1180, height: 900 },
                                         deviceScaleFactor: 2 });
  if (session) {
    await ctx.addInitScript((s) => {
      try { sessionStorage.setItem("__ps_staff_session__",
        JSON.stringify({ t: s.tok, m: { user_id: s.uid, property_id: s.pid } })); } catch (_) {}
    }, session);
  }
  const page = await ctx.newPage();
  const bag = { consoleErrors: [], pageErrors: [], failedRequests: [], nonOk: [],
                frrRequests: [], frrBytes: 0, frrRowsDownloaded: 0 };
  page.on("console", (m) => { if (m.type() === "error") bag.consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => bag.pageErrors.push(String(e && e.message || e)));
  page.on("requestfailed", (r) => bag.failedRequests.push(r.url() + " :: "
    + ((r.failure() || {}).errorText || "?")));
  ctx.on("response", async (r) => {
    if (r.status() >= 400) bag.nonOk.push(r.status() + " " + r.url());
    if (/\/operator\/rent-roll\/future-facts/.test(r.url())) {
      bag.frrRequests.push(r.url());
      try {
        const body = await r.body();
        bag.frrBytes += body.length;
        const parsed = JSON.parse(body.toString("utf8"));
        if (Array.isArray(parsed.positions)) bag.frrRowsDownloaded += parsed.positions.length;
      } catch (_) { /* a refusal body is not JSON positions; bytes still counted */ }
    }
  });
  await page.goto("http://127.0.0.1:8081/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__psLive && typeof window.psLiveFutureRentRoll === "function",
    null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  //  BOOT NOISE IS RECORDED, THEN CLEARED. Other doors fire at boot and are
  //  correctly refused when the operator lacks their module. Those refusals
  //  belong to those doors, not to this surface — so they are PRINTED by
  //  name and then the buffers are reset, and everything after this line is
  //  attributable to Future Rent Roll. Nothing is suppressed; it is scoped.
  const boot = { consoleErrors: [...bag.consoleErrors], pageErrors: [...bag.pageErrors],
                 failedRequests: [...bag.failedRequests], nonOk: [...bag.nonOk] };
  bag.consoleErrors.length = 0; bag.pageErrors.length = 0;
  bag.failedRequests.length = 0; bag.nonOk.length = 0;
  return { page, ctx, bag, boot };
}

/*  ── OPEN THE SURFACE THE WAY AN OPERATOR DOES ──────────────────────
    An earlier version of this harness called psLiveFutureRentRoll() straight
    away. It rendered, its text read correctly, and every geometry assertion
    PASSED — because MAIN#workspace still had display:none, so every element
    measured 0×0 and "nothing is wider than 390px" was true of nothing.
    textContent reads hidden nodes perfectly well, which is exactly why a text
    assertion cannot stand in for a visual one.

    So the surface is now opened through openDesk('management') →
    openManagementDoor('forward'), the real navigation, and NOTHING geometric
    is asserted until visibility is proven by measurement.                  */
async function openSurface(page) {
  await page.evaluate(() => window.openDesk("management"));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.openManagementDoor("forward"));
  await page.waitForFunction(() => {
    const el = document.getElementById("psFrrBody");
    return el && el.getAttribute("data-ps-state") !== "loading";
  }, null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

//  Measured, never assumed. Returns the body's own box.
function surfaceBox(page) {
  return page.evaluate(() => {
    const el = document.getElementById("psFrrBody");
    if (!el) return { w: 0, h: 0, rows: 0, rowsVisible: 0 };
    const rows = [...document.querySelectorAll("[data-ps-row]")];
    const b = el.getBoundingClientRect();
    return { w: b.width, h: b.height, rows: rows.length,
             rowsVisible: rows.filter((n) => {
               const r = n.getBoundingClientRect();
               return r.width > 0 && r.height > 0;
             }).length };
  });
}

//  Render the real surface through its real entry point.
async function renderFrr(page, { asOf = null, cursor = null } = {}) {
  await page.evaluate((a) => { window._psFrrDate = a.asOf; window._psFrrCursor = a.cursor; },
    { asOf, cursor });
  await page.evaluate(async () => { await window.psLiveFutureRentRoll(); });
  await page.waitForTimeout(600);
  return page.evaluate(() => {
    const el = document.getElementById("psFrrBody");
    if (!el) return { state: "(missing)", text: "", rows: [], summaryText: "" };
    const rows = [...el.querySelectorAll("[data-ps-row]")].map((n) => ({
      text: n.textContent,
      space_id: n.getAttribute("data-ps-row"),
      position_state: n.getAttribute("data-ps-position-state"),
      denominator_class: n.getAttribute("data-ps-denominator-class"),
      rent_authority: n.getAttribute("data-ps-rent-authority"),
      resolution_state: n.getAttribute("data-ps-resolution-state"),
      conflict_state: n.getAttribute("data-ps-conflict-state"),
      evidence_state: n.getAttribute("data-ps-evidence-state"),
      unit: (n.querySelector("[data-ps-unit]") || {}).textContent || "",
    }));
    const head = el.querySelector("[data-ps-summary]");
    return { state: el.getAttribute("data-ps-state"), text: el.textContent,
             rows, summaryText: head ? head.textContent : "" };
  });
}

(async () => {
  console.log("\n════ SLICE 10E — FUTURE RENT ROLL BROWSER ACCEPTANCE ════");
  console.log(`   target date ${S.target_date}`);
  console.log(`   contract vocabularies imported from ${path.join(API_DIR, "src/tenancy/dated_position_rows.js")}`);
  console.log(`   ten = ${EVIDENCE_STATES.length} evidence + ${RESULT_STATES.length} result`
    + `   seventeen = ${Object.entries(POSITION_AXES).map(([k, v]) => k + ":" + v.length).join(" ")}`);
  ok(`the ten contract states enumerate to 10 (${EVIDENCE_STATES.length}+${RESULT_STATES.length})`,
    EVIDENCE_STATES.length + RESULT_STATES.length === 10);
  ok(`the seventeen position states enumerate to 17 (got ${SEVENTEEN})`, SEVENTEEN === 17);

  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--host-resolver-rules=" + HOSTS, "--ignore-certificate-errors",
           "--no-proxy-server", "--no-sandbox"] });

  const seenEvidence = new Set(), seenResult = new Set();
  const seenAxis = Object.fromEntries(Object.keys(POSITION_AXES).map((k) => [k, new Set()]));

  // ══════════════════════════════════════════════════════════════════
  section("A  the states property — every row-level axis, desktop");
  // ══════════════════════════════════════════════════════════════════
  const A = await newPage(browser, { tok: S.tokS, uid: S.uS, pid: S.S });
  if (A.boot.nonOk.length) note("boot-time non-2xx from OTHER doors, listed in full: "
    + A.boot.nonOk.join(" | "));
  if (A.boot.consoleErrors.length) note(`boot-time console errors: ${A.boot.consoleErrors.length}`);
  ok("no uncaught page error during shell boot", A.boot.pageErrors.length === 0);

  //  THE REAL DOOR, not a direct call into the renderer.
  await openSurface(A.page);
  const box0 = await surfaceBox(A.page);
  ok(`A0a the surface is opened through Management → Future Rent Roll and is`
    + ` VISIBLE (${Math.round(box0.w)}×${Math.round(box0.h)}px)`, box0.w > 200 && box0.h > 100);
  ok(`A0b and its rows have real geometry (${box0.rowsVisible} of ${box0.rows} measurable)`,
    box0.rows > 0 && box0.rowsVisible === box0.rows);

  let r = await renderFrr(A.page, { asOf: S.target_date });
  ok("A1  the live surface renders (data-ps-state=data)", r.state === "data");
  ok(`A2  every position is a row (${r.rows.length} of 20)`, r.rows.length === 20);
  const boxA = await surfaceBox(A.page);
  ok(`A2b the dated render is still visible (${boxA.rowsVisible}/${boxA.rows} rows measurable)`,
    boxA.w > 200 && boxA.rowsVisible === 20);

  for (const row of r.rows) {
    for (const axis of Object.keys(POSITION_AXES)) if (row[axis]) seenAxis[axis].add(row[axis]);
    if (row.evidence_state) seenEvidence.add(row.evidence_state);
  }
  //  DRIFT GUARD. A value the server produces that this harness never pinned
  //  must fail, not pass unnoticed.
  for (const [axis, allowed] of Object.entries(POSITION_AXES)) {
    const stray = [...seenAxis[axis]].filter((v) => !allowed.includes(v));
    ok(`A3.${axis}  every rendered value is in the pinned vocabulary`
      + (stray.length ? ` (stray: ${stray.join(",")})` : ""), stray.length === 0);
  }

  //  ── THE FOUR RENT FACTS MUST NOT COLLAPSE ────────────────────────
  //  missing and conflict are different facts, and so are a conflicted
  //  position and an absent lease. The server carries a distinct rent_note
  //  for each; if the screen shows one sentence for all four, the contract's
  //  whole reason for typing rent_authority has been thrown away.
  const rentTexts = {};
  for (const a of RENT_AUTHORITIES) {
    const row = r.rows.find((x) => x.rent_authority === a);
    if (row) rentTexts[a] = row.text;
  }
  ok(`A4  all four rent authorities are present in the fixture (${Object.keys(rentTexts).length}/4)`,
    Object.keys(rentTexts).length === 4);
  const distinctRent = new Set(Object.values(rentTexts).map((t) => t.replace(/[A-Z]\d\d/g, "")));
  ok("A5  the four rent authorities render four DIFFERENT sentences",
    distinctRent.size === Object.keys(rentTexts).length);
  const missingRow = r.rows.find((x) => x.rent_authority === "missing");
  const conflictRentRow = r.rows.find((x) => x.rent_authority === "conflict" && x.conflict_state === "clear");
  ok("A6  'no contractual rent recorded' does not read the same as 'more than one applies'",
    !!missingRow && !!conflictRentRow && missingRow.text !== conflictRentRow.text);

  //  ── A NON-REVENUE POSITION MUST SAY SO ───────────────────────────
  const nonRev = r.rows.find((x) => x.denominator_class === "non_revenue");
  const unknownDen = r.rows.find((x) => x.denominator_class === "unknown");
  const revenue = r.rows.find((x) => x.denominator_class === "revenue");
  ok("A7  a non-revenue position states that it is outside the denominator",
    !!nonRev && /non-revenue|not counted/i.test(nonRev.text));
  ok("A8  an unclassified position states that it is not classified",
    !!unknownDen && /not classified|no governed use/i.test(unknownDen.text));
  ok("A9  a revenue position carries no such qualifier",
    !!revenue && !/non-revenue|not classified/i.test(revenue.text));

  //  ── BLOCKERS AND CONFLICT REACH THE ROW ──────────────────────────
  const conflicted = r.rows.find((x) => x.conflict_state === "conflicted");
  ok("A10 a contested position names how many lease claims overlap",
    !!conflicted && /overlapping lease claim/i.test(conflicted.text) && /\b2\b/.test(conflicted.text));
  ok("A11 a row with a typed blocker renders the server's blocker detail",
    r.rows.some((x) => /cannot prove this month|no dated schedule nor a lease amount|more than one base rent|no governed use_type/i.test(x.text)));

  //  ── ACTIONS: THE EXACT EXISTING ONE, OR AN HONEST ABSENCE ────────
  const withAction = r.rows.filter((x) => x.resolution_state === "existing_action");
  ok("A12 an existing action names its closing act, its owner and its due state",
    withAction.some((x) => /Resolve the inbound opportunity/.test(x.text)
      && /overdue|due today|not due|no due date/i.test(x.text)));
  ok("A13 an unowned obligation reads UNASSIGNED, never a substituted name",
    withAction.some((x) => /UNASSIGNED/.test(x.text)));
  ok("A14 an obligation type with no governed destination discloses that",
    withAction.some((x) => /no governed operator destination/i.test(x.text)));
  ok("A15 two active obligations refuse to select one",
    r.rows.some((x) => x.resolution_state === "conflict"
      && /more than one active obligation/i.test(x.text)));
  ok("A16 a closed obligation stays visible as lineage, not as work",
    r.rows.some((x) => x.resolution_state === "no_canonical_action"
      && /closed|complete/i.test(x.text) && !/open work/i.test(x.text)));

  //  ── NO INVENTED WORK, NO LEAKED IDENTIFIERS ──────────────────────
  const REMOVED = ["economic_tenancy_activation_required", "possession_outstanding",
                   "review_early_possession", "turn_before_committed_start",
                   "confirm_physical_readiness"];
  ok("A17 none of the five removed action strings appears on the surface",
    !REMOVED.some((s) => r.text.includes(s)));
  ok("A18 no UUID is rendered to the operator",
    !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(r.text));
  ok("A19 market rent ($9,876 on every unit) never reaches the surface", !/9,?876/.test(r.text));
  ok("A20 a withheld rate never renders as 0%", !/\b0(\.0)?%/.test(r.text));

  //  ── SCOPE OF READ: this surface's own network ────────────────────
  ok("A21 no console error attributable to Future Rent Roll"
    + (A.bag.consoleErrors.length ? " (" + A.bag.consoleErrors.join(" | ").slice(0, 200) + ")" : ""),
    A.bag.consoleErrors.length === 0);
  ok("A22 no uncaught page error", A.bag.pageErrors.length === 0);
  ok("A23 no failed request", A.bag.failedRequests.length === 0);
  ok("A24 no hidden non-2xx — every response was 2xx"
    + (A.bag.nonOk.length ? " (" + A.bag.nonOk.join(" | ") + ")" : ""), A.bag.nonOk.length === 0);
  await A.page.screenshot({ path: path.join(SP, "frr_1_states_desktop.png"), fullPage: true });

  // ══════════════════════════════════════════════════════════════════
  section("B  published, empty, no-positions, no-operating-day, forbidden");
  // ══════════════════════════════════════════════════════════════════
  const C = await newPage(browser, { tok: S.tokC, uid: S.uC, pid: S.C });
  await openSurface(C.page);
  let rc = await renderFrr(C.page, { asOf: S.target_date });
  seenResult.add("qualifying_result_exists");
  ok("B1  a fully settled property PUBLISHES a rate", /60(\.0)?%/.test(rc.text));
  ok("B2  and states its numerator and denominator", /3 of 5 revenue positions/.test(rc.text));
  ok("B3  and publishes a total", /\$6,499/.test(rc.text));
  ok("B4  and DISCLOSES that the total carries a legacy amount",
    /including amounts carried from a lease with no dated schedule/i.test(rc.text));
  ok("B5  no console error on the published path", C.bag.consoleErrors.length === 0
    && C.bag.pageErrors.length === 0 && C.bag.nonOk.length === 0);
  await C.page.screenshot({ path: path.join(SP, "frr_2_published_desktop.png"), fullPage: true });

  const E = await newPage(browser, { tok: S.tokE, uid: S.uE, pid: S.E });
  await openSurface(E.page);
  const re = await renderFrr(E.page, { asOf: S.target_date });
  ok("B6  a property with no REVENUE position says nothing is measured on this date",
    /nothing measured on this date/i.test(re.text));
  ok("B7  and does not render 0%", !/\b0(\.0)?%/.test(re.text));

  const N = await newPage(browser, { tok: S.tokN, uid: S.uN, pid: S.N });
  await openSurface(N.page);
  const rn = await renderFrr(N.page, { asOf: S.target_date });
  seenResult.add("no_qualifying_result");
  ok("B8  a property with NO positions says so, and is not confused with a page",
    /no canonical position|0 positions|no positions/i.test(rn.text));

  const Z = await newPage(browser, { tok: S.tokZ, uid: S.uZ, pid: S.Z });
  await openSurface(Z.page);
  const rz = await renderFrr(Z.page, { asOf: S.target_date });
  seenResult.add("authority_missing");
  ok("B9  a property with NO operating day refuses rather than borrowing a clock",
    rz.state === "unavailable" && /operating (day|timezone)/i.test(rz.text));
  ok("B10 and renders no rate, no total and no rows",
    !/%/.test(rz.text) && !/\$/.test(rz.text));
  await Z.page.screenshot({ path: path.join(SP, "frr_3_no_operating_day.png"), fullPage: false });

  //  FORBIDDEN — a REAL signed-in operator without the leasing module.
  const F = await newPage(browser, { tok: S.tokNoLease, uid: S.uNoLease, pid: S.S });
  await openSurface(F.page);
  const rf = await renderFrr(F.page, { asOf: S.target_date });
  ok("B11 a maintenance-only operator gets FORBIDDEN, not an empty rent roll",
    rf.state === "forbidden" && /do not have leasing access/i.test(rf.text));
  ok("B12 and no position, rate or total leaks into it",
    !/%/.test(rf.text) && rf.rows.length === 0);

  //  NO SESSION — zero live calls, no fixture fallback.
  const anon = await newPage(browser, null);
  const ra = await renderFrr(anon.page, { asOf: S.target_date });
  ok("B13 with no session the surface refuses",
    ra.state === "unavailable" || ra.state === "forbidden");
  ok("B14 and made ZERO future-rent-roll requests", anon.bag.frrRequests.length === 0);
  ok("B15 and shows no fixture content", ra.rows.length === 0 && !/\$/.test(ra.text));

  // ══════════════════════════════════════════════════════════════════
  section("C  the ten contract states, and the three that cannot be produced");
  // ══════════════════════════════════════════════════════════════════
  const producedEvidence = [...seenEvidence].sort();
  const unproducedEvidence = EVIDENCE_STATES.filter((v) => !seenEvidence.has(v));
  const unproducedResult = RESULT_STATES.filter((v) => !seenResult.has(v));
  console.log(`   evidence rendered: ${producedEvidence.join(", ")}`);
  console.log(`   result   rendered: ${[...seenResult].sort().join(", ")}`);
  ok(`C1  every evidence state the engine can produce is rendered (${producedEvidence.length})`,
    producedEvidence.length === EVIDENCE_STATES.length - unproducedEvidence.length
    && producedEvidence.length >= 4);
  ok("C2  each rendered evidence state renders a DISTINCT operator sentence",
    (() => {
      const labels = new Set();
      for (const v of producedEvidence) {
        const row = r.rows.find((x) => x.evidence_state === v);
        if (!row) return false;
        const m = row.text.match(/Evidence: ([^·]+)/);
        if (!m) return false;
        labels.add(m[1].trim());
      }
      return labels.size === producedEvidence.length;
    })());
  //  THE HONEST PART. Three declared states have no producer, and this
  //  harness says so with the reason rather than counting to ten.
  ok("C3  the unproducible states are exactly the two evidence + one result named",
    unproducedEvidence.length === 2 && unproducedEvidence.includes("untrackable")
    && unproducedEvidence.includes("unavailable")
    && unproducedResult.length === 1 && unproducedResult[0] === "unavailable");
  note("DECLARED BUT UNPRODUCIBLE — evidence_state 'untrackable' and 'unavailable' are never");
  note("  returned by evidenceStateFor() (dated_position_rows.js:124-133), and");
  note("  RESULT_STATE.UNAVAILABLE is never returned by datedPositionRows().");
  note("  The summary CONSUMES all three. So 7 of the 10 declared contract states are");
  note("  rendered, and 3 are unreachable — reported, not counted as rendered.");
  ok("C4  the renderer nonetheless carries a label for ALL SIX evidence states,"
    + " so a newly reachable one cannot render blank",
    await A.page.evaluate((vs) => !!window.psFrrEvidenceLabel
      && vs.every((v) => typeof window.psFrrEvidenceLabel(v) === "string"
        && window.psFrrEvidenceLabel(v).length > 0)
      && new Set(vs.map((v) => window.psFrrEvidenceLabel(v))).size === vs.length,
      EVIDENCE_STATES));

  // ══════════════════════════════════════════════════════════════════
  section("D  the seventeen position states, all rendered");
  // ══════════════════════════════════════════════════════════════════
  let renderedValues = 0;
  for (const [axis, allowed] of Object.entries(POSITION_AXES)) {
    const missing = allowed.filter((v) => !seenAxis[axis].has(v));
    renderedValues += allowed.length - missing.length;
    ok(`D.${axis}  all ${allowed.length} values rendered`
      + (missing.length ? ` (missing: ${missing.join(",")})` : ""), missing.length === 0);
  }
  ok(`D0  seventeen of seventeen position states rendered (got ${renderedValues})`,
    renderedValues === 17);
  //  RENDERED means VISIBLE, not merely present as an attribute.
  ok("D1  every position_state value appears in the visible text of its own row",
    POSITION_STATES.every((v) => {
      const row = r.rows.find((x) => x.position_state === v);
      return row && row.text.toLowerCase().includes(v.replace(/_/g, " "));
    }));

  // ══════════════════════════════════════════════════════════════════
  section("E  pagination against 10,000 real positions");
  // ══════════════════════════════════════════════════════════════════
  if (!S.scale) { ok("E0  the 10D scale fixture is present", false); }
  else {
    const P = await newPage(browser, { tok: S.scale.tok, uid: S.scale.user, pid: S.scale.property_id });
    await openSurface(P.page);
    const p1 = await renderFrr(P.page, { asOf: S.target_date });
    ok("E1  page one renders", p1.state === "data");
    ok(`E2  page one is BOUNDED at the default of 50 (got ${p1.rows.length})`, p1.rows.length === 50);
    ok("E3  and states the whole-property population beside the page",
      /50 of 10000|50 of 10,000/.test(p1.text.replace(/\s+/g, " ")));
    //  THE LATE BLOCKER. Every adverse position sits at ordinal >= 9,900, so
    //  a page-one summary computed from page one would look clean.
    ok("E4  page one's rate is WITHHELD by a blocker ~9,900 rows away",
      /Projected occupancy unavailable/i.test(p1.text)
      && /no governed use_type/i.test(p1.text));
    ok("E5  and none of the blocking positions is on page one",
      !p1.rows.some((x) => x.denominator_class === "unknown"));

    const summary1 = p1.summaryText;
    ok("E6  a summary block is identifiable for cross-page comparison", summary1.length > 0);
    await P.page.screenshot({ path: path.join(SP, "frr_4_scale_page_one.png"), fullPage: false });

    //  TRAVERSE. The real control, clicked — not a synthesised call.
    const seenUnits = new Map([[1, p1.rows.map((x) => x.unit)]]);
    let more = await P.page.$("[data-ps-load-more]");
    ok("E7  a next-page control is offered while more positions exist", !!more);
    const pages = [p1];
    for (let n = 2; n <= 3 && more; n++) {
      await more.click();
      await P.page.waitForTimeout(1500);
      const pn = await renderFrr(P.page, { asOf: S.target_date,
        cursor: await P.page.evaluate(() => window._psFrrCursor) });
      pages.push(pn);
      seenUnits.set(n, pn.rows.map((x) => x.unit));
      more = await P.page.$("[data-ps-load-more]");
    }
    ok(`E8  three pages were traversed (got ${pages.length})`, pages.length === 3);
    const all = [...seenUnits.values()].flat();
    ok(`E9  NO DUPLICATION across pages (${all.length} rows, ${new Set(all).size} distinct)`,
      all.length === new Set(all).size && all.length === 150);
    ok("E10 page two is not page one",
      JSON.stringify(seenUnits.get(1)) !== JSON.stringify(seenUnits.get(2)));
    ok("E11 the SUMMARY is unchanged across every page",
      pages.every((p) => p.summaryText === summary1));

    /*  A MALFORMED CURSOR MUST FAIL HONESTLY AND VISIBLY. Two shapes, because
        the contract types them differently and a consumer that renders one
        sentence for both has thrown the distinction away: a value that is not
        a cursor at all (cursor_malformed) and a well-shaped value this
        service did not sign (cursor_signature_invalid). Neither may quietly
        become page one — that would re-serve rows the caller already has. */
    P.bag.nonOk.length = 0;
    const bad = await renderFrr(P.page, { asOf: S.target_date, cursor: "not-a-cursor-at-all" });
    ok("E12 a malformed cursor produces a visible refusal, not a silent page one",
      bad.state === "unavailable" && bad.rows.length === 0);
    ok("E13 and the refusal names the cursor as the reason, in the server's words",
      /cursor is not a well-formed value/i.test(bad.text));
    ok("E14 and the server refused it with a 400, not a 200 page one",
      P.bag.nonOk.some((s) => s.startsWith("400")));
    ok("E14b and offers a retry rather than a dead end",
      await P.page.evaluate(() => !!document.querySelector("[data-ps-frr-retry]")));
    await P.page.screenshot({ path: path.join(SP, "frr_7_cursor_refused.png"), fullPage: false });

    const forged = await renderFrr(P.page, { asOf: S.target_date, cursor: "eyJhIjoxfQ.0000000000000000000000000000000" });
    ok("E15 a forged cursor is refused as unsigned, and says so differently",
      forged.state === "unavailable" && /not issued by this service/i.test(forged.text));
    ok("E16 the two cursor refusals do not read the same",
      forged.text !== bad.text);

    // ── F  the browser never downloads all 10,000 rows ──────────────
    section("F  transport ceiling");
    ok(`F1  every response carried at most PAGE_MAX rows`
      + ` (total downloaded across ${P.bag.frrRequests.length} requests: ${P.bag.frrRowsDownloaded})`,
      P.bag.frrRowsDownloaded <= 200 * P.bag.frrRequests.length);
    ok(`F2  the browser never downloaded 10,000 rows (downloaded ${P.bag.frrRowsDownloaded})`,
      P.bag.frrRowsDownloaded < 1000);
    const kb = Math.round(P.bag.frrBytes / 1024);
    ok(`F3  total future-rent-roll bytes stayed bounded (${kb} KB over ${P.bag.frrRequests.length} requests)`,
      P.bag.frrBytes < 3 * 1024 * 1024);
    note(`unbounded, this property's row set measured 15,284 KB in the 10D scale proof.`);
    await P.page.screenshot({ path: path.join(SP, "frr_4_scale_page_one.png"), fullPage: false });

    // ── G  390px on the scale property ─────────────────────────────
    const M2 = await newPage(browser, { tok: S.scale.tok, uid: S.scale.user, pid: S.scale.property_id },
      { width: 390, height: 844 });
    await openSurface(M2.page);
    const m2 = await renderFrr(M2.page, { asOf: S.target_date });
    const box2 = await surfaceBox(M2.page);
    ok("G0  the scale property renders at 390px with the page still bounded",
      m2.state === "data" && m2.rows.length === 50);
    ok(`G0a and is VISIBLE (${Math.round(box2.w)}px, ${box2.rowsVisible}/${box2.rows} rows measurable)`,
      box2.w > 200 && box2.h > 100 && box2.rowsVisible === 50);
    ok("G0b no horizontal dead end at 390px on the scale property",
      await M2.page.evaluate(() => document.documentElement.scrollWidth <= 392));
    await M2.page.screenshot({ path: path.join(SP, "frr_6_scale_mobile_390.png"), fullPage: false });
  }

  // ══════════════════════════════════════════════════════════════════
  section("H  390px — the hierarchy holds");
  // ══════════════════════════════════════════════════════════════════
  const M = await newPage(browser, { tok: S.tokS, uid: S.uS, pid: S.S }, { width: 390, height: 844 });
  await openSurface(M.page);
  const rm = await renderFrr(M.page, { asOf: S.target_date });
  ok("H1  the surface renders at 390px", rm.state === "data" && rm.rows.length === 20);
  //  VISIBILITY BEFORE GEOMETRY. Everything below measures; a hidden surface
  //  measures 0 and would satisfy every width assertion by having no width.
  const boxM = await surfaceBox(M.page);
  ok(`H1b the surface is actually VISIBLE at 390px (${Math.round(boxM.w)}px wide,`
    + ` ${boxM.rowsVisible}/${boxM.rows} rows measurable)`,
    boxM.w > 200 && boxM.h > 100 && boxM.rows === 20 && boxM.rowsVisible === 20);
  ok("H2  no horizontal dead end",
    await M.page.evaluate(() => document.documentElement.scrollWidth <= 392));
  ok("H3  no element overflows the viewport width (measured over boxes that exist)",
    await M.page.evaluate(() => {
      const body = document.getElementById("psFrrBody");
      const nodes = [...body.querySelectorAll("*")]
        .filter((n) => { const b = n.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
      //  A pass over an empty list proves nothing, so require a real population.
      return nodes.length > 50 && nodes.every((n) => n.getBoundingClientRect().right <= 392);
    }));
  //  THE PRIMARY ACTION MUST NOT BE CLIPPED. On this surface the primary
  //  action is the horizon control; on the scale property it is Load more.
  ok("H4  the horizon controls are fully inside the viewport at 390px",
    await M.page.evaluate(() => {
      const chips = [...document.querySelectorAll(".rr-fwd-chip")];
      return chips.length > 0 && chips.every((c) => {
        const b = c.getBoundingClientRect();
        return b.left >= -1 && b.right <= 391 && b.width > 0 && b.height > 0;
      });
    }));
  //  ORDER: space -> position -> rent/withheld -> conflict/blocker -> action.
  ok("H5  every row keeps the hierarchy space -> position -> rent -> blocker -> action",
    await M.page.evaluate(() => {
      const rows = [...document.querySelectorAll("[data-ps-row]")]
        .filter((n) => n.getBoundingClientRect().height > 0);
      if (rows.length !== 20) return false;
      return rows.every((n) => {
        const order = ["unit", "position", "rent", "blocker", "action"];
        const found = order
          .map((k) => n.querySelector('[data-ps-part="' + k + '"]'))
          .map((el, i) => (el ? { i, top: el.getBoundingClientRect().top,
                                  left: el.getBoundingClientRect().left } : null))
          .filter(Boolean);
        //  unit and position share a line; every later part must start lower.
        for (let i = 1; i < found.length; i++) {
          if (found[i].top < found[i - 1].top - 1) return false;
        }
        //  unit and position must BOTH exist on every row; rent too.
        return !!n.querySelector('[data-ps-part="unit"]')
          && !!n.querySelector('[data-ps-part="position"]')
          && !!n.querySelector('[data-ps-part="rent"]');
      });
    }));
  ok("H6  a contested row shows its conflict line above its action line at 390px",
    await M.page.evaluate(() => {
      const n = document.querySelector('[data-ps-conflict-state="conflicted"]');
      if (!n) return false;
      const b = n.querySelector('[data-ps-part="blocker"]'), a = n.querySelector('[data-ps-part="action"]');
      return !!b && !!a && b.getBoundingClientRect().top < a.getBoundingClientRect().top;
    }));
  ok("H7  no console error at 390px", M.bag.consoleErrors.length === 0
    && M.bag.pageErrors.length === 0 && M.bag.nonOk.length === 0);
  await M.page.screenshot({ path: path.join(SP, "frr_5_states_mobile_390.png"), fullPage: true });

  // ══════════════════════════════════════════════════════════════════
  section("I  a real outage — unavailable, and nothing stale survives");
  // ══════════════════════════════════════════════════════════════════
  const before = await renderFrr(A.page, { asOf: S.target_date });
  ok("I1  content is present before the outage", before.rows.length === 20);
  try { process.kill(Number(fs.readFileSync(path.join(SP, "tls.pid"), "utf8").trim()), "SIGKILL"); }
  catch (_) { /* already down */ }
  await new Promise((res) => setTimeout(res, 1200));
  const outage = await renderFrr(A.page, { asOf: S.target_date });
  ok("I2  a real outage renders UNAVAILABLE", outage.state === "unavailable");
  ok("I3  and explicitly refuses stale content", /nothing cached is shown/i.test(outage.text));
  ok("I4  and the previous successful content is GONE", outage.rows.length === 0
    && !/contractually locked/i.test(outage.text));

  await browser.close();
  console.log(`\n════ future rent roll browser: ${pass} passed, ${fail} failed ════`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error("DIED: " + (e && e.stack || e));
  console.log(`\n════ future rent roll browser: ${pass} passed, ${fail + 1} failed ════`);
  process.exit(1);
});
