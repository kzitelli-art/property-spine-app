# Ask Spine dashboard → exact API → Postgres proof

Proof date: 2026-08-28 (America/New_York)

This is a Class 3 proof adapter for the dashboard candidate. It does not add a second Ask Spine implementation and does not change dashboard product behavior.

## Pinned custody

- Combined dashboard product commit: `f290c332a36c31a95dfac09b9ad8356ba52e62b4`
- Required dashboard ancestors: `83e2b6763d85935d0113183216e321720c9e8f1b`, `0cf7399e1bf883695de8e2767725d34c155d8312`, `58f5a25a4c5ab28445694d9d8317ca2a6b2e86f2`
- Frozen combined `index.html` blob: `c7657198aa65d526703b3600b8f7e4c8825f613e`
- Final API checkout: `bf8c49d3a15bfd3e71f62e969ac009c4d029c38b`
- Observed API `/health` commit: `bf8c49d`, resolved from `local_git_checkout`
- Final run identity: `20260828161040-94164f10ee`
- Unique database: `spine_dashboard_20260828161040_94164f10ee`, migration ceiling `192`
- API/app/Postgres ports: dynamically allocated per run

The proof accepts only a local Postgres maintenance URL. It generates its own cryptographically unique `spine_dashboard_<run>` name, refuses if that name already exists, stamps both a database comment and an in-database run marker, and drops only a database carrying that exact marker. It verifies the API checkout and clean tracked state, verifies `/health`, verifies all three dashboard source heads are ancestors of the current branch, and requires the frozen combined `index.html` blob to match.

This is the final cross-repository release-candidate proof requested for API successor `bf8c49d`. Any later API or product-byte successor requires a fresh run.

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
- signer response byte SHA-256 `a5d508a1ed650580748952d09592b6ce8a48329fcd7bf774ea9331755189059f`;
- personal-reference response byte SHA-256 `cf8a7e662b98b06a187d286f78340f96f0ae2ee14051082dc4309d104b01e613`;
- READ_FAILED response byte SHA-256 `6487d5b1ab9fa7b17d7a98f26e55a5d1a06385164391359043a4934a5e7691ee`;
- `staff_agent_messages` count `0 → 0`;
- frozen `index.html` expected/actual blob equality.

The first successor attempt stopped before browser launch at the API health timeout and still removed its database cluster. The proof harness now retains the last `/health` error in that failure message; a fresh, separately owned run then completed green. This is diagnostic hardening only and changes no product behavior.

The complete raw response bodies and assertions are in `last-run.json`.

Rendered evidence:

- `desktop-real-api.png`
- `failure-retains-prior-answer.png`
- `unentitled-real-api.png`
- `phone-real-api.png`

## False-green challenges

- Interception/seeded response: the proof installs no route fulfillment for `/operator/ask-spine/ask`; it records response bytes and the real server socket.
- Stale server: API Git must equal the full requested SHA and `/health` must report its seven-character prefix (`bf8c49d` in this run).
- Wrong/stale database: no database is supplied to the browser harness. It creates a unique name, refuses collisions, verifies a two-part ownership marker, begins at `0/0`, and requires `/operator/me` to accept a session minted only in that database.
- Fixture-derived answer: the exact response must be the deterministic one-application/one-signer sentence and grounding for the current run's unique person.
- Subject-resolver contamination: an early fixture name containing the word “Signer” correctly produced an ambiguous canonical read. The fixture was corrected and the disposable database rebuilt; no assertion was weakened.

## Deliberate falsification

The original real-API proof changed the dashboard route temporarily from `/operator/ask-spine/ask` to `/operator/ask-spine/ask-falsified`. With only the immutable-index precheck relaxed for that negative control, the same browser oracle exited `1` at `page.waitForResponse`; it could not obtain the required real Ask response.

That route line remains unchanged in the combined product, and the 2026-08-28 immutable-byte final run returned green at blob `c7657198aa65d526703b3600b8f7e4c8825f613e`.

The convergence campaign separately falsified the known invite merge boundary: changing only `propertyId:_invitePropertyId` to picker-derived `propertyId:prop()` kept the canonical invite-client test green but turned the session-scope gate red (`13/14`). Restoring the union returned both gates green and restored exact product SHA-256 `d0ea3f7b7932232e3c423cfb2c57aa5910bffc1160818d6f664437425ac2a991`.

## Existing regressions

- Combined three-lineage app-source static campaign: `155 passed, 0 failed`
- `ask_spine_dashboard_convergence.test.js`: `38 passed, 0 failed`
- `ask_spine_dashboard_convergence.browser.js`: `102 passed, 0 failed`
- `property_identity_truth_table.browser.js`: `38 passed, 0 failed`
- `property_switch_transaction.browser.js`: `65 passed, 0 failed`

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
  -ApiSha '<exact API SHA>' `
  -AppProductSha '<exact combined app product SHA>' `
  -PostgresBin 'C:\Program Files\PostgreSQL\17\bin' `
  -Node '<node executable>' `
  -NodeModules '<bundled playwright node_modules>'
```

The wrapper never edits API source. It dynamically allocates ports, creates the cluster, and lets the Node harness create/drop only its uniquely marked database. Any teardown failure turns the proof red and is recorded as residue.
