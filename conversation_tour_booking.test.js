const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');let state={card:{person:{id:'p',name:'Inquiry'},next:[]},opts:{conversation_id:'c'},detail:{mode:'human_takeover'},tab:'info'};
let calls=[],fail=false;
const W={document:{getElementById:()=>true,addEventListener:()=>{}},openPersonCard:Object.assign(()=>{},{__pcxStartTabBridge:true}),__psLive:{
loadResource:async()=>({data:{operating_timezone:'America/New_York',slots:[{id:'slot',status:'open',starts_at:'2030-01-02T15:00:00Z',leasing_agent_name:'Mike'}]}}),
bookConversationTour:async p=>{calls.push({...p});if(fail)throw new Error('Connection lost');return {data:{tour_id:'tour',slot_id:'slot',receipt:'Tour booked. No confirmation message was sent.'}};}
}};
const c=vm.createContext({window:W,console,setTimeout:()=>{},pcLiveState:()=>state,pcRenderLiveCard:()=>{},pcLiveRefreshAll:async()=>{}});
for(const name of ['pcLiveEsc','pcLiveConversationId','pcLiveIsClosed','pcLiveTourBookingHtml','pcTourSlotLabel','pcLoadTourBooking','pcChooseTourSlot','pcBookConversationTour']){
const at=html.indexOf('function '+name+'(');assert.ok(at>=0,name+' exists');const start=html.slice(at-6,at)==='async '?at-6:at;const end=html.indexOf('\n}',at)+2;vm.runInContext(html.slice(start,end),c);W[name]=c[name];
}
vm.runInContext(fs.readFileSync('person-card-information.js','utf8'),c);
(async()=>{
assert.match(W.pcLiveInfoHtml(state),/Schedule a tour/,'installed renderer has future booking action');
await c.pcLoadTourBooking();assert.match(W.pcLiveInfoHtml(state),/Mike/);assert.match(W.pcLiveInfoHtml(state),/EST/);
c.pcChooseTourSlot('slot');fail=true;await c.pcBookConversationTour();assert.match(W.pcLiveInfoHtml(state),/Connection lost/);assert.ok(!state.tour_booking.booked);
fail=false;await c.pcBookConversationTour();assert.equal(calls[0].idempotency_key,calls[1].idempotency_key,'response loss keeps same intent');assert.deepEqual(Object.keys(calls[1]).sort(),['conversationId','idempotency_key','slot_id']);assert.match(W.pcLiveInfoHtml(state),/No confirmation message was sent/);
state.detail.commercial_state='closed_not_fit';assert.doesNotMatch(W.pcLiveInfoHtml(state),/Schedule a tour|Book tour/);
state.detail.commercial_state=null;W.__psLive.loadResource=async()=>{throw new Error('Read failed');};await c.pcLoadTourBooking();assert.match(W.pcLiveInfoHtml(state),/Read failed/);assert.doesNotMatch(W.pcLiveInfoHtml(state),/Mike/);
W.__psLive.loadResource=async()=>({data:{slots:[]}});await c.pcLoadTourBooking();assert.match(W.pcLiveInfoHtml(state),/unavailable/,'missing timezone is not empty availability');
console.log('CONVERSATION_TOUR_RENDER_PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
