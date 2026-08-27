# Ask Spine dashboard → exact API → Postgres proof

Proof date: 2026-08-27 (America/New_York)

This is a Class 3 proof adapter for the dashboard candidate. It does not add a second Ask Spine implementation and does not change dashboard product behavior.

## Pinned custody

- Dashboard base: `1fd21494e556cece13f0fd1a8be47464f71ff614`
- Frozen dashboard `index.html` blob: `898f1bfe625adf9cb4358f8e64b0414f8553cfdb`
- API checkout: `acb7db95c4c6fdab5a23ace8a0ae80dc34c24eeb`
- Observed API `/health` commit: `acb7db9`, resolved from `local_git_checkout`
- Disposable database: `spine_dashboard_acb7_20260827`, migration ceiling `192`
- App origin: `http://127.0.0.1:5317`
- API origin: `http://127.0.0.1:3317`

The proof refuses a non-local database URL, refuses a database name without the `spine_dashboard_` prefix, verifies the API checkout and clean tracked state, verifies `/health`, and verifies the dashboard base is an ancestor of the current branch. The frozen `index.html` blob must match before a normal run.

## What the adapter does

`ask_spine_dashboard_real_api.browser.js` requires an independently started, exact API checkout and disposable Postgres. It then:

1. Uses the API's canonical staff-session issuer against the disposable database.
2. Drives the existing leasing lifecycle to a resident-signed/company-outstanding packet through real API routes.
3. Serves the frozen dashboard source, replacing its four hard-coded production API-origin literals in memory with the local API origin. It does not intercept or fulfill the Ask Spine route.
4. Confirms the session through real `GET /operator/me`.
5. Sends `POST /operator/ask-spine/ask` from Chromium and asserts the body is exactly `{ question }`, `x-staff-session` is present, and `x-operator-key`, property, and module claims are absent.
6. Hashes the actual HTTP response bytes and asserts that the DOM answer, outcome, grounding, reference label, reference kind, and reference target equal server fields.
7. Proves an authenticated leasing-unentitled session receives visible `not_authorized` with `grounded_on: null` and no references.
8. Renames `lease_applications` in the disposable database, observes a visible canonical `unavailable` / `READ_FAILED` response, and proves the previous successful answer remains in the transcript. The table is restored in `finally`.
9. Asks again after reader recovery and observes the exact prior answer and grounding.
10. Confirms `staff_agent_messages` is unchanged; no conversation retention is claimed.

The browser never receives an operator key. The proof driver uses the local E2E operator key only for fixture setup through already-supported API endpoints.

## Restored-green evidence

The final run exited 0 with:

- server socket port `3317` for each Ask response;
- exact six-field response envelope;
- signer response byte SHA-256 `551298403ab1c0e76451021ffcd92359db2ee2edf480a2babbf1a4b4ec91d225`;
- personal-reference response byte SHA-256 `0bcfddb38b05d6272a408df530ee6d3da2eaabd0466d9a9bdcf89e6baa909cbb`;
- READ_FAILED response byte SHA-256 `13a6dba174e53dd9cc3802314a9671cf06dfd1d8b50e0391d235bbd9b511bc5d`;
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
- Wrong database: the direct fixture session must be accepted by the HTTP server and `/operator/me` must return the same server-derived property. Database name and migration ceiling are also asserted.
- Fixture-derived answer: a unique person is created through the real leasing lifecycle and the canonical signer answer must contain that name.
- Subject-resolver contamination: an early fixture name containing the word “Signer” correctly produced an ambiguous canonical read. The fixture was corrected and the disposable database rebuilt; no assertion was weakened.

## Deliberate falsification

After a green run, the dashboard route was changed temporarily from `/operator/ask-spine/ask` to `/operator/ask-spine/ask-falsified`. With only the immutable-index precheck relaxed for this negative control, the same browser oracle exited `1` at `page.waitForResponse`; it could not obtain the required real Ask response.

The exact line was restored. The restored file hashed to blob `898f1bfe625adf9cb4358f8e64b0414f8553cfdb`, and the full immutable-byte run returned green.

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

Start the exact API checkout separately with its official E2E environment and fake SMS preload, pointed at a disposable Postgres built from the real migration chain plus `tests/e2e/property_fixture.sql` and `tests/e2e/fixtures.sql`. Set the API CORS origin to the app origin. Then run:

```powershell
$env:NODE_PATH = '<bundled playwright node_modules>'
$env:PSPINE_REAL_API_ROOT = '<isolated exact API checkout>'
$env:PSPINE_REAL_API_DATABASE_URL = 'postgresql://postgres@127.0.0.1:<port>/spine_dashboard_<suffix>'
$env:PSPINE_REAL_API_BASE = 'http://127.0.0.1:3317'
$env:PSPINE_REAL_APP_PORT = '5317'
$env:PSPINE_REAL_API_OPERATOR_KEY = 'e2e-key'
node .\ask_spine_dashboard_real_api.browser.js
```

The database and API are external parameters so this app-owned proof never edits or bootstraps API source and cannot silently fall back to a canned server.
