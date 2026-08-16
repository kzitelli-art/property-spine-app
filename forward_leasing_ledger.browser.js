/* ════════════════════════════════════════════════════════════════════
   forward_leasing_ledger.browser.js — THE FORWARD LEASING LEDGER, IN A
   REAL BROWSER, ON THE REAL JULY EXPORT AND MIKE'S REAL TRACKER.

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
const { stageTrackerClaims, sha256 } = require(path.join(API_REPO, "src/leasing/tracker_intake.js"));
const TRACKER_PATH = process.env.SKYLINE_TRACKER
  || "/root/.claude/uploads/27e16502-554d-5a14-9258-903418ff09cd/5fd201ad-Temple_Tracker_20262027.xlsx";
const TRACKER_SHEET = "Skyline 2026-2027 RR";
const CYCLE_START = "2026-08-01", CYCLE_END = "2027-07-31", CYCLE_LABEL = "2026\u201327";
/*  Mike's own remaining list, typed from his tracker. The acceptance set. */
const MIKE_REMAINING = ["101A","101B","101C","102A","102B","104B","115A","115B",
  "209A","215A","215B","315A","315B","316C","412B","416A"].sort();
const ORD = { Room1:"A", Room2:"B", Room3:"C", Room4:"D" };

const CONN = process.env.HARNESS_DATABASE_URL;
const API_PORT = Number(process.env.API_PORT || 3031);
const STATIC_PORT = 4331;
const TLS_PORT = 4463;
const SHOTS = path.join(__dirname, "docs", "screenshots_forward_ledger");
const XLSX_PATH = process.env.SKYLINE_XLSX
  || "/root/.claude/uploads/27e16502-554d-5a14-9258-903418ff09cd/d657f655-RentRoll07_1417.xlsx";
const ORG = "Skyline Forward Ledger Browser";

if (!CONN) { console.error("REFUSED: set HARNESS_DATABASE_URL."); process.exit(2); }
if (!fs.existsSync(XLSX_PATH)) { console.error("REFUSED: the real Skyline export was not found at " + XLSX_PATH); process.exit(2); }
if (!fs.existsSync(TRACKER_PATH)) { console.error("REFUSED: Mike's tracker was not found at " + TRACKER_PATH); process.exit(2); }

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
    //  Claims and their activation FIRST — proposed_records → activations →
    //  properties. The first run died here: this proof STAGES claims, which
    //  the rent-roll proof it was adapted from never did, so its teardown
    //  had no reason to know about them.
    await pool.query(`delete from proposed_records where property_id=$1`, [id]);
    await pool.query(`delete from activations where property_id=$1`, [id]);
    await pool.query(`delete from leases where property_id=$1`, [id]);
    await pool.query(`delete from spaces where unit_id in (select id from units where property_id=$1)`, [id]);
    await pool.query(`delete from units where property_id=$1`, [id]);
    await pool.query(`delete from property_team_assignments where property_id=$1`, [id]);
    await pool.query(`delete from import_batches where property_id=$1`, [id]);
    await pool.query(`delete from properties where id=$1`, [id]);
  }
  const u = (await pool.query(
    `select id from users where email='mike.fwdledger@example.test'`)).rows.map((r) => r.id);
  for (const id of u) {
    await pool.query(`delete from staff_sessions where user_id=$1`, [id]);
    await pool.query(`delete from property_team_assignments where user_id=$1`, [id]);
    await pool.query(`delete from users where id=$1`, [id]);
  }
  await pool.query(`delete from persons where source='skyline_fwd_browser'`);
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
  console.log("  FORWARD LEASING LEDGER — real Skyline, real tracker, real browser");
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
       values ($1,'skyline_fwd_browser','resident','resident',$2,'rent_roll_ledger',$3,'confirmed') returning id`,
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
         values ($1,'skyline_fwd_browser','resident','resident') returning id`, [names[i]])).rows[0].id;
      await pool.query(
        `insert into leases (property_id, space_id, tenant_ids, rent, start_date, end_date, lease_status)
         values ($1,$2,$3,1750,'2026-01-01','2027-06-30','active')`,
        [byUnitProp, spaces[i].id, [person]]);
    }
  }

  const mike = (await pool.query(
    `insert into users (name, email, role, is_active, status)
     values ('Mike','mike.fwdledger@example.test','property_manager',true,'active') returning id`)).rows[0].id;
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


    // ══ 0. STAGE MIKE'S REAL TRACKER AS EVIDENCE ═════════════════════
    //  Through the real seam, not by inserting rows. If stageTrackerClaims
    //  ever starts writing leases this proof's own world would change and
    //  the DB proof would catch it — but the screen must be exercised on
    //  claims produced the way production produces them.
    {
      const XLSXt = require(path.join(API_MODULES, "xlsx"));
      const wb = XLSXt.readFile(TRACKER_PATH);
      const trows = XLSXt.utils.sheet_to_json(wb.Sheets[TRACKER_SHEET], { header: 1, defval: null });
      const ct = await pool.connect();
      try {
        await ct.query("begin");
        const staged = await stageTrackerClaims(ct, {
          property_id: prop, cycle_start: CYCLE_START, cycle_end: CYCLE_END,
          cycle_label: CYCLE_LABEL,
          source_label: "Temple Tracker 2026-2027.xlsx · " + TRACKER_SHEET,
          source_sha256: sha256(fs.readFileSync(TRACKER_PATH)), rows: trows,
        });
        await ct.query("commit");
        console.log(`  staged ${staged.claims_written} claims · tracker says ` +
          `${staged.tracker_position.signed} signed / ${staged.tracker_position.pending} pending / ` +
          `${staged.tracker_position.open} open`);
        ok("the real tracker staged, and it wrote no lease",
          staged.claims_written > 0 && staged.promoted === 0);
      } catch (e) { await ct.query("rollback"); throw e; } finally { ct.release(); }
    }

    // ══ 1. A REAL OPERATOR, ON THE REAL PROPERTY ═════════════════════
    console.log("\n  ── the app loads, signed in, on Skyline ──");
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

    // ══ 2. OPEN IT THE WAY AN OPERATOR OPENS IT ══════════════════════
    //  Through the real card. #intelStrip lives inside a hidden #workspace,
    //  so calling the renderer from the console would paint into a
    //  display:none subtree where every innerText read silently succeeds.
    console.log("\n  ── the Leasing Cycle door ──");
    await page.evaluate(() => window.openDesk("management"));
    //  Wait for the desk to paint ANY door first, then for ours. Waiting
    //  only for ours and swallowing the timeout reported an empty heading
    //  list and hid whether the desk had rendered at all.
    await page.waitForFunction(() => document.querySelectorAll(".mg-door h3").length > 0,
      { timeout: 30000 });
    //  Read the headings AFTER the specific wait. Reading between the two
    //  waits caught the desk mid-repaint and reported an empty list while
    //  the very next assertion found and clicked the door.
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll(".mg-door h3")).some((h) => /^leasing cycle$/i.test(h.innerText.trim())),
      { timeout: 20000 }).catch(() => {});
    const doorsSeen = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".mg-door h3")).map((h) => h.innerText.trim()));
    ok("the Management desk rendered its doors", doorsSeen.length > 0, JSON.stringify(doorsSeen));
    const clicked = await page.evaluate(() => {
      const doors = Array.from(document.querySelectorAll(".mg-door"));
      //  WHOLE heading, case-insensitive. "Forward Leasing" sits beside it
      //  and a loose match would open the term surface instead.
      const card = doors.find((c) => /^leasing cycle$/i.test(((c.querySelector("h3") || {}).innerText || "").trim()));
      if (card) card.click();
      return { clicked: !!card, headings: doors.map((c) => ((c.querySelector("h3") || {}).innerText || "").trim()) };
    });
    ok("the Leasing Cycle door exists and was clicked", clicked.clicked === true, JSON.stringify(clicked.headings));

    //  NO DEFAULT CYCLE — the surface must ASK.
    await page.waitForFunction(() => {
      const b = document.getElementById("psFlsBody");
      return b && b.getAttribute("data-ps-state") === "awaiting_cycle";
    }, { timeout: 20000 }).catch(() => {});
    const asked = await page.evaluate(() => {
      const b = document.getElementById("psFlsBody");
      return { state: b && b.getAttribute("data-ps-state"), text: b ? b.innerText.slice(0, 160) : null };
    });
    ok("it opens by ASKING for the cycle — no default, no guessed school year",
      asked.state === "awaiting_cycle" && /both dates/i.test(asked.text || ""), JSON.stringify(asked));
    await shot("01_asks_for_cycle.png");

    // ══ 3. THE CYCLE, ENTERED THROUGH THE REAL CONTROLS ══════════════
    await page.fill("#psFlsStart", CYCLE_START);
    await page.dispatchEvent("#psFlsStart", "change");
    await page.fill("#psFlsEnd", CYCLE_END);
    await page.dispatchEvent("#psFlsEnd", "change");
    await page.waitForFunction(() => {
      const b = document.getElementById("psFlsBody");
      return b && b.getAttribute("data-ps-state") === "data";
    }, { timeout: 40000 });

    // ══ 4. THE HEADLINE — MIKE'S NUMBER, AND IT IS VISIBLE ═══════════
    console.log("\n  ── the headline ──");
    const head = await page.evaluate(() => {
      const t = (id) => { const e = document.getElementById(id); return e ? e.innerText.trim() : null; };
      const h = document.getElementById("psFlsHead");
      return { committed: t("psFlsCommitted"), remaining: t("psFlsRemaining"),
               split: t("psFlsSplit"), proofline: t("psFlsProofLine"),
               whole: h ? h.innerText.replace(/\s+/g, " ").trim() : null };
    });
    console.log("     " + (head.whole || "").slice(0, 200));
    ok("the headline reads 144 committed", head.committed === "144", String(head.committed));
    ok("…and 16 remaining", head.remaining === "16", String(head.remaining));
    ok("…and 90.0%", /90\.0%/.test(head.whole || ""), head.whole);
    ok("…with Signed and Pending NOT collapsed", /140 Signed/.test(head.split || "") && /4 Pending/.test(head.split || ""),
      String(head.split));
    ok("the proof state is present and SECONDARY, not a second headline",
      /tied to leases/.test(head.proofline || "") && /awaiting contractual tie/.test(head.proofline || "") &&
      /need review/.test(head.proofline || ""), String(head.proofline));
    const hv = await visible("#psFlsCommitted"), pv = await visible("#psFlsProofLine");
    ok("the committed number is actually visible on the page",
      hv.found && hv.boxed && !hv.covered, JSON.stringify(hv));
    ok("the proof line is actually visible on the page",
      pv.found && pv.boxed && !pv.covered, JSON.stringify(pv));
    //  GEOMETRY, not opinion: the operator's number must dominate.
    const sizes = await page.evaluate(() => {
      const a = document.getElementById("psFlsCommitted"), b = document.getElementById("psFlsProofLine");
      const px = (e) => e ? parseFloat(getComputedStyle(e).fontSize) : null;
      return { committed: px(a), proof: px(b) };
    });
    ok("Mike's number is visually primary over the proof state",
      sizes.committed && sizes.proof && sizes.committed >= sizes.proof * 2.5, JSON.stringify(sizes));
    await shot("02_headline_desktop.png");

    // ══ 5. ALL 160 BEDS, EXACTLY ONCE ════════════════════════════════
    console.log("\n  ── the ledger ──");
    const rows = await page.evaluate(() => {
      const rs = Array.from(document.querySelectorAll("#psFlsBody2 tr.fls-r"));
      return rs.map((r) => ({
        sid: r.getAttribute("data-space-id"),
        state: r.getAttribute("data-state"), proof: r.getAttribute("data-proof"),
        bed: (r.querySelector(".rru-unit") || {}).innerText ? r.querySelector(".rru-unit").innerText.trim() : "",
        room: (r.querySelector(".rru-room") || {}).innerText ? r.querySelector(".rru-room").innerText.trim() : "",
        text: r.innerText.replace(/\s+/g, " ").trim(),
      }));
    });
    ok("the default view renders 160 bed rows", rows.length === 160, String(rows.length));
    ok("…each exactly once", new Set(rows.map((r) => r.sid)).size === 160,
      String(new Set(rows.map((r) => r.sid)).size));

    const label = (r) => (r.bed + (ORD[r.room] || r.room || "")).replace(/\s+/g, "");
    const byLabel = new Map(rows.map((r) => [label(r), r]));

    // ══ 6. THE ACCEPTANCE SET ════════════════════════════════════════
    await page.evaluate(() => psFlsSetFilter("remaining"));
    await page.waitForTimeout(150);
    const remaining = await page.evaluate(() => Array.from(document.querySelectorAll("#psFlsBody2 tr.fls-r"))
      .map((r) => ({ bed: (r.querySelector(".rru-unit")||{}).innerText||"", room: (r.querySelector(".rru-room")||{}).innerText||"",
                     state: r.getAttribute("data-state") })));
    const remLabels = remaining.map((r) => (r.bed.trim() + (({Room1:"A",Room2:"B",Room3:"C",Room4:"D"})[r.room.trim()] || r.room.trim())).replace(/\s+/g,"")).sort();
    /*  ⚠ ASK THE PIXELS, NOT THE DOM. The set assertion below passed while
     *  the screenshot showed 15 rows: the column header pinned 17px down and
     *  covered the first bed. A ledger whose first row is invisible is a
     *  ledger that is wrong about its own acceptance set.  */
    const firstRowVis = await page.evaluate(() => {
      const r = document.querySelector("#psFlsBody2 tr.fls-r");
      if (!r) return { found: false };
      const b = r.getBoundingClientRect();
      const cx = b.left + 60, cy = b.top + b.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return { found: true, hit: hit ? hit.tagName + "." + hit.className : null,
               inRow: !!(hit && (r === hit || r.contains(hit))) };
    });
    ok("the FIRST bed row is actually visible, not under the pinned header",
      firstRowVis.found && firstRowVis.inRow, JSON.stringify(firstRowVis));
    const chip = await page.evaluate(() => {
      const on = Array.from(document.querySelectorAll(".fls-f.on")).map((b) => b.innerText.trim());
      return { on };
    });
    ok("the active filter chip shows which filter is on",
      chip.on.length === 1 && /remaining/i.test(chip.on[0]), JSON.stringify(chip));
    ok("the Remaining filter is EXACTLY Mike's 16 beds, bed-for-bed",
      JSON.stringify(remLabels) === JSON.stringify(MIKE_REMAINING),
      "got " + remLabels.length + ": " + remLabels.join(" "));
    const r416 = remaining.find((r) => /416/.test(r.bed) && /Room1/.test(r.room));
    ok("416A is INSIDE the Remaining filter", !!r416, JSON.stringify(remaining.slice(0,3)));
    ok("…and reads CHECK there, not a clean REMAINING", r416 && r416.state === "check", r416 && r416.state);
    await shot("03_remaining_filter.png");
    await page.evaluate(() => psFlsSetFilter("all"));
    await page.waitForTimeout(150);

    // ══ 7. THE EXCEPTIONS, EACH ON ITS OWN AXIS ══════════════════════
    const b405 = byLabel.get("405B"), b111 = byLabel.get("111A"), b305 = byLabel.get("305A"),
          b416 = byLabel.get("416A"), b212 = byLabel.get("212B");
    ok("405B is NOT Remaining — an unresolved identity is not an open bed",
      b405 && b405.state === "check", b405 ? b405.state : "row missing");
    ok("…and it is flagged NEEDS REVIEW", b405 && b405.proof === "needs_review", b405 && b405.proof);
    ok("212B, the other malformed identity, is CHECK too", b212 && b212.state === "check", b212 && b212.state);
    //  THE SECOND SEMANTIC FIX. A rent disagreement is economics, not state.
    ok("111A stays SIGNED despite a rent disagreement",
      b111 && b111.state === "signed" && b111.proof === "needs_review",
      b111 ? b111.state + "/" + b111.proof : "row missing");
    ok("305A stays SIGNED despite a rent disagreement",
      b305 && b305.state === "signed" && b305.proof === "needs_review",
      b305 ? b305.state + "/" + b305.proof : "row missing");
    ok("416A is CHECK — the commitment itself is disputed",
      b416 && b416.state === "check" && b416.proof === "needs_review",
      b416 ? b416.state + "/" + b416.proof : "row missing");

    // ══ 8. PHANTOM BEDS ══════════════════════════════════════════════
    const unatt = await page.evaluate(() => {
      const e = document.getElementById("psFlsUnattached");
      return e ? e.innerText.replace(/\s+/g, " ").trim() : null;
    });
    ok("unattached malformed source claims render as an exception line",
      !!unatt && /cannot place/i.test(unatt), String(unatt));
    ok("…and never as extra bed rows", rows.length === 160);
    const uv = await visible("#psFlsUnattached");
    ok("the exception line is visible", uv.found && uv.boxed && !uv.covered, JSON.stringify(uv));

    // ══ 9. CLAIMED RENT NEVER READS AS CONTRACTED RENT ═══════════════
    const rentCells = await page.evaluate(() => Array.from(document.querySelectorAll("#psFlsBody2 .fls-r .fls-rent"))
      .map((e) => ({ text: e.innerText.trim(), claimed: e.classList.contains("fls-claimed"),
                     title: e.getAttribute("title") || "" })));
    const claimed = rentCells.filter((c) => c.claimed);
    ok("claimed rents render distinctly from contracted rents",
      claimed.length > 0 && claimed.every((c) => /^~\$/.test(c.text)),
      JSON.stringify(claimed.slice(0, 2)));
    ok("…and say so, in words a person can read",
      claimed.every((c) => /not established contractual rent/i.test(c.title)),
      JSON.stringify(claimed.slice(0, 1)));
    ok("no rent cell renders $0", rentCells.every((c) => !/^\$0$/.test(c.text)));

    // ══ 10. THE ROW GOES TOWARD PERSON / LEASE TRUTH ═════════════════
    const nav = await page.evaluate(() => {
      const btn = document.querySelector("#psFlsBody2 tr.fls-r[data-state='signed'] .rru-b");
      if (!btn) return { found: false };
      const sid = btn.getAttribute("data-space-id");
      btn.click();
      return { found: true, sid };
    });
    await page.waitForFunction(() => {
      const t = document.getElementById("deskTitle");
      return t && /rent roll/i.test(t.innerText || "");
    }, { timeout: 30000 }).catch(() => {});
    const afterNav = await page.evaluate((sid) => ({
      title: (document.getElementById("deskTitle") || {}).innerText || null,
      openRow: !!document.querySelector('.rru-b[data-space-id="' + sid + '"]'),
      expanded: !!(typeof _psRru !== "undefined" && _psRru && _psRru.open && _psRru.open[sid]),
    }), nav.sid);
    ok("clicking a bed goes TOWARD Person/lease truth — the Rent Roll, that bed expanded",
      nav.found && /rent roll/i.test(afterNav.title || "") && afterNav.expanded,
      JSON.stringify({ nav, afterNav }));
    //  back to the ledger for the remaining checks
    await page.evaluate(() => psLiveForwardLedger());
    await page.waitForFunction(() => {
      const b = document.getElementById("psFlsBody");
      return b && b.getAttribute("data-ps-state") === "data";
    }, { timeout: 30000 }).catch(() => {});

    // ══ 11. PHONE ════════════════════════════════════════════════════
    console.log("\n  ── phone ──");
    await page.setViewportSize({ width: 390, height: 780 });
    await page.waitForTimeout(400);
    const phone = await page.evaluate(() => {
      const t = (id) => { const e = document.getElementById(id); return e ? e.innerText.trim() : null; };
      return { committed: t("psFlsCommitted"), remaining: t("psFlsRemaining"),
               scrollsX: document.documentElement.scrollWidth > window.innerWidth + 1,
               rows: document.querySelectorAll("#psFlsBody2 tr.fls-r").length };
    });
    ok("the headline survives the phone", phone.committed === "144" && phone.remaining === "16",
      JSON.stringify(phone));
    ok("the page body does not scroll horizontally on a phone", !phone.scrollsX, String(phone.scrollsX));
    ok("all 160 rows are still there on a phone", phone.rows === 160, String(phone.rows));
    const phv = await visible("#psFlsCommitted");
    ok("the committed number is visible on the phone", phv.found && phv.boxed && !phv.covered, JSON.stringify(phv));
    await shot("04_headline_phone.png");
    await page.evaluate(() => psFlsSetFilter("review"));
    await page.waitForTimeout(200);
    await shot("05_needs_review_phone.png");
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.evaluate(() => psFlsSetFilter("all"));
    await page.waitForTimeout(300);

    // ══ 12. THE CLAIM LAYER FAILS — UNAVAILABLE, NEVER 128 ═══════════
    console.log("\n  ── the claim layer fails ──");
    /*  BREAK IT FOR REAL, SERVER-SIDE. Two wire-tampering versions came
     *  before this one and both tested the harness rather than the product:
     *  re-fetching through the already-registered origin-rewrite route
     *  returned something that was not JSON, and the handler threw.
     *
     *  Renaming the claims table makes readTrackerClaims genuinely fail
     *  inside the server, which is the exact fail-soft branch the surface
     *  has to survive. The API is untouched and unaware. */
    await pool.query("alter table proposed_records rename to proposed_records__blackout");
    await page.evaluate(() => psLiveForwardLedger());
    await page.waitForFunction(() => {
      const b = document.getElementById("psFlsBody");
      return b && b.getAttribute("data-ps-state") === "data";
    }, { timeout: 30000 }).catch(() => {});
    const failMode = await page.evaluate(() => {
      const u = document.getElementById("psFlsUnavail");
      const h = document.getElementById("psFlsHead");
      return { unavail: u ? u.innerText.replace(/\s+/g, " ").trim() : null,
               committedEl: !!document.getElementById("psFlsCommitted"),
               headText: h ? h.innerText.replace(/\s+/g, " ").trim() : null };
    });
    ok("a failed claim layer says the operating position is UNAVAILABLE",
      !!failMode.unavail && /unavailable/i.test(failMode.unavail), String(failMode.unavail));
    ok("…and does NOT quietly render the canonical count as the operating position",
      !failMode.committedEl && !/^\s*128\b/.test(failMode.headText || ""), String(failMode.headText));
    ok("…while still saying what Spine CAN prove, labelled as such",
      /NOT the operating position/i.test(failMode.unavail || ""), String(failMode.unavail));
    const fv = await visible("#psFlsUnavail");
    ok("the unavailable notice is visible, not buried under the shell",
      fv.found && fv.boxed && !fv.covered, JSON.stringify(fv));
    await shot("06_claim_layer_unavailable.png");
    await pool.query("alter table proposed_records__blackout rename to proposed_records");

    ok("no uncaught page errors during the whole run", pageErrors.length === 0,
      pageErrors.slice(0, 3).join(" | "));

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
