"use strict";

// Exercise the browser proof's actual pure contract functions without starting
// a browser/database or loading private files. No duplicate implementation.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "canonical_onboarding_review.browser.js"), "utf8");
const start = source.indexOf("function exactCounts(");
const end = source.indexOf("async function reviewSnapshot(", start);
assert.ok(start >= 0 && end > start);
const context = vm.createContext({ refuse(code) { throw new Error(code); } });
vm.runInContext(source.slice(start, end), context);
const { exactCounts, proposalStatusCounts, exactStatusCounts, vacancyCount } = context;
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
const sparse = { staged: 59, needs_review: 86, blocked: 19 };
const receipt = { ...sparse, conflicted: 0, vacant: 53 };

check("original broad comparison rejects valid sparse status histogram", () => {
  assert.throws(() => exactCounts(sparse, receipt, "july"), /CONFLICTED_COUNT_MISMATCH/);
});
check("blanket zero default would still compare vacancy as status", () => {
  assert.throws(() => exactCounts({ ...sparse, conflicted: 0, vacant: 0 }, receipt, "july"), /VACANT_COUNT_MISMATCH/);
});
check("status contract accepts matching sparse and initialized receipts", () => exactStatusCounts(sparse, receipt, "july"));
check("status projection includes all seven states and excludes vacancy", () => {
  assert.deepEqual(Object.keys(proposalStatusCounts(receipt, "july")).sort(),
    ["blocked", "confirmed", "conflicted", "needs_review", "promoted", "rejected", "staged"]);
});
for (const status of ["staged", "needs_review", "blocked", "confirmed", "promoted", "rejected", "conflicted"]) {
  check(`reject changed ${status} count`, () => {
    assert.throws(() => exactStatusCounts({ ...sparse, [status]: (sparse[status] || 0) + 1 }, receipt, "july"),
      new RegExp(`${status.toUpperCase()}_COUNT_MISMATCH`));
  });
}
for (const value of [null, undefined, "", false, -1, 0.5, NaN]) {
  check(`reject explicitly invalid known count ${String(value)}`, () => {
    assert.throws(() => proposalStatusCounts({ staged: value }, "july"), /STAGED_COUNT_INVALID/);
  });
}
check("missing count object is not a sparse histogram", () => assert.throws(() => proposalStatusCounts(undefined, "july"), /STATUS_COUNTS_MISSING/));
check("missing arbitrary review field remains an error even if expected zero", () => {
  assert.throws(() => exactCounts({}, { missing_actual_current_occupied: 0 }, "skyline"), /COUNT_MISMATCH/);
});
const review = { proposals: [true, false, true].map(is_vacant => ({ normalized_json: { is_vacant } })) };
check("vacancy derives independently from canonical claim evidence", () => assert.equal(vacancyCount(review, "sample"), 2));
check("unknown vacancy cannot become zero", () => assert.throws(() => vacancyCount({ proposals: [{ normalized_json: {} }] }, "sample"), /VACANCY_EVIDENCE_MISSING/));
check("saved state survives restart with statuses and vacancy separate", () => {
  const saved = JSON.parse(JSON.stringify({ status_counts: proposalStatusCounts(receipt, "july"), vacancy_count: vacancyCount(review, "sample") }));
  exactStatusCounts(sparse, saved.status_counts, "july");
  assert.equal(Object.hasOwn(saved.status_counts, "vacant"), false);
  exactCounts({ vacant: vacancyCount(review, "sample") }, { vacant: saved.vacancy_count }, "sample");
  assert.throws(() => exactCounts({ vacant: 1 }, { vacant: saved.vacancy_count }, "sample"), /VACANT_COUNT_MISMATCH/);
  assert.throws(() => exactStatusCounts({ ...sparse, staged: 58 }, saved.status_counts, "july"), /STAGED_COUNT_MISMATCH/);
});
console.log(`${passed} passed, 0 failed`);
