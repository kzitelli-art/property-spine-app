#!/usr/bin/env node
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = __dirname;
const SHOTS = path.join(ROOT, "docs", "ask-spine-dashboard-convergence");
const TOKEN = "browser-proof-staff-session";
const USER = "mike-user";
const PROPERTY = "skyline-property";
const LEASING_QUESTION = "What does the rent roll establish at Skyline?";
const LEASING_ANSWER = "The rent roll is established for 160 rentable positions as of August 25, 2026.";
const LEASING_PERSON_QUESTION = "Has Marisol Trejo signed her lease packet?";
const LEASING_PERSON_ANSWER = "Marisol Trejo has an application submitted; nothing is signed yet.";
const LEASING_PERSON_DENIED = "Show me Marisol Trejo's leasing standing.";
const LEASING_PERSON_DENIED_ANSWER = "A person's leasing standing is not available in your current access for this property.";
const REFERENCE_ID = "11111111-2222-4333-8444-555555555555";

let passed = 0;
let failed = 0;
function ok(name, condition, detail) {
  if (condition) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.error("  ✗ " + name + (detail ? "\n      " + detail : "")); }
}

function payload(question) {
  const common = { property_id: PROPERTY, asked_at: "2026-08-25T15:00:00.000Z" };
  if (question === LEASING_QUESTION) return {
    ...common,
    outcome: "answered",
    answer: LEASING_ANSWER,
    grounded_on: {
      tenancy_standing: "ESTABLISHED",
      tenancy_read_state: "QUIET",
      tenancy_rentable_positions: 160,
      reads_that_failed: [],
      gathered_at: "2026-08-25T15:00:00.000Z",
    },
    references: [{ label: "Skyline rent roll", module: "leasing", open: { kind: "person", id: REFERENCE_ID } }],
  };
  if (question === LEASING_PERSON_QUESTION) return {
    ...common,
    outcome: "answered",
    answer: LEASING_PERSON_ANSWER,
    grounded_on: {
      leasing_read_state: "OK",
      leasing_subject_name: "Marisol Trejo",
      leasing_relationship_stage: "application_submitted",
      leasing_application_status: "submitted",
      leasing_packet_status: "draft",
      leasing_resident_executed_at: null,
      leasing_company_executed_at: null,
      leasing_next_action_code: "resident_execute_lease",
      leasing_uncertainty_count: 0,
      reads_that_failed: [],
      gathered_at: "2026-08-25T15:00:00.000Z",
    },
    references: [],
  };
  if (question === LEASING_PERSON_DENIED) return {
    ...common,
    outcome: "not_authorized",
    answer: LEASING_PERSON_DENIED_ANSWER,
    grounded_on: null,
    references: [],
  };
  if (question === "Show me the honest silence states.") return {
    ...common,
    outcome: "answered",
    answer: "Gas applicability is NOT_ESTABLISHED. One governed read returned READ_FAILED and another returned READ_TIMED_OUT; the completed tenancy read is QUIET.",
    grounded_on: {
      utility_setup_state: "NOT_ESTABLISHED",
      utility_read_state: "READ_TIMED_OUT",
      contracted_service_read_state: "READ_FAILED",
      tenancy_read_state: "QUIET",
      reads_that_failed: ["utility_timed_out", "contracted_service"],
    },
    references: [],
  };
  if (question === "Should I raise rents?") return {
    ...common, outcome: "out_of_scope",
    answer: "I can answer governed property questions, but I cannot recommend a rent decision.",
    grounded_on: null, references: [],
  };
  if (question === "Show another property's rent roll.") return {
    ...common, outcome: "not_authorized",
    answer: "The rent roll is not available in your current access for this property.",
    grounded_on: null, references: [],
  };
  if (question === "Combine the rent roll and debt position.") return {
    ...common, outcome: "composition_unavailable",
    answer: "I can answer those governed domains separately, but I cannot combine them in one answer yet.",
    grounded_on: null, references: [],
  };
  if (question === "Ask while composition is unavailable.") return {
    ...common, outcome: "unavailable",
    answer: "I couldn't reach the assistant just then. Try again in a moment.",
    grounded_on: null, references: [],
  };
  if (question === "What needs attention?") return {
    ...common, outcome: "answered",
    answer: "Two recorded open items are routed to you at this property.",
    grounded_on: { personal_open_items: 2, attention_scope: "personal", reads_that_failed: [] },
    references: [],
  };
  return { ...common, outcome: "out_of_scope", answer: "That question is outside the governed scope.", grounded_on: null, references: [] };
}

function staticServer() {
  return http.createServer((req, res) => {
    const pathname = decodeURIComponent(String(req.url || "/").split("?")[0]);
    const requested = path.resolve(ROOT, pathname === "/" ? "index.html" : "." + pathname);
    if (!requested.startsWith(path.resolve(ROOT))) { res.writeHead(403); return res.end("no"); }
    fs.readFile(requested, (error, bytes) => {
      if (error) { res.writeHead(404); return res.end("not found"); }
      const type = requested.endsWith(".js") ? "text/javascript" : requested.endsWith(".html") ? "text/html" : "application/octet-stream";
      res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
      res.end(bytes);
    });
  });
}

async function ask(page, question, useEnter) {
  const prior = await page.locator("#askSpineMount .as-turn").last().getAttribute("data-as-turn").catch(() => null);
  const before = Number(prior || 0);
  await page.fill("#askSpineInput", question);
  if (useEnter) await page.press("#askSpineInput", "Enter");
  else await page.click("#askSpineMount .as-send");
  await page.waitForFunction((priorId) => {
    const turns = document.querySelectorAll("#askSpineMount .as-turn");
    if (!turns.length) return false;
    const last = turns[turns.length - 1];
    return Number(last.getAttribute("data-as-turn") || 0) > priorId && !!last.querySelector("[data-as]");
  }, before, { timeout: 10000 });
  const turn = page.locator("#askSpineMount .as-turn").last();
  return {
    outcome: await turn.locator("[data-as]").getAttribute("data-as"),
    answer: await turn.locator(".as-answer").textContent().catch(() => ""),
    text: await turn.textContent(),
  };
}

async function askFromIdleComposer(page, question) {
  await page.fill("#askSpineIdleInput", question);
  await page.press("#askSpineIdleInput", "Enter");
  await page.waitForFunction(() => {
    const last = document.querySelector("#askSpineMount .as-turn:last-child");
    return !!(last && last.querySelector("[data-as]"));
  }, null, { timeout: 10000 });
  const turn = page.locator("#askSpineMount .as-turn").last();
  return {
    outcome: await turn.locator("[data-as]").getAttribute("data-as"),
    answer: await turn.locator(".as-answer").textContent().catch(() => ""),
    text: await turn.textContent(),
  };
}

async function runViewport(browser, serverPort, viewport, name) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(([token, user, property]) => {
    sessionStorage.setItem("__ps_staff_session__", JSON.stringify({
      t: token, m: { user_id: user, property_id: property },
    }));
  }, [TOKEN, USER, PROPERTY]);

  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const requests = [];
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error && error.message || error)));
  // Keep this local proof independent of Google Fonts availability. The
  // product CSS retains its normal font stack; the proof exercises layout,
  // interaction and the wire contract without an unrelated network wait.
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({
    status: 200, contentType: "text/css", body: "",
  }));
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort("blockedbyclient"));
  await page.route("https://property-spine-api.onrender.com/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const headers = { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers, body: "" });
    if (url.pathname === "/operator/me") return route.fulfill({ status: 200, headers, body: JSON.stringify({
      id: USER, name: "Mike", role: "leasing", property_id: PROPERTY,
      property_name: "Skyline", allowed_modules: ["leasing"], platform_role: "member",
    }) });
    if (url.pathname === "/operator/ask-spine/ask") {
      const body = req.postDataJSON();
      requests.push({ method: req.method(), url: req.url(), headers: req.headers(), body });
      if (body.question === "Trigger a transport failure.") return route.abort("failed");
      return route.fulfill({ status: 200, headers, body: JSON.stringify(payload(body.question)) });
    }
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: "not in this proof" }) });
  });

  await page.goto(`http://127.0.0.1:${serverPort}/index.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => window.__psLive && window.__psLive.hasSession && window.__psLive.hasSession(), null, { timeout: 10000 });
  await page.evaluate(() => {
    document.body.classList.add("at-home");
    const home = document.getElementById("home"); if (home) home.classList.remove("hidden");
    const workspace = document.getElementById("workspace"); if (workspace) workspace.classList.add("hidden");
    renderAskSpine();
  });
  await page.waitForSelector("#askSpineLauncher");

  ok(`${name}: Ask Spine defaults to an inline composer`, await page.locator("#askSpineIdleInput").isVisible());
  ok(`${name}: idle composer keeps an accessible name`, await page.locator("#askSpineIdleInput").getAttribute("aria-label") === "Ask Spine a question");
  const launcherBox = await page.locator("#askSpineLauncher").boundingBox();
  ok(`${name}: idle composer does not take over the viewport`,
    launcherBox && launcherBox.height <= 78,
    launcherBox && JSON.stringify(launcherBox));
  ok(`${name}: property dashboard remains visible behind the launcher`, await page.locator("#deskGrid").isVisible());
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}-collapsed.png`) });

  const leasing = await askFromIdleComposer(page, LEASING_QUESTION);
  await page.waitForSelector("#askSpineInput");

  ok(`${name}: submitting opens the conversational workspace`, await page.locator("#askSpineInput").isVisible());
  ok(`${name}: transcript is announced as a conversation log`, await page.locator("#askSpineBody").getAttribute("role") === "log");
  ok(`${name}: composer keeps an accessible name`, await page.locator("#askSpineInput").getAttribute("aria-label") === "Ask Spine a question");
  ok(`${name}: representative leasing question is answered`, leasing.outcome === "answered", leasing.outcome);
  ok(`${name}: displayed canonical answer equals the server response`, leasing.answer === LEASING_ANSWER, leasing.answer);
  ok(`${name}: canonical outcome is preserved`, leasing.outcome === payload(LEASING_QUESTION).outcome);
  ok(`${name}: QUIET is shown from server provenance`, await page.locator('[data-as-key="tenancy_read_state"]').last().textContent() === "tenancy read state · QUIET");
  ok(`${name}: canonical count is shown without client derivation`, await page.locator('[data-as-key="tenancy_rentable_positions"]').last().textContent() === "tenancy rentable positions · 160");
  ok(`${name}: safe reference has no href`, await page.locator(".as-reference").last().getAttribute("href") === null);
  ok(`${name}: raw database reference id is not printed`, !(await page.locator("#askSpineMount").textContent()).includes(REFERENCE_ID));

  const person = await ask(page, LEASING_PERSON_QUESTION, false);
  ok(`${name}: CAMP leasing_person answer is rendered unchanged`, person.outcome === "answered" && person.answer === LEASING_PERSON_ANSWER, person.answer);
  const personTurn = page.locator("#askSpineMount .as-turn").last();
  const expectedPersonGrounding = {
    leasing_read_state: "leasing read state · OK",
    leasing_subject_name: "leasing subject name · Marisol Trejo",
    leasing_relationship_stage: "leasing relationship stage · application_submitted",
    leasing_application_status: "leasing application status · submitted",
    leasing_packet_status: "leasing packet status · draft",
    leasing_resident_executed_at: "leasing resident executed at · null",
    leasing_company_executed_at: "leasing company executed at · null",
    leasing_next_action_code: "leasing next action code · resident_execute_lease",
    leasing_uncertainty_count: "leasing uncertainty count · 0",
  };
  for (const [key, value] of Object.entries(expectedPersonGrounding)) {
    ok(`${name}: CAMP grounding ${key} is rendered exactly`,
      await personTurn.locator(`[data-as-key="${key}"]`).textContent() === value);
  }

  const personDenied = await ask(page, LEASING_PERSON_DENIED, false);
  ok(`${name}: CAMP leasing_person refusal stays not_authorized`, personDenied.outcome === "not_authorized");
  ok(`${name}: CAMP deterministic refusal text is unchanged`, personDenied.answer === LEASING_PERSON_DENIED_ANSWER, personDenied.answer);
  const deniedTurn = page.locator("#askSpineMount .as-turn").last();
  ok(`${name}: null grounded_on creates no invented grounding`, await deniedTurn.locator(".as-provenance").count() === 0);
  ok(`${name}: empty refusal references create no record affordance`, await deniedTurn.locator(".as-reference").count() === 0);
  ok(`${name}: refusal still carries separate server timing`, await deniedTurn.locator(".as-timing").textContent() === "asked at · 2026-08-25T15:00:00.000Z");

  await page.click("#askSpineMount .as-close");
  ok(`${name}: conversation can collapse without occupying the dashboard`, await page.locator("#askSpineLauncher").isVisible());
  await page.click("#askSpineOpen");
  ok(`${name}: collapsing preserves the canonical answer`, (await page.locator("#askSpineMount").textContent()).includes(LEASING_ANSWER));

  const beforeSilences = await page.locator("#askSpineMount .as-turn").count();
  const silences = await ask(page, "Show me the honest silence states.", false);
  ok(`${name}: subsequent answers are appended`, await page.locator("#askSpineMount .as-turn").count() === beforeSilences + 1);
  ok(`${name}: NOT_ESTABLISHED remains visible`, silences.text.includes("NOT_ESTABLISHED"));
  ok(`${name}: READ_FAILED remains visible`, silences.text.includes("READ_FAILED"));
  ok(`${name}: READ_TIMED_OUT remains visible`, silences.text.includes("READ_TIMED_OUT"));
  ok(`${name}: QUIET remains visible beside the other silences`, silences.text.includes("QUIET"));

  const out = await ask(page, "Should I raise rents?", false);
  ok(`${name}: out_of_scope is not displayed as answered`, out.outcome === "out_of_scope");
  const denied = await ask(page, "Show another property's rent roll.", false);
  ok(`${name}: unentitled attempt displays not_authorized`, denied.outcome === "not_authorized");
  const composed = await ask(page, "Combine the rent roll and debt position.", false);
  ok(`${name}: cross-domain refusal displays composition_unavailable`, composed.outcome === "composition_unavailable");
  const unavailable = await ask(page, "Ask while composition is unavailable.", false);
  ok(`${name}: canonical unavailable remains an outage`, unavailable.outcome === "unavailable" && unavailable.text.includes("couldn't reach"));

  const beforeChip = requests.length;
  const priorChipTurn = Number(await page.locator("#askSpineMount .as-turn").last().getAttribute("data-as-turn") || 0);
  await page.click("#askSpineMount .as-chip");
  await page.waitForFunction((priorId) => {
    const turns = document.querySelectorAll("#askSpineMount .as-turn");
    if (!turns.length) return false;
    const last = turns[turns.length - 1];
    return Number(last.getAttribute("data-as-turn") || 0) > priorId && !!last.querySelector("[data-as]");
  }, priorChipTurn, { timeout: 10000 });
  ok(`${name}: quick question uses the same POST endpoint`, requests.length === beforeChip + 1 && requests[requests.length - 1].body.question === "What needs attention?");

  const beforeFailure = await page.locator("#askSpineMount .as-turn").count();
  const failure = await ask(page, "Trigger a transport failure.", false);
  ok(`${name}: transport failure is explicit`, failure.outcome === "request_failed");
  ok(`${name}: failure creates a new distinguishable turn`, await page.locator("#askSpineMount .as-turn").count() === beforeFailure + 1);
  ok(`${name}: prior good answer survives later failure`, (await page.locator("#askSpineMount").textContent()).includes(LEASING_ANSWER));
  ok(`${name}: failure offers retry`, await page.locator("#askSpineMount .as-turn").last().locator(".as-retry").count() === 1);

  ok(`${name}: every question used the canonical Ask Spine route`, requests.every((r) => new URL(r.url).pathname === "/operator/ask-spine/ask"));
  ok(`${name}: every request used the same staff session`, requests.every((r) => r.headers["x-staff-session"] === TOKEN));
  ok(`${name}: no operator key was added`, requests.every((r) => !("x-operator-key" in r.headers)));
  ok(`${name}: browser sent no property or module authority`, requests.every((r) => Object.keys(r.body).length === 1 && typeof r.body.question === "string"));
  ok(`${name}: composer has no horizontal overflow`, await page.locator("#askSpineMount .as-box").evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
  ok(`${name}: no uncaught page errors`, pageErrors.length === 0, pageErrors.join(" | "));

  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  await context.close();
}

(async () => {
  console.log("\nASK SPINE DASHBOARD CONVERGENCE — REAL BROWSER\n");
  const server = staticServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const executablePath = [
    chromium.executablePath(),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].find((candidate) => candidate && fs.existsSync(candidate));
  if (!executablePath) throw new Error("No Chromium-compatible browser is installed for this proof.");
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    await runViewport(browser, port, { width: 1180, height: 900 }, "desktop");
    await runViewport(browser, port, { width: 390, height: 844 }, "phone");
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(`\nBROWSER RUNG · ${passed} passed · ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((error) => {
  console.error("DIED: " + (error && error.stack || error));
  process.exit(1);
});
