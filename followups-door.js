/* ════════════════════════════════════════════════════════════════════════════
   PROPERTY SPINE — LIVE FOLLOW-UPS DOOR  (Release 3, app side)
   ────────────────────────────────────────────────────────────────────────────
   The operator surface for the 069 task queue: tour-follow-up ANCHORS and
   leasing-task SIBLINGS, read from the systems of record and acted on through
   the frozen conversion-obligation-closure capability.

   DOCTRINE THIS FILE OBEYS (do not soften):
   • This is a PROJECTION. It renders domain objects; it authors none. Every
     mutation is a POST to the live rail; the browser is never the truth.
   • The door exposes exactly five row actions:
        Complete · Reassign · Reopen · Change-due · Message (opens the conversation)
     Raw "Released" and "Missed" are NOT task buttons — closing a relationship
     is a separate deliberate lifecycle action, never a one-tap vanish.
   • Reopen renders ONLY when the server says reopenable:true. A dead button is
     a lie; the not-reopenable reason shows as a quiet disabled line instead.
   • Owner, owner_basis, anchor/sibling, and due_state come from the server as
     read — never recomputed here. Honest blank over confident wrong.
   • Shares the app session via window.__psLive. NO bootstrap, NO token, NO
     revoke — by construction. If there's no live session, the tile is inert
     and the offline drawer still answers.

   Mirrors the __psLeasing sealed-module pattern: one IIFE, one frozen surface
   window.__psFollowups = { mount, entryHTML, tileStatus, open }.
   ════════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── scoped styles, injected once. Property Spine system: Fraunces headers,
        Plex Sans body, Plex Mono labels, white ground, near-black ink, hairline
        rows (never nested cards), four restrained status colors. ── */
  function injectStyles(){
    if(typeof document==='undefined' || document.getElementById('r3fu-style')) return;
    var s=document.createElement('style'); s.id='r3fu-style';
    s.textContent = [
      ':root{--m-red:#b23b2e;--m-amber:#9a6b1f;--m-green:#1d6b54;--m-blue:#2a4a68}',
      '.r3fu-shell{color:#0b0b0b;font-family:"IBM Plex Sans",system-ui,sans-serif}',
      '.r3fu-head{padding:2px 0 14px;border-bottom:1px solid #e7e6e2;margin-bottom:14px}',
      '.r3fu-title{font-family:"Fraunces",Georgia,serif;font-size:30px;font-weight:560;letter-spacing:-.01em}',
      '.r3fu-sub{color:#666;font-size:13px;margin-top:4px;max-width:640px;line-height:1.45}',
      '.r3fu-chips{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}',
      '.r3fu-chip{border:1px solid #e5e4e0;border-radius:13px;padding:8px 12px;min-width:74px}',
      '.r3fu-chip b{display:block;font-size:22px;font-weight:330;line-height:1;font-family:"Fraunces",Georgia,serif}',
      '.r3fu-chip span{display:block;margin-top:4px;font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:#666;font-family:"IBM Plex Mono",monospace}',
      '.r3fu-chip.red b{color:var(--m-red)} .r3fu-chip.amber b{color:var(--m-amber)} .r3fu-chip.blue b{color:var(--m-blue)}',
      '.r3fu-group{margin-bottom:18px}',
      '.r3fu-group-h{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#555;padding:6px 0;border-bottom:1px solid #eee}',
      '.r3fu-group-h span{color:#999} .r3fu-group-h.red{color:var(--m-red)} .r3fu-group-h.amber{color:var(--m-amber)}',
      '.r3fu-row{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:14px 0;border-top:1px solid #f0efec}',
      '.r3fu-row:first-of-type{border-top:0}',
      '.r3fu-row-main{flex:1;min-width:0}',
      '.r3fu-row-top{display:flex;align-items:center;gap:8px}',
      '.r3fu-person{font-weight:600;font-size:15px}',
      '.r3fu-tag{font-family:"IBM Plex Mono",monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;padding:2px 7px;border-radius:20px;border:1px solid #ddd;color:#666}',
      '.r3fu-tag.anc{border-color:#cfe0d9;color:var(--m-green)} .r3fu-tag.sib{border-color:#d3ddea;color:var(--m-blue)}',
      '.r3fu-label{font-size:13px;color:#222;margin-top:3px;line-height:1.4}',
      '.r3fu-next{font-size:12px;color:var(--m-blue);margin-top:3px}',
      '.r3fu-meta{display:flex;gap:12px;margin-top:6px;font-size:12px;color:#777;flex-wrap:wrap}',
      '.r3fu-owner small{color:#999} .r3fu-owner em{color:var(--m-amber);font-style:normal}',
      '.r3fu-actions{display:flex;flex-direction:column;gap:6px;flex-shrink:0;align-items:stretch;min-width:120px}',
      '.r3fu-btn{appearance:none;border:1px solid #d4d3ce;background:#fff;border-radius:9px;padding:7px 12px;font-size:12px;cursor:pointer;color:#111;font-family:inherit;white-space:nowrap;transition:.14s ease}',
      '.r3fu-btn:hover{border-color:#999}',
      '.r3fu-btn.primary{background:#111;color:#fff;border-color:#111} .r3fu-btn.primary:hover{background:#000}',
      '.r3fu-btn.ghost{border-color:#e5e4e0;color:#555} .r3fu-btn.small{padding:5px 10px;font-size:11px}',
      '.r3fu-more{appearance:none;width:100%;border:1px dashed #d4d3ce;background:#fafaf8;border-radius:12px;padding:11px;font-size:12px;cursor:pointer;color:#555;margin:6px 0 18px;font-family:inherit}',
      '.r3fu-closed{margin-top:8px;border-top:1px solid #e7e6e2;padding-top:14px}',
      '.r3fu-closed-h,.r3fu-group-h span{font-family:"IBM Plex Mono",monospace}',
      '.r3fu-closed-h{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#555;margin-bottom:8px}',
      '.r3fu-closed-h span{color:#999;margin-left:4px}',
      '.r3fu-crow{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border-top:1px solid #f2f1ee}',
      '.r3fu-crow-top{font-size:13px;font-weight:600} .r3fu-crow-top small{font-weight:400;color:#888}',
      '.r3fu-crow-meta{font-size:11px;color:#999;margin-top:2px}',
      '.r3fu-crow-act{display:flex;align-items:center;gap:8px;flex-shrink:0}',
      '.r3fu-noreopen{font-size:11px;color:#aaa;font-style:italic}',
      '.r3fu-empty{color:#888;font-size:13px;padding:22px 0;text-align:center} .r3fu-empty.small{padding:10px 0}',
      '.r3fu-loading{color:#999;font-size:13px;padding:20px 0}',
      '.r3fu-err{background:#fbeeec;border:1px solid #e6ccc7;color:var(--m-red);border-radius:10px;padding:9px 12px;font-size:12px;margin:8px 0} .r3fu-err.small{padding:6px 10px}',
      '.r3fu-flash{background:#eef5f1;border:1px solid #cfe0d9;color:var(--m-green);border-radius:10px;padding:9px 12px;font-size:13px;margin-bottom:12px}',
      '.r3fu-scrim{position:fixed;inset:0;background:rgba(15,15,15,.34);display:flex;align-items:center;justify-content:center;z-index:9000;padding:20px}',
      '.r3fu-sheet{background:#fff;border-radius:18px;max-width:440px;width:100%;padding:22px;box-shadow:0 30px 80px rgba(0,0,0,.22)}',
      '.r3fu-sheet-h{font-family:"Fraunces",Georgia,serif;font-size:21px;font-weight:540;margin-bottom:10px}',
      '.r3fu-p{font-size:13px;color:#555;line-height:1.5;margin:0 0 14px}',
      '.r3fu-l{display:block;font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#777;margin:12px 0 5px}',
      '.r3fu-inp{width:100%;border:1px solid #d4d3ce;border-radius:9px;padding:9px 11px;font-size:13px;font-family:inherit;box-sizing:border-box}',
      'textarea.r3fu-inp{min-height:64px;resize:vertical}',
      '.r3fu-sheet-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}',
      '@media(max-width:640px){.r3fu-row{flex-direction:column}.r3fu-actions{flex-direction:row;flex-wrap:wrap;min-width:0}.r3fu-title{font-size:25px}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  if(typeof document!=='undefined'){ if(document.head) injectStyles(); else document.addEventListener('DOMContentLoaded', injectStyles); }

  // GET reads only — mutations go through the sealed named write methods.
  var RES = {
    queue:          'taskQueue',
    recentlyClosed: 'taskRecentlyClosed',
    eligibleStaff:  'eligibleStaff'
  };

  // ── small DOM + format helpers (self-contained; no reliance on app globals) ──
  function esc(s){ return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function el(html){ var d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }
  function live(){ return (typeof window!=='undefined' && window.__psLive) ? window.__psLive : null; }
  function hasSession(){ var L=live(); return !!(L && L.hasSession && L.hasSession()); }

  // Owner-basis → plain words. The server already resolved this through the ONE
  // canonical identity resolver; we only phrase it.
  var BASIS_WORDS = {
    eligible_assignment: 'eligible',
    eligibility_lapsed:  'eligibility lapsed',
    unassigned:          'unassigned'
  };
  // Reopen refusal codes → one honest line each (from assessReopenability).
  var REOPEN_REASON_WORDS = {
    NOT_TERMINAL:            'still open',
    REOPEN_WINDOW_EXPIRED:   'past the 72-hour recovery window',
    DOWNSTREAM_WORK_EXISTS:  'later work already happened',
    RELATIONSHIP_CLOSED:     'the conversation is closed',
    ALREADY_RECOVERED:       'already reopened once',
    DECISION_NOT_RECOVERABLE:'a decision, not reopenable',
    UNKNOWN:                 'not reopenable'
  };
  // resolution_basis choices for completing work you don't own (execute-vs-decide;
  // honest blank stays an option — the operator is never forced to invent one).
  var RESOLUTION_BASES = [
    ['',                     '— (I own this task)'],
    ['coverage',             'Covering for the owner'],
    ['manager_intervention', 'Manager stepped in'],
    ['completed_together',   'Done together'],
    ['no_longer_needed',     'No longer needed'],
    ['unassigned_pickup',    'Picked up (unassigned)']
  ];

  function fmtDue(due_at, due_state){
    if(!due_at) return 'no due time';
    var t = Date.parse(due_at); if(isNaN(t)) return esc(due_state||'');
    var d = new Date(t);
    var day = d.toLocaleDateString(undefined,{month:'short',day:'numeric'});
    var tm  = d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
    return day + ' · ' + tm;
  }
  function relClosed(closed_at){
    if(!closed_at) return '';
    var t=Date.parse(closed_at); if(isNaN(t)) return '';
    var mins=Math.round((Date.now()-t)/60000);
    if(mins<60) return mins+'m ago';
    var hrs=Math.round(mins/60); if(hrs<48) return hrs+'h ago';
    return Math.round(hrs/24)+'d ago';
  }
  // datetime-local <-> ISO
  function toLocalInputValue(iso){
    var t = iso?Date.parse(iso):Date.now(); var d=new Date(isNaN(t)?Date.now():t);
    d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
    return d.toISOString().slice(0,16);
  }
  function localInputToISO(v){ if(!v) return null; var t=Date.parse(v); return isNaN(t)?null:new Date(t).toISOString(); }
  function uid(){ return 'r3_'+Date.now()+'_'+Math.random().toString(36).slice(2,8); }

  /* ─────────────────────────── the controller ─────────────────────────── */
  function makeController(){
    var rootEl = null;
    var state = {
      loading:false, err:null,
      counts:null, items:[], next_cursor:null, receipt:'',
      closed:null, closedReceipt:'', closedErr:null,
      staff:null,          // eligible-staff cache for the reassign picker
      panel:null           // {kind, row} for an open action panel, or null
    };

    function rebindRoot(node){ rootEl = node; }

    async function loadResource(name, params){
      var L=live(); if(!L) throw new Error('live loader unavailable');
      var out = await L.loadResource(name, params||{});
      return (out && out.data) ? out.data : out;  // unwrap { data, meta }
    }

    async function refresh(){
      if(!hasSession()){ render(); return; }
      state.loading=true; state.err=null; render();
      try{
        var r = await loadResource(RES.queue, {});
        state.counts = r.counts || null;
        state.items  = Array.isArray(r.items) ? r.items : [];
        state.next_cursor = r.next_cursor || null;
        state.receipt = r.receipt || '';
      }catch(e){ state.err = (e && e.message) || 'Could not load the queue.'; }
      state.loading=false; render();
      // recently-closed loads alongside but never blocks the queue paint
      loadClosed();
    }

    async function loadMore(){
      if(!state.next_cursor || !hasSession()) return;
      try{
        // the queue resource path builder takes a raw cursor param
        var r = await loadResource(RES.queue, { cursor: state.next_cursor });
        state.items = state.items.concat(Array.isArray(r.items)?r.items:[]);
        state.next_cursor = r.next_cursor || null;
        state.counts = r.counts || state.counts;
      }catch(e){ state.err=(e&&e.message)||'Could not load more.'; }
      render();
    }

    async function loadClosed(){
      if(!hasSession()) return;
      try{
        var r = await loadResource(RES.recentlyClosed, {});
        state.closed = Array.isArray(r.items)?r.items:[];
        state.closedReceipt = r.receipt || '';
        state.closedErr=null;
      }catch(e){ state.closedErr=(e&&e.message)||'Could not load recently closed.'; }
      render();
    }

    async function ensureStaff(){
      if(state.staff) return state.staff;
      try{
        var r = await loadResource(RES.eligibleStaff, {});
        // tolerate {staff:[...]} or a bare array
        state.staff = Array.isArray(r) ? r : (r && r.staff) ? r.staff : (r && r.items) ? r.items : [];
      }catch(e){ state.staff = []; }
      return state.staff;
    }

    // ── action panel open/close ──
    function openPanel(kind, obligationId){
      var row = state.items.filter(function(x){return x.obligation_id===obligationId;})[0]
             || (state.closed||[]).filter(function(x){return x.obligation_id===obligationId;})[0];
      if(!row) return;
      state.panel = { kind:kind, row:row, busy:false, err:null };
      if(kind==='reassign'){ ensureStaff().then(render); }
      render();
    }
    function closePanel(){ state.panel=null; render(); }

    // ── the four mutations — through the sealed NAMED write methods on __psLive
    //    (the loader is GET-only; these are the obligation-keyed allow-list verbs).
    //    Each returns { data, meta }; we surface data as the receipt source. ──
    async function doResolve(obligationId, fields){ return write('resolveTask', obligationId, fields); }
    async function doReassign(obligationId, fields){ return write('reassignTask', obligationId, fields); }
    async function doReopen(obligationId, fields){ return write('reopenTask', obligationId, fields); }
    async function doChangeDue(obligationId, fields){ return write('changeDueTask', obligationId, fields); }

    async function write(method, obligationId, fields){
      var L=live(); if(!L || typeof L[method]!=='function') throw new Error('live write "'+method+'" unavailable');
      var params = Object.assign({ obligationId:obligationId }, fields||{});
      var out = await L[method](params);
      return (out && out.data) ? out.data : out;  // unwrap { data, meta }
    }

    // A submit wrapper: run the POST, show the receipt, refresh the board.
    async function submit(fn, panelRef){
      if(!state.panel) return;
      state.panel.busy=true; state.panel.err=null; render();
      try{
        var out = await fn();
        var receipt = (out && (out.receipt || out.message)) || 'Done.';
        state.panel=null;
        state.flash = receipt;
        await refresh();
        // clear the flash after paint
        setTimeout(function(){ state.flash=null; render(); }, 6000);
      }catch(e){
        state.panel.busy=false;
        state.panel.err = (e && (e.publicMessage||e.message)) || 'That did not go through.';
        render();
      }
    }

    /* ─────────────────────────── rendering ─────────────────────────── */
    function render(){
      if(!rootEl) return;
      if(!hasSession()){
        rootEl.innerHTML = ''+
          '<div class="r3fu-shell">'+
            '<div class="r3fu-empty">Live follow-ups are not connected in this view.</div>'+
          '</div>';
        return;
      }
      // S3/S4 markers (contract 6): machine-checkable state on the surface root.
      var psState = state.err ? 'unavailable'
                  : (state.loading && !state.items.length) ? 'loading'
                  : (state.items.length ? 'data' : 'empty');
      var h = '<div class="r3fu-shell" data-ps-source="live" data-ps-state="'+psState+'">';
      if(state.err){
        // RULING 1: a failed live refresh suppresses ALL operational content --
        // no counts, no queue rows, no Recently-Closed, no mutation controls. A
        // stale task may have been resolved/reassigned/reopened since the last
        // read; in this product that is potentially WRONG OWNERSHIP, not mere
        // visual staleness. Unavailable copy + Retry only.
        h += '<div class="r3fu-err">Follow-Ups are unavailable right now: '+esc(state.err)+
             ' <button class="r3fu-btn small" data-act="retryQueue">Retry</button></div>';
        h += '</div>';
        rootEl.innerHTML = h;
        bind();
        return;
      }
      h += header();
      if(state.flash){ h += '<div class="r3fu-flash">'+esc(state.flash)+'</div>'; }
      if(state.loading && !state.items.length){ h += '<div class="r3fu-loading">Loading follow-ups…</div>'; }
      else { h += queueGroups(); }
      if(state.next_cursor){ h += '<button class="r3fu-more" data-act="more">Load more</button>'; }
      h += closedSection();
      h += '</div>';
      rootEl.innerHTML = h;
      if(state.panel) rootEl.appendChild(panelSheet());
      bind();
    }

    function header(){
      var c = state.counts || {};
      var chip = function(n,label,cls){
        return '<div class="r3fu-chip '+(cls||'')+'"><b>'+esc(n==null?'—':n)+'</b><span>'+esc(label)+'</span></div>';
      };
      // No title here — the page shell (leasingHeader) already renders the
      // "Follow-Ups" heading and subtitle. Repeating it double-headers the page.
      return ''+
        '<div class="r3fu-head">'+
          '<div class="r3fu-chips">'+
            chip(c.open,'open','')+
            chip(c.overdue,'overdue', Number(c.overdue)>0?'red':'')+
            chip(c.due_today,'due today', Number(c.due_today)>0?'amber':'')+
            chip(c.unassigned,'unassigned', Number(c.unassigned)>0?'blue':'')+
          '</div>'+
        '</div>';
    }

    // GROUP BY URGENCY: overdue → today → upcoming → none
    var GROUPS = [
      ['overdue',  'Overdue',  'red'],
      ['today',    'Due today','amber'],
      ['upcoming', 'Upcoming', ''],
      ['none',     'No due time', '']
    ];
    function queueGroups(){
      if(!state.items.length){
        return '<div class="r3fu-empty">Nothing open. Every follow-up is handled.</div>';
      }
      var out='';
      GROUPS.forEach(function(g){
        var rows = state.items.filter(function(r){ return (r.due_state||'none')===g[0]; });
        if(!rows.length) return;
        out += '<div class="r3fu-group">'+
                 '<div class="r3fu-group-h '+(g[2]||'')+'">'+esc(g[1])+' <span>'+rows.length+'</span></div>'+
                 rows.map(taskRow).join('')+
               '</div>';
      });
      return out;
    }

    function taskRow(r){
      var basis = BASIS_WORDS[r.owner_basis] || r.owner_basis || '';
      var owner = r.owner_name
        ? esc(r.owner_name)+' <small>· '+esc(basis)+'</small>'
        : '<em>Unassigned</em>';
      var kindTag = r.anchor_or_sibling==='sibling'
        ? '<span class="r3fu-tag sib">task</span>'
        : '<span class="r3fu-tag anc">follow-up</span>';
      var next = r.next_move_label ? '<div class="r3fu-next">Next: '+esc(r.next_move_label)+'</div>' : '';
      return ''+
        '<div class="r3fu-row" data-oid="'+esc(r.obligation_id)+'">'+
          '<div class="r3fu-row-main">'+
            '<div class="r3fu-row-top">'+
              '<span class="r3fu-person">'+esc(r.person_name||'—')+'</span>'+ kindTag +
            '</div>'+
            '<div class="r3fu-label">'+esc(r.label||'Follow up')+'</div>'+
            next +
            '<div class="r3fu-meta">'+
              '<span class="r3fu-owner">'+owner+'</span>'+
              '<span class="r3fu-due">'+esc(fmtDue(r.due_at, r.due_state))+'</span>'+
            '</div>'+
          '</div>'+
          '<div class="r3fu-actions">'+
            '<button class="r3fu-btn primary" data-act="complete" data-oid="'+esc(r.obligation_id)+'">Complete</button>'+
            '<button class="r3fu-btn" data-act="reassign"  data-oid="'+esc(r.obligation_id)+'">Reassign</button>'+
            '<button class="r3fu-btn" data-act="changeDue" data-oid="'+esc(r.obligation_id)+'">Change time</button>'+
            (r.person_id ? '<button class="r3fu-btn ghost" data-act="card" data-pid="'+esc(r.person_id)+'" data-pname="'+esc(r.person_name||'')+'">Message</button>' : '')+
          '</div>'+
        '</div>';
    }

    function closedSection(){
      var rows = state.closed;
      if(rows==null) return ''; // not loaded yet — stay quiet
      var body;
      if(state.closedErr){
        // RULING (composite proof): Recently-Closed fails INDEPENDENTLY of the
        // open queue. Its own unavailable + retry; no stale closed rows remain
        // (body is the error, not the rows); recovery re-reads ONLY
        // taskRecentlyClosed via loadClosed().
        body = '<div class="r3fu-err small" data-ps-source="live" data-ps-state="unavailable">Recently Closed is unavailable right now: '+esc(state.closedErr)+
               ' <button class="r3fu-btn small" data-act="retryClosed">Retry</button></div>';
      }
      else if(!rows.length){ body = '<div class="r3fu-empty small" data-ps-source="live" data-ps-state="empty">Nothing closed in the last 72 hours.</div>'; }
      else {
        body = rows.map(function(r){
          var who = r.closed_by_name ? esc(r.closed_by_name) : 'system';
          var reopenCtl = r.reopenable
            ? '<button class="r3fu-btn small" data-act="reopen" data-oid="'+esc(r.obligation_id)+'">Reopen</button>'
            : '<span class="r3fu-noreopen">can\u2019t reopen — '+esc(REOPEN_REASON_WORDS[r.not_reopenable_reason]||REOPEN_REASON_WORDS.UNKNOWN)+'</span>';
          return ''+
            '<div class="r3fu-crow">'+
              '<div class="r3fu-crow-main">'+
                '<div class="r3fu-crow-top">'+esc(r.person_name||'—')+' <small>'+esc(r.label||'')+'</small></div>'+
                '<div class="r3fu-crow-meta">'+esc(r.resolution||'closed')+' · '+who+' · '+esc(relClosed(r.closed_at))+'</div>'+
              '</div>'+
              '<div class="r3fu-crow-act">'+ reopenCtl +
                (r.person_id ? ' <button class="r3fu-btn ghost small" data-act="card" data-pid="'+esc(r.person_id)+'" data-pname="'+esc(r.person_name||'')+'">Message</button>' : '')+
              '</div>'+
            '</div>';
        }).join('');
      }
      return ''+
        '<div class="r3fu-closed">'+
          '<div class="r3fu-closed-h">Recently closed <span>72h</span></div>'+
          body +
        '</div>';
    }

    /* ─── the action sheet (Complete / Reassign / Change-due / Reopen) ─── */
    function panelSheet(){
      var p = state.panel, r = p.row;
      var title, body;
      if(p.kind==='complete'){
        title = 'Complete follow-up';
        var opts = RESOLUTION_BASES.map(function(b){ return '<option value="'+b[0]+'">'+esc(b[1])+'</option>'; }).join('');
        body = ''+
          '<p class="r3fu-p">Marking <b>'+esc(r.label||'this follow-up')+'</b> for '+esc(r.person_name||'—')+' as done.</p>'+
          '<label class="r3fu-l">If you\u2019re closing work you don\u2019t own, say why</label>'+
          '<select id="r3fuBasis" class="r3fu-inp">'+opts+'</select>'+
          '<label class="r3fu-l">Proof / note (optional)</label>'+
          '<textarea id="r3fuProof" class="r3fu-inp" placeholder="What happened."></textarea>';
      } else if(p.kind==='reassign'){
        title = 'Reassign this task';
        var staff = state.staff||[];
        var sopts = '<option value="">— pick a person —</option>' + staff.map(function(s){
          var id = s.user_id||s.id; var nm = s.name||s.display_name||id;
          return '<option value="'+esc(id)+'">'+esc(nm)+'</option>';
        }).join('');
        body = ''+
          '<p class="r3fu-p">Only the task moves. The conversation\u2019s ownership is untouched.</p>'+
          '<label class="r3fu-l">Assign to</label>'+
          '<select id="r3fuTo" class="r3fu-inp">'+sopts+'</select>'+
          (staff.length?'':'<div class="r3fu-err small">No eligible staff returned for this property.</div>')+
          '<label class="r3fu-l">Reason</label>'+
          '<input id="r3fuReason" class="r3fu-inp" placeholder="Why the handoff.">';
      } else if(p.kind==='changeDue'){
        title = 'Change follow-up time';
        body = ''+
          '<p class="r3fu-p">This moves when the follow-up is due. It does not close it, and the owner stays the same. (Not a tour reschedule.)</p>'+
          '<label class="r3fu-l">New due time</label>'+
          '<input id="r3fuDue" class="r3fu-inp" type="datetime-local" value="'+esc(toLocalInputValue(r.due_at))+'">'+
          '<label class="r3fu-l">Reason</label>'+
          '<input id="r3fuReason" class="r3fu-inp" placeholder="Why the time changed.">';
      } else if(p.kind==='reopen'){
        title = 'Reopen this task';
        body = ''+
          '<p class="r3fu-p">Deliberate recovery of a closed follow-up. The prior close stays in the record. A new due time is required; a lapsed owner comes back unassigned.</p>'+
          '<label class="r3fu-l">New due time</label>'+
          '<input id="r3fuDue" class="r3fu-inp" type="datetime-local" value="'+esc(toLocalInputValue(null))+'">'+
          '<label class="r3fu-l">Reason</label>'+
          '<input id="r3fuReason" class="r3fu-inp" placeholder="Why it\u2019s being reopened.">';
      }
      var errHtml = p.err ? '<div class="r3fu-err">'+esc(p.err)+'</div>' : '';
      var busy = p.busy ? ' disabled' : '';
      var node = el(''+
        '<div class="r3fu-scrim" data-act="scrim">'+
          '<div class="r3fu-sheet" role="dialog" aria-modal="true">'+
            '<div class="r3fu-sheet-h">'+esc(title)+'</div>'+
            body + errHtml +
            '<div class="r3fu-sheet-actions">'+
              '<button class="r3fu-btn ghost" data-act="cancel">Cancel</button>'+
              '<button class="r3fu-btn primary" data-act="confirm"'+busy+'>'+(p.busy?'Working…':'Confirm')+'</button>'+
            '</div>'+
          '</div>'+
        '</div>');
      return node;
    }

    /* ─────────────────────────── event binding ─────────────────────────── */
    function bind(){
      if(!rootEl) return;
      rootEl.querySelectorAll('[data-act]').forEach(function(node){
        var act = node.getAttribute('data-act');
        node.onclick = function(ev){
          ev.preventDefault();
          if(act==='more'){ loadMore(); return; }
          if(act==='retryQueue'){ refresh(); return; }
          if(act==='retryClosed'){ loadClosed(); return; }
          if(act==='card'){ openCard(node.getAttribute('data-pid'), node.getAttribute('data-pname')); return; }
          if(act==='complete'||act==='reassign'||act==='changeDue'||act==='reopen'){
            openPanel(act, node.getAttribute('data-oid')); return;
          }
        };
      });
      // panel controls are on the appended scrim
      var scrim = rootEl.querySelector('.r3fu-scrim');
      if(scrim){
        scrim.querySelectorAll('[data-act]').forEach(function(node){
          var act=node.getAttribute('data-act');
          node.onclick=function(ev){
            ev.preventDefault();
            if(act==='cancel'||act==='scrim'){ if(ev.target===scrim || act==='cancel') closePanel(); return; }
            if(act==='confirm'){ confirmPanel(); return; }
          };
        });
      }
    }

    function confirmPanel(){
      var p=state.panel; if(!p) return; var r=p.row; var oid=r.obligation_id;
      if(p.kind==='complete'){
        var basis = (rootEl.querySelector('#r3fuBasis')||{}).value || null;
        var proof = (rootEl.querySelector('#r3fuProof')||{}).value || null;
        submit(function(){ return doResolve(oid, { result:'completed', proof:proof, resolution_basis:basis||null }); });
      } else if(p.kind==='reassign'){
        var to = (rootEl.querySelector('#r3fuTo')||{}).value || null;
        var reason = (rootEl.querySelector('#r3fuReason')||{}).value || null;
        if(!to){ p.err='Pick who it goes to.'; render(); return; }
        submit(function(){ return doReassign(oid, { to_user_id:to, reason:reason, idempotency_key:uid() }); });
      } else if(p.kind==='changeDue'){
        var due = localInputToISO((rootEl.querySelector('#r3fuDue')||{}).value);
        var reason2 = (rootEl.querySelector('#r3fuReason')||{}).value || null;
        if(!due){ p.err='Pick a new time.'; render(); return; }
        submit(function(){ return doChangeDue(oid, { new_due_at:due, reason:reason2, idempotency_key:uid() }); });
      } else if(p.kind==='reopen'){
        var due2 = localInputToISO((rootEl.querySelector('#r3fuDue')||{}).value);
        var reason3 = (rootEl.querySelector('#r3fuReason')||{}).value || null;
        if(!due2){ p.err='A reopened task needs a new due time.'; render(); return; }
        submit(function(){ return doReopen(oid, { new_due_at:due2, reason:reason3, idempotency_key:uid() }); });
      }
    }

    // Hand person-card opening back to the app if it exposes a hook; otherwise
    // no-op gracefully (never throw inside the door).
    // A follow-up IS a communication commitment. Opening it lands directly on
    // the CONVERSATION thread (context:'communications' → the card's
    // Communication tab, where the message is read and sent), not a profile.
    function openCard(pid, personName){
      if(!pid) return;
      try{
        if(typeof window.openPersonCard==='function'){
          window.openPersonCard({ person_id:pid, name:personName||null, context:'communications' });
          return;
        }
        if(typeof window.openPersonCardById==='function'){ window.openPersonCardById(pid); return; }
      }catch(e){}
    }

    function mount(node){
      rebindRoot(node || (rootEl || document.getElementById('psFollowupsEntry')));
      render();
      refresh();
    }

    function tileStatus(){
      if(!hasSession()) return { enabled:false, connected:false, open:0, overdue:0 };
      var c = state.counts || {};
      return { enabled:true, connected:true,
               open:Number(c.open||0), overdue:Number(c.overdue||0),
               unassigned:Number(c.unassigned||0) };
    }

    return { mount:mount, rebindRoot:rebindRoot, tileStatus:tileStatus, refresh:refresh, _state:function(){return state;} };
  }

  /* ─────────────── one controller across rerenders (idempotent) ─────────────── */
  var _ctl = null;
  function ensureController(){ if(!_ctl) _ctl = makeController(); return _ctl; }

  function entryHTML(){
    return '<div id="psFollowupsEntry" class="r3fu-lane" data-psfu="1"></div>';
  }
  function mount(rootEl){
    if(!rootEl) rootEl = document.getElementById('psFollowupsEntry');
    if(!rootEl) return;
    if(!hasSession()){
      rootEl.innerHTML = '<div class="r3fu-shell"><div class="r3fu-empty">Live follow-ups are not connected in this view.</div></div>';
      return;
    }
    ensureController().mount(rootEl);
  }
  function tileStatus(){
    try{ return ensureController().tileStatus(); }
    catch(e){ return { enabled:false, connected:false, open:0, overdue:0 }; }
  }
  // Property-switch teardown hook: drop the controller so the next property
  // starts clean (mirrors __resetPropertyScopedState clearing sealed state).
  function reset(){ _ctl = null; }

  if(typeof window!=='undefined'){
    var surface = Object.freeze({
      mount: mount,
      entryHTML: entryHTML,
      tileStatus: tileStatus,
      reset: reset
    });
    Object.defineProperty(window, '__psFollowups', {
      value: surface, writable:false, configurable:false, enumerable:true
    });
  }

  // Headless export for the smoke harness (factory + helpers only; no window).
  if(typeof module!=='undefined' && module.exports){
    module.exports = {
      makeController: makeController,
      _helpers: { esc:esc, fmtDue:fmtDue, relClosed:relClosed, localInputToISO:localInputToISO, toLocalInputValue:toLocalInputValue,
                  BASIS_WORDS:BASIS_WORDS, REOPEN_REASON_WORDS:REOPEN_REASON_WORDS, RESOLUTION_BASES:RESOLUTION_BASES, GROUPS_ORDER:['overdue','today','upcoming','none'] }
    };
  }
})();
