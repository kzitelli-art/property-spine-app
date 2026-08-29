# Ask Spine dashboard → conversational action API → Postgres proof

Proof date: 2026-08-28 (America/New_York)

This is a Class 3 proof adapter for the converged dashboard. The product remains a client of the server-owned conversational and action contract; this harness adds no second intent engine, action writer, property authority, or receipt composer.

## Pinned custody

- Required app start: `3dec099f0565013e176769a5052014e0af41bc3a`
- Product baseline: `0fc1028f8fc0e363d78135ff2118a6ed3b963d84`
- Deliberate product red: `52ae2a198e2449534cf0bc6493ecdf0aed18f61b`
- Exact product restore: `0288a6883ac9e1359f9aaaf6b20dea8eec1b623f`
- Restored `index.html` blob: `2b26136e09dce1ccd90b4d252a930a19bb38e4cd`, identical to the product baseline blob
- Required app lineage ancestors: `83e2b6763d85935d0113183216e321720c9e8f1b`, `0cf7399e1bf883695de8e2767725d34c155d8312`, `58f5a25a4c5ab28445694d9d8317ca2a6b2e86f2`
- Exact isolated API checkout: `d2a8841c9653a2d0c271706d8f64aa3c28b3b09c`
- Observed API `/health` commit: `d2a8841`, resolved from `local_git_checkout`
- Final run: `20260828201538-d88f1e661f`
- Unique database: `spine_dashboard_20260828201538_d88f1e661f`, migration ceiling `192`
- API, app, and Postgres ports: allocated dynamically per run

The wrapper creates a new local Postgres cluster under the operating-system temp directory. The Node harness generates a cryptographically unique database name, refuses a pre-existing database, records an ownership marker both as the database comment and inside the database, begins at zero applications and zero obligations, and drops only the exact database carrying that marker. The final wrapper stopped and removed the cluster with no OS-policy residue.

## Product contract under proof

- Every typed composer message calls only `POST /operator/ask-spine/message` with exact `{ message }` and the signed-in `x-staff-session`.
- The browser supplies no operator key, property, module, person, conversion, unit, space, action code, or other authority claim.
- `kind=answer` and `kind=clarification_or_refusal` render the server text, outcome, grounding, and references without reclassification.
- Only `kind=application_send_proposal` renders a confirmation control. Subject, target, expiry, and receipt are server fields; the opaque confirmation token remains in memory and is never printed.
- Confirmation calls only `POST /operator/ask-spine/application-send/confirm` with exact `{ confirmation }`.
- The dashboard does not call `/operator/ask-spine/ask` or `/operator/ask-spine/application-send/propose`.
- Confirmed, replayed, refused, expired, wrong-session, and transport-failure states remain distinguishable from their server outcome/receipt or the actual transport error.
- Ask-again is ordinary prose through the same `/message` door.

## Final restored-green journey

The final real Chromium run exited `0` and proved:

1. A real staff session and server-derived property/module context answered “Which signer is still outstanding?” from canonical Postgres state. The exact outstanding set contained only the current run's unique resident signer.
2. The displayed answer, outcome, grounding, reference label, open kind/target, and confirmation receipts equal the actual API response fields. Raw HTTP response bytes and SHA-256 digests are retained in `last-run.json`.
3. Renaming `lease_applications` inside the owned database produced a visible canonical `unavailable` / `READ_FAILED` turn while the prior successful answer remained visible. Restoring the table and asking again recovered the exact signer answer.
4. Vague prose produced no canonical action writes.
5. A post-tour outcome sent through `/message` created the canonical conversion and follow-up; a second application sentence through that same door produced `application_send_proposal` with zero intents, invitations, evidence events, child obligations, applications, or provider messages before confirmation.
6. The unentitled session and a session scoped to another property could not use the proposal token, and canonical state remained unchanged.
7. One UI confirmation created exactly one application intent, one invitation, one evidence event, two child obligations, and one fake-provider application text. No lease application was fabricated.
8. Replaying the same token returned `confirmation_used`, created no second transition or provider call, and displayed the server receipt.
9. Reusing the token after its bounded proof expiry returned `confirmation_expired` and changed nothing.
10. Asking again through `/message` returned canonical `application_link_sent: true` and the browser displayed the server's sent-state answer.
11. An authenticated leasing-unentitled message rendered `not_authorized`, `grounded_on: null`, and empty references. The same answer remained usable in a 390×844 phone viewport.
12. Across the browser journey, 11 prose calls used `/message`, three confirmation calls used the fixed confirm route, zero calls used `/ask` or `/propose`, every request used `x-staff-session`, and none used an operator key or browser authority field.
13. `staff_agent_messages` stayed `0 → 0`; no dashboard transcript-retention claim is made.
14. Chromium, app server, API process, database connections, owned database, Postgres server, and cluster directory were all closed or removed.

The API's Anthropic dependency was local/fake for deterministic wording. The requests still crossed the exact HTTP routes, authentication middleware, canonical readers, canonical post-tour writer, canonical application-send command, and real PostgreSQL.

## Deliberate falsification

With the proof infrastructure and API unchanged, commit `52ae2a1` changed only the product adapter from `/operator/ask-spine/message` to `/operator/ask-spine/message-falsified`. The real browser proof exited `1` at `submitMessage` because `page.waitForResponse` could not observe the canonical message route. Its fresh disposable cluster still stopped and was removed (`DISPOSABLE_CLUSTER_RESIDUE=False`).

Commit `0288a68` reverted that falsification. Its `index.html` Git blob is exactly the product-baseline blob `2b26136e09dce1ccd90b4d252a930a19bb38e4cd`. The final proof then returned green without the falsification override.

## Regression campaign on the restored tree

- Ten source-lineage static gates: `167 passed, 0 failed`
  - `application_target_app.test.js` — 28
  - `lease_configuration_app.test.js` — 12
  - `lease_execution_app.test.js` — 13
  - `operations_line_admin_boundary.test.js` — 1
  - `post_tour_capture_flow.test.js` — 18
  - `team_access_live_boundary.test.js` — 1
  - `tour_times_app.test.js` — 21
  - `ask_spine_dashboard_convergence.test.js` — 50
  - `authoritative_property_context_proof.test.js` — 9
  - `team_invite_live_session.test.js` — 14
- `ask_spine_dashboard_convergence.browser.js`: `122 passed, 0 failed`
- `property_identity_truth_table.browser.js`: `38 passed, 0 failed`
- `property_switch_transaction.browser.js`: `65 passed, 0 failed`
- Combined browser campaign: `225 passed, 0 failed`
- Node syntax checks: 2 green; PowerShell parser: 1 green

## Rendered evidence

- `desktop-real-api.png`
- `failure-retains-prior-answer.png`
- `unentitled-real-api.png`
- `phone-real-api.png`
- `action-proposed-real-api.png`
- `action-confirmed-real-api.png`
- `action-replayed-real-api.png`
- `action-expired-real-api.png`
- `action-ask-again-real-api.png`

## NOT RUN

- Production Anthropic/live-model wording
- Render, Neon, Twilio, live carrier/provider, deployment, production data, PR, merge, or main
- Cloudflare hosting branch `cbbc580c5fe9a0f3d1034090f1d1c0108af5fdd3`

## Invocation

Provide an isolated checkout at the exact API SHA, Postgres 17 binaries, Node, and Playwright modules:

```powershell
.\ask_spine_dashboard_real_api.proof.ps1 `
  -ApiRoot '<isolated exact API checkout>' `
  -ApiSha 'd2a8841c9653a2d0c271706d8f64aa3c28b3b09c' `
  -AppProductSha '<exact restored app SHA>' `
  -PostgresBin 'C:\Program Files\PostgreSQL\17\bin' `
  -Node '<node executable>' `
  -NodeModules '<playwright node_modules>'
```

`-AllowFalsifiedIndex` exists only for the deliberate negative control. Normal evidence runs omit it and enforce the committed product blob.

## Automatic option-branch proof

`.github/workflows/skyline-dashboard-proof.yml` runs two independent jobs on
pushes to `codex/skyline-app-twilio-rc1-rebind-20260829`:

- all 41 `*.test.js` harnesses through the sanctioned `run_harnesses.sh`;
- this same real Chromium oracle against an isolated checkout of exact API
  `d55dae960a52c762187c94e5f48e348fccc0c964` and a fresh temporary PostgreSQL
  cluster migrated through 192.

The CI wrapper supplies only portable process and cluster orchestration. The
browser oracle still owns all product, request, response, database, and cleanup
assertions. CI passes the workflow revision as the app product SHA so a changed
product is exercised rather than rejected before Chromium reaches it.

Before each CI proof, committed manual screenshots and `last-run.json` are
removed from the runner copy. The workflow uploads only files regenerated by
that run as a 14-day Actions artifact; it does not commit generated evidence.
