#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   ps_user_id_powerless_proof.test.js — THE TEXT BOX HAS NO POWER LEFT.

   `ps_user_id` is a localStorage value backed by a visible input. Anyone can
   type anything into it. For most of this product's life it was then sent as
   actor_id / approved_by / decided_by_user_id / created_by / confirmed_by,
   and the server behind the shared operator key believed it.

   This harness asserts the end state of the write-authority packet:

     clearing, setting, or FORGING ps_user_id cannot change
       · whether the authenticated employee may act
       · who is recorded as the operator
       · which property is affected

   It reads the shipped index.html as text — the same artifact the browser
   loads. It does not mock the loader, because a mock would prove a mock.

   FALSIFICATION IS BUILT IN. Section D deliberately reintroduces the defect
   in a COPY of the source and requires the detector to catch it. A checker
   that cannot fail has proven nothing — the vacuous-guard lesson from this
   session, applied to the guard itself.
   ════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('   PASS  ' + m); }
                       else { fail++; console.log('   FAIL  ' + m); } };
const section = (s) => console.log('\n── ' + s + ' ' + '─'.repeat(Math.max(0, 58 - s.length)));

const SRC = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

/*  Every field name through which a browser could assert a human identity or
    a property authority. Kept in one place, mirroring the server's
    STAFF_AUTHORITY_ASSERTION_FIELDS. */
const AUTHORITY_FIELDS = [
  'actor_id', 'actor_user_id', 'approved_by', 'decided_by_user_id',
  'by_user_id', 'completed_by', 'confirmed_by', 'recorded_by', 'created_by',
];

/*  A line ASSERTS AUTHORITY if it puts an authority field and a userId()
    read on the same statement. Comments are excluded: this packet documents
    the removals in prose directly above the code, and a comment naming the
    old defect is evidence of the fix, not the defect. */
function assertingLines(src) {
  return src.split('\n').map((l, i) => [i + 1, l])
    .filter(([, l]) => {
      const code = l.replace(/^\s*(\/\/|\*|\/\*).*$/, '');
      if (!/userId\s*\(\s*\)/.test(code)) return false;
      //  Two shapes, both of which put a typed identity where an actor goes:
      //    body.actor_id = userId()      — assignment
      //    body.actor_id || userId()     — fallback, which is the same claim
      //  An earlier version of this file matched only the first, so the
      //  offline-journal uses went undetected and section A2 passed on an
      //  empty set — a guard that proves nothing. Both are matched now.
      return AUTHORITY_FIELDS.some((f) =>
        new RegExp('\\b' + f + '\\b\\s*[:=]').test(code)
        || new RegExp('\\b' + f + '\\b\\s*\\|\\|').test(code));
    });
}

/*  A LIVE write is one that leaves the browser. The offline journal writes
    to a local store and is a classified preview surface, not a server write. */
function isLiveWrite(line) {
  return /getJSON\(|writeAction\(|__psLive\./.test(line);
}

section('A  no live staff write carries a typed identity');
{
  const asserting = assertingLines(SRC);
  const live = asserting.filter(([, l]) => isLiveWrite(l));
  live.forEach(([n, l]) => console.log('        line ' + n + ': ' + l.trim().slice(0, 120)));
  ok('A1  zero live write statements assert an identity from ps_user_id ('
     + live.length + ' found)', live.length === 0);

  //  What remains must be the offline journal only. Named, not hand-waved.
  const remaining = asserting.filter(([, l]) => !isLiveWrite(l));
  //  The offline seam is ONE function. Its real extent is measured, not
  //  guessed with a fixed lookback — a lookback that is too short reports a
  //  legitimate use as a violation, and one that is too long would excuse a
  //  real one. Boundaries: the `window.__offlineWrite = function` assignment
  //  to the next top-level `window.__` assignment after it.
  const offStart = SRC.indexOf('window.__offlineWrite = function');
  const offAfter = SRC.indexOf('\n  window.__', offStart + 10);
  const offEnd = offAfter > 0 ? offAfter : SRC.length;
  const lineOf = (idx) => SRC.slice(0, idx).split('\n').length;
  const [offFirst, offLast] = [lineOf(offStart), lineOf(offEnd)];
  ok('A2a the offline seam boundary was located (lines ' + offFirst + '–' + offLast + ')',
    offStart > 0 && offLast > offFirst);
  const allOffline = remaining.every(([n]) => n >= offFirst && n <= offLast);
  remaining.filter(([n]) => n < offFirst || n > offLast)
    .forEach(([n, l]) => console.log('        OUTSIDE the seam — line ' + n + ': ' + l.trim().slice(0, 110)));
  //  NOT VACUOUS. The classification accepted that the offline preview
  //  journal legitimately stamps a local actor, so this harness must actually
  //  FIND those uses and confirm where they live. Zero found would mean the
  //  detector is blind, not that the tree is clean.
  ok('A2  the detector actually found the classified offline uses ('
     + remaining.length + ' uses)', remaining.length > 0);
  ok('A3  and every one of them is inside the offline preview journal', allOffline);
}

section('B  the governed actions cannot carry an identity even by accident');
{
  //  The body of a registered write action is built by the manifest, not by
  //  the call site. If no buildBody mentions an authority field, no call site
  //  can smuggle one in — that is the structural guarantee, not a convention.
  const registry = SRC.slice(SRC.indexOf('var WRITE_ACTIONS'), SRC.indexOf('async function writeAction'));
  ok('B1  the write-action registry was located', registry.length > 500);
  const leaked = AUTHORITY_FIELDS.filter((f) =>
    new RegExp('b\\.' + f + '\\s*=|' + f + '\\s*:', 'm').test(registry));
  leaked.forEach((f) => console.log('        registry builds body field: ' + f));
  ok('B2  no registered action builds an authority field into its body ('
     + leaked.length + ' leaked)', leaked.length === 0);
  ok('B3  no registered action sends property_id',
    !/property_id\s*[:=]/.test(registry));

  //  The tour verbs migrated in the final wave, each with an empty or
  //  business-only body.
  ['checkInTour', 'confirmProspectTour', 'recordTourReminder',
   'correctTourOutcome', 'denyApplication'].forEach((a) => {
    ok('B4  ' + a + ' is a registered governed action',
      new RegExp('\\b' + a + ':\\s*\\{').test(registry));
  });
}

section('C  the migrated surfaces gate on the SESSION, not on the text box');
{
  //  Signing in is what grants the right to act. A typed user ID must not be
  //  a precondition for anything, and must not substitute for a session.
  const gated = ['tourCheckIn', 'tourSaveCorrection', 'submitApprovalDecision', 'submitTourFeedback'];
  gated.forEach((fn) => {
    const i = SRC.indexOf('function ' + fn + '(');
    const body = i >= 0 ? SRC.slice(i, i + 2200) : '';
    ok('C1  ' + fn + ' exists', i >= 0);
    ok('C2  ' + fn + ' gates on hasSession()', /hasSession\s*\(\s*\)/.test(body));
    ok('C3  ' + fn + ' does NOT require a typed user ID first',
      !/if\s*\(\s*!\s*userId\s*\(\s*\)\s*\)/.test(body));
  });
  //  The specific string the check-in surface used to show.
  ok('C4  "Enter User ID first" is gone from the check-in path',
    !/Enter User ID first/.test(SRC));
}

section('E  WITHHELD CAPABILITIES — the browser never calls a door it knows fails');
{
  //  Two tour-ledger writes cannot execute against the live schema. The app
  //  must say so and send NOTHING — not attempt, not retry, and above all not
  //  write local state or claim a record was made.
  const map = SRC.slice(SRC.indexOf('const WITHHELD_TOUR_CAPABILITY'),
                        SRC.indexOf('const TOUR_VERB_SESSION_ACTION'));
  ok('E1  the withheld-capability map exists', map.length > 100);
  ok('E2  reminder is withheld with its typed code',
    /'reminder':\s*\{[^}]*tour_reminder_unavailable/.test(map));
  ok('E3  correct-outcome is withheld with its typed code',
    /'correct-outcome':\s*\{[^}]*tour_outcome_correction_unavailable/.test(map));
  ok('E4  the reminder explanation is the plain sentence, not a status code',
    /A reminder cannot be recorded through the current tour ledger\./.test(map));
  ok('E5  the correction explanation is the plain sentence',
    /A completed tour outcome cannot currently be corrected through the tour ledger\./.test(map));

  //  THE GUARD MUST COME FIRST. A guard placed after the request would still
  //  hit the server; a guard placed after a local mutation would still lie.
  const ta = SRC.slice(SRC.indexOf('async function tourAction('), SRC.indexOf('async function tourAction(') + 1400);
  const guardAt = ta.indexOf('WITHHELD_TOUR_CAPABILITY');
  const firstCall = Math.min(...['getJSON(', '__psLive.', 'writeAction(']
    .map((t) => { const i = ta.indexOf(t); return i < 0 ? 1e9 : i; }));
  ok('E6  tourAction consults the withheld map BEFORE any request is made',
    guardAt > 0 && guardAt < firstCall);
  ok('E7  and it returns immediately — no request, no local mutation',
    /if\(withheld\)\{\s*toast\('bad', withheld\.say\);\s*return;/.test(ta));

  const tsc = SRC.slice(SRC.indexOf('async function tourSaveCorrection('),
                        SRC.indexOf('async function tourSaveCorrection(') + 2400);
  const gAt = tsc.indexOf("WITHHELD_TOUR_CAPABILITY['correct-outcome']");
  const cAt = tsc.indexOf('__psLive.correctTourOutcome');
  ok('E8  tourSaveCorrection is withheld BEFORE it calls the correction action',
    gAt > 0 && cAt > 0 && gAt < cAt);

  //  NO SUCCESS LANGUAGE ANYWHERE IN THE WITHHELD PATHS.
  const withheldPaths = map + ta.slice(0, guardAt + 200) + tsc.slice(0, gAt + 200);
  const lies = ['recorded.', 'Saved', 'saved', 'Sent', 'sent.', 'completed', 'Corrected', 'Reminded']
    .filter((w) => new RegExp('toast\\(\'ok\'[^)]*' + w).test(withheldPaths));
  ok('E9  no withheld path shows a success toast (' + lies.length + ' found)', lies.length === 0);
  //  reminder must no longer be routed to a governed action at all
  ok('E10 reminder is no longer in the session-action map — it is not dispatched',
    !/TOUR_VERB_SESSION_ACTION\s*=\s*\{[^}]*reminder/.test(SRC));
}

section('D  FALSIFICATION — the detector must catch a reintroduced defect');
{
  //  A copy, never the working tree.
  const broken = SRC.replace(
    'const body=Object.assign({},extra);   // no actor_id, no actor_type',
    'const body=Object.assign({},extra); if(userId()){body.actor_id=userId();} await getJSON("/x",{});');
  ok('D1  the falsification actually modified the copy', broken !== SRC);
  const caught = assertingLines(broken).filter(([, l]) => isLiveWrite(l));
  ok('D2  the detector CATCHES the reintroduced defect (' + caught.length + ' found)',
    caught.length >= 1);
  //  And a comment mentioning the old field must NOT trip it, or the harness
  //  would go red for documenting its own fix.
  const commented = assertingLines('// old code sent actor_id = userId() here\n')
    .filter(([, l]) => isLiveWrite(l));
  ok('D3  a comment naming the old defect does NOT trip the detector',
    commented.length === 0);
}

console.log('\n════ ps_user_id powerless: ' + pass + ' passed, ' + fail + ' failed ════');
if (pass < 35) { console.log('   RUN INVALID — too few assertions executed.'); process.exit(1); }
process.exit(fail ? 1 : 0);
