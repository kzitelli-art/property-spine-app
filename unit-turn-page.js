"use strict";

// PROPERTY SPINE — THE ONE UNIT TURN PAGE (BUILD 6A)
//
// Turn list → one Unit Turn page → message or button → confirm → same page.
//
// ── WHAT THIS REPLACES ──────────────────────────────────────────────
// Builds 1-5 each shipped their own door, so one unit turn lived across five
// surfaces. Every one was a faithful view of its own layer, and together they
// made the operator reconstruct the flow by hand. This composes them into one
// page. The Build 1-5 doors remain mounted as diagnostic routes; they are no
// longer the primary path.
//
// ── IT DECIDES NOTHING ──────────────────────────────────────────────
// Every label, readiness word, blocked/actionable verdict, proof requirement,
// controlling next action, availability blocker and UNASSIGNED comes from the
// server. This module renders. It does not compute operating meaning, and it
// never decides who may certify — it renders `may_walk`, which the readiness
// service decided.
//
// ── BUTTONS FOR WORK, CONVERSATION FOR OBSERVATION ──────────────────
// Accepting work is a tap. Completing work is the smallest possible capture.
// The message box is for reporting what was SEEN and what was FINISHED — not
// for accepting work and never for certifying readiness.
//
// ── BUILD 6B: THE MESSAGE BOX DOES THREE THINGS ─────────────────────
// Report a condition · Add or correct turn scope · Report completed work.
// That list is printed above the box, so what a message may do is visible
// before it is typed rather than discovered by being told no afterwards.
// Anything else the server reads as a REDIRECT: the message is kept, no
// proposal is created, and the operator is pointed at the object on THIS page
// that owns the commitment. A redirect never leaves the two screens.
(function () {
  if (window.__psUnitTurnPageV1) return;
  window.__psUnitTurnPageV1 = true;

  var S = { list: null, attention: false, unitId: null, turn: null,
            busy: false, error: null, msg: "", photo: "", open: {}, draft: {},
            receipt: null, notice: null, redirect: null,
            //  The chosen File objects, kept in memory so a failed submit can
            //  be retried without asking the technician to take the photo
            //  again. Never serialised, never sent anywhere but the claim.
            photoFile: {}, photoPreview: {} };

  // The three purposes, as the server states them. Held here only so the box
  // is honest when a thread has not been read yet; the harness asserts these
  // are the same three strings the server declares, in the same order.
  var MSG_PURPOSES = ["Report a condition", "Add or correct turn scope", "Report completed work"];

  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
  //  The page is MOUNTED BY NAVIGATION, not by page load. Until Maintenance →
  //  Turnovers creates the containers there is nothing to render and no reason
  //  to call the server.
  function mounted() {
    return !!(document.getElementById("psTurnList") || document.getElementById("psUnitTurnPage"));
  }

  //  A FAILED LIVE CALL IS A FAILURE, NOT AN ABSENCE. It never degrades into an
  //  empty list, and there is no fixture behind it to fall back to.
  function err(e, headline) {
    var m = (e && (e.publicMessage || e.message)) || "The live call failed.";
    var id = (e && e.detail && e.detail.request_id) || (e && e.request_id) || null;
    return '<div class="ut-error"><strong>' + esc(headline || "Not recorded.") + "</strong> " + esc(m) +
      (id ? ' <span class="ut-ev">request ' + esc(id) + "</span>" : "") + "</div>";
  }
  function row(k, v) {
    return '<div class="ut-row"><span class="ut-lbl">' + esc(k) + '</span><span>' + esc(v == null ? "—" : v) + "</span></div>";
  }
  //  DISPLAY ONLY. "due 2026-08-04" is a database value shown to a person.
  //  This formats it for reading and nothing else: no stored value changes,
  //  no comparison uses it, and nothing is sent anywhere. A value it cannot
  //  parse is returned UNCHANGED rather than guessed at or blanked — showing
  //  the raw string is honest; inventing a date is not.
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function showDate(v) {
    var raw = String(v == null ? "" : v).trim();
    if (!raw) return "";
    //  Parsed as CALENDAR PARTS, not through Date(), so a bare yyyy-mm-dd is
    //  never shifted a day by the viewer's timezone.
    var m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return raw;
    var mi = Number(m[2]) - 1;
    if (mi < 0 || mi > 11) return raw;
    return MON[mi] + " " + Number(m[3]) + ", " + m[1];
  }

  function d(id, k) { return (S.draft[id] || {})[k] || ""; }
  function setD(id, k, v) { S.draft[id] = S.draft[id] || {}; S.draft[id][k] = v; }

  async function loadList() {
    if (!authorized()) return;
    try {
      var o = await window.__psLive.turnList({ attention: S.attention });
      S.list = (o && o.data) || null;
    } catch (e) { S.list = { __error: e }; }
  }
  async function loadUnit(id) {
    S.busy = true; S.error = null; render();
    try {
      var o = await window.__psLive.unitTurn({ unitId: id });
      S.turn = (o && o.data) || null; S.unitId = id;
    } catch (e) { S.error = e; S.turn = null; }
    finally { S.busy = false; render(); }
  }
  async function act(fn, onSuccess) {
    S.busy = true; S.error = null; S.receipt = null; S.notice = null; S.redirect = null; render();
    try {
      var o = await fn();
      if (typeof onSuccess === "function") onSuccess(o);
      var dta = (o && o.data) || {};
      S.receipt = dta.receipt || null;
      // A redirect is not an error and not a receipt. It is the server saying
      // where this action is actually taken.
      S.redirect = dta.redirect || null;
      S.notice = dta.agent_reply || null;
      await loadUnit(S.unitId); await loadList();
    } catch (e) { S.error = e; }
    finally { S.busy = false; render(); }
  }

  // ── TURN LIST ─────────────────────────────────────────────────────
  //
  //  TWO SCREENS, NOT ONE SCROLL. The list and a unit are alternatives: open a
  //  unit and the list is replaced, not pushed down. Stacking both made the
  //  page as long as the list plus a whole unit turn, which on a phone is
  //  minutes of scrolling to reach the completion button of the job you are
  //  standing in front of.
  function renderList() {
    //  A unit is open — the list is not on screen at all.
    if (S.unitId && (S.turn || S.busy || S.error)) return "";

    if (!authorized()) {
      return '<div class="ut-empty"><strong>Not signed in.</strong> Sign in to load turns.</div>';
    }
    var l = S.list;
    // Loading is its own state. A blank panel reads as "no turns".
    if (!l) return '<div class="ut-card"><div class="ut-h">Turns</div>' +
      '<div class="ut-empty">Loading turns…</div></div>';

    // UNAVAILABLE, with a retry. NOT an empty list.
    if (l.__error) {
      return '<div class="ut-card"><div class="ut-h">Turns</div>' +
        err(l.__error, "Turns are unavailable.") +
        '<div class="ut-note">Nothing is being hidden — the list could not be read, ' +
        'so it is not being shown as empty.</div>' +
        '<button id="tlRetry" class="ut-btn ut-primary">Retry</button></div>';
    }

    var h = '<div class="ut-card"><div class="ut-h">Turns</div>';
    h += '<div class="tl-filters">' +
      '<button id="tlAll" class="tl-chip' + (S.attention ? "" : " on") + '">All</button>' +
      '<button id="tlAtt" class="tl-chip' + (S.attention ? " on" : "") + '">Needs attention</button></div>';
    if (!l.count) {
      // HONEST EMPTY. The server said zero, and says which zero it means.
      h += '<div class="ut-empty"><strong>' +
        esc(S.attention ? "Nothing needs judgment right now." : "No unit is turning at this property.") +
        "</strong> " + esc(l.note || "This is a live read — it is empty because there is nothing, not because nothing loaded.") +
        "</div>";
    }
    //  ONE QUIET CARD PER UNIT. Unit number, turn state, the next action, and
    //  the move-in risk when there is one — each on its own line, because
    //  compressing four facts into one italic sentence is how the previous
    //  list read as a debug dump.
    (l.turns || []).forEach(function (t) {
      h += '<button class="tl-unit tl-open" type="button" data-id="' + esc(t.unit_id) + '">';
      h += '<div class="tl-unit-h">Unit ' + esc(t.unit_number || t.unit_id) + "</div>";
      if (t.readiness_label) h += '<div class="tl-unit-state">' + esc(t.readiness_label) + "</div>";
      if (t.next_action) h += '<div class="tl-unit-next"><strong>Next:</strong> ' + esc(t.next_action) + "</div>";
      if (t.needs_attention && (t.attention_reasons || []).length) {
        h += '<div class="tl-unit-risk">' + esc(t.attention_reasons.join(" · ")) + "</div>";
      }
      h += '<div class="tl-unit-open">Open unit →</div>';
      h += "</button>";
    });
    return h + "</div>";
  }

  // ── THE UNIT TURN PAGE ────────────────────────────────────────────
  //
  //  FIVE SECTIONS, IN ORDER: status · next · required work · final readiness ·
  //  report something. Everything on it is still the server's word.
  function renderTurn() {
    if (!authorized()) return "";
    if (S.error) {
      return '<div class="ut-card">' + err(S.error, "This unit turn is unavailable.") +
        '<div class="ut-note">Nothing was recorded and nothing is being guessed at. ' +
        'The server decides whether you may see this unit.</div>' +
        '<button id="utRetry" class="ut-btn ut-primary">Retry</button></div>';
    }
    if (S.busy && !S.turn) return '<div class="ut-card"><div class="ut-empty">Loading…</div></div>';
    var t = S.turn;
    if (!t) return "";

    //  NO SECOND TITLE AND NO SECOND BACK. The route header above already
    //  says which unit this is and how to leave it.
    var h = '<div class="ut-card">';

    // ── 1. UNIT STATUS ───────────────────────────────────────────────
    h += '<div class="ut-state-list">';
    h += "<div>" + esc(t.status.vacancy_known ? t.status.vacancy : "Vacancy unknown — no confirmed walk") + "</div>";
    h += "<div>" + esc(t.status.readiness_label) + "</div>";
    h += "<div>" + esc(t.status.marketability_label) + "</div>";
    if (t.status.next_move_in) {
      h += "<div>Move-in " + esc(t.status.next_move_in.move_in_date) +
        " — " + esc(t.status.next_move_in.days_remaining) + " days remaining</div>";
    }
    if (t.status.remaining_blocker) h += '<div class="quiet">' + esc(t.status.remaining_blocker) + "</div>";
    h += "</div>";

    // ── 2. NEXT ACTION ───────────────────────────────────────────────
    if (t.controlling_next_action) {
      h += '<div class="ut-h2">Next</div><div class="ut-callout"><strong>' +
        esc(t.controlling_next_action.action) + "</strong>";
      if (t.controlling_next_action.why) h += "<p>" + esc(t.controlling_next_action.why) + "</p>";
      h += "</div>";
    }

    // ── 3. REQUIRED WORK ─────────────────────────────────────────────
    var byStage = { repair: "Repairs and replacements", paint: "Paint",
                    final_clean: "Final cleaning", null: "Other work" };
    var anyWork = false;
    var work = "";
    Object.keys(byStage).forEach(function (st) {
      var items = (t.work || []).filter(function (w) { return String(w.stage) === st; });
      if (!items.length) return;
      anyWork = true;
      var sg = (t.stages || []).find(function (x) { return String(x.stage) === st; });
      work += '<div class="ut-h3" style="margin-top:18px">' + esc(byStage[st]) +
        (sg && sg.blocked ? ' <span class="ut-sev">Blocked</span>' : "") + "</div>";
      if (sg && sg.blocked) {
        (sg.blocked_by || []).forEach(function (b) { work += '<div class="ut-unk">' + esc(b.detail) + "</div>"; });
      }
      items.forEach(function (w) { work += renderWork(w, sg); });
    });
    if (anyWork) h += '<div class="ut-h2">Required work</div>' + work;

    // WHY CONTROLS ARE ABSENT — said, not silently omitted.
    if (t.capabilities && !t.capabilities.may_operate_work && t.capabilities.why_no_work_controls) {
      h += '<div class="ut-unk">' + esc(t.capabilities.why_no_work_controls) + "</div>";
    }

    // ── 4. FINAL READINESS ───────────────────────────────────────────
    h += '<div class="ut-h2">Final readiness</div>';
    h += '<div class="ut-unk">' + esc(t.readiness.note) + "</div>";
    if (t.readiness.may_walk) {
      h += '<input id="rwFind" class="ut-in" placeholder="If it failed, what did you find?">';
      h += '<button id="rwPass" class="ut-btn ut-primary">Perform final readiness walk</button>';
      h += '<button id="rwFail" class="ut-btn">Record a failed walk</button>';
    } else if (t.readiness.authority && !t.readiness.authority.authorized && t.readiness.gate.actionable) {
      //  AUTHORITY, COMPRESSED BUT NOT REMOVED.
      h += '<div class="ut-unk">You cannot certify this unit: ' + esc(t.readiness.authority.reason) + "</div>";
    } else if (!t.readiness.gate.actionable) {
      //  UNCERTAINTY, COMPRESSED BUT NOT REMOVED. One line per real blocker.
      (t.readiness.gate.blockers || []).forEach(function (b) {
        h += '<div class="ut-unk">' + esc(b.detail) + "</div>";
      });
    }

    // ── 5. REPORT SOMETHING ──────────────────────────────────────────
    //  The three purposes were three separate bullet lines plus a heading plus
    //  a lead-in plus two exclusion notes — six pieces of instructional copy
    //  around one text box. One sentence, one box, one quiet note.
    h += '<div class="ut-h2">Report something</div>';
    h += '<div class="ut-sub">Report a condition, correct the turn scope, or report completed work.</div>';
    h += '<textarea id="mtMsg" class="ut-ta" rows="3" placeholder="e.g. There are cockroaches behind the refrigerator.">' + esc(S.msg) + "</textarea>";
    h += '<button id="mtSend" class="ut-btn ut-primary"' + (S.busy ? " disabled" : "") + ">Send</button>";
    h += '<div class="ut-note">Readiness and ownership use their own controls.</div>';

    // A REDIRECT — recorded, not proposed. It points at something on this page.
    if (S.redirect) {
      h += '<div class="wk-panelbox"><div class="ut-unk"><strong>' + esc(S.redirect.message) + "</strong></div>";
      if ((S.redirect.to === "work_item" || S.redirect.to === "recorded_item") && S.redirect.work_id) {
        h += '<button class="ut-btn ut-primary rd-work" data-id="' + esc(S.redirect.work_id) + '">Open the work item</button>';
      } else if (S.redirect.to === "recorded_item") {
        h += '<div class="ut-note">The recorded items for this unit are listed above.</div>';
      } else if (S.redirect.to === "final_readiness") {
        h += '<div class="ut-note">Final readiness is on this page, above.</div>';
      }
      h += '<div class="ut-note">Nothing operating was recorded.</div></div>';
    } else if (S.notice) {
      h += '<div class="ut-unk">' + esc(S.notice) + "</div>";
    }

    // the thread, plain language only
    if (t.thread && (t.thread.proposals || []).length) {
      (t.thread.proposals || []).slice(-3).forEach(function (p) {
        h += '<div class="ut-item"><span class="ut-lbl">' + esc(p.plain_label) + "</span>";
        if (p.status === "proposed" && !p.needs_clarification) {
          h += '<button class="ut-x mt-confirm" data-id="' + esc(p.id) + '">Confirm</button>' +
               '<button class="ut-x mt-cancel" data-id="' + esc(p.id) + '">Cancel</button>';
        } else {
          // ONE label for state. `clarification_required` and `unclear` are one
          // situation to a person, and the server already collapsed them.
          h += '<span class="ut-ev">' + esc(p.status_label) + "</span>";
        }
        h += "</div>";
        // What Spine could not establish — shown before any confirm button,
        // and shown for a clarification too: the missing detail is the reason
        // there is a question at all.
        (p.unknowns || []).forEach(function (u) { h += '<div class="ut-unk">' + esc(u) + "</div>"; });
        // One concise question, last.
        if (p.needs_clarification && p.clarification) {
          h += '<div class="ut-unk"><strong>' + esc(p.clarification) + "</strong></div>";
        }
      });
    }

    if (S.receipt) {
      h += '<div class="ut-h2">Recorded</div>';
      Object.keys(S.receipt).forEach(function (k) {
        var v = S.receipt[k];
        if (v == null || v === "" || (Array.isArray(v) && !v.length)) return;
        h += row(k.replace(/_/g, " "), Array.isArray(v) ? v.join("; ") : v);
      });
    }
    return h + "</div>";
  }

  //  ── ONE IDENTITY, ONE BACK ACTION, PER SCREEN ─────────────────────
  //  The list screen is "Turnovers" and goes back to Maintenance. An open unit
  //  is "Unit 304" and goes back to the turns. Both are printed HERE, into the
  //  route's header slot, because the same state that decides which screen is
  //  showing has to decide what the screen is called.
  //
  //  The unit screen no longer prints TURNOVERS at all: while a unit is open
  //  the unit IS the page. The shared-chrome back control is hidden for this
  //  route in CSS, so what is left is exactly one visible back action.
  function renderHeader() {
    var onUnit = !!(S.unitId && (S.turn || S.busy || S.error));
    if (onUnit) {
      var name = (S.turn && S.turn.unit && (S.turn.unit.unit_number || S.turn.unit.id)) || "";
      return '<header class="mt-head">' + backBtn("turns") +
        "<h2>" + (name ? "Unit " + esc(name) : "Unit") + "</h2></header>";
    }
    return '<header class="mt-head">' + backBtn("maintenance") +
      "<h2>Turnovers</h2><p>Every unit currently turning at this property.</p></header>";
  }

  //  The ONE back control on the page. On the list it leaves the route; on a
  //  unit it returns to the list.
  function backBtn(to) {
    if (to === "maintenance") {
      return '<button id="utExit" class="maint-crumb" type="button">' +
        '<span aria-hidden="true">‹</span> Maintenance</button>';
    }
    return '<button id="utBack" class="maint-crumb" type="button">' +
      '<span aria-hidden="true">‹</span> Turns</button>';
  }

  //  A WORK ITEM OWNS ITS OWN STATUS AND ITS OWN CONTROLS. The completion
  //  panel is inset beneath the item it belongs to, not a generic panel that
  //  happens to follow the last thing on screen.
  function renderWork(w, sg) {
    var blocked = sg && sg.blocked;
    var open = !!S.open[w.work_id];
    var h = '<div class="wk' + (w.status === "complete" ? " done" : "") + '">';
    h += '<div class="wk-title">' + esc(w.work_text) + "</div>";

    var meta = [];
    meta.push(w.status === "complete" ? "Complete" : blocked ? "Blocked" : "Actionable");
    meta.push(w.owner === "UNASSIGNED" ? '<span class="ut-unassigned">UNASSIGNED</span>' : "Assigned");
    if (w.due_at) meta.push("Due " + esc(showDate(w.due_at)));
    h += '<div class="wk-meta">' + meta.join('<span aria-hidden="true">·</span>') +
      (w.reopened_count > 0 ? '<span class="ut-sev">Reopened</span>' : "") +
      (w.needs_placement ? '<span class="ut-sev">' + esc(w.placement_label) + "</span>" : "") + "</div>";

    if (w.needs_placement) {
      h += '<div class="ut-unk"><strong>' + esc(w.placement_action) + "</strong> " +
        esc(w.placement_explanation || "") +
        (w.placement_note ? " " + esc(w.placement_note) : "") + "</div>";
    }

    //  The evidence, through the governed read. The page never holds bytes.
    if (w.proof_photos && w.proof_photos.length) {
      w.proof_photos.forEach(function (a) {
        h += '<div class="wk-ready"><img class="ut-thumb wk-proof" alt="Completion photo" data-src="' + esc(a.view_path) + '">' +
          '<div><div class="wk-ready-lbl">Completion photo</div><div class="wk-ready-name">' +
          esc(String(a.uploaded_at || "").slice(0, 10)) +
          (a.uploaded_by ? " · " + esc(a.uploaded_by) : "") + "</div></div></div>";
      });
    }

    if (w.latest_outcome === "completed" && w.proof_satisfied === false) {
      h += '<div class="ut-unk">Claimed complete, NOT closed. ' + esc(w.proof_shortfall || "") + "</div>";
    }

    // ── CONTROLS COME FROM THE SERVER'S DECISION ────────────────────
    //  `may_operate_work` is computed server-side from the session's active
    //  assignment. The page reproduces no authority rule: it does not read
    //  modules, titles or roles, and it does not infer from them. Hiding a
    //  control is not the enforcement either — every write route enforces for
    //  itself, and a management-only operator who calls one anyway is refused.
    var mayOperate = !!(S.turn && S.turn.capabilities && S.turn.capabilities.may_operate_work);

    if (mayOperate && (w.status === "required" || w.status === "complete")) {
      h += '<div class="wk-actions">';
      if (w.status === "required" && !blocked && !w.accepted) {
        // ACCEPTANCE IS A BUTTON.
        h += '<button class="ut-btn wk-accept" data-id="' + esc(w.work_id) + '">Accept work</button>';
      }
      if (w.status === "required" && !blocked) {
        //  "Close" named the control after what it does to the panel, not
        //  after what it does to the job — and sat next to a button called
        //  "Complete work". It now says which one it is.
        //  SECONDARY. It opens the panel; it does not complete anything.
        //  Only the submit inside the panel is primary, so the page never
        //  shows two identical black buttons that do different things.
        h += '<button class="ut-btn wk-panel" data-id="' + esc(w.work_id) + '">' +
          (open ? "Hide completion" : "Complete work") + "</button>";
      }
      if (w.status === "complete") {
        h += '<button class="ut-btn wk-panel" data-id="' + esc(w.work_id) + '">' +
          (open ? "Hide completion" : "Reopen") + "</button>";
      }
      h += "</div>";
    }

    if (open && mayOperate) {
      h += '<div class="wk-panelbox">';
      if (w.status === "required") {
        // THE SMALLEST POSSIBLE CAPTURE.
        // ── ONE PHOTO, ONE BUTTON, ONE REQUEST ──────────────────────
        //  The raw browser file control is replaced by a styled label that
        //  wraps the SAME input. The input keeps accept= and capture= exactly
        //  as they were: this is styling, not a change of behaviour. There is
        //  still no upload step, no Save Photo, no attachment id and no
        //  storage word anywhere.
        var needsPhoto = !!(w.proof_requirement && w.proof_requirement.photos_min > 0);
        var picked = S.photoFile[w.work_id] || null;

        if (needsPhoto) {
          h += '<div class="ut-h3">Completion photo</div>';
          h += '<label class="wk-photo">' + (picked ? "Replace photo" : "Take or choose photo") +
            '<input type="file" class="wk-file" data-id="' + esc(w.work_id) +
            '" accept="image/jpeg,image/png,image/webp" capture="environment"></label>';
          if (picked) {
            h += '<div class="wk-ready">';
            if (S.photoPreview[w.work_id]) {
              h += '<img class="ut-thumb" alt="Completion photo" src="' + esc(S.photoPreview[w.work_id]) + '">';
            }
            h += '<div><div class="wk-ready-lbl">Photo ready</div>' +
              '<div class="wk-ready-name">' + esc(picked.name) + "</div></div></div>";
          }
        }
        if (w.proof_requirement && w.proof_requirement.needs_functional_confirmation) {
          h += '<input class="ut-in wk-conf" data-id="' + esc(w.work_id) + '" placeholder="Short confirmation it works" value="' + esc(d(w.work_id, "conf")) + '">';
        }

        //  DISABLED UNTIL THE PHOTO IS THERE, and SAYS SO. Discovering a
        //  requirement through an error is the same as not stating it.
        var blockedByPhoto = needsPhoto && !picked;
        h += '<div class="wk-actions">';
        h += '<button class="ut-btn ut-primary wk-done" data-id="' + esc(w.work_id) + '"' +
          (blockedByPhoto || S.busy ? " disabled" : "") + ">Complete work</button>";
        h += '<button class="ut-btn wk-unable" data-id="' + esc(w.work_id) + '">Unable to complete</button>';
        h += "</div>";
        if (blockedByPhoto) {
          h += '<div class="ut-unk">Add one completion photo to close this work.</div>';
        }
      } else {
        h += '<div class="ut-h3">Reopen this work</div>';
        h += '<input class="ut-in wk-reason" data-id="' + esc(w.work_id) + '" placeholder="Why reopen?" value="' + esc(d(w.work_id, "reason")) + '">';
        h += '<div class="wk-actions"><button class="ut-btn wk-reopen" data-id="' + esc(w.work_id) + '">Reopen</button></div>';
      }
      h += "</div>";
    }
    return h + "</div>";
  }

  function render() {
    var hd = document.getElementById("psTurnHeader");
    var l = document.getElementById("psTurnList");
    var p = document.getElementById("psUnitTurnPage");
    if (hd) hd.innerHTML = renderHeader();
    if (l) l.innerHTML = renderList();
    if (p) p.innerHTML = renderTurn();
    wire();
  }
  function each(s, f) { Array.prototype.forEach.call(document.querySelectorAll(s), f); }

  function wire() {
    var rt = document.getElementById("tlRetry");
    if (rt) rt.onclick = async function () { S.list = null; render(); await loadList(); render(); };
    var ru = document.getElementById("utRetry");
    if (ru) ru.onclick = function () { if (S.unitId) loadUnit(S.unitId); };
    var a = document.getElementById("tlAll");
    if (a) a.onclick = async function () { S.attention = false; await loadList(); render(); };
    var b = document.getElementById("tlAtt");
    if (b) b.onclick = async function () { S.attention = true; await loadList(); render(); };
    each(".tl-open", function (x) { x.onclick = function () { loadUnit(x.getAttribute("data-id")); }; });
    //  BACK TO TURNS — clears the open unit so renderList() takes the screen
    //  again. No navigation, no reload; the list state it had is still there.
    //  LEAVE THE ROUTE. The page's own breadcrumb replaces the shared-chrome
    //  back control that is hidden here, so it must do the same thing.
    var ex = document.getElementById("utExit");
    if (ex) ex.onclick = function () {
      if (typeof window.showMaintenanceMain === "function") window.showMaintenanceMain();
    };
    var bk = document.getElementById("utBack");
    if (bk) bk.onclick = function () {
      S.unitId = null; S.turn = null; S.error = null; S.open = {};
      S.receipt = null; S.notice = null; S.redirect = null;
      render();
      var el = document.getElementById("psTurnList");
      if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" });
    };
    each(".wk-panel", function (x) {
      x.onclick = function () { var i = x.getAttribute("data-id"); S.open[i] = !S.open[i]; render(); };
    });
    var bindIn = function (sel, k) {
      each(sel, function (i) { i.oninput = function () { setD(i.getAttribute("data-id"), k, i.value); }; });
    };
    bindIn(".wk-conf", "conf"); bindIn(".wk-reason", "reason");

    //  ONE file, held in memory until Complete is pressed. Selecting a photo
    //  submits nothing on its own — there is no upload step to fail halfway.
    //  The proof image needs the session header, so it is fetched rather than
    //  set as a src. One fetch per thumbnail, cached on the element.
    each(".wk-proof", function (im) {
      if (im.getAttribute("data-loaded") === "1") return;
      var path = im.getAttribute("data-src");
      if (!path || !window.__psLive || typeof window.__psLive.proofImage !== "function") return;
      im.setAttribute("data-loaded", "1");
      window.__psLive.proofImage({ viewPath: path })
        .then(function (r) { im.src = r.objectUrl; })
        .catch(function () {
          // HONEST: the photo is not shown as missing, it is shown as unreadable.
          im.replaceWith(Object.assign(document.createElement("div"), {
            className: "ut-unk", textContent: "The completion photo could not be loaded.",
          }));
        });
    });

    each(".wk-file", function (i) {
      i.onchange = function () {
        var id = i.getAttribute("data-id");
        var f = i.files && i.files[0];
        if (!f) { delete S.photoFile[id]; delete S.photoPreview[id]; render(); return; }
        S.photoFile[id] = f;
        try {
          if (S.photoPreview[id]) URL.revokeObjectURL(S.photoPreview[id]);
          S.photoPreview[id] = URL.createObjectURL(f);
        } catch (_) { S.photoPreview[id] = null; }
        render();
      };
    });

    // ALL WRITES GO TO THE BUILD 1-5 CANONICAL DOORS.
    each(".wk-accept", function (x) {
      x.onclick = function () {
        var i = x.getAttribute("data-id");
        act(function () { return window.__psLive.acceptWork({ workId: i }); });
      };
    });
    each(".wk-done", function (x) {
      x.onclick = function () {
        var i = x.getAttribute("data-id");
        var file = S.photoFile[i] || null;
        act(function () {
          return window.__psLive.claimWorkCompletion({
            workId: i, outcome: "completed",
            functional_confirmation: d(i, "conf") || null,
            //  ONE file, on the SAME request as the completion. The server
            //  writes the photo and the claim in one transaction.
            photo: file,
          });
        }, function onSuccess() {
          //  Only forget the photo once the server accepted it. A failed
          //  submit keeps it so the technician can press Complete again
          //  without taking the picture twice.
          try { if (S.photoPreview[i]) URL.revokeObjectURL(S.photoPreview[i]); } catch (_) {}
          delete S.photoFile[i]; delete S.photoPreview[i];
        });
      };
    });
    each(".wk-unable", function (x) {
      x.onclick = function () {
        var i = x.getAttribute("data-id");
        act(function () {
          return window.__psLive.claimWorkCompletion({ workId: i, outcome: "unable_to_complete", unable_reason: "other" });
        });
      };
    });
    each(".wk-reopen", function (x) {
      x.onclick = function () {
        var i = x.getAttribute("data-id"), r = d(i, "reason");
        if (!r) { S.error = { message: "A reason is required to reopen work." }; render(); return; }
        act(function () { return window.__psLive.reopenWork({ workId: i, reason: r }); });
      };
    });

    var pass = document.getElementById("rwPass");
    if (pass) pass.onclick = function () {
      act(function () {
        return window.__psLive.readinessWalk({
          unitId: S.unitId, outcome: "ready",
          confirmations: {
            work_complete_confirmed: true, cleaning_acceptable_confirmed: true,
            appliances_present_confirmed: true, appliance_function_confirmed: true,
            no_repair_blocker_confirmed: true, keys_accounted_confirmed: true,
            condition_acceptable_confirmed: true, no_unknowns_confirmed: true,
          },
        });
      });
    };
    var fail = document.getElementById("rwFail");
    if (fail) fail.onclick = function () {
      var f = (document.getElementById("rwFind") || {}).value || "";
      act(function () {
        return window.__psLive.readinessWalk({ unitId: S.unitId, outcome: "not_ready", findings_text: f });
      });
    };

    var m = document.getElementById("mtMsg"); if (m) m.oninput = function () { S.msg = m.value; };
    var send = document.getElementById("mtSend");
    if (send) send.onclick = function () {
      if (!S.msg.trim()) return;
      var text = S.msg, photo = S.photo;
      S.msg = ""; S.photo = "";
      act(function () {
        return window.__psLive.staffAgentMessage({
          // No photo field. Nothing here uploads, so nothing here pretends to.
          text: text, photos: [], context_unit_id: S.unitId,
        });
      });
    };
    // A redirect opens the work item ON THIS PAGE. It never navigates away.
    each(".rd-work", function (x) {
      x.onclick = function () {
        var i = x.getAttribute("data-id");
        S.open[i] = true; S.redirect = null; render();
        var el = document.getElementById("psUnitTurnPage");
        if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" });
      };
    });
    each(".mt-confirm", function (x) {
      x.onclick = function () {
        act(function () { return window.__psLive.confirmAgentProposal({ proposalId: x.getAttribute("data-id") }); });
      };
    });
    each(".mt-cancel", function (x) {
      x.onclick = function () {
        act(function () { return window.__psLive.cancelAgentProposal({ proposalId: x.getAttribute("data-id") }); });
      };
    });
  }

  async function boot() {
    if (!mounted()) return;                 // navigation has not opened this page
    if (!authorized()) { render(); return; } // honest "not signed in", no fetch
    S.list = null; render();                 // show Loading before the request
    await loadList();
    render();
  }
  window.__psUnitTurn = { boot: boot, render: render, loadUnit: loadUnit, _state: S };
  //  DELIBERATELY NOT auto-booted. Maintenance → Turnovers mounts the
  //  containers and calls boot(). Booting at page load would fire a live
  //  request for a surface nobody opened.
})();
