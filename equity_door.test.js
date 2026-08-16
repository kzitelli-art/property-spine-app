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
const capitalRoomStart = DOOR.indexOf("function capitalStackRoomHtml");
const capitalRoomEnd = DOOR.indexOf("function taxesHtml", capitalRoomStart);
const capitalRoomCode = DOOR.slice(capitalRoomStart, capitalRoomEnd);
const equityRoomStart = DOOR.indexOf("function equityRoomHtml");
const equityRoomEnd = DOOR.indexOf("function capitalStackRoomHtml", equityRoomStart);
const equityRoomCode = DOOR.slice(equityRoomStart, equityRoomEnd);

let passed = 0;
let failed = 0;
const failures = [];
function ok(label, condition) {
  if (condition) passed += 1;
  else { failed += 1; failures.push(label); }
}

ok("Debt and Equity are separate first-level Capital Stack doors",
  /debt:\s*true/.test(DOOR) && /equity:\s*true/.test(DOOR) &&
    /data-am-cs-door=/.test(DOOR) && /capitalStackDoorHtml\("debt"/.test(DOOR) &&
    /capitalStackDoorHtml\("equity"/.test(DOOR));
ok("Preferred and Common remain nested Equity class controls",
  /preferred_equity:\s*true/.test(DOOR) && /common_equity:\s*true/.test(DOOR) &&
    /c\.key === "preferred_equity" \|\| c\.key === "common_equity"/.test(equityRoomCode));
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
ok("Capital Stack composes the existing canonical Debt and Equity reads",
  /function loadCapitalStackSnapshot/.test(DOOR) && /Promise\.all\(\[/.test(DOOR) &&
    /assetManagementDebt\(\)/.test(DOOR) && /assetManagementEquity\(\)/.test(DOOR));
ok("door navigation reuses the fresh Capital Stack reads",
  /cached = state\.capitalStackData\.debt/.test(DOOR) &&
    /cached = state\.capitalStackData\.equity/.test(DOOR) &&
    /hasSession\(\) && !cached/.test(DOOR));
ok("a failed side remains distinct from an empty capital position",
  /The Equity read failed; no ownership conclusion was drawn/.test(DOOR) &&
    /The Debt read failed; existing positions may still exist/.test(DOOR) &&
    /Not established/.test(DOOR));
ok("the Capital Stack landing room stays at the Debt and Equity decision level",
  /capitalStackDoorsHtml\(data, errors\)/.test(capitalRoomCode) &&
    !/capitalStackEquityHtml/.test(capitalRoomCode) && !/capitalStackDebtHtml/.test(capitalRoomCode) &&
    !/capitalStackDebtMonitorHtml/.test(capitalRoomCode) && !/am-cs-details/.test(capitalRoomCode));
ok("the Equity door owns the institutional partner register",
  /capitalStackEquityHtml\(equity, false\)/.test(equityRoomCode) &&
    /Partner positions/.test(DOOR) && /Ownership/.test(DOOR) && /Class/.test(DOOR) &&
    /Key economics/.test(DOOR) && /data-am-cs-partner="1"/.test(DOOR));
ok("the Debt door owns forward coverage rather than the parent room",
  /debtHtml[\s\S]*capitalStackDebtMonitorHtml\(d\)/.test(DOOR) &&
    !/capitalStackDebtMonitorHtml/.test(capitalRoomCode));
ok("governed legal names win and attributed text is visibly qualified",
  /if \(holder\.legal_name\)/.test(DOOR) && /As stated/.test(DOOR));
ok("ownership reconciliation can never collapse incomplete and conflicted schedules",
  /100\.00% reconciled/.test(DOOR) && /recorded of 100%/.test(DOOR) &&
    /Conflicting ownership claims/.test(DOOR));
ok("forward DSCR stays absent until governed forward NOI exists",
  /DSCR not established/.test(DOOR) && /Contractual rent is not NOI/.test(DOOR) &&
    !/function\s+calculateDscr/i.test(DOOR));
ok("Equity class detail remains nested beneath the Equity door",
  /Class detail/.test(equityRoomCode) && /class="am-cs-details"/.test(equityRoomCode) &&
    /onclick="amOpenCompartment\(\\'equity\\'\)"/.test(DOOR));
ok("the released shell advances beyond the stale Debt-era asset key",
  /asset-management-door\.js\?v=capital-stack-2-institutional-2-separated-doors/.test(INDEX) &&
    !/asset-management-door\.js\?v=capital-stack-2-institutional-1/.test(INDEX));
ok("the loading state contains valid text encoding",
  /data-am-state="loading">Loading\.\.\.<\/div>/.test(DOOR) && !/Loadingâ/.test(DOOR));

console.log(`Equity door: ${passed}/${passed + failed}`);
if (failed) {
  failures.forEach((label) => console.error("FAIL: " + label));
  process.exit(1);
}
