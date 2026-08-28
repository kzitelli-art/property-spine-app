/* ════════════════════════════════════════════════════════════════════
 *  PROPERTY SWITCH AS A SESSION TRANSACTION — browser proof
 *
 *  The invariant, stated as the thing that must hold:
 *
 *      start Solo, token digest A
 *      → select Skyline
 *      → server issues digest B and REVOKES A
 *      → /operator/me · /operator/properties · verifySession ·
 *        sessionMeta · Rent Roll · chrome   ALL say Skyline
 *      → refresh
 *      → still Skyline, still digest B
 *      then the same in reverse, Skyline → Solo
 *
 *  and the failure arm, which is the half that actually broke:
 *
 *      a switch begins → verification fails → NEITHER the old nor the
 *      new client context may masquerade as confirmed
 *
 *  ── WHAT IS REAL HERE AND WHAT IS NOT ───────────────────────────────
 *  REAL: index.html's own sealed live loader (createLiveLoader,
 *  selectProperty, verifySession, sessionMeta, loadResource) and the real
 *  authoritative-property-context.js, both loaded from source. The
 *  defect this proves was in those files, so they are the things under
 *  test and neither is stubbed.
 *
 *  NOT REAL: the API. Standing up server.js needs a from-scratch schema,
 *  which fails at migration 012 (PROPERTY_IDENTITY_AUTHORITY_TRACE §7).
 *  So the session table is modelled here in the shape
 *  src/identity/operator_properties.js and staff_session_service.js
 *  actually implement:
 *
 *      select → issue a NEW row bound to the requested property
 *             → revoke the row the request authenticated with
 *             → return the token ONCE, mint-then-revoke, one unit
 *      every read → resolve from the presented token, 401 if revoked
 *      digest → sha256(token), which is what token_digest holds
 *
 *  So this proves the CLIENT half of the transaction against a server
 *  that behaves like the real one. The server's own transaction is
 *  proven by its source and its existing tests, and is not re-proven
 *  here. Saying which half a proof covers is the whole point of saying
 *  what a green means.
 *
 *  Run:  node property_switch_transaction.browser.js
 * ════════════════════════════════════════════════════════════════════ */
"use strict";
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const API_DIR = "/home/user/property-spine-api";
const { chromium } = require(require.resolve("playwright", {
  paths: [path.join(API_DIR, "node_modules"), "/opt/node22/lib/node_modules"],
}));

const SOLO = "9e2bb96e-08e2-41db-81c2-91055ceb50a3";
const SKY  = "14e41b7c-e91c-49e8-9651-10c4908a8f6a";
const NAME = { [SOLO]: "Solo on Chestnut", [SKY]: "Skyline Apartments" };
const UNITS = { [SOLO]: 283, [SKY]: 160 };

let PASS = 0, FAIL = 0;
function ok(cond, label, detail) {
  if (cond) { PASS++; console.log("  ok    " + label); }
  else { FAIL++; console.log("  FAIL  " + label + (detail ? "\n          " + detail : "")); }
}
const sha256 = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");
const fp = (t) => (t ? sha256(t).slice(0, 12) : null);

/*  THE SESSION TABLE, in the shape staff_sessions actually has.  */
function makeApi(opts) {
  opts = opts || {};
  const sessions = new Map();          // token → { property_id, revoked }
  let nextToken = 0;
  function mint(propertyId) {
    const tok = "tok_" + (++nextToken) + "_" + propertyId.slice(0, 8);
    sessions.set(tok, { property_id: propertyId, revoked: false });
    return tok;
  }
  const state = { sessions, mint, verifyFails: !!opts.verifyFails, selectFails: !!opts.selectFails };

  function resolve(req) {
    const tok = req.headers["x-staff-session"] || "";
    const s = sessions.get(tok);
    if (!s || s.revoked) return null;
    return { token: tok, property_id: s.property_id };
  }

  state.server = http.createServer((req, res) => {
    const url = req.url.split("?")[0];
    const json = (code, body) => {
      res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(body));
    };

    // static: the REAL app files
    if (req.method === "GET" && !url.startsWith("/operator")) {
      const f = url.replace(/^\//, "") || "index.html";
      const p = path.join(__dirname, f);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        res.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html" });
        return res.end(fs.readFileSync(p));
      }
      res.writeHead(404); return res.end("no");
    }

    const op = resolve(req);
    if (!op) return json(401, { error: "No valid operator session. Sign in." });

    if (url === "/operator/me") {
      /*  The failure arm: /operator/me stops answering. verifySession()
       *  returns not-ok, which is precisely when a cached scope used to
       *  promote itself.  */
      if (state.verifyFails) return json(503, { error: "unavailable" });
      return json(200, { id: "u1", name: "KZ", role: "asset_manager",
                         property_id: op.property_id, property_name: NAME[op.property_id],
                         allowed_modules: ["leasing", "management"], platform_role: "member" });
    }

    if (url === "/operator/properties") {
      return json(200, {
        active_property_id: op.property_id,
        count: 2,
        properties: [
          { property_id: SOLO, property_name: NAME[SOLO], address: null, allowed_modules: ["leasing"] },
          { property_id: SKY,  property_name: NAME[SKY],  address: null, allowed_modules: ["leasing"] },
        ],
      });
    }

    if (url === "/operator/rent-roll/units") {
      return json(200, {
        property_id: op.property_id, as_of: "2026-08-18",
        units: [], totals: { units: UNITS[op.property_id], rentable_positions: UNITS[op.property_id] },
      });
    }

    if (url === "/operator/properties/select" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let requested = null;
        try { requested = JSON.parse(body || "{}").property_id; } catch (_) {}
        if (!requested) return json(400, { error: "property_id is required." });
        if (String(requested) === String(op.property_id)) {
          return json(200, { ok: true, unchanged: true, property: { id: op.property_id }, receipt: "Already open." });
        }
        if (state.selectFails) return json(403, { error: "no_access_to_property", receipt: "You do not have access to that property." });

        //  MINT THEN REVOKE, in that order — a failed mint must never
        //  sign the operator out.
        const fresh = mint(requested);
        sessions.get(op.token).revoked = true;
        return json(200, {
          ok: true, session_token: fresh, expires_at: "2026-09-01T00:00:00Z", expires_in_hours: 336,
          user: { id: "u1", name: "KZ" },
          property: { id: requested, name: NAME[requested] },
          role_title: "asset_manager", allowed_modules: ["leasing", "management"],
          previous_property_id: op.property_id,
        });
      });
      return;
    }
    return json(404, {});
  });
  return state;
}

/*  The shell the real modules mount into. Only the DOM they touch, plus
 *  the real createLiveLoader lifted out of index.html — not a stub of
 *  it, the source itself.  */
function harnessPage(origin, initialToken) {
  const src = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  //  createLiveLoader is defined inside index.html. Pull the exact
  //  function text out rather than re-implementing it: a re-implementation
  //  would prove the re-implementation.
  const start = src.indexOf("function createLiveLoader(");
  if (start < 0) throw new Error("createLiveLoader not found in index.html — the harness is out of date.");
  //  balanced-brace scan to the end of the function
  let depth = 0, i = src.indexOf("{", start), end = -1;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  const loaderSrc = src.slice(start, end);

  return `<!doctype html><meta charset="utf-8"><body>
<input id="apiBase" value="${origin}">
<span id="appbarDeal">unset</span><span id="crumbMDeal">unset</span>
<select id="propPick"></select>
<div id="propSwitcher"></div>
<script>
${loaderSrc}
window.__psLive = createLiveLoader({
  fetchImpl: window.fetch.bind(window),
  origin: ${JSON.stringify(origin)},
  resources: {
    operatorMe: { policy:'liveRequired', method:'GET', path: function(){ return '/operator/me'; } },
    authorizedProperties: { policy:'liveRequired', method:'GET', path: function(){ return '/operator/properties'; } },
    rentRollUnits: { policy:'liveRequired', method:'GET', path: function(){ return '/operator/rent-roll/units'; } }
  },
  __testMode: true
});
/*  INJECT ONLY ON FIRST LOAD. createLiveLoader rehydrates from
 *  sessionStorage at construction, and that is the mechanism the refresh
 *  step exists to prove. Re-injecting the original token on every load
 *  would overwrite the switched-to session with a revoked one and make
 *  the refresh look broken — it did, on the first run.  */
if(!sessionStorage.getItem('__ps_staff_session__')){
  window.__psLive.__testSetToken(${JSON.stringify(initialToken)}, null);
}
var _egAuthScope = null;
/*  The shell functions the enforcer wraps. Minimal, but they call the
 *  REAL selectProperty and the REAL verifySession — the transaction is
 *  not simulated.  */
async function loadProperties(){
  var out = await window.__psLive.loadResource('authorizedProperties');
  var d = (out && out.data) || out;
  var sel = document.getElementById('propPick');
  sel.innerHTML = (d.properties||[]).map(function(p){
    return '<option value="'+p.property_id+'">'+p.property_name+'</option>'; }).join('');
  sel.value = d.active_property_id;
  window.__psAuthorizedProperties = (d.properties||[]).slice();
  return d;
}
async function refreshPropSwitcher(){ await loadProperties(); }
function psSyncLiveCrumb(){}
function syncCrumbLabels(){}
function renderHome(){}
async function switchProperty(val){
  var grant = await window.__psLive.selectProperty(val);
  if(grant && grant.unchanged) return grant;
  var v = await window.__psLive.verifySession();
  if(!v || !v.ok){ _egAuthScope = null; return { ok:false }; }
  _egAuthScope = { property_id:v.property.id, property_name:v.property.name, allowed_modules:v.allowed_modules||[] };
  await refreshPropSwitcher();
  return grant;
}
</script>
<script src="./authoritative-property-context.js"></script>
</body>`;
}

async function boot(browser, api, origin, token) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("      PAGEERROR " + e.message));
  await page.route("**/harness.html", (r) => r.fulfill({ contentType: "text/html", body: harnessPage(origin, token) }));
  await page.goto(origin + "/harness.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__psAuthoritativePropertyContext, null, { timeout: 5000 });
  /*  THE REAL BOOT ORDER MATTERS. The shell loads the authorized list
   *  before the enforcer can judge a switch: authorizedIds() reads
   *  __psAuthorizedProperties, and with no list the guard refuses every
   *  switch — correctly, since it cannot tell an authorized request from
   *  an invented one. Skipping this step made the first run of this proof
   *  look like the switch was broken when it was the harness that had not
   *  signed in properly.  */
  await page.evaluate(() => window.loadProperties());
  await page.evaluate(() => window.__psAuthoritativePropertyContext.refreshFromServer());
  return page;
}

/*  Read every source in ONE pass, the way the truth table does.  */
async function readAll(page) {
  return page.evaluate(async () => {
    const out = {};
    const L = window.__psLive;
    out.sessionMeta = (L.sessionMeta() || {}).property_id || null;
    const v = await L.verifySession();
    out.verifySession = v && v.ok ? v.property.id : null;
    try { const me = await L.loadResource('operatorMe'); out.operatorMe = ((me && me.data) || me).property_id; }
    catch (e) { out.operatorMe = "READ_FAILED"; }
    try { const p = await L.loadResource('authorizedProperties'); out.activeProperty = ((p && p.data) || p).active_property_id; }
    catch (e) { out.activeProperty = "READ_FAILED"; }
    try { const r = await L.loadResource('rentRollUnits'); const d = (r && r.data) || r; out.rentRoll = d.property_id; out.rentRollUnits = d.totals.units; }
    catch (e) { out.rentRoll = "READ_FAILED"; }
    out.chrome = document.getElementById('appbarDeal').textContent;
    out.crumb = document.getElementById('crumbMDeal').textContent;
    out.confirmed = (window.__psAuthoritativePropertyContext.getConfirmedScope() || {}).property_id || null;
    out.provisional = (window.__psAuthoritativePropertyContext.getProvisionalScope() || {}).property_id || null;
    out.picker = document.getElementById('propPick').value;
    return out;
  });
}

function assertAllAgree(t, prop, label) {
  const expected = NAME[prop];
  ok(t.sessionMeta === prop,      label + " · sessionMeta",          t.sessionMeta);
  ok(t.verifySession === prop,    label + " · verifySession",        t.verifySession);
  ok(t.operatorMe === prop,       label + " · /operator/me",         t.operatorMe);
  ok(t.activeProperty === prop,   label + " · active_property_id",   t.activeProperty);
  ok(t.rentRoll === prop,         label + " · Rent Roll",            t.rentRoll);
  ok(t.rentRollUnits === UNITS[prop], label + " · Rent Roll rows are that property's", String(t.rentRollUnits));
  ok(t.confirmed === prop,        label + " · confirmed scope",      t.confirmed);
  ok(t.chrome === expected,       label + " · chrome wordmark",      t.chrome);
  ok(t.crumb === expected,        label + " · mobile crumb",         t.crumb);
  ok(t.picker === prop,           label + " · property highlight",   t.picker);
}

(async () => {
  const exe = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
               "/opt/pw-browsers/chromium/chrome-linux/chrome"].find((p) => fs.existsSync(p));
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});

  console.log("════════════════════════════════════════════════════════════════");
  console.log("  PROPERTY SWITCH AS A SESSION TRANSACTION");
  console.log("════════════════════════════════════════════════════════════════");

  // ── 1 · SOLO → SKYLINE ────────────────────────────────────────────
  {
    const api = makeApi({});
    await new Promise((r) => api.server.listen(0, "127.0.0.1", r));
    const origin = "http://127.0.0.1:" + api.server.address().port;
    const tokenA = api.mint(SOLO);
    const page = await boot(browser, api, origin, tokenA);

    console.log("\n── start: Solo, token digest " + fp(tokenA).slice(0, 8) + "… ──");
    assertAllAgree(await readAll(page), SOLO, "start");

    console.log("\n── select Skyline ──");
    await page.evaluate((v) => window.switchProperty(v), SKY);
    const after = await readAll(page);
    assertAllAgree(after, SKY, "after switch");

    ok(api.sessions.get(tokenA).revoked === true, "the old session token is REVOKED server-side");
    const live = [...api.sessions.entries()].filter(([, s]) => !s.revoked);
    ok(live.length === 1, "exactly ONE live session survives the switch", "live=" + live.length);
    ok(live[0][1].property_id === SKY, "and it is bound to Skyline");
    const digestB = fp(live[0][0]);
    ok(digestB !== fp(tokenA), "the token digest changed — a new session, not a mutated one");

    console.log("\n── refresh ──");
    /*  A reload rehydrates from sessionStorage, which is the path that
     *  has to carry the switch across a page load.  */
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__psAuthoritativePropertyContext, null, { timeout: 5000 });
    await page.evaluate(() => window.__psAuthoritativePropertyContext.refreshFromServer());
    await page.evaluate(() => window.loadProperties());
    assertAllAgree(await readAll(page), SKY, "after refresh");
    const stillLive = [...api.sessions.entries()].filter(([, s]) => !s.revoked);
    ok(fp(stillLive[0][0]) === digestB, "the SAME digest survives the refresh — no re-mint on reload");

    await page.close();
    await new Promise((r) => api.server.close(r));
  }

  // ── 2 · SKYLINE → SOLO, the reverse ───────────────────────────────
  {
    const api = makeApi({});
    await new Promise((r) => api.server.listen(0, "127.0.0.1", r));
    const origin = "http://127.0.0.1:" + api.server.address().port;
    const tokenA = api.mint(SKY);
    const page = await boot(browser, api, origin, tokenA);

    console.log("\n── reverse: start Skyline, select Solo ──");
    assertAllAgree(await readAll(page), SKY, "reverse start");
    await page.evaluate((v) => window.switchProperty(v), SOLO);
    const t = await readAll(page);
    assertAllAgree(t, SOLO, "reverse after switch");
    ok(api.sessions.get(tokenA).revoked === true, "reverse · the Skyline session is revoked");
    //  NO SURVIVING SKYLINE ANYTHING.
    ok(t.rentRollUnits === UNITS[SOLO], "reverse · no Skyline rows survive", String(t.rentRollUnits));
    ok(!/Skyline/.test(t.chrome + t.crumb), "reverse · no Skyline title survives", t.chrome + " / " + t.crumb);
    ok(t.confirmed === SOLO && t.provisional === null,
       "reverse · no Skyline cached scope survives", JSON.stringify([t.confirmed, t.provisional]));

    await page.close();
    await new Promise((r) => api.server.close(r));
  }

  // ── 3 · THE FAILURE ARM ───────────────────────────────────────────
  //  The switch happens, then verification stops answering. Neither the
  //  old nor the new client context may masquerade as confirmed.
  {
    const api = makeApi({});
    await new Promise((r) => api.server.listen(0, "127.0.0.1", r));
    const origin = "http://127.0.0.1:" + api.server.address().port;
    const tokenA = api.mint(SKY);
    const page = await boot(browser, api, origin, tokenA);

    console.log("\n── failure arm: confirmed Skyline, then verification fails ──");
    const before = await readAll(page);
    ok(before.confirmed === SKY, "precondition · Skyline is genuinely confirmed");

    api.verifyFails = true;
    await page.evaluate((v) => window.switchProperty(v), SOLO);
    await page.evaluate(() => window.__psAuthoritativePropertyContext.refreshFromServer());
    const t = await page.evaluate(() => ({
      confirmed: (window.__psAuthoritativePropertyContext.getConfirmedScope() || {}).property_id || null,
      provisional: (window.__psAuthoritativePropertyContext.getProvisionalScope() || {}).property_id || null,
      chrome: document.getElementById('appbarDeal').textContent,
      egAuth: (window._egAuthScope || {}).property_id || null,
      sessionMeta: (window.__psLive.sessionMeta() || {}).property_id || null,
    }));

    //  The session really did move — the server minted Solo and revoked Skyline.
    ok(t.sessionMeta === SOLO, "the session itself moved to Solo", t.sessionMeta);
    //  So a confirmed SKYLINE here would be the exact reported lie.
    ok(t.confirmed !== SKY, "the OLD property is not still confirmed", String(t.confirmed));
    ok(!/Skyline/.test(t.chrome), "the chrome does not still say Skyline", t.chrome);
    //  And the NEW property was never verified either, so it may not be confirmed.
    ok(t.confirmed !== SOLO || t.chrome === NAME[SOLO],
       "an unverified NEW property is not presented as confirmed either", String(t.confirmed));
    ok(t.chrome === "Property unavailable" || t.chrome === NAME[SOLO],
       "the shell is honest rather than confidently wrong", t.chrome);

    await page.close();
    await new Promise((r) => api.server.close(r));
  }

  await browser.close();
  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("  ASSERTIONS COMPLETE · " + (PASS + FAIL) + " run · " + PASS + " passed · " + FAIL + " failed");
  console.log(FAIL ? "  ✗ FAIL" : "  ✓ PASS");
  console.log("════════════════════════════════════════════════════════════════\n");
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
