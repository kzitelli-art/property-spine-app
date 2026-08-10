#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   THE LIST AND THE DETAIL MUST NOT CONTRADICT EACH OTHER

   Reported from the browser: the Work Orders list said

       Waiting for KZ to accept

   and the detail for the same work order, one click later, said

       UNASSIGNED

   Neither surface was lying to the server. `current.accountable` is the
   ACCEPTANCE rail — the server fills it only once a technician takes the
   job — so an assigned, not-yet-accepted work order genuinely has no
   accountable person. The list read `assigned_to`; the detail read
   `accountable` and printed the one word it had. Two honest reads, one
   operator being told opposite things about the same job.

   The fix is display-only: three states instead of two, so the middle
   fact — assigned, not accepted — has somewhere to live.

   ── WHAT THIS PROVES ────────────────────────────────────────────────

   A1-A3  the three states render exactly as ruled
   B1-B4  list and detail agree, over every state combination
   C1-C4  it is DISPLAY ONLY — no control, gate or action reads it
   D1-D3  attribution sentences still get a bare human name

       node who_line_agreement.test.js
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "work-lifecycle-door.js");
const src = fs.readFileSync(SRC, "utf8");

let pass = 0, fail = 0;
const ok = (l, c, d) => {
  if (c) { pass++; console.log("  ok    " + l); }
  else { fail++; console.log("  FAIL  " + l + (d ? "\n        " + d : "")); }
  return c;
};

console.log("\n" + "═".repeat(68));
console.log("  WHO-LINE AGREEMENT — the list and the detail tell one story");
console.log("═".repeat(68));
console.log("  ASSERTIONS STARTED\n");

// ── the two functions under test, lifted from the real source ───────
//  Extracted rather than reimplemented. A reimplementation proves the
//  test author's idea of the rule, which is exactly the thing in doubt.
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

const WHO = lift("whoLine");
const STATE = lift("stateLine");
const OWNER = lift("ownerName");
ok("S1  whoLine() was found in the door source", !!WHO,
   "the function under test does not exist — every assertion below is vacuous");
ok("S2  stateLine() was found in the door source", !!STATE);
ok("S3  ownerName() is still present for the attribution sentences", !!OWNER);

const sandbox = {};
new Function("box",
  "function esc(s){return String(s==null?'':s)}" +
  "function firstName(n){return String(n||'').trim().split(/\\s+/)[0]||'someone'}" +
  "function clock(){return '9:15 AM'}" +
  "function residentException(w){return w.current.resident_exception||null}" +
  "function coordination(w){return w.current.resident_coordination||null}" +
  //  stateLine gained this dependency when attention became a second
  //  dimension. Stubbed as the one-liner it really is, not as a behaviour —
  //  a stub that did more than the original would be testing the stub.
  "function attention(w){return w.current.attention||null}" +
  "function proofOf(){return {satisfied:null}}" +
  OWNER + ";" + WHO + ";" + STATE + ";" +
  "box.whoLine=whoLine; box.stateLine=stateLine; box.ownerName=ownerName;"
)(sandbox);
const { whoLine, stateLine, ownerName } = sandbox;

const wo = (over) => ({ current: Object.assign(
  { state: "scheduled", accountable: "UNASSIGNED", assigned_to: null }, over) });

// ── A · the three states ────────────────────────────────────────────
const accepted  = wo({ state: "accepted", accountable: { user_id: "u1", name: "KZ" },
                       assigned_to: { user_id: "u1", name: "KZ" }, accepted_at: "2026-08-10T13:15:00Z" });
const assigned  = wo({ state: "scheduled", accountable: "UNASSIGNED",
                       assigned_to: { user_id: "u1", name: "KZ" } });
const nobody    = wo({ state: "scheduled", accountable: "UNASSIGNED", assigned_to: null });

ok("A1  accepted            → 'KZ · ACCEPTED'",     whoLine(accepted) === "KZ · ACCEPTED",  whoLine(accepted));
ok("A2  assigned, unaccepted → 'KZ · NOT ACCEPTED'", whoLine(assigned) === "KZ · NOT ACCEPTED", whoLine(assigned));
ok("A3  nobody               → 'UNASSIGNED'",        whoLine(nobody)   === "UNASSIGNED",     whoLine(nobody));

// ── B · THE REGRESSION · the two surfaces must agree ────────────────
//  The exact reported case. Before the fix the detail said UNASSIGNED
//  while the list named the person, so this is the assertion that would
//  have caught it.
//  B0 · PROVE THE ASSERTION DISCRIMINATES. B2 below is only worth
//  something if it would have gone red on the code that shipped. The old
//  header was `esc(ownerName(d) || "UNASSIGNED")` — evaluated here against
//  the same fixture, using the same lifted ownerName, so the contradiction
//  is reproduced rather than described.
const preFix = ownerName(assigned) || "UNASSIGNED";
ok("B0  the pre-fix expression reproduces the reported contradiction",
   preFix === "UNASSIGNED" && whoLine(assigned) !== "UNASSIGNED",
   "the old expression did NOT produce UNASSIGNED here, so this fixture is not the " +
   "reported case and B2 proves nothing: pre-fix said \"" + preFix + "\"");

const listSays = stateLine(assigned);
ok("B1  the list names the person on an assigned, unaccepted job",
   !!listSays && /KZ/.test(listSays.text),
   "the list stopped naming them — the contradiction may have been 'fixed' " +
   "by making the list worse instead of the detail better: " + JSON.stringify(listSays));
ok("B2  …and the detail no longer answers UNASSIGNED for that same job",
   whoLine(assigned) !== "UNASSIGNED",
   "THE REPORTED BUG. list: \"" + (listSays && listSays.text) + "\"  detail: \"" +
   whoLine(assigned) + "\" — one work order, two contradictory claims about who has it");
ok("B3  …and the detail names the same person the list named",
   whoLine(assigned).indexOf("KZ") === 0,
   "the two surfaces name different people: list \"" + (listSays && listSays.text) +
   "\" vs detail \"" + whoLine(assigned) + "\"");

//  And the converse: when there really is nobody, BOTH must say so. A fix
//  that names a person where none exists would be the worse error.
//
//  ── THIS ASSERTION MOVED. HERE IS EXACTLY WHY ───────────────────────
//  It used to require the LIST to say "No owner" through stateLine, and that
//  was right: stateLine was then the only place a row could express ownership
//  at all. The Work Orders UI contract now puts the three-state vocabulary on
//  every row, so the list says UNASSIGNED in the same words the detail does —
//  and stateLine repeating it made an unowned job read
//
//      UNASSIGNED  /  No owner  /  Assign
//
//  which is one fact three times, the exact redundancy the earlier ruling
//  removed when it collapsed "Not yet accepted / UNASSIGNED / Assign".
//
//  WHAT IS GUARDED IS NOT WEAKER. Both surfaces must still say there is no
//  owner and neither may invent a name. What changed is which element on the
//  list carries it — so B6 asserts the row really does render the who-line.
//  Without B6 this would be a guard that got quieter to let a change through,
//  which is the one thing a guard may never do.
const listNobody = stateLine(nobody);
ok("B4  with no owner the detail says UNASSIGNED, and the list no longer " +
   "says it a second time in a different voice",
   whoLine(nobody) === "UNASSIGNED" && listNobody === null,
   "detail: \"" + whoLine(nobody) + "\"  list stateLine: " + JSON.stringify(listNobody));
ok("B6  …and the ROW renders the who-line, so 'the list says so' is a fact " +
   "about shipped markup and not an assumption",
   /class="wo-who">'\s*\+\s*esc\(whoLine\(/.test(src),
   "the row does not render whoLine — B4 now relies on the list stating ownership " +
   "somewhere, and nothing proves it does");

//  Every combination, so no state pairing is left unexercised.
const STATES = ["scheduled", "accepted", "en_route", "no_access", "blocked",
                "completion_claimed", "completed"];
let contradictions = [];
STATES.forEach((s) => {
  [null, { user_id: "u1", name: "KZ" }].forEach((asg) => {
    [null, { user_id: "u1", name: "KZ" }].forEach((acc) => {
      //  Accountable without assigned is not a shape the server produces;
      //  acceptance implies assignment.
      if (acc && !asg) return;
      const w = wo({ state: s, assigned_to: asg, accountable: acc || "UNASSIGNED" });
      const detail = whoLine(w);
      const named = detail !== "UNASSIGNED";
      if (asg && !named) contradictions.push(`${s}/assigned → detail said UNASSIGNED`);
      if (!asg && named) contradictions.push(`${s}/nobody → detail named someone`);
    });
  });
});
ok("B5  across every state × assignment combination, the detail never " +
   "denies an owner the server gave it",
   contradictions.length === 0, contradictions.join("\n        "));

// ── C · display only ────────────────────────────────────────────────
//  The reason this fix was allowed to be small. If whoLine ever becomes a
//  predicate, that is an acceptance-policy change wearing a display fix's
//  clothes, and it must not happen by accident.
//  ── THE COUNT WIDENED FROM ONE SITE TO TWO, ON PURPOSE ──────────────
//  The contract puts ownership on every row, so whoLine now renders in the
//  list as well as the detail. That is a second RENDER site, which is what
//  this section always permitted; it is not a second KIND of use.
//
//  The number is still pinned rather than removed, because the danger C
//  guards against has never been "how many times is it called" — it is
//  whoLine becoming a PREDICATE, at which point an acceptance-policy change
//  has shipped wearing a display fix's clothes. C3 and C4 are that guard and
//  are UNCHANGED. Pinning the count keeps a third site from appearing without
//  somebody deciding it should.
const uses = (src.match(/\bwhoLine\s*\(/g) || []).length;
ok("C1  whoLine() has exactly two call sites plus its declaration", uses === 3,
   `${uses} occurrences — it renders the row's who slot and the detail header, ` +
   `and nothing else`);
ok("C2  both call sites are render sites — the row's who slot and the detail header",
   /class="wo-who">'\s*\+\s*esc\(whoLine\(/.test(src) &&
   /class="wo-d-who">'\s*\+\s*esc\(whoLine\(/.test(src),
   "whoLine is being used somewhere other than the two who lines");
ok("C3  no control, action or gate reads it",
   !/(if|while|return)\s*\(?\s*whoLine\s*\(/.test(src) &&
   !/whoLine\([^)]*\)\s*(===|!==|==|!=|&&|\|\|)/.test(src),
   "whoLine appears in a conditional — a display helper became a predicate, which is " +
   "an authorization change, not a display fix");
ok("C4  action() and band() are untouched by it",
   !/function action\([^)]*\)[\s\S]{0,1200}whoLine/.test(src) &&
   !/function band\([^)]*\)[\s\S]{0,600}whoLine/.test(src),
   "the verb or the banding now depends on the who line");

// ── D · the attribution sentences still read as English ─────────────
ok("D1  ownerName() still returns a bare name for an accepted job",
   ownerName(accepted) === "KZ", String(ownerName(accepted)));
ok("D2  ownerName() still returns null when nobody is accountable",
   ownerName(assigned) === null && ownerName(nobody) === null,
   "ownerName was changed to carry display text; the attribution sentences would " +
   "then read 'KZ · ACCEPTED accepted · 9:15 AM'");
ok("D3  the attribution sentences read ownerName, never whoLine",
   /function attribution\([\s\S]{0,700}ownerName\(w\)/.test(src) &&
   !/function attribution\([\s\S]{0,700}whoLine/.test(src),
   "attribution() is composing sentences out of a formatted status string");

console.log("\n" + "═".repeat(68));
console.log(`  ${fail === 0 ? "✓ PASS" : "✗ FAIL"} — ${pass} passed, ${fail} failed`);
if (fail === 0) {
  console.log("  One work order, one story: the list and the detail agree, and the");
  console.log("  middle state — assigned but not accepted — is finally sayable.");
}
console.log("═".repeat(68) + "\n");
process.exit(fail === 0 ? 0 : 1);
