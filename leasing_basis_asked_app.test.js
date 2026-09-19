/* ══════════════════════════════════════════════════════════════════════════
   leasing_basis_asked_app.test.js — THE UI MAY NOT ANSWER THIS QUESTION
   FOR THE OPERATOR.

   WHAT THIS PROTECTS
   ------------------
   "Add a property" carried:

       <select id="dsPropBasis">
         <option value="">— unit —</option>     <- default, sends NOTHING
         <option value="unit">Unit</option>
         <option value="bed">Bed</option>

   An operator who never touched it READ THE WORD "unit" ON SCREEN while the
   property was stored with leasing_basis = 'unknown'. The screen and the
   database disagreed, and the screen was the more convincing of the two.

   Migration 026 named 'unknown' the honest default precisely so the system
   could flag a declared-vs-observed mismatch "instead of silently guessing
   from row patterns". This dropdown was the guess, wearing a label.

   WHY IT IS NOT COSMETIC. On a by-the-bed building, grain 'unit' collapses
   every row to one "(whole unit)" position. A three-bed unit holding two
   residents and one empty bed becomes ONE OCCUPIED UNIT — the vacant bed is
   not miscounted, it stops existing. Skyline is 160 beds in 72 units;
   Greenery is 105 in 64.

   ORDERING, WHICH IS THE OTHER HALF OF THE POINT
   ----------------------------------------------
   The API now REFUSES an unestablished grain. Nothing else in this app
   could set the basis after a property was created, so shipping that API
   without this change would strand every such property at a refusal with
   no control anywhere to answer it. App-first, per Open Ruling 2.

   Run:  node leasing_basis_asked_app.test.js
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("   PASS  " + m); } else { fail++; console.log("   FAIL  " + m); } };

/*  The repo's extract() finds `function name(`. These are assignments, so
    find the assignment and brace-match from its body. */
function extractAssigned(name) {
  const re = new RegExp("window\\." + name + "\\s*=\\s*(?:async\\s+)?function\\s*\\(");
  const m = re.exec(html);
  if (!m) throw new Error("not found: window." + name);
  const open = html.indexOf("{", m.index + m[0].length - 1);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  return html.slice(m.index, i);
}

/*  A DOM small enough to be honest about what it is: only getElementById,
    because that is all these two functions touch. */
function domOf(values) {
  return { getElementById: (id) => (id in values ? { value: values[id], files: values[id + "__files"] } : null) };
}

console.log("\n== the markup no longer answers for the operator ==");
ok(!/<option value="">— unit —<\/option>/.test(html),
  'the blank option labelled "— unit —" is GONE');
ok(/id="dsPropBasis"[^>]*>\s*<option value="">Choose…<\/option>/.test(html),
  "the add-property default is an explicit Choose…, not a disguised answer");
ok(/rent attaches to each bedroom/.test(html),
  "the options say what the choice MEANS, not just 'Unit' / 'Bed'");
ok(/<label>Leases by \*<\/label>/.test(html),
  "the field is marked required on screen");

console.log("\n== the setup screen asks when the property never answered ==");
//  CONVERGED (app-pin convergence, 2026-09-19): the pinned lineage always
//  renders `dsReviewBasis` so the reviewer sees the basis the read will use,
//  and the pinned browser proof selects it. What this lineage added is kept:
//  an ESTABLISHED basis is preselected (showing the property's own answer);
//  an UNKNOWN basis defaults to Choose… — never to 'unit'.
ok(/id="dsReviewBasis"/.test(html), "a basis control exists on the rent-roll upload screen");
ok(/\(p\.leasing_basis === 'unit' \|\| p\.leasing_basis === 'bed'\)\s*\?/.test(html),
  "an established basis is preselected; an unestablished one is asked");
ok(/<select id="dsReviewBasis"><option value="">Choose…<\/option>/.test(html),
  "the unestablished default is an explicit Choose…, not a disguised answer");
ok(!/leasing_basis\|\|'unit'|leasing_basis \|\| 'unit'|\|\|st\.property\.leasing_basis\|\|'unit'/.test(html.slice(html.indexOf("window.dsUploadRentRoll = async"), html.indexOf("window.dsUploadRentRoll = async") + 6000)),
  "the upload never defaults the basis to 'unit' on the operator's behalf");
ok(/loses every vacant\s+'?\s*\+?\s*'?bed/.test(html.replace(/\s+/g, " ")) ||
   /loses every vacant/.test(html),
  "it explains the consequence rather than just demanding a value");

console.log("\n== dsAddProperty refuses a blank basis ==");
{
  const sandbox = { calls: [], toasts: [] };
  const fn = new Function("document", "dsToast", "dsFetch", "dsOpenDeal", "_ds", "window",
    "dsContextCurrent", "dsCapture", "dsCurrent",
    extractAssigned("dsAddProperty") + "\nreturn window.dsAddProperty;")(
      domOf({ dsPropName: "Skyline", dsPropBasis: "" }),
      (k, m) => sandbox.toasts.push([k, m]),
      async (...a) => { sandbox.calls.push(a); return { receipt: "ok" }; },
      async () => {},
      { deal: { id: "d1" } }, {},
      () => true, () => ({}), () => true);
  return fn().then(() => {
    ok(sandbox.calls.length === 0, "nothing is sent when no basis was chosen");
    ok(sandbox.toasts.some(([k, m]) => k === "bad" && /by the unit or by the bed/.test(m)),
      "the refusal asks the actual question");
  }).then(runChosen);
}

function runChosen() {
  console.log("\n== dsAddProperty sends the chosen basis ==");
  const sandbox = { calls: [], toasts: [] };
  const fn = new Function("document", "dsToast", "dsFetch", "dsOpenDeal", "_ds", "window",
    "dsContextCurrent", "dsCapture", "dsCurrent",
    extractAssigned("dsAddProperty") + "\nreturn window.dsAddProperty;")(
      domOf({ dsPropName: "Skyline", dsPropBasis: "bed" }),
      (k, m) => sandbox.toasts.push([k, m]),
      async (...a) => { sandbox.calls.push(a); return { receipt: "ok" }; },
      async () => {},
      { deal: { id: "d1" } }, {},
      () => true, () => ({}), () => true);
  return fn().then(() => {
    ok(sandbox.calls.length === 1, "the property is created");
    ok(sandbox.calls[0][2].leasing_basis === "bed", "the chosen basis rides the request");
  }).then(runUpload);
}

function uploadHarness(values) {
  const box = { calls: [], toasts: [] };
  const setup = { activation: { id: "a1" }, deal: { id: "d1" }, property: { id: "p1" } };
  const fn = new Function(
    "document", "dsToast", "dsRender", "dsProgress", "dsFetch", "FormData",
    "parseRentRollFile", "dsLoadSetup", "_ds", "window",
    "dsContextCurrent", "dsCapture", "dsCurrent",
    extractAssigned("dsUploadRentRoll") + "\nreturn window.dsUploadRentRoll;")(
      domOf(values),
      (k, m) => box.toasts.push([k, m]),
      () => {}, () => {},
      async (method, url, body) => {
        box.calls.push({ method, url, body });
        if (/\/source$/.test(url)) return { artifact: { id: "art1" } };
        return { receipt: "read" };
      },
      function () { return { append() {} }; },
      async () => [{ unit: "1417-101" }],
      async () => {},
      { setup, uploading: false }, {},
      () => true, () => ({}), () => true);
  return { fn, box };
}

function runUpload() {
  console.log("\n== dsUploadRentRoll refuses when the control is shown and empty ==");
  const { fn, box } = uploadHarness({
    dsRentRollFile: "", dsRentRollFile__files: [{ name: "rr.csv" }],
    dsAsOf: "2026-08-31", dsReviewBasis: "",
  });
  return fn().then(() => {
    ok(box.calls.length === 0, "the file is not even uploaded before the question is answered");
    ok(box.toasts.some(([k, m]) => k === "bad" && /by the unit or by the bed/.test(m)),
      "the refusal names the question");
  }).then(runUploadChosen);
}

function runUploadChosen() {
  console.log("\n== dsUploadRentRoll carries the basis to preview-source ==");
  const { fn, box } = uploadHarness({
    dsRentRollFile: "", dsRentRollFile__files: [{ name: "rr.csv" }],
    dsAsOf: "2026-08-31", dsReviewBasis: "bed",
  });
  return fn().then(() => {
    const pv = box.calls.find((c) => /preview-source$/.test(c.url));
    ok(!!pv, "preview-source is called");
    ok(pv && pv.body.leasing_basis === "bed",
      "the chosen basis rides the preview, so an unestablished property is not stranded");
    ok(pv && pv.body.source_artifact_id === "art1" && !("rows" in pv.body),
      "the preview cites the retained file; the browser sends no row interpretation of its own");
    const urls = box.calls.map((c) => c.url);
    ok(!urls.some((u) => /read-source$/.test(u)),
      "it does NOT read-source yet — nothing is established until the reviewer applies");
  }).then(runUploadEstablished);
}

function runUploadEstablished() {
  console.log("\n== with no control on the page, the upload sends no basis ==");
  //  When the control is absent the upload proceeds and sends no basis — the
  //  property's own answer, held by the API, is the authority. (When it is
  //  present it is preselected to that answer, so the same value rides.)
  const { fn, box } = uploadHarness({
    dsRentRollFile: "", dsRentRollFile__files: [{ name: "rr.csv" }],
    dsAsOf: "2026-08-31",
  });
  return fn().then(() => {
    const pv = box.calls.find((c) => /preview-source$/.test(c.url));
    ok(!!pv, "the upload proceeds with no basis control present");
    ok(pv && pv.body.leasing_basis === undefined,
      "no basis is sent, so the caller cannot overrule the property's established grain");
    console.log(`\n${pass} passed, ${fail} failed\n`);
    if (fail) process.exitCode = 1;
  });
}
