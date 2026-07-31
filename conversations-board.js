/* PROPERTY SPINE — CONVERSATIONS CONTROL BOARD v1
 *
 * Reads the server-authored conversation operating projection and renders:
 *   Needs attention · AI handling · No response
 * with Recently closed as a quiet receipt.
 *
 * It performs no operating write. Open delegates to the existing governed
 * conversation workspace. Person names open the canonical Person × Property Card.
 */
(function(){
  'use strict';

  if(typeof window==='undefined' || window.__psConversationsBoardV1) return;
  window.__psConversationsBoardV1={version:'1.0.0'};

  var ACTIVE=['needs_attention','ai_handling','no_response'];
  var META={
    needs_attention:{title:'Needs attention',cue:'Human judgment',desc:'A person must review, decide, or take responsibility before the conversation can continue.',empty:'No conversations need human attention.'},
    ai_handling:{title:'AI handling',cue:'AI is continuing',desc:'AI remains in control and no operator action is required right now.',empty:'AI is not actively handling any conversations.'},
    no_response:{title:'No response',cue:'Outreach delivered',desc:'Outreach was delivered, but the prospect has not replied.',empty:'No contacted prospects are currently waiting on a first reply.'}
  };
  var REASON_COPY={
    human_owned:'A person has taken control of this conversation.',
    draft_requires_review:'AI prepared a reply that needs human review.',
    cadence_exhausted_pending_human:'The outreach cadence is exhausted and needs a human decision.',
    human_attention_required:'A human decision is required before the conversation continues.',
    outreach_not_started:'No valid outreach has been delivered yet.',
    delivery_failed_or_unconfirmed:'The last outreach did not confirm delivery.',
    delivered_no_inbound_reply:'Outreach was delivered, but the prospect has not replied.',
    ai_preparing_reply:'AI is preparing the next reply.',
    ai_waiting_on_prospect:'AI is waiting for the prospect to respond.',
    ai_active:'AI is handling this conversation.'
  };
  var REASON_BADGE={
    human_owned:'Human owned',draft_requires_review:'Approval needed',cadence_exhausted_pending_human:'Cadence exhausted',
    human_attention_required:'Needs attention',outreach_not_started:'Outreach needed',delivery_failed_or_unconfirmed:'Delivery issue',
    delivered_no_inbound_reply:'No response',ai_preparing_reply:'AI working',ai_waiting_on_prospect:'Waiting on prospect',ai_active:'AI control'
  };

  var state={host:null,legacy:null,active:null,closed:null,loading:false,closedLoading:false,error:null,closedError:null,bucket:'needs_attention',touched:false,closedOpen:false,flash:null};
  var observer=null, visibilityHandler=null;

  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function unwrap(v){return v&&v.data!==undefined?v.data:v;}
  function live(){return window.__psLive||null;}
  function hasSession(){try{var L=live();return !!(L&&L.hasSession&&L.hasSession());}catch(_){return false;}}
  function countMap(data){var c=data&&data.counts&&data.counts.operating_buckets;return c&&typeof c==='object'?c:null;}
  function rows(data){return data&&Array.isArray(data.conversations)?data.conversations:[];}
  /* cssEscape went with the legacy DOM probe — it existed only to build the
   * selectors that probe used. Nothing else called it. */

  function injectStyle(){
    if(document.getElementById('ps-conversations-board-v1-style')) return;
    var s=document.createElement('style');s.id='ps-conversations-board-v1-style';
    s.textContent=[
      ':root{--pscb-ink:#161512;--pscb-muted:#706b62;--pscb-faint:#9d978d;--pscb-line:#dad6ce;--pscb-soft:#eeebe4;--pscb-paper:#fff;--pscb-warm:#faf8f3;--pscb-green:#245f4b;--pscb-red:#9e3b31;--pscb-amber:#91651e;--pscb-blue:#486d7b}',
      '[data-pscb-legacy="1"]{display:none!important}',
      /* The leasing-experience layer also paints a page-level Conversations
         header and subtitle outside .lconv-page, so hiding the legacy body
         alone left the title printed twice. This board owns the header.

         .psx-conv-page-title is hidden EXPLICITLY, not just via its wrapper.
         That layer only tags the wrapper .psx-conv-page-head when it can walk
         up to a parent still containing the old subtitle copy ("supervise the
         ai agent" / "ai handles first contact"). This board replaced that
         subtitle, so the walk finds nothing, the wrapper is never tagged, and
         the heading survived — printing CONVERSATIONS twice. Hiding the
         element itself does not depend on that walk succeeding. */
      '.psx-conv-page-head,.psx-conv-page-sub,.psx-conv-page-title{display:none!important}',
      '.pscb{width:min(100%,960px);margin-inline:auto;color:var(--pscb-ink);font-family:"IBM Plex Sans",system-ui,sans-serif}.pscb *{box-sizing:border-box}',
      '.pscb-head{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;padding:8px 2px 23px}.pscb-eyebrow{font:600 9px/1.2 "IBM Plex Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--pscb-green)}',
      '.pscb-title{margin:8px 0 0;font-family:"Fraunces",Georgia,serif;font-size:43px;font-weight:500;letter-spacing:-.05em;line-height:.97}.pscb-sub{max-width:570px;margin-top:9px;font-size:12.5px;line-height:1.5;color:var(--pscb-muted)}',
      '.pscb-total{display:flex;align-items:baseline;gap:7px;padding-bottom:2px;white-space:nowrap;color:var(--pscb-muted)}.pscb-total strong{font-family:"Fraunces",Georgia,serif;font-size:30px;font-weight:500;letter-spacing:-.04em;color:var(--pscb-ink)}.pscb-total span{font-size:10.5px}',
      '.pscb-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--pscb-line);border-bottom:1px solid var(--pscb-line)}',
      '.pscb-tab{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:11px;align-items:center;min-height:72px;appearance:none;border:0;border-left:1px solid var(--pscb-soft);background:transparent;padding:12px 16px;color:var(--pscb-muted);text-align:left;cursor:pointer}.pscb-tab:first-child{border-left:0}.pscb-tab:after{content:"";position:absolute;left:15px;right:15px;bottom:-1px;height:2px;background:transparent}',
      '.pscb-tab:hover{background:rgba(255,255,255,.48)}.pscb-tab.active{color:var(--pscb-ink);background:#fff}.pscb-tab.active:after{background:var(--pscb-ink)}.pscb-tab-copy{display:grid;gap:4px;min-width:0}.pscb-tab-title{font-size:13px;font-weight:650;line-height:1.2}.pscb-tab-cue{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--pscb-faint)}',
      '.pscb-tab-count{display:flex;align-items:center;justify-content:center;min-width:28px;height:28px;border:1px solid var(--pscb-line);border-radius:999px;background:#fff;font:500 15px/1 "Fraunces",Georgia,serif;color:var(--pscb-muted)}.pscb-tab.active .pscb-tab-count{border-color:var(--pscb-ink);background:var(--pscb-ink);color:#fff}.pscb-tab:focus-visible{outline:2px solid var(--pscb-ink);outline-offset:-4px}',
      '.pscb-panel{margin-top:15px;border:1px solid var(--pscb-line);border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 14px 36px rgba(28,24,17,.045)}.pscb-panel-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 18px;border-bottom:1px solid var(--pscb-soft);background:var(--pscb-warm)}.pscb-panel-desc{max-width:650px;font-size:11.5px;line-height:1.45;color:var(--pscb-muted)}.pscb-panel-count{font:600 8.5px/1.2 "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--pscb-faint);white-space:nowrap}',
      '.pscb-list{padding:0 18px}.pscb-empty,.pscb-loading{padding:24px 1px;font-size:12px;line-height:1.5;color:var(--pscb-faint)}.pscb-error{margin-top:14px;border:1px solid #e3c1bb;border-radius:14px;background:#fff8f6;padding:13px 14px;color:var(--pscb-red);font-size:12px;line-height:1.5}',
      '.pscb-row{display:grid;grid-template-columns:7px minmax(0,1fr) auto;gap:15px;align-items:center;padding:17px 0;border-top:1px solid var(--pscb-soft)}.pscb-row:first-child{border-top:0}.pscb-row:before{content:"";width:6px;height:6px;border-radius:999px;background:#c7c2b9;align-self:start;margin-top:7px}.pscb-row.attention:before{background:var(--pscb-amber)}.pscb-row.human:before{background:var(--pscb-red)}.pscb-row.ai:before{background:var(--pscb-green)}.pscb-row.noresponse:before{background:var(--pscb-blue)}',
      '.pscb-main{min-width:0}.pscb-top{display:flex;align-items:baseline;gap:9px;min-width:0}.pscb-person{appearance:none;border:0;border-bottom:1px solid rgba(22,21,18,.24);background:transparent;padding:0;margin:0;color:inherit;font-size:14.5px;font-weight:650;line-height:1.25;text-align:left;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pscb-person:hover{border-bottom-color:var(--pscb-ink)}.pscb-person:focus-visible{outline:2px solid var(--pscb-ink);outline-offset:3px;border-bottom-color:transparent;border-radius:2px}.pscb-person.plain{border-bottom:0;cursor:default}',
      '.pscb-sentence{margin-top:5px;font-size:12.5px;line-height:1.42;color:#403d37}.pscb-meta{display:flex;gap:6px 12px;flex-wrap:wrap;align-items:center;margin-top:8px;font-size:10.5px;color:var(--pscb-faint)}.pscb-badge{display:inline-flex;align-items:center;min-height:21px;border:1px solid var(--pscb-line);border-radius:999px;padding:0 7px;background:#fff;font:600 7.5px/1 "IBM Plex Mono",monospace;letter-spacing:.05em;text-transform:uppercase;color:var(--pscb-muted)}.pscb-badge.attn{border-color:#dbc28f;background:#fffaf0;color:var(--pscb-amber)}.pscb-badge.human{border-color:#e3c1bb;background:#fff8f6;color:var(--pscb-red)}.pscb-badge.ai{border-color:#c9d8d1;background:#f7faf8;color:var(--pscb-green)}.pscb-badge.noresponse{border-color:#c7d6dc;background:#f5f9fa;color:var(--pscb-blue)}',
      '.pscb-actions{display:flex;align-items:center;justify-content:flex-end}.pscb-btn{appearance:none;min-height:38px;border:1px solid var(--pscb-ink);border-radius:11px;background:var(--pscb-ink);padding:9px 14px;color:#fff;font:600 10.5px/1.2 "IBM Plex Sans",sans-serif;cursor:pointer}.pscb-btn:hover{background:#2c2925}.pscb-btn:focus-visible,.pscb-retry:focus-visible{outline:2px solid var(--pscb-ink);outline-offset:3px}',
      '.pscb-flash{margin:8px 0 14px;border:1px solid #e3c1bb;border-radius:12px;background:#fff8f6;padding:10px 12px;color:var(--pscb-red);font-size:11.5px}.pscb-retry{appearance:none;margin-left:8px;border:1px solid var(--pscb-line);border-radius:8px;background:#fff;padding:6px 9px;color:var(--pscb-ink);font:600 9px/1.2 "IBM Plex Sans",sans-serif;cursor:pointer}',
      '.pscb-closed{margin-top:15px;border:0;border-top:1px solid var(--pscb-line)}.pscb-closed>summary{display:flex;align-items:center;justify-content:space-between;min-height:45px;list-style:none;padding:0 2px;color:var(--pscb-faint);font:600 8.5px/1.2 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}.pscb-closed>summary::-webkit-details-marker{display:none}.pscb-closed>summary:after{content:"+"}.pscb-closed[open]>summary:after{content:"–"}.pscb-closed-list{padding:0 2px}.pscb-closed-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:13px 0;border-top:1px solid var(--pscb-soft)}.pscb-closed-meta{margin-top:4px;font-size:10.5px;color:var(--pscb-faint)}',
      '@media(max-width:700px){.pscb{width:100%}.pscb-head{display:grid;gap:12px;padding:3px 0 18px}.pscb-title{font-size:37px}.pscb-total{padding:0}.pscb-total strong{font-size:27px}.pscb-tab{grid-template-columns:1fr auto;min-height:64px;padding:10px 8px}.pscb-tab-cue{display:none}.pscb-tab-title{font-size:10.5px}.pscb-tab-count{min-width:26px;height:26px;font-size:14px}.pscb-panel{border-radius:16px}.pscb-panel-head{align-items:flex-start;flex-direction:column;gap:6px;padding:13px 15px}.pscb-list{padding:0 15px}.pscb-row{grid-template-columns:7px minmax(0,1fr);gap:11px;padding:16px 0}.pscb-actions{grid-column:2;width:100%;padding-top:2px}.pscb-btn{width:100%;min-height:44px}.pscb-closed-row{grid-template-columns:1fr}.pscb-closed-row .pscb-btn{width:100%}}',
      '@media(prefers-reduced-motion:reduce){.pscb *{transition:none!important;scroll-behavior:auto!important}}'
    ].join('\n');document.head.appendChild(s);
  }

  function validateActive(payload){
    if(!payload||typeof payload!=='object') throw new Error('Lead Conversations returned no contract.');
    var counts=countMap(payload);
    if(!counts) throw new Error('Deploy the Lead Conversations operating-bucket API before the app.');
    ACTIVE.forEach(function(k){if(!Number.isFinite(Number(counts[k]))) throw new Error('Lead Conversations is missing the '+k+' count.');});
    rows(payload).forEach(function(row){
      if(!row||ACTIVE.indexOf(row.operating_bucket)<0) throw new Error('A conversation has no supported operating bucket.');
      if(!row.conversation_id) throw new Error('A conversation row has no conversation_id.');
    });
    return payload;
  }
  function validateClosed(payload){
    if(!payload||typeof payload!=='object'||!Array.isArray(payload.conversations)) throw new Error('Recently closed returned no supported contract.');
    return payload;
  }

  async function loadOne(scope,params){
    var L=live(); if(!L) throw new Error('Live conversation loader is unavailable.');
    var p=Object.assign({scope:scope,limit:50},params||{}), out;
    if(typeof L.conversationQueue==='function') out=await L.conversationQueue(p);
    else if(typeof L.loadResource==='function') out=await L.loadResource('conversationQueue',p);
    else throw new Error('Live conversation loader is unavailable.');
    return unwrap(out);
  }
  async function loadAll(scope){
    var first=null, all=[], cursor=null, pages=0;
    do{
      var p={}; if(cursor){p.before_activity_at=cursor.before_activity_at;p.before_id=cursor.before_id;}
      var out=await loadOne(scope,p); if(!first) first=out;
      if(out&&Array.isArray(out.conversations)) all=all.concat(out.conversations);
      cursor=out&&out.next_cursor||null; pages++;
    }while(cursor&&pages<10);
    first=first||{}; first.conversations=all; first.truncated=!!cursor; return first;
  }

  async function refresh(){
    if(!state.host||state.loading) return;
    if(!hasSession()){state.error=new Error('Lead Conversations is available after staff sign-in.');render();return;}
    state.loading=true;state.error=null;render();
    try{
      state.active=validateActive(await loadAll('active'));
      if(!state.touched){var c=countMap(state.active)||{};state.bucket=ACTIVE.filter(function(k){return Number(c[k]||0)>0;})[0]||'needs_attention';}
    }catch(e){state.active=null;state.error=e;}
    state.loading=false;render();
  }
  async function loadClosed(){
    if(state.closed||state.closedLoading) return;
    state.closedLoading=true;state.closedError=null;render();
    try{state.closed=validateClosed(await loadAll('closed'));}catch(e){state.closedError=e;}
    state.closedLoading=false;render();
  }

  function relative(v){
    if(!v) return null;var t=Date.parse(v);if(isNaN(t))return null;var mins=Math.max(0,Math.round((Date.now()-t)/60000));
    if(mins<60)return mins+'m ago';var hrs=Math.round(mins/60);if(hrs<48)return hrs+'h ago';return Math.round(hrs/24)+'d ago';
  }
  function human(v){return String(v||'').replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});}
  function reason(row){return REASON_COPY[row.operating_reason_code]||'Open this conversation to review its current state.';}
  function badgeTone(row){if(row.control_mode==='human_takeover')return 'human';if(row.operating_bucket==='needs_attention')return 'attn';if(row.operating_bucket==='no_response')return 'noresponse';return 'ai';}
  function rowClass(row){if(row.control_mode==='human_takeover')return 'human';if(row.operating_bucket==='needs_attention')return 'attention';if(row.operating_bucket==='no_response')return 'noresponse';return 'ai';}
  function waitingLabel(row){return {manager:'Waiting on operator',ai:'AI working',prospect:'Waiting on prospect',none:'No one waiting'}[row.waiting_on]||null;}
  function controlLabel(row){return row.control_mode==='human_takeover'?'Human owned':row.control_mode==='awaiting_review'?'AI escalated':'AI control';}

  function personHTML(row,key){
    var name=esc(row.person_name||'Unnamed person');
    return row.person_id?'<button type="button" class="pscb-person" data-pscb-person="'+esc(row.person_id)+'" data-key="'+esc(key)+'">'+name+'</button>':'<span class="pscb-person plain">'+name+'</span>';
  }
  function rowHTML(row){
    var key=row.conversation_id,tone=badgeTone(row),age=relative(row.last_meaningful_activity_at),wait=waitingLabel(row);
    /* WHY the reason and control badges are dropped: they are two different
     * facts — what the conversation NEEDS, and who is DRIVING it — and they
     * usually differ ("Approval needed" + "AI escalated"). But a
     * human-owned conversation is human-driven by definition, so both
     * resolve to the literal string "Human owned" and the row printed the
     * same chip twice.
     *
     * Compared as text rather than special-cased on human_takeover, because
     * the collision is about the operator reading the same words twice — any
     * future pair that lands on one phrase is the same defect. */
    var reasonText=REASON_BADGE[row.operating_reason_code]||human(row.operating_bucket);
    var controlText=controlLabel(row);
    var meta='<span class="pscb-badge '+tone+'">'+esc(reasonText)+'</span>'+
      (controlText===reasonText?'':'<span class="pscb-badge '+(row.control_mode==='human_takeover'?'human':'ai')+'">'+esc(controlText)+'</span>')+
      (wait?'<span>'+esc(wait)+'</span>':'')+(age?'<span>'+esc(age)+'</span>':'')+
      (row.operating_bucket==='no_response'&&row.outreach_attempts!=null?'<span>'+esc(row.outreach_attempts)+' outreach '+(Number(row.outreach_attempts)===1?'attempt':'attempts')+'</span>':'');
    return '<div class="pscb-row '+rowClass(row)+'" data-conversation-id="'+esc(key)+'"><div class="pscb-main"><div class="pscb-top">'+personHTML(row,key)+'</div><div class="pscb-sentence">'+esc(reason(row))+'</div><div class="pscb-meta">'+meta+'</div></div><div class="pscb-actions"><button type="button" class="pscb-btn" data-pscb-open="'+esc(key)+'">Open</button></div></div>';
  }
  function tabsHTML(){
    var c=countMap(state.active)||{};
    return '<div class="pscb-tabs" role="tablist" aria-label="Conversation operating buckets">'+ACTIVE.map(function(k,i){var m=META[k],on=state.bucket===k;return '<button type="button" class="pscb-tab'+(on?' active':'')+'" role="tab" id="pscb-tab-'+k+'" aria-selected="'+(on?'true':'false')+'" aria-controls="pscb-panel-'+k+'" tabindex="'+(on?'0':'-1')+'" data-pscb-tab="'+k+'"><span class="pscb-tab-copy"><span class="pscb-tab-title">'+m.title+'</span><span class="pscb-tab-cue">'+m.cue+'</span></span><strong class="pscb-tab-count">'+esc(c[k]||0)+'</strong></button>';}).join('')+'</div>';
  }
  function panelHTML(){
    var m=META[state.bucket],list=rows(state.active).filter(function(r){return r.operating_bucket===state.bucket;}),body=list.length?list.map(rowHTML).join(''):'<div class="pscb-empty">'+m.empty+'</div>';
    return '<section class="pscb-panel" role="tabpanel" id="pscb-panel-'+state.bucket+'" aria-labelledby="pscb-tab-'+state.bucket+'"><div class="pscb-panel-head"><div class="pscb-panel-desc">'+m.desc+'</div><span class="pscb-panel-count">'+list.length+' '+(list.length===1?'conversation':'conversations')+'</span></div><div class="pscb-list">'+body+'</div></section>';
  }
  function closedHTML(){
    var n=state.closed?rows(state.closed).length:((state.active&&state.active.counts&&state.active.counts.by_state&&state.active.counts.by_state.closed_not_fit)||0);
    var body='';
    if(state.closedLoading) body='<div class="pscb-loading">Loading recently closed conversations…</div>';
    else if(state.closedError) body='<div class="pscb-error">Recently closed is unavailable: '+esc(state.closedError.message||state.closedError)+'</div>';
    else if(state.closed){
      var closedRows=rows(state.closed);
      body=closedRows.length?'<div class="pscb-closed-list">'+closedRows.map(function(row){
        var key=row.conversation_id,why=row.closure_reason?human(row.closure_reason):'Closed',who=row.closure_actor_name||'System',at=relative(row.closure_occurred_at||row.closure_recorded_at);
        return '<div class="pscb-closed-row"><div><div>'+personHTML(row,key)+'</div><div class="pscb-closed-meta">'+esc(why)+' · '+esc(who)+(at?' · '+esc(at):'')+'</div></div><button type="button" class="pscb-btn" data-pscb-open="'+esc(key)+'">Open</button></div>';
      }).join('')+'</div>':'<div class="pscb-empty">No recently closed conversations.</div>';
    }
    return '<details class="pscb-closed" data-pscb-closed'+(state.closedOpen?' open':'')+'><summary>Recently closed <span>'+esc(n||0)+'</span></summary>'+body+'</details>';
  }
  function render(){
    if(!state.host)return;
    var h='<div class="pscb" data-pscb-root="1">';
    if(state.loading&&!state.active){h+='<div class="pscb-loading">Loading conversations…</div></div>';state.host.innerHTML=h;bind();return;}
    if(state.error&&!state.active){h+='<div class="pscb-error">Lead Conversations is unavailable: '+esc(state.error.message||state.error)+' <button type="button" class="pscb-retry" data-pscb-retry>Retry</button></div></div>';state.host.innerHTML=h;bind();return;}
    if(!state.active){h+='<div class="pscb-loading">Loading conversations…</div></div>';state.host.innerHTML=h;bind();return;}
    var c=countMap(state.active)||{},total=ACTIVE.reduce(function(n,k){return n+Number(c[k]||0);},0);
    // NAMING RULING (before Slice 6): destination title Conversations → Lead
    // Conversations. Eyebrow and the AI-supervision sub are unchanged, per
    // instruction ("keep its current AI-supervision explanation").
    h+='<header class="pscb-head"><div><div class="pscb-eyebrow">Leasing conversations</div><h1 class="pscb-title">Lead Conversations</h1><div class="pscb-sub">AI handles routine conversations. Step in only when judgment is required.</div></div><div class="pscb-total"><strong>'+esc(total)+'</strong><span>active '+(total===1?'conversation':'conversations')+'</span></div></header>';
    if(state.flash)h+='<div class="pscb-flash">'+esc(state.flash)+'</div>';
    h+=tabsHTML()+panelHTML()+closedHTML()+'</div>';state.host.innerHTML=h;bind();
  }

  /* A legacy DOM probe lived here: it hunted the old markup for a
   * clickable node matching a conversation id, so Open could forward a click
   * to whatever used to handle it. Its only caller was openConversation, and
   * removing the guesswork there left it with none. Deleted rather than kept
   * — a synthetic click aimed at markup nobody renders any more is the kind
   * of fallback that turns a dead button into a mystery. */
  function findRow(id){return rows(state.active).concat(state.closed?rows(state.closed):[]).filter(function(r){return String(r.conversation_id)===String(id);})[0]||null;}
  /* OPEN — the conversation workspace is the Person Card's Communication tab.
   *
   * This used to hunt for four differently-named globals, none of which has
   * ever existed (openLeasingConversation / openConversationReview /
   * openConversationDetail / openConversation — all zero definitions), then
   * fall through to a legacy DOM probe, then an event nobody listens for,
   * and finally set a flash the operator never sees. So the button did
   * nothing, silently, on every row.
   *
   * The workspace was built the whole time — it is the Person Card opened on
   * Communication. That is also exactly what the card's own entry contract
   * says should happen: the NAME means "show me this person" -> Information,
   * an explicit work action means "communicate" -> the thread. Open is a work
   * action, so it lands on the thread.
   *
   * The speculative lookups are gone rather than kept as a fallback. A
   * fallback to four functions that do not exist is not resilience, it is the
   * thing that hid this bug — it made "nothing happened" look like a
   * configuration state instead of a dead end.
   */
  function openConversation(row){
    if(!row)return;
    if(row.person_id && typeof window.openPersonCard==='function'){
      try{
        window.openPersonCard({
          person_id:row.person_id,
          name:row.person_name||null,
          conversation_id:row.conversation_id||null,
          source:'leasing_conversations',
          context:'communications',
          start_tab:'communication'
        });
        return;
      }catch(_){ }
    }
    /* No person on the row means an unresolved sender — the message is real
     * and saved, but there is nobody to open. Say so; do not pretend. */
    state.flash=row.person_id
      ? 'That conversation could not be opened. Nothing was changed — try again.'
      : 'No person is resolved on this conversation yet, so there is no card to open.';
    render();
  }
  function openPerson(row){
    if(!row||!row.person_id||typeof window.openPersonCard!=='function')return;
    try{window.openPersonCard({person_id:row.person_id,name:row.person_name||null,source:'leasing_conversations',context:'lead',conversation_id:row.conversation_id,start_tab:'info'});}catch(_){state.flash='The Person Card could not be opened.';render();}
  }

  function keyTabs(ev,node){
    var idx=ACTIVE.indexOf(node.getAttribute('data-pscb-tab')),next=null;
    if(ev.key==='ArrowRight')next=(idx+1)%ACTIVE.length;else if(ev.key==='ArrowLeft')next=(idx-1+ACTIVE.length)%ACTIVE.length;else if(ev.key==='Home')next=0;else if(ev.key==='End')next=ACTIVE.length-1;else return;
    ev.preventDefault();state.bucket=ACTIVE[next];state.touched=true;render();var n=state.host.querySelector('[data-pscb-tab="'+ACTIVE[next]+'"]');if(n)n.focus();
  }
  function bind(){
    if(!state.host)return;
    state.host.querySelectorAll('[data-pscb-tab]').forEach(function(n){n.onclick=function(){state.bucket=n.getAttribute('data-pscb-tab');state.touched=true;render();};n.onkeydown=function(e){keyTabs(e,n);};});
    state.host.querySelectorAll('[data-pscb-open]').forEach(function(n){n.onclick=function(){openConversation(findRow(n.getAttribute('data-pscb-open')));};});
    state.host.querySelectorAll('[data-pscb-person]').forEach(function(n){n.onclick=function(){openPerson(findRow(n.getAttribute('data-key')));};});
    var retry=state.host.querySelector('[data-pscb-retry]');if(retry)retry.onclick=refresh;
    var closed=state.host.querySelector('[data-pscb-closed]');if(closed)closed.ontoggle=function(){state.closedOpen=closed.open;if(closed.open)loadClosed();};
  }

  function findLegacy(){return document.querySelector('.lconv-page')||document.querySelector('#psLiveLeasingEntry .lconv-page')||null;}
  function mount(){
    var legacy=findLegacy();if(!legacy)return false;
    if(state.legacy===legacy&&state.host&&document.documentElement.contains(state.host))return true;
    state.legacy=legacy;legacy.setAttribute('data-pscb-legacy','1');
    var host=document.createElement('div');host.setAttribute('data-pscb-host','1');legacy.parentNode.insertBefore(host,legacy);state.host=host;injectStyle();render();refresh();return true;
  }
  function observe(){
    observer=new MutationObserver(function(){if(!state.host||!document.documentElement.contains(state.host))mount();});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    visibilityHandler=function(){if(document.visibilityState==='visible'&&state.host)refresh();};document.addEventListener('visibilitychange',visibilityHandler);
    window.addEventListener('ps:conversation-return',refresh);
  }
  function start(){injectStyle();mount();observe();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
