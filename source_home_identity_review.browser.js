#!/usr/bin/env node
"use strict";

/* Shipped-index browser proof over the fenced API and nonce PostgreSQL.
 * SQL creates people/sessions and inventory shapes only. Upload, preview,
 * decision apply, confirmation and repeat evidence all use the Deal Setup UI. */
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(path.join(process.env.SP, "node_modules/playwright"));
const { Pool } = require(path.join(process.env.API_ROOT, "node_modules/pg"));
const { serveStatic } = require("./tools/browser_stack.js");

const API=(process.env.API||"http://127.0.0.1:3352").replace(/\/$/,"");
const DB=process.env.E2E_DATABASE_URL;
const OUT=process.env.SHOTS||path.join(os.tmpdir(),"source-home-review-browser");
const APP_PORT=8200+(process.pid%300);
if(!DB) throw new Error("E2E_DATABASE_URL is required");
const pool=new Pool({connectionString:DB,ssl:false});
const tag=`SHIR_BROWSER_${process.pid}_${crypto.randomBytes(3).toString("hex")}`;
let passed=0,failed=0;
function ok(label,value,detail=""){if(value){passed++;console.log(`  ok    ${label}`);}else{failed++;console.log(`  FAIL  ${label}${detail?`\n        ${detail}`:""}`);}}
async function api(method,url,token,body){const r=await fetch(API+url,{method,headers:{"x-staff-session":token,...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});let json=null;try{json=await r.json();}catch{}return{status:r.status,body:json};}
async function makeProperty(deal,token,name){const r=await api("POST",`/deal-setup/deals/${deal}/properties/new`,token,{name,leasing_basis:"bed"});if(r.status!==201)throw new Error(JSON.stringify(r));return r.body.property.id;}
async function countShape(property){return(await pool.query(`select (select count(*)::int from units where property_id=$1) units,
  (select count(*)::int from spaces s join units u on u.id=s.unit_id where u.property_id=$1) spaces,
  (select count(*)::int from import_batches where property_id=$1) batches`,[property])).rows[0];}
const csv=(rows)=>["Unit,Room,Resident,Status,Market Rent,Actual Rent",...rows.map(x=>`${x[0]},${x[1]},VACANT,VACANT,900,`)].join("\n");

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const org=(await pool.query("insert into organizations(name,slug) values($1,$2) returning id",[tag,tag.toLowerCase()])).rows[0].id;
  const person=(await pool.query("insert into persons(name) values($1) returning id",[tag])).rows[0].id;
  const user=(await pool.query(`insert into users(name,email,platform_role,organization_id,is_active,status,person_id)
    values($1,$2,'org_admin',$3,true,'active',$4) returning id`,[tag,`${tag}@example.test`,org,person])).rows[0].id;
  const seat=(await pool.query("insert into properties(name,canonical_key,organization_id) values($1,$2,$3) returning id",[`${tag} seat`,`${tag}-seat`,org])).rows[0].id;
  await pool.query("insert into property_team_assignments(property_id,user_id,role_title,allowed_modules,active) values($1,$2,'review',array['leasing','management'],true)",[seat,user]);
  async function session(userId){const token=crypto.randomBytes(32).toString("base64url");await pool.query(`insert into staff_sessions(user_id,property_id,token,token_digest,issuance_purpose,expires_at)
    values($1,$2,null,$3,'bootstrap_invite',now()+interval '3 hours')`,[userId,seat,crypto.createHash("sha256").update(token).digest("hex")]);return token;}
  const token=await session(user);
  const person2=(await pool.query("insert into persons(name) values($1) returning id",[`${tag} other`])).rows[0].id;
  const user2=(await pool.query(`insert into users(name,email,platform_role,organization_id,is_active,status,person_id)
    values($1,$2,'org_admin',$3,true,'active',$4) returning id`,[`${tag} other`,`${tag}.other@example.test`,org,person2])).rows[0].id;
  const token2=await session(user2);
  const deal=(await api("POST","/deal-setup/deals",token,{deal_name:tag})).body.deal.id;

  const existing=await makeProperty(deal,token,`${tag} exact`);
  const existingUnit=(await pool.query("insert into units(property_id,unit_number) values($1,'HOME-01') returning id",[existing])).rows[0].id;
  await pool.query("update spaces set space_label='A',position_kind='bed',use_type='residential' where unit_id=$1",[existingUnit]);
  const fresh=await makeProperty(deal,token,`${tag} fresh`);
  const drift=await makeProperty(deal,token,`${tag} drift`);
  const driftUnit=(await pool.query("insert into units(property_id,unit_number) values($1,'DRIFT') returning id",[drift])).rows[0].id;
  await pool.query("update spaces set space_label='A',position_kind='bed',use_type='residential' where unit_id=$1",[driftUnit]);

  const files={
    exact:path.join(OUT,"exact.csv"), fresh:path.join(OUT,"fresh.csv"), drift:path.join(OUT,"drift.csv")};
  fs.writeFileSync(files.exact,csv([["HOME-01","A"]]));
  fs.writeFileSync(files.fresh,csv([["FRESH","A"],["FRESH","B"]]));
  fs.writeFileSync(files.drift,csv([["DRIFT","A"]]));

  const server=await serveStatic(__dirname,APP_PORT);
  const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.addInitScript(([base,t])=>{localStorage.setItem("ps_api_base",base);sessionStorage.setItem("__ps_staff_session__",JSON.stringify({t}));},[API,token]);
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const shot=name=>page.screenshot({path:path.join(OUT,name),fullPage:true});
  const text=()=>page.locator("body").innerText();
  async function deals(){await page.evaluate(()=>window.dsNav("deals"));await page.waitForTimeout(500);}
  async function openProperty(name){await deals();await page.locator(`#dealSetupPanel tr:has-text("${tag}")`).first().click();await page.waitForTimeout(350);await page.locator(`#dealSetupPanel tr:has-text("${name}")`).getByRole("button",{name:/Set up|Continue setup|Review/}).click();await page.waitForTimeout(500);}
  async function upload(file){await page.setInputFiles("#dsRentRollFile",file);await page.fill("#dsAsOf","2026-09-13");await page.selectOption("#dsReviewBasis","bed");await page.getByRole("button",{name:"Upload and review homes"}).click();await page.getByRole("heading",{name:"Review source homes before inventory changes"}).waitFor();}

  await page.goto(`http://127.0.0.1:${APP_PORT}/index.html`,{waitUntil:"domcontentloaded"});
  const verified=await api("GET","/operator/me",token);
  if(verified.status!==200)throw new Error(`session verification failed: ${JSON.stringify(verified)}`);
  await page.evaluate(grant=>window.egEnterAuthorized(grant),verified.body);
  await page.waitForTimeout(1200);
  await page.evaluate(()=>window.egHide());
  await page.evaluate(()=>window.dsShow());await page.waitForTimeout(600);
  await openProperty(`${tag} exact`);await upload(files.exact);await shot("01-explicit-exact-review.png");
  const reviewText=await text(), beforeExact=await countShape(existing);
  ok("B1 retained raw unit and room are visible before apply",reviewText.includes("HOME-01")&&reviewText.includes("A")&&reviewText.includes("1 of 1"),reviewText.slice(-1200));
  ok("B2 same-name candidate is described as a suggestion requiring Apply",/Exact-name candidate selected; Apply is the approval/.test(reviewText)&&beforeExact.batches===0);
  await page.getByRole("button",{name:"Apply reviewed mapping"}).click();await page.getByRole("heading",{name:"What Spine read"}).waitFor();
  const retained=(await pool.query(`select isr.raw,d.selected_unit_id,d.selected_space_id from import_source_rows isr join proposed_records l on l.import_source_row_id=isr.id
    join proposed_records d on d.id=l.inventory_identity_decision_id where l.property_id=$1 and l.target_type='lease'`,[existing])).rows[0];
  ok("B3 Apply retains raw cells and attaches exact approved IDs",retained.raw._source_cells.Unit==="HOME-01"&&retained.raw._source_cells.Room==="A"&&retained.selected_unit_id===existingUnit);

  await openProperty(`${tag} fresh`);await upload(files.fresh);await shot("02-grouped-new-review.png");
  ok("B4 two unfamiliar rooms are visibly reviewed before one parent is created",(await text()).includes("FRESH")&&(await text()).includes("2 of 2")&&(await countShape(fresh)).units===0);
  await page.getByRole("button",{name:"Apply reviewed mapping"}).click();await page.getByRole("heading",{name:"What Spine read"}).waitFor();
  const freshShape=await countShape(fresh);ok("B5 approved rooms materialize under one new parent",freshShape.units===1&&freshShape.spaces===2,JSON.stringify(freshShape));
  await page.getByRole("button",{name:/Add all/}).click();await page.waitForTimeout(500);await page.getByRole("button",{name:/Establish lease/}).click();await page.waitForTimeout(500);
  await openProperty(`${tag} fresh`);await upload(files.fresh);await shot("03-repeat-review.png");
  ok("B6 repeat evidence visibly offers the earlier reviewed mapping",/earlier reviewed mapping/i.test(await text()));
  const repeatBefore=await countShape(fresh);await page.getByRole("button",{name:"Apply reviewed mapping"}).click();await page.getByRole("heading",{name:"What Spine read"}).waitFor();
  const repeatAfter=await countShape(fresh);ok("B7 repeat keeps inventory and records fresh evidence",repeatAfter.units===repeatBefore.units&&repeatAfter.spaces===repeatBefore.spaces&&repeatAfter.batches===repeatBefore.batches+1);

  await openProperty(`${tag} drift`);await upload(files.drift);await pool.query("update spaces set space_label='A-CHANGED' where unit_id=$1",[driftUnit]);
  await page.getByRole("button",{name:"Apply reviewed mapping"}).click();await page.waitForTimeout(500);await shot("04-target-drift-refusal.png");
  ok("B8 selected-target drift remains on review and writes no evidence batch",/review source homes before inventory changes/i.test(await text())&&(await countShape(drift)).batches===0);

  // Late preview after an actor switch must not paint into the former actor's
  // setup. A second run switches property while the same response is held.
  async function lateResponse(switcher,label){
    await page.reload({waitUntil:"domcontentloaded"});await page.waitForTimeout(1200);await page.evaluate(()=>{window.egHide();window.dsShow();});await page.waitForTimeout(500);await openProperty(`${tag} drift`);
    let release,seen;const held=new Promise(r=>release=r),arrived=new Promise(r=>seen=r);
    await page.route(`${API}/deal-setup/activations/*/preview-source`,async route=>{seen();await held;await route.continue();},{times:1});
    await page.setInputFiles("#dsRentRollFile",files.drift);await page.fill("#dsAsOf","2026-09-13");await page.selectOption("#dsReviewBasis","bed");
    const click=page.getByRole("button",{name:"Upload and review homes"}).click();await arrived;await switcher();release();await click;await page.waitForTimeout(500);
    const state=await page.evaluate(()=>({review:Boolean(document.querySelector('[data-source-home]')),body:document.body.innerText}));
    ok(label,!state.review&&!/Review source homes before inventory changes/.test(state.body));
    await page.unrouteAll({behavior:"wait"});
  }
  await lateResponse(async()=>page.evaluate(t=>sessionStorage.setItem("__ps_staff_session__",JSON.stringify({t})),token2),"B9 late preview cannot paint after actor switch");
  await page.evaluate(t=>sessionStorage.setItem("__ps_staff_session__",JSON.stringify({t})),token);await page.reload({waitUntil:"domcontentloaded"});
  await lateResponse(async()=>page.evaluate(()=>window.dsNav("deals")),"B10 late preview cannot paint after property navigation");

  ok("B11 browser emitted no page errors",errors.length===0,errors.join("\n"));
  console.log(`\n  ${passed} passed, ${failed} failed\n  screenshots: ${OUT}`);
  await browser.close();await new Promise(r=>server.close(r));await pool.end();process.exitCode=failed?1:0;
})().catch(async e=>{console.error(e.stack||e);try{await pool.end();}catch{}process.exit(1);});
