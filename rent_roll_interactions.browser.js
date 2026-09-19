#!/usr/bin/env node
/*
 * Rent Roll interaction browser proof.  It serves an unchanged complete static
 * app and intercepts every remote read with a local canonical fixture.  It
 * proves browser wiring only: no database, production session, provider, or
 * real HTTP call is permitted.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("./tests/assert_reporter.js");
const { serveStatic } = require("./tools/browser_stack.js");
const { chromium } = require("./tests/browser_runtime.js");

const TEST_ROOT = __dirname;
const APP = path.resolve(process.env.RENT_ROLL_APP_ROOT || TEST_ROOT);
const PORT = Number(process.env.RENT_ROLL_STATIC_PORT || 3356);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const API = "https://property-spine-api.onrender.com";
const OUT = path.resolve(process.env.RENT_ROLL_EVIDENCE_DIR || path.join(TEST_ROOT, "..", "..", "tmp", "rent-roll-interactions-browser-evidence"));
const NARROW_ONLY = process.env.RENT_ROLL_NARROW_ONLY === "1";
const PROPERTY = "stubbed-rent-roll-interactions";
const TOKEN = "stubbed-rent-roll-browser-session";
let server, browser, passed = 0, failed = 0;
let narrowSortSelection = null;

function must(label, condition, detail) {
  assert.ok(condition, label + (detail ? `\n${detail}` : ""));
  passed++;
  console.log(`  ok    ${label}`);
}
const json = (value) => JSON.stringify(value);
const known = (amount) => ({ state: "known", amount });
const current = (resident, amount, through, extra = {}) => ({
  resident, person_id: `person-${resident.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  lease_id: `lease-${resident.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  rent: known(amount), started: "2026-01-01", through, proof_basis: "confirmed_opening_import", ...extra,
});
const next = (resident, amount, starts) => ({
  resident, person_id: `next-${resident.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  rent: known(amount), starts, state: "locked",
});

// Seven positions / three units deliberately make global ordering observable:
// 2 must precede 10 naturally; current negative is retained source evidence but
// unavailable economics; next terms remain their own data axis.
function fixture() {
  const units = [
    { unit_id: "u-2", unit_number: "2", positions: [
      { space_id: "s-2-a", label: "A", bucket: "occupied", bucket_label: "Occupied", economics_state: "available", current: current("Ada", 1200, "2026-12-31"), next: next("Ada Next", 1325, "2027-01-01"), detail: {} },
      { space_id: "s-2-b", label: "10", bucket: "needs_review", bucket_label: "Needs review", economics_state: "unavailable", current: current("Bert", -375, "2026-10-15"), next: next("Bert Next", 900, "2026-11-01"), detail: {}, bucket_reason: "Conflicting occupancy evidence.", bucket_reason_code: "CONFLICT" },
      { space_id: "s-2-c", label: "C", bucket: "open", bucket_label: "Open", economics_state: "unavailable", current: null, next: next("Cora Next", 1100, "2026-12-01"), detail: {} },
    ] },
    { unit_id: "u-10", unit_number: "10", positions: [
      { space_id: "s-10-a", label: "B", bucket: "occupied", bucket_label: "Occupied", economics_state: "available", current: current("Dara", 850, "2026-09-30"), next: next("Dara Next", 1400, "2026-10-15"), detail: {} },
      { space_id: "s-10-b", label: "A", bucket: "activation_pending", bucket_label: "Pending activation", economics_state: "unavailable", current: null, next: null, detail: {} },
    ] },
    { unit_id: "u-mixed", unit_number: "Mixed", positions: [
      { space_id: "s-m-a", label: "East", bucket: "open", bucket_label: "Open", economics_state: "unavailable", current: null, next: next("Mira", 1000, "2026-10-20"), detail: {} },
      { space_id: "s-m-b", label: "2", bucket: null, bucket_label: null, economics_state: "unavailable", current: null, next: null, detail: {}, bucket_reason: "No occupancy basis.", bucket_reason_code: "NO_BASIS" },
    ] },
  ];
  return {
    property_id: PROPERTY, as_of: "2026-09-13", units,
    totals: { units: 3, rentable_positions: 7, occupied: 2, activation_pending: 1, open: 2, needs_review: 1, not_established: 1, rent_not_in_source: 0, confirmed_rows_not_attached: 0, held_rows_not_attached: 0 },
    unattached_source_rows: [], unattached_source_rows_truncated: false,
    opening_truth: { latest_confirmed_source: { source_file: "stubbed canonical interaction fixture", source_as_of_date: "2026-09-13", confidence: "confirmed" } },
  };
}
const ROLL = fixture();
const ROLL_BYTES = json(ROLL);
const IDS = { knownCurrent: ["s-10-a", "s-2-a"], unavailableCurrent: ["s-2-b", "s-2-c", "s-10-b", "s-m-a", "s-m-b"], nextAsc: ["s-2-b", "s-m-a", "s-2-c", "s-2-a", "s-10-a"], dateAsc: ["s-10-a", "s-2-b", "s-2-a"] };

async function route(page, reads, payloads) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === ORIGIN) return route.continue();
    if (url.origin !== API) {
      if (url.hostname === "fonts.googleapis.com") return route.fulfill({ status: 200, contentType: "text/css", body: "" });
      return route.abort("blockedbyclient");
    }
    const pathName = url.pathname;
    reads.push(`${route.request().method()} ${pathName}${url.search}`);
    if (pathName === "/operator/me") return route.fulfill({ status: 200, contentType: "application/json", body: json({ id: "stubbed-user", property_id: PROPERTY, name: "Stubbed operator", role: "property_manager" }) });
    if (pathName === "/operator/properties") return route.fulfill({ status: 200, contentType: "application/json", body: json({ active_property_id: PROPERTY, properties: [{ property_id: PROPERTY, property_name: "Stubbed Rent Roll" }] }) });
    if (pathName === "/operator/rent-roll/units") {
      payloads.push(ROLL_BYTES);
      return route.fulfill({ status: 200, contentType: "application/json", body: ROLL_BYTES });
    }
    if (pathName === "/operator/rent-roll/institutional") {
      return route.fulfill({ status: 200, contentType: "application/json", body: json({
        report: { property_name: "Stubbed Rent Roll", as_of: "2026-09-13", generated_at: "2026-09-13T12:00:00.000Z" },
        columns: [], rows: [], totals: {}, reconciliation: { statements: [] },
      }) });
    }
    if (/\/operator\/obligations/.test(pathName)) return route.fulfill({ status: 200, contentType: "application/json", body: json({ items: [], obligations: [] }) });
    // Remote requests are fail-closed. There is no permissive fixture fallback.
    return route.abort("blockedbyclient");
  });
}

async function signedPage(viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(({ token, property }) => {
    localStorage.setItem("ps_api_base", "https://property-spine-api.onrender.com");
    sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: token, m: { user_id: "stubbed-user", property_id: property } }));
  }, { token: TOKEN, property: PROPERTY });
  const page = await context.newPage(), reads = [], payloads = [];
  await route(page, reads, payloads);
  return { context, page, reads, payloads };
}

async function openRentRoll(page) {
  await page.goto(`${ORIGIN}/index.html`, { waitUntil: "domcontentloaded" });
  await page.locator(`[data-live-property-id="${PROPERTY}"]`).click();
  await page.locator('.desk-card[onclick="openDesk(\'management\')"]').click();
  await page.locator('.mg-door[data-ps-source="live"][data-ps-state="ready"]').waitFor({ state: "visible", timeout: 30000 });
  await page.locator('.mg-door[data-ps-source="live"]').click();
  await page.locator("#psRruBody[data-ps-state='data']").waitFor({ state: "visible", timeout: 30000 });
}
function rows(page) { return page.locator("tr[data-space-id]"); }
async function rowIds(page) { return rows(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-space-id"))); }
function sort(page, key) { return page.locator(`button.rru-sort[data-sort-key="${key}"]`); }
async function ariaSort(page, key) { return sort(page, key).evaluate((button) => button.closest("th")?.getAttribute("aria-sort") || "none"); }
function knownFirst(ids) { return ids.slice(0, IDS.knownCurrent.length).sort().join("|") === IDS.knownCurrent.slice().sort().join("|") && ids.slice(IDS.knownCurrent.length).every((id) => IDS.unavailableCurrent.includes(id)); }

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  server = await serveStatic(APP, PORT);
  browser = await chromium.launch({ headless: true, args: ["--disable-background-networking", "--disable-component-update"] });
  if (!NARROW_ONLY) {
  const desktop = await signedPage({ width: 1440, height: 1000 });
  try {
    await openRentRoll(desktop.page);
    must("full signed-in Rent Roll uses the seven-position canonical fixture", (await rows(desktop.page).count()) === 7 && /7 positions/.test(await desktop.page.locator("#psRruBody").innerText()));
    must("sortable header controls expose stable keys and initial aria-sort", await Promise.all(["unit", "current_rent", "current_end", "next_rent", "next_start"].map(async (key) => (await sort(desktop.page, key).count()) === 1 && (await ariaSort(desktop.page, key)) === "none")).then((all) => all.every(Boolean)));

    const unit = sort(desktop.page, "unit");
    await unit.focus(); must("Unit sort header receives keyboard focus", await desktop.page.evaluate(() => document.activeElement?.matches("button.rru-sort[data-sort-key='unit']")));
    await desktop.page.keyboard.press("Enter");
    const unitsAscending = await rows(desktop.page).evaluateAll((els) => els.map((el) => ({ id: el.dataset.spaceId, unit: el.dataset.unitId })));
    must("keyboard Unit ascending uses natural numeric order: unit 2 before unit 10", unitsAscending.findIndex((x) => x.unit === "u-2") < unitsAscending.findIndex((x) => x.unit === "u-10"), json(unitsAscending));
    must("Unit header exposes ascending aria-sort after Enter", (await ariaSort(desktop.page, "unit")) === "ascending");
    await desktop.page.keyboard.press(" ");
    must("Unit header exposes descending aria-sort after Space", (await ariaSort(desktop.page, "unit")) === "descending");

    await sort(desktop.page, "current_rent").click();
    const currentAscending = await rowIds(desktop.page);
    must("Current rent ascending puts known positive economics first and unavailable/no-lease rows at the bottom", knownFirst(currentAscending) && currentAscending[0] === "s-10-a" && currentAscending[1] === "s-2-a", currentAscending.join("|"));
    must("negative retained current rent displays unavailable rather than a false dollar value", /Unavailable/.test(await desktop.page.locator('tr[data-space-id="s-2-b"]').innerText()) && !/-\$375|\$-375/.test(await desktop.page.locator('tr[data-space-id="s-2-b"]').innerText()));
    await sort(desktop.page, "current_rent").click();
    const currentDescending = await rowIds(desktop.page);
    must("Current rent descending reverses known positive economics while unavailable/no-lease rows remain at the bottom", knownFirst(currentDescending) && currentDescending[0] === "s-2-a" && currentDescending[1] === "s-10-a", currentDescending.join("|"));

    await sort(desktop.page, "next_rent").click();
    const nextAscending = await rowIds(desktop.page);
    must("Next-rent sorting is independent from Current rent and orders only populated next terms", nextAscending.slice(0, IDS.nextAsc.length).join("|") === IDS.nextAsc.join("|") && nextAscending.slice(0, 2).join("|") !== currentDescending.slice(0, 2).join("|"), nextAscending.join("|"));
    await sort(desktop.page, "current_end").click();
    const endAscending = await rowIds(desktop.page);
    must("Current end-date sorting uses chronological order independent from rent", endAscending.slice(0, IDS.dateAsc.length).join("|") === IDS.dateAsc.join("|"), endAscending.join("|"));

    const expanded = desktop.page.locator('.rru-b[data-space-id="s-2-a"]');
    await expanded.click();
    must("a row disclosure opens before reordering", await expanded.getAttribute("aria-expanded") === "true" && (await desktop.page.locator("#rru-x-s-2-a").count()) === 1);
    await sort(desktop.page, "status").click();
    must("expanded row identity survives reordering by durable space id", await desktop.page.locator('.rru-b[data-space-id="s-2-a"]').getAttribute("aria-expanded") === "true" && (await desktop.page.locator("#rru-x-s-2-a").count()) === 1);

    const openFilter = desktop.page.locator('.rru-f button[data-k="open"]');
    await openFilter.click();
    const openState = { pressed: await openFilter.getAttribute("aria-pressed"), rows: await rows(desktop.page).count(), count: await desktop.page.locator("#psRruCount").innerText() };
    must("Open filter reports active aria-pressed and the canonical count", openState.pressed === "true" && openState.rows === 2 && /2 of 7 positions/i.test(openState.count), json(openState));
    const search = desktop.page.locator("#psRruQ"); await search.fill("Mira");
    await desktop.page.waitForFunction(() => document.querySelectorAll("tr[data-space-id]").length === 1);
    must("search and active filter combine rather than replacing one another", (await rowIds(desktop.page)).join("|") === "s-m-a" && /1 of 7 positions/i.test(await desktop.page.locator("#psRruCount").innerText()));

    const asOf = await desktop.page.locator("#psRruDate").inputValue();
    const reset = desktop.page.locator("button#psRruReset");
    must("Reset view is an accessible explicit control", (await reset.count()) === 1 && /^reset view$/i.test((await reset.innerText()).trim()));
    await reset.click();
    must("Reset view clears search/filter/sort without changing as-of date", (await desktop.page.locator("#psRruDate").inputValue()) === asOf && (await search.inputValue()) === "" && (await desktop.page.locator('.rru-f button[data-k="all"]').getAttribute("aria-pressed")) === "true" && (await ariaSort(desktop.page, "current_rent")) === "none");
    must("interaction controls do not mutate or reread the canonical fixture", desktop.payloads.length === 2 && desktop.payloads.every((payload) => payload === ROLL_BYTES) && !desktop.reads.some((read) => /management-dashboard|rent-roll\/canonical|rent-roll\/institutional/.test(read)), desktop.reads.join("\n"));
    await desktop.page.locator("#psRruBody").screenshot({ path: path.join(OUT, "rent-roll-interactions-desktop.png") });
    const printExport = desktop.page.locator("button#psRruPrintExport");
    must("main Rent Roll names one Print / Export action owned by the institutional surface", (await printExport.count()) === 1 && /Print|Export/i.test(await printExport.innerText()));
    const institutionalRequest = desktop.page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.origin === API && url.pathname === "/operator/rent-roll/institutional";
    });
    await printExport.click();
    await institutionalRequest;
    must("Print / Export carries the selected as-of date into the institutional read", desktop.reads.some((read) => /\/operator\/rent-roll\/institutional\?/.test(read) && /as_of=2026-09-13/.test(read)), desktop.reads.join("\n"));
  } finally { await desktop.context.close(); }
  }

  const narrow = await signedPage({ width: 402, height: 844 });
  try {
    await openRentRoll(narrow.page);
    const mobileSort = narrow.page.locator("select#psRruSort");
    const mobileDirection = narrow.page.locator("button#psRruSortDirection");
    must("402px Rent Roll exposes a compact Sort by control and disabled direction before a field is chosen", (await mobileSort.count()) === 1 && (await mobileDirection.count()) === 1 && await mobileDirection.isDisabled());
    await mobileSort.selectOption("current_rent");
    const mobileSelection = await narrow.page.evaluate(() => {
      const el = document.getElementById("psRruSort"), option = el && el.selectedOptions[0], style = el && getComputedStyle(el), rect = el && el.getBoundingClientRect();
      const optionStyle = option && getComputedStyle(option);
      return { value: el && el.value, label: option && option.textContent, color: style && style.color,
        webkit_text_fill_color: style && style.webkitTextFillColor, appearance: style && (style.appearance || style.webkitAppearance),
        font: style && style.font, line_height: style && style.lineHeight, padding_left: style && style.paddingLeft,
        padding_right: style && style.paddingRight, padding_top: style && style.paddingTop, padding_bottom: style && style.paddingBottom,
        box_sizing: style && style.boxSizing, opacity: style && style.opacity, option_display: optionStyle && optionStyle.display,
        option_color: optionStyle && optionStyle.color, width: rect && Math.round(rect.width), height: rect && Math.round(rect.height),
        scrollWidth: el && el.scrollWidth, clientWidth: el && el.clientWidth, client_height: el && el.clientHeight,
        content_height: el && Math.round(el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) };
    });
    narrowSortSelection = mobileSelection;
    must("compact Sort by retains the selected Current rent label with positive paintable content height", mobileSelection.value === "current_rent" && /current rent/i.test(mobileSelection.label || "") && mobileSelection.width > 0 && mobileSelection.clientWidth > 0 && mobileSelection.content_height >= 16, json(mobileSelection));
    const narrowCurrentAscending = await rowIds(narrow.page);
    must("compact Sort by Current rent orders known positive economics first without using an off-screen header", knownFirst(narrowCurrentAscending) && narrowCurrentAscending[0] === "s-10-a" && narrowCurrentAscending[1] === "s-2-a", narrowCurrentAscending.join("|"));
    await mobileDirection.click();
    const narrowCurrentDescending = await rowIds(narrow.page);
    must("compact sort direction shares the same state and keeps unavailable/no-lease rows at the bottom", knownFirst(narrowCurrentDescending) && narrowCurrentDescending[0] === "s-2-a" && narrowCurrentDescending[1] === "s-10-a" && /Descending/.test(await mobileDirection.innerText()), narrowCurrentDescending.join("|"));
    const layout = await narrow.page.evaluate(() => {
      const wrap = document.querySelector(".rru-wrap"), table = document.querySelector(".rru-t"), header = document.querySelector(".rru-t thead");
      if (!wrap || !table || !header) return null;
      wrap.scrollTop = 120;
      const wr = wrap.getBoundingClientRect(), hr = header.getBoundingClientRect();
      const first = document.querySelector("tr[data-space-id]")?.getBoundingClientRect();
      return { documentWidth: document.documentElement.scrollWidth, viewport: innerWidth, wrapWidth: wrap.clientWidth, tableWidth: table.scrollWidth, headerPosition: getComputedStyle(header.querySelector("th")).position, wrapTop: Math.round(wr.top), headerTop: Math.round(hr.top), firstTop: first ? Math.round(first.top) : null };
    });
    must("narrow Rent Roll stays usable without page horizontal overflow", !!layout && layout.documentWidth <= layout.viewport && layout.wrapWidth > 0 && layout.tableWidth >= layout.wrapWidth, json(layout));
    must("narrow Rent Roll header is sticky and does not overlap its first body row", !!layout && layout.headerPosition === "sticky" && layout.headerTop >= layout.wrapTop - 1 && (layout.firstTop == null || layout.firstTop >= layout.headerTop), json(layout));
    await narrow.page.locator("#psRruBody").screenshot({ path: path.join(OUT, "rent-roll-interactions-narrow.png") });
  } finally { await narrow.context.close(); }
})().catch((error) => { failed++; console.error("  ERROR", error.stack || error.message); }).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  const receipt = { app_root: APP, fixture: "stubbed local canonical API fixture; all non-static remote requests fail closed", positions: 7, units: 3, as_of: ROLL.as_of, source_payload_sha256: require("node:crypto").createHash("sha256").update(ROLL_BYTES).digest("hex"), expected_controls: { sort: "button.rru-sort[data-sort-key]", filters: ".rru-f button[data-k]", reset: "button#psRruReset", row: "tr[data-space-id][data-unit-id]" }, narrow_sort_selection: narrowSortSelection, passed, failed };
  fs.writeFileSync(path.join(OUT, "receipt.json"), json(receipt));
  console.log(`rent roll interactions browser: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
});




