# Current Rent Roll correction — release packet

**Status: DEPLOYED to production. Browser rung outstanding.**
2026-08-18.

```
API   PR #121  merged   main 3efffb6367dea1a4b7028eb344d5b8b630c5f7d6
                        Render LIVE 07:31 · prestart ledger verified both
                        directions · schema 181 · no migration
App   PR #88   merged   main c6769ba662b1d81232c659e81205eba3dc455029
                        build live — pending confirmation
```

Not yet proven: the operator browser rung. Until that is captured this is
deployed, **not shipped** — see §6.

---

## 1 · Production standing — the candidate's answer

Run read-only in the Render shell against candidate `3ba81806`:

```
rentable positions   160        units 72

Occupied              31
Pending Activation     9
Open                 100
Needs Review          20

established / not established   160 / 0
unclassified                      0
property truth_state        ESTABLISHED

Needs Review by reason
   14  OVERLAPPING_OPERATIVE_LEASES
    5  OPENING_POSITION_UNRECONCILED
    1  OPENING_VACANCY_CONFLICTS_WITH_OPERATIVE_LEASE
```

All five truth gates passed. **This is the candidate production standing.**
No expected total was encoded in the script; production calculated it.

### What moved, and what did not

| | before the fix | after |
|---|---|---|
| Occupied | 31 | 31 |
| Pending Activation | 9 | **9** |
| Open | 100 | 100 |
| Needs Review | 20 | 20 |
| — of which overlapping | 15 | **14** |
| — of which opening unresolved | 4 | **5** |

Exactly one bed left the overlap reason and landed on
`OPENING_POSITION_UNRECONCILED` — the bed whose overlap was the historical
one. The headline did not move.

**`22 Pending` did not come back, and now that is a proven result rather
than an assumption.** The earlier ruling held those 13 beds out of Pending
on the belief that their overlaps were current; that belief was not
proven, and the reader was capable of carrying a historical overlap into
an August read. With the dated rule in place the 13 stayed out anyway —
their second lease genuinely spans 2026-08-17. We were right to distrust
`22 Pending`; that never meant it was wrong, only unproven. It has now
been properly disproven.

**One honest limit on that gate.** The recompute asserts every remaining
overlap names **≥2 distinct canonical lease ids**. That those ids both
span 2026-08-17 is true *by construction* — the corrected classifier
populates the conflict set only from leases that span the date — and is
covered by 24 unit assertions, but the production script did not
re-derive it independently. Distinctness was measured; spanning was
inherited.

---

## 2 · The two frozen halves

**One release head per side. Merge and deploy these, nothing else.**

| | release head | |
|---|---|---|
| **API** | `4cd8dfa2514bf7a96022dbe2a858b4e401c609d1` | `claude/rent-roll-occupancy-correction` |
| **App** | tip of `claude/code-philosophy-review-xoiz8f` | runtime frozen at `428229b0` |
| **Schema** | ceiling 181 — **no migration**. Neither change touches schema. | |
| **Dependencies** | unchanged | |

Behavioural provenance, for the receipt only — these are **not** merge
targets:

| | | |
|---|---|---|
| API reader fix | `3ba81806` | the commit production recomputed against |
| App relay | `a973b93` | the only app commit that changes runtime |

`a973b93 → 72c7a8e` is **documentation only** — one commit, one file,
`docs/RENT_ROLL_CORRECTION_RELEASE_PACKET.md`. `index.html` and all three
rent-roll harnesses are byte-identical across it, and again across the
merge to `428229b`.

**Why the app head is named as a branch tip and not a SHA.** Naming a SHA
here is self-defeating: writing it into this file creates a new commit and
the named SHA is immediately stale — which is the exact ambiguity this
section exists to remove. So the guarantee is stated instead, and it is
mechanically checkable at any moment:

```
git diff --name-only 428229b0..HEAD    # must be docs/ or *.md only
```

Runtime is frozen at `428229b0`. Anything after it on this branch is
documentation. Deploy the branch tip.

### ⚠ Two commits ride along that this rail did not produce

Both branches were behind `main`, so each release head is a merge of the
candidate with current `main`. That pulls in work already on `main` but
**not yet deployed** — the next deploy of `main` ships it whoever does it,
but it ships in *this* release:

```
API   a127a48 / cd2ac00   PR #120 — "Allow unresolved named meeting owners"
        src/meeting_evidence/meeting_receipt_extractor_runner.js   (+4 −1)
        tests/meeting_receipt_runtime_v0.test.js                   (+11 −1)

App   0e7e0dc              PR #87 — merge of this branch's own earlier state
```

PR #120 touches nothing under `tenancy/`, `surfaces/` or `onboarding/`, and
its own suite passes on the merged tree (75/75). It is disclosed because a
release receipt that names only what its author wrote is not a receipt.

The merged trees were re-proven, not assumed — see §4.

---

## 3 · What changed, and why

### API — a conflict is a conflict *on a date*

The conflict loop ran over every non-retired lease on a bed and asked
whether any two overlapped **each other**. `asOf` never entered it. Every
other axis was date-scoped (`current` / `activationPending` use
`datesSpan`, `future` uses `isFuture`), so two leases that overlapped in
April made the bed read contested in August.

Production is what caught it: beds read Needs Review /
`OVERLAPPING_OPERATIVE_LEASES` while the canonical writer's own overlap
wall saw exactly **one** operative lease on the same bed and date. Both
were right about different questions. July's activation truthfully
recorded two operative leases *then*.

```
CURRENT CONFLICT @ D
  = >= 2 DISTINCT operative leases
    that BOTH span D
    on the same canonical bed
```

Historical overlap stays historical truth and is **not erased** — read at
a date both leases span, the conflict is still reported. Date-scoped, not
amnesiac.

Two defensive invariants alongside it, both earned in this investigation:

- **A lease can never conflict with itself.** The loader aggregates leases
  through a LEFT JOIN to `executed_lease_records`, whose `lease_id` index
  is *not* unique, so two verified evidence rows emit one lease twice.
- **A conflict needs two sides.** One distinct id is not a contest, it is
  a bug upstream; reporting it as a contest is how that bug stayed
  invisible.

### App — the browser displays the classification, it does not make one

`psRruStatus` was a second classifier ending in `return 'open'` — Open by
subtraction, on the way to the glass. It now relays `p.bucket`; the label
is the server's `bucket_label`; the reason is the server's
`bucket_reason`; filter keys are server bucket values; the headline reads
`totals` and never walks the positions.

The only browser-authored string is **"Occupancy Unconfirmed"** — the
no-basis case, which has no bucket for the server to have labelled.

---

## 4 · Proof

| claim | rung | evidence |
|---|---|---|
| Skyline standing under the corrected reader | **production, real data** | 31 / 9 / 100 / 20 · five gates green |
| Dated conflict rule | **locally exercised** | `dated_conflict_scope.test.js` 24/24 |
| …and it is a real ratchet | **falsified** | old rule restored → 8 red, on both halves |
| Reader correction | **real Postgres** | `rent_roll_occupancy_correction.db.js` 87/87 |
| Double-booking refusal | **real Postgres** | `confirm_proposal_operative_overlap.db.js` 48/48 |
| Overlap predicate contract | **locally exercised** | 8/8 |
| Concurrency wall | **production** | 5/5, proven earlier |
| API source governance | **locally exercised** | 35/35 gates |
| App relays the server bucket | **locally exercised** | `rent_roll_server_classification.test.js` 67/67 |
| …and goes red if JS classifies again | **falsified** | old derivation → 11 red |
| Full app suite | **locally exercised** | 34 harnesses · 1435 passed · 0 failed |
| API suite on the MERGED release head | **re-run, not assumed** | all green incl. PR #120's own 75/75 |
| App suite on the MERGED release head | **re-run, not assumed** | 34 harnesses · 1435 passed · 0 failed |
| Deployed runtime · HTTP · session · browser | **NOT PROVEN** | — |

Both ratchets assert **both halves**. A conflict fix that merely stopped
reporting conflicts would pass a one-sided test and lose a real
double-booking, so the same two leases are read at four dates:
`Apr 15 clear · May 15 contested · Jun 1 contested · Jul 15 clear`.

Every API DB proof green: skyline_rent_roll_read 24/24,
tenancy_standing_read 43/43, gate_ask_spine_readers 72/72,
gate_harness_isolation 8/8, inventory_retirement 45/45,
import_retirement_resolution 24/24, ledger_grain_reconciliation 35/35,
surplus_placeholder_repair 28/28, skyline_bed_grain_activation 19/19.

---

## 5 · Deploy order — DO NOT RUN WITHOUT APPROVAL

```
1  merge API 4cd8dfa2 to main
      no migration — the ceiling stays 181, no release step
2  confirm Render POSITIVELY reports the new API build live
      not "the merge succeeded". Serving the new sha · healthy · ceiling 181.
      the API must never require the new app (Open Ruling 2)
3  merge App 428229b0 to main
4  confirm the app build is positively live
```

## 6 · Post-deploy proof

```
real login
→ Skyline session
→ Leasing
→ Current Rent Roll
→ headline reads 31 Occupied · 9 Pending Activation · 100 Open · 20 Needs Review
   (or whatever the reader says on the day — the date moves)
→ the four buckets are the server's, row by row
→ open a Needs Review row: it names its own reason and its evidence
→ screenshot
```

Not done from a fixture, a Render shell, or a DOM assertion.

---

## 7 · Deliberately not done in this rail

- historical lease cleanup — the 20 exceptions are a subsequent tenancy
  reconciliation rail, where governed facts resolve the underlying history
- 109 naming / source-to-canonical lineage
- cross-property blast radius against production
- the loader-level dedupe refactor (the classifier now defends against it;
  the loader contract itself is untouched)
- Forward Leasing, pricing, property chooser, Ask Spine polish
