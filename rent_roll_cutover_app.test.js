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
// The literal must come from the DATA. Hardcoding it printed "Not configured"
// on all 283 rows the moment governed types existed — exactly what the ruling
// against repeated "Not configured" forbids.
ok(/Studio/.test(box.psRrRow({ ...base, unit_type: "Studio" }, true)),
  "a governed unit type renders its label, not a hardcoded string");
ok(/Not configured/.test(box.psRrRow({ ...base, unit_type: null }, true)),
  "an unclassified position inside a classified property still says so");
ok(!/Not configured/.test(box.psRrRow({ ...base, unit_type: "1 Bed + Den" }, true)),
  "a classified row never prints Not configured");

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
//  RULING UPDATED, NOT RELAXED. The signed-in door still routes to a canonical
//  live read and still cannot reach the imported-document renderer; what
//  changed is WHICH canonical projection it opens. It now opens the unit-first
//  read, because that is the shape an operator thinks in — the flat
//  one-row-per-position schedule stays reachable from inside it. Both read the
//  same dated position service, so this is a second projection and never a
//  second truth. Asserted by name: an API-shaped rename that silently pointed
//  this door back at a fixture path is exactly what this line exists to catch.
ok(/hasSession\(\)\) return psLiveUnitRentRoll\(\)/.test(openFull),
  "signed-in Current Rent Roll routes to the canonical unit-first read");
ok(!/rentRollFor\(\)/.test(openFull.split("hasSession")[0]),
  "nothing fixture-shaped runs before the signed-in branch");
const unitRoll = extract("psLiveUnitRentRoll");
ok(/loadResource\('rentRollUnits'/.test(unitRoll), "the unit-first read goes through the sealed live loader");
ok(/onclick="psLiveRentRoll\(\)"/.test(unitRoll), "the flat schedule stays reachable from it");
ok(/Full schedule/.test(unitRoll) && !/One row per position/.test(unitRoll),
  "the secondary mode is named for the operator, not for our row model");

//  ── THE UI RESET: A DENSE ALIGNED TABLE, NOT A COLUMN OF SENTENCES ──
//  The first build of this surface made each position a sentence so an
//  unknown rent would not become an em-dash in a column. It was truthful and
//  unscannable. These lines pin the presentation ruling that replaced it.
const paintU = extract("psRruPaint");
ok(/<table class="rru-t">/.test(paintU) && /<colgroup>/.test(paintU),
  "positions render as one aligned table, so columns line up ACROSS units");
ok(/<tbody class="rru-g"/.test(paintU),
  "each unit is a tbody, so grouping never breaks column alignment");
ok(/cols\.room/.test(paintU),
  "the unit band appears only where a unit holds several positions");
const rowU = extract("psRruRow");
ok(!/whole\s*unit/i.test(rowU) || /psRruLabel/.test(rowU),
  "the placeholder label is never printed; the room cell comes from psRruLabel");
const labelU = extract("psRruLabel");
ok(/whole\s*\\s\*unit/i.test(labelU) || /whole/i.test(labelU),
  "psRruLabel suppresses the machinery placeholder rather than rendering it");
ok(!/cleanUnit/.test(unitRoll + paintU + rowU),
  "no grain-destroying unit helper touches this surface");

//  GRAIN COMES FROM THE PAYLOAD, NEVER FROM WHICH PROPERTY IS OPEN (§22).
ok(/rentable_positions\s*>\s*t\.units/.test(unitRoll),
  "room-vs-unit grain is decided from the response totals");
for (const banned of ["Skyline", "skyline", "1417"]) {
  ok(!unitRoll.includes(banned) && !paintU.includes(banned) && !rowU.includes(banned),
    `the rent roll renderer contains no "${banned}" branch`);
}

//  TWO SILENCES, TWO MARKS. A dash means the column does not apply; "Unknown"
//  means the fact applies and Spine was never given it. Collapsing them would
//  hide 120 real gaps behind punctuation.
const rentU = extract("psRruRent");
ok(/no_lease/.test(rentU) && /RRU_NIL/.test(rentU), "no lease renders the not-applicable mark");
ok(/not_in_source/.test(rentU) && /Unknown/.test(rentU), "a rent the source lacked renders as Unknown");
ok(!/\$0/.test(rentU) && !/toFixed/.test(rentU), "a missing rent is never zero and never formatted into one");

//  ── STATUS IS RELAYED, NOT DERIVED ──────────────────────────────────
//  This block used to assert that psRruStatus CONTAINED the literals
//  'exception','occupied','committed','pending','open' — which is the
//  browser-side classifier written down as intent. It was green the whole
//  time the function ended in `return 'open'`, because a list of literals
//  cannot tell classification from relay.
//
//  The server decides the bucket once. What is asserted now is that the
//  browser reads that decision and derives nothing from the row's parts.
const statusU = extract("psRruStatus");
ok(/\bp\.bucket\b/.test(statusU), "status reads the server's bucket");
for (const derived of ["p.current", "p.next", "conflict_state", "is_down",
                       "evidence_state", "tenancy_state"]) {
  ok(!statusU.includes(derived),
    `status does not re-derive from ${derived} - the server already decided`);
}
ok(!/return\s*'open'/.test(statusU),
  "status never falls through to Open - Open by subtraction is the defect");
ok(/not_established/.test(statusU),
  "a position with no bucket is not_established, not a fifth tenancy state");
ok(!/vacant/i.test(statusU) && !/leased/i.test(statusU),
  "status never says vacant or leased - both are claims this read cannot make");

//  OPERATOR VOCABULARY COMES DOWN WITH THE ROW.
const statusLabelU = extract("psRruStatusLabel");
ok(/bucket_label/.test(statusLabelU),
  "the label on the glass is the server's bucket_label");
ok(/RRU_NOT_ESTABLISHED_LABEL/.test(statusLabelU),
  "the one locally-authored label is the no-basis case, which has no bucket to label");
const filtersU = html.slice(html.indexOf("var RRU_FILTERS"),
                            html.indexOf("function psRruPassesFilter"));
for (const k of ["occupied", "activation_pending", "open", "needs_review", "not_established"]) {
  ok(filtersU.includes("'" + k + "'") || filtersU.includes("key:'" + k + "'")
     || new RegExp("key:\\s*'" + k + "'").test(filtersU),
    "filter key is the server's bucket value: " + k);
}
ok(!/'committed'|'pending'|'exceptions'/.test(filtersU),
  "no filter selects a category the server does not count");
const passesU = extract("psRruPassesFilter");
ok(!/p\.current|p\.next|conflict_state|is_down/.test(passesU),
  "filtering narrows which classified rows are shown - it does not classify");

//  EXPANDED DETAIL SPEAKS PROPERTY, NOT SCHEMA.
const detailU = extract("psRruDetail");
//  The expansion is now a two-line ledger sub-row, so "Lease start" and
//  "Lease end" became one "Term" field and the redundant "Lease status" went
//  with the compression. What is asserted is that the row still says WHO,
//  FOR WHEN, FOR HOW MUCH and ON WHAT AUTHORITY.
["Unit", "Resident", "Term", "Contracted rent", "How this is known", "Source"].forEach((k) => {
  ok(detailU.includes("'" + k + "'"), "expanded detail carries operator field: " + k);
});
ok(/rru-xl/.test(detailU) && (detailU.match(/class="rru-xl"/g) || []).length === 2,
  "the expansion is two ledger lines, not a form");
//  Asserted on the LABELS the operator sees, not on which fields the code
//  reads. Reading `c.proof_basis` is correct; printing "proof basis" at a
//  person is the defect. The first version of this line conflated the two and
//  went red on the translation itself.
const detailLabels = [...detailU.matchAll(/\bf\('([^']+)'/g)].map((m) => m[1]);
ok(detailLabels.length >= 10, "the expanded row carries a real field set (" + detailLabels.length + ")");
for (const jargon of ["tenancy", "evidence", "economics", "position kind", "proof basis",
                      "opening evidence", "imported claim", "trusted rent", "axis"]) {
  ok(!detailLabels.some((l) => l.toLowerCase().includes(jargon)),
    `no expanded label is internal vocabulary: "${jargon}"`);
}
ok(/psRruProven/.test(detailU), "proof basis is translated, not printed raw");
const provenU = extract("psRruProven");
ok(/native_verified/.test(provenU) && /confirmed_opening_import/.test(provenU)
   && /Executed and funded/.test(provenU),
  "the translation maps every canonical basis to a sentence a person can read");

//  NO SECOND REQUEST, EVER, FROM THE DETAIL.
ok(!/loadResource/.test(detailU) && !/loadResource/.test(paintU) && !/loadResource/.test(rowU),
  "expanding a row and repainting the table fetch nothing");

//  THE DATE STAYS ONE SEAM. Slice 2's leasing-cycle controls are NOT here.
ok(/loadResource\('rentRollUnits', \{ asOf: _psRru\.asOf \}\)/.test(unitRoll),
  "the read always names its date explicitly - today is a default value");
//  Word-bounded. A plain substring check went red on "pace" — because
//  `space_id` contains it. A guard that cannot tell a Slice 2 concept from a
//  substring of a canonical field name would force the field to be renamed to
//  satisfy the test, which is the tail wagging the dog.
for (const slice2 of ["preleased", "pace", "season", "velocity", "projected", "target occupancy",
                      "concession", "market rent recommendation"]) {
  ok(!new RegExp("\\b" + slice2 + "\\b", "i").test(unitRoll),
    `the rent roll does not begin Slice 2: "${slice2}"`);
}
ok(!/%/.test(extract("psRruPaint")) && !/occupancy_pct|occupied_pct/.test(unitRoll),
  "no occupancy percentage - this slice states positions, it does not grade them");
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

console.log("\n== institutional print view ==");
ok(/rentRollInstitutional:\s*\{/.test(html) && /\/operator\/rent-roll\/institutional/.test(html),
  "rentRollInstitutional registered on the live loader");
const ir = extract("psLiveInstitutionalRentRoll");
ok(/d\.columns\.map/.test(ir), "the table renders the SERVER's column definition, not a client list");
ok(!/reduce\(/.test(ir), "the institutional renderer never sums anything");
ok(/d\.totals/.test(ir) && !/trusted_monthly_contractual_rent\s*=/.test(ir),
  "totals are read from the response, never assigned");
ok(/d\.report\.property_name/.test(ir) && /d\.report\.as_of/.test(ir) && /d\.report\.generated_at/.test(ir),
  "property, as-of and generated timestamp are printed on the page itself");
ok(/Reconciliation and proof/.test(ir), "the reconciliation section is part of the printed package");
ok(/reconciliation\.statements\.map/.test(ir), "reconciliation statements come from the server verbatim");
ok(/Print \/ Save as PDF/.test(ir), "browser Print / Save as PDF");
ok(!/market_rent/.test(ir), "no market_rent in the institutional renderer");

const csvFn = extract("psIrExportCsv");
ok(/_psIr\.data/.test(csvFn), "CSV serialises the SAME in-memory response the page is rendering");
ok(/d\.columns\.map/.test(csvFn), "CSV uses the server column definition and order");
ok(!/reduce\(/.test(csvFn) && !/\* |\/ /.test(csvFn.replace(/\/\/.*/g, "")),
  "CSV performs no arithmetic - it only serialises");
ok(/d\.report\.property_name/.test(csvFn) && /d\.report\.as_of/.test(csvFn),
  "the CSV names the property and as-of date");
ok(!/fetch\(/.test(csvFn), "CSV does not re-request - it cannot drift from the printed page");

const css = html.slice(html.indexOf(".ir-page{"), html.indexOf(".ir-page{") + 2600);
ok(/@page\{size:landscape/.test(css), "print layout is landscape");
ok(/thead\{display:table-header-group\}/.test(css), "table headers repeat on every printed page");
ok(/tr\{page-break-inside:avoid\}/.test(css), "rows are not split across pages");
ok(/\.no-print[^}]*display:none/.test(css.replace(/\s/g, " ")) || /\.no-print,/.test(css),
  "controls are hidden in print");

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
process.exit(fail === 0 ? 0 : 1);
