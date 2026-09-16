"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

assert.match(html, /Keep existing \(new users become members\)/,
  "the provisioning form explains the API's preserve-existing default");
assert.match(html, /if\(platform_role\) body\.platform_role=platform_role/,
  "the form omits platform_role when the operator chooses the safe default");
assert.doesNotMatch(html, /saInvPlatformRole[^\n]{0,200}value\|\|'member'/,
  "the browser cannot silently demote an existing account while adding a property");

console.log("3 passed, 0 failed");
