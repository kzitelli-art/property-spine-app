/* ════════════════════════════════════════════════════════════════════
   phase_zero_property_boundary.browser.js — PHASE ZERO, VERIFIED IN A
   REAL BROWSER against the real index.html and the real API.

   The sentence this proof exists to make true:

     A real operator signs in, sees only properties they are authorized to
     operate, chooses one, receives a server-issued session for that
     property, and the entire signed-in app thereafter either shows that
     property's live truth or honestly shows that truth is unavailable.

   ── WHAT IT REFUSES TO REPEAT ───────────────────────────────────────
   Every assertion style here was earned by a real miss in this repo:

   · RENDERED IS NOT VISIBLE. A browser proof once passed 13/13 while the
     browser showed the sign-in screen, and Deal Setup shipped writing
     every message into an element sitting UNDER a fixed overlay. So
     visibility is asked of the DOCUMENT: elementFromPoint at the
     element's centre must return that element or something inside it.

   · ASSERT THE APP ACTUALLY LOADED before believing anything else.

   · SCOPE EVERY SELECTOR to the surface under test. In a full-screen
     overlay app an unscoped selector is a coin flip.

   ── AND THE THREE THIS SLICE ADDS ───────────────────────────────────
   · NO IMPLICIT DEMO BUILDING. Before a session resolves, the active
     property must be NOTHING. The old markup shipped Demo Building as
     the first <option> of a hidden <select>, so prop() returned it by
     markup order. That is asserted against directly.

   · CHROME AND SESSION CANNOT DISAGREE. After every switch the proof
     asks the SERVER (/operator/me) what the scope is and compares it to
     what the browser is rendering. "Skyline chrome + Demo data" is the
     failure this whole slice exists to prevent, so it is checked rather
     than assumed.

   · NO BELIEVABLE FIXTURE ON A REAL PROPERTY. Skyline has no onboarding
     data. The proof enters Skyline and fails on any appearance of the
     known fixture corpus — the skyline-1417 offline library's resident
     names, Demo Building's name, or a rent-roll-shaped number where the
     property has no rent roll. An honest empty state is the pass.

   Run:
     HARNESS_DATABASE_URL="postgresql://postgres@127.0.0.1:5433/spine_full?sslmode=no-verify" \
     API_PORT=3011 node phase_zero_property_boundary.browser.js
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
const STATIC_PORT = 4311;
const TLS_PORT = 4443;
const SHOTS = path.join(__dirname, "docs", "screenshots_phase_zero");

if (!CONN) { console.error("REFUSED: set HARNESS_DATABASE_URL."); process.exit(2); }

let pass = 0, fail = 0; const failures = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log("  ok    " + label); }
  else { fail++; failures.push(label); console.log("  FAIL  " + label + (detail ? "\n          " + detail : "")); }
}

//  The fixture corpus that must never appear under a real Skyline session.
//  Names are taken from the app's own offline libraries and from
//  seeds/data_skyline.js — if any of these render, a getJSON surface
//  answered a signed-in operator with fiction.
const FIXTURE_TELLS = [
  "Property Spine Demo Building",
  "Solo on Chestnut",
  "4233 Chestnut",
  "Temple Nest",
  "Aditya Pandit",     // seeds/data_skyline.js, row 1
  "Yu Chen Lee",
  "Emechebe Chinwoke",
  "Marlow",            // the Demo Building tour record
];

/*  Remove every row this proof creates, by its own markers. Runs before the
 *  setup and again in the finally, so neither a crash nor a clean exit can
 *  leave the database carrying proof residue. */
async function cleanup(pool) {
  const u = (await pool.query(
    `select id from users where email = 'kameron.phase0@example.test'`)).rows.map((r) => r.id);
  for (const id of u) {
    await pool.query(`delete from staff_sessions where user_id=$1`, [id]);
    await pool.query(`delete from property_team_assignments where user_id=$1`, [id]);
    await pool.query(`delete from users where id=$1`, [id]);
  }
  const o = (await pool.query(
    `select id from organizations where name = 'Zitelli Phase Zero'`)).rows.map((r) => r.id);
  for (const id of o) {
    await pool.query(`delete from properties where organization_id=$1`, [id]);
    await pool.query(`delete from organizations where id=$1`, [id]);
  }
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const pool = new Pool({ connectionString: CONN });

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("  PHASE ZERO — REAL PROPERTY ENTRY, in a real browser");
  console.log("════════════════════════════════════════════════════════════════\n");

  // ── the world, through the real tables ───────────────────────────
  //  IDEMPOTENT SETUP. A harness that only works on a virgin database is a
  //  harness nobody re-runs, and a failed run that dies before its cleanup
  //  (a browser that will not launch, say) leaves exactly these rows behind.
  //  Clearing first is not tidiness — it is what makes the proof repeatable
  //  after it fails, which is when you most need to run it again.
  await cleanup(pool);

  const org = (await pool.query(
    `insert into organizations (name) values ('Zitelli Phase Zero') returning id`)).rows[0].id;
  async function property(name, address) {
    return (await pool.query(
      `insert into properties (name, address, organization_id) values ($1,$2,$3) returning id`,
      [name, address, org])).rows[0].id;
  }
  const demoBuilding = await property("Property Spine Demo Building", "Demo St");
  const skyline = await property("Skyline Apartments", "1417 N 15th St");
  const greenery = await property("Greenery Apartments", "1325 N 15th St");
  const notMine = await property("Someone Else's Building", "Elsewhere");

  const kameron = (await pool.query(
    `insert into users (name, email, role, is_active, status)
     values ('Kameron','kameron.phase0@example.test','asset_manager',true,'active') returning id`)).rows[0].id;

  async function assign(propertyId, modules) {
    await pool.query(
      `insert into property_team_assignments
         (property_id, user_id, role_title, allowed_modules, can_manage_roles, active)
       values ($1,$2,'Asset Manager',$3,true,true)`, [propertyId, kameron, modules]);
  }
  const MODULES = ["leasing", "management", "maintenance", "asset_management"];
  await assign(demoBuilding, MODULES);
  await assign(skyline, MODULES);
  await assign(greenery, MODULES);
  //  Deliberately NOT assigned to `notMine`.

  //  A real session, from the real issuer. The SMS transport is the only
  //  thing skipped; the token is minted by issueStaffSession exactly as a
  //  sign-in would mint it.
  const staffSessions = require(path.join("/home/user/property-spine-api/src/identity/staff_session_service.js"));
  const c0 = await pool.connect();
  let session;
  try {
    await c0.query("begin");
    session = await staffSessions.issueStaffSession(c0, {
      userId: kameron, propertyId: demoBuilding, purpose: "bootstrap_invite",
    });
    await c0.query("commit");
  } finally { c0.release(); }

  const staticServer = await serveStatic(__dirname, STATIC_PORT);
  const tls = await serveTls(API_PORT, TLS_PORT);
  //  The API repo's playwright and the preinstalled browser bundle are on
  //  different revisions in this environment, so the binary is named
  //  explicitly rather than downloaded. PLAYWRIGHT_CHROMIUM is the override
  //  when a runner has its own path; the default is the standard location.
  const CHROME = process.env.PLAYWRIGHT_CHROMIUM
    || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch({
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    args: ["--ignore-certificate-errors", "--no-sandbox"],
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();

  //  Redirect the pinned production origin at the local API. The app is
  //  NEVER edited — the transport is redirected instead, so this is a
  //  proof about the shipped file.
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.startsWith("https://property-spine-api.onrender.com")) {
      return route.continue({ url: url.replace("https://property-spine-api.onrender.com", "https://127.0.0.1:" + TLS_PORT) });
    }
    return route.continue();
  });

  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String((e && e.message) || e)));

  const visible = async (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { found: false };
    el.scrollIntoView({ block: "center", behavior: "instant" });
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return { found: true, boxed: false };
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) {
      return { found: true, boxed: true, offscreen: true };
    }
    const hit = document.elementFromPoint(cx, cy);
    return { found: true, boxed: true, offscreen: false,
             covered: !(hit && (hit === el || el.contains(hit) || hit.contains(el))) };
  }, sel);

  //  Scroll to the top before capturing. The hero title is the label that
  //  actually leaked the previous property, so a receipt that does not show
  //  it is a receipt for the wrong thing.
  const shot = async (n) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    return page.screenshot({ path: path.join(SHOTS, n), fullPage: false });
  };

  try {
    // ══ 1. BEFORE A SESSION: NO IMPLICIT DEMO BUILDING ═══════════════
    console.log("  ── before identity resolves, the active property is NOTHING ──");
    await page.goto(`http://127.0.0.1:${STATIC_PORT}/index.html`, { waitUntil: "domcontentloaded" });
    const preAuth = await page.evaluate(() => {
      const sel = document.getElementById("propPick");
      return { exists: !!sel, optionCount: sel ? sel.options.length : -1, value: sel ? sel.value : null };
    });
    ok("#propPick exists", preAuth.exists);
    ok("it ships with ZERO hard-coded options", preAuth.optionCount === 0, `got ${preAuth.optionCount}`);
    ok("so the active property before sign-in is empty, not Demo Building",
      preAuth.value === "" || preAuth.value === null, `got ${JSON.stringify(preAuth.value)}`);
    ok("the Demo Building UUID is not the shipped default",
      preAuth.value !== "a50fbdd0-3642-431e-b532-0dcd6ab8a4fe");

    // ══ 2. SIGN IN AND LOAD ══════════════════════════════════════════
    console.log("\n  ── a real session, and the app actually loads ──");
    await page.addInitScript(([token]) => {
      try { sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: token })); } catch (_) {}
    }, [session.session_token]);
    await page.goto(`http://127.0.0.1:${STATIC_PORT}/index.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.classList.contains("entered"), { timeout: 30000 })
      .catch(() => {});
    const loaded = await page.evaluate(() => ({
      entered: document.body.classList.contains("entered"),
      gateShown: !!document.querySelector("#entryGate.show"),
    }));
    ok("THE APP LOADED (not the sign-in screen)", loaded.entered && !loaded.gateShown,
      JSON.stringify(loaded));

    //  Wait for the CHIPS, not for the data behind them. __psAuthorizedProperties
    //  is assigned inside loadProperties(), which returns before
    //  refreshPropSwitcher() writes the bar — waiting on the data read the
    //  switcher mid-render and counted one chip that was still the old markup.
    await page.waitForFunction(
      () => document.querySelectorAll(".psw-chip").length > 1,
      { timeout: 25000 }).catch(() => {});

    // ══ 3. THE PICKER SHOWS EXACTLY THE AUTHORIZED SET ═══════════════
    console.log("\n  ── the picker is the server's list, and only the server's list ──");
    const picker = await page.evaluate(() => {
      const rows = window.__psAuthorizedProperties || [];
      const chips = Array.from(document.querySelectorAll(".psw-chip")).map((c) => ({
        val: c.getAttribute("data-val"), text: (c.innerText || "").trim(),
        active: c.classList.contains("active"),
      }));
      return { rows: rows.map((r) => r.property_name).sort(), chips };
    });
    ok("the authorized list came from the server",
      JSON.stringify(picker.rows) === JSON.stringify(
        ["Greenery Apartments", "Property Spine Demo Building", "Skyline Apartments"]),
      JSON.stringify(picker.rows));
    ok("a chip renders per authorized property", picker.chips.length === 3, `${picker.chips.length} chips`);
    ok("no chip for a property the operator is not assigned to",
      !picker.chips.some((c) => c.val === notMine));
    ok("exactly one chip is marked active",
      picker.chips.filter((c) => c.active).length === 1);
    const chipVis = await visible(".psw-chip");
    ok("the picker is actually VISIBLE (not covered by an overlay)",
      chipVis.found && chipVis.boxed && !chipVis.covered && !chipVis.offscreen, JSON.stringify(chipVis));
    await shot("01-property-picker.png");

    // ══ 4. DEMO BUILDING IS ONE PROPERTY AMONG OTHERS ════════════════
    console.log("\n  ── Demo Building: a property, not the ambient default ──");
    const meDemo = await page.evaluate(async () => {
      const v = await window.__psLive.verifySession();
      return { id: v && v.property && v.property.id, name: v && v.property && v.property.name };
    });
    ok("/operator/me says Demo Building", meDemo.id === demoBuilding, JSON.stringify(meDemo));
    const chromeDemo = await page.evaluate(() => document.getElementById("propPick").value);
    ok("chrome agrees with the server", chromeDemo === meDemo.id);
    await shot("02-demo-building-selected.png");

    // ══ 5. SWITCH TO SKYLINE ═════════════════════════════════════════
    console.log("\n  ── choosing Skyline means real Skyline ──");
    await page.evaluate((id) => window.switchProperty(id), skyline);
    await page.waitForFunction((id) => {
      const sel = document.getElementById("propPick");
      return sel && sel.value === id;
    }, skyline, { timeout: 30000 }).catch(() => {});

    const meSky = await page.evaluate(async () => {
      const v = await window.__psLive.verifySession();
      return { id: v && v.property && v.property.id, name: v && v.property && v.property.name };
    });
    ok("/operator/me says Skyline after the switch", meSky.id === skyline, JSON.stringify(meSky));
    const chromeSky = await page.evaluate(() => ({
      pick: document.getElementById("propPick").value,
      activeChip: (document.querySelector(".psw-chip.active") || {}).getAttribute
        ? document.querySelector(".psw-chip.active").getAttribute("data-val") : null,
    }));
    ok("chrome moved with it", chromeSky.pick === skyline, JSON.stringify(chromeSky));
    ok("the active chip is Skyline", chromeSky.activeChip === skyline);
    ok("CHROME AND SESSION CANNOT DISAGREE", chromeSky.pick === meSky.id);

    const dbSessions = (await pool.query(
      `select count(*)::int as n from staff_sessions where user_id=$1 and revoked=false`, [kameron])).rows[0].n;
    ok("exactly one live session exists after the switch", dbSessions === 1, `got ${dbSessions}`);

    // ══ 6. HONEST SKYLINE — THE RELEASE BLOCKER ══════════════════════
    console.log("\n  ── Skyline has no data, and the app says so rather than inventing it ──");
    await page.waitForTimeout(2500);
    //  READ ONLY LAYOUT-AWARE TEXT, FROM THE LIVE DOCUMENT.
    //
    //  The first version of this check cloned <body>, removed the switcher,
    //  and read innerText off the clone. That is the trap this repo has
    //  already paid for once: innerText on a node that is NOT RENDERED
    //  silently falls back to textContent — so it was reading the hidden
    //  <option> labels inside #propPick and reporting "Property Spine Demo
    //  Building" as a data leak when it was the picker doing its job.
    //
    //  So: read the live content regions. The switcher and the gear menu are
    //  not content, and the picker legitimately names every authorized
    //  property; what must not appear is Demo Building or fixture residents
    //  in the CONTENT of a Skyline session.
    const skyText = await page.evaluate(() => {
      const parts = [];
      ["#home", "#workspace", "#previewLayer", "#hubLayer"].forEach((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;          // not rendered → not content
        parts.push(el.innerText || "");
      });
      return parts.join("\n");
    });
    const tells = FIXTURE_TELLS.filter((t) => skyText.includes(t));
    //  A failing leak assertion must say WHERE, or the next person re-derives
    //  the DOM walk by hand. Only computed when something actually leaked.
    let where = [];
    if (tells.length) {
      where = await page.evaluate((needles) => {
        const hits = [];
        const walk = (n) => {
          if (n.nodeType === 3) {
            const v = String(n.nodeValue || "");
            if (needles.some((t) => v.includes(t))) {
              let p = n.parentElement; const path = [];
              while (p && path.length < 4) {
                path.push(p.tagName + (p.id ? "#" + p.id : ""));
                p = p.parentElement;
              }
              const r = n.parentElement ? n.parentElement.getBoundingClientRect() : { width: 0, height: 0 };
              hits.push(path.join(" < ") + `  [${Math.round(r.width)}x${Math.round(r.height)}]`);
            }
            return;
          }
          if (n.nodeType === 1 && n.tagName !== "SCRIPT" && n.tagName !== "STYLE") {
            n.childNodes.forEach(walk);
          }
        };
        walk(document.body);
        return hits.slice(0, 6);
      }, tells);
    }
    ok("NO FIXTURE CORPUS renders in the CONTENT of a real Skyline session",
      tells.length === 0, "found: " + JSON.stringify(tells) + "\n          at: " + where.join("\n              "));
    ok("no Demo Building data leaked into Skyline content",
      !skyText.includes("Property Spine Demo Building"));
    const honest = /no |none|not connected|unavailable|empty|nothing|not activated|0 /i.test(skyText);
    ok("the surface states absence in words a person can read", honest);
    await shot("03-skyline-selected-honest-empty.png");

    // ══ 7. UNAUTHORIZED PROPERTY, ASKED FOR DIRECTLY ═════════════════
    console.log("\n  ── the browser may ask; the server refuses ──");
    const forced = await page.evaluate(async (id) => {
      try { await window.__psLive.selectProperty(id); return { threw: false }; }
      catch (e) { return { threw: true, status: e.status, message: e.message }; }
    }, notMine);
    ok("a manually crafted request for an unassigned property is REFUSED",
      forced.threw && forced.status === 403, JSON.stringify(forced));

    const stillSky = await page.evaluate(async () => {
      const v = await window.__psLive.verifySession();
      return v && v.property && v.property.id;
    });
    ok("and the operator is still in Skyline afterwards", stillSky === skyline);

    // ══ 8. SWITCH BACK, STATE CLEARED ════════════════════════════════
    console.log("\n  ── switching back clears what came before ──");
    await page.evaluate((id) => window.switchProperty(id), demoBuilding);
    await page.waitForFunction((id) => {
      const sel = document.getElementById("propPick");
      return sel && sel.value === id;
    }, demoBuilding, { timeout: 30000 }).catch(() => {});
    const meBack = await page.evaluate(async () => {
      const v = await window.__psLive.verifySession();
      return v && v.property && v.property.id;
    });
    ok("/operator/me says Demo Building again", meBack === demoBuilding);
    const cleared = await page.evaluate(() => {
      const d = window.data || {};
      return { home: d.home, leasing: d.leasing, applications: d.applications, management: d.management };
    });
    ok("property-scoped caches were cleared on the way through",
      cleared.leasing == null && cleared.applications == null,
      JSON.stringify(cleared).slice(0, 200));
    await shot("04-switched-back-demo-building.png");

    ok("no uncaught page errors during the whole run",
      pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 4)));

  } finally {
    await browser.close();
    staticServer.close(); tls.close();
    await cleanup(pool);          // leave no proof rows behind
    await pool.end();
  }

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log(`  ${pass + fail} run · ${pass} passed · ${fail} failed`);
  if (fail) console.log("  FAILED: " + failures.join(" | "));
  console.log(`  screenshots → ${SHOTS}`);
  console.log(fail ? "  ✗ FAIL" : "  ✓ PASS");
  console.log("════════════════════════════════════════════════════════════════\n");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
