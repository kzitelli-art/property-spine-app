/* ════════════════════════════════════════════════════════════════════
   asset_management_shell.browser.js — THE ASSET MANAGEMENT DOOR,
   VERIFIED IN A REAL BROWSER against the real index.html and the real
   API router.

   Asset Management is the FOURTH operating door. §33 says browser
   verification is part of "done" for an operator workflow, so this is
   not optional decoration.

   ── WHAT THIS PROOF REFUSES TO REPEAT ───────────────────────────────
   Every assertion style here was earned by a real miss in this repo:

   · RENDERED IS NOT VISIBLE. A browser proof once passed 13/13 while the
     browser showed the sign-in screen, and Deal Setup shipped writing
     every message into an element that sat UNDERNEATH a fixed overlay —
     real box, display:block, perfect innerText, invisible. So visibility
     is asked of the DOCUMENT: elementFromPoint at the element's centre
     must return that element or something inside it.

   · SCOPE EVERY SELECTOR. In a full-screen-overlay app an unscoped
     selector is a coin flip — button:has-text('Review') once matched a
     button in the shell BENEATH the panel. Everything here is scoped to
     the desk's own mount, #intelStrip.

   · ENTER THE WAY THE OPERATOR ENTERS. A surface is not shipped until
     the proof reaches it through the real route. This clicks the real
     Asset Management desk card on Home; it never calls
     window.__psAssetManagement.mount() to get in.

   · ASSERT THE APP ACTUALLY LOADED before believing anything else.

   ── AND THE ONE THIS SLICE ADDS ─────────────────────────────────────
   NO FABRICATED ECONOMICS. The whole point of the shell is that it does
   not invent dollars, so the proof reads the RENDERED TEXT of the desk
   and fails on any currency-shaped token. That is the assertion that
   stops "make the screens look complete" creeping in later.

   Run:
     HARNESS_DATABASE_URL=postgresql://postgres@127.0.0.1:5433/postgres \
       node asset_management_shell.browser.js
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const http = require("http");
const { serveStatic, serveTls } = require("./tools/browser_stack.js");

//  THIS REPO IS A STATIC SITE. It tracks no package.json and no lockfile,
//  deliberately — it is published as static files. So every Node dependency
//  this proof needs (playwright, pg, express) is resolved from the API
//  repo's node_modules, where playwright IS a declared devDependency with a
//  lockfile entry. Running `npm install` here would create an npm footprint
//  in a repo that has never had one.
//
//  ⚠ RECORDED, NOT FIXED: the older browser proofs in this repo
//  (deal_setup_opening_tenancy, work_lifecycle_browser_proof, …) still
//  `require("playwright")` bare, which only resolves if someone has
//  installed it here by hand — the exact manual step THREAD_HANDOFF says
//  release evidence must not depend on. That is a pre-existing
//  inconsistency across several files and is not repaired inside an Asset
//  Management slice.
const API_REPO = path.join(__dirname, "..", "property-spine-api");
const { chromium } = require(path.join(API_REPO, "node_modules", "playwright"));

const DB = process.env.HARNESS_DATABASE_URL;
if (!DB) { console.error("REFUSED: HARNESS_DATABASE_URL is required."); process.exit(2); }
if (/prod|neon\.tech|render\.com/i.test(DB)) {
  console.error("REFUSED: HARNESS_DATABASE_URL looks like a real deployment target."); process.exit(2);
}

const APP_DIR = __dirname;
const OUT = process.env.SHOTS || "/tmp/am-browser";
const PROD = "https://property-spine-api.onrender.com";
const APP_PORT = 8300 + (process.pid % 400);
const TLS_PORT = 9800 + (process.pid % 300);
const SESSION = "am-browser-token";

let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log("  ok    " + label); }
  else { fail++; console.log("  FAIL  " + label + (detail ? "\n        " + detail : "")); }
  return cond;
};

//  Broad on purpose: a bare integer is fine, a currency symbol or a
//  thousands-separated / two-decimal number in an economics surface with
//  no economics is a fabricated magnitude.
const CURRENCYISH = /[$£€]\s?\d|\d{1,3}(,\d{3})+(\.\d{2})?|\b\d+\.\d{2}\b/;

async function main() {
  require("fs").mkdirSync(OUT, { recursive: true });
  const { Pool } = require(path.join(API_REPO, "node_modules", "pg"));
  const pool = new Pool({ connectionString: DB });
  const schema = "am_browser_" + Date.now();

  let apiServer, staticServer, tlsServer, browser;

  try {
    await pool.query(`create schema ${schema}`);
    await pool.query(`
      create extension if not exists pgcrypto;
      set search_path to ${schema};
      create table properties (id uuid primary key default gen_random_uuid(), name text, organization_id uuid);
      create table spaces (id uuid primary key default gen_random_uuid(), property_id uuid references properties(id));
      create table leases (
        id uuid primary key default gen_random_uuid(),
        property_id uuid not null references properties(id),
        space_id uuid references spaces(id),
        rent numeric(10,2), start_date date, end_date date,
        lease_status text not null default 'active');
    `);
    const propId = (await pool.query(
      `insert into ${schema}.properties (name) values ('Solo on Chestnut') returning id`)).rows[0].id;
    //  A REAL economic position, so Revenue is genuinely partially
    //  established and the desk has something true to say. Its amount
    //  must still never reach the screen.
    await pool.query(
      `insert into ${schema}.leases (property_id, rent, start_date, end_date, lease_status)
       values ($1, 1850.00, '2026-01-01', '2026-12-31', 'active')`, [propId]);

    // ── GOVERNED INSURANCE TRUTH, established through the CANONICAL
    //    SERVICES — never by inserting rows behind them. This slice has no
    //    HTTP establishment door by design, so the services ARE the write
    //    path, and a proof that bypassed them would be proving a shape
    //    rather than the writer that has to produce it.
    await pool.query(`set search_path to ${schema}`);
    await pool.query(`
      set search_path to ${schema};
      create table users (id uuid primary key default gen_random_uuid(), name text);
      create table deal_intakes (id uuid primary key default gen_random_uuid());
      create table deal_intake_properties (
        id uuid primary key default gen_random_uuid(),
        intake_id uuid, property_id uuid, status text not null default 'current');
      create table source_artifacts (
        id uuid primary key default gen_random_uuid(),
        scope_type text, scope_id uuid,
        original_filename text not null, mime_type text,
        artifact_kind text not null default 'other',
        byte_size bigint, sha256 text, content bytea,
        stored_at timestamptz default now(),
        uploaded_at timestamptz not null default now(),
        source_as_of_date date,
        uploaded_by_user_id uuid, uploaded_by_basis text);
    `);
    {
      const fs2 = require("fs");
      let mig = fs2.readFileSync(
        path.join(API_REPO, "migrations", "161_insurance_economic_truth.sql"), "utf8");
      mig = mig.replace(/^begin;\s*/m, "").replace(/commit;\s*$/m, "")
               .replace(/alter table source_artifacts[\s\S]*?;\s*$/m, "");
      //  162 is part of the insurance schema now: participation, and the
      //  foreign key making an allocation impossible for a property that is
      //  not named on the coverage. Building 161 alone would prove this
      //  surface against a shape that no longer exists anywhere.
      //  163 — the FUNDING side. The surface reads funding alongside
      //  economics now, so a scoped schema without it makes the whole
      //  compartment 503.
      let mig163Path = path.join(API_REPO, "migrations", "163_insurance_funding.sql");
      let mig162 = fs2.readFileSync(
        path.join(API_REPO, "migrations", "162_insurance_coverage_participation.sql"), "utf8");
      mig162 = mig162.replace(/^begin;\s*/m, "").replace(/commit;\s*$/m, "");
      const mc = await pool.connect();
      try {
        await mc.query(`set search_path to ${schema}`);
        await mc.query(mig);
        await mc.query(mig162);
        let m163 = fs2.readFileSync(mig163Path, "utf8")
          .replace(/^begin;\s*/m, "").replace(/commit;\s*$/m, "")
          .replace(/alter table source_artifacts drop constraint[\s\S]*$/m, "");
        await mc.query(m163);
      } finally { mc.release(); }
    }

    const progs = require(path.join(API_REPO, "src", "asset", "insurance_program_service.js"));
    const allocs = require(path.join(API_REPO, "src", "asset", "insurance_allocation_service.js"));
    const ic = await pool.connect();
    let insUser, insArtifact;
    try {
      await ic.query(`set search_path to ${schema}`);
      insUser = (await ic.query(`insert into users (name) values ('Asset Ops') returning id`)).rows[0].id;
      insArtifact = (await ic.query(
        `insert into source_artifacts (original_filename, artifact_kind)
         values ('2026 property binder.pdf','insurance_binder') returning id`)).rows[0].id;
      const prog = await progs.establishProgram(ic, {
        program_name: "2026 Property Program", term_start: "2026-03-01",
        term_end: "2027-03-01", currency_code: "USD", user_id: insUser });
      const propCov = await progs.establishCoverage(ic, {
        program_id: prog.id, coverage_type: "property", carrier_name: "Ally",
        broker_name: "USI", coverage_period_start: "2026-03-01",
        coverage_period_end: "2027-03-01", premium_cents: 40000000,
        taxes_cents: 1200000, fees_cents: 300000, broker_fee_cents: 500000,
        user_id: insUser });
      const glCov = await progs.establishCoverage(ic, {
        program_id: prog.id, coverage_type: "general_liability", carrier_name: "Lantern",
        broker_name: "USI", coverage_period_start: "2026-03-01",
        coverage_period_end: "2027-03-01", premium_cents: 9000000,
        broker_fee_cents: 100000, user_id: insUser });
      //  NAMED ON THE POLICY, BEFORE ANY SHARE OF IT. Not scaffolding —
      //  this is the order the real establish route writes in and the order
      //  the schema now requires.
      for (const cov of [propCov, glCov]) {
        await progs.recordParticipation(ic, {
          coverage_id: cov.id, property_id: propId,
          observed_in_artifact_id: insArtifact, user_id: insUser });
      }
      //  STATED, with a document.
      await allocs.openSlice(ic, {
        coverage_id: propCov.id, property_id: propId, allocated_amount_cents: 12000000,
        allocation_class: "stated", allocation_basis: "broker_stated",
        effective_from: "2026-03-01", source_artifact_id: insArtifact, user_id: insUser });
      //  DERIVED, naming its model.
      await allocs.openSlice(ic, {
        coverage_id: glCov.id, property_id: propId, allocated_amount_cents: 2400000,
        allocation_class: "derived", allocation_basis: "tiv_prorata",
        basis_detail: "TIV pro-rata: 26.4% of $34.5M scheduled values",
        effective_from: "2026-03-01",
        provenance_note: "computed internally from the 2026 SOV", user_id: insUser });
      //  A SECOND property on the same coverage — shared, and under-allocated.
      const other = (await ic.query(
        `insert into properties (name) values ('4233 Chestnut') returning id`)).rows[0].id;
      await progs.recordParticipation(ic, {
        coverage_id: propCov.id, property_id: other,
        observed_in_artifact_id: insArtifact, user_id: insUser });
      await allocs.openSlice(ic, {
        coverage_id: propCov.id, property_id: other, allocated_amount_cents: 8000000,
        allocation_class: "stated", allocation_basis: "broker_stated",
        effective_from: "2026-03-01", source_artifact_id: insArtifact, user_id: insUser });
      //  ── FUNDING, THROUGH THE CANONICAL WRITER ──────────────────
      //  Seeded the way the allocations above are: through the service
      //  that has to produce it, never by inserting rows behind it.
      //  Financing here EXISTS to prove it changes nothing about cost.
      const fund = require(path.join(API_REPO, "src", "asset", "insurance_funding_service.js"));
      await fund.openArrangement(ic, {
        coverage_id: propCov.id, property_id: propId, funding_method: "lender_escrow",
        effective_from: "2026-03-01", provenance_note: "servicer statement",
        escrow: { lender_name: "Regional Bank", servicer_name: "Cenlar" }, user_id: insUser });
      await fund.openArrangement(ic, {
        coverage_id: glCov.id, property_id: propId, funding_method: "premium_financed",
        effective_from: "2026-03-01", provenance_note: "IPFS agreement on file",
        finance: { finance_provider: "AFCO Credit", down_payment_cents: 2310000,
                   principal_financed_cents: 9600000, finance_charge_cents: 740000,
                   installment_count: 11, installment_cents: 940000 },
        user_id: insUser });
    } finally { ic.release(); }

    // ── the API: the REAL router, plus the /operator/me the app needs ──
    const resolverPath = require.resolve(
      path.join(API_REPO, "src", "identity", "staff_session_service.js"));
    const OPERATOR = {
      //  A REAL user row, not a label. Nothing wrote an actor reference
      //  until the establishment path did, and "u-am" is not a uuid — the
      //  operator recording governed truth has to be a real person.
      id: insUser, name: "Asset Ops", role: "property_manager",
      property_id: propId,
      allowed_modules: ["management", "maintenance", "asset_management"],
    };
    require.cache[resolverPath] = {
      id: resolverPath, filename: resolverPath, loaded: true,
      exports: { resolveStaffSession: async (_p, tok) => (tok === SESSION ? OPERATOR : null) },
    };

    const express = require(path.join(API_REPO, "node_modules", "express"));
    const app = express();
    //  MATCHES PRODUCTION (server.js:123), which mounts this globally before
    //  every route. Without it req.body is undefined and a JSON write reads
    //  to the server as an empty request — the harness would be modelling a
    //  server that does not exist. This proof only ever issued GETs until
    //  the establishment path arrived.
    app.use(express.json({ limit: "1mb" }));
    app.use((req, res, next) => {
      res.setHeader("access-control-allow-origin", "*");
      res.setHeader("access-control-allow-headers", "x-staff-session,content-type,accept");
      if (req.method === "OPTIONS") return res.status(204).end();
      next();
    });
    app.get("/operator/me", (req, res) => {
      if (req.headers["x-staff-session"] !== SESSION) return res.status(401).json({ error: "no session" });
      res.json({
        id: OPERATOR.id, name: OPERATOR.name, role: OPERATOR.role,
        property_id: OPERATOR.property_id,
        property_name: OPERATOR.property_id === propId ? "Solo on Chestnut" : "Fresh Holding",
        allowed_modules: OPERATOR.allowed_modules, platform_role: "member",
      });
    });
    const scopedPool = new Pool({ connectionString: DB });
    scopedPool.on("connect", (c) => c.query(`set search_path to ${schema}`));
    app.use("/", require(
      path.join(API_REPO, "src", "surfaces", "asset_management.js"))({ pool: scopedPool }));

    apiServer = http.createServer(app);
    await new Promise((r) => apiServer.listen(0, "127.0.0.1", r));
    const apiPort = apiServer.address().port;

    staticServer = await serveStatic(APP_DIR, APP_PORT);
    tlsServer = await serveTls(apiPort, TLS_PORT);

    browser = await chromium.launch({
      executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
      args: ["--ignore-certificate-errors"],
    });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();

    //  The app is never edited. Its sealed loader still points at the
    //  production origin; the TRANSPORT underneath it is redirected.
    let redirected = 0;
    await page.route(PROD + "/**", async (route) => {
      redirected++;
      let url = route.request().url().replace(PROD, "https://127.0.0.1:" + TLS_PORT);
      //  PIN THE PERIOD. The door asks for the current month, which makes
      //  the assertion depend on the day the suite runs. `period` is a
      //  PREFERENCE on this route — property is the thing that is server
      //  authority — so pinning it is legitimate and keeps the proof
      //  deterministic. Nothing in the page is patched.
      if (url.includes("/operator/asset-management/insurance")) {
        url = url.split("?")[0] + "?period=2026-06";
      }
      await route.continue({ url });
    });

    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(String((e && e.message) || e)));

    await page.addInitScript(([api, token]) => {
      try {
        localStorage.setItem("ps_api_base", api);
        sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: token }));
      } catch (_) {}
    }, ["https://127.0.0.1:" + TLS_PORT, SESSION]);

    /*  VISIBILITY IS ASKED OF THE DOCUMENT, NOT THE ELEMENT.
     *
     *  SCROLL FIRST, and the reason matters. elementFromPoint takes
     *  VIEWPORT coordinates and returns null for anything outside it, so
     *  a perfectly visible element that simply sits below the fold reads
     *  as "covered". The first run of this proof failed exactly there —
     *  the fourth room was fine and the assertion was wrong.
     *
     *  Weakening the check would have been the wrong repair: being
     *  covered by a fixed overlay is the real defect this repo has
     *  already shipped once. So the fix is to do what a human does —
     *  scroll it into view — and THEN insist nothing is on top of it. */
    const visible = async (sel) => page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return { found: false };
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return { found: true, boxed: false };
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      //  If it is STILL outside the viewport after scrolling, that is a
      //  real finding, not a scroll artifact — say so distinctly.
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) {
        return { found: true, boxed: true, covered: true, offscreen_after_scroll: true };
      }
      const hit = document.elementFromPoint(cx, cy);
      return { found: true, boxed: true, covered: !(hit && (hit === el || el.contains(hit) || hit.contains(el))) };
    }, sel);

    const shot = async (n) => { await page.screenshot({ path: path.join(OUT, n), fullPage: true }); };

    console.log("\n  ASSET MANAGEMENT — BROWSER PROOF\n");
    console.log("── 1. THE APP ACTUALLY LOADED ────────────────────────");

    await page.goto("http://127.0.0.1:" + APP_PORT + "/index.html", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await shot("01-app-loaded.png");

    ok("the door module is present on the page",
       await page.evaluate(() => !!window.__psAssetManagement));
    ok("the app reached the API through its own pinned loader (transport redirected)",
       redirected > 0, `redirected=${redirected}`);
    ok("the app is NOT sitting on the sign-in screen",
       await page.evaluate(() => {
         const t = document.body.innerText || "";
         return !/Sign in to continue|Enter your phone/i.test(t);
       }));

    console.log("\n── 2. ENTERED THE WAY AN OPERATOR ENTERS ─────────────");

    const btn = await visible("#deskCardAssetManagement");
    ok("the Asset Management desk card sits on Home beside the other doors", btn.found);
    ok("…and is VISIBLE — not covered by another element",
       btn.found && btn.boxed && !btn.covered, JSON.stringify(btn));

    //  The real click, on the real control. Never __psAssetManagement.mount().
    await page.click("#deskCardAssetManagement");
    await page.waitForTimeout(1500);
    //  PARK THE MOUSE BEFORE THE SCREENSHOT. Playwright leaves the pointer
    //  where it clicked, and .maint-command-card:hover darkens the border —
    //  so a card under the resting cursor photographs as though it were
    //  selected. It is a harness artifact, not a product state, and it read
    //  as a real defect on review. The screenshot must show the rest state.
    await page.mouse.move(4, 4);
    await page.waitForTimeout(200);
    await shot("02-asset-management-open.png");

    const strip = await visible("#intelStrip");
    ok("the desk rendered into the operator frame", strip.found && strip.boxed && !strip.covered,
       JSON.stringify(strip));

    // ── IT IS A ROOM IN THE SAME BUILDING, NOT ANOTHER APPLICATION ──
    ok("the desk is in asset-management-mode, like leasing-v6-mode",
       await page.evaluate(() => document.body.classList.contains("asset-management-mode")));
    ok("the shared operator workspace is showing, not a full-screen panel",
       await page.evaluate(() => {
         const ws = document.getElementById("workspace");
         return !!ws && !ws.classList.contains("hidden");
       }));
    ok("there is NO Asset Management masthead or back-to-app chrome",
       await page.evaluate(() =>
         !document.getElementById("assetManagementPanel")
         && !document.getElementById("appbarAssetManagement")));
    ok("the header comes from the shared desk title, not the door",
       await page.evaluate(() => {
         const t = document.getElementById("deskTitle");
         return !!t && /asset management/i.test(t.innerText || "");
       }));
    ok("…and carries the module sentence from PS_MODULE_IDENTITY",
       await page.evaluate(() => {
         const s = document.getElementById("deskSub");
         return !!s && /economics and obligations/i.test(s.innerText || "");
       }));

    console.log("\n── 3. THE FOUR ROOMS ARE ON SCREEN ───────────────────");

    //  SCOPED to the panel. An unscoped room selector could match the
    //  shell beneath it.
    const roomKeys = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#intelStrip [data-am-room]"))
        .map((e) => e.getAttribute("data-am-room")));
    ok("four rooms rendered", roomKeys.length === 4, JSON.stringify(roomKeys));
    ok("in canonical order",
       roomKeys.join(",") === "revenue,capital,property_obligations,operating_costs",
       roomKeys.join(","));

    for (const k of ["revenue", "capital", "property_obligations", "operating_costs"]) {
      const v = await visible(`#intelStrip [data-am-room="${k}"]`);
      ok(`room "${k}" is visible to a human`, v.found && v.boxed && !v.covered, JSON.stringify(v));
    }

    console.log("\n── 4. THE ROOMS TELL THE TRUTH ───────────────────────");

    const states = await page.evaluate(() => {
      const out = {};
      document.querySelectorAll("#intelStrip [data-am-room]").forEach((el) => {
        const badge = el.querySelector("[data-am-est]");
        out[el.getAttribute("data-am-room")] = badge ? badge.getAttribute("data-am-est") : null;
      });
      return out;
    });
    ok("Revenue reads partially_established from the real lease",
       states.revenue === "partially_established", JSON.stringify(states));
    ok("Capital reads not_established", states.capital === "not_established");
    ok("Property Obligations reads not_established", states.property_obligations === "not_established");
    ok("Operating Costs reads not_established", states.operating_costs === "not_established");

    //  Layout-aware text — innerText, not textContent, and read from the
    //  panel only.
    const panelText = await page.evaluate(() => {
      const p = document.getElementById("intelStrip");
      return p ? (p.innerText || "") : "";
    });
    ok("the operator can read an honest establishment chip on screen",
       /Not established/i.test(panelText));
    ok("…and it is NOT the setup-software phrasing",
       !/Setup not established/i.test(panelText));
    //  Case-insensitive on purpose: .maint-card-open is uppercased by CSS
    //  and innerText reflects text-transform, so the rendered string is
    //  "OPEN REVENUE →". Reading layout-aware text means reading what the
    //  CSS actually produced, not what the source string said.
    ok("every card offers one clear open action",
       (panelText.match(/open /gi) || []).length >= 4, panelText.slice(0, 200));

    console.log("\n── 4b. THE HOME IS A DESK, NOT A REPORT ──────────────");
    //  The presentation ruling. The home card carries a short line; the
    //  setup guidance lives inside the room. An earlier revision put the
    //  full explanation on all four cards and the desk read like an audit
    //  page with the hierarchy buried under it.
    ok("the HOME does not carry 'What would establish it' — that is inside the room",
       !/What would establish it/i.test(panelText));
    ok("the HOME does not carry the source-document guidance",
       !/Deal Setup/i.test(panelText));
    ok("the HOME does not carry UNASSIGNED — owner belongs in the room",
       !/UNASSIGNED/.test(panelText));
    ok("the developer-facing shell caveat is gone from the desk",
       !/returns no amounts|Establishment state only/i.test(panelText));

    //  It uses LEASING'S OWN CARD SYSTEM, not a lookalike. If these classes
    //  stop matching, the two desks have started to drift apart.
    ok("the home uses Leasing's 2×2 door grid (.maint-primary-grid.le-doors)",
       await page.evaluate(() =>
         !!document.querySelector("#intelStrip .maint-primary-grid.le-doors")));
    ok("the cards are Leasing's .maint-command-card, not a parallel system",
       await page.evaluate(() =>
         document.querySelectorAll("#intelStrip .maint-command-card").length === 4));
    ok("each card uses Leasing's h3 / p / open-action grammar",
       await page.evaluate(() =>
         Array.from(document.querySelectorAll("#intelStrip .maint-command-card"))
           .every((c) => c.querySelector("h3") && c.querySelector("p")
                         && c.querySelector(".maint-card-open"))));

    //  THE ROOM NAME MUST WIN. The taxonomy is deliberately NOT in the
    //  tracked uppercase kicker any more — as an eyebrow it competed with
    //  the room name for the eye. It now sits beneath the name, in sentence
    //  case at normal tracking, as secondary context.
    ok("no card puts the taxonomy in the large tracked eyebrow",
       await page.evaluate(() =>
         !document.querySelector("#intelStrip .maint-command-card .maint-card-kicker")));
    ok("the taxonomy sits BENEATH the room name, not above it",
       await page.evaluate(() =>
         Array.from(document.querySelectorAll("#intelStrip .maint-command-card")).every((c) => {
           const h = c.querySelector("h3"), t = c.querySelector(".am-taxonomy");
           if (!h || !t) return false;
           //  DOCUMENT_POSITION_FOLLOWING — the taxonomy comes after the name.
           return !!(h.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING);
         })));
    //  There is exactly one state rule on this card (:hover, shared with
    //  Leasing) and no focus/selected rule at all. Measure it rather than
    //  assert it from the source: all four must be identical at rest.
    const borders = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#intelStrip .maint-command-card"))
        .map((c) => {
          const s = getComputedStyle(c);
          return [s.borderTopColor, s.borderTopWidth, s.borderTopStyle].join("|");
        }));
    ok("all four desk cards render an IDENTICAL border at rest — none looks selected",
       new Set(borders).size === 1, JSON.stringify(borders));

    ok("the room name is visually larger than the taxonomy under it",
       await page.evaluate(() => {
         const c = document.querySelector("#intelStrip .maint-command-card");
         const h = parseFloat(getComputedStyle(c.querySelector("h3")).fontSize);
         const t = parseFloat(getComputedStyle(c.querySelector(".am-taxonomy")).fontSize);
         return h > t;
       }));

    console.log("\n── 4c. PROGRESSIVE DISCLOSURE ────────────────────────");
    //  Click a room the way an operator does — the card itself, scoped.
    await page.click('#intelStrip [data-am-room="property_obligations"]');
    await page.waitForTimeout(500);
    await shot("04-room-open.png");

    const roomView = await visible('#intelStrip [data-am-room-open="property_obligations"]');
    ok("clicking a card opens that room", roomView.found && roomView.boxed && !roomView.covered,
       JSON.stringify(roomView));

    const roomText = await page.evaluate(() => {
      const p = document.getElementById("intelStrip");
      return p ? (p.innerText || "") : "";
    });
    //  THE ROOM IS THE PERMANENT SKELETON, not an explanatory empty page.
    //  It already shows where Insurance and Taxes are going to live.
    const compartments = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#intelStrip [data-am-compartment]'))
        .map((e) => (e.querySelector("h4") || {}).innerText || ""));
    ok("Property Obligations shows its four compartments as the room's shape",
       ["Taxes", "Insurance", "Licenses", "Compliance"]
         .every((l) => compartments.some((c) => c.toLowerCase().includes(l.toLowerCase()))),
       JSON.stringify(compartments));
    ok("every compartment is visible to a human",
       await (async () => {
         const keys = await page.evaluate(() =>
           Array.from(document.querySelectorAll('#intelStrip [data-am-compartment]'))
             .map((e) => e.getAttribute("data-am-compartment")));
         for (const k of keys) {
           const v = await visible(`#intelStrip [data-am-compartment="${k}"]`);
           if (!(v.found && v.boxed && !v.covered)) return false;
         }
         return keys.length === 4;
       })());
    ok("each compartment states its own honest establishment",
       await page.evaluate(() =>
         Array.from(document.querySelectorAll('#intelStrip [data-am-compartment]'))
           .every((e) => e.querySelector("[data-am-est]"))));
    ok("no compartment shows a fabricated value",
       !CURRENCYISH.test(compartments.join(" ")));

    //  THE ROOM STOPS AT THE SKELETON. Property Obligations does not explain
    //  how all four of its children get established — that belongs inside a
    //  compartment when it is opened, at the altitude where it is actionable.
    ok("the room does NOT carry a room-level setup block",
       !/What would establish it/i.test(roomText) && !/UNASSIGNED/.test(roomText),
       roomText.slice(0, 300));
    ok("the room does NOT explain source documents for all four children",
       !/Deal Setup|certificate|retained/i.test(roomText));
    ok("the room names licences and compliance through its COMPARTMENTS",
       /licen[cs]e/i.test(roomText) && /Compliance/i.test(roomText));

    // ── THE ROOM IS THE PAGE IDENTITY ────────────────────────────────
    ok("the large ASSET MANAGEMENT desk title stands down inside a room",
       await page.evaluate(() => {
         const t = document.getElementById("deskTitle");
         if (!t) return true;
         const r = t.getBoundingClientRect();
         return getComputedStyle(t).display === "none" || (!r.width && !r.height);
       }));
    ok("…but the app-bar crumb still says where the operator is",
       await page.evaluate(() => /asset management/i.test(document.body.innerText || "")));
    ok("PROPERTY OBLIGATIONS is the page identity",
       await page.evaluate(() => {
         const n = document.querySelector("#intelStrip .am-room-name");
         return !!n && /property obligations/i.test(n.innerText || "");
       }));
    ok("the other three rooms are NOT on screen — this is one room, not a list",
       !/OPERATING COSTS/i.test(roomText) && !/SENIOR DEBT/i.test(roomText));

    //  Back to the desk, and the desk is a desk again.
    await page.click("#intelStrip .am-back");
    await page.waitForTimeout(400);
    ok("the back control returns to the four-room desk",
       await page.evaluate(() =>
         document.querySelectorAll("#intelStrip .maint-command-card").length === 4));

    console.log("\n── 4d. THE INSURANCE COMPARTMENT ─────────────────────");
    //  The first compartment with a surface. Entered the way an operator
    //  enters it: a real click on the Insurance compartment card.
    //
    //  4c ended by clicking BACK, so we are standing on the desk. Re-enter
    //  Property Obligations the way an operator would, rather than assuming
    //  the previous section left us somewhere convenient — that assumption
    //  is exactly what made this section time out on its first run.
    await page.click('#intelStrip [data-am-room="property_obligations"]');
    await page.waitForTimeout(600);

    ok("the Insurance compartment is a live control",
       await page.evaluate(() =>
         !!document.querySelector('#intelStrip [data-am-compartment="insurance"][data-am-compartment-live]')));
    ok("…while a compartment with no surface stays inert",
       await page.evaluate(() =>
         !document.querySelector('#intelStrip [data-am-compartment="compliance"][data-am-compartment-live]')));

    await page.click('#intelStrip [data-am-compartment="insurance"]');
    await page.waitForTimeout(900);
    await page.mouse.move(4, 4);
    await page.waitForTimeout(150);
    await shot("05-insurance.png");

    const ins = await visible('#intelStrip [data-am-compartment-open="insurance"]');
    ok("the Insurance dashboard opened and is visible",
       ins.found && ins.boxed && !ins.covered, JSON.stringify(ins));

    const insText = await page.evaluate(() => {
      const p = document.getElementById("intelStrip");
      return p ? (p.innerText || "") : "";
    });

    //  THE POSITION STRIP — five reserved slots, all honestly empty.
    const posKeys = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#intelStrip [data-am-position]"))
        .map((e) => e.getAttribute("data-am-position")));
    ok("the headline strip reserves all five position slots",
       ["coverage", "annual_cost", "monthly_accrual", "next_renewal", "payment"]
         .every((k) => posKeys.includes(k)), JSON.stringify(posKeys));
    ok("each position cell says a label and a state — nothing more",
       await page.evaluate(() =>
         Array.from(document.querySelectorAll("#intelStrip [data-am-position]"))
           .every((e) => e.children.length === 2)));
    //  Four slots now carry governed truth and PAYMENT does not, which is
    //  the honest shape while the cash chain is unbuilt. The invariant is
    //  not "everything is blank" — it is that an EMPTY slot states its
    //  emptiness rather than showing a dash or a zero.
    ok("an unestablished slot states its blank, never a dash or a zero",
       await page.evaluate(() => {
         const cells = Array.from(document.querySelectorAll("#intelStrip [data-am-position]"));
         return cells.every((e) => {
           const blank = !!e.querySelector("[data-am-blank]");
           const val = !!e.querySelector(".am-pos-value");
           return blank !== val;   // exactly one of the two, never both, never neither
         });
       }));
    ok("no position slot renders a dash or a bare zero in a money slot",
       !/(^|\s)[—–-](\s|$)|(^|\s)0(\s|$)/.test(
         (await page.evaluate(() =>
           Array.from(document.querySelectorAll("#intelStrip [data-am-position]"))
             .map((e) => e.innerText).join(" | "))) || ""));

    //  THE FOUR TRUTHS, RENDERED APART AND LABELLED APART.
    const truths = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#intelStrip [data-am-truth]"))
        .map((e) => e.getAttribute("data-am-truth")));
    ok("all four sections are present",
       truths.length === 4, JSON.stringify(truths));
    ok("coverage · economic · cash · history are four SEPARATE sections",
       new Set(truths).size === 4
       && ["coverage", "economic", "cash", "history"].every((t) => truths.includes(t)),
       JSON.stringify(truths));
    for (const k of ["coverage_stack", "economic_position", "cash_financing", "renewals_history"]) {
      const v = await visible(`#intelStrip [data-am-section="${k}"]`);
      ok(`section "${k}" is visible to a human`, v.found && v.boxed && !v.covered);
    }

    // ── THE EMPTY SCREEN IS CALM, NOT UNFINISHED ─────────────────────
    //  The API still carries reserved / layers / doctrine / awaiting — the
    //  proofs and docs need the specification. The SURFACE must not print
    //  any of it: an empty card that explains what it will hold, why it is
    //  empty, and which doctrine governs it is a product spec rendered into
    //  a dashboard. These assertions are the thing that stops it creeping
    //  back one helpful sentence at a time.
    ok("no section prints a field inventory",
       !/will hold/i.test(insText), insText.slice(0, 200));
    ok("no doctrine callout is rendered",
       !/Coverage period determines|renewal is a new governed term/i.test(insText));
    ok("no coverage-layer strip is rendered",
       await page.evaluate(() => !document.querySelector("#intelStrip .am-ins-layer")));
    ok("no position cell explains why it is empty",
       await page.evaluate(() => !document.querySelector("#intelStrip .am-pos-awaiting")));
    ok("no section repeats 'no data exists' under its establishment chip",
       !/No governed policies or programs are established|No premium, allocation or accrual|No payment, escrow or financing|No renewals, endorsements or history/i
         .test(insText), insText.slice(0, 300));

    //  Each card says exactly three things: title, one sentence, chip.
    ok("every section renders a title, ONE sentence and one chip — and stops",
       await page.evaluate(() =>
         Array.from(document.querySelectorAll("#intelStrip .am-ins-section")).every((sec) =>
           sec.querySelectorAll("h3").length === 1
           && sec.querySelectorAll("p").length === 1
           && sec.querySelectorAll("[data-am-est]").length === 1)));

    //  …while the boundary itself survives where it belongs.
    ok("the API still carries the specification the surface stopped printing",
       await page.evaluate(async () => {
         const r = await window.__psLive.assetManagementInsurance();
         const d = (r && r.data) || {};
         return (d.sections || []).length === 4
           && (d.sections || []).every((x) => Array.isArray(x.reserved) && x.reserved.length)
           && (d.sections || []).some((x) => !!x.doctrine);
       }));

    //  NOT AN INSURANCE WORKSHEET. These belong behind a drill-down.
    //  ── A REAL TENSION, RESOLVED DELIBERATELY ──────────────────────
    //  "No raw allocation math on the first screen" and §38's "a derived
    //  attribution must name the model that produced it" pull opposite
    //  ways, and a DERIVED allocation is now on this screen.
    //
    //  §38 wins, narrowly. A one-line model citation — "TIV pro-rata:
    //  26.4% of $34.5M scheduled values" — is the minimum disclosure that
    //  keeps a computed number from wearing a carrier's authority. What
    //  the rule was actually protecting against is the allocation
    //  WORKSHEET: schedules of values, per-property arithmetic, policy
    //  numbers and broker contacts. Those stay off, and are asserted off.
    //  A FINANCE PROVIDER IS NOT A BROKER CONTACT. The finance company is
    //  the counterparty of the funding arrangement and naming it is the
    //  minimum that section can say; what stays off this screen is policy
    //  numbers, contact details and raw allocation arithmetic.
    //  IPFS and AFCO were in this pattern when the only correct number of
    //  financing mentions on this screen was zero. Cash & Financing now
    //  legitimately names the finance company it owes, so a screen-wide
    //  ban would forbid the section from saying the one thing it exists to
    //  say. The financing check moved to the ZONE assertions below, which
    //  are stricter where it matters: nowhere in the strip, nowhere in
    //  Economic Position.
    //
    //  What stays screen-wide is what is still always wrong here — policy
    //  numbers, phone numbers and email addresses. Those belong behind a
    //  drill-down at every altitude.
    ok("the first screen shows no policy numbers, phone numbers or email addresses",
       !/policy #|policy no\.|\(\d{3}\)\s?\d{3}|@/i.test(insText),
       insText.slice(0, 200));
    ok("…but a derived figure DOES name its model, as §38 requires",
       /TIV pro-rata/.test(insText));

    console.log("\n── 4e. GOVERNED INSURANCE TRUTH ON SCREEN ────────────");
    //  THE ACCEPTANCE CASE, rendered. 120,000 + 24,000 = 144,000 annual;
    //  ÷ 12 = 12,000 monthly. Computed from coverage term and governed
    //  allocation, with no financing schedule anywhere in the chain.
    ok("ANNUAL COST renders the governed property economics",
       /\$144,000\.00/.test(insText), insText.slice(0, 400));
    ok("MONTHLY ACCRUAL renders the period figure",
       /\$12,000\.00/.test(insText));
    ok("NEXT RENEWAL renders the coverage end", /2027-03-01/.test(insText));
    ok("COVERAGE reports the count of active terms", /2 active/.test(insText));

    ok("the Coverage Stack lists the real coverages and their carriers",
       /Property/.test(insText) && /Ally/.test(insText) && /General Liability/.test(insText));
    ok("…and reports shared participation, read from the allocation graph",
       /Shared — 2 properties/.test(insText));

    //  §38 AT THE ALLOCATION ALTITUDE. A broker-stated figure and a TIV
    //  pro-rata split must not render identically — one is a recorded fact
    //  with an external authority, the other is a model's output.
    const allocClasses = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#intelStrip [data-am-alloc-class]"))
        .map((e) => e.getAttribute("data-am-alloc-class")));
    ok("stated and derived allocations render as DIFFERENT classes",
       allocClasses.includes("stated") && allocClasses.includes("derived"),
       JSON.stringify(allocClasses));
    ok("…and they are visually distinguishable, not just labelled",
       await page.evaluate(() => {
         const a = document.querySelector("#intelStrip .am-alloc-stated");
         const b = document.querySelector("#intelStrip .am-alloc-derived");
         if (!a || !b) return false;
         return getComputedStyle(a).color !== getComputedStyle(b).color;
       }));
    ok("a derived allocation names the model that produced it",
       await page.evaluate(() => !!document.querySelector("#intelStrip [data-am-model]"))
       && /TIV pro-rata/.test(insText));

    //  THE UNRESOLVED REMAINDER, stated and never plugged. 420,000 total
    //  against 200,000 allocated leaves 220,000 belonging to nobody.
    ok("the unallocated remainder is surfaced, not balanced away",
       await page.evaluate(() => !!document.querySelector("#intelStrip [data-am-unreconciled]"))
       && /\$220,000\.00 not allocated/.test(insText), insText.slice(0, 600));

    /*  ── SLICE B MOVED THIS ASSERTION, AND SHARPENED IT ──────────────
     *  Until funding existed, the honest claim was "the word escrow
     *  appears NOWHERE on this screen", because nothing could legitimately
     *  say it. Cash & Financing is now established for this fixture, so
     *  that claim is simply false — and deleting it would give up the
     *  guard it was providing.
     *
     *  The claim that survives is the one that always mattered: financing
     *  vocabulary may appear in the CASH section and may appear NOWHERE
     *  else. That is stricter than the old assertion in the place that
     *  counts, because it keeps holding after funding exists.
     */
    ok("CASH & FINANCING is established once funding has been recorded",
       await page.evaluate(() => {
         const s = document.querySelector('#intelStrip [data-am-section="cash_financing"] [data-am-est]');
         return !!s && s.getAttribute("data-am-est") === "established";
       }));
    ok("…and the three mechanisms render as visibly different classes",
       await page.evaluate(() => {
         const e = document.querySelector("#intelStrip .am-cash-lender_escrow");
         const f = document.querySelector("#intelStrip .am-cash-premium_financed");
         if (!e || !f) return false;
         //  COMPUTED colour, never the class list. A build where both
         //  resolved to the same grey would pass a classList check.
         return getComputedStyle(e).color !== getComputedStyle(f).color;
       }));
    //  PAYMENT now REPORTS the mechanism, because Spine knows it. Leaving
    //  it blank once funding is recorded would be honest-blank inverted:
    //  claiming ignorance of something on file. What it must never carry
    //  is an AMOUNT — the zone assertions below hold that line.
    const payCell = await page.evaluate(() => {
      const p = document.querySelector('#intelStrip [data-am-position="payment"]');
      return p ? p.innerText : null;
    });
    ok("PAYMENT names the mechanism once funding is recorded",
       !!payCell && /escrow/i.test(payCell) && /financed/i.test(payCell),
       JSON.stringify(payCell));
    ok("…and both arrangements are named rather than averaged into 'Mixed'",
       !!payCell && !/mixed/i.test(payCell), JSON.stringify(payCell));
    ok("…and it carries NO amount — a label, never a figure",
       !!payCell && !/[$]|\d{3}/.test(payCell), JSON.stringify(payCell));

    //  ── THE WALL, ON SCREEN ──────────────────────────────────────────
    const zones = await page.evaluate(() => {
      const t = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.innerText : "";
      };
      return {
        strip: t("#intelStrip [data-am-position-strip]"),
        economic: t('#intelStrip [data-am-section="economic_position"]'),
        cash: t('#intelStrip [data-am-section="cash_financing"]'),
      };
    });
    const FINANCING = /ipfs|installment|escrow|down.?payment|finance charge|afco/i;
    ok("financing vocabulary appears in CASH & FINANCING, where it belongs",
       FINANCING.test(zones.cash), zones.cash.slice(0, 200));
    //  The strip names the MECHANISM by design. What it may never carry
    //  is a financing AMOUNT, so that is what is asserted here — the
    //  words moved into scope legitimately, the money did not.
    ok("…and the strip carries no financing AMOUNT, only the mechanism",
       !/[$]\s?[\d,]+/.test(zones.strip.split("PAYMENT")[1] || ""),
       JSON.stringify((zones.strip.split("PAYMENT")[1] || "").slice(0, 80)));
    ok("…and no IPFS, installment or finance-charge wording in the strip",
       !/ipfs|installment|down.?payment|finance charge|afco/i.test(zones.strip),
       zones.strip.slice(0, 200));
    ok("…and NOWHERE in Economic Position",
       !FINANCING.test(zones.economic), zones.economic.slice(0, 300));
    //  The specific numbers, because a vocabulary check would not catch a
    //  bare amount landing in the wrong place.
    ok("the $7,400 finance charge does not appear in the economic section",
       !/7,400/.test(zones.economic), zones.economic.slice(0, 300));
    ok("the $9,400 installment does not appear in the position strip",
       !/9,400/.test(zones.strip), zones.strip.slice(0, 200));

    //  Back out, and the room is still the room.
    await page.click("#intelStrip .am-back");
    await page.waitForTimeout(500);
    ok("the back control returns to Property Obligations",
       await page.evaluate(() =>
         document.querySelectorAll("#intelStrip [data-am-compartment]").length === 4));

    console.log("\n── 5. NO FABRICATED ECONOMICS ON SCREEN ──────────────");

    //  These are asserted against the ROOM (Property Obligations), which
    //  still holds no economics. Insurance now legitimately renders money,
    //  so the no-currency rule belongs where nothing is established — the
    //  rule was never "no numbers", it was "no INVENTED numbers".
    ok("the room still contains no currency-shaped token",
       !CURRENCYISH.test(panelText),
       CURRENCYISH.test(panelText) ? "matched: " + (panelText.match(CURRENCYISH) || [])[0] : "");
    ok("the lease's real rent (1850.00) is in the database and NOT on the screen",
       !/1850/.test(panelText));
    ok("no canvas/svg chart was rendered into the panel",
       await page.evaluate(() =>
         !document.querySelector("#intelStrip canvas, #intelStrip svg")));


    console.log("\n── 5c. ADD CURRENT INSURANCE — THE ESTABLISHMENT PATH ");

    /*  THE STATE THIS SECTION EXISTS FOR.
     *
     *  A master policy names this property on its schedule of locations and
     *  states no share for it. Before migration 162 that was unrepresentable:
     *  both insurance reads are allocation-gated, so real recorded coverage
     *  with no allocation rendered EXACTLY like a property nobody had
     *  touched. Honest partial work was indistinguishable from no work.
     *
     *  So this walks the whole path on a property with NOTHING established —
     *  empty compartment, real click, real upload, real confirm — and then
     *  insists on seeing BOTH halves at once: coverage established, share
     *  honestly missing, and no number invented to bridge them.
     *
     *  Entry is a real click every time. Never door.mount(), never
     *  amInsuranceConfirm() from the console: a proof that reaches past the
     *  product to drive the product is testing its own reach.
     */
    const fc = await pool.connect();
    let freshId;
    try {
      await fc.query(`set search_path to ${schema}`);
      freshId = (await fc.query(
        `insert into properties (name) values ('Fresh Holding') returning id`)).rows[0].id;
    } finally { fc.release(); }

    OPERATOR.property_id = freshId;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    await page.click("#deskCardAssetManagement");
    await page.waitForTimeout(1400);
    await page.click('#intelStrip [data-am-room="property_obligations"]');
    await page.waitForTimeout(600);
    await page.click('#intelStrip [data-am-compartment="insurance"]');
    await page.waitForTimeout(900);
    await page.mouse.move(4, 4);
    await page.waitForTimeout(150);
    await shot("08-insurance-empty.png");

    ok("a property with no insurance opens the compartment, not an error",
       await page.evaluate(() =>
         !!document.querySelector('#intelStrip [data-am-compartment-open="insurance"]')));

    const emptyStanding = await visible("#intelStrip [data-am-standing]");
    ok("a property with no insurance still states its standing",
       emptyStanding.found && emptyStanding.boxed && !emptyStanding.covered,
       JSON.stringify(emptyStanding));
    ok("…and it is COVERAGE NOT CONFIRMED — never healthy from absence",
       await page.evaluate(() => {
         const el = document.querySelector("#intelStrip [data-am-standing]");
         return !!el && el.getAttribute("data-am-standing") === "coverage_not_confirmed";
       }));
    ok("…and it names what would resolve it",
       await page.evaluate(() => {
         const el = document.querySelector("#intelStrip [data-am-standing-next]");
         return !!el && /policy or binder/i.test(el.innerText);
       }));

    const addBtn = await visible('#intelStrip [data-am-add-insurance]');
    ok("ADD CURRENT INSURANCE is on screen and nothing covers it",
       addBtn.found && addBtn.boxed && !addBtn.covered, JSON.stringify(addBtn));
    ok("…and it leads, because on an empty compartment it is the only useful act",
       await page.evaluate(() => {
         const el = document.querySelector("#intelStrip [data-am-add-insurance]");
         return !!el && el.classList.contains("is-primary")
             && getComputedStyle(el).backgroundColor === "rgb(17, 17, 17)";
       }));

    //  ── THE SHEET ──────────────────────────────────────────────────
    await page.click("#intelStrip [data-am-add-insurance]");
    await page.waitForTimeout(400);
    const sheet = await visible('#intelStrip [data-am-capture="choose"]');
    ok("the capture sheet opens and is visible", sheet.found && sheet.boxed && !sheet.covered,
       JSON.stringify(sheet));

    //  A REAL REFUSAL THROUGH THE REAL PATH: confirm with no file chosen.
    await page.click('#intelStrip [data-am-act="upload"]');
    await page.waitForTimeout(400);
    const noFile = await visible("#intelStrip [data-am-capture-error]");
    ok("uploading with no document chosen refuses VISIBLY",
       noFile.found && noFile.boxed && !noFile.covered, JSON.stringify(noFile));

    //  A spreadsheet is not a binder — the server's own refusal, rendered.
    await page.setInputFiles('#intelStrip [data-am-input="file"]', {
      name: "rent roll.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(48, 3)]),
    });
    await page.click('#intelStrip [data-am-act="upload"]');
    await page.waitForTimeout(900);
    const wrongKind = await page.evaluate(() => {
      const el = document.querySelector("#intelStrip [data-am-capture-error]");
      return el ? el.innerText : null;
    });
    ok("a spreadsheet is refused as insurance evidence, through the real route",
       !!wrongKind && /PDF/i.test(wrongKind), JSON.stringify(wrongKind));
    ok("…and gives insurance instructions, never rent-roll ones",
       !!wrongKind && !/rent rolls as|as a spreadsheet first/i.test(wrongKind)
         && /broker or carrier/i.test(wrongKind), JSON.stringify(wrongKind));

    //  The real document.
    await page.setInputFiles('#intelStrip [data-am-input="file"]', {
      name: "2026 portfolio binder.pdf", mimeType: "application/pdf",
      buffer: Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.from("schedule of locations\n")]),
    });
    await page.click('#intelStrip [data-am-act="upload"]');
    await page.waitForTimeout(1200);
    await shot("09-insurance-review.png");

    const review = await visible('#intelStrip [data-am-capture="review"]');
    ok("the review step opens after the document is retained",
       review.found && review.boxed && !review.covered, JSON.stringify(review));
    const onfile = await page.evaluate(() => {
      const el = document.querySelector("#intelStrip [data-am-cap-onfile]");
      return el ? el.innerText : null;
    });
    ok("the sheet names the retained document", !!onfile && /binder\.pdf/i.test(onfile),
       JSON.stringify(onfile));
    ok("…and says plainly that Spine has NOT read it",
       !!onfile && /has not read/i.test(onfile), JSON.stringify(onfile));
    /*  WHAT THIS ASSERTS, PRECISELY.
     *
     *  This upload is not a readable PDF, so Spine could not read it and
     *  proposes nothing. The claim is therefore the narrow one: when there
     *  is NO proposal, no field is pre-filled and no field claims to have
     *  been read from the document. Stating it as "fields are always
     *  blank" would be a false claim about a build that legitimately
     *  proposes values off a real policy.
     */
    const proposalState = await page.evaluate(() => {
      const p = document.querySelector("#intelStrip [data-am-proposal-available]");
      return {
        available: p ? p.getAttribute("data-am-proposal-available") : null,
        blanks: ["program_name", "carrier_name", "premium", "share"].every((n) => {
          const el = document.querySelector('#intelStrip [data-am-input="' + n + '"]');
          return el && el.value === "";
        }),
        markers: document.querySelectorAll("#intelStrip [data-am-suggestion]").length,
      };
    });
    ok("Spine reports it could not read this document", proposalState.available === "0",
       JSON.stringify(proposalState));
    ok("…so every field opens BLANK — no guess is offered as a starting point",
       proposalState.blanks, JSON.stringify(proposalState));
    ok("…and nothing claims to have been read from the document",
       proposalState.markers === 0, JSON.stringify(proposalState));
    //  THE SHARE IS NEVER PROPOSED, readable document or not. It is the
    //  number that becomes this property's economic cost, and whether it
    //  was stated or computed is a distinction a text scan cannot make.
    ok("the share is never pre-filled by any reader",
       await page.evaluate(() => {
         const el = document.querySelector('#intelStrip [data-am-input="share"]');
         return !!el && el.value === ""
           && !document.querySelector('[data-am-suggestion="share"]');
       }));

    const shareField = await visible("#intelStrip [data-am-optional-share]");
    ok("the share is presented as OPTIONAL, on screen",
       shareField.found && shareField.boxed && !shareField.covered, JSON.stringify(shareField));
    ok("…and promises Spine will not estimate it",
       await page.evaluate(() => {
         const el = document.querySelector("#intelStrip [data-am-optional-share]");
         return !!el && /will not estimate/i.test(el.innerText);
       }));

    //  ── CONFIRM, WITH THE SHARE DELIBERATELY BLANK ──────────────────
    const type = async (name, value) =>
      page.fill('#intelStrip [data-am-input="' + name + '"]', value);
    await type("program_name", "2026 Portfolio Property Program");
    await type("term_start", "2026-03-01");
    await type("term_end", "2027-03-01");
    await type("currency_code", "USD");
    await type("carrier_name", "Ally");
    await type("coverage_period_start", "2026-03-01");
    await type("coverage_period_end", "2027-03-01");
    await type("premium", "10000000.00");
    await type("policy_number", "01-CPK-104720-02");
    //  share left blank ON PURPOSE — the document does not state it.

    await page.click('#intelStrip [data-am-act="confirm"]');
    await page.waitForTimeout(1800);
    await page.mouse.move(4, 4);
    await page.waitForTimeout(150);
    await shot("10-insurance-established-no-share.png");

    const receipt = await visible("#intelStrip [data-am-receipt]");
    ok("a receipt for the write is VISIBLE, not written under an overlay",
       receipt.found && receipt.boxed && !receipt.covered, JSON.stringify(receipt));
    const receiptText = await page.evaluate(() => {
      const el = document.querySelector("#intelStrip [data-am-receipt]");
      return el ? el.innerText : null;
    });
    ok("…and it says the share is still needed",
       !!receiptText && /still need/i.test(receiptText), JSON.stringify(receiptText));
    ok("…and that Spine will not estimate it",
       !!receiptText && /will not estimate/i.test(receiptText), JSON.stringify(receiptText));

    //  ══ BOTH HALVES, ON SCREEN, AT ONCE ═════════════════════════════
    const estab = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const cell = (k) => {
        const el = q('#intelStrip [data-am-position="' + k + '"]');
        return el ? el.innerText : null;
      };
      //  data-am-est lives on the chip INSIDE the section, not on the
      //  section element. Reading it off the section returns null, which
      //  is not the same answer as "not_established" and must not be
      //  allowed to look like one.
      const sect = (k) => {
        const el = q('#intelStrip [data-am-section="' + k + '"] [data-am-est]');
        return el ? el.getAttribute("data-am-est") : null;
      };
      return {
        coverage: cell("coverage"),
        annual: cell("annual_cost"),
        accrual: cell("monthly_accrual"),
        renewal: cell("next_renewal"),
        payment: cell("payment"),
        stack: sect("coverage_stack"),
        economic: sect("economic_position"),
        cash: sect("cash_financing"),
        panel: (q('#intelStrip [data-am-compartment-open="insurance"]') || {}).innerText || "",
      };
    });

    ok("COVERAGE STACK now reads ESTABLISHED", estab.stack === "established",
       JSON.stringify(estab.stack));
    ok("the coverage the operator typed is on screen", /Ally/.test(estab.panel));
    ok("COVERAGE counts it", /1 active/.test(String(estab.coverage)),
       JSON.stringify(estab.coverage));

    const nowStanding = await page.evaluate(() => {
      const el = document.querySelector("#intelStrip [data-am-standing]");
      return el ? { state: el.getAttribute("data-am-standing"), text: el.innerText } : null;
    });
    ok("establishing a term in force changes standing off not-confirmed",
       !!nowStanding && nowStanding.state !== "coverage_not_confirmed",
       JSON.stringify(nowStanding));
    ok("…and the standing sentence names the date it is covered to",
       !!nowStanding && /2027-03-01/.test(nowStanding.text), JSON.stringify(nowStanding));
    //  STANDING IS NOT GATED ON ALLOCATION. This property's share is
    //  unknown and it is still insured — the two questions are separate.
    const shareStillUnknown = await page.evaluate(() =>
      !!document.querySelector("#intelStrip [data-am-share-unknown]"));
    ok("…while the share is still unestablished, proving the two are independent",
       !!nowStanding && nowStanding.state !== "coverage_not_confirmed" && shareStillUnknown,
       JSON.stringify({ standing: nowStanding && nowStanding.state, shareStillUnknown }));

    const flag = await visible("#intelStrip [data-am-share-unknown]");
    ok("SHARE NOT ESTABLISHED is VISIBLE on the coverage row",
       flag.found && flag.boxed && !flag.covered, JSON.stringify(flag));

    ok("ECONOMIC POSITION stays not_established — no share, no economics",
       estab.economic === "not_established", JSON.stringify(estab.economic));
    ok("ANNUAL COST reads 'Not established', never a dash and never a zero",
       /Not established/i.test(String(estab.annual)) && !/[-–—]/.test(String(estab.annual))
         && !/\b0\.00\b/.test(String(estab.annual)), JSON.stringify(estab.annual));
    ok("MONTHLY ACCRUAL is blank the same way",
       /Not established/i.test(String(estab.accrual)), JSON.stringify(estab.accrual));

    //  THE FABRICATION THIS FORBIDS. The policy costs $10,000,000 across
    //  every property on it. That number is NOT this property's cost, and
    //  it must not appear anywhere on a property screen.
    ok("the whole policy's $10,000,000 premium is NOT rendered as this property's cost",
       !/10,000,000|10000000/.test(estab.panel),
       (estab.panel.match(/10[,0]{3,}[0-9,]*/) || [])[0] || "");

    const awaiting = await visible("#intelStrip [data-am-awaiting]");
    ok("the missing share is named where the economics are read",
       awaiting.found && awaiting.boxed && !awaiting.covered, JSON.stringify(awaiting));
    ok("…and it says what would resolve it",
       await page.evaluate(() => {
         const el = document.querySelector("#intelStrip [data-am-awaiting]");
         return !!el && /stated share|allocation schedule/i.test(el.innerText);
       }));

    //  THE WALL. Establishing what insurance COSTS says nothing about how
    //  it is settled, and that chain is not built.
    ok("CASH & FINANCING still reads NOT ESTABLISHED after a successful establishment",
       estab.cash === "not_established", JSON.stringify(estab.cash));
    ok("PAYMENT is still blank in the position strip",
       /Not established/i.test(String(estab.payment)), JSON.stringify(estab.payment));

    ok("NEXT RENEWAL is reported even though no share exists",
       /2027-03-01/.test(String(estab.renewal)), JSON.stringify(estab.renewal));

    //  ── AND THE SAME DOCUMENT CANNOT DO IT TWICE ────────────────────
    //  A double submit would otherwise write a second program from one
    //  document and silently double the property's annual cost.
    const before = await page.evaluate(() =>
      document.querySelectorAll("#intelStrip [data-am-section='coverage_stack'] [data-am-row]").length);
    await page.click("#intelStrip [data-am-add-insurance]");
    await page.waitForTimeout(400);
    await page.setInputFiles('#intelStrip [data-am-input="file"]', {
      name: "2026 portfolio binder.pdf", mimeType: "application/pdf",
      buffer: Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.from("schedule of locations\n")]),
    });
    await page.click('#intelStrip [data-am-act="upload"]');
    await page.waitForTimeout(1200);
    await type("program_name", "2026 Portfolio Property Program");
    await type("term_start", "2026-03-01");
    await type("term_end", "2027-03-01");
    await type("currency_code", "USD");
    await type("carrier_name", "Ally");
    await type("coverage_period_start", "2026-03-01");
    await type("coverage_period_end", "2027-03-01");
    await type("premium", "10000000.00");
    await page.click('#intelStrip [data-am-act="confirm"]');
    await page.waitForTimeout(1500);
    const dupErr = await visible("#intelStrip [data-am-capture-error]");
    ok("re-establishing from the SAME document refuses VISIBLY",
       dupErr.found && dupErr.boxed && !dupErr.covered, JSON.stringify(dupErr));
    ok("…and the refusal names what to do instead",
       await page.evaluate(() => {
         const el = document.querySelector("#intelStrip [data-am-capture-error]");
         return !!el && /already established/i.test(el.innerText) && /correct/i.test(el.innerText);
       }));
    await page.click('#intelStrip [data-am-act="cancel"]');
    await page.waitForTimeout(500);
    const after = await page.evaluate(() =>
      document.querySelectorAll("#intelStrip [data-am-section='coverage_stack'] [data-am-row]").length);
    ok("no second coverage was created by the duplicate submit",
       after === before, `before=${before} after=${after}`);

    console.log("\n── 5d. ADD PAYMENT / FINANCING ───────────────────────");

    /*  The operator can now establish funding, not only read it. Same
     *  discipline as the establishment sheet: real clicks, real refusals
     *  through the real route, and the accrual proven untouched after.
     */
    const beforeFunding = await page.evaluate(() => {
      const c = (k) => {
        const el = document.querySelector('#intelStrip [data-am-position="' + k + '"]');
        return el ? el.innerText : null;
      };
      return { annual: c("annual_cost"), accrual: c("monthly_accrual"), payment: c("payment") };
    });
    ok("PAYMENT is unknown before any funding is recorded",
       /Not established/i.test(String(beforeFunding.payment)), JSON.stringify(beforeFunding.payment));

    const addFund = await visible("#intelStrip [data-am-add-funding]");
    ok("ADD PAYMENT / FINANCING is on screen inside Cash & Financing",
       addFund.found && addFund.boxed && !addFund.covered, JSON.stringify(addFund));

    await page.click("#intelStrip [data-am-add-funding]");
    await page.waitForTimeout(500);
    const fSheet = await visible("#intelStrip [data-am-funding-capture]");
    ok("the funding sheet opens and is visible",
       fSheet.found && fSheet.boxed && !fSheet.covered, JSON.stringify(fSheet));

    //  THE FORM FOLLOWS THE METHOD. A direct arrangement has no
    //  instrument, so it must not offer installment fields at all.
    ok("`Paid directly` offers NO finance fields — the contradiction is unofferable",
       await page.evaluate(() =>
         !document.querySelector('#intelStrip [data-am-funding-fields="premium_financed"]')
         && !document.querySelector('#intelStrip [data-am-funding-fields="lender_escrow"]')));

    await page.selectOption('#intelStrip [data-am-input="f_method"]', "premium_financed");
    await page.waitForTimeout(400);
    ok("choosing Premium financed reveals the finance agreement fields",
       await page.evaluate(() =>
         !!document.querySelector('#intelStrip [data-am-funding-fields="premium_financed"]')));
    ok("…and the finance charge field says it is never part of insurance cost",
       await page.evaluate(() => {
         const el = document.querySelector('#intelStrip [data-am-field="f_charge"]');
         return !!el && /never part of what insurance costs/i.test(el.innerText);
       }));

    //  A REAL REFUSAL: no provenance at all.
    await page.fill('#intelStrip [data-am-input="f_effective_from"]', "2026-03-01");
    await page.fill('#intelStrip [data-am-input="f_provider"]', "AFCO Credit");
    await page.click('#intelStrip [data-am-act="f-confirm"]');
    await page.waitForTimeout(500);
    const noProv = await visible("#intelStrip [data-am-funding-error]");
    ok("recording funding with no document and no note refuses VISIBLY",
       noProv.found && noProv.boxed && !noProv.covered, JSON.stringify(noProv));

    await page.fill('#intelStrip [data-am-input="f_note"]', "IPFS agreement, emailed by the broker");
    await page.fill('#intelStrip [data-am-input="f_down"]', "23100.00");
    await page.fill('#intelStrip [data-am-input="f_principal"]', "96000.00");
    await page.fill('#intelStrip [data-am-input="f_charge"]', "7400.00");
    await page.fill('#intelStrip [data-am-input="f_count"]', "11");
    await page.fill('#intelStrip [data-am-input="f_installment"]', "9400.00");
    await page.click('#intelStrip [data-am-act="f-confirm"]');
    await page.waitForTimeout(1800);
    await page.mouse.move(4, 4);
    await page.waitForTimeout(150);
    await shot("11-funding-recorded.png");

    const fReceipt = await page.evaluate(() => {
      const el = document.querySelector("#intelStrip [data-am-receipt]");
      return el ? el.innerText : null;
    });
    ok("the funding write returns a receipt", !!fReceipt, JSON.stringify(fReceipt));
    ok("…and it says outright that insurance cost is unchanged",
       !!fReceipt && /separate facts|unchanged/i.test(fReceipt), JSON.stringify(fReceipt));

    const afterFunding = await page.evaluate(() => {
      const c = (k) => {
        const el = document.querySelector('#intelStrip [data-am-position="' + k + '"]');
        return el ? el.innerText : null;
      };
      const sec = document.querySelector('#intelStrip [data-am-section="cash_financing"]');
      return { annual: c("annual_cost"), accrual: c("monthly_accrual"),
               payment: c("payment"), cash: sec ? sec.innerText : "" };
    });
    ok("Cash & Financing now shows the arrangement the operator entered",
       /AFCO Credit/.test(afterFunding.cash), afterFunding.cash.slice(0, 200));
    ok("…with the finance charge labelled as a finance charge",
       /7,400\.00 finance charge/.test(afterFunding.cash), afterFunding.cash.slice(0, 300));
    //  A REAL DEFECT THE SCREENSHOT CAUGHT. This property has no
    //  allocation, so the POSITION has no currency, and money() rendered
    //  "null 9,400.00" into the operator's face. Financing is denominated
    //  by the program that issued the coverage, which is known either way.
    ok("no figure renders the word `null` as a currency",
       !/null/i.test(afterFunding.cash), afterFunding.cash.slice(0, 300));
    ok("…and financing figures carry the program's currency",
       /\$9,400\.00/.test(afterFunding.cash), afterFunding.cash.slice(0, 300));
    ok("PAYMENT now names the mechanism the operator chose",
       /Premium financed/i.test(String(afterFunding.payment)), JSON.stringify(afterFunding.payment));

    //  ── AND THE ACCRUAL DID NOT MOVE ────────────────────────────────
    //  This property has no established share, so both were blank before
    //  and must be blank after. Financing cannot create a cost that the
    //  allocation never established.
    ok("ANNUAL COST is unchanged by recording financing",
       afterFunding.annual === beforeFunding.annual,
       JSON.stringify({ before: beforeFunding.annual, after: afterFunding.annual }));
    ok("MONTHLY ACCRUAL is unchanged by recording financing",
       afterFunding.accrual === beforeFunding.accrual,
       JSON.stringify({ before: beforeFunding.accrual, after: afterFunding.accrual }));
    ok("the $9,400 installment did NOT become a monthly insurance figure",
       !/9,400/.test(String(afterFunding.accrual)), JSON.stringify(afterFunding.accrual));

    //  Put the operator back before the entitlement section runs.
    OPERATOR.property_id = propId;

    console.log("\n── 5b. ENTITLEMENT: THE DOOR IS NOT ADVERTISED ───────");

    /*  THIS SECTION EXISTS BECAUSE 88/88 WENT GREEN WHILE THE BUG SHIPPED.
     *
     *  The card carried class="desk-card hidden", the entitlement check
     *  correctly left `hidden` on it for an unentitled operator — and the
     *  card was on screen anyway. `.hidden{display:none!important}` is
     *  declared BEFORE `.desk-card{display:flex!important}`; equal
     *  specificity, so source order wins and the hide loses. Production
     *  showed Asset Management to staff who had no module, and clicking it
     *  reported the system was broken.
     *
     *  Every assertion below asks the COMPUTED result, never the class
     *  list. `classList.contains('module-hidden')` would have passed on the
     *  broken build too — that is the whole lesson.
     *
     *  The refusal is provoked through the REAL router: the module is
     *  revoked on the operator the real resolver returns, so the real
     *  requireAssetManagementModule gate issues a real 403.
     */
    OPERATOR.allowed_modules = ["management", "maintenance"];
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);

    ok("the app still loaded after the module was revoked",
       await page.evaluate(() => !!document.getElementById("deskGrid")));

    const cardState = await page.evaluate(() => {
      const el = document.getElementById("deskCardAssetManagement");
      if (!el) return { missing: true };
      const r = el.getBoundingClientRect();
      return {
        display: getComputedStyle(el).display,
        w: r.width, h: r.height,
        // what the DOCUMENT thinks is at the card's centre
        atCentre: (() => {
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return hit ? (el.contains(hit) || hit === el) : false;
        })(),
      };
    });

    ok("the Asset Management card is still in the DOM (hidden, not deleted)",
       !cardState.missing);
    ok("…and the COMPUTED display is none — not merely class-flagged",
       cardState.display === "none",
       "computed display was: " + cardState.display);
    ok("…and it occupies no box at all",
       cardState.w === 0 && cardState.h === 0,
       `box was ${cardState.w}×${cardState.h}`);
    ok("…and the document does not hit it at its own centre",
       cardState.atCentre === false);

    /*  Asserted as "no VISIBLE card leads to this door", not as a count.
     *  #deskGrid also holds a `capital` card gated by its own rule, and a
     *  hardcoded total would encode an assumption about someone else's
     *  gate — it would break when that gate changes and say nothing about
     *  this one. The claim here is exactly the claim being made.  */
    const visibleTargets = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#deskGrid .desk-card"))
        .filter(c => getComputedStyle(c).display !== "none")
        .map(c => (c.getAttribute("onclick") || "").replace(/.*openDesk\('([^']*)'\).*/, "$1")));
    ok("no VISIBLE desk card leads to asset_management",
       visibleTargets.indexOf("asset_management") === -1,
       "visible: " + JSON.stringify(visibleTargets));
    /*  Derived from what this operator ACTUALLY holds, not from a wish
     *  list. Every desk card is module-gated, and this operator never had
     *  `leasing` — asserting it should be visible would have been asserting
     *  a bug. The invariant that matters: revoking one module removes one
     *  door and leaves the rest standing.  */
    ok("…and every door the operator still holds is untouched by this gate",
       OPERATOR.allowed_modules.every(m => visibleTargets.indexOf(m) !== -1),
       "holds: " + JSON.stringify(OPERATOR.allowed_modules)
         + " · visible: " + JSON.stringify(visibleTargets));

    /*  A revoked operator can still REACH the surface — a stale tab, a
     *  revocation mid-session, a bookmark. What they must never see is a
     *  breakdown. Entered through the card's own handler, which is the
     *  real path; the card is simply no longer there to click.  */
    await page.evaluate(() => window.openDesk("asset_management"));
    await page.waitForTimeout(1500);

    const refusal = await page.evaluate(() => {
      const el = document.querySelector("#intelStrip [data-am-state]");
      if (!el) return { missing: true };
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        state: el.getAttribute("data-am-state"),
        text: el.innerText || "",
        cls: el.className,
        visible: !!hit && (el.contains(hit) || hit === el),
      };
    });

    ok("the refusal actually rendered", !refusal.missing);
    ok("a 403 is reported as NOT ENTITLED, not as a failed read",
       refusal.state === "not_entitled",
       "data-am-state was: " + refusal.state);
    ok("…and the words name the access fact, not a system fault",
       /access is not enabled for this property/i.test(refusal.text),
       refusal.text);
    ok("…and it names the next step, so the refusal is actionable",
       /ask an administrator/i.test(refusal.text));
    ok("…and it does NOT claim the system is unavailable or broken",
       !/unavailable|failed read/i.test(refusal.text),
       refusal.text);
    ok("…and it is not dressed as an error state",
       /am-not-entitled/.test(refusal.cls) && !/am-unavailable/.test(refusal.cls),
       refusal.cls);
    ok("…and it is genuinely VISIBLE, asked of the document",
       refusal.visible === true);

    /*  The picker was widened; the coverage list was not. SURFACES drives
     *  "x/4 owners" and room completeness — a fifth entry there would have
     *  changed unrelated dashboard math and demanded an owner nobody asked
     *  for. Access and coverage are different questions.  */
    const lists = await page.evaluate(() => ({
      picker: (typeof INVITE_MODULES !== "undefined") ? INVITE_MODULES.slice() : null,
      coverage: (typeof SURFACES !== "undefined") ? SURFACES.slice() : null,
      label: (typeof SURFACE_LABELS !== "undefined") ? SURFACE_LABELS.asset_management : null,
    }));
    ok("the TEAM permission picker offers asset_management",
       !!lists.picker && lists.picker.indexOf("asset_management") !== -1,
       JSON.stringify(lists.picker));
    ok("…under a name a human can grant",
       lists.label === "Asset Management", String(lists.label));
    ok("…while the owner-coverage list is UNCHANGED at four rooms",
       !!lists.coverage && lists.coverage.length === 4
         && lists.coverage.indexOf("asset_management") === -1,
       JSON.stringify(lists.coverage));

    await shot("05-unentitled.png");
    OPERATOR.allowed_modules = ["management", "maintenance", "asset_management"];

    console.log("\n── 6. NO CONSOLE WRECKAGE ────────────────────────────");
    ok("no uncaught page error during the whole run",
       pageErrors.length === 0, pageErrors.join(" | "));

    await shot("03-final.png");

  } finally {
    if (browser) await browser.close().catch(() => {});
    for (const s of [apiServer, staticServer, tlsServer]) {
      if (s && s.close) await new Promise((r) => s.close(r)).catch(() => {});
    }
    try { await pool.query(`drop schema ${schema} cascade`); } catch (_) {}
    await pool.end();
  }

  console.log("\n════════════════════════════════════════════════════════");
  console.log(`  ${pass + fail} assertions · ${pass} passed · ${fail} failed`);
  console.log(`  screenshots: ${OUT}`);
  console.log("════════════════════════════════════════════════════════");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
