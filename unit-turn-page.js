"use strict";

// PROPERTY SPINE — THE ONE UNIT TURN PAGE (BUILD 6A)
//
// Turn list → one Unit Turn page → message or button → confirm → same page.
//
// ── WHAT THIS REPLACES ──────────────────────────────────────────────
// Builds 1-5 each shipped their own door, so one unit turn lived across five
// surfaces. Every one was a faithful view of its own layer, and together they
// made the operator reconstruct the flow by hand. This composes them into one
// page. The Build 1-5 doors remain mounted as diagnostic routes; they are no
// longer the primary path.
//
// ── IT DECIDES NOTHING ──────────────────────────────────────────────
// Every label, readiness word, blocked/actionable verdict, proof requirement,
// controlling next action, availability blocker and UNASSIGNED comes from the
// server. This module renders. It does not compute operating meaning, and it
// never decides who may certify — it renders `may_walk`, which the readiness
// service decided.
//
// ── BUTTONS FOR WORK, CONVERSATION FOR OBSERVATION ──────────────────
// Accepting work is a tap. Completing work is the smallest possible capture.
// The message box is for reporting what was SEEN and what was FINISHED — not
// for accepting work and never for certifying readiness.
(function () {
  if (window.__psUnitTurnPageV1) return;
  window.__psUnitTurnPageV1 = true;

  var S = { list: null, attention: false, unitId: null, turn: null,
            busy: false, error: null, msg: "", photo: "", open: {}, draft: {}, receipt: null };

  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function authorized() {
    try {
      return window.__OFFLINE_MODE !== true && window.__psLive &&
        typeof window.__psLive.hasSession === "function" && window.__psLive.hasSession();
    } catch (_) { return false; }
  }
  function err(e) {
    var m = (e && (e.publicMessage || e.message)) || "The live call failed.";
    return '<div class="ut-error"><strong>Not recorded.</strong> ' + esc(m) + "</div>";
  }
  function row(k, v) {
    return '<div class="ut-row"><span class="ut-lbl">' + esc(k) + '</span><span>' + esc(v == null ? "—" : v) + "</span></div>";
  }
  function d(id, k) { return (S.draft[id] || {})[k] || ""; }
  function setD(id, k, v) { S.draft[id] = S.draft[id] || {}; S.draft[id][k] = v; }

  async function loadList() {
    if (!authorized()) return;
    try {
      var o = await window.__psLive.turnList({ attention: S.attention });
      S.list = (o && o.data) || null;
    } catch (e) { S.list = { __error: e }; }
  }
  async function loadUnit(id) {
    S.busy = true; S.error = null; render();
    try {
      var o = await window.__psLive.unitTurn({ unitId: id });
      S.turn = (o && o.data) || null; S.unitId = id;
    } catch (e) { S.error = e; S.turn = null; }
    finally { S.busy = false; render(); }
  }
  async function act(fn) {
    S.busy = true; S.error = null; S.receipt = null; render();
    try {
      var o = await fn();
      S.receipt = (o && o.data && o.data.receipt) || null;
      await loadUnit(S.unitId); await loadList();
    } catch (e) { S.error = e; }
    finally { S.busy = false; render(); }
  }

  // ── TURN LIST ─────────────────────────────────────────────────────
  function renderList() {
    if (!authorized()) {
      return '<div class="ut-empty"><strong>Not signed in.</strong> Sign in to load turns.</div>';
    }
    var l = S.list;
    if (!l) return "";
    if (l.__error) return err(l.__error);
    var h = '<div class="ut-card"><div class="ut-h">Turns</div>';
    h += '<button id="tlAll" class="ut-btn' + (S.attention ? "" : " ut-primary") + '">All</button>';
    h += '<button id="tlAtt" class="ut-btn' + (S.attention ? " ut-primary" : "") + '">Needs attention</button>';
    if (!l.count) {
      h += '<div class="ut-empty">' + esc(l.note || "No turns.") + "</div>";
    }
    (l.turns || []).forEach(function (t) {
      h += '<div class="ut-item"><button class="ut-x tl-open" data-id="' + esc(t.unit_id) + '">Unit ' +
        esc(t.unit_number || t.unit_id) + "</button>" +
        '<span class="ut-ev">' + esc(t.readiness_label || "") + "</span>" +
        (t.next_action ? '<span class="ut-ev">' + esc(t.next_action) + "</span>" : "") +
        (t.needs_attention ? '<span class="ut-sev">' + esc((t.attention_reasons || []).join(" · ")) + "</span>" : "") +
        "</div>";
    });
    return h + "</div>";
  }

  // ── THE UNIT TURN PAGE ────────────────────────────────────────────
  function renderTurn() {
    if (!authorized()) return "";
    if (S.error) return err(S.error);
    var t = S.turn;
    if (!t) return "";

    var h = '<div class="ut-card"><div class="ut-h">Unit ' + esc(t.unit.unit_number || t.unit.id) + "</div>";

    // 1. STATUS
    h += row("Vacancy", t.status.vacancy_known ? t.status.vacancy : "Unknown — no confirmed walk");
    h += row("Physical readiness", t.status.readiness_label);
    h += row("Marketability", t.status.marketability);
    if (t.status.remaining_blocker) h += row("Remaining blocker", t.status.remaining_blocker);
    if (t.status.next_move_in) {
      h += row("Next move-in", t.status.next_move_in.move_in_date + " — " +
        t.status.next_move_in.days_remaining + " days remaining");
    }
    h += '<div class="ut-unk"><strong>' + esc(t.status.summary) + "</strong></div>";

    // 2. CONTROLLING NEXT ACTION
    if (t.controlling_next_action) {
      h += '<div class="ut-next"><strong>Next:</strong> ' + esc(t.controlling_next_action.action) + "</div>";
      if (t.controlling_next_action.why) h += '<div class="ut-unk">' + esc(t.controlling_next_action.why) + "</div>";
    }

    // 3+4. WORK, GROUPED, WITH BUTTONS
    var byStage = { repair: "Repairs and replacements", paint: "Paint",
                    final_clean: "Final cleaning", null: "Other work" };
    Object.keys(byStage).forEach(function (st) {
      var items = (t.work || []).filter(function (w) { return String(w.stage) === st; });
      if (!items.length) return;
      var sg = (t.stages || []).find(function (x) { return String(x.stage) === st; });
      h += '<div class="ut-h2">' + esc(byStage[st]) +
        (sg && sg.blocked ? ' <span class="ut-sev">BLOCKED</span>' : "") + "</div>";
      if (sg && sg.blocked) {
        (sg.blocked_by || []).forEach(function (b) { h += '<div class="ut-unk">' + esc(b.detail) + "</div>"; });
      }
      items.forEach(function (w) { h += renderWork(w, sg); });
    });

    // 5. FINAL READINESS — offered only when the SERVER says so
    h += '<div class="ut-h2">Final readiness</div>';
    h += '<div class="ut-unk">' + esc(t.readiness.note) + "</div>";
    if (t.readiness.may_walk) {
      h += '<input id="rwFind" class="ut-in" placeholder="If it failed, what did you find?">';
      h += '<button id="rwPass" class="ut-btn ut-primary">Perform final readiness walk</button>';
      h += '<button id="rwFail" class="ut-btn">Record a failed walk</button>';
    } else if (t.readiness.authority && !t.readiness.authority.authorized && t.readiness.gate.actionable) {
      h += '<div class="ut-unk">You cannot certify this unit: ' + esc(t.readiness.authority.reason) + "</div>";
    } else if (!t.readiness.gate.actionable) {
      (t.readiness.gate.blockers || []).forEach(function (b) {
        h += '<div class="ut-item"><span>' + esc(b.detail) + "</span></div>";
      });
    }

    // 6. MESSAGE BOX — observation and completion, not acceptance or readiness
    h += '<div class="ut-h2">Report something</div>';
    h += '<textarea id="mtMsg" class="ut-ta" rows="2" placeholder="e.g. There are cockroaches behind the refrigerator. / This needs full paint. / The refrigerator is installed and working.">' + esc(S.msg) + "</textarea>";
    h += '<input id="mtPhoto" class="ut-in" placeholder="Photo reference (optional)" value="' + esc(S.photo) + '">';
    h += '<button id="mtSend" class="ut-btn"' + (S.busy ? " disabled" : "") + ">Send</button>";

    // the thread, plain language only
    if (t.thread && (t.thread.proposals || []).length) {
      (t.thread.proposals || []).slice(-3).forEach(function (p) {
        h += '<div class="ut-item"><span class="ut-lbl">' + esc(p.plain_label) + "</span>";
        if (p.status === "proposed") {
          h += '<button class="ut-x mt-confirm" data-id="' + esc(p.id) + '">Confirm</button>' +
               '<button class="ut-x mt-cancel" data-id="' + esc(p.id) + '">Cancel</button>';
        } else { h += '<span class="ut-ev">' + esc(p.status) + "</span>"; }
        h += "</div>";
        if (p.status === "proposed") {
          (p.unknowns || []).forEach(function (u) { h += '<div class="ut-unk">' + esc(u) + "</div>"; });
        }
        if (p.clarification && p.status === "clarification_required") {
          h += '<div class="ut-unk"><strong>' + esc(p.clarification) + "</strong></div>";
        }
      });
    }

    if (S.receipt) {
      h += '<div class="ut-receipt"><div class="ut-h3">Recorded</div>';
      Object.keys(S.receipt).forEach(function (k) {
        var v = S.receipt[k];
        if (v == null || v === "" || (Array.isArray(v) && !v.length)) return;
        h += row(k.replace(/_/g, " "), Array.isArray(v) ? v.join("; ") : v);
      });
      h += "</div>";
    }
    return h + "</div>";
  }

  function renderWork(w, sg) {
    var blocked = sg && sg.blocked;
    var open = !!S.open[w.work_id];
    var h = '<div class="ut-item' + (w.status === "complete" ? " ut-off" : "") + '">';
    h += "<span>" + esc(w.work_text) + "</span>";
    h += '<span class="ut-ev">' + (w.status === "complete" ? "complete" : blocked ? "blocked" : "actionable") + "</span>";
    h += '<span class="ut-ev">' + (w.owner === "UNASSIGNED"
      ? '<span class="ut-unassigned">UNASSIGNED</span>' : "assigned") + "</span>";
    if (w.due_at) h += '<span class="ut-ev">due ' + esc(String(w.due_at).slice(0, 10)) + "</span>";
    if (w.reopened_count > 0) h += '<span class="ut-sev">reopened</span>';
    h += "</div>";

    if (w.latest_outcome === "completed" && w.proof_satisfied === false) {
      h += '<div class="ut-unk">Claimed complete, NOT closed. ' + esc(w.proof_shortfall || "") + "</div>";
    }

    if (w.status === "required" && !blocked) {
      if (!w.accepted) {
        // ACCEPTANCE IS A BUTTON.
        h += '<button class="ut-x wk-accept" data-id="' + esc(w.work_id) + '">Accept work</button>';
      }
      h += '<button class="ut-x wk-panel" data-id="' + esc(w.work_id) + '">' + (open ? "Close" : "Complete work") + "</button>";
    }
    if (w.status === "complete") {
      h += '<button class="ut-x wk-panel" data-id="' + esc(w.work_id) + '">' + (open ? "Close" : "Reopen") + "</button>";
    }

    if (open) {
      h += '<div class="ut-confirm">';
      if (w.status === "required") {
        // THE SMALLEST POSSIBLE CAPTURE.
        h += '<input class="ut-in wk-photo" data-id="' + esc(w.work_id) + '" placeholder="Photo reference" value="' + esc(d(w.work_id, "photo")) + '">';
        if (w.proof_requirement && w.proof_requirement.needs_functional_confirmation) {
          h += '<input class="ut-in wk-conf" data-id="' + esc(w.work_id) + '" placeholder="Short confirmation it works" value="' + esc(d(w.work_id, "conf")) + '">';
        }
        h += '<div class="ut-unk">' + esc((w.proof_requirement && w.proof_requirement.detail) || "") + "</div>";
        h += '<button class="ut-btn ut-primary wk-done" data-id="' + esc(w.work_id) + '">Complete</button>';
        h += '<button class="ut-btn wk-unable" data-id="' + esc(w.work_id) + '">Unable to complete</button>';
      } else {
        h += '<input class="ut-in wk-reason" data-id="' + esc(w.work_id) + '" placeholder="Why reopen?" value="' + esc(d(w.work_id, "reason")) + '">';
        h += '<button class="ut-btn wk-reopen" data-id="' + esc(w.work_id) + '">Reopen</button>';
      }
      h += "</div>";
    }
    return h;
  }

  function render() {
    var l = document.getElementById("psTurnList");
    var p = document.getElementById("psUnitTurnPage");
    if (l) l.innerHTML = renderList();
    if (p) p.innerHTML = renderTurn();
    wire();
  }
  function each(s, f) { Array.prototype.forEach.call(document.querySelectorAll(s), f); }

  function wire() {
    var a = document.getElementById("tlAll");
    if (a) a.onclick = async function () { S.attention = false; await loadList(); render(); };
    var b = document.getElementById("tlAtt");
    if (b) b.onclick = async function () { S.attention = true; await loadList(); render(); };
    each(".tl-open", function (x) { x.onclick = function () { loadUnit(x.getAttribute("data-id")); }; });
    each(".wk-panel", function (x) {
      x.onclick = function () { var i = x.getAttribute("data-id"); S.open[i] = !S.open[i]; render(); };
    });
    var bindIn = function (sel, k) {
      each(sel, function (i) { i.oninput = function () { setD(i.getAttribute("data-id"), k, i.value); }; });
    };
    bindIn(".wk-photo", "photo"); bindIn(".wk-conf", "conf"); bindIn(".wk-reason", "reason");

    // ALL WRITES GO TO THE BUILD 1-5 CANONICAL DOORS.
    each(".wk-accept", function (x) {
      x.onclick = function () {
        var i = x.getAttribute("data-id");
        act(function () { return window.__psLive.acceptWork({ workId: i }); });
      };
    });
    each(".wk-done", function (x) {
      x.onclick = function () {
        var i = x.getAttribute("data-id");
        act(function () {
          return window.__psLive.claimWorkCompletion({
            workId: i, outcome: "completed",
            proof_photos: d(i, "photo") ? [d(i, "photo")] : [],
            functional_confirmation: d(i, "conf") || null,
          });
        });
      };
    });
    each(".wk-unable", function (x) {
      x.onclick = function () {
        var i = x.getAttribute("data-id");
        act(function () {
          return window.__psLive.claimWorkCompletion({ workId: i, outcome: "unable_to_complete", unable_reason: "other" });
        });
      };
    });
    each(".wk-reopen", function (x) {
      x.onclick = function () {
        var i = x.getAttribute("data-id"), r = d(i, "reason");
        if (!r) { S.error = { message: "A reason is required to reopen work." }; render(); return; }
        act(function () { return window.__psLive.reopenWork({ workId: i, reason: r }); });
      };
    });

    var pass = document.getElementById("rwPass");
    if (pass) pass.onclick = function () {
      act(function () {
        return window.__psLive.readinessWalk({
          unitId: S.unitId, outcome: "ready",
          confirmations: {
            work_complete_confirmed: true, cleaning_acceptable_confirmed: true,
            appliances_present_confirmed: true, appliance_function_confirmed: true,
            no_repair_blocker_confirmed: true, keys_accounted_confirmed: true,
            condition_acceptable_confirmed: true, no_unknowns_confirmed: true,
          },
        });
      });
    };
    var fail = document.getElementById("rwFail");
    if (fail) fail.onclick = function () {
      var f = (document.getElementById("rwFind") || {}).value || "";
      act(function () {
        return window.__psLive.readinessWalk({ unitId: S.unitId, outcome: "not_ready", findings_text: f });
      });
    };

    var m = document.getElementById("mtMsg"); if (m) m.oninput = function () { S.msg = m.value; };
    var ph = document.getElementById("mtPhoto"); if (ph) ph.oninput = function () { S.photo = ph.value; };
    var send = document.getElementById("mtSend");
    if (send) send.onclick = function () {
      if (!S.msg.trim()) return;
      var text = S.msg, photo = S.photo;
      S.msg = ""; S.photo = "";
      act(function () {
        return window.__psLive.staffAgentMessage({
          text: text, photos: photo ? [photo] : [], context_unit_id: S.unitId,
        });
      });
    };
    each(".mt-confirm", function (x) {
      x.onclick = function () {
        act(function () { return window.__psLive.confirmAgentProposal({ proposalId: x.getAttribute("data-id") }); });
      };
    });
    each(".mt-cancel", function (x) {
      x.onclick = function () {
        act(function () { return window.__psLive.cancelAgentProposal({ proposalId: x.getAttribute("data-id") }); });
      };
    });
  }

  async function boot() { if (!authorized()) { render(); return; } await loadList(); render(); }
  window.__psUnitTurn = { boot: boot, render: render, loadUnit: loadUnit, _state: S };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
