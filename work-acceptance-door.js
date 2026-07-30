"use strict";

// PROPERTY SPINE — WORK ACCEPTANCE, PROOF AND PROGRESSION (BUILD 3)
//
// One surface: the unit work flow, where each item can be accepted, claimed
// complete with proof, or reopened.
//
// ── LIVE-ONLY, BY CONSTRUCTION ──────────────────────────────────────
// Every call goes through window.__psLive to the pinned production origin with
// the staff-session header. It does NOT pass through demoRespond() / DEMO_DB.
// Without a session this door renders a sign-in message and nothing else.
//
// ── THE THREE DISTINCTIONS THIS SURFACE MUST NOT BLUR ───────────────
// 1. ACCEPTING IS NOT COMPLETING. An accepted item is still outstanding and
//    still blocks whatever follows it. The chip says so.
// 2. A CLAIM WITHOUT PROOF DOES NOT CLOSE. The server records the claim and
//    leaves the work open; this surface shows the shortfall rather than a
//    success state.
// 3. CLOSING WORK IS NOT READINESS. Shown on every close.
//
// The server decides every label, every blocked/actionable verdict, every
// proof requirement and every shortfall. This module renders them.
(function () {
  if (window.__psWorkAcceptanceDoorV1) return;
  window.__psWorkAcceptanceDoorV1 = true;

  var state = { unitId: null, data: null, busy: false, error: null, open: {}, draft: {}, receipt: null };

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
  function errorNotice(e) {
    var msg = (e && (e.publicMessage || e.message)) || "The live read failed.";
    return '<div class="ut-error"><strong>Could not load.</strong> ' + esc(msg) +
      '<div class="ut-note">A read failure is not the absence of a problem — nothing about this work has been shown.</div></div>';
  }
  function line(k, v) {
    return '<div class="ut-row"><span class="ut-lbl">' + esc(k) + '</span><span>' + esc(v == null ? "—" : v) + "</span></div>";
  }
  function list(a) {
    return '<ul class="ut-ul">' + (a || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  }
  function d(id, k) { return (state.draft[id] || {})[k] || ""; }
  function setDraft(id, k, v) { state.draft[id] = state.draft[id] || {}; state.draft[id][k] = v; }

  async function load(unitId) {
    state.busy = true; state.error = null; render();
    try {
      var out = await window.__psLive.unitWorkFlow({ unitId: unitId });
      state.data = (out && out.data) || null; state.unitId = unitId;
    } catch (e) { state.error = e; state.data = null; }
    finally { state.busy = false; render(); }
  }

  async function act(fn) {
    state.busy = true; state.error = null; state.receipt = null; render();
    try {
      var out = await fn();
      state.receipt = (out && out.data && out.data.receipt) || null;
      await load(state.unitId);
    } catch (e) { state.error = e; }
    finally { state.busy = false; render(); }
  }

  function renderItem(w) {
    var req = w.proof_requirement || {};
    var isOpenPanel = !!state.open[w.work_id];
    var h = '<div class="ut-unit">';
    h += '<div class="ut-unit-h"><strong>' + esc(w.work_text) + "</strong>";
    if (w.status === "complete") h += ' <span class="ut-sev">CLOSED</span>';
    else if (w.accepted) h += ' <span class="ut-chip">ACCEPTED — still outstanding</span>';
    if (w.reopened_count > 0) h += ' <span class="ut-sev">REOPENED ×' + w.reopened_count + "</span>";
    h += "</div>";

    h += line("Stage", w.stage || "unstaged");
    h += line("Owner", w.owner_user_id ? "assigned" : "UNASSIGNED");
    if (w.accepted_by_user_id && w.accepted_by_user_id !== w.owner_user_id) {
      h += line("Accepted by", "a different person from the owner");
    }
    h += line("Due", w.due_at ? String(w.due_at).slice(0, 16).replace("T", " ")
      : (w.accepted ? "No date committed" : "—"));
    h += line("Proof needed to close", req.label);

    if (w.latest_outcome === "completed" && w.proof_satisfied === false) {
      h += '<div class="ut-unk"><strong>Claimed complete, NOT closed.</strong> ' + esc(w.proof_shortfall) + "</div>";
    }
    if (w.latest_outcome === "unable_to_complete") {
      h += '<div class="ut-unk">Reported unable to complete. The work is still open.</div>';
    }

    h += '<button class="ut-btn ut-x" data-panel="' + esc(w.work_id) + '">' +
      (isOpenPanel ? "Close" : "Act on this") + "</button>";

    if (isOpenPanel) {
      h += '<div class="ut-confirm">';
      if (w.status === "required" && !w.accepted) {
        h += '<div class="ut-h2">Accept</div>';
        h += '<input class="ut-in wa-due" data-id="' + esc(w.work_id) + '" type="datetime-local" value="' + esc(d(w.work_id, "due")) + '">';
        h += '<div class="ut-unk">Leaving this blank accepts the work with no committed date. That is honest, and it will show as an unresolved commitment when a move-in is near.</div>';
        h += '<button class="ut-btn ut-primary wa-accept" data-id="' + esc(w.work_id) + '">Accept</button>';
      }
      if (w.status === "required") {
        h += '<div class="ut-h2">Report outcome</div>';
        h += '<select class="ut-sel wa-outcome" data-id="' + esc(w.work_id) + '">' +
          '<option value="completed">Completed</option>' +
          '<option value="unable_to_complete">Unable to complete</option>' +
          '<option value="needs_followup">Needs follow-up</option></select>';
        var oc = d(w.work_id, "outcome") || "completed";
        if (oc === "unable_to_complete") {
          var rs = (state.data && state.data.unable_reasons) || {};
          h += '<select class="ut-sel wa-reason" data-id="' + esc(w.work_id) + '">' +
            Object.keys(rs).map(function (k) { return '<option value="' + esc(k) + '">' + esc(rs[k]) + "</option>"; }).join("") +
            "</select>";
        }
        if (oc === "completed") {
          h += '<input class="ut-in wa-photo" data-id="' + esc(w.work_id) + '" placeholder="Photo reference" value="' + esc(d(w.work_id, "photo")) + '">';
          if (req.needs_functional_confirmation) {
            h += '<input class="ut-in wa-conf" data-id="' + esc(w.work_id) + '" placeholder="Short confirmation it works" value="' + esc(d(w.work_id, "conf")) + '">';
          }
          h += '<div class="ut-unk">' + esc(req.detail || "") + "</div>";
          h += '<div class="ut-unk">' + esc(req.not_inspected || "") + "</div>";
        }
        h += '<input class="ut-in wa-note" data-id="' + esc(w.work_id) + '" placeholder="Note (optional)" value="' + esc(d(w.work_id, "note")) + '">';
        h += '<button class="ut-btn ut-primary wa-claim" data-id="' + esc(w.work_id) + '">Report</button>';
      }
      if (w.status === "complete") {
        h += '<div class="ut-h2">Reopen</div>';
        h += '<input class="ut-in wa-reason-text" data-id="' + esc(w.work_id) + '" placeholder="Why is this being reopened?" value="' + esc(d(w.work_id, "reopen")) + '">';
        h += '<div class="ut-unk">The original claim and its proof are preserved. Reopening dirty work also reopens a completed final clean.</div>';
        h += '<button class="ut-btn wa-reopen" data-id="' + esc(w.work_id) + '">Reopen</button>';
      }
      h += "</div>";
    }
    return h + "</div>";
  }

  function renderAll() {
    if (!authorized()) {
      return '<div class="ut-empty"><strong>Not signed in.</strong> Work acceptance is a live operator surface ' +
        'and has no offline view. Sign in to load it.</div>';
    }
    var h = '<div class="ut-card"><div class="ut-h">Work flow</div>';
    h += '<input id="wfUnit" class="ut-in" placeholder="Unit id" value="' + esc(state.unitId || "") + '">';
    h += '<button id="wfLoad" class="ut-btn"' + (state.busy ? " disabled" : "") + ">Load unit</button>";
    if (state.error) h += errorNotice(state.error);

    if (state.receipt) {
      var r = state.receipt;
      h += '<div class="ut-receipt"><div class="ut-h2">Recorded</div>';
      h += line("Work", r.work);
      if (r.result) h += '<div class="ut-unk">' + esc(r.result) + "</div>";
      if (r.due) h += line("Due", r.due);
      if (r.proof_needed_to_close) h += line("Proof needed", r.proof_needed_to_close);
      if ((r.unlocked || []).length) { h += '<div class="ut-h3">Now actionable</div>' + list(r.unlocked); }
      if ((r.also_reopened || []).length) { h += '<div class="ut-h3">Also reopened</div>' + list(r.also_reopened); }
      if (r.cascade_note) h += '<div class="ut-unk">' + esc(r.cascade_note) + "</div>";
      if (r.next_action) h += '<div class="ut-next"><strong>Next:</strong> ' + esc(r.next_action) + "</div>";
      if (r.proposed_next) h += '<div class="ut-unk">' + esc(r.proposed_next) + "</div>";
      if (r.nothing_dispatched) h += '<div class="ut-unk">' + esc(r.nothing_dispatched) + "</div>";
      if (r.standing_caveat) h += '<div class="ut-unk">' + esc(r.standing_caveat) + "</div>";
      if (r.readiness_note) h += '<div class="ut-unk">' + esc(r.readiness_note) + "</div>";
      h += "</div>";
    }

    var d0 = state.data;
    if (d0) {
      var f = d0.flow || {};
      if (f.controlling_next_action) {
        h += '<div class="ut-next"><strong>Next:</strong> ' + esc(f.controlling_next_action.action) + "</div>";
        h += '<div class="ut-unk">' + esc(f.controlling_next_action.why) + "</div>";
      }
      if (d0.next_move_in) {
        h += line("Next move-in", d0.next_move_in.move_in_date + " — " + d0.next_move_in.days_remaining + " days remaining");
      }
      if ((d0.exceptions || []).length) {
        h += '<div class="ut-h2">Needs attention</div>';
        d0.exceptions.forEach(function (e) {
          h += '<div class="ut-item"><span class="ut-sev">' + esc(e.label) + "</span><span>" + esc(e.detail) + "</span></div>";
        });
      } else if (d0.exceptions_note) {
        h += '<div class="ut-unk">' + esc(d0.exceptions_note) + "</div>";
      }
      (d0.work || []).forEach(function (w) { h += renderItem(w); });
      if (d0.readiness_note) h += '<div class="ut-unk">' + esc(d0.readiness_note) + "</div>";
    }
    return h + "</div>";
  }

  function render() {
    var el = document.getElementById("psWorkFlow");
    if (el) el.innerHTML = renderAll();
    wire();
  }

  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  function wire() {
    var lb = document.getElementById("wfLoad");
    if (lb) lb.onclick = function () {
      var u = (document.getElementById("wfUnit") || {}).value;
      if (!u) { state.error = { message: "Enter a unit id." }; render(); return; }
      load(String(u).trim());
    };
    each("[data-panel]", function (b) {
      b.onclick = function () { var id = b.getAttribute("data-panel"); state.open[id] = !state.open[id]; render(); };
    });
    each(".wa-outcome", function (s) {
      s.value = d(s.getAttribute("data-id"), "outcome") || "completed";
      s.onchange = function () { setDraft(s.getAttribute("data-id"), "outcome", s.value); render(); };
    });
    var bind = function (sel, key) {
      each(sel, function (i) { i.oninput = function () { setDraft(i.getAttribute("data-id"), key, i.value); }; });
    };
    bind(".wa-due", "due"); bind(".wa-photo", "photo"); bind(".wa-conf", "conf");
    bind(".wa-note", "note"); bind(".wa-reason-text", "reopen");
    each(".wa-reason", function (s) { s.onchange = function () { setDraft(s.getAttribute("data-id"), "reason", s.value); }; });

    each(".wa-accept", function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-id"), due = d(id, "due");
        act(function () {
          return window.__psLive.acceptWork({
            workId: id,
            due_at: due ? new Date(due).toISOString() : null,
            commitment_source: due ? "operator_entered" : null,
          });
        });
      };
    });
    each(".wa-claim", function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-id");
        var oc = d(id, "outcome") || "completed";
        act(function () {
          return window.__psLive.claimWorkCompletion({
            workId: id, outcome: oc,
            unable_reason: oc === "unable_to_complete" ? (d(id, "reason") || "other") : null,
            note: d(id, "note") || null,
            proof_photos: oc === "completed" && d(id, "photo") ? [d(id, "photo")] : [],
            functional_confirmation: oc === "completed" ? (d(id, "conf") || null) : null,
          });
        });
      };
    });
    each(".wa-reopen", function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-id"), reason = d(id, "reopen");
        if (!reason) { state.error = { message: "A reason is required to reopen work." }; render(); return; }
        act(function () { return window.__psLive.reopenWork({ workId: id, reason: reason }); });
      };
    });
  }

  window.__psWorkAcceptance = { load: load, render: render, _state: state };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
