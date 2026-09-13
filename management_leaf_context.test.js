/*
 * management_leaf_context.test.js — delayed live Management leaf reads.
 *
 * Emitted-output VM proof. It extracts the actual leaf functions from
 * index.html and supplies only DOM, session and live-resource stubs. No HTTP,
 * browser, database, provider, or production call is made.
 *
 * Run: node management_leaf_context.test.js
 */
"use strict";

const assert = require("./tests/assert_reporter.js");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourceFile = process.env.MANAGEMENT_LEAF_SOURCE || path.join(__dirname, "index.html");
const baselineWitness = process.env.MANAGEMENT_LEAF_BASELINE === "1";
const html = fs.readFileSync(sourceFile, "utf8");

function extract(name) {
  const plain = html.indexOf(`function ${name}(`);
  const asyncStart = html.indexOf(`async function ${name}(`);
  const start = asyncStart >= 0 && (plain < 0 || asyncStart < plain) ? asyncStart : plain;
  if (start < 0) throw new Error(`function not found: ${name}`);
  const open = html.indexOf("{", start);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}" && --depth === 0) { i++; break; }
  }
  return html.slice(start, i);
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((r, j) => { resolve = r; reject = j; });
  return { promise, resolve, reject };
}

function element() {
  return {
    innerHTML: "", textContent: "",
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name]; },
    attributes: {},
  };
}

function makeHarness() {
  const state = {
    property: "property-one",
    session: { user_id: "operator-one", property_id: "property-one" },
    plan: {}, calls: [], paints: 0,
  };
  const ids = [
    "intelStrip", "deskTitle", "psRruBody", "psFrrBody", "psFlsBody",
    "psFwdBody", "psRrBody", "psIrPage", "psFrentHost",
  ];
  const els = Object.fromEntries(ids.map((id) => [id, element()]));
  const context = vm.createContext({
    console, state, elements: els,
    esc: (v) => String(v == null ? "" : v),
    prop: () => state.property,
    document: { getElementById: (id) => els[id] || (els[id] = element()) },
    $: (id) => els[id] || (els[id] = element()),
    window: {
      __subReturn: null,
      __psLive: {
        hasSession: () => true,
        sessionMeta: () => state.session,
        loadResource: (name, params) => {
          state.calls.push({ name, params });
          if (typeof state.plan[name] !== "function") return Promise.reject(new Error(`unexpected ${name}`));
          return Promise.resolve(state.plan[name](params)).then((data) => ({ data }));
        },
      },
    },
    activeDesk: "management",
    _managementReadSequence: 0,
    markSubPage: (fn) => { context.window.__subReturn = fn; },
    syncCrumbLabels() {},
    renderManagement() {},
    psRruToday: () => "2026-09-13",
    psRruSharedPrefix: () => "",
    psRruSourceReview: () => "",
    psRruPaint: () => { state.paints++; },
    psRrPaint: () => { state.paints++; },
    psFrrHorizons: () => [], psRrDate: (v) => String(v || "—"),
    psRrMoney: (v) => String(v == null ? "—" : v),
    psArErrorText: (e) => String(e && e.message || e),
    psFwdHeader: (d) => `<header>${d ? "current-forward" : "choose-term"}</header>`,
    psFwdPaint: () => { state.paints++; },
    psFlsHeadline: () => "current-cycle",
    psFlsControls: () => "controls",
    psFlsPaint: () => { state.paints++; },
    psFrentPanel: () => "current-forward-rent",
    psIrMoney: (v) => String(v == null ? "—" : v),
    psIrCell: (v) => String(v == null ? "—" : v),
    psLiveRentRoll: () => {},
    _psRru: { asOf: null, data: null, q: "", filter: "all", open: {} },
    _psRr: { data: null, q: "", filter: "all" },
    _psFrrDate: null,
    _psFls: { start: "2026-09-01", end: "2027-05-31", label: "current", data: null },
    _psFwd: { start: "2026-09-01", end: "2027-05-31", data: null, q: "", filter: "all" },
    _psFrent: { data: null }, _psIr: { asOf: null, data: null },
    RRU_NOT_ESTABLISHED_LABEL: "not established",
    RRU_FILTERS: [], PS_RR_FILTERS: [],
  });
  const helperSource = baselineWitness ? `
    // Baseline-only VM stubs: 4ba predates the guard helpers and never calls
    // them. They keep this proof harness focused on the unmodified behavior.
    function managementLeafReadStart(){ return ++_managementReadSequence; }
    function managementLeafReadContext(sequence){ return { sequence }; }
    function managementLeafReadCurrent(){ return true; }
  ` : `${extract("managementLeafReadStart")}
    ${extract("managementLeafReadContext")}
    ${extract("managementLeafReadCurrent")}`;
  vm.runInContext(`
    let _managementReadSequence = 0;
    ${extract("managementReadScope")}
    ${helperSource}
    ${extract("psLiveInstitutionalRentRoll")}
    ${extract("psLiveUnitRentRoll")}
    ${extract("psLiveForwardRent")}
    ${extract("psLiveForwardLedger")}
    ${extract("psLiveForwardLeasing")}
    ${extract("psLiveRentRoll")}
    ${extract("psLiveFutureRentRoll")}
    this.api = { psLiveInstitutionalRentRoll, psLiveUnitRentRoll,
      psLiveForwardRent, psLiveForwardLedger, psLiveForwardLeasing,
      psLiveRentRoll, psLiveFutureRentRoll };
  `, context);
  return { state, els, context, api: context.api };
}

function currentInventory() {
  return { property_id: "property-one", as_of: "2026-09-13",
    units: [{ unit_id: "u1", unit_number: "1", positions: [] }],
    totals: { units: 1, rentable_positions: 1, occupied: 0, activation_pending: 0,
      open: 1, needs_review: 0, not_established: 0 } };
}

function currentForward() {
  return { count: 1, requested_start: "2026-09-01", positions: [{ unit_number: "1" }],
    totals: { units: 1, contractually_free: 1, term_blocked: 0,
      term_partially_blocked: 0, unresolved: 0 } };
}

(async () => {
  const leaves = ["psLiveInstitutionalRentRoll", "psLiveUnitRentRoll", "psLiveRentRoll",
    "psLiveFutureRentRoll", "psLiveForwardLedger", "psLiveForwardLeasing"];
  if (!baselineWitness) {
    for (const name of leaves) {
      const source = extract(name);
      assert.ok(source.includes("managementLeafReadStart()"), `${name} starts a shared read`);
      assert.ok((source.match(/managementLeafReadCurrent\(leafContext\)/g) || []).length >= 2,
        `${name} guards both success and failure`);
    }
  } else {
    // This intentionally fails on untouched 4ba: the delayed old-property
    // response mutates the canonical global before the assertion. Keep this
    // branch as a regression witness; it is never part of the green tip run.
    const late = deferred();
    const hBaseline = makeHarness();
    hBaseline.state.plan.rentRollUnits = () => late.promise;
    const run = hBaseline.api.psLiveUnitRentRoll();
    hBaseline.state.property = "property-two";
    late.resolve(currentInventory());
    await run;
    assert.equal(hBaseline.context._psRru.data, null,
      "BASELINE EXPECTED FAILURE: delayed response must not mutate canonical global");
    return;
  }

  const h = makeHarness();
  const lateSuccess = deferred();
  h.state.plan.rentRollUnits = () => lateSuccess.promise;
  const successRun = h.api.psLiveUnitRentRoll();
  h.state.property = "property-two";
  lateSuccess.resolve(currentInventory());
  await successRun;
  assert.equal(h.state.calls[0].name, "rentRollUnits", "delayed success reached the live leaf reader");
  assert.match(h.els.intelStrip.innerHTML, /data-ps-state="loading"/);
  assert.equal(h.els.psRruBody.getAttribute("data-ps-state"), undefined,
    "late success does not mutate the stale leaf body");
  assert.equal(h.context._psRru.data, null,
    "late success does not pollute the canonical leaf cache");

  const lateFailure = deferred();
  h.state.property = "property-one";
  h.state.session = { user_id: "operator-one", property_id: "property-one" };
  h.state.plan.futureRentRollFacts = () => lateFailure.promise;
  const failureRun = h.api.psLiveFutureRentRoll();
  h.context.activeDesk = "leasing";
  lateFailure.reject(new Error("old property unavailable"));
  await failureRun;
  assert.match(h.els.intelStrip.innerHTML, /data-ps-state="loading"/);
  assert.doesNotMatch(h.els.intelStrip.innerHTML, /unavailable/i,
    "late failure does not overwrite the current desk with stale error UI");

  h.context.activeDesk = "management";
  h.context.window.__subReturn = null;
  h.state.plan.leasingPositionsForPeriod = () => currentForward();
  await h.api.psLiveForwardLeasing();
  assert.equal(h.els.psFwdBody.getAttribute("data-ps-state"), "data",
    "current response still renders after guards are active");
  assert.match(h.els.psFwdBody.innerHTML, /current-forward/);

  const first = deferred();
  let reads = 0;
  h.state.plan.leasingPositionsForPeriod = () => (++reads === 1 ? first.promise : currentForward());
  const oldRun = h.api.psLiveForwardLeasing();
  const newRun = h.api.psLiveForwardLeasing();
  await newRun;
  first.resolve({ count: 1, positions: [{ unit_number: "old" }], totals: currentForward().totals });
  await oldRun;
  assert.match(h.els.psFwdBody.innerHTML, /current-forward/);
  assert.doesNotMatch(h.els.psFwdBody.innerHTML, /old/,
    "a same-leaf late response cannot replace the latest response");

  // Forward Rent inherits the parent cycle token; its request must not
  // invalidate the ledger that legitimately launched it.
  h.state.plan.leasingForwardPosition = () => ({ ledger: [{}] });
  h.state.plan.leasingForwardRent = () => ({ committed_rent: { known: 0 } });
  await h.api.psLiveForwardLedger();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(h.els.psFrentHost.innerHTML, /current-forward-rent/);

  console.log("management leaf context proof completed");
})().catch((err) => {
  console.error("FAIL", err && err.stack || err);
  process.exitCode = 1;
});
