# Management inventory correction — September 13

The signed-in Management landing page counted an imported source-row summary while its Rent Roll door opened the canonical dated inventory. At Skyline the landing showed251 positions,128 occupied,123 vacant and a $48 average; its full Rent Roll showed160 positions across72 units. This is an app projection correction, not an inventory adjustment.

## Resulting behavior

Management reads the existing sealed `rentRollUnits` resource with an explicit date. Total inventory, occupied, pending activation, open, needs review and not established all come from that response. The opening-source date stays separate from the date being viewed. It does not calculate an occupancy percentage, infer vacancy by subtraction, or average imported rent fields. Current and future Rent Roll doors keep their canonical readers.

Signed-in Management no longer calls the offline dashboard/Leasing/inbox path. Its legacy Management financial endpoint requires an operator key and cannot serve a staff session; this repair does not add that credential or widen authority. The landing and Delinquency leaf show balances as unavailable while retaining live collection work. Empty work is not a zero-balance assertion. A Management-only actor without the existing Leasing entitlement sees a specific access-required state for the rent roll.

Management work reads remain local until the caller rechecks user/property, selected property, desk, subpage and request sequence. Late responses cannot refill the Management obligation cache or repaint another context. Read failures, incomplete totals and zero inventory remain distinct; no fixture substitutes for a signed-in read.

## Evidence

- Read-only production diagnosis and actual signed-in before-screen inspection by QB:72 current units/160 spaces; full Rent Roll160/31 occupied/9 pending/100 open/20 review on September13. Raw137 active lease statuses do not establish dated occupancy or physical possession.
- `management_inventory_live.test.js`:17 named emitted-output scenarios using the actual extracted functions and explicit VM adapters. Covers canonical vs old251-row inputs, buckets, zero/missing/error/access states, null session metadata, context races/cache preservation and Delinquency exclusion of stale values.
- `management_inventory_live.browser.js`:13 actual Chromium assertions against the unchanged full static app with explicit synthetic HTTP responses. Actual Management click → Rent Roll, Delinquency, desktop/mobile and unavailable/Retry paths; no legacy dashboard request. No real account or provider action is simulated as production acceptance.
- Product `index.html` SHA-256 at these focused checks: `457ad3c01beeb9ea73e8f1ebc2c0e792f14577b8c183d154af7b2e7e17ed15da`.
- Final sanctioned `run_harnesses.sh` completed at14:41UTC with **68 harnesses/2270 passed/0 failed/0 red**. The separately run full-app browser proof passed13/0. The first attempt was stopped for a missing local dependency path; the accepted run used the existing pinned API dependency runtime through `E2E_API_ROOT`. Actual release verification is recorded separately by QB.

Run the full suite with `./run_harnesses.sh` and the normal local `E2E_API_ROOT` dependency runtime. Run the separate browser proof with `node management_inventory_live.browser.js`. Browser transport is blocked except for the owned static server and explicit stubs. Classification: permanent existing-owner projection, Class1; proof fixtures, Class3.

## Release limits

App-only successor of live `e23a36a4588cdeda10eb3d902cea4b917f68dbe9`, paired with unchanged API `dab19b6a84493093911427dfe2de29ee91451ac9`. No migration, lease, price, possession, consent, property configuration or inventory write. Recovery is the previously built app deployment `dep-dainbnrm8hqs73dimq8g`. The underlying source conflicts and rent completeness still require review; making both screens read the same owner does not resolve those facts.
