/* PROPERTY SPINE LEASING EXPERIENCE v4
 *
 * Mobile-first presentation layer for the authenticated Leasing module.
 * It changes hierarchy, wording, spacing and navigation placement only.
 * A query-gated sample schedule can be rendered for design review; sample
 * rows never appear unless ps_demo_tours=1 is explicitly present. The layer
 * does not call an endpoint or perform an operating write.
 *
 * Operating hierarchy:
 *   1. Today's Tours — prepare and run the day.
 *   2. Leasing Work — applications, leases, move-ins and future renewals when actionable.
 *   3. Conversations — AI supervised; operator intervention only when needed.
 */
(function(){
  'use strict';

  var STYLE_ID='ps-leasing-experience-style';
  var STRIP_ID='intelStrip';
  var mutating=false;

  function isAuthenticated(){
    try{
      if(typeof _egAuthScope!=='undefined' && _egAuthScope && _egAuthScope.property_id) return true;
      return !!(window.__psLive && window.__psLive.hasSession && window.__psLive.hasSession());
    }catch(_){ return false; }
  }

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    var s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=[
      ':root{--psx-ink:#171512;--psx-muted:#686154;--psx-faint:#948f85;--psx-line:#d9d4cb;--psx-soft:#ece8df;--psx-green:#17634f;--psx-green-soft:#f6faf8;--psx-warm:#fcfaf5;--psx-shadow:0 10px 26px rgba(33,28,18,.055)}',
      '#intelStrip{overflow-x:hidden}',
      '#intelStrip .maint-ops-shell{width:min(100%,1080px);margin-inline:auto}',
      '#intelStrip.psx-leasing-home .leasing-controls [data-miq-launch]{display:none!important}',

      /* Home: mobile first. One clear vertical sequence. */
      '.psx-leasing-grid{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:12px!important;align-items:stretch}',
      '.psx-leasing-grid>.psx-card{position:relative;margin:0!important;min-width:0!important;min-height:0!important;padding:19px!important;border:1px solid var(--psx-line)!important;border-radius:18px!important;background:#fff!important;box-shadow:none!important;transform:none!important;touch-action:manipulation;overflow:hidden;cursor:pointer}',
      '.psx-leasing-grid>.psx-card .maint-card-kicker{font:600 8.5px/1.2 "IBM Plex Mono",monospace!important;letter-spacing:.14em!important;text-transform:uppercase;color:var(--psx-faint)!important}',
      '.psx-leasing-grid>.psx-card h3{margin:6px 0 0!important;font-family:"Fraunces",Georgia,serif!important;font-size:26px!important;font-weight:500!important;line-height:1.02!important;letter-spacing:-.04em!important;color:var(--psx-ink)!important}',
      '.psx-leasing-grid>.psx-card p{margin:8px 0 0!important;max-width:36rem;font-size:12.5px!important;line-height:1.48!important;color:var(--psx-muted)!important}',
      '.psx-leasing-grid>.psx-card .maint-card-open{display:flex!important;align-items:center!important;min-height:44px!important;margin-top:12px!important;padding:0!important;font-size:12px!important;font-weight:650!important;line-height:1.2!important;color:var(--psx-ink)!important}',
      '.psx-leasing-grid>.psx-card .maint-card-number{font-size:24px!important}',
      '.psx-leasing-grid>.psx-card:focus-visible{outline:2px solid var(--psx-ink)!important;outline-offset:3px}',
      '.psx-leasing-grid>.psx-tours{order:1;background:var(--psx-green-soft)!important;border-color:#bfd6cc!important}',
      '.psx-leasing-grid>.psx-tours .maint-card-kicker{color:var(--psx-green)!important}',
      '.psx-leasing-grid>.psx-tours h3{font-size:32px!important}',
      '.psx-leasing-grid>.psx-work{order:2;background:var(--psx-warm)!important}',
      '.psx-leasing-grid>.psx-conversations{order:3;background:#fff!important}',

      /* Today schedule preview. Sample rows are query-gated and clearly labeled. */
      '.psx-tour-preview{margin-top:18px;border-top:1px solid rgba(23,99,79,.16);padding-top:12px;pointer-events:none}',
      '.psx-tour-preview-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:4px}',
      '.psx-tour-preview-label{font:600 9px/1.2 "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--psx-green)}',
      '.psx-tour-preview-badge{font:600 8px/1.2 "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--psx-faint)}',
      '.psx-tour-preview-list{display:grid;grid-template-columns:minmax(0,1fr);margin-top:2px}',
      '.psx-tour-preview-row{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:13px;align-items:center;min-height:47px;border-top:1px solid rgba(23,99,79,.11)}',
      '.psx-tour-preview-row:first-child{border-top:0}',
      '.psx-tour-empty{padding:9px 0 2px;font-size:11.5px;color:var(--psx-muted)}',
      '.psx-tour-status.warn{border-color:#e2cba4!important;color:#9a641a!important}',
      '.psx-tour-time{font:600 10px/1.2 "IBM Plex Mono",monospace;letter-spacing:.03em;color:var(--psx-ink)}',
      '.psx-tour-person{font-size:12.5px;font-weight:650;color:var(--psx-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      /* the preview list is pointer-events:none so rows never become a second
         interactive system; the NAME opts back in as the one exception. */
      '.psx-person-link{pointer-events:auto;appearance:none;background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer;text-align:left;max-width:100%;border-bottom:1px solid rgba(23,99,79,.35)}',
      '.psx-person-link:hover,.psx-person-link:focus-visible{border-bottom-color:var(--psx-green);outline:none}',
      '.psx-person-link:focus-visible{box-shadow:0 0 0 2px rgba(23,99,79,.25);border-radius:3px}',
      '.psx-tour-unit{display:block;margin-top:2px;font-size:10.5px;font-weight:450;color:var(--psx-muted)}',
      '.psx-tour-status{display:inline-flex;align-items:center;min-height:25px;border:1px solid #bfd6cc;border-radius:999px;padding:0 9px;font:600 8.5px/1.2 "IBM Plex Mono",monospace;letter-spacing:.05em;text-transform:uppercase;color:var(--psx-green);background:#fff}',
      '.psx-tour-status.coverage{border-color:#e5c991;color:#8a601d;background:#fffaf0}',

      /* Leasing Work actions: two quiet, thumb-sized doors. */
      '.psx-work-actions{display:grid;grid-template-columns:minmax(0,1fr);gap:0;margin-top:15px;max-width:460px;border-top:1px solid var(--psx-soft)}',
      '.psx-link,.psx-work-actions [data-miq-launch]{display:flex!important;align-items:center!important;justify-content:space-between!important;min-height:46px!important;width:100%!important;appearance:none;border:0!important;border-bottom:1px solid var(--psx-soft)!important;background:transparent!important;color:#292823!important;border-radius:0!important;padding:0 2px!important;font:600 11.5px/1.2 "IBM Plex Sans",sans-serif!important;cursor:pointer;white-space:normal!important;text-align:left;touch-action:manipulation}',
      '.psx-link:after,.psx-work-actions [data-miq-launch]:after{content:"→";font-size:14px;font-weight:500;color:var(--psx-faint)}',
      '.psx-link:focus-visible,.psx-work-actions [data-miq-launch]:focus-visible{outline:2px solid var(--psx-ink);outline-offset:2px}',

      /* Leasing Work: mobile first, no horizontal dependence. */
      '#intelStrip.psx-leasing-work .pslh{width:min(100%,1080px);max-width:none}',
      '#intelStrip.psx-leasing-work .pslh-head{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;padding:2px 0 18px}',
      '#intelStrip.psx-leasing-work .pslh-title{font-size:34px;line-height:1}',
      '#intelStrip.psx-leasing-work .pslh-sub{max-width:42rem;font-size:12.5px;line-height:1.5}',
      '#intelStrip.psx-leasing-work .pslh-pulse{display:grid;grid-template-columns:1fr 1fr;border-radius:16px}',
      '#intelStrip.psx-leasing-work .pslh-pulse-cell{min-width:0;min-height:64px;padding:11px 12px}',
      '#intelStrip.psx-leasing-work .pslh-pulse-cell:first-child{grid-column:1 / -1;border-bottom:1px solid var(--psx-soft)}',
      '#intelStrip.psx-leasing-work .pslh-pulse-cell:nth-child(2){border-left:0}',
      '#intelStrip.psx-leasing-work .pslh-pulse-cell strong{font-size:24px}',
      '#intelStrip.psx-leasing-work .pslh-band{margin-top:14px;border-radius:16px;box-shadow:none}',
      '#intelStrip.psx-leasing-work .pslh-band + .pslh-band{margin-top:14px}',
      '#intelStrip.psx-leasing-work .pslh-band-head{padding:17px 16px 16px;gap:12px}',
      '#intelStrip.psx-leasing-work .pslh-band-title{font-size:24px;line-height:1.02}',
      '#intelStrip.psx-leasing-work .pslh-band-desc{font-size:12px;line-height:1.45}',
      '#intelStrip.psx-leasing-work .pslh-band-count{width:50px;min-width:50px;height:50px}',
      '#intelStrip.psx-leasing-work .pslh-band-count strong{font-size:21px}',
      '#intelStrip.psx-leasing-work .pslh-band-body{padding:0 16px}',
      '#intelStrip.psx-leasing-work .pslh-row{grid-template-columns:4px minmax(0,1fr)!important;gap:12px!important;padding:16px 0!important}',
      '#intelStrip.psx-leasing-work .pslh-row:before{grid-row:1 / span 2;height:44px}',
      '#intelStrip.psx-leasing-work .pslh-person{font-size:14px}',
      '#intelStrip.psx-leasing-work .pslh-state{font-size:12.5px}',
      '#intelStrip.psx-leasing-work .pslh-meta{font-size:11px}',
      '#intelStrip.psx-leasing-work .pslh-actions{grid-column:2;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;justify-content:stretch;min-width:0;width:100%;padding:2px 0 0}',
      '#intelStrip.psx-leasing-work .pslh-btn.primary{display:flex;align-items:center;justify-content:center;min-height:44px;width:100%;max-width:none;padding:11px 14px;font-size:11.5px;overflow:hidden;text-overflow:ellipsis}',
      '#intelStrip.psx-leasing-work .pslh-more>summary{display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:0;font-size:0;border:1px solid transparent;border-radius:12px}',
      '#intelStrip.psx-leasing-work .pslh-more>summary:after{content:"•••";font-size:12px;letter-spacing:.12em}',
      '#intelStrip.psx-leasing-work .pslh-menu{left:auto;right:0;top:46px}',
      '#intelStrip.psx-leasing-work .pslh-closed{margin-top:14px;border-radius:15px}',

      /* Existing deeper surfaces keep one width and no horizontal overflow. */
      '#intelStrip.psx-surface-tours .tours-day,#intelStrip.psx-surface-conversations .lconv-page,#intelStrip.psx-surface-applications #psReviewBody,#intelStrip.psx-surface-applications #psReviewDetail{width:min(100%,1080px);margin-inline:auto}',
      '#intelStrip.psx-surface-applications .ps-ar-row,#intelStrip.psx-leasing-work .pslh-row{font-family:"IBM Plex Sans",system-ui,sans-serif}',
      '#intelStrip.psx-surface-applications input,#intelStrip.psx-surface-applications select,#intelStrip.psx-surface-applications textarea{font-size:16px}',

      /* Small phone refinements. */
      '@media(max-width:420px){.psx-leasing-grid>.psx-card{padding:17px!important;border-radius:16px!important}.psx-leasing-grid>.psx-tours h3{font-size:30px!important}.psx-tour-preview-row{grid-template-columns:62px minmax(0,1fr);gap:10px;padding:7px 0}.psx-tour-status{grid-column:2;justify-self:start;min-height:22px;padding:0 7px}#intelStrip.psx-leasing-work .pslh-title{font-size:32px}#intelStrip.psx-leasing-work .pslh-band-head{grid-template-columns:minmax(0,1fr) auto}#intelStrip.psx-leasing-work .pslh-band-count{width:46px;min-width:46px;height:46px}}',

      /* Tablet: still one priority column, more breathing room. */
      '@media(min-width:560px){.psx-leasing-grid>.psx-card{padding:22px!important}.psx-leasing-grid>.psx-tours h3{font-size:34px!important}#intelStrip.psx-leasing-work .pslh-head{gap:20px}#intelStrip.psx-leasing-work .pslh-title{font-size:38px}}',

      /* Desktop: expand the same mobile order, do not invent a different workflow. */
      '@media(min-width:860px){.psx-leasing-grid{grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr)!important;grid-template-rows:auto auto;gap:16px!important}.psx-leasing-grid>.psx-card{border-radius:22px!important;box-shadow:var(--psx-shadow)!important}.psx-leasing-grid>.psx-tours{grid-column:1 / -1;grid-row:auto;min-height:220px!important;padding:28px!important}.psx-leasing-grid>.psx-tours h3{font-size:38px!important}.psx-leasing-grid>.psx-tours .psx-tour-preview{max-width:760px}.psx-leasing-grid>.psx-work{min-height:190px!important;padding:22px!important}.psx-leasing-grid>.psx-work h3{font-size:28px!important}.psx-leasing-grid>.psx-conversations{min-height:190px!important;padding:22px!important;box-shadow:var(--psx-shadow)!important}.psx-leasing-grid>.psx-conversations h3{font-size:24px!important}#intelStrip.psx-leasing-work .pslh-head{grid-template-columns:minmax(0,1fr) minmax(310px,380px);gap:32px;padding-bottom:24px}#intelStrip.psx-leasing-work .pslh-title{font-size:42px}#intelStrip.psx-leasing-work .pslh-pulse{grid-template-columns:1.2fr 1fr 1fr}#intelStrip.psx-leasing-work .pslh-pulse-cell:first-child{grid-column:auto;border-bottom:0}#intelStrip.psx-leasing-work .pslh-pulse-cell:nth-child(2){border-left:1px solid var(--psx-soft)}#intelStrip.psx-leasing-work .pslh-band{border-radius:20px;box-shadow:0 12px 30px rgba(33,28,18,.06)}#intelStrip.psx-leasing-work .pslh-band-head{padding:21px 22px 19px}#intelStrip.psx-leasing-work .pslh-band-title{font-size:29px}#intelStrip.psx-leasing-work .pslh-band-body{padding:0 22px}#intelStrip.psx-leasing-work .pslh-row{grid-template-columns:5px minmax(0,1fr) auto!important;gap:18px!important;padding:17px 0!important}#intelStrip.psx-leasing-work .pslh-row:before{grid-row:auto;height:42px}#intelStrip.psx-leasing-work .pslh-actions{grid-column:auto;display:flex;justify-content:flex-end;min-width:190px;width:auto;padding:0}#intelStrip.psx-leasing-work .pslh-btn.primary{width:auto;min-height:38px;padding:9px 14px;font-size:10.5px}#intelStrip.psx-leasing-work .pslh-more>summary{min-width:auto;min-height:auto;padding:9px 2px;font-size:11px;border:0}#intelStrip.psx-leasing-work .pslh-more>summary:after{content:" ···";font-size:inherit}}',

      '@media(hover:hover) and (pointer:fine){.psx-leasing-grid>.psx-card{transition:border-color .14s ease,box-shadow .14s ease}.psx-leasing-grid>.psx-card:hover{border-color:#aebfb7!important;box-shadow:0 12px 30px rgba(33,28,18,.075)!important}.psx-link:hover,.psx-work-actions [data-miq-launch]:hover{color:var(--psx-green)!important}}',
      '@media(prefers-reduced-motion:reduce){.psx-leasing-grid>.psx-card{transition:none!important}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function actionKey(card){ return String(card && card.getAttribute('onclick') || ''); }
  function findCard(cards,key){
    for(var i=0;i<cards.length;i++){
      if(actionKey(cards[i]).indexOf("'"+key+"'")>=0 || actionKey(cards[i]).indexOf('"'+key+'"')>=0) return cards[i];
    }
    return null;
  }
  function setText(card,selector,value){ var n=card && card.querySelector(selector); if(n && n.textContent!==value) n.textContent=value; }
  function setKicker(card,value){
    var n=card && card.querySelector('.maint-card-kicker'); if(!n) return;
    if(n.getAttribute('data-psx-kicker')===value) return;
    var liveDot=n.querySelector('.lconv-tile-dot');
    while(n.firstChild) n.removeChild(n.firstChild);
    n.appendChild(document.createTextNode(value));
    if(liveDot){ n.appendChild(document.createTextNode(' ')); n.appendChild(liveDot); }
    n.setAttribute('data-psx-kicker',value);
  }
  function decorateHomeCard(card,klass,kicker,title,copy,openCopy,aria){
    if(!card) return;
    card.classList.add('psx-card',klass);
    card.setAttribute('aria-label',aria);
    if(!/^(A|BUTTON)$/.test(card.tagName||'')){
      card.setAttribute('role','button');
      if(!card.hasAttribute('tabindex')) card.setAttribute('tabindex','0');
    }
    setKicker(card,kicker);
    setText(card,'h3',title);
    setText(card,'p',copy);
    setText(card,'.maint-card-open',openCopy);
  }

  var DEMO_TOURS=[
    {time:'9:30 AM',person:'Maya Thompson',unit:'Unit 304 · 2 bed',status:'Confirmed',tone:''},
    {time:'11:00 AM',person:'Jordan Lee',unit:'Unit 512 · Studio',status:'Needs coverage',tone:'coverage'},
    {time:'2:15 PM',person:'Carlos Ramirez',unit:'Unit 207 · 1 bed',status:'Confirmed',tone:''}
  ];

  function esc(v){
    return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function demoTourPreviewEnabled(){
    try{
      var q=new URLSearchParams(window.location.search||'');
      return q.get('ps_demo_tours')==='1';
    }catch(_){ return false; }
  }

  function demoTourPreviewHTML(){
    return '<div class="psx-tour-preview-head"><span class="psx-tour-preview-label">Today · 3 tours</span><span class="psx-tour-preview-badge">Preview data</span></div><div class="psx-tour-preview-list">'+DEMO_TOURS.map(function(t){
      return '<div class="psx-tour-preview-row"><div class="psx-tour-time">'+esc(t.time)+'</div><div><div class="psx-tour-person">'+esc(t.person)+'</div><span class="psx-tour-unit">'+esc(t.unit)+'</span></div><span class="psx-tour-status '+esc(t.tone)+'">'+esc(t.status)+'</span></div>';
    }).join('')+'</div>';
  }

  /* ── LIVE today's tours ───────────────────────────────────────────────
     The card reserves space for a briefing, so it must fill it from the
     canonical read — not sample rows. One fetch per card mount, cached on
     the module; honest states throughout:
       live rows      → render up to three
       live empty     → say so plainly, never blank
       live failed    → say unavailable, never substitute fixtures
     Property scope is server-derived from the session; the browser sends no
     property_id. ── */
  var liveTours={ state:'idle', rows:null };

  function fmtTourTime(iso){
    if(!iso) return '—';
    try{
      var d=new Date(iso);
      if(isNaN(d.getTime())) return '—';
      return d.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });
    }catch(_){ return '—'; }
  }
  function tourStatusLabel(t){
    if(t && t.host_unassigned) return { text:'Unassigned', tone:'warn' };
    var s=String((t&&t.status)||'').toLowerCase();
    if(s==='checked_in') return { text:'Checked in', tone:'' };
    if(s==='confirmed_by_prospect') return { text:'Confirmed', tone:'' };
    if(s==='rescheduled') return { text:'Rescheduled', tone:'warn' };
    if(s==='scheduled') return { text:'Scheduled', tone:'' };
    return { text: s ? s.replace(/_/g,' ') : 'Scheduled', tone:'' };
  }
  function liveTourPreviewHTML(){
    if(liveTours.state==='loading')
      return '<div class="psx-tour-preview-head"><span class="psx-tour-preview-label">Today</span></div>'
           + '<div class="psx-tour-empty">Loading today\u2019s schedule\u2026</div>';
    if(liveTours.state==='error')
      return '<div class="psx-tour-preview-head"><span class="psx-tour-preview-label">Today</span></div>'
           + '<div class="psx-tour-empty">Schedule unavailable. Open Tours to retry.</div>';
    var rows=liveTours.rows||[];
    if(!rows.length)
      return '<div class="psx-tour-preview-head"><span class="psx-tour-preview-label">Today</span></div>'
           + '<div class="psx-tour-empty">No tours scheduled today.</div>';
    var shown=rows.slice(0,3);
    var more=rows.length>shown.length ? (rows.length-shown.length) : 0;
    return '<div class="psx-tour-preview-head"><span class="psx-tour-preview-label">Today \u00b7 '
      + rows.length + (rows.length===1?' tour':' tours') + '</span>'
      + (more?('<span class="psx-tour-preview-badge">+'+more+' more</span>'):'')
      + '</div><div class="psx-tour-preview-list">'
      + shown.map(function(t){
          var st=tourStatusLabel(t);
          var who=(t&&t.prospect_name)||'Unnamed prospect';
          var host=(t&&t.scheduled_host_name)||'Unassigned host';
          /* The board's timestamp column is `scheduled_for`; `starts_at` was a
             wrong guess that would have rendered every row as an em dash the
             moment a real tour existed. Both are accepted so the row survives a
             future rename, but scheduled_for is the canonical one today. */
          var when=(t&&(t.scheduled_for||t.starts_at))||null;
          /* THE NAME IS A DOOR. One person, many surfaces, every surface a way
             back into the same relationship — that is the product thesis, not a
             convenience. It routes through openPersonCard(), the app's single
             canonical gate ("every module opens ONE canonical live Person ×
             Property Card"), so this row cannot become a sixth lookalike screen.
             Without a person_id we render plain text rather than a dead button. */
          var pid=(t&&t.person_id)||'';
          var nameHtml = pid
            ? '<button type="button" class="psx-tour-person psx-person-link" data-psx-person="'+esc(pid)
              + '" data-psx-lead="'+esc((t&&t.lead_id)||'')+'" data-psx-name="'+esc(who)
              + '" title="Open '+esc(who)+'\u2019s relationship">'+esc(who)+'</button>'
            : '<div class="psx-tour-person">'+esc(who)+'</div>';
          return '<div class="psx-tour-preview-row"><div class="psx-tour-time">'+esc(fmtTourTime(when))+'</div>'
            + '<div>'+nameHtml+'<span class="psx-tour-unit">'+esc(host)+'</span></div>'
            + '<span class="psx-tour-status '+esc(st.tone)+'">'+esc(st.text)+'</span></div>';
        }).join('')+'</div>';
  }
  function ensureLiveTours(){
    if(liveTours.state!=='idle') return;
    var L=(typeof window!=='undefined') ? window.__psLive : null;
    if(!L || typeof L.loadResource!=='function'){ liveTours.state='error'; return; }
    liveTours.state='loading';
    L.loadResource('toursToday',{}).then(function(out){
      var d=(out&&out.data)?out.data:out;
      liveTours.rows=Array.isArray(d&&d.tours)?d.tours:[];
      liveTours.state='ready';
      schedule();
    }).catch(function(){ liveTours.state='error'; schedule(); });
  }
  function installLiveTourPreview(card){
    if(!card) return;
    ensureLiveTours();
    var host=card.querySelector('[data-psx-live-tours]');
    if(!host){
      host=document.createElement('div');
      host.className='psx-tour-preview';
      host.setAttribute('data-psx-live-tours','1');
      host.setAttribute('aria-label','Today\u2019s tour schedule');
      var open=card.querySelector('.maint-card-open');
      card.insertBefore(host,open||null);
    }
    var html=liveTourPreviewHTML();
    if(host.innerHTML!==html) host.innerHTML=html;   /* idempotent: no needless mutation */
  }

  function installDemoTourPreview(card){
    if(!card) return;
    var existing=card.querySelector('[data-psx-demo-tours]');
    if(!demoTourPreviewEnabled()){
      if(existing) existing.remove();
      installLiveTourPreview(card);      /* live is the DEFAULT, not the fallback */
      return;
    }
    var lv=card.querySelector('[data-psx-live-tours]');
    if(lv) lv.remove();                  /* preview flag replaces live, never overlays it */
    if(!existing){
      existing=document.createElement('div');
      existing.className='psx-tour-preview';
      existing.setAttribute('data-psx-demo-tours','1');
      existing.setAttribute('aria-label','Sample preview of today’s tour schedule');
      existing.innerHTML=demoTourPreviewHTML();
      var open=card.querySelector('.maint-card-open');
      card.insertBefore(existing,open||null);
    }
    card.setAttribute('aria-label',"Today's Tours. Sample schedule visible. Open today's schedule.");
  }

  function activateCardFromKeyboard(ev){
    var card=ev.target && ev.target.closest ? ev.target.closest('.psx-card[role="button"]') : null;
    if(!card || (ev.key!=='Enter' && ev.key!==' ')) return;
    ev.preventDefault();
    card.click();
  }

  function enhanceHome(strip){
    var cards=Array.prototype.slice.call(strip.querySelectorAll('.le-auth-card,.maint-command-card'));
    var tours=findCard(cards,'tours');
    var work=findCard(cards,'followups');
    var conversations=findCard(cards,'conversations');
    if(!tours || !work || !conversations) return false;
    var grid=tours.closest('.maint-primary-grid');
    if(!grid || work.closest('.maint-primary-grid')!==grid || conversations.closest('.maint-primary-grid')!==grid) return false;

    strip.classList.add('psx-leasing-home');
    strip.classList.remove('psx-leasing-work','psx-surface-tours','psx-surface-conversations','psx-surface-applications');
    grid.classList.remove('le-four','le-three');
    grid.classList.add('psx-leasing-grid');

    decorateHomeCard(tours,'psx-tours','Today',"Today's Tours",'Prepare the day. Capture what happens.',"Open today's schedule →","Today's Tours. Open today's schedule.");
    installDemoTourPreview(tours);
    decorateHomeCard(work,'psx-work','Applications · leases · move-ins','Leasing Work','Applications, leases, move-ins, and follow-through.','Open leasing work →','Leasing Work. Applications, leases, move-ins and follow-through.');
    decorateHomeCard(conversations,'psx-conversations','AI supervised','Conversations','AI handles first contact. Step in when needed.','Open conversations →','Conversations. Supervise AI and intervene when needed.');

    if(grid.getAttribute('data-psx-home-applied')!=='1'){
      [tours,work,conversations].forEach(function(card){ if(card.parentNode===grid) grid.appendChild(card); });
      Array.prototype.slice.call(grid.children).forEach(function(card){ if(card!==tours && card!==work && card!==conversations) card.remove(); });
      grid.setAttribute('data-psx-home-applied','1');
    }

    /* Applications are work rows plus a secondary browse door, not a second queue. */
    Array.prototype.slice.call(strip.querySelectorAll('.le-review-row')).forEach(function(n){ n.remove(); });
    return true;
  }

  function browseApplications(ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); }
    if(typeof window.openLeasingDash==='function') window.openLeasingDash('applications_review');
  }

  function enhanceWork(strip){
    var root=strip.querySelector('.pslh'); if(!root) return false;
    strip.classList.add('psx-leasing-work');
    strip.classList.remove('psx-leasing-home','psx-surface-tours','psx-surface-conversations','psx-surface-applications');

    var title=root.querySelector('.pslh-title'); if(title) title.textContent='Leasing Work';
    var sub=root.querySelector('.pslh-sub');
    if(sub) sub.textContent='The relationships that need a human decision now.';

    Array.prototype.slice.call(root.querySelectorAll('.pslh-pulse-cell')).forEach(function(cell){
      var label=cell.querySelector('span');
      if(label && label.textContent.trim().toLowerCase()==='due today') cell.remove();
    });

    var headCopy=root.querySelector('.pslh-head>div:first-child');
    if(headCopy){
      var actions=headCopy.querySelector('.psx-work-actions');
      if(!actions){
        actions=document.createElement('div');
        actions.className='psx-work-actions';
        var browse=document.createElement('button');
        browse.type='button';
        browse.className='psx-link';
        browse.setAttribute('data-psx-applications','1');
        browse.textContent='All applications';
        browse.setAttribute('aria-label','Browse all applications');
        actions.appendChild(browse);
        headCopy.appendChild(actions);
      }
      var moveins=strip.querySelector('[data-miq-launch]') || document.querySelector('[data-miq-launch]');
      if(moveins && moveins.parentNode!==actions){
        moveins.classList.add('psx-inline-action');
        moveins.setAttribute('aria-label','Open move-ins');
        actions.insertBefore(moveins,actions.firstChild);
      }
    }
    return true;
  }

  function tagOtherSurface(strip){
    strip.classList.remove('psx-leasing-home','psx-leasing-work','psx-surface-tours','psx-surface-conversations','psx-surface-applications');
    if(strip.querySelector('.tours-day')) strip.classList.add('psx-surface-tours');
    else if(strip.querySelector('.lconv-page,#psLiveLeasingEntry')) strip.classList.add('psx-surface-conversations');
    else if(strip.querySelector('#psReviewBody,#psReviewDetail,.ps-ar-detail')) strip.classList.add('psx-surface-applications');
  }

  function apply(){
    if(mutating || !isAuthenticated()) return;
    var strip=document.getElementById(STRIP_ID); if(!strip) return;
    mutating=true;
    try{
      if(enhanceHome(strip)) return;
      if(enhanceWork(strip)) return;
      tagOtherSurface(strip);
    }finally{ mutating=false; }
  }

  injectStyles();
  document.addEventListener('click',function(ev){
    var b=ev.target && ev.target.closest ? ev.target.closest('[data-psx-applications]') : null;
    if(b) browseApplications(ev);
  },true);
  /* Route every name through the app's ONE canonical gate. If that gate is
     absent (preview harness, older shell) do nothing rather than invent a
     second way in — a divergent door is the failure this wiring exists to
     prevent. Capture phase + stopPropagation so the name never also triggers
     the card's "open the schedule" navigation. */
  document.addEventListener('click',function(ev){
    var el=ev.target && ev.target.closest ? ev.target.closest('[data-psx-person]') : null;
    if(!el) return;
    ev.preventDefault(); ev.stopPropagation();
    var pid=el.getAttribute('data-psx-person')||'';
    if(!pid) return;
    if(typeof window.openPersonCard!=='function') return;
    window.openPersonCard({
      person_id: pid,
      lead_id: el.getAttribute('data-psx-lead')||null,
      name: el.getAttribute('data-psx-name')||'',
      context: 'lead',
      source: 'leasing_home_tours'
    });
  },true);
  document.addEventListener('keydown',activateCardFromKeyboard,true);
  /* Disconnect during our own writes and coalesce host-render bursts. MutationObserver
     callbacks run after apply() resets the synchronous guard, so a guard alone
     cannot prevent a write→observe→write loop. */
  var observer=new MutationObserver(schedule);
  var scheduled=false;
  function schedule(){
    if(scheduled) return;
    scheduled=true;
    (window.requestAnimationFrame||function(f){ return setTimeout(f,16); })(function(){
      scheduled=false;
      observer.disconnect();
      try{ apply(); }
      finally{ observer.observe(document.documentElement,{childList:true,subtree:true}); }
    });
  }
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',apply);
  apply();
})();
