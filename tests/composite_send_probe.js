"use strict";
const fs = require('node:fs'), path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../followups-door.js'), 'utf8');
function between(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b <= a) throw Error('Actual Follow Ups controller unavailable: ' + start);
  return source.slice(a, b);
}
// Execute the actual controller with only its live adapter, UI paint and timer
// replaced. No duplicate target selection or command implementation lives here.
module.exports = async function probe() {
  const state = {sending:null, sendKeys:{}, panel:null}, calls = [];
  let response = {sent:true, receipt:'Sent'}, rendered=0, refreshed=0;
  const live = () => ({sendApplicationFromConversion:async p=>{calls.push(p);return {data:response};}});
  const render = () => {rendered++;};
  const open = new Function('state','render',between('async function openSend(row)','async function openApplicationSend')+';return openSend;')(state,render);
  const send = new Function('state','live','unwrap','sendAttemptKey','refresh','render','setTimeout','sendFailureMessage',
    between('async function sendNow(row,target)','function runPrimary')+';return sendNow;')(
    state,live,x=>x.data,()=> 'attempt-1',async()=>{refreshed++;},render,()=>{},e=>e.message);
  const row={conversion_id:'conversion-1',person_name:'Synthetic prospect'};
  const target={unit_id:'unit-1',space_id:'bed-1',intended_move_in:'2026-10-01',application_offer_id:'offer-1'};
  await open(row);
  const opened={panel:state.panel,renders:rendered,sends:calls.length};
  const sent=await send(row,target);
  response={prepared:true,sent:false,receipt:'Prepared only'};
  let refused=null;
  try {await send(row,target);} catch(e) {refused=e.message;}
  const prepared=await send(row,{...target,delivery_method:'manual_email'});
  return {opened,calls,sent,refused,prepared,refreshed,state};
};
