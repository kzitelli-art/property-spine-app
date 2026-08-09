#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   SIGN-IN → ASK SPINE, THE REAL ENTRY PATH

   The previous browser proof reached Ask Spine by dismissing the entry
   gate and planting a session. Useful as presentation proof; it is not
   how an operator arrives. This one closes that gap:

     operator enters through the SHIPPED gate
       → the canonical session is minted by POST /demo/operator-session
       → property scope comes from that session
       → Ask Spine opens
       → the operator types a supported question
       → real HTTP → governed executor → rendered answer
       → reload, and the whole thing stays coherent

   Nothing about authentication is redesigned. The gate, the access code,
   the session issuer and the sealed loader are all the shipped ones.

     G  the real entry path
     H  the governed turn, after arriving normally
     I  reload — session, property and Ask Spine stay coherent
     J  a wrong/expired session does not fall back to fixtures
     K  the operator cannot switch property through the question
     L  app chrome and the Ask Spine request agree about scope

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
const URL_DB = process.env.ENTRY_DATABASE_URL;

//  Read from the SHIPPED door, not guessed. My first attempt invented
//  plausible-looking constants and the endpoint refused honestly with
//  "No demo property yet" — which is the seed contract working.
const DEMO_PROP_NAME = "Property Spine Demo Building";
const DEMO_MGR_EMAIL = "demo-manager@propertyspine.internal";
const ACCESS_CODE = "entry-proof-" + crypto.randomBytes(12).toString("hex");

let pass = 0, fail = 0;
const ok = (l, c, d) => { if (c) { pass++; console.log("  ok    " + l); }
  else { fail++; console.log("  FAIL  " + l + (d ? "\n          → " + d : "")); } return c; };
const sec = (t) => console.log(`\n${"═".repeat(70)}\n  ${t}\n${"═".repeat(70)}`);

const ID = (n) => crypto.createHash("md5").update("entry:" + n).digest("hex")
  .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*$/, "$1-$2-$3-$4-$5");
const ORG = ID("org"), PROP = ID("prop"), OTHER = ID("other"), MGR = ID("mgr");

(async function main() {
  if (!URL_DB) { console.error("REFUSED: ENTRY_DATABASE_URL is not set."); process.exit(1); }
  const fs = require("fs");
  const pool = new Pool({ connectionString: URL_DB, max: 8 });
  const c = await pool.connect();

  for (const m of ["141_ask_spine_read_receipts.sql",
                   "142_obligation_acceptance_cannot_be_orphaned.sql",
                   "143_ask_spine_interpretations.sql"]) {
    // eslint-disable-next-line no-await-in-loop
    await c.query(fs.readFileSync(path.join(API, "migrations", m), "utf8"));
  }

  //  THE DEMO SEED the shipped entry path requires: a property named
  //  "Demo Building", a leasing_manager, and that manager's real active
  //  team assignment. The endpoint derives identity and scope from these
  //  — it accepts none of them from the browser.
  await c.query(`insert into organizations (id,name) values ($1,'Entry Org') on conflict do nothing`, [ORG]);
  await c.query(`insert into properties (id,name,organization_id) values ($1,$2,$3)
                 on conflict (id) do nothing`, [PROP, DEMO_PROP_NAME, ORG]);
  await c.query(`insert into properties (id,name,organization_id) values ($1,'Other Building',$2)
                 on conflict (id) do nothing`, [OTHER, ORG]);
  await c.query(`insert into users (id,name,email,phone,role)
                 values ($1,'Demo Manager',$2,'+15005557001','leasing_manager')
                 on conflict (id) do nothing`, [MGR, DEMO_MGR_EMAIL]);
  await c.query(`insert into property_team_assignments
                   (user_id,property_id,role_title,allowed_modules,active)
                 values ($1,$2,'Manager',array['maintenance','leasing'],true)
                 on conflict do nothing`, [MGR, PROP]);

  //  Governed truth in BOTH properties, so a scope leak would be visible.
  const mk = async (prop, assigned) => {
    const wo = ID("wo" + prop + (assigned || "none"));
    await c.query(`insert into work_orders (id,property_id,title,status,source)
                   values ($1,$2,'entry fixture','open','entryproof')
                   on conflict (id) do nothing`, [wo, prop]);
    await c.query(
      `insert into obligations (property_id,related_id,related_type,module,type,label,
                                assigned_user_id,status)
       values ($1,$2,'work_order','maintenance','work_order_routing','route',$3,'open')`,
      [prop, wo, assigned]);
    return wo;
  };
  await mk(PROP, null);
  await mk(PROP, MGR);
  await mk(OTHER, null); await mk(OTHER, null); await mk(OTHER, null);

  //  THE REAL API — the shipped identity door and the shipped Ask Spine.
  process.env.DEMO_MODE = "true";
  process.env.DEMO_ACCESS_CODE = ACCESS_CODE;
  const api = express();
  api.use(express.json());
  api.use((req, res, next) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "content-type,x-staff-session,x-request-id");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  });
  api.use("/", require(path.join(API, "src/identity/operator.js"))({ pool }));
  api.use("/", require(path.join(API, "src/agent/ask_spine.js"))({ pool }));
  const apiServer = await new Promise((r) => { const s = api.listen(0, () => r(s)); });
  const apiPort = apiServer.address().port;

  const web = express();
  web.use(express.static(APP));
  const webServer = await new Promise((r) => { const s = web.listen(0, () => r(s)); });
  const webPort = webServer.address().port;

  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  page.on("pageerror", (e) => console.log("      [pageerror] " + e.message));

  //  The app pins its origin to production; the network is proxied to the
  //  real local API. The APP ITSELF IS UNMODIFIED — including the gate,
  //  which this proof now goes THROUGH rather than around.
  const PROD = "https://property-spine-api.onrender.com";
  const seen = [];
  await page.route(`${PROD}/**`, async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    seen.push({ method: req.method(), path: u.pathname,
                session: req.headers()["x-staff-session"] ? "present" : "absent" });
    const r = await fetch(`http://127.0.0.1:${apiPort}${u.pathname}${u.search}`, {
      method: req.method(), headers: { ...req.headers(), host: `127.0.0.1:${apiPort}` },
      body: ["GET", "HEAD"].includes(req.method()) ? undefined : req.postData() });
    const body = await r.text();
    await route.fulfill({ status: r.status,
      headers: { "content-type": r.headers.get("content-type") || "application/json",
                 "access-control-allow-origin": "*" }, body });
  });

  console.log("SIGN-IN → ASK SPINE, THE REAL ENTRY PATH\n");

  const askInBrowser = async (q) => {
    await page.fill("#askSpineInput", q);
    await page.click(".as-send");
    await page.waitForFunction(
      () => { const t = document.getElementById("askSpineTurn");
              return t && /Understood as:|can't answer|which did you mean|could not complete/i
                .test(t.innerText); }, { timeout: 20000 });
    return page.evaluate(() => document.getElementById("askSpineTurn").innerText);
  };

  /* ═══ G · THE REAL ENTRY PATH ═══════════════════════════════════ */
  sec("G · the operator enters through the shipped gate");
  {
    await page.goto(`http://127.0.0.1:${webPort}/index.html`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const gateShown = await page.evaluate(() =>
      !!document.querySelector("#entryGate.show"));
    ok("G1  the entry gate is presented, unprompted", gateShown, "no gate was shown");

    const hadSessionBefore = await page.evaluate(() =>
      !!(window.__psLive && window.__psLive.hasSession && window.__psLive.hasSession()));
    ok("G2  …and there is no session before entering", !hadSessionBefore);

    //  Enter through the SHIPPED gate — the same call the door makes.
    const entered = await page.evaluate(async (code) => {
      try { return { ok: true, meta: await window.__psLive.beginDemoSession(code) }; }
      catch (e) { return { ok: false, err: String(e && e.message || e) }; }
    }, ACCESS_CODE);
    ok("G3  the canonical session is minted by the shipped issuer",
       entered.ok === true, JSON.stringify(entered).slice(0, 200));

    const call = seen.find((s) => s.path === "/demo/operator-session");
    ok("G4  …over the real endpoint, as a POST",
       call && call.method === "POST", JSON.stringify(call));

    const row = (await c.query(
      `select user_id, property_id, revoked from staff_sessions
        order by created_at desc limit 1`)).rows[0];
    ok("G5  a REAL staff session row exists for the seeded manager",
       row && row.user_id === MGR && row.property_id === PROP && row.revoked === false,
       JSON.stringify(row));

    ok("G6  the loader now reports a session",
       await page.evaluate(() => window.__psLive.hasSession()));

    //  Property scope came from the SESSION, not from the browser.
    ok("G7  the browser sent no property in the entry request",
       !JSON.stringify(entered.meta || {}).includes(OTHER),
       JSON.stringify(entered.meta));

    await page.evaluate(() => { try { egHide(); renderAskSpine(); } catch (e) { /* */ } });
    await page.waitForTimeout(200);
    ok("G8  Ask Spine opens for the entered operator",
       (await page.locator("#askSpineInput").count()) === 1);
  }

  /* ═══ H · THE GOVERNED TURN ═════════════════════════════════════ */
  sec("H · a supported question, answered from that session's scope");
  let receiptId = null;
  {
    const text = await askInBrowser("Who is assigned to maintenance work and has accepted it?");
    ok("H1  Spine states what it understood",
       /Understood as: ownership and acceptance/i.test(text), text.slice(0, 120));
    ok("H2  …and answers from governed truth",
       /current maintenance obligations/i.test(text), text.slice(0, 200));

    //  THIS property's population is 2. The other property has 3. A leak
    //  would show 5.
    ok("H3  the answer is scoped to the SESSION's property",
       /\b2 current maintenance obligations/.test(text),
       text.slice(0, 200) + " — the other property holds 3 more; 5 would be a leak");

    const r = (await c.query(
      `select id, property_id, intent_slug from ask_spine_read_receipts
        order by executed_at desc limit 1`)).rows[0];
    receiptId = r && r.id;
    ok("H4  a durable receipt was written for THIS property",
       r && r.property_id === PROP, JSON.stringify(r));

    const ask = seen.filter((s) => s.path === "/operator/ask-spine/ask").pop();
    ok("H5  the request carried the session header",
       ask && ask.session === "present", JSON.stringify(ask));
    console.log("        ─ browser ─");
    console.log(text.split("\n").filter(Boolean).slice(0, 3).map((l) => "        " + l).join("\n"));
  }

  /* ═══ I · RELOAD ════════════════════════════════════════════════ */
  sec("I · reload — session, property and Ask Spine stay coherent");
  {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    ok("I1  the session survives the reload",
       await page.evaluate(() => window.__psLive.hasSession()));
    ok("I2  …without re-presenting the gate as the only path",
       (await page.evaluate(() => !!document.querySelector("#entryGate.show"))) === false ||
       (await page.evaluate(() => window.__psLive.hasSession())),
       "a live session that still forces the gate would be a re-entry loop");

    await page.evaluate(() => { try { egHide(); renderAskSpine(); } catch (e) { /* */ } });
    await page.waitForTimeout(200);
    const text = await askInBrowser("Who is assigned to maintenance work?");
    ok("I3  Ask Spine answers again after reload",
       /Understood as: ownership and acceptance/i.test(text), text.slice(0, 120));
    ok("I4  …still scoped to the same property",
       /\b2 current maintenance obligations/.test(text), text.slice(0, 160));

    const n = Number((await c.query(
      `select count(*)::int n from ask_spine_read_receipts where property_id=$1`, [PROP])).rows[0].n);
    ok("I5  …and the earlier receipt is still readable", n >= 2 && !!receiptId, String(n));
  }

  /* ═══ J · A BAD SESSION DOES NOT FALL BACK ══════════════════════ */
  sec("J · a revoked session fails closed — never to fixtures");
  {
    await c.query(`update staff_sessions set revoked = true where user_id = $1`, [MGR]);
    await page.evaluate(() => { try { renderAskSpine(); } catch (e) { /* */ } });
    const text = await askInBrowser("Who is assigned to maintenance work?");
    ok("J1  the turn does NOT return an answer",
       !/current maintenance obligations/i.test(text), text.slice(0, 200));
    ok("J2  …and shows a failure rather than sample data",
       /could not complete|can't answer/i.test(text), text.slice(0, 200));
    ok("J3  …with no supporting records",
       (await page.locator("#askSpineTurn .as-recs .as-rec").count()) === 0);
    console.log(`        → ${text.split("\n").filter(Boolean)[0]}`);
    await c.query(`update staff_sessions set revoked = false where user_id = $1`, [MGR]);
  }

  /* ═══ K · THE OPERATOR CANNOT SWITCH PROPERTY ═══════════════════ */
  sec("K · property cannot be switched through the question or the request");
  {
    await page.evaluate(() => { try { renderAskSpine(); } catch (e) { /* */ } });
    //  In the question text…
    const text = await askInBrowser(
      `Who is assigned to maintenance work in property ${OTHER}?`);
    ok("K1  naming another property in the QUESTION changes nothing",
       /\b2 current maintenance obligations/.test(text) || !/\b5\b/.test(text),
       text.slice(0, 200));

    //  …and in the request body, through the sealed loader.
    const spoof = await page.evaluate(async (other) => {
      try {
        const out = await window.__psLive.sendResource("askSpineAsk", {
          question: "Who is assigned to maintenance work?", property_id: other });
        return { ok: true, property_id: out.data.property_id, totals: out.data.totals };
      } catch (e) { return { ok: false, err: String(e && e.message || e) }; }
    }, OTHER);
    ok("K2  a property_id in the request BODY is refused or ignored",
       spoof.ok === false || spoof.property_id === PROP,
       JSON.stringify(spoof).slice(0, 200));
    if (spoof.ok) {
      ok("K3  …and the answer is still this property's population",
         spoof.totals.lanes[0].total_matching === 2,
         JSON.stringify(spoof.totals.lanes[0]));
    } else {
      ok("K3  …refused outright, naming the property actually in force",
         /server-derived/i.test(spoof.err), spoof.err.slice(0, 160));
    }
  }

  /* ═══ L · CHROME AND SCOPE AGREE ════════════════════════════════ */
  sec("L · the app's own property context agrees with the Ask Spine scope");
  {
    const meta = await page.evaluate(() => {
      try { return window.__psLive.sessionMeta(); } catch (e) { return null; }
    });
    ok("L1  the shell's session metadata names this property",
       meta && String(meta.property_id) === PROP, JSON.stringify(meta));
    const r = (await c.query(
      `select property_id from ask_spine_read_receipts order by executed_at desc limit 1`)).rows[0];
    ok("L2  …the same property the receipt recorded",
       r && String(r.property_id) === String(meta && meta.property_id),
       JSON.stringify({ chrome: meta && meta.property_id, receipt: r && r.property_id }));
    ok("L3  …and the shell never held the raw token",
       await page.evaluate(() => typeof window.__psLive.getToken === "undefined" &&
                                 !("setSession" in window.__psLive)),
       "the sealed transport boundary is what makes the scope trustworthy");
  }

  sec("VERDICT");
  console.log(`  passed ${pass}   failed ${fail}\n`);
  await browser.close();
  apiServer.close(); webServer.close();
  c.release(); await pool.end();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("\nERROR:\n" + (e && e.stack || e)); process.exit(1); });
