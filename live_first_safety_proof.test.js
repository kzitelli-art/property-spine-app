// ════════════════════════════════════════════════════════════════════
//  live_first_safety_proof.test.js — S2: NO FIXTURE BEHIND A SESSION
//
//  Pins the five S2 corrections. Each guarded a path where a SIGNED-IN
//  operator could meet fixture data or a runtime exception. Source-level
//  pins; the gate itself is EXECUTED by authorization_gate_proof.
// ════════════════════════════════════════════════════════════════════
"use strict";
const fs = require("fs");
const read = (f) => fs.readFileSync(require("path").join(__dirname, f), "utf8");
const IDX = read("index.html"), LE = read("leasing-experience.js"), MV = read("moveins-door.js");
let passed = 0, failed = 0; const fails = [];
const ok = (n, c) => { if (c) passed++; else { failed++; fails.push(n); } };

// B — the Conversations error path calls a function that exists
ok("no call to the undefined _handleLiveError survives",
   !/_handleLiveError\s*\(/.test(IDX.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n")));
ok("both repaired catches route through _route(e)",
   (IDX.match(/_route\(e\);\s*\/\/ was _handleLiveError|_route\(e\);\n\s+\}\n\s+\}\n\s+\/\/ back-compat/g) || []).length >= 1 &&
   /defined NOWHERE/.test(IDX));

// A — move-ins authorizes from the session, not the preview flag
ok("moveins-door.js authorized() no longer consults __OFFLINE_MODE",
   !/__OFFLINE_MODE/.test(MV.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n")));

// C1 — demo tours never render behind a live session
ok("ps_demo_tours is refused when a live session exists",
   /hasSession\(\)\)\s*return false;[\s\S]{0,120}ps_demo_tours/.test(LE));

// C2 — fixture analytics never render behind a live session
ok("leasingAnalyticsData returns null for an authenticated scope",
   /_egAuthScope\.property_id\)\s*return null;[\s\S]{0,300}SOLO_LEAD_ANALYTICS/.test(IDX));

// C3 — an exception in the authed branch cannot reach the fixture pages
ok("openLeasingDash catch renders unavailable for a signed-in operator",
   /AN EXCEPTION IS NOT PERMISSION TO SHOW FIXTURES/.test(IDX) &&
   /This surface is unavailable/.test(IDX));

// C4 — the two fixture leaves are gated like their parent
ok("mk_survey and mk_listings are honestly gated when signed in",
   /_authed && \(key==='mk_survey' \|\| key==='mk_listings'\)/.test(IDX));

// D — deployed build identity is exposed
ok("build-info.js is loaded by the shell",
   /<script src="\.\/build-info\.js"><\/script>/.test(IDX));
ok("window.__PS_BUILD carries a code_sha",
   /__PS_BUILD = Object\.freeze\(\{\s*code_sha:/.test(read("build-info.js")));

console.log("\n  assertions passed: " + passed + "\n  assertions failed: " + failed);
if (failed) fails.forEach((f) => console.log("   ✗ " + f));
process.exit(failed ? 1 : 0);
