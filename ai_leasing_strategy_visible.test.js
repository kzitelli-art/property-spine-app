"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "conversations-board.js"), "utf8");
const checks = [
  ["reads additive API contract", source.includes("ai_leasing_strategies")],
  ["requires exact contract version", source.includes("ai_leasing_strategy_status_v1")],
  ["renders governed strategy identity", source.includes("Strategy v")],
  ["shows validation required honestly", source.includes("Behavior validation required")],
  ["shows validated not deployed honestly", source.includes("Validated · not deployed")],
  ["shows controlled active state", source.includes("Controlled deployment active")],
  ["contains no avatar surface", !/avatar|portrait/i.test(source)],
  ["contains no agent score", !/agent score|scorecard|leaderboard/i.test(source)],
  ["contains no traffic mutation control", !/approve change|traffic slider|auto.?optimi[sz]/i.test(source)],
  ["does not call a second loader", !/aiStrategyQueue|strategyStatusResource/.test(source)],
];
for (const [name, ok] of checks) assert.ok(ok, name);
console.log(`ai_leasing_strategy_visible: ${checks.length}/${checks.length}`);
