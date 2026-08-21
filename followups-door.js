/* ════════════════════════════════════════════════════════════════════════════
   PROPERTY SPINE — CANONICAL LEASING HOME (Leg 3 frontend shell)
   ────────────────────────────────────────────────────────────────────────────
   Reads ONE server-authored projection: GET /operator/leasing/desk through the
   sealed __psLive loader resource `leasingDesk`.

   The browser does not classify, rank, deduplicate, or infer lifecycle state.
   It preserves server band order and dispatches the structured primary action.

   Existing task writes remain on the canonical named __psLive methods:
     resolveTask · reassignTask · reopenTask · changeDueTask
     sendApplicationFromConversion · leaseableUnits

   Compatibility: this file intentionally keeps the existing global surface
     window.__psFollowups = { mount, entryHTML, tileStatus, refresh, reset }
   so index.html does not need a second Leasing runtime.
   ════════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var RESOURCE = { desk:'leasingDesk', eligibleStaff:'eligibleStaff' };
  var ACTIVE_STAGES = ['post_tour','application','lease_sent'];

  function injectStyles(){
    if(typeof document==='undefined' || document.getElementById('ps-leasing-home-style')) return;
    var s=document.createElement('style');
    s.id='ps-leasing-home-style';
    s.textContent=[
      ":root{--pslh-ink:#161512;--pslh-muted:#706b62;--pslh-faint:#9d978d;--pslh-line:#dad6ce;--pslh-soft:#eeebe4;--pslh-paper:#fff;--pslh-warm:#faf8f3;--pslh-red:#9e3b31;--pslh-amber:#91651e;--pslh-green:#245f4b;--pslh-blue:#486d7b}",
      ".pslh{width:min(100%,960px);margin-inline:auto;color:var(--pslh-ink);font-family:\"IBM Plex Sans\",system-ui,sans-serif}",
      ".pslh *{box-sizing:border-box}",
      ".pslh-head{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;padding:8px 2px 23px}",
      ".pslh-head-copy{min-width:0}.pslh-eyebrow{font:600 9px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--pslh-green)}",
      ".pslh-title{margin:8px 0 0;font-family:\"Fraunces\",Georgia,serif;font-size:43px;font-weight:500;letter-spacing:-.05em;line-height:.97}",
      ".pslh-sub{max-width:560px;margin-top:9px;font-size:12.5px;line-height:1.5;color:var(--pslh-muted)}",
      ".pslh-total{display:flex;align-items:baseline;gap:7px;padding-bottom:2px;white-space:nowrap;color:var(--pslh-muted)}",
      ".pslh-total strong{font-family:\"Fraunces\",Georgia,serif;font-size:30px;font-weight:500;letter-spacing:-.04em;color:var(--pslh-ink)}.pslh-total span{font-size:10.5px}",
      ".pslh-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--pslh-line);border-bottom:1px solid var(--pslh-line);background:transparent}",
      ".pslh-tab{position:relative;display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:11px;align-items:center;min-height:72px;appearance:none;border:0;border-left:1px solid var(--pslh-soft);background:transparent;padding:12px 16px;color:var(--pslh-muted);text-align:left;cursor:pointer}",
      ".pslh-tab:first-child{border-left:0}.pslh-tab:after{content:\"\";position:absolute;left:15px;right:15px;bottom:-1px;height:2px;background:transparent}",
      ".pslh-tab:hover{background:rgba(255,255,255,.48)}.pslh-tab.active{color:var(--pslh-ink);background:#fff}.pslh-tab.active:after{background:var(--pslh-ink)}",
      ".pslh-tab-index{font:600 8.5px/1 \"IBM Plex Mono\",monospace;letter-spacing:.08em;color:var(--pslh-faint)}",
      ".pslh-tab-copy{display:grid;gap:4px;min-width:0}.pslh-tab-title{font-size:13px;font-weight:650;line-height:1.2}.pslh-tab-cue{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--pslh-faint)}",
      ".pslh-tab-count{display:flex;align-items:center;justify-content:center;min-width:28px;height:28px;border:1px solid var(--pslh-line);border-radius:999px;background:#fff;font:500 15px/1 \"Fraunces\",Georgia,serif;color:var(--pslh-muted)}",
      ".pslh-tab.active .pslh-tab-count{border-color:var(--pslh-ink);background:var(--pslh-ink);color:#fff}.pslh-tab:focus-visible{outline:2px solid var(--pslh-ink);outline-offset:-4px}",
      ".pslh-stage{margin-top:15px;border:1px solid var(--pslh-line);border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 14px 36px rgba(28,24,17,.045)}",
      ".pslh-stage-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 18px;border-bottom:1px solid var(--pslh-soft);background:var(--pslh-warm)}",
      ".pslh-stage-desc{max-width:650px;font-size:11.5px;line-height:1.45;color:var(--pslh-muted)}.pslh-stage-count{font:600 8.5px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--pslh-faint);white-space:nowrap}",
      ".pslh-stage-body{padding:0 18px}.pslh-empty{padding:24px 1px;font-size:12px;line-height:1.5;color:var(--pslh-faint)}",
      ".pslh-row{display:grid;grid-template-columns:7px minmax(0,1fr) auto;gap:15px;align-items:center;padding:17px 0;border-top:1px solid var(--pslh-soft)}.pslh-stage-body .pslh-row:first-child{border-top:0}",
      ".pslh-row:before{content:\"\";width:6px;height:6px;border-radius:999px;background:#c7c2b9;align-self:start;margin-top:7px}.pslh-row.overdue:before{background:var(--pslh-red)}.pslh-row.blocked:before{background:var(--pslh-amber)}.pslh-row.unassigned:before{background:var(--pslh-blue)}",
      ".pslh-row-main{min-width:0}.pslh-row-top{display:flex;align-items:baseline;gap:9px;min-width:0}.pslh-person{font-size:14.5px;font-weight:650;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".pslh-person-link{appearance:none;border:0;border-bottom:1px solid rgba(22,21,18,.24);background:transparent;padding:0;margin:0;color:inherit;font:inherit;text-align:left;cursor:pointer;max-width:100%}.pslh-person-link:hover{border-bottom-color:var(--pslh-ink)}.pslh-person-link:focus-visible{outline:2px solid var(--pslh-ink);outline-offset:3px;border-bottom-color:transparent;border-radius:2px}",
      ".pslh-unit{font:500 8.5px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.07em;text-transform:uppercase;color:var(--pslh-faint);white-space:nowrap}.pslh-state{margin-top:5px;font-size:12.5px;line-height:1.42;color:#403d37}.pslh-blocker{margin-top:5px;font-size:11px;line-height:1.4;color:var(--pslh-amber)}",
      ".pslh-meta{display:flex;gap:6px 14px;flex-wrap:wrap;margin-top:7px;font-size:10.5px;color:var(--pslh-faint)}.pslh-owner.unassigned{color:var(--pslh-blue)}.pslh-due.overdue{color:var(--pslh-red);font-weight:600}.pslh-related{color:var(--pslh-faint)}",
      ".pslh-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0}.pslh-btn{appearance:none;min-height:38px;border:1px solid #cbc8c1;border-radius:11px;background:#fff;padding:9px 13px;color:#2a2824;font:600 10.5px/1.2 \"IBM Plex Sans\",sans-serif;white-space:nowrap;cursor:pointer}.pslh-btn:hover{border-color:#8b877f;background:#faf9f6}.pslh-btn:focus-visible{outline:2px solid var(--pslh-ink);outline-offset:3px}",
      ".pslh-btn.primary{border-color:var(--pslh-ink);background:var(--pslh-ink);color:#fff}.pslh-btn.primary:hover{background:#2b2925}.pslh-btn:disabled{cursor:not-allowed;opacity:1;color:var(--pslh-faint);border-color:var(--pslh-line);background:#f6f4ef}",
      ".pslh-unavailable{display:grid;justify-items:end;gap:5px;max-width:230px}.pslh-unavailable-reason{font-size:9.5px;line-height:1.35;text-align:right;color:var(--pslh-faint)}",
      ".pslh-more{position:relative}.pslh-more>summary{display:flex;align-items:center;justify-content:center;width:38px;height:38px;list-style:none;border-radius:10px;color:var(--pslh-faint);cursor:pointer;font-size:0}.pslh-more>summary::-webkit-details-marker{display:none}.pslh-more>summary:after{content:\"•••\";font-size:10px;letter-spacing:.12em}.pslh-more>summary:hover{background:#f3f1eb;color:var(--pslh-ink)}",
      ".pslh-menu{position:absolute;right:0;top:42px;z-index:40;width:166px;border:1px solid var(--pslh-line);border-radius:13px;background:#fff;padding:6px;box-shadow:0 18px 44px rgba(20,18,14,.14)}.pslh-menu .pslh-btn{display:block;width:100%;min-height:0;border:0;border-radius:8px;background:transparent;padding:9px 10px;text-align:left}.pslh-menu .pslh-btn:hover{background:#f5f3ee}",
      ".pslh-closed{margin-top:16px;border:0;border-top:1px solid var(--pslh-line);background:transparent}.pslh-closed>summary{list-style:none;padding:15px 2px 6px;color:var(--pslh-faint);font:600 8.5px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.09em;text-transform:uppercase;cursor:pointer}.pslh-closed>summary::-webkit-details-marker{display:none}.pslh-closed>summary:after{content:\"+\";float:right}.pslh-closed[open]>summary:after{content:\"–\"}.pslh-closed>summary span{margin-left:5px}",
      ".pslh-crow{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 2px;border-top:1px solid var(--pslh-soft)}.pslh-crow-name{font-size:12.5px;font-weight:600}.pslh-crow small{font-size:10.5px;color:var(--pslh-muted)}.pslh-crow-meta{margin-top:3px;font-size:10.5px;color:var(--pslh-faint)}.pslh-crow-act{display:flex;align-items:center;gap:8px;flex-shrink:0}.pslh-noreopen{font-size:10.5px;color:var(--pslh-faint);font-style:italic}",
      ".pslh-flash{margin:0 0 14px;border:1px solid #c9ddd2;border-radius:12px;background:#f3f8f5;padding:10px 12px;color:var(--pslh-green);font-size:11.5px}.pslh-flash.err{border-color:#e2c4be;background:#fbefed;color:var(--pslh-red)}.pslh-loading{padding:28px 0;border-bottom:1px solid var(--pslh-line);font-size:12.5px;color:var(--pslh-muted)}.pslh-error{margin-top:16px;border:1px solid #e2c4be;border-radius:12px;background:#fbefed;padding:12px 14px;color:#8d3026;font-size:11.5px;line-height:1.5}.pslh-error .pslh-btn{margin-left:8px}",
      ".pslh-scrim{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(15,15,15,.38);padding:20px;backdrop-filter:blur(3px)}.pslh-sheet{width:min(440px,100%);border-radius:20px;background:#fff;padding:24px;box-shadow:0 30px 80px rgba(0,0,0,.24)}.pslh-sheet-title{margin-bottom:10px;font:500 24px/1 \"Fraunces\",Georgia,serif;letter-spacing:-.03em}.pslh-p{margin:0 0 14px;color:#5f5c56;font-size:12.5px;line-height:1.5}.pslh-label{display:block;margin:12px 0 5px;color:var(--pslh-muted);font:600 9px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.1em;text-transform:uppercase}.pslh-input{width:100%;border:1px solid #d4d2cb;border-radius:10px;padding:10px 11px;font:16px/1.3 \"IBM Plex Sans\",sans-serif}textarea.pslh-input{min-height:70px;resize:vertical}.pslh-sheet-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.pslh-unit-list{display:grid;gap:7px;margin:8px 0}.pslh-unit-btn{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #deddd8;border-radius:10px;background:#fff;padding:11px 13px;text-align:left;cursor:pointer}.pslh-unit-btn:hover{border-color:#8f8b83}.pslh-unit-btn b{font-size:13.5px}.pslh-unit-btn span{font-size:10.5px;color:var(--pslh-muted)}.pslh-unit-blocked-h{margin:10px 0 4px;color:var(--pslh-muted);font:600 9px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.1em;text-transform:uppercase}.pslh-unit-blocked{display:flex;flex-direction:column;gap:3px;border:1px dashed #deddd8;background:#faf9f7;border-radius:10px;padding:11px 13px;cursor:default}.pslh-unit-blocked b{font-size:13.5px;color:var(--pslh-muted)}.pslh-unit-blocked span{font-size:10.5px;color:var(--pslh-muted);line-height:1.45}",
      "@media(max-width:720px){.pslh{width:100%}.pslh-head{display:grid;grid-template-columns:1fr;gap:10px;padding:4px 0 18px}.pslh-title{font-size:38px}.pslh-total{padding:0}.pslh-total strong{font-size:25px}.pslh-tabs{margin-inline:-1px}.pslh-tab{grid-template-columns:minmax(0,1fr) auto;gap:4px;min-height:62px;padding:9px 8px}.pslh-tab-index,.pslh-tab-cue{display:none}.pslh-tab-title{font-size:10.5px}.pslh-tab-count{min-width:25px;height:25px;font-size:14px}.pslh-stage{border-radius:16px}.pslh-stage-head{align-items:flex-start;flex-direction:column;gap:6px;padding:13px 14px}.pslh-stage-count{white-space:normal}.pslh-stage-body{padding:0 14px}.pslh-row{grid-template-columns:6px minmax(0,1fr);gap:10px;padding:15px 0}.pslh-actions{grid-column:2;display:grid;grid-template-columns:minmax(0,1fr) auto;width:100%;padding-top:2px}.pslh-btn.primary{width:100%;min-height:44px}.pslh-more>summary{width:44px;height:44px}.pslh-unavailable{justify-items:stretch;max-width:none}.pslh-unavailable-reason{text-align:left}.pslh-crow{align-items:flex-start;flex-direction:column}.pslh-crow-act{width:100%}.pslh-sheet{padding:21px 18px}}",
      "@media(prefers-reduced-motion:reduce){.pslh *{scroll-behavior:auto!important;transition:none!important}}",
      /* ── RESTORED LAYOUT (Leasing Work rows + leasing-home grid) ──────
         These rules previously lived in leasing-experience.js as a skin
         over this door. The v2 release removed them there — correctly,
         since one file should own this presentation — but the base design
         here did not yet carry them, so Leasing Work rows lost their grid
         and the leasing home lost its two-column desktop layout. They now
         live with the door that renders them, verbatim except that the
         retired band/pulse selectors are stripped out. Appended last so
         they win at equal specificity. */
      '.pslh{width:min(100%,1080px);max-width:none}',
      '.pslh .pslh-head{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;padding:2px 0 18px}',
      '.pslh .pslh-title{font-size:34px;line-height:1}',
      '.pslh .pslh-sub{max-width:42rem;font-size:12.5px;line-height:1.5}',
      '.pslh .pslh-row{grid-template-columns:4px minmax(0,1fr)!important;gap:12px!important;padding:16px 0!important}',
      '.pslh .pslh-row:before{grid-row:1 / span 2;height:44px}',
      '.pslh .pslh-person{font-size:14px}',
      '.pslh .pslh-state{font-size:12.5px}',
      '.pslh .pslh-meta{font-size:11px}',
      '.pslh .pslh-actions{grid-column:2;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;justify-content:stretch;min-width:0;width:100%;padding:2px 0 0}',
      '.pslh .pslh-btn.primary{display:flex;align-items:center;justify-content:center;min-height:44px;width:100%;max-width:none;padding:11px 14px;font-size:11.5px;overflow:hidden;text-overflow:ellipsis}',
      '.pslh .pslh-more>summary{display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:0;font-size:0;border:1px solid transparent;border-radius:12px}',
      '.pslh .pslh-more>summary:after{content:"•••";font-size:12px;letter-spacing:.12em}',
      '.pslh .pslh-menu{left:auto;right:0;top:46px}',
      '.pslh .pslh-closed{margin-top:14px;border-radius:15px}',
      '#intelStrip.psx-surface-applications .ps-ar-row,.pslh .pslh-row{font-family:"IBM Plex Sans",system-ui,sans-serif}',
      '@media(max-width:420px){.psx-leasing-grid>.psx-card{padding:17px!important;border-radius:16px!important}.psx-leasing-grid>.psx-tours h3{font-size:30px!important}.psx-tour-preview-row{grid-template-columns:62px minmax(0,1fr);gap:10px;padding:7px 0}.psx-tour-status{grid-column:2;justify-self:start;min-height:22px;padding:0 7px}.pslh .pslh-title{font-size:32px}}',
      '@media(min-width:560px){.psx-leasing-grid>.psx-card{padding:22px!important}.psx-leasing-grid>.psx-tours h3{font-size:34px!important}.pslh .pslh-head{gap:20px}.pslh .pslh-title{font-size:38px}}',
      '@media(min-width:860px){.psx-leasing-grid{grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr)!important;grid-template-rows:auto auto;gap:16px!important}.psx-leasing-grid>.psx-card{border-radius:22px!important;box-shadow:var(--psx-shadow)!important}.psx-leasing-grid>.psx-tours{grid-column:1 / -1;grid-row:auto;min-height:220px!important;padding:28px!important}.psx-leasing-grid>.psx-tours h3{font-size:38px!important}.psx-leasing-grid>.psx-tours .psx-tour-preview{max-width:760px}.psx-leasing-grid>.psx-work{min-height:190px!important;padding:22px!important}.psx-leasing-grid>.psx-work h3{font-size:28px!important}.psx-leasing-grid>.psx-conversations{min-height:190px!important;padding:22px!important;box-shadow:var(--psx-shadow)!important}.psx-leasing-grid>.psx-conversations h3{font-size:24px!important}.pslh .pslh-head{grid-template-columns:minmax(0,1fr) minmax(310px,380px);gap:32px;padding-bottom:24px}.pslh .pslh-title{font-size:42px}.pslh .pslh-row{grid-template-columns:5px minmax(0,1fr) auto!important;gap:18px!important;padding:17px 0!important}.pslh .pslh-row:before{grid-row:auto;height:42px}.pslh .pslh-actions{grid-column:auto;display:flex;justify-content:flex-end;min-width:190px;width:auto;padding:0}.pslh .pslh-btn.primary{width:auto;min-height:38px;padding:9px 14px;font-size:10.5px}.pslh .pslh-more>summary{min-width:auto;min-height:auto;padding:9px 2px;font-size:11px;border:0}.pslh .pslh-more>summary:after{content:" ···";font-size:inherit}}',
      '.pslh{width:min(100%,980px)!important;max-width:980px!important;margin-inline:auto!important}',
      '.pslh .pslh-head{grid-template-columns:minmax(0,1fr) auto!important;gap:34px!important;padding:4px 0 22px!important}',
      '.pslh .pslh-title{font-size:48px!important;line-height:.94!important}',
      '.pslh .pslh-sub{font-size:13px!important;line-height:1.5!important}',
      '.pslh .pslh-tabs{margin-top:0!important;border-radius:20px!important}',
      '.pslh .pslh-tab{min-height:84px!important;padding:15px 18px!important}',
      '.pslh .pslh-stage{margin-top:16px!important;border-radius:22px!important;box-shadow:0 18px 45px rgba(28,24,17,.05)!important}',
      '.pslh .pslh-stage-body{padding:0 21px!important}',
      '.pslh .pslh-row{grid-template-columns:8px minmax(0,1fr) auto!important;gap:16px!important;padding:18px 0!important}',
      '.pslh .pslh-row:before{grid-row:auto!important;height:7px!important;width:7px!important}',
      '.pslh .pslh-actions{grid-column:auto!important;display:flex!important;width:auto!important;padding:0!important}',
      '.pslh .pslh-btn.primary{width:auto!important;min-height:39px!important;border-radius:12px!important;padding:10px 15px!important;box-shadow:none!important}',
      '.pslh .psx-work-actions{display:none!important}',
      '@media(max-width:720px){.pslh .pslh-head{grid-template-columns:1fr!important;gap:12px!important}.pslh .pslh-title{font-size:41px!important}.pslh .pslh-tab{min-height:68px!important;padding:9px 8px!important}.pslh .pslh-tab-title{font-size:11px!important}.pslh .pslh-tab-count{min-width:28px!important;height:28px!important;font-size:15px!important}.pslh .pslh-stage{border-radius:18px!important}.pslh .pslh-stage-body{padding:0 16px!important}.pslh .pslh-row{grid-template-columns:7px minmax(0,1fr)!important;gap:11px!important;padding:16px 0!important}.pslh .pslh-actions{grid-column:2!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;width:100%!important;padding-top:2px!important}.pslh .pslh-btn.primary{width:100%!important;min-height:44px!important}}',
      /* Four rules the v2 CSS rewrite dropped while their markup still
         ships: small buttons, recently-closed spacing, the muted sub-name,
         and the row hover. Restored verbatim from the pre-release door. */
      '.pslh-btn.small{padding:6px 10px;font-size:10px}',
      /* ── S5: view switch + record chips ── */
      '.pslh-views{display:flex;gap:6px;margin-top:14px}',
      '.pslh-view{appearance:none;border:1px solid var(--pslh-line);border-radius:999px;background:transparent;padding:8px 14px;font:600 10.5px/1.2 "IBM Plex Sans",sans-serif;color:var(--pslh-muted);cursor:pointer}',
      '.pslh-view b{font-weight:650;margin-left:4px}',
      '.pslh-view.active{border-color:var(--pslh-ink);background:var(--pslh-ink);color:#fff}',
      '.pslh-view:focus-visible{outline:2px solid var(--pslh-ink);outline-offset:2px}',
      '.pslh-recchip{display:inline-flex;align-items:center;white-space:nowrap;border:1px solid var(--pslh-line);border-radius:999px;background:#f6f5f1;padding:2px 9px;font:600 9px/1.6 "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--pslh-muted)}',
      '.pslh-recchip.active{border-color:#bcd9ca;background:#f3f8f5;color:var(--pslh-green)}',
      '.pslh-recchip.exited{color:var(--pslh-faint)}',
      '.pslh-rec-exited .pslh-person,.pslh-rec-exited .pslh-state{color:var(--pslh-muted)}',
      /* ── S4: waiting rows (server-authored waiting_on) ── */
      '.pslh-wait{display:inline-flex;align-items:center;white-space:nowrap;border:1px solid #cfd9de;border-radius:999px;background:#f2f6f8;padding:2px 9px;font:600 9px/1.6 "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--pslh-blue)}',
      '.pslh-row.waiting:before{background:var(--pslh-blue)}',
      '.pslh-activity{color:var(--pslh-faint)}',
      '.pslh-closed .pslh-crow,.pslh-closed .pslh-empty{margin:0 18px}',
      '.pslh-crow-name small{font-weight:400;color:var(--pslh-muted)}',
      '.pslh-row:hover{background:#fcfbf8}'
    ].join('\n');
    document.head.appendChild(s);
  }
  if(typeof document!=='undefined'){ if(document.head) injectStyles(); else document.addEventListener('DOMContentLoaded',injectStyles); }

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function live(){ return (typeof window!=='undefined' && window.__psLive) ? window.__psLive : null; }
  function hasSession(){ var L=live(); return !!(L && L.hasSession && L.hasSession()); }
  function uid(){ return 'pslh_'+Date.now()+'_'+Math.random().toString(36).slice(2,8); }
  function unwrap(out){ return out && out.data ? out.data : out; }
  function humanCode(v){ return String(v||'').replace(/_/g,' '); }
  function localInputToISO(v){ if(!v) return null; var t=Date.parse(v); return isNaN(t)?null:new Date(t).toISOString(); }
  function toLocalInputValue(iso){ var t=iso?Date.parse(iso):Date.now(); var d=new Date(isNaN(t)?Date.now():t); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16); }
  function fmtDue(v,state){
    if(!v) return 'No due time';
    var t=Date.parse(v); if(isNaN(t)) return state||'';
    var d=new Date(t);
    return d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' · '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
  }
  function relClosed(v){
    if(!v) return '';
    var t=Date.parse(v); if(isNaN(t)) return '';
    var mins=Math.max(0,Math.round((Date.now()-t)/60000));
    if(mins<60) return mins+'m ago';
    var hrs=Math.round(mins/60); if(hrs<48) return hrs+'h ago';
    return Math.round(hrs/24)+'d ago';
  }

  function closedReceipt(payload){
    var r=null;
    if(payload && payload.receipts && payload.receipts.recently_closed!=null) r=payload.receipts.recently_closed;
    else if(payload && payload.recently_closed!=null) r=payload.recently_closed;
    if(Array.isArray(r)) return { window_hours:72, items:r };
    if(r && typeof r==='object') return r;
    return { window_hours:72, items:[] };
  }

  function classifyPrimaryAction(action){
    var a=action||{},t=a.target||{};
    if(a.kind==='navigation' && (t.type==='application'||t.type==='person'||t.type==='conversation') && t.id){
      return {supported:true,label:'Open'};
    }
    // S4: an owed tour-outcome capture navigates to the EXISTING canonical
    // capture destination (the Tours board workspace). No second capture
    // workflow or write path exists here.
    if(a.kind==='navigation' && t.type==='tour' && t.id){
      return {supported:true,label:'Open'};
    }
    if(a.kind==='task_write' && a.code==='send_application' && t.type==='conversion' && t.id){
      return {supported:true,label:'Send'};
    }
    if(a.kind==='task_write' && a.code==='complete_task' && t.type==='obligation' && t.id){
      return {supported:true,label:'Complete'};
    }
    // A held action is a server DECISION, not a missing feature: it keeps its
    // real verb, renders disabled, and shows the server's reason.
    if(a.kind==='blocked'){
      return {supported:false,label:a.label||'Unavailable',reason:a.reason||'The server is holding this action for this record.'};
    }
    return {supported:false,label:'Unavailable',reason:a.reason||'This action is not supported in the operator app yet.'};
  }

  // S5: Application Records is a RECORDS view over the same projection — the
  // exact Applications Review population, server-classified. The browser
  // validates shape and renders; it never classifies or re-derives.
  function validateRecords(payload){
    var section=payload.application_records;
    if(section==null) return payload; // pre-S5 API during the rolling deploy — view offers gracefully degrade
    if(typeof section!=='object' || !Array.isArray(section.records)) throw new Error('Application Records is malformed.');
    var seen={};
    section.records.forEach(function(record){
      if(!record || !record.application_id) throw new Error('An application record has no application_id.');
      if(seen[record.application_id]) throw new Error('Application Records returned the same application twice.');
      seen[record.application_id]=true;
      if(['active','exited','unresolved'].indexOf(record.record_state)<0){
        throw new Error('An application record carries no server-authored record_state.');
      }
      if(!record.primary_action || record.primary_action.kind!=='navigation'
         || !record.primary_action.target || record.primary_action.target.type!=='application'){
        throw new Error('An application record does not route to the canonical review detail.');
      }
    });
    return payload;
  }

  function validateDesk(payload){
    if(!payload || typeof payload!=='object') throw new Error('Follow Ups returned no contract.');
    if(!payload.stages || typeof payload.stages!=='object') throw new Error('Follow Ups returned no lifecycle stages.');
    validateRecords(payload);
    var seen={};
    ACTIVE_STAGES.forEach(function(stage){
      var rows=payload.stages[stage];
      if(!Array.isArray(rows)) throw new Error('Follow Ups stage '+stage+' is missing.');
      rows.forEach(function(row){
        if(!row || typeof row!=='object') throw new Error('Follow Ups returned an invalid row.');
        if(row.stage && row.stage!==stage) throw new Error('Follow Ups row placement disagrees with its lifecycle stage.');
        if(!row.desk_key) throw new Error('Follow Ups row has no desk_key.');
        if(seen[row.desk_key]) throw new Error('Follow Ups returned the same desk_key twice.');
        seen[row.desk_key]=true;
        if(!row.primary_action || !row.primary_action.kind || !row.primary_action.target){
          throw new Error('Follow Ups row has no structured primary_action.');
        }
        var contract=classifyPrimaryAction(row.primary_action);
        row.action_unsupported=!contract.supported;
        row.action_unavailable_reason=contract.supported?null:contract.reason;
        row.action_unavailable_label=contract.supported?null:contract.label;
        if(contract.supported && row.primary_action.label!==contract.label){
          throw new Error('Follow Ups action vocabulary disagrees with its structured action.');
        }
      });
    });
    var r=closedReceipt(payload);
    if(r.items!=null && !Array.isArray(r.items)) throw new Error('Recently closed receipt is malformed.');
    return payload;
  }

  function makeController(){
    var root=null;
    var state={ loading:false, error:null, desk:null, staff:null, panel:null, sending:null, sendKeys:{}, flash:null, errorFlash:null, returnPoint:null, awaitingReviewReturn:false, activeStage:'post_tour', stageTouched:false, view:'work' };
    var visibilityHandler=null;

    async function loadResource(name,params){
      var L=live(); if(!L || typeof L.loadResource!=='function') throw new Error('Live loader unavailable.');
      return unwrap(await L.loadResource(name,params||{}));
    }
    async function write(method,params){
      var L=live(); if(!L || typeof L[method]!=='function') throw new Error('Live action '+method+' is unavailable.');
      return unwrap(await L[method](params||{}));
    }

    async function refresh(){
      if(!hasSession()){ render(); return; }
      state.loading=true; state.error=null; render();
      state.desk=null; render();
      try{
        state.desk=validateDesk(await loadResource(RESOURCE.desk,{}));
        // ROLLING DEPLOY: an operator who asked for the application list must
        // never land on a view the server cannot fill. If this deploy's
        // projection carries no records section, fall back to Active Work —
        // which still holds every ACTIVE application — instead of stranding
        // them on an empty promise.
        if(state.view==='records' && !(state.desk && state.desk.application_records)) state.view='work';
        if(!state.stageTouched){
          state.activeStage=ACTIVE_STAGES.filter(function(stage){return (state.desk.stages[stage]||[]).length;})[0]||'post_tour';
        }
      }
      catch(e){ state.desk=null; state.error=(e&&e.message)||'Could not load Leasing.'; }
      state.loading=false; render(); restoreReturnPoint();
    }

    function restoreReturnPoint(){
      if(!root || !state.returnPoint || !state.desk) return;
      var p=state.returnPoint; state.returnPoint=null;
      requestAnimationFrame(function(){
        try{
          if(typeof window!=='undefined' && typeof window.scrollTo==='function') window.scrollTo(0,p.scrollY||0);
          var q='[data-desk-key="'+String(p.deskKey).replace(/"/g,'\\"')+'"] .pslh-btn.primary';
          var n=root.querySelector(q); if(n) n.focus();
        }catch(_){}
      });
    }

    async function ensureStaff(){
      if(state.staff) return state.staff;
      try{
        var r=await loadResource(RESOURCE.eligibleStaff,{});
        state.staff=Array.isArray(r)?r:(r.staff||r.items||[]);
      }catch(_){ state.staff=[]; }
      return state.staff;
    }

    function allRows(){
      if(!state.desk) return [];
      return ACTIVE_STAGES.reduce(function(a,stage){ return a.concat(state.desk.stages[stage]||[]); },[])
        .concat((closedReceipt(state.desk).items)||[]);
    }
    function findRow(key){ return allRows().filter(function(r){ return String(r.desk_key||r.obligation_id)===String(key); })[0]||null; }
    function openPanel(kind,key){
      var row=findRow(key); if(!row) return;
      state.panel={kind:kind,row:row,busy:false,error:null};
      if(kind==='reassign') ensureStaff().then(render);
      render();
    }
    function closePanel(){ state.panel=null; render(); }

    function applicationIdFor(row){
      var t=row&&row.primary_action&&row.primary_action.target;
      return (t&&t.type==='application'&&t.id) || row.application_id || null;
    }
    function openApplicationReview(row){
      var id=applicationIdFor(row); if(!id){ state.errorFlash='This row has no application target.'; render(); return; }
      state.returnPoint={deskKey:row.desk_key,scrollY:(typeof window!=='undefined'&&window.scrollY)||0};
      state.awaitingReviewReturn=true;
      var detail={application_id:id,source:'leasing_desk',return_to:'leasing'};
      try{
        if(typeof window.openApplicationReview==='function'){ window.openApplicationReview(detail); return; }
        if(typeof window.psOpenApplicationReview==='function'){ window.psOpenApplicationReview(id,detail); return; }
        if(typeof window.openLeasingApplicationReview==='function'){ window.openLeasingApplicationReview(id,detail); return; }
        var ev=new CustomEvent('ps:open-application-review',{detail:detail,cancelable:true});
        if(window.dispatchEvent(ev)===false) return;
      }catch(e){ state.errorFlash=(e&&e.message)||'Could not open Application Review.'; render(); return; }
      state.errorFlash='Application Review is not connected to the Leasing shell.'; render();
    }
    function openCard(row,focus){
      if(!row || !row.person_id) return;
      try{
        if(typeof window.openPersonCard==='function'){
          window.openPersonCard({
            person_id:row.person_id,
            name:row.person_name||null,
            context:focus==='communication'?'conversation':'lead',
            source:'leasing_work_'+(row.stage||'relationship'),
            start_tab:focus==='communication'?'communication':'info',
            conversion_id:row.conversion_id||null,
            application_id:row.application_id||null
          });
          return;
        }
        if(typeof window.openPersonCardById==='function') window.openPersonCardById(row.person_id);
      }catch(_){ }
    }

    function sendAttemptKey(row){
      var id=row&&row.conversion_id?String(row.conversion_id):'';
      if(!id) throw new Error('This row has no leasing conversion.');
      if(!state.sendKeys[id]) state.sendKeys[id]=uid();
      return state.sendKeys[id];
    }
    function sendFailureMessage(e){
      return (e && e.body && (e.body.receipt || e.body.error)) ||
        (e && (e.publicMessage || e.message)) ||
        'The application could not be sent.';
    }

    async function openSend(row){
      if(!row || !row.conversion_id || state.sending) return;
      state.panel={kind:'sendapp',row:row,busy:true,error:null,units:null}; render();
      try{
        var L=live(); if(!L || typeof L.leaseableUnits!=='function') throw new Error('Leaseable-unit read unavailable.');
        // The server returns exact application targets. A whole-unit property
        // still has one target per unit; a by-bed property has one per available
        // bed. During an app-first rolling deploy, fall back to the old sole-
        // space list and keep old unsupported rows visible but unselectable.
        var out=unwrap(await L.leaseableUnits());
        state.panel.units=(out&&(out.eligible_targets||out.eligible_units))||[];
        state.panel.unsupported=(out&&out.unsupported_multi_space_units)||[];
        state.panel.busy=false;
      }catch(e){ state.panel.busy=false; state.panel.error=sendFailureMessage(e); }
      render();
    }
    async function openApplicationSend(input){
      input=input||{};
      if(!root || !input.conversion_id) return false;
      state.view='work'; state.activeStage='post_tour'; state.stageTouched=true;
      await openSend({
        desk_key:'conversion:'+String(input.conversion_id),
        conversion_id:String(input.conversion_id),
        person_id:input.person_id||null,
        person_name:input.person_name||'the prospect',
        unit_id:null
      });
      return true;
    }
    async function sendNow(row,target){
      if(state.sending) return;
      var conversionId=row&&row.conversion_id;
      var unitId=target&&(target.unit_id||target.id);
      var spaceId=target&&(target.space_id||target.resolved_space_id)||null;
      if(!conversionId){ if(state.panel) state.panel.error='This row has no leasing conversion.'; else state.errorFlash='This row has no leasing conversion.'; render(); return; }
      if(!unitId){ if(state.panel) state.panel.error='Choose the home this application is for.'; render(); return; }
      state.sending=String(conversionId); if(state.panel) state.panel.busy=true; render();
      try{
        var L=live(); if(!L || typeof L.sendApplicationFromConversion!=='function') throw new Error('Application send is unavailable.');
        var out=unwrap(await L.sendApplicationFromConversion({conversionId:conversionId,unit_id:unitId,space_id:spaceId,idempotency_key:sendAttemptKey(row)}));
        if(!out || out.sent!==true) throw new Error((out&&out.receipt)||'The application could not be sent.');
        delete state.sendKeys[String(conversionId)];
        state.panel=null; state.sending=null; state.flash=out.receipt||('Application sent to '+(row.person_name||'the prospect')+'.');
        await refresh(); setTimeout(function(){state.flash=null;render();},6000);
      }catch(e){ state.sending=null; var message=sendFailureMessage(e); if(state.panel){state.panel.busy=false;state.panel.error=message;} else state.errorFlash=message; render(); }
    }

    function runPrimary(row){
      var a=row.primary_action||{}, t=a.target||{}, code=a.code||'';
      if(a.kind==='navigation' && t.type==='application'){ openApplicationReview(row); return; }
      if(a.kind==='navigation' && (t.type==='person'||t.type==='conversation')){ openCard(row); return; }
      if(a.kind==='navigation' && t.type==='tour'){ openTourCapture(row); return; }
      if(a.kind==='task_write' && code==='send_application'){ openSend(row); return; }
      if(a.kind==='task_write' && code==='complete_task'){ openPanel('complete',row.desk_key); return; }
      /* unreachable when validation ran; kept as a hard stop, not a UX path */
      state.errorFlash='That action is not supported in the operator app yet.'; render();
    }

    // S4: the owed capture enters the EXISTING canonical tour-outcome
    // destination — the Tours board, whose capture workspace owns the write.
    // No second capture workflow is created here; if the board is not
    // reachable this says so honestly instead of improvising one.
    function openTourCapture(row){
      try{
        if(typeof window!=='undefined' && typeof window.openLeasingDash==='function'){
          window.openLeasingDash('tours'); return;
        }
      }catch(e){ state.errorFlash=(e&&e.message)||'Could not open Tours.'; render(); return; }
      state.errorFlash='The Tours board is not connected to the Leasing shell.'; render();
    }

    async function submit(fn){
      if(!state.panel) return;
      state.panel.busy=true; state.panel.error=null; render();
      try{
        var out=await fn(); state.panel=null; state.flash=(out&&(out.receipt||out.message))||'Done.';
        await refresh(); setTimeout(function(){state.flash=null;render();},6000);
      }catch(e){ state.panel.busy=false; state.panel.error=(e&&(e.publicMessage||e.message))||'That did not go through.'; render(); }
    }

    function ownerText(row){
      var name=row.accountable_user_name||row.owner_name;
      if(name) return esc(name)+(row.owner_basis?' · '+esc(humanCode(row.owner_basis)):'');
      return 'Unassigned';
    }
    function rowUnassigned(row){
      // Server-authored when present; the old owner_name inference remains only
      // for a pre-S4 payload during the rolling deploy.
      if(row.assignment_state) return row.assignment_state==='unassigned';
      return !row.owner_name;
    }
    // S4: the waiting party is SERVER-authored (waiting_on). The browser only
    // words it: for the ruled 'prospect' value the display may say applicant
    // when the relationship demonstrably is one (an application exists).
    function waitingText(row){
      if(row.operating_state!=='waiting' || !row.waiting_on) return null;
      if(row.waiting_on==='prospect') return row.application_id?'Waiting on the applicant':'Waiting on the prospect';
      return 'Waiting on '+humanCode(row.waiting_on);
    }
    function activityText(row){
      if(!row.latest_activity_at || !row.latest_activity_label) return null;
      var t=Date.parse(row.latest_activity_at); if(isNaN(t)) return null;
      var d=new Date(t);
      return 'Last: '+humanCode(row.latest_activity_label)+' · '+d.toLocaleDateString(undefined,{month:'short',day:'numeric'});
    }
    function taskSecondary(row){
      if(row.source!=='followup_rail') return '';
      var key=esc(row.desk_key);
      // Unsupported primary work is not silently completable, but task administration
      // remains available so the obligation can still be reassigned, rescheduled, or
      // opened in the canonical Person Card rather than becoming operationally stuck.
      var complete=(!row.action_unsupported && row.primary_action&&row.primary_action.code!=='complete_task')
        ? '<button class="pslh-btn" data-act="complete" data-key="'+key+'">Complete</button>'
        : '';
      return '<details class="pslh-more"><summary aria-label="More actions">More</summary><div class="pslh-menu">'+
        complete+
        '<button class="pslh-btn" data-act="reassign" data-key="'+key+'">Reassign</button>'+
        '<button class="pslh-btn" data-act="changeDue" data-key="'+key+'">Change time</button>'+
        (row.person_id?'<button class="pslh-btn" data-act="message" data-key="'+key+'">Message</button>':'')+
      '</div></details>';
    }

    function rowHTML(row){
      var dueClass=row.due_state==='overdue'?' overdue':'';
      var unassigned=rowUnassigned(row);
      var ownerClass=unassigned?' unassigned':'';
      var unit=row.unit_number||row.unit_label||null;
      var waiting=waitingText(row);
      var activity=activityText(row);
      var rowClasses='pslh-row'+(row.due_state==='overdue'?' overdue':'')+(row.blocker_code?' blocked':'')+(waiting?' waiting':'')+(unassigned?' unassigned':'');
      var personName=esc(row.person_name||'Unnamed person');
      var person=row.person_id
        ? '<button type="button" class="pslh-person pslh-person-link" data-act="person" data-key="'+esc(row.desk_key)+'" aria-label="Open '+personName+' relationship">'+personName+'</button>'
        : '<span class="pslh-person">'+personName+'</span>';
      // Blockers: the label is SERVER-owned (blocker_label). The browser never
      // translates blocker codes on its own; without a label it shows the
      // machine code verbatim rather than inventing a sentence.
      var blocker=row.blocker_code
        ? '<div class="pslh-blocker">'+esc(row.blocker_label||('Needs review · '+humanCode(row.blocker_code)))+'</div>'
        : '';
      return '<div class="'+rowClasses+'" data-desk-key="'+esc(row.desk_key)+'">'+
        '<div class="pslh-row-main"><div class="pslh-row-top">'+person+(unit?'<span class="pslh-unit">'+esc(unit)+'</span>':'')+(waiting?'<span class="pslh-wait" data-ps-waiting="'+esc(row.waiting_on)+'">'+esc(waiting)+'</span>':'')+'</div>'+
          '<div class="pslh-state">'+esc(row.state_label||row.label||'Leasing work')+'</div>'+
          blocker+
          '<div class="pslh-meta"><span class="pslh-owner'+ownerClass+'">'+ownerText(row)+'</span><span class="pslh-due'+dueClass+'">'+esc(fmtDue(row.due_at,row.due_state))+'</span>'+(activity?'<span class="pslh-activity">'+esc(activity)+'</span>':'')+(row.related_open_count>1?'<span class="pslh-related">'+esc(row.related_open_count)+' open items</span>':'')+'</div></div>'+
        '<div class="pslh-actions">'+(row.action_unsupported
          ? '<div class="pslh-unavailable"><button class="pslh-btn" disabled>'+esc(row.action_unavailable_label||'Unavailable')+'</button><div class="pslh-unavailable-reason">'+esc(row.action_unavailable_reason||'This action is not supported in the operator app yet.')+'</div></div>'
          : '<button class="pslh-btn primary" data-act="primary" data-key="'+esc(row.desk_key)+'">'+esc(row.primary_action.label)+'</button>')
        +taskSecondary(row)+'</div></div>';
    }

    var STAGE_META={
      post_tour:{
        index:'01', title:'Post-tour', cue:'Capture, then follow up',
        desc:'Completed tours — capture what happened where it is still owed, then move the prospect toward an application.',
        empty:'No completed tours are waiting for capture or an application.'
      },
      application:{
        index:'02', title:'Application', cue:'Review and prepare',
        desc:'Application sent through submission, review, approval, terms, and lease preparation.',
        empty:'No prospects are currently in the application stage.'
      },
      lease_sent:{
        index:'03', title:'Lease', cue:'Terms to execution',
        desc:'Terms, packet, signatures, and execution — including work that waits on the applicant — until the relationship leaves Leasing.',
        empty:'Nothing is currently between confirmed terms and final execution.'
      }
    };
    // S4 ruling: the stage TITLE is server-authored when the projection sends
    // stage_labels (the third stage presents as "Lease", never universally as
    // "Lease sent"). The local title is only the rolling-deploy fallback.
    function stageTitle(stage){
      var labels=(state.desk&&state.desk.stage_labels)||null;
      return (labels&&labels[stage])||STAGE_META[stage].title;
    }

    function stageTabsHTML(){
      var counts=state.desk.stage_counts||{};
      return '<div class="pslh-tabs" role="tablist" aria-label="Leasing lifecycle">'+ACTIVE_STAGES.map(function(stage){
        var m=STAGE_META[stage],active=state.activeStage===stage;
        var count=counts[stage]==null?(state.desk.stages[stage]||[]).length:counts[stage];
        return '<button type="button" id="pslh-tab-'+stage+'" class="pslh-tab'+(active?' active':'')+'" role="tab" aria-selected="'+(active?'true':'false')+'" aria-controls="pslh-panel-'+stage+'" tabindex="'+(active?'0':'-1')+'" data-act="stage" data-stage="'+stage+'">'+
          '<span class="pslh-tab-index">'+m.index+'</span><span class="pslh-tab-copy"><span class="pslh-tab-title">'+esc(stageTitle(stage))+'</span><span class="pslh-tab-cue">'+m.cue+'</span></span><strong class="pslh-tab-count">'+esc(count)+'</strong></button>';
      }).join('')+'</div>';
    }

    function activeStageHTML(){
      var stage=ACTIVE_STAGES.indexOf(state.activeStage)>=0?state.activeStage:'post_tour';
      var m=STAGE_META[stage],rows=state.desk.stages[stage]||[];
      return '<section id="pslh-panel-'+stage+'" class="pslh-stage" role="tabpanel" tabindex="0" aria-labelledby="pslh-tab-'+stage+'" data-stage-panel="'+stage+'"><div class="pslh-stage-head"><div class="pslh-stage-desc">'+m.desc+'</div><span class="pslh-stage-count">'+rows.length+' '+(rows.length===1?'relationship':'relationships')+'</span></div><div class="pslh-stage-body">'+
        (rows.length?rows.map(rowHTML).join(''):'<div class="pslh-empty" data-ps-state="empty">'+m.empty+'</div>')+
        '</div></section>';
    }

    var REOPEN_REASON={REOPEN_WINDOW_EXPIRED:'past the recovery window',DOWNSTREAM_WORK_EXISTS:'later work already happened',RELATIONSHIP_CLOSED:'the relationship is closed',ALREADY_RECOVERED:'already reopened once',DECISION_NOT_RECOVERABLE:'a decision, not a task'};
    function closedHTML(){
      var r=closedReceipt(state.desk), rows=r.items||[], hrs=r.window_hours||72;
      var body=rows.length?rows.map(function(row){
        var key=esc(row.desk_key||row.obligation_id), reopen=row.reopenable
          ? '<button class="pslh-btn small" data-act="reopen" data-key="'+key+'">Reopen</button>'
          : '<span class="pslh-noreopen">Can’t reopen · '+esc(REOPEN_REASON[row.not_reopenable_reason]||'not recoverable')+'</span>';
        var personName=esc(row.person_name||'Unnamed person');
        var person=row.person_id
          ? '<button type="button" class="pslh-crow-name pslh-person-link" data-act="person" data-key="'+key+'">'+personName+'</button>'
          : '<span class="pslh-crow-name">'+personName+'</span>';
        return '<div class="pslh-crow"><div><div>'+person+' <small>'+esc(row.label||row.state_label||'')+'</small></div><div class="pslh-crow-meta">'+esc(row.resolution||'closed')+' · '+esc(row.closed_by_name||'system')+' · '+esc(relClosed(row.closed_at))+'<div class="pslh-crow-act">'+reopen+'</div></div>';
      }).join(''):'<div class="pslh-empty">Nothing closed in the last '+esc(hrs)+' hours.</div>';
      return '<details class="pslh-closed"><summary>Recently closed <span>'+rows.length+'</span></summary>'+body+'</details>';
    }

    function recordsSection(){ return (state.desk && state.desk.application_records) || null; }

    function headerHTML(){
      var c=state.desk.stage_counts||{};
      var total=c.total;
      if(total==null) total=ACTIVE_STAGES.reduce(function(n,stage){return n+(state.desk.stages[stage]||[]).length;},0);
      var records=recordsSection();
      // S5: the two ruled views. The switch renders only when the server
      // projects records (rolling deploy: a pre-S5 API shows Active Work alone).
      var toggle='';
      if(records){
        var rc=(records.counts&&records.counts.total!=null)?records.counts.total:records.records.length;
        toggle='<div class="pslh-views" role="tablist" aria-label="Follow Ups views">'
          +'<button type="button" class="pslh-view'+(state.view==='work'?' active':'')+'" role="tab" aria-selected="'+(state.view==='work')+'" data-act="view" data-view="work">Active Work <b>'+esc(total)+'</b></button>'
          +'<button type="button" class="pslh-view'+(state.view==='records'?' active':'')+'" role="tab" aria-selected="'+(state.view==='records')+'" data-act="view" data-view="records">Application Records <b>'+esc(rc)+'</b></button>'
          +'</div>';
      }
      var totalHtml=state.view==='records' && records
        ? '<div class="pslh-total"><strong>'+esc((records.counts&&records.counts.total)||records.records.length)+'</strong><span>applications on record</span></div>'
        : '<div class="pslh-total"><strong>'+esc(total)+'</strong><span>active '+(total===1?'relationship':'relationships')+'</span></div>';
      // NAMING RULING (before Slice 6): destination title Leasing Work →
      // Follow Ups, with the owner's suggested purpose sentence for the
      // Active Work view. The Application Records sub is untouched — the
      // ruling addressed the destination's own purpose sentence, not the
      // records view's.
      var sub=state.view==='records'
        ? 'The complete application record — active work and exited history.'
        : 'Keep every active lead moving toward an executed lease.';
      return '<header class="pslh-head"><div class="pslh-head-copy"><div class="pslh-eyebrow">Leasing pipeline</div><h1 class="pslh-title">Follow Ups</h1><div class="pslh-sub">'+sub+'</div>'+toggle+'</div>'+totalHtml+'</header>';
    }

    // ── S5: APPLICATION RECORDS view — server-classified, browser-rendered ──
    function recordChip(record){
      if(record.record_state==='active'){
        var stageLabel=(state.desk.stage_labels&&state.desk.stage_labels[record.active_stage])||record.active_stage||'Active';
        return '<span class="pslh-recchip active">'+esc(stageLabel)+'</span>';
      }
      if(record.record_state==='exited') return '<span class="pslh-recchip exited">Record</span>';
      return '<span class="pslh-recchip">Unresolved</span>';
    }
    function recordFacts(record){
      // An EXITED record's row states its exit and nothing else. Completeness
      // and blockers describe work to be done; printing them beside a closed
      // or activated application invites action on a finished relationship.
      // Nothing is lost: every fact remains in the canonical detail one click
      // away, and in the projection itself.
      if(record.record_state==='exited') return [];
      var facts=[];
      if(record.completeness==='incomplete') facts.push(record.missing_count?record.missing_count+' missing':'incomplete');
      if(record.packet_status && record.packet_status!=='not_generated') facts.push('packet '+humanCode(record.packet_status));
      if(record.main_blocker) facts.push(record.main_blocker);
      return facts;
    }
    function recordRowHTML(record){
      var personName=esc(record.person_name||'Unnamed applicant');
      var person=record.person_id
        ? '<button type="button" class="pslh-person pslh-person-link" data-act="recperson" data-app="'+esc(record.application_id)+'">'+personName+'</button>'
        : '<span class="pslh-person">'+personName+'</span>';
      var unit=record.unit_number?'<span class="pslh-unit">'+esc(record.unit_number)+'</span>':'';
      var line=record.record_state==='exited' ? (record.exit_label||'This application has left active leasing.')
        : record.record_state==='active' ? (record.state_label||'Active leasing work.')
        : 'The server did not classify this record. Open it to see its current truth.';
      var facts=recordFacts(record);
      var blocker=record.blocker_label?'<div class="pslh-blocker">'+esc(record.blocker_label)+'</div>':'';
      return '<div class="pslh-row'+(record.record_state==='exited'?' pslh-rec-exited':'')+'" data-record-id="'+esc(record.application_id)+'">'
        +'<div class="pslh-row-main"><div class="pslh-row-top">'+person+unit+recordChip(record)+'</div>'
        +'<div class="pslh-state">'+esc(line)+'</div>'+blocker
        +(facts.length?'<div class="pslh-meta">'+facts.map(function(x){return '<span>'+esc(x)+'</span>';}).join('')+'</div>':'')
        +'</div><div class="pslh-actions"><button class="pslh-btn primary" data-act="recopen" data-app="'+esc(record.application_id)+'">'+esc(record.primary_action.label||'Open')+'</button></div></div>';
    }
    function recordsHTML(){
      var records=recordsSection();
      if(!records) return '<section class="pslh-stage"><div class="pslh-stage-body"><div class="pslh-empty">Application Records requires the updated server projection. Active Work remains available.</div></div></section>';
      var rows=records.records||[];
      var counts=records.counts||{};
      var head='<div class="pslh-stage-head"><div class="pslh-stage-desc">Every application for this property — '
        +esc(counts.active!=null?counts.active:'?')+' active · '+esc(counts.exited!=null?counts.exited:'?')+' exited. Each opens the canonical application detail.</div>'
        +'<span class="pslh-stage-count">'+rows.length+' '+(rows.length===1?'record':'records')+'</span></div>';
      var body=rows.length?rows.map(recordRowHTML).join('')
        :'<div class="pslh-empty" data-ps-state="empty">No applications are on record for this property.</div>';
      return '<section class="pslh-stage" data-records-panel="1">'+head+'<div class="pslh-stage-body">'+body+'</div></section>';
    }
    function findRecord(appId){
      var records=recordsSection();
      return records?(records.records||[]).filter(function(r){return String(r.application_id)===String(appId);})[0]||null:null;
    }

    function render(){
      if(!root) return;
      if(!hasSession()){ root.innerHTML='<div class="pslh"><div class="pslh-empty">Leasing is available after staff sign-in.</div></div>'; return; }
      var psState=state.error?'unavailable':state.loading&&!state.desk?'loading':state.desk?'data':'empty';
      var h='<div class="pslh" data-ps-source="live" data-ps-state="'+psState+'">';
      if(state.error){ h+='<div class="pslh-error">Leasing is unavailable right now: '+esc(state.error)+' <button class="pslh-btn small" data-act="retry">Retry</button></div></div>'; root.innerHTML=h; bind(); return; }
      if(!state.desk){ h+='<div class="pslh-loading">Loading Leasing…</div></div>'; root.innerHTML=h; bind(); return; }
      h+=headerHTML();
      if(state.flash) h+='<div class="pslh-flash">'+esc(state.flash)+'</div>';
      if(state.errorFlash) h+='<div class="pslh-flash err">'+esc(state.errorFlash)+'</div>';
      h+=(state.view==='records' ? recordsHTML() : stageTabsHTML()+activeStageHTML()+closedHTML())+'</div>';
      root.innerHTML=h; if(state.panel) root.appendChild(panelHTML()); bind();
    }

    function panelHTML(){
      var p=state.panel,row=p.row,title='',body='',confirm='Save';
      if(p.kind==='complete'){
        title='Complete follow-up'; confirm='Complete';
        body='<p class="pslh-p">Mark <b>'+esc(row.state_label||row.label||'this follow-up')+'</b> for '+esc(row.person_name||'this person')+' as done.</p><label class="pslh-label">Coverage basis, when applicable</label><select id="pslhBasis" class="pslh-input"><option value="">I own this work</option><option value="coverage">Covering for the owner</option><option value="manager_intervention">Manager stepped in</option><option value="completed_together">Done together</option><option value="unassigned_pickup">Picked up while unassigned</option><option value="no_longer_needed">No longer needed</option></select><label class="pslh-label">Proof or note</label><textarea id="pslhProof" class="pslh-input" placeholder="What happened."></textarea>';
      }else if(p.kind==='reassign'){
        title='Reassign follow-up'; confirm='Reassign'; var staff=state.staff||[];
        body='<p class="pslh-p">Only this obligation moves. Conversation ownership stays unchanged.</p><label class="pslh-label">Assign to</label><select id="pslhTo" class="pslh-input"><option value="">Choose a person</option>'+staff.map(function(s){return '<option value="'+esc(s.user_id||s.id)+'">'+esc(s.name||s.display_name||s.user_id||s.id)+'</option>';}).join('')+'</select><label class="pslh-label">Reason</label><textarea id="pslhReason" class="pslh-input" placeholder="Why this handoff makes sense."></textarea>';
      }else if(p.kind==='changeDue'){
        title='Change follow-up time'; confirm='Change time';
        body='<label class="pslh-label">New due time</label><input id="pslhDue" class="pslh-input" type="datetime-local" value="'+esc(toLocalInputValue(row.due_at))+'"><label class="pslh-label">Reason</label><textarea id="pslhReason" class="pslh-input" placeholder="Why the commitment changed."></textarea>';
      }else if(p.kind==='reopen'){
        title='Reopen follow-up'; confirm='Reopen';
        body='<p class="pslh-p">The prior close remains in history. Reopening creates active work again.</p><label class="pslh-label">New due time</label><input id="pslhDue" class="pslh-input" type="datetime-local" value="'+esc(toLocalInputValue(null))+'"><label class="pslh-label">Reason</label><textarea id="pslhReason" class="pslh-input" placeholder="Why this work needs to return."></textarea>';
      }else if(p.kind==='sendapp'){
        title='Send application to '+esc(row.person_name||'this prospect')+'?'; confirm='';
        var _elig=(p.units||[]).map(function(u){
          var multi=Number(u.rentable_space_count||0)>1;
          var label='Unit '+String(u.unit_number||u.label||'').trim();
          if(multi && u.space_label) label+=' · '+u.space_label;
          return '<button class="pslh-unit-btn" data-act="pickunit" data-unit="'+esc(u.unit_id||u.id)+'" data-space="'+esc(u.space_id||u.resolved_space_id||'')+'"><b>'+esc(label)+'</b><span>Send application</span></button>';
        }).join('');
        // Unsupported units are NOT selectable and carry no pickunit action.
        // The copy must not imply a space was simply left unselected.
        var _unsup=(p.unsupported||[]).map(function(u){return '<div class="pslh-unit-blocked"><b>'+esc(u.unit_number||'Unit')+'</b><span>'+esc(u.reason||'Individual-space application links are not supported for this unit yet.')+'</span></div>';}).join('');
        if(_unsup) _unsup='<div class="pslh-unit-blocked-h">Not available for application links yet</div>'+_unsup;
        body='<p class="pslh-p">Choose the home they are applying for. Selecting it sends the application by text.</p>'+(p.busy?'<div class="pslh-loading">Loading leaseable units…</div>':'<div class="pslh-unit-list">'+(_elig||(_unsup?'':'<div class="pslh-empty">No leaseable unit is available.</div>'))+_unsup+'</div>');
      }
      var err=p.error?'<div class="pslh-error">'+esc(p.error)+'</div>':'';
      var foot='<div class="pslh-sheet-actions"><button class="pslh-btn" data-act="cancel">Cancel</button>'+(confirm?'<button class="pslh-btn primary" data-act="confirm"'+(p.busy?' disabled':'')+'>'+confirm+'</button>':'')+'</div>';
      return element('<div class="pslh-scrim" data-act="scrim"><div class="pslh-sheet" role="dialog" aria-modal="true"><div class="pslh-sheet-title">'+title+'</div>'+body+err+foot+'</div></div>');
    }
    function element(html){ var d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }

    function confirmPanel(){
      var p=state.panel;if(!p)return;var row=p.row,oid=row.obligation_id;
      if(p.kind==='complete'){
        var basis=(root.querySelector('#pslhBasis')||{}).value||null,proof=(root.querySelector('#pslhProof')||{}).value||null;
        submit(function(){return write('resolveTask',{obligationId:oid,result:'completed',proof:proof,resolution_basis:basis});});
      }else if(p.kind==='reassign'){
        var to=(root.querySelector('#pslhTo')||{}).value||null,reason=(root.querySelector('#pslhReason')||{}).value||null;
        if(!to){p.error='Choose who owns the work.';render();return;}
        submit(function(){return write('reassignTask',{obligationId:oid,to_user_id:to,reason:reason,idempotency_key:uid()});});
      }else if(p.kind==='changeDue'){
        var due=localInputToISO((root.querySelector('#pslhDue')||{}).value),reason2=(root.querySelector('#pslhReason')||{}).value||null;
        if(!due){p.error='Choose a new due time.';render();return;}
        submit(function(){return write('changeDueTask',{obligationId:oid,new_due_at:due,reason:reason2,idempotency_key:uid()});});
      }else if(p.kind==='reopen'){
        var due2=localInputToISO((root.querySelector('#pslhDue')||{}).value),reason3=(root.querySelector('#pslhReason')||{}).value||null;
        if(!due2){p.error='A reopened task needs a new due time.';render();return;}
        submit(function(){return write('reopenTask',{obligationId:oid,new_due_at:due2,reason:reason3,idempotency_key:uid()});});
      }
    }

    function bind(){
      if(!root)return;
      root.querySelectorAll('[data-act]').forEach(function(node){
        if(node.closest&&node.closest('.pslh-scrim'))return;
        node.onclick=function(ev){
          ev.preventDefault();var act=node.getAttribute('data-act'),key=node.getAttribute('data-key');
          if(act==='retry'){refresh();return;}
          if(act==='view'){var v=node.getAttribute('data-view');if(v==='work'||v==='records'){state.view=v;render();}return;}
          if(act==='recopen'||act==='recperson'){
            var record=findRecord(node.getAttribute('data-app'));if(!record)return;
            if(act==='recperson'){openCard(record,'info');return;}
            openApplicationReview(record);return;
          }
          if(act==='stage'){var stage=node.getAttribute('data-stage');if(ACTIVE_STAGES.indexOf(stage)>=0){state.activeStage=stage;state.stageTouched=true;render();}return;}
          var row=findRow(key);if(!row)return;
          if(act==='person'){openCard(row,'info');return;}if(act==='primary'){runPrimary(row);return;}if(act==='complete'||act==='reassign'||act==='changeDue'||act==='reopen'){openPanel(act,key);return;}if(act==='message'){openCard(row,'communication');return;}
        };
      });
      root.querySelectorAll('.pslh-tab').forEach(function(tab){
        tab.onkeydown=function(ev){
          if(['ArrowLeft','ArrowRight','Home','End'].indexOf(ev.key)<0) return;
          var tabs=Array.prototype.slice.call(root.querySelectorAll('.pslh-tab'));
          var index=tabs.indexOf(tab),next=index;
          if(ev.key==='Home') next=0;
          else if(ev.key==='End') next=tabs.length-1;
          else if(ev.key==='ArrowRight') next=(index+1)%tabs.length;
          else if(ev.key==='ArrowLeft') next=(index-1+tabs.length)%tabs.length;
          ev.preventDefault(); tabs[next].click(); tabs[next].focus();
        };
      });
      var scrim=root.querySelector('.pslh-scrim');if(!scrim)return;
      scrim.querySelectorAll('[data-act]').forEach(function(node){node.onclick=function(ev){ev.preventDefault();var act=node.getAttribute('data-act');if(act==='cancel'||(act==='scrim'&&ev.target===scrim)){closePanel();return;}if(act==='confirm'){confirmPanel();return;}if(act==='pickunit'&&state.panel){sendNow(state.panel.row,{unit_id:node.getAttribute('data-unit'),space_id:node.getAttribute('data-space')||null});}};});
    }

    function alignLegacyShell(){
      var old=document.getElementById('leasingHeader');
      if(old){ old.hidden=true; old.setAttribute('data-ps-replaced-by','canonical-leasing-home'); }
    }
    function mount(node,opts){
      root=node||root||document.getElementById('psFollowupsEntry');
      if(opts && (opts.view==='records'||opts.view==='work')) state.view=opts.view;
      alignLegacyShell(); render(); refresh();
    }
    function showRecords(){ state.view='records'; render(); }
    function tileStatus(){
      // S4: prefer the projection's own operating_counts — the same numbers the
      // destination renders, so home and destination reconcile by construction.
      var oc=state.desk&&state.desk.operating_counts;
      if(oc && oc.total_active!=null){
        return { enabled:hasSession(), connected:!!state.desk,
          open:oc.total_active, overdue:oc.overdue||0, unassigned:oc.unassigned||0, waiting:oc.waiting||0 };
      }
      var rows=state.desk?ACTIVE_STAGES.reduce(function(a,s){return a.concat(state.desk.stages[s]||[]);},[]):[];
      return {
        enabled:hasSession(),
        connected:!!state.desk,
        open:rows.length,
        overdue:rows.filter(function(r){return r.due_state==='overdue';}).length,
        unassigned:rows.filter(rowUnassigned).length
      };
    }
    function onReturn(){ if(!state.awaitingReviewReturn)return;state.awaitingReviewReturn=false;refresh(); }
    function destroy(){
      if(typeof window!=='undefined') window.removeEventListener('ps:leasing-return',onReturn);
      if(typeof document!=='undefined'&&visibilityHandler) document.removeEventListener('visibilitychange',visibilityHandler);
      root=null;
    }
    if(typeof window!=='undefined'){
      window.addEventListener('ps:leasing-return',onReturn);
      visibilityHandler=function(){if(document.visibilityState==='visible')onReturn();};
      document.addEventListener('visibilitychange',visibilityHandler);
    }
    return {mount:mount,refresh:refresh,tileStatus:tileStatus,showRecords:showRecords,openApplicationSend:openApplicationSend,destroy:destroy,_state:function(){return state;},_validateDesk:validateDesk};
  }

  var controller=null;
  function get(){if(!controller)controller=makeController();return controller;}
  function entryHTML(){return '<div id="psFollowupsEntry" data-ps-leasing-home="1"></div>';}
  function mount(node,opts){var n=node||document.getElementById('psFollowupsEntry');if(n)get().mount(n,opts);}
  function refresh(){if(controller)return controller.refresh();}
  function showRecords(){get().showRecords();}
  function openApplicationSend(input){return get().openApplicationSend(input);}
  function tileStatus(){try{return get().tileStatus();}catch(_){return {enabled:false,connected:false,open:0,overdue:0,unassigned:0};}}
  function reset(){if(controller&&typeof controller.destroy==='function')controller.destroy();controller=null;}

  if(typeof window!=='undefined'){
    var surface=Object.freeze({mount:mount,entryHTML:entryHTML,tileStatus:tileStatus,refresh:refresh,showRecords:showRecords,openApplicationSend:openApplicationSend,reset:reset});
    try{Object.defineProperty(window,'__psFollowups',{value:surface,writable:false,configurable:false,enumerable:true});}
    catch(_){window.__psFollowups=surface;}
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={makeController:makeController,validateDesk:validateDesk,_helpers:{esc:esc,fmtDue:fmtDue,relClosed:relClosed,closedReceipt:closedReceipt}};}
})();
