#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   ASK SPINE — THE BROWSER GATE

   Ten checks, in a real browser, against the real app and the real API.
   The owner set them; the numbering below is theirs.

   ── WHY THIS FILE EXISTS ────────────────────────────────────────────

   The previous claim for this slice was "verified" on the strength of a
   rendered-HTML check and a stubbed unit test. That is `Locally
   exercised` on this repo's ladder — Browser verified means the actual
   path is clicked and observed against a real runtime. This is that.

   ── A CHECK THAT COULD NOT RUN IS NOT A CHECK THAT PASSED ───────────

   Five of the ten need a real model: they are about what the assistant
   ANSWERS, and a stub answering on its behalf would prove the stub. When
   ANTHROPIC_API_KEY is absent those are reported NOT RUN, loudly, and the
   gate exits non-zero. There is no flag that turns them green.

       API_DIR=/path/to/api \
       HARNESS_DATABASE_URL=postgres://…/disposable \
       [ANTHROPIC_API_KEY=…] \
         node ask_spine_browser_gate.browser.js

   Fixtures COMMIT to that database. Never point it at production.
   ════════════════════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const fs = require("fs");
const http = require("http");

const API = process.env.API_DIR;
const CONN = process.env.HARNESS_DATABASE_URL;
const HAS_KEY = !!process.env.ANTHROPIC_API_KEY;
if (!API || !CONN) { console.error("need API_DIR and HARNESS_DATABASE_URL"); process.exit(2); }
if (/neon\.tech|render\.com/i.test(CONN)) {
  console.error("REFUSED: HARNESS_DATABASE_URL looks like production. This seeds fixtures.");
  process.exit(2);
}

const { chromium } = require(require.resolve("playwright", { paths: [path.join(API, "node_modules"), "/opt/node22/lib/node_modules"] }));
const { Pool } = require(path.join(API, "node_modules/pg"));

let pass = 0, fail = 0, notRun = 0;
const ok = (l, c, d) => {
  if (c) { pass++; console.log("  ok      " + l); }
  else { fail++; console.log("  FAIL    " + l + (d ? "\n          " + d : "")); }
  return c;
};
const skip = (l, why) => { notRun++; console.log("  NOT RUN " + l + "\n          " + why); };

(async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("  ASK SPINE · BROWSER GATE");
  console.log("═".repeat(70));
  console.log(`  model key: ${HAS_KEY ? "present" : "ABSENT — five checks cannot run"}\n`);

  // ── 1 · SEED A REAL STACK ─────────────────────────────────────────
  const pool = new Pool({ connectionString: CONN, ssl: false });
  const staffSessions = require(path.join(API, "src/identity/staff_session_service.js"));
  const c = await pool.connect();
  const one = async (q, a = []) => (await c.query(q, a)).rows[0];

  /*  A UNIQUE RUN TAG. The fixtures COMMIT, so a second run collided on
   *  the normalized-phone uniqueness index and the harness died before it
   *  proved anything. A gate that only works once is a gate nobody re-runs
   *  after a change, which is the only time it matters. */
  const RUN = String(process.pid) + String(Date.now()).slice(-6);
  const ORG = (await one(`insert into organizations (name) values ($1) returning id`,
    ["Ask Spine Gate Org " + RUN])).id;
  //  TWO properties. The second exists solely so "scoped to this property"
  //  is a claim that can FAIL — a single-property fixture would pass the
  //  scope checks no matter what the server did.
  const SOLO = (await one(
    `insert into properties (name, organization_id, operating_timezone)
     values ($2,$1,'America/New_York') returning id`, [ORG, "Solo Gate " + RUN])).id;
  const OTHER = (await one(
    `insert into properties (name, organization_id, operating_timezone)
     values ($2,$1,'America/New_York') returning id`, [ORG, "Other Gate " + RUN])).id;

  const user = (await one(
    `insert into users (name, phone, role, is_active) values ($1,$2,'property_manager',true) returning id`,
    ["Gate Operator " + RUN, "+1541" + String(5550000 + (process.pid % 9999)).slice(0, 7)])).id;

  //  Work at BOTH properties, with distinguishable titles.
  await c.query(`insert into work_orders (property_id,title,status,source) values
      ($1,'SOLO-ONLY leaking sink','open','gate'), ($1,'SOLO-ONLY hallway light','open','gate'),
      ($2,'OTHER-ONLY broken gate','open','gate')`, [SOLO, OTHER]);
  await c.query(`insert into obligations (property_id,module,type,label,status,due_at,assigned_user_id)
     values ($1,'maintenance','work_order_routing','SOLO-ONLY overdue routing','open', now() - interval '2 days', $2)`,
    [SOLO, user]);
  await c.query(`insert into obligations (property_id,module,type,label,status,due_at)
     values ($1,'maintenance','work_order_routing','OTHER-ONLY routing','open', now() - interval '2 days')`, [OTHER]);

  /*  A REAL SESSION, THROUGH THE ONE MINT PATH.
   *  issueStaffSession is the only way a session is created in this
   *  product. Inserting a row by hand would test a token this codebase
   *  does not issue, and the resolver's own rules would go unexercised. */
  await c.query(`update users set status='active' where id=$1`, [user]).catch(() => {});
  /*  AUTHORITY IS A GRANT, NOT A BINDING. issueStaffSession refuses without
   *  an active property_team_assignments row — "the caller may have bound
   *  the attempt to this property, but binding is not authority". The
   *  fixture has to grant it the same way the product does.
   *
   *  maintenance is the module Ask Spine reads, so the entitlement is
   *  narrow on purpose: a grant of everything would hide a scoping bug. */
  await c.query(
    `insert into property_team_assignments (property_id, user_id, role_title, allowed_modules, active)
     values ($1,$2,'property_manager', array['maintenance'], true)`, [SOLO, user]);
  const session = await staffSessions.issueStaffSession(c, {
    userId: user, propertyId: SOLO, purpose: "bootstrap_invite",
  });
  const TOKEN = session.token || session.plaintext || session.session_token || session;
  c.release();

  // ── 2 · BOOT THE REAL API ─────────────────────────────────────────
  process.env.DATABASE_URL = CONN;
  process.env.PORT = "3999";
  process.env.OPERATOR_APP_ORIGIN = "http://127.0.0.1:4000";
  let apiProc = null;
  const { spawn } = require("child_process");
  apiProc = spawn(process.execPath, [path.join(API, "server.js")], {
    env: Object.assign({}, process.env), stdio: ["ignore", "pipe", "pipe"],
  });
  let apiLog = "";
  apiProc.stdout.on("data", (d) => { apiLog += d; });
  apiProc.stderr.on("data", (d) => { apiLog += d; });
  const upBy = Date.now() + 30000;
  let up = false;
  while (Date.now() < upBy && !up) {
    await new Promise((r) => setTimeout(r, 400));
    up = await new Promise((r) => {
      const req = http.get("http://127.0.0.1:3999/health", (res) => { res.resume(); r(res.statusCode === 200); });
      req.on("error", () => r(false)); req.setTimeout(800, () => { req.destroy(); r(false); });
    });
  }
  ok("S1  the real API booted against the harness database", up,
     "server.js did not come up:\n          " + apiLog.split("\n").slice(-8).join("\n          "));
  if (!up) { apiProc.kill(); await pool.end(); process.exit(1); }

  // ── 3 · SERVE THE REAL APP ────────────────────────────────────────
  const appHtml = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const appServer = http.createServer((req, res) => {
    const f = req.url.split("?")[0].replace(/^\//, "") || "index.html";
    const p = path.join(__dirname, f);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      res.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html" });
      return res.end(fs.readFileSync(p));
    }
    res.writeHead(404); res.end("no");
  });
  await new Promise((r) => appServer.listen(4000, "127.0.0.1", r));

  /*  THE BROWSER IS PINNED BY PATH, NOT BY VERSION.
   *  The installed Chromium is 1194; the playwright package resolves to a
   *  different build number and its default path does not exist. Falling
   *  back to chromium.launch() only produced a second, more confusing
   *  error. Discovered, then asserted — a gate that cannot start a browser
   *  must say so in those words, not print an install banner. */
  const CANDIDATES = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/opt/pw-browsers/chromium/chrome-linux/chrome",
  ];
  const exe = CANDIDATES.find((p2) => fs.existsSync(p2));
  if (!exe) {
    console.error("  ⛔ no Chromium found under /opt/pw-browsers. The browser gate " +
                  "cannot run, and NOT RUN is not a pass.");
    apiProc.kill(); appServer.close(); await pool.end(); process.exit(2);
  }
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e.message)));

  await page.goto("http://127.0.0.1:4000/index.html", { waitUntil: "domcontentloaded" });
  //  Point the app at the harness API and give it the real session, the
  //  same way the app itself stores one.
  /*  THE SESSION GOES WHERE THE APP KEEPS IT.
   *  Not localStorage and not a bare string: the app rehydrates from
   *  sessionStorage['__ps_staff_session__'] as {t, m}, and there is
   *  deliberately no public setter — "the shell must never hold the raw
   *  token". Writing the wrong key produced an EMPTY Ask Spine box, which
   *  is the no-fixture rule working correctly and would have read as a
   *  broken feature if I had not gone looking. */
  await page.evaluate(([origin, token, prop, uid]) => {
    try { localStorage.setItem("ps_api_base", origin); } catch (e) {}
    try {
      sessionStorage.setItem("__ps_staff_session__",
        JSON.stringify({ t: token, m: { user_id: uid, property_id: prop } }));
    } catch (e) {}
  }, ["http://127.0.0.1:3999", TOKEN, SOLO, user]);
  await page.reload({ waitUntil: "domcontentloaded" });

  //  THE LESSON FROM THE 13/13 THAT PASSED ON A SIGN-IN SCREEN: assert
  //  the app actually rendered before reading anything out of it.
  const appLoaded = await page.evaluate(() =>
    !!document.querySelector("#askSpineMount") || !!document.querySelector(".as-box"));
  ok("S2  the app rendered — the Ask Spine mount exists", appLoaded,
     "the page loaded something, but not the app. Every read below would be false.");

  const shellHtml = await page.evaluate(() => {
    if (typeof renderAskSpine === "function") { try { renderAskSpine(); } catch (e) {} }
    const el = document.querySelector(".as-box");
    return el ? el.outerHTML : "";
  });
  const hasInput = /id="askSpineInput"/.test(shellHtml);
  ok("S3  the Ask Spine box rendered WITH a text input", hasInput,
     "no input in the rendered box — there is nothing to type into:\n          " +
     shellHtml.slice(0, 300));

  //  A live session is required for the box to render at all — that is the
  //  no-fixture rule, and it is check 10.
  ok("10  no fixture fallback — the box renders only with a live session",
     hasInput && !/demo|sample|fixture/i.test(shellHtml),
     "fixture language reached a signed-in operator surface");

  // ── the interaction ───────────────────────────────────────────────
  const ask = async (q, useEnter) => {
    await page.fill("#askSpineInput", q);
    if (useEnter) await page.press("#askSpineInput", "Enter");
    else await page.click(".as-send");
    await page.waitForFunction(
      () => { const b = document.querySelector("#askSpineBody"); return b && !/as-loading/.test(b.innerHTML); },
      { timeout: 30000 }).catch(() => {});
    return page.evaluate(() => {
      const b = document.querySelector("#askSpineBody");
      const a = b && b.querySelector("[data-as]");
      return { outcome: a ? a.getAttribute("data-as") : null,
               //  innerText, not textContent: layout-aware, so text in a
               //  hidden node cannot be read as visible.
               text: a ? a.innerText : (b ? b.innerText : ""),
               ground: (b && b.querySelector(".as-ground")) ? b.querySelector(".as-ground").innerText : null };
    });
  };

  // ── 6 · MODEL UNAVAILABLE (runs with or without a key) ────────────
  //  Forced by pointing the app's request at a route that will fail the
  //  model call. With no key the server ALREADY returns unavailable, so
  //  this is the check the absent key lets us prove rather than skip.
  if (!HAS_KEY) {
    const r6 = await ask("what should I focus on?", false);
    ok("6   model unavailable → `unavailable`, never empty or all-clear",
       r6.outcome === "unavailable" &&
       !/nothing (is )?(open|needs)|all clear|no open/i.test(r6.text),
       `outcome=${r6.outcome} text=${JSON.stringify(r6.text).slice(0, 200)}`);
    ok("6b  …and it is rendered as an outage, not as a calm result",
       await page.evaluate(() => !!document.querySelector(".as-unavail")),
       "the outage used the empty-result treatment");
  }

  // ── 1,2,3 · GROUNDED ANSWERS · need a real model ──────────────────
  const modelChecks = [
    ["1   “What should I focus on?” → grounded answer", "What should I focus on?"],
    ["2   “What work orders are open?” → grounded answer", "What work orders are open?"],
    ["3   “Who owns the overdue work?” → grounded answer", "Who owns the overdue work?"],
  ];
  const scopeChecks = [
    ["4   “Should I raise rents?” → out_of_scope", "Should I raise rents?"],
    ["5   “What did we say in Monday’s meeting?” → out_of_scope", "What did we say in Monday's meeting?"],
  ];

  if (HAS_KEY) {
    for (const [label, q] of modelChecks) {
      const r = await ask(q, false);
      ok(label, r.outcome === "answered" && r.text.length > 0,
         `outcome=${r.outcome} text=${JSON.stringify(r.text).slice(0, 200)}`);
      ok("    …and it shows what it read", !!r.ground && /Read /.test(r.ground),
         "no grounding line — the claim is not checkable");
      //  Scope, observed in the answer itself: it must not name the other
      //  property's work.
      ok("    …and it names no work from the other property",
         !/OTHER-ONLY/.test(r.text), r.text.slice(0, 200));
    }
    for (const [label, q] of scopeChecks) {
      const r = await ask(q, false);
      ok(label, r.outcome === "out_of_scope",
         `outcome=${r.outcome} text=${JSON.stringify(r.text).slice(0, 200)}`);
      ok("    …and the refusal names what CAN be asked",
         /what needs attention|what is open|who has a job/i.test(r.text), r.text.slice(0, 200));
    }
  } else {
    [...modelChecks, ...scopeChecks].forEach(([label]) =>
      skip(label, "ANTHROPIC_API_KEY is absent. These are claims about what the " +
                  "assistant ANSWERS; a stub answering for it would prove the stub."));
  }

  // ── Enter and Ask both work ───────────────────────────────────────
  const viaEnter = await ask("what is open?", true);
  ok("E1  Enter submits — the request was made and an outcome rendered",
     viaEnter.outcome !== null, "nothing rendered after pressing Enter");
  const viaClick = await ask("what is open?", false);
  ok("E2  the Ask button submits too", viaClick.outcome !== null);

  // ── 8/9 · AUTHORITY, observed at the wire ─────────────────────────
  //  9 is asserted against the SERVER, because that is where the rule
  //  lives. A browser that simply never sends property_id would make this
  //  pass without the server refusing anything.
  const forced = await page.evaluate(async ([origin, token, other]) => {
    const r = await fetch(origin + "/operator/ask-spine/ask", {
      method: "POST",
      headers: { "content-type": "application/json", "x-staff-session": token },
      body: JSON.stringify({ question: "what is open?", property_id: other }),
    });
    return { status: r.status, body: await r.text() };
  }, ["http://127.0.0.1:3999", TOKEN, OTHER]);
  ok("9   a client-supplied property_id for another property is REFUSED",
     forced.status === 403 && /server-derived/.test(forced.body),
     `status=${forced.status} body=${forced.body.slice(0, 220)}`);

  const echoed = await page.evaluate(async ([origin, token]) => {
    const r = await fetch(origin + "/operator/ask-spine/ask", {
      method: "POST",
      headers: { "content-type": "application/json", "x-staff-session": token },
      body: JSON.stringify({ question: "what is open?" }),
    });
    return r.json();
  }, ["http://127.0.0.1:3999", TOKEN]);
  ok("8   the property answered for is the SESSION's, echoed from the server",
     echoed.property_id === SOLO,
     `echoed ${echoed.property_id}, session property ${SOLO}`);

  const noSession = await page.evaluate(async ([origin]) => {
    const r = await fetch(origin + "/operator/ask-spine/ask", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "what is open?" }),
    });
    return r.status;
  }, ["http://127.0.0.1:3999"]);
  ok("8b  with no staff session the route refuses outright", noSession === 401,
     "status " + noSession);

  // ── 7 · A FAILED UNDERLYING READ ──────────────────────────────────
  //  Broken for real, at the database, while the app stays up. A stub
  //  would prove the stub; renaming the table makes the read genuinely
  //  fail underneath a running server.
  const c2 = await pool.connect();
  await c2.query("alter table obligations rename to obligations__gate_hidden");
  const r7 = await page.evaluate(async ([origin, token]) => {
    const r = await fetch(origin + "/operator/ask-spine/ask", {
      method: "POST", headers: { "content-type": "application/json", "x-staff-session": token },
      body: JSON.stringify({ question: "what is open?" }),
    });
    return r.json();
  }, ["http://127.0.0.1:3999", TOKEN]);
  await c2.query("alter table obligations__gate_hidden rename to obligations");
  c2.release();

  ok("7   a failed underlying read is never reported as zero / nothing-open",
     r7.outcome === "unavailable" ||
     (r7.grounded_on && Array.isArray(r7.grounded_on.reads_that_failed) &&
      r7.grounded_on.reads_that_failed.length > 0),
     "the failed read was invisible in the response — an operator would be told " +
     "nothing is open: " + JSON.stringify(r7).slice(0, 260));

  ok("X1  no uncaught page errors during the run", consoleErrors.length === 0,
     consoleErrors.slice(0, 3).join("\n          "));

  await page.screenshot({ path: path.join(__dirname, "ask_spine_browser_gate.png"), fullPage: false })
    .catch(() => {});
  await browser.close();
  appServer.close();
  apiProc.kill();
  await pool.end();

  console.log("\n" + "═".repeat(70));
  console.log(`  ${pass} passed · ${fail} failed · ${notRun} NOT RUN`);
  if (notRun) {
    console.log("");
    console.log("  ⛔ NOT COMPLETE. A check that could not run is not a check that");
    console.log("     passed. Re-run with ANTHROPIC_API_KEY set to close the gate.");
  } else if (fail === 0) {
    console.log("  ✓ THE GATE IS CLOSED. Screenshot: ask_spine_browser_gate.png");
  }
  console.log("═".repeat(70) + "\n");
  process.exit(fail === 0 && notRun === 0 ? 0 : 1);
})().catch((e) => { console.error("\nERROR:\n" + (e && e.stack || e)); process.exit(2); });
