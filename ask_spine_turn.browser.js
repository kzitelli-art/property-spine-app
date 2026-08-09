#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   THE ASK SPINE TURN — IN A REAL BROWSER

   Chromium loads the SHIPPED index.html, types into the SHIPPED
   composer, and talks to a REAL Express server running the SHIPPED
   routes against a REAL Postgres. Nothing is stubbed but the session
   token, which is issued by the real staff-session service.

     B1  Capability 1 — completion proof, honestly unavailable here
     B2  Capability 2 — assignment and acceptance, over OBLIGATIONS
     B3  ambiguity — Spine asks instead of guessing
     B4  the frontier — "what's blocked?" tells the truth
     B5  a source failure never renders as an empty result
     B6  no fixture fallback with no session

   ⚠ ISOLATED POSTGRES ONLY — run through
     property-spine-api/tools/build1/run_isolated.sh.
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const crypto = require("crypto");
const express = require("/home/user/property-spine-api/node_modules/express");
const { chromium } = require("/home/user/property-spine-api/node_modules/playwright");
const { Pool } = require("/home/user/property-spine-api/node_modules/pg");

const API = "/home/user/property-spine-api";
const APP = __dirname;
const URL_DB = process.env.BROWSER_DATABASE_URL;

let pass = 0, fail = 0;
const ok = (l, c, d) => { if (c) { pass++; console.log("  ok    " + l); }
  else { fail++; console.log("  FAIL  " + l + (d ? "\n          → " + d : "")); } return c; };
const sec = (t) => console.log(`\n${"═".repeat(70)}\n  ${t}\n${"═".repeat(70)}`);

const ID = (n) => crypto.createHash("md5").update("br:" + n).digest("hex")
  .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*$/, "$1-$2-$3-$4-$5");
const ORG = ID("org"), PROP = ID("prop"), ALICE = ID("alice");

(async function main() {
  if (!URL_DB) { console.error("REFUSED: BROWSER_DATABASE_URL is not set."); process.exit(1); }
  const fs = require("fs");
  const pool = new Pool({ connectionString: URL_DB, max: 6 });
  const c = await pool.connect();

  for (const m of ["141_ask_spine_read_receipts.sql",
                   "142_obligation_acceptance_cannot_be_orphaned.sql",
                   "143_ask_spine_interpretations.sql"]) {
    // eslint-disable-next-line no-await-in-loop
    await c.query(fs.readFileSync(path.join(API, "migrations", m), "utf8"));
  }
  await c.query(`insert into organizations (id,name) values ($1,'Br') on conflict do nothing`, [ORG]);
  await c.query(`insert into properties (id,name,organization_id) values ($1,'Br Prop',$2)
                 on conflict (id) do nothing`, [PROP, ORG]);
  await c.query(`insert into users (id,name,phone,role)
                 values ($1,'Alice','+15005554001','maintenance') on conflict (id) do nothing`, [ALICE]);
  await c.query(`insert into property_team_assignments
                   (user_id,property_id,role_title,allowed_modules,active)
                 values ($1,$2,'Technician',array['maintenance'],true)
                 on conflict do nothing`, [ALICE, PROP]);
  const wo = ID("wo1");
  await c.query(`insert into work_orders (id,property_id,title,status,source)
                 values ($1,$2,'browser fixture','open','brproof')`, [wo, PROP]);
  const o1 = (await c.query(
    `insert into obligations (property_id,related_id,related_type,module,type,label,assigned_user_id,status)
     values ($1,$2,'work_order','maintenance','work_order_routing','route',$3,'open') returning id`,
    [PROP, wo, ALICE])).rows[0].id;
  await require(path.join(API, "src/technician/acceptance_service.js")).acceptWork(c, {
    obligation_id: o1, user_id: ALICE, organization_id: ORG, acceptance_key: "br-1" });
  await c.query(
    `insert into obligations (property_id,related_id,related_type,module,type,label,status)
     values ($1,$2,'work_order','maintenance','proof_evaluation_missing','defect','open')`, [PROP, wo]);

  //  THE REAL API
  const api = express();
  api.use(express.json());
  api.use((req, res, next) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "content-type,x-staff-session,x-request-id");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  });
  api.use("/", require(path.join(API, "src/agent/ask_spine.js"))({ pool }));
  const apiServer = await new Promise((r) => { const s = api.listen(0, () => r(s)); });
  const apiPort = apiServer.address().port;

  //  THE SHIPPED APP, served as a static file
  const web = express();
  web.use(express.static(APP));
  const webServer = await new Promise((r) => { const s = web.listen(0, () => r(s)); });
  const webPort = webServer.address().port;

  const staffSessions = require(path.join(API, "src/identity/staff_session_service.js"));
  const issued = await staffSessions.issueStaffSession(pool, {
    userId: ALICE, propertyId: PROP, purpose: "bootstrap_invite" });

    //  The pre-installed browser, launched by path. The API's playwright
  //  build number does not match what is on disk, and downloading one is
  //  both unnecessary and forbidden in this environment.
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  page.on("pageerror", (e) => console.log("      [pageerror] " + e.message));

  console.log("ASK SPINE IN A REAL BROWSER\n");

  /*  The shipped app pins its origin to production and holds the token
   *  inside a sealed closure — there is deliberately no setter. So the
   *  APP IS NOT MODIFIED AT ALL: the network is intercepted and proxied
   *  to the real local API, and the session is planted in the same
   *  sessionStorage key the loader restores from. Every line of app code
   *  that runs is the shipped line. */
  const PROD = "https://property-spine-api.onrender.com";
  await page.route(`${PROD}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const r = await fetch(`http://127.0.0.1:${apiPort}${url.pathname}${url.search}`, {
      method: req.method(),
      headers: { ...req.headers(), host: `127.0.0.1:${apiPort}` },
      body: ["GET", "HEAD"].includes(req.method()) ? undefined : req.postData(),
    });
    const body = await r.text();
    await route.fulfill({ status: r.status,
      headers: { "content-type": r.headers.get("content-type") || "application/json",
                 "access-control-allow-origin": "*" },
      body });
  });

  const boot = async (withSession = true) => {
    await page.goto(`http://127.0.0.1:${webPort}/index.html`, { waitUntil: "domcontentloaded" });
    await page.evaluate(({ token, useSession }) => {
      //  The same key the sealed loader restores a session from.
      try {
        if (useSession) {
          sessionStorage.setItem("__ps_staff_session__",
            JSON.stringify({ t: token, m: { property_id: null, role_title: "Technician" } }));
        } else {
          sessionStorage.removeItem("__ps_staff_session__");
        }
      } catch (e) { /* */ }
    }, { token: issued.session_token, useSession: withSession });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    //  Dismiss the entry gate and render the block directly. The
    //  surrounding dashboard needs data this proof deliberately does not
    //  fabricate, and the gate is the app's own sign-in modal — the
    //  SESSION is real either way, planted in the same storage key the
    //  sealed loader restores from. Nothing about the Ask Spine block's
    //  own behaviour is altered.
    await page.evaluate(() => {
      try { window.egHide && window.egHide(); } catch (e) { /* */ }
      try { window.renderAskSpine && window.renderAskSpine(); } catch (e) { /* */ }
    });
    await page.waitForTimeout(150);
  };

  const askInBrowser = async (q) => {
    await page.fill("#askSpineInput", q);
    await page.click(".as-send");
    await page.waitForFunction(
      () => { const t = document.getElementById("askSpineTurn");
              return t && t.innerHTML && !/Reading governed truth/.test(t.innerHTML); },
      { timeout: 15000 });
    return page.evaluate(() => document.getElementById("askSpineTurn").innerText);
  };

  /* ═══ THE COMPOSER EXISTS ═══════════════════════════════════════ */
  sec("the composer, in the shipped surface");
  await boot(true);
  {
    const hasInput = await page.locator("#askSpineInput").count();
    ok("B0  a real text input is present in the Ask Spine block", hasInput === 1, String(hasInput));
    const pages = await page.locator("#askSpineMount").count();
    ok("B0b …in the EXISTING surface, not a second Ask Spine page", pages === 1);
  }

  /* ═══ B2 · CAPABILITY 2 ═════════════════════════════════════════ */
  sec("B2 · who is assigned, and have they accepted");
  {
    const text = await askInBrowser("Who is assigned to maintenance work and has accepted it?");
    ok("B2.1 the browser shows what Spine UNDERSTOOD",
       /Understood as: ownership and acceptance/i.test(text), text.slice(0, 120));
    ok("B2.2 …and a governed answer in assigned/accepted language",
       /current maintenance obligations/i.test(text) &&
       /(assigned and accepted|unassigned|not yet accepted)/i.test(text), text.slice(0, 200));
    ok("B2.3 …naming no owner and no accountability",
       !/\bowns\b/i.test(text) && !/accountable/i.test(text), text);
    ok("B2.4 …with obligation records, not fake work-order owners",
       /work order routing|proof evaluation missing/i.test(text), text.slice(0, 300));
    console.log("        ─ browser text ─");
    console.log(text.split("\n").filter(Boolean).slice(0, 6).map((l) => "        " + l).join("\n"));
  }

  /* ═══ B1 · CAPABILITY 1 ═════════════════════════════════════════ */
  sec("B1 · completion proof — honestly unavailable without the cutover");
  {
    const text = await askInBrowser("Which completed work doesn't have valid proof?");
    ok("B1.1 Spine says what it understood",
       /Understood as: completion without valid proof/i.test(text), text.slice(0, 120));
    ok("B1.2 …and admits it cannot determine proof yet",
       /can't answer that from governed truth/i.test(text), text.slice(0, 200));
    ok("B1.3 …rather than showing zero results as an answer",
       !/^0\b/.test(text.trim()) && !/no completed work orders lack/i.test(text),
       "Release 0 is unactivated in this database — a confident zero here would be " +
       "the exact false-empty the architecture exists to prevent");
    console.log(`        → ${text.split("\n").filter(Boolean).slice(0, 2).join(" | ")}`);
  }

  /* ═══ B3 · AMBIGUITY ════════════════════════════════════════════ */
  sec("B3 · ambiguity — Spine asks instead of guessing");
  {
    const text = await askInBrowser("What's wrong with maintenance?");
    ok("B3.1 it asks which was meant", /which did you mean/i.test(text), text.slice(0, 160));
    const chips = await page.locator("#askSpineTurn .as-choices .as-chip").count();
    ok("B3.2 …offering BOTH supported readings as choices", chips === 2, String(chips));
    ok("B3.3 …and shows no records for a question it did not answer",
       (await page.locator("#askSpineTurn .as-recs .as-rec").count()) === 0);

    //  Choosing a reading executes that contract.
    await page.locator("#askSpineTurn .as-choices .as-chip").nth(1).click();
    await page.waitForFunction(
      //  Wait for the ANSWER, not merely for the question to disappear —
      //  the intermediate "Reading governed truth…" satisfies the weaker
      //  condition and the assertion then reads a half-finished turn.
      () => /Understood as:/i.test(document.getElementById("askSpineTurn").innerText),
      { timeout: 15000 });
    const after = await page.evaluate(() => document.getElementById("askSpineTurn").innerText);
    ok("B3.4 picking a reading runs that governed contract",
       /Understood as:/i.test(after), after.slice(0, 140));
    console.log(`        → ${after.split("\n").filter(Boolean).slice(0, 2).join(" | ")}`);
  }

  /* ═══ B4 · THE FRONTIER ═════════════════════════════════════════ */
  sec("B4 · the frontier — what Spine cannot answer, said plainly");
  {
    const text = await askInBrowser("What's blocked right now?");
    ok("B4.1 it refuses rather than answering from a stale onset",
       /can't answer that yet/i.test(text), text.slice(0, 200));
    ok("B4.2 …and says WHY, in operating terms",
       /governed onset but no governed resolution/i.test(text), text.slice(0, 240));
    ok("B4.3 …with no records and no counts",
       (await page.locator("#askSpineTurn .as-recs .as-rec").count()) === 0);
    console.log(`        → ${text.split("\n").filter(Boolean)[0]}`);
  }

  /* ═══ B5 · A SOURCE FAILURE ═════════════════════════════════════ */
  sec("B5 · a source failure is not an empty result");
  {
    await c.query(`alter table obligations rename to _hidden_obl`);
    const text = await askInBrowser("Who is assigned to maintenance work?");
    await c.query(`alter table _hidden_obl rename to obligations`);
    ok("B5.1 the browser shows a failure, not a clean zero",
       /could not complete|can't determine|can't answer/i.test(text), text.slice(0, 200));
    ok("B5.2 …and renders no records",
       (await page.locator("#askSpineTurn .as-recs .as-rec").count()) === 0);
    console.log(`        → ${text.split("\n").filter(Boolean)[0]}`);
  }

  /* ═══ B6 · NO SESSION, NO FIXTURES ══════════════════════════════ */
  sec("B6 · no session → no Ask Spine, and never fixture data");
  {
    await boot(false);
    const mountHtml = await page.evaluate(() =>
      (document.getElementById("askSpineMount") || {}).innerHTML || "");
    ok("B6.1 the block renders nothing without a live session",
       mountHtml.trim() === "", mountHtml.slice(0, 120));
    ok("B6.2 …so there is no composer to type a fixture answer into",
       (await page.locator("#askSpineInput").count()) === 0);
  }

  sec("VERDICT");
  console.log(`  passed ${pass}   failed ${fail}\n`);
  await browser.close();
  apiServer.close(); webServer.close();
  c.release(); await pool.end();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("\nERROR:\n" + (e && e.stack || e)); process.exit(1); });
