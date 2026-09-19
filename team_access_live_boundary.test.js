#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const loadTeam = source.slice(source.indexOf("async function loadTeam"), source.indexOf("function teamAccessList"));
const invite = source.slice(source.indexOf("async function inviteTeamMember"), source.indexOf("function surfaceRole"));

assert.match(loadTeam, /if\(!hasStaffSession\(\)\) return null/);
assert.match(loadTeam, /__psLive\.loadResource\('teamRoster'/);
assert.doesNotMatch(loadTeam, /getJSON|__OFFLINE_MODE|__offlineRespond/);
assert.doesNotMatch(loadTeam, /if\(!key\(\)\)/);
assert.match(invite, /if\(!hasStaffSession\(\)\)/);
assert.match(invite, /__psLive\.createTeamInvite/);
assert.match(invite, /roleKey:preset\.key/);
assert.match(invite, /existing_person_confirmation_required/);
assert.match(invite, /window\.confirm/);
assert.doesNotMatch(invite, /getJSON|__OFFLINE_MODE|Demo invite staged|saveTeamAccessList|if\(key\(\)\)/);
assert.match(source, /teamRoster:\s*\{[\s\S]{0,300}\/properties\/.*\/team/);
assert.match(source, /createTeamInvite:\s*\{[\s\S]{0,500}\/team-invites/);
assert.match(source, /createTeamInvite: function\(params\)\{ return writeAction\('createTeamInvite'/);
assert.doesNotMatch(source, /id="invite_email"|id="invite_scope"|id="invite_title"|inviteModuleChecks/);

const loaderStart = source.indexOf("function createLiveLoader");
const loaderEnd = source.indexOf("/* ── PINNED PRODUCTION ORIGIN", loaderStart);
const calls = [];
const context = vm.createContext({
  URL,
  crypto: require("crypto").webcrypto,
  encodeURIComponent,
  sessionStorage: { setItem() {}, getItem() { return null; }, removeItem() {} }
});
vm.runInContext(
  source.slice(loaderStart, loaderEnd) +
    "\nthis.createLiveLoader=createLiveLoader;this.PRODUCTION_LIVE_RESOURCES=PRODUCTION_LIVE_RESOURCES;",
  context
);

const fakeFetch = async (url, options) => {
  calls.push({ url, options });
  const payload = options.method === "POST"
    ? { status: "pending", delivery: "sms_sent" }
    : { team: [], pending_invites: [] };
  return { ok: true, status: 200, text: async () => JSON.stringify(payload) };
};
const client = context.createLiveLoader({
  origin: "https://live.test",
  fetchImpl: fakeFetch,
  resources: context.PRODUCTION_LIVE_RESOURCES,
  __testMode: true
});
client.__testSetToken("staff-session-proof", { property_id: "skyline-proof" });

(async () => {
  await client.loadResource("teamRoster", { propertyId: "skyline-proof" });
  await client.createTeamInvite({
    propertyId: "skyline-proof",
    invitedName: "Existing Person",
    phoneNumber: "+15550000000",
    roleKey: "leasing",
    personId: "person-proof"
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://live.test/properties/skyline-proof/team");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers["x-staff-session"], "staff-session-proof");
  assert.equal(calls[1].url, "https://live.test/properties/skyline-proof/team-invites");
  assert.equal(calls[1].options.method, "POST");
  assert.equal(calls[1].options.headers["x-staff-session"], "staff-session-proof");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    invited_name: "Existing Person",
    phone_number: "+15550000000",
    role_key: "leasing",
    scope_type: "property",
    person_id: "person-proof"
  });

  console.log("PASS Team uses the sealed signed-in route and cannot fall into the historical snapshot.");
  console.log("1 passed, 0 failed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
