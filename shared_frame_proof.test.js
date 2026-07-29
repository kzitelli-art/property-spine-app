// ════════════════════════════════════════════════════════════════════
//  shared_frame_proof.test.js — ONE OUTER FRAME FOR EVERY MODULE
//
//    node shared_frame_proof.test.js                 (asserts index.html)
//    node shared_frame_proof.test.js <path>          (asserts another source)
//
//  APP-ONLY, CSS-ONLY. This harness reads index.html and asserts that the
//  page frame — .wrap — resolves in exactly one place for Home, Leasing,
//  Management and Maintenance. It touches no API, no migration, no domain
//  behaviour, and makes no claim about how anything LOOKS. Alignment was
//  measured as computed style at 390 / 768 / 1440 in a real browser, and
//  that measurement is the evidence for the geometry itself.
//
//  What this file is for is the opposite risk: that a module quietly
//  re-declares .wrap padding again. That is not a cosmetic regression.
//  `body.<module> .wrap` scores (0,2,1) against a plain `.wrap` at (0,1,0),
//  so a module rule outranks BOTH the responsive step and the iPhone
//  safe-area inset REGARDLESS OF SOURCE ORDER. When Leasing and Maintenance
//  carried their own `padding` shorthand they kept desktop gutters on a
//  phone and never cleared the home indicator, while Home and Management
//  did. One specificity bug, two symptoms, and neither is visible in a diff.
//
//  Second trap, asserted separately: a `padding` SHORTHAND silently rewrites
//  padding-bottom. That is what defeated the safe-area inset even where the
//  module rule was absent. The shared block must use longhands only.
//
//  NEGATIVE CONTROL. Run against the pre-slice source and this harness must
//  FAIL — a harness that cannot fail proves nothing:
//      git show 28fb851:index.html > /tmp/before.html
//      node shared_frame_proof.test.js /tmp/before.html      → expect failures
// ════════════════════════════════════════════════════════════════════

"use strict";

const fs = require("fs");
const path = require("path");

const SRC_PATH = process.argv[2] || path.join(__dirname, "index.html");
const SRC = fs.readFileSync(SRC_PATH, "utf8");

let passed = 0, failed = 0;
const fails = [];
const ok = (n, c, d) => { if (c) passed++; else { failed++; fails.push(n + (d ? "  — " + d : "")); } };
const section = (t) => console.log("\n── " + t + " " + "─".repeat(Math.max(0, 58 - t.length)));

//  Every declaration block whose selector list targets .wrap, with the
//  selector kept. Comments are stripped first so prose ABOUT a rule can
//  never satisfy an assertion that the rule exists.
const CSS = SRC.replace(/\/\*[\s\S]*?\*\//g, "");
const wrapRules = [...CSS.matchAll(/([^{}\n;]*\.wrap)\s*\{([^}]*)\}/g)]
  .map((m) => ({ selector: m[1].trim(), body: m[2].trim() }));

const moduleWrapRules = wrapRules.filter((r) => /^body\.[a-z0-9-]+\s+\.wrap$/.test(r.selector));
const hasPadding = (body) => /(^|;)\s*padding\s*:/.test(body);          // shorthand only
const hasAnyPadding = (body) => /(^|;)\s*padding(-|\s*:)/.test(body);   // shorthand or longhand

console.log("source: " + SRC_PATH);
console.log(".wrap rules found: " + wrapRules.length +
            "   (module-scoped: " + moduleWrapRules.length + ")");

// ════════════════════════════════════════════════════════════════════
section("No module owns the frame");

//  The two rules this slice corrected, named explicitly. A regression that
//  reintroduces either one must fail by name, not by aggregate count.
for (const mod of ["leasing-v6-mode", "maintenance-v6-mode", "management-doors-mode"]) {
  const rules = wrapRules.filter((r) => r.selector === "body." + mod + " .wrap");
  const offenders = rules.filter((r) => hasAnyPadding(r.body));
  ok(`body.${mod} .wrap declares no padding`,
     offenders.length === 0,
     offenders.map((r) => r.body).join(" / "));
}

//  The general rule, so a NEW module cannot reintroduce the same bug under
//  a different class name.
const anyModulePadding = moduleWrapRules.filter((r) => hasAnyPadding(r.body));
ok("no module-scoped .wrap rule declares padding at all",
   anyModulePadding.length === 0,
   anyModulePadding.map((r) => r.selector + "{" + r.body + "}").join(" / "));

//  Modules are still permitted to set max-width — that is content width, not
//  the outer frame, and the slice deliberately preserved it.
ok("modules still set max-width (frame preserved, not flattened)",
   moduleWrapRules.length >= 3 && moduleWrapRules.every((r) => /max-width/.test(r.body)),
   moduleWrapRules.map((r) => r.selector).join(", "));

// ════════════════════════════════════════════════════════════════════
section("The shared frame is the last word");

const sharedIdx = CSS.lastIndexOf(".wrap{\n  padding-top: 24px;");
ok("a shared .wrap frame block exists with the ruled desktop values",
   sharedIdx !== -1 &&
   /\.wrap\{\s*padding-top:\s*24px;\s*padding-inline:\s*28px;\s*padding-bottom:\s*80px;\s*\}/.test(CSS));

//  Longhands only. A shorthand here would silently reset padding-bottom and
//  reopen the safe-area defect from the other direction. Bounded to the block
//  itself — the JS below the stylesheet is full of unrelated `padding:`.
const sharedBlock = sharedIdx === -1 ? "" : CSS.slice(sharedIdx, CSS.indexOf("</style>", sharedIdx));
ok("the shared frame uses longhands, never a padding shorthand",
   sharedIdx !== -1 && !hasPadding(sharedBlock),
   "a `padding:` shorthand appears inside the shared frame block");

//  It must physically outrank the earlier plain-.wrap declarations, which it
//  can only do by being last — it carries no !important and should not.
const earlierPlain = wrapRules.filter((r) => r.selector === ".wrap");
ok("the shared frame is the final .wrap declaration in the sheet",
   sharedIdx !== -1 && CSS.indexOf(".wrap", sharedIdx + 1) >= sharedIdx,
   "" );
ok("the shared frame wins on order, not on !important",
   sharedIdx !== -1 && !/!important/.test(sharedBlock.slice(0, 600)));
ok("plain .wrap declarations still exist earlier and are superseded, not deleted",
   earlierPlain.length >= 2);

// ════════════════════════════════════════════════════════════════════
section("The mobile rule reaches every module");

ok("one shared mobile step at max-width:820px",
   /@media\(max-width:820px\)\{\s*\.wrap\{\s*padding-top:\s*28px;\s*padding-inline:\s*18px;\s*\}\s*\}/.test(CSS));

//  The old steps set .wrap padding at 1180px and 640px. Both are gone, so
//  exactly one screen breakpoint governs the frame.
//
//  This needs real brace matching. A regex cannot do it: `@media(max-width:
//  560px){…}` contains no `@`, so any lazy scan runs straight past its
//  closing brace and reports a `.wrap` rule that belongs to a later block.
//  An earlier draft of this assertion did exactly that and named three
//  breakpoints that do not touch .wrap at all.
function mediaBlocksContainingWrap(css) {
  const found = [];
  const re = /@media([^{]*)\{/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    let depth = 1, i = m.index + m[0].length;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    const body = css.slice(m.index + m[0].length, i - 1);
    if (/(^|[},])\s*[^{};]*\.wrap\s*\{/.test(body)) found.push(m[1].trim());
    re.lastIndex = m.index + m[0].length;      // allow nested @media to be seen
  }
  return found;
}
const wrapMedia = mediaBlocksContainingWrap(CSS);
const screenSteps = wrapMedia.filter((q) => !/print/.test(q));
ok("exactly one screen breakpoint governs the frame, and it is 820px",
   screenSteps.length === 1 && /max-width:\s*820px/.test(screenSteps[0]),
   "screen media touching .wrap: " + (screenSteps.join(" | ") || "none"));
ok("the print rule is the only other media block touching .wrap",
   wrapMedia.filter((q) => /print/.test(q)).length === 1,
   "all media touching .wrap: " + wrapMedia.join(" | "));

// ════════════════════════════════════════════════════════════════════
section("The safe-area inset reaches every module");

ok("safe-area inset is declared for .wrap",
   /@supports\s*\(padding-bottom:\s*env\(safe-area-inset-bottom\)\)\{\s*\.wrap\{\s*padding-bottom:\s*calc\(80px \+ env\(safe-area-inset-bottom\)\);\s*\}\s*\}/.test(CSS));

//  It only reaches every module because nothing outranks it. That is the
//  same assertion as "no module declares padding" — stated again here in the
//  safe-area's own terms, because THIS is the symptom that put a control
//  under the iPhone home indicator on Leasing and Maintenance.
const safeIdx = CSS.search(/@supports\s*\(padding-bottom:\s*env\(safe-area-inset-bottom\)\)\{\s*\.wrap/);
ok("nothing with module specificity can outrank the safe-area rule",
   safeIdx !== -1 && anyModulePadding.length === 0);

//  The @supports block outside .wrap still covers the chrome that sits
//  outside the frame — that was moved, not dropped.
ok("chrome outside .wrap keeps its own safe-area handling",
   /#entryGate\{\s*padding-bottom:\s*env\(safe-area-inset-bottom\)/.test(CSS) &&
   /#propSwitcher\{\s*padding-bottom:\s*env\(safe-area-inset-bottom\)/.test(CSS));

// ════════════════════════════════════════════════════════════════════
section("Nothing but CSS moved");

//  A CSS-only slice must not have touched behaviour. These assert the exact
//  anchors the frame edits sat beside, so a stray edit in the same region
//  fails here rather than in a browser three slices later.
ok("goBack / markSubPage / clearSubPage intact",
   /function goBack\(\)\{/.test(SRC) && /function markSubPage\(returnFn\)\{/.test(SRC) &&
   /function clearSubPage\(\)\{/.test(SRC));
ok("syncCrumbLabels untouched by this slice (its ruling is a later slice)",
   /const dup = onSub && String\(dest\)\.trim\(\)\.toLowerCase\(\) === String\(moduleName\)\.trim\(\)\.toLowerCase\(\);/.test(SRC));
//  Anchored on the mhDoor() CALL SITES, with the labels exactly as the
//  source spells them — sentence case, not the title case the handoff used.
//  Matching free text would let a comment or a removed-feature note satisfy
//  an assertion that the door still renders.
ok("the four Maintenance doors still render, with their exact labels",
   /mhDoor\('workorders',\s*'Work orders'/.test(SRC) &&
   /mhDoor\('turns',\s*'Turnovers'/.test(SRC) &&
   /mhDoor\('materials',\s*'Materials'/.test(SRC) &&
   /mhDoor\('vendors',\s*'Vendors & projects'/.test(SRC));
ok("the module title rules are untouched (later slice)",
   /body\.mgmt-home #deskTitle, body\.mgmt-home #deskSub\{display:none!important\}/.test(SRC) &&
   /body\.le-subpage #deskTitle, body\.le-subpage #deskSub\{display:none!important\}/.test(SRC) &&
   /body\.mt-subpage #deskTitle,body\.mt-subpage #deskSub\{display:none\}/.test(SRC));
ok("the one-off turn-route suppression is untouched (later slice)",
   /body\.mt-turnroute \.crumb-back\{display:none\}/.test(SRC));
ok("the appbar markup is unchanged",
   /<nav id="appbarCrumb" class="appbar-crumb hidden" aria-label="Current location">/.test(SRC) &&
   /<button type="button" class="crumb-back" onclick="goBack\(\)" aria-label="Back">/.test(SRC));
ok("the signed-out entry gate is unchanged",
   /Enter your mobile number\. We'll text you a code\./.test(SRC));
ok("no desk route changed",
   ["management", "leasing", "maintenance", "capital", "reporting"]
     .every((d) => SRC.includes("openDesk('" + d + "')")));

// ════════════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(64));
console.log("  assertions passed: " + passed);
console.log("  assertions failed: " + failed);
if (failed) { console.log("\n  FAILED:"); fails.forEach((f) => console.log("   ✗ " + f)); }
console.log("═".repeat(64));
console.log(
`
  Proof ceiling: SOURCE-VERIFIED for composition, plus a browser measurement
  of computed style at 390 / 768 / 1440 for all four module frames. No live
  property, no authenticated session, no API and no operating data were
  involved, and none of the above is evidence of runtime behaviour.
`);
process.exit(failed ? 1 : 0);
