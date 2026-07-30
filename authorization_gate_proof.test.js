// ════════════════════════════════════════════════════════════════════
//  authorization_gate_proof.test.js — A REAL SESSION IS THE AUTHORITY
//
//    node authorization_gate_proof.test.js
//
//  WHY THIS EXISTS. Every unit-turn surface shipped to production with:
//
//      window.__OFFLINE_MODE !== true && ... hasSession()
//
//  `__OFFLINE_MODE` is assigned `true` unconditionally at index.html:4430
//  and is never cleared. So authorized() could NEVER return true, and all
//  six surfaces told a genuinely signed-in operator "Not signed in." The
//  whole feature was dark in production and no harness noticed, because
//  every harness reads source text and none had ever EVALUATED the gate.
//
//  So this one evaluates it. It extracts the real authorized() body from
//  each shipped file and runs it against fake globals, both ways.
// ════════════════════════════════════════════════════════════════════

"use strict";
const fs = require("fs");
const path = require("path");

const FILES = ["unit-turn-page.js", "unit-triage-door.js", "turn-scope-door.js",
               "work-acceptance-door.js", "readiness-door.js", "staff-agent-door.js"];

let passed = 0, failed = 0; const fails = [];
const ok = (n, c, d) => { if (c) passed++; else { failed++; fails.push(n + (d ? "  — " + d : "")); } };

for (const f of FILES) {
  const src = fs.readFileSync(path.join(__dirname, f), "utf8");
  const m = src.match(/function authorized\(\)\s*\{[\s\S]*?\n  \}/);
  if (!m) { ok(`${f}: authorized() found`, false); continue; }
  // Strip comments so prose about the flag cannot satisfy or break the test.
  const body = m[0].split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");

  const run = (globals) => {
    const fn = new Function("window", `${body}; return authorized();`);
    return !!fn(globals);
  };
  const session    = { __psLive: { hasSession: () => true } };
  const noSession  = { __psLive: { hasSession: () => false } };
  const noLive     = {};

  //  THE REGRESSION. The preview flag is set true in the shipped app, so a
  //  gate that consults it is a gate that can never open.
  ok(`${f}: a signed-in operator IS authorized even with __OFFLINE_MODE true`,
     run({ ...session, __OFFLINE_MODE: true }),
     "authorized() returned false for a real session — the preview flag is gating live access again");

  ok(`${f}: a signed-in operator is authorized`, run(session));
  ok(`${f}: no session is NOT authorized`, !run(noSession));
  ok(`${f}: absent __psLive is NOT authorized`, !run(noLive));

  //  Stated directly, so the failure message names the cause.
  ok(`${f}: authorized() does not consult __OFFLINE_MODE`,
     !/__OFFLINE_MODE/.test(body),
     "the preview flag is back in the executable gate");
}

console.log("\n" + "═".repeat(64));
console.log("  assertions passed: " + passed);
console.log("  assertions failed: " + failed);
if (failed) { console.log("\n  FAILED:"); fails.forEach((x) => console.log("   ✗ " + x)); }
console.log("═".repeat(64));
console.log(`
  Proof ceiling: the shipped authorized() bodies were EXECUTED against fake
  globals. That is stronger than the source-text checks that missed this
  defect, and still weaker than a real browser session — no live property,
  no authenticated session and no API were involved.
`);
process.exit(failed ? 1 : 0);
