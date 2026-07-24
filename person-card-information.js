/* PROPERTY SPINE — PERSON × PROPERTY INFORMATION SURFACE v3
 * Presentation-only refinement over the canonical live Person Card projection.
 * Relationship → Next → History. Communication and all operating writes remain canonical.
 */
(function(){
  'use strict';

  var W=typeof window!=='undefined'?window:{};
  var D=typeof document!=='undefined'?document:null;

  function pcInfoEsc(value){
    if(typeof W.pcLiveEsc==='function') return W.pcLiveEsc(value);
    return String(value==null?'':value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function pcInfoMoney(value){
    if(value==null||value==='') return null;
    if(typeof W.pcLiveBudget==='function') return W.pcLiveBudget(value);
    var n=Number(value);
    return Number.isFinite(n)?new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n):String(value);
  }
  function pcInfoDate(value,withTime){
    if(!value) return null;
    if(typeof W.pcLiveDate==='function') return W.pcLiveDate(value,withTime);
    var d=value instanceof Date?value:new Date(value);
    if(Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:d.getFullYear()!==new Date().getFullYear()?'numeric':undefined})+
      (withTime?' · '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'');
  }
  function pcInfoDay(value){
    if(!value) return '';
    if(typeof W.pcLiveDay==='function') return W.pcLiveDay(value);
    var d=new Date(value); if(Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});
  }
  function pcInfoHuman(value){
    return String(value==null?'':value).replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});
  }
  function pcInfoId(value){
    if(value==null||value==='') return null;
    var s=String(value); return s.length>12?'…'+s.slice(-8):s;
  }
  function pcInfoFirst(){
    for(var i=0;i<arguments.length;i++) if(arguments[i]!=null&&arguments[i]!=='') return arguments[i];
    return null;
  }

  function pcInstallStartTabBridge(){
    if(typeof W.openPersonCard!=='function'||W.openPersonCard.__pcxStartTabBridge) return;
    var original=W.openPersonCard;
    function wrapped(opts){
      var requested=opts&&opts.start_tab==='communication'?'communication':'info';
      W.__pcxRequestedTab=requested;
      var out=original.apply(this,arguments);
      var apply=function(){
        if(typeof W.pcLiveSetTab==='function') W.pcLiveSetTab(requested);
      };
      if(out&&typeof out.then==='function') out.then(function(){setTimeout(apply,0);},function(){});
      else setTimeout(apply,0);
      return out;
    }
    wrapped.__pcxStartTabBridge=true;
    wrapped.__pcxOriginal=original;
    W.openPersonCard=wrapped;
  }

  function pcEnsureInformationDesign(){
    if(!D||D.getElementById('ps-person-card-information-v3')) return;
    var s=D.createElement('style');
    s.id='ps-person-card-information-v3';
    s.textContent=[
      '.pcx{--pci-ink:#171512;--pci-muted:#6e685f;--pci-faint:#9b958b;--pci-line:#ddd8cf;--pci-soft:#efebe4;--pci-warm:#faf8f3;--pci-green:#245f4b;--pci-red:#9d3c31;--pci-amber:#91651e;color:var(--pci-ink)}',
      '.pcx-top{display:flex;align-items:center;justify-content:space-between;padding-bottom:16px}.pcx-back,.pcx-close{appearance:none;border:0;background:transparent;color:var(--pci-muted);cursor:pointer}.pcx-back{padding:8px 0;font-size:11.5px;font-weight:600}.pcx-close{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:999px;font-size:23px}.pcx-close:hover{background:#f2efe9;color:var(--pci-ink)}',
      '.pcx-head{padding:4px 0 17px}.pcx-stage{font:600 8.5px/1.2 "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--pci-green)}.pcx-headrow{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-top:8px}.pcx-name{font-family:"Fraunces",Georgia,serif;font-size:38px;font-weight:500;letter-spacing:-.05em;line-height:.98}.pcx-status{margin-top:7px;font-size:12.5px;line-height:1.45;color:var(--pci-muted)}.pcx-contactline{display:flex;gap:6px 14px;flex-wrap:wrap;margin-top:8px;font-size:10.5px;color:var(--pci-faint)}.pcx-contactline a{color:inherit;text-decoration:none;border-bottom:1px solid rgba(23,21,18,.18)}.pcx-contactline a:hover{color:var(--pci-ink);border-bottom-color:var(--pci-ink)}',
      '.pcx-switch{display:none}.pcx-tabs{position:sticky;top:0;z-index:4;display:flex;gap:24px;border-bottom:1px solid var(--pci-line);background:#fffdf8}.pcx-tab{position:relative;min-height:43px;appearance:none;border:0;background:transparent;padding:0;color:var(--pci-muted);font-size:11.5px;font-weight:600;cursor:pointer}.pcx-tab:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:transparent}.pcx-tab.on{color:var(--pci-ink)}.pcx-tab.on:after{background:var(--pci-ink)}.pcx-tab:focus-visible,.pcx-back:focus-visible,.pcx-close:focus-visible,.pcx-next-action:focus-visible{outline:2px solid var(--pci-ink);outline-offset:3px}',
      '.pcx-panel{display:none}.pcx-panel.on{display:block}.pcx-info-stack{display:grid}.pcx-band{padding:23px 0;border-top:1px solid var(--pci-line)}.pcx-band:first-child{border-top:0}.pcx-band-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:14px}.pcx-section-label{font:600 8.5px/1.2 "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--pci-faint)}.pcx-band-title{margin-top:7px;font-size:16px;font-weight:650;line-height:1.35}.pcx-band-copy{max-width:500px;margin-top:5px;font-size:11.5px;line-height:1.45;color:var(--pci-muted)}',
      '.pcx-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--pci-soft);border-bottom:1px solid var(--pci-soft)}.pcx-fact{min-width:0;padding:13px 14px;border-left:1px solid var(--pci-soft)}.pcx-fact:first-child{border-left:0;padding-left:0}.pcx-fk{font:600 8px/1.2 "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--pci-faint)}.pcx-fv{margin-top:5px;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis}.pcx-fv.blank{font-weight:400;color:var(--pci-faint)}',
      '.pcx-context{display:grid;margin-top:15px}.pcx-summary-row{display:grid;grid-template-columns:128px minmax(0,1fr);gap:16px;padding:9px 0;border-top:1px solid var(--pci-soft)}.pcx-summary-row:first-child{border-top:0}.pcx-summary-row span{font-size:10.5px;color:var(--pci-faint)}.pcx-summary-row b{font-size:12px;font-weight:550;line-height:1.4}',
      '.pcx-relationship-object{margin-top:18px;padding-top:16px;border-top:1px solid var(--pci-line)}.pcx-object-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:5px}.pcx-object-title{font-size:13px;font-weight:650}.pcx-pill{display:inline-flex;align-items:center;min-height:23px;border:1px solid var(--pci-line);border-radius:999px;padding:0 8px;background:#fff;font:600 8px/1.2 "IBM Plex Mono",monospace;letter-spacing:.05em;text-transform:uppercase;color:var(--pci-muted)}.pcx-textlink{appearance:none;border:0;border-bottom:1px solid rgba(23,21,18,.26);background:transparent;padding:0 0 2px;color:var(--pci-ink);font-size:10.5px;font-weight:650;cursor:pointer}.pcx-textlink:hover{border-bottom-color:var(--pci-ink)}',
      '.pcx-next-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.pcx-commit{display:grid;grid-template-rows:auto auto auto 1fr;min-width:0;border:1px solid var(--pci-line);border-radius:14px;background:#fff;padding:14px}.pcx-commit:first-child{border-color:#c9d8d1;background:#f7faf8}.pcx-commit.over{border-color:#e3c1bb;background:#fff8f6}.pcx-commit-k{font:600 8px/1.2 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--pci-faint)}.pcx-commit-title{margin-top:7px;font-size:13px;font-weight:650;line-height:1.35}.pcx-commit-meta{margin-top:8px;font-size:10.5px;line-height:1.4;color:var(--pci-muted)}.pcx-next-action{align-self:end;justify-self:start;min-height:34px;margin-top:12px;appearance:none;border:1px solid var(--pci-ink);border-radius:10px;background:var(--pci-ink);padding:8px 12px;color:#fff;font:600 10px/1.2 "IBM Plex Sans",sans-serif;cursor:pointer}.pcx-next-action:hover{background:#2c2925}.pcx-empty{padding:10px 0;color:var(--pci-faint);font-size:11.5px;line-height:1.45}',
      '.pcx-spine{position:relative;margin-top:3px;padding-left:18px}.pcx-spine:before{content:"";position:absolute;left:3px;top:5px;bottom:3px;width:1px;background:var(--pci-line)}.pcx-day{margin:17px 0 8px -18px;font:600 8px/1.2 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--pci-faint)}.pcx-day:first-child{margin-top:0}.pcx-mile{position:relative;padding:0 0 17px}.pcx-mile:before{content:"";position:absolute;left:-18px;top:6px;width:7px;height:7px;border:2px solid #fff;border-radius:999px;background:#aaa49a;box-shadow:0 0 0 1px var(--pci-line)}.pcx-mile.correction:before{background:var(--pci-amber)}.pcx-mile-title{font-size:12px;font-weight:600;line-height:1.4}.pcx-mile-meta{display:flex;gap:5px 10px;flex-wrap:wrap;margin-top:4px;font-size:9.5px;color:var(--pci-faint)}.pcx-mile-source{font-family:"IBM Plex Mono",monospace;text-transform:uppercase;letter-spacing:.04em}.pcx-mile-claim,.pcx-mile-correction{display:inline-flex;align-items:center;min-height:18px;border:1px solid var(--pci-line);border-radius:999px;padding:0 6px;font:600 7.5px/1 "IBM Plex Mono",monospace;letter-spacing:.04em;text-transform:uppercase}.pcx-mile-correction{border-color:#dbc28f;color:var(--pci-amber);background:#fffaf0}',
      '.pcx-details{margin:4px 0 18px;border-top:1px solid var(--pci-line)}.pcx-details>summary{min-height:44px;display:flex;align-items:center;justify-content:space-between;list-style:none;color:var(--pci-faint);font:600 8.5px/1.2 "IBM Plex Mono",monospace;letter-spacing:.09em;text-transform:uppercase;cursor:pointer}.pcx-details>summary::-webkit-details-marker{display:none}.pcx-details>summary:after{content:"+"}.pcx-details[open]>summary:after{content:"–"}.pcx-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px;padding-bottom:14px}.pcx-detail-grid>div{display:grid;gap:4px;padding:9px 0;border-top:1px solid var(--pci-soft)}.pcx-detail-grid span{font-size:9.5px;color:var(--pci-faint)}.pcx-detail-grid b{font-size:11.5px;font-weight:550;overflow-wrap:anywhere}',
      '@media(max-width:620px){.drawer.pc-rail .sheet{padding:18px 17px}.pcx-headrow{align-items:flex-start}.pcx-name{font-size:34px}.pcx-facts{grid-template-columns:1fr}.pcx-fact{border-left:0;border-top:1px solid var(--pci-soft);padding:11px 0}.pcx-fact:first-child{border-top:0}.pcx-next-list{grid-template-columns:1fr}.pcx-summary-row{grid-template-columns:100px minmax(0,1fr);gap:12px}.pcx-detail-grid{grid-template-columns:1fr}.pcx-tab{min-height:46px}.pcx-band{padding:20px 0}.pcx-next-action{min-height:44px;width:100%;justify-self:stretch}}',
      '@media(prefers-reduced-motion:reduce){.pcx *{transition:none!important;scroll-behavior:auto!important}}'
    ].join('\n');
    D.head.appendChild(s);
  }

  function pcLiveStageLabel(card){
    var stage=(card&&card.stage)||'prospect';
    return {prospect:'Prospect',applicant:'Applicant',future_resident:'Future resident',tenant:'Resident',resident:'Resident'}[stage]||'Relationship';
  }
  function pcLiveRelationshipStatus(card){
    card=card||{};
    var rel=card.relationship||{};
    if(rel.commercial_state==='closed_not_fit') return 'Closed — not a fit';
    var lease=card.lease||card.tenancy;
    if(lease&&pcInfoFirst(lease.lease_status,lease.status)) return 'Lease · '+pcInfoHuman(pcInfoFirst(lease.lease_status,lease.status));
    var app=card.application||card.current_application;
    if(app&&app.status) return 'Application · '+pcInfoHuman(app.status);
    var nx=Array.isArray(card.next)?card.next:[];
    if(nx.length) return pcInfoFirst(nx[0].label,nx[0].summary,pcInfoHuman(nx[0].rung),'Current relationship');
    return 'Current relationship';
  }
  function pcContactHtml(person){
    var out=[];
    if(person&&person.phone){
      var tel=String(person.phone).replace(/[^+\d]/g,'');
      out.push('<a href="tel:'+pcInfoEsc(tel)+'">'+pcInfoEsc(person.phone)+'</a>');
    }
    if(person&&person.email){
      out.push('<a href="mailto:'+pcInfoEsc(encodeURIComponent(String(person.email)).replace(/%40/g,'@'))+'">'+pcInfoEsc(person.email)+'</a>');
    }
    return out.length?'<div class="pcx-contactline">'+out.join('')+'</div>':'';
  }
  function pcLiveShellTop(st){
    st=st||{};
    var card=st.card||{},person=card.person||{},name=person.name||(st.opts&&st.opts.name)||'Person';
    return '<div class="pcx-top"><button type="button" class="pcx-back" onclick="closeDrawer()">← Back</button><button type="button" class="pcx-close" onclick="closeDrawer()" aria-label="Close">×</button></div>'+ 
      '<header class="pcx-head"><div class="pcx-stage">'+pcInfoEsc(pcLiveStageLabel(card))+'</div><div class="pcx-headrow"><div><h2 class="pcx-name">'+pcInfoEsc(name)+'</h2><div class="pcx-status">'+pcInfoEsc(pcLiveRelationshipStatus(card))+'</div>'+pcContactHtml(person)+'</div></div></header>'+ 
      '<div class="pcx-tabs" role="tablist" aria-label="Person relationship"><button type="button" class="pcx-tab '+(st.tab==='info'?'on':'')+'" role="tab" aria-selected="'+(st.tab==='info'?'true':'false')+'" onclick="pcLiveSetTab(\'info\')">Information</button><button type="button" class="pcx-tab '+(st.tab==='communication'?'on':'')+'" role="tab" aria-selected="'+(st.tab==='communication'?'true':'false')+'" onclick="pcLiveSetTab(\'communication\')">Communication</button></div>';
  }

  function pcLiveInfoFact(label,value){
    var blank=value==null||value==='';
    return '<div class="pcx-fact"><div class="pcx-fk">'+pcInfoEsc(label)+'</div><div class="pcx-fv'+(blank?' blank':'')+'">'+(blank?'—':pcInfoEsc(value))+'</div></div>';
  }
  function pcLivePair(label,value){
    if(value==null||value==='') return '';
    return '<div class="pcx-summary-row"><span>'+pcInfoEsc(label)+'</span><b>'+pcInfoEsc(value)+'</b></div>';
  }
  function pcRelationshipOwner(card){
    var rel=(card&&card.relationship)||{};
    return pcInfoFirst(rel.owner_name,rel.owner&&rel.owner.name,rel.accountable_owner&&rel.accountable_owner.name,card&&card.owner_name);
  }
  function pcRelationshipLastContact(card){
    var rel=(card&&card.relationship)||{};
    return pcInfoFirst(rel.last_interaction_at,rel.last_contact_at,card&&card.last_interaction_at);
  }
  function pcLiveRelationshipHtml(card){
    card=card||{};
    var rel=card.relationship||{},v=rel.vitals||{},a=card.application||card.current_application,l=card.lease||card.tenancy;
    var unitPreference=pcInfoFirst(v.unit_type,v.preferred_unit_type,v.bedroom_preference);
    var moveTiming=pcInfoFirst(v.move_month,v.move_timing,v.intended_move_in,a&&a.intended_move_in);
    var budget=pcInfoFirst(v.budget,v.monthly_budget,a&&a.target_rent);
    var facts='<div id="pcIdentityBand" data-ps-source="live" data-ps-state="data" class="pcx-facts">'+pcLiveInfoFact('Looking for',unitPreference)+pcLiveInfoFact('Move timing',moveTiming)+pcLiveInfoFact('Budget',pcInfoMoney(budget))+'</div>';
    var context='';
    context+=pcLivePair('Owner',pcRelationshipOwner(card)||'Unassigned');
    var last=pcRelationshipLastContact(card); context+=pcLivePair('Last contact',last?pcInfoDate(last,true):null);
    context+=pcLivePair('Occupants',pcInfoFirst(v.occupants,a&&a.occupants));
    context+=pcLivePair('Pets',pcInfoFirst(v.pets,a&&a.pets));
    context+=pcLivePair('Reason for moving',pcInfoFirst(v.reason,v.reason_for_moving));
    var object='';
    if(l){
      var leaseRows='';
      leaseRows+=pcLivePair('Unit',pcInfoFirst(l.unit_label,l.unit_number));
      leaseRows+=pcLivePair('Lease status',pcInfoHuman(pcInfoFirst(l.lease_status,l.status)));
      leaseRows+=pcLivePair('Term',[pcInfoFirst(l.start_date,l.lease_start_date)||'',pcInfoFirst(l.end_date,l.lease_end_date)||''].filter(Boolean).join(' → '));
      var rent=pcInfoFirst(l.monthly_rent,l.rent); leaseRows+=pcLivePair('Rent',rent!=null?pcInfoMoney(rent)+'/mo':null);
      object='<div class="pcx-relationship-object"><div class="pcx-object-head"><div class="pcx-object-title">Lease</div><span class="pcx-pill">'+pcInfoEsc(pcInfoHuman(pcInfoFirst(l.lease_status,l.status,'Lease')))+'</span></div><div>'+leaseRows+'</div></div>';
    }else if(a){
      var appRows='';
      var unit=pcInfoFirst(a.unit_label,a.unit_number); appRows+=pcLivePair('Unit',unit?(/^unit\b/i.test(String(unit))?unit:'Unit '+unit):null);
      appRows+=pcLivePair('Submitted',a.submitted_at?pcInfoDate(a.submitted_at,false):null);
      appRows+=pcLivePair('Move-in',pcInfoFirst(a.intended_move_in,a.move_in_date));
      appRows+=pcLivePair('Income',a.monthly_income!=null?pcInfoMoney(a.monthly_income)+'/mo':null);
      var appId=pcInfoFirst(a.application_id,a.id);
      var appLink=appId?'<button type="button" class="pcx-textlink" data-pcx-open-application="'+pcInfoEsc(String(appId))+'">Open application →</button>':'';
      object='<div class="pcx-relationship-object"><div class="pcx-object-head"><div class="pcx-object-title">Application</div><span class="pcx-pill">'+pcInfoEsc(pcInfoHuman(a.status||'Application'))+'</span></div><div>'+appRows+'</div>'+appLink+'</div>';
    }
    return '<section id="pcRelationshipBand" data-ps-source="live" data-ps-state="data" class="pcx-band pcx-relationship"><div class="pcx-band-head"><div><div class="pcx-section-label">Relationship</div><div class="pcx-band-title">'+pcInfoEsc(pcLiveRelationshipStatus(card))+'</div><div class="pcx-band-copy">What is known about this person at this property right now.</div></div></div>'+facts+(context?'<div class="pcx-context">'+context+'</div>':'')+object+'</section>';
  }

  function pcNextOwner(n){
    return pcInfoFirst(n&&n.owner_name,n&&n.owner&&n.owner.name,n&&n.accountable_owner&&n.accountable_owner.name,'Unassigned');
  }
  function pcNextActionHtml(n){
    var a=n&&(n.primary_action||n.action),t=a&&a.target;
    if(!a||a.kind!=='navigation'||!t||!t.id||['application','person','conversation'].indexOf(t.type)<0) return '';
    return '<button type="button" class="pcx-next-action" data-pcx-next-type="'+pcInfoEsc(t.type)+'" data-pcx-next-id="'+pcInfoEsc(String(t.id))+'">Open</button>';
  }
  function pcLiveNextHtml(card){
    var nx=Array.isArray(card&&card.next)?card.next.slice(0,2):[];
    var h='<section id="pcNextBand" data-ps-source="live" data-ps-state="'+(nx.length?'data':'empty')+'" class="pcx-band"><div class="pcx-band-head"><div><div class="pcx-section-label">Next</div><div class="pcx-band-copy">The one or two obligations that matter now.</div></div></div>';
    if(!nx.length) return h+'<div class="pcx-empty">Nothing needs attention right now.</div></section>';
    h+='<div class="pcx-next-list">';
    nx.forEach(function(n,i){
      var rawDue=pcInfoFirst(n.due_at,n.due_by),due=rawDue?new Date(rawDue):null,valid=due&&!Number.isNaN(due.getTime()),over=valid&&due<new Date();
      var label=pcInfoFirst(n.label,n.summary,n.title,pcInfoHuman(n.rung),'Next action');
      var meta=pcNextOwner(n)+(valid?' · '+(over?'Overdue · ':'Due · ')+pcInfoDate(due,true):'');
      h+='<div class="pcx-commit '+(over?'over':'')+'"><div class="pcx-commit-k">'+(i===0?'Current move':'Also open')+'</div><div class="pcx-commit-title">'+pcInfoEsc(label)+'</div><div class="pcx-commit-meta">'+pcInfoEsc(meta)+'</div>'+pcNextActionHtml(n)+'</div>';
    });
    return h+'</div></section>';
  }

  function pcHistorySummary(e){
    var summary=pcInfoFirst(e&&e.summary,e&&e.label,e&&e.title);
    if(summary) return summary;
    var verb=pcInfoFirst(e&&e.verb,e&&e.event_type,'Event');
    if((e&&e.source)==='conversation'||/message|sms|reply/i.test(String(verb))){
      var dir=pcInfoFirst(e&&e.direction,e&&e.detail&&e.detail.direction);
      return dir==='inbound'?'Message received.':dir==='outbound'?'Message sent.':pcInfoHuman(verb)+'.';
    }
    return pcInfoHuman(verb)+'.';
  }
  function pcLiveHistoryHtml(card){
    var H=Array.isArray(card&&card.history)?card.history:[];
    var h='<section id="pcHistoryBand" data-ps-source="live" data-ps-state="'+(H.length?'data':'empty')+'" class="pcx-band"><div class="pcx-band-head"><div><div class="pcx-section-label">History</div><div class="pcx-band-copy">Attributed events in the order they occurred.</div></div></div>';
    if(!H.length) return h+'<div class="pcx-empty">Nothing recorded yet. History builds from real events.</div></section>';
    var lastDay=''; h+='<div class="pcx-spine">';
    H.forEach(function(e){
      e=e||{};
      var occurred=pcInfoFirst(e.occurred_at,e.occurredAt,e.created_at),recorded=pcInfoFirst(e.recorded_at,e.recordedAt);
      var day=pcInfoDay(occurred); if(day&&day!==lastDay){h+='<div class="pcx-day">'+pcInfoEsc(day)+'</div>';lastDay=day;}
      var actor=pcInfoFirst(e.actor&&e.actor.name,e.actor_name,e.recorded_by_name);
      var time=occurred?new Date(occurred):null,timeText=time&&!Number.isNaN(time.getTime())?time.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';
      var rec=recorded?new Date(recorded):null,occ=occurred?new Date(occurred):null;
      var recNote=rec&&occ&&!Number.isNaN(rec.getTime())&&!Number.isNaN(occ.getTime())&&Math.abs(rec-occ)>3600000?'recorded '+pcInfoDate(rec,true):'';
      var source=pcInfoFirst(e.source,e.source_type),sourceId=pcInfoFirst(e.source_id,e.sourceId,e.record_id,e.id),claim=pcInfoFirst(e.claim_strength,e.claimStrength);
      var correction=Boolean(e.correction_of||e.corrects_source_id||e.prior_reference||/correct/i.test(String(e.verb||'')));
      var meta=[];
      if(actor) meta.push('<span>'+pcInfoEsc(actor)+'</span>');
      if(timeText) meta.push('<span>'+pcInfoEsc(timeText)+'</span>');
      if(source) meta.push('<span class="pcx-mile-source">'+pcInfoEsc(pcInfoHuman(source))+(sourceId?' · '+pcInfoEsc(pcInfoId(sourceId)):'')+'</span>');
      if(recNote) meta.push('<span>'+pcInfoEsc(recNote)+'</span>');
      if(claim) meta.push('<span class="pcx-mile-claim">'+pcInfoEsc(pcInfoHuman(claim))+'</span>');
      if(correction) meta.push('<span class="pcx-mile-correction">Correction</span>');
      h+='<div class="pcx-mile '+(correction?'correction':'')+'"><div class="pcx-mile-title">'+pcInfoEsc(pcHistorySummary(e))+'</div>'+(meta.length?'<div class="pcx-mile-meta">'+meta.join('')+'</div>':'')+'</div>';
    });
    return h+'</div></section>';
  }
  function pcLiveInfoDetails(card){
    card=card||{};
    var person=card.person||{},rel=card.relationship||{},a=card.application||card.current_application||{},l=card.lease||card.tenancy||{},rows='';
    function row(label,value){if(value!=null&&value!=='') rows+='<div><span>'+pcInfoEsc(label)+'</span><b>'+pcInfoEsc(value)+'</b></div>';}
    row('Person record',pcInfoFirst(person.id,card.person_id));
    row('Relationship record',pcInfoFirst(rel.id,rel.relationship_id,card.relationship_id));
    row('Application record',pcInfoFirst(a.application_id,a.id));
    row('Lease record',pcInfoFirst(l.lease_id,l.id));
    row('Employer',a.employer);
    return rows?'<details class="pcx-details"><summary>Record details</summary><div class="pcx-detail-grid">'+rows+'</div></details>':'';
  }
  function pcLiveInfoHtml(st){
    st=st||{}; var card=st.card||{};
    return '<section class="pcx-panel '+(st.tab==='info'?'on':'')+'" data-pcx-panel="info"><div class="pcx-info-stack">'+pcLiveRelationshipHtml(card)+pcLiveNextHtml(card)+pcLiveHistoryHtml(card)+pcLiveInfoDetails(card)+'</div></section>';
  }

  function pcOpenApplication(id){
    if(!id) return;
    if(typeof W.pcOpenApplicationFromCard==='function'){W.pcOpenApplicationFromCard(id);return;}
    if(typeof W.openApplicationReview==='function'){W.openApplicationReview({application_id:id,source:'person_card'});return;}
    if(typeof W.dispatchEvent==='function'&&typeof W.CustomEvent==='function') W.dispatchEvent(new W.CustomEvent('ps:open-application-review',{detail:{application_id:id,source:'person_card'}}));
  }
  function pcHandleInformationClick(ev){
    var target=ev&&ev.target&&ev.target.closest?ev.target.closest('[data-pcx-open-application],[data-pcx-next-type]'):null;
    if(!target) return;
    var app=target.getAttribute('data-pcx-open-application');
    if(app){ev.preventDefault();ev.stopPropagation();pcOpenApplication(app);return;}
    var type=target.getAttribute('data-pcx-next-type'),id=target.getAttribute('data-pcx-next-id');
    if(type==='application'){ev.preventDefault();ev.stopPropagation();pcOpenApplication(id);return;}
    if(type==='person'||type==='conversation'){
      ev.preventDefault();ev.stopPropagation();
      if(typeof W.pcLiveSetTab==='function') W.pcLiveSetTab('communication');
    }
  }

  W.pcLiveStageLabel=pcLiveStageLabel;
  W.pcLiveRelationshipStatus=pcLiveRelationshipStatus;
  W.pcLiveShellTop=pcLiveShellTop;
  W.pcLiveInfoFact=pcLiveInfoFact;
  W.pcLivePair=pcLivePair;
  W.pcLiveRelationshipHtml=pcLiveRelationshipHtml;
  W.pcLiveNextHtml=pcLiveNextHtml;
  W.pcLiveHistoryHtml=pcLiveHistoryHtml;
  W.pcLiveInfoDetails=pcLiveInfoDetails;
  W.pcLiveInfoHtml=pcLiveInfoHtml;
  W.pcEnsureInformationDesign=pcEnsureInformationDesign;
  W.pcInstallStartTabBridge=pcInstallStartTabBridge;

  pcEnsureInformationDesign();
  pcInstallStartTabBridge();
  // The script is loaded last in the current shell, but a bounded retry keeps the
  // focus contract intact if a future deferred bundle defines openPersonCard later.
  (function retryStartTabBridge(attempt){
    if(typeof W.openPersonCard==='function'&&W.openPersonCard.__pcxStartTabBridge) return;
    if(attempt>=20) return;
    setTimeout(function(){pcInstallStartTabBridge();retryStartTabBridge(attempt+1);},50);
  })(0);
  if(D&&!D.__pcxInformationListener){D.addEventListener('click',pcHandleInformationClick,true);D.__pcxInformationListener=true;}
})();
