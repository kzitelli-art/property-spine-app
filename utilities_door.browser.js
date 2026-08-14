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
      physical_arrangement: "whole_building_master_meter", provider_bill_recipient: null,
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
        async store(_pool, input) {
          return { id: "artifact-browser-upload", original_filename: input.filename,
            artifact_kind: input.artifact_kind, deduplicated: false,
            receipt: input.filename + " is on file." };
        },
        async read(_pool, id) {
          evidenceReads += 1;
          if (id !== "artifact-electric-statement") return null;
          return { scope_type: "property", scope_id: PROPERTY,
            original_filename: "PECO July 2026.pdf", mime_type: "application/pdf",
            content: Buffer.from("synthetic browser proof statement") };
        },
      },
      async fileToText() {
        return [
          "Provider: PECO", "Account Number: 778899001122",
          "Statement Number: PECO-2026-08", "Service: Electricity",
          "Bill Date: 2026-08-03", "Due Date: 2026-08-24",
          "Service Period: 2026-07-01 to 2026-07-31",
          "Amount Billed: $18442.17", "Current Amount Due: $18442.17",
          "Total Usage: 18420 kWh", "Reading Type: Actual",
        ].join("\n");
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
    // Utilities does not depend on these shell-level third-party assets. Keep
    // this proof deterministic when the workstation cannot reach their CDNs.
    await page.route(/^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdn\.plaid\.com)\//,
      (route) => route.abort());
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
    const naturalGasSetup = page.locator("#intelStrip .ut-setup-item").filter({ hasText: "Natural gas" });
    ok("NOT_ESTABLISHED survives as one compact setup decision",
      await naturalGasSetup.count() === 1 && /not established/i.test(await naturalGasSetup.innerText())
      && await page.locator("#intelStrip .ut-service").filter({ hasText: "Natural gas" }).count() === 0);
    const recyclingSetup = page.locator("#intelStrip .ut-setup-item").filter({ hasText: "Recycling" });
    ok("not-applicable service truth stays quiet",
      await recyclingSetup.getByRole("button").count() === 0);
    const waterSetup = page.locator("#intelStrip .ut-setup-item").filter({ hasText: "Water / sewer" });
    ok("a present service with an unresolved fact is visibly actionable",
      /1 gap/i.test(await waterSetup.innerText())
      && await waterSetup.getByRole("button", { name: /Complete Water \/ sewer/ }).count() === 1
      && /Provider bill recipient not established/.test(utilityText));
    const electricService = page.locator('#intelStrip [data-ut-service="electricity"]');
    const waterService = page.locator('#intelStrip [data-ut-service="water_sewer_combined"]');
    ok("current services stay compact while a service needing attention opens",
      !(await electricService.evaluate((element) => element.open))
      && await waterService.evaluate((element) => element.open));
    ok("multiple provider accounts remain separate",
      /\*+1122/.test(utilityText) && /\*+5506/.test(utilityText));
    ok("account service points remain visible",
      /Common areas/.test(utilityText) && /Unit 506/.test(utilityText));
    ok("meters remain distinct from accounts",
      /\*+9331 Provider Meter/.test(utilityText) && /\*+5067 Provider Meter/.test(utilityText));
    await electricService.locator("summary").click();
    const expandedElectricText = await electricService.innerText();
    ok("resident recovery is available on demand without becoming payment",
      /RUBS allocation/.test(expandedElectricText) && /Conservice/.test(expandedElectricText)
      && /Property receives resident payments/.test(expandedElectricText)
      && !/paid|settled/i.test(expandedElectricText));
    ok("the latest statement renders its own bill date and amount",
      /2026-08-03/.test(utilityText) && /\$18,442\.17/.test(utilityText));

    const popupWait = page.waitForEvent("popup", { timeout: 5000 }).catch(() => null);
    await page.locator('#intelStrip [data-ut-account="acct-common"] button').click();
    const popup = await popupWait;
    ok("an entitled source reference opens through the evidence route", evidenceReads === 1 && !!popup,
      "evidenceReads=" + evidenceReads + ", popup=" + !!popup);
    if (popup) await popup.close();

    await page.getByRole("button", { name: "Continue setup" }).click();
    await page.locator('[data-ut-input="ut_service"]').waitFor();
    ok("setup opens a canonical confirmation sheet",
      await page.locator('[data-ut-input="ut_provenance"]').count() === 1
      && await page.getByRole("button", { name: "Record setup" }).count() === 1);

    await page.locator('[data-ut-input="ut_service"]').selectOption("electricity");
    await page.locator('[data-ut-input="ut_topology"]').waitFor({ state: "attached" });
    ok("switching to an established service loads its current governed arrangement",
      await page.locator('[data-ut-input="ut_provider_existing"]').inputValue() === "provider-peco"
      && await page.locator('[data-ut-input="ut_topology"]').inputValue() === "individual_provider_meters"
      && await page.locator('[data-ut-input="ut_recovery"]').inputValue() === "rubs_allocation"
      && await page.locator('[data-ut-input="ut_billing_admin"]').inputValue() === "Conservice");
    ok("an established service keeps applicability fixed during ordinary setup review",
      await page.locator('[data-ut-input="ut_applicability"]').isDisabled()
      && await page.locator('[data-ut-input="ut_applicability"]').inputValue() === "unchanged"
      && await page.getByRole("heading", { name: "Review Electricity" }).count() === 1);

    const setupBodies = [];
    await page.route("**/operator/asset-management/utilities/setup", async (route) => {
      setupBodies.push(route.request().postDataJSON());
      await route.fulfill({ status: 201, contentType: "application/json",
        body: JSON.stringify({ receipt: "Utility setup reviewed." }) });
    });
    await page.locator('[data-ut-input="ut_provenance"]').fill("Reviewed against the current governed setup.");
    await page.getByRole("button", { name: "Save setup" }).click();
    await page.locator(".ut-sheet .ut-error").waitFor();
    ok("an unchanged review cannot claim a canonical write",
      setupBodies.length === 0
      && /Change at least one Utility setup fact/.test(await page.locator(".ut-sheet .ut-error").innerText()));
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.getByRole("button", { name: "Continue setup" }).click();
    await page.locator('[data-ut-input="ut_service"]').selectOption("electricity");
    await page.locator(".ut-disclosure summary").filter({ hasText: "Responsibility and resident billing" }).click();
    await page.locator('[data-ut-input="ut_economic"]').selectOption("resident");
    await page.locator('[data-ut-input="ut_provenance"]').fill("Reviewed against the executed utility agreement.");
    await page.getByRole("button", { name: "Save setup" }).click();
    await page.locator(".ut-sheet .ut-error").waitFor();
    ok("an established arrangement cannot be corrected without a reason",
      setupBodies.length === 0
      && /what was incorrect/i.test(await page.locator(".ut-sheet .ut-error").innerText()));
    await page.locator('[data-ut-input="ut_revision_reason"]').fill("Economic responsibility was transcribed incorrectly.");
    await page.getByRole("button", { name: "Save setup" }).click();
    await page.locator('#intelStrip [data-am-compartment-open="utilities"]').waitFor();
    ok("an arrangement correction carries explicit lineage and keeps its original effective date",
      setupBodies[0] && setupBodies[0].arrangement
      && setupBodies[0].supersedes_id === "arr-electric"
      && setupBodies[0].revision_reason === "Economic responsibility was transcribed incorrectly."
      && setupBodies[0].effective_from === "2026-01-01",
      JSON.stringify(setupBodies[0]));

    await page.getByRole("button", { name: "Continue setup" }).click();
    await page.locator('[data-ut-input="ut_service"]').selectOption("electricity");
    await page.locator(".ut-disclosure summary").filter({ hasText: "Account, service point, and meter" }).click();
    await page.locator('[data-ut-input="ut_account"]').fill("778899009999");
    await page.locator('[data-ut-input="ut_provenance"]').fill("Confirmed from the new provider account file.");
    await page.getByRole("button", { name: "Save setup" }).click();
    await page.locator('#intelStrip [data-am-compartment-open="utilities"]').waitFor();
    ok("a new account uses the established provider without duplicating its service relationship",
      setupBodies[1] && setupBodies[1].account
      && setupBodies[1].account.provider_id === "provider-peco"
      && !setupBodies[1].provider_id && !setupBodies[1].provider,
      JSON.stringify(setupBodies[1]));

    await page.getByRole("button", { name: "Continue setup" }).click();
    await page.locator('[data-ut-input="ut_service"]').selectOption("electricity");
    await page.locator('[data-ut-input="ut_provider_name"]').fill("Alternative Electric Supply");
    await page.locator(".ut-disclosure summary").filter({ hasText: "Account, service point, and meter" }).click();
    await page.locator('[data-ut-input="ut_account"]').fill("ALT-4400");
    await page.locator('[data-ut-input="ut_provenance"]').fill("Confirmed from the alternate provider statement.");
    await page.getByRole("button", { name: "Save setup" }).click();
    await page.locator('#intelStrip [data-am-compartment-open="utilities"]').waitFor();
    ok("a named new provider owns its new account instead of the preselected provider",
      setupBodies[2] && setupBodies[2].provider
      && setupBodies[2].provider.provider_name === "Alternative Electric Supply"
      && setupBodies[2].account && !setupBodies[2].account.provider_id,
      JSON.stringify(setupBodies[2]));

    await page.getByRole("button", { name: "Continue setup" }).click();
    await page.locator('[data-ut-input="ut_service"]').waitFor();
    await page.locator('[data-ut-input="ut_applicability"]').selectOption("present");
    await page.locator('[data-ut-input="ut_provider_name"]').fill("Philadelphia Gas Works");

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

    await page.getByRole("button", { name: "Record setup" }).click();
    await page.locator(".ut-sheet .ut-error").waitFor();
    ok("a setup validation receipt preserves the operator's draft",
      await page.locator('[data-ut-input="ut_applicability"]').inputValue() === "present"
      && await page.locator('[data-ut-input="ut_provider_name"]').inputValue() === "Philadelphia Gas Works");

    await page.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Add statement" }).click();
    await page.locator('[data-ut-input="ut_bill_file"]').waitFor();
    await page.screenshot({ path: path.join(OUT, "utilities-mobile-statement.png"), fullPage: true });
    ok("the statement flow begins with retained evidence",
      await page.locator('[data-ut-input="ut_bill_file"]').getAttribute("accept") === "application/pdf,.pdf");
    await page.locator('[data-ut-input="ut_bill_file"]').setInputFiles({
      name: "PECO August 2026.pdf", mimeType: "application/pdf",
      buffer: Buffer.from("synthetic utility statement"),
    });
    await page.getByRole("button", { name: "Retain and read" }).click();
    await page.locator('[data-ut-input="ut_bill_account"]').waitFor();
    ok("usage mapping waits for the governed provider account",
      await page.locator('[data-ut-input="ut_usage_service"]').isDisabled()
      && await page.locator('[data-ut-input="ut_usage_meter"]').isDisabled());

    await page.locator('[data-ut-input="ut_current_due"]').fill("18440.00");
    await page.locator('[data-ut-input="ut_bill_account"]').selectOption("acct-common");
    const commonMapping = await page.evaluate(() => ({
      services: [...document.querySelector('[data-ut-input="ut_usage_service"]').options]
        .map((item) => item.value),
      meters: [...document.querySelector('[data-ut-input="ut_usage_meter"]').options]
        .map((item) => item.value),
      selectedService: document.querySelector('[data-ut-input="ut_usage_service"]').value,
    }));
    ok("an account exposes only its own mapped service and meter",
      JSON.stringify(commonMapping.services) === JSON.stringify(["", "svc-electric"])
      && JSON.stringify(commonMapping.meters) === JSON.stringify(["", "meter-common"])
      && commonMapping.selectedService === "svc-electric", JSON.stringify(commonMapping));

    await page.locator('[data-ut-input="ut_bill_account"]').selectOption("acct-506");
    const unitMapping = await page.evaluate(() => ({
      meters: [...document.querySelector('[data-ut-input="ut_usage_meter"]').options]
        .map((item) => item.value),
      currentDue: document.querySelector('[data-ut-input="ut_current_due"]').value,
    }));
    ok("changing accounts replaces only mapped choices and preserves statement fields",
      JSON.stringify(unitMapping.meters) === JSON.stringify(["", "meter-506"])
      && unitMapping.currentDue === "18440.00", JSON.stringify(unitMapping));

    await page.locator('[data-ut-input="ut_bill_date"]').fill("");
    await page.getByRole("button", { name: "Confirm statement" }).click();
    await page.locator(".ut-sheet .ut-error").waitFor();
    ok("a validation receipt preserves the operator's statement draft",
      await page.locator('[data-ut-input="ut_bill_account"]').inputValue() === "acct-506"
      && await page.locator('[data-ut-input="ut_current_due"]').inputValue() === "18440.00"
      && await page.locator('[data-ut-input="ut_usage_service"]').inputValue() === "svc-electric");
    const statementMobile = await page.evaluate(() => {
      const sheet = document.querySelector(".ut-sheet");
      const box = sheet && sheet.getBoundingClientRect();
      return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
        sheetLeft: box && box.left, sheetRight: box && box.right };
    });
    ok("the narrow statement confirmation has no horizontal dead end",
      statementMobile.documentWidth <= statementMobile.viewport + 1
      && statementMobile.sheetLeft >= 0 && statementMobile.sheetRight <= statementMobile.viewport + 1,
      JSON.stringify(statementMobile));
    await page.locator(".ut-sheet").evaluate((sheet) => { sheet.scrollTop = sheet.scrollHeight; });
    const statementAction = await page.evaluate(() => {
      const button = document.querySelector('.ut-sheet button[onclick="psUtilitiesConfirmStatement()"]');
      const box = button && button.getBoundingClientRect();
      const hit = box && document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return { found: !!button, top: box && box.top, bottom: box && box.bottom,
        reachable: !!box && box.top >= 0 && box.bottom <= innerHeight
          && !!hit && (hit === button || button.contains(hit) || hit.contains(button)) };
    });
    ok("the narrow statement confirmation remains reachable after scrolling",
      statementAction.found && statementAction.reachable, JSON.stringify(statementAction));
    await page.screenshot({ path: path.join(OUT, "utilities-mobile-statement-confirm.png") });
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(async () => {
      const response = await window.__psLive.assetManagementUtilities({});
      const data = response && response.data || response;
      const complete = JSON.parse(JSON.stringify(data));
      complete.opening.unresolved = [];
      complete.detail.unresolved = [];
      complete.standing.unresolved = [];
      complete.standing.unresolved_count = 0;
      complete.standing.unresolved_services = 0;
      complete.standing.setup_state = "established";
      complete.opening.setup_state = "established";
      complete.detail.services.forEach((service) => {
        if (service.applicability.truth_state === "NOT_ESTABLISHED") {
          service.applicability = { truth_state: "ESTABLISHED", value: "not_applicable" };
        }
      });
      complete.detail.services.find((service) => service.service_class === "water_sewer_combined")
        .arrangement.provider_bill_recipient = "property";
      document.getElementById("intelStrip").innerHTML = window.__psUtilitiesDoor.render(complete);
    });
    await page.locator('#intelStrip [data-am-compartment-open="utilities"]').waitFor();
    await page.screenshot({ path: path.join(OUT, "utilities-complete-desktop.png"), fullPage: true });
    const completeText = await page.locator('#intelStrip [data-am-compartment-open="utilities"]').innerText();
    ok("a fully classified property becomes quiet without claiming fake completion",
      /2 services established .* setup current/.test(completeText)
      && await page.locator("#intelStrip [data-ut-setup]").count() === 12
      && await page.locator("#intelStrip .ut-state.is-attention").count() === 0
      && !/100%|complete percentage/i.test(completeText));
    ok("fully current service details stay collapsed until requested",
      await page.locator("#intelStrip .ut-service[open]").count() === 0);

    await page.evaluate(() => {
      const definitions = [
        ["electricity", "Electricity"], ["natural_gas", "Natural gas"],
        ["water", "Water"], ["sewer", "Sewer"],
        ["water_sewer_combined", "Water / sewer"], ["steam_district_energy", "Steam / district energy"],
        ["fuel_oil", "Fuel oil"], ["propane", "Propane"],
        ["internet_data", "Internet / data"], ["telephone_telecom", "Telephone / telecom"],
        ["waste_trash", "Waste / trash"], ["recycling", "Recycling"],
      ];
      const services = definitions.map(([service_class, label]) => ({
        service_class, label, applicability: { truth_state: "NOT_ESTABLISHED", value: null },
        providers: [], accounts: [], service_points: [], meters: [], latest_statement: null,
      }));
      const unresolved = definitions.map(([service, label]) => ({
        service, question: "Does this property have " + label.toLowerCase() + " service?",
        reason: "No present or not-applicable declaration has been established.",
      }));
      document.getElementById("intelStrip").innerHTML = window.__psUtilitiesDoor.render({
        standing: { established_services: 0 }, opening: { unresolved },
        detail: { services, accounts: [], meters: [], unresolved },
      });
    });
    await page.locator('#intelStrip [data-am-compartment-open="utilities"]').waitFor();
    await page.screenshot({ path: path.join(OUT, "utilities-empty-desktop.png"), fullPage: true });
    const emptyText = await page.locator('#intelStrip [data-am-compartment-open="utilities"]').innerText();
    ok("zero-truth renders one compact row per service and no empty dossiers",
      await page.locator('#intelStrip [data-ut-setup]').count() === 12
      && await page.locator('#intelStrip [data-ut-service]').count() === 0
      && !/Provider not established|Physical arrangement not established/.test(emptyText));
    ok("zero-truth hides empty account furniture and blocks premature statements",
      await page.locator('#intelStrip [data-ut-section="accounts"]').count() === 0
      && await page.getByRole("button", { name: "Add statement" }).isDisabled()
      && await page.getByRole("button", { name: "Start setup" }).count() === 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(OUT, "utilities-empty-mobile.png"), fullPage: true });
    const emptyMobile = await page.evaluate(() => ({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      setupRows: document.querySelectorAll("[data-ut-setup]").length,
    }));
    ok("zero-truth remains a single readable column on a narrow screen",
      emptyMobile.documentWidth <= emptyMobile.viewport + 1 && emptyMobile.setupRows === 12,
      JSON.stringify(emptyMobile));

    await page.locator("#intelStrip .am-back").click();
    await page.locator('#intelStrip [data-am-room-open="property_expenses"]').waitFor();
    ok("back returns to the unchanged nine-compartment Property Expenses room",
      await page.locator("#intelStrip [data-am-compartment]").count() === 9);
    await page.route("**/operator/asset-management/utilities", (route) => route.fulfill({
      status: 503, contentType: "application/json",
      body: JSON.stringify({ error: "utilities_compartment_unavailable" }),
    }));
    await page.locator('#intelStrip [data-am-compartment="utilities"]').click();
    await page.locator('#intelStrip [data-am-state="unavailable"]').waitFor();
    const unavailableText = await page.locator('#intelStrip [data-am-state="unavailable"]').innerText();
    ok("a failed Utility read is visible and cannot resemble empty truth",
      /unavailable right now/.test(unavailableText)
      && /failed read, not an empty compartment/.test(unavailableText));
    await page.screenshot({ path: path.join(OUT, "utilities-read-unavailable.png"), fullPage: true });
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
