#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const start = source.indexOf("ASK SPINE — THE SIGNED-IN CONVERSATIONAL READER");
const end = source.indexOf("async function renderMyWork", start);
const ask = source.slice(start, end);
const code = ask.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

let passed = 0;
let failed = 0;
function check(name, condition) {
  if (condition) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.error("  ✗ " + name); }
}

console.log("\nASK SPINE DASHBOARD CONVERGENCE\n");

check("one canonical conversational endpoint is registered",
  source.includes("path: function(){ return '/operator/ask-spine/ask'; }"));
check("the dashboard no longer registers the legacy attention GET",
  !source.includes("/operator/ask-spine/attention"));
check("the quick question enters the same submit function",
  /function askSpine\(question\)\{ return _asSubmit\(question \|\| ASK_SPINE_PROMPT\); \}/.test(ask));
check("the typed composer enters the same submit function",
  /return _asSubmit\(q\);/.test(ask));
check("the request body carries only the question",
  /buildBody: function\(p\)\{ return \{ question: p\.question \}; \}/.test(source));
check("the Ask Spine request body carries no browser property authority",
  !/askSpineAsk[\s\S]{0,400}buildBody[\s\S]{0,200}property_id/.test(source));
check("the Ask Spine request body carries no browser module authority",
  !/askSpineAsk[\s\S]{0,400}buildBody[\s\S]{0,200}allowed_modules/.test(source));
check("the Ask Spine action has no operator-key header",
  !/askSpineAsk[\s\S]{0,900}x-operator-key/.test(source));
check("the transcript renders every retained turn",
  /_askSpineTurns\.map\(_asTurn\)\.join\(''\)/.test(ask));
check("a new failure is appended to its own turn",
  /_askSpineTurns\.push\(turn\)[\s\S]*turn\.state = 'failed'/.test(ask));
check("a request failure does not clear earlier turns",
  !/catch\(err\)[\s\S]{0,300}_askSpineTurns\s*=\s*\[\]/.test(ask));
check("server outcome is rendered as the outcome",
  /data-as="' \+ _asEsc\(outcome\)/.test(ask));
check("server answer text is escaped and rendered without rewriting",
  /_asEsc\(d\.answer \|\| ''\)/.test(ask));
check("grounded metadata is enumerated generically",
  /Object\.keys\(grounded\)\.forEach/.test(ask));
check("no domain-specific grounding field is interpreted in the browser",
  !/grounded\.(open_items|work_orders|compliance_items|utility_services|tenancy_standing|reads_that_failed)/.test(code));
check("out_of_scope remains a named server outcome",
  code.includes("outcome === 'out_of_scope'"));
check("not_authorized remains a named server outcome",
  code.includes("outcome === 'not_authorized'"));
check("composition_unavailable remains a named server outcome",
  code.includes("outcome === 'composition_unavailable'"));
check("unavailable receives explicit outage presentation",
  code.includes("outcome === 'unavailable'") && code.includes("as-unavailable"));
check("transport failure is distinguished from a canonical read state",
  code.includes("REQUEST_FAILED") && code.includes('data-as="request_failed"'));
check("server references never become browser-composed hrefs",
  /function _asReferences/.test(ask) && !/function _asReferences[\s\S]*?href=/.test(ask));
check("only app-supported server openers become buttons",
  /var supported = \{[\s\S]*person:true[\s\S]*contracted_service_evidence:true/.test(ask));
check("raw reference targets are not printed into button copy",
  /_asEsc\('Open · ' \+ label\)/.test(ask));
check("a server-confirmed session scope change clears the transcript",
  /scope !== _askSpineScopeKey\)\{ _askSpineTurns = \[\]; _askSpineOpen = false; \}/.test(ask));
check("sign-out removes transcript content",
  /_askSpineTurns = \[\]; _askSpineScopeKey = null; _askSpineOpen = false; mount\.innerHTML = ''/.test(ask));
check("the conversation has a phone-specific layout",
  /@media \(max-width:520px\)[\s\S]*\.as-transcript\{[^}]*max-height:calc\(72dvh - 182px\)/.test(source));
check("Ask Spine defaults to a compact launcher",
  /mount\.innerHTML = _askSpineOpen \? _asShell\(\) : _asLauncher\(\)/.test(ask));
check("the launcher is a fixed sidecar rather than dashboard content",
  /\.ask-spine\{position:fixed;right:20px;bottom:20px/.test(source));
check("submitting a question opens the conversation",
  /_askSpineOpen = true;[\s\S]{0,120}var turn =/.test(ask));
check("collapsing does not clear retained turns",
  /function _asToggle\(open\)\{[\s\S]{0,300}renderAskSpine\(\)/.test(ask)
    && !/function _asToggle\(open\)\{[\s\S]{0,300}_askSpineTurns\s*=/.test(ask));
check("the transcript exposes conversation semantics",
  /role="log"[^>]*aria-label="Ask Spine conversation"/.test(ask));
check("the composer has a persistent accessible name",
  /aria-label="Ask Spine a question"/.test(ask));
check("the Ask Spine surface contains no client intent recognizer",
  !/_asIsSupported|questionSubject|intent/i.test(code));
check("the Ask Spine surface contains no screen-scraping read",
  !/innerText|textContent|querySelectorAll/.test(code));

console.log(`\n==== ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
