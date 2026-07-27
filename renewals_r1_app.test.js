/* ══════════════════════════════════════════════════════════════════════════
   renewals_r1_app.test.js — R1 Renewals door, emitted-output assertions.

   Asserts against the HTML psRnwRow ACTUALLY EMITS, not against its source.
   The design rule under test is the one most easily lost: when every row
   shares a state, rows must carry NO badge — the shared truth is stated once
   at page level. A row badge appears only where the row DIFFERS.

   Run:  node renewals_r1_app.test.js
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

// Pull the two renderer functions out of the page and evaluate them with the
// same helpers the page provides.
function extract(name) {
  const start = html.indexOf("function " + name + "(");
  if (start < 0) throw new Error("function not found in index.html: " + name);
  // Walk braces from the first { after the signature.
  const open = html.indexOf("{", start);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  return html.slice(start, i);
}

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sandbox = { esc };
// eslint-disable-next-line no-new-func
new Function("esc", extract("psRnwDate") + "\n" + extract("psRnwRow") + "\nthis.psRnwDate=psRnwDate; this.psRnwRow=psRnwRow;").call(sandbox, esc);
const { psRnwRow } = sandbox;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("   PASS  " + m); } else { fail++; console.log("   FAIL  " + m); } };

const base = {
  lease_id: "L1", person_id: "P1", resident_name: "Dana Ruiz",
  unit_number: "412", space_label: null, current_rent: 1450,
  expires_on: "2026-08-14", days_until_expiration: 18,
  notice_state: "unresolved", owner_user_id: null, owner_state: "UNASSIGNED",
  owner_reason: "renewal_work_not_created", proof_basis: "confirmed_opening_import",
};

console.log("\n══ R1 row rendering ══");

const plain = psRnwRow(base);
ok(/Dana Ruiz/.test(plain), "resident name renders");
ok(/Unit 412/.test(plain), "unit renders");
ok(/\$1,450/.test(plain), "current rent renders formatted");
ok(/18 days left/.test(plain), "days remaining renders");
ok(/Aug 14/.test(plain), "expiration date renders in local time (no UTC day-shift)");

// THE DESIGN RULE: uniform state produces NO row badge.
ok(!/UNRESOLVED/.test(plain), "no UNRESOLVED badge on a uniform row");
ok(!/UNASSIGNED/.test(plain), "no UNASSIGNED badge on a uniform row");

// Differences DO produce a badge.
ok(/ON NOTICE/.test(psRnwRow({ ...base, notice_state: "on_notice" })),
  "ON NOTICE badge appears only when the row differs");
ok(/Kandice/.test(psRnwRow({ ...base, owner_user_id: "U9", owner_name: "Kandice" })),
  "an assigned owner appears only when one exists");

// A single-space unit's "(whole unit)" sentinel is noise, not information.
ok(!/whole unit/i.test(psRnwRow({ ...base, space_label: "(whole unit)" })),
  "the (whole unit) sentinel is not printed on a single-space unit");
ok(/Bed A/.test(psRnwRow({ ...base, space_label: "Bed A" })),
  "a real bed label IS printed (by-bed properties still distinguish the position)");

// Honest absences, and identity is NEVER called UNASSIGNED.
const noResident = psRnwRow({ ...base, resident_name: null, person_id: null });
ok(/Resident not linked/.test(noResident), "missing resident renders 'Resident not linked'");
ok(!/UNASSIGNED/.test(noResident), "missing identity never renders UNASSIGNED");
const noRent = psRnwRow({ ...base, current_rent: null });
ok(/Current rent unavailable/.test(noRent), "missing rent renders 'Current rent unavailable'");
ok(!/\$/.test(noRent.replace(/&#039;/g, "")), "missing rent renders no dollar figure at all");

// The row continues into the Person Card — no separate renewal profile.
ok(/openPersonCard\(/.test(plain), "row opens the Person Card");
ok(/"source":"renewal"/.test(plain) && /"lease_id":"L1"/.test(plain), "card context carries source and lease_id");

console.log("\n══ door wiring ══");
ok(/return psLiveRenewals\(\);/.test(html), "signed-in door calls the live read");
const authedBranch = html.slice(html.indexOf("if(_authed && key==='renewals')"), html.indexOf("if(_authed && key==='marketing')"));
ok(!/renewalsFromReconciliation/.test(authedBranch.replace(/^\s*\/\/.*$/gm, "")),
  "signed-in branch no longer executes the reconciliation adapter");
ok(!/__RENEWALS_LIBRARY/.test(authedBranch), "signed-in branch has no fixture fallback");
ok(/renewals:\s*\{[\s\S]{0,160}\/operator\/leasing\/renewals/.test(html), "renewals resource registered on the live loader");
ok(/No leases expire in the next 90 days\./.test(html), "honest EMPTY state exists");

console.log("\n══ replacement rule in the surface ══");
ok(/renewal decision.{0,40}open in the next 90 days/.test(html.replace(/'\+[^+]*\+'/g, "")) || /open in the next 90 days/.test(html),
  "headline counts OPEN decisions, not everything expiring");
ok(!/leases expire in the next 90 days<\/p>/.test(html) && !/lease'\+\(data\.count===1\?''/.test(html.slice(html.indexOf("renewal decision"), html.indexOf("renewal decision") + 400)),
  "headline no longer claims every expiring lease needs a decision");
ok(/successor pending but are not contractually locked/.test(html),
  "pending successors are surfaced as a labelled page-level condition");
ok(/details class="ps-rnw-aside"/.test(html),
  "pending successors are openable secondary context, not mixed into the work list");
ok(/contested — two overlapping leases/.test(html),
  "conflicted positions are surfaced with an explicit reason");
ok(/locked by an executed and funded successor/.test(html),
  "locked successors are reported separately");
ok(/No open renewal decisions in the next 90 days\./.test(html),
  "empty OPEN work is stated even when exposure remains — never a blank page");
ok(/Renewals are unavailable/.test(html), "honest UNAVAILABLE state exists and is distinct from empty");

console.log(`\n════ ${pass} passed, ${fail} failed ════\n`);
process.exit(fail === 0 ? 0 : 1);
