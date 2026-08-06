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

    var legacyEvidence = {
      photo: !!(proof.legacy_evidence && proof.legacy_evidence.column_photo_present),
      note:  !!(proof.legacy_evidence && proof.legacy_evidence.column_note_present)
    };
    var notPreserved = typeof proof.not_preserved_count === "number"
      ? proof.not_preserved_count : 0;
    //  `required` is absent on neither contract, but default to true rather
    //  than false: assuming proof is NOT required is the unsafe direction.
    var required = has(proof, "required") ? !!proof.required : true;

    // ── NEW CONTRACT ────────────────────────────────────────────────
    if (has(proof, "read_status")) {
      if (proof.read_status === "unavailable") {
        //  THE INVERSE CONTRACT. The API cannot simultaneously say "the read
        //  did not complete" and publish a proof conclusion. If either
        //  conclusion field is present the payload contradicts itself, and a
        //  self-contradicting payload is a bug, not a legitimate unavailable.
        if (has(proof, "state")) {
          return unavailable("unavailable_with_state", true,
                             "read_status=unavailable but state=" + JSON.stringify(proof.state));
        }
        if (has(proof, "satisfied")) {
          return unavailable("unavailable_with_satisfied", true,
                             "read_status=unavailable but satisfied=" + JSON.stringify(proof.satisfied));
        }
        //  EXPECTED. The API told us it could not complete the read.
        var u = unavailable(proof.reason_code || "read_unavailable", false);
        u.legacyEvidence = legacyEvidence;
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
        return unavailable("unknown_state", true,
                           "state=" + JSON.stringify(proof.state));
      }
      //  THE COMPATIBILITY FIELD IS REQUIRED, NOT OPTIONAL.
      //  During the compatibility window read_status=ok promises BOTH a
      //  four-value state AND an explicit satisfied that matches the frozen
      //  mapping. An earlier revision skipped the comparison when satisfied
      //  was absent, which accepted {state:"satisfied"} with no boolean at
      //  all. ABSENCE IS NOT AGREEMENT — a missing field is an unkept
      //  promise, and we cannot verify a mapping against a value nobody sent.
      if (!present(proof, "satisfied")) {
        return unavailable("satisfied_missing", true,
                           "read_status=ok, state=" + proof.state + ", no satisfied value");
      }
      //  Strict identity. null must be an explicit null, never undefined,
      //  and false must never stand in for null.
      var expected = EXPECTED_BOOLEAN[proof.state];
      if (proof.satisfied !== expected) {
        return unavailable("state_boolean_mismatch", true,
                           "state=" + proof.state
                           + " expected satisfied=" + JSON.stringify(expected)
                           + " got " + JSON.stringify(proof.satisfied));
      }
      return build(proof.state, required, notPreserved, legacyEvidence);
    }

    // ── OLD CONTRACT ────────────────────────────────────────────────
    //  Boolean only. Two states are reachable and no others; the old API
    //  had no way to express legacy or defect.
    if (proof.satisfied === true)  return build("satisfied", required, notPreserved, legacyEvidence);
    if (proof.satisfied === false) return build("not_satisfied", required, notPreserved, legacyEvidence);

    //  Neither contract matched. `satisfied: null` from an old-shape
    //  response is not a legal old-shape value.
    return unavailable("indeterminate_legacy_shape", true,
                       "satisfied=" + JSON.stringify(proof.satisfied));
  }

  function build(state, required, notPreserved, legacyEvidence) {
    return {
      status:            "ok",
      renders:           state,
      state:             state,
      satisfied:         EXPECTED_BOOLEAN[state],
      //  A writer defect is an ENGINEERING fault, not an operating
      //  condition. Surfaces use this to render it visually distinct;
      //  they must not infer it by string-matching the state.
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
