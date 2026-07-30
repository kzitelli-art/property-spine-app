// ════════════════════════════════════════════════════════════════════
//  leasing_home_truth_proof.test.js — S3: THE TRUTHFUL LEASING HOME
//
//  Pins the final architecture (briefing · four doors · full-width Market &
//  Pricing · Applications Review reachable) and the truth rules: facts only
//  from the four registered liveRequired reads, ruled wording, no browser-
//  authored next action, honest unavailable per card, retry that resets.
// ════════════════════════════════════════════════════════════════════
"use strict";
const fs = require("fs"), path = require("path");
const IDX = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const LE  = fs.readFileSync(path.join(__dirname, "leasing-experience.js"), "utf8");
let passed = 0, failed = 0; const fails = [];
const ok = (n, c) => { if (c) passed++; else { failed++; fails.push(n); } };

// The authed home block, isolated.
const HOME = IDX.slice(IDX.indexOf("if(_leAuthed){"), IDX.indexOf("function leasingRentTrendData"));
// The summaries layer, isolated.
const SUM_RAW0 = LE.slice(LE.indexOf("S3 HOME SUMMARIES"), LE.indexOf("function enhanceHome"));
// The slice starts INSIDE the banner block comment — drop through its close
// first, or the stripper below never sees an opener for it.
const SUM_RAW = SUM_RAW0.slice(SUM_RAW0.indexOf("*/") + 2);
// Comments quote the ruling ("never 'need you'") — prose must not satisfy or
// fail a wording assertion about the rendered copy. Strip them first.
const SUM = SUM_RAW.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/[^'"]*$/, "")).join("\n");

// ── architecture ──
ok("four doors, in ruled order: tours, conversations, followups, renewals",
   /_authCard\('Today · next 7 days', 'Tours'[\s\S]*?'conversations', true\)[\s\S]*?'followups', true\)[\s\S]*?'renewals', true\)/.test(HOME));
ok("Renewals door is TRUE — the connected:false lie is gone",
   !/'renewals', false\)/.test(HOME));
ok("Availability is no longer a grid card",
   !/_authCard\([^)]*'Availability'/.test(HOME));
ok("the briefing container renders above the grid",
   /data-le-briefing[\s\S]*?maint-primary-grid/.test(HOME));
ok("Market & Pricing is a full-width strip beneath the grid, opening 'market'",
   /maint-primary-grid[\s\S]*?id="leMarketDoor"[\s\S]*?openLeasingDash\(\\'market\\'\)/.test(HOME));
ok("Applications Review row remains in the authed home",
   /le-review-row[\s\S]*?applications_review/.test(HOME));
ok("market delegates to the live Availability destination (workspace is S7)",
   /key==='market'\)\{[\s\S]{0,700}?return openLeasingDash\('availability'\);/.test(IDX));

// ── enhanceHome keeps the architecture ──
ok("enhanceHome requires and keeps the renewals card",
   /var renewals=findCard\(cards,'renewals'\);/.test(LE) &&
   /card!==tours && card!==work && card!==conversations && card!==renewals/.test(LE));
ok("enhanceHome no longer removes the Applications Review row",
   !/le-review-row'\)\)\.forEach\(function\(n\)\{ n\.remove/.test(LE) &&
   /REMAINS REACHABLE/.test(LE));

// ── truth rules ──
ok("summaries read exactly the four registered liveRequired resources",
   /SUM_KEYS=\['conversationQueue','leasingDesk','renewals','availabilityCanonical'\]/.test(LE));
ok("ruled wording: 'need attention' — never a broad 'need you'",
   /need attention/.test(SUM) && !/need you/i.test(SUM));
ok("no browser-authored next action in the briefing",
   !/Next:/.test(SUM));
ok("every domain has an honest unavailable line",
   /Conversation status unavailable\./.test(SUM) &&
   /Leasing work unavailable\./.test(SUM) &&
   /Renewals unavailable\./.test(SUM) &&
   /Availability unavailable\./.test(SUM) &&
   /Leasing briefing unavailable\./.test(SUM));
ok("honest empty lines per ruling",
   /No conversations need attention\./.test(SUM) &&
   /No new-leasing work needs action\./.test(SUM) &&
   /No renewal actions are due\./.test(SUM) &&
   /Nothing needs immediate attention\./.test(SUM));
ok("a failed read never renders a zero (guards return unavailable, not 0)",
   !/err\.[a-zA-Z]+ \? '<b>0<\/b>/.test(SUM));
ok("retry resets state and refetches — briefing and tours both",
   /refresh:function\(\)\{ liveSum\.state='idle'/.test(LE) &&
   /retryTours:function\(\)\{ liveTours\.state='idle'/.test(LE) &&
   /psx-tours-retry/.test(LE));
ok("tours bucket by SERVER operating_date when the window is present",
   /win\.today_date/.test(LE) && /operating_date\)/.test(LE));
ok("no hardcoded operating counts in the summaries layer",
   !/<b>(10|36|283|4)<\/b>/.test(SUM));

// ── S1/S2 invariants untouched ──
ok("S1 property-context module still loaded",
   /<script src="\.\/authoritative-property-context\.js"><\/script>/.test(IDX));
ok("S2 mk gates intact (survey/listings honest when signed in)",
   /key==='mk_survey' \|\| key==='mk_listings'/.test(IDX));

console.log("\n  assertions passed: " + passed + "\n  assertions failed: " + failed);
if (failed) fails.forEach((f) => console.log("   ✗ " + f));
process.exit(failed ? 1 : 0);
