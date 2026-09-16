"use strict";
const fs=require("fs"),http=require("http"),path=require("path");
const {chromium}=require(path.join(process.env.APP_PROOF_MODULES||"/home/user/property-spine-api/node_modules","playwright"));
const browserExecutable=process.env.CHROMIUM||process.env.CHROME||null;
const port=Number(process.env.LIVE_DEAL_PICKER_PORT||3358);
const evidence=process.env.LIVE_DEAL_PICKER_EVIDENCE_DIR||path.join(__dirname,"docs","screenshots_live_deal_picker");
const SKY="p-sky",SOLO="p-solo",NAMES={[SKY]:"Skyline Apartments",[SOLO]:"Solo on Chestnut"},ADDR={[SKY]:"1417 n 15 phily",[SOLO]:"4125 Chestnut St"};
const DISPLAY_ADDR={[SKY]:"1417 N 15th St, Philadelphia",[SOLO]:"4125 Chestnut St"};
let pass=0,fail=0;
function ok(v,label,detail){if(v){pass++;console.log("  ok   "+label);}else{fail++;console.log("  FAIL "+label+(detail?"\n       "+detail:""));}}
function json(route,status,body){return route.fulfill({status,contentType:"application/json",body:JSON.stringify(body)});}
function server(root){return http.createServer((req,res)=>{const rel=decodeURIComponent(String(req.url||"/").split("?")[0]).replace(/^\/+/,"")||"index.html";const file=path.resolve(root,rel);if(!file.startsWith(path.resolve(root))||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}res.writeHead(200,{"content-type":file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":"text/html","cache-control":"no-store"});fs.createReadStream(file).pipe(res);});}
function state(){return {active:SKY,rows:[SKY,SOLO],selectCalls:[],verifyCalls:0,failNext:false,expireNext:false,listError:false,delaySelect:false,delayedGrantRace:false,selectRelease:null,deferNextList:false,listRelease:null,listSnapshot:null};}
async function wire(page,s){
  await page.addInitScript((active)=>sessionStorage.setItem("__ps_staff_session__",JSON.stringify({t:"proof-token",m:{user_id:"u1",property_id:active}})),s.active);
  await page.route("https://property-spine-api.onrender.com/**",async route=>{
    const req=route.request(),u=new URL(req.url()),p=u.pathname;
    if(p==="/operator/me"){
      s.verifyCalls++; if(s.expireNext){s.expireNext=false;s.active=null;return json(route,401,{error:"expired"});}
      return json(route,200,{id:"u1",name:"Kameron",role:"asset_manager",property_id:s.active,property_name:NAMES[s.active],allowed_modules:["management","leasing"]});
    }
    if(p==="/operator/properties"){
      if(s.listError)return json(route,503,{error:"temporarily_unavailable"});
      const snap={active_property_id:s.active,properties:s.rows.map(id=>({property_id:id,property_name:NAMES[id],address:ADDR[id],allowed_modules:["management","leasing"]}))};
      if(s.deferNextList){s.deferNextList=false;s.listSnapshot=snap;await new Promise(r=>{s.listRelease=r;});return json(route,200,s.listSnapshot);}
      return json(route,200,snap);
    }
    if(p==="/operator/properties/select"){
      const body=JSON.parse(req.postData()||"{}"),id=body.property_id;s.selectCalls.push(id);
      if(s.delaySelect){if(s.delayedGrantRace)s.active=id;await new Promise(r=>{s.selectRelease=r;});}
      if(s.failNext){s.failNext=false;s.rows=s.rows.filter(v=>v!==id);return json(route,403,{error:"no_access_to_property"});}
      s.active=id;return json(route,200,{session_token:"proof-token-"+id,user:{id:"u1",name:"Kameron"},property:{id,name:NAMES[id]},allowed_modules:["management","leasing"]});
    }
    if(p==="/auth/sms/start")return json(route,200,{receipt:"Code sent.",token:"otp-proof"});
    if(p==="/auth/sms/verify"){
      const body=JSON.parse(req.postData()||"{}");
      if(body.token!=="otp-proof"||body.code!=="123456")return json(route,401,{error:"bad code"});
      s.active=SKY;return json(route,200,{session_token:"fresh-login-token",user:{id:"u1",name:"Kameron"},property:{id:SKY,name:NAMES[SKY]},allowed_modules:["management","leasing"]});
    }
    if(p==="/operator/session/revoke"){if(!s.delayedGrantRace)s.active=null;return json(route,s.delayedGrantRace?401:200,{ok:!s.delayedGrantRace});}
    if(/operator-home$/.test(p))return json(route,200,{property_id:s.active,desks:{}});
    if(/accountability$/.test(p))return json(route,200,{});
    if(/\/team$/.test(p))return json(route,200,[]);
    if(/room-owners$/.test(p))return json(route,200,{});
    return json(route,200,{});
  });
}
async function boot(browser,s,hash){const page=await browser.newPage({viewport:{width:1080,height:820}});const errors=[];page.on("pageerror",e=>errors.push(String(e&&e.message||e)));await wire(page,s);await page.goto(`http://127.0.0.1:${port}/index.html${hash||""}`,{waitUntil:"domcontentloaded"});return {page,errors};}

(async()=>{
  fs.mkdirSync(evidence,{recursive:true});
  const srv=server(__dirname);await new Promise(r=>srv.listen(port,"127.0.0.1",r));const browser=await chromium.launch({headless:true,...(browserExecutable?{executablePath:browserExecutable}:{})});
  try{
    const s=state(),b=await boot(browser,s,""),page=b.page;
    await page.waitForFunction(()=>document.getElementById("livePropertyLayer").classList.contains("show"));
    const initial=await page.evaluate(()=>({homeHidden:document.getElementById("home").classList.contains("hidden"),preview:document.getElementById("previewLayer").classList.contains("show"),rows:[...document.querySelectorAll("[data-live-property-id]")].map(b=>({id:b.dataset.livePropertyId,text:b.innerText,current:!!b.querySelector(".live-property-current")}))}));
    ok(initial.homeHidden,"initial sign-in stops at the property chooser before property content",JSON.stringify(initial));
    ok(initial.rows.length===2&&initial.rows[0].id===SKY&&initial.rows[1].id===SOLO,"authorized ids and server order are preserved",JSON.stringify(initial.rows));
    ok(initial.rows[0].text.includes(DISPLAY_ADDR[SKY])&&initial.rows[1].text.includes(DISPLAY_ADDR[SOLO])&&!initial.rows[0].text.includes(ADDR[SKY]),"authorized addresses use one presentation format without exposing retained entry shorthand",JSON.stringify(initial.rows));
    const addressExamples=await page.evaluate(()=>[
      psFormatPropertyAddress("1325 N 15th Street, Philadelphia"),
      psFormatPropertyAddress("1 Demo Way"),
      psFormatPropertyAddress("4233 Chestnut St")
    ]);
    ok(JSON.stringify(addressExamples)===JSON.stringify(["1325 N 15th St, Philadelphia","1 Demo Way","4233 Chestnut St"]),"the formatter standardizes known address styles without adding a missing city",JSON.stringify(addressExamples));
    ok(initial.rows.filter(r=>r.current).length===1&&initial.rows[0].current,"the server-active property is identified once");
    ok(!initial.preview&&!initial.rows.some(r=>/Greenery|Berks|Temple Nest/.test(r.text)),"preview LANDING_DEALS do not render in signed-in operation");

    await page.click(`[data-live-property-id="${SKY}"]`);await page.waitForFunction(()=>!document.getElementById("livePropertyLayer").classList.contains("show"));
    ok(s.selectCalls.length===0,"choosing the active property reverifies without minting a new session",JSON.stringify(s.selectCalls));
    ok(await page.isVisible("#home"),"choosing the active property enters its home");
    const homeNav=await page.evaluate(()=>({name:document.getElementById("appbarDeal").textContent.trim(),nameVisible:!document.getElementById("appbarDeal").classList.contains("hidden"),action:document.getElementById("appbarProperties").textContent.trim(),dashboard:[...document.querySelectorAll("#frontDashboard button")].map(b=>b.textContent.trim())}));
    ok(homeNav.name===NAMES[SKY]&&homeNav.nameVisible&&homeNav.action==="All properties"&&homeNav.dashboard.includes("Switch property"),"Home names the current property and exposes explicit switch controls",JSON.stringify(homeNav));
    await page.screenshot({path:path.join(evidence,"home-property-navigation.png"),fullPage:true});
    await page.click(".appbar-brand");await page.waitForFunction(()=>document.getElementById("livePropertyLayer").classList.contains("show"));
    ok(await page.isVisible("#livePropertyLayer"),"the current-property control returns Home to the authorized picker");

    s.delaySelect=true;await page.click(`[data-live-property-id="${SOLO}"]`);await page.waitForFunction(()=>document.getElementById("livePropertyList").getAttribute("aria-busy")==="true");
    const loading=await page.evaluate(()=>({disabled:[...document.querySelectorAll("[data-live-property-id]")].every(b=>b.disabled),target:document.getElementById("frontTitle").textContent}));
    ok(loading.disabled&&loading.target!==NAMES[SOLO],"loading disables choices and never paints the target optimistically",JSON.stringify(loading));
    s.delaySelect=false;s.selectRelease();await page.waitForFunction(()=>!document.getElementById("livePropertyLayer").classList.contains("show"));
    const moved=await page.evaluate(()=>({scope:_egAuthScope&&_egAuthScope.property_id,pick:document.getElementById("propPick").value}));
    ok(s.active===SOLO&&moved.scope===SOLO&&moved.pick===SOLO,"a switch enters only after server session and chrome agree",JSON.stringify(moved));
    ok(s.selectCalls.length===1&&s.selectCalls[0]===SOLO,"the non-current choice uses the existing sealed select action");

    s.deferNextList=true;const opening=page.evaluate(()=>psOpenProperties());while(!s.listRelease)await new Promise(r=>setTimeout(r,5));
    const switched=page.evaluate((id)=>switchProperty(id),SKY);await switched;s.listRelease();await opening;
    const late=await page.evaluate(()=>({scope:_egAuthScope&&_egAuthScope.property_id,pick:document.getElementById("propPick").value,rows:(__psAuthorizedProperties||[]).map(r=>r.property_id)}));
    ok(late.scope===SKY&&late.pick===SKY&&late.rows.includes(SKY),"a list response begun under the prior session cannot restore its active scope",JSON.stringify(late));

    s.failNext=true;await page.click(`[data-live-property-id="${SOLO}"]`);await page.waitForFunction(()=>document.getElementById("livePropertyFeedback").classList.contains("show"));
    const refused=await page.evaluate(()=>({shown:document.getElementById("livePropertyLayer").classList.contains("show"),scope:_egAuthScope&&_egAuthScope.property_id,rows:[...document.querySelectorAll("[data-live-property-id]")].map(b=>b.dataset.livePropertyId),message:document.getElementById("livePropertyFeedback").textContent}));
    ok(refused.shown&&s.active===SKY&&refused.scope===SKY,"a revoked choice leaves the verified current session in place",JSON.stringify(refused));
    ok(!refused.rows.includes(SOLO)&&!refused.message.includes(NAMES[SOLO]),"the revoked target is reread away and not presented as selected");

    s.expireNext=true;await page.click(`[data-live-property-id="${SKY}"]`);await page.waitForFunction(()=>document.querySelector("#entryGate.show #egExpired:not(.hidden)"));
    const expired=await page.evaluate(()=>({picker:document.getElementById("livePropertyLayer").classList.contains("show"),scope:_egAuthScope}));
    ok(!expired.picker&&expired.scope===null&&s.active===null,"session expiry mid-choice clears scope and returns to the expired door",JSON.stringify(expired));
    ok(b.errors.length===0,"all picker paths complete without page errors",b.errors.join(" | "));await page.close();

    const ds=state(),deepBoot=await boot(browser,ds,"#management"),deep=deepBoot.page;
    await deep.waitForFunction(()=>document.body.classList.contains("entered"));await deep.waitForTimeout(500);
    const d=await deep.evaluate(()=>({picker:document.getElementById("livePropertyLayer").classList.contains("show"),scope:_egAuthScope&&_egAuthScope.property_id,workspace:!document.getElementById("workspace").classList.contains("hidden")}));
    ok(!d.picker&&d.scope===SKY&&d.workspace,"an entitled desk deep link retains verified server scope and bypasses the chooser",JSON.stringify(d));
    await deep.click("#appbarSignOut");await deep.waitForFunction(()=>document.querySelector("#entryGate.show #egSignin:not(.hidden)"));
    ok(ds.active===null,"signing out from Management revokes the retained session");
    await deep.fill("#egPhone","2155550100");await deep.click("#egSendOtpBtn");await deep.waitForFunction(()=>!document.getElementById("egOtp").classList.contains("hidden"));
    await deep.fill("#egCode","123456");await deep.click("#egVerifyOtpBtn");await deep.waitForFunction(()=>document.getElementById("livePropertyLayer").classList.contains("show"));
    const fresh=await deep.evaluate(()=>({gate:document.getElementById("entryGate").classList.contains("show"),rows:[...document.querySelectorAll("[data-live-property-id]")].map(b=>b.dataset.livePropertyId),scope:_egAuthScope&&_egAuthScope.property_id,homeHidden:document.getElementById("home").classList.contains("hidden")}));
    ok(!fresh.gate&&fresh.homeHidden&&fresh.scope===SKY&&fresh.rows.length===2,"a fresh UI OTP login reaches the authorized chooser, not a property dashboard",JSON.stringify(fresh));
    await deep.screenshot({path:path.join(evidence,"deal-picker-desktop.png"),fullPage:true});
    await deep.setViewportSize({width:402,height:820});
    const narrow=await deep.evaluate(()=>({layer:document.getElementById("livePropertyLayer").getBoundingClientRect().width,body:document.documentElement.scrollWidth,viewport:innerWidth,choices:document.querySelectorAll("[data-live-property-id]").length}));
    ok(narrow.choices===2&&narrow.layer===narrow.viewport&&narrow.body===narrow.viewport,"the chooser remains complete without horizontal overflow at 402px",JSON.stringify(narrow));
    await deep.screenshot({path:path.join(evidence,"deal-picker-402px.png"),fullPage:true});
    await deep.setViewportSize({width:1080,height:820});await deep.click(`[data-live-property-id="${SKY}"]`);await deep.waitForFunction(()=>!document.getElementById("livePropertyLayer").classList.contains("show"));
    await deep.evaluate(()=>openDesk("management"));await deep.waitForFunction(()=>!document.getElementById("workspace").classList.contains("hidden"));
    const enteredManagement=await deep.evaluate(()=>({scope:_egAuthScope&&_egAuthScope.property_id,desk:activeDesk,workspace:!document.getElementById("workspace").classList.contains("hidden")}));
    ok(enteredManagement.scope===SKY&&enteredManagement.desk==="management"&&enteredManagement.workspace,"fresh login continues chooser → current property Home → Management",JSON.stringify(enteredManagement));
    await deep.screenshot({path:path.join(evidence,"fresh-login-management.png"),fullPage:true});
    await deep.evaluate(()=>openDesk("leasing"));await deep.waitForFunction(()=>activeDesk==="leasing");
    const leasingNav=await deep.evaluate(()=>({property:document.getElementById("appbarDeal").textContent.trim(),action:document.getElementById("appbarProperties").textContent.trim(),actionVisible:!!(document.getElementById("appbarProperties").offsetWidth||document.getElementById("appbarProperties").offsetHeight)}));
    ok(leasingNav.property===NAMES[SKY]&&leasingNav.action==="All properties"&&leasingNav.actionVisible,"Leasing keeps the current property and an obvious route to all properties",JSON.stringify(leasingNav));
    await deep.screenshot({path:path.join(evidence,"leasing-property-navigation.png"),fullPage:true});
    await deep.click("#appbarProperties");await deep.waitForFunction(()=>document.getElementById("livePropertyLayer").classList.contains("show"));
    ok(await deep.isVisible("#livePropertyLayer"),"the Leasing switch action returns to the same authorized picker");
    ok(deepBoot.errors.length===0,"retained deep link and fresh-login paths have no page errors",deepBoot.errors.join(" | "));await deep.close();

    const es=state();es.listError=true;const errorBoot=await boot(browser,es,""),errorPage=errorBoot.page;
    await errorPage.waitForFunction(()=>document.getElementById("livePropertyLayer").classList.contains("show"));
    const unavailable=await errorPage.evaluate(()=>({rows:[...document.querySelectorAll("[data-live-property-id]")].map(b=>b.dataset.livePropertyId),message:document.getElementById("livePropertyFeedback").textContent,shown:document.getElementById("livePropertyFeedback").classList.contains("show")}));
    ok(unavailable.shown&&unavailable.rows.length===1&&unavailable.rows[0]===SKY,"an authorized-list error degrades only to the property proven by the session",JSON.stringify(unavailable));
    ok(/could not be loaded/i.test(unavailable.message),"the reduced list is explained instead of looking complete",unavailable.message);
    ok(errorBoot.errors.length===0,"the list-error path has no page errors",errorBoot.errors.join(" | "));await errorPage.close();

    const rs=state();rs.delaySelect=true;rs.delayedGrantRace=true;const raceBoot=await boot(browser,rs,""),race=raceBoot.page;
    await race.waitForFunction(()=>document.getElementById("livePropertyLayer").classList.contains("show"));
    await race.click(`[data-live-property-id="${SOLO}"]`);while(!rs.selectRelease)await new Promise(r=>setTimeout(r,5));
    await race.click(".live-property-brand button");await race.waitForFunction(()=>document.querySelector("#entryGate.show #egSignin:not(.hidden)"));
    rs.selectRelease();await race.waitForTimeout(350);
    const signedOutRace=await race.evaluate(()=>({session:__psLive.hasSession(),scope:_egAuthScope,gate:document.getElementById("entryGate").classList.contains("show"),picker:document.getElementById("livePropertyLayer").classList.contains("show")}));
    ok(!signedOutRace.session&&signedOutRace.scope===null&&signedOutRace.gate&&!signedOutRace.picker,"a delayed select response cannot reinstall a session after chooser sign-out",JSON.stringify(signedOutRace));
    ok(raceBoot.errors.length===0,"the delayed-select sign-out path has no page errors",raceBoot.errors.join(" | "));await race.close();
  }finally{await browser.close();await new Promise(r=>srv.close(r));}
  console.log(`\n${pass} passed, ${fail} failed`);console.log("screenshots: "+evidence);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
