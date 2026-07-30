"use strict";

const assert = require("assert");
const createContext = require("./authoritative-property-context.js");

function makeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...items) => items.forEach((item) => values.add(item)),
    remove: (...items) => items.forEach((item) => values.delete(item)),
    contains: (item) => values.has(item),
    toArray: () => [...values],
  };
}

function makeElement(tagName, text = "") {
  const attributes = new Map();
  const el = {
    tagName: String(tagName || "div").toUpperCase(),
    textContent: text,
    value: "",
    hidden: false,
    disabled: false,
    selected: false,
    parentNode: null,
    children: [],
    options: [],
    classList: makeClassList(),
    onclick: null,
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
    removeAttribute(name) { attributes.delete(name); },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      if (child.tagName === "OPTION") this.options.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((item) => item !== child);
      this.options = this.options.filter((item) => item !== child);
      child.parentNode = null;
    },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
  };
  return el;
}

function makeRoot({ authenticated = true, verification = null } = {}) {
  const ids = new Map();
  const selectors = new Map();
  const documentElement = makeElement("html");
  const document = {
    documentElement,
    getElementById(id) { return ids.get(id) || null; },
    querySelectorAll(selector) { return selectors.get(selector) || []; },
    createElement(tag) { return makeElement(tag); },
    dispatchEvent() {},
  };

  const root = {
    document,
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
    setTimeout(fn) { fn(); },
    addEventListener() {},
    __psLive: {
      hasSession: () => authenticated,
      verifySession: async () => verification,
    },
  };

  return {
    root,
    ids,
    selectors,
    addId(id, el) { ids.set(id, el); return el; },
    addSelector(selector, els) { selectors.set(selector, els); return els; },
  };
}

async function testAuthenticatedScopeWins() {
  const fixture = makeRoot({
    verification: {
      ok: true,
      property: { id: "demo-id", name: "Solo on Chestnut" },
      allowed_modules: ["leasing"],
      user: { role: "property_manager" },
    },
  });

  const select = fixture.addId("propPick", makeElement("select"));
  const demo = makeElement("option", "Property Spine Demo Building"); demo.value = "demo-id";
  const stale = makeElement("option", "The Felix"); stale.value = "felix-id";
  select.appendChild(demo); select.appendChild(stale); select.value = "felix-id";

  const desktop = fixture.addId("appbarDeal", makeElement("span", "SOLO ON CHESTNUT"));
  const mobile = fixture.addId("crumbMDeal", makeElement("span", "Stale property"));
  const switcher = fixture.addId("propSwitcher", makeElement("div"));

  const demoChip = makeElement("button", "Property Spine Demo Building");
  demoChip.setAttribute("data-val", "demo-id"); demoChip.setAttribute("onclick", "switchProperty('demo-id')");
  const felixChip = makeElement("button", "The Felix"); felixChip.setAttribute("data-val", "felix-id");
  const chipParent = makeElement("div"); chipParent.appendChild(demoChip); chipParent.appendChild(felixChip);
  const addData = makeElement("button", "+ Data");
  const persona = makeElement("div", "Persona");
  fixture.addSelector(".psw-chip", [demoChip, felixChip]);
  fixture.addSelector(".psw-add,.psw-persona", [addData, persona]);
  fixture.addSelector("[data-authoritative-property-name]", []);

  let previewSwitchCalls = 0;
  fixture.root.switchProperty = async () => { previewSwitchCalls++; };

  const api = createContext(fixture.root);
  await api.start();

  assert.strictEqual(desktop.textContent, "Solo on Chestnut");
  assert.strictEqual(mobile.textContent, "Solo on Chestnut");
  assert.strictEqual(select.options.length, 1, "non-authoritative property options must be removed");
  assert.strictEqual(select.options[0].value, "demo-id");
  assert.strictEqual(select.options[0].textContent, "Solo on Chestnut", "stale internal name must be replaced");
  assert.strictEqual(select.value, "demo-id");
  assert.strictEqual(select.disabled, true);
  assert.strictEqual(demoChip.textContent, "Solo on Chestnut");
  assert.strictEqual(demoChip.getAttribute("onclick"), null);
  assert.strictEqual(felixChip.parentNode, null, "other property chip must be removed");
  assert.strictEqual(addData.hidden, true, "preview data control must be hidden while signed in");
  assert.strictEqual(persona.hidden, true, "preview persona control must be hidden while signed in");
  assert.strictEqual(switcher.getAttribute("data-property-id"), "demo-id");

  const blocked = await fixture.root.switchProperty("felix-id");
  assert.deepStrictEqual(blocked, { ok: false, blocked: true });
  assert.strictEqual(previewSwitchCalls, 0, "browser property switching must not run in an authenticated session");
}

async function testPreviewIsUntouched() {
  const fixture = makeRoot({ authenticated: false, verification: null });
  const desktop = fixture.addId("appbarDeal", makeElement("span", "Preview Property"));
  fixture.addSelector(".psw-chip", []);
  fixture.addSelector(".psw-add,.psw-persona", []);
  fixture.addSelector("[data-authoritative-property-name]", []);

  let previewSwitchCalls = 0;
  fixture.root.switchProperty = async () => { previewSwitchCalls++; return "preview"; };

  const api = createContext(fixture.root);
  await api.start();

  assert.strictEqual(desktop.textContent, "Preview Property");
  const out = await fixture.root.switchProperty("anything");
  assert.strictEqual(out, "preview");
  assert.strictEqual(previewSwitchCalls, 1);
}

async function testConfirmedScopeSurvivesNetworkFailure() {
  const fixture = makeRoot({ authenticated: true, verification: null });
  fixture.root.__psLive.verifySession = async () => { throw new Error("network down"); };
  fixture.root._egAuthScope = { property_id: "demo-id", property_name: "Solo on Chestnut" };
  const desktop = fixture.addId("appbarDeal", makeElement("span", "Wrong"));
  fixture.addSelector(".psw-chip", []);
  fixture.addSelector(".psw-add,.psw-persona", []);
  fixture.addSelector("[data-authoritative-property-name]", []);

  const api = createContext(fixture.root);
  await api.start();
  assert.strictEqual(desktop.textContent, "Solo on Chestnut");
}

async function testNoConfirmedScopeFailsHonestly() {
  const fixture = makeRoot({ authenticated: true, verification: { ok: false, reason: "unconfirmed" } });
  const desktop = fixture.addId("appbarDeal", makeElement("span", "Cached Property"));
  const mobile = fixture.addId("crumbMDeal", makeElement("span", "Cached Property"));
  fixture.addSelector(".psw-chip", []);
  fixture.addSelector(".psw-add,.psw-persona", []);
  fixture.addSelector("[data-authoritative-property-name]", []);

  const api = createContext(fixture.root);
  await api.start();
  assert.strictEqual(desktop.textContent, "Property unavailable");
  assert.strictEqual(mobile.textContent, "Property unavailable");
}

(async function run() {
  const tests = [
    ["authenticated server scope owns every property label", testAuthenticatedScopeWins],
    ["preview runtime remains untouched", testPreviewIsUntouched],
    ["a previously confirmed scope survives a transient network failure", testConfirmedScopeSurvivesNetworkFailure],
    ["missing server scope fails honestly rather than using a cached label", testNoConfirmedScopeFailsHonestly],
  ];

  let passed = 0;
  for (const [name, test] of tests) {
    await test();
    passed++;
    console.log("✓ " + name);
  }
  console.log("\n" + passed + " passed · 0 failed");
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
