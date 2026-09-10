/* Browser DOM proof for the existing conversation offer review function. */
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("C:/Users/kamer/OneDrive/Desktop/Property Spine/api-fable-review-20260907/node_modules/playwright");
const html = fs.readFileSync(path.join(__dirname, "application-offer-review.js"), "utf8");
const start = html.indexOf("function reviewOffer");
const end = html.indexOf("\n  chooseUnit();", start);
if (start < 0 || end < 0) throw new Error("reviewOffer function not found");
const reviewOfferSource = html.slice(start, end);

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.setContent('<main id="host"></main>');
    const result = await page.evaluate(async (source) => {
      const host2 = document.querySelector("#host");
      const q = id => document.getElementById(id);
      const esc = value => String(value == null ? "" : value);
      const chooseUnit = () => {};
      let offerCalls = 0, sendCalls = 0;
      const live = { createApplicationOffer: async () => { offerCalls++; return { data: { application_offer_id: "offer-dom-1" } }; } };
      const sessionMod = { sendApplication: async () => { sendCalls++; if (sendCalls === 1) throw new Error("dispatch retry"); return { receipt: "sent" }; } };
      const _currentConv = { conversion_id: "conv-dom-1" };
      const reviewOffer = new Function("host2", "q", "esc", "chooseUnit", "live", "sessionMod", "_currentConv", "var active=true;function loadProspectContext(){}" + source + "; return reviewOffer;")(host2, q, esc, chooseUnit, live, sessionMod, _currentConv);
      reviewOffer({ unit_id: "unit-1", space_id: "space-1", intended_move_in: "2026-10-01" }, { unit_number: "101", space_label: "Bedroom A", application_terms: {} });
      q("lqOfferRent").value = "0"; q("lqOfferDep").value = "0"; q("lqOfferStart").value = "2026-10-01"; q("lqOfferEnd").value = "2027-09-30";
      q("lqNoFees").checked = true;
      await q("lqOfferConfirm").click(); await new Promise(r => setTimeout(r, 10));
      const noAckRefused = offerCalls === 0 && q("lqOfferErr").textContent.includes("no concessions");
      q("lqNoConcessions").checked = true;
      await q("lqOfferConfirm").click(); await new Promise(r => setTimeout(r, 20));
      const locked = q("lqOfferRent").disabled && q("lqOfferStart").disabled && q("lqAddFee").disabled;
      const firstRetryError = q("lqOfferErr").textContent;
      await q("lqOfferConfirm").click(); await new Promise(r => setTimeout(r, 20));
      return { noAckRefused, locked, firstRetryError, offerCalls, sendCalls, sent: host2.textContent.includes("sent") };
    }, reviewOfferSource);
    if (!result.noAckRefused || !result.locked || result.offerCalls !== 1 || result.sendCalls !== 2 || !result.sent) throw new Error(JSON.stringify(result));
    console.log("PASS browser DOM terms-zero and frozen-retry proof", JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
