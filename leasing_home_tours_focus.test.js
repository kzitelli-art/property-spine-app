"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const APP = fs.readFileSync(path.join(__dirname, "leasing-experience.js"), "utf8");

let passed = 0;
let failed = 0;
const failures = [];
function ok(label, condition) {
  if (condition) {
    passed += 1;
    console.log("   PASS  " + label);
  } else {
    failed += 1;
    failures.push(label);
    console.log("   FAIL  " + label);
  }
}

const normalizerStart = APP.indexOf("function normalizeTourDateKey");
const normalizerEnd = APP.indexOf("\n  function fmtTourTime", normalizerStart);
const normalizerSource = APP.slice(normalizerStart, normalizerEnd);
const sandbox = {};
vm.runInNewContext(normalizerSource, sandbox);

console.log("\n== calendar boundary ==");
ok("a bare PostgreSQL date stays a calendar date",
  sandbox.normalizeTourDateKey("2026-08-14") === "2026-08-14");
ok("a serialized PostgreSQL date timestamp collapses to the same day",
  sandbox.normalizeTourDateKey("2026-08-14T00:00:00.000Z") === "2026-08-14");
ok("an impossible or missing date never becomes Invalid Date",
  sandbox.normalizeTourDateKey("2026-02-31T00:00:00Z") === "" && sandbox.normalizeTourDateKey(null) === "");
ok("the client normalizes operating_date at its API boundary",
  /normalizeTourDateKey\(t&&t\.operating_date\)/.test(APP));
ok("the Today count compares normalized date keys",
  /normalizeTourDateKey\(d\.date\)===todayKey/.test(APP) &&
  /normalizeTourDateKey\(t\.operating_date\)===todayKey/.test(APP));
ok("tour times render in the property's timezone when supplied",
  /if\(liveTours\.timezone\) opts\.timeZone=liveTours\.timezone/.test(APP) &&
  /liveTours\.timezone=\(d&&d\.timezone\)\|\|null/.test(APP));

console.log("\n== priority schedule ==");
ok("Tours spans the full desktop operating grid",
  /psx-card\.psx-tours\{grid-column:1\/-1!important\}/.test(APP));
ok("the three supporting doors form one compact row",
  /psx-leasing-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important\}/.test(APP));
ok("tour explanation and duplicate live copy are removed from the priority card",
  /psx-tours p,.psx-leasing-grid>\.psx-tours \.le-auth-live\{display:none!important\}/.test(APP));
ok("today rows lead with a prominent tabular time",
  /psx-tour-time\{font:650 16px/.test(APP) && /font-variant-numeric:tabular-nums/.test(APP));
ok("the week-ahead mini schedule keeps each tour time",
  /class=\"psx-week-time\"/.test(APP) && /fmtTourTime\(when\)/.test(APP));
ok("the visual QA entry is explicit and localhost-only",
  /\^\(localhost\|127\\\.0\\\.0\\\.1\)\$/.test(APP) &&
  /ps_leasing_home_preview/.test(APP) && /grants no session and no API access/.test(APP));

console.log("\n== direct person door ==");
ok("the entire today row is a button, not a tiny underlined name",
  /<button type=\"button\" class=\"psx-tour-preview-row\"/.test(APP));
ok("the row carries person, tour, and conversation linkage",
  /data-psx-person/.test(APP) && /data-psx-tour/.test(APP) && /data-psx-conversation/.test(APP));
ok("the canonical Person Card receives the tour and conversation links",
  /tour_id: tid\|\|null/.test(APP) &&
  /conversation_id: el\.getAttribute\('data-psx-conversation'\)\|\|null/.test(APP) &&
  /source: 'leasing_home_tours'/.test(APP));
ok("nested schedule buttons do not trigger the parent Tours door from the keyboard",
  /ev\.target!==card/.test(APP));
ok("the preview schedule exercises the same clickable row contract",
  /preview-tour-maya/.test(APP) && /demoTourPreviewHTML[\s\S]*?data-psx-tour/.test(APP));

console.log("\n==== " + passed + " passed, " + failed + " failed ====");
if (failed) {
  failures.forEach((label) => console.log("   - " + label));
  process.exit(1);
}
