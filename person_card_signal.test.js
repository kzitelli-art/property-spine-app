"use strict";
const path=require("path");
const pc=require(path.join(__dirname,"person-card-information.js"));
let pass=0,fail=0;
function ok(name,cond,detail){if(cond){pass++;console.log("  PASS "+name);}else{fail++;console.log("  FAIL "+name+(detail?"\n       "+detail:""));}}
function msg(i,dir){return {id:"m"+i,event_type:"conversation_message",source:"conversation",direction:dir||"inbound",occurred_at:`2026-07-21T15:${String(i).padStart(2,"0")}:00Z`,summary:"raw message "+i};}
const card={
  person:{id:"p1",name:"Mike Grivna"},stage:"prospect",
  relationship:{property_name:"Solo on Chestnut",operating_position:"post_tour",last_contact_at:"2026-07-21T15:22:00Z",vitals:{unit_type:"2 Bedroom",move_month:"February 2027",budget:"1500–2000",pets:"Bird"}},
  latest_tour:{tour_id:"t1",outcome:"completed",disposition:"start_application",interest_read:"hot",what_landed:["layout_size","location","building_feel","extra"],whats_in_way:["still_comparing","price","extra"],note:"Liked the two-bedroom layout.",captured_by_name:"Kandice",captured_at:"2026-07-21T14:00:00Z"},
  next:[{id:"o1",rung:"send_application",label:"Tour follow-up — Mike Grivna — recommended: send the application",owner_name:"Kandice",due_by:"2026-07-22T12:59:00Z",primary_action:{kind:"task_write",code:"send_application",target:{type:"conversion",id:"c1"}}}],
  history:[
    ...Array.from({length:20},(_,i)=>msg(i,i%2?"outbound":"inbound")),
    {id:"obs1",event_type:"observation",verb:"pets updated: cat, hamster, bird → bird",source:"ai_conversation",occurred_at:"2026-07-21T15:21:00Z"},
    {id:"lead1",event_type:"lead_created",source:"leasing_lead",source_id:"lead1",occurred_at:"2026-07-20T10:00:00Z"}
  ]
};
const o=pc.buildOverview(card);
ok("current state is concise post-tour truth",o.current_state_sentence==="Tour completed. Application has not been sent.",o.current_state_sentence);
ok("operating position preserved",o.operating_position==="Post-tour",o.operating_position);
ok("facts carry captured unit type",o.facts.some(f=>f.label==="Looking for"&&f.value==="2 Bedroom"));
ok("facts carry final pet value once",o.facts.filter(f=>f.label==="Pets"&&f.value==="Bird").length===1);
ok("tour recap caps landed at three",o.latest_tour.landed.length===3,String(o.latest_tour.landed.length));
ok("tour recap caps blockers at two",o.latest_tour.blockers.length===2,String(o.latest_tour.blockers.length));
ok("machine workflow sentence becomes human title",o.next[0].title==="Send the application",o.next[0].title);
ok("post-tour next explains why",o.next[0].reason==="Recommended after the completed tour.",o.next[0].reason);
ok("raw communication entries are absent",!o.timeline.some(x=>/^raw message/.test(x.summary||"")));
ok("twenty messages collapse to one communication summary",o.timeline.filter(x=>x.communication_link).length===1);
ok("observation churn is absent",!o.timeline.some(x=>/pets updated/i.test((x.title||"")+" "+(x.summary||""))));
ok("explicit post-tour capture creates one tour milestone",o.timeline.filter(x=>x.kind==="tour_completed"||x.kind==="post_tour_assessment_captured").length===1);
ok("lead creation remains a milestone",o.timeline.some(x=>x.kind==="lead_created"));
const appCard=JSON.parse(JSON.stringify(card));
appCard.current_application={status:"sent"};
appCard.next=[];
const appOverview=pc.buildOverview(appCard);
ok("application dispatch changes current state",appOverview.current_state_sentence==="Application sent. Waiting for the applicant to begin.",appOverview.current_state_sentence);
const noShow={person:{name:"No Show"},history:[{event_type:"tour_no_show",occurred_at:"2026-07-20T12:00:00Z"}]};
ok("no-show remains a high-level milestone",pc.buildOverview(noShow).timeline.some(x=>x.kind==="tour_no_show"));
ok("message event normalizes as communication",pc.eventKind({event_type:"sms_received"})==="communication");
ok("random observation is not allowlisted",!pc.buildOverview({history:[{event_type:"observation",summary:"noise"}]}).timeline.length);
const obligationClose={history:[{event_type:"closed",source:"obligation",summary:"Kandice closed: Application follow-up",occurred_at:"2026-07-23T10:00:00Z"}]};
ok("generic obligation closure is not mislabeled as relationship closed",!pc.buildOverview(obligationClose).timeline.some(x=>x.kind==="relationship_closed"));
const realRelationshipClose={history:[{event_type:"relationship_closed",source:"relationship",summary:"Closed — not a fit",occurred_at:"2026-07-23T10:00:00Z"}]};
ok("explicit relationship closure remains a milestone",pc.buildOverview(realRelationshipClose).timeline.some(x=>x.kind==="relationship_closed"));


const keepCard={relationship:{vitals:{}},latest_tour:{outcome:"completed",disposition:"keep_working",captured_at:"2026-07-21T14:00:00Z"},next:[{rung:"continue_follow_up",label:"Continue follow-up"}]};
ok("keep-working disposition becomes continued follow-up",pc.buildOverview(keepCard).current_state_sentence==="Tour completed. Continued follow-up is needed.");
const changeCard={latest_tour:{outcome:"completed",disposition:"needs_change",whats_in_way:["pricing"],captured_at:"2026-07-21T14:00:00Z"}};
ok("needs-change disposition surfaces the blocker state",pc.buildOverview(changeCard).current_state_sentence==="Tour completed. The prospect would move forward if a blocker changes.");
const noShowStructured={latest_tour:{outcome:"no_show",captured_at:"2026-07-21T14:00:00Z"}};
const noShowOverview=pc.buildOverview(noShowStructured);
ok("structured no-show gets a clear current state",noShowOverview.current_state_sentence==="Tour no-show. Follow-up or rescheduling may be needed.");
ok("structured no-show gets one timeline milestone",noShowOverview.timeline.filter(x=>x.kind==="tour_no_show").length===1);

const serverOverview={overview:{timeline:[{kind:"conversation_summary_changed",title:"Conversation active",summary:"Server summary",occurred_at:"2026-07-21T15:22:00Z"}],communication_summary:{message_count:12,last_inbound_at:"2026-07-21T15:22:00Z"}}};
const serverTimeline=pc.buildOverview(serverOverview).timeline;
ok("server-authored communication summary is not duplicated",serverTimeline.filter(x=>x.kind==="conversation_summary_changed").length===1);

console.log(`${pass}/${pass+fail}`);
process.exit(fail?1:0);
