"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawn, spawnSync } = require("node:child_process");
const { chromium } = require("playwright");

const APP_ROOT = __dirname;
const APP_BASE_SHA = process.env.PSPINE_REAL_APP_PRODUCT_SHA || "f290c332a36c31a95dfac09b9ad8356ba52e62b4";
const API_SHA = requiredEnv("PSPINE_REAL_API_SHA");
const API_SHORT = API_SHA.slice(0, 7);
const REQUIRED_APP_ANCESTORS = [
  "83e2b6763d85935d0113183216e321720c9e8f1b",
  "0cf7399e1bf883695de8e2767725d34c155d8312",
  "58f5a25a4c5ab28445694d9d8317ca2a6b2e86f2",
];
const API_ROOT = requiredEnv("PSPINE_REAL_API_ROOT");
const ADMIN_DATABASE_URL = requiredEnv("PSPINE_REAL_POSTGRES_ADMIN_URL");
const PSQL = requiredEnv("PSPINE_REAL_PSQL");
const API_BASE = process.env.PSPINE_REAL_API_BASE || "http://127.0.0.1:3317";
const APP_PORT = Number(process.env.PSPINE_REAL_APP_PORT || 5317);
const APP_BASE = `http://127.0.0.1:${APP_PORT}`;
const OPERATOR_KEY = process.env.PSPINE_REAL_API_OPERATOR_KEY || "e2e-key";
const RUN_ID = `${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${crypto.randomBytes(5).toString("hex")}`;
const DATABASE_NAME = `spine_dashboard_${RUN_ID.replace(/-/g, "_")}`;
const DATABASE_MARKER = `property-spine-dashboard-proof:${RUN_ID}`;
const ARTIFACT_DIR = path.join(APP_ROOT, "docs", "ask-spine-dashboard-real-api-proof");
const INDEX_PATH = path.join(APP_ROOT, "index.html");
const PRODUCTION_API_ORIGIN = "https://property-spine-api.onrender.com";
let DATABASE_URL = null;

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

const apiTarget = localUrl(API_BASE, "PSPINE_REAL_API_BASE");
const adminTarget = localUrl(ADMIN_DATABASE_URL, "PSPINE_REAL_POSTGRES_ADMIN_URL");
assert.equal(adminTarget.pathname, "/postgres", "admin URL must target the postgres maintenance database");
assert.ok(fs.existsSync(PSQL), "PSPINE_REAL_PSQL does not exist");

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

function databaseUrl(name) {
  const target = new URL(ADMIN_DATABASE_URL);
  target.pathname = `/${name}`;
  target.search = "";
  target.hash = "";
  return target.toString();
}

function runPsql(target, args, allowFailure = false) {
  const result = spawnSync(PSQL, [target, ...args], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(`psql failed (${result.status}): ${(result.stderr || result.stdout || "").trim()}`);
  }
  return result;
}

async function createOwnedDatabase(adminPool) {
  assert.match(DATABASE_NAME, /^spine_dashboard_[a-z0-9_]+$/);
  const before = await adminPool.query("select 1 from pg_database where datname=$1", [DATABASE_NAME]);
  assert.equal(before.rowCount, 0, `refusing pre-existing proof database ${DATABASE_NAME}`);
  await adminPool.query(`create database "${DATABASE_NAME}"`);
  try {
    await adminPool.query(`comment on database "${DATABASE_NAME}" is '${DATABASE_MARKER}'`);
  } catch (error) {
    await adminPool.query(`drop database "${DATABASE_NAME}" with (force)`);
    throw error;
  }
  DATABASE_URL = databaseUrl(DATABASE_NAME);
}

async function assertOwnedDatabase(adminPool) {
  const result = await adminPool.query(
    `select shobj_description(d.oid, 'pg_database') as marker
       from pg_database d where d.datname=$1`,
    [DATABASE_NAME]
  );
  assert.equal(result.rowCount, 1, "owned proof database disappeared");
  assert.equal(result.rows[0].marker, DATABASE_MARKER, "refusing database without this run's ownership marker");
}

async function dropOwnedDatabase(adminPool) {
  await assertOwnedDatabase(adminPool);
  await adminPool.query(`drop database "${DATABASE_NAME}" with (force)`);
  const after = await adminPool.query("select 1 from pg_database where datname=$1", [DATABASE_NAME]);
  assert.equal(after.rowCount, 0, "owned proof database survived drop");
}

async function applyMigrationsAndFixtures() {
  const migrationsRoot = path.join(API_ROOT, "migrations");
  runPsql(DATABASE_URL, ["-q", "-v", "ON_ERROR_STOP=1", "-f", path.join(migrationsRoot, "000_schema_migrations.sql")]);
  const ledger = new Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const files = fs.readdirSync(migrationsRoot)
      .filter((name) => /^\d{3}.*\.sql$/.test(name) && !name.startsWith("000_schema_migrations"))
      .sort();
    for (const name of files) {
      const version = name.slice(0, 3);
      const present = await ledger.query("select 1 from schema_migrations where version=$1", [version]);
      if (present.rowCount) continue;
      const precondition = path.join(API_ROOT, "tests", "e2e", "preconditions", `${version}.sql`);
      if (fs.existsSync(precondition)) {
        runPsql(DATABASE_URL, ["-q", "-v", "ON_ERROR_STOP=1", "-f", precondition]);
      }
      const migration = runPsql(
        DATABASE_URL,
        ["-q", "-v", "ON_ERROR_STOP=1", "-f", path.join(migrationsRoot, name)],
        true
      );
      if (migration.status !== 0) {
        const selfRecorded = await ledger.query("select 1 from schema_migrations where version=$1", [version]);
        if (!selfRecorded.rowCount) {
          throw new Error(`migration ${name} failed: ${(migration.stderr || migration.stdout || "").trim()}`);
        }
      } else {
        await ledger.query(
          "insert into schema_migrations(version,name) values($1,$2) on conflict do nothing",
          [version, name]
        );
      }
    }
  } finally {
    await ledger.end();
  }
  runPsql(DATABASE_URL, ["-q", "-v", "ON_ERROR_STOP=1", "-f", path.join(API_ROOT, "tests", "e2e", "property_fixture.sql")]);
  runPsql(DATABASE_URL, ["-q", "-v", "ON_ERROR_STOP=1", "-f", path.join(API_ROOT, "tests", "e2e", "fixtures.sql")]);
  const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    await pool.query(`create table dashboard_proof_run_identity (
      run_id text primary key,
      database_name text not null,
      created_at timestamptz not null default now()
    )`);
    await pool.query(
      "insert into dashboard_proof_run_identity(run_id,database_name) values($1,$2)",
      [RUN_ID, DATABASE_NAME]
    );
  } finally {
    await pool.end();
  }
}

async function assertPortAvailable(port, label) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error) => reject(new Error(`${label} port ${port} is unavailable: ${error.code || error.message}`)));
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}

function sanitizedApiEnvironment(propertyId, smsLog) {
  const env = { ...process.env };
  [
    "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER", "SENDGRID_API_KEY", "RESEND_API_KEY", "NEON_API_KEY",
  ].forEach((name) => delete env[name]);
  return {
    ...env,
    DATABASE_URL,
    OPERATOR_KEY,
    OPERATOR_APP_ORIGIN: APP_BASE,
    APP_BASE_URL: API_BASE,
    PUBLIC_APPLY_BASE_URL: API_BASE,
    SMS_SEND_MODE: "customer_care",
    EXECUTED_LEASE_INTAKE_ENABLED: "true",
    EXECUTED_LEASE_PROPERTY_IDS: propertyId,
    COMMITMENT_LEDGER_MODE: "enabled",
    ACTIVATION_PROPERTY_IDS: propertyId,
    APPLICATION_INTENT_PREPARE_ENABLED: "true",
    APPLICATION_INTENT_PROPERTY_IDS: propertyId,
    LEASING_INTAKE_SECRET: "e2e-intake",
    LEASING_INTAKE_PROPERTY_IDS: propertyId,
    E2E_SMS_LOG: smsLog,
    PORT: apiTarget.port,
  };
}

async function startApi(propertyId) {
  await assertPortAvailable(Number(apiTarget.port), "API");
  const smsLog = path.join(os.tmpdir(), `property-spine-dashboard-proof-${RUN_ID}-sms.log`);
  const output = [];
  const child = spawn(
    process.execPath,
    ["--require", path.join(API_ROOT, "tests", "e2e", "fake_sms_preload.js"), path.join(API_ROOT, "server.js")],
    {
      cwd: API_ROOT,
      env: sanitizedApiEnvironment(propertyId, smsLog),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }
  );
  child.stdout.on("data", (chunk) => output.push(chunk.toString()));
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));
  try {
    const deadline = Date.now() + 20000;
    let lastHealthError = null;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`exact API exited before health: ${output.join("").slice(-4000)}`);
      }
      try {
        const health = await jsonFetch(`${API_BASE}/health`);
        assert.equal(health.body.build.commit_short, API_SHORT, "health is not the frozen API build");
        return { child, health: health.body, output, smsLog };
      } catch (error) {
        lastHealthError = error;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    throw new Error(
      `exact API did not become healthy; last health error: ${lastHealthError && lastHealthError.message}; ` +
      `process output: ${output.join("").slice(-4000)}`
    );
  } catch (error) {
    if (child.exitCode === null) child.kill();
    try { fs.rmSync(smsLog, { force: true }); } catch (_) { }
    throw error;
  }
}

async function stopApi(apiProcess) {
  if (!apiProcess || apiProcess.child.exitCode !== null || apiProcess.child.signalCode !== null) return;
  const exited = new Promise((resolve) => apiProcess.child.once("exit", resolve));
  apiProcess.child.kill();
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 10000))]);
  if (apiProcess.child.exitCode === null && apiProcess.child.signalCode === null) {
    apiProcess.child.kill("SIGKILL");
    await exited;
  }
}

function assertFrozenSources() {
  assert.equal(git(["rev-parse", "HEAD"], API_ROOT), API_SHA, "API checkout is not the frozen candidate");
  assert.equal(git(["status", "--porcelain", "--untracked-files=no"], API_ROOT), "", "API tracked worktree is dirty");
  const safeApp = `safe.directory=${APP_ROOT.replace(/\\/g, "/")}`;
  for (const ancestor of REQUIRED_APP_ANCESTORS) {
    execFileSync("git", ["-c", safeApp, "-C", APP_ROOT, "merge-base", "--is-ancestor", ancestor, "HEAD"]);
  }
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
  let adminPool;
  let pool;
  let apiProcess;
  let appServer;
  let browser;
  let tableRenamed = false;
  let databaseCreated = false;
  let apiStopped = true;
  let proofError = null;
  const cleanupErrors = [];
  const report = {
    app_base_sha: APP_BASE_SHA,
    api_sha: API_SHA,
    index: frozen,
    api_base: API_BASE,
    app_base: APP_BASE,
    run_id: RUN_ID,
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
    adminPool = new Pool({ connectionString: ADMIN_DATABASE_URL, max: 1 });
    await createOwnedDatabase(adminPool);
    databaseCreated = true;
    await applyMigrationsAndFixtures();
    pool = new Pool({ connectionString: DATABASE_URL, max: 3 });
    const databaseIdentity = (await pool.query(
      `select current_database() as database_name,
              (select max(version::int) from schema_migrations) as migration_ceiling`
    )).rows[0];
    assert.equal(databaseIdentity.database_name, DATABASE_NAME);
    assert.equal(Number(databaseIdentity.migration_ceiling), 192);
    const identity = await pool.query(
      "select run_id,database_name from dashboard_proof_run_identity"
    );
    assert.deepEqual(identity.rows, [{ run_id: RUN_ID, database_name: DATABASE_NAME }]);
    const ctx = await fixtureContext(pool);
    const initialCounts = (await pool.query(
      `select
         (select count(*)::int from lease_applications where property_id=$1) as applications,
         (select count(*)::int from obligations where property_id=$1) as obligations`,
      [ctx.property.id]
    )).rows[0];
    assert.deepEqual(initialCounts, { applications: 0, obligations: 0 }, "fresh proof fixture is not empty");
    report.database = {
      ...databaseIdentity,
      run_id: RUN_ID,
      ownership_marker: DATABASE_MARKER,
      existed_before: false,
      initial_counts: initialCounts,
      created: true,
      dropped: false,
    };
    apiProcess = await startApi(ctx.property.id);
    report.api_health = apiProcess.health;
    const suffix = `${Date.now().toString(36)}-${crypto.randomBytes(2).toString("hex")}`;
    const signer = await createSignerStanding(ctx, suffix);
    const afterSignerCounts = (await pool.query(
      `select
         (select count(*)::int from lease_applications where property_id=$1) as applications,
         (select count(*)::int from obligations where property_id=$1) as obligations`,
      [ctx.property.id]
    )).rows[0];
    assert.equal(afterSignerCounts.applications, 1, "signer lifecycle did not create exactly one application");
    const personal = await createPersonalReference(pool, ctx, signer, suffix);
    const unentitled = await createUnentitledSession(pool, ctx, suffix);
    const createdCounts = (await pool.query(
      `select
         (select count(*)::int from lease_applications where property_id=$1) as applications,
         (select count(*)::int from obligations where property_id=$1) as obligations`,
      [ctx.property.id]
    )).rows[0];
    assert.equal(createdCounts.applications, 1, "proof created an unexpected application set");
    assert.equal(
      createdCounts.obligations,
      afterSignerCounts.obligations + 1,
      "personal fixture did not add exactly one obligation to the clean lifecycle state"
    );
    report.database.after_signer_counts = afterSignerCounts;
    report.database.final_created_counts = createdCounts;
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
    const expectedSignerAnswer = `1 application is waiting on signature: ${signer.expectedName}'s lease — ` +
      `${signer.expectedName} (resident).`;
    assert.equal(signerExchange.responseBody.answer, expectedSignerAnswer, "signer answer contains a stale or unexpected signer set");
    assert.deepEqual(signerExchange.responseBody.grounded_on, {
      leasing_signing_read_state: "OK",
      applications_waiting_on_signature_count: 1,
      outstanding_signer_count: 1,
    });
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
      expected_outstanding_signer_set: [signer.expectedName],
      exact_set_match: true,
    };
    report.assertions.push("real staff session; question-only request; no operator key; server property scope; deterministic signer answer");

    const personalExchange = await submitQuestion(desktop.page, "What work is assigned to me?");
    assert.equal(personalExchange.responseBody.outcome, "answered");
    assert.ok(personalExchange.responseBody.answer.includes(personal.label));
    const expectedPersonalReferences = (await pool.query(
      `select label, person_id
         from obligations
        where property_id=$1 and assigned_user_id=$2 and status='open' and person_id is not null
        order by label`,
      [ctx.property.id, ctx.mike.id]
    )).rows.map((row) => ({ label: row.label, kind: "person", id: row.person_id }));
    const actualPersonalReferences = personalExchange.responseBody.references
      .map((reference) => ({
        label: reference.label,
        kind: reference.open && reference.open.kind,
        id: reference.open && reference.open.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    assert.deepEqual(actualPersonalReferences, expectedPersonalReferences, "personal response reference set differs from fresh canonical rows");
    assert.ok(
      actualPersonalReferences.some((reference) =>
        reference.label === personal.label && reference.kind === "person" && reference.id === signer.personId),
      "current run's personal reference is missing"
    );
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
  } catch (error) {
    proofError = error;
  } finally {
    if (tableRenamed && pool) {
      try { await renameLeaseApplications(pool, false); } catch (error) { cleanupErrors.push(`table restore: ${error.message}`); }
    }
    if (browser) {
      try { await browser.close(); } catch (error) { cleanupErrors.push(`browser close: ${error.message}`); }
    }
    try { await closeServer(appServer); } catch (error) { cleanupErrors.push(`app server close: ${error.message}`); }
    if (pool) {
      try { await pool.end(); } catch (error) { cleanupErrors.push(`database pool close: ${error.message}`); }
    }
    if (apiProcess) {
      apiStopped = false;
      try {
        await stopApi(apiProcess);
        await assertPortAvailable(Number(apiTarget.port), "stopped API");
        apiStopped = true;
      } catch (error) { cleanupErrors.push(`API stop: ${error.message}`); }
      const smsBytes = fs.existsSync(apiProcess.smsLog) ? fs.statSync(apiProcess.smsLog).size : 0;
      const smsLines = fs.existsSync(apiProcess.smsLog)
        ? fs.readFileSync(apiProcess.smsLog, "utf8").split(/\r?\n/).filter(Boolean).length : 0;
      report.fake_sms_transport = { bytes: smsBytes, lines: smsLines, removed: false };
      try {
        fs.rmSync(apiProcess.smsLog, { force: true });
        report.fake_sms_transport.removed = !fs.existsSync(apiProcess.smsLog);
      } catch (error) {
        cleanupErrors.push(`fake SMS log remove: ${error.message}`);
      }
    }
    if (databaseCreated && adminPool) {
      try {
        await dropOwnedDatabase(adminPool);
        if (report.database) report.database.dropped = true;
      } catch (error) {
        cleanupErrors.push(`owned database drop: ${error.message}`);
      }
    }
    if (adminPool) {
      try { await adminPool.end(); } catch (error) { cleanupErrors.push(`admin pool close: ${error.message}`); }
    }
    report.lifecycle = {
      api_stopped: apiStopped,
      app_server_stopped: true,
      browser_stopped: true,
      database_connections_closed: true,
      owned_database_dropped: Boolean(report.database && report.database.dropped),
      cleanup_errors: cleanupErrors,
    };
  }
  if (cleanupErrors.length) {
    const cleanupError = new Error(`proof cleanup failed: ${cleanupErrors.join("; ")}`);
    if (!proofError) proofError = cleanupError;
    else proofError.message += `; ${cleanupError.message}`;
  }
  if (proofError) throw proofError;
  fs.writeFileSync(path.join(ARTIFACT_DIR, "last-run.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
