/*
 * management_inventory_live.test.js — Management's live inventory seam.
 *
 * This is an emitted-output VM proof. It extracts the actual Management
 * loader/renderer functions from index.html and supplies only deterministic
 * DOM, session and live-resource stubs. It does not start HTTP, a browser,
 * a database, or a product branch.
 *
 * Run: node management_inventory_live.test.js
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

function extract(name) {
  const plain = html.indexOf(`function ${name}(`);
  const asyncStart = html.indexOf(`async function ${name}(`);
  const start = asyncStart >= 0 && (plain < 0 || asyncStart < plain) ? asyncStart : plain;
  if (start < 0) throw new Error(`function not found in index.html: ${name}`);
  const open = html.indexOf("{", start);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  return html.slice(start, i);
}

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

function element() {
  return {
    innerHTML: "",
    classList: { add() {}, remove() {}, toggle() {} },
    remove() { this.removed = true; },
    setAttribute() {},
  };
}

function canonical(propertyId, totals, asOf = "2026-09-13") {
  return {
    property_id: propertyId,
    as_of: asOf,
    units: Array.from({ length: totals.units }, (_, i) => ({
      unit_id: `unit-${i + 1}`, unit_number: String(i + 1), positions: [],
    })),
    totals: { ...totals },
    opening_truth: {
      latest_confirmed_source: {
        source_file: "canonical-property-ledger.csv",
        source_as_of_date: "2026-07-31",
      },
    },
  };
}

function makeHarness() {
  const state = {
    property: "property-live",
    session: { user_id: "operator-live", property_id: "property-live" },
    today: "2026-09-13",
    calls: [],
    plan: { operatorObligations: () => ({ items: [] }) },
  };
  const els = Object.fromEntries([
    "metrics", "focusSection", "leasingWarningPanel", "intelStrip",
  ].map((id) => [id, element()]));

  const context = vm.createContext({
    console,
    esc,
    state,
    elements: els,
    data: { management: null, obligations: [], rentRoll: null },
    window: {
      __subReturn: null,
      __psLive: {
        hasSession: () => true,
        sessionMeta: () => state.session,
        loadResource: (name, params) => {
          state.calls.push({ name, params });
          const result = state.plan[name];
          if (typeof result !== "function") return Promise.reject(new Error(`unexpected resource ${name}`));
          const value = result(params);
          return Promise.resolve(value).then((d) => ({ data: d }));
        },
      },
    },
    document: {
      body: { classList: { add() {}, remove() {}, toggle() {} } },
      querySelector(selector) { return selector === ".lanes" ? els.lanes : null; },
    },
    $: (id) => els[id] || (els[id] = element()),
    prop: () => state.property,
    activeDesk: "management",
    _rrSignedIn: () => true,
    psRruToday: () => state.today,
    loadObligationsGuarded: async () => [],
    obligationsFailed: () => false,
    normalizeLeasingPayload: (v) => v,
    leasingPayloadOrHonestBlank: (v) => v || {},
    psApplyModuleIdentity: () => {},
    managementCollectionLoss: (mgmt) => mgmt && mgmt.__legacy ? "$62303" : "—",
    managementCollectionRows: () => [],
    typeText: () => "",
    _rrTruthDoc: () => null,
    managementMiniRow: () => "",
    moneyWhole: () => "—",
    dailySection: (title, rows) => `<section>${esc(title)}${esc(rows || "")}</section>`,
    managementLeaf: (title, sub, body) => { els.intelStrip.innerHTML = `<h2>${esc(title)}</h2>${body || ""}`; },
    maintNum: (n) => n == null || n === "" ? "—" : String(n),
    maintTinyStat: (label, value) => `<div class="maint-tiny"><b>${esc(value == null ? "—" : value)}</b><span>${esc(label)}</span></div>`,
  });
  // The renderer captures these as globals. Keep them properties so the test
  // can steer each stale-read guard without rewriting the product function.
  vm.runInContext(`
    var activeDesk = 'management';
    var lastLeasing = null;
    var _managementReadSequence = 0;
    const OBLIGATIONS_UNAVAILABLE = '__obligations_unavailable__';
    ${extract("managementReadScope")}
    ${extract("loadManagementInventory")}
    ${extract("loadManagementWork")}
    ${extract("managementConditionPanel")}
    ${extract("obligationsFailed")}
    ${extract("obligationsUnavailableHtml")}
    ${extract("renderObligationsUnavailable")}
    ${extract("deskObligationsUnavailable")}
    ${extract("renderManagement")}
    ${extract("openManagementDoor")}
    this.api = { managementReadScope, loadManagementInventory,
      loadManagementWork, managementConditionPanel, renderManagement,
      openManagementDoor, deskObligationsUnavailable,
      OBLIGATIONS_UNAVAILABLE };
  `, context);
  return { context, state, els, api: context.api };
}

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`   PASS  ${name}`);
}
async function checkAsync(name, fn) {
  await fn();
  passed++;
  console.log(`   PASS  ${name}`);
}

function liveManagementSource() {
  return {
    property: { id: "property-live", display_name: "Property Alpha" },
    // The old imported shape is deliberately wrong-grain and must never win.
    rent_roll: Array.from({ length: 251 }, (_, i) => ({ unit: `old-${i + 1}` })),
    headline: { collection_loss: { amount: 48 } },
  };
}

(async () => {
  const h = makeHarness();
  const expected = canonical("property-live", {
    units: 72, rentable_positions: 160, occupied: 31,
    activation_pending: 9, open: 100, needs_review: 20, not_established: 0,
  });
  h.state.plan.rentRollUnits = () => expected;
  h.context.data.management = liveManagementSource();

  await checkAsync("live Management uses canonical resource and date parameters", async () => {
    await h.api.renderManagement(true);
    const names = h.state.calls.map((x) => x.name);
    assert.deepEqual(names, ["operatorObligations", "rentRollUnits"]);
    assert.equal(h.state.calls[0].params.status, "open");
    assert.equal(h.state.calls[1].params.asOf, "2026-09-13");
  });

  const output = () => h.els.intelStrip.innerHTML;
  check("wrong-grain imported 251 rows do not win over canonical 160", () => {
    assert.match(output(), />160<|>160<\/div>/);
    assert.doesNotMatch(output(), /251/);
    assert.doesNotMatch(output(), /\$48/);
  });
  check("canonical four buckets are rendered exactly", () => {
    for (const [label, value] of [
      ["Occupied", 31], ["Pending activation", 9], ["Open", 100], ["Needs review", 20],
    ]) {
      assert.match(output(), new RegExp(`<span>${label}</span>`));
      assert.match(output(), new RegExp(`<b>${value}</b>`));
    }
  });
  check("live card has no legacy average, vacant remainder, or percentage", () => {
    assert.doesNotMatch(output(), /Avg rent|>Vacant</);
    assert.doesNotMatch(output(), /\d+(?:\.\d+)?%/);
    assert.match(output(), /Open does not establish vacancy or readiness/);
  });
  check("no prior values or fixture labels survive the live render", () => {
    assert.doesNotMatch(output(), /128|123|old-1|Demo\/QA|snapshot/i);
    assert.match(output(), /As of 2026-09-13/);
  });

  await checkAsync("empty canonical inventory is distinct from unavailable", async () => {
    h.els.intelStrip.innerHTML = "prior-value";
    h.state.plan.rentRollUnits = () => canonical("property-live", {
      units: 0, rentable_positions: 0, occupied: 0,
      activation_pending: 0, open: 0, needs_review: 0, not_established: 0,
    });
    const loaded = await h.api.loadManagementInventory("2026-09-13");
    assert.equal(loaded.error, null);
    await h.api.renderManagement(true);
    assert.match(output(), /No rentable positions are recorded for this property/);
    assert.doesNotMatch(output(), /Current inventory could not be read/);
    assert.match(output(), /data-ps-source="live" data-ps-state="ready"/);
  });

  await checkAsync("missing or null canonical totals are honestly unavailable", async () => {
    for (const totals of [null, { units: 72, rentable_positions: 160, occupied: null,
      activation_pending: 9, open: 100, needs_review: 20, not_established: 0 }]) {
      h.state.plan.rentRollUnits = () => ({
        ...canonical("property-live", { units: 72, rentable_positions: 160,
          occupied: 31, activation_pending: 9, open: 100, needs_review: 20, not_established: 0 }),
        totals,
      });
      const loaded = await h.api.loadManagementInventory("2026-09-13");
      assert.ok(loaded.error, "missing/null totals must be rejected by the loader");
      await h.api.renderManagement(true);
      assert.match(output(), /Current inventory could not be read/);
      assert.doesNotMatch(output(), />160<|>31<|>100<|>20</);
      assert.doesNotMatch(output(), /251|\$48/);
    }
  });

  await checkAsync("a foreign-property canonical payload is rejected", async () => {
    h.state.plan.rentRollUnits = () => canonical("property-foreign", {
      units: 72, rentable_positions: 160, occupied: 31,
      activation_pending: 9, open: 100, needs_review: 20, not_established: 0,
    });
    await h.api.renderManagement(true);
    assert.match(output(), /Current inventory could not be read/);
    assert.doesNotMatch(output(), />160<|>31<|>100<|>20</);
  });

  async function staleMutation(name, mutate) {
    const wait = deferred();
    h.els.intelStrip.innerHTML = "KEEP-OLD-OUTPUT";
    h.context.data.obligations = [{ id: "previous-work" }];
    h.state.plan.rentRollUnits = () => wait.promise;
    const pending = h.api.renderManagement(true);
    mutate();
    wait.resolve(expected);
    await pending;
    assert.equal(h.els.intelStrip.innerHTML, "KEEP-OLD-OUTPUT", name);
    assert.equal(h.context.data.obligations[0].id, "previous-work", `${name}: prior obligation cache preserved`);
    // Restore the generic live scope for the next independent stale-read case.
    h.state.property = "property-live";
    h.state.session = { user_id: "operator-live", property_id: "property-live" };
    h.context.activeDesk = "management";
    h.context.window.__subReturn = null;
  }

  await checkAsync("delayed property change is discarded", () => staleMutation(
    "property change", () => { h.state.property = "property-changed"; }));
  await checkAsync("delayed session change is discarded", () => staleMutation(
    "session change", () => { h.state.session = { user_id: "operator-other", property_id: "property-other" }; }));
  await checkAsync("delayed desk change is discarded", () => staleMutation(
    "desk change", () => { h.context.activeDesk = "maintenance"; }));
  await checkAsync("delayed subpage change is discarded", () => staleMutation(
    "subpage change", () => { h.context.window.__subReturn = "rent-roll"; }));

  await checkAsync("obligation failure uses the real unavailable marker and preserves prior cache", async () => {
    const prior = [{ id: "previous-work" }];
    h.context.data.obligations = prior;
    h.els.intelStrip.innerHTML = "old-obligation-output";
    h.state.plan.operatorObligations = () => {
      throw new Error("operator obligations unavailable");
    };
    const work = await h.api.loadManagementWork();
    assert.equal(work[h.api.OBLIGATIONS_UNAVAILABLE], true);
    await h.api.renderManagement(true);
    assert.match(output(), /Work items are unavailable/);
    assert.equal(h.context.data.obligations, prior);
    h.state.plan.operatorObligations = () => ({ items: [] });
  });

  await checkAsync("null session metadata is unavailable without a crash", async () => {
    h.state.session = null;
    h.state.plan.rentRollUnits = () => expected;
    await h.api.renderManagement(true);
    assert.match(output(), /Current inventory is unavailable/);
    assert.doesNotMatch(output(), /251|\$48|\$62303/);
    h.state.session = { user_id: "operator-live", property_id: "property-live" };
  });

  await checkAsync("leasing access denial is explicit and not an empty read", async () => {
    h.state.plan.rentRollUnits = () => { throw Object.assign(new Error("leasing access required"), { status: 403 }); };
    await h.api.renderManagement(true);
    assert.match(output(), /Leasing access is required to read this rent roll/);
    assert.doesNotMatch(output(), /No rentable positions are recorded/);
    assert.doesNotMatch(output(), /251|\$48|\$62303/);
    h.state.plan.rentRollUnits = () => expected;
  });

  await checkAsync("delinquency leaf cannot restore legacy financial or imported values", async () => {
    h.context.data.management = { __legacy: true,
      rent_roll: Array.from({ length: 251 }, () => ({})),
      headline: { collection_loss: { amount: 62303 }, avg_rent: 48 } };
    h.state.plan.operatorObligations = () => ({ items: [] });
    h.els.intelStrip.innerHTML = "before-delinquency";
    h.api.openManagementDoor("delinquency");
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.match(output(), /Delinquency &amp; Evictions|Delinquency &amp; Evictions/);
    assert.match(output(), /No open collection work items/);
    assert.doesNotMatch(output(), /251|\$48|\$62303/);
  });

  await checkAsync("overlapping refresh keeps the last completed read", async () => {
    const first = deferred(), second = deferred();
    let n = 0;
    const oldRead = canonical("property-live", {
      units: 72, rentable_positions: 158, occupied: 33,
      activation_pending: 8, open: 97, needs_review: 20, not_established: 0,
    });
    const newRead = canonical("property-live", {
      units: 72, rentable_positions: 159, occupied: 32,
      activation_pending: 9, open: 98, needs_review: 20, not_established: 0,
    });
    h.state.plan.rentRollUnits = () => (++n === 1 ? first.promise : second.promise);
    h.els.intelStrip.innerHTML = "before-refresh";
    const oldRender = h.api.renderManagement(true);
    const newRender = h.api.renderManagement(true);
    second.resolve(newRead);
    await newRender;
    assert.match(output(), />159<|>159<\/div>/);
    first.resolve(oldRead);
    await oldRender;
    assert.match(output(), />159<|>159<\/div>/);
    assert.doesNotMatch(output(), />158<|>158<\/div>/);
  });

  console.log(`\n════ ${passed} passed, 0 failed ════`);
})().catch((err) => {
  console.error("\nFAIL", err && err.stack || err);
  process.exitCode = 1;
});
