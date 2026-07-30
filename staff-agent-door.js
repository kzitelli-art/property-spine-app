"use strict";

// PROPERTY SPINE — AUTHENTICATED STAFF AGENT (BUILD 5)
//
// A mobile-first conversation. Type what you saw; confirm once.
//
// ── LIVE-ONLY, BY CONSTRUCTION ──────────────────────────────────────
// Every call goes through window.__psLive to the pinned production origin with
// the staff-session header. Never demoRespond(). No session → sign-in notice.
//
// ── THIS SURFACE WRITES NOTHING ─────────────────────────────────────
// Sending a message produces a PROPOSAL. Only Confirm reaches a canonical
// service, and the server decides which one. The proposal card carries a
// NOTHING RECORDED YET chip until the operator confirms, and every unknown the
// server could not establish is shown BEFORE the confirm button — confirming
// something you were not told was uncertain is not consent.
(function () {
  if (window.__psStaffAgentDoorV1) return;
  window.__psStaffAgentDoorV1 = true;

  var state = { thread: null, messages: [], proposals: [], draft: "", photo: "",
                busy: false, error: null, lastReply: null };

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
  function errorNotice(e) {
    var msg = (e && (e.publicMessage || e.message)) || "The live call failed.";
    var extra = (e && e.body && (e.body.clarification || e.body.use_instead)) || "";
    return '<div class="ut-error"><strong>Not recorded.</strong> ' + esc(msg) +
      (extra ? '<div class="ut-note">' + esc(extra) + "</div>" : "") + "</div>";
  }

  async function load() {
    if (!authorized()) return;
    try {
      var out = await window.__psLive.staffAgentThread();
      var d = (out && out.data) || {};
      state.thread = d.thread || null;
      state.messages = d.messages || [];
      state.proposals = d.proposals || [];
    } catch (e) { state.error = e; }
  }

  async function send() {
    if (!state.draft.trim()) return;
    state.busy = true; state.error = null; render();
    try {
      var out = await window.__psLive.staffAgentMessage({
        text: state.draft,
        photos: state.photo ? [state.photo] : [],
      });
      state.lastReply = (out && out.data) || null;
      state.draft = ""; state.photo = "";
      await load();
    } catch (e) { state.error = e; }
    finally { state.busy = false; render(); }
  }

  async function act(id, verb) {
    state.busy = true; state.error = null; render();
    try {
      var out = verb === "confirm"
        ? await window.__psLive.confirmAgentProposal({ proposalId: id })
        : await window.__psLive.cancelAgentProposal({ proposalId: id });
      state.lastReply = (out && out.data) || null;
      await load();
    } catch (e) { state.error = e; }
    finally { state.busy = false; render(); }
  }

  function proposalFor(messageId) {
    for (var i = state.proposals.length - 1; i >= 0; i--) {
      if (String(state.proposals[i].message_id) === String(messageId)) return state.proposals[i];
    }
    return null;
  }

  function renderProposal(p) {
    if (!p) return "";
    if (p.status === "cancelled") return '<div class="ut-unk">Cancelled. Nothing was recorded.</div>';
    if (p.status === "confirmed") {
      var s = p.resulting_summary || {};
      var h = '<div class="ut-receipt"><div class="ut-h3">Recorded</div>';
      (s.findings || []).forEach(function (f) { h += '<div class="ut-item">' + esc(f) + "</div>"; });
      (s.required_work || []).forEach(function (w) { h += '<div class="ut-item">' + esc(w) + "</div>"; });
      if (s.readiness) h += '<div class="ut-unk">' + esc(s.readiness) + "</div>";
      if (s.due) h += '<div class="ut-unk">Due: ' + esc(s.due) + "</div>";
      if (s.proof_required) h += '<div class="ut-unk">Proof required: ' + esc(s.proof_required) + "</div>";
      if (s.closed === false && s.shortfall) h += '<div class="ut-unk">Not closed — ' + esc(s.shortfall) + "</div>";
      if (s.next_action) h += '<div class="ut-next"><strong>Next:</strong> ' + esc(s.next_action) + "</div>";
      if (s.owner) h += '<div class="ut-unk">Owner: ' + esc(s.owner) + "</div>";
      if (s.next_move_in) h += '<div class="ut-unk">Next committed move-in: ' + esc(s.next_move_in) + "</div>";
      if (s.manager_decision) h += '<div class="ut-sev">Manager decision required</div>';
      // The link to where this truth now lives.
      if (p.unit_id) h += '<div class="ut-ev">Unit record: ' + esc(p.unit_id) + "</div>";
      return h + "</div>";
    }
    // ONE operator concept. The server collapsed `clarification_required` and
    // `unclear` into a single answer-one-question state; this reads that.
    if (p.needs_clarification) {
      return '<div class="ut-confirm"><div class="ut-chip">' + esc(p.status_label || "Needs clarification") + "</div>" +
        '<div class="ut-unk"><strong>' + esc(p.clarification || "One question first.") + "</strong></div>" +
        (p.unknowns || []).map(function (u) { return '<div class="ut-unk">' + esc(u) + "</div>"; }).join("") +
        '<div class="ut-note">Nothing has been recorded.</div></div>';
    }
    // proposed
    var pr = p.proposed || {};
    var h2 = '<div class="ut-confirm"><div class="ut-chip">NOTHING RECORDED YET</div>';
    // Plain operating language, decided by the server. Never a raw intent name.
    h2 += '<div class="ut-h3">' + esc(p.plain_label || "You sent a message") + "</div>";
    Object.keys(pr).forEach(function (k) {
      if (pr[k] === null || pr[k] === undefined || pr[k] === "") return;
      h2 += '<div class="ut-row"><span class="ut-lbl">' + esc(k.replace(/_/g, " ")) + '</span><span>' + esc(pr[k]) + "</span></div>";
    });
    // Unknowns BEFORE the buttons, deliberately.
    (p.unknowns || []).forEach(function (u) { h2 += '<div class="ut-unk">' + esc(u) + "</div>"; });
    h2 += '<button class="ut-btn ut-primary sa-confirm" data-id="' + esc(p.id) + '"' + (state.busy ? " disabled" : "") + ">Confirm</button>";
    h2 += '<button class="ut-btn sa-cancel" data-id="' + esc(p.id) + '">Cancel</button>';
    return h2 + "</div>";
  }

  function renderAll() {
    if (!authorized()) {
      return '<div class="ut-empty"><strong>Not signed in.</strong> The staff agent is a live operator ' +
        'surface and has no offline view. Sign in to use it.</div>';
    }
    var h = '<div class="ut-card"><div class="ut-h">Staff agent</div>' +
      '<div class="ut-sub">Say what you saw. Nothing is recorded until you confirm.</div>';

    state.messages.forEach(function (m) {
      h += '<div class="ut-item' + (m.role === "agent" ? " ut-off" : "") + '">' +
        '<span class="ut-lbl">' + (m.role === "staff" ? "You" : "Spine") + "</span>" +
        "<span>" + esc(m.body) + "</span>" +
        ((m.photos || []).length ? '<span class="ut-ev">photo attached</span>' : "") + "</div>";
      if (m.role === "staff") h += renderProposal(proposalFor(m.id));
    });

    if (state.error) h += errorNotice(state.error);

    // A REDIRECT leaves no proposal by design, so the reply is shown here
    // rather than under the message. Silence would read as "accepted".
    if (state.lastReply && state.lastReply.redirect) {
      h += '<div class="ut-confirm"><div class="ut-unk"><strong>' +
        esc(state.lastReply.redirect.message) + "</strong></div>" +
        '<div class="ut-note">' + esc(state.lastReply.nothing_recorded || "Nothing operating was recorded.") +
        "</div></div>";
    }

    h += '<textarea id="saDraft" class="ut-ta" rows="2" placeholder="e.g. 304 is empty. There are cockroaches and the refrigerator is missing.">' + esc(state.draft) + "</textarea>";
    h += '<input id="saPhoto" class="ut-in" placeholder="Photo reference (optional)" value="' + esc(state.photo) + '">';
    h += '<button id="saSend" class="ut-btn ut-primary"' + (state.busy ? " disabled" : "") + ">" +
      (state.busy ? "Reading…" : "Send") + "</button>";
    return h + "</div>";
  }

  function render() {
    var el = document.getElementById("psStaffAgent");
    if (el) el.innerHTML = renderAll();
    wire();
  }
  function each(s, f) { Array.prototype.forEach.call(document.querySelectorAll(s), f); }

  function wire() {
    var d = document.getElementById("saDraft"); if (d) d.oninput = function () { state.draft = d.value; };
    var p = document.getElementById("saPhoto"); if (p) p.oninput = function () { state.photo = p.value; };
    var s = document.getElementById("saSend"); if (s) s.onclick = send;
    each(".sa-confirm", function (b) { b.onclick = function () { act(b.getAttribute("data-id"), "confirm"); }; });
    each(".sa-cancel", function (b) { b.onclick = function () { act(b.getAttribute("data-id"), "cancel"); }; });
  }

  async function boot() { if (!authorized()) { render(); return; } await load(); render(); }
  window.__psStaffAgent = { boot: boot, render: render, send: send, _state: state };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
