"use strict";
// Class 1 UI component: both entry points use the existing canonical reads and
// offer/send actions. No availability, pricing, identity or workflow store.
(function(){
function mountApplicationOfferReview(host2, options){
  if(!host2 || !options || !options.conversionId) throw new Error('Application review context is required.');
  var live=options.live, _currentConv={conversion_id:options.conversionId};
  var applicationSelectionTerm=null, active=true;
  var q=function(id){return host2.querySelector('#'+id);};
  var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var sessionMod={
    leaseableUnits:async function(term){
      var d=(await live.leaseableUnits(term)||{}).data||{};
      if(d.selection_basis!=='requested_term'||d.requested_start!==term.requested_start||d.requested_end!==term.requested_end) throw new Error('Homes could not be checked for those dates. Try again.');
      return {eligible:d.eligible_targets||d.eligible_units||[],excluded:d.excluded_targets||[],unsupported:d.unsupported_multi_space_units||[]};
    },
    sendApplication:options.sendApplication
  };
  function loadProspectContext(){
    var slot=q('lqProspectContext');
    if(!slot)return;
    slot.textContent='Loading recorded preferences…';
    function current(){return active&&host2.isConnected&&q('lqProspectContext')===slot;}
    function unavailable(){if(!current())return;slot.innerHTML='<div class="lqdt-apperr">Recorded preferences unavailable.</div><button type="button" class="lq-act ghost">Retry preferences</button>';slot.querySelector('button').onclick=loadProspectContext;}
    if(!options.personId||!live||typeof live.loadResource!=='function'){unavailable();return;}
    Promise.resolve().then(function(){return live.loadResource('personCard',{personId:options.personId});}).then(function(result){
      if(!current())return;
      var card=result&&result.data;
      if(!card||!card.person||String(card.person.id)!==String(options.personId)||!card.relationship||!card.relationship.vitals)throw new Error('Prospect context did not match this person.');
      var values=card.relationship.vitals,fields=[['budget','Budget'],['unit_type','Home type'],['move_month','Move month'],['occupants','Occupants'],['pets','Pets']];
      var shown=fields.filter(function(f){return values[f[0]]!=null&&String(values[f[0]])!=='';});
      slot.innerHTML='<div class="lqdt-terms-note"><b>Recorded preferences</b><br>'+ (shown.length?shown.map(function(f){return esc(f[1])+': '+esc(values[f[0]]);}).join('<br>'):'No preferences recorded.')+'</div>';
      if(typeof window.openPersonCard==='function'){var button=document.createElement('button');button.type='button';button.className='lq-act ghost';button.textContent='View person record';button.onclick=function(){window.openPersonCard({person_id:options.personId,focus:'information',source:'application_review'});};slot.appendChild(button);}
    }).catch(unavailable);
  }
        function chooseUnit(headingMsg){
          var term=applicationSelectionTerm||{};
          host2.innerHTML='<div class="lqdt-sheet"><div id="lqProspectContext" aria-live="polite"></div><div class="lqdt-sheet-t">'+esc(headingMsg||'Find a home for their dates')+'</div><div class="lqdt-terms-grid"><label>Lease start<input id="lqTargetStart" type="date" value="'+esc(term.requested_start||'')+'"></label><label>Lease end<input id="lqTargetEnd" type="date" value="'+esc(term.requested_end||'')+'"></label></div><button type="button" class="lq-act primary" id="lqFindHomes">Find homes</button><div class="lqdt-unitwrap" id="lqUnitWrap">Enter the requested lease dates to check homes and turn readiness.</div></div>';
          loadProspectContext();
          q('lqFindHomes').onclick=function(){
          var start=q('lqTargetStart').value,end=q('lqTargetEnd').value;
          if(!start||!end||end<=start){q('lqUnitWrap').textContent='Enter both dates, with lease end after lease start.';return;}
          applicationSelectionTerm={requested_start:start,requested_end:end};
          var requestedTerm=applicationSelectionTerm;
          var requestWrap=q('lqUnitWrap');
          q('lqFindHomes').disabled=true;
          q('lqUnitWrap').textContent='Checking homes for these dates…';
          sessionMod.leaseableUnits(requestedTerm).then(function(out){
            var wrap=q('lqUnitWrap'); if(!wrap||wrap!==requestWrap) return;
            if(q('lqTargetStart').value!==start||q('lqTargetEnd').value!==end)return;
            var units=out.eligible, blocked=out.unsupported, excluded=out.excluded||[];
            if(!units.length && !blocked.length && !excluded.length){ wrap.innerHTML='<div class="lqdt-apperr">No homes are established as offerable for these dates. Review the dates or the availability record.</div>'; return; }
            // The server has already classified these exact targets. The browser
            // labels and carries that identity without deriving availability.
            var html=units.map(function(u){
              var st=String(u.marketing_state||'').replace(/_/g,' ');
              var multi=Number(u.rentable_space_count||0)>1;
              var label='Unit '+String(u.unit_number||'').trim();
              if(multi && u.space_label) label+=' · '+u.space_label;
              var targetDate=u.intended_move_in||'';
              var turn=u.turnover||{};
              var targetLine=targetDate?('Target '+targetDate):st;
              if(turn.outgoing_lease_end_date)targetLine+=' · Lease ends '+turn.outgoing_lease_end_date;
              if(turn.expected_ready_date)targetLine+=' · Expected ready '+turn.expected_ready_date;
              return '<button class="lqdt-unitbtn" type="button" data-uid="'+esc(u.unit_id)+'" data-space="'+esc(u.space_id||u.resolved_space_id||'')+'" data-move-in="'+esc(targetDate)+'"><b>'+esc(label)+'</b><span>'+esc(targetLine)+'</span></button>';
            }).join('');
            if(excluded.length){
              html+='<div class="lqdt-unitblocked-h">Why other homes cannot be offered for these dates</div>'+excluded.map(function(u){
                var label='Unit '+String(u.unit_number||'')+(u.space_label?' · '+u.space_label:'');
                var date=u.availability_confidence==='expected'&&u.available_from?' · Expected ready '+u.available_from:'';
                return '<div class="lqdt-unitblocked"><b>'+esc(label)+'</b><span>'+esc(u.refusal_reason||'Eligibility is not established. Review the availability record.')+esc(date)+'</span></div>';
              }).join('');
            }
            // Rolling-deploy compatibility for an older API contract.
            if(blocked.length){
              html+='<div class="lqdt-unitblocked-h">Not available for application links yet</div>'+
                blocked.map(function(u){
                  return '<div class="lqdt-unitblocked"><b>Unit '+esc(u.unit_number)+'</b>'+
                         '<span>'+esc(u.reason||'Individual-space application links are not supported for this unit yet.')+'</span></div>';
                }).join('');
            }
            if(!units.length){
              html='<div class="lqdt-apperr">No units can take an application link right now.</div>'+html;
            }
            wrap.innerHTML=html;
            Array.prototype.forEach.call(wrap.querySelectorAll('.lqdt-unitbtn'),function(btn){
              btn.onclick=function(){
                var chosen=units.filter(function(u){return String(u.unit_id||u.id)===String(btn.getAttribute('data-uid')) && String(u.space_id||u.resolved_space_id||'')===String(btn.getAttribute('data-space')||'');})[0]||null;
                reviewOffer({
                  unit_id:btn.getAttribute('data-uid'),
                  space_id:btn.getAttribute('data-space')||null,
                  intended_move_in:btn.getAttribute('data-move-in')||null
                  ,requested_end:requestedTerm.requested_end
                },chosen);
              };
            });
          }).catch(function(e){ var wrap=q('lqUnitWrap'); if(wrap===requestWrap) wrap.innerHTML='<div class="lqdt-apperr">'+esc((e&&e.message)||'Could not load units.')+'</div>'; }).finally(function(){if(q('lqUnitWrap')===requestWrap&&q('lqFindHomes'))q('lqFindHomes').disabled=false;});
          };
          function datesChanged(){q('lqUnitWrap').textContent='Dates changed. Find homes again to check this term.';}
          q('lqTargetStart').oninput=datesChanged;q('lqTargetEnd').oninput=datesChanged;
        }
        function reviewOffer(target,unit){
          var t=(unit&&unit.application_terms&&typeof unit.application_terms==='object')?unit.application_terms:{};
          host2.innerHTML='<div class="lqdt-sheet"><div id="lqProspectContext" aria-live="polite"></div><div class="lqdt-sheet-t">Review complete application terms before sending</div><div class="lqdt-terms-note">Exact target: '+esc((unit&&unit.unit_number)||target.unit_id)+(unit&&unit.space_label?' · '+esc(unit.space_label):'')+'. Confirm any unfilled terms before sending.</div><div class="lqdt-terms-grid"><label>Monthly rent<input id="lqOfferRent" inputmode="decimal" value="'+esc(t.rent==null?'':t.rent)+'"></label><label>Security deposit<input id="lqOfferDep" inputmode="decimal" value="'+esc(t.security_deposit==null?'':t.security_deposit)+'"></label><label>Lease start<input id="lqOfferStart" type="date" value="'+esc(t.lease_start_date||target.intended_move_in||'')+'"></label><label>Lease end<input id="lqOfferEnd" type="date" value="'+esc(t.lease_end_date||target.requested_end||'')+'"></label></div><div id="lqOfferFees" class="lqdt-fees"><div class="lqdt-terms-note">Applicable fees</div></div><button type="button" class="lq-act ghost" id="lqAddFee">Add fee</button><label class="lqdt-nonefees"><input id="lqNoFees" type="checkbox"> I confirm there are no applicable fees.</label><label class="lqdt-nonefees"><input id="lqNoConcessions" type="checkbox"> I confirm there are no concessions.</label><div class="lqdt-terms-note">Concessions must be explicitly confirmed here; structured concessions are not available in this action.</div><div id="lqOfferPrepared" class="lqdt-terms-note" style="display:none" role="status"></div><div id="lqOfferErr" class="lqdt-apperr" role="alert"></div><div class="lqdt-sheet-actions"><button type="button" class="lq-act ghost" id="lqOfferBack">Back</button><button type="button" class="lq-act primary" id="lqOfferConfirm">Confirm terms and send application</button></div></div>';
          loadProspectContext();
          if(target.requested_end){q('lqOfferStart').readOnly=true;q('lqOfferEnd').readOnly=true;}
          var feeHost=q('lqOfferFees'), offerId=null, offerKey='application-offer-'+_currentConv.conversion_id+'-'+Date.now();
          function feeRow(f){var row=document.createElement('div');row.className='lqdt-fee-row';row.innerHTML='<input class="lqFeeCode" placeholder="Fee code"><input class="lqFeeLabel" placeholder="Label"><input class="lqFeeAmount" inputmode="decimal" placeholder="Amount"><select class="lqFeeCadence"><option value="monthly">per month</option><option value="one_time">one time</option><option value="per_applicant">per applicant</option></select><button type="button" class="lq-act ghost">Remove</button>';if(f){row.querySelector('.lqFeeCode').value=f.code||'';row.querySelector('.lqFeeLabel').value=f.label||'';row.querySelector('.lqFeeAmount').value=f.amount==null?'':f.amount;row.querySelector('.lqFeeCadence').value=f.cadence||'monthly';}row.querySelector('button').onclick=function(){row.remove();};feeHost.appendChild(row);}
          (Array.isArray(t.fees)?t.fees:[]).forEach(feeRow); function lockPreparedOffer(){q('lqOfferPrepared').style.display='block';q('lqOfferPrepared').textContent='Terms offer established. The reviewed fields are locked for dispatch retry; use Back to start a new review.';host2.querySelectorAll('.lqdt-terms-grid input,.lqdt-fee-row input,.lqdt-fee-row select,.lqdt-fee-row button,#lqAddFee,#lqNoFees,#lqNoConcessions').forEach(function(el){el.disabled=true;});} q('lqAddFee').onclick=function(){q('lqNoFees').checked=false;feeRow(null);}; q('lqNoFees').onchange=function(){if(this.checked)feeHost.querySelectorAll('.lqdt-fee-row').forEach(function(r){r.remove();});}; q('lqOfferBack').onclick=function(){chooseUnit('Choose the exact home for this application.');};
          q('lqOfferConfirm').onclick=async function(){var err=q('lqOfferErr'),fees=[];feeHost.querySelectorAll('.lqdt-fee-row').forEach(function(r){fees.push({code:r.querySelector('.lqFeeCode').value.trim(),label:r.querySelector('.lqFeeLabel').value.trim(),amount:r.querySelector('.lqFeeAmount').value.trim(),cadence:r.querySelector('.lqFeeCadence').value});});var vals={rent:q('lqOfferRent').value.trim(),security_deposit:q('lqOfferDep').value.trim(),lease_start_date:q('lqOfferStart').value,lease_end_date:q('lqOfferEnd').value};if(!vals.rent||!vals.security_deposit||!vals.lease_start_date||!vals.lease_end_date){err.textContent='Rent, deposit, lease start, and lease end are required.';return;}if(!q('lqNoFees').checked&&!fees.length){err.textContent='Choose Add fee or confirm there are no applicable fees.';return;}if(!q('lqNoConcessions').checked){err.textContent='Confirm that there are no concessions before sending.';return;}if(fees.some(function(f){return !f.code||!f.label||!/^\d+(\.\d{1,2})?$/.test(f.amount);})){err.textContent='Complete every fee code, label, amount, and cadence.';return;}q('lqOfferConfirm').disabled=true;try{if(!offerId){var made=await live.createApplicationOffer({conversionId:_currentConv.conversion_id,space_id:target.space_id||null,lease_start_date:vals.lease_start_date,lease_end_date:vals.lease_end_date,rent:vals.rent,security_deposit:vals.security_deposit,fees:fees,concessions:{status:'none'},idempotency_key:offerKey});if(!active || !host2.isConnected || q('lqOfferErr')!==err)return;var offer=(made&&made.data)||{};offerId=offer.application_offer_id||null;if(!offerId)throw new Error('The complete terms offer was not established.');lockPreparedOffer();}if(!active || !host2.isConnected || q('lqOfferErr')!==err)return;var out=await sessionMod.sendApplication({unit_id:target.unit_id,space_id:target.space_id||null,intended_move_in:vals.lease_start_date,application_offer_id:offerId});if(!active || !host2.isConnected || q('lqOfferErr')!==err)return;host2.innerHTML='<div class="lqdt-appsent"><b>'+esc(out.receipt||'Application sent')+'</b></div>';}catch(e){if(!active || !host2.isConnected || q('lqOfferErr')!==err)return;q('lqOfferConfirm').disabled=false;err.textContent=(e&&e.message)||'Could not send the application.';}};
        }
  chooseUnit();
  return {chooseUnit:chooseUnit,cancel:function(){active=false;}};
}
if(typeof window!=='undefined')window.psMountApplicationOfferReview=mountApplicationOfferReview;
if(typeof module!=='undefined'&&module.exports)module.exports=mountApplicationOfferReview;
})();
