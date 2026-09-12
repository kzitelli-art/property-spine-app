/* Repeated property review over existing reads. No stored readiness or writes. */
(function () {
  "use strict";
  var generation = 0,
    captured = null;
  function scope() {
    var l = window.__psLive,
      m = l && l.sessionMeta();
    return m && m.user_id + ":" + m.property_id;
  }
  function node(tag, text, parent) {
    var e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function button(text, parent, fn) {
    var b = node("button", text, parent);
    b.type = "button";
    b.className = "btn ghost small";
    b.onclick = fn;
    return b;
  }
  function close() {
    generation++;
    captured = null;
    ["leasingSetupDialog", "leasingSetupReturn"].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) e.remove();
    });
  }
  async function door(fn) {
    if (scope() !== captured) {
      close();
      return;
    }
    var prior = captured;
    close();
    var ticket = generation;
    try {
      await fn();
      if (scope() !== prior || ticket !== generation) return;
      var back = button("Return to Leasing setup", document.body, function () {
        if (scope() !== prior) {
          close();
          return;
        }
        open();
      });
      back.id = "leasingSetupReturn";
      back.style.cssText =
        "position:fixed;bottom:16px;right:16px;z-index:9999;background:white;max-width:90vw";
    } catch (error) {
      if (scope() !== prior || ticket !== generation) return;
      await open();
      var dialog = document.getElementById("leasingSetupDialog");
      if (dialog)
        node(
          "p",
          "The selected screen could not be opened. Your records were not changed.",
          dialog,
        ).setAttribute("role", "alert");
    }
  }
  function checked(d) {
    if (!d || typeof d !== "object") throw Error("Unavailable");
    return d;
  }
  var shelves = [
    {
      key: "leasingKnowledge",
      title: "Property answers",
      go: function () {
        return openLeasingKnowledge();
      },
      describe: function (d) {
        var c = checked(d.coverage).counts;
        if (
          !c ||
          !["current", "total", "missing", "expired", "retired"].every(
            function (k) {
              return Number.isInteger(c[k]) && c[k] >= 0;
            },
          )
        )
          throw Error("Unavailable");
        return [
          c.current + " of " + c.total + " topics have current answers",
          c.missing +
            " missing · " +
            c.expired +
            " expired · " +
            c.retired +
            " retired",
          "Recorded wording is not a completed review. Check sources and update answers as things change.",
        ];
      },
    },
    {
      key: "tourSlots",
      title: "Tour times",
      go: function () {
        return psTourTimesPage();
      },
      describe: function (d) {
        if (
          !Array.isArray(d.slots) ||
          !Array.isArray(d.eligible_hosts) ||
          !("schedule_policy" in d) ||
          !Number.isFinite(Date.parse(d.from)) ||
          !Number.isFinite(Date.parse(d.to))
        )
          throw Error("Unavailable");
        return [
          d.schedule_policy
            ? "Weekly policy recorded"
            : "No weekly policy recorded",
          d.operating_timezone || "Timezone not established",
          d.slots.length +
            " times returned for " +
            d.from +
            " to " +
            d.to +
            " (bounded list; not a total)",
          d.eligible_hosts.length + " eligible hosts returned",
          "A recorded policy does not mean a particular appointment can be booked.",
        ];
      },
    },
    {
      key: "leaseConfiguration",
      title: "Lease document",
      go: function () {
        return psLiveApplicationsReview();
      },
      describe: function (d) {
        var c = checked(d.configuration);
        if (
          typeof c.ready_to_execute !== "boolean" ||
          typeof c.ready_to_generate !== "boolean"
        )
          throw Error("Unavailable");
        return [
          c.ready_to_execute
            ? "Document and signer configuration established"
            : c.ready_to_generate
              ? "Document configured; signer needed"
              : "Lease document setup needed",
          c.can_configure
            ? "Review the current document and terms in lease setup."
            : "Management access is needed to change lease configuration.",
          "Configuration does not establish an executed lease or availability.",
        ];
      },
    },
  ];
  async function open() {
    close();
    var l = window.__psLive;
    if (!l || !l.hasSession() || !scope()) return;
    captured = scope();
    var token = generation,
      property = l.sessionMeta().property_id;
    var dialog = node("dialog", null, document.body);
    dialog.id = "leasingSetupDialog";
    dialog.style.cssText =
      "width:min(780px,94vw);max-height:90vh;overflow:auto;padding:20px;border:1px solid #ddd;border-radius:16px;box-sizing:border-box";
    dialog.setAttribute("aria-labelledby", "leasingSetupTitle");
    button("Close", dialog, close);
    node("h2", "Leasing setup", dialog).id = "leasingSetupTitle";
    node(
      "p",
      typeof crumbPropertyName === "function"
        ? crumbPropertyName()
        : "Current property",
      dialog,
    );
    node(
      "p",
      "Review these shelves when adding a property and whenever details change. Each section reads its existing records; this is not a launch approval.",
      dialog,
    );
    node("p", "Read requested " + new Date().toLocaleString(), dialog);
    button("Refresh", dialog, open);
    dialog.addEventListener("cancel", function (e) {
      e.preventDefault();
      close();
    });
    dialog.showModal();
    shelves.forEach(async function (s) {
      var section = node("section", null, dialog);
      section.style.cssText =
        "padding:16px 0;border-bottom:1px solid #ddd;overflow-wrap:anywhere";
      node("h3", s.title, section);
      var content = node("div", "Loading…", section);
      var action = button(s.title, section, function () {
        door(s.go);
      });
      action.disabled = true;
      try {
        var out = await l.loadResource(s.key, {});
        if (token !== generation) return;
        if (scope() !== captured) {
          close();
          return;
        }
        var d = checked(out && out.data);
        if (d.property_id && String(d.property_id) !== String(property))
          throw Error("Property mismatch");
        var lines = s.describe(d);
        content.replaceChildren();
        lines.forEach(function (line) {
          node("p", line, content);
        });
        action.disabled = false;
      } catch (e) {
        if (token !== generation) return;
        if (scope() !== captured) {
          close();
          return;
        }
        if (
          s.key === "tourSlots" &&
          Number(e.status || e.httpStatus) === 422 &&
          e.body &&
          e.body.code === "property_operating_timezone_not_configured"
        ) {
          content.textContent =
            "Setup needed — " +
            (typeof e.body.error === "string"
              ? e.body.error
              : "Operating timezone is not configured.");
          return;
        }
        content.textContent =
          Number(e.status || e.httpStatus) === 403
            ? "Access required"
            : Number(e.status || e.httpStatus) === 401
              ? "Sign in required"
              : "Unavailable — retry this read.";
        button("Retry " + s.title, content, open);
      }
    });
    var links = node("section", null, dialog);
    node("h3", "Other property records", links);
    button("Team", links, function () {
      door(function () {
        return openSetupDrawer();
      });
    });
    button("Source and inventory review — Deal Setup", links, function () {
      door(function () {
        return dsShow();
      });
    });
    node(
      "p",
      "Deal Setup has its own deal and property selection. Verify the property there before reviewing sources.",
      links,
    );
    node(
      "p",
      "Policies and website connections: ask the authorized property administrator to review the existing operating settings and actual source connection. These have not been assessed here.",
      links,
    );
  }
  window.openLeasingSetup = open;
  window.closeLeasingSetup = close;
})();
