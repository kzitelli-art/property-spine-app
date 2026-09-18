/* ══════════════════════════════════════════════════════════════════════════
   forward_semantics_are_the_servers.test.js — §14 / §14b / §34 / §45

   TWO SEMANTIC DECISIONS THE AUTHENTICATED BROWSER USED TO MAKE.

   §14 / §34 · WHO IS THE SAME HUMAN.
     _rrSameResident compared a few possible id fields and then FELL THROUGH
     TO NAME EQUALITY, and _rrForwardPosition spent that answer classifying a
     position as RENEWED rather than FUTURE_LEASED. Two leases for "John
     Smith" are not a renewal because the string matches. Name is a label
     (§0); it never establishes identity.

   §14b · WHETHER A PROPERTY RUNS A STUDENT LEASING CYCLE.
     _rrIsSoloContext answered with /solo|4233\s+chestnut/i over the property
     NAME. That is `if (property === "Solo")` in disguise, and it was wrong on
     the facts — Greenery and Skyline are student housing, do not match, and
     were denied the September planning date that matters most to them.
     Measured signed-in before the fix: targets 30/60/90/120, no September.

   Run:  node forward_semantics_are_the_servers.test.js
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("   PASS  " + m); } else { fail++; console.log("   FAIL  " + m); } };
function extract(name) {
  const m = new RegExp("function\\s+" + name + "\\s*\\(").exec(html);
  if (!m) throw new Error("not found: function " + name);
  const open = html.indexOf("{", m.index + m[0].length - 1);
  let d = 0, i = open;
  for (; i < html.length; i++) { if (html[i] === "{") d++; else if (html[i] === "}") { d--; if (!d) { i++; break; } } }
  return html.slice(m.index, i);
}
const sameResident = (signedIn) => new Function("_rrSignedIn", "_rrNameKey",
  extract("_rrSameResident") + "\nreturn _rrSameResident;")(
    () => signedIn, r => String(r && r.name || "").trim().toLowerCase());

console.log("\n== §14 / §34 · a name may not decide a renewal ==");
{
  const signed = sameResident(true);
  const A = { person_id: "p-aaa", name: "John Smith" };
  const B = { person_id: "p-bbb", name: "John Smith" };
  const A2 = { person_id: "p-aaa", name: "J. Smith" };
  const noId1 = { name: "John Smith" }, noId2 = { name: "John Smith" };

  ok(signed(A, A2) === true, "the SAME durable Person is the same, whatever the name says");
  ok(signed(A, B) === false, "two different Persons with the SAME NAME are not the same");
  ok(signed(noId1, noId2) === null,
    "no identity signed in returns null — Spine does not know, which is not 'somebody else'");
  ok(signed(noId1, noId2) !== true, "and above all it is not a renewal");

  const preview = sameResident(false);
  ok(preview(noId1, noId2) === true,
    "§16 — preview keeps the legacy name predicate for id-less fixtures");
  ok(preview(A, B) === false, "even preview honours ids when both carry them");
}

console.log("\n== §14 · the classifier has a third branch for the third answer ==");
{
  const src = extract("_rrForwardPosition");
  ok(/same===true/.test(src), "renewed requires an explicit TRUE");
  ok(/same===null/.test(src) && /successor_identity_unresolved/.test(src),
    "null becomes its own category, not 'future_leased' by omission");
  ok(!/category=same\?'renewed':'future_leased'/.test(src.replace(/\s/g, "")),
    "the old two-way collapse is gone");
}

console.log("\n== §14b · the leasing cycle is configuration, not a name ==");
{
  const isSolo = new Function("_rrSignedIn", "SOLO_ID",
    extract("_rrIsSoloContext") + "\nreturn _rrIsSoloContext;");
  const signed = isSolo(() => true, "solo-id");
  ok(signed("anything") === false, "signed in, the property-name path is unreachable");
  ok(signed("solo-id") === false, "even the Solo id does not re-open it under a session");
  const preview = isSolo(() => false, "solo-id");
  ok(preview("solo-id") === true, "preview still recognises its own fixture by ID");
  ok(preview("greenery-1325") === false, "and only by id — no name matching anywhere");

  const src = extract("_rrIsSoloContext");
  ok(!/4233/.test(src) && !/test\(String\(sm/.test(src),
    "the address regex and the sessionMeta name probe are both gone");

  const targets = new Function("_rrSignedIn", "_rrLeasingCycle", "_rrMetaForId", "_rrDate",
    "_rrAddDays", "_rrISO", "_rrIsSoloContext", "window",
    extract("_rrPlanningTargets") + "\nreturn _rrPlanningTargets;");
  const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
  const iso = d => d.toISOString().slice(0, 10);
  const cfg = { kind: "student", anchor_month: 9, anchor_day: 1, label: "September 1" };
  const withCycle = targets(() => true, () => cfg, () => ({ as_of: "2026-08-31" }),
    v => v ? new Date(v) : null, addDays, iso, () => false, { __offlinePid: () => "p" });
  const out = withCycle("p");
  const cycle = out.find(t => t.key === "cycle");
  ok(!!cycle, "a configured cycle produces an anchor target");
  ok(cycle && cycle.cycle_source === "property_configuration", "and it says where it came from");
  ok(cycle && /^\d{4}-09-01$/.test(cycle.iso), "anchored on the configured month and day");
  ok(cycle && new Date(cycle.iso) > new Date(), "and it is in the FUTURE, not the import's past");

  const noCycle = targets(() => true, () => null, () => ({ as_of: "2026-08-31" }),
    v => v ? new Date(v) : null, addDays, iso, () => false, { __offlinePid: () => "p" })("p");
  ok(!noCycle.some(t => t.key === "cycle"),
    "NOT CONFIGURED produces no cycle target — never an inferred one");
  ok(noCycle.length === 4, "just the rolling horizons");
}

console.log("\n== the planning base is the operating present, not the import date ==");
{
  const src = extract("_rrPlanningTargets");
  ok(/signedIn \? new Date\(\)/.test(src),
    "signed in, horizons are measured from now");
  ok(/_rrDate\(meta\.as_of\)/.test(src) && /signedIn \?/.test(src),
    "preview keeps the fixture's frozen as_of on the other branch");
}

console.log("\n== §45 · the removed semantics may not creep back ==");
{
  const src = html.split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  ok(!/an&&bn&&an===bn/.test(src.replace(/\s/g, "").replace(/\/\*[\s\S]*?\*\//g, "")) ||
     /_rrSignedIn\(\)\)\{/.test(extract("_rrSameResident")),
    "name equality survives only behind the session check");
  ok(!/4233\\s\+chestnut/.test(src), "no property-address regex anywhere in live source");
}

console.log("\n== " + pass + " passed, " + fail + " failed ==\n");
process.exit(fail ? 1 : 0);
