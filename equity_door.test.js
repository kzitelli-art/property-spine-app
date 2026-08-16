"use strict";

const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.join(__dirname, name), "utf8");
const DOOR = read("asset-management-door.js");
const INDEX = read("index.html");
const preferredStart = DOOR.indexOf("function equityPreferredSectionHtml");
const preferredEnd = DOOR.indexOf("function equityCapitalAmountsHtml", preferredStart);
const preferredCode = DOOR.slice(preferredStart, preferredEnd)
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

let passed = 0;
let failed = 0;
const failures = [];
function ok(label, condition) {
  if (condition) passed += 1;
  else { failed += 1; failures.push(label); }
}

ok("Preferred and Common Equity are separate Capital Stack controls",
  /preferred_equity:\s*true/.test(DOOR) && /common_equity:\s*true/.test(DOOR));
ok("both controls read one canonical Equity endpoint",
  /assetManagementEquity:\s*function/.test(INDEX) &&
    /return '\/operator\/equity\/standing'/.test(INDEX));
ok("the browser sends no property authority to the Equity read",
  !/assetManagementEquity[\s\S]{0,500}\bproperty_id\b/.test(INDEX));
ok("the class split happens over the shared canonical response",
  /position_class === "preferred"/.test(DOOR) && /position_class === "common"/.test(DOOR));
ok("an empty class stays honestly not established",
  /data-am-equity-standing="not_established"/.test(DOOR) &&
    /Spine holds no governed " \+ label\.toLowerCase\(\) \+ " position/.test(DOOR));
ok("accrued preferred return is never computed in the browser",
  /Accrued preferred balance: NOT ESTABLISHED/.test(DOOR) &&
    !/accrued_preferred_return/.test(preferredCode) &&
    !/(?:current_pay_rate_bp|accrued_rate_bp)\s*\*/.test(preferredCode));
ok("unexecuted overrides remain visible without becoming current terms",
  /surfaced_not_applied/.test(DOOR) && /Recorded, not yet applied/.test(DOOR) &&
    /data-am-override-pending="1"/.test(DOOR));
ok("coverage gaps and conflicts remain visible",
  /coverage_gaps/.test(DOOR) && /conflicts/.test(DOOR));
ok("the released shell advances beyond the stale Debt-era asset key",
  /asset-management-door\.js\?v=capital-stack-2/.test(INDEX) &&
    !/asset-management-door\.js\?v=debt-layered-1/.test(INDEX));
ok("the loading state contains valid text encoding",
  /data-am-state="loading">Loading\.\.\.<\/div>/.test(DOOR) && !/Loadingâ/.test(DOOR));

console.log(`Equity door: ${passed}/${passed + failed}`);
if (failed) {
  failures.forEach((label) => console.error("FAIL: " + label));
  process.exit(1);
}
