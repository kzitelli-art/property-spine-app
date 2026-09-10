/* Browser DOM proof for the existing application detail revise-terms form. */
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("C:/Users/kamer/OneDrive/Desktop/Property Spine/api-fable-review-20260907/node_modules/playwright");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
if (!/d\.application_id && d\.conversion_id && exactSpace && allowedStatus/.test(html)) throw new Error("legacy detail guard missing");
const formStart = html.indexOf("function psArReviseForm");
const formEnd = html.indexOf("/*  RETAINED SOURCE CLAIMS", formStart);
const reviseStart = html.indexOf("async function psArReviseTerms");
const reviseEnd = html.indexOf("/*  RETAINED SOURCE CLAIMS", reviseStart);
if (formStart < 0 || formEnd < 0 || reviseStart < 0 || reviseEnd < 0) throw new Error("revision functions not found");

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const result = await page.evaluate(async ({ formSource, reviseSource }) => {
      document.body.innerHTML = '<main id="host"></main>';
      globalThis.esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
      globalThis.psArNormMoney = v => { const raw=String(v == null ? "" : v).replace(/,/g, "").trim(); if(!raw)return ""; const n=Number(raw); return Number.isFinite(n) ? n.toFixed(2) : ""; };
      globalThis.psArField = (id,label,type,value,attrs) => `<label>${label}<input id="${id}" type="${type}" value="${value || ""}" ${attrs || ""}></label>`;
      globalThis._psArUi = { busy: {}, error: {}, detail: null };
      let call;
      globalThis.psArStoredKey = (kind, identity) => kind + ":" + identity;
      globalThis.psArSetBusy = () => {};
      globalThis.psArRenderDetail = () => {};
      globalThis.psArPayload = x => x;
      globalThis.toast = () => {};
      globalThis.psOpenApplicationReview = async () => {};
      globalThis.psArWriteMethod = () => async params => { call = params; return { receipt: "review receipt" }; };
      eval(formSource + "\n" + reviseSource);
      const detail = { application_id: "app-1", conversion_id: "conv-1", space: { id: "space-1" }, application_offer: {
        id: "offer-current", pending_review: { id: "pending-1030", terms: { rent: 0, security_deposit: 0, lease_start_date: "2026-10-01", lease_end_date: "2027-09-30", fees: [{ code: "pet", label: "Pet fee", amount: 25, cadence: "monthly" }] } }, terms: { rent: 999, security_deposit: 999, fees: [] }
      }};
      _psArUi.detail = detail;
      document.querySelector("#host").innerHTML = psArReviseForm(detail);
      const shown = { rent: document.querySelector("#psArReviseRent").value, fee: document.querySelector(".ps-ar-revise-fee").textContent, noFees: document.querySelector("#psArReviseFees").textContent.includes("No applicable fees") };
      document.querySelector("#psArReviseNoConcessions").checked = true;
      await psArReviseTerms(detail.application_id);
      const revisedCall = call;
      const legacy = { application_id: "app-legacy", conversion_id: "conv-legacy", space_id: "space-legacy", application_offer: { id: null, terms: null, pending_review: { id: "pending-legacy", terms: { rent: 0, security_deposit: 0, lease_start_date: "2026-11-01", lease_end_date: "2027-10-31", fees: [] } } } };
      document.querySelector("#host").innerHTML = psArReviseForm(legacy); _psArUi.detail = legacy;
      const legacyShown = { button: document.querySelector(".ps-ar-primary").textContent, noFees: !!document.querySelector("#psArReviseNoFees"), rent: document.querySelector("#psArReviseRent").value };
      document.querySelector("#psArReviseNoFees").checked = true; document.querySelector("#psArReviseNoConcessions").checked = true;
      await psArReviseTerms(legacy.application_id);
      const legacyCall=call;
      const initial={application_id:'app-initial',conversion_id:'conv-initial',space_id:'space-initial',application_offer:null,
        terms:{rent:null,deposit:0,lease_start_date:'2026-11-01',lease_end_date:'2027-10-31'}};
      document.querySelector('#host').innerHTML=psArReviseForm(initial); _psArUi.detail=initial;
      if(document.querySelector('#psArReviseDeposit').value!=='0.00')throw new Error('known legacy zero deposit lost');
      document.querySelector('#psArReviseNoConcessions').checked=true;
      call=null; await psArReviseTerms(initial.application_id);
      if(call)throw new Error('blank rent became an authored zero');
      document.querySelector('#psArReviseRent').value='0';
      await psArReviseTerms(initial.application_id);
      if(call)throw new Error('empty editable fee row bypassed explicit no-fees choice');
      document.querySelector('#psArReviseNoFees').checked=true;
      await psArReviseTerms(initial.application_id);
      if(!call || call.application_id!=='app-initial' || call.fees.length || call.security_deposit!=='0.00')throw new Error('initial explicit proposal failed');
      const initialCall=call;
      psArAddProposalFee();
      const rows=Array.from(document.querySelectorAll('#psArReviseFees .ps-ar-revise-fee'));
      rows.forEach((r,i)=>{r.querySelector('.psArFeeCode').value='fee_'+i;r.querySelector('.psArFeeLabel').value='Fee '+i;r.querySelector('.psArFeeAmount').value=i?'25':'0';});
      await psArReviseTerms(initial.application_id);
      if(call.fees.length!==2||call.fees[0].amount!=='0')throw new Error('multiple fees or zero fee lost');
      document.querySelector('#psArReviseNoFees').checked=true;call=null;
      await psArReviseTerms(initial.application_id);
      if(call)throw new Error('fees and no-fees contradiction was submitted');
      return { shown, call: revisedCall, legacyShown, legacyCall, initialCall };
    }, { formSource: html.slice(formStart, formEnd), reviseSource: html.slice(reviseStart, reviseEnd) });
    if (result.shown.rent !== "0.00" || !result.shown.fee.includes("Pet fee") || result.shown.noFees || result.call.supersedes_application_offer_id !== "pending-1030" || result.call.rent !== "0.00" || result.legacyShown.button !== "Propose application terms" || !result.legacyShown.noFees || result.legacyShown.rent !== "0.00" || result.legacyCall.application_id !== "app-legacy" || result.legacyCall.supersedes_application_offer_id !== "pending-legacy") throw new Error(JSON.stringify(result));
    console.log("PASS browser DOM nested pending revision proof", JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
