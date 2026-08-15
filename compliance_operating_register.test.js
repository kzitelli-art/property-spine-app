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

const workspaceStart = DOOR.indexOf("function complianceWorkspaceHtml");
const workspaceEnd = DOOR.indexOf("function complianceHistoryHtml", workspaceStart);
const workspace = DOOR.slice(workspaceStart, workspaceEnd);

ok("Compliance renders one operating register",
  /data-am-view="compliance-register"/.test(workspace));
ok("the register is populated from canonical reader items",
  /var items = d\.items \|\| \[\]/.test(workspace) && /items\.map\(complianceRegisterRowHtml\)/.test(workspace));
ok("operational attention is counted only when canonically established",
  /item\.attention/.test(workspace) && /none_established/.test(workspace));
ok("date-only standing explicitly refuses to imply operational work",
  /No operational action has been established/.test(DOOR));
ok("unknown coverage does not become a no-requirements conclusion",
  /Missing rows are not treated as proof that no requirement exists/.test(workspace));
ok("property specimens do not become a hard-coded requirement catalog",
  !/Solo|Greenery|4125|facade|sprinkler|standpipe/i.test(workspace));
ok("the single evidence menu preserves five typed intake paths",
  (workspace.match(/amComplianceStartFromRegister/g) || []).length === 6 &&
  /License or registration[\s\S]*Certificate[\s\S]*Inspection result[\s\S]*Violation notice[\s\S]*Requirement decision/.test(workspace));
ok("a successful confirmation returns to the register for canonical reread",
  (DOOR.match(/state\.view = "compliance"; state\.compartment = null; state\.compartmentData = null;/g) || []).length >= 2 &&
  (DOOR.match(/await loadComplianceWorkspace\(\)/g) || []).length >= 3);
ok("Ask Spine record references enter the same Compliance register",
  /async function openComplianceReference\(token\)[\s\S]{0,220}state\.view = "compliance"/.test(DOOR));
ok("register references remain server-minted token openers",
  /referenceFor\(item, "canonical_record"\)/.test(DOOR) &&
  /referenceFor\(item, "source_artifact"\)/.test(DOOR));
ok("source openers reserve a tab before the governed fetch and close it on failure",
  /async function openComplianceSource\(token\)[\s\S]{0,500}window\.open\("about:blank", "_blank"\)[\s\S]{0,500}await window\.__psLive\.complianceSourceReference/.test(DOOR) &&
  /sourceWindow\.location\.replace\(opened\.objectUrl\)/.test(DOOR) &&
  /window\.location\.assign\(opened\.objectUrl\)/.test(DOOR) &&
  /if \(sourceWindow && !sourceWindow\.closed\) sourceWindow\.close\(\)/.test(DOOR));
ok("the register has stable desktop and mobile layout constraints",
  /\.am-compliance-summary\{display:grid;grid-template-columns:repeat\(4/.test(INDEX) &&
  /\.am-compliance-register-row\{display:grid/.test(INDEX) &&
  /@media\(max-width:720px\)[\s\S]*\.am-compliance-summary\{grid-template-columns:repeat\(2/.test(INDEX));
ok("the register does not send property or actor authority",
  !/complianceWorkspaceHtml[\s\S]{0,9000}\b(?:property_id|actor_user_id|authenticated_user_id)\b/.test(DOOR));

console.log(`Compliance operating register: ${passed}/${passed + failed}`);
if (failed) {
  failures.forEach((label) => console.error("FAIL: " + label));
  process.exit(1);
}
