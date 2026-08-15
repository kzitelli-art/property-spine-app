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
// breaks into the compartments it will always have — Property Expenses
// shows all nine expense modules today, two governed and seven honestly
// empty — so the operator already understands where Utilities is going to
// live, and the next real compartment fills a slot that already exists
// instead of triggering a redesign.
//
// ── THE FOUR DOORS ARE CUT BY QUESTION, NOT BY CATEGORY ──────────────
//     CAPITAL STACK      how is this property capitalised?
//     PROPERTY EXPENSES  what does it cost to own and operate?
//     PROJECTS & CAPEX   where is capital being invested in the asset?
//     COMPLIANCE         is it legally and regulatorily in good standing?
//
// The server owns that taxonomy. This file renders whatever it sends and
// hardcodes none of it — a second copy of the hierarchy here is how the
// desk and the API come to disagree about what a room is called.
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
                capture: null, receipt: null,
                //  The funding sheet is its own capture: how a policy is PAID
                //  is a different act from what it COSTS, with different
                //  evidence, so the two are never open at once.
                funding: null,
                //  The Taxes sheet. ONE sheet, six acts — applicability,
                //  bill, filing, payment, funding, balance — because each is
                //  a different governed fact, and the screen must never
                //  offer a single "mark handled" that collapses them.
                tax: null };

  //  Which compartments have a surface built. A compartment WITHOUT one
  //  stays a quiet non-control: an arrow that does nothing when clicked is
  //  a worse lie than an arrow that is visibly inert.
  var COMPARTMENT_SURFACES = { insurance: true, taxes: true, debt: true };

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
    //      Property Expenses → Taxes / Insurance / Payroll / Utilities / …
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
      +   (sec.key === "cash_financing"
            ? '<button class="am-add-insurance am-add-funding'
              + (sec.establishment === "not_established" ? ' is-primary' : '')
              + '" type="button" data-am-add-funding="1" onclick="amFundingStart()">'
              + (sec.establishment === "not_established"
                  ? 'Add payment / financing' : 'Add another arrangement')
              + '</button>'
            : '')
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

  /*  ══ ADD PAYMENT / FINANCING ══════════════════════════════════════
   *  Cash & Financing's equivalent of ADD CURRENT INSURANCE, and it is a
   *  separate act on purpose: recording how a policy is PAID says nothing
   *  about what it COSTS, and the two are captured apart because they are
   *  two different facts with two different pieces of evidence.
   *
   *  THE METHOD DECIDES THE FORM. A direct arrangement has no instrument
   *  — no agreement, no account — and the server refuses one that claims
   *  otherwise. Showing installment fields under "Paid directly" would
   *  invite exactly that contradiction, so each method shows only its own
   *  facts.
   *
   *  Nothing here is ever pre-filled from a guess, and no amount entered
   *  here can move what insurance costs.
   */
  var FUNDING_METHODS = [
    { key: "direct", label: "Paid directly",
      blurb: "The property pays the carrier or broker itself." },
    { key: "lender_escrow", label: "Paid from lender escrow",
      blurb: "The lender or servicer holds funds and pays the premium." },
    { key: "premium_financed", label: "Premium financed",
      blurb: "A finance company pays the premium and is repaid in installments." },
  ];

  function fundingCoverageOptions(d) {
    var stack = (d.sections || []).filter(function (s) {
      return s.key === "coverage_stack"; })[0];
    return ((stack && stack.rows) || []).map(function (r) {
      return { key: r.coverage_id,
               label: r.label + (r.carrier ? " · " + r.carrier : "") };
    });
  }

  function fundingHtml(cap, d) {
    var covs = fundingCoverageOptions(d);
    if (!covs.length) {
      //  Nothing to fund. Said plainly rather than offering an empty picker.
      return ''
        + '<div class="am-capture" data-am-funding-capture="blocked">'
        +   '<h3>Add payment / financing</h3>'
        +   '<p class="am-cap-blurb">There is no established coverage on this property yet. '
        +     'Add the current insurance first — funding records how a policy is paid, '
        +     'and there is no policy here to pay for.</p>'
        +   '<div class="am-cap-actions">'
        +     '<button class="am-cap-cancel" type="button" onclick="amFundingCancel()">Close</button>'
        +   '</div>'
        + '</div>';
    }

    var method = cap.method || "direct";
    return ''
      + '<div class="am-capture" data-am-funding-capture="' + esc(method) + '">'
      +   '<h3>Add payment / financing</h3>'
      +   '<p class="am-cap-blurb">How this policy is paid. Recording it does not change '
      +     'what insurance costs this property — those are separate facts and Spine '
      +     'keeps them apart.</p>'

      +   selectField("f_coverage", "Which policy?", covs)
      +   '<label class="am-cap-field" data-am-field="f_method">'
      +     '<span class="am-cap-label">How is it paid?</span>'
      +     '<select class="am-cap-input" data-am-input="f_method" '
      +       'onchange="amFundingMethod(this.value)">'
      +       FUNDING_METHODS.map(function (m) {
              return '<option value="' + esc(m.key) + '"'
                   + (m.key === method ? ' selected' : '') + '>'
                   + esc(m.label) + '</option>'; }).join("")
      +     '</select>'
      +     '<span class="am-cap-hint">'
      +       esc((FUNDING_METHODS.filter(function (m) { return m.key === method; })[0] || {}).blurb || '')
      +     '</span>'
      +   '</label>'
      +   field("f_effective_from", "In effect from", 'type="date"')

      //  ── ONLY THE CHOSEN METHOD'S FACTS ──────────────────────────────
      +   (method === "premium_financed"
            ? '<div class="am-cap-group" data-am-funding-fields="premium_financed">'
              + '<h4>The finance agreement</h4>'
              + field("f_provider", "Finance company", 'type="text"')
              + field("f_agreement_ref", "Agreement reference", 'type="text"')
              + field("f_down", "Down payment", 'type="text" inputmode="decimal" placeholder="0.00"')
              + field("f_principal", "Principal financed", 'type="text" inputmode="decimal" placeholder="0.00"')
              + field("f_charge", "Finance charge", 'type="text" inputmode="decimal" placeholder="0.00"',
                  "The cost of borrowing. It is never part of what insurance costs.")
              + field("f_count", "Number of installments", 'type="text" inputmode="numeric"')
              + field("f_installment", "Installment amount", 'type="text" inputmode="decimal" placeholder="0.00"')
              + field("f_first_payment", "First payment date", 'type="date"')
              + '</div>'
            : '')
      +   (method === "lender_escrow"
            ? '<div class="am-cap-group" data-am-funding-fields="lender_escrow">'
              + '<h4>The escrow</h4>'
              + field("f_lender", "Lender", 'type="text"')
              + field("f_servicer", "Servicer", 'type="text"')
              + field("f_escrow_ref", "Escrow account reference", 'type="text"')
              + '</div>'
            : '')

      +   '<div class="am-cap-group"><h4>Evidence</h4>'
      +     '<p class="am-cap-blurb">Upload the agreement or statement, or say where this '
      +       'came from. Spine needs one or the other — an arrangement with no provenance '
      +       'cannot explain itself later.</p>'
      +     '<label class="am-cap-field" data-am-field="f_file">'
      +       '<span class="am-cap-label">Document</span>'
      +       '<input class="am-cap-input" type="file" data-am-input="f_file" '
      +         'accept="application/pdf,.pdf' + (method === "lender_escrow" ? ',.xlsx,.xls,.csv' : '') + '">'
      +     '</label>'
      +     field("f_note", "Or where it came from", 'type="text" placeholder="servicer statement, broker email…"')
      +   '</div>'

      +   (cap.artifact
            ? '<div class="am-receipt" data-am-funding-artifact="1">'
              + esc(cap.artifact.filename) + ' is on file.</div>'
            : '')
      +   (cap.error
            ? '<div class="am-cap-error" data-am-funding-error="1">' + esc(cap.error) + '</div>'
            : '')
      +   '<div class="am-cap-actions">'
      +     '<button class="am-cap-cancel" type="button" data-am-act="f-cancel" '
      +       'onclick="amFundingCancel()">Cancel</button>'
      +     '<button class="am-cap-go" type="button" data-am-act="f-confirm" '
      +       'onclick="amFundingConfirm()"' + (cap.busy ? ' disabled' : '') + '>'
      +       (cap.busy ? 'Recording…' : 'Confirm and record') + '</button>'
      +   '</div>'
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
      +   '<button class="am-back" type="button" onclick="amOpenRoom(\'property_expenses\')">'
      +     '← Property Expenses</button>'
      +   '<h2 class="am-room-name">' + esc(d.label || "Insurance") + '</h2>'
      //  A receipt from the last write, in plain language, above the truth
      //  it changed. Cleared on the next navigation — it reports an act,
      //  not a state.
      +   (state.receipt
            ? '<div class="am-receipt" data-am-receipt="1">' + esc(state.receipt) + '</div>'
            : '')
      +   (state.capture ? captureHtml(state.capture)
            : (state.funding ? fundingHtml(state.funding, d) : addControl))
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

  /*  ══ THE TAXES COMPARTMENT ════════════════════════════════════════
   *  FOUR ROWS. Real Estate Tax, BIRT, NPT, U&O — the four governed
   *  Philadelphia taxes, and no fifth. Commercial Trash is a municipal fee
   *  with its own exemption machinery and is deliberately not here.
   *
   *  An asset manager opens this screen to answer one question: are our
   *  taxes current. So it is a short list, not a dashboard — each row says
   *  what it is, what state it is in, and why it is not current.
   *
   *  ── FUNDING IS SUBORDINATE, VISUALLY AND STRUCTURALLY ─────────────
   *  How a tax is PAID FOR sits underneath the state it can never change,
   *  in a quieter strip. The server keeps them apart — the economic read
   *  cannot see an escrow by any path — and this renders that separation
   *  rather than deciding it. A monthly escrow contribution shown at the
   *  same weight as the accrual is how the two start being read as one.
   *
   *  ── NO JURISDICTION RULES LIVE HERE ───────────────────────────────
   *  Due dates, cadences, which subject owes which tax, whether a tax
   *  requires a filing — all of it arrives on the row. A second copy of
   *  Philadelphia's rules in a browser is a copy nobody updates.
   */
  var TAX_STATE_COPY = {
    paid:            { text: "Paid", tone: "ok" },
    current:         { text: "Current", tone: "ok" },
    filed:           { text: "Filed · payment outstanding", tone: "part" },
    action_required: { text: "Action required", tone: "part" },
    overdue:         { text: "Overdue", tone: "bad" },
    not_applicable:  { text: "Not applicable", tone: "none" },
    not_established: { text: "Not established", tone: "none" },
  };
  var TAX_OVERALL_COPY = {
    current:         { text: "Current", tone: "ok" },
    action_required: { text: "Action required", tone: "part" },
    overdue:         { text: "Overdue", tone: "bad" },
    not_established: { text: "Not established", tone: "none" },
  };

  //  An unrecognised state renders as unknown, never rounded down to
  //  something reassuring. A newer server saying a word this build has
  //  never heard must not become "Current".
  function taxStateCopy(s) {
    return TAX_STATE_COPY[s] || { text: "State unknown", tone: "none" };
  }

  /*  Which act does this row most need next? One primary at most — a row
   *  offering four equally-weighted buttons makes the operator decide what
   *  Spine already knows.
   */
  function taxPrimary(r) {
    if (r.applicability === "not_established") return "applicability";
    if (r.applicability === "not_applicable") return null;
    if (!r.obligation_id) return "bill";
    if (r.state === "overdue" || r.state === "filed") {
      return /not filed/i.test(r.detail || "") ? "filing" : "payment";
    }
    return null;
  }

  function taxActions(r) {
    var acts = [];
    if (r.applicability === "not_established") {
      acts.push({ key: "applicability", label: "Confirm whether this applies" });
      return acts;   // nothing else is answerable yet
    }
    if (r.applicability === "not_applicable") {
      acts.push({ key: "applicability", label: "Revisit this determination" });
      return acts;
    }
    acts.push({ key: "bill", label: r.obligation_id ? "Add another period" : "Add the bill" });
    if (r.obligation_id && r.requires_filing) acts.push({ key: "filing", label: "Record filing" });
    if (r.obligation_id) acts.push({ key: "payment", label: "Record payment" });
    acts.push({ key: "funding", label: r.funding ? "Change funding" : "Add funding" });
    if (r.funding && r.funding.funding_method === "lender_escrow") {
      acts.push({ key: "balance", label: "Record escrow balance" });
    }
    return acts;
  }

  function taxFundingHtml(r) {
    if (!r.funding) {
      //  UNKNOWN, SAID AS UNKNOWN. Never "paid directly" — that is a
      //  positive finding somebody establishes, and inventing it from
      //  silence is how a bill nobody was paying goes unpaid for a year.
      return '<p class="am-tax-funding-none" data-am-tax-funding="unknown">'
        + esc(r.funding_awaiting || "How this is paid has not been established.") + '</p>';
    }
    var f = r.funding, e = f.escrow;
    return ''
      + '<div class="am-tax-funding" data-am-tax-funding="' + esc(f.funding_method) + '">'
      +   '<span class="am-tax-funding-m">' + esc(f.method_label) + '</span>'
      +   (e
            ? '<span class="am-tax-funding-d">'
              + esc([e.lender_name, e.servicer_name].filter(Boolean).join("  ·  "))
              //  CASH TO A SERVICER, labelled every time. An unlabelled
              //  monthly figure beside an accrual starts reading as one.
              + (e.monthly_contribution
                  ? '  ·  ' + esc(e.monthly_contribution) + ' /mo to the servicer' : '')
              + '</span>'
              + (e.balance
                  ? '<span class="am-tax-funding-d" data-am-escrow-balance="1">'
                    + esc(e.balance_amount) + ' held, as of ' + esc(e.balance.observed_on)
                    + ' (' + esc(e.balance.days_old) + ' days ago)'
                    //  A balance is not a payment, and the strip says so
                    //  where the number is, not in a tooltip.
                    + ' — what the servicer holds, not evidence the City was paid'
                    + '</span>'
                  : '<span class="am-tax-funding-d" data-am-escrow-balance="0">'
                    + 'No balance recorded</span>')
            : '')
      + '</div>';
  }

  /*  One period of a row, with its requirements. A filing and a payment
   *  on the same day are DIFFERENT lines, because they are satisfied by
   *  different evidence — and a part payment says what is still owed
   *  rather than reading as an unpaid bill or, worse, a paid one. */
  function taxPeriodHtml(p) {
    return ''
      + '<div class="am-tax-period" data-am-tax-period="' + esc(p.period_label) + '"'
      +      ' data-am-tax-period-state="' + esc(p.state) + '">'
      +   '<span class="am-tax-period-k">' + esc(p.period_label) + '</span>'
      +   '<span class="am-tax-period-d">' + esc(p.detail || "") + '</span>'
      +   ((p.requirements || []).length
            ? '<div class="am-tax-reqs">' + p.requirements.map(function (q) {
                return '<div class="am-tax-req" data-am-tax-req="' + esc(q.key) + '"'
                  + ' data-am-tax-req-ok="' + (q.satisfied ? "1" : "0") + '">'
                  + '<span class="am-tax-req-t">' + esc(q.label) + '</span>'
                  + '<span class="am-tax-req-d">' + esc(q.due)
                    //  ⚠ THE PUBLISHED DATE IS THE STRONGER CLAIM, so it is the
                    //  one that gets said. Marking every OTHER date "(derived)"
                    //  put a caveat on every row — and undersold them: March 31
                    //  is the statute, not something Spine worked out. What
                    //  Spine derives is the shift off a weekend or a holiday.
                    + (q.date_source === "published" ? ' · City schedule' : '') + '</span>'
                  + '<span class="am-tax-req-s' + (q.overdue ? ' is-late' : '') + '">'
                    + esc(q.detail || (q.satisfied ? "Satisfied" : "Outstanding")) + '</span>'
                  + '</div>'; }).join("") + '</div>'
            : '')
      + '</div>';
  }

  function taxRowHtml(r) {
    var copy = taxStateCopy(r.state);
    var primary = taxPrimary(r);
    var figures = [];
    if (r.annual_liability) figures.push({ k: "Annual", v: r.annual_liability });
    if (r.monthly_accrual) figures.push({ k: "Monthly accrual", v: r.monthly_accrual });
    if (r.city_balance) figures.push({ k: "City balance", v: r.city_balance });
    if (r.next_due) figures.push({ k: r.next_due_label || "Next due", v: r.next_due });
    if (r.period_label) figures.push({ k: "Period", v: r.period_label });

    return ''
      + '<div class="am-tax-row" data-am-tax-row="' + esc(r.tax_type) + '"'
      +      ' data-am-tax-state="' + esc(r.state) + '"'
      +      ' data-am-tax-applicability="' + esc(r.applicability) + '">'
      +   '<div class="am-tax-head">'
      +     '<span class="am-tax-name">' + esc(r.label) + '</span>'
      //  WHO OWES IT. BIRT and NPT belong to the taxpayer, not the
      //  property, and the row says so rather than leaving an operator to
      //  wonder why one of them wants an entity.
      +     '<span class="am-tax-subject">'
      +       esc(r.subject_kind === "property" ? "Property" : "Taxpayer")
      +       ' · ' + esc(r.cadence === "monthly" ? "Monthly" : "Annual") + '</span>'
      +     '<span class="am-tax-state am-tax-state-' + esc(copy.tone) + '"'
      +          ' data-am-tax-chip="' + esc(r.state) + '">' + esc(copy.text) + '</span>'
      +   '</div>'
      +   (figures.length
            ? '<div class="am-tax-figures">' + figures.map(function (f) {
                return '<span class="am-tax-fig">'
                  + '<span class="am-tax-fig-k">' + esc(f.k) + '</span>'
                  + '<span class="am-tax-fig-v">' + esc(f.v) + '</span></span>'; }).join("")
              + '</div>'
            : '')
      +   (r.why_not_current
            ? '<p class="am-tax-why" data-am-tax-why="1">' + esc(r.why_not_current) + '</p>'
            : '')
      //  A "not applicable" carries the reason it was decided, always.
      //  It is the determination that will be questioned later.
      +   (r.applicability === "not_applicable" && r.applicability_basis
            ? '<p class="am-tax-basis" data-am-tax-basis="1">'
              + esc(r.applicability_basis) + '</p>'
            : '')
      +   (r.appeal_open
            ? '<p class="am-tax-basis" data-am-tax-appeal="1">An appeal is open. '
              + 'The current liability is unchanged until the City says otherwise.</p>'
            : '')
      //  ── THE PERIODS AND THEIR REQUIREMENTS ──────────────────────
      //  The detail, inline. A row is a compressed position over several
      //  periods at once — 2025's return beside the 2026 estimate that
      //  rides on it, July closed beside August open — and hiding that
      //  behind a modal would put the answer one click from the question.
      //  Satisfied requirements are quiet; unsatisfied ones are not.
      +   (r.periods && r.periods.length
            ? '<div class="am-tax-periods" data-am-tax-periods="1">'
              + r.periods.map(taxPeriodHtml).join("") + '</div>'
            : '')
      //  ⚠ A REQUIREMENT WHOSE EXISTENCE IS UNKNOWN. Not absent, not
      //  present — unknown, with the act that would settle it.
      +   (r.unestablished_requirements || []).map(function (u) {
            return '<div class="am-tax-gap" data-am-tax-unknown="1">'
              + '<b>' + esc(u.label) + ' — not established</b>'
              + esc(u.why) + ' ' + esc(u.resolves)
              + (u.obligation_id
                  ? ' <button class="am-tax-act" type="button" '
                    + 'data-am-tax-act="' + esc(r.tax_type) + ':filer_profile" '
                    + 'onclick="amTaxStart(\'' + esc(r.tax_type) + '\',\'filer_profile\',\''
                    + esc(u.obligation_id) + '\')">Record it</button>'
                  : '')
              + '</div>'; }).join("")
      //  Money nobody attached to a requirement. It satisfies nothing and
      //  is shown rather than quietly dropped.
      +   (r.unallocated_payments || []).map(function (u) {
            return '<div class="am-tax-gap" data-am-tax-unallocated="1">'
              + '<b>A payment names no requirement</b>' + esc(u.why) + '</div>'; }).join("")
      +   (r.applicability === "applies" ? taxFundingHtml(r) : '')
      //  ── THE DISAGREEMENT ──────────────────────────────────────────
      //  The servicer says they sent it; Spine has no City evidence. Shown
      //  on the row, beside a state that stays unpaid.
      +   (r.unevidenced_disbursements || []).map(function (u) {
            return '<div class="am-tax-gap" data-am-tax-gap="1">'
              + '<b>Escrow says it paid this — the City has not confirmed it</b>'
              + esc(u.why) + ' ' + esc(u.resolves) + '</div>'; }).join("")
      +   '<div class="am-tax-actions">'
      +     taxActions(r).map(function (a) {
            return '<button class="am-tax-act' + (a.key === primary ? ' is-primary' : '') + '"'
              + ' type="button" data-am-tax-act="' + esc(r.tax_type) + ':' + esc(a.key) + '"'
              + ' onclick="amTaxStart(\'' + esc(r.tax_type) + '\',\'' + esc(a.key) + '\')">'
              + esc(a.label) + '</button>'; }).join("")
      +   '</div>'
      + '</div>';
  }

  //  The entity primitive's own vocabularies, mirrored for the picker.
  //  Not a second definition of anything governed: the server refuses a
  //  value it does not recognise.
  var ENTITY_TYPES = [
    { key: "llc", label: "LLC" }, { key: "lp", label: "LP" },
    { key: "llp", label: "LLP" }, { key: "corporation", label: "Corporation" },
    { key: "s_corporation", label: "S corporation" }, { key: "trust", label: "Trust" },
    { key: "partnership", label: "Partnership" }, { key: "individual", label: "Individual" },
    { key: "other", label: "Other" },
  ];
  var ENTITY_RELATIONSHIPS = [
    { key: "owner", label: "It owns the property" },
    { key: "operating_entity", label: "It operates the property" },
    { key: "other", label: "Another relationship" },
  ];
  //  The City grants first-year filers relief from the mandatory
  //  estimated payment, so the cadence is not the same for every
  //  taxpayer — and Spine will not guess which applies.
  var BIRT_FILER_PROFILES = [
    { key: "established", label: "Established filer — has filed before" },
    { key: "first_year", label: "First year of business in Philadelphia" },
    { key: "second_year", label: "Second year of business in Philadelphia" },
  ];

  var TAX_DETERMINATIONS = [
    { key: "applies", label: "It applies here" },
    { key: "not_applicable", label: "It does not apply here" },
  ];
  var TAX_FILING_KINDS = [
    { key: "return", label: "Return" },
    { key: "estimate", label: "Estimated payment" },
    { key: "extension", label: "Extension" },
    { key: "amended_return", label: "Amended return" },
  ];
  var TAX_PAID_BY = [
    { key: "property", label: "The property paid it" },
    { key: "lender_escrow", label: "The lender's escrow remitted it" },
    { key: "other", label: "Someone else" },
  ];
  var TAX_FUNDING_METHODS = [
    { key: "direct", label: "Paid directly",
      blurb: "The property pays the City itself." },
    { key: "lender_escrow", label: "Paid from lender escrow",
      blurb: "A lender or servicer holds funds and pays the bill." },
  ];
  var TAX_SHEET_TITLE = {
    applicability: "Does this tax apply here?",
    bill: "Record the City's bill",
    filing: "Record a filing",
    payment: "Record a payment the City confirmed",
    funding: "How is this tax paid for?",
    balance: "Record the escrow balance",
    filer_profile: "Which kind of Philadelphia filer is this?",
    taxpayer: "Name the taxpayer",
  };

  //  Evidence is a document OR a stated note, never neither. Said before
  //  the round trip rather than after a refusal.
  /*  Evidence is a document OR a stated note, never neither.
   *
   *  ── UPLOAD AND READ IS ITS OWN STEP ─────────────────────────────
   *  Attaching at confirm time works, but it means Spine reads the
   *  document AFTER the operator has finished typing — which is the
   *  wrong order and wastes the reading entirely. READ AND FILL uploads
   *  immediately, so the proposal lands in the form the operator is
   *  about to check. Nothing is written either way; only the confirm
   *  writes, and it writes what the fields hold then.
   */
  function taxEvidenceGroup(accept, note, cap) {
    var canRead = cap && cap.effective_action !== "taxpayer"
      && cap.effective_action !== "filer_profile";
    return ''
      + '<div class="am-cap-group"><h4>Evidence</h4>'
      +   '<p class="am-cap-blurb">' + esc(note) + '</p>'
      +   '<label class="am-cap-field" data-am-field="t_file">'
      +     '<span class="am-cap-label">Document</span>'
      +     '<input class="am-cap-input" type="file" data-am-input="t_file" accept="'
      +       esc(accept) + '">'
      +   '</label>'
      +   (canRead
            ? '<button class="am-tax-act" type="button" data-am-act="t-read" '
              + 'onclick="amTaxRead()"' + (cap.busy ? ' disabled' : '') + '>'
              + (cap.busy ? 'Reading…' : 'Upload and read') + '</button>'
            : '')
      +   field("t_note", "Or where it came from", 'type="text" placeholder="City portal, accountant\'s email…"')
      + '</div>';
  }

  /*  ── WHICH ACT IS THIS SHEET ACTUALLY PERFORMING? ────────────────
   *  An entity tax on a property with no taxpayer diverts to the
   *  TAXPAYER step, whatever the operator originally clicked. That has to
   *  be decided in ONE place: the renderer drew the taxpayer form while
   *  confirmTax still branched on the original action, so the confirm
   *  validated the applicability form's fields against a form that was
   *  not on screen — and refused with a message about a field the
   *  operator could not see. §17, in miniature.
   */
  function effectiveTaxAction(cap, d) {
    if (!cap) return null;
    var row = ((d || {}).rows || []).filter(function (r) {
      return r.tax_type === cap.tax_type; })[0] || {};
    var needsTaxpayer = row.subject_kind === "legal_entity"
      && !((d || {}).entities || []).length;
    return needsTaxpayer ? "taxpayer" : cap.action;
  }

  function taxSheetHtml(capIn, d) {
    var cap = capIn;
    var row = (d.rows || []).filter(function (r) {
      return r.tax_type === cap.tax_type; })[0] || {};
    var entityTax = row.subject_kind === "legal_entity";
    var ents = d.entities || [];
    var action = effectiveTaxAction(cap, d);
    //  Carried onto the capture object so the evidence group — built
    //  before `action` is in scope for it — reads the same answer.
    cap.effective_action = action;

    //  ── AN HONEST DEAD END, NAMED ─────────────────────────────────
    //  BIRT and NPT belong to a taxpayer. With no legal entity established
    //  for this property there is nothing to record them against, and
    //  saying that is better than an empty picker or a silent refusal.
    /*  ── THE TAXPAYER, NAMED HERE RATHER THAN NOWHERE ─────────────
     *  BIRT and NPT are owed by a legal entity. This used to be an
     *  honest dead end — it explained the problem correctly and offered
     *  no way out, which left the only route through the database.
     *  Naming the taxpayer is its own act with its own evidence, so it
     *  gets its own step rather than being smuggled into the tax form.
     */
    if (entityTax && !ents.length) {
      return ''
        + '<div class="am-capture" data-am-tax-capture="taxpayer">'
        +   '<h3>Name the taxpayer</h3>'
        +   '<p class="am-cap-blurb">' + esc(row.label || "This tax") + ' is owed by the '
        +     'taxpayer — a legal entity — not by the property, and none is established '
        +     'here yet. Name it once and every entity tax on this property can use it.</p>'
        +   field("t_legal_name", "Legal name", 'type="text" placeholder="2116 Chestnut Partners LLC"',
              "As it appears on the formation document, not a display name.")
        +   selectField("t_entity_type", "What kind of entity?", ENTITY_TYPES)
        +   selectField("t_relationship", "How does it relate to this property?",
              ENTITY_RELATIONSHIPS)
        +   field("t_formation_jurisdiction", "Formed where?", 'type="text" placeholder="PA"')
        +   field("t_effective_from", "Related from", 'type="date"',
              "Dated, so last year’s tax position stays explainable after this year’s transfer.")
        +   taxEvidenceGroup(".pdf",
              "Attach the deed or operating agreement, or say where this came from.", cap)
        +   (cap.error
              ? '<div class="am-cap-error" data-am-tax-error="1">' + esc(cap.error) + '</div>'
              : '')
        +   '<div class="am-cap-actions">'
        +     '<button class="am-cap-cancel" type="button" onclick="amTaxCancel()">Cancel</button>'
        +     '<button class="am-cap-go" type="button" data-am-act="t-confirm" '
        +       'onclick="amTaxConfirm()"' + (cap.busy ? ' disabled' : '') + '>'
        +       (cap.busy ? 'Recording…' : 'Record the taxpayer') + '</button>'
        +   '</div>'
        + '</div>';
    }

    var entityPicker = entityTax
      ? selectField("t_entity", "Which taxpayer?", ents.map(function (e) {
          return { key: e.legal_entity_id, label: e.legal_name }; }),
          "BIRT and NPT belong to the entity, not to the property. One obligation, "
          + "however many properties it holds.")
      : "";

    //  Every payment requirement across the row's live periods, so the
    //  payment sheet can ask WHICH one when there is a choice to make.
    var paymentReqs = (row.periods || []).reduce(function (acc, p) {
      return acc.concat((p.requirements || []).filter(function (q) {
        return q.kind === "payment"; }));
    }, []);

    var body = "";
    if (action === "applicability") {
      body = ''
        + '<p class="am-cap-blurb">A determination somebody makes, with a stated reason. '
        +   'Spine never infers this from an entity type or from what the property is used '
        +   'for — those are reasons to go and decide, not the decision.</p>'
        + entityPicker
        + selectField("t_determination", "What is the determination?", TAX_DETERMINATIONS)
        + field("t_basis", "On what basis?", 'type="text" placeholder="Entirely residential; no commercial use of the premises."',
            "Required. A determination with no reason cannot be re-examined later — and "
            + "“does not apply” is the one that will be questioned.")
        + field("t_effective_from", "In effect from", 'type="date"')
        + taxEvidenceGroup(".pdf,.xlsx,.xls,.csv",
            "Attach what this was decided from, or say where it came from.", cap);
    } else if (action === "bill") {
      var monthly = row.cadence === "monthly";
      //  A SUGGESTION IS NOT A FACT, AND MUST NOT LOOK LIKE ONE. Where
      //  Spine read a value off the uploaded bill the field opens holding
      //  it and is visibly marked as read rather than entered (§38) — at
      //  the exact screen where a human turns one into the other. What
      //  gets recorded is whatever the field holds at confirm.
      var pf = (cap.proposal && cap.proposal.fields) || {};
      body = ''
        + '<p class="am-cap-blurb">What the City says is owed. Spine records the City’s '
        +   'figure — it never computes a tax from an assessment and a rate.</p>'
        + (cap.proposal
            ? '<p class="am-cap-blurb" data-am-tax-proposal="'
              //  Whether there is anything to SHOW, which is found_count.
              //  `available` says only that a read happened, and a
              //  document read to no effect must not look like a proposal.
              + (cap.proposal.found_count ? "1" : "0") + '">'
              + esc(cap.proposal.reason) + '</p>'
            : '')
        + entityPicker
        + field("t_year", monthly ? "Tax year" : "Tax year",
            'type="text" inputmode="numeric" placeholder="2026"', null, pf.period_year)
        + (monthly ? field("t_month", "Month", 'type="text" inputmode="numeric" placeholder="7"',
            "U&O is monthly and is filed and paid by the 25th of the following month.") : "")
        + field("t_account", "City account or OPA number", 'type="text"',
            "How the City refers to this obligation. Evidence, not its identity.",
            pf.account_identifier)
        + field("t_liability", "Amount the City says is owed",
            'type="text" inputmode="decimal" placeholder="leave blank if the bill is not in hand"',
            "Leave blank if you do not have the bill yet. The obligation is still "
            + "established and the amount stays honestly unknown. Spine will not estimate it.",
            pf.annual_liability)
        + field("t_assessment", "Assessed value", 'type="text" inputmode="decimal" placeholder="0.00"',
            "Recorded because it appears on the bill and explains the figure. It never "
            + "produces one.")
        + taxEvidenceGroup(".pdf,.xlsx,.xls,.csv",
            "Attach the bill or notice, or say where this came from.", cap);
    } else if (action === "filing") {
      body = ''
        + '<p class="am-cap-blurb">A return, an estimate or an extension. '
        +   '<strong>Filing does not pay the balance</strong> — that is a separate '
        +   'fact with separate evidence.</p>'
        + ((cap.proposal && cap.proposal.reason)
            ? '<p class="am-cap-blurb" data-am-tax-proposal="'
              + (cap.proposal.found_count ? "1" : "0") + '">'
              + esc(cap.proposal.reason) + '</p>' : '')
        + selectField("t_filing_kind", "What was filed?", TAX_FILING_KINDS)
        + field("t_filed_at", "Filed on", 'type="date"', null,
            (cap.proposal && cap.proposal.fields || {}).filed_at)
        + field("t_confirmation", "Confirmation reference", 'type="text"')
        + taxEvidenceGroup(".pdf", "Attach the return or its confirmation, or say where "
            + "this came from.", cap);
    } else if (action === "payment") {
      body = ''
        + '<p class="am-cap-blurb"><strong>This is what paid means.</strong> Evidence the '
        +   'City was paid — a receipt, a confirmation, a cleared account statement. An '
        +   'escrow balance is not evidence of payment, however healthy it is.</p>'
        + ((cap.proposal && cap.proposal.reason)
            ? '<p class="am-cap-blurb" data-am-tax-proposal="'
              + (cap.proposal.found_count ? "1" : "0") + '">'
              + esc(cap.proposal.reason) + '</p>' : '')
        //  ⚠ WHICH REQUIREMENT THIS PAYS. Offered only when the period
        //  carries more than one, because with a single requirement there
        //  is nothing to choose and the server fills it. With several,
        //  guessing is how an NPT first estimate closes out the second.
        + (paymentReqs.length > 1
            ? selectField("t_requirement", "Which requirement does this pay?",
                paymentReqs.map(function (q) {
                  return { key: q.key,
                           label: q.label + " · due " + q.due
                                  + (q.satisfied ? " · already satisfied" : "") }; }),
                "Money against one requirement is not money against the others.")
            : '')
        + field("t_paid_at", "Paid on", 'type="date"', null,
            (cap.proposal && cap.proposal.fields || {}).paid_at)
        + field("t_amount", "Amount paid", 'type="text" inputmode="decimal" placeholder="0.00"',
            null, (cap.proposal && cap.proposal.fields || {}).amount)
        + selectField("t_paid_by", "Who remitted it?", TAX_PAID_BY,
            "A lender paying from escrow is still a City payment. Recording who paid keeps "
            + "the story explainable without making the escrow the proof.")
        + field("t_confirmation", "Confirmation reference", 'type="text"')
        + taxEvidenceGroup(".pdf,.xlsx,.xls,.csv",
            "Attach the City receipt or confirmation, or say where this came from.", cap);
    } else if (action === "funding") {
      var method = cap.method || "direct";
      body = ''
        + '<p class="am-cap-blurb">How this tax is paid for. Recording it changes nothing '
        +   'about what the City says is owed, and it never says a bill was paid — those '
        +   'are separate facts and Spine keeps them apart.</p>'
        + entityPicker
        + '<label class="am-cap-field" data-am-field="t_method">'
        +   '<span class="am-cap-label">How is it paid?</span>'
        +   '<select class="am-cap-input" data-am-input="t_method" '
        +     'onchange="amTaxMethod(this.value)">'
        +     TAX_FUNDING_METHODS.map(function (m) {
              return '<option value="' + esc(m.key) + '"'
                   + (m.key === method ? ' selected' : '') + '>'
                   + esc(m.label) + '</option>'; }).join("")
        +   '</select>'
        +   '<span class="am-cap-hint">'
        +     esc((TAX_FUNDING_METHODS.filter(function (m) {
                return m.key === method; })[0] || {}).blurb || '') + '</span>'
        + '</label>'
        + field("t_effective_from", "In effect from", 'type="date"',
            "Funding is dated so last year’s answer stays true after this year’s "
            + "servicer changes.")
        //  ONLY THE CHOSEN METHOD'S FACTS. A directly-paid tax has no
        //  servicer and no contribution; showing those fields would invite
        //  a contradiction the server refuses.
        + (method === "lender_escrow"
            ? '<div class="am-cap-group" data-am-tax-funding-fields="lender_escrow">'
              + '<h4>The escrow</h4>'
              + field("t_lender", "Lender", 'type="text"')
              + field("t_servicer", "Servicer", 'type="text"',
                  "Who to ask when the bill is not paid. Spine needs the lender or the "
                  + "servicer — one of the two.")
              + field("t_escrow_ref", "Escrow account reference", 'type="text"')
              + field("t_contribution", "Monthly contribution",
                  'type="text" inputmode="decimal" placeholder="0.00"',
                  "Cash to the servicer. It is not the monthly accrual, and changing it "
                  + "cannot change what the City says is owed.")
              + '</div>'
            : '')
        + taxEvidenceGroup(".pdf,.xlsx,.xls,.csv",
            "Attach the escrow statement or analysis, or say where this came from.", cap);
    } else if (action === "filer_profile") {
      body = ''
        + '<p class="am-cap-blurb">The City’s BIRT return carries a <strong>mandatory '
        +   'estimated payment</strong> for the following year, and grants relief to '
        +   'businesses in their first year in Philadelphia. Which applies here is a '
        +   'determination — Spine will not read it off an entity type or a missing '
        +   'prior return.</p>'
        + selectField("t_filer_profile", "Which is this taxpayer?", BIRT_FILER_PROFILES)
        + field("t_basis", "On what basis?",
            'type="text" placeholder="Filing in Philadelphia since 2019; not a new business."',
            "Required. It decides whether a mandatory payment exists, and a "
            + "determination nobody can re-examine is not one Spine will stand behind.");
    } else if (action === "balance") {
      body = ''
        + '<p class="am-cap-blurb">What the statement said, on the day it said it. A '
        +   'balance shows what the servicer <strong>holds</strong>. It is not evidence '
        +   'the City was paid, even when it is larger than the bill.</p>'
        + field("t_observed_on", "Statement date", 'type="date"')
        + field("t_balance", "Balance held", 'type="text" inputmode="decimal" placeholder="0.00"')
        + taxEvidenceGroup(".pdf,.xlsx,.xls,.csv",
            "Attach the escrow statement, or say where this came from.", cap);
    }

    return ''
      + '<div class="am-capture" data-am-tax-capture="' + esc(action) + '"'
      +      ' data-am-tax-capture-type="' + esc(cap.tax_type) + '">'
      +   '<h3>' + esc(row.label || "") + ' — ' + esc(TAX_SHEET_TITLE[action] || "") + '</h3>'
      +   body
      +   (cap.artifact
            ? '<div class="am-receipt" data-am-tax-artifact="1">'
              + esc(cap.artifact.filename) + ' is on file.</div>'
            : '')
      +   (cap.error
            ? '<div class="am-cap-error" data-am-tax-error="1">' + esc(cap.error) + '</div>'
            : '')
      +   '<div class="am-cap-actions">'
      +     '<button class="am-cap-cancel" type="button" data-am-act="t-cancel" '
      +       'onclick="amTaxCancel()">Cancel</button>'
      +     '<button class="am-cap-go" type="button" data-am-act="t-confirm" '
      +       'onclick="amTaxConfirm()"' + (cap.busy ? ' disabled' : '') + '>'
      +       (cap.busy ? 'Recording…' : 'Confirm and record') + '</button>'
      +   '</div>'
      + '</div>';
  }

  /*  ── DEBT (Capital Stack) ──────────────────────────────────────────
   *  Read-only. There is no capture sheet here — Debt exposes no writer
   *  as a route; establishment happens through the governed document
   *  path, not a form in this screen. See src/asset/debt_routes.js on
   *  the API for why, and do not add a "confirm" button to work around it.
   *
   *  EVERY WALL FROM THE API STAYS VISIBLE HERE. This screen does not
   *  re-derive, re-label or collapse anything the server already refused
   *  to collapse — it renders the distinction, not a summary of it.
   */
  function fmtUSD(cents) {
    if (cents === null || cents === undefined) return null;
    return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtDate(iso) {
    if (!iso) return null;
    var d = new Date(iso + "T00:00:00Z");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  }
  //  Established value, or an honest blank — never a dash, never a zero.
  //  Mirrors positionCellHtml's own rule for exactly the same reason.
  function debtCell(label, value, sub) {
    var known = value !== null && value !== undefined && value !== "";
    return ''
      + '<div class="am-pos-cell">'
      +   '<span class="am-pos-label">' + esc(label) + '</span>'
      +   (known
            ? '<span class="am-pos-value">' + esc(value) + '</span>'
            : '<span class="am-pos-blank" data-am-blank="1">Not established</span>')
      +   (sub ? '<span class="am-standing-next">' + esc(sub) + '</span>' : '')
      + '</div>';
  }

  function debtInstrumentHtml(p) {
    var inst = p.instrument || {};
    var parties = p.parties || {};
    var obs = (p.principal_position && p.principal_position.observed) || {};
    var proj = (p.principal_position && p.principal_position.projected) || {};
    var rate = p.rate_position || {};
    var svc = p.debt_service || {};
    var mat = p.contractual_maturity || {};
    var ext = p.extension || {};

    var title = (inst.instrument_kind || "instrument").replace(/_/g, " ")
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    var lender = parties.holder_assignee && parties.holder_assignee.name;
    var servicer = parties.servicer && parties.servicer.name;

    //  ⚠ W7/W8, ON SCREEN. Observed and projected are two cells, never
    //  one. An observed value that is stale says so next to the number,
    //  not in a tooltip an operator has to go looking for.
    var observedSub = obs.as_of_date
      ? (obs.stale
          ? "as of " + fmtDate(obs.as_of_date) + " — stale"
          : "as of " + fmtDate(obs.as_of_date))
      : null;
    var projectedSub = proj.as_of_date ? "projected to " + fmtDate(proj.as_of_date) : null;

    //  ⚠ W3. An unexercised option is never folded into the maturity date.
    //  Kept OFF the headline strip on purpose: for the overwhelming common
    //  case ("no option evidenced") it is a minor fact, not a fifth number
    //  competing with the loan balance for the operator's eye — PHILOSOPHY
    //  §26's "one leading truth, clear hierarchy". It reads as a plain line
    //  next to Payoff instead, the same secondary register.
    var extensionLine = ext.truth_state === "EXERCISED" ? "Extension exercised."
      : ext.truth_state === "NOT_ESTABLISHED" ? "Extension option not evidenced." : null;

    //  ⚠ W9. Debt service is P&I, and the label says so — the total the
    //  lender actually drafts (including escrow) is a different fact and
    //  does not appear on this card.
    var serviceValue = svc.principal_and_interest_cents != null
      ? fmtUSD(svc.principal_and_interest_cents) : null;

    //  Plain operator words for the closed reserve_kind vocabulary
    //  (migrations/171_debt_instruments.sql), not the enum re-cased. "Tax
    //  Imposition" and "Insurance Imposition" are the WALL's words, not a
    //  reader's — a lender's own statements say "escrow" for exactly this.
    //  Unmapped/future kinds fall back to a titled name so nothing throws.
    var RESERVE_KIND_LABELS = {
      tax_imposition: "Tax Escrow",
      insurance_imposition: "Insurance Escrow",
      replacement: "Replacement Reserve",
      debt_service: "Debt Service Reserve",
      other: "Other Reserve",
    };
    var reserves = (p.reserve_requirements || []).map(function (r) {
      var label = RESERVE_KIND_LABELS[r.reserve_kind] || ((r.reserve_kind || "").replace(/_/g, " ")
        .replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + " Reserve");
      var amt = r.amount_cents != null
        ? fmtUSD(r.amount_cents) + (r.amount_basis === "monthly" ? "/mo" : "")
        : "amount not established";
      return '<div class="am-pos-cell"><span class="am-pos-label">' + esc(label) + '</span>'
        + '<span class="am-pos-value">' + esc(amt) + '</span></div>';
    }).join("");

    return ''
      //  am-cap-group: the existing hairline section divider, reused rather
      //  than a new bordered card — PHILOSOPHY §27 forbids nesting cards.
      + '<div class="am-cap-group">'
      +   '<h3 class="am-room-name" style="font-size:15px;margin-bottom:2px">' + esc(title)
      +     (inst.loan_number ? ' · ' + esc(inst.loan_number) : '') + '</h3>'
      +   (lender || servicer
            ? '<p class="am-standing-next" style="margin:0 0 12px">'
              + [lender ? "Holder: " + lender : null, servicer ? "Servicer: " + servicer : null]
                  .filter(Boolean).map(esc).join(" · ")
              + '</p>'
            : '')
      //  Exactly 5 cells — .am-position is the shared Taxes/Insurance grid,
      //  hard-sized for a five-cell strip (see its CSS comment). A 6th cell
      //  here left a dead grey gap where columns 2-5 of an empty second row
      //  used to be; the fix is keeping this strip at the headline five and
      //  giving Extension its own secondary line below, not a wider grid.
      +   '<div class="am-position" data-am-position-strip="1">'
      //  ⚠ W8 — two cells, always. Never one generic "balance".
      +     debtCell("Principal (observed)", fmtUSD(obs.value_cents), observedSub)
      +     debtCell("Principal (projected)", fmtUSD(proj.value_cents), projectedSub)
      +     debtCell("Rate", rate.effective_rate_bp != null && rate.kind === "fixed"
              ? (rate.effective_rate_bp / 100).toFixed(2) + "% fixed" : null)
      +     debtCell("Debt service (P&I)", serviceValue, serviceValue ? "excludes escrow / reserves" : null)
      +     debtCell("Maturity", fmtDate(mat.date))
      +   '</div>'
      //  ⚠ W1 — payoff is never aliased from principal. Shown only when it
      //  is not established, so the wall itself is visible rather than
      //  the card simply omitting the row.
      +   (p.payoff && p.payoff.truth_state === "NOT_ESTABLISHED"
            ? '<p class="am-standing-next">Payoff amount not established — principal balance is not a payoff quote.</p>'
            : '')
      +   (extensionLine ? '<p class="am-standing-next">' + esc(extensionLine) + '</p>' : '')
      //  am-position-flow: same cells, but sized to however many reserves
      //  actually exist (1-5) instead of a fixed five columns — the reserve
      //  count is data-dependent and a short list must not leave a dead
      //  filler cell the way .am-position would.
      +   (reserves
            ? '<h4 class="am-pos-label" style="margin:16px 0 8px">Reserve requirements</h4>'
              + '<div class="am-position-flow">' + reserves + '</div>'
            : '')
      +   (p.covenant_standing && p.covenant_standing.truth_state === "NOT_ESTABLISHED"
            ? '<p class="am-standing-next" style="margin-top:12px">Covenant compliance not established.</p>'
            : '')
      + '</div>';
  }

  function debtHtml(d) {
    var instruments = (d && d.instruments) || [];
    var header = ''
      + '<div class="am-room-view" data-am-view="compartment" data-am-compartment-open="debt">'
      +   '<button class="am-back" type="button" onclick="amOpenRoom(\'capital_stack\')">'
      +     '← Capital Stack</button>'
      +   '<h2 class="am-room-name">Debt</h2>';

    if (!instruments.length) {
      var why = (d && d.standing && d.standing.why)
        || "Spine holds no governed debt instrument for this property.";
      return header
        + '<div class="am-standing am-standing-none" data-am-debt-standing="not_established">'
        +   '<div class="am-standing-top"><span class="am-standing-state">Not established</span></div>'
        +   '<p class="am-standing-why">' + esc(why) + '</p>'
        + '</div></div>';
    }

    return header
      + instruments.map(debtInstrumentHtml).join('')
      + '</div>';
  }

  function taxesHtml(d) {
    var overall = TAX_OVERALL_COPY[d.overall] || { text: "Standing unknown", tone: "none" };
    var totals = d.totals || {};
    return ''
      + '<div class="am-room-view" data-am-view="compartment" data-am-compartment-open="taxes">'
      +   '<button class="am-back" type="button" onclick="amOpenRoom(\'property_expenses\')">'
      +     '← Property Expenses</button>'
      +   '<h2 class="am-room-name">Taxes</h2>'
      +   (state.receipt
            ? '<div class="am-receipt" data-am-receipt="1">' + esc(state.receipt) + '</div>'
            : '')
      +   (state.tax ? taxSheetHtml(state.tax, d) : '')
      //  STANDING FIRST — the compressed answer, above the numbers that
      //  explain it. It may never outrun the evidence: an unconfirmed
      //  applicability makes the whole position NOT ESTABLISHED, and the
      //  sentence names which taxes are missing.
      +   '<div class="am-standing am-standing-' + esc(overall.tone) + '"'
      +        ' data-am-tax-overall="' + esc(d.overall) + '">'
      +     '<div class="am-standing-top">'
      +       '<span class="am-standing-state">' + esc(overall.text) + '</span>'
      +       (d.jurisdiction
              ? '<span class="am-standing-mile">' + esc(d.jurisdiction === "philadelphia_pa"
                  ? "Philadelphia" : d.jurisdiction) + '</span>'
              : '')
      +     '</div>'
      +     (d.overall_why
              ? '<p class="am-standing-why">' + esc(d.overall_why) + '</p>'
              : '<p class="am-standing-why">Every governed Philadelphia tax on this '
                + 'property is current on the evidence Spine holds.</p>')
      +   '</div>'
      +   '<div class="am-position" data-am-position-strip="1">'
      +     (d.position || []).map(positionCellHtml).join("")
      +   '</div>'
      //  ⚠ A SUBTOTAL PRESENTED AS A TOTAL IS A CONFIDENT WRONG NUMBER at
      //  exactly the altitude where it reaches a lender. When one
      //  obligation has no bill yet, the strip says so beneath itself.
      //  TWO DIFFERENT GAPS, NAMED SEPARATELY, because they have different
      //  next steps: a missing bill is chased from the City, an unanswered
      //  applicability is a determination somebody has to make.
      +   (totals.is_partial
            ? '<p class="am-tax-partial" data-am-tax-partial="1">Partial — '
              + [
                  totals.obligations_with_unknown_amount
                    ? esc(totals.obligations_with_unknown_amount) + ' obligation'
                      + (totals.obligations_with_unknown_amount === 1 ? '' : 's')
                      + ' with no amount established yet'
                    : null,
                  totals.taxes_not_established
                    ? esc(totals.taxes_not_established) + ' tax'
                      + (totals.taxes_not_established === 1 ? '' : 'es')
                      + ' whose applicability has not been confirmed'
                    : null,
                ].filter(Boolean).join(", ")
              + '. The figures above are what is known, not the whole.</p>'
            : '')
      +   '<div class="am-tax-rows" data-am-tax-rows="1">'
      +     (d.rows || []).map(taxRowHtml).join("")
      +   '</div>'
      +   '<div class="am-tax-notes">'
      //  ── THE CORRECTION THAT MATTERS THIS YEAR ────────────────────
      //  The $2,000 annual exemption ended. The TAX did not. Anyone
      //  reasoning "the exemption is gone, so U&O is gone" is wrong in the
      //  direction that under-reports a live monthly obligation, so the
      //  screen answers it rather than leaving it to be remembered.
      +     (d.uo_exemption
              ? '<div class="am-tax-note" data-am-uo-exemption="'
                + (d.uo_exemption.annual_exemption_available ? "available" : "ended") + '">'
                + '<b>Use &amp; Occupancy</b>' + esc(d.uo_exemption.note) + '</div>'
              : '')
      +     ((d.entities || []).length
              ? '<div class="am-tax-note" data-am-tax-entities="1">'
                + '<b>Taxpayer</b>BIRT and NPT are owed by '
                + esc(d.entities.map(function (e) { return e.legal_name; }).join(", "))
                + ', not by the property. One obligation, however many properties it holds.'
                + '</div>'
              : '')
      +     (d.clearance
              ? '<div class="am-tax-note'
                + ((d.clearance.conflicts_with || []).length ? ' is-conflict' : '') + '"'
                + ' data-am-tax-clearance="1">'
                + '<b>Tax clearance</b>'
                + 'Verified through ' + esc(d.clearance.verified_through)
                + (d.clearance.certificate_reference
                    ? '  ·  ' + esc(d.clearance.certificate_reference) : '')
                + (d.clearance.still_valid ? '' : '  ·  expired')
                //  TWO PIECES OF EVIDENCE DISAGREEING. Surfaced, never
                //  quietly resolved in favour of either.
                + ((d.clearance.conflicts_with || []).length
                    ? ' — but Spine reads ' + esc(d.clearance.conflicts_with.join(", "))
                      + ' as overdue. Both are on file; the disagreement is shown rather '
                      + 'than resolved.'
                    : '')
                + '</div>'
              : '')
      +   '</div>'
      + '</div>';
  }

  async function loadCompartment(key) {
    state.busy = true; state.compartmentError = null; render();
    try {
      if (key === "insurance") {
        state.compartmentData = payload(await window.__psLive.assetManagementInsurance());
      } else if (key === "taxes") {
        state.compartmentData = payload(await window.__psLive.assetManagementTaxes({}));
      } else if (key === "debt") {
        state.compartmentData = payload(await window.__psLive.assetManagementDebt());
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
      host.innerHTML = state.compartment === "taxes" ? taxesHtml(state.compartmentData)
        : state.compartment === "debt" ? debtHtml(state.compartmentData)
        : insuranceHtml(state.compartmentData);
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
  function clearCapture() { state.capture = null; state.receipt = null; state.funding = null;
                            state.tax = null; }

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
  /*  ── A REFUSAL MUST NOT COST THE OPERATOR THEIR TYPING ────────────
   *  render() replaces the sheet's markup, so any re-render — showing an
   *  error, switching method, entering the busy state — takes every
   *  entered value with it. Getting a refusal and finding the form blank
   *  is its own small betrayal: the operator is being punished for the
   *  one field they got wrong by losing the twelve they got right.
   *
   *  So every capture re-render snapshots what is on screen and puts it
   *  back. A file input cannot be restored — the browser forbids setting
   *  its value — which is exactly why an uploaded artifact is remembered
   *  on the capture state instead.
   */
  function snapshotFields() {
    var out = {};
    var host = state.host;
    if (!host) return out;
    Array.prototype.forEach.call(host.querySelectorAll("[data-am-input]"), function (el) {
      if (el.type === "file") return;
      out[el.getAttribute("data-am-input")] = el.value;
    });
    return out;
  }

  function restoreFields(values) {
    var host = state.host;
    if (!host || !values) return;
    Object.keys(values).forEach(function (k) {
      var el = host.querySelector('[data-am-input="' + k + '"]');
      if (el && el.type !== "file" && values[k]) el.value = values[k];
    });
  }

  //  Re-render a capture sheet without losing what is in it.
  function renderKeeping() {
    var values = snapshotFields();
    render();
    restoreFields(values);
  }

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
      renderKeeping(); return;
    }
    var kind = inputVal("artifact_kind") || "insurance_policy";

    cap.busy = true; cap.error = null; renderKeeping();
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
      renderKeeping();
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
        renderKeeping(); return;
      }
    }
    if (premium === null) {
      cap.error = "The premium is required — it is what the coverage costs.";
      renderKeeping(); return;
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
        renderKeeping(); return;
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

    cap.busy = true; cap.error = null; renderKeeping();
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
      renderKeeping();
    }
  }

  /*  ══ FUNDING CAPTURE ══════════════════════════════════════════════
   *  Same discipline as the establishment sheet: read every field BEFORE
   *  the busy re-render, because render() replaces the markup and takes
   *  the operator's typing with it. That defect shipped once in the
   *  establishment path and only the browser proof caught it.
   */
  function startFunding() { state.funding = { method: "direct", artifact: null,
                                              error: null, busy: false };
                            state.capture = null; state.receipt = null; render(); }
  function cancelFunding() { state.funding = null; render(); }

  //  Changing the method re-renders the form, which is the point — each
  //  method shows only its own facts. Anything already typed into the
  //  SHARED fields is carried across so switching does not punish the
  //  operator for exploring.
  function setFundingMethod(m) {
    if (!state.funding) return;
    state.funding.method = m;
    //  Shared fields survive the switch. Method-specific ones are gone
    //  because their inputs are gone, which is correct — they belonged to
    //  a method the operator just left.
    renderKeeping();
  }

  async function confirmFunding() {
    var cap = state.funding;
    if (!cap || cap.busy) return;

    var method = inputVal("f_method") || cap.method;
    var coverageId = inputVal("f_coverage");
    var effectiveFrom = inputVal("f_effective_from");
    var note = inputVal("f_note");

    if (!coverageId) { cap.error = "Choose which policy this pays for."; renderKeeping(); return; }
    if (!effectiveFrom) {
      cap.error = "When did this arrangement take effect? Spine dates funding so last "
                + "year's answer stays true after this year's changes.";
      renderKeeping(); return;
    }

    //  Method-specific facts, read before any re-render.
    var finance = null, escrow = null;
    if (method === "premium_financed") {
      var amounts = { down: cents(inputVal("f_down")), principal: cents(inputVal("f_principal")),
                      charge: cents(inputVal("f_charge")), inst: cents(inputVal("f_installment")) };
      for (var k in amounts) {
        if (Number.isNaN(amounts[k])) {
          cap.error = "One of the finance amounts is not a number Spine can read. "
                    + "Enter amounts like 1250.00.";
          renderKeeping(); return;
        }
      }
      var provider = inputVal("f_provider");
      if (!provider) {
        cap.error = "Who lent the premium? A finance agreement with no finance company "
                  + "cannot be explained later.";
        renderKeeping(); return;
      }
      var count = parseInt(inputVal("f_count"), 10);
      finance = {
        finance_provider: provider,
        agreement_reference: inputVal("f_agreement_ref") || null,
        down_payment_cents: amounts.down,
        principal_financed_cents: amounts.principal,
        finance_charge_cents: amounts.charge,
        installment_count: Number.isFinite(count) ? count : null,
        installment_cents: amounts.inst,
        first_payment_date: inputVal("f_first_payment") || null,
      };
    }
    if (method === "lender_escrow") {
      escrow = { lender_name: inputVal("f_lender") || null,
                 servicer_name: inputVal("f_servicer") || null,
                 escrow_account_reference: inputVal("f_escrow_ref") || null };
    }

    //  Evidence: a document, or a note. The server requires one and this
    //  says so before a round trip rather than after a refusal.
    var fileEl = state.host && state.host.querySelector('[data-am-input="f_file"]');
    var file = fileEl && fileEl.files && fileEl.files[0];
    if (!file && !note && !cap.artifact) {
      cap.error = "Upload the agreement or statement, or say where this came from. "
                + "An arrangement with no provenance cannot explain itself later.";
      renderKeeping(); return;
    }

    cap.busy = true; cap.error = null; renderKeeping();
    try {
      var artifactId = cap.artifact && cap.artifact.id;
      if (file && !artifactId) {
        var up = await window.__psLive.assetManagementFundingEvidence({
          file: file,
          artifact_kind: method === "lender_escrow"
            ? "insurance_escrow_statement" : "insurance_finance_agreement" });
        artifactId = (payload(up) || {}).artifact && payload(up).artifact.id;
        //  Kept, so a later refusal does not make the operator upload again.
        state.funding.artifact = (payload(up) || {}).artifact || null;
      }

      var res = await window.__psLive.assetManagementFunding({
        coverage_id: coverageId, funding_method: method,
        effective_from: effectiveFrom,
        artifact_id: artifactId || null,
        provenance_note: note || null,
        finance: finance, escrow: escrow,
      });
      var d = payload(res) || {};
      state.funding = null;
      state.receipt = d.receipt || "Funding recorded.";
      //  RE-READ. The screen shows what the database holds, never an echo.
      await loadCompartment("insurance");
    } catch (e) {
      cap.busy = false;
      cap.error = (e && e.body && e.body.receipt) || (e && e.message)
        || "That did not record. Nothing has been changed.";
      renderKeeping();
    }
  }

  /*  ══ THE TAX SHEET ════════════════════════════════════════════════
   *  One sheet, six acts. They are separate because they are separate
   *  facts, and the two the whole domain turns on are the two an operator
   *  is most tempted to merge:
   *
   *      recording a FILING never pays a balance
   *      recording an ESCROW never pays a bill
   *
   *  Neither this file nor the server offers a path that does both.
   */
  function startTax(taxType, action, obligationId) {
    state.tax = { tax_type: taxType, action: action, method: "direct",
                  obligation_id: obligationId || null,
                  artifact: null, proposal: null, error: null, busy: false };
    state.receipt = null;
    render();
  }
  function cancelTax() { state.tax = null; render(); }
  function setTaxMethod(m) {
    if (!state.tax) return;
    state.tax.method = m;
    //  renderKeeping, so switching method does not cost the operator the
    //  date and the note they already typed. The escrow fields vanish with
    //  their inputs, which is correct — they belonged to the method just
    //  left.
    renderKeeping();
  }

  //  A document, or a stated note. The server requires one and this says
  //  so before a round trip rather than after a refusal.
  function taxEvidence() {
    var el = state.host && state.host.querySelector('[data-am-input="t_file"]');
    return { file: (el && el.files && el.files[0]) || null, note: inputVal("t_note") };
  }

  async function retainTaxEvidence(cap, kind, funding) {
    var ev = taxEvidence();
    if (cap.artifact) return cap.artifact.id;
    if (!ev.file) return null;
    var up = await (funding
      ? window.__psLive.assetManagementTaxFundingEvidence({ file: ev.file, artifact_kind: kind })
      : window.__psLive.assetManagementTaxEvidence({ file: ev.file, artifact_kind: kind }));
    var art = (payload(up) || {}).artifact || null;
    //  Kept, so a later refusal does not make the operator upload again.
    if (state.tax) state.tax.artifact = art;
    return art && art.id;
  }

  /*  ── UPLOAD AND READ ───────────────────────────────────────────
   *  Retains the document and brings back a PROPOSAL. Nothing is written.
   *  The re-render keeps whatever the operator already typed and lets the
   *  proposal fill only the blanks — a value they entered always wins
   *  over one Spine read.
   */
  async function readTaxDocument() {
    var cap = state.tax;
    if (!cap || cap.busy) return;
    var ev = taxEvidence();
    if (!ev.file) {
      cap.error = "Choose the document first, then Spine can read it.";
      renderKeeping(); return;
    }
    var row = ((state.compartmentData || {}).rows || [])
      .filter(function (r) { return r.tax_type === cap.tax_type; })[0] || {};
    cap.busy = true; cap.error = null; renderKeeping();
    try {
      var act = effectiveTaxAction(cap, state.compartmentData || {});
      var kind = act === "filing" ? "tax_return"
        : act === "payment" ? "tax_payment_receipt"
        : act === "funding" || act === "balance" ? "tax_escrow_statement"
        : act === "applicability" ? "tax_account_statement" : "tax_bill";
      var funding = act === "funding" || act === "balance";
      var up = await (funding
        ? window.__psLive.assetManagementTaxFundingEvidence({ file: ev.file, artifact_kind: kind })
        : window.__psLive.assetManagementTaxEvidence({ file: ev.file, artifact_kind: kind }));
      var d = payload(up) || {};
      cap.busy = false;
      cap.artifact = d.artifact || null;
      //  Carried, never merged as though a human had entered it. The
      //  fields show it; it stays identifiable as a proposal.
      cap.proposal = d.proposal || null;
      renderKeeping();
    } catch (e) {
      cap.busy = false;
      cap.error = (e && e.body && e.body.receipt) || (e && e.message)
        || "That upload did not go through. Nothing has been recorded.";
      renderKeeping();
    }
    void row;
  }

  async function confirmTax() {
    var cap = state.tax;
    if (!cap || cap.busy) return;
    var t = cap.tax_type;
    var d = state.compartmentData || {};
    //  THE SAME ANSWER THE RENDERER USED. Branching on cap.action here
    //  while the sheet drew a different form is how a confirm comes to
    //  validate fields that are not on screen.
    var action = effectiveTaxAction(cap, d);
    var row = (d.rows || []).filter(function (r) { return r.tax_type === t; })[0] || {};
    var ev = taxEvidence();
    var entityId = inputVal("t_entity") || null;

    function refuse(msg) { cap.busy = false; cap.error = msg; renderKeeping(); }

    //  ── NAME THE TAXPAYER ──────────────────────────────────────────
    //  Its own act with its own evidence. It establishes NO tax fact,
    //  and the receipt from the server says so.
    if (action === "taxpayer") {
      var legalName = inputVal("t_legal_name");
      var relFrom = inputVal("t_effective_from");
      if (!legalName) return refuse("What is the entity called? Spine records the name on "
        + "the formation document, not a display name.");
      if (!relFrom) return refuse("Related from when? Spine dates the relationship so last "
        + "year’s tax position stays explainable after this year’s transfer.");
      if (!ev.file && !ev.note && !cap.artifact) {
        return refuse("Attach the deed or operating agreement, or say where this came from.");
      }
      cap.busy = true; cap.error = null; renderKeeping();
      try {
        var entArtifact = await retainTaxEvidence(cap, "tax_account_statement", false);
        var er = await window.__psLive.assetManagementLegalEntity({
          legal_name: legalName,
          entity_type: inputVal("t_entity_type") || null,
          formation_jurisdiction: inputVal("t_formation_jurisdiction") || null,
          relationship_type: inputVal("t_relationship") || "owner",
          effective_from: relFrom,
          artifact_id: entArtifact || null, provenance_note: ev.note || null });
        state.tax = null;
        state.receipt = (payload(er) || {}).receipt || "Taxpayer recorded.";
        await loadCompartment("taxes");
      } catch (e) {
        refuse((e && e.body && e.body.receipt) || (e && e.message)
          || "That did not record. Nothing has been changed.");
      }
      return;
    }

    if (action === "filer_profile") {
      var basisText = inputVal("t_basis");
      if (!basisText) return refuse("On what basis? This determines whether a MANDATORY "
        + "payment exists, and a determination nobody can re-examine is not one Spine "
        + "will stand behind.");
      cap.busy = true; cap.error = null; renderKeeping();
      try {
        var fr = await window.__psLive.assetManagementTaxFilerProfile({
          obligation_id: cap.obligation_id,
          birt_filer_profile: inputVal("t_filer_profile") || "established",
          basis: basisText });
        state.tax = null;
        state.receipt = (payload(fr) || {}).receipt || "Filer profile recorded.";
        await loadCompartment("taxes");
      } catch (e) {
        refuse((e && e.body && e.body.receipt) || (e && e.message)
          || "That did not record. Nothing has been changed.");
      }
      return;
    }
    function needsEvidence() {
      if (ev.file || ev.note || cap.artifact) return false;
      refuse("Attach the document, or say where this came from. A tax fact that cannot "
           + "say where it came from cannot be defended later.");
      return true;
    }

    //  Every amount is read BEFORE the first re-render. The insurance sheet
    //  once read its fields after render() and submitted a full form as
    //  empty; only the browser caught it.
    var liability = cents(inputVal("t_liability"));
    var assessment = cents(inputVal("t_assessment"));
    var amount = cents(inputVal("t_amount"));
    var contribution = cents(inputVal("t_contribution"));
    var balance = cents(inputVal("t_balance"));
    var badAmount = [["Amount owed", liability], ["Assessed value", assessment],
                     ["Amount paid", amount], ["Monthly contribution", contribution],
                     ["Balance", balance]].filter(function (p) {
                       return Number.isNaN(p[1]); })[0];
    if (badAmount) {
      return refuse(badAmount[0] + " is not a number Spine can read. Enter an amount "
                  + "like 1250.00.");
    }

    var method = inputVal("t_method") || cap.method;
    var determination = inputVal("t_determination");
    var basis = inputVal("t_basis");
    var effectiveFrom = inputVal("t_effective_from");
    var filedAt = inputVal("t_filed_at");
    var paidAt = inputVal("t_paid_at");
    var observedOn = inputVal("t_observed_on");
    var year = parseInt(inputVal("t_year"), 10);
    var month = parseInt(inputVal("t_month"), 10);

    if (action === "applicability" && !basis) {
      return refuse("On what basis? A determination with no stated reason cannot be "
                  + "re-examined later — and “does not apply” is the one that will be "
                  + "questioned.");
    }
    if (action === "bill" && !Number.isFinite(year)) {
      return refuse("Which tax year is this bill for?");
    }
    if (action === "bill" && row.cadence === "monthly" && !Number.isFinite(month)) {
      return refuse(esc(row.label) + " is monthly — which month is this for?");
    }
    if (action === "filing" && !filedAt) return refuse("When was it filed?");
    if (action === "payment" && !paidAt) return refuse("When was it paid?");
    if (action === "payment" && amount === null) {
      return refuse("How much was paid? A payment with no amount records nothing.");
    }
    if (action === "funding" && !effectiveFrom) {
      return refuse("When did this arrangement take effect? Spine dates funding so last "
                  + "year’s answer stays true after this year’s changes.");
    }
    if (action === "funding" && method === "lender_escrow"
        && !inputVal("t_lender") && !inputVal("t_servicer")) {
      return refuse("Who holds the money? Who to ask when the bill is not paid is the "
                  + "first thing this arrangement has to be able to say.");
    }
    if (action === "balance" && (!observedOn || balance === null)) {
      return refuse("A balance needs the day the statement says it was true, and the "
                  + "amount held.");
    }
    if (needsEvidence()) return;

    cap.busy = true; cap.error = null; renderKeeping();
    try {
      var res, artifactId;
      if (action === "applicability") {
        artifactId = await retainTaxEvidence(cap, "tax_account_statement", false);
        res = await window.__psLive.assetManagementTaxApplicability({
          tax_type: t, determination: determination || "applies", basis: basis,
          effective_from: effectiveFrom || null, legal_entity_id: entityId,
          artifact_id: artifactId || null, provenance_note: ev.note || null });
      } else if (action === "bill") {
        artifactId = await retainTaxEvidence(cap, "tax_bill", false);
        res = await window.__psLive.assetManagementTaxObligation({
          tax_type: t, period_year: year,
          period_month: Number.isFinite(month) ? month : null,
          legal_entity_id: entityId,
          account_identifier: inputVal("t_account") || null,
          //  A BLANK IS NOT A ZERO. Omitted entirely when the bill is not
          //  in hand — the obligation is established and the amount stays
          //  honestly unknown.
          annual_liability_cents: liability,
          assessment_cents: assessment,
          artifact_id: artifactId || null, provenance_note: ev.note || null });
      } else if (action === "filing") {
        artifactId = await retainTaxEvidence(cap, "tax_return", false);
        res = await window.__psLive.assetManagementTaxFiling({
          obligation_id: row.obligation_id, filed_at: filedAt,
          filing_kind: inputVal("t_filing_kind") || "return",
          confirmation_reference: inputVal("t_confirmation") || null,
          artifact_id: artifactId || null, provenance_note: ev.note || null });
      } else if (action === "payment") {
        artifactId = await retainTaxEvidence(cap, "tax_payment_receipt", false);
        res = await window.__psLive.assetManagementTaxPayment({
          obligation_id: row.obligation_id, paid_at: paidAt, amount_cents: amount,
          paid_by: inputVal("t_paid_by") || null,
          satisfies_requirement: inputVal("t_requirement") || null,
          confirmation_reference: inputVal("t_confirmation") || null,
          artifact_id: artifactId || null, provenance_note: ev.note || null });
      } else if (action === "funding") {
        artifactId = await retainTaxEvidence(cap, "tax_escrow_statement", true);
        res = await window.__psLive.assetManagementTaxFunding({
          tax_type: t, funding_method: method, effective_from: effectiveFrom,
          legal_entity_id: entityId,
          //  Sent ONLY for the method that owns it.
          escrow: method === "lender_escrow" ? {
            lender_name: inputVal("t_lender") || null,
            servicer_name: inputVal("t_servicer") || null,
            escrow_account_reference: inputVal("t_escrow_ref") || null,
            monthly_contribution_cents: contribution,
          } : null,
          artifact_id: artifactId || null, provenance_note: ev.note || null });
      } else if (action === "balance") {
        artifactId = await retainTaxEvidence(cap, "tax_escrow_statement", true);
        res = await window.__psLive.assetManagementTaxEscrowBalance({
          arrangement_id: row.funding && row.funding.arrangement_id,
          observed_on: observedOn, balance_cents: balance,
          artifact_id: artifactId || null, provenance_note: ev.note || null });
      }

      var body = payload(res) || {};
      state.tax = null;
      state.receipt = body.receipt || "Recorded.";
      //  RE-READ. The screen shows what the database holds, never an echo
      //  of what was sent.
      await loadCompartment("taxes");
    } catch (e) {
      //  The server's own receipt, verbatim where there is one. It was
      //  written to be said to the person holding the document — replacing
      //  it with "that failed" throws away the only sentence that names
      //  what to do next.
      refuse((e && e.body && e.body.receipt) || (e && e.message)
        || "That did not record. Nothing has been changed.");
    }
  }

  window.amTaxStart = startTax;
  window.amTaxRead = readTaxDocument;
  window.amTaxCancel = cancelTax;
  window.amTaxMethod = setTaxMethod;
  window.amTaxConfirm = confirmTax;

  window.amFundingStart = startFunding;
  window.amFundingCancel = cancelFunding;
  window.amFundingMethod = setFundingMethod;
  window.amFundingConfirm = confirmFunding;

  window.amInsuranceStart = startCapture;
  window.amInsuranceCancel = cancelCapture;
  window.amInsuranceUpload = uploadEvidence;
  window.amInsuranceConfirm = confirmEstablish;

  window.amOpenRoom = openRoom;
  window.amOpenHome = openHome;
  window.amOpenCompartment = openCompartment;
  window.__psAssetManagement = { startFunding: startFunding, cancelFunding: cancelFunding,
                                 confirmFunding: confirmFunding,
                                 mount: mount, reload: load, openRoom: openRoom,
                                 openHome: openHome, openCompartment: openCompartment,
                                 startCapture: startCapture, cancelCapture: cancelCapture,
                                 uploadEvidence: uploadEvidence,
                                 confirmEstablish: confirmEstablish,
                                 startTax: startTax, cancelTax: cancelTax,
                                 setTaxMethod: setTaxMethod, confirmTax: confirmTax,
                                 readTaxDocument: readTaxDocument };
})();
