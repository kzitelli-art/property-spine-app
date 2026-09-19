/* The old offer-id-only refusal was superseded by the governed initial
 * proposal. Test today's actual rendered affordance and its context guards. */
"use strict";
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('./tests/assert_reporter');
const source=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const start=source.indexOf('function psArRenderDetail(d)'),end=source.indexOf('var _psLeaseSetupState',start);
assert.ok(start>=0&&end>start,'actual detail renderer exists');
const host={innerHTML:'',setAttribute(){}},state={detail:null,error:{}};
const sandbox={document:{getElementById:()=>host},_psArUi:state,esc:x=>String(x),psArNext:()=>({state:'blocked'}),psArReviseForm:()=>'<button>PROPOSE_TERMS</button>'};
for(const name of ['psArActionTitle','psArActionCopy','psArPrimaryAction','psArEphemeral','renderMoveInSection','psArExecutionPanel','psArPersonHeader','psArEconomics','psArProgress','psArAudit'])sandbox[name]=()=>'';
vm.runInNewContext(source.slice(start,end),sandbox);
const complete={application_id:'app-1',conversion_id:'conversion-1',space_id:'bed-1',status:'submitted',application_offer:null};
function offersTerms(d){sandbox.psArRenderDetail(d);return host.innerHTML.includes('PROPOSE_TERMS');}
assert.equal(offersTerms(complete),true,'bound legacy submitted application can propose initial terms');
for(const field of ['application_id','conversion_id','space_id'])assert.equal(offersTerms({...complete,[field]:null}),false,'missing '+field+' hides proposal');
assert.equal(offersTerms({...complete,space_id:null,space:{id:'bed-1'}}),true,'nested canonical exact space works');
assert.equal(offersTerms({...complete,packet:{id:'packet-1'}}),false,'packet freezes proposal');
for(const status of ['draft','executed','rejected'])assert.equal(offersTerms({...complete,status}),false,status+' hides proposal');
for(const status of ['approved','lease_ready'])assert.equal(offersTerms({...complete,status}),true,status+' keeps governed proposal');
