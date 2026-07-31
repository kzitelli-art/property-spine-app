"use strict";
const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const src=fs.readFileSync(path.join(root,'conversations-board.js'),'utf8');
let pass=0,fail=0;
function ok(name,c){c?(pass++,console.log('  PASS '+name)):(fail++,console.log('  FAIL '+name));}
ok('three active buckets only',/var ACTIVE=\['needs_attention','ai_handling','no_response'\]/.test(src));
ok('closed is a details receipt',/class=\\?"pscb-closed/.test(src)&&/Recently closed/.test(src));
ok('browser requires server operating bucket',/row\.operating_bucket/.test(src)&&/Deploy the Lead Conversations operating-bucket API/.test(src));
ok('browser does not classify from waiting_on',!/(function|var|const)\s+classify/.test(src));
ok('row CTA is Open',/data-pscb-open/.test(src)&&/>Open<\/button>/.test(src));
ok('person names open canonical card',/window\.openPersonCard/.test(src)&&/source:'leasing_conversations'/.test(src));
/* This check used to assert that Open referenced `openLeasingConversation`
 * and dispatched `ps:open-conversation`. Both were true, the check passed on
 * every run, and the button did nothing — because no such function has ever
 * existed and nothing listens for that event. It tested the WIRING and not
 * the OUTCOME, so it certified a dead control.
 *
 * These assert what the operator actually gets: Open lands on the Person
 * Card's Communication tab, which is the conversation workspace, and the
 * dead lookups cannot come back. */
ok('Open opens the Person Card on the thread',
   /function openConversation/.test(src) &&
   /start_tab:'communication'/.test(src) &&
   /context:'communications'/.test(src));
/* Targets the MECHANISM, not the words — the names still appear in the
 * comment above openConversation explaining why they went, and that
 * explanation is worth keeping. What must not come back is the dynamic
 * lookup itself, and the DOM probe it fell through to. */
ok('Open no longer hunts for functions that do not exist',
   !/window\[names\[/.test(src) && !/legacyFor\s*\(/.test(src));
ok('an unresolved sender is told so, not silently ignored',
   /No person is resolved on this conversation yet/.test(src));
/* A human-owned conversation is human-driven by definition, so the reason
 * badge and the control badge both resolved to "Human owned" and the row
 * printed the same chip twice. Compared as text so any future pair landing
 * on one phrase is caught too. */
ok('a row never prints the same badge twice',
   /controlText===reasonText/.test(src));
/* The board owns the page header. The legacy heading element is hidden
 * directly rather than only through its wrapper, because the wrapper is
 * tagged by a DOM walk that looks for subtitle copy this board replaced —
 * so the walk fails and the wrapper never gets the class. */
ok('the legacy page title is hidden directly, not just via its wrapper',
   /\.psx-conv-page-title\{?[^}]*display:none/.test(src) ||
   /psx-conv-page-title\}?[^']*display:none/.test(src));
ok('tab semantics are present',/role=\\?"tablist/.test(src)&&/role=\\?"tabpanel/.test(src)&&/aria-controls/.test(src));
ok('keyboard navigation is present',/ArrowRight/.test(src)&&/ArrowLeft/.test(src)&&/Home/.test(src)&&/End/.test(src));
ok('no routine local refresh control',!/>Refresh<\/button>/.test(src));
ok('no operating writes',!/(takeOverConversationService|handBackConversationService|sendDraftService|fetch\([^)]*method\s*:\s*['"]POST)/.test(src));
ok('AI, no response, and attention sentences exist',/AI is handling this conversation/.test(src)&&/Outreach was delivered, but the prospect has not replied/.test(src)&&/human decision is required/i.test(src));
const index=path.join(root,'index.html');
if(fs.existsSync(index)){
  const html=fs.readFileSync(index,'utf8');
  ok('index loads conversations board once',(html.match(/conversations-board\.js/g)||[]).length===1);
}
console.log(`${pass}/${pass+fail}`);
process.exit(fail?1:0);
