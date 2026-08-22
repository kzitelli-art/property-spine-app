#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const detail = source.slice(
  source.indexOf("window.saOrgDetail = async function"),
  source.indexOf("window.saSaveOrg = async function")
);
const command = source.slice(
  source.indexOf("window.saActivateOperationsLine = async function"),
  source.indexOf("window.saSaveOrg = async function")
);

assert.match(detail, /org\.operations_line/);
assert.match(detail, /operations_line_outcome/);
assert.match(detail, /Staff Texting/);
assert.match(detail, /Not connected/);
assert.match(detail, /sa-form sa-line-form/);
assert.match(source, /@media\(max-width:700px\)\{\.sa-form,\.sa-line-form\{grid-template-columns:1fr\}/);
assert.match(detail, /Staff only/);
assert.match(detail, /Replies only/);
assert.match(detail, /saActivateOperationsLine/);

assert.match(command, /window\.confirm/);
assert.ok(command.indexOf("window.confirm") < command.indexOf("saFetch('POST'"));
assert.match(command, /\/admin\/organizations\/'\+orgId\+'\/operations-line/);
assert.match(command, /phone_number:phone/);
assert.match(command, /saOrgDetail\(orgId\)/);
assert.doesNotMatch(command, /OPERATOR_KEY|getJSON|__OFFLINE_MODE|properties\/.*sms/);

console.log("PASS Organization Staff Texting uses the governed first-activation command.");
console.log("1 passed, 0 failed");
