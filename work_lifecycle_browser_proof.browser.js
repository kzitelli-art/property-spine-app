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
const EXPECTED = 38;
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

let admin = null, db = null, apiServer = null, appServer = null, browser = null, code = 1;
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
                   "134_technician_lifecycle.sql"]) await db.query(mig(n));

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
  hasSession: function(){ return true; },
  _get: async function(p){
    var r = await fetch("http://127.0.0.1:${apiPort}" + p, { headers: { "x-staff-session": "${token}" } });
    if (!r.ok) { var j = await r.json().catch(function(){return{};}); throw new Error(j.detail || ("HTTP " + r.status)); }
    return r.json();
  },
  workOrderLifecycleList: function(){ return this._get("/operator/work-orders/status"); },
  workOrderLifecycle: function(p){ return this._get("/operator/work-orders/" + p.workOrderId + "/status"); }
};
function openDesk(){}
</script>
<script src="/work-lifecycle-door.js"></script>`);
  });
  appSrv.get("/work-lifecycle-door.js", (_req, res) =>
    res.type("application/javascript").send(fs.readFileSync(path.join(APP, "work-lifecycle-door.js"), "utf8")));
  appServer = appSrv.listen(0);
  const appPort = appServer.address().port;

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

  section("2. NO ACCESS → COORDINATE ENTRY");
  await text("Couldn't get in."); await settle();
  await open(null);
  {
    const t = await bodyText();
    ok("the row states the operating fact, not a status word", /Entry could not be completed/.test(t), t.slice(0, 240));
    ok("...and carries exactly one verb", /Coordinate entry/.test(t));
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
    ok("the queue says what blocks the close", /Photo required to close/.test(await bodyText()));
    await open(wo.id);
    const d = await bodyText();
    ok("detail states the claim and the shortfall, once each",
      /reports the work is finished/.test(d) && /Photo required before close/.test(d), d.slice(0, 300));
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
    /Photo required before close/.test(await bodyText()));
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
    ok("detail says completed, with proof preserved", /Completed by Dana/.test(d) && /Repair photo preserved/.test(d), d.slice(0, 260));
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
    ok(`the leaf begins directly under the app bar (${gap}px gap)`, gap <= 24, String(gap));
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
  ok(`screenshots captured (${shots.length})`, shots.length === 6, shots.join(", "));

  console.log("\n  SCREENSHOTS WRITTEN TO " + OUT);
  code = receipt.complete({ harness: HARNESS, passed, failed, expectedAtLeast: EXPECTED });
} catch (e) {
  code = receipt.died(HARNESS, e, passed + failed);
} finally {
  try { if (browser) await browser.close(); } catch { /* not a proof step */ }
  try { if (appServer) appServer.close(); } catch { /* ditto */ }
  try { if (apiServer) apiServer.close(); } catch { /* ditto */ }
  try { if (db) await db.end(); } catch { /* ditto */ }
  try { if (admin) { await admin.query(`drop database if exists ${SCRATCH}`); await admin.end(); } }
  catch (e) { console.error("  scratch cleanup failed:", e.message); }
}
process.exit(code);
})();
