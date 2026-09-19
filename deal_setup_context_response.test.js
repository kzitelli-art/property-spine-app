"use strict";

const fs = require("node:fs");
const assert = require("./tests/assert_reporter");
const html = fs.readFileSync("index.html", "utf8");

function assignment(name, nextName) {
  const start = html.indexOf(`window.${name} = async function`);
  const end = html.indexOf(`window.${nextName}`, start);
  assert.notEqual(start, -1, `${name} exists`);
  assert.notEqual(end, -1, `${nextName} follows ${name}`);
  return html.slice(start, end);
}

const source = assignment("dsConfirmRow", "dsDismissRow")
  + assignment("dsResolveResident", "dsConfirmAllReady");

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness() {
  let version = 1;
  let scope = "property-a";
  const pending = deferred();
  const calls = { loads: [], toasts: [], requests: [] };
  const state = { setup: { activation: { id: "activation-a" } } };
  const window = {};
  const dsCapture = () => ({ version, scope });
  const dsCurrent = request => request.version === version && request.scope === scope;
  const dsContextCurrent = () => true;
  const dsFetch = async (...args) => { calls.requests.push(args); return pending.promise; };
  const dsLoadSetup = async id => { calls.loads.push(id); };
  const dsToast = (...args) => { calls.toasts.push(args); };
  new Function("window", "_ds", "dsCapture", "dsCurrent", "dsContextCurrent", "dsFetch", "dsLoadSetup", "dsToast", source)(
    window, state, dsCapture, dsCurrent, dsContextCurrent, dsFetch, dsLoadSetup, dsToast,
  );
  return {
    window, calls, pending,
    activeActivation: () => state.setup.activation.id,
    switchSetup() {
      version++;
      scope = "property-b";
      state.setup = { activation: { id: "activation-b" } };
    },
  };
}

(async () => {
  for (const [label, invoke, reject] of [
    ["confirm success", h => h.window.dsConfirmRow("proposal-a"), false],
    ["confirm refusal", h => h.window.dsConfirmRow("proposal-a"), true],
    ["resident resolution success", h => h.window.dsResolveResident("proposal-a", "created", null), false],
    ["resident resolution refusal", h => h.window.dsResolveResident("proposal-a", "created", null), true],
  ]) {
    const h = harness();
    const result = invoke(h);
    h.switchSetup();
    if (reject) h.pending.reject(new Error("governed refusal"));
    else h.pending.resolve({ receipt: "accepted for activation A" });
    await result;
    assert.deepEqual(h.calls.loads, [], `${label}: a late response cannot reload the newly opened activation`);
    assert.deepEqual(h.calls.toasts, [], `${label}: a late response cannot toast into the newly opened property`);
    assert.equal(h.activeActivation(), "activation-b", `${label}: the newly opened setup state remains intact`);
  }

  const currentSuccess = harness();
  const success = currentSuccess.window.dsConfirmRow("proposal-a");
  currentSuccess.pending.resolve({ receipt: "added" });
  await success;
  assert.deepEqual(currentSuccess.calls.loads, ["activation-a"], "current confirmation reloads its captured activation");
  assert.deepEqual(currentSuccess.calls.toasts, [["ok", "added"]], "current confirmation keeps its receipt");

  const currentRefusal = harness();
  const refusal = currentRefusal.window.dsConfirmRow("proposal-a");
  currentRefusal.pending.reject(new Error("governed refusal"));
  await refusal;
  assert.deepEqual(currentRefusal.calls.loads, ["activation-a"], "current refusal reloads its captured activation for the server-authored row state");
  assert.deepEqual(currentRefusal.calls.toasts, [["bad", "governed refusal"]], "current refusal remains visible in its own setup");
})().catch(error => { console.error(error); process.exitCode = 1; });
