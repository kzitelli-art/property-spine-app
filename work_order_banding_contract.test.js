#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   THE BOARD'S CLASSIFICATION CONTRACT

   A shared board is shared to SEE. Ownership is named to DO.

   Three bands, and the rule that separates them is not "is something
   wrong" — it is "can or must somebody looking at THIS surface move it
   now."

     NEEDS ACTION   an unowned job · an acceptance available to this
                    viewer · a resident who must be asked · a claim
                    needing review · a blocker nobody owns · a message
                    that failed to send
     IN PROGRESS    legitimately moving, or waiting on a named person or
                    step Spine already knows about
     RECENTLY DONE  governed completion

   ── THE ASSERTION THIS FILE EXISTS FOR ──────────────────────────────
   A ROUTED BLOCKER DOES NOT CONTAMINATE NEEDS ACTION.

   When a technician reports "waiting on a part", Spine routes a supply
   follow-up to an accountable role. That work order is blocked, and it is
   also entirely under control — somebody owns getting the part. Putting it
   in Needs Action would mean forty correctly-routed jobs render as forty
   emergencies, and a board that cries wolf on the fortieth row is a board
   nobody reads by the tenth.

   The inverse is the real attention item: a blocker with NOBODY on it is
   an accountability hole, and that is exactly what Needs Action is for.

   ── AND THE ONE VIEWER-RELATIVE RULE ────────────────────────────────
   "Waiting for KZ to accept" is IN PROGRESS on a manager's screen and
   NEEDS ACTION on KZ's, from the same payload, because `may_accept` is
   answered per viewer by the server. That is not an inconsistency — it is
   the board telling each person which rows are theirs.

       node work_order_banding_contract.test.js
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "work-lifecycle-door.js");
const src = fs.readFileSync(SRC, "utf8");

let pass = 0, fail = 0;
const EXPECTED = 27;
const ok = (l, c, d) => {
  if (c) { pass++; console.log("  ok    " + l); }
  else { fail++; console.log("  FAIL  " + l + (d ? "\n        " + d : "")); }
  return c;
};

console.log("\n" + "═".repeat(68));
console.log("  BANDING CONTRACT — a routed blocker is not an emergency");
console.log("═".repeat(68));
console.log("  ASSERTIONS STARTED  (expecting " + EXPECTED + ")\n");

//  Lifted from the shipped source, never reimplemented: a reimplementation
//  proves the test author's idea of the rule, which is the thing in doubt.
function lift(name) {
  const i = src.indexOf("function " + name + "(");
  if (i < 0) return null;
  let d = 0, started = false, j = i;
  for (; j < src.length; j++) {
    if (src[j] === "{") { d++; started = true; }
    else if (src[j] === "}") { d--; if (started && d === 0) { j++; break; } }
  }
  return src.slice(i, j);
}

const NEEDED = ["residentException", "coordination", "attention", "mayAccept",
                "alreadyAsked", "routed", "band"];
const missing = NEEDED.filter((n) => !lift(n));
ok("S1  every function under test was found in the door source",
   missing.length === 0, "missing: " + missing.join(", "));
if (missing.length) { console.log("\n  RUN INVALID — cannot continue.\n"); process.exit(1); }

const box = {};
new Function("box", NEEDED.map(lift).join(";") + ";box.band=band;box.routed=routed;")(box);
const { band, routed } = box;

//  ── FIXTURES ────────────────────────────────────────────────────────
const KZ = { user_id: "u1", name: "KZ" };
const wo = (c) => ({ work_order: { id: "w1" }, current: Object.assign(
  { state: "scheduled", accountable: "UNASSIGNED", assigned_to: null,
    attention: null, viewer: null, resident_exception: null,
    resident_coordination: null }, c) });

const ROUTED = (over) => Object.assign({
  kind: "needs_followup", reason: "need_part", label: "Waiting on a part",
  since: "2026-08-10T14:14:00Z",
  routed_to: { obligation_id: "o1", type: "supply_followup",
               assigned_role: "maintenance", status: "open" },
}, over || {});

// ── A · THE HEADLINE RULE ───────────────────────────────────────────
const stalledRouted = wo({ state: "accepted", assigned_to: KZ, accountable: KZ,
                           attention: ROUTED() });
ok("A1  a blocker ROUTED to an accountable role is IN PROGRESS",
   band(stalledRouted) === "progress",
   "banded " + band(stalledRouted) + " — forty routed parts would read as forty emergencies");

const stalledUnowned = wo({ state: "accepted", assigned_to: KZ, accountable: KZ,
                            attention: ROUTED({ routed_to: { obligation_id: "o1",
                              type: "supply_followup", assigned_role: null, status: "open" } }) });
ok("A2  a blocker with NOBODY on it is NEEDS ACTION",
   band(stalledUnowned) === "action",
   "banded " + band(stalledUnowned) + " — an accountability hole must surface");

const stalledResolved = wo({ state: "accepted", assigned_to: KZ, accountable: KZ,
                             attention: ROUTED({ routed_to: { obligation_id: "o1",
                               type: "supply_followup", assigned_role: "maintenance",
                               status: "complete" } }) });
ok("A3  a follow-up already complete no longer routes anything",
   !routed(stalledResolved.current.attention),
   "a closed follow-up is history, not a live owner");

ok("A4  routed() requires an actual owner, not merely an object",
   routed({ routed_to: { assigned_role: "maintenance", status: "open" } }) === true
   && routed({ routed_to: { assigned_role: null, assigned_user_id: null, status: "open" } }) === false
   && routed(null) === false && routed({}) === false);

ok("A5  a named USER counts as routed just as a role does",
   routed({ routed_to: { assigned_user_id: "u9", status: "open" } }) === true);

// ── B · THE VIEWER-RELATIVE RULE ────────────────────────────────────
const assignedNotAccepted = wo({ state: "scheduled", assigned_to: KZ });
const mine = wo({ state: "scheduled", assigned_to: KZ,
                  viewer: { may_accept: true, refusal: null } });
const theirs = wo({ state: "scheduled", assigned_to: KZ,
                    viewer: { may_accept: false, refusal: "not_assigned_to_actor" } });

ok("B1  work assigned to a named person is IN PROGRESS for a viewer who cannot take it",
   band(theirs) === "progress", "banded " + band(theirs));
ok("B2  …and NEEDS ACTION for the viewer who can",
   band(mine) === "action", "banded " + band(mine));
ok("B3  the SAME payload bands differently per viewer, which is the point",
   band(mine) !== band(theirs));
ok("B4  with no viewer stated, may_accept is not assumed true",
   band(assignedNotAccepted) === "progress",
   "a missing viewer must never be read as permission");

// ── C · THE ACCOUNTABILITY HOLE ─────────────────────────────────────
ok("C1  nobody assigned and nobody accountable is NEEDS ACTION",
   band(wo({ state: "scheduled" })) === "action");
ok("C2  …and stays NEEDS ACTION even when a follow-up is routed, because " +
   "the repair itself still has no owner",
   band(wo({ state: "scheduled", attention: ROUTED() })) === "action");

// ── D · THE REST OF THE CONTRACT ────────────────────────────────────
ok("D1  governed completion is DONE",
   band(wo({ state: "completed", assigned_to: KZ, accountable: KZ })) === "done");
ok("D2  a completion CLAIM is NEEDS ACTION — a human must judge the proof",
   band(wo({ state: "completion_claimed", assigned_to: KZ, accountable: KZ })) === "action");
ok("D3  a failed resident message is NEEDS ACTION",
   band(wo({ state: "accepted", assigned_to: KZ, accountable: KZ,
             resident_exception: { comm_event_id: "c1", kind: "completed" } })) === "action");
ok("D4  no access, resident NOT yet asked, is NEEDS ACTION",
   band(wo({ state: "no_access", assigned_to: KZ, accountable: KZ,
             resident_coordination: { state: "none" } })) === "action");
ok("D5  no access, resident already asked, is IN PROGRESS — Spine is waiting " +
   "on a named party and the row stops asking",
   band(wo({ state: "no_access", assigned_to: KZ, accountable: KZ,
             resident_coordination: { state: "sent", at: "2026-08-10T10:04:00Z" } })) === "progress");
ok("D6  en route is IN PROGRESS",
   band(wo({ state: "en_route", assigned_to: KZ, accountable: KZ })) === "progress");
ok("D7  accepted is IN PROGRESS",
   band(wo({ state: "accepted", assigned_to: KZ, accountable: KZ })) === "progress");
ok("D8  blocked with nothing routed is NEEDS ACTION",
   band(wo({ state: "blocked", assigned_to: KZ, accountable: KZ })) === "action");
ok("D9  blocked WITH a routed follow-up is IN PROGRESS",
   band(wo({ state: "blocked", assigned_to: KZ, accountable: KZ, attention: ROUTED() })) === "progress");

// ── E · COMPLETION OUTRANKS EVERYTHING ──────────────────────────────
ok("E1  completed work is DONE even with an open follow-up still attached",
   band(wo({ state: "completed", assigned_to: KZ, accountable: KZ, attention: ROUTED() })) === "done");
//  ── THIS ASSERTION WAS WRONG, AND SAID SO CONFIDENTLY ───────────────
//  It read: "completed work is DONE even with a failed resident message,
//  because the resident exception is about delivery, not about the work."
//  That reasoning is backwards. The door's own header has always said a
//  completed work order whose resident text failed belongs in NEEDS
//  ACTION — the operator is not finished even though the work is — and a
//  failed delivery needing intervention is precisely what the band is for.
//
//  The implementation and this test were written from the same wrong idea
//  at the same time, so the suite went green and proved nothing. The real
//  browser proof, against real rows, is what caught it. Worth leaving the
//  history here: a unit test agreeing with its implementation is not
//  evidence, it is a tautology with a checkmark.
ok("E2  …but a completed job whose resident text FAILED stays in NEEDS " +
   "ACTION — the work is done, the operator is not",
   band(wo({ state: "completed", assigned_to: KZ, accountable: KZ,
             resident_exception: { comm_event_id: "c1", kind: "completed" } })) === "action",
   "a failed delivery was filed under Recently completed, where nobody looks again");

// ── F · THE CALM-BOARD PROPERTY, MEASURED ───────────────────────────
//  The rule stated as an outcome rather than a branch: a queue of correctly
//  routed stalls produces an EMPTY Needs Action.
const forty = [];
for (let i = 0; i < 40; i++) {
  forty.push(wo({ state: "accepted", assigned_to: KZ, accountable: KZ, attention: ROUTED() }));
}
const flagged = forty.filter((w) => band(w) === "action").length;
ok("F1  forty correctly-routed stalls produce ZERO needs-action rows",
   flagged === 0, flagged + " of 40 raised a hand");

forty[7].current.attention.routed_to.assigned_role = null;
const flagged2 = forty.filter((w) => band(w) === "action").length;
ok("F2  …and the ONE that lost its owner is the only row that surfaces",
   flagged2 === 1, flagged2 + " surfaced");

// ── G · IT IS A CLASSIFIER, NOT A GATE ──────────────────────────────
ok("G1  band() returns only the three known bands, never null or a state name",
   ["action", "progress", "done"].indexOf(band(wo({ state: "en_route" }))) >= 0
   && ["action", "progress", "done"].indexOf(band(wo({ state: "wat" }))) >= 0);
ok("G2  no write, action or authority check reads band()",
   !/\bband\s*\([^)]*\)\s*(===|!==|&&|\|\|)\s*["']?(?!action|progress|done)/.test(
     src.replace(/function band\([\s\S]*?\n  \}/, "")),
   "band() is being used as a predicate outside the renderer");

console.log("\n" + "═".repeat(68));
const complete = pass + fail;
if (complete !== EXPECTED) {
  console.log(`  ✗ RUN INVALID — ${complete} assertions ran, ${EXPECTED} expected`);
  console.log("═".repeat(68) + "\n");
  process.exit(1);
}
console.log(`  ${fail === 0 ? "✓ PASS" : "✗ FAIL"} — ${pass} passed, ${fail} failed`);
if (fail === 0) {
  console.log("  A blocker is not an emergency. An unowned blocker is.");
}
console.log("═".repeat(68) + "\n");
process.exit(fail === 0 ? 0 : 1);
