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
ok(/dsSetupBasis/.test(html), "a basis control exists on the rent-roll upload screen");
ok(/\(p\.leasing_basis === 'unit' \|\| p\.leasing_basis === 'bed'\) \? '' :/.test(html),
  "it renders ONLY when the property has no established grain (no nagging an answered property)");
ok(/loses every vacant\s+'?\s*\+?\s*'?bed/.test(html.replace(/\s+/g, " ")) ||
   /loses every vacant/.test(html),
  "it explains the consequence rather than just demanding a value");

console.log("\n== dsAddProperty refuses a blank basis ==");
{
  const sandbox = { calls: [], toasts: [] };
  const fn = new Function("document", "dsToast", "dsFetch", "dsOpenDeal", "_ds", "window",
    extractAssigned("dsAddProperty") + "\nreturn window.dsAddProperty;")(
      domOf({ dsPropName: "Skyline", dsPropBasis: "" }),
      (k, m) => sandbox.toasts.push([k, m]),
      async (...a) => { sandbox.calls.push(a); return { receipt: "ok" }; },
      async () => {},
      { deal: { id: "d1" } }, {});
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
    extractAssigned("dsAddProperty") + "\nreturn window.dsAddProperty;")(
      domOf({ dsPropName: "Skyline", dsPropBasis: "bed" }),
      (k, m) => sandbox.toasts.push([k, m]),
      async (...a) => { sandbox.calls.push(a); return { receipt: "ok" }; },
      async () => {},
      { deal: { id: "d1" } }, {});
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
      { setup, uploading: false }, {});
  return { fn, box };
}

function runUpload() {
  console.log("\n== dsUploadRentRoll refuses when the control is shown and empty ==");
  const { fn, box } = uploadHarness({
    dsRentRollFile: "", dsRentRollFile__files: [{ name: "rr.csv" }],
    dsAsOf: "2026-08-31", dsSetupBasis: "",
  });
  return fn().then(() => {
    ok(box.calls.length === 0, "the file is not even uploaded before the question is answered");
    ok(box.toasts.some(([k, m]) => k === "bad" && /by the unit or by the bed/.test(m)),
      "the refusal names the question");
  }).then(runUploadChosen);
}

function runUploadChosen() {
  console.log("\n== dsUploadRentRoll carries the basis to read-source ==");
  const { fn, box } = uploadHarness({
    dsRentRollFile: "", dsRentRollFile__files: [{ name: "rr.csv" }],
    dsAsOf: "2026-08-31", dsSetupBasis: "bed",
  });
  return fn().then(() => {
    const read = box.calls.find((c) => /read-source$/.test(c.url));
    ok(!!read, "read-source is called");
    ok(read && read.body.leasing_basis === "bed",
      "the chosen basis rides read-source, so an unestablished property is not stranded");
  }).then(runUploadEstablished);
}

function runUploadEstablished() {
  console.log("\n== an already-established property is not asked again ==");
  //  The control is absent from the DOM, which is what the render does when
  //  leasing_basis is 'unit' or 'bed'. The upload must proceed and must NOT
  //  send a basis — the property's own answer is the authority.
  const { fn, box } = uploadHarness({
    dsRentRollFile: "", dsRentRollFile__files: [{ name: "rr.csv" }],
    dsAsOf: "2026-08-31",
  });
  return fn().then(() => {
    const read = box.calls.find((c) => /read-source$/.test(c.url));
    ok(!!read, "the upload proceeds with no basis control present");
    ok(read && read.body.leasing_basis === undefined,
      "no basis is sent, so the caller cannot overrule the property's established grain");
    console.log(`\n${pass} passed, ${fail} failed\n`);
    if (fail) process.exitCode = 1;
  });
}
