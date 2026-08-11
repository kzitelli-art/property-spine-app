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

    // ── the API: the REAL router, plus the /operator/me the app needs ──
    const resolverPath = require.resolve(
      path.join(API_REPO, "src", "identity", "staff_session_service.js"));
    const OPERATOR = {
      id: "u-am", name: "Asset Ops", role: "property_manager",
      property_id: propId,
      allowed_modules: ["management", "maintenance", "asset_management"],
    };
    require.cache[resolverPath] = {
      id: resolverPath, filename: resolverPath, loaded: true,
      exports: { resolveStaffSession: async (_p, tok) => (tok === SESSION ? OPERATOR : null) },
    };

    const express = require(path.join(API_REPO, "node_modules", "express"));
    const app = express();
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
        property_id: propId, property_name: "Solo on Chestnut",
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
      await route.continue({ url: route.request().url().replace(PROD, "https://127.0.0.1:" + TLS_PORT) });
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

    console.log("\n── 5. NO FABRICATED ECONOMICS ON SCREEN ──────────────");

    ok("the RENDERED panel contains no currency-shaped token",
       !CURRENCYISH.test(panelText),
       CURRENCYISH.test(panelText) ? "matched: " + (panelText.match(CURRENCYISH) || [])[0] : "");
    ok("the lease's real rent (1850.00) is in the database and NOT on the screen",
       !/1850/.test(panelText));
    ok("no canvas/svg chart was rendered into the panel",
       await page.evaluate(() =>
         !document.querySelector("#intelStrip canvas, #intelStrip svg")));

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
