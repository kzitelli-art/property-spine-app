#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   H · IS THERE STILL A SECOND MAINTENANCE PRODUCT?

   ── WHAT THIS FILE USED TO ASK ──────────────────────────────────────
   "Which surface actually owns the closeout drawer?" Boundary 6 removed
   the operator's Mark-complete control and the receipt was going to be a
   browser check — until the operator could not find the drawer at all.
   The owner ruling was: trace it from the code, do not manufacture a
   navigation path to satisfy a receipt.

   The answer it computed was STRANDED LEGACY, and that answer was too
   kind. The drawer was not stranded. It was REACHABLE and SUPPRESSED:

     · renderMaintenance() put real kind:'work_order' rows into the
       desk's shared lanes;
     · a lane row's onclick called renderDetail();
     · renderDetail() routed kind==='work_order' to workOrderPanel();
     · and `body.maintenance-v6-mode .lanes{display:none}` was the whole
       of the separation between an operator and a second, complete way
       to run maintenance — with its own detail grammar, its own closeout
       controls and its own not-done picker reading a hardcoded fallback.

   The renderers behind openMaintenanceModule's work_inprogress /
   work_done / proof / work_closed keys were unreachable for an even
   thinner reason: the only code emitting those keys sat inside the dead
   dashboard. Reachability by accident, not by design.

   ── WHAT IT ASKS NOW ────────────────────────────────────────────────
   H deleted all of it. So the question is no longer "can it be reached"
   but "does it exist" — because unreachable was never the goal:

     A  every retired renderer, drawer and fixture rail is ABSENT
     B  nothing mints a work-order row into a generic detail route
     C  the live door IS reachable from a static entry point
     D  no CSS rule is load-bearing for any of it

   D is the one that matters most. A guard that only proved "hidden"
   would pass on the exact architecture H exists to remove.

       node closeout_surface_reachability.test.js
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const path = require("path");

const INDEX = path.join(__dirname, "index.html");
const raw = fs.readFileSync(INDEX, "utf8");

//  COMMENTS STRIPPED FIRST. This file is now largely an absence proof, and
//  the H commit deliberately left tombstones naming every deleted function.
//  Scanning unstripped source would read those tombstones as the code they
//  describe and report a second product that is not there — the same
//  "a mention is not a guard" failure the API's writer gate warns about.
const src = raw
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

let pass = 0, fail = 0;
const EXPECTED = 24;
const ok = (l, c, d) => {
  if (c) { pass++; console.log("  ok    " + l); }
  else { fail++; console.log("  FAIL  " + l + (d ? "\n        " + d : "")); }
  return c;
};
const section = (t) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 54 - t.length))}`);

console.log("\n" + "═".repeat(68));
console.log("  H — ONE MAINTENANCE PRODUCT, PROVEN BY ABSENCE");
console.log("═".repeat(68));
console.log("  ASSERTIONS STARTED  (expecting " + EXPECTED + ")");

ok("S1  stripping comments did not empty the file",
   src.length > raw.length * 0.5,
   `stripped to ${src.length} of ${raw.length} — the scan below would be vacuous`);

// ── A · THE RETIRED PRODUCT IS ABSENT ───────────────────────────────
section("A · absent, not hidden");

const RETIRED = [
  //  the drawer and its controls
  "workOrderPanel", "woOrderPanel", "closeoutNotDone", "toggleNotDone",
  "loadNotDoneReasons", "loadWorkOrderCategory", "woRespond", "refreshWorkOrders",
  //  the dashboard cluster
  "renderMaintenanceWorkOrdersDashboard", "renderMaintenanceWorkOrdersDashboard_severity",
  "renderMaintenanceWorkInProgress", "renderMaintenanceWorkDone",
  "woListRow", "woGroup", "woChip", "woIsClosed", "woSeverityRank", "woAlertHtml",
  "wqElapsed", "wqRowMeta", "wqAttentionRow", "wqCollapsedSection", "wqExpandPlan",
  "showWorkOrdersDone", "hideWorkOrdersDone", "maintenanceTopRows",
  //  the legacy emergency / severity model
  "woIsTrueEmergency", "woSeverity", "woCallCount", "woHoursOpen",
  "woWhereLine", "woEscalationChain", "woCallThread", "woOrderKey",
  //  the fixture rail
  "woFlowForProp", "WO_FLOW_SOLO", "WO_FLOW_SKYLINE",
];
const surviving = RETIRED.filter((n) => new RegExp("\\b" + n + "\\b").test(src));
ok(`A1  all ${RETIRED.length} retired symbols are gone from index.html`,
   surviving.length === 0, "still present: " + surviving.join(", "));

ok("A2  no function DEFINITION for any of them survives",
   !RETIRED.some((n) => new RegExp("function\\s+" + n + "\\s*\\(").test(src)));

ok("A3  the fixture library is not read anywhere in the page",
   !/__WO_FLOW_LIBRARY/.test(src),
   "a sample-work-order library is still wired into the signed-in runtime");

ok("A4  the two dead API callers are gone, and no route was invented to " +
   "keep them alive",
   !/work-orders\/\$\{[^}]*\}\/respond/.test(src)
   && !/maintenance\/preview-category/.test(src),
   "the page still calls an endpoint the API does not define");

//  ── THE DISTINCTION H HAD TO DRAW ─────────────────────────────────
//  Two fixture libraries exist. __WO_FLOW_LIBRARY was read by WO_FLOW_SOLO /
//  WO_FLOW_SKYLINE inside the MAINTENANCE dashboard path — a fixture rail
//  underneath a signed-in operator surface. It is gone.
//
//  __WO_LIBRARY feeds DEMO_DB in the offline preview snapshot, which is the
//  preview product's own data. Deleting it would remove a working surface,
//  not a hidden one. So it stays, and what is proven instead is the thing
//  that actually matters: the live door cannot see either of them.
//  "Demo data may exist. Demo paths may not."
ok("A6  the LIVE DOOR reaches no fixture library of any kind",
   !/__WO_LIBRARY|__WO_FLOW_LIBRARY|DEMO_DB/.test(
     require("fs").readFileSync(path.join(__dirname, "work-lifecycle-door.js"), "utf8")),
   "the canonical work-order surface can see demo data");

ok("A7  …and reaches no offline rail either",
   !/getJSON|__OFFLINE_MODE|__offlineRead/.test(
     require("fs").readFileSync(path.join(__dirname, "work-lifecycle-door.js"), "utf8")
       .replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")),
   "the door can be answered by the baked snapshot instead of the API");

ok("A5  no closeout panel copy survives",
   !/Not 100% done/.test(src) && !/Close it out/.test(src));

// ── B · NOTHING FEEDS A GENERIC DETAIL ROUTE ────────────────────────
section("B · no work-order row escapes the door");

ok("B1  renderDetail no longer routes work orders anywhere",
   !/kind\s*===\s*['"]work_order['"]/.test(src),
   "a generic detail route still special-cases work orders");

const producers = (src.match(/kind\s*:\s*['"]work_order['"]/g) || []).length;
ok("B2  nothing in the page mints a kind:'work_order' detail row",
   producers === 0,
   producers + " producer(s) remain — these were the drawer's fuel");

ok("B3  the desk's lanes are fed obligations, turns and supplies — never " +
   "work orders",
   /const urgentRows=uniqueRows\(\[\.\.\.obligationRows/.test(src)
   && /const planRows=uniqueRows\(\[\.\.\.downRows, \.\.\.turnRows\]\)/.test(src),
   "a lane still receives work-order rows");

ok("B4  the module router sends every work_* key to the live door",
   /if\(key===['"]workorders['"] \|\| key\.indexOf\(['"]work_['"]\)===0/.test(src),
   "a work_* key still dispatches to something other than the canonical door");

ok("B5  …and no legacy renderer is named in the router at all",
   !/renderMaintenanceWork(InProgress|Done|OrdersDashboard)/.test(src));

// ── C · THE LIVE DOOR IS STILL THE WAY IN ───────────────────────────
//  An absence proof passes on a deleted file. These make the result mean
//  "one product" rather than "no product".
section("C · the surviving path");

ok("C1  openWorkOrdersDoor still exists",
   /function openWorkOrdersDoor\(\)/.test(src));
ok("C2  …and it opens the canonical door module",
   /__psWorkOrders\s*\.\s*open\(\)|__psWorkOrders\.open\(\)/.test(src),
   "the door route no longer boots work-lifecycle-door.js");
const primaryWorkCard = (src.match(/function mhPrimaryWorkCard\([\s\S]*?\n\}/) || [""])[0];
ok("C3  the primary Work Orders surface still reaches the router",
   /class=["']mh-primary["']/.test(primaryWorkCard)
   && /openMaintenanceModule\(\\?['"]workorders\\?['"]\)/.test(primaryWorkCard),
   "nothing on the desk navigates to work orders any more");
ok("C4  the live door module is still loaded by the page",
   /<script[^>]+src\s*=\s*["'][^"']*work-lifecycle-door\.js["']/.test(raw));
//  MATCH THE SCRIPT TAG, NOT THE FILENAME. The first cut compared
//  raw.indexOf() on the bare names and found a PROSE MENTION thousands of
//  lines above the real tags — the same error class this repo has recorded
//  before. The load order is governed by <script src>, so that is what is
//  read.
const tagAt = (f) => raw.search(new RegExp('<script[^>]+src\\s*=\\s*["\'][^"\']*' + f + '"'));
ok("C5  the proof normalizer is still loaded BEFORE it",
   tagAt("proof-normalizer\\.js") > -1
   && tagAt("proof-normalizer\\.js") < tagAt("work-lifecycle-door\\.js"),
   `normalizer tag at ${tagAt("proof-normalizer\\.js")}, door at ${tagAt("work-lifecycle-door\\.js")}`);

// ── D · NO CSS IS LOAD-BEARING ──────────────────────────────────────
//  The rule that used to hold the second product shut is still in the
//  file, and that is correct: `.lanes` is the shared legacy shell and
//  THREE v6 desks turn it off the same way. What changed is that it no
//  longer conceals anything — the lanes carry no work orders and there is
//  no drawer to open. This section proves the difference.
section("D · deleting every stylesheet would change nothing");

ok("D1  the lanes rule is shared v6-desk convention, not a maintenance " +
   "concealment",
   /body\.leasing-v6-mode \.lanes\{display:none/.test(raw)
   && /body\.management-doors-mode \.lanes\{display:none/.test(raw)
   && /body\.maintenance-v6-mode \.lanes\{display:none/.test(raw),
   "maintenance hides the lanes by a mechanism no other desk uses — which " +
   "is what a concealment looks like");

ok("D2  with every CSS rule removed, no work-order row exists to reveal",
   producers === 0 && !/kind\s*===\s*['"]work_order['"]/.test(src),
   "CSS is still the only thing between an operator and a second product");

ok("D3  the door's own styles are scoped to .wo-body, so deleting legacy " +
   "CSS cannot restyle it",
   !/\n\.wo-row\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/.test(raw)
   || /\.wo-body \.wo-row\{display:grid/.test(raw),
   "the live door depends on an unscoped rule and a legacy deletion could " +
   "silently restyle it");

ok("D4  no display:none rule names a work-order surface",
   !/\.wo-[a-z-]*\{[^}]*display\s*:\s*none[^}]*\}/.test(raw.replace(/\s+/g, " ")),
   "part of the live surface is hidden rather than absent");

// ── E · AND THE EMERGENCY FACT SURVIVED THE DELETION ────────────────
section("E · what was preserved");

const door = fs.readFileSync(path.join(__dirname, "work-lifecycle-door.js"), "utf8")
  .replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
ok("E1  the live door renders the true-emergency fact",
   /EMERGENCY/.test(door) && /is_emergency/.test(door),
   "the only visible expression of canonical urgency was deleted with the " +
   "legacy emergency lane");
ok("E2  …as typography, with no colour of its own",
   !/wo-em[^{]*\{[^}]*color\s*:\s*var\(--red\)/.test(raw),
   "EMERGENCY came back as a red badge");

console.log("\n" + "═".repeat(68));
const ran = pass + fail;
if (ran !== EXPECTED) {
  console.log(`  ✗ RUN INVALID — ${ran} assertions ran, ${EXPECTED} expected`);
  console.log("═".repeat(68) + "\n");
  process.exit(1);
}
console.log(`  ${fail === 0 ? "✓ PASS" : "✗ FAIL"} — ${pass} passed, ${fail} failed`);
if (fail === 0) {
  console.log("  Unreachable was never the goal. Absent is.");
}
console.log("═".repeat(68) + "\n");
process.exit(fail === 0 ? 0 : 1);
