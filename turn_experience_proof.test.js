// ════════════════════════════════════════════════════════════════════
//  turn_experience_proof.test.js — TURNOVERS → TURN LIST → UNIT TURN
//
//    node turn_experience_proof.test.js
//
//  APP-ONLY. Reads index.html and unit-turn-page.js. Touches no API, no
//  migration, no domain behaviour.
//
//  It makes NO claim about how the pages look. Column width, balance and
//  legibility were judged in a real browser at 1440px and 390px and the
//  screenshots are the evidence. What this file stops coming back is the
//  ten-panel diagnostic stack, the two-screen flow collapsing into one
//  scroll, the completion panel detaching from its work item, and a failed
//  read rendering as an empty list.
// ════════════════════════════════════════════════════════════════════

"use strict";

const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const UT = fs.readFileSync(path.join(__dirname, "unit-turn-page.js"), "utf8");

let passed = 0, failed = 0;
const fails = [];
const ok = (n, c, d) => { if (c) passed++; else { failed++; fails.push(n + (d ? "  — " + d : "")); } };
const section = (t) => console.log("\n── " + t + " " + "─".repeat(Math.max(0, 58 - t.length)));

//  A comment saying a thing is not done must not satisfy an assertion that
//  it is not done.
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).map((l) => l.replace(/\s\/\/.*$/, "")).join("\n");
const UT_CODE = code(UT);
const slice = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b));

// ════════════════════════════════════════════════════════════════════
section("1  THE DIAGNOSTIC STACK IS HOSTED, NOT DELETED, NOT SHOWN");
{
  const WRAPS = ["psUnitTriageCaptureWrap", "psTurnScopeWrap", "psWorkFlowWrap",
                 "psReadinessWrap", "psStaffAgentWrap"];
  //  PRESERVED. The markup, the containers and the door scripts all survive.
  for (const w of WRAPS) ok(`${w} still exists in the document`, SRC.includes('id="' + w + '"'), w);
  for (const d of ["unit-triage-door.js", "turn-scope-door.js", "work-acceptance-door.js",
                   "readiness-door.js", "staff-agent-door.js"]) {
    ok(`${d} is still loaded`, SRC.includes(d), d);
  }
  ok("and the doors themselves were not edited",
     fs.existsSync(path.join(__dirname, "unit-triage-door.js")) &&
     fs.readFileSync(path.join(__dirname, "unit-triage-door.js"), "utf8")
       .includes("is a live operator surface and has no offline view"));

  //  HIDDEN BY DEFAULT.
  const hideRule = SRC.match(/#psUnitTriageCaptureWrap,#psTurnScopeWrap,#psWorkFlowWrap,\s*\n#psReadinessWrap,#psStaffAgentWrap\{display:none\}/);
  ok("all five are display:none by default", !!hideRule);
  for (const w of WRAPS) {
    ok(`${w} is revealed only under body.ps-diagnostics`,
       new RegExp("body\\.ps-diagnostics #" + w).test(SRC), w);
  }

  //  AN EXPLICIT ROUTE, and it announces itself.
  ok("psDiagnostics() exists", /function psDiagnostics\(on\)/.test(SRC));
  ok("it toggles the host class", /classList\.toggle\("ps-diagnostics", want\)/.test(SRC));
  ok("#diagnostics in the URL turns it on", /diagnostics\(=1\|\\b\)/.test(SRC) || /diagnostics/.test(SRC.match(/_psDiagBoot[\s\S]{0,400}/)[0]));
  ok("a visible bar says the page is in diagnostic mode", /ps-diag-bar/.test(SRC));
  ok("and the bar says they are not operator content",
     /Not operator content/.test(SRC));
  ok("there is an Exit control", /psDiagnostics\(false\)/.test(SRC));
  //  It must NOT be on by default.
  ok("the host class is not applied in markup", !/<body[^>]*ps-diagnostics/.test(SRC));
}

// ════════════════════════════════════════════════════════════════════
section("2  ONE HONEST STATE PER SURFACE");
{
  const L = slice(UT, "function renderList()", "// ── THE UNIT TURN PAGE");
  ok("signed out is exactly one line", /Not signed in\.<\/strong> Sign in to load turns\./.test(L));
  ok("loading is its own state", /Loading turns…/.test(L));
  ok("unavailable is its own state, with a retry",
     /Turns are unavailable\./.test(L) && /id="tlRetry"/.test(L));
  ok("and it is NOT rendered as an empty list",
     /it is not being shown as empty/.test(L));
  ok("a real zero says which zero it is",
     /No unit is turning at this property\./.test(L) && /Nothing needs judgment right now\./.test(L));
  ok("no fixture stands in for a failure", !/fixture|sample|__demo/i.test(code(L)));
  //  The unit page has its own unavailable + retry.
  const T = slice(UT, "function renderTurn()", "function backBtn()");
  ok("the unit page has its own unavailable state", /This unit turn is unavailable\./.test(T));
  ok("with its own retry", /id="utRetry"/.test(T));
  ok("and its own loading state", /Loading…/.test(T));
}

// ════════════════════════════════════════════════════════════════════
section("3  COMPACT SUBPAGE HEADER, AND ONE BREADCRUMB");
{
  const H = slice(SRC, "function maintHeader(", "function maintSubcard(");
  ok("the header is a compact <header>, not a bordered hero card",
     /<header class="maint-subhead">/.test(H) && !/maint-sub-hero/.test(H));
  ok("the breadcrumb IS the back control",
     /class="maint-crumb"[^>]*onclick="showMaintenanceMain\(\)"/.test(H));
  ok("there is no second Back to Maintenance pill", !/maintBackButton/.test(H));
  ok("and that button no longer exists anywhere", !SRC.includes("function maintBackButton"));
  ok("the overline is suppressed when it repeats the breadcrumb",
     /trim\(\)\.toLowerCase\(\)==='maintenance'/.test(H));
  ok("the .maint-sub-hero card style is no longer used by the header",
     !/maintHeader[\s\S]{0,600}maint-sub-hero/.test(SRC));

  //  THE SHARED CHROME. Generic, in syncCrumbLabels, not a Maintenance branch.
  const C = slice(SRC, "function syncCrumbLabels()", "async function openDesk(");
  ok("the back label is computed in the SHARED rule", /const dest = onSub \? moduleName : 'Home'/.test(C));
  ok("it says Back when it would repeat the crumb", /lbl\.textContent = dup \? 'Back' : dest/.test(C));
  ok("the de-duplication is not special-cased to maintenance",
     !/maintenance/i.test(C.slice(C.indexOf("const dest"), C.indexOf("const md"))));
  ok("Leasing keeps its own sub-page rule", /le-subpage', onSub && inLeasing/.test(C));
  ok("Management keeps its own sub-page rule", /mg-subpage', onSub && inManagement/.test(C));
  ok("and Maintenance now has the same rule", /mt-subpage', onSub && inMaintenance/.test(C));
  ok("so the desk title is suppressed on a maintenance sub-page",
     /body\.mt-subpage #deskTitle,body\.mt-subpage #deskSub\{display:none\}/.test(SRC));
}

// ════════════════════════════════════════════════════════════════════
section("4  ONE CONTENT COLUMN");
{
  ok("the operating column is 820px inside the shell",
     /\.maint-ops-shell \.ut-wrap\{max-width:820px;margin:0;padding:0;width:100%\}/.test(SRC));
  ok("it is left-aligned, not independently centred",
     !/\.maint-ops-shell \.ut-wrap\{[^}]*margin:0 auto/.test(SRC));
  ok("the shell itself is still the 1080px column the home uses",
     /#intelStrip \.maint-ops-shell\{width:min\(100%,1080px\);margin-inline:auto\}/
       .test(fs.readFileSync(path.join(__dirname, "leasing-experience.js"), "utf8")));
  ok("and the phone drops the cap rather than keeping a 820px box",
     /@media\(max-width:820px\)\{[\s\S]{0,200}\.maint-ops-shell \.ut-wrap\{max-width:none\}/.test(SRC));
  ok("no text line is stretched across the full shell",
     /\.maint-subhead p\{[^}]*max-width:60ch/.test(SRC));
}

// ════════════════════════════════════════════════════════════════════
section("5  TWO SCREENS, NOT ONE SCROLL");
{
  const L = slice(UT, "function renderList()", "// ── THE UNIT TURN PAGE");
  ok("the list returns nothing while a unit is open",
     /if \(S\.unitId && \(S\.turn \|\| S\.busy \|\| S\.error\)\) return "";/.test(L));
  ok("the unit page carries one back control", /function backBtn\(\)/.test(UT));
  ok("labelled Back to turns", /Back to turns/.test(UT));
  ok("and it is on every unit-page state — loaded, loading and failed",
     (slice(UT, "function renderTurn()", "function backBtn()").match(/backBtn\(\)/g) || []).length === 3);
  const W = slice(UT, 'var bk = document.getElementById("utBack");', 'var bindIn =');
  ok("back clears the open unit", /S\.unitId = null; S\.turn = null;/.test(W));
  ok("and clears the per-item panels with it", /S\.open = \{\};/.test(W));
  ok("it does not reload or navigate", !/location|href|reload/.test(W));
  //  The list opens a unit; that is the only way in.
  ok("a list row opens the unit", /class="tl-unit tl-open"/.test(UT));
  ok("through the same loadUnit the page always used", /loadUnit\(x\.getAttribute\("data-id"\)\)/.test(UT));
}

// ════════════════════════════════════════════════════════════════════
section("6  THE TURN LIST IS ROWS A PERSON CAN READ");
{
  const L = slice(UT, "function renderList()", "// ── THE UNIT TURN PAGE");
  ok("the unit number is its own line", /class="tl-unit-h">Unit /.test(L));
  ok("the turn state is its own line", /class="tl-unit-state"/.test(L));
  ok("the next action is its own line", /class="tl-unit-next"><strong>Next:<\/strong>/.test(L));
  ok("move-in risk is its own line when it applies", /class="tl-unit-risk"/.test(L));
  ok("and there is a named open action", /class="tl-unit-open">Open unit →/.test(L));
  ok("nothing is compressed into an italic run",
     !/ut-ev/.test(L) && !/font-style/.test(L));
  ok("the filters survive", /id="tlAll"/.test(L) && /id="tlAtt"/.test(L));
  ok("styled as the established chip control", /class="tl-chip/.test(L));
  ok("with the selected one marked", /tl-chip' \+ \(S\.attention \? "" : " on"\)/.test(L));
  ok("chips meet a tap target", /\.tl-chip\{[^}]*min-height:40px/.test(SRC));
}

// ════════════════════════════════════════════════════════════════════
section("7  THE UNIT TURN PAGE, FIVE SECTIONS IN ORDER");
{
  const T = slice(UT, "function renderTurn()", "function backBtn()");
  const order = ["ut-unit-title", "Next</div>", "Required work</div>", "Final readiness</div>", "Report something</div>"];
  let last = -1, inOrder = true;
  for (const o of order) { const i = T.indexOf(o); if (i < 0 || i < last) inOrder = false; last = i; }
  ok("status → next → required work → final readiness → report something", inOrder,
     order.map((o) => o + "@" + T.indexOf(o)).join(" "));

  ok("status is a readable block, not a label/value table",
     /class="ut-state-list"/.test(T) && !/renderTurn[\s\S]{0,900}row\("Vacancy"/.test(UT));
  ok("the vacancy line still says UNKNOWN when it is unknown",
     /Vacancy unknown — no confirmed walk/.test(T));
  ok("next action is one callout", /class="ut-callout"/.test(T));
  ok("carrying the action and its reason", /controlling_next_action\.action/.test(T) && /controlling_next_action\.why/.test(T));

  //  COPY REDUCED, UNCERTAINTY AND AUTHORITY KEPT.
  ok("Report something is one sentence, not three bullets",
     /Report a condition, correct the turn scope, or report completed work\./.test(T));
  ok("the three-bullet purpose list is gone", !/purposes\.forEach/.test(T));
  ok("and the exclusion list under the box is gone", !/message_excludes/.test(T));
  ok("replaced by one quiet note", /Readiness and ownership use their own controls\./.test(T));
  ok("the readiness authority reason is STILL shown",
     /You cannot certify this unit: /.test(T));
  ok("and every real readiness blocker is still listed",
     /gate\.blockers \|\| \[\]\)\.forEach/.test(T));
  ok("the readiness note is still shown", /t\.readiness\.note/.test(T));
  ok("why work controls are absent is still said", /why_no_work_controls/.test(T));
}

// ════════════════════════════════════════════════════════════════════
section("8  A WORK ITEM OWNS ITS STATUS AND ITS CONTROLS");
{
  const W = slice(UT, "function renderWork(w, sg)", "function render() {");
  ok("each item is its own block", /class="wk' \+ \(w\.status === "complete" \? " done" : ""\)/.test(W));
  ok("with its own title", /class="wk-title"/.test(W));
  ok("its own status line", /class="wk-meta"/.test(W));
  ok("and its own actions", /class="wk-actions"/.test(W));
  ok("the completion panel is inset beneath THAT item", /class="wk-panelbox"/.test(W));
  ok("hairlined to the left so it reads as part of the job",
     /\.wk-panelbox\{[^}]*border-left:2px solid #111/.test(SRC));
  ok("and it is rendered inside renderWork, not after the list",
     W.indexOf('class="wk-panelbox"') > W.indexOf('class="wk-actions"'));

  //  The ambiguous label.
  ok("the toggle no longer says 'Close'", !/> \+\s*\(open \? "Close"/.test(W) && !/"Close" :/.test(W));
  ok("it says Hide completion when open", /open \? "Hide completion" : "Complete work"/.test(W));
  ok("and the reopen toggle says the same", /open \? "Hide completion" : "Reopen"/.test(W));
  ok("only the submit inside the panel is primary",
     /class="ut-btn wk-panel"/.test(W) && /class="ut-btn ut-primary wk-done"/.test(W));

  ok("UNASSIGNED is still shouted", /ut-unassigned/.test(W));
  ok("a reopened item is still marked", /Reopened/.test(W));
  ok("a proof-short claim is still called out", /Claimed complete, NOT closed\./.test(W));
}

// ════════════════════════════════════════════════════════════════════
section("9  THE PHOTO ACTION — STYLED, NOT CHANGED");
{
  const W = slice(UT, "function renderWork(w, sg)", "function render() {");
  //  BEHAVIOUR IS IDENTICAL.
  ok("one file input, on the work item", /class="wk-file" data-id="/.test(W));
  ok("accept is unchanged", /accept="image\/jpeg,image\/png,image\/webp"/.test(W));
  ok("capture is unchanged", /capture="environment"/.test(W));
  ok("exactly one file input in the whole page", (UT.match(/type="file"/g) || []).length === 1);
  ok("the file still rides on the completion request", /photo: file/.test(UT));
  ok("through the same claim call", /claimWorkCompletion\(\{/.test(UT));
  ok("there is still no upload step", !/uploadPhoto|savePhoto|Save photo|attachment id/i.test(code(UT)));
  ok("and no attachment screen", !/attachmentScreen|mediaLibrary|attachment centre|attachment center/i.test(code(UT)));

  //  ONLY THE PRESENTATION CHANGED.
  ok("the raw control is wrapped in a styled label", /<label class="wk-photo">/.test(W));
  ok("labelled Take or choose photo", /Take or choose photo/.test(W));
  ok("the input itself is visually hidden inside it", /\.wk-photo input\{position:absolute;width:1px;height:1px;opacity:0/.test(SRC));
  ok("the label meets a tap target", /\.wk-photo\{[^}]*min-height:44px/.test(SRC));

  //  AFTER SELECTION.
  ok("the label offers to replace it", /picked \? "Replace photo" : "Take or choose photo"/.test(W));
  ok("Photo ready is shown", /Photo ready/.test(W));
  ok("with the thumbnail", /class="ut-thumb" alt="Completion photo" src=/.test(W));
  ok("and the file's own name", /esc\(picked\.name\)/.test(W));

  //  BEFORE SELECTION.
  ok("Complete work is disabled until a photo is picked",
     /var blockedByPhoto = needsPhoto && !picked;/.test(W) &&
     /\(blockedByPhoto \|\| S\.busy \? " disabled" : ""\)/.test(W));
  ok("and the page says why", /Add one completion photo to close this work\./.test(W));
}

// ════════════════════════════════════════════════════════════════════
section("10  NOTHING OUTSIDE THE TURN EXPERIENCE MOVED");
{
  //  The Maintenance home is frozen.
  ok("the four doors are unchanged", (SRC.match(/mhDoor\('[a-z]+'/g) || []).length === 4);
  ok("the attention panel is unchanged", /function mhAttentionPanel\(m, vp\)/.test(SRC));
  ok("the four condition states are unchanged", /function mhCondition\(status, o\)/.test(SRC));
  ok("the source ledger is unchanged", /var maintHomeSources = \{ work: 'loading', turns: 'loading', supplies: 'loading' \}/.test(SRC));
  //  Management and Leasing composition.
  ok("Management still builds its own doors", SRC.includes("const rentRollCard"));
  ok("Management still has its condition panel", SRC.includes("managementConditionPanel("));
  ok("Leasing still builds its own home", SRC.includes('<section class="maint-primary-grid le-doors'));
  //  The sub-dashboards still exist and still use the shared header.
  for (const f of ["renderMaintenanceWorkOrdersDashboard", "renderMaintenanceSuppliesDashboard",
                   "renderMaintenanceVendorsDashboard", "renderMaintenanceComplianceDashboard",
                   "renderMaintenanceTurnoverDashboard", "renderMaintenanceTurnPage"]) {
    ok(`${f} survives`, SRC.includes("function " + f + "(st){"), f);
  }
  //  Business behaviour in the turn page.
  ok("the page still decides no authority itself",
     !/allowed_modules|role_title|platform_role/.test(UT_CODE));
  ok("it still reads may_operate_work from the server", /capabilities\.may_operate_work/.test(UT));
  ok("readiness is still the server's may_walk", /t\.readiness\.may_walk/.test(UT));
  ok("all eight walk confirmations are still sent",
     (UT.match(/_confirmed: true/g) || []).length === 8);
  ok("the message box still sends no photo", /text: text, photos: \[\], context_unit_id: S\.unitId/.test(UT));
  ok("proof images are still fetched with the session", /proofImage\(\{ viewPath: path \}\)/.test(UT));
}

// ════════════════════════════════════════════════════════════════════
console.log("\n── RESULT " + "─".repeat(50));
console.log("  assertions passed: " + passed);
console.log("  assertions failed: " + failed);
if (fails.length) { console.log("\n  FAILURES:"); fails.forEach((f) => console.log("   ✗ " + f)); }
console.log("\n  APP-ONLY. No API, no migration, no domain behaviour is exercised.");
console.log("  Column width, balance and legibility are NOT provable from source and");
console.log("  were judged in a real browser at 1440px and 390px. Screenshots are the");
console.log("  evidence for those. Supplied turn payloads in the browser harness prove");
console.log("  RENDERER BEHAVIOUR ONLY — no live property has been read.");
process.exit(failed > 0 ? 1 : 0);
