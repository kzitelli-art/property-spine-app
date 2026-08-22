/* Governing lease setup surface contract. Run: node lease_configuration_app.test.js */
"use strict";

const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
let passed = 0;
let failed = 0;
function ok(condition, message) {
  if (condition) {
    passed++;
    console.log("  PASS  " + message);
  } else {
    failed++;
    console.error("  FAIL  " + message);
  }
}

console.log("\nGoverning lease setup surface");
ok(/leaseConfiguration:[\s\S]{0,180}\/operator\/leasing\/lease-configuration/.test(src),
  "application review reads the property-scoped lease configuration");
ok(/establishLeaseTemplate:[\s\S]{0,220}\/operator\/leasing\/lease-configuration\/template/.test(src),
  "the setup write uses the one canonical template route");
ok(/var fd = new FormData\(\)/.test(src) && /x-staff-session/.test(src),
  "the exact file and staff session travel together in one multipart write");
ok(/if\(!canConfigure\)/.test(src) && /authorized management user must complete lease setup/.test(src),
  "users without management authority see status without a dead setup form");
ok(/Official lease form/.test(src) && /accept="\.docx,\.pdf/.test(src),
  "the surface asks for the exact Word or PDF governing source");
ok(/Landlord entity/.test(src) && /Lease-term utility fee/.test(src)
    && /Renewal \/ move-out notice/.test(src),
  "the property terms needed for deterministic packages are explicit");
ok(/confirm_company_signer:true/.test(src)
    && /authorized to countersign leases for this property/.test(src),
  "company signer authority is an explicit signed-in confirmation");
ok(/ask_parking_interest/.test(src) && /ask_utility_payment_preference/.test(src),
  "property-specific application questions come from the same setup");
ok(/b\.parsed\.publicMessage \|\| b\.parsed\.receipt \|\| b\.parsed\.error/.test(src),
  "write refusals show human receipts before internal error codes");

console.log(`\n  ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
