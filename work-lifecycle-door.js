"use strict";

// PROPERTY SPINE — WORK-ORDER LIFECYCLE VISIBILITY
//
// A READ. This surface owns no status, keeps no timeline, and writes
// nothing. Every value on screen comes from /operator/work-orders/:id/status,
// which derives it from canonical rows. There is no second status layer.
//
// ── THE THREE-SECOND READ ───────────────────────────────────────────
//   1  CURRENT TRUTH   what is happening · who is acting · what blocks it
//   2  NEXT ACTION     one line, the thing to do
//   3  PROOF           saved, or still required
//   4  RECENT HISTORY  actor + time + what they said, in order
//
// Rendered in that order, always. A dense event dump is not this surface.
//
// ── FOUR THINGS THAT ARE NEVER THE SAME CHIP ────────────────────────
//   scheduled work · a technician's claim · verified proof · completed work
// They have different colours, different words and different times, because
// flattening them is how a board shows "complete" for work with no proof.
//
// ── LIVE-ONLY, BY CONSTRUCTION ──────────────────────────────────────
// Every call goes through window.__psLive with the staff-session header.
// No fixture path exists in this file. Without a session it renders a
// sign-in message; on a failed read it renders UNAVAILABLE and removes any
// content that was on screen — never a believable empty.
(function () {
  if (window.__psWorkLifecycleDoorV1) return;
  window.__psWorkLifecycleDoorV1 = true;

  var state = { list: null, detail: null, busy: false, error: null, selected: null };

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function authorized() {
    try {
      return window.__psLive && typeof window.__psLive.hasSession === "function"
        && window.__psLive.hasSession();
    } catch (e) { return false; }
  }
  function clockOf(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch (e) { return ""; }
  }

  //  The four states an operator must never see merged. Words and colour
  //  both differ, so they cannot be mistaken for one another at a glance.
  var STATE_LABEL = {
    scheduled: "Scheduled", accepted: "Accepted", en_route: "On the way",
    no_access: "No access", blocked: "Blocked",
    completion_claimed: "Completion claimed", completed: "Completed"
  };
  var STATE_TONE = {
    scheduled: "wl-neutral", accepted: "wl-active", en_route: "wl-active",
    no_access: "wl-warn", blocked: "wl-warn",
    completion_claimed: "wl-claim", completed: "wl-done"
  };
  var KIND_VERB = {
    en_route: "reported on the way", no_access: "reported no access",
    blocked: "reported blocked", finding: "reported",
    completion_claimed: "said the work was finished", completed: "work closed"
  };

  //  DELIVERY IS ITS OWN FACT. "prepared" is not "sent" is not "delivered",
  //  and "unknown" is a real answer the provider has not improved on yet.
  var DELIVERY_LABEL = {
    prepared: "Prepared", sent: "Sent", delivered: "Delivered",
    failed: "Failed", unknown: "Unknown"
  };

  async function loadList() {
    state.busy = true; state.error = null; render();
    try {
      var out = await window.__psLive.workOrderLifecycleList();
      state.list = out; state.error = null;
    } catch (e) {
      //  The prior content GOES. Leaving it on screen under a toast is the
      //  stale-data defect this app has already recorded once.
      state.list = null; state.detail = null; state.error = e;
    } finally { state.busy = false; render(); }
  }

  async function loadDetail(id) {
    state.busy = true; state.error = null; state.selected = id; render();
    try {
      state.detail = await window.__psLive.workOrderLifecycle({ workOrderId: id });
    } catch (e) { state.detail = null; state.error = e; }
    finally { state.busy = false; render(); }
  }

  function unavailableNotice(err) {
    var msg = (err && (err.message || err.detail)) || "The live read failed.";
    return '<div class="wl-unavailable" data-wl="unavailable">'
      + '<div class="wl-unavailable-title">Work-order status is unavailable</div>'
      + '<div class="wl-unavailable-body">' + esc(msg) + '</div>'
      + '<button class="wl-retry" data-wl-retry="1">Retry</button>'
      + "</div>";
  }

  function nameOf(w) {
    var unit = w.unit_number ? "Unit " + w.unit_number + " " : "";
    var title = w.title || ("Work Order " + (w.reference == null ? "" : w.reference));
    return unit + title;
  }

  function chip(text, tone) {
    return '<span class="wl-chip ' + tone + '">' + esc(text) + "</span>";
  }

  function detailHtml(d) {
    var h = "";
    var c = d.current;

    // ── 1. CURRENT TRUTH ─────────────────────────────────────────────
    h += '<section class="wl-block" data-wl="current">';
    h += '<h4 class="wl-h">Current</h4>';
    h += '<div class="wl-current">';
    h += chip(STATE_LABEL[c.state] || c.state, STATE_TONE[c.state] || "wl-neutral");
    //  §5 — UNASSIGNED is a word on the screen, not a blank.
    h += c.accountable === "UNASSIGNED"
      ? '<span class="wl-unassigned" data-wl="unassigned">UNASSIGNED</span>'
      : '<span class="wl-actor">' + esc(c.accountable.name) + "</span>";
    h += "</div>";
    if (c.blocked) {
      h += '<div class="wl-line wl-warn-text" data-wl="blocked">'
        + esc(c.blocked.reason === "no_access" ? "No access reported" : "Blocked")
        + " · " + esc(clockOf(c.blocked.since)) + "</div>";
    }
    if (c.accepted_at) h += '<div class="wl-line wl-muted">Accepted ' + esc(clockOf(c.accepted_at)) + "</div>";
    if (c.en_route_at) h += '<div class="wl-line wl-muted">On the way ' + esc(clockOf(c.en_route_at)) + "</div>";
    //  A CLAIM IS LABELLED A CLAIM. Never rendered as completion.
    if (c.latest_finding) {
      h += '<div class="wl-line" data-wl="finding">'
        + '<span class="wl-claimtag">unverified claim</span> '
        + esc(c.latest_finding.note) + ' <span class="wl-muted">— ' + esc(c.latest_finding.by) + "</span></div>";
    }
    if (c.completion_claimed_at && !c.completed_at) {
      h += '<div class="wl-line wl-claim-text" data-wl="claimed">Technician says finished · '
        + esc(clockOf(c.completion_claimed_at)) + " — not closed</div>";
    }
    if (c.completed_at) {
      h += '<div class="wl-line wl-done-text" data-wl="completed">Closed ' + esc(clockOf(c.completed_at))
        + (c.completed_by ? " by " + esc(c.completed_by.name) : "") + "</div>";
    }
    h += "</section>";

    // ── 2. NEXT ACTION ───────────────────────────────────────────────
    if (d.next_action) {
      h += '<section class="wl-block" data-wl="next"><h4 class="wl-h">Next</h4>'
        + '<div class="wl-next">' + esc(d.next_action) + "</div></section>";
    }

    // ── 3. PROOF ─────────────────────────────────────────────────────
    h += '<section class="wl-block" data-wl="proof"><h4 class="wl-h">Proof</h4>';
    if (d.proof.satisfied) {
      h += '<div class="wl-proof-ok" data-wl="proof-ok">Repair photo saved</div>';
    } else {
      h += '<div class="wl-proof-missing" data-wl="proof-missing">Photo still required before completion</div>';
    }
    //  "a photo we could not keep" is not "no photo", and it is not proof.
    if (d.proof.not_preserved_count > 0) {
      h += '<div class="wl-line wl-warn-text" data-wl="proof-lost">'
        + esc(d.proof.not_preserved_count) + " photo(s) received but not preserved</div>";
    }
    h += "</section>";

    // ── RESIDENT COMMUNICATION — operating vs delivery, side by side ──
    if (d.resident_update && d.resident_update.length) {
      h += '<section class="wl-block" data-wl="resident"><h4 class="wl-h">Resident updates</h4>';
      d.resident_update.forEach(function (r) {
        h += '<div class="wl-line" data-wl="resident-row">'
          + '<span class="wl-muted">' + esc(clockOf(r.prepared_at)) + "</span> "
          + esc(r.text)
          + ' <span class="wl-delivery wl-d-' + esc(r.delivery.state) + '" data-wl-delivery="'
          + esc(r.delivery.state) + '">' + esc(DELIVERY_LABEL[r.delivery.state] || r.delivery.state)
          + "</span></div>";
      });
      h += "</section>";
    }

    // ── 4. RECENT HISTORY ────────────────────────────────────────────
    if (d.history && d.history.length) {
      h += '<section class="wl-block" data-wl="history"><h4 class="wl-h">History</h4>';
      d.history.slice().reverse().forEach(function (p) {
        h += '<div class="wl-hist" data-wl-kind="' + esc(p.kind) + '">'
          + '<span class="wl-muted">' + esc(clockOf(p.at)) + "</span> · "
          + esc(p.actor) + " " + esc(KIND_VERB[p.kind] || p.kind)
          + (p.note && p.kind === "finding" ? ": " + esc(p.note) : "")
          + "</div>";
      });
      h += "</section>";
    }
    return h;
  }

  function render() {
    var host = document.getElementById("work-lifecycle-door");
    if (!host) return;

    if (!authorized()) {
      host.innerHTML = '<div class="wl-signin" data-wl="signin">Sign in to see work-order status.</div>';
      return;
    }

    var h = '<div class="wl-root">';
    h += '<div class="wl-head"><h3>Work orders</h3>'
      + '<button class="wl-refresh" data-wl-refresh="1">Refresh</button></div>';

    if (state.error) {
      //  UNAVAILABLE, and nothing else. No list, no detail, no sample.
      h += unavailableNotice(state.error);
      h += "</div>";
      host.innerHTML = h;
      wire(host);
      return;
    }

    if (state.busy && !state.list) h += '<div class="wl-line wl-muted">Loading…</div>';

    if (state.list) {
      if (!state.list.count) {
        //  HONEST EMPTY — a fact about this property, not a reassurance.
        h += '<div class="wl-empty" data-wl="empty">No work orders at this property.</div>';
      } else {
        h += '<ul class="wl-list">';
        state.list.work_orders.forEach(function (row) {
          var sel = state.selected === row.work_order.id ? " wl-sel" : "";
          h += '<li class="wl-item' + sel + '" data-wl-open="' + esc(row.work_order.id) + '">'
            + '<div class="wl-item-name">' + esc(nameOf(row.work_order)) + "</div>"
            + '<div class="wl-item-chips">'
            + chip(STATE_LABEL[row.current.state] || row.current.state,
                   STATE_TONE[row.current.state] || "wl-neutral")
            + (row.current.accountable === "UNASSIGNED"
                ? '<span class="wl-unassigned">UNASSIGNED</span>'
                : '<span class="wl-actor">' + esc(row.current.accountable.name) + "</span>")
            + (row.proof.satisfied ? chip("Proof", "wl-done") : chip("Proof needed", "wl-warn"))
            + "</div>"
            + (row.next_action ? '<div class="wl-item-next">' + esc(row.next_action) + "</div>" : "")
            + "</li>";
        });
        h += "</ul>";
      }
    }

    if (state.detail) h += '<div class="wl-detail">' + detailHtml(state.detail) + "</div>";
    h += "</div>";
    host.innerHTML = h;
    wire(host);
  }

  function wire(host) {
    var r = host.querySelector("[data-wl-refresh]");
    if (r) r.onclick = function () { state.detail = null; state.selected = null; loadList(); };
    var retry = host.querySelector("[data-wl-retry]");
    if (retry) retry.onclick = function () { loadList(); };
    Array.prototype.forEach.call(host.querySelectorAll("[data-wl-open]"), function (el) {
      el.onclick = function () { loadDetail(el.getAttribute("data-wl-open")); };
    });
  }

  window.__psWorkLifecycleDoor = { render: render, loadList: loadList, loadDetail: loadDetail, _state: state };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else { render(); }
})();
