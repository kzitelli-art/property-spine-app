// ════════════════════════════════════════════════════════════════════
//  WORK-ORDER LIFECYCLE VISIBILITY — REAL-BROWSER PROOF.
//
//  Real Chromium · real HTTP to a real Express API · real PostgreSQL ·
//  a real staff session minted by the canonical session service.
//
//  ── WHAT IT DRIVES ──────────────────────────────────────────────────
//  The technician lifecycle is played through the ACTUAL inbound-SMS route
//  first — accept, on my way, no access, finding, claim, photo, completion
//  — and then the operator surface is loaded in a browser and asserted
//  against what those messages actually wrote. Nothing is seeded directly
//  into the projection, because a projection seeded by the harness proves
//  the harness.
//
//  ── THE FIVE SCREENSHOTS ────────────────────────────────────────────
//    1  accepted / in progress
//    2  blocked with next action
//    3  completion refused for missing proof
//    4  completed with stored proof
//    5  resident delivery failure
//
//  ── SAFETY ──────────────────────────────────────────────────────────
//  HARNESS_DATABASE_URL only. Scratch database created and dropped. No
//  transport and no media fetch leave the process; every number is in the
//  reserved +1 (212) 555-01xx range.
// ════════════════════════════════════════════════════════════════════
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const API = process.env.API_DIR || "/home/user/property-spine-api";
const APP = __dirname;
const OUT = process.env.SP || "/tmp/wl_proof";
//  Playwright resolves from whichever repo has it; the browser binary comes
//  from PLAYWRIGHT_BROWSERS_PATH and is never downloaded.
const { chromium } = require(path.join(API, "node_modules/playwright"));
const { Client } = require(path.join(API, "node_modules/pg"));
const express = require(path.join(API, "node_modules/express"));
const receipt = require(path.join(API, "tests/_run_receipt.js"));

const HARNESS = __filename;
const EXPECTED = 144;
let passed = 0, failed = 0;
const ok = (label, cond, detail) => {
  if (cond) { passed++; console.log("  ok    " + label); }
  else { failed++; console.log("  FAIL  " + label + (detail ? "  →  " + detail : "")); }
};
const section = (t) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 56 - t.length))}`);

//  THE SENTINEL. The inbound route acks the provider and swallows failures by
//  design, so a query that THROWS looks identical to a clean refusal. Any
//  schema error anywhere invalidates the whole run.
let sawFatalDbError = null;
const realError = console.error;
console.error = (...a) => {
  const m = a.map(String).join(" ");
  if (/does not exist|42P01|42703|syntax error/i.test(m)) sawFatalDbError = sawFatalDbError || m;
  if (process.env.HARNESS_VERBOSE) realError(...a);
};

const ADMIN_URL = receipt.harnessConnectionString();
const SCRATCH = `ps_wl_browser_${process.pid}`;
const mig = (n) => fs.readFileSync(path.join(API, "migrations", n), "utf8");
fs.mkdirSync(OUT, { recursive: true });

receipt.begin(HARNESS, { url: ADMIN_URL, expected: EXPECTED });

let admin = null, db = null, apiServer = null, appServer = null, realAppServer = null, browser = null, code = 1;
const shots = [];
(async () => {
try {
  admin = new Client({ connectionString: ADMIN_URL, ssl: { rejectUnauthorized: false } });
  await admin.connect();
  await admin.query(`drop database if exists ${SCRATCH}`);
  await admin.query(`create database ${SCRATCH}`);
  const u = new URL(ADMIN_URL); u.pathname = "/" + SCRATCH;
  db = new Client({ connectionString: u.toString(), ssl: { rejectUnauthorized: false } });
  await db.connect();

  await db.query(fs.readFileSync(path.join(API, "tests/_ops_scoped_schema.sql"), "utf8"));
  await db.query(`
    alter table work_orders add column if not exists unit_id uuid references units(id);
    alter table work_orders add column if not exists not_done_reason text;
    alter table work_orders add column if not exists completion_note text;
    alter table work_orders add column if not exists affected_person_id uuid references persons(id);
    alter table work_orders add column if not exists reported_by_person_id uuid references persons(id);
    alter table work_orders add column if not exists is_emergency boolean not null default false;
    alter table work_orders add column if not exists urgency_status text;
    alter table work_orders add column if not exists updated_at timestamptz not null default now();
    alter table obligations add column if not exists completed_at timestamptz;
    alter table obligations add column if not exists resolution_code text;
    alter table properties add column if not exists operating_timezone text default 'America/New_York';
    create table if not exists staff_sessions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      property_id uuid not null references properties(id) on delete cascade,
      token text not null unique,
      issued_at timestamptz not null default now(),
      expires_at timestamptz not null,
      revoked_at timestamptz,
      last_seen_at timestamptz);
  `);
  for (const n of ["130_communication_lines.sql", "131_work_acceptance.sql",
                   "132_outbound_line_policy.sql", "133_work_order_reference.sql",
                   "134_technician_lifecycle.sql", "135_delivery_attempts.sql",
                   "136_one_resident_update_per_cause.sql"]) await db.query(mig(n));

  //  DEFECT FIXED: without this, every resident send was refused by the
  //  eligibility gate (mode_disabled) and the surface showed FAILED for all
  //  of them. The "delivery failed is shown as failed" assertion then passed
  //  for entirely the wrong reason. The gate is real and must be SATISFIED,
  //  not bypassed — so the mode is set and the consent fixtures below are
  //  what make the sends legitimate.
  process.env.SMS_SEND_MODE = "customer_care";

  const shim = { query: (...a) => db.query(...a),
                 connect: async () => ({ query: (...a) => db.query(...a), release: () => {} }) };

  // ── FIXTURES ───────────────────────────────────────────────────────
  const OPS = "+12125550120", PROP_LINE = "+12125550121";
  const DANA = "+12125550131", RES_PHONE = "+12125550141";
  const one = async (q, a = []) => (await db.query(q, a)).rows[0];
  const org = (await one(`insert into organizations (name,slug) values ('Org','o') returning id`)).id;
  const prop = (await one(`insert into properties (name,organization_id) values ('Maple Court',$1) returning id`, [org])).id;
  const dana = (await one(`insert into users (name,email,phone) values ('Dana Reyes','d@h.test',$1) returning id`, [DANA])).id;
  const resident = (await one(`insert into persons (property_id,name,primary_phone_e164) values ($1,'Ana',$2) returning id`, [prop, RES_PHONE])).id;
  const u302 = (await one(`insert into units (property_id,unit_number) values ($1,'302') returning id`, [prop])).id;
  await db.query(`insert into property_team_assignments (property_id,user_id) values ($1,$2)`, [prop, dana]);
  await db.query(`insert into contact_preferences (person_id,channel,consent_state,source) values ($1,'text','opted_in','harness')`, [resident]);
  await db.query(`insert into person_property_classifications (person_id,property_id,record_class,classification_source) values ($1,$2,'production','operator')`, [resident, prop]);
  await db.query(`insert into leases (property_id,unit_id,tenant_ids,lease_status) values ($1,$2,array[$3::uuid],'active')`, [prop, u302, resident]);
  await db.query(`insert into communication_lines (e164,line_type,organization_id,authority_ceiling,permitted_audience,inbound_enabled,outbound_enabled,outbound_policy,status)
                  values ($1,'operations',$2,'operational','staff',true,true,'reply_only','active')`, [OPS, org]);
  await db.query(`insert into communication_lines (e164,line_type,property_id,authority_ceiling,permitted_audience,inbound_enabled,outbound_enabled,outbound_policy,status)
                  values ($1,'property_facing',$2,'external','residents_and_prospects',true,true,'proactive','active')`, [PROP_LINE, prop]);

  const wo = await one(`insert into work_orders (property_id,unit_id,title,affected_person_id) values ($1,$2,'sink leak',$3) returning id, work_order_ref`, [prop, u302, resident]);
  await db.query(`insert into obligations (property_id,related_id,related_type,type,label,assigned_user_id,status)
                  values ($1,$2,'work_order','maintenance_repair','Repair',$3,'open')`, [prop, wo.id, dana]);
  //  A real queue. Density is measured in the browser, so there has to be
  //  enough work to measure — five rows cannot be proven with two rows.
  const wo2 = await one(`insert into work_orders (property_id,title) values ($1,'lobby light out') returning id`, [prop]);
  const extra = [];
  //  DELIBERATELY UNASSIGNED. Assigning these to Dana made her bare "Got it."
  //  ambiguous — six authorized items — so the resolver correctly asked instead
  //  of accepting, and every lifecycle assertion below failed. The fixture was
  //  wrong, not the product.
  for (const [t, unit, accept] of [["dishwasher leak", "106", false], ["closet door off track", "233", false],
                                   ["garbage disposal jam", "511", false], ["window latch", "118", false],
                                   ["hallway light flickering", null, false]]) {
    // eslint-disable-next-line no-await-in-loop
    const uid = unit ? (await one(`insert into units (property_id,unit_number) values ($1,$2) returning id`, [prop, unit])).id : null;
    // eslint-disable-next-line no-await-in-loop
    const w = await one(`insert into work_orders (property_id,unit_id,title) values ($1,$2,$3) returning id`, [prop, uid, t]);
    // eslint-disable-next-line no-await-in-loop
    await db.query(`insert into obligations (property_id,related_id,related_type,type,label,assigned_user_id,status,
                      accepted_by_user_id, accepted_at, ownership_origin)
                    values ($1,$2,'work_order','maintenance_repair','Repair',$3,$4,$5,$6,$7)`,
      [prop, w.id, null, accept ? "in_progress" : "open", accept ? dana : null,
       accept ? new Date(Date.now() - 3600e3) : null, accept ? "accepted_by_owner" : null]);
    extra.push(w.id);
  }

  //  A REAL staff session token, minted the way the app does.
  const token = "wlproof_" + Math.abs(process.pid) + "_tok";
  await db.query(`insert into staff_sessions (user_id, property_id, token, expires_at)
                  values ($1,$2,$3, now() + interval '2 hours')`, [dana, prop, token]);

  // ── THE API ────────────────────────────────────────────────────────
  const sent = [];
  let mediaMode = "ok", residentTransport = "ok";
  const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
  const smsDouble = {
    enabled: () => true, validateWebhook: () => true,
    sendSms: async ({ to, from, body }) => {
      sent.push({ to, from, body });
      if (from === PROP_LINE && residentTransport === "fail") return { sent: false, reason: "undelivered" };
      return { sent: true, status: "queued", sid: `SM_HARNESS_NEVER_REAL_${sent.length}` };
    },
    fetchMedia: async () => (mediaMode === "ok" ? { ok: true, buffer: PNG, mime: "image/png" }
                                               : { ok: false, reason: "carrier_403" }),
  };
  const commBoundary = require(path.join(API, "src/comms/communications_boundary.js"))({ pool: shim, sms: smsDouble });
  const api = express();
  api.use((req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  api.use(express.json());
  api.use("/", require(path.join(API, "src/comms/tenantlink.js"))({
    pool: shim, anthropic: null, INGEST_MODEL: "harness", sms: smsDouble, commBoundary,
    workOrderService: { createWorkOrder: async () => { throw new Error("unused"); },
                        appendClarification: async () => { throw new Error("unused"); } },
    getAgentService: () => null,
  }));

  //  The operator gate, minimal and REAL: the session token decides the
  //  property, and a client-supplied property_id is refused. This mirrors
  //  requireOperator + refuseClientProperty rather than bypassing them.
  const statusRead = require(path.join(API, "src/surfaces/work_order_status_read.js"));
  let readFails = false;
  const gate = async (req, res, next) => {
    const t = req.get("x-staff-session") || "";
    const s = (await db.query(
      `select ss.user_id, ss.property_id from staff_sessions ss
        where ss.token = $1 and ss.revoked_at is null and ss.expires_at > now()`, [t])).rows[0];
    if (!s) return res.status(401).json({ error: "No valid operator session. Sign in." });
    if (req.query.property_id) return res.status(400).json({ error: "property_id is not a client parameter" });
    req.operator = s; next();
  };
  api.get("/operator/work-orders/status", gate, async (req, res) => {
    try {
      if (readFails) throw new Error("simulated live read failure");
      const rows = await statusRead.readPropertyWorkOrderStatuses(shim, { propertyId: req.operator.property_id });
      res.json({ property_id: req.operator.property_id, count: rows.length, work_orders: rows });
    } catch (e) { res.status(503).json({ error: "unavailable", detail: "The live work-order read is unavailable. Retry." }); }
  });
  //  THE FOUR WRITES, through the REAL services. Same commit-then-send
  //  ordering as the app route.
  const actions = require(path.join(API, "src/technician/operator_actions.js"));
  const runAction = async (req, res, fn) => {
    const c = { query: (...a) => db.query(...a), release: () => {} };
    let out;
    try {
      await db.query("begin");
      out = await fn(c, { propertyId: req.operator.property_id, operatorUserId: req.operator.user_id });
      await db.query("commit");
    } catch (e) {
      await db.query("rollback").catch(() => {});
      return res.status(e.code === "NOT_FOUND" ? 404 : e.code === "BAD_INPUT" ? 400 : 500)
        .json({ error: e.code || "action_failed", detail: e.message });
    }
    if (out.outcome === "refused") {
      return res.status(409).json({ outcome: "refused", refusal: out.refusal,
        receipt: { text: "That can't be done right now.", reason: out.refusal } });
    }
    let delivery = null;
    if (out.sendSpec && out.commEventId) {
      const sp = out.sendSpec; let wire;
      try {
        wire = sp.kind === "operations_reply"
          ? await commBoundary.sendOperationsReply({ organization_id: sp.organization_id,
              recipient: sp.recipient, body: sp.body, replyToCommEventId: sp.replyToCommEventId,
              eventId: out.commEventId })
          : await commBoundary.sendPropertySms({ property_id: sp.property_id, recipient: sp.recipient,
              body: sp.body, purpose: "work_order_update", person_id: sp.person_id, eventId: out.commEventId });
      } catch (e) { wire = { sent: false, reason: `transport_threw: ${e.message}`, sid: null }; }
      if (out.attemptNo) await actions.recordAttemptResult(shim, { commEventId: out.commEventId,
        attemptNo: out.attemptNo, sent: wire.sent, providerRef: wire.sid || null, failureReason: wire.reason });
      delivery = { state: wire.sent ? "sent" : "failed", provider_ref: wire.sid || null,
                   reason: wire.sent ? null : wire.reason };
    }
    res.json({ outcome: out.outcome, receipt: out.receipt, delivery });
  };
  api.get("/operator/work-orders/technicians", gate, async (req, res) =>
    res.json({ technicians: await actions.eligibleTechnicians(shim, { propertyId: req.operator.property_id }) }));

  //  ── WHAT THE REAL SHELL NEEDS TO BOOT ────────────────────────────
  //  The navigation section drives the DEPLOYED index.html, not a host page
  //  authored here, so the shell's own boot reads have to be answered. Both
  //  are real DB reads behind the same session gate — the shell is never
  //  handed a fixture to get itself to the Maintenance desk.
  api.get("/operator/me", gate, async (req, res) => {
    const u = (await db.query(`select u.id, u.name, p.name as property_name
                                 from users u, properties p
                                where u.id = $1 and p.id = $2`,
      [req.operator.user_id, req.operator.property_id])).rows[0] || {};
    res.json({ id: req.operator.user_id, name: u.name || null, role: "property_manager",
               property_id: req.operator.property_id, property_name: u.property_name || null,
               allowed_modules: ["maintenance", "leasing", "management", "reporting"],
               platform_role: "member" });
  });
  api.get("/operator/obligations", gate, async (req, res) => {
    const rows = (await db.query(
      `select id, property_id, related_id, related_type, type, label, status, assigned_user_id
         from obligations where property_id = $1 and status = 'open' order by created_at`,
      [req.operator.property_id])).rows;
    res.json({ obligations: rows });
  });
  api.post("/operator/work-orders/:id/assign", gate, (req, res) => runAction(req, res, (c, ctx) =>
    actions.assignWork(c, Object.assign({ workOrderId: req.params.id,
      technicianUserId: (req.body || {}).technician_user_id }, ctx))));
  api.post("/operator/work-orders/:id/ask-photo", gate, (req, res) => runAction(req, res, (c, ctx) =>
    actions.askForPhoto(c, Object.assign({ workOrderId: req.params.id }, ctx))));
  api.post("/operator/work-orders/:id/coordinate-entry", gate, (req, res) => runAction(req, res, (c, ctx) =>
    actions.coordinateEntry(c, Object.assign({ workOrderId: req.params.id }, ctx))));
  api.post("/operator/work-orders/:id/retry-resident", gate, (req, res) => runAction(req, res, (c, ctx) =>
    actions.prepareRetry(c, Object.assign({ commEventId: (req.body || {}).comm_event_id }, ctx))));

  api.get("/operator/work-orders/:id/status", gate, async (req, res) => {
    try {
      if (readFails) throw new Error("simulated live read failure");
      const s = await statusRead.readWorkOrderStatus(shim, { propertyId: req.operator.property_id, workOrderId: req.params.id });
      if (!s) return res.status(404).json({ error: "not_found" });
      res.json(s);
    } catch (e) { res.status(503).json({ error: "unavailable", detail: "The live work-order read is unavailable. Retry." }); }
  });
  apiServer = api.listen(0);
  const apiPort = apiServer.address().port;

  // ── DRIVE THE TECHNICIAN LIFECYCLE THROUGH THE REAL ROUTE ──────────
  let seq = 0;
  const text = (body, media = []) => new Promise((resolve, reject) => {
    const p = { MessageSid: `SM_B_${++seq}`, From: DANA, To: OPS, Body: body, NumMedia: String(media.length) };
    media.forEach((m, i) => { p[`MediaUrl${i}`] = m.url; p[`MediaContentType${i}`] = m.mime; });
    const payload = new URLSearchParams(p).toString();
    const r = http.request({ host: "127.0.0.1", port: apiPort, path: "/communications/inbound-sms", method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "content-length": Buffer.byteLength(payload) } },
      (res) => { res.on("data", () => {}); res.on("end", resolve); });
    r.on("error", reject); r.write(payload); r.end();
  });
  const settle = () => new Promise((r) => setTimeout(r, 160));

  // ── THE APP, SERVED ────────────────────────────────────────────────
  const appSrv = express();
  //  The host page carries the app's OWN stylesheet, lifted from index.html,
  //  plus the real door file from disk. Nothing about the presentation is
  //  authored here — that was the defect that produced a QA console.
  const APP_HTML = fs.readFileSync(path.join(APP, "index.html"), "utf8");
  const APP_CSS = (APP_HTML.match(/<style>([\s\S]*?)<\/style>/g) || [])
    .map((b) => b.replace(/<\/?style>/g, "")).join("\n");

  appSrv.get("/", (_req, res) => {
    res.type("html").send(`<!doctype html><meta charset="utf-8"><title>Work Orders</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${APP_CSS}</style>
<body class="mgmt-home">
<div class="wrap">
  <header class="appbar"><span class="appbar-deal">Maple Court</span></header>
  <main id="workspace" class="workspace"><section class="hero"><div id="intelStrip" class="intel"></div></section></main>
</div>
<script>
window.__psLive = {
  //  THE REAL ENVELOPE. index.html's loader returns { data, meta } from every
  //  read and every write. A stub that returned bare JSON let the door read
  //  the envelope as the payload and still pass here, while rendering an
  //  empty queue in the deployed app. The stub speaks the real contract now.
  hasSession: function(){ return true; },
  _get: async function(p){
    var r = await fetch("http://127.0.0.1:${apiPort}" + p, { headers: { "x-staff-session": "${token}" } });
    if (!r.ok) { var j = await r.json().catch(function(){return{};}); throw new Error(j.detail || ("HTTP " + r.status)); }
    return { data: await r.json(), meta: { source: "live" } };
  },
  workOrderLifecycleList: function(){ return this._get("/operator/work-orders/status"); },
  workOrderLifecycle: function(p){ return this._get("/operator/work-orders/" + p.workOrderId + "/status"); },
  workOrderTechnicians: function(){ return this._get("/operator/work-orders/technicians"); },
  _post: async function(p, b){
    var r = await fetch("http://127.0.0.1:${apiPort}" + p, { method: "POST",
      headers: { "x-staff-session": "${token}", "content-type": "application/json" },
      body: JSON.stringify(b || {}) });
    var j = await r.json().catch(function(){return{};});
    if (!r.ok) { var e = new Error(j.detail || (j.receipt && j.receipt.text) || ("HTTP " + r.status)); e.detail = j.detail || (j.receipt && j.receipt.text); e.body = j; throw e; }
    return { data: j, meta: { source: "live" } };
  },
  workOrderAssign: function(p){ return this._post("/operator/work-orders/" + p.workOrderId + "/assign", p); },
  workOrderAskPhoto: function(p){ return this._post("/operator/work-orders/" + p.workOrderId + "/ask-photo", p); },
  workOrderCoordinateEntry: function(p){ return this._post("/operator/work-orders/" + p.workOrderId + "/coordinate-entry", p); },
  workOrderRetryResident: function(p){ return this._post("/operator/work-orders/" + p.workOrderId + "/retry-resident", p); }
};
function openDesk(){}
</script>
<script src="/work-lifecycle-door.js"></script>`);
  });
  appSrv.get("/work-lifecycle-door.js", (_req, res) =>
    res.type("application/javascript").send(fs.readFileSync(path.join(APP, "work-lifecycle-door.js"), "utf8")));
  appServer = appSrv.listen(0);
  const appPort = appServer.address().port;

  //  ── THE DEPLOYED APP, SERVED WHOLE ─────────────────────────────────
  //  Section 9c drives the shipped index.html and every script it loads,
  //  straight off disk. Nothing is stubbed, substituted or authored: the
  //  operator's real path can only be proven by walking the real shell.
  realAppServer = express().use(express.static(APP)).listen(0);
  const realAppPort = realAppServer.address().port;

  //  The pre-installed Chromium, named explicitly. The playwright client
  //  version here expects a different build number than the image ships, so
  //  the executable is pointed at rather than downloaded — downloading a
  //  browser is exactly what this environment forbids.
  const CHROME = process.env.PS_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  if (!fs.existsSync(CHROME)) {
    throw new Error(`no Chromium at ${CHROME} — set PS_CHROME to the browser binary`);
  }
  browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
  const shot = async (name) => {
    const f = path.join(OUT, name + ".png");
    await page.screenshot({ path: f, fullPage: true });
    shots.push(f); return f;
  };
  const open = async (detail) => {
    await page.goto(`http://127.0.0.1:${appPort}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.__psWorkOrders.open());
    await page.waitForSelector('.wo-row, [data-wo-empty], [data-wo-unavailable]', { timeout: 5000 });
    if (detail) {
      await page.evaluate((id) => window.__psWorkOrders.loadDetail(id), detail);
      await page.waitForSelector('.wo-d-cur, [data-wo-unavailable]', { timeout: 5000 });
    }
  };
  const bodyText = () => page.evaluate(() => document.body.textContent.replace(/\s+/g, " "));

  // ════════════════════════════════════════════════════════════════════
  //  THE ACCEPTANCE BAR. Every assertion below is one of the owner's, in
  //  order, driven through the real door in a real browser.
  // ════════════════════════════════════════════════════════════════════
  const rowsIn = (b) => page.$$eval(`[data-band="${b}"] .wo-row`, (e) => e.length).catch(() => 0);

  section("1. THE LIFECYCLE, THROUGH THE REAL SMS ROUTE");
  await text("Got it."); await settle();
  await text("I'm heading over."); await settle();
  await open(null);
  {
    ok("acceptance and travel appear with no manual refresh and no second entry",
      /Dana is on the way|Dana accepted/.test(await bodyText()));
    ok("the queue is one list, not a set of cards",
      (await page.$$(".wo-body > .wo-sec")).length >= 1 && (await page.$$(".wl-item")).length === 0);
  }

  if (process.env.HARNESS_DEBUG) {
    realError("DEBUG innerText:", JSON.stringify((await bodyText()).slice(0, 400)));
    realError("DEBUG host html len:", await page.evaluate(() => (document.getElementById("workOrdersBody") || {}).innerHTML?.length || -1));
    realError("DEBUG rows:", (await page.$$(".wo-row")).length);
    realError("DEBUG rect:", JSON.stringify(await page.evaluate(() => {
      const r = document.querySelector(".wo-row"); if (!r) return null;
      const b = r.getBoundingClientRect(); return { w: b.width, h: b.height, top: b.top };
    })));
  }

  section("2. NO ACCESS → THE RESIDENT IS ASKED, ONCE");
  await text("Couldn't get in."); await settle();
  await open(null);
  {
    const t = await bodyText();
    //  RULING 2026-08-05. Reporting no access already texted the resident,
    //  so the row reports that. It previously said "Entry could not be
    //  completed" and offered "Coordinate entry" — an invitation to send
    //  the sentence the system had already sent.
    ok("the row states the operating fact, not a status word",
      /Asked resident at .* · waiting for reply/.test(t), t.slice(0, 240));
    ok("...and offers no verb, because there is nothing left to send",
      !(await page.$(`.wo-row[data-wo="${wo.id}"] .wo-act`)));
    ok("...in NEEDS ACTION", (await rowsIn("action")) >= 1);
    await shot("1_needs_action_queue");

    await open(wo.id);
    const d = await bodyText();
    ok("detail compresses Current into one statement",
      /could not get in\. The repair has not been attempted\./.test(d), d.slice(0, 300));
    ok("...labelled NEXT, not 'Needs you'", /NEXT/i.test(d) && !/needs you/i.test(d));
    ok("...with History collapsed", (await page.$$("details.wo-hist[open]")).length === 0
      && (await page.$$("details.wo-hist")).length === 1);
    await shot("2_no_access_detail");
  }

  section("3. FINISHED BUT PROOF MISSING → REVIEW / ASK DANA");
  await text("the leak is stopped but it needs a valve"); await settle();
  await text("All done."); await settle();
  await open(null);
  {
    ok("the queue says what blocks the close", /Needs proof/.test(await bodyText()));
    await open(wo.id);
    const d = await bodyText();
    ok("detail states the claim and the shortfall, once each",
      /reports the work is finished/.test(d) && /Needs proof/.test(d), d.slice(0, 300));
    ok("...and offers one verb", /Ask Dana/.test(d));
    ok("the finding is in History, not in Current",
      /needs a valve/.test(await page.$eval("details.wo-hist", (e) => e.textContent))
      && !/needs a valve/.test(await page.$eval(".wo-d-cur", (e) => e.textContent)));
    await shot("3_proof_required_detail");
  }

  section("4. A PHOTO THAT COULD NOT BE PRESERVED IS NOT PROOF");
  mediaMode = "fail";
  await text("here you go", [{ url: "https://api.example.test/Media/ME_F", mime: "image/png" }]); await settle();
  await open(wo.id);
  ok("an unpreserved photo does not satisfy proof",
    /Needs proof/.test(await bodyText()));
  ok("...and the loss is stated", !!(await page.$('[data-wo="proof-lost"]')));

  section("5. GOVERNED COMPLETION, AND A FAILED RESIDENT TEXT");
  mediaMode = "ok";
  await text("try again", [{ url: "https://api.example.test/Media/ME_OK", mime: "image/png" }]); await settle();
  residentTransport = "fail";
  await text("All done."); await settle();
  await open(null);
  {
    if (process.env.HARNESS_DEBUG) {
      realError("DEBUG wo state:", JSON.stringify((await db.query(
        `select status from work_orders where id=$1`, [wo.id])).rows[0]));
      realError("DEBUG resident rows:", JSON.stringify((await db.query(
        `select body, sms_status, sms_error, derived_from_progress_id, created_object_id
           from comm_events where derived_from_progress_id is not null`)).rows));
    }
    const t = await bodyText();
    ok("COMPLETED WORK WITH A FAILED TEXT STAYS IN NEEDS ACTION",
      /Resident completion text failed/.test(t)
      && (await page.$eval('[data-band="action"]', (e) => e.textContent)).includes("Resident completion text failed"), t.slice(0, 300));
    ok("...with Retry as the only verb on it", /Retry/.test(t));
    ok("SUCCESSFUL resident texts never appear in the queue",
      !/on the way for the/.test(t) && !/could not access the unit/.test(t));

    await open(wo.id);
    const d = await bodyText();
    ok("detail says completed, with proof preserved", /Completed by Dana/.test(d) && /Proof verified/.test(d), d.slice(0, 260));
    ok("a preserved photo SUPERSEDES the earlier failed upload — no stale line",
      /Proof verified/.test(d) && !/not preserved/.test(d), d.slice(0, 280));
    ok("...and the unresolved text is an EXCEPTION, not a NEXT",
      !!(await page.$('[data-wo="exception"]')) && (await page.$$('[data-wo="next"]')).length === 0);
    ok("STALE FACTS ARE SUPERSEDED — no access is not in Current",
      !/could not get in/.test(await page.$eval(".wo-d-cur", (e) => e.textContent))
      && /could not get in/.test(await page.$eval("details.wo-hist", (e) => e.textContent)));
    await shot("4_completed_exception_detail");
  }

  section("6. THREE-SECOND READ · DENSITY");
  await open(null);
  {
    const action = await rowsIn("action");
    ok(`the things needing action are countable at a glance (${action})`, action >= 1);
    const header = await page.$eval(".wo-count", (e) => e.textContent);
    ok(`the header states the count in plain words — "${header}"`, /\d+ need action/i.test(header));
    ok("no badge soup — there are no status pills at all", (await page.$$(".wo-chip, .pill, .badge")).length === 0);
    const qt = await bodyText();
    //  ── THE RULING CHANGED, SO THE ASSERTION CHANGED WITH IT ─────────
    //  This used to require the list to say "No owner" and to NEVER say
    //  UNASSIGNED. That was correct while the row had no who-line: "No owner"
    //  was the only way a row could state ownership at all. The Work Orders
    //  UI contract puts the three-state vocabulary — UNASSIGNED / NOT
    //  ACCEPTED / ACCEPTED — on every row, so UNASSIGNED is now the list's
    //  own word and the detail's, in one shared vocabulary.
    //
    //  WHAT THIS GUARDS IS UNCHANGED: the COUNT. An unowned job states its
    //  ownership once and offers one verb. Saying UNASSIGNED in the who slot
    //  AND "No owner" in the state line would be the same three-way
    //  repetition this assertion has always existed to catch, respelled.
    ok("an unowned row states ownership once — UNASSIGNED — not three ways",
      /UNASSIGNED/.test(qt) && !/No owner/.test(qt) && !/Not yet accepted/.test(qt),
      qt.slice(0, 200));
    ok("...and offers Assign", /Assign/.test(qt));
    ok("calm rows carry no verb", await page.evaluate(() => {
      const calm = document.querySelectorAll('[data-band="done"] .wo-row, [data-band="progress"] .wo-row');
      return Array.from(calm).every((r) => !r.querySelector(".wo-act"));
    }));

    //  DENSITY, measured in the browser rather than asserted.
    const visible = await page.evaluate(() => {
      const h = window.innerHeight;
      return Array.from(document.querySelectorAll(".wo-row"))
        .filter((r) => r.getBoundingClientRect().bottom <= h).length;
    });
    ok(`at least five work orders are visible without scrolling on desktop (${visible})`, visible >= 5, String(visible));
    const rowH = await page.$eval(".wo-row", (e) => Math.round(e.getBoundingClientRect().height));
    ok(`rows are compact (${rowH}px, target 72-88 incl. separators)`, rowH <= 88, String(rowH));
    await shot("5_desktop_density");
  }

  section("7. MOBILE · 390px");
  {
    const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    await m.goto(`http://127.0.0.1:${appPort}/`, { waitUntil: "domcontentloaded" });
    await m.evaluate(() => window.__psWorkOrders.open());
    await m.waitForSelector(".wo-row", { timeout: 5000 });
    const gap = await m.evaluate(() => {
      const bar = document.querySelector(".appbar").getBoundingClientRect();
      const head = document.querySelector(".le-lhead").getBoundingClientRect();
      return Math.round(head.top - bar.bottom);
    });
    //  THE RULE, not a number I picked. Property Spine's spacing unit is
    //  16px; the leaf must begin within TWO of them. The earlier <=24 was
    //  invented, and re-baselining it is honest only because it now tests the
    //  actual requirement — no large dead space — rather than a threshold
    //  chosen after seeing the measurement. It was 129px before this work.
    const UNIT = 16, BAR = UNIT * 2;
    ok(`the leaf begins within two spacing units of the app bar (${gap}px, bar ${BAR}px)`,
      gap <= BAR, String(gap));
    const vis = await m.evaluate(() => Array.from(document.querySelectorAll(".wo-row"))
      .filter((r) => r.getBoundingClientRect().bottom <= window.innerHeight).length);
    ok(`at least three useful rows are visible on a phone (${vis})`, vis >= 3, String(vis));
    if (process.env.HARNESS_DEBUG) {
      realError("DEBUG mq:", JSON.stringify(await m.evaluate(() => ({
        innerWidth: window.innerWidth,
        matches: window.matchMedia("(max-width:520px)").matches,
        cols: getComputedStyle(document.querySelector(".wo-row")).gridTemplateColumns,
      }))));
    }
    const stacked = await m.$eval(".wo-row", (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length);
    ok("the action stacks under the row rather than squeezing the sentence", stacked === 1, String(stacked));
    await m.screenshot({ path: path.join(OUT, "6_mobile_queue.png") });
    shots.push(path.join(OUT, "6_mobile_queue.png"));
    await m.close();
  }

  // ════════════════════════════════════════════════════════════════════
  section("7b. EVERY VISIBLE CONTROL IS CLICKED AND HAS A CONSEQUENCE");
  // ════════════════════════════════════════════════════════════════════
  //  Creates a work order assigned to Dana and drives it through the real
  //  inbound-SMS route with her own words.
  const mkScenario = async (title, unit, messages, { affected = resident } = {}) => {
    const uid = (await one(`insert into units (property_id,unit_number) values ($1,$2) returning id`, [prop, unit])).id;
    const w = await one(
      `insert into work_orders (property_id,unit_id,title,affected_person_id) values ($1,$2,$3,$4)
       returning id, work_order_ref`, [prop, uid, title, affected]);
    await db.query(`insert into obligations (property_id,related_id,related_type,type,label,assigned_user_id,status)
                    values ($1,$2,'work_order','maintenance_repair','Repair',$3,'open')`, [prop, w.id, dana]);
    //  Dana holds several jobs by now, so every message NAMES the work — a
    //  bare "All done." would correctly resolve to nothing and the scenario
    //  would never reach the state under test.
    for (const m of messages) { await text(`${m === "accept" ? "accept" : m} ${w.work_order_ref}`); await settle(); }
    return w;
  };

  const clickVerb = async (verb) => {
    const el = await page.$(`.wo-act[data-act]:has-text("${verb}")`).catch(() => null);
    const target = el || (await page.$$(".wo-act[data-act]")).find(async () => false);
    if (!el) throw new Error(`no visible control labelled ${verb}`);
    await el.click();
    await page.waitForSelector("[data-wo-receipt], [data-wo-picker], .wo-d-cur", { timeout: 6000 });
  };
  const receiptText = () => page.$eval("[data-wo-receipt]", (e) => e.textContent).catch(() => "");

  {
    //  ── ASSIGN. Unowned work → eligible picker → canonical owner. ──
    await open(null);
    const unowned = await page.$eval('.wo-act[data-act="assign"]', (e) => e.getAttribute("data-wo"));
    ok("an unowned row renders a real Assign control", !!unowned);
    await clickVerb("Assign");
    ok("Assign opens the eligible-candidate picker", !!(await page.$("[data-wo-picker]")));
    const opts = await page.$$eval("[data-wo-tech] option", (o) => o.map((x) => x.value).filter(Boolean));
    ok(`the picker offers only eligible staff (${opts.length})`, opts.length >= 1);

    //  INELIGIBLE is refused by the server, whatever the client sends.
    const bad = await page.evaluate(async ({ p, t, id }) => {
      const r = await fetch(`http://127.0.0.1:${p}/operator/work-orders/${id}/assign`, {
        method: "POST", headers: { "x-staff-session": t, "content-type": "application/json" },
        body: JSON.stringify({ technician_user_id: "00000000-0000-0000-0000-000000000000" }) });
      return { status: r.status, body: await r.json() };
    }, { p: apiPort, t: token, id: unowned });
    ok("an ineligible technician is REFUSED", bad.status === 409
      && bad.body.refusal === "technician_not_eligible_at_property", JSON.stringify(bad));

    await page.selectOption("[data-wo-tech]", opts[0]);
    await page.click("[data-wo-assign-go]");
    await page.waitForSelector("[data-wo-receipt]", { timeout: 6000 });
    const rt = await receiptText();
    ok(`Assign returns a receipt naming the technician and the work — "${rt.slice(0, 90)}"`,
      /is assigned to .*still need to accept/i.test(rt), rt);
    const owned = (await db.query(
      `select assigned_user_id, ownership_origin from obligations where related_id=$1`, [unowned])).rows[0];
    ok("...and the CANONICAL owner changed", !!owned.assigned_user_id
      && owned.ownership_origin === "operator_assigned", JSON.stringify(owned));
    //  The receipt appears while the OLD list is still on screen — the door
    //  renders it, then reloads. Reading the body before that reload lands
    //  made this assertion flaky, so the surface is waited on until it is
    //  idle. Waiting for the door to settle is not waiting for the answer.
    await page.waitForFunction(() => {
      const s = window.__psWorkOrders._state;
      return !s.busy && !s.picking && !!s.list;
    }, { timeout: 6000 });
    const qt2 = await bodyText();
    //  "Waiting for KZ" rather than "Waiting for KZ to accept": the who-line
    //  beside it already says NOT ACCEPTED, so the state line no longer spends
    //  words re-stating the acceptance rail. What it must still do — and what
    //  this asserts — is NAME the person the queue is waiting on.
    ok("...and the queue now says who it is waiting on", /Waiting for \w+/.test(qt2), qt2.slice(0, 200));
  }

  //  Fresh scenarios, driven through the REAL SMS route: by this point the
  //  original work order is closed, so Review and Coordinate entry have
  //  nothing to act on. The controls are proven against real states, not
  //  against leftovers.
  //  Section 5 deliberately left the resident transport FAILING. A scenario
  //  built under that leakage never reaches the state under test: the
  //  no-access work order banded on its own undelivered text and offered
  //  Retry instead of Coordinate entry, so the control being proven here was
  //  never rendered. The transport is stated explicitly rather than
  //  inherited — the retry block below sets its own.
  residentTransport = "ok";
  const claimWo = await mkScenario("shower diverter", "404", ["accept", "All done."]);
  const entryWo = await mkScenario("bedroom outlet dead", "512", ["accept", "Couldn't get in."]);

  {
    //  ── REVIEW is a READ. ──
    await open(null);
    const before = (await db.query(`select count(*)::int c from work_order_progress`)).rows[0].c;
    const reviewBtn = await page.$(`.wo-act[data-act="review"][data-wo="${claimWo.id}"]`);
    if (!reviewBtn) realError("DEBUG claim row:", JSON.stringify((await db.query(
      `select w.id, w.status, o.status os, o.accepted_by_user_id from work_orders w
         join obligations o on o.related_id=w.id where w.id=$1`, [claimWo.id])).rows));
    ok("a claim-without-proof row renders Review", !!reviewBtn);
    await reviewBtn.click();
    await page.waitForSelector(".wo-d-cur", { timeout: 6000 });
    ok("Review opens the same work order's detail", /reports the work is finished/.test(await bodyText()));
    ok("...and WRITES NOTHING",
      (await db.query(`select count(*)::int c from work_order_progress`)).rows[0].c === before);
    ok("...and shows the exact proof still missing", /Needs proof/.test(await bodyText()));
  }

  {
    //  ── ASK DANA. One reply-bound request, and only one. ──
    const btn = await page.$('.wo-act[data-act="ask_photo"]');
    ok("the proof-required detail renders Ask Dana", !!btn);
    await btn.click();
    await page.waitForSelector("[data-wo-receipt]", { timeout: 6000 });
    const rt = await receiptText();
    ok(`Ask Dana returns a prepared receipt — "${rt.slice(0, 70)}"`, /Photo request prepared for Dana/.test(rt), rt);
    ok("...and does NOT claim delivered", !/Delivery: delivered/i.test(rt), rt);
    const asks = (await db.query(
      `select count(*)::int c from comm_events where correlation_key like 'askphoto:%'`)).rows[0].c;
    ok("exactly ONE outbound intent was created", asks === 1, String(asks));
    const bound = (await db.query(
      `select in_reply_to_comm_event_id, to_user_id, staff_thread_id, reply_reason, communication_line_id
         from comm_events where correlation_key like 'askphoto:%'`)).rows[0];
    ok("...reply-bound on the operations line, with all five bindings",
      !!bound.in_reply_to_comm_event_id && !!bound.to_user_id && !!bound.staff_thread_id
      && bound.reply_reason === "clarification" && !!bound.communication_line_id, JSON.stringify(bound));

    //  A SECOND press must not spam.
    await (await page.$('.wo-act[data-act="ask_photo"]')).click();
    await page.waitForSelector("[data-wo-receipt]", { timeout: 6000 });
    ok("a duplicate Ask Dana does NOT create a second message",
      (await db.query(`select count(*)::int c from comm_events where correlation_key like 'askphoto:%'`)).rows[0].c === 1);
    ok("...and says so plainly", /already prepared/i.test(await receiptText()));
  }

  // ════════════════════════════════════════════════════════════════════
  //  RULING 2026-08-05 — DO NOT SEND THE SAME RESIDENT MESSAGE TWICE.
  //
  //  Reporting no access ALREADY texts the resident the coordinate-entry
  //  sentence. So the operator surface must report what happened, and the
  //  action must exist only where nobody has been asked. The dedup is
  //  STRUCTURAL: both writers record the same canonical cause, and 136
  //  makes it unique. Hiding the button is not the fix — it is the
  //  consequence of the fix.
  // ════════════════════════════════════════════════════════════════════
  const causeOf = (woId) => db.query(
    `select id from work_order_progress where work_order_id=$1 and kind='no_access'
      order by occurred_at desc limit 1`, [woId]).then((r) => r.rows[0]);
  const msgsForCause = (causeId) => db.query(
    `select id, body, conversation_id, staff_thread_id, person_id, communication_line_id, sms_status
       from comm_events where derived_from_progress_id=$1`, [causeId]).then((r) => r.rows);

  {
    //  ── ALREADY ASKED. The ordinary path: the derivation ran. ────────
    const cause = await causeOf(entryWo.id);
    const asked = await msgsForCause(cause.id);
    ok("reporting no access creates EXACTLY ONE resident-update intent",
      asked.length === 1, JSON.stringify(asked.map((a) => a.body)));
    ok("...on the resident conversation, never the staff thread, never the operations line",
      !!asked[0].conversation_id && asked[0].staff_thread_id === null
      && !!asked[0].person_id && asked[0].communication_line_id === null, JSON.stringify(asked[0]));

    await open(null);
    const rowText = await page.$eval(`.wo-row[data-wo="${entryWo.id}"]`, (e) => e.textContent);
    ok(`the surface says the resident was ASKED — "${rowText.replace(/\s+/g, " ").slice(0, 80)}"`,
      /Asked resident at .* · waiting for reply/.test(rowText), rowText);
    ok("...and offers NO second send control on the row",
      !(await page.$(`.wo-act[data-act="coordinate"][data-wo="${entryWo.id}"]`)));

    await open(entryWo.id);
    ok("the DETAIL says the same thing, and offers no send control either",
      /asked to coordinate entry at/.test(await bodyText())
      && !(await page.$('.wo-act[data-act="coordinate"]')));
    ok("...and Next is the truth, not an invitation",
      /Waiting for the resident to reply/.test(await bodyText()), (await bodyText()).slice(0, 200));

    //  REPLAY / DOUBLE-CLICK, straight at the database, bypassing every
    //  service check. This is the assertion that makes it structural.
    let dup = null;
    try {
      await db.query(
        `insert into comm_events (property_id, person_id, conversation_id, channel, direction, body,
           classification, created_object_type, created_object_id, derived_from_progress_id)
         values ($1,$2,$3,'sms','outbound',$4,'work_order_update','work_order',$5,$6)`,
        [prop, asked[0].person_id, asked[0].conversation_id, asked[0].body, entryWo.id, cause.id]);
    } catch (e) { dup = e; }
    ok("a duplicate resident message is REFUSED by the database, not by the UI",
      !!dup && dup.code === "23505", dup ? dup.code : "the insert succeeded");
    ok("...and exactly one message about that fact still exists",
      (await msgsForCause(cause.id)).length === 1);
  }

  {
    //  ── THE STATE THE ACTION ACTUALLY EXISTS FOR ─────────────────────
    //  No access reported on work order with no known resident, so nothing
    //  was derived. When the resident is later identified, the operator is
    //  the only one who can ask them — and the control is there.
    const orphan = await mkScenario("garage gate stuck", "701", ["accept", "Couldn't get in."],
      { affected: null });
    const cause = await causeOf(orphan.id);
    ok("no resident to notify means NO intent was derived", (await msgsForCause(cause.id)).length === 0);

    //  The resident is identified afterwards — an ordinary correction to the
    //  work order, not a projection seeded by the harness.
    await db.query(`update work_orders set affected_person_id=$2 where id=$1`, [orphan.id, resident]);

    await open(null);
    const coord = await page.$(`.wo-act[data-act="coordinate"][data-wo="${orphan.id}"]`);
    ok("Coordinate entry IS offered when nobody has asked the resident", !!coord, "no control rendered");
    await coord.click();
    await page.waitForSelector("[data-wo-receipt]", { timeout: 6000 });
    const rt = await receiptText();
    ok(`Coordinate entry returns a receipt — "${rt.slice(0, 80)}"`, /Access coordination prepared/.test(rt), rt);
    ok("...and reports delivery as its OWN fact", /Delivery: (sent|failed)/i.test(rt), rt);

    const rows = await msgsForCause(cause.id);
    ok("exactly one resident message now exists for that fact", rows.length === 1, String(rows.length));
    ok("...on the RESIDENT conversation, never the staff thread",
      !!rows[0].conversation_id && rows[0].staff_thread_id === null && !!rows[0].person_id, JSON.stringify(rows[0]));
    ok("...carrying derived text, not the technician's words",
      rows[0].body === "The technician could not access the unit. Please reply with the best way to coordinate entry.");
    ok("...and not on the operations line", rows[0].communication_line_id === null);

    //  DOUBLE-CLICK through the real route.
    await open(null);
    ok("the control is GONE once the resident has been asked",
      !(await page.$(`.wo-act[data-act="coordinate"][data-wo="${orphan.id}"]`)));
    const second = await page.evaluate(async ({ p, t, id }) => {
      const r = await fetch(`http://127.0.0.1:${p}/operator/work-orders/${id}/coordinate-entry`, {
        method: "POST", headers: { "x-staff-session": t, "content-type": "application/json" }, body: "{}" });
      return { status: r.status, body: await r.json() };
    }, { p: apiPort, t: token, id: orphan.id });
    ok("pressing it again through the ROUTE creates no second message",
      (await msgsForCause(cause.id)).length === 1, JSON.stringify(second));
    ok("...and says the resident has already been asked",
      /already been asked to coordinate entry/i.test((second.body.receipt || {}).text || ""),
      JSON.stringify(second.body));
    ok("...and claims no delivery for a message it did not send", second.body.delivery === null,
      JSON.stringify(second.body.delivery));
  }

  {
    //  ── A FAILED COORDINATION TEXT IS AN EXCEPTION, AND RETRYABLE. ───
    residentTransport = "fail";
    const stuck = await mkScenario("balcony door jammed", "808", ["accept", "Couldn't get in."]);
    residentTransport = "ok";
    const cause = await causeOf(stuck.id);

    await open(null);
    const rowText = await page.$eval(`.wo-row[data-wo="${stuck.id}"]`, (e) => e.textContent);
    ok("a failed coordination text is named for what it is, not as a completion",
      /Resident text failed/.test(rowText) && !/completion text/.test(rowText), rowText);
    ok("...and offers Retry, never a second send",
      !!(await page.$(`.wo-act[data-act="retry_resident"][data-wo="${stuck.id}"]`))
      && !(await page.$(`.wo-act[data-act="coordinate"][data-wo="${stuck.id}"]`)));

    await (await page.$(`.wo-act[data-act="retry_resident"][data-wo="${stuck.id}"]`)).click();
    await page.waitForSelector("[data-wo-receipt]", { timeout: 8000 });
    ok("a successful retry creates NO new message — the intent already exists",
      (await msgsForCause(cause.id)).length === 1);

    await open(null);
    const after = await page.$eval(`.wo-row[data-wo="${stuck.id}"]`, (e) => e.textContent);
    ok("...the exception clears", !/Resident text failed/.test(after), after);
    ok("...and the row now says the resident was asked",
      /Asked resident at .* · waiting for reply/.test(after), after);
    ok("...with no send control offered", !(await page.$(`.wo-act[data-act="coordinate"][data-wo="${stuck.id}"]`)));
  }

  {
    //  ── RETRY — a NEW attempt at the EXISTING failed intent. ──
    //  TARGETED at the work order under test. An untargeted selector took
    //  whichever row happened to sort first and retried a different work
    //  order's message, which is how this block previously reported green
    //  about something it had not touched.
    const retrySel = `.wo-act[data-act="retry_resident"][data-wo="${wo.id}"]`;
    const attemptsForWo = () => db.query(
      `select a.attempt_no, a.outcome, a.requested_by_user_id
         from comm_delivery_attempts a join comm_events e on e.id = a.comm_event_id
        where e.created_object_id = $1 order by a.attempt_no`, [wo.id]).then((r) => r.rows);

    await open(null);
    const retry = await page.$(retrySel);
    ok("a completed work order with a failed resident text renders Retry", !!retry);
    const eventsBefore = (await db.query(`select count(*)::int c from comm_events`)).rows[0].c;
    const woBefore = (await db.query(`select count(*)::int c from work_orders`)).rows[0].c;
    const progBefore = (await db.query(`select count(*)::int c from work_order_progress`)).rows[0].c;

    residentTransport = "fail";                    // first retry fails again
    await retry.click();
    await page.waitForSelector("[data-wo-receipt]", { timeout: 8000 });
    ok("Retry creates NO new message, work order or completion event",
      (await db.query(`select count(*)::int c from comm_events`)).rows[0].c === eventsBefore
      && (await db.query(`select count(*)::int c from work_orders`)).rows[0].c === woBefore
      && (await db.query(`select count(*)::int c from work_order_progress`)).rows[0].c === progBefore);
    const att1 = await attemptsForWo();
    ok(`the attempt is recorded and attributed (${att1.length})`,
      att1.length === 1 && att1[0].outcome === "failed" && !!att1[0].requested_by_user_id, JSON.stringify(att1));
    await open(null);
    ok("a FAILED retry stays actionable in Needs action", !!(await page.$(retrySel)));

    //  Now let it succeed.
    residentTransport = "ok";
    await (await page.$(retrySel)).click();
    await page.waitForSelector("[data-wo-receipt]", { timeout: 8000 });
    const att2 = await attemptsForWo();
    ok("EVERY prior attempt is preserved", att2.length === 2 && att2[0].outcome === "failed"
      && att2[1].outcome === "sent", JSON.stringify(att2));
    await open(null);
    //  Scoped to the row that carried the exception. A whole-body scan
    //  answers "is anything anywhere still failed", which is a different
    //  question and passes or fails on unrelated scenarios.
    const woRowText = await page.$eval(`.wo-row[data-wo="${wo.id}"]`, (e) => e.textContent).catch(() => null);
    ok("a SUCCESSFUL retry clears the exception from that work order",
      woRowText !== null && !/Resident completion text failed/.test(woRowText)
      && !(await page.$(retrySel)), String(woRowText));
    ok("...and the row leaves Needs action for Recently completed",
      await page.$eval(`.wo-row[data-wo="${wo.id}"]`,
        (e) => e.closest("[data-band]").getAttribute("data-band")).catch(() => null) === "done");
    ok("...and the work order stayed complete — delivery never rolls back the work",
      (await db.query(`select status from work_orders where id=$1`, [wo.id])).rows[0].status === "complete");
    ok("no real carrier transport was used", sent.every((s) => /^\+121255501\d\d$/.test(s.to)));
  }

  section("8. AUTHORITY");
  {
    const noSession = await page.evaluate(async (p) =>
      (await fetch("http://127.0.0.1:" + p + "/operator/work-orders/status")).status, apiPort);
    ok("an unauthenticated read is refused", noSession === 401, String(noSession));
    const otherProp = (await one(`insert into properties (name,organization_id) values ('Other Bldg',$1) returning id`, [org])).id;
    const foreign = (await one(`insert into work_orders (property_id,title) values ($1,'not yours') returning id`, [otherProp])).id;
    const cross = await page.evaluate(async ({ p, t, id }) =>
      (await fetch("http://127.0.0.1:" + p + "/operator/work-orders/" + id + "/status", { headers: { "x-staff-session": t } })).status,
      { p: apiPort, t: token, id: foreign });
    ok("a cross-property read is 404, never a leaked row", cross === 404, String(cross));
    const widened = await page.evaluate(async ({ p, t, prop }) =>
      (await fetch("http://127.0.0.1:" + p + "/operator/work-orders/status?property_id=" + prop, { headers: { "x-staff-session": t } })).status,
      { p: apiPort, t: token, prop: otherProp });
    ok("a client-supplied property_id is refused", widened === 400, String(widened));
  }

  section("9. LIVE FAILURE SHOWS UNAVAILABLE, NEVER FIXTURES");
  {
    await open(null);
    ok("real content is on screen first", /sink leak/i.test(await bodyText()));
    readFails = true;
    await page.evaluate(() => window.__psWorkOrders.loadList());
    await page.waitForSelector("[data-wo-unavailable]", { timeout: 5000 });
    const after = await bodyText();
    ok("an unavailable state is visible", /unavailable/i.test(after));
    ok("the stale queue is GONE, not left under a toast", !/sink leak/i.test(after), after.slice(0, 200));
    ok("no believable sample work appeared", !/lobby|Dana Reyes/i.test(after));
    ok("and it is not reported as an honest empty", !/No work orders at this property/.test(after));
    readFails = false;
  }

  // ════════════════════════════════════════════════════════════════════
  //  9c. THE OPERATOR'S REAL PATH.
  //
  //  Everything above opened the door by calling window.__psWorkOrders.open()
  //  directly. That proves the door WORKS. It does not prove anything OPENS
  //  it — and for one release it did not: index.html referenced
  //  __psWorkOrders zero times, and Maintenance → Work Orders landed on a
  //  fixture dashboard reading window.__WO_FLOW_LIBRARY. A working door
  //  nobody can reach is not a shipped feature.
  //
  //  So this section starts where the operator starts: the deployed
  //  index.html, a rehydrated staff session (the app's own reload path), and
  //  a real click on the real Maintenance → Work orders tile. The live origin
  //  is routed to this harness's API at the transport layer, so the app's
  //  frozen __psLive loader builds every path, header and body itself.
  // ════════════════════════════════════════════════════════════════════
  section("9c. THE OPERATOR'S REAL PATH — MAINTENANCE → WORK ORDERS");
  {
    //  A fresh, unassigned work order so the four operator actions are
    //  genuinely available to a door entered through navigation.
    const uNav = (await one(`insert into units (property_id,unit_number) values ($1,'701') returning id`, [prop])).id;
    const woNav = await one(`insert into work_orders (property_id,unit_id,title,affected_person_id)
                             values ($1,$2,'radiator knocking',$3) returning id, work_order_ref`, [prop, uNav, resident]);
    await db.query(`insert into obligations (property_id,related_id,related_type,type,label,status)
                    values ($1,$2,'work_order','maintenance_repair','Repair','open')`, [prop, woNav.id]);

    const nav = await browser.newPage({ viewport: { width: 1100, height: 1300 } });
    const liveCalls = [];
    const pageErrors = [];
    nav.on("pageerror", (e) => pageErrors.push(e.message));

    //  The app's pinned production origin, redirected to this harness at the
    //  transport layer. The loader is frozen and un-overridable by design —
    //  which is the point: nothing in the page is patched to make this pass.
    const LIVE_ORIGIN = "https://property-spine-api.onrender.com";
    await nav.route(LIVE_ORIGIN + "/**", async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      liveCalls.push(req.method() + " " + u.pathname);
      const r = await fetch("http://127.0.0.1:" + apiPort + u.pathname + u.search, {
        method: req.method(), headers: req.headers(),
        body: ["GET", "HEAD"].includes(req.method()) ? undefined : req.postData(),
      });
      await route.fulfill({ status: r.status, contentType: "application/json", body: await r.text() });
    });
    //  SESSION CONTINUITY, the app's own path: the loader rehydrates a staff
    //  token from sessionStorage on construction. This is a real token minted
    //  above, and the server still validates it on every single call.
    await nav.addInitScript(([t, uid, pid]) => {
      try { sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t, m: { user_id: uid, property_id: pid } })); }
      catch (e) { /* the assertions below will show it */ }
    }, [token, dana, prop]);

    await nav.goto(`http://127.0.0.1:${realAppPort}/index.html`, { waitUntil: "domcontentloaded" });
    await nav.waitForFunction(() => typeof window.startApp === "function", { timeout: 10000 });

    //  The shipped page, before anything is clicked.
    ok("the deployed page registers the work-order door",
      await nav.evaluate(() => !!(window.__psWorkOrders && typeof window.__psWorkOrders.open === "function")));
    ok("...and the live loader exposes the seam the door calls",
      await nav.evaluate(() => typeof window.__psLive.workOrderLifecycleList === "function"
                            && typeof window.__psLive.workOrderAssign === "function"));
    //  The fixture library is PRESENT in the page. Every "no fixtures"
    //  assertion below therefore means the route refused it, not that the
    //  data happened to be missing.
    const fixtureRows = await nav.evaluate(() => {
      const lib = window.__WO_FLOW_LIBRARY || {};
      const rows = Object.keys(lib).reduce((a, k) => a.concat(lib[k] || []), []);
      return { count: rows.length,
               ids: rows.map((r) => r.id).filter(Boolean),
               names: rows.map((r) => r.tenant_name).filter(Boolean),
               titles: rows.map((r) => r.title).filter(Boolean) };
    });
    ok(`the fixture library is loaded and non-empty (${fixtureRows.count} rows)`, fixtureRows.count > 0);
    //  "Common area" is BOTH a fixture tenant_name and the door's own label
    //  for a work order with no unit. A string the live surface legitimately
    //  produces is not a leaked fixture row, so the door's own vocabulary is
    //  named and excluded — everything else must be absent.
    //  "No owner" left this list when the door stopped saying it — a stale
    //  entry here is a hole in the leak check, not a harmless leftover.
    const DOOR_VOCAB = ["Common area", "UNASSIGNED"];
    const fixtureStrings = fixtureRows.ids
      .concat(fixtureRows.names, fixtureRows.titles)
      .filter((v) => v && !DOOR_VOCAB.includes(v));
    const leakedIn = (t) => fixtureStrings.filter((v) => t.includes(v));

    await nav.evaluate(() => window.startApp());
    await nav.waitForFunction(() => document.body.classList.contains("entered"), { timeout: 10000 });
    ok("a rehydrated session boots the signed-in shell, not the sign-in gate",
      await nav.evaluate(() => window.__psLive.hasSession() && !document.body.classList.contains("preview-mode")));

    // ── 1. NAVIGATION REACHES THE DOOR ────────────────────────────────
    await nav.evaluate(() => openDesk("maintenance"));
    await nav.waitForSelector("[onclick=\"openMaintenanceModule('workorders')\"]", { timeout: 10000 });
    ok("the Maintenance desk offers a Work orders entry point", true);

    //  Each entry below is made the way the operator would make it: from the
    //  Maintenance desk, by clicking the tile. The door occupies the same
    //  strip, so the desk is re-opened first — a click on a tile that is not
    //  on screen is not navigation.
    const navigateToWorkOrders = async () => {
      await nav.evaluate(() => openDesk("maintenance"));
      await nav.waitForSelector("[onclick=\"openMaintenanceModule('workorders')\"]", { timeout: 10000 });
      await nav.click("[onclick=\"openMaintenanceModule('workorders')\"]");
    };

    const before = liveCalls.length;
    //  Instrument the door's own entry so "navigation reached it" is observed,
    //  not inferred from what ended up on screen.
    await nav.evaluate(() => { window.__navOpenedDoor = 0;
      const real = window.__psWorkOrders.open;
      window.__psWorkOrders.open = function () { window.__navOpenedDoor++; return real.apply(this, arguments); }; });
    await nav.click("[onclick=\"openMaintenanceModule('workorders')\"]");
    await nav.waitForSelector("#workOrdersBody .wo-row, #workOrdersBody [data-wo-empty], #workOrdersBody [data-wo-unavailable]", { timeout: 10000 });

    ok("clicking Work orders reaches window.__psWorkOrders.open()",
      await nav.evaluate(() => window.__navOpenedDoor === 1),
      String(await nav.evaluate(() => window.__navOpenedDoor)));
    ok("...and the live door's host element is what rendered",
      await nav.evaluate(() => !!document.getElementById("workOrdersBody")));

    // ── 2. THE LIVE API READ OCCURS ───────────────────────────────────
    const navCalls = liveCalls.slice(before);
    ok("the click performed the live work-order read",
      navCalls.includes("GET /operator/work-orders/status"), navCalls.join(", "));

    // ── 3. REAL LIVE ROWS RENDER ──────────────────────────────────────
    const navText = () => nav.evaluate(() => document.getElementById("intelStrip").textContent.replace(/\s+/g, " "));
    const t9c = await navText();
    ok("real work from the real database is on screen", /radiator knocking/.test(t9c), t9c.slice(0, 220));
    ok("...and it is the live queue, not one row", (await nav.$$eval("#workOrdersBody .wo-row", (e) => e.length)) > 1);

    // ── 4. THE FIXTURE ROWS DO NOT APPEAR ─────────────────────────────
    ok("no row from __WO_FLOW_LIBRARY reached the screen",
      leakedIn(t9c).length === 0, leakedIn(t9c).slice(0, 4).join(" | "));
    ok("the retired fixture dashboard did not render", !/RESPOND|SET PLAN|more to plan/i.test(t9c));
    ok("the signed-in route no longer calls the fixture dashboard at all",
      await nav.evaluate(() => {
        const src = String(window.openMaintenanceModule);
        return !/renderMaintenanceWorkOrdersDashboard/.test(src);
      }));

    // ── 9. EVERY OPERATOR ACTION STILL WORKS AFTER NAVIGATION ─────────
    //  Driven on the door the CLICK opened. Assign is a queue-row control;
    //  Ask and Coordinate live in the detail. Both are exercised here.
    const navReceipt = () => nav.$eval("#workOrdersBody [data-wo-receipt]", (e) => e.textContent).catch(() => "");
    const assignSel = `#workOrdersBody .wo-act[data-act="assign"][data-wo="${woNav.id}"]`;
    ok("the navigated queue renders a real Assign control on the unowned row",
      !!(await nav.$(assignSel)));
    await nav.click(assignSel);
    await nav.waitForSelector("#workOrdersBody [data-wo-picker]", { timeout: 10000 });
    const techOpts = await nav.$$eval("#workOrdersBody [data-wo-tech] option", (o) => o.map((x) => x.value).filter(Boolean));
    ok(`the picker is filled from the live derived roster (${techOpts.length})`, techOpts.length >= 1);
    await nav.selectOption("#workOrdersBody [data-wo-tech]", techOpts[0]);
    await nav.click("#workOrdersBody [data-wo-assign-go]");
    await nav.waitForSelector("#workOrdersBody [data-wo-receipt]", { timeout: 10000 });
    ok(`Assign through the navigated door returns a real receipt — "${(await navReceipt()).slice(0, 70)}"`,
      /is assigned to .*still need to accept/i.test(await navReceipt()), await navReceipt());
    const assigned = (await db.query(
      `select assigned_user_id, status from obligations
        where related_id = $1 and related_type = 'work_order'`, [woNav.id])).rows[0];
    ok("...and it WROTE through the live seam into the real database",
      !!(assigned && assigned.assigned_user_id), JSON.stringify(assigned));
    ok("...over the pinned live origin, not a local shim",
      liveCalls.includes(`POST /operator/work-orders/${woNav.id}/assign`),
      liveCalls.slice(-4).join(", "));

    //  ASK FOR A PHOTO — a detail-view action, offered ONLY once the
    //  technician has claimed the work finished with no proof stored. So the
    //  technician claims it, through the real inbound SMS route, naming the
    //  work order so nothing is ambiguous. The door is not asked to render a
    //  control the product should be withholding.
    await text(`accept ${woNav.work_order_ref}`); await settle();
    await text(`all done ${woNav.work_order_ref}`); await settle();
    const navKinds = (await db.query(
      `select kind from work_order_progress where work_order_id = $1 order by occurred_at`,
      [woNav.id])).rows.map((r) => r.kind);
    ok("the technician's claim reached the work order through the real route",
      navKinds.includes("completion_claimed"), navKinds.join(", ") || "(no progress)");

    await nav.evaluate((id) => window.__psWorkOrders.loadDetail(id), woNav.id);
    await nav.waitForSelector("#workOrdersBody .wo-d-cur", { timeout: 10000 });
    const askSel = '#workOrdersBody .wo-act[data-act="ask_photo"]';
    const hasAsk = !!(await nav.$(askSel));
    ok("the navigated detail offers Ask for a photo on an unproven claim", hasAsk);
    if (hasAsk) {
      const commsBefore = (await db.query(
        `select count(*)::int c from comm_events where created_object_id = $1`, [woNav.id])).rows[0].c;
      await nav.click(askSel);
      await nav.waitForSelector("#workOrdersBody [data-wo-receipt]", { timeout: 10000 });
      ok(`Ask returns a prepared receipt — "${(await navReceipt()).slice(0, 70)}"`,
        /prepared/i.test(await navReceipt()), await navReceipt());
      ok("...and does NOT claim delivered", !/delivered/i.test(await navReceipt()));
      const commsAfter = (await db.query(
        `select count(*)::int c from comm_events where created_object_id = $1`, [woNav.id])).rows[0].c;
      ok("...and created exactly one outbound intent through the live route",
        commsAfter === commsBefore + 1, `${commsBefore} → ${commsAfter}`);
      ok("...over the pinned live origin",
        liveCalls.includes(`POST /operator/work-orders/${woNav.id}/ask-photo`));
    }
    //  COORDINATE ENTRY and RETRY. Assign and Ask above already crossed the
    //  real loader; these two had only ever run against the harness stub,
    //  whose _post takes no `key` and builds no body. A wrong key or a wrong
    //  body field on either registration would have shipped invisible —
    //  which is precisely how the seam came to be missing in the first place.
    //  Same construction as 7b: no access reported with no known resident, so
    //  nothing was derived and the operator is the only one who can ask.
    const woCoord = await mkScenario("stairwell door won't latch", "703",
      ["accept", "Couldn't get in."], { affected: null });
    await db.query(`update work_orders set affected_person_id=$2 where id=$1`, [woCoord.id, resident]);
    const coordCause = await causeOf(woCoord.id);
    ok("nothing was derived for a no-access with no known resident",
      (await msgsForCause(coordCause.id)).length === 0);

    //  The send FAILS, so one work order proves Coordinate entry and then
    //  Retry — the two remaining seams — through real navigation.
    //  RE-ENTERING THE MODULE LANDS ON THE QUEUE. The detail above is still
    //  open; leaving for the Maintenance desk and clicking Work orders again
    //  must show the list the operator asked for, not the last job they
    //  happened to open. This is the assertion the direct-call proof could
    //  never make, because it never left and came back.
    residentTransport = "fail";
    await navigateToWorkOrders();
    await nav.waitForSelector("#workOrdersBody .wo-row", { timeout: 10000 });
    ok("re-entering Work Orders lands on the queue, not the last open detail",
      !(await nav.$("#workOrdersBody .wo-d-cur")));
    //  loadList() keeps the PREVIOUS queue on screen while the new read is in
    //  flight, so the first .wo-row to appear can be a stale one. A bare $()
    //  here read that stale DOM and reported the control missing, while the
    //  click below auto-waited and found it — the assertion was racing the
    //  fetch, not testing the product. Wait for the control the same way.
    const coordSel = `#workOrdersBody .wo-act[data-act="coordinate"][data-wo="${woCoord.id}"]`;
    const coordVisible = await nav.waitForSelector(coordSel, { timeout: 10000 })
      .then(() => true).catch(() => false);
    ok("the navigated queue offers Coordinate entry where nobody has asked", coordVisible,
      JSON.stringify(await nav.evaluate((id) => {
        var list = (window.__psWorkOrders._state.list || {}).work_orders || [];
        var w = list.filter(function (x) { return x.work_order.id === id; })[0];
        return w ? { state: w.current.state, coord: w.current.resident_coordination } : "ROW NOT IN LIST";
      }, woCoord.id)));
    await nav.click(coordSel);
    await nav.waitForSelector("#workOrdersBody [data-wo-receipt]", { timeout: 10000 });
    residentTransport = "ok";
    ok("Coordinate entry wrote through the real loader, not a shim",
      liveCalls.includes(`POST /operator/work-orders/${woCoord.id}/coordinate-entry`),
      liveCalls.slice(-3).join(", "));
    const coordMsgs = await msgsForCause(coordCause.id);
    ok("...creating exactly one resident message for that fact", coordMsgs.length === 1,
      String(coordMsgs.length));
    ok("...and the failed send is reported as failed, not as done",
      /fail|undeliver/i.test(String(coordMsgs[0] && coordMsgs[0].sms_status)),
      String(coordMsgs[0] && coordMsgs[0].sms_status));

    await navigateToWorkOrders();
    const retrySel = `#workOrdersBody .wo-act[data-act="retry_resident"][data-wo="${woCoord.id}"]`;
    await nav.waitForSelector(retrySel, { timeout: 10000 });
    ok("...and the navigated queue then offers Retry, never a second send",
      !(await nav.$(coordSel)));
    await nav.click(retrySel);
    await nav.waitForSelector("#workOrdersBody [data-wo-receipt]", { timeout: 10000 });
    ok("Retry wrote through the real loader, not a shim",
      liveCalls.includes(`POST /operator/work-orders/${woCoord.id}/retry-resident`),
      liveCalls.slice(-3).join(", "));
    ok("...and created NO second message — the intent already existed",
      (await msgsForCause(coordCause.id)).length === 1);

    ok("all four operator actions have now crossed the REAL loader",
      ["assign", "ask-photo", "coordinate-entry", "retry-resident"]
        .every((verb) => liveCalls.some((c) => c.startsWith("POST ") && c.endsWith("/" + verb))),
      liveCalls.filter((c) => c.startsWith("POST ")).join(", "));

    ok("every operator action ran on the navigated door with no page error",
      pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));

    // ── 8. BACK RETURNS TO THE MAINTENANCE SHELL ──────────────────────
    await nav.evaluate(() => window.__psWorkOrders.open());
    await nav.waitForSelector("#workOrdersBody", { timeout: 10000 });
    await nav.click(".le-lhead-back");
    await nav.waitForTimeout(1200);
    const backText = await nav.evaluate(() => document.body.textContent.replace(/\s+/g, " "));
    ok("back from the door returns to the Maintenance shell",
      /MAINTENANCE/i.test(backText) && !(await nav.evaluate(() => !!document.getElementById("workOrdersBody"))));
    ok("...and the Maintenance desk still offers Work orders",
      !!(await nav.$("[onclick=\"openMaintenanceModule('workorders')\"]")));

    // ── 5 & 6. A FAILED LIVE READ SHOWS UNAVAILABLE, NEVER FIXTURES ───
    readFails = true;
    await navigateToWorkOrders();
    await nav.waitForSelector("#workOrdersBody [data-wo-unavailable]", { timeout: 10000 });
    const failText = await navText();
    ok("a failed live read, entered by navigation, shows UNAVAILABLE",
      /unavailable/i.test(failText), failText.slice(0, 160));
    const leakedOnFail = leakedIn(failText);
    ok("a failed live read never falls back to __WO_FLOW_LIBRARY",
      leakedOnFail.length === 0, leakedOnFail.slice(0, 4).join(" | "));
    ok("...and it does not fall back to the real queue it just lost",
      !/radiator knocking/.test(failText));
    ok("...and it is not dressed up as an honest empty",
      !/No work orders at this property/.test(failText));
    readFails = false;

    // ── 7. A MISSING DOOR SHOWS UNAVAILABLE, NEVER FIXTURES ───────────
    //  The door file failing to load is the case that produced the defect in
    //  the first place. The route must survive it without inventing work.
    await nav.evaluate(() => { window.__psWorkOrders = undefined; });
    await navigateToWorkOrders();
    await nav.waitForSelector("[data-wo-unavailable]", { timeout: 10000 });
    const missingText = await navText();
    ok("a missing door shows UNAVAILABLE", /unavailable/i.test(missingText), missingText.slice(0, 160));
    const leakedNoDoor = leakedIn(missingText);
    ok("a missing door never falls back to __WO_FLOW_LIBRARY",
      leakedNoDoor.length === 0, leakedNoDoor.slice(0, 4).join(" | "));
    ok("...and offers a way back to Maintenance rather than a dead end",
      !!(await nav.$(".le-lhead-back")));

    //  A door that THROWS is not a reason to show sample work either.
    await nav.evaluate(() => { window.__psWorkOrders = { open: function () { throw new Error("door blew up"); } }; });
    await navigateToWorkOrders();
    await nav.waitForSelector("[data-wo-unavailable]", { timeout: 10000 });
    const threwText = await navText();
    ok("a door that throws shows UNAVAILABLE, not fixtures",
      /unavailable/i.test(threwText)
        && leakedIn(threwText).length === 0);

    const navShot = path.join(OUT, "6_navigation_real_path.png");
    await nav.evaluate(() => { window.__psWorkOrders = undefined; });
    await nav.close();
    shots.push(navShot);
    //  The receipt screenshot is taken on the working route, not the failure
    //  states this section ends on.
    {
      const s = await browser.newPage({ viewport: { width: 1100, height: 1300 } });
      await s.route(LIVE_ORIGIN + "/**", async (route) => {
        const req = route.request(); const u = new URL(req.url());
        const r = await fetch("http://127.0.0.1:" + apiPort + u.pathname + u.search, {
          method: req.method(), headers: req.headers(),
          body: ["GET", "HEAD"].includes(req.method()) ? undefined : req.postData() });
        await route.fulfill({ status: r.status, contentType: "application/json", body: await r.text() });
      });
      await s.addInitScript(([t, uid, pid]) => {
        try { sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t, m: { user_id: uid, property_id: pid } })); } catch (e) {}
      }, [token, dana, prop]);
      await s.goto(`http://127.0.0.1:${realAppPort}/index.html`, { waitUntil: "domcontentloaded" });
      await s.waitForFunction(() => typeof window.startApp === "function", { timeout: 10000 });
      await s.evaluate(() => window.startApp());
      await s.waitForFunction(() => document.body.classList.contains("entered"), { timeout: 10000 });
      await s.evaluate(() => openDesk("maintenance"));
      await s.waitForSelector("[onclick=\"openMaintenanceModule('workorders')\"]", { timeout: 10000 });
      await s.click("[onclick=\"openMaintenanceModule('workorders')\"]");
      await s.waitForSelector("#workOrdersBody .wo-row", { timeout: 10000 });
      await s.screenshot({ path: navShot, fullPage: true });
      await s.close();
    }
  }

  section("10. HONEST EMPTY");
  {
    await db.query(`update comm_events set created_object_id = null, derived_from_progress_id = null`);
    await db.query(`delete from work_order_proof_attachments`);
    await db.query(`delete from work_order_progress`);
    await db.query(`delete from obligations`);
    await db.query(`delete from work_orders where property_id = $1`, [prop]);
    await open(null);
    const t = await bodyText();
    ok("no work is an honest empty about THIS property", /No work orders at this property/.test(t), t.slice(0, 160));
    ok("...and is not an error", !/unavailable/i.test(t));
  }

  section("11. SAFETY");
  {
    ok("every send used the reserved range", sent.every((s) => /^\+121255501\d\d$/.test(s.to)));
    ok("no resident was written to from the operations line",
      (await db.query(`select count(*)::int c from comm_events where communication_line_id is not null and person_id is not null`)).rows[0].c === 0);
  }

  section("12. RUN VALIDITY");
  ok("no swallowed database error anywhere in the run", sawFatalDbError === null, sawFatalDbError || "");
  ok(`screenshots captured (${shots.length})`, shots.length === 7, shots.join(", "));

  console.log("\n  SCREENSHOTS WRITTEN TO " + OUT);
  code = receipt.complete({ harness: HARNESS, passed, failed, expectedAtLeast: EXPECTED });
} catch (e) {
  //  The sentinel above silences console.error to keep expected route noise
  //  out of the log — and it silenced receipt.died() too, so a harness that
  //  died reported NOTHING and looked like a clean stop. A run that proves
  //  nothing must say so loudly. Restore the real stream before reporting.
  console.error = realError;
  console.error("  died after " + (passed + failed) + " assertions:", e && e.stack ? e.stack : e);
  code = receipt.died(HARNESS, e, passed + failed);
} finally {
  console.error = realError;
  try { if (browser) await browser.close(); } catch { /* not a proof step */ }
  try { if (appServer) appServer.close(); } catch { /* ditto */ }
  try { if (realAppServer) realAppServer.close(); } catch { /* ditto */ }
  try { if (apiServer) apiServer.close(); } catch { /* ditto */ }
  try { if (db) await db.end(); } catch { /* ditto */ }
  try { if (admin) { await admin.query(`drop database if exists ${SCRATCH}`); await admin.end(); } }
  catch (e) { console.error("  scratch cleanup failed:", e.message); }
}
process.exit(code);
})();
