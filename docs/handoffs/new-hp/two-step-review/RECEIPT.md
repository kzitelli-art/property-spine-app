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

Required API read contract, supplied by the separate attribution lane:
`execution_decision` is null or the actual current-packet `executed_by_decision`
audit `{packet_id,event_id,actor_user_id,at,application_decision,decisions}`.
`proposed_terms_confirmation.source` establishes preparation provenance;
it does not prove an Execute act.

## Verification

- `two_step_review.test.js`: actual source functions and app CSS in Chromium,
  using the shared `tests/browser_runtime` and `tests/assert_reporter` helpers;
  explicit transport adapters and no provider network. **31 passed / 0 failed**.
- Cases include canonical envelope, known and unknown states, access versus
  availability errors, overlapping requests, changed displayed lease, property,
  actor and signout, legacy confirmation, derived preparation, actual Execute,
  earlier approval and missing/foreign execution receipts.
- Sanctioned `run_harnesses.sh`: **68 harnesses / 2,284 passed / 0 failed /
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

That expanded browser candidate is **syntax-checked, not runtime-proven by this
lane**. Root QB owns the fresh database/server, pre-Author fixture handoff and
combined run. No database was started or altered here, and no production,
provider, customer message or deployment action occurred.
