"use strict";

const strictAssert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

let passed = 0;
const assert = new Proxy(strictAssert, {
  get(target, property) {
    const member = target[property];
    if (typeof member !== "function") return member;
    return (...args) => { member(...args); passed++; };
  },
});

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const open = html.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === "{") depth++;
    if (html[i] === "}" && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`${name} is not balanced`);
}

const uploadStart = html.indexOf("window.dsUploadRentRoll = async function()");
const uploadEnd = html.indexOf("window.dsConfirmRow", uploadStart);
const upload = html.slice(uploadStart, uploadEnd);
assert.match(upload, /source_artifact_id:up\.artifact\.id, source_as_of_date:asOf/);
assert.doesNotMatch(upload, /parseRentRollFile\(|rows\s*:/,
  "Deal Setup sends the retained artifact for the server to interpret, not browser rows");

const sectionBox = {};
new Function(`${extractFunction("dsSection")}\nthis.dsSection=dsSection;`).call(sectionBox);
assert.equal(sectionBox.dsSection({ section: "current", unit_number: "A" }), "Current occupancy");
assert.equal(sectionBox.dsSection({ section: "future", unit_number: "A" }), "Future lease");
assert.equal(sectionBox.dsSection({ section: "future", unit_number: null }), "Unassigned future");

const identityBox = {};
const escapeHtml = (value) => String(value == null ? "" : value)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
new Function("dsEsc", `${extractFunction("dsIdentityActions")}\nthis.paint=dsIdentityActions;`)
  .call(identityBox, escapeHtml);
const identityReview = identityBox.paint({
  id: "lease-1",
  status: "needs_review",
  identity_review: { status: "staged", person_id: null,
    candidates: [{ person_id: "person-1", name: "Alex & Morgan" }] },
});
assert.match(identityReview, /Use Alex &amp; Morgan/);
assert.match(identityReview, /resolved_existing/);
assert.match(identityReview, /Create new resident/);
assert.match(identityReview, /Spine will not choose a match for you/);
assert.equal(identityBox.paint({ id: "lease-2", identity_review: {
  status: "promoted", person_id: "person-1", candidates: [] } }), "",
"resolved identity offers no further identity mutation");
assert.equal(identityBox.paint({ id: "lease-3", status: "rejected", identity_review: {
  status: "staged", person_id: null, candidates: [{ person_id: "person-1", name: "Alex" }] } }), "",
"a rejected lease cannot offer identity resolution that could resurrect it");

const render = extractFunction("dsRenderSetup");
for (const label of ["Section", "Actual rent", "Asking rent", "current occupancy",
  "future leases", "unassigned rows"]) {
  assert.ok(render.includes(label), `review renders ${label}`);
}
assert.match(render, /if\(pr\.status==='staged'\)/,
  "only server-staged rows offer confirmation");

const confirmStart = html.indexOf("window.dsConfirmAllReady = async function()");
const confirmEnd = html.indexOf("window.dsEstablish", confirmStart);
const confirmAll = html.slice(confirmStart, confirmEnd);
assert.match(confirmAll, /added\+\+/);
assert.match(confirmAll, /refusals\.push\(e\.message\)/);
assert.match(confirmAll, /still ready/);
assert.doesNotMatch(confirmAll, /Added '\+ready\.length/,
  "Confirm All never reports attempted rows as successful rows");

console.log("PASS canonical onboarding review app contract");
console.log(`${passed}/${passed}`);
