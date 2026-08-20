#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
//  slice10e_browser_stack_setup.js — seeds the DISPOSABLE stack the 10E
//  browser acceptance runs against, and mints real staff sessions.
//  CLASS 3 (test infrastructure). SYNTHETIC DATA ONLY.
//
//  Env: API_DIR (the API repo checkout) · HARNESS_DATABASE_URL (disposable)
//       SP (output dir for slice10e_session.json)
//  Fixtures COMMIT — never point this at production.
//
//  ── WHAT IT BUILDS, AND WHY EACH SHAPE EXISTS ─────────────────────
//  One "states" property carrying one position per named state in the frozen
//  contracts, so the browser can be shown every value the contract can carry
//  rather than the handful a realistic property happens to produce.
//
//  Every shape below is derived from the SOURCE that decides it, not from a
//  description of it:
//    position_state      src/surfaces/future_rent_roll_facts.js futureState()
//    proof_basis         src/tenancy/position_classifier.js proofBasis()
//    rent_authority      src/tenancy/dated_position_rows.js economicsForRow()
//    resolution_state    src/tenancy/dated_position_rows.js actionForRow()
//    denominator_class   src/tenancy/dated_position_rows.js denominatorClass()
//
//  It also reuses the 10D scale property (10,000 positions, adverse
//  conditions deliberately beyond ordinal 9,900) by granting it a session —
//  it is not rebuilt here, because rebuilding it would be a second fixture
//  claiming to be the same one.
// ════════════════════════════════════════════════════════════════════
"use strict";
const path = require("path");
const fs = require("fs");
const API = process.env.API_DIR;
const CONN = process.env.HARNESS_DATABASE_URL;
const SP = process.env.SP;
if (!API || !CONN || !SP) { console.error("need API_DIR, HARNESS_DATABASE_URL, SP"); process.exit(1); }
const { Pool } = require(path.join(API, "node_modules/pg"));

//  The selected date every assertion is written against. Chosen so the 10D
//  fixture's own target month (2026-12) is shared, and so a lease starting in
//  that month can demonstrate qualified_legacy.
const TARGET = "2026-12-15";
const TARGET_MONTH_START = "2026-12-01";

(async () => {
  const pool = new Pool({ connectionString: CONN, ssl: false });
  const svc = require(path.join(API, "src/identity/staff_session_service.js"));
  const c = await pool.connect();
  const one = async (q, a = []) => (await c.query(q, a)).rows[0];
  await c.query("begin");

  //  ── PROPERTIES ──────────────────────────────────────────────────
  //  S  every named state
  //  E  a property with positions but none on the leasing side — proves
  //     no_qualifying_result is impossible to confuse with "empty page"
  //  Z  NO operating timezone — authority_missing, the honest refusal
  //  C  every axis settled — the ONLY shape in which a rate and a total may
  //     be published at all, so the published states are provable too
  //  E  positions exist but none is revenue — an EMPTY denominator, which is
  //     not the same fact as a withheld one
  //  N  no positions at all — no_qualifying_result
  //  Z  NO operating timezone — authority_missing, the honest refusal
  const S = (await one(`insert into properties (name, operating_timezone)
    values ('10E States Tower','America/New_York') returning id`)).id;
  const C = (await one(`insert into properties (name, operating_timezone)
    values ('10E Clean Tower','America/New_York') returning id`)).id;
  const E = (await one(`insert into properties (name, operating_timezone)
    values ('10E Empty Annex','America/New_York') returning id`)).id;
  const N = (await one(`insert into properties (name, operating_timezone)
    values ('10E No Positions','America/New_York') returning id`)).id;
  const Z = (await one(`insert into properties (name)
    values ('10E No Operating Day') returning id`)).id;

  const mkUser = async (n) => (await one(
    `insert into users (name,email,phone,role,is_active,status)
     values ($1,$2,$3,'property_manager',true,'active') returning id`,
    [n, `${n}-${Date.now()}@s10e.test`, "+1727" + String(Math.floor(Math.random() * 9e6 + 1e6))])).id;
  const uS = await mkUser("s10e-states"), uC = await mkUser("s10e-clean"),
        uE = await mkUser("s10e-empty"), uN = await mkUser("s10e-nopos"),
        uZ = await mkUser("s10e-nozone"), uNoLease = await mkUser("s10e-nolease"),
        uOwner = await mkUser("s10e-owner");
  const assign = (u, p, m) => c.query(
    `insert into property_team_assignments
      (property_id,user_id,role_title,scope_type,allowed_modules,primary_for_modules,can_manage_roles,active)
     values ($1,$2,'Proof','property',$3,$3,false,true)`, [p, u, m]);
  await assign(uS, S, ["leasing"]);
  await assign(uC, C, ["leasing"]);
  await assign(uE, E, ["leasing"]);
  await assign(uN, N, ["leasing"]);
  await assign(uZ, Z, ["leasing"]);
  //  A REAL signed-in operator on the same property with maintenance only.
  //  The forbidden state must come from entitlement, never from no session.
  await assign(uNoLease, S, ["maintenance"]);

  const person = (await one(`insert into persons (name, lifecycle_status)
    values ('10E Synthetic Tenant','tenant') returning id`)).id;

  //  ── HELPERS THAT BUILD ONE POSITION ─────────────────────────────
  const mkSpace = async (property, unitNumber, use_type, classified) => {
    const unit = (await one(
      `insert into units (property_id, unit_number, market_rent) values ($1,$2,9876) returning id`,
      [property, unitNumber])).id;
    //  A trigger creates one space per unit; take it rather than insert a second.
    const sp = (await one(`select id from spaces where unit_id=$1 order by space_label limit 1`, [unit]));
    const space = sp ? sp.id
      : (await one(`insert into spaces (unit_id, space_label) values ($1,'(whole unit)') returning id`, [unit])).id;
    if (use_type === null) {
      await c.query(`update spaces set use_type=null, classified_by_user_id=null,
        classified_at=null, classification_source=null where id=$1`, [space]);
    } else {
      await c.query(`update spaces set use_type=$2, classified_by_user_id=$3,
        classified_at=now(), classification_source=$4 where id=$1`,
        [space, use_type, classified ? uOwner : null, classified ? "reviewed_mapping" : "fixture"]);
    }
    return { unit, space };
  };

  const mkLease = async (property, space, { rent, start, end, status = "active",
                                            source_type = null, confidence = null }) =>
    (await one(
      `insert into leases (property_id, space_id, tenant_ids, rent, start_date, end_date,
         lease_status, source_type, confidence)
       values ($1,$2,array[$3::uuid],$4,$5,$6,$7,$8,$9) returning id`,
      [property, space, person, rent, start, end, status, source_type, confidence])).id;

  //  NATIVE PROOF = executed AND funded (position_classifier.isNativelyProven).
  //  BOTH halves are seeded, because seeding one and calling it native would
  //  reproduce the exact overstatement classifyFutureCommitment exists to stop.
  const proveNative = async (lease) => {
    const sp = (await one(`select space_id, property_id from leases where id=$1`, [lease]));
    const app = (await one(
      `insert into lease_applications (property_id, person_id, status)
       values ($1,$2,'approved') returning id`, [sp.property_id, person])).id;
    const ev = (await one(
      `insert into events (property_id, person_id, type, note)
       values ($1,$2,'lease_executed','10E synthetic execution') returning id`,
      [sp.property_id, person])).id;
    await c.query(
      `insert into executed_lease_records (application_id, property_id, space_id, lease_id,
         rent, security_deposit, lease_start_date, lease_end_date, payload_hash,
         document_sha256, executed_at, signers, execution_channel,
         verified_by_user_id, event_id, record_state)
       values ($1,$2,$3,$4, 1000, 1000, $5, $6, 'synthetic-hash',
               repeat('a',64), $5, '[{"name":"10E Synthetic Tenant"}]'::jsonb, 'paper',
               $7, $8, 'verified')`,
      [app, sp.property_id, sp.space_id, lease, "2026-01-01", "2027-12-31", uOwner, ev]);
    //  FUNDED means a required move-in charge exists AND nothing is outstanding.
    //  Absence of a charge set is NOT funded — so the row is present and paid.
    await c.query(
      `insert into scheduled_charges (lease_id, property_id, charge_type, period, amount,
         amount_paid, status, is_move_in_required, due_date)
       values ($1,$2,'move_in_required',$3,1500,1500,'paid',true,$3)`,
      [lease, sp.property_id, "2026-01-01"]);
  };

  //  One offer backs every schedule; lease_economic_schedules.source_offer_id
  //  is NOT NULL because a dated schedule must name where its terms came from.
  const offer = (await one(
    `insert into lease_offers (property_id, person_id, status, source, scope,
       offered_terms_snapshot, authority_basis_snapshot, granted_by_person_id)
     values ($1,$2,'draft','discretionary','property','{}'::jsonb,'{}'::jsonb,$3) returning id`,
    [S, person, person])).id;

  const mkSchedule = async (property, space, months) => {
    const app = (await one(
      `insert into lease_applications (property_id, person_id, status)
       values ($1,$2,'approved') returning id`, [property, person])).id;
    const sched = (await one(
      `insert into lease_economic_schedules (property_id, application_id, space_id, status,
         source_offer_id, locked_by_person_id)
       values ($1,$2,$3,'locked',$4,$5) returning id`, [property, app, space, offer, person])).id;
    for (const m of months) {
      await c.query(
        `insert into lease_economic_lines (schedule_id, effective_month, line_type, amount)
         values ($1,$2,$3,$4)`, [sched, m.month, m.type, m.amount]);
    }
    return sched;
  };

  const mkObligation = async (property, lease, { status = "open", type = "resolve_inbound_opportunity",
                                                 owner = uS, due = "+30 days", label = "Resolve the inbound opportunity" }) =>
    (await one(
      `insert into obligations (property_id, module, type, status, related_id, related_type,
         due_at, assigned_user_id, label)
       values ($1,'leasing',$2,$3,$4,'lease', ${due === null ? "null" : `now() + interval '${due}'`}, $5, $6)
       returning id`, [property, type, status, lease, owner, label])).id;

  //  ── THE NAMED SHAPES ────────────────────────────────────────────
  //  Unit numbers are ordered so the page order is legible in a screenshot.
  const shapes = {};

  // A01 contractually_locked · native_verified · dated_economic_line · existing_action(with destination)
  {
    const { space } = await mkSpace(S, "A01", "residential", true);
    const l = await mkLease(S, space, { rent: 1000, start: "2026-01-01", end: "2027-12-31" });
    await proveNative(l);
    await mkSchedule(S, space, [{ month: TARGET_MONTH_START, type: "base_rent", amount: 1850 }]);
    const ob = await mkObligation(S, l, {});
    shapes.A01 = { space, lease: l, obligation: ob };
  }
  // A02 contractually_locked · confirmed_opening_import — the OTHER proof of one state
  {
    const { space } = await mkSpace(S, "A02", "residential", true);
    const l = await mkLease(S, space, { rent: 1100, start: "2026-01-01", end: "2027-12-31",
      source_type: "historical_snapshot", confidence: "confirmed" });
    await mkSchedule(S, space, [{ month: TARGET_MONTH_START, type: "base_rent", amount: 1900 }]);
    shapes.A02 = { space, lease: l };
  }
  // A03 dated schedule NET OF A CONCESSION effective in the target month
  {
    const { space } = await mkSpace(S, "A03", "residential", true);
    const l = await mkLease(S, space, { rent: 1200, start: "2026-01-01", end: "2027-12-31" });
    await proveNative(l);
    await mkSchedule(S, space, [
      { month: TARGET_MONTH_START, type: "base_rent", amount: 2000 },
      { month: TARGET_MONTH_START, type: "concession_credit", amount: -250 },
      //  A one-time fee in the same month, which must NOT enter monthly rent.
      { month: TARGET_MONTH_START, type: "one_time_fee", amount: 99 },
    ]);
    shapes.A03 = { space, lease: l };
  }
  // A04 covered_unproven — a real covering lease with neither proof
  {
    const { space } = await mkSpace(S, "A04", "residential", true);
    const l = await mkLease(S, space, { rent: 1300, start: "2026-01-01", end: "2027-12-31" });
    await mkSchedule(S, space, [{ month: TARGET_MONTH_START, type: "base_rent", amount: 1750 }]);
    shapes.A04 = { space, lease: l };
  }
  // A05 qualified_legacy — no schedule; the lease opens IN the target month
  {
    const { space } = await mkSpace(S, "A05", "residential", true);
    const l = await mkLease(S, space, { rent: 1425, start: TARGET_MONTH_START, end: "2027-12-31" });
    shapes.A05 = { space, lease: l };
  }
  // A06 legacy BEYOND the provable month — an amount that cannot prove this month
  {
    const { space } = await mkSpace(S, "A06", "residential", true);
    const l = await mkLease(S, space, { rent: 1555, start: "2026-01-01", end: "2027-12-31" });
    shapes.A06 = { space, lease: l };
  }
  // A07 rent MISSING — a covering lease whose rent is zero (never coerced to $0)
  {
    const { space } = await mkSpace(S, "A07", "residential", true);
    const l = await mkLease(S, space, { rent: 0, start: "2026-01-01", end: "2027-12-31" });
    shapes.A07 = { space, lease: l };
  }
  // A08 rent CONFLICT from economics — two base rents in the target month
  {
    const { space } = await mkSpace(S, "A08", "residential", true);
    const l = await mkLease(S, space, { rent: 1600, start: "2026-01-01", end: "2027-12-31" });
    await mkSchedule(S, space, [{ month: TARGET_MONTH_START, type: "base_rent", amount: 2100 }]);
    await mkSchedule(S, space, [{ month: TARGET_MONTH_START, type: "base_rent", amount: 2600 }]);
    shapes.A08 = { space, lease: l };
  }
  // A09 conflict_state=conflicted — two overlapping non-terminal leases
  {
    const { space } = await mkSpace(S, "A09", "residential", true);
    const l1 = await mkLease(S, space, { rent: 1700, start: "2026-01-01", end: "2027-12-31" });
    const l2 = await mkLease(S, space, { rent: 2700, start: "2026-06-01", end: "2027-06-30" });
    shapes.A09 = { space, leases: [l1, l2] };
  }
  // A10 open_or_uncovered — no lease reaches the selected date at all
  {
    const { space } = await mkSpace(S, "A10", "residential", true);
    shapes.A10 = { space };
  }
  // A11 successor_pending_not_locked — a PENDING lease governs the date and a
  //     later, unproven lease follows it. Pending is not occupancy.
  {
    const { space } = await mkSpace(S, "A11", "residential", true);
    const gov = await mkLease(S, space, { rent: 1800, start: "2026-01-01", end: "2027-01-31", status: "pending" });
    const succ = await mkLease(S, space, { rent: 1900, start: "2027-02-01", end: "2028-01-31", status: "pending" });
    shapes.A11 = { space, governing: gov, successor: succ };
  }
  // A12 successor LOCKED — same geometry, but the successor is executed and funded
  {
    const { space } = await mkSpace(S, "A12", "residential", true);
    const gov = await mkLease(S, space, { rent: 1850, start: "2026-01-01", end: "2027-01-31", status: "pending" });
    const succ = await mkLease(S, space, { rent: 1950, start: "2027-02-01", end: "2028-01-31" });
    await proveNative(succ);
    shapes.A12 = { space, governing: gov, successor: succ };
  }
  // A13 denominator non_revenue — excluded from the denominator, still a position
  {
    const { space } = await mkSpace(S, "A13", "non_revenue", true);
    const l = await mkLease(S, space, { rent: 0, start: "2026-01-01", end: "2027-12-31" });
    shapes.A13 = { space, lease: l };
  }
  // A14 denominator unknown — never classified at all (NULL)
  {
    const { space } = await mkSpace(S, "A14", null, false);
    const l = await mkLease(S, space, { rent: 1000, start: "2026-01-01", end: "2027-12-31" });
    shapes.A14 = { space, lease: l };
  }
  // A15 denominator unknown by 'other' — classified, and still not a denominator
  {
    const { space } = await mkSpace(S, "A15", "other", true);
    shapes.A15 = { space };
  }
  // A16 commercial revenue — revenue, and NOT residential
  {
    const { space } = await mkSpace(S, "A16", "commercial", true);
    const l = await mkLease(S, space, { rent: 5000, start: "2026-01-01", end: "2027-12-31" });
    await proveNative(l);
    await mkSchedule(S, space, [{ month: TARGET_MONTH_START, type: "base_rent", amount: 5200 }]);
    shapes.A16 = { space, lease: l };
  }
  // A17 resolution_state=conflict — two ACTIVE obligations on one referenced lease
  {
    const { space } = await mkSpace(S, "A17", "residential", true);
    const l = await mkLease(S, space, { rent: 2000, start: "2026-01-01", end: "2027-12-31" });
    await proveNative(l);
    await mkSchedule(S, space, [{ month: TARGET_MONTH_START, type: "base_rent", amount: 2050 }]);
    await mkObligation(S, l, { status: "open", label: "First claim" });
    await mkObligation(S, l, { status: "in_progress", label: "Second claim" });
    shapes.A17 = { space, lease: l };
  }
  // A18 existing_action, UNASSIGNED and OVERDUE, obligation type with NO
  //     governed destination — three honest absences on one row
  {
    const { space } = await mkSpace(S, "A18", "residential", true);
    const l = await mkLease(S, space, { rent: 2100, start: "2026-01-01", end: "2027-12-31" });
    await proveNative(l);
    await mkSchedule(S, space, [{ month: TARGET_MONTH_START, type: "base_rent", amount: 2150 }]);
    await mkObligation(S, l, { type: "lease_review", owner: null, due: "-9 days",
                               label: "Review the executed lease" });
    shapes.A18 = { space, lease: l };
  }
  // A19 closed action lineage — a terminal obligation explains WHY nothing is open
  {
    const { space } = await mkSpace(S, "A19", "residential", true);
    const l = await mkLease(S, space, { rent: 2200, start: "2026-01-01", end: "2027-12-31" });
    await proveNative(l);
    await mkSchedule(S, space, [{ month: TARGET_MONTH_START, type: "base_rent", amount: 2250 }]);
    await mkObligation(S, l, { status: "complete", label: "Already closed" });
    shapes.A19 = { space, lease: l };
  }
  // A20 possession_without_current_lease — the ONE retained explanatory string
  {
    const { space, unit } = await mkSpace(S, "A20", "residential", true);
    await c.query(
      `insert into unit_events (property_id, unit_id, space_id, event_type, effective_date, status, source)
       values ($1,$2,$3,'move_in','2026-03-01','actioned','fixture')`, [S, unit, space]);
    shapes.A20 = { space };
  }

  //  ── THE CLEAN PROPERTY ──────────────────────────────────────────
  //  Every axis settled, so occupancy and rent are PUBLISHABLE. Without this
  //  the acceptance would only ever see withheld states and could not tell a
  //  correct refusal from a renderer that refuses everything.
  //  Three locked of five revenue positions => 60.0%, a rate that is not 0,
  //  not 100, and not reachable by rounding an empty set.
  const clean = [];
  for (let i = 1; i <= 5; i++) {
    const { space } = await mkSpace(C, "C0" + i, "residential", true);
    if (i === 5) {
      //  qualified_legacy: no dated schedule, and the lease opens IN the
      //  target month, which is the only month its undated amount can prove.
      //  Its presence is what makes includes_qualified_legacy true.
      await mkLease(C, space, { rent: 1499, start: TARGET_MONTH_START, end: "2027-12-31" });
    } else {
      const l = await mkLease(C, space, { rent: 1000, start: "2026-01-01", end: "2027-12-31" });
      if (i <= 3) await proveNative(l);
      await mkSchedule(C, space, [{ month: TARGET_MONTH_START, type: "base_rent", amount: 1000 + i * 100 }]);
    }
    clean.push(space);
  }

  //  The EMPTY property has a position, and it is NON-REVENUE. A zero
  //  denominator is a different fact from a withheld one, and the surface
  //  must be shown saying so.
  await mkSpace(E, "B01", "non_revenue", true);
  //  N has no units at all — no_qualifying_result, not "an empty page".

  await c.query("commit");
  c.release();

  //  ── SESSIONS, through the real issuer ───────────────────────────
  const mkSession = async (u, p) => {
    const cc = await pool.connect();
    try {
      await cc.query("begin");
      const s = await svc.issueStaffSession(cc, { userId: u, propertyId: p, purpose: "sms_otp" });
      await cc.query("commit");
      return s.session_token;
    } finally { cc.release(); }
  };

  //  The 10D scale property, reused rather than rebuilt.
  let scale = null;
  const fixturePath = path.join(API, ".slice10d_fixture.json");
  if (fs.existsSync(fixturePath)) {
    const f = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const uScale = await mkUser("s10e-scale");
    const cc = await pool.connect();
    try {
      await cc.query(
        `insert into property_team_assignments
          (property_id,user_id,role_title,scope_type,allowed_modules,primary_for_modules,can_manage_roles,active)
         values ($1,$2,'Proof','property',$3,$3,false,true)`,
        [f.selected_property_id, uScale, ["leasing"]]);
    } finally { cc.release(); }
    scale = { property_id: f.selected_property_id, user: uScale,
              tok: await mkSession(uScale, f.selected_property_id),
              manifest: f.manifest };
  }

  const out = {
    target_date: TARGET,
    S, C, E, N, Z, uS, uC, uE, uN, uZ, uNoLease, uOwner,
    tokS: await mkSession(uS, S),
    tokC: await mkSession(uC, C),
    tokE: await mkSession(uE, E),
    tokN: await mkSession(uN, N),
    tokZ: await mkSession(uZ, Z),
    tokNoLease: await mkSession(uNoLease, S),
    shapes, clean, scale,
  };
  fs.writeFileSync(path.join(SP, "slice10e_session.json"), JSON.stringify(out, null, 2));
  console.log("stack seeded: states=" + S + " clean=" + C + " empty=" + E
    + " nopositions=" + N + " nozone=" + Z
    + (scale ? " scale=" + scale.property_id : " scale=(10D fixture absent)"));
  await pool.end();
})().catch((e) => { console.error("SEED FAILED:", e.message); console.error(e.stack); process.exit(1); });
