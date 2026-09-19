"use strict";
/*  ══════════════════════════════════════════════════════════════════════
    link_resident_app.test.js — the Link-resident write action, EVALUATED.

    Pure-function harness: the `linkResident` entry is lifted out of
    index.html and its real `path()` and `buildBody()` are RUN. A test that
    grepped for the string would pass while the action posted to the wrong
    route or carried a field the server refuses.

    WHAT THIS DOES NOT COVER, stated rather than implied: whether the
    control is visible to the right operator, and whether the submit path
    re-reads the rent roll, are browser-level facts. They are not asserted
    here and this harness must not be read as covering them.
    ══════════════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

let passed = 0, failed = 0;
const ok = (label, cond, detail) => {
  if (cond) { passed++; console.log("  ok    " + label); }
  else { failed++; console.log("  FAIL  " + label + (detail !== undefined ? "  " + JSON.stringify(detail) : "")); }
};

/*  Lift one entry out of the WRITE_ACTIONS registry, brace-balanced, and
 *  evaluate it. This is the shipped object, not a copy of it.  */
function liftEntry(name) {
  const start = html.indexOf("\n    " + name + ": {");
  if (start < 0) throw new Error(name + " is not in the write-action registry");
  let i = html.indexOf("{", start), depth = 0, end = -1;
  for (let j = i; j < html.length; j++) {
    if (html[j] === "{") depth++;
    else if (html[j] === "}") { depth--; if (depth === 0) { end = j + 1; break; } }
  }
  // eslint-disable-next-line no-new-func
  return new Function("return (" + html.slice(i, end) + ");")();
}

console.log("\nLINK RESIDENT — WRITE ACTION\n");

const entry = liftEntry("linkResident");

ok("the action is registered and its key is the lease", entry && entry.key === "leaseId", entry && entry.key);

const P = { leaseId: "1f0e5a2b-0000-4000-8000-000000000abc", phone: "215 555 0177", source_basis: "called the resident" };
const built = entry.path(P);
ok("it posts to the canonical lease-scoped door",
  built === "/operator/leases/1f0e5a2b-0000-4000-8000-000000000abc/link-resident", built);

//  A lease id is interpolated into a URL. If it ever arrives unencoded, a
//  crafted value reaches a different route.
const odd = entry.path({ leaseId: "a/b?c=d&e" });
ok("the lease id is URL-encoded, so it cannot steer the path",
  odd === "/operator/leases/a%2Fb%3Fc%3Dd%26e/link-resident", odd);

const bodyPhone = entry.buildBody(P);
ok("a phone rides as phone", bodyPhone.phone === "215 555 0177", bodyPhone);
ok("the basis rides — how a resident was identified is part of the record",
  bodyPhone.source_basis === "called the resident", bodyPhone);
ok("an absent email is not sent as null", !("email" in bodyPhone) || bodyPhone.email === undefined, bodyPhone);

const bodyEmail = entry.buildBody({ leaseId: "x", email: "Casey@Example.test", source_basis: "emailed us" });
ok("an email rides as email, untouched — the server owns normalisation",
  bodyEmail.email === "Casey@Example.test", bodyEmail);

/*  §21. The server derives the property from the session and REFUSES a
 *  body that names one. An action that sent it would turn every call into
 *  a 403 — and worse, would imply the browser gets to choose.  */
const keys = Object.keys(entry.buildBody({
  leaseId: "x", phone: "2155550177", source_basis: "b",
  property_id: "should-not-travel", person_id: "should-not-travel",
})).filter((k) => entry.buildBody({ leaseId: "x", phone: "2155550177", source_basis: "b",
  property_id: "p", person_id: "q" })[k] !== undefined);
ok("the body carries ONLY phone, email and source_basis",
  keys.every((k) => ["phone", "email", "source_basis"].includes(k)), keys);
ok("a property_id offered by a caller never travels",
  entry.buildBody({ leaseId: "x", phone: "1", source_basis: "b", property_id: "p" }).property_id === undefined);
ok("nor does a person_id — Spine resolves the person from the handle",
  entry.buildBody({ leaseId: "x", phone: "1", source_basis: "b", person_id: "q" }).person_id === undefined);

/*  The registry is the only place a route may be named. A generic POST at
 *  the call site would bypass the guard rails writeAction applies.  */
ok("the call site uses the NAMED action, never a raw path",
  /linkResident: function\(params\)\{ return writeAction\('linkResident', params\); \}/.test(html));
ok("and nothing else in the app posts to link-resident directly",
  (html.match(/link-resident/g) || []).length === 1, (html.match(/link-resident/g) || []).length);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
