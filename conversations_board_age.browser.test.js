"use strict";

// Focused browser proof for the canonical Lead Conversations renderer. The
// payloads below model the API contract at the DOM boundary: the browser is
// given the server-authored activity value and must render an honest age.
const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");

const playwrightRoots = [
  process.env.E2E_API_ROOT,
  path.resolve(__dirname, "../api-fable-review-20260907"),
  __dirname
].filter(Boolean);
let playwrightModule;
for (const root of playwrightRoots) {
  try {
    playwrightModule = require.resolve("playwright", { paths: [root] });
    break;
  } catch (_) {}
}
if (!playwrightModule) {
  playwrightModule = require.resolve("playwright");
}
const { chromium } = require(playwrightModule);
const boardSource = fs.readFileSync(path.join(__dirname, "conversations-board.js"), "utf8");
const anchor = Date.parse("2026-09-11T12:00:00.000Z");

function payload(activity) {
  return {
    counts: { operating_buckets: { needs_attention: 1, ai_handling: 0, no_response: 0 } },
    conversations: [{
      conversation_id: "age-proof-conversation",
      person_name: "Browser Proof",
      operating_bucket: "needs_attention",
      operating_reason_code: "human_attention_required",
      control_mode: "awaiting_review",
      waiting_on: "manager",
      last_meaningful_activity_at: activity
    }]
  };
}

async function renderCase(browser, name, activity, expected) {
  const page = await browser.newPage();
  try {
    await page.setContent('<main><div class="lconv-page"></div></main>');
    await page.evaluate(({ data, now }) => {
      Date.now = () => now;
      window.__psLive = {
        hasSession: () => true,
        conversationQueue: async () => data
      };
    }, { data: payload(activity), now: anchor });
    await page.addScriptTag({ content: boardSource });
    const row = page.locator(".pscb-row").first();
    await row.waitFor();
    const text = await row.innerText();
    assert.match(text, expected, `${name}: renderer output`);
    console.log(`  PASS ${name}: ${JSON.stringify(text)}`);
  } finally {
    await page.close();
  }
}

(async () => {
  const launchOptions = { headless: true };
  const executable = process.env.CHROMIUM || process.env.CHROME;
  if (executable) launchOptions.executablePath = executable;
  const browser = await chromium.launch(launchOptions);
  try {
    await renderCase(browser, "missing activity time is truthful", null, /Age unavailable/);
    await renderCase(browser, "invalid activity time is truthful", "not-a-date", /Age unavailable/);
    await renderCase(browser, "epoch ordering sentinel is truthful", "1970-01-01T00:00:00.000Z", /Age unavailable/);
    await renderCase(browser, "valid source activity keeps relative age", "2026-09-11T11:50:00.000Z", /10m ago/);
    console.log("4/4 browser age-rendering checks passed");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
