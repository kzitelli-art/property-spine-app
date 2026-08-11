#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
//  deal_setup_opening_tenancy.browser.js — THE MORNING TEST
//
//  DELIBERATELY NOT NAMED *.test.js — run_harnesses.sh globs those and this
//  needs Playwright + Chromium, which the repo does not depend on.
//
//    SP=/opt/node22/lib API=http://127.0.0.1:3999 SESSION=<raw token> \
//    node asset_management_opening_position.browser.js
//
//  ── WHAT IS REAL HERE ───────────────────────────────────────────────
//  Real Chromium · the real index.html, byte-identical · the real API
//  process · real Postgres. Nothing stubbed, no fixture JSON.
//
//  ── THE TEST THE BUILD IS FOR ───────────────────────────────────────
//    Open Spine → Deal Setup → create a deal → add a property →
//    upload a rent roll → Spine understands the position → handle the
//    exceptions → establish → come back later and it is still there →
//    open the staff Rent Roll and see the same sourced position.
//
//  ── HOW THIS PROOF CAN LIE, AND WHAT STOPS IT ───────────────────────
//  A browser proof in this repo once passed 13/13 while the screen showed
//  the sign-in door: it read `innerText` from an element that never
//  rendered, and innerText silently falls back to textContent. So:
//
//    G1  the panel must be VISIBLE before anything else is asserted
//    ·   text is read from `document.body.innerText` only — layout-aware,
//        so an unrendered element contributes nothing
//    ·   a screenshot is written at every stage and is meant to be LOOKED AT
//
//  A count here is a claim about what was on the screen, not about what
//  the API returned. Where this asserts the database, it says so.
// ════════════════════════════════════════════════════════════════════
"use strict";

const { chromium } = require(process.env.SP + "/node_modules/playwright");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { serveStatic, serveTls } = require("./tools/browser_stack.js");

const APP_DIR = __dirname;
const API = (process.env.API || "http://127.0.0.1:3999").replace(/\/+$/, "");
const SESSION = process.env.SESSION;
const OUT = process.env.SHOTS || "/tmp/ds-browser";
const PROD = "https://property-spine-api.onrender.com";
const APP_PORT = 8080 + (process.pid % 500);
const TLS_PORT = 9443 + (process.pid % 300);

if (!SESSION) { console.error("SESSION (raw staff session token) is required"); process.exit(2); }

let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log("  ok    " + label); }
  else { fail++; console.log("  FAIL  " + label + (detail ? "\n        " + detail : "")); }
  return cond;
};

const RENT_ROLL = [
  "Unit #,Resident,Mkt Rent,Actual Rent,Lease From,Lease To,Balance",
  "1A,\"Marchetti, Elena\",2100,2050,2025-08-01,2026-07-31,0",
  "1B,VACANT,2150,,,,",
  "2A,\"Osei, Kwame\",2200,2200,2025-03-01,2026-02-28,0",
  "2B,\"Rivera, Luz\",2250,,2025-05-01,2026-04-30,0",
].join("\n");

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const csvPath = path.join(os.tmpdir(), "SOLO Rent Roll 2026-04-30.csv");
  fs.writeFileSync(csvPath, RENT_ROLL);

  console.log("════════════════════════════════════════════════════════════════");
  console.log("  BROWSER   asset_management_opening_position.browser.js");
  console.log("  APP       " + APP_DIR + "/index.html  (byte-identical)");
  console.log("  API       " + API + "   (a real API process over real Postgres)");
  console.log("  SHOTS     " + OUT);
  console.log("════════════════════════════════════════════════════════════════");
  console.log("  ASSERTIONS STARTED\n");

  const apiPort = Number(API.split(":").pop());
  const staticServer = await serveStatic(APP_DIR, APP_PORT);
  const tlsServer = await serveTls(apiPort, TLS_PORT);

  const browser = await chromium.launch({
    executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--ignore-certificate-errors"] });
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

  //  Seeded the way the product does it — sessionStorage and the app's own
  //  api-base override. Both are real mechanisms, not test hooks.
  await page.addInitScript(([api, token]) => {
    try {
      localStorage.setItem("ps_api_base", api);
      sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: token }));
    } catch (_) {}
  }, ["https://127.0.0.1:" + TLS_PORT, SESSION]);

  const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name), fullPage: true }); };
  const body = async () => (await page.evaluate(() => document.body.innerText)) || "";
  /*  ── VISIBLE MEANS A HUMAN CAN SEE IT ─────────────────────────────
   *  Box size and computed style are not enough. This build shipped a
   *  feedback element that had width, height, `display:block` and real
   *  text — and sat UNDERNEATH a fixed full-screen overlay. It read
   *  perfectly to innerText and to a getBoundingClientRect check, and was
   *  invisible to the person using it. Two rent-roll uploads looked like
   *  they did nothing.
   *
   *  So visibility is asked of the DOCUMENT, not the element:
   *  elementFromPoint at the element's centre must return the element or
   *  something inside it. If a different element is on top, it is covered,
   *  and covered is invisible no matter what the styles say. */
  const visible = async (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (!(r.width > 0 && r.height > 0)) return false;
    if (st.visibility === "hidden" || st.display === "none" || st.opacity === "0") return false;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false;
    const hit = document.elementFromPoint(x, y);
    return Boolean(hit && (hit === el || el.contains(hit) || hit.contains(el)));
  }, sel);

  await page.goto(`http://127.0.0.1:${APP_PORT}/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await shot("00-loaded.png");

  // ══ G1 · THE GUARD ════════════════════════════════════════════════
  //  Open the surface the way a person does, then refuse to continue
  //  unless it is actually on the screen.
  await page.evaluate(() => window.dsShow && window.dsShow());
  await page.waitForTimeout(1800);
  await shot("01-deal-setup.png");

  const panelVisible = await visible("#dealSetupPanel");
  ok("G1  the Deal Setup panel is actually rendered", panelVisible);
  if (!panelVisible) {
    console.log("\n  ✗ STOPPING — the panel never rendered, so nothing below would mean anything.");
    console.log("    Look at " + path.join(OUT, "01-deal-setup.png") + "\n");
    await browser.close(); staticServer.close(); tlsServer.close();
    process.exit(1);
  }

  const t0 = await body();
  ok("B1  it says Deal Setup and offers Deals",
     /Deal Setup/i.test(t0) && /Deals/i.test(t0));

  // ══ CREATE A DEAL ═════════════════════════════════════════════════
  const DEAL = "SOLO " + process.pid;
  await page.fill("#dsNewDealName", DEAL);
  await page.click("#dealSetupPanel button:has-text('Create deal')");
  await page.waitForTimeout(2000);
  await shot("02-deal-created.png");

  const t1 = await body();
  ok("B2  the deal is created and opened by name", t1.includes(DEAL), t1.slice(0, 200));
  ok("B3  it asks for a property, in plain words",
     /Add a property/i.test(t1) && /Property name/i.test(t1));

  // ══ ADD A PROPERTY ════════════════════════════════════════════════
  const ADDR = (400000 + (process.pid % 90000)) + " Chestnut St";
  await page.fill("#dsPropName", "4233 Chestnut");
  await page.fill("#dsPropAddr", ADDR);
  await page.fill("#dsPropCity", "Philadelphia");
  await page.fill("#dsPropState", "PA");
  await page.fill("#dsPropZip", "19104");
  await page.click("#dealSetupPanel button:has-text('Add property')");
  await page.waitForTimeout(2200);
  await shot("03-property-added.png");

  const t2 = await body();
  ok("B4  the property appears on the deal with its address",
     t2.includes("4233 Chestnut") && t2.includes(ADDR), t2.slice(0, 300));
  ok("B5  it says the property is not set up yet, and offers to set it up",
     /Not set up yet/i.test(t2) && /Set up/i.test(t2));

  //  THE MACHINERY MUST NOT BE ON SCREEN. This is the acceptance clause
  //  a JSON proof can never catch.
  ok("B6  no identity or database machinery is shown to the user",
     !/canonical[_ ]key/i.test(t2) && !/import_batch/i.test(t2)
     && !/proposed_record/i.test(t2) && !/uuid/i.test(t2)
     && !/organization_id/i.test(t2),
     t2.slice(0, 400));

  // ══ SET UP: UPLOAD THE REAL FILE ══════════════════════════════════
  await page.click("#dealSetupPanel button:has-text('Set up')");
  await page.waitForTimeout(2200);
  await shot("04-setup-empty.png");

  const t3 = await body();
  ok("B7  setup asks for the rent roll and says Spine keeps the file",
     /rent roll/i.test(t3) && /keeps the file|keeps the original/i.test(t3), t3.slice(0, 400));

  await page.setInputFiles("#dsRentRollFile", csvPath);
  await page.fill("#dsAsOf", "2026-04-30");
  await page.click("#dealSetupPanel button:has-text('Upload and read')");
  await page.waitForTimeout(4500);
  await shot("05-read.png");

  const t4 = await body();
  ok("B8  Spine shows what it read, naming the file and its date",
     t4.includes("SOLO Rent Roll 2026-04-30.csv") && /2026-04-30/.test(t4), t4.slice(0, 500));
  ok("B9  it shows what it understood the columns to mean",
     /Columns understood/i.test(t4) && /unit number/i.test(t4) && /actual rent/i.test(t4));
  ok("B10 the units from the file are on screen",
     t4.includes("1A") && t4.includes("2A") && t4.includes("Marchetti, Elena"));
  ok("B11 the vacant unit reads as vacant, not as a resident named VACANT",
     /vacant/i.test(t4) && !/Resident\s*VACANT/i.test(t4));
  ok("B12 the exception is surfaced in words a person can act on",
     /need a look|needs a look/i.test(t4) && /asking rent/i.test(t4), t4.slice(0, 700));

  // ══ HANDLE THE EXCEPTIONS AND ESTABLISH ═══════════════════════════
  await page.click("#dealSetupPanel button:has-text('Add all')");
  await page.waitForTimeout(3500);
  await shot("06-added.png");

  const t5 = await body();
  ok("B13 the confirmed rows read as Added", /Added/i.test(t5), t5.slice(0, 300));

  await page.click("#dealSetupPanel button:has-text('Establish lease')");
  await page.waitForTimeout(3000);
  await shot("07-established.png");

  const t6 = await body();
  ok("B14 the deal now shows the property with an opening position",
     /Lease & occupancy established/i.test(t6) && /as of 2026-04-30/i.test(t6), t6.slice(0, 500));
  ok("B15 the remaining exception is still counted, not hidden",
     /need attention/i.test(t6), t6.slice(0, 500));

  // ══ LEAVE, AND COME BACK ══════════════════════════════════════════
  //  A full reload: new page, new JS context, nothing in memory.
  await page.evaluate(() => window.dsHide && window.dsHide());
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.dsShow && window.dsShow());
  await page.waitForTimeout(2200);
  await page.click(`#dealSetupPanel tr:has-text("${DEAL}")`);
  await page.waitForTimeout(2200);
  await shot("08-returned.png");

  const t7 = await body();
  ok("B16 after leaving and returning, the position is still there",
     /Lease & occupancy established/i.test(t7) && /as of 2026-04-30/i.test(t7)
     && t7.includes("4233 Chestnut"), t7.slice(0, 500));

  // ══ THE ASSERTIONS THAT WOULD HAVE CAUGHT THE SHIPPED DEFECT ══════
  //  Every one of these passed trivially before, because the old proof
  //  read innerText — which happily returns text from an element buried
  //  under a fixed overlay.
  //
  //  It provokes a REAL SERVER REFUSAL through the real product path
  //  rather than calling the app's own toast function. An earlier version
  //  of this block did call it directly, found it was not on `window`
  //  (the surface lives in an IIFE), silently skipped, and reported the
  //  channel broken. A proof that reaches past the product to assert the
  //  product is testing its own reach.
  //
  //  The refusal used: adding a property whose address already resolves
  //  to one. That is Build 1A's identity guard answering over HTTP —
  //  409, with prose written for a person.
  await page.evaluate(() => window.dsShow && window.dsShow());
  await page.waitForTimeout(1500);
  await page.click(`#dealSetupPanel tr:has-text("${DEAL}")`);
  await page.waitForTimeout(2000);

  await page.fill("#dsPropName", "4233 Chestnut");
  await page.fill("#dsPropAddr", ADDR);          // the SAME address as before
  await page.fill("#dsPropCity", "Philadelphia");
  await page.fill("#dsPropState", "PA");
  await page.fill("#dsPropZip", "19104");
  await page.click("#dealSetupPanel button:has-text('Add property')");
  await page.waitForTimeout(2500);
  await shot("09-refusal-visible.png");

  ok("B19 a real server refusal is rendered where the user is looking",
     await visible("#dsFeedback"),
     "the feedback element is present but covered, or absent — the exact defect this shipped with");

  const feedbackText = await page.evaluate(() => {
    const el = document.querySelector("#dsFeedback");
    return el ? (el.innerText || "") : "";
  });
  ok("B20 …in the product's own words, not a status code",
     /already/i.test(feedbackText) && /address|propert/i.test(feedbackText)
     && !/\b409\b/.test(feedbackText),
     JSON.stringify(feedbackText).slice(0, 200));

  //  The app shell's #receipt is the channel this surface used to write
  //  to. Proving it is COVERED is proving the bug is understood rather
  //  than merely routed around.
  const receiptCovered = await page.evaluate(() => {
    const el = document.querySelector("#receipt");
    if (!el) return "absent";
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return "zero-size";
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit && (hit === el || el.contains(hit)) ? "VISIBLE" : "covered";
  });
  ok("B21 the app shell's toast target is provably unreachable from this surface",
     receiptCovered !== "VISIBLE",
     `#receipt is ${receiptCovered} — if VISIBLE, the old channel works and this ` +
     `proof is asserting the wrong thing`);

  //  A refusal must not evaporate before it is read. Successes may fade;
  //  refusals may not.
  await page.waitForTimeout(8000);
  ok("B22 the refusal persists — it does not fade before anyone reads it",
     await visible("#dsFeedback"),
     "the refusal disappeared on a timer; only successes are allowed to do that");

  ok("B17 no page errors were thrown at any point",
     pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  ok("B18 the app really talked to the API through its sealed loader",
     redirected > 0, `redirected requests: ${redirected}`);

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log(`  ASSERTIONS COMPLETE · ${pass + fail} run · ${pass} passed · ${fail} failed`);
  console.log(`  SCREENSHOTS — look at them, do not trust this output alone:`);
  for (const f of fs.readdirSync(OUT).sort()) console.log("    " + path.join(OUT, f));
  console.log("════════════════════════════════════════════════════════════════\n");

  await browser.close(); staticServer.close(); tlsServer.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
