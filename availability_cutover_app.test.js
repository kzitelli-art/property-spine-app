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
  extract("psRrDate") + "\n" + extract("psAvRow") + "\nthis.psAvRow=psAvRow;").call(box, esc);

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
const groups = html.slice(html.indexOf("var PS_AV_GROUPS"), html.indexOf("function psAvRow"));
["Marketable now", "Coming available", "Committed to a future resident", "Blocked", "Contested or unresolved"]
  .forEach(t => ok(groups.includes(t), "group present: " + t));
ok(/marketable_now/.test(groups) && /activation_pending/.test(groups),
  "activation-pending positions are grouped as committed, never as inventory");
ok(/appear vacant but cannot be marketed because occupancy evidence disagrees/.test(fn),
  "the shared evidence condition is stated once, in plain language");
ok(/overlapping lease claims/.test(fn), "the shared contested condition is stated once");
ok(/commenced but is awaiting move-in funds/.test(fn), "activation-pending is explained once");

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
