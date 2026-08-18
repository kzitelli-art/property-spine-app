/* ════════════════════════════════════════════════════════════════════
 *  THE TEAM INVITE IS GATED ON THE SESSION, AND SCOPED BY IT
 *
 *  Two rules, both learned from production on 2026-08-18:
 *
 *  1  A LIVE SESSION IS THE AUTHORITY, NOT THE OPERATOR KEY.
 *     POST /properties/:id/team-invites resolves its actor from
 *     x-staff-session and 401s without one; the operator key
 *     "authenticates the caller, not the human". The UI gated on
 *     key(), so a super_admin with can_manage_roles could not invite
 *     from the product and silently got the demo staging path.
 *
 *  2  THE PROPERTY COMES FROM THE SESSION, NOT THE PICKER.
 *     Production holds THREE rows named Skyline (two empty) and THREE
 *     named Solo on Chestnut. Inviting a real person into the wrong one
 *     is not a hypothetical failure here.
 *
 *  Source-level and deliberately so: this is about which branch the
 *  function takes and which identifier it interpolates, both of which
 *  are decided before any request exists.
 * ════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
let pass = 0, fail = 0;
const ok = (c, l, d) => { if (c) { pass++; console.log("  ok    " + l); }
                          else { fail++; console.log("  FAIL  " + l + (d ? "\n          " + d : "")); } };

const start = src.indexOf("async function inviteTeamMember");
const end = src.indexOf("function surfaceRole");
ok(start > 0 && end > start, "inviteTeamMember is still findable",
   "the function was renamed or moved — re-read it before trusting this file");
const fn = src.slice(start, end);

/*  Comments out, line-leading only. A naive block-comment regex ate real
 *  code in a sibling gate and reported cheerful ok's over the holes.  */
const code = fn.split("\n").reduce((a, line) => {
  const t = line.trim();
  if (a.b) { if (t.includes("*/")) a.b = false; a.o.push(""); return a; }
  if (t.startsWith("/*")) { if (!t.includes("*/")) a.b = true; a.o.push(""); return a; }
  if (t.startsWith("*") || t.startsWith("//")) { a.o.push(""); return a; }
  a.o.push(line); return a;
}, { o: [], b: false }).o.join("\n");

ok(/team-invites/.test(code), "comment-stripping left the invite call intact",
   "the stripper ate the thing under test");

console.log("\n── 1 · the gate ──");
ok(!/\bif\s*\(\s*key\(\)\s*\)/.test(code),
   "the live branch is NOT gated on the operator key",
   "if(key()) is back — a signed-in operator with full rights cannot invite");
ok(/if\s*\(\s*_liveSession\s*\)/.test(code),
   "the live branch is gated on a live session");
ok(/__psLive[\s\S]{0,80}hasSession/.test(code),
   "the session check asks the sealed live loader");

console.log("\n── 2 · the scope ──");
ok(!/properties\/\$\{prop\(\)\}\/team-invites/.test(code),
   "the invite is NOT addressed with the picker's value",
   "prop() is back — an invite can land on the wrong Skyline");
ok(/properties\/\$\{_invitePropertyId\}\/team-invites/.test(code),
   "the invite is addressed with the session-derived property");
ok(/getConfirmedScope/.test(code),
   "the property id prefers the SERVER-CONFIRMED scope");
ok(/sessionMeta/.test(code),
   "and falls back to the session's own record, not to the picker");

console.log("\n── 3 · honest failure ──");
ok(/_liveSession\s*&&\s*!_invitePropertyId/.test(code),
   "signed in but no confirmed property is refused, not guessed");
ok(/has not confirmed which property/.test(fn),
   "and the refusal says what is wrong in the operator's words");
ok(/Sign in to create a live invite/.test(fn),
   "the offline path now says SIGN IN, not 'add an operator key'");
ok(!/Add an operator key to create a live invite/.test(fn),
   "the stale operator-key instruction is gone");
ok(/Demo invite staged locally/.test(fn),
   "the offline path still says plainly that nothing was sent");

console.log("\n════════════════════════════════════════════════════════════════");
console.log("  ASSERTIONS COMPLETE · " + (pass + fail) + " run · " + pass + " passed · " + fail + " failed");
console.log(fail ? "  ✗ FAIL" : "  ✓ PASS — the invite is authorized and scoped by the session.");
console.log("════════════════════════════════════════════════════════════════\n");
process.exit(fail ? 1 : 0);
