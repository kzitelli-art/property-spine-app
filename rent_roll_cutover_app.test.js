/* ══════════════════════════════════════════════════════════════════════════
   rent_roll_cutover_app.test.js — C/D cutover, emitted-output assertions.

   Two UI rulings are the point of this file, and both are easy to lose:
     1. Do NOT print "Not configured" 283 times. When nothing is classified,
        the type column is omitted and the page says so once.
     2. Do NOT lead with an occupancy percentage. The leasable denominator is
        not fully governed until use_type is populated, so the primary surface
        leads with a count and shows what is unresolved beside it.

   Run:  node rent_roll_cutover_app.test.js
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("   PASS  " + m); } else { fail++; console.log("   FAIL  " + m); } };

function extract(name) {
  const start = html.indexOf("function " + name + "(");
  if (start < 0) throw new Error("not found: " + name);
  const open = html.indexOf("{", start);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  return html.slice(start, i);
}
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const box = {};
new Function("esc",
  extract("psRrMoney") + "\n" + extract("psRrDate") + "\n" + extract("psRrException") + "\n" + extract("psRrRow") +
  "\nthis.psRrRow=psRrRow; this.psRrException=psRrException;").call(box, esc);

const base = {
  space_id: "s1", unit_id: "u1", unit_number: "731", space_label: null,
  tenancy_state: "contractually_occupied", evidence_state: "confirmed", economics_state: "available",
  resident: { person_id: "p1", name: "Diane Kang" }, current_rent: 1930,
  lease: { lease_id: "L1", start_date: "2026-01-01", end_date: "2026-08-14" },
  balance: null, is_down: false, proof_basis: "confirmed_opening_import",
};

console.log("\n== rows ==");
const row = box.psRrRow(base, false);
ok(/Unit 731/.test(row), "position renders");
ok(/Diane Kang/.test(row), "resident renders");
ok(/\$1,930/.test(row), "contractual rent renders");
ok(/Aug 14, 2026/.test(row), "lease end renders in local time");
ok(/openPersonCard\(/.test(row) && /"source":"rent_roll"/.test(row), "row opens the Person Card with context");
ok(!/rrc-type/.test(row), "type column is ABSENT when classification is unconfigured");
ok(/rrc-type/.test(box.psRrRow(base, true)), "type column appears only when something is configured");

console.log("\n== one exception per row, and only when it differs ==");
ok(box.psRrException(base) === "", "a normal occupied row carries no exception");
ok(/Overlapping lease claims/.test(box.psRrException({ ...base, tenancy_state: "contested" })), "contested says so");
ok(/Occupancy evidence unresolved/.test(box.psRrException({ ...base, tenancy_state: "unresolved" })), "unresolved says so");
ok(/Contractual rent unavailable/.test(box.psRrException({ ...base, economics_state: "unavailable" })), "missing economics says so");
ok(/Resident not linked/.test(box.psRrException({ ...base, resident: null })), "missing resident says so, and is not UNASSIGNED");
ok(!/UNASSIGNED/.test(box.psRrRow({ ...base, resident: null }, false)), "identity absence never renders UNASSIGNED");
const noRent = box.psRrRow({ ...base, current_rent: null, economics_state: "unavailable" }, false);
ok(/Rent unavailable/.test(noRent) && !/\$/.test(noRent.replace(/&#039;/g, "")), "missing rent shows no dollar figure");
ok(/Balance \$1,204/.test(box.psRrRow({ ...base, balance: 1204 }, false)), "balance renders as secondary context");
ok(!/Balance/.test(row), "a zero/absent balance is not printed");

console.log("\n== ruling 1: no repeated 'Not configured' ==");
const rrFn = extract("psLiveRentRoll");
ok(/Unit classifications have not yet been configured\./.test(rrFn), "the page states it ONCE");
ok(/var anyType\s*=/.test(rrFn) && /anyType \?/.test(rrFn), "the type column is conditional on something being configured");

console.log("\n== ruling 2: no false-precision occupancy ==");
ok(/positions are contractually occupied/.test(rrFn), "leads with the COUNT");
ok(!/pct/.test(rrFn) && !/%/.test(rrFn.replace(/[^%]*rrc-/g, "")), "no occupancy percentage is rendered");
ok(/unresolved/.test(rrFn) && /contested/.test(rrFn) && /down/.test(rrFn), "unresolved, contested and down are shown separately");

console.log("\n== shared conditions once, honest states ==");
ok(/conflicting occupancy evidence/.test(rrFn) && /overlapping lease claims/.test(rrFn)
   && /unavailable contractual economics/.test(rrFn), "the three shared conditions are page-level");
ok(/No rentable positions are configured/.test(rrFn), "honest EMPTY state");
ok(/The rent roll is unavailable/.test(rrFn) && /Retry/.test(rrFn), "honest UNAVAILABLE state, distinct from empty");
ok(!/market_rent/.test(rrFn), "market_rent is not an operating column");

console.log("\n== factual Future Rent Roll ==");
const frFn = extract("psLiveFutureRentRoll");
ok(/positions contractually locked/.test(frFn), "leads with contractually locked positions");
ok(/monthly contractual rent/.test(frFn), "shows monthly contractual rent with known economics");
ok(/verified in Spine/.test(frFn) && /confirmed opening truth/.test(frFn), "proof bases remain visibly distinct");
ok(/successor pending but not contractually locked/.test(frFn), "pending successors are named as not locked");
ok(/open or uncovered/.test(frFn) && /overlapping lease claims/.test(frFn), "open and contested are reported");
ok(/Contractual facts only\./.test(frFn), "states contractual-facts-only");
for (const banned of ["need to 95", "Need to 95", "projected occupancy", "assumed", "target occupancy", "market_rent"]) {
  ok(!frFn.includes(banned), `Future Rent Roll renderer contains no "${banned}"`);
}

console.log("\n== cutover wiring ==");
ok(/rentRollCanonical:\s*\{/.test(html) && /\/operator\/rent-roll\/canonical/.test(html), "rentRollCanonical registered");
ok(/futureRentRollFacts:\s*\{/.test(html) && /\/operator\/rent-roll\/future-facts/.test(html), "futureRentRollFacts registered");
const openFull = extract("openRentRollFull");
ok(/hasSession\(\)\) return psLiveRentRoll\(\)/.test(openFull), "signed-in Current Rent Roll routes to the canonical read");
ok(/return psLiveFutureRentRoll\(\)/.test(html), "signed-in forward door routes to the factual read");
const truthDoc = extract("_rrTruthDoc");
ok(/if\(_rrSignedIn\(\)\) return null;/.test(truthDoc),
  "the imported document is structurally unreachable while signed in - not merely unused");
ok(/__RENT_ROLL_TRUTH_LIBRARY/.test(truthDoc), "the signed-out demo path still reads the library, untouched");
ok(!/Forward Rent Roll/.test(html), "the user-facing concept is renamed Future Rent Roll everywhere");

console.log("\n== operating navigation: search + filters ==");
const FILTERS = html.slice(html.indexOf("var PS_RR_FILTERS"), html.indexOf("function psRrMatch"));
["occupied", "unresolved", "contested", "notice", "down", "exceptions", "balance"].forEach((k) => {
  ok(new RegExp("key: '" + k + "'").test(FILTERS), "filter present: " + k);
});
ok(/available: function/.test(FILTERS),
  "the balance filter is offered only when a real balance exists - an always-empty control is noise");
const paint = extract("psRrPaint");
ok(/d\.rows\.filter\(psRrMatch\)/.test(paint), "filtering narrows the server-classified rows");
ok(!/contractual_rent_trusted/.test(paint) && !/reduce\(/.test(paint),
  "the filtered view never recalculates a total - totals stay server-authored");
ok(/of ' \+ d\.rows\.length/.test(paint),
  "the count reads 'N of TOTAL', so a filtered view is never mistaken for the property");
const rrNav = extract("psLiveRentRoll");
ok(/Search unit, bed or resident/.test(rrNav), "one search field, over unit, bed and resident");
ok(/psRrPaint\(\)/.test(rrNav), "rows render through the shared paint path");
const match = extract("psRrMatch");
ok(/unit_number/.test(match) && /space_label/.test(match) && /resident/.test(match),
  "search covers unit, bed label and resident name");

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
process.exit(fail === 0 ? 0 : 1);
