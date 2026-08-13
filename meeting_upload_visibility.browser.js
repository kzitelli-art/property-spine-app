#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   ADD A MEETING — IS IT ACTUALLY VISIBLE?

   This surface reports success, refusal and failure into a feedback
   element. This repo has already shipped that exact thing broken, twice:

     · a browser proof passed 13/13 while the screen showed the sign-in
       page, because innerText silently falls back to textContent
     · Deal Setup wrote every message into #receipt, which lives in the
       app shell UNDERNEATH a fixed full-screen overlay. Real element,
       real text, real box, display:block — and invisible. Two rent-roll
       uploads in a row looked like they did nothing.

   So this proof does not read text. It asks the DOCUMENT what is at a
   point: document.elementFromPoint at the element's centre must return
   that element or something inside it. Anything else is covered, and
   covered is invisible whatever the styles say.

   It also provokes a REAL refusal through the REAL path — clicking the
   real button with no file chosen — rather than calling _mtgSay()
   directly. A proof that reaches past the product to assert the product
   is testing its own reach.

   WHAT IT NEEDS. A reachable app and a live staff session. Not because
   this proof calls the API — every refusal it provokes is client-side —
   but because the app REFUSES TO RENDER operator surfaces without a live
   property context. Ask Spine never draws against fixtures, so with no
   backend there is correctly no box and no affordance to click. That is
   §19 working, and it is why this cannot run against a bare file://.

       node meeting_upload_visibility.browser.js --app https://<app> \
            --session <staff-session-token>

   Without --app it serves index.html locally, which is useful only for
   inspecting markup: it will stop at "the app shell rendered", honestly.

   The server-side behaviour — default deny, per-user cohort, and a
   refusal writing nothing — is proven separately and without a browser
   by tests/meeting_transcript_http_proof.js in the API repo.
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const fs = require("fs");
const http = require("http");

const APP = path.join(__dirname, "index.html");
const API = path.join(__dirname, "..", "property-spine-api");
const { chromium } = require(require.resolve("playwright", {
  paths: [path.join(API, "node_modules"), "/opt/node22/lib/node_modules"],
}));

let pass = 0, fail = 0;
const ok = (l, c, d) => {
  if (c) { pass++; console.log("  ok    " + l); }
  else { fail++; console.log("  FAIL  " + l + (d ? "\n        " + d : "")); }
  return c;
};

//  THE ONLY VISIBILITY TEST THIS REPO TRUSTS.
//  Rendered is not visible. Ask the document what is at the point.
async function visibleAtItsCentre(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return { found: true, box: false };
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) {
      return { found: true, box: true, onscreen: false };
    }
    const hit = document.elementFromPoint(x, y);
    return {
      found: true, box: true, onscreen: true,
      covered: !(hit && (hit === el || el.contains(hit))),
      hitBy: hit ? (hit.id || hit.className || hit.tagName) : null,
      text: (el.innerText || "").trim().slice(0, 90),
    };
  }, selector);
}

const arg = (n) => {
  const i = process.argv.indexOf(n);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
};
const APP_URL = arg("--app");
const TOKEN = arg("--session") || "browser-proof-token";

(async () => {
  let server = null, base = APP_URL;
  if (!base) {
    server = http.createServer((req, res) => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(APP));
    });
    await new Promise((r) => server.listen(0, r));
    base = "http://127.0.0.1:" + server.address().port + "/";
    console.log("  (no --app given: serving index.html locally. The app will not\n"
              + "   render operator surfaces without a live property context, so\n"
              + "   this run stops after the shell check. That is not a defect.)");
  }

  const exe = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
               "/opt/pw-browsers/chromium/chrome-linux/chrome"].find((p) => fs.existsSync(p));
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  //  A session token, seeded the way the app itself persists one. Ask Spine
  //  never renders without a live session (it must not render against
  //  fixtures), so without this the affordance correctly does not exist.
  //  No live call is made anywhere in this proof.
  await page.addInitScript((tok) => {
    sessionStorage.setItem("__ps_staff_session__",
      JSON.stringify({ t: tok, m: null }));
  }, TOKEN);
  await page.goto(base, { waitUntil: "domcontentloaded" });

  //  ASSERT THE APP ACTUALLY LOADED. The 13/13-on-the-sign-in-screen
  //  failure is what this line exists to prevent.
  await page.waitForSelector("#deskGrid", { timeout: 20000, state: "attached" });
  ok("the app shell rendered", await page.$("#deskGrid") !== null);

  //  Ask Spine renders only against a live session and a real property.
  //  If it did not render, say WHY rather than reporting the surface broken.
  const drew = await page.waitForSelector("#askSpineAddMeeting", { timeout: 20000 })
    .then(() => true).catch(() => false);
  if (!drew) {
    console.log("\n  NOT PROVEN — Ask Spine did not render. The app refuses to draw\n"
              + "  operator surfaces without a live property context (\u00a719), so there\n"
              + "  is no affordance to click. Re-run with --app and --session against a\n"
              + "  reachable deployment. Reporting unproven rather than passing.\n");
    await browser.close(); if (server) server.close();
    process.exit(3);
  }

  console.log("\n══ THE AFFORDANCE ══");

  let v = await visibleAtItsCentre(page, "#askSpineAddMeeting");
  ok("'Add a meeting' is rendered", v.found);
  ok("'Add a meeting' is not covered by anything", v.found && v.box && !v.covered,
    "hit by: " + v.hitBy);
  ok("it reads as a verb-first action", (v.text || "").toLowerCase() === "add a meeting", v.text);

  //  It sits with Ask Spine, not somewhere unrelated.
  ok("it lives inside the Ask Spine box",
    await page.evaluate(() => !!document.querySelector(".as-box #askSpineAddMeeting")));

  console.log("\n══ THE SHEET ══");

  await page.click("#askSpineAddMeeting");
  await page.waitForSelector("#meetingDrawer.open", { timeout: 5000 });

  for (const [label, sel] of [
    ["the file field", "#meetingDrawer #mtgFile"],
    ["the meeting-date field", "#meetingDrawer #mtgDate"],
    ["the submit button", "#meetingDrawer #mtgSubmit"],
  ]) {
    const r = await visibleAtItsCentre(page, sel);
    ok(label + " is visible, not merely present", r.found && r.box && r.onscreen && !r.covered,
      "hit by: " + r.hitBy);
  }

  //  The surface must not imply retrieval works. It does not.
  ok("the sheet says plainly it is not readable in Ask Spine yet",
    await page.evaluate(() =>
      /not yet readable in ask spine/i.test(document.querySelector("#meetingDrawer").innerText)));

  console.log("\n══ A REFUSAL A HUMAN CAN ACTUALLY SEE ══");

  //  Provoked through the real button, not by calling the message function.
  await page.click("#meetingDrawer #mtgSubmit");
  await page.waitForFunction(
    () => !document.querySelector("#mtgFeedback").classList.contains("hidden"),
    { timeout: 5000 });

  v = await visibleAtItsCentre(page, "#mtgFeedback");
  ok("the refusal is rendered", v.found);
  ok("the refusal is ON SCREEN and NOT COVERED", v.found && v.box && v.onscreen && !v.covered,
    "hit by: " + v.hitBy + " — this is the Deal Setup #receipt defect, exactly");
  ok("the refusal names what to do", /choose the transcript file/i.test(v.text || ""), v.text);

  //  A refusal must not evaporate before it is read.
  await page.waitForTimeout(1200);
  ok("the refusal is still there a moment later",
    !(await page.evaluate(() =>
      document.querySelector("#mtgFeedback").classList.contains("hidden"))));

  //  And it must be dismissible, or it becomes furniture.
  await page.click("#mtgFeedback .am-feedback-x");
  ok("the refusal can be dismissed",
    await page.evaluate(() =>
      document.querySelector("#mtgFeedback").classList.contains("hidden")));

  console.log("\n══ THE SECOND REFUSAL — FILE CHOSEN, NO DATE ══");

  const tmp = path.join(require("os").tmpdir(), "proof_transcript.txt");
  fs.writeFileSync(tmp, "0:03 - A\nOne.\n\n0:09 - B\nTwo.\n");
  await page.setInputFiles("#meetingDrawer #mtgFile", tmp);
  await page.click("#meetingDrawer #mtgSubmit");
  await page.waitForFunction(
    () => !document.querySelector("#mtgFeedback").classList.contains("hidden"),
    { timeout: 5000 });
  v = await visibleAtItsCentre(page, "#mtgFeedback");
  ok("the missing date is refused, visibly", v.found && v.box && v.onscreen && !v.covered);
  ok("it asks for the meeting date", /date this meeting took place/i.test(v.text || ""), v.text);

  await page.screenshot({ path: path.join(__dirname, "meeting_upload_visibility.png") });
  console.log("\n  screenshot → meeting_upload_visibility.png");

  await browser.close();
  if (server) server.close();
  console.log(`\n  ${pass} passed · ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("PROOF CRASHED:", e); process.exit(2); });
