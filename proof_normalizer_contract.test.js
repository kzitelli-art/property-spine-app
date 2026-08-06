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

console.log("\n══ Proof normalizer — contract proof ══\n");

// ── 1. OLD CONTRACT (what production emits today) ─────────────────────
console.log("  OLD CONTRACT — boolean only");
{
  const t = P.normalize({ required: true, satisfied: true, not_preserved_count: 0 });
  eq("    satisfied:true  → state satisfied", t.state, "satisfied");
  eq("    satisfied:true  → satisfied true", t.satisfied, true);
  eq("    satisfied:true  → status ok", t.status, "ok");

  const f = P.normalize({ required: true, satisfied: false, not_preserved_count: 2 });
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
    const r = P.normalize({ required: true, read_status: "ok", state, satisfied: expected });
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
  const l = P.normalize({ read_status: "ok", state: "legacy_indeterminate", satisfied: null });
  const d = P.normalize({ read_status: "ok", state: "missing_evaluation_defect", satisfied: null });
  ok("    legacy satisfied is null, not false", l.satisfied === null);
  ok("    defect satisfied is null, not false", d.satisfied === null);
  eq("    defect is flagged isDefect", d.isDefect, true);
  eq("    legacy is NOT flagged isDefect", l.isDefect, false);
  ok("    legacy and defect have DIFFERENT labels", l.label !== d.label);
}

// ── 4. read_status unavailable — EXPECTED, not an error ───────────────
console.log("\n  UNAVAILABLE READ");
{
  const u = P.normalize({ required: true, read_status: "unavailable", reason_code: "activation_absent" });
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
    ["unknown state", { read_status: "ok", state: "totally_new_state" }],
    ["state missing while ok", { read_status: "ok" }],
    ["unknown read_status", { read_status: "sideways" }],
    ["state/boolean mismatch", { read_status: "ok", state: "satisfied", satisfied: false }],
    ["mismatch the other way", { read_status: "ok", state: "not_satisfied", satisfied: true }],
    ["legacy shape with null satisfied", { required: true, satisfied: null }]
  ];
  for (const [name, payload] of bad) {
    const r = quiet(() => P.normalize(payload));
    ok("    " + name + " → contract_failure", r.status === "contract_failure", "got " + r.status);
    ok("    " + name + " → renders unavailable", r.renders === "unavailable");
    ok("    " + name + " → NOT not_satisfied", r.state !== "not_satisfied");
    ok("    " + name + " → satisfied is null", r.satisfied === null);
  }
}

// ── 6. a contract failure is distinguishable from a real unavailable ──
console.log("\n  FAILURE vs LEGITIMATE UNAVAILABLE");
{
  const legit = P.normalize({ read_status: "unavailable", reason_code: "activation_absent" });
  const brokn = quiet(() => P.normalize({ read_status: "ok", state: "nonsense" }));
  eq("    both render the same to the operator", legit.renders, brokn.renders);
  ok("    but status distinguishes them", legit.status !== brokn.status,
     "legit=" + legit.status + " broken=" + brokn.status);
}

// ── 7. legacy column evidence is presence only ────────────────────────
console.log("\n  LEGACY EVIDENCE IS PRESENCE ONLY");
{
  const r = P.normalize({
    read_status: "ok", state: "legacy_indeterminate", satisfied: null,
    legacy_evidence: { column_photo_present: true, column_note_present: false }
  });
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
