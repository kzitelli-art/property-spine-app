// moveout_entry_proof.test.js
// The Rent Roll opens the exact resident relationship; management confirms
// possession ending there; Maintenance receives the resulting turnover.

"use strict";

const fs = require("fs");
const path = require("path");

const INDEX = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const CARD = fs.readFileSync(path.join(__dirname, "person-card-information.js"), "utf8");

let passed = 0;
let failed = 0;
const failures = [];
function ok(name, condition) {
  if (condition) passed += 1;
  else { failed += 1; failures.push(name); }
}
function slice(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  return from >= 0 && to > from ? source.slice(from, to) : "";
}

const action = slice(INDEX, "confirmResidentMoveOut: {", "approveApplication: {");
const submit = slice(INDEX, "async function pcLiveConfirmMoveOut(){", "async function pcLiveOpenTurnover(){");
const render = slice(INDEX, "function pcLiveMoveOutHtml(st){", "function pcLiveNextHtml(card){");
const rentRow = slice(INDEX, "function psRrRow(r, showType){", "/* OPERATING NAVIGATION");

ok("the named live action targets the authenticated unit move-out route",
  action.includes("'/operator/units/'") && action.includes("'/move-out'"));
ok("the action body carries the outgoing lease and observed turn facts",
  action.includes("outgoing_lease_id") && action.includes("expected_ready_date") && action.includes("needs:"));
ok("property and actor authority never enter the browser body",
  !/property_id|actor_user_id|confirmed_by_user_id/.test(action));
ok("the public live seam exposes only the named move-out action",
  INDEX.includes("confirmResidentMoveOut: function(params){ return writeAction('confirmResidentMoveOut', params); }"));

ok("canonical Rent Roll rows pass stable unit and lease ids into the Person Card",
  rentRow.includes("unit_id: r.unit_id") && rentRow.includes("lease_id: (r.lease && r.lease.lease_id)"));
ok("the move-out affordance is resident-only and management-only",
  render.includes("stage!=='resident'&&stage!=='tenant'") && render.includes("pcLiveHasModule('management')"));
ok("the first click opens a confirmation state rather than writing",
  render.includes('onclick="pcLiveOpenMoveOut()"') && render.includes('onclick="pcLiveConfirmMoveOut()"'));
ok("the confirmation states the effective possession consequence",
  render.includes("Effective today") && render.includes("ends the resident\\'s current possession"));
ok("the submit sends exact context and no client authority",
  submit.includes("unitId:ids.unit_id") && submit.includes("outgoing_lease_id:ids.lease_id") &&
  !/property_id|actor_user_id|confirmed_by_user_id/.test(submit));
ok("an already-active turnover is recovered as truth, not retried as a duplicate",
  submit.includes("e.status===409") && submit.includes("prior.turnover_id") && submit.includes("No duplicate was created"));

ok("resident cards do not offer the walk-in-tour capture",
  CARD.includes("var tourBand=tour||(resident?'':walkInHtml(card));"));
ok("the resident transition is placed in the relationship overview",
  CARD.includes("factsHtml(o)+transition+tourBand"));
ok("operators with Maintenance access can open the exact resulting unit turn",
  INDEX.includes("window.__psUnitTurn.loadUnit(ids.unit_id)"));

console.log(`\n  assertions passed: ${passed}\n  assertions failed: ${failed}`);
if (failed) failures.forEach((name) => console.log("   FAIL " + name));
process.exit(failed ? 1 : 0);
