// ════════════════════════════════════════════════════════════════════
//  slice9_browser_stack_setup.js — seeds the DISPOSABLE stack the two
//  Slice 9 browser proofs run against, and mints real staff sessions.
//
//  Env: API_DIR (the API repo checkout) · HARNESS_DATABASE_URL (disposable)
//       SP (output dir for slice9_session.json)
//  Fixtures COMMIT — never point this at production.
// ════════════════════════════════════════════════════════════════════
"use strict";
const path = require("path");
const fs = require("fs");
const API = process.env.API_DIR;
const CONN = process.env.HARNESS_DATABASE_URL;
const SP = process.env.SP;
if (!API || !CONN || !SP) { console.error("need API_DIR, HARNESS_DATABASE_URL, SP"); process.exit(1); }
const { Pool } = require(path.join(API, "node_modules/pg"));

(async () => {
  const pool = new Pool({ connectionString: CONN, ssl: false });
  const svc = require(path.join(API, "src/identity/staff_session_service.js"));
  const L = require(path.join(API, "src/leasing/leasing_lifecycle_service"))({ pool });
  const c = await pool.connect();
  const one = async (q, a = []) => (await c.query(q, a)).rows[0];
  await c.query("begin");

  const A = (await one(`insert into properties (name, operating_timezone) values ('Browser Proof Tower','America/New_York') returning id`)).id;
  const B = (await one(`insert into properties (name, operating_timezone) values ('Browser Empty Annex','America/New_York') returning id`)).id;
  const mkUser = async (n) => (await one(
    `insert into users (name,email,phone,role,is_active,status)
     values ($1,$2,$3,'property_manager',true,'active') returning id`,
    [n, `${n}@bp.test`, "+1724888" + Math.floor(Math.random() * 9000 + 1000)])).id;
  const uFull = await mkUser("bp-uFull"), uCover = await mkUser("bp-uCover"),
        uB = await mkUser("bp-uB"), host = await mkUser("bp-host");
  const assign = (u, p, m) => c.query(
    `insert into property_team_assignments
      (property_id,user_id,role_title,scope_type,allowed_modules,primary_for_modules,can_manage_roles,active)
     values ($1,$2,'Proof','property',$3,$3,false,true)`, [p, u, m]);
  await assign(uFull, A, ["leasing"]); await assign(uCover, A, ["leasing"]);
  await assign(uB, B, ["leasing"]);

  //  person + conversation + N opportunities (+ optional close events)
  const mk = async (label, opps, closeIdx, unitNo) => {
    const person = (await one(`insert into persons (name, lifecycle_status) values ($1,'lead') returning id`, [label])).id;
    const conv = (await one(`insert into conversations (property_id, person_id, channel_primary, status)
      values ($1,$2,'sms','open') returning id`, [A, person])).id;
    const lead = (await one(`insert into leasing_leads (person_id, property_id, status, received_at)
      values ($1,$2,'new','2026-08-03T12:00:00Z') returning id`, [person, A])).id;
    let unit = null;
    if (unitNo) unit = (await one(`insert into units (property_id, unit_number) values ($1,$2) returning id`, [A, unitNo])).id;
    const ids = [];
    for (let i = 0; i < opps; i++) {
      ids.push((await one(
        `insert into leasing_conversions (person_id,property_id,lead_id,status,current_stage,opened_at,
           actual_tour_host_user_id, conversation_owner_user_id, preferred_unit_id)
         values ($1,$2,$3,$4,'touring', ('2026-06-01'::timestamptz + ($5||' days')::interval), $6,$6,$7) returning id`,
        [person, A, lead, i === opps - 1 ? "active" : "released", String(i * 15), host,
         i === 0 ? unit : null])).id);
    }
    let seq = 0;
    for (const idx of closeIdx) {
      await c.query(`insert into leasing_lead_lifecycle_events (conversation_id, conversion_id, property_id,
          event_sequence, event_type, actor_type, actor_id, reason_code, idempotency_key, occurred_at)
        values ($1,$2,$3,$4,'closed_not_fit','operator',$5,$6,$7,'2026-07-20T12:00:00Z')`,
        [conv, ids[idx], A, ++seq, host, idx === 0 ? "budget_mismatch" : "move_timing", `bp-${label}-${idx}`]);
    }
    const inbound = (await one(`insert into comm_events (property_id, person_id, conversation_id, channel,
        direction, body, classification, sender_role)
      values ($1,$2,$3,'text','inbound',$4,'leasing','prospect') returning id`,
      [A, person, conv, `Hi — it's ${label.split(" ")[0]}. Circumstances changed, still interested!`])).id;
    return { person, conv, lead, ids, inbound };
  };

  const D1 = await mk("Dana Reeves", 1, [0], "204");     // one candidate
  const D2 = await mk("Marcus Bell", 3, [0, 1], "310");  // several candidates
  //  DZ: zero candidates — a conversation-level legacy close, no opportunity.
  const zPerson = (await one(`insert into persons (name, lifecycle_status) values ('Zoe Blank','lead') returning id`)).id;
  const zConv = (await one(`insert into conversations (property_id, person_id, channel_primary, status)
    values ($1,$2,'sms','open') returning id`, [A, zPerson])).id;
  await c.query(`insert into leasing_lead_lifecycle_events (conversation_id, property_id,
      event_sequence, event_type, actor_type, actor_id, reason_code, idempotency_key, occurred_at)
    values ($1,$2,1,'closed_not_fit','operator',$3,'duplicate','bp-z','2026-07-20T12:00:00Z')`, [zConv, A, host]);
  const zInbound = (await one(`insert into comm_events (property_id, person_id, conversation_id, channel,
      direction, body, classification, sender_role)
    values ($1,$2,$3,'text','inbound','Hello? Anyone there?','leasing','prospect') returning id`, [A, zPerson, zConv])).id;

  //  Evidence data on A: one resolved (attended + linked approved application),
  //  one pending future appointment (=> partial), one no-appointment.
  const seedEvidence = async (label, kind) => {
    const person = (await one(`insert into persons (name, lifecycle_status) values ($1,'lead') returning id`, [label])).id;
    const lead = (await one(`insert into leasing_leads (person_id, property_id, status, received_at)
      values ($1,$2,'new','2026-08-04T12:00:00Z') returning id`, [person, A])).id;
    const opp = (await one(
      `insert into leasing_conversions (person_id,property_id,lead_id,status,current_stage,opened_at,
         actual_tour_host_user_id, conversation_owner_user_id)
       values ($1,$2,$3,'active','touring','2026-08-04T12:00:00Z',$4,$4) returning id`, [person, A, lead, host])).id;
    if (kind === "resolved") {
      await c.query(`insert into leasing_tours (lead_id, property_id, leasing_agent_id, scheduled_for, status, completed_at, conversion_id)
        values ($1,$2,$3,'2026-08-07T15:00:00Z','completed','2026-08-07T15:00:00Z',$4)`, [lead, A, host, opp]);
      await c.query(`insert into lease_applications (property_id, person_id, conversion_id, status, created_at, submitted_at, approved_at)
        values ($1,$2,$3,'approved','2026-08-09T12:00:00Z','2026-08-09T12:00:00Z','2026-08-11T12:00:00Z')`, [A, person, opp]);
    } else if (kind === "pending") {
      await c.query(`insert into leasing_tours (lead_id, property_id, leasing_agent_id, scheduled_for, status, conversion_id)
        values ($1,$2,$3,'2026-12-01T15:00:00Z','scheduled',$4)`, [lead, A, host, opp]);
    }
  };
  await seedEvidence("Evie Attended", "resolved");
  await seedEvidence("Piotr Pending", "pending");
  await seedEvidence("Nina Noappt", "none");
  await c.query("commit");

  //  Open the decisions through the REAL refusal path.
  const openD = async (conv, inbound) => {
    const cc = await pool.connect();
    try { await cc.query("begin");
      const r = await L.maybeReopenOnQualifyingInbound(cc, { conversationId: conv, sourceCommEventId: inbound });
      await cc.query("commit"); return r.decision_obligation_id;
    } finally { cc.release(); }
  };
  const obD1 = await openD(D1.conv, D1.inbound);
  const obD2 = await openD(D2.conv, D2.inbound);
  const obDZ = await openD(zConv, zInbound);
  c.release();

  const mkSession = async (u, p) => {
    const cc = await pool.connect();
    try { await cc.query("begin");
      const s = await svc.issueStaffSession(cc, { userId: u, propertyId: p, purpose: "sms_otp" });
      await cc.query("commit"); return s.session_token;
    } finally { cc.release(); }
  };
  const out = {
    A, B, uFull, uCover, uB,
    tokFull: await mkSession(uFull, A),
    tokCover: await mkSession(uCover, A),
    tokB: await mkSession(uB, B),
    obD1, obD2, obDZ,
    d1: { opp: D1.ids[0] }, d2: { opps: D2.ids },
  };
  fs.writeFileSync(path.join(SP, "slice9_session.json"), JSON.stringify(out, null, 2));
  console.log("stack seeded:", JSON.stringify({ obD1, obD2, obDZ, A: out.A }));
  await pool.end();
})().catch((e) => { console.error("SEED FAILED:", e.message); process.exit(1); });
