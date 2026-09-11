"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
let viewer='other';
const W={__psLive:{sessionMeta:()=>({user_id:viewer})},document:{getElementById:()=>true,addEventListener:()=>{}},openPersonCard:Object.assign(()=>{}, {__pcxStartTabBridge:true})};
const c=vm.createContext({window:W,console,setTimeout:()=>{}});
for(const name of ['conversationHumanOwner','pcLiveDeliveryLabel','pcLiveReplyFailureText']){
  const start=html.indexOf('function '+name+'('),end=html.indexOf('\n}',start)+2;
  vm.runInContext(html.slice(start,end),c); W[name]=c[name];
}
vm.runInContext(fs.readFileSync(process.argv[2]||path.join(__dirname,'person-card-information.js'),'utf8'),c);
assert.equal(typeof W.pcLiveInfoHtml,'function','actual installed override is tested');
const detail={mode:'human_takeover',human_owner:{obligation_id:'work',user_id:'mike',name:'Mike',status:'escalated'}};
const st={card:{person:{name:'Prospect'},next:[]},detail,tab:'info'};
let out=W.pcLiveInfoHtml(st);
assert.match(out,/Conversation owner/);
assert.match(out,/>Mike</,'another staff member sees canonical owner');
assert.doesNotMatch(out,/All clear|Nothing needs attention/,'absence of next work cannot claim no work needed');
assert.match(out,/No next action recorded/);
viewer='mike';out=W.pcLiveInfoHtml(st);assert.match(out,/>You</,'bound owner sees You');
detail.human_owner=null;out=W.pcLiveInfoHtml(st);assert.match(out,/Owner not recorded/);
st.card.next=[{label:'Reply to inquiry',owner_name:'Mike',primary_action:{kind:'navigation',target:{type:'conversation',id:'c'}}}];
out=W.pcLiveInfoHtml(st);assert.match(out,/Reply to inquiry/,'canonical next action preserved');assert.match(out,/>Open</);
assert.match(c.pcLiveDeliveryLabel({provider_status:null}),/Prepared.*no delivery recorded/);
assert.match(c.pcLiveDeliveryLabel({provider_status:'refused'}),/Not delivered/);
assert.match(c.pcLiveDeliveryLabel({provider_status:'queued'}),/delivery not confirmed/);
assert.equal(c.pcLiveDeliveryLabel({provider_status:'delivered'}),'Delivered');
console.log('Installed Overview owner/empty-next and delivery labels passed');

assert.match(c.pcLiveReplyFailureText({provider_status:'refused',send_reason:'customer_care_requires_opted_in_consent'}),/texting permission is required/);
assert.match(c.pcLiveReplyFailureText({provider_status:'refused'}),/refused/);
assert.doesNotMatch(c.pcLiveReplyFailureText({provider_status:'refused'}),/permission/);
const board=fs.readFileSync(path.join(__dirname,'conversations-board.js'),'utf8');
vm.runInContext(board.match(/function waitingLabel\(row\)\{[^\n]+/)[0],c);
assert.equal(c.waitingLabel({control_mode:'human_takeover',waiting_on:'none'}),'Staff handling');
assert.equal(c.waitingLabel({control_mode:'human_takeover',waiting_on:'prospect'}),'Waiting on prospect');
detail.human_owner={obligation_id:'work',user_id:'mike',name:'Mike',status:'blocked'};
assert.match(W.pcLiveInfoHtml(st),/>You</,'blocked remains actively owned work');

st.card.next=[];
detail.human_owner.label='Review the escalated pricing question';detail.human_owner.type='review';detail.human_owner.due_at='2026-10-01T10:00:00Z';
out=W.pcLiveInfoHtml(st);assert.match(out,/Review the escalated pricing question/);assert.doesNotMatch(out,/No next action recorded/);
detail.human_owner.status='complete';out=W.pcLiveInfoHtml(st);assert.doesNotMatch(out,/Review the escalated pricing question/);assert.match(out,/No next action recorded/);
