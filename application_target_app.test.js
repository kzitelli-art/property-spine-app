/* Application-target selector proof: exact by-bed identity without making
   whole-unit properties more complicated. Run: node application_target_app.test.js */
"use strict";

(async()=>{
const probe=await require("./tests/composite_send_probe")();
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const followups = fs.readFileSync(path.join(__dirname, "followups-door.js"), "utf8");

const shared = fs.readFileSync(path.join(__dirname, "application-offer-review.js"), "utf8");
let passed = 0;
let failed = 0;
function ok(condition, message) {
  if (condition) {
    passed++;
    console.log("   PASS  " + message);
  } else {
    failed++;
    console.log("   FAIL  " + message);
  }
}

const openStart = followups.indexOf("async function openSend(row)");
const openSend = followups.slice(openStart, followups.indexOf("async function sendNow", openStart));
const sendStart = followups.indexOf("async function sendNow(row,target)");
const sendNow = followups.slice(sendStart, followups.indexOf("function confirmPanel", sendStart));
const panelStart = followups.indexOf("}else if(p.kind==='sendapp')");
const panel = shared.slice(shared.indexOf("function chooseUnit"), shared.indexOf("function reviewOffer"));
const conversationSendStart = html.indexOf("async function sendApplication(target)");
const conversationSend = html.slice(conversationSendStart, html.indexOf("async function leaseableUnits", conversationSendStart));
const conversationUiStart = html.indexOf("// SEND APPLICATION — this door");
const conversationUi = shared + html.slice(conversationUiStart, html.indexOf("var lb=q('lqBack')", conversationUiStart));

console.log("\n== one canonical post-tour selector ==");
ok(openStart > 0, "the post-tour application selector exists");
ok(/d\.eligible_targets\|\|d\.eligible_units/.test(shared),
  "the app prefers exact server targets and retains sole-space rolling compatibility");
ok(!/if\(row\.unit_id\).*sendNow/.test(openSend),
  "a unit attached to the tour does not silently choose a bed");
ok(/leaseableUnits/.test(shared) && !/sendApplicationFromConversion/.test(openSend),
  "opening the selector reads current truth and sends nothing");

console.log("\n== exact bed is visible and selectable ==");
ok(/data-uid=/.test(panel) && /data-space=/.test(panel) && /data-move-in=/.test(panel),
  "each selectable row carries unit, space, and intended move-in identity");
ok(/rentable_space_count/.test(panel) && /u\.space_label/.test(panel),
  "multi-space rows include their bed label");
ok(/if\(multi && u\.space_label\)/.test(panel),
  "sole-space rows keep the simple unit label");
ok(!/spaces\.map|u\.spaces/.test(panel),
  "the browser never invents targets by expanding an inventory shape");

console.log("\n== the selected identity reaches the composite command ==");
ok(/target\.unit_id\|\|target\.id/.test(sendNow), "the send reads the selected unit");
ok(/target\.space_id\|\|target\.resolved_space_id/.test(sendNow), "the send reads the selected exact space");
ok(/target\.intended_move_in/.test(sendNow), "the send reads the governed target date");
ok(JSON.stringify(probe.calls[0])===JSON.stringify({conversionId:"conversion-1",unit_id:"unit-1",space_id:"bed-1",intended_move_in:"2026-10-01",application_offer_id:"offer-1",idempotency_key:"attempt-1"}),
  "executed composite command preserves conversion, exact home, offer, date and retry identity");
ok(probe.refused==="Prepared only", "executed SMS send refuses a prepared-only receipt");
ok(probe.prepared.prepared===true&&probe.prepared.sent===false&&probe.calls[2].delivery_method==="manual_email", "executed manual preparation preserves channel without claiming delivery");
ok(/if\(!out \|\| out\.sent!==true\) throw/.test(sendNow),
  "the UI never calls a prepared invitation sent without provider acceptance");

console.log("\n== the live client preserves the exact target ==");
const actionStart = html.indexOf("sendApplicationFromConversion:");
const action = html.slice(actionStart, actionStart + 900);
ok(/if\(p\.space_id\) b\.space_id = p\.space_id/.test(action),
  "the live client includes space_id when a bed was chosen");
ok(/if\(p\.intended_move_in\) b\.intended_move_in = p\.intended_move_in/.test(action),
  "the live client includes the intended move-in date when the target is future");
ok(/unit_id: p\.unit_id/.test(action), "the same request includes unit_id");
ok(/idempotency_key: p\.idempotency_key/.test(action), "the same request includes its retry identity");

console.log("\n== old-app compatibility still fails closed ==");
ok(/d\.eligible_targets\|\|d\.eligible_units/.test(shared),
  "an older API can still provide sole-space eligible_units");
ok(/unsupported_multi_space_units/.test(shared) && /lqdt-unitblocked/.test(shared),
  "old unsupported rows remain explanatory and unselectable during rollout");

console.log("\n== conversation and post-tour share one writer ==");
ok(conversationSendStart > 0, "the conversation adapter exposes an application send");
ok(/live\.sendApplicationFromConversion/.test(conversationSend),
  "the conversation adapter calls the same composite command as post-tour");
ok(/space_id: spaceId/.test(conversationSend) && /unit_id: unitId/.test(conversationSend),
  "the conversation adapter preserves the same exact target identity");
ok(/intended_move_in: intendedMoveIn/.test(conversationSend),
  "the conversation adapter preserves the same future target date");
ok(/if\(d\.sent !== true\) throw/.test(conversationSend),
  "the conversation door also requires provider-confirmed delivery");
ok(/eligible_targets \|\| d\.eligible_units/.test(html),
  "the conversation selector prefers the same exact-target read");
ok(/data-uid=/.test(conversationUi) && /data-space=/.test(conversationUi) && /data-move-in=/.test(conversationUi),
  "its choice carries unit, bed, and target date to the adapter");
ok(!/cc\.unit_id[\s\S]{0,120}sendApplication/.test(conversationUi),
  "conversation context never silently chooses a bed");
ok(!/createApplicationInvitation|attestApplicationSent|sendApplicationSms/.test(html),
  "the browser no longer exposes parallel application writers");

ok(/psMountApplicationOfferReview/.test(followups) && /psMountApplicationOfferReview/.test(html), "both entry points mount the same review");
ok(!/function reviewOffer/.test(html) && !/data-act="pickunit"/.test(followups), "duplicate reviewer and direct-send picker removed");
console.log(`\n==== ${passed} passed, ${failed} failed ====\n`);
process.exit(failed ? 1 : 0);

})().catch(e=>{console.error(e);process.exitCode=1;});
