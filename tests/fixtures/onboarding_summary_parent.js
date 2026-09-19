// Frozen verbatim renderer and helpers from index.html at a8b9241a106289c77e2dd2d42a2f501c504a50d2.
// Regression witness only; never loaded by the application.
function dsEsc(v){ return String(v==null?'':v)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function dsRowState(p){
  if(p.status==='promoted') return { label:'Added', tone:'ok' };
  if(p.status==='rejected') return { label:'Left out', tone:'muted' };
  if(p.status==='staged')   return { label:'Ready', tone:'ready' };
  if(p.status==='blocked')  return { label:"Can't use", tone:'bad' };
  if(p.status==='conflicted') return { label:'Disagrees', tone:'bad' };
  return { label:'Needs a look', tone:'warn' };
}
function dsMoney(v){ return (v==null||v==='') ? '—' : ('$'+Number(v).toLocaleString(undefined,{maximumFractionDigits:0})); }
function dsDate(v){ if(!v) return '—'; try{ return String(v).slice(0,10); }catch(_){ return '—'; } }
function dsSection(n){
  if(n.section==='current') return 'Current occupancy';
  if(n.section==='future' && !n.unit_number) return 'Unassigned future';
  if(n.section==='future') return 'Future lease';
  return 'Unassigned row';
}
function dsIdentityActions(pr){
  var review = pr.identity_review || {};
  if((pr.status!=='staged' && pr.status!=='needs_review')
      || review.status!=='staged' || review.person_id) return '';
  var candidates = Array.isArray(review.candidates) ? review.candidates : [];
  var choices = candidates.map(function(candidate){
    return '<button class="sa-btn secondary" style="padding:4px 10px;font-size:10px" '
      + 'onclick="dsResolveResident(\''+pr.id+'\',\'resolved_existing\',\''+candidate.person_id+'\')">'
      + 'Use '+dsEsc(candidate.name||'this resident')+'</button>';
  }).join(' ');
  return '<div style="margin-bottom:6px;white-space:normal">'
    + '<div style="color:var(--muted);margin-bottom:4px">Choose the resident identity. Spine will not choose a match for you.</div>'
    + choices + (choices ? ' ' : '')
    + '<button class="sa-btn secondary" style="padding:4px 10px;font-size:10px" '
    + 'onclick="dsResolveResident(\''+pr.id+'\',\'created\',null)">Create new resident</button></div>';
}
function dsRenderSetup(m){
  //  re-mounted at the end; see dsMountFeedback
  var st = _ds.setup || {};
  var p = st.property || {}, props = st.proposals || [], c = st.counts || {};
  var ready = (c.staged||0), look = (c.needs_review||0), cant = (c.blocked||0), added = (c.promoted||0);

  var head =
    '<button class="sa-btn secondary" style="margin-bottom:14px" onclick="dsOpenDeal(\''+(st.deal||{}).id+'\')">← '+dsEsc((st.deal||{}).deal_name||'Deal')+'</button>'
    + '<div class="sa-section-head"><h2>'+dsEsc(p.display_name||p.name||'Property')+'</h2></div>';

  if(!st.source){
    m.innerHTML = head
      + '<div class="sa-card-head"><h3>Start with the rent roll</h3><span style="font-size:12px;color:var(--muted)">Spine keeps the file</span></div>'
      + '<p style="font-size:13px;color:var(--muted);margin:0 0 14px;max-width:60ch">'
      +   'Upload the rent roll for this building as you exported it — .xlsx or .csv. Spine reads it, '
      +   'shows you what it understood, and keeps the original so it can always show where the '
      +   'position came from.</p>'
      + '<div class="sa-form">'
      +   '<div class="sa-form-full"><label>Rent roll file *</label><input type="file" id="dsRentRollFile" accept=".xlsx,.xls,.csv,.tsv"></div>'
      +   '<div><label>As of date *</label><input type="date" id="dsAsOf"></div>'
      + '</div>'
      + '<button class="sa-btn" onclick="dsUploadRentRoll()"'+(_ds.uploading?' disabled':'')+'>'
      +   (_ds.uploading?'Reading…':'Upload and read')+'</button>';
    return;
  }

  var understood = ((st.mapping||{}).understood)||[];
  var rows = props.map(function(pr){
    var s = dsRowState(pr), n = pr.normalized_json||{};
    var who = n.is_vacant ? '<i style="color:var(--muted)">vacant</i>' : dsEsc(n.tenant_name||'—');
    var reason = pr.status_reason || (n.source_claim_conflict
      ? 'Source rows disagree about this position.' : '');
    var act = dsIdentityActions(pr);
    if(pr.status==='staged'){
      act = '<button class="sa-btn" style="padding:4px 10px;font-size:10px" onclick="dsConfirmRow(\''+pr.id+'\')">Add</button> '
          + '<button class="sa-btn secondary" style="padding:4px 10px;font-size:10px" onclick="dsDismissRow(\''+pr.id+'\')">Leave out</button>';
    } else if(pr.status==='needs_review' || pr.status==='blocked'){
      act = '<button class="sa-btn secondary" style="padding:4px 10px;font-size:10px" onclick="dsDismissRow(\''+pr.id+'\')">Leave out</button>';
    }
    return '<tr>'
      + '<td style="font-size:11px">'+dsSection(n)+'</td>'
      + '<td><b>'+dsEsc(pr.natural_key||'—')+'</b></td>'
      + '<td>'+who+'</td>'
      + '<td style="font-size:12px">'+dsMoney(n.actual_rent)+'</td>'
      + '<td style="font-size:12px">'+dsMoney(n.market_rent)+'</td>'
      + '<td style="font-size:12px">'+dsDate(n.start_date)+' → '+dsDate(n.end_date)+'</td>'
      + '<td style="font-size:11px"><span class="sa-pill '+(s.tone==='ok'?'active':'')+'">'+s.label+'</span>'
      +   (reason ? '<br><span style="color:var(--muted)">'+dsEsc(reason)+'</span>' : '')+'</td>'
      + '<td style="text-align:right;white-space:nowrap">'+act+'</td>'
      + '</tr>';
  }).join('');

  var pos = st.opening_position;
  var sectionCounts = props.reduce(function(out, pr){
    var section = ((pr.normalized_json||{}).section)||'unassigned';
    if(section!=='current' && section!=='future') section='unassigned';
    out[section]++; return out;
  }, {current:0,future:0,unassigned:0});
  var sourceRows = (st.source && (st.source.row_count || st.source.source_row_count)) || props.length;
  var posLine = pos
    ? '<div class="sa-msg ok" style="margin-bottom:14px">Lease &amp; occupancy established as of '
      + dsDate(pos.as_of_date) + ' — ' + pos.positions_established + ' units'
      + (pos.positions_unresolved ? ', ' + pos.positions_unresolved + ' still needing attention' : '')
      + '.</div>'
    : '';

  m.innerHTML = head + posLine
    + '<div class="sa-card-head"><h3>What Spine read</h3>'
    +   '<span style="font-size:12px;color:var(--muted)">'+dsEsc(st.source.filename)+' · as of '+dsDate(st.source.as_of)+'</span></div>'
    + '<p style="font-size:12px;color:var(--muted);margin:0 0 12px">'
    +   'Columns understood: '+ (understood.length
          ? understood.map(function(u){ return dsEsc(u.column)+' → '+dsEsc(u.read_as); }).join(' · ')
          : 'read from the file')
    + '</p>'
    + '<div style="display:flex;gap:16px;margin:0 0 14px;font-size:12px">'
    +   '<span><b>'+sourceRows+'</b> source rows</span>'
    +   '<span><b>'+sectionCounts.current+'</b> current occupancy</span>'
    +   '<span><b>'+sectionCounts.future+'</b> future leases</span>'
    +   '<span><b>'+sectionCounts.unassigned+'</b> unassigned rows</span>'
    + '</div>'
    + '<div style="display:flex;gap:16px;margin:0 0 14px;font-size:12px">'
    +   '<span><b>'+added+'</b> added</span>'
    +   '<span><b>'+ready+'</b> ready</span>'
    +   '<span><b style="color:var(--brass)">'+look+'</b> need a look</span>'
    +   '<span><b>'+cant+'</b> can\'t be used</span>'
    + '</div>'
    + (ready ? '<button class="sa-btn secondary" style="margin-bottom:12px" onclick="dsConfirmAllReady()">Add all '+ready+' ready rows</button> ' : '')
    + (added ? '<button class="sa-btn" style="margin-bottom:12px" onclick="dsEstablish()">'
        + (pos ? 'Re-establish from a newer rent roll' : 'Establish lease &amp; occupancy') + '</button>' : '')
    + '<table class="sa-table"><thead><tr><th>Section</th><th>Unit</th><th>Resident</th><th>Actual rent</th><th>Asking rent</th><th>Term</th><th>State</th><th></th></tr></thead><tbody>'
    + rows + '</tbody></table>';
}
