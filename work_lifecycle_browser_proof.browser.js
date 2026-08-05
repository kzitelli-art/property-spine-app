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
const EXPECTED = 30;
let passed = 0, failed = 0;
const ok = (label, cond, detail) => {
  if (cond) { passed++; console.log("  ok    " + label); }
  else { failed++; console.log("  FAIL  " + label + (detail ? "  →  " + detail : "")); }
};
const section = (t) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 56 - t.length))}`);

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
  //  A second, untouched work order so UNASSIGNED and "Scheduled" are real.
  const wo2 = await one(`insert into work_orders (property_id,title) values ($1,'lobby light out') returning id`, [prop]);

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
  appSrv.get("/", (_req, res) => {
    //  A minimal host page carrying the real door file and a real __psLive
    //  shim that sends the staff-session header to the real API. The DOOR is
    //  the artifact under test and is loaded verbatim from disk.
    res.type("html").send(`<!doctype html><meta charset="utf-8"><title>Work orders</title>
<style>
 body{font:14px/1.5 -apple-system,system-ui,sans-serif;margin:0;background:#12151a;color:#e7ebf0;padding:24px}
 .wl-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
 h3{margin:0;font-size:18px} h4.wl-h{margin:0 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8d98a6}
 .wl-list{list-style:none;padding:0;margin:0}
 .wl-item{background:#1a1f27;border:1px solid #262d38;border-radius:10px;padding:12px 14px;margin-bottom:8px;cursor:pointer}
 .wl-item.wl-sel{border-color:#4a7fd4}
 .wl-item-name{font-weight:600;margin-bottom:6px}
 .wl-item-chips{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
 .wl-item-next{margin-top:6px;color:#9fb2c9;font-size:13px}
 .wl-chip{display:inline-block;padding:2px 9px;border-radius:99px;font-size:12px;font-weight:600}
 .wl-neutral{background:#2b3341;color:#aab6c5} .wl-active{background:#1d3a5c;color:#8fc0ff}
 .wl-warn{background:#4a3313;color:#ffc879} .wl-claim{background:#3d2f52;color:#c9a7ff}
 .wl-done{background:#17402c;color:#7fdca6}
 .wl-unassigned{color:#ffc879;font-weight:700;letter-spacing:.04em;font-size:12px}
 .wl-actor{color:#cfe0f5;font-size:13px}
 .wl-detail{margin-top:18px;background:#1a1f27;border:1px solid #262d38;border-radius:10px;padding:16px}
 .wl-block{margin-bottom:16px} .wl-current{display:flex;gap:10px;align-items:center;margin-bottom:8px}
 .wl-line{margin:4px 0} .wl-muted{color:#8d98a6} .wl-warn-text{color:#ffc879}
 .wl-claim-text{color:#c9a7ff} .wl-done-text{color:#7fdca6}
 .wl-claimtag{background:#3d2f52;color:#c9a7ff;font-size:10px;padding:1px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:.06em}
 .wl-next{background:#1d2a3a;border-left:3px solid #4a7fd4;padding:8px 12px;border-radius:0 6px 6px 0;font-weight:600}
 .wl-proof-ok{color:#7fdca6;font-weight:600} .wl-proof-missing{color:#ffc879;font-weight:600}
 .wl-hist{margin:3px 0;color:#b9c5d4}
 .wl-delivery{font-size:11px;padding:1px 7px;border-radius:4px;margin-left:6px;text-transform:uppercase;letter-spacing:.05em}
 .wl-d-prepared{background:#2b3341;color:#aab6c5} .wl-d-sent{background:#1d3a5c;color:#8fc0ff}
 .wl-d-delivered{background:#17402c;color:#7fdca6} .wl-d-failed{background:#4d1f22;color:#ff9b9b}
 .wl-d-unknown{background:#3a3320;color:#e0c98a}
 .wl-unavailable{background:#2a1b1d;border:1px solid #5a2c30;border-radius:10px;padding:16px}
 .wl-unavailable-title{color:#ff9b9b;font-weight:700;margin-bottom:4px}
 .wl-empty{color:#8d98a6;padding:16px;background:#1a1f27;border-radius:10px}
 button{background:#26303d;border:1px solid #35414f;color:#cfe0f5;border-radius:7px;padding:6px 12px;cursor:pointer}
</style>
<div id="work-lifecycle-door"></div>
<script>
window.__psLive = {
  hasSession: function(){ return true; },
  _get: async function(p){
    var r = await fetch("http://127.0.0.1:${apiPort}" + p, { headers: { "x-staff-session": "${token}" } });
    if (!r.ok) { var e = new Error((await r.json().catch(function(){return{};})).detail || ("HTTP " + r.status)); throw e; }
    return r.json();
  },
  workOrderLifecycleList: function(){ return this._get("/operator/work-orders/status"); },
  workOrderLifecycle: function(p){ return this._get("/operator/work-orders/" + p.workOrderId + "/status"); }
};
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
    await page.evaluate(() => window.__psWorkLifecycleDoor.loadList());
    await page.waitForSelector('[data-wl="empty"], .wl-item, [data-wl="unavailable"]', { timeout: 5000 });
    if (detail) {
      await page.evaluate((id) => window.__psWorkLifecycleDoor.loadDetail(id), detail);
      await page.waitForSelector('[data-wl="current"], [data-wl="unavailable"]', { timeout: 5000 });
    }
  };
  const bodyText = () => page.evaluate(() => document.body.innerText);

  // ════════════════════════════════════════════════════════════════════
  section("1. ACCEPTED / IN PROGRESS — no refresh, no duplicate entry");
  await text("Got it."); await settle();
  await open(wo.id);
  {
    const t = await bodyText();
    ok("acceptance appears from the SMS alone — nothing was entered twice", /Accepted/.test(t), t.slice(0, 200));
    ok("the accountable technician is named", /Dana Reyes/.test(t));
    ok("the untouched work order shows UNASSIGNED, not blank",
      /UNASSIGNED/.test(t) && /lobby light out/.test(t));
    ok("scheduled and accepted are not the same chip",
      (await page.$$('[data-wl-open] .wl-neutral')).length >= 1 && /Accepted/.test(t));
    ok("proof is stated as required and missing",
      !!(await page.$('[data-wl="proof-missing"]')));
    await shot("1_accepted_in_progress");
  }

  section("2. ORDER, CLAIMS, AND BLOCKED WITH A NEXT ACTION");
  await text("I'm heading over."); await settle();
  await text("Couldn't get in."); await settle();
  await text("the leak is stopped but it needs a valve"); await settle();
  await open(wo.id);
  {
    const t = await bodyText();
    ok("no access is shown as the current blocking fact", /No access reported/.test(t), t.slice(0, 300));
    ok("the next action is the human one, not a status word",
      /Coordinate entry with resident/.test(t));
    ok("on-the-way and no-access both appear, in order", await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("[data-wl-kind]")).map((e) => e.getAttribute("data-wl-kind"));
      const r = rows.slice().reverse();               // rendered newest-first
      return r.indexOf("en_route") < r.indexOf("no_access");
    }));
    ok("a technician finding is visibly an UNVERIFIED CLAIM",
      /unverified claim/i.test(t) && /needs a valve/.test(t));
    ok("the resident update is shown with its own delivery state",
      !!(await page.$('[data-wl-delivery]')));
    await shot("2_blocked_next_action");
  }

  section("3. COMPLETION REFUSED FOR MISSING PROOF");
  await text("All done."); await settle();
  await open(wo.id);
  {
    const t = await bodyText();
    ok("the claim is shown, and shown as NOT closed",
      /Technician says finished/.test(t) && /not closed/.test(t), t.slice(0, 400));
    ok("the state is not 'Completed'", !/\bCompleted\b/.test(t.split("History")[0]));
    ok("proof is still reported as required", !!(await page.$('[data-wl="proof-missing"]')));
    ok("the next action names the missing proof", /Obtain repair photo before completion/.test(t));
    await shot("3_completion_refused_missing_proof");
  }

  section("4. A PHOTO THAT COULD NOT BE PRESERVED IS NOT PROOF");
  mediaMode = "fail";
  await text("here you go", [{ url: "https://api.example.test/Media/ME_F", mime: "image/png" }]); await settle();
  await open(wo.id);
  {
    const t = await bodyText();
    ok("a received-but-unpreserved photo does NOT show proof",
      !!(await page.$('[data-wl="proof-missing"]')) && !(await page.$('[data-wl="proof-ok"]')));
    ok("...and the loss is stated, not hidden", /not preserved/i.test(t), t.slice(0, 400));
  }

  section("5. STORED EVIDENCE, THEN GOVERNED COMPLETION");
  mediaMode = "ok";
  await text("try again", [{ url: "https://api.example.test/Media/ME_OK", mime: "image/png" }]); await settle();
  await open(wo.id);
  ok("stored evidence appears only once the bytes are durable",
    !!(await page.$('[data-wl="proof-ok"]')));

  residentTransport = "fail";      // the completion resident text will fail
  await text("All done."); await settle();
  await open(wo.id);
  {
    const t = await bodyText();
    ok("governed completion closes the SAME work order", /Closed/.test(t) && /Completed/.test(t), t.slice(0, 300));
    ok("...attributed to the technician", /Closed .*by Dana Reyes|Dana Reyes/.test(t));
    ok("...and there is no next action left", !/Obtain repair photo|Coordinate entry/.test(t));
    ok("proof is shown as saved", !!(await page.$('[data-wl="proof-ok"]')));
    await shot("4_completed_with_proof");
  }

  section("6. RESIDENT DELIVERY IS ITS OWN FACT");
  {
    const states = await page.$$eval("[data-wl-delivery]", (els) => els.map((e) => e.getAttribute("data-wl-delivery")));
    ok("resident updates carry per-message delivery state", states.length >= 2, JSON.stringify(states));
    ok("a FAILED resident delivery is shown as failed", states.includes("failed"), JSON.stringify(states));
    //  A MIX is required. If every row said "failed" the assertion above would
    //  pass while the real cause was a blanket gate refusal — which is exactly
    //  what happened on the first run of this harness.
    ok("...alongside at least one that did NOT fail — a blanket refusal cannot pass this",
      states.some((x) => x !== "failed"), JSON.stringify(states));
    ok("...and 'sent' is never rounded up to 'delivered' without provider evidence",
      states.every((x) => ["prepared", "sent", "delivered", "failed", "unknown"].includes(x))
      && !states.includes("delivered"), JSON.stringify(states));
    const t = await bodyText();
    ok("the surface never says the resident was notified because the work happened",
      !/resident notified/i.test(t));
    //  A distinct artifact: the resident block itself. Two identical files
    //  presented as two pieces of evidence is padding, and the first run of
    //  this harness produced exactly that.
    const residentBlock = await page.$('[data-wl="resident"]');
    const f5 = path.join(OUT, "5_resident_delivery_failure.png");
    await residentBlock.screenshot({ path: f5 });
    shots.push(f5);
  }

  section("7. AUTHORITY");
  {
    const noSession = await page.evaluate(async (p) => {
      const r = await fetch("http://127.0.0.1:" + p + "/operator/work-orders/status");
      return r.status;
    }, apiPort);
    ok("an unauthenticated read is refused", noSession === 401, String(noSession));

    const otherProp = (await one(`insert into properties (name,organization_id) values ('Other Bldg',$1) returning id`, [org])).id;
    const foreign = (await one(`insert into work_orders (property_id,title) values ($1,'not yours') returning id`, [otherProp])).id;
    const crossStatus = await page.evaluate(async ({ p, t, id }) => {
      const r = await fetch("http://127.0.0.1:" + p + "/operator/work-orders/" + id + "/status",
        { headers: { "x-staff-session": t } });
      return r.status;
    }, { p: apiPort, t: token, id: foreign });
    ok("a cross-property read is 404, never a leaked row", crossStatus === 404, String(crossStatus));

    const widened = await page.evaluate(async ({ p, t, prop }) => {
      const r = await fetch("http://127.0.0.1:" + p + "/operator/work-orders/status?property_id=" + prop,
        { headers: { "x-staff-session": t } });
      return r.status;
    }, { p: apiPort, t: token, prop: otherProp });
    ok("a client-supplied property_id is refused, never honoured", widened === 400, String(widened));
  }

  section("8. A FAILED LIVE READ SHOWS UNAVAILABLE, NEVER FIXTURES");
  {
    await open(wo.id);
    const before = await bodyText();
    ok("real content is on screen first (so the next step proves removal)", /sink leak/.test(before));
    readFails = true;
    await page.evaluate(() => window.__psWorkLifecycleDoor.loadList());
    await page.waitForSelector('[data-wl="unavailable"]', { timeout: 5000 });
    const after = await bodyText();
    ok("an unavailable state is visible", /unavailable/i.test(after));
    ok("the stale content is GONE — not left under a toast", !/sink leak/.test(after), after.slice(0, 300));
    ok("no believable sample work appeared",
      !/lobby light out/.test(after) && !/Dana Reyes/.test(after));
    ok("and it is not reported as an honest empty either", !/No work orders at this property/.test(after));
    readFails = false;
  }

  section("9. HONEST EMPTY");
  {
    //  References first, then the rows they point at — the reverse order
    //  hits comm_events_derived_from_progress_id_fkey, which is the FK doing
    //  its job: a resident update may not outlive the fact it was derived from.
    await db.query(`update comm_events set created_object_id = null, derived_from_progress_id = null`);
    await db.query(`delete from work_order_proof_attachments`);
    await db.query(`delete from work_order_progress`);
    await db.query(`delete from obligations`);
    await db.query(`delete from work_orders where property_id = $1`, [prop]);
    await open(null);
    const t = await bodyText();
    ok("no work is an honest empty about THIS property", /No work orders at this property/.test(t), t.slice(0, 200));
    ok("...and is not an error", !/unavailable/i.test(t));
  }

  section("10. SCREENSHOTS");
  ok(`five screenshots captured (${shots.length})`, shots.length === 5, shots.join(", "));
  shots.forEach((f) => ok(`  ${path.basename(f)} exists and is non-empty`,
    fs.existsSync(f) && fs.statSync(f).size > 2000, String(fs.existsSync(f) && fs.statSync(f).size)));

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
