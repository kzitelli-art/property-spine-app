"use strict";

const fs = require("fs");
const path = require("path");
const read = (name) => fs.readFileSync(path.join(__dirname, name), "utf8");
const DOOR = read("utilities-door.js");
const SHELL = read("asset-management-door.js");
const INDEX = read("index.html");

let passed = 0;
let failed = 0;
const failures = [];
function ok(label, condition) {
  if (condition) passed += 1;
  else { failed += 1; failures.push(label); }
}

ok("Utilities is an enabled Property Expenses compartment",
  /COMPARTMENT_SURFACES\s*=\s*\{[^}]*utilities:\s*true/.test(SHELL));
ok("the shell loads the governed Utility resource",
  /assetManagementUtilities\(\{\}\)/.test(SHELL));
ok("the shell delegates Utility rendering to its owned door",
  /__psUtilitiesDoor\.render\(state\.compartmentData\)/.test(SHELL));
ok("the Utility door loads before the Asset Management shell",
  INDEX.indexOf('<script src="utilities-door.js">') < INDEX.indexOf('<script src="asset-management-door.js">'));

ok("the read route is fixed under the operator Utility namespace",
  /'\/operator\/asset-management\/utilities'/.test(INDEX));
ok("the evidence write route is fixed",
  /'\/operator\/asset-management\/utilities\/evidence'/.test(INDEX));
ok("the atomic setup write route is fixed",
  /'\/operator\/asset-management\/utilities\/setup'/.test(INDEX));
ok("the statement write route is fixed",
  /'\/operator\/asset-management\/utilities\/statements'/.test(INDEX));
ok("the browser does not send property authority in Utility bodies",
  !/assetManagementUtility(?:Setup|Statement)[\s\S]{0,1800}\bproperty_id\b/.test(INDEX));
ok("the browser does not send actor authority in Utility bodies",
  !/assetManagementUtility(?:Setup|Statement)[\s\S]{0,1800}\buser_id\b/.test(INDEX));

ok("the door renders the service map", /data-ut-section="service-map"/.test(DOOR));
ok("the door groups accounts and meters", /data-ut-section="accounts"/.test(DOOR));
ok("the door renders unresolved setup questions", /data-ut-section="gaps"/.test(DOOR));
ok("the door keeps provider bill, economic responsibility, and resident payment roles visible",
  /receives the provider bill/.test(DOOR) && /economic responsibility/.test(DOOR)
  && /receives resident payments/.test(DOOR) && /Administered by/.test(DOOR));
ok("setup is one named atomic action", /assetManagementUtilitySetup\(body\)/.test(DOOR));
ok("statement evidence is retained before fact confirmation",
  DOOR.indexOf("assetManagementUtilityEvidence({") < DOOR.indexOf("assetManagementUtilityStatement(body)"));
ok("provider payment remains explicitly unestablished",
  /Provider payment remains not established/.test(DOOR));
ok("the retained artifact opener is wired", /assetManagementUtilityEvidenceOpen/.test(DOOR));
ok("Ask Spine recognizes only the minted Utility evidence reference kind",
  /kind === 'utility_evidence'/.test(INDEX));
ok("Ask Spine renders server-provided references", /\(d\.references \|\| \[\]\)/.test(INDEX));
ok("Ask Spine reference values remain data, not interpolated JavaScript",
  /data-as-ref-kind/.test(INDEX) && /data-as-ref-id/.test(INDEX)
  && /_asOpen\(this\.getAttribute/.test(INDEX));

ok("the Utility door creates no tasks", !/createTask|task_id|obligation/i.test(DOOR));
ok("the Utility door records no payment", !/recordPayment|payment_id|paid_at|paid_cents/i.test(DOOR));
ok("the Utility door carries no fixture fallback", !/fixture|demoData|sampleData|mockData/i.test(DOOR));
ok("unit and space points are not offered without authoritative selectors",
  !/\["unit",\s*"Unit"\]|\["space",\s*"Space"\]/.test(DOOR));

console.log("\n  assertions passed: " + passed);
console.log("  assertions failed: " + failed);
failures.forEach((label) => console.log("   x " + label));
process.exit(failed ? 1 : 0);
