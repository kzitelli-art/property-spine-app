// ════════════════════════════════════════════════════════════════════
//  maintenance_home_proof.test.js — THE MAINTENANCE HOME, AS SOURCE
//
//    node maintenance_home_proof.test.js
//
//  APP-ONLY. This harness reads index.html and asserts what the Maintenance
//  landing page is composed of. It touches no API, no migration and no
//  domain behaviour, and it makes no claim about how the page LOOKS —
//  alignment, balance and three-second legibility were judged in a real
//  browser at 1440px and 390px, and screenshots are the evidence for those.
//
//  What this file is for is the opposite risk: that the removed dashboard
//  quietly comes back, or that a failed request starts rendering as a
//  confirmed zero again.
// ════════════════════════════════════════════════════════════════════

"use strict";

const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

let passed = 0, failed = 0;
const fails = [];
const ok = (n, c, d) => { if (c) passed++; else { failed++; fails.push(n + (d ? "  — " + d : "")); } };
const section = (t) => console.log("\n── " + t + " " + "─".repeat(Math.max(0, 58 - t.length)));

//  The landing page renderer, isolated. Assertions about what the HOME
//  contains must not be satisfied by a sub-dashboard elsewhere in the file.
const HOME = SRC.slice(
  SRC.indexOf("function renderMaintenanceSurface(st) {"),
  SRC.indexOf("function showMaintenanceMain(){"));
//  Comments explain what the page does NOT do. They must not satisfy an
//  assertion that it does not do it.
const code = (s) => s.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .map((l) => l.replace(/\s\/\/.*$/, "")).join("\n");
const HOME_CODE = code(HOME);

// ════════════════════════════════════════════════════════════════════
section("1  THE DASHBOARD-WITHIN-A-DASHBOARD IS GONE");
{
  ok("renderMaintenanceSurface exists", HOME.length > 200);

  //  Removed from the LANDING PAGE. Several of these components still exist
  //  for the sub-dashboards that own them — the assertion is that the home
  //  no longer builds them.
  for (const [thing, needle] of [
    ["the Maintenance Condition KPI strip", "maintenanceConditionPanel"],
    ["the four-cell condition grid", "le-cond"],
    ["the statistics strips", "maintStatGrid"],
    ["individual stat tiles", "maintTinyStat"],
    ["the mini dashboards inside cards", "maintNextRows"],
    ["the old command-card builder", "maintCommandCard"],
    ["the focus strip", "maintFocusStrip"],
    ["the big card number", "maint-card-number"],
    ["the card kicker/overline", "maint-card-kicker"],
  ]) ok(`the home no longer builds ${thing}`, !HOME_CODE.includes(needle), needle);

  //  And the builders themselves are deleted, not merely unreferenced.
  for (const fn of ["maintenanceConditionPanel", "maintCommandCard", "maintNextRows",
                    "maintFocusStrip", "maintFocusItem",
                    "maintenanceSupplyCardRows", "maintenanceVendorCardRows"]) {
    ok(`${fn} is deleted from the file`, !SRC.includes("function " + fn), fn);
  }

  //  Tenant satisfaction is gone entirely — it had no live source and
  //  rendered a demo "4.6 / 5" that read as a measurement.
  ok("tenant-satisfaction reporting is deleted", !SRC.includes("maintenanceTenantSat"));
  ok("and its demo value is gone with it", !SRC.includes("4.6 / 5"));
  //  So are the three other averages that only existed to fill those strips.
  for (const fn of ["maintenanceAvgClose", "maintenanceAvgTurnTime", "maintenanceAvgDowntime"]) {
    ok(`${fn} is deleted`, !SRC.includes("function " + fn), fn);
  }

  //  Repeated generic actions.
  ok("no 'Open dashboard' action on the home", !/Open dashboard/i.test(HOME_CODE));
  ok("the legacy metrics strip is no longer filled",
     !/\$\('metrics'\)\.innerHTML=maintenanceSnapshotHtml/.test(SRC));
}

// ════════════════════════════════════════════════════════════════════
section("2  FOUR DOORS, AND ONLY FOUR");
{
  const doors = HOME_CODE.match(/mhDoor\('([a-z_]+)'/g) || [];
  ok("exactly four doors are built", doors.length === 4, doors.join(","));
  ok("and they are work orders, turns, materials, vendors",
     doors.join(",") === "mhDoor('workorders',mhDoor('turns',mhDoor('materials',mhDoor('vendors'",
     doors.join(","));

  //  Every destination is an EXISTING key on the existing router. The home
  //  routes; it does not define a new surface.
  const ROUTER = SRC.slice(SRC.indexOf("function openMaintenanceModule(key){"),
                           SRC.indexOf("function openMaintenanceModule(key){") + 2600);
  for (const k of ["workorders", "turns", "materials", "vendors"]) {
    ok(`'${k}' is a route the existing router already answers`,
       new RegExp("key==='" + k + "'").test(ROUTER), k);
  }
  ok("turns opens the release-candidate Turn list",
     /key==='turns'\) return renderMaintenanceTurnPage/.test(ROUTER));
  ok("the legacy turnover dashboard stays behind its own key",
     /key==='turns_legacy'/.test(ROUTER));
  ok("and is not reachable from the home",
     !/turns_legacy/.test(HOME_CODE) && !/'down'/.test(HOME_CODE));

  //  ONE card component, four times. Not four layouts.
  const shells = SRC.match(/maint-command-card mg-door mh-door/g) || [];
  ok("the card class string appears exactly once in the file", shells.length === 1, String(shells.length));
  ok("the card is the Management door component",
     /class="maint-command-card mg-door mh-door"/.test(SRC));

  //  Four parts per card, and no fifth.
  const D = SRC.slice(SRC.indexOf("function mhDoor("), SRC.indexOf("function mhAttnRow("));
  ok("the card carries a title", /<h3>/.test(D));
  ok("a one-sentence purpose", /<p>/.test(D));
  ok("one condition line", /conditionHtml/.test(D));
  ok("and one action", /maint-card-open/.test(D));
  ok("the card has no statistics grid", !/maint-stat-grid|maint-tiny/.test(D));
  ok("no row list inside the card", !/maint-next|mg-prows/.test(D));
  ok("and no big number", !/maint-card-number/.test(D));
}

// ════════════════════════════════════════════════════════════════════
section("3  PLAIN ACTION LANGUAGE");
{
  for (const a of ["Open work orders", "Open turns", "Open materials", "Open vendors"]) {
    ok(`the action says "${a}"`, HOME.includes("'" + a + "'"), a);
  }
  //  Words that name the machine rather than the destination.
  const copy = (HOME.match(/'[^']{4,90}'/g) || []).join("\n");
  for (const w of ["surface", "condition panel", "dashboard", "renderMaintenance"]) {
    ok(`no operator copy says "${w}"`, !new RegExp("'[^']*\\b" + w + "\\b[^']*'", "i").test(copy), w);
  }
  ok("no raw enum reaches the copy", !/'[a-z]+_[a-z]+'\s*\+/.test(copy));
  ok("the purposes are sentences, not labels",
     ["Resident-reported repairs and service requests.",
      "Vacant units moving toward physical readiness.",
      "Parts required to finish active work.",
      "Outside work, commitments and vendor follow-up."].every((s) => HOME.includes(s)));
}

// ════════════════════════════════════════════════════════════════════
section("4  ONE ATTENTION SECTION, CAPPED AT THREE, MADE OF ROWS");
{
  const A = SRC.slice(SRC.indexOf("function mhAttentionPanel("), SRC.indexOf("function renderMaintenanceSurface(st) {"));
  ok("the section exists", A.length > 200);
  ok("it is titled What needs attention", /What needs attention/.test(A));
  ok("it is capped at three", /\.slice\(0, 3\)/.test(A), "slice(0,3)");
  ok("the rows are prioritised before slicing", A.indexOf(".sort(") < A.indexOf(".slice(0, 3)"));
  ok("it is built from rows, not cards",
     /maint-panel/.test(A) && !/maint-command-card|maint-tiny|maint-focus/.test(A));
  ok("every row opens a destination",
     (A.match(/mhAttnRow\(/g) || []).length === (A.match(/openMaintenanceModule/g) || []).length ||
     /openMaintenanceModule/.test(SRC.slice(SRC.indexOf("function mhAttnRow("), SRC.indexOf("function mhAttentionPanel("))));
  ok("empty says nothing urgent needs attention", /Nothing urgent needs attention\./.test(A));
  ok("and that is NOT the same sentence as an unavailable read",
     /Attention cannot be listed/.test(A));
  ok("a loading attention list says it is still checking", /Checking what needs attention/.test(A));

  //  A row only appears when its own source actually succeeded — an emergency
  //  count from a failed read is not an emergency count.
  ok("emergencies are only listed when the work read succeeded", /S\.work === 'ok' && m\.emergency\.length/.test(A));
  ok("blocked turns only when the turn read succeeded", /S\.turns === 'ok' && m\.atRisk\.length/.test(A));
  ok("materials only when the supply read succeeded", /S\.supplies === 'ok' && m\.materialsLinked/.test(A));
  ok("vendor decisions only when their derived sources succeeded", /_mhWorst\(\) === 'ok' && vp\.needsDecision/.test(A));
}

// ════════════════════════════════════════════════════════════════════
section("5  FOUR STATES, FOUR SENTENCES — a failure is never a zero");
{
  const C = SRC.slice(SRC.indexOf("function mhCondition("), SRC.indexOf("function mhDoor("));
  ok("loading is its own branch", /status === 'loading'/.test(C));
  ok("failure is its own branch", /status === 'failed'/.test(C));
  ok("a real zero is its own branch", /o\.zero/.test(C));
  ok("and a real count is the fallthrough", /return '<div class="mh-cond">'/.test(C));
  ok("each branch carries a distinct class",
     ["is-loading", "is-unavailable", "is-zero"].every((c) => C.includes(c)));

  //  The sentences themselves must differ — the whole point is that an
  //  operator can tell "we have none" from "we could not ask".
  const ZEROS = ["No open work orders.", "No open turns.", "No material orders open.",
                 "No vendor or compliance items open."];
  const UNAVAIL = ["Work-order status unavailable.", "Turn status unavailable.",
                   "Material status unavailable.", "Vendor status unavailable."];
  for (const z of ZEROS) ok(`real zero: "${z}"`, HOME.includes(z), z);
  for (const u of UNAVAIL) ok(`unavailable: "${u}"`, HOME.includes(u), u);
  ok("no zero sentence is also an unavailable sentence",
     ZEROS.every((z) => !UNAVAIL.includes(z)));
  ok("the required wording is exact", HOME.includes("No open turns.") && HOME.includes("Turn status unavailable."));

  //  The status has to come from the request, not from the count.
  ok("a source ledger exists", /var maintHomeSources = \{ work: 'loading', turns: 'loading', supplies: 'loading' \}/.test(SRC));
  ok("it is written by the loaders, not by the renderer",
     /function _mhMark\(key, err\)/.test(SRC));
  for (const [name, path] of [["work", "maintenance-dashboard"], ["turns", "turnovers"], ["supplies", "supply-requests"]]) {
    ok(`the ${path} read reports its outcome`,
       new RegExp("e=>_mhMark\\('" + name + "',e\\)").test(SRC), name);
  }
  ok("tryJSON can report a failure instead of swallowing it",
     /async function tryJSON\(path, fallback, opts=\{\}, report\)\{try\{const r=await getJSON\(path,opts\); if\(report\) report\(null\); return r\}catch\(e\)\{ if\(report\) report\(e\); return fallback\}\}/.test(SRC));
  ok("and its signature stays backwards compatible — report is optional",
     /if\(report\) report\(e\)/.test(SRC));
  ok("Vendors & Projects is derived, so it inherits the worst source",
     /function _mhWorst\(\)/.test(SRC) && /_mhWorst\(\), \{/.test(HOME));

  //  NO FIXTURES AFTER A FAILURE.
  ok("the home never substitutes sample data", !/__demo|fixture|sample/i.test(HOME_CODE));
  ok("loading is painted before the reads, so it is a real state",
     /maintHomeSources=\{work:'loading',turns:'loading',supplies:'loading'\};[\s\S]{0,400}?renderMaintenanceSurface\(lastMaintenance\|\|\{\}\)/.test(SRC));
}

// ════════════════════════════════════════════════════════════════════
section("6  THE MANAGEMENT COMPONENTS, REUSED — no new visual system");
{
  //  Every class the home uses must already exist in the stylesheet, and the
  //  card/panel/row classes must be the ones Management uses.
  const REUSED = ["maint-ops-shell", "maint-command-card", "mg-door", "maint-card-top",
                  "maint-card-open", "maint-primary-grid", "mg-doors",
                  "maint-panel", "maint-panel-head", "maint-row", "maint-empty-state"];
  for (const c of REUSED) {
    ok(`reuses the existing .${c}`, HOME.includes(c) || SRC.includes("." + c),
       c);
  }
  ok("the card component is the one Management builds its doors from",
     /maint-command-card mg-door/.test(SRC.slice(SRC.indexOf("const rentRollCard"), SRC.indexOf("const rentRollCard") + 400)));
  ok("the panel component is the one the sub-dashboards use",
     /class="maint-panel"/.test(SRC));

  //  New classes are allowed only as layout/state modifiers, and there must
  //  be few of them. A "design system" is exactly what this pass must not add.
  const NEW = ["mh-home", "mh-doors", "mh-door", "mh-cond", "mh-attn", "mh-attn-row"];
  for (const c of NEW) ok(`.${c} is defined in the stylesheet`, SRC.includes("." + c), c);
  ok("no new colour variable was introduced",
     !/--mh-[a-z-]+\s*:/.test(SRC));
  ok("no new radius or shadow scale", !/\.mh-[a-z-]*\{[^}]*border-radius/.test(SRC));
  ok("the condition line borrows the existing hairline treatment",
     /\.mh-cond\{border-top:1px solid #eee/.test(SRC));

  //  The alignment fix.
  ok("the page title joins the same 1080px column as the cards",
     /body\.maintenance-v6-mode \.hero-head\{width:min\(100%,1080px\);margin-inline:auto\}/.test(SRC));
  ok("which is the width the shared shell rule already sets",
     /#intelStrip \.maint-ops-shell\{width:min\(100%,1080px\);margin-inline:auto\}/
       .test(fs.readFileSync(path.join(__dirname, "leasing-experience.js"), "utf8")));
  ok("no card is stretched to fill the leftover width",
     !/\.mh-door\{[^}]*width:100%/.test(SRC));
}

// ════════════════════════════════════════════════════════════════════
section("7  THE PHONE GETS THE SAME PAGE, STACKED");
{
  const MQ = (SRC.match(/@media\(max-width:820px\)\{[\s\S]{0,600}?\n\}/) || [""])[0];
  ok("a mobile rule exists for the doors", /mh-doors\{grid-template-columns:1fr\}/.test(MQ), MQ.slice(0, 80));
  ok("nothing is hidden on a phone", !/display:none/.test(MQ));
  ok("no separate mobile markup is produced", !/innerWidth|matchMedia|isMobile/.test(HOME_CODE));
  ok("attention rows stay rows", /mh-attn-row/.test(MQ));
  //  Turnovers must reach the SAME list on a phone — there is no second route.
  ok("Turnovers opens the same route at every width",
     (HOME.match(/mhDoor\('turns'/g) || []).length === 1);
}

// ════════════════════════════════════════════════════════════════════
section("8  NOTHING OUTSIDE THE LANDING PAGE MOVED");
{
  //  The scope boundary, asserted rather than promised.
  ok("Work Orders internals are untouched", SRC.includes("function renderMaintenanceWorkOrdersDashboard(st){"));
  ok("Materials internals are untouched", SRC.includes("function renderMaintenanceSuppliesDashboard(st){"));
  ok("vendor/project internals are untouched", SRC.includes("function renderMaintenanceVendorsDashboard(st){"));
  ok("compliance internals are untouched", SRC.includes("function renderMaintenanceComplianceDashboard(st){"));
  ok("the legacy turnover dashboard survives as a diagnostic",
     SRC.includes("function renderMaintenanceTurnoverDashboard(st){"));
  ok("the release-candidate Turn page is unchanged",
     SRC.includes("function renderMaintenanceTurnPage(st){") &&
     SRC.includes("window.__psUnitTurn.boot()"));
  ok("and it still refuses to invent a turn",
     SRC.includes("HONEST UNAVAILABLE. Never a fixture, never a sample turn."));

  //  Management and Leasing must not have been edited to make Maintenance fit.
  ok("Management still builds its own doors", SRC.includes("const rentRollCard"));
  ok("Management still shows its condition panel", SRC.includes("managementConditionPanel("));
  ok("Leasing still builds its own home", SRC.includes("<section class=\"maint-primary-grid le-doors"));

  //  The unit-turn app file is frozen product.
  const UT = fs.readFileSync(path.join(__dirname, "unit-turn-page.js"), "utf8");
  ok("the unit-turn page still asks for one completion photo",
     /Add one completion photo to close this work\./.test(UT));
  ok("and still sends one file on the completion request", /photo: file/.test(UT));
}

// ════════════════════════════════════════════════════════════════════
console.log("\n── RESULT " + "─".repeat(50));
console.log("  assertions passed: " + passed);
console.log("  assertions failed: " + failed);
if (fails.length) { console.log("\n  FAILURES:"); fails.forEach((f) => console.log("   ✗ " + f)); }
console.log("\n  APP-ONLY. No API, no migration, no domain behaviour is exercised here.");
console.log("  Layout, balance and legibility are NOT provable from source and were");
console.log("  judged in a real browser at 1440px and 390px. The screenshots are the");
console.log("  evidence for those; this file only stops the removed dashboard, the");
console.log("  generic actions and the failure-reads-as-zero defect from returning.");
process.exit(failed > 0 ? 1 : 0);
