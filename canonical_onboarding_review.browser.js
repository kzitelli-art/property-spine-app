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
const EXPECTED = {
  july: {
    review: {
      total: 164, current: 105, future: 59, assigned: 145,
      unassigned_future: 19, unassigned_current: 0, missing_actual_current_occupied: 46,
      missing_actual_assigned_future: 40,
    },
    status: { staged: 59, needs_review: 86, blocked: 19 },
    vacant: 53,
  },
  skyline: {
    review: {
      total: 262, current: 160, future: 102, assigned: 251,
      unassigned_future: 11, unassigned_current: 0, missing_actual_current_occupied: 0,
      missing_actual_assigned_future: 0,
    },
    status: { staged: 160, needs_review: 91, blocked: 11 },
    vacant: 123,
  },
};

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
const PHASE = process.env.PROOF_PHASE;
if (!["stage", "restart", "mixed", "spaces", "relay", "source-auth", "holds", "zero"].includes(PHASE)) refuse("PROOF_PHASE_INVALID");

const CHROME = requireAbsoluteFile(process.env.CHROME, "CHROME");
const readsWorkbooks = PHASE === "stage" || PHASE === "restart";
const JULY = readsWorkbooks ? requireAbsoluteFile(process.env.JULY_SOURCE_PATH, "JULY_SOURCE_PATH") : null;
const SKYLINE = readsWorkbooks ? requireAbsoluteFile(process.env.SKYLINE_SOURCE_PATH, "SKYLINE_SOURCE_PATH") : null;
if (readsWorkbooks && JULY === SKYLINE) refuse("SOURCE_PATHS_MUST_BE_DISTINCT");
const OUTPUT = requireOwnedOutput(process.env.PROOF_OUTPUT_DIR);
function privateStatePath(value, name) {
  if (!value || !path.isAbsolute(value)) refuse(`${name}_MUST_BE_ABSOLUTE`);
  const resolved = path.resolve(value);
  const relative = path.relative(OUTPUT, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) refuse(`${name}_MUST_BE_INSIDE_OUTPUT`);
  return resolved;
}
const reviewStatePath = (PHASE === "mixed" || PHASE === "holds" || PHASE === "zero") ? null
  : privateStatePath(process.env.PROOF_REVIEW_STATE, "PROOF_REVIEW_STATE");
const syntheticStatePath = PHASE === "mixed"
  ? privateStatePath(process.env.PROOF_SYNTHETIC_STATE, "PROOF_SYNTHETIC_STATE") : null;
const spaceStatePath = PHASE === "spaces"
  ? privateStatePath(process.env.PROOF_SPACE_STATE, "PROOF_SPACE_STATE") : null;
const relayStatePath = PHASE === "relay"
  ? privateStatePath(process.env.PROOF_RELAY_STATE, "PROOF_RELAY_STATE") : null;
const sourceAuthStatePath = PHASE === "source-auth"
  ? privateStatePath(process.env.PROOF_SOURCE_AUTH_STATE, "PROOF_SOURCE_AUTH_STATE") : null;
const holdsStatePath = PHASE === "holds"
  ? privateStatePath(process.env.PROOF_HOLDS_STATE, "PROOF_HOLDS_STATE") : null;
const zeroStatePath = PHASE === "zero"
  ? privateStatePath(process.env.PROOF_ZERO_STATE, "PROOF_ZERO_STATE") : null;
if (PHASE === "restart") {
  let reviewStateStat;
  try { reviewStateStat = fs.statSync(reviewStatePath); } catch { refuse("PROOF_REVIEW_STATE_NOT_FOUND"); }
  if (!reviewStateStat.isFile()) refuse("PROOF_REVIEW_STATE_NOT_A_FILE");
}
if (PHASE === "mixed") {
  let syntheticStateStat;
  try { syntheticStateStat = fs.statSync(syntheticStatePath); } catch { refuse("PROOF_SYNTHETIC_STATE_NOT_FOUND"); }
  if (!syntheticStateStat.isFile()) refuse("PROOF_SYNTHETIC_STATE_NOT_A_FILE");
}
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
    page.getByRole("button", { name: "Add property", exact: true }).click(),
    created,
  ]);
  if (response.status() !== 201) refuse(`${label.toUpperCase()}_PROPERTY_CREATE_DID_NOT_RETURN_201`);
  const body = await response.json();
  const propertyId = body && body.property && body.property.id;
  if (!propertyId) refuse(`${label.toUpperCase()}_PROPERTY_CREATE_MISSING_ID`);
  const propertyRow = page.locator("tr").filter({ hasText: propertyName });
  await propertyRow.getByRole("button", { name: "Set up", exact: true })
    .waitFor({ state: "visible", timeout: 20000 });
  const activationWait = responseFor(page, "POST",
    new RegExp(`^/deal-setup/deals/${dealId}/properties/${propertyId}/activation$`));
  const [, activationResponse] = await Promise.all([
    propertyRow.getByRole("button", { name: "Set up", exact: true }).click(),
    activationWait,
  ]);
  if (activationResponse.status() !== 201) refuse(`${label.toUpperCase()}_ACTIVATION_CREATE_DID_NOT_RETURN_201`);
  const activationBody = await activationResponse.json();
  const activationId = activationBody && activationBody.activation && activationBody.activation.id;
  if (!activationId) refuse(`${label.toUpperCase()}_ACTIVATION_CREATE_MISSING_ID`);
  await page.locator("#dsRentRollFile").waitFor({ state: "visible", timeout: 20000 });
  return { propertyId, propertyName, activationId };
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

function exactCounts(actual, expected, label) {
  for (const [key, value] of Object.entries(expected || {})) {
    if (Number((actual || {})[key]) !== value) refuse(`${label.toUpperCase()}_${key.toUpperCase()}_COUNT_MISMATCH`);
  }
}

// Proposal vocabulary from ck_proposed_status. The write receipt also carries
// a vacancy subtotal; it is a separate dimension, never a proposal status.
const PROPOSAL_STATUSES = [
  "staged", "needs_review", "blocked", "confirmed", "promoted", "rejected", "conflicted",
];
function proposalStatusCounts(counts, label) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    refuse(`${label.toUpperCase()}_STATUS_COUNTS_MISSING`);
  }
  return Object.fromEntries(PROPOSAL_STATUSES.map((status) => {
    if (!Object.prototype.hasOwnProperty.call(counts, status)) return [status, 0];
    const raw = counts[status];
    const value = Number(raw);
    if ((typeof raw !== "number" && typeof raw !== "string")
        || (typeof raw === "string" && !raw.trim())
        || !Number.isSafeInteger(value) || value < 0) {
      refuse(`${label.toUpperCase()}_${status.toUpperCase()}_COUNT_INVALID`);
    }
    return [status, value];
  }));
}
function exactStatusCounts(actual, expected, label) {
  exactCounts(proposalStatusCounts(actual, label), proposalStatusCounts(expected, label), label);
}
function requireReviewTotals(review, statuses, label) {
  if (Number(review.total) !== Number(review.current) + Number(review.future)) {
    refuse(`${label.toUpperCase()}_CURRENT_FUTURE_TOTAL_MISMATCH`);
  }
  if (Number(review.total) !== Number(review.assigned) + Number(review.unassigned_future) + Number(review.unassigned_current)) {
    refuse(`${label.toUpperCase()}_ASSIGNED_TOTAL_MISMATCH`);
  }
  const statusTotal = Object.values(proposalStatusCounts(statuses, label)).reduce((sum, count) => sum + count, 0);
  if (Number(review.total) !== statusTotal) refuse(`${label.toUpperCase()}_STATUS_TOTAL_MISMATCH`);
}
function vacancyCount(review, label) {
  if (!review || !Array.isArray(review.proposals)) refuse(`${label.toUpperCase()}_PROPOSALS_MISSING`);
  return review.proposals.reduce((count, proposal) => {
    const normalized = proposal.normalized_json;
    if (!normalized || typeof normalized.is_vacant !== "boolean") {
      refuse(`${label.toUpperCase()}_VACANCY_EVIDENCE_MISSING`);
    }
    return count + Number(normalized.is_vacant);
  }, 0);
}

async function reviewSnapshot(page) {
  return page.evaluate(() => {
    const sections = { current: 0, future_assigned: 0, unassigned_future: 0, unassigned_other: 0 };
    const statuses = {};
    const statusNames = {
      "Added": "promoted", "Left out": "rejected", "Ready": "staged",
      "Can't use": "blocked", "Disagrees": "conflicted", "Needs a look": "needs_review",
    };
    const rows = Array.from(document.querySelectorAll("#dsContent tbody tr"));
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      const section = cells[0] ? cells[0].textContent.trim() : "";
      if (section === "Current occupancy") sections.current++;
      else if (section === "Future lease") sections.future_assigned++;
      else if (section === "Unassigned future") sections.unassigned_future++;
      else sections.unassigned_other++;
      const pill = row.querySelector(".sa-pill");
      const status = pill && statusNames[pill.textContent.trim()];
      if (status) statuses[status] = (statuses[status] || 0) + 1;
    });
    return {
      proposal_count: rows.length,
      sections,
      statuses,
      column_headers: Array.from(document.querySelectorAll("#dsContent th"), (node) => node.textContent.trim()),
    };
  });
}

async function requireReviewUI(page, label, expectedReview, expectedStatuses) {
  await page.getByRole("columnheader", { name: "Actual rent", exact: true })
    .waitFor({ state: "visible", timeout: 30000 });
  await page.getByRole("columnheader", { name: "Asking rent", exact: true })
    .waitFor({ state: "visible", timeout: 30000 });
  const snapshot = await reviewSnapshot(page);
  if (!snapshot.column_headers.includes("Section")) refuse(`${label.toUpperCase()}_SECTION_COLUMN_MISSING`);
  if (snapshot.proposal_count !== Number(expectedReview.total)) refuse(`${label.toUpperCase()}_PROPOSAL_COUNT_MISMATCH`);
  if (snapshot.sections.current !== Number(expectedReview.current)
      || snapshot.sections.future_assigned + snapshot.sections.unassigned_future !== Number(expectedReview.future)
      || snapshot.sections.unassigned_future !== Number(expectedReview.unassigned_future)
      || snapshot.sections.unassigned_other !== 0) {
    refuse(`${label.toUpperCase()}_VISIBLE_SECTION_COUNTS_MISMATCH`);
  }
  exactStatusCounts(snapshot.statuses, expectedStatuses, label);
  const summaryChecks = [
    `${expectedReview.total} source rows`, `${expectedReview.current} current occupancy`,
    `${expectedReview.future} future leases`, `${Number(expectedReview.unassigned_future) + Number(expectedReview.unassigned_current)} unassigned rows`,
  ];
  const summaryVisible = await page.locator("#dsContent").evaluate((root, checks) => {
    const text = root.innerText;
    return checks.every((check) => text.includes(check));
  }, summaryChecks);
  if (!summaryVisible) refuse(`${label.toUpperCase()}_VISIBLE_SUMMARY_COUNTS_MISMATCH`);
  return snapshot;
}

async function stageSource(page, dealId, sourcePath, label, nonce, expectMixedRefusal = false) {
  stage = `${label}_adding_property`;
  const created = await addProperty(page, dealId, label, nonce);
  const propertyId = created.propertyId;
  const activationId = created.activationId;
  const original = fs.readFileSync(sourcePath);
  const originalHash = sha256(original);

  stage = `${label}_selecting_source`;
  await page.setInputFiles("#dsRentRollFile", sourcePath);
  await page.fill("#dsAsOf", "2026-07-31");
  const uploadWait = responseFor(page, "POST", /^\/deal-setup\/deals\/[^/]+\/properties\/[^/]+\/source$/);
  const readWait = responseFor(page, "POST", /^\/deal-setup\/activations\/[^/]+\/read-source$/);
  const reviewWait = expectMixedRefusal ? null : responseFor(page, "GET", new RegExp(`^/deal-setup/activations/${activationId}$`));
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
  if (expectMixedRefusal) {
    const message = safeReceipt(readBody);
    if (readResponse.status() !== 409 || !/whole unit/i.test(message) || !/room/i.test(message)) {
      refuse("MIXED_GRAIN_SOURCE_NOT_REFUSED");
    }
    await page.waitForFunction(() => {
      const el = document.getElementById("dsFeedback");
      return el && /whole unit/i.test(el.innerText) && /room/i.test(el.innerText);
    }, null, {timeout:15000});
    await page.locator("#dsFeedback").scrollIntoViewIfNeeded();
    if (!(await visibleAtPaint(page,"#dsFeedback"))) refuse("MIXED_GRAIN_REFUSAL_NOT_PAINTED");
    const retained = await retainedBytes(artifactId);
    if (sha256(retained.bytes) !== originalHash) refuse("MIXED_GRAIN_RETAINED_BYTES_CHANGED");
    const retainedUiPathVisible = await page.locator("#dsContent button, #dsContent a").evaluateAll((nodes) =>
      nodes.some((node) => /download|view source|open source/i.test(
        `${node.innerText || ""} ${node.getAttribute("aria-label") || ""}`)));
    await page.locator("#dsFeedback").screenshot({path:path.join(OUTPUT,`${label}-refusal.png`)});
    evidence.push({source:label,read_http_status:409,refusal_visible:true,retained_bytes_verified:true,
      retained_file_ui_path_visible:retainedUiPathVisible});
    return {
      label, deal_id: dealId, property_id: propertyId, property_name: created.propertyName,
      activation_id: activationId, artifact_id: artifactId, source_path: sourcePath,
      source_sha256: originalHash, source_byte_count: original.length,
    };
  }
  if (readResponse.status() !== 201 || !readBody || !Number.isInteger(readBody.rows_read)) {
    refuse(`${label.toUpperCase()}_READ_SOURCE_DID_NOT_RETURN_REVIEW`);
  }
  const expectedFormat = path.extname(sourcePath).slice(1).toLowerCase();
  if (readBody.source_format !== expectedFormat || !String(readBody.source_sheet || "").trim()
      || !readBody.mapping || typeof readBody.mapping !== "object") {
    refuse(`${label.toUpperCase()}_SERVER_INTERPRETATION_METADATA_MISSING`);
  }

  stage = `${label}_verifying_visible_review`;
  await page.locator("#dsFeedback").waitFor({ state: "visible", timeout: 15000 });
  if (!(await visibleAtPaint(page, "#dsFeedback"))) {
    refuse(`${label.toUpperCase()}_READ_RECEIPT_NOT_VISIBLY_PAINTED`);
  }
  // Read-source returns its insert receipt; canonical review totals belong to
  // the following activation read used by the shipped UI.
  const reviewResponse = await reviewWait;
  if (reviewResponse.status() !== 200) refuse(`${label.toUpperCase()}_REVIEW_GET_DID_NOT_RETURN_200`);
  const reviewBody = await reviewResponse.json();
  const expectedReview = reviewBody.review_counts || {};
  const expectedStatuses = proposalStatusCounts(readBody.counts, label);
  if (readBody.rows_read !== Number(expectedReview.total)) refuse(`${label.toUpperCase()}_SOURCE_TOTAL_MISMATCH`);
  requireReviewTotals(expectedReview, expectedStatuses, label);
  if (EXPECTED[label]) {
    exactCounts(expectedReview, EXPECTED[label].review, label);
    if (EXPECTED[label].status) exactStatusCounts(expectedStatuses, EXPECTED[label].status, label);
  }
  exactStatusCounts(reviewBody.counts, expectedStatuses, label);
  const vacant = vacancyCount(reviewBody, label);
  exactCounts({ vacant }, { vacant: readBody.counts.vacant }, label);
  if (EXPECTED[label]) exactCounts({ vacant }, { vacant: EXPECTED[label].vacant }, label);
  const snapshot = await requireReviewUI(page, label, reviewBody.review_counts, reviewBody.counts);

  stage = `${label}_verifying_retained_bytes`;
  const downloaded = await retainedBytes(artifactId);
  const retainedHash = sha256(downloaded.bytes);
  if (downloaded.bytes.length !== original.length || retainedHash !== originalHash) {
    refuse(`${label.toUpperCase()}_RETAINED_BYTES_DIFFER_FROM_SOURCE`);
  }

  evidence.push({
    source: label,
    source_sha256: originalHash,
    source_byte_count: original.length,
    upload_status: uploadResponse.status(),
    download_status: downloaded.status,
    retained_exact_hash_and_bytes: true,
    read_source_status: readResponse.status(),
    rows_read: readBody.rows_read,
    review_counts: expectedReview,
    status_counts: expectedStatuses,
    vacancy_count: vacant,
    server_source_format_verified: true,
    server_source_sheet_present: true,
    server_mapping_present: true,
    visible_review: true,
    confirmations_attempted: 0,
  });
  return {
    label, deal_id: dealId, property_id: propertyId, property_name: created.propertyName,
    activation_id: activationId,
    artifact_id: artifactId, source_sha256: originalHash, source_byte_count: original.length,
    review_counts: expectedReview, status_counts: expectedStatuses,
    vacancy_count: vacant,
    visible_sections: snapshot.sections,
  };
}

async function verifyMixedWholeFirstRecovery(page, saved, correctedPath) {
  const retryFile = saved.source_path;
  const retryAsOf = "2026-07-31";
  stage = "synthetic_mixed_whole_first_same_file_retry";
  await page.locator("#dsRentRollFile").waitFor({ state: "visible", timeout: 15000 });
  await page.setInputFiles("#dsRentRollFile", retryFile);
  await page.fill("#dsAsOf", retryAsOf);
  const retryUploadWait = responseFor(page, "POST", /^\/deal-setup\/deals\/[^/]+\/properties\/[^/]+\/source$/);
  const retryReadWait = responseFor(page, "POST", /^\/deal-setup\/activations\/[^/]+\/read-source$/);
  const [, retryUploadResponse] = await Promise.all([
    page.getByRole("button", { name: "Upload and read", exact: true }).click(),
    retryUploadWait,
  ]);
  const retryUploadBody = await retryUploadResponse.json();
  const retryArtifactId = retryUploadBody && retryUploadBody.artifact && retryUploadBody.artifact.id;
  if (retryUploadResponse.status() !== 200 || !retryArtifactId || retryArtifactId !== saved.artifact_id) {
    refuse("MIXED_WHOLE_FIRST_SAME_FILE_RETRY_NOT_DEDUPLICATED");
  }
  const retryReadResponse = await retryReadWait;
  const retryReadBody = await retryReadResponse.json();
  if (retryReadResponse.status() !== 409 || !/whole unit/i.test(safeReceipt(retryReadBody))
      || !/room/i.test(safeReceipt(retryReadBody))) {
    refuse("MIXED_WHOLE_FIRST_SAME_FILE_RETRY_DID_NOT_REFUSE");
  }
  await page.locator("#dsFeedback").waitFor({ state: "visible", timeout: 15000 });
  if (!(await visibleAtPaint(page, "#dsFeedback"))) refuse("MIXED_WHOLE_FIRST_RETRY_REFUSAL_NOT_PAINTED");
  await page.waitForFunction(() => {
    const el = document.getElementById("dsFeedback");
    return el && /whole unit/i.test(el.innerText) && /room/i.test(el.innerText);
  }, null, { timeout: 15000 });
  const retainedUiPathVisible = await page.locator("#dsContent button, #dsContent a").evaluateAll((nodes) =>
    nodes.some((node) => /download|view source|open source/i.test(
      `${node.innerText || ""} ${node.getAttribute("aria-label") || ""}`)));

  stage = "synthetic_mixed_whole_first_corrected_source";
  await page.locator("#dsRentRollFile").waitFor({ state: "visible", timeout: 15000 });
  await page.setInputFiles("#dsRentRollFile", correctedPath);
  await page.fill("#dsAsOf", retryAsOf);
  const correctedBytes = fs.readFileSync(correctedPath);
  const correctedHash = sha256(correctedBytes);
  const correctedUploadWait = responseFor(page, "POST", /^\/deal-setup\/deals\/[^/]+\/properties\/[^/]+\/source$/);
  const correctedReadWait = responseFor(page, "POST", /^\/deal-setup\/activations\/[^/]+\/read-source$/);
  const correctedReviewWait = responseFor(page, "GET",
    new RegExp(`^\/deal-setup\/activations\/${saved.activation_id}$`));
  const [, correctedUploadResponse] = await Promise.all([
    page.getByRole("button", { name: "Upload and read", exact: true }).click(),
    correctedUploadWait,
  ]);
  const correctedUploadBody = await correctedUploadResponse.json();
  const correctedArtifactId = correctedUploadBody && correctedUploadBody.artifact && correctedUploadBody.artifact.id;
  if (correctedUploadResponse.status() !== 201 || !correctedArtifactId || correctedArtifactId === saved.artifact_id) {
    refuse("MIXED_WHOLE_FIRST_CORRECTED_SOURCE_UPLOAD_NOT_NEW");
  }
  const correctedReadResponse = await correctedReadWait;
  const correctedReadBody = await correctedReadResponse.json();
  if (correctedReadResponse.status() !== 201 || !correctedReadBody || correctedReadBody.rows_read !== 1) {
    refuse("MIXED_WHOLE_FIRST_CORRECTED_SOURCE_READ_NOT_SINGLE_ROW");
  }
  if (correctedReadBody.source_format !== "xlsx" || !String(correctedReadBody.source_sheet || "").trim()) {
    refuse("MIXED_WHOLE_FIRST_CORRECTED_SOURCE_METADATA_MISSING");
  }
  const correctedReviewResponse = await correctedReviewWait;
  if (correctedReviewResponse.status() !== 200) refuse("MIXED_WHOLE_FIRST_CORRECTED_REVIEW_GET_DID_NOT_RETURN_200");
  const correctedReviewBody = await correctedReviewResponse.json();
  const correctedReview = correctedReviewBody.review_counts || {};
  if (!correctedReviewBody.activation || correctedReviewBody.activation.id !== saved.activation_id
      || !correctedReviewBody.source || correctedReviewBody.source.sha256 !== correctedHash
      || correctedReviewBody.opening_position !== null
      || Number(correctedReview.total) !== 1 || Number(correctedReview.current) !== 1
      || Number(correctedReview.future) !== 0 || Number(correctedReview.assigned) !== 1
      || Number(correctedReview.unassigned_current) !== 0 || Number(correctedReview.unassigned_future) !== 0
      || !Array.isArray(correctedReviewBody.proposals) || correctedReviewBody.proposals.length !== 1) {
    refuse("MIXED_WHOLE_FIRST_CORRECTED_REVIEW_NOT_SINGLE_CURRENT_PROPOSAL");
  }
  const normalized = correctedReviewBody.proposals[0].normalized_json || {};
  if (String(normalized.unit_number) !== "101" || String(normalized.space_label) !== "Room1") {
    refuse("MIXED_WHOLE_FIRST_CORRECTED_REVIEW_ROOM_INTENT_MISMATCH");
  }
  await requireReviewUI(page, "mixed_whole_first_corrected", correctedReview, correctedReviewBody.counts);
  await page.locator("#dsContent").screenshot({path:path.join(OUTPUT,"synthetic_mixed_whole_first-corrected-review.png")});
  evidence.push({
    source: "synthetic_mixed_whole_first_recovery",
    same_file_retry_upload_200: true,
    same_file_retry_read_409: true,
    same_artifact_reused: true,
    refusal_visible_after_retry: true,
    retained_file_ui_path_visible: retainedUiPathVisible,
    corrected_source_upload_201: true,
    corrected_source_read_201: true,
    corrected_single_current_proposal: correctedReviewBody.proposals.length === 1,
    corrected_room1_space_intent: true,
    corrected_same_activation: true,
    corrected_source_hash_matches_upload: true,
    corrected_opening_position_absent: true,
    corrected_visible_review: true,
    confirmations_attempted: 0,
  });
}

async function verifyRestartSource(page, sourcePath, saved) {
  const label = saved.label;
  stage = `${label}_restart_loading_review`;
  await page.evaluate((dealId) => window.dsOpenDeal(dealId), saved.deal_id);
  const propertyRow = page.locator("tr").filter({ hasText: saved.property_name });
  const setupButton = propertyRow.getByRole("button", { name: /^(Continue setup|Review|Set up)$/ });
  await setupButton.waitFor({ state: "visible", timeout: 30000 });
  const activationWait = responseFor(page, "POST",
    new RegExp(`^/deal-setup/deals/${saved.deal_id}/properties/${saved.property_id}/activation$`));
  const reviewWait = responseFor(page, "GET",
    new RegExp(`^/deal-setup/activations/${saved.activation_id}$`));
  const [, activationResponse, reviewResponse] = await Promise.all([
    setupButton.click(), activationWait, reviewWait,
  ]);
  if (activationResponse.status() !== 200) refuse(`${label.toUpperCase()}_RESTART_REOPEN_DID_NOT_RETURN_200`);
  const activationBody = await activationResponse.json();
  if (!activationBody || !activationBody.activation
      || activationBody.activation.id !== saved.activation_id || activationBody.reopened !== true) {
    refuse(`${label.toUpperCase()}_RESTART_REOPEN_CHANGED_ACTIVATION`);
  }
  if (reviewResponse.status() !== 200) refuse(`${label.toUpperCase()}_RESTART_REVIEW_GET_DID_NOT_RETURN_200`);
  const reviewBody = await reviewResponse.json();
  exactCounts(reviewBody.review_counts, saved.review_counts, label);
  exactStatusCounts(reviewBody.counts, saved.status_counts, label);
  exactCounts({ vacant: vacancyCount(reviewBody, label) }, { vacant: saved.vacancy_count }, label);
  await requireReviewUI(page, label, reviewBody.review_counts, reviewBody.counts);
  stage = `${label}_restart_verifying_retained_bytes`;
  const original = fs.readFileSync(sourcePath);
  if (sha256(original) !== saved.source_sha256 || original.length !== saved.source_byte_count) {
    refuse(`${label.toUpperCase()}_RESTART_INPUT_DIFFERS_FROM_STAGED_SOURCE`);
  }
  const downloaded = await retainedBytes(saved.artifact_id);
  if (sha256(downloaded.bytes) !== saved.source_sha256 || downloaded.bytes.length !== saved.source_byte_count) {
    refuse(`${label.toUpperCase()}_RESTART_RETAINED_BYTES_DIFFER`);
  }
  evidence.push({
    source: label,
    source_sha256: saved.source_sha256,
    source_byte_count: saved.source_byte_count,
    download_status: downloaded.status,
    retained_exact_hash_and_bytes: true,
    review_counts: saved.review_counts,
    status_counts: saved.status_counts,
    vacancy_count: saved.vacancy_count,
    visible_review_after_restart: true,
    confirmations_attempted: 0,
  });
}

async function verifyMixedConfirmAll(page, fixture) {
  const required = ["deal_id", "property_id", "property_name", "activation_id",
    "ready_before", "expected_added", "expected_refused", "expected_remaining",
    "expected_refusal_error"];
  if (!fixture || required.some((key) => fixture[key] === undefined || fixture[key] === null)) {
    refuse("PROOF_SYNTHETIC_STATE_INVALID");
  }
  stage = "mixed_opening_synthetic_review";
  await page.evaluate(() => window.dsShow());
  await page.locator("#dsNewDealName").waitFor({ state: "visible", timeout: 30000 });
  await page.evaluate((dealId) => window.dsOpenDeal(dealId), fixture.deal_id);
  const propertyRow = page.locator("tr").filter({ hasText: fixture.property_name });
  const setupButton = propertyRow.getByRole("button", { name: /^(Continue setup|Review|Set up)$/ });
  await setupButton.waitFor({ state: "visible", timeout: 30000 });
  const activationWait = responseFor(page, "POST",
    new RegExp(`^/deal-setup/deals/${fixture.deal_id}/properties/${fixture.property_id}/activation$`));
  const reviewWait = responseFor(page, "GET",
    new RegExp(`^/deal-setup/activations/${fixture.activation_id}$`));
  const [, activationResponse, reviewResponse] = await Promise.all([
    setupButton.click(), activationWait, reviewWait,
  ]);
  if (activationResponse.status() !== 200 || reviewResponse.status() !== 200) {
    refuse("MIXED_SYNTHETIC_REVIEW_DID_NOT_OPEN");
  }
  const activationBody = await activationResponse.json();
  if (!activationBody || !activationBody.activation
      || activationBody.activation.id !== fixture.activation_id || activationBody.reopened !== true) {
    refuse("MIXED_SYNTHETIC_ACTIVATION_CHANGED");
  }
  const before = await reviewResponse.json();
  if (Number((before.counts || {}).staged || 0) !== Number(fixture.ready_before)) {
    refuse("MIXED_READY_BEFORE_MISMATCH");
  }
  const buttonName = `Add all ${fixture.ready_before} ready rows`;
  const confirmButton = page.getByRole("button", { name: buttonName, exact: true });
  await confirmButton.waitFor({ state: "visible", timeout: 30000 });

  const confirmBodies = [];
  const collectConfirmation = (response) => {
    const request = response.request();
    let url;
    try { url = new URL(request.url()); } catch { return; }
    if (request.method() !== "POST" || !/^\/deal-setup\/proposals\/[^/]+\/confirm$/.test(url.pathname)) return;
    confirmBodies.push(response.json().catch(() => null).then((body) => ({
      status: response.status(), error: body && body.error ? String(body.error) : null,
    })));
  };
  page.on("response", collectConfirmation);
  stage = "mixed_confirming_all";
  const afterReviewWait = responseFor(page, "GET",
    new RegExp(`^/deal-setup/activations/${fixture.activation_id}$`));
  const [, afterReviewResponse] = await Promise.all([confirmButton.click(), afterReviewWait]);
  page.off("response", collectConfirmation);
  const outcomes = await Promise.all(confirmBodies);
  if (outcomes.length !== Number(fixture.ready_before)) refuse("MIXED_CONFIRM_RESPONSE_COUNT_MISMATCH");
  const added = outcomes.filter((outcome) => outcome.status >= 200 && outcome.status < 300).length;
  const refused = outcomes.filter((outcome) => outcome.status >= 400).length;
  if (added !== Number(fixture.expected_added) || refused !== Number(fixture.expected_refused)
      || !outcomes.some((outcome) => outcome.status === 200)
      || !outcomes.some((outcome) => outcome.status === 409
        && outcome.error === fixture.expected_refusal_error)) {
    refuse("MIXED_CONFIRM_OUTCOMES_MISMATCH");
  }
  if (afterReviewResponse.status() !== 200) refuse("MIXED_REVIEW_REFRESH_DID_NOT_RETURN_200");
  const after = await afterReviewResponse.json();
  if (Number((after.counts || {}).staged || 0) !== Number(fixture.expected_remaining)
      || Number((after.counts || {}).promoted || 0) !== Number(fixture.expected_added)
      || Number((after.counts || {}).needs_review || 0) !== Number(fixture.expected_refused)) {
    refuse("MIXED_FINAL_STATUS_COUNTS_MISMATCH");
  }
  stage = "mixed_verifying_persistent_feedback";
  const feedback = page.locator("#dsFeedback");
  await feedback.waitFor({ state: "visible", timeout: 15000 });
  const expectedPhrases = [`${fixture.expected_added} added`, `${fixture.expected_refused} refused`,
    `${fixture.expected_remaining} still ready`];
  const feedbackMatches = await feedback.evaluate((node, phrases) => {
    const text = node.innerText;
    return phrases.every((phrase) => text.includes(phrase));
  }, expectedPhrases);
  if (!feedbackMatches || !(await visibleAtPaint(page, "#dsFeedback"))) {
    refuse("MIXED_CONFIRM_RESULT_NOT_VISIBLY_PERSISTENT");
  }
  evidence.push({
    source: "synthetic_mixed_confirmation",
    ready_before: Number(fixture.ready_before), added, refused,
    remaining: Number(fixture.expected_remaining),
    refusal_error: fixture.expected_refusal_error,
    final_status_counts: {
      promoted: Number((after.counts || {}).promoted || 0),
      needs_review: Number((after.counts || {}).needs_review || 0),
      staged: Number((after.counts || {}).staged || 0),
    },
    visible_persistent_result: true,
  });
}

async function verifyRetainedClaims(page, state) {
  if (!state || !Array.isArray(state.fixtures) || state.fixtures.length !== 3) refuse("RELAY_FIXTURES_INVALID");
  for (let i = 0; i < state.fixtures.length; i++) {
    const fixture = state.fixtures[i];
    stage = `relay_${i}_session`;
    await page.evaluate(token => localStorage.setItem("__ps_space_fixture_token__", token), fixture.token);
    await page.goto(`${APP_ORIGIN}/index.html`,{waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForFunction(() => Boolean(window._egStarted && window.__psLive && window.__psLive.hasSession()),null,{timeout:30000});
    if ((await page.evaluate(() => window.__psLive.sessionMeta())).property_id !== fixture.property_id) refuse("RELAY_SCOPE_MISMATCH");
    await page.locator(".desk-card[onclick=\"openDesk('management')\"]").click();
    const door = page.locator(".mg-door").filter({has:page.locator("h3",{hasText:/^rent roll$/i})});
    await door.waitFor({state:"visible",timeout:30000});
    const responseWait = responseFor(page,"GET",/^\/operator\/rent-roll\/units$/);
    await door.click();
    const response = await responseWait;
    if (response.status() !== 200) refuse("RELAY_HTTP_FAILED");
    const data = await response.json();
    if (data.property_id !== fixture.property_id || data.totals.confirmed_rows_not_attached !== fixture.expected_count
        || data.totals.rentable_positions !== fixture.expected_positions) refuse("RELAY_CANONICAL_COUNTS_MISMATCH");
    await page.waitForFunction(() => {
      const body = document.getElementById("psRruBody");
      return body && ["data","empty"].includes(body.getAttribute("data-ps-state"));
    },null,{timeout:30000});
    const notice = page.locator("#psRruRetainedClaims");
    if (fixture.expected_count === 0) {
      if (await notice.count()) refuse("RELAY_FALSE_ATTENTION");
    } else {
      await notice.waitFor({state:"visible",timeout:30000});
      const summary = notice.locator("summary");
      if (!(await summary.innerText()).includes(String(fixture.expected_count))) refuse("RELAY_TOTAL_NOT_VISIBLE");
      await summary.click();
      const text = await notice.innerText();
      for (const row of data.unattached_source_rows) if (!text.includes(row.source_key)) refuse("RELAY_SOURCE_KEY_MISSING");
      if (fixture.expected_truncated && !/50\s+of\s+51/.test(text)) refuse("RELAY_PARTIAL_LIST_NOT_DISCLOSED");
      if (!fixture.expected_positions && !/No rentable positions/.test(await page.locator("#psRruBody").innerText())) refuse("RELAY_INVENTED_INVENTORY");
      await summary.scrollIntoViewIfNeeded();
      if (!(await visibleAtPaint(page,"#psRruRetainedClaims summary"))) refuse("RELAY_NOTICE_NOT_VISIBLE_AT_PAINT");
      await page.screenshot({path:path.join(OUTPUT,`relay-viewport-${i}.png`)});
      await notice.screenshot({path:path.join(OUTPUT,`relay-visible-${i}.png`)});
    }
    evidence.push({source:"retained_claims",confirmed_count:fixture.expected_count,
      visible_rows:data.unattached_source_rows.length,truncated:fixture.expected_truncated,
      current_positions:fixture.expected_positions,visible_at_paint:true});
  }
  stage = "relay_unavailable";
  const handler = route => route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"Rent Roll unavailable"})});
  const urls = [API,PROD_API].map(origin => `${origin}/operator/rent-roll/units**`);
  for (const url of urls) await page.route(url,handler);
  try {
    const failedRead = responseFor(page,"GET",/^\/operator\/rent-roll\/units$/);
    await page.locator("#psRruDate").fill("2026-07-31");
    if ((await failedRead).status() !== 503) refuse("RELAY_FAILURE_READ_NOT_FORCED");
    await page.locator("#psRruBody[data-ps-state='unavailable']").waitFor({state:"visible",timeout:30000});
    if (!(await page.getByRole("button",{name:"Retry",exact:true}).isVisible()) || await page.locator("#psRruRetainedClaims").count()) refuse("RELAY_FAILURE_NOT_HONEST");
    evidence.push({source:"retained_claims_read_failure",unavailable:true,retry_visible:true,stale_claims_absent:true});
  } finally { for (const url of urls) await page.unroute(url,handler); }
  const recovered = responseFor(page,"GET",/^\/operator\/rent-roll\/units$/);
  await page.getByRole("button",{name:"Retry",exact:true}).click();
  if ((await recovered).status() !== 200) refuse("RELAY_RETRY_FAILED");
  await page.locator("#psRruRetainedClaims").waitFor({state:"visible",timeout:30000});
  evidence.push({source:"retained_claims_retry",read_recovered:true});
}

async function verifySourceAuth(page, state) {
  const expectedRefusal = String((state && state.expected_refusal_error) || "property_setup_access_required");
  const actors = state && state.actors;
  if (!state || state.proof !== "source_auth" || state.version !== 1
      || !state.deal_id || !state.target_property_id || !state.target_property_name
      || expectedRefusal !== "property_setup_access_required"
      || !Array.isArray(actors) || actors.length !== 5) {
    refuse("PROOF_SOURCE_AUTH_STATE_INVALID");
  }
  const requiredLabels = [
    "outside_target", "maintenance_only_target", "assigned_target_management",
    "assigned_target_leasing", "org_admin",
  ];
  const expectedStatusByLabel = {
    outside_target: 403,
    maintenance_only_target: 403,
    assigned_target_management: 200,
    assigned_target_leasing: 200,
    org_admin: 200,
  };
  const labels = actors.map((actor) => actor && actor.label);
  if (requiredLabels.some((label) => !labels.includes(label))
      || new Set(labels).size !== requiredLabels.length) {
    refuse("PROOF_SOURCE_AUTH_ACTORS_INVALID");
  }
  for (const actor of actors) {
    if (!actor || !actor.label || !actor.token
        || !Number.isInteger(actor.expected_open_status)
        || actor.expected_open_status !== expectedStatusByLabel[actor.label]) {
      refuse("PROOF_SOURCE_AUTH_ACTOR_INVALID");
    }
  }

  let refusedCount = 0;
  let openedCount = 0;
  const observedStatuses = {};
  for (const actor of actors) {
    stage = `source_auth_${actor.label}_fresh_deal_setup`;
    // The committed app's init script reads this existing fixture override at
    // document start. A full navigation creates a fresh Deal Setup state while
    // retaining the browser route fence used by every phase.
    await page.evaluate((token) => {
      localStorage.setItem("__ps_space_fixture_token__", token);
      sessionStorage.clear();
    }, actor.token);
    await page.goto(`${APP_ORIGIN}/index.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.XLSX && window.dsShow), null, { timeout: 20000 });
    await page.evaluate(() => window.dsShow());
    await page.locator("#dsNewDealName").waitFor({ state: "visible", timeout: 30000 });

    stage = `source_auth_${actor.label}_opening_deal`;
    const dealWait = responseFor(page, "GET", new RegExp("^/deal-setup/deals/[^/]+$"));
    const [, dealResponse] = await Promise.all([
      page.evaluate((dealId) => window.dsOpenDeal(dealId), state.deal_id),
      dealWait,
    ]);
    if (dealResponse.status() !== 200) {
      refuse(`SOURCE_AUTH_${actor.label.toUpperCase()}_DEAL_READ_DID_NOT_RETURN_200`);
    }
    const propertyRow = page.locator("tr").filter({ hasText: state.target_property_name });
    await propertyRow.waitFor({ state: "visible", timeout: 30000 });
    const setupButton = propertyRow.getByRole("button", { name: /^(Continue setup|Review|Set up)$/ });
    await setupButton.waitFor({ state: "visible", timeout: 30000 });

    stage = `source_auth_${actor.label}_opening_activation`;
    const activationWait = responseFor(page, "POST",
      /^\/deal-setup\/deals\/[^/]+\/properties\/[^/]+\/activation$/);
    const setupReadWait = actor.expected_open_status === 200
      ? responseFor(page, "GET", /^\/deal-setup\/activations\/[^/]+$/) : null;
    await setupButton.click();
    const activationResponse = await activationWait;
    const setupReadResponse = setupReadWait ? await setupReadWait : null;
    observedStatuses[actor.label] = activationResponse.status();
    if (activationResponse.status() !== actor.expected_open_status) {
      refuse(`SOURCE_AUTH_${actor.label.toUpperCase()}_UNEXPECTED_OPEN_STATUS`);
    }

    if (actor.expected_open_status === 403) {
      refusedCount += 1;
      const activationBody = await activationResponse.json();
      if (!activationBody || activationBody.error !== expectedRefusal) {
        refuse(`SOURCE_AUTH_${actor.label.toUpperCase()}_REFUSAL_REASON_MISMATCH`);
      }
      const refusal = page.locator("#dsContent .sa-msg.err");
      await refusal.waitFor({ state: "visible", timeout: 15000 });
      if (!(await visibleAtPaint(page, "#dsContent .sa-msg.err"))) {
        refuse(`SOURCE_AUTH_${actor.label.toUpperCase()}_REFUSAL_NOT_PAINTED`);
      }
      const refusalText = await refusal.innerText();
      const expectedVisibleText = String(activationBody.receipt || activationBody.error || "");
      if (!expectedVisibleText || !refusalText.includes(expectedVisibleText)) {
        refuse(`SOURCE_AUTH_${actor.label.toUpperCase()}_REFUSAL_TEXT_MISSING`);
      }
      if (await page.locator("#dsRentRollFile").count()
          || /Start with the rent roll|Rows read|Source file|Review proposals/i.test(
            await page.locator("#dsContent").innerText())) {
        refuse(`SOURCE_AUTH_${actor.label.toUpperCase()}_STALE_REVIEW_VISIBLE`);
      }
      if (refusedCount === 1) {
        await refusal.screenshot({ path: path.join(OUTPUT, "source-auth-refusal.png") });
      }
      continue;
    }

    openedCount += 1;
    if (setupReadResponse.status() !== 200) {
      refuse(`SOURCE_AUTH_${actor.label.toUpperCase()}_SETUP_READ_DID_NOT_RETURN_200`);
    }
    const setupBody = await setupReadResponse.json();
    if (!setupBody || !setupBody.activation || setupBody.activation.property_id !== state.target_property_id
        || !setupBody.property || setupBody.property.id !== state.target_property_id) {
      refuse(`SOURCE_AUTH_${actor.label.toUpperCase()}_SETUP_SCOPE_MISMATCH`);
    }
    await page.locator("#dsContent .sa-section-head h2").waitFor({ state: "visible", timeout: 15000 });
    if (!(await visibleAtPaint(page, "#dsContent .sa-section-head h2"))) {
      refuse(`SOURCE_AUTH_${actor.label.toUpperCase()}_SETUP_NOT_PAINTED`);
    }
    const setupText = await page.locator("#dsContent").innerText();
    const visibleHeading = await page.locator("#dsContent .sa-section-head h2").innerText();
    const normalizeVisibleName = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (normalizeVisibleName(visibleHeading) !== normalizeVisibleName(state.target_property_name)) {
      refuse(`SOURCE_AUTH_${actor.label.toUpperCase()}_TARGET_NAME_NOT_VISIBLE`);
    }
    if (new RegExp(expectedRefusal, "i").test(setupText)) {
      refuse(`SOURCE_AUTH_${actor.label.toUpperCase()}_FALSE_REFUSAL_VISIBLE`);
    }
    if (openedCount === 1) {
      await page.locator("#dsContent").screenshot({ path: path.join(OUTPUT, "source-auth-authorized.png") });
    }
  }
  if (refusedCount !== 2 || openedCount !== 3) refuse("SOURCE_AUTH_ROLE_COVERAGE_INCOMPLETE");
  evidence.push({
    source: "source_auth",
    actors_checked: actors.length,
    refused_unauthorized_actors: refusedCount,
    opened_authorized_actors: openedCount,
    refusal_reason: expectedRefusal,
    refusal_visible: true,
    stale_review_absent_on_refusal: true,
    statuses: observedStatuses,
  });
}

async function verifyZeroCounts(page, state) {
  if (!state || state.proof !== "management_zero_counts" || state.version !== 1
      || !Array.isArray(state.fixtures) || state.fixtures.length !== 2) refuse("ZERO_STATE_INVALID");
  for (const [index, fixture] of state.fixtures.entries()) {
    if (!fixture.token || !fixture.property_id || fixture.occupied !== index || fixture.inventory !== 2)
      refuse("ZERO_FIXTURE_INVALID");
    stage = `zero_${index}_fresh_management`;
    await page.evaluate(token => {
      localStorage.setItem("__ps_space_fixture_token__", token);
      sessionStorage.clear();
    }, fixture.token);
    await page.goto(`${APP_ORIGIN}/index.html`, {waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForFunction(() => Boolean(window._egStarted && window.__psLive && window.__psLive.hasSession()),null,{timeout:30000});
    if ((await page.evaluate(() => window.__psLive.sessionMeta())).property_id !== fixture.property_id)
      refuse("ZERO_SESSION_SCOPE_MISMATCH");
    const liveRead = responseFor(page,"GET",/^\/operator\/rent-roll$/);
    await page.locator('.desk-card[onclick="openDesk(\'management\')"]:visible').first().click();
    const response = await liveRead;
    if (response.status() !== 200) refuse("ZERO_RENT_ROLL_HTTP_FAILED");
    const body = await response.json();
    if (!body.summary || body.summary.reconciled !== true
        || body.summary.residential_occupied !== fixture.occupied
        || body.summary.residential_inventory !== fixture.inventory) refuse("ZERO_HTTP_COUNTS_MISMATCH");
    const cell = page.locator('section[aria-label="Management condition"] .le-cond-cell')
      .filter({has:page.locator('.le-cond-lbl',{hasText:/^Current occupancy$/})});
    await cell.waitFor({state:"visible",timeout:30000});
    const expectedPct = `${100*fixture.occupied/fixture.inventory}%`;
    const observed = await cell.locator('.le-cond-val').innerText();
    const sub = await cell.locator('.le-cond-sub').innerText();
    await cell.scrollIntoViewIfNeeded();
    await cell.screenshot({path:path.join(OUTPUT,`zero-management-${index}.png`)});
    evidence.push({source:"management_reconciled_counts",occupied:fixture.occupied,
      inventory:fixture.inventory,expected:expectedPct,observed,sub,real_http:true});
    if (observed !== expectedPct || sub !== `${fixture.occupied} of ${fixture.inventory} occupied`)
      refuse("ZERO_MANAGEMENT_DISCARDED_RECONCILED_COUNT");
  }
}

async function verifyHolds(page, state) {
  if (!state || state.proof !== "canonical_occupancy_holds" || state.version !== 1
      || !state.token || !state.property_id
      || !Number.isSafeInteger(state.occupied) || state.occupied < 0
      || !Number.isSafeInteger(state.denominator) || state.denominator < 0) {
    refuse("PROOF_HOLDS_STATE_INVALID");
  }
  stage = "holds_fresh_signed_in_management";
  // The fixture token is consumed by the existing app init script. A fresh
  // navigation keeps this phase independent of whichever surface ran before.
  await page.evaluate((token) => {
    localStorage.setItem("__ps_space_fixture_token__", token);
    sessionStorage.clear();
  }, state.token);
  await page.goto(`${APP_ORIGIN}/index.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => Boolean(window._egStarted && window.__psLive
    && window.__psLive.hasSession()), null, { timeout: 30000 });
  const sessionMeta = await page.evaluate(() => window.__psLive.sessionMeta());
  if (!sessionMeta || String(sessionMeta.property_id) !== String(state.property_id)) refuse("HOLDS_SESSION_SCOPE_MISMATCH");
  const managementDesk = page.locator('.desk-card[onclick="openDesk(\'management\')"]:visible').first();
  await managementDesk.waitFor({ state: "visible", timeout: 30000 });
  await managementDesk.click();

  stage = "holds_opening_management_rent_roll";
  const openRentRoll = page.locator('[onclick="openRentRollFull()"]:visible').first();
  await openRentRoll.waitFor({ state: "visible", timeout: 30000 });
  await openRentRoll.click();
  await page.locator('#psRruBody[data-ps-state="data"]').waitFor({ state: "visible", timeout: 30000 });

  stage = "holds_opening_canonical_rent_roll";
  const canonicalRead = responseFor(page, "GET", /^\/operator\/rent-roll\/canonical$/);
  const fullSchedule = page.locator('button[onclick="psLiveRentRoll()"]:visible').first();
  await fullSchedule.waitFor({ state: "visible", timeout: 30000 });
  const [, canonicalResponse] = await Promise.all([fullSchedule.click(), canonicalRead]);
  if (canonicalResponse.status() !== 200) refuse("HOLDS_CANONICAL_READ_DID_NOT_RETURN_200");
  const canonicalBody = await canonicalResponse.json();
  if (!canonicalBody || String(canonicalBody.property_id) !== String(state.property_id)) {
    refuse("HOLDS_CANONICAL_PROPERTY_MISMATCH");
  }
  const canonicalOccupancy = canonicalBody.totals && canonicalBody.totals.confirmed_contractual_occupancy;
  if (!canonicalOccupancy || canonicalOccupancy.occupied !== state.occupied
      || canonicalOccupancy.of_leasable_resolved !== state.denominator
      || canonicalOccupancy.pct !== null) refuse("HOLDS_CANONICAL_EMPTY_POPULATION_MISMATCH");

  stage = "holds_opening_institutional_schedule";
  const institutionalRead = responseFor(page, "GET", /^\/operator\/rent-roll\/institutional$/);
  const formalSchedule = page.locator('button[onclick="psLiveInstitutionalRentRoll()"]:visible').first();
  await formalSchedule.waitFor({ state: "visible", timeout: 30000 });
  const [, institutionalResponse] = await Promise.all([formalSchedule.click(), institutionalRead]);
  if (institutionalResponse.status() !== 200) refuse("HOLDS_INSTITUTIONAL_READ_DID_NOT_RETURN_200");
  const institutionalBody = await institutionalResponse.json();
  const report = institutionalBody && institutionalBody.report;
  const totals = institutionalBody && institutionalBody.totals;
  if (!report || String(report.property_id) !== String(state.property_id)) {
    refuse("HOLDS_INSTITUTIONAL_PROPERTY_MISMATCH");
  }
  if (!totals || totals.confirmed_contractual_occupancy !== state.occupied
      || totals.occupancy_denominator !== state.denominator) {
    refuse("HOLDS_INSTITUTIONAL_OCCUPANCY_MISMATCH");
  }
  const totalsTable = page.locator("#psIrPage .ir-totals");
  await totalsTable.waitFor({ state: "visible", timeout: 30000 });
  await totalsTable.scrollIntoViewIfNeeded();
  const occupancyCell = totalsTable.locator("tr").filter({ hasText: "Confirmed contractual occupancy" }).locator("td").first();
  await occupancyCell.waitFor({ state: "visible", timeout: 30000 });
  const visibleOccupancy = (await occupancyCell.innerText()).trim();
  if (visibleOccupancy !== `${state.occupied} of ${state.denominator}`) {
    refuse("HOLDS_INSTITUTIONAL_OCCUPANCY_NOT_PAINTED");
  }
  if (!(await visibleAtPaint(page, "#psIrPage .ir-totals"))) {
    refuse("HOLDS_INSTITUTIONAL_TOTALS_NOT_VISIBLE_AT_PAINT");
  }

  stage = "holds_exporting_client_csv";
  const downloadWait = page.waitForEvent("download", { timeout: 30000 });
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const download = await downloadWait;
  const downloadPath = await download.path();
  if (!downloadPath) refuse("HOLDS_CLIENT_CSV_DOWNLOAD_PATH_MISSING");
  const csv = fs.readFileSync(downloadPath, "utf8");
  if (!csv.includes(`Confirmed contractual occupancy,${state.occupied} of ${state.denominator}`)) {
    refuse("HOLDS_CLIENT_CSV_OCCUPANCY_MISMATCH");
  }
  await page.locator("#psIrPage").screenshot({ path: path.join(OUTPUT, "holds-institutional-review.png") });
  evidence.push({
    source: "canonical_occupancy_holds",
    institutional_read_status: institutionalResponse.status(),
    canonical_property_verified: true,
    institutional_property_verified: true,
    total_positions: Number(totals.total_positions),
    confirmed_contractual_occupancy: Number(totals.confirmed_contractual_occupancy),
    occupancy_denominator: Number(totals.occupancy_denominator),
    visible_occupancy: visibleOccupancy,
    client_csv_occupancy_verified: true,
    visible_at_paint: true,
  });
}

async function verifySpaces(page, state) {
  if (!state || !Array.isArray(state.fixtures) || !state.fixtures.length) {
    refuse("PROOF_SPACE_STATE_INVALID");
  }
  const fixtures = state.fixtures;
  for (let i = 0; i < fixtures.length; i++) {
    const fixture = fixtures[i];
    if (!fixture || !fixture.token || !fixture.property_id || !Array.isArray(fixture.expected_available_labels)) {
      refuse("PROOF_SPACE_FIXTURE_INVALID");
    }
    stage = `spaces_${i}_loading_session`;
    // Reuse the one shipped session rehydration path. The token remains private
    // and is never printed or included in the durable receipt.
    await page.evaluate((token) => {
      localStorage.setItem("__ps_space_fixture_token__", token);
    }, fixture.token);
    // A new independent fixture starts at Home. Reloading the previous hash
    // restores its desk after boot and races a click on the now-hidden Home.
    await page.goto(`${APP_ORIGIN}/index.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => Boolean(window._egStarted && window.__psLive
      && window.__psLive.hasSession && window.__psLive.hasSession()), null, { timeout: 30000 });
    const session = await page.evaluate(() => window.__psLive.sessionMeta());
    if (!session || session.property_id !== fixture.property_id) {
      refuse("PROOF_SPACE_SESSION_PROPERTY_MISMATCH");
    }

    stage = `spaces_${i}_opening_leasing`;
    await page.locator(".desk-card[onclick=\"openDesk('leasing')\"]").click();
    await page.locator("#leMarketDoor").waitFor({ state: "visible", timeout: 30000 });
    // THE DESK REPAINTS ITSELF. renderDesk('leasing') paints the desk, awaits
    // its condition and tour-schedule reads, then calls
    // renderDailyLeasingSurface again (index.html, the function ending near
    // `await loadTourSchedule(force)`). A Market & Pricing click inside that
    // window opens the workspace and is then painted over by the late desk
    // repaint — observed deterministically on the second fixture of this
    // phase, 2026-09-06. That is an app navigation defect, recorded for its
    // own slice and NOT repaired here. This proof waits for the desk to
    // settle so what it exercises is availability, not the race.
    const deskSettled = () => {
      const briefing = document.querySelector("#leBriefing");
      const fact = document.querySelector("#leMarketFact");
      return Boolean(briefing && !/Loading/.test(briefing.textContent)
        && fact && /marketable now/.test(fact.textContent));
    };
    await page.waitForFunction(deskSettled, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.waitForFunction(deskSettled, null, { timeout: 30000 });
    const summaryWait = responseFor(page, "GET", /^\/operator\/leasing\/availability-canonical$/);
    const [, summaryResponse] = await Promise.all([
      page.locator("#leMarketDoor").click(), summaryWait,
    ]);
    if (summaryResponse.status() !== 200) refuse("PROOF_SPACE_CANONICAL_READ_NOT_200");
    const fullAvailability = page.getByRole("button", { name: "Open full availability →", exact: true });
    await fullAvailability.waitFor({ state: "visible", timeout: 30000 });
    const canonicalWait = responseFor(page, "GET", /^\/operator\/leasing\/availability-canonical$/);
    const [, response] = await Promise.all([fullAvailability.click(), canonicalWait]);
    if (response.status() !== 200) refuse("PROOF_SPACE_CANONICAL_READ_NOT_200");
    const canonicalBody = await response.json();
    const canonicalRows = (canonicalBody && Array.isArray(canonicalBody.rows)) ? canonicalBody.rows : [];
    const marketableRows = canonicalRows.filter((row) => row && row.marketing_state === "marketable_now");
    const unresolvedRows = canonicalRows.filter((row) => row && ["occupancy_unknown", "evidence_unreconciled"]
      .includes(row.marketing_state));
    await page.waitForFunction(() => Boolean(document.querySelector(".rrc-row.av-row:not(.rrc-hdr)")), null, { timeout: 30000 });
    const visibleRows = await page.evaluate(() => Array.from(
      document.querySelectorAll(".rrc-row.av-row:not(.rrc-hdr)"),
      (node) => ({ text: node.innerText.trim(), position: (node.querySelector(".rrc-c") || node).innerText.trim() })
    ));
    // THE COMPLETE DISPLAYED POPULATION, BY EXACT IDENTITY. The page lists
    // every canonical row except occupied ones. Nothing else may appear and
    // nothing may be missing. An earlier draft compared a FILTERED subset of
    // visible rows to the marketable rows, which would have let an unexpected
    // extra row — or a dropped one — pass unseen.
    const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const contextFor = (row) => `Unit ${row.unit_number || "—"}`
      + (row.space_label && !/whole\s*unit/i.test(row.space_label) ? ` · ${row.space_label}` : "");
    const matches = (visible, row) => new RegExp("^" + escapeRegex(contextFor(row)) + "(\\s|$)").test(visible.position);
    const displayedRows = canonicalRows.filter((row) => row && row.marketing_state !== "occupied");
    if (visibleRows.length !== displayedRows.length) refuse("PROOF_SPACE_DISPLAYED_POPULATION_MISMATCH");
    const visibleFor = (row) => visibleRows.filter((visible) => matches(visible, row));
    if (!displayedRows.every((row) => visibleFor(row).length === 1)) refuse("PROOF_SPACE_POSITION_IDENTITY_MISMATCH");
    const labelOf = (row) => String(row.space_label || row.unit_number);
    const shown = marketableRows.map(labelOf);
    const expected = fixture.expected_available_labels.map((label) => String(label));
    const expectedUnresolved = (fixture.expected_unresolved_labels || []).map((label) => String(label));
    const shownUnresolved = unresolvedRows.map(labelOf);
    if (JSON.stringify([...shown].sort()) !== JSON.stringify([...expected].sort())) refuse("PROOF_SPACE_AVAILABLE_LABELS_MISMATCH");
    if (JSON.stringify([...shownUnresolved].sort()) !== JSON.stringify([...expectedUnresolved].sort())) {
      refuse("PROOF_SPACE_UNRESOLVED_LABELS_MISMATCH");
    }
    // An unknown or unreconciled position is explained, and dated by nothing.
    for (const row of unresolvedRows) {
      const [visible] = visibleFor(row);
      const explained = row.marketing_state === "occupancy_unknown"
        ? /not established/i.test(visible.text) : /unresolved/i.test(visible.text);
      if (!explained) refuse("PROOF_SPACE_UNRESOLVED_ROW_NOT_EXPLAINED");
      if (row.available_from != null || /\b20\d\d\b/.test(visible.text) || /expected/i.test(visible.text)) {
        refuse("PROOF_SPACE_UNRESOLVED_ROW_PROMISED_A_DATE");
      }
    }
    // A marketable position carries no status noise and a served date.
    for (const row of marketableRows) {
      const [visible] = visibleFor(row);
      if (/not established|unresolved|disagrees/i.test(visible.text)) refuse("PROOF_SPACE_MARKETABLE_ROW_CARRIES_A_BLOCKER");
    }
    if (Number((canonicalBody.headline || {}).marketable_now) !== expected.length) {
      refuse("PROOF_SPACE_MARKETABLE_HEADLINE_MISMATCH");
    }
    const occupied = canonicalRows.filter((row) => row && row.marketing_state === "occupied");
    if (occupied.length !== 1 || occupied[0].space_label !== "Room1"
      || visibleRows.some((visible) => visible.position.includes("Room1"))) {
      refuse("PROOF_SPACE_OCCUPIED_POSITION_NOT_EXCLUDED");
    }
    if (visibleRows.some((row) => /\$/.test(row.text) || /asking/i.test(row.text))) {
      refuse("PROOF_SPACE_UI_LEAKED_PRICE");
    }
    await page.locator("#psAvBody").scrollIntoViewIfNeeded();
    if (!(await visibleAtPaint(page,".rrc-row.av-row:not(.rrc-hdr)"))) refuse("PROOF_SPACE_LIST_NOT_VISIBLE_AT_PAINT");
    await page.locator("#psAvBody").screenshot({path:path.join(OUTPUT,`spaces-visible-${i}.png`)});
    evidence.push({
      source: "spaces",
      canonical_read_status: response ? response.status() : null,
      expected_available_labels: expected,
      visible_available_labels: shown,
      expected_unresolved_labels: expectedUnresolved,
      visible_unresolved_labels: shownUnresolved,
      occupied_positions_excluded_from_marketable_list: true,
      prices_absent: true,
      visible_at_paint: true,
    });
  }

  stage = "spaces_verifying_read_failure";
  const failureHandler = async (route) => {
    return route.fulfill({ status: 503, contentType: "application/json",
      body: JSON.stringify({ error: "availability unavailable" }) });
  };
  const canonicalPath = "/operator/leasing/availability-canonical";
  const canonicalFailureRoutes = [API, PROD_API]
    .map((origin) => `${origin}${canonicalPath}`);
  for (const routeUrl of canonicalFailureRoutes) {
    await page.route(routeUrl, failureHandler);
  }
  try {
    const failedRead = responseFor(page, "GET", /^\/operator\/leasing\/availability-canonical$/);
    await page.locator("#intelStrip .le-lhead-back").click();
    await page.locator("#leMarketDoor").waitFor({ state: "visible", timeout: 30000 });
    await Promise.all([page.locator("#leMarketDoor").click(), failedRead]);
    if ((await failedRead).status() !== 503) refuse("PROOF_SPACE_FAILURE_READ_NOT_FORCED");
    await page.locator(".ps-ar-unavailable").waitFor({ state: "visible", timeout: 30000 });
    const unavailable = await page.locator(".ps-ar-unavailable").innerText();
    const retry = page.getByRole("button", { name: "Retry", exact: true });
    if (!(await retry.isVisible()) || !/Availability is unavailable/i.test(unavailable)) {
      refuse("PROOF_SPACE_FAILURE_NOT_HONEST");
    }
  } finally {
    for (const routeUrl of canonicalFailureRoutes) {
      await page.unroute(routeUrl, failureHandler);
    }
  }
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

    if (PHASE !== "mixed" && /^\/deal-setup\/proposals\/[^/]+\/confirm$/.test(url.pathname)) {
      interceptionRefusalCode = "CONFIRMATION_REQUEST_FORBIDDEN_IN_REVIEW_PROOF";
      await route.abort("blockedbyclient");
      return;
    }

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
    const fixtureToken = localStorage.getItem("__ps_space_fixture_token__");
    sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: fixtureToken || token.session }));
  }, { api: API, session: SESSION });

  stage = "loading_unchanged_app";
  await page.goto(`${APP_ORIGIN}/index.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.XLSX && window.dsShow), null, { timeout: 20000 });

  let confirmationAttempts = 0;
  if (PHASE === "stage") {
    const nonce = `${Date.now()}-${process.pid}`;
    stage = "creating_fixture_deal";
    const dealId = await createDeal(page, nonce);
    const sources = [];
    // Fable's counterexamples go through the same retained-source browser
    // path. These synthetic properties never enter actual-source state.
    const XLSX = require(path.join(apiRoot, "node_modules", "xlsx"));
    const fixtures = [
      {label:"synthetic_conflicts", rows:[["101","Room1","Synthetic A",900,850],["101","Room1","Synthetic B",900,850]]},
      {label:"synthetic_unassigned_current", rows:[["101","Room1","VACANT",900,null],[null,null,"Synthetic Unassigned",900,850]]},
      {label:"synthetic_mixed_whole_first", mixed:true, rows:[["101","(whole unit)","VACANT",900,null],["101","Room1","VACANT",900,null]]},
      {label:"synthetic_mixed_room_first", mixed:true, rows:[["101","Room1","VACANT",900,null],["101","(whole unit)","VACANT",900,null]]},
    ];
    for (const fixture of fixtures) {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
        ["Unit","Room","Resident","Market Rent","Actual Rent"], [],
        ["Current/Notice/Vacant Residents"], ...fixture.rows,
      ]), "Synthetic");
      const sourcePath = path.join(OUTPUT, fixture.label + ".xlsx");
      XLSX.writeFile(workbook, sourcePath);
      const result = await stageSource(page, dealId, sourcePath, fixture.label, nonce + "-" + fixture.label, Boolean(fixture.mixed));
      if (fixture.label === "synthetic_mixed_whole_first") {
        const correctedWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(correctedWorkbook, XLSX.utils.aoa_to_sheet([
          ["Unit","Room","Resident","Market Rent","Actual Rent"], [],
          ["Current/Notice/Vacant Residents"],
          ["101","Room1","VACANT",900,null],
        ]), "Synthetic");
        const correctedPath = path.join(OUTPUT, "synthetic_mixed_whole_first_corrected.xlsx");
        XLSX.writeFile(correctedWorkbook, correctedPath);
        await verifyMixedWholeFirstRecovery(page, result, correctedPath);
      }
      if (fixture.mixed) continue;
      if (fixture.label === "synthetic_conflicts") {
        exactCounts(result.review_counts, {total:2,current:2,future:0,assigned:2,unassigned_current:0,unassigned_future:0}, fixture.label);
        exactStatusCounts(result.status_counts, {conflicted:2}, fixture.label);
      } else {
        exactCounts(result.review_counts, {total:2,current:2,future:0,assigned:1,unassigned_current:1,unassigned_future:0}, fixture.label);
        exactStatusCounts(result.status_counts, {staged:1,blocked:1}, fixture.label);
      }
    }
    sources.push(await stageSource(page, dealId, JULY, "july", nonce));
    sources.push(await stageSource(page, dealId, SKYLINE, "skyline", nonce));
    stage = "writing_private_review_state";
    fs.writeFileSync(reviewStatePath, JSON.stringify({
      proof: "canonical_onboarding_review",
      version: 1,
      sources,
    }, null, 2) + "\n", { flag: "wx" });
  } else if (PHASE === "restart") {
    stage = "reading_private_review_state";
    const saved = JSON.parse(fs.readFileSync(reviewStatePath, "utf8"));
    if (!saved || saved.proof !== "canonical_onboarding_review" || saved.version !== 1
        || !Array.isArray(saved.sources) || saved.sources.length !== 2) {
      refuse("PROOF_REVIEW_STATE_INVALID");
    }
    const byLabel = Object.fromEntries(saved.sources.map((source) => [source.label, source]));
    if (!byLabel.july || !byLabel.skyline) refuse("PROOF_REVIEW_STATE_SOURCES_INVALID");
    await page.evaluate(() => window.dsShow());
    await page.locator("#dsNewDealName").waitFor({ state: "visible", timeout: 30000 });
    await verifyRestartSource(page, JULY, byLabel.july);
    await verifyRestartSource(page, SKYLINE, byLabel.skyline);
  } else if (PHASE === "mixed") {
    stage = "reading_private_synthetic_state";
    const fixture = JSON.parse(fs.readFileSync(syntheticStatePath, "utf8"));
    confirmationAttempts = Number(fixture && fixture.ready_before || 0);
    await verifyMixedConfirmAll(page, fixture);
  } else if (PHASE === "relay") {
    await verifyRetainedClaims(page,JSON.parse(fs.readFileSync(relayStatePath,"utf8")));
  } else if (PHASE === "source-auth") {
    stage = "reading_private_source_auth_state";
    let sourceAuthStateStat;
    try { sourceAuthStateStat = fs.statSync(sourceAuthStatePath); } catch { refuse("PROOF_SOURCE_AUTH_STATE_NOT_FOUND"); }
    if (!sourceAuthStateStat.isFile()) refuse("PROOF_SOURCE_AUTH_STATE_NOT_A_FILE");
    await verifySourceAuth(page, JSON.parse(fs.readFileSync(sourceAuthStatePath, "utf8")));
  } else if (PHASE === "zero") {
    stage = "reading_private_zero_state";
    await verifyZeroCounts(page, JSON.parse(fs.readFileSync(zeroStatePath,"utf8")));
  } else if (PHASE === "holds") {
    stage = "reading_private_holds_state";
    let holdsStateStat;
    try { holdsStateStat = fs.statSync(holdsStatePath); } catch { refuse("PROOF_HOLDS_STATE_NOT_FOUND"); }
    if (!holdsStateStat.isFile()) refuse("PROOF_HOLDS_STATE_NOT_A_FILE");
    await verifyHolds(page, JSON.parse(fs.readFileSync(holdsStatePath, "utf8")));
  } else {
    stage = "reading_private_space_state";
    let spaceStateStat;
    try { spaceStateStat = fs.statSync(spaceStatePath); } catch { refuse("PROOF_SPACE_STATE_NOT_FOUND"); }
    if (!spaceStateStat.isFile()) refuse("PROOF_SPACE_STATE_NOT_A_FILE");
    const state = JSON.parse(fs.readFileSync(spaceStatePath, "utf8"));
    await verifySpaces(page, state);
  }

  if (blockedExternal.length) refuse("UNHANDLED_EXTERNAL_REQUEST_ATTEMPTED");
  stage = "writing_success_receipt";
  const receipt = {
    proof: "canonical_onboarding_review",
    phase: PHASE,
    mode: "server_interpreted_retained_source",
    app_source: "successor_index_html",
    api_origin: "literal_loopback",
    external_requests_blocked_before_egress: blockedExternal.length,
    confirmations_attempted: confirmationAttempts,
    sources: evidence,
  };
  const receiptPath = path.join(OUTPUT, `canonical-onboarding-review-${PHASE}-${process.pid}.json`);
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  console.log(`PASS canonical onboarding ${PHASE} proof; receipt=${receiptPath}`);
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
    // What the operator would have seen at the moment of failure. The
    // screenshot and page text stay in the owned output directory; neither
    // enters a durable receipt.
    if (proofPage) {
      await proofPage.screenshot({ path: path.join(OUTPUT, `failure-${PHASE}-${process.pid}.png`), fullPage: true });
      const text = await proofPage.evaluate(() => document.body.innerText);
      fs.writeFileSync(path.join(OUTPUT, `failure-${PHASE}-${process.pid}.private.txt`), String(text).slice(0, 8000));
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
