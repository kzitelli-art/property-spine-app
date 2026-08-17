"use strict";

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const Module = require("module");
const { serveStatic, serveTls } = require("./tools/browser_stack.js");

const API_RUNTIME = [
  process.env.API_RUNTIME,
  path.join(__dirname, "..", "api-utilities"),
  path.join(__dirname, "..", "api-debt-overpass"),
  path.join(__dirname, "..", "api-debt-release"),
  path.join(__dirname, "..", "api"),
].filter(Boolean).find((candidate) => (
  fs.existsSync(path.join(candidate, "node_modules", "playwright", "package.json"))
));
if (!API_RUNTIME) throw new Error("No workspace Playwright runtime found; set API_RUNTIME");

process.env.NODE_PATH = path.join(API_RUNTIME, "node_modules");
Module._initPaths();
const { chromium } = require(path.join(API_RUNTIME, "node_modules", "playwright"));
const express = require(path.join(API_RUNTIME, "node_modules", "express"));
const ROOMS = require(path.join(API_RUNTIME, "src", "surfaces", "asset_management.js")).ROOMS;

const PROPERTY = "property-debt-browser";
const SESSION = "debt-browser-session";
const PROD = "https://property-spine-api.onrender.com";
const APP_PORT = 8700 + (process.pid % 300);
const TLS_PORT = 9600 + (process.pid % 300);
const OUT = process.env.SHOTS || path.join(os.tmpdir(), "property-spine-debt-browser");

if (process.platform === "win32"
    && fs.existsSync("C:\\Program Files\\Git\\usr\\bin\\openssl.exe")
    && !String(process.env.PATH || "").toLowerCase().includes("git\\usr\\bin")) {
  process.env.PATH = "C:\\Program Files\\Git\\usr\\bin;" + process.env.PATH;
}

function overviewRooms() {
  return JSON.parse(JSON.stringify(ROOMS)).map((room) => {
    var compartments = (room.compartments || []).map((part) => ({
      ...part,
      establishment: part.key === "debt" || part.key === "common_equity"
        ? "partially_established" : "not_established",
    }));
    if (room.key === "capital_stack" && !compartments.some((part) => part.key === "common_equity")) {
      compartments.splice(1, 0,
        { key: "preferred_equity", label: "Preferred Equity", establishment: "not_established",
          note: "Preferred positions and governed terms." },
        { key: "common_equity", label: "Common Equity", establishment: "partially_established",
          note: "Common positions and governed terms." });
    }
    return {
      ...room,
      establishment: room.key === "capital_stack" ? "partially_established" : "not_established",
      establishment_summary: room.key === "capital_stack"
        ? "Governed debt and equity positions." : "No governed position yet.",
      compartments,
    };
  });
}

function debtPosition() {
  return {
    property_id: PROPERTY,
    as_of: "2026-08-15",
    instrument_count: 1,
    instruments: [{
      instrument: { id: "instrument-4125", instrument_kind: "mortgage_loan", loan_number: "480010465" },
      parties: {
        borrower: { name: "4125 Chestnut LLC" },
        originator_lender: { name: "CMLS Financial Ltd." },
        holder_assignee: { name: "Federal Home Loan Mortgage Corporation" },
        servicer: { name: "Lument Real Estate Capital, LLC" },
        guarantors: [
          { name: "Guarantor One" }, { name: "Guarantor Two" },
          { name: "Guarantor Three" }, { name: "Guarantor Four" }, { name: "Guarantor Five" },
        ],
      },
      principal_position: {
        observed: { value_cents: 2774526577, as_of_date: "2025-08-01", stale: true, age_days: 379 },
        projected: { value_cents: 2713187412, as_of_date: "2026-08-01",
          basis: "schedule_derivation", assumes: "every scheduled payment occurred as scheduled" },
      },
      payoff: { truth_state: "NOT_ESTABLISHED" },
      rate_position: { kind: "fixed", effective_rate_bp: 328, basis: "contractual_terms" },
      debt_service: { principal_and_interest_cents: 12341140,
        basis: "contractual_terms", excludes: ["escrow", "reserve_funding"] },
      contractual_maturity: { date: "2030-08-01", basis: "contractual_terms" },
      extension: { truth_state: "NOT_ESTABLISHED" },
      reserve_requirements: [
        { reserve_kind: "tax_imposition", amount_cents: 407624, amount_basis: "monthly",
          funds_obligation_of: "taxes" },
        { reserve_kind: "insurance_imposition", amount_cents: 361429, amount_basis: "monthly",
          funds_obligation_of: "insurance" },
        { reserve_kind: "replacement", amount_cents: 176300, amount_basis: "monthly" },
        { reserve_kind: "debt_service", amount_cents: 111070300, amount_basis: "one_time" },
      ],
      covenant_standing: { truth_state: "NOT_ESTABLISHED" },
    }],
  };
}

function equityPosition() {
  return {
    property_id: PROPERTY,
    as_of: "2026-08-15",
    positions: [{
      position_id: "position-common-browser",
      position_class: "common",
      holder: { party_name_text: "4125 Sponsor Holdings LLC" },
      common: {
        class_terms: [{ rate_bp: 800, source_authority: "governing_instrument",
          compounding: "annual", waterfall_priority_text: "After required debt service and reserves" }],
        overrides: { applied: [], surfaced_not_applied: [] },
      },
      capital_amounts: {
        contribution: [{ claim_source: "operating_agreement", amount_cents: 250000000,
          asserted_by_text: "Executed operating agreement" }],
        ownership_percent: [{ claim_source: "operating_agreement", ownership_percent: 100,
          as_of_date: "2020-08-01" }],
      },
      encumbrance: [],
    }],
    coverage_gaps: [],
    conflicts: [],
  };
}

let passed = 0;
let failed = 0;
function ok(label, condition, detail) {
  if (condition) { passed += 1; console.log("  ok    " + label); }
  else { failed += 1; console.log("  FAIL  " + label + (detail ? "\n        " + detail : "")); }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let apiServer;
  let staticServer;
  let tlsServer;
  let browser;
  let reads = 0;
  try {
    const app = express();
    app.use((req, res, next) => {
      res.setHeader("access-control-allow-origin", "*");
      res.setHeader("access-control-allow-headers", "x-staff-session,content-type,accept");
      if (req.method === "OPTIONS") return res.status(204).end();
      next();
    });
    const authorized = (req, res) => {
      if (req.headers["x-staff-session"] !== SESSION) {
        res.status(401).json({ error: "no session" });
        return false;
      }
      return true;
    };
    app.get("/operator/me", (req, res) => {
      if (!authorized(req, res)) return;
      res.json({ id: "debt-browser-user", name: "Debt Operator", role: "property_manager",
        property_id: PROPERTY, property_name: "4125 Chestnut Street",
        allowed_modules: ["management", "maintenance", "asset_management"], platform_role: "member" });
    });
    app.get("/operator/asset-management/overview", (req, res) => {
      if (!authorized(req, res)) return;
      res.json({ property_id: PROPERTY, as_of: "2026-08-15", rooms: overviewRooms() });
    });
    app.get("/operator/debt/standing", (req, res) => {
      if (!authorized(req, res)) return;
      reads += 1;
      res.json(debtPosition());
    });
    app.get("/operator/equity/standing", (req, res) => {
      if (!authorized(req, res)) return;
      res.json(equityPosition());
    });
    app.use((req, res) => {
      if (!authorized(req, res)) return;
      res.json({});
    });

    apiServer = http.createServer(app);
    await new Promise((resolve) => apiServer.listen(0, "127.0.0.1", resolve));
    staticServer = await serveStatic(__dirname, APP_PORT);
    tlsServer = await serveTls(apiServer.address().port, TLS_PORT);

    browser = await chromium.launch({
      executablePath: process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ["--ignore-certificate-errors"],
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error && error.message || error)));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.route(/^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdn\.plaid\.com)\//,
      (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("**/favicon.ico", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route(PROD + "/**", (route) => route.continue({
      url: route.request().url().replace(PROD, "https://127.0.0.1:" + TLS_PORT),
    }));
    await page.addInitScript(([api, token]) => {
      localStorage.setItem("ps_api_base", api);
      sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: token }));
    }, ["https://127.0.0.1:" + TLS_PORT, SESSION]);

    await page.goto("http://127.0.0.1:" + APP_PORT + "/index.html", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    await page.locator("#deskCardAssetManagement").click();
    await page.locator('#intelStrip [data-am-view="home"]').waitFor();
    await page.locator('#intelStrip [data-am-room="capital_stack"]').click();
    await page.locator('#intelStrip [data-am-room-open="capital_stack"]').waitFor();
    await page.locator('#intelStrip [data-am-compartment="debt"]').click();
    await page.locator('#intelStrip [data-am-compartment-open="debt"]').waitFor();

    const instrument = page.locator('#intelStrip [data-am-debt-instrument="instrument-4125"]');
    const visible = await instrument.innerText();
    ok("the governed Debt route supplies the screen", reads === 1, "reads=" + reads);
    ok("the first read leads with observed principal and three routine facts",
      /\$27,745,265\.77/.test(visible) && /3\.28%/.test(visible)
      && /\$123,411\.40/.test(visible) && /Aug 1, 2030/.test(visible));
    ok("secondary detail starts closed",
      await instrument.locator("details[open]").count() === 0
      && await instrument.locator("details").count() === 3);
    ok("staleness is visible without promoting the projection",
      /379 days old/.test(visible) && /Projected figures remain separate/.test(visible));
    await page.screenshot({ path: path.join(OUT, "debt-layered-desktop.png"), fullPage: true });

    await instrument.locator('[data-am-debt-section="terms"] summary').click();
    const terms = await instrument.locator('[data-am-debt-section="terms"]').innerText();
    ok("terms reveal the projected basis only on request",
      /\$27,131,874\.12/.test(terms) && /Assumes every scheduled payment occurred as scheduled/.test(terms)
      && /Payoff quote/i.test(terms) && /Not established/i.test(terms), terms);
    await instrument.locator('[data-am-debt-section="reserves"] summary').click();
    const reserves = await instrument.locator('[data-am-debt-section="reserves"]').innerText();
    ok("reserves reveal four distinct requirements without claiming payment",
      /Tax Escrow/i.test(reserves) && /Insurance Escrow/i.test(reserves)
      && /Replacement Reserve/i.test(reserves) && /Debt Service Reserve/i.test(reserves)
      && /payment standing is not established/.test(reserves), reserves);
    await instrument.locator('[data-am-debt-section="parties"] summary').click();
    ok("parties remain available one level down",
      /4125 Chestnut LLC/.test(await instrument.locator('[data-am-debt-section="parties"]').innerText()));
    await page.screenshot({ path: path.join(OUT, "debt-layered-expanded-desktop.png"), fullPage: true });

    const desktopGeometry = await page.evaluate(() => ({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      outside: Array.from(document.querySelectorAll('[data-am-compartment-open="debt"] button, [data-am-compartment-open="debt"] summary'))
        .filter((node) => { const box = node.getBoundingClientRect(); return box.right > innerWidth + 1 || box.left < -1; }).length,
    }));
    ok("the expanded desktop view has no horizontal overflow", desktopGeometry.documentWidth <= desktopGeometry.viewport + 1
      && desktopGeometry.outside === 0, JSON.stringify(desktopGeometry));

    await instrument.locator("details").evaluateAll((details) => details.forEach((detail) => detail.open = false));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(OUT, "debt-layered-mobile.png"), fullPage: true });
    const mobileGeometry = await page.evaluate(() => ({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      facts: document.querySelectorAll('[data-am-debt-primary-facts="3"] .am-debt-fact').length,
      open: document.querySelectorAll('.am-debt-disclosure[open]').length,
      outside: Array.from(document.querySelectorAll('[data-am-compartment-open="debt"] button, [data-am-compartment-open="debt"] summary'))
        .filter((node) => { const box = node.getBoundingClientRect(); return box.right > innerWidth + 1 || box.left < -1; }).length,
    }));
    ok("the 390px first read remains compact and closed",
      mobileGeometry.documentWidth <= mobileGeometry.viewport + 1 && mobileGeometry.facts === 3
      && mobileGeometry.open === 0 && mobileGeometry.outside === 0, JSON.stringify(mobileGeometry));
    await instrument.locator('[data-am-debt-section="terms"] summary').click();
    const mobileExpanded = await page.evaluate(() => ({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      rowOutside: Array.from(document.querySelectorAll('.am-debt-row'))
        .filter((node) => { const box = node.getBoundingClientRect(); return box.right > innerWidth + 1 || box.left < -1; }).length,
    }));
    ok("nested detail also fits at 390px", mobileExpanded.documentWidth <= mobileExpanded.viewport + 1
      && mobileExpanded.rowOutside === 0, JSON.stringify(mobileExpanded));

    await page.evaluate(() => window.amOpenRoom("capital_stack"));
    await page.locator('#intelStrip [data-am-compartment="common_equity"]').click();
    await page.locator('#intelStrip [data-am-compartment-open="common_equity"]').waitFor();
    const equityText = await page.locator('#intelStrip [data-am-compartment-open="common_equity"]').innerText();
    ok("the populated Equity path survives the layered Debt refactor",
      /4125 Sponsor Holdings LLC/i.test(equityText) && /8\.00%/.test(equityText)
      && /\$2,500,000\.00/.test(equityText) && /100\.00%/.test(equityText), equityText);

    await page.setViewportSize({ width: 686, height: 900 });
    await page.evaluate(() => document.getElementById("appbarAdmin").classList.remove("hidden"));
    const midWidth = await page.evaluate(() => ({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      actionsRight: document.querySelector(".appbar-actions").getBoundingClientRect().right,
      screenToolsInMenu: getComputedStyle(document.getElementById("gearScreenSection")).display,
    }));
    ok("the institutional header stays contained at the in-app browser width",
      midWidth.documentWidth <= midWidth.viewport + 1
      && midWidth.actionsRight <= midWidth.viewport + 1
      && midWidth.screenToolsInMenu !== "none", JSON.stringify(midWidth));
    ok("the complete browser journey has no uncaught errors",
      pageErrors.length === 0 && consoleErrors.length === 0,
      pageErrors.concat(consoleErrors).join(" | "));

    console.log("\nDEBT LAYERED UI BROWSER PROOF\n");
    console.log("  assertions passed: " + passed);
    console.log("  assertions failed: " + failed);
    console.log("  screenshots: " + OUT);
    process.exitCode = failed ? 1 : 0;
  } finally {
    if (browser) await browser.close();
    if (tlsServer) await new Promise((resolve) => tlsServer.close(resolve));
    if (staticServer) await new Promise((resolve) => staticServer.close(resolve));
    if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  }
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
