#!/usr/bin/env node
"use strict";

// PROPERTY SPINE — THE APP AGAINST THE API'S ACTUAL OUTPUT
//
// Release 0. The normalizer contract proof exercises hand-written
// fixtures. The presentation harness mirrors the server projection by hand
// and names its own risk in its header:
//
//     "A fixture that drifts from the server projection proves the fixture."
//
// This closes that gap. Every payload below came off a real socket:
// property-spine-api tools/step10/prove_http_acceptance.js drives the real
// Express mount against real PostgreSQL and writes what it received into
// release0_api_contract_capture.json. That API proof then FAILS if this
// file's copy is not byte-identical to what it just emitted, so the two
// repos cannot silently disagree about the contract.
//
// ── WHAT A CAPTURE IS, AND IS NOT ───────────────────────────────────
// It is a recording of a real response, not a live request. It goes stale
// the moment the API changes and nobody regenerates it — and the thing
// that detects that is the API-side proof, not this file. Said plainly
// here so nobody reads "real bodies" as "live".
//
// ── WHAT THIS PROVES ────────────────────────────────────────────────
//   C   every real API response normalizes cleanly — no contract failure
//   R   legacy_indeterminate and missing_evaluation_defect RENDER
//       DIFFERENTLY, which is the entire point of the release
//   U   the API's unavailable response is a CONDITION, not a bug
//   N   the list projection is narrower and still normalizes
//   S   no surface interprets proof itself, and the proof path writes
//
// Run:  node release0_api_capture_consumer.test.js
// Exit: 0 all passed · 1 any failed

const fs = require("fs");
const path = require("path");
const P = require("./proof-normalizer.js");

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.error("  ✗ " + name); if (detail) console.error("      " + detail); }
}
function eq(name, actual, expected) {
  ok(name, actual === expected, "expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual));
}
const realError = console.error;
function quiet(fn) { console.error = () => {}; try { return fn(); } finally { console.error = realError; } }

const CAPTURE_FILE = path.join(__dirname, "release0_api_contract_capture.json");

console.log("\n══ The app against the API's actual output ══\n");

//  A MISSING CAPTURE IS RED, NEVER A SKIP. A harness that quietly passes
//  when its subject is absent is the reporting defect run_harnesses.sh
//  exists to prevent, one level down.
if (!fs.existsSync(CAPTURE_FILE)) {
  console.error("  ✗ release0_api_contract_capture.json is missing.");
  console.error("      Regenerate it from the API repo:");
  console.error("      node tools/step10/prove_http_acceptance.js --write-capture");
  process.exit(1);
}
const CAP = JSON.parse(fs.readFileSync(CAPTURE_FILE, "utf8"));
const CASES = CAP.cases || {};

console.log("  provenance: " + CAP.provenance.produced_by);
console.log("              " + CAP.provenance.via + ", schema ledger "
            + CAP.provenance.schema_ledger + " + "
            + (CAP.provenance.migrations_applied_beyond_ledger || []).join(" + ") + "\n");

const STATES = ["satisfied", "not_satisfied", "legacy_indeterminate", "missing_evaluation_defect"];

// ── 0. the capture is not empty ───────────────────────────────────────
//  Every assertion below iterates the capture. An empty one would make all
//  of them vacuously green, which is exactly how a hand-edited or
//  half-written file would slip through.
console.log("  THE CAPTURE IS REAL");
{
  ok("    it carries cases at all", Object.keys(CASES).length >= 10,
     Object.keys(CASES).length + " cases");
  for (const s of STATES) {
    ok("    " + s + " was captured from both routes",
       !!CASES[s + "_detail"] && !!CASES[s + "_list"]);
  }
  ok("    …and an unavailable read was captured too",
     !!CASES.unavailable_detail && !!CASES.unavailable_list);
}

// ── 1. EVERY REAL RESPONSE NORMALIZES CLEANLY ─────────────────────────
//  A contract failure here means the API is emitting something this app
//  cannot read — the exact condition that would render every affected work
//  order as UNAVAILABLE in production.
console.log("\n  C · EVERY REAL API RESPONSE NORMALIZES");
{
  for (const name of Object.keys(CASES).sort()) {
    const r = quiet(() => P.normalize(CASES[name].proof));
    ok("    " + name.padEnd(34) + " → " + r.status,
       r.status !== "contract_failure",
       "reasonCode=" + r.reasonCode + " over " + JSON.stringify(CASES[name].proof));
  }
}

// ── 2. THE FOUR STATES SURVIVE THE TRIP ───────────────────────────────
console.log("\n  C · AND CARRIES THE STATE THE API SENT");
{
  const MAP = { satisfied: true, not_satisfied: false,
                legacy_indeterminate: null, missing_evaluation_defect: null };
  for (const s of STATES) {
    for (const route of ["detail", "list"]) {
      const r = P.normalize(CASES[s + "_" + route].proof);
      eq("    " + route.padEnd(6) + " " + s.padEnd(26) + " state", r.state, s);
      eq("    " + route.padEnd(6) + " " + s.padEnd(26) + " satisfied", r.satisfied, MAP[s]);
    }
  }
}

// ── 3. THE WHOLE POINT: LEGACY AND DEFECT RENDER DIFFERENTLY ──────────
console.log("\n  R · LEGACY AND A WRITER DEFECT ARE NOT THE SAME THING");
{
  const leg = P.normalize(CASES.legacy_indeterminate_detail.proof);
  const def = P.normalize(CASES.missing_evaluation_defect_detail.proof);

  eq("    both are satisfied:null on the API's own wire",
     String(leg.satisfied) + "/" + String(def.satisfied), "null/null");
  ok("    …so `satisfied` alone cannot separate them", leg.satisfied === def.satisfied);

  ok("    they render as DIFFERENT things", leg.renders !== def.renders,
     leg.renders + " vs " + def.renders);
  ok("    …with DIFFERENT sentences for the operator", leg.label !== def.label,
     JSON.stringify([leg.label, def.label]));
  ok("    …and only the defect is flagged as an engineering fault",
     def.isDefect === true && leg.isDefect === false,
     JSON.stringify({ legacy: leg.isDefect, defect: def.isDefect }));
  ok("    neither is collapsed into 'proof failed'",
     leg.renders !== "not_satisfied" && def.renders !== "not_satisfied");
  console.log("      legacy → " + leg.label);
  console.log("      defect → " + def.label);

  //  The list must separate them too, or the BOARD shows one situation.
  const legL = P.normalize(CASES.legacy_indeterminate_list.proof);
  const defL = P.normalize(CASES.missing_evaluation_defect_list.proof);
  ok("    the LIST separates them as well — the board is where they meet",
     legL.renders !== defL.renders && legL.label !== defL.label,
     JSON.stringify({ legacy: legL.renders, defect: defL.renders }));
  ok("    …and the list and detail agree with each other",
     legL.renders === leg.renders && defL.renders === def.renders &&
     legL.isDefect === leg.isDefect && defL.isDefect === def.isDefect);
}

// ── 4. UNAVAILABLE IS A CONDITION, NOT A BUG ──────────────────────────
console.log("\n  U · THE API'S UNAVAILABLE READ IS UNDERSTOOD, NOT MISREAD");
{
  for (const route of ["detail", "list"]) {
    const raw = CASES["unavailable_" + route].proof;
    ok("    " + route + ": the API really omitted state and satisfied",
       !("state" in raw) && !("satisfied" in raw), JSON.stringify(Object.keys(raw)));
    const r = P.normalize(raw);
    //  `unavailable`, NOT `contract_failure`. A legitimate condition the API
    //  declared must never be logged as an app bug — the console line is
    //  what tells an engineer which of the two they are looking at.
    eq("    " + route + ": normalizes as a CONDITION", r.status, "unavailable");
    eq("    " + route + ": renders unavailable", r.renders, "unavailable");
    eq("    " + route + ": carries the API's reason", r.reasonCode, raw.reason_code);
    ok("    " + route + ": and invents no state", r.state === null && r.satisfied === null);
    ok("    " + route + ": and is NOT flagged as a defect", r.isDefect === false,
       "an unreadable proof is not an accusation against the writer");
  }
}

// ── 5. NEXT ACTION NEVER CONTRADICTS THE PROOF BLOCK ──────────────────
//  This caught a real defect on the API side: next_action was derived from
//  `satisfied`, which is ABSENT on a failed read, so the API answered
//  "Obtain repair photo before completion" on the same payload that said
//  the proof state was unavailable. The app prints next_action verbatim.
console.log("\n  U · NEXT ACTION AND THE PROOF BLOCK CANNOT CONTRADICT");
{
  const u = CASES.completion_claimed_unavailable;
  ok("    the captured case really is an unavailable read",
     u.proof.read_status === "unavailable", JSON.stringify(u.proof));
  ok("    …and next_action does not send the operator to do fieldwork",
     !/photo/i.test(String(u.next_action)), JSON.stringify(u.next_action));
  ok("    …it says the read is what is unavailable",
     /unavailable/i.test(String(u.next_action)), JSON.stringify(u.next_action));

  //  The positive control. Without it, an API that stopped saying anything
  //  at all would score full marks here.
  const live = CASES.completion_claimed_live;
  ok("    with a working read the real instruction comes back",
     live.proof.read_status === "ok" && /photo/i.test(String(live.next_action)),
     JSON.stringify(live.next_action));
  const sat = CASES.completion_claimed_satisfied;
  ok("    …and once proof is satisfied it becomes close-out",
     sat.proof.state === "satisfied" && /close out/i.test(String(sat.next_action)),
     JSON.stringify(sat.next_action));
}

// ── 5b. THE APP SURVIVES AN API THAT HAS RETIRED `satisfied` ──────────
//  The cleanup release removes the §3.4 compatibility field. This proves
//  the app is READY for that before the API does it — by taking the real
//  captured responses and stripping the field, which is exactly the shape
//  the retired API will send.
//
//  Running this against the CAPTURE rather than a hand-built payload is
//  the point: it is the real projection minus one key, not somebody's
//  idea of what the retired contract looks like.
console.log("\n  X · READY FOR THE CLEANUP RELEASE");
{
  const MAP = { satisfied: true, not_satisfied: false,
                legacy_indeterminate: null, missing_evaluation_defect: null };
  let checked = 0;
  for (const s of STATES) {
    for (const route of ["detail", "list"]) {
      const raw = JSON.parse(JSON.stringify(CASES[s + "_" + route].proof));
      delete raw.satisfied;                       // the retired contract
      const r = P.normalize(raw);
      checked += 1;
      ok("    " + route.padEnd(6) + " " + s.padEnd(26) + " still normalizes",
         r.status === "ok", "got " + r.status + " / " + r.reasonCode +
         " — the app would render UNAVAILABLE for every work order the day " +
         "the API stops sending `satisfied`");
      eq("    " + route.padEnd(6) + " " + s.padEnd(26) + " keeps its state", r.state, s);
      eq("    " + route.padEnd(6) + " " + s.padEnd(26) + " derives satisfied", r.satisfied, MAP[s]);
    }
  }
  ok("    …and that covered every state on both routes", checked === STATES.length * 2,
     checked + " cases");

  //  ANTI-VACUITY: the field really was present before it was stripped, or
  //  the block above proves nothing about removing it.
  ok("    the captured responses DO carry `satisfied` today",
     STATES.every((s) => "satisfied" in CASES[s + "_detail"].proof),
     "the API has already stopped sending it — this block is testing nothing");
}

// ── 6. THE LIST IS NARROWER, AND THAT MUST BE ENOUGH ──────────────────
console.log("\n  N · THE LIST PROJECTION IS NARROWER ON PURPOSE");
{
  const d = CASES.satisfied_detail.proof, l = CASES.satisfied_list.proof;
  const missing = Object.keys(d).filter((k) => !(k in l));
  ok("    the list really does carry fewer fields than the detail",
     missing.length > 0, "the projections are identical — N is testing nothing");
  console.log("      list omits: " + (missing.join(", ") || "(nothing)"));
  ok("    …and the app never needed the omitted ones",
     STATES.every((s) => P.normalize(CASES[s + "_list"].proof).status === "ok"),
     "the board would render UNAVAILABLE for every row in production");
  ok("    the list still carries `state` — §3.3, the ruling the board depends on",
     STATES.every((s) => "state" in CASES[s + "_list"].proof));
}

// ── 7. NO SECOND INTERPRETATION, ANYWHERE ─────────────────────────────
console.log("\n  S · ONE INTERPRETATION POINT, AND IT WRITES NOTHING");
{
  //  Every shipped source file except the normalizer itself. `.test.js` and
  //  `.browser.js` are harnesses, not surfaces — they are allowed to build
  //  payloads and assert on them.
  const shipped = fs.readdirSync(__dirname).filter((f) =>
    (f.endsWith(".js") || f.endsWith(".html")) &&
    f !== "proof-normalizer.js" && !f.endsWith(".test.js") && !f.endsWith(".browser.js") &&
    f !== "run_harnesses.sh" && f !== "preview_build.js" && f !== "slice9_browser_stack_setup.js");
  ok("    the sweep found the shipped surfaces to search", shipped.length >= 5,
     shipped.join(", "));

  /*  COMMENTS ARE STRIPPED FIRST. work-lifecycle-door.js DISCUSSES these
   *  fields on purpose — "does not test `proof.satisfied`" is the rule
   *  being kept, not broken. An earlier revision of this gate matched that
   *  prose and reported the compliant file as the offender. Same trap the
   *  API's Step 8 hit; same fix. */
  const codeOf = (f) => fs.readFileSync(path.join(__dirname, f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  /*  THE RAW PAYLOAD. A work-order ROW also has an unrelated display field
   *  called `proof` holding a short label, so the patterns are anchored to
   *  the proof BLOCK'S OWN KEYS rather than to the word. */
  const RAW_READS = [
    /\bproof\s*\.\s*satisfied\b/,
    /\bproof\s*\.\s*state\b/,
    /\bproof\s*\.\s*read_status\b/,
    /\bproof\s*\.\s*not_preserved_count\b/,
    /\bproof\s*\.\s*legacy_evidence\b/,
  ];
  let offenders = [];
  for (const f of shipped) {
    const code = codeOf(f);
    for (const re of RAW_READS) if (re.test(code)) offenders.push(f + " :: " + re);
  }
  ok("    no shipped surface reads the raw proof payload", offenders.length === 0,
     offenders.join("\n      "));

  //  ANTI-VACUITY. If the patterns matched nothing anywhere they would be
  //  green because they are blind, not because the app is clean.
  const normSrc = fs.readFileSync(path.join(__dirname, "proof-normalizer.js"), "utf8");
  ok("    …and those same patterns DO match inside the normalizer",
     RAW_READS.every((re) => re.test(normSrc)),
     "the patterns match nothing anywhere — this gate is blind");

  /*  ── WHERE A STATE NAME MAY APPEAR ──────────────────────────────
   *  Reading `p.state` off the NORMALIZER'S RESULT is the published
   *  interface — that is what the normalizer exists to hand out, and it is
   *  how the door renders four states as four different sentences. What
   *  must not spread is the VOCABULARY: a third file naming a state is a
   *  second interpretation by another route. */
  const RENDERERS = ["proof-normalizer.js", "work-lifecycle-door.js"];
  const namers = shipped.filter((f) => !RENDERERS.includes(f))
    .filter((f) => /\blegacy_indeterminate\b|\bmissing_evaluation_defect\b|\bread_status\b/.test(codeOf(f)));
  ok("    the four-state vocabulary lives only in the normalizer and the one door",
     namers.length === 0, namers.join(", ") +
     " — a second file that knows the state names is a second interpretation");
  ok("    …and it really does live in those two, so the check is not blind",
     /legacy_indeterminate/.test(codeOf("work-lifecycle-door.js")) &&
     /missing_evaluation_defect/.test(normSrc));

  /*  The normalizer's own instruction: "surfaces use [isDefect] to render
   *  it visually distinct; they must not infer it by string-matching the
   *  state." The door obeys — it never names the defect state at all. */
  ok("    the door flags the defect via isDefect, never by naming the state",
     !/missing_evaluation_defect/.test(codeOf("work-lifecycle-door.js")) &&
     /\.isDefect\b/.test(codeOf("work-lifecycle-door.js")),
     "the door string-matches the defect state instead of using isDefect");

  //  THE PROOF PATH IS A PURE READ. The door has action verbs, and those
  //  are legitimate writes; what must never happen is INTERPRETING a proof
  //  state causing one.
  ok("    the normalizer performs no network call of any kind",
     !/fetch\s*\(|XMLHttpRequest|__psLive|navigator\.sendBeacon/.test(normSrc),
     "the one interpretation point can write");
  ok("    …and mutates nothing it is given",
     !/proof\s*\.\s*\w+\s*=[^=]/.test(normSrc),
     "it edits the payload it was handed");

  const door = fs.readFileSync(path.join(__dirname, "work-lifecycle-door.js"), "utf8");
  const proofFns = door.slice(door.indexOf("function proofOf"), door.indexOf("function stateLine"));
  ok("    the door's proof-interpretation block issues no request",
     proofFns.length > 200 &&
     !/fetch\s*\(|__psLive|XMLHttpRequest/.test(proofFns),
     "rendering a proof state reaches the network");
}

console.log("\n  " + pass + " passed · " + fail + " failed\n");
process.exit(fail === 0 ? 0 : 1);
