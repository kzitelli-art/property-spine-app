/* Terms review proof for the existing Leasing Conversations send action. */
"use strict";
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
let passed = 0, failed = 0;
function ok(value, label) { if (value) { passed++; console.log("PASS  " + label); } else { failed++; console.log("FAIL  " + label); } }

const shared = fs.readFileSync(path.join(__dirname, "application-offer-review.js"), "utf8");
const ui = shared.slice(shared.indexOf("function reviewOffer"));
const action = html.slice(html.indexOf("createApplicationOffer:"), html.indexOf("// ── TENANCY ANCHOR", html.indexOf("createApplicationOffer:")));
ok(/\/application-offer/.test(action), "offer review uses the canonical application-offer action");
ok(/rent:p\.rent[\s\S]*security_deposit:p\.security_deposit/.test(action), "offer action carries operator-reviewed rent and deposit");
ok(/fees:p\.fees/.test(action) && /concessions:p\.concessions/.test(action) && /concessions:\{status:'none'\}/.test(ui), "offer action carries explicit fees and none concessions");
ok(/Review complete application terms before sending/.test(ui), "conversation UI has a terms review step");
ok(/Monthly rent[\s\S]*Security deposit[\s\S]*Lease start[\s\S]*Lease end/.test(ui), "review requires the complete commercial term set");
ok(/Add fee/.test(ui) && /no applicable fees/.test(ui), "operator must add fees or explicitly confirm none");
ok(/lqNoConcessions/.test(ui) && /Confirm that there are no concessions/.test(ui), "operator must explicitly confirm no concessions");
ok(/application_terms_id|offer_id/.test(ui), "dispatch receives the server returned offer id");
ok(/if\(!offerId\)[\s\S]*createApplicationOffer/.test(ui) && /offerKey/.test(ui), "dispatch retry reuses the created offer id and idempotency key");
ok(/lockPreparedOffer/.test(ui) && /reviewed fields are locked for dispatch retry/.test(ui), "dispatch failure cannot reuse an offer after edited terms");
const feePattern = ui.match(/!\/(\^\\d\+\(\\\.\\d\{1,2\}\)\?\$)\/\.test/);
ok(!!feePattern, "fee amount validator is present as a single-backslash regex");
if (feePattern) {
  const feeRegex = new RegExp(feePattern[1]);
  ok(["0", "25", "25.50"].every(value => feeRegex.test(value)), "fee validator accepts zero and valid decimal amounts");
  ok(["", "25.", "25.500", "-1", "abc"].every(value => !feeRegex.test(value)), "fee validator rejects incomplete or invalid amounts");
}
ok(/Blank values mean governed pricing is not established|Confirm any unfilled terms before sending/.test(ui), "ungoverned pricing is blank rather than guessed");
ok(/Confirm terms and send application/.test(ui), "review and dispatch remain one visible action sequence");
console.log(`\\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
