/* ════════════════════════════════════════════════════════════════════
   phase_zero_leasing_fixture_sweep.browser.js — CAN A REAL OPERATOR
   ENTER SKYLINE AND BE SHOWN FICTION?

   Phase Zero's brief makes this part of acceptance, and calls it a
   release blocker:

     For every currently reachable Leasing surface under an authenticated
     Skyline session —
       live truth exists   → render it
       live truth is empty → honest empty state
       live read fails     → unavailable / retry
       NEVER               → a fixture response, Demo Building data, or
                             the skyline-1417 offline library

   Skyline has no onboarding data, so every read is legitimately empty.
   That is exactly the condition under which a fixture fallback fires,
   which is why this proof enters a property with nothing in it rather
   than one that happens to be populated.

   ── WHAT IT ASSERTS, AND WHY EACH ONE ───────────────────────────────
   · The DESK ACTUALLY OPENED. A sweep that never left Home would pass
     while proving nothing about Leasing (§33: assert the surface loaded
     before believing anything read from it).
   · NO FIXTURE NUMBERS. The demo leasing payload is a specific,
     recognisable set of figures — 91.5% occupancy, 95.0% future rent
     roll, 207 unassigned. A property with no rent roll cannot produce
     them, so their presence is proof of substitution, not coincidence.
   · NO "DEMO" VOCABULARY in operator-visible text.
   · NO FIXTURE RESIDENTS from seeds/data_skyline.js or the offline
     libraries.
   · LAYOUT-AWARE TEXT ONLY, read from the LIVE document. innerText on a
     detached clone silently falls back to textContent and reads hidden
     <option> labels — this repo has already paid for that once, and this
     proof paid for it again during Phase Zero.

   Run:
     HARNESS_DATABASE_URL="postgresql://postgres@127.0.0.1:5433/spine_full?sslmode=no-verify" \
     API_PORT=3011 node phase_zero_leasing_fixture_sweep.browser.js
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const fs = require("fs");
const API_MODULES = "/home/user/property-spine-api/node_modules";
const { chromium } = require(path.join(API_MODULES, "playwright"));
const { Pool } = require(path.join(API_MODULES, "pg"));
const { serveStatic, serveTls } = require("./tools/browser_stack.js");

const CONN = process.env.HARNESS_DATABASE_URL;
const API_PORT = Number(process.env.API_PORT || 3011);
const STATIC_PORT = 4331;
const TLS_PORT = 4463;
const SHOTS = path.join(__dirname, "docs", "screenshots_phase_zero");
if (!CONN) { console.error("REFUSED: set HARNESS_DATABASE_URL."); process.exit(2); }

let pass = 0, fail = 0; const failures = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log("  ok    " + label); }
  else { fail++; failures.push(label); console.log("  FAIL  " + label + (detail ? "\n          " + detail : "")); }
}

/*  Figures that exist ONLY in leasingFallback(). A property with no rent
 *  roll, no leases and no applications cannot compute any of them. */
const FIXTURE_FIGURES = ["91.5%", "95.0%", "207"];
/*  Residents from seeds/data_skyline.js and the offline libraries. */
const FIXTURE_PEOPLE = ["Aditya Pandit", "Yu Chen Lee", "Emechebe Chinwoke", "Isabella Hand", "Marlow"];
/*  Vocabulary that betrays a demo payload reaching an operator. */
const DEMO_WORDS = ["Demo fallback", "Demo warning", "Property Spine Demo Building", "Solo on Chestnut"];

async function cleanup(pool) {
  const u = (await pool.query(`select id from users where email = 'sweep.phase0@example.test'`)).rows.map((r) => r.id);
  for (const id of u) {
    await pool.query(`delete from staff_sessions where user_id=$1`, [id]);
    await pool.query(`delete from property_team_assignments where user_id=$1`, [id]);
    await pool.query(`delete from users where id=$1`, [id]);
  }
  const o = (await pool.query(`select id from organizations where name = 'Sweep Phase Zero'`)).rows.map((r) => r.id);
  for (const id of o) {
    await pool.query(`delete from properties where organization_id=$1`, [id]);
    await pool.query(`delete from organizations where id=$1`, [id]);
  }
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const pool = new Pool({ connectionString: CONN });
  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("  LEASING FIXTURE SWEEP — a real Skyline session, no data");
  console.log("════════════════════════════════════════════════════════════════\n");

  await cleanup(pool);
  const org = (await pool.query(
    `insert into organizations (name) values ('Sweep Phase Zero') returning id`)).rows[0].id;
  const skyline = (await pool.query(
    `insert into properties (name, address, organization_id) values ('Skyline Apartments','1417 N 15th St',$1) returning id`,
    [org])).rows[0].id;
  const user = (await pool.query(
    `insert into users (name, email, role, is_active, status)
     values ('Sweep','sweep.phase0@example.test','asset_manager',true,'active') returning id`)).rows[0].id;
  await pool.query(
    `insert into property_team_assignments (property_id,user_id,role_title,allowed_modules,can_manage_roles,active)
     values ($1,$2,'Asset Manager',$3,true,true)`,
    [skyline, user, ["leasing", "management", "maintenance", "asset_management"]]);

  const staffSessions = require("/home/user/property-spine-api/src/identity/staff_session_service.js");
  const c0 = await pool.connect();
  let session;
  try {
    await c0.query("begin");
    session = await staffSessions.issueStaffSession(c0, {
      userId: user, propertyId: skyline, purpose: "bootstrap_invite" });
    await c0.query("commit");
  } finally { c0.release(); }

  const staticServer = await serveStatic(__dirname, STATIC_PORT);
  const tls = await serveTls(API_PORT, TLS_PORT);
  const CHROME = process.env.PLAYWRIGHT_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch({
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    args: ["--ignore-certificate-errors", "--no-sandbox"] });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();

  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.startsWith("https://property-spine-api.onrender.com")) {
      return route.continue({ url: url.replace("https://property-spine-api.onrender.com", "https://127.0.0.1:" + TLS_PORT) });
    }
    return route.continue();
  });

  //  Layout-aware text from the LIVE document — never a detached clone.
  const visibleText = () => page.evaluate(() => {
    const parts = [];
    ["#home", "#workspace"].forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      parts.push(el.innerText || "");
    });
    return parts.join("\n");
  });

  try {
    await page.addInitScript(([t]) => {
      try { sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t })); } catch (_) {}
    }, [session.session_token]);
    await page.goto(`http://127.0.0.1:${STATIC_PORT}/index.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.classList.contains("entered"), { timeout: 30000 }).catch(() => {});
    ok("the app loaded under a real Skyline session",
      await page.evaluate(() => document.body.classList.contains("entered")));

    const me = await page.evaluate(async () => {
      const v = await window.__psLive.verifySession();
      return v && v.property && v.property.name;
    });
    ok("the session really is Skyline", me === "Skyline Apartments", String(me));

    // ── open the Leasing desk the way an operator does ───────────────
    console.log("\n  ── the Leasing desk, entered through the real door ──");
    await page.evaluate(() => window.openDesk("leasing"));
    await page.waitForTimeout(3500);
    const opened = await page.evaluate(() => ({
      workspaceShown: !!document.querySelector("#workspace:not(.hidden)"),
      homeHidden: !!document.querySelector("#home.hidden"),
      desk: typeof activeDesk !== "undefined" ? activeDesk : null,
    }));
    ok("THE LEASING DESK ACTUALLY OPENED", opened.workspaceShown && opened.desk === "leasing",
      JSON.stringify(opened));

    const text = await visibleText();

    // ── the assertions that matter ───────────────────────────────────
    console.log("\n  ── and it shows nothing it cannot support ──");
    const figures = FIXTURE_FIGURES.filter((f) => text.includes(f));
    ok("NO FIXTURE LEASING FIGURES on a property with no rent roll",
      figures.length === 0, "found: " + JSON.stringify(figures));

    const people = FIXTURE_PEOPLE.filter((p) => text.includes(p));
    ok("no fixture residents render", people.length === 0, "found: " + JSON.stringify(people));

    const demo = DEMO_WORDS.filter((d) => text.includes(d));
    ok("no demo vocabulary reaches the operator", demo.length === 0, "found: " + JSON.stringify(demo));

    ok("the surface says something honest about absence",
      /no |none|not connected|unavailable|empty|nothing|not activated|—/i.test(text),
      text.slice(0, 300));

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SHOTS, "05-skyline-leasing-desk.png") });

    // ══ THE OTHER DESKS THAT READ THE SAME FALLBACK ══════════════════
    //  leasingFallback() is referenced at ten sites, not one. renderLeasing
    //  assigns its result to `lastLeasing`, and renderManagement and
    //  renderReporting each build their own `lease` from it independently.
    //  A sweep that checked only the Leasing home would therefore pass while
    //  the demo figures rendered one door over — which is exactly the shape
    //  of miss this repo's own method doctrine warns about.
    console.log("\n  ── the other doors that read the same fallback ──");
    for (const desk of ["management", "reporting"]) {
      await page.evaluate((d) => window.openDesk(d), desk);
      await page.waitForTimeout(3000);
      const deskText = await visibleText();
      const f = FIXTURE_FIGURES.filter((x) => deskText.includes(x));
      const w = DEMO_WORDS.filter((x) => deskText.includes(x));
      ok(`${desk}: no fixture leasing figures`, f.length === 0, "found: " + JSON.stringify(f));
      ok(`${desk}: no demo vocabulary`, w.length === 0, "found: " + JSON.stringify(w));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(SHOTS, `06-skyline-${desk}-desk.png`) });
    }

  } finally {
    await browser.close();
    staticServer.close(); tls.close();
    await cleanup(pool);
    await pool.end();
  }

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log(`  ${pass + fail} run · ${pass} passed · ${fail} failed`);
  if (fail) console.log("  FAILED: " + failures.join(" | "));
  console.log(fail ? "  ✗ FAIL" : "  ✓ PASS");
  console.log("════════════════════════════════════════════════════════════════\n");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
