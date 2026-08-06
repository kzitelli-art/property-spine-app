# Release 0 — Step 1 release packet (app proof-shape compatibility)

**CANDIDATE. NOT DEPLOYED. No production result is claimed anywhere in this
document.**

**Governing plan: `property-spine-api` `046895a` (revision 4).**
`4f25f73` is the historical architecture-freeze point and is **not** the
controlling SHA — `046895a` supersedes it because it carries the accepted
factual correction (§3.2.0) and the execution hardening. **Do not cite two
"current" architecture SHAs in any later receipt.**

This is deployment step 1 of the sequence in that plan's §5.1.

---

## 1. What step 1 is, and what it deliberately is not

**Is:** one proof normalizer, understanding both the current boolean-only API
contract and the four-state contract Release 0 will emit, shipped **before**
the API emits the new one.

**Is not:** any change to how a work order is completed. `"Mark done — close"`,
`closeoutDone` and `attachStubPhoto` are **untouched at this step**. They are
removed at step 5, gated on phone-verifying the technician SMS rail at step 4.
Removing them now would leave an operator with no way to complete a work order
at all.

---

## 2. SHAs

```text
governing plan  046895a3ea8f15a2149907c9dd16da4897d00bdf   api, revision 4
base            6220ca5907137aa9036adaee23e8fee78a88a3f0   app main, deployed
rollback        6220ca5907137aa9036adaee23e8fee78a88a3f0   identical to base
candidate       b79f1921ee7dd659656d86df39405df119a39f49   code-bearing

DEPLOY THE EXACT SHA b79f192 — never a floating branch reference. If the
deploy is triggered from the branch, RESOLVE and RECORD the commit it landed
on; a branch name is not a deploy identity.
```

**Rollback is a redeploy of `6220ca5`.** Step 1 is additive on the app side —
one new file, one script tag, and six call sites rerouted. No API contract
changes, so the previous app runs against the same API it always did.

---

## 3. Files

```text
NEW   proof-normalizer.js                    the one interpretation point
NEW   proof_normalizer_contract.test.js      167 assertions
MOD   work-lifecycle-door.js                 6 raw proof reads → proofOf()
MOD   index.html                             one script tag
NEW   docs/RELEASE_0_STEP_1_PACKET.md        this file
```

Nothing else in the app is touched.

---

## 4. The contract this enforces

`proof.state`, **when present, is exactly four values**:

```text
satisfied · not_satisfied · legacy_indeterminate · missing_evaluation_defect
```

`unavailable` is **not** one of them. Unavailability is a property of the READ
and is carried by `read_status`.

```text
OLD CONTRACT (no read_status key)
  required               boolean, PRESENT
  satisfied              boolean, PRESENT
  not_preserved_count    nonnegative integer, PRESENT

NEW / read_status = "ok"
  required               boolean, PRESENT
  state                  one of the four
  satisfied              exact compatibility value, PRESENT
  not_preserved_count    nonnegative integer, PRESENT
  legacy_evidence        object, PRESENT
    column_photo_present boolean
    column_note_present  boolean

NEW / read_status = "unavailable"
  required               boolean, PRESENT
  reason_code            nonempty string, PRESENT
  state                  ABSENT
  satisfied              ABSENT

anything else                          → CONTRACT FAILURE → renders unavailable
```

Three rules that carry the release:

1. **Absence is not agreement.** A missing `satisfied` is an unkept promise; a
   mapping cannot be verified against a value nobody sent. An earlier revision
   of this file skipped the comparison when `satisfied` was absent, which
   accepted `{state:"satisfied"}` with no boolean at all. Corrected.
2. **`false`, `null` and absent are three different facts.** No truthiness. An
   explicit `null` is correct for legacy and defect; `false` is not, and
   `undefined` on an own property is not a value.
3. **A payload the app cannot understand renders UNAVAILABLE**, never
   `not_satisfied`, never legacy, never empty. Saying "proof is missing" because
   we failed to parse a response is a confident wrong.
4. **Supporting fields are facts, not decoration.** An earlier revision
   defaulted a missing `required` to true, a missing count to 0, and a missing
   evidence block to false/false. Safe-*looking* and still wrong: "zero
   unpreserved attachments" and "the API omitted the count" are different
   statements and only one is true. An omitted diagnostic fact renders
   unavailable. Verified against the live API — both list and detail already
   send `required`, `satisfied` and `not_preserved_count`, so strict validation
   is safe against current production.

A legitimate `unavailable` and a contract failure look **identical on screen**
and are distinguished in the console: one is a known condition, the other is a
bug someone has to fix.

---

## 5. Consumer scan — every proof read in the app

Command:

```bash
grep -rn "proof\.satisfied|proof\.state|proof\.not_preserved_count|proof\.required|preserved_count" \
  --include=*.js --include=*.html . \
  --exclude-dir=node_modules --exclude=proof-normalizer.js \
  --exclude=proof_normalizer_contract.test.js
```

Result: **NONE outside the normalizer.**

All six real consumers were in `work-lifecycle-door.js` and now route through
`proofOf()`:

```text
:95   row state, completion_claimed        → proofOf(w)
:257  CURRENT line, completed              → proofSentence(d)
:260  CURRENT line, completion_claimed     → proofSentence(d)
:294  ask-photo action gating              → proofOf(d).satisfied !== true
:305  not-preserved note, condition        → proofOf(d)
:307  not-preserved note, count            → proofOf(d).notPreservedCount
```

`index.html`'s many `r.proof` references are a **UI label string** on row
objects (`"review"`, `"closeout"`), not the API's proof object. They are
unrelated and untouched.

**If the normalizer fails to load, the door renders unavailable** rather than
falling back to reading the payload itself — a second interpretation is exactly
what the normalizer exists to prevent (`normalizer_absent`).

---

## 6. Script load order

```text
index.html:28222   <script src="./proof-normalizer.js"></script>
index.html:28223   <script src="./work-acceptance-door.js"></script>
index.html:28224   <script src="./work-lifecycle-door.js"></script>
```

The normalizer loads **before** every consuming surface. Asserted in the test
suite by index comparison, so a future reorder fails the build rather than
silently producing `normalizer_absent` at runtime.

---

## 7. Test evidence

```text
proof_normalizer_contract.test.js     167 passed · 0 failed
full app suite (run_harnesses.sh)     19 harnesses · 889 passed · 0 failed · 0 red
```

Coverage: both contracts · all four states · every contract-failure path ·
required-`satisfied` enforcement · the inverse unavailable contract ·
failure-versus-legitimate-unavailable · presence-only legacy evidence ·
consumer scan · script load order · the frozen mapping.

### 7.1 Falsification — the assertions were made to fail on purpose

```text
A  restored the permissive rule (absence tolerated)
     → 11 assertions fire: every "satisfied missing" case, both
       "renders unavailable" checks, and the not_satisfied guard
     → 99 passed · 11 failed

B  removed the inverse-unavailable guard
     → 6 assertions fire: state present, satisfied present, both present
     → 104 passed · 6 failed

C  put a raw proof read back into work-lifecycle-door.js
     → 2 assertions fire, and they are the right two

D  restored the permissive supporting-field defaults
     → 9 assertions fire across required, count and evidence
     → 158 passed · 9 failed

restored → 167 passed · 0 failed
```

---

## 7.2 Asset binding — BEFORE browser acceptance

**A green Render event proves a build ran. It does not prove the browser can
receive the new file.** Bind the receipt to the asset, not to the deploy.

Expected values, computed from `b79f192`:

```text
proof-normalizer.js   sha256 1e44c1f9ed8a713ec85ac2f27193a29858d1db81522dea29bf863be744a7399f
                      11930 bytes
```

Cache-busted fetches:

```bash
HOST=https://<your-app-host>

curl -sS "$HOST/proof-normalizer.js?release=b79f192" -o /tmp/pn.js
sha256sum /tmp/pn.js          # MUST equal the digest above

curl -sS "$HOST/index.html?release=b79f192" -o /tmp/idx.html
grep -n 'proof-normalizer.js\|work-lifecycle-door.js' /tmp/idx.html
# proof-normalizer.js MUST appear on an EARLIER line than
# work-lifecycle-door.js

for m in required_invalid not_preserved_count_invalid \
         legacy_evidence_invalid reason_code_invalid; do
  printf '%-32s %s\n' "$m" "$(grep -c "$m" /tmp/pn.js)"
done
# ALL FOUR must be non-zero. They exist ONLY in the strict revision,
# so their presence binds the served file to b79f192 by content.
```

**If the digest does not match, stop.** The browser is being served something
other than what was reviewed, and no acceptance result from it means anything.
This is the §7.7 binding rule applied: prove the artifact identity, not that a
deploy succeeded.

Then use a **private window or hard cache bypass** for the acceptance run.

---

## 8. Production acceptance path — against the OLD API

**To be executed after deployment. No result is claimed here.**

The API is unchanged at this step, so production still emits the boolean-only
shape. This proves the new app renders the old contract correctly.

```text
1  sign in as an operator
2  open Property Home
3  open Work Orders
4  LIST renders — rows show their proof condition, no blank tiles
5  open a work order — DETAIL renders
6  existing boolean-only proof still renders correctly
     satisfied=true   → "Repair photo preserved."
     satisfied=false  → "Photo required before close."
7  navigate desk → door → job → desk → door
     NO stale content survives navigation
8  "Mark done — close" is STILL PRESENT and still works
9  "Not 100% done" → "Log reason — keep chain alive" still works
     (closeoutNotDone must survive this release and every later one)
10 browser console shows NO "[proof-normalizer] CONTRACT FAILURE" line
     — against the old API every response is a legal old-shape payload,
       so any contract failure here is a real defect
```

**Presence is not visibility.** Confirm rendered output, not DOM presence — the
hidden-lanes defect is already recorded in this repo's history.

**Stop conditions:** any contract-failure line in the console · proof rendering
as unavailable where the old API sent a clean boolean · a missing or
non-functioning `"Mark done — close"` · a missing or non-functioning not-done
path · stale content surviving navigation.

---

## 9. Deployment receipt — PARTIAL. STEP 1 IS NOT COMPLETE.

```text
deployed timestamp        2026-08-06, Render auto-deploy on push to main
deployed by               owner
resolved deployed SHA     8cbfd1aa272e53614dec7fdbc70638e5a6b121b1
code-bearing SHA          b79f1921ee7dd659656d86df39405df119a39f49
base SHA replaced         6220ca5907137aa9036adaee23e8fee78a88a3f0
governing API plan        046895a3ea8f15a2149907c9dd16da4897d00bdf
```

### 9.1 A first Manual Deploy built the WRONG commit

The service is wired to branch `main`; the candidate was on
`claude/release-0-audit-plan-55r5kd`. The first Manual Deploy log read:

```text
Checking out commit 6220ca5907137aa9036adaee23e8fee78a88a3f0 in branch main
```

**That is the base SHA — the deploy rebuilt what was already live.** Nothing
broke and no rollback was needed, but no Step 1 code was serving. `main` was
then fast-forwarded (no merge commit) to `8cbfd1a`.

This is exactly why §7.7 requires binding a receipt to artifact identity rather
than to a deploy event. **A green Render build said "Your site is live" while
serving the previous release.**

### 9.2 Asset binding — PASS

```text
served proof-normalizer.js sha256
  1E44C1F9ED8A713EC85AC2F27193A29858D1DB81522DEA29BF863BE744A7399F
expected (b79f192)
  1e44c1f9ed8a713ec85ac2f27193a29858d1db81522dea29bf863be744a7399f
MATCH

served index.html script order
  28222  <script src="./proof-normalizer.js"></script>
  28224  <script src="./work-lifecycle-door.js"></script>
  normalizer loads FIRST — PASS
```

The browser is provably receiving the reviewed file.

### 9.3 Browser acceptance — DEPLOYMENT IDENTITY PROVEN, INTERPRETATION UNPROVEN

**Checks 4–10 are ONE atomic acceptance pass, not a running tally.** They are
rerun together once controlled data exists. Nothing below is progress toward a
score.

```text
 1 sign in                            PASS
 2 Property Home opens                PASS
 3 Work Orders opens                  PASS
     honest empty state:
     "0 NEED ACTION · No work orders at this property."
     Names the reason. Not a blank panel, not a spinner, not "unavailable".

 4 list VISIBLY renders proof         BLOCKED — no rows
 5 detail VISIBLY renders             BLOCKED — no rows
 6 boolean-only renders correctly     BLOCKED — no rows
 7 no stale content on navigation     BLOCKED — nothing to navigate between
 8 "Mark done — close" present+works  BLOCKED — no rows
 9 "Not 100% done" present+works      BLOCKED — no rows
10 console CONTRACT FAILURE count     BLOCKED — see below
```

**Check 10 is deliberately NOT recorded from the empty state.** Opening the
console now could establish only *"no ambient error occurred while rendering an
empty door."* It cannot establish *"the normalizer accepted a real production
proof payload,"* because with zero rendered rows `proofOf()` never runs. A clean
console today would be a true statement about the wrong subject — §7.7.

### 9.4 Why blocked, and why that is not a defect

The operator's property has **no work orders**. Production holds six, none in
the granted property — consistent with the audit, and with the constraint
`THREAD_HANDOFF.md` already records: a signed-in operator cannot switch to a
property that has work orders, because `renderProperties` hard-scopes the picker
to the granted property. **The only way to put rows in front of the operator is
to create them there.**

**The empty state passing is real but narrow.** With zero rows the normalizer is
never called — `proofOf()` runs only when a work order renders. So this run
proves the asset is served, the door loads, and the empty case is honest. It
proves **nothing** about proof interpretation.

### 9.5 STEP 1 — DEPLOYED · ASSET IDENTITY PROVEN · ACCEPTANCE PENDING CONTROLLED DATA

**Not "3 of 10 complete." Not 30% accepted.** The three passing checks prove
deployment identity and empty-state integrity. They prove **nothing** about
proof interpretation, and the two facts do not add together.

Six checks require at least one work order visible to the operator.

**An earlier revision of this line said the SMS ingress preflight "unblocks all
six." That was wrong, and §9.7 replaces it.** One work order unblocks four.
Three of the six are not blocked on data at all — they are blocked on something
data cannot supply.

```text
rollback required          NO
next action                see §9.7 — the acceptance list needs a ruling
                           before it can be run atomically
```

## 9.6 PERMANENT CONTROL — static-site deploys

Adopted after a green Render build served the previous release.

```text
NO static-site deployment passes unless

   intended commit  =  Render checkout commit  =  served asset identity

A green deployment event alone is NEVER evidence.
```

All three, every time. The checkout SHA appears in the Render log; the served
asset identity is a digest of the file the browser actually receives, fetched
cache-busted. This is §7.7's binding rule in its narrowest, most reusable form.

---

## 9.7 ⛔ THE ACCEPTANCE LIST CANNOT BE RUN ATOMICALLY AS WRITTEN

Determined by reading the source, before any production write was attempted.
**No work order was created. No check was run. Nothing was mutated.**

### 9.7.1 What §8 actually requires, check by check

Traced against `work_order_status_read.js`, `work-lifecycle-door.js` and
`index.html` as they are deployed.

```text
 4 list renders proof condition     ONE OPEN ROW IS ENOUGH
 5 detail renders                   ONE OPEN ROW IS ENOUGH
 7 no stale content on navigation   ONE OPEN ROW IS ENOUGH
10 no CONTRACT FAILURE in console   ONE OPEN ROW IS ENOUGH  (see 9.7.2)

 6 boolean proof renders correctly  REQUIRES A COMPLETION CLAIM
 8 "Mark done — close" still works  REQUIRES COMPLETING THE WORK ORDER
 9 "Not 100% done" still works      REQUIRES ASSERTING AN ATTEMPT WAS MADE
```

### 9.7.2 Check 10 becomes meaningful with one open row — the earlier doubt is resolved

`detailHtml` calls `proofOf(d)` **unconditionally** (`work-lifecycle-door.js`,
the `notPreservedCount` guard). And the API builds `proof` for *every* work
order regardless of lifecycle state — `required: true`, `satisfied: <boolean>`,
`not_preserved_count: <int>` are always present (`work_order_status_read.js`).

So a single open row produces a **legal old-contract payload** that the
normalizer really parses. Check 10 stops being a statement about an empty door
and becomes a statement about a real production proof payload. That is the
subject §7.7 requires.

### 9.7.3 Why 6, 8 and 9 are not blocked on data

They are lifecycle checks. **A lifecycle cannot be exercised without performing
the work.**

```text
CHECK 6  the visible sentences it names — "Repair photo preserved." /
         "Photo required before close." — render ONLY in the `completed` and
         `completion_claimed` branches of detailHtml. Reaching either means
         recording that a technician finished a repair.

CHECK 8  closeoutDone() sends PATCH /work-orders/:id/closeout with
         done:true AND completion_photo:"stub://closeout-photo/…".
         That is a completion command and a fabricated photo in one call.

CHECK 9  closeoutNotDone() sends done:false with a not_done_reason. It does
         NOT complete and attaches NO photo — so it clears the letter of the
         approval. It still asserts a field fact that did not happen: that
         someone attempted this work and was stopped for a stated reason.
```

**Check 9 is the one worth naming explicitly**, because it would have been easy
to run. Nothing in the authorization forbids it. §5 does: *record the truth at
the moment of work.* A not-done reason on work nobody attempted is a fake
operating fact with a real obligation hanging off it, and it would sit in
production reporting permanently. **Not run.**

### 9.7.4 The list conflates two different proofs

```text
A  does the deployed app interpret a real production proof payload
   correctly?                                    checks 4, 5, 7, 10
B  do the legacy completion controls still work? checks 6, 8, 9
```

**A is what step 1 shipped.** One controlled open work order proves it, honestly
and completely.

**B is a regression check on controls step 5 deletes.** What it guards is real —
*do not strand the operator without a way to close work* — but it is a check on
the *old* path, and it cannot be run in production without manufacturing a
completion. Proving a destructive lifecycle by fabricating production facts
costs more truth than the check returns.

### 9.7.5 Two things are needed, and neither is mine to decide

```text
1  EXECUTION. Both halves are owner actions and cannot be performed from
   the build container:
     · POST /work-orders is behind the x-operator-key gate (server.js).
       OPERATOR_KEY exists only in Render's environment — correctly, and it
       is not to be pasted anywhere. The clean execution is a Render Shell
       curl referencing $OPERATOR_KEY, never echoing it.
     · property_id must come from GET /operator/me, which derives it from
       the staff session (§21: the server decides). Not guessed, not typed.
     · the browser pass needs the signed-in operator session.

2  A RULING on checks 6, 8 and 9. Three options, no recommendation smuggled
   in as a default:
     (a) SPLIT the acceptance. Checks 4,5,7,10 accept step 1 on their own
         terms and the receipt says exactly that. 6,8,9 move to a named
         legacy-path regression owed before step 5 removes those controls.
     (b) DEFER the whole pass until a technician genuinely completes a real
         work order, and run all seven then. Truthful, and unscheduled.
     (c) Run 6,8,9 in a non-production environment against the same asset,
         and receipt it as such — it proves the controls function, and it
         does NOT prove production behaviour. Those are different claims.
```

Under the standing instruction **"do not count partial checks as progress,"**
running 4, 5, 7 and 10 and reporting completion would be exactly that. So the
pass is not started, and nothing is claimed.

### 9.7.6 The request body, ready to run once the ruling lands

Verified against `workOrderService.createWorkOrder`. Required: `property_id`,
`title`, valid urgency. Every optional field is **omitted on purpose** — an
unobserved fact stays null rather than becoming a tidy default.

```text
POST /work-orders          x-operator-key: $OPERATOR_KEY

  property_id       from GET /operator/me — server-derived, never typed
  title             "RELEASE 0 CONTROLLED — acceptance record, do not dispatch"
  description       states what it is, why it exists, and that it is not
                    a dispatchable repair
  is_emergency      omitted  → urgency_status "regular", needs_pm_review false
  idempotency_key   FIXED literal — makes the single request retry-safe, so a
                    network retry cannot produce a second acceptance record
  unit_id                   omitted — no unit is affected
  reported_by_person_id     omitted — no fabricated resident identity
  affected_person_id        omitted — same
  assigned_to               omitted — honest UNASSIGNED
  est_cost                  omitted — no invented number
  tenant_caused             OMITTED DELIBERATELY. `=== true` spawns a billback
                            decision obligation in the same transaction
                            (work_order_service.js). Nobody should owe a
                            billback answer on a test record.
  cause / work_nature       omitted — closed vocabularies; an unverified value
                            is a 400, and a guessed one is a false fact
```

Result: `status: 'open'`, lifecycle `scheduled`, `proof.satisfied: false`,
`not_preserved_count: 0`. The detail view renders "Nobody has taken this yet."
and the normalizer runs against a real payload.

### 9.7.7 Classification of the record that has not yet been created

Restated from `property-spine-api` `RELEASE_0_SMS_PREREQUISITE.md` §6 because it
governs what happens after acceptance: **class 1, real operating data.** Not
deleted, not cleaned up. Its disposition happens through a governed product path
like any other work order.

---

## 10. Gates

```text
1  architecture frozen at 4f25f73                    CLOSED
2  credential rotated                                CLOSED  (api b636350 §4)
3  old credential proven dead                        CLOSED  (api b636350 §4 fact 5)
4  SMS technician rail phone-verified                OPEN — release step 4,
                                                     gates step 5, not step 1
```

Gates 2 and 3 were closed by the owner's rotation receipt, preserved at
`property-spine-api` `b636350`. **Step 1 is therefore deployable on the owner's
word**; this packet is what makes that a decision rather than a scramble.

---

## 11. Classification (§18)

| Component | Class | Removal condition |
|---|---|---|
| `proof-normalizer.js` | 1 — permanent | Never. It is the single interpretation point for proof state. |
| `proof_normalizer_contract.test.js` | 1 — permanent | Never. It is what keeps the interpretation single. |
| This packet | 1 — permanent record | Never. It is the pre-deployment evidence for step 1. |
| `attachStubPhoto` / `"Mark done — close"` | **4 — retired** | Removed at step 5, after step 4 phone verification. **Untouched by this step.** |
