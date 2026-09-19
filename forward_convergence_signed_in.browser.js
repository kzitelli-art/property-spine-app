/* ══════════════════════════════════════════════════════════════════════════
   forward_convergence_signed_in.browser.js — §13 / §15 / §17 / §18 / §19 /
   §14b, SIGNED IN, AGAINST CANONICAL GREENERY.

   Agreement is not convergence. The browser's own forward classifier AGREED
   with the server at every date tested (94/11/1 · 85/20/10 · 0/105/95) — and
   was still a second implementation of one model. This proves the desk now
   ASKS rather than derives: it records which function produced each number,
   the effective as_of, and compares both against the server directly.
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
const PINNED="property-spine-api.onrender.com", OUT="/tmp/spine-rung/work";
const S=JSON.parse(fs.readFileSync(OUT+"/session.json","utf8")).session;
const H={"x-staff-session":S,accept:"application/json"};
let pass=0,fail=0;
const ok=(l,c,d)=>{ if(c){pass++;console.log("  ok    "+l);} else {fail++;console.log("  FAIL  "+l+(d?"\n        "+d:""));} };
(async()=>{
  //  Refuse to pretend: no owned runtime → skip by name, never a false green.
  let up=false; try{ up=(await fetch("http://127.0.0.1:3055/health")).ok; }catch(_){}
  if(!up || !fs.existsSync("/tmp/spine-rung/sms.log") || !fs.existsSync(OUT+"/session.json")){
    console.log("SKIPPED — no owned runtime with Greenery established");
    process.exit(Number(process.env.SPINE_REQUIRE_RUNTIME)?2:0);
  }
  const st=await serveStatic(APP,8820), tls=await serveTls(3055,9470);
  const b=await chromium.launch({args:[`--host-resolver-rules=MAP ${PINNED} 127.0.0.1:9470`,"--ignore-certificate-errors","--no-proxy-server"],ignoreHTTPSErrors:true});
  const ctx=await b.newContext({viewport:{width:1400,height:1500},ignoreHTTPSErrors:true});
  const p=await ctx.newPage();
  const net=[]; p.on("request",r=>net.push({m:r.method(),u:r.url()}));
  p.on("response",r=>{const h=net.find(n=>n.u===r.url()&&n.s===undefined); if(h)h.s=r.status();});
  try{
    await p.goto("http://127.0.0.1:8820/",{waitUntil:"load"}); await p.waitForTimeout(1500);
    await p.fill("#egPhone","2155550101"); await p.click("#egSendOtpBtn"); await p.waitForTimeout(3000);
    const l=fs.readFileSync("/tmp/spine-rung/sms.log","utf8").trim().split("\n");
    const code=/access code is (\d{6})/.exec(JSON.parse(l[l.length-1]).body)[1];
    await p.fill("#egCode",code); await p.click("#egVerifyOtpBtn"); await p.waitForTimeout(6000);

    console.log("\n== §14b · the planning cycle now comes from configuration ==");
    const cyc = await p.evaluate(()=>({
      scope: (typeof _egAuthScope!=='undefined'&&_egAuthScope) ? {basis:_egAuthScope.leasing_basis, cycle:_egAuthScope.leasing_cycle} : null,
      soloContext: _rrIsSoloContext(window.__offlinePid()),
      targets: _rrPlanningTargets().map(t=>({key:t.key,label:t.label,iso:t.iso,src:t.cycle_source||null}))
    }));
    console.log("        scope:", JSON.stringify(cyc.scope));
    console.log("        targets:", cyc.targets.map(t=>t.label+(t.src?"["+t.src+"]":"")).join(" · "));
    ok("_rrIsSoloContext is false under a session — the name regex is unreachable", cyc.soloContext===false);
    ok("the configured student cycle produced a September 1 target",
      cyc.targets.some(t=>t.key==='cycle' && /September/.test(t.label) && t.src==='property_configuration'),
      JSON.stringify(cyc.targets));
    ok("and it carries the leasing basis from the server", cyc.scope && cyc.scope.basis==='bed');

    console.log("\n== §13/§15/§17 · Management consumes the SERVER's classification ==");
    await p.evaluate(()=>openDesk('management')); await p.waitForTimeout(6000);
    const desk = await p.evaluate(()=>({
      basis: window.__psForwardBasis||null,
      cells: [...document.querySelectorAll(".le-cond-cell")].map(c=>({
        label:(c.querySelector(".le-cond-lbl")||{}).innerText||"",
        value:(c.querySelector(".le-cond-val")||{}).innerText||"",
        sub:(c.querySelector(".le-cond-sub")||{}).innerText||null,
        note:(c.querySelector(".le-cond-note")||{}).innerText||null }))
    }));
    desk.cells.forEach(c=>console.log("        "+c.label.padEnd(20)+" "+c.value+(c.sub?"   ["+c.sub+"]":"")+(c.note?"   ("+c.note+")":"")));
    console.log("        basis:", JSON.stringify(desk.basis));
    ok("the forward number is server-sourced", desk.basis && desk.basis.source==='canonical_server', JSON.stringify(desk.basis));
    ok("and current occupancy is too", desk.basis && desk.basis.current_source==='canonical_server');
    const ffCalls = net.filter(n=>/future-facts/.test(n.u));
    const canonCalls = net.filter(n=>/rent-roll\/canonical/.test(n.u));
    ok("the browser actually CALLED the canonical forward read", ffCalls.length>0, "calls: "+ffCalls.length);
    ok("and the canonical dated read", canonCalls.length>0, "calls: "+canonCalls.length);
    const asOfCall = canonCalls.find(n=>/as_of=/.test(n.u));
    ok("one of them asked about ANOTHER DATE", !!asOfCall, asOfCall?asOfCall.u.split("?")[1]:"(none)");

    console.log("\n== agreement is not convergence: compare to the server directly ==");
    const horizon = (cyc.targets.find(t=>t.key==='cycle')||{}).iso;
    const c = await (await fetch("http://127.0.0.1:3055/operator/rent-roll/canonical?as_of="+horizon,{headers:H})).json();
    const cur = await (await fetch("http://127.0.0.1:3055/operator/rent-roll/canonical",{headers:H})).json();
    //  The pin lineage renders the signed-in cell as a COUNT labelled
    //  "Occupied in rent roll" (value = count, sub = "of N positions ·
    //  K with terms not established · as of D"); the preview cell keeps the
    //  percent under "Current occupancy". Either label, same three checks.
    const occCell = desk.cells.find(x=>/Current occupancy|Occupied in rent roll/i.test(x.label));
    const occText = occCell ? (occCell.value+" "+(occCell.sub||"")).replace(/\s+/g," ").trim() : "";
    const fwdCell = desk.cells.find(x=>/Forward occupancy/i.test(x.label));
    console.log("        server NOW     : occupied "+cur.tenancy_summary.contractually_occupied+
      " · terms_not_est "+cur.tenancy_summary.occupied_terms_not_established+" · open "+cur.tenancy_summary.vacant+" of "+cur.tenancy_summary.total);
    console.log("        server @"+horizon+": occupied "+c.tenancy_summary.contractually_occupied+
      " · terms_not_est "+c.tenancy_summary.occupied_terms_not_established+" · open "+c.tenancy_summary.vacant);
    ok("the desk's Current Occupancy IS the server's contractually-occupied count",
      occCell && occText.indexOf(cur.tenancy_summary.contractually_occupied+" of "+cur.tenancy_summary.total)===0,
      occText);
    ok("and it is NOT total − vacant (95)",
      occCell && !/^95 of/.test(occText), occText);
    ok("the desk names the terms-not-established count beside it",
      occCell && new RegExp("\\b"+cur.tenancy_summary.occupied_terms_not_established+" with terms not established\\b").test(occText), occText);
    const occAt = c.tenancy_summary.contractually_occupied;
    const unresAt = c.tenancy_summary.occupied_terms_not_established;
    const expectPct = Math.round(100*occAt/c.tenancy_summary.total);
    if (occAt === 0 && unresAt > 0) {
      //  §18 · a zero floor is not a floor. The desk must refuse the number.
      ok("the forward cell is 'Not projectable' when nothing is contracted at that date",
        fwdCell && fwdCell.value === "Not projectable", fwdCell && fwdCell.value);
      ok("and it names the unresolved count the SERVER reported",
        fwdCell && new RegExp(unresAt+" of "+c.tenancy_summary.total).test(fwdCell.sub||""),
        fwdCell && fwdCell.sub);
    } else {
      ok("the forward percentage is the server's count over the server's denominator",
        fwdCell && fwdCell.value.replace(/[^0-9.]/g,"").indexOf(String(expectPct))===0,
        "expect ~"+expectPct+"% got "+(fwdCell&&fwdCell.value));
    }
    ok("the effective as_of is the horizon, not the import date or today",
      desk.basis && desk.basis.as_of_effective === horizon,
      "effective "+(desk.basis&&desk.basis.as_of_effective)+" vs horizon "+horizon);
    fs.writeFileSync(OUT+"/g3_result.json",JSON.stringify({cyc,desk,server:{now:cur.tenancy_summary,at:c.tenancy_summary,horizon}},null,1));
    await p.screenshot({path:OUT+"/g3_desk.png",fullPage:true});
    console.log("\n== "+pass+" passed, "+fail+" failed ==\n");
  } finally { await b.close(); st.close(); tls.close(); }
  process.exit(fail?1:0);
})().catch(e=>{console.error("HARNESS ERROR:",e.message);process.exit(2)});
