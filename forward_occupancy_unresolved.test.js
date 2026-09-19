/* ══════════════════════════════════════════════════════════════════════════
   forward_occupancy_unresolved.test.js — AN UNRESOLVED POSITION IS NOT A
   VACANT ONE.

   WHAT WAS WRONG
   --------------
   The Management condition panel rendered FORWARD OCCUPANCY as a flat
   percentage taken straight from the forward snapshot:

       projectedPct = projectedOccupied / denominator

   and the denominator holds EVERY position — including the ones
   _rrForwardPosition could not project at all, which it classifies
   'unresolved_exposed' with conflict 'Current lease end is unavailable' and
   the action 'Confirm the lease term before projecting this unit'. Dividing
   by those turns "we cannot tell" into "not occupied".

   That is the forward form of the rule §42 states for the current read:
   Open is a positive classification and may never be total − occupied.

   MEASURED IN THE BROWSER, not argued. Greenery's hub showed:

       FORWARD OCCUPANCY  0.0%     Contracted as of 120 days
       snapshot: unresolved 97 · uncovered 97 · conflicts 97 · denominator 97

   In student housing "0.0% contracted" reads as NOTHING IS LEASED FOR NEXT
   YEAR. The truth was NOTHING HERE CAN BE PROJECTED YET. Those are the two
   most different sentences on that screen, and the number said the wrong one.

   WHAT THIS PROTECTS
   ------------------
   1. Any unresolved position makes the percentage a FLOOR (≥), never a claim.
   2. The count of unresolved positions is named beside it, with its base.
   3. With nothing unresolved the percentage is exact and renders plain — the
      fix does not put a ≥ on a number that has earned certainty.
   4. Only 'unresolved' triggers it. A vacant position is known-empty and a
      notice position is known-ending; neither makes the figure a guess.

   Run:  node forward_occupancy_unresolved.test.js
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("   PASS  " + m); } else { fail++; console.log("   FAIL  " + m); } };

function extract(name) {
  const m = new RegExp("function\\s+" + name + "\\s*\\(").exec(html);
  if (!m) throw new Error("not found: function " + name);
  const open = html.indexOf("{", m.index + m[0].length - 1);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  return html.slice(m.index, i);
}

//  The real panel, executed. `esc` is the app's escaper.
const panel = new Function("esc", extract("managementConditionPanel") + "\nreturn managementConditionPanel;")
  ((x) => String(x == null ? "" : x));

//  Read the FORWARD cell only — the panel renders four, and an unscoped
//  match would happily read Current occupancy's number instead.
function forwardCell(o) {
  const html_ = panel(o);
  const cells = html_.split('<div class="le-cond-cell');
  const cell = cells.find((c) => /Forward occupancy/.test(c));
  if (!cell) throw new Error("no forward cell rendered");
  const val = /<div class="le-cond-val">([^<]*)</.exec(cell);
  const sub = /<div class="le-cond-sub">([^<]*)</.exec(cell);
  const note = /<div class="le-cond-note">([^<]*)</.exec(cell);
  return { val: val ? val[1] : null, sub: sub ? sub[1] : null, note: note ? note[1] : null };
}

const BASE = { occPct: "100%", occupied: 97, totalUnits: 97, fwdWhen: "120 days" };

/*  SUPERSEDED BY §18, DELIBERATELY. This block previously asserted that the
    97-of-97 case renders a "≥0.0%" floor. The convergence spec's permanent
    ruling replaces that: a lower bound over a wholly unresolved denominator is
    informationally meaningless, and ≥0.0% reads as "we have leased nothing"
    when the truth is "we cannot see yet". The all-unresolved case is asserted
    in its own block below; this one now covers the LIVE Greenery shape, which
    is partial — 4 of 105 unresolved at the 120-day horizon.  */
console.log("\n== Greenery's live shape: 4 of 105 unresolved ==");
{
  const f = forwardCell(Object.assign({}, BASE, { fwdPct: 86.666, fwdUnresolved: 4, fwdDenominator: 105 }));
  ok(f.val === "≥86.7%", "the value is a FLOOR, not a claim (got " + f.val + ")");
  ok(f.val !== "86.7%", "it does not claim exactness while anything is unresolved");
  ok(/4 of 105 unresolved/.test(f.sub || ""), "the sub names how many are unresolved, and of what base");
  ok(/not yet projectable/.test(f.sub || ""), "and says plainly that those cannot be projected");
  ok(/as of 120 days/.test(f.sub || ""), "the horizon is still stated");
}

console.log("\n== §18 · nothing projectable is NOT a lower bound ==");
{
  const f = forwardCell(Object.assign({}, BASE, { fwdPct: 0, fwdUnresolved: 105, fwdDenominator: 105 }));
  ok(f.val === "Not projectable", "every position unresolved renders 'Not projectable' (got " + f.val + ")");
  ok(!/0\.0%/.test(f.val), "and NOT 0.0%");
  ok(!/\u2265/.test(f.val), "and NOT \u22650.0% — a meaningless lower bound is not an answer");
  ok(/105 of 105 positions lack sufficient dated terms/.test(f.sub || ""),
    "the sub says how many positions lack dated terms (got: " + f.sub + ")");
  ok(/as of 120 days/.test(f.sub || ""), "and still names the horizon");
}

console.log("\n== §18 · a ZERO floor is not a floor ==");
{
  //  Greenery at September 1 2027, from the canonical server: every lease has
  //  expired, so 0 are contractually committed and 95 of 105 are unresolved.
  //  \u22650.0% is vacuously true and §18 forbids printing it.
  const f = forwardCell(Object.assign({}, BASE, { fwdPct: 0, fwdUnresolved: 95, fwdDenominator: 105 }));
  ok(f.val === "Not projectable", "0 committed with 95 unresolved is 'Not projectable' (got " + f.val + ")");
  ok(!/\u22650\.0%/.test(f.val), "and never \u22650.0%");
  ok(/95 of 105 positions lack sufficient dated terms/.test(f.sub || ""), "the count is named");
  ok(/nothing contracted at that date/.test(f.sub || ""),
    "and it says nothing is contracted, which is the actual news (got: " + f.sub + ")");
}

console.log("\n== a partially resolved building ==");
{
  const f = forwardCell(Object.assign({}, BASE, { fwdPct: 62.5, fwdUnresolved: 12, fwdDenominator: 105 }));
  ok(f.val === "≥62.5%", "62.5% with 12 unresolved is a floor (got " + f.val + ")");
  ok(/12 of 105 unresolved/.test(f.sub || ""), "the unresolved count is named");
}

console.log("\n== nothing unresolved: the number has earned certainty ==");
{
  const f = forwardCell(Object.assign({}, BASE, { fwdPct: 88.4, fwdUnresolved: 0, fwdDenominator: 105 }));
  ok(f.val === "88.4%", "it renders plain, with no ≥ (got " + f.val + ")");
  ok(!/unresolved/.test(f.sub || ""), "and claims no unresolved positions");
  ok(/^Contracted as of 120 days$/.test(f.sub || ""), "the sub is just the horizon (got: " + f.sub + ")");
}

console.log("\n== only UNRESOLVED triggers the floor ==");
{
  //  A vacant or notice position is KNOWN. The snapshot counts those in
  //  vacantUncovered / noticeUncovered, which are not passed here — so a
  //  building with vacancies but no unresolved terms still reads exact.
  const f = forwardCell(Object.assign({}, BASE, { fwdPct: 71.0, fwdUnresolved: 0, fwdDenominator: 105 }));
  ok(f.val === "71.0%", "known-vacant stock does not make the figure a guess");
}

console.log("\n== the cell still degrades honestly when there is no forward read ==");
{
  const f = forwardCell(Object.assign({}, BASE, { fwdPct: null, fwdUnresolved: null, fwdDenominator: null }));
  ok(f.val === "—", "no percentage renders an em dash");
  ok(/Dated forward position not available/.test(f.note || ""), "with the reason, not a zero");
  ok(f.sub === null, "and no sub claiming a horizon it does not have");
}

console.log("\n== an absent unresolved count does not silently become a floor ==");
{
  //  If a caller does not pass fwdUnresolved at all, the panel must not invent
  //  a ≥ — it has no basis to. Exactness is the stated default.
  const f = forwardCell(Object.assign({}, BASE, { fwdPct: 45.5 }));
  ok(f.val === "45.5%", "an unstated unresolved count renders the plain number (got " + f.val + ")");
}

console.log("\n== " + pass + " passed, " + fail + " failed ==\n");
process.exit(fail ? 1 : 0);
