/* ══════════════════════════════════════════════════════════════════════════
   rent_roll_row_semantics.test.js — A ROW IS A ROW. THE CONTROL IS A BUTTON.

   The Rent Roll shipped its expand affordance as
   `<tr tabindex="0" role="button" aria-expanded onkeydown="...Enter||Space">`.
   It worked with a mouse and it worked with a keyboard, which is exactly
   why it survived: nothing an operator did made it look broken.

   What it cost is invisible from the outside. A <tr> announced as a button
   stops being a table row, and a rent roll read through a screen reader
   loses the row/column context that turns "Room1" into "1417-103, Room1,
   occupied, rent unknown". Then, having thrown that away, it reimplemented
   Enter and Space — which a real <button> gets for free and gets right.

   THE FIX IS SEMANTIC, NOT VISUAL. The ledger's information model, its
   columns, its density and its treatment are unchanged; the geometry is
   held by skyline_rent_roll_units.browser.js and re-run against it.

   ── THIS FILE IS THE RATCHET ────────────────────────────────────────────
   Its job is to go RED if anybody puts role, tabindex, aria-expanded or key
   handling back on the <tr>. That regression is silent by construction —
   the surface would still expand on click and still expand on Enter — so a
   test is the only thing standing between here and the old defect.

   Emitted-output assertions, same method as rent_roll_cutover_app.test.js:
   the real functions are lifted out of index.html and run.

   Run:  node rent_roll_row_semantics.test.js
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

let pass = 0, fail = 0; const failures = [];
const ok = (c, m, d) => {
  if (c) { pass++; console.log("   PASS  " + m); }
  else { fail++; failures.push(m); console.log("   FAIL  " + m + (d ? "\n         " + d : "")); }
};

function extract(name) {
  const start = html.indexOf("function " + name + "(");
  if (start < 0) throw new Error("not found in index.html: " + name);
  const open = html.indexOf("{", start);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  return html.slice(start, i);
}
const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

const FNS = ["psRruMoney", "psRruDate", "psRruDateLong", "psRruRent",
             "psRruSharedPrefix", "psRruUnitText", "psRruLabel",
             "psRruStatus", "psRruStatusLabel", "psRruProven", "psRruException", "psRruDetail",
             "psRruCtl", "psRruRow", "psRruRowClick"];
const box = {};
new Function("esc", "_psRru", "RRU_NIL", "RRU_NOT_ESTABLISHED_LABEL",
  FNS.map(extract).join("\n") + "\n" +
  FNS.map((f) => `this.${f}=${f};`).join(""))
  .call(box, esc,
        { asOf: null, data: null, q: "", filter: "all", open: {} },
        '<span class="rru-nil">—</span>',
        "Occupancy Unconfirmed");

const COLS_BED = { room: true, count: 10, unitPrefix: "1417-" };
const COLS_UNIT = { room: false, count: 9, unitPrefix: "1417-" };
const UNIT = { unit_id: "u1", unit_number: "1417-103", source_file: "RentRoll07_1417.xlsx" };

const bed = (over) => Object.assign({
  space_id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa", label: "Room1",
  //  THE SERVER'S DECISION, carried on the row. The row builder reads these
  //  and no longer derives a status from `current`/`next`.
  bucket: "occupied", bucket_label: "Occupied", bucket_reason_code: "OCCUPIED_BY_OPERATIVE_LEASE",
  bucket_reason: "An operative lease spans this date.",
  tenancy_state: "contractually_occupied", evidence_state: "confirmed",
  conflict_state: null, detail: { use_type: "residential", square_feet: null },
  current: { resident: "Molly Rueckel", person_id: "p1", lease_id: "l1",
             rent: { amount: null, state: "not_in_source" }, through: "2027-07-26",
             proof_basis: "confirmed_opening_import" },
  next: null,
}, over || {});

//  The by-unit control: same service, same row builder, no room column.
const wholeUnit = (over) => bed(Object.assign({ label: "(whole unit)" }, over || {}));

console.log("\n" + "═".repeat(72));
console.log("  RENT ROLL ROW SEMANTICS — a <tr> is a table row");
console.log("═".repeat(72) + "\n");

// ── T · THE ROW IS A ROW ────────────────────────────────────────────────
console.log("  ── T · the row carries no interactive semantics ──");
{
  const rowOf = (h) => h.slice(0, h.indexOf(">") + 1);
  const closed = box.psRruRow(bed(), UNIT, COLS_BED);
  const tr = rowOf(closed);

  ok(/^<tr class="rru-r/.test(tr), "the row is emitted as a <tr>", tr);
  //  THE FOUR THAT MUST NEVER COME BACK. Each is checked on the <tr> tag
  //  ITSELF, not on the row's HTML, because the button inside legitimately
  //  carries aria-expanded and the whole point is that they are different
  //  elements.
  ok(!/\brole\s*=/.test(tr), "the row declares NO role — it is not a button", tr);
  ok(!/\btabindex\s*=/.test(tr), "the row is NOT in the tab order", tr);
  ok(!/\baria-expanded\s*=/.test(tr), "the row does NOT carry aria-expanded", tr);
  ok(!/\bonkey(down|press|up)\s*=/.test(tr),
     "the row hand-rolls NO keyboard handling — a real button already has it", tr);
  ok(!/\baria-controls\s*=/.test(tr), "the row does NOT carry aria-controls", tr);

  //  Pointer convenience survives, and it is the ONLY thing on the row.
  ok(/\bonclick="psRruRowClick\(/.test(tr),
     "the row keeps a pointer handler so a dense ledger line stays clickable", tr);
  //  …and it is a GUARDED handler, not a raw toggle, or a click on the
  //  button would toggle twice and cancel itself out.
  ok(/closest\(['"]button/.test(String(box.psRruRowClick)),
     "…guarded, so a click that began on a control is not toggled twice",
     String(box.psRruRowClick));

  //  The durable identity the surface acts by is untouched by all of this.
  ok(/data-space-id="aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"/.test(tr),
     "stable position identity still travels on the row");
}

// ── B · THE CONTROL IS A REAL BUTTON ────────────────────────────────────
console.log("\n  ── B · the naming cell owns a genuine control ──");
{
  const closed = box.psRruRow(bed(), UNIT, COLS_BED);
  const btn = (closed.match(/<button[^>]*class="rru-b"[^>]*>/) || [""])[0];

  ok(!!btn, "a <button> is emitted", closed.slice(0, 300));
  ok(/type="button"/.test(btn), "…type=button, so it never submits anything", btn);
  //  A real button is focusable and Enter/Space-activated BY BEING ONE.
  //  Adding tabindex would be the same mistake one element over.
  ok(!/\btabindex\s*=/.test(btn), "…focusable because it is a button, not because of tabindex", btn);
  ok(!/\bonkey/.test(btn), "…Enter and Space are the platform's, not this file's", btn);
  ok(/aria-expanded="false"/.test(btn), "…aria-expanded is false while collapsed", btn);
  ok(/onclick="psRruToggle\(/.test(btn), "…and it toggles the same canonical open state", btn);

  //  ONE control per row. Two would make the ledger a thicket to tab through.
  const count = (closed.match(/class="rru-b"/g) || []).length;
  ok(count === 1, "exactly ONE control per position row", `${count} found`);

  //  It lives in the cell that NAMES the position.
  ok(/<td class="rru-room"><button[^>]*class="rru-b"[^>]*>Room1<\/button><\/td>/.test(closed),
     "on a by-bed property the ROOM cell owns it, and its name is the room",
     (closed.match(/<td class="rru-room">[^]*?<\/td>/) || [""])[0]);
  ok(/<td class="rru-unit">103<\/td>/.test(closed),
     "…and the repeated unit cell stays plain text, so 3 beds are not 3 identical buttons",
     (closed.match(/<td class="rru-unit">[^]*?<\/td>/) || [""])[0]);
  /*  ⚠ THE BUILDING PREFIX IS STRIPPED FOR DISPLAY AND ONLY FOR DISPLAY.
   *  Yardi writes 1417-101 on every row of a rent roll already scoped to
   *  one property. The ledger shows 103; the payload, the database, the
   *  import's natural key and the expanded row all keep 1417-103. Losing
   *  it anywhere but the cell would break reconciliation against the
   *  export it came from.  */
  ok("the ledger cell drops the shared building prefix",
     /<td class="rru-unit">(<button[^>]*>)?103</.test(closed)
     && !/<td class="rru-unit">(<button[^>]*>)?1417-103</.test(closed),
     (closed.match(/<td class="rru-unit">[^]*?<\/td>/) || [""])[0]);
}

// ── X · aria-expanded AND aria-controls REFLECT REAL STATE ──────────────
console.log("\n  ── X · the control describes what is actually on screen ──");
{
  const sid = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
  const openState = { asOf: null, data: null, q: "", filter: "all", open: {} };
  openState.open[sid] = true;
  const box2 = {};
  new Function("esc", "_psRru", "RRU_NIL", "RRU_NOT_ESTABLISHED_LABEL",
    FNS.map(extract).join("\n") + "\n" + FNS.map((f) => `this.${f}=${f};`).join(""))
    .call(box2, esc, openState, '<span class="rru-nil">—</span>', "Occupancy Unconfirmed");

  const opened = box2.psRruRow(bed(), UNIT, COLS_BED);
  const btn = (opened.match(/<button[^>]*class="rru-b"[^>]*>/) || [""])[0];
  ok(/aria-expanded="true"/.test(btn), "expanded reads aria-expanded=true", btn);
  ok(/aria-controls="rru-x-aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"/.test(btn),
     "…and aria-controls names the detail row", btn);
  ok(new RegExp('<tr class="rru-x" id="rru-x-' + sid + '"').test(opened),
     "…which actually exists, with exactly that id",
     (opened.match(/<tr class="rru-x"[^>]*>/) || [""])[0]);

  /*  A DANGLING IDREF IS WORSE THAN NO ATTRIBUTE. The detail row is
   *  rendered on demand, so while collapsed there is nothing to point at
   *  and aria-expanded="false" already carries the meaning.  */
  const closedBtn = (box.psRruRow(bed(), UNIT, COLS_BED).match(/<button[^>]*class="rru-b"[^>]*>/) || [""])[0];
  ok(!/aria-controls/.test(closedBtn),
     "collapsed emits NO aria-controls rather than pointing at an absent id", closedBtn);
  ok(!new RegExp('id="rru-x-').test(box.psRruRow(bed(), UNIT, COLS_BED)),
     "…and indeed the detail row is not rendered while collapsed");
}

// ── G · THE SAME BUILDER, BOTH GRAINS ───────────────────────────────────
console.log("\n  ── G · by-bed and by-unit, one builder, no `if Skyline` ──");
{
  const byUnit = box.psRruRow(wholeUnit(), UNIT, COLS_UNIT);
  ok(/<td class="rru-unit"><button[^>]*class="rru-b"[^>]*>103<\/button><\/td>/.test(byUnit),
     "with no room column the UNIT cell owns the control",
     (byUnit.match(/<td class="rru-unit">[^]*?<\/td>/) || [""])[0]);
  ok((byUnit.match(/class="rru-b"/g) || []).length === 1,
     "still exactly one control");
  ok(!/whole\s*unit/i.test(byUnit), "and '(whole unit)' still never reaches a person");

  //  A position with no room token of its own inside a by-BED property: the
  //  control must not become a button named "—".
  const mixed = box.psRruRow(wholeUnit(), UNIT, COLS_BED);
  ok(/<td class="rru-unit"><button[^>]*>103<\/button><\/td>/.test(mixed),
     "a position with no room label is named by its unit, not by a dash",
     (mixed.match(/<td class="rru-unit">[^]*?<\/td>/) || [""])[0]);
  ok(/<td class="rru-room"><span class="rru-nil">/.test(mixed),
     "…and the room cell stays an honest blank");
  ok((mixed.match(/class="rru-b"/g) || []).length === 1, "still exactly one control");
}

// ── V · THE LEDGER IS UNCHANGED ─────────────────────────────────────────
console.log("\n  ── V · this was semantics, not a redesign ──");
{
  const closed = box.psRruRow(bed(), UNIT, COLS_BED);
  //  Same columns, same order, same count. A control that quietly added or
  //  reordered a cell would break alignment across 72 unit groups.
  const tds = (closed.match(/<td\b/g) || []).length;
  ok(tds === 10, "the row still emits 10 cells", String(tds));
  ok(closed.indexOf('<td class="rru-unit">') < closed.indexOf('<td class="rru-room">')
     && closed.indexOf('<td class="rru-room">') < closed.indexOf('<td class="rru-who">'),
     "…in the same order: Unit, Room, Current resident, …");
  ok(/Molly Rueckel/.test(closed) && /rru-st occupied/.test(closed),
     "…carrying the same facts");
  //  The control must contribute no chrome. Anything with a border, a
  //  background or padding costs a row of the ~30 an operator sees at once.
  const css = html.slice(html.indexOf(".rru-b{"), html.indexOf(".rru-b:focus"));
  ok(/border:0/.test(css) && /padding:0/.test(css) && /background:none/.test(css),
     "the control has no border, no padding and no background", css.slice(0, 160));
  ok(/font:inherit/.test(css) && /color:inherit/.test(css),
     "…and inherits the ledger's own typography rather than a button's");
  //  Focus is drawn with outline, which does not participate in layout —
  //  a border or box-shadow ring would nudge 160 rows on focus.
  const focusCss = html.slice(html.indexOf(".rru-b:focus-visible"),
                              html.indexOf(".rru-b:focus-visible") + 90);
  ok(/outline:/.test(focusCss) && !/border:/.test(focusCss),
     "the focus ring is an outline, so focusing a row shifts nothing", focusCss);
  //  And nothing implies the row is still focusable.
  ok(!/\.rru-r:focus/.test(html),
     "no leftover :focus rule on the row claiming a focusability it no longer has");
}

console.log("\n" + "═".repeat(72));
console.log(`  ${fail === 0 ? "✓ PASS" : "✗ FAIL"} — ${pass} passed, ${fail} failed`);
if (fail) console.log("  FAILED: " + failures.join(" | "));
console.log("═".repeat(72) + "\n");
process.exit(fail === 0 ? 0 : 1);
