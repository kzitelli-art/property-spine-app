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
  // ── PHASE ZERO: THE GUARD IS MEMBERSHIP, NOT COUNT ────────────────────
  // This block used to assert options.length === 1, select.disabled === true,
  // the active chip stripped of its onclick, and switchProperty blocked
  // unconditionally. Those were correct while the browser had no way to ASK
  // for another property: any multi-property control was a claim of authority
  // the browser did not have.
  //
  // A server route now grants a session for a chosen property, so the honest
  // guard is that the picker contains ONLY what the server listed — which is
  // what these assertions check now. Nothing was relaxed: an unlisted
  // property is still removed, and still refused.
  //
  // No authorized set is published in this fixture (__psAuthorizedProperties
  // is absent), so "unknown set" must behave exactly like the old rule.
  assert.strictEqual(select.options.length, 1,
    "with no published authorized set, only the confirmed property may remain");
  assert.strictEqual(select.options[0].value, "demo-id");
  assert.strictEqual(select.options[0].textContent, "Solo on Chestnut", "stale internal name must be replaced");
  assert.strictEqual(select.value, "demo-id");
  assert.strictEqual(select.disabled, false,
    "the picker is usable: its options are the server's own list");
  assert.strictEqual(demoChip.textContent, "Solo on Chestnut");
  assert.strictEqual(demoChip.getAttribute("onclick"), "switchProperty('demo-id')",
    "the active chip keeps its handler — clicking it asks the server");
  assert.strictEqual(felixChip.parentNode, null, "an unauthorized property chip must still be removed");
  assert.strictEqual(addData.hidden, true, "preview data control must be hidden while signed in");
  assert.strictEqual(persona.hidden, true, "preview persona control must be hidden while signed in");
  assert.strictEqual(switcher.getAttribute("data-property-id"), "demo-id");

  // An UNLISTED property is still blocked in the browser, and never reaches
  // the shell's switch path.
  const blocked = await fixture.root.switchProperty("felix-id");
  assert.deepStrictEqual(blocked, { ok: false, blocked: true });
  assert.strictEqual(previewSwitchCalls, 0,
    "a property the server did not list must not reach the switch path");

  // A LISTED property is delegated to the shell, which asks the server. The
  // module does not grant it — it only stops inventing choices.
  fixture.root.__psAuthorizedProperties = [
    { property_id: "demo-id", property_name: "Solo on Chestnut" },
    { property_id: "felix-id", property_name: "The Felix" },
  ];
  const delegated = await fixture.root.switchProperty("felix-id");
  assert.strictEqual(previewSwitchCalls, 1,
    "an authorized property must be delegated to the shell's server-backed switch");
  assert.strictEqual(delegated, undefined, "the shell owns the outcome, not this module");

  // Re-selecting the property already in scope is a no-op, not a server call.
  const same = await fixture.root.switchProperty("demo-id");
  assert.deepStrictEqual(same, { ok: true, blocked: false });
  assert.strictEqual(previewSwitchCalls, 1, "re-selecting the active property must not re-mint");
  delete fixture.root.__psAuthorizedProperties;
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

/*  ⚠ THIS TEST USED TO ASSERT THE DEFECT, UNDER THE RIGHT NAME.
 *
 *  Its previous body set NO verification at all, put a name in the
 *  cached _egAuthScope, made verifySession throw, and asserted the
 *  cached name reached the label — then called that "confirmed scope
 *  survives network failure". Nothing had been confirmed. The value came
 *  straight from the cache, and the test's title made the cache look
 *  like a server answer, which is how the defect stayed put.
 *
 *  The rule the title always meant is real and worth keeping: a scope
 *  the SERVER actually confirmed is not erased by a later dropped
 *  packet. So the test now earns its name — it verifies successfully
 *  FIRST, and only then loses the network.  */
async function testConfirmedScopeSurvivesNetworkFailure() {
  const fixture = makeRoot({
    authenticated: true,
    verification: {
      ok: true,
      property: { id: "demo-id", name: "Solo on Chestnut" },
      allowed_modules: ["leasing"],
      user: { role: "property_manager" },
    },
  });
  const desktop = fixture.addId("appbarDeal", makeElement("span", "Wrong"));
  fixture.addSelector(".psw-chip", []);
  fixture.addSelector(".psw-add,.psw-persona", []);
  fixture.addSelector("[data-authoritative-property-name]", []);

  const api = createContext(fixture.root);
  await api.start();
  //  A REAL confirmation happened.
  assert.strictEqual(desktop.textContent, "Solo on Chestnut");
  assert.strictEqual(api.getConfirmedScope().property_id, "demo-id");

  //  Now the network goes. The confirmed scope stands — a failure to
  //  reach Spine is a fact about Spine, not about the property.
  fixture.root.__psLive.verifySession = async () => { throw new Error("network down"); };
  await api.refreshFromServer();
  assert.strictEqual(desktop.textContent, "Solo on Chestnut");
  assert.strictEqual(api.getConfirmedScope().property_id, "demo-id");
}

/*  THE HOSTILE CASE. A cache carrying one property, a session on
 *  another, and a verification that cannot establish the cached one.
 *
 *      cached scope    Skyline
 *      live session    Solo
 *      verification    fails
 *      MUST NOT        confirmed Skyline chrome
 *
 *  This is the shape the blocker reported from production: a live Solo
 *  session under chrome that said Skyline with full confidence.  */
async function testCachedScopeCannotSelfCertify() {
  const fixture = makeRoot({ authenticated: true, verification: { ok: false, reason: "unconfirmed" } });
  fixture.root._egAuthScope = { property_id: "skyline-id", property_name: "Skyline Apartments" };
  const desktop = fixture.addId("appbarDeal", makeElement("span", "Wrong"));
  const mobile = fixture.addId("crumbMDeal", makeElement("span", "Wrong"));
  fixture.addSelector(".psw-chip", []);
  fixture.addSelector(".psw-add,.psw-persona", []);
  fixture.addSelector("[data-authoritative-property-name]", []);

  const api = createContext(fixture.root);
  await api.start();

  assert.strictEqual(api.getConfirmedScope(), null,
    "a cached scope must never become the confirmed scope");
  assert.strictEqual(desktop.textContent, "Property unavailable",
    "the desktop wordmark must not present an unverified property as confirmed");
  assert.strictEqual(mobile.textContent, "Property unavailable",
    "the mobile crumb must not either");
  //  AND THE LOOP MUST STAY OPEN. Writing the cached value back into
  //  _egAuthScope is what laundered it into the app's own idea of
  //  server truth, so every other reader inherited it.
  assert.strictEqual(fixture.root._egAuthScope.property_name, "Skyline Apartments",
    "_egAuthScope is left as the caller set it — never rewritten from an unverified scope");
}

/*  A cached scope may still PAINT while the server is in flight — a shell
 *  that flashes blank on every load is its own kind of dishonesty. What
 *  it may not do is claim to be confirmed while it does so.  */
async function testCachedScopeMayPaintButNotCertify() {
  let release = null;
  const pending = new Promise((r) => { release = r; });
  const fixture = makeRoot({ authenticated: true, verification: null });
  fixture.root.__psLive.verifySession = () => pending;
  fixture.root._egAuthScope = { property_id: "demo-id", property_name: "Solo on Chestnut" };
  const desktop = fixture.addId("appbarDeal", makeElement("span", "Wrong"));
  fixture.addSelector(".psw-chip", []);
  fixture.addSelector(".psw-add,.psw-persona", []);
  fixture.addSelector("[data-authoritative-property-name]", []);

  const api = createContext(fixture.root);
  const started = api.start();

  //  Mid-flight: painted, and explicitly NOT confirmed.
  assert.strictEqual(desktop.textContent, "Solo on Chestnut");
  assert.strictEqual(api.getConfirmedScope(), null);
  assert.strictEqual(api.getProvisionalScope().property_id, "demo-id");

  release({ ok: true, property: { id: "demo-id", name: "Solo on Chestnut" },
            allowed_modules: ["leasing"], user: { role: "property_manager" } });
  await started;

  assert.strictEqual(api.getConfirmedScope().property_id, "demo-id");
  assert.strictEqual(api.getProvisionalScope(), null,
    "once the server confirms, nothing is left provisional");
}

/*  THE RACE, MADE DETERMINISTIC.
 *
 *  The switch proof caught this intermittently — two assertions failing
 *  in roughly one run in three. After a switch, a deferred scheduleApply
 *  re-projected the PREVIOUS property's name from _egAuthScope as a
 *  provisional paint, so the glass read Skyline over a Solo session.
 *  Not confirmed, and just as wrong on screen.
 *
 *  A test that only passes because the timing happened to go the right
 *  way is not a ratchet, so the same rule is asserted here with no timing
 *  in it at all: a scope that contradicts the live session is refused,
 *  provisional or otherwise.  */
async function testScopeFromADepartedSessionIsRefused() {
  const fixture = makeRoot({
    authenticated: true,
    verification: { ok: true, property: { id: "solo-id", name: "Solo on Chestnut" },
                    allowed_modules: ["leasing"], user: { role: "property_manager" } },
  });
  //  The session's own record says Solo — this is where it moved to.
  fixture.root.__psLive.sessionMeta = () => ({ user_id: "u1", property_id: "solo-id" });
  const desktop = fixture.addId("appbarDeal", makeElement("span", "Wrong"));
  fixture.addSelector(".psw-chip", []);
  fixture.addSelector(".psw-add,.psw-persona", []);
  fixture.addSelector("[data-authoritative-property-name]", []);

  const api = createContext(fixture.root);
  await api.start();
  assert.strictEqual(desktop.textContent, "Solo on Chestnut");

  const skyline = { property_id: "skyline-id", property_name: "Skyline Apartments" };
  assert.strictEqual(api.applyScope(skyline, false), false,
    "a PROVISIONAL paint from a departed session must be refused");
  assert.strictEqual(api.applyScope(skyline, true), false,
    "and so must a scope claiming to be confirmed — no call site may promote one");
  assert.strictEqual(desktop.textContent, "Solo on Chestnut",
    "the glass never shows the departed session's property");
  assert.strictEqual(api.getProvisionalScope(), null);
  assert.strictEqual(api.getConfirmedScope().property_id, "solo-id");
}

/*  applyScope has no default for `confirmed`. A caller that does not say
 *  whether the server confirmed does not know, and inheriting authority
 *  by omission is how the cached path became authoritative.  */
async function testApplyScopeRefusesUnstatedConfirmation() {
  const fixture = makeRoot({ authenticated: true, verification: { ok: false } });
  const desktop = fixture.addId("appbarDeal", makeElement("span", "Wrong"));
  fixture.addSelector(".psw-chip", []);
  fixture.addSelector(".psw-add,.psw-persona", []);
  fixture.addSelector("[data-authoritative-property-name]", []);
  const api = createContext(fixture.root);
  await api.start();

  const refused = api.applyScope({ property_id: "skyline-id", property_name: "Skyline Apartments" });
  assert.strictEqual(refused, false, "applyScope must refuse when confirmation is unstated");
  assert.strictEqual(api.getConfirmedScope(), null);
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
    ["a cached scope cannot certify itself when verification fails", testCachedScopeCannotSelfCertify],
    ["a cached scope may paint while the server is in flight, but not certify", testCachedScopeMayPaintButNotCertify],
    ["applyScope refuses a call that does not state whether the server confirmed", testApplyScopeRefusesUnstatedConfirmation],
    ["a scope from a session that has moved on is refused, provisional or not", testScopeFromADepartedSessionIsRefused],
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
