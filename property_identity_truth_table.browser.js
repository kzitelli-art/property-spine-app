/* ════════════════════════════════════════════════════════════════════
 *  BROWSER PROOF for tools/property_identity_truth_table.console.js
 *
 *  The harness exists to settle a blocker. A diagnostic that is trusted
 *  and wrong is worse than none, so its VERDICT is what gets proven —
 *  not that the file parses, and not that it prints a table.
 *
 *  Four scenarios, each run in a real Chromium page against a real HTTP
 *  server that resolves property FROM THE PRESENTED TOKEN, exactly as
 *  resolveStaffSession does:
 *
 *    A  storage token ≠ memory token   → must say HYPOTHESIS A CONFIRMED
 *    B  storage token = memory token   → must say it does NOT reproduce
 *    C  one token, endpoints disagree  → must say HYPOTHESIS B IS LIVE
 *    D  one endpoint returns 500       → must say INCOMPLETE, and must
 *                                        NOT report agreement from the
 *                                        rows that did return (§40.7)
 *
 *  D is the one that matters most. Composite silence reading as health
 *  is the failure mode this repo has already paid for.
 *
 *  Run:  node property_identity_truth_table.browser.js
 * ════════════════════════════════════════════════════════════════════ */
"use strict";
const http = require("http");
const path = require("path");
const fs = require("fs");

const API_DIR = "/home/user/property-spine-api";
const { chromium } = require(require.resolve("playwright", {
  paths: [path.join(API_DIR, "node_modules"), "/opt/node22/lib/node_modules"],
}));

const SOLO = "9e2bb96e-08e2-41db-81c2-91055ceb50a3";
const SKY  = "14e41b7c-e91c-49e8-9651-10c4908a8f6a";
const TOK_SOLO = "tok-solo-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TOK_SKY  = "tok-sky-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

let PASS = 0, FAIL = 0;
function ok(cond, label, detail) {
  if (cond) { PASS++; console.log("  ok    " + label); }
  else { FAIL++; console.log("  FAIL  " + label + (detail ? "\n          " + detail : "")); }
}

/*  The server resolves property from the TOKEN. `mode` bends exactly one
 *  behaviour per scenario so each assertion has a single cause.  */
function makeServer(mode, html) {
  return http.createServer((req, res) => {
    if (req.url === "/" || req.url.startsWith("/?")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(html());
    }
    const tok = req.headers["x-staff-session"] || "";
    const prop = tok === TOK_SKY ? SKY : tok === TOK_SOLO ? SOLO : null;
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "*");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    if (!prop) { res.writeHead(401, {"content-type":"application/json"}); return res.end('{"error":"no session"}'); }

    const u = req.url.split("?")[0];
    if (mode === "server_500" && u === "/operator/rent-roll/units") {
      res.writeHead(500, {"content-type":"application/json"});
      return res.end('{"error":"unavailable"}');
    }
    if (u === "/operator/me") {
      res.writeHead(200, {"content-type":"application/json"});
      return res.end(JSON.stringify({ id:"u1", name:"KZ", property_id: prop }));
    }
    if (u === "/operator/properties") {
      /*  The one endpoint bent in scenario C: same token, different answer.
       *  If the harness cannot see that, it cannot falsify the trace.  */
      const active = mode === "endpoints_disagree" ? SKY : prop;
      res.writeHead(200, {"content-type":"application/json"});
      return res.end(JSON.stringify({ active_property_id: active, count:2, properties:[] }));
    }
    if (u === "/operator/rent-roll/units") {
      res.writeHead(200, {"content-type":"application/json"});
      return res.end(JSON.stringify({ property_id: prop, units:[], totals:{} }));
    }
    res.writeHead(404); res.end("{}");
  });
}

function pageHtml(origin, storageTok, memoryProp, wordmark) {
  /*  A minimal shell carrying only what the harness reads. The stubbed
   *  __psLive mirrors the real sealed client: sessionMeta() returns the
   *  in-memory meta, and verifySession() calls /operator/me with the
   *  MEMORY token — which is the whole point of scenario A.  */
  const memTok = memoryProp === SKY ? TOK_SKY : TOK_SOLO;
  return `<!doctype html><meta charset="utf-8"><body>
<input id="apiBase" value="${origin}">
<span id="appbarDeal">${wordmark}</span>
<select id="propPick"><option value="${SKY}">Skyline</option><option value="${SOLO}">Solo</option></select>
<script>
  sessionStorage.setItem('__ps_staff_session__', JSON.stringify({ t:${JSON.stringify(storageTok)}, m:{ user_id:'u1', property_id:${JSON.stringify(memoryProp)} } }));
  var _egAuthScope = { property_id:${JSON.stringify(memoryProp)}, property_name:'stub' };
  var _MEM_TOK = ${JSON.stringify(memTok)};
  window.__psLive = {
    sessionMeta: function(){ return { user_id:'u1', property_id:${JSON.stringify(memoryProp)} }; },
    verifySession: async function(){
      var r = await fetch(${JSON.stringify(origin)} + '/operator/me', { headers:{ 'x-staff-session': _MEM_TOK } });
      if(!r.ok) return { ok:false, reason:'expired', status:r.status };
      var b = await r.json();
      return { ok:true, property:{ id:b.property_id, name:'stub' }, user:{ id:b.id } };
    }
  };
</script></body>`;
}

async function scenario(browser, name, mode, storageTok, memoryProp, expect) {
  let origin = null;
  const srv = makeServer(mode, () => pageHtml(origin, storageTok, memoryProp, "SKYLINE"));
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  origin = "http://127.0.0.1:" + srv.address().port;

  const page = await browser.newPage();
  const logs = [];
  page.on("console", (m) => logs.push(m.text()));
  page.on("pageerror", (e) => logs.push("PAGEERROR " + String(e && e.message || e)));
  await page.goto(origin + "/", { waitUntil: "load" });

  const src = fs.readFileSync(path.join(__dirname, "tools/property_identity_truth_table.console.js"), "utf8");
  let threw = null;
  try { await page.evaluate(src); } catch (e) { threw = String(e && e.message || e); }
  /*  console.table renders asynchronously through the CDP channel.  */
  await page.waitForTimeout(300);
  const text = logs.join("\n");
  /*  console.table renders into devtools and does not survive the console
   *  pipe, so the ROWS are read from where the harness leaves them.  */
  const rows = await page.evaluate(() => window.__psPropertyIdentityTable || null);

  console.log("\n── " + name + " ──");
  ok(!threw, "the harness ran without throwing", threw);
  ok(Array.isArray(rows) && rows.length > 0, "the rows are readable on window.__psPropertyIdentityTable");
  expect(text, rows || []);

  await page.close();
  await new Promise((r) => srv.close(r));
  return text;
}

(async () => {
  const exe = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
               "/opt/pw-browsers/chromium/chrome-linux/chrome"].find((p) => fs.existsSync(p));
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});

  console.log("════════════════════════════════════════════════════════════════");
  console.log("  PROPERTY IDENTITY TRUTH TABLE — browser proof of the VERDICT");
  console.log("════════════════════════════════════════════════════════════════");

  //  A — the divergence the blocker describes.
  await scenario(browser, "A · storage token SKYLINE, memory token SOLO", "normal",
    TOK_SKY, SOLO, (t) => {
      ok(/HYPOTHESIS A CONFIRMED/.test(t), "names hypothesis A");
      ok(/MEMORY token resolves to 9e2bb96e/.test(t), "names the memory token's property");
      ok(/STORAGE token resolves to 14e41b7c/.test(t), "names the storage token's property");
      ok(!/HYPOTHESIS B IS LIVE/.test(t), "does not also blame the server");
    });

  //  B — the same session everywhere. Agreement is not an answer.
  await scenario(browser, "B · storage and memory agree on SOLO", "normal",
    TOK_SOLO, SOLO, (t) => {
      ok(/bad state is NOT reproduced right now/.test(t), "refuses to call agreement an answer");
      ok(!/HYPOTHESIS A CONFIRMED/.test(t), "does not claim hypothesis A");
    });

  //  C — one token, two answers. This must falsify the source trace.
  await scenario(browser, "C · one token, /operator/properties disagrees", "endpoints_disagree",
    TOK_SOLO, SOLO, (t) => {
      ok(/HYPOTHESIS B IS LIVE/.test(t), "reopens hypothesis B");
      ok(/PROPERTY_IDENTITY_AUTHORITY_TRACE\.md .2 is WRONG/.test(t), "sends the reader to the trace it falsifies");
      ok(!/bad state is NOT reproduced/.test(t), "does not simultaneously report agreement");
    });

  //  D — a required reader failed. THE ONE THAT MATTERS.
  await scenario(browser, "D · rent-roll returns 500", "server_500",
    TOK_SOLO, SOLO, (t, rows) => {
      ok(/INCOMPLETE/.test(t), "reports the read failure as incompleteness");
      ok(/Composite agreement is NOT health/.test(t), "cites the four silences");
      ok(!/Server rows AGREE/.test(t), "WITHHOLDS the agreement verdict, not merely caveats it");
      ok(!/bad state is NOT reproduced/.test(t), "does not clear the blocker on a partial table");
      const failed = rows.filter((r) => r.property === "READ_FAILED");
      ok(failed.length === 1, "exactly one row is READ_FAILED", "got " + failed.length +
         " → " + JSON.stringify(rows.map((r) => r.source + "=" + r.property)));
      ok(/rent-roll/.test((failed[0] || {}).source || ""), "and it is the rent-roll row");
      ok(/HTTP 500/.test((failed[0] || {}).note || ""), "the row carries the status, not a bare failure");
    });

  await browser.close();

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("  ASSERTIONS COMPLETE · " + (PASS + FAIL) + " run · " + PASS + " passed · " + FAIL + " failed");
  console.log(FAIL ? "  ✗ FAIL" : "  ✓ PASS — the verdict logic distinguishes all four states.");
  console.log("════════════════════════════════════════════════════════════════\n");
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
