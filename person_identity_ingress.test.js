/* ══════════════════════════════════════════════════════════════════════════
   person_identity_ingress.test.js — NOTHING UNESTABLISHED OPENS A PERSON CARD

   THE GOVERNING MODEL (§0). The durable human identity is persons.id. A lease,
   a bed, a unit, a Yardi resident id, a name and a phone number are
   relationship or provenance facts. None of them is a human.

   WHAT WAS WRONG, MEASURED ON REAL GREENERY (105 canonical positions, signed
   in, owned runtime):

     · psRrRow() returned <button onclick='openPersonCard({person_id:"", …})'>
       for EVERY position — including the 11 rows the canonical read returns
       with `resident: null`, one of which literally renders "Resident not
       linked".
     · pcOpenLiveRail() read `opts.person_id || null`, so the empty string
       became null, went into window.__pcLiveIds, and the rail opened anyway.
       Proven in Chromium: __pcLiveIds = {p:null,l:null}, nothing thrown.
     · the same click carried unit_id and lease_id, the exact substitution
       §4 forbids.
     · rrPersonArg() probed r.person_id || r.canonical_person_id ||
       r.resident_uuid and then used a UUID-SHAPE REGEX as identity authority.

   WHAT THIS PROTECTS
     §3  a position with no established resident is not a Person Card target
     §4  the live rail itself refuses — UI non-clickability is not enough
     §4  unit_id / lease_id / space_id may never stand in for a person
     §5  lead_id survives as the one governed exception: the SERVER resolves it
     §6  one person argument shape on the authenticated path
     §25 the source CLAIM stays visible; it just is not a durable Person
     §32 no UUID-shape detection as business meaning
     §11 the phone label may not claim a verification it cannot see

   Run:  node person_identity_ingress.test.js
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("   PASS  " + m); } else { fail++; console.log("   FAIL  " + m); } };

function extract(name) {
  const m = new RegExp("function\\s+" + name + "\\s*\\(").exec(html);
  if (!m) throw new Error("not found: function " + name);
  const open = html.indexOf("{", m.index + m[0].length - 1);
  let d = 0, i = open;
  for (; i < html.length; i++) { if (html[i] === "{") d++; else if (html[i] === "}") { d--; if (!d) { i++; break; } } }
  return html.slice(m.index, i);
}

/*  The real row renderer, executed. Shapes are the CANONICAL read's own:
 *  `resident` is {person_id,name} when established and null when it is not —
 *  94 and 11 respectively on Greenery today. */
const psRrRow = new Function("esc", "psRrMoney", "psRrDate", "psRrException",
  extract("psRrRow") + "\nreturn psRrRow;")(
    x => String(x == null ? "" : x), v => "$" + v, v => String(v), () => "");

const LINKED = { unit_number:"1325-101", space_label:"Room1", unit_id:"u1", space_id:"s1",
  resident:{ person_id:"955df325-f052-458c-afe9-af6982be4844", name:"Zenia Mitchell" },
  lease:{ lease_id:"l1", end_date:"2026-12-31" }, current_rent:1050 };
const UNLINKED = { unit_number:"1325-107", space_label:"Room2", unit_id:"u2", space_id:"s2",
  resident:null, lease:{ lease_id:"l2", end_date:"2027-07-26" }, current_rent:950 };
const OPEN = { unit_number:"1325-110", space_label:"Room1", unit_id:"u3", space_id:"s3",
  resident:null, lease:null };

console.log("\n== §3 · a canonical row opens a Person Card only when there is a Person ==");
{
  const L = psRrRow(LINKED, false), U = psRrRow(UNLINKED, false), O = psRrRow(OPEN, false);
  ok(/^<button[^>]*class="rrc-row"/.test(L), "the LINKED row is a button");
  ok(/openCanonicalPersonFromRelationship/.test(L), "and it goes through the ONE canonical seam (§7)");
  ok(!/openPersonCard\(/.test(L), "not through the legacy entry");
  ok(!/^<button/.test(U), "the UNLINKED row is NOT a button");
  ok(/data-ps-identity="not_established"/.test(U), "it carries an honest identity marker");
  ok(!/openCanonicalPersonFromRelationship|openPersonCard/.test(U),
    "and no person-card call of any kind");
  ok(!/^<button/.test(O) && !/openPersonCard|openCanonicalPerson/.test(O),
    "an OPEN position is not a Person Card target either");
  ok(/Resident not linked/.test(U), "§25 — the source claim still says 'Resident not linked'");
  ok(/1325-107/.test(U) && /Room2/.test(U), "and the position, bed and rent stay visible");
  ok(!/<\/button>/.test(U) && /<\/div>/.test(U), "the unlinked element closes as a div, not a button");
}

/*  The live rail, executed with a stubbed window. */
function railWith(opts, signedIn) {
  const win = { __psLive: { hasSession: () => signedIn !== false } };
  const calls = [];
  const fn = new Function("window", "dsToast", "pcOpenSheet", "$", "pcRenderLiveCard", "pcLoadLiveCard", "Object",
    extract("pcPersonRefusal") + "\n" + extract("pcOpenLiveRail") + "\nreturn pcOpenLiveRail;")(
      win, (k, m) => calls.push([k, m]), () => calls.push(["sheet"]),
      () => ({ classList: { add(){} } }), () => calls.push(["render"]),
      (p, l) => calls.push(["load", p, l]), Object);
  const out = fn(opts);
  return { out, calls, ids: win.__pcLiveIds || null, win };
}

console.log("\n== §4 · the live rail refuses, whatever the UI did ==");
{
  const blank = railWith({ person_id:"", focus:"information", source:"rent_roll" });
  ok(blank.out && blank.out.refused === true, "an empty person_id is REFUSED");
  ok(blank.out.reason === "person_identity_not_established", "with a named reason");
  ok(!blank.calls.some(c => c[0] === "load"), "and no card is loaded");
  ok(blank.ids === null, "__pcLiveIds is never written");

  const viaRelationship = railWith({ person_id:"", unit_id:"u2", lease_id:"l2", source:"rent_roll" });
  ok(viaRelationship.out.refused === true, "unit_id + lease_id cannot substitute for a person");
  ok(viaRelationship.out.reason === "relationship_id_is_not_identity",
    "and the refusal names WHY (§4)");

  const spaceOnly = railWith({ person_id:"", space_id:"s9" });
  ok(spaceOnly.out.refused === true, "a space_id cannot either");

  const real = railWith({ person_id:"955df325-f052-458c-afe9-af6982be4844", focus:"information" });
  ok(!(real.out && real.out.refused), "an established Person still opens");
  ok(real.ids && real.ids.p === "955df325-f052-458c-afe9-af6982be4844", "and is the id that was asked for");
  ok(real.calls.some(c => c[0] === "load"), "the card loads");

  //  §5 — the ONE governed exception: the server resolves a lead relationship.
  const lead = railWith({ lead_id: "lead-123" });
  ok(!(lead.out && lead.out.refused), "§5 — a lead_id alone still opens; the SERVER resolves it to a Person");
  ok(lead.calls.some(c => c[0] === "load" && c[2] === "lead-123"), "and the lead id is what is sent");
}

console.log("\n== §7 · person_id is mandatory on the one authenticated seam ==");
{
  const seam = new Function("pcOpenLiveRail", "pcPersonRefusal",
    extract("openCanonicalPersonFromRelationship") + "\nreturn openCanonicalPersonFromRelationship;");
  const seen = [];
  const f = seam(o => { seen.push(o); return { opened:true }; }, r => ({ refused:true, reason:r }));
  ok(f({ person_id:"" }).refused === true, "blank person_id refuses");
  ok(f({}).refused === true, "absent person_id refuses");
  ok(f({ unit_id:"u", lease_id:"l" }).refused === true, "relationship ids alone refuse");
  const opened = f({ person_id:"p1", unit_id:"u1", lease_id:"l1", space_id:"s1", as_of:"2026-09-18" });
  ok(opened.opened === true, "a real person opens");
  ok(seen[0].person_id === "p1", "the person is the key");
  ok(seen[0].unit_id === "u1" && seen[0].lease_id === "l1" && seen[0].space_id === "s1",
    "§26 — relationship context rides along as CONTEXT");
}

console.log("\n== §6 / §32 · one argument shape, no UUID regex under a session ==");
{
  const mk = (signedIn) => new Function("_rrSignedIn", "_rrUnit", "_rrResident", "esc", "_rrActual",
    extract("rrCanonicalPersonId") + "\n" + extract("rrPersonArg") + "\nreturn rrPersonArg;")(
      () => signedIn, r => r.unit || "U", r => r.name || "", x => String(x == null ? "" : x), r => r.rent || 0);
  //  a row carrying ONLY the legacy aliases, and a UUID-shaped one at that
  const legacyShaped = { person_id:"", canonical_person_id:"3f2504e0-4f89-41d3-9a0c-0305e82c3301",
                          resident_uuid:"", unit:"1325-107", name:"Someone" };
  const signed = JSON.parse(mk(true)(legacyShaped, x => x).replace(/&#039;/g, "'"));
  ok(signed.person_id === "", "signed in, a legacy alias is NOT accepted as identity");
  ok(!("source_resident_id" in signed), "and the guessing payload is gone from the authenticated shape");
  const canonical = { resident:{ person_id:"955df325-f052-458c-afe9-af6982be4844" }, unit:"1325-101" };
  const signed2 = JSON.parse(mk(true)(canonical, x => x).replace(/&#039;/g, "'"));
  ok(signed2.person_id === "955df325-f052-458c-afe9-af6982be4844",
    "signed in, resident.person_id IS accepted — the one canonical field");
  const preview = JSON.parse(mk(false)(legacyShaped, x => x).replace(/&#039;/g, "'"));
  ok(preview.person_id === "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    "§16 — preview keeps its legacy adapter, walled behind the session check");
}

console.log("\n== §3 · a resident NAME is a target only when a Person exists ==");
{
  const mk = (signedIn) => new Function("_rrSignedIn", "_rrUnit", "_rrResident", "esc", "_rrActual",
    extract("rrNameLink") + "\n" + extract("rrCanonicalPersonId") + "\n" + extract("rrPersonArg") +
    "\nreturn rrNameLink;")(
      () => signedIn, r => r.unit || "U", r => r.name || "", x => String(x == null ? "" : x), r => r.rent || 0);
  const linked = mk(true)({ resident:{ person_id:"p-1" }, name:"Zenia Mitchell", unit:"1325-101" }, x => x);
  const unlinked = mk(true)({ resident:null, name:"Jane Smith", unit:"1325-107" }, x => x);
  ok(/openCanonicalPersonFromRelationship/.test(linked), "a linked name navigates through the canonical seam");
  ok(!/onclick/.test(unlinked), "an unlinked name is not clickable");
  ok(/Jane Smith/.test(unlinked), "§25 — but the claimed name is still shown");
  ok(/data-ps-identity="not_established"/.test(unlinked), "with the honest identity state");
}

console.log("\n== §11 / §30 · the phone label may not invent a verification ==");
{
  ok(!/Phone \(verified login identity\)/.test(html),
    "the unconditional 'verified login identity' label is GONE");
  ok(/personField\(t\.phone_verified_at \? 'Verified phone' : 'Phone', phone\)/.test(html),
    "and 'Verified phone' is said only when a verification instant is recorded");
}

console.log("\n== §45 · the defects may not be reintroduced quietly ==");
{
  const src = html.split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  ok(!/openPersonCard\(\{person_id:\s*\(r\.resident/.test(src),
    "psRrRow no longer builds an openPersonCard payload directly");
  ok(!/onclick='openPersonCard\(\$\{rrPersonArg/.test(src),
    "neither rent-roll name link calls the legacy entry with the probing payload");
}

console.log("\n== " + pass + " passed, " + fail + " failed ==\n");
process.exit(fail ? 1 : 0);
