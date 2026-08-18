/* ════════════════════════════════════════════════════════════════════════
 *  PROPERTY IDENTITY TRUTH TABLE — read-only browser harness
 *
 *  Paste into the console of the AFFECTED signed-in page. It changes
 *  nothing: no property switch, no mint, no write, no cache clear. Run it
 *  BEFORE navigating or refreshing — a refresh rehydrates memory from
 *  storage and destroys the exact divergence this exists to catch.
 *
 *  WHY THE FIVE-ROW TABLE IS NOT ENOUGH
 *  Server-side, /operator/me, /operator/properties.active_property_id and
 *  /operator/rent-roll/units all read req.operator.property_id off the same
 *  resolveStaffSession(token). Given ONE token they cannot disagree. So the
 *  property is a function of the token, and a table of properties without
 *  tokens records the symptom and discards the discriminator.
 *
 *  This harness asks the question that discriminates:
 *
 *      does the token in __psLive's MEMORY still agree with the token in
 *      sessionStorage, and do the server rows agree with each other when
 *      fetched in ONE pass with a KNOWN token?
 *
 *  If the two tokens disagree  → hypothesis A, confirmed, with evidence.
 *  If one token yields two different properties across the three server
 *  rows → hypothesis B is back and the server trace is wrong.
 *
 *  THE TOKEN IS NEVER PRINTED. Only a non-reversible 8-hex fingerprint, so
 *  two rows can be compared without a credential landing in a screenshot.
 *
 *  FOUR SILENCES ARE KEPT DISTINCT (PHILOSOPHY §40.7). A row is never
 *  blank: it is a value, NOT_ESTABLISHED, READ_FAILED, or NOT_READABLE.
 *  A failed read must never render as agreement.
 *
 *  CLASS 3 — diagnostic harness. Removal condition: the property-switch
 *  regression exists as a real test and this blocker has a receipt.
 * ════════════════════════════════════════════════════════════════════════ */
(async function propertyIdentityTruthTable(){
  'use strict';

  const NOT_READABLE = { silence: 'NOT_READABLE' };
  const out = [];

  /*  THE FINGERPRINT IS THE JOIN KEY, NOT A LOCAL LABEL.
   *
   *  staff_sessions stores sha256(token) in token_digest and — since
   *  migration 070 — no raw token at all. So the first 12 hex of
   *  sha256(token) names EXACTLY ONE session row, and
   *  tools/property_authority_preflight.js (api repo) prints the same
   *  12 characters as `digest_fp`. Fingerprint with anything else and
   *  the two tables cannot be joined, which is most of the value.
   *
   *  The digest is not a credential: the server hashes what it is GIVEN
   *  and compares, so holding the digest authenticates nothing. A prefix
   *  of it is safe to paste into a receipt. The token is never printed.  */
  async function fp(tok){
    if (typeof tok !== 'string' || !tok) return null;
    try {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tok));
      return Array.from(new Uint8Array(buf)).map(function(b){
        return ('0' + b.toString(16)).slice(-2);
      }).join('').slice(0, 12);
    } catch (e) {
      /*  crypto.subtle needs a secure context. Saying so is the answer;
       *  a second hash that does not join to the database would look
       *  like a fingerprint and be useless as one.  */
      return 'NO_SUBTLE_CRYPTO';
    }
  }

  const stamp = () => new Date().toISOString();

  function row(source, kind, property, tokenFp, note){
    out.push({ source, kind, property, digest_fp: tokenFp || '—', at: stamp(), note: note || '' });
  }

  /*  The origin the app itself is pinned to. Read from the same input the
   *  app's api() helper reads, so the harness cannot talk to a different
   *  server than the page did.  */
  let ORIGIN = null;
  try {
    const el = document.getElementById('apiBase');
    ORIGIN = el && el.value ? String(el.value).replace(/\/+$/,'') : null;
  } catch (_) {}

  /*  ── ROW 1 · sessionStorage token ─────────────────────────────────── */
  let storageTok = null;
  try {
    const raw = sessionStorage.getItem('__ps_staff_session__');
    if (raw) {
      const obj = JSON.parse(raw);
      storageTok = (obj && typeof obj.t === 'string') ? obj.t : null;
      row('sessionStorage.__ps_staff_session__.m.property_id',
          'CLIENT CACHE',
          (obj && obj.m && obj.m.property_id) || 'NOT_ESTABLISHED',
          await fp(storageTok),
          'persisted meta — what the last mint/verify wrote');
    } else {
      row('sessionStorage.__ps_staff_session__', 'CLIENT CACHE', 'NOT_ESTABLISHED', null, 'no stored session');
    }
  } catch (e) {
    row('sessionStorage.__ps_staff_session__', 'CLIENT CACHE', 'READ_FAILED', null, String(e && e.message || e));
  }

  /*  ── ROW 2 · sessionMeta() — __psLive's IN-MEMORY view ─────────────── */
  const L = window.__psLive || null;
  try {
    if (L && typeof L.sessionMeta === 'function'){
      const m = L.sessionMeta();
      row('__psLive.sessionMeta()', 'CLIENT CACHE',
          (m && m.property_id) || 'NOT_ESTABLISHED', 'memory',
          'in-memory _sessionMeta; token not exposed by the sealed client');
    } else {
      row('__psLive.sessionMeta()', 'CLIENT CACHE', 'NOT_READABLE', null, '__psLive absent');
    }
  } catch (e) {
    row('__psLive.sessionMeta()', 'CLIENT CACHE', 'READ_FAILED', null, String(e && e.message || e));
  }

  /*  ── ROW 3 · _egAuthScope — the shell's confirmed-scope cache ──────── */
  try {
    const s = (typeof _egAuthScope !== 'undefined') ? _egAuthScope : NOT_READABLE;
    if (s === NOT_READABLE) row('_egAuthScope', 'CLIENT CACHE', 'NOT_READABLE', null, 'not in scope from console');
    else if (!s)            row('_egAuthScope', 'CLIENT CACHE', 'NOT_ESTABLISHED', null,
                                'NULL — switchProperty would take the PREVIEW path from here (index.html:29162)');
    else                    row('_egAuthScope.property_id', 'CLIENT CACHE',
                                s.property_id || 'NOT_ESTABLISHED', null,
                                'name=' + (s.property_name || 'NOT_ESTABLISHED'));
  } catch (e) {
    row('_egAuthScope', 'CLIENT CACHE', 'READ_FAILED', null, String(e && e.message || e));
  }

  /*  ── ROW 3b · the Class 1 enforcer's CONFIRMED scope ───────────────
   *  authoritative-property-context.js overwrites #appbarDeal from a
   *  MutationObserver, so in a signed-in session it — not
   *  crumbPropertyName() — is what put a name on the glass.
   *
   *  Its refreshFromServer() stamps _egAuthScope as confirmed BEFORE
   *  asking the server (line 327) and RETURNS that unverified value if
   *  verifySession() comes back not-ok (line 338), while applyScope()
   *  writes back into _egAuthScope. That loop has no server in it.
   *
   *  So this row against ROW 4 is the decisive comparison: a confirmed
   *  scope that disagrees with a live /operator/me is a scope the server
   *  never confirmed. See PROPERTY_IDENTITY_AUTHORITY_TRACE.md §4.4.  */
  let confirmedScopeProperty = null;
  try {
    const ctx = window.__psAuthoritativePropertyContext;
    if (ctx && typeof ctx.getConfirmedScope === 'function'){
      const cs = ctx.getConfirmedScope();
      confirmedScopeProperty = (cs && cs.property_id) || null;
      row('__psAuthoritativePropertyContext.getConfirmedScope()', 'CLIENT CACHE',
          confirmedScopeProperty || 'NOT_ESTABLISHED', null,
          'name=' + ((cs && cs.property_name) || 'NOT_ESTABLISHED') + ' — this is what wrote the wordmark');
    } else {
      row('__psAuthoritativePropertyContext', 'CLIENT CACHE', 'NOT_READABLE', null,
          'the Class 1 enforcer is not loaded on this page');
    }
  } catch (e) {
    row('__psAuthoritativePropertyContext', 'CLIENT CACHE', 'READ_FAILED', null, String(e && e.message || e));
  }

  /*  ── ROW 4 · verifySession() — /operator/me with the MEMORY token ──── */
  let memoryProperty = null;
  try {
    if (L && typeof L.verifySession === 'function'){
      const v = await L.verifySession();
      if (v && v.ok && v.property){
        memoryProperty = v.property.id || null;
        row('verifySession() → /operator/me', 'SERVER · memory token',
            memoryProperty || 'NOT_ESTABLISHED', 'memory',
            'name=' + (v.property.name || 'NOT_ESTABLISHED'));
      } else {
        row('verifySession() → /operator/me', 'SERVER · memory token', 'READ_FAILED', 'memory',
            'reason=' + ((v && v.reason) || 'unknown') + ' status=' + ((v && v.status) || '—'));
      }
    } else {
      row('verifySession()', 'SERVER · memory token', 'NOT_READABLE', null, '__psLive absent');
    }
  } catch (e) {
    row('verifySession()', 'SERVER · memory token', 'READ_FAILED', 'memory', String(e && e.message || e));
  }

  /*  ── ROWS 5-7 · the three server reads, ONE pass, STORAGE token ─────
   *  Fetched together and with a known token so they are comparable to
   *  each other. If these three disagree the server trace is wrong and
   *  hypothesis B is live again.  */
  async function serverRow(label, path, pick){
    if (!ORIGIN)     return row(label, 'SERVER · storage token', 'READ_FAILED', await fp(storageTok), 'no apiBase on the page');
    if (!storageTok) return row(label, 'SERVER · storage token', 'READ_FAILED', null, 'no stored token to present');
    let res;
    try {
      res = await fetch(ORIGIN + path, {
        method: 'GET',
        headers: { 'accept': 'application/json', 'x-staff-session': storageTok },
        credentials: 'omit', cache: 'no-store'
      });
    } catch (netErr){
      /*  A network failure is a fact about Spine, not about the property.  */
      return row(label, 'SERVER · storage token', 'READ_FAILED', await fp(storageTok), 'network: ' + String(netErr && netErr.message || netErr));
    }
    if (res.status === 401 || res.status === 403){
      return row(label, 'SERVER · storage token', 'READ_FAILED', await fp(storageTok),
                 'HTTP ' + res.status + ' — this token is revoked or unauthorized. THAT IS EVIDENCE, not an error.');
    }
    let body = null;
    try { body = await res.json(); }
    catch (e){ return row(label, 'SERVER · storage token', 'READ_FAILED', await fp(storageTok), 'unparseable body, HTTP ' + res.status); }
    if (!res.ok) return row(label, 'SERVER · storage token', 'READ_FAILED', await fp(storageTok), 'HTTP ' + res.status);
    let val;
    try { val = pick(body); } catch (e){ val = null; }
    row(label, 'SERVER · storage token', val || 'NOT_ESTABLISHED', await fp(storageTok), '');
  }

  await serverRow('/operator/me → property_id', '/operator/me',
                  b => b && b.property_id);
  await serverRow('/operator/properties → active_property_id', '/operator/properties',
                  b => b && b.active_property_id);
  await serverRow('/operator/rent-roll/units → property_id', '/operator/rent-roll/units',
                  b => (b && (b.property_id || (b.property && b.property.id))) || null);

  /*  ── ROW 8 · what the GLASS currently says ─────────────────────────── */
  try {
    const ad = document.getElementById('appbarDeal');
    row('app bar wordmark (#appbarDeal)', 'GLASS', (ad && ad.textContent.trim()) || 'NOT_ESTABLISHED', null,
        'via crumbPropertyName() — consults __OFFLINE_DEALS BEFORE _egAuthScope (index.html:12208)');
  } catch (e){ row('#appbarDeal', 'GLASS', 'READ_FAILED', null, String(e && e.message || e)); }
  try {
    const pk = document.getElementById('propPick');
    row("propPick.value (drives the __OFFLINE_DEALS lookup)", 'GLASS',
        (pk && pk.value) || 'NOT_ESTABLISHED', null,
        'SOLO_ID is the REAL Solo UUID, so a Solo session HITS the fixture lookup');
  } catch (e){ row('propPick', 'GLASS', 'READ_FAILED', null, String(e && e.message || e)); }

  /*  ── THE VERDICT LINE — computed, never eyeballed ──────────────────── */
  console.table(out);

  const serverVals = out
    .filter(r => r.kind === 'SERVER · storage token' && r.property && !/^(READ_FAILED|NOT_ESTABLISHED|NOT_READABLE)$/.test(r.property))
    .map(r => r.property);
  const distinctServer = [...new Set(serverVals)];
  const anyServerFailed = out.some(r => r.kind === 'SERVER · storage token' && r.property === 'READ_FAILED');

  console.log('%c── WHAT THIS TABLE ESTABLISHES ──', 'font-weight:bold');

  /*  A FAILED READER SUPPRESSES THE AGREEMENT VERDICT — it does not sit
   *  above it as a caveat.
   *
   *  The first version of this printed INCOMPLETE and then went on to
   *  print "Server rows AGREE" from whichever rows happened to return.
   *  A browser proof caught it. That is precisely the §40.7 failure this
   *  harness is supposed to embody: composite silence reading as health,
   *  with a warning line above it that a reader skims past.
   *
   *  Disagreement still reports through a failure — two endpoints that
   *  contradict each other under one token is a finding no missing third
   *  row can soften. Only AGREEMENT is withheld, because agreement is
   *  the claim that a missing reader could have refuted.  */
  if (anyServerFailed){
    console.log('INCOMPLETE — at least one server row did not return. Composite agreement is NOT health');
    console.log('             when a required reader failed (PHILOSOPHY §40.7). The agreement verdict is');
    console.log('             WITHHELD below, not merely caveated.');
  }
  if (distinctServer.length > 1){
    console.log('HYPOTHESIS B IS LIVE. Three endpoints, ONE token, ' + distinctServer.length + ' different properties:');
    console.log('   ', distinctServer.join('  vs  '));
    console.log('    The server trace in docs/PROPERTY_IDENTITY_AUTHORITY_TRACE.md §2 is WRONG. Start there.');
  } else if (distinctServer.length === 1 && !anyServerFailed){
    console.log('Server rows AGREE on ' + distinctServer[0] + ' under one token — consistent with the trace.');
    if (memoryProperty && memoryProperty !== distinctServer[0]){
      console.log('HYPOTHESIS A CONFIRMED. The MEMORY token resolves to ' + memoryProperty);
      console.log('    while the STORAGE token resolves to ' + distinctServer[0] + '. Two live session states');
      console.log('    in one tab. The divergence is client-side and it is across TIME, not across endpoints.');
    } else if (memoryProperty){
      console.log('Memory token and storage token agree (' + memoryProperty + ').');
      console.log('    The bad state is NOT reproduced right now — this table does not settle the blocker.');
      console.log('    Say that rather than treating agreement as the answer.');
    }
  } else if (!distinctServer.length && !anyServerFailed){
    console.log('NO SERVER ROW RETURNED A PROPERTY. Nothing is established.');
  } else {
    console.log('No verdict. ' + distinctServer.length + ' server row(s) returned a property and at least');
    console.log('    one did not. Re-run once the failing read recovers — a partial table cannot clear');
    console.log('    or confirm the blocker, and saying so is the honest result.');
  }
  /*  console.table renders; it does not return a readable string, and a
   *  console pipe captures the narration and drops the grid. The rows are
   *  the evidence, so they are also left somewhere they can be read,
   *  copied and asserted against.  */
  try { window.__psPropertyIdentityTable = out; } catch (_) {}
  /*  THE §4.4 CHECK. Independent of the token verdict — a confirmed scope
   *  can be stale whether or not the tokens diverged.  */
  if (confirmedScopeProperty && memoryProperty){
    if (confirmedScopeProperty !== memoryProperty){
      console.log('');
      console.log('§4.4 CONFIRMED. The enforcer is holding ' + confirmedScopeProperty);
      console.log('    while a live /operator/me says ' + memoryProperty + '. That scope was never');
      console.log('    confirmed by the server — refreshFromServer() promoted a stale _egAuthScope and');
      console.log('    kept it when verification did not come back ok. The wordmark is the stale side.');
    } else {
      console.log('');
      console.log('§4.4 not reproduced — the enforcer\'s confirmed scope matches a live /operator/me.');
      console.log('    That mechanism did not produce this state.');
    }
  }
  console.log('Copy the table above into the blocker receipt with the apiBase and the wall-clock time.');
  console.log('The rows are also on window.__psPropertyIdentityTable — JSON.stringify it to paste them.');
  return out;
})();
