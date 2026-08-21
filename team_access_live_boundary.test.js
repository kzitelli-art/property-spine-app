#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const loadTeam = source.slice(source.indexOf("async function loadTeam"), source.indexOf("function teamAccessList"));
const invite = source.slice(source.indexOf("async function inviteTeamMember"), source.indexOf("function surfaceRole"));

assert.match(loadTeam, /if\(!hasStaffSession\(\)\) return null/);
assert.match(loadTeam, /\/properties\/\$\{prop\(\)\}\/team/);
assert.doesNotMatch(loadTeam, /if\(!key\(\)\)/);
assert.match(invite, /if\(!hasStaffSession\(\)\)/);
assert.match(invite, /\/team-invites/);
assert.match(invite, /role_key:preset\.key/);
assert.match(invite, /existing_person_confirmation_required/);
assert.match(invite, /window\.confirm/);
assert.doesNotMatch(invite, /Demo invite staged|saveTeamAccessList|if\(key\(\)\)/);
assert.doesNotMatch(source, /id="invite_email"|id="invite_scope"|id="invite_title"|inviteModuleChecks/);

console.log("PASS Team uses the signed-in live route and cannot manufacture a local invite.");
console.log("1 passed, 0 failed");
