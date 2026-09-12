"use strict";
// Actual Deal Setup functions in Chromium; synthetic HTTP responses, no API/DB.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { chromium } = require(process.env.E2E_API_ROOT
  ? path.join(process.env.E2E_API_ROOT, "node_modules/playwright") : "playwright");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const start = html.indexOf("var _ds =");
const end = html.indexOf("// ── Show / hide the panel", start);
assert.ok(start > 0 && end > start);
const source = html.slice(start, end);
const bytes = Buffer.from("Unit,Resident\n101,Synthetic Applicant\n");
const hash = crypto.createHash("sha256").update(bytes).digest("hex");
const property = id => ({ id, name: "Same property name", address: id === "p-a" ? "101 First St" : "202 Second St" });
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log("PASS " + name); }
async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1080, height: 850 } });
  const page = await context.newPage();
  const state = { available: [property("p-a"), property("p-b")], members: {}, error: null, malformed: false, attachError: null, already: false, downloadError: null, content: bytes, delay: null };
  const calls = [], downloads = [];
  page.on("download", download => downloads.push(download));
  page.setDefaultTimeout(5000);
  const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/*", async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.hostname !== "deal-proof.invalid") return route.abort();
    if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<body><div id="dealSetupPanel"><div id="dsFeedback"></div><div id="dsContent"></div></div><div id="propSwitcher"></div></body>' });
    const call = { path: url.pathname, method: req.method(), body: req.postDataJSON(), headers: req.headers(), url: req.url() };
    calls.push(call);
    if (state.delay && state.delay.match(call)) { const delay = state.delay; state.delay = null; delay.entered = true; await new Promise(resolve => { delay.release = resolve; }); }
    const parts = url.pathname.split("/");
    if (url.pathname.endsWith("/available-properties")) {
      if (state.error) return reply(route, { receipt: "Synthetic list refusal" }, state.error);
      if (state.malformed) return reply(route, { properties: null });
      return reply(route, { properties: state.available.filter(p => !(state.members[parts[3]] || []).some(x => x.id === p.id)) });
    }
    if (call.method === "POST" && url.pathname.endsWith("/properties")) {
      if (state.attachError) return reply(route, { receipt: "This property belongs to a different client." }, state.attachError);
      const selected = property(call.body.property_id);
      state.members[parts[3]] = [selected];
      return reply(route, { property: selected, already_member: state.already, receipt: state.already ? "This property is already part of this deal." : "Existing property added." }, 201);
    }
    if (call.method === "POST" && url.pathname.endsWith("/properties/new")) {
      const created = { id: "new-property", name: call.body.name, address: call.body.address };
      state.members[parts[3]] = [created]; return reply(route, { property: created, receipt: "New property created." }, 201);
    }
    if (call.method === "GET" && /^\/deal-setup\/deals\/[^/]+$/.test(url.pathname)) return reply(route, { deal: { id: parts[3], deal_name: "Deal " + parts[3] }, properties: state.members[parts[3]] || [] });
    if (url.pathname === "/deal-setup/activations/activation-a") return reply(route, { activation: { id: "activation-a", source_artifact_id: "retained-a" }, deal: { id: "a", deal_name: "Deal a" }, property: property("p-a"), source: { filename: "Original rent roll.csv", byte_size: bytes.length, sha256: hash, as_of: "2026-09-12" }, proposals: [], counts: {}, review_counts: {} });
    if (url.pathname === "/deal-setup/source/retained-a/download") {
      if (state.downloadError) return reply(route, { receipt: "That file's property is not currently on a deal you can open." }, state.downloadError);
      return route.fulfill({ status: 200, contentType: "text/csv", body: state.content, headers: { "content-disposition": 'attachment; filename="server.csv"', "cache-control": "no-store" } });
    }
    if (url.pathname === "/deal-setup/deals") return reply(route, { deals: [] });
    if (url.pathname === "/deal-setup/organizations") return reply(route, { organizations: [], must_choose: false });
    return reply(route, { receipt: "Unexpected proof request" }, 404);
  });
  const waitDelay = async delay => { for (let i = 0; i < 100 && !delay.entered; i++) await new Promise(r => setTimeout(r, 10)); assert.ok(delay.entered); };
  const startDelay = match => { const delay = { match, entered: false }; state.delay = delay; return delay; };
  const open = id => page.evaluate(id => dsOpenDeal(id), id);
  const select = async id => { await page.locator("#dsExistingProperty").selectOption(id); };
  const posts = () => calls.filter(c => c.method === "POST");
  const setup = () => page.evaluate(() => dsLoadSetup("activation-a"));
  try {
    await page.goto("https://deal-proof.invalid/");
    await page.evaluate(() => {
      window.staffToken = "synthetic-staff-session-a";
      window.headers = extra => Object.assign({ "x-staff-session": staffToken }, extra || {});
      window._apiBase = "https://deal-proof.invalid";
      window.createdBlobs = []; window.revokedBlobs = [];
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = blob => { const url = create(blob); createdBlobs.push(url); return url; };
      URL.revokeObjectURL = url => { revokedBlobs.push(url); return revoke(url); };
    });
    await page.addScriptTag({ content: source });
    await check("canonical list is read for the opened deal; name/address choices have no default", async () => {
      await open("a");
      assert.equal(await page.locator("#dsExistingProperty").inputValue(), "");
      assert.match(await page.locator("#dsExistingProperty").innerText(), /101 First St/);
      assert.match(await page.locator("#dsExistingProperty").innerText(), /202 Second St/);
      assert.equal(await page.locator("#dsAttachExisting").isDisabled(), true);
      assert.equal(posts().length, 0);
    });
    await check("existing selection and new creation remain separate", async () => {
      assert.equal(await page.getByRole("heading", { name: "Create a new property" }).count(), 1);
      assert.equal(await page.getByRole("button", { name: "Create property and add to deal" }).count(), 1);
      assert.equal(await page.locator("#dsPropName").count(), 1);
    });
    await check("unlisted identity cannot be posted by a stale/injected selection", async () => {
      await page.evaluate(() => { _ds.existingSelection = "foreign"; return dsAttachExistingProperty(); });
      assert.equal(posts().length, 0);
      assert.match(await page.locator("#dsFeedback").innerText(), /current existing-property list/);
    });
    await check("chosen durable identity is attached once with staff header and canonical re-read", async () => {
      await select("p-b");
      await page.getByRole("button", { name: "Add existing property to this deal", exact: true }).click();
      await page.waitForFunction(() => _ds.properties.some(p => p.id === "p-b") && _ds.available.state === "ready");
      assert.deepEqual(posts()[0].body, { property_id: "p-b" });
      assert.equal(posts()[0].path, "/deal-setup/deals/a/properties");
      assert.equal(posts()[0].headers["x-staff-session"], "synthetic-staff-session-a");
      assert.equal(posts()[0].url.includes("synthetic"), false);
      assert.equal(await page.locator('#dsExistingProperty option[value="p-b"]').count(), 0);
    });
    await check("server already-member receipt is accepted then canonical membership reloaded", async () => {
      state.members.a = []; state.already = true; await open("a"); await select("p-a");
      await page.evaluate(() => dsAttachExistingProperty());
      assert.match(await page.locator("#dsFeedback").innerText(), /already part/);
      assert.equal(await page.locator('#dsExistingProperty option[value="p-a"]').count(), 0);
      state.already = false;
    });
    await check("server attachment refusal stays visible and keeps the chosen property", async () => {
      state.members.a = []; state.attachError = 403; await open("a"); await select("p-a");
      await page.evaluate(() => dsAttachExistingProperty());
      assert.match(await page.locator("#dsFeedback").innerText(), /different client/);
      assert.equal(await page.locator("#dsExistingProperty").inputValue(), "p-a");
      state.attachError = null;
    });
    await check("empty eligible list is an explicit answer, not failed read", async () => {
      state.available = []; await open("a");
      assert.match(await page.locator("#dsExistingPropertyArea").innerText(), /No eligible existing properties/);
      assert.equal(await page.locator("#dsExistingProperty").count(), 0);
    });
    for (const [status, label] of [[401, "Sign in required"], [403, "Access required"], [500, "Existing properties unavailable"]]) await check("list HTTP " + status + " stays distinct from empty", async () => {
      state.error = status; await open("a");
      assert.match(await page.locator("#dsExistingPropertyArea").innerText(), new RegExp(label));
      assert.doesNotMatch(await page.locator("#dsExistingPropertyArea").innerText(), /No eligible/);
    });
    await check("malformed list does not become empty; retry recovers", async () => {
      state.error = null; state.malformed = true; await open("a");
      assert.match(await page.locator("#dsExistingPropertyArea").innerText(), /could not be verified/);
      state.malformed = false; state.available = [property("p-a"), property("p-b")];
      await page.getByRole("button", { name: "Retry existing properties" }).click();
      await page.locator("#dsExistingProperty").waitFor();
    });
    await check("late old-deal read cannot replace the new deal", async () => {
      const delay = startDelay(c => c.path === "/deal-setup/deals/a");
      const pending = open("a"); await waitDelay(delay); await open("b"); delay.release(); await pending;
      assert.equal(await page.getByRole("heading", { name: "Deal b", exact: true }).count(), 1);
    });
    await check("late eligible-property response cannot render on another deal", async () => {
      const delay = startDelay(c => c.path === "/deal-setup/deals/a/available-properties");
      const pending = open("a"); await waitDelay(delay); await open("b"); delay.release(); await pending;
      assert.equal(await page.evaluate(() => _ds.deal.id), "b");
      await select("p-b"); assert.equal(await page.evaluate(() => _ds.existingSelection), "p-b");
    });
    await check("double attachment click posts once; late receipt cannot switch deals", async () => {
      await open("a"); await select("p-b");
      const delay = startDelay(c => c.method === "POST"); const before = posts().length;
      const pending = page.evaluate(() => dsAttachExistingProperty()); await waitDelay(delay);
      await page.evaluate(() => dsAttachExistingProperty()); assert.equal(posts().length, before + 1);
      await open("b"); delay.release(); await pending;
      assert.equal(await page.evaluate(() => _ds.deal.id), "b");
    });
    await check("changed session cannot use an old selection even with the same visible property", async () => {
      state.members.a = []; await open("a"); await select("p-a"); const before = posts().length;
      await page.evaluate(() => { staffToken = "synthetic-staff-session-b"; return dsAttachExistingProperty(); });
      assert.equal(posts().length, before); assert.match(await page.locator("#dsFeedback").innerText(), /session changed/);
    });
    await check("new-property form still uses its existing canonical creation command", async () => {
      await open("new-deal"); await page.locator("#dsPropName").fill("New property");
      await page.locator("#dsPropAddr").fill("303 Third St"); await page.locator("#dsPropBasis").selectOption("bed");
      await page.getByRole("button", { name: "Create property and add to deal", exact: true }).click();
      await page.waitForFunction(() => _ds.properties.some(p => p.id === "new-property") && _ds.available.state === "ready");
      const call = posts().at(-1); assert.equal(call.path, "/deal-setup/deals/new-deal/properties/new");
      assert.deepEqual(call.body, { name: "New property", address: "303 Third St", leasing_basis: "bed" });
    });
    await check("closing the panel discards a pending eligible list", async () => {
      const delay = startDelay(c => c.path.endsWith("/available-properties")); const pending = open("a");
      await waitDelay(delay); await page.evaluate(() => dsHide()); delay.release(); await pending;
      assert.equal(await page.evaluate(() => _ds.available), null);
    });
    await check("retained source button names only the canonical activation artifact", async () => {
      await setup(); assert.equal(await page.locator("#dsSourceDownload").count(), 1);
      assert.equal(await page.locator("a[href*='download']").count(), 0);
    });
    await check("source download uses staff headers and matches retained bytes/hash/filename", async () => {
      const downloaded = page.waitForEvent("download"); await page.evaluate(() => dsDownloadSource());
      const download = await downloaded; assert.equal(download.suggestedFilename(), "Original rent roll.csv");
      const chunks = []; for await (const chunk of await download.createReadStream()) chunks.push(chunk);
      assert.deepEqual(Buffer.concat(chunks), bytes);
      const call = calls.filter(c => c.path.includes("/source/")).at(-1);
      assert.equal(call.path, "/deal-setup/source/retained-a/download");
      assert.equal(call.headers["x-staff-session"], "synthetic-staff-session-b"); assert.equal(call.url.includes("?"), false);
    });
    await check("download blob URL is cleaned after handoff", async () => {
      await page.waitForFunction(() => createdBlobs.length === revokedBlobs.length);
      assert.equal(await page.evaluate(() => createdBlobs.length), 1);
    });
    await check("same-size different bytes are refused without a download", async () => {
      state.content = Buffer.alloc(bytes.length, 120); const before = downloads.length;
      await page.evaluate(() => dsDownloadSource());
      assert.match(await page.locator("#dsFeedback").innerText(), /does not match the retained source/);
      assert.equal(downloads.length, before);
    });
    await check("truncated bytes are refused without a download", async () => {
      state.content = Buffer.from("short"); await page.evaluate(() => dsDownloadSource());
      assert.match(await page.locator("#dsFeedback").innerText(), /source size/);
    });
    await check("source authorization refusal remains a visible server receipt", async () => {
      state.content = bytes; state.downloadError = 403; await page.evaluate(() => dsDownloadSource());
      assert.match(await page.locator("#dsFeedback").innerText(), /not currently on a deal you can open/);
      assert.equal(await page.locator("#dsSourceDownload").isDisabled(), false); state.downloadError = null;
    });
    await check("late source response after navigation creates no blob or download", async () => {
      const delay = startDelay(c => c.path.includes("/source/")); const before = downloads.length;
      const pending = page.evaluate(() => dsDownloadSource()); await waitDelay(delay); await open("b"); delay.release(); await pending;
      assert.equal(downloads.length, before); assert.equal(await page.evaluate(() => createdBlobs.length), 1);
    });
    await check("missing retained identity provides no invented download route", async () => {
      await setup(); await page.evaluate(() => { _ds.setup.activation.source_artifact_id = null; dsRender(); });
      assert.equal(await page.locator("#dsSourceDownload").count(), 0); const before = calls.length;
      await page.evaluate(() => dsDownloadSource()); assert.equal(calls.length, before);
    });
    await check("old-session download action cannot retrieve the prior source", async () => {
      await setup(); const before = calls.length;
      await page.evaluate(() => { staffToken = "synthetic-staff-session-c"; return dsDownloadSource(); });
      assert.equal(calls.length, before); assert.match(await page.locator("#dsFeedback").innerText(), /session changed/);
    });
    console.log(`${passed}/${passed} Deal Setup access component checks; synthetic HTTP, no DB/provider.`);
  } finally { await context.close(); await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
