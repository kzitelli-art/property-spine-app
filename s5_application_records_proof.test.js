/* ══════════════════════════════════════════════════════════════════════════
   s5_application_records_proof.test.js — Application Records, EXECUTED.

   Slice 5 absorbs Applications Review into Leasing Work as a second VIEW
   over the same server projection. This harness executes the door's own
   validateDesk against records payloads and pins the absorption rules:

     · records are validated, never classified, by the browser;
     · a duplicate application id is refused;
     · a record with no server record_state is refused;
     · a record that does not route to the canonical application detail is
       refused (no action logic may be recreated here);
     · a pre-S5 payload (no records section) still renders Active Work —
       the rolling deploy degrades, it does not break;
     · the legacy applications_review key redirects into Leasing Work
       records when signed in, and the legacy list survives only as the
       no-module fallback so no link dead-ends;
     · the review detail returns to the canonical entrance and announces
       the return so the door refreshes.

   Run: node s5_application_records_proof.test.js
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");
const door = require(path.join(__dirname, "followups-door.js"));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("   PASS  " + m); } else { fail++; console.log("   FAIL  " + m); } };
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const emptyStages = { post_tour: [], application: [], lease_sent: [] };
function record(over) {
  return Object.assign({
    application_id: "a1", person_id: "p1", person_name: "Applicant", record_state: "active",
    active_stage: "application", state_label: "Approve the application.",
    primary_action: { code: "open_application_review", label: "Open", kind: "navigation", target: { type: "application", id: "a1" } },
  }, over || {});
}
const withRecords = (records) => ({ stages: emptyStages, application_records: { records, counts: {} } });

console.log("\n== records validation, executed ==");
ok(door.validateDesk(withRecords([record()])).application_records.records.length === 1,
  "a well-formed record passes validation untouched");
ok(door.validateDesk(withRecords([
  record({ application_id: "a2", record_state: "exited", active_stage: null, exit_code: "closed",
    exit_label: "Application closed.",
    primary_action: { code: "open_application_review", label: "Open", kind: "navigation", target: { type: "application", id: "a2" } } })
])).application_records.records[0].record_state === "exited",
  "an EXITED record is accepted as a record — history stays reachable");

let threw = null;
try { door.validateDesk(withRecords([record(), record()])); } catch (e) { threw = e.message; }
ok(/same application twice/.test(threw || ""), "a duplicate application id is refused");

threw = null;
try { door.validateDesk(withRecords([record({ record_state: undefined })])); } catch (e) { threw = e.message; }
ok(/no server-authored record_state/.test(threw || ""),
  "a record with no server record_state is refused — the browser will not classify it");

threw = null;
try { door.validateDesk(withRecords([record({ record_state: "probably_active" })])); } catch (e) { threw = e.message; }
ok(/no server-authored record_state/.test(threw || ""), "an unknown record_state is refused, never guessed");

threw = null;
try {
  door.validateDesk(withRecords([record({
    primary_action: { code: "approve", label: "Approve", kind: "task_write", target: { type: "application", id: "a1" } } })]));
} catch (e) { threw = e.message; }
ok(/does not route to the canonical review detail/.test(threw || ""),
  "a record action that is not canonical navigation is refused — no action logic recreated here");

threw = null;
try { door.validateDesk({ stages: emptyStages, application_records: { records: "nope" } }); } catch (e) { threw = e.message; }
ok(/malformed/.test(threw || ""), "a malformed records section is refused");

ok(door.validateDesk({ stages: emptyStages }).application_records === undefined,
  "a pre-S5 payload still validates — Active Work renders during the rolling deploy");

console.log("\n== door source rules (comment-stripped) ==");
const src = stripComments(fs.readFileSync(path.join(__dirname, "followups-door.js"), "utf8"));
ok(/state\.view==='records'/.test(src) && /recordsHTML\(\)/.test(src),
  "the records view is a second view over the SAME projection, not a second read");
ok(!/loadResource\(\s*'applicationsReview'/.test(src),
  "the door issues NO separate applications-review read");
ok(/stage_labels\[record\.active_stage\]/.test(src.replace(/\s+/g, "")) ||
   /state\.desk\.stage_labels&&state\.desk\.stage_labels\[record\.active_stage\]/.test(src.replace(/\s+/g, "")),
  "an active record's chip uses the SERVER stage label");
ok(/record\.exit_label\|\|/.test(src), "an exited record shows the SERVER exit label");
ok(/Application Records requires the updated server projection/.test(src),
  "a pre-S5 projection says so honestly instead of rendering an empty records list");
ok(/showRecords/.test(src) && /surface=Object\.freeze\(\{[^}]*showRecords/.test(src.replace(/\s+/g, "")),
  "showRecords is exposed so the canonical entrance can land on the records view");

console.log("\n== shell: absorption, redirect, return path ==");
const idx = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const arStart = idx.indexOf("if(key==='applications_review')");
const arBlock = idx.slice(arStart, arStart + 900);
ok(/__psFollowups/.test(arBlock) && /showRecords/.test(arBlock) && /openLeasingDash\('followups'\)/.test(arBlock),
  "the applications_review key redirects signed-in operators into Leasing Work records");
ok(/return psLiveApplicationsReview\(\);/.test(arBlock),
  "the legacy list remains as the no-module fallback — no link dead-ends");
const authedHome = idx.slice(idx.indexOf("if(_leAuthed){"),
  idx.indexOf("$('intelStrip').innerHTML = `<div class=\"maint-ops-shell\">"));
ok(!/le-review-row/.test(authedHome),
  "the separate Applications Review entrance is gone from the authed home (parity now proven)");
ok(/function psArReturnToLeasing/.test(idx) && /ps:leasing-return/.test(idx.slice(idx.indexOf("function psArReturnToLeasing"), idx.indexOf("function psArReturnToLeasing") + 400)),
  "leaving the review detail announces the return so the door refreshes its projection");
ok(!/onclick="psLiveApplicationsReview\(\)">← All applications/.test(idx),
  "the detail's back button no longer returns to the retired standalone list");

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
process.exit(fail === 0 ? 0 : 1);
