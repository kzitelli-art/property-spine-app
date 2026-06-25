/* ════════════════════════════════════════════════════════════════════════
   PROPERTY SPINE — LEASING POLICY (configuration, not demo, not engine)
   ────────────────────────────────────────────────────────────────────────
   This file holds the CONFIGURABLE RULES the leasing engine reads:
     • __OPERATING_WINDOW_LIB — service hours / business days / the plan-capture
       grace clock / escalation, per property + a _default.
     • __PLAN_POLICY_LIB      — the per-fork cadence table (forks → steps, clocks,
       draft templates) + a version stamp.
   It is NOT demo data (that lives in property-spine-data.js) and NOT engine code
   (the functions that APPLY policy live in index.html). Tune behavior per
   property/team HERE without touching app logic. Load BEFORE index.html.
   ════════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════
   LEASING POLICY (Slice 2) — configurable, NOT hardcoded behavior.
   (1) Operating-window policy: per property/staffing. Service hours, business
       days, the plan-capture grace clock, escalation. Starts 9–5 but the SHAPE
       is configurable so each property can change it without touching workflow.
   (2) Per-fork cadence table: the post-tour plan is a FORK IN THE ROAD, never one
       generic funnel. Jessica supplies judgment (the fork); policy supplies the
       obligations, owners, clocks, and draft templates. Retained with a version
       so we can later audit what the building committed to.
   ════════════════════════════════════════════════════════════════════ */
(function(){
  window.__OPERATING_WINDOW_LIB = {
    _default: { open_hour:9, close_hour:17, business_days:[1,2,3,4,5],
      capture: { reconcile_rule:'next_open_plus_3h' },   // plan-capture grace shape
      escalation: { to_role:'senior_property_manager' } },
    solo:     { open_hour:9, close_hour:17, business_days:[1,2,3,4,5],
      capture: { reconcile_rule:'next_open_plus_3h' },
      escalation: { to_role:'senior_property_manager' } }
  };

  // Each fork: the IMMEDIATE obligations (action + gate) created on selection, plus
  // condition/watch steps that spawn later. due_rule is resolved against the
  // operating window at instantiation; draft is prepared (human-approved, NOT sent).
  window.__PLAN_POLICY_LIB = {
    version: '2026-06-leasing-policy-v1',
    forks: {
      ready_now: { label:'Ready now', summary:'Strong fit, ready to apply.',
        steps:[
          { key:'send_app',          action_label:'Send application link',     obligation_type:'send_application_link',        owner_role:'leasing_coordinator', related_type:'application', due_rule:'by_close_today', kind:'action', draft:'app_link' },
          { key:'check_started',     action_label:'Check application started',  obligation_type:'check_application_started',     owner_role:'leasing_coordinator', related_type:'application', due_rule:'next_open',      kind:'action', condition:'if_unopened',         draft:'app_nudge' },
          { key:'prompt_incomplete', action_label:'Prompt incomplete app',      obligation_type:'prompt_application_incomplete', owner_role:'leasing_coordinator', related_type:'application', due_rule:'plus_24h',       kind:'action', condition:'if_started_incomplete' }
        ] },
      wrong_unit: { label:'Wrong unit / timing', summary:'Interested, needs a better-fit unit or timing.',
        steps:[
          { key:'send_alts', action_label:'Send better-fit options', obligation_type:'send_alternate_units',   owner_role:'leasing_coordinator', related_type:'tour', due_rule:'by_close_today', kind:'action', draft:'alternates' },
          { key:'reengage',  action_label:'Re-engage on availability', obligation_type:'reengage_on_availability', owner_role:'leasing_coordinator', related_type:'tour', due_rule:'watch',         kind:'watch', condition:'on_matching_unit_or_price' }
        ] },
      price_sensitive: { label:'Price-sensitive', summary:'Interested but over budget — no offer before approval.', no_offer_before_approval:true,
        steps:[
          { key:'send_budget',  action_label:'Send in-budget options',     obligation_type:'send_in_budget_options', owner_role:'leasing_coordinator',  related_type:'tour', due_rule:'by_close_today', kind:'action', draft:'budget_options' },
          { key:'pricing_gate', action_label:'Pricing / concession exception', obligation_type:'pricing_exception_gate', owner_role:'senior_property_manager', related_type:'tour', due_rule:'next_open',  kind:'gate' }
        ] },
      needs_cosigner: { label:'Needs guarantor / roommate / parent', summary:'Needs a third party before deciding.',
        steps:[
          { key:'send_info',     action_label:'Send required info', obligation_type:'send_required_info', owner_role:'leasing_coordinator', related_type:'tour', due_rule:'by_close_today',            kind:'action', draft:'cosigner_info' },
          { key:'followup_after',action_label:'Follow up after conversation', obligation_type:'followup_after_conversation', owner_role:'leasing_coordinator', related_type:'tour', due_rule:'after_conversation_window', kind:'action' }
        ] },
      lost: { label:'Lost / not a fit', summary:'Chose elsewhere or not a fit — preserve the reason.',
        steps:[
          { key:'record_reason', action_label:'Record reason lost', obligation_type:'record_loss_reason', owner_role:'leasing_coordinator', related_type:'tour', due_rule:'by_close_today', kind:'close' }
        ] }
    },
    // draft templates — prepared, human-approved, NEVER auto-sent at this stage.
    drafts: {
      app_link:      'Hi {name} — great meeting you today. Here is your application link for {unit}: {app_url} . Happy to help with anything.',
      app_nudge:     'Hi {name} — just checking you were able to open the application for {unit}. Any questions, I am here.',
      alternates:    'Hi {name} — based on what you liked, here are a few better-fit options I think you will like: {alt_list}.',
      budget_options:'Hi {name} — here are options within your budget of {budget}: {budget_list}. Want to take a look?',
      cosigner_info: 'Hi {name} — here is exactly what your guarantor/roommate will need: {requirements}. Send it over whenever ready.'
    }
  };
})();
