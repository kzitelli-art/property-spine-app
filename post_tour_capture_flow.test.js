"use strict";

const fs = require("fs");
const path = require("path");

const index = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const followups = fs.readFileSync(path.join(__dirname, "followups-door.js"), "utf8");

let passed = 0;
let failed = 0;
function ok(name, condition) {
  if (condition) {
    passed++;
    console.log("   PASS  " + name);
  } else {
    failed++;
    console.log("   FAIL  " + name);
  }
}

const captureStart = index.indexOf("function renderTourCapture(){");
const capture = index.slice(captureStart, index.indexOf("function outcomeSummary", captureStart));
const saveStart = index.indexOf("async function tourSaveFeedback");
const save = index.slice(saveStart, index.indexOf("Post-tour follow-up: DRAFT", saveStart));
const directStart = followups.indexOf("async function openApplicationSend");
const directSend = followups.slice(directStart, followups.indexOf("async function sendNow", directStart));

console.log("\n== intuitive capture ==");
ok("the active renderer exists", captureStart > 0);
ok("attendance is one compact four-way decision",
  /tw-attendance/.test(capture) && /Showed up/.test(capture) && /No-show/.test(capture)
    && /Rescheduled/.test(capture) && /Cancelled/.test(capture));
ok("commercial outcomes render as the two-column outcome group",
  /tw-outcome/.test(capture) && /for\(const \[val,label,sub\] of DISPOSITIONS\)/.test(capture));
ok("known lead facts are recognized behind an edit disclosure",
  /tw-fact-edit/.test(capture) && /Needs on file/.test(capture));
ok("the outcome authors the primary next move",
  /NEXT_MOVE_DETAIL\[C\.nextMove\]/.test(capture) && /tw-next-tag/.test(capture));
ok("the inactive voice promise is absent from the active capture",
  !/Hold to speak|tourVoiceMemo/.test(capture));
ok("ready-to-apply stays honest about save versus send",
  /Outcome saves first\. Nothing is sent yet\./.test(capture)
    && /Save &amp; choose a unit/.test(capture));

console.log("\n== canonical application handoff ==");
ok("tour completion reads the server-authored conversion id",
  /lwd && lwd\.conversion_id/.test(save));
ok("saving opens the existing governed application sender",
  /__psFollowups\.openApplicationSend/.test(save));
ok("the Tours projection refresh occurs before the application handoff",
  save.indexOf("__psAfterLiveTourComplete") < save.indexOf("openLeasingDash('followups')"));
ok("saving the outcome never dispatches the application itself",
  !/sendApplicationFromConversion/.test(save));
ok("the Follow Ups controller exposes one direct-entry method",
  /openApplicationSend:openApplicationSend/.test(followups));
ok("direct entry still loads leaseable units before any send",
  /await openSend/.test(directSend) && /unit_id:null/.test(directSend) && !/sendNow/.test(directSend));
ok("unit selection states that the click sends the text",
  /Selecting it sends the application by text\./.test(followups));
ok("the actual send remains the canonical composite command",
  /sendApplicationFromConversion\(\{conversionId:conversionId,unit_id:unitId,idempotency_key:sendAttemptKey\(row\)\}\)/.test(followups));

console.log("\n== safe local QA ==");
ok("preview entry is localhost-only and explicit",
  /\^\(localhost\|127\\\.0\\\.0\\\.1\)\$/.test(index) && /get\('preview'\) === '1'/.test(index));
ok("preview receipts preserve the application next step",
  /Next: choose a unit and send the application\./.test(index));

console.log("\n==== " + passed + " passed, " + failed + " failed ====\n");
process.exit(failed ? 1 : 0);
