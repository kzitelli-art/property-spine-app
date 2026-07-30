"use strict";

// PROPERTY SPINE — FINAL READINESS WALK AND CERTIFICATION (BUILD 4)
//
// Two surfaces: the readiness queue, and the walk itself.
//
// ── LIVE-ONLY, BY CONSTRUCTION ──────────────────────────────────────
// Every call goes through window.__psLive to the pinned production origin with
// the staff-session header. Never demoRespond(). No session → a sign-in notice
// and nothing else.
//
// ── THIS SURFACE CANNOT MAKE A UNIT READY ───────────────────────────
// It collects confirmations and sends them. The SERVER decides whether the
// walk was authorized, whether every required area was affirmed, and whether a
// certification may be written. Nothing here computes readiness, and an
// "actionable" unit in the queue means a human may go and LOOK — the copy says
// so, because that is the exact confusion this whole sequence exists to
// prevent.
//
// ── AND READY IS NOT MARKETABLE ─────────────────────────────────────
// The receipt renders the server's marketability verdict separately, including
// the remaining blocker when there is one. A certified unit sitting behind a
// down flag or a successor commitment must never read as available.
(function () {
  if (window.__psReadinessDoorV1) return;
  window.__psReadinessDoorV1 = true;

  var AREAS = [];
  var state = { queue: null, unitId: null, gate: null, confirm: {}, note: "",
                findings: "", busy: false, error: null, receipt: null, mode: null };

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function authorized() {
    try {
      return window.__OFFLINE_MODE !== true && window.__psLive &&
        typeof window.__psLive.hasSession === "function" && window.__psLive.hasSession();
    } catch (_) { return false; }
  }
  function signedOut(w) {
    return '<div class="ut-empty"><strong>Not signed in.</strong> ' + esc(w) +
      ' is a live operator surface and has no offline view. Sign in to load it.</div>';
  }
  function errorNotice(e) {
    var msg = (e && (e.publicMessage || e.message)) || "The live call failed.";
    return '<div class="ut-error"><strong>Could not complete.</strong> ' + esc(msg) +
      '<div class="ut-note">Nothing has been certified.</div></div>';
  }
  function line(k, v) {
    return '<div class="ut-row"><span class="ut-lbl">' + esc(k) + '</span><span>' + esc(v == null ? "—" : v) + "</span></div>";
  }
  function list(a) {
    return '<ul class="ut-ul">' + (a || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  }

  async function loadQueue() {
    if (!authorized()) return;
    try {
      var out = await window.__psLive.readinessQueue();
      state.queue = (out && out.data) || null;
    } catch (e) { state.queue = { __error: e }; }
  }

  async function loadUnit(unitId) {
    state.busy = true; state.error = null; state.receipt = null; render();
    try {
      var out = await window.__psLive.unitReadiness({ unitId: unitId });
      state.gate = (out && out.data) || null;
      state.unitId = unitId;
      AREAS = (state.gate && state.gate.confirmation_areas) || [];
      state.confirm = {};
    } catch (e) { state.error = e; state.gate = null; }
    finally { state.busy = false; render(); }
  }

  async function walk(outcome) {
    state.busy = true; state.error = null; render();
    try {
      var out = await window.__psLive.readinessWalk({
        unitId: state.unitId, outcome: outcome,
        confirmations: state.confirm, note: state.note || null,
        findings_text: outcome === "not_ready" ? (state.findings || "") : "",
      });
      state.receipt = (out && out.data && out.data.receipt) || null;
      await Promise.all([loadQueue(), loadUnit(state.unitId)]);
    } catch (e) { state.error = e; }
    finally { state.busy = false; render(); }
  }

  function renderQueue() {
    if (!authorized()) return signedOut("The readiness queue");
    var d = state.queue;
    if (!d) return "";
    if (d.__error) return errorNotice(d.__error);
    var h = '<div class="ut-card"><div class="ut-h">Final readiness queue</div>';
    h += '<div class="ut-unk">' + esc(d.meaning || "") + "</div>";
    if (!d.actionable_count) {
      h += '<div class="ut-empty">No unit is ready to walk right now.</div>';
    } else {
      (d.actionable || []).forEach(function (u) {
        h += '<div class="ut-item"><strong>Unit ' + esc(u.unit_number || u.unit_id) + "</strong>" +
          '<button class="ut-x rd-open" data-id="' + esc(u.unit_id) + '">Walk it</button></div>';
      });
    }
    if ((d.blocked || []).length) {
      h += '<div class="ut-h2">Not yet walkable</div>';
      (d.blocked || []).forEach(function (u) {
        h += '<div class="ut-item ut-off"><strong>Unit ' + esc(u.unit_number || u.unit_id) + "</strong>" +
          '<span class="ut-ev">' + esc(u.controlling_blocker ? u.controlling_blocker.detail : "") + "</span></div>";
      });
    }
    if ((d.certified || []).length) {
      h += '<div class="ut-h2">Certified</div>';
      (d.certified || []).forEach(function (u) {
        h += '<div class="ut-item"><strong>Unit ' + esc(u.unit_number || u.unit_id) + '</strong>' +
          '<span class="ut-ev">certified ' + esc(String(u.certification.certified_at).slice(0, 10)) + "</span></div>";
      });
    }
    return h + "</div>";
  }

  function renderWalk() {
    if (!authorized()) return signedOut("The final readiness walk");
    var h = '<div class="ut-card"><div class="ut-h">Final readiness walk</div>';
    h += '<input id="rdUnit" class="ut-in" placeholder="Unit id" value="' + esc(state.unitId || "") + '">';
    h += '<button id="rdLoad" class="ut-btn"' + (state.busy ? " disabled" : "") + ">Load unit</button>";
    if (state.error) h += errorNotice(state.error);

    var g = state.gate;
    if (g) {
      if (g.certification) {
        h += '<div class="ut-receipt"><div class="ut-h2">Already certified</div>' +
          line("Certified at", String(g.certification.certified_at).slice(0, 16).replace("T", " ")) +
          (g.marketability ? line("Marketability", g.marketability.marketing_state) : "") +
          (g.marketability && !g.marketability.marketable_now
            ? '<div class="ut-unk">Physically ready but NOT currently marketable. Reason: ' +
              esc(g.marketability.blocking_label) + "</div>" : "") +
          "</div>";
      } else if (!g.gate.actionable) {
        h += '<div class="ut-h2">Cannot walk yet</div>';
        (g.gate.blockers || []).forEach(function (b) {
          h += '<div class="ut-item"><span class="ut-sev">' + esc(b.code) + "</span><span>" + esc(b.detail) + "</span>" +
            ((b.items || []).length ? '<span class="ut-ev">' + esc(b.items.join("; ")) + "</span>" : "") + "</div>";
        });
      } else {
        h += '<div class="ut-unk">' + esc(g.gate.meaning) + "</div>";
        if (g.your_authority && !g.your_authority.authorized) {
          h += '<div class="ut-error">You cannot certify this unit: ' + esc(g.your_authority.reason) + "</div>";
        }
        if (g.senior_accountable) {
          h += line("Senior accountable", g.senior_accountable.user_id || "UNRESOLVED");
          if (!g.senior_accountable.user_id) {
            h += '<div class="ut-unk">' + esc(g.senior_accountable.basis) + "</div>";
          }
        }
        if (g.next_move_in) {
          h += line("Next move-in", g.next_move_in.move_in_date + " — " + g.next_move_in.days_remaining + " days remaining");
        }
        h += '<div class="ut-h2">Confirm</div>';
        AREAS.forEach(function (a) {
          h += '<div class="ut-row"><span class="ut-lbl">' + esc(a.label) +
            (a.required ? "" : " (if applicable)") + "</span>" +
            '<input type="checkbox" class="rd-area" data-key="' + esc(a.key) + '"' +
            (state.confirm[a.key] ? " checked" : "") + "></div>";
        });
        h += '<input id="rdNote" class="ut-in" placeholder="Note (optional)" value="' + esc(state.note) + '">';
        h += '<div class="ut-unk">Photos are optional. This is not a photo checklist.</div>';
        h += '<button id="rdReady" class="ut-btn ut-primary"' + (state.busy ? " disabled" : "") + ">Certify physically ready</button>";
        h += '<div class="ut-h2">Or report what you found</div>';
        h += '<textarea id="rdFindings" class="ut-ta" rows="2" placeholder="e.g. Bedroom outlet still loose, hall paint missed a patch">' + esc(state.findings) + "</textarea>";
        h += '<button id="rdNotReady" class="ut-btn"' + (state.busy ? " disabled" : "") + ">Not ready — create the work</button>";
      }
    }

    if (state.receipt) {
      var r = state.receipt;
      h += '<div class="ut-receipt"><div class="ut-h2">' + esc(r.headline || "Recorded") + "</div>";
      if (r.certified_by) {
        h += line("Certified by", r.certified_by) + line("Walked by", r.walked_by);
        if (r.walked_by_differs) h += '<div class="ut-unk">The walk and the certification were performed by different people. Both are recorded.</div>';
        h += line("Senior accountable", r.senior_accountable) + line("Time", String(r.time).slice(0, 16).replace("T", " "));
        if (r.next_move_in) h += line("Next move-in", r.next_move_in);
        h += line("Marketability", r.marketability);
        if (r.remaining_blocker) h += line("Remaining blocker", r.remaining_blocker);
        h += '<div class="ut-unk"><strong>' + esc(r.summary) + "</strong></div>";
      } else {
        if ((r.what_was_found || []).length) { h += '<div class="ut-h3">What was found</div>' + list(r.what_was_found); }
        if ((r.new_work || []).length) { h += '<div class="ut-h3">New work</div>' + list(r.new_work); }
        if ((r.reopened_work || []).length) { h += '<div class="ut-h3">Reopened</div>' + list(r.reopened_work); }
        if (r.recleaning) h += '<div class="ut-unk">' + esc(r.recleaning) + "</div>";
        if (r.controlling_next_action) h += '<div class="ut-next"><strong>Next:</strong> ' + esc(r.controlling_next_action) + "</div>";
        if (r.move_in_risk) h += line("Move-in risk", r.move_in_risk);
        if (r.accountable_owner) h += line("Accountable owner", r.accountable_owner);
      }
      if (r.meaning) h += '<div class="ut-unk">' + esc(r.meaning) + "</div>";
      h += "</div>";
    }
    return h + "</div>";
  }

  function render() {
    var q = document.getElementById("psReadinessQueue");
    var w = document.getElementById("psReadinessWalk");
    if (q) q.innerHTML = renderQueue();
    if (w) w.innerHTML = renderWalk();
    wire();
  }

  function each(s, f) { Array.prototype.forEach.call(document.querySelectorAll(s), f); }

  function wire() {
    var lb = document.getElementById("rdLoad");
    if (lb) lb.onclick = function () {
      var u = (document.getElementById("rdUnit") || {}).value;
      if (!u) { state.error = { message: "Enter a unit id." }; render(); return; }
      loadUnit(String(u).trim());
    };
    each(".rd-open", function (b) { b.onclick = function () { loadUnit(b.getAttribute("data-id")); }; });
    each(".rd-area", function (c) {
      c.onchange = function () { state.confirm[c.getAttribute("data-key")] = c.checked; };
    });
    var n = document.getElementById("rdNote"); if (n) n.oninput = function () { state.note = n.value; };
    var f = document.getElementById("rdFindings"); if (f) f.oninput = function () { state.findings = f.value; };
    var yes = document.getElementById("rdReady"); if (yes) yes.onclick = function () { walk("ready"); };
    var no = document.getElementById("rdNotReady"); if (no) no.onclick = function () { walk("not_ready"); };
  }

  async function boot() { if (!authorized()) { render(); return; } await loadQueue(); render(); }
  window.__psReadiness = { boot: boot, render: render, loadUnit: loadUnit, _state: state };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
