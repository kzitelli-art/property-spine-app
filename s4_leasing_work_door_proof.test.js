/* ══════════════════════════════════════════════════════════════════════════
   s4_leasing_work_door_proof.test.js — Slice 4 renderer contract, EXECUTED.

   Leasing Work is a pure contract renderer over /operator/leasing/desk. This
   harness executes the door's own exported validateDesk (never a re-derived
   copy) against S4-shaped payloads, and pins the slice's shell/source rules:

     · an owed tour-capture row (navigation → target {type:'tour'}) is a
       SUPPORTED action with the ruled verb Open;
     · a capability-held action (kind 'blocked') keeps its real verb and the
       server's reason — disabled decision, not "Unavailable" amnesia;
     · waiting rows pass validation untouched (no browser lifecycle filter);
     · the browser translates NO blocker codes (server blocker_label wins);
     · stage titles come from server stage_labels — third stage "Lease";
     · the home card prefers operating_counts and the server stage labels;
     · the followups destination applies module identity and hides the
       generic skeleton lanes on every entry path.

   Run: node s4_leasing_work_door_proof.test.js
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");
const door = require(path.join(__dirname, "followups-door.js"));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("   PASS  " + m); } else { fail++; console.log("   FAIL  " + m); } };
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

function row(over) {
  return Object.assign({
    desk_key: "obligation:o1", stage: "post_tour", source: "followup_rail",
    person_id: "p1", person_name: "Person", state_label: "Follow up", due_state: "none",
    primary_action: { code: "complete_task", label: "Complete", kind: "task_write", target: { type: "obligation", id: "o1" } },
  }, over || {});
}
function payload(stages) {
  return { stages: Object.assign({ post_tour: [], application: [], lease_sent: [] }, stages) };
}

console.log("\n== validateDesk, executed ==");
const capRow = row({ desk_key: "tour:t1", source: "tour_capture", state_code: "tour_outcome_owed",
  operating_state: "available", due_state: "overdue", due_at: null,
  primary_action: { code: "capture_tour_outcome", label: "Open", kind: "navigation", target: { type: "tour", id: "t1" } } });
const okPayload = door.validateDesk(payload({ post_tour: [capRow] }));
ok(okPayload.stages.post_tour[0].action_unsupported === false,
  "an owed tour capture (navigation → tour) is a SUPPORTED action");

let threw = null;
try { door.validateDesk(payload({ post_tour: [row({ desk_key: "tour:t2", primary_action: { code: "capture_tour_outcome", label: "Go", kind: "navigation", target: { type: "tour", id: "t2" } } })] })); }
catch (e) { threw = e.message; }
ok(/vocabulary disagrees/.test(threw || ""),
  "a tour action with the wrong verb is refused (ruled CTA vocabulary enforced)");

const held = row({ desk_key: "obligation:o2",
  primary_action: { code: "send_application", label: "Send", kind: "blocked", target: { type: "conversion", id: "c1" }, blocked: true, reason: "The prospect has no eligible application link.", reason_code: "no_link" } });
const heldOut = door.validateDesk(payload({ post_tour: [held] })).stages.post_tour[0];
ok(heldOut.action_unsupported === true && heldOut.action_unavailable_label === "Send",
  "a capability-held action keeps its REAL verb (Send), disabled");
ok(heldOut.action_unavailable_reason === "The prospect has no eligible application link.",
  "the held action carries the server's reason, verbatim");

const waiting = row({ desk_key: "application:a1", stage: "lease_sent", source: "application_lifecycle",
  state_code: "await_resident_acknowledgment", operating_state: "waiting", waiting_on: "prospect",
  application_id: "a1", state_label: "Awaiting the resident's terms acknowledgment.",
  primary_action: { code: "open_application_review", label: "Open", kind: "navigation", target: { type: "application", id: "a1" } } });
const waitOut = door.validateDesk(payload({ lease_sent: [waiting] })).stages.lease_sent[0];
ok(waitOut.action_unsupported === false && waitOut.operating_state === "waiting" && waitOut.waiting_on === "prospect",
  "a waiting-on-prospect row passes validation untouched — no browser lifecycle filter");

threw = null;
try { door.validateDesk({ stages: { post_tour: [] } }); } catch (e) { threw = e.message; }
ok(/stage application is missing/.test(threw || ""), "a malformed projection is refused, never partially rendered");

console.log("\n== door source rules (comment-stripped) ==");
const doorSrc = stripComments(fs.readFileSync(path.join(__dirname, "followups-door.js"), "utf8"));
ok(/row\.blocker_label\|\|/.test(doorSrc),
  "blocker display prefers the SERVER blocker_label (browser never translates codes alone)");
ok(/stage_labels/.test(doorSrc) && /function stageTitle/.test(doorSrc),
  "stage titles read the server-authored stage_labels");
ok(/title:'Lease',/.test(doorSrc) && !/title:'Lease sent'/.test(doorSrc),
  "the local fallback title for the third stage is 'Lease', never 'Lease sent'");
ok(/operating_counts/.test(doorSrc) && /total_active/.test(doorSrc),
  "tileStatus prefers the projection's own operating_counts");
ok(/waiting_on==='prospect'/.test(doorSrc) && /Waiting on the applicant/.test(doorSrc),
  "waiting party wording derives ONLY from the server-authored waiting_on");
ok(/openLeasingDash\('tours'\)/.test(doorSrc.slice(doorSrc.indexOf("function openTourCapture"), doorSrc.indexOf("function openTourCapture") + 700)),
  "the capture action enters the EXISTING canonical Tours destination — no second capture workflow");

console.log("\n== home card reads the same projection ==");
const leSrc = stripComments(fs.readFileSync(path.join(__dirname, "leasing-experience.js"), "utf8"));
ok(/dk\.operating_counts/.test(leSrc) && /oc\.total_active/.test(leSrc),
  "home total prefers operating_counts.total_active (same deduped rail as the destination)");
ok(/dk\.stage_labels/.test(leSrc) && /lbl\('lease_sent','lease sent'\)/.test(leSrc),
  "home breakdown words stages with the server's stage_labels ('Lease'), legacy words only as fallback");
ok(/oc\.waiting/.test(leSrc), "home card can state the restored waiting count");
ok(/oc&&oc\.overdue!=null\?oc\.overdue:ct\.overdue/.test(leSrc.replace(/\s+/g, "")),
  "home overdue comes from operating_counts, legacy counts only as rolling-deploy fallback");

console.log("\n== followups destination shell ==");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const fuStart = html.indexOf("if(_authed && key==='followups')");
const fuBlock = html.slice(fuStart, fuStart + 1600);
ok(/psApplyModuleIdentity\('leasing'\)/.test(fuBlock),
  "the followups destination applies module identity on EVERY entry path (no DESK placeholder)");
ok(/_fuLanes.*classList\.add\('hidden'\)/.test(fuBlock),
  "the followups destination hides the generic skeleton lanes");

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
process.exit(fail === 0 ? 0 : 1);
