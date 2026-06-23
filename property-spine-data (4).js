/* ════════════════════════════════════════════════════════════════════════
   PROPERTY SPINE — WORK ORDER DATA LIBRARY
   ════════════════════════════════════════════════════════════════════════

   This is DATA, not code. It holds the real work-order history for every
   property, pulled from the building systems:

     • kind:'emergency'  → SAS Flex after-hours emergency-line phone calls.
                           Live/open. Threaded: repeat calls on one issue share
                           a work order, escalation_level bumps each call.
     • kind:'directory'  → The formal Work Order Directory export (last ~30 days).
                           Mostly completed; a few still open / on hold.

   The app (index.html) READS this file via window.__WO_LIBRARY. It contains no
   logic — only records. To refresh, regenerate this file from the building
   exports; index.html does not change.

   WHEN THE BACKEND GOES LIVE: this whole file is replaced by a database query.
   The app's reader points at the API instead of window.__WO_LIBRARY — one line.

   Shape:  window.__WO_LIBRARY[propertyId] = [ workOrder, workOrder, ... ]
   Each workOrder is tagged .kind ('emergency' | 'directory').
   ════════════════════════════════════════════════════════════════════════ */

window.__WO_LIBRARY = {


  /* ── Solo on Chestnut (4233 Chestnut St) — 111 work orders: 11 emergency, 100 directory ── */
  "9e2bb96e-08e2-41db-81c2-91055ceb50a3": [
    {"id":"WO-3001","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-411","unit_number":"411","title":"Refrigerator leaking water inside","description":"Water dripping inside the refrigerator.","status":"open","source":"sas","is_emergency":false,"field_category":"appliance","unit_state":"occupied","tenant_name":"Fredie Jin","tenant_phone":"(267) 403-8490","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-06-18T08:34:37.522Z","escalation_level":1,"also_emailed":false,"responded":false,"calls":[{"at":"2026-06-18T08:34:37.533Z","note":"Water dripping inside the refrigerator."},{"at":"2026-06-18T10:04:37.533Z","note":"2nd call \u2014 refrigerator still leaking, no response yet."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-3002","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-450","unit_number":"450","title":"Mouse / pest \u2014 traps not working","description":"Mouse activity; traps were placed but tenant still seeing them.","status":"open","source":"sas","is_emergency":false,"field_category":"pest","unit_state":"occupied","tenant_name":"Nashita Ali","tenant_phone":"(609) 731-1897","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-06-17T20:34:37.533Z","escalation_level":1,"also_emailed":false,"responded":false,"calls":[{"at":"2026-06-17T20:34:37.533Z","note":"Mouse seen; traps placed but still active."},{"at":"2026-06-18T21:34:37.533Z","note":"Returning missed call \u2014 still waiting on pest follow-up."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-3003","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-217","unit_number":"217","title":"Bedbug + washer leaking (two issues)","description":"Found a bedbug on her sheet \u2014 needs fumigation. Also washer is leaking all over the place.","status":"open","source":"sas","is_emergency":false,"field_category":"pest","unit_state":"occupied","tenant_name":"Gina Palazzi","tenant_phone":"(570) 493-0760","tenant_waiting":true,"needs_pm_review":true,"created_at":"2026-06-19T09:34:37.533Z","escalation_level":3,"also_emailed":true,"responded":false,"calls":[{"at":"2026-06-19T09:34:37.533Z","note":"Bedbug on sheet \u2192 wants fumigation. Washer leaking. Emailed yesterday too."},{"at":"2026-06-19T10:34:37.533Z","note":"2nd call \u2014 same issues, no response."},{"at":"2026-06-19T12:04:37.533Z","note":"3rd call in ~3 hrs \u2014 still no callback."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-3004","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-410","unit_number":"410","title":"Lockout \u2014 lost key, smart-lock dead","description":"Lost key to apartment and the smart-lock battery died; cannot enter.","status":"open","source":"sas","is_emergency":true,"emergency_type":"lockout","field_category":"lockout","unit_state":"occupied","tenant_name":"Michiko Yu","tenant_phone":"(267) 278-0337","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-06-19T09:34:37.533Z","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-06-19T09:34:37.533Z","note":"Locked out \u2014 lost key, lock battery dead."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-3005","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-236","unit_number":"236","title":"Washer drain pipe backing up","description":"Drain pipe to the washer is backing up.","status":"open","source":"sas","is_emergency":false,"field_category":"plumbing","unit_state":"occupied","tenant_name":"Jonisha Griffin","tenant_phone":"(925) 206-1363","tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-18T16:34:37.533Z","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-06-18T16:34:37.533Z","note":"Washer drain pipe backing up."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-3006","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-525","unit_number":"525","title":"Water leak reported","description":"Tenant reports a leak.","status":"open","source":"sas","is_emergency":false,"field_category":"plumbing","unit_state":"occupied","tenant_name":"Yujin Nam","tenant_phone":"(209) 279-3407","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-06-18T02:34:37.534Z","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-06-18T02:34:37.534Z","note":"Leak reported in unit."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-3007","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-100","unit_number":"(unit TBD)","title":"Ceiling leaking in master bedroom","description":"Ceiling is leaking water in the master bedroom.","status":"open","source":"sas","is_emergency":true,"emergency_type":"active_leak","field_category":"plumbing","unit_state":"occupied","tenant_name":"Michael Son","tenant_phone":"(408) 761-2456","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-06-17T15:34:37.534Z","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-06-17T15:34:37.534Z","note":"Ceiling leaking water in master bedroom."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-3008","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-641","unit_number":"641","title":"Lockout \u2014 no response to service request","description":"Locked out. Placed a service request around noon, called again an hour later, no response.","status":"open","source":"sas","is_emergency":true,"emergency_type":"lockout","field_category":"lockout","unit_state":"occupied","tenant_name":"Jisun Won","tenant_phone":"(445) 217-1888","tenant_waiting":true,"needs_pm_review":true,"created_at":"2026-06-19T06:04:37.534Z","escalation_level":3,"also_emailed":false,"responded":false,"calls":[{"at":"2026-06-19T06:04:37.534Z","note":"Came home, locked out. Placed service request."},{"at":"2026-06-19T07:04:37.534Z","note":"Follow-up on maintenance request \u2014 still locked out."},{"at":"2026-06-19T07:34:37.534Z","note":"URGENT \u2014 still locked out, no response to either call."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-3009","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-623","unit_number":"623","title":"Toilet issue","description":"Toilet problem reported (details on callback).","status":"open","source":"sas","is_emergency":false,"field_category":"plumbing","unit_state":"occupied","tenant_name":"Michael Simeone","tenant_phone":"(908) 565-1937","tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-18T14:34:37.534Z","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-06-18T14:34:37.534Z","note":"Toilet issue reported."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-3010","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-230","unit_number":"230","title":"Maintenance request (details on callback)","description":"Tenant left a callback request; issue not specified.","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Damira Dosmagambet","tenant_phone":"(267) 993-8874","tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-18T06:34:37.534Z","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-06-18T06:34:37.534Z","note":"Callback requested \u2014 issue not specified."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-3000","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-408","unit_number":"408","title":"No A/C in unit","description":"A/C not cooling.","status":"closed","source":"sas","is_emergency":false,"field_category":"hvac","unit_state":"occupied","tenant_name":"Xiaoue Sun","tenant_phone":"(614) 906-3620","tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-06T12:34:37.534Z","escalation_level":0,"also_emailed":false,"responded":true,"calls":[{"at":"2026-06-06T12:34:37.534Z","note":"No A/C \u2014 unit not cooling."}],"completion_photo":"stub://closeout-photo/WO-3000/demo","completion_note":"Recharged condenser, confirmed cold air at vents. Tenant satisfied.","not_done_reason":null,"kind":"emergency"},
    {"id":"WO-18047","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-407","unit_number":"407","title":"My air conditioner dashboard is","description":"My air conditioner dashboard is","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-18T00:26:04","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-18","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-18T00:26:04","note":"My air conditioner dashboard is"}],"kind":"directory"},
    {"id":"WO-18043","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-647","unit_number":"647","title":"Battery out on the lock","description":"Battery out on the lock","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-17T16:30:39","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-18","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-17T16:30:39","note":"Battery out on the lock"}],"kind":"directory"},
    {"id":"WO-18040","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-646","unit_number":"646","title":"Tried to run washer cold, comes","description":"Tried to run washer cold, comes","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"medium","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-17T11:26:36","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-17","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-17T11:26:36","note":"Tried to run washer cold, comes"}],"kind":"directory"},
    {"id":"WO-18039","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-642","unit_number":"642","title":"Toilet appears shifted/not properly","description":"Toilet appears shifted/not properly","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-17T00:57:30","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-17","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-17T00:57:30","note":"Toilet appears shifted/not properly"}],"kind":"directory"},
    {"id":"WO-18033","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-409","unit_number":"409","title":"The new washing machine you repl","description":"The new washing machine you repl","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-15T21:48:07","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-17","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-15T21:48:07","note":"The new washing machine you repl"}],"kind":"directory"},
    {"id":"WO-18032","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-309","unit_number":"309","title":"The water heater is leaking.","description":"The water heater is leaking.","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"priority":"emergency","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-15T21:42:50","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-17","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-15T21:42:50","note":"The water heater is leaking."}],"kind":"directory"},
    {"id":"WO-18030","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-417","unit_number":"417","title":"The toilet is clogged","description":"The toilet is clogged","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-15T15:01:09","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-17","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-15T15:01:09","note":"The toilet is clogged"}],"kind":"directory"},
    {"id":"WO-18028","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-649","unit_number":"649","title":"Work order logged.","description":"Work order logged.","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-15T00:06:10","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-15T00:06:10","note":"Work order logged."}],"kind":"directory"},
    {"id":"WO-18027","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-409","unit_number":"409","title":"Washing machine doesn't work.","description":"Washing machine doesn't work.","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-14T22:28:40","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-14T22:28:40","note":"Washing machine doesn't work."}],"kind":"directory"},
    {"id":"WO-18026","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-538","unit_number":"538","title":"Toilet is clogged and I have been u","description":"Toilet is clogged and I have been u","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-14T22:00:20","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-14T22:00:20","note":"Toilet is clogged and I have been u"}],"kind":"directory"},
    {"id":"WO-18025","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-329","unit_number":"329","title":"Dishwasher still has , 4 error e","description":"Dishwasher still has , 4 error e","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-14T17:22:46","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-14T17:22:46","note":"Dishwasher still has , 4 error e"}],"kind":"directory"},
    {"id":"WO-18022","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-745","unit_number":"745","title":"The washer/dryer unit has been leav","description":"The washer/dryer unit has been leav","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-14T10:01:27","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-14T10:01:27","note":"The washer/dryer unit has been leav"}],"kind":"directory"},
    {"id":"WO-18020","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-733","unit_number":"733","title":"Washer/Dryer doesn't start","description":"Washer/Dryer doesn't start","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-13T17:39:33","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-13T17:39:33","note":"Washer/Dryer doesn't start"}],"kind":"directory"},
    {"id":"WO-18018","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-538","unit_number":"538","title":"AC states that it has disconnected","description":"AC states that it has disconnected","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-13T01:54:42","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-13T01:54:42","note":"AC states that it has disconnected"}],"kind":"directory"},
    {"id":"WO-18017","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-411","unit_number":"411","title":"There is a lot of water in the l","description":"There is a lot of water in the l","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-12T14:42:51","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-12T14:42:51","note":"There is a lot of water in the l"}],"kind":"directory"},
    {"id":"WO-18016","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-716","unit_number":"716","title":"The electronic lock on my apartment","description":"The electronic lock on my apartment","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-12T13:52:37","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-12T13:52:37","note":"The electronic lock on my apartment"}],"kind":"directory"},
    {"id":"WO-18013","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-426","unit_number":"426","title":"MY AC does not seems to be working,","description":"MY AC does not seems to be working,","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-11T17:59:51","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-11T17:59:51","note":"MY AC does not seems to be working,"}],"kind":"directory"},
    {"id":"WO-18012","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-414","unit_number":"414","title":"The battery in my door lock appears","description":"The battery in my door lock appears","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-11T15:33:00","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-12","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-11T15:33:00","note":"The battery in my door lock appears"}],"kind":"directory"},
    {"id":"WO-18009","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-721","unit_number":"721","title":"The control panel of AC is displayi","description":"The control panel of AC is displayi","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-10T19:10:39","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-12","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-10T19:10:39","note":"The control panel of AC is displayi"}],"kind":"directory"},
    {"id":"WO-18008","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-550","unit_number":"550","title":"The master bedroom ceiling fan and","description":"The master bedroom ceiling fan and","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-10T14:27:57","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-17","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-10T14:27:57","note":"The master bedroom ceiling fan and"}],"kind":"directory"},
    {"id":"WO-18007","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-710","unit_number":"710","title":"Fridge collecting water in the b","description":"Fridge collecting water in the b","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"medium","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-10T12:29:07","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-11","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-10T12:29:07","note":"Fridge collecting water in the b"}],"kind":"directory"},
    {"id":"WO-18006","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-509","unit_number":"509","title":"Dryer does not work","description":"Dryer does not work","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"low","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-10T09:53:30","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-10","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-10T09:53:30","note":"Dryer does not work"}],"kind":"directory"},
    {"id":"WO-18005","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-322","unit_number":"322","title":"Fridge doesn't seem to work at a","description":"Fridge doesn't seem to work at a","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-10T09:04:27","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-10","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-10T09:04:27","note":"Fridge doesn't seem to work at a"}],"kind":"directory"},
    {"id":"WO-18003","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-322","unit_number":"322","title":"Refrigerator doesn't seem to get","description":"Refrigerator doesn't seem to get","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-10T00:22:23","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-10","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-10T00:22:23","note":"Refrigerator doesn't seem to get"}],"kind":"directory"},
    {"id":"WO-17999","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-236","unit_number":"236","title":"Washer displaying error","description":"Washer displaying error","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-09T09:10:20","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-10","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-09T09:10:20","note":"Washer displaying error"}],"kind":"directory"},
    {"id":"WO-17997","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-419","unit_number":"419","title":"I just moved in, but noticed the","description":"I just moved in, but noticed the","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-08T11:49:45","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-08","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-08T11:49:45","note":"I just moved in, but noticed the"}],"kind":"directory"},
    {"id":"WO-17991","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-721","unit_number":"721","title":"The toilet paper holder in the bath","description":"The toilet paper holder in the bath","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-06T22:16:38","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-08","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-06T22:16:38","note":"The toilet paper holder in the bath"}],"kind":"directory"},
    {"id":"WO-17988","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-645","unit_number":"645","title":"My lock has run out of battery. It","description":"My lock has run out of battery. It","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-06T14:25:48","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-08","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-06T14:25:48","note":"My lock has run out of battery. It"}],"kind":"directory"},
    {"id":"WO-17986","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-747","unit_number":"747","title":"Toilet flush trigger snapped and","description":"Toilet flush trigger snapped and","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-05T11:34:22","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-08","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-05T11:34:22","note":"Toilet flush trigger snapped and"}],"kind":"directory"},
    {"id":"WO-17984","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-231","unit_number":"231","title":"Refrigerator not staying cool. F","description":"Refrigerator not staying cool. F","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-05T07:22:04","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-05","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-05T07:22:04","note":"Refrigerator not staying cool. F"}],"kind":"directory"},
    {"id":"WO-17983","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-217","unit_number":"217","title":"Toilet is clogged","description":"Toilet is clogged","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-05T06:42:25","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-05","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-05T06:42:25","note":"Toilet is clogged"}],"kind":"directory"},
    {"id":"WO-17982","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-236","unit_number":"236","title":"Water is coming up through the b","description":"Water is coming up through the b","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-04T20:46:41","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-05","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-04T20:46:41","note":"Water is coming up through the b"}],"kind":"directory"},
    {"id":"WO-17981","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-236","unit_number":"236","title":"Fire alarm battery needs to be c","description":"Fire alarm battery needs to be c","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"low","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-04T20:45:05","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-05","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-04T20:45:05","note":"Fire alarm battery needs to be c"}],"kind":"directory"},
    {"id":"WO-17977","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-718","unit_number":"718","title":"Change door pin","description":"Change door pin","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"low","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-04T11:07:21","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-04","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-04T11:07:21","note":"Change door pin"}],"kind":"directory"},
    {"id":"WO-17976","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-406","unit_number":"406","title":"Hi, the garbage disposal (InSinkEra","description":"Hi, the garbage disposal (InSinkEra","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-03T21:50:38","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-04","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-03T21:50:38","note":"Hi, the garbage disposal (InSinkEra"}],"kind":"directory"},
    {"id":"WO-17975","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-629","unit_number":"629","title":"Work order logged.","description":"Work order logged.","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"emergency_type":"active_leak","priority":"emergency","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-03T21:02:11","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-04","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-03T21:02:11","note":"Work order logged."}],"kind":"directory"},
    {"id":"WO-17973","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-718","unit_number":"718","title":"Ice machine stopped working","description":"Ice machine stopped working","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"low","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-03T12:37:58","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-03","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-03T12:37:58","note":"Ice machine stopped working"}],"kind":"directory"},
    {"id":"WO-17972","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-448","unit_number":"448","title":"My fridge does not cool properly an","description":"My fridge does not cool properly an","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-02T20:40:29","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-03","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-02T20:40:29","note":"My fridge does not cool properly an"}],"kind":"directory"},
    {"id":"WO-17971","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-448","unit_number":"448","title":"Kitchen faucet head falls of someti","description":"Kitchen faucet head falls of someti","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"low","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-02T20:39:36","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-03","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-02T20:39:36","note":"Kitchen faucet head falls of someti"}],"kind":"directory"},
    {"id":"WO-17970","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-448","unit_number":"448","title":"The toilet seat needs fixing","description":"The toilet seat needs fixing","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"low","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-02T20:38:28","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-03","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-02T20:38:28","note":"The toilet seat needs fixing"}],"kind":"directory"},
    {"id":"WO-17969","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-510","unit_number":"510","title":"Kitchen sink drain pipes (see attac","description":"Kitchen sink drain pipes (see attac","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-02T14:52:32","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-03","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-02T14:52:32","note":"Kitchen sink drain pipes (see attac"}],"kind":"directory"},
    {"id":"WO-17965","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-520","unit_number":"520","title":"The lower part of the fridge is not","description":"The lower part of the fridge is not","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"priority":"emergency","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-01T18:04:09","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-02","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-01T18:04:09","note":"The lower part of the fridge is not"}],"kind":"directory"},
    {"id":"WO-17964","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-613","unit_number":"613","title":"Toilet clogged","description":"Toilet clogged","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"emergency_type":"active_leak","priority":"emergency","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-01T16:38:21","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-02","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-01T16:38:21","note":"Toilet clogged"}],"kind":"directory"},
    {"id":"WO-17962","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-302","unit_number":"302","title":"Battery almost dead","description":"Battery almost dead","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-01T15:42:34","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-01T15:42:34","note":"Battery almost dead"}],"kind":"directory"},
    {"id":"WO-17961","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-321","unit_number":"321","title":"bathroom sink is still leaking but","description":"bathroom sink is still leaking but","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-01T15:30:41","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-01T15:30:41","note":"bathroom sink is still leaking but"}],"kind":"directory"},
    {"id":"WO-17960","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-315","unit_number":"315","title":"(1) Light in kitchen region sometim","description":"(1) Light in kitchen region sometim","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-01T15:08:09","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-02","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-01T15:08:09","note":"(1) Light in kitchen region sometim"}],"kind":"directory"},
    {"id":"WO-17956","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-207","unit_number":"207","title":"Hot water only available for 5 min","description":"Hot water only available for 5 min","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"priority":"emergency","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-01T09:47:10","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-02","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-01T09:47:10","note":"Hot water only available for 5 min"}],"kind":"directory"},
    {"id":"WO-17954","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-346","unit_number":"346","title":"1. Refrigerator is not cold, and Fr","description":"1. Refrigerator is not cold, and Fr","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-31T21:52:50","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-31T21:52:50","note":"1. Refrigerator is not cold, and Fr"}],"kind":"directory"},
    {"id":"WO-17953","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-340","unit_number":"340","title":"A small piece of wall peels off","description":"A small piece of wall peels off","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-31T17:45:19","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-02","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-31T17:45:19","note":"A small piece of wall peels off"}],"kind":"directory"},
    {"id":"WO-17952","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-233","unit_number":"233","title":"the fridge is not cold. (the cabine","description":"the fridge is not cold. (the cabine","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-31T17:39:13","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-02","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-31T17:39:13","note":"the fridge is not cold. (the cabine"}],"kind":"directory"},
    {"id":"WO-17951","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-217","unit_number":"217","title":"Washer is leaking a lot of water st","description":"Washer is leaking a lot of water st","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-31T17:02:50","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-31T17:02:50","note":"Washer is leaking a lot of water st"}],"kind":"directory"},
    {"id":"WO-17950","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-321","unit_number":"321","title":"My bathroom sink is leaking underne","description":"My bathroom sink is leaking underne","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-31T14:22:39","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-31T14:22:39","note":"My bathroom sink is leaking underne"}],"kind":"directory"},
    {"id":"WO-17949","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-321","unit_number":"321","title":"My battery is dead for my door lock","description":"My battery is dead for my door lock","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-31T14:20:28","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-31T14:20:28","note":"My battery is dead for my door lock"}],"kind":"directory"},
    {"id":"WO-17943","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-550","unit_number":"550","title":"Water leaking from master bedroom c","description":"Water leaking from master bedroom c","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-29T22:20:48","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-29T22:20:48","note":"Water leaking from master bedroom c"}],"kind":"directory"},
    {"id":"WO-17941","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-207","unit_number":"207","title":"Leaking Water Boiler","description":"Leaking Water Boiler","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"medium","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-29T11:38:32","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-29","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-29T11:38:32","note":"Leaking Water Boiler"}],"kind":"directory"},
    {"id":"WO-17940","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-750","unit_number":"750","title":"shared bathroom toilet won\u2019t go dow","description":"shared bathroom toilet won\u2019t go dow","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-29T10:00:55","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-29","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-29T10:00:55","note":"shared bathroom toilet won\u2019t go dow"}],"kind":"directory"},
    {"id":"WO-17938","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-513","unit_number":"513","title":"the battery of lock is running low","description":"the battery of lock is running low","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-29T01:07:48","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-29","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-29T01:07:48","note":"the battery of lock is running low"}],"kind":"directory"},
    {"id":"WO-17937","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-337","unit_number":"337","title":"AC air not coming out","description":"AC air not coming out","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-28T23:48:27","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-29","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-28T23:48:27","note":"AC air not coming out"}],"kind":"directory"},
    {"id":"WO-17933","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-427","unit_number":"427","title":"HVAC in left bedroom (with detac","description":"HVAC in left bedroom (with detac","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"medium","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-28T12:39:20","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-29","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-28T12:39:20","note":"HVAC in left bedroom (with detac"}],"kind":"directory"},
    {"id":"WO-17930","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-449","unit_number":"449","title":"My dishwasher door is a bit hard to","description":"My dishwasher door is a bit hard to","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-28T10:51:42","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-29","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-28T10:51:42","note":"My dishwasher door is a bit hard to"}],"kind":"directory"},
    {"id":"WO-17929","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-449","unit_number":"449","title":"I\u2019m requesting my shower floor to","description":"I\u2019m requesting my shower floor to","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-28T10:49:41","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-29","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-28T10:49:41","note":"I\u2019m requesting my shower floor to"}],"kind":"directory"},
    {"id":"WO-17927","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-427","unit_number":"427","title":"Toilet flush button on detached","description":"Toilet flush button on detached","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"medium","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-28T08:32:39","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-28","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-28T08:32:39","note":"Toilet flush button on detached"}],"kind":"directory"},
    {"id":"WO-17926","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-720","unit_number":"720","title":"our microwave seems to be malfun","description":"our microwave seems to be malfun","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-27T20:49:36","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-28","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-27T20:49:36","note":"our microwave seems to be malfun"}],"kind":"directory"},
    {"id":"WO-17925","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-739","unit_number":"739","title":"\"low battery\" indices are active","description":"\"low battery\" indices are active","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"low","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-27T18:42:32","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-28","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-27T18:42:32","note":"\"low battery\" indices are active"}],"kind":"directory"},
    {"id":"WO-17924","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-531","unit_number":"531","title":"AC is still not working although th","description":"AC is still not working although th","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-27T18:16:00","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-28","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-27T18:16:00","note":"AC is still not working although th"}],"kind":"directory"},
    {"id":"WO-17923","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-526","unit_number":"526","title":"AC not working, the screen was fixe","description":"AC not working, the screen was fixe","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-27T17:44:26","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-28","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-27T17:44:26","note":"AC not working, the screen was fixe"}],"kind":"directory"},
    {"id":"WO-17915","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-531","unit_number":"531","title":"AC control is dead and it is very h","description":"AC control is dead and it is very h","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-27T13:22:57","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-27","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-27T13:22:57","note":"AC control is dead and it is very h"}],"kind":"directory"},
    {"id":"WO-17913","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-526","unit_number":"526","title":"AC control panel went blank. Screen","description":"AC control panel went blank. Screen","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-27T08:05:24","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-27","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-27T08:05:24","note":"AC control panel went blank. Screen"}],"kind":"directory"},
    {"id":"WO-17912","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-629","unit_number":"629","title":"Maintenance Request - Electrical","description":"Maintenance Request - Electrical","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-26T19:39:34","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-27","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-26T19:39:34","note":"Maintenance Request - Electrical"}],"kind":"directory"},
    {"id":"WO-17911","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-625","unit_number":"625","title":"Work order logged.","description":"Work order logged.","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-26T16:15:15","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-27","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-26T16:15:15","note":"Work order logged."}],"kind":"directory"},
    {"id":"WO-17908","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-643","unit_number":"643","title":"Water is dripping from the openi","description":"Water is dripping from the openi","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-26T12:47:20","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-27","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-26T12:47:20","note":"Water is dripping from the openi"}],"kind":"directory"},
    {"id":"WO-17907","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-709","unit_number":"709","title":"Fridge is leaking","description":"Fridge is leaking","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-26T10:18:17","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-26T10:18:17","note":"Fridge is leaking"}],"kind":"directory"},
    {"id":"WO-17906","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-709","unit_number":"709","title":"Batteries in door lock are dead","description":"Batteries in door lock are dead","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-26T10:15:56","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-26T10:15:56","note":"Batteries in door lock are dead"}],"kind":"directory"},
    {"id":"WO-17904","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-217","unit_number":"217","title":"The washer/dryer is leaking during","description":"The washer/dryer is leaking during","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-25T19:03:57","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-25T19:03:57","note":"The washer/dryer is leaking during"}],"kind":"directory"},
    {"id":"WO-17902","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-410","unit_number":"410","title":"Dear maintenance team, Unfortunatel","description":"Dear maintenance team, Unfortunatel","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"emergency_type":"lockout","priority":"emergency","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-25T12:25:45","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-25T12:25:45","note":"Dear maintenance team, Unfortunatel"}],"kind":"directory"},
    {"id":"WO-17901","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-227","unit_number":"227","title":"The toilet of one bedroom is partia","description":"The toilet of one bedroom is partia","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-25T11:52:02","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-25T11:52:02","note":"The toilet of one bedroom is partia"}],"kind":"directory"},
    {"id":"WO-17900","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-227","unit_number":"227","title":"My kitchen sink is draining much mo","description":"My kitchen sink is draining much mo","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-25T11:48:41","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-25T11:48:41","note":"My kitchen sink is draining much mo"}],"kind":"directory"},
    {"id":"WO-17899","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-417","unit_number":"417","title":"Adjust TV position","description":"Adjust TV position","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-25T11:28:59","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-25T11:28:59","note":"Adjust TV position"}],"kind":"directory"},
    {"id":"WO-17898","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-439","unit_number":"439","title":"Lock at the front door says low bat","description":"Lock at the front door says low bat","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-24T18:04:07","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-24T18:04:07","note":"Lock at the front door says low bat"}],"kind":"directory"},
    {"id":"WO-17897","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-613","unit_number":"613","title":"Water is leaking from freezer to fr","description":"Water is leaking from freezer to fr","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-24T14:05:23","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-24T14:05:23","note":"Water is leaking from freezer to fr"}],"kind":"directory"},
    {"id":"WO-17895","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-625","unit_number":"625","title":"Hello,  Yesterday a maintenance wor","description":"Hello,  Yesterday a maintenance wor","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"emergency_type":"active_leak","priority":"emergency","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-24T11:01:09","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-24T11:01:09","note":"Hello,  Yesterday a maintenance wor"}],"kind":"directory"},
    {"id":"WO-17894","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-211","unit_number":"211","title":"My refrigerator/ freezer stopped","description":"My refrigerator/ freezer stopped","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-23T21:17:52","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-23T21:17:52","note":"My refrigerator/ freezer stopped"}],"kind":"directory"},
    {"id":"WO-17892","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-722","unit_number":"722","title":"Washing machine dryer giving iss","description":"Washing machine dryer giving iss","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-23T09:50:48","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-23T09:50:48","note":"Washing machine dryer giving iss"}],"kind":"directory"},
    {"id":"WO-17891","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-429","unit_number":"429","title":"It seems that toilet is clogged.","description":"It seems that toilet is clogged.","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"emergency_type":"active_leak","priority":"emergency","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-23T09:09:57","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-23T09:09:57","note":"It seems that toilet is clogged."}],"kind":"directory"},
    {"id":"WO-17890","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-430","unit_number":"430","title":"Food waste disposer is not working","description":"Food waste disposer is not working","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"priority":"emergency","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-22T14:32:48","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-22","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-22T14:32:48","note":"Food waste disposer is not working"}],"kind":"directory"},
    {"id":"WO-17889","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-613","unit_number":"613","title":"Fridge is not working. It''s like r","description":"Fridge is not working. It''s like r","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-22T00:13:37","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-22","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-22T00:13:37","note":"Fridge is not working. It''s like r"}],"kind":"directory"},
    {"id":"WO-17888","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-544","unit_number":"544","title":"There is no toner in the printer on","description":"There is no toner in the printer on","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"priority":"emergency","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-21T15:02:41","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-26","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-21T15:02:41","note":"There is no toner in the printer on"}],"kind":"directory"},
    {"id":"WO-17887","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-632","unit_number":"632","title":"Entryway light has gone out / wo","description":"Entryway light has gone out / wo","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"medium","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-21T08:59:01","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-21","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-21T08:59:01","note":"Entryway light has gone out / wo"}],"kind":"directory"},
    {"id":"WO-17884","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-411","unit_number":"411","title":"No worries, I have solved the pr","description":"No worries, I have solved the pr","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-21T06:18:03","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-21","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-21T06:18:03","note":"No worries, I have solved the pr"}],"kind":"directory"},
    {"id":"WO-17883","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-411","unit_number":"411","title":"1. The window cannot be opened.","description":"1. The window cannot be opened.","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-21T05:22:31","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-21","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-21T05:22:31","note":"1. The window cannot be opened."}],"kind":"directory"},
    {"id":"WO-17880","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-550","unit_number":"550","title":"Water leaking from master bedroom c","description":"Water leaking from master bedroom c","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"emergency_type":"active_leak","priority":"emergency","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-20T10:43:01","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-20","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-20T10:43:01","note":"Water leaking from master bedroom c"}],"kind":"directory"},
    {"id":"WO-17879","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-512","unit_number":"512","title":"the Dishwasher door doesn't seem","description":"the Dishwasher door doesn't seem","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-20T10:40:15","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-20","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-20T10:40:15","note":"the Dishwasher door doesn't seem"}],"kind":"directory"},
    {"id":"WO-17878","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-314","unit_number":"314","title":"Fringe and freezer not working","description":"Fringe and freezer not working","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"medium","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-20T09:33:28","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-20","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-20T09:33:28","note":"Fringe and freezer not working"}],"kind":"directory"},
    {"id":"WO-17877","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-405","unit_number":"405","title":"Hi,   The HVAC/AC system appears","description":"Hi,   The HVAC/AC system appears","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-20T08:40:58","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-20","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-20T08:40:58","note":"Hi,   The HVAC/AC system appears"}],"kind":"directory"},
    {"id":"WO-17875","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-411","unit_number":"411","title":"Cool function does not work","description":"Cool function does not work","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-19T20:46:19","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-20","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-19T20:46:19","note":"Cool function does not work"}],"kind":"directory"},
    {"id":"WO-17873","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-432","unit_number":"432","title":"Hi, I wanted to follow up again","description":"Hi, I wanted to follow up again","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-19T12:47:53","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-19","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-19T12:47:53","note":"Hi, I wanted to follow up again"}],"kind":"directory"},
    {"id":"WO-17870","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-314","unit_number":"314","title":"Kitchen drain has a horrible smell","description":"Kitchen drain has a horrible smell","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-19T09:41:00","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-20","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-19T09:41:00","note":"Kitchen drain has a horrible smell"}],"kind":"directory"},
    {"id":"WO-17869","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-706","unit_number":"706","title":"Key pad battery dead","description":"Key pad battery dead","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-19T07:52:06","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-19","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-19T07:52:06","note":"Key pad battery dead"}],"kind":"directory"},
    {"id":"WO-17861","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-432","unit_number":"432","title":"The AC is blowing air but it is","description":"The AC is blowing air but it is","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-18T10:55:36","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-19","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-18T10:55:36","note":"The AC is blowing air but it is"}],"kind":"directory"},
    {"id":"WO-17858","property_id":"9e2bb96e-08e2-41db-81c2-91055ceb50a3","unit_id":"u-209","unit_number":"209","title":"Fridge isn't cooling properly","description":"Fridge isn't cooling properly","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-18T07:16:46","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-18","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-18T07:16:46","note":"Fridge isn't cooling properly"}],"kind":"directory"},
  ],

  /* ── Skyline Apartments (1417 N 15th St) — 20 work orders: 2 emergency, 18 directory ── */
  "skyline-1417": [
    {"id":"WO-SAS-SKY-001","property_id":"skyline-1417","unit_id":"u-tbd","unit_number":"(unit TBD)","title":"garage door / trapped - see 4/8","description":"garage door / trapped - see 4/8","status":"open","source":"sas","is_emergency":false,"field_category":"pest","unit_state":"occupied","tenant_name":"Maggie Bricker","tenant_phone":"+1 302 766 0222","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-02T22:42:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-02T22:42:14Z","note":"garage door / trapped - see 4/8"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-SKY-002","property_id":"skyline-1417","unit_id":"u-409","unit_number":"409","title":"She needs help - garage/lockout","description":"She needs help - garage/lockout","status":"open","source":"sas","is_emergency":true,"emergency_type":"lockout","field_category":"lockout","unit_state":"occupied","tenant_name":"MAGGIE BRICKER","tenant_phone":"+1 302 766 0222","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-29T13:10:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-29T13:10:18Z","note":"She needs help - garage/lockout"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-18024","property_id":"skyline-1417","unit_id":"u-1417-408","unit_number":"1417-408","title":"The garbage disposal under my kitch","description":"The garbage disposal under my kitch","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-14T15:58:56","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-17","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-14T15:58:56","note":"The garbage disposal under my kitch"}],"kind":"directory"},
    {"id":"WO-18023","property_id":"skyline-1417","unit_id":"u-1417-311","unit_number":"1417-311","title":"Bathroom sink drain stopper is not","description":"Bathroom sink drain stopper is not","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"emergency_type":"active_leak","priority":"emergency","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-14T12:30:46","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-17","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-14T12:30:46","note":"Bathroom sink drain stopper is not"}],"kind":"directory"},
    {"id":"WO-18019","property_id":"skyline-1417","unit_id":"u-1417-110","unit_number":"1417-110","title":"Fridge ins't cooling and leaking","description":"Fridge ins't cooling and leaking","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-13T12:01:56","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-17","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-13T12:01:56","note":"Fridge ins't cooling and leaking"}],"kind":"directory"},
    {"id":"WO-18002","property_id":"skyline-1417","unit_id":"u-1417-105","unit_number":"1417-105","title":"Toilet and kitchen sink are drainin","description":"Toilet and kitchen sink are drainin","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-09T21:32:06","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-09T21:32:06","note":"Toilet and kitchen sink are drainin"}],"kind":"directory"},
    {"id":"WO-17998","property_id":"skyline-1417","unit_id":"u-1417-413","unit_number":"1417-413","title":"Bathroom lights not working","description":"Bathroom lights not working","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-08T14:04:11","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-08T14:04:11","note":"Bathroom lights not working"}],"kind":"directory"},
    {"id":"WO-17995","property_id":"skyline-1417","unit_id":"u-1417-404","unit_number":"1417-404","title":"Hello,I would like to request maint","description":"Hello,I would like to request maint","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"emergency_type":"active_leak","priority":"emergency","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-08T03:19:24","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-08","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-08T03:19:24","note":"Hello,I would like to request maint"}],"kind":"directory"},
    {"id":"WO-17993","property_id":"skyline-1417","unit_id":"u-1417-212","unit_number":"1417-212","title":"The lever that flushes the toilet i","description":"The lever that flushes the toilet i","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-07T12:55:58","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-08","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-07T12:55:58","note":"The lever that flushes the toilet i"}],"kind":"directory"},
    {"id":"WO-17985","property_id":"skyline-1417","unit_id":"u-1417-317","unit_number":"1417-317","title":"Bulb is broken.","description":"Bulb is broken.","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-05T10:57:29","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-16","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-05T10:57:29","note":"Bulb is broken."}],"kind":"directory"},
    {"id":"WO-17957","property_id":"skyline-1417","unit_id":"u-1417-204","unit_number":"1417-204","title":"The light in the living room is not","description":"The light in the living room is not","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"low","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-01T10:19:35","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-04","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-01T10:19:35","note":"The light in the living room is not"}],"kind":"directory"},
    {"id":"WO-17946","property_id":"skyline-1417","unit_id":"u-1417-412","unit_number":"1417-412","title":"The shower's leaking.","description":"The shower's leaking.","status":"open","wo_status_label":"On Hold","source":"directory","is_emergency":false,"priority":"high","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-30T12:55:35","escalation_level":1,"also_emailed":false,"responded":false,"completion_photo":null,"completion_note":null,"complete_date":null,"not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-30T12:55:35","note":"The shower's leaking."}],"kind":"directory"},
    {"id":"WO-17944","property_id":"skyline-1417","unit_id":"u-1417-412","unit_number":"1417-412","title":"It's been a month but the second","description":"It's been a month but the second","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-30T12:50:42","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-30T12:50:42","note":"It's been a month but the second"}],"kind":"directory"},
    {"id":"WO-17921","property_id":"skyline-1417","unit_id":"u-1417-409","unit_number":"1417-409","title":"One of the bulbs in the restroom ne","description":"One of the bulbs in the restroom ne","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-27T14:53:10","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-29","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-27T14:53:10","note":"One of the bulbs in the restroom ne"}],"kind":"directory"},
    {"id":"WO-17919","property_id":"skyline-1417","unit_id":"u-1417-211","unit_number":"1417-211","title":"I noticed what looks like a poss","description":"I noticed what looks like a poss","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-27T13:42:56","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-27T13:42:56","note":"I noticed what looks like a poss"}],"kind":"directory"},
    {"id":"WO-17917","property_id":"skyline-1417","unit_id":"u-1417-211","unit_number":"1417-211","title":"one of the light bulbs in my roo","description":"one of the light bulbs in my roo","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-27T13:40:11","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-29","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-27T13:40:11","note":"one of the light bulbs in my roo"}],"kind":"directory"},
    {"id":"WO-17910","property_id":"skyline-1417","unit_id":"u-1417-415","unit_number":"1417-415","title":"The 415 mailbox has a remnant st","description":"The 415 mailbox has a remnant st","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-26T15:39:32","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-28","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-26T15:39:32","note":"The 415 mailbox has a remnant st"}],"kind":"directory"},
    {"id":"WO-17896","property_id":"skyline-1417","unit_id":"u-1417-213","unit_number":"1417-213","title":"A/C has not worked since the whole","description":"A/C has not worked since the whole","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-24T13:35:56","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-27","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-24T13:35:56","note":"A/C has not worked since the whole"}],"kind":"directory"},
    {"id":"WO-17886","property_id":"skyline-1417","unit_id":"u-1417-109","unit_number":"1417-109","title":"Fridge not cold. Freezer is blocked","description":"Fridge not cold. Freezer is blocked","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-21T08:25:34","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-21","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-21T08:25:34","note":"Fridge not cold. Freezer is blocked"}],"kind":"directory"},
    {"id":"WO-17868","property_id":"skyline-1417","unit_id":"u-1417-311","unit_number":"1417-311","title":"The air conditioner is not cooling.","description":"The air conditioner is not cooling.","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"priority":"emergency","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-18T23:32:27","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-19","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-18T23:32:27","note":"The air conditioner is not cooling."}],"kind":"directory"},
  ],

  /* ── Greenery Apartments (1325 N 15th St) — 18 work orders: 8 emergency, 10 directory ── */
  "greenery-1325": [
    {"id":"WO-SAS-GRE-001","property_id":"greenery-1325","unit_id":"u-410","unit_number":"410","title":"Maintenance request (details on callback)","description":"Details to be confirmed on callback.","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Bianca Colon","tenant_phone":"+1 347 634 4364","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-03-30T02:07:00","escalation_level":1,"also_emailed":false,"responded":false,"calls":[{"at":"2026-03-30T02:07:15Z","note":"Details on callback."},{"at":"2026-04-24T22:18:49Z","note":"Details on callback."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-GRE-002","property_id":"greenery-1325","unit_id":"u-109","unit_number":"109","title":"Maintenance request (details on callback)","description":"Details to be confirmed on callback.","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Glory Daniel","tenant_phone":"+1 267 455 9279","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-06T23:34:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-06T23:34:30Z","note":"Details on callback."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-GRE-003","property_id":"greenery-1325","unit_id":"u-tbd","unit_number":"(unit TBD)","title":"Caller states","description":"Caller states","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Bianca Colon","tenant_phone":"+1 347 634 4364","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-23T19:21:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-23T19:21:45Z","note":"Caller states"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-GRE-004","property_id":"greenery-1325","unit_id":"u-310","unit_number":"310","title":"Maintenance request (details on callback)","description":"Details to be confirmed on callback.","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Youmna Ayoun","tenant_phone":"+1 857 340 7318","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-23T19:55:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-23T19:55:25Z","note":"Details on callback."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-GRE-005","property_id":"greenery-1325","unit_id":"u-301","unit_number":"301","title":"One of the bedrooms - locked out","description":"One of the bedrooms - locked out","status":"open","source":"sas","is_emergency":true,"emergency_type":"lockout","field_category":"lockout","unit_state":"occupied","tenant_name":"Skylar Bell","tenant_phone":"+1 240 681 4200","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-02T01:32:00","escalation_level":1,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-02T01:32:13Z","note":"One of the bedrooms - locked out"},{"at":"2026-06-18T03:08:04Z","note":"She is locked out and the ER lockout number is not working."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-GRE-006","property_id":"greenery-1325","unit_id":"u-tbd","unit_number":"(unit TBD)","title":"She's locked out of the bedroom","description":"She's locked out of the bedroom","status":"open","source":"sas","is_emergency":true,"emergency_type":"lockout","field_category":"lockout","unit_state":"occupied","tenant_name":"Skylar Bell","tenant_phone":"+1 240 681 4200","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-02T02:06:00","escalation_level":1,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-02T02:06:18Z","note":"She's locked out of the bedroom"},{"at":"2026-06-18T03:20:46Z","note":"is locked out please call"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-GRE-007","property_id":"greenery-1325","unit_id":"u-tbd","unit_number":"(unit TBD)","title":"In greenery and smoke detector is beeping","description":"In greenery and smoke detector is beeping","status":"open","source":"sas","is_emergency":true,"field_category":"general","unit_state":"occupied","tenant_name":"Sean Fallon","tenant_phone":"+1 267 431 4724","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-07T22:33:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-07T22:33:15Z","note":"In greenery and smoke detector is beeping"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-GRE-008","property_id":"greenery-1325","unit_id":"u-305","unit_number":"305","title":"Caller states","description":"Caller states","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Hojin Joung","tenant_phone":"+1 267 228 2312","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-18T15:11:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-18T15:11:58Z","note":"Caller states"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-17994","property_id":"greenery-1325","unit_id":"u-1325-114","unit_number":"1325-114","title":"6 lights need to be replaced","description":"6 lights need to be replaced","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"low","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-07T18:00:48","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-08","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-07T18:00:48","note":"6 lights need to be replaced"}],"kind":"directory"},
    {"id":"WO-17990","property_id":"greenery-1325","unit_id":"u-1325-310","unit_number":"1325-310","title":"Light bulbs in kitchen need repl","description":"Light bulbs in kitchen need repl","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"low","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-06T20:31:50","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-08","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-06T20:31:50","note":"Light bulbs in kitchen need repl"}],"kind":"directory"},
    {"id":"WO-17963","property_id":"greenery-1325","unit_id":"u-1325-401","unit_number":"1325-401","title":"Dishwasher broke and leaking and","description":"Dishwasher broke and leaking and","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-01T16:22:29","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-03","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-01T16:22:29","note":"Dishwasher broke and leaking and"}],"kind":"directory"},
    {"id":"WO-17948","property_id":"greenery-1325","unit_id":"u-1325-105","unit_number":"1325-105","title":"I need the filters cleaned ASAP.","description":"I need the filters cleaned ASAP.","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-31T14:41:00","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-31T14:41:00","note":"I need the filters cleaned ASAP."}],"kind":"directory"},
    {"id":"WO-17947","property_id":"greenery-1325","unit_id":"u-1325-216","unit_number":"1325-216","title":"Found mouse in second floor trash r","description":"Found mouse in second floor trash r","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-31T12:51:23","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-03","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-31T12:51:23","note":"Found mouse in second floor trash r"}],"kind":"directory"},
    {"id":"WO-17936","property_id":"greenery-1325","unit_id":"u-1325-313","unit_number":"1325-313","title":"Light bulb is out in the kitchen","description":"Light bulb is out in the kitchen","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"low","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-28T22:19:43","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-29","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-28T22:19:43","note":"Light bulb is out in the kitchen"}],"kind":"directory"},
    {"id":"WO-17934","property_id":"greenery-1325","unit_id":"u-1325-308","unit_number":"1325-308","title":"Hello. My freezer has been making s","description":"Hello. My freezer has been making s","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-28T17:58:57","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-28T17:58:57","note":"Hello. My freezer has been making s"}],"kind":"directory"},
    {"id":"WO-17928","property_id":"greenery-1325","unit_id":"u-1325-412","unit_number":"1325-412","title":"Hi ! The smoke alarm in the living","description":"Hi ! The smoke alarm in the living","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-28T10:05:12","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-28","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-28T10:05:12","note":"Hi ! The smoke alarm in the living"}],"kind":"directory"},
    {"id":"WO-17876","property_id":"greenery-1325","unit_id":"u-1325-114","unit_number":"1325-114","title":"bedroom electricity went out whe","description":"bedroom electricity went out whe","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-20T03:06:25","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-20","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-20T03:06:25","note":"bedroom electricity went out whe"}],"kind":"directory"},
    {"id":"WO-17862","property_id":"greenery-1325","unit_id":"u-1325-403","unit_number":"1325-403","title":"hi, the bulbs in the bathroom ha","description":"hi, the bulbs in the bathroom ha","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-18T14:49:52","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-21","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-18T14:49:52","note":"hi, the bulbs in the bathroom ha"}],"kind":"directory"},
  ],

  /* ── 1850 (1850 N 18th St) — 15 work orders: 11 emergency, 4 directory ── */
  "berks-1850": [
    {"id":"WO-SAS-BER-001","property_id":"berks-1850","unit_id":"u-tbd","unit_number":"(unit TBD)","title":"Caller","description":"Caller","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"David Weissberg","tenant_phone":"+1 516 984 7138","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-06T20:25:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-06T20:25:19Z","note":"Caller"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-BER-002","property_id":"berks-1850","unit_id":"u-tbd","unit_number":"(unit TBD)","title":"Maintenance request (details on callback)","description":"Details to be confirmed on callback.","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Vyil Powell","tenant_phone":"+1 201 852 3915","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-24T01:25:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-24T01:25:59Z","note":"Details on callback."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-BER-003","property_id":"berks-1850","unit_id":"u-101","unit_number":"101","title":"Maintenance request (details on callback)","description":"Details to be confirmed on callback.","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Zyil Powell","tenant_phone":"+1 201 852 3915","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-24T02:38:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-24T02:38:01Z","note":"Details on callback."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-BER-004","property_id":"berks-1850","unit_id":"u-101","unit_number":"101","title":"He is locked out","description":"He is locked out","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Zyil Powell","tenant_phone":"+1 201 852 3915","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-17T23:16:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-17T23:16:19Z","note":"He is locked out"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-BER-005","property_id":"berks-1850","unit_id":"u-101","unit_number":"101","title":"No A/C inside","description":"No A/C inside","status":"open","source":"sas","is_emergency":false,"field_category":"hvac","unit_state":"occupied","tenant_name":"Zyil Powell","tenant_phone":"+1 201 852 3915","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-18T16:01:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-18T16:01:14Z","note":"No A/C inside"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-BER-006","property_id":"berks-1850","unit_id":"u-403-a","unit_number":"403-A","title":"The caller","description":"The caller","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Demonte Green","tenant_phone":"+1 972 946 6630","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-23T14:36:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-23T14:36:08Z","note":"The caller"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-BER-007","property_id":"berks-1850","unit_id":"u-403a","unit_number":"403A","title":"he is hot / no AC?","description":"he is hot / no AC?","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Demonte Greene","tenant_phone":"+1 972 946 6630","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-23T14:59:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-23T14:59:48Z","note":"he is hot / no AC?"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-BER-008","property_id":"berks-1850","unit_id":"u-403a","unit_number":"403A","title":"Still waiting on someone","description":"Still waiting on someone","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Demonte Greene","tenant_phone":"+1 972 946 6630","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-23T15:07:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-23T15:07:27Z","note":"Still waiting on someone"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-BER-009","property_id":"berks-1850","unit_id":"u-tbd","unit_number":"(unit TBD)","title":"The caller is calling for the 2nd time follow-up","description":"The caller is calling for the 2nd time follow-up","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Demonet Greene","tenant_phone":"+1 972 946 6630","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-23T15:24:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-23T15:24:06Z","note":"The caller is calling for the 2nd time follow-up"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-BER-010","property_id":"berks-1850","unit_id":"u-tbd","unit_number":"(unit TBD)","title":"lock out","description":"lock out","status":"open","source":"sas","is_emergency":true,"emergency_type":"lockout","field_category":"lockout","unit_state":"occupied","tenant_name":"Donte Poller","tenant_phone":"+1 412 435 7370","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-29T11:10:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-29T11:10:48Z","note":"lock out"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-BER-011","property_id":"berks-1850","unit_id":"u-403","unit_number":"403","title":"Caller states","description":"Caller states","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Josiah Jackson","tenant_phone":"+1 513 773 8407","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-30T21:43:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-30T21:43:50Z","note":"Caller states"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-17958","property_id":"berks-1850","unit_id":"u-1850-301","unit_number":"1850-301","title":"The door to one of the bedrooms was","description":"The door to one of the bedrooms was","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-01T10:22:01","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-01T10:22:01","note":"The door to one of the bedrooms was"}],"kind":"directory"},
    {"id":"WO-17939","property_id":"berks-1850","unit_id":"u-1850-405","unit_number":"1850-405","title":"Ive been locked out of my apartment","description":"Ive been locked out of my apartment","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"emergency_type":"lockout","priority":"emergency","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-29T04:06:08","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-29","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-29T04:06:08","note":"Ive been locked out of my apartment"}],"kind":"directory"},
    {"id":"WO-17872","property_id":"berks-1850","unit_id":"u-1850-401","unit_number":"1850-401","title":"Sink drain is not working properly,","description":"Sink drain is not working properly,","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-19T11:33:34","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-20","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-19T11:33:34","note":"Sink drain is not working properly,"}],"kind":"directory"},
    {"id":"WO-17865","property_id":"berks-1850","unit_id":"u-1850-401","unit_number":"1850-401","title":"The air vent in the bedroom on t","description":"The air vent in the bedroom on t","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-18T16:50:11","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-20","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-18T16:50:11","note":"The air vent in the bedroom on t"}],"kind":"directory"},
  ],

  /* ── Temple Nest (Temple Nest portfolio) — 29 work orders: 10 emergency, 19 directory ── */
  "temple-nest": [
    {"id":"WO-SAS-TEM-001","property_id":"temple-nest","unit_id":"u-tbd","unit_number":"(unit TBD)","title":"locked out / follow-up","description":"locked out / follow-up","status":"open","source":"sas","is_emergency":true,"emergency_type":"lockout","field_category":"lockout","unit_state":"occupied","tenant_name":"Kankay Canara","tenant_phone":"+1 240 517 3369","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-18T01:02:00","escalation_level":1,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-18T01:02:37Z","note":"locked out / follow-up"},{"at":"2026-05-30T13:53:12Z","note":"Caller states that she is locked out"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-TEM-002","property_id":"temple-nest","unit_id":"u-tbd","unit_number":"(unit TBD)","title":"there is an issue","description":"there is an issue","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Sarah Keagy","tenant_phone":"+1 215 960 5121","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-24T01:46:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-24T01:46:25Z","note":"there is an issue"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-TEM-003","property_id":"temple-nest","unit_id":"u-1","unit_number":"1","title":"Maintenance request (details on callback)","description":"Details to be confirmed on callback.","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Mingu Kim","tenant_phone":"+1 267 242 2315","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-25T22:01:00","escalation_level":1,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-25T22:01:03Z","note":"Details on callback."},{"at":"2026-05-04T22:28:19Z","note":"Caller"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-TEM-004","property_id":"temple-nest","unit_id":"u-2ndfloor","unit_number":"2ND FLOOR","title":"Maintenance request (details on callback)","description":"Details to be confirmed on callback.","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Sana White","tenant_phone":"+1 267 300 7938","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-26T14:51:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-26T14:51:29Z","note":"Details on callback."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-TEM-005","property_id":"temple-nest","unit_id":"u-1","unit_number":"1","title":"Wants to confirm if we power follow-up","description":"Wants to confirm if we power follow-up","status":"open","source":"sas","is_emergency":true,"field_category":"electrical","unit_state":"occupied","tenant_name":"Kin","tenant_phone":"+1 267 242 2315","tenant_waiting":true,"needs_pm_review":true,"created_at":"2026-05-10T23:42:00","escalation_level":2,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-10T23:42:26Z","note":"Wants to confirm if we power follow-up"},{"at":"2026-05-10T23:47:20Z","note":"He is calling re: power"},{"at":"2026-05-28T22:06:52Z","note":"The breaker tripped / no power"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-TEM-006","property_id":"temple-nest","unit_id":"u-tbd","unit_number":"(unit TBD)","title":"Caller states that he has no power in unit","description":"Caller states that he has no power in unit","status":"open","source":"sas","is_emergency":true,"field_category":"electrical","unit_state":"occupied","tenant_name":"Mingu Kim","tenant_phone":"+1 267 242 2315","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-28T23:20:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-28T23:20:17Z","note":"Caller states that he has no power in unit"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-TEM-007","property_id":"temple-nest","unit_id":"u-1","unit_number":"1","title":"locked out","description":"locked out","status":"open","source":"sas","is_emergency":true,"emergency_type":"lockout","field_category":"lockout","unit_state":"occupied","tenant_name":"Kankay Camara","tenant_phone":"+1 240 517 3369","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-30T11:37:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-05-30T11:37:51Z","note":"locked out"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-TEM-008","property_id":"temple-nest","unit_id":"u-2","unit_number":"2","title":"He is locked out","description":"He is locked out","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"DJ Britton","tenant_phone":"+1 908 878 1158","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-06-07T00:33:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-06-07T00:33:59Z","note":"He is locked out"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-TEM-009","property_id":"temple-nest","unit_id":"u-tbd","unit_number":"(unit TBD)","title":"I need help opening the office door.","description":"I need help opening the office door.","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Chang Wang","tenant_phone":"+1 717 422 4955","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-06-13T21:58:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-06-13T21:58:20Z","note":"I need help opening the office door."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-TEM-010","property_id":"temple-nest","unit_id":"u-basement","unit_number":"BASEMENT","title":"Maintenance request (details on callback)","description":"Details to be confirmed on callback.","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Nia Mann","tenant_phone":"+1 484 597 3337","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-06-16T00:50:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-06-16T00:50:21Z","note":"Details on callback."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-18046","property_id":"temple-nest","unit_id":"u-1510-5-1","unit_number":"1510.5-1","title":"I made a request a couple weeks abo","description":"I made a request a couple weeks abo","status":"open","wo_status_label":"On Hold","source":"web","is_emergency":false,"priority":"high","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-06-18T00:07:57","escalation_level":1,"also_emailed":false,"responded":false,"completion_photo":null,"completion_note":null,"complete_date":null,"not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-18T00:07:57","note":"I made a request a couple weeks abo"}],"kind":"directory"},
    {"id":"WO-18044","property_id":"temple-nest","unit_id":"u-1508-1","unit_number":"1508-1","title":"Pause after filling it with water w","description":"Pause after filling it with water w","status":"open","wo_status_label":"On Hold","source":"web","is_emergency":true,"priority":"emergency","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":true,"needs_pm_review":true,"created_at":"2026-06-17T16:59:17","escalation_level":2,"also_emailed":false,"responded":false,"completion_photo":null,"completion_note":null,"complete_date":null,"not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-17T16:59:17","note":"Pause after filling it with water w"}],"kind":"directory"},
    {"id":"WO-18031","property_id":"temple-nest","unit_id":"u-1500c-2","unit_number":"1500C-2","title":"Garbage Disposal Broken","description":"Garbage Disposal Broken","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-15T18:29:32","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-17","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-15T18:29:32","note":"Garbage Disposal Broken"}],"kind":"directory"},
    {"id":"WO-18004","property_id":"temple-nest","unit_id":"u-1500b-1","unit_number":"1500B-1","title":"The garbage disposal stopped wor","description":"The garbage disposal stopped wor","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-10T04:50:54","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-15","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-10T04:50:54","note":"The garbage disposal stopped wor"}],"kind":"directory"},
    {"id":"WO-17996","property_id":"temple-nest","unit_id":"u-1500a-b","unit_number":"1500A-B","title":"1515-1R - Water is leaking from the","description":"1515-1R - Water is leaking from the","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"emergency_type":"active_leak","priority":"emergency","field_category":"plumbing","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-08T09:30:54","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-08","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-08T09:30:54","note":"1515-1R - Water is leaking from the"}],"kind":"directory"},
    {"id":"WO-17980","property_id":"temple-nest","unit_id":"u-1500d-3","unit_number":"1500D-3","title":"Locked out","description":"Locked out","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"emergency_type":"lockout","priority":"emergency","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-04T18:08:27","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-05","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-04T18:08:27","note":"Locked out"}],"kind":"directory"},
    {"id":"WO-17978","property_id":"temple-nest","unit_id":"u-1504-2","unit_number":"1504-2","title":"Our garbage disposal is not working","description":"Our garbage disposal is not working","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"medium","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-04T14:12:09","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-08","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-04T14:12:09","note":"Our garbage disposal is not working"}],"kind":"directory"},
    {"id":"WO-17968","property_id":"temple-nest","unit_id":"u-1500a-b","unit_number":"1500A-B","title":"1528-1 - The garbage disposal has s","description":"1528-1 - The garbage disposal has s","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-02T13:28:23","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-03","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-02T13:28:23","note":"1528-1 - The garbage disposal has s"}],"kind":"directory"},
    {"id":"WO-17966","property_id":"temple-nest","unit_id":"u-1500a-1","unit_number":"1500A-1","title":"The front door to Building 1 (Georg","description":"The front door to Building 1 (Georg","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"emergency_type":"lockout","priority":"emergency","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-01T20:00:25","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-03","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-01T20:00:25","note":"The front door to Building 1 (Georg"}],"kind":"directory"},
    {"id":"WO-17955","property_id":"temple-nest","unit_id":"u-1500a-b","unit_number":"1500A-B","title":"1528-1","description":"1528-1","status":"open","wo_status_label":"On Hold","source":"web","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-06-01T08:34:13","escalation_level":1,"also_emailed":false,"responded":false,"completion_photo":null,"completion_note":null,"complete_date":null,"not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-01T08:34:13","note":"1528-1"}],"kind":"directory"},
    {"id":"WO-17905","property_id":"temple-nest","unit_id":"u-1500a-b","unit_number":"1500A-B","title":"The handle on the entrance door for","description":"The handle on the entrance door for","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-26T09:34:34","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-27","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-26T09:34:34","note":"The handle on the entrance door for"}],"kind":"directory"},
    {"id":"WO-17885","property_id":"temple-nest","unit_id":"u-1530-1","unit_number":"1530-1","title":"Our dishwasher has been flooded and","description":"Our dishwasher has been flooded and","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"priority":"emergency","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-21T08:19:48","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-21","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-21T08:19:48","note":"Our dishwasher has been flooded and"}],"kind":"directory"},
    {"id":"WO-17882","property_id":"temple-nest","unit_id":"u-1510-5-1","unit_number":"1510.5-1","title":"There is a constant knocking sound","description":"There is a constant knocking sound","status":"open","wo_status_label":"On Hold","source":"web","is_emergency":false,"priority":"high","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-05-20T22:22:55","escalation_level":1,"also_emailed":false,"responded":false,"completion_photo":null,"completion_note":null,"complete_date":null,"not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-20T22:22:55","note":"There is a constant knocking sound"}],"kind":"directory"},
    {"id":"WO-17881","property_id":"temple-nest","unit_id":"u-1500a-b","unit_number":"1500A-B","title":"There's no chair in the right-side","description":"There's no chair in the right-side","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"low","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-20T13:11:00","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-08","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-20T13:11:00","note":"There's no chair in the right-side"}],"kind":"directory"},
    {"id":"WO-17867","property_id":"temple-nest","unit_id":"u-1500a-b","unit_number":"1500A-B","title":"Hello,The air conditioner in Unit 1","description":"Hello,The air conditioner in Unit 1","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":true,"priority":"emergency","field_category":"hvac","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-18T22:10:17","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-20","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-18T22:10:17","note":"Hello,The air conditioner in Unit 1"}],"kind":"directory"},
    {"id":"WO-17866","property_id":"temple-nest","unit_id":"u-1508-b","unit_number":"1508-B","title":"The ceiling of my living room is le","description":"The ceiling of my living room is le","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-18T17:11:14","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-19","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-18T17:11:14","note":"The ceiling of my living room is le"}],"kind":"directory"},
    {"id":"WO-17864","property_id":"temple-nest","unit_id":"u-1500c-2","unit_number":"1500C-2","title":"Overhead light in room B burnt o","description":"Overhead light in room B burnt o","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-18T16:38:38","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-21","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-18T16:38:38","note":"Overhead light in room B burnt o"}],"kind":"directory"},
    {"id":"WO-17860","property_id":"temple-nest","unit_id":"u-1500a-b","unit_number":"1500A-B","title":"One of the front door keys for Unit","description":"One of the front door keys for Unit","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"high","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-18T09:45:38","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-19","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-18T09:45:38","note":"One of the front door keys for Unit"}],"kind":"directory"},
    {"id":"WO-17859","property_id":"temple-nest","unit_id":"u-1500a-b","unit_number":"1500A-B","title":"The smoke detector in Unit 1522 #2","description":"The smoke detector in Unit 1522 #2","status":"closed","wo_status_label":"Work Completed","source":"web","is_emergency":false,"priority":"low","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-18T09:43:37","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-29","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-18T09:43:37","note":"The smoke detector in Unit 1522 #2"}],"kind":"directory"},
  ],

  /* ── 1438 (1438 N Broad St) — 10 work orders: 2 emergency, 8 directory ── */
  "tn-1438": [
    {"id":"WO-SAS-TN--001","property_id":"tn-1438","unit_id":"u-201","unit_number":"201","title":"Maintenance request (details on callback)","description":"Details to be confirmed on callback.","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Dylan Lanza","tenant_phone":"+1 848 238 5083","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-23T18:39:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-23T18:39:10Z","note":"Details on callback."}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-SAS-TN--002","property_id":"tn-1438","unit_id":"u-305","unit_number":"305","title":"His issue","description":"His issue","status":"open","source":"sas","is_emergency":false,"field_category":"general","unit_state":"occupied","tenant_name":"Marcus Russo","tenant_phone":"+1 240 825 9159","tenant_waiting":true,"needs_pm_review":false,"created_at":"2026-04-30T22:30:00","escalation_level":0,"also_emailed":false,"responded":false,"calls":[{"at":"2026-04-30T22:30:46Z","note":"His issue"}],"completion_photo":null,"completion_note":null,"not_done_reason":null,"kind":"emergency"},
    {"id":"WO-18021","property_id":"tn-1438","unit_id":"u-1438-103","unit_number":"1438-103","title":"Garbage disposal is not working.","description":"Garbage disposal is not working.","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-13T21:21:51","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-16","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-13T21:21:51","note":"Garbage disposal is not working."}],"kind":"directory"},
    {"id":"WO-18015","property_id":"tn-1438","unit_id":"u-1438-305","unit_number":"1438-305","title":"The ceiling light between the ki","description":"The ceiling light between the ki","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"electrical","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-12T08:03:11","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-16","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-12T08:03:11","note":"The ceiling light between the ki"}],"kind":"directory"},
    {"id":"WO-18001","property_id":"tn-1438","unit_id":"u-1438-206","unit_number":"1438-206","title":"Kitchen sink is very loose","description":"Kitchen sink is very loose","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-06-09T21:03:23","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-16","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-06-09T21:03:23","note":"Kitchen sink is very loose"}],"kind":"directory"},
    {"id":"WO-17935","property_id":"tn-1438","unit_id":"u-1438-206","unit_number":"1438-206","title":"Bathroom blinds are too short, I","description":"Bathroom blinds are too short, I","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"low","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-28T18:20:23","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-28T18:20:23","note":"Bathroom blinds are too short, I"}],"kind":"directory"},
    {"id":"WO-17932","property_id":"tn-1438","unit_id":"u-1438-206","unit_number":"1438-206","title":"Toilet seat is loose","description":"Toilet seat is loose","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"low","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-28T12:04:15","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-28T12:04:15","note":"Toilet seat is loose"}],"kind":"directory"},
    {"id":"WO-17914","property_id":"tn-1438","unit_id":"u-1438-206","unit_number":"1438-206","title":"WiFi is bad horrible connection","description":"WiFi is bad horrible connection","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":true,"priority":"emergency","field_category":"general","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-27T10:34:40","escalation_level":2,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-27T10:34:40","note":"WiFi is bad horrible connection"}],"kind":"directory"},
    {"id":"WO-17903","property_id":"tn-1438","unit_id":"u-1438-205","unit_number":"1438-205","title":"lock is dead","description":"lock is dead","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"high","field_category":"lockout","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-25T14:11:54","escalation_level":1,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-06-01","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-25T14:11:54","note":"lock is dead"}],"kind":"directory"},
    {"id":"WO-17874","property_id":"tn-1438","unit_id":"u-1438-206","unit_number":"1438-206","title":"Sink faucet is broken, it has be","description":"Sink faucet is broken, it has be","status":"closed","wo_status_label":"Work Completed","source":"directory","is_emergency":false,"priority":"medium","field_category":"appliance","unit_state":"occupied","tenant_name":null,"tenant_phone":null,"tenant_waiting":false,"needs_pm_review":false,"created_at":"2026-05-19T17:47:22","escalation_level":0,"also_emailed":false,"responded":true,"completion_photo":null,"completion_note":"Work completed.","complete_date":"2026-05-21","not_done_reason":null,"material_amount":0,"labor_amount":0,"commission_amount":0,"total_payable_amount":0,"calls":[{"at":"2026-05-19T17:47:22","note":"Sink faucet is broken, it has be"}],"kind":"directory"},
  ],

};


/* ════════════════════════════════════════════════════════════════════════
   PROPERTY SPINE — RENEWALS DATA LIBRARY
   ════════════════════════════════════════════════════════════════════════

   This is DATA, not code. Lease-renewal pipeline per property: who is up for
   renewal, the month their lease ends, current vs renewed effective rent, and
   their decision state (renewed | on_notice | waiting).

   Dates are stored as a relative MONTH OFFSET + DAY ({ m, d }) so the demo
   always lands on the current quarter. index.html expands them via _curMonthDay
   at read time — the data file stays pure.

   The app READS this via window.__RENEWALS_LIBRARY[propertyId]. Conversation
   threads for each renewal live in window.__RENEWAL_THREADS, keyed by the row's
   conversation_id, and are merged into the app's thread store at boot.

   WHEN THE BACKEND GOES LIVE: replaced by a DB query (lease table + comms).

   Shape:  window.__RENEWALS_LIBRARY[propertyId] = [ renewalRow, ... ]
   ════════════════════════════════════════════════════════════════════════ */

window.__RENEWALS_LIBRARY = {

  /* ── Solo on Chestnut (4233) — 19 renewals across 3 months ── */
  "9e2bb96e-08e2-41db-81c2-91055ceb50a3": [
    { _demo:true, person_id:"person_priya_shah", conversation_id:"demo_conv_renew_priya", resident_name:"Priya Shah", name:"Priya Shah", unit:"0408", m:0, d:30, renewal_status:"renewed", status:"renewed", current_eff:1980, renewal_eff:2055 },
    { _demo:true, person_id:"person_daniel_cho", conversation_id:"demo_conv_renew_daniel", resident_name:"Daniel Cho", name:"Daniel Cho", unit:"0211", m:0, d:28, renewal_status:"on_notice", status:"on_notice", current_eff:2150 },
    { _demo:true, person_id:"person_maria_lopez", conversation_id:"demo_conv_renew_maria", resident_name:"Maria Lopez", name:"Maria Lopez", unit:"0517", m:0, d:30, renewal_status:"waiting", status:"waiting", current_eff:1875 },
    { _demo:true, person_id:"person_james_okafor", conversation_id:"demo_conv_renew_james", resident_name:"James Okafor", name:"James Okafor", unit:"0633", m:0, d:30, renewal_status:"renewed", status:"renewed", current_eff:2400, renewal_eff:2496 },
    { _demo:true, person_id:"person_aaron_bell", conversation_id:"demo_conv_renew_aaron", resident_name:"Aaron Bell", name:"Aaron Bell", unit:"0319", m:0, d:25, renewal_status:"waiting", status:"waiting", current_eff:1650 },
    { _demo:true, person_id:"person_sofia_marin", conversation_id:"demo_conv_renew_sofiam", resident_name:"Sofia Marin", name:"Sofia Marin", unit:"0726", m:0, d:30, renewal_status:"on_notice", status:"on_notice", current_eff:2025 },
    { _demo:true, person_id:"person_derek_voss", conversation_id:"demo_conv_renew_derek", resident_name:"Derek Vance", name:"Derek Vance", unit:"0512", m:0, d:27, renewal_status:"renewed", status:"renewed", current_eff:1925, renewal_eff:1995 },
    { _demo:true, person_id:"person_lila_gardner", conversation_id:"demo_conv_renew_lila", resident_name:"Lila Gardner", name:"Lila Gardner", unit:"0840", m:0, d:30, renewal_status:"waiting", status:"waiting", current_eff:2200 },
    { _demo:true, person_id:"person_sara_kim", conversation_id:"demo_conv_renew_sara", resident_name:"Sara Kim", name:"Sara Kim", unit:"0729", m:1, d:31, renewal_status:"waiting", status:"waiting", current_eff:1925 },
    { _demo:true, person_id:"person_liam_walsh", conversation_id:"demo_conv_renew_liam", resident_name:"Liam Walsh", name:"Liam Walsh", unit:"0814", m:1, d:15, renewal_status:"renewed", status:"renewed", current_eff:1800, renewal_eff:1867 },
    { _demo:true, person_id:"person_nina_patel", conversation_id:"demo_conv_renew_nina", resident_name:"Nina Patel", name:"Nina Patel", unit:"0902", m:1, d:31, renewal_status:"on_notice", status:"on_notice", current_eff:2100 },
    { _demo:true, person_id:"person_marcus_reid", conversation_id:"demo_conv_renew_marcus", resident_name:"Marcus Reid", name:"Marcus Reid", unit:"1024", m:1, d:20, renewal_status:"waiting", status:"waiting", current_eff:2250 },
    { _demo:true, person_id:"person_elena_voss", conversation_id:"demo_conv_renew_elena", resident_name:"Elena Voss", name:"Elena Voss", unit:"0611", m:1, d:28, renewal_status:"renewed", status:"renewed", current_eff:1750, renewal_eff:1820 },
    { _demo:true, person_id:"person_omar_reyes", conversation_id:"demo_conv_renew_omar", resident_name:"Omar Reyes", name:"Omar Reyes", unit:"1006", m:1, d:30, renewal_status:"waiting", status:"waiting", current_eff:1700 },
    { _demo:true, person_id:"person_tessa_ward", conversation_id:"demo_conv_renew_tessa", resident_name:"Tessa Ward", name:"Tessa Ward", unit:"0723", m:1, d:18, renewal_status:"on_notice", status:"on_notice", current_eff:2350 },
    { _demo:true, person_id:"person_grace_lin", conversation_id:"demo_conv_renew_grace", resident_name:"Grace Lin", name:"Grace Lin", unit:"1118", m:2, d:30, renewal_status:"waiting", status:"waiting", current_eff:2300 },
    { _demo:true, person_id:"person_tariq_hassan", conversation_id:"demo_conv_renew_tariq", resident_name:"Tariq Hassan", name:"Tariq Hassan", unit:"0905", m:2, d:15, renewal_status:"on_notice", status:"on_notice", current_eff:1950 },
    { _demo:true, person_id:"person_julia_tran", conversation_id:"demo_conv_renew_julia", resident_name:"Julia Tran", name:"Julia Tran", unit:"1212", m:2, d:30, renewal_status:"waiting", status:"waiting", current_eff:2125 },
    { _demo:true, person_id:"person_henry_park", conversation_id:"demo_conv_renew_henry", resident_name:"Henry Park", name:"Henry Park", unit:"1009", m:2, d:28, renewal_status:"renewed", status:"renewed", current_eff:2050, renewal_eff:2132 }
  ],

  /* ── Skyline Apartments (1417) — 10 renewals (student housing, by-bed) ── */
  "skyline-1417": [
    { _demo:true, person_id:"person_aaron_mills", conversation_id:"demo_conv_renew_amills", resident_name:"Aaron Mills", name:"Aaron Mills", unit:"301-A", m:0, d:30, renewal_status:"waiting", status:"waiting", current_eff:1180 },
    { _demo:true, person_id:"person_tyler_brooks", conversation_id:"demo_conv_renew_tyler", resident_name:"Tyler Brooks", name:"Tyler Brooks", unit:"214-B", m:0, d:30, renewal_status:"renewed", status:"renewed", current_eff:1150, renewal_eff:1200 },
    { _demo:true, person_id:"person_mei_tanaka_r", conversation_id:"demo_conv_renew_meit", resident_name:"Mei Tanaka", name:"Mei Tanaka", unit:"118-C", m:0, d:28, renewal_status:"on_notice", status:"on_notice", current_eff:1250 },
    { _demo:true, person_id:"person_raj_singh", conversation_id:"demo_conv_renew_raj", resident_name:"Raj Singh", name:"Raj Singh", unit:"305-D", m:0, d:30, renewal_status:"waiting", status:"waiting", current_eff:1100 },
    { _demo:true, person_id:"person_chris_vega", conversation_id:"demo_conv_renew_chris", resident_name:"Chris Vega", name:"Chris Vega", unit:"402-A", m:1, d:31, renewal_status:"renewed", status:"renewed", current_eff:1200, renewal_eff:1248 },
    { _demo:true, person_id:"person_dana_wells", conversation_id:"demo_conv_renew_dana", resident_name:"Dana Wells", name:"Dana Wells", unit:"307-D", m:1, d:20, renewal_status:"waiting", status:"waiting", current_eff:1175 },
    { _demo:true, person_id:"person_jordan_pruitt_r", conversation_id:"demo_conv_renew_jordanp", resident_name:"Jordan Pruitt", name:"Jordan Pruitt", unit:"410-B", m:1, d:28, renewal_status:"on_notice", status:"on_notice", current_eff:1225 },
    { _demo:true, person_id:"person_kofi_mensah", conversation_id:"demo_conv_renew_kofi", resident_name:"Kofi Mensah", name:"Kofi Mensah", unit:"215-A", m:2, d:31, renewal_status:"waiting", status:"waiting", current_eff:1140 },
    { _demo:true, person_id:"person_sofia_ruiz", conversation_id:"demo_conv_renew_sofiar", resident_name:"Sofia Ruiz", name:"Sofia Ruiz", unit:"409-B", m:2, d:15, renewal_status:"renewed", status:"renewed", current_eff:1190, renewal_eff:1238 },
    { _demo:true, person_id:"person_leah_brooks_r", conversation_id:"demo_conv_renew_leahb", resident_name:"Leah Brooks", name:"Leah Brooks", unit:"112-A", m:2, d:30, renewal_status:"waiting", status:"waiting", current_eff:1160 }
  ],

};

/* ────────────────────────────────────────────────────────────────────────
   RENEWAL CONVERSATION THREADS — keyed by conversation_id. Each row above
   points at one of these. Merged into the app's thread store at boot.
   created_at uses _demoAt(minsFromNow) so timestamps stay recent.
   ──────────────────────────────────────────────────────────────────────── */
// Pure date helper, local to this data file (matches index.html _demoAt).
var _demoAt = function(minsFromNow){ return new Date(Date.now()+minsFromNow*60000).toISOString(); };
window.__RENEWAL_THREADS = {
  demo_conv_renew_sara:{ conversation_id:'demo_conv_renew_sara',
    ai_suggested_reply:"Hi Sara, it's Katie — your lease is up next month and we'd love to keep you. Want me to send over the renewal terms so you can take a look?",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Sara! Your lease on 0729 is coming up at the end of next month. We'd love to have you stay — want me to put together renewal options?", created_at:_demoAt(-4320)},
      {sender_type:'prospect', sender_name:'Sara', body:"Hi Katie — yeah I'm thinking about it. What would the new rent be?", created_at:_demoAt(-4180)},
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"I'll get you the exact number today. Are you leaning toward another 12 months, or something shorter?", created_at:_demoAt(-4170)}
    ]},
  demo_conv_renew_marcus:{ conversation_id:'demo_conv_renew_marcus',
    ai_suggested_reply:"Hi Marcus, just following up on your renewal for 1024 — happy to walk through the numbers whenever works.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Marcus! Your lease is up next month — wanted to check in on whether you're planning to renew on 1024.", created_at:_demoAt(-2880)},
      {sender_type:'prospect', sender_name:'Marcus', body:"Probably, but I want to understand the increase first.", created_at:_demoAt(-2700)}
    ]},
  demo_conv_renew_nina:{ conversation_id:'demo_conv_renew_nina',
    ai_suggested_reply:"Hi Nina, thanks for letting us know. If anything changes and you'd like to stay, the door's open — just reply here.",
    messages:[
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Hi Nina — your lease on 0902 ends next month. Are you planning to renew or move out?", created_at:_demoAt(-5760)},
      {sender_type:'prospect', sender_name:'Nina', body:"I gave notice — I'm relocating for work. Sorry!", created_at:_demoAt(-5600)},
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Totally understand, Nina. We'll get your move-out scheduled. Thanks for being a great resident.", created_at:_demoAt(-5590)}
    ]},
  demo_conv_renew_liam:{ conversation_id:'demo_conv_renew_liam',
    ai_suggested_reply:"Hi Liam, your renewal is all set — welcome to another year! Let me know if you need anything.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Liam! Glad you're staying. I've got your renewal on 0814 ready at the new rate — want me to send it for signature?", created_at:_demoAt(-3000)},
      {sender_type:'prospect', sender_name:'Liam', body:"Yes please, send it over.", created_at:_demoAt(-2880)},
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Sent! Sign whenever you're ready and you're locked in for another year.", created_at:_demoAt(-2870)}
    ]},
  demo_conv_renew_elena:{ conversation_id:'demo_conv_renew_elena',
    ai_suggested_reply:"Hi Elena, your renewal's signed and done — thanks for staying with us!",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Elena! Your renewal on 0611 is ready — same great unit, new term. Want it sent over?", created_at:_demoAt(-4000)},
      {sender_type:'prospect', sender_name:'Elena', body:"Already signed it this morning. Thanks Katie!", created_at:_demoAt(-3800)}
    ]},
  demo_conv_renew_priya:{ conversation_id:'demo_conv_renew_priya',
    ai_suggested_reply:"Hi Priya, your renewal is all wrapped up — thanks for another year on 0408!",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Priya! Your lease on 0408 is up this month and your renewal's ready at the new rate. Want me to send it?", created_at:_demoAt(-3600)},
      {sender_type:'prospect', sender_name:'Priya', body:"Yes, signed and sent back. Glad to stay!", created_at:_demoAt(-3400)}
    ]},
  demo_conv_renew_daniel:{ conversation_id:'demo_conv_renew_daniel',
    ai_suggested_reply:"Hi Daniel, thanks for the heads up. If your plans change, we'd be glad to keep you on 0211.",
    messages:[
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Hi Daniel — your lease on 0211 ends this month. Renewing or moving on?", created_at:_demoAt(-6000)},
      {sender_type:'prospect', sender_name:'Daniel', body:"Putting in my notice — buying a place. Thanks for everything.", created_at:_demoAt(-5800)}
    ]},
  demo_conv_renew_maria:{ conversation_id:'demo_conv_renew_maria',
    ai_suggested_reply:"Hi Maria, following up on your renewal for 0517 — let me know if you have any questions on the terms.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Maria! Your lease on 0517 is up this month. We'd love to keep you — want to see renewal options?", created_at:_demoAt(-2880)},
      {sender_type:'prospect', sender_name:'Maria', body:"Maybe — still deciding. Can you send what the renewal would look like?", created_at:_demoAt(-2700)}
    ]},
  /* ── ADDED SOLO RENEWAL THREADS ── */
  demo_conv_renew_james:{ conversation_id:'demo_conv_renew_james',
    ai_suggested_reply:"Hi James, your renewal on 0633 is signed — thanks for another year! Reach out anytime.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi James! Your lease on 0633 is up this month. Renewal's ready at the new rate — want me to send it for signature?", created_at:_demoAt(-4200)},
      {sender_type:'prospect', sender_name:'James', body:"Yep, send it. Happy to stay another year.", created_at:_demoAt(-4080)},
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Sent — you're all set once it's signed. Thanks James!", created_at:_demoAt(-4070)}
    ]},
  demo_conv_renew_aaron:{ conversation_id:'demo_conv_renew_aaron',
    ai_suggested_reply:"Hi Aaron, circling back on your renewal for 0319 — happy to hold the current rate if you let me know this week.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Aaron! Your lease on 0319 ends late this month. Are you thinking of renewing?", created_at:_demoAt(-2600)},
      {sender_type:'prospect', sender_name:'Aaron', body:"Leaning yes but comparing a couple places. What's the renewal rate?", created_at:_demoAt(-2500)},
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"I can get you the number today — and I'd love to keep you. Give me until this afternoon.", created_at:_demoAt(-2490)}
    ]},
  demo_conv_renew_sofiam:{ conversation_id:'demo_conv_renew_sofiam',
    ai_suggested_reply:"Hi Sofia, thanks for the heads up on 0726. If your plans shift, we'd be glad to keep you — just reply here.",
    messages:[
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Hi Sofia — your lease on 0726 ends this month. Renewing or moving on?", created_at:_demoAt(-5200)},
      {sender_type:'prospect', sender_name:'Sofia', body:"Giving notice — moving closer to my new job. Thanks for everything!", created_at:_demoAt(-5050)}
    ]},
  demo_conv_renew_derek:{ conversation_id:'demo_conv_renew_derek',
    ai_suggested_reply:"Hi Derek, renewal on 0512 is wrapped — welcome to year two! Let me know if you need anything.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Derek! Glad you're staying. Your renewal on 0512 is ready at the new rate — sending it now.", created_at:_demoAt(-3300)},
      {sender_type:'prospect', sender_name:'Derek', body:"Got it, signed. Thanks Katie!", created_at:_demoAt(-3150)}
    ]},
  demo_conv_renew_lila:{ conversation_id:'demo_conv_renew_lila',
    ai_suggested_reply:"Hi Lila, following up on 0840 — want me to send over a couple of renewal term options?",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Lila! Your lease on 0840 is up this month. We'd love to keep you — want to look at renewal options?", created_at:_demoAt(-2400)},
      {sender_type:'prospect', sender_name:'Lila', body:"Yes — can you do a 12 and an 18 month so I can compare?", created_at:_demoAt(-2280)}
    ]},
  demo_conv_renew_omar:{ conversation_id:'demo_conv_renew_omar',
    ai_suggested_reply:"Hi Omar, just checking in on your renewal for 1006 next month — happy to walk through the numbers anytime.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Omar! Your lease on 1006 is up next month. Planning to renew?", created_at:_demoAt(-1800)},
      {sender_type:'prospect', sender_name:'Omar', body:"Probably — want to see the renewal rate first though.", created_at:_demoAt(-1700)}
    ]},
  demo_conv_renew_tessa:{ conversation_id:'demo_conv_renew_tessa',
    ai_suggested_reply:"Hi Tessa, thanks for letting us know about 0723. If anything changes we'd love to keep you — door's open.",
    messages:[
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Hi Tessa — your lease on 0723 ends next month. Renewing or moving on?", created_at:_demoAt(-4600)},
      {sender_type:'prospect', sender_name:'Tessa', body:"Putting in notice — my roommate and I are getting our own places. Thank you!", created_at:_demoAt(-4450)}
    ]},
  demo_conv_renew_grace:{ conversation_id:'demo_conv_renew_grace',
    ai_suggested_reply:"Hi Grace, your lease on 1118 is up in a couple months — want me to get renewal terms started early?",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Grace! Looking ahead — your lease on 1118 ends in about two months. Any early thoughts on renewing?", created_at:_demoAt(-1200)},
      {sender_type:'prospect', sender_name:'Grace', body:"Likely staying, yeah. Let's talk closer to the date.", created_at:_demoAt(-1100)}
    ]},
  demo_conv_renew_tariq:{ conversation_id:'demo_conv_renew_tariq',
    ai_suggested_reply:"Hi Tariq, appreciate the early heads up on 0905. If your plans change we'd be glad to keep you.",
    messages:[
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Hi Tariq — your lease on 0905 is up in a couple months. Renewing or moving on?", created_at:_demoAt(-3000)},
      {sender_type:'prospect', sender_name:'Tariq', body:"Planning to give notice — relocating for grad school in the fall.", created_at:_demoAt(-2850)}
    ]},
  demo_conv_renew_julia:{ conversation_id:'demo_conv_renew_julia',
    ai_suggested_reply:"Hi Julia, your lease on 1212 ends in a couple months — want me to send renewal options when they're ready?",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Julia! Your lease on 1212 is up in about two months. Want me to start renewal options?", created_at:_demoAt(-900)},
      {sender_type:'prospect', sender_name:'Julia', body:"Sure, send them over when ready. Leaning toward staying.", created_at:_demoAt(-820)}
    ]},
  demo_conv_renew_henry:{ conversation_id:'demo_conv_renew_henry',
    ai_suggested_reply:"Hi Henry, renewal on 1009 is signed and set — thanks for staying another year!",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Henry! Your renewal on 1009 is ready at the new rate — want it sent for signature?", created_at:_demoAt(-2000)},
      {sender_type:'prospect', sender_name:'Henry', body:"Already on it — signed this morning. Thanks!", created_at:_demoAt(-1880)}
    ]},
  /* ── SKYLINE RENEWAL THREADS (student housing — by-bed) ── */
  demo_conv_renew_amills:{ conversation_id:'demo_conv_renew_amills',
    ai_suggested_reply:"Hi Aaron, following up on your bed in 301 — want me to send renewal terms for next year?",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Aaron! Your lease on bed 301-A is up this month. Re-signing for next year?", created_at:_demoAt(-2600)},
      {sender_type:'prospect', sender_name:'Aaron', body:"Probably — depends if my roommates are staying. Can you check?", created_at:_demoAt(-2500)}
    ]},
  demo_conv_renew_tyler:{ conversation_id:'demo_conv_renew_tyler',
    ai_suggested_reply:"Hi Tyler, you're all set on 214-B for next year — thanks for re-signing!",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Tyler! Glad you're staying. Your renewal on 214-B is ready — sending it for signature now.", created_at:_demoAt(-3400)},
      {sender_type:'prospect', sender_name:'Tyler', body:"Signed! See you next year.", created_at:_demoAt(-3250)}
    ]},
  demo_conv_renew_meit:{ conversation_id:'demo_conv_renew_meit',
    ai_suggested_reply:"Hi Mei, thanks for letting us know about 118-C. If plans change we'd love to keep you on for next year.",
    messages:[
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Hi Mei — your bed lease on 118-C ends this month. Re-signing or moving out?", created_at:_demoAt(-5400)},
      {sender_type:'prospect', sender_name:'Mei', body:"Moving out — graduating in the spring. Thanks for a great year!", created_at:_demoAt(-5250)}
    ]},
  demo_conv_renew_raj:{ conversation_id:'demo_conv_renew_raj',
    ai_suggested_reply:"Hi Raj, checking in on 305-D — want me to hold your spot for next year while you decide?",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Raj! Your lease on bed 305-D is up this month. Staying for next year?", created_at:_demoAt(-2300)},
      {sender_type:'prospect', sender_name:'Raj', body:"Still deciding between staying and an off-campus place. When do you need to know?", created_at:_demoAt(-2200)}
    ]},
  demo_conv_renew_chris:{ conversation_id:'demo_conv_renew_chris',
    ai_suggested_reply:"Hi Chris, renewal on 402-A is signed — welcome back for next year!",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Chris! Your renewal on 402-A is ready for next year — want it sent over?", created_at:_demoAt(-3100)},
      {sender_type:'prospect', sender_name:'Chris', body:"Yes, signed and done. Thanks!", created_at:_demoAt(-2950)}
    ]},
  demo_conv_renew_dana:{ conversation_id:'demo_conv_renew_dana',
    ai_suggested_reply:"Hi Dana, following up on 307-D for next year — happy to walk through the renewal rate whenever.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Dana! Your lease on bed 307-D is up next month. Re-signing?", created_at:_demoAt(-1900)},
      {sender_type:'prospect', sender_name:'Dana', body:"Thinking about it — what's the rate for next year?", created_at:_demoAt(-1800)}
    ]},
  demo_conv_renew_jordanp:{ conversation_id:'demo_conv_renew_jordanp',
    ai_suggested_reply:"Hi Jordan, thanks for the heads up on 410-B. If anything changes we'd be glad to keep you.",
    messages:[
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Hi Jordan — your bed lease on 410-B ends next month. Re-signing or moving out?", created_at:_demoAt(-4400)},
      {sender_type:'prospect', sender_name:'Jordan', body:"Moving out — transferring schools next term. Thank you!", created_at:_demoAt(-4250)}
    ]},
  demo_conv_renew_kofi:{ conversation_id:'demo_conv_renew_kofi',
    ai_suggested_reply:"Hi Kofi, your lease on 215-A is up in a couple months — want me to start the renewal early?",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Kofi! Looking ahead — your bed on 215-A is up in about two months. Early thoughts on staying?", created_at:_demoAt(-1100)},
      {sender_type:'prospect', sender_name:'Kofi', body:"Likely staying. Let's lock it in closer to the date.", created_at:_demoAt(-1000)}
    ]},
  demo_conv_renew_sofiar:{ conversation_id:'demo_conv_renew_sofiar',
    ai_suggested_reply:"Hi Sofia, renewal on 409-B is signed — thanks for staying with us another year!",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Sofia! Your renewal on 409-B is ready for next year — want it sent for signature?", created_at:_demoAt(-2100)},
      {sender_type:'prospect', sender_name:'Sofia', body:"Done — signed it. Thanks Katie!", created_at:_demoAt(-1980)}
    ]},
  demo_conv_renew_leahb:{ conversation_id:'demo_conv_renew_leahb',
    ai_suggested_reply:"Hi Leah, your bed on 112-A is up in a couple months — want me to send renewal options when ready?",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Leah! Your lease on 112-A is up in about two months. Want me to put together renewal options?", created_at:_demoAt(-950)},
      {sender_type:'prospect', sender_name:'Leah', body:"Yes please — leaning toward staying for senior year.", created_at:_demoAt(-870)}
    ]},
};


/* ════════════════════════════════════════════════════════════════════════
   PROPERTY SPINE — LEASING DEMO LIBRARY  (tours · follow-ups · applications)
   ════════════════════════════════════════════════════════════════════════
   DATA, not code. The front-of-funnel demo set per property. Timestamps use
   the same relative date helpers index.html uses (_dSlot / _dAt / _demoAt),
   defined locally below so these records move verbatim and stay recent.

   The app READS:
     window.__TOURS_LIBRARY[propertyId]      → tours_today
     window.__FOLLOWUPS_LIBRARY[propertyId]  → tour_followups
     window.__APPS_LIBRARY[propertyId]       → pending applications
     window.__TOUR_THREADS                   → merged into DEMO_TOUR_THREADS at boot
   WHEN THE BACKEND GOES LIVE: replaced by leasing-funnel + comms queries.
   ════════════════════════════════════════════════════════════════════════ */

// Pure date helpers, local to this data file (match index.html).
var _dSlot  = function(dayOffset, hour, min){ var n=new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()+dayOffset, hour, min||0, 0).toISOString(); };
var _dAt    = function(mins){ return new Date(Date.now()+mins*60000).toISOString(); };
if (typeof _demoAt === 'undefined') { var _demoAt = function(m){ return new Date(Date.now()+m*60000).toISOString(); }; }

window.__TOURS_LIBRARY = {
  "9e2bb96e-08e2-41db-81c2-91055ceb50a3": [
  { _demo:true, id:'solo_tour_dani', tour_id:'solo_tour_dani', lead_id:'solo_lead_dani', person_id:'solo_lead_dani',
    prospect_name:'Dani Alvarez', status:'confirmed_by_prospect', scheduled_for:_dSlot(0, 10, 0),
    phone:'(215) 555-0143', source:'Apartments.com', unit_type:'2 Bed / 2 Bath', unit_interest:'Higher floor, quiet side',
    move_in_date:'2026-08-01', budget:2450, reason_for_moving:'Relocating for a new job downtown',
    first_response_at:_dAt(-30240), last_activity:_dAt(-2880), assigned_agent_name:'Katie',
    conversation_id:'demo_conv_jordan',
    ai_summary:'Wants a higher-floor 2 bed for an August move; sensitive to street noise. Confirmed for today.',
    preferences:['Higher floor','Natural light','In-unit laundry'], concerns:['Street noise'] },
  { _demo:true, id:'solo_tour_marcus', tour_id:'solo_tour_marcus', lead_id:'solo_lead_marcus', person_id:'solo_lead_marcus',
    prospect_name:'Marcus Webb', status:'scheduled', scheduled_for:_dSlot(0, 11, 30),
    phone:'(215) 555-0188', source:'Walk-in', unit_type:'1 Bed / 1 Bath', unit_interest:'Anything available soon',
    move_in_date:'2026-07-15', budget:1850, reason_for_moving:'Lease ending at current place',
    first_response_at:_dAt(-8640), last_activity:_dAt(-1440), assigned_agent_name:'',
    conversation_id:'',
    ai_summary:'Walk-in earlier this week, flexible on unit. No conversation thread started yet.',
    preferences:['Move-in ready'], concerns:[] },
  { _demo:true, id:'solo_tour_aisha', tour_id:'solo_tour_aisha', lead_id:'solo_lead_aisha', person_id:'solo_lead_aisha',
    prospect_name:'Aisha Karim', status:'confirmed_by_prospect', scheduled_for:_dSlot(0, 13, 15),
    phone:'(267) 555-0177', source:'Zillow', unit_type:'1 Bed', unit_interest:'In-unit laundry, short commute',
    move_in_date:'2026-08-15', budget:2050, reason_for_moving:'New hospital job nearby',
    first_response_at:_dAt(-12960), last_activity:_dAt(-720), assigned_agent_name:'Kandice',
    conversation_id:'',
    ai_summary:'Nurse relocating for a new job. Wants in-unit laundry and a short commute. Pre-qualified, moving quickly.',
    preferences:['In-unit laundry','Short commute'], concerns:[] },
  { _demo:true, id:'solo_tour_devon', tour_id:'solo_tour_devon', lead_id:'solo_lead_devon', person_id:'solo_lead_devon',
    prospect_name:'Devon Pierce', status:'scheduled', scheduled_for:_dSlot(0, 14, 45),
    phone:'(610) 555-0211', source:'Website', unit_type:'Studio', unit_interest:'Budget studio',
    move_in_date:'2026-09-01', budget:1500, reason_for_moving:'First apartment after college',
    first_response_at:_dAt(-4320), last_activity:_dAt(-180), assigned_agent_name:'',
    conversation_id:'',
    ai_summary:'First apartment after college. Budget-focused, asked about deposit and roommate-matching. Early in the process.',
    preferences:['Budget','Flexible'], concerns:['Deposit'] },
  { _demo:true, id:'solo_tour_lena', tour_id:'solo_tour_lena', lead_id:'solo_lead_lena', person_id:'solo_lead_lena',
    prospect_name:'Lena Ortiz', status:'requested', scheduled_for:_dSlot(0, 16, 30),
    phone:'(215) 555-0250', source:'Website', unit_type:'2 Bed', unit_interest:'Corner unit, good light',
    move_in_date:'2026-10-01', budget:2600, reason_for_moving:'Relocating with a partner for work',
    first_response_at:_dAt(-1440), last_activity:_dAt(-60), assigned_agent_name:'Katie',
    conversation_id:'',
    ai_summary:'Relocating with a partner in the fall. Wants a corner unit with good light. Just inquired today.',
    preferences:['Corner unit','Natural light'], concerns:[] },
  { _demo:true, id:'solo_tour_tessa', tour_id:'solo_tour_tessa', lead_id:'solo_lead_tessa', person_id:'solo_lead_tessa',
    prospect_name:'Tessa Nguyen', status:'scheduled', scheduled_for:_dSlot(0, 22, 0),
    phone:'(215) 555-0294', source:'Instagram', unit_type:'1 Bed / 1 Bath', unit_interest:'Higher floor with good light',
    move_in_date:'2026-08-01', budget:2000, reason_for_moving:'Starting a new job in Center City',
    first_response_at:_dAt(-180), last_activity:_dAt(-45), assigned_agent_name:'Katie',
    conversation_id:'',
    ai_summary:'New lead from earlier today via Instagram. Starting a Center City job in August, wants a higher-floor 1 bed with good light around $2,000. Fresh — confirm the time and qualify live.',
    preferences:['Higher floor','Natural light'], concerns:['Budget'] },
  // tomorrow
  { _demo:true, id:'solo_tour_sam', tour_id:'solo_tour_sam', lead_id:'solo_lead_sam', person_id:'solo_lead_sam',
    prospect_name:'Sam Whitaker', status:'confirmed_by_prospect', scheduled_for:_dSlot(1, 10, 30),
    phone:'(267) 555-0260', source:'Apartments.com', unit_type:'1 Bed', unit_interest:'Quiet, home-office nook',
    move_in_date:'2026-08-01', budget:1950, reason_for_moving:'Hybrid work, wants a quiet space',
    first_response_at:_dAt(-20160), last_activity:_dAt(-1440), assigned_agent_name:'Katie',
    conversation_id:'',
    ai_summary:'Tech worker, hybrid schedule. Wants a quiet unit with a home-office nook. Engaged and responsive.',
    preferences:['Quiet','Home office'], concerns:[] },
  { _demo:true, id:'solo_tour_grace', tour_id:'solo_tour_grace', lead_id:'solo_lead_grace', person_id:'solo_lead_grace',
    prospect_name:'Grace Liu', status:'scheduled', scheduled_for:_dSlot(1, 14, 0),
    phone:'(610) 555-0270', source:'Referral', unit_type:'2 Bed / 2 Bath', unit_interest:'Splitting with a roommate',
    move_in_date:'2026-08-20', budget:2700, reason_for_moving:'Grad student with a roommate',
    first_response_at:_dAt(-7200), last_activity:_dAt(-2880), assigned_agent_name:'Kandice',
    conversation_id:'',
    ai_summary:'Grad student splitting a 2 bed. Referred by a current resident. Cares about the gym and study spaces.',
    preferences:['Gym','Study space','Roommate'], concerns:[] },
  // day after
  { _demo:true, id:'solo_tour_noah', tour_id:'solo_tour_noah', lead_id:'solo_lead_noah', person_id:'solo_lead_noah',
    prospect_name:'Noah Bennett', status:'confirmed_by_prospect', scheduled_for:_dSlot(2, 11, 0),
    phone:'(215) 555-0280', source:'Website', unit_type:'Studio', unit_interest:'Move-in ready near transit',
    move_in_date:'2026-09-15', budget:1600, reason_for_moving:'Returning to the city for a job',
    first_response_at:_dAt(-2880), last_activity:_dAt(-1440), assigned_agent_name:'Katie',
    conversation_id:'',
    ai_summary:'Returning to the city for a new job. Wants something move-in ready near transit. Moving fast.',
    preferences:['Near transit','Move-in ready'], concerns:[] },
  // later this week
  { _demo:true, id:'solo_tour_priya', tour_id:'solo_tour_priya', lead_id:'solo_lead_priyaR', person_id:'solo_lead_priyaR',
    prospect_name:'Priya Raman', status:'confirmed_by_prospect', scheduled_for:_dSlot(3, 13, 30),
    phone:'(267) 555-0290', source:'Apartments.com', unit_type:'1 Bed', unit_interest:'Pet-friendly, balcony',
    move_in_date:'2026-09-01', budget:2100, reason_for_moving:'Moving in with a partner',
    first_response_at:_dAt(-10080), last_activity:_dAt(-2880), assigned_agent_name:'Kandice',
    conversation_id:'',
    ai_summary:'Wants a pet-friendly 1 bed with a balcony for a September move. Has a small dog.',
    preferences:['Pet-friendly','Balcony'], concerns:[] },
  { _demo:true, id:'solo_tour_tyler', tour_id:'solo_tour_tyler', lead_id:'solo_lead_tyler', person_id:'solo_lead_tyler',
    prospect_name:'Tyler Brooks', status:'scheduled', scheduled_for:_dSlot(4, 11, 15),
    phone:'(610) 555-0300', source:'Zillow', unit_type:'2 Bed', unit_interest:'Roommate-friendly layout',
    move_in_date:'2026-08-15', budget:2400, reason_for_moving:'Splitting with a roommate',
    first_response_at:_dAt(-5760), last_activity:_dAt(-1440), assigned_agent_name:'',
    conversation_id:'',
    ai_summary:'Splitting a 2 bed with a roommate. Wants a layout where both bedrooms are similar size.',
    preferences:['Even bedrooms','Roommate'], concerns:[] }
  ],
  "skyline-1417": [
  { _demo:true, id:'sky_tour_jia', tour_id:'sky_tour_jia', lead_id:'sky_lead_jia', person_id:'sky_lead_jia',
    prospect_name:'Jia Chen', status:'confirmed_by_prospect', scheduled_for:_dSlot(0, 10, 15),
    phone:'(267) 555-0117', source:'University housing fair', unit_type:'4x4 by-bed', unit_interest:'Bed in a 4-bed, female suite',
    move_in_date:'2026-08-20', budget:1150, reason_for_moving:'Incoming junior, wants off-campus',
    first_response_at:_dAt(-25920), last_activity:_dAt(-1440), assigned_agent_name:'Katie',
    conversation_id:'demo_conv_jia',
    ai_summary:'Incoming junior touring a by-bed in a 4-bed suite for the fall academic year. Confirmed.',
    preferences:['Female suite','Close to campus shuttle'], concerns:['Roommate matching'] },
  { _demo:true, id:'sky_tour_omar', tour_id:'sky_tour_omar', lead_id:'sky_lead_omar', person_id:'sky_lead_omar',
    prospect_name:'Omar Haddad', status:'scheduled', scheduled_for:_dSlot(0, 12, 0),
    phone:'(267) 555-0162', source:'Instagram', unit_type:'2x2 by-bed', unit_interest:'Bed in a 2-bed',
    move_in_date:'2026-08-20', budget:1300, reason_for_moving:'Transfer student',
    first_response_at:_dAt(-5760), last_activity:_dAt(-300), assigned_agent_name:'',
    conversation_id:'',
    ai_summary:'Transfer student, early in the process. No conversation thread yet.',
    preferences:['Quiet floor'], concerns:[] },
  { _demo:true, id:'sky_tour_mei', tour_id:'sky_tour_mei', lead_id:'sky_lead_mei', person_id:'sky_lead_mei',
    prospect_name:'Mei Tanaka', status:'confirmed_by_prospect', scheduled_for:_dSlot(0, 14, 30),
    phone:'(215) 555-0190', source:'Instagram', unit_type:'4x4 by-bed', unit_interest:'Bed in a 4-bed suite',
    move_in_date:'2026-08-20', budget:1175, reason_for_moving:'Returning sophomore',
    first_response_at:_dAt(-11520), last_activity:_dAt(-600), assigned_agent_name:'Kandice',
    conversation_id:'',
    ai_summary:'Returning sophomore wants to room with friends. Asked about the suite-matching process.',
    preferences:['Room with friends','High floor'], concerns:[] },
  { _demo:true, id:'sky_tour_chris', tour_id:'sky_tour_chris', lead_id:'sky_lead_chris', person_id:'sky_lead_chris',
    prospect_name:'Chris Vega', status:'requested', scheduled_for:_dSlot(0, 16, 0),
    phone:'(267) 555-0205', source:'Apartments.com', unit_type:'2x2 by-bed', unit_interest:'Bed in a 2-bed, private bath',
    move_in_date:'2026-08-20', budget:1350, reason_for_moving:'Grad student',
    first_response_at:_dAt(-1440), last_activity:_dAt(-90), assigned_agent_name:'Katie',
    conversation_id:'',
    ai_summary:'Grad student wants a private bath in a 2-bed. Just inquired today, early.',
    preferences:['Private bath','Quiet'], concerns:[] },
  // tomorrow
  { _demo:true, id:'sky_tour_dana', tour_id:'sky_tour_dana', lead_id:'sky_lead_dana', person_id:'sky_lead_dana',
    prospect_name:'Dana Wells', status:'confirmed_by_prospect', scheduled_for:_dSlot(1, 11, 0),
    phone:'(610) 555-0215', source:'University housing fair', unit_type:'4x4 by-bed', unit_interest:'Bed in a 4-bed',
    move_in_date:'2026-08-20', budget:1150, reason_for_moving:'Incoming freshman',
    first_response_at:_dAt(-17280), last_activity:_dAt(-1440), assigned_agent_name:'Kandice',
    conversation_id:'',
    ai_summary:'Incoming freshman, parents involved in the decision. Cares about safety and the shuttle.',
    preferences:['Safety','Shuttle'], concerns:['Parents deciding'] },
  // day after
  { _demo:true, id:'sky_tour_kofi', tour_id:'sky_tour_kofi', lead_id:'sky_lead_kofi', person_id:'sky_lead_kofi',
    prospect_name:'Kofi Mensah', status:'scheduled', scheduled_for:_dSlot(2, 13, 15),
    phone:'(215) 555-0225', source:'Instagram', unit_type:'2x2 by-bed', unit_interest:'Bed in a 2-bed',
    move_in_date:'2026-08-20', budget:1300, reason_for_moving:'Transfer student',
    first_response_at:_dAt(-4320), last_activity:_dAt(-2880), assigned_agent_name:'Katie',
    conversation_id:'',
    ai_summary:'Transfer student comparing a few buildings. Responsive, cares about price and the gym.',
    preferences:['Price','Gym'], concerns:[] }
  ],
};

window.__FOLLOWUPS_LIBRARY = {
  "9e2bb96e-08e2-41db-81c2-91055ceb50a3": [
  { _demo:true, id:'solo_ft_renee', tour_id:'solo_tour_renee', person_id:'solo_lead_renee', conversation_id:'demo_conv_renee',
    prospect_name:'Renee Park', status:'completed', toured_at:_dAt(-1440), last_activity:_dAt(-1380),
    no_response:true, next_action:'Send post-tour follow-up',
    phone:'(215) 555-0241', source:'Website', unit_type:'1 Bed / 1 Bath', unit_interest:'1 bed, higher floor',
    move_in_date:'2026-08-01', budget:2100, reason_for_moving:'Relocating for a new job downtown',
    first_response_at:_dAt(-10080), assigned_agent_name:'Jessica',
    ai_summary:'Toured a 1 bed and liked the layout and light. Relocating for work in August. Went quiet after the tour — a follow-up with the specific units she liked should re-engage her.',
    preferences:['Higher floor','Natural light','In-unit laundry'], concerns:['Commute time'] },
  { _demo:true, id:'solo_ft_marco', tour_id:'solo_tour_marco', person_id:'solo_lead_marco', conversation_id:'demo_conv_marco',
    prospect_name:'Marco Diaz', status:'completed', toured_at:_dAt(-2880), last_activity:_dAt(-2820),
    no_response:true, next_action:'Send post-tour follow-up',
    phone:'(267) 555-0256', source:'Referral', unit_type:'2 Bed / 2 Bath', unit_interest:'2 bed for a roommate situation',
    move_in_date:'2026-09-01', budget:2600, reason_for_moving:'Moving in with a roommate, referred by a resident',
    first_response_at:_dAt(-8640), assigned_agent_name:'Jessica',
    ai_summary:'Referred by a current resident. Toured a 2 bed for himself and a roommate. Interested but comparing one other building. Worth a follow-up that reinforces the referral and the amenities he liked.',
    preferences:['Two full baths','Parking','Gym'], concerns:['Comparing another building'] },
  { _demo:true, id:'solo_ft_hannah', tour_id:'solo_tour_hannah', person_id:'solo_lead_hannah', conversation_id:'demo_conv_hannah',
    prospect_name:'Hannah Lee', status:'completed', toured_at:_dAt(-4320), last_activity:_dAt(-1440),
    no_response:false, next_action:'Send the unit options they asked for',
    phone:'(610) 555-0263', source:'Apartments.com', unit_type:'Studio', unit_interest:'Studio, move-in ready',
    move_in_date:'2026-07-15', budget:1700, reason_for_moving:'Current lease ending, needs a quick move',
    first_response_at:_dAt(-5760), assigned_agent_name:'Jessica',
    ai_summary:'Toured a studio and is actively engaged — she replied and asked to see a couple of specific move-in-ready options. The next step is concrete: send the units she asked about. Hot and time-sensitive (July move).',
    preferences:['Move-in ready','Close to transit'], concerns:['Timing'] },
  { _demo:true, id:'solo_ft_andre', tour_id:'solo_tour_andre', person_id:'solo_lead_andre', conversation_id:'demo_conv_andre',
    prospect_name:'Andre Foster', status:'completed', toured_at:_dAt(-2160), last_activity:_dAt(-300),
    no_response:false, next_action:'Send the application link',
    phone:'(215) 555-0271', source:'Website', unit_type:'1 Bed / 1 Bath', unit_interest:'1 bed, higher floor with a view',
    move_in_date:'2026-08-01', budget:2150, reason_for_moving:'New job downtown, wants a short commute',
    first_response_at:_dAt(-7200), assigned_agent_name:'Jessica',
    ai_summary:'Toured a 1 bed and loved the view and light. Ready to move — asked how to apply. Clear next step: send the application link today while he is warm.',
    preferences:['Higher floor','View','Natural light'], concerns:[] },
  { _demo:true, id:'solo_ft_bianca', tour_id:'solo_tour_bianca', person_id:'solo_lead_bianca', conversation_id:'demo_conv_bianca',
    prospect_name:'Bianca Rossi', status:'completed', toured_at:_dAt(-5760), last_activity:_dAt(-5700),
    no_response:true, next_action:'Send post-tour follow-up',
    phone:'(267) 555-0288', source:'Zillow', unit_type:'Studio', unit_interest:'Budget studio, move-in ready',
    move_in_date:'2026-09-15', budget:1650, reason_for_moving:'First place on her own',
    first_response_at:_dAt(-11520), assigned_agent_name:'Jessica',
    ai_summary:'Toured a studio and liked it but went quiet afterward. Price-conscious. A follow-up reinforcing value and any concession could re-engage her.',
    preferences:['Budget','Move-in ready'], concerns:['Price'] },
  { _demo:true, id:'solo_ft_devral', tour_id:'solo_tour_devral', person_id:'solo_lead_devral', conversation_id:'demo_conv_devral',
    prospect_name:'Devon Ral', status:'completed', toured_at:_dAt(-8640), last_activity:_dAt(-1440),
    no_response:false, next_action:'Set a follow-up time',
    phone:'(610) 555-0299', source:'Referral', unit_type:'2 Bed / 2 Bath', unit_interest:'2 bed for two roommates',
    move_in_date:'2026-09-01', budget:2700, reason_for_moving:'Moving in with a friend, referred by a resident',
    first_response_at:_dAt(-14400), assigned_agent_name:'Jessica',
    ai_summary:'Referred by a resident, toured a 2 bed with a roommate. Interested but still coordinating timing with the roommate. Worth pinning down a concrete follow-up time.',
    preferences:['Two full baths','Parking'], concerns:['Roommate timing'] }
  ],
  "skyline-1417": [
  { _demo:true, id:'sky_ft_leah', tour_id:'sky_tour_leah', person_id:'sky_lead_leah', conversation_id:'demo_conv_leah',
    prospect_name:'Leah Brooks', status:'completed', toured_at:_dAt(-2160), last_activity:_dAt(-2000),
    no_response:true, next_action:'Send post-tour follow-up',
    phone:'(267) 555-0148', source:'University housing fair', unit_type:'4x4 by-bed', unit_interest:'Bed in a 4-bed suite',
    move_in_date:'2026-08-20', budget:1150, reason_for_moving:'Incoming junior, wants to live with friends',
    first_response_at:_dAt(-7200), assigned_agent_name:'Kandice',
    ai_summary:'Incoming junior who toured a 4-bed suite and liked it. Wants to room with two friends and asked about the suite-matching process. Warm but went quiet after the tour — needs a nudge with the application link.',
    preferences:['Room with friends','High floor','Study space'], concerns:['Roommate matching'] },
  { _demo:true, id:'sky_ft_andre', tour_id:'sky_tour_andre', person_id:'sky_lead_andre', conversation_id:'demo_conv_andre',
    prospect_name:'Andre Cole', status:'completed', toured_at:_dAt(-1440), last_activity:_dAt(-1380),
    no_response:true, next_action:'Send post-tour follow-up',
    phone:'(215) 555-0137', source:'Apartments.com', unit_type:'2x2 by-bed', unit_interest:'Bed in a 2-bed, 118-A',
    move_in_date:'2026-08-20', budget:1250, reason_for_moving:'Returning sophomore moving off-campus',
    first_response_at:_dAt(-5760), assigned_agent_name:'Katie',
    ai_summary:'Sophomore who toured the 118-A bed with Katie and seemed genuinely interested. Asked whether the bed could be held while he decides. No reply to the post-tour check-in yet — a hold offer would likely move him.',
    preferences:['Quiet floor','Close to shuttle'], concerns:['Price'] }
  ],
};

window.__APPS_LIBRARY = {
  "9e2bb96e-08e2-41db-81c2-91055ceb50a3": [
  { id:'solo_app_dani', applicant_name:'Dani Alvarez', unit_label:'0612', status:'active', conversation_id:'demo_conv_jordan', next_action:'Application in progress — collecting docs', updated_at:_dAt(-600) },
  { id:'solo_app_tomas', applicant_name:'Tomás Ruiz', unit_label:'0301', status:'tenant_signed', signed_at:_dAt(-180), next_action:'Awaiting manager countersign', updated_at:_dAt(-180) },
  // Pending applications (incomplete / approved-not-yet-leased)
  { id:'solo_app_bri', applicant_name:'Bri Coleman', unit_label:'0418', status:'submitted', conversation_id:'demo_conv_app_bri', next_action:'Missing proof of income — nudge', updated_at:_dAt(-1440),
    phone:'(215) 555-0142', source:'Apartments.com', unit_interest:'0418', move_in_date:'2026-07-15', budget:1850,
    ai_summary:'Application submitted but stalled on proof of income. Responsive at first, has gone quiet on the document request.', preferences:['In-unit laundry'], concerns:[] },
  { id:'solo_app_kev', applicant_name:'Kevin Asante', unit_label:'0725', status:'submitted', conversation_id:'demo_conv_app_kev', next_action:'Co-signer form outstanding — sitting 9 days', updated_at:_dAt(-12960),
    phone:'(267) 555-0155', source:'Zillow', unit_interest:'0725', move_in_date:'2026-08-01', budget:1780,
    ai_summary:'Co-signer form has been outstanding for over a week. Two reminders sent, no reply. At risk of going cold.', preferences:['High floor'], concerns:['Co-signer paperwork'] },
  { id:'solo_app_mara', applicant_name:'Mara Singh', unit_label:'0510', status:'approved', conversation_id:'demo_conv_app_mara', next_action:'Approved — prepare the lease', updated_at:_dAt(-720),
    phone:'(215) 555-0166', source:'Walk-in', unit_interest:'0510', move_in_date:'2026-07-20', budget:1900,
    ai_summary:'Approved and ready — just needs the lease drafted and sent. Eager, asked twice when she can sign.', preferences:[], concerns:[] },
  { id:'solo_app_derek', applicant_name:'Derek Olsen', unit_label:'0233', status:'submitted', conversation_id:'demo_conv_app_derek', next_action:'Background check pending 5 days', updated_at:_dAt(-7200),
    phone:'(484) 555-0177', source:'Apartments.com', unit_interest:'0233', move_in_date:'2026-08-10', budget:1695,
    ai_summary:'Background check has been pending five days on the screening vendor. Applicant has asked for a status update.', preferences:['Pet-friendly'], concerns:[] },
  { id:'solo_app_tasha', applicant_name:'Tasha Greene', unit_label:'0644', status:'approved', conversation_id:'demo_conv_app_tasha', next_action:'Approved 3 weeks ago — lease never sent', updated_at:_dAt(-30240),
    phone:'(215) 555-0188', source:'Referral', unit_interest:'0644', move_in_date:'2026-07-01', budget:2050,
    ai_summary:'Approved three weeks ago but the lease was never sent — fell through the cracks. She has followed up twice. Urgent to recover before she walks.', preferences:[], concerns:['Long wait since approval'] },
  // Pending leases (sent, awaiting signature)
  { id:'solo_app_jdean', applicant_name:'Jordan Dean', unit_label:'0903', status:'lease_ready', conversation_id:'demo_conv_lease_jdean', next_action:'Lease sent 2 days ago — remind', updated_at:_dAt(-2880),
    phone:'(610) 555-0199', source:'Zillow', unit_interest:'0903', move_in_date:'2026-07-25', budget:1825,
    ai_summary:'Lease sent two days ago. Opened it, said he is reviewing with a roommate. Warm — a nudge should close it.', preferences:[], concerns:[] },
  { id:'solo_app_elise', applicant_name:'Elise Moreau', unit_label:'0207', status:'lease_ready', conversation_id:'demo_conv_lease_elise', next_action:'Lease out for signature — follow up', updated_at:_dAt(-1440),
    phone:'(215) 555-0210', source:'Walk-in', unit_interest:'0207', move_in_date:'2026-08-05', budget:1690,
    ai_summary:'Lease out for signature since yesterday. Hesitating on the move-in date — wants a few days flexibility.', preferences:[], concerns:['Move-in timing'] },
  { id:'solo_app_marcus2', applicant_name:'Marcus Bell', unit_label:'0815', status:'lease_ready', conversation_id:'demo_conv_lease_marcus', next_action:'Lease sent 12 days ago — still unsigned', updated_at:_dAt(-17280),
    phone:'(267) 555-0221', source:'Apartments.com', unit_interest:'0815', move_in_date:'2026-07-18', budget:1950,
    ai_summary:'Lease has been sitting unsigned for twelve days. Said he would sign "this weekend" twice. Going cold — needs a firm hold-or-release.', preferences:[], concerns:['Slow to commit'] },
  { id:'solo_app_priyanka', applicant_name:'Priyanka Rao', unit_label:'0628', status:'lease_ready', conversation_id:'demo_conv_lease_priyanka', next_action:'Lease sent 24 days ago — at risk', updated_at:_dAt(-34560),
    phone:'(484) 555-0232', source:'Referral', unit_interest:'0628', move_in_date:'2026-07-10', budget:1880,
    ai_summary:'Lease unsigned for over three weeks. Last reply was two weeks ago citing a job decision. Likely lost unless re-engaged with a deadline.', preferences:[], concerns:['Pending job offer in another city'] }
  ],
  "skyline-1417": [
  { id:'sky_app_jia', applicant_name:'Jia Chen', unit_label:'214-B (bed)', status:'active', conversation_id:'demo_conv_priya', next_action:'By-bed application in progress', updated_at:_dAt(-500),
    phone:'(215) 555-0171', source:'Instagram', unit_type:'4x4 by-bed', unit_interest:'Bed in a 4-bed, 214-B',
    move_in_date:'2026-08-20', budget:1095, reason_for_moving:'Incoming freshman',
    ai_summary:'Freshman whose application is actively in progress for the 214-B bed. Engaged and quick to respond. Just needs to finish the remaining steps.',
    preferences:['Female suite','Near campus'], concerns:[] },
  { id:'sky_app_nadia', applicant_name:'Nadia Okafor', unit_label:'307-D (bed)', status:'tenant_signed', signed_at:_dAt(-240), conversation_id:'', next_action:'Awaiting manager countersign', updated_at:_dAt(-240),
    phone:'(610) 555-0182', source:'Referral', unit_type:'4x4 by-bed', unit_interest:'Bed in a 4-bed, 307-D',
    move_in_date:'2026-08-20', budget:1150, reason_for_moving:'Transfer student, referred by a current resident',
    ai_summary:'Signed her by-bed lease for 307-D — now waiting on the manager countersign to bind it. Nothing needed from her; the hold-up is internal.',
    preferences:['Quiet','Study space'], concerns:[] },
  { id:'sky_app_ty', applicant_name:'Ty Robinson', unit_label:'118-A (bed)', status:'submitted', conversation_id:'demo_conv_ty', next_action:'Guarantor info missing — nudge', updated_at:_dAt(-1440),
    phone:'(267) 555-0193', source:'Apartments.com', unit_type:'2x2 by-bed', unit_interest:'Bed in a 2-bed, 118-A',
    move_in_date:'2026-08-20', budget:1250, reason_for_moving:'Returning sophomore',
    first_response_at:_dAt(-5760), assigned_agent_name:'Kandice',
    ai_summary:'Application submitted for the 118-A bed but stalled — his guarantor (his father) information never came through. Jessica started it; Kandice has taken it over and is waiting on the guarantor name and email to push it to approval.',
    preferences:['Quiet floor','Private bath'], concerns:['Guarantor paperwork'] },
  { id:'sky_app_mei', applicant_name:'Mei Tanaka', unit_label:'402-C (bed)', status:'lease_ready', conversation_id:'demo_conv_mei', next_action:'By-bed lease out for signature', updated_at:_dAt(-2880),
    phone:'(215) 555-0190', source:'Instagram', unit_type:'4x4 by-bed', unit_interest:'Bed in a 4-bed suite, 402-C',
    move_in_date:'2026-08-20', budget:1175, reason_for_moving:'Returning sophomore, rooming with friends',
    first_response_at:_dAt(-11520), assigned_agent_name:'Kandice',
    ai_summary:'Approved and her lease for the 402-C bed is out for e-signature. She confirmed she would review it but has not signed yet. A resend of the link plus a quick reminder is the next move.',
    preferences:['Room with friends','High floor'], concerns:[] },
  // Aged pending applications (sitting longer — for the demo)
  { id:'sky_app_andre', applicant_name:'Andre Cole', unit_label:'215-B (bed)', status:'submitted', conversation_id:'demo_conv_app_andre', next_action:'ID verification pending 8 days', updated_at:_dAt(-11520),
    phone:'(267) 555-0201', source:'Apartments.com', unit_type:'4x4 by-bed', unit_interest:'Bed in a 4-bed, 215-B',
    move_in_date:'2026-08-20', budget:1095, reason_for_moving:'Incoming junior',
    ai_summary:'ID verification has been pending eight days — the upload failed twice. He has asked what is holding it up. Needs a working link and a personal nudge.',
    preferences:['Near shuttle'], concerns:['Upload trouble'] },
  { id:'sky_app_leah', applicant_name:'Leah Brooks', unit_label:'118-D (bed)', status:'approved', conversation_id:'demo_conv_app_leah', next_action:'Approved 16 days ago — lease not sent', updated_at:_dAt(-23040),
    phone:'(610) 555-0212', source:'Referral', unit_type:'2x2 by-bed', unit_interest:'Bed in a 2-bed, 118-D',
    move_in_date:'2026-08-15', budget:1250, reason_for_moving:'Transfer student',
    ai_summary:'Approved over two weeks ago but the lease was never generated. She followed up asking if the bed is still hers. At risk — recover before she takes another place.',
    preferences:['Private bath'], concerns:['Long silence since approval'] },
  // Aged pending leases (out for signature, going cold)
  { id:'sky_app_dwayne', applicant_name:'Dwayne Ellis', unit_label:'307-A (bed)', status:'lease_ready', conversation_id:'demo_conv_lease_dwayne', next_action:'Lease sent 10 days ago — unsigned', updated_at:_dAt(-14400),
    phone:'(215) 555-0223', source:'Instagram', unit_type:'4x4 by-bed', unit_interest:'Bed in a 4-bed, 307-A',
    move_in_date:'2026-08-20', budget:1095, reason_for_moving:'Returning sophomore',
    ai_summary:'Lease out ten days, still unsigned. Said he was "waiting on roommate confirmation." The suite is filling — needs a hold-or-release deadline.',
    preferences:['Room with friends'], concerns:['Waiting on roommates'] },
  { id:'sky_app_simone', applicant_name:'Simone Adler', unit_label:'409-C (bed)', status:'lease_ready', conversation_id:'demo_conv_lease_simone', next_action:'Lease sent 21 days ago — at risk', updated_at:_dAt(-30240),
    phone:'(484) 555-0234', source:'Apartments.com', unit_type:'4x4 by-bed', unit_interest:'Bed in a 4-bed, 409-C',
    move_in_date:'2026-08-20', budget:1150, reason_for_moving:'Incoming junior, out-of-state',
    ai_summary:'Lease unsigned for three weeks. Last reply two weeks ago said she was comparing options. Likely lost without a firm deadline and a reason to commit now.',
    preferences:['Quiet'], concerns:['Comparing other buildings'] }
  ],
};

/* Tour + application conversation threads (renewal threads are separate, above).
   Merged into DEMO_TOUR_THREADS at boot so the Person Card resolves them. */
window.__TOUR_THREADS = {
  demo_conv_jordan:{ conversation_id:'demo_conv_jordan',
    ai_suggested_reply:"Hi Jordan, looking forward to seeing you at 2 — I've set aside two higher-floor units on the quiet side with great light.",
    messages:[
      {sender_type:'ai', body:"Hi Jordan! This is the leasing assistant at The Felix. Saw you're interested in a 2 bed for August — I have a few with great natural light. Want to come tour this week?", created_at:_demoAt(-2880)},
      {sender_type:'prospect', body:"Yeah that could work. Ideally a higher floor — I'm pretty sensitive to street noise.", created_at:_demoAt(-2875)},
      {sender_type:'ai', body:"Got it — higher floor, quiet side. Does Thursday at 2pm work?", created_at:_demoAt(-2874)},
      {sender_type:'prospect', body:"Thursday at 2 works.", created_at:_demoAt(-2870)},
      {sender_type:'ai', body:"Perfect, you're booked for Thursday at 2pm. I'll text a reminder the morning of.", created_at:_demoAt(-2869)}
    ]},
  demo_conv_priya:{ conversation_id:'demo_conv_priya',
    ai_suggested_reply:"Hi Priya, thanks for coming by today! Want me to send over the soonest-available studios so you can lock in that July move?",
    messages:[
      {sender_type:'prospect', body:"Hi — how soon could I actually move into a studio? My lease is up July 15.", created_at:_demoAt(-1440)},
      {sender_type:'ai', body:"Hi Priya! We have a couple of studios that could be ready before July 15. Want to tour today or tomorrow?", created_at:_demoAt(-1438)},
      {sender_type:'prospect', body:"Today if there's anything open.", created_at:_demoAt(-1435)},
      {sender_type:'ai', body:"Done — I booked you for this afternoon. See you then!", created_at:_demoAt(-1433)}
    ]},
  demo_conv_marcus:{ conversation_id:'demo_conv_marcus',
    ai_suggested_reply:"Hi Marcus, glad your friend sent you our way! I'll have the best views ready to show — any must-have amenities I should highlight?",
    messages:[
      {sender_type:'prospect', body:"My friend lives in your building and said I should check it out. What's the view like on the higher 1 beds?", created_at:_demoAt(-360)},
      {sender_type:'ai', body:"Hi Marcus! The upper 1 beds have some of the best views in the building. Want to come see a few? I'm flexible this week.", created_at:_demoAt(-358)},
      {sender_type:'prospect', body:"Sure, sometime in the next few days. I care about the gym and rooftop too.", created_at:_demoAt(-355)},
      {sender_type:'ai', body:"Great — I'll make sure we walk the gym and rooftop. Booking you in now.", created_at:_demoAt(-353)}
    ]},
  demo_conv_whitfield:{ conversation_id:'demo_conv_whitfield',
    messages:[
      {sender_type:'ai', body:"Hi! Confirming your 2 bed tour. Looking forward to meeting you both.", created_at:_demoAt(-1560)},
      {sender_type:'prospect', body:"Thanks — we'll be there. Still waiting to hear on a job, but we want to see it.", created_at:_demoAt(-1555)},
      {sender_type:'agent', body:"Great meeting you today! No rush — reach out whenever you hear back and we'll pick it up from there.", created_at:_demoAt(-1490)}
    ]},
  // ── POST-TOUR · no response yet (Andre) — AI booked it, Katie gave the tour and followed up, silence since ──
  demo_conv_andre:{ conversation_id:'demo_conv_andre',
    ai_suggested_reply:"Hi Andre, it's Katie at Skyline — just checking in after your tour. Want me to hold the 118-A bed for you while you decide?",
    messages:[
      {sender_type:'ai', sender_name:'AI assistant', body:"Hi Andre! This is the leasing assistant at Skyline. You asked about a bed in a 2-bed — I can get you in to see one this week. What day works?", created_at:_demoAt(-2880)},
      {sender_type:'prospect', sender_name:'Andre', body:"Thursday afternoon could work.", created_at:_demoAt(-2875)},
      {sender_type:'ai', sender_name:'AI assistant', body:"Booked you Thursday at 3pm. Katie will meet you in the leasing office.", created_at:_demoAt(-2870)},
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Andre, great meeting you today! Let me know if you have any questions about the suite — happy to hold it for a couple days.", created_at:_demoAt(-1380)}
    ]},
  // ── POST-TOUR · no response yet (Leah) — AI booked, Kandice gave the tour and sent the recap, no reply ──
  demo_conv_leah:{ conversation_id:'demo_conv_leah',
    ai_suggested_reply:"Hi Leah, it's Kandice — wanted to follow up on the 4-bed you toured. Should I send over the application link so you can lock in your spot?",
    messages:[
      {sender_type:'ai', sender_name:'AI assistant', body:"Hi Leah! Saw you're interested in a bed in a 4-bed suite for the fall. Want to come tour this week?", created_at:_demoAt(-3000)},
      {sender_type:'prospect', sender_name:'Leah', body:"Yes! I'd love to see the suite and meet potential roommates if possible.", created_at:_demoAt(-2990)},
      {sender_type:'ai', sender_name:'AI assistant', body:"You're set for Wednesday at 1pm. Kandice will walk you through the suite-matching too.", created_at:_demoAt(-2985)},
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"So glad you came by, Leah! Here's a quick recap — the 4-bed on the high floor is still open, and I can start your suite match whenever you're ready.", created_at:_demoAt(-2000)}
    ]},
  // ── APPLICATION STALLED (Ty) — guarantor info missing. Shows a HAND-OFF: the original
  //    agent (Jessica) left; Kandice picked the thread up. The attribution makes the jump visible. ──
  demo_conv_ty:{ conversation_id:'demo_conv_ty',
    ai_suggested_reply:"Hi Ty, it's Kandice picking up your application from Jessica. We just need your guarantor's info to move forward — can you send their name and email?",
    messages:[
      {sender_type:'agent', sender_name:'Jessica', sender_role:'leasing', body:"Hi Ty! Thanks for applying for the 118-A bed. Your application's in — last thing we need is your guarantor's details to finish it up.", created_at:_demoAt(-4320)},
      {sender_type:'prospect', sender_name:'Ty', body:"Okay, my dad's going to be the guarantor. I'll get you his info.", created_at:_demoAt(-4200)},
      {sender_type:'agent', sender_name:'Jessica', sender_role:'leasing', body:"Perfect — just reply here with his name and email whenever you have it.", created_at:_demoAt(-4180)},
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Hi Ty, this is Kandice — I'm taking over your application from Jessica. Still just need your guarantor's name and email to get you approved. Can you send it over?", created_at:_demoAt(-1440)}
    ]},
  // ── LEASE SENT · awaiting signature (Mei) — lease out, reminder sent, not signed yet ──
  demo_conv_mei:{ conversation_id:'demo_conv_mei',
    ai_suggested_reply:"Hi Mei, it's Kandice — your lease for the 402-C bed is still waiting on your e-signature. Want me to resend the link?",
    messages:[
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Hi Mei! Great news — you're approved for the 402-C bed. I just sent your lease over for e-signature.", created_at:_demoAt(-2880)},
      {sender_type:'prospect', sender_name:'Mei', body:"Awesome, thank you! I'll look it over tonight.", created_at:_demoAt(-2870)},
      {sender_type:'ai', sender_name:'AI assistant', body:"Friendly reminder, Mei — your lease for 402-C is ready to sign. It only takes a minute on your phone. Let us know if you have any questions!", created_at:_demoAt(-1440)}
    ]},
  // ── SOLO follow-ups (by-unit). Jessica is Solo's leasing coordinator. ──
  demo_conv_renee:{ conversation_id:'demo_conv_renee',
    ai_suggested_reply:"Hi Renee, it's Jessica at Solo — wanted to follow up after your tour. I have two higher-floor 1-beds with great light I think you'd love. Want me to send them over?",
    messages:[
      {sender_type:'ai', sender_name:'AI assistant', body:"Hi Renee! Saw you're interested in a 1 bed for August. I can get you in to tour this week — what day works?", created_at:_demoAt(-3000)},
      {sender_type:'prospect', sender_name:'Renee', body:"This week works. I'd prefer a higher floor if possible — better light.", created_at:_demoAt(-2995)},
      {sender_type:'ai', sender_name:'AI assistant', body:"Booked you for Tuesday at 11am. Jessica will show you a couple of higher-floor options.", created_at:_demoAt(-2990)},
      {sender_type:'agent', sender_name:'Jessica', sender_role:'leasing', body:"So good meeting you today, Renee! Let me know your thoughts on the two 1-beds — happy to answer anything about the lease or move-in.", created_at:_demoAt(-1380)}
    ]},
  demo_conv_marco:{ conversation_id:'demo_conv_marco',
    ai_suggested_reply:"Hi Marco, it's Jessica — great having you and your roommate tour. The 2-bed you liked is still available. Want me to hold it while you two decide?",
    messages:[
      {sender_type:'ai', sender_name:'AI assistant', body:"Hi Marco! You were referred by one of our residents — welcome. You mentioned a 2 bed for you and a roommate. Want to come see one?", created_at:_demoAt(-4000)},
      {sender_type:'prospect', sender_name:'Marco', body:"Yes! We're comparing a couple places but would love to see yours.", created_at:_demoAt(-3995)},
      {sender_type:'ai', sender_name:'AI assistant', body:"You're set for Saturday at 1pm. Jessica will walk you both through a 2-bed with two full baths.", created_at:_demoAt(-3990)},
      {sender_type:'agent', sender_name:'Jessica', sender_role:'leasing', body:"Thanks for coming by with your roommate today! The 2-bed you liked is still open — just say the word and I can hold it for you both.", created_at:_demoAt(-2820)}
    ]},
  demo_conv_hannah:{ conversation_id:'demo_conv_hannah',
    ai_suggested_reply:"Hi Hannah, it's Jessica — here are the two move-in-ready studios you asked about. Both can be ready before July 15. Want to grab one?",
    messages:[
      {sender_type:'prospect', sender_name:'Hannah', body:"Hi — my lease is up July 15 so I need to move fast. What studios could actually be ready by then?", created_at:_demoAt(-4320)},
      {sender_type:'ai', sender_name:'AI assistant', body:"Hi Hannah! We have a few move-in-ready studios that could work. Want to tour one this week?", created_at:_demoAt(-4315)},
      {sender_type:'agent', sender_name:'Jessica', sender_role:'leasing', body:"Great meeting you today! You asked to see a couple of specific move-in-ready options — I'm pulling those together now and will send them right over.", created_at:_demoAt(-1440)},
      {sender_type:'prospect', sender_name:'Hannah', body:"Perfect, thank you! Looking forward to seeing them.", created_at:_demoAt(-1435)}
    ]},
  // ── Jia (Skyline) — toured today 10:15, confirmed pre-tour. Katie is hosting. ──
  demo_conv_jia:{ conversation_id:'demo_conv_jia',
    ai_suggested_reply:"Hi Jia, it's Katie — great meeting you at the tour today! Want me to send over the application link for the 4-bed suite while the spot's open?",
    messages:[
      {sender_type:'ai', sender_name:'AI assistant', body:"Hi Jia! Saw you're interested in a bed in a 4-bed female suite for the fall. I can get you in to tour this week — what day works?", created_at:_demoAt(-2880)},
      {sender_type:'prospect', sender_name:'Jia', body:"This morning would be great if you have anything. I'd love to see the suite and meet the matching process.", created_at:_demoAt(-2875)},
      {sender_type:'ai', sender_name:'AI assistant', body:"You're booked for 10:15 today. Katie will walk you through the suite and the roommate-matching.", created_at:_demoAt(-2870)},
      {sender_type:'prospect', sender_name:'Jia', body:"See you then!", created_at:_demoAt(-2865)}
    ]},
  /* ── SOLO pending APPLICATION threads ── */
  demo_conv_app_bri:{ conversation_id:'demo_conv_app_bri',
    ai_suggested_reply:"Hi Bri, just need your proof of income to finish the 0418 application — a recent pay stub or offer letter works. Can you upload it here?",
    messages:[
      {sender_type:'agent', sender_name:'Jessica', sender_role:'leasing', body:"Hi Bri! Your application for 0418 is in — last thing we need is proof of income to finish it up.", created_at:_demoAt(-1500)},
      {sender_type:'prospect', sender_name:'Bri', body:"Sure, I'll send a pay stub over today.", created_at:_demoAt(-1460)},
      {sender_type:'agent', sender_name:'Jessica', sender_role:'leasing', body:"Perfect — just upload it through the application link whenever you're ready.", created_at:_demoAt(-1440)}
    ]},
  demo_conv_app_kev:{ conversation_id:'demo_conv_app_kev',
    ai_suggested_reply:"Hi Kevin, checking in again on the co-signer form for 0725 — it's the only thing holding up your approval. Want me to resend the link?",
    messages:[
      {sender_type:'agent', sender_name:'Jessica', sender_role:'leasing', body:"Hi Kevin! Your 0725 application looks great — we just need your co-signer to complete their portion.", created_at:_demoAt(-14400)},
      {sender_type:'prospect', sender_name:'Kevin', body:"Got it, my mom is co-signing. I'll have her fill it out this week.", created_at:_demoAt(-14000)},
      {sender_type:'agent', sender_name:'Jessica', sender_role:'leasing', body:"Following up — has your co-signer had a chance to complete the form? Happy to resend the link.", created_at:_demoAt(-7200)}
    ]},
  demo_conv_app_mara:{ conversation_id:'demo_conv_app_mara',
    ai_suggested_reply:"Hi Mara, great news — you're approved for 0510! I'm drafting your lease now and will have it over to you shortly.",
    messages:[
      {sender_type:'prospect', sender_name:'Mara', body:"Hi! Any update on my application for 0510? Excited to move forward.", created_at:_demoAt(-900)},
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Mara! You're approved 🎉 I'm preparing your lease now — should have it to you within a day.", created_at:_demoAt(-840)},
      {sender_type:'prospect', sender_name:'Mara', body:"Amazing, thank you! When can I sign?", created_at:_demoAt(-720)}
    ]},
  demo_conv_app_derek:{ conversation_id:'demo_conv_app_derek',
    ai_suggested_reply:"Hi Derek, your background check is still processing with our screening vendor — I'll let you know the moment it clears. Thanks for your patience.",
    messages:[
      {sender_type:'agent', sender_name:'Jessica', sender_role:'leasing', body:"Hi Derek! Your 0233 application is in and the background check is running. I'll update you as soon as it's back.", created_at:_demoAt(-8000)},
      {sender_type:'prospect', sender_name:'Derek', body:"Sounds good. Any idea how long that usually takes?", created_at:_demoAt(-7500)},
      {sender_type:'prospect', sender_name:'Derek', body:"Just checking in — any movement on the screening?", created_at:_demoAt(-7200)}
    ]},
  demo_conv_app_tasha:{ conversation_id:'demo_conv_app_tasha',
    ai_suggested_reply:"Hi Tasha, I'm so sorry for the delay — 0644 is still yours. I'm sending your lease right now and will personally make sure it's handled today.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Tasha! You're approved for 0644 — we'll get your lease over shortly.", created_at:_demoAt(-31000)},
      {sender_type:'prospect', sender_name:'Tasha', body:"Great! Looking forward to it.", created_at:_demoAt(-30000)},
      {sender_type:'prospect', sender_name:'Tasha', body:"Hi, following up — I haven't gotten the lease yet. Is everything okay?", created_at:_demoAt(-14400)},
      {sender_type:'prospect', sender_name:'Tasha', body:"Just checking in again — is 0644 still available? I need to lock something in soon.", created_at:_demoAt(-2880)}
    ]},
  /* ── SOLO pending LEASE threads ── */
  demo_conv_lease_jdean:{ conversation_id:'demo_conv_lease_jdean',
    ai_suggested_reply:"Hi Jordan, just checking in on the 0903 lease — happy to answer anything before you and your roommate sign. The unit's held for you.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Jordan! Your lease for 0903 is out for signature. Let me know if any questions come up.", created_at:_demoAt(-2900)},
      {sender_type:'prospect', sender_name:'Jordan', body:"Got it, thanks. Reviewing it with my roommate this week.", created_at:_demoAt(-2880)}
    ]},
  demo_conv_lease_elise:{ conversation_id:'demo_conv_lease_elise',
    ai_suggested_reply:"Hi Elise, no problem on the move-in date — we can build in a few days of flexibility. Want me to adjust it and resend so you can sign?",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Elise! Your 0207 lease is ready to sign. Anything I can clarify?", created_at:_demoAt(-1500)},
      {sender_type:'prospect', sender_name:'Elise', body:"It looks good — I'm just hoping for a little flexibility on the move-in date. Possible?", created_at:_demoAt(-1440)}
    ]},
  demo_conv_lease_marcus:{ conversation_id:'demo_conv_lease_marcus',
    ai_suggested_reply:"Hi Marcus, I want to make sure 0815 stays yours. Can you sign by Friday? If the timing's changed, just let me know and I'll release the hold.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Marcus! Your lease for 0815 is out for signature whenever you're ready.", created_at:_demoAt(-17500)},
      {sender_type:'prospect', sender_name:'Marcus', body:"Thanks! I'll get it signed this weekend.", created_at:_demoAt(-17000)},
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Just checking in — did you get a chance to sign the 0815 lease?", created_at:_demoAt(-8640)},
      {sender_type:'prospect', sender_name:'Marcus', body:"Sorry, busy week — I'll do it this weekend for sure.", created_at:_demoAt(-7200)}
    ]},
  demo_conv_lease_priyanka:{ conversation_id:'demo_conv_lease_priyanka',
    ai_suggested_reply:"Hi Priyanka, I know the job decision is up in the air. I can hold 0628 through Friday — after that I'll need to release it. Where are you leaning?",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Priyanka! Your lease for 0628 is ready. Let me know if you have questions.", created_at:_demoAt(-35000)},
      {sender_type:'prospect', sender_name:'Priyanka', body:"Thank you! I'm waiting to hear on a job — should know soon. Can you hold it a bit?", created_at:_demoAt(-34560)},
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Of course — checking in to see if you've heard anything on the job?", created_at:_demoAt(-20160)}
    ]},
  /* ── SKYLINE pending APPLICATION threads ── */
  demo_conv_app_andre:{ conversation_id:'demo_conv_app_andre',
    ai_suggested_reply:"Hi Andre, sorry the ID upload keeps failing — I've sent a fresh link that should work. Try it and I'll confirm the moment it comes through.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Andre! Your 215-B application is in — we just need a valid ID uploaded to verify.", created_at:_demoAt(-11600)},
      {sender_type:'prospect', sender_name:'Andre', body:"I tried twice but it keeps erroring out. Not sure what's wrong.", created_at:_demoAt(-11520)},
      {sender_type:'prospect', sender_name:'Andre', body:"Still can't get it to upload — can you help? Don't want to lose the bed.", created_at:_demoAt(-7200)}
    ]},
  demo_conv_app_leah:{ conversation_id:'demo_conv_app_leah',
    ai_suggested_reply:"Hi Leah, 118-D is still yours and I'm so sorry for the wait. Sending your lease today and I'll see it through personally.",
    messages:[
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Hi Leah! Great news — you're approved for the 118-D bed. Lease coming soon.", created_at:_demoAt(-24000)},
      {sender_type:'prospect', sender_name:'Leah', body:"Yay! Can't wait. Just let me know when to sign.", created_at:_demoAt(-23040)},
      {sender_type:'prospect', sender_name:'Leah', body:"Hi — is the 118-D bed still mine? Haven't seen the lease yet and I need to decide soon.", created_at:_demoAt(-4320)}
    ]},
  /* ── SKYLINE pending LEASE threads ── */
  demo_conv_lease_dwayne:{ conversation_id:'demo_conv_lease_dwayne',
    ai_suggested_reply:"Hi Dwayne, the 307-A suite is filling up. Can you sign by Wednesday to lock your bed? If your roommates aren't set, let's talk options.",
    messages:[
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Hi Dwayne! Your lease for the 307-A bed is out for signature.", created_at:_demoAt(-14500)},
      {sender_type:'prospect', sender_name:'Dwayne', body:"Thanks! Waiting on my roommates to confirm before I sign.", created_at:_demoAt(-14400)},
      {sender_type:'agent', sender_name:'Katie', sender_role:'leasing', body:"Following up — any word from your roommates? The suite is starting to fill.", created_at:_demoAt(-7200)}
    ]},
  demo_conv_lease_simone:{ conversation_id:'demo_conv_lease_simone',
    ai_suggested_reply:"Hi Simone, I'd love to keep 409-C for you but I can only hold it through Friday. What would help you decide between us and the others?",
    messages:[
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Hi Simone! Your lease for the 409-C bed is ready to sign whenever you are.", created_at:_demoAt(-30500)},
      {sender_type:'prospect', sender_name:'Simone', body:"Thanks — I'm comparing a couple of buildings before I commit.", created_at:_demoAt(-30240)},
      {sender_type:'agent', sender_name:'Kandice', sender_role:'leasing', body:"Totally understand! Anything I can answer to help you decide? Happy to hold the bed a little longer.", created_at:_demoAt(-20160)}
    ]}
};


/* ════════════════════════════════════════════════════════════════════════
   PROPERTY SPINE — MAINTENANCE + MISC DEMO LIBRARY  (slice 3)
   ════════════════════════════════════════════════════════════════════════
   DATA, not code. The maintenance operating set per property (work-order flow,
   supplies, vendors, compliance, real WO directory) plus a few singletons
   (lead analytics, rent trend, capital/IR demo). Compliance dates use the same
   isoAgo/isoAhead helpers index.html uses, defined locally below.

   The app READS:
     window.__WO_FLOW_LIBRARY[propertyId]      → four-bucket work-order flow
     window.__SUPPLY_LIBRARY[propertyId]       → supplies
     window.__VENDOR_LIBRARY[propertyId]       → vendor projects
     window.__COMPLIANCE_LIBRARY[propertyId]   → recurring compliance
     window.__REAL_WO_LIBRARY[propertyId]      → WO directory rows
     window.__LEAD_ANALYTICS / __RENT_TREND / __CAPITAL_DEMO  → singletons
   WHEN THE BACKEND GOES LIVE: replaced by maintenance + reporting queries.
   ════════════════════════════════════════════════════════════════════════ */

// Pure date helpers, local to this data file (match index.html).
if (typeof isoAgo === 'undefined')       { var isoAgo = function(mins){ return new Date(Date.now()-mins*60000).toISOString(); }; }
if (typeof isoAhead === 'undefined')     { var isoAhead = function(mins){ return new Date(Date.now()+mins*60000).toISOString(); }; }
if (typeof isoAheadDate === 'undefined') { var isoAheadDate = function(days){ var d=new Date(Date.now()+days*86400000); return d.toISOString().slice(0,10); }; }

window.__WO_FLOW_LIBRARY = {
  "9e2bb96e-08e2-41db-81c2-91055ceb50a3": [
  // ── NEEDS RESPONSE ── tenant not acknowledged yet. Emergencies first, then longest wait.
  { id:'WF-01', kind:'work_order', unit_number:'412', tenant_name:'Marcus Webb', title:'No heat, unit at 48°', description:'No heat — unit reading 48°F. Resident has an infant at home.', flow_bucket:'needs_response', field_category:'no_heat', responded:false, wait_label:'40 min ago', wait_minutes:40, status:'open', source:'sas', tenant_phone:'(215) 555-0142' },
  { id:'WF-02', kind:'work_order', unit_number:'207', tenant_name:'After-hours line', title:'Water coming through ceiling', description:'Active water intrusion through living-room ceiling, spreading.', flow_bucket:'needs_response', field_category:'active_leak', responded:false, wait_label:'1 hr ago', wait_minutes:60, status:'open', source:'sas', tenant_phone:'(215) 555-0199' },
  { id:'WF-03', kind:'work_order', unit_number:'318', tenant_name:'Dana Cole', title:'Garbage disposal jammed', description:'Kitchen garbage disposal jammed and humming, will not clear.', flow_bucket:'needs_response', field_category:'plumbing', responded:false, wait_label:'waiting 5 hrs', wait_minutes:300, status:'open', tenant_phone:'(215) 555-0107' },
  { id:'WF-04', kind:'work_order', unit_number:'503', tenant_name:'Priya Nair', title:'Outlet sparking', description:'Bedroom outlet sparked when plugging in a lamp; resident stopped using it.', flow_bucket:'needs_response', field_category:'electrical', responded:false, wait_label:'waiting 1 day', wait_minutes:1440, flow_aging:true, status:'open', tenant_phone:'(215) 555-0188' },
  { id:'WF-15', kind:'work_order', unit_number:'629', tenant_name:'Tara Nguyen', title:'Toilet overflowing', description:'Toilet overflowed and will not stop filling; water on the bathroom floor.', flow_bucket:'needs_response', field_category:'active_leak', responded:false, wait_label:'25 min ago', wait_minutes:25, status:'open', source:'sas', tenant_phone:'(215) 555-0211' },
  { id:'WF-16', kind:'work_order', unit_number:'144', tenant_name:'Wes Carter', title:'Front door lock jammed', description:'Resident locked out — deadbolt seized, key will not turn.', flow_bucket:'needs_response', field_category:'lockout', responded:false, wait_label:'2 hrs ago', wait_minutes:120, status:'open', source:'sas', tenant_phone:'(215) 555-0222' },
  { id:'WF-17', kind:'work_order', unit_number:'355', tenant_name:'Bianca Hall', title:'AC blowing warm', description:'Apartment not cooling; thermostat set to 68 but reading 80.', flow_bucket:'needs_response', field_category:'general', responded:false, wait_label:'waiting 8 hrs', wait_minutes:480, status:'open', tenant_phone:'(215) 555-0233' },

  // ── NEEDS A PLAN ── heard, but no confirmed next step. "What's missing" is the point.
  { id:'WF-05', kind:'work_order', unit_number:'221', tenant_name:'Liam Foster', title:'Bathroom fan dead', description:'Bathroom exhaust fan not running; moisture building up.', flow_bucket:'needs_plan', responded:true, wait_label:'2 days', flow_missing:'Tech not assigned', status:'open', tenant_phone:'(215) 555-0121' },
  { id:'WF-06', kind:'work_order', unit_number:'109', tenant_name:'Sofia Reyes', title:"Dishwasher won't drain", description:'Dishwasher leaves standing water; likely needs a part or vendor.', flow_bucket:'needs_plan', responded:true, wait_label:'3 days', flow_missing:'Vendor not selected', flow_aging:true, status:'open', tenant_phone:'(215) 555-0134' },
  { id:'WF-07', kind:'work_order', unit_number:'645', tenant_name:'Noah Kim', title:'Cabinet door off hinge', description:'Upper kitchen cabinet door detached; resident set it aside.', flow_bucket:'needs_plan', responded:true, wait_label:'4 days', flow_missing:'Not yet diagnosed', flow_aging:true, status:'open', tenant_phone:'(215) 555-0156' },
  { id:'WF-18', kind:'work_order', unit_number:'512', tenant_name:'Greg Patel', title:'Closet shelf collapsed', description:'Wire shelving pulled out of the wall; resident wants it re-anchored.', flow_bucket:'needs_plan', responded:true, wait_label:'2 days', flow_missing:'Tech not assigned', status:'open', tenant_phone:'(215) 555-0244' },
  { id:'WF-19', kind:'work_order', unit_number:'238', tenant_name:'Maya Cohen', title:'Water heater leaking', description:'Slow drip at the base of the water heater; needs assessment for repair vs replace.', flow_bucket:'needs_plan', responded:true, wait_label:'5 days', flow_missing:'Needs PM approval', flow_aging:true, status:'open', tenant_phone:'(215) 555-0255' },

  // ── IN PROGRESS ── real path, needs time. Shows what's happening + when + last tenant update.
  { id:'WF-08', kind:'work_order', unit_number:'302', tenant_name:'Ava Patel', title:'Broken bedroom window', description:'Cracked bedroom window pane; glass vendor engaged.', flow_bucket:'in_progress', responded:true, flow_now:'Glass vendor confirmed', flow_eta:'Install Thursday', flow_updated:'Tenant updated today', flow_update_due:false, status:'in_progress', tenant_phone:'(215) 555-0162' },
  { id:'WF-09', kind:'work_order', unit_number:'416', tenant_name:'Diego Santos', title:'Fridge not cooling', description:'Refrigerator not holding temperature; compressor part ordered.', flow_bucket:'in_progress', responded:true, flow_now:'Compressor ordered', flow_eta:'ETA Friday', flow_updated:'Tenant last updated 2 days ago', flow_update_due:true, status:'in_progress', tenant_phone:'(215) 555-0173' },
  { id:'WF-10', kind:'work_order', unit_number:'530', tenant_name:'Grace Liu', title:'Tub faucet drip', description:'Constant tub faucet drip; plumber scheduled to return.', flow_bucket:'in_progress', responded:true, flow_now:'Plumber returning', flow_eta:'Wed AM', flow_updated:'Updated yesterday', flow_update_due:false, status:'in_progress', tenant_phone:'(215) 555-0184' },
  { id:'WF-11', kind:'work_order', unit_number:'118', tenant_name:'Omar Haddad', title:'Hall light flickering', description:'Hallway light fixture flickering; electrician estimate approved.', flow_bucket:'in_progress', responded:true, flow_now:'Estimate approved', flow_eta:'Work Monday', flow_updated:'Tenant last updated 4 days ago', flow_update_due:true, status:'in_progress', tenant_phone:'(215) 555-0195' },
  { id:'WF-20', kind:'work_order', unit_number:'461', tenant_name:'Hannah Lee', title:'Disposal replacement', description:'Disposal seized beyond repair; new unit on order.', flow_bucket:'in_progress', responded:true, flow_now:'New disposal ordered', flow_eta:'Install Thursday', flow_updated:'Updated today', flow_update_due:false, status:'in_progress', tenant_phone:'(215) 555-0266' },
  { id:'WF-21', kind:'work_order', unit_number:'205', tenant_name:'Theo Walsh', title:'Mold in bathroom', description:'Mold along the shower ceiling; remediation vendor engaged.', flow_bucket:'in_progress', responded:true, flow_now:'Remediation scheduled', flow_eta:'Tuesday', flow_updated:'Tenant last updated 3 days ago', flow_update_due:true, status:'in_progress', tenant_phone:'(215) 555-0277' },

  // ── DONE ── complete, ready to confirm.
  { id:'WF-12', kind:'work_order', unit_number:'224', tenant_name:'Emma Brooks', title:'Leaking kitchen faucet', description:'Kitchen faucet dripping at the base.', flow_bucket:'done', flow_completed:'today 11:20a', resident_notified:true, status:'closed', completion_note:'Replaced cartridge and washer, ran water 5 min — no drip.', completion_photo:'stub' },
  { id:'WF-13', kind:'work_order', unit_number:'401', tenant_name:'Jack Turner', title:"Bedroom door won't latch", description:'Bedroom door not catching the strike.', flow_bucket:'done', flow_completed:'yesterday', resident_notified:true, status:'closed', completion_note:'Adjusted strike plate and tightened hinges; latch holds.', completion_photo:'stub' },
  { id:'WF-14', kind:'work_order', unit_number:'337', tenant_name:'Hana Yoshida', title:'Clogged bathroom sink', description:'Bathroom sink draining slowly.', flow_bucket:'done', flow_completed:'2 days ago', resident_notified:true, status:'closed', completion_note:'Snaked the line and tested; sink drains clear.', completion_photo:'stub' },
  { id:'WF-22', kind:'work_order', unit_number:'618', tenant_name:'Carlos Mendez', title:'Ceiling fan wobbling', description:'Bedroom ceiling fan wobbling badly.', flow_bucket:'done', flow_completed:'yesterday', resident_notified:true, status:'closed', completion_note:'Rebalanced blades and tightened the mount; runs smooth.', completion_photo:'stub' },
  { id:'WF-23', kind:'work_order', unit_number:'129', tenant_name:'Rachel Kim', title:'Smoke detector chirping', description:'Detector chirping on low battery.', flow_bucket:'done', flow_completed:'3 days ago', resident_notified:true, status:'closed', completion_note:'Replaced battery and tested all unit detectors.', completion_photo:'stub' },
  ],
  "skyline-1417": [
  // ── NEEDS RESPONSE ──
  { id:'WK-01', kind:'work_order', unit_number:'1417-308 Room2', tenant_name:'After-hours line', title:'No hot water — whole floor', description:'Multiple beds on the 3rd floor reporting no hot water; likely the shared heater.', flow_bucket:'needs_response', field_category:'no_hot_water', responded:false, wait_label:'35 min ago', wait_minutes:35, status:'open', source:'sas', tenant_phone:'(215) 555-0301' },
  { id:'WK-02', kind:'work_order', unit_number:'1417-115 Room1', tenant_name:'Jordan Pruitt', title:'Smell of gas in kitchen', description:'Resident reports a gas odor near the stove in the shared kitchen.', flow_bucket:'needs_response', field_category:'electrical', responded:false, wait_label:'15 min ago', wait_minutes:15, status:'open', source:'sas', tenant_phone:'(215) 555-0302' },
  { id:'WK-03', kind:'work_order', unit_number:'1417-204 Room3', tenant_name:'Aisha Bello', title:'Shower drain backing up', description:'Shared bathroom shower draining slowly and backing up.', flow_bucket:'needs_response', field_category:'plumbing', responded:false, wait_label:'waiting 6 hrs', wait_minutes:360, status:'open', tenant_phone:'(215) 555-0303' },
  { id:'WK-04', kind:'work_order', unit_number:'1417-410 Room2', tenant_name:'Devon Marsh', title:'Room door won\u2019t lock', description:'Bedroom door lock not engaging; resident concerned about security.', flow_bucket:'needs_response', field_category:'lockout', responded:false, wait_label:'waiting 1 day', wait_minutes:1440, flow_aging:true, status:'open', tenant_phone:'(215) 555-0304' },

  // ── NEEDS A PLAN ──
  { id:'WK-05', kind:'work_order', unit_number:'1417-117 Room4', tenant_name:'Lena Ortiz', title:'Window won\u2019t close', description:'Bedroom window stuck partly open; cold air coming in.', flow_bucket:'needs_plan', responded:true, wait_label:'2 days', flow_missing:'Tech not assigned', status:'open', tenant_phone:'(215) 555-0305' },
  { id:'WK-06', kind:'work_order', unit_number:'1417-205 Room1', tenant_name:'Theo Walsh', title:'Mini-fridge not cooling', description:'In-room mini-fridge stopped cooling; food spoiling.', flow_bucket:'needs_plan', responded:true, wait_label:'3 days', flow_missing:'Replacement vs repair undecided', flow_aging:true, status:'open', tenant_phone:'(215) 555-0306' },
  { id:'WK-07', kind:'work_order', unit_number:'1417-312 Room3', tenant_name:'Priya Nair', title:'Bed frame broken', description:'Provided bed frame cracked at the rail; needs replacement part.', flow_bucket:'needs_plan', responded:true, wait_label:'4 days', flow_missing:'Part not ordered', flow_aging:true, status:'open', tenant_phone:'(215) 555-0307' },
  { id:'WK-08', kind:'work_order', unit_number:'1417-101 Lounge', tenant_name:'Common area', title:'Laundry machine out of service', description:'One of two shared washers not draining; residents reporting it.', flow_bucket:'needs_plan', responded:true, wait_label:'2 days', flow_missing:'Vendor not selected', status:'open', tenant_phone:'' },

  // ── IN PROGRESS ──
  { id:'WK-09', kind:'work_order', unit_number:'1417-115 Room3', tenant_name:'Marcus Webb', title:'Heater making noise', description:'In-room heater rattling loudly; HVAC tech engaged.', flow_bucket:'in_progress', responded:true, flow_now:'HVAC tech scheduled', flow_eta:'Wednesday', flow_updated:'Updated today', flow_update_due:false, status:'in_progress', tenant_phone:'(215) 555-0308' },
  { id:'WK-10', kind:'work_order', unit_number:'1417-308 Room1', tenant_name:'Ty Robinson', title:'Ceiling leak from above', description:'Water staining the ceiling; traced to the unit above, plumber engaged.', flow_bucket:'in_progress', responded:true, flow_now:'Plumber diagnosing upstairs', flow_eta:'ETA Thursday', flow_updated:'Tenant last updated 2 days ago', flow_update_due:true, status:'in_progress', tenant_phone:'(215) 555-0309' },
  { id:'WK-11', kind:'work_order', unit_number:'1417-410 Room4', tenant_name:'Mei Tanaka', title:'Light fixture flickering', description:'Bedroom light flickering; electrician estimate approved.', flow_bucket:'in_progress', responded:true, flow_now:'Estimate approved', flow_eta:'Monday', flow_updated:'Tenant last updated 4 days ago', flow_update_due:true, status:'in_progress', tenant_phone:'(215) 555-0310' },

  // ── DONE ──
  { id:'WK-12', kind:'work_order', unit_number:'1417-117 Room1', tenant_name:'Andre Cole', title:'Clogged sink', description:'Shared bathroom sink draining slowly.', flow_bucket:'done', flow_completed:'today 9:40a', resident_notified:true, status:'closed', completion_note:'Cleared the trap and tested; drains clear.', completion_photo:'stub' },
  { id:'WK-13', kind:'work_order', unit_number:'1417-205 Room2', tenant_name:'Leah Brooks', title:'Desk lamp outlet dead', description:'Outlet at the desk not working.', flow_bucket:'done', flow_completed:'yesterday', resident_notified:true, status:'closed', completion_note:'Reset the tripped GFCI and confirmed power restored.', completion_photo:'stub' },
  { id:'WK-14', kind:'work_order', unit_number:'1417-312 Room1', tenant_name:'Sam Okafor', title:'Door handle loose', description:'Bedroom door handle loose.', flow_bucket:'done', flow_completed:'2 days ago', resident_notified:true, status:'closed', completion_note:'Tightened the set screw and lubricated the latch.', completion_photo:'stub' },
  ],
};

window.__SUPPLY_LIBRARY = {
  "9e2bb96e-08e2-41db-81c2-91055ceb50a3": [
  { id:'SR-101', item_name:'Furnace igniter', unit_label:'412', quantity:1, status:'ordered',   vendor_name:'Grainger',          next_action:'Receive — ETA Wed', work_order_id:'WF-01', eta:'Wed' },
  { id:'SR-102', item_name:'Garbage disposal flange kit', unit_label:'318', quantity:1, status:'requested', vendor_name:'', next_action:'Approve / order', work_order_id:'WF-03' },
  { id:'SR-103', item_name:'GFCI outlet + cover plate', unit_label:'503', quantity:2, status:'ordered', vendor_name:'Home Depot', next_action:'Receive — out for delivery', work_order_id:'WF-04', eta:'today' },
  { id:'SR-104', item_name:'Interior paint — Swiss Coffee', unit_label:'221', quantity:2, status:'received', vendor_name:'Sherwin-Williams', next_action:'In stock — ready for turn' },
  { id:'SR-105', item_name:'Refrigerator compressor', unit_label:'416', quantity:1, status:'ordered', vendor_name:'Marcone', next_action:'Receive — ETA Fri', work_order_id:'WF-09', eta:'Fri' },
  { id:'SR-106', item_name:'Bathroom exhaust fan motor', unit_label:'221', quantity:1, status:'blocked', vendor_name:'Grainger', next_action:'Backordered — find alt vendor' },
  { id:'SR-107', item_name:'HVAC filters (case)', unit_label:'Building', quantity:1, status:'requested', vendor_name:'', next_action:'Approve / order — monthly stock' },
  { id:'SR-108', item_name:'Water heater (40 gal)', unit_label:'238', quantity:1, status:'requested', vendor_name:'Ferguson', next_action:'Approve — needs PM sign-off', work_order_id:'WF-19' },
  { id:'SR-109', item_name:'Closet shelving kit', unit_label:'512', quantity:1, status:'ordered', vendor_name:'Home Depot', next_action:'Receive — ETA Thu', work_order_id:'WF-18', eta:'Thu' },
  { id:'SR-110', item_name:'Smoke detector batteries (24)', unit_label:'Building', quantity:1, status:'received', vendor_name:'Grainger', next_action:'In stock' },
  ],
  "skyline-1417": [
  { id:'SK-SR-1', item_name:'Shared water heater igniter', unit_label:'3rd floor', quantity:1, status:'ordered', vendor_name:'Grainger', next_action:'Receive — ETA Wed', work_order_id:'WK-01', eta:'Wed' },
  { id:'SK-SR-2', item_name:'Mini-fridge (replacement)', unit_label:'1417-205 Room1', quantity:1, status:'requested', vendor_name:'', next_action:'Approve / order', work_order_id:'WK-06' },
  { id:'SK-SR-3', item_name:'Bed frame rail + hardware', unit_label:'1417-312 Room3', quantity:1, status:'requested', vendor_name:'Wayfair', next_action:'Approve / order', work_order_id:'WK-07' },
  { id:'SK-SR-4', item_name:'Door lockset', unit_label:'1417-410 Room2', quantity:1, status:'ordered', vendor_name:'Home Depot', next_action:'Receive — out for delivery', work_order_id:'WK-04', eta:'today' },
  { id:'SK-SR-5', item_name:'Interior paint — flat white (5 gal)', unit_label:'Stock', quantity:1, status:'received', vendor_name:'Sherwin-Williams', next_action:'In stock — turn supply' },
  { id:'SK-SR-6', item_name:'Washer drain pump', unit_label:'Laundry', quantity:1, status:'blocked', vendor_name:'Marcone', next_action:'Backordered — find alt vendor', work_order_id:'WK-08' },
  { id:'SK-SR-7', item_name:'Window crank handles (set)', unit_label:'1417-117 Room4', quantity:2, status:'requested', vendor_name:'', next_action:'Approve / order', work_order_id:'WK-05' },
  { id:'SK-SR-8', item_name:'HVAC filters (case)', unit_label:'Building', quantity:1, status:'ordered', vendor_name:'Grainger', next_action:'Receive — ETA Fri', eta:'Fri' },
  ],
};

window.__VENDOR_LIBRARY = {
  "9e2bb96e-08e2-41db-81c2-91055ceb50a3": [
  { id:'VP-201', vendor_name:'ClearView Glass',     trade:'Glazing',       status:'scheduled',    next_action:'Install Thursday — confirm access', linked:'WO 302 · broken window', phone:'(215) 555-0231' },
  { id:'VP-202', vendor_name:'Drain Tech Plumbing', trade:'Plumbing',      status:'in_progress',  next_action:'Return visit Wed AM',               linked:'WO 530 · tub faucet',     phone:'(215) 555-0244' },
  { id:'VP-203', vendor_name:'Volt Electric',       trade:'Electrical',    status:'approved',     next_action:'Schedule — estimate approved',       linked:'WO 118 · hall light',     phone:'(215) 555-0255' },
  { id:'VP-204', vendor_name:'Reyes Appliance',     trade:'Appliance',     status:'needs_quote',  next_action:'Get quote — dishwasher',             linked:'WO 109 · dishwasher',     phone:'(215) 555-0266' },
  { id:'VP-205', vendor_name:'Keystone Roofing',    trade:'Roofing',       status:'invoice',      next_action:'Review invoice — $4,180',            linked:'Building · roof patch',   phone:'(215) 555-0277' },
  { id:'VP-206', vendor_name:'AAA Pest Control',    trade:'Pest',          status:'coi_expiring', next_action:'COI expires in 9 days — request renewal', linked:'Building · monthly service', phone:'(215) 555-0288' },
  { id:'VP-207', vendor_name:'Citywide HVAC',       trade:'HVAC',          status:'scheduled',    next_action:'AC diagnostic Thursday',             linked:'WO 355 · AC warm',        phone:'(215) 555-0299' },
  { id:'VP-208', vendor_name:'Pro Mold Solutions',  trade:'Remediation',   status:'in_progress',  next_action:'Remediation Tuesday',                linked:'WO 205 · bathroom mold',  phone:'(215) 555-0312' },
  ],
  "skyline-1417": [
  { id:'SK-VP-1', vendor_name:'Apex Plumbing',       trade:'Plumbing',     status:'in_progress',  next_action:'Diagnosing upstairs leak Thu',       linked:'WO 1417-308 · ceiling leak', phone:'(215) 555-0331' },
  { id:'SK-VP-2', vendor_name:'Volt Electric',       trade:'Electrical',   status:'approved',     next_action:'Schedule — estimate approved',       linked:'WO 1417-410 · light',     phone:'(215) 555-0255' },
  { id:'SK-VP-3', vendor_name:'CoinWash Service Co', trade:'Laundry',      status:'needs_quote',  next_action:'Get quote — washer repair',          linked:'WO Laundry · washer down', phone:'(215) 555-0332' },
  { id:'SK-VP-4', vendor_name:'Keystone Roofing',    trade:'Roofing',      status:'invoice',      next_action:'Review invoice — $2,640',            linked:'Building · gutter repair', phone:'(215) 555-0277' },
  { id:'SK-VP-5', vendor_name:'AAA Pest Control',    trade:'Pest',         status:'coi_expiring', next_action:'COI expires in 12 days — request renewal', linked:'Building · monthly service', phone:'(215) 555-0288' },
  { id:'SK-VP-6', vendor_name:'Comfort HVAC',        trade:'HVAC',         status:'scheduled',    next_action:'Shared heater service Wed',           linked:'WO 1417-115 · heater noise', phone:'(215) 555-0333' },
  ],
};

window.__COMPLIANCE_LIBRARY = {
  "9e2bb96e-08e2-41db-81c2-91055ceb50a3": [
  { id:'CMP-101', label:'Fire alarm + sprinkler test', vendor:'SimplexGrinnell', frequency:'annual',    status:'overdue',   due_at:isoAgo(6*24*60) },
  { id:'CMP-102', label:'Elevator annual inspection',  authority:'City / L&I',   frequency:'annual',    status:'due',       due_at:isoAhead(9*24*60) },
  { id:'CMP-103', label:'Boiler certificate',          authority:'City / L&I',   frequency:'annual',    status:'due',       due_at:isoAhead(21*24*60) },
  { id:'CMP-104', label:'Backflow preventer test',     vendor:'City Water',      frequency:'annual',    status:'scheduled', due_at:isoAhead(40*24*60) },
  { id:'CMP-105', label:'Pest control service',        vendor:'AAA Pest Control',frequency:'monthly',   status:'scheduled', due_at:isoAhead(12*24*60) },
  ],
  "skyline-1417": [
  { id:'SK-CMP-1', label:'Fire alarm + sprinkler test', vendor:'SimplexGrinnell', frequency:'annual',  status:'due',       due_at:isoAhead(7*24*60) },
  { id:'SK-CMP-2', label:'Annual life-safety inspection',authority:'City / L&I',  frequency:'annual',  status:'overdue',   due_at:isoAgo(3*24*60) },
  { id:'SK-CMP-3', label:'Boiler certificate',          authority:'City / L&I',   frequency:'annual',  status:'due',       due_at:isoAhead(18*24*60) },
  { id:'SK-CMP-4', label:'Pest control service',        vendor:'AAA Pest Control',frequency:'monthly', status:'scheduled', due_at:isoAhead(10*24*60) },
  ],
};

window.__REAL_WO_LIBRARY = {
  "9e2bb96e-08e2-41db-81c2-91055ceb50a3": [
  {id:'wo_sol_18047', work_order_id:'18047', unit_number:'407', title:'My air conditioner dashboard is', category:'Heating / Air Conditioning', priority:'emergency', status:'open', is_emergency:true, origin:'Resident App', opened_at:'2026-06-18', tenant_waiting:true, needs_pm_review:false},
  {id:'wo_sol_18043', work_order_id:'18043', unit_number:'647', title:'Battery out on the lock', category:'Key / Lock', priority:'high', status:'in_progress', is_emergency:false, origin:'Online', opened_at:'2026-06-17', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18040', work_order_id:'18040', unit_number:'646', title:'Tried to run washer cold, comes', category:'Appliance', priority:'medium', status:'scheduled', is_emergency:false, origin:'Resident App', opened_at:'2026-06-17', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18039', work_order_id:'18039', unit_number:'642', title:'Toilet appears shifted/not properly', category:'Plumbing', priority:'high', status:'on_hold', is_emergency:false, origin:'Online', opened_at:'2026-06-17', tenant_waiting:false, needs_pm_review:true},
  {id:'wo_sol_18033', work_order_id:'18033', unit_number:'409', title:'The new washing machine you repl', category:'Appliance', priority:'emergency', status:'open', is_emergency:true, origin:'Resident App', opened_at:'2026-06-15', tenant_waiting:true, needs_pm_review:false},
  {id:'wo_sol_18032', work_order_id:'18032', unit_number:'309', title:'The water heater is leaking.', category:'Other', priority:'emergency', status:'in_progress', is_emergency:true, origin:'Online', opened_at:'2026-06-15', tenant_waiting:true, needs_pm_review:false},
  {id:'wo_sol_18030', work_order_id:'18030', unit_number:'417', title:'The toilet is clogged', category:'Appliance', priority:'emergency', status:'scheduled', is_emergency:true, origin:'Resident App', opened_at:'2026-06-15', tenant_waiting:true, needs_pm_review:false},
  {id:'wo_sol_18028', work_order_id:'18028', unit_number:'649', title:'Plumbing issue', category:'Plumbing', priority:'high', status:'on_hold', is_emergency:false, origin:'Online', opened_at:'2026-06-15', tenant_waiting:false, needs_pm_review:true},
  {id:'wo_sol_18027', work_order_id:'18027', unit_number:'409', title:'Washing machine doesn\'t work.', category:'Appliance', priority:'emergency', status:'open', is_emergency:true, origin:'Resident App', opened_at:'2026-06-14', tenant_waiting:true, needs_pm_review:false},
  {id:'wo_sol_18026', work_order_id:'18026', unit_number:'538', title:'Toilet is clogged and I have been u', category:'Plumbing', priority:'medium', status:'in_progress', is_emergency:false, origin:'Online', opened_at:'2026-06-14', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18025', work_order_id:'18025', unit_number:'329', title:'Dishwasher still has , 4 error e', category:'Appliance', priority:'high', status:'scheduled', is_emergency:false, origin:'Resident App', opened_at:'2026-06-14', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18022', work_order_id:'18022', unit_number:'745', title:'The washer/dryer unit has been leav', category:'Appliance', priority:'high', status:'on_hold', is_emergency:false, origin:'Online', opened_at:'2026-06-14', tenant_waiting:false, needs_pm_review:true},
  {id:'wo_sol_18020', work_order_id:'18020', unit_number:'733', title:'Washer/Dryer doesn\'t start', category:'Appliance', priority:'emergency', status:'closed', is_emergency:true, origin:'Resident App', opened_at:'2026-06-13', completed_at:'2026-06-15', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18018', work_order_id:'18018', unit_number:'538', title:'AC states that it has disconnected', category:'Heating / Air Conditioning', priority:'high', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-13', completed_at:'2026-06-15', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18017', work_order_id:'18017', unit_number:'411', title:'There is a lot of water in the l', category:'Electrical', priority:'emergency', status:'closed', is_emergency:true, origin:'Resident App', opened_at:'2026-06-12', completed_at:'2026-06-15', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18016', work_order_id:'18016', unit_number:'716', title:'The electronic lock on my apartment', category:'Key / Lock', priority:'medium', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-12', completed_at:'2026-06-15', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18013', work_order_id:'18013', unit_number:'426', title:'MY AC does not seems to be working,', category:'Heating / Air Conditioning', priority:'high', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-11', completed_at:'2026-06-15', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18012', work_order_id:'18012', unit_number:'414', title:'The battery in my door lock appears', category:'Key / Lock', priority:'high', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-11', completed_at:'2026-06-12', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18009', work_order_id:'18009', unit_number:'721', title:'The control panel of AC is displayi', category:'Heating / Air Conditioning', priority:'high', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-10', completed_at:'2026-06-12', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18008', work_order_id:'18008', unit_number:'550', title:'The master bedroom ceiling fan and', category:'Plumbing', priority:'high', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-10', completed_at:'2026-06-17', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18007', work_order_id:'18007', unit_number:'710', title:'Fridge collecting water in the b', category:'Appliance', priority:'medium', status:'closed', is_emergency:false, origin:'Resident App', opened_at:'2026-06-10', completed_at:'2026-06-11', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18006', work_order_id:'18006', unit_number:'509', title:'Dryer does not work', category:'Appliance', priority:'low', status:'closed', is_emergency:false, origin:'Resident App', opened_at:'2026-06-10', completed_at:'2026-06-10', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18005', work_order_id:'18005', unit_number:'322', title:'Fridge doesn\'t seem to work at a', category:'Appliance', priority:'emergency', status:'closed', is_emergency:true, origin:'Resident App', opened_at:'2026-06-10', completed_at:'2026-06-10', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_18003', work_order_id:'18003', unit_number:'322', title:'Refrigerator doesn\'t seem to get', category:'Appliance', priority:'high', status:'closed', is_emergency:false, origin:'Resident App', opened_at:'2026-06-10', completed_at:'2026-06-10', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17999', work_order_id:'17999', unit_number:'236', title:'Washer displaying error', category:'Appliance', priority:'high', status:'closed', is_emergency:false, origin:'Work Order', opened_at:'2026-06-09', completed_at:'2026-06-10', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17997', work_order_id:'17997', unit_number:'419', title:'I just moved in, but noticed the', category:'Plumbing', priority:'high', status:'closed', is_emergency:false, origin:'Resident App', opened_at:'2026-06-08', completed_at:'2026-06-08', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17991', work_order_id:'17991', unit_number:'721', title:'The toilet paper holder in the bath', category:'Other', priority:'high', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-06', completed_at:'2026-06-08', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17988', work_order_id:'17988', unit_number:'645', title:'My lock has run out of battery. It', category:'Key / Lock', priority:'high', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-06', completed_at:'2026-06-08', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17986', work_order_id:'17986', unit_number:'747', title:'Toilet flush trigger snapped and', category:'Appliance', priority:'high', status:'closed', is_emergency:false, origin:'Resident App', opened_at:'2026-06-05', completed_at:'2026-06-08', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17984', work_order_id:'17984', unit_number:'231', title:'Refrigerator not staying cool. F', category:'Appliance', priority:'high', status:'closed', is_emergency:false, origin:'Resident App', opened_at:'2026-06-05', completed_at:'2026-06-05', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17983', work_order_id:'17983', unit_number:'217', title:'Toilet is clogged', category:'Plumbing', priority:'high', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-05', completed_at:'2026-06-05', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17982', work_order_id:'17982', unit_number:'236', title:'Water is coming up through the b', category:'Other', priority:'high', status:'closed', is_emergency:false, origin:'Resident App', opened_at:'2026-06-04', completed_at:'2026-06-05', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17981', work_order_id:'17981', unit_number:'236', title:'Fire alarm battery needs to be c', category:'Appliance', priority:'low', status:'closed', is_emergency:false, origin:'Resident App', opened_at:'2026-06-04', completed_at:'2026-06-05', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17977', work_order_id:'17977', unit_number:'718', title:'Change door pin', category:'Key / Lock', priority:'low', status:'closed', is_emergency:false, origin:'Work Order', opened_at:'2026-06-04', completed_at:'2026-06-04', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17976', work_order_id:'17976', unit_number:'406', title:'Hi, the garbage disposal (InSinkEra', category:'Plumbing', priority:'high', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-03', completed_at:'2026-06-04', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17975', work_order_id:'17975', unit_number:'629', title:'Plumbing issue', category:'Plumbing', priority:'emergency', status:'closed', is_emergency:true, origin:'Online', opened_at:'2026-06-03', completed_at:'2026-06-04', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17973', work_order_id:'17973', unit_number:'718', title:'Ice machine stopped working', category:'Appliance', priority:'low', status:'closed', is_emergency:false, origin:'Resident App', opened_at:'2026-06-03', completed_at:'2026-06-03', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17972', work_order_id:'17972', unit_number:'448', title:'My fridge does not cool properly an', category:'Appliance', priority:'high', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-02', completed_at:'2026-06-03', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17971', work_order_id:'17971', unit_number:'448', title:'Kitchen faucet head falls of someti', category:'Appliance', priority:'low', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-02', completed_at:'2026-06-03', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17970', work_order_id:'17970', unit_number:'448', title:'The toilet seat needs fixing', category:'Other', priority:'low', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-02', completed_at:'2026-06-03', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17969', work_order_id:'17969', unit_number:'510', title:'Kitchen sink drain pipes (see attac', category:'Plumbing', priority:'medium', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-02', completed_at:'2026-06-03', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sol_17965', work_order_id:'17965', unit_number:'520', title:'The lower part of the fridge is not', category:'Electrical', priority:'emergency', status:'closed', is_emergency:true, origin:'Online', opened_at:'2026-06-01', completed_at:'2026-06-02', tenant_waiting:false, needs_pm_review:false}
  ],
  "skyline-1417": [
  {id:'wo_sky_18024', work_order_id:'18024', unit_number:'1417-408', title:'The garbage disposal under my kitch', category:'Appliance', priority:'high', status:'open', is_emergency:false, origin:'Online', opened_at:'2026-06-14', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sky_18023', work_order_id:'18023', unit_number:'1417-311', title:'Bathroom sink drain stopper is not', category:'Plumbing', priority:'emergency', status:'in_progress', is_emergency:true, origin:'Online', opened_at:'2026-06-14', tenant_waiting:true, needs_pm_review:false},
  {id:'wo_sky_18019', work_order_id:'18019', unit_number:'1417-110', title:'Fridge ins\'t cooling and leaking', category:'Electrical', priority:'high', status:'scheduled', is_emergency:false, origin:'Online', opened_at:'2026-06-13', tenant_waiting:false, needs_pm_review:false, resident_name:'Sasha Greene'},
  {id:'wo_sky_18002', work_order_id:'18002', unit_number:'1417-105', title:'Toilet and kitchen sink are drainin', category:'Plumbing', priority:'high', status:'on_hold', is_emergency:false, origin:'Online', opened_at:'2026-06-09', tenant_waiting:false, needs_pm_review:true},
  {id:'wo_sky_17998', work_order_id:'17998', unit_number:'1417-413', title:'Bathroom lights not working', category:'Electrical', priority:'medium', status:'open', is_emergency:false, origin:'Online', opened_at:'2026-06-08', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sky_17995', work_order_id:'17995', unit_number:'1417-404', title:'Hello,I would like to request maint', category:'Plumbing', priority:'emergency', status:'in_progress', is_emergency:true, origin:'Online', opened_at:'2026-06-08', tenant_waiting:true, needs_pm_review:false},
  {id:'wo_sky_17993', work_order_id:'17993', unit_number:'1417-212', title:'The lever that flushes the toilet i', category:'Other', priority:'medium', status:'scheduled', is_emergency:false, origin:'Online', opened_at:'2026-06-07', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sky_17985', work_order_id:'17985', unit_number:'1417-317', title:'Bulb is broken.', category:'Electrical', priority:'high', status:'on_hold', is_emergency:false, origin:'Resident App', opened_at:'2026-06-05', tenant_waiting:false, needs_pm_review:true},
  {id:'wo_sky_17957', work_order_id:'17957', unit_number:'1417-204', title:'The light in the living room is not', category:'Electrical', priority:'low', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-06-01', completed_at:'2026-06-04', tenant_waiting:false, needs_pm_review:false, resident_name:'Tyler Hoang'},
  {id:'wo_sky_17946', work_order_id:'17946', unit_number:'1417-412', title:'The shower\'s leaking.', category:'Other', priority:'high', status:'on_hold', is_emergency:false, origin:'Resident App', opened_at:'2026-05-30', on_hold_at:'2026-06-01', tenant_waiting:false, needs_pm_review:true},
  {id:'wo_sky_17944', work_order_id:'17944', unit_number:'1417-412', title:'It\'s been a month but the second', category:'Electrical', priority:'emergency', status:'closed', is_emergency:true, origin:'Resident App', opened_at:'2026-05-30', completed_at:'2026-06-01', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sky_17921', work_order_id:'17921', unit_number:'1417-409', title:'One of the bulbs in the restroom ne', category:'Electrical', priority:'medium', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-05-27', completed_at:'2026-05-29', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sky_17919', work_order_id:'17919', unit_number:'1417-211', title:'I noticed what looks like a poss', category:'Other', priority:'high', status:'closed', is_emergency:false, origin:'Resident App', opened_at:'2026-05-27', completed_at:'2026-06-01', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sky_17917', work_order_id:'17917', unit_number:'1417-211', title:'one of the light bulbs in my roo', category:'Electrical', priority:'high', status:'closed', is_emergency:false, origin:'Resident App', opened_at:'2026-05-27', completed_at:'2026-05-29', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sky_17910', work_order_id:'17910', unit_number:'1417-415', title:'The 415 mailbox has a remnant st', category:'Appliance', priority:'emergency', status:'closed', is_emergency:true, origin:'Resident App', opened_at:'2026-05-26', completed_at:'2026-05-28', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sky_17896', work_order_id:'17896', unit_number:'1417-213', title:'A/C has not worked since the whole', category:'Heating / Air Conditioning', priority:'high', status:'closed', is_emergency:false, origin:'Online', opened_at:'2026-05-24', completed_at:'2026-05-27', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sky_17886', work_order_id:'17886', unit_number:'1417-109', title:'Fridge not cold. Freezer is blocked', category:'Appliance', priority:'emergency', status:'closed', is_emergency:true, origin:'Online', opened_at:'2026-05-21', completed_at:'2026-05-21', tenant_waiting:false, needs_pm_review:false},
  {id:'wo_sky_17868', work_order_id:'17868', unit_number:'1417-311', title:'The air conditioner is not cooling.', category:'Heating / Air Conditioning', priority:'emergency', status:'closed', is_emergency:true, origin:'Online', opened_at:'2026-05-18', completed_at:'2026-05-19', tenant_waiting:false, needs_pm_review:false}
  ],
};

window.__LEAD_ANALYTICS =  {
  demo: true,
  // Most-recent week last. Each: leads this week, and the same week last year.
  weekly: [
    { wk:'Apr 7',  leads:18, ly:14 }, { wk:'Apr 14', leads:22, ly:16 },
    { wk:'Apr 21', leads:19, ly:15 }, { wk:'Apr 28', leads:26, ly:18 },
    { wk:'May 5',  leads:31, ly:20 }, { wk:'May 12', leads:28, ly:22 },
    { wk:'May 19', leads:34, ly:24 }, { wk:'May 26', leads:39, ly:27 },
    { wk:'Jun 2',  leads:42, ly:29 }, { wk:'Jun 9',  leads:37, ly:31 },
    { wk:'Jun 16', leads:45, ly:33 }, { wk:'Jun 22', leads:51, ly:36 }
  ],
  // Lead source performance this period: volume, tours given, leases signed.
  sources: [
    { source:'Apartments.com', leads:84, tours:41, leases:11 },
    { source:'Zillow',         leads:67, tours:33, leases:8  },
    { source:'Website',        leads:58, tours:36, leases:14 },
    { source:'Referral',       leads:31, tours:24, leases:12 },
    { source:'Instagram',      leads:44, tours:19, leases:5  },
    { source:'Walk-in',        leads:22, tours:18, leases:7  },
    { source:'University fair', leads:29, tours:15, leases:6  }
  ]
};

window.__RENT_TREND =  {
  demo: true,
  months: [
    { m:'Jul', avg:1842 }, { m:'Aug', avg:1851 }, { m:'Sep', avg:1858 },
    { m:'Oct', avg:1864 }, { m:'Nov', avg:1871 }, { m:'Dec', avg:1869 },
    { m:'Jan', avg:1883 }, { m:'Feb', avg:1897 }, { m:'Mar', avg:1912 },
    { m:'Apr', avg:1928 }, { m:'May', avg:1945 }, { m:'Jun', avg:1963 }
  ]
};

window.__CAPITAL_DEMO =  {
  investors:[
    {name:'Investor Portal User', entity:'Solo on Chestnut LP', role:'Investor', status:'active'},
    {name:'Lender / Partner Contact', entity:'Solo on Chestnut LP', role:'Lender / Partner', status:'active'}
  ],
  docs:[
    {title:'Monthly report package', type:'Report', status:'generated from Reporting', tone:'blue'},
    {title:'Proof-backed attachments', type:'Backup', status:'attached when report is final', tone:'green'},
    {title:'K-1 / tax docs', type:'Tax', status:'not uploaded yet', tone:'brass'}
  ],
  money:[
    {title:'Capital calls', sub:'No open capital call in demo state.', proof:'coming soon', tone:'green'},
    {title:'Distributions', sub:'No distribution scheduled in demo state.', proof:'coming soon', tone:'green'},
    {title:'Capital account basics', sub:'Ownership / contributions / distributions are placeholder-only in this first surface.', proof:'simple first', tone:'brass'}
  ],
  questions:[
    {title:'What changed this month?', sub:'Generated from the monthly report once proof clears.', proof:'AI draft', tone:'blue'},
    {title:'Can I see the backup?', sub:'Portal should return the report package and proof-backed attachments.', proof:'document room', tone:'green'}
  ]
};

/* ============================================================
   SLICE 4 — rent rolls + resident records (moved from index.html)
   Read-only demo data. Index reads these via thin globals below.
   ============================================================ */
window.__RENT_ROLL_LIBRARY = {
  solo: [
  { unit_number:'602',  resident_name:'Meghan Delaplain', status:'delinquent', rent:2150, balance:27484.71, next_action:'collections — payment plan or file' },
  { unit_number:'214',  resident_name:'Jordan Pruitt',    status:'current',    rent:1825, balance:0 },
  { unit_number:'118',  resident_name:'Aisha Bello',      status:'current',    rent:1690, balance:0 },
  { unit_number:'305',  resident_name:'Devon Marsh',      status:'late',       rent:1740, balance:1740, next_action:'late rent — follow up' },
  { unit_number:'410',  resident_name:'Priya Nair',       status:'current',    rent:1900, balance:0 },
  { unit_number:'127',  resident_name:'(vacant)',         status:'vacant',     rent:0,    market_rent:1650, balance:0, next_action:'list / show' },
  { unit_number:'511',  resident_name:'Marcus Webb',      status:'current',    rent:1780, balance:0 },
  { unit_number:'233',  resident_name:'Lena Ortiz',       status:'late',       rent:1695, balance:847.50, next_action:'late rent — follow up' },
  { unit_number:'C-1',  resident_name:'Chestnut Coffee Co (commercial)', status:'current', rent:3200, balance:0 }
],
  skyline: [
  { unit_number:'1417-102 Room2', resident_name:'Emechebe Chinwoke', status:'delinquent', rent:875, balance:15539, next_action:'collections — payment plan or file' },
  { unit_number:'1417-204 Room1', resident_name:'Tyler Hoang',       status:'current',    rent:820, balance:0 },
  { unit_number:'1417-110 Room3', resident_name:'Sasha Greene',      status:'current',    rent:840, balance:0 },
  { unit_number:'1417-301 Room2', resident_name:'Omar Faisal',       status:'late',       rent:810, balance:810, next_action:'late rent — follow up' },
  { unit_number:'1417-115 Room1', resident_name:'(vacant)',          status:'vacant',     rent:0,   market_rent:825, balance:0, next_action:'list / show' },
  { unit_number:'1417-208 Room4', resident_name:'Bianca Lopez',      status:'current',    rent:835, balance:0 },
  { unit_number:'1417-117 Room2', resident_name:'(vacant)',          status:'vacant',     rent:0,   market_rent:815, balance:0, next_action:'list / show' }
],
  greenery: [
    { unit:'1325-101 R1', resident:'Zenia Mitchell', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-101 R2', resident:'Steve Wainaina', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-102 R1', resident:'Sah\'Naviah Rose', market_rent:950, actual_rent:950, balance:250.00, status:'current' },
    { unit:'1325-103 R1', resident:'Daria Korzh', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-104 R1', resident:'Jada Wilson', market_rent:950, actual_rent:950, balance:3630.00, status:'current' },
    { unit:'1325-105 R1', resident:'Taha Alsaqqai', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-106 R1', resident:'Gaelle Chanoine', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-107 R1', resident:'Casey VanSise', market_rent:950, actual_rent:950, balance:-2100.00, status:'current' },
    { unit:'1325-107 R2', resident:'Casey VanSise', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-108 R1', resident:'Hesah Aljeeran', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-109 R1', resident:'Glory Daniel', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-109 R2', resident:'Glory Daniel', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-111 R1', resident:'Nevaeh Hart', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-112 R1', resident:'Penghui Tao', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-112 R2', resident:'Jing Yan', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-113 R1', resident:'Anyae Chapple', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-113 R2', resident:'Alysha Chapple', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-114 R1', resident:'Sean Fallon', market_rent:950, actual_rent:950, balance:-1920.00, status:'current' },
    { unit:'1325-115 R1', resident:'Benjamin Stern', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-115 R2', resident:'Shuai Gong', market_rent:950, actual_rent:950, balance:-1120.00, status:'current' },
    { unit:'1325-116 R1', resident:'Paul Holtz', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-201 R2', resident:'Alex Collins', market_rent:950, actual_rent:950, balance:25.00, status:'current' },
    { unit:'1325-202 R1', resident:'Tashaun Barnes', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-202 R2', resident:'Gabriel Stanescu', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-203 R1', resident:'Lyla Robinson', market_rent:950, actual_rent:950, balance:1265.00, status:'current' },
    { unit:'1325-203 R2', resident:'Charlotte Goldstein', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-204 R1', resident:'Emerson Woody', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-205 R1', resident:'John Ferry', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-206 R1', resident:'Annum Butt', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-208 R1', resident:'Annora Bradley', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-209 R1', resident:'Bowen Xu', market_rent:950, actual_rent:950, balance:-925.00, status:'current' },
    { unit:'1325-209 R2', resident:'Aliaksandr Hlivenka', market_rent:950, actual_rent:950, balance:-945.00, status:'current' },
    { unit:'1325-210 R1', resident:'Jessiemae Iquina', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-210 R2', resident:'Ella Horvat', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-211 R1', resident:'Henry Adusei', market_rent:950, actual_rent:950, balance:50.00, status:'current' },
    { unit:'1325-211 R2', resident:'Henry Adusei', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-212 R1', resident:'Hind Alrushud', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-212 R2', resident:'Saud Altiamn', market_rent:950, actual_rent:950, balance:-1120.00, status:'current' },
    { unit:'1325-213 R1', resident:'Amonte Boyd', market_rent:950, actual_rent:950, balance:-780.00, status:'current' },
    { unit:'1325-213 R2', resident:'Amonte Boyd', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-214 R1', resident:'Anita Kheirollahi', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-215 R1', resident:'Milos Adzic', market_rent:950, actual_rent:950, balance:50.00, status:'current' },
    { unit:'1325-215 R2', resident:'Milos Adzic', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-216 R1', resident:'Sophia DiConza', market_rent:950, actual_rent:950, balance:-1250.00, status:'current' },
    { unit:'1325-216 R2', resident:'Madeline Foster', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-301 R1', resident:'Arrie Dawson', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-301 R2', resident:'Skylar Bell', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-302 R1', resident:'Shannon Rose', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-302 R2', resident:'Xun Liu', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-303 R1', resident:'Aditya Phukon', market_rent:950, actual_rent:950, balance:-975.00, status:'current' },
    { unit:'1325-303 R2', resident:'Stephen Liu', market_rent:950, actual_rent:950, balance:-975.00, status:'current' },
    { unit:'1325-304 R1', resident:'LaJada Holmes', market_rent:950, actual_rent:950, balance:2765.00, status:'current' },
    { unit:'1325-305 R1', resident:'Hojin Joung', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-306 R1', resident:'Yong Jing Lin', market_rent:950, actual_rent:950, balance:1815.00, status:'current' },
    { unit:'1325-307 R1', resident:'Aida Bocum', market_rent:950, actual_rent:950, balance:3385.00, status:'current' },
    { unit:'1325-307 R2', resident:'Aida Bocum', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-308 R1', resident:'Patricia Perez Cuesta', market_rent:950, actual_rent:950, balance:-1670.00, status:'current' },
    { unit:'1325-309 R1', resident:'Yung-Ting Hsiao', market_rent:950, actual_rent:950, balance:76.14, status:'current' },
    { unit:'1325-309 R2', resident:'Megan Lee', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-310 R1', resident:'Youmna Layoun', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-310 R2', resident:'Tracey Dibbs', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-311 R1', resident:'Anthony Pasles', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-311 R2', resident:'Chathumini Kondasinghe', market_rent:950, actual_rent:950, balance:-995.00, status:'current' },
    { unit:'1325-312 R1', resident:'Gina Calise', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-312 R2', resident:'Katerina Calise Martinez', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-313 R1', resident:'Jonathan Scott', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-313 R2', resident:'Dylan Manu', market_rent:950, actual_rent:950, balance:-50.00, status:'current' },
    { unit:'1325-314 R1', resident:'Erica Breitbarth', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-315 R1', resident:'Uchenna Onwuchekwa', market_rent:950, actual_rent:950, balance:2777.00, status:'current' },
    { unit:'1325-316 R1', resident:'Yi (Jennifer) Yang', market_rent:950, actual_rent:950, balance:-1650.00, status:'current' },
    { unit:'1325-316 R2', resident:'Yi (Jennifer) Yang', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-401 R1', resident:'Mazzarine Barboza', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-401 R2', resident:'Ngone Fall', market_rent:950, actual_rent:950, balance:-970.00, status:'current' },
    { unit:'1325-402 R1', resident:'Mei Weatherly', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-402 R2', resident:'Mei Weatherly', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-403 R1', resident:'Ragha Mohan', market_rent:950, actual_rent:950, balance:-515.00, status:'current' },
    { unit:'1325-403 R2', resident:'Erika Monn', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-404 R1', resident:'Boyuan Qiu', market_rent:950, actual_rent:950, balance:98.82, status:'current' },
    { unit:'1325-405 R1', resident:'Grace Shei', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-406 R1', resident:'Dante Croft', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-407 R2', resident:'Kyra Jackson', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-408 R1', resident:'Min-Sang Lee', market_rent:950, actual_rent:950, balance:-1820.00, status:'current' },
    { unit:'1325-409 R1', resident:'Sincear Walter', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-409 R2', resident:'Anthony Diallo', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-410 R1', resident:'Simone Franks', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-410 R2', resident:'Bianca Colon', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-411 R1', resident:'Ting Wei Liu', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-411 R2', resident:'Ting Wei Liu', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-412 R1', resident:'Princess Akerele', market_rent:950, actual_rent:950, balance:621.81, status:'current' },
    { unit:'1325-412 R2', resident:'Anjolie Browne', market_rent:950, actual_rent:950, balance:77.41, status:'current' },
    { unit:'1325-413 R1', resident:'Logan Lee', market_rent:950, actual_rent:950, balance:45.00, status:'current' },
    { unit:'1325-413 R2', resident:'Logan Lee', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-414 R1', resident:'Chun Ming Ip', market_rent:950, actual_rent:950, balance:161.15, status:'current' },
    { unit:'1325-415 R1', resident:'Dylan Pakizegi', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-415 R2', resident:'Dylan Pakizegi', market_rent:950, actual_rent:950, balance:0.00, status:'current' },
    { unit:'1325-416 R1', resident:'Ziraily Guzman', market_rent:950, actual_rent:950, balance:7381.70, status:'current' },
    { unit:'1325-416 R2', resident:'Jamirah Branch', market_rent:950, actual_rent:950, balance:12857.90, status:'current' },
  ],
  berks: [
    { unit:'1850-101 R1', resident:'Zyil Powell', market_rent:950, actual_rent:725, balance:8475.00, status:'current' },
    { unit:'1850-101 R2', resident:'Javier Morton', market_rent:950, actual_rent:725, balance:12610.00, status:'current' },
    { unit:'1850-102 R1', resident:'Aisha Al Balushi', market_rent:950, actual_rent:725, balance:4163.35, status:'current' },
    { unit:'1850-102 R2', resident:'Ghazallan Al Jabri', market_rent:950, actual_rent:725, balance:816.67, status:'current' },
    { unit:'1850-102 R3', resident:'Aisha Al Farsi', market_rent:950, actual_rent:725, balance:4163.35, status:'current' },
    { unit:'1850-103 R1', resident:'Cadence Olmstead', market_rent:950, actual_rent:725, balance:679.13, status:'current' },
    { unit:'1850-103 R2', resident:'Marley Ruiz', market_rent:950, actual_rent:725, balance:-1383.37, status:'current' },
    { unit:'1850-103 R3', resident:'Laila Lee-Burns', market_rent:950, actual_rent:725, balance:0.00, status:'current' },
    { unit:'1850-103 R4', resident:'Morgan Robinson', market_rent:950, actual_rent:725, balance:7230.37, status:'current' },
    { unit:'1850-104 R1', resident:'Davier Bishop', market_rent:950, actual_rent:725, balance:-2375.00, status:'current' },
    { unit:'1850-204 R1', resident:'Demerick Morris', market_rent:950, actual_rent:725, balance:2313.00, status:'current' },
    { unit:'1850-205 R1', resident:'Ian Stewart', market_rent:950, actual_rent:725, balance:3750.00, status:'current' },
    { unit:'1850-301 R1', resident:'Lucas Flax', market_rent:950, actual_rent:725, balance:50.00, status:'current' },
    { unit:'1850-301 R2', resident:'Joshua Wurzel', market_rent:950, actual_rent:725, balance:4113.30, status:'current' },
    { unit:'1850-301 R3', resident:'David Weissberg', market_rent:950, actual_rent:725, balance:0.00, status:'current' },
    { unit:'1850-302 R2', resident:'Daniel Evert', market_rent:950, actual_rent:725, balance:0.00, status:'current' },
    { unit:'1850-302 R3', resident:'Linus Linberg', market_rent:950, actual_rent:725, balance:-725.00, status:'current' },
    { unit:'1850-302 R4', resident:'Grayson Mains', market_rent:950, actual_rent:725, balance:-725.00, status:'current' },
    { unit:'1850-303 R1', resident:'Reginald Jones', market_rent:950, actual_rent:725, balance:0.00, status:'current' },
    { unit:'1850-304 R1', resident:'Benjamin Liberman', market_rent:950, actual_rent:725, balance:192.68, status:'current' },
    { unit:'1850-305 R1', resident:'Jeremy D\'Amico', market_rent:950, actual_rent:725, balance:0.00, status:'current' },
    { unit:'1850-305 R2', resident:'Tymel Harvey', market_rent:950, actual_rent:725, balance:8672.90, status:'current' },
    { unit:'1850-401 R1', resident:'Keecha Kamara', market_rent:950, actual_rent:725, balance:0.00, status:'current' },
    { unit:'1850-401 R2', resident:'Adeja Wright', market_rent:950, actual_rent:725, balance:-303.33, status:'current' },
    { unit:'1850-401 R3', resident:'Khadija Drame', market_rent:950, actual_rent:725, balance:374.68, status:'current' },
    { unit:'1850-403 R1', resident:'Demonte Greene', market_rent:950, actual_rent:725, balance:0.00, status:'current' },
    { unit:'1850-403 R2', resident:'Josiah Jackson', market_rent:950, actual_rent:725, balance:0.00, status:'current' },
    { unit:'1850-403 R3', resident:'Brian Adderley', market_rent:950, actual_rent:725, balance:-725.00, status:'current' },
    { unit:'1850-404 R1', resident:'Yanyah Washington', market_rent:950, actual_rent:725, balance:0.00, status:'current' },
    { unit:'1850-405 R1', resident:'Dontae Pollard', market_rent:950, actual_rent:725, balance:3805.00, status:'current' },
    { unit:'1850-405 R2', resident:'Kajiya Hollawayne', market_rent:950, actual_rent:725, balance:725.00, status:'current' },
  ],
  nest: [
    { unit:'1500A-1 R1', entity:'TN III', resident:'Alexandra Puig Cruz', market_rent:725, actual_rent:675, balance:5.00, status:'current' },
    { unit:'1500A-1 R2', entity:'TN III', resident:'Namratha Javvaji', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500A-1 R3', entity:'TN III', resident:'Anouska Jha', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500A-1 R4', entity:'TN III', resident:'Zoe Skibicki', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500A-3 R1', entity:'TN III', resident:'Ritvik Anumandla', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500A-3 R2', entity:'TN III', resident:'Aadi Aggarwal', market_rent:725, actual_rent:675, balance:5.00, status:'current' },
    { unit:'1500A-3 R3', entity:'TN III', resident:'Hemanth Kolluri', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500A-B R1', entity:'TN III', resident:'Baeksan/Chloe Bae', market_rent:725, actual_rent:675, balance:-1440.00, status:'current' },
    { unit:'1500B-1 R1', entity:'TN III', resident:'Isabella Mena', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500B-1 R2', entity:'TN III', resident:'Eli Uffelman', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500B-2 R1', entity:'TN III', resident:'Bryce Clark', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500B-2 R2', entity:'TN III', resident:'Zachary Perez', market_rent:725, actual_rent:675, balance:205.00, status:'current' },
    { unit:'1500B-3 R1', entity:'TN III', resident:'Samichha Chouwan', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500B-3 R2', entity:'TN III', resident:'Aanfa Awal', market_rent:725, actual_rent:675, balance:25.00, status:'current' },
    { unit:'1500B-B R1', entity:'TN III', resident:'Mariam Sharife', market_rent:725, actual_rent:675, balance:1148.57, status:'current' },
    { unit:'1500B-B R2', entity:'TN III', resident:'Sharar Sawgat', market_rent:725, actual_rent:675, balance:862.98, status:'current' },
    { unit:'1500C-1 R1', entity:'TN III', resident:'Ryan Barnes', market_rent:725, actual_rent:675, balance:50.00, status:'current' },
    { unit:'1500C-1 R2', entity:'TN III', resident:'Fritz Berback-Rosengreen', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500C-2 R1', entity:'TN III', resident:'Jason McClean', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500C-2 R2', entity:'TN III', resident:'Noah Josef', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500C-3 R1', entity:'TN III', resident:'Lilah Shtino', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500C-3 R2', entity:'TN III', resident:'Adriana Russo', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500C-B R1', entity:'TN III', resident:'Amir Richardson', market_rent:725, actual_rent:675, balance:885.00, status:'current' },
    { unit:'1500C-B R2', entity:'TN III', resident:'Benjamin Gahman', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500D-1 R1', entity:'TN III', resident:'Chang Wang', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500D-1 R2', entity:'TN III', resident:'Naomi Nwokoma', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500D-2 R1', entity:'TN III', resident:'Benjamin Haddad', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500D-2 R2', entity:'TN III', resident:'Aaron Salen', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500D-3 R1', entity:'TN III', resident:'Devin Carrillo', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500D-3 R2', entity:'TN III', resident:'Lindsey Cao', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1500D-B R1', entity:'TN III', resident:'Sanaiya Moore', market_rent:725, actual_rent:675, balance:-765.00, status:'current' },
    { unit:'1500D-B R2', entity:'TN III', resident:'Kristin Wilson', market_rent:725, actual_rent:675, balance:-781.00, status:'current' },
    { unit:'1508-1 R1', entity:'TN III', resident:'Monica Samaan', market_rent:725, actual_rent:675, balance:-690.00, status:'current' },
    { unit:'1508-1 R3', entity:'TN III', resident:'Haewon Kang', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1508-2 R1', entity:'TN III', resident:'Avery Wood', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1508-2 R2', entity:'TN III', resident:'Emy Vera-Pineda', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1508-2 R3', entity:'TN III', resident:'Emily Liu', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1508-3 R1', entity:'TN III', resident:'Calista Aguinaldo', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1508-3 R2', entity:'TN III', resident:'Matilde Valente', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1508-3 R3', entity:'TN III', resident:'Mae Garber', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1508-B R1', entity:'TN III', resident:'Tommy Yu', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1509-1 R3', entity:'TN III', resident:'Benjamin Lechner', market_rent:725, actual_rent:675, balance:-715.00, status:'current' },
    { unit:'1509-2 R1', entity:'TN III', resident:'Jorge Juarez Barrera Jr', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1509-2 R2', entity:'TN III', resident:'Gabriel Corson', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1509-2 R3', entity:'TN III', resident:'Lucas Koh', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1509-3 R3', entity:'TN III', resident:'Micah Oxley', market_rent:725, actual_rent:675, balance:2632.00, status:'current' },
    { unit:'1509-B R1', entity:'TN III', resident:'Alexander Pierce', market_rent:725, actual_rent:675, balance:-415.00, status:'current' },
    { unit:'1510.5-1 R1', entity:'TN III', resident:'Alliyat Balogun Salami', market_rent:725, actual_rent:675, balance:175.00, status:'current' },
    { unit:'1510.5-1 R2', entity:'TN III', resident:'Kankay Camara', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1510.5-1 R3', entity:'TN III', resident:'Rebecca Osei', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1510.5-2 R2', entity:'TN III', resident:'Sanaa White', market_rent:725, actual_rent:675, balance:-748.34, status:'current' },
    { unit:'1510.5-3 R1', entity:'TN III', resident:'Alexandra Blab', market_rent:725, actual_rent:675, balance:15.00, status:'current' },
    { unit:'1510.5-3 R2', entity:'TN III', resident:'Gabriella Rozum', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1510.5-B R1', entity:'TN III', resident:'Nia Thomas', market_rent:725, actual_rent:675, balance:1425.00, status:'current' },
    { unit:'1510-1 R1', entity:'TN III', resident:'Fatim Bashir', market_rent:725, actual_rent:675, balance:2377.00, status:'current' },
    { unit:'1510-1 R2', entity:'TN III', resident:'Hawa Kamara', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1510-1 R3', entity:'TN III', resident:'Khadija Marrakchi', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1510-2 R1', entity:'TN III', resident:'Nasciya Boston', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1510-3 R1', entity:'TN III', resident:'William Whalen', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1510-3 R2', entity:'TN III', resident:'Simeon Smith', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1510-3 R3', entity:'TN III', resident:'Graham Thomas', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1511.5-2 R1', entity:'TN III', resident:'Charlene Yang', market_rent:725, actual_rent:675, balance:-534.00, status:'current' },
    { unit:'1511.5-2 R2', entity:'TN III', resident:'Joy Chen', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1511.5-2 R3', entity:'TN III', resident:'Sophia Niparishvili', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1511.5-3 R1', entity:'TN III', resident:'Maxfield Saffell', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1511.5-3 R2', entity:'TN III', resident:'Joey Gunoskey', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1511.5-3 R3', entity:'TN III', resident:'Sean Roman', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1511.5-B R1', entity:'TN III', resident:'Nia Mann', market_rent:725, actual_rent:675, balance:945.00, status:'current' },
    { unit:'1511.5-B R2', entity:'TN III', resident:'Julian Hernandez', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1511-1 R2', entity:'TN III', resident:'Fatima Ahmed', market_rent:725, actual_rent:675, balance:-558.50, status:'current' },
    { unit:'1511-1 R3', entity:'TN III', resident:'Batool Salloum', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1511-2 R1', entity:'TN III', resident:'Usama Hussein', market_rent:725, actual_rent:675, balance:119.55, status:'current' },
    { unit:'1511-2 R2', entity:'TN III', resident:'Derick White', market_rent:725, actual_rent:675, balance:516.21, status:'current' },
    { unit:'1511-3 R1', entity:'TN III', resident:'Takya Elliott', market_rent:725, actual_rent:675, balance:4170.00, status:'current' },
    { unit:'1511-3 R2', entity:'TN III', resident:'Olivia Johnson', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1511-3 R3', entity:'TN III', resident:'Sydney Parker', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1511-B R1', entity:'TN III', resident:'Nathaniel Thomas', market_rent:725, actual_rent:675, balance:5.00, status:'current' },
    { unit:'1502-2 R1', entity:'TN IV', resident:'Adriana Hardin', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1502-2 R2', entity:'TN IV', resident:'Adam Albritton', market_rent:725, actual_rent:675, balance:58.06, status:'current' },
    { unit:'1502-3 R1', entity:'TN IV', resident:'Heather Interthal', market_rent:725, actual_rent:675, balance:-790.00, status:'current' },
    { unit:'1502-3 R2', entity:'TN IV', resident:'Megan Interthal', market_rent:725, actual_rent:675, balance:-790.00, status:'current' },
    { unit:'1504-1 R4', entity:'TN IV', resident:'Keira Wessler', market_rent:725, actual_rent:675, balance:-760.00, status:'current' },
    { unit:'1504-2 R1', entity:'TN IV', resident:'Alexandra Bonbrest', market_rent:725, actual_rent:675, balance:-685.00, status:'current' },
    { unit:'1504-2 R2', entity:'TN IV', resident:'Ruby Shtino', market_rent:725, actual_rent:675, balance:36.47, status:'current' },
    { unit:'1504-3 R1', entity:'TN IV', resident:'Enlun Yin', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1504-3 R2', entity:'TN IV', resident:'Anthony Zheng', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1504-3 R3', entity:'TN IV', resident:'Nathaniel Lam', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1504-3 R4', entity:'TN IV', resident:'Ryan Chan', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1504-B R2', entity:'TN IV', resident:'Nevaeh Hicks', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1506-2 R1', entity:'TN IV', resident:'Kaleb Ellard', market_rent:725, actual_rent:675, balance:-745.00, status:'current' },
    { unit:'1506-2 R2', entity:'TN IV', resident:'Tristan Fallon', market_rent:725, actual_rent:675, balance:2110.00, status:'current' },
    { unit:'1506-2 R3', entity:'TN IV', resident:'Alexander Hood', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1506-3 R2', entity:'TN IV', resident:'Daniel Tirendi', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1506-3 R4', entity:'TN IV', resident:'Darren Freeman', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1506-B R1', entity:'TN IV', resident:'Sarah Keagy', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1506-B R2', entity:'TN IV', resident:'Caroline Montgomery', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1512-1 R1', entity:'TN IV', resident:'Kayla Gerst', market_rent:725, actual_rent:675, balance:930.00, status:'current' },
    { unit:'1512-1 R2', entity:'TN IV', resident:'Keira Davis', market_rent:725, actual_rent:675, balance:-610.00, status:'current' },
    { unit:'1512-1 R3', entity:'TN IV', resident:'Tamara Bony', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1512-3 R1', entity:'TN IV', resident:'Zoe Benka-Davies', market_rent:725, actual_rent:675, balance:-250.00, status:'current' },
    { unit:'1512-3 R2', entity:'TN IV', resident:'Martina Padovano', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1512-3 R3', entity:'TN IV', resident:'Keira Estrada', market_rent:725, actual_rent:675, balance:-725.00, status:'current' },
    { unit:'1512-B R1', entity:'TN IV', resident:'Noah Kim', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1512-B R2', entity:'TN IV', resident:'Andile Fihla', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1513-1F R1', entity:'TN IV', resident:'Shamiere Jackson', market_rent:725, actual_rent:675, balance:8438.84, status:'current' },
    { unit:'1513-1R R1', entity:'TN IV', resident:'Tyler Jones', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1513-2F R2', entity:'TN IV', resident:'Zipporah Mooney', market_rent:725, actual_rent:675, balance:60.51, status:'current' },
    { unit:'1513-2R R1', entity:'TN IV', resident:'Vivian Torres', market_rent:725, actual_rent:675, balance:162.50, status:'current' },
    { unit:'1513-2R R2', entity:'TN IV', resident:'Deshaun Evans', market_rent:725, actual_rent:675, balance:1750.00, status:'current' },
    { unit:'1513-3F R1', entity:'TN IV', resident:'Miracle Zor', market_rent:725, actual_rent:675, balance:670.00, status:'current' },
    { unit:'1513-3F R2', entity:'TN IV', resident:'Mary Morara', market_rent:725, actual_rent:675, balance:925.00, status:'current' },
    { unit:'1513-3R R1', entity:'TN IV', resident:'Benjamin Maitre', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1513-3R R2', entity:'TN IV', resident:'Randy Keller', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1513-3R R3', entity:'TN IV', resident:'Aidan Mount', market_rent:725, actual_rent:675, balance:855.00, status:'current' },
    { unit:'1513-BF R1', entity:'TN IV', resident:'Mylie Sanchez', market_rent:725, actual_rent:675, balance:4005.00, status:'current' },
    { unit:'1513-BF R2', entity:'TN IV', resident:'Catherine Inman', market_rent:725, actual_rent:675, balance:-1630.00, status:'current' },
    { unit:'1515-1F R2', entity:'TN IV', resident:'David Mai', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1515-2F R1', entity:'TN IV', resident:'Olivia Vaughan', market_rent:725, actual_rent:675, balance:25.00, status:'current' },
    { unit:'1515-2F R2', entity:'TN IV', resident:'Tania Addo', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1515-2R R1', entity:'TN IV', resident:'Jason Vlaminck', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1515-2R R2', entity:'TN IV', resident:'Daniel Feeney', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1515-2R R3', entity:'TN IV', resident:'Aidan Patel', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1515-3F R1', entity:'TN IV', resident:'Robbin Luo', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1515-3F R2', entity:'TN IV', resident:'Padin Stein', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1515-3R R2', entity:'TN IV', resident:'Ezekiel Williams', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1515-3R R3', entity:'TN IV', resident:'Ish-pierry Momplaisir', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1515-BR R1', entity:'TN IV', resident:'Eric Bowie', market_rent:725, actual_rent:675, balance:5600.00, status:'current' },
    { unit:'1518-1 R1', entity:'TN V', resident:'Hemani Shankar', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1518-1 R2', entity:'TN V', resident:'Tierney McLaughlin', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1518-1 R3', entity:'TN V', resident:'Sofia Lydecker', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1518-1 R4', entity:'TN V', resident:'Ceira Hayes', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1518-2 R1', entity:'TN V', resident:'Donnell Britton', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1518-2 R2', entity:'TN V', resident:'Andrew Hasselbach', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1518-3 R1', entity:'TN V', resident:'Mia DiComo', market_rent:725, actual_rent:675, balance:312.50, status:'current' },
    { unit:'1518-3 R2', entity:'TN V', resident:'Ritha Tottempudi', market_rent:725, actual_rent:675, balance:312.50, status:'current' },
    { unit:'1518-3 R3', entity:'TN V', resident:'Wania Irfan', market_rent:725, actual_rent:675, balance:855.00, status:'current' },
    { unit:'1520-2 R1', entity:'TN V', resident:'Wisdom Egbonim', market_rent:725, actual_rent:675, balance:75.37, status:'current' },
    { unit:'1520-2 R2', entity:'TN V', resident:'Kai Mims', market_rent:725, actual_rent:675, balance:-1475.42, status:'current' },
    { unit:'1522-1 R2', entity:'TN V', resident:'Jaewon Lee', market_rent:725, actual_rent:675, balance:-434.33, status:'current' },
    { unit:'1522-1 R3', entity:'TN V', resident:'Manuel Sanchez', market_rent:725, actual_rent:675, balance:-710.00, status:'current' },
    { unit:'1522-1 R4', entity:'TN V', resident:'Grayden Straub', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1522-3 R1', entity:'TN V', resident:'Jaydin Farro', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1522-3 R2', entity:'TN V', resident:'Ariunjargal Terbish', market_rent:725, actual_rent:675, balance:1246.00, status:'current' },
    { unit:'1522-3 R3', entity:'TN V', resident:'Maha Farooq', market_rent:725, actual_rent:675, balance:-685.00, status:'current' },
    { unit:'1528-3 R1', entity:'TN V', resident:'Kimorah Woodruff', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1528-3 R2', entity:'TN V', resident:'Talear Morris', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1528-3 R3', entity:'TN V', resident:'Aniya Williams-Bey', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1530-1 R1', entity:'TN V', resident:'Kierra Gabriel', market_rent:725, actual_rent:675, balance:-815.00, status:'current' },
    { unit:'1530-1 R3', entity:'TN V', resident:'Zandria Edghill-Dowdy', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1530-3 R1', entity:'TN V', resident:'Abdullah Ibn Abdul Kareem Idris', market_rent:725, actual_rent:675, balance:1890.00, status:'current' },
    { unit:'1530-3 R2', entity:'TN V', resident:'Evan Paolini', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'1530-3 R3', entity:'TN V', resident:'Jacob Flynn', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'807-1 R1', entity:'TN X', resident:'Garrett Herink', market_rent:725, actual_rent:675, balance:1410.00, status:'current' },
    { unit:'807-1 R2', entity:'TN X', resident:'Regan Riley', market_rent:725, actual_rent:675, balance:1450.00, status:'current' },
    { unit:'807-2 R1', entity:'TN X', resident:'Angel Cruz', market_rent:725, actual_rent:675, balance:-1470.00, status:'current' },
    { unit:'807-2 R3', entity:'TN X', resident:'Mark Green', market_rent:725, actual_rent:675, balance:30.90, status:'current' },
    { unit:'807-3 R1', entity:'TN X', resident:'Jacob Treat', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'807-3 R2', entity:'TN X', resident:'Tristan Bouyer', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'807-3 R3', entity:'TN X', resident:'Jose Soto Montalvo', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'809-2 R1', entity:'TN X', resident:'Kendra Schmit', market_rent:725, actual_rent:675, balance:-740.00, status:'current' },
    { unit:'809-3 R1', entity:'TN X', resident:'Jordan Tapp', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'811-2 R1', entity:'TN X', resident:'Aryan Anand', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'811-2 R2', entity:'TN X', resident:'Talha Chaudhry', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'813-3 R1', entity:'TN X', resident:'Shomyl Patel', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'813-3 R2', entity:'TN X', resident:'Saif Ahmed', market_rent:725, actual_rent:675, balance:340.00, status:'current' },
    { unit:'815-1 R1', entity:'TN X', resident:'Jacob Bealer', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'815-1 R2', entity:'TN X', resident:'Joseph Collins', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'815-1 R3', entity:'TN X', resident:'Joey Antuono', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'815-1 R4', entity:'TN X', resident:'Noah Burdsall', market_rent:725, actual_rent:675, balance:0.00, status:'current' },
    { unit:'815-2 R1', entity:'TN X', resident:'Deziah Thomas', market_rent:725, actual_rent:675, balance:690.00, status:'current' },
    { unit:'815-2 R2', entity:'TN X', resident:'Destiny Williams', market_rent:725, actual_rent:675, balance:280.00, status:'current' },
  ]
};

window.__PC_RESIDENT_RECORDS = {
  person_maya: {
    person_id:'person_maya', name:'Maya Okafor', role_label:'Resident',
    unit:'Solo · Unit 612', relationship:'Resident · lease active',
    interactions:[
      { interaction_id:'ix_m1', interaction_type:'sms', audience:'resident',
        author_role:null, occurred_at:'Day 1 · 9:42 AM',
        content:"A/C isn't cooling. It's blowing warm air. Apartment is 81°.",
        claims:[{claim_id:'c_m1',statement:'A/C in 612 is not cooling (blowing warm air)',asserted_by:'resident',claim_state:'superseded',proof_status:'none',evidence_interaction_ids:[],superseded_by_claim_id:'c_m5'}] },
      { interaction_id:'ix_m2', interaction_type:'work_order_update', audience:'maintenance_only',
        author_role:'senior_maintenance_tech', occurred_at:'Day 1 · 11:20 AM',
        content:'Assessed 612. Compressor capacitor failed. Part not in stock — ordered, ETA tomorrow PM. No portable units on-site today.',
        claims:[
          {claim_id:'c_m2',statement:'Failure is a blown compressor capacitor; replacement part required',asserted_by:'senior_maintenance_tech',claim_state:'confirmed',proof_status:'verified',evidence_interaction_ids:[],superseded_by_claim_id:null},
          {claim_id:'c_m3',statement:'Replacement part ETA is tomorrow afternoon',asserted_by:'senior_maintenance_tech',claim_state:'unverified',proof_status:'attached',evidence_interaction_ids:[],superseded_by_claim_id:null},
        ] },
      { interaction_id:'ix_m3', interaction_type:'internal_note', audience:'staff_internal',
        author_role:'assistant_manager', occurred_at:'Day 1 · 1:05 PM',
        content:"Told Maya we'd have an update by end of day Friday. (Said before confirming part ETA — may not hold.)",
        claims:[{claim_id:'c_m4',statement:'Resident was promised an update by end of day Friday',asserted_by:'assistant_manager',claim_state:'confirmed',proof_status:'verified',evidence_interaction_ids:[],superseded_by_claim_id:null}] },
      { interaction_id:'ix_m4', interaction_type:'call_summary', audience:'resident',
        author_role:'front_desk_ops', occurred_at:'Day 3 · 8:30 AM',
        content:"Maya called front desk. Still 80°+, A/C still out. Says nobody updated her Friday as promised. Has a newborn. States if not fixed today she'll withhold rent.",
        claims:[
          {claim_id:'c_m5',statement:'A/C still not cooling as of Day 3',asserted_by:'resident',claim_state:'unverified',proof_status:'none',evidence_interaction_ids:['ix_m1'],superseded_by_claim_id:null},
          {claim_id:'c_m6',statement:'Promised Friday update was not delivered',asserted_by:'resident',claim_state:'confirmed',proof_status:'verified',evidence_interaction_ids:['ix_m3'],superseded_by_claim_id:null},
          {claim_id:'c_m7',statement:'Resident states intent to withhold rent until resolved',asserted_by:'resident',claim_state:'unverified',proof_status:'none',evidence_interaction_ids:[],superseded_by_claim_id:null},
        ] },
    ],
    work_item:{ id:'wo_ac_612', title:'A/C repair — Unit 612', band:'urgent', state:'ongoing',
      owner_role:'senior_maintenance_tech', audience:'maintenance_only', sub:'Capacitor part on order · ETA tomorrow PM' },
    obligations:[
      { id:'obl_wo_612', title:'A/C repair — Unit 612', band:'urgent', state:'ongoing',
        owner_role:'senior_maintenance_tech', audience:'maintenance_only', sub:'Capacitor on order · mitigation owed today' },
    ],
    recovery:{
      title:'Urgent Resident Recovery — A/C, Unit 612',
      reason:'Essential service failure + broken Friday commitment + stated rent-withholding',
      phase:'breach',
      children:[
        { key:'maintenance', audience:'maintenance_only', owner_role:'senior_maintenance_tech',
          title:'Technical recovery — restore cooling / verified mitigation',
          clockLabel:'≤60m assess', clockStatus:'done',
          note:'Assessed: capacitor failure. Part ETA tomorrow PM. No portable on-site — mitigation still owed.' },
        { key:'comm', audience:'resident', owner_role:'assistant_manager',
          title:'Resident communication recovery — honest status + next update time',
          clockLabel:'update OVERDUE', clockStatus:'breach',
          note:'Friday update promised and missed. Resident re-contacted Day 3. Owes: true status, mitigation, next guaranteed update time.' },
        { key:'escalation', audience:'management_only', owner_role:'asset_manager',
          title:'Management escalation — monitoring',
          clockLabel:'monitoring', clockStatus:'live',
          note:'Essential service + missed promise + rent-withholding threat. Accommodation (portable beyond policy / credit) needs management approval — maintenance & front desk may NOT offer it.' },
      ],
    },
  },
};

/* SLICE 4b — Temple Nest sub-entity rent rolls */
window.__RENT_ROLL_LIBRARY.tn1438 = [
    { unit:'1438-101 Room3', resident:'Evan Veale', market_rent:840, actual_rent:740, balance:3335.66, status:'current' },
    { unit:'1438-101 Room5', resident:'Samuel Kreider', market_rent:840, actual_rent:740, balance:113.79, status:'current' },
    { unit:'1438-101 Room6', resident:'Quinton Mcknight', market_rent:840, actual_rent:740, balance:3335.66, status:'current' },
    { unit:'1438-103 Room1', resident:'Nicholas Pinzon', market_rent:840, actual_rent:740, balance:0.00, status:'current' },
    { unit:'1438-201 Room1', resident:'Dylan Lanza', market_rent:840, actual_rent:740, balance:-740.00, status:'current' },
    { unit:'1438-201 Room2', resident:'Chris Verna', market_rent:840, actual_rent:740, balance:0.00, status:'current' },
    { unit:'1438-201 Room3', resident:'Josiah Holmes', market_rent:840, actual_rent:740, balance:900.95, status:'current' },
    { unit:'1438-201 Room5', resident:'Charlie Burke', market_rent:840, actual_rent:740, balance:3335.91, status:'current' },
    { unit:'1438-202 Room1', resident:'Vincent Alvarado-Useni', market_rent:840, actual_rent:740, balance:357.59, status:'current' },
    { unit:'1438-202 Room3', resident:'Jackson Wisniowski', market_rent:840, actual_rent:740, balance:3317.60, status:'current' },
    { unit:'1438-202 Room4', resident:'Harry Conran', market_rent:840, actual_rent:740, balance:142.64, status:'current' },
    { unit:'1438-203', resident:'Neel Guha', market_rent:840, actual_rent:740, balance:930.62, status:'current' },
    { unit:'1438-204', resident:'Jack Robertson', market_rent:840, actual_rent:740, balance:3758.95, status:'current' },
    { unit:'1438-205 Room1', resident:'Mason Bagenstose', market_rent:840, actual_rent:740, balance:0.00, status:'current' },
    { unit:'1438-205 Room2', resident:'Ryan Brody', market_rent:840, actual_rent:740, balance:0.00, status:'current' },
    { unit:'1438-206 Room1', resident:'Keegan Golden', market_rent:840, actual_rent:740, balance:1593.79, status:'current' },
    { unit:'1438-206 Room2', resident:'Anthony Hatz', market_rent:840, actual_rent:740, balance:1593.79, status:'current' },
    { unit:'1438-206 Room3', resident:'Austin Keckler', market_rent:840, actual_rent:740, balance:853.79, status:'current' },
    { unit:'1438-206 Room4', resident:'Jake Zarett', market_rent:840, actual_rent:740, balance:852.75, status:'current' },
    { unit:'1438-301 Room1', resident:'Matthew Ochieng', market_rent:840, actual_rent:740, balance:113.79, status:'current' },
    { unit:'1438-301 Room2', resident:'Grant Samon', market_rent:840, actual_rent:740, balance:2381.16, status:'current' },
    { unit:'1438-302 Room1', resident:'Robert Monek', market_rent:840, actual_rent:740, balance:898.80, status:'current' },
    { unit:'1438-302 Room2', resident:'Anand Makwana', market_rent:840, actual_rent:740, balance:1638.81, status:'current' },
    { unit:'1438-302 Room4', resident:'Sebastian Smythe', market_rent:840, actual_rent:740, balance:3333.76, status:'current' },
    { unit:'1438-304', resident:'Jackson Batchler', market_rent:840, actual_rent:740, balance:3747.72, status:'current' },
    { unit:'1438-305 Room1', resident:'Ben Leon', market_rent:840, actual_rent:740, balance:3045.86, status:'current' },
    { unit:'1438-305 Room2', resident:'Marcus Russo', market_rent:840, actual_rent:740, balance:914.80, status:'current' },
    { unit:'1438-306 Room1', resident:'Michael Wang', market_rent:840, actual_rent:740, balance:113.79, status:'current' },
    { unit:'1438-306 Room5', resident:'Grant Heberling', market_rent:840, actual_rent:740, balance:0.00, status:'current' },
    { unit:'1438-306 Room7', resident:'Jacob Fortuna', market_rent:840, actual_rent:740, balance:113.79, status:'current' },
  ];
window.__RENT_ROLL_LIBRARY.nest1439 = [
    { unit:'1439-03 Room2', resident:'Hayden Rilee', market_rent:740, actual_rent:800, balance:0.00, status:'current' },
    { unit:'1439-03 Room3', resident:'Gus Fowler', market_rent:740, actual_rent:800, balance:0.00, status:'current' },
    { unit:'1439-06 Room1', resident:'Liam Brock', market_rent:740, actual_rent:800, balance:205.00, status:'current' },
    { unit:'1439-06 Room2', resident:'Josh An', market_rent:740, actual_rent:800, balance:5.00, status:'current' },
    { unit:'1439-06 Room3', resident:'Alan Zuniga', market_rent:740, actual_rent:800, balance:0.00, status:'current' },
    { unit:'1439-07 Room1', resident:'Omar Khan', market_rent:740, actual_rent:800, balance:9514.64, status:'current' },
    { unit:'1439-07 Room2', resident:'Josh Styer', market_rent:740, actual_rent:800, balance:-820.00, status:'current' },
    { unit:'1439-07 Room3', resident:'Peyton Settle', market_rent:740, actual_rent:800, balance:0.00, status:'current' },
    { unit:'1439-08 Room1', resident:'Clyde Clouser', market_rent:740, actual_rent:800, balance:965.00, status:'current' },
    { unit:'1439-08 Room2', resident:'Daniel Beqiri', market_rent:740, actual_rent:800, balance:8935.00, status:'current' },
    { unit:'1439-09 Room1', resident:'James MacGregor', market_rent:740, actual_rent:800, balance:-820.00, status:'current' },
    { unit:'1439-09 Room2', resident:'Nick Abboud', market_rent:740, actual_rent:800, balance:0.00, status:'current' },
    { unit:'1439-09 Room3', resident:'Jordan Lieberman', market_rent:740, actual_rent:800, balance:0.00, status:'current' },
    { unit:'1439-10 Room1', resident:'Nick Messick', market_rent:740, actual_rent:800, balance:25.00, status:'current' },
    { unit:'1439-10 Room2', resident:'Saul Carmenini', market_rent:740, actual_rent:800, balance:0.00, status:'current' },
    { unit:'1439-10 Room3', resident:'Eli Outcalt', market_rent:740, actual_rent:800, balance:-820.00, status:'current' },
    { unit:'1439-11 Room1', resident:'Simon Olender', market_rent:740, actual_rent:800, balance:3050.00, status:'current' },
    { unit:'1439-11 Room2', resident:'Jack Redfield', market_rent:740, actual_rent:800, balance:965.00, status:'current' },
    { unit:'1439-11 Room3', resident:'Alex Shukakidze', market_rent:740, actual_rent:800, balance:85.00, status:'current' },
    { unit:'1439-12 Room1', resident:'Declan Beelitz', market_rent:740, actual_rent:800, balance:0.00, status:'current' },
    { unit:'1439-12 Room2', resident:'Kyle Oneill', market_rent:740, actual_rent:800, balance:-820.00, status:'current' },
  ];
