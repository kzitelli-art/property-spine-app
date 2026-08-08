"use strict";

// PROPERTY SPINE — THE PROOF NORMALIZER
//
// Release 0, deployment step 1. See property-spine-api
// docs/RELEASE_0_IMPLEMENTATION_PLAN.md §3.2–§3.4 (architecture frozen at
// 4f25f73).
//
// ── ONE INTERPRETATION POINT ────────────────────────────────────────
// Every surface that shows a proof condition reads THIS and nothing else.
// No screen may test `proof.satisfied`, compare `proof.state` to a string,
// or decide for itself what a missing field means. The moment two surfaces
// interpret the response independently they can disagree about the same
// work order, and the states this release exists to distinguish are exactly
// the ones they would disagree about.
//
// ── IT ACCEPTS BOTH CONTRACTS, ON PURPOSE ───────────────────────────
// This ships BEFORE the API emits the new shape, so it must read the old
// one today and the new one tomorrow without a second deploy in between.
//
//   OLD   { required, satisfied: true|false, not_preserved_count, … }
//   NEW   { required, read_status: "ok", state: <one of four>,
//           satisfied: <mapped>, legacy_evidence: {…}, … }
//   NEW   { required, read_status: "unavailable", reason_code }
//
// ── FOUR STATES. NOT FIVE. ──────────────────────────────────────────
// `proof.state`, when present, is exactly:
//
//   satisfied · not_satisfied · legacy_indeterminate · missing_evaluation_defect
//
// "unavailable" is NOT one of them. When the API cannot complete the proof
// read it says so with read_status, and `state` is absent. Unavailability is
// a property of the READ, never a proof condition.
//
// ── THE ONE RULE THAT MATTERS MOST ──────────────────────────────────
// A response this file cannot understand renders UNAVAILABLE.
// It NEVER degrades to not_satisfied, never to legacy, never to empty.
// Telling an operator "proof is missing" because we failed to parse a
// payload is a confident wrong, and it is the exact class of defect
// Release 0 exists to remove.
//
// A legitimate `unavailable` and a contract failure look identical to the
// operator and are distinguished in the console: one is a known condition,
// the other is a bug someone has to fix.

(function (factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.__psProof = api;
})(function () {

  //  The closed set. Anything outside it is a contract failure.
  var STATES = ["satisfied", "not_satisfied", "legacy_indeterminate",
                "missing_evaluation_defect"];

  //  The frozen compatibility mapping (plan §3.4). `null` is deliberate:
  //  legacy and writer-defect are NOT "proof failed" and must never be
  //  collapsed into it.
  var EXPECTED_BOOLEAN = {
    satisfied:                 true,
    not_satisfied:             false,
    legacy_indeterminate:      null,
    missing_evaluation_defect: null
  };

  //  What the operator reads. One sentence per state, no compounding.
  var LABEL = {
    satisfied:                 "Valid proof recorded.",
    not_satisfied:             "Valid completion proof is still required.",
    legacy_indeterminate:      "Completed under the prior proof model. "
                             + "No historical evaluation was recorded.",
    missing_evaluation_defect: "Completion occurred after proof evaluation "
                             + "became required, but no evaluation was recorded.",
    unavailable:               "Proof state unavailable."
  };

  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }

  //  PRESENT means the key exists AND carries a value. An own property set
  //  to `undefined` is not a value — it is a key someone forgot to fill.
  //  `false`, `null` and absent are three different facts and this file
  //  never lets truthiness blur them.
  function present(o, k) { return has(o, k) && o[k] !== undefined; }

  function unavailable(reasonCode, contractFailure, detail) {
    if (contractFailure && typeof console !== "undefined" && console.error) {
      //  A bug, not a condition. Loud in the log, quiet on screen.
      console.error("[proof-normalizer] CONTRACT FAILURE: " + reasonCode
                    + (detail ? " — " + detail : ""));
    }
    return {
      status:            contractFailure ? "contract_failure" : "unavailable",
      renders:           "unavailable",
      state:             null,
      satisfied:         null,
      isDefect:          false,
      required:          true,
      notPreservedCount: 0,
      legacyEvidence:    { photo: false, note: false },
      label:             LABEL.unavailable,
      reasonCode:        reasonCode
    };
  }

  //  ── SUPPORTING FIELDS ARE FACTS, NOT DECORATION ───────────────────
  //  An earlier revision defaulted a missing `required` to true, a missing
  //  or malformed count to 0, and a missing evidence block to false/false.
  //  Those defaults are safe-LOOKING and still wrong: they invent operating
  //  facts the API never sent. "Zero unpreserved attachments" and "the API
  //  omitted the count" are different statements, and only one of them is
  //  true. An omitted diagnostic fact renders UNAVAILABLE.
  function isBool(v) { return v === true || v === false; }
  function isCount(v) { return typeof v === "number" && isFinite(v) && v >= 0 && Math.floor(v) === v; }
  function isText(v) { return typeof v === "string" && v.length > 0; }

  /*  normalize(proof) — the only function any surface calls.
   *
   *  Returns a shape that is ALWAYS safe to render. Callers switch on
   *  `renders` for presentation and `state` for meaning; they never inspect
   *  the raw payload again.
   */
  function normalize(proof) {
    if (proof == null || typeof proof !== "object") {
      return unavailable("proof_absent", true, "no proof object on the response");
    }

    //  Required on EVERY contract and every branch.
    if (!present(proof, "required") || !isBool(proof.required)) {
      return unavailable("required_invalid", true,
                         "required=" + JSON.stringify(proof.required));
    }
    var required = proof.required;

    // ── NEW CONTRACT ────────────────────────────────────────────────
    if (has(proof, "read_status")) {

      if (proof.read_status === "unavailable") {
        //  THE INVERSE CONTRACT. The API cannot simultaneously say "the read
        //  did not complete" and publish a proof conclusion. A payload that
        //  does both contradicts itself, and that is a bug rather than a
        //  legitimate unavailable.
        if (has(proof, "state")) {
          return unavailable("unavailable_with_state", true,
                             "read_status=unavailable but state=" + JSON.stringify(proof.state));
        }
        if (has(proof, "satisfied")) {
          return unavailable("unavailable_with_satisfied", true,
                             "read_status=unavailable but satisfied=" + JSON.stringify(proof.satisfied));
        }
        //  An unavailable read must still say WHY. "Unavailable, reason
        //  unstated" is not a diagnosable condition.
        if (!isText(proof.reason_code)) {
          return unavailable("reason_code_invalid", true,
                             "reason_code=" + JSON.stringify(proof.reason_code));
        }
        var u = unavailable(proof.reason_code, false);
        u.required = required;
        return u;
      }

      if (proof.read_status !== "ok") {
        return unavailable("unknown_read_status", true,
                           "read_status=" + JSON.stringify(proof.read_status));
      }
      if (!present(proof, "state")) {
        return unavailable("state_missing", true, "read_status=ok without state");
      }
      if (STATES.indexOf(proof.state) === -1) {
        return unavailable("unknown_state", true, "state=" + JSON.stringify(proof.state));
      }
      /*  ── THE COMPATIBILITY FIELD IS OPTIONAL ON THE NEW CONTRACT ───
       *
       *  It was REQUIRED, on the reasoning that "absence is not agreement
       *  — a mapping cannot be verified against a value nobody sent."
       *  That was right while §3.4 promised both fields. It is exactly
       *  wrong as the field is retired: the API cannot ever stop sending
       *  `satisfied` while this file treats its absence as a CONTRACT
       *  FAILURE, because the first response without it would render
       *  every work order UNAVAILABLE.
       *
       *  So absence is now accepted, and PRESENCE IS STILL CROSS-CHECKED.
       *  Nothing is given up: a server that sends a state and a boolean
       *  that disagree is still caught, which is the only thing the check
       *  ever actually detected. What changes is that a server which has
       *  moved on is no longer treated as broken.
       *
       *  `state` is the field of record. `satisfied` is derived from it
       *  below either way, so a caller sees the same value whether the
       *  API sent one or not.  */
      if (present(proof, "satisfied")) {
        //  Strict identity. null must be an explicit null; false may never
        //  stand in for null.
        var expected = EXPECTED_BOOLEAN[proof.state];
        if (proof.satisfied !== expected) {
          return unavailable("state_boolean_mismatch", true,
                             "state=" + proof.state
                             + " expected satisfied=" + JSON.stringify(expected)
                             + " got " + JSON.stringify(proof.satisfied));
        }
      }
      if (!isCount(proof.not_preserved_count)) {
        return unavailable("not_preserved_count_invalid", true,
                           "not_preserved_count=" + JSON.stringify(proof.not_preserved_count));
      }
      //  The legacy evidence block is REQUIRED on the new contract. Silently
      //  reporting "no historical column evidence" when the API omitted the
      //  block is the same class of invention as defaulting the count to 0.
      var le = proof.legacy_evidence;
      if (le == null || typeof le !== "object"
          || !isBool(le.column_photo_present) || !isBool(le.column_note_present)) {
        return unavailable("legacy_evidence_invalid", true,
                           "legacy_evidence=" + JSON.stringify(le));
      }
      return build(proof.state, required, proof.not_preserved_count,
                   { photo: le.column_photo_present, note: le.column_note_present });
    }

    // ── OLD CONTRACT ────────────────────────────────────────────────
    //  Boolean only. Two states are reachable and no others; the old API had
    //  no way to express legacy or defect, and no legacy_evidence block.
    if (!present(proof, "satisfied") || !isBool(proof.satisfied)) {
      return unavailable("legacy_satisfied_invalid", true,
                         "satisfied=" + JSON.stringify(proof.satisfied));
    }
    if (!isCount(proof.not_preserved_count)) {
      return unavailable("not_preserved_count_invalid", true,
                         "not_preserved_count=" + JSON.stringify(proof.not_preserved_count));
    }
    return build(proof.satisfied ? "satisfied" : "not_satisfied",
                 required, proof.not_preserved_count, { photo: false, note: false });
  }

  function build(state, required, notPreserved, legacyEvidence) {
    return {
      status:            "ok",
      renders:           state,
      state:             state,
      satisfied:         EXPECTED_BOOLEAN[state],
      //  A writer defect is an ENGINEERING fault, not an operating
      //  condition. Surfaces use this to render it visually distinct; they
      //  must not infer it by string-matching the state.
      isDefect:          state === "missing_evaluation_defect",
      required:          required,
      notPreservedCount: notPreserved,
      legacyEvidence:    legacyEvidence,
      label:             LABEL[state],
      reasonCode:        null
    };
  }

  return {
    normalize:  normalize,
    STATES:     STATES.slice(),
    LABEL:      LABEL,
    _mapping:   EXPECTED_BOOLEAN
  };
});
