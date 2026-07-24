"use strict";
const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const src=fs.readFileSync(path.join(root,'conversations-board.js'),'utf8');
let pass=0,fail=0;
function ok(name,c){c?(pass++,console.log('  PASS '+name)):(fail++,console.log('  FAIL '+name));}
ok('three active buckets only',/var ACTIVE=\['needs_attention','ai_handling','no_response'\]/.test(src));
ok('closed is a details receipt',/class=\\?"pscb-closed/.test(src)&&/Recently closed/.test(src));
ok('browser requires server operating bucket',/row\.operating_bucket/.test(src)&&/Deploy the Conversations operating-bucket API/.test(src));
ok('browser does not classify from waiting_on',!/(function|var|const)\s+classify/.test(src));
ok('row CTA is Open',/data-pscb-open/.test(src)&&/>Open<\/button>/.test(src));
ok('person names open canonical card',/window\.openPersonCard/.test(src)&&/source:'leasing_conversations'/.test(src));
ok('Open delegates to canonical workspace',/openLeasingConversation/.test(src)&&/ps:open-conversation/.test(src));
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
