"use strict";

// PROPERTY SPINE — POST-MOVE-OUT INITIAL UNIT TRIAGE (BUILD 1)
//
// Three operator surfaces, the minimum this slice needs:
//   1. initial-walk capture + one confirmation
//   2. open initial walks — the incomplete walk's visible home
//   3. management risk read — condition, blockers, next move-in, owner
//
// ── LIVE-ONLY, BY CONSTRUCTION ──────────────────────────────────────
// Every call goes through window.__psLive, which posts to the pinned
// production origin with the staff-session header. It does NOT pass through
// demoRespond() / DEMO_DB. If there is no session, this door renders a
// sign-in message and NOTHING ELSE — it never falls back to sample data, and
// it never paints a state it has not read from the server.
//
// ── THE BROWSER RENDERS; THE SERVER DECIDES ─────────────────────────
// Every label, every readiness word, every "what happens next" sentence, and
// every UNASSIGNED in this file comes from the server response. This module
// computes no operating meaning of its own. It does not decide severity, it
// does not derive readiness, and it never writes a proposal to the screen as
// though it were recorded.
(function () {
  if (window.__psUnitTriageDoorV1) return;
  window.__psUnitTriageDoorV1 = true;

  var state = {
    unitId: null,
    text: "",
    proposal: null,      // server's interpretation — NOT truth
    nextMoveIn: null,
    receipt: null,
    risk: null,
    openWalks: null,
    busy: false,
    error: null,
    // operator edits to the proposal, applied before confirm
    dropped: { findings: {}, work: {} },
    override: {}
  };

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

  // The one honest empty state. Not "no issues", not a blank success —
  // it names why nothing is shown.
  function signedOutNotice(what) {
    return '<div class="ut-empty"><strong>Not signed in.</strong> ' +
      esc(what) + ' is a live operator surface and has no offline view. ' +
      'Sign in to load it.</div>';
  }
  function errorNotice(e) {
    var msg = (e && (e.publicMessage || e.message)) || "The live read failed.";
    return '<div class="ut-error"><strong>Could not load.</strong> ' + esc(msg) +
      '<div class="ut-note">A read failure is not the absence of a problem — ' +
      'nothing about these units has been shown.</div></div>';
  }

  // ══════════════════════════════════════════════════════════════
  //  1. CAPTURE  →  PROPOSE  →  CONFIRM
  // ══════════════════════════════════════════════════════════════

  async function propose(unitId, text) {
    state.busy = true; state.error = null; state.receipt = null; render();
    try {
      var out = await window.__psLive.proposeUnitTriage({ unitId: unitId, text: text });
      var d = (out && out.data) || {};
      state.unitId = unitId;
      state.text = text;
      state.proposal = d.proposal || null;
      state.nextMoveIn = d.next_move_in || null;
      state.dropped = { findings: {}, work: {} };
      state.override = {};
    } catch (e) {
      state.error = e;
    } finally {
      state.busy = false; render();
    }
  }

  async function confirm() {
    if (!state.proposal || !state.unitId) return;
    state.busy = true; state.error = null; render();
    try {
      var p = state.proposal;
      // Only what the operator LEFT STANDING is sent. A dropped proposal is
      // never quietly included, and the operator's overrides win over the
      // machine's suggestion on every axis.
      var findings = (p.findings || [])
        .filter(function (_f, i) { return !state.dropped.findings[i]; })
        .map(function (f) {
          return {
            finding_text: f.finding, evidence_text: f.evidence || null,
            is_severe: !!f.severe, long_lead_kind: f.long_lead_kind || null,
            origin: "proposed"
          };
        });
      var work = (p.required_work || [])
        .filter(function (_w, i) { return !state.dropped.work[i]; })
        .map(function (w) { return { work_text: w.work, origin: "proposed" }; });

      var out = await window.__psLive.confirmUnitTriage({
        unitId: state.unitId,
        text: state.text,
        vacancy_observation: state.override.vacancy || p.vacancy,
        initial_condition: state.override.condition || p.initial_condition,
        inspection_completeness: state.override.completeness || p.inspection_completeness,
        findings: findings,
        required_work: work
      });
      state.receipt = (out && out.data && out.data.receipt) || null;
      state.proposal = null;
      // Re-read the surfaces this write changed. No optimistic paint.
      await Promise.all([loadRisk(), loadOpenWalks()]);
    } catch (e) {
      state.error = e;
    } finally {
      state.busy = false; render();
    }
  }

  function renderCapture() {
    if (!authorized()) return signedOutNotice("Initial unit triage");

    var h = '<div class="ut-card">';
    h += '<div class="ut-h">Initial walk</div>';
    h += '<div class="ut-sub">Say what you found. Plain words are fine.</div>';
    h += '<input id="utUnit" class="ut-in" placeholder="Unit id" value="' + esc(state.unitId || "") + '">';
    h += '<textarea id="utText" class="ut-ta" rows="3" placeholder="e.g. 304 is vacant. There are cockroaches, it needs a deep clean, and the refrigerator is missing.">' + esc(state.text || "") + '</textarea>';
    h += '<button id="utPropose" class="ut-btn"' + (state.busy ? " disabled" : "") + '>' +
         (state.busy ? "Reading…" : "Review what Spine understood") + '</button>';

    if (state.error) h += errorNotice(state.error);

    // ── the confirmation card ──
    var p = state.proposal;
    if (p) {
      h += '<div class="ut-confirm">';
      h += '<div class="ut-chip">NOTHING RECORDED YET</div>';
      h += '<div class="ut-h2">You reported</div>';
      h += '<div class="ut-quote">' + esc(state.text) + '</div>';
      h += '<div class="ut-h2">Spine understood</div>';

      var vac = state.override.vacancy || p.vacancy;
      var cond = state.override.condition || p.initial_condition;
      var comp = state.override.completeness || p.inspection_completeness;

      h += '<div class="ut-row"><span class="ut-lbl">Vacancy</span>' +
           '<select id="utVac" class="ut-sel">' +
           opt("vacant", "Confirmed vacant", vac) +
           opt("occupied_or_someone_remains", "Someone remains in the unit", vac) +
           opt("uncertain", "Uncertain", vac) + '</select></div>';

      h += '<div class="ut-row"><span class="ut-lbl">Initial condition</span>' +
           '<select id="utCond" class="ut-sel">' +
           opt("normal_turn", "Normal turn", cond) +
           opt("severe", "Severe", cond) +
           opt("uncertain", "Uncertain", cond) + '</select></div>';

      h += '<div class="ut-row"><span class="ut-lbl">Inspection</span>' +
           '<select id="utComp" class="ut-sel">' +
           opt("initial_triage", "Initial triage only", comp) +
           opt("complete_inspection", "Complete condition inspection", comp) + '</select></div>';

      if ((p.findings || []).length) {
        h += '<div class="ut-h2">Findings</div>';
        (p.findings || []).forEach(function (f, i) {
          var off = !!state.dropped.findings[i];
          h += '<div class="ut-item' + (off ? " ut-off" : "") + '">' +
               '<button class="ut-x" data-drop="findings" data-i="' + i + '">' + (off ? "undo" : "remove") + '</button>' +
               '<span>' + esc(f.finding) + '</span>' +
               (f.evidence ? '<span class="ut-ev">from “' + esc(f.evidence) + '”</span>' : "") +
               '</div>';
        });
      }

      if ((p.long_lead_blockers || []).length) {
        h += '<div class="ut-h2">Long-lead blockers</div>';
        (p.long_lead_blockers || []).forEach(function (b) {
          h += '<div class="ut-item ut-ll">' + esc(b.label || b.kind) + '</div>';
        });
      }

      if ((p.required_work || []).length) {
        h += '<div class="ut-h2">Required work</div>';
        (p.required_work || []).forEach(function (w, i) {
          var off = !!state.dropped.work[i];
          h += '<div class="ut-item' + (off ? " ut-off" : "") + '">' +
               '<button class="ut-x" data-drop="work" data-i="' + i + '">' + (off ? "undo" : "remove") + '</button>' +
               '<span>' + esc(w.work) + '</span></div>';
        });
      }

      // What the server could NOT conclude. Shown, never hidden — this is the
      // part an operator most needs to see before they put their name on it.
      if ((p.uncertainties || []).length) {
        h += '<div class="ut-h2">Still unknown</div>';
        (p.uncertainties || []).forEach(function (u) {
          h += '<div class="ut-unk">' + esc(u) + '</div>';
        });
      }

      if (state.nextMoveIn) {
        h += '<div class="ut-movein"><strong>Next move-in:</strong> ' +
             esc(state.nextMoveIn.move_in_date) + ' — ' +
             esc(String(state.nextMoveIn.days_remaining)) + ' days remaining</div>';
      }

      h += '<button id="utConfirm" class="ut-btn ut-primary"' + (state.busy ? " disabled" : "") + '>' +
           (state.busy ? "Recording…" : "Confirm") + '</button>';
      h += '</div>';
    }

    // ── the receipt ──
    if (state.receipt) {
      var r = state.receipt;
      h += '<div class="ut-receipt"><div class="ut-h2">Recorded</div>';
      h += '<div><strong>' + esc(r.unit) + '</strong></div>';
      h += '<div class="ut-quote">' + esc(r.you_reported) + '</div>';
      h += line("Vacancy", r.vacancy) + line("Condition", r.condition) +
           line("Inspection", r.inspection) + line("Readiness", r.readiness);
      if ((r.findings_recorded || []).length)
        h += '<div class="ut-h3">Findings recorded</div>' + list(r.findings_recorded);
      if ((r.required_work_created || []).length)
        h += '<div class="ut-h3">Required work created</div>' + list(r.required_work_created);
      h += line("Accountable owner", r.accountable_owner);
      if (r.next_move_in) h += line("Next move-in", r.next_move_in);
      if ((r.what_happens_next || []).length)
        h += '<div class="ut-h3">What happens next</div>' + list(r.what_happens_next);
      if (r.standing_caveat) h += '<div class="ut-unk">' + esc(r.standing_caveat) + '</div>';
      h += '</div>';
    }

    return h + '</div>';
  }

  function opt(v, label, cur) {
    return '<option value="' + v + '"' + (v === cur ? " selected" : "") + '>' + esc(label) + '</option>';
  }
  function line(k, v) {
    return '<div class="ut-row"><span class="ut-lbl">' + esc(k) + '</span><span>' + esc(v == null ? "—" : v) + '</span></div>';
  }
  function list(arr) {
    return '<ul class="ut-ul">' + (arr || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  }

  // ══════════════════════════════════════════════════════════════
  //  2. OPEN INITIAL WALKS
  // ══════════════════════════════════════════════════════════════

  async function loadOpenWalks() {
    if (!authorized()) return;
    try {
      var out = await window.__psLive.unitTriageOpenWalks();
      state.openWalks = (out && out.data) || null;
    } catch (e) { state.openWalks = { __error: e }; }
  }

  function renderOpenWalks() {
    if (!authorized()) return signedOutNotice("Open initial walks");
    var d = state.openWalks;
    if (!d) return '<div class="ut-empty">Loading…</div>';
    if (d.__error) return errorNotice(d.__error);
    if (!d.count) return '<div class="ut-empty">No initial walks outstanding.</div>';

    var h = '<div class="ut-card"><div class="ut-h">Initial walks outstanding (' + d.count + ')</div>';
    (d.open_walks || []).forEach(function (w) {
      h += '<div class="ut-item' + (w.overdue ? " ut-overdue" : "") + '">' +
        '<strong>Unit ' + esc(w.unit_number || w.unit_id) + '</strong> — ' + esc(w.label) +
        '<div class="ut-meta">Owner: ' +
        (w.owner === "UNASSIGNED"
          ? '<span class="ut-unassigned">UNASSIGNED</span>'
          : esc((w.owner && w.owner.name) || "assigned")) +
        (w.overdue ? ' · <span class="ut-late">overdue</span>' : "") +
        '</div></div>';
    });
    return h + "</div>";
  }

  // ══════════════════════════════════════════════════════════════
  //  3. MANAGEMENT RISK READ
  // ══════════════════════════════════════════════════════════════

  async function loadRisk() {
    if (!authorized()) return;
    try {
      var out = await window.__psLive.unitTriageRisk();
      state.risk = (out && out.data) || null;
    } catch (e) { state.risk = { __error: e }; }
  }

  function renderRisk() {
    if (!authorized()) return signedOutNotice("The unit risk read");
    var d = state.risk;
    if (!d) return '<div class="ut-empty">Loading…</div>';
    if (d.__error) return errorNotice(d.__error);
    if (!d.count) return '<div class="ut-empty">No units in triage at this property.</div>';

    var hl = d.headline || {};
    var h = '<div class="ut-card"><div class="ut-h">Unit risk</div><div class="ut-hl">' +
      pill("Walks outstanding", hl.walks_outstanding) +
      pill("Vacancy uncertain", hl.vacancy_uncertain) +
      pill("Severe", hl.severe) +
      pill("Move-ins at risk", hl.move_ins_at_risk) +
      pill("Unassigned decisions", hl.unassigned_manager_decisions) +
      "</div>";

    (d.units || []).forEach(function (u) {
      h += '<div class="ut-unit">';
      h += '<div class="ut-unit-h"><strong>Unit ' + esc(u.unit_number || u.unit_id) + '</strong>' +
           (u.severe ? ' <span class="ut-sev">SEVERE</span>' : "") +
           (u.vacancy_uncertain ? ' <span class="ut-sev">VACANCY UNCERTAIN</span>' : "") +
           (u.move_in_at_risk ? ' <span class="ut-sev">MOVE-IN AT RISK</span>' : "") +
           "</div>";
      h += line("Condition", u.condition_label);
      h += line("Readiness", u.readiness_label);
      if ((u.open_scope || []).length) { h += '<div class="ut-h3">Open scope</div>' + list(u.open_scope); }
      if ((u.long_lead_blockers || []).length) {
        h += '<div class="ut-h3">Long-lead blockers</div>' +
             list((u.long_lead_blockers || []).map(function (b) { return b.label + " — " + b.finding; }));
      }
      if (u.next_move_in) {
        h += line("Next move-in", u.next_move_in.move_in_date +
             " — " + u.next_move_in.days_remaining + " days remaining");
      }
      h += line("Scope owner", ownerText(u.scope_owner));
      if (u.manager_decision_owner) h += line("Manager decision", ownerText(u.manager_decision_owner));
      if (u.possession_exception_owner) h += line("Possession exception", ownerText(u.possession_exception_owner));
      if (u.next_decision) h += '<div class="ut-next"><strong>Next:</strong> ' + esc(u.next_decision) + "</div>";
      h += "</div>";
    });
    return h + "</div>";
  }

  function ownerText(o) {
    if (!o) return "—";
    if (o === "UNASSIGNED") return "UNASSIGNED";
    return (o && o.name) || "assigned";
  }
  function pill(label, n) {
    return '<span class="ut-pill' + (n ? " ut-pill-on" : "") + '">' + esc(label) + ": " + (n == null ? "—" : n) + "</span>";
  }

  // ══════════════════════════════════════════════════════════════
  //  MOUNT
  // ══════════════════════════════════════════════════════════════

  function mountPoints() {
    return {
      capture: document.getElementById("psUnitTriageCapture"),
      walks: document.getElementById("psUnitTriageWalks"),
      risk: document.getElementById("psUnitTriageRisk")
    };
  }

  function render() {
    var m = mountPoints();
    if (m.capture) m.capture.innerHTML = renderCapture();
    if (m.walks) m.walks.innerHTML = renderOpenWalks();
    if (m.risk) m.risk.innerHTML = renderRisk();
    wire();
  }

  function wire() {
    var pb = document.getElementById("utPropose");
    if (pb) pb.onclick = function () {
      var u = (document.getElementById("utUnit") || {}).value;
      var t = (document.getElementById("utText") || {}).value;
      if (!u || !t || !String(t).trim()) { state.error = { message: "Enter a unit and what you saw." }; render(); return; }
      propose(String(u).trim(), String(t));
    };
    var cb = document.getElementById("utConfirm");
    if (cb) cb.onclick = confirm;

    ["utVac", "utCond", "utComp"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.onchange = function () {
        state.override[id === "utVac" ? "vacancy" : id === "utCond" ? "condition" : "completeness"] = el.value;
      };
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-drop]"), function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-drop"), i = b.getAttribute("data-i");
        state.dropped[k][i] = !state.dropped[k][i];
        render();
      };
    });
  }

  async function boot() {
    if (!authorized()) { render(); return; }
    await Promise.all([loadRisk(), loadOpenWalks()]);
    render();
  }

  window.__psUnitTriage = { boot: boot, render: render, propose: propose, confirm: confirm, _state: state };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
