#!/usr/bin/env node
"use strict";

// PROPERTY SPINE — NO OPERATOR COMPLETION CONTROL (Release 0, step 5)
//
// Step 5 retires the operator's ability to declare a work order complete.
// After this, the app READS and REVIEWS completion; it does not DECLARE it.
//
// The control it removes was not a weaker completion — it was a record that
// looked like one. "Mark done — close" PATCHed done:true with a
// `stub://closeout-photo/...` string where the proof should be: no bytes, no
// evaluation, no completion event, no attributable actor, and no way to
// convert it into proof afterwards.
//
// ── WHY A TEST AND NOT JUST A DIFF ───────────────────────────────────
// A deletion is not a control. Nothing stops the button being re-added by a
// future edit that looks reasonable in isolation, and the API's 409 would
// then surface as an operator-visible dead end rather than as a design.
// This asserts the ABSENCE, and pairs every absence with the presence of
// the not-done path — because a file that lost both would also pass an
// absence-only check while being far more broken.
//
// No database, no browser, no network. It reads index.html.
//
// Run:  node no_operator_completion_proof.test.js
// Exit: 0 all passed · 1 any failed

const fs = require("fs");
const path = require("path");

//  Overridable so the absences below can be FALSIFIED against a copy that
//  puts the control back. An absence assertion that has never been seen to
//  fail is indistinguishable from a typo in the pattern.
const INDEX = process.env.APP_INDEX || path.join(__dirname, "index.html");
const src = fs.readFileSync(INDEX, "utf8");

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.error("  ✗ " + name); if (detail) console.error("      " + detail); }
}

console.log("\n══ No operator completion control — Release 0 step 5 ══\n");

/*  ── FIRST: THE SCRIPT MUST STILL PARSE ──────────────────────────────
 *
 *  This change DELETED two functions and a const out of one enormous
 *  inline script. A syntax error there does not break the closeout panel;
 *  it fails the ENTIRE script and the whole app renders dead. That exact
 *  failure was found in production on 2026-08-08 in the tenant setup page,
 *  from an unrelated escape, and nothing caught it because every check read
 *  the source rather than parsing it.
 *
 *  Compiled, not executed — vm.Script parses and throws on a syntax error
 *  without running a line of it. Asserted FIRST because every assertion
 *  below is about a file that has to load at all.  */
const vm = require("vm");
const scripts = [...src.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1])
  .filter((s2) => s2.trim().length > 0);
ok("S0  index.html carries inline scripts to check", scripts.length > 0);
let syntaxErrors = [];
scripts.forEach((code, i) => {
  try { new vm.Script(code, { filename: `index.html#script${i}` }); }
  catch (e) { syntaxErrors.push(`script ${i}: ${e.message}`); }
});
ok("S1  every inline script PARSES — the app is not dead",
   syntaxErrors.length === 0,
   syntaxErrors.join("\n      ") +
   "\n      a syntax error fails the WHOLE script, not one function");

/*  Comments describing what was removed necessarily NAME the removed
 *  things. Searching the raw file would therefore match this file's own
 *  tombstones and report a control that is not there. Strip comments
 *  first, then assert — the same distinction the API's writer gate makes
 *  between a register entry and a live statement. */
const live = src
  .replace(/<!--[\s\S]*?-->/g, "")        // html comments
  .replace(/^\s*\/\/.*$/gm, "")           // whole-line js comments
  .replace(/\/\*[\s\S]*?\*\//g, "");      // block comments

ok("C0  stripping comments did not empty the file",
   live.length > src.length * 0.5,
   "the comment stripper ate " + (100 - Math.round(live.length / src.length * 100)) +
   "% of the file — every absence below would pass vacuously");

// ── 1. THE CONTROL IS GONE ────────────────────────────────────────────
ok("C1  no 'Mark done — close' control", !/Mark done — close/.test(live));
ok("C2  no closeoutDone function or call", !/closeoutDone/.test(live));
ok("C3  no attachStubPhoto helper or call", !/attachStubPhoto/.test(live));
ok("C4  no woStubPhotos store", !/woStubPhotos/.test(live));
ok("C5  no woPhotoState element", !/woPhotoState/.test(live));

//  The specific fabrication. Scoped to the closeout photo shape so an
//  unrelated inspection stub — a separate surface, and its own finding —
//  does not make this pass or fail for the wrong reason.
ok("C6  nothing mints a stub:// CLOSEOUT photo",
   !/stub:\/\/closeout-photo/.test(live),
   "a fabricated-evidence minter is one call site away from being live");

//  The verb itself, at the transport layer. This is the assertion that
//  survives a rename: whatever a future control is called, it cannot
//  complete a work order without sending done:true to this route.
const doneTrueToCloseout =
  /closeout[^`]*`[^)]*\bdone\s*:\s*true/.test(live) ||
  /\bdone\s*:\s*true[^}]*completion_photo/.test(live);
ok("C7  NOTHING sends done:true to the closeout route",
   !doneTrueToCloseout,
   "some surface still asks the API to complete a work order — the API " +
   "answers 409 legacy_completion_retired, so this is a dead end shown to " +
   "an operator, not a working control");

// ── 2. THE PAIRED PRESENCE ────────────────────────────────────────────
//  An absence-only test passes on an empty file. These make the result
//  mean "completion removed" rather than "closeout removed".
ok("P1  closeoutNotDone is still defined", /async function closeoutNotDone\(/.test(live));
ok("P2  …and still sends done:false", /done\s*:\s*false/.test(live));
ok("P3  …and still requires a structured reason",
   /not_done_reason\s*:\s*reason/.test(live));
ok("P4  the 'Not 100% done' control is still on the panel",
   /Not 100% done/.test(live) && /toggleNotDone\(/.test(live));
ok("P5  the reason picker still loads its options from the API",
   /loadNotDoneReasons\(/.test(live));

// ── 3. THE PANEL DOES NOT LIE ─────────────────────────────────────────
//  A panel still headed "Close it out" that cannot close anything tells the
//  operator their job is unchanged and only the mechanism broke.
ok("H1  the panel is no longer labelled as closing anything",
   !/<div class="mini">Close it out<\/div>/.test(live),
   "the heading still promises a close the app can no longer perform");
ok("H2  …and it says where completion is actually recorded",
   /Completion is recorded by the technician/.test(live),
   "removing the control without saying where the verb went leaves the " +
   "operator with a missing feature rather than a moved one");

console.log(`\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
