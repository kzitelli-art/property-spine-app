# Incident — publicly accessible resident and property data on the static app

**Status: CONTAINED — PUBLIC APP SUSPENDED; SOURCE AND HISTORY REMEDIATION PENDING**
(suspension performed by the owner in the Render dashboard; see §2 for the
verification this thread could not perform)

Date opened: 2026-08-03. This record contains **no record values** — no names,
unit numbers, phone numbers, identifiers or amounts. Categories and counts only.

---

## 1. What happened

The operator app is a Render **static site whose publish directory is the
repository root**. Every file at the root is therefore directly addressable by
URL. Static assets are served *before* any application authorization: the
operator API session protects API calls, not files, so no session check, script
removal or page guard could have prevented retrieval.

The owner independently confirmed unauthenticated public retrieval of at least
`solo-rent-roll-data.js`, `solo_4233_seed.json` and `emergency_calls.json`.

**Discovery path:** the Slice 10A Forward Rent Roll audit inspected
`solo-rent-roll-data.js` as a candidate rent-roll authority and found it
carrying a self-warning about resident data. Reachability was then established
from source: `index.html` loads sibling root-level files by relative URL
(`property-spine-data.js`, `logos.js`, `policy.js`, …) and those files exist at
the repository root — so the publish root is the repository root.

## 2. Public-origin verification — NOT PERFORMED BY THIS THREAD

The build environment's network policy denies the production origin (`403` to
`CONNECT`). Every unauthenticated check was performed by the owner. This thread
has **never** fetched a production URL.

Required owner verification after the suspension and after each deploy, from a
private window with no cookies — for `/`, `property-spine-data.js`, `policy.js`,
`solo-rent-roll-data.js`, `solo_4233_seed.json`, `emergency_calls.json`:

- status is a real `404` (or deliberate `410`) — **a `200` carrying `index.html` is not containment**
- `content-type` is not `application/javascript` or `application/json`
- a cache-busted request (`?cb=<timestamp>`) returns the same
- an uppercase-filename variant returns the same

## 3. Exposed files

### 3a. Removed — unreferenced, no consumer, no build dependency

| file | size | categories | disposition |
|---|---|---|---|
| `solo-rent-roll-data.js` | 861 KB | resident names and source identifiers, unit numbers, lease dates, move-in/out, actual/net/market rent | removed in `48f5383` |
| `solo_4233_seed.json` | 544 KB | rents, balances, future residents | removed in `357fb15` |
| `temple_nest_seed.json` | 309 KB | rents, balances, entity/resident names | removed in `357fb15` |
| `skyline_1417_seed.json` | 243 KB | rents, balances, resident counts | removed in `357fb15` |
| `greenery_seed.json` | 87 KB | rents, balances | removed in `357fb15` |
| `berks_1850_seed.json` | 85 KB | rents, balances | removed in `357fb15` |
| `emergency_calls.json` | 50 KB | caller names, caller phone numbers | removed in `357fb15` |
| `1439_seed.json` | 43 KB | rents, balances | removed in `357fb15` |
| `1438_seed.json` | 39 KB | rents, balances | removed in `357fb15` |

Approximately **2.2 MB** across what appear to be **seven distinct properties**.
`solo-rent-roll-data.js` alone holds ~659 unit records, ~378 carrying resident
detail. Two seed files assert `"names_masked": false` — the data declares
itself unmasked.

### 3b. Loaded by the app — NOT removed, the primary unresolved exposure

| file | size | consumer | classification |
|---|---|---|---|
| `property-spine-data.js` | 427 KB | `index.html` | **REAL** |
| `policy.js` | 424 KB | `index.html` | **REAL — divergent near-duplicate of the above** |

`property-spine-data.js` states its own provenance in its header: *"It holds the
real work-order history for every property, pulled from the building systems,"*
with `kind:'emergency'` being *"after-hours emergency-line phone calls.
Live/open."* It is keyed on the **production property UUID** for the live
property (121 occurrences), the same identifier used by
`solo-rent-roll-data.js`. **203 work-order records: 159 directory, 44
emergency-line calls.**

`policy.js` is not byte-identical but defines the **same globals**, carries the
**same 203 record count**, and matches on sensitive-field counts. Two divergent
copies of one production data library, both publicly served, both loaded.

**Both files define the same eighteen globals**, so the exposure is far wider
than work orders:

| global | index.html reads | category |
|---|---|---|
| `__PC_RESIDENT_RECORDS` | 1 | person-card resident records |
| `__RENT_ROLL_LIBRARY` | 9 | rent roll |
| `__CONVERSATIONS_LIB` | 1 | conversation/message history |
| `__RENEWALS_LIBRARY`, `__RENEWAL_THREADS` | 3 | renewals |
| `__APPS_LIBRARY` | 2 | applications |
| `__TOURS_LIBRARY`, `__TOUR_THREADS` | 2 | tours |
| `__WO_LIBRARY`, `__REAL_WO_LIBRARY`, `__WO_FLOW_LIBRARY` | — | work orders, emergency calls |
| `__VENDOR_LIBRARY`, `__SUPPLY_LIBRARY`, `__COMPLIANCE_LIBRARY`, `__LEAD_ANALYTICS`, `__CAPITAL_DEMO`, `__RENT_TREND`, `__FOLLOWUPS_LIBRARY`, `__LEASING_OB_LIB` | — | operational, financial, analytics |

### 3c. Also publicly served — information disclosure, not PII

Roughly twenty `*.test.js`, `*.browser.js` and harness files sit at the publish
root and were retrievable. They contain no resident data but disclose internal
structure, route names and proof logic. Disposition: excluded by the §6
allowlisted artifact rather than deleted.

## 4. Authenticity

**REAL.** Not synthetic, not controlled QA. Established from provenance rather
than from record inspection:

- `property-spine-data.js` self-declares real building-system origin
- both loaded rails key on the live production property UUID
- `solo-rent-roll-data.js` names a real source workbook and reconciliation date
  in its own header, and warns against publishing itself
- two seed files carry `"names_masked": false`

No resident was contacted and no individual row was inspected to establish this.

## 5. Containment actions

| # | action | SHA | deployed |
|---|---|---|---|
| 1 | remove `solo-rent-roll-data.js` | PR #31 → `48f5383` | **pending** |
| 2 | remove eight unreferenced datasets | PR #32 → `357fb15` | **pending** |
| 3 | suspend the static service | Render dashboard | owner-performed |

Both merges are **behavior-neutral**: app harness suite 18 harnesses / 779
passed / 0 failed after each. Neither is deployed — the static site does not
auto-deploy — which is why suspension, not deployment, is the containment act.

**Do not reactivate the service** by deploying `48f5383` and `357fb15`. Those
remove the unreferenced files only; the two loaded rails in §3b remain in the
artifact. Reactivation requires the §7 gate.

## 6. Publish-boundary hardening (plan, not implemented)

The repository root must stop being the effective public allowlist. A denylist
that grows each time someone adds a data file is not a boundary.

```
repository source
  → explicit build step
    → clean public/ directory
      → copy only reviewed static assets (index.html, door scripts, logos)
        → Render publish directory = public/
```

Plus a CI check that **fails the build** when the artifact contains: filenames
matching seed/export/dump/backup/data patterns; JSON or JS data blobs above a
size threshold; or files carrying resident/tenant/phone/email/balance/rent/
lease/caller field names. Not implemented — it belongs after the live exposure
is closed.

## 7. Sanitized-app path — the reactivation gate

Screens must be separated by what they can honestly read:

| class | disposition |
|---|---|
| already backed by authenticated live APIs (Ask Spine, My Work, Market & Pricing evidence, obligations) | unaffected — these already read server-scoped APIs |
| rewireable to an existing authenticated API (rent roll, renewals, applications, tours) | point at the existing operator routes; canonical reads exist per the Slice 10A audit |
| requires a new governed API read (work orders, emergency calls, vendor/supply/compliance) | must remain **unavailable** until a governed read exists |
| preview/demo-only (`__CAPITAL_DEMO`, analytics libraries) | move outside the operator runtime entirely |

Reactivation requires **all** of:

- no production-derived resident or financial dataset in the public artifact
- no directly retrievable sensitive static file, verified in a private window
- authenticated, server-scoped reads for operating data
- honest unavailable state on failure — no fixture fallback
- explicit allowlisted publish directory

A login screen is not an access-control boundary while static files remain
directly downloadable.

## 8. Repository and history scope — OPEN

Deleting from `main` does not remove the objects from git history.

| question | status |
|---|---|
| repository currently public or private | **UNKNOWN — owner must confirm in GitHub settings** |
| ever public after the introducing commit | **UNKNOWN — owner must confirm** |
| first introducing commit | `74f52b0` (2026-07-26) for `solo-rent-roll-data.js` and `property-spine-data.js` |
| branches/tags containing the objects | to be mapped across all refs before any rewrite |
| open PR refs containing them | at least the two containment branches, by construction |
| forks | **UNKNOWN — owner must confirm** |
| release artifacts | none known |

**No history rewrite has been performed or should be, yet.** It must happen
once, covering every object together, after: the service is suspended, the
complete file set is known, visibility history is established, and affected refs
are mapped. A rewrite invalidates branch bases, open PRs and every clone, so it
needs a prepared command set, a backup, collaborator instructions and
post-rewrite verification. If the repository was ever public, GitHub cache
removal must be requested after the rewrite.

## 9. Exposure window

| fact | value |
|---|---|
| introducing commit | `74f52b0`, 2026-07-26 |
| first possible exposure | the first static deploy containing that commit |
| last exposed | until the owner's suspension on 2026-08-03 |
| approximate window | **~8 days**, subject to deploy-history confirmation |

Render deploy history for `property-spine-app` will confirm the first deploy
containing `74f52b0`.

## 10. Access logs

**UNKNOWN.** Whether Render retains static-asset or CDN request logs for the
window must be asked. If available, capture request count, timestamps, distinct
source IP count, user-agent count, referrer presence and cache-hit information
only.

**Absence of logs does not prove the assets were never downloaded**, and must
not be recorded as if it did.

## 11. Credentials

Structural scan of the exposed files for secret categories — API keys, access
or session tokens, passwords, database connection strings, Twilio/Render/Neon
credentials, signed URLs, private keys: **none found**. No rotation is indicated
on current evidence.

Resident identifiers are sensitive personal data but are not authentication
credentials; unrelated infrastructure should not be rotated merely because they
appear.

## 12. Classification and notification

Technically: **unauthorized public exposure of resident and property
information.** This record deliberately does **not** characterize it as a
statutory data breach — that determination belongs to counsel or the applicable
incident process, not to this thread. No resident notification has been sent or
drafted.

Summary for that determination: real resident-level lease, financial,
work-order and emergency-call records for approximately seven properties were
retrievable without authentication from a public origin for roughly eight days;
categories are listed in §3; the affected-individual count is bounded by ~378
resident-detail records in the largest file plus resident and caller records in
the loaded rails; retrieval evidence is unknown pending §10.

## 13. Remaining unknowns

```
public-origin verification after suspension and after each deploy   (owner)
repository visibility history and fork status                       (owner)
Render publish directory, root directory, build command             (owner)
Render deploy history — first deploy containing 74f52b0             (owner)
static access-log availability                                      (owner)
branches and tags containing each object                            (mappable here, after visibility is known)
```
