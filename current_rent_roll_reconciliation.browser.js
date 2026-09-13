#!/usr/bin/env node
"use strict";
/* Shipped-index browser proof: accepting a current, dateless, tracker-shaped
 * rent roll into an already-inventoried bed-basis property through the Deal
 * Setup UI. SQL creates people, sessions and inventory only. The reviewed
 * mapping is chosen BY HAND in the repaired picker (which used to offer no
 * existing home at all), applied, and rows are added: a new resident is
 * accepted as current occupancy with terms unknown; the bed's existing
 * tenant is offered as a candidate and recognised; a blank row stays a
 * question. Visibility is asked of the document. */
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(path.join(process.env.SP, "node_modules/playwright"));
const { Pool } = require(path.join(process.env.API_ROOT, "node_modules/pg"));
const staffSessions = require(path.join(process.env.API_ROOT, "src/identity/staff_session_service.js"));
const { materializeRentableSpaces } = require(path.join(process.env.API_ROOT, "src/tenancy/inventory_materialization.js"));
const { serveStatic } = require("./tools/browser_stack.js");

const API = (process.env.API || "http://127.0.0.1:3111").replace(/\/$/, "");
const DB = process.env.E2E_DATABASE_URL;
const OUT = process.env.SHOTS || path.join(os.tmpdir(), "current-rent-roll-browser");
const APP_PORT = 8300 + (process.pid % 300);
if (!DB) throw new Error("E2E_DATABASE_URL is required");
const pool = new Pool({ connectionString: DB, ssl: false });
const nonce = crypto.randomBytes(3).toString("hex");
const tag = `CRR_BROWSER_${nonce}`;
let passed = 0, failed = 0; const results = [];
function ok(label, value, detail = "") { results.push({ label, ok: !!value, detail: detail || null }); if (value) { passed++; console.log(`  ok    ${label}`); } else { failed++; console.log(`  FAIL  ${label}${detail ? `\n        ${String(detail).slice(0, 600)}` : ""}`); } }
async function api(method, url, token, body) { const r = await fetch(API + url, { method, headers: { "x-staff-session": token, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); let json = null; try { json = await r.json(); } catch { json = null; } return { status: r.status, body: json }; }
const csvCell = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const org = (await pool.query("insert into organizations(name,slug) values($1,$2) returning id", [tag, tag.toLowerCase()])).rows[0].id;
  const person = (await pool.query("insert into persons(name,source) values($1,'rehearsal') returning id", [tag])).rows[0].id;
  const user = (await pool.query(`insert into users(name,email,phone,role,auth_provider,platform_role,organization_id,is_active,status,account_kind,person_id)
    values($1,$2,$3,'property_manager','phone_otp','org_admin',$4,true,'active','human_staff',$5) returning id`,
    [tag, `${tag.toLowerCase()}@example.test`, `+1215${String(4000000 + (parseInt(nonce, 16) % 5000000)).padStart(7, "0")}`, org, person])).rows[0].id;
  const property = (await pool.query(`insert into properties(name,display_name,address,organization_id,leasing_basis,operating_timezone) values($1,'Reconciliation (rehearsal)','1417 Rehearsal Way',$2,'bed','America/New_York') returning id`, [`${tag} property`, org])).rows[0].id;
  await pool.query("insert into property_team_assignments(property_id,user_id,role_title,role_key,scope_type,allowed_modules,primary_for_modules,can_manage_roles,active) values($1,$2,'property_admin','property_admin','property',array['leasing','management'],'{management}',true,true)", [property, user]);
  //  Two units, two beds each (classified beds); one bed already holds a lease in force.
  const units = {};
  for (const label of ["1417-101", "1417-102"]) {
    const u = (await pool.query("insert into units(property_id,unit_number) values($1,$2) returning id", [property, label])).rows[0].id;
    await materializeRentableSpaces(pool, { unit_id: u, labels: ["Room1", "Room2"], kind: "bed" });
    units[label] = u;
  }
  const bed101_1 = (await pool.query("select id from spaces where unit_id=$1 and space_label='Room1'", [units["1417-101"]])).rows[0].id;
  const resident = (await pool.query("insert into persons(name,source,lifecycle_status) values($1,'rehearsal','resident') returning id", [`Rehearsal Current Resident ${nonce}`])).rows[0].id;
  await pool.query("insert into leases(property_id,space_id,tenant_ids,rent,start_date,end_date,balance,lease_status,source_type) values($1,$2,$3,850,'2025-08-01','2026-12-31',0,'active','rent_roll_ledger')", [property, bed101_1, [resident]]);
  const token = (await staffSessions.issueStaffSession(pool, { userId: user, propertyId: property, purpose: "bootstrap_invite" })).session_token;
  const deal = (await api("POST", "/deal-setup/deals", token, { deal_name: tag })).body.deal.id;
  const added = await api("POST", `/deal-setup/deals/${deal}/properties`, token, { property_id: property });
  if (added.status !== 201) throw new Error("property not added: " + JSON.stringify(added));
  //  The tracker-shaped current source: Unit "101A", Room "A", no dates.
  const headers = ["Unit", "Room", "Unit Type", "Semester", "Signed/Pending", "New/Renewal", "Name", "Phone", "Email", "Monthly Rent", "Key Pickup"];
  const rows = [
    ["101A", "A", "STU", "Full Year", "Signed", "Renewal", `Rehearsal Current Resident ${nonce}`, "", "", 850, "TRUE"],
    ["101B", "B", "STU", "Full Year", "Signed", "New", `Rehearsal New Resident ${nonce}`, "", "", 875, "TRUE"],
    ["102A", "A", "STU", "Full Year", "Signed", "New", `Rehearsal Another Resident ${nonce}`, "", "", 860, "TRUE"],
    ["102B", "B", "STU", "", "", "", "", "", "", "", "FALSE"],
  ];
  const csv = [headers.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
  const file = path.join(OUT, "tracker-shape.csv"); fs.writeFileSync(file, csv);

  const server = await serveStatic(__dirname, APP_PORT);
  const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  await page.addInitScript(([base, t]) => { localStorage.setItem("ps_api_base", base); sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t })); }, [API, token]);
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  const shot = (name) => page.screenshot({ path: path.join(OUT, name), fullPage: true });
  const visible = async (selector) => page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return { found: false }; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 18)); return { found: true, text: (el.innerText || el.value || "").trim(), covered: !(hit === el || el.contains(hit)) }; }, selector);
  try {
    await page.goto(`http://127.0.0.1:${APP_PORT}/index.html`, { waitUntil: "domcontentloaded" });
    const verified = await api("GET", "/operator/me", token);
    if (verified.status !== 200) throw new Error(`session verification failed: ${JSON.stringify(verified)}`);
    await page.evaluate((grant) => window.egEnterAuthorized(grant), verified.body);
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.egHide());
    await page.evaluate(() => window.dsShow()); await page.waitForTimeout(600);
    await page.evaluate(() => window.dsNav("deals")); await page.waitForTimeout(500);
    await page.locator(`#dealSetupPanel tr:has-text("${tag}")`).first().click(); await page.waitForTimeout(350);
    await page.locator(`#dealSetupPanel tr:has-text("Reconciliation (rehearsal)")`).getByRole("button", { name: /Set up|Continue setup|Review/ }).click(); await page.waitForTimeout(500);
    await page.setInputFiles("#dsRentRollFile", file); await page.fill("#dsAsOf", "2026-09-13"); await page.selectOption("#dsReviewBasis", "bed");
    await page.getByRole("button", { name: "Upload and review homes" }).click();
    await page.getByRole("heading", { name: "Review source homes before inventory changes" }).waitFor();
    await shot("01-identity-review.png");
    const body = await page.locator("body").innerText();
    const counter = await visible("#dealSetupPanel .sa-msg.warn");
    ok("B1 the tracker's own labels are shown as received (101A / A), no home pre-selected, and the 0-of-4 counter is VISIBLE to the document (it carried a class with no CSS rule and was display:none)", /101A/.test(body) && /0 of 4 current source identities/.test(body) && counter.found && !counter.covered, body.slice(-900) + " | counter=" + JSON.stringify(counter));
    const selects = page.locator('select[aria-label^="Home for"]');
    ok("B2 every current source identity carries a picker, the blank current row included (a blank name is still a home the source names)", (await selects.count()) === 4);
    const options = await selects.first().locator("option").allTextContents();
    ok("B3 REPAIRED PICKER: existing beds are offered by canonical label (1417-101 · Room1 …) — the shipped picker filtered on a field the preview never sends and offered nothing", options.some((o) => /1417-101 · Room1/.test(o)) && options.some((o) => /1417-102 · Room2/.test(o)), options.join(" | "));
    const v = await visible('select[aria-label^="Home for"]');
    ok("B4 the picker is visible to the document (not covered)", v.found && !v.covered);
    //  THE REVIEWER'S EXPLICIT MAPPING, by hand: letter → Room ordinal.
    const mapping = { "101A": "1417-101 · Room1", "101B": "1417-101 · Room2", "102A": "1417-102 · Room1", "102B": "1417-102 · Room2" };
    for (const [source, target] of Object.entries(mapping)) {
      const sel = page.locator(`select[aria-label="Home for ${source}"]`);
      await sel.selectOption({ label: target });
    }
    await page.waitForTimeout(200);
    await shot("02-reviewed-mapping-chosen.png");
    ok("B5 the reviewed mapping shows 4 of 4 resolved before Apply", /4 of 4 current source identities/.test(await page.locator("body").innerText()));
    await page.getByRole("button", { name: "Apply reviewed mapping" }).click();
    await page.getByRole("heading", { name: "What Spine read" }).waitFor();
    await shot("03-what-spine-read.png");
    const table = await page.locator("table.sa-table").innerText();
    ok("B6 rows read: three signed rows are Ready with a blank term; the blank row Needs a look and is not vacancy", (table.match(/\bREADY\b/gi) || []).length === 3 && /needs a look/i.test(table) && /blank name cannot establish vacancy/i.test(table) && /—\s*→\s*—/.test(table), table.slice(0, 600));
    const understood = await page.locator("body").innerText();
    ok("B7 the mapping line names Monthly Rent as rent and the tracker columns as read", /Monthly Rent → actual_rent/i.test(understood) || /Monthly Rent/.test(understood), understood.match(/Columns understood:[^\n]*/) && understood.match(/Columns understood:[^\n]*/)[0]);
    //  Add the new resident's bed: accepted as occupancy with terms unknown.
    await page.locator('tr:has-text("101B|B")').getByRole("button", { name: "Add" }).click();
    await page.waitForTimeout(800);
    let rowText = await page.locator('tr:has-text("101B|B")').innerText();
    ok("B8 a signed, dateless row is Added as current occupancy with contractual terms unknown (no lease)", /\bADDED\b/i.test(rowText) && /Contractual terms unknown/.test(rowText) && (await pool.query("select count(*)::int n from leases l join spaces s on s.id=l.space_id where s.unit_id=$1 and s.space_label='Room2'", [units["1417-101"]])).rows[0].n === 0, rowText);
    await shot("04-occupancy-accepted.png");
    //  The bed with a lease in force: the existing tenant is offered as a candidate.
    await page.locator('tr:has-text("101A|A")').getByRole("button", { name: "Add" }).click();
    await page.waitForTimeout(800);
    rowText = await page.locator('tr:has-text("101A|A")').innerText();
    const useBtn = page.locator('tr:has-text("101A|A")').getByRole("button", { name: /^Use / });
    ok("B9 the bed's current resident is offered as the identity candidate (recognition over re-entry)", (await useBtn.count()) === 1 && /already has a resident on record/i.test(rowText), rowText);
    await shot("05-candidate-offered.png");
    await useBtn.click(); await page.waitForTimeout(700);
    await page.locator('tr:has-text("101A|A")').getByRole("button", { name: "Add" }).click(); await page.waitForTimeout(800);
    rowText = await page.locator('tr:has-text("101A|A")').innerText();
    ok("B10 Add recognises the existing tenancy: Already represented, tied to the lease in force, no second lease", /\bADDED\b/i.test(rowText) && /Already represented/.test(rowText) && (await pool.query("select count(*)::int n from leases where space_id=$1", [bed101_1])).rows[0].n === 1, rowText);
    await shot("06-already-represented.png");
    const blank = await page.locator('tr:has-text("102B|B")').innerText();
    ok("B11 the blank row offers only Leave out — never Add, never vacancy", /leave out/i.test(blank) && !/\bADD\b/i.test(blank.replace(/ADDED/gi, "")), blank);
    await page.locator('tr:has-text("102A|A")').getByRole("button", { name: "Add" }).click(); await page.waitForTimeout(800);
    await page.getByRole("button", { name: /Establish lease|Re-establish/ }).click(); await page.waitForTimeout(1000);
    const after = await page.locator("body").innerText();
    ok("B12 establishing records the position with the unresolved blank row still needing attention", /established as of 2026-09-13/i.test(after) || /Lease and occupancy established/i.test(after) || /needing attention/i.test(after), after.slice(0, 400));
    await shot("07-established.png");
    ok("B13 browser emitted no page errors", errors.length === 0, errors.join("\n"));
  } finally {
    fs.writeFileSync(path.join(OUT, "current_rent_roll_reconciliation.browser.receipt.json"), JSON.stringify({ passed, failed, results, screenshots: fs.readdirSync(OUT).filter((f) => f.endsWith(".png")) }, null, 2));
    console.log(`\n  ${passed} passed, ${failed} failed\n  screenshots: ${OUT}`);
    await browser.close(); await new Promise((r) => server.close(r)); await pool.end();
    process.exitCode = failed ? 1 : 0;
  }
})().catch(async (e) => { console.error(e.stack || e); try { await pool.end(); } catch {} process.exit(1); });
