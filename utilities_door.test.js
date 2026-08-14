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
ok("the door presents every service once in a compact setup roster",
  /data-ut-setup=/.test(DOOR) && /<h3>Service map<\/h3>/.test(DOOR));
ok("the door uses governed counts without a fake completion percentage",
  !/role="progressbar"|ut-progress|classifiedCount\s*\//.test(DOOR));
ok("an established arrangement is prefilled and compared before a replacement write",
  /currentArrangement\.physical_arrangement/.test(DOOR)
  && /var arrangementChanged/.test(DOOR));
ok("new accounts and provider meters retain an established provider identity",
  /body\.account\.provider_id = selectedProviderId/.test(DOOR)
  && /body\.meter\.provider_id = selectedProviderId/.test(DOOR));
ok("a new provider takes precedence over a preselected established provider",
  /selectedProviderId && !newProviderName/.test(DOOR));
ok("a no-op review cannot produce a recorded-fact receipt",
  /Change at least one Utility setup fact before recording/.test(DOOR));
ok("switching services reloads that service's own current setup",
  /psUtilitiesChooseService\(this\.value\)/.test(DOOR)
  && /window\.psUtilitiesChooseService = chooseService/.test(DOOR));
ok("setup corrections survive validation and write failures",
  /function setupDraftFromForm\(\)/.test(DOOR)
  && /setupDraftFromForm\(\);[\s\S]{0,300}var serviceClass/.test(DOOR));
ok("full service dossiers are limited to present services",
  /presentServices\.map\(serviceRow\)/.test(DOOR));
ok("empty account truth does not render an empty section",
  /var accountSection = hasAccounts/.test(DOOR));
ok("statement entry waits for a governed provider account",
  /Establish a provider account before adding a statement/.test(DOOR));
ok("statement usage choices are constrained by the selected provider account",
  /function statementMappings\(accountId\)/.test(DOOR)
  && /psUtilitiesChooseStatementAccount\(this\.value\)/.test(DOOR)
  && /Choose a service and meter mapped to this provider account/.test(DOOR));
ok("statement corrections survive validation and write failures",
  /function statementDraftFromForm\(\)/.test(DOOR)
  && /statementDraftFromForm\(\);[\s\S]{0,300}var billed/.test(DOOR));
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
ok("Ask Spine renders server-provided references", /_asReferences\(d\.references\)/.test(INDEX));
ok("Ask Spine reference values remain data, not interpolated JavaScript",
  /data-as-kind/.test(INDEX) && /data-as-target/.test(INDEX)
  && /_asOpen\(this\.dataset\.asKind,this\.dataset\.asTarget\)/.test(INDEX));

ok("the Utility door creates no tasks", !/createTask|task_id|obligation/i.test(DOOR));
ok("the Utility door records no payment", !/recordPayment|payment_id|paid_at|paid_cents/i.test(DOOR));
ok("the Utility door carries no fixture fallback", !/fixture|demoData|sampleData|mockData/i.test(DOOR));
ok("unit and space points are not offered without authoritative selectors",
  !/\["unit",\s*"Unit"\]|\["space",\s*"Space"\]/.test(DOOR));

console.log("\n  assertions passed: " + passed);
console.log("  assertions failed: " + failed);
failures.forEach((label) => console.log("   x " + label));
process.exit(failed ? 1 : 0);
