// ════════════════════════════════════════════════════════════════════
//  PROOF PRESENTATION CONTRACT — REAL-BROWSER PROOF.
//
//  Release 0, step 1. Owner ruling: "split the acceptance by
//  responsibility." This harness discharges the part of the former check 6
//  that must NOT be proven by manufacturing a production completion.
//
//  ── WHAT IT PROVES ──────────────────────────────────────────────────
//  The `completed` and `completion_claimed` presentation branches of
//  work-lifecycle-door.js render correctly for every proof payload shape
//  the normalizer accepts, and render UNAVAILABLE — loudly — for every
//  shape it must reject.
//
//  ── WHAT IT DELIBERATELY DOES NOT PROVE ─────────────────────────────
//  Nothing about production. Nothing about the canonical writer. Nothing
//  about whether a technician can complete a work order. It is a proof
//  about deterministic presentation logic and it claims exactly that.
//
//  ── WHY FIXTURES ARE LEGITIMATE HERE ────────────────────────────────
//  A fixture is dishonest when it stands in for an operating fact. These
//  stand in for an API RESPONSE SHAPE — the contract's own subject. The
//  alternative is recording that a repair happened when none did, which
//  puts a false fact in production reporting forever to light up a
//  sentence on a screen.
//
//  ── FIXTURE FIDELITY IS THE WHOLE RISK ──────────────────────────────
//  A fixture that drifts from the server projection proves the fixture.
//  `projection()` and `listRow()` below mirror `readWorkOrderStatus` and
//  `readPropertyWorkOrderStatuses` in property-spine-api
//  src/surfaces/work_order_status_read.js field for field, INCLUDING the
//  list's deliberate narrowing to three proof fields. That narrowing is
//  not an omission here — it is the subject of F1/F2.
//
//  ── REAL FILES, REAL BROWSER ────────────────────────────────────────
//  Real Chromium loads the ACTUAL deployed proof-normalizer.js and
//  work-lifecycle-door.js off disk. No module shim, no re-implementation,
//  no jsdom. The door is driven through its own public entry points
//  (loadList / loadDetail) so the render pipeline under test is the one
//  that runs in production.
//
//  ── NEGATIVE CONTROLS ARE NOT OPTIONAL ──────────────────────────────
//  A pass consisting only of well-formed payloads would prove the door
//  renders. It would not prove the door REFUSES. Every N-case asserts
//  both halves: unavailable on screen AND a contract-failure line in the
//  console. Without them a dead-open normalizer scores full marks.
//
//  ── NO NETWORK, NO DATABASE, NO CREDENTIAL ──────────────────────────
//  __psLive is stubbed. Nothing leaves the process.
//
//  run:  node proof_presentation_contract.browser.js
//  exit: 0 all assertions pass · 1 any failure
// ════════════════════════════════════════════════════════════════════
"use strict";

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const APP = __dirname;
const API = process.env.API_DIR || "/home/user/property-spine-api";
const { chromium } = require(path.join(API, "node_modules/playwright"));

const NORMALIZER = path.join(APP, "proof-normalizer.js");
const DOOR = path.join(APP, "work-lifecycle-door.js");

let passed = 0, failed = 0;
const ok = (label, cond, detail) => {
  if (cond) { passed++; console.log("  ok    " + label); }
  else { failed++; console.log("  FAIL  " + label + (detail ? "\n          → " + detail : "")); }
};
const section = (t) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 58 - t.length))}`);
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

// ════════════════════════════════════════════════════════════════════
//  THE SIX PAYLOAD SHAPES the ruling names, plus the two boolean poles
//  of the current contract, which are different renderings and so are
//  different cases.
// ════════════════════════════════════════════════════════════════════
const OLD_TRUE  = { required: true, satisfied: true,  not_preserved_count: 0 };
const OLD_FALSE = { required: true, satisfied: false, not_preserved_count: 0 };

const newProof = (state, satisfied, extra) => Object.assign({
  required: true, read_status: "ok", state, satisfied,
  not_preserved_count: 0,
  legacy_evidence: { column_photo_present: false, column_note_present: false },
}, extra || {});

const NEW_SATISFIED   = newProof("satisfied", true);
const NEW_NOT_SAT     = newProof("not_satisfied", false);
const NEW_LEGACY      = newProof("legacy_indeterminate", null,
                          { legacy_evidence: { column_photo_present: true, column_note_present: true } });
const NEW_DEFECT      = newProof("missing_evaluation_defect", null);
const NEW_UNAVAILABLE = { required: true, read_status: "unavailable", reason_code: "proof_read_timeout" };

// ── the sentences the door is contracted to produce ──────────────────
//  ── TWO SENTENCES CHANGED BY RULING, NOT BY DRIFT ──────────────────
//  The Work Orders UI contract asks proof to stay quiet until it matters and
//  to say the plainest true thing when it does. "Repair photo preserved" and
//  "Photo required before close" both described our machinery — a
//  classification and a gate — to somebody who only wants to know whether the
//  work is proven. The evidence count comes with it, because "verified" and
//  "verified, and here is how much" are different amounts of confidence.
//
//  The fixtures below carry no `preserved_count`, so these are the honest
//  countless forms. §5: the door states a count only when the server sent one
//  — "· 0 photos" beside a satisfied proof would be a number nobody measured.
//  The counted form is asserted separately.
//
//  THE OTHER THREE SENTENCES ARE UNCHANGED, deliberately. Legacy, defect and
//  unavailable are not "no proof" and must never be shortened into it.
const S_PRESERVED = "Proof verified.";
const S_REQUIRED  = "Needs proof.";
const S_LEGACY    = "Completed under the prior proof model. "
                  + "No historical evaluation was recorded.";
const S_DEFECT    = "Completion occurred after proof evaluation became required, "
                  + "but no evaluation was recorded.";
const S_UNAVAIL   = "Proof state unavailable.";

// ════════════════════════════════════════════════════════════════════
//  PROJECTION BUILDERS — mirror the server, field for field.
//  property-spine-api src/surfaces/work_order_status_read.js
// ════════════════════════════════════════════════════════════════════
const AT = "2026-08-06T14:30:00.000Z";

function projection(state, proof, opts) {
  const o = opts || {};
  const claimed = state === "completion_claimed" || state === "completed";
  const done = state === "completed";
  const wo = {
    work_order: {
      id: o.id || "11111111-1111-4111-8111-111111111111",
      reference: "WO-TEST-1", title: "Kitchen faucet leak",
      unit_number: "204", status: done ? "complete" : "open",
      urgency_status: "regular", opened_at: AT,
    },
    current: {
      state,
      accountable: { user_id: "u-1", name: "Dana Whitfield" },
      assigned_to: { user_id: "u-1", name: "Dana Whitfield" },
      accepted_at: AT, en_route_at: null, blocked: null, latest_finding: null,
      completion_claimed_at: claimed ? AT : null,
      completed_at: done ? AT : null,
      completed_by: done ? { user_id: "u-1", name: "Dana Whitfield" } : null,
      resident_coordination: null, resident_exception: null,
    },
    next_action: done ? null : "Close out the work order",
    open_follow_up: null,
    resident_update: [],
    history: [],
  };
  //  OMITTED, not null — the N1 case is a response with no `proof` key at
  //  all, which is a different fact from `proof: null`.
  if (proof !== undefined) wo.proof = proof;
  return wo;
}

//  The LIST row, narrowed exactly as readPropertyWorkOrderStatuses narrows
//  it: work_order, current, next_action, and THREE proof fields.
function listRow(state, proof, opts) {
  const full = projection(state, proof, opts);
  const row = { work_order: full.work_order, current: full.current,
                next_action: full.next_action, resident_update_count: 0 };
  if (proof !== undefined) {
    row.proof = { required: proof.required, satisfied: proof.satisfied,
                  not_preserved_count: proof.not_preserved_count };
  }
  return row;
}

// ════════════════════════════════════════════════════════════════════
(async function main() {
  console.log("PROOF PRESENTATION CONTRACT — real Chromium, real deployed files\n");
  console.log("  proof-normalizer.js      " + sha(NORMALIZER));
  console.log("  work-lifecycle-door.js   " + sha(DOOR));

  //  The pre-installed browser under PLAYWRIGHT_BROWSERS_PATH, never a
  //  download. Its build number need not match the client's pin, so it is
  //  named explicitly rather than resolved.
  const EXE = process.env.PS_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  if (!fs.existsSync(EXE)) throw new Error("chromium not found at " + EXE);
  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const page = await browser.newPage();

  //  Every console.error the normalizer emits, in order. This is the
  //  observed consequence the negative controls are judged against.
  const contractFailures = [];
  page.on("console", (m) => {
    const t = m.text();
    if (t.indexOf("[proof-normalizer] CONTRACT FAILURE") === 0) contractFailures.push(t);
  });
  page.on("pageerror", (e) => { failed++; console.log("  FAIL  uncaught page error → " + e.message); });

  await page.setContent(
    '<div id="intelStrip"></div><div id="workOrdersBody"></div>');

  // ── LOAD ORDER IS PART OF THE CONTRACT ────────────────────────────
  //  The normalizer must be defined before the door can consume it. Load
  //  it first here, and assert index.html does the same, because this
  //  harness's own ordering proves nothing about the shipped page.
  section("load order");
  await page.addScriptTag({ path: NORMALIZER });
  ok("H1  proof-normalizer defines window.__psProof",
     await page.evaluate(() => typeof window.__psProof === "object" && window.__psProof !== null));

  await page.addScriptTag({ path: DOOR });
  ok("H2  work-lifecycle-door defines window.__psWorkOrders",
     await page.evaluate(() => typeof window.__psWorkOrders === "object" && window.__psWorkOrders !== null));

  //  MATCH THE SCRIPT TAG, NOT THE FILENAME. A first cut searched for the
  //  bare filename and found a PROSE COMMENT 20k lines above the real tag,
  //  then reported the load order was wrong. Same error class as reading a
  //  column name out of prose: the assertion must read the thing that
  //  governs the behaviour, which here is <script src>.
  const html = fs.readFileSync(path.join(APP, "index.html"), "utf8");
  const tags = (html.match(/<script[^>]+src\s*=\s*["'][^"']*(proof-normalizer|work-lifecycle-door)\.js["'][^>]*>/g) || [])
    .map((t) => (/proof-normalizer/.test(t) ? "normalizer" : "door"));
  ok("H3  index.html has exactly one script tag for each",
     tags.filter((t) => t === "normalizer").length === 1
     && tags.filter((t) => t === "door").length === 1,
     JSON.stringify(tags));
  ok("H4  index.html loads the normalizer BEFORE the door",
     tags.indexOf("normalizer") !== -1 && tags.indexOf("normalizer") < tags.indexOf("door"),
     JSON.stringify(tags));

  // ── THE STUB ──────────────────────────────────────────────────────
  await page.evaluate(() => {
    window.__psFixture = { list: null, detail: null };
    window.__psLive = {
      hasSession: () => true,
      workOrderLifecycleList: async () => ({ data: window.__psFixture.list }),
      workOrderLifecycle: async () => ({ data: window.__psFixture.detail }),
      workOrderTechnicians: async () => ({ data: { technicians: [] } }),
    };
  });

  //  Render one detail projection and hand back what the operator sees.
  async function detail(proj) {
    const before = contractFailures.length;
    await page.evaluate((p) => { window.__psFixture.detail = p; }, proj);
    await page.evaluate(() => window.__psWorkOrders.loadDetail("x"));
    const text = await page.evaluate(() =>
      document.getElementById("workOrdersBody").innerText);
    const inner = await page.evaluate(() =>
      document.getElementById("workOrdersBody").innerHTML);
    return { text, inner, newFailures: contractFailures.slice(before) };
  }

  //  Render one list row and hand back the row's state line.
  //
  //  backToList() FIRST, and it is not tidiness. render() prefers
  //  state.detail whenever it is set, and loadList() does not clear it —
  //  so a list case run after a detail case silently re-renders the DETAIL
  //  and finds no row. The first cut of this harness did exactly that and
  //  reported seven product failures that were all this one line. The
  //  door's own open() clears the same three fields for the same reason.
  async function listLine(row) {
    await page.evaluate(() => window.__psWorkOrders.backToList());
    const before = contractFailures.length;
    await page.evaluate((r) => {
      window.__psFixture.list = { count: 1, work_orders: [r] };
    }, row);
    await page.evaluate(() => window.__psWorkOrders.loadList());
    const line = await page.evaluate(() => {
      const el = document.querySelector(".wo-row .wo-s");
      return el ? el.textContent : null;
    });
    return { line, newFailures: contractFailures.slice(before) };
  }

  // ══════════════════════════════════════════════════════════════════
  //  DETAIL — the `completed` branch
  // ══════════════════════════════════════════════════════════════════
  section("detail · completed");
  const D = [
    ["D1  current boolean-only · satisfied      → preserved", OLD_TRUE,        S_PRESERVED, null],
    ["D2  current boolean-only · not satisfied  → required",  OLD_FALSE,       S_REQUIRED,  "attn"],
    ["D3  four-state satisfied                  → preserved", NEW_SATISFIED,   S_PRESERVED, null],
    ["D4  four-state not_satisfied              → required",  NEW_NOT_SAT,     S_REQUIRED,  "attn"],
    ["D5  legacy_indeterminate                  → own words", NEW_LEGACY,      S_LEGACY,    "attn"],
    ["D6  missing_evaluation_defect             → own words", NEW_DEFECT,      S_DEFECT,    "exc"],
    ["D7  read unavailable                      → unavail",   NEW_UNAVAILABLE, S_UNAVAIL,   "attn"],
  ];
  for (const [label, proof, sentence, tone] of D) {
    const r = await detail(projection("completed", proof));
    const hasCompleted = r.text.indexOf("Completed by Dana at") !== -1;
    const hasSentence = r.text.indexOf(sentence) !== -1;
    const toneOk = tone === null
      ? true
      : r.inner.indexOf('class="' + tone + '"') !== -1;
    ok(label, hasCompleted && hasSentence && toneOk && r.newFailures.length === 0,
       "completed-line=" + hasCompleted + " sentence=" + hasSentence
       + " tone(" + tone + ")=" + toneOk + " failures=" + r.newFailures.length
       + "\n            saw: " + JSON.stringify(r.text.slice(0, 200)));
  }

  // ══════════════════════════════════════════════════════════════════
  //  DETAIL — the `completion_claimed` branch
  // ══════════════════════════════════════════════════════════════════
  section("detail · completion_claimed");
  const C = [
    ["C1  current boolean-only · satisfied      → preserved", OLD_TRUE,        S_PRESERVED],
    ["C2  current boolean-only · not satisfied  → required",  OLD_FALSE,       S_REQUIRED],
    ["C3  four-state satisfied                  → preserved", NEW_SATISFIED,   S_PRESERVED],
    ["C4  four-state not_satisfied              → required",  NEW_NOT_SAT,     S_REQUIRED],
    ["C5  legacy_indeterminate                  → own words", NEW_LEGACY,      S_LEGACY],
    ["C6  missing_evaluation_defect             → own words", NEW_DEFECT,      S_DEFECT],
    ["C7  read unavailable                      → unavail",   NEW_UNAVAILABLE, S_UNAVAIL],
  ];
  for (const [label, proof, sentence] of C) {
    const r = await detail(projection("completion_claimed", proof));
    const hasClaim = r.text.indexOf("Dana reports the work is finished.") !== -1;
    const hasSentence = r.text.indexOf(sentence) !== -1;
    ok(label, hasClaim && hasSentence && r.newFailures.length === 0,
       "claim-line=" + hasClaim + " sentence=" + hasSentence
       + " failures=" + r.newFailures.length
       + "\n            saw: " + JSON.stringify(r.text.slice(0, 200)));
  }

  // ══════════════════════════════════════════════════════════════════
  //  THE ASK-PHOTO CONTROL follows the MEANING, not the boolean.
  //  A claim whose proof state is unknown must not offer "Ask Dana" as
  //  though the photo were merely missing — and must not withhold it
  //  where it genuinely is.
  // ══════════════════════════════════════════════════════════════════
  section("detail · claim control follows proof meaning");
  for (const [label, proof, expectAsk] of [
    ["C8   satisfied claim offers no Ask",        NEW_SATISFIED, false],
    ["C9   not_satisfied claim offers Ask",       NEW_NOT_SAT,   true],
    ["C10  unavailable claim offers Ask",         NEW_UNAVAILABLE, true],
  ]) {
    const r = await detail(projection("completion_claimed", proof));
    const askPresent = r.inner.indexOf('data-act="ask_photo"') !== -1;
    ok(label, askPresent === expectAsk,
       "expected ask_photo=" + expectAsk + " observed=" + askPresent);
  }

  // ══════════════════════════════════════════════════════════════════
  //  NEGATIVE CONTROLS. Without these a dead-open normalizer scores full
  //  marks. Each must render unavailable AND say so in the console.
  // ══════════════════════════════════════════════════════════════════
  section("negative controls · malformed payloads");
  const N = [
    ["N1  proof key absent entirely",              undefined,                                     "proof_absent"],
    ["N3  state=satisfied but satisfied=false",    Object.assign({}, NEW_SATISFIED, { satisfied: false }), "state_boolean_mismatch"],
    ["N4  read_status=ok, legacy_evidence absent", omit(NEW_SATISFIED, "legacy_evidence"),        "legacy_evidence_invalid"],
    ["N5  unavailable read publishing a state",    Object.assign({}, NEW_UNAVAILABLE, { state: "satisfied" }), "unavailable_with_state"],
    ["N6  old contract, count omitted",            omit(OLD_TRUE, "not_preserved_count"),         "not_preserved_count_invalid"],
    ["N7  state outside the closed set",           newProof("probably_fine", true),               "unknown_state"],
    ["N8  required omitted",                       omit(OLD_TRUE, "required"),                    "required_invalid"],
  ];
  for (const [label, proof, reason] of N) {
    const r = await detail(projection("completed", proof));
    const rendersUnavail = r.text.indexOf(S_UNAVAIL) !== -1;
    const noFalseSentence = r.text.indexOf(S_PRESERVED) === -1
                         && r.text.indexOf(S_REQUIRED) === -1;
    const named = r.newFailures.some((f) => f.indexOf(reason) !== -1);
    ok(label, rendersUnavail && noFalseSentence && named,
       "unavailable=" + rendersUnavail + " no-false-sentence=" + noFalseSentence
       + " named(" + reason + ")=" + named
       + "\n            console: " + JSON.stringify(r.newFailures));
  }

  /* ═══════════════════════════════════════════════════════════════
     N2 WAS HERE, AND IT MOVED SIDES.

     "read_status=ok, satisfied omitted" was a NEGATIVE control expecting
     `satisfied_missing`. It is now a POSITIVE case, because the API is
     retiring §3.4's compatibility field and the app must accept a
     response without it — otherwise the first such response renders
     every work order UNAVAILABLE.

     It is asserted here rather than deleted: the shape still has to
     produce a correct screen, and that is a stronger claim than "it is
     no longer an error".
     ═══════════════════════════════════════════════════════════════ */
  section("the retired compatibility field · renders correctly, not unavailably");
  for (const [label, proof, expect] of [
    ["X1  ok + state satisfied, no satisfied field",
      omit(NEW_SATISFIED, "satisfied"), S_PRESERVED],
    ["X2  ok + state not_satisfied, no satisfied field",
      omit(newProof("not_satisfied", false), "satisfied"), S_REQUIRED],
  ]) {
    const r = await detail(projection("completed", proof));
    const rendered = r.text.indexOf(expect) !== -1;
    const unavail = r.text.indexOf(S_UNAVAIL) !== -1;
    /*  NOT `newFailures.length === 0`. The page also re-renders the LIST
     *  behind the detail from whatever fixture a previous section left
     *  there, so a strict zero here fails on somebody else's payload —
     *  it did, naming `required_invalid` from a negative control eight
     *  cases earlier. The claim is about THIS field: a retired
     *  `satisfied` must not be logged as an app bug. */
    const blamed = r.newFailures.filter((f) => /satisfied/.test(f));
    ok(label, rendered && !unavail && blamed.length === 0,
       "expected=" + JSON.stringify(expect) + " rendered=" + rendered
       + " unavailable=" + unavail
       + " blamed=" + JSON.stringify(blamed)
       + "  — a retired field must not be logged as an app bug");
  }

  // ══════════════════════════════════════════════════════════════════
  //  LIST — stateLine reads proof ONLY for completion_claimed.
  // ══════════════════════════════════════════════════════════════════
  section("list · state line");
  for (const [label, proof, expect] of [
    ["L1  claim + satisfied            → Proof verified",           OLD_TRUE,        "Proof verified"],
    ["L2  claim + not satisfied        → Needs proof",              OLD_FALSE,       "Needs proof"],
    ["L3  claim + defect               → Proof evaluation missing", NEW_DEFECT,      "Proof evaluation missing"],
    ["L4  claim + unavailable read     → Proof state unavailable",  NEW_UNAVAILABLE, "Proof state unavailable"],
  ]) {
    //  The full (un-narrowed) proof object, to test stateLine itself.
    const row = listRow("completion_claimed", proof);
    row.proof = proof;
    const r = await listLine(row);
    ok(label, r.line === expect, "expected " + JSON.stringify(expect)
       + " observed " + JSON.stringify(r.line));
  }

  // ══════════════════════════════════════════════════════════════════
  //  FORWARD-LOOKING — THE LIST PROJECTION IS A NARROWING POINT.
  //
  //  readPropertyWorkOrderStatuses copies exactly three proof fields:
  //  required · satisfied · not_preserved_count. Today that is harmless,
  //  because those three ARE the whole current contract.
  //
  //  The moment the canonical writer emits four states it stops being
  //  harmless. Narrowing drops read_status, state and legacy_evidence, so
  //  the row arrives looking like an OLD payload — and for the two states
  //  whose compatibility boolean is `null`, that payload is ILLEGAL.
  //
  //  Consequence, proven below rather than asserted: every legacy and
  //  every writer-defect work order would render UNAVAILABLE in the LIST
  //  while the DETAIL renders it correctly, with a contract-failure line
  //  per row. Two surfaces disagreeing about one work order is the exact
  //  defect the single interpretation point exists to prevent.
  //
  //  THIS IS A STEP-2 REQUIREMENT, NOT A STEP-1 DEFECT. Nothing emits a
  //  four-state payload yet. It is proven here so the requirement is a
  //  recorded consequence instead of a remembered intention.
  // ══════════════════════════════════════════════════════════════════
  section("forward-looking · list narrowing (step-2 requirement)");
  for (const [label, proof, survives] of [
    ["F1  narrowed satisfied survives narrowing",     NEW_SATISFIED, true],
    ["F2  narrowed not_satisfied survives narrowing", NEW_NOT_SAT,   true],
    ["F3  narrowed legacy_indeterminate BREAKS",      NEW_LEGACY,    false],
    ["F4  narrowed missing_evaluation_defect BREAKS", NEW_DEFECT,    false],
  ]) {
    const r = await listLine(listRow("completion_claimed", proof));
    const broke = r.line === "Proof state unavailable" && r.newFailures.length > 0;
    ok(label, broke === !survives,
       "survives-narrowing expected " + survives + ", line " + JSON.stringify(r.line)
       + ", failures " + r.newFailures.length);
  }

  // ══════════════════════════════════════════════════════════════════
  //  NAVIGATION — no stale proof state survives a round trip. Asserted
  //  here on the deterministic path; the production pass asserts it again
  //  against the live door, because a stub cannot prove a real fetch.
  // ══════════════════════════════════════════════════════════════════
  section("navigation · no stale proof state");
  {
    //  The list says one thing about proof, the detail says another. If any
    //  detail state leaks back onto the list, this is where it shows.
    await page.evaluate((r) => { window.__psFixture.list = { count: 1, work_orders: [r] }; },
      listRow("completion_claimed", OLD_FALSE));
    await page.evaluate((p) => { window.__psFixture.detail = p; },
      projection("completion_claimed", OLD_TRUE));
    //  LOAD the list, not merely stage its fixture. The first cut set
    //  __psFixture.list and never called loadList(), so V3 asserted against
    //  whatever row the previous case happened to leave in state.
    await page.evaluate(() => window.__psWorkOrders.backToList());
    await page.evaluate(() => window.__psWorkOrders.loadList());
    await page.evaluate(() => window.__psWorkOrders.loadDetail("x"));
    const onDetail = await page.evaluate(() =>
      document.getElementById("workOrdersBody").innerText);
    await page.evaluate(() => window.__psWorkOrders.backToList());
    const backOnList = await page.evaluate(() =>
      document.getElementById("workOrdersBody").innerText);
    ok("V1  detail showed the preserved sentence", onDetail.indexOf(S_PRESERVED) !== -1);
    ok("V2  returning to the list retains NO detail proof sentence",
       backOnList.indexOf(S_PRESERVED) === -1,
       JSON.stringify(backOnList.slice(0, 160)));
    ok("V3  the list shows its OWN proof state, not the detail's",
       backOnList.indexOf("Needs proof") !== -1,
       JSON.stringify(backOnList.slice(0, 160)));
  }

  // ══════════════════════════════════════════════════════════════════
  //  THE NORMALIZER MUST BE THE ONLY INTERPRETER.
  // ══════════════════════════════════════════════════════════════════
  section("single interpretation point");
  {
    const src = fs.readFileSync(DOOR, "utf8");
    //  Strip line comments so the file's own prose about proof.satisfied
    //  cannot fail its own rule — the same stripper defect already found
    //  once in this repo's history.
    const code = src.split("\n").map((l) => l.replace(/^\s*\/\/.*$/, "")).join("\n");
    ok("P1  the door never reads a raw proof field",
       !/\bproof\s*\.\s*(satisfied|state|required|not_preserved_count|legacy_evidence|read_status)/.test(code),
       (code.match(/\bproof\s*\.\s*\w+/g) || []).join(", "));
    //  P2 FIRST ASSERTED that the door never string-compares a proof state,
    //  and it was the wrong rule. proofSentence switches on the NORMALIZED
    //  result's `state`, which is precisely the published API — "callers
    //  switch on `renders` for presentation and `state` for meaning". The
    //  rule that actually protects the single interpretation point is
    //  narrower: the RAW payload may be touched in exactly one place, the
    //  hand-off to normalize().
    const rawTouches = code.match(/\.\s*proof\b/g) || [];
    ok("P2  the raw proof object is touched in exactly one place",
       rawTouches.length === 1 && /n\.normalize\(\s*d\s*&&\s*d\.proof\s*\)/.test(code),
       rawTouches.length + " touches: " + rawTouches.join(", "));
    ok("P3  the door has no second normalize implementation",
       (code.match(/function\s+normalize/g) || []).length === 0);
  }

  await browser.close();

  console.log("\n" + "═".repeat(64));
  console.log("  passed " + passed + "   failed " + failed);
  console.log("  contract-failure lines observed: " + contractFailures.length
              + "  (all from negative controls and F3/F4)");
  console.log("═".repeat(64));
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  //  An unguarded throw here would exit 0 on some paths and look like a
  //  pass. It never may.
  console.error("\nHARNESS ERROR — no result is claimed:\n" + (e && e.stack || e));
  process.exit(1);
});

function omit(o, k) {
  const c = Object.assign({}, o);
  delete c[k];
  return c;
}
