#!/usr/bin/env node
"use strict";

// PROPERTY SPINE — PROOF NORMALIZER CONTRACT PROOF
//
// Release 0 deployment step 1. Proves the app understands BOTH proof
// contracts before the API is allowed to emit the new one.
//
// No database, no browser, no network. It exercises the normalizer directly
// and reads the door's source to prove no surface interprets proof itself.
//
// Run:  node proof_normalizer_contract.test.js
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

//  Silence the deliberate CONTRACT FAILURE logging while we assert on it.
const realError = console.error;
function quiet(fn) { console.error = () => {}; try { return fn(); } finally { console.error = realError; } }

//  Fixture builders. Every supporting field the contract requires is
//  present by default, so a test that omits one is omitting it ON PURPOSE.
function OLD(satisfied, count) {
  return { required: true, satisfied: satisfied,
           not_preserved_count: count === undefined ? 0 : count };
}
function NEW(state, satisfied, evidence) {
  return { required: true, read_status: "ok", state: state, satisfied: satisfied,
           not_preserved_count: 0,
           legacy_evidence: { column_photo_present: !!(evidence && evidence.photo),
                              column_note_present:  !!(evidence && evidence.note) } };
}
function UNAVAIL(reason) {
  return { required: true, read_status: "unavailable", reason_code: reason };
}

console.log("\n══ Proof normalizer — contract proof ══\n");

// ── 1. OLD CONTRACT (what production emits today) ─────────────────────
console.log("  OLD CONTRACT — boolean only");
{
  const t = P.normalize(OLD(true));
  eq("    satisfied:true  → state satisfied", t.state, "satisfied");
  eq("    satisfied:true  → satisfied true", t.satisfied, true);
  eq("    satisfied:true  → status ok", t.status, "ok");

  const f = P.normalize(OLD(false, 2));
  eq("    satisfied:false → state not_satisfied", f.state, "not_satisfied");
  eq("    satisfied:false → satisfied false", f.satisfied, false);
  eq("    not_preserved_count carried", f.notPreservedCount, 2);
}

// ── 2. NEW CONTRACT — the four states, and only four ──────────────────
console.log("\n  NEW CONTRACT — four states");
{
  const cases = [
    ["satisfied", true], ["not_satisfied", false],
    ["legacy_indeterminate", null], ["missing_evaluation_defect", null]
  ];
  for (const [state, expected] of cases) {
    const r = P.normalize(NEW(state, expected));
    eq("    " + state + " → state", r.state, state);
    eq("    " + state + " → satisfied " + JSON.stringify(expected), r.satisfied, expected);
    eq("    " + state + " → status ok", r.status, "ok");
  }
  eq("    STATES is exactly four", P.STATES.length, 4);
  ok("    'unavailable' is NOT a state", P.STATES.indexOf("unavailable") === -1);
}

// ── 3. legacy and defect are NOT 'proof failed' ───────────────────────
console.log("\n  LEGACY AND DEFECT ARE NOT FAILURE");
{
  const l = P.normalize(NEW("legacy_indeterminate", null));
  const d = P.normalize(NEW("missing_evaluation_defect", null));
  ok("    legacy satisfied is null, not false", l.satisfied === null);
  ok("    defect satisfied is null, not false", d.satisfied === null);
  eq("    defect is flagged isDefect", d.isDefect, true);
  eq("    legacy is NOT flagged isDefect", l.isDefect, false);
  ok("    legacy and defect have DIFFERENT labels", l.label !== d.label);
}

// ── 4. read_status unavailable — EXPECTED, not an error ───────────────
console.log("\n  UNAVAILABLE READ");
{
  const u = P.normalize(UNAVAIL("activation_absent"));
  eq("    status unavailable", u.status, "unavailable");
  eq("    renders unavailable", u.renders, "unavailable");
  eq("    state is null, NOT a fifth value", u.state, null);
  eq("    satisfied is null", u.satisfied, null);
  eq("    NOT reported as a defect", u.isDefect, false);
  eq("    reason code carried", u.reasonCode, "activation_absent");
}

// ── 5. CONTRACT FAILURES — every one renders unavailable ──────────────
console.log("\n  CONTRACT FAILURES → unavailable, NEVER not_satisfied");
{
  const bad = [
    ["proof absent", undefined],
    ["proof null", null],
    ["unknown state", NEW("totally_new_state", true)],
    ["state missing while ok", { required: true, read_status: "ok", not_preserved_count: 0, legacy_evidence: { column_photo_present: false, column_note_present: false } }],
    ["unknown read_status", { required: true, read_status: "sideways" }],
    ["state/boolean mismatch", NEW("satisfied", false)],
    ["mismatch the other way", NEW("not_satisfied", true)],
    ["legacy shape with null satisfied", { required: true, satisfied: null, not_preserved_count: 0 }]
  ];
  for (const [name, payload] of bad) {
    const r = quiet(() => P.normalize(payload));
    ok("    " + name + " → contract_failure", r.status === "contract_failure", "got " + r.status);
    ok("    " + name + " → renders unavailable", r.renders === "unavailable");
    ok("    " + name + " → NOT not_satisfied", r.state !== "not_satisfied");
    ok("    " + name + " → satisfied is null", r.satisfied === null);
  }
}

// ── 5b. THE COMPATIBILITY FIELD IS OPTIONAL — AND STILL CROSS-CHECKED ─
//
//  ⚠ THIS BLOCK USED TO ASSERT THE OPPOSITE, and the reasoning was good
//  at the time: "absence is not agreement — a mapping cannot be verified
//  against a value nobody sent."
//
//  It is exactly wrong as §3.4's `satisfied` is retired. The API can
//  never stop sending it while this file treats its absence as a
//  CONTRACT FAILURE, because the first response without it would render
//  every work order UNAVAILABLE. The rule that was protecting the
//  contract became the thing preventing it from finishing.
//
//  Nothing is given up. A state and a boolean that DISAGREE is still a
//  contract failure, and that mismatch is the only thing the old check
//  ever actually detected — a missing field detected a server that had
//  moved on, not a server that was wrong.
console.log("\n  ok TOLERATES AN ABSENT satisfied, AND STILL CATCHES A WRONG ONE");
{
  const cases = [
    ["ok + satisfied absent, state satisfied", "satisfied", true,
      { required: true, read_status: "ok", state: "satisfied", not_preserved_count: 0, legacy_evidence: { column_photo_present: false, column_note_present: false } }],
    ["ok + satisfied undefined as own property", "satisfied", true,
      { required: true, read_status: "ok", state: "satisfied", satisfied: undefined, not_preserved_count: 0, legacy_evidence: { column_photo_present: false, column_note_present: false } }],
    ["ok + legacy state, satisfied absent", "legacy_indeterminate", null,
      { required: true, read_status: "ok", state: "legacy_indeterminate", not_preserved_count: 0, legacy_evidence: { column_photo_present: false, column_note_present: false } }],
    ["ok + defect state, satisfied absent", "missing_evaluation_defect", null,
      { required: true, read_status: "ok", state: "missing_evaluation_defect", not_preserved_count: 0, legacy_evidence: { column_photo_present: false, column_note_present: false } }],
    ["ok + not_satisfied, satisfied absent", "not_satisfied", false,
      { required: true, read_status: "ok", state: "not_satisfied", not_preserved_count: 0, legacy_evidence: { column_photo_present: false, column_note_present: false } }]
  ];
  for (const [name, state, derived, payload] of cases) {
    const r = P.normalize(payload);
    ok("    " + name + " → ok", r.status === "ok", "got " + r.status + " / " + r.reasonCode);
    eq("    " + name + " → renders " + state, r.renders, state);
    //  DERIVED FROM `state`, so a caller sees the same value whether the
    //  API sent one or not. The field of record is `state`.
    eq("    " + name + " → satisfied derived " + JSON.stringify(derived), r.satisfied, derived);
  }
  //  THE CROSS-CHECK SURVIVES. A present-but-wrong boolean is still a bug.
  const wrong = quiet(() => P.normalize(NEW("legacy_indeterminate", false)));
  eq("    legacy + false (not null) → contract_failure", wrong.status, "contract_failure");
  const wrong2 = quiet(() => P.normalize(NEW("satisfied", false)));
  eq("    satisfied + false → contract_failure", wrong2.status, "contract_failure");
  //  And the explicit values §3.4 promises are still accepted unchanged.
  eq("    legacy + EXPLICIT null → ok", P.normalize(NEW("legacy_indeterminate", null)).status, "ok");
  eq("    defect + EXPLICIT null → ok", P.normalize(NEW("missing_evaluation_defect", null)).status, "ok");

  //  THE OLD CONTRACT IS UNTOUCHED. There, `satisfied` is the only signal
  //  there is, and it remains REQUIRED — retiring it on the new contract
  //  says nothing about a server that never had a `read_status`.
  const oldMissing = quiet(() => P.normalize({ required: true, not_preserved_count: 0 }));
  eq("    OLD contract + satisfied missing → still contract_failure",
     oldMissing.status, "contract_failure");
}

// ── 5c. THE INVERSE UNAVAILABLE CONTRACT ──────────────────────────────
//  The API cannot say "the read did not complete" and publish a conclusion
//  in the same payload. That is self-contradiction, not unavailability.
console.log("\n  unavailable FORBIDS ANY CONCLUSION FIELD");
{
  const cases = [
    ["unavailable + state present",
      { required: true, read_status: "unavailable", reason_code: "x", state: "satisfied" }],
    ["unavailable + satisfied present",
      { required: true, read_status: "unavailable", reason_code: "x", satisfied: null }],
    ["unavailable + both conclusion fields present",
      { required: true, read_status: "unavailable", reason_code: "x", state: "not_satisfied", satisfied: false }]
  ];
  for (const [name, payload] of cases) {
    const r = quiet(() => P.normalize(payload));
    ok("    " + name + " → contract_failure", r.status === "contract_failure", "got " + r.status);
    ok("    " + name + " → NOT a legitimate unavailable", r.status !== "unavailable");
    ok("    " + name + " → renders unavailable", r.renders === "unavailable");
  }
  //  Positive control: a clean unavailable is still accepted as legitimate.
  const clean = P.normalize(UNAVAIL("activation_absent"));
  eq("    clean unavailable → status unavailable", clean.status, "unavailable");
  ok("    clean unavailable is NOT a contract failure", clean.status !== "contract_failure");
}

// ── 5d. SUPPORTING FIELDS ARE FACTS, NOT DECORATION ───────────────────
//  A safe-looking default is still an invented operating fact. "Zero
//  unpreserved attachments" and "the API omitted the count" are different
//  statements and only one of them is true.
console.log("\n  SUPPORTING FIELDS ARE REQUIRED");
{
  const cases = [
    // required — every contract, every branch
    ["old + required missing",        { satisfied: true, not_preserved_count: 0 }],
    ["old + required non-boolean",    { required: "yes", satisfied: true, not_preserved_count: 0 }],
    ["new ok + required missing",     { read_status: "ok", state: "satisfied", satisfied: true,
                                        not_preserved_count: 0,
                                        legacy_evidence: { column_photo_present: false, column_note_present: false } }],
    ["unavailable + required missing",{ read_status: "unavailable", reason_code: "x" }],

    // not_preserved_count — both contracts
    ["old + count missing",           { required: true, satisfied: true }],
    ["old + count non-numeric",       { required: true, satisfied: true, not_preserved_count: "0" }],
    ["old + count negative",          { required: true, satisfied: true, not_preserved_count: -1 }],
    ["old + count fractional",        { required: true, satisfied: true, not_preserved_count: 1.5 }],
    ["new ok + count missing",        { required: true, read_status: "ok", state: "satisfied", satisfied: true,
                                        legacy_evidence: { column_photo_present: false, column_note_present: false } }],

    // old-contract satisfied must be a real boolean
    ["old + satisfied missing",       { required: true, not_preserved_count: 0 }],
    ["old + satisfied non-boolean",   { required: true, satisfied: "true", not_preserved_count: 0 }],

    // legacy_evidence — required on the NEW contract only
    ["new ok + evidence missing",     { required: true, read_status: "ok", state: "satisfied",
                                        satisfied: true, not_preserved_count: 0 }],
    ["new ok + evidence not object",  { required: true, read_status: "ok", state: "satisfied",
                                        satisfied: true, not_preserved_count: 0, legacy_evidence: "none" }],
    ["new ok + evidence field missing",{ required: true, read_status: "ok", state: "satisfied",
                                        satisfied: true, not_preserved_count: 0,
                                        legacy_evidence: { column_photo_present: false } }],
    ["new ok + evidence non-boolean", { required: true, read_status: "ok", state: "satisfied",
                                        satisfied: true, not_preserved_count: 0,
                                        legacy_evidence: { column_photo_present: "yes", column_note_present: false } }],

    // an unavailable read must say WHY
    ["unavailable + reason missing",  { required: true, read_status: "unavailable" }],
    ["unavailable + reason empty",    { required: true, read_status: "unavailable", reason_code: "" }],
    ["unavailable + reason non-string",{ required: true, read_status: "unavailable", reason_code: 7 }]
  ];
  for (const [name, payload] of cases) {
    const r = quiet(() => P.normalize(payload));
    ok("    " + name + " → contract_failure", r.status === "contract_failure", "got " + r.status);
    ok("    " + name + " → renders unavailable", r.renders === "unavailable");
    ok("    " + name + " → NOT not_satisfied", r.state !== "not_satisfied");
  }
  //  Positive controls: a count of 0 and evidence of false/false are LEGAL
  //  when the API actually sends them. The rule is about absence, not value.
  eq("    old + count explicitly 0 → ok", P.normalize(OLD(true, 0)).status, "ok");
  eq("    new + evidence explicitly false/false → ok", P.normalize(NEW("satisfied", true)).status, "ok");
  eq("    count 0 is carried, not invented", P.normalize(OLD(true, 0)).notPreservedCount, 0);
}

// ── 6. a contract failure is distinguishable from a real unavailable ──
console.log("\n  FAILURE vs LEGITIMATE UNAVAILABLE");
{
  const legit = P.normalize(UNAVAIL("activation_absent"));
  const brokn = quiet(() => P.normalize(NEW("nonsense", true)));
  eq("    both render the same to the operator", legit.renders, brokn.renders);
  ok("    but status distinguishes them", legit.status !== brokn.status,
     "legit=" + legit.status + " broken=" + brokn.status);
}

// ── 7. legacy column evidence is presence only ────────────────────────
console.log("\n  LEGACY EVIDENCE IS PRESENCE ONLY");
{
  const r = P.normalize(NEW("legacy_indeterminate", null, { photo: true, note: false }));
  eq("    photo presence carried", r.legacyEvidence.photo, true);
  eq("    note presence carried", r.legacyEvidence.note, false);
  ok("    presence is boolean, never content",
     typeof r.legacyEvidence.photo === "boolean" && typeof r.legacyEvidence.note === "boolean");
  const src = fs.readFileSync(path.join(__dirname, "proof-normalizer.js"), "utf8");
  ok("    normalizer never reads a column VALUE",
     !/completion_photo\s*[^_]/.test(src.replace(/column_photo_present/g, "")));
}

// ── 8. NO SURFACE INTERPRETS PROOF ITSELF ─────────────────────────────
console.log("\n  ONE INTERPRETATION POINT");
{
  const door = fs.readFileSync(path.join(__dirname, "work-lifecycle-door.js"), "utf8");
  //  Strip comments — the file DISCUSSES these fields on purpose.
  const code = door.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  for (const forbidden of ["proof.satisfied", "proof.state", "proof.not_preserved_count"]) {
    ok("    door never reads " + forbidden, code.indexOf(forbidden) === -1);
  }
  ok("    door routes through proofOf()", /function proofOf\s*\(/.test(code));
  ok("    proofOf uses window.__psProof", /window\.__psProof/.test(code));
  ok("    missing normalizer → unavailable, not a fallback read",
     /normalizer_absent/.test(code));

  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const nIdx = html.indexOf('src="./proof-normalizer.js"');
  const dIdx = html.indexOf('src="./work-lifecycle-door.js"');
  ok("    normalizer is loaded in index.html", nIdx !== -1);
  ok("    normalizer loads BEFORE the door", nIdx !== -1 && dIdx !== -1 && nIdx < dIdx);
}

// ── 9. the mapping is the frozen one ──────────────────────────────────
console.log("\n  FROZEN COMPATIBILITY MAPPING");
{
  eq("    satisfied → true", P._mapping.satisfied, true);
  eq("    not_satisfied → false", P._mapping.not_satisfied, false);
  eq("    legacy_indeterminate → null", P._mapping.legacy_indeterminate, null);
  eq("    missing_evaluation_defect → null", P._mapping.missing_evaluation_defect, null);
}

console.log("\n  " + pass + " passed · " + fail + " failed\n");
process.exit(fail === 0 ? 0 : 1);
