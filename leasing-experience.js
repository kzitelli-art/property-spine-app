/* PROPERTY SPINE LEASING EXPERIENCE v5
 *
 * Mobile-first presentation layer for the authenticated Leasing module.
 * It also normalizes Leasing Work and Conversations into one operating grammar:
 * shared width, page hierarchy, row anatomy, status language and primary actions.
 * A query-gated sample schedule can be rendered for design review; sample
 * rows never appear unless ps_demo_tours=1 is explicitly present. The existing
 * toursToday read remains the only live read; this layer performs no operating write.
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
      /* DESKTOP: the schedule moves BESIDE the headline instead of under it —
         the card's right half was empty while its content sat in a narrow
         column. Below 900px it returns to a single stacked column. */
      '@media(min-width:900px){.psx-leasing-grid>.psx-tours{display:grid;grid-template-columns:minmax(260px,1fr) minmax(0,1.55fr);grid-column-gap:40px;align-items:start}}',
      '@media(min-width:900px){.psx-leasing-grid>.psx-tours .maint-card-kicker,.psx-leasing-grid>.psx-tours h3,.psx-leasing-grid>.psx-tours p,.psx-leasing-grid>.psx-tours .le-auth-live{grid-column:1}}',
      '@media(min-width:900px){.psx-leasing-grid>.psx-tours .psx-tour-preview{grid-column:2;grid-row:1/span 6;margin-top:2px;border-top:0;border-left:1px solid rgba(23,99,79,.16);padding:0 0 0 34px}}',
      '@media(min-width:900px){.psx-leasing-grid>.psx-tours .maint-card-open{grid-column:1;align-self:end}}',
      /* DESKTOP: Leasing Work and Conversations share one split row instead of
         stacking. Tours spans the full width on top; below 900px all three
         cards return to a single stacked column. */
      '@media(min-width:900px){.psx-leasing-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}}',
      '@media(min-width:900px){.psx-leasing-grid>.psx-tours{grid-column:1/-1}}',
      '@media(min-width:900px){.psx-leasing-grid>.psx-work{grid-column:1}}',
      '@media(min-width:900px){.psx-leasing-grid>.psx-conversations{grid-column:2}}',
      '.psx-tour-preview{margin-top:18px;border-top:1px solid rgba(23,99,79,.16);padding-top:12px;pointer-events:none}',
      '.psx-tour-preview-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:4px}',
      '.psx-tour-preview-label{font:600 9px/1.2 "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--psx-green)}',
      '.psx-tour-preview-badge{font:600 8px/1.2 "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--psx-faint)}',
      '.psx-tour-preview-list{display:grid;grid-template-columns:minmax(0,1fr);margin-top:2px}',
      '.psx-tour-preview-row{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:13px;align-items:center;min-height:47px;border-top:1px solid rgba(23,99,79,.11)}',
      '.psx-tour-preview-row:first-child{border-top:0}',
      '.psx-tour-empty{padding:9px 0 2px;font-size:11.5px;color:var(--psx-muted)}',
      /* the week ahead: one compact column per day, horizontal on desktop */
      '.psx-tour-week{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(96px,1fr);gap:16px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(23,99,79,.14);overflow-x:auto}',
      '.psx-tour-day-head{display:flex;align-items:baseline;justify-content:space-between;gap:6px;font:600 9px/1.2 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--psx-muted)}',
      '.psx-tour-day-count{font-size:9px;color:var(--psx-green)}',
      '.psx-tour-day-names{display:grid;gap:3px;margin-top:6px}',
      '.psx-week-name{font-size:11px;color:var(--psx-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.psx-week-more{font-size:10px;color:var(--psx-faint)}',
      '@media(max-width:899px){.psx-tour-week{grid-auto-flow:row;grid-auto-columns:auto}}',
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
      /* capture owed — the day is waiting on the operator. Filled rather than
         outlined so it reads at a glance across four rows, but still the same
         pill footprint: a signal that got louder, not a new control. */
      '.psx-tour-status.capture{border-color:var(--psx-green);color:#fff;background:var(--psx-green)}',

      /* Leasing Work actions: two quiet, thumb-sized doors. */
      '.psx-work-actions{display:grid;grid-template-columns:minmax(0,1fr);gap:0;margin-top:15px;max-width:460px;border-top:1px solid var(--psx-soft)}',
      '.psx-link,.psx-work-actions [data-miq-launch]{display:flex!important;align-items:center!important;justify-content:space-between!important;min-height:46px!important;width:100%!important;appearance:none;border:0!important;border-bottom:1px solid var(--psx-soft)!important;background:transparent!important;color:#292823!important;border-radius:0!important;padding:0 2px!important;font:600 11.5px/1.2 "IBM Plex Sans",sans-serif!important;cursor:pointer;white-space:normal!important;text-align:left;touch-action:manipulation}',
      '.psx-link:after,.psx-work-actions [data-miq-launch]:after{content:"→";font-size:14px;font-weight:500;color:var(--psx-faint)}',
      '.psx-link:focus-visible,.psx-work-actions [data-miq-launch]:focus-visible{outline:2px solid var(--psx-ink);outline-offset:2px}',

      /* Leasing Work: mobile first, no horizontal dependence. */

      /* Conversations: same operating grammar as Leasing Work. */
      '#intelStrip.psx-surface-conversations .psx-conv-root{width:min(100%,1080px)!important;max-width:none!important;margin-inline:auto!important;background:transparent!important;box-shadow:none!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-root:not(.psx-conv-board){border:0!important;padding:0!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-page-head{width:min(100%,1080px);margin:0 auto 18px}',
      '#intelStrip.psx-surface-conversations .psx-conv-page-title{font-family:"Fraunces",Georgia,serif!important;font-size:34px!important;font-weight:500!important;line-height:1!important;letter-spacing:-.04em!important;color:var(--psx-ink)!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-page-sub{max-width:42rem;margin-top:7px!important;font-size:12.5px!important;line-height:1.5!important;color:var(--psx-muted)!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-board{position:relative!important;width:100%!important;border:1px solid var(--psx-line)!important;border-radius:18px!important;background:#fff!important;box-shadow:none!important;padding:20px 18px 4px!important;overflow:hidden!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-inner-label{display:none!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-live-wrap{height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-live{position:absolute!important;top:18px!important;right:18px!important;display:inline-flex!important;align-items:center!important;min-height:24px!important;border:1px solid #bfd6cc!important;border-radius:999px!important;padding:0 9px!important;background:var(--psx-green-soft)!important;color:var(--psx-green)!important;font:600 8px/1.2 "IBM Plex Mono",monospace!important;letter-spacing:.08em!important;text-transform:uppercase!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-summarybar{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:12px!important;align-items:end!important;padding-right:58px!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-summary{margin:0!important;font-family:"Fraunces",Georgia,serif!important;font-size:25px!important;font-weight:500!important;line-height:1.05!important;letter-spacing:-.035em!important;color:var(--psx-ink)!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-refresh{display:inline-flex!important;align-items:center!important;min-height:40px!important;border:0!important;background:transparent!important;padding:0 2px!important;color:var(--psx-muted)!important;font:600 10px/1.2 "IBM Plex Sans",sans-serif!important;text-decoration:none!important;cursor:pointer!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-filters{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:0!important;margin:18px 0 0!important;border-top:1px solid var(--psx-soft)!important;border-bottom:1px solid var(--psx-soft)!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-filter{display:flex!important;align-items:center!important;justify-content:flex-start!important;min-height:44px!important;appearance:none!important;border:0!important;border-bottom:2px solid transparent!important;border-radius:0!important;background:transparent!important;padding:0 10px!important;color:var(--psx-muted)!important;font:600 10.5px/1.2 "IBM Plex Sans",sans-serif!important;box-shadow:none!important;cursor:pointer!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-filter.psx-active,#intelStrip.psx-surface-conversations .psx-conv-filter[aria-selected="true"]{border-bottom-color:var(--psx-ink)!important;color:var(--psx-ink)!important;background:transparent!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-note{margin:0!important;padding:12px 0 10px!important;font-size:12px!important;line-height:1.45!important;color:var(--psx-muted)!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-list{border-top:1px solid var(--psx-soft)!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-row{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:10px!important;align-items:center!important;margin:0!important;padding:16px 0!important;border:0!important;border-top:1px solid var(--psx-soft)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;min-height:0!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-row:first-child{border-top:0!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-main{min-width:0!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-person{font-size:14px!important;font-weight:650!important;line-height:1.3!important;color:var(--psx-ink)!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-stage{display:none!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-status{display:inline-flex!important;align-items:center!important;min-height:22px!important;border:1px solid #e5c991!important;border-radius:999px!important;padding:0 7px!important;background:#fffaf0!important;color:#8a601d!important;font:600 8px/1.2 "IBM Plex Mono",monospace!important;letter-spacing:.05em!important;text-transform:uppercase!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-status.psx-danger{border-color:#e1b9b2!important;background:#fff5f3!important;color:#9a352a!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-last,#intelStrip.psx-surface-conversations .psx-conv-ai{font-size:11px!important;line-height:1.45!important;color:var(--psx-muted)!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-age{font:600 9px/1.2 "IBM Plex Mono",monospace!important;letter-spacing:.03em!important;color:#96681d!important;white-space:nowrap!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-action-cell{width:100%!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-action{display:flex!important;align-items:center!important;justify-content:center!important;min-height:44px!important;width:100%!important;border:1px solid var(--psx-ink)!important;border-radius:999px!important;background:var(--psx-ink)!important;color:#fff!important;padding:10px 14px!important;font:600 11px/1.2 "IBM Plex Sans",sans-serif!important;box-shadow:none!important;cursor:pointer!important;white-space:nowrap!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-action.psx-secondary{background:#fff!important;color:var(--psx-ink)!important}',
      '#intelStrip.psx-surface-conversations .psx-conv-action:focus-visible,#intelStrip.psx-surface-conversations .psx-conv-filter:focus-visible,#intelStrip.psx-surface-conversations .psx-conv-refresh:focus-visible{outline:2px solid var(--psx-ink)!important;outline-offset:2px!important}',
      '@media(min-width:560px){#intelStrip.psx-surface-conversations .psx-conv-filters{display:flex!important;flex-wrap:wrap!important}#intelStrip.psx-surface-conversations .psx-conv-filter{padding-inline:14px!important}}',
      '@media(min-width:760px){#intelStrip.psx-surface-conversations .psx-conv-board{padding:23px 24px 5px!important;border-radius:20px!important;box-shadow:0 12px 30px rgba(33,28,18,.055)!important}#intelStrip.psx-surface-conversations .psx-conv-page-title{font-size:42px!important}#intelStrip.psx-surface-conversations .psx-conv-summary{font-size:30px!important}#intelStrip.psx-surface-conversations .psx-conv-row{grid-template-columns:minmax(0,1fr) auto!important;gap:22px!important;padding:17px 0!important}#intelStrip.psx-surface-conversations .psx-conv-action-cell{width:auto!important}#intelStrip.psx-surface-conversations .psx-conv-action{width:auto!important;min-height:38px!important;padding:9px 14px!important;font-size:10.5px!important}}',

      /* Existing deeper surfaces keep one width and no horizontal overflow. */
      '#intelStrip.psx-surface-tours .tours-day,#intelStrip.psx-surface-conversations .lconv-page,#intelStrip.psx-surface-applications #psReviewBody,#intelStrip.psx-surface-applications #psReviewDetail{width:min(100%,1080px);margin-inline:auto}',
      '#intelStrip.psx-surface-applications .ps-ar-row{font-family:"IBM Plex Sans",system-ui,sans-serif}',
      '#intelStrip.psx-surface-applications input,#intelStrip.psx-surface-applications select,#intelStrip.psx-surface-applications textarea{font-size:16px}',

      /* Small phone refinements. */

      /* Tablet: still one priority column, more breathing room. */

      /* Desktop: expand the same mobile order, do not invent a different workflow. */

      '@media(hover:hover) and (pointer:fine){.psx-leasing-grid>.psx-card{transition:border-color .14s ease,box-shadow .14s ease}.psx-leasing-grid>.psx-card:hover{border-color:#aebfb7!important;box-shadow:0 12px 30px rgba(33,28,18,.075)!important}.psx-link:hover,.psx-work-actions [data-miq-launch]:hover{color:var(--psx-green)!important}}',
      '@media(prefers-reduced-motion:reduce){.psx-leasing-grid>.psx-card{transition:none!important}}'
,
      /* Leasing Work final specificity — preserve the lifecycle, refine the object. */
,
      /* ── S3: 2x2 operating grid + home summaries + Market & Pricing strip ── */
      '.psx-leasing-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}',
      '@media(max-width:820px){.psx-leasing-grid{grid-template-columns:1fr!important}}',
      '.psx-fact{margin:10px 0 2px;font-size:13px;color:#444;line-height:1.45}',
      '.psx-fact b{font-size:20px;font-weight:700;color:#111;margin-right:7px}',
      '.psx-fact .unavail,.le-briefing .lb-muted{color:#8a6d24}',
      '.psx-tour-preview .psx-tours-retry{pointer-events:auto}',
      '.psx-tours-retry,.lb-retry{appearance:none;border:1px solid #deddda;background:#fff;border-radius:999px;padding:3px 11px;font:inherit;font-size:12px;cursor:pointer}',
      '.le-briefing{display:flex;flex-wrap:wrap;gap:6px 20px;align-items:baseline;margin:2px 0 14px}',
      '.le-briefing .lb-k{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#777;font-weight:700;flex-basis:100%}',
      '.le-briefing .lb-f{font-size:14px;color:#111}',
      '.le-briefing .lb-f b{font-size:18px;font-weight:700}',
      '.le-market-strip{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;text-align:left;cursor:pointer;appearance:none;font:inherit;color:#111;background:#fff;border:1px solid #deddda;border-radius:18px;padding:16px 20px;margin-top:12px}',
      '.le-market-strip .ms-kicker{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#777;font-weight:700}',
      '.le-market-strip h3{margin:2px 0 3px;font-size:16px}',
      '.le-market-strip .ms-fact{font-size:13px;color:#444}',
      '.le-market-strip .ms-fact b{font-weight:700;color:#111}',
      '.le-market-strip i{font-style:normal;font-size:20px;flex:0 0 auto}',
      '@media(hover:hover){.le-market-strip:hover{border-color:#aebfb7}}'
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
      // NEVER for a signed-in operator. ?ps_demo_tours=1 painted Jordan Lee,
      // Maya Thompson and Carlos Ramirez onto a REAL operator's Tours card —
      // sample people in an authenticated session. Preview-only means
      // preview-only: any live session wins over the query flag.
      if(window.__psLive && typeof window.__psLive.hasSession==='function' && window.__psLive.hasSession()) return false;
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
    /* CAPTURE OWED outranks everything else this pill can say.
       "Scheduled" on a tour that already happened is not wrong so much as
       useless — the operator needs to know the day is waiting on them, and
       this is the only slot on the row that can say so.

       It is a SIGNAL, not a button. The preview list is deliberately
       pointer-events:none so it never becomes a second interactive system,
       with the person's name as the one exception. That rule is worth more
       than saving a tap: the name is already the door, and the Person Card
       it opens is where the capture actually lives. So the row tells you
       there is work; it does not try to be the place you do it.

       The server decides this (capture_is_work / capture_state); the row
       does not re-derive it. */
    if(t && t.capture_is_work){
      var cs=String((t&&t.capture_state)||'');
      if(cs==='judgment_owed') return { text:'Needs your read', tone:'capture' };
      if(cs==='overdue')       return { text:'Capture owed',    tone:'capture' };
      if(cs==='untrackable')   return { text:'No time on record', tone:'warn' };
    }
    if(t && t.host_unassigned) return { text:'Unassigned', tone:'warn' };
    var s=String((t&&t.status)||'').toLowerCase();
    if(s==='checked_in') return { text:'Checked in', tone:'' };
    if(s==='confirmed_by_prospect') return { text:'Confirmed', tone:'' };
    if(s==='rescheduled') return { text:'Rescheduled', tone:'warn' };
    if(s==='scheduled') return { text:'Scheduled', tone:'' };
    return { text: s ? s.replace(/_/g,' ') : 'Scheduled', tone:'' };
  }
  /* Group by the property's calendar day. Today stays first and complete;
     later days are summarised so the next hour is never buried under Thursday. */
  function tourDayKey(iso){
    if(!iso) return '';
    try{ var d=new Date(iso); return isNaN(d.getTime())?'':d.toDateString(); }catch(_){ return ''; }
  }
  function tourDayLabel(iso, todayKey){
    var k=tourDayKey(iso); if(!k) return 'Unscheduled';
    if(k===todayKey) return 'Today';
    try{
      var d=new Date(iso), t=new Date();
      if(k===new Date(t.getTime()+86400000).toDateString()) return 'Tomorrow';
      return d.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
    }catch(_){ return 'Upcoming'; }
  }
  function groupToursByDay(rows){
    // SERVER DAYS FIRST. Each row carries operating_date resolved in the
    // property's timezone; bucketing on browser-local toDateString() puts a
    // 9pm tour on the wrong day for any operator outside that timezone.
    var win=liveTours.win||null;
    if(win && win.today_date){
      var sOrder=[], sByKey={};
      rows.forEach(function(t){
        var k=String((t&&t.operating_date)||'')||'unscheduled';
        if(!sByKey[k]){
          var lbl='Upcoming';
          if(k===win.today_date) lbl='Today';
          else{ try{ lbl=new Date(k+'T12:00:00').toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' }); }catch(_){ } }
          sByKey[k]={ key:k, label:lbl, isToday:k===win.today_date, rows:[] }; sOrder.push(k);
        }
        sByKey[k].rows.push(t);
      });
      sOrder.sort();
      return sOrder.map(function(k){ return sByKey[k]; });
    }
    var todayKey=new Date().toDateString(), order=[], byKey={};
    rows.forEach(function(t){
      var iso=(t&&(t.scheduled_for||t.starts_at))||null, k=tourDayKey(iso)||'unscheduled';
      if(!byKey[k]){ byKey[k]={ key:k, label:tourDayLabel(iso, todayKey), isToday:k===todayKey, rows:[] }; order.push(k); }
      byKey[k].rows.push(t);
    });
    return order.map(function(k){ return byKey[k]; });
  }

  function liveTourPreviewHTML(){
    if(liveTours.state==='loading')
      return '<div class="psx-tour-preview-head"><span class="psx-tour-preview-label">Today</span></div>'
           + '<div class="psx-tour-empty">Loading today\u2019s schedule\u2026</div>';
    if(liveTours.state==='error')
      return '<div class="psx-tour-preview-head"><span class="psx-tour-preview-label">Today</span></div>'
           + '<div class="psx-tour-empty">Schedule unavailable. '
           + '<button type="button" class="psx-tours-retry" onclick="window.__psLeasingHome&&window.__psLeasingHome.retryTours()">Retry</button></div>';
    var rows=liveTours.rows||[];
    if(!rows.length)
      return '<div class="psx-tour-preview-head"><span class="psx-tour-preview-label">Today</span></div>'
           + '<div class="psx-tour-empty">No tours scheduled today or in the week ahead.</div>';
    var days=groupToursByDay(rows);
    var today=days.filter(function(d){ return d.isToday; })[0] || null;
    var ahead=days.filter(function(d){ return !d.isToday; });
    var todayRows=today?today.rows:[];
    var shown=todayRows.slice(0,4);
    var more=todayRows.length>shown.length ? (todayRows.length-shown.length) : 0;

    /* The week ahead: one compact column per day, each name still a door. */
    var aheadHtml='';
    if(ahead.length){
      aheadHtml='<div class="psx-tour-week">'+ahead.slice(0,6).map(function(d){
        var names=d.rows.slice(0,3).map(function(t){
          var pid=(t&&t.person_id)||'', nm=(t&&t.prospect_name)||'Unnamed';
          return pid
            ? '<button type="button" class="psx-week-name psx-person-link" data-psx-person="'+esc(pid)
              + '" data-psx-lead="'+esc((t&&t.lead_id)||'')+'" data-psx-name="'+esc(nm)+'">'+esc(nm)+'</button>'
            : '<span class="psx-week-name">'+esc(nm)+'</span>';
        }).join('');
        var extra=d.rows.length>3?('<span class="psx-week-more">+'+(d.rows.length-3)+'</span>'):'';
        return '<div class="psx-tour-day"><div class="psx-tour-day-head">'+esc(d.label)
          + '<span class="psx-tour-day-count">'+d.rows.length+'</span></div>'
          + '<div class="psx-tour-day-names">'+names+extra+'</div></div>';
      }).join('')+'</div>';
    }

    var head='<div class="psx-tour-preview-head"><span class="psx-tour-preview-label">Today \u00b7 '
      + todayRows.length + (todayRows.length===1?' tour':' tours') + '</span>'
      + (more?('<span class="psx-tour-preview-badge">+'+more+' more today</span>'):'')
      + '</div>';
    if(!todayRows.length){
      return head + '<div class="psx-tour-empty">No tours scheduled today.</div>' + aheadHtml;
    }
    return head + '<div class="psx-tour-preview-list">'
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
        }).join('')+'</div>' + aheadHtml;
  }
  function ensureLiveTours(){
    if(liveTours.state!=='idle') return;
    var L=(typeof window!=='undefined') ? window.__psLive : null;
    if(!L || typeof L.loadResource!=='function'){ liveTours.state='error'; return; }
    liveTours.state='loading';
    /* The week ahead, not just today: an operator preparing the day also needs
       to see what is coming. Server clamps the window; 6 = today + 6 = one week. */
    L.loadResource('toursToday',{ days: 6 }).then(function(out){
      var d=(out&&out.data)?out.data:out;
      liveTours.rows=Array.isArray(d&&d.tours)?d.tours:[];
      // The server's window: today_date + per-day counts resolved in the
      // PROPERTY timezone. Kept so day bucketing never re-derives the
      // calendar in browser-local time when the server already answered.
      liveTours.win=(d&&d.window&&typeof d.window==='object')?d.window:null;
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
    if(host.innerHTML!==html) host.innerHTML=html;
  }

  function installDemoTourPreview(card){
    if(!card) return;
    var existing=card.querySelector('[data-psx-demo-tours]');
    if(!demoTourPreviewEnabled()){
      if(existing) existing.remove();
      installLiveTourPreview(card);
      return;
    }
    var lv=card.querySelector('[data-psx-live-tours]');
    if(lv) lv.remove();
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

  /* ── S3 HOME SUMMARIES — server-authored facts only ──────────────────────
     One state machine over the four liveRequired reads whose destinations the
     doors open. The card copy follows the production ruling: "N need
     attention" (never "need you"), stage counts verbatim from the desk read,
     renewal decisions verbatim from the renewals read. A failed read renders
     an unavailable line for THAT card — never a zero, never a fixture. */
  var liveSum={ state:'idle', data:{}, err:{} };
  var SUM_KEYS=['conversationQueue','leasingDesk','renewals','availabilityCanonical'];
  function fetchSummary(key){
    var L=window.__psLive;
    if(!L||typeof L.loadResource!=='function'){ liveSum.err[key]='no-live'; return Promise.resolve(); }
    return L.loadResource(key,{}).then(function(out){
      liveSum.data[key]=(out&&out.data)?out.data:out; delete liveSum.err[key];
    }).catch(function(e){ liveSum.err[key]=(e&&e.message)||'failed'; });
  }
  function ensureLiveSummaries(force){
    if(liveSum.state==='loading') return;
    if(!force && liveSum.state!=='idle') return;
    liveSum.state='loading';
    Promise.all(SUM_KEYS.map(fetchSummary)).then(function(){ liveSum.state='ready'; schedule(); });
  }
  function sumNum(v){ return (v==null||isNaN(Number(v)))?null:Number(v); }
  function factHost(card,name){
    if(!card) return null;
    var h=card.querySelector('[data-psx-fact="'+name+'"]');
    if(!h){ h=document.createElement('div'); h.className='psx-fact'; h.setAttribute('data-psx-fact',name);
      var open=card.querySelector('.maint-card-open'); card.insertBefore(h,open||null); }
    return h;
  }
  function setHTML(node,html){ if(node && node.innerHTML!==html) node.innerHTML=html; }
  function todayTourCount(){
    if(liveTours.state==='error') return null;
    if(liveTours.state!=='ready') return undefined;   // still loading
    var win=liveTours.win;
    if(win && win.today_date){
      var day=(win.days||[]).filter(function(d){ return d && d.date===win.today_date; })[0];
      if(day && day.tour_count!=null) return sumNum(day.tour_count);
      return liveTours.rows.filter(function(t){ return t && t.operating_date===win.today_date; }).length;
    }
    var k=new Date().toDateString();
    return liveTours.rows.filter(function(t){
      var iso=(t&&(t.scheduled_for||t.starts_at))||null;
      try{ return iso && new Date(iso).toDateString()===k; }catch(_){ return false; }
    }).length;
  }
  function renderSummaries(conv,work,ren){
    if(liveSum.state==='idle') return;
    var loading=liveSum.state==='loading';
    // Conversations — "N need attention", by ruling never "need you".
    var cq=liveSum.data.conversationQueue, ob=cq&&cq.counts&&cq.counts.operating_buckets;
    var na=ob?sumNum(ob.needs_attention):null, ai=ob?sumNum(ob.ai_handling):null;
    setHTML(factHost(conv,'conversations'),
      liveSum.err.conversationQueue ? '<span class="unavail">Conversation status unavailable.</span>'
      : loading&&!ob ? '&nbsp;'
      : na==null ? '<span class="unavail">Conversation status unavailable.</span>'
      : na===0 ? 'No conversations need attention.'+(ai?' AI is handling '+ai+'.':'')
      : '<b>'+na+'</b>need attention'+(ai!=null?' \u00b7 AI handling '+ai:''));
    // Leasing Work — the desk's own stage counts.
    var dk=liveSum.data.leasingDesk, sc=dk&&dk.stage_counts, ct=(dk&&dk.counts)||{};
    var total=sc?sumNum(sc.total):null;
    var parts=[];
    if(sc){ if(sumNum(sc.post_tour)) parts.push(sc.post_tour+' post-tour');
            if(sumNum(sc.application)) parts.push(sc.application+' application');
            if(sumNum(sc.lease_sent)) parts.push(sc.lease_sent+' lease sent'); }
    if(sumNum(ct.overdue)) parts.push('<span class="unavail">'+ct.overdue+' overdue</span>');
    setHTML(factHost(work,'work'),
      liveSum.err.leasingDesk ? '<span class="unavail">Leasing work unavailable.</span>'
      : loading&&!sc ? '&nbsp;'
      : total==null ? '<span class="unavail">Leasing work unavailable.</span>'
      : total===0 ? 'No new-leasing work needs action.'
      : '<b>'+total+'</b>next moves'+(parts.length?' \u00b7 '+parts.join(' \u00b7 '):''));
    // Renewals — open decisions + the 90-day horizon.
    var rn=liveSum.data.renewals, rc=rn?sumNum(rn.count):null;
    var hz=rn&&rn.totals?sumNum(rn.totals.expiring_in_horizon):null;
    setHTML(factHost(ren,'renewals'),
      liveSum.err.renewals ? '<span class="unavail">Renewals unavailable.</span>'
      : loading&&!rn ? '&nbsp;'
      : rc==null ? '<span class="unavail">Renewals unavailable.</span>'
      : rc===0 ? 'No renewal actions are due.'
      : '<b>'+rc+'</b>open decisions'+(hz!=null?' \u00b7 '+hz+' expire within 90 days':''));
    // Market & Pricing strip — anchored on live Availability.
    var av=liveSum.data.availabilityCanonical, hd=av&&av.headline;
    var mk=document.getElementById('leMarketFact');
    if(mk) setHTML(mk,
      liveSum.err.availabilityCanonical ? '<span class="unavail">Availability unavailable.</span>'
      : loading&&!hd ? 'Availability, rents, concessions and market evidence.'
      : !hd||sumNum(hd.marketable_now)==null ? '<span class="unavail">Availability unavailable.</span>'
      : '<b>'+hd.marketable_now+'</b> marketable now \u00b7 '+(sumNum(hd.expected_within_horizon)!=null?hd.expected_within_horizon:0)+' coming open');
    // TODAY IN LEASING — facts only. No browser-authored next action.
    var brief=document.querySelector('[data-le-briefing]');
    if(brief){
      var cells=[], anyErr=false, allZero=true, anyLoading=false;
      var tc=todayTourCount();
      if(tc===undefined){ anyLoading=true; }
      else if(tc===null){ anyErr=true; cells.push('<span class="lb-f lb-muted">Tours unavailable</span>'); }
      else{ if(tc!==0) allZero=false; cells.push('<span class="lb-f"><b>'+tc+'</b> tour'+(tc===1?'':'s')+' today</span>'); }
      if(liveSum.err.leasingDesk||total==null){ anyErr=true; cells.push('<span class="lb-f lb-muted">Leasing work unavailable</span>'); }
      else{ if(total!==0) allZero=false; cells.push('<span class="lb-f"><b>'+total+'</b> leasing work item'+(total===1?'':'s')+'</span>'); }
      if(liveSum.err.renewals||rc==null){ anyErr=true; cells.push('<span class="lb-f lb-muted">Renewals unavailable</span>'); }
      else{ if(rc!==0) allZero=false; cells.push('<span class="lb-f"><b>'+rc+'</b> renewal decision'+(rc===1?'':'s')+'</span>'); }
      var body;
      if(anyLoading&&loading) body='<span class="lb-f lb-muted">Loading\u2026</span>';
      else if(anyErr&&cells.length===3&&/unavailable/.test(cells.join('')) && liveSum.err.conversationQueue && liveSum.err.leasingDesk && liveSum.err.renewals)
        body='<span class="lb-f lb-muted">Leasing briefing unavailable.</span> <button type="button" class="lb-retry" onclick="window.__psLeasingHome&&window.__psLeasingHome.refresh()">Retry</button>';
      else body=cells.join('')+(allZero&&!anyErr?' <span class="lb-f lb-muted">Nothing needs immediate attention.</span>':'')
        +(anyErr?' <button type="button" class="lb-retry" onclick="window.__psLeasingHome&&window.__psLeasingHome.refresh()">Retry</button>':'');
      var html='<span class="lb-k">Today in Leasing</span>'+body;
      if(brief.innerHTML!==html) brief.innerHTML=html;
    }
  }
  window.__psLeasingHome={
    _sum:liveSum, _tours:liveTours,
    applySummaries:function(data){ data=data||{}; SUM_KEYS.forEach(function(k){ if(k in data){ liveSum.data[k]=data[k]; delete liveSum.err[k]; } }); liveSum.state='ready'; schedule(); },
    applyFailure:function(keys){ (keys||SUM_KEYS).forEach(function(k){ liveSum.err[k]='supplied-failure'; delete liveSum.data[k]; }); liveSum.state='ready'; schedule(); },
    refresh:function(){ liveSum.state='idle'; liveSum.err={}; liveTours.state='idle'; ensureLiveSummaries(true); ensureLiveTours(); },
    retryTours:function(){ liveTours.state='idle'; ensureLiveTours(); }
  };

  function enhanceHome(strip){
    var cards=Array.prototype.slice.call(strip.querySelectorAll('.le-auth-card,.maint-command-card'));
    var tours=findCard(cards,'tours');
    var work=findCard(cards,'followups');
    var conversations=findCard(cards,'conversations');
    var renewals=findCard(cards,'renewals');
    if(!tours || !work || !conversations || !renewals) return false;
    var grid=tours.closest('.maint-primary-grid');
    if(!grid || work.closest('.maint-primary-grid')!==grid || conversations.closest('.maint-primary-grid')!==grid) return false;

    strip.classList.add('psx-leasing-home');
    strip.classList.remove('psx-leasing-work','psx-surface-tours','psx-surface-conversations','psx-surface-applications');
    grid.classList.remove('le-four','le-three');
    grid.classList.add('psx-leasing-grid');

    decorateHomeCard(tours,'psx-tours','Today · next 7 days','Tours','See today’s schedule and the week ahead.','Open tour schedule →','Tours. Open the tour schedule.');
    installDemoTourPreview(tours);
    decorateHomeCard(work,'psx-work','Post-tour · application · lease sent','Leasing Work','Move completed tours through application and lease execution.','Open leasing work →','Leasing Work. Post-tour, application, and lease-sent stages.');
    decorateHomeCard(conversations,'psx-conversations','AI supervised','Conversations','AI handles first contact. Step in when needed.','Open conversations →','Conversations. Supervise AI and intervene when needed.');
    decorateHomeCard(renewals,'psx-renewals','Expirations · offers · decisions','Renewals','Retain current residents through renewal decisions.','Open renewals →','Renewals. Open renewal decisions.');

    if(grid.getAttribute('data-psx-home-applied')!=='1'){
      // FINAL 2x2 reading order: Tours, Conversations, Leasing Work, Renewals.
      [tours,conversations,work,renewals].forEach(function(card){ if(card.parentNode===grid) grid.appendChild(card); });
      Array.prototype.slice.call(grid.children).forEach(function(card){ if(card!==tours && card!==work && card!==conversations && card!==renewals) card.remove(); });
      grid.setAttribute('data-psx-home-applied','1');
    }

    /* Applications Review REMAINS REACHABLE (production: 7 applications vs 3
       application-stage desk rows — populations differ, so the door stays
       until Leasing Work proves parity). The old shell removed this row. */
    ensureLiveSummaries();
    renderSummaries(conversations,work,renewals);
    return true;
  }


  function enhanceWork(strip){
    var root=strip.querySelector('.pslh'); if(!root) return false;
    strip.classList.add('psx-leasing-work');
    strip.classList.remove('psx-leasing-home','psx-surface-tours','psx-surface-conversations','psx-surface-applications');

    // Presentation belongs to followups-door.js. This layer only retires stale
    // competing Applications doors left by older shells.
    var retiredApplicationDoor='data-'+'psx-applications';
    Array.prototype.slice.call(root.querySelectorAll('.psx-work-actions')).forEach(function(node){
      Array.prototype.slice.call(node.querySelectorAll('button,a,[role="button"]')).forEach(function(control){
        if(/^all applications$/i.test(String(control.textContent||'').trim()) || control.hasAttribute(retiredApplicationDoor)) control.remove();
      });
      if(!node.children.length) node.remove();
    });
    Array.prototype.slice.call(root.querySelectorAll('['+retiredApplicationDoor+']')).forEach(function(node){node.remove();});
    return true;
  }

  function psxText(node){
    return String(node && node.textContent || '').replace(/\s+/g,' ').trim();
  }

  function psxLeafMatches(root,regex){
    if(!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll('*')).filter(function(node){
      return node.children.length===0 && regex.test(psxText(node));
    });
  }

  function psxDirectChild(ancestor,node){
    var current=node;
    while(current && current.parentElement && current.parentElement!==ancestor) current=current.parentElement;
    return current && current.parentElement===ancestor ? current : null;
  }

  function psxBoardCandidate(root){
    var candidates=[root].concat(Array.prototype.slice.call(root.querySelectorAll('main,section,article,div')));
    var best=root,bestScore=-1,bestLength=Infinity;
    candidates.forEach(function(node){
      var copy=psxText(node).toLowerCase();
      if(copy.length<20) return;
      var filters=Array.prototype.slice.call(node.querySelectorAll('button,a,[role="button"]')).filter(function(b){
        return /^(needs you|ai handling|you own|waiting|closed)(\s+\d+)?$/i.test(psxText(b));
      }).length;
      var actions=Array.prototype.slice.call(node.querySelectorAll('button,a,[role="button"]')).filter(function(b){
        return /^(review reply|review conversation|open conversation|take over|reply)$/i.test(psxText(b));
      }).length;
      var score=(/active conversations/.test(copy)?4:0)+(/need you/.test(copy)?3:0)+(filters>=3?5:0)+(actions?3:0);
      if(score>bestScore || (score===bestScore && copy.length<bestLength)){
        best=node; bestScore=score; bestLength=copy.length;
      }
    });
    return best;
  }

  function psxConversationRow(action,board){
    var node=action.parentElement,chosen=null;
    while(node && node!==board){
      var copy=psxText(node);
      var extra=copy.length-psxText(action).length;
      var actionCount=Array.prototype.slice.call(node.querySelectorAll('button,a,[role="button"]')).filter(function(b){
        return /^(review reply|review conversation|open conversation|take over|reply)$/i.test(psxText(b));
      }).length;
      if(actionCount===1 && extra>16 && copy.length<700 && /(last replied|waiting \d+|ai drafted|no human has reviewed|in conversation)/i.test(copy)){
        chosen=node;
        break;
      }
      node=node.parentElement;
    }
    return chosen;
  }

  function psxPersonIdFromRow(row,person){
    var nodes=[person,row];
    if(row) nodes=nodes.concat(Array.prototype.slice.call(row.querySelectorAll('[data-person-id],[data-person],[data-ps-person],[data-ps-person-id]')));
    var attrs=['data-person-id','data-person','data-ps-person','data-ps-person-id'];
    for(var i=0;i<nodes.length;i++){
      var node=nodes[i]; if(!node||!node.getAttribute) continue;
      for(var j=0;j<attrs.length;j++){
        var id=node.getAttribute(attrs[j]); if(id) return id;
      }
    }
    return null;
  }

  function psxPromotePersonDoor(person,row,source){
    if(!person) return;
    var id=psxPersonIdFromRow(row,person); if(!id) return;
    person.classList.add('psx-canonical-person-door');
    person.setAttribute('role','button');
    person.setAttribute('tabindex','0');
    person.setAttribute('data-psx-canonical-person',id);
    person.setAttribute('data-psx-person-source',source||'leasing');
  }

  function psxClassConversationRow(row,action){
    if(!row || !action) return;
    row.classList.add('psx-conv-row');
    action.classList.add('psx-conv-action');
    if(/review conversation/i.test(psxText(action))) action.classList.add('psx-secondary');

    var actionCell=psxDirectChild(row,action);
    if(actionCell) actionCell.classList.add('psx-conv-action-cell');
    var direct=Array.prototype.slice.call(row.children);
    var main=direct.filter(function(child){ return child!==actionCell; }).sort(function(a,b){ return psxText(b).length-psxText(a).length; })[0];
    if(main) main.classList.add('psx-conv-main');

    var nameCandidates=Array.prototype.slice.call(row.querySelectorAll('h1,h2,h3,h4,h5,strong,b')).filter(function(node){
      var copy=psxText(node);
      return copy && copy.length<70 && !/(in conversation|approval needed|needs assignment|waiting \d+|review reply|review conversation)/i.test(copy);
    });
    var person=nameCandidates[0]||psxLeafMatches(row,/^.{2,69}$/).filter(function(node){
      var copy=psxText(node);
      return !/(in conversation|approval needed|needs assignment|waiting \d+|review reply|review conversation|last replied|ai drafted|no human has reviewed)/i.test(copy);
    })[0]||null;
    if(person){ person.classList.add('psx-conv-person'); psxPromotePersonDoor(person,row,'leasing_conversations'); }

    psxLeafMatches(row,/^in conversation$/i).forEach(function(node){ node.classList.add('psx-conv-stage'); });
    psxLeafMatches(row,/^approval needed$/i).forEach(function(node){ node.classList.add('psx-conv-status'); });
    psxLeafMatches(row,/^needs assignment$/i).forEach(function(node){ node.classList.add('psx-conv-status','psx-danger'); });
    psxLeafMatches(row,/^waiting\s+\d+\s+days?$/i).forEach(function(node){ node.classList.add('psx-conv-age'); });
    psxLeafMatches(row,/last replied/i).forEach(function(node){ if(psxText(node).length<120) node.classList.add('psx-conv-last'); });
    psxLeafMatches(row,/ai drafted|no human has reviewed/i).forEach(function(node){ if(psxText(node).length<180) node.classList.add('psx-conv-ai'); });
  }

  function enhanceConversations(strip){
    var root=strip.querySelector('.lconv-page,#psLiveLeasingEntry');
    if(!root) return false;
    strip.classList.add('psx-surface-conversations');
    strip.classList.remove('psx-leasing-home','psx-leasing-work','psx-surface-tours','psx-surface-applications');
    root.classList.add('psx-conv-root');

    var board=psxBoardCandidate(root);
    if(board) board.classList.add('psx-conv-board');

    var titles=Array.prototype.slice.call(strip.querySelectorAll('h1,h2,h3,h4,div,span')).filter(function(node){
      return psxText(node).toLowerCase()==='leasing conversations' && (node.children.length===0 || /^H[1-4]$/.test(node.tagName||''));
    });
    titles.forEach(function(node){
      if(board && board.contains(node)){
        node.classList.add('psx-conv-inner-label');
      }else{
        if(node.textContent!=='Conversations') node.textContent='Conversations';
        node.classList.add('psx-conv-page-title');
        var parent=node.parentElement;
        while(parent && parent!==strip && psxText(parent).length<420){
          if(/supervise the ai agent|ai handles first contact/i.test(psxText(parent))){ parent.classList.add('psx-conv-page-head'); break; }
          parent=parent.parentElement;
        }
      }
    });

    psxLeafMatches(strip,/^supervise the ai agent until you trust it\.?$/i).forEach(function(node){
      node.textContent='AI handles first contact. This queue shows the conversations that need a person.';
      node.classList.add('psx-conv-page-sub');
    });
    psxLeafMatches(strip,/^ai handles first contact\. this queue shows the conversations that need a person\.?$/i).forEach(function(node){ node.classList.add('psx-conv-page-sub'); });

    if(board){
      psxLeafMatches(board,/^live$/i).forEach(function(node){
        node.classList.add('psx-conv-live');
        if(node.parentElement) node.parentElement.classList.add('psx-conv-live-wrap');
      });
      var summaryNode=Array.prototype.slice.call(board.querySelectorAll('h1,h2,h3,h4,strong,b,div')).filter(function(node){
        var copy=psxText(node).toLowerCase();
        return copy.length<140 && /active conversations/.test(copy) && /need you/.test(copy);
      }).sort(function(a,b){ return psxText(a).length-psxText(b).length; })[0]||null;
      if(summaryNode){
        summaryNode.classList.add('psx-conv-summary');
        if(summaryNode.parentElement) summaryNode.parentElement.classList.add('psx-conv-summarybar');
      }

      var controls=Array.prototype.slice.call(board.querySelectorAll('button,a,[role="button"]'));
      controls.filter(function(node){ return /^refresh$/i.test(psxText(node)); }).forEach(function(node){ node.classList.add('psx-conv-refresh'); });
      var filters=controls.filter(function(node){ return /^(needs you|ai handling|you own|waiting|closed)(\s+\d+)?$/i.test(psxText(node)); });
      filters.forEach(function(node,index){
        node.classList.add('psx-conv-filter');
        if(node.getAttribute('aria-selected')==='true' || /(^|\s)(active|selected)(\s|$)/i.test(node.className) || (!filters.some(function(f){ return f.getAttribute('aria-selected')==='true' || /(^|\s)(active|selected)(\s|$)/i.test(f.className); }) && index===0)) node.classList.add('psx-active');
      });
      if(filters.length){
        var filterParent=filters[0].parentElement;
        if(filterParent && filters.every(function(node){ return node.parentElement===filterParent; })) filterParent.classList.add('psx-conv-filters');
      }

      psxLeafMatches(board,/^waiting on your judgment\.?$/i).forEach(function(node){
        node.textContent='Human review is required before the next reply.';
        node.classList.add('psx-conv-note');
      });
      psxLeafMatches(board,/^human review is required before the next reply\.?$/i).forEach(function(node){ node.classList.add('psx-conv-note'); });

      var actions=controls.filter(function(node){ return /^(review reply|review conversation|open conversation|take over|reply)$/i.test(psxText(node)); });
      var rows=[];
      actions.forEach(function(action){
        var row=psxConversationRow(action,board);
        if(row && rows.indexOf(row)<0){ rows.push(row); psxClassConversationRow(row,action); }
      });
      if(rows.length){
        var list=rows[0].parentElement;
        while(list && list!==board && !rows.every(function(row){ return list.contains(row); })) list=list.parentElement;
        if(list) list.classList.add('psx-conv-list');
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
      if(enhanceConversations(strip)) return;
      tagOtherSurface(strip);
    }finally{ mutating=false; }
  }

  injectStyles();
  /* Tour names route through the one canonical Person × Property Card. */
  document.addEventListener('click',function(ev){
    var el=ev.target && ev.target.closest ? ev.target.closest('[data-psx-person]') : null;
    if(!el) return;
    ev.preventDefault(); ev.stopPropagation();
    var pid=el.getAttribute('data-psx-person')||'';
    if(!pid || typeof window.openPersonCard!=='function') return;
    window.openPersonCard({
      person_id: pid,
      lead_id: el.getAttribute('data-psx-lead')||null,
      name: el.getAttribute('data-psx-name')||'',
      context: 'lead',
      source: 'leasing_home_tours'
    });
  },true);
  document.addEventListener('keydown',activateCardFromKeyboard,true);
  function openCanonicalPersonDoor(node){
    var id=node&&node.getAttribute&&node.getAttribute('data-psx-canonical-person');
    if(!id || typeof window.openPersonCard!=='function') return;
    window.openPersonCard({
      person_id:id,
      name:psxText(node),
      context:'lead',
      source:node.getAttribute('data-psx-person-source')||'leasing',
      start_tab:'info'
    });
  }

  document.addEventListener('click',function(ev){
    var node=ev.target&&ev.target.closest?ev.target.closest('[data-psx-canonical-person]'):null;
    if(!node) return;
    ev.preventDefault(); ev.stopPropagation(); openCanonicalPersonDoor(node);
  },true);
  document.addEventListener('keydown',function(ev){
    var node=ev.target&&ev.target.closest?ev.target.closest('[data-psx-canonical-person]'):null;
    if(!node || (ev.key!=='Enter'&&ev.key!==' ')) return;
    ev.preventDefault(); ev.stopPropagation(); openCanonicalPersonDoor(node);
  },true);

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
