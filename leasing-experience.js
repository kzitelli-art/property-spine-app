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
,
      /* Leasing Work final specificity — preserve the lifecycle, refine the object. */
      '#intelStrip.psx-leasing-work .pslh{width:min(100%,980px)!important;max-width:980px!important;margin-inline:auto!important}',
      '#intelStrip.psx-leasing-work .pslh-head{grid-template-columns:minmax(0,1fr) auto!important;gap:34px!important;padding:4px 0 22px!important}',
      '#intelStrip.psx-leasing-work .pslh-title{font-size:48px!important;line-height:.94!important}',
      '#intelStrip.psx-leasing-work .pslh-sub{font-size:13px!important;line-height:1.5!important}',
      '#intelStrip.psx-leasing-work .pslh-tabs{margin-top:0!important;border-radius:20px!important}',
      '#intelStrip.psx-leasing-work .pslh-tab{min-height:84px!important;padding:15px 18px!important}',
      '#intelStrip.psx-leasing-work .pslh-stage{margin-top:16px!important;border-radius:22px!important;box-shadow:0 18px 45px rgba(28,24,17,.05)!important}',
      '#intelStrip.psx-leasing-work .pslh-stage-body{padding:0 21px!important}',
      '#intelStrip.psx-leasing-work .pslh-row{grid-template-columns:8px minmax(0,1fr) auto!important;gap:16px!important;padding:18px 0!important}',
      '#intelStrip.psx-leasing-work .pslh-row:before{grid-row:auto!important;height:7px!important;width:7px!important}',
      '#intelStrip.psx-leasing-work .pslh-actions{grid-column:auto!important;display:flex!important;width:auto!important;padding:0!important}',
      '#intelStrip.psx-leasing-work .pslh-btn.primary{width:auto!important;min-height:39px!important;border-radius:12px!important;padding:10px 15px!important;box-shadow:none!important}',
      '#intelStrip.psx-leasing-work .psx-work-actions{display:none!important}',
      '@media(max-width:720px){#intelStrip.psx-leasing-work .pslh-head{grid-template-columns:1fr!important;gap:12px!important}#intelStrip.psx-leasing-work .pslh-title{font-size:41px!important}#intelStrip.psx-leasing-work .pslh-tab{min-height:68px!important;padding:9px 8px!important}#intelStrip.psx-leasing-work .pslh-tab-title{font-size:11px!important}#intelStrip.psx-leasing-work .pslh-tab-count{min-width:28px!important;height:28px!important;font-size:15px!important}#intelStrip.psx-leasing-work .pslh-stage{border-radius:18px!important}#intelStrip.psx-leasing-work .pslh-stage-body{padding:0 16px!important}#intelStrip.psx-leasing-work .pslh-row{grid-template-columns:7px minmax(0,1fr)!important;gap:11px!important;padding:16px 0!important}#intelStrip.psx-leasing-work .pslh-actions{grid-column:2!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;width:100%!important;padding-top:2px!important}#intelStrip.psx-leasing-work .pslh-btn.primary{width:100%!important;min-height:44px!important}}',
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
           + '<div class="psx-tour-empty">Schedule unavailable. Open Tours to retry.</div>';
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


  function enhanceWork(strip){
    var root=strip.querySelector('.pslh'); if(!root) return false;
    strip.classList.add('psx-leasing-work');
    strip.classList.remove('psx-leasing-home','psx-surface-tours','psx-surface-conversations','psx-surface-applications');

    var title=root.querySelector('.pslh-title'); if(title) title.textContent='Leasing Work';
    var sub=root.querySelector('.pslh-sub');
    if(sub) sub.textContent='Move each completed tour to an executed lease.';

    /* No competing Applications destination. Application Review opens from the
       relationship row that owns it. Remove both current and stale injected doors. */
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
    if(person) person.classList.add('psx-conv-person');

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
