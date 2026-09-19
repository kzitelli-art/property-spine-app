#!/usr/bin/env node
/*
 * Canonical onboarding, shipped-client first-red proof.
 *
 * This runs the committed index.html without rewriting it. Browser requests to
 * the API use the shipped localStorage configuration and go directly to a
 * caller-owned loopback API. Remote static dependencies are fulfilled locally,
 * and every other external request is blocked before egress.
 *
 * The workbooks are private inputs. Never print their names, cells, request
 * payloads, session token, artifact ids, or downloaded bytes. The durable
 * output is limited to hashes, byte counts, HTTP status/reason/receipt, and a
 * screenshot of the visible refusal itself.
 */
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { serveStatic } = require("./tools/browser_stack.js");

const PROD_API = "https://property-spine-api.onrender.com";
const XLSX_CDN = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
const PLAID_CDN = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
const GOOGLE_FONTS_ORIGIN = "https://fonts.googleapis.com";
const LOCAL_IMAGE_PATHS = new Set([
  "https://images.squarespace-cdn.com/content/v1/5f161fbff7beaa275d4793b2/1600625930792-0RXJBAARKXP51P8JUL4B/solo_final_logo_transp-02-01.png",
  "https://images1.apartments.com/i2/oBP8IyvtpkKDgVZfVHlYnDNy-w_S4gfFqJNpbTCalyU/116/skyline-apartments-philadelphia-pa-primary-photo.jpg",
]);
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xw0AAAAASUVORK5CYII=",
  "base64"
);

function refuse(code) {
  const error = new Error(code);
  error.proofCode = code;
  throw error;
}

function requireAbsoluteFile(value, code) {
  if (!value || !path.isAbsolute(value)) refuse(code + "_MUST_BE_ABSOLUTE");
  const resolved = path.resolve(value);
  let stat;
  try { stat = fs.statSync(resolved); } catch { refuse(code + "_NOT_FOUND"); }
  if (!stat.isFile()) refuse(code + "_NOT_A_FILE");
  return resolved;
}

function requireOwnedOutput(value) {
  if (!value || !path.isAbsolute(value)) refuse("OUTPUT_PATH_MUST_BE_ABSOLUTE");
  const tempRoot = fs.realpathSync(os.tmpdir());
  const resolved = path.resolve(value);
  const rel = path.relative(tempRoot, resolved);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    refuse("OUTPUT_PATH_MUST_BE_A_CHILD_OF_OS_TEMP");
  }
  fs.mkdirSync(resolved, { recursive: true });
  const real = fs.realpathSync(resolved);
  const realRel = path.relative(tempRoot, real);
  if (!realRel || realRel.startsWith("..") || path.isAbsolute(realRel)) {
    refuse("OUTPUT_PATH_ESCAPES_OS_TEMP");
  }
  return real;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function safeReceipt(body) {
  const value = body && (body.receipt || body.error);
  return String(value || "No refusal receipt returned.").slice(0, 1200);
}

async function visibleAtPaint(page, selector) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (!(r.width > 0 && r.height > 0)) return false;
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
    const hit = document.elementFromPoint(x, y);
    return Boolean(hit && (hit === el || el.contains(hit) || hit.contains(el)));
  }, selector);
}

const SP = process.env.SP;
if (!SP || !path.isAbsolute(SP)) refuse("SP_API_ROOT_MUST_BE_ABSOLUTE");
const apiRoot = path.resolve(SP);
const playwrightRoot = path.join(apiRoot, "node_modules", "playwright");
const localXlsx = requireAbsoluteFile(
  path.join(apiRoot, "node_modules", "xlsx", "dist", "xlsx.full.min.js"),
  "LOCAL_XLSX"
);
if (!fs.existsSync(playwrightRoot)) refuse("PLAYWRIGHT_NOT_FOUND_UNDER_SP");
const { chromium } = require(playwrightRoot);

const API = String(process.env.API || "").replace(/\/+$/, "");
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(API)) refuse("API_MUST_BE_LITERAL_LOOPBACK_HTTP");
const SESSION = process.env.SESSION;
if (!SESSION) refuse("SESSION_REQUIRED");
if (process.env.PROOF_EXPECT_SHIPPED_HEADER_FAILURE !== "1") {
  refuse("PROOF_EXPECT_SHIPPED_HEADER_FAILURE_MUST_EQUAL_1");
}

const CHROME = requireAbsoluteFile(process.env.CHROME, "CHROME");
const JULY = requireAbsoluteFile(process.env.JULY_SOURCE_PATH, "JULY_SOURCE_PATH");
const SKYLINE = requireAbsoluteFile(process.env.SKYLINE_SOURCE_PATH, "SKYLINE_SOURCE_PATH");
if (JULY === SKYLINE) refuse("SOURCE_PATHS_MUST_BE_DISTINCT");
const OUTPUT = requireOwnedOutput(process.env.PROOF_OUTPUT_DIR);
const APP_DIR = __dirname;
const APP_PORT = 18080 + (process.pid % 1000);
const APP_ORIGIN = `http://127.0.0.1:${APP_PORT}`;

let browser = null;
let staticServer = null;
let proofPage = null;
const blockedExternal = [];
const evidence = [];
const pageConsoleErrors = [];
const failedRequests = [];
let stage = "starting";
let lastHttpOutcome = null;
let interceptionRefusalCode = null;
let failureFeedback = null;

function appendBounded(target, value) {
  if (target.length < 50) target.push(value);
}

function sanitizedTarget(raw) {
  try {
    const url = new URL(raw);
    return { origin: url.origin, path: url.pathname };
  } catch {
    return { origin: "invalid", path: "invalid" };
  }
}

function sanitizedConsoleText(value) {
  return String(value || "").replace(/https?:\/\/[^\s"')]+/g, (raw) => {
    const safe = sanitizedTarget(raw);
    return safe.origin + safe.path;
  }).slice(0, 2000);
}

function savePrivateDiagnostic(error, proofCode) {
  try {
    const diagnosticPath = path.join(OUTPUT, `canonical-onboarding-failure-${process.pid}.json`);
    fs.writeFileSync(diagnosticPath, JSON.stringify({
      proof: "canonical_onboarding_review",
      stage,
      proof_code: proofCode,
      error_name: String((error && error.name) || "Error"),
      error_message: String((error && error.message) || proofCode),
      error_stack: String((error && error.stack) || ""),
      blocked_external_request_count: blockedExternal.length,
      blocked_external_requests: blockedExternal,
      interception_refusal_code: interceptionRefusalCode,
      last_http_outcome: lastHttpOutcome,
      page_console_errors: pageConsoleErrors,
      failed_requests: failedRequests,
      deal_setup_feedback: failureFeedback,
      completed_source_evidence: evidence,
    }, null, 2) + "\n", { flag: "wx" });
  } catch {
    // Diagnostics must never replace the original controlled failure code.
  }
}

async function boundedCleanup() {
  if (browser) {
    await Promise.race([
      browser.close().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }
  if (staticServer) {
    await new Promise((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      staticServer.close(finish);
      setTimeout(() => {
        if (typeof staticServer.closeAllConnections === "function") staticServer.closeAllConnections();
        finish();
      }, 3000);
    });
  }
}

function responseFor(page, method, pathPattern) {
  const pending = page.waitForResponse((response) => {
    const request = response.request();
    let url;
    try { url = new URL(request.url()); } catch { return false; }
    return request.method() === method && pathPattern.test(url.pathname);
  }, { timeout: 30000 });
  // Observe rejection immediately even when an earlier response proves that a
  // later request cannot happen. The caller still awaits the original promise.
  pending.catch(() => {});
  return pending;
}

async function createDeal(page, nonce) {
  await page.evaluate(() => window.dsShow && window.dsShow());
  await page.locator("#dsNewDealName").waitFor({ state: "visible", timeout: 20000 });
  await page.fill("#dsNewDealName", `Canonical onboarding rehearsal ${nonce}`);
  const created = responseFor(page, "POST", /^\/deal-setup\/deals$/);
  const [, response] = await Promise.all([
    page.getByRole("button", { name: "Create deal", exact: true }).click(),
    created,
  ]);
  if (response.status() !== 201) refuse("DEAL_CREATE_DID_NOT_RETURN_201");
  const body = await response.json();
  if (!body || !body.deal || !body.deal.id) refuse("DEAL_CREATE_MISSING_ID");
  await page.locator("#dsPropName").waitFor({ state: "visible", timeout: 20000 });
  return body.deal.id;
}

async function addProperty(page, dealId, label, nonce) {
  await page.evaluate((id) => window.dsOpenDeal(id), dealId);
  await page.locator("#dsPropName").waitFor({ state: "visible", timeout: 20000 });
  const propertyName = `${label} rehearsal ${nonce}`;
  await page.fill("#dsPropName", propertyName);
  await page.fill("#dsPropAddr", `${nonce}-${label === "july" ? "71" : "72"} Proof Loop`);
  await page.fill("#dsPropCity", "Philadelphia");
  await page.fill("#dsPropState", "PA");
  await page.fill("#dsPropZip", "19104");
  await page.selectOption("#dsPropBasis", "bed");
  const created = responseFor(page, "POST", new RegExp(`^/deal-setup/deals/${dealId}/properties/new$`));
  const [, response] = await Promise.all([
    page.getByRole("button", { name: "Create property and add to deal", exact: true }).click(),
    created,
  ]);
  if (response.status() !== 201) refuse(`${label.toUpperCase()}_PROPERTY_CREATE_DID_NOT_RETURN_201`);
  const body = await response.json();
  const propertyId = body && body.property && body.property.id;
  if (!propertyId) refuse(`${label.toUpperCase()}_PROPERTY_CREATE_MISSING_ID`);
  const propertyRow = page.locator("tr").filter({ hasText: propertyName });
  await propertyRow.getByRole("button", { name: "Set up", exact: true })
    .waitFor({ state: "visible", timeout: 20000 });
  await propertyRow.getByRole("button", { name: "Set up", exact: true }).click();
  await page.locator("#dsRentRollFile").waitFor({ state: "visible", timeout: 20000 });
  return propertyId;
}

async function retainedBytes(artifactId) {
  const response = await fetch(`${API}/deal-setup/source/${encodeURIComponent(artifactId)}/download`, {
    method: "GET",
    headers: { "x-staff-session": SESSION },
    signal: AbortSignal.timeout(20000),
  });
  if (response.status !== 200) refuse("RETAINED_ARTIFACT_DOWNLOAD_DID_NOT_RETURN_200");
  return { status: response.status, bytes: Buffer.from(await response.arrayBuffer()) };
}

async function exerciseSource(page, dealId, sourcePath, label, nonce) {
  stage = `${label}_adding_property`;
  await addProperty(page, dealId, label, nonce);
  const original = fs.readFileSync(sourcePath);
  const originalHash = sha256(original);

  stage = `${label}_selecting_source`;
  await page.setInputFiles("#dsRentRollFile", sourcePath);
  await page.fill("#dsAsOf", "2026-07-31");
  const uploadWait = responseFor(page, "POST", /^\/deal-setup\/deals\/[^/]+\/properties\/[^/]+\/source$/);
  const readWait = responseFor(page, "POST", /^\/deal-setup\/activations\/[^/]+\/read-source$/);
  stage = `${label}_awaiting_upload`;
  const [, uploadResponse] = await Promise.all([
    page.getByRole("button", { name: "Upload and read", exact: true }).click(),
    uploadWait,
  ]);
  lastHttpOutcome = {
    source: label,
    operation: "upload",
    status: uploadResponse.status(),
    server_error: null,
  };
  const uploadBody = await uploadResponse.json();
  lastHttpOutcome.server_error = uploadBody && uploadBody.error ? String(uploadBody.error) : null;
  const artifactId = uploadBody && uploadBody.artifact && uploadBody.artifact.id;
  if (![200, 201].includes(uploadResponse.status()) || !artifactId) {
    refuse(`${label.toUpperCase()}_UPLOAD_DID_NOT_RETAIN_ARTIFACT`);
  }

  stage = `${label}_awaiting_read_source`;
  const readResponse = await readWait;
  lastHttpOutcome = {
    source: label,
    operation: "read_source",
    status: readResponse.status(),
    server_error: null,
  };
  const readBody = await readResponse.json();
  lastHttpOutcome.server_error = readBody && readBody.error ? String(readBody.error) : null;
  if (readResponse.status() !== 422 || !readBody || readBody.error !== "no_unit_column") {
    refuse(`${label.toUpperCase()}_EXPECTED_422_NO_UNIT_COLUMN`);
  }

  stage = `${label}_verifying_visible_refusal`;
  await page.locator("#dsFeedback").waitFor({ state: "visible", timeout: 15000 });
  if (!(await visibleAtPaint(page, "#dsFeedback"))) {
    refuse(`${label.toUpperCase()}_REFUSAL_NOT_VISIBLY_PAINTED`);
  }
  const feedback = await page.locator("#dsFeedback").innerText();
  const receipt = safeReceipt(readBody);
  if (!feedback.includes(receipt)) refuse(`${label.toUpperCase()}_VISIBLE_REFUSAL_DIFFERS_FROM_SERVER_RECEIPT`);

  stage = `${label}_verifying_retained_bytes`;
  const downloaded = await retainedBytes(artifactId);
  const retainedHash = sha256(downloaded.bytes);
  if (downloaded.bytes.length !== original.length || retainedHash !== originalHash) {
    refuse(`${label.toUpperCase()}_RETAINED_BYTES_DIFFER_FROM_SOURCE`);
  }

  const screenshot = path.join(OUTPUT, `${label}-visible-first-red-${process.pid}.png`);
  await page.locator("#dsFeedback").screenshot({ path: screenshot });
  evidence.push({
    source: label,
    source_sha256: originalHash,
    source_byte_count: original.length,
    upload_status: uploadResponse.status(),
    download_status: downloaded.status,
    retained_exact_hash_and_bytes: true,
    read_source_status: readResponse.status(),
    first_red_reason: readBody.error,
    first_red_receipt: receipt,
    visible_refusal: true,
    screenshot: path.basename(screenshot),
  });
}

(async () => {
  stage = "starting_static_server";
  staticServer = await serveStatic(APP_DIR, APP_PORT);
  stage = "launching_browser";
  browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--disable-background-networking", "--disable-component-update"],
  });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  proofPage = page;
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location();
    appendBounded(pageConsoleErrors, {
      text: sanitizedConsoleText(message.text()),
      location: sanitizedTarget(location && location.url),
    });
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    appendBounded(failedRequests, {
      ...sanitizedTarget(request.url()),
      error_text: String((failure && failure.errorText) || "request failed").slice(0, 500),
    });
  });

  // One interception boundary handles every browser request. Shipped static
  // dependencies are fulfilled locally; unknown external URLs are recorded
  // without query strings, then aborted before any network attempt.
  await page.route("**/*", async (route) => {
    const request = route.request();
    const raw = request.url();
    let url;
    try { url = new URL(raw); } catch { appendBounded(blockedExternal, sanitizedTarget(raw)); await route.abort("blockedbyclient"); return; }

    if (url.origin === APP_ORIGIN) {
      await route.continue();
      return;
    }
    // Let Chromium serialize the browser-owned FormData and file bytes all the
    // way to the real loopback API. The prior route.fetch replay coincided with
    // valid multipart metadata but an empty server buffer, so it is not accepted
    // as evidence that the shipped browser transported the selected file.
    if (url.origin === API) {
      await route.continue();
      return;
    }
    // Older staff bootstrap readers still name the sealed production origin.
    // Redirect only their non-multipart traffic to the same loopback server.
    // A File/FormData request must remain Chromium-owned: replaying it through
    // route.fetch is not accepted as proof that the shipped browser sent bytes.
    if (url.origin === PROD_API) {
      const contentType = String(request.headers()["content-type"] || "").toLowerCase();
      if (contentType.startsWith("multipart/form-data")) {
        interceptionRefusalCode = "SEALED_ORIGIN_MULTIPART_REPLAY_REFUSED";
        appendBounded(blockedExternal, sanitizedTarget(raw));
        await route.abort("blockedbyclient");
        return;
      }
      const localUrl = API + url.pathname + url.search;
      const upstream = await route.fetch({ url: localUrl, timeout: 30000, maxRedirects: 0 });
      await route.fulfill({ response: upstream, headers: {
        ...upstream.headers(),
        "access-control-allow-origin": APP_ORIGIN,
        "access-control-allow-headers": "content-type,x-staff-session",
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "cache-control": "no-store",
      } });
      return;
    }
    if (raw === XLSX_CDN) {
      await route.fulfill({ status: 200, contentType: "application/javascript",
        body: fs.readFileSync(localXlsx) });
      return;
    }
    if (raw === PLAID_CDN) {
      await route.fulfill({ status: 200, contentType: "application/javascript", body: "/* offline proof */" });
      return;
    }
    if (url.origin === GOOGLE_FONTS_ORIGIN && url.pathname === "/css2") {
      await route.fulfill({ status: 200, contentType: "text/css", body: "/* offline proof: system fonts */" });
      return;
    }
    if (LOCAL_IMAGE_PATHS.has(url.origin + url.pathname)) {
      await route.fulfill({ status: 200, contentType: "image/png", body: TRANSPARENT_PNG });
      return;
    }
    appendBounded(blockedExternal, sanitizedTarget(raw));
    await route.abort("blockedbyclient");
  });

  await page.addInitScript((token) => {
    localStorage.setItem("ps_api_base", token.api);
    sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: token.session }));
  }, { api: API, session: SESSION });

  stage = "loading_unchanged_app";
  await page.goto(`${APP_ORIGIN}/index.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.XLSX && window.dsShow), null, { timeout: 20000 });

  const nonce = `${Date.now()}-${process.pid}`;
  stage = "creating_fixture_deal";
  const dealId = await createDeal(page, nonce);
  stage = "observing_july_first_red";
  await exerciseSource(page, dealId, JULY, "july", nonce);
  stage = "observing_skyline_control_first_red";
  await exerciseSource(page, dealId, SKYLINE, "skyline", nonce);

  if (blockedExternal.length) refuse("UNHANDLED_EXTERNAL_REQUEST_ATTEMPTED");
  stage = "writing_success_receipt";
  const receipt = {
    proof: "canonical_onboarding_review",
    mode: "shipped_header_failure",
    app_source: "unchanged_index_html",
    api_origin: "literal_loopback",
    external_requests_blocked_before_egress: blockedExternal.length,
    sources: evidence,
  };
  const receiptPath = path.join(OUTPUT, `canonical-onboarding-review-${process.pid}.json`);
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  console.log(`PASS canonical onboarding first-red proof; receipt=${receiptPath}`);
})().catch(async (error) => {
  const code = interceptionRefusalCode
    || (error && error.proofCode ? error.proofCode : "UNEXPECTED_FAILURE");
  try {
    if (proofPage) {
      const feedback = proofPage.locator("#dsFeedback");
      if (await feedback.count()) {
        failureFeedback = String(await feedback.innerText({ timeout: 1500 })).slice(0, 4000);
      }
    }
  } catch {
    // Failure diagnostics are best-effort and must preserve the proof code.
  }
  savePrivateDiagnostic(error, code);
  console.error(`PROOF FAILED: ${code}`);
  process.exitCode = 1;
}).finally(async () => {
  stage = "cleanup";
  await boundedCleanup();
});
