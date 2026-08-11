"use strict";

// PROPERTY SPINE — ASSET MANAGEMENT
//
// The FOURTH operating door, beside Leasing, Management and Maintenance.
// Staff/operator side. This is where the economic structure and economic
// performance of a property become operable.
//
// It is NOT the Owner / Investor surface. That is a later, different
// audience — potentially a different login — and it does not live here.
//
// ── IT LOOKS LIKE LEASING BECAUSE IT REUSES LEASING ──────────────────
// The home is the same 2×2 door grid Leasing uses, built from the SAME
// classes: .maint-primary-grid.le-doors, .maint-command-card,
// .maint-card-kicker, h3, p, .maint-card-open. Not a copy of them — the
// actual shared rules.
//
// That is deliberate and it is the cheap way to stay honest. A parallel
// am-* card system would drift the first time anyone touched Leasing's
// spacing, and the two desks would slowly stop looking like one product
// with nobody noticing. Only the panel chrome, the establishment chip and
// the room view carry their own CSS, because Leasing has no equivalent.
//
// ── THE HOME IS A DESK, NOT A REPORT ─────────────────────────────────
// An earlier revision put the whole explanation of what was missing on
// each home card: four stacked essays of equal weight, with the hierarchy
// buried underneath them. It read like a setup audit.
//
// The home now answers one question in three seconds — REVENUE · CAPITAL ·
// PROPERTY OBLIGATIONS · OPERATING COSTS — and each card carries only an
// eyebrow, the room name, one sentence, one honest establishment chip and
// one open action. Everything else is progressive disclosure and lives
// inside the room, where it becomes setup guidance instead of noise.
//
// ── NO FABRICATED ECONOMICS. THIS IS STILL THE RULE OF THE FILE ──────
// No amount, no currency, no chart, no placeholder metric, no sample row.
// The server sends none and there is no fixture path here to invent any.
// The truth model did not change when the presentation did.
//
// ── LIVE-ONLY, BY CONSTRUCTION ──────────────────────────────────────
// Every call goes through window.__psLive with the staff-session header.
// Without a session it renders a sign-in line; on a failed read it renders
// UNAVAILABLE and REMOVES the content that was on screen.
(function () {
  if (window.__psAssetManagementDoor) return;
  window.__psAssetManagementDoor = true;

  //  view: 'home' | a room key. The only navigation state this door has.
  var state = { busy: false, error: null, data: null, view: "home" };

  function hasSession() {
    return !!(window.__psLive && typeof window.__psLive.hasSession === "function"
      && window.__psLive.hasSession());
  }

  //  __psLive returns the loader's envelope — { data, meta } — for every
  //  read. The server payload is data. Unwrap once, here, the way every
  //  other door does.
  function payload(o) { return (o && o.data) || null; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  //  Operator words, not status words. An unknown token renders as unknown
  //  rather than guessing something reassuring.
  function estLabel(token) {
    if (token === "established") return { text: "Established", tone: "ok" };
    if (token === "partially_established") return { text: "Partially established", tone: "part" };
    if (token === "not_established") return { text: "Setup not established", tone: "none" };
    return { text: "Establishment unknown", tone: "none" };
  }

  function rooms() { return (state.data && state.data.rooms) || []; }
  function roomBy(key) { return rooms().filter(function (r) { return r.key === key; })[0] || null; }

  // ── THE HOME CARD ───────────────────────────────────────────────────
  //  Leasing's grammar exactly: kicker → h3 → p, then the card's own body,
  //  then .maint-card-open pinned to the bottom by margin-top:auto.
  function cardHtml(room) {
    var est = estLabel(room.establishment);
    return ''
      + '<div class="maint-command-card am-card" role="button" tabindex="0"'
      +      ' data-am-room="' + esc(room.key) + '"'
      +      ' onclick="amOpenRoom(\'' + esc(room.key) + '\')"'
      +      ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();amOpenRoom(\'' + esc(room.key) + '\')}">'
      +   '<div class="maint-card-top"><div>'
      +     '<div class="maint-card-kicker">' + esc((room.eyebrow || room.covers || []).join(" · ")) + '</div>'
      +     '<h3>' + esc(room.label) + '</h3>'
      +     '<p>' + esc(room.belongs || "") + '</p>'
      +   '</div></div>'
      //  The one honest indicator, and one short line under it. Never the
      //  full account of what is missing — that is inside the room.
      +   '<div class="am-est-block">'
      +     '<span class="am-chip am-chip-' + esc(est.tone) + '" data-am-est="' + esc(room.establishment) + '">'
      +       esc(est.text)
      +     '</span>'
      +     '<p class="am-est-summary">' + esc(room.establishment_summary || "") + '</p>'
      +   '</div>'
      +   '<div class="maint-card-open">Open ' + esc(room.label) + ' →</div>'
      + '</div>';
  }

  function homeHtml() {
    return ''
      + '<section class="maint-primary-grid le-doors am-doors" data-am-view="home">'
      +   rooms().map(cardHtml).join("")
      + '</section>'
      //  The "today / current position" strip belongs HERE, above the
      //  doors, once there are real facts to put in it. It is deliberately
      //  absent rather than stubbed: an empty strip trains the eye to
      //  ignore the place the first real number will appear.
      + (state.data && state.data.scope_note
          ? '<p class="am-scope" data-am-scope-note="1">' + esc(state.data.scope_note) + '</p>'
          : '');
  }

  // ── THE ROOM ────────────────────────────────────────────────────────
  //  Where the detail earns its place. This is the setup guidance the home
  //  card deliberately withholds.
  function roomHtml(room) {
    var est = estLabel(room.establishment);
    return ''
      + '<div class="am-room-view" data-am-view="room" data-am-room-open="' + esc(room.key) + '">'
      +   '<button class="am-back" type="button" onclick="amOpenHome()">← Asset Management</button>'
      +   '<div class="maint-card-kicker am-room-eyebrow">' + esc((room.covers || []).join(" · ")) + '</div>'
      +   '<h2 class="am-room-name">' + esc(room.label) + '</h2>'
      +   '<p class="am-room-belongs">' + esc(room.belongs || "") + '</p>'
      +   '<span class="am-chip am-chip-' + esc(est.tone) + '" data-am-est="' + esc(room.establishment) + '">'
      +     esc(est.text) + '</span>'
      +   '<div class="am-room-detail">'
      +     '<p class="am-why">' + esc(room.why || "") + '</p>'
      +     (room.what_would_establish_it
          ? '<div class="am-field"><span class="am-field-label">What would establish it</span>'
            + esc(room.what_would_establish_it) + '</div>' : '')
      +     '<div class="am-field"><span class="am-field-label">Owner</span>'
      +       esc(room.owner || "UNASSIGNED") + '</div>'
      +   '</div>'
      + '</div>';
  }

  function render() {
    var host = document.getElementById("assetManagementBody");
    if (!host) return;

    if (!hasSession()) {
      host.innerHTML = '<div class="am-note" data-am-state="signed_out">Sign in to open Asset Management.</div>';
      return;
    }
    if (state.busy) {
      host.innerHTML = '<div class="am-note" data-am-state="loading">Loading…</div>';
      return;
    }
    //  CONTENT GOES. An error never leaves rooms standing underneath it,
    //  and it says it is a failed read rather than an empty property —
    //  those are different facts and must not render the same.
    if (state.error) {
      host.innerHTML = '<div class="am-note am-unavailable" data-am-state="unavailable">'
        + 'Asset Management is unavailable right now. Nothing has been changed. '
        + 'This is a failed read, not an empty property.</div>';
      return;
    }
    if (!rooms().length) {
      host.innerHTML = '<div class="am-note" data-am-state="empty">Asset Management returned no rooms.</div>';
      return;
    }

    if (state.view !== "home") {
      var r = roomBy(state.view);
      //  A room key with no room behind it returns home rather than
      //  rendering a blank shell.
      if (!r) { state.view = "home"; return render(); }
      host.innerHTML = roomHtml(r);
      return;
    }
    host.innerHTML = homeHtml();
  }

  async function load() {
    state.busy = true; state.error = null; render();
    try {
      state.data = payload(await window.__psLive.assetManagementOverview());
    } catch (e) {
      state.data = null;
      state.error = e;
    } finally {
      state.busy = false;
      render();
    }
  }

  function open() {
    var panel = document.getElementById("assetManagementPanel");
    if (!panel) return;
    panel.classList.remove("hidden");
    document.body.classList.add("asset-management-mode");
    //  Entering the door always lands on the desk, never on the last room
    //  someone opened. Work Orders shipped that defect once: render()
    //  preferred a standing detail, so re-entry dropped the operator on a
    //  job instead of the queue.
    state.view = "home";
    render();
    if (hasSession()) load();
  }

  function close() {
    var panel = document.getElementById("assetManagementPanel");
    if (panel) panel.classList.add("hidden");
    document.body.classList.remove("asset-management-mode");
    state.view = "home";
  }

  function openRoom(key) { state.view = key; render(); }
  function openHome() { state.view = "home"; render(); }

  //  The card's inline handlers need these on window; the door's own API
  //  stays namespaced.
  window.amOpenRoom = openRoom;
  window.amOpenHome = openHome;
  window.__psAssetManagement = { open: open, close: close, reload: load, openRoom: openRoom, openHome: openHome };
})();
