#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
//  property_creation_experience.browser.js — BUILD 1A-1/1A-2, BROWSER RUNG
//
//  DELIBERATELY NOT NAMED *.test.js — run_harnesses.sh globs those and this
//  needs Playwright + Chromium, which the repo does not depend on.
//
//    SP=<dir-with-playwright> API=http://127.0.0.1:3999 \
//    SESSION=<raw staff session token> ORG=<org uuid> \
//    node property_creation_experience.browser.js
//
//  ── WHAT IS REAL HERE, AND WHY IT MATTERS ───────────────────────────
//  Real Chromium · the real index.html · the real super-admin wizard ·
//  the REAL API process · REAL Postgres. Nothing is intercepted and
//  nothing is stubbed.
//
//  ask_spine_browser_proof.browser.js says of itself: "STILL NOT PROVEN:
//  a real API and real Postgres behind that fetch." This closes that gap
//  for the creation door. The HTTP harness already proved the contract;
//  what only a browser can answer is whether a first-time user can
//  actually do this, and what the screen shows them while they do.
//
//  ── THE PRODUCT ACCEPTANCE CRITERION, MADE TESTABLE ─────────────────
//  "A first-time user should know immediately that they are creating a
//   property, provide only the information they naturally have, and never
//   be exposed to our identity or authority machinery. If Spine can safely
//   infer something, it does. If something important is missing, Spine
//   carries it forward visibly rather than blocking them with schema."
//
//  Each clause is an assertion below:
//    P1  knows immediately what they are doing   — the step names itself
//    P2  only what they naturally have           — NAME ALONE succeeds
//    P3  never exposed to the machinery          — no canonical_key,
//                                                  organization_id,
//                                                  authority, absent_reason
//                                                  ANYWHERE on screen
//    P4  Spine infers what it safely can         — an address typed the
//                                                  way a person types it
//                                                  becomes identity, with
//                                                  nothing asked
//    P5  missing is carried, not blocking        — the name-only property
//                                                  exists, and the reason
//                                                  it lacks identity is
//                                                  recorded for activation
//
//  P3 is the one that can only be proven here. Every other rung sees
//  JSON; a user sees the screen.
// ════════════════════════════════════════════════════════════════════
"use strict";

if (!process.env.SP) { console.error("DIED: set SP to a directory containing node_modules/playwright."); process.exit(1); }
if (!process.env.API) { console.error("DIED: set API to the running API base, e.g. http://127.0.0.1:3999"); process.exit(1); }
if (!process.env.SESSION) { console.error("DIED: set SESSION to a raw super-admin staff session token."); process.exit(1); }

const { chromium } = require(process.env.SP + "/node_modules/playwright");
const fs = require("fs");
const path = require("path");

//  Served over HTTP, not file://. The app confirms its session against
//  /operator/me, and operatorCors fails CLOSED unless the page's Origin
//  equals OPERATOR_APP_ORIGIN. From file:// the Origin is null, the
//  confirm fails, and the app shows its sign-in door — see the note on
//  the visibility guard below for why that mattered.
const APP = process.env.APP_URL || "http://127.0.0.1:4000/index.html";
const API = process.env.API.replace(/\/+$/, "");
const SESSION = process.env.SESSION;
const OUT = process.env.SHOTS || path.join(__dirname, "docs", "screenshots_property_creation");
const RUN = String(process.pid);

let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log("  ok    " + label); }
  else { fail++; console.log("  FAIL  " + label + (detail ? "\n        " + detail : "")); }
  return cond;
};

//  The words a user must never see. Not a style preference: each one is a
//  piece of our own machinery leaking into a first-time experience.
const MACHINERY = [
  "canonical_key", "canonical key", "organization_id", "absent_reason",
  "authority_basis", "platform_role", "creation_source", "property_creation_events",
  "no_authenticated_actor", "insufficient_platform_role", "uuid",
  //  Added after this harness FOUND it on screen. The duplicate-address
  //  refusal read "A property with this identity may already exist" —
  //  "identity" is our vocabulary for our machinery, and the first list
  //  missed it because it only looked for the snake_case column name.
  //  The lesson generalises: the leak is the WORD, not the format.
  "identity", "canonical", "provenance", "supersede",
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  console.log("════════════════════════════════════════════════════════════════");
  console.log("  BROWSER   property_creation_experience.browser.js");
  console.log("  APP       " + APP);
  console.log("  API       " + API + "   (a real API process over real Postgres)");
  console.log("  SHOTS     " + OUT);
  console.log("════════════════════════════════════════════════════════════════");
  console.log("  ASSERTIONS STARTED\n");

  const browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  // ══════════════════════════════════════════════════════════════════
  //  ⚠ WHY THE NETWORK IS REDIRECTED AND THE APP IS NOT
  //
  //  The live loader is SEALED to PRODUCTION_ORIGIN on purpose: "built
  //  ONCE with fixed production deps. NO test mode, NO override controls,
  //  NO token injector. Frozen." That is a security property worth having,
  //  and editing index.html to point it somewhere else would make this a
  //  proof about a modified app.
  //
  //  So index.html stays byte-identical and the TRANSPORT is redirected:
  //  every request the app makes to the production origin is rewritten to
  //  the local API. The frozen loader, the session confirm, the wizard,
  //  the fetch and the render are all real, unmodified code paths — and
  //  unlike ask_spine_browser_proof.browser.js, what answers them is a
  //  real API process over real Postgres rather than fixture JSON.
  // ══════════════════════════════════════════════════════════════════
  //  route.continue() refuses to change protocol, and the pinned origin is
  //  https — so the local API sits behind a TLS terminator that adds
  //  https:// and nothing else. API_TLS is that front; every byte through
  //  it is the real API's.
  const PROD = "https://property-spine-api.onrender.com";
  const TLS = (process.env.API_TLS || "https://127.0.0.1:8443").replace(/\/+$/, "");
  let redirected = 0;
  await page.route(PROD + "/**", async (route) => {
    redirected++;
    await route.continue({ url: route.request().url().replace(PROD, TLS) });
  });

  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e && e.message || e)));

  //  Seed the session the way the product does — sessionStorage — and point
  //  the app at the local API the way its own override does. Both are the
  //  app's real mechanisms, not test hooks.
  await page.addInitScript(([api, token]) => {
    try {
      localStorage.setItem("ps_api_base", api);
      sessionStorage.setItem("__ps_staff_session__", JSON.stringify({ t: token }));
    } catch (_) {}
  }, [API, SESSION]);

  await page.goto(APP, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // ══════════════════════════════════════════════════════════════════
  //  ⚠ THE VISIBILITY GUARD — READ THIS BEFORE TRUSTING ANYTHING BELOW
  //
  //  The first version of this harness passed 13/13 while the browser was
  //  showing the SIGN-IN SCREEN. It read `#saMain.innerText`, and when an
  //  element is not rendered, innerText falls back to textContent — so it
  //  happily returned the wizard's markup out of a hidden container. Every
  //  assertion was true about the DOM and false about the user. P3 ("the
  //  machinery is invisible") was the worst of them: it passed by reading
  //  an element nobody could see.
  //
  //  That is this repo's recorded trap in a new costume — "an empty-state
  //  pass is a true statement about the wrong subject." So:
  //
  //    · this guard fails the run if the app did not actually enter;
  //    · every text assertion below reads document.body.innerText, which
  //      IS layout-aware and excludes non-rendered nodes;
  //    · every control is checked with isVisible() before it is used.
  // ══════════════════════════════════════════════════════════════════
  const doorVisible = await page.evaluate(() => {
    const t = document.body.innerText || "";
    return /sign in to property spine|could not confirm your session/i.test(t);
  });
  ok("G0  the app actually talked to the local API (requests were redirected)",
    redirected > 0, "zero requests intercepted — the app called nothing, or called elsewhere");
  ok("G1  the app CONFIRMED the session and entered — the sign-in door is not showing",
    !doorVisible,
    "the browser is on the sign-in screen. Everything below would be a true statement\n" +
    "        about a hidden DOM. Check OPERATOR_APP_ORIGIN matches the page origin.");
  if (doorVisible) {
    await page.screenshot({ path: path.join(OUT, "00-FAILED-signin-door.png") });
    console.log("\n  Refusing to assert against a hidden DOM. See 00-FAILED-signin-door.png\n");
    await browser.close();
    process.exit(1);
  }

  //  The real path a super-admin takes: the Admin control the app reveals
  //  for platform_role = 'super_admin', clicked.
  const adminVisible = await page.locator("#appbarAdmin").isVisible().catch(() => false);
  ok("G2  the super-admin control is visible to a super-admin", adminVisible);
  if (adminVisible) await page.click("#appbarAdmin");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "00-admin-entered.png") });

  await page.evaluate(() => window.saStartWizard());
  await page.waitForTimeout(600);

  const orgName = "Browser Proof Client " + RUN;
  //  Step 1 — the organization. Typed, not injected.
  const orgInput = await page.$("#saWoName, #saOrgName, input[placeholder*='organization' i], .sa-form input");
  ok("W1  the wizard opened and offers a first step", !!orgInput,
     "no input found on step 1 — the wizard did not render");
  if (orgInput) { await orgInput.fill(orgName); }
  ok("W1b the step-1 input is visible, not merely present",
     await page.locator(".sa-form input").first().isVisible().catch(() => false));
  await page.screenshot({ path: path.join(OUT, "01-step1-organization.png") });

  //  Commit step 1 by clicking its real button.
  const step1Buttons = await page.$$eval(".sa-btn", (els) => els.map((e) => e.textContent.trim()));
  const created = await page.evaluate(async () => {
    const btns = [...document.querySelectorAll(".sa-btn")];
    const go = btns.find((b) => /create|continue|next/i.test(b.textContent));
    if (!go) return { clicked: false, buttons: btns.map((b) => b.textContent.trim()) };
    go.click(); return { clicked: true };
  });
  ok("W2  step 1 has a real forward control", created.clicked,
     "buttons seen: " + JSON.stringify(step1Buttons));
  await page.waitForTimeout(1800);

  // ══════════════════════════════════════════════════════════════════
  console.log("\n  ── P1 · THE USER KNOWS WHAT THEY ARE DOING ──");
  // ══════════════════════════════════════════════════════════════════
  await page.waitForSelector("#saWpName", { timeout: 8000 }).catch(() => {});
  const onProperties = await page.locator("#saWpName").isVisible().catch(() => false);
  ok("P1a the wizard reached a step whose subject is properties, and it is VISIBLE", onProperties,
     "#saWpName never appeared — step 2 did not render");

  const heading = await page.evaluate(() => {
    const h = document.querySelector("#saMain .sa-card-head h3, #saMain h3");
    return h ? h.textContent.trim() : null;
  });
  ok("P1b the step names itself in plain words  → " + JSON.stringify(heading),
    !!heading && /propert/i.test(heading), "heading was " + JSON.stringify(heading));

  const nameLabel = await page.evaluate(() => {
    const i = document.getElementById("saWpName");
    const lab = i && i.closest("div") ? i.closest("div").querySelector("label") : null;
    return { label: lab ? lab.textContent.trim() : null, placeholder: i ? i.placeholder : null };
  });
  ok("P1c the one required field is asked for in plain words  → " +
     JSON.stringify(nameLabel.label),
    !!nameLabel.label && /name/i.test(nameLabel.label));
  await page.screenshot({ path: path.join(OUT, "02-step2-properties-empty.png") });

  // ══════════════════════════════════════════════════════════════════
  console.log("\n  ── P2/P5 · ONLY WHAT THEY NATURALLY HAVE ──");
  // ══════════════════════════════════════════════════════════════════
  //  A first-time user who knows the building's name and nothing else.
  //  No address. This is the case that must NOT be blocked.
  const nameOnly = "Greenery " + RUN;
  await page.fill("#saWpName", nameOnly);
  await page.screenshot({ path: path.join(OUT, "03-name-only-typed.png") });

  const addBtnText = await page.evaluate(() => {
    const b = [...document.querySelectorAll(".sa-btn")].find((x) => /add propert/i.test(x.textContent));
    if (b) { b.click(); return b.textContent.trim(); }
    return null;
  });
  ok("P2a there is an obvious control to add the property  → " + JSON.stringify(addBtnText), !!addBtnText);
  await page.waitForTimeout(1800);

  const afterNameOnly = await page.evaluate(() => {
    const msg = document.getElementById("saWpMsg");
    return { msg: msg ? msg.textContent.trim() : null,
             msgClass: msg ? msg.className : null,
             text: document.body.innerText || "" };
  });
  ok("P2b NAME ALONE was accepted — no address demanded",
    afterNameOnly.text.includes(nameOnly) && !/err/i.test(afterNameOnly.msgClass || ""),
    JSON.stringify({ msg: afterNameOnly.msg, cls: afterNameOnly.msgClass }));
  ok("P5a the property they created is visible to them",
    afterNameOnly.text.includes(nameOnly));
  await page.screenshot({ path: path.join(OUT, "04-name-only-created.png") });

  // ══════════════════════════════════════════════════════════════════
  console.log("\n  ── P4 · SPINE INFERS WHAT IT SAFELY CAN ──");
  // ══════════════════════════════════════════════════════════════════
  //  A second property, this time with the address a person would type.
  //  Nothing about identity is asked; identity is derived.
  const withAddr = "1325 N 15th " + RUN;
  await page.fill("#saWpName", withAddr);
  const addrVisible = await page.locator("#saWpAddr").isVisible().catch(() => false);
  ok("P4a the address is offered, and visibly optional", addrVisible);
  const addrInput = await page.$("#saWpAddr");
  if (addrInput) await addrInput.fill("1325 N 15th Street");
  await page.screenshot({ path: path.join(OUT, "05-with-address-typed.png") });

  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".sa-btn")].find((x) => /add propert/i.test(x.textContent));
    if (b) b.click();
  });
  await page.waitForTimeout(1800);
  const afterAddr = await page.evaluate(() => document.body.innerText || "");
  ok("P4b the addressed property was created too", afterAddr.includes(withAddr));
  await page.screenshot({ path: path.join(OUT, "06-both-created.png") });

  // ══════════════════════════════════════════════════════════════════
  console.log("\n  ── P3 · THE MACHINERY IS INVISIBLE ──");
  // ══════════════════════════════════════════════════════════════════
  //  The assertion only a browser can make. Everything the user can read
  //  on this screen, checked against our own vocabulary.
  //  document.body.innerText — layout-aware, so hidden nodes contribute
  //  nothing. This is the assertion the first version got wrong.
  const visible = (await page.evaluate(() => document.body.innerText || "")).toLowerCase();
  const leaked = MACHINERY.filter((m) => visible.includes(m.toLowerCase()));
  ok("P3a no identity or authority machinery is visible on the creation screen",
    leaked.length === 0, "LEAKED: " + JSON.stringify(leaked));

  //  A raw uuid on screen is the same failure wearing a different shape.
  const uuidOnScreen = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(visible);
  ok("P3b no raw identifier is shown to the user", !uuidOnScreen);

  ok("P3c the page threw no error while doing any of this",
    consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));

  // ══════════════════════════════════════════════════════════════════
  console.log("\n  ── WHAT THE SERVER ACTUALLY RECORDED ──");
  // ══════════════════════════════════════════════════════════════════
  //  The names are handed back so the caller can verify the ROWS in
  //  Postgres. The browser proves the experience; the database proves what
  //  the experience recorded. Neither is the whole claim on its own.

  // ══════════════════════════════════════════════════════════════════
  console.log("\n  ── P6 · EVEN THE REFUSAL IS SAYABLE TO A HUMAN ──");
  // ══════════════════════════════════════════════════════════════════
  //  Deliberately add the SAME address twice. The refusal is correct — a
  //  duplicate must not be created — but a first-time user has to be able
  //  to read it and know what to do. This case is why the browser rung
  //  exists: the HTTP harness sees a 409 and calls it a pass.
  await page.fill("#saWpName", "Duplicate Attempt " + RUN);
  const dupAddr = await page.$("#saWpAddr");
  if (dupAddr) await dupAddr.fill("1325 N 15th Street");
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".sa-btn")].find((x) => /add propert/i.test(x.textContent));
    if (b) b.click();
  });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: path.join(OUT, "07-duplicate-refused.png") });

  const dup = await page.evaluate(() => {
    const m = document.getElementById("saWpMsg");
    return { text: (m ? m.textContent : "").trim(), body: document.body.innerText || "" };
  });
  ok("P6a the duplicate was refused, not created  → " + JSON.stringify(dup.text),
    /already/i.test(dup.text));
  ok("P6b the refusal uses plain words, not our vocabulary",
    dup.text.length > 0 && !MACHINERY.some((m) => dup.text.toLowerCase().includes(m.toLowerCase())),
    "LEAKED: " + JSON.stringify(MACHINERY.filter((m) => dup.text.toLowerCase().includes(m.toLowerCase()))));
  ok("P6c the refusal tells the user what to do instead",
    /choose|select|existing|already set up|pick/i.test(dup.text),
    "the message names a problem and no next step — a dead end");

  console.log("");
  console.log("  screenshots: " + OUT);
  console.log("════════════════════════════════════════════════════════════════");
  console.log(`  ASSERTIONS COMPLETE · ${pass + fail} run · ${pass} passed · ${fail} failed`);
  console.log("  " + (fail === 0 ? "✓ PASS" : "✗ FAIL") + " — property_creation_experience.browser.js");
  console.log("  EXIT      " + (fail === 0 ? 0 : 1));
  console.log("════════════════════════════════════════════════════════════════\n");

  //  Hand the created names back so the caller can verify them in the
  //  database — the browser proves the experience, Postgres proves the row.
  fs.writeFileSync(path.join(OUT, "created.json"),
    JSON.stringify({ org_name: orgName, name_only: nameOnly, with_address: withAddr,
                     api_base: API }, null, 2));

  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(async (e) => {
  console.error("\n  BROWSER HARNESS DIED: " + (e && e.stack || e));
  process.exit(2);
});
