"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright");

const APP_ROOT = __dirname;
const APP_BASE_SHA = "1fd21494e556cece13f0fd1a8be47464f71ff614";
const API_SHA = "acb7db95c4c6fdab5a23ace8a0ae80dc34c24eeb";
const API_SHORT = "acb7db9";
const API_ROOT = requiredEnv("PSPINE_REAL_API_ROOT");
const DATABASE_URL = requiredEnv("PSPINE_REAL_API_DATABASE_URL");
const API_BASE = process.env.PSPINE_REAL_API_BASE || "http://127.0.0.1:3317";
const APP_PORT = Number(process.env.PSPINE_REAL_APP_PORT || 5317);
const APP_BASE = `http://127.0.0.1:${APP_PORT}`;
const OPERATOR_KEY = process.env.PSPINE_REAL_API_OPERATOR_KEY || "e2e-key";
const ARTIFACT_DIR = path.join(APP_ROOT, "docs", "ask-spine-dashboard-real-api-proof");
const INDEX_PATH = path.join(APP_ROOT, "index.html");
const PRODUCTION_API_ORIGIN = "https://property-spine-api.onrender.com";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function localUrl(value, label) {
  const parsed = new URL(value);
  assert.ok(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname), `${label} must be local`);
  return parsed;
}

localUrl(API_BASE, "PSPINE_REAL_API_BASE");
const databaseTarget = localUrl(DATABASE_URL, "PSPINE_REAL_API_DATABASE_URL");
assert.match(databaseTarget.pathname, /^\/spine_dashboard_/, "database name must start with spine_dashboard_");

const pgPath = path.join(API_ROOT, "node_modules", "pg");
const { Pool } = require(pgPath);

function git(args, cwd) {
  return execFileSync("git", ["-c", `safe.directory=${cwd.replace(/\\/g, "/")}`, "-C", cwd, ...args], { encoding: "utf8" }).trim();
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function browserExecutable() {
  return [
    process.env.CHROME,
    chromium.executablePath(),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].find((candidate) => candidate && fs.existsSync(candidate));
}

function assertFrozenSources() {
  assert.equal(git(["rev-parse", "HEAD"], API_ROOT), API_SHA, "API checkout is not the frozen candidate");
  assert.equal(git(["status", "--porcelain", "--untracked-files=no"], API_ROOT), "", "API tracked worktree is dirty");
  const safeApp = `safe.directory=${APP_ROOT.replace(/\\/g, "/")}`;
  execFileSync("git", ["-c", safeApp, "-C", APP_ROOT, "merge-base", "--is-ancestor", APP_BASE_SHA, "HEAD"]);
  const current = fs.readFileSync(INDEX_PATH);
  const expectedBlob = git(["rev-parse", `${APP_BASE_SHA}:index.html`], APP_ROOT);
  const currentBlob = git(["hash-object", "index.html"], APP_ROOT);
  if (process.env.PSPINE_ALLOW_FALSIFIED_INDEX !== "1") {
    assert.equal(currentBlob, expectedBlob, "index.html differs from the frozen dashboard candidate");
  }
  return {
    expected_index_blob: expectedBlob,
    index_blob: currentBlob,
    index_sha256: sha256(current),
    index_bytes: current.length,
    falsification_override: process.env.PSPINE_ALLOW_FALSIFIED_INDEX === "1",
  };
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url} -> ${response.status}: ${text}`);
  }
  return { response, body };
}

async function api(method, route, { token, key, body } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers["x-staff-session"] = token;
  if (key) headers["x-operator-key"] = key;
  return jsonFetch(`${API_BASE}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function issueSession(userId, propertyId) {
  const { issueStaffSession } = require(path.join(API_ROOT, "src", "identity", "staff_session_service.js"));
  const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await issueStaffSession(client, {
      userId,
      propertyId,
      purpose: "bootstrap_invite",
    });
    await client.query("commit");
    return result.session_token || result.token;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function fixtureContext(pool) {
  const { rows: properties } = await pool.query(
    `select id, name from properties where name = 'Skyline E2E' limit 1`
  );
  assert.equal(properties.length, 1, "Skyline E2E property fixture is missing");
  const property = properties[0];
  const { rows: users } = await pool.query(`select id, name from users where name = 'Mike Grivna' limit 1`);
  assert.equal(users.length, 1, "Mike fixture is missing");
  const mike = users[0];
  const { rows: spaces } = await pool.query(
    `select s.id, s.unit_id
       from spaces s join units u on u.id = s.unit_id
      where u.property_id = $1 and s.space_label = 'Bed B'
      limit 1`,
    [property.id]
  );
  assert.equal(spaces.length, 1, "Skyline E2E space fixture is missing");
  const mikeToken = await issueSession(mike.id, property.id, "dashboard-real-api-proof");
  return { property, mike, mikeToken, spaceId: spaces[0].id, unitId: spaces[0].unit_id };
}

async function createSignerStanding(ctx, suffix) {
  const applicantName = `Dashboard-${suffix} Quillon`;
  const intake = await api("POST", "/leasing/intake", {
    key: OPERATOR_KEY,
    body: {
      intake_secret: "e2e-intake",
      property_id: ctx.property.id,
      name: applicantName,
      email: `dashboard-${suffix.toLowerCase()}@example.test`,
      phone: `+1215555${String(Math.floor(1000 + Math.random() * 8999))}`,
      source: "dashboard_real_api_proof",
    },
  });
  const personId = intake.body.person_id;
  assert.ok(personId, "intake did not return person_id");

  const application = await api("POST", `/properties/${ctx.property.id}/applications`, {
    token: ctx.mikeToken,
    key: OPERATOR_KEY,
    body: {
      applicant_name: applicantName,
      person_id: personId,
      unit_id: ctx.unitId,
      space_id: ctx.spaceId,
      rent: 1850,
      deposit: 1850,
    },
  });
  const applicationId = application.body.application && application.body.application.id;
  assert.ok(applicationId, "application did not return an id");

  await api("POST", `/operator/leasing/applications/${applicationId}/approve`, {
    token: ctx.mikeToken,
    key: OPERATOR_KEY,
    body: {},
  });
  await api("POST", `/operator/leasing/applications/${applicationId}/proposed-terms`, {
    token: ctx.mikeToken,
    key: OPERATOR_KEY,
    body: {
      rent: 1850,
      security_deposit: 1850,
      lease_start_date: "2026-09-01",
      lease_end_date: "2027-08-31",
      concession_status: "none",
      idempotency_key: `dashboard-terms-${applicationId}`,
    },
  });
  const packet = await api("POST", `/operator/leasing/applications/${applicationId}/lease-packet`, {
    token: ctx.mikeToken,
    key: OPERATOR_KEY,
    body: {},
  });
  const packetId = packet.body.packet && packet.body.packet.id;
  assert.ok(packetId, "lease packet did not return an id");
  const sent = await api("POST", `/operator/leasing/lease-packets/${packetId}/send`, {
    token: ctx.mikeToken,
    key: OPERATOR_KEY,
    body: { idempotency_key: `dashboard-send-${packetId}` },
  });
  const rawToken = String(sent.body.tenant_url || "").split("/t/lease/")[1];
  assert.ok(rawToken, "send did not return a tenant signing URL");
  const publicPacket = await jsonFetch(`${API_BASE}/t/lease/${rawToken}/data`);
  const packetBody = publicPacket.body.packet || {};
  const signerName = packetBody.current_signer && packetBody.current_signer.display_name;
  assert.ok(signerName, "packet omitted the current signer name");
  const requiredFields = (packetBody.fields || []).filter((field) => field.required);
  assert.ok(requiredFields.length > 0, "packet has no required resident fields");
  for (const field of requiredFields) {
    await jsonFetch(`${API_BASE}/t/lease/${rawToken}/fields/${field.id}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        value: field.field_type === "signature" ? signerName : "DB",
        consent: field.field_type === "signature",
        session_id: "dashboard-real-api-proof",
      }),
    });
  }
  await jsonFetch(`${API_BASE}/t/lease/${rawToken}/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  return { personId, applicationId, packetId, expectedName: applicantName };
}

async function createPersonalReference(pool, ctx, signer, suffix) {
  const label = `Call Dashboard ${suffix} about the lease packet`;
  const { rows } = await pool.query(
    `insert into obligations
       (property_id, person_id, module, type, label, owner_type, assigned_user_id, status, due_at)
     values ($1, $2, 'leasing', 'dashboard_real_api_proof', $3, 'human', $4, 'open', now() - interval '1 hour')
     returning id`,
    [ctx.property.id, signer.personId, label, ctx.mike.id]
  );
  return { id: rows[0].id, label };
}

async function createUnentitledSession(pool, ctx, suffix) {
  const { rows } = await pool.query(
    `insert into users (name, role, is_active, status, account_kind)
     values ($1, 'maintenance', true, 'active', 'human_staff')
     returning id`,
    [`Dashboard Unentitled ${suffix}`]
  );
  const userId = rows[0].id;
  await pool.query(
    `insert into property_team_assignments
       (user_id, property_id, role_title, allowed_modules, primary_for_modules, active, can_manage_roles)
     values ($1, $2, 'maintenance', '{maintenance}', '{}', true, false)`,
    [userId, ctx.property.id]
  );
  const token = await issueSession(userId, ctx.property.id, "dashboard-real-api-proof-unentitled");
  return { userId, token };
}

function createAppServer(indexBytes) {
  const source = indexBytes.toString("utf8");
  const occurrences = source.split(PRODUCTION_API_ORIGIN).length - 1;
  assert.ok(occurrences > 0, "production API origin is missing from index.html");
  const transformedIndex = source.split(PRODUCTION_API_ORIGIN).join(API_BASE);
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, APP_BASE);
    if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(transformedIndex);
      return;
    }
    const relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
    const resolved = path.resolve(APP_ROOT, relative);
    if (!resolved.startsWith(`${path.resolve(APP_ROOT)}${path.sep}`) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      response.writeHead(404);
      response.end("not found");
      return;
    }
    const extension = path.extname(resolved).toLowerCase();
    const types = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
    response.writeHead(200, { "content-type": types[extension] || "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(resolved).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(APP_PORT, "127.0.0.1", () => resolve(server));
  });
}

async function closeServer(server) {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function sessionPage(browser, token, meta, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(({ sessionToken, sessionMeta }) => {
    sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: sessionToken, m: sessionMeta }));
  }, { sessionToken: token, sessionMeta: meta });
  const page = await context.newPage();
  await page.goto(APP_BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ sessionToken, sessionMeta }) => {
    sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: sessionToken, m: sessionMeta }));
    if (window.__psLive && window.__psLive.__testSetToken) {
      window.__psLive.__testSetToken(sessionToken, sessionMeta);
    }
  }, { sessionToken: token, sessionMeta: meta });
  await page.waitForFunction(() => window.__psLive && window.__psLive.hasSession && window.__psLive.hasSession());
  const [me, verified] = await Promise.all([
    page.waitForResponse((response) => {
      const parsed = new URL(response.url());
      return parsed.origin === API_BASE && parsed.pathname === "/operator/me";
    }),
    page.evaluate(() => window.__psLive.verifySession()),
  ]);
  assert.equal(me.status(), 200, "/operator/me session bootstrap failed");
  assert.equal(verified.ok, true, "/operator/me did not confirm the session");
  assert.equal(verified.property.id, meta.property_id, "/operator/me returned a different property scope");
  await page.evaluate(() => {
    document.body.classList.add("at-home");
    const home = document.getElementById("home");
    if (home) home.classList.remove("hidden");
    const workspace = document.getElementById("workspace");
    if (workspace) workspace.classList.add("hidden");
    if (typeof window.renderAskSpine === "function") window.renderAskSpine();
  });
  await page.locator("#askSpineIdleInput").waitFor({ state: "visible" });
  return { context, page };
}

async function submitQuestion(page, question) {
  const prior = Number(await page.locator("#askSpineMount .as-turn").last().getAttribute("data-as-turn").catch(() => 0) || 0);
  const responsePromise = page.waitForResponse((response) => {
    const parsed = new URL(response.url());
    return parsed.origin === API_BASE && parsed.pathname === "/operator/ask-spine/ask";
  });
  const idle = page.locator("#askSpineIdleInput");
  const input = await idle.isVisible().catch(() => false) ? idle : page.locator("#askSpineInput");
  await input.fill(question);
  await input.press("Enter");
  const response = await responsePromise;
  const request = response.request();
  const requestBody = request.postDataJSON();
  const responseBytes = await response.body();
  const responseBody = JSON.parse(responseBytes.toString("utf8"));
  const serverAddress = await response.serverAddr();
  assert.equal(request.method(), "POST");
  assert.deepEqual(requestBody, { question }, "browser request body is not question-only");
  const headers = request.headers();
  assert.ok(headers["x-staff-session"], "browser omitted x-staff-session");
  assert.equal(headers["x-operator-key"], undefined, "browser silently sent an operator key");
  assert.equal(serverAddress.port, Number(new URL(API_BASE).port), "Ask response came from the wrong server port");
  assert.deepEqual(Object.keys(responseBody).sort(), ["answer", "asked_at", "grounded_on", "outcome", "property_id", "references"].sort());
  await page.waitForFunction((priorId) => {
    const turns = document.querySelectorAll("#askSpineMount .as-turn");
    if (!turns.length) return false;
    const last = turns[turns.length - 1];
    return Number(last.getAttribute("data-as-turn") || 0) > priorId && Boolean(last.querySelector("[data-as]"));
  }, prior);
  const turn = page.locator("#askSpineMount .as-turn").last();
  await turn.locator(".as-answer").waitFor({ state: "visible" });
  assert.equal((await turn.locator(".as-answer").innerText()).trim(), responseBody.answer.trim(), "displayed answer differs from API response");
  assert.equal(await turn.locator("[data-as]").getAttribute("data-as"), responseBody.outcome, "displayed outcome differs from API response");
  return {
    response,
    request,
    requestBody,
    responseBody,
    response_sha256: sha256(responseBytes),
    response_bytes_utf8: responseBytes.toString("utf8"),
    server_address: serverAddress,
    turn,
  };
}

async function assertGroundingAndReferences(exchange) {
  const { responseBody, turn } = exchange;
  if (responseBody.grounded_on) {
    const serialized = JSON.stringify(responseBody.grounded_on);
    const visible = await turn.innerText();
    const readState = responseBody.grounded_on.read_state || responseBody.grounded_on.state ||
      responseBody.grounded_on.leasing_signing_read_state;
    if (readState) assert.ok(visible.includes(String(readState)), "grounded read state is not visible");
    assert.ok(serialized.length > 2, "grounding unexpectedly empty");
  }
  const supported = responseBody.references.filter((reference) => reference && reference.open && [
    "person", "application", "desk", "compliance_record", "compliance_source",
    "utility_evidence", "contracted_service_evidence",
  ].includes(reference.open.kind));
  const buttons = turn.locator(".as-reference");
  assert.equal(await buttons.count(), supported.length, "rendered reference count differs from server-supported response references");
  for (let i = 0; i < supported.length; i += 1) {
    const reference = supported[i];
    const button = buttons.nth(i);
    const dataset = await button.evaluate((node) => ({ ...node.dataset }));
    assert.equal(dataset.asKind, reference.open.kind, "reference kind was changed by the browser");
    const expectedTarget = ["compliance_record", "compliance_source"].includes(reference.open.kind)
      ? reference.open.token : reference.open.id;
    assert.equal(dataset.asTarget, expectedTarget, "reference target was changed by the browser");
    assert.ok((await button.innerText()).includes(reference.label), "reference label differs from the API response");
  }
}

async function renameLeaseApplications(pool, toHold) {
  if (toHold) {
    await pool.query("alter table lease_applications rename to lease_applications_dashboard_proof_hold");
  } else {
    await pool.query("alter table lease_applications_dashboard_proof_hold rename to lease_applications");
  }
}

async function run() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const frozen = assertFrozenSources();
  const health = await jsonFetch(`${API_BASE}/health`);
  assert.equal(health.body.build.commit_short, API_SHORT, "health is not the frozen API build");
    const pool = new Pool({ connectionString: DATABASE_URL, max: 3 });
  let appServer;
  let browser;
  let tableRenamed = false;
  const report = {
    app_base_sha: APP_BASE_SHA,
    api_sha: API_SHA,
    api_health: health.body,
    index: frozen,
    api_base: API_BASE,
    app_base: APP_BASE,
    wording: "fake/local composer wording; not a production-model claim",
    network_interception: false,
    assertions: [],
  };
  try {
    assert.doesNotMatch(
      fs.readFileSync(__filename, "utf8"),
      /\bpage\.route\s*\(/,
      "real-API proof must not install a Playwright route interceptor"
    );
    const databaseIdentity = (await pool.query(
      `select current_database() as database_name,
              (select max(version::int) from schema_migrations) as migration_ceiling`
    )).rows[0];
    assert.equal(databaseIdentity.database_name, databaseTarget.pathname.slice(1));
    assert.equal(Number(databaseIdentity.migration_ceiling), 192);
    report.database = databaseIdentity;
    const ctx = await fixtureContext(pool);
    const suffix = `${Date.now().toString(36)}-${crypto.randomBytes(2).toString("hex")}`;
    const signer = await createSignerStanding(ctx, suffix);
    const personal = await createPersonalReference(pool, ctx, signer, suffix);
    const unentitled = await createUnentitledSession(pool, ctx, suffix);
    const beforeMessages = Number((await pool.query("select count(*)::int as count from staff_agent_messages")).rows[0].count);

    appServer = await createAppServer(fs.readFileSync(INDEX_PATH));
    const executablePath = browserExecutable();
    assert.ok(executablePath, "no local Chromium-compatible browser is installed");
    browser = await chromium.launch({ headless: true, executablePath });

    const sessionMeta = { user_id: ctx.mike.id, property_id: ctx.property.id };
    const desktop = await sessionPage(browser, ctx.mikeToken, sessionMeta, { width: 1440, height: 1000 });
    const signerQuestion = "Which signer is still outstanding?";
    const signerExchange = await submitQuestion(desktop.page, signerQuestion);
    assert.equal(signerExchange.response.status(), 200);
    assert.equal(signerExchange.responseBody.property_id, ctx.property.id, "server property scope differs from session property");
    assert.equal(
      signerExchange.responseBody.outcome,
      "answered",
      `signer response was ${JSON.stringify(signerExchange.responseBody)}`
    );
    assert.match(signerExchange.responseBody.answer, new RegExp(signer.expectedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    await assertGroundingAndReferences(signerExchange);
    const priorAnswer = signerExchange.responseBody.answer;
    report.signer = {
      question: signerQuestion,
      request_body: signerExchange.requestBody,
      request_authority: {
        staff_session_header_present: true,
        operator_key_header_present: false,
        browser_property_claim_present: false,
        browser_module_claim_present: false,
      },
      server_address: signerExchange.server_address,
      response_sha256: signerExchange.response_sha256,
      response_bytes_utf8: signerExchange.response_bytes_utf8,
      response: signerExchange.responseBody,
      expected_seeded_name: signer.expectedName,
    };
    report.assertions.push("real staff session; question-only request; no operator key; server property scope; deterministic signer answer");

    const personalExchange = await submitQuestion(desktop.page, "What work is assigned to me?");
    assert.equal(personalExchange.responseBody.outcome, "answered");
    assert.ok(personalExchange.responseBody.answer.includes(personal.label));
    assert.ok(personalExchange.responseBody.references.length > 0, "personal answer did not expose a server reference");
    await assertGroundingAndReferences(personalExchange);
    report.personal_reference = personalExchange.responseBody;
    report.personal_reference_http = {
      server_address: personalExchange.server_address,
      response_sha256: personalExchange.response_sha256,
      response_bytes_utf8: personalExchange.response_bytes_utf8,
    };
    report.assertions.push("server-resolved reference kind/id rendered without a browser-composed URL");

    await desktop.page.screenshot({ path: path.join(ARTIFACT_DIR, "desktop-real-api.png"), fullPage: true });

    await renameLeaseApplications(pool, true);
    tableRenamed = true;
    const failedExchange = await submitQuestion(desktop.page, signerQuestion);
    assert.equal(failedExchange.responseBody.outcome, "unavailable");
    assert.equal(failedExchange.responseBody.grounded_on.leasing_signing_read_state, "READ_FAILED");
    const answersAfterFailure = await desktop.page.locator(".as-answer").allInnerTexts();
    assert.ok(answersAfterFailure.some((answer) => answer.trim() === priorAnswer.trim()), "prior successful answer disappeared after read failure");
    assert.ok(answersAfterFailure.some((answer) => answer.trim() === failedExchange.responseBody.answer.trim()), "new failure answer is not visibly distinct");
    await desktop.page.screenshot({ path: path.join(ARTIFACT_DIR, "failure-retains-prior-answer.png"), fullPage: true });
    report.read_failure = failedExchange.responseBody;
    report.read_failure_http = {
      server_address: failedExchange.server_address,
      response_sha256: failedExchange.response_sha256,
      response_bytes_utf8: failedExchange.response_bytes_utf8,
    };
    report.assertions.push("real canonical READ_FAILED response remains distinct while the prior answer stays visible");

    await renameLeaseApplications(pool, false);
    tableRenamed = false;
    const recoveredExchange = await submitQuestion(desktop.page, signerQuestion);
    assert.equal(recoveredExchange.responseBody.outcome, "answered");
    assert.equal(recoveredExchange.responseBody.answer, priorAnswer);
    assert.deepEqual(recoveredExchange.responseBody.grounded_on, signerExchange.responseBody.grounded_on);
    report.ask_again_after_reader_recovery = recoveredExchange.responseBody;

    const denied = await sessionPage(
      browser,
      unentitled.token,
      { user_id: unentitled.userId, property_id: ctx.property.id },
      { width: 1200, height: 850 }
    );
    const deniedExchange = await submitQuestion(denied.page, signerQuestion);
    assert.equal(deniedExchange.responseBody.outcome, "not_authorized");
    assert.equal(deniedExchange.responseBody.grounded_on, null);
    assert.deepEqual(deniedExchange.responseBody.references, []);
    assert.equal(deniedExchange.responseBody.property_id, ctx.property.id);
    report.unentitled = deniedExchange.responseBody;
    report.assertions.push("authenticated but leasing-unentitled session receives server-authored not_authorized with null grounding");
    await denied.page.screenshot({ path: path.join(ARTIFACT_DIR, "unentitled-real-api.png"), fullPage: true });
    await denied.context.close();

    const phone = await sessionPage(browser, ctx.mikeToken, sessionMeta, { width: 390, height: 844 });
    const phoneExchange = await submitQuestion(phone.page, signerQuestion);
    assert.equal(phoneExchange.responseBody.answer, priorAnswer);
    await phone.page.screenshot({ path: path.join(ARTIFACT_DIR, "phone-real-api.png"), fullPage: true });
    report.assertions.push("same real answer rendered in a 390x844 phone viewport");
    await phone.context.close();
    await desktop.context.close();

    const afterMessages = Number((await pool.query("select count(*)::int as count from staff_agent_messages")).rows[0].count);
    assert.equal(afterMessages, beforeMessages, "dashboard proof created conversation-retention rows");
    report.staff_agent_messages = { before: beforeMessages, after: afterMessages, retention_claim: false };
    report.not_run = [
      "governed conversational action confirmation/receipt: exact API route exposes no action envelope",
      "post-action ask-again state mutation: no supported Ask Spine writer was invented",
      "production Anthropic wording, Render, Neon, Twilio, carrier, deployment, and production data",
    ];
    fs.writeFileSync(path.join(ARTIFACT_DIR, "last-run.json"), `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    if (tableRenamed) await renameLeaseApplications(pool, false);
    if (browser) await browser.close();
    await closeServer(appServer);
    await pool.end();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
