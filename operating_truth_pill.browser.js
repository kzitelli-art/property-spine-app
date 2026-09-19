/* ════════════════════════════════════════════════════════════════════
   operating_truth_pill.browser.js — THE RECORD-CONFIDENCE PILL,
   VERIFIED IN A REAL BROWSER on the real index.html.

   ── WHY THIS EXISTS ─────────────────────────────────────────────────
   Until this file, NO browser proof in this repo had ever reached the
   scores surface. Nothing matched ps-truth, ps-score or the dash
   renderer. So three numbers rendered on the operator's home screen —
   Your Score, Deal Score and Operating Truth — had never had the §33
   rung that this repo's own "13/13 while the browser showed the sign-in
   screen" lesson exists for.

   The first run of this proof immediately earned its keep. It showed
   Greenery rendering a GREEN 100 while window.__psScores.truth carried
   silent: ["confirmed spend"] — a reader that never reported, presented
   as a clean bill of health. §40.7 says composite silence is health ONLY
   if every required reader returned. That is now a brass PARTIAL and the
   assertions below are what hold it.

   ── WHAT THIS PROOF REFUSES TO REPEAT ───────────────────────────────
   · RENDERED IS NOT VISIBLE. Visibility is asked of the DOCUMENT:
     elementFromPoint at the pill's centre must return the pill or
     something inside it. A 13/13 once passed while the browser showed
     the sign-in card, and Deal Setup shipped writing messages into a
     real, styled, display:block element underneath a fixed overlay.
   · ASSERT THE APP ACTUALLY LOADED. The entry gate is checked as gone
     before anything else is believed.
   · ENTER THE WAY A PERSON ENTERS. This clicks the real landing button
     (button.psl-deal → psOpenLandingDeal('greenery')). It never calls
     psRenderMyWork() or pvRenderHub() to get in.
   · SCOPE EVERY SELECTOR to #hubLayer. In a full-screen-overlay app an
     unscoped selector is a coin flip.
   · READ LAYOUT-AWARE TEXT ONLY (innerText of rendered nodes), never
     textContent of something that may not exist.

   ── WHAT THIS PROOF DOES **NOT** PROVE. SAID PLAINLY. ───────────────
   It enters through egBoot's local preview door — __OFFLINE_MODE on
   127.0.0.1 with ?preview=1 — which is "unreachable on a deployed host"
   and can "never mint or imitate a staff session". So this verifies the
   pill RENDERS AND IS VISIBLE with its real data, in the preview
   altitude, where _rrSignedIn() is false and the offline NOI fixture is
   a legitimate reader.

   IT DOES NOT VERIFY THE SIGNED-IN PATH. The signed-in case — where the
   fixture is NOT a reader and the pill must read "Not established" —
   needs a real OTP session against a real API and is a separate slice.
   Do not read this file as covering it.

   No database. No API. Static file server only.

   Run:  node operating_truth_pill.browser.js
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const fs = require("fs");
const { serveStatic } = require("./tools/browser_stack.js");

//  Playwright is resolved from the API repo, which declares it with a
//  lockfile entry. This repo tracks no package.json on purpose.
//  The two repos are siblings in some checkouts and a level apart in
//  others (this container clones the app under kzitelli-art/). Try both,
//  and let an explicit path win.
const API_REPO = [
  process.env.SPINE_API_REPO,
  path.join(__dirname, "..", "api"),
  path.join(__dirname, "..", "property-spine-api"),
  path.join(__dirname, "..", "..", "property-spine-api"),
  path.join(__dirname, "..", "..", "api"),
].filter(Boolean).find((c) => fs.existsSync(path.join(c, "node_modules", "playwright")));
if (!API_REPO) { console.error("REFUSED: the API repo with node_modules was not found."); process.exit(2); }
const { chromium } = require(path.join(API_REPO, "node_modules", "playwright"));

const PORT = 8700 + (process.pid % 300);
const OUT = process.env.SHOTS || "/tmp/operating-truth-pill";

let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log("  ok    " + label); }
  else { fail++; console.log("  FAIL  " + label + (detail ? "\n        " + detail : "")); }
  return cond;
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveStatic(__dirname, PORT);
  //  CI hands the runner an explicit Chromium (CHROMIUM), the same contract
  //  the other app rungs use. Locally, playwright finds its own.
  const browser = await chromium.launch(
    process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  try {
    await page.goto(`http://127.0.0.1:${PORT}/?preview=1`, { waitUntil: "load" });
    await page.waitForTimeout(1200);

    console.log("\n== the app actually loaded ==");
    {
      const gate = await page.evaluate(() => {
        const g = document.getElementById("entryGate");
        return { exists: !!g, shown: !!(g && g.classList.contains("show")) };
      });
      ok("the entry gate exists in the document", gate.exists);
      ok("and it is NOT showing — we are past the sign-in card, not looking at it",
        gate.exists && !gate.shown);
      ok("no page errors during boot", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
    }

    console.log("\n== entered the way a person enters ==");
    {
      const clicked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button.psl-deal")]
          .find((b) => /Greenery/.test(b.innerText || ""));
        if (!btn) return null;
        btn.click();
        return btn.getAttribute("onclick");
      });
      ok("the real Greenery landing button was clicked, not a render function called",
        clicked === "psOpenLandingDeal('greenery')", "got: " + clicked);
      await page.waitForTimeout(2000);
    }

    console.log("\n== the pill is VISIBLE — asked of the document, not the element ==");
    const seen = await page.evaluate(() => {
      const hub = document.getElementById("hubLayer");
      const pill = hub && hub.querySelector(".ps-truth");          // scoped to the hub
      if (!pill) return { pill: false };
      const r = pill.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const dot = pill.querySelector(".ps-truth-dot");
      return {
        pill: true,
        hubShown: hub.classList.contains("show"),
        box: { w: Math.round(r.width), h: Math.round(r.height) },
        topIsPill: !!(el && (el === pill || pill.contains(el))),
        text: (pill.innerText || "").replace(/\s+/g, " ").trim(),   // layout-aware
        dotClass: dot ? dot.className : null,
        truth: window.__psScores ? window.__psScores.truth : null,
        deskCards: hub.querySelectorAll(".ps-module-card").length,
      };
    });

    ok("the hub layer is showing", seen.hubShown === true);
    ok("the pill exists inside #hubLayer", seen.pill === true);
    ok("it has a real box", !!(seen.box && seen.box.w > 100 && seen.box.h > 20),
      JSON.stringify(seen.box));
    ok("elementFromPoint at its centre returns the pill — NOT covered by an overlay",
      seen.topIsPill === true);
    ok("the hub really is the dash (four desk cards beside it)", seen.deskCards === 4,
      "cards: " + seen.deskCards);

    console.log("\n== what the pill SAYS matches what the reader RETURNED ==");
    const t = seen.truth || {};
    const silent = (t.silent || []).length;
    ok("the rendered text names the measure", /OPERATING TRUTH/i.test(seen.text), seen.text);
    if (t.established) {
      ok("the rendered number is the reader's number",
        new RegExp("\\b" + t.score + "\\b").test(seen.text),
        "score " + t.score + " vs text: " + seen.text);
    } else {
      ok("an unestablished reading renders the words, not a number",
        /Not established/i.test(seen.text), seen.text);
      ok("and no number is shown at all", !/\d/.test(seen.text.replace(/[^0-9]/g, "")), seen.text);
    }

    //  THE ASSERTION THIS FILE WAS WRITTEN FOR. Greenery rendered a green
    //  100 here with "confirmed spend" silent.
    if (silent > 0) {
      ok("a reading with a SILENT reader is not green (§40.7)",
        /ps-truth-brass|ps-truth-red|ps-truth-unknown/.test(seen.dotClass || "") &&
        !/ps-truth-green/.test(seen.dotClass || ""),
        "silent: " + JSON.stringify(t.silent) + " · dot: " + seen.dotClass);
      ok("and the pill says PARTIAL in words a person can read",
        /PARTIAL/i.test(seen.text), seen.text);
    } else {
      ok("with every reader reporting, nothing claims to be partial",
        !/PARTIAL/i.test(seen.text), seen.text);
    }

    console.log("\n== the detail page opens from the pill and agrees with it ==");
    {
      await page.evaluate(() => document.getElementById("hubLayer").querySelector(".ps-truth").click());
      await page.waitForTimeout(900);
      const detail = await page.evaluate(() => {
        const hub = document.getElementById("hubLayer");
        const page_ = hub && hub.querySelector(".psp-page");
        if (!page_) return { page: false };
        const lead = page_.querySelector(".psp-lead");
        const r = lead ? lead.getBoundingClientRect() : null;
        const el = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
        return {
          page: true,
          title: (page_.querySelector(".psp-title") || {}).innerText || "",
          lead: lead ? (lead.innerText || "").replace(/\s+/g, " ").trim() : null,
          leadVisible: !!(el && lead && (el === lead || lead.contains(el))),
          gaps: [...page_.querySelectorAll(".psp-gap")].map((g) => g.innerText.trim()),
        };
      });
      ok("the score page opened", detail.page === true);
      ok("it is the Operating Truth page", /Operating Truth/i.test(detail.title || ""), detail.title);
      ok("its lead paragraph is visible to the document, not merely rendered",
        detail.leadVisible === true);
      if (silent > 0) {
        ok("the page states the reading is PARTIAL",
          /PARTIAL reading/i.test(detail.lead || ""), detail.lead);
        ok("and lists every silent reader by name",
          (t.silent || []).every((s) => detail.gaps.some((g) => g.indexOf(s) === 0)),
          "silent " + JSON.stringify(t.silent) + " vs gaps " + JSON.stringify(detail.gaps));
      }
      ok("the page never claims a complete record while a reader is silent",
        !(silent > 0 && /complete and current/i.test(detail.lead || "")), detail.lead);
    }

    await page.screenshot({ path: path.join(OUT, "hub-greenery.png") });

    console.log("\n== a SECOND property shape — the pill is not one hardcoded reading ==");
    {
      //  Re-enter from the top rather than reaching for an internal "back",
      //  so this is a real second entry and not a re-render.
      await page.goto(`http://127.0.0.1:${PORT}/?preview=1`, { waitUntil: "load" });
      await page.waitForTimeout(1000);
      const clicked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button.psl-deal")]
          .find((b) => (b.getAttribute("onclick") || "").indexOf("'solo'") >= 0);
        if (!btn) return null;
        btn.click();
        return btn.getAttribute("onclick");
      });
      ok("entered Solo through its own landing button", clicked === "psOpenLandingDeal('solo')", "got: " + clicked);
      await page.waitForTimeout(1800);
      const solo = await page.evaluate(() => {
        const hub = document.getElementById("hubLayer");
        const pill = hub && hub.querySelector(".ps-truth");
        const dot = pill && pill.querySelector(".ps-truth-dot");
        const r = pill ? pill.getBoundingClientRect() : null;
        const el = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
        return {
          text: pill ? (pill.innerText || "").replace(/\s+/g, " ").trim() : null,
          dotClass: dot ? dot.className : null,
          visible: !!(el && pill && (el === pill || pill.contains(el))),
          truth: window.__psScores ? window.__psScores.truth : null,
        };
      });
      ok("Solo's pill is visible too", solo.visible === true);
      ok("it reads Solo's OWN number, not Greenery's",
        solo.truth && solo.truth.score !== t.score &&
        new RegExp("\\b" + solo.truth.score + "\\b").test(solo.text || ""),
        "solo " + (solo.truth && solo.truth.score) + " vs greenery " + t.score + " · " + solo.text);
      ok("Solo's NOI fixture carries missing_source, so its score is lower",
        solo.truth && solo.truth.score < t.score,
        (solo.truth && solo.truth.score) + " should be < " + t.score);
      ok("and the silent-reader rule holds on this shape too — brass, PARTIAL",
        !/ps-truth-green/.test(solo.dotClass || "") && /PARTIAL/i.test(solo.text || ""),
        solo.dotClass + " · " + solo.text);
      await page.screenshot({ path: path.join(OUT, "hub-solo.png") });
    }

    console.log("\n  screenshots: " + path.join(OUT, "hub-greenery.png") + " · " + path.join(OUT, "hub-solo.png"));
    console.log("\n  SCOPE: preview-door entry only. The signed-in path is NOT covered here.");
    console.log("\n== " + pass + " passed, " + fail + " failed ==\n");
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
