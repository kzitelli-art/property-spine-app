// ════════════════════════════════════════════════════════════════════
//  page_identity_proof.test.js — ONE CONVENTION FOR PAGE IDENTITY
//
//    node page_identity_proof.test.js                (asserts index.html)
//    node page_identity_proof.test.js <path>         (asserts another source)
//
//  APP-ONLY. This harness reads index.html and asserts what a module home
//  calls itself, and what a sub-page hides. It touches no API, no migration
//  and no domain behaviour, and it makes no claim about how anything LOOKS —
//  the visible result was measured in a real browser by executing the shipped
//  setDeskCopy / psApplyModuleIdentity / syncCrumbLabels against the real DOM.
//
//  What this file is for is the two ways this drifted before.
//
//  ONE — three homes, three answers. Leasing and Maintenance each blanked
//  their purpose sentence AFTER setDeskCopy had set it; Management wrote a
//  different sentence and then hid it in CSS. So no module home showed the
//  purpose it had been given. The sentence now has ONE source and every
//  renderer re-applies from it.
//
//  TWO — Management hid the whole .hero-head CONTAINER on a sub-page rather
//  than the identity inside it. That also removed #deskMini, #deskSub AND the
//  .desk-actions slot, so any control a Management sub-page placed in the
//  action slot was silently not rendered. Container-level hiding is the
//  defect; hiding the identity is the rule.
//
//  NEGATIVE CONTROL. Run against the pre-slice source and this harness must
//  FAIL — a harness that cannot fail proves nothing:
//      git show af69da9:index.html > /tmp/before.html
//      node page_identity_proof.test.js /tmp/before.html     → expect failures
// ════════════════════════════════════════════════════════════════════

"use strict";

const fs = require("fs");
const path = require("path");

const SRC_PATH = process.argv[2] || path.join(__dirname, "index.html");
const SRC = fs.readFileSync(SRC_PATH, "utf8");
const CSS = SRC.replace(/\/\*[\s\S]*?\*\//g, "");           // comments cannot satisfy a rule
const JS  = SRC.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

let passed = 0, failed = 0;
const fails = [];
const ok = (n, c, d) => { if (c) passed++; else { failed++; fails.push(n + (d ? "  — " + d : "")); } };
const section = (t) => console.log("\n── " + t + " " + "─".repeat(Math.max(0, 58 - t.length)));

const MODULES = {
  leasing:     ["Leasing",     "Relationships moving toward signed leases."],
  management:  ["Management",  "Property-level operating oversight and decisions."],
  maintenance: ["Maintenance", "Work affecting the physical property."],
};

console.log("source: " + SRC_PATH);

// ════════════════════════════════════════════════════════════════════
section("Every module home has a name and a purpose");

ok("one identity table exists",
   /const PS_MODULE_IDENTITY\s*=\s*\{/.test(JS));

for (const [key, [title, purpose]] of Object.entries(MODULES)) {
  ok(`${key} home declares the title "${title}"`,
     new RegExp(`${key}:\\s*\\['${title}',`).test(JS));
  //  The ruled sentence, matched exactly. A paraphrase must fail.
  ok(`${key} home declares the ruled purpose sentence`,
     new RegExp(`${key}:\\s*\\['${title}',\\s*'${purpose.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'\\]`).test(JS),
     "expected: " + purpose);
}

//  setDeskCopy must READ the table, not restate the words — otherwise the
//  seed and the re-apply can disagree, which is how this drifted the first time.
ok("setDeskCopy sources its purpose text from the identity table",
   /management:\['Management','Management',PS_MODULE_IDENTITY\.management\[1\]\]/.test(JS) &&
   /leasing:\['Leasing','Leasing',PS_MODULE_IDENTITY\.leasing\[1\]\]/.test(JS) &&
   /maintenance:\['Maintenance','Maintenance',PS_MODULE_IDENTITY\.maintenance\[1\]\]/.test(JS));

//  Each module renderer overwrites the header after setDeskCopy ran. All three
//  must re-apply from the table.
for (const key of Object.keys(MODULES)) {
  ok(`the ${key} renderer re-applies identity from the table`,
     new RegExp(`psApplyModuleIdentity\\('${key}'\\)`).test(JS));
}

//  The specific regression: a renderer blanking the sentence it was just given.
ok("no renderer blanks #deskSub back to empty",
   !/\$\('deskSub'\)\.textContent\s*=\s*''/.test(JS),
   "a `$('deskSub').textContent=''` survives");

//  And the CSS suppression that hid Management's identity outright.
ok("no CSS hides a module HOME title",
   !/body\.mgmt-home\s+#deskTitle/.test(CSS),
   "body.mgmt-home still suppresses #deskTitle");

// ════════════════════════════════════════════════════════════════════
section("An unknown desk name is refused, not half-rendered");

//  The hash router (index.html, "#/" handler) calls openDesk() with whatever
//  follows '#'. So '#diagnostics' — a MODE, not a desk — arrived here as a
//  desk name, found no entry in the copy table, and threw on copy[0]. The
//  desk header died mid-render and the operator was left looking at the
//  literal placeholder "DESK" above three empty lanes, with an uncaught
//  TypeError in the console. Reproduced in a browser before fixing.
//  The guard body contains braces (a try/catch around the warn), so a
//  [^}]* pattern cannot match it — an earlier draft of this assertion failed
//  for that reason, not because the guard was missing.
ok("setDeskCopy refuses an unknown desk name instead of throwing",
   /if\(!copy\)\{[\s\S]{0,160}?return;\s*\}/.test(JS),
   "no guard between the copy lookup and the first copy[0] read");

ok("the router does not route a non-desk hash as a desk",
   /var KNOWN_DESKS = \['management','leasing','maintenance','asset_management','reporting','money','capital','activation'\];/.test(JS) &&
   /if\(desk && KNOWN_DESKS\.indexOf\(desk\) === -1\)\{[^}]*return;\s*\}/.test(JS));

ok("the guard precedes the first copy[] read",
   JS.indexOf("if(!copy){") !== -1 &&
   JS.indexOf("if(!copy){") < JS.indexOf("$('crumb').textContent=copy[0]"));

// ════════════════════════════════════════════════════════════════════
section("A sub-page hides the identity, never the container");

//  ONE rule for all three modules. Not three rules that happen to agree.
const shared = CSS.match(
  /body\.le-subpage #deskTitle,\s*body\.le-subpage #deskSub,\s*body\.mg-subpage #deskTitle,\s*body\.mg-subpage #deskSub,\s*body\.mt-subpage #deskTitle,\s*body\.mt-subpage #deskSub\{\s*display:none!important\s*\}/);
ok("one shared rule governs all three modules' sub-page identity", !!shared);

//  THE DEFECT THIS SLICE EXISTS TO REMOVE.
ok("Management no longer hides the .hero-head container",
   !/body\.mg-subpage[^{]*\.hero-head\s*\{[^}]*display:\s*none/.test(CSS),
   "a container-level hide survives on mg-subpage");

//  Generalised, so no module can reintroduce it under another class.
const containerHides = [...CSS.matchAll(/body\.(le|mg|mt)-subpage[^{]*\.hero-head[^{]*\{([^}]*)\}/g)]
  .filter((m) => /display:\s*none/.test(m[2]));
ok("no module hides .hero-head on a sub-page",
   containerHides.length === 0,
   containerHides.map((m) => m[0].slice(0, 70)).join(" / "));

//  .desk-actions must never be targeted for hiding by a sub-page rule. It is
//  inside .hero-head, so hiding the container is the only way it disappeared —
//  this asserts nobody replaces that with a direct hide.
const actionHides = [...CSS.matchAll(/body\.(le|mg|mt)-subpage[^{]*\.desk-actions[^{]*\{([^}]*)\}/g)]
  .filter((m) => /display:\s*none|visibility:\s*hidden/.test(m[2]));
ok(".desk-actions is not hidden on any module sub-page",
   actionHides.length === 0,
   actionHides.map((m) => m[0].slice(0, 70)).join(" / "));

//  The old per-module rules are gone, so there is exactly one place to change.
ok("the superseded per-module identity rules are removed",
   !/body\.le-subpage #deskTitle, body\.le-subpage #deskSub\{display:none!important\}/.test(CSS) &&
   !/body\.mt-subpage #deskTitle,body\.mt-subpage #deskSub\{display:none\}/.test(CSS));

//  Spacing rules are NOT identity rules and were deliberately left alone.
ok("sub-page spacing rules are preserved",
   /body\.le-subpage\.leasing-v6-mode \.hero\{margin-bottom:0!important\}/.test(CSS) &&
   /body\.mg-subpage #workspace>\.hero\{margin-top:0!important\}/.test(CSS));

// ════════════════════════════════════════════════════════════════════
section("Route-owned identity is untouched");

//  Turnovers and the Unit Turn page print their OWN header inside the page
//  body. Those are route-owned and this slice must not have moved them.
ok("the Maintenance sub-page header still renders its own crumb + title",
   /<header class="maint-subhead"><button class="maint-crumb" type="button" onclick="showMaintenanceMain\(\)"><span aria-hidden="true">‹<\/span> Maintenance<\/button>/.test(SRC));
ok("the Unit Turn page still owns its two back destinations",
   /'<button id="utExit" class="maint-crumb" type="button">'/.test(
      fs.readFileSync(path.join(__dirname, "unit-turn-page.js"), "utf8")) &&
   /'<button id="utBack" class="maint-crumb" type="button">'/.test(
      fs.readFileSync(path.join(__dirname, "unit-turn-page.js"), "utf8")));
ok("the route-scoped turn suppression is untouched (navigation slice owns it)",
   /body\.mt-turnroute \.crumb-back\{display:none\}/.test(CSS));

// ════════════════════════════════════════════════════════════════════
section("No navigation logic changed");

//  This slice is forbidden from touching back labels or destinations. The
//  tautology stays exactly as it is until the navigation slice rules on it.
ok("syncCrumbLabels' back-label logic is byte-identical",
   /const dest = onSub \? moduleName : 'Home';/.test(SRC) &&
   /const dup = onSub && String\(dest\)\.trim\(\)\.toLowerCase\(\) === String\(moduleName\)\.trim\(\)\.toLowerCase\(\);/.test(SRC) &&
   /lbl\.textContent = dup \? 'Back' : dest;/.test(SRC));
ok("goBack / markSubPage / clearSubPage are intact",
   /function goBack\(\)\{/.test(SRC) && /function markSubPage\(returnFn\)\{/.test(SRC) &&
   /function clearSubPage\(\)\{/.test(SRC));
ok("the sub-page class toggles are unchanged",
   /document\.body\.classList\.toggle\('le-subpage', onSub && inLeasing\);/.test(SRC) &&
   /document\.body\.classList\.toggle\('mg-subpage', onSub && inManagement\);/.test(SRC) &&
   /document\.body\.classList\.toggle\('mt-subpage', onSub && inMaintenance\);/.test(SRC));
ok("no desk route changed",
   ["management", "leasing", "maintenance", "capital", "reporting"]
     .every((d) => SRC.includes("openDesk('" + d + "')")));
ok("the four Maintenance doors still render in the primary-plus-support hierarchy",
   /mhPrimaryWorkCard\(m, S\.work, workCondition\)/.test(SRC) &&
   /<h3>Work orders<\/h3>/.test(SRC) &&
   /mhDoor\('turns',\s*'Turnovers'/.test(SRC) &&
   /mhDoor\('materials',\s*'Materials'/.test(SRC) &&
   /mhDoor\('vendors',\s*'Vendors & projects'/.test(SRC));
// ════════════════════════════════════════════════════════════════════
section("The frozen slices are untouched");

//  f6067d8 — the shared operator frame.
ok("the shared operator frame is untouched",
   /\.wrap\{\s*padding-top:\s*24px;\s*padding-inline:\s*28px;\s*padding-bottom:\s*80px;\s*\}/.test(CSS) &&
   /@media\(max-width:820px\)\{\s*\.wrap\{\s*padding-top:\s*28px;\s*padding-inline:\s*18px;\s*\}\s*\}/.test(CSS) &&
   /@supports \(padding-bottom: env\(safe-area-inset-bottom\)\)\{\s*\.wrap\{ padding-bottom: calc\(80px \+ env\(safe-area-inset-bottom\)\); \}\s*\}/.test(CSS));

//  fe9347e + af69da9 — the print frame and the print visibility closure. The
//  identity rule is placed AFTER the print block, so this asserts the print
//  block still owns the last word on .wrap and .lanes.
ok("the print frame is untouched",
   /@media print\{\s*\.wrap\{\s*max-width: none;\s*padding-top: 0;\s*padding-inline: 0;\s*padding-bottom: 0;\s*\}/.test(CSS));
ok("the print .lanes hide is untouched",
   /\.lanes\{\s*display: none!important;\s*\}\s*\}/.test(CSS));

//  The identity rule must not have inserted itself into either ownership
//  chain. Neither .wrap nor .lanes may appear after the print block.
const afterPrint = CSS.slice(CSS.lastIndexOf("display: none!important;"));
ok("the identity rule declares neither .wrap nor .lanes",
   !/\.wrap\s*\{/.test(afterPrint) && !/\.lanes\s*\{/.test(afterPrint),
   "something after the print block declares .wrap or .lanes");

//  The report's original print group, and the institutional rent-roll block.
ok("the report's print rules and the rent-roll print block are untouched",
   /\.top,\.navrow,\.controls,\.desk-actions,\.reporting-actions,\.lanes,\.drawer,\.receipt\{display:none!important\}/.test(CSS) &&
   /@page\{size:landscape;margin:12mm\}/.test(CSS) &&
   /\.ir-page\{max-width:none;padding:0\}/.test(CSS));

// ════════════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(64));
console.log("  assertions passed: " + passed);
console.log("  assertions failed: " + failed);
if (failed) { console.log("\n  FAILED:"); fails.forEach((f) => console.log("   ✗ " + f)); }
console.log("═".repeat(64));
console.log(
`
  Proof ceiling: SOURCE-VERIFIED for composition, plus a browser execution of
  the shipped setDeskCopy / psApplyModuleIdentity / syncCrumbLabels against the
  real DOM, measuring rendered visibility with checkVisibility() so that an
  element inside a hidden container reads as hidden. No live property, no
  authenticated session, no API and no operating data were involved, and none
  of the above is evidence of runtime behaviour.
`);
process.exit(failed ? 1 : 0);
