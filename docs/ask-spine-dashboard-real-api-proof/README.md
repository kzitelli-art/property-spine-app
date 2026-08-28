# Ask Spine dashboard → exact API → Postgres proof

Proof date: 2026-08-27 (America/New_York)

This is a Class 3 proof adapter for the dashboard candidate. It does not add a second Ask Spine implementation and does not change dashboard product behavior.

## Pinned custody

- Dashboard base: `1fd21494e556cece13f0fd1a8be47464f71ff614`
- Frozen dashboard `index.html` blob: `898f1bfe625adf9cb4358f8e64b0414f8553cfdb`
- API checkout: `acb7db95c4c6fdab5a23ace8a0ae80dc34c24eeb`
- Observed API `/health` commit: `acb7db9`, resolved from `local_git_checkout`
- Final run identity: `20260827174923-3a84e07a21`
- Unique database: `spine_dashboard_20260827174923_3a84e07a21`, migration ceiling `192`
- API/app/Postgres ports: dynamically allocated per run

The proof accepts only a local Postgres maintenance URL. It generates its own cryptographically unique `spine_dashboard_<run>` name, refuses if that name already exists, stamps both a database comment and an in-database run marker, and drops only a database carrying that exact marker. It verifies the API checkout and clean tracked state, verifies `/health`, and verifies the dashboard base is an ancestor of the current branch. The frozen `index.html` blob must match before a normal run.

## What the adapter does

`ask_spine_dashboard_real_api.proof.ps1` creates a unique local Postgres cluster and invokes `ask_spine_dashboard_real_api.browser.js`. Together they:

1. Create a dedicated Postgres cluster under the operating-system temp directory.
2. Generate and exclusively own a new database, apply the real migration chain to ceiling 192, and load the API's E2E fixtures.
3. Require the fresh Skyline property to begin with zero applications and zero obligations.
4. Start the exact API checkout with the fake SMS preload and provider credentials removed.
5. Use the API's canonical staff-session issuer against the owned database.
6. Drive the existing leasing lifecycle to one resident-signed/company-outstanding packet through real API routes.
7. Serve the frozen dashboard source, replacing its hard-coded production API-origin literals in memory with the local API origin. It does not intercept or fulfill the Ask Spine route.
8. Confirm the session through real `GET /operator/me`.
9. Send `POST /operator/ask-spine/ask` from Chromium and assert the body is exactly `{ question }`, `x-staff-session` is present, and `x-operator-key`, property, and module claims are absent.
10. Require the signer response to equal the exact one-name canonical set and counts, not merely contain the new name.
11. Hash the actual HTTP response bytes and assert that the DOM answer, outcome, grounding, reference label, reference kind, and reference target equal server fields.
12. Prove an authenticated leasing-unentitled session receives visible `not_authorized` with `grounded_on: null` and no references.
13. Rename `lease_applications` in the owned database, observe visible canonical `unavailable` / `READ_FAILED`, and prove the previous successful answer remains in the transcript. The table is restored in `finally`.
14. Ask again after reader recovery and observe the exact prior answer and grounding.
15. Confirm `staff_agent_messages` is unchanged, then stop Chromium/app/API, close pools, drop the marked database, stop the cluster, and remove its directory.

The browser never receives an operator key. The proof driver uses the local E2E operator key only for fixture setup through already-supported API endpoints.

## Restored-green evidence

The final run exited 0 with:

- fresh database counts `applications=0`, `obligations=0` before the run;
- exactly one created application and exactly one outstanding signer;
- the generated database did not exist before the run and was dropped afterward;
- the API, app server, Chromium, connections and Postgres cluster were stopped;
- the cluster directory was removed with `os_policy_residue: null`;
- exact six-field response envelope;
- signer response byte SHA-256 `857db4d6888e34be4bd22549f4d11991a75eb2129584bf62a9b0ee07126f1a6b`;
- personal-reference response byte SHA-256 `a61d1c504300b57eb883dafca4eabd0c4db20b61b8344a376d1d223c1bc6ed6f`;
- READ_FAILED response byte SHA-256 `318cd1b9cd99f417dd5d108e858136b3fcbe750f18ab71a47bf01e24716bd244`;
- `staff_agent_messages` count `0 → 0`;
- frozen `index.html` expected/actual blob equality.

The complete raw response bodies and assertions are in `last-run.json`.

Rendered evidence:

- `desktop-real-api.png`
- `failure-retains-prior-answer.png`
- `unentitled-real-api.png`
- `phone-real-api.png`

## False-green challenges

- Interception/seeded response: the proof installs no route fulfillment for `/operator/ask-spine/ask`; it records response bytes and the real server socket.
- Stale server: API Git must equal the full pinned SHA and `/health` must report `acb7db9`.
- Wrong/stale database: no database is supplied to the browser harness. It creates a unique name, refuses collisions, verifies a two-part ownership marker, begins at `0/0`, and requires `/operator/me` to accept a session minted only in that database.
- Fixture-derived answer: the exact response must be the deterministic one-application/one-signer sentence and grounding for the current run's unique person.
- Subject-resolver contamination: an early fixture name containing the word “Signer” correctly produced an ambiguous canonical read. The fixture was corrected and the disposable database rebuilt; no assertion was weakened.

## Deliberate falsification

After a green run, the dashboard route was changed temporarily from `/operator/ask-spine/ask` to `/operator/ask-spine/ask-falsified`. With only the immutable-index precheck relaxed for this negative control, the same browser oracle exited `1` at `page.waitForResponse`; it could not obtain the required real Ask response.

The exact line was restored. The restored file hashed to blob `898f1bfe625adf9cb4358f8e64b0414f8553cfdb`, and the full immutable-byte run returned green.

The red control was not repeated for this hardening follow-up. The product bytes, in-memory origin substitution, request path, real response wait and byte-to-DOM oracle are unchanged. Only database/API/cluster ownership was moved around that same boundary, so the prior route falsification still exercises the exact browser boundary used here.

## Existing regressions

- `ask_spine_dashboard_convergence.test.js`: `38 passed, 0 failed`
- `ask_spine_dashboard_convergence.browser.js`: `102 passed, 0 failed`

The existing 102/102 suite remains the broad presentation matrix. This proof adds the previously missing real staff-session → real HTTP route → canonical readers → real Postgres journey and byte-to-DOM oracle.

## NOT RUN

- Governed conversational action confirmation/receipt: this exact Ask route exposes no action envelope.
- Post-action ask-again mutation: no supported Ask Spine writer was invented. Ask-again after reader recovery was measured instead.
- Production Anthropic wording. Local/fake composer wording is not a production-model claim.
- Render, Neon, Twilio, carrier, deployment, production data, PR, merge, and main.

## Invocation contract

Provide an isolated exact API checkout with its locked dependencies, a local Postgres 17 binary directory, Node, and the bundled Playwright module path. The wrapper owns all runtime services and data:

```powershell
.\ask_spine_dashboard_real_api.proof.ps1 `
  -ApiRoot '<isolated exact API checkout>' `
  -PostgresBin 'C:\Program Files\PostgreSQL\17\bin' `
  -Node '<node executable>' `
  -NodeModules '<bundled playwright node_modules>'
```

The wrapper never edits API source. It dynamically allocates ports, creates the cluster, and lets the Node harness create/drop only its uniquely marked database. Any teardown failure turns the proof red and is recorded as residue.
