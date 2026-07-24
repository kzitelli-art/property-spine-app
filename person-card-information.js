/* PROPERTY SPINE — PERSON × PROPERTY OVERVIEW v5
 *
 * One relationship briefing. Overview owns signal; Communication owns transcript.
 * Post-tour capture is rendered as current facts + one next move + one milestone.
 * Existing communication and operating-write paths remain canonical.
 */
(function(root,factory){
  var api=factory(root||{});
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root&&root.document) api.install();
})(typeof window!=='undefined'?window:null,function(W){
  'use strict';

  var D=W.document||null;
  var STYLE_ID='ps-person-card-information-v5';
  var MILESTONE_ALLOWLIST={
    lead_created:1,conversation_started:1,conversation_summary_changed:1,
    tour_scheduled:1,tour_rescheduled:1,tour_completed:1,tour_no_show:1,
    tour_cancelled:1,post_tour_assessment_captured:1,material_preferences_updated:1,
    application_recommended:1,application_sent:1,application_started:1,
    application_submitted:1,application_approved:1,terms_confirmed:1,
    lease_sent:1,lease_executed:1,tenancy_confirmed:1,relationship_closed:1,
    relationship_reopened:1,owner_changed:1,material_fact_corrected:1
  };

  function esc(value){
    if(typeof W.pcLiveEsc==='function') return W.pcLiveEsc(value);
    return String(value==null?'':value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function first(){
    for(var i=0;i<arguments.length;i++){
      var v=arguments[i];
      if(v!=null&&v!==''&&!(Array.isArray(v)&&v.length===0)) return v;
    }
    return null;
  }
  function human(value){
    return String(value==null?'':value).replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().replace(/\b\w/g,function(c){return c.toUpperCase();});
  }
  function lower(value){return String(value==null?'':value).replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'').toLowerCase();}
  function sentence(value){
    var h=human(value);
    return h?h.charAt(0).toUpperCase()+h.slice(1).toLowerCase():'';
  }
  function date(value,withTime){
    if(!value) return null;
    if(typeof W.pcLiveDate==='function') return W.pcLiveDate(value,withTime);
    var d=value instanceof Date?value:new Date(value);
    if(Number.isNaN(d.getTime())) return String(value);
    var out=d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:d.getFullYear()!==new Date().getFullYear()?'numeric':undefined});
    if(withTime) out+=' · '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
    return out;
  }
  function day(value){
    if(!value) return '';
    if(typeof W.pcLiveDay==='function') return W.pcLiveDay(value);
    var d=new Date(value); if(Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});
  }
  function money(value){
    if(value==null||value==='') return null;
    if(typeof W.pcLiveBudget==='function') return W.pcLiveBudget(value);
    var n=Number(value);
    return Number.isFinite(n)?new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n):String(value);
  }
  function cleanList(value,max){
    var arr=Array.isArray(value)?value:(value==null||value===''?[]:[value]);
    var seen={};
    return arr.map(function(v){return human(v);}).filter(function(v){
      var k=v.toLowerCase(); if(!v||seen[k]) return false; seen[k]=1; return true;
    }).slice(0,max||99);
  }
  function sourceId(e){return first(e&&e.source_id,e&&e.sourceId,e&&e.record_id,e&&e.id);}
  function occurredAt(e){return first(e&&e.occurred_at,e&&e.occurredAt,e&&e.created_at,e&&e.recorded_at);}
  function eventKind(e){
    if(!e) return '';
    var raw=lower(first(e.kind,e.event_type,e.verb,e.type,e.action));
    var source=lower(first(e.source_type,e.source));
    if(/message|sms|reply|communication|comm_event/.test(raw+'_'+source)) return 'communication';
    if(/post_tour|tour_outcome|tour_capture/.test(raw)) return 'post_tour_assessment_captured';
    if(/tour.*complete|completed.*tour/.test(raw)) return 'tour_completed';
    if(/tour.*no_show|no_show.*tour/.test(raw)) return 'tour_no_show';
    if(/tour.*resched|resched.*tour/.test(raw)) return 'tour_rescheduled';
    if(/tour.*cancel|cancel.*tour/.test(raw)) return 'tour_cancelled';
    if(/tour.*sched|sched.*tour/.test(raw)) return 'tour_scheduled';
    if(/application.*sent|sent.*application/.test(raw)) return 'application_sent';
    if(/application.*submit/.test(raw)) return 'application_submitted';
    if(/application.*approve/.test(raw)) return 'application_approved';
    if(/application.*start|application.*begin/.test(raw)) return 'application_started';
    if(/terms.*confirm|confirm.*terms/.test(raw)) return 'terms_confirmed';
    if(/lease.*sent/.test(raw)) return 'lease_sent';
    if(/lease.*execut/.test(raw)) return 'lease_executed';
    if(/term.*confirm|tenancy.*confirm/.test(raw)) return 'tenancy_confirmed';
    if(/reopen/.test(raw)) return 'relationship_reopened';
    if(/clos|not_fit|withdraw/.test(raw)) return 'relationship_closed';
    if(/owner.*chang|assign/.test(raw)) return 'owner_changed';
    if(/correct/.test(raw)) return 'material_fact_corrected';
    if(/lead.*creat|intake/.test(raw)) return 'lead_created';
    return raw;
  }
  function isCommunication(e){return eventKind(e)==='communication';}

  function explicitOverview(card){
    return card&&card.overview&&typeof card.overview==='object'?card.overview:{};
  }
  function stageLabel(card){
    var o=explicitOverview(card),rel=(card&&card.relationship)||{};
    var stage=lower(first(o.relationship&&o.relationship.stage,card&&card.stage,rel.stage,'prospect'));
    return {prospect:'Prospect',applicant:'Applicant',future_resident:'Future resident',tenant:'Resident',resident:'Resident'}[stage]||human(stage||'Relationship');
  }
  function operatingPosition(card){
    var o=explicitOverview(card),rel=(card&&card.relationship)||{};
    var pos=first(o.relationship&&o.relationship.current_state_label,o.relationship&&o.relationship.operating_position,rel.current_state_label,rel.operating_position,rel.current_stage);
    if(pos){var hp=human(pos);return /^Post Tour$/i.test(hp)?'Post-tour':hp;}
    var a=card&&(card.application||card.current_application),l=card&&(card.lease||card.tenancy),nx=Array.isArray(card&&card.next)?card.next:[];
    if(l) return 'Lease sent';
    if(a) return 'Application';
    if(nx.some(function(n){return lower(first(n.code,n.rung,n.primary_action&&n.primary_action.code)).indexOf('send_application')>=0;})) return 'Post-tour';
    return '';
  }
  function currentStateSentence(card){
    var o=explicitOverview(card),rel=(card&&card.relationship)||{};
    var explicit=first(o.relationship&&o.relationship.current_state_sentence,rel.current_state_sentence,card&&card.current_state_sentence);
    if(explicit) return String(explicit);
    if(rel.commercial_state==='closed_not_fit') return 'This relationship is closed.';
    var l=card&&(card.lease||card.tenancy),a=card&&(card.application||card.current_application),nx=Array.isArray(card&&card.next)?card.next:[];
    if(l){
      var ls=human(first(l.lease_status,l.status,'Lease in progress'));
      return 'Lease '+ls.toLowerCase()+'.';
    }
    if(a){
      var as=lower(a.status);
      if(/sent|invited|waiting|not_started/.test(as)) return 'Application sent. Waiting for the applicant to begin.';
      if(/submitted|review/.test(as)) return 'Application submitted. Review is in progress.';
      if(/approved|terms/.test(as)) return 'Application approved. Terms or lease preparation remain.';
      return 'Application '+human(a.status||'in progress').toLowerCase()+'.';
    }
    var tour=latestTour(card);
    if(tour){
      if(tour.outcome==='no_show'||tour.outcome==='no_showed') return 'Tour no-show. Follow-up or rescheduling may be needed.';
      if(tour.outcome==='rescheduled') return 'Tour rescheduled.';
      if(tour.outcome==='cancelled'||tour.outcome==='canceled') return 'Tour cancelled.';
      if(tour.outcome==='completed'){
        if(/needs_change|change_needed|conditional/.test(tour.disposition)) return 'Tour completed. The prospect would move forward if a blocker changes.';
        if(/watch|close|not_fit/.test(tour.disposition)) return 'Tour completed. Fit or timing is uncertain.';
        if(/keep_working|continue_follow/.test(tour.disposition)) return 'Tour completed. Continued follow-up is needed.';
        if(/start_application|ready_to_apply/.test(tour.disposition)) return 'Tour completed. Application has not been sent.';
      }
    }
    var send=nx.some(function(n){return /send_application/.test(lower(first(n.code,n.rung,n.primary_action&&n.primary_action.code,n.label)));});
    if(send) return 'Tour completed. Application has not been sent.';
    var follow=nx.some(function(n){return /follow|contact|conversation|second_tour/.test(lower(first(n.code,n.rung,n.label)));});
    if(follow) return 'Tour completed. Continued follow-up is needed.';
    return 'Current relationship.';
  }
  function propertyName(card){
    var o=explicitOverview(card),rel=(card&&card.relationship)||{};
    return first(o.relationship&&o.relationship.property_name,rel.property_name,card&&card.property_name,W.__currentPropertyName);
  }
  function lastContact(card){
    var o=explicitOverview(card),rel=(card&&card.relationship)||{};
    return first(o.relationship&&o.relationship.last_meaningful_contact_at,rel.last_meaningful_contact_at,rel.last_interaction_at,rel.last_contact_at,card&&card.last_interaction_at);
  }
  function ownerName(card){
    var rel=(card&&card.relationship)||{};
    return first(rel.owner_name,rel.owner&&rel.owner.name,rel.accountable_owner&&rel.accountable_owner.name,card&&card.owner_name);
  }
  function fact(label,value,key,source){
    if(value==null||value==='') return null;
    return {key:key||lower(label),label:label,value:String(value),source:source||null};
  }
  function relationshipFacts(card){
    var o=explicitOverview(card);
    if(Array.isArray(o.facts)){
      return o.facts.filter(function(f){return f&&f.value!=null&&f.value!=='';}).slice(0,8).map(function(f){return {key:f.key||lower(f.label),label:f.label||human(f.key),value:String(f.value),source:f.source||null};});
    }
    var rel=(card&&card.relationship)||{},v=rel.vitals||{},a=card&&(card.application||card.current_application),l=card&&(card.lease||card.tenancy),out=[];
    out.push(fact('Looking for',first(v.unit_type,v.preferred_unit_type,v.bedroom_preference),'unit_type'));
    out.push(fact('Move timing',first(v.move_month,v.move_timing,v.intended_move_in,a&&a.intended_move_in),'move_timing'));
    var b=first(v.budget,v.monthly_budget,a&&a.target_rent); out.push(fact('Budget',b!=null?money(b):null,'budget'));
    out.push(fact('Owner',ownerName(card)||'Unassigned','owner'));
    out.push(fact('Pets',first(v.pets,a&&a.pets),'pets'));
    var unit=first(l&&l.unit_label,l&&l.unit_number,a&&a.unit_label,a&&a.unit_number,v.preferred_unit);
    out.push(fact('Unit',unit,'unit'));
    return out.filter(Boolean).slice(0,8);
  }
  function latestTour(card){
    var o=explicitOverview(card),rel=(card&&card.relationship)||{};
    var t=first(o.latest_tour,card&&card.latest_tour,card&&card.post_tour,rel.latest_tour,rel.post_tour);
    if(!t||typeof t!=='object'){
      var v=rel.vitals||{};
      var hasTourSignal=first(v.tour_outcome,v.post_tour_disposition,v.disposition,v.interest_read,v.tour_interest,v.what_landed,v.whats_in_way,v.tour_note,v.post_tour_note);
      if(!hasTourSignal) return null;
      t={
        outcome:v.tour_outcome||'completed',
        disposition:first(v.post_tour_disposition,v.disposition),
        interest_read:first(v.interest_read,v.tour_interest),
        what_landed:v.what_landed,
        whats_in_way:first(v.whats_in_way,v.what_is_in_way),
        note:first(v.tour_note,v.post_tour_note),
        captured_at:first(v.post_tour_captured_at,v.tour_outcome_at)
      };
    }
    var outcome=lower(first(t.outcome,t.tour_outcome,t.status));
    var disposition=lower(first(t.disposition,t.next_disposition,t.post_tour_disposition));
    var interest=first(t.interest_read,t.temperature,t.interest);
    return {
      id:first(t.tour_id,t.id),
      outcome:outcome,
      disposition:disposition,
      interest:interest?human(interest):null,
      landed:cleanList(first(t.what_landed,t.landed,t.highlights),3),
      blockers:cleanList(first(t.whats_in_way,t.what_is_in_way,t.blockers,t.objections),2),
      note:first(t.note_preview,t.note,t.notes,t.summary),
      capturedBy:first(t.captured_by&&t.captured_by.name,t.captured_by_name,t.actor_name),
      capturedAt:first(t.captured_at,t.occurred_at,t.updated_at)
    };
  }
  function canonicalNextTitle(n){
    var code=lower(first(n&&n.code,n&&n.rung,n&&n.primary_action&&n.primary_action.code,n&&n.action&&n.action.code));
    var raw=String(first(n&&n.title,n&&n.label,n&&n.summary,'')||'');
    if(code==='send_application'||/send_application/.test(code)||/send the application/i.test(raw)) return 'Send the application';
    if(/continue.*follow|post_tour_follow|follow_up/.test(code)||/continue follow/i.test(raw)) return 'Continue follow-up';
    if(/schedule_second_tour|second_tour/.test(code)) return 'Schedule another tour';
    if(/resolve.*unit|find.*unit|unit_fit/.test(code)) return 'Resolve unit fit';
    if(/confirm.*terms|terms_review/.test(code)) return 'Review the proposed terms';
    if(/application/.test(code)&&!/send/.test(code)) return 'Open the application';
    if(/lease/.test(code)) return 'Open the lease';
    if(raw){
      var cleaned=raw.replace(/^tour follow-?up\s*[—-].*?\s*[—-]\s*recommended:\s*/i,'').replace(/^recommended:\s*/i,'').trim();
      if(cleaned.length<=72) return cleaned.charAt(0).toUpperCase()+cleaned.slice(1);
    }
    return human(code||'Next action');
  }
  function canonicalNextReason(n,title){
    var reason=first(n&&n.reason,n&&n.explanation,n&&n.description);
    if(reason&&String(reason)!==String(n&&n.label)) return String(reason);
    if(title==='Send the application') return 'Recommended after the completed tour.';
    if(title==='Continue follow-up') return 'The prospect is interested but not ready to apply.';
    return null;
  }
  function nextOwner(n){return first(n&&n.owner_name,n&&n.owner&&n.owner.name,n&&n.accountable_owner&&n.accountable_owner.name,'Unassigned');}
  function normalizeNext(card){
    var o=explicitOverview(card),nx=Array.isArray(o.next)?o.next:(Array.isArray(card&&card.next)?card.next:[]);
    return nx.slice(0,2).map(function(n){
      var a=(n&&(n.primary_action||n.action))||{},title=canonicalNextTitle(n),due=first(n.due_at,n.due_by),kind=lower(a.kind),code=lower(a.code),target=a.target||{};
      var effectiveLabel='';
      if(kind==='navigation'&&target.id) effectiveLabel='Open';
      else if((kind==='dispatch'||code==='send_application'||(kind==='task_write'&&code==='send_application'))&&typeof W.__psPersonCardAction==='function') effectiveLabel='Send';
      else if((kind==='task_write'&&(code==='complete_task'||code==='complete'))&&typeof W.__psPersonCardAction==='function') effectiveLabel='Complete';
      else if((kind==='dispatch'||code==='send_application'||kind==='task_write')&&typeof W.openDesk==='function') effectiveLabel='Open';
      return {
        id:first(n.id,n.obligation_id,target.id),title:title,reason:canonicalNextReason(n,title),owner:nextOwner(n),due_at:due,
        primary_action:a,effective_label:effectiveLabel
      };
    });
  }
  function communicationSummary(card,raw){
    var o=explicitOverview(card),c=first(o.communication_summary,card&&card.communication_summary);
    if(c&&typeof c==='object'){
      return {
        message_count:Number(first(c.message_count,c.count,0))||0,
        last_inbound_at:first(c.last_inbound_at,c.last_received_at),
        last_outbound_at:first(c.last_outbound_at,c.last_sent_at),
        waiting_on:first(c.waiting_on,c.waiting),
        control_mode:first(c.control_mode,c.mode),
        summary:first(c.summary,c.topic_summary,c.latest_summary)
      };
    }
    var comm=(raw||[]).filter(isCommunication),lastIn=null,lastOut=null;
    comm.forEach(function(e){
      var at=occurredAt(e),dir=lower(first(e.direction,e.detail&&e.detail.direction));
      if(dir==='inbound'&&(!lastIn||new Date(at)>new Date(lastIn))) lastIn=at;
      if(dir==='outbound'&&(!lastOut||new Date(at)>new Date(lastOut))) lastOut=at;
    });
    return {message_count:comm.length,last_inbound_at:lastIn,last_outbound_at:lastOut,waiting_on:null,control_mode:null,summary:null};
  }
  function milestoneTitle(kind,e){
    var explicit=first(e&&e.title,e&&e.label);
    var map={
      lead_created:'Lead created',conversation_started:'Conversation started',conversation_summary_changed:'Conversation updated',
      tour_scheduled:'Tour scheduled',tour_rescheduled:'Tour rescheduled',tour_completed:'Tour completed',tour_no_show:'Tour no-show',tour_cancelled:'Tour cancelled',
      post_tour_assessment_captured:'Post-tour assessment captured',material_preferences_updated:'Preferences updated',application_recommended:'Application recommended',
      application_sent:'Application sent',application_started:'Application started',application_submitted:'Application submitted',application_approved:'Application approved',
      terms_confirmed:'Terms confirmed',lease_sent:'Lease sent',lease_executed:'Lease executed',tenancy_confirmed:'Tenancy confirmed',relationship_closed:'Relationship closed',
      relationship_reopened:'Relationship reopened',owner_changed:'Owner changed',material_fact_corrected:'Information corrected'
    };
    if(map[kind]) return map[kind];
    return explicit||human(kind);
  }
  function milestoneSummary(kind,e){
    var s=first(e&&e.summary,e&&e.description,e&&e.detail&&e.detail.summary);
    if(s&&String(s)!==String(first(e&&e.title,e&&e.label))) return String(s);
    if(kind==='application_sent') return 'The application was dispatched.';
    if(kind==='tour_no_show') return 'Follow-up or rescheduling may be needed.';
    return null;
  }
  function timeline(card){
    var o=explicitOverview(card),server=Array.isArray(o.timeline)?o.timeline:null,raw=server||((Array.isArray(card&&card.history)?card.history:[]));
    var out=[],seen={};
    raw.forEach(function(e){
      var kind=eventKind(e);
      if(kind==='communication'||!MILESTONE_ALLOWLIST[kind]) return;
      var key=kind+'|'+String(sourceId(e)||'')+'|'+String(occurredAt(e)||'');
      if(seen[key]) return; seen[key]=1;
      out.push({
        id:first(e.id,sourceId(e),key),kind:kind,occurred_at:occurredAt(e),recorded_at:first(e.recorded_at,e.recordedAt),
        title:milestoneTitle(kind,e),summary:milestoneSummary(kind,e),actor:first(e.actor&&e.actor.name,e.actor_name,e.recorded_by_name),
        source_type:first(e.source_type,e.source),source_id:sourceId(e),claim_strength:first(e.claim_strength,e.claimStrength),
        correction:Boolean(e.correction_of||e.corrects_source_id||e.prior_reference||kind==='material_fact_corrected')
      });
    });
    var tour=latestTour(card);
    if(tour){
      var tourKind=tour.outcome==='completed'?'tour_completed':
        ((tour.outcome==='no_show'||tour.outcome==='no_showed')?'tour_no_show':
        (tour.outcome==='rescheduled'?'tour_rescheduled':
        ((tour.outcome==='cancelled'||tour.outcome==='canceled')?'tour_cancelled':null)));
      if(tourKind&&!out.some(function(x){return x.kind===tourKind||(tourKind==='tour_completed'&&x.kind==='post_tour_assessment_captured');})){
        var bits=[];
        if(tourKind==='tour_completed'){
          if(tour.disposition==='start_application'||tour.disposition==='ready_to_apply') bits.push('Ready to apply.');
          else if(tour.disposition==='keep_working') bits.push('Interested, but not ready to apply.');
          else if(/needs_change|change_needed|conditional/.test(tour.disposition)) bits.push('A material blocker must change.');
          else if(/watch|close|not_fit/.test(tour.disposition)) bits.push('Fit or timing is uncertain.');
          if(tour.landed.length) bits.push(tour.landed.join(' · ')+' landed well.');
          if(tour.blockers.length) bits.push('In the way: '+tour.blockers.join(' · ')+'.');
        }else if(tourKind==='tour_no_show') bits.push('Follow-up or rescheduling may be needed.');
        var titleMap={tour_completed:'Tour completed',tour_no_show:'Tour no-show',tour_rescheduled:'Tour rescheduled',tour_cancelled:'Tour cancelled'};
        out.push({id:'tour:'+String(tour.id||tour.capturedAt||'latest'),kind:tourKind,occurred_at:tour.capturedAt,title:titleMap[tourKind],summary:bits.join(' ')||null,actor:tour.capturedBy,source_type:'post_tour_capture',source_id:tour.id,claim_strength:'confirmed',correction:false});
      }
    }
    var comm=communicationSummary(card,raw);
    var alreadyHasCommunicationSummary=out.some(function(x){return x.kind==='conversation_summary_changed';});
    if(comm.message_count>0&&!alreadyHasCommunicationSummary){
      var last=first(comm.last_inbound_at,comm.last_outbound_at,lastContact(card));
      var bits=[];
      if(comm.summary) bits.push(String(comm.summary));
      else bits.push(comm.message_count+' message'+(comm.message_count===1?'':'s')+' in the relationship thread.');
      if(comm.waiting_on) bits.push('Waiting on '+human(comm.waiting_on).toLowerCase()+'.');
      out.push({id:'communication-summary',kind:'conversation_summary_changed',occurred_at:last,title:'Conversation active',summary:bits.join(' '),communication_link:true});
    }
    out.sort(function(a,b){return new Date(b.occurred_at||0)-new Date(a.occurred_at||0);});
    return out.slice(0,12);
  }
  function buildOverview(card){
    card=card||{};
    return {
      stage_label:stageLabel(card),operating_position:operatingPosition(card),current_state_sentence:currentStateSentence(card),
      property_name:propertyName(card),last_contact_at:lastContact(card),facts:relationshipFacts(card),latest_tour:latestTour(card),
      next:normalizeNext(card),timeline:timeline(card),communication_summary:communicationSummary(card,Array.isArray(card.history)?card.history:[])
    };
  }

  function contactHtml(person){
    var out=[];
    if(person&&person.phone){var tel=String(person.phone).replace(/[^+\d]/g,'');out.push('<a href="tel:'+esc(tel)+'">'+esc(person.phone)+'</a>');}
    if(person&&person.email) out.push('<a href="mailto:'+esc(String(person.email))+'">'+esc(person.email)+'</a>');
    return out.length?'<div class="pcx-contactline">'+out.join('')+'</div>':'';
  }
  function shellTop(st){
    st=st||{}; var card=st.card||{},person=card.person||{},o=buildOverview(card),name=person.name||(st.opts&&st.opts.name)||'Person';
    var context=[o.property_name,o.last_contact_at?'Last contact '+date(o.last_contact_at,true):null].filter(Boolean).join(' · ');
    var position=o.operating_position?'<span class="pcx-position"><i aria-hidden="true"></i>'+esc(o.operating_position)+'</span>':'';
    return '<div class="pcx-top"><button type="button" class="pcx-back" onclick="closeDrawer()">← Back</button><button type="button" class="pcx-close" onclick="closeDrawer()" aria-label="Close">×</button></div>'+ 
      '<header class="pcx-head"><div class="pcx-state-row"><span class="pcx-stage">'+esc(o.stage_label)+'</span>'+position+'</div><h2 class="pcx-name">'+esc(name)+'</h2>'+(context?'<div class="pcx-contextline">'+esc(context)+'</div>':'')+contactHtml(person)+'</header>'+ 
      '<div class="pcx-tabs" role="tablist" aria-label="Person relationship"><button type="button" class="pcx-tab '+(st.tab==='info'?'on':'')+'" role="tab" aria-selected="'+(st.tab==='info'?'true':'false')+'" onclick="pcLiveSetTab(\'info\')">Overview</button><button type="button" class="pcx-tab '+(st.tab==='communication'?'on':'')+'" role="tab" aria-selected="'+(st.tab==='communication'?'true':'false')+'" onclick="pcLiveSetTab(\'communication\')">Communication</button></div>';
  }
  function currentHtml(o){
    return '<section class="pcx-current"><span class="pcx-current-dot" aria-hidden="true"></span><div><div class="pcx-section-label">Current state</div><div class="pcx-current-sentence">'+esc(o.current_state_sentence)+'</div></div></section>';
  }
  function factsHtml(o){
    if(!o.facts.length) return '';
    return '<section class="pcx-band"><div class="pcx-section-label">Relationship</div><div class="pcx-facts">'+o.facts.map(function(f){return '<div class="pcx-fact"><span>'+esc(f.label)+'</span><b>'+esc(f.value)+'</b></div>';}).join('')+'</div></section>';
  }
  function tourHtml(t){
    if(!t||(!t.outcome&&!t.disposition&&!t.interest&&!t.landed.length&&!t.blockers.length&&!t.note)) return '';
    var title=t.disposition?sentence(t.disposition):sentence(t.outcome||'Captured');
    var interest=t.interest?'<span class="pcx-signal-pill">'+esc(sentence(t.interest))+' interest</span>':'';
    var rows='';
    if(t.landed.length) rows+='<div class="pcx-brief-row"><span>What landed</span><b>'+esc(t.landed.join(' · '))+'</b></div>';
    if(t.blockers.length) rows+='<div class="pcx-brief-row"><span>In the way</span><b>'+esc(t.blockers.join(' · '))+'</b></div>';
    if(t.note) rows+='<div class="pcx-brief-row"><span>Tour note</span><b>'+esc(t.note)+'</b></div>';
    return '<section class="pcx-band"><div class="pcx-band-head"><div><div class="pcx-section-label">Tour result</div><div class="pcx-band-title">'+esc(title)+'</div></div>'+interest+'</div><div class="pcx-brief">'+rows+'</div></section>';
  }
  function nextActionHtml(n,index){
    var a=n.primary_action||{},t=a.target||{};
    if(!n.effective_label) return '';
    var attrs=' data-pcx-next-index="'+index+'" data-pcx-next-kind="'+esc(a.kind||'')+'" data-pcx-next-code="'+esc(a.code||'')+'" data-pcx-next-type="'+esc(t.type||'')+'" data-pcx-next-id="'+esc(t.id||'')+'"';
    return '<button type="button" class="pcx-next-action"'+attrs+'>'+esc(n.effective_label)+'</button>';
  }
  function nextHtml(o){
    var h='<section class="pcx-band"><div class="pcx-section-label">Next</div>';
    if(!o.next.length) return h+'<div class="pcx-empty">Nothing needs attention right now.</div></section>';
    h+='<div class="pcx-next-list">';
    o.next.forEach(function(n,i){
      var due=n.due_at?new Date(n.due_at):null,valid=due&&!Number.isNaN(due.getTime()),over=valid&&due<new Date();
      var meta=[n.owner,valid?(over?'Overdue since ':'Due ')+date(due,true):null].filter(Boolean).join(' · ');
      h+='<article class="pcx-next '+(over?'over':'')+'"><div class="pcx-next-k">'+(i===0?'Current move':'Also open')+'</div><div class="pcx-next-title">'+esc(n.title)+'</div>'+(n.reason?'<div class="pcx-next-reason">'+esc(n.reason)+'</div>':'')+(meta?'<div class="pcx-next-meta">'+esc(meta)+'</div>':'')+nextActionHtml(n,i)+'</article>';
    });
    return h+'</div></section>';
  }
  function timelineHtml(o){
    var h='<section class="pcx-band"><div class="pcx-section-label">Timeline</div><div class="pcx-band-copy">The meaningful changes in this relationship.</div>';
    if(!o.timeline.length) return h+'<div class="pcx-empty">No milestones recorded yet.</div></section>';
    var lastDay=''; h+='<div class="pcx-timeline">';
    o.timeline.forEach(function(m){
      var d=day(m.occurred_at); if(d&&d!==lastDay){h+='<div class="pcx-day">'+esc(d)+'</div>';lastDay=d;}
      var meta=[m.actor,m.occurred_at?date(m.occurred_at,true):null,m.correction?'Correction':null].filter(Boolean).join(' · ');
      h+='<article class="pcx-milestone '+(m.correction?'correction':'')+'"><div class="pcx-milestone-title">'+esc(m.title)+'</div>'+(m.summary?'<div class="pcx-milestone-summary">'+esc(m.summary)+'</div>':'')+(m.communication_link?'<button type="button" class="pcx-textlink" data-pcx-communication="1">View communication →</button>':'')+(meta?'<div class="pcx-milestone-meta">'+esc(meta)+'</div>':'')+'</article>';
    });
    return h+'</div></section>';
  }
  function detailsHtml(card){
    card=card||{};var person=card.person||{},rel=card.relationship||{},a=card.application||card.current_application||{},l=card.lease||card.tenancy||{},rows='';
    function row(label,value){if(value!=null&&value!=='') rows+='<div><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>';}
    row('Person record',first(person.id,card.person_id)); row('Relationship record',first(rel.id,rel.relationship_id,card.relationship_id)); row('Application record',first(a.application_id,a.id)); row('Lease record',first(l.lease_id,l.id));
    return rows?'<details class="pcx-details"><summary>Source records</summary><div class="pcx-detail-grid">'+rows+'</div></details>':'';
  }
  function infoHtml(st){
    st=st||{};var card=st.card||{},o=buildOverview(card);
    return '<section class="pcx-panel '+(st.tab==='info'?'on':'')+'" data-pcx-panel="info"><div class="pcx-info-stack">'+currentHtml(o)+factsHtml(o)+tourHtml(o.latest_tour)+nextHtml(o)+timelineHtml(o)+detailsHtml(card)+'</div></section>';
  }

  function openApplication(id){
    if(!id) return;
    if(typeof W.pcOpenApplicationFromCard==='function'){W.pcOpenApplicationFromCard(id);return;}
    if(typeof W.openApplicationReview==='function'){W.openApplicationReview({application_id:id,source:'person_card'});return;}
    if(typeof W.dispatchEvent==='function'&&typeof W.CustomEvent==='function') W.dispatchEvent(new W.CustomEvent('ps:open-application-review',{detail:{application_id:id,source:'person_card'}}));
  }
  function fallbackOpenLeasing(){
    if(typeof W.closeDrawer==='function') W.closeDrawer();
    if(typeof W.openDesk==='function') W.openDesk('leasing');
    if(typeof W.toast==='function') W.toast('ok','Open Leasing Work to complete this action.');
  }
  function handleNext(target){
    var type=target.getAttribute('data-pcx-next-type'),id=target.getAttribute('data-pcx-next-id'),kind=target.getAttribute('data-pcx-next-kind'),code=target.getAttribute('data-pcx-next-code');
    if(kind==='navigation'){
      if(type==='application') return openApplication(id);
      if(type==='conversation'||type==='person'){if(typeof W.pcLiveSetTab==='function') W.pcLiveSetTab('communication');return;}
    }
    if(typeof W.__psPersonCardAction==='function') return W.__psPersonCardAction({kind:kind,code:code,target:{type:type,id:id},source:'person_card'});
    fallbackOpenLeasing();
  }
  function handleClick(ev){
    var target=ev&&ev.target&&ev.target.closest?ev.target.closest('[data-pcx-communication],[data-pcx-next-index]'):null;
    if(!target) return;
    ev.preventDefault();ev.stopPropagation();
    if(target.hasAttribute('data-pcx-communication')){if(typeof W.pcLiveSetTab==='function') W.pcLiveSetTab('communication');return;}
    handleNext(target);
  }
  function installStartTabBridge(){
    if(typeof W.openPersonCard!=='function'||W.openPersonCard.__pcxStartTabBridge) return;
    var original=W.openPersonCard;
    function wrapped(opts){
      var requested=opts&&opts.start_tab==='communication'?'communication':'info';
      W.__pcxRequestedTab=requested;
      var out=original.apply(this,arguments),apply=function(){if(typeof W.pcLiveSetTab==='function') W.pcLiveSetTab(requested);};
      if(out&&typeof out.then==='function') out.then(function(){setTimeout(apply,0);},function(){}); else setTimeout(apply,0);
      return out;
    }
    wrapped.__pcxStartTabBridge=true;wrapped.__pcxOriginal=original;W.openPersonCard=wrapped;
  }
  function ensureStyles(){
    if(!D||D.getElementById(STYLE_ID)) return;
    var s=D.createElement('style');s.id=STYLE_ID;s.textContent=[
      '.pcx{--pci-ink:#171716;--pci-muted:#6f6e69;--pci-faint:#9b9992;--pci-line:#e4e1da;--pci-soft:#f0eee8;--pci-paper:#fffefa;--pci-warm:#f7f6f2;--pci-green:#23654f;--pci-green-soft:#edf6f1;--pci-red:#a33e34;--pci-red-soft:#fff3f0;--pci-amber:#94691e;color:var(--pci-ink);font-family:"IBM Plex Sans",system-ui,sans-serif}',
      '.drawer.pc-rail .sheet{width:min(640px,100%);padding:18px 24px 26px;background:var(--pci-paper);border-left:1px solid rgba(23,23,22,.08);box-shadow:-24px 0 70px rgba(20,18,14,.14)}',
      '.pcx-top{display:flex;align-items:center;justify-content:space-between;min-height:44px}.pcx-back,.pcx-close{appearance:none;border:0;background:transparent;color:var(--pci-muted);cursor:pointer}.pcx-back{display:inline-flex;align-items:center;min-height:40px;padding:0;font-size:11.5px;font-weight:600}.pcx-close{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;font-size:21px;line-height:1}.pcx-close:hover,.pcx-back:hover{color:var(--pci-ink)}.pcx-close:hover{background:#f1efea}',
      '.pcx-head{padding:12px 0 18px}.pcx-state-row{display:flex;align-items:center;gap:8px;min-height:24px}.pcx-stage{font:600 9px/1.2 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--pci-muted)}.pcx-position{display:inline-flex;align-items:center;gap:6px;min-height:23px;border-radius:999px;background:var(--pci-green-soft);padding:0 9px;font-size:9.5px;font-weight:650;color:var(--pci-green)}.pcx-position i{width:6px;height:6px;border-radius:999px;background:currentColor}.pcx-name{margin:10px 0 0;font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:34px;font-weight:620;letter-spacing:-.045em;line-height:1.02;text-transform:none}.pcx-contextline{margin-top:8px;font-size:11.5px;line-height:1.45;color:var(--pci-muted)}.pcx-contactline{display:flex;gap:6px 14px;flex-wrap:wrap;margin-top:8px;font-size:10.5px;color:var(--pci-faint)}.pcx-contactline a{color:inherit;text-decoration:none;border-bottom:1px solid rgba(23,23,22,.18)}.pcx-contactline a:hover{color:var(--pci-ink);border-bottom-color:var(--pci-ink)}',
      '.pcx-tabs{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--pci-line);background:rgba(255,254,250,.96);backdrop-filter:blur(14px)}.pcx-tab{position:relative;min-height:48px;appearance:none;border:0;background:transparent;padding:0;color:var(--pci-faint);font-size:11.5px;font-weight:600;cursor:pointer}.pcx-tab:after{content:"";position:absolute;left:22%;right:22%;bottom:-1px;height:2px;border-radius:999px;background:transparent}.pcx-tab.on{color:var(--pci-ink)}.pcx-tab.on:after{background:var(--pci-ink)}',
      '.pcx-panel{display:none}.pcx-panel.on{display:block}.pcx-info-stack{display:grid}.pcx-section-label{font:600 8.5px/1.2 "IBM Plex Mono",monospace;letter-spacing:.11em;text-transform:uppercase;color:var(--pci-faint)}',
      '.pcx-current{display:grid;grid-template-columns:8px minmax(0,1fr);gap:13px;margin:20px 0 2px;padding:16px 18px;border-radius:16px;background:var(--pci-warm)}.pcx-current-dot{width:8px;height:8px;margin-top:4px;border-radius:999px;background:var(--pci-green);box-shadow:0 0 0 5px rgba(35,101,79,.08)}.pcx-current-sentence{max-width:520px;margin-top:7px;font-size:18px;font-weight:620;line-height:1.32;letter-spacing:-.018em}',
      '.pcx-band{padding:22px 0;border-top:1px solid var(--pci-line)}.pcx-current+.pcx-band{border-top:0}.pcx-band-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px}.pcx-band-title{margin-top:7px;font-size:14px;font-weight:650;letter-spacing:-.01em}.pcx-band-copy{margin-top:7px;font-size:11px;line-height:1.45;color:var(--pci-muted)}.pcx-signal-pill{display:inline-flex;align-items:center;min-height:26px;border-radius:999px;background:#f0f3ef;padding:0 10px;font-size:9.5px;font-weight:650;color:#52635a;white-space:nowrap}',
      '.pcx-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 20px;margin-top:12px}.pcx-fact{min-width:0;padding:10px 0 11px;border-top:1px solid var(--pci-soft)}.pcx-fact span{display:block;font-size:9.5px;line-height:1.3;color:var(--pci-faint)}.pcx-fact b{display:block;margin-top:5px;font-size:12.5px;font-weight:620;line-height:1.35;overflow-wrap:anywhere}',
      '.pcx-brief{display:grid;margin-top:2px}.pcx-brief-row{display:grid;grid-template-columns:104px minmax(0,1fr);gap:16px;padding:10px 0;border-top:1px solid var(--pci-soft)}.pcx-brief-row:first-child{border-top:0}.pcx-brief-row span{font-size:10px;color:var(--pci-faint)}.pcx-brief-row b{font-size:12px;font-weight:520;line-height:1.5}',
      '.pcx-next-list{display:grid;gap:10px;margin-top:12px}.pcx-next{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:18px;min-width:0;border:1px solid var(--pci-line);border-radius:16px;background:#fff;padding:15px 16px;box-shadow:0 7px 22px rgba(22,20,16,.035)}.pcx-next.over{border-color:#ead2cc;background:var(--pci-red-soft)}.pcx-next-k{grid-column:1/-1;font:600 8px/1.2 "IBM Plex Mono",monospace;letter-spacing:.09em;text-transform:uppercase;color:var(--pci-faint)}.pcx-next-title{margin-top:7px;font-size:15px;font-weight:650;line-height:1.3;letter-spacing:-.01em}.pcx-next-reason{max-width:440px;margin-top:4px;font-size:11.5px;line-height:1.45;color:var(--pci-muted)}.pcx-next-meta{margin-top:9px;font-size:10px;line-height:1.4;color:var(--pci-faint)}.pcx-next.over .pcx-next-meta{color:#9a625b}.pcx-next-action{grid-column:2;grid-row:2/5;align-self:center;appearance:none;min-height:40px;border:0;border-radius:999px;background:var(--pci-ink);padding:10px 17px;color:#fff;font-size:10.5px;font-weight:650;cursor:pointer;box-shadow:0 4px 12px rgba(23,23,22,.12)}.pcx-next-action:hover{transform:translateY(-1px);background:#2d2c29}',
      '.pcx-timeline{position:relative;margin:14px 0 0;padding-left:22px}.pcx-timeline:before{content:"";position:absolute;left:4px;top:24px;bottom:9px;width:1px;background:var(--pci-line)}.pcx-day{margin:18px 0 8px -22px;font:600 8px/1.2 "IBM Plex Mono",monospace;letter-spacing:.09em;text-transform:uppercase;color:var(--pci-faint)}.pcx-day:first-child{margin-top:0}.pcx-milestone{position:relative;padding:10px 0 14px}.pcx-milestone:before{content:"";position:absolute;left:-22px;top:15px;width:9px;height:9px;border:2px solid var(--pci-paper);border-radius:999px;background:#b9b5ad;box-shadow:0 0 0 1px var(--pci-line)}.pcx-milestone-title{font-size:12.5px;font-weight:650;line-height:1.35}.pcx-milestone-summary{max-width:510px;margin-top:4px;font-size:11.5px;line-height:1.5;color:var(--pci-muted)}.pcx-milestone-meta{margin-top:6px;font-size:9.5px;line-height:1.4;color:var(--pci-faint)}.pcx-milestone.correction:before{background:var(--pci-amber)}',
      '.pcx-textlink{appearance:none;border:0;background:transparent;padding:0;margin-top:8px;color:var(--pci-ink);font-size:10.5px;font-weight:650;cursor:pointer}.pcx-empty{padding:12px 0;color:var(--pci-faint);font-size:11.5px}.pcx-details{margin:0 0 16px;border-top:1px solid var(--pci-line)}.pcx-details>summary{min-height:46px;display:flex;align-items:center;justify-content:space-between;list-style:none;color:var(--pci-faint);font:600 8.5px/1.2 "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}.pcx-details>summary::-webkit-details-marker{display:none}.pcx-details>summary:after{content:"+"}.pcx-details[open]>summary:after{content:"–"}.pcx-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px;padding-bottom:14px}.pcx-detail-grid>div{display:grid;gap:4px;padding:9px 0;border-top:1px solid var(--pci-soft)}.pcx-detail-grid span{font-size:9.5px;color:var(--pci-faint)}.pcx-detail-grid b{font-size:11px;font-weight:550;overflow-wrap:anywhere}',
      '.pcx-tab:focus-visible,.pcx-back:focus-visible,.pcx-close:focus-visible,.pcx-next-action:focus-visible,.pcx-textlink:focus-visible{outline:2px solid var(--pci-ink);outline-offset:3px}',
      '@media(max-width:620px){.drawer.pc-rail .sheet{padding:14px 18px 24px}.pcx-head{padding-top:8px}.pcx-name{font-size:31px}.pcx-tabs{margin:0 -2px}.pcx-current{margin-top:16px;padding:15px}.pcx-current-sentence{font-size:17px}.pcx-facts{grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}.pcx-fact{padding:10px 0}.pcx-brief-row{grid-template-columns:92px minmax(0,1fr);gap:12px}.pcx-next{grid-template-columns:1fr;padding:15px}.pcx-next-action{grid-column:1;grid-row:auto;width:100%;margin-top:13px;min-height:44px}.pcx-detail-grid{grid-template-columns:1fr}.pcx-timeline{padding-left:20px}.pcx-timeline:before{left:4px}.pcx-milestone:before{left:-20px}}',
      '@media(max-width:390px){.pcx-facts{grid-template-columns:1fr}.pcx-name{font-size:29px}}',
      '@media(prefers-reduced-motion:reduce){.pcx *{transition:none!important;scroll-behavior:auto!important}}'
    ].join('\n');
    D.head.appendChild(s);
  }
  function install(){
    if(!D) return;
    ensureStyles();
    W.pcLiveShellTop=shellTop;W.pcLiveInfoHtml=infoHtml;W.pcLiveBuildOverview=buildOverview;W.pcEnsureInformationDesign=ensureStyles;W.pcInstallStartTabBridge=installStartTabBridge;
    installStartTabBridge();
    (function retry(n){if(typeof W.openPersonCard==='function'&&W.openPersonCard.__pcxStartTabBridge)return;if(n>=20)return;setTimeout(function(){installStartTabBridge();retry(n+1);},50);})(0);
    if(!D.__pcxSignalListener){D.addEventListener('click',handleClick,true);D.__pcxSignalListener=true;}
  }

  return {buildOverview:buildOverview,timeline:timeline,relationshipFacts:relationshipFacts,latestTour:latestTour,normalizeNext:normalizeNext,eventKind:eventKind,install:install};
});
