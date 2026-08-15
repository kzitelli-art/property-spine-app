#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

let passed = 0;
let failed = 0;
const failures = [];

function ok(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log("  ok    " + label);
  } else {
    failed += 1;
    failures.push(label + (detail ? " :: " + detail : ""));
    console.log("  FAIL  " + label + (detail ? "\n        " + detail : ""));
  }
}

function sliceFrom(start, end) {
  const i = SRC.indexOf(start);
  if (i < 0) return "";
  const j = end ? SRC.indexOf(end, i) : -1;
  return SRC.slice(i, j > i ? j : undefined);
}

console.log("\n  LANDING ASSET MANAGEMENT DOOR PROOF\n");

const auth = sliceFrom("function egEnterAuthorized(grant)", "// Return to the front door");
const boot = sliceFrom("async function egBoot()", "// PRIMARY: staff sign-in");
const startApp = sliceFrom("async function startApp()", "// -- MODULE VISIBILITY");
const visibility = sliceFrom("function applyModuleVisibility(allowed)", "// -- gear menu");
const finalHubStart = SRC.lastIndexOf("window.pvRenderHub=function()");
const finalHub = finalHubStart >= 0
  ? SRC.slice(finalHubStart, SRC.indexOf("};", finalHubStart) + 2)
  : "";
const finalIconStart = SRC.lastIndexOf("function deskIcon(kind)");
const finalIcon = finalIconStart >= 0
  ? SRC.slice(finalIconStart, SRC.indexOf("function deskCard", finalIconStart))
  : "";

ok("OTP sign-in keeps the server module grant",
  /allowed_modules:Array\.isArray\(grant\.allowed_modules\)\?grant\.allowed_modules\.slice\(\):\[\]/.test(auth));
ok("first-login start applies module visibility before the home renders",
  startApp.indexOf("applyModuleVisibility(_egAuthScope.allowed_modules)") >= 0
    && startApp.indexOf("applyModuleVisibility(_egAuthScope.allowed_modules)") < startApp.indexOf("await loadApp(true)"));
ok("Asset Management starts hidden until an entitlement says otherwise",
  /id="deskCardAssetManagement" class="desk-card module-hidden"/.test(SRC));
ok("module visibility knows the Asset Management card",
  /asset_management:'own-asset_management'/.test(visibility));
ok("module visibility accepts hyphenated asset-management grants too",
  /replace\(\/-\/g,'_'\)/.test(visibility));
ok("restored sessions use the same module visibility path as first login",
  !/deskCardAssetManagement/.test(boot));

const hubCards = Array.from(finalHub.matchAll(/deskCard\('([^']+)'/g)).map((m) => m[1]);
ok("the winning hub has exactly the four operating doors",
  hubCards.join(",") === "management,leasing,maintenance,asset_management",
  hubCards.join(","));
ok("the winning hub no longer substitutes Reporting for Asset Management",
  !/deskCard\('reporting','Reporting','Performance and close'\)/.test(finalHub));
ok("the winning hub gives Asset Management its own icon",
  /kind==='asset_management'/.test(finalIcon));
ok("path-to-work taps can jump to Asset Management",
  /'Asset Management':'asset_management'/.test(SRC));
ok("querystring routing accepts asset management",
  /asset_management:'asset_management'/.test(startApp)
    && /'asset-management':'asset_management'/.test(startApp));
ok("hash routing accepts asset management",
  /if\(desk === 'asset-management'\) desk = 'asset_management';/.test(SRC)
    && /KNOWN_DESKS = \[[^\]]*'asset_management'/.test(SRC));

console.log("\n  RESULT");
console.log("  assertions passed: " + passed);
console.log("  assertions failed: " + failed);
if (failures.length) {
  console.log("\n  FAILURES:");
  failures.forEach((f) => console.log("   - " + f));
}
process.exit(failed ? 1 : 0);
