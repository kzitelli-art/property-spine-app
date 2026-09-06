/* ══════════════════════════════════════════════════════════════════════════
   availability_cutover_app.test.js — Availability surface, emitted output.

   The rule under test is the one the previous surface broke:
        vacant  ≠  ready  ≠  marketable
   It rendered every vacant unit as "Available" with an asking rent taken from
   the imported spreadsheet. Both are gone.

   Run: node availability_cutover_app.test.js
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
  extract("psRrDate") + "\n" + extract("psAvReadiness") + "\n" + extract("psAvRow") + "\nthis.psAvRow=psAvRow;").call(box, esc);

const base = {
  space_id: "s1", unit_number: "402", space_label: null, unit_type: "2 Bed / 2 Bath",
  marketing_state: "marketable_now", blocking_reason: null, blocking_label: "Marketable now",
  available_from: "2026-07-27", availability_confidence: "confirmed", blocking_fact: null,
  physical_readiness: "ready", turnover_in_progress: false, resident: null, lease_id: null,
};

console.log("\n== rows ==");
const row = box.psAvRow(base);
ok(/Unit 402/.test(row), "position renders");
ok(/2 Bed \/ 2 Bath/.test(row), "governed unit type renders");
ok(/Jul 27, 2026/.test(row), "a confirmed date renders as a date");
ok(!/expected/.test(row), "a confirmed date is not hedged");
const upcoming = box.psAvRow({ ...base, marketing_state: "upcoming", availability_confidence: "incomplete",
  blocking_fact: "no_governed_turnover_duration", blocking_label: "On notice" });
ok(/expected/.test(upcoming) && /no governed turnover duration/.test(upcoming),
  "an incomplete date is labelled expected and names the missing fact");
ok(!/\$/.test(row), "NO asking rent - pricing does not belong to Availability");
ok(!/Available<\/span>/.test(row), "a position is never flatly labelled 'Available'");

console.log("\n== blocking reasons ==");
ok(!/Marketable now/.test(row), "a marketable row carries no status noise");
const blocked = box.psAvRow({ ...base, marketing_state: "evidence_disagrees",
  blocking_label: "Occupancy evidence disagrees — confirm whether this is occupied",
  available_from: null, availability_confidence: "incomplete" });
ok(/Occupancy evidence disagrees/.test(blocked), "a blocked row states its single reason");
ok(/—/.test(blocked), "a blocked row shows no availability date");
const turning = box.psAvRow({ ...base, turnover_in_progress: true, physical_readiness: "turning",
  marketing_state: "turnover_required", blocking_label: "Turnover in progress" });
ok(/Turn in progress/.test(turning), "turnover state is visible to leasing");

console.log("\n== readiness says what its owners say ==");
const noWalk = box.psAvRow({ ...base, physical_readiness: "unknown", readiness_basis: "none", certified_ready: false });
ok(/Readiness unknown/.test(noWalk) && !/>Ready</.test(noWalk), "a unit nobody walked never reads Ready");
const certified = box.psAvRow({ ...base, physical_readiness: "ready", readiness_basis: "certification", certified_ready: true });
ok(/Ready · certified/.test(certified), "a certified unit says so");
const notReady = box.psAvRow({ ...base, physical_readiness: "not_ready", readiness_basis: "initial_triage", marketing_state: "not_ready_confirmed", blocking_label: "Not ready — confirmed physical blockers", available_from: null });
ok(/Not ready/.test(notReady) && !/>Ready</.test(notReady), "a confirmed not-ready unit never reads Ready");
ok(/Turn in progress/.test(box.psAvRow({ ...base, turnover_in_progress: true, physical_readiness: "turning" })), "a turn in progress is named");

console.log("\n== an unknown is visible, dated by nothing, and explained ==");
const unknown = box.psAvRow({ ...base, marketing_state: "occupancy_unknown", blocking_reason: "no_established_occupancy_basis",
  blocking_label: "Occupancy not established — confirm whether this position is empty before it is marketed",
  available_from: null, availability_confidence: "incomplete", blocking_fact: "occupancy_basis_not_established" });
ok(/Unit 402/.test(unknown), "an unknown position keeps its identity on the page");
ok(/Occupancy not established/.test(unknown), "an unknown position states the server's reason");
ok(/—/.test(unknown) && !/expected/.test(unknown) && !/2026/.test(unknown), "an unknown position carries no date and no hedge");
ok(!/openPersonCard/.test(unknown), "an unknown position does not pretend to have a resident");
const unreconciled = box.psAvRow({ ...base, marketing_state: "evidence_unreconciled",
  blocking_label: "Opening evidence unresolved — reconcile the source rows for this position", available_from: null });
ok(/Opening evidence unresolved/.test(unreconciled) && /—/.test(unreconciled), "unresolved evidence is stated, not dated");

console.log("\n== Person Card continuation, only where there is a person ==");
ok(!/openPersonCard/.test(row), "a vacant position does not pretend to have a resident");
const occupied = box.psAvRow({ ...base, marketing_state: "occupied", resident: { person_id: "p1", name: "Dana" },
  lease_id: "L1", blocking_label: "Occupied", available_from: null });
ok(/openPersonCard\(/.test(occupied) && /"source":"availability"/.test(occupied),
  "an occupied position continues into the Person Card");

console.log("\n== surface wiring ==");
ok(/availabilityCanonical:\s*\{/.test(html) && /\/operator\/leasing\/availability-canonical/.test(html),
  "availabilityCanonical registered on the live loader");
const tab = html.slice(html.indexOf("if(tab==='availability')"), html.indexOf("if(tab==='analytics')"));
ok(/hasSession\(\)\) return psLiveAvailability\(\)/.test(tab), "signed-in tab routes to the canonical read");
ok(/leasingAvailabilityBody\(\)/.test(tab), "the signed-out demo body is still reachable, untouched");
const fn = extract("psLiveAvailability");
ok(/loadResource\('availabilityCanonical'/.test(fn), "reads the canonical resource");
ok(!/availableUnitsFor|rentRollStats/.test(fn), "no client-side inventory derivation");
// NB: `$('intelStrip')` is the app's DOM helper, not a currency symbol — match
// a dollar STRING LITERAL and pricing vocabulary instead.
const fnCode = fn.replace(/\/\/.*/g, "");
ok(!/'\$'|"\$"|asking|market_rent|toLocaleString/.test(fnCode),
  "no pricing anywhere in the renderer - no currency literal, no asking rent, no market_rent");
ok(!/reduce\(/.test(fn), "the renderer computes no totals");

console.log("\n== groups and shared conditions ==");
const groupSource = html.slice(html.indexOf("var PS_AV_GROUPS"), html.indexOf("function psAvRow"));
const groups = new Function(groupSource + "\nreturn PS_AV_GROUPS;")();
["Marketable now", "Coming available", "Committed to a future resident", "Blocked", "Contested or unresolved"]
  .forEach(t => ok(groupSource.includes(t), "group present: " + t));
const groupFor = (state) => groups.find((group) => group.match({ marketing_state: state }));
ok(groupFor("occupancy_unknown").key === "unresolved"
  && groupFor("evidence_unreconciled").key === "unresolved",
  "occupancy uncertainty stays visible in the unresolved group");
ok(groupFor("successor_pending").key === "committed",
  "future commitments remain in the committed group");
ok(/marketable_now/.test(groupSource) && /activation_pending/.test(groupSource),
  "activation-pending positions are grouped as committed, never as inventory");
// THE COMPLETE DISPLAYED POPULATION. Every marketing state the server can
// emit (src/surfaces/availability_read.js `states`) except `occupied` must
// land in exactly one group — a state that matches none is a row the page
// silently drops, which is how not_ready_confirmed and readiness_unknown
// went unseen. Keep this list in step with the server's `states` map.
const SERVER_STATES = ["marketable_now","upcoming","occupied","successor_locked","successor_pending",
  "turnover_required","not_ready_confirmed","readiness_unknown","activation_pending","not_ready","down",
  "evidence_disagrees","contested","occupancy_unknown","evidence_unreconciled","use_not_configured","not_marketable_use"];
SERVER_STATES.filter(s => s !== "occupied").forEach(s => {
  const n = groups.filter(g => g.match({ marketing_state: s })).length;
  ok(n === 1, "server state lands in exactly one group: " + s + (n === 1 ? "" : " (" + n + ")"));
});
ok(groups.every(g => !g.match({ marketing_state: "occupied" })), "occupied positions are the Rent Roll's, not an availability group");
ok(groupFor("not_ready_confirmed").key === "blocked" && groupFor("readiness_unknown").key === "blocked",
  "triage readiness states are blocked, not dropped");
ok(/appear vacant but cannot be marketed because occupancy evidence disagrees/.test(fn),
  "the shared evidence condition is stated once, in plain language");
ok(/overlapping lease claims/.test(fn), "the shared contested condition is stated once");
ok(/commenced but is awaiting move-in funds/.test(fn), "activation-pending is explained once");
ok(/no established occupancy basis/.test(fn), "the shared unknown-occupancy condition is stated once, in plain language");
ok(/could not reconcile/.test(fn), "the shared unreconciled-evidence condition is stated once");
const mk = extract("psMkAvailability");
ok(/no established occupancy basis/.test(mk) && /could not reconcile/.test(mk),
  "the Market & Pricing tab states the same two conditions from the same headline");

console.log("\n== honest states ==");
ok(/No rentable positions are configured/.test(fn), "honest EMPTY state");
ok(/Availability is unavailable/.test(fn), "honest UNAVAILABLE state");
ok(/No sample inventory is shown/.test(fn), "an unavailable read explicitly refuses to show sample inventory");
ok(/Retry/.test(fn), "unavailable offers retry");
ok(!/tourable inventory/.test(fn), "the 'vacant units are tourable inventory' claim is gone from the live path");

console.log("\n== the signed-in door exists ==");
// S3 ruling moved the ENTRANCE, not the destination: Availability left the
// door grid and now anchors the full-width Market & Pricing strip. S7 then
// built the six-section workspace behind that strip, with Availability as
// its default tab (superseding S3's straight-to-destination delegation,
// which only existed because S7 hadn't been built yet). These pin the
// invariant that actually matters — a signed-in operator can still REACH the
// canonical availability read in one click, through whichever door exists.
ok(!/_authCard\('What can be leased', 'Availability'/.test(html),
  "the old Availability grid card is gone (moved into Market & Pricing by ruling)");
ok(/id="leMarketDoor"[\s\S]{0,120}openLeasingDash\(\\'market\\'\)/.test(html),
  "the Market & Pricing strip is the new signed-in entrance");
ok(/if\(_authed && key==='market'\)\{[\s\S]{0,500}?_psMkTab='availability'[\s\S]{0,100}?return psLiveMarketPricing\(\);/.test(html),
  "Market & Pricing opens the S7 workspace, defaulting to the Availability tab");
ok(/function psMkAvailability[\s\S]{0,300}?loadResource\('availabilityCanonical'/.test(html),
  "the workspace's Availability tab reads the SAME canonical resource, not a re-derivation");
ok(/if\(_authed && key==='availability'\)/.test(html) && /return psLiveAvailability\(\);/.test(html),
  "the signed-in router reaches the canonical read");

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
process.exit(fail === 0 ? 0 : 1);
