/* ════════════════════════════════════════════════════════════════════
   skyline_rent_roll_units.browser.js — THE RENT ROLL, IN A REAL BROWSER,
   ON THE REAL JULY SKYLINE EXPORT.

   The sentence this proof exists to make true:

     Mike opens Skyline and scans it the way he scans a serious rent roll —
     horizontally and fast, without learning Property Spine's model — while
     Current + Next and the dated read stay visible underneath.

   ── HOW IT REFUSES TO FOOL ITSELF ───────────────────────────────────
   Each of these was earned by a real miss in this repo:

   · IT GOES THROUGH THE PRODUCT. The Management desk is opened and the
     Rent Roll card is CLICKED — never psLiveUnitRentRoll() called from the
     console. #intelStrip lives inside a hidden #workspace, so a proof that
     called the renderer would paint into a display:none subtree where
     innerText falls back to textContent and every read looks fine.

   · DENSITY IS MEASURED, NOT EYEBALLED. The complaint that produced this
     reset was vertical waste, so row height, table top offset and how many
     positions fit in the first viewport are assertions with numbers.

   · ALIGNMENT IS GEOMETRY. Columns are proven to share an x-origin ACROSS
     unit groups by reading getBoundingClientRect, which is the whole reason
     this is one table rather than 72 stacked ones.

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

  //  ── THE BY-UNIT CONTROL ────────────────────────────────────────
  //  A second property leased WHOLE, in the same browser and the same
  //  component. This exists so the room column and the unit band are proven
  //  to come from the payload's grain rather than from which property is
  //  open — §22 forbids a Solo-special (or Skyline-special) branch, and a
  //  proof that only ever looked at Skyline could not tell the difference.
  const byUnitProp = (await pool.query(
    `insert into properties (name, address, organization_id, leasing_basis)
     values ('Chestnut Row','2200 Chestnut St',$1,'unit') returning id`, [org])).rows[0].id;
  //  No materialization call here on purpose: a whole-unit property keeps the
  //  single canonical placeholder position the inventory trigger creates. That
  //  IS the by-unit shape, and it is exactly the row the surface must render
  //  without ever printing the placeholder's own text at a person.
  for (const n of ["201", "202", "203", "204"]) {
    await pool.query(
      `insert into units (property_id, unit_number, occupancy_status) values ($1,$2,'unknown')`,
      [byUnitProp, n]);
  }
  {
    const spaces = (await pool.query(
      `select s.id from spaces s join units u on u.id=s.unit_id
        where u.property_id=$1 order by u.unit_number limit 2`, [byUnitProp])).rows;
    const names = ["Dana Whitfield", "Ruth Okonjo"];
    for (let i = 0; i < spaces.length; i++) {
      const person = (await pool.query(
        `insert into persons (name, source, lifecycle_status, leasing_stage)
         values ($1,'skyline_rr_browser','resident','resident') returning id`, [names[i]])).rows[0].id;
      await pool.query(
        `insert into leases (property_id, space_id, tenant_ids, rent, start_date, end_date, lease_status)
         values ($1,$2,$3,1750,'2026-01-01','2027-06-30','active')`,
        [byUnitProp, spaces[i].id, [person]]);
    }
  }

  const mike = (await pool.query(
    `insert into users (name, email, role, is_active, status)
     values ('Mike','mike.rentroll@example.test','property_manager',true,'active') returning id`)).rows[0].id;
  for (const pid of [prop, byUnitProp]) {
    await pool.query(
      `insert into property_team_assignments (property_id, user_id, role_title, allowed_modules, can_manage_roles, active)
       values ($1,$2,'Property Manager',$3,false,true)`,
      [pid, mike, ["leasing", "management", "maintenance"]]);
  }

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
    for (const sel of ["#psRruDate", ".rru-sub", ".rru-wrap", ".rru-t thead th", ".rru-r"]) {
      const v = await visible(sel);
      ok(`visible to the document: ${sel}`, v.found && v.boxed && !v.covered && !v.offscreen, JSON.stringify(v));
    }

    // ══ 4. STRUCTURE: 72 UNITS, 160 POSITIONS, GRAIN INTACT ══════════
    console.log("\n  ── the building, as an aligned table ──");
    const read = await page.evaluate(() => {
      const body = document.getElementById("psRruBody");
      const rows = Array.from(document.querySelectorAll(".rru-r"));
      const cell = (r, i) => (r.children[i] ? r.children[i].innerText.trim() : null);
      return {
        text: body ? body.innerText : "",
        stand: (document.querySelector(".rru-sub") || {}).innerText || "",
        headText: (document.querySelector(".rru-hdr") || {}).innerText || "",
        unitGroups: document.querySelectorAll("tbody.rru-g").length,
        unitBands: document.querySelectorAll("tr.rru-gh").length,
        positionRows: rows.length,
        headers: Array.from(document.querySelectorAll(".rru-t thead tr.rru-col th")).map((h) => h.innerText.trim()),
        unitCells: rows.map((r) => cell(r, 0)),
        roomCells: rows.map((r) => cell(r, 1)),
        groupHeaders: Array.from(document.querySelectorAll(".rru-t thead tr.rru-grp th"))
          .map((h) => h.innerText.trim()).filter(Boolean),
        //  Column alignment is asserted as GEOMETRY, not as markup. Rows in
        //  different unit groups must share an x-origin per column, which is
        //  the entire reason this is one table and not 72.
        columnXByGroup: (() => {
          const groups = Array.from(document.querySelectorAll("tbody.rru-g")).slice(0, 6);
          return groups.map((g) => {
            const r = g.querySelector(".rru-r");
            return r ? Array.from(r.children).map((td) => Math.round(td.getBoundingClientRect().left)) : null;
          }).filter(Boolean);
        })(),
        dateValue: (document.getElementById("psRruDate") || {}).value || null,
        sawVacant: (body.innerText.match(/[^\n]*\bvacant\b[^\n]*/i) || [])[0] || null,
        sawPercent: (body.innerText.match(/[^\n]*\d%[^\n]*/) || [])[0] || null,
        sawWholeUnit: (body.innerText.match(/[^\n]*whole\s*unit[^\n]*/i) || [])[0] || null,
        sawZero: (body.innerText.match(/[^\n]*\$0\b[^\n]*/) || [])[0] || null,
      };
    });
    ok("72 unit groups render", read.unitGroups === 72, String(read.unitGroups));
    ok("160 rentable positions render, one compact row each",
      read.positionRows === 160, String(read.positionRows));
    //  Grouping is still STRUCTURAL even with the banner gone: one tbody per
    //  unit. That is what keeps a unit's beds from being interleaved by any
    //  later sort, and what the expanded row and the by-unit control key off.
    ok("grouping survives as one tbody per unit", read.unitGroups === 72, String(read.unitGroups));
    //  Compared case-insensitively: these render uppercase through CSS and
    //  innerText reports text-transform faithfully. Asserting the source
    //  casing would be asserting the stylesheet, not the meaning. The trailing
    //  spacer column is dropped before comparing — it carries no header.
    const headerNames = read.headers.filter((h) => h).map((h) => h.toLowerCase());
    ok("the operating columns are present and in operator order",
      JSON.stringify(headerNames) === JSON.stringify(
        ["unit", "room", "resident", "rent", "end", "resident", "start", "rent", "status"]),
      JSON.stringify(read.headers));
    //  THE POINT OF THE RESET.
    ok("COLUMNS LINE UP ACROSS UNIT GROUPS — the table can be scanned down a column",
      read.columnXByGroup.length >= 5 &&
      read.columnXByGroup.every((xs) => JSON.stringify(xs) === JSON.stringify(read.columnXByGroup[0])),
      JSON.stringify(read.columnXByGroup.slice(0, 3)));
    ok("bed grain is preserved, not cleaned away",
      read.roomCells.includes("Room1") && read.roomCells.includes("Room2") && read.roomCells.includes("Room3"),
      JSON.stringify(read.roomCells.slice(0, 4)));
    //  THE STRUCTURAL CHANGE. The unit is an aligned column on every row rather
    //  than a banner above a group, so 72 rows of the screen come back and a
    //  reader can scan straight down the unit column.
    ok("the unit is an aligned column on every row, not a banner above a group",
      read.unitCells.filter((c) => /^\d{3,4}-\d{2,3}$/.test(c || "")).length === 160,
      JSON.stringify(read.unitCells.slice(0, 4)));
    ok("no unit banner rows are spent at all", read.unitBands === 0, String(read.unitBands));
    ok("unit numbers keep their full source identity", /1417-101/.test(read.text));

    console.log("\n  ── restraint ──");
    //  "Not a hero" is a claim about TYPE SIZE and FOOTPRINT, not about how
    //  many characters the sentence has. The first version bounded the string
    //  length and went red the moment a true, useful clause was added to it —
    //  which would have pushed a real fact off the page to satisfy a test.
    const standBox = await page.evaluate(() => {
      const el = document.querySelector(".rru-sub");
      if (!el) return null;
      const sizes = [el, ...el.querySelectorAll("*")]
        .map((n) => parseFloat(getComputedStyle(n).fontSize));
      return { maxFontPx: Math.max(...sizes), height: Math.round(el.getBoundingClientRect().height) };
    });
    ok("CURRENT and NEXT are explicit column groups",
      JSON.stringify(read.groupHeaders.map((h) => h.toLowerCase())) === JSON.stringify(["current", "next"]),
      JSON.stringify(read.groupHeaders));
    ok("the standing states the position and the shape of the building",
      /160/.test(read.stand) && /72/.test(read.stand), JSON.stringify(read.stand));
    ok("and states it quietly — no hero number, small footprint",
      standBox && standBox.maxFontPx <= 16 && standBox.height <= 72, JSON.stringify(standBox));
    ok("no occupancy percentage anywhere", !/\d%/.test(read.text), read.sawPercent);
    ok("no provenance paragraph on the primary surface — it is behind a control",
      !/Everything recorded since/.test(read.text), "provenance body is visible while collapsed");
    const srcClosed = await page.evaluate(() => {
      const d = document.querySelector(".rru-src");
      return { present: !!d, open: d ? d.hasAttribute("open") : null,
               summary: d ? d.querySelector("summary").innerText.trim() : null };
    });
    ok("the source is named in one collapsed line",
      srcClosed.present && srcClosed.open === false && /RentRoll07_1417\.xlsx/i.test(srcClosed.summary),
      JSON.stringify(srcClosed));
    ok("the placeholder '(whole unit)' never reaches a person", !read.sawWholeUnit, read.sawWholeUnit);
    ok("the page never says 'vacant'", !read.sawVacant, read.sawVacant);
    ok("a missing rent is never rendered as $0", !read.sawZero, read.sawZero);

    //  DENSITY — measured, not asserted by eye. The whole complaint about the
    //  previous build was vertical waste, so the fix is a number.
    //  ── LESS INTERFACE, MORE LEDGER ─────────────────────────────
    //  Asserted as COMPUTED STYLE, because "it looks like an app" is exactly
    //  the kind of claim that a markup-shaped test cannot make.
    console.log("\n  ── chrome ──");
    const chrome = await page.evaluate(() => {
      const px = (v) => parseFloat(v) || 0;
      const hero = document.querySelector(".hero");
      const h = hero ? getComputedStyle(hero) : null;
      const st = document.querySelector(".rru-st");
      const sst = st ? getComputedStyle(st) : null;
      const cell0 = document.querySelector(".rru-r td");
      const cst = cell0 ? getComputedStyle(cell0) : null;
      const filt = document.querySelector(".rru-f button");
      const fst = filt ? getComputedStyle(filt) : null;
      const who = document.querySelector(".rru-who");
      return {
        card: h ? { radius: px(h.borderTopLeftRadius), border: px(h.borderTopWidth),
                    pad: px(h.paddingTop), shadow: h.boxShadow } : null,
        statusRadius: sst ? px(sst.borderTopLeftRadius) : null,
        statusBg: sst ? sst.backgroundColor : null,
        rowBg: cst ? cst.backgroundColor : null,
        rowBorder: cst ? px(cst.borderBottomWidth) : null,
        filterRadius: fst ? px(fst.borderTopLeftRadius) : null,
        filterBorder: fst ? px(fst.borderTopWidth) : null,
        residentWeight: who ? getComputedStyle(who).fontWeight : null,
        tabular: (() => { const c = document.querySelector(".rru-t");
          return c ? getComputedStyle(c).fontVariantNumeric : null; })(),
        backButtons: Array.from(document.querySelectorAll("#psRruBody button, .rr-bleed .btn"))
          .filter((b) => /management/i.test(b.innerText)).length,
      };
    });
    const transparent = (c) => !c || c === "transparent" || /rgba\(0, 0, 0, 0\)/.test(c)
      || /rgb\(255, 255, 255\)/.test(c);
    ok("the page card is gone — no radius, no border, no padding, no shadow",
      chrome.card && chrome.card.radius === 0 && chrome.card.border === 0
      && chrome.card.pad === 0 && chrome.card.shadow === "none", JSON.stringify(chrome.card));
    ok("status is restrained text, not a coloured badge",
      chrome.statusRadius === 0 && transparent(chrome.statusBg),
      JSON.stringify({ r: chrome.statusRadius, bg: chrome.statusBg }));
    ok("no shaded bars chop the ledger — every row rule is a hairline",
      chrome.rowBorder != null && chrome.rowBorder <= 1 && transparent(chrome.rowBg),
      JSON.stringify({ border: chrome.rowBorder, bg: chrome.rowBg }));
    ok("filters are flat report controls, not rounded pills",
      chrome.filterRadius === 0 && chrome.filterBorder === 0,
      JSON.stringify({ r: chrome.filterRadius, b: chrome.filterBorder }));
    ok("the resident name does not outweigh the record",
      Number(chrome.residentWeight) <= 500, chrome.residentWeight);
    ok("numerals are tabular, so columns align digit for digit",
      /tabular-nums/.test(chrome.tabular || ""), chrome.tabular);
    ok("the redundant back button is gone — the crumb already says where we are",
      chrome.backButtons === 0, String(chrome.backButtons));

    console.log("\n  ── density ──");
    const density = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".rru-r"));
      const h = rows.slice(0, 20).map((r) => Math.round(r.getBoundingClientRect().height));
      const wrap = document.querySelector(".rru-wrap").getBoundingClientRect();
      const vp = window.innerHeight;
      //  How many positions and units are inside the first viewport?
      const inView = (els) => els.filter((e) => {
        const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vp; }).length;
      return {
        rowHeight: h.length ? Math.round(h.reduce((a, b) => a + b, 0) / h.length) : null,
        positionsInFirstViewport: inView(rows),
        //  Counted from the rows themselves. The banner rows this used to count
        //  were removed on purpose — the unit is now a column on every row, so
        //  "how many units can I see" has to be asked of the data.
        unitsInFirstViewport: new Set(rows.filter((e) => {
          const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vp;
        }).map((e) => e.getAttribute("data-unit-id"))).size,
        tableTop: Math.round(wrap.top),
        //  BAND BY BAND. Guessing which element held the vertical space cost
        //  two round trips; measuring it is one line and stays useful for
        //  every future pass over this surface.
        bands: ["\u002erru-hdr", ".rru-sub", ".rru-nav", ".rru-t thead"]
          .reduce((acc, sel) => {
            const e = document.querySelector(sel);
            acc[sel] = e ? Math.round(e.getBoundingClientRect().height) : null;
            return acc;
          }, {}),
        //  The gap this surface is responsible for: its own title to its first
        //  row. Excludes the app bar and card padding, which belong to the shell.
        headerHeight: (() => {
          const h = document.querySelector(".rru-hdr");
          return h ? Math.round(wrap.top - h.getBoundingClientRect().top) : null;
        })(),
        viewport: vp,
        docHeight: Math.round(document.documentElement.scrollHeight),
        ledgerScroll: Math.round(document.querySelector(".rru-wrap").scrollHeight),
      };
    });
    Object.entries(density).forEach(([k, v]) => console.log(
      `        ${k.padEnd(26)} ${v && typeof v === "object" ? JSON.stringify(v) : v}`));
    ok("a position occupies one compact line (≤ 34px)",
      density.rowHeight != null && density.rowHeight <= 34, density.rowHeight + "px");
    //  MEASURED AGAINST WHAT THIS SURFACE OWNS. The app bar and the page card's
    //  padding are the shell's; charging them to the rent roll would make this
    //  a test of the chrome. What the rent roll controls is everything between
    //  its own title and its first row, and that is what is bounded here.
    //  THE REQUIREMENT, not a number reverse-engineered from the layout: the
    //  chrome above record one must not eat the screen. A fixed px threshold
    //  would also fail on a short viewport where the requirement is unchanged,
    //  so it is expressed as a share of what the operator can actually see.
    ok("the rent roll's own header — title, date, counts, source, toolbar — is under 15% of the viewport",
      density.headerHeight != null && density.headerHeight < density.viewport * 0.15,
      `${density.headerHeight}px of ${density.viewport}px`);
    ok("the ledger names the property it is a ledger OF",
      /skyline/i.test(read.headText || ""), JSON.stringify(read.headText));
    ok("a position occupies a ledger line, not an app row (≤ 24px)",
      density.rowHeight != null && density.rowHeight <= 24, density.rowHeight + "px");
    //  The stated target was 25-30 positions. Removing the 72 banner rows put
    //  it at 35, so the gate is set at the TOP of the requested band: this
    //  protects the range from regressing without asserting the exact number
    //  that happened to be measured.
    ok("30 positions visible without scrolling — the top of the requested band",
      density.positionsInFirstViewport >= 30, String(density.positionsInFirstViewport));
    ok("and fourteen units at once", density.unitsInFirstViewport >= 14,
      String(density.unitsInFirstViewport));
    ok("the whole building is one continuous scroll, not paginated",
      density.ledgerScroll > 160 * 12,
      density.ledgerScroll + "px of scrollable ledger for 160 positions");
    await shot("01-rent-roll-today.png");
    //  ── THE HEADER MUST STILL BE THERE FORTY ROWS DOWN ──────────
    //  The visibility check above passed at scroll position 0, which is
    //  exactly the kind of green that means nothing: `overflow-x:auto` had
    //  quietly broken position:sticky, and the column header vanished the
    //  moment anyone scrolled. Green is a claim about what was measured, so
    //  this measures it where it actually matters.
    await page.evaluate(() => {
      const rows = document.querySelectorAll(".rru-r");
      if (rows[44]) rows[44].scrollIntoView({ block: "center", behavior: "instant" });
    });
    await page.waitForTimeout(150);
    const pinned = await page.evaluate(() => {
      const th = document.querySelector(".rru-t thead tr.rru-col th");
      const wrap = document.querySelector(".rru-wrap");
      if (!th || !wrap) return { found: false };
      const r = th.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return {
        found: true,
        text: th.innerText.trim(),
        //  Pinned means the header sits at the TOP of the scroller, not that
        //  it merely still exists somewhere above the fold.
        atTopOfScroller: Math.abs(r.top - w.top) < 26,
        onScreen: r.top >= 0 && r.bottom <= window.innerHeight,
        covered: !(hit && (hit === th || th.contains(hit) || hit.contains(th))),
        scrolledBy: Math.round(wrap.scrollTop),
      };
    });
    ok("the column header is STILL VISIBLE forty rows down — it pins to the ledger",
      pinned.found && pinned.atTopOfScroller && pinned.onScreen && !pinned.covered,
      JSON.stringify(pinned));
    ok("and the ledger scrolled inside its own frame, not the page",
      pinned.scrolledBy > 200, String(pinned.scrolledBy));
    //  If the document can scroll at all, scrolling the ledger drags the page
    //  with it and this surface's own header slides up behind the app bar.
    const pageScroll = await page.evaluate(() => ({
      docScroll: Math.round(document.documentElement.scrollHeight - window.innerHeight),
      scrolledTo: Math.round(window.scrollY),
    }));
    ok("the page itself does not scroll — the ledger owns it",
      pageScroll.docScroll <= 2, JSON.stringify(pageScroll));
    await shot("02-horizontal-density.png");

    // ══ 5. CURRENT AND NEXT, IN COLUMNS ══════════════════════════════
    console.log("\n  ── who is there now, and what comes next ──");
    const lines = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".rru-r"));
      const cells = (r) => Array.from(r.children).map((c) => c.innerText.trim());
      const unitOf = (r) => r.children[0].innerText.trim();
      const byStatus = (s) => rows.filter((r) => r.getAttribute("data-status") === s);
      const occ = byStatus("occupied"), open = byStatus("open");
      const committed = byStatus("committed").concat(byStatus("pending"));
      //  A unit holding more than one occupied bed, and a unit holding an open
      //  bed with a commitment — the two shapes the acceptance asks to see.
      const multiOcc = Array.from(document.querySelectorAll("tbody.rru-g"))
        .find((g) => g.querySelectorAll('.rru-r[data-status="occupied"]').length >= 2);
      const openWithNext = Array.from(document.querySelectorAll("tbody.rru-g")).find((g) =>
        g.querySelector('.rru-r[data-status="pending"], .rru-r[data-status="committed"]')
        && g.querySelector('.rru-r[data-status="open"]'));
      //  COLUMN INDICES ARE DERIVED, NEVER HARD-CODED. When Unit became a
      //  column ahead of Room every positional index shifted by one, and the
      //  hard-coded ones kept PASSING — they were reading Room where they
      //  believed they were reading Resident. A test that survives a layout
      //  change by reading the wrong cell is worse than one that fails.
      const lead = document.querySelector(".rru-t col.c-room") ? 2 : 1;
      const IX = { unit: 0, room: lead === 2 ? 1 : null, curResident: lead, curRent: lead + 1,
                   curEnd: lead + 2, nextResident: lead + 3, nextStart: lead + 4,
                   nextRent: lead + 5, status: lead + 6 };
      return {
        IX,
        occupied: occ.length, open: open.length, committed: committed.length,
        sampleOccupied: occ.length ? { unit: unitOf(occ[0]), cells: cells(occ[0]) } : null,
        sampleCommitted: committed.length ? { unit: unitOf(committed[0]), cells: cells(committed[0]) } : null,
        sampleOpen: open.length ? { unit: unitOf(open[0]), cells: cells(open[0]) } : null,
        multiOccUnitId: multiOcc ? multiOcc.getAttribute("data-unit-id") : null,
        openWithNextUnitId: openWithNext ? openWithNext.getAttribute("data-unit-id") : null,
        personIds: rows.filter((r) => r.getAttribute("data-person-id")).length,
        nextPersonIds: rows.filter((r) => r.getAttribute("data-next-person-id")).length,
      };
    });
    const IX = lines.IX;
    ok("every row leads with its own unit, so the unit column can be scanned down",
      !!(lines.sampleOccupied && /^\d{3,4}-\d{2,3}$/.test(lines.sampleOccupied.cells[IX.unit] || "")),
      JSON.stringify(lines.sampleOccupied));
    ok("an occupied row states resident, rent and lease end in their own columns",
      !!(lines.sampleOccupied && lines.sampleOccupied.cells[IX.curResident] !== "—"
         && lines.sampleOccupied.cells[IX.curRent]
         && lines.sampleOccupied.cells[IX.curEnd] !== "—"),
      JSON.stringify(lines.sampleOccupied));
    ok("a missing rent reads Unknown in the rent column, not $0 and not a bare dash",
      !!(lines.sampleOccupied && lines.sampleOccupied.cells[IX.curRent] === "Unknown"),
      lines.sampleOccupied && lines.sampleOccupied.cells[IX.curRent]);
    ok("a committed row leaves CURRENT empty and fills NEXT",
      !!(lines.sampleCommitted && lines.sampleCommitted.cells[IX.curResident] === "—"
         && lines.sampleCommitted.cells[IX.nextResident]
         && lines.sampleCommitted.cells[IX.nextResident] !== "—"
         && lines.sampleCommitted.cells[IX.nextStart]
         && lines.sampleCommitted.cells[IX.nextStart] !== "—"),
      JSON.stringify(lines.sampleCommitted));
    ok("an open row with nothing next is an empty aligned row, not prose",
      !!(lines.sampleOpen
         && lines.sampleOpen.cells.slice(IX.curResident, IX.status).every((c) => c === "—")
         && /^open$/i.test(lines.sampleOpen.cells[IX.status] || "")),
      JSON.stringify(lines.sampleOpen));
    ok("status never reads Vacant or Leased",
      !/vacant|leased/i.test(JSON.stringify(lines)));
    ok("stable person identity travels to the DOM, so a row acts by id not by name",
      lines.personIds === lines.occupied && lines.personIds > 0,
      `${lines.personIds} ids for ${lines.occupied} occupied`);
    ok("the NEXT resident's identity is carried separately from the sitting one",
      lines.nextPersonIds === lines.committed, `${lines.nextPersonIds} of ${lines.committed}`);
    if (lines.sampleOccupied) console.log("        occupied  -> " + lines.sampleOccupied.cells.join(" | "));
    if (lines.sampleCommitted) console.log("        committed -> " + lines.sampleCommitted.cells.join(" | "));
    if (lines.sampleOpen) console.log("        open      -> " + lines.sampleOpen.cells.join(" | "));

    ok("a unit holding several occupied beds exists to screenshot", !!lines.multiOccUnitId);
    await page.evaluate((id) => {
      const g = document.querySelector('tbody.rru-g[data-unit-id="' + id + '"]');
      if (g) g.scrollIntoView({ block: "center", behavior: "instant" });
    }, lines.multiOccUnitId);
    await page.waitForTimeout(120);
    await shot("03-unit-with-multiple-occupied-beds.png");
    ok("a unit with an open bed and a commitment exists to screenshot", !!lines.openWithNextUnitId);
    await page.evaluate((id) => {
      const g = document.querySelector('tbody.rru-g[data-unit-id="' + id + '"]');
      if (g) g.scrollIntoView({ block: "center", behavior: "instant" });
    }, lines.openWithNextUnitId);
    await page.waitForTimeout(120);
    await shot("04-open-bed-with-next-commitment.png");

    // ══ 6. THE EXPANDED ROW — PROPERTY LANGUAGE, NO SECOND REQUEST ═══
    console.log("\n  ── expanded detail speaks property, not schema ──");
    const beforeExpand = calls.length;
    const expanded = await page.evaluate(async () => {
      const r = document.querySelector('.rru-r[data-status="occupied"]');
      const id = r.getAttribute("data-space-id");
      r.click();
      await new Promise((res) => setTimeout(res, 160));
      const x = document.querySelector('.rru-r[data-space-id="' + id + '"] + tr.rru-x');
      return {
        opened: !!x,
        //  READ FROM THE CONTROL, NOT THE ROW. This line used to read
        //  aria-expanded off the <tr>, back when the row was announced as a
        //  button. Moving the semantics onto a real <button> made it go red,
        //  which is the assertion doing its job — see section 8a for why the
        //  row is a row again.
        aria: document.querySelector('.rru-b[data-space-id="' + id + '"]').getAttribute("aria-expanded"),
        rowHasAria: document.querySelector('.rru-r[data-space-id="' + id + '"]').hasAttribute("aria-expanded"),
        labels: x ? Array.from(x.querySelectorAll("k")).map((k) => k.innerText.trim()) : [],
        lines: x ? x.querySelectorAll(".rru-xl").length : 0,
        text: x ? x.innerText : "",
        buttons: x ? x.querySelectorAll("button").length : 0,
      };
    });
    await page.waitForTimeout(200);
    ok("a row expands in place, and the CONTROL says so",
      expanded.opened && expanded.aria === "true" && expanded.rowHasAria === false,
      JSON.stringify({ opened: expanded.opened, aria: expanded.aria, rowHasAria: expanded.rowHasAria }));
    ok("EXPANDING FETCHES NOTHING — the detail was already in the payload",
      calls.length === beforeExpand, JSON.stringify(calls.slice(beforeExpand).map((c) => c.url)));
    const xLabels = expanded.labels.map((l) => l.toLowerCase());
    for (const label of ["Unit", "Resident", "Term", "Contracted rent", "How this is known", "Source"]) {
      ok(`expanded detail carries "${label}"`, xLabels.includes(label.toLowerCase()),
        JSON.stringify(expanded.labels));
    }
    //  THE RULING THAT MATTERS: an operator must not have to learn our model
    //  to read their own rent roll.
    for (const jargon of ["tenancy", "opening evidence", "economics", "position kind",
                          "proof basis", "imported claim", "counts toward trusted rent"]) {
      ok(`no schema label on screen: "${jargon}"`, !xLabels.some((l) => l.includes(jargon)));
    }
    ok("proof is translated into a sentence a person can read",
      /Accepted from the opening rent roll|Executed and funded through Spine/.test(expanded.text),
      expanded.text.slice(0, 220));
    ok("the missing rent's typed reason is stated in the expanded row",
      /not present in the opening source/i.test(expanded.text));
    //  A field this read does not carry is OMITTED, never printed as "Not
    //  recorded" — that phrasing is a claim about the PROPERTY, and the true
    //  claim is only that this read does not carry it.
    ok("no field is padded out with 'Not recorded'", !/Not recorded/.test(expanded.text));
    ok("the expansion is a ledger sub-row — two lines, not a form",
      expanded.lines >= 1 && expanded.lines <= 2, String(expanded.lines));
    ok("the resident record is reachable by identity from the expanded row",
      expanded.buttons >= 1 && /resident record/i.test(expanded.text), expanded.text.slice(-120));
    const xVis = await visible(".rru-x");
    ok("the expanded detail is VISIBLE, not merely present",
      xVis.found && xVis.boxed && !xVis.covered && !xVis.offscreen, JSON.stringify(xVis));
    await shot("05-expanded-row-detail.png");
    await page.evaluate(() => { const r = document.querySelector(".rru-r.on"); if (r) r.click(); });
    await page.waitForTimeout(150);

    // ══ 7. SEARCH AND FILTER NARROW, THEY DO NOT RECOMPUTE ═══════════
    console.log("\n  ── search and filter narrow the same read ──");
    const beforeFilter = calls.length;
    const filtered = await page.evaluate(async () => {
      window.psRruSetFilter("committed");
      await new Promise((r) => setTimeout(r, 120));
      const committed = document.querySelectorAll(".rru-r").length;
      window.psRruSetFilter("all");
      window.psRruSearch("1417-106");
      await new Promise((r) => setTimeout(r, 320));   // search is debounced
      const searched = {
        rows: document.querySelectorAll(".rru-r").length,
        groups: document.querySelectorAll("tbody.rru-g").length,
        count: (document.getElementById("psRruCount") || {}).textContent,
      };
      window.psRruSearch("");
      await new Promise((r) => setTimeout(r, 320));
      return { committed, searched, restored: document.querySelectorAll(".rru-r").length };
    });
    ok("filtering narrows to the committed positions", filtered.committed > 0 && filtered.committed < 160,
      String(filtered.committed));
    ok("search narrows to one unit", filtered.searched.groups === 1 && filtered.searched.rows === 3,
      JSON.stringify(filtered.searched));
    ok("the count reads N of TOTAL, so a narrowed view is never mistaken for the property",
      /of 160 positions/.test(filtered.searched.count || ""), filtered.searched.count);
    ok("clearing restores the whole building", filtered.restored === 160, String(filtered.restored));
    ok("NARROWING FETCHES NOTHING", calls.length === beforeFilter,
      JSON.stringify(calls.slice(beforeFilter).map((c) => c.url)));

    // ══ 8. THE DATE IS A DIAL ════════════════════════════════════════
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
      return { state: b.getAttribute("data-ps-state"),
               date: (document.getElementById("psRruDate") || {}).value,
               stand: (document.querySelector(".rru-sub") || {}).innerText || "",
               headers: Array.from(document.querySelectorAll(".rru-t thead tr.rru-col th")).map((h) => h.innerText.trim()),
               rows: document.querySelectorAll(".rru-r").length,
               occupied: document.querySelectorAll('.rru-r[data-status="occupied"]').length };
    });
    const dialCalls = calls.slice(beforeDial).filter((c) => c.url.indexOf("/operator/rent-roll/units") === 0);
    ok("moving the dial re-reads the SAME resource at the new date",
      dialCalls.length === 1 && dialCalls[0].url.indexOf("as_of=" + AS_OF) > 0,
      JSON.stringify(dialCalls.map((c) => c.url)));
    ok("it is the SAME interface, not a second rent-roll screen",
      JSON.stringify(dialed.headers) === JSON.stringify(read.headers) && dialed.rows === 160,
      JSON.stringify(dialed.headers));
    const occToday = lines.occupied, occThen = dialed.occupied;
    ok("both readings produced real numbers", Number.isFinite(occToday) && Number.isFinite(occThen));
    ok(`occupancy differs between ${AS_OF} and today, because the read is dated`,
      occThen !== occToday, `${AS_OF}: ${occThen}   today: ${occToday}`);
    console.log(`        ${AS_OF}: ${occThen} occupied     today (${iso}): ${occToday} occupied`);
    await page.evaluate(() => { window.psRruSearch("1417-106"); });
    await page.waitForTimeout(350);
    await shot("07-same-unit-at-earlier-as-of.png");
    await page.evaluate(() => { window.psRruSearch(""); window.scrollTo(0, 0); });
    await page.waitForTimeout(350);

    // ══ 8a. THE ROW IS A ROW. THE CONTROL IS A BUTTON. ═══════════════
    //
    //  This surface shipped its expand affordance as
    //    <tr tabindex="0" role="button" aria-expanded onkeydown=Enter||Space>
    //  which worked with a mouse and worked with a keyboard — which is
    //  exactly why it survived. What it cost is invisible from outside: a
    //  <tr> announced as a button is no longer a table row, so a rent roll
    //  read through a screen reader loses the row/column context that turns
    //  "Room1" into "1417-103, Room1, occupied, rent unknown". Having thrown
    //  that away it then reimplemented Enter and Space, which a real button
    //  gets for free and gets right.
    //
    //  rent_roll_row_semantics.test.js holds the emitted markup. THIS holds
    //  what a browser and a keyboard actually do with it — the two claims a
    //  string assertion cannot make: that the control is genuinely reachable
    //  by Tab, and that the a11y tree agrees.
    console.log("\n  ── a row is a row; the control is a button ──");
    {
      //  Start clean: nothing expanded, and the ledger scrolled to the top.
      await page.evaluate(() => { _psRru.open = {}; psRruPaint();
        var w = document.querySelector(".rru-wrap"); if (w) w.scrollTop = 0; });

      const sem = await page.evaluate(() => {
        const tr = document.querySelector("tr.rru-r");
        const btns = document.querySelectorAll("tr.rru-r .rru-b");
        //  Every focusable thing INSIDE a position row, by the platform's
        //  own definition rather than by a class name.
        const focusables = tr.querySelectorAll(
          'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
        return {
          tag: tr.tagName,
          role: tr.getAttribute("role"),
          tabindex: tr.getAttribute("tabindex"),
          ariaExpanded: tr.getAttribute("aria-expanded"),
          rows: document.querySelectorAll("tr.rru-r").length,
          controls: btns.length,
          focusablesInRow: focusables.length,
          firstFocusableTag: focusables[0] ? focusables[0].tagName : null,
          //  A <tr> that is still a row also still has cells the AT can read.
          cellsInRow: tr.querySelectorAll("td").length,
        };
      });
      ok("A1  the position row is a <tr> with NO role, NO tabindex, NO aria-expanded",
        sem.tag === "TR" && sem.role === null && sem.tabindex === null && sem.ariaExpanded === null,
        JSON.stringify(sem));
      ok("A2  every one of the 160 positions carries exactly one control",
        sem.rows === 160 && sem.controls === 160, `${sem.rows} rows / ${sem.controls} controls`);
      ok("A3  and the row's ONLY focusable descendant is that <button>",
        sem.focusablesInRow === 1 && sem.firstFocusableTag === "BUTTON", JSON.stringify(sem));
      ok("A4  the row still has its cells, so the ledger is still a table to read",
        sem.cellsInRow === 10, String(sem.cellsInRow));

      //  ── THE ACCESSIBILITY TREE, ASKED OF CHROMIUM ITSELF ──────────
      //  Not the attributes — the COMPUTED roles, which is the only place
      //  the old defect was ever visible. Every attribute check on the old
      //  markup would have passed; `role="button"` on a <tr> is a valid
      //  attribute. What it did was make the row stop being a row, and
      //  that only shows up here.
      //
      //  Via CDP because page.accessibility was removed in Playwright 1.4x.
      //  Reaching past the library to the protocol is warranted exactly
      //  when the claim IS about the browser's own computation.
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("DOM.enable");
      await cdp.send("Accessibility.enable");
      const axRole = async (selector) => {
        const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
        const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
        if (!nodeId) return { selector, role: null, name: null, missing: true };
        const { nodes } = await cdp.send("Accessibility.getPartialAXTree",
          { nodeId, fetchRelatives: false });
        const n = (nodes || [])[0] || {};
        return { selector, role: n.role && n.role.value, name: n.name && n.name.value,
                 ignored: !!n.ignored };
      };
      const axBtn = await axRole("tr.rru-r .rru-b");
      const axRow = await axRole("tr.rru-r");
      const axTbl = await axRole("table.rru-t");
      const axCell = await axRole("tr.rru-r td.rru-who");
      ok("A5  Chromium computes the control's role as `button`",
        axBtn.role === "button" && !axBtn.ignored, JSON.stringify(axBtn));
      ok("A6  …and the control carries an accessible name from its own text",
        !!(axBtn.name && axBtn.name.trim()), JSON.stringify(axBtn));
      //  THE ASSERTION THIS WHOLE BLOCK EXISTS FOR.
      ok("A7  Chromium computes the ROW's role as `row`, not `button`",
        axRow.role === "row", JSON.stringify(axRow));
      ok("A8  …the ledger is still a table, with cells inside the row",
        axTbl.role === "table" && axCell.role === "cell",
        JSON.stringify({ axTbl, axCell }));

      //  ── KEYBOARD ONLY. NOTHING IS CALLED, NOTHING IS FOCUSED BY SCRIPT ──
      //  A proof that ran el.focus() would be testing its own reach. Real
      //  Tab presses from a real anchor, then real Enter and Space.
      const target = await page.evaluate(() => {
        const b = document.querySelectorAll("tr.rru-r .rru-b")[0];
        b.scrollIntoView({ block: "center", behavior: "instant" });
        //  Anchor on the element BEFORE it in the document, then Tab to it —
        //  so reaching the button is the browser's decision, not ours.
        const prev = document.getElementById("psRruQ") || document.querySelector(".rru-nav input");
        if (prev) prev.focus();
        return { anchored: document.activeElement ? document.activeElement.id || document.activeElement.tagName : null,
                 spaceId: b.getAttribute("data-space-id") };
      });
      let hops = 0, landed = null;
      for (; hops < 12; hops++) {
        await page.keyboard.press("Tab");
        landed = await page.evaluate(() => {
          const a = document.activeElement;
          return a ? { cls: a.className, tag: a.tagName, sid: a.getAttribute && a.getAttribute("data-space-id") } : null;
        });
        if (landed && /rru-b/.test(landed.cls || "")) break;
      }
      ok("A9  TAB REACHES A ROW CONTROL — no script focus, no tabindex",
        !!(landed && /rru-b/.test(landed.cls || "") && landed.tag === "BUTTON"),
        `after ${hops + 1} Tab(s) from ${target.anchored}: ${JSON.stringify(landed)}`);

      const sid = landed && landed.sid;
      const focusRing = await page.evaluate(() => {
        const a = document.activeElement;
        return { focusVisible: a.matches(":focus-visible"),
                 outline: getComputedStyle(a).outlineStyle,
                 width: getComputedStyle(a).outlineWidth };
      });
      ok("A10  …and a keyboard-focused control shows a visible focus ring",
        focusRing.focusVisible === true && focusRing.outline !== "none"
        && parseFloat(focusRing.width) > 0, JSON.stringify(focusRing));

      //  ENTER. Not dispatched — pressed.
      const before = await page.evaluate((s) =>
        ({ expanded: document.querySelector('.rru-b[data-space-id="' + s + '"]').getAttribute("aria-expanded"),
           detail: !!document.getElementById("rru-x-" + s) }), sid);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      const after = await page.evaluate((s) => {
        const b = document.querySelector('.rru-b[data-space-id="' + s + '"]');
        const d = document.getElementById("rru-x-" + s);
        let covered = null, boxed = null;
        if (d) {
          const r = d.getBoundingClientRect();
          boxed = !!(r.width && r.height);
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          if (cx > 0 && cy > 0 && cx < window.innerWidth && cy < window.innerHeight) {
            const hit = document.elementFromPoint(cx, cy);
            covered = !(hit && (hit === d || d.contains(hit) || hit.contains(d)));
          }
        }
        return { expanded: b && b.getAttribute("aria-expanded"),
                 controls: b && b.getAttribute("aria-controls"),
                 detailExists: !!d, boxed, covered,
                 focusStillOnControl: document.activeElement === b,
                 focusVisible: document.activeElement.matches(":focus-visible") };
      }, sid);
      ok("A11 ENTER on the control expands the row",
        before.expanded === "false" && after.expanded === "true", JSON.stringify({ before, after }));
      ok("A12 …aria-controls now names the detail row, and it EXISTS",
        after.controls === "rru-x-" + sid && after.detailExists, JSON.stringify(after));
      //  RENDERED IS NOT VISIBLE. Asked of the document, not the element.
      ok("A13 …and the detail row is genuinely visible, not merely present",
        after.boxed === true && after.covered === false, JSON.stringify(after));
      //  The repaint replaces the DOM. Without the focus restore a keyboard
      //  operator would be dumped on <body>, 40 rows from where they were.
      ok("A14 …and focus SURVIVED the repaint, still on the same control",
        after.focusStillOnControl === true && after.focusVisible === true, JSON.stringify(after));
      //  TAKEN HERE ON PURPOSE: keyboard focus ring visible AND the row
      //  expanded, in one frame. A screenshot after the mouse steps below
      //  would be a picture of nothing, which is how a proof ends up with
      //  an artifact that evidences no claim.
      await shot("07b-a11y-focus-desktop.png");

      //  SPACE. A native button activates on Space and does not scroll the
      //  page; the old <tr> needed preventDefault() to fake that.
      const scrollBefore = await page.evaluate(() =>
        ({ page: window.scrollY, ledger: document.querySelector(".rru-wrap").scrollTop }));
      await page.keyboard.press("Space");
      await page.waitForTimeout(120);
      const afterSpace = await page.evaluate((s) => ({
        expanded: document.querySelector('.rru-b[data-space-id="' + s + '"]').getAttribute("aria-expanded"),
        controls: document.querySelector('.rru-b[data-space-id="' + s + '"]').getAttribute("aria-controls"),
        detail: !!document.getElementById("rru-x-" + s),
        page: window.scrollY, ledger: document.querySelector(".rru-wrap").scrollTop,
      }), sid);
      ok("A15 SPACE collapses it again", afterSpace.expanded === "false" && !afterSpace.detail,
        JSON.stringify(afterSpace));
      ok("A16 …aria-controls is dropped rather than left dangling at a removed id",
        afterSpace.controls === null, String(afterSpace.controls));
      ok("A17 …and Space did NOT scroll anything — it activated a real button",
        afterSpace.page === scrollBefore.page && afterSpace.ledger === scrollBefore.ledger,
        JSON.stringify({ scrollBefore, afterSpace }));

      //  ── MOUSE, STILL INTUITIVE ────────────────────────────────────
      //  The whole ledger line stays clickable. That is convenience over a
      //  control that already works, not a second control.
      const cellClick = await page.evaluate((s) => {
        const tr = document.querySelector('tr.rru-r[data-space-id="' + s + '"]');
        const cell = tr.querySelector("td.rru-who");
        const r = cell.getBoundingClientRect();
        cell.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: r.left + 4, clientY: r.top + 4 }));
        return null;
      }, sid);
      await page.waitForTimeout(120);
      const afterCell = await page.evaluate((s) => ({
        expanded: document.querySelector('.rru-b[data-space-id="' + s + '"]').getAttribute("aria-expanded"),
        detail: !!document.getElementById("rru-x-" + s) }), sid);
      ok("A18 clicking a non-control cell still opens the row",
        afterCell.expanded === "true" && afterCell.detail, JSON.stringify(afterCell));

      //  The one that catches a double-toggle: a real mouse click on the
      //  button bubbles to the row handler too. If that handler is not
      //  guarded, the row opens and immediately closes and looks broken.
      const btnBox = await page.evaluate((s) => {
        const b = document.querySelector('.rru-b[data-space-id="' + s + '"]');
        b.scrollIntoView({ block: "center", behavior: "instant" });
        //  BLUR FIRST, so the next assertion measures the MOUSE path rather
        //  than a retained ring. Per the focus-visible rules, clicking an
        //  element that is already showing a focus indicator keeps it — the
        //  keyboard steps above left this very control focused, and without
        //  this the "mouse leaves no ring" claim would be testing that rule
        //  instead of the product. Measured in a standalone page before
        //  being written down here.
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, sid);
      await page.mouse.click(btnBox.x, btnBox.y);
      await page.waitForTimeout(120);
      const afterBtn = await page.evaluate((s) => ({
        expanded: document.querySelector('.rru-b[data-space-id="' + s + '"]').getAttribute("aria-expanded"),
        detail: !!document.getElementById("rru-x-" + s),
        focusVisible: document.activeElement.matches(":focus-visible"),
        isTheButton: document.activeElement === document.querySelector('.rru-b[data-space-id="' + s + '"]'),
      }), sid);
      ok("A19 a real mouse click ON the control toggles ONCE, not twice",
        afterBtn.expanded === "false" && !afterBtn.detail, JSON.stringify(afterBtn));
      ok("A20 …focus lands on the control clicked, so Tab continues from there",
        afterBtn.isTheButton === true, JSON.stringify(afterBtn));
      ok("A21 …and a mouse click leaves no keyboard focus ring on a dense ledger",
        afterBtn.focusVisible === false, JSON.stringify(afterBtn));

      //  ── AND THE LEDGER LOOKS EXACTLY THE SAME ─────────────────────
      //  The control contributes no chrome and the focus ring is an outline,
      //  which does not participate in layout. Measured, not asserted in prose.
      const geo = await page.evaluate((s) => {
        const rowsNow = document.querySelectorAll("tr.rru-r");
        const h = rowsNow[0].getBoundingClientRect().height;
        const table = document.querySelector("table.rru-t").getBoundingClientRect();
        const b = document.querySelector('.rru-b[data-space-id="' + s + '"]');
        b.focus();
        const hFocused = document.querySelectorAll("tr.rru-r")[0].getBoundingClientRect().height;
        const tableFocused = document.querySelector("table.rru-t").getBoundingClientRect();
        b.blur();
        //  Every unit cell still shares one x-origin across unit groups —
        //  a block-level control in a cell is the obvious way to break that.
        const xs = [...new Set(Array.from(rowsNow).slice(0, 40)
          .map((r) => Math.round(r.querySelector("td.rru-unit").getBoundingClientRect().left)))];
        return { h, hFocused, tableW: Math.round(table.width), tableWFocused: Math.round(tableFocused.width),
                 unitOrigins: xs.length };
      }, sid);
      ok("A22 a position still occupies a ledger line (≤ 24px)", geo.h <= 24, `${geo.h}px`);
      ok("A23 focusing a control shifts NOTHING — the ring is an outline",
        geo.h === geo.hFocused && geo.tableW === geo.tableWFocused, JSON.stringify(geo));
      ok("A24 the unit column still shares one x-origin across unit groups",
        geo.unitOrigins === 1, `${geo.unitOrigins} distinct origins`);

      // ══ NARROW WIDTH — the same semantics, a smaller screen ═════════
      console.log("\n  ── the same control at narrow width ──");
      await page.setViewportSize({ width: 390, height: 780 });
      await page.waitForTimeout(300);
      await page.evaluate(() => { _psRru.open = {}; psRruPaint();
        var w = document.querySelector(".rru-wrap"); if (w) w.scrollTop = 0; });
      const narrow = await page.evaluate(() => {
        const tr = document.querySelector("tr.rru-r");
        const b = tr.querySelector(".rru-b");
        b.scrollIntoView({ block: "center", behavior: "instant" });
        const r = b.getBoundingClientRect();
        return {
          role: tr.getAttribute("role"), tabindex: tr.getAttribute("tabindex"),
          ariaExpanded: tr.getAttribute("aria-expanded"),
          controls: document.querySelectorAll("tr.rru-r .rru-b").length,
          rowH: tr.getBoundingClientRect().height,
          btnTag: b.tagName, btnW: Math.round(r.width), btnH: Math.round(r.height),
          sid: b.getAttribute("data-space-id"),
          //  The control must be REACHABLE by a pointer at this width, not
          //  clipped to zero by the horizontal scroller.
          hit: (function () {
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return "offscreen";
            const el = document.elementFromPoint(cx, cy);
            return el === b || b.contains(el) ? "hit" : "covered";
          })(),
        };
      });
      ok("N1  narrow width keeps the row a row — no role, no tabindex, no aria-expanded",
        narrow.role === null && narrow.tabindex === null && narrow.ariaExpanded === null,
        JSON.stringify(narrow));
      ok("N2  …one <button> control per position, still", narrow.controls === 160 && narrow.btnTag === "BUTTON",
        JSON.stringify(narrow));
      ok("N3  …the control has a real, reachable hit area", narrow.hit === "hit" && narrow.btnW > 0 && narrow.btnH > 0,
        JSON.stringify(narrow));
      ok("N4  …and the ledger stays dense (≤ 24px per position)", narrow.rowH <= 24, `${narrow.rowH}px`);

      //  ── DENSITY ON A PHONE, MEASURED THE SAME WAY AS THE DESKTOP ──
      //  The desktop pass asserts 30 positions in the first viewport. Nothing
      //  asserted the phone, and a screenshot of the real device showed seven
      //  stacked header bands and TEN rows. The header is the product's, so
      //  the header is measured.
      const nd = await page.evaluate(() => {
        const h = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : null; };
        const wrap = document.querySelector(".rru-wrap");
        const wr = wrap.getBoundingClientRect();
        const rows = Array.from(document.querySelectorAll("tr.rru-r"));
        const vis = rows.filter((r) => {
          const b = r.getBoundingClientRect();
          return b.top >= wr.top - 1 && b.bottom <= Math.min(wr.bottom, window.innerHeight) + 1;
        }).length;
        return {
          bands: { hdr: h(".rru-hdr"), sub: h(".rru-sub"), nav: h(".rru-nav"), thead: h(".rru-t thead") },
          titleLines: Math.round((h(".rru-name h2") || 0) /
            parseFloat(getComputedStyle(document.querySelector(".rru-name h2")).lineHeight || "1")),
          headerHeight: Math.round(wr.top),
          ledgerHeight: Math.round(wr.height),
          viewport: window.innerHeight,
          positionsVisible: vis,
          //  Dead space between the ledger and the bottom of the screen.
          tailGap: Math.round(window.innerHeight - wr.bottom),
          pageScrolls: document.documentElement.scrollHeight - window.innerHeight,
          //  WHAT OCCUPIES THE SPACE UNDER THE LEDGER. A gap is only DEAD
          //  space if nothing is in it, and the difference decides whether
          //  the fix is a layout change or deleting somebody's real bar.
          //  Asked of the document at three depths, because one probe can
          //  land in a margin.
          under: (function () {
            const wr2 = wrap.getBoundingClientRect();
            return [8, 24, 44].map((dy) => {
              const y = wr2.bottom + dy;
              if (y >= window.innerHeight) return "offscreen";
              const el = document.elementFromPoint(Math.round(window.innerWidth / 2), Math.round(y));
              if (!el) return "nothing";
              //  Walk up to the nearest thing with a class, so "DIV" alone
              //  never reads as a finding.
              let n = el;
              while (n && !String(n.className || "").trim() && n.parentElement) n = n.parentElement;
              return `${el.tagName.toLowerCase()}:${String(n.className || "").split(" ")[0] || "?"}`;
            });
          })(),
        };
      });
      //  THE RENT ROLL'S OWN HEADER, measured the same way the desktop pass
      //  measures it: the sum of ITS bands. `headerHeight` above is the
      //  distance from the top of the SCREEN, which also contains the app
      //  bar and the crumb — shell chrome this surface does not own and
      //  must not be judged on.
      nd.ownHeader = nd.bands.hdr + nd.bands.sub + nd.bands.nav + nd.bands.thead;
      Object.entries(nd).forEach(([k, v]) =>
        console.log(`        ${k.padEnd(18)} ${typeof v === "object" ? JSON.stringify(v) : v}`));
      //  The header is CHROME. Desktop holds its own header under 15% of the
      //  viewport; a phone is given more room because the same six counts,
      //  the dial, the search and five filters have a third of the width —
      //  but not unlimited room. It was 196px of 780 when this was written
      //  and 245px before the phone pass existed.
      ok("N8  the rent roll's OWN header is under 25% of a phone viewport",
        nd.ownHeader < nd.viewport * 0.25, `${nd.ownHeader}px of ${nd.viewport}px`);
      ok("N9  at least 18 positions are visible on a phone without scrolling",
        nd.positionsVisible >= 18, `${nd.positionsVisible} visible`);
      /*  ⚠ THIS ASSERTION WAS WRONG FIRST, AND THE WRONG VERSION WAS THE
       *  USEFUL ONE. It read "tailGap <= 24" and failed at 143px, which is
       *  what found the shell's 80px bottom padding. After that was given
       *  back it still failed at 75px — and 75px turned out to be the
       *  PROPERTY SWITCHER, real UI the ledger has no claim on.
       *
       *  So the claim is not "the gap is small". It is "the space under the
       *  ledger belongs to SOMETHING." An empty shell down there means the
       *  ledger was shrunk to hide a layout bug; a real bar means the ledger
       *  ends where the screen does.  */
      const realUnder = nd.under.some((u) =>
        u && u !== "nothing" && u !== "offscreen" && !/:wrap$|:hero$|:\?$/.test(u));
      ok("N10 the space under the ledger is real UI, not a gap the ledger was shrunk to hide",
        nd.tailGap <= 24 || realUnder,
        `${nd.tailGap}px below the ledger, and it probes as ${JSON.stringify(nd.under)}`);
      ok("N11 the page itself does not scroll — the ledger does",
        nd.pageScrolls <= 0, `${nd.pageScrolls}px of page overflow`);
      ok("N12 the title is one line, not a two-line display block",
        nd.bands.hdr <= 44, `.rru-hdr is ${nd.bands.hdr}px`);

      /*  ⚠ COMPRESSING A ROW CAN COLLIDE IT, AND THE HEIGHT STILL LOOKS
       *  RIGHT. The first phone pass put the title, the property name, the
       *  date input and Today on one nowrap line: .rru-hdr measured a
       *  perfect 31px and the screenshot showed "RENT RO" with a date
       *  picker sitting on top of it. Height is not layout. */
      const collide = await page.evaluate(() => {
        const h2 = document.querySelector(".rru-name h2");
        const dial = document.querySelector(".rru-asof");
        const a = h2.getBoundingClientRect(), b = dial.getBoundingClientRect();
        return {
          titleText: h2.textContent.trim(),
          titleFont: getComputedStyle(h2).fontSize,
          titleBox: [Math.round(a.left), Math.round(a.right)],
          dialBox: [Math.round(b.left), Math.round(b.right)],
          nameBox: (function () { const n = document.querySelector(".rru-name").getBoundingClientRect();
            return [Math.round(n.left), Math.round(n.right)]; })(),
          propShown: getComputedStyle(document.querySelector(".rru-name .prop") || h2).display,
          titleClipped: h2.scrollWidth > h2.clientWidth + 1,
          overlap: Math.round(Math.min(a.right, b.right) - Math.max(a.left, b.left)),
          //  Ask the DOCUMENT whether the title's own last character is the
          //  thing painted there. Rendered is not visible.
          titleEndOwned: (function () {
            const el = document.elementFromPoint(Math.round(a.right - 2), Math.round(a.top + a.height / 2));
            return !!(el && (el === h2 || h2.contains(el)));
          })(),
          dialFits: b.right <= window.innerWidth + 1 && b.left >= 0,
        };
      });
      ok("N13 the title is not clipped and does not collide with the date dial",
        collide.titleClipped === false && collide.overlap <= 0 && collide.titleEndOwned === true,
        JSON.stringify(collide));
      ok("N14 …and the date dial is fully on screen",
        collide.dialFits === true, JSON.stringify(collide));

      //  KEYBOARD AT NARROW WIDTH. Same real Tab / Enter, no script focus.
      await page.evaluate(() => {
        const prev = document.getElementById("psRruQ") || document.querySelector(".rru-nav input");
        if (prev) prev.focus();
      });
      let nHops = 0, nLanded = null;
      for (; nHops < 12; nHops++) {
        await page.keyboard.press("Tab");
        nLanded = await page.evaluate(() => {
          const a = document.activeElement;
          return a ? { cls: a.className, tag: a.tagName, sid: a.getAttribute && a.getAttribute("data-space-id") } : null;
        });
        if (nLanded && /rru-b/.test(nLanded.cls || "")) break;
      }
      ok("N5  Tab still reaches a row control at 390px",
        !!(nLanded && /rru-b/.test(nLanded.cls || "")), JSON.stringify(nLanded));
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      const nAfter = await page.evaluate((s) => {
        const b = document.querySelector('.rru-b[data-space-id="' + s + '"]');
        const d = document.getElementById("rru-x-" + s);
        let covered = null;
        if (d) {
          const r = d.getBoundingClientRect();
          const cx = r.left + Math.min(r.width / 2, innerWidth / 2), cy = r.top + r.height / 2;
          if (cx > 0 && cy > 0 && cx < innerWidth && cy < innerHeight) {
            const hit = document.elementFromPoint(cx, cy);
            covered = !(hit && (hit === d || d.contains(hit) || hit.contains(d)));
          }
        }
        return { expanded: b.getAttribute("aria-expanded"), detail: !!d, covered,
                 focusHeld: document.activeElement === b };
      }, nLanded && nLanded.sid);
      ok("N6  ENTER expands at narrow width, and focus survives the repaint",
        nAfter.expanded === "true" && nAfter.detail && nAfter.focusHeld, JSON.stringify(nAfter));
      ok("N7  …and the detail is visible, not merely present at 390px",
        nAfter.covered === false, JSON.stringify(nAfter));

      /*  The ledger scrolls horizontally at 1080px min-width, which is right
       *  for the columns and was wrong for the expanded sub-row: it rendered
       *  to the table's full width and the phone showed the first 390px of
       *  it. Those two lines are the only place a phone can read the source,
       *  the use, and why a rent is unknown.  */
      const detail = await page.evaluate((s) => {
        const d = document.getElementById("rru-x-" + s);
        if (!d) return { missing: true };
        const lines = Array.from(d.querySelectorAll(".rru-xl"));
        return {
          overflowing: lines.filter((l) => l.getBoundingClientRect().right > window.innerWidth + 1).length,
          lineCount: lines.length,
          //  The direct claim: the text WRAPS rather than being cut. A line
          //  whose content is wider than its box is a line the phone is
          //  showing the first half of.
          clipped: lines.filter((l) => l.scrollWidth > l.clientWidth + 1).length,
          widest: Math.max(...lines.map((l) => Math.round(l.getBoundingClientRect().right))),
          viewport: window.innerWidth,
          wraps: getComputedStyle(lines[0]).whiteSpace,
        };
      }, nLanded && nLanded.sid);
      ok("N15 the expanded detail wraps inside the phone rather than running off it",
        detail.lineCount > 0 && detail.overflowing === 0 && detail.clipped === 0
        && detail.wraps === "normal",
        JSON.stringify(detail));
      await shot("07c-a11y-narrow.png");

      //  Back to desktop so the performance baseline below is measured on
      //  the same viewport it has always been measured on.
      await page.setViewportSize({ width: 1400, height: 1000 });
      await page.waitForTimeout(300);
      await page.evaluate(() => { _psRru.open = {}; psRruPaint(); });
    }

    // ══ 8b. A BY-UNIT PROPERTY USES THE SAME COMPONENT ═══════════════
    //  THE CONTROL. The room column and the unit band must come from the
    //  PAYLOAD's grain, not from which property is open (§22). Proven by
    //  entering a second, whole-unit property in the same browser.
    console.log("\n  ── the same component on a by-unit property ──");
    await page.evaluate((id) => window.switchProperty(id), byUnitProp);
    await page.waitForFunction((id) => {
      const s = document.getElementById("propPick"); return s && s.value === id;
    }, byUnitProp, { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => window.openDesk("management"));
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll(".mg-door h3")).some((h) => /^rent roll$/i.test(h.innerText.trim())),
      { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => {
      const c = Array.from(document.querySelectorAll(".mg-door"))
        .find((x) => /^rent roll$/i.test(((x.querySelector("h3") || {}).innerText || "").trim()));
      if (c) c.click();
    });
    await page.waitForFunction(
      () => { const b = document.getElementById("psRruBody"); return b && b.getAttribute("data-ps-state") === "data"; },
      { timeout: 30000 }).catch(() => {});
    const byUnit = await page.evaluate(() => {
      const body = document.getElementById("psRruBody");
      const rows = Array.from(document.querySelectorAll(".rru-r"));
      return {
        headers: Array.from(document.querySelectorAll(".rru-t thead tr.rru-col th")).map((h) => h.innerText.trim()),
        bands: document.querySelectorAll("tr.rru-gh").length,
        rows: rows.length,
        firstCells: rows.length ? Array.from(rows[0].children).map((c) => c.innerText.trim()) : [],
        roomCol: !!document.querySelector(".rru-t col.c-room"),
        text: body ? body.innerText : "",
      };
    });
    ok("a by-unit property collapses to UNIT as the first column, with no fake room",
      /^unit$/i.test(byUnit.headers[0] || "") && byUnit.roomCol === false,
      JSON.stringify({ headers: byUnit.headers, roomCol: byUnit.roomCol }));
    ok("and grows no unit bands — hierarchy is not invented where there is none",
      byUnit.bands === 0, String(byUnit.bands));
    ok("one row per unit", byUnit.rows === 4, String(byUnit.rows));
    ok("the unit number is the row's own first cell", /^\d/.test(byUnit.firstCells[0] || ""),
      JSON.stringify(byUnit.firstCells));
    ok("'(whole unit)' still never reaches a person", !/whole\s*unit/i.test(byUnit.text));
    ok("'Room1' is not invented for a property that has no rooms", !/Room\d/.test(byUnit.text));
    await shot("08-by-unit-property.png");

    //  Back to Skyline for the remaining acceptance.
    await page.evaluate((id) => window.switchProperty(id), prop);
    await page.waitForFunction((id) => {
      const s = document.getElementById("propPick"); return s && s.value === id;
    }, prop, { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => window.openDesk("management"));
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll(".mg-door h3")).some((h) => /^rent roll$/i.test(h.innerText.trim())),
      { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => {
      const c = Array.from(document.querySelectorAll(".mg-door"))
        .find((x) => /^rent roll$/i.test(((x.querySelector("h3") || {}).innerText || "").trim()));
      if (c) c.click();
    });
    await page.waitForFunction(
      () => { const b = document.getElementById("psRruBody"); return b && b.getAttribute("data-ps-state") === "data"; },
      { timeout: 30000 }).catch(() => {});

    //  MEASURE THE REPAINT WHILE THE TABLE IS ON SCREEN. Measured at the end
    //  once, after the page had navigated away, psRruPaint() returned on its
    //  first line and reported 0.00ms. A timing of zero is not a fast render;
    //  it is a measurement of nothing.
    const repaintMs = await page.evaluate(() => {
      const t = performance.now();
      psRruPaint();
      document.querySelector(".rru-wrap").offsetHeight;   // force layout, not just DOM writes
      return Math.round((performance.now() - t) * 100) / 100;
    });
    ok("the repaint measured something real, not an early return", repaintMs > 0, repaintMs + "ms");

    // ══ 9. THE FULL SCHEDULE IS THE SECOND MODE OF ONE TRUTH ═════════
    console.log("\n  ── the other projection of the same truth ──");
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("#psRruBody button"))
        .find((x) => /full schedule/i.test(x.innerText));
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
    ok("the full schedule is still reachable and live",
      flat.state === "data" && flat.rows === 160, JSON.stringify(flat));
    await shot("06-full-schedule.png");


    // ══ 9. PERFORMANCE BASELINE ══════════════════════════════════════
    console.log("\n  ══ PERFORMANCE BASELINE — 72 units · 160 positions ══");
    const unitCall = calls.find((c) => c.url.indexOf("/operator/rent-roll/units") === 0);
    const baseline = {
      positions: read.positionRows,
      units: read.unitGroups,
      requests_for_the_page: rrCalls.length,
      response_bytes: unitCall ? unitCall.bytes : null,
      bytes_per_position: unitCall && read.positionRows ? Math.round(unitCall.bytes / read.positionRows) : null,
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
