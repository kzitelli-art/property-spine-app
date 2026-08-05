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
                receipt: null, picking: null, techs: null };

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
  function firstName(n) { return String(n || "").trim().split(/\s+/)[0] || "someone"; }

  // ── THE DERIVATIONS ───────────────────────────────────────────────
  //  All read off the server's projection. Nothing invented here.
  //  Both live in `current`, which the list and the detail both carry, so
  //  the two surfaces cannot disagree and neither re-derives anything.
  function residentException(w) { return w.current.resident_exception || null; }
  function coordination(w) { return w.current.resident_coordination || null; }
  function ownerName(w) {
    return w.current.accountable === "UNASSIGNED" ? null : w.current.accountable.name;
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
  function band(w) {
    var s = w.current.state;
    if (residentException(w)) return "action";
    if (s === "scheduled" || s === "no_access" || s === "blocked" || s === "completion_claimed") return "action";
    if (s === "completed") return "done";
    return "progress";
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
    if (s === "completion_claimed") {
      return w.proof.satisfied
        ? { text: "Ready to close", tone: "attn" }
        : { text: "Photo required to close", tone: "attn" };
    }
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
    //  "Not yet accepted / UNASSIGNED / Assign" said the same thing three
    //  times, and said it wrongly: nobody can accept work that has no owner.
    if (s === "scheduled") {
      var a = w.current.assigned_to;
      return a
        ? { text: "Waiting for " + firstName(a.name) + " to accept", tone: "attn" }
        : { text: "No owner", tone: "attn" };
    }
    return null;
  }

  //  ONE verb, and only when something must be done.
  function action(w) {
    var s = w.current.state;
    if (residentException(w)) return { verb: "Retry", tone: "red", kind: "retry_resident" };
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
    if (c.completed_at) return "Completed by " + firstName(c.completed_by && c.completed_by.name) + " · " + clock(c.completed_at);
    if (c.completion_claimed_at) return firstName(who) + " reported finished · " + clock(c.completion_claimed_at);
    if (c.blocked) return firstName(who) + " · " + clock(c.blocked.since);
    if (c.state === "en_route") return firstName(who) + " is on the way · " + clock(c.en_route_at);
    if (c.accepted_at) return firstName(who) + " accepted · " + clock(c.accepted_at);
    return "";   // the state line carries it; UNASSIGNED as metadata is schema talk
  }

  function title(w) {
    var unit = w.work_order.unit_number ? "Unit " + w.work_order.unit_number : "Common area";
    var what = w.work_order.title || ("Work order " + w.work_order.reference);
    return { unit: unit, what: what };
  }

  // ── LOADERS ───────────────────────────────────────────────────────
  async function loadList() {
    state.busy = true; state.error = null; render();
    try {
      state.list = await window.__psLive.workOrderLifecycleList();
    } catch (e) {
      //  Content GOES. Never left standing under an error.
      state.list = null; state.detail = null; state.error = e;
    } finally { state.busy = false; render(); }
  }
  async function loadDetail(id) {
    state.busy = true; state.error = null; state.selected = id; render();
    try { state.detail = await window.__psLive.workOrderLifecycle({ workOrderId: id }); }
    catch (e) { state.detail = null; state.error = e; }
    finally { state.busy = false; render(); }
  }
  function backToList() { state.detail = null; state.selected = null; state.receipt = null; render(); }

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
    try { state.techs = (await window.__psLive.workOrderTechnicians()).technicians || []; }
    catch (e) { state.techs = []; state.receipt = { text: "Could not load technicians.", bad: true }; }
    finally { state.busy = false; render(); }
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
  var BANDS = [["action", "Needs action"], ["progress", "In progress"], ["done", "Recently completed"]];

  function rowHtml(w) {
    var t = title(w), sl = stateLine(w), a = action(w);
    return '<div class="wo-row" data-wo="' + esc(w.work_order.id) + '">'
      + "<div>"
      + '<div class="wo-t">' + esc(t.unit) + ' <span class="u">· ' + esc(t.what) + "</span></div>"
      + (sl ? '<div class="wo-s ' + sl.tone + '">' + esc(sl.text) + "</div>" : "")
      + (attribution(w) ? '<div class="wo-a">' + esc(attribution(w)) + "</div>" : "")
      + "</div>"
      + (a ? '<button class="wo-act ' + a.tone + '" data-act="' + esc(a.kind) + '" data-wo="'
             + esc(w.work_order.id) + '">' + esc(a.verb) + "</button>" : "<span></span>")
      + "</div>";
  }

  function listHtml(payload) {
    var groups = { action: [], progress: [], done: [] };
    (payload.work_orders || []).forEach(function (w) { groups[band(w)].push(w); });

    var h = '<div class="wo-count">' + groups.action.length + " need action</div>";
    if (!payload.count) {
      //  HONEST EMPTY — a fact about this property, not a reassurance.
      return h + '<div class="wo-empty" data-wo-empty="1">No work orders at this property.</div>';
    }
    BANDS.forEach(function (b) {
      var rows = groups[b[0]];
      if (!rows.length) return;
      h += '<div class="wo-sec" data-band="' + b[0] + '">'
        + '<div class="wo-sec-t">' + b[1] + '<span class="wo-sec-n">' + rows.length + "</span></div>"
        + rows.map(rowHtml).join("") + "</div>";
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
        + (d.proof.satisfied ? " Repair photo preserved." : "");
    } else if (c.state === "completion_claimed") {
      cur = firstName(who) + " reports the work is finished."
        + (d.proof.satisfied ? "" : ' <span class="attn">Photo required before close.</span>');
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

    var h = '<div class="wo-back"><button class="wo-backbtn" data-wo-back="1">‹ Work Orders</button></div>'
      + '<div class="wo-d-title">' + esc(t.unit) + ' <span class="u">· ' + esc(t.what) + "</span></div>"
      + '<div class="wo-d-who">' + esc(who || "UNASSIGNED") + "</div>"
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
        + (c.state === "completion_claimed" && !d.proof.satisfied
            ? '<button class="wo-act" data-act="ask_photo">Ask ' + esc(firstName(who)) + "</button>"
            : c.state === "no_access" && !alreadyAsked(d)
              ? '<button class="wo-act" data-act="coordinate">Coordinate entry</button>' : "<span></span>")
        + "</div>";
    }

    //  A photo we received and could not keep is not proof, and is not
    //  silently dropped either.
    //  ONCE VALID PROOF IS STORED, earlier failed uploads are history — not
    //  current truth competing with "Repair photo preserved."
    if (d.proof.not_preserved_count > 0 && !d.proof.satisfied) {
      h += '<div class="wo-d-note" data-wo="proof-lost">'
        + d.proof.not_preserved_count + " photo(s) received but not preserved</div>";
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
      var out = await fn.call(window.__psLive, args);
      state.receipt = { text: (out.receipt && out.receipt.text) || "Done.",
                        delivery: out.delivery || null, bad: false };
      if (onDone) await onDone(out);
    } catch (e) {
      //  A refusal explains itself and changes no unrelated truth.
      state.receipt = { text: (e && (e.detail || e.message)) || "That could not be done.",
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
    var top = receiptHtml(state.receipt) + (state.picking ? pickerHtml() : "");
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
    Array.prototype.forEach.call(host.querySelectorAll(".wo-act[data-act]"), function (el) {
      el.onclick = function (ev) {
        ev.stopPropagation();
        var kind = el.getAttribute("data-act");
        var id = el.getAttribute("data-wo") || (state.detail && state.detail.work_order.id);
        var L = window.__psLive;

        //  REVIEW is a READ. It opens the same work order and marks nothing.
        if (kind === "review") return loadDetail(id);

        if (kind === "assign") { openPicker(id); return; }

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
  }

  //  Mount through the SAME leaf structure managementLeaf writes.
  function open() {
    var strip = document.getElementById("intelStrip");
    if (!strip) return;
    strip.classList.remove("hidden");
    strip.innerHTML =
      '<section class="le-lhead">'
      + '<button class="le-lhead-back" type="button" onclick="openDesk(\'maintenance\')">'
      + '<span class="le-lhead-arrow">&lsaquo;</span>Maintenance</button>'
      + "<h2>Work Orders</h2></section>"
      + '<div class="maint-ops-shell"><div class="wo-body" id="workOrdersBody"></div></div>';
    loadList();
  }

  window.__psWorkOrders = { open: open, render: render, loadList: loadList, loadDetail: loadDetail,
                            backToList: backToList, _state: state };
})();
