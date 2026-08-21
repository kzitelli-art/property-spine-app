#!/usr/bin/env node
"use strict";

const fs = require("fs");
const html = fs.readFileSync(require("path").join(__dirname, "index.html"), "utf8");
let pass = 0;
let fail = 0;
function ok(label, condition) {
  if (condition) { pass += 1; console.log("  ok    " + label); }
  else { fail += 1; console.log("  FAIL  " + label); }
}

console.log("\nNATIVE TOUR TIMES APP\n");

ok("the live resource reads the session-scoped native slot route",
  /tourSlots:\s*\{[\s\S]{0,500}\/operator\/leasing\/tour-slots/.test(html));
ok("publish is a named sealed write action",
  /publishTourSlot:\s*\{[\s\S]{0,500}path: function\(\)\{ return '\/operator\/leasing\/tour-slots'/.test(html));
ok("block and reopen are separate named commands",
  /blockTourSlot:\s*\{[\s\S]{0,250}\/block/.test(html) && /reopenTourSlot:\s*\{[\s\S]{0,250}\/reopen/.test(html));
ok("weekly publication and day adjustment are named sealed commands",
  /publishTourSchedule:\s*\{[\s\S]{0,250}\/operator\/leasing\/tour-schedule/.test(html) &&
  /adjustTourDay:\s*\{[\s\S]{0,250}\/operator\/leasing\/tour-schedule\/adjust-day/.test(html));
ok("the browser sends property-local wall time, not guessed offsets",
  /starts_local:p\.startsLocal, ends_local:p\.endsLocal/.test(html));
ok("no tour-slot write sends property_id or actor identity",
  !/publishTourSlot:\s*\{[\s\S]{0,650}(?:property_id|actor_user_id)/.test(html));
ok("schedule writes also leave property and actor server-derived",
  !/publishTourSchedule:\s*\{[\s\S]{0,900}(?:property_id|actor_user_id)/.test(html) &&
  !/adjustTourDay:\s*\{[\s\S]{0,650}(?:property_id|actor_user_id)/.test(html));
ok("the live facade exposes only the named tour-slot writes",
  /publishTourSlot: function\(params\)\{ return writeAction\('publishTourSlot'/.test(html) &&
  /blockTourSlot: function\(params\)\{ return writeAction\('blockTourSlot'/.test(html) &&
  /reopenTourSlot: function\(params\)\{ return writeAction\('reopenTourSlot'/.test(html));
ok("the tour board has one clear entry to Tour Times", /data-tour-times>Tour times<\/button>/.test(html));
ok("the staff form has date, time, duration, and optional host controls",
  /id="ttsDate"[\s\S]{0,1000}id="ttsTime"[\s\S]{0,1000}id="ttsDuration"[\s\S]{0,1000}id="ttsHost"/.test(html));
ok("the weekly policy exposes all seven days and the governed scheduling controls",
  /__psTourWeekdays/.test(html) && /ttsPolicyDuration/.test(html) && /ttsPolicyNotice/.test(html) &&
  /ttsPolicyHolidays/.test(html) && /ttsPolicyHost/.test(html) && /ttsPolicyHorizon/.test(html));
ok("staff callouts can close or reassign a day's open times",
  /data-tts-day-action="close_open"/.test(html) && /data-tts-day-action="reassign_open"/.test(html));
ok("slot rows expose block and reopen but no delete command",
  /data-tts-block/.test(html) && /data-tts-reopen/.test(html) && !/data-tts-delete/.test(html));
ok("booked times render without a mutation action",
  /status==='blocked'[\s\S]{0,180}data-tts-reopen[\s\S]{0,100}:''/.test(html));
ok("the page gets slots and eligible hosts from the same scheduler read",
  /L\.loadResource\('tourSlots'[\s\S]{0,300}slots\.eligible_hosts/.test(html) &&
  !/Promise\.all\(\[L\.loadResource\('tourSlots'[\s\S]{0,180}L\.loadResource\('eligibleStaff'/.test(html));
ok("the page consumes the schedule policy from that same read",
  /policy:slots\.schedule_policy\|\|null/.test(html));
ok("the published-times label follows the saved property horizon",
  /state\.slots\.length\+' next '\+draft\.horizon_days\+' days/.test(html));
ok("the fixed scheduler grid collapses for small screens",
  /@media\(max-width:820px\)\{\.tts-form\{grid-template-columns:1fr 1fr\}/.test(html));
ok("the screen does not invent a fallback operating timezone",
  !/state\.timezone\|\|'America\/New_York'/.test(html));
ok("the visual fixture is explicit and localhost-only",
  /psTourTimesLocalPreviewRequested/.test(html) && /\^\(localhost\|127\\\.0\\\.0\\\.1\)\$/.test(html)
    && /get\('tour-times'\)==='1'/.test(html));
ok("staff can reach Tour Times when the daily board read is unavailable",
  /Tours unavailable[\s\S]{0,700}onclick="psTourTimesPage\(\)"/.test(html));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
