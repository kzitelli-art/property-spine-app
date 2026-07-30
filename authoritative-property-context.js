/* PROPERTY SPINE — AUTHORITATIVE PROPERTY CONTEXT
 *
 * Class 1 operator-shell primitive.
 *
 * In an authenticated operator session, every visible property label and every
 * client-side property control must reflect the property returned by the
 * server's /operator/me handshake. A cached picker label, fixture portfolio,
 * internal database name, or prior browser selection may never override it.
 *
 * This module does not choose property scope. It only projects the already
 * server-authorized scope into the shell and removes controls that could imply
 * the browser has authority it does not possess.
 */
(function (root, factory) {
  "use strict";

  if (typeof module === "object" && module.exports) {
    module.exports = factory;
    return;
  }

  var api = factory(root);
  root.__psAuthoritativePropertyContext = api;
  api.start();
})(typeof window !== "undefined" ? window : globalThis, function createAuthoritativePropertyContext(root) {
  "use strict";

  var started = false;
  var applying = false;
  var scheduled = false;
  var observer = null;
  var confirmedScope = null;
  var originalSwitchProperty = null;
  var wrapped = Object.create(null);

  function trim(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function hasLiveSession() {
    try {
      return !!(
        root.__psLive &&
        typeof root.__psLive.hasSession === "function" &&
        root.__psLive.hasSession()
      );
    } catch (_) {
      return false;
    }
  }

  function normalizeScope(scope) {
    if (!scope || typeof scope !== "object") return null;
    var property = scope.property && typeof scope.property === "object" ? scope.property : null;
    var id = trim(scope.property_id || scope.id || (property && property.id));
    if (!id) return null;
    return {
      property_id: id,
      property_name: trim(scope.property_name || scope.name || (property && property.name)) || null,
      allowed_modules: Array.isArray(scope.allowed_modules) ? scope.allowed_modules.slice() : null,
      role_title: scope.role_title || null,
    };
  }

  function scopeFromExistingGrant() {
    try {
      return normalizeScope(root._egAuthScope);
    } catch (_) {
      return null;
    }
  }

  function safeElement(id) {
    try {
      return root.document && root.document.getElementById ? root.document.getElementById(id) : null;
    } catch (_) {
      return null;
    }
  }

  function safeQueryAll(selector) {
    try {
      if (!root.document || !root.document.querySelectorAll) return [];
      return Array.prototype.slice.call(root.document.querySelectorAll(selector));
    } catch (_) {
      return [];
    }
  }

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function removeNode(node) {
    if (!node) return;
    try {
      if (typeof node.remove === "function") node.remove();
      else if (node.parentNode) node.parentNode.removeChild(node);
    } catch (_) {}
  }

  function ensureAuthoritativeOption(select, scope, displayName) {
    if (!select) return;

    var options = [];
    try { options = Array.prototype.slice.call(select.options || []); } catch (_) {}
    var authoritative = null;

    options.forEach(function (option) {
      if (String(option.value) === scope.property_id && !authoritative) {
        authoritative = option;
      }
    });

    if (!authoritative && root.document && root.document.createElement) {
      authoritative = root.document.createElement("option");
      authoritative.value = scope.property_id;
      if (typeof select.appendChild === "function") select.appendChild(authoritative);
    }

    if (authoritative) {
      authoritative.value = scope.property_id;
      authoritative.textContent = displayName;
      authoritative.selected = true;
    }

    options.forEach(function (option) {
      if (option !== authoritative) removeNode(option);
    });

    try { select.value = scope.property_id; } catch (_) {}
    try { select.disabled = true; } catch (_) {}
    try { select.setAttribute("aria-disabled", "true"); } catch (_) {}
    try { select.setAttribute("data-server-authoritative", "true"); } catch (_) {}
  }

  function makePropertyChipStatic(chip, scope, displayName) {
    if (!chip) return;
    setText(chip, displayName);
    try { chip.setAttribute("data-val", scope.property_id); } catch (_) {}
    try { chip.setAttribute("aria-disabled", "true"); } catch (_) {}
    try { chip.setAttribute("tabindex", "-1"); } catch (_) {}
    try { chip.removeAttribute("onclick"); } catch (_) {}
    try { chip.onclick = null; } catch (_) {}
    try { chip.classList.add("active", "psw-authoritative"); } catch (_) {}
  }

  function publishScope(scope, displayName) {
    try {
      if (typeof root.CustomEvent === "function" && root.document && root.document.dispatchEvent) {
        root.document.dispatchEvent(new root.CustomEvent("ps:property-context", {
          detail: { property_id: scope.property_id, property_name: displayName },
        }));
      }
    } catch (_) {}
  }

  function applyScope(scope) {
    scope = normalizeScope(scope);
    if (!scope || !hasLiveSession()) return false;

    confirmedScope = scope;
    var displayName = scope.property_name || "Property unavailable";
    applying = true;

    try {
      // Keep the app's existing authoritative grant object aligned so every
      // existing reader sees the same confirmed scope.
      try {
        var prior = root._egAuthScope && typeof root._egAuthScope === "object" ? root._egAuthScope : {};
        root._egAuthScope = Object.assign({}, prior, {
          property_id: scope.property_id,
          property_name: scope.property_name,
        });
      } catch (_) {}

      ensureAuthoritativeOption(safeElement("propPick"), scope, displayName);

      // The two known shell labels: desktop app bar and mobile breadcrumb.
      setText(safeElement("appbarDeal"), displayName);
      setText(safeElement("crumbMDeal"), displayName);

      // Any extracted shell can opt into the same primitive without adding a
      // second naming implementation.
      safeQueryAll("[data-authoritative-property-name]").forEach(function (el) {
        setText(el, displayName);
      });

      // The footer property switcher becomes a static statement of server scope.
      // A signed-in browser cannot present itself as capable of changing authority.
      var chips = safeQueryAll(".psw-chip");
      var primary = null;
      chips.forEach(function (chip) {
        var value = "";
        try { value = String(chip.getAttribute("data-val") || ""); } catch (_) {}
        if (!primary && value === scope.property_id) primary = chip;
      });
      if (!primary && chips.length) primary = chips[0];
      if (primary) makePropertyChipStatic(primary, scope, displayName);
      chips.forEach(function (chip) { if (chip !== primary) removeNode(chip); });

      safeQueryAll(".psw-add,.psw-persona").forEach(function (el) {
        try { el.hidden = true; } catch (_) {}
        try { el.setAttribute("aria-hidden", "true"); } catch (_) {}
      });

      var switcher = safeElement("propSwitcher");
      if (switcher) {
        try { switcher.setAttribute("data-property-id", scope.property_id); } catch (_) {}
        try { switcher.setAttribute("data-server-authoritative", "true"); } catch (_) {}
      }

      publishScope(scope, displayName);
      return true;
    } finally {
      applying = false;
    }
  }

  function applyUnavailable() {
    if (!hasLiveSession() || confirmedScope) return false;
    var label = "Property unavailable";
    applying = true;
    try {
      setText(safeElement("appbarDeal"), label);
      setText(safeElement("crumbMDeal"), label);
      safeQueryAll(".psw-chip").forEach(function (chip) {
        setText(chip, label);
        try { chip.removeAttribute("onclick"); } catch (_) {}
        try { chip.onclick = null; } catch (_) {}
        try { chip.setAttribute("aria-disabled", "true"); } catch (_) {}
      });
      safeQueryAll(".psw-add,.psw-persona").forEach(function (el) {
        try { el.hidden = true; } catch (_) {}
      });
      var select = safeElement("propPick");
      if (select) {
        try { select.disabled = true; } catch (_) {}
        try { select.setAttribute("aria-disabled", "true"); } catch (_) {}
      }
      return true;
    } finally {
      applying = false;
    }
  }

  async function refreshFromServer() {
    if (!hasLiveSession()) return null;

    var existing = scopeFromExistingGrant();
    if (existing) applyScope(existing);

    if (!root.__psLive || typeof root.__psLive.verifySession !== "function") {
      if (!existing) applyUnavailable();
      return existing;
    }

    try {
      var verification = await root.__psLive.verifySession();
      if (!verification || verification.ok !== true) {
        if (!existing) applyUnavailable();
        return existing;
      }
      var verified = normalizeScope({
        property: verification.property,
        allowed_modules: verification.allowed_modules,
        role_title: verification.user && verification.user.role,
      });
      if (!verified) {
        if (!existing) applyUnavailable();
        return existing;
      }
      applyScope(verified);
      return verified;
    } catch (_) {
      // A network failure does not erase a scope already confirmed by the gate.
      if (!existing) applyUnavailable();
      return existing;
    }
  }

  function scheduleApply() {
    if (scheduled || applying || !hasLiveSession()) return;
    scheduled = true;
    var defer = typeof root.setTimeout === "function" ? root.setTimeout : function (fn) { fn(); };
    defer(function () {
      scheduled = false;
      var scope = confirmedScope || scopeFromExistingGrant();
      if (scope) applyScope(scope);
      else refreshFromServer();
    }, 0);
  }

  function wrapShellFunction(name) {
    if (wrapped[name] || typeof root[name] !== "function") return;
    var original = root[name];
    wrapped[name] = original;
    root[name] = function () {
      var result = original.apply(this, arguments);
      if (result && typeof result.then === "function") {
        return result.then(function (value) {
          scheduleApply();
          return value;
        }, function (error) {
          scheduleApply();
          throw error;
        });
      }
      scheduleApply();
      return result;
    };
  }

  function guardPropertySwitching() {
    if (originalSwitchProperty || typeof root.switchProperty !== "function") return;
    originalSwitchProperty = root.switchProperty;
    root.switchProperty = async function (value) {
      if (hasLiveSession()) {
        var scope = confirmedScope || scopeFromExistingGrant();
        if (scope) {
          applyScope(scope);
          return { ok: String(value) === scope.property_id, blocked: String(value) !== scope.property_id };
        }
        await refreshFromServer();
        return { ok: false, blocked: true };
      }
      return originalSwitchProperty.apply(this, arguments);
    };
  }

  function installWrappers() {
    ["loadProperties", "refreshPropSwitcher", "psSyncLiveCrumb", "syncCrumbLabels", "renderHome"]
      .forEach(wrapShellFunction);
    guardPropertySwitching();
  }

  function installObserver() {
    if (observer || !root.MutationObserver || !root.document || !root.document.documentElement) return;
    observer = new root.MutationObserver(function () {
      if (!applying) scheduleApply();
    });
    observer.observe(root.document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  async function start() {
    if (started) {
      scheduleApply();
      return confirmedScope;
    }
    started = true;
    installWrappers();
    installObserver();

    if (root.addEventListener) {
      root.addEventListener("hashchange", scheduleApply);
      root.addEventListener("pageshow", scheduleApply);
    }

    var scope = await refreshFromServer();
    scheduleApply();
    return scope;
  }

  function stop() {
    if (observer && observer.disconnect) observer.disconnect();
    observer = null;
    started = false;
  }

  return {
    start: start,
    stop: stop,
    refreshFromServer: refreshFromServer,
    applyScope: applyScope,
    applyUnavailable: applyUnavailable,
    getConfirmedScope: function () { return confirmedScope ? Object.assign({}, confirmedScope) : null; },
  };
});
