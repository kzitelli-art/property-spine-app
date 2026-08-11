"use strict";

// PROPERTY SPINE — WORK ORDERS
//
// One compact operating queue. It answers three things and nothing else:
// what needs attention, who owns it, what the next action is.
//
// ── A READ ──────────────────────────────────────────────────────────
// This surface owns no status and keeps no timeline. Every value comes
// from /operator/work-orders/status, which derives it from canonical
// rows. There is no second status layer to keep in sync.
//
// ── LIVE-ONLY, BY CONSTRUCTION ──────────────────────────────────────
// Every call goes through window.__psLive with the staff-session header.
// No fixture path exists in this file. Without a session it renders a
// sign-in line; on a failed read it renders UNAVAILABLE and REMOVES the
// content that was on screen, because leaving stale rows under a toast is
// the defect this app has already recorded once.
//
// ── FOUR THINGS THAT ARE NEVER THE SAME ROW STATE ───────────────────
// scheduled work · a technician's claim · preserved proof · closed work.
// They differ in words, not in badge colour — there are no badges.
//
// ── SORTED BY ATTENTION, NOT BY STATUS ──────────────────────────────
// A completed work order whose resident text failed sits in NEEDS ACTION,
// because the operator is not finished even though the work is. A
// successful resident text never appears in the queue at all.
(function () {
  if (window.__psWorkLifecycleDoorV2) return;
  window.__psWorkLifecycleDoorV2 = true;

  var state = { list: null, detail: null, busy: false, error: null, selected: null,
                receipt: null, picking: null, techs: null,
                //  The not-done capture: which job, which reason, optional note,
                //  and the live vocabulary. `reasons: null` means "not read yet";
                //  an empty array means the read succeeded and returned nothing,
                //  which is a defect worth showing rather than an empty menu.
                stalling: null, reasons: null, reasonsError: null };

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function authorized() {
    try {
      return !!(window.__psLive && typeof window.__psLive.hasSession === "function"
        && window.__psLive.hasSession());
    } catch (e) { return false; }
  }
  function clock(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso), now = new Date();
      var t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return d.toDateString() === now.toDateString() ? t : ("yesterday " + t);
    } catch (e) { return ""; }
  }
  //  A CALENDAR DAY, for facts that are about a date rather than a moment.
  //  "Opened Aug 8" — never a time, because the minute a job was reported is
  //  not something anybody operates on, and printing it invites a reader to
  //  believe it matters.
  function day(iso) {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }); }
    catch (e) { return ""; }
  }
  function firstName(n) { return String(n || "").trim().split(/\s+/)[0] || "someone"; }

  // ── THE DERIVATIONS ───────────────────────────────────────────────
  //  All read off the server's projection. Nothing invented here.
  //  Both live in `current`, which the list and the detail both carry, so
  //  the two surfaces cannot disagree and neither re-derives anything.
  function residentException(w) { return w.current.resident_exception || null; }
  function coordination(w) { return w.current.resident_coordination || null; }
  //  ── WHAT SPINE IS WAITING ON ──────────────────────────────────────
  //  A SECOND DIMENSION, not a state. A job reported as still-needing-work
  //  keeps whatever physical lifecycle it legitimately had — somebody who
  //  accepted, travelled and then found the wrong part is still ACCEPTED,
  //  and the who-line goes on saying so. What changed is what is holding it
  //  up, which the server derives from the open follow-up a stall routed.
  //
  //  Read, never derived here. The door does not decide what a stall means
  //  any more than it decides what a proof state means.
  function attention(w) { return w.current.attention || null; }
  //  MAY THE PERSON LOOKING AT THIS TAKE IT. Server-answered, by the same
  //  predicate the write uses, so the verb cannot be offered where the write
  //  would refuse. `null` means nobody asked — an older payload, or a caller
  //  with no viewer — and null is not "yes".
  function mayAccept(w) {
    var v = w.current.viewer;
    return !!(v && v.may_accept === true);
  }
  //  THE ACCOUNTABLE PERSON, or null. Unchanged, and deliberately so: the
  //  attribution sentences want a bare human name to put in front of a
  //  verb — "KZ accepted", "KZ is on the way" — and a formatted status
  //  string would read as nonsense there.
  function ownerName(w) {
    return w.current.accountable === "UNASSIGNED" ? null : w.current.accountable.name;
  }

  //  ── THE WHO LINE ──────────────────────────────────────────────────
  //  DISPLAY ONLY. It gates nothing, authorizes nothing, and is not read
  //  by any control.
  //
  //  The detail header used to print `ownerName(w) || "UNASSIGNED"`, which
  //  collapsed two different facts into one word. `accountable` is the
  //  ACCEPTANCE rail: the server sets it only once a technician has taken
  //  the job. Work that is assigned and not yet accepted therefore has no
  //  accountable person — correctly — and the header printed UNASSIGNED
  //  while the list, two clicks away, said "Waiting for KZ to accept".
  //  Both surfaces were reading the server honestly and telling the
  //  operator opposite things.
  //
  //  Assignment is not acceptance, and neither is the absence of an owner.
  //  Three facts, three lines, no invention — every name comes off the
  //  same projection the list reads:
  //
  //      KZ · ACCEPTED       accountable — somebody has taken this
  //      KZ · NOT ACCEPTED   assigned, waiting on them to accept
  //      UNASSIGNED          nobody is on it at all
  //
  //  The middle state is the one that did not exist before, and it is the
  //  only one an operator can act on: it names who to chase.
  function whoLine(w) {
    var c = w.current;
    if (c.accountable !== "UNASSIGNED" && c.accountable && c.accountable.name) {
      return c.accountable.name + " · ACCEPTED";
    }
    if (c.assigned_to && c.assigned_to.name) {
      return c.assigned_to.name + " · NOT ACCEPTED";
    }
    return "UNASSIGNED";
  }
  //  ALREADY ASKED. Anything other than "none" means a message about this
  //  same no-access fact exists, so there is nothing to send — only
  //  something to report. `failed` is the exception path and offers Retry.
  function alreadyAsked(w) {
    var c = coordination(w);
    return !!c && c.state !== "none";
  }

  //  NEEDS ACTION is a human judgement, not a status: unowned work, work
  //  that stopped, a claim without proof, or a closed job whose resident
  //  was never told.
  //  ── IS THIS BLOCKER OWNED? ────────────────────────────────────────
  //  A stall that Spine has already routed to an accountable role is work in
  //  progress: somebody owns getting the part, and the board saying so is
  //  enough. A stall with nobody on it is an accountability hole, and that is
  //  a different thing entirely.
  //
  //  This is the whole reason a blocker does not automatically raise a hand.
  //  Forty jobs waiting on forty correctly-routed parts is a calm board, not
  //  forty emergencies — and a board that cries wolf about routed work is one
  //  nobody reads by the fortieth row.
  function routed(a) {
    if (!a || !a.routed_to) return false;
    var r = a.routed_to;
    if (r.status === "complete") return false;
    return !!(r.assigned_role || r.assigned_user_id);
  }

  //  ── THE CLASSIFICATION CONTRACT ───────────────────────────────────
  //  A shared board is shared to SEE. Ownership is named to DO. The bands
  //  encode exactly that, and the first test is deliberately about the
  //  VIEWER rather than the work:
  //
  //    action    somebody looking at THIS surface can or must move it now —
  //              an unowned job, an acceptance available to this viewer, a
  //              resident who must be asked, a claim needing review, a
  //              blocker nobody owns, a message that failed to send
  //    progress  legitimately moving, or waiting on a named person or step
  //              that Spine already knows about
  //    done      governed completion
  //
  //  "Waiting for KZ to accept" is therefore PROGRESS on a manager's screen
  //  and ACTION on KZ's, from the same payload — because `may_accept` is
  //  answered per viewer by the server. That is not an inconsistency; it is
  //  the board telling each person what is theirs.
  function band(w) {
    var s = w.current.state;
    //  A RESIDENT WE FAILED TO REACH OUTRANKS COMPLETION. This file's own
    //  header states the rule: "a completed work order whose resident text
    //  failed sits in NEEDS ACTION, because the operator is not finished
    //  even though the work is." It is a failed delivery needing
    //  intervention, which is the definition of the band.
    //
    //  A revision of this function tested `completed` FIRST and quietly
    //  dropped those rows into Recently completed — where nobody would ever
    //  look for them again. The unit test blessed it, because the unit test
    //  was written from the same mistaken idea. Only the browser proof,
    //  against real rows, said otherwise. Do not move this line above it.
    if (residentException(w)) return "action";
    if (s === "completed") return "done";
    //  This viewer can take it. The one genuinely viewer-relative test.
    if (mayAccept(w)) return "action";
    //  Somebody says it is finished; a human must judge the proof.
    if (s === "completion_claimed") return "action";
    //  Nobody owns it at all — the accountability hole §5 exists for.
    if (!w.current.assigned_to && w.current.accountable === "UNASSIGNED") return "action";
    //  Entry failed and the resident has not been asked. Once they have,
    //  Spine is waiting on a named party and the row stops asking.
    if (s === "no_access" && !alreadyAsked(w)) return "action";
    //  A blocker with nobody on it. Routed ones fall through to progress.
    if (attention(w) && !routed(attention(w))) return "action";
    //  Reported blocked with no routed follow-up behind it — there is a
    //  decision owed and no named owner for it.
    if (s === "blocked" && !routed(attention(w))) return "action";
    return "progress";
  }

  //  ── THE ONLY PLACE THIS FILE TOUCHES PROOF ────────────────────────
  //  Every proof question goes through the shared normalizer. This surface
  //  does not test `proof.satisfied`, does not compare `proof.state` to a
  //  string, and does not decide what a missing field means. See
  //  proof-normalizer.js.
  //
  //  MODULE SCOPE, NOT NESTED. Both of these are read by stateLine (the
  //  list) AND by detailHtml (the job). They were first landed inside
  //  stateLine's body, where the hoist made them invisible to detailHtml
  //  and every detail render threw ReferenceError — a break the list never
  //  showed, because the list is the one caller that could still see them.
  //  Their placement is load-bearing. Do not nest them again.
  function proofOf(d) {
    var n = (typeof window !== "undefined" && window.__psProof) || null;
    //  If the normalizer did not load, we do NOT fall back to reading the
    //  payload ourselves — a second interpretation is the defect the
    //  normalizer exists to prevent. Unavailable is the honest answer.
    if (!n) return { status: "contract_failure", renders: "unavailable", state: null,
                     satisfied: null, isDefect: false, required: true,
                     notPreservedCount: 0, legacyEvidence: { photo: false, note: false },
                     label: "Proof state unavailable.", reasonCode: "normalizer_absent" };
    return n.normalize(d && d.proof);
  }

  //  The trailing clause on the CURRENT line. Legacy and defect are their
  //  own sentences — neither is "photo required", and neither is silence.
  //
  //  ── PROOF STAYS QUIET UNTIL IT MATTERS ────────────────────────────
  //  Ordinary open work says NOTHING about proof. Nobody has claimed the job
  //  is finished, so there is no evidence question to answer yet, and raising
  //  one early teaches an operator to read past it. The only two sentences a
  //  normal day should produce are:
  //
  //      Needs proof                 somebody says it is done, nothing kept
  //      Proof verified · 2 photos   somebody says it is done, and it is
  //
  //  The other three are real and rare, and each keeps its own full sentence
  //  because none of them means "no proof". A missing evaluation is a DEFECT —
  //  work completed without being judged — and `legacy_indeterminate` is
  //  pre-Release-0 work that can never be resolved either way. Rounding either
  //  into "Needs proof" would be the confident-wrong the normalizer exists to
  //  prevent, so they are never shortened.
  function proofSentence(d) {
    var p = proofOf(d);
    if (p.renders === "unavailable")  return ' <span class="attn">' + p.label + "</span>";
    if (p.state === "satisfied") {
      //  FROM THE NORMALIZER, never from the payload. Reading
      //  `d.proof.preserved_count` here would make this file a SECOND
      //  interpreter of the proof object, which is the one thing
      //  proof-normalizer.js exists to prevent — and the single-interpretation
      //  assertion in proof_presentation_contract catches it, as it just did.
      //
      //  §5 — stated only when the server sent one. "Proof verified" alone is
      //  honest; "· 0 photos" beside a satisfied proof is a number we invented
      //  to fill out the sentence.
      var n = p.preservedCount;
      return n === null || n === undefined ? " Proof verified."
        : " Proof verified · " + n + (n === 1 ? " photo." : " photos.");
    }
    if (p.state === "not_satisfied")  return ' <span class="attn">Needs proof.</span>';
    if (p.state === "legacy_indeterminate") return ' <span class="attn">' + p.label + "</span>";
    if (p.isDefect)                   return ' <span class="exc">' + p.label + "</span>";
    return "";
  }

  //  ONE proof sentence for a board row, or null when proof has nothing to
  //  add. Shared by the claim and the completion so the two states cannot
  //  describe identical evidence differently — the defect this whole surface
  //  keeps re-learning is two readers of one fact drifting apart.
  //
  //  Returns null for `not_satisfied`, because the CALLER decides what silence
  //  means there: a claim without evidence needs proof, a completion without
  //  it is a governed state whose story the attribution already tells.
  function proofLine(w) {
    var p = proofOf(w);
    if (p.renders === "unavailable") return { text: "Proof state unavailable", tone: "attn" };
    if (p.isDefect) return { text: "Proof evaluation missing", tone: "exc" };
    if (p.state === "legacy_indeterminate") return { text: "No historical proof evaluation", tone: "attn" };
    if (p.satisfied === true) {
      var n = p.preservedCount;
      return { text: (n === null || n === undefined) ? "Proof verified"
                 : "Proof verified · " + n + (n === 1 ? " photo" : " photos"), tone: "" };
    }
    return null;
  }

  //  ONE line about what is true now. Empty for calm rows — a row with
  //  nothing wrong should say nothing.
  function stateLine(w) {
    var s = w.current.state, x = residentException(w);
    //  Named for the fact that caused it. A failed text about a completion
    //  and a failed text about entry are different exceptions.
    if (x) {
      return { text: x.kind === "completed" ? "Resident completion text failed" : "Resident text failed",
               tone: "exc" };
    }
    //  PROOF SPEAKS ON EXACTLY TWO STATES — somebody has claimed the work is
    //  finished, or it is finished. Before that there is no evidence question
    //  to answer, and raising one early teaches an operator to read past it.
    if (s === "completion_claimed" || s === "completed") {
      var pl = proofLine(w);
      //  A completed job with nothing unusual to say about proof falls
      //  through to null, and the attribution line carries "Completed by KZ".
      if (pl) return pl;
      if (s === "completion_claimed") return { text: "Needs proof", tone: "attn" };
      return null;
    }
    //  THE STALL, once a fresher claim is not competing with it. A
    //  completion claim above outranks this on purpose: if somebody has
    //  since said the work is finished, an older "waiting on a part" is
    //  history, and the proof question is what a human must answer.
    var at = attention(w);
    if (at) return { text: at.label, tone: "attn" };
    //  NO ACCESS IS FOUR SITUATIONS. Reporting no access already texts the
    //  resident, so the row must say what happened — not invite the
    //  operator to send the same sentence again.
    if (s === "no_access") {
      var c = coordination(w);
      if (c && (c.state === "sent" || c.state === "delivered" || c.state === "unknown")) {
        return { text: "Asked resident at " + clock(c.at) + " · waiting for reply", tone: "attn" };
      }
      if (c && c.state === "prepared") return { text: "Resident message prepared", tone: "attn" };
      return { text: "Entry could not be completed", tone: "attn" };
    }
    if (s === "blocked")   return { text: "Work is blocked", tone: "attn" };
    //  OWNERSHIP IS THE WHO-LINE'S JOB. This used to say "Waiting for KZ to
    //  accept" and "No owner", which was right while the row had no who-line
    //  — it was the only place ownership could be said. The contract now puts
    //  the three-state vocabulary on every row, so saying it here as well made
    //  an unowned job read UNASSIGNED / No owner / Assign: one fact, three
    //  times, which is the exact redundancy the earlier ruling removed.
    //
    //  What survives is the half a who-line CANNOT say. "KZ · NOT ACCEPTED"
    //  is a fact about who holds the job; "Waiting for KZ" is a fact about
    //  what has to happen next. With nobody assigned there is nothing to be
    //  waiting for, so the row says nothing here and the Assign verb — the
    //  one dominant action — carries the next step by itself.
    if (s === "scheduled") {
      var a = w.current.assigned_to;
      return a ? { text: "Waiting for " + firstName(a.name), tone: "attn" } : null;
    }
    return null;
  }

  //  ONE verb, and only when something must be done.
  function action(w) {
    var s = w.current.state;
    if (residentException(w)) return { verb: "Retry", tone: "red", kind: "retry_resident" };
    //  TAKE JOB — the one verb that is about the person reading the row
    //  rather than about the work. It appears only where the SERVER says
    //  this human may accept: assigned to them, still open, still unaccepted,
    //  at a property they are on the team for. The browser never decides it,
    //  so the control cannot exist on a row the write would refuse.
    //
    //  Taking is not assigning. Somebody else's job never offers this verb —
    //  it offers nothing, because the operator's move there is to reassign.
    if (mayAccept(w)) return { verb: "Take job", tone: "", kind: "accept" };
    if (s === "completion_claimed") return { verb: "Review", tone: "", kind: "review" };
    //  ONLY when nobody has asked. Once the automatic no-access derivation
    //  has created the resident coordination message, this verb GOES — the
    //  operator is shown what happened and what is still pending instead.
    if (s === "no_access") {
      return alreadyAsked(w) ? null : { verb: "Coordinate entry", tone: "", kind: "coordinate" };
    }
    if (s === "blocked")   return { verb: "Review", tone: "", kind: "review" };
    //  Only when there is nobody. Work already assigned is waiting on the
    //  technician, and offering "Assign" there would be the wrong move.
    if (s === "scheduled" && !w.current.assigned_to) return { verb: "Assign", tone: "", kind: "assign" };
    return null;
  }

  //  The quiet attribution line. Verb-first about the last thing that
  //  happened, attributed, with a time.
  function attribution(w) {
    var c = w.current, who = ownerName(w);
    //  WHEN THE STALL WAS REPORTED. The state line says what we are waiting
    //  on; this says since when, which is the operator's real question about
    //  a part that has not arrived. Timed from the immutable event the server
    //  read it from — never the work order's updated_at, which moves for
    //  reasons that have nothing to do with the stall.
    var at = attention(w);
    if (at && at.since && !c.completed_at) return "Updated " + clock(at.since);
    if (c.completed_at) return "Completed by " + firstName(c.completed_by && c.completed_by.name) + " · " + clock(c.completed_at);
    if (c.completion_claimed_at) return firstName(who) + " reported finished · " + clock(c.completion_claimed_at);
    if (c.blocked) return firstName(who) + " · " + clock(c.blocked.since);
    if (c.state === "en_route") return firstName(who) + " is on the way · " + clock(c.en_route_at);
    if (c.accepted_at) return firstName(who) + " accepted · " + clock(c.accepted_at);
    //  NOTHING HAS HAPPENED YET, so the only true thing left to say is when
    //  the job arrived. An untouched work order is not eventless — it is
    //  waiting, and how long it has been waiting is the operator's whole
    //  question about it. Still never UNASSIGNED here: that is the who-line's
    //  word, and as metadata it is schema talk.
    var opened = day(w.work_order.opened_at);
    return opened ? "Opened " + opened : "";
  }

  //  ── THE HEAD OF A ROW: WHICH JOB, WHERE, WHAT IS WRONG ────────────
  //  The reference is FIRST-CLASS now. It used to appear only as a fallback
  //  when `title` was missing, so the one handle a technician and an operator
  //  can say out loud — "ten-oh-seven" — was invisible on every row that had
  //  a description. Two different facts, two slots, always both.
  //
  //  §5 — a work order with no description says so. "Work order 1007" as a
  //  description was the reference wearing a description's clothes: it read
  //  as though somebody had named the job when nobody had, and it put the
  //  same number on screen twice.
  function title(w) {
    var unit = w.work_order.unit_number ? "Unit " + w.work_order.unit_number : "Common area";
    return {
      ref: w.work_order.reference ? "#" + w.work_order.reference : null,
      unit: unit,
      what: w.work_order.title || null,
      //  READ, never derived. The server decides what a true emergency is
      //  (urgency_status === 'emergency', the same line the canonical create
      //  service draws). The door does not get a vote, and there is no tier
      //  vocabulary here — one fact, or nothing.
      emergency: w.work_order.is_emergency === true
    };
  }

  //  ── URGENCY IS NOT ATTENTION ──────────────────────────────────────
  //  Two different questions about one job:
  //
  //      attention   does somebody have to act now?      → the band
  //      urgency     how consequential is the condition? → this
  //
  //  So EMERGENCY does NOT push a row into Needs action. An emergency that
  //  KZ has accepted and is driving to is urgent and waiting on nobody; it
  //  belongs in In progress, at the top. An emergency with no owner lands in
  //  Needs action for the ordinary reason — the accountability hole — not
  //  because of its urgency.
  //
  //  Collapsing the two is how a board ends up with everything shouting: the
  //  old surface had an emergency lane, red alerts and call-count chips, and
  //  an operator learned to read past all of it.
  function emergencyFirst(rows) {
    //  Stable: only the emergency/ordinary split moves. Within each half the
    //  server's own ordering survives, because it is the one that knows how
    //  these were sorted in the first place.
    var em = [], rest = [];
    rows.forEach(function (w) { (title(w).emergency ? em : rest).push(w); });
    return em.concat(rest);
  }

  // ── LOADERS ───────────────────────────────────────────────────────
  //  __psLive returns the loader's envelope — { data, meta } — for every read
  //  and every write. The server payload is data. This door once read the
  //  envelope as if it WERE the payload, which is invisible against a stub
  //  that returns bare JSON and renders an empty queue against the real
  //  loader. Unwrap once, here, the way every other door does.
  function payload(o) { return (o && o.data) || null; }

  async function loadList() {
    state.busy = true; state.error = null; render();
    try {
      state.list = payload(await window.__psLive.workOrderLifecycleList());
    } catch (e) {
      //  Content GOES. Never left standing under an error.
      state.list = null; state.detail = null; state.error = e;
    } finally { state.busy = false; render(); }
  }
  async function loadDetail(id) {
    state.busy = true; state.error = null; state.selected = id; render();
    try { state.detail = payload(await window.__psLive.workOrderLifecycle({ workOrderId: id })); }
    catch (e) { state.detail = null; state.error = e; }
    finally { state.busy = false; render(); }
  }
  function backToList() {
    state.detail = null; state.selected = null; state.receipt = null;
    //  A half-filled capture must not survive leaving the job it was about.
    state.stalling = null;
    render();
  }

  //  The server names the message to retry, so the row can retry it without
  //  first loading the detail to go looking for it.
  function failedResidentEventId(w) {
    var x = w && residentException(w);
    return x ? x.comm_event_id : null;
  }
  function rowById(id) {
    var list = (state.list && state.list.work_orders) || [];
    for (var i = 0; i < list.length; i++) if (list[i].work_order.id === id) return list[i];
    return null;
  }

  //  The SMALLEST eligible-candidate surface: the people the server says may
  //  hold this work, and nobody else. Not a staffing screen.
  async function openPicker(id) {
    state.picking = { id: id, chosen: null }; state.receipt = null; state.busy = true; render();
    try { state.techs = (payload(await window.__psLive.workOrderTechnicians()) || {}).technicians || []; }
    catch (e) { state.techs = []; state.receipt = { text: "Could not load technicians.", bad: true }; }
    finally { state.busy = false; render(); }
  }

  //  ── STILL NEEDS WORK ──────────────────────────────────────────────
  //  The person in the unit reports ONE fact: what is stopping completion.
  //  They are not choosing a workflow. Each reason routes to a different
  //  obligation, owner and escalation SERVER-SIDE — a part goes to
  //  maintenance, a quote goes to the property manager — and none of that
  //  routing is visible here, because knowing it is not their job.
  //
  //  THE VOCABULARY IS READ LIVE, WITH NO FALLBACK. The retired drawer kept
  //  a hardcoded copy of these labels "in case the endpoint isn't reachable",
  //  and because index.html's getJSON is offline-locked that copy was the
  //  only thing it ever rendered — a governed picker populated from a literal
  //  in the page. If this read fails the door says so and offers nothing,
  //  because a reason we cannot route is a stall with no next step.
  async function openNotDone(id) {
    state.stalling = { id: id, chosen: null, note: "" };
    state.receipt = null; state.picking = null;
    if (state.reasons) { render(); return; }
    state.busy = true; state.reasonsError = null; render();
    try {
      var out = payload(await window.__psLive.workOrderNotDoneReasons()) || {};
      state.reasons = out.reasons || [];
    } catch (e) {
      state.reasons = null; state.reasonsError = e;
    } finally { state.busy = false; render(); }
  }

  function stallHtml() {
    var s = state.stalling;
    if (!s) return "";
    var head = '<div class="wo-pick-q">What is stopping completion?</div>';
    if (state.reasonsError || state.reasons === null) {
      //  §5 — an honest blank. Never a guessed menu.
      return '<div class="wo-pick" data-wo-stall="1">' + head
        + '<div class="wo-s exc" data-wo-reasons-unavailable="1">'
        + "The reason list could not be loaded, so this cannot be recorded yet.</div>"
        + '<button class="wo-act" data-wo-stall-retry="1">Retry</button>'
        + '<button class="wo-act" data-wo-stall-cancel="1">Cancel</button></div>';
    }
    if (!state.reasons.length) {
      return '<div class="wo-pick" data-wo-stall="1">' + head
        + '<div class="wo-s exc">No reasons are configured, so there is nowhere to route this.</div>'
        + '<button class="wo-act" data-wo-stall-cancel="1">Cancel</button></div>';
    }
    return '<div class="wo-pick" data-wo-stall="1">' + head
      + '<select data-wo-reason><option value="">Choose a reason…</option>'
      + state.reasons.map(function (r) {
          return '<option value="' + esc(r.key) + '"' + (s.chosen === r.key ? " selected" : "")
            + ">" + esc(r.label) + "</option>";
        }).join("")
      + "</select>"
      + '<input data-wo-stall-note placeholder="Anything worth adding (optional)" value="' + esc(s.note) + '">'
      + '<button class="wo-act" data-wo-stall-go="1">Log it</button>'
      + '<button class="wo-act" data-wo-stall-cancel="1">Cancel</button></div>';
  }

  function pickerHtml() {
    var t = state.techs || [];
    return '<div class="wo-pick" data-wo-picker="1">'
      + '<select data-wo-tech><option value="">Choose a technician…</option>'
      + t.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.name) + "</option>"; }).join("")
      + "</select>"
      + '<button class="wo-act" data-wo-assign-go="1">Assign</button>'
      + '<button class="wo-act" data-wo-assign-cancel="1">Cancel</button></div>';
  }

  // ── RENDER ────────────────────────────────────────────────────────
  //  ── THE OPERATING BANDS ARE THE PAGE'S COMPOSITION ────────────────
  //  Each carries one line saying WHY its rows are there. A band heading
  //  without that line makes an operator infer the rule, and the rule is the
  //  thing most worth being explicit about: "needs action" is a claim about
  //  what a human must do, not about what is wrong.
  var BANDS = [
    ["action",   "Needs action",       "Someone has to move these forward."],
    ["progress", "In progress",        "Moving, or waiting on a named next step."],
    ["done",     "Recently completed", "Closed with proof."]
  ];

  //  ── THE ROW · FIVE ANSWERS, THREE LINES ───────────────────────────
  //  which job · where · what is wrong · who has it · what happens next.
  //
  //  The contract asks a row to answer five questions. It does not ask for
  //  five lines, and the difference is the whole design: a queue is read in
  //  glances, so every line added to one row is a job subtracted from what
  //  fits on the screen. The handle and the place share a line. The problem
  //  gets the loud line to itself, because it is the only thing on the row a
  //  human recognises without reading. Everything about TIMING — what we are
  //  waiting for, and since when — collapses onto one quiet line.
  //
  //  Ownership and the verb sit together on the right, because "who has it"
  //  and "what happens next" are the same question asked twice, and an
  //  operator scanning for work to move looks in exactly one place for both.
  //
  //  `.wo-s` KEEPS THE STATE SENTENCE ALONE. It reads as one line with the
  //  timing beside it, but they are two elements: the proof-presentation
  //  contract compares that element's textContent to an exact string, and
  //  folding the timing into it would silently turn "Photo required to close"
  //  into "Photo required to close · Opened Aug 8" and break a real guard.
  function rowHtml(w) {
    var t = title(w), sl = stateLine(w), a = action(w), at = attribution(w);
    //  AN ACCOUNTABILITY HOLE EARNS A LITTLE MORE INK — and only a little.
    //  Read off the projection, NOT by comparing whoLine's output to a
    //  string: the moment a display helper is compared to anything it has
    //  become a predicate, and that is an authority change wearing a styling
    //  change's clothes. The who-line guard checks for exactly that.
    var unowned = !w.current.assigned_to && w.current.accountable === "UNASSIGNED";
    //  `.wo-main` is not decoration: on a phone it becomes display:contents so
    //  its children join the row's own grid and can be REORDERED. Without a
    //  handle here the mobile layout could only stack the desktop order.
    return '<div class="wo-row" data-wo="' + esc(w.work_order.id) + '">'
      + '<div class="wo-main">'
      + '<div class="wo-h">'
      + (t.ref ? '<span class="wo-ref">' + esc(t.ref) + "</span> · " : "")
      + esc(t.unit)
      //  TYPOGRAPHY, NOT A BADGE. It sits in the handle line beside the
      //  reference and the unit because it is the same kind of fact: what
      //  this job IS. A coloured pill would make it a status, and statuses
      //  are what the three bands already say.
      + (t.emergency ? ' · <span class="wo-em">EMERGENCY</span>' : "")
      + "</div>"
      + '<div class="wo-t">'
      + (t.what ? esc(t.what) : '<span class="wo-none">No description recorded</span>')
      + "</div>"
      + ((sl || at) ? '<div class="wo-meta">'
          + (sl ? '<div class="wo-s ' + sl.tone + '">' + esc(sl.text) + "</div>" : "")
          + (at ? '<div class="wo-a">' + esc(at) + "</div>" : "")
          + "</div>" : "")
      + "</div>"
      + '<div class="wo-right" data-owner="' + (unowned ? "none" : "named") + '">'
      + '<div class="wo-who">' + esc(whoLine(w)) + "</div>"
      + (a ? '<button class="wo-act ' + a.tone + '" data-act="' + esc(a.kind) + '" data-wo="'
             + esc(w.work_order.id) + '">' + esc(a.verb) + "</button>" : "")
      + "</div>"
      + "</div>";
  }

  function listHtml(payload) {
    var groups = { action: [], progress: [], done: [] };
    (payload.work_orders || []).forEach(function (w) { groups[band(w)].push(w); });

    //  ORIENTATION, NOT ANALYTICS. One line of counts in the same grammar
    //  Leasing uses for "Today in Leasing" — bold number, plain words, no
    //  tiles and no chart. It tells somebody arriving how much there is; the
    //  bands below tell them what to do about it.
    //
    //  `.wo-count` keeps the phrase "N need action" because that is the
    //  sentence the browser proof reads, and it is still the truest first
    //  fact on the page.
    var h = '<div class="wo-brief">'
      + '<span class="wo-count"><b>' + groups.action.length + "</b> need action</span>"
      + '<span class="wo-brief-f"><b>' + groups.progress.length + "</b> in progress</span>"
      + '<span class="wo-brief-f"><b>' + groups.done.length + "</b> completed recently</span>"
      + "</div>";

    if (!payload.count) {
      //  HONEST EMPTY — a fact about this property, not a reassurance.
      return h + '<div class="wo-empty" data-wo-empty="1">No work orders at this property.</div>';
    }
    BANDS.forEach(function (b) {
      var rows = emergencyFirst(groups[b[0]]);
      if (!rows.length) return;
      h += '<section class="wo-sec" data-band="' + b[0] + '">'
        + '<div class="wo-sec-h"><span class="wo-sec-t">' + b[1] + "</span>"
        + '<span class="wo-sec-n">' + rows.length + "</span></div>"
        + '<div class="wo-sec-why">' + b[2] + "</div>"
        + rows.map(rowHtml).join("") + "</section>";
    });
    return h;
  }

  function detailHtml(d) {
    var t = title(d), c = d.current, failed = residentException(d);
    var who = ownerName(d);

    //  CURRENT — ONE operating statement. Never the same fact three times.
    var cur;
    if (c.state === "completed") {
      cur = "Completed by " + firstName(c.completed_by && c.completed_by.name) + " at " + clock(c.completed_at) + "."
        + proofSentence(d);
    } else if (c.state === "completion_claimed") {
      cur = firstName(who) + " reports the work is finished."
        + proofSentence(d);
    } else if (c.state === "no_access") {
      cur = firstName(who) + " could not get in. The repair has not been attempted."
        + (alreadyAsked(d) && coordination(d).state !== "failed"
            ? " The resident was asked to coordinate entry at " + clock(coordination(d).at) + "." : "");
    } else if (c.state === "blocked") {
      cur = firstName(who) + " reports the work is blocked.";
    } else if (c.state === "en_route") {
      cur = firstName(who) + " is on the way.";
    } else if (c.state === "accepted") {
      cur = firstName(who) + " has taken the job.";
    } else {
      cur = "Nobody has taken this yet.";
    }

    //  THE SAME HEAD AS THE ROW, in the same order, for the same reason: the
    //  operator arrived here by clicking a row, and the first thing they must
    //  be able to do is confirm they opened the job they meant to. A detail
    //  that renames or reorders the identifying facts makes that confirmation
    //  a small act of translation every single time.
    var opened = day(d.work_order.opened_at);
    var h = '<div class="wo-back"><button class="wo-backbtn" data-wo-back="1">‹ Work Orders</button></div>'
      + '<div class="wo-d-h">'
      + (t.ref ? '<span class="wo-ref">' + esc(t.ref) + "</span> · " : "")
      + esc(t.unit)
      + (t.emergency ? ' · <span class="wo-em">EMERGENCY</span>' : "")
      + (opened ? ' <span class="wo-a">· Opened ' + esc(opened) + "</span>" : "")
      + "</div>"
      + '<div class="wo-d-title">'
      + (t.what ? esc(t.what) : '<span class="wo-none">No description recorded</span>')
      + "</div>"
      + '<div class="wo-d-who">' + esc(whoLine(d)) + "</div>"
      //  ── WHO THIS IS HAPPENING TO ──────────────────────────────────
      //  A work order in unit 631 and the resident of unit 631 are one
      //  physical reality, and nothing on this surface connected them: an
      //  operator reading "no hot water" could not reach the person without
      //  it. The name is a link into their Person Card, so the traversal
      //  from the work to the human is one tap and needs no search.
      //
      //  SERVER-DERIVED (§21). `residents` comes from the active lease on
      //  the unit; the door never infers a person from a unit label.
      //
      //  §5 — ABSENT IS SILENT. A common-area job has no unit and a vacant
      //  unit has no lease, so both send an empty list and this line simply
      //  does not render. No "no resident" label, no dead link: not knowing
      //  is not a claim worth a sentence.
      //
      //  EVERY tenant on the lease, because Spine has no basis for choosing
      //  which of two leaseholders is "the" resident.
      + ((d.work_order.residents || []).length
          ? '<div class="wo-d-res">Resident'
            + (d.work_order.residents.length > 1 ? "s" : "") + " · "
            + d.work_order.residents.map(function (r) {
                return '<button class="wo-res" type="button" data-person="'
                  + esc(r.person_id) + '" data-person-name="' + esc(r.name) + '">'
                  + esc(r.name) + "</button>";
              }).join(" · ")
            + "</div>"
          : "")
      //  ── ORGANISED AROUND THE HUMAN QUESTIONS, NOT THE SCHEMA ────────
      //  Opening a job should answer the SITUATION, not dump the record. Three
      //  questions, in the order somebody actually asks them:
      //
      //      WHAT IS HAPPENING   one operating statement, and any proof that
      //                          matters yet
      //      WHAT YOU CAN DO     one dominant action, with the stall report
      //                          quiet beneath it
      //      (then history)      everything chronological, folded away
      //
      //  There is no fifteen-field form here on purpose. Every field a form
      //  would show is either already in the sentence above or in the history
      //  below, and a label with a value beside it is how a surface stops
      //  telling somebody what is going on.
      + '<div class="wo-d-sec">What is happening</div>'
      + '<div class="wo-d-cur">' + cur + "</div>";

    //  NEXT for open work · EXCEPTION for something unresolved after close.
    if (failed) {
      h += '<div class="wo-d-band" data-wo="exception"><div>'
        + '<div class="wo-d-lbl red">Exception</div>'
        + '<div class="wo-d-what">'
        + (failed.kind === "completed" ? "Resident completion text failed" : "Resident text failed")
        + "</div></div>"
        + '<button class="wo-act red" data-act="retry_resident">Retry</button></div>';
    } else if (d.next_action) {
      h += '<div class="wo-d-band" data-wo="next"><div>'
        + '<div class="wo-d-lbl">Next</div>'
        + '<div class="wo-d-what">' + esc(d.next_action) + "</div></div>"
        //  The SAME rule as the list. A second send control here would be
        //  the same duplicate arriving by a different door.
        + (c.state === "completion_claimed" && proofOf(d).satisfied !== true
            ? '<button class="wo-act" data-act="ask_photo">Ask ' + esc(firstName(who)) + "</button>"
            : c.state === "no_access" && !alreadyAsked(d)
              ? '<button class="wo-act" data-act="coordinate">Coordinate entry</button>' : "<span></span>")
        + "</div>";
    }

    //  A photo we received and could not keep is not proof, and is not
    //  silently dropped either.
    //  ONCE VALID PROOF IS STORED, earlier failed uploads are history — not
    //  current truth competing with "Repair photo preserved."
    var pd = proofOf(d);
    if (pd.notPreservedCount > 0 && pd.satisfied !== true) {
      h += '<div class="wo-d-note" data-wo="proof-lost">'
        + pd.notPreservedCount + " photo(s) received but not preserved</div>";
    }

    //  ── WHAT YOU CAN DO, when the dominant verb is not the whole answer ──
    //  Work that is still open can always be reported as not finished, and
    //  that is a different sentence from every verb above it: those act on
    //  the work, this reports on it. It sits below them, quiet, because it
    //  is not the hoped-for outcome — but it is always available, because
    //  the alternative is a technician with no way to say what is true.
    //
    //  ABSENT ON COMPLETED WORK. Re-opening a closed job is not this
    //  control's job, and inventing one here would be a second completion
    //  authority arriving through the back door.
    if (c.state !== "completed") {
      h += '<div class="wo-d-sec">What you can do</div>'
        + '<div class="wo-d-more">'
        + '<button class="wo-act" data-act="not_done" data-wo="' + esc(d.work_order.id) + '">'
        + "Still needs work</button></div>";
    }

    h += '<details class="wo-hist"><summary>History</summary>'
      + (d.history || []).slice().reverse().map(function (p) {
        return '<div class="wo-hr" data-kind="' + esc(p.kind) + '"><span class="t">' + esc(clock(p.at)) + "</span>"
          + "<span><b>" + esc(firstName(p.actor)) + "</b> " + esc(VERB[p.kind] || p.kind)
          + (p.kind === "finding" && p.note ? ": " + esc(p.note) : "") + "</span></div>";
      }).join("") + "</details>";
    return h;
  }

  var VERB = {
    en_route: "was on the way", no_access: "could not get in",
    blocked: "reported the work blocked", finding: "reports",
    completion_claimed: "said the work was finished", completed: "closed the work"
  };

  //  EVERY CLICK ENDS WITH A RECEIPT: what happened, which work order, who
  //  is responsible now, delivery where applicable, what happens next.
  function receiptHtml(r) {
    if (!r) return "";
    var d = r.delivery;
    return '<div class="wo-receipt' + (r.bad ? " bad" : "") + '" data-wo-receipt="1">'
      + esc(r.text)
      + (d ? '<span class="d" data-wo-delivery="' + esc(d.state) + '">Delivery: ' + esc(d.state)
             + (d.reason ? " · " + esc(d.reason) : "") + "</span>" : "")
      + "</div>";
  }

  //  One runner for all four writes. It NEVER reports success on its own —
  //  the receipt comes from the server, and delivery is carried separately.
  async function act(fn, args, onDone) {
    state.busy = true; state.receipt = null; render();
    try {
      var out = payload(await fn.call(window.__psLive, args)) || {};
      state.receipt = { text: (out.receipt && out.receipt.text) || "Done.",
                        delivery: out.delivery || null, bad: false };
      if (onDone) await onDone(out);
    } catch (e) {
      //  A refusal explains itself and changes no unrelated truth. The loader
      //  throws on a non-OK write and carries the server's own body, so the
      //  operator reads the server's reason rather than a generic failure.
      var b = (e && e.body) || null;
      state.receipt = { text: (e && e.detail)
                          || (b && b.receipt && b.receipt.text) || (b && b.detail) || (b && b.error)
                          || (e && e.message) || "That could not be done.",
                        delivery: null, bad: true };
    } finally { state.busy = false; render(); }
  }

  function unavailable(err) {
    var msg = (err && (err.message || err.detail)) || "The live read failed.";
    return '<div class="wo-unavail" data-wo-unavailable="1">'
      + "<div><b>Work orders are unavailable.</b></div>"
      + "<div class=\"wo-unavail-b\">" + esc(msg) + "</div>"
      + '<button class="wo-act" data-wo-retry="1">Retry</button></div>';
  }

  function render() {
    var host = document.getElementById("workOrdersBody");
    if (!host) return;
    if (!authorized()) {
      host.innerHTML = '<div class="wo-empty" data-wo-signin="1">Sign in to see work orders.</div>';
      return;
    }
    var top = receiptHtml(state.receipt)
      + (state.picking ? pickerHtml() : "")
      + (state.stalling ? stallHtml() : "");
    if (state.error)      host.innerHTML = unavailable(state.error);
    else if (state.detail) host.innerHTML = top + detailHtml(state.detail);
    else if (state.list)   host.innerHTML = top + listHtml(state.list);
    else if (state.busy)   host.innerHTML = '<div class="wo-empty">Loading…</div>';
    else                   host.innerHTML = "";
    wire(host);
  }

  function wire(host) {
    var r = host.querySelector("[data-wo-retry]");
    if (r) r.onclick = function () { loadList(); };
    var b = host.querySelector("[data-wo-back]");
    if (b) b.onclick = backToList;
    //  The ROW opens detail. The VERB performs the action and never opens.
    Array.prototype.forEach.call(host.querySelectorAll(".wo-row"), function (el) {
      el.onclick = function () { loadDetail(el.getAttribute("data-wo")); };
    });
    //  THE RESIDENT OPENS THEIR PERSON CARD. stopPropagation because the
    //  row/detail beneath it is itself clickable, and a shared surface is
    //  the one place a stray bubble silently does the wrong thing.
    //
    //  IF THE PERSON CARD IS NOT LOADED, SAY SO. Falling through to nothing
    //  would be a control that looks live and is not (§5).
    Array.prototype.forEach.call(host.querySelectorAll(".wo-res[data-person]"), function (el) {
      el.onclick = function (ev) {
        ev.stopPropagation();
        if (typeof window.openPersonCard !== "function") {
          state.receipt = { text: "The Person Card is not available on this screen.",
                            bad: true };
          return render();
        }
        window.openPersonCard({
          person_id: el.getAttribute("data-person"),
          name: el.getAttribute("data-person-name"),
          context: "work_order", focus: "information", source: "work_orders",
        });
      };
    });
    Array.prototype.forEach.call(host.querySelectorAll(".wo-act[data-act]"), function (el) {
      el.onclick = function (ev) {
        ev.stopPropagation();
        var kind = el.getAttribute("data-act");
        var id = el.getAttribute("data-wo") || (state.detail && state.detail.work_order.id);
        var L = window.__psLive;

        //  REVIEW is a READ. It opens the same work order and marks nothing.
        if (kind === "review") return loadDetail(id);

        if (kind === "assign") { openPicker(id); return; }
        if (kind === "not_done") { openNotDone(id); return; }

        //  TAKE JOB. The body is empty: the acceptor is the resolved session
        //  user, and the server resolves the obligation and the organization.
        //  Reloading the detail afterwards is not decoration — acceptance
        //  changes who is accountable, and the who-line must stop saying
        //  NOT ACCEPTED the moment it is no longer true.
        if (kind === "accept") {
          return act(L.workOrderAccept, { workOrderId: id }, function () {
            return state.detail ? loadDetail(id) : loadList();
          });
        }

        if (kind === "ask_photo") {
          return act(L.workOrderAskPhoto, { workOrderId: id }, function () { return loadDetail(id); });
        }
        if (kind === "coordinate") {
          return act(L.workOrderCoordinateEntry, { workOrderId: id }, function () { return loadDetail(id); });
        }
        if (kind === "retry_resident") {
          //  Retries the EXISTING failed intent — never a new message. The
          //  id comes from the same projection the row was rendered from,
          //  on either surface.
          var src = state.detail && state.detail.work_order.id === id ? state.detail : rowById(id);
          var failedId = failedResidentEventId(src);
          if (!failedId) {
            return loadDetail(id).then(function () {
              var f = failedResidentEventId(state.detail);
              if (f) return act(L.workOrderRetryResident, { workOrderId: id, comm_event_id: f },
                function () { return loadDetail(id); });
            });
          }
          return act(L.workOrderRetryResident, { workOrderId: id, comm_event_id: failedId },
            function () { return state.detail ? loadDetail(id) : loadList(); });
        }
      };
    });
    var sel = host.querySelector("[data-wo-tech]");
    if (sel) sel.onchange = function () { state.picking.chosen = sel.value; };
    var go = host.querySelector("[data-wo-assign-go]");
    if (go) go.onclick = function () {
      var p = state.picking;
      if (!p || !p.chosen) { state.receipt = { text: "Choose a technician first.", bad: true }; render(); return; }
      act(window.__psLive.workOrderAssign, { workOrderId: p.id, technician_user_id: p.chosen },
        function () { state.picking = null; return loadList(); });
    };
    var cancel = host.querySelector("[data-wo-assign-cancel]");
    if (cancel) cancel.onclick = function () { state.picking = null; render(); };

    // ── STILL NEEDS WORK ──────────────────────────────────────────────
    var rsel = host.querySelector("[data-wo-reason]");
    if (rsel) rsel.onchange = function () { state.stalling.chosen = rsel.value; };
    //  Held in state on every keystroke, because a re-render between typing
    //  and submitting would otherwise silently drop what they wrote.
    var rnote = host.querySelector("[data-wo-stall-note]");
    if (rnote) rnote.oninput = function () { state.stalling.note = rnote.value; };
    var sretry = host.querySelector("[data-wo-stall-retry]");
    if (sretry) sretry.onclick = function () {
      state.reasons = null; state.reasonsError = null; openNotDone(state.stalling.id);
    };
    var scancel = host.querySelector("[data-wo-stall-cancel]");
    if (scancel) scancel.onclick = function () { state.stalling = null; render(); };
    var sgo = host.querySelector("[data-wo-stall-go]");
    if (sgo) sgo.onclick = function () {
      var st = state.stalling;
      if (!st || !st.chosen) {
        //  The same refusal the server gives, said before the round trip.
        //  It is not a client-side authority — the server refuses this too.
        state.receipt = { text: "Pick a reason so the next step has an owner.", bad: true };
        render(); return;
      }
      var id = st.id;
      act(window.__psLive.workOrderNotDone,
        { workOrderId: id, not_done_reason: st.chosen, note: st.note || "" },
        function () { state.stalling = null; return state.detail ? loadDetail(id) : loadList(); });
    };
  }

  //  Mount through the SAME leaf structure managementLeaf writes.
  function open() {
    var strip = document.getElementById("intelStrip");
    if (!strip) return;
    //  ENTERING THE MODULE STARTS AT THE QUEUE. render() prefers state.detail
    //  whenever it is set, and open() used to leave it standing — so leaving
    //  for the Maintenance desk and clicking Work orders again dropped the
    //  operator back onto the last job they had opened instead of the list
    //  they asked for. Only reachable once navigation was real; the proof
    //  that called open() directly never left and came back.
    state.detail = null; state.selected = null; state.picking = null; state.receipt = null;
    state.stalling = null;
    strip.classList.remove("hidden");
    strip.innerHTML =
      '<section class="le-lhead">'
      + '<button class="le-lhead-back" type="button" onclick="openDesk(\'maintenance\')">'
      + '<span class="le-lhead-arrow">&lsaquo;</span>Maintenance</button>'
      //  THE SAME HEAD COMPONENT LEASING USES — `le-lhead`, its back control,
      //  its Fraunces h2 and its muted sub. Not a lookalike: the same classes,
      //  so moving from Leasing to Maintenance reads as one product doing a
      //  different job. The one line of copy says what this surface is FOR,
      //  which is the thing a title alone never says.
      + "<h2>Work Orders</h2>"
      + '<p class="le-lhead-sub">Physical work moving toward resolution.</p></section>'
      + '<div class="maint-ops-shell"><div class="wo-body" id="workOrdersBody"></div></div>';
    loadList();
  }

  window.__psWorkOrders = { open: open, render: render, loadList: loadList, loadDetail: loadDetail,
                            backToList: backToList, _state: state };
})();
