/* Application-target selector proof: exact by-bed identity without making
   whole-unit properties more complicated. Run: node application_target_app.test.js */
"use strict";

const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const followups = fs.readFileSync(path.join(__dirname, "followups-door.js"), "utf8");

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
const panel = followups.slice(panelStart, followups.indexOf("}else if(p.kind==='", panelStart + 20));
const conversationSendStart = html.indexOf("async function sendApplication(target)");
const conversationSend = html.slice(conversationSendStart, html.indexOf("async function leaseableUnits", conversationSendStart));
const conversationUiStart = html.indexOf("// SEND APPLICATION — this door");
const conversationUi = html.slice(conversationUiStart, html.indexOf("var lb=q('lqBack')", conversationUiStart));

console.log("\n== one canonical post-tour selector ==");
ok(openStart > 0, "the post-tour application selector exists");
ok(/eligible_targets\|\|out\.eligible_units/.test(openSend),
  "the app prefers exact server targets and retains sole-space rolling compatibility");
ok(!/if\(row\.unit_id\).*sendNow/.test(openSend),
  "a unit attached to the tour does not silently choose a bed");
ok(/leaseableUnits/.test(openSend) && !/sendApplicationFromConversion/.test(openSend),
  "opening the selector reads current truth and sends nothing");

console.log("\n== exact bed is visible and selectable ==");
ok(/data-unit=/.test(panel) && /data-space=/.test(panel),
  "each selectable row carries unit and space identity");
ok(/rentable_space_count/.test(panel) && /u\.space_label/.test(panel),
  "multi-space rows include their bed label");
ok(/if\(multi && u\.space_label\)/.test(panel),
  "sole-space rows keep the simple unit label");
ok(!/spaces\.map|u\.spaces/.test(panel),
  "the browser never invents targets by expanding an inventory shape");

console.log("\n== the selected identity reaches the composite command ==");
ok(/target\.unit_id\|\|target\.id/.test(sendNow), "the send reads the selected unit");
ok(/target\.space_id\|\|target\.resolved_space_id/.test(sendNow), "the send reads the selected exact space");
ok(/sendApplicationFromConversion\(\{conversionId:conversionId,unit_id:unitId,space_id:spaceId,idempotency_key:sendAttemptKey\(row\)\}\)/.test(sendNow),
  "one composite command receives conversion, unit, space, and idempotency identity");
ok(/if\(!out \|\| out\.sent!==true\) throw/.test(sendNow),
  "the UI never calls a prepared invitation sent without provider acceptance");

console.log("\n== the live client preserves the exact target ==");
const actionStart = html.indexOf("sendApplicationFromConversion:");
const action = html.slice(actionStart, actionStart + 900);
ok(/if\(p\.space_id\) b\.space_id = p\.space_id/.test(action),
  "the live client includes space_id when a bed was chosen");
ok(/unit_id: p\.unit_id/.test(action), "the same request includes unit_id");
ok(/idempotency_key: p\.idempotency_key/.test(action), "the same request includes its retry identity");

console.log("\n== old-app compatibility still fails closed ==");
ok(/out\.eligible_targets\|\|out\.eligible_units/.test(openSend),
  "an older API can still provide sole-space eligible_units");
ok(/unsupported_multi_space_units/.test(openSend) && /pslh-unit-blocked/.test(followups),
  "old unsupported rows remain explanatory and unselectable during rollout");

console.log("\n== conversation and post-tour share one writer ==");
ok(conversationSendStart > 0, "the conversation adapter exposes an application send");
ok(/live\.sendApplicationFromConversion/.test(conversationSend),
  "the conversation adapter calls the same composite command as post-tour");
ok(/space_id: spaceId/.test(conversationSend) && /unit_id: unitId/.test(conversationSend),
  "the conversation adapter preserves the same exact target identity");
ok(/if\(d\.sent !== true\) throw/.test(conversationSend),
  "the conversation door also requires provider-confirmed delivery");
ok(/eligible_targets \|\| d\.eligible_units/.test(html),
  "the conversation selector prefers the same exact-target read");
ok(/data-uid=/.test(conversationUi) && /data-space=/.test(conversationUi),
  "its choice carries both unit and bed to the adapter");
ok(!/cc\.unit_id[\s\S]{0,120}sendApplication/.test(conversationUi),
  "conversation context never silently chooses a bed");
ok(!/createApplicationInvitation|attestApplicationSent|sendApplicationSms/.test(html),
  "the browser no longer exposes parallel application writers");

console.log(`\n==== ${passed} passed, ${failed} failed ====\n`);
process.exit(failed ? 1 : 0);
