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
// The baseline has no whole-position economics helper. Include it once the
// product defines it so the same emitted row/detail entrypoints can execute
// before and after without making a missing proposed symbol the red.
const OPTIONAL_FNS = ["psRruCurrentRent"].filter((name) =>
  html.includes("function " + name + "("));
const RUN_FNS = FNS.concat(OPTIONAL_FNS);
const box = {};
new Function("esc", "_psRru", "RRU_NIL", "RRU_NOT_ESTABLISHED_LABEL",
  RUN_FNS.map(extract).join("\n") + "\n" +
  RUN_FNS.map((f) => `this.${f}=${f};`).join(""))
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
    RUN_FNS.map(extract).join("\n") + "\n" + RUN_FNS.map((f) => `this.${f}=${f};`).join(""))
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

console.log("\n  ── E · current economics and retained amounts stay separate ──");
{
  const currentRentSource = extract("psRruCurrentRent");
  const rowSource = extract("psRruRow");
  ok(/p\.economics_state\s*===\s*'available'/.test(currentRentSource),
     "current dollars require the whole position's explicit available state", currentRentSource);
  ok(!/\.amount\b|Number\(|parse(Float|Int)\(|[<>]\s*0/.test(currentRentSource),
     "the current renderer performs no amount classification", currentRentSource);
  ok(/psRruCurrentRent\(p\)/.test(rowSource) && /psRruRent\(n\.rent\)/.test(rowSource)
     && !/psRruCurrentRent\(n/.test(rowSource),
     "current position economics never governs the separate next term", rowSource);

  const lease = (amount, state = "known", resident = "Molly Rueckel") => ({
    resident, person_id: "p1", lease_id: "l1", rent: { amount, state },
    started: "2026-08-01", through: "2027-07-31", proof_basis: "confirmed_opening_import",
  });
  const successor = (amount, state = "known") => ({
    resident: "Next Resident", person_id: "p2", lease_id: "l2",
    rent: { amount, state }, starts: "2027-08-01", through: "2028-07-31",
    state: "locked", proof_basis: "native_verified",
  });
  const cells = (row) => [...row.matchAll(/<td\b[^>]*>[^]*?<\/td>/g)].map((m) => m[0]);

  const negative = bed({ economics_state: "unavailable", current: lease(-375), next: successor(1500) });
  const negativeCells = cells(box.psRruRow(negative, UNIT, COLS_BED));
  ok(/Unavailable/.test(negativeCells[3]) && !/\$-?375/.test(negativeCells[3]),
     "negative current amount renders unavailable, not contractual dollars", negativeCells[3]);
  ok(/\$1,500/.test(negativeCells[7]),
     "current unavailability does not contaminate a positive next-term amount", negativeCells[7]);

  const zeroCells = cells(box.psRruRow(
    bed({ economics_state: "unavailable", current: lease(0), next: null }), UNIT, COLS_BED));
  ok(/Unavailable/.test(zeroCells[3]) && !/\$0/.test(zeroCells[3]),
     "zero current amount renders unavailable, not contractual dollars", zeroCells[3]);

  for (const [axis, label] of [[undefined, "missing"], ["unknown", "unknown"],
                                ["not_applicable", "not-applicable"]]) {
    const legacy = bed({ current: lease(1425), next: successor(1500) });
    if (axis === undefined) delete legacy.economics_state;
    else legacy.economics_state = axis;
    const legacyCells = cells(box.psRruRow(legacy, UNIT, COLS_BED));
    ok(/Unavailable/.test(legacyCells[3]) && !/\$1,425/.test(legacyCells[3]),
       `${label} current economics axis cannot revive recorded dollars`, legacyCells[3]);
    ok(/\$1,500/.test(legacyCells[7]),
       `${label} current economics axis does not govern the next term`, legacyCells[7]);
  }

  const positiveCells = cells(box.psRruRow(
    bed({ economics_state: "available", current: lease(1425), next: null }), UNIT, COLS_BED));
  ok(/\$1,425/.test(positiveCells[3]) && !/Unavailable/.test(positiveCells[3]),
     "available positive current amount remains visible", positiveCells[3]);

  const missingCells = cells(box.psRruRow(
    bed({ economics_state: "unavailable", current: lease(null, "not_in_source"), next: null }), UNIT, COLS_BED));
  ok(/Unknown/.test(missingCells[3]) && !/Unavailable/.test(missingCells[3]),
     "owner-provided not-in-source remains distinct from unavailable economics", missingCells[3]);

  const noCurrentCells = cells(box.psRruRow(
    bed({ economics_state: "not_applicable", current: null, next: successor(1500) }), UNIT, COLS_BED));
  ok(/rru-nil/.test(noCurrentCells[3]), "no current lease keeps the not-applicable dash", noCurrentCells[3]);
  ok(/\$1,500/.test(noCurrentCells[7]), "a next term remains visible when no current lease exists", noCurrentCells[7]);

  const nestedUnavailableCells = cells(box.psRruRow(bed({
    economics_state: "available", current: lease(1425), next: successor(0, "unavailable"),
  }), UNIT, COLS_BED));
  ok(/\$1,425/.test(nestedUnavailableCells[3]),
     "current dollars use the current position economics", nestedUnavailableCells[3]);
  ok(/Unavailable/.test(nestedUnavailableCells[7]) && !/\$0/.test(nestedUnavailableCells[7]),
     "an explicitly unavailable nested next rent is honored independently", nestedUnavailableCells[7]);

  const detail = box.psRruDetail(negative, UNIT, COLS_BED);
  ok(/<k>Contracted rent<\/k><v class="unk">Unavailable<\/v>/.test(detail),
     "expanded detail states that contractual rent is unavailable", detail);
  ok(/<k>Recorded amount<\/k><v>\$-375 · retained for source review<\/v>/.test(detail),
     "expanded detail retains the recorded source amount on demand", detail);
  ok(!/<k>Contracted rent<\/k><v>\$-375<\/v>/.test(detail),
     "expanded detail never presents the retained amount as trusted contract rent", detail);

  const missingAxisDetail = box.psRruDetail(
    bed({ current: lease(1425), next: null }), UNIT, COLS_BED);
  ok(/<k>Contracted rent<\/k><v class="unk">Unavailable<\/v>/.test(missingAxisDetail),
     "expanded legacy row without an economics axis does not revive contract dollars", missingAxisDetail);
  ok(/<k>Recorded amount<\/k><v>\$1,425 · retained for source review<\/v>/.test(missingAxisDetail),
     "expanded legacy row retains its recorded amount only for source review", missingAxisDetail);

  const missingDetail = box.psRruDetail(
    bed({ economics_state: "unavailable", current: lease(null, "not_in_source"), next: null }), UNIT, COLS_BED);
  ok(/<k>Contracted rent<\/k><v class="unk">Unknown<\/v>/.test(missingDetail),
     "expanded missing rent keeps its established Unknown wording", missingDetail);
  ok(!/<k>Recorded amount<\/k>/.test(missingDetail),
     "a source that supplied no amount does not invent a retained amount", missingDetail);

  // A Future Rent Roll is the same dated read at a later `as_of`. Once the
  // former successor spans that date it arrives as `current`, with its own
  // position-level economics. No prior current-term flag may follow it.
  const laterDate = bed({ economics_state: "available", current: successor(1500), next: null });
  const laterCells = cells(box.psRruRow(laterDate, UNIT, COLS_BED));
  ok(/\$1,500/.test(laterCells[3]) && !/Unavailable/.test(laterCells[3]),
     "a later-date current term uses that dated position's own economics", laterCells[3]);
}

// ── S · ONE GLOBAL, ACCESSIBLE VIEW ORDER ───────────────────────────────
console.log("\n  ── S · sorting and view controls are one composable ledger state ──");
{
  const paintSource = extract("psRruPaint");
  const liveSource = extract("psLiveUnitRentRoll");
  const sortHeadSource = extract("psRruSortHead");
  const shownSource = extract("psRruShownReferences");
  ok(/data-sort-key/.test(sortHeadSource) && /aria-sort/.test(sortHeadSource),
     "the emitted ledger exposes accessible sortable column headers", sortHeadSource);
  ok(/refs\.sort\(/.test(shownSource) && !/u\.positions\.sort\(/.test(shownSource),
     "sorting is global across copied position references, never per-unit payload mutation", shownSource);
  ok(/aria-pressed/.test(liveSource) && /psRruResetView/.test(liveSource),
     "status switches expose active state and the live view offers one reset", liveSource.slice(-1600));
  ok(/value=["']\s*["']\s*\+\s*esc\(_psRru\.q\)/.test(liveSource),
     "the visible search value survives a dated reread", liveSource.slice(-1600));
  ok(liveSource.indexOf("if(!managementLeafReadCurrent(leafContext)) return")
       < liveSource.indexOf("_psRru.data = d"),
     "the existing dated-leaf guard precedes every response-driven view write");
  ok(/_psRru\.scope\s*!==\s*readScope/.test(liveSource)
     && /_psRru\.q\s*=\s*''/.test(liveSource) && /_psRru\.sortKey\s*=\s*null/.test(liveSource),
     "a property or actor scope change clears the old query, status and sort", liveSource.slice(0, 1200));
  ok(/f\.key\s*===\s*_psRru\.filter/.test(liveSource),
     "a selected zero-count status remains a visible active choice after a date refresh");
  ok(/!roomGrain\s*&&\s*_psRru\.sortKey\s*===\s*'room'/.test(liveSource),
     "a room sort returns to the natural default when the dated read is whole-unit grain");

  const sortState = { asOf:"2026-09-13", data:null, q:"", filter:"all", sortKey:null,
    sortDir:"asc", open:{}, scope:"staff:property", cols:{room:true,count:10,unitPrefix:""} };
  const host = { innerHTML:"" }, count = { textContent:"" }, query = { value:"" };
  const reset = { disabled:false };
  const mobileSort = { value:"" };
  const direction = { disabled:false, textContent:"", attrs:{}, focus(){},
    setAttribute(k,v){ this.attrs[k]=v; } };
  const filterButtons = ["all","occupied","open","needs_review"].map((key) => ({
    key, attrs:{"data-k":key}, on:false,
    getAttribute(k){ return this.attrs[k]; }, setAttribute(k,v){ this.attrs[k]=v; },
    classList:{ toggle(_name,on){ this._owner.on=on; }, _owner:null },
  }));
  filterButtons.forEach((b) => { b.classList._owner=b; });
  const fakeDocument = {
    getElementById(id){ return ({psRruBody2:host,psRruCount:count,psRruQ:query,
      psRruReset:reset,psRruSort:mobileSort,psRruSortDirection:direction})[id] || null; },
    querySelectorAll(sel){ return sel === ".rru-f button[data-k]" ? filterButtons : []; },
    querySelector(){ return null; },
  };
  const sortFns = ["psRruSearch","psRruSetFilter","psRruSetSort","psRruChooseSort",
    "psRruToggleSortDirection","psRruResetView","psRruRentSortValue",
    "psRruCurrentRentSortValue","psRruSortValue","psRruCompareValue",
    "psRruNaturalPosition","psRruCompare","psRruShownReferences","psRruSortHead",
    "psRruSyncControls","psRruPassesFilter","psRruMatchesQ","psRruPaint"];
  const sortBox = {};
  const sortAllFns = [...new Set(RUN_FNS.concat(sortFns))];
  const sortKeys = {unit:true,room:true,current_resident:true,current_rent:true,current_end:true,
    next_resident:true,next_start:true,next_rent:true,status:true};
  const filters = [{key:"all"},{key:"occupied"},{key:"activation_pending"},{key:"open"},
    {key:"needs_review"},{key:"not_established"}];
  new Function("esc","_psRru","RRU_NIL","RRU_NOT_ESTABLISHED_LABEL","document",
    "psRruFit","RRU_SORT_KEYS","RRU_NATURAL","RRU_FILTERS","setTimeout","clearTimeout",
    "var _psRruQTimer=null;\n" + sortAllFns.map(extract).join("\n") + "\n" +
    sortAllFns.map((f) => `this.${f}=${f};`).join(""))
    .call(sortBox, esc, sortState, '<span class="rru-nil">—</span>', "Occupancy Unconfirmed",
      fakeDocument, () => {}, sortKeys, new Intl.Collator(undefined,{numeric:true,sensitivity:"base"}),
      filters, (fn) => { fn(); return null; }, () => {});

  const current = (resident, amount, through, state="known") => ({resident,person_id:"p-"+resident,
    lease_id:"l-"+resident,rent:{amount,state},started:"2026-01-01",through,
    proof_basis:"native_verified"});
  const future = (resident, amount, starts, state="known") => ({resident,person_id:"n-"+resident,
    lease_id:"nl-"+resident,rent:{amount,state},starts,through:"2030-01-01",
    state:"locked",proof_basis:"native_verified"});
  const position = (id,label,over={}) => Object.assign({space_id:id,label,bucket:"occupied",
    bucket_label:"Occupied",detail:{},economics_state:"available",current:null,next:null},over);
  const payload = { totals:{rentable_positions:5}, units:[
    {unit_id:"u10",unit_number:"Unit10",positions:[
      position("s10b10","Bed10",{bucket:"open",bucket_label:"Open"}),
      position("s10b2","Bed2",{current:current("Zoe",2000,"2028-01-01"),
        next:future("Ava",1000,"2029-01-01")}),
    ]},
    {unit_id:"u2",unit_number:"Unit2",positions:[
      position("s2b10","Bed10",{economics_state:"unavailable",
        current:current("Kai",-375,"2026-05-01"),next:future("Yuri",1800,"2027-05-01"),
        bucket:"needs_review",bucket_label:"Needs Review"}),
      position("s2b2","Bed2",{current:current("Ann",1500,"2027-01-01"),
        next:future("Bea",0,"2027-08-01","unavailable"),bucket:"activation_pending",
        bucket_label:"Pending Activation"}),
    ]},
    {unit_id:"u3",unit_number:"Unit3",positions:[
      position("s3b1","Bed1",{current:current("Mike",1000,"2029-01-01")}),
    ]},
  ]};
  const original = JSON.stringify(payload);
  sortState.data = payload;
  const order = () => [...host.innerHTML.matchAll(/<tr class="rru-r(?: on)?"[^>]*data-space-id="([^"]+)"/g)]
    .map((m) => m[1]);
  const setOrder = (key,dir) => { sortState.sortKey=key; sortState.sortDir=dir; sortBox.psRruPaint(); return order(); };

  sortBox.psRruPaint();
  ok(order().join(",") === "s2b2,s2b10,s3b1,s10b2,s10b10",
     "default order is natural Unit then Room (Unit2 before Unit10)", order().join(","));
  ok((host.innerHTML.match(/aria-sort="none"/g) || []).length === 9,
     "all nine sortable headers begin with an explicit unsorted state");

  ok(setOrder("current_rent","asc").join(",") === "s3b1,s2b2,s10b2,s2b10,s10b10",
     "current rent sorts globally and leaves unavailable/no-lease values at the bottom ascending", order().join(","));
  ok(setOrder("current_rent","desc").join(",") === "s10b2,s2b2,s3b1,s2b10,s10b10",
     "current rent leaves unavailable/no-lease values at the bottom descending", order().join(","));
  ok(/aria-sort="descending"[^]*data-sort-key="current_rent"[^]*>Rent<span[^>]*>↓/.test(host.innerHTML),
     "the sorted header exposes descending state and a visible direction cue");

  ok(setOrder("current_end","asc").slice(0,4).join(",") === "s2b10,s2b2,s10b2,s3b1",
     "current lease ends sort chronologically from ISO dates", order().join(","));
  ok(setOrder("next_start","desc").slice(0,3).join(",") === "s10b2,s2b2,s2b10",
     "next starts sort chronologically in the selected direction", order().join(","));
  ok(setOrder("next_rent","desc").slice(0,2).join(",") === "s2b10,s10b2",
     "next rent uses its own nested state even when current economics are unavailable", order().join(","));
  ok(order().slice(-3).join(",") === "s2b2,s3b1,s10b10",
     "unavailable and absent next rents remain deterministic and null-bottom", order().join(","));

  sortState.open.s2b2 = true;
  setOrder("current_resident","asc");
  ok(/data-space-id="s2b2"[^]*id="rru-x-s2b2"/.test(host.innerHTML),
     "sorting preserves the open detail attached to the exact durable space");
  ok(JSON.stringify(payload) === original,
     "filtering and sorting never mutate the canonical response payload");

  sortBox.psRruSetFilter("occupied");
  sortBox.psRruSearch("Unit10");
  ok(order().join(",") === "s10b2",
     "status and search compose over the same globally sorted references", order().join(","));
  const occupiedButton = filterButtons.find((b) => b.key === "occupied");
  ok(occupiedButton.on && occupiedButton.attrs["aria-pressed"] === "true"
     && !filterButtons.find((b) => b.key === "all").on,
     "a filter click updates its visible and accessible active state");

  sortBox.psRruResetView();
  ok(sortState.q === "" && sortState.filter === "all" && sortState.sortKey === null
     && sortState.asOf === "2026-09-13" && sortState.scope === "staff:property",
     "Reset view clears search/status/sort without changing date or property scope");
  ok(order().join(",") === "s2b2,s2b10,s3b1,s10b2,s10b10" && /id="rru-x-s2b2"/.test(host.innerHTML),
     "Reset restores natural order while preserving exact-space disclosure state", order().join(","));
  ok(query.value === "" && reset.disabled
     && filterButtons.find((b) => b.key === "all").attrs["aria-pressed"] === "true",
     "Reset synchronizes the search, status switch and reset control");
  ok(/id="psRruSort"/.test(liveSource) && /id="psRruSortDirection"/.test(liveSource),
     "the narrow ledger exposes a conventional Sort by field and direction control");
  const sortCss = html.slice(html.indexOf(".rru-sort-select{"), html.indexOf(".rru-sort-direction[disabled]"));
  ok(/height:28px/.test(sortCss) && /padding:0 6px!important/.test(sortCss)
     && /border-radius:0!important/.test(sortCss),
     "the narrow native select retains a visible content box under global mobile form styles", sortCss);
  ok(/id="psRruPrintExport"[^]*psLiveInstitutionalRentRoll\(_psRru\.asOf\)/.test(liveSource),
     "Print / export opens the existing formal schedule at the selected date");
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
