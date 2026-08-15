"use strict";

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const Module = require("module");
const { serveStatic, serveTls } = require("./tools/browser_stack.js");

const API_RUNTIME = [
  process.env.API_RUNTIME,
  path.join(__dirname, "..", "api-contracted-services"),
  path.join(__dirname, "..", "api-utilities"),
  path.join(__dirname, "..", "api"),
].filter(Boolean).find((candidate) => (
  fs.existsSync(path.join(candidate, "node_modules", "playwright", "package.json"))
));
if (!API_RUNTIME) throw new Error("No workspace Playwright runtime found; set API_RUNTIME");
const API_DOMAIN = path.join(__dirname, "..", "api-contracted-services");
process.env.NODE_PATH = path.join(API_RUNTIME, "node_modules");
Module._initPaths();

const { chromium } = require(path.join(API_RUNTIME, "node_modules", "playwright"));
const express = require(path.join(API_RUNTIME, "node_modules", "express"));
const contractedRoutes = require(path.join(API_DOMAIN, "src", "asset", "contracted_service_routes.js"));
const ROOMS = require(path.join(API_DOMAIN, "src", "surfaces", "asset_management.js")).ROOMS;

const PROPERTY = "property-contracted-browser";
const USER = "user-contracted-browser";
const SESSION = "contracted-browser-session";
const PROD = "https://property-spine-api.onrender.com";
const APP_PORT = 8600 + (process.pid % 300);
const TLS_PORT = 9500 + (process.pid % 300);
const OUT = process.env.SHOTS || path.join(os.tmpdir(), "property-spine-contracted-services-browser");

if (process.platform === "win32"
    && fs.existsSync("C:\\Program Files\\Git\\usr\\bin\\openssl.exe")
    && !String(process.env.PATH || "").toLowerCase().includes("git\\usr\\bin")) {
  process.env.PATH = "C:\\Program Files\\Git\\usr\\bin;" + process.env.PATH;
}

function cloneRooms() {
  return JSON.parse(JSON.stringify(ROOMS)).map((room) => {
    room.establishment = room.key === "property_expenses" ? "partially_established" : "not_established";
    room.establishment_summary = room.key === "property_expenses"
      ? "Contracted Services is partly established." : "No governed position yet.";
    room.compartments = (room.compartments || []).map((part) => ({
      ...part,
      establishment: part.key === "contracted_services" ? "partially_established" : "not_established",
      note: part.key === "contracted_services"
      ? "Three service records; agreement authority and term questions remain." : part.note,
    }));
    return room;
  });
}

function position() {
  return {
    as_of: "2026-08-15",
    standing: {
      governed_engagement_count: 1,
      attention_count: 1,
      unresolved_count: 4,
      coverage_review: { reviewed_as_of: "2026-08-14" },
    },
    detail: {
      engagements: [
        {
          service_class: "resident_amenity",
          label: "Resident printing",
          engagement_label: "PrintWithMe amenity",
          provider: { id: "provider-print", name: "PrintWithMe" },
          execution_standing: "EXECUTED_GOVERNING",
          term_standing: {
            state: "ATTENTION",
            reason: "The notice decision is approaching; renewal outcome is not yet established.",
            accountable_owner: { state: "UNASSIGNED", label: "UNASSIGNED" },
            milestone: { kind: "notice_decision", date: "2026-10-01" },
            current: {
              commencement_trigger: "Installation and activation of the service",
              initial_term_months: 12,
              prices: [{ amount_cents: 19900, currency_code: "USD", price_basis: "monthly" }],
            },
          },
          scope: { summary: "Resident print, scan, copy, and fax amenity.", frequency: "Continuous amenity" },
          documents: [{ document_kind: "agreement", execution_state: "executed",
            evidence: { source_artifact_id: "artifact-print-agreement" } }],
          financial_observations: [{ line_label: "PrintWithMe - June 2026",
            provider_name: "PrintWithMe", period_start: "2026-06-01", period_end: "2026-06-30",
            amount_cents: 23460, currency_code: "USD" }],
        },
        {
          service_class: "pest_control",
          label: "Pest control",
          engagement_label: "Twice-monthly pest service",
          provider: { id: "provider-ehrlich", name: "Ehrlich" },
          execution_standing: "OFFERED_OR_UNSIGNED",
          term_standing: {
            state: "NOT_ESTABLISHED",
            reason: "Offered terms are recorded, but no executed governing term is established.",
            accountable_owner: { state: "UNASSIGNED", label: "UNASSIGNED" },
            milestone: null,
            offered: {
              commencement_date: "2022-11-07",
              prices: [{ amount_cents: 19933, currency_code: "USD", price_basis: "monthly" }],
            },
          },
          scope: null,
          documents: [{ document_kind: "agreement", execution_state: "partially_executed",
            evidence: { source_artifact_id: "artifact-ehrlich-agreement" } }],
          financial_observations: [{ line_label: "Patriot Pest Solutions - June 2026",
            provider_name: "Patriot Pest Solutions", period_start: "2026-06-01",
            period_end: "2026-06-30", amount_cents: 35640, currency_code: "USD" }],
        },
        {
          service_class: "other",
          label: "Generator maintenance",
          engagement_label: "Generac SD60 service proposal",
          provider: { id: "provider-genserve", name: "GenServe" },
          execution_standing: "OFFERED_OR_UNSIGNED",
          term_standing: {
            state: "NOT_ESTABLISHED",
            reason: "Offered terms are recorded, but no executed governing term is established.",
            accountable_owner: { state: "UNASSIGNED", label: "UNASSIGNED" },
            milestone: null,
            offered: {
              commencement_date: "2023-03-01", initial_end_date: "2024-03-01",
              prices: [{ amount_cents: 166860, currency_code: "USD", price_basis: "annual" }],
            },
          },
          scope: null,
          documents: [{ document_kind: "agreement", execution_state: "partially_executed",
            evidence: { source_artifact_id: "artifact-genserve-agreement" } }],
          financial_observations: [],
        },
      ],
      unmatched_documents: [{ filename: "4125 Chestnut - Otis - unexecuted.pdf", document_kind: "proposal",
        execution_state: "unsigned", evidence: { source_artifact_id: "artifact-otis-proposal" } }],
      unmatched_financial_observations: [{ label: "Waste removal - June 2026",
        provider_name: "Philly-wide Disposal", amount_cents: 151000, currency_code: "USD" }],
    },
  };
}

function fakePool() {
  return {
    async connect() {
      return { async query() { return { rows: [] }; }, release() {} };
    },
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
  let evidenceReads = 0;
  const confirmationBodies = [];

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
      return res.json({ id: USER, name: "Contract Operator", role: "property_manager",
        property_id: PROPERTY, property_name: "4125 Chestnut Street",
        allowed_modules: ["management", "maintenance", "asset_management"], platform_role: "member" });
    });
    app.get("/operator/asset-management/overview", (req, res) => {
      if (req.headers["x-staff-session"] !== SESSION) return res.status(401).json({ error: "no session" });
      return res.json({ property_id: PROPERTY, as_of: "2026-08-15", rooms: cloneRooms() });
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
      if (req.method === "GET" && req.path === "/operator/asset-management/contracted-services") reads += 1;
      next();
    });
    app.post("/operator/asset-management/contracted-services/confirm", (req, res) => {
      if (req.headers["x-staff-session"] !== SESSION) return res.status(401).json({ error: "no session" });
      confirmationBodies.push(req.body);
      return res.status(201).json({ receipt: "Required service recorded." });
    });
    app.use(contractedRoutes({
      pool: fakePool(), requireOperator, refuseClientAuthority, requireAssetManagementModule,
      positionRead: { async readPosition() { return position(); } },
      artifacts: {
        MAX_BYTES: 25 * 1024 * 1024,
        async read(_pool, id) {
          evidenceReads += 1;
          if (!/^artifact-/.test(id)) return null;
          return { scope_type: "property", scope_id: PROPERTY,
            original_filename: "governing-service-agreement.pdf", mime_type: "application/pdf",
            content: Buffer.from("contracted services browser proof") };
        },
        async store() { throw new Error("browser proof does not write evidence"); },
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
    ok("the app loads through the authenticated shell",
      !/Sign in to continue|Enter your phone/i.test(await page.locator("body").innerText()));
    ok("the sealed loader reaches the local authority transport", redirected > 0, "redirected=" + redirected);
    ok("the current property comes from session authority",
      /4125 Chestnut Street/.test(await page.locator("body").innerText()));

    await page.locator("#deskCardAssetManagement").click();
    await page.locator('#intelStrip [data-am-view="home"]').waitFor();
    await page.locator('#intelStrip [data-am-room="property_expenses"]').click();
    await page.locator('#intelStrip [data-am-room-open="property_expenses"]').waitFor();
    ok("Contracted Services is a live Property Expenses control",
      await page.locator('#intelStrip [data-am-compartment="contracted_services"][data-am-compartment-live]').count() === 1);
    await page.locator('#intelStrip [data-am-compartment="contracted_services"]').click();
    await page.locator('#intelStrip [data-am-compartment-open="contracted_services"]').waitFor();
    await page.screenshot({ path: path.join(OUT, "contracted-services-desktop.png"), fullPage: true });

    const text = await page.locator('#intelStrip [data-am-compartment-open="contracted_services"]').innerText();
    ok("the real Contracted Services route supplies the screen", reads === 1, "reads=" + reads);
    ok("one service register leads evidence reconciliation without a duplicate decision queue",
      await page.locator('#intelStrip [data-cs-section="attention"]').count() === 0
      && await page.locator('#intelStrip [data-cs-section="register"]').count() === 1
      && await page.locator('#intelStrip [data-cs-section="unmatched-evidence"]').count() === 1);
    ok("each recorded service exposes provider, agreement authority, price, and next action",
      /PrintWithMe/.test(text) && /Executed \/ governing/i.test(text)
      && /Ehrlich/.test(text) && /GenServe/.test(text)
      && (text.match(/Partially signed/gi) || []).length === 2
      && /Offer: \$199\.33 monthly/.test(text) && /Offer: \$1,668\.60 annual/.test(text)
      && (text.match(/Next: confirm all parties signed/g) || []).length === 2);
    ok("unsigned evidence stays retained without becoming governing truth",
      /4125 Chestnut - Otis - unexecuted\.pdf/.test(text) && /Not yet governing/.test(text));
    ok("unmatched accounting remains explicitly outside contract and payment truth",
      /Philly-wide Disposal/.test(text) && /Not contract or payment truth/.test(text));

    const printService = page.locator('#intelStrip [data-cs-service="resident_amenity"]');
    await printService.locator("summary").click();
    const printText = await printService.innerText();
    ok("contract price and accounting observation remain separate",
      /\$199\.00 monthly/.test(printText) && /\$234\.60/.test(printText)
      && /Accounting evidence, not contract price or payment/.test(printText));
    ok("payment and completed work remain unestablished",
      /Payment and completed work are not established here/.test(printText));

    const popupWait = page.waitForEvent("popup", { timeout: 5000 }).catch(() => null);
    await printService.getByRole("button", { name: "Open" }).click();
    const popup = await popupWait;
    ok("retained evidence opens through the property-scoped route", evidenceReads === 1 && !!popup,
      "evidenceReads=" + evidenceReads + ", popup=" + !!popup);
    if (popup) await popup.close();

    await page.getByRole("button", { name: "Add agreement or service" }).click();
    const setupSheet = page.getByRole("dialog", { name: "Add agreement or service" });
    await setupSheet.waitFor();
    ok("the setup sheet asks for evidence before confirmed truth",
      /Start with a document when you have one/.test(await setupSheet.innerText())
      && await setupSheet.locator('[data-cs-input="evidence_file"]').getAttribute("accept") === ".pdf");
    const evidenceKinds = await setupSheet.locator('[data-cs-input="artifact_kind"] option').allTextContents();
    ok("the setup sheet classifies invoice and accounting evidence honestly",
      evidenceKinds.includes("Invoice") && evidenceKinds.includes("Accounting report"),
      evidenceKinds.join(" | "));
    await setupSheet.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: "Add agreement or service" }).click();
    const gapSheet = page.getByRole("dialog", { name: "Add agreement or service" });
    await gapSheet.locator('[data-cs-input="service_class"]').selectOption("fire_alarm_monitoring");
    await gapSheet.locator('[data-cs-input="effective_from"]').fill("2026-08-15");
    await gapSheet.locator('[data-cs-input="provenance_note"]').fill(
      "Operator confirmed that fire alarm monitoring requires provider and agreement review."
    );
    await gapSheet.getByRole("button", { name: "Save confirmed facts" }).click();
    await page.waitForTimeout(350);
    const gapConfirmation = confirmationBodies.at(-1);
    ok("an unknown provider becomes a visible requirement instead of a fabricated engagement",
      gapConfirmation && gapConfirmation.requirement.service_class === "fire_alarm_monitoring"
      && !gapConfirmation.provider && !gapConfirmation.provider_id && !gapConfirmation.engagement,
      JSON.stringify(gapConfirmation));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(OUT, "contracted-services-mobile.png"), fullPage: true });
    const mobile = await page.evaluate(() => ({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      services: document.querySelectorAll('[data-cs-service]').length,
      controlsOutside: Array.from(document.querySelectorAll('[data-am-compartment-open="contracted_services"] button'))
        .filter((node) => { const box = node.getBoundingClientRect(); return box.right > innerWidth + 1 || box.left < -1; }).length,
    }));
    const mobileText = await page.locator('#intelStrip [data-am-compartment-open="contracted_services"]').innerText();
    ok("the 390px register keeps providers, authority, price, and actions visible",
      mobile.documentWidth <= mobile.viewport + 1 && mobile.services === 3 && mobile.controlsOutside === 0
      && /Ehrlich/.test(mobileText) && /Partially signed/i.test(mobileText)
      && /Offer: \$199\.33 monthly/.test(mobileText) && /Next: confirm all parties signed/.test(mobileText),
      JSON.stringify(mobile));

    await page.evaluate(() => {
      document.getElementById("intelStrip").innerHTML = window.__psContractedServicesDoor.render({
        standing: { governed_engagement_count: 0, attention_count: 0, unresolved_count: 0 },
        detail: { engagements: [], unmatched_documents: [], unmatched_financial_observations: [] },
      });
    });
    await page.screenshot({ path: path.join(OUT, "contracted-services-empty-mobile.png"), fullPage: true });
    const emptySection = page.locator('#intelStrip [data-cs-section="empty"]');
    const emptyText = await emptySection.innerText();
    const emptyChecks = {
      guidedCopy: /What do you have\?/i.test(emptyText),
      addControls: await emptySection.getByRole("button", { name: "Add agreement or service", exact: true }).count(),
      reviewControls: await emptySection.getByRole("button", { name: "Review service coverage", exact: true }).count(),
      summaryCount: await page.locator('#intelStrip .cs-summary').count(),
    };
    ok("empty truth presents two clear starts without a four-zero scorecard",
      emptyChecks.guidedCopy && emptyChecks.addControls === 1
      && emptyChecks.reviewControls === 1 && emptyChecks.summaryCount === 0,
      JSON.stringify(emptyChecks));
    await emptySection.getByRole("button", { name: "Review service coverage", exact: true }).click();
    const coverageSheet = page.getByRole("dialog", { name: "Review service coverage" });
    await coverageSheet.waitFor();
    ok("the empty-state coverage path opens the property review",
      /Record which property services were reviewed/.test(await coverageSheet.innerText()));
    await coverageSheet.getByRole("button", { name: "Close" }).click();
    const emptyMobile = await page.evaluate(() => ({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      controlsOutside: Array.from(document.querySelectorAll('[data-am-compartment-open="contracted_services"] button'))
        .filter((node) => { const box = node.getBoundingClientRect(); return box.right > innerWidth + 1 || box.left < -1; }).length,
    }));
    ok("the guided empty state fits the 390px working door",
      emptyMobile.documentWidth <= emptyMobile.viewport + 1 && emptyMobile.controlsOutside === 0,
      JSON.stringify(emptyMobile));

    await page.evaluate(() => {
      document.getElementById("intelStrip").innerHTML = window.__psContractedServicesDoor.render({
        standing: { governed_engagement_count: 0, attention_count: 0, unresolved_count: 2 },
        detail: { engagements: [], unmatched_documents: [{ filename: "Unsigned elevator proposal.pdf",
          document_kind: "proposal", execution_state: "unsigned",
          evidence: { source_artifact_id: "artifact-unsigned" } }],
        unmatched_financial_observations: [{ label: "Elevator service observation",
          provider_name: "Observed provider", amount_cents: 17010, currency_code: "USD" }] },
      });
    });
    const evidenceOnly = await page.locator('#intelStrip [data-am-compartment-open="contracted_services"]').innerText();
    ok("evidence-only truth cannot render as an empty or governed register",
      /Documents or accounting records need review before a service is confirmed/.test(evidenceOnly)
      && !/What do you have\?/.test(evidenceOnly)
      && await page.locator('#intelStrip [data-cs-service]').count() === 0
      && await page.locator('#intelStrip .cs-truthline').count() === 0);

    await page.evaluate(() => {
      document.getElementById("intelStrip").innerHTML = window.__psContractedServicesDoor.render({
        standing: { governed_engagement_count: 1, attention_count: 1, unresolved_count: 1 },
        detail: { engagements: [{ service_class: "package_locker", label: "Amazon package locker",
          provider: { name: "Amazon.com Services LLC" }, execution_standing: "EXECUTED_GOVERNING",
          term_standing: { state: "OUTCOME_NOT_ESTABLISHED",
            reason: "Current term dates are not established.",
            milestone: { kind: "term_dates_not_established", date: null },
            accountable_owner: { state: "UNASSIGNED", label: "UNASSIGNED" },
            current: { commencement_trigger: "Installation and activation of the Amazon Hub",
              initial_term_months: 60,
              prices: [{ amount_cents: 790000, currency_code: "USD", price_basis: "flat" }] } },
          scope: { summary: "Apartment package locker service.", frequency: "Continuous amenity" },
          documents: [], financial_observations: [{ line_label: "Amazon prepaid schedule",
            amount_cents: 837400, currency_code: "USD" }] }],
          unmatched_documents: [], unmatched_financial_observations: [] },
      });
    });
    await page.locator('#intelStrip [data-cs-service="package_locker"] summary').click();
    const eventText = await page.locator('#intelStrip [data-am-compartment-open="contracted_services"]').innerText();
    ok("event-anchored terms preserve the trigger without inventing dates",
      /Term dates need confirmation/.test(eventText)
      && /Installation and activation of the Amazon Hub \| 60-month initial term/.test(eventText));
    ok("contract fee remains separate from the accounting schedule",
      /\$7,900\.00 flat/.test(eventText) && /\$8,374\.00/.test(eventText));

    await page.evaluate(() => window.__psAssetManagement.mount(document.getElementById("intelStrip")));
    await page.locator('#intelStrip [data-am-room="property_expenses"]').click();
    await page.route("**/operator/asset-management/contracted-services", (route) => route.fulfill({
      status: 503, contentType: "application/json",
      body: JSON.stringify({ error: "contracted_services_compartment_unavailable" }),
    }));
    await page.locator('#intelStrip [data-am-compartment="contracted_services"]').click();
    await page.locator('#intelStrip [data-am-state="unavailable"]').waitFor();
    const unavailable = await page.locator('#intelStrip [data-am-state="unavailable"]').innerText();
    ok("a failed read cannot resemble empty Contracted Services truth",
      /unavailable right now/.test(unavailable) && /failed read, not an empty compartment/.test(unavailable));
    ok("the complete browser journey has no uncaught page error", pageErrors.length === 0, pageErrors.join(" | "));

    console.log("\nCONTRACTED SERVICES BROWSER PROOF\n");
    console.log("  assertions passed: " + passed);
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
