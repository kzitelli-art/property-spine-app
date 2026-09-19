"use strict";
const assert=require('./tests/assert_reporter'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
function extract(name,indent){
  const start=html.indexOf('function '+name+'(');assert.ok(start>=0,name);
  const end=html.indexOf('\n'+indent+'}',start);assert.ok(end>start,name+' end');
  return html.slice(start,end+indent.length+2);
}
let viewer='mike';
const ctx=vm.createContext({window:{__psLive:{sessionMeta:()=>({user_id:viewer})}},esc:String,pcLiveEsc:String,_ago:()=>'',_fmtWhen:()=>'',_actuallyDispatched:()=>false,pcLiveIsClosed:st=>st.closed===true});
for(const [fn,indent] of [['conversationHumanOwner',''],['_supervisionStrip','    '],['pcLiveShellTop',''],['pcLiveSupervisionHtml','']])vm.runInContext(extract(fn,indent),ctx);
const row={conversation_id:'c',control_mode:'human_takeover',control_bucket:'you_own'};
const state={mode:'human_takeover',messages:[]};
for(const id of ['mike','other-staff']){
  viewer=id;
  const rendered=ctx._supervisionStrip(row,state);
  assert.doesNotMatch(rendered,/You are handling|You have control|You own the next reply|>You</,'mode cannot assign current viewer');
  assert.match(rendered,/Owner not recorded/,'missing identity remains visible');
  assert.match(rendered,/data-handback=/,'staff control remains operable');
  assert.match(rendered,/Take ownership/,'legacy ownerless state has a recovery action');
  assert.match(ctx.pcLiveSupervisionHtml({detail:state}),/Take ownership/);
  const top=ctx.pcLiveShellTop({card:{person:{name:'Prospect'}},detail:state});
  assert.doesNotMatch(top,/You are handling/);
  assert.match(top,/Owner not recorded/);
}
const assigned={...state,human_owner:{obligation_id:'o',user_id:'mike',name:'Mike',status:'open'}};
viewer='other-staff';
assert.match(ctx._supervisionStrip(row,assigned),/Mike is handling this conversation/);
assert.doesNotMatch(ctx._supervisionStrip(row,assigned),/>You</);
assert.match(ctx.pcLiveShellTop({card:{},detail:assigned}),/Mike is handling/);
viewer='mike';
assert.match(ctx._supervisionStrip(row,assigned),/You are handling this conversation/);
assert.match(ctx._supervisionStrip({...row,control_bucket:'exception',bucket_reason_code:'unowned_engaged'},assigned),/You own the next reply/,'fresh owned detail supersedes stale unowned queue');
assert.match(ctx.pcLiveShellTop({card:{},detail:assigned}),/You are handling/);
assert.doesNotMatch(ctx.pcLiveSupervisionHtml({detail:assigned}),/Take ownership/,'current owner does not need another claim');
assert.match(ctx.pcLiveShellTop({card:{},detail:{...assigned,human_owner:{...assigned.human_owner,status:'complete'}}}),/Owner not recorded/,'completed work does not retain current ownership');
viewer=null;
assert.doesNotMatch(ctx._supervisionStrip(row,assigned),/You are handling/,'unbound viewer cannot claim identity');
assert.match(ctx._supervisionStrip({}, {mode:'ai_active',messages:[]}),/AI is handling/,'AI control remains distinct');
const website={mode:'awaiting_review',bucket_reason_code:'website_inquiry_pending_human',control_bucket:'needs_you',messages:[]};
assert.match(ctx._supervisionStrip({},website),/This conversation has no owner/);
assert.doesNotMatch(ctx._supervisionStrip({},website),/AI is handling|Draft ready for review/);
assert.doesNotMatch(ctx.pcLiveSupervisionHtml({detail:website}),/AI is handling|Draft ready for review/);
assert.match(ctx.pcLiveSupervisionHtml({detail:website}),/Website inquiry needs attention/);
assert.doesNotMatch(ctx._supervisionStrip(row,{...state,commercial_state:'closed_not_fit'}),/data-handback=|Owner not recorded/,'closed relationship retains terminal presentation');
console.log('conversation owner wording: two-viewer render controls passed');
