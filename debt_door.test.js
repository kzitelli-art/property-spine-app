"use strict";

const fs = require("fs");
const path = require("path");
const read = (name) => fs.readFileSync(path.join(__dirname, name), "utf8");
const DOOR = read("asset-management-door.js");
const INDEX = read("index.html");

let passed = 0;
let failed = 0;
const failures = [];
function ok(label, condition) {
  if (condition) passed += 1;
  else { failed += 1; failures.push(label); }
}

ok("Debt is an enabled Capital Stack compartment",
  /COMPARTMENT_SURFACES\s*=\s*\{[^}]*debt:\s*true/.test(DOOR));
ok("the shell loads governed Debt standing",
  /assetManagementDebt\(\)/.test(DOOR));
ok("the live route is fixed under the operator Debt namespace",
  /path:\s*function\(\)\{\s*return '\/operator\/debt\/standing';\s*\}/.test(INDEX));
ok("the browser cannot supply property authority to the Debt read",
  !/assetManagementDebt[\s\S]{0,500}\bproperty_id\b/.test(INDEX));
ok("Debt exposes no browser write action",
  !/assetManagementDebt(?:Confirm|Establish|Correct|Write)/.test(INDEX));
ok("observed and projected principal remain separate",
  /Principal \(observed\)/.test(DOOR) && /Principal \(projected\)/.test(DOOR));
ok("projected principal names its as-of date",
  /projected to/.test(DOOR));
ok("floating-rate structure does not impersonate an effective rate",
  /Rate formula/.test(DOOR) && /effective rate not established/.test(DOOR));
ok("debt service is explicitly principal and interest",
  /Debt service \(P&I\)/.test(DOOR) && /excludes escrow \/ reserves/.test(DOOR));
ok("maturity and an unexercised extension remain separate",
  /Maturity/.test(DOOR) && /Extension option/.test(DOOR));
ok("escrow and reserve balances retain their own classes",
  /Tax Escrow/.test(DOOR) && /Insurance Escrow/.test(DOOR)
    && /Replacement Reserve/.test(DOOR) && /Debt Service Reserve/.test(DOOR));
ok("a missing canonical instrument fails honestly",
  /data-am-debt-standing="not_established"/.test(DOOR));
ok("the Debt asset cache key advances with the release",
  /asset-management-door\.js\?v=debt-release-1/.test(INDEX));

console.log("\nDEBT DOOR");
console.log(`\n  assertions passed: ${passed}`);
console.log(`  assertions failed: ${failed}`);
failures.forEach((label) => console.error("   x " + label));
process.exitCode = failed ? 1 : 0;
