"use strict";

const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

let passed = 0;
let failed = 0;
function ok(condition, message) {
  if (condition) {
    passed++;
    console.log("   PASS  " + message);
  } else {
    failed++;
    console.log("   FAIL  " + message);
  }
}

const registryStart = html.indexOf("var WRITE_ACTIONS");
const registry = html.slice(registryStart, html.indexOf("async function writeAction", registryStart));
const panelStart = html.indexOf("function psArExecutionPanel(d)");
const panel = html.slice(panelStart, html.indexOf("async function psArConfirmTerm", panelStart));
const signStart = html.indexOf("async function psArCompanySign(appId)");
const sign = html.slice(signStart, html.indexOf("function psArEphemeral", signStart));

console.log("\n== live company-sign door ==");
ok(/companySignLeasePacket:\s*\{/.test(registry), "company signing is a registered live write");
ok(/lease-packets\/.*company-sign/.test(registry), "the write uses the canonical packet endpoint");
ok(/companySignLeasePacket: function\(params\)\{ return writeAction\('companySignLeasePacket'/.test(html),
  "the sealed live client exposes that registered write");

console.log("\n== server-authored execution states ==");
ok(/await_resident_execution/.test(panel) && /waiting for every required resident-side signer/.test(panel),
  "waiting for the resident is an understood non-action state");
ok(/company_execute_lease/.test(panel) && /Sign for the Company/.test(panel),
  "resident completion reveals the company-sign action");
ok(/xa\.action === 'company_execute_lease'/.test(panel) && /psArCompanySign/.test(panel),
  "the button is rendered only for the known server action");

console.log("\n== consequential action stays honest ==");
ok(signStart > 0, "the company-sign controller exists");
ok(/xa\.action!==['"]company_execute_lease['"]/.test(sign),
  "a stale review cannot invoke the action");
ok(/xa\.endpoint&&xa\.endpoint!==expected/.test(sign),
  "the displayed packet must match the server-selected endpoint");
ok(/window\.confirm/.test(sign), "company signing requires explicit confirmation");
ok(/companySignLeasePacket/.test(sign), "the controller calls the one live write");
ok(/await psOpenApplicationReview\(appId\)/.test(sign),
  "success rereads canonical application and lease truth");
ok(!/status\s*=|lease_status\s*=|resident_executed\s*=/.test(sign),
  "the browser never fabricates an executed state");

console.log(`\n==== ${passed} passed, ${failed} failed ====\n`);
process.exit(failed ? 1 : 0);
