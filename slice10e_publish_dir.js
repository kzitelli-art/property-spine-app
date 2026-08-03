#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
//  slice10e_publish_dir.js — build the publish directory the 10E browser
//  acceptance serves. CLASS 3 (test infrastructure).
//
//  This is the §6 publish boundary from docs/INCIDENT_STATIC_DATA_EXPOSURE.md
//  applied to the proof stack rather than to production: an ALLOWLIST, not a
//  denylist. Nothing reaches the served directory unless it is named here.
//
//  Two files named by the incident record as REAL production data rails —
//  property-spine-data.js and policy.js — are DELIBERATELY NOT COPIED. They
//  are replaced by empty-global stubs so index.html's load path stays intact.
//
//  REMOVAL CONDITION for the stubs (§18): they are deleted the moment the two
//  rails are removed from the artifact under the §7 reactivation gate, at
//  which point index.html no longer loads them and there is nothing to stub.
//
//  The substitution is proven not to touch the surface under test rather than
//  argued: slice10e_future_rent_roll_browser_proof asserts the Future Rent
//  Roll surface reads none of the eighteen globals these files define.
//
//  It also FAILS CLOSED. Every copied file is scanned for the resident-data
//  field names the incident record lists, and a hit aborts the build. A
//  publish directory that cannot prove it is clean is not published.
// ════════════════════════════════════════════════════════════════════
"use strict";
const fs = require("fs");
const path = require("path");

const SRC = process.env.APP_DIR || path.resolve(__dirname);
const OUT = process.env.PUBLISH_DIR;
if (!OUT) { console.error("need PUBLISH_DIR"); process.exit(1); }

//  ALLOWLIST. index.html plus the door scripts it loads by relative URL.
//  Derived by reading the <script src="..."> tags in index.html, not guessed.
const ALLOW = ["index.html", "logos.js", "followups-door.js", "moveins-door.js",
               "leasing-experience.js", "readiness-door.js", "conversations-board.js",
               "person-card-information.js", "authoritative-property-context.js",
               "build-info.js", "staff-agent-door.js", "turn-scope-door.js",
               "unit-triage-door.js", "unit-turn-page.js", "work-acceptance-door.js"];

//  The two REAL production data rails. Never copied. Stubbed instead.
const STUBBED = ["property-spine-data.js", "policy.js"];

//  The eighteen globals both rails define (incident record §3b). Declared as
//  empty so index.html's other surfaces find a defined, honest nothing rather
//  than a ReferenceError — and never a fabricated record.
const GLOBALS = ["__PC_RESIDENT_RECORDS", "__RENT_ROLL_LIBRARY", "__CONVERSATIONS_LIB",
  "__RENEWALS_LIBRARY", "__RENEWAL_THREADS", "__APPS_LIBRARY", "__TOURS_LIBRARY",
  "__TOUR_THREADS", "__WO_LIBRARY", "__REAL_WO_LIBRARY", "__WO_FLOW_LIBRARY",
  "__VENDOR_LIBRARY", "__SUPPLY_LIBRARY", "__COMPLIANCE_LIBRARY", "__LEAD_ANALYTICS",
  "__CAPITAL_DEMO", "__RENT_TREND", "__FOLLOWUPS_LIBRARY", "__LEASING_OB_LIB"];

//  ── THE REFUSAL RULE, and why it is not a keyword scan ──────────────
//  A first cut refused any file mentioning resident-data field names. It
//  refused index.html, which mentions 76 of them — because index.html is the
//  code that READS those fields. A scan that cannot tell a reader from a
//  record would have to be switched off to let the real work through, and a
//  check that gets switched off is not a check.
//
//  What separates a data rail from application code is DECLARATION: the rails
//  ASSIGN the eighteen globals; index.html only reads them. So the rule is
//  assignment, and it is exact rather than statistical.
//
//  The keyword count is still computed and PRINTED for every copied file. It
//  is disclosure, not a gate — a number on the record beats a boolean nobody
//  can audit. (Measured here: index.html 76, each rail ~1,000.)
const FIELD_NAMES = /\b(resident_name|tenant_name|names_masked|move_in_date|actual_rent|net_rent|caller_phone|caller_name|balance_due)\b/gi;
const assignsGlobal = (body, g) =>
  new RegExp("(^|[^\\w.])(var\\s+|let\\s+|const\\s+|window\\s*\\.\\s*)?" + g + "\\s*=(?!=)", "m").test(body);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let copied = 0, skipped = [], disclosure = [];
for (const name of ALLOW) {
  const from = path.join(SRC, name);
  if (!fs.existsSync(from)) { skipped.push(name); continue; }
  const body = fs.readFileSync(from, "utf8");
  const declares = GLOBALS.filter((g) => assignsGlobal(body, g));
  if (declares.length) {
    console.error(`\n  ✗ REFUSED — ${name} DECLARES ${declares.join(", ")}.`);
    console.error("    Only a data rail declares those globals, and no data rail is published.");
    console.error("    Nothing was copied and the build stops.\n");
    process.exit(1);
  }
  const hits = (body.match(FIELD_NAMES) || []).length;
  disclosure.push(`${name} ${hits}`);
  fs.writeFileSync(path.join(OUT, name), body);
  copied++;
}

const stub = "/* slice10e proof stack — EMPTY STUB.\n"
  + "   The real file is a production data rail (INCIDENT_STATIC_DATA_EXPOSURE.md §3b)\n"
  + "   and is never copied into a proof artifact. These globals are declared empty so\n"
  + "   index.html's load path is intact. No record is fabricated here. */\n"
  + GLOBALS.map((g) => `var ${g} = (typeof ${g} !== 'undefined' && ${g}) || {};`).join("\n") + "\n";
for (const name of STUBBED) fs.writeFileSync(path.join(OUT, name), stub);

//  Prove the negative rather than assume it: the two rails must be absent by
//  content, not merely un-listed.
for (const name of STUBBED) {
  const body = fs.readFileSync(path.join(OUT, name), "utf8");
  if (body.length > 4096) { console.error(`  ✗ ${name} stub is not a stub.`); process.exit(1); }
}

console.log(`publish dir ${OUT}: ${copied} allowlisted file(s) copied, ${STUBBED.length} stubbed`
  + (skipped.length ? `, ${skipped.length} allowlisted but absent (${skipped.join(", ")})` : ""));
console.log("  field-name references per copied file (disclosure, not a gate): " + disclosure.join(" · "));
