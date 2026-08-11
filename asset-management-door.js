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
// ── WHAT THIS SLICE IS ──────────────────────────────────────────────
// A SHELL. Four rooms, and an honest statement of whether each one's
// economic setup is established:
//
//     REVENUE · CAPITAL · PROPERTY OBLIGATIONS · OPERATING COSTS
//
// The purpose is to get the hierarchy into the product so it can be
// clicked and felt before the rooms are furnished.
//
// ── NO FABRICATED ECONOMICS. THIS IS THE RULE OF THE FILE ───────────
// This door renders no amount, no currency, no chart, no placeholder
// metric and no sample row. It cannot: the server sends none, and there
// is no fixture path in this file to invent any. A room whose economics
// are not established SAYS SO, in plain language, and says what would
// establish it. An honest blank beats a confident wrong, and at this
// altitude a fake dollar is the most expensive kind of wrong.
//
// ── LIVE-ONLY, BY CONSTRUCTION ──────────────────────────────────────
// Every call goes through window.__psLive with the staff-session header.
// No fixture path exists here. Without a session it renders a sign-in
// line; on a failed read it renders UNAVAILABLE and REMOVES the content
// that was on screen, because leaving stale rooms under a toast is the
// defect this app has already recorded once.
//
// ── ESTABLISHMENT IS THE SERVER'S ANSWER, NOT THIS FILE'S ───────────
// The door never decides whether a room is established. It renders what
// the server derived. There is no second interpretation layer here to
// drift out of sync with the first.
(function () {
  if (window.__psAssetManagementDoor) return;
  window.__psAssetManagementDoor = true;

  var state = { open: false, busy: false, error: null, data: null };

  function hasSession() {
    return !!(window.__psLive && typeof window.__psLive.hasSession === "function"
      && window.__psLive.hasSession());
  }

  //  __psLive returns the loader's envelope — { data, meta } — for every
  //  read. The server payload is data. Unwrap once, here, the way every
  //  other door does; reading the envelope as the payload is invisible
  //  against a stub returning bare JSON and empty against the real loader.
  function payload(o) { return (o && o.data) || null; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ── ESTABLISHMENT LANGUAGE ──────────────────────────────────────────
  //  Operator words, not status words. The server sends a state token; the
  //  operator reads a sentence. Nothing here invents meaning the server did
  //  not send — an unknown token renders as unknown rather than guessing.
  function establishmentLine(token) {
    if (token === "established") return { text: "Established", tone: "ok" };
    if (token === "partially_established") return { text: "Partially established", tone: "part" };
    if (token === "not_established") return { text: "Not established yet", tone: "none" };
    return { text: "Establishment unknown", tone: "none" };
  }

  function roomHtml(room) {
    var est = establishmentLine(room.establishment);
    return ''
      + '<section class="am-room" data-am-room="' + esc(room.key) + '">'
      +   '<header class="am-room-head">'
      +     '<h3 class="am-room-title">' + esc(room.label) + '</h3>'
      +     '<span class="am-est am-est-' + esc(est.tone) + '" data-am-est="' + esc(room.establishment) + '">'
      +       esc(est.text)
      +     '</span>'
      +   '</header>'
      //  What the room is FOR. Plain nouns, so the hierarchy is legible
      //  before any of it works.
      +   '<p class="am-covers">' + esc((room.covers || []).join("  ·  ")) + '</p>'
      //  Why Spine cannot stand behind it, and what would change that.
      //  This is the Exposure contract in operator language.
      +   '<p class="am-why">' + esc(room.why || "") + '</p>'
      +   (room.what_would_establish_it
            ? '<p class="am-next"><span class="am-next-label">What would establish it</span>'
              + esc(room.what_would_establish_it) + '</p>'
            : '')
      +   '<p class="am-owner"><span class="am-next-label">Owner</span>' + esc(room.owner || "UNASSIGNED") + '</p>'
      + '</section>';
  }

  function render() {
    var host = document.getElementById("assetManagementBody");
    if (!host) return;

    if (!hasSession()) {
      host.innerHTML = '<div class="am-note" data-am-state="signed_out">'
        + 'Sign in to open Asset Management.</div>';
      return;
    }
    if (state.busy) {
      host.innerHTML = '<div class="am-note" data-am-state="loading">Loading…</div>';
      return;
    }
    //  CONTENT GOES. An error never leaves rooms standing underneath it.
    if (state.error) {
      host.innerHTML = '<div class="am-note am-unavailable" data-am-state="unavailable">'
        + 'Asset Management is unavailable right now. Nothing has been changed. '
        + 'This is a failed read, not an empty property.</div>';
      return;
    }
    if (!state.data || !state.data.rooms || !state.data.rooms.length) {
      host.innerHTML = '<div class="am-note" data-am-state="empty">'
        + 'Asset Management returned no rooms.</div>';
      return;
    }

    host.innerHTML = state.data.rooms.map(roomHtml).join("")
      + (state.data.scope_note
          ? '<p class="am-scope" data-am-scope-note="1">' + esc(state.data.scope_note) + '</p>'
          : '');
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
    state.open = true;
    document.body.classList.add("asset-management-mode");
    render();
    if (hasSession()) load();
  }

  function close() {
    var panel = document.getElementById("assetManagementPanel");
    if (panel) panel.classList.add("hidden");
    state.open = false;
    document.body.classList.remove("asset-management-mode");
  }

  window.__psAssetManagement = { open: open, close: close, reload: load };
})();
