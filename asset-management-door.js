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
                compartment: null, compartmentData: null, compartmentError: null,
                //  The establishment sheet, when one is open, and the receipt
                //  from the last write. Both are about an ACT and neither is
                //  truth — they are cleared on navigation so a stale receipt
                //  can never read as the current state of the property.
                capture: null, receipt: null };

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
      //  ── COVERAGE ESTABLISHED, SHARE NOT ─────────────────────────────
      //  Real coverage contributing nothing to the numbers above it, said
      //  where the numbers are read. Before this existed the same state
      //  rendered as an empty compartment — indistinguishable from a
      //  property nobody had touched.
      //
      //  NO MAGNITUDE. The policy's own total is what the WHOLE policy
      //  costs across every property on it, so showing it here would read
      //  as this property's cost. Unknown is a valid Exposure; a number
      //  nobody stated is not.
      +   ((sec.awaiting_allocation || []).length
            ? '<div class="am-ins-awaiting" data-am-awaiting="1">'
              + sec.awaiting_allocation.map(function (a) {
                  return '<div class="am-ins-awaiting-row" data-am-awaiting-row="'
                       + esc(a.coverage_id) + '">'
                       + '<span class="am-ins-row-t">' + esc(a.label)
                         + (a.carrier ? '  ·  ' + esc(a.carrier) : '') + '</span>'
                       + '<span class="am-ins-awaiting-v" data-am-share-unknown="1">'
                         + 'Share not established</span>'
                       + '<span class="am-ins-row-s">' + esc(a.why) + ' '
                         + esc(a.resolved_by) + '</span>'
                       + '</div>'; }).join("")
              + '</div>'
            : '')
      + '</section>';
  }

  function sectionRowsHtml(sec, rows) {
    if (sec.key === "coverage_stack") {
      return '<div class="am-ins-rows">' + rows.map(function (r) {
        //  `sharing` is the new key; `participation` is the old one and the
        //  server still emits both. Reading the new one first moves this
        //  file forward without depending on a same-instant API deploy —
        //  the app may require the new API, never the reverse.
        var sharing = r.sharing || r.participation;
        return '<div class="am-ins-row" data-am-row="' + esc(r.coverage_id) + '"'
          +      ' data-am-share="' + esc(r.share_status || "") + '">'
          + '<span class="am-ins-row-t">' + esc(r.label) + '</span>'
          + '<span class="am-ins-row-s">' + esc([r.carrier, r.period, sharing]
              .filter(Boolean).join("  ·  ")) + '</span>'
          //  A coverage whose share is unknown is REAL coverage. It is
          //  marked, not demoted, and never shown as a zero.
          + (r.share_established === false
              ? '<span class="am-ins-row-flag" data-am-share-unknown="1">Share not established</span>'
              : '')
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
    /*  CASH & FINANCING. HOW it is paid — never WHAT it costs.
     *
     *  Every figure in this section is a FINANCING figure and is confined
     *  to it. The finance charge is the cost of borrowing and the total of
     *  payments is what goes to the finance company; neither is an
     *  insurance cost, and neither may appear in the position strip or in
     *  Economic Position. The server keeps them apart and this renders
     *  that separation rather than deciding it.
     *
     *  The three mechanisms render distinctly because they ARE distinct.
     *  Collapsing "escrowed" and "financed" into one grey row would make
     *  the operator open a drill-down to learn something the row should
     *  have said.
     */
    if (sec.key === "cash_financing") {
      return '<div class="am-ins-rows">' + rows.map(function (r) {
        var f = r.finance, e = r.escrow;
        return '<div class="am-ins-row am-cash-row" data-am-row="' + esc(r.coverage_id) + '"'
          +      ' data-am-funding="' + esc(r.method) + '">'
          + '<span class="am-ins-row-t">' + esc(r.label)
            + (r.carrier ? '  ·  ' + esc(r.carrier) : '') + '</span>'
          + '<span class="am-cash-method am-cash-' + esc(r.method) + '">'
            + esc(r.method_label) + '</span>'
          + (r.corrected
              ? '<span class="am-ins-row-flag" data-am-corrected="1">corrected</span>' : '')
          + (f
              ? '<span class="am-ins-row-s" data-am-finance="1">'
                + esc(f.provider)
                + (f.installments ? '  ·  ' + esc(f.installments) : '')
                + (f.down_payment ? '  ·  ' + esc(f.down_payment) + ' down' : '')
                //  Labelled as a FINANCE CHARGE every time it is shown.
                //  An unlabelled amount next to insurance figures is how
                //  a borrowing cost starts reading as a premium.
                + (f.finance_charge ? '  ·  ' + esc(f.finance_charge) + ' finance charge' : '')
                + '</span>'
                + (f.total_of_payments
                    ? '<span class="am-ins-row-s" data-am-total-payments="1">'
                      + esc(f.total_of_payments) + ' total to the finance company '
                      + '— financing, not insurance cost</span>'
                    : '')
              : '')
          + (e && (e.lender_name || e.servicer_name)
              ? '<span class="am-ins-row-s">'
                + esc([e.lender_name, e.servicer_name].filter(Boolean).join('  ·  '))
                + '</span>'
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

  /*  ══ ADD CURRENT INSURANCE ═══════════════════════════════════════
   *  The first human establishment path into this door. Two acts, and the
   *  screen keeps them apart because they are different commitments:
   *
   *      1  hand Spine the document   — retained, nothing asserted
   *      2  confirm what it says      — the human's claim, then written
   *
   *  SPINE HAS NOT READ THE DOCUMENT, AND THE SHEET SAYS SO. Every field
   *  opens blank. A form pre-filled with guesses would make the operator
   *  a reviewer of Spine's assumptions rather than the author of the
   *  facts, and a wrong guess they failed to notice becomes governed
   *  truth wearing their name.
   *
   *  THE SHARE IS OPTIONAL, LOUDLY. A shared master policy names this
   *  property without stating its share, and that is the normal case for
   *  a portfolio. Leaving it blank establishes real coverage and an
   *  honestly missing allocation. The sheet promises Spine will not
   *  estimate it, and the server keeps that promise.
   */
  var SHARE_SOURCES = [
    { key: "broker_stated",  label: "The broker stated it",  cls: "stated"  },
    { key: "carrier_stated", label: "The carrier stated it", cls: "stated"  },
    { key: "tiv_prorata",    label: "We computed it ourselves", cls: "derived" },
  ];

  var COVERAGE_TYPES = [
    { key: "property",          label: "Property" },
    { key: "general_liability", label: "General Liability" },
    { key: "umbrella_excess",   label: "Umbrella / Excess" },
    { key: "other",             label: "Other" },
  ];

  /*  A SUGGESTION IS NOT A FACT, AND MUST NOT LOOK LIKE ONE.
   *
   *  When Spine read a value off the document the field opens holding it
   *  — and says so, on the field, in a class the eye can separate from a
   *  value the operator typed. §38: a proposal rendered identically to a
   *  recorded fact is a very convincing machine for producing confident
   *  nonsense, and this is the screen where a human is about to turn one
   *  into the other.
   *
   *  The operator can overwrite any of it. Nothing is written until they
   *  press confirm, and what gets written is whatever the field holds
   *  then — not what Spine proposed.
   */
  function field(name, label, attrs, hint, proposed) {
    var has = proposed !== null && proposed !== undefined && proposed !== "";
    return ''
      + '<label class="am-cap-field' + (has ? ' is-proposed' : '') + '"'
      +        ' data-am-field="' + esc(name) + '"'
      +        (has ? ' data-am-proposed="1"' : '') + '>'
      +   '<span class="am-cap-label">' + esc(label)
      +     (has ? '<span class="am-cap-sugg" data-am-suggestion="' + esc(name) + '">'
                 + 'read from the document</span>' : '')
      +   '</span>'
      +   '<input class="am-cap-input" data-am-input="' + esc(name) + '" ' + (attrs || '')
      +     (has ? ' value="' + esc(proposed) + '"' : '') + '>'
      +   (hint ? '<span class="am-cap-hint">' + esc(hint) + '</span>' : '')
      + '</label>';
  }

  function selectField(name, label, options, hint) {
    return ''
      + '<label class="am-cap-field" data-am-field="' + esc(name) + '">'
      +   '<span class="am-cap-label">' + esc(label) + '</span>'
      +   '<select class="am-cap-input" data-am-input="' + esc(name) + '">'
      +     options.map(function (o) {
            return '<option value="' + esc(o.key) + '">' + esc(o.label) + '</option>'; }).join("")
      +   '</select>'
      +   (hint ? '<span class="am-cap-hint">' + esc(hint) + '</span>' : '')
      + '</label>';
  }

  function captureHtml(cap) {
    if (cap.step === "choose") {
      return ''
        + '<div class="am-capture" data-am-capture="choose">'
        +   '<h3>Add current insurance</h3>'
        +   '<p class="am-cap-blurb">Upload the policy or binder. Spine keeps the document '
        +     'so this position can always show what it came from.</p>'
        +   selectField("artifact_kind", "What is this document?",
              [{ key: "insurance_policy", label: "Policy" },
               { key: "insurance_binder", label: "Binder" }])
        +   '<label class="am-cap-field" data-am-field="file">'
        +     '<span class="am-cap-label">Document (PDF)</span>'
        +     '<input class="am-cap-input" type="file" accept="application/pdf,.pdf" '
        +       'data-am-input="file">'
        +   '</label>'
        +   (cap.error
              ? '<div class="am-cap-error" data-am-capture-error="1">' + esc(cap.error) + '</div>'
              : '')
        +   '<div class="am-cap-actions">'
        +     '<button class="am-cap-cancel" type="button" data-am-act="cancel" '
        +       'onclick="amInsuranceCancel()">Cancel</button>'
        +     '<button class="am-cap-go" type="button" data-am-act="upload" '
        +       'onclick="amInsuranceUpload()"' + (cap.busy ? ' disabled' : '') + '>'
        +       (cap.busy ? 'Uploading…' : 'Upload') + '</button>'
        +   '</div>'
        + '</div>';
    }

    //  ── REVIEW ────────────────────────────────────────────────────────
    //  `p` is what Spine proposed, if anything. The server's own sentence is
    //  rendered rather than one written here: it is the server that knows
    //  whether the document was read, read and found nothing, or not read
    //  at all, and those are three different things to tell an operator.
    var prop = (cap.proposal && cap.proposal.fields) || {};
    var pv = function (k) { return prop[k]; };
    return ''
      + '<div class="am-capture" data-am-capture="review">'
      +   '<h3>Confirm what the document says</h3>'
      +   '<p class="am-cap-blurb" data-am-cap-onfile="1"'
      +      ' data-am-proposal-available="' + ((cap.proposal && cap.proposal.available) ? '1' : '0') + '">'
      +     esc(cap.artifact.filename) + ' is on file. '
      +     esc((cap.proposal && cap.proposal.reason)
                || 'Spine has not read it — enter what it says and Spine records your '
                 + 'answers against the document.') + '</p>'

      +   '<div class="am-cap-group"><h4>The term</h4>'
      +     field("program_name", "Program or policy name", 'type="text" placeholder="2026 Property Program"',
              null, pv("program_name"))
      +     field("term_start", "Term start", 'type="date"')
      +     field("term_end", "Term end", 'type="date"')
      +     field("currency_code", "Currency", 'type="text" maxlength="3" placeholder="USD"',
              "Three-letter code. Spine has no currency to fall back on and will not assume one.")
      +   '</div>'

      +   '<div class="am-cap-group"><h4>The coverage</h4>'
      +     selectField("coverage_type", "Coverage type", COVERAGE_TYPES)
      +     field("carrier_name", "Carrier", 'type="text"', null, pv("carrier_name"))
      +     field("broker_name", "Broker", 'type="text"', null, pv("broker_name"))
      +     field("coverage_period_start", "Coverage starts", 'type="date"', null,
              pv("coverage_period_start"))
      +     field("coverage_period_end", "Coverage ends", 'type="date"', null,
              pv("coverage_period_end"))
      +     field("premium", "Premium", 'type="text" inputmode="decimal" placeholder="0.00"',
              null, pv("premium"))
      +     field("taxes", "Taxes", 'type="text" inputmode="decimal" placeholder="0.00"',
              null, pv("taxes"))
      +     field("fees", "Fees", 'type="text" inputmode="decimal" placeholder="0.00"',
              null, pv("fees"))
      +     field("broker_fee", "Broker fee", 'type="text" inputmode="decimal" placeholder="0.00"',
              null, pv("broker_fee"))
      +     field("policy_number", "Policy number as written", 'type="text"',
              "Recorded exactly as it appears. Spine keeps every rendering and picks no favourite.",
              pv("policy_number"))
      +   '</div>'

      //  THE OPTIONAL HALF, AND THE WHOLE POINT OF THIS SLICE.
      +   '<div class="am-cap-group am-cap-optional" data-am-optional-share="1">'
      +     '<h4>This property’s share <span class="am-cap-opt">optional</span></h4>'
      +     '<p class="am-cap-blurb">If the document does not state what this property’s '
      +       'share of the policy is, leave this blank. The coverage is still recorded and '
      +       'the missing share is shown as missing. '
      +       '<strong>Spine will not estimate it.</strong></p>'
      +     field("share", "Share of the policy", 'type="text" inputmode="decimal" placeholder="leave blank if not stated"')
      +     selectField("share_source", "Where did this figure come from?", SHARE_SOURCES)
      +     field("share_model", "Which model, and its inputs", 'type="text"',
              "Required only when Spine computed the figure. A derived number must name the model that produced it.")
      +   '</div>'

      +   (cap.error
            ? '<div class="am-cap-error" data-am-capture-error="1">' + esc(cap.error) + '</div>'
            : '')
      +   '<div class="am-cap-actions">'
      +     '<button class="am-cap-cancel" type="button" data-am-act="cancel" '
      +       'onclick="amInsuranceCancel()">Cancel</button>'
      +     '<button class="am-cap-go" type="button" data-am-act="confirm" '
      +       'onclick="amInsuranceConfirm()"' + (cap.busy ? ' disabled' : '') + '>'
      +       (cap.busy ? 'Recording…' : 'Confirm and record') + '</button>'
      +   '</div>'
      + '</div>';
  }

  /*  ARE WE INSURED, AND ARE WE IN GOOD STANDING?
   *
   *  One line, above everything else, because it is the question an asset
   *  manager opens this screen to answer. It is a DERIVED reading of the
   *  coverage periods below it, not a status somebody set, and it never
   *  reports healthy from absence: no coverage Spine can evidence reads
   *  COVERAGE NOT CONFIRMED, never a reassuring blank.
   *
   *  Deliberately not a board. No task list, no owner column, no progress
   *  bar — the state, why it is that, and what would resolve it. Anything
   *  more and this becomes the project-management surface Insurance is
   *  explicitly not supposed to grow into.
   */
  var STANDING_COPY = {
    current:                { text: "Current", tone: "ok" },
    renewal_approaching:    { text: "Renewal approaching", tone: "part" },
    coverage_not_confirmed: { text: "Coverage not confirmed", tone: "none" },
    expired:                { text: "Expired", tone: "bad" },
  };

  function standingHtml(s) {
    if (!s) return '';
    //  An unrecognised state renders as unknown rather than as something
    //  reassuring. A newer server saying a word this build has never heard
    //  must not be rounded down to "Current".
    var copy = STANDING_COPY[s.state] || { text: "Standing unknown", tone: "none" };
    return ''
      + '<div class="am-standing am-standing-' + esc(copy.tone) + '"'
      +      ' data-am-standing="' + esc(s.state) + '"'
      +      (s.milestone ? ' data-am-milestone="' + esc(s.milestone) + '"' : '') + '>'
      +   '<div class="am-standing-top">'
      +     '<span class="am-standing-state">' + esc(copy.text) + '</span>'
      +     (s.milestone
            ? '<span class="am-standing-mile">' + esc(s.milestone) + '-day window</span>'
            : '')
      +   '</div>'
      +   '<p class="am-standing-why">' + esc(s.why || "") + '</p>'
      //  What would resolve it, when something would. A state with nothing
      //  to do says nothing rather than inventing an action.
      +   (s.resolved_by
            ? '<p class="am-standing-next" data-am-standing-next="1">'
              + esc(s.resolved_by) + '</p>'
            : '')
      + '</div>';
  }

  function insuranceHtml(d) {
    //  The control is PRIMARY while nothing is established, because that is
    //  the only thing an operator can usefully do on an empty compartment.
    //  It stays available afterwards — a property carries several policies
    //  and the second one is added the same way as the first.
    var nothingYet = d.establishment === "not_established";
    var addControl = ''
      + '<button class="am-add-insurance' + (nothingYet ? ' is-primary' : '') + '" type="button"'
      +   ' data-am-add-insurance="1" onclick="amInsuranceStart()">'
      +   (nothingYet ? 'Add current insurance' : 'Add another policy')
      + '</button>';

    return ''
      + '<div class="am-room-view" data-am-view="compartment" data-am-compartment-open="insurance">'
      +   '<button class="am-back" type="button" onclick="amOpenRoom(\'property_obligations\')">'
      +     '← Property Obligations</button>'
      +   '<h2 class="am-room-name">' + esc(d.label || "Insurance") + '</h2>'
      //  A receipt from the last write, in plain language, above the truth
      //  it changed. Cleared on the next navigation — it reports an act,
      //  not a state.
      +   (state.receipt
            ? '<div class="am-receipt" data-am-receipt="1">' + esc(state.receipt) + '</div>'
            : '')
      +   (state.capture ? captureHtml(state.capture) : addControl)
      //  STANDING FIRST. The compressed answer to the question the screen
      //  is opened to ask, above the numbers that explain it.
      +   standingHtml(d.standing)
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
    clearCapture();
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
  //  An open sheet and a receipt both belong to a moment, not to the
  //  property. Leaving either standing across navigation would show an
  //  operator a receipt for a write they made two screens ago as though
  //  it described what they are looking at now.
  function clearCapture() { state.capture = null; state.receipt = null; }

  function openRoom(k) {
    state.view = k; state.compartment = null; state.compartmentData = null;
    state.compartmentError = null; clearCapture();
    syncRoomChrome(); render();
  }
  function openCompartment(k) {
    if (!COMPARTMENT_SURFACES[k]) return;   // no destination, no navigation
    state.view = "compartment"; state.compartment = k;
    state.compartmentData = null; state.compartmentError = null; clearCapture();
    syncRoomChrome(); render();
    if (hasSession()) loadCompartment(k);
  }
  function openHome() { state.view = "home"; clearCapture(); syncRoomChrome(); render(); }

  /*  ══ THE ESTABLISHMENT SHEET ══════════════════════════════════════
   *  Reads the operator's answers out of the DOM at submit time rather
   *  than mirroring every keystroke into state. The sheet is re-rendered
   *  only on step changes, so the inputs keep their own values and there
   *  is no second copy of what the human typed to drift from the first.
   */
  function inputVal(name) {
    var host = state.host;
    var el = host && host.querySelector('[data-am-input="' + name + '"]');
    return el ? String(el.value || "").trim() : "";
  }

  //  Dollars → integer cents. The services refuse a non-integer, and they
  //  are right to: 12345.67 arriving as a float is a caller bug, and
  //  rounding it silently is how a penny becomes a reconciliation.
  //  A BLANK IS NOT A ZERO — it returns null and the caller decides.
  function cents(text) {
    var s = String(text == null ? "" : text).replace(/[$,\s]/g, "");
    if (s === "") return null;
    if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
    return Math.round(parseFloat(s) * 100);
  }

  function startCapture() {
    state.capture = { step: "choose", artifact: null, error: null, busy: false };
    state.receipt = null;
    render();
  }

  function cancelCapture() { state.capture = null; render(); }

  async function uploadEvidence() {
    var cap = state.capture;
    if (!cap || cap.busy) return;
    var host = state.host;
    var input = host && host.querySelector('[data-am-input="file"]');
    var file = input && input.files && input.files[0];
    if (!file) {
      cap.error = "Choose the policy or binder to upload.";
      render(); return;
    }
    var kind = inputVal("artifact_kind") || "insurance_policy";

    cap.busy = true; cap.error = null; render();
    try {
      var res = await window.__psLive.assetManagementInsuranceEvidence({
        file: file, artifact_kind: kind });
      var d = payload(res) || {};
      state.capture = { step: "review", artifact: d.artifact || { filename: file.name },
                        //  Carried, never merged into the fields as though a
                        //  human had entered them. The inputs show it; the
                        //  proposal stays identifiable as a proposal.
                        proposal: d.proposal || null,
                        error: null, busy: false };
      render();
    } catch (e) {
      //  The server's own receipt, verbatim where there is one. It was
      //  written to be said to the person holding the document — replacing
      //  it with "upload failed" throws away the only sentence that names
      //  what to do next.
      cap.busy = false;
      cap.error = (e && e.body && e.body.receipt) || (e && e.message)
        || "That upload did not go through. Nothing has been recorded.";
      render();
    }
  }

  async function confirmEstablish() {
    var cap = state.capture;
    if (!cap || cap.busy) return;

    var premium = cents(inputVal("premium"));
    var taxes = cents(inputVal("taxes"));
    var fees = cents(inputVal("fees"));
    var brokerFee = cents(inputVal("broker_fee"));
    var share = cents(inputVal("share"));

    for (var pair of [["Premium", premium], ["Taxes", taxes], ["Fees", fees],
                      ["Broker fee", brokerFee], ["Share", share]]) {
      if (Number.isNaN(pair[1])) {
        cap.error = pair[0] + " is not a number Spine can read. Enter an amount like 1250.00.";
        render(); return;
      }
    }
    if (premium === null) {
      cap.error = "The premium is required — it is what the coverage costs.";
      render(); return;
    }

    var coverage = {
      coverage_type: inputVal("coverage_type") || "property",
      carrier_name: inputVal("carrier_name") || null,
      broker_name: inputVal("broker_name") || null,
      coverage_period_start: inputVal("coverage_period_start"),
      coverage_period_end: inputVal("coverage_period_end"),
      premium_cents: premium,
      taxes_cents: taxes === null ? 0 : taxes,
      fees_cents: fees === null ? 0 : fees,
      broker_fee_cents: brokerFee === null ? 0 : brokerFee,
      observed_as_of: inputVal("term_start") || null,
    };

    var policyNumber = inputVal("policy_number");
    if (policyNumber) {
      //  Verbatim. Not upper-cased, not stripped of punctuation — deciding
      //  which rendering is canonical is the judgement the identifier table
      //  exists to avoid making.
      coverage.identifiers = [{ identifier_value: policyNumber, issued_by: "carrier" }];
    }

    //  ── THE SHARE IS ATTACHED ONLY IF ONE WAS GIVEN ──────────────────
    //  A blank share sends NO allocation at all. It does not send zero and
    //  it does not send a guess: the coverage is established and the share
    //  stays honestly missing, which is the state this whole build exists
    //  to make reachable.
    if (share !== null) {
      var srcKey = inputVal("share_source") || "broker_stated";
      var src = SHARE_SOURCES.filter(function (s) { return s.key === srcKey; })[0]
                || SHARE_SOURCES[0];
      var model = inputVal("share_model");
      if (src.cls === "derived" && !model) {
        cap.error = "A figure Spine computed has to name the model that produced it. "
                  + "Describe the model and its inputs, or record the share the broker stated.";
        render(); return;
      }
      coverage.allocation = {
        allocated_amount_cents: share,
        allocation_class: src.cls,
        allocation_basis: src.key,
        basis_detail: src.cls === "derived" ? model : null,
        effective_from: inputVal("coverage_period_start") || inputVal("term_start"),
      };
    }

    //  ⚠ READ EVERY FIELD BEFORE THE RE-RENDER, NOT AFTER.
    //  render() replaces the sheet's markup to show the busy state, which
    //  destroys the inputs and everything the operator typed into them.
    //  Reading program_name after that call returned "" and the server
    //  correctly refused a nameless program — an empty form submitted by a
    //  full one. The browser proof caught it; no source read would have.
    var program = {
      program_name: inputVal("program_name"),
      term_start: inputVal("term_start"),
      term_end: inputVal("term_end"),
      currency_code: (inputVal("currency_code") || "").toUpperCase(),
    };
    var artifactId = cap.artifact && cap.artifact.id;

    cap.busy = true; cap.error = null; render();
    try {
      var res = await window.__psLive.assetManagementInsuranceEstablish({
        artifact_id: artifactId,
        program: program,
        coverages: [coverage],
      });
      var d = payload(res) || {};
      state.capture = null;
      state.receipt = d.receipt || "Insurance established.";
      //  RE-READ, never patch the screen from the request. The dashboard
      //  shows what the database now holds, which is the only thing that
      //  can be trusted to match what the next visitor will see.
      await loadCompartment("insurance");
    } catch (e) {
      cap.busy = false;
      cap.error = (e && e.body && e.body.receipt) || (e && e.message)
        || "That did not record. Nothing has been changed.";
      render();
    }
  }

  window.amInsuranceStart = startCapture;
  window.amInsuranceCancel = cancelCapture;
  window.amInsuranceUpload = uploadEvidence;
  window.amInsuranceConfirm = confirmEstablish;

  window.amOpenRoom = openRoom;
  window.amOpenHome = openHome;
  window.amOpenCompartment = openCompartment;
  window.__psAssetManagement = { mount: mount, reload: load, openRoom: openRoom,
                                 openHome: openHome, openCompartment: openCompartment,
                                 startCapture: startCapture, cancelCapture: cancelCapture,
                                 uploadEvidence: uploadEvidence,
                                 confirmEstablish: confirmEstablish };
})();
