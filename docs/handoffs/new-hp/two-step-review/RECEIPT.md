# Two-step Application Review corrections — September 13, 2026

App parent: `9ce6fc0feb8ce268493d79faf7bfa0e0c385ce2c`.
Isolated branch: `codex/two-step-ui-20260913`.

## First failures

The actual move-in loader returns `{data, meta}`, while `psMoveInLoad` stored
that envelope as the state. A known canonical `forward_lease` consequently
rendered "state cannot be displayed". The new shared-runtime Chromium test,
pointed at unchanged `9ce6fc0` source, fails its first completed assertion
(0 passed / 1 failed, process exit 1). The same defect exists at `e23a36a`.

An independent execution of the actual progress renderer with an acknowledged
offer, human `operator` confirmation and separately signed legacy packet showed
`e23a36a` retaining the confirmation and separate signature. `9ce6fc0` hid the
confirmation and relabeled the signature as Execute. Acknowledgment alone
does not establish which staff decisions occurred.

## Correction

The move-in read uses the existing `psArPayload` adapter. A scoped cache,
request generation and displayed lease identity prevent a late response from
populating another lease, property, actor or signed-out session. Unknown
server states and refused/unavailable reads remain distinct.

The progress display preserves a human confirmation's history. System-derived
preparation shows the acknowledged offer, without inventing a separate human
confirmation or early approval. A completed Execute label requires the
canonical current-packet `execution_decision` audit projection. An
`application_already_approved` consequence retains the earlier approval and
labels only the new company signature as Execute. Missing or foreign-packet
receipts cannot rewrite history.
If a historical packet is separately signed while application approval remains
unproven, the signature stays visible but approval is not marked complete.

Required API read contract, supplied by the separate attribution lane:
`execution_decision` is null or the actual current-packet `executed_by_decision`
audit `{packet_id,event_id,actor_user_id,at,application_decision,decisions}`.
`proposed_terms_confirmation.source` establishes preparation provenance;
it does not prove an Execute act.

## Verification

- `two_step_review.test.js`: actual source functions and app CSS in Chromium,
  using the shared `tests/browser_runtime` and `tests/assert_reporter` helpers;
  explicit transport adapters and no provider network. **38 passed / 0 failed**.
- Cases include canonical envelope, known and unknown states, access versus
  availability errors, overlapping requests, changed displayed lease, property,
  actor and signout, legacy confirmation, derived preparation, actual Execute,
  earlier approval, missing approval despite a signature, and missing/foreign
  execution receipts, plus the amount cases detailed below.
- Final sanctioned `run_harnesses.sh`: **68 harnesses / 2,291 passed / 0 failed /
  0 red**, process exit 0. No runner changes. `git diff --check` passed.
- Windows runner: bundled Git `usr/bin/sh.exe` (GNU Bash 5.2), bundled Node;
  `E2E_API_ROOT` and `NODE_PATH` pointed to the existing integration API tooling.

## Separate browser proof candidate

API tests-only commit `6554b3b` on `codex/two-step-browser-20260913`, parent
`de9c3a5`, extends `tests/e2e/two_step_execute.browser.js`. Default handoff
continues to mean Execute-only. The opt-in pre-Author handoff drives native
staff Author, application preparation and synthetic email attestation,
packet preparation/issue, Mike refusal, and KZ Execute. Public applicant and
signer steps use owned HTTP. Staff dialogs/writes are actor-specific; the
distinct move-in panel and actual completed Execute receipt are asserted.

That expanded browser candidate is syntax-checked. Root's first runtime attempt
stopped before any Author POST: J4 had a generic tour follow-up, because the
original HTTP tour completion recorded `standing: ready_to_apply` without
`next_move: send_application`. The visible app correctly offered Complete,
not application preparation. Failure text/screenshot are retained under the
workspace `tmp/two-step-qb-browser`; root owns correction at the original
governed tour-outcome setup and a fresh run. No browser bypass was added.

Acceptance remained open at that first stop; the subsequent run is recorded
below. Root QB owns the database/server and combined run. No database was
started or altered by this lane, and no production, provider, customer message
or deployment occurred.

## Follow-on: unconfirmed move-in charges

Root's fresh native staff journey subsequently passed **50/50** through KZ's
Author/application preparation, Mike's link recovery/send attestation and
packet preparation/issue, then KZ's Execute, ending on the exact pending-bed
lease. That run predates the final
amount-display correction below. Its retained post-execution screenshot exposed
Required/Applied/Outstanding all displayed as `$0.00` while charges were not
confirmed.

The canonical `readMoveInFunds` returns zero sums for an empty scheduled-charge
list, but also explicitly returns `state: charge_set_missing`, `charge_set:
null`, and `cleared: false`. Those sums do not establish the required move-in
amount. The panel now displays Required/Outstanding as **Not confirmed** for
that explicit state, preserving independently recorded Applied `$0.00`.
Confirmed numeric/string zero remains `$0.00`; null/blank amounts render as
unknown, and do not manufacture an arithmetic mismatch. No balance is derived
by the browser and no API/move-in workflow was changed.

First red: the actual-envelope Chromium test with the real funds renderer
returned three zeroes (4 passed / 1 failed, exit 1). Corrected focused proof:
**38 passed / 0 failed**, including unconfirmed aggregates, confirmed zero,
unknown totals with known applied payment, and blank amounts.
The final sanctioned 68-harness run passed 2,291 assertions with 0 failures,
0 red harnesses and exit 0 after this last display correction. Actual owned
HTTP/browser acceptance of the broader staff journey remains the preceding
50-check root run; this last display change has actual-envelope component
browser and full app-harness evidence.
