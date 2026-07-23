"use strict";

// PROPERTY SPINE MOVE-IN QUEUE APP v1
// Class 1 live read projection. This module never performs a move-in write.
// It finds work and returns the operator to the existing lease/application
// lifecycle, where the canonical forms, server-authored action contract and
// receipts already live.
(function () {
  if (window.__psMoveInQueueAppV1) return;
  window.__psMoveInQueueAppV1 = true;

  var state = { includeCompleted: false, loading: false, data: null, error: null };

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function authorized() {
    try {
      return window.__OFFLINE_MODE !== true && window.__psLive &&
        typeof window.__psLive.hasSession === "function" && window.__psLive.hasSession();
    } catch (_) { return false; }
  }
  function money(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "—";
  }
  function date(v) { return v ? String(v).slice(0, 10) : "—"; }
  function textState(code) {
    var map = {
      active_money_exception: "Payment evidence changed after activation",
      delivery_obligation_missing: "Delivery obligation is missing or already closed before possession",
      ready_for_handoff: "Ready for physical handoff",
      keys_not_ready: "Keys and access need preparation",
      unit_not_ready: "Unit readiness remains open",
      ready_to_activate: "Ready to activate economic tenancy",
      funds_outstanding: "Move-in funds remain outstanding",
      funds_setup_required: "Move-in charges need confirmation",
      forward_lease: "Lease has not started",
      possession_delivered: "Move-in completed",
    };
    return map[code] || "Unsupported move-in state";
  }
  function tone(cls) {
    return cls === "completed" ? "green" : cls === "actionable" ? "brass" : cls === "blocked" ? "red" : "";
  }
  function pill(label, cls) { return '<span class="ps-miq-pill ' + esc(cls || "") + '">' + esc(label) + "</span>"; }

  function injectStyle() {
    if (document.getElementById("psMoveInQueueStyle")) return;
    var style = document.createElement("style");
    style.id = "psMoveInQueueStyle";
    style.textContent = [
      ".ps-miq-launch{white-space:nowrap}",
      ".ps-miq-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 18px}",
      ".ps-miq-stat{border:1px solid var(--soft,#eceae5);border-radius:16px;padding:12px;background:#fff}",
      ".ps-miq-stat b{display:block;font-family:Fraunces,Georgia,serif;font-size:26px;line-height:1;color:var(--ink,#171512)}",
      ".ps-miq-stat span{display:block;margin-top:6px;font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--faint,#8a877f)}",
      ".ps-miq-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:6px 0 12px}",
      ".ps-miq-list{border-top:1px solid var(--soft,#eceae5)}",
      ".ps-miq-row{padding:15px 0;border-bottom:1px solid var(--soft,#eceae5)}",
      ".ps-miq-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}",
      ".ps-miq-name{font-weight:700;font-size:14px;color:var(--ink,#171512)}",
      ".ps-miq-sub{font-size:12.5px;line-height:1.5;color:var(--muted,#686154);margin-top:4px}",
      ".ps-miq-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}",
      ".ps-miq-pill{display:inline-flex;border:1px solid var(--line,#d9cfbf);border-radius:999px;padding:3px 8px;font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#686154);background:#fff}",
      ".ps-miq-pill.green{color:var(--green,#17634f);border-color:#bcd9ca;background:var(--green2,#e8f3ee)}",
      ".ps-miq-pill.brass{color:var(--brass,#a46f24);border-color:#ead09a;background:var(--brass2,#fff4dc)}",
      ".ps-miq-pill.red{color:var(--red,#a33a2d);border-color:#eabbb3;background:var(--red2,#fff0ec)}",
      ".ps-miq-next{margin-top:10px;padding-left:12px;border-left:2px solid #c9a15c;font-size:12.5px;color:#5d5a53}",
      ".ps-miq-error,.ps-miq-empty{padding:16px;border:1px dashed var(--line,#d9cfbf);border-radius:16px;color:var(--muted,#686154);font-size:13px}",
      "@media(max-width:700px){.ps-miq-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.ps-miq-head{display:block}.ps-miq-head .btn{margin-top:10px}}",
    ].join("\n");
    document.head.appendChild(style);
  }

  function openSheet() {
    var title = document.getElementById("sheetTitle"); if (title) title.textContent = "Move-ins";
    var mini = document.getElementById("sheetMini"); if (mini) mini.textContent = "Property operating queue";
    var sub = document.getElementById("sheetSub"); if (sub) sub.textContent = "One server-authored next action per lease. Execute inside the existing lifecycle record.";
    var body = document.getElementById("sheetBody"); if (body) body.innerHTML = render();
    var drawer = document.getElementById("drawer"); if (drawer) drawer.classList.add("open");
  }

  function render() {
    if (state.loading) return '<div class="ps-miq-empty">Loading live move-in work…</div>';
    if (state.error) return '<div class="ps-miq-error">Move-in work is unavailable. No fixture or application-local state was substituted.<div style="margin-top:10px"><button class="btn ghost small" type="button" data-miq-refresh="1">Retry</button></div></div>';
    var d = state.data;
    if (!d) return '<div class="ps-miq-empty">Open the queue to load live property-scoped work.</div>';
    if (!Array.isArray(d.items) || !d.summary) return '<div class="ps-miq-error">The server returned a queue contract this app does not understand. Nothing was inferred.</div>';
    var s = d.summary;
    var summary = '<div class="ps-miq-summary">'
      + '<div class="ps-miq-stat"><b>' + esc(s.needs_attention || 0) + '</b><span>Needs attention</span></div>'
      + '<div class="ps-miq-stat"><b>' + esc(s.actionable || 0) + '</b><span>Actionable now</span></div>'
      + '<div class="ps-miq-stat"><b>' + esc(s.blocked || 0) + '</b><span>Blocked</span></div>'
      + '<div class="ps-miq-stat"><b>' + esc(s.forward || 0) + '</b><span>Upcoming</span></div>'
      + '</div>';
    var toolbar = '<div class="ps-miq-toolbar"><div class="ps-miq-sub">Window: ' + esc(d.window_days) + ' days · ' + esc(d.count) + ' record' + (d.count === 1 ? '' : 's') + '</div><div>'
      + '<button class="btn ghost small" type="button" data-miq-completed="1">' + (state.includeCompleted ? 'Hide completed' : 'Show recent completed') + '</button> '
      + '<button class="btn ghost small" type="button" data-miq-refresh="1">Refresh</button></div></div>';
    if (!d.items.length) return summary + toolbar + '<div class="ps-miq-empty">No move-in work is inside this operating window.</div>';
    var rows = d.items.map(function (item) {
      var lease = item.lease || {}, person = item.person || {}, funds = item.funds || {}, delivery = item.delivery || {};
      var action = item.primary_action || {};
      var labels = pill(String(item.queue_class || "unknown").replace(/_/g, " "), tone(item.queue_class))
        + pill(item.current_rent_roll_tenancy ? "on rent roll" : "not on rent roll", item.current_rent_roll_tenancy ? "green" : "")
        + pill(item.possession ? "possession delivered" : "possession pending", item.possession ? "green" : "");
      var moneyLine = funds.charge_set
        ? 'Required ' + money(funds.total_required) + ' · Outstanding ' + money(funds.total_outstanding) + ' · ' + String(funds.proof_strength || "unknown").replace(/_/g, " ")
        : 'Move-in charge set not yet confirmed.';
      var owner = delivery.accountable_role ? ' · Owner: ' + delivery.accountable_role.replace(/_/g, " ") : '';
      var appButton = item.application_id
        ? '<button class="btn ghost small" type="button" data-miq-app="' + esc(item.application_id) + '" data-miq-lease="' + esc(lease.id) + '" data-miq-unit="' + esc(lease.unit_number || '') + '">Open lifecycle</button>'
        : '<button class="btn ghost small" type="button" disabled title="No application correlation was returned">No application link</button>';
      return '<div class="ps-miq-row"><div class="ps-miq-head"><div><div class="ps-miq-name">'
        + esc(person.name || "Resident") + ' · Unit ' + esc(lease.unit_number || "—") + '</div><div class="ps-miq-sub">'
        + esc(textState(item.state)) + ' · Lease starts ' + esc(date(lease.start_date)) + owner + '</div></div>' + appButton + '</div>'
        + '<div class="ps-miq-meta">' + labels + '</div><div class="ps-miq-sub">' + esc(moneyLine) + '</div>'
        + '<div class="ps-miq-next"><b>Next:</b> ' + esc(action.label || "No executable action returned") + '</div></div>';
    }).join("");
    return summary + toolbar + '<div class="ps-miq-list">' + rows + '</div>';
  }

  async function loadQueue() {
    if (!authorized()) {
      state.loading = false; state.error = new Error("No authenticated live session"); state.data = null;
      openSheet(); return;
    }
    state.loading = true; state.error = null; openSheet();
    try {
      var out = await window.__psLive.moveInQueue({ windowDays: 60, limit: 100, includeCompleted: state.includeCompleted });
      state.data = out && (out.data || out);
    } catch (e) {
      state.error = e; state.data = null;
    } finally {
      state.loading = false; openSheet();
    }
  }

  async function openLifecycle(applicationId, leaseId, unitNumber) {
    // Prefer an existing direct application opener when the host app exposes one.
    var direct = ["openApplicationReview", "openApplicationDetail", "openApplication"];
    for (var i = 0; i < direct.length; i++) {
      if (typeof window[direct[i]] === "function") {
        try { return await window[direct[i]](applicationId); } catch (_) {}
      }
    }
    // Safe fallback: return to the existing Leasing desk. We preserve correlation
    // as context only; the destination remains responsible for its own live read.
    window.__psMoveInQueueReturn = { application_id: applicationId, lease_id: leaseId, unit_number: unitNumber || null };
    var drawer = document.getElementById("drawer"); if (drawer) drawer.classList.remove("open");
    if (typeof window.openDesk === "function") {
      try { await window.openDesk("leasing"); } catch (_) {}
    }
    if (typeof window.toast === "function") {
      window.toast("ok", "Open Applications and select Unit " + (unitNumber || "—") + ". The queue changed no operating state.");
    }
  }

  function installLaunch() {
    injectStyle();
    var existing = document.querySelector("[data-miq-launch]");
    if (!authorized()) { if (existing) existing.remove(); return; }
    if (existing) return;
    var host = document.querySelector(".leasing-controls");
    if (!host) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn ghost small ps-miq-launch";
    b.setAttribute("data-miq-launch", "1");
    b.textContent = "Move-ins";
    host.appendChild(b);
  }

  document.addEventListener("click", function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest("[data-miq-launch],[data-miq-refresh],[data-miq-completed],[data-miq-app]") : null;
    if (!el) return;
    if (el.hasAttribute("data-miq-launch") || el.hasAttribute("data-miq-refresh")) { ev.preventDefault(); loadQueue(); return; }
    if (el.hasAttribute("data-miq-completed")) { ev.preventDefault(); state.includeCompleted = !state.includeCompleted; loadQueue(); return; }
    if (el.hasAttribute("data-miq-app")) {
      ev.preventDefault();
      openLifecycle(el.getAttribute("data-miq-app"), el.getAttribute("data-miq-lease"), el.getAttribute("data-miq-unit"));
    }
  }, true);

  var observer = new MutationObserver(installLaunch);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  setInterval(installLaunch, 2500);
  installLaunch();
})();
