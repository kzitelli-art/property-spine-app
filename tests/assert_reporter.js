"use strict";
// Count completed assertion calls, not source statements or claimed test cases.
const native = require("node:assert/strict");
let passed = 0, failed = 0, pending = 0;
const methods = new Map();
function call(fn, args) {
  let result;
  try { result = Reflect.apply(fn, native, args); }
  catch (error) { failed++; throw error; }
  if (result && typeof result.then === "function") {
    pending++;
    return result.then(value => { pending--; passed++; return value; }, error => { pending--; failed++; throw error; });
  }
  passed++;
  return result;
}
process.once("exit", () => {
  if (pending || passed + failed === 0) {
    console.error(`Assertion report unavailable: ${pending} unfinished; ${passed + failed} completed.`);
    process.exitCode = process.exitCode || 1;
    return;
  }
  console.log(`\nassertions passed: ${passed}\nassertions failed: ${failed}`);
  if (failed) process.exitCode = process.exitCode || 1;
});
module.exports = new Proxy(native, {
  apply(target, self, args) { return call(target, args); },
  get(target, key) {
    const value = Reflect.get(target, key);
    if (typeof value !== "function" || key === "AssertionError" || key === "CallTracker") return value;
    if (!methods.has(key)) methods.set(key, (...args) => call(value, args));
    return methods.get(key);
  },
});
