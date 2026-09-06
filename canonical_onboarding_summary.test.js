"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function renderFrom(html, proposals, review_counts) {
  function extract(name) {
    const start = html.indexOf(`function ${name}(`);
    assert.ok(start >= 0);
    let depth = 0;
    for (let i = html.indexOf("{", start); i < html.length; i++) {
      if (html[i] === "{") depth++;
      if (html[i] === "}" && --depth === 0) return html.slice(start, i + 1);
    }
    throw new Error("Function not closed");
  }
  const code = ["dsEsc", "dsRowState", "dsMoney", "dsDate", "dsSection", "dsIdentityActions", "dsRenderSetup"].map(extract).join("\n");
  const render = new Function("_ds", code + "\nreturn dsRenderSetup;")({ setup: {
    property: { name: "Synthetic" }, source: { filename: "synthetic.csv" },
    proposals, counts: {}, review_counts,
  } });
  const element = { innerHTML: "" };
  render(element);
  return element.innerHTML;
}
const proposals = [
  { section: "current", unit_number: "101" },
  { section: "future", unit_number: "101" },
  { section: "future", unit_number: null },
].map((normalized_json, index) => ({ id: `synthetic-${index}`, status: "blocked", normalized_json }));
const parent = fs.readFileSync(path.join(__dirname, "tests/fixtures/onboarding_summary_parent.js"), "utf8");
const old = renderFrom(parent, proposals);
check("unchanged parent displays unassigned future row but zero unassigned summary", () => {
  assert.ok(old.includes("Unassigned future"));
  assert.ok(old.includes("<b>0</b> unassigned rows"));
  assert.ok(!old.includes("<b>1</b> unassigned rows"));
});
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const current = renderFrom(html, proposals, {current:1,future:2,unassigned_current:0,unassigned_future:1});
check("summary counts unassigned future without losing its future section", () => {
  assert.ok(current.includes("<b>1</b> unassigned rows"));
  assert.ok(current.includes("<b>2</b> future leases"));
  assert.ok(current.includes("<b>1</b> current occupancy"));
  assert.ok(current.includes("<b>3</b> source rows"));
  assert.equal((current.match(/<tr>/g) || []).length, 4);
});
check("current and future assignment gaps both stay visible from canonical counts", () => {
  const rows = [...proposals, {id:"synthetic-current",status:"blocked",normalized_json:{section:"current",unit_number:null}}];
  const rendered = renderFrom(html, rows, {current:2,future:2,unassigned_current:1,unassigned_future:1});
  assert.ok(rendered.includes("<b>2</b> unassigned rows"));
  assert.ok(rendered.includes("<b>2</b> current occupancy"));
  assert.ok(rendered.includes("<b>2</b> future leases"));
});
check("missing canonical assignment counts stay unknown instead of becoming zero", () => {
  const rendered = renderFrom(html, proposals);
  assert.ok(rendered.includes("<b>—</b> unassigned rows"));
  assert.ok(!rendered.includes("<b>0</b> unassigned rows"));
});
console.log(`${passed} passed, 0 failed`);
