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
 *
 * ── PHASE ZERO CHANGED THE MECHANISM, NOT THE RULE ─────────────────────────
 * The rule is unchanged: the browser may never grant itself authority, and the
 * property on screen must be the property the server confirmed.
 *
 * What changed is what "a control implying browser authority" means. Before
 * Phase Zero the browser had no way to ask for a different property, so ANY
 * multi-property control was a lie — and this module enforced honesty by
 * deleting every other option, disabling the select, stripping the chips'
 * onclick, and blocking switchProperty outright.
 *
 * There is now a server route that grants a session for a chosen property
 * (POST /operator/properties/select), and a server read that says which
 * properties an operator may hold (GET /operator/properties). So offering
 * those choices is no longer a claim of browser authority — it is a request
 * form for a decision the server still makes.
 *
 * The guard therefore moves from COUNT to MEMBERSHIP:
 *
 *     was   "exactly one option, and switching is impossible"
 *     is    "only options the SERVER listed, and switching goes through the
 *            server, which may still refuse"
 *
 * Everything not in the server's authorized set is still deleted on sight —
 * that is what keeps a fixture row out of a signed-in picker, and it is the
 * part of this module that was always doing the real work.
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
  /*  ── CONFIRMED AND PROVISIONAL ARE DIFFERENT KINDS OF THING ────────
   *
   *      ONLY A SUCCESSFUL SERVER VERIFICATION MAY ESTABLISH CONFIRMED
   *      SIGNED-IN PROPERTY SCOPE.
   *
   *  This used to be one variable, and refreshFromServer() set it from
   *  the CACHED _egAuthScope before asking the server — then returned
   *  that same unverified value when verification came back not-ok.
   *  applyScope() also writes the scope back into _egAuthScope, so the
   *  chain closed on itself:
   *
   *      _egAuthScope → applyScope → confirmedScope → _egAuthScope
   *                               ↑
   *                       no server in this loop
   *
   *  A cache certifying itself is the defect, not the symptom. The
   *  symptom is a live Solo session under chrome that says Skyline with
   *  full confidence, and no wordmark fix addresses the cause.
   *
   *  A cached scope may still paint a label so the shell does not flash
   *  blank while /operator/me is in flight. What it may never do is
   *  become authoritative, survive a failed verification still dressed
   *  as confirmed, or authorize a property switch.  */
  var confirmedScope = null;    // set ONLY by a successful server verification
  var provisionalScope = null;  // cached; may paint, may never certify
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

  /*  The set of property ids the SERVER said this operator may operate, as
   *  published by loadProperties() from GET /operator/properties.
   *
   *  Absent (the read has not returned yet, or failed) the answer is null and
   *  NOT an empty set — those are different facts, and treating "we have not
   *  been told" as "nothing is authorized" would strip the picker back to one
   *  option on every slow load. Null means "fall back to the previous rule",
   *  which is the safe direction. */
  function authorizedIds() {
    try {
      var rows = root.__psAuthorizedProperties;
      if (!Array.isArray(rows) || !rows.length) return null;
      var ids = Object.create(null);
      var n = 0;
      rows.forEach(function (r) {
        var id = trim(r && (r.property_id || r.id));
        if (id) { ids[id] = true; n++; }
      });
      return n ? ids : null;
    } catch (_) { return null; }
  }

  function isAuthorized(id, allowed, scope) {
    if (String(id) === String(scope.property_id)) return true;   // the active one, always
    if (!allowed) return false;                                  // unknown set → nothing else
    return !!allowed[String(id)];
  }

  function ensureAuthoritativeOption(select, scope, displayName, confirmed) {
    if (!select) return;

    var allowed = authorizedIds();
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

    //  MEMBERSHIP, NOT COUNT. Options the server listed stay; anything else —
    //  a fixture row, a stale pick, a hard-coded default — goes. The active
    //  option is kept by the same test, so a slow or failed list read leaves
    //  exactly the old behaviour rather than an empty picker.
    options.forEach(function (option) {
      if (option === authoritative) return;
      if (!isAuthorized(option.value, allowed, scope)) removeNode(option);
    });

    try { select.value = scope.property_id; } catch (_) {}
    //  The select is no longer disabled. It is not a claim of authority: its
    //  options are the server's own list, and choosing one asks the server to
    //  issue a session. Leaving it disabled would make the authorized set
    //  visible and unusable, which is a worse lie than either extreme.
    try { select.disabled = false; } catch (_) {}
    try { select.removeAttribute("aria-disabled"); } catch (_) {}
    //  The attribute is a CLAIM that the server chose this. A provisional
    //  paint must not make it, or a proof can assert the mark and be
    //  reading a cache.
    try {
      if (confirmed) select.setAttribute("data-server-authoritative", "true");
      else select.removeAttribute("data-server-authoritative");
    } catch (_) {}
  }

  //  makePropertyChipStatic was removed with Phase Zero. It existed to strip a
  //  chip's handler and mark it aria-disabled, which was correct while the
  //  browser could not ask for a different property. It is not replaced by a
  //  disabled variant: the active chip stays clickable, because clicking it is
  //  a request the server answers. Left as a note rather than dead code, so
  //  nobody restores it looking for the old guarantee.

  function publishScope(scope, displayName) {
    try {
      if (typeof root.CustomEvent === "function" && root.document && root.document.dispatchEvent) {
        root.document.dispatchEvent(new root.CustomEvent("ps:property-context", {
          detail: { property_id: scope.property_id, property_name: displayName },
        }));
      }
    } catch (_) {}
  }

  /*  ── A SCOPE IS ABOUT A SESSION, NOT ABOUT THE APP ────────────────
   *  Keeping the last confirmed scope through a dropped packet is right
   *  only while it is still the SAME session that was confirmed. A
   *  property switch mints a new session, so a scope belonging to the
   *  old one has stopped being about anything current — and putting it
   *  on the glass is exactly the reported lie: session on Solo, chrome
   *  confidently on Skyline.
   *
   *  The client's own session record says which property this session is
   *  for. If a scope disagrees with it, that scope belongs to a session
   *  that no longer exists.
   *
   *  NOTE THE ASYMMETRY, it is the whole reason this is safe:
   *  sessionMeta is an unverified client cache, and it is used ONLY TO
   *  WITHDRAW confidence, never to grant it. An unverified signal may
   *  always cast doubt; it may never certify. Granting on it would be
   *  the same defect one level down.                                    */
  function sessionStillMatches(scope) {
    try {
      var meta = root.__psLive && typeof root.__psLive.sessionMeta === "function"
        ? root.__psLive.sessionMeta() : null;
      if (!meta || !meta.property_id) return true;   // nothing to contradict it
      return String(meta.property_id) === String(scope.property_id);
    } catch (_) { return true; }
  }

  /*  `confirmed` is REQUIRED and has no default. A default would let a new
   *  call site inherit authority by omission, which is exactly how the
   *  cached path became authoritative in the first place.  */
  function applyScope(scope, confirmed) {
    scope = normalizeScope(scope);
    if (!scope || !hasLiveSession()) return false;
    if (confirmed !== true && confirmed !== false) {
      //  Refusing is safer than guessing. A caller that has not said
      //  whether the server confirmed this does not know.
      return false;
    }

    /*  A PROVISIONAL PAINT IS SUBJECT TO THE SAME WALL.
     *
     *  Found by an intermittent failure in the switch proof — two
     *  assertions in three runs, and "flaky" is not a diagnosis. After a
     *  switch, a deferred scheduleApply could re-project the PREVIOUS
     *  property's name from _egAuthScope as a provisional paint, so the
     *  glass said Skyline over a Solo session. Not confirmed, and just
     *  as wrong on screen — a caveat nobody can see is not a caveat.
     *  Non-deterministic because it depended on observer timing, which
     *  is exactly how it would have reached production and been called
     *  unreproducible.                                                  */
    if (!sessionStillMatches(scope)) {
      if (!confirmed) return false;
      //  A "confirmed" scope that contradicts the live session is not
      //  confirmed. Refusing it here means no call site can promote one.
      return false;
    }

    if (confirmed) { confirmedScope = scope; provisionalScope = null; }
    else { provisionalScope = scope; }
    var displayName = scope.property_name || "Property unavailable";
    applying = true;

    try {
      // Keep the app's existing authoritative grant object aligned so every
      // existing reader sees the same confirmed scope.
      //
      //  CONFIRMED ONLY. Writing a provisional scope here is what closed
      //  the loop: _egAuthScope is where the cached value came FROM, so
      //  writing it back laundered a cache into the app's own idea of
      //  server-confirmed truth, and every other reader inherited it.
      if (confirmed) {
        try {
          var prior = root._egAuthScope && typeof root._egAuthScope === "object" ? root._egAuthScope : {};
          root._egAuthScope = Object.assign({}, prior, {
            property_id: scope.property_id,
            property_name: scope.property_name,
          });
        } catch (_) {}
      }

      ensureAuthoritativeOption(safeElement("propPick"), scope, displayName, confirmed);

      // The two known shell labels: desktop app bar and mobile breadcrumb.
      setText(safeElement("appbarDeal"), displayName);
      setText(safeElement("crumbMDeal"), displayName);

      // Any extracted shell can opt into the same primitive without adding a
      // second naming implementation.
      safeQueryAll("[data-authoritative-property-name]").forEach(function (el) {
        setText(el, displayName);
      });

      // The switcher shows the server's authorized set, with the confirmed
      // property marked active. A chip for anything the server did not list is
      // removed — that is the guard. The remaining chips keep their onclick,
      // because clicking one asks the server for a session rather than
      // asserting a scope the browser chose.
      var allowedChipIds = authorizedIds();
      var chips = safeQueryAll(".psw-chip");
      var primary = null;
      chips.forEach(function (chip) {
        var value = "";
        try { value = String(chip.getAttribute("data-val") || ""); } catch (_) {}
        if (!primary && value === scope.property_id) primary = chip;
      });
      chips.forEach(function (chip) {
        var value = "";
        try { value = String(chip.getAttribute("data-val") || ""); } catch (_) {}
        if (chip === primary) return;
        if (!isAuthorized(value, allowedChipIds, scope)) removeNode(chip);
        else { try { chip.classList.remove("active"); } catch (_) {} }
      });
      // The active chip carries the server's display name and is marked active,
      // but is NOT stripped of its handler: re-clicking the current property is
      // a no-op the server answers, not something the shell has to prevent.
      if (primary) {
        setText(primary, displayName);
        try { primary.setAttribute("data-val", scope.property_id); } catch (_) {}
        try { primary.classList.add("active", "psw-authoritative"); } catch (_) {}
      }

      safeQueryAll(".psw-add,.psw-persona").forEach(function (el) {
        try { el.hidden = true; } catch (_) {}
        try { el.setAttribute("aria-hidden", "true"); } catch (_) {}
      });

      var switcher = safeElement("propSwitcher");
      if (switcher) {
        try { switcher.setAttribute("data-property-id", scope.property_id); } catch (_) {}
        try { switcher.setAttribute("data-server-authoritative", "true"); } catch (_) {}
      }

      //  The event announces the app's property CONTEXT. A provisional
      //  paint must not fire it: a consumer that re-renders on it would
      //  be re-rendering on a cache, one listener removed from the loop
      //  this change exists to break.
      if (confirmed) publishScope(scope, displayName);
      return true;
    } finally {
      applying = false;
    }
  }

  /*  Honest unavailability. Gated on CONFIRMED only: a provisional paint
   *  must never suppress it, because the whole point is that a cached
   *  name is not an answer when the server did not give one.  */
  function applyUnavailable() {
    if (!hasLiveSession() || confirmedScope) return false;
    provisionalScope = null;
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

  /*  ── VERIFICATION FAILED: WHAT SURVIVES, AND WHAT MUST NOT ─────────
   *
   *  Two cases, and collapsing them is the bug this function used to
   *  have. They differ in whether a server ever confirmed anything.
   *
   *    ALREADY CONFIRMED, now unreachable
   *        A successful verification happened. A later network failure
   *        is a fact about Spine, not about the property, and blanking
   *        the shell on a dropped packet would be its own dishonesty.
   *        The last SERVER-confirmed scope stands.
   *
   *    NEVER CONFIRMED, only cached
   *        Nothing has ever verified this. It is a claim the browser is
   *        making about itself, and it must NOT be presented as
   *        confirmed. Unavailable is the honest answer.
   *
   *  The hostile case this closes, stated so a reader can test it:
   *
   *      cached scope    Skyline
   *      live session    Solo
   *      verification    fails, or cannot establish Skyline
   *      MUST NOT        confirmed Skyline chrome
   */
  async function refreshFromServer() {
    if (!hasLiveSession()) return null;

    //  A cached scope may paint so the shell does not flash blank while
    //  /operator/me is in flight. PROVISIONAL — it certifies nothing, is
    //  not written back to _egAuthScope, and does not survive a failure.
    var existing = scopeFromExistingGrant();
    if (existing && !confirmedScope) applyScope(existing, false);

    function unverified() {
      //  Never confirmed → the provisional paint is withdrawn and the
      //  shell says so. Previously confirmed AND still the same session →
      //  that scope stands, re-projected so a provisional paint cannot
      //  linger over it. Previously confirmed for a DIFFERENT session →
      //  it is not a confirmation any more.
      provisionalScope = null;
      if (confirmedScope && sessionStillMatches(confirmedScope)) {
        applyScope(confirmedScope, true);
        return confirmedScope;
      }
      confirmedScope = null;
      applyUnavailable();
      return null;
    }

    if (!root.__psLive || typeof root.__psLive.verifySession !== "function") {
      return unverified();
    }

    try {
      var verification = await root.__psLive.verifySession();
      if (!verification || verification.ok !== true) return unverified();
      var verified = normalizeScope({
        property: verification.property,
        allowed_modules: verification.allowed_modules,
        role_title: verification.user && verification.user.role,
      });
      if (!verified) return unverified();
      applyScope(verified, true);
      return verified;
    } catch (_) {
      return unverified();
    }
  }

  function scheduleApply() {
    if (scheduled || applying || !hasLiveSession()) return;
    scheduled = true;
    var defer = typeof root.setTimeout === "function" ? root.setTimeout : function (fn) { fn(); };
    defer(function () {
      scheduled = false;
      //  RE-PROJECTION, NOT PROMOTION. The observer fires constantly, so
      //  this is the path that would quietly turn a cached scope into a
      //  confirmed one thousands of times a session. A confirmed scope is
      //  re-projected as confirmed; anything else is painted provisionally
      //  and a real verification is asked for.
      //  USE THE RETURN VALUE. applyScope REFUSES a scope that contradicts
      //  the live session, and the first version ignored that and returned
      //  anyway — so when the session moved under a confirmed scope, the
      //  observer path repainted nothing and left the PREVIOUS property's
      //  name sitting on the glass until something else happened to fire.
      //  Refusing to paint is not the same as correcting what is painted.
      if (confirmedScope && applyScope(confirmedScope, true)) return;
      var cached = provisionalScope || scopeFromExistingGrant();
      if (cached) applyScope(cached, false);
      refreshFromServer();
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
        //  CONFIRMED ONLY. This decides whether a switch may be attempted,
        //  so a cached scope must not stand in for one — that is the
        //  browser authorizing itself, which is the thing §21 forbids.
        var scope = confirmedScope;
        if (!scope) {
          // No confirmed scope yet: we cannot say whether the request is
          // authorized, so we do not act on it. Re-read and refuse this one.
          await refreshFromServer();
          return { ok: false, blocked: true };
        }
        // Already there — nothing to ask the server for. `scope` is the
        // CONFIRMED scope: the guard above returns early when there is
        // none, so reaching here means a verification succeeded.
        if (String(value) === String(scope.property_id)) {
          applyScope(scope, true);
          return { ok: true, blocked: false };
        }
        // ── PHASE ZERO ───────────────────────────────────────────────
        // A request for a property the SERVER LISTED is delegated to the
        // shell, which calls POST /operator/properties/select — and the
        // server re-reads the assignment and may still refuse. Membership
        // in this list is a filter on what we bother asking for; it is not
        // the grant, and this module must never treat it as one.
        //
        // Anything NOT in the list is blocked here, unchanged. That is the
        // case where the browser would have been inventing a choice.
        var allowed = authorizedIds();
        if (allowed && allowed[String(value)]) {
          var out = await originalSwitchProperty.apply(this, arguments);
          //  RE-CONFIRM FROM THE SERVER, ALWAYS.
          //
          //  This module holds `confirmedScope` and re-projects it from a
          //  MutationObserver and from wrappers around loadProperties /
          //  refreshPropSwitcher / renderHome. After a successful switch that
          //  cached scope is STALE, so those wrappers immediately drag the
          //  chrome back to the previous property — producing a live Skyline
          //  session rendering Demo Building's name, which is precisely the
          //  disagreement this file exists to prevent.
          //
          //  It fails toward safety either way: refreshFromServer() re-reads
          //  /operator/me, so if the switch did not actually happen the scope
          //  snaps back to the truth rather than to what was clicked.
          await refreshFromServer();
          return out;
        }
        //  Refused: the property was not in the server's list. Put the
        //  CONFIRMED scope back, so a blocked click cannot leave the
        //  chrome showing what was clicked.
        applyScope(scope, true);
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
    /*  Deliberately separate accessors. One returns what the SERVER
     *  confirmed and the other what the browser is merely painting, and a
     *  caller that wants the first must not be able to receive the second
     *  by accident — which is the whole defect, expressed as an API.  */
    getProvisionalScope: function () { return provisionalScope ? Object.assign({}, provisionalScope) : null; },
  };
});
