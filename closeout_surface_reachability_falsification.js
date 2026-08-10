#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   FALSIFYING THE REACHABILITY TRACE

   closeout_surface_reachability.test.js reports STRANDED and exits 0.
   That is worth exactly nothing until the same tool is shown going RED
   on a tree where the drawer IS reachable — otherwise "19 passed" is a
   statement about the tool's optimism, not about the product.

   Each mutation below re-wires index.html the way a future change might,
   runs the real tool against the mutated copy, and requires a specific
   assertion to fail. The original file is never written to.

       node closeout_surface_reachability_falsification.js
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const SRC = path.join(__dirname, "index.html");
const TOOL = path.join(__dirname, "closeout_surface_reachability.test.js");
const original = fs.readFileSync(SRC, "utf8");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "closeout-falsify-"));

let pass = 0, fail = 0;
const ok = (l, c, d) => {
  if (c) { pass++; console.log("  ok    " + l); }
  else { fail++; console.log("  FAIL  " + l + (d ? "\n        " + d : "")); }
};

function runOn(html) {
  const f = path.join(tmp, "index.html");
  fs.writeFileSync(f, html);
  try {
    const out = execFileSync(process.execPath, [TOOL], {
      env: Object.assign({}, process.env, { CLOSEOUT_TRACE_SRC: f }),
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return { out, code: 0 };
  } catch (e) {
    return { out: String(e.stdout || "") + String(e.stderr || ""), code: e.status };
  }
}

console.log("\n" + "═".repeat(68));
console.log("  FALSIFICATION — the reachability trace must go red");
console.log("═".repeat(68) + "\n");

// ── F0 · the unmutated tree passes ──────────────────────────────────
const base = runOn(original);
ok("F0  the real tree passes and reports STRANDED",
   base.code === 0 && /VERDICT \.+ STRANDED/.test(base.out),
   `exit ${base.code}; every mutation below would be meaningless if this were already red`);

// ── F1 · route the live door back to the legacy dashboard ───────────
//  The most realistic regression: someone "restores" the old work-order
//  list, and with it every row that opens the retired drawer.
const m1 = original.replace(
  "if(key==='workorders'){ return openWorkOrdersDoor(); }",
  "if(key==='workorders'){ return renderMaintenanceWorkOrdersDashboard(lastMaintenance); }");
ok("F1a the mutation applied", m1 !== original);
const r1 = runOn(m1);
ok("F1b routing 'workorders' back to the legacy dashboard is caught",
   r1.code !== 0 && /FAIL  Q4[ac]/.test(r1.out),
   `exit ${r1.code} — the tool did not notice the retired drawer going live again`);
ok("F1c …and the verdict flips to REACHABLE",
   /VERDICT \.+ REACHABLE/.test(r1.out),
   "the verdict line still says STRANDED while a live key routes to the legacy list");

// ── F2 · delete the CSS rule that hides the maintenance lanes ───────
//  The quiet one. No JavaScript changes; the rows renderMaintenance
//  already writes simply become visible and clickable.
const HIDE = "body.maintenance-v6-mode #metrics,\nbody.maintenance-v6-mode .lanes{display:none!important}";
const m2 = original.replace(HIDE, "body.maintenance-v6-mode #metrics{display:none!important}");
ok("F2a the mutation applied", m2 !== original,
   "the hiding rule was not found in the expected form — the allowance in the tool " +
   "may be matching something that no longer exists");
const r2 = runOn(m2);
ok("F2b removing the lane-hiding CSS is caught",
   r2.code !== 0 && /FAIL  Q4a′-2/.test(r2.out),
   `exit ${r2.code} — a one-line CSS deletion made the retired control clickable and ` +
   "the tool stayed green");

// ── F3 · move a lane out of the .lanes section ──────────────────────
const m3 = original.replace('<div id="humanLane">', '<div id="humanLaneMoved">');
ok("F3a the mutation applied", m3 !== original);
const r3 = runOn(m3);
ok("F3b a lane container leaving the hidden section is caught",
   r3.code !== 0 && /FAIL  Q4a′-1/.test(r3.out),
   `exit ${r3.code} — the allowance still claims coverage for a container that moved`);

// ── F4 · remove the control entirely ────────────────────────────────
//  The opposite error. If someone deletes the not-done control too, the
//  trace must say so rather than reporting a clean STRANDED.
const m4 = original.replace(/Not 100% done/g, "Partially complete");
ok("F4a the mutation applied", m4 !== original);
const r4 = runOn(m4);
ok("F4b deleting the control being traced is caught",
   r4.code !== 0 && /FAIL  Q1a/.test(r4.out),
   `exit ${r4.code} — the tool traced a route to a control that is no longer there`);

// ── F5 · the tool never writes to the tree it reads ─────────────────
ok("F5  index.html is untouched after every mutation",
   fs.readFileSync(SRC, "utf8") === original);

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}

console.log("\n" + "═".repeat(68));
console.log(`  ${fail === 0 ? "✓ PASS" : "✗ FAIL"} — ${pass} passed, ${fail} failed`);
if (fail === 0) console.log("  The trace fails when it should. Its STRANDED verdict is evidence.");
console.log("═".repeat(68) + "\n");
process.exit(fail === 0 ? 0 : 1);
