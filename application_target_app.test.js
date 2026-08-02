/* ══════════════════════════════════════════════════════════════════════════
   application_target_app.test.js — the application-target selector, app half.

   Slice 9 Commit D. The application segment is durably UNIT-GRAINED: an
   invitation carries unit_id and no space_id, so a space choice cannot be
   offered because the durable chain cannot preserve it.

   What the app must therefore do:
     · render eligible SOLE-SPACE units as ordinary selectable units
     · render multi-space units as present-but-unavailable, using the SERVER's
       reason code and sentence
     · send person_id and unit_id ONLY — never space_id
     · never store resolved_space_id as a selected identity
     · never render sibling-space buttons or pick the first space
     · never show prepared/sent after a 409 refusal

   Run: node application_target_app.test.js
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const followups = fs.readFileSync(path.join(__dirname, "followups-door.js"), "utf8");

let pass = 0, fail = 0;
const ok = (c, m, d) => {
  if (c) { pass++; console.log("   PASS  " + m); }
  else { fail++; console.log("   FAIL  " + m + (d ? "\n           " + d : "")); }
};

console.log("\n── THE READ TAKES TWO LISTS FROM THE SERVER ──────────────");
ok(/eligible_units/.test(html), "index.html reads eligible_units");
ok(/unsupported_multi_space_units/.test(html), "index.html reads unsupported_multi_space_units");
ok(!/r\.data\.units/.test(html) || !/leaseableUnits[\s\S]{0,200}?r\.data\.units/.test(html),
  "the old single flat `units` array is no longer what the selector consumes");
ok(/eligible_units/.test(followups) && /unsupported_multi_space_units/.test(followups),
  "followups-door reads both lists too");

console.log("\n── MULTI-SPACE UNITS ARE SHOWN, NOT DROPPED ──────────────");
ok(/lqdt-unitblocked/.test(html), "index.html renders an unselectable row type");
ok(/pslh-unit-blocked/.test(followups), "followups-door renders an unselectable row type");
ok(/Not available for application links yet/.test(html),
  "index.html heads the unsupported group honestly");
ok(/Not available for application links yet/.test(followups),
  "followups-door heads the unsupported group honestly");

console.log("\n── UNSELECTABLE MEANS UNSELECTABLE ───────────────────────");
// The blocked row must not carry the click affordance the eligible row does.
const blockedIdx = html.indexOf("lqdt-unitblocked\"");
const blockedRow = blockedIdx > 0 ? html.slice(blockedIdx, blockedIdx + 400) : "";
ok(blockedRow && !/data-uid=/.test(blockedRow),
  "the blocked row carries no data-uid, so the click handler cannot bind to it");
ok(blockedRow && !/<button/.test(blockedRow),
  "and it is not a button");
ok(/pslh-unit-blocked[\s\S]{0,300}/.test(followups) &&
   !/pslh-unit-blocked[^"]*"[^>]*data-act="pickunit"/.test(followups),
  "followups-door's blocked row carries no pickunit action");

// Assertions below test RENDERED CODE, not commentary. Stripping comments
// first matters: a comment explaining "this is not a prompt to pick a space"
// would otherwise fail an assertion looking for that phrase.
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const htmlCode = strip(html), followupsCode = strip(followups);

// The application selector, isolated. Space-grained rendering elsewhere in the
// app is CORRECT and must not be caught here — the executed-lease surface
// legitimately names "the exact space the lease names", because
// executed_lease_records and leases carry space_id. That is precisely where
// space lineage is supposed to begin. These assertions are about the
// APPLICATION selector, which sits upstream of it and is unit-grained.
function selectorBlock(src, marker) {
  const i = src.indexOf(marker);
  return i < 0 ? "" : src.slice(i, i + 2500);
}
const sel = selectorBlock(htmlCode, "function chooseUnit(");
const selF = selectorBlock(followupsCode, "pslh-unit-list");

console.log("\n── THE COPY DOES NOT BLAME THE OPERATOR ──────────────────");
// "select a space" would imply a step the operator simply skipped. It is not a
// step they can take — the durable chain cannot preserve the choice.
ok(sel.length > 0, "the application selector was located for scoped assertions");
ok(!/select a space|choose a space|pick a space/i.test(htmlCode),
  "no rendered copy tells the operator to select a space");
ok(!/select a space|choose a space|pick a space/i.test(followupsCode),
  "followups-door renders no such copy either");
ok(/not supported for this unit yet/i.test(htmlCode),
  "index.html uses the governed unsupported wording");

console.log("\n── NO SPACE IDENTITY EVER LEAVES THE BROWSER ─────────────");
ok(!/space_id\s*:/.test(htmlCode.split("prepareApplication")[1] || ""),
  "the prepare call sends no space_id");
ok(!/resolved_space_id/.test(htmlCode),
  "no rendered code reads resolved_space_id — it is a server receipt, not app state");
ok(!/resolved_space_id/.test(followupsCode),
  "followups-door never reads it either");
ok(sel.length > 0 && !/space_id/.test(sel),
  "the application selector never touches a space id at all");
ok(selF.length > 0 && !/space_id/.test(selF),
  "and neither does the followups selector");

console.log("\n── ONE ROW PER UNIT, KEYED BY UNIT ───────────────────────");
ok(/data-uid="'\+esc\(u\.unit_id\)/.test(html),
  "index.html keys the selectable row on unit_id");
ok(/data-unit="'\+esc\(u\.unit_id\|\|u\.id\)/.test(followups),
  "followups-door keys the selectable row on unit_id");
ok(sel.length > 0 && !/spaces\.map|u\.spaces|\.space_label/.test(sel),
  "the application selector never expands a unit into per-space rows");
ok(selF.length > 0 && !/spaces\.map|u\.spaces/.test(selF),
  "and neither does the followups selector");

console.log("\n── A 409 REFUSAL NEVER READS AS PREPARED ─────────────────");
const prepIdx = html.indexOf("sessionMod.prepareApplication");
const prepBlock = prepIdx > 0 ? html.slice(prepIdx, prepIdx + 1800) : "";
ok(/space_grain_not_supported/.test(prepBlock),
  "the grain refusal is recognised distinctly from an ordinary unavailability");
ok(/became_ambiguous/.test(prepBlock),
  "and so is a unit that became ambiguous after the link was sent");
ok(/chooseUnit\('Individual-space application links are not supported/.test(prepBlock),
  "a grain refusal opens the selector with the controlled reason");
ok(!/preparedSheet\([\s\S]{0,80}space_grain/.test(prepBlock),
  "the prepared sheet is never shown on a grain refusal");

console.log("\n── THE SHORTCUT DOES NOT RETRY THE SAME UNIT ─────────────");
// cc.unit_id refusal must open the selector, not re-prepare with the same id.
ok(/if\(cc\.unit_id\)\{[\s\S]{0,200}?prepareFor\(cc\.unit_id\)/.test(html),
  "the conversation shortcut still prepares directly when a unit is attached");
ok(!/chooseUnit\([^)]*\)[\s\S]{0,120}prepareFor\(cc\.unit_id\)/.test(prepBlock),
  "but a refusal does NOT fall back to preparing that same unit again");

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
process.exit(fail === 0 ? 0 : 1);
