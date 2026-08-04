#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   spine_read_recommend_proof.test.js — THE CONVERSATIONAL READ SURFACE.

   Asserts the honesty properties of the rendering layer against the shipped
   index.html — the same artifact the browser loads. The server's own claims
   are proven separately in briefing_read_surface_proof.js (API, 41/41).

   The sharp claims here:
     · it is a REAL text input, not a chip that looks conversational
     · it renders NO action button — every write is blocked or withheld, so
       there is no disabled control implying execution is nearly here
     · a destination is offered only when the handler it needs EXISTS
     · a failed read is never rendered as an empty briefing
     · a recommendation is visibly labelled as a suggestion
   ════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('   PASS  ' + m); }
                       else { fail++; console.log('   FAIL  ' + m); } };
const section = (s) => console.log('\n── ' + s + ' ' + '─'.repeat(Math.max(0, 56 - s.length)));

const SRC = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

section('A  a real text input, not a chip');
{
  ok('A1  a text input exists on the dashboard',
    /<input id="spineAskInput"[^>]*type="text"/.test(SRC));
  ok('A2  it is inside a submitting form, so Enter works',
    /<form id="spineAskForm"[^>]*onsubmit="return spineAskSubmit\(event\)"/.test(SRC));
  ok('A3  it is labelled for assistive technology',
    /aria-label="Ask Spine what needs attention"/.test(SRC));
  ok('A4  the surface is reachable from the desk, not console-only',
    /spineAskVisible\(\);/.test(SRC) && /function refreshDesk\(\)\{ try\{ spineAskVisible/.test(SRC));
  ok('A5  it is hidden without a staff session',
    /spineAskVisible[\s\S]{0,400}hasSession\(\)[\s\S]{0,120}classList\.toggle\('hidden', !live\)/.test(SRC));
}

section('B  the client never decides what is supported');
{
  //  The server owns the prompt family. If this file contained its own list,
  //  two vocabularies would drift and the browser would eventually answer a
  //  question the server would have refused.
  const fnStart = SRC.indexOf('async function spineAskSubmit');
  const fn = SRC.slice(fnStart, fnStart + 1400);
  ok('B1  the client sends the raw question and lets the server rule',
    /loadResource\('operatorBriefing', q \? \{ q:q \} : \{\}\)/.test(fn));
  //  Search CODE only. A header comment naming the feature, and the input's
  //  own placeholder, are not a prompt list — an earlier version of this check
  //  flagged both and was measuring the wrong thing.
  const codeOnly = SRC
    .replace(/\/\*[\s\S]*?\*\//g, '')       // block comments
    .replace(/^\s*\/\/.*$/gm, '')            // line comments
    .replace(/placeholder="[^"]*"/g, '');
  ok('B2  the client holds NO prompt list of its own',
    !/['"`][^'"`]*what should i (do|focus)/i.test(codeOnly));
  ok('B3  an unsupported answer renders the SERVER\'s words verbatim',
    /supported === false[\s\S]{0,140}esc\(b\.receipt\)/.test(SRC));
}

section('C  no action is offered — read and recommend only');
{
  const start = SRC.indexOf('function spineRowHtml');
  const block = SRC.slice(start, SRC.indexOf('function spineRenderBriefing'));
  //  Every write verb the receipts audit blocked or withheld.
  const verbs = ['complete', 'resolve', 'reassign', 'approve', 'deny',
                 'send', 'record', 'change due'];
  //  Match a verb as the START OF A CALLED FUNCTION, not anywhere inside the
  //  attribute. An earlier version matched substrings and flagged
  //  `record_id` inside spineGo(...) as a "record" action — a false positive
  //  that would have hidden a real one behind noise.
  const offered = verbs.filter((v) =>
    new RegExp('onclick="\\s*' + v.replace(' ', ''), 'i').test(block));
  offered.forEach((v) => console.log('        row offers action: ' + v));
  ok('C1  no row renders a write action (' + offered.length + ' found)', offered.length === 0);
  ok('C2  the ONLY row action is navigation',
    (block.match(/onclick="/g) || []).length === (block.match(/onclick="spineGo\(/g) || []).length);
  //  A DISABLED button would imply execution is nearly available. There is none.
  ok('C3  no disabled control implies execution is coming',
    !/disabled/i.test(block));
  ok('C4  the whole surface issues no write call',
    !/writeAction\(|__psLive\.(check|complete|approve|deny|confirm|correct|record)/
      .test(SRC.slice(SRC.indexOf('function spineAskVisible'), SRC.indexOf('async function psRenderMyWork'))));
}

section('D  destinations are honest about what can be opened');
{
  ok('D1  a destination map exists', /var SPINE_DEST = \{/.test(SRC));
  //  NOT "the page exists" — "the handler exists in this build".
  ok('D2  availability is decided by whether the HANDLER exists',
    /typeof psRenderMyWork === 'function'/.test(SRC)
    && /typeof openPersonCard === 'function'/.test(SRC)
    && /typeof psOpenApplicationReview === 'function'/.test(SRC)
    && /typeof openWorkOrder === 'function'/.test(SRC));
  ok('D3  an unavailable destination renders NO open action',
    /spine-row-nogo[\s\S]{0,120}cannot be opened directly yet/.test(SRC));
  ok('D4  the record id is preserved for the surface to focus',
    /window\.__psFocusId=id/.test(SRC));
}

section('E  fact, recommendation and authority stay distinct');
{
  ok('E1  the fact is rendered from the server field',
    /spine-row-fact[\s\S]{0,60}esc\(r\.fact\)/.test(SRC));
  //  A recommendation must never read as something the system recorded.
  ok('E2  a recommendation is visibly tagged as a suggestion',
    /spine-rec-tag">Suggestion<\/span>[\s\S]{0,40}esc\(r\.recommendation\)/.test(SRC));
  ok('E3  authority language comes from authority_basis, not from the section',
    /\}\)\[r\.authority_basis\]/.test(SRC));
  ok('E4  all five authority states are rendered',
    ['assigned_to_you', 'available_for_you_to_cover', 'needs_manager_attention',
     'visible_not_actionable', 'blocked_by_missing_information']
      .every((k) => new RegExp(k + ':').test(SRC)));
  //  THE WATCHLIST MUST NEVER CLAIM OWNERSHIP. The unknown-state fallback is
  //  "Owner not confirmed", never "Assigned to you".
  ok('E5  an unknown authority falls back to "Owner not confirmed", never ownership',
    /\|\| 'Owner not confirmed'/.test(SRC));
}

section('F  every result carries its property visibly');
{
  ok('F1  each row renders its property name',
    /spine-row-meta[\s\S]{0,60}esc\(r\.property_name/.test(SRC));
  ok('F2  configuration gaps are named, not absorbed',
    /has no operating timezone configured/.test(SRC));
}

section('G  a failed read is never an empty briefing');
{
  ok('G1  the catch says it could not load, not that nothing needs attention',
    /could not load your briefing[\s\S]{0,140}should be read as all clear/.test(SRC));
  ok('G2  source_unavailable and no_authorized_properties render distinctly',
    /state === 'source_unavailable' \|\| b\.state === 'no_authorized_properties'/.test(SRC));
  ok('G3  a partial briefing is flagged as partial',
    /state === 'partial'[\s\S]{0,80}spine-warn/.test(SRC));
}

section('H  compact first answer, expandable');
{
  ok('H1  the initial answer shows five to seven rows',
    /SPINE_ASK_INITIAL_ROWS = ([5-7])\b/.test(SRC));
  ok('H2  the remainder expands rather than being dropped',
    /Show ' \+ \(rows\.length - SPINE_ASK_INITIAL_ROWS\) \+ ' more/.test(SRC));
  ok('H3  sections are rendered separately, never merged',
    /MY WORK<\/div>/.test(SRC) && /PROPERTY WATCHLIST<\/div>/.test(SRC));
}

section('I  desktop and 390px');
{
  //  The 390px case is asserted structurally: the input must not overflow,
  //  and must not trigger iOS zoom-on-focus (which needs >= 16px).
  ok('I1  a narrow-viewport rule exists at or below 430px',
    /@media \(max-width:4[0-3]\dpx\)/.test(SRC));
  const mq = SRC.slice(SRC.indexOf('@media (max-width:430px)'),
                       SRC.indexOf('@media (max-width:430px)') + 400);
  ok('I2  at 390px the input takes the full row rather than overflowing',
    /\.spine-ask-input\{flex:1 1 100%/.test(mq));
  ok('I3  and its font-size is 16px, so iOS does not zoom on focus',
    /\.spine-ask-input\{[^}]*font-size:16px/.test(mq));
  ok('I4  the form wraps instead of squeezing the button off-row',
    /\.spine-ask-form\{flex-wrap:wrap\}/.test(mq));
  ok('I5  the desktop input flexes without a fixed width',
    /\.spine-ask-input\{flex:1 1 auto;min-width:0/.test(SRC));
  ok('I6  rows cannot overflow their container',
    /\.spine-row-main\{flex:1 1 auto;min-width:0\}/.test(SRC));
}

console.log('\n════ spine read/recommend: ' + pass + ' passed, ' + fail + ' failed ════');
if (pass < 28) { console.log('   RUN INVALID — too few assertions executed.'); process.exit(1); }
process.exit(fail ? 1 : 0);
