# Current Rent Roll correction — release packet

**Status: NOT RELEASE READY. Held on one production fact.**
Prepared overnight, 2026-08-18. Production untouched. Nothing deployed.

---

## 1 · Where this stopped, and why

The production trace did not run. It stopped inside its own Part A, on a
real fact about the environment:

```
✓ deployed working-tree state captured (5 lines)
  deployed HEAD measured   ddd5a092ab83d6265276319171abe58ea92d1b94
✓ deployed build is ddd5a092ab83d6265276319171abe58ea92d1b94
✗ STOPPED — the deployed checkout has no origin remote
```

Render's deployed checkout at `/opt/render/project/src` carries **no git
remote at all**, so the candidate could not be fetched. Nothing was
written; the deployed checkout was not touched.

That is a harness defect, not a tenancy question, and it is fixed — see §5.
What it cost is the one thing this rail needed: **production has not yet
voted on the reader.** Every number below is a fixture number.

Two facts the failed run did establish, and they are real:

| | |
|---|---|
| deployed build | `ddd5a092ab83d6265276319171abe58ea92d1b94` — confirmed by measurement |
| deployed checkout | clean before and after; git metadata untouched |

---

## 2 · The frozen halves

| | |
|---|---|
| **API candidate** | `87a65eb55385f391be29616f9e5d892cd81b9ee5` on `claude/rent-roll-occupancy-correction` |
| **App candidate** | `a8316dc` on `claude/code-philosophy-review-xoiz8f` |
| **Schema ceiling** | 181 — **no migration**. The candidate adds none; `181` is the max migration file in both `ddd5a09` and `87a65eb`. |
| **Dependencies** | `package.json` and `package-lock.json` byte-identical between deployed and candidate |

The API reader is six modules. Their frozen hashes are embedded in both
Render commands and checked on disk before either runs:

```
b27a9dc5…  src/surfaces/rent_roll_unit_view.js
e6ef42be…  src/tenancy/dated_positions.js
342c7e86…  src/tenancy/inventory_retirement.js
a6d27832…  src/tenancy/lease_void_service.js
a046e53b…  src/tenancy/position_classifier.js
47607c1f…  src/tenancy/space_position.js
```

---

## 3 · The app change

The Rent Roll had **two classifiers**. The server decided a bucket per
rentable position; `psRruStatus` then decided again in the browser, from
`current` / `next` / `conflict_state` / `is_down`, ending `return 'open'`.

That fallback is Open by subtraction running a second time on the way to
the glass. Anything the browser could not recognise became Open —
committed and awaiting activation, contested between two leases, or with
no established fact at all. And because the headline counts came from the
server's totals while the rows came from the browser's opinion, the page
could disagree with its own header and nothing would throw.

| | now |
|---|---|
| `psRruStatus` | relays `p.bucket`; null → `not_established` |
| `psRruStatusLabel` | renders the server's `bucket_label` |
| `psRruException` | reports the server's `bucket_reason` for tenancy |
| `RRU_FILTERS` | keys are the server's bucket values; a chip is offered only when the server counted something for it |
| headline | all five counts read from `totals`; never walks the positions |

The only string authored in the browser is **"Occupancy Unconfirmed"** —
the no-basis case, which has no bucket for the server to have labelled.
`NOT_ESTABLISHED` is API vocabulary and never reaches the glass.

Untouched, deliberately: Forward Leasing, pricing, property chooser,
Ask Spine, and the institutional schedule.

---

## 4 · What is proven, and at which rung

| claim | rung | evidence |
|---|---|---|
| App relays the server's classification | **locally exercised** | `rent_roll_server_classification.test.js` 67/67 |
| …and goes red if JS classifies again | **falsified** | old derivation reinstated → 11 assertions red, including the `return 'open'` fallback |
| Full app suite | **locally exercised** | 34 harnesses · 1435 passed · 0 failed |
| API source governance | **locally exercised** | 35/35 gates |
| Reader correction | **real Postgres (fixture)** | `rent_roll_occupancy_correction.db.js` 87/87 |
| Double-booking refusal | **real Postgres (fixture)** | `confirm_proposal_operative_overlap.db.js` 48/48 |
| Overlap predicate contract | **locally exercised** | `executed_lease_overlap_contract.test.js` 8/8 |
| Concurrency wall | **production** | 5/5, proven earlier in the Render shell |
| Cross-property blast radius | **real Postgres (fixture)** | 3 properties, all claims hold — §6 |
| **Skyline production standing** | **NOT PROVEN** | the trace has not run |
| Deployed runtime · HTTP · session · browser | **NOT PROVEN** | — |

**Falsification note.** The app ratchet was proven by breaking it. Under the
reinstated derivation the *label* assertions stayed green while the *CSS
class* assertions failed — a relayed label over a derived class is a page
that disagrees with itself. Both are asserted for that reason.

---

## 5 · The two Render commands, both rehearsed

Both were rehearsed end to end against a simulated deployed checkout with
**no remote** — the actual production condition.

### Command 1 — the production trace

```
verify deployed checkout (full status, --no-optional-locks)
assert measured HEAD == ddd5a09
discover a remote → else the repository URL
fetch the candidate BY SHA (branch only as fallback)
assert measured HEAD == 87a65eb
assert all 6 reader modules match their frozen hashes
assert package.json / package-lock.json identical, then share node_modules
prove the DB session read-only — exactly SQLSTATE 25006 on a permanent table
one client · BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY
assert schema ceiling 181
run the candidate dated reader
run the candidate Rent Roll read
measure the natural-key bridge
COMMIT, then print
assert the deployed checkout is byte-identical, before and after
exit the trace's own verdict
```

Guards falsified rather than assumed:

- wrong deployed SHA → aborts at A2, fetches nothing, writes nothing
- tampered reader hash → aborts at A4b naming the exact file
- empty schema ledger → aborts **before Skyline is read**
- failed trace → block exits non-zero (it used to end on a `printf` and
  report success under a failed receipt)

### Command 2 — cross-property blast radius

Run **after** the trace. Re-verifies the candidate independently, then
selects its own subjects: every property with rentable inventory and no
opening tenancy baseline. It prints every candidate found and how many it
did not read — a cap that is not printed reads as coverage.

---

## 6 · Blast radius — what the correction does to non-Skyline properties

Fixture-grade. Three properties, three shapes, none with an opening
baseline except the adversarial one.

| property | beds | est / not est | Occ / Pend / Open / Review | state |
|---|---|---|---|---|
| Adversarial Property | 8 | 7 / 1 | 3 / 1 / 1 / 2 | PARTIALLY_ESTABLISHED |
| Overlap Proof Property | 9 | 8 / 1 | 5 / 2 / 0 / 1 | PARTIALLY_ESTABLISHED |
| Skyline Apartments (fixture, no baseline) | 160 | 128 / 32 | 128 / 0 / 0 / 0 | PARTIALLY_ESTABLISHED |

All four claims hold:

1. **native tenancy establishes with no baseline** — 128 of 160 beds
   established from lease facts alone, with no opening import anywhere.
2. **no Open by subtraction** — every Open bed carries
   `ESTABLISHED_VACANT_NO_LATER_BLOCKER` and positive supporting refs.
3. **no fabricated Needs Review** — every one carries a reason code and
   real references; beds with no basis are `not_established`, never
   Needs Review.
4. **no unrecognised status becomes Open** — genuinely exercised: a lease
   with status `escrowed_hold`, which is in neither the retired list nor
   the activation-pending list, lands in **Needs Review**, not Open.

**Reported rather than hidden:** all three read `PARTIALLY_ESTABLISHED`.
That is the honest answer for a property where some beds have no
authoritative fact, and the reader says which and how many.

**One assertion of mine was wrong and is corrected in place.** It first
required every Needs Review to name *conflicting* evidence. Needs Review
has two causes and only one is a conflict: an uninterpretable lease status
names its lease as a **supporting** ref because nothing contradicts
anything — Spine simply cannot read the status. The reader was right; the
assertion was not. Nothing in the reader changed.

---

## 7 · Deploy order and post-deploy proof — DO NOT RUN YET

Blocked on: the production trace, and Kameron's ruling on what it returns.

```
0  production trace green, and its numbers ruled on
1  merge the API candidate to main
      no migration — the ceiling stays 181, no release step
2  confirm Render is live on the new API sha before touching the app
      the API must never require the new app (Open Ruling 2)
3  merge the app candidate to main
4  confirm the app build is live
```

Post-deploy proof, in this order:

```
real login
→ Skyline session
→ Leasing
→ Current Rent Roll
→ headline matches the production trace exactly
→ the four buckets are the server's, row-by-row
→ a bed with no basis reads "Occupancy Unconfirmed" and is NOT Open
→ inspect 109A: July vacancy visible, April operative lease visible,
  Needs Review, no machine-selected winner
→ screenshot
```

This is not done from a fixture, a Render shell or a DOM assertion.

---

## 8 · Open items

- **109A is unresolved and must stay so.** The trace's control requires
  unit digits exactly `109` and space label exactly `A`. If production
  spells it differently the control fails and prints every bed whose unit
  ends in 109 — that is the finding, and the matcher must not be loosened
  until production says why.
- **The blast-radius script is not committed.** It lives in the trace
  command only, so the API candidate stays frozen at `87a65eb`. It should
  land as a real test after the trace pins the candidate.
- **`executed_lease_overlap_concurrency.test.js` needs a real
  `DATABASE_URL`** and was proven in production earlier (5/5), not in this
  session.
