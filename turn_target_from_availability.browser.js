/* ══════════════════════════════════════════════════════════════════════════
   turn_target_from_availability.browser.js — SIGNED IN, OWNED RUNTIME.

   A turn slips (the walk finds more than the plan allowed). Leasing sees the
   row say `incomplete · turn scope exceeds plan` — the server's word, not a
   paraphrase — and management re-states the ready date with a reason FROM
   THAT ROW through POST /operator/units/:unitId/turn-target. The receipt is
   the re-read: the row shows the new date and `expected · turnover in
   progress`, and the API agrees.

   Controls: a turn whose plan holds offers "Change", not "Re-state"; a unit
   with no turn shows no control; a leasing-only session shows no control at
   all (the server decides who may re-state; the browser only reflects it).

   Fixture: its own property on the OWNED proof database (never Greenery),
   built with the API repo's own services. Refuses to run without the owned
   runtime. Run from the app repo:
     E2E_PROOF_MANIFEST=... E2E_DATABASE_URL=... DATABASE_URL=... \
     node --require <api>/tests/e2e/proof_fence_preload.js \
          turn_target_from_availability.browser.js
   ══════════════════════════════════════════════════════════════════════════ */
"use strict";
const fs=require("fs"),path=require("path");
const APP=__dirname;
const { serveStatic, serveTls } = require(path.join(APP,"tools/browser_stack.js"));
for(const k of ["HTTPS_PROXY","HTTP_PROXY","https_proxy","http_proxy","ALL_PROXY","all_proxy"]) delete process.env[k];
process.env.NO_PROXY="*";process.env.no_proxy="*";
const API_REPO=[process.env.SPINE_API_REPO, path.join(APP,"..","property-spine-api"),
  path.join(APP,"..","..","property-spine-api")].filter(Boolean)
  .find(c=>fs.existsSync(path.join(c,"node_modules","playwright")));
if(!API_REPO){ console.error("REFUSED: playwright not resolvable"); process.exit(2); }
const { chromium }=require(path.join(API_REPO,"node_modules","playwright"));
const { Pool }=require(path.join(API_REPO,"node_modules","pg"));
const { randomUUID }=require("node:crypto");
const engine=require(path.join(API_REPO,"src/shared/obligation_engine.js"));
const { recordEffectivePossession }=require(path.join(API_REPO,"src/tenancy/space_position.js"));
const { makeUnitTriageService }=require(path.join(API_REPO,"src/maintenance/unit_triage_service.js"));
const { makeTurnoverService }=require(path.join(API_REPO,"src/maintenance/turnover_service.js"));
const staffSessions=require(path.join(API_REPO,"src/identity/staff_session_service.js"));
const PINNED="property-spine-api.onrender.com", OUT="/tmp/spine-rung/work", SMS="/tmp/spine-rung/sms.log";
const API=process.env.E2E_API_BASE||"http://127.0.0.1:3055";
let pass=0,fail=0;
const ok=(l,c,d)=>{ if(c){pass++;console.log("  ok    "+l);} else {fail++;console.log("  FAIL  "+l+(d?"\n        "+d:""));} };
const DAY=86400000, ymd=(t)=>new Date(t).toISOString().slice(0,10), D=(n)=>ymd(Date.now()+n*DAY);

(async()=>{
  let up=false; try{ up=(await fetch(API+"/health")).ok; }catch(_){}
  const manifest=process.env.E2E_PROOF_MANIFEST;
  if(!up || !manifest || !fs.existsSync(manifest) || !fs.existsSync(SMS)){
    console.log("SKIPPED — no owned runtime (server, proof manifest and fake SMS log required)");
    process.exit(Number(process.env.SPINE_REQUIRE_RUNTIME)?2:0);
  }
  const pool=new Pool({ connectionString: JSON.parse(fs.readFileSync(manifest,"utf8")).url, ssl:false });
  const one=async(sql,args=[])=>(await pool.query(sql,args)).rows[0];
  const tag="turn-target-"+randomUUID().slice(0,8);
  const unitTriageService=makeUnitTriageService({ spawnObligationFromEvent: engine.spawnObligationFromEvent });
  const turnoverService=makeTurnoverService({ spawnObligationFromEvent: engine.spawnObligationFromEvent, recordEffectivePossession, unitTriageService });
  const tx=async(fn)=>{ const c=await pool.connect(); try{ await c.query("begin"); const r=await fn(c); await c.query("commit"); return r; } catch(e){ await c.query("rollback"); throw e; } finally{ c.release(); } };

  // ── fixture: one property, a manager and a leasing-only agent, four units ──
  //  Unique per run: users.phone is unique across the database, and a run
  //  that stopped after inserting its users must not block the next one.
  const suffix=String(1000+Math.floor(Math.random()*8000));
  const MGR_PHONE="215556"+suffix, AGENT_PHONE="215557"+suffix;
  const org=await one("insert into organizations(name,slug) values($1,$1) returning id",[tag]);
  const pm=await one(`insert into users(name,email,phone,role,is_active,status,account_kind,organization_id,phone_verified_at)
    values('Turn Target Manager',$1,$2,'property_manager',true,'active','internal_qa',$3,now()) returning id`,[tag+"-pm@example.invalid","+1"+MGR_PHONE,org.id]);
  const agent=await one(`insert into users(name,email,phone,role,is_active,status,account_kind,organization_id,phone_verified_at)
    values('Turn Target Agent',$1,$2,'property_manager',true,'active','internal_qa',$3,now()) returning id`,[tag+"-agent@example.invalid","+1"+AGENT_PHONE,org.id]);
  const person=(await one("insert into persons(name,lifecycle_status) values('Turn Target Resident','tenant') returning id")).id;
  const deal=await one(`insert into deal_intakes(onboarding_type,status,deal_name,organization_id) values('existing_asset','classified',$1,$2) returning id`,[tag,org.id]);
  const P=(await one(`insert into properties(name,canonical_key,organization_id,leasing_basis) values($1,$1,$2,'unit') returning id`,[tag,org.id])).id;
  //  SMS sign-in needs a property-facing line. properties.sms_number is a
  //  read-only projection of communication_lines (guard trigger), so the
  //  line is written where the truth lives and projects onto the property.
  await pool.query(`insert into communication_lines(e164,line_type,property_id,authority_ceiling,permitted_audience,inbound_enabled,outbound_enabled,status,outbound_policy)
    values($2,'property_facing',$1,'external','residents_and_prospects',true,true,'active','proactive')`,[P,"+1215558"+suffix]);
  await pool.query("insert into deal_intake_properties(intake_id,property_id,status) values($1,$2,'current')",[deal.id,P]);
  await pool.query(`insert into property_team_assignments(property_id,user_id,role_title,scope_type,allowed_modules,primary_for_modules,active)
    values($1,$2,'Property Manager','property','{management,maintenance,leasing}','{management}',true)`,[P,pm.id]);
  await pool.query(`insert into property_team_assignments(property_id,user_id,role_title,scope_type,allowed_modules,primary_for_modules,active)
    values($1,$2,'Leasing Agent','property','{leasing}','{leasing}',true)`,[P,agent.id]);
  const unit=async(n)=>{ const u=(await one("insert into units(property_id,unit_number) values($1,$2) returning id",[P,n])).id;
    const s=(await one("update spaces set use_type='residential', position_kind='unit' where unit_id=$1 returning id",[u])).id; return { unit_id:u, space_id:s, n }; };
  const units=[await unit("401"),await unit("402"),await unit("403")];
  const asOf=D(-60);
  const batch=await one(`insert into import_batches(property_id,source_type,source_file,source_as_of_date,leasing_model,confidence,status)
    values($1,'rent_roll_ledger','target.csv',$2,'unit','confirmed','committed') returning id`,[P,asOf]);
  const act=await one(`insert into activations(deal_id,property_id,status,source_as_of_date,import_batch_id,opened_by_user_id)
    values($1,$2,'activated',$3,$4,$5) returning id`,[deal.id,P,asOf,batch.id,pm.id]);
  let ix=0;
  for(const u of units){
    ix+=1;
    const ev=await one(`insert into import_source_rows(import_batch_id,row_index,raw,parse_note,produced_unit_id,produced_space_id)
      values($1,$2,$3,'turn target evidence',$4,$5) returning id`,[batch.id,ix,JSON.stringify({unit_number:u.n,tenant_name:"Resident "+u.n,is_vacant:false}),u.unit_id,u.space_id]);
    await pool.query(`insert into proposed_records(activation_id,property_id,module,target_type,natural_key,normalized_json,status,import_source_row_id,confirmed_by,confirmed_at)
      values($1,$2,'leasing','lease',$3,$4,'promoted',$5,$6,now())`,[act.id,P,u.n,JSON.stringify({section:"current",unit_number:u.n,tenant_name:"Resident "+u.n,is_vacant:false}),ev.id,String(pm.id)]);
  }
  await pool.query(`insert into opening_tenancy_positions(property_id,deal_intake_id,activation_id,import_batch_id,as_of_date,
    positions_established,positions_unresolved,source_rows_read,established_by_user_id,authority_basis,status)
    values($1,$2,$3,$4,$5,$6,0,$6,$7,'platform_role:super_admin','established')`,[P,deal.id,act.id,batch.id,asOf,units.length,pm.id]);
  const lease=async(u)=>(await one(`insert into leases(property_id,space_id,tenant_ids,rent,start_date,end_date,lease_status,source_type,confidence)
    values($1,$2,$3,1200,$4,$5,'active','historical_snapshot','confirmed') returning id`,[P,u.space_id,[person],D(-400),D(-1)])).id;
  const L401=await lease(units[0]), L402=await lease(units[1]); await lease(units[2]);
  const door=(u,leaseId,expected)=>tx((c)=>turnoverService.openTurnover(c,{ property_id:P, unit_id:u.unit_id, outgoing_lease_id:leaseId, needs:["clean"], expected_ready_date:expected, actor_user_id:pm.id }));
  const walk=(u,spec)=>tx((c)=>unitTriageService.confirmTriage(c,{ property_id:P, unit_id:u.unit_id, actor_user_id:pm.id, vacancy_observation:"vacant", ...spec }));
  await door(units[0],L401,D(14));
  await walk(units[0],{ original_text:"401 empty, HVAC dead, full replacement", initial_condition:"severe", findings:[{ finding_text:"HVAC dead", long_lead_kind:"hvac_failure" }] });
  await door(units[1],L402,D(14));
  await walk(units[1],{ original_text:"402 normal turn", initial_condition:"normal_turn", findings:[{ finding_text:"door dinged" }], required_work:[{ work_text:"patch door" }] });
  // 403: lease ended, no turn opened at all.
  console.log("fixture: property "+P+" · 401 slipped (exceeded) · 402 holds · 403 no turn");

  const st=await serveStatic(APP,8822), tls=await serveTls(3055,9472);
  const b=await chromium.launch({args:[`--host-resolver-rules=MAP ${PINNED} 127.0.0.1:9472`,"--ignore-certificate-errors","--no-proxy-server"],ignoreHTTPSErrors:true});
  const signIn=async(phone)=>{
    const ctx=await b.newContext({viewport:{width:1400,height:1500},ignoreHTTPSErrors:true});
    const p=await ctx.newPage();
    await p.goto("http://127.0.0.1:8822/",{waitUntil:"load"}); await p.waitForTimeout(1200);
    await p.fill("#egPhone",phone); await p.click("#egSendOtpBtn"); await p.waitForTimeout(2500);
    const l=fs.readFileSync(SMS,"utf8").trim().split("\n");
    const last=JSON.parse(l[l.length-1]);
    if(last.to!=="+1"+phone) throw new Error("OTP did not go to "+phone+": "+last.to);
    const code=/access code is (\d{6})/.exec(last.body)[1];
    await p.fill("#egCode",code); await p.click("#egVerifyOtpBtn"); await p.waitForTimeout(4000);
    const scope=await p.evaluate(()=>window.__psLive && window.__psLive.hasSession() ? window.__psLive.sessionMeta() : null);
    if(!scope || String(scope.property_id)!==String(P)) throw new Error("session did not land on the fixture property: "+JSON.stringify(scope));
    //  The verified session lands on the property picker (the app's intended
    //  landing). Choose the fixture property the way a person does; the layer
    //  must actually go away, or everything under it is covered.
    await p.waitForFunction(()=>document.getElementById("livePropertyLayer").classList.contains("show"),null,{timeout:15000});
    await p.click(`[data-live-property-id="${P}"]`);
    await p.waitForFunction(()=>!document.getElementById("livePropertyLayer").classList.contains("show"),null,{timeout:20000});
    await p.waitForTimeout(1500);
    return p;
  };
  const openAvailability=async(p)=>{
    await p.evaluate(()=>openDesk('leasing'));
    await p.waitForTimeout(800);
    await p.evaluate(()=>psLiveAvailability());
    await p.waitForSelector('#psAvBody[data-ps-state="data"]',{timeout:20000});
  };
  const readRow=(p,n)=>p.evaluate((n)=>{
    const rows=[...document.querySelectorAll('#psAvBody .av-row:not(.rrc-hdr)')];
    const row=rows.find(r=>new RegExp('^Unit '+n+'\\b').test(r.innerText.trim()));
    if(!row) return null;
    const tools=row.nextElementSibling && row.nextElementSibling.classList.contains('av-turn-target') ? row.nextElementSibling : null;
    const btn=tools && tools.querySelector('.av-turn-target-open');
    let visible=false;
    if(btn){ const r=btn.getBoundingClientRect(); btn.scrollIntoView({block:'center'}); const r2=btn.getBoundingClientRect();
      const el=document.elementFromPoint(r2.left+r2.width/2, r2.top+r2.height/2); visible=!!(el && (el===btn || btn.contains(el))); }
    return { text: row.innerText.replace(/\s+/g,' ').trim(), control: btn ? btn.innerText.trim() : null,
      plan: tools ? tools.getAttribute('data-plan-state') : null, unit: tools ? tools.getAttribute('data-unit-id') : null, visible };
  },n);
  const apiRow=async(n)=>{
    //  An independent read: a fresh server-minted session, not the browser's.
    const s=(await staffSessions.issueStaffSession(pool,{ userId:pm.id, propertyId:P, purpose:"bootstrap_invite" })).session_token;
    const body=await (await fetch(API+"/operator/leasing/availability-canonical",{headers:{"x-staff-session":s}})).json();
    return (body.rows||[]).find(r=>String(r.unit_number)===n);
  };
  try{
    console.log("\n== management signs in and opens Availability ==");
    const p=await signIn(MGR_PHONE);
    await openAvailability(p);
    const fmt=await p.evaluate((d)=>psRrDate(d),D(14));
    let r401=await readRow(p,"401"), r402=await readRow(p,"402"), r403=await readRow(p,"403");
    console.log("        rows:",JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('#psAvBody .av-row:not(.rrc-hdr)')].map(r=>r.innerText.replace(/\s+/g,' ').trim().slice(0,90)))));
    console.log("        401:",JSON.stringify(r401)); console.log("        402:",JSON.stringify(r402)); console.log("        403:",JSON.stringify(r403));
    ok("401 carries its stated date "+fmt, r401 && r401.text.indexOf(fmt)>=0, r401 && r401.text);
    ok("401 says `incomplete · turn scope exceeds plan` — the server's word, never `expected`",
      r401 && /incomplete · turn scope exceeds plan/.test(r401.text) && !/expected/.test(r401.text), r401 && r401.text);
    ok("401 offers `Re-state ready date`, bound to its unit, carrying plan_state exceeded",
      r401 && r401.control==="Re-state ready date" && r401.plan==="exceeded" && r401.unit===String(units[0].unit_id), JSON.stringify(r401));
    ok("and the control is VISIBLE (elementFromPoint returns it), not merely rendered", r401 && r401.visible);
    ok("402 (plan holds) reads `expected · turnover in progress` and offers `Change ready date`",
      r402 && /expected · turnover in progress/.test(r402.text) && r402.control==="Change ready date" && r402.plan==="holds", JSON.stringify(r402));
    //  403's lease expired with no turn opened, so the server classifies it
    //  `occupied` (uncorroborated opening claim) and Availability lists no
    //  occupied rows. The no-turn control case is asserted in the harness
    //  (availability_cutover_app.test.js); here the negative is the page.
    const controls=await p.evaluate(()=>[...document.querySelectorAll('.av-turn-target')].map(e=>e.getAttribute('data-unit-id')));
    ok("exactly the two rows with an active turnover carry a control, no other", controls.length===2 && controls.indexOf(String(units[0].unit_id))>=0 && controls.indexOf(String(units[1].unit_id))>=0, JSON.stringify(controls));
    ok("403 (no turn, occupied by opening claim) is not on Availability at all — nothing to re-state", r403===null, JSON.stringify(r403));

    console.log("\n== she re-states the date with a reason, from the row ==");
    const uid=String(units[0].unit_id);
    await p.click('.av-turn-target[data-unit-id="'+uid+'"] .av-turn-target-open');
    const formVisible=await p.evaluate((uid)=>{ const f=document.querySelector('.av-turn-target[data-unit-id="'+uid+'"] .av-turn-target-form');
      if(!f || f.classList.contains('hidden')) return false; const i=f.querySelector('[name=reason]'); const r=i.getBoundingClientRect();
      const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return !!(el && (el===i || i.contains(el))); },uid);
    ok("the form opens and its reason field is visible", formVisible);
    const prefilled=await p.inputValue('.av-turn-target[data-unit-id="'+uid+'"] [name=expected_ready_date]');
    ok("the date field starts at the currently stated date, not blank or today", prefilled===D(14), prefilled);
    await p.fill('.av-turn-target[data-unit-id="'+uid+'"] [name=expected_ready_date]', D(30));
    await p.fill('.av-turn-target[data-unit-id="'+uid+'"] [name=reason]', "HVAC vendor confirmed install "+D(28));
    const writes=[]; p.on("request",q=>{ if(q.method()==="POST" && /turn-target/.test(q.url())) writes.push(q.url()); });
    await p.click('.av-turn-target[data-unit-id="'+uid+'"] [type=submit]');
    await p.waitForSelector('#psAvBody[data-ps-state="loading"]',{timeout:8000}).catch(()=>{});
    await p.waitForSelector('#psAvBody[data-ps-state="data"]',{timeout:20000});
    ok("exactly one POST went to /operator/units/"+uid+"/turn-target", writes.length===1 && writes[0].indexOf("/operator/units/"+uid+"/turn-target")>=0, JSON.stringify(writes));
    const fmt30=await p.evaluate((d)=>psRrDate(d),D(30));
    r401=await readRow(p,"401"); console.log("        401 after:",JSON.stringify(r401));
    ok("the re-read shows the NEW date "+fmt30, r401 && r401.text.indexOf(fmt30)>=0 && r401.text.indexOf(fmt)<0, r401 && r401.text);
    ok("and `expected · turnover in progress` — the finding is priced in", r401 && /expected · turnover in progress/.test(r401.text), r401 && r401.text);
    ok("and the control now says `Change ready date` with plan_state holds", r401 && r401.control==="Change ready date" && r401.plan==="holds", JSON.stringify(r401));
    const a=await apiRow("401");
    ok("the API agrees: available_from "+D(30)+", expected, plan holds",
      a && a.available_from===D(30) && a.availability_confidence==="expected" && a.turnover && a.turnover.plan_state==="holds", JSON.stringify(a && { from:a.available_from, conf:a.availability_confidence, plan:a.turnover&&a.turnover.plan_state }));
    const ev=await one("select type, note from events where property_id=$1 and unit_id=$2 and type='turn_ready_date_restated' order by occurred_at desc limit 1",[P,units[0].unit_id]).catch(()=>null);
    ok("the re-statement is a recorded turnover event with the reason", !!ev && /HVAC vendor/.test(String(ev.note||"")), JSON.stringify(ev));
    await p.screenshot({path:OUT+"/turn_target_from_availability.png",fullPage:true});

    console.log("\n== the server's refusal reaches the row: an empty reason ==");
    await p.click('.av-turn-target[data-unit-id="'+uid+'"] .av-turn-target-open');
    const msg=await p.evaluate(async(uid)=>{ const f=document.querySelector('.av-turn-target[data-unit-id="'+uid+'"] .av-turn-target-form');
      f.querySelector('[name=reason]').value=""; await psAvSubmitTurnTarget(null, uid); return f.querySelector('.av-turn-target-error').textContent; },uid);
    ok("no reason → refused in the form before any write, and it says so", /reason/i.test(msg), msg);
    await p.context().close();

    console.log("\n== a leasing-only session sees the slip but gets no control ==");
    const q=await signIn(AGENT_PHONE);
    await openAvailability(q);
    const s401=await readRow(q,"401"); console.log("        401 (agent):",JSON.stringify(s401));
    ok("the agent sees the same governed row", s401 && /expected · turnover in progress/.test(s401.text));
    ok("and no re-state control (no management module on this session)", s401 && s401.control===null && s401.plan===null, JSON.stringify(s401));
    const cnt=await q.evaluate(()=>document.querySelectorAll('.av-turn-target').length);
    ok("no turn-target control anywhere on the page for the agent", cnt===0, String(cnt));
    await q.context().close();
  }catch(e){ fail++; console.log("  FAIL  harness: "+(e.stack||e.message)); }
  finally{
    await b.close(); st.close(); tls.close();
    await pool.end();
    console.log("\n== "+pass+" passed, "+fail+" failed ==");
    process.exit(fail?1:0);
  }
})();
