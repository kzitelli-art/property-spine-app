"use strict";

// PROPERTY SPINE — NORMAL TURN SCOPE AND ORDERED FLOW (BUILD 2)
//
// Three operator surfaces, the minimum this slice needs:
//   1. Complete Turn Scope — capture and one confirmation, from a BUILD 1 walk
//   2. Unit Turn Flow      — work by stage, blocked vs actionable, ONE next action
//   3. Management Exceptions — only scopes needing judgment
//
// ── LIVE-ONLY, BY CONSTRUCTION ──────────────────────────────────────
// Every call goes through window.__psLive, which posts to the pinned
// production origin with the staff-session header and does NOT pass through
// demoRespond() / DEMO_DB. Without a session this door renders a sign-in
// message and nothing else.
//
// ── THE BROWSER RENDERS; THE SERVER DECIDES ─────────────────────────
// Stage order, blocked/actionable, every blocking reason, the controlling next
// action, and every UNASSIGNED come from the server response. This module
// computes no operating meaning. It does not decide sequence, does not derive
// readiness, and never shows a proposal as though it were recorded.
//
// ── QUIET NORMAL FLOW ───────────────────────────────────────────────
// The exceptions surface shows nothing when nothing needs judgment, and says
// so. Routine paint-clean-repair work is deliberately absent from it.
(function () {
  if (window.__psTurnScopeDoorV1) return;
  window.__psTurnScopeDoorV1 = true;

  var state = {
    unitId: null, ctx: null, proposal: null, receipt: null,
    flow: null, exceptions: null, busy: false, error: null,
    form: { repairs_text: "", paint_level: "unknown", paint_areas: "",
            cleaning_level: "unknown", keys_status: "unknown", keys_note: "",
            inspection_completeness: "partial", appliances: {} },
    dropped: { findings: {}, work: {} }
  };

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function authorized() {
    try {
      //  A REAL SESSION IS THE AUTHORITY — not the preview flag. This used to
      //  also require `window.__OFFLINE_MODE !== true`, but that flag is set
      //  unconditionally at load and never cleared, so this could never return
      //  true and every one of these surfaces told a signed-in operator they
      //  were "Not signed in". The rule the rest of the app already applies
      //  (see __draftIsLiveContext) is that the global flag is preview
      //  plumbing and has no say over what a real operator is shown.
      return window.__psLive &&
        typeof window.__psLive.hasSession === "function" && window.__psLive.hasSession();
    } catch (_) { return false; }
  }
  function signedOut(what) {
    return '<div class="ut-empty"><strong>Not signed in.</strong> ' + esc(what) +
      ' is a live operator surface and has no offline view. Sign in to load it.</div>';
  }
  function errorNotice(e) {
    var msg = (e && (e.publicMessage || e.message)) || "The live read failed.";
    return '<div class="ut-error"><strong>Could not load.</strong> ' + esc(msg) +
      '<div class="ut-note">A read failure is not the absence of a problem — nothing about this turn has been shown.</div></div>';
  }
  function opt(v, label, cur) {
    return '<option value="' + esc(v) + '"' + (v === cur ? " selected" : "") + ">" + esc(label) + "</option>";
  }
  function line(k, v) {
    return '<div class="ut-row"><span class="ut-lbl">' + esc(k) + '</span><span>' + esc(v == null ? "—" : v) + "</span></div>";
  }
  function list(a) {
    return '<ul class="ut-ul">' + (a || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  }
  function ownerText(o) {
    if (!o) return "—";
    if (o === "UNASSIGNED") return "UNASSIGNED";
    return (o && o.name) || "assigned";
  }

  // ══════════════════════════════════════════════════════════════
  //  1. COMPLETE TURN SCOPE
  // ══════════════════════════════════════════════════════════════

  async function loadContext(unitId) {
    state.busy = true; state.error = null; state.receipt = null; render();
    try {
      var out = await window.__psLive.turnScopeContext({ unitId: unitId });
      state.ctx = (out && out.data) || null;
      state.unitId = unitId;
      // Seed appliance answers as UNKNOWN, never as working. An appliance
      // nobody checked must not arrive pre-answered.
      state.form.appliances = {};
      var cands = (state.ctx && state.ctx.appliance_candidates && state.ctx.appliance_candidates.appliances) || [];
      cands.forEach(function (a) { state.form.appliances[a.key] = "unknown"; });
    } catch (e) { state.error = e; state.ctx = null; }
    finally { state.busy = false; render(); }
  }

  function formAppliances() {
    var cands = (state.ctx && state.ctx.appliance_candidates && state.ctx.appliance_candidates.appliances) || [];
    return cands.map(function (a) {
      return { key: a.key, label: a.label, condition: state.form.appliances[a.key] || "unknown" };
    });
  }

  async function propose() {
    if (!state.unitId) return;
    state.busy = true; state.error = null; render();
    try {
      var out = await window.__psLive.proposeTurnScope({
        unitId: state.unitId,
        repairs_text: state.form.repairs_text,
        paint_level: state.form.paint_level,
        paint_areas: state.form.paint_level === "partial" ? state.form.paint_areas : null,
        cleaning_level: state.form.cleaning_level,
        appliances: formAppliances(),
        keys_status: state.form.keys_status,
        keys_note: state.form.keys_note,
        inspection_completeness: state.form.inspection_completeness
      });
      state.proposal = (out && out.data && out.data.proposal) || null;
      state.dropped = { findings: {}, work: {} };
    } catch (e) { state.error = e; }
    finally { state.busy = false; render(); }
  }

  async function confirm() {
    if (!state.proposal || !state.unitId || !state.ctx) return;
    state.busy = true; state.error = null; render();
    try {
      var p = state.proposal;
      // Only what the operator LEFT STANDING is sent.
      var findings = (p.findings || [])
        .filter(function (_f, i) { return !state.dropped.findings[i]; })
        .map(function (f) { return { finding_text: f.finding, evidence_text: f.evidence || null, origin: "proposed" }; });
      var work = (p.required_work || [])
        .filter(function (_w, i) { return !state.dropped.work[i]; })
        .map(function (w) {
          return {
            work_text: w.work, stage: w.stage,
            disturbs_painted_surfaces: w.disturbs_painted_surfaces === undefined ? null : w.disturbs_painted_surfaces,
            from_finding_index: w.from_finding_index, origin: "proposed"
          };
        });
      var out = await window.__psLive.confirmTurnScope({
        unitId: state.unitId,
        triage_confirmation_id: state.ctx.triage_confirmation_id,
        text: state.form.repairs_text,
        paint_level: state.form.paint_level,
        paint_areas: state.form.paint_level === "partial" ? state.form.paint_areas : null,
        cleaning_level: state.form.cleaning_level,
        keys_status: state.form.keys_status, keys_note: state.form.keys_note,
        inspection_completeness: state.form.inspection_completeness,
        appliances: formAppliances(),
        findings: findings, required_work: work
      });
      state.receipt = (out && out.data && out.data.receipt) || null;
      state.proposal = null;
      await Promise.all([loadFlow(), loadExceptions()]);
    } catch (e) { state.error = e; }
    finally { state.busy = false; render(); }
  }

  function renderCapture() {
    if (!authorized()) return signedOut("Complete turn scope");

    var h = '<div class="ut-card"><div class="ut-h">Complete turn scope</div>';
    h += '<div class="ut-sub">Extends a confirmed initial walk. Say what you found; pick the levels.</div>';
    h += '<input id="tsUnit" class="ut-in" placeholder="Unit id" value="' + esc(state.unitId || "") + '">';
    h += '<button id="tsLoad" class="ut-btn"' + (state.busy ? " disabled" : "") + '>Load unit</button>';

    if (state.error) h += errorNotice(state.error);

    if (state.ctx) {
      if (state.ctx.triage_observed) {
        h += '<div class="ut-h2">Initial walk reported</div><div class="ut-quote">' + esc(state.ctx.triage_observed) + "</div>";
      }
      if (state.ctx.next_move_in) {
        h += '<div class="ut-movein"><strong>Next move-in:</strong> ' + esc(state.ctx.next_move_in.move_in_date) +
             " — " + esc(String(state.ctx.next_move_in.days_remaining)) + " days remaining</div>";
      }

      h += '<div class="ut-h2">Paint</div><select id="tsPaint" class="ut-sel">' +
        opt("none", "None", state.form.paint_level) + opt("touch_up", "Touch-up", state.form.paint_level) +
        opt("partial", "Partial", state.form.paint_level) + opt("full", "Full unit", state.form.paint_level) +
        opt("unknown", "Unknown", state.form.paint_level) + "</select>";
      if (state.form.paint_level === "partial") {
        h += '<input id="tsPaintAreas" class="ut-in" placeholder="Which rooms or areas?" value="' + esc(state.form.paint_areas) + '">';
      }

      h += '<div class="ut-h2">Cleaning</div><select id="tsClean" class="ut-sel">' +
        opt("none", "None", state.form.cleaning_level) + opt("touch_up", "Touch-up clean", state.form.cleaning_level) +
        opt("full", "Full clean", state.form.cleaning_level) + opt("deep", "Deep clean", state.form.cleaning_level) +
        opt("unknown", "Unknown", state.form.cleaning_level) + "</select>";

      h += '<div class="ut-h2">Appliances</div>';
      var ac = state.ctx.appliance_candidates || {};
      if (ac.inventory_known === false) {
        h += '<div class="ut-unk">' + esc(ac.note || "") + "</div>";
      }
      (ac.appliances || []).forEach(function (a) {
        var cur = state.form.appliances[a.key] || "unknown";
        h += '<div class="ut-row"><span class="ut-lbl">' + esc(a.label) + "</span>" +
          '<select class="ut-sel ts-appl" data-key="' + esc(a.key) + '">' +
          opt("working", "Working", cur) + opt("needs_repair", "Needs repair", cur) +
          opt("needs_replacement", "Needs replacement", cur) + opt("missing", "Missing", cur) +
          opt("unknown", "Unknown / not checked", cur) + "</select></div>";
      });

      h += '<div class="ut-h2">Repairs</div>';
      h += '<textarea id="tsRepairs" class="ut-ta" rows="3" placeholder="e.g. Bathroom faucet leaks, bedroom door does not latch, and two outlets are loose.">' + esc(state.form.repairs_text) + "</textarea>";

      h += '<div class="ut-h2">Keys and access</div><select id="tsKeys" class="ut-sel">' +
        opt("accounted_for", "All accounted for", state.form.keys_status) +
        opt("items_missing", "Items missing", state.form.keys_status) +
        opt("unknown", "Unknown / not checked", state.form.keys_status) + "</select>";
      if (state.form.keys_status === "items_missing") {
        h += '<input id="tsKeysNote" class="ut-in" placeholder="What is missing?" value="' + esc(state.form.keys_note) + '">';
      }

      h += '<div class="ut-h2">Inspection</div><select id="tsInsp" class="ut-sel">' +
        opt("partial", "Partial inspection", state.form.inspection_completeness) +
        opt("complete_turn_scope", "Complete turn-scope inspection", state.form.inspection_completeness) + "</select>";

      h += '<button id="tsPropose" class="ut-btn"' + (state.busy ? " disabled" : "") + ">" +
        (state.busy ? "Reading…" : "Review what Spine understood") + "</button>";
    }

    // ── confirmation card ──
    var p = state.proposal;
    if (p) {
      h += '<div class="ut-confirm"><div class="ut-chip">NOTHING RECORDED YET</div>';
      if (state.form.repairs_text) {
        h += '<div class="ut-h2">You reported</div><div class="ut-quote">' + esc(state.form.repairs_text) + "</div>";
      }
      h += '<div class="ut-h2">Spine understood</div>';
      h += line("Paint", (p.labels && p.labels.paint) + (p.paint_areas ? " — " + p.paint_areas : ""));
      h += line("Cleaning", p.labels && p.labels.cleaning);
      h += line("Keys", p.labels && p.labels.keys);
      h += line("Inspection", p.labels && p.labels.inspection);

      if ((p.findings || []).length) {
        h += '<div class="ut-h2">Findings</div>';
        (p.findings || []).forEach(function (f, i) {
          var off = !!state.dropped.findings[i];
          h += '<div class="ut-item' + (off ? " ut-off" : "") + '">' +
            '<button class="ut-x" data-drop="findings" data-i="' + i + '">' + (off ? "undo" : "remove") + "</button>" +
            "<span>" + esc(f.finding) + "</span></div>";
        });
      }
      if ((p.required_work || []).length) {
        h += '<div class="ut-h2">Required work</div>';
        (p.required_work || []).forEach(function (w, i) {
          var off = !!state.dropped.work[i];
          h += '<div class="ut-item' + (off ? " ut-off" : "") + '">' +
            '<button class="ut-x" data-drop="work" data-i="' + i + '">' + (off ? "undo" : "remove") + "</button>" +
            "<span>" + esc(w.work) + '</span><span class="ut-ev">' + esc(w.stage || "unstaged") + "</span></div>";
        });
      }
      if ((p.unknowns || []).length) {
        h += '<div class="ut-h2">Still unknown</div>';
        (p.unknowns || []).forEach(function (u) { h += '<div class="ut-unk">' + esc(u) + "</div>"; });
      }
      h += '<button id="tsConfirm" class="ut-btn ut-primary"' + (state.busy ? " disabled" : "") + ">" +
        (state.busy ? "Recording…" : "Confirm") + "</button></div>";
    }

    // ── receipt ──
    if (state.receipt) {
      var r = state.receipt;
      h += '<div class="ut-receipt"><div class="ut-h2">Recorded</div><div><strong>' + esc(r.unit) + "</strong></div>";
      h += line("Paint", r.paint) + line("Cleaning", r.cleaning) + line("Keys", r.keys) + line("Inspection", r.inspection);
      if ((r.appliance_findings || []).length) h += '<div class="ut-h3">Appliances</div>' + list(r.appliance_findings);
      if ((r.findings_recorded || []).length) h += '<div class="ut-h3">Findings recorded</div>' + list(r.findings_recorded);
      if ((r.required_work_created || []).length) h += '<div class="ut-h3">Required work created</div>' + list(r.required_work_created);
      if ((r.superseded_work || []).length) h += '<div class="ut-h3">Superseded by this correction</div>' + list(r.superseded_work);
      h += line("Accountable owner", r.accountable_owner);
      if (r.next_move_in) h += line("Next move-in", r.next_move_in);
      if (r.controlling_next_action) h += '<div class="ut-next"><strong>Next:</strong> ' + esc(r.controlling_next_action) + "</div>";
      if (r.why) h += '<div class="ut-unk">' + esc(r.why) + "</div>";
      if (r.standing_caveat) h += '<div class="ut-unk">' + esc(r.standing_caveat) + "</div>";
      h += "</div>";
    }

    return h + "</div>";
  }

  // ══════════════════════════════════════════════════════════════
  //  2. UNIT TURN FLOW
  // ══════════════════════════════════════════════════════════════

  async function loadFlow() {
    if (!authorized() || !state.unitId) return;
    try {
      var out = await window.__psLive.unitTurnFlow({ unitId: state.unitId });
      state.flow = (out && out.data) || null;
    } catch (e) { state.flow = { __error: e }; }
  }

  function renderFlow() {
    if (!authorized()) return signedOut("The unit turn flow");
    var d = state.flow;
    if (!d) return "";
    if (d.__error) return errorNotice(d.__error);
    if (!d.scope) return '<div class="ut-empty">No turn scope confirmed for this unit yet.</div>';

    var f = d.flow || {};
    var h = '<div class="ut-card"><div class="ut-h">Turn flow — unit ' + esc((d.unit && d.unit.unit_number) || "") + "</div>";

    if (f.controlling_next_action) {
      h += '<div class="ut-next"><strong>Next:</strong> ' + esc(f.controlling_next_action.action) + "</div>";
      h += '<div class="ut-unk">' + esc(f.controlling_next_action.why) + "</div>";
    }
    if (d.next_move_in) {
      h += line("Next move-in", d.next_move_in.move_in_date + " — " + d.next_move_in.days_remaining + " days remaining");
    }

    (f.stages || []).forEach(function (s) {
      if (!s.open_count) return;
      h += '<div class="ut-h2">' + esc(s.label) + (s.blocked ? ' <span class="ut-sev">BLOCKED</span>' : "") + "</div>";
      if (s.blocked) {
        (s.blocked_by || []).forEach(function (b) { h += '<div class="ut-unk">' + esc(b.detail) + "</div>"; });
      }
      (s.items || []).forEach(function (i) {
        h += '<div class="ut-item' + (i.blocked ? " ut-off" : "") + '">' +
          "<span>" + esc(i.work_text) + "</span>" +
          '<span class="ut-ev">' + (i.blocked ? "blocked" : "actionable") + "</span>" +
          '<span class="ut-ev">' +
          (i.owner === "UNASSIGNED" ? '<span class="ut-unassigned">UNASSIGNED</span>' : esc(ownerText(i.owner))) +
          "</span>";
        if (i.sequence_exception) h += '<span class="ut-ev">released: ' + esc(i.sequence_exception_reason || "") + "</span>";
        h += "</div>";
      });
    });

    h += '<div class="ut-h2">Final readiness walk</div>';
    h += '<div class="ut-unk">' + (f.readiness_walk_blocked
      ? "Blocked. Readiness is established by the walk, which this build does not perform or certify."
      : "Not blocked — a human may now walk it. This is NOT a readiness verdict.") + "</div>";

    if ((d.unresolved_unknowns || []).length) {
      h += '<div class="ut-h2">Unresolved unknowns</div>' + list(d.unresolved_unknowns);
    }
    return h + "</div>";
  }

  // ══════════════════════════════════════════════════════════════
  //  3. MANAGEMENT EXCEPTIONS
  // ══════════════════════════════════════════════════════════════

  async function loadExceptions() {
    if (!authorized()) return;
    try {
      var out = await window.__psLive.turnScopeExceptions();
      state.exceptions = (out && out.data) || null;
    } catch (e) { state.exceptions = { __error: e }; }
  }

  function renderExceptions() {
    if (!authorized()) return signedOut("Turn-scope exceptions");
    var d = state.exceptions;
    if (!d) return "";
    if (d.__error) return errorNotice(d.__error);
    if (!d.count) {
      return '<div class="ut-empty">No turn scopes need judgment right now.' +
        '<div class="ut-note">Routine turn work is deliberately not listed here.</div></div>';
    }
    var h = '<div class="ut-card"><div class="ut-h">Turn scopes needing judgment (' + d.count + ")</div>";
    (d.units || []).forEach(function (u) {
      h += '<div class="ut-unit"><div class="ut-unit-h"><strong>Unit ' + esc(u.unit_number || u.unit_id) + "</strong></div>";
      (u.exceptions || []).forEach(function (e) {
        h += '<div class="ut-item"><span class="ut-sev">' + esc(e.label) + '</span><span>' + esc(e.detail) + "</span></div>";
      });
      if (u.controlling_next_action) h += '<div class="ut-next"><strong>Next:</strong> ' + esc(u.controlling_next_action.action) + "</div>";
      if (u.next_move_in) h += line("Next move-in", u.next_move_in.move_in_date + " — " + u.next_move_in.days_remaining + " days remaining");
      h += "</div>";
    });
    return h + "</div>";
  }

  // ══════════════════════════════════════════════════════════════
  //  MOUNT
  // ══════════════════════════════════════════════════════════════

  function render() {
    var c = document.getElementById("psTurnScopeCapture");
    var fl = document.getElementById("psTurnFlow");
    var ex = document.getElementById("psTurnExceptions");
    if (c) c.innerHTML = renderCapture();
    if (fl) fl.innerHTML = renderFlow();
    if (ex) ex.innerHTML = renderExceptions();
    wire();
  }

  function wire() {
    var b = document.getElementById("tsLoad");
    if (b) b.onclick = function () {
      var u = (document.getElementById("tsUnit") || {}).value;
      if (!u) { state.error = { message: "Enter a unit id." }; render(); return; }
      loadContext(String(u).trim());
    };
    var bind = function (id, key) {
      var el = document.getElementById(id);
      if (el) el.onchange = function () { state.form[key] = el.value; render(); };
    };
    bind("tsPaint", "paint_level"); bind("tsClean", "cleaning_level");
    bind("tsKeys", "keys_status"); bind("tsInsp", "inspection_completeness");

    var txt = function (id, key) {
      var el = document.getElementById(id);
      if (el) el.oninput = function () { state.form[key] = el.value; };
    };
    txt("tsRepairs", "repairs_text"); txt("tsPaintAreas", "paint_areas"); txt("tsKeysNote", "keys_note");

    Array.prototype.forEach.call(document.querySelectorAll(".ts-appl"), function (s) {
      s.onchange = function () { state.form.appliances[s.getAttribute("data-key")] = s.value; };
    });

    var pb = document.getElementById("tsPropose"); if (pb) pb.onclick = propose;
    var cb = document.getElementById("tsConfirm"); if (cb) cb.onclick = confirm;

    Array.prototype.forEach.call(document.querySelectorAll("[data-drop]"), function (x) {
      x.onclick = function () {
        var k = x.getAttribute("data-drop"), i = x.getAttribute("data-i");
        state.dropped[k][i] = !state.dropped[k][i];
        render();
      };
    });
  }

  async function boot() {
    if (!authorized()) { render(); return; }
    await loadExceptions();
    render();
  }

  window.__psTurnScope = { boot: boot, render: render, loadContext: loadContext, propose: propose, confirm: confirm, _state: state };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
