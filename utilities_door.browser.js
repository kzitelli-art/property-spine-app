"use strict";

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { serveStatic, serveTls } = require("./tools/browser_stack.js");

const API_REPO = process.env.API_REPO || path.join(__dirname, "..", "api-utilities");
const { chromium } = require(path.join(API_REPO, "node_modules", "playwright"));
const express = require(path.join(API_REPO, "node_modules", "express"));
const utilityRoutes = require(path.join(API_REPO, "src", "asset", "utility_routes.js"));
const positionRead = require(path.join(API_REPO, "src", "asset", "utility_position_read.js"));
const ROOMS = require(path.join(API_REPO, "src", "surfaces", "asset_management.js")).ROOMS;

const PROPERTY = "property-utilities-browser";
const USER = "user-utilities-browser";
const SESSION = "utilities-browser-session";
const PROD = "https://property-spine-api.onrender.com";
const APP_PORT = 8500 + (process.pid % 300);
const TLS_PORT = 9400 + (process.pid % 300);
const OUT = process.env.SHOTS || path.join(os.tmpdir(), "property-spine-utilities-browser");

if (process.platform === "win32"
    && fs.existsSync("C:\\Program Files\\Git\\usr\\bin\\openssl.exe")
    && !String(process.env.PATH || "").toLowerCase().includes("git\\usr\\bin")) {
  process.env.PATH = "C:\\Program Files\\Git\\usr\\bin;" + process.env.PATH;
}

const rows = {
  utility_services: [
    { id: "svc-electric", property_id: PROPERTY, service_class: "electricity" },
    { id: "svc-water", property_id: PROPERTY, service_class: "water_sewer_combined" },
    { id: "svc-recycling", property_id: PROPERTY, service_class: "recycling" },
  ],
  utility_service_declarations: [
    { id: "dec-electric", property_id: PROPERTY, service_id: "svc-electric",
      applicability: "present", effective_from: "2026-01-01",
      source_artifact_id: "artifact-electric-agreement" },
    { id: "dec-water", property_id: PROPERTY, service_id: "svc-water",
      applicability: "present", effective_from: "2026-01-01",
      provenance_note: "confirmed from provider statement" },
    { id: "dec-recycling", property_id: PROPERTY, service_id: "svc-recycling",
      applicability: "not_applicable", effective_from: "2026-01-01",
      provenance_note: "confirmed by property manager" },
  ],
  utility_providers: [
    { id: "provider-peco", property_id: PROPERTY, provider_name: "PECO" },
    { id: "provider-water", property_id: PROPERTY, provider_name: "Philadelphia Water Department" },
  ],
  utility_service_providers: [
    { id: "sp-electric", property_id: PROPERTY, service_id: "svc-electric",
      provider_id: "provider-peco", effective_from: "2026-01-01" },
    { id: "sp-water", property_id: PROPERTY, service_id: "svc-water",
      provider_id: "provider-water", effective_from: "2026-01-01" },
  ],
  utility_arrangements: [
    { id: "arr-electric", property_id: PROPERTY, service_id: "svc-electric",
      physical_arrangement: "individual_provider_meters", provider_bill_recipient: "property",
      provider_responsible_party: "property", economic_responsibility: "shared",
      resident_recovery_method: "rubs_allocation", billing_administrator_name: "Conservice",
      resident_payment_recipient: "property", effective_from: "2026-01-01" },
    { id: "arr-water", property_id: PROPERTY, service_id: "svc-water",
      physical_arrangement: "whole_building_master_meter", provider_bill_recipient: "property",
      provider_responsible_party: "property", economic_responsibility: "shared",
      resident_recovery_method: "rubs_allocation", billing_administrator_name: "Conservice",
      resident_payment_recipient: "property", effective_from: "2026-01-01" },
  ],
  utility_provider_accounts: [
    { id: "acct-common", property_id: PROPERTY, provider_id: "provider-peco",
      external_account_identifier: "778899001122", service_address: "4125 Chestnut Street",
      billing_cadence: "monthly", effective_from: "2026-01-01",
      source_artifact_id: "artifact-electric-statement" },
    { id: "acct-506", property_id: PROPERTY, provider_id: "provider-peco",
      external_account_identifier: "778899005506", service_address: "4125 Chestnut Street Unit 506",
      billing_cadence: "monthly", effective_from: "2026-01-01" },
    { id: "acct-water", property_id: PROPERTY, provider_id: "provider-water",
      external_account_identifier: "PWD4433221100", service_address: "4125 Chestnut Street",
      billing_cadence: "monthly", effective_from: "2026-01-01" },
  ],
  utility_account_services: [
    { id: "as-common", property_id: PROPERTY, account_id: "acct-common",
      service_id: "svc-electric", effective_from: "2026-01-01" },
    { id: "as-506", property_id: PROPERTY, account_id: "acct-506",
      service_id: "svc-electric", effective_from: "2026-01-01" },
    { id: "as-water", property_id: PROPERTY, account_id: "acct-water",
      service_id: "svc-water", effective_from: "2026-01-01" },
  ],
  utility_service_points: [
    { id: "point-common", property_id: PROPERTY, service_id: "svc-electric",
      point_kind: "common_area", location_label: "Common areas", effective_from: "2026-01-01" },
    { id: "point-506", property_id: PROPERTY, service_id: "svc-electric",
      point_kind: "unit", location_label: "Unit 506", effective_from: "2026-01-01" },
    { id: "point-water", property_id: PROPERTY, service_id: "svc-water",
      point_kind: "whole_building", location_label: "Whole building", effective_from: "2026-01-01" },
  ],
  utility_meters: [
    { id: "meter-common", property_id: PROPERTY, provider_id: "provider-peco",
      meter_kind: "provider_meter", meter_identifier: "MTR-COMMON-9331", effective_from: "2026-01-01" },
    { id: "meter-506", property_id: PROPERTY, provider_id: "provider-peco",
      meter_kind: "provider_meter", meter_identifier: "MTR-UNIT-5067", effective_from: "2026-01-01" },
    { id: "meter-water", property_id: PROPERTY, provider_id: "provider-water",
      meter_kind: "provider_meter", meter_identifier: "PWD-METER-8241", effective_from: "2026-01-01" },
  ],
  utility_meter_service_points: [
    { id: "mp-common", property_id: PROPERTY, meter_id: "meter-common",
      service_point_id: "point-common", effective_from: "2026-01-01" },
    { id: "mp-506", property_id: PROPERTY, meter_id: "meter-506",
      service_point_id: "point-506", effective_from: "2026-01-01" },
    { id: "mp-water", property_id: PROPERTY, meter_id: "meter-water",
      service_point_id: "point-water", effective_from: "2026-01-01" },
  ],
  utility_account_service_points: [
    { id: "ap-common", property_id: PROPERTY, account_id: "acct-common",
      service_point_id: "point-common", effective_from: "2026-01-01" },
    { id: "ap-506", property_id: PROPERTY, account_id: "acct-506",
      service_point_id: "point-506", effective_from: "2026-01-01" },
    { id: "ap-water", property_id: PROPERTY, account_id: "acct-water",
      service_point_id: "point-water", effective_from: "2026-01-01" },
  ],
  utility_account_meters: [
    { id: "am-common", property_id: PROPERTY, account_id: "acct-common",
      meter_id: "meter-common", effective_from: "2026-01-01" },
    { id: "am-506", property_id: PROPERTY, account_id: "acct-506",
      meter_id: "meter-506", effective_from: "2026-01-01" },
    { id: "am-water", property_id: PROPERTY, account_id: "acct-water",
      meter_id: "meter-water", effective_from: "2026-01-01" },
  ],
  utility_statements: [
    { id: "statement-electric", property_id: PROPERTY, account_id: "acct-common",
      statement_identifier: "PECO-2026-07", bill_date: "2026-08-03",
      service_period_start: "2026-07-01", service_period_end: "2026-07-31",
      due_date: "2026-08-24", currency_code: "USD", amount_billed_cents: 1844217,
      current_amount_due_cents: 1844217, late_fee_cents: 0,
      source_artifact_id: "artifact-electric-statement", recorded_at: "2026-08-04T12:00:00Z" },
  ],
  utility_statement_usage: [
    { id: "usage-electric", property_id: PROPERTY, statement_id: "statement-electric",
      service_id: "svc-electric", meter_id: "meter-common", quantity: 18420,
      usage_unit: "kWh", usage_basis: "observed" },
  ],
};

function cloneRooms() {
  return JSON.parse(JSON.stringify(ROOMS)).map((room) => {
    room.establishment = room.key === "property_expenses" ? "partially_established" : "not_established";
    room.establishment_summary = room.key === "property_expenses"
      ? "Utilities is partly established." : "No governed position yet.";
    room.compartments = (room.compartments || []).map((part) => ({
      ...part,
      establishment: part.key === "utilities" ? "partially_established" : "not_established",
      note: part.key === "utilities" ? "Two services established; setup questions remain." : part.note,
    }));
    return room;
  });
}

function fakePool() {
  const client = {
    async query(sql) {
      const match = String(sql).match(/from\s+(utility_[a-z_]+)/i);
      if (!match) throw new Error("unexpected browser proof query: " + sql);
      return { rows: rows[match[1]] || [] };
    },
    release() {},
  };
  return { async connect() { return client; } };
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
  let utilityReads = 0;
  let evidenceReads = 0;
  const pool = fakePool();

  try {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      res.setHeader("access-control-allow-origin", "*");
      res.setHeader("access-control-allow-headers", "x-staff-session,content-type,accept");
      if (req.method === "OPTIONS") return res.status(204).end();
      next();
    });
    app.get("/operator/me", (req, res) => {
      if (req.headers["x-staff-session"] !== SESSION) return res.status(401).json({ error: "no session" });
      return res.json({ id: USER, name: "Utility Operator", role: "property_manager",
        property_id: PROPERTY, property_name: "4125 Chestnut Street",
        allowed_modules: ["management", "maintenance", "asset_management"], platform_role: "member" });
    });
    app.get("/operator/asset-management/overview", (req, res) => {
      if (req.headers["x-staff-session"] !== SESSION) return res.status(401).json({ error: "no session" });
      return res.json({ property_id: PROPERTY, as_of: "2026-08-13", rooms: cloneRooms() });
    });

    const requireOperator = (req, res, next) => {
      if (req.headers["x-staff-session"] !== SESSION) return res.status(401).json({ error: "no session" });
      req.operator = { id: USER, property_id: PROPERTY,
        allowed_modules: ["management", "maintenance", "asset_management"] };
      next();
    };
    const refuseClientAuthority = (req, res, next) => {
      const supplied = { ...(req.query || {}), ...(req.body || {}) };
      if (supplied.property_id || supplied.user_id) return res.status(400).json({ error: "client_authority_refused" });
      next();
    };
    const requireAssetManagementModule = (_req, _res, next) => next();
    app.use((req, _res, next) => {
      if (req.method === "GET" && req.path === "/operator/asset-management/utilities") utilityReads += 1;
      next();
    });
    app.use(utilityRoutes({
      pool, positionRead, requireOperator, refuseClientAuthority, requireAssetManagementModule,
      artifacts: {
        MAX_BYTES: 25 * 1024 * 1024,
        async read(_pool, id) {
          evidenceReads += 1;
          if (id !== "artifact-electric-statement") return null;
          return { scope_type: "property", scope_id: PROPERTY,
            original_filename: "PECO July 2026.pdf", mime_type: "application/pdf",
            content: Buffer.from("synthetic browser proof statement") };
        },
      },
    }));

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
    let redirected = 0;
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error && error.message || error)));
    await page.route(PROD + "/**", async (route) => {
      redirected += 1;
      await route.continue({ url: route.request().url().replace(PROD, "https://127.0.0.1:" + TLS_PORT) });
    });
    await page.addInitScript(([api, token]) => {
      localStorage.setItem("ps_api_base", api);
      sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: token }));
    }, ["https://127.0.0.1:" + TLS_PORT, SESSION]);

    await page.goto("http://127.0.0.1:" + APP_PORT + "/index.html", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    ok("the app loaded without a sign-in overlay",
      !/Sign in to continue|Enter your phone/i.test(await page.locator("body").innerText()));
    ok("the sealed loader reached the local transport", redirected > 0, "redirected=" + redirected);
    ok("the current property came from the session authority",
      /4125 Chestnut Street/.test(await page.locator("body").innerText()));

    await page.locator("#deskCardAssetManagement").click();
    await page.locator('#intelStrip [data-am-view="home"]').waitFor();
    await page.locator('#intelStrip [data-am-room="property_expenses"]').click();
    await page.locator('#intelStrip [data-am-room-open="property_expenses"]').waitFor();
    ok("Utilities is a live Property Expenses control",
      await page.locator('#intelStrip [data-am-compartment="utilities"][data-am-compartment-live]').count() === 1);
    await page.locator('#intelStrip [data-am-compartment="utilities"]').click();
    await page.locator('#intelStrip [data-am-compartment-open="utilities"]').waitFor();
    await page.screenshot({ path: path.join(OUT, "utilities-desktop.png"), fullPage: true });

    const utilityText = await page.locator('#intelStrip [data-am-compartment-open="utilities"]').innerText();
    ok("the real Utility GET route supplied the screen", utilityReads === 1, "reads=" + utilityReads);
    ok("known services render", /Electricity/.test(utilityText) && /Water \/ sewer/.test(utilityText));
    ok("NOT_ESTABLISHED survives as setup questions",
      /Does this property have natural gas service\?/.test(utilityText));
    ok("multiple provider accounts remain separate",
      /\*+1122/.test(utilityText) && /\*+5506/.test(utilityText));
    ok("account service points remain visible",
      /Common areas/.test(utilityText) && /Unit 506/.test(utilityText));
    ok("meters remain distinct from accounts",
      /\*+9331 Provider Meter/.test(utilityText) && /\*+5067 Provider Meter/.test(utilityText));
    ok("resident recovery is shown without becoming payment",
      /RUBS allocation/.test(utilityText) && /Conservice/.test(utilityText)
      && /Property receives resident payments/.test(utilityText) && !/paid|settled/i.test(utilityText));
    ok("the latest statement renders its own bill date and amount",
      /2026-08-03/.test(utilityText) && /\$18,442\.17/.test(utilityText));

    const popupWait = page.waitForEvent("popup", { timeout: 5000 }).catch(() => null);
    await page.locator('#intelStrip [data-ut-account="acct-common"] button').click();
    const popup = await popupWait;
    ok("an entitled source reference opens through the evidence route", evidenceReads === 1 && !!popup,
      "evidenceReads=" + evidenceReads + ", popup=" + !!popup);
    if (popup) await popup.close();

    await page.getByRole("button", { name: "Establish setup" }).click();
    await page.locator('[data-ut-input="ut_service"]').waitFor();
    ok("setup opens a canonical confirmation sheet",
      await page.locator('[data-ut-input="ut_provenance"]').count() === 1
      && await page.getByRole("button", { name: "Record setup" }).count() === 1);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(OUT, "utilities-mobile-setup.png"), fullPage: true });
    const mobile = await page.evaluate(() => {
      const sheet = document.querySelector(".ut-sheet");
      const root = document.querySelector('[data-am-compartment-open="utilities"]');
      const box = sheet && sheet.getBoundingClientRect();
      return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
        rootWidth: root && root.scrollWidth, sheetLeft: box && box.left, sheetRight: box && box.right,
        cancel: !!document.querySelector('.ut-sheet button[onclick="psUtilitiesClose()"]'),
        confirm: !!document.querySelector('.ut-sheet button[onclick="psUtilitiesConfirmSetup()"]') };
    });
    ok("the narrow setup sheet has no horizontal dead end",
      mobile.documentWidth <= mobile.viewport + 1 && mobile.sheetLeft >= 0
      && mobile.sheetRight <= mobile.viewport + 1 && mobile.cancel && mobile.confirm,
      JSON.stringify(mobile));
    await page.locator(".ut-sheet").evaluate((sheet) => { sheet.scrollTop = sheet.scrollHeight; });
    const mobileActions = await page.evaluate(() => {
      const button = document.querySelector('.ut-sheet button[onclick="psUtilitiesConfirmSetup()"]');
      if (!button) return { found: false };
      const box = button.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return { found: true, top: box.top, bottom: box.bottom,
        reachable: box.top >= 0 && box.bottom <= innerHeight
          && !!hit && (hit === button || button.contains(hit) || hit.contains(button)) };
    });
    ok("the narrow setup confirmation remains reachable after scrolling",
      mobileActions.found && mobileActions.reachable, JSON.stringify(mobileActions));
    await page.screenshot({ path: path.join(OUT, "utilities-mobile-setup-actions.png") });

    await page.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Add statement" }).click();
    await page.locator('[data-ut-input="ut_bill_file"]').waitFor();
    await page.screenshot({ path: path.join(OUT, "utilities-mobile-statement.png"), fullPage: true });
    ok("the statement flow begins with retained evidence",
      await page.locator('[data-ut-input="ut_bill_file"]').getAttribute("accept") === "application/pdf,.pdf");
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.locator("#intelStrip .am-back").click();
    await page.locator('#intelStrip [data-am-room-open="property_expenses"]').waitFor();
    ok("back returns to the unchanged nine-compartment Property Expenses room",
      await page.locator("#intelStrip [data-am-compartment]").count() === 9);
    ok("no page error occurred", pageErrors.length === 0, pageErrors.join(" | "));

    console.log("\n  assertions passed: " + passed);
    console.log("  assertions failed: " + failed);
    console.log("  screenshots: " + OUT);
    if (failed) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    for (const server of [apiServer, staticServer, tlsServer]) {
      if (server) await new Promise((resolve) => server.close(resolve));
    }
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
