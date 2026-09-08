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

// Execute the shipped calculation: a reconciled zero must outrank row-derived
// counts, while absent summary fields retain the existing row interpretation.
const vm = require("node:vm");
const statsBox = {
  data: { rentRoll: {} },
  rentRollFor: () => [
    { status: "current" }, { status: "current" },
    { status: "vacant" }, { status: "future" },
  ],
  _rrCountsInOccupancy: row => row.status !== "future",
  _rrIsVacant: row => row.status === "vacant",
  _rrIsNonRev: () => false,
  _rrIsFuture: row => row.status === "future",
  _rrIsCommercial: () => false,
  _rrActual: () => 850, _rrMarket: () => 0, _rrBalance: () => 0,
  _rrSignedIn: () => true, _rrTruthDoc: () => null,
};
vm.createContext(statsBox);
vm.runInContext(extractFunction("rentRollStats"), statsBox);
function statsWith(summary) {
  statsBox.data.rentRoll.summary = summary;
  return statsBox.rentRollStats("synthetic");
}
const zeroStats = statsWith({ reconciled: true,
  residential_inventory: 0, inventory: 8,
  residential_occupied: 0, occupied: 7,
  vacant: 0, non_revenue: 0, future_rows: 0, total_property_positions: 0,
});
for (const field of ["residential", "occupiedCount", "vacantCount",
  "nonRevenueCount", "futureCount", "totalPositions"]) {
  assert.equal(zeroStats[field], 0, `reconciled ${field} preserves explicit zero`);
}
for (const missing of [undefined, null]) {
  const fallback = statsWith({ reconciled: true,
    residential_inventory: missing, inventory: missing,
    residential_occupied: missing, occupied: missing,
    vacant: missing, future_rows: missing, total_property_positions: missing,
  });
  assert.equal(fallback.residential, 3, "missing inventory retains row count");
  assert.equal(fallback.occupiedCount, 2, "missing occupied retains row count");
  assert.equal(fallback.vacantCount, 1, "missing vacancy retains row count");
  assert.equal(fallback.futureCount, 1, "future rows stay separate");
  assert.equal(fallback.totalPositions, 3, "missing total retains derived count");
}
const legacyZero = statsWith({ reconciled: true, inventory: 0, occupied: 0 });
assert.equal(legacyZero.residential, 0, "legacy summary inventory preserves zero");
assert.equal(legacyZero.occupiedCount, 0, "legacy summary occupied preserves zero");
const known = statsWith({ reconciled: true, residential_inventory: 6,
  inventory: 8, residential_occupied: 4, occupied: 7, vacant: 2,
  non_revenue: 1, future_rows: 5, total_property_positions: 9 });
assert.equal(known.residential, 6, "specific inventory precedes legacy alias");
assert.equal(known.occupiedCount, 4, "specific occupied precedes legacy alias");
assert.equal(known.vacantCount, 2);
assert.equal(known.nonRevenueCount, 1);
assert.equal(known.futureCount, 5);
assert.equal(known.totalPositions, 9);
assert.equal(statsWith({ reconciled: false, residential_occupied: 9 }).occupiedCount,
  2, "unreconciled occupancy does not override rows");

console.log("PASS canonical onboarding review app contract");
console.log(`${passed}/${passed}`);
