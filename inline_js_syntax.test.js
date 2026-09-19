/* Parse every inline script in the shipped page with Node's real parser. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("./tests/assert_reporter");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const scripts = [];
const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
while ((match = re.exec(html))) scripts.push(match[1]);
assert.ok(scripts.length, "Inline scripts must exist");
scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source, { filename: `index.html:inline-script-${index + 1}.js` }), `inline script ${index + 1} parses`));
console.log(`parsed ${scripts.length} inline script blocks`);
