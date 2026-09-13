#!/usr/bin/env node
/*
 * Management live inventory browser proof.  The app is served unchanged; every
 * API response below is a local, synthetic canonical read.  It proves browser
 * wiring, not a production property or API session.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("./tests/assert_reporter.js");
const { serveStatic } = require("./tools/browser_stack.js");
const { chromium } = require("./tests/browser_runtime.js");

const APP = __dirname, PORT = Number(process.env.MANAGEMENT_STATIC_PORT || 3355);
const ORIGIN = `http://127.0.0.1:${PORT}`, API = "https://property-spine-api.onrender.com";
const OUT = path.resolve(process.env.MANAGEMENT_EVIDENCE_DIR || path.join(APP, "..", "..", "tmp", "management-live-browser-evidence"));
const PROPERTY = "stubbed-management-property", TOKEN = "stubbed-browser-session";
let passed = 0, failed = 0, server, browser;
function must(label, yes, detail) { assert.ok(yes, label + (detail ? "\n" + detail : "")); passed++; console.log("  ok    " + label); }
const body = x => JSON.stringify(x);

function fixture() {
  const buckets = [...Array(31).fill("occupied"), ...Array(9).fill("activation_pending"), ...Array(100).fill("open"), ...Array(20).fill("needs_review")];
  let n = 0;
  const units = Array.from({ length: 72 }, (_, u) => {
    const count = u < 16 ? 3 : 2;
    return { unit_id: `unit-${u + 1}`, unit_number: `M-${String(u + 1).padStart(3, "0")}`,
      positions: Array.from({ length: count }, (_, p) => {
        const bucket = buckets[n++], id = `space-${n}`;
        const current = bucket === "occupied" ? { resident: `Resident ${n}`, rent: { state: "known", amount: 1200 }, through: "2027-08-31", person_id: `person-${n}`, lease_id: `lease-${n}` } : null;
        return { space_id: id, label: `Room ${p + 1}`, bucket, bucket_label: bucket === "activation_pending" ? "Pending activation" : bucket === "needs_review" ? "Needs review" : bucket === "occupied" ? "Occupied" : "Open", current, next: null, detail: {} };
      }) };
  });
  return { property_id: PROPERTY, as_of: "2026-09-13", units,
    totals: { units: 72, rentable_positions: 160, occupied: 31, activation_pending: 9, open: 100, needs_review: 20, not_established: 0, rent_not_in_source: 0, confirmed_rows_not_attached: 0, held_rows_not_attached: 0 },
    unattached_source_rows: [], unattached_source_rows_truncated: false,
    opening_truth: { latest_confirmed_source: { source_file: "stubbed canonical fixture", source_as_of_date: "2026-09-13", confidence: "confirmed" } } };
}
const ROLL = fixture();
const DASH = { property: { id: PROPERTY, name: "Stubbed Management" }, headline: { rent_roll_units: 251, collection_loss: { amount: 48 } }, rent_roll: Array.from({ length: 251 }, (_, i) => ({ unit_number: `legacy-${i}`, rent: 48 })) };

async function route(page, failRentRoll, reads) {
  await page.route("**/*", async r => {
    const u = new URL(r.request().url());
    if (u.origin === ORIGIN) return r.continue();
    if (u.origin !== API) {
      if (u.hostname === "fonts.googleapis.com") return r.fulfill({ status: 200, contentType: "text/css", body: "" });
      return r.abort("blockedbyclient");
    }
    const p = u.pathname; reads.push(`${r.request().method()} ${p}`);
    if (p === "/operator/me") return r.fulfill({ status: 200, contentType: "application/json", body: body({ id: "stubbed-user", property_id: PROPERTY, name: "Stubbed operator", role: "property_manager" }) });
    if (p === "/operator/authorized-properties") return r.fulfill({ status: 200, contentType: "application/json", body: body({ properties: [{ property_id: PROPERTY, property_name: "Stubbed Management" }] }) });
    // This is the old operator-key endpoint. A signed staff session must never
    // request it; a 401 trap makes any regression surface instead of borrowing
    // the 251 / $48 synthetic legacy values.
    if (p === `/properties/${PROPERTY}/management-dashboard`) return r.fulfill({ status: 401, contentType: "application/json", body: body({ error: "legacy dashboard forbidden" }) });
    if (p === "/operator/rent-roll/units") return r.fulfill(failRentRoll ? { status: 503, contentType: "application/json", body: body({ error: "Stubbed read unavailable" }) } : { status: 200, contentType: "application/json", body: body(ROLL) });
    if (/obligation|management-surface/.test(p)) return r.fulfill({ status: 200, contentType: "application/json", body: body({ items: [], obligations: [] }) });
    return r.fulfill({ status: 200, contentType: "application/json", body: body({}) });
  });
}
async function openManagement(page) {
  await page.goto(`${ORIGIN}/index.html`, { waitUntil: "domcontentloaded" });
  await page.locator('.desk-card[onclick="openDesk(\'management\')"]').click();
  await page.locator('.mg-door[data-ps-source="live"][data-ps-state="ready"]').waitFor({ state: "visible", timeout: 30000 });
}
async function signedPage(viewport, unavailable) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(({ token, property }) => {
    localStorage.setItem("ps_api_base", "https://property-spine-api.onrender.com");
    sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: token, m: { user_id: "stubbed-user", property_id: property } }));
  }, { token: TOKEN, property: PROPERTY });
  const page = await context.newPage(), reads = []; await route(page, unavailable, reads); return { context, page, reads };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  server = await serveStatic(APP, PORT);
  browser = await chromium.launch({ headless: true, args: ["--disable-background-networking", "--disable-component-update"] });
  const desktop = await signedPage({ width: 1440, height: 1000 }, false);
  try {
    await openManagement(desktop.page);
    const management = desktop.page.locator("#intelStrip");
    const text = await management.innerText();
    must("product sign-in fixture opens Management through the actual desk card", /Management/i.test(await desktop.page.locator("#deskTitle").innerText()));
    must("Management card renders the canonical 160 rentable positions", /160/.test(text) && /Rentable positions/i.test(text), text.slice(0, 800));
    must("Management card renders canonical occupied, pending, open and review counts", /31/.test(text) && /9/.test(text) && /100/.test(text) && /20/.test(text));
    const rentCardText = await desktop.page.locator('.mg-door[data-ps-source="live"]').innerText();
    must("Rent Roll card does not substitute stale 251-unit / $48 legacy sentinels", !/251/.test(rentCardText) && !/\$48/.test(rentCardText), rentCardText);
    must("live canonical landing has no false average-rent label", !/Avg rent/i.test(text));
    must("signed Management reads only canonical rent roll plus local work, never the legacy dashboard", !desktop.reads.some(x => /management-dashboard|management-read|\/inbox/.test(x)) && desktop.reads.some(x => /\/operator\/rent-roll\/units/.test(x)) && desktop.reads.some(x => /\/operator\/obligations/.test(x)), desktop.reads.join("\n"));
    await management.screenshot({ path: path.join(OUT, "management-desktop.png") });
    await desktop.page.locator('.mg-door[data-ps-source="live"]').click();
    await desktop.page.locator("#psRruBody[data-ps-state='data']").waitFor({ state: "visible", timeout: 30000 });
    const rollText = await desktop.page.locator("#psRruBody").innerText();
    must("full Rent Roll repeats the same canonical 160 positions / 72 units", /160 positions/.test(rollText) && /72 units/.test(rollText));
    must("full Rent Roll repeats all four canonical state counts", /31 occupied/.test(rollText) && /9 pending activation/.test(rollText) && /100 open/.test(rollText) && /20 need review/.test(rollText));
    must("full Rent Roll adds one canonical reread and no legacy endpoint", !desktop.reads.some(x => /management-dashboard|management-read|\/inbox/.test(x)) && desktop.reads.filter(x => /\/operator\/rent-roll\/units/.test(x)).length === 2, desktop.reads.join("\n"));
    await desktop.page.locator("#psRruBody").screenshot({ path: path.join(OUT, "rent-roll-desktop.png") });
  } finally { await desktop.context.close(); }
  const mobile = await signedPage({ width: 390, height: 844 }, false);
  try {
    await openManagement(mobile.page);
    const widths = await mobile.page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth, card: document.querySelector('.mg-door[data-ps-source="live"]')?.getBoundingClientRect().width || 0 }));
    must("narrow Management rendering has no horizontal page overflow", widths.scroll <= widths.viewport, JSON.stringify(widths));
    await mobile.page.locator("#intelStrip").screenshot({ path: path.join(OUT, "management-mobile.png") });
  } finally { await mobile.context.close(); }
  const delinquency = await signedPage({ width: 1200, height: 900 }, false);
  try {
    await openManagement(delinquency.page);
    const rentRollReadsBeforeLeaf = delinquency.reads.filter(x => /\/operator\/rent-roll\/units/.test(x)).length;
    await delinquency.page.locator('.mg-door[onclick*="delinquency"]').click();
    const leaf = delinquency.page.locator("#intelStrip");
    await leaf.getByRole("heading", { name: "Delinquency & Evictions" }).waitFor({ state: "visible", timeout: 30000 });
    const leafText = await leaf.innerText();
    must("Delinquency leaf reports unconnected balances rather than stale gross amount", /Current property balances are not connected/i.test(leafText) && !/\$48|251|Gross AR — owed/i.test(leafText), leafText);
    must("Delinquency leaf performs only the local work reread, never legacy dashboard or another rent roll", !delinquency.reads.some(x => /management-dashboard|management-read|\/inbox/.test(x)) && delinquency.reads.filter(x => /\/operator\/rent-roll\/units/.test(x)).length === rentRollReadsBeforeLeaf && delinquency.reads.filter(x => /\/operator\/obligations/.test(x)).length >= 2, delinquency.reads.join("\n"));
    await leaf.screenshot({ path: path.join(OUT, "delinquency-stubbed.png") });
  } finally { await delinquency.context.close(); }
  const unavailable = await signedPage({ width: 900, height: 800 }, true);
  try {
    await unavailable.page.goto(`${ORIGIN}/index.html`, { waitUntil: "domcontentloaded" });
    await unavailable.page.locator('.desk-card[onclick="openDesk(\'management\')"]').click();
    const retry = unavailable.page.getByRole("button", { name: "Retry", exact: true });
    await retry.waitFor({ state: "visible", timeout: 30000 });
    const unavailableCard = unavailable.page.locator('.mg-door[data-ps-source="live"]');
    must("unavailable canonical read renders Retry instead of stale Rent Roll data", await retry.isVisible() && !/251|\$48/.test(await unavailableCard.innerText()));
    await unavailable.page.locator("#intelStrip").screenshot({ path: path.join(OUT, "management-unavailable.png") });
  } finally { await unavailable.context.close(); }
})().catch(e => { failed++; console.error("  ERROR ", e.stack || e.message); }).finally(async () => {
  if (browser) await browser.close(); if (server) await new Promise(r => server.close(r));
  const receipt = { fixture: "stubbed local API; no database, token, secret, production or provider call", positions: 160, units: 72, counts: { occupied: 31, pending_activation: 9, open: 100, needs_review: 20 }, stale_sentinels: { units: 251, dollars: 48 }, legacy_management_dashboard: "401 trap; no request observed", passed, failed };
  fs.writeFileSync(path.join(OUT, "receipt.json"), JSON.stringify(receipt, null, 2));
  console.log(`management inventory live browser: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
});
