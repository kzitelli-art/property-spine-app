/* ══════════════════════════════════════════════════════════════════════════
   person_identity_signed_in.browser.js — §2 / §10 / §12, IN A REAL BROWSER
   WITH A REAL STAFF SESSION, AGAINST CANONICAL GREENERY.

   Needs an owned runtime: SPINE_API (default http://127.0.0.1:3055), a staff
   phone whose OTP lands in SPINE_SMS_LOG, and Greenery established. It SKIPS
   BY NAME rather than passing when that runtime is absent — a proof that
   reports green without a server is worse than no proof.
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs"), path = require("path");
const APP = __dirname;
const { serveStatic, serveTls } = require(path.join(APP, "tools/browser_stack.js"));
const API = process.env.SPINE_API || "http://127.0.0.1:3055";
const SMS = process.env.SPINE_SMS_LOG || "/tmp/spine-rung/sms.log";
const PHONE = process.env.SPINE_STAFF_PHONE || "2155550101";
const API_PORT = Number(new URL(API).port || 80);

(async () => {
  //  Refuse to pretend. No runtime → skip by name, non-zero only if asked.
  let reachable = false;
  try { const r = await fetch(API + "/health"); reachable = r.ok; } catch (_) {}
  if (!reachable || !fs.existsSync(SMS)) {
    console.log("SKIPPED — no owned runtime at " + API + " (set SPINE_API / SPINE_SMS_LOG)");
    process.exit(Number(process.env.SPINE_REQUIRE_RUNTIME) ? 2 : 0);
  }
  for (const k of ["HTTPS_PROXY","HTTP_PROXY","https_proxy","http_proxy","ALL_PROXY","all_proxy"]) delete process.env[k];
  process.env.NO_PROXY = "*"; process.env.no_proxy = "*";
  const API_REPO = [process.env.SPINE_API_REPO,
    path.join(APP, "..", "property-spine-api"), path.join(APP, "..", "..", "property-spine-api")]
    .filter(Boolean).find(c => fs.existsSync(path.join(c, "node_modules", "playwright")));
  if (!API_REPO) { console.error("REFUSED: playwright not resolvable"); process.exit(2); }
  const { chromium } = require(path.join(API_REPO, "node_modules", "playwright"));

  const PINNED = "property-spine-api.onrender.com";
  const APP_PORT = 8810 + (process.pid % 80), TLS_PORT = 9460 + (process.pid % 80);
  let pass = 0, fail = 0;
  const ok = (l, c, d) => { if (c) { pass++; console.log("  ok    " + l); }
    else { fail++; console.log("  FAIL  " + l + (d ? "\n        " + d : "")); } };

  const st = await serveStatic(APP, APP_PORT), tls = await serveTls(API_PORT, TLS_PORT);
  const browser = await chromium.launch({
    args: [`--host-resolver-rules=MAP ${PINNED} 127.0.0.1:${TLS_PORT}`,
           "--ignore-certificate-errors", "--no-proxy-server",
           ...(process.env.CHROMIUM ? [] : [])],
    ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
    ignoreHTTPSErrors: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1400 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const net = []; page.on("request", r => net.push({ m: r.method(), u: r.url() }));
  page.on("response", r => { const h = net.find(n => n.u === r.url() && n.s === undefined); if (h) h.s = r.status(); });

  try {
    await page.goto(`http://127.0.0.1:${APP_PORT}/`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const before = fs.readFileSync(SMS, "utf8").trim().split("\n").length;
    await page.fill("#egPhone", PHONE); await page.click("#egSendOtpBtn");
    await page.waitForTimeout(3000);
    const lines = fs.readFileSync(SMS, "utf8").trim().split("\n");
    const code = /access code is (\d{6})/.exec(JSON.parse(lines[lines.length - 1]).body)[1];
    await page.fill("#egCode", code); await page.click("#egVerifyOtpBtn");
    await page.waitForTimeout(6000);

    console.log("\n== a real staff session, not preview ==");
    ok("the entry gate closed", await page.evaluate(() =>
      !document.getElementById("entryGate").classList.contains("show")));
    ok("_rrSignedIn() is true", await page.evaluate(() => _rrSignedIn() === true));
    void before;

    console.log("\n== §12 · the preview identity resolver cannot run while signed in ==");
    const stub = await page.evaluate(async () => {
      const names = ["resolvePersonId", "personSourceObject", "pcResidentRecord", "pcRenderResidentCard"];
      const hits = {}, orig = {};
      names.forEach(n => { if (typeof window[n] === "function") { orig[n] = window[n];
        window[n] = function () { hits[n] = (hits[n] || 0) + 1; throw new Error("PREVIEW SEAM REACHED: " + n); }; } });
      let opened = null, threw = null;
      try {
        await window.__psLive.loadResource("rentRollCanonical", {});
      } catch (_) {}
      try { opened = openPersonCard({ person_id: "00000000-0000-4000-8000-000000000000", focus: "information", source: "rent_roll" }); }
      catch (e) { threw = e.message; }
      const wrapped = names.filter(n => orig[n] !== undefined);
      names.forEach(n => { if (orig[n]) window[n] = orig[n]; });
      return { hits, wrapped, threw, openedRefused: !!(opened && opened.refused) };
    });
    ok("all four preview seams were wrapped with throwing stubs", stub.wrapped.length === 4, JSON.stringify(stub.wrapped));
    ok("none of them executed on the signed-in Person Card path",
      Object.keys(stub.hits).length === 0, JSON.stringify(stub.hits));
    ok("and nothing threw out of the preview branch", stub.threw === null, String(stub.threw));

    console.log("\n== §2 / §3 · the canonical rows, and what is clickable ==");
    const rows = await page.evaluate(async () => {
      const out = await window.__psLive.loadResource("rentRollCanonical", {});
      const j = (out && out.data) ? out.data : out;
      const linked = j.rows.filter(x => x.resident && x.resident.person_id);
      const unlinked = j.rows.filter(x => !x.resident);
      const html = { linked: linked[0] ? psRrRow(linked[0], false) : null,
                     unlinked: unlinked[0] ? psRrRow(unlinked[0], false) : null };
      return { total: j.rows.length, linked: linked.length, unlinked: unlinked.length,
               linkedPerson: linked[0] && linked[0].resident.person_id,
               linkedName: linked[0] && linked[0].resident.name,
               unlinkedUnit: unlinked[0] && (unlinked[0].unit_number + " " + unlinked[0].space_label),
               html };
    });
    console.log("        canonical positions " + rows.total +
      " · resident linked " + rows.linked + " · resident null " + rows.unlinked);
    ok("both cases exist on real data", rows.linked > 0 && rows.unlinked > 0);
    ok("the LINKED row renders a button through the canonical seam",
      /^<button/.test(rows.html.linked) && /openCanonicalPersonFromRelationship/.test(rows.html.linked));
    ok("the UNLINKED row (" + rows.unlinkedUnit + ") is NOT a button",
      !/^<button/.test(rows.html.unlinked));
    ok("and makes no person-card call",
      !/openCanonicalPersonFromRelationship|openPersonCard/.test(rows.html.unlinked));

    console.log("\n== §4 · the rail refuses an unestablished identity, signed in ==");
    const refusal = await page.evaluate(() => {
      window.__pcLiveIds = undefined;
      const a = openPersonCard({ person_id: "", focus: "information", source: "rent_roll",
                                 unit_id: "u-x", lease_id: "l-x" });
      return { refused: !!(a && a.refused), reason: a && a.reason, ids: window.__pcLiveIds || null };
    });
    ok("an empty person_id with unit+lease is refused", refusal.refused === true);
    ok("the reason names the substitution", refusal.reason === "relationship_id_is_not_identity", refusal.reason);
    ok("__pcLiveIds was never written", refusal.ids === null || refusal.ids === undefined);

    console.log("\n== §10 · the linked row opens the EXACT Person ==");
    const opened = await page.evaluate(async (pid) => {
      window.__pcLiveIds = undefined;
      openCanonicalPersonFromRelationship({ person_id: pid, source: "rent_roll", unit_id: "u1", lease_id: "l1" });
      await new Promise(r => setTimeout(r, 2500));
      return { ids: window.__pcLiveIds || null,
               ctx: window.__pcLiveContext ? { person_id: window.__pcLiveContext.person_id,
                                               unit_id: window.__pcLiveContext.unit_id,
                                               lease_id: window.__pcLiveContext.lease_id } : null };
    }, rows.linkedPerson);
    ok("the rail opened on the person the ROW carried",
      opened.ids && opened.ids.p === rows.linkedPerson,
      "row " + rows.linkedPerson + " vs rail " + (opened.ids && opened.ids.p));
    ok("§26 — unit and lease rode along as context, not identity",
      opened.ctx && opened.ctx.unit_id === "u1" && opened.ctx.lease_id === "l1" &&
      opened.ctx.person_id === rows.linkedPerson);
    const cardCall = net.find(n => /person|card/i.test(n.u) && n.s === 200);
    console.log("        person endpoint called: " + (cardCall ? cardCall.u.replace("https://" + PINNED, "") : "(none captured)"));

    await page.screenshot({ path: (process.env.SHOTS || "/tmp/spine-rung/work") + "/person_identity.png" });
    console.log("\n== " + pass + " passed, " + fail + " failed ==\n");
  } finally { await browser.close(); st.close(); tls.close(); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("HARNESS ERROR:", e.message); process.exit(2); });
