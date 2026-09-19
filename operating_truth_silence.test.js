/* ══════════════════════════════════════════════════════════════════════════
   operating_truth_silence.test.js — A CONFIDENCE SCORE MAY NOT INVENT
   CONFIDENCE.

   WHAT WAS WRONG
   --------------
   operatingTruth() started at 100 and deducted for exactly two things. Both
   were inert, so the dash rendered, for Greenery, in a live signed-in
   session:

       ● Operating Truth  100        "The record is complete and current
                                      — nothing outstanding."

   for a property whose leasing grain had never been read and whose rent roll
   had only just become loadable at all. That is a faked healthy state
   (PHILOSOPHY §5) and a composite silence reported as health, which §40.7
   forbids: composite silence is health ONLY if every required reader
   returned.

   The spend branch could never fire under ANY data. It called .filter() on
   window.__BANK_EVENTS — an object keyed by deal id, `{deal: {eventId: ev}}`
   — inside try{}catch(_){}, so the TypeError was swallowed on every render.
   Its predicate also looked for `property_id`, `confirmed_by` and
   `confirmed_at`, none of which the canonical bank_event shape carries
   (it records a human decision in `confirmation`). Three independent
   mismatches, zero visible symptoms, and the score always read BETTER than
   the truth.

   WHAT THIS PROTECTS
   ------------------
   1. No reader reported  →  score is NULL and the surface says
      "Not established". Not 100, and not 0 either: zero is a verdict.
   2. A test_mode demo transaction never establishes or moves an operator's
      score (§19–20: demo data may exist, demo paths may not).
   3. A real unconfirmed spend item DOES deduct and names itself — i.e. the
      branch is alive now, which is the thing the old test could not have
      told you.
   4. In a signed-in session the baked __OFFLINE_STORE fixture is not a
      reader at all.

   Run:  node operating_truth_silence.test.js
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("   PASS  " + m); } else { fail++; console.log("   FAIL  " + m); } };

/* Brace-match a plain `function name(` out of the page. */
function extract(name) {
  const re = new RegExp("function\\s+" + name + "\\s*\\(");
  const m = re.exec(html);
  if (!m) throw new Error("not found: function " + name);
  const open = html.indexOf("{", m.index + m[0].length - 1);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  return html.slice(m.index, i);
}

/* The functions under test, lifted and RUN — not scanned. _rrSignedIn is a
   parameter so each case can state plainly whether a session exists. */
const build = (signedIn) => new Function("window", "_rrSignedIn", "esc",
  extract("psTruthTone") + "\n" + extract("operatingTruth") + "\n" +
  extract("psScoreRing") + "\n" + extract("psScorePageContent") + "\n" +
  "return {operatingTruth, psTruthTone, psScoreRing, psScorePageContent};");

function api(win, signedIn) {
  const w = win || {};
  return build()(w, () => !!signedIn, (x) => String(x == null ? "" : x));
}

/* The real bank_event shape, as __bankEventRepo stores it. */
const event = (over) => Object.assign(
  { id: "evt_1", deal_id: "greenery-1325", amount: -1156.88, confirmation: null }, over || {});
const bank = (...evs) => ({ "greenery-1325": evs.reduce((m, e) => (m[e.id] = e, m), {}) });

/* The NOI fixtures exactly as index.html bakes them. */
const GREENERY_NOI = { reported: 71888.38, period: "May 2026", annual_budget: 722393,
  trailing: { kind: "t12", value: 784503.78, months_active: 12 } };
const SOLO_NOI = { missing_source: "Requires monthly P&L / reporting package intake." };
const store = (noi) => ({ "greenery-1325": { mgmtRead: { noi } } });

console.log("\n== nothing reported is NOT ESTABLISHED, and it is not 100 ==");
{
  const t = api({}, true).operatingTruth("greenery-1325");
  ok(t.score === null, "score is null when no reader reported");
  ok(t.established === false, "it says so: established === false");
  ok(t.silence === "not_established", "and names WHICH silence (§40.7)");
  ok((t.silent||[]).indexOf("confirmed spend") >= 0 && (t.silent||[]).indexOf("NOI source") >= 0,
    "both silent readers are listed by name, not summed away");
}

console.log("\n== the shipped Greenery case, which used to read a green 100 ==");
{
  // Exactly what a signed-in operator loaded: the baked NOI fixture is present
  // in __OFFLINE_STORE, and the only bank event is the seeded test_mode import.
  const t = api({ __OFFLINE_STORE: store(GREENERY_NOI),
                  __BANK_EVENTS: bank(event({ test_mode: true })) }, true)
            .operatingTruth("greenery-1325");
  ok(t.score !== 100, "it no longer reports a perfect record — score is " + t.score);
  ok(t.established === false, "with a live session, neither input is a reader");
}

console.log("\n== a demo transaction may not move a live operator's score ==");
{
  const demo = api({ __BANK_EVENTS: bank(event({ test_mode: true })) }, true)
               .operatingTruth("greenery-1325");
  ok(demo.established === false && demo.gaps.length === 0,
    "a test_mode event establishes nothing and contributes no gap (§19–20)");
}

console.log("\n== the spend branch is ALIVE — the old one could never fire ==");
{
  const one = api({ __BANK_EVENTS: bank(event({})) }, true).operatingTruth("greenery-1325");
  ok(one.established === true, "a real event makes confirmed spend a reader");
  ok(one.score === 94, "one unconfirmed item costs 6 points (got " + one.score + ")");
  ok(one.gaps.some(g => /1 spend item awaiting confirmation/.test(g)),
    "and the gap says what is outstanding");

  const done = api({ __BANK_EVENTS: bank(event({ confirmation: { operator_id: "kameron" } })) }, true)
               .operatingTruth("greenery-1325");
  ok(done.score === 100 && done.gaps.length === 0, "confirming it clears the deduction");
  ok(done.score !== one.score,
    "confirmed and unconfirmed now DIFFER — under the old reader both read 100");

  const three = api({ __BANK_EVENTS: bank(event({ id: "a" }), event({ id: "b" }), event({ id: "c" })) }, true)
                .operatingTruth("greenery-1325");
  ok(three.score === 82, "three unconfirmed items cost 18 (got " + three.score + ")");
}

console.log("\n== the offline fixture is a reader only when there is no session ==");
{
  const off = api({ __OFFLINE_STORE: store(SOLO_NOI) }, false).operatingTruth("greenery-1325");
  ok(off.established === true && off.score === 88,
    "offline preview still reads its own fixture NOI (got " + off.score + ")");
  const on = api({ __OFFLINE_STORE: store(SOLO_NOI) }, true).operatingTruth("greenery-1325");
  ok(on.established === false,
    "the same fixture is NOT a reader behind a live session (§19–20)");
}

console.log("\n== grey, not red: absent is not a bad score ==");
{
  const A = api({}, true);
  ok(A.psTruthTone({ established: false, score: null }) === "unknown", "no reading tones 'unknown'");
  ok(A.psTruthTone({ established: true, score: 88, silent: [] }) === "brass", "88 with every reader in is brass");
  ok(A.psTruthTone({ established: true, score: 94, silent: [] }) === "green", "94 with every reader in is green");
  ok(A.psTruthTone({ established: true, score: 60, silent: [] }) === "red", "60 is red");
  ok(A.psTruthTone(null) === "unknown", "a missing reading does not throw");

  // §40.7 read strictly: composite silence is health ONLY if every required
  // reader returned. Found in the BROWSER — Greenery rendered a green 100
  // with "confirmed spend" silent.
  ok(A.psTruthTone({ established: true, score: 100, silent: ["confirmed spend"] }) === "brass",
    "a perfect 100 with ONE silent reader is brass, never green");
  ok(A.psTruthTone({ established: true, score: 94, silent: ["NOI source"] }) === "brass",
    "94 with a silent reader is brass too");
  ok(A.psTruthTone({ established: true, score: 60, silent: ["NOI source"] }) === "red",
    "a bad score stays red — silence does not soften a verdict, only a clean bill");

  const ring = A.psScoreRing(null, "unknown");
  ok(/psp-ring-val psp-t-unknown">—</.test(ring), "the ring draws an em dash for no score");
  ok(!/>0</.test(ring), "it does NOT draw a zero");
  ok(A.psScoreRing(88, "brass").indexOf(">88<") > 0, "a real score still draws its number");
}

console.log("\n== the score page says 'Not established', never 'complete and current' ==");
{
  const A = api({}, true);
  const t = A.operatingTruth("greenery-1325");
  const win = { __psScores: { truth: t } };
  const page = build()(win, () => true, (x) => String(x == null ? "" : x)).psScorePageContent("truth");
  ok(page.val === null, "the hero has no value to show");
  ok(page.tone === "unknown", "and is toned grey");
  ok(/Not established\./.test(page.body), "the page leads with Not established");
  ok(!/complete and current/.test(page.body),
    "the old sentence claiming a complete record is gone from this state");
  ok(/confirmed spend — nothing reported/.test(page.body),
    "each silent reader is shown as silent");

  // the page must never call a partial reading clear
  const wP = { __BANK_EVENTS: bank(event({ confirmation: { operator_id: "kz" } })) };
  const AP = build()(wP, () => true, (x) => String(x == null ? "" : x));
  wP.__psScores = { truth: AP.operatingTruth("greenery-1325") };
  const pp = build()(wP, () => true, (x) => String(x == null ? "" : x)).psScorePageContent("truth");
  ok(pp.val === 100, "the number is still shown");
  ok(pp.tone === "brass", "but the hero is brass, not green");
  ok(/PARTIAL reading/.test(pp.body) && /1 reader never reported/.test(pp.body),
    "and the page says in words that it is partial and how many are missing");

  // and the other way: an established reading still renders its number.
  const w2 = { __BANK_EVENTS: bank(event({})) };
  const A2 = build()(w2, () => true, (x) => String(x == null ? "" : x));
  w2.__psScores = { truth: A2.operatingTruth("greenery-1325") };
  const p2 = build()(w2, () => true, (x) => String(x == null ? "" : x)).psScorePageContent("truth");
  ok(p2.val === 94 && /awaiting confirmation/.test(p2.body),
    "an established reading still renders its score and its gaps");
}

console.log("\n== the dash pill renders the words, not just the number ==");
{
  // The pill is a string expression inside the dash renderer. Evaluate the REAL
  // expression rather than grepping for it.
  const m = /'<button class="ps-truth"[\s\S]*?\+ '<\/button>'/.exec(html);
  ok(!!m, "the pill expression was found");
  const expr = new Function("truth", "psTruthTone", "return " + m[0] + ";");
  const A = api({}, true);
  const blank = expr(A.operatingTruth("greenery-1325"), A.psTruthTone);
  ok(/Not established/.test(blank), "with no reader the pill reads 'Not established'");
  ok(/ps-truth-unknown/.test(blank), "and the dot is grey");
  ok(!/>100</.test(blank), "no 100 anywhere in it");
  const live = expr(build()({ __BANK_EVENTS: bank(event({})) }, () => true, String).operatingTruth("greenery-1325"), A.psTruthTone);
  ok(/>94</.test(live), "a real reading renders its number");
  ok(/ps-truth-brass/.test(live) && !/ps-truth-green/.test(live),
    "and is brass, not green, because the NOI reader never reported");
  ok(/ps-truth-part">partial</.test(live), "the pill says PARTIAL beside the number");

  // every reader in → the clean green, and no partial marker
  const wAll = { __BANK_EVENTS: bank(event({ confirmation: { operator_id: "kz" } })),
                 __OFFLINE_STORE: store(GREENERY_NOI) };
  const whole = build()(wAll, () => false, String);   // offline: both readers report
  const t3 = whole.operatingTruth("greenery-1325");
  ok(t3.silent.length === 0, "with both readers reporting nothing is silent");
  const clean = expr(t3, whole.psTruthTone);
  ok(/ps-truth-green/.test(clean) && !/partial</.test(clean),
    "a complete reading is green with no partial marker");
}

console.log("\n== " + pass + " passed, " + fail + " failed ==\n");
process.exit(fail ? 1 : 0);
