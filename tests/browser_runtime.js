"use strict";
// Component proofs use the real browser with test-provided adapters. No provider
// network is permitted. Tests that need actual HTTP use the separate owned stack.
const path = require("node:path"), fs = require("node:fs");
const roots = [process.env.E2E_API_ROOT, path.resolve(__dirname, "../"),
  path.resolve(__dirname, "../../api-fable-review-20260907")].filter(Boolean);
let modulePath;
for (const root of roots) {
  try { modulePath = require.resolve("playwright", { paths: [root] }); break; } catch (_) {}
}
if (!modulePath) modulePath = require.resolve("playwright");
const {chromium: engine} = require(modulePath);
const chrome = process.env.CHROMIUM || process.env.CHROME ||
  (process.platform === "win32" && fs.existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : null);
module.exports.chromium = {
  async launch(options = {}) {
    const browser = await engine.launch({...options, ...(chrome ? {executablePath: chrome} : {})});
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async options => {
      const context = await newContext({...options, serviceWorkers: "block"});
      // The actual inline CSS imports remote font CSS. Fulfill that optional
      // stylesheet locally so addStyleTag settles; render with installed font
      // fallbacks. Every other unmocked request is refused before network.
      await context.route("**/*", route => route.request().resourceType()==='stylesheet'
        ? route.fulfill({status:200,contentType:'text/css',body:''})
        : route.abort("blockedbyclient"));
      return context;
    };
    // Playwright's browser.newPage creates its context internally, so establish
    // the same deny-all boundary explicitly for this convenience method too.
    browser.newPage = async options => (await browser.newContext(options)).newPage();
    return browser;
  },
};
