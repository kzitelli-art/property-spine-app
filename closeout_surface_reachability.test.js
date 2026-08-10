#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   BOUNDARY 6 · WHICH SURFACE ACTUALLY OWNS THE CLOSEOUT DRAWER?

   Boundary 6 removed the operator's "Mark complete" control. The receipt
   for it was going to be a browser check: open a work order, confirm the
   completion button is gone and the "Not 100% done" control remains.

   That check could not be run, because the operator could not find the
   drawer. The natural next move — hunt through the UI until it appears —
   is the wrong one. If a surface cannot be found by the person who uses
   the product, "I eventually found it" is not evidence that production
   routes there; it is evidence that I know the codebase.

   OWNER RULING: trace it from the code. Do not manufacture a navigation
   path just to satisfy a receipt. If the drawer is stranded, say so and
   move the receipt to the surface that really owns the control.

   ── WHAT THIS COMPUTES ──────────────────────────────────────────────

   A call graph over index.html's top-level functions, then:

     Q1  what function opens the drawer containing the closeout block
     Q2  every call site that invokes it
     Q3  forward reachability from the STATIC entry points — the handlers
         written into the document itself, not into a string another
         function might never emit
     Q4  reachable canonical surface, or stranded legacy

   ── WHY THE ROUTER IS MODELLED SEPARATELY ───────────────────────────

   openMaintenanceModule(key) dispatches to a dozen renderers. A naive
   graph draws an edge to ALL of them and concludes everything is live.
   It is not: a branch is only reachable if some reachable code actually
   EMITS that key. So the router's edges are gated on the emitted-key set,
   and the whole thing runs to a fixpoint.

   The gate is deliberately GENEROUS — any string literal anywhere in a
   reachable body counts as emitting that key, even in a comment. An
   over-approximation that still reports "unreachable" is a finding you
   can trust; a tight one that reports it might just be a parser bug.
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const path = require("path");

//  The source under test. The override exists so the falsification script
//  can point this at a MUTATED copy and confirm the checks actually go red
//  — without that, "19 passed" is a claim about the tool's optimism rather
//  than about the product. It reads a file and asserts; there is no path
//  where pointing it elsewhere makes a real red turn green.
const SRC = process.env.CLOSEOUT_TRACE_SRC || path.join(__dirname, "index.html");
const html = fs.readFileSync(SRC, "utf8");
const lines = html.split("\n");

let pass = 0, fail = 0;
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log("  ok    " + label); }
  else { fail++; console.log("  FAIL  " + label + (detail ? "\n        " + detail : "")); }
  return cond;
};
const say = (s) => console.log(s);

// ── 1 · top-level function spans ────────────────────────────────────
//  Column-0 `function f(` / `async function f(` inside the inline script.
//  Brace depth closes the span. Nested helpers are part of their parent's
//  body, which is what we want: they are not independently addressable.
const DECL = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/;
const fns = new Map();           // name -> {start, end, body}
for (let i = 0; i < lines.length; i++) {
  const m = DECL.exec(lines[i]);
  if (!m) continue;
  let depth = 0, started = false, end = i;
  for (let j = i; j < lines.length; j++) {
    for (const ch of lines[j]) {
      if (ch === "{") { depth++; started = true; }
      else if (ch === "}") depth--;
    }
    if (started && depth <= 0) { end = j; break; }
  }
  //  A later declaration of the same name WINS at runtime (hoisting
  //  overwrites), so keep the last one. index.html has two renderDetail
  //  declarations; only the global one at the bottom is ever called by an
  //  inline handler, and it is the later of the two.
  fns.set(m[1], { start: i + 1, end: end + 1, body: lines.slice(i, end + 1).join("\n") });
}

const NAMES = [...fns.keys()];
say("\n" + "═".repeat(68));
say("  BOUNDARY 6 · CLOSEOUT DRAWER REACHABILITY");
say("═".repeat(68));
say(`  index.html: ${lines.length} lines, ${NAMES.length} top-level functions\n`);
say("  ASSERTIONS STARTED\n");

// ── 2 · the closeout block and the function that emits it ───────────
const NOT_DONE_RE = /Not 100% done/;
const notDoneLines = [];
lines.forEach((l, i) => { if (NOT_DONE_RE.test(l)) notDoneLines.push(i + 1); });

ok("Q1a the 'Not 100% done' control still exists in source",
   notDoneLines.length > 0,
   "nothing to trace — the control is gone entirely, which is NOT what boundary 6 did");

const ownerOf = (line) => {
  let best = null;
  for (const [name, f] of fns) {
    if (line >= f.start && line <= f.end) {
      if (!best || (f.end - f.start) < (fns.get(best).end - fns.get(best).start)) best = name;
    }
  }
  return best;
};
const closeoutOwner = ownerOf(notDoneLines[0]);
ok("Q1b it lives inside exactly one function",
   !!closeoutOwner, "the control is not inside any top-level function");
say(`        line ${notDoneLines[0]} → ${closeoutOwner}()  ` +
    `[${fns.get(closeoutOwner).start}–${fns.get(closeoutOwner).end}]\n`);

// ── 3 · the call graph ──────────────────────────────────────────────
//  Edges include calls written inside template strings (onclick="f()"),
//  because a rendered handler IS a call site the operator can fire.
const calls = new Map();
for (const [name, f] of fns) {
  const out = new Set();
  for (const n of NAMES) {
    if (n === name) continue;
    if (new RegExp("\\b" + n.replace(/\$/g, "\\$") + "\\s*\\(").test(f.body)) out.add(n);
  }
  calls.set(name, out);
}
const callersOf = (target) =>
  NAMES.filter((n) => calls.get(n).has(target));

//  THE CYCLE HAS TO BE CUT, OR THE QUESTION ANSWERS ITSELF.
//
//  The closeout panel renders buttons — woRespond, closeoutNotDone,
//  refreshWorkOrders — and refreshWorkOrders calls the legacy dashboard,
//  which renders rows that call the drawer opener. So the drawer is
//  reachable from the drawer. Left in, the graph reports the whole legacy
//  cluster live off the strength of a loop that can only run once you are
//  ALREADY standing in the thing we are asking how to get to.
//
//  So the edge under test — opener → closeout panel — is removed before
//  reachability is computed. What survives is the honest question: how
//  does an operator get a work order into that drawer the FIRST time?
const CUT = { from: null, to: null };

const drawerOpeners = callersOf(closeoutOwner);
ok("Q2a the closeout function has at least one caller",
   drawerOpeners.length > 0,
   `${closeoutOwner}() is called by nothing at all — dead on arrival`);
say(`        ${closeoutOwner}() is called by: ${drawerOpeners.join(", ")}`);

//  The drawer opener: the caller that actually opens the sheet.
const opener = drawerOpeners.find((n) => /\$\('drawer'\)\.classList\.add\('open'\)/.test(fns.get(n).body))
            || drawerOpeners[0];
say(`        drawer opener = ${opener}()  [line ${fns.get(opener).start}]\n`);

//  THE NAME IS NOT UNIQUE. index.html declares a SECOND renderDetail —
//  renderDetail(body, detail) — nested inside the leasing-queue module,
//  where it shadows the global one for that module's own callers. Its call
//  sites are not call sites of this drawer, and counting them would inflate
//  the answer with an unrelated function that happens to share a name.
//  Detected structurally: an indented declaration of the same name, and any
//  call inside its enclosing block belongs to it.
const shadows = [];
lines.forEach((l, i) => {
  const m = /^\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(l);
  if (!m || m[1] !== opener) return;
  //  Walk out to the enclosing module scope: the nearest preceding line at
  //  lower indentation that opens a block. Cheap and sufficient — we only
  //  need a span that contains the shadowed function's own callers.
  const indent = l.search(/\S/);
  let start = i;
  for (let j = i; j >= 0; j--) {
    const s = lines[j].search(/\S/);
    if (lines[j].trim() && s < indent && /[{(]\s*$/.test(lines[j])) { start = j; break; }
  }
  let depth = 0, started = false, end = i;
  for (let j = start; j < lines.length; j++) {
    for (const ch of lines[j]) {
      if (ch === "{") { depth++; started = true; }
      else if (ch === "}") depth--;
    }
    if (started && depth <= 0) { end = j; break; }
  }
  shadows.push({ decl: i + 1, start: start + 1, end: end + 1 });
});
const shadowed = (line) => shadows.some((s) => line >= s.start && line <= s.end);
ok("Q2b the shadowing declaration of the same name was located and excluded",
   shadows.length > 0,
   `no nested declaration of ${opener} found — if one exists and was missed, ` +
   "its call sites are being scored against the wrong function");
shadows.forEach((s) => say(`        shadow: ${opener}() declared at ${s.decl}, ` +
                           `owns lines ${s.start}–${s.end}`));

//  Every call site of the opener, with its enclosing function.
const openerSites = [];
lines.forEach((l, i) => {
  if (!new RegExp("\\b" + opener + "\\s*\\(").test(l)) return;
  const own = ownerOf(i + 1);
  if (own === opener) return;                       // its own declaration
  if (shadowed(i + 1)) return;                      // belongs to the shadow
  openerSites.push({ line: i + 1, owner: own });
});
CUT.from = opener; CUT.to = closeoutOwner;
calls.get(CUT.from).delete(CUT.to);
say(`        cut for reachability: ${CUT.from}() → ${CUT.to}()  (the edge under test)`);

ok("Q2c every remaining call site is attributable to a top-level function",
   openerSites.length > 0 && openerSites.every((s) => s.owner),
   "call sites found outside any function: " +
   openerSites.filter((s) => !s.owner).map((s) => s.line).join(", "));
say(`        ${openerSites.length} call sites of ${opener}(), in ` +
    `${new Set(openerSites.map((s) => s.owner)).size} distinct functions\n`);

// ── 4 · the static entry points ─────────────────────────────────────
//  A handler written into the DOCUMENT is reachable by definition. A
//  handler written into a template string is reachable only if the
//  function holding that string is itself reachable — which is the whole
//  question, so it cannot be a seed.
//  "OUTSIDE A FUNCTION" IS NOT THE SAME AS "IN THE MARKUP", and the first
//  version of this conflated them. index.html has module IIFEs whose bodies
//  are not top-level `function` declarations, so every onclick="…" inside
//  THEIR template strings looked like document markup. renderDetail was
//  seeded that way, and the graph promptly proved the drawer reachable
//  from itself: renderDetail → workOrderPanel → woRespond →
//  refreshWorkOrders → the fixture dashboard. A perfect circle, and it
//  would have been reported as a live route.
//
//  A seed has to be something the BROWSER fires with no JavaScript having
//  run first. That is: markup outside every <script>, plus boot statements
//  at column 0 of a script.
const scriptSpans = [];
{
  let open = null;
  lines.forEach((l, i) => {
    if (open === null && /<script\b/i.test(l)) open = i + 1;
    if (open !== null && /<\/script>/i.test(l)) { scriptSpans.push([open, i + 1]); open = null; }
  });
  if (open !== null) scriptSpans.push([open, lines.length]);
}
const inScript = (line) => scriptSpans.some(([a, b]) => line >= a && line <= b);
const inAnyFn = (line) => NAMES.some((n) => line >= fns.get(n).start && line <= fns.get(n).end);

const HANDLER = /\bon(?:click|change|input|submit|keydown|load)\s*=\s*["']([^"']*)["']/g;
const seeds = new Set();
lines.forEach((l, i) => {
  const line = i + 1;
  if (!inScript(line)) {
    let m; HANDLER.lastIndex = 0;
    while ((m = HANDLER.exec(l))) {
      for (const n of NAMES) {
        if (new RegExp("\\b" + n.replace(/\$/g, "\\$") + "\\s*\\(").test(m[1])) seeds.add(n);
      }
    }
    return;
  }
  //  Boot code: a bare call at column 0 of a script, not inside any
  //  function. Indentation is the tell — everything nested is indented.
  if (inAnyFn(line)) return;
  for (const n of NAMES) {
    if (new RegExp("^" + n.replace(/\$/g, "\\$") + "\\s*\\(").test(l)) seeds.add(n);
  }
});
ok("Q3a the document defines static entry points",
   seeds.size > 0,
   "no static handlers found — the seed set would be empty and every answer vacuous");
ok("Q3a′ the drawer opener is NOT itself a seed",
   !seeds.has(opener),
   `${opener}() was seeded as an entry point, which makes the drawer trivially ` +
   "reachable from itself. The seed rule is wrong, not the product.");
say(`        ${scriptSpans.length} script region(s); ${seeds.size} static entry points`);
say(`        ${[...seeds].sort().join(", ")}\n`);

// ── 5 · the maintenance router, modelled honestly ───────────────────
const ROUTER = "openMaintenanceModule";
const routerBody = fns.has(ROUTER) ? fns.get(ROUTER).body : "";
const routes = [];                                  // {key, target}
if (routerBody) {
  const RE = /key\s*===\s*'([^']+)'|includes\(key\)|'([^']+)'\s*:/g;
  //  Simpler and exact enough: per line, collect the quoted keys on the
  //  left of the test and the function called on the right.
  routerBody.split("\n").forEach((l) => {
    const targets = NAMES.filter((n) => new RegExp("return\\s+" + n + "\\s*\\(").test(l));
    if (!targets.length) return;
    const keys = [...l.matchAll(/'([a-z_0-9]+)'/g)].map((x) => x[1]);
    keys.forEach((k) => targets.forEach((t) => routes.push({ key: k, target: t })));
  });
}
ok("Q3b the maintenance router's dispatch table was parsed",
   routes.length > 3,
   `only ${routes.length} route(s) recovered from ${ROUTER}() — the model is too weak to trust`);

//  Helpers that take a module key as a PARAMETER and forward it into the
//  router. A body holding a key literal only "emits" that key if it is one
//  of these, or calls the router itself.
const FORWARDERS = NAMES.filter((n) =>
  n !== ROUTER && new RegExp(ROUTER + "\\s*\\(\\s*[\\\\'\"]*\\s*(?:\\$\\{|'\\s*\\+|\"\\s*\\+)").test(fns.get(n).body));
ok("Q3b′ the key-forwarding helpers were identified",
   FORWARDERS.length > 0,
   "no forwarder found — every module key would have to appear in a body that " +
   "names the router directly, which under-reports reachable branches");
say(`        routes: ${routes.length} · forwarders: ${FORWARDERS.join(", ") || "(none)"}`);

// ── 6 · forward fixpoint, router gated on emitted keys ──────────────
//  Provenance is not decoration. "It is reachable" is a claim nobody can
//  check; "it is reachable via THIS chain from THIS static handler" is one
//  anybody can walk. Every entry records the parent that pulled it in, so
//  the receipt prints a route instead of a verdict.
const reach = new Set(seeds);
const via = new Map();                              // name -> {parent, why}
seeds.forEach((s) => via.set(s, { parent: null, why: "static handler in the document" }));

let grew = true;
while (grew) {
  grew = false;
  //  Which module keys does anything reachable actually emit? Generous:
  //  ANY quoted occurrence of the key inside a reachable body counts.
  //  TIGHTENED. "The key appears quoted anywhere" was too generous to be
  //  useful: 'down' occurs in rent-roll code that has nothing to do with
  //  maintenance, and the graph duly reported the turnover dashboard live
  //  by way of hydrateSoloRentRollProjection. A key only counts when it
  //  appears in a body that is actually in the business of routing —
  //  either calling the router directly, or calling one of the helpers
  //  that forwards a key parameter into it.
  const emitted = new Map();                        // key -> emitting function
  for (const n of reach) {
    //  A DISPATCH TEST IS NOT AN EMISSION. The router's own body contains
    //  every key it can handle; counting that as "something emitted it"
    //  makes every branch self-justifying, and it duly reported the
    //  In Progress list live because openMaintenanceModule mentions
    //  'work_inprogress' in the line that routes it.
    if (n === ROUTER) continue;
    const b = fns.get(n).body;
    const routes_here = b.includes(ROUTER) || FORWARDERS.some((h) => new RegExp("\\b" + h + "\\s*\\(").test(b));
    if (!routes_here) continue;
    for (const r of routes) {
      if (!emitted.has(r.key) && new RegExp("['\"]" + r.key + "['\"]").test(b)) emitted.set(r.key, n);
    }
  }
  for (const n of [...reach]) {
    if (n === ROUTER) continue;                     // router edges are gated below
    for (const t of calls.get(n)) {
      if (!reach.has(t)) { reach.add(t); via.set(t, { parent: n, why: "called by" }); grew = true; }
    }
  }
  if (reach.has(ROUTER)) {
    for (const r of routes) {
      if (emitted.has(r.key) && !reach.has(r.target)) {
        reach.add(r.target);
        via.set(r.target, { parent: emitted.get(r.key), why: `${ROUTER}('${r.key}') — key emitted by` });
        grew = true;
      }
    }
  }
}

const chainOf = (n) => {
  const out = []; let cur = n, guard = 0;
  while (cur && guard++ < 40) {
    const v = via.get(cur);
    out.push(v && v.parent ? `${cur}()  ←  ${v.why}` : `${cur}()  ←  ${v ? v.why : "?"}`);
    cur = v && v.parent;
  }
  return out;
};

const reachableOpenerSites = openerSites.filter((s) => reach.has(s.owner));
const strandedOpenerSites  = openerSites.filter((s) => !reach.has(s.owner));

say("  ── every call site of the drawer opener ──────────────────────────");
openerSites.forEach((s) => {
  say(`     ${reach.has(s.owner) ? "REACHABLE " : "stranded  "} ${String(s.line).padStart(6)}  ${s.owner}()`);
});
say("");

// ── 7 · the kind gate, and where work-order rows come from ──────────
//  Being able to CALL the opener is not enough. The opener only builds
//  the closeout panel when the row says kind==='work_order', so a live
//  call site that can only ever hand it a vendor row, a supply row or an
//  obligation does not reach the drawer either.
const kindGate = new RegExp("kind\\s*===\\s*'work_order'").test(fns.get(opener).body);
ok("Q3c the drawer opener gates the closeout panel on kind==='work_order'",
   kindGate,
   "no kind gate found — the reachability answer below would be over-broad");

//  Every function that MINTS a work-order row. These are the only sources
//  that can satisfy the gate.
const producers = NAMES.filter((n) => /kind\s*:\s*['"]work_order['"]/.test(fns.get(n).body));
ok("Q3d at least one function mints kind:'work_order' rows",
   producers.length > 0,
   "no producer found — the gate could never be satisfied by anything, and " +
   "the verdict below would be trivially STRANDED for the wrong reason");
say("  ── producers of kind:'work_order' rows ───────────────────────────");
producers.forEach((p) => say(`     ${reach.has(p) ? "REACHABLE " : "stranded  "} ` +
                             `${String(fns.get(p).start).padStart(6)}  ${p}()`));
say("");

//  THE QUESTION IS ABOUT THE ARGUMENT, NOT THE FUNCTION.
//
//  "Does this function reach a work-order producer somewhere in its call
//  tree" is the wrong test and it was measurably wrong here: a leasing
//  tour renderer shares enough helpers with maintenance that its forward
//  closure touches maintenanceWorkRows, so every tour row was scored as
//  possibly-a-work-order. It is not. The drawer only builds the closeout
//  panel for a row whose kind is 'work_order', so the real question is
//  whether the ROW HANDED TO THIS CALL SITE can be one.
//
//  Handled in two layers, because that is how the code is actually built:
//
//    direct  — the function mints work-order rows, or reads one of the
//              named work-order collections, in its own body
//    generic — a shared row renderer (maintRowsHtml, renderRows,
//              dailySection …) that carries whatever its caller passes,
//              so it carries a work order only if a REACHABLE caller is
//              itself direct
const WO_SOURCE = [
  /kind\s*:\s*['"]work_order['"]/,          // mints one
  /\bworkRows\b/,                            // maintenanceMainCounts' work collection
  /\bwoFlowForProp\s*\(/,                    // the fixture work library
  /\bmaintenanceWorkRows\s*\(/,              // the canonical producer
  /\bm\.(?:closedRows|openRows|newRows|emergency)\b/,   // the derived work buckets
];
const isDirect = (n) => n && WO_SOURCE.some((re) => re.test(fns.get(n).body));

//  For a shared renderer, "some ancestor somewhere handles work orders" is
//  not evidence — climbing the caller chain reaches openDesk(), which is an
//  ancestor of the entire product, and every leasing surface came back
//  scored as a possible work order. So the arguments are read instead: what
//  rows does this caller actually hand to this renderer?
const WO_ARG = [
  /work_order/, /\bworkRows\b/, /woFlowForProp/, /maintenanceWorkRows/,
  /\b(?:closedRows|openRows|newRows)\b/, /flow_bucket/,
];
//  Pull the argument text out of `name( … )`, balancing parens so a nested
//  call inside the argument does not truncate it.
const argsAt = (body, name) => {
  const out = [];
  const re = new RegExp("\\b" + name.replace(/\$/g, "\\$") + "\\s*\\(", "g");
  let m;
  while ((m = re.exec(body))) {
    let d = 1, i = m.index + m[0].length, start = i;
    while (i < body.length && d > 0) {
      if (body[i] === "(") d++;
      else if (body[i] === ")") d--;
      i++;
    }
    out.push(body.slice(start, i - 1));
  }
  return out;
};
//  A bare identifier tells us nothing on its own; resolve it one hop against
//  its assignment in the same body. `renderRows('humanLane', urgentRows)` is
//  only a work-order call if urgentRows came from work-order data — and it
//  did not; it is obligations.
const argCarries = (body, arg) => {
  if (WO_ARG.some((re) => re.test(arg))) return true;
  for (const id of arg.match(/\b[A-Za-z_$][\w$]*\b/g) || []) {
    const a = new RegExp("(?:const|let|var)\\s+" + id + "\\s*=([^;\\n]{0,400})").exec(body);
    if (a && WO_ARG.some((re) => re.test(a[1]))) return true;
  }
  return false;
};

const carrierOf = (owner, within) => {
  if (isDirect(owner)) return { carries: true, why: "mints or reads work-order rows itself" };
  const pool = within ? [...within] : NAMES;
  const fed = pool.filter((f) => f !== owner &&
    argsAt(fns.get(f).body, owner).some((a) => argCarries(fns.get(f).body, a)));
  if (fed.length) return { carries: true, why: "handed work-order rows by " + fed.slice(0, 4).join(", ") };
  return { carries: false, why: "" };
};

const woSites = openerSites.filter((s) => s.owner && carrierOf(s.owner, null).carries);
const liveWoSites = openerSites.filter((s) =>
  s.owner && reach.has(s.owner) && carrierOf(s.owner, reach).carries);

say("  ── call sites that can carry kind:'work_order' to the drawer ─────");
woSites.forEach((s) => {
  say(`     ${reach.has(s.owner) ? "REACHABLE " : "stranded  "} ${String(s.line).padStart(6)}  ${s.owner}()`);
});
say("");

// ── 8 · THE VERDICT ─────────────────────────────────────────────────
const verdict = liveWoSites.length === 0 ? "STRANDED" : "REACHABLE";

ok("Q4  the verdict is computed from the graph, not asserted",
   verdict === "STRANDED" || verdict === "REACHABLE");

//  The finding this file exists to record. It is written as an assertion
//  so that if someone later re-wires a live route into this drawer, this
//  goes RED and the receipt gets revisited instead of quietly rotting.
ok("Q4a the closeout drawer is NOT reachable from any static entry point",
   liveWoSites.length === 0,
   "a live route now reaches the closeout drawer via:\n        " +
   liveWoSites.map((s) => `${s.owner}() at line ${s.line}\n          ` +
                          chainOf(s.owner).join("\n          ")).join("\n        ") +
   "\n        Boundary 6's browser receipt should be taken HERE, and this " +
   "assertion inverted.");

//  And the live door must be the surface that IS reachable, so the
//  finding is "the control moved", not "work orders are unreachable".
const DOOR = "openWorkOrdersDoor";
ok("Q4b the live work-order door IS reachable from a static entry point",
   fns.has(DOOR) && reach.has(DOOR),
   `${DOOR}() is not reachable either — that would mean work orders have no ` +
   "signed-in route at all, which is a far bigger finding than a stranded drawer");

//  ── THE WIDER NET ────────────────────────────────────────────────
//  Q4a resolves an argument ONE hop. That is enough for the shapes in
//  this file, but it under-reports through a shell that forwards a
//  parameter: renderMaintenanceWorkDone hands rows to maintSection, which
//  hands them to maintRowsHtml, which opens the drawer — and the one-hop
//  test loses the trail at maintSection. Under-reporting is the dangerous
//  direction for this question, so it gets its own check with a wider net
//  and no reliance on the first one being right.
//
//  Every function that can reach the drawer at all is a shell. If ANY
//  reachable function hands work-order rows to ANY shell, there is a live
//  route, whatever Q4a concluded.
const forwardAll = (start) => {
  const out = new Set([start]); let g = true;
  while (g) { g = false;
    for (const n of [...out]) for (const t of calls.get(n) || []) if (!out.has(t)) { out.add(t); g = true; } }
  return out;
};
const shells = NAMES.filter((n) => n !== opener && forwardAll(n).has(opener));
const wideHits = [];
for (const s of shells) {
  for (const f of reach) {
    if (f === s) continue;
    const b = fns.get(f).body;
    if (argsAt(b, s).some((a) => argCarries(b, a))) wideHits.push({ shell: s, from: f });
  }
}
say(`        wider net: ${shells.length} drawer-reaching shells × ${reach.size} reachable ` +
    `functions → ${wideHits.length} work-order hand-off(s)`);
wideHits.forEach((h) => say(`          ${h.from}()  →  ${h.shell}()`));

//  ── THE ONE HAND-OFF, AND WHY IT IS STILL NOT A ROUTE ─────────────
//  The net found exactly one: renderMaintenance() pours work-order rows
//  into renderRows('humanLane'|'planLane'), and those rows are clickable
//  markup that calls the drawer opener. In JavaScript terms it IS a route.
//
//  It is not a route an operator can take, because the three lane
//  containers are inside <section class="lanes">, and the Maintenance desk
//  sets body.maintenance-v6-mode, under which .lanes is display:none.
//  The rows are written into markup nobody can see or click.
//
//  That is a WEAKER form of stranding than the call graph gives, and it is
//  worth being uncomfortable about: deleting one CSS line would make the
//  retired-control drawer live again. So the allowance is not a comment —
//  it is three facts, each asserted. If any of them stops holding, this
//  goes red and the Boundary 6 receipt has to be re-taken.
const LANE_IDS = ["humanLane", "autoLane", "planLane"];
const laneMarkup = /<section class="lanes">/.test(html) &&
                   LANE_IDS.every((id) => new RegExp(`id="${id}"`).test(html));
const laneHidden = /body\.maintenance-v6-mode[^{]*\.lanes\{display:none!important\}/.test(html);
const deskSetsMode = NAMES.some((n) =>
  /classList\.toggle\('maintenance-v6-mode',\s*name\s*===\s*'maintenance'\)/.test(fns.get(n).body));

ok("Q4a′-1 the lane containers live inside <section class=\"lanes\">", laneMarkup,
   "the lane ids moved out of the .lanes section — the CSS rule below no longer covers them");
ok("Q4a′-2 body.maintenance-v6-mode hides .lanes with display:none!important", laneHidden,
   "THE HIDING RULE IS GONE. renderMaintenance() writes work-order rows into the lanes, " +
   "and without this rule those rows are visible and clickable — which makes the retired " +
   "completion drawer reachable again from the Maintenance desk.");
ok("Q4a′-3 the Maintenance desk actually sets that class", deskSetsMode,
   "nothing sets maintenance-v6-mode for the maintenance desk, so the hiding rule never applies");

const laneHandoffs = wideHits.filter((h) =>
  h.from === "renderMaintenance" && h.shell === "renderRows");
const unexplained = wideHits.filter((h) => !laneHandoffs.includes(h));

ok("Q4a′ every work-order hand-off into a drawer-reaching shell is accounted for",
   unexplained.length === 0,
   "work-order rows enter a drawer-reaching shell from live code, and NOT through the " +
   "hidden maintenance lanes:\n        " +
   unexplained.slice(0, 12).map((h) => `${h.from}()  →  ${h.shell}()`).join("\n        ") +
   "\n        This is a live route to the retired control. Boundary 6's browser receipt " +
   "should be taken HERE.");
if (laneHandoffs.length) {
  say(`        allowed: ${laneHandoffs.length} hand-off(s) into the hidden maintenance lanes`);
  say("        (JS-reachable, CSS-hidden — held by Q4a′-1/2/3 above, not by assumption)");
}

//  The legacy fixture dashboard names its own successor. Both must agree.
const FIXTURE = "renderMaintenanceWorkOrdersDashboard";
ok("Q4c the legacy fixture dashboard is stranded too",
   !fns.has(FIXTURE) || !reach.has(FIXTURE),
   `${FIXTURE}() is reachable — it renders __WO_FLOW_LIBRARY sample data into a ` +
   "signed-in operator surface, which is a live-first violation, not just a stale path.\n        " +
   (fns.has(FIXTURE) ? chainOf(FIXTURE).join("\n        ") : ""));

say("\n" + "═".repeat(68));
say(`  ${fail === 0 ? "✓ PASS" : "✗ FAIL"} — ${pass} passed, ${fail} failed`);
say("");
say(`  Q1  drawer opener ......... ${opener}()  line ${fns.get(opener).start}`);
say(`      closeout panel ....... ${closeoutOwner}()  line ${fns.get(closeoutOwner).start}`);
say(`  Q2  call sites ............ ${openerSites.length} total, ${woSites.length} can carry a work order`);
say(`  Q3  reachable from static . ${reachableOpenerSites.length} of ${openerSites.length}`);
say(`      …carrying a work order  ${liveWoSites.length}`);
say(`  Q4  VERDICT ............... ${verdict}`);
if (verdict === "STRANDED") {
  say("");
  say("      The drawer holding the removed control is legacy. The live");
  say("      route is openWorkOrdersDoor() → work-lifecycle-door.js.");
  say("      Boundary 6's browser receipt belongs on the LIVE door, and the");
  say("      source receipt (no_operator_completion_proof.test.js) is what");
  say("      covers the stranded drawer.");
}
say("═".repeat(68) + "\n");
process.exit(fail === 0 ? 0 : 1);
