#!/usr/bin/env node
"use strict";

// Compliance UI acceptance: real app, real Asset Management router, real
// staff-session authority, and regular isolated PostgreSQL.

const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const { serveStatic, serveTls } = require("./tools/browser_stack.js");

const API_REPO = path.join(__dirname, "..", "api");
const apiPlaywright = path.join(API_REPO, "node_modules", "playwright");
const { chromium } = fs.existsSync(apiPlaywright)
  ? require(apiPlaywright)
  : require("playwright");
const { Pool } = require(path.join(API_REPO, "node_modules", "pg"));
const express = require(path.join(API_REPO, "node_modules", "express"));
const runReceipt = require(path.join(API_REPO, "tests", "_run_receipt.js"));

const DB = runReceipt.harnessConnectionString();

const PROD = "https://property-spine-api.onrender.com";
const APP_PORT = 8500 + (process.pid % 300);
const TLS_PORT = 9900 + (process.pid % 90);
const OUT = process.env.SHOTS || path.join(process.cwd(), ".compliance-browser-shots");
const TOKEN = "compliance-browser-session";

let passed = 0;
let failed = 0;
function ok(label, condition, detail) {
  if (condition) {
    passed++;
    console.log("  ok    " + label);
  } else {
    failed++;
    console.log("  FAIL  " + label + (detail ? "\n        " + detail : ""));
  }
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const admin = new Pool({ connectionString: DB });
  const schema = "compliance_browser_" + Date.now();
  let apiPool;
  let apiServer;
  let staticServer;
  let tlsServer;
  let browser;

  try {
    await admin.query(`create schema ${schema}`);
    await admin.query(`
      create extension if not exists pgcrypto;
      set search_path to ${schema};
      create table users (
        id uuid primary key default gen_random_uuid(), name text, phone text, email text,
        role text, is_active boolean not null default true,
        status text not null default 'active', account_kind text
      );
      create table properties (
        id uuid primary key default gen_random_uuid(), name text, organization_id uuid
      );
      create table property_team_assignments (
        property_id uuid not null references properties(id),
        user_id uuid not null references users(id), role_title text,
        allowed_modules text[] not null default '{}',
        primary_for_modules text[] not null default '{}',
        can_manage_roles boolean default false, active boolean not null default true,
        primary key(property_id,user_id)
      );
      create table staff_sessions (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id),
        property_id uuid not null references properties(id),
        token text, token_digest text, issuance_purpose text,
        created_at timestamptz not null default now(),
        expires_at timestamptz not null, revoked boolean not null default false
      );
      create table source_artifacts (
        id uuid primary key default gen_random_uuid(),
        scope_type text not null, scope_id uuid not null,
        original_filename text not null, mime_type text,
        artifact_kind text not null default 'other', byte_size integer,
        sha256 text, content bytea, stored_at timestamptz default now(),
        uploaded_at timestamptz default now(), source_as_of_date date,
        uploaded_by_user_id uuid references users(id), uploaded_by_basis text
      );
    `);
    await admin.query(`set search_path to ${schema}`);
    await admin.query(fs.readFileSync(
      path.join(API_REPO, "migrations", "169_compliance_canonical_truth.sql"), "utf8"));

    const property = (await admin.query(
      "insert into properties(name) values ('Solo on Chestnut') returning id")).rows[0];
    const user = (await admin.query(
      `insert into users(name,email,role,account_kind)
       values ('Asset Ops','asset@test','operator','staff') returning id`)).rows[0];
    await admin.query(
      `insert into property_team_assignments
         (property_id,user_id,role_title,allowed_modules,active)
       values ($1,$2,'Asset Manager',$3,true)`,
      [property.id, user.id, ["management", "maintenance", "asset_management"]]);
    await admin.query(
      `insert into staff_sessions
         (user_id,property_id,token_digest,issuance_purpose,expires_at)
       values ($1,$2,$3,'bootstrap_invite',now() + interval '1 hour')`,
      [user.id, property.id, digest(Buffer.from(TOKEN))]);

    const scoped = new URL(DB);
    scoped.searchParams.set("options", `-c search_path=${schema}`);
    apiPool = new Pool({ connectionString: scoped.toString() });
    const api = express();
    api.use(express.json({ limit: "1mb" }));
    const sessions = require(path.join(API_REPO, "src", "identity", "staff_session_service.js"));
    api.get("/operator/me", async (req, res) => {
      const operator = await sessions.resolveStaffSession(apiPool, req.headers["x-staff-session"]);
      if (!operator) return res.status(401).json({ error: "no_session" });
      return res.json({ ...operator, property_name: "Solo on Chestnut" });
    });
    api.use(require(path.join(API_REPO, "src", "surfaces", "asset_management.js"))({
      pool: apiPool,
      fileToText: async ({ buffer }) => buffer.toString("utf8"),
    }));
    apiServer = http.createServer(api);
    await new Promise((resolve) => apiServer.listen(0, "127.0.0.1", resolve));
    staticServer = await serveStatic(__dirname, APP_PORT);
    tlsServer = await serveTls(apiServer.address().port, TLS_PORT);

    browser = await chromium.launch({
      executablePath: process.env.CHROME,
      args: ["--ignore-certificate-errors"],
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    const traffic = [];
    await page.route(PROD + "/**", async (route) => {
      const request = route.request();
      if (request.url().includes("/operator/asset-management/compliance")) {
        traffic.push({ method: request.method(), url: request.url(), body: request.postData() || "" });
      }
      await route.continue({
        url: request.url().replace(PROD, `https://127.0.0.1:${TLS_PORT}`),
      });
    });
    await page.addInitScript(([base, token]) => {
      localStorage.setItem("ps_api_base", base);
      sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: token }));
    }, [`https://127.0.0.1:${TLS_PORT}`, TOKEN]);

    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const shot = (name) => page.screenshot({ path: path.join(OUT, name), fullPage: true });

    console.log("\n  COMPLIANCE UI - REAL BROWSER\n");
    await page.goto(`http://127.0.0.1:${APP_PORT}/index.html`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1800);
    ok("app loaded with a verified staff session",
      await page.evaluate(() => !!window.__psAssetManagement &&
        !/Sign in to continue/i.test(document.body.innerText || "")));
    ok("Asset Management is reachable from the real Home card",
      await page.isVisible("#deskCardAssetManagement"));

    await page.click("#deskCardAssetManagement");
    await page.waitForSelector('#intelStrip [data-am-room="compliance"]');
    await page.click('#intelStrip [data-am-room="compliance"]');
    await page.waitForSelector('#intelStrip [data-am-compartment="licenses_registrations"].is-live');
    ok("only Licenses & Registrations is live in the Compliance room",
      await page.evaluate(() => Array.from(document.querySelectorAll(
        '#intelStrip [data-am-compartment].is-live'))
        .map((el) => el.dataset.amCompartment).join(",") === "licenses_registrations"));

    await page.click('#intelStrip [data-am-compartment="licenses_registrations"]');
    const root = '#intelStrip [data-am-compartment-open="licenses_registrations"]';
    await page.waitForSelector(root);
    ok("empty standing is distinct from a failed read",
      await page.evaluate((selector) => {
        const text = (document.querySelector(selector) || {}).innerText || "";
        return /No licenses established/i.test(text) &&
          /Property-wide coverage is not established/i.test(text) &&
          !/unavailable right now/i.test(text);
      }, root));
    await shot("01-compliance-empty.png");

    await page.click(root + " .am-add-insurance");
    const fixture = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      fs.readFileSync(path.join(API_REPO, "tests", "fixtures", "compliance",
        "solo_4233_rental_license.txt")),
    ]);
    await page.setInputFiles(root + ' [data-am-input="c_file"]', {
      name: "Rental License 922616.pdf", mimeType: "application/pdf", buffer: fixture,
    });
    await page.click(root + " .am-compliance-capture .am-cap-go");
    await page.waitForSelector(root + ' [data-am-compliance-capture="review"]');
    ok("retention produces a provisional document review",
      await page.evaluate((selector) => {
        const text = (document.querySelector(selector) || {}).innerText || "";
        return /Review the license/i.test(text) && /Source retained/i.test(text)
          && /read from (the )?document/i.test(text);
      }, root));
    ok("the ambiguous expiration is blank with an explicit reason",
      await page.evaluate((selector) => {
        const input = document.querySelector(selector + ' [data-am-input="c_effective_through"]');
        const field = input && input.closest(".am-cap-field");
        return !!input && input.value === "" && /ambiguous/i.test((field || {}).innerText || "");
      }, root));
    ok("the recognized values remain editable proposals",
      await page.inputValue(root + ' [data-am-input="c_external_credential_number"]') === "922616"
        && await page.inputValue(root + ' [data-am-input="c_effective_from"]') === "2026-04-30");
    await shot("02-compliance-review.png");

    await page.fill(root + ' [data-am-input="c_effective_through"]', "2027-05-01");
    await page.click(root + " .am-compliance-capture .am-cap-go");
    await page.waitForSelector(root + " [data-am-compliance-item]");
    const establishedText = await page.locator(root).innerText();
    ok("confirmation returns a receipt and canonical reread",
      /Recorded Rental License #922616/i.test(establishedText)
        && /Current/i.test(establishedText)
        && /2026-04-30 through 2027-05-01/i.test(establishedText));
    ok("expiration does not become an invented renewal obligation",
      /no action has been established/i.test(establishedText));
    ok("the reader keeps item standing separate from property-wide compliance",
      /Property-wide coverage is not established/i.test(establishedText));

    const confirmation = traffic.filter((entry) =>
      entry.method === "POST" && /\/compliance\/confirm$/.test(entry.url));
    ok("browser authority is absent from the confirmation body",
      confirmation.length === 1 &&
        !/property_id|actor_user_id|authenticated_user_id/.test(confirmation[0].body),
      JSON.stringify(confirmation));
    ok("the browser confirms once, then performs a canonical GET reread",
      traffic.some((entry) => entry.method === "GET" && /\/compliance\?as_of=/.test(entry.url)));

    await page.click(root + " .am-compliance-actions button:first-child");
    await page.waitForSelector(root + " [data-am-compliance-detail]");
    ok("canonical record opener shows the established history",
      /Canonical record[\s\S]*Period established/i.test(await page.locator(root).innerText()));

    const sourceResponse = page.waitForResponse((response) =>
      response.url().includes("/operator/asset-management/compliance/open/source/") &&
        response.status() === 200);
    const sourcePage = context.waitForEvent("page", { timeout: 5000 }).catch(() => null);
    await page.click(root + " .am-compliance-actions button:last-child");
    const openedResponse = await sourceResponse;
    const openedPage = await sourcePage;
    ok("source opener uses the governed server route and opens a new document tab",
      openedResponse.ok() && !!openedPage);
    if (openedPage) await openedPage.close().catch(() => {});
    ok("source opening emits no false popup failure",
      !/blocked the document window/i.test(await page.locator(root).innerText()));
    await shot("03-compliance-established.png");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    const mobile = await page.evaluate((selector) => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
      item: !!document.querySelector(selector + " [data-am-compliance-item]"),
      actions: document.querySelectorAll(selector + " .am-compliance-actions button").length,
    }), root);
    ok("the complete standing and opener controls fit a 390px viewport",
      mobile.doc <= mobile.win + 1 && mobile.item && mobile.actions === 2,
      JSON.stringify(mobile));
    await shot("04-compliance-mobile.png");
    ok("the whole journey has no uncaught browser error",
      pageErrors.length === 0, pageErrors.join(" | "));
  } finally {
    if (browser) await browser.close().catch(() => {});
    for (const server of [apiServer, staticServer, tlsServer]) {
      if (server && server.close) {
        await new Promise((resolve) => server.close(resolve)).catch(() => {});
      }
    }
    if (apiPool) await apiPool.end().catch(() => {});
    try { await admin.query(`drop schema ${schema} cascade`); } catch (_) {}
    await admin.end();
  }

  console.log(`\n  ${passed + failed} assertions - ${passed} passed - ${failed} failed`);
  console.log("  screenshots: " + OUT);
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
