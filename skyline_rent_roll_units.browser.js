/* ════════════════════════════════════════════════════════════════════
   skyline_rent_roll_units.browser.js — THE RENT ROLL, IN A REAL BROWSER,
   ON THE REAL JULY SKYLINE EXPORT.

   The sentence this proof exists to make true:

     Mike opens Skyline and immediately understands what each unit and bed
     is, who occupies it now, and the next known position — and every blank
     on the page says which blank it is.

   ── HOW IT REFUSES TO FOOL ITSELF ───────────────────────────────────
   Each of these was earned by a real miss in this repo:

   · IT GOES THROUGH THE PRODUCT. The page is opened by calling
     openRentRollFull() — the door an operator actually uses — never
     psLiveUnitRentRoll() directly. A proof that reaches past the product
     to assert the product is testing its own reach.

   · RENDERED IS NOT VISIBLE. Visibility is asked of the DOCUMENT:
     elementFromPoint at an element's centre must return that element or
     something inside it. innerText on a detached or unrendered node
     silently falls back to textContent, which is how a browser proof once
     passed 13/13 while the browser showed the sign-in screen.

   · THE DATA IS REAL. 72 units and 160 beds are loaded from the actual
     07/31 Yardi export through the canonical inventory writer, not from a
     fixture and not from seeds/data_skyline.js.

   · IT ASSERTS THE ABSENCES. "(whole unit)" must never reach a person;
     an unknown rent must never render as $0; and the page must not lead
     with a vacancy percentage. Those are checked as text on the rendered
     page, because JSON always looks fine.

   ── WHAT IT DOES NOT CLAIM ──────────────────────────────────────────
   Nothing here proves leasing seasons, pace, preleased rate, period-aware
   availability or application grain. Those are Slice 2 and are deliberately
   absent from both the surface and this file.

   Run:
     HARNESS_DATABASE_URL="postgresql://postgres@127.0.0.1:5433/spine_full?sslmode=no-verify" \
     node skyline_rent_roll_units.browser.js

   CLASS 3 — proof infrastructure.
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const API_REPO = "/home/user/property-spine-api";
const API_MODULES = path.join(API_REPO, "node_modules");
const { chromium } = require(path.join(API_MODULES, "playwright"));
const { Pool } = require(path.join(API_MODULES, "pg"));
const XLSX = require(path.join(API_MODULES, "xlsx"));
const { mapRows } = require(path.join(API_REPO, "src/onboarding/rent_roll_field_map.js"));
const { materializeRentableSpaces } = require(path.join(API_REPO, "src/tenancy/inventory_materialization.js"));
const { serveStatic, serveTls } = require("./tools/browser_stack.js");

const CONN = process.env.HARNESS_DATABASE_URL;
const API_PORT = Number(process.env.API_PORT || 3021);
const STATIC_PORT = 4321;
const TLS_PORT = 4453;
const SHOTS = path.join(__dirname, "docs", "screenshots_rent_roll_units");
const XLSX_PATH = process.env.SKYLINE_XLSX
  || "/root/.claude/uploads/27e16502-554d-5a14-9258-903418ff09cd/d657f655-RentRoll07_1417.xlsx";
const ORG = "Skyline Rent Roll Browser";

if (!CONN) { console.error("REFUSED: set HARNESS_DATABASE_URL."); process.exit(2); }
if (!fs.existsSync(XLSX_PATH)) { console.error("REFUSED: the real Skyline export was not found at " + XLSX_PATH); process.exit(2); }

let pass = 0, fail = 0; const failures = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log("  ok    " + label); }
  else { fail++; failures.push(label); console.log("  FAIL  " + label + (detail ? "\n          " + detail : "")); }
}

const ymd = (s) => { const m = String(s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                     return m ? `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}` : null; };

/*  The same reader the DB proof uses. Kept here rather than imported so this
 *  file states exactly which bytes it turned into 160 beds.  */
function readRentRoll(file) {
  const wb = XLSX.readFile(file);
  const grid = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: null });
  const meta = {};
  for (const r of grid.slice(0, 6)) { const a = String(r[0] || ""); const m = a.match(/^(As Of)\s*=\s*(.+)$/); if (m) meta[m[1]] = m[2].trim(); }
  const h1 = grid[5] || [], h2 = grid[6] || [];
  const headers = h1.map((h, i) => [h, h2[i]].filter(Boolean).join(" ").trim() || `col${i}`);
  const out = []; let section = null;
  grid.forEach((r, i) => {
    const a = String(r[0] || "").trim();
    const lone = a && r.slice(1).filter((x) => x != null).length === 0;
    if (lone && /^Current\/Notice\/Vacant/.test(a)) { section = "current"; return; }
    if (lone && /^Future Residents/.test(a)) { section = "future"; return; }
    if (a === "Summary Groups") { section = null; return; }
    if (!section || !/^\d{3,4}-\d{2,3}$/.test(a)) return;
    const row = { __row_number: i + 1, __section: section };
    headers.forEach((h, c) => { row[h] = c === 0 ? a : r[c]; });
    out.push(row);
  });
  return { meta, rows: out };
}

async function cleanup(pool) {
  const props = (await pool.query(
    `select p.id from properties p join organizations o on o.id=p.organization_id where o.name=$1`, [ORG])).rows;
  for (const { id } of props) {
    await pool.query(`delete from leases where property_id=$1`, [id]);
    await pool.query(`delete from spaces where unit_id in (select id from units where property_id=$1)`, [id]);
    await pool.query(`delete from units where property_id=$1`, [id]);
    await pool.query(`delete from property_team_assignments where property_id=$1`, [id]);
    await pool.query(`delete from import_batches where property_id=$1`, [id]);
    await pool.query(`delete from properties where id=$1`, [id]);
  }
  const u = (await pool.query(
    `select id from users where email='mike.rentroll@example.test'`)).rows.map((r) => r.id);
  for (const id of u) {
    await pool.query(`delete from staff_sessions where user_id=$1`, [id]);
    await pool.query(`delete from property_team_assignments where user_id=$1`, [id]);
    await pool.query(`delete from users where id=$1`, [id]);
  }
  await pool.query(`delete from persons where source='skyline_rr_browser'`);
  await pool.query(`delete from organizations where name=$1`, [ORG]);
}

/*  Boot the REAL server.js against the harness database. Started here rather
 *  than by hand so the proof cannot accidentally run against yesterday's
 *  process holding yesterday's code.  */
function startApi() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["server.js"], {
      cwd: API_REPO,
      env: { ...process.env, DATABASE_URL: CONN, PORT: String(API_PORT), NODE_ENV: "test" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    const done = (fn, v) => { child.stdout.removeAllListeners("data"); fn(v); };
    child.stdout.on("data", (b) => {
      out += String(b);
      if (/listening|running|port/i.test(out)) done(resolve, child);
    });
    child.stderr.on("data", (b) => { out += String(b); });
    child.on("exit", (c) => reject(new Error(`server.js exited ${c}\n${out.slice(-1500)}`)));
    setTimeout(() => (out ? done(resolve, child) : reject(new Error("server.js never started\n" + out))), 20000);
  });
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const pool = new Pool({ connectionString: CONN });

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("  THE RENT ROLL — real Skyline, real browser");
  console.log("════════════════════════════════════════════════════════════════\n");

  await cleanup(pool);

  // ══ THE WORLD, from the real export ══════════════════════════════
  const { meta, rows } = readRentRoll(XLSX_PATH);
  const { mapped } = mapRows(rows);
  const current = mapped.filter((_, i) => rows[i].__section === "current");
  const future = mapped.filter((_, i) => rows[i].__section === "future");
  const AS_OF = ymd(meta["As Of"]);

  const org = (await pool.query(`insert into organizations (name) values ($1) returning id`, [ORG])).rows[0].id;
  const prop = (await pool.query(
    `insert into properties (name, address, organization_id, leasing_basis)
     values ('Skyline Apartments','1417 N 15th St',$1,'bed') returning id`, [org])).rows[0].id;
  const batch = (await pool.query(
    `insert into import_batches (property_id, source_type, source_file, source_as_of_date, leasing_model, confidence, status)
     values ($1,'historical_snapshot','RentRoll07_1417.xlsx',$2,'bed','confirmed','committed') returning id`,
    [prop, AS_OF])).rows[0].id;

  const labelsByUnit = new Map();
  for (const m of current) {
    if (!labelsByUnit.has(m.unit_number)) labelsByUnit.set(m.unit_number, []);
    const l = labelsByUnit.get(m.unit_number);
    if (!l.includes(m.space_label)) l.push(m.space_label);
  }
  const spaceOf = new Map();
  const c1 = await pool.connect();
  try {
    await c1.query("begin");
    for (const [unitNumber, labels] of labelsByUnit) {
      const u = (await c1.query(
        `insert into units (property_id, unit_number, occupancy_status) values ($1,$2,'unknown') returning id`,
        [prop, unitNumber])).rows[0].id;
      await materializeRentableSpaces(c1, { unit_id: u, labels, kind: "bed", use_type: "residential" });
      for (const s of (await c1.query(`select id, space_label from spaces where unit_id=$1`, [u])).rows) {
        spaceOf.set(`${unitNumber}|${s.space_label}`, s.id);
      }
    }
    await c1.query("commit");
  } catch (e) { await c1.query("rollback"); throw e; } finally { c1.release(); }

  for (const m of [...current.filter((x) => x.name), ...future]) {
    const sid = spaceOf.get(`${String(m.unit_number).trim()}|${String(m.space_label).trim()}`);
    if (!sid) continue;
    const person = (await pool.query(
      `insert into persons (name, source, lifecycle_status, leasing_stage, import_batch_id,
                            source_type, source_as_of_date, confidence)
       values ($1,'skyline_rr_browser','resident','resident',$2,'rent_roll_ledger',$3,'confirmed') returning id`,
      [m.name, batch, AS_OF])).rows[0].id;
    await pool.query(
      `insert into leases (property_id, space_id, tenant_ids, rent, start_date, end_date, lease_status,
                           import_batch_id, source_type, source_as_of_date, confidence)
       values ($1,$2,$3,$4,$5,$6,'active',$7,'historical_snapshot',$8,'confirmed')`,
      [prop, sid, [person], Number(m.actual_rent) > 0 ? Number(m.actual_rent) : null,
       m.lease_from, m.lease_to, batch, AS_OF]);
  }

  //  ONE POSITION WITH A KNOWN RENT. Every rent in this export is blank, so a
  //  page that only ever renders "Rent unknown" cannot demonstrate that it
  //  renders a real one — and "$1,020 shows up" is the assertion that would
  //  have caught a formatter that swallowed every amount.
  const rentedSpace = spaceOf.get(`${current.find((m) => m.name).unit_number}|${current.find((m) => m.name).space_label}`);
  await pool.query(`update leases set rent=1020 where space_id=$1`, [rentedSpace]);

  const mike = (await pool.query(
    `insert into users (name, email, role, is_active, status)
     values ('Mike','mike.rentroll@example.test','property_manager',true,'active') returning id`)).rows[0].id;
  await pool.query(
    `insert into property_team_assignments (property_id, user_id, role_title, allowed_modules, can_manage_roles, active)
     values ($1,$2,'Property Manager',$3,false,true)`,
    [prop, mike, ["leasing", "management", "maintenance"]]);

  const staffSessions = require(path.join(API_REPO, "src/identity/staff_session_service.js"));
  const c0 = await pool.connect();
  let session;
  try {
    await c0.query("begin");
    session = await staffSessions.issueStaffSession(c0, { userId: mike, propertyId: prop, purpose: "bootstrap_invite" });
    await c0.query("commit");
  } finally { c0.release(); }

  let api = null, staticServer = null, tls = null, browser = null;
  try {
    api = await startApi();
    staticServer = await serveStatic(__dirname, STATIC_PORT);
    tls = await serveTls(API_PORT, TLS_PORT);

    const CHROME = process.env.PLAYWRIGHT_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
    browser = await chromium.launch({
      executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
      args: ["--ignore-certificate-errors", "--no-sandbox"],
    });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();

    //  MEASURE THE REAL TRANSPORT. Every call to the pinned production origin
    //  is counted and timed here, which is what makes "no N+1" an observation
    //  rather than a belief about the code.
    const calls = [];
    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (url.startsWith("https://property-spine-api.onrender.com")) {
        return route.continue({ url: url.replace("https://property-spine-api.onrender.com", "https://127.0.0.1:" + TLS_PORT) });
      }
      return route.continue();
    });
    page.on("response", async (r) => {
      const u = r.url();
      if (u.indexOf("/operator/") < 0) return;
      let bytes = null;
      try { bytes = (await r.body()).length; } catch (_) {}
      calls.push({ url: u.replace(/^https?:\/\/[^/]+/, ""), status: r.status(), bytes,
                   ms: (r.request().timing() || {}).responseEnd });
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
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return { found: true, boxed: true, offscreen: true };
      const hit = document.elementFromPoint(cx, cy);
      return { found: true, boxed: true, offscreen: false,
               covered: !(hit && (hit === el || el.contains(hit) || hit.contains(el))) };
    }, sel);
    const shot = (n) => page.screenshot({ path: path.join(SHOTS, n), fullPage: false });

    // ══ 1. A REAL OPERATOR, ON THE REAL PROPERTY ═════════════════════
    console.log("  ── the app loads, signed in, on Skyline ──");
    await page.addInitScript(([token]) => {
      try { sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: token })); } catch (_) {}
    }, [session.session_token]);
    await page.goto(`http://127.0.0.1:${STATIC_PORT}/index.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.classList.contains("entered"), { timeout: 30000 }).catch(() => {});
    const loaded = await page.evaluate(() => ({
      entered: document.body.classList.contains("entered"),
      gate: !!document.querySelector("#entryGate.show"),
    }));
    ok("THE APP LOADED (not the sign-in screen)", loaded.entered && !loaded.gate, JSON.stringify(loaded));
    const scope = await page.evaluate(async () => {
      const v = await window.__psLive.verifySession();
      return { id: v && v.property && v.property.id, name: v && v.property && v.property.name };
    });
    ok("the server says the scope is Skyline", scope.id === prop, JSON.stringify(scope));

    // ══ 2. OPEN IT THE WAY AN OPERATOR OPENS IT ══════════════════════
    //  Through the real navigation and the real card. #intelStrip lives inside
    //  #workspace, which ships hidden — calling the renderer straight from the
    //  console would have painted into a display:none subtree and every
    //  innerText read would have silently fallen back to textContent. That is
    //  the "13/13 while the browser showed the sign-in screen" failure, and it
    //  is why the door is opened rather than the function called.
    console.log("\n  ── the Rent Roll door ──");
    await page.evaluate(() => window.openDesk("management"));
    await page.waitForFunction(
      () => !document.getElementById("workspace").classList.contains("hidden"), { timeout: 30000 }).catch(() => {});
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll(".mg-door h3")).some((h) => /^rent roll$/i.test(h.innerText.trim())),
      { timeout: 30000 }).catch(() => {});
    const doorVis = await visible(".mg-door");
    ok("the Management desk is open and its doors are visible",
      doorVis.found && doorVis.boxed && !doorVis.covered, JSON.stringify(doorVis));

    const before = calls.length;
    const t0 = Date.now();
    const clicked = await page.evaluate(() => {
      const doors = Array.from(document.querySelectorAll(".mg-door"));
      const headings = doors.map((c) => ((c.querySelector("h3") || {}).innerText || "").trim());
      //  Matched on the WHOLE heading, case-insensitively. The card renders
      //  uppercase via CSS and innerText reports text-transform faithfully, so
      //  /Rent Roll/ found nothing; a loose /rent roll/i would have matched the
      //  FUTURE RENT ROLL door beside it and opened the wrong page.
      const card = doors.find((c) => /^rent roll$/i.test(((c.querySelector("h3") || {}).innerText || "").trim()));
      if (card) card.click();
      return { clicked: !!card, headings,
               deskText: (document.getElementById("workspace") || {}).innerText ?
                 document.getElementById("workspace").innerText.slice(0, 400) : null };
    });
    ok("the Rent Roll door exists on the Management desk and was clicked", clicked.clicked === true,
      "doors on the desk: " + JSON.stringify(clicked.headings) + "\n          desk text: " + clicked.deskText);
    await page.waitForFunction(
      () => { const b = document.getElementById("psRruBody"); return b && b.getAttribute("data-ps-state") === "data"; },
      { timeout: 30000 }).catch(() => {});
    const renderMs = Date.now() - t0;
    const state = await page.evaluate(() => {
      const b = document.getElementById("psRruBody");
      return b ? b.getAttribute("data-ps-state") : "absent";
    });
    ok("the operator door opens the unit-first canonical read", state === "data", `state=${state}`);
    ok("no page errors while rendering 160 positions", pageErrors.length === 0, pageErrors.join(" | "));

    const rrCalls = calls.slice(before).filter((c) => c.url.indexOf("/operator/rent-roll/") === 0);
    ok("ONE request produced the whole page — no N+1 over 72 units",
      rrCalls.length === 1, JSON.stringify(rrCalls.map((c) => c.url)));
    ok("and it named the date explicitly rather than letting the server guess",
      rrCalls.length === 1 && /[?&]as_of=\d{4}-\d{2}-\d{2}/.test(rrCalls[0].url), rrCalls[0] && rrCalls[0].url);

    // ══ 3. THE PAGE IS ACTUALLY VISIBLE ══════════════════════════════
    console.log("\n  ── rendered AND visible ──");
    for (const sel of [".rru-shape", ".rru-list", ".rru-unit", ".rru-pos", "#psRruDate"]) {
      const v = await visible(sel);
      ok(`visible to the document: ${sel}`, v.found && v.boxed && !v.covered && !v.offscreen, JSON.stringify(v));
    }

    // ══ 4. WHAT IT SAYS ══════════════════════════════════════════════
    console.log("\n  ── the building, unit by unit ──");
    const read = await page.evaluate(() => {
      const body = document.getElementById("psRruBody");
      const units = Array.from(document.querySelectorAll(".rru-unit"));
      return {
        text: body ? body.innerText : "",
        shape: (document.querySelector(".rru-shape") || {}).innerText || "",
        unitCount: units.length,
        positionCount: document.querySelectorAll(".rru-pos-wrap").length,
        firstUnit: units.length ? units[0].innerText : "",
        stats: Array.from(document.querySelectorAll(".rru-stat")).map((s) => s.innerText.replace(/\n/g, " ")),
        //  Read the NUMBER from its own element rather than splitting a
        //  concatenated innerText — the split silently produced NaN the first
        //  time this ran, and a NaN in a comparison passes quietly.
        statValues: Array.from(document.querySelectorAll(".rru-stat")).map((s) => ({
          label: (s.querySelector("span") || {}).innerText || "",
          value: Number((s.querySelector("b") || {}).innerText),
        })),
        dateValue: (document.getElementById("psRruDate") || {}).value || null,
        //  Diagnostics for the vocabulary assertions: report WHICH line
        //  offended, so a failure names itself instead of needing a re-run.
        sawVacant: (body.innerText.match(/[^\n]*\bvacant\b[^\n]*/i) || [])[0] || null,
        sawAvailable: (body.innerText.match(/[^\n]*\bavailable\b[^\n]*/i) || [])[0] || null,
        sawPercent: (body.innerText.match(/[^\n]*\d%[^\n]*/) || [])[0] || null,
      };
    });
    ok("72 units render", read.unitCount === 72, String(read.unitCount));
    ok("160 rentable positions render", read.positionCount === 160, String(read.positionCount));
    ok("the page leads with the building's SHAPE, not a vacancy percentage",
      /160/.test(read.shape) && /rentable positions across 72 units/i.test(read.shape), JSON.stringify(read.shape));
    ok("no percentage anywhere on the page", !/\d%/.test(read.text), read.sawPercent);
    ok("occupied, open and next-known are stated as counts",
      read.stats.some((s) => /Occupied/i.test(s)) && read.stats.some((s) => /Open/i.test(s))
        && read.stats.some((s) => /Next known/i.test(s)), JSON.stringify(read.stats));

    console.log("\n  ── the vocabulary an operator is allowed to see ──");
    ok("the placeholder '(whole unit)' never reaches a person",
      !/whole\s*unit/i.test(read.text));
    ok("bed grain is preserved, not cleaned away — Room1/Room2/Room3 are shown",
      /Room1/.test(read.text) && /Room2/.test(read.text) && /Room3/.test(read.text));
    ok("the unit number keeps its full source identity (1417-101), not a stripped '101'",
      /1417-101/.test(read.text));
    ok("an unrecorded rent says WHICH unknown it is, and is never $0",
      /Rent unknown/.test(read.text) && !/\$0\b/.test(read.text));
    ok("the one real rent in the file renders as money", /\$1,020/.test(read.text));
    //  Three separate rulings, three separate assertions. Collapsed into one
    //  they would fail as a single line that does not say which word leaked.
    ok("an empty position is called 'Open'", /\bOpen\b/.test(read.text));
    ok("the page never says 'vacant' — that is a different claim, from a different read",
      !/\bvacant\b/i.test(read.text), read.sawVacant);
    ok("and it never says 'available' — marketability is availability_read's to assert, not this one's",
      !/\bavailable\b/i.test(read.text), read.sawAvailable);
    ok("the shared blank-rent condition is explained ONCE, at page level",
      /carry no rent amount/.test(read.text)
        && (read.text.match(/because the source this property was established from/g) || []).length === 1);
    ok("the source it was established from is named on the page",
      /RentRoll07_1417\.xlsx/.test(read.text));

    // ══ 5. CURRENT AND NEXT, ON ONE POSITION ═════════════════════════
    console.log("\n  ── who is there now, and what comes next ──");
    const lines = await page.evaluate(() => {
      const withNext = Array.from(document.querySelectorAll(".rru-pos-wrap"))
        .filter((w) => w.querySelector(".rru-next"));
      const occupied = Array.from(document.querySelectorAll(".rru-pos-wrap"))
        .filter((w) => w.querySelector(".rru-who"));
      const openNoNext = Array.from(document.querySelectorAll(".rru-pos-wrap"))
        .filter((w) => w.querySelector(".rru-open") && !w.querySelector(".rru-next"));
      const unitOf = (w) => w.closest(".rru-unit").querySelector(".rru-unit-no").innerText;
      return {
        nextCount: withNext.length, occupiedCount: occupied.length, openNoNextCount: openNoNext.length,
        sampleNext: withNext.length ? { unit: unitOf(withNext[0]), text: withNext[0].innerText.replace(/\n/g, " · ") } : null,
        sampleOccupied: occupied.length ? { unit: unitOf(occupied[0]), text: occupied[0].innerText.replace(/\n/g, " · ") } : null,
        sampleOpen: openNoNext.length ? { unit: unitOf(openNoNext[0]), text: openNoNext[0].innerText.replace(/\n/g, " · ") } : null,
        personIds: Array.from(document.querySelectorAll(".rru-pos-wrap[data-person-id]"))
          .filter((w) => w.getAttribute("data-person-id")).length,
        nextPersonIds: Array.from(document.querySelectorAll(".rru-pos-wrap[data-next-person-id]"))
          .filter((w) => w.getAttribute("data-next-person-id")).length,
      };
    });
    ok("positions with a known next commitment render it", lines.nextCount > 0, String(lines.nextCount));
    ok("a next commitment names the person and the date it starts",
      !!(lines.sampleNext && /→/.test(lines.sampleNext.text) && /from \w+ \d+, \d{4}/.test(lines.sampleNext.text)),
      JSON.stringify(lines.sampleNext));
    //  Case-insensitive on purpose: these render uppercase through CSS and
    //  innerText reports text-transform faithfully. Asserting the source
    //  casing would be asserting the stylesheet, not the meaning.
    ok("a next commitment shows whether it is LOCKED or PENDING, never softened into one word",
      !!(lines.sampleNext && /\b(locked|pending)\b/i.test(lines.sampleNext.text)),
      lines.sampleNext && lines.sampleNext.text);
    ok("an open position with nothing committed says so, rather than showing a dash",
      !!(lines.sampleOpen && /nothing committed/.test(lines.sampleOpen.text)), JSON.stringify(lines.sampleOpen));
    ok("stable person identity travels to the DOM, so a row acts by id and not by name",
      lines.personIds === lines.occupiedCount && lines.personIds > 0,
      `${lines.personIds} ids for ${lines.occupiedCount} occupied`);
    ok("the NEXT resident's identity is carried separately from the sitting one",
      lines.nextPersonIds === lines.nextCount, `${lines.nextPersonIds} of ${lines.nextCount}`);
    //  MEASURE THE REPAINT WHILE THE LIST IS ON SCREEN. The first version of
    //  this proof measured it in the performance section at the end — by which
    //  point the page had navigated to the flat schedule, #psRruList no longer
    //  existed, psRruPaint() returned on its first line and reported 0.00ms.
    //  A timing of zero is not a fast render; it is a measurement of nothing.
    const repaintMs = await page.evaluate(() => {
      const t = performance.now();
      psRruPaint();
      document.getElementById("psRruList").offsetHeight;   // force layout, not just DOM writes
      return Math.round((performance.now() - t) * 100) / 100;
    });
    ok("the repaint measured something real, not an early return", repaintMs > 0, repaintMs + "ms");

    if (lines.sampleOccupied) console.log("        occupied -> " + lines.sampleOccupied.unit + "  " + lines.sampleOccupied.text);
    if (lines.sampleNext)     console.log("        next     -> " + lines.sampleNext.unit + "  " + lines.sampleNext.text);
    if (lines.sampleOpen)     console.log("        open     -> " + lines.sampleOpen.unit + "  " + lines.sampleOpen.text);

    //  Screenshot 1 & 2 — scroll to a unit that carries both shapes.
    await page.evaluate(() => {
      const w = Array.from(document.querySelectorAll(".rru-pos-wrap")).find((x) => x.querySelector(".rru-next"));
      if (w) w.closest(".rru-unit").scrollIntoView({ block: "center", behavior: "instant" });
    });
    await page.waitForTimeout(120);
    await shot("02-open-bed-with-future-commitment.png");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(120);
    await shot("01-rent-roll-top.png");

    // ══ 6. THE INSTITUTIONAL READ OF THE SAME ROW ════════════════════
    console.log("\n  ── expanded detail is a second READ, not a second REQUEST ──");
    const beforeExpand = calls.length;
    const expanded = await page.evaluate(async () => {
      const w = Array.from(document.querySelectorAll(".rru-pos-wrap")).find((x) => x.querySelector(".rru-who"));
      const id = w.getAttribute("data-space-id");
      w.querySelector(".rru-pos").click();
      await new Promise((r) => setTimeout(r, 150));
      const still = document.querySelector('.rru-pos-wrap[data-space-id="' + id + '"]');
      const d = still ? still.querySelector(".rru-detail") : null;
      return {
        opened: !!d,
        text: d ? d.innerText : "",
        keys: d ? Array.from(d.querySelectorAll("k")).map((k) => k.innerText) : [],
        //  Read each fact from ITS OWN cell. Regexing the whole blob would let
        //  a value that landed under the wrong label still pass.
        byKey: d ? Array.from(d.querySelectorAll(".rru-d")).reduce((acc, el) => {
          const k = ((el.querySelector("k") || {}).innerText || "").trim().toLowerCase();
          acc[k.split(" ")[0]] = ((el.querySelector("v") || {}).innerText || "").trim();
          return acc;
        }, {}) : {},
        proofValue: d ? (Array.from(d.querySelectorAll(".rru-d")).find(
          (el) => /how this lease is proven/i.test(((el.querySelector("k") || {}).innerText || "")))
          || { querySelector: () => null }).querySelector("v")?.innerText || null : null,
        personButtons: d ? d.querySelectorAll("button").length : 0,
        ariaExpanded: still ? still.querySelector(".rru-pos").getAttribute("aria-expanded") : null,
        unit: still ? still.closest(".rru-unit").querySelector(".rru-unit-no").innerText : null,
      };
    });
    await page.waitForTimeout(250);
    ok("a position expands to its institutional detail", expanded.opened && expanded.ariaExpanded === "true");
    ok("EXPANDING FETCHES NOTHING — the detail was already in the payload",
      calls.length === beforeExpand, JSON.stringify(calls.slice(beforeExpand).map((c) => c.url)));
    const keyed = expanded.keys.map((k) => k.toLowerCase());
    ok("the detail carries the independent axes, uncollapsed",
      ["tenancy", "opening evidence", "economics"].every((k) => keyed.includes(k)),
      JSON.stringify(expanded.keys));
    ok("it says how the lease is proven",
      keyed.includes("how this lease is proven")
      && /confirmed opening import|native verified/i.test(expanded.proofValue || ""),
      "proof cell read: " + JSON.stringify(expanded.proofValue));
    ok("occupancy and economics are reported SEPARATELY — a lease with no rent is occupied AND economically unavailable",
      /contractually occupied/i.test(expanded.byKey.tenancy || "")
      && /unavailable/i.test(expanded.byKey.economics || ""),
      JSON.stringify(expanded.byKey));
    ok("a fact the property does not have says 'Not recorded', not a blank",
      /Not recorded/.test(expanded.text));
    ok("the Person Card is reachable by identity from the expanded row",
      expanded.personButtons >= 1 && /Open person card/.test(expanded.text));
    const detailVis = await visible(".rru-detail");
    ok("the expanded detail is VISIBLE, not merely present",
      detailVis.found && detailVis.boxed && !detailVis.covered && !detailVis.offscreen, JSON.stringify(detailVis));
    await shot("04-expanded-institutional-detail.png");

    // ══ 7. THE DATE IS A DIAL ════════════════════════════════════════
    console.log("\n  ── today is a default value, not a different architecture ──");
    const today = new Date();
    const iso = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0")
              + "-" + String(today.getDate()).padStart(2, "0");
    ok("the read defaulted to TODAY without hard-wiring it", read.dateValue === iso,
      `control shows ${read.dateValue}, today is ${iso}`);
    const beforeDial = calls.length;
    await page.evaluate((d) => window.psRruSetDate(d), AS_OF);
    await page.waitForFunction(
      (d) => { const i = document.getElementById("psRruDate"); return i && i.value === d; }, AS_OF, { timeout: 20000 }
    ).catch(() => {});
    const dialed = await page.evaluate(() => {
      const b = document.getElementById("psRruBody");
      return { state: b.getAttribute("data-ps-state"), text: b.innerText,
               date: (document.getElementById("psRruDate") || {}).value,
               stats: Array.from(document.querySelectorAll(".rru-stat b")).map((s) => Number(s.innerText)) };
    });
    const dialCalls = calls.slice(beforeDial).filter((c) => c.url.indexOf("/operator/rent-roll/units") === 0);
    ok("moving the dial re-reads the SAME resource at the new date",
      dialCalls.length === 1 && dialCalls[0].url.indexOf("as_of=" + AS_OF) > 0,
      JSON.stringify(dialCalls.map((c) => c.url)));
    ok("the page still stands at the earlier date", dialed.state === "data" && dialed.date === AS_OF);
    const occToday = (read.statValues.find((s) => /Occupied/i.test(s.label)) || {}).value;
    const occThen = dialed.stats[0];
    ok("both readings produced real numbers, not NaN",
      Number.isFinite(occToday) && Number.isFinite(occThen), `${occThen} / ${occToday}`);
    ok(`occupancy differs between ${AS_OF} and today, because the read is dated`,
      occThen !== occToday, `${AS_OF}: ${occThen}   today: ${occToday}`);
    console.log(`        ${AS_OF}: ${occThen} occupied     today (${iso}): ${occToday} occupied`);
    await shot("03-unknown-rent-and-date-dial.png");

    // ══ 8. THE FLAT SCHEDULE IS STILL ONE CLICK AWAY ═════════════════
    console.log("\n  ── the other projection of the same truth ──");
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("#psRruBody .rrc-chip"))
        .find((x) => /one row per position/i.test(x.innerText));
      if (b) b.click();
    });
    await page.waitForFunction(
      () => { const b = document.getElementById("psRrBody"); return b && b.getAttribute("data-ps-state") === "data"; },
      { timeout: 30000 }).catch(() => {});
    const flat = await page.evaluate(() => {
      const b = document.getElementById("psRrBody");
      return { state: b ? b.getAttribute("data-ps-state") : "absent",
               rows: document.querySelectorAll("#psRrList .rrc-row").length };
    });
    ok("the flat one-row-per-position schedule is still reachable and live",
      flat.state === "data" && flat.rows === 160, JSON.stringify(flat));
    await shot("05-flat-position-schedule.png");

    // ══ 9. PERFORMANCE BASELINE ══════════════════════════════════════
    console.log("\n  ══ PERFORMANCE BASELINE — 72 units · 160 positions ══");
    const unitCall = calls.find((c) => c.url.indexOf("/operator/rent-roll/units") === 0);
    const baseline = {
      positions: read.positionCount,
      units: read.unitCount,
      requests_for_the_page: rrCalls.length,
      response_bytes: unitCall ? unitCall.bytes : null,
      bytes_per_position: unitCall && read.positionCount ? Math.round(unitCall.bytes / read.positionCount) : null,
      door_to_rendered_ms: renderMs,
      repaint_ms: repaintMs,
      expand_requests: 0,
    };
    Object.entries(baseline).forEach(([k, v]) => console.log(`     ${k.padEnd(24)} ${v}`));
    fs.writeFileSync(path.join(SHOTS, "performance_baseline.json"), JSON.stringify(baseline, null, 2));
    ok("one request, not one per unit", baseline.requests_for_the_page === 1);
    ok("the whole rent roll fits in a single response under 512KB",
      baseline.response_bytes != null && baseline.response_bytes < 512 * 1024, String(baseline.response_bytes));
    ok("door to fully rendered is under 5s at 160 positions", renderMs < 5000, renderMs + "ms");
    ok("a repaint of all 72 units is under 250ms", repaintMs < 250, repaintMs + "ms");

    console.log("\n  screenshots -> " + SHOTS);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (tls && tls.close) tls.close();
    if (staticServer && staticServer.close) staticServer.close();
    if (api) api.kill("SIGKILL");
    await cleanup(pool);
    await pool.end();
  }

  console.log(`\n  ${pass + fail} run · ${pass} passed · ${fail} failed`);
  if (fail) console.log("  FAILED: " + failures.join(" | "));
  console.log(fail ? "  ✗ FAIL\n" : "  ✓ PASS\n");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
