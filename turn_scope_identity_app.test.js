// Real Chromium component proof for turn-scope target selection.
"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { chromium } = require(require.resolve("playwright", { paths: [__dirname, path.resolve(__dirname, "../api-fable-review-20260907")] }));

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), posted = [];
    await page.exposeFunction("captureTurnScope", p => { posted.push(p); return { data: { receipt: { unit: "101", what_happens_next: [] } } }; });
    await page.setContent('<main id="psTurnScopeCapture"></main><main id="psTurnFlow"></main><main id="psTurnExceptions"></main>');
    await page.evaluate(() => { window.__psLive = {
      hasSession: () => true,
      turnScopeContext: async () => ({ data: { triage_confirmation_id: "tri-1", appliance_candidates: { appliances: [] } } }),
      proposeTurnScope: async () => ({ data: { proposal: {
        labels: { paint: "Unknown", cleaning: "Unknown", keys: "Unknown", inspection: "Partial" },
        findings: [], required_work: [{ work: "Repair A", stage: "repair" }, { work: "Clean B", stage: "final_clean" }], unknowns: []
      }, work_targets: [{ space_id: "bed-b", space_label: "<Bed B>" }] } }),
      confirmTurnScope: p => window.captureTurnScope(p),
      unitTurnFlow: async () => ({ data: {} }), turnScopeExceptions: async () => ({ data: {} })
    }; });
    await page.addScriptTag({ content: fs.readFileSync(process.env.WORK_SCOPE_PARENT_SOURCE || path.join(__dirname, "turn-scope-door.js"), "utf8") });
    await page.locator("#tsUnit").fill("101"); await page.locator("#tsLoad").click(); await page.locator("#tsPropose").click();
    assert.equal(await page.locator(".ut-work-scope").count(), 2, "each turn-scope work item has a target control");
    assert.equal(await page.locator(".ut-work-scope").first().inputValue(), "unspecified", "scope defaults to unspecified");
    assert.equal(await page.locator("option[value='space:bed-b']").first().textContent(), "Rentable space: <Bed B>", "space label remains text");
    await page.locator(".ut-work-scope").nth(1).selectOption("space:bed-b"); await page.locator("[data-drop='work'][data-i='0']").click(); await page.locator("#tsConfirm").click();
    assert.deepEqual(posted[0].required_work, [{ work_text: "Clean B", stage: "final_clean", disturbs_painted_surfaces: null, from_finding_index: undefined, origin: "proposed", scope_kind: "rentable_space", space_id: "bed-b" }], "drop preserves selected work identity");
    await page.locator("#tsPropose").click(); await page.locator(".ut-work-scope").first().selectOption("unit_wide"); await page.locator("#tsConfirm").click();
    assert.equal(posted[1].required_work[0].scope_kind, "unit_wide"); assert.equal(Object.hasOwn(posted[1].required_work[0], "space_id"), false);
    assert.equal(posted[1].required_work[1].scope_kind, "unspecified");
    console.log("turn_scope_identity_app: browser component passed");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
