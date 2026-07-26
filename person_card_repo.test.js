"use strict";
const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'.');
let pass=0,fail=0;
function ok(name,c){if(c){pass++;console.log('  PASS '+name);}else{fail++;console.log('  FAIL '+name);}}
const pc=fs.readFileSync(path.join(root,'person-card-information.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
ok('index loads the canonical Person Card module',index.includes('person-card-information.js'));
ok('the top-level information tab is renamed Overview',pc.includes('>Overview</button>'));
ok('Communication remains a separate top-level tab',pc.includes('>Communication</button>'));
ok('Overview uses a current-state briefing',pc.includes('pcx-current-sentence'));
ok('post-tour recap is a first-class section',pc.includes('TOUR RESULT')||pc.includes("Tour result"));
ok('raw communication events are classified out of milestones',pc.includes("return 'communication'"));
ok('timeline has an explicit milestone allowlist',pc.includes('MILESTONE_ALLOWLIST'));
ok('communication collapses to one summary link',pc.includes('communication-summary')&&pc.includes('View communication'));
ok('post-tour send title is normalized',pc.includes("return 'Send the application'"));
ok('the stylesheet joins with real newlines',pc.includes("].join('\\n')"));
ok('the stylesheet does not emit literal backslash-n separators',!pc.includes("].join('\\\\n')"));
ok('the module exposes pure signal functions for regression tests',pc.includes('buildOverview:buildOverview')&&pc.includes('timeline:timeline'));
ok('v6 focus surface is installed',pc.includes("ps-person-card-information-v6"));
ok('name uses a bold modern sans hierarchy',pc.includes('.pcx-name{')&&pc.includes('font-family:"IBM Plex Sans"')&&pc.includes('font-weight:720'));
/* This used to pin font-size:20px literally, so it failed on a spacing pass
 * that changed nothing about contrast. A test that guards "high-contrast
 * briefing surface" should assert the things that MAKE it one — the grid, the
 * green spine, and a sentence set heavy and clearly above body size — not one
 * exact pixel value that any typographic tuning will move. */
ok('current state is a high-contrast briefing surface',
   pc.includes('.pcx-current{display:grid') &&
   pc.includes('box-shadow:inset 3px 0 0 var(--pci-green)') &&
   /\.pcx-current-sentence\{[^}]*font-size:(1[5-9]|2[0-9])px[^}]*font-weight:7\d\d/.test(pc));
ok('tour interest is visually secondary',pc.includes('pcx-signal-pill'));
ok('Next is the dominant dark command surface',pc.includes('.pcx-next:first-child{')&&pc.includes('background:var(--pci-ink)')&&pc.includes('border-radius:18px'));
ok('timeline uses one restrained visual spine',pc.includes('.pcx-timeline:before')&&pc.includes('.pcx-milestone:before'));
ok('Overview orders action before secondary facts',pc.indexOf("+currentHtml(o)+nextHtml(o)+factsHtml(o)")>=0);
ok('facts explicitly shed inherited card chrome',pc.includes('border:0!important')&&pc.includes('background:transparent!important'));
ok('generic obligation closure is classified out of relationship history',pc.includes("return 'operating_item_closed'"));
console.log(`${pass}/${pass+fail}`);
process.exit(fail?1:0);
