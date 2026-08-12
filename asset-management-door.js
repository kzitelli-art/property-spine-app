"use strict";

// PROPERTY SPINE — ASSET MANAGEMENT
//
// The FOURTH operating door, beside Leasing, Management and Maintenance.
// Staff/operator side. Where the economic structure and economic
// performance of a property become operable.
//
// It is NOT the Owner / Investor surface. That is a later, different
// audience — potentially a different login — and it does not live here.
//
// ── IT IS A DESK, NOT A MINI-APP ─────────────────────────────────────
// This mounts into #intelStrip inside the normal operator frame, the same
// way Leasing and Maintenance do. It has no masthead of its own, no badge
// pill and no "back to app" — those told the operator, subconsciously,
// that they had LEFT Property Spine and opened a second product. Moving
// from Leasing to Asset Management should feel like walking through
// another door in the same building.
//
// The header is not written here either. setDeskCopy() applies it from
// PS_MODULE_IDENTITY, the one table all four modules read.
//
// ── IT REUSES LEASING'S CARD SYSTEM ──────────────────────────────────
// .maint-primary-grid.le-doors, .maint-command-card, h3, p and
// .maint-card-open are the SHARED rules, not copies. A parallel am-* card
// system would drift the first time anyone touched Leasing's spacing and
// the two desks would stop looking like one product with nobody noticing.
//
// ── THE ROOM IS THE PERMANENT SKELETON ───────────────────────────────
// A room is not an empty-state page waiting to be replaced. It already
// breaks into the compartments it will always have — Property Obligations
// shows Taxes, Insurance, Licenses & Registrations and Compliance today,
// honestly empty — so the operator already understands where Insurance is
// going to live, and so the first real compartment fills a slot that
// already exists instead of triggering a redesign.
//
// ── NO FABRICATED ECONOMICS. STILL THE RULE OF THE FILE ──────────────
// No amount, no currency, no chart, no placeholder metric, no sample row.
// The server sends none and there is no fixture path here to invent any.
//
// ── LIVE-ONLY, BY CONSTRUCTION ───────────────────────────────────────
// Every call goes through window.__psLive with the staff-session header.
// On a failed read it renders UNAVAILABLE and REMOVES what was on screen.
(function () {
  if (window.__psAssetManagementDoor) return;
  window.__psAssetManagementDoor = true;

  //  view: 'home' | a room key. The only navigation state this door has.
  //  view: 'home' | a room key | 'compartment'. When 'compartment',
  //  `compartment` names which one and `compartmentData` holds its own read.
  var state = { busy: false, error: null, data: null, view: "home", host: null,
                compartment: null, compartmentData: null, compartmentError: null };

  //  Which compartments have a surface built. A compartment WITHOUT one
  //  stays a quiet non-control: an arrow that does nothing when clicked is
  //  a worse lie than an arrow that is visibly inert.
  var COMPARTMENT_SURFACES = { insurance: true };

  function hasSession() {
    return !!(window.__psLive && typeof window.__psLive.hasSession === "function"
      && window.__psLive.hasSession());
  }

  //  __psLive returns the loader's envelope — { data, meta }. The server
  //  payload is data. Unwrap once, the way every other door does.
  function payload(o) { return (o && o.data) || null; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  //  Operator words, not setup-software words. "Setup not established" kept
  //  pointing at our machinery; the operator only needs to know whether the
  //  room stands behind anything yet. An unknown token renders as unknown
  //  rather than guessing something reassuring.
  function estLabel(token) {
    if (token === "established") return { text: "Established", tone: "ok" };
    if (token === "partially_established") return { text: "Partially established", tone: "part" };
    if (token === "not_established") return { text: "Not established", tone: "none" };
    return { text: "Establishment unknown", tone: "none" };
  }

  function rooms() { return (state.data && state.data.rooms) || []; }
  function roomBy(k) { return rooms().filter(function (r) { return r.key === k; })[0] || null; }

  // ── THE DESK CARD ───────────────────────────────────────────────────
  //  Leasing's grammar, with the taxonomy demoted: room name first, the
  //  subcategory list beneath it in sentence case at normal tracking, then
  //  the sentence. The name has to win immediately.
  function cardHtml(room) {
    var est = estLabel(room.establishment);
    return ''
      + '<div class="maint-command-card am-card" role="button" tabindex="0"'
      +      ' data-am-room="' + esc(room.key) + '"'
      +      ' onclick="amOpenRoom(\'' + esc(room.key) + '\')"'
      +      ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();amOpenRoom(\'' + esc(room.key) + '\')}">'
      +   '<div class="maint-card-top"><div>'
      +     '<h3>' + esc(room.label) + '</h3>'
      +     '<p class="am-taxonomy">' + esc((room.eyebrow || room.covers || []).join(" · ")) + '</p>'
      +     '<p>' + esc(room.belongs || "") + '</p>'
      +   '</div></div>'
      +   '<div class="am-est-block">'
      +     '<span class="am-chip am-chip-' + esc(est.tone) + '" data-am-est="' + esc(room.establishment) + '">'
      +       esc(est.text) + '</span>'
      +     '<p class="am-est-summary">' + esc(room.establishment_summary || "") + '</p>'
      +   '</div>'
      +   '<div class="maint-card-open">Open ' + esc(room.label) + ' →</div>'
      + '</div>';
  }

  function homeHtml() {
    //  The "today / current position" strip belongs HERE, above the doors,
    //  once there are real facts for it. Deliberately absent rather than
    //  stubbed: an empty strip trains the eye to ignore the place the first
    //  real number will appear.
    return '<div class="am-shell">'
      + '<section class="maint-primary-grid le-doors am-doors" data-am-view="home">'
      +   rooms().map(cardHtml).join("")
      + '</section></div>';
    //  No footer caveat. It used to explain that this door returns no
    //  amounts — developer language leaking into the product. The cards
    //  already say it in the operator's words.
  }

  // ── THE ROOM ────────────────────────────────────────────────────────
  function compartmentHtml(c) {
    var est = estLabel(c.establishment);
    var live = !!COMPARTMENT_SURFACES[c.key];
    //  Only a compartment with a real destination becomes a control. The
    //  rest keep the quiet inert arrow they had — the affordance follows
    //  the destination, never the other way round.
    var interactive = live
      ? ' role="button" tabindex="0" data-am-compartment-live="1"'
        + ' onclick="amOpenCompartment(\'' + esc(c.key) + '\')"'
        + ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();amOpenCompartment(\'' + esc(c.key) + '\')}"'
      : '';
    return ''
      + '<div class="am-compartment' + (live ? ' is-live' : '') + '"'
      +      ' data-am-compartment="' + esc(c.key) + '"' + interactive + '>'
      +   '<div class="am-compartment-main">'
      +     '<h4>' + esc(c.label) + '</h4>'
      +     '<span class="am-chip am-chip-' + esc(est.tone) + '" data-am-est="' + esc(c.establishment) + '">'
      +       esc(est.text) + '</span>'
      +     '<p class="am-compartment-note">' + esc(c.note || "") + '</p>'
      +   '</div>'
      +   '<i aria-hidden="true">→</i>'
      + '</div>';
  }

  function roomHtml(room) {
    //  THE ROOM IS THE SKELETON, AND IT STOPS THERE.
    //
    //  It used to carry a room-level block — what Spine does not hold, what
    //  would establish it, and an UNASSIGNED owner. That is Property
    //  Obligations explaining the setup requirements of all four of its
    //  children at once, which is both more than the operator asked for and
    //  the wrong altitude: when Insurance is built, INSURANCE is where its
    //  own missing sources, documents and next owner get explained.
    //
    //  So the room answers one question and stops:
    //      Property Obligations → Taxes / Insurance / Licenses / Compliance
    //
    //  The parent name is not repeated either. The operator shell already
    //  says Asset Management in the crumb; inside a room the page identity
    //  is the ROOM.
    return ''
      + '<div class="am-room-view" data-am-view="room" data-am-room-open="' + esc(room.key) + '">'
      +   '<button class="am-back" type="button" onclick="amOpenHome()">← Asset Management</button>'
      +   '<h2 class="am-room-name">' + esc(room.label) + '</h2>'
      +   '<p class="am-taxonomy am-room-taxonomy">'
      +     esc((room.eyebrow || room.covers || []).join(" · ")) + '</p>'
      +   '<div class="am-compartments">'
      +     (room.compartments || []).map(compartmentHtml).join("")
      +   '</div>'
      + '</div>';
  }


  // ── THE INSURANCE COMPARTMENT ───────────────────────────────────────
  //  The first compartment with its own surface, and the pattern the other
  //  sixteen will follow.
  //
  //  INSURANCE IS PROPERTY-CENTRIC HERE EVEN THOUGH THE UNDERLYING
  //  INSURANCE IS NOT. Portfolio programs, shared policies, several
  //  carriers, Property / GL / Umbrella layers, mid-term endorsements,
  //  allocations, escrow and financing all exist underneath. The asset
  //  manager must not reconstruct any of it. This screen answers one
  //  question — what is this property's current insurance position — and
  //  everything else is a drill-down that does not exist yet.
  //
  //  FOUR TRUTHS, RENDERED APART AND LABELLED APART:
  //      coverage · economic · cash · history
  //  They reconcile later. They must never become one mutable record. The
  //  server declares which truth each section holds and this file renders
  //  that declaration rather than deciding it.
  //
  //  NOT AN INSURANCE WORKSHEET. Policy numbers, broker contacts, raw
  //  allocation arithmetic, finance-contract minutiae and source documents
  //  are deliberately absent from this screen; they belong behind a
  //  section or policy drill-down. The home compresses the answer.

  function positionCellHtml(p) {
    //  Label, then the value or a stated blank. Nothing else.
    //
    //  Each cell used to carry a sentence explaining why it was empty. Five
    //  of them side by side turned the headline strip into an apology, and
    //  an operator scanning for a position had to read past all of it. An
    //  empty institutional metric should be silent, not sorry.
    //
    //  Still never a dash and never a zero: a dash in a money slot reads as
    //  a real zero to anyone scanning.
    var known = p.value !== null && p.value !== undefined && p.value !== "";
    return ''
      + '<div class="am-pos-cell" data-am-position="' + esc(p.key) + '">'
      +   '<span class="am-pos-label">' + esc(p.label) + '</span>'
      +   (known
            ? '<span class="am-pos-value">' + esc(p.value) + '</span>'
            : '<span class="am-pos-blank" data-am-blank="1">Not established</span>')
      + '</div>';
  }

  function sectionHtml(sec) {
    //  TITLE · one short sentence · establishment. Then, only when the
    //  section actually holds governed truth, its rows.
    //
    //  The server still sends `reserved`, `layers`, `doctrine` and
    //  `awaiting` and none of it is printed — that is the specification,
    //  and it belongs in the API, the proofs and the docs.
    var est = estLabel(sec.establishment);
    var rows = sec.rows || [];
    return ''
      + '<section class="am-ins-section" data-am-section="' + esc(sec.key) + '"'
      +          ' data-am-truth="' + esc(sec.truth) + '">'
      +   '<h3>' + esc(sec.label) + '</h3>'
      +   '<p class="am-ins-blurb">' + esc(sec.blurb || "") + '</p>'
      +   '<span class="am-chip am-chip-' + esc(est.tone) + '" data-am-est="' + esc(sec.establishment) + '">'
      +     esc(est.text) + '</span>'
      +   (rows.length ? sectionRowsHtml(sec, rows) : '')
      //  THE UNRESOLVED REMAINDER. Stated where the operator is already
      //  looking at the economics, never plugged and never hidden behind
      //  a drill-down: an allocation that does not account for the whole
      //  coverage is the finding, not a rounding nuisance.
      +   ((sec.unreconciled || []).length
            ? '<div class="am-ins-gap" data-am-unreconciled="1">'
              + sec.unreconciled.map(function (u) {
                  return '<div>' + esc(u.label) + ' · ' + esc(u.unallocated)
                       + ' not allocated to any property</div>'; }).join("")
              + '</div>'
            : '')
      + '</section>';
  }

  function sectionRowsHtml(sec, rows) {
    if (sec.key === "coverage_stack") {
      return '<div class="am-ins-rows">' + rows.map(function (r) {
        return '<div class="am-ins-row" data-am-row="' + esc(r.coverage_id) + '">'
          + '<span class="am-ins-row-t">' + esc(r.label) + '</span>'
          + '<span class="am-ins-row-s">' + esc([r.carrier, r.period, r.participation]
              .filter(Boolean).join("  ·  ")) + '</span>'
          + '</div>'; }).join("") + '</div>';
    }
    if (sec.key === "economic_position") {
      return '<div class="am-ins-rows">' + rows.map(function (r) {
        //  STATED and DERIVED render as visibly different classes, and a
        //  derived row carries the model that produced it. §38: a derived
        //  attribution rendered identically to a recorded one is a very
        //  convincing machine for producing confident nonsense.
        var cls = r.allocation_class === "derived" ? "derived" : "stated";
        return '<div class="am-ins-row" data-am-row="' + esc(r.coverage_id) + '"'
             +      ' data-am-alloc-class="' + esc(r.allocation_class) + '">'
          + '<span class="am-ins-row-t">' + esc(r.label) + '</span>'
          + '<span class="am-ins-row-v">' + esc(r.monthly_accrual) + ' / mo</span>'
          + '<span class="am-ins-row-s">' + esc(r.property_annual_cost)
            + ' over ' + esc(r.term_months) + ' months</span>'
          + '<span class="am-alloc-class am-alloc-' + cls + '">' + esc(cls) + '</span>'
          + (r.allocation_class === "derived" && r.basis_detail
              ? '<span class="am-ins-row-model" data-am-model="1">' + esc(r.basis_detail) + '</span>'
              : '')
          + '</div>'; }).join("") + '</div>';
    }
    //  RENEWALS & HISTORY. A correction and an effective change are
    //  different events and the row says which — rendering them
    //  identically is how a restatement comes to look like a change in
    //  the world.
    return '<div class="am-ins-rows">' + rows.slice(0, 8).map(function (r) {
      return '<div class="am-ins-row" data-am-change="' + esc(r.change_kind) + '">'
        + '<span class="am-ins-row-t">' + esc(r.coverage_type) + ' · '
          + esc(r.effective_from) + (r.effective_to ? ' – ' + esc(r.effective_to) : '') + '</span>'
        + '<span class="am-ins-row-s">'
          + esc(r.change_kind === "correction" ? "Corrected" : "Effective change")
          + (r.revision_reason ? '  ·  ' + esc(r.revision_reason) : '')
          + (r.superseded ? '  ·  superseded' : '') + '</span>'
        + '</div>'; }).join("") + '</div>';
  }

  function insuranceHtml(d) {
    return ''
      + '<div class="am-room-view" data-am-view="compartment" data-am-compartment-open="insurance">'
      +   '<button class="am-back" type="button" onclick="amOpenRoom(\'property_obligations\')">'
      +     '← Property Obligations</button>'
      +   '<h2 class="am-room-name">' + esc(d.label || "Insurance") + '</h2>'
      //  THE POSITION STRIP — the compressed answer, reserved and honest.
      +   '<div class="am-position" data-am-position-strip="1">'
      +     (d.position || []).map(positionCellHtml).join("")
      +   '</div>'
      +   '<div class="am-ins-sections">'
      +     (d.sections || []).map(sectionHtml).join("")
      +   '</div>'
      + '</div>';
  }

  async function loadCompartment(key) {
    state.busy = true; state.compartmentError = null; render();
    try {
      if (key === "insurance") {
        state.compartmentData = payload(await window.__psLive.assetManagementInsurance());
      } else {
        state.compartmentData = null;
      }
    } catch (e) {
      state.compartmentData = null; state.compartmentError = e;
    } finally {
      state.busy = false; render();
    }
  }

  function render() {
    var host = state.host;
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
    //  and it says it is a failed read rather than an empty property.
    //
    //  A REFUSAL IS NOT A FAILURE. 403 means the server understood the
    //  request perfectly and declined it — this person does not hold the
    //  module at this property. Saying "unavailable, failed read" there
    //  reports a broken system to someone whose access is simply not
    //  granted, and names no way forward. The two states get different
    //  words, different tone and different data-am-state, because a
    //  proof that cannot tell them apart cannot tell an outage from a
    //  permission.
    if (state.error) {
      if (state.error.status === 403) {
        host.innerHTML = '<div class="am-note am-not-entitled" data-am-state="not_entitled">'
          + 'Asset Management access is not enabled for this property. '
          + 'Ask an administrator to grant the Asset Management module.</div>';
        return;
      }
      host.innerHTML = '<div class="am-note am-unavailable" data-am-state="unavailable">'
        + 'Asset Management is unavailable right now. Nothing has been changed. '
        + 'This is a failed read, not an empty property.</div>';
      return;
    }
    if (!rooms().length) {
      host.innerHTML = '<div class="am-note" data-am-state="empty">Asset Management returned no rooms.</div>';
      return;
    }

    if (state.view === "compartment") {
      //  A failed compartment read is its own failure, rendered as one.
      //  It must never fall back to the room, which would look like the
      //  operator mis-clicked rather than like a read that broke.
      if (state.compartmentError) {
        host.innerHTML = '<div class="am-note am-unavailable" data-am-state="unavailable">'
          + 'This compartment is unavailable right now. Nothing has been changed. '
          + 'This is a failed read, not an empty compartment.</div>';
        return;
      }
      if (!state.compartmentData) {
        host.innerHTML = '<div class="am-note" data-am-state="loading">Loading…</div>';
        return;
      }
      host.innerHTML = insuranceHtml(state.compartmentData);
      return;
    }

    if (state.view !== "home") {
      var r = roomBy(state.view);
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
      state.data = null; state.error = e;
    } finally {
      state.busy = false; render();
    }
  }

  /*  The desk entry point. renderDesk() calls this; there is no separate
   *  open()/close() because there is no panel to open — the operator frame
   *  is already showing.
   *
   *  Entering the desk always lands on the four rooms, never on the last
   *  room someone opened. Work Orders shipped that defect once: render()
   *  preferred a standing detail, so re-entry dropped the operator on a job
   *  instead of the queue. */
  async function mount(host, force) {
    state.host = host;
    state.view = "home";
    syncRoomChrome();
    render();
    if (hasSession() && (force || !state.data)) await load();
    else render();
  }

  /*  The shell's desk title is the DESK's identity and belongs on the desk.
   *  Inside a room the page identity is the room, and the crumb in the app
   *  bar still says Asset Management — so the large title would be the same
   *  word twice. The body class lets CSS stand it down without the door
   *  writing, clearing or restoring any header text, which is the mistake
   *  PS_MODULE_IDENTITY exists to prevent. */
  function syncRoomChrome() {
    document.body.classList.toggle("am-in-room", state.view !== "home");
  }
  function openRoom(k) {
    state.view = k; state.compartment = null; state.compartmentData = null;
    state.compartmentError = null;
    syncRoomChrome(); render();
  }
  function openCompartment(k) {
    if (!COMPARTMENT_SURFACES[k]) return;   // no destination, no navigation
    state.view = "compartment"; state.compartment = k;
    state.compartmentData = null; state.compartmentError = null;
    syncRoomChrome(); render();
    if (hasSession()) loadCompartment(k);
  }
  function openHome() { state.view = "home"; syncRoomChrome(); render(); }

  window.amOpenRoom = openRoom;
  window.amOpenHome = openHome;
  window.amOpenCompartment = openCompartment;
  window.__psAssetManagement = { mount: mount, reload: load, openRoom: openRoom,
                                 openHome: openHome, openCompartment: openCompartment };
})();
