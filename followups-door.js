/* ════════════════════════════════════════════════════════════════════════════
   PROPERTY SPINE — CANONICAL LEASING HOME (Leg 3 frontend shell)
   ────────────────────────────────────────────────────────────────────────────
   Reads ONE server-authored projection: GET /operator/leasing/desk through the
   sealed __psLive loader resource `leasingDesk`.

   The browser does not classify, rank, deduplicate, or infer lifecycle state.
   It preserves server band order and dispatches the structured primary action.

   Existing task writes remain on the canonical named __psLive methods:
     resolveTask · reassignTask · reopenTask · changeDueTask
     sendApplicationSms · leaseableUnits

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
      ":root{--pslh-ink:#151511;--pslh-muted:#6d685f;--pslh-faint:#9a958b;--pslh-line:#d8d4cb;--pslh-soft:#ece8df;--pslh-paper:#fff;--pslh-warm:#f4ede0;--pslh-warm-2:#fbf7ef;--pslh-sage:#e7f0eb;--pslh-sage-2:#f4f8f5;--pslh-red:#a13d31;--pslh-amber:#96681d;--pslh-green:#23664e;--pslh-shadow:0 18px 44px rgba(33,28,18,.08)}",
      ".pslh{max-width:1060px;color:var(--pslh-ink);font-family:\"IBM Plex Sans\",system-ui,sans-serif}",
      ".pslh *{box-sizing:border-box}",
      ".pslh-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(330px,420px);gap:38px;align-items:end;padding:4px 0 26px}",
      ".pslh-eyebrow{font:600 9px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--pslh-green)}",
      ".pslh-title{font-family:\"Fraunces\",Georgia,serif;font-size:44px;font-weight:500;letter-spacing:-.045em;line-height:.98;margin:8px 0 0}",
      ".pslh-sub{font-size:13px;color:var(--pslh-muted);line-height:1.55;margin-top:10px;max-width:600px}",
      ".pslh-pulse{display:grid;grid-template-columns:1.25fr repeat(3,1fr);align-items:stretch;border:1px solid var(--pslh-line);border-radius:20px;background:rgba(255,255,255,.86);box-shadow:0 10px 28px rgba(33,28,18,.05);overflow:hidden}",
      ".pslh-pulse-cell{min-height:76px;padding:14px 14px 12px;border-left:1px solid var(--pslh-soft);display:flex;flex-direction:column;justify-content:center}",
      ".pslh-pulse-cell:first-child{border-left:0;background:#f7f4ed}",
      ".pslh-pulse-cell strong{font-family:\"Fraunces\",Georgia,serif;font-size:28px;font-weight:500;line-height:1}",
      ".pslh-pulse-cell span{margin-top:7px;font:600 8.5px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--pslh-faint)}",
      ".pslh-pulse-cell.overdue strong{color:var(--pslh-red)}.pslh-pulse-cell.today strong{color:var(--pslh-amber)}.pslh-pulse-cell.unassigned strong{color:#38586a}",
      ".pslh-flash{border:1px solid #c9ddd2;border-radius:14px;background:#f3f8f5;color:var(--pslh-green);padding:11px 13px;font-size:12px;margin:6px 0 18px}",
      ".pslh-flash.err{border-color:#e2c4be;background:#fbefed;color:var(--pslh-red)}",
      ".pslh-band{margin-top:22px;border:1px solid var(--pslh-line);border-radius:24px;background:#fff;overflow:hidden;box-shadow:var(--pslh-shadow)}",
      ".pslh-band + .pslh-band{margin-top:24px}",
      ".pslh-band-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:22px;align-items:center;padding:23px 24px 21px;border-bottom:1px solid rgba(99,86,61,.12);position:relative;overflow:hidden}",
      ".pslh-band-head:after{content:\"\";position:absolute;right:-74px;top:-92px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.36);pointer-events:none}",
      ".pslh-band.advance .pslh-band-head{background:linear-gradient(135deg,#f6ecda 0%,#fbf7ef 76%)}",
      ".pslh-band.follow .pslh-band-head{background:linear-gradient(135deg,#e5efe9 0%,#f3f8f5 76%)}",
      ".pslh-band.bind .pslh-band-head{background:linear-gradient(135deg,#dfeee7 0%,#f1f7f3 76%)}",
      ".pslh-band-kicker{font:700 9px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.17em;text-transform:uppercase;color:var(--pslh-muted);margin-bottom:7px}",
      ".pslh-band.advance .pslh-band-kicker{color:#88601c}.pslh-band.follow .pslh-band-kicker,.pslh-band.bind .pslh-band-kicker{color:var(--pslh-green)}",
      ".pslh-band-title{font-family:\"Fraunces\",Georgia,serif;font-size:32px;font-weight:500;letter-spacing:-.04em;line-height:1}",
      ".pslh-band-desc{font-size:12.5px;color:var(--pslh-muted);margin-top:8px;line-height:1.48;max-width:650px}",
      ".pslh-band-count{position:relative;z-index:1;min-width:62px;height:62px;border-radius:999px;background:rgba(21,21,17,.92);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(33,28,18,.13)}",
      ".pslh-band.follow .pslh-band-count{background:#285e4a}.pslh-band-count strong{font-family:\"Fraunces\",Georgia,serif;font-size:24px;font-weight:500;line-height:.92}.pslh-band-count span{font:600 7px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.09em;text-transform:uppercase;opacity:.68;margin-top:4px}",
      ".pslh-band-body{padding:0 24px;background:#fff}",
      ".pslh-empty{font-size:12px;color:var(--pslh-faint);padding:21px 0 24px;line-height:1.5}",
      ".pslh-row{display:grid;grid-template-columns:5px minmax(0,1fr) auto;gap:18px;align-items:center;padding:19px 0;border-top:1px solid var(--pslh-soft);transition:background .14s ease}",
      ".pslh-band-body .pslh-row:first-child{border-top:0}",
      ".pslh-row:before{content:\"\";width:5px;height:42px;border-radius:999px;background:#d8d4cb}",
      ".pslh-row.overdue:before{background:var(--pslh-red)}.pslh-row.blocked:before{background:var(--pslh-amber)}.pslh-row.unassigned:before{background:#6b8794}.pslh-row:hover{background:#fcfbf8}",
      ".pslh-row-main{min-width:0}",
      ".pslh-row-top{display:flex;align-items:baseline;gap:10px;min-width:0}",
      ".pslh-person{font-size:15px;font-weight:650;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".pslh-unit{font:500 9px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--pslh-faint);white-space:nowrap}",
      ".pslh-state{font-size:13px;color:#35332e;margin-top:5px;line-height:1.45}",
      ".pslh-blocker{font-size:11.5px;color:var(--pslh-amber);margin-top:5px;line-height:1.4;font-weight:500}",
      ".pslh-meta{display:flex;gap:8px 16px;flex-wrap:wrap;margin-top:8px;font-size:11.5px;color:var(--pslh-faint)}",
      ".pslh-owner.unassigned{color:#5f7c89}.pslh-due.overdue{color:var(--pslh-red);font-weight:600}",
      ".pslh-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;min-width:190px;position:relative}",
      ".pslh-btn{appearance:none;border:1px solid #cbc9c2;background:#fff;color:#292823;border-radius:999px;padding:9px 14px;font:600 10.5px/1.2 \"IBM Plex Sans\",sans-serif;cursor:pointer;white-space:nowrap;transition:transform .12s ease,box-shadow .12s ease,background .12s ease}",
      ".pslh-btn:hover{border-color:#8d8981;background:#faf9f6;transform:translateY(-1px)}.pslh-btn:focus-visible{outline:2px solid #171713;outline-offset:3px}",
      ".pslh-btn.primary{background:var(--pslh-ink);color:#fff;border-color:var(--pslh-ink);box-shadow:0 7px 16px rgba(21,21,17,.14)}.pslh-btn.primary:hover{background:#302f2a;box-shadow:0 9px 20px rgba(21,21,17,.18)}",
      ".pslh-btn.ghost{border-color:transparent;background:transparent;color:#625f58;padding-left:4px;padding-right:4px;box-shadow:none}",
      ".pslh-btn.small{padding:6px 10px;font-size:10px}",
      ".pslh-more{position:relative}.pslh-more>summary{list-style:none;cursor:pointer;font-size:11px;color:#777169;padding:9px 2px;user-select:none}.pslh-more>summary::-webkit-details-marker{display:none}.pslh-more>summary:after{content:\" \u00b7\u00b7\u00b7\";letter-spacing:.08em}",
      ".pslh-menu{position:absolute;right:0;top:37px;z-index:40;width:164px;background:#fff;border:1px solid #d7d5ce;border-radius:13px;padding:6px;box-shadow:0 18px 44px rgba(20,18,14,.14)}",
      ".pslh-menu .pslh-btn{display:block;width:100%;border:0;border-radius:8px;background:transparent;text-align:left;padding:9px 10px;box-shadow:none}.pslh-menu .pslh-btn:hover{background:#f5f3ee;transform:none}",

      ".pslh-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:2px 0 0;border:1px solid var(--pslh-line);border-radius:16px;background:#fff;overflow:hidden}",
      ".pslh-tab{appearance:none;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;min-height:54px;border:0;border-left:1px solid var(--pslh-soft);border-bottom:3px solid transparent;background:#fff;padding:0 14px;color:var(--pslh-muted);font:600 11px/1.2 \"IBM Plex Sans\",sans-serif;text-align:left;cursor:pointer}",
      ".pslh-tab:first-child{border-left:0}.pslh-tab strong{font-family:\"Fraunces\",Georgia,serif;font-size:20px;font-weight:500;color:var(--pslh-faint)}",
      ".pslh-tab.active{border-bottom-color:var(--pslh-ink);background:#fcfbf8;color:var(--pslh-ink)}.pslh-tab.active strong{color:var(--pslh-ink)}",
      ".pslh-tab:focus-visible{outline:2px solid var(--pslh-ink);outline-offset:-3px}",
      ".pslh-stage{margin-top:14px;border:1px solid var(--pslh-line);border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 10px 28px rgba(33,28,18,.045)}",
      ".pslh-stage-note{padding:14px 18px;border-bottom:1px solid var(--pslh-soft);font-size:12px;line-height:1.45;color:var(--pslh-muted);background:#fbfaf6}",
      ".pslh-stage-body{padding:0 18px}",
      ".pslh-stage-body .pslh-row:first-child{border-top:0}",
      ".pslh-related{font-size:10.5px;color:var(--pslh-faint)}",
      "@media(max-width:560px){.pslh-tabs{border-radius:14px}.pslh-tab{grid-template-columns:1fr;gap:3px;min-height:58px;padding:8px 9px;text-align:center}.pslh-tab strong{font-size:18px;order:-1}.pslh-stage{border-radius:16px}.pslh-stage-note{padding:13px 15px}.pslh-stage-body{padding:0 15px}}",
      ".pslh-closed{margin-top:22px;border:1px solid var(--pslh-line);border-radius:18px;background:#faf9f5;overflow:hidden}.pslh-closed>summary{list-style:none;cursor:pointer;padding:16px 18px;font:600 10px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.08em;text-transform:uppercase;color:#605c54}",
      ".pslh-closed>summary::-webkit-details-marker{display:none}.pslh-closed>summary:after{content:\"+\";float:right;color:#8b887f}.pslh-closed[open]>summary:after{content:\"\u2013\"}.pslh-closed>summary span{color:var(--pslh-faint);margin-left:5px}",
      ".pslh-closed .pslh-crow,.pslh-closed .pslh-empty{margin:0 18px}.pslh-crow{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:13px 0;border-top:1px solid var(--pslh-soft)}",
      ".pslh-crow-name{font-size:13px;font-weight:600}.pslh-crow-name small{font-weight:400;color:var(--pslh-muted)}.pslh-crow-meta{font-size:11px;color:var(--pslh-faint);margin-top:3px}.pslh-crow-act{display:flex;align-items:center;gap:8px;flex-shrink:0}.pslh-noreopen{font-size:11px;color:var(--pslh-faint);font-style:italic}",
      ".pslh-loading{font-size:13px;color:var(--pslh-muted);padding:28px 0;border-bottom:1px solid var(--pslh-line)}",
      ".pslh-error{border:1px solid #e2c4be;border-radius:14px;background:#fbefed;color:#8d3026;padding:12px 14px;font-size:12px;line-height:1.5;margin-top:16px}.pslh-error .pslh-btn{margin-left:8px}",
      ".pslh-scrim{position:fixed;inset:0;background:rgba(15,15,15,.38);display:flex;align-items:center;justify-content:center;z-index:9000;padding:20px;backdrop-filter:blur(3px)}",
      ".pslh-sheet{background:#fff;border-radius:22px;max-width:440px;width:100%;padding:25px;box-shadow:0 30px 80px rgba(0,0,0,.24)}",
      ".pslh-sheet-title{font-family:\"Fraunces\",Georgia,serif;font-size:24px;font-weight:500;letter-spacing:-.03em;margin-bottom:11px}.pslh-p{font-size:13px;color:#5f5c56;line-height:1.5;margin:0 0 14px}.pslh-label{display:block;font:600 9px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--pslh-muted);margin:12px 0 5px}.pslh-input{width:100%;border:1px solid #d4d2cb;border-radius:10px;padding:10px 11px;font-size:13px;font-family:inherit;box-sizing:border-box}textarea.pslh-input{min-height:64px;resize:vertical}.pslh-sheet-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:19px}.pslh-unit-list{display:flex;flex-direction:column;gap:8px;margin:8px 0}.pslh-unit-btn{display:flex;justify-content:space-between;align-items:center;gap:12px;text-align:left;border:1px solid #deddd8;background:#fff;border-radius:10px;padding:11px 13px;cursor:pointer;font-family:inherit}.pslh-unit-btn:hover{border-color:#8f8b83}.pslh-unit-btn b{font-size:14px}.pslh-unit-btn span{font-size:11px;color:var(--pslh-muted)}",
      "@media(max-width:760px){.pslh-head{grid-template-columns:1fr;gap:22px}.pslh-title{font-size:39px}.pslh-pulse{grid-template-columns:1.2fr repeat(3,1fr)}.pslh-pulse-cell{min-height:68px;padding:12px 10px}.pslh-pulse-cell strong{font-size:24px}.pslh-band{margin-top:18px;border-radius:20px}.pslh-band + .pslh-band{margin-top:20px}.pslh-band-head{padding:19px 18px 18px}.pslh-band-title{font-size:28px}.pslh-band-count{width:54px;min-width:54px;height:54px}.pslh-band-body{padding:0 18px}.pslh-row{grid-template-columns:4px 1fr;gap:13px}.pslh-row:before{grid-row:1 / span 2;height:46px}.pslh-actions{grid-column:2;justify-content:space-between;min-width:0;padding-bottom:2px}.pslh-menu{left:0;right:auto}.pslh-crow{align-items:flex-start;flex-direction:column}}",
      "@media(max-width:460px){.pslh-pulse{grid-template-columns:1fr 1fr}.pslh-pulse-cell:nth-child(3){border-left:0;border-top:1px solid var(--pslh-soft)}.pslh-pulse-cell:nth-child(4){border-top:1px solid var(--pslh-soft)}.pslh-band-head{grid-template-columns:minmax(0,1fr) auto;gap:12px}.pslh-band-desc{font-size:12px}.pslh-actions{align-items:center}.pslh-btn.primary{max-width:220px;overflow:hidden;text-overflow:ellipsis}}"
,
      /* Leasing Work design refinement — calm, compact, relationship-first. */
      ".pslh{max-width:980px;margin-inline:auto}",
      ".pslh-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:34px;align-items:end;padding:4px 0 22px}",
      ".pslh-head-copy{min-width:0}.pslh-eyebrow{letter-spacing:.2em;color:var(--pslh-green)}",
      ".pslh-title{font-size:48px;letter-spacing:-.052em;line-height:.94;margin-top:10px}",
      ".pslh-sub{font-size:13px;line-height:1.5;margin-top:12px;color:var(--pslh-muted)}",
      ".pslh-total{display:flex;align-items:baseline;gap:9px;padding-bottom:3px;white-space:nowrap;color:var(--pslh-muted)}",
      ".pslh-total strong{font-family:\"Fraunces\",Georgia,serif;font-size:36px;font-weight:500;letter-spacing:-.04em;color:var(--pslh-ink)}",
      ".pslh-total span{font-size:11px}",
      ".pslh-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0;border:1px solid var(--pslh-line);border-radius:20px;background:#fff;overflow:hidden;box-shadow:0 10px 30px rgba(26,23,18,.035)}",
      ".pslh-tab{position:relative;display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:13px;align-items:center;min-height:84px;border:0;border-left:1px solid var(--pslh-soft);border-bottom:0;background:#fff;padding:15px 18px;color:var(--pslh-muted);text-align:left;cursor:pointer}",
      ".pslh-tab:first-child{border-left:0}.pslh-tab:after{content:\"\";position:absolute;left:17px;right:17px;bottom:0;height:2px;border-radius:999px;background:transparent}",
      ".pslh-tab:hover{background:#fcfbf8}.pslh-tab.active{background:#f7f5ef;color:var(--pslh-ink)}.pslh-tab.active:after{background:var(--pslh-ink)}",
      ".pslh-tab-index{font:600 9px/1 \"IBM Plex Mono\",monospace;letter-spacing:.08em;color:var(--pslh-faint)}",
      ".pslh-tab-copy{display:grid;gap:5px;min-width:0}.pslh-tab-title{font-size:13px;font-weight:650;line-height:1.2;color:inherit}.pslh-tab-cue{font-size:10.5px;line-height:1.25;color:var(--pslh-faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".pslh-tab-count{display:flex;align-items:center;justify-content:center;min-width:34px;height:34px;border:1px solid var(--pslh-line);border-radius:999px;background:#fff;font-family:\"Fraunces\",Georgia,serif;font-size:18px;font-weight:500;color:var(--pslh-muted)}",
      ".pslh-tab.active .pslh-tab-count{border-color:var(--pslh-ink);background:var(--pslh-ink);color:#fff}",
      ".pslh-tab:focus-visible{outline:2px solid var(--pslh-ink);outline-offset:-4px}",
      ".pslh-stage{margin-top:16px;border:1px solid var(--pslh-line);border-radius:22px;background:#fff;overflow:hidden;box-shadow:0 18px 45px rgba(28,24,17,.05)}",
      ".pslh-stage-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:17px 21px 16px;border-bottom:1px solid var(--pslh-soft);background:#fbfaf7}",
      ".pslh-stage-eyebrow{font:600 8px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--pslh-faint);margin-bottom:6px}",
      ".pslh-stage-desc{max-width:650px;font-size:12px;line-height:1.45;color:var(--pslh-muted)}",
      ".pslh-stage-count{font:600 9px/1.2 \"IBM Plex Mono\",monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--pslh-faint);white-space:nowrap}",
      ".pslh-stage-body{padding:0 21px}",
      ".pslh-row{display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:16px;align-items:center;padding:18px 0;border-top:1px solid var(--pslh-soft);transition:background .14s ease}",
      ".pslh-stage-body .pslh-row:first-child{border-top:0}.pslh-row:hover{background:#fcfbf8}",
      ".pslh-row:before{content:\"\";width:7px;height:7px;border-radius:999px;background:#c6c1b8;align-self:start;margin-top:7px}",
      ".pslh-row.overdue:before{background:var(--pslh-red)}.pslh-row.blocked:before{background:var(--pslh-amber)}.pslh-row.unassigned:before{background:#77909a}",
      ".pslh-row-main{min-width:0}.pslh-row-top{display:flex;align-items:center;gap:9px;min-width:0}",
      ".pslh-person-link{appearance:none;border:0;border-bottom:1px solid rgba(23,21,18,.24);background:transparent;padding:0;margin:0;color:var(--pslh-ink);font:inherit;text-align:left;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".pslh-person-link:hover{border-bottom-color:var(--pslh-ink)}.pslh-person-link:focus-visible{outline:2px solid var(--pslh-ink);outline-offset:3px;border-bottom-color:transparent;border-radius:2px}",
      ".pslh-person{font-size:15px;font-weight:650;line-height:1.25}.pslh-unit{font-size:8.5px;letter-spacing:.07em;color:var(--pslh-faint)}",
      ".pslh-state{font-size:12.5px;line-height:1.42;color:#403d37;margin-top:6px}.pslh-blocker{font-size:11px;margin-top:6px}",
      ".pslh-meta{display:flex;gap:7px 15px;flex-wrap:wrap;margin-top:8px;font-size:10.5px;color:var(--pslh-faint)}",
      ".pslh-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0}",
      ".pslh-btn{transition:background .12s ease,border-color .12s ease;color .12s ease;transform:none!important}",
      ".pslh-btn.primary{min-height:39px;border-radius:12px;padding:10px 15px;box-shadow:none;font-size:10.5px}",
      ".pslh-btn.primary:hover{background:#2b2925;box-shadow:none}",
      ".pslh-more>summary{display:flex;align-items:center;justify-content:center;width:38px;height:38px;padding:0;border-radius:10px;font-size:0;color:var(--pslh-faint)}",
      ".pslh-more>summary:after{content:\"•••\";font-size:10px;letter-spacing:.12em}.pslh-more>summary:hover{background:#f3f1eb;color:var(--pslh-ink)}",
      ".pslh-closed{margin-top:15px;border:0;border-top:1px solid var(--pslh-line);border-radius:0;background:transparent}",
      ".pslh-closed>summary{padding:15px 3px 5px;font-size:8.5px;color:var(--pslh-faint)}",
      ".pslh-closed .pslh-crow,.pslh-closed .pslh-empty{margin-inline:3px}",
      ".pslh-crow-name{font-size:12.5px;font-weight:600}.pslh-crow small{font-size:10.5px;color:var(--pslh-muted)}",
      "@media(max-width:720px){.pslh{max-width:none}.pslh-head{grid-template-columns:1fr;gap:12px;padding-bottom:18px}.pslh-title{font-size:41px}.pslh-total{padding:0}.pslh-total strong{font-size:28px}.pslh-tabs{border-radius:17px}.pslh-tab{grid-template-columns:minmax(0,1fr) auto;gap:5px;min-height:68px;padding:9px 8px}.pslh-tab-title{font-size:11px}.pslh-tab-index,.pslh-tab-cue{display:none}.pslh-tab-count{min-width:28px;height:28px;font-size:15px}.pslh-stage{border-radius:18px}.pslh-stage-head{align-items:flex-start;flex-direction:column;gap:8px;padding:15px 16px}.pslh-stage-body{padding:0 16px}.pslh-row{grid-template-columns:7px minmax(0,1fr);gap:11px;padding:16px 0}.pslh-actions{grid-column:2;display:grid;grid-template-columns:minmax(0,1fr) auto;width:100%;padding-top:2px}.pslh-btn.primary{width:100%;min-height:44px}.pslh-more>summary{width:44px;height:44px}.pslh-crow{align-items:flex-start;flex-direction:column}}",
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

  function validateDesk(payload){
    if(!payload || typeof payload!=='object') throw new Error('Leasing Work returned no contract.');
    if(!payload.stages || typeof payload.stages!=='object') throw new Error('Leasing Work returned no lifecycle stages.');
    var seen={};
    ACTIVE_STAGES.forEach(function(stage){
      var rows=payload.stages[stage];
      if(!Array.isArray(rows)) throw new Error('Leasing Work stage '+stage+' is missing.');
      rows.forEach(function(row){
        if(!row || typeof row!=='object') throw new Error('Leasing Work returned an invalid row.');
        if(row.stage && row.stage!==stage) throw new Error('Leasing Work row placement disagrees with its lifecycle stage.');
        if(!row.desk_key) throw new Error('Leasing Work row has no desk_key.');
        if(seen[row.desk_key]) throw new Error('Leasing Work returned the same desk_key twice.');
        seen[row.desk_key]=true;
        if(!row.primary_action || !row.primary_action.label || !row.primary_action.kind || !row.primary_action.target){
          throw new Error('Leasing Work row has no complete primary_action.');
        }
        /* CLOSED ACTION CONTRACT (ruled): the browser dispatches exactly
             navigation                   → Open
             task_write send_application  → Send
             task_write complete_task     → Complete
           Anything else is marked unsupported HERE, at validation — the
           operator sees a disabled "Unavailable" with the reason, never a
           confident live button that discovers the gap after the click. */
        var _a=row.primary_action, _known =
          (_a.kind==='navigation') ||
          (_a.kind==='task_write' && (_a.code==='send_application' || _a.code==='complete_task' || _a.code==='complete'));
        if(!_known){
          row.action_unsupported = true;
        }
      });
    });
    var r=closedReceipt(payload);
    if(r.items!=null && !Array.isArray(r.items)) throw new Error('Recently closed receipt is malformed.');
    return payload;
  }

  function makeController(){
    var root=null;
    var state={ loading:false, error:null, desk:null, staff:null, panel:null, sending:null, sendKeys:{}, flash:null, errorFlash:null, returnPoint:null, awaitingReviewReturn:false, activeStage:'post_tour', stageTouched:false };
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
    function openCard(row){
      if(!row || !row.person_id) return;
      try{
        if(typeof window.openPersonCard==='function'){
          window.openPersonCard({
            person_id:row.person_id,
            name:row.person_name||null,
            context:'lead',
            source:'leasing_work',
            conversion_id:row.conversion_id||null,
            application_id:row.application_id||null
          });
          return;
        }
        if(typeof window.openPersonCardById==='function') window.openPersonCardById(row.person_id);
      }catch(_){}
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
      if(row.unit_id){ await sendNow(row,row.unit_id); return; }
      state.panel={kind:'sendapp',row:row,busy:true,error:null,units:null}; render();
      try{
        var L=live(); if(!L || typeof L.leaseableUnits!=='function') throw new Error('Leaseable-unit read unavailable.');
        var out=unwrap(await L.leaseableUnits()); state.panel.units=(out&&out.units)||[]; state.panel.busy=false;
      }catch(e){ state.panel.busy=false; state.panel.error=sendFailureMessage(e); }
      render();
    }
    async function sendNow(row,unitId){
      if(state.sending) return;
      var conversionId=row&&row.conversion_id;
      if(!conversionId){ if(state.panel) state.panel.error='This row has no leasing conversion.'; else state.errorFlash='This row has no leasing conversion.'; render(); return; }
      state.sending=String(conversionId); if(state.panel) state.panel.busy=true; render();
      try{
        var L=live(); if(!L || typeof L.sendApplicationFromConversion!=='function') throw new Error('Application send is unavailable.');
        var out=unwrap(await L.sendApplicationFromConversion({conversionId:conversionId,unit_id:unitId,idempotency_key:sendAttemptKey(row)}));
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
      if(a.kind==='task_write' && code==='send_application'){ openSend(row); return; }
      if(a.kind==='task_write' && (code==='complete_task'||code==='complete')){ openPanel('complete',row.desk_key); return; }
      /* unreachable when validation ran; kept as a hard stop, not a UX path */
      state.errorFlash='That action is not supported in the operator app yet.'; render();
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
      if(row.owner_name) return esc(row.owner_name)+(row.owner_basis?' · '+esc(humanCode(row.owner_basis)):'');
      return 'Unassigned';
    }
    function taskSecondary(row){
      if(row.source!=='followup_rail') return '';
      var key=esc(row.desk_key);
      return '<details class="pslh-more"><summary aria-label="More actions">More</summary><div class="pslh-menu">'+
        '<button class="pslh-btn" data-act="complete" data-key="'+key+'">Complete</button>'+
        '<button class="pslh-btn" data-act="reassign" data-key="'+key+'">Reassign</button>'+
        '<button class="pslh-btn" data-act="changeDue" data-key="'+key+'">Change time</button>'+
        (row.person_id?'<button class="pslh-btn" data-act="message" data-key="'+key+'">Message</button>':'')+
      '</div></details>';
    }
    function rowHTML(row){
      var dueClass=row.due_state==='overdue'?' overdue':'';
      var ownerClass=row.owner_name?'':' unassigned';
      var unit=row.unit_number||row.unit_label||null;
      var rowClasses='pslh-row'+(row.due_state==='overdue'?' overdue':'')+(row.blocker_code?' blocked':'')+(!row.owner_name?' unassigned':'');
      var personName=esc(row.person_name||'Unnamed person');
      var person=row.person_id
        ? '<button type="button" class="pslh-person pslh-person-link" data-act="person" data-key="'+esc(row.desk_key)+'" aria-label="Open '+personName+' relationship">'+personName+'</button>'
        : '<span class="pslh-person">'+personName+'</span>';
      return '<div class="'+rowClasses+'" data-desk-key="'+esc(row.desk_key)+'">'+
        '<div class="pslh-row-main"><div class="pslh-row-top">'+person+(unit?'<span class="pslh-unit">'+esc(unit)+'</span>':'')+'</div>'+ 
          '<div class="pslh-state">'+esc(row.state_label||row.label||'Leasing work')+'</div>'+ 
          (row.blocker_code?'<div class="pslh-blocker">Needs review · '+esc(humanCode(row.blocker_code))+'</div>':'')+
          '<div class="pslh-meta"><span class="pslh-owner'+ownerClass+'">'+ownerText(row)+'</span><span class="pslh-due'+dueClass+'">'+esc(fmtDue(row.due_at,row.due_state))+'</span>'+(row.related_open_count>1?'<span class="pslh-related">'+esc(row.related_open_count)+' open items</span>':'')+'</div></div>'+ 
        '<div class="pslh-actions">'+(row.action_unsupported
          ? '<button class="pslh-btn" disabled title="This action is not supported in the operator app yet.">Unavailable</button>'
            + '<div class="pslh-owner" style="margin-top:4px">This action is not supported in the operator app yet.</div>'
          : '<button class="pslh-btn primary" data-act="primary" data-key="'+esc(row.desk_key)+'">'+esc(row.primary_action.label)+'</button>')
        +taskSecondary(row)+'</div></div>';
    }

    var STAGE_META={
      post_tour:{
        index:'01', title:'Post-tour', cue:'Send the application',
        desc:'Completed tours where the next goal is to send the application.',
        empty:'No completed tours are waiting for an application.'
      },
      application:{
        index:'02', title:'Application', cue:'Review and prepare',
        desc:'Application sent through submission, review, approval, terms, and lease preparation.',
        empty:'No prospects are currently in the application stage.'
      },
      lease_sent:{
        index:'03', title:'Lease sent', cue:'Complete execution',
        desc:'Lease execution must be completed, recorded, or admitted before the relationship leaves Leasing.',
        empty:'No leases are currently awaiting execution or final confirmation.'
      }
    };

    function stageTabsHTML(){
      var counts=state.desk.stage_counts||{};
      return '<div class="pslh-tabs" role="tablist" aria-label="Leasing lifecycle">'+ACTIVE_STAGES.map(function(stage){
        var m=STAGE_META[stage],active=state.activeStage===stage;
        var count=counts[stage]==null?(state.desk.stages[stage]||[]).length:counts[stage];
        return '<button type="button" class="pslh-tab'+(active?' active':'')+'" role="tab" aria-selected="'+(active?'true':'false')+'" data-act="stage" data-stage="'+stage+'">'+
          '<span class="pslh-tab-index">'+m.index+'</span><span class="pslh-tab-copy"><span class="pslh-tab-title">'+m.title+'</span><span class="pslh-tab-cue">'+m.cue+'</span></span><strong class="pslh-tab-count">'+esc(count)+'</strong></button>';
      }).join('')+'</div>';
    }

    function activeStageHTML(){
      var stage=ACTIVE_STAGES.indexOf(state.activeStage)>=0?state.activeStage:'post_tour';
      var m=STAGE_META[stage],rows=state.desk.stages[stage]||[];
      return '<section class="pslh-stage" role="tabpanel" data-stage-panel="'+stage+'"><div class="pslh-stage-head"><div><div class="pslh-stage-eyebrow">Current stage</div><div class="pslh-stage-desc">'+m.desc+'</div></div><span class="pslh-stage-count">'+rows.length+' '+(rows.length===1?'relationship':'relationships')+'</span></div><div class="pslh-stage-body">'+
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
        return '<div class="pslh-crow"><div><div>'+person+' <small>'+esc(row.label||row.state_label||'')+'</small></div><div class="pslh-crow-meta">'+esc(row.resolution||'closed')+' · '+esc(row.closed_by_name||'system')+' · '+esc(relClosed(row.closed_at))+'</div></div><div class="pslh-crow-act">'+reopen+(row.person_id?'<button class="pslh-btn ghost small" data-act="message" data-key="'+key+'">Message</button>':'')+'</div></div>';
      }).join(''):'<div class="pslh-empty">Nothing closed in the last '+esc(hrs)+' hours.</div>';
      return '<details class="pslh-closed"><summary>Recently closed <span>'+rows.length+'</span></summary>'+body+'</details>';
    }

    function headerHTML(){
      var c=state.desk.stage_counts||{};
      var total=c.total;
      if(total==null) total=ACTIVE_STAGES.reduce(function(n,stage){return n+(state.desk.stages[stage]||[]).length;},0);
      return '<header class="pslh-head"><div class="pslh-head-copy"><div class="pslh-eyebrow">Leasing pipeline</div><h1 class="pslh-title">Leasing Work</h1><div class="pslh-sub">Move each completed tour to an executed lease.</div></div><div class="pslh-total"><strong>'+esc(total)+'</strong><span>active '+(total===1?'relationship':'relationships')+'</span></div></header>';
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
      h+=stageTabsHTML()+activeStageHTML()+closedHTML()+'</div>';
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
        title='Choose a unit'; confirm='';
        body='<p class="pslh-p">The server will verify the unit again before sending.</p>'+(p.busy?'<div class="pslh-loading">Loading leaseable units…</div>':'<div class="pslh-unit-list">'+((p.units||[]).map(function(u){return '<button class="pslh-unit-btn" data-act="pickunit" data-unit="'+esc(u.unit_id||u.id)+'"><b>'+esc(u.unit_number||u.label||'Unit')+'</b><span>'+esc(u.readiness||u.status||'')+'</span></button>';}).join('')||'<div class="pslh-empty">No leaseable unit is available.</div>')+'</div>');
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
          if(act==='stage'){var stage=node.getAttribute('data-stage');if(ACTIVE_STAGES.indexOf(stage)>=0){state.activeStage=stage;state.stageTouched=true;render();}return;}
          var row=findRow(key);if(!row)return;
          if(act==='person'){openCard(row);return;}if(act==='primary'){runPrimary(row);return;}if(act==='complete'||act==='reassign'||act==='changeDue'||act==='reopen'){openPanel(act,key);return;}if(act==='message'){openCard(row);return;}
        };
      });
      var scrim=root.querySelector('.pslh-scrim');if(!scrim)return;
      scrim.querySelectorAll('[data-act]').forEach(function(node){node.onclick=function(ev){ev.preventDefault();var act=node.getAttribute('data-act');if(act==='cancel'||(act==='scrim'&&ev.target===scrim)){closePanel();return;}if(act==='confirm'){confirmPanel();return;}if(act==='pickunit'&&state.panel){sendNow(state.panel.row,node.getAttribute('data-unit'));}};});
    }

    function alignLegacyShell(){
      var old=document.getElementById('leasingHeader');
      if(old){ old.hidden=true; old.setAttribute('data-ps-replaced-by','canonical-leasing-home'); }
    }
    function mount(node){ root=node||root||document.getElementById('psFollowupsEntry'); alignLegacyShell(); render(); refresh(); }
    function tileStatus(){
      var rows=state.desk?ACTIVE_STAGES.reduce(function(a,s){return a.concat(state.desk.stages[s]||[]);},[]):[];
      return {
        enabled:hasSession(),
        connected:!!state.desk,
        open:rows.length,
        overdue:rows.filter(function(r){return r.due_state==='overdue';}).length,
        unassigned:rows.filter(function(r){return !r.owner_name;}).length
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
    return {mount:mount,refresh:refresh,tileStatus:tileStatus,destroy:destroy,_state:function(){return state;},_validateDesk:validateDesk};
  }

  var controller=null;
  function get(){if(!controller)controller=makeController();return controller;}
  function entryHTML(){return '<div id="psFollowupsEntry" data-ps-leasing-home="1"></div>';}
  function mount(node){var n=node||document.getElementById('psFollowupsEntry');if(n)get().mount(n);}
  function refresh(){if(controller)return controller.refresh();}
  function tileStatus(){try{return get().tileStatus();}catch(_){return {enabled:false,connected:false,open:0,overdue:0,unassigned:0};}}
  function reset(){if(controller&&typeof controller.destroy==='function')controller.destroy();controller=null;}

  if(typeof window!=='undefined'){
    var surface=Object.freeze({mount:mount,entryHTML:entryHTML,tileStatus:tileStatus,refresh:refresh,reset:reset});
    try{Object.defineProperty(window,'__psFollowups',{value:surface,writable:false,configurable:false,enumerable:true});}
    catch(_){window.__psFollowups=surface;}
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={makeController:makeController,validateDesk:validateDesk,_helpers:{esc:esc,fmtDue:fmtDue,relClosed:relClosed,closedReceipt:closedReceipt}};}
})();
