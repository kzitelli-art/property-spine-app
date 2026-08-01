"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const source = fs.readFileSync(path.join(__dirname, "governed-operating-context.js"), "utf8");

let passed = 0;
function check(name, fn) {
  try { fn(); passed += 1; console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}

check("uses the authenticated live boundary", () => assert.match(source, /window\.__psLive/));
check("does not call fetch directly", () => assert.doesNotMatch(source, /\bfetch\s*\(/));
check("does not accept or send a property id", () => assert.doesNotMatch(source, /property_id\s*:/));
check("opens governance-first on operating rules", () => {
  assert.match(source, /tab:'rules'/);
  assert.match(source, /Operating rules/);
  assert.match(source, /How the leasing agents operate/);
});
check("keeps the three named strategies visible but secondary", () => {
  assert.match(source, /Maya, James, and Claire/);
  assert.match(source, /Agent strategies/);
  assert.match(source, /strategy stays secondary/i);
});
check("shows knowledge rules strategies and history", () => {
  ["rules", "knowledge", "strategies", "history"].forEach((tab) => assert.match(source, new RegExp(`'${tab}'`)));
});
check("shows real operating counts", () => {
  ["active_guardrails", "active_policies", "active_sops", "active_knowledge"].forEach((key) => assert.match(source, new RegExp(key)));
});
check("keeps strategy editing read-only", () => assert.match(source, /Strategy editing stays read-only/));
check("exposes immutable change history", () => {
  assert.match(source, /Change history/);
  assert.match(source, /prior version remains in change history/i);
  assert.match(source, /Retired content remains visible/);
});
check("contains no avatars scores winners or traffic controls", () => {
  assert.doesNotMatch(source, /avatar/i);
  assert.doesNotMatch(source, /winner/i);
  assert.doesNotMatch(source, /score/i);
  assert.doesNotMatch(source, /traffic weight/i);
});
check("uses existing fact actions for building knowledge", () => {
  assert.match(source, /createAgentFact/);
  assert.match(source, /replaceAgentFact/);
  assert.match(source, /retireAgentFact/);
});
check("uses governed operating rule actions", () => {
  assert.match(source, /createAiLeasingRule/);
  assert.match(source, /replaceAiLeasingRule/);
  assert.match(source, /retireAiLeasingRule/);
});
check("fails honestly when the API boundary is absent", () => assert.match(source, /Deploy the governed operating context API boundary/));
check("keeps a compatibility alias for earlier wiring", () => assert.match(source, /window\.__psAiLeasingSettings=api/));

if (!process.exitCode) console.log(`\n${passed}/${passed} app contract checks passed.`);
