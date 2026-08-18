/* ══════════════════════════════════════════════════════════════════════════
   rent_roll_server_classification.test.js
   THE BROWSER DISPLAYS THE CLASSIFICATION. IT DOES NOT MAKE ONE.

   ── WHAT WENT WRONG, SO THIS FILE KNOWS WHAT IT IS GUARDING ─────────────
   The Rent Roll had two classifiers. The server decided a bucket per
   rentable position; the browser then decided again, in psRruStatus, from
   `current` / `next` / `conflict_state` / `is_down`, ending:

       return 'open';

   That fallback is Open by subtraction. Every position the browser could
   not recognise — committed and awaiting activation, contested between two
   leases, or with no established fact at all — was rendered Open. Open is
   the one wrong answer that costs money, because it offers a prospect a bed
   Spine cannot say is free.

   And because the headline counts came from the server's totals while the
   rows came from the browser's opinion, the page could disagree with its
   own header and nothing would throw.

   ── WHY A TEST AND NOT A CODE REVIEW ────────────────────────────────────
   The regression is silent by construction. A reintroduced derivation
   renders a full, plausible, well-formatted rent roll. Nothing errors,
   nothing looks broken, and the number is simply wrong. Only an assertion
   stands between here and the old defect.

   ── WHAT IS ASSERTED, AND WHAT IS DELIBERATELY NOT ──────────────────────
   The CONTRACT: the bucket travels from the server to the glass unchanged,
   and no tenancy meaning is manufactured in JavaScript. NOT the prose —
   `bucket_label` is the server's wording and this file must not become the
   place that pins it, or rewording the server goes red here for no reason.

   Method matches rent_roll_cutover_app.test.js: the real functions are
   lifted out of index.html and run.

   Run:  node rent_roll_server_classification.test.js
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

function extract(name, kw) {
  const sig = (kw || "function ") + name + "(";
  const start = html.indexOf(sig);
  if (start < 0) throw new Error("not found in index.html: " + sig);
  const open = html.indexOf("{", start);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  return html.slice(start, i);
}
function slice(from, to) {
  const a = html.indexOf(from);
  if (a < 0) throw new Error("not found in index.html: " + from);
  const b = html.indexOf(to, a);
  if (b < 0) throw new Error("not found after " + from + ": " + to);
  return html.slice(a, b);
}
const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

const FNS = ["psRruMoney", "psRruDate", "psRruDateLong", "psRruRent",
             "psRruSharedPrefix", "psRruUnitText", "psRruLabel",
             "psRruStatus", "psRruStatusLabel", "psRruProven", "psRruException",
             "psRruDetail", "psRruCtl", "psRruRow", "psRruRowClick",
             "psRruPassesFilter"];
const state = { asOf: null, data: null, q: "", filter: "all", open: {} };
const box = {};
new Function("esc", "_psRru", "RRU_NIL", "RRU_NOT_ESTABLISHED_LABEL",
  FNS.map((f) => extract(f)).join("\n") + "\n" +
  FNS.map((f) => `this.${f}=${f};`).join(""))
  .call(box, esc, state, '<span class="rru-nil">—</span>', "Occupancy Unconfirmed");

const COLS = { room: true, count: 10, unitPrefix: "1417-" };
const UNIT = { unit_id: "u1", unit_number: "1417-109", source_file: "RentRoll07_1417.xlsx" };

/*  ONE FIXTURE SHAPE, FIVE SERVER DECISIONS.
 *
 *  Every bed below carries the SAME operating payload — no current lease,
 *  no next commitment, nothing for a browser-side rule to key off. That is
 *  the point: if the browser were still deriving, all five would render
 *  identically (and identically WRONG — the old rule returned 'open' for
 *  every one of them). They differ only in what the server decided, so the
 *  five rows can only come out different if the decision is being relayed. */
const bed = (over) => Object.assign({
  space_id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa", label: "A",
  detail: { use_type: "residential", square_feet: null },
  current: null, next: null,
}, over || {});

const CASES = [
  { bucket: "occupied",           label: "Occupied" },
  { bucket: "activation_pending", label: "Pending Activation" },
  { bucket: "open",               label: "Open" },
  { bucket: "needs_review",       label: "Needs Review",
    reason: "Overlapping operative leases on this position." },
  //  THE ONE THAT USED TO BECOME OPEN.
  { bucket: null,                 label: "Occupancy Unconfirmed",
    reason: "Spine holds no authoritative fact establishing this bed." },
];

console.log("\n" + "═".repeat(72));
console.log("  RENT ROLL — the server classifies, the browser displays");
console.log("═".repeat(72) + "\n");

// ── 1 · EVERY SERVER BUCKET REACHES THE GLASS AS ITSELF ─────────────────
console.log("  ── 1 · the decision survives the trip to the row ──");
const rendered = {};
for (const c of CASES) {
  const p = bed({ bucket: c.bucket, bucket_label: c.bucket === null ? null : c.label,
                  bucket_reason: c.reason || null,
                  bucket_reason_code: c.reason ? "SOME_CODE" : null });
  const row = box.psRruRow(p, UNIT, COLS);
  const cell = (row.match(/<span class="rru-st [^"]*">[^<]*<\/span>/) || [""])[0];
  rendered[String(c.bucket)] = cell;
  ok(cell.includes(">" + esc(c.label) + "<"),
    `server bucket ${c.bucket === null ? "null" : c.bucket} displays as "${c.label}"`, cell);
  //  The machine-readable half: the bucket rides as the CSS class, so
  //  styling, filtering and the label can never point at different states.
  const cls = c.bucket === null ? "not_established" : c.bucket;
  ok(new RegExp('class="rru-st ' + cls + '"').test(cell),
    `…and carries the bucket as its class: ${cls}`, cell);
}

// ── 2 · THE ONE THAT USED TO BECOME OPEN ────────────────────────────────
console.log("\n  ── 2 · a position with no established basis is not Open ──");
{
  const cell = rendered["null"];
  ok(!/>Open</.test(cell), "an unestablished bed is NOT rendered Open", cell);
  ok(!/rru-st open/.test(cell), "…and is not styled as Open either", cell);
  ok(!/NOT_ESTABLISHED/.test(cell),
    "…and API vocabulary never reaches the glass", cell);
  //  Distinct from every other state, or it is being folded into one.
  const distinct = new Set(Object.values(rendered).map((c) => (c.match(/>([^<]*)</) || [])[1]));
  ok(distinct.size === CASES.length,
    `all ${CASES.length} server decisions render distinctly (${distinct.size} distinct)`,
    [...distinct].join(" | "));
}

// ── 3 · NOTHING IN THE ROW PATH DERIVES TENANCY MEANING ─────────────────
console.log("\n  ── 3 · the row path derives nothing ──");
{
  const statusU = extract("psRruStatus");
  ok(/\bp\.bucket\b/.test(statusU), "status reads the server's bucket");
  for (const d of ["p.current", "p.next", "conflict_state", "is_down",
                   "evidence_state", "tenancy_state", "economics_state"]) {
    ok(!statusU.includes(d), `status does not consult ${d}`);
  }
  ok(!/return\s*'open'/.test(statusU),
    "status has no Open fallback — that fallback WAS the defect");

  //  Filtering narrows. It does not classify.
  const passesU = extract("psRruPassesFilter");
  ok(/psRruStatus\(/.test(passesU), "the filter asks the same relay the row does");
  for (const d of ["p.current", "p.next", "conflict_state", "is_down"]) {
    ok(!passesU.includes(d), `the filter does not re-derive from ${d}`);
  }

  //  Every filter key is a value the server actually counts, so a chip
  //  cannot select a category that has no totals field behind it.
  const filtersU = slice("var RRU_FILTERS", "function psRruPassesFilter");
  const keys = [...filtersU.matchAll(/key:\s*'([a-z_]+)'/g)].map((m) => m[1]);
  const SERVER_BUCKETS = ["occupied", "activation_pending", "open", "needs_review",
                          "not_established"];
  ok(keys.length === SERVER_BUCKETS.length + 1 && keys[0] === "all",
    "the filter set is 'all' plus exactly the server's categories", keys.join(","));
  for (const k of SERVER_BUCKETS) {
    ok(keys.includes(k), "filter key exists for server category: " + k);
  }
  for (const stale of ["committed", "pending", "exceptions", "exception", "contested",
                       "unresolved"]) {
    ok(!keys.includes(stale),
      `no filter offers "${stale}" — the server does not count it`);
  }
}

// ── 4 · THE EXPLANATION IS THE SERVER'S TOO ─────────────────────────────
console.log("\n  ── 4 · why a bed is what it is comes from the server ──");
{
  const excU = extract("psRruException");
  ok(/bucket_reason/.test(excU), "the tenancy explanation is the server's bucket_reason");
  ok(!/conflict_state|evidence_state/.test(excU),
    "…not re-derived from conflict_state / evidence_state");
  const nr = bed({ bucket: "needs_review", bucket_label: "Needs Review",
                   bucket_reason: "Overlapping operative leases on this position.",
                   bucket_reason_code: "OVERLAPPING_OPERATIVE_LEASES" });
  ok(box.psRruException(nr) === "Overlapping operative leases on this position.",
    "a Needs Review bed reports the server's own sentence", String(box.psRruException(nr)));
  //  Operating facts that are NOT tenancy classification stay local — they
  //  are about this row's own data, not about what the position IS.
  const down = bed({ bucket: "open", bucket_label: "Open",
                     detail: { is_down: true } });
  ok(/out of service/i.test(String(box.psRruException(down))),
    "a non-tenancy operating fact is still reported locally");
}

// ── 5 · THE HEADLINE AND THE ROWS ARE ONE DECISION ──────────────────────
console.log("\n  ── 5 · the header cannot disagree with its own rows ──");
{
  const loader = extract("psLiveUnitRentRoll", "async function ");
  const counts = loader.slice(loader.indexOf("var seg = []"),
                              loader.indexOf("var srcBlock"));
  ok(counts.length > 0, "the headline block was located");
  for (const f of ["t.occupied", "t.activation_pending", "t.open", "t.needs_review",
                   "t.not_established", "t.rentable_positions", "t.units"]) {
    ok(counts.includes(f), "the headline reads the server total: " + f);
  }
  /*  A tally computed here is a second interpreter, whatever it agrees
   *  with today. The server already counted the very buckets the rows
   *  render, so the headline must never walk the positions itself.
   *
   *  Note what is NOT banned: `seg.length`, which counts SENTENCE
   *  FRAGMENTS so an empty category is dropped from the line. An earlier
   *  version of this assertion banned `.length` outright and went red on
   *  that — banning a presentation construct because it shares a word
   *  with the thing that matters. What matters is touching the ROWS.  */
  for (const bad of [".filter(", ".reduce(", "d.units", "d.positions", ".rows",
                     "forEach", "for("]) {
    ok(!counts.includes(bad),
      `the headline never walks the positions itself (${bad})`);
  }
  //  And the visible position count is the server's, not the array's.
  const paint = extract("psRruPaint");
  ok(/d\.totals\.rentable_positions/.test(paint),
    "the position count is the server's total, not the rendered array's length");

  //  The chips are offered from the server's totals, so a chip can never
  //  advertise a category the header says is empty.
  const chipsBlock = loader.slice(loader.indexOf("var chips = RRU_FILTERS"),
                                  loader.indexOf("var nav ="));
  ok(/t\[f\.total\]/.test(chipsBlock),
    "a filter chip is offered only when the server counted something for it",
    chipsBlock.slice(0, 200));
}

// ── 6 · THE INTERNAL VOCABULARY STAYS OFF THE GLASS ─────────────────────
console.log("\n  ── 6 · Spine's words are not the operator's words ──");
{
  const surface = slice("function psRruStatus(", "async function psLiveUnitRentRoll(")
    //  Comments explain the correction and legitimately name the old words.
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const internal of ["contractually_occupied", "unreconciled", "inconclusive",
                          "NOT_ESTABLISHED", "governed_by_later_fact"]) {
    ok(!surface.includes("'" + internal + "'") && !surface.includes('"' + internal + '"'),
      `internal vocabulary is not rendered: ${internal}`);
  }
  //  `activation_pending` is a BUCKET KEY and legitimately appears as a
  //  filter value and a CSS class; what must not appear is that string as
  //  something a person reads. The label comes from the server.
  const labelFn = extract("psRruStatusLabel");
  ok(/bucket_label/.test(labelFn) && !/Pending Activation/.test(labelFn),
    "the four operator words are the server's, not a client-side map");
}

console.log("\n" + "═".repeat(72));
if (fail) {
  console.log(`  ✗ FAIL — ${pass} passed, ${fail} failed`);
  failures.forEach((f) => console.log("      · " + f));
  console.log("═".repeat(72) + "\n");
  process.exit(1);
}
console.log(`  ✓ PASS — ${pass} passed, 0 failed`);
console.log("═".repeat(72) + "\n");
