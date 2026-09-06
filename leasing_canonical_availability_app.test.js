"use strict";
const fs=require("fs"), path=require("path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
let pass=0,fail=0;
const ok=(c,m)=>{if(c){pass++;console.log("   PASS  "+m);}else{fail++;console.log("   FAIL  "+m);}};
function extract(name){
  const asyncStart=html.indexOf("async function "+name+"(");
  const start=asyncStart>=0?asyncStart:html.indexOf("function "+name+"(");
  if(start<0) throw new Error("not found: "+name);
  const open=html.indexOf("{",start); let depth=0,i=open;
  for(;i<html.length;i++){if(html[i]==="{")depth++;else if(html[i]==="}"){depth--;if(depth===0){i++;break;}}}
  return html.slice(start,i);
}

const data={availabilityCanonical:null,availabilityCanonicalError:null,availabilityCanonicalScope:null,rentRollError:null};
let currentProperty="p1";
let signedIn=true;
const window={__psLive:{sessionMeta:()=>({user_id:"u1",property_id:currentProperty}),loadResource:async()=>({data:{headline:{},rows:[]}})}};
const box={};
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
new AsyncFunction("data","window","_rrSignedIn","canonicalAvailabilityRow","availabilityCanonicalScope","loadAvailabilityCanonical","leasingRenderIsCurrent","applyRentRollToLeasing","availableUnitsFor","__leasingRenderGeneration","__availabilityCanonicalRequestGeneration",
  extract("canonicalAvailabilityRow")+"\n"+
  extract("availabilityCanonicalScope")+"\n"+
  extract("loadAvailabilityCanonical")+"\n"+
  extract("leasingRenderIsCurrent")+"\n"+
  extract("applyRentRollToLeasing")+"\n"+
  extract("availableUnitsFor")+"\n"+
  "__leasingRenderGeneration=1;__availabilityCanonicalRequestGeneration=0;this.canonicalAvailabilityRow=canonicalAvailabilityRow;this.loadAvailabilityCanonical=loadAvailabilityCanonical;this.applyRentRollToLeasing=applyRentRollToLeasing;this.availableUnitsFor=availableUnitsFor;this.isCurrent=leasingRenderIsCurrent;this.setGeneration=function(n){__leasingRenderGeneration=n;};this.generation=function(){return __leasingRenderGeneration;};this.requestGeneration=function(){return __availabilityCanonicalRequestGeneration;};")
  .call(box,data,window,()=>signedIn,undefined,undefined,undefined,undefined,undefined,undefined,0,0);

const rows=[
  {space_id:"bed-a",unit_number:"402",space_label:"Bedroom A",position_kind:"bed",marketing_state:"marketable_now",available_from:"2026-07-27",physical_readiness:"ready",possession_state:"vacant"},
  {space_id:"bed-b",unit_number:"402",space_label:"Bedroom B",position_kind:"bed",marketing_state:"marketable_now",available_from:"2026-07-27",physical_readiness:"ready",possession_state:"vacant"}
];
console.log("\n== canonical mapping ==");
const mapped=rows.map(box.canonicalAvailabilityRow);
ok(mapped.length===2,"all canonical positions are retained");
ok(mapped[0].space_id!==mapped[1].space_id && mapped[0].space_label!==mapped[1].space_label,
  "duplicate unit numbers retain per-position identity");
ok(mapped.every(r=>r.asking===null&&r.target_rent===null),"canonical availability never invents pricing");

console.log("\n== signed-in leasing projection ==");
data.availabilityCanonical={rows,headline:{}};
let lease=box.applyRentRollToLeasing({},null,data.availabilityCanonical);
ok(lease.available_now.length===2,"signed-in availability comes from canonical rows");
ok(lease.available_now[0].space_id==="bed-a"&&lease.available_now[1].space_id==="bed-b",
  "applyRentRollToLeasing preserves row order and space identity");
data.availabilityCanonical=null; data.availabilityCanonicalError={unavailable:true};
lease=box.applyRentRollToLeasing({},null,null);
ok(lease.availability_unavailable===true&&lease.available_now.length===0,
  "canonical failure is unavailable, never a rent-roll fallback");
data.availabilityCanonical={rows:[],headline:{}}; data.availabilityCanonicalError=null;
lease=box.applyRentRollToLeasing({},null,data.availabilityCanonical);
ok(lease.availability_unavailable===false&&lease.available_now.length===0,
  "canonical empty is distinct from unavailable");
const operationalRows=rows.concat({space_id:"bed-c",unit_number:"402",space_label:"Bedroom C",
  marketing_state:"upcoming",successor_state:"successor_locked",notice_state:"on_notice",
  lease_end:"2026-12-31",resident:{name:"Resident C"},future_commitment:{state:"locked",lease_id:"L2"}});
data.availabilityCanonical={rows:operationalRows,headline:{}};
const priorRentRoll={has_data:true,source:"prior-rent-roll",availability:[
  {unit_number:"OLD-1",unit_type:"Studio",availability_state:"future",available_from:"2027-01-01",
    move_out:"2026-12-01",lease_end:"2026-12-01",current_status:"notice",contractual_open_forward:true,
    current_resident:"Resident Old",future_commitments:[]}
]};
lease=box.applyRentRollToLeasing({},priorRentRoll,data.availabilityCanonical);
ok(lease.future_move_outs.length===1&&lease.future_move_outs[0].unit==="OLD-1"&&
  lease.upcoming_expirations[0].unit==="OLD-1"&&lease.on_notice[0].unit==="OLD-1",
  "canonical cutover preserves prior-source future and notice facts for downstream Leasing work");
ok(lease.future_availability[0].space_id==="bed-c"&&lease.future_availability[0].move_out_date===null,
  "canonical future availability does not manufacture a move-out date");

console.log("\n== render race regression ==");
const renderSource=extract("renderLeasing");
const renderOpen=renderSource.indexOf("{");
const renderApply=renderSource.indexOf("lastLeasing=lease;")+"lastLeasing=lease;".length;
const renderBody=renderSource.slice(renderOpen+1,renderApply)+"\nreturn lastLeasing;";
const renderArgs=["force","availabilityCanonicalScope","__leasingRenderGeneration","loadObligationsGuarded","loadLeasingRead","loadApplications","loadManagementRead","loadRentRoll","loadAvailabilityCanonical","leasingRenderIsCurrent","obligationsFailed","deskObligationsUnavailable","normalizeLeasingPayload","leasingPayloadOrHonestBlank","applyRentRollToLeasing","lastLeasing"];
function makeRenderer(body){return new AsyncFunction(...renderArgs,body);}
function gate(){let resolve; const promise=new Promise(r=>{resolve=r;}); return {promise,resolve};}
const rendererUnguarded=makeRenderer(renderBody.replace("if(!leasingRenderIsCurrent(renderScope,renderGeneration)) return;",""));
const rendererGuarded=makeRenderer(renderBody);
async function runRender(renderer, scopeBefore, scopeAfter){
  let currentScope=scopeBefore; const all=gate(); const load=()=>all.promise;
  const result=renderer(true,()=>currentScope,0,load,load,load,load,load,load,
    (scope,generation)=>scope===currentScope&&generation===1,()=>false,()=>{},x=>x,x=>x,
    (lease,rr,canonical)=>({applied:canonical&&canonical.rows[0].space_id}),null);
  currentScope=scopeAfter; all.resolve({rows:[{space_id:"p1-room"}],headline:{}});
  return result;
}
Promise.all([runRender(rendererUnguarded,"u1|p1","u1|p2"),runRender(rendererGuarded,"u1|p1","u1|p2")]).then(([oldResult,newResult])=>{
  ok(oldResult&&oldResult.applied==="p1-room","old unguarded render actually applies P1 after a P2 switch");
  ok(newResult===undefined,"successor render refuses the obsolete P1 apply");
currentProperty="p2";
ok(box.isCurrent("u1|p1",1)===false,"successor rejects a resolved P1 result after the P2 scope switch");
currentProperty="p1"; box.setGeneration(2);
ok(box.isCurrent("u1|p1",1)===false,"successor rejects an older same-scope render");
ok(box.generation()===2&&box.isCurrent("u1|p1",2)===true,"successor accepts only the current same-scope render");
signedIn=false; currentProperty=null;
ok(box.isCurrent("u1|p1",2)===false,"successor rejects a resolved result after logout");
signedIn=true; currentProperty="p1";

console.log("\n== direct Leasing list output ==");
data.availabilityCanonical={rows,headline:{}};
const listed=box.availableUnitsFor();
ok(listed.length===2&&listed[0].space_id==="bed-a"&&listed[1].space_label==="Bedroom B",
  "availableUnitsFor directly preserves canonical position identity");
ok(listed.every(r=>r.asking===null),"availableUnitsFor keeps unknown asking price null");
const E=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");
const displayBox={};
new Function("data","lease","esc","_rrSignedIn","availableUnitsFor","rentRollStats",
  extract("leasingAvailabilityBody")+"\nthis.leasingAvailabilityBody=leasingAvailabilityBody;")
  .call(displayBox,data,{},E,()=>true,box.availableUnitsFor,()=>null);
const display=displayBox.leasingAvailabilityBody();
ok(/Bedroom A/.test(display)&&/Bedroom B/.test(display),"Leasing list displays both canonical spaces");
ok(!/\$0/.test(display)&&/Asking price not recorded here/.test(display),"Leasing list does not turn unknown pricing into zero");
data.availabilityCanonical=null; data.availabilityCanonicalError=null;
const notLoaded=displayBox.leasingAvailabilityBody();
ok(/Availability could not be loaded/.test(notLoaded)&&!/No rooms or units are available/.test(notLoaded),
  "a signed-in list without a completed read is unavailable, not empty success");

console.log("\n== loader scope ==");
window.__psLive.loadResource=async()=>({data:{headline:{},rows}});
box.loadAvailabilityCanonical(false).then(async()=>{
  ok(data.availabilityCanonical.rows.length===2,"loader stores the canonical response");
  ok(data.availabilityCanonicalScope==="u1|p1","loader keys cached truth to session and property");
  data.availabilityCanonical=null;
  const pending=[];
  window.__psLive.loadResource=()=>new Promise(resolve=>pending.push(resolve));
  const older=box.loadAvailabilityCanonical(true);
  const newer=box.loadAvailabilityCanonical(true);
  pending[1]({data:{headline:{},rows:[{space_id:"newer"}]}});
  await newer;
  pending[0]({data:{headline:{},rows:[{space_id:"older"}]}});
  await older;
  ok(data.availabilityCanonical.rows[0].space_id==="newer",
    "late older same-scope response cannot overwrite newer canonical cache");
  console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
  process.exit(fail?1:0);
}).catch(err=>{console.error(err);process.exit(1);});
}).catch(err=>{console.error(err);process.exit(1);});
