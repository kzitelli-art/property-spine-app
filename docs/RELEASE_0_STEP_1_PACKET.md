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
candidate       b79f1921ee7dd659656d86df39405df119a39f49   code-bearing, SUPERSEDED
REPAIRED        44379d545114b00d3af4d1b09ae534b7840a017b   deploy THIS — see §9.9

b79f192 IS BROKEN. It scoped proofOf/proofSentence inside stateLine, so every
work-order DETAIL render threw ReferenceError while the list hid the break.
Deploying b79f192 would fail the corrected acceptance at check 6.

DEPLOY THE EXACT SHA 44379d5 — never a floating branch reference, and never
b79f192. If the deploy is triggered from the branch, RESOLVE and RECORD the
commit it landed on; a branch name is not a deploy identity.
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

added by the repair and the ruling (§9.8-§9.11)
NEW   proof_presentation_contract.browser.js 43 assertions, real Chromium
NEW   docs/LEGACY_COMPLETION_CONTROL_REGRESSION.md   the named owed item
MOD   work-lifecycle-door.js                 proofOf/proofSentence to module
                                             scope — SCOPE ONLY, no logic
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
:131  row state, completion_claimed        → proofOf(w)
:296  CURRENT line, completed              → proofSentence(d)
:299  CURRENT line, completion_claimed     → proofSentence(d)
:333  ask-photo action gating              → proofOf(d).satisfied !== true
:344  not-preserved note, condition        → proofOf(d)
:345  not-preserved note, count            → proofOf(d).notPreservedCount

Line numbers are as of the REPAIRED candidate 44379d5. They moved when
proofOf/proofSentence were lifted out of stateLine (§9.9); the six call
sites themselves are unchanged.
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
next action                §9.8 carries the ruling · §9.9 a real defect found
                           and fixed · §9.12 the owner request. REDEPLOY at
                           44379d5 before running the corrected acceptance.
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

## 9.8 OWNER RULING — split the acceptance by responsibility

The stop in §9.7 was accepted. The ruling: the former checks 6, 8 and 9 were an
**acceptance-design defect, not a step 1 product defect.** They required
production mutations step 1 neither introduced nor is authorised to perform.

### 9.8.1 What step 1 is responsible for

```text
reviewed static asset is serving
  → normalizer loads before its consumers
    → a real current-API work order reaches the normalizer
      → list and detail interpret that payload correctly
        → navigation does not retain stale proof state
          → no contract failure is emitted
            → unrelated legacy controls remain visibly present
```

### 9.8.2 What step 1 does NOT own

```text
technician completion · legacy closeout execution
follow-up obligation creation · SMS evidence ingress
canonical writer behaviour
```

**These must not be forced into this acceptance pass.**

### 9.8.3 The corrected production acceptance — ELEVEN checks, ONE pass

```text
 1  deployed asset identity matches the reviewed candidate
 2  proof-normalizer loads before work-lifecycle-door
 3  operator signs in and opens Property Home
 4  Work Orders renders the controlled open work order
 5  list proof presentation is correct
 6  detail proof presentation is correct
 7  the real current-API proof object is accepted by the normalizer
 8  desk → list → detail → desk → list retains no stale state
 9  "Mark done — close" remains visibly present
10  "Not 100% done" remains visibly present
11  zero [proof-normalizer] CONTRACT FAILURE messages
```

**Checks 9 and 10 are presence and non-regression checks only. DO NOT CLICK
THEM.** That their handlers were not modified by step 1 is proven separately by
diff and by the automated suite — see §9.11.

### 9.8.4 Treatment of the three former checks

```text
FORMER 6  completed-state wording
          Do NOT manufacture a production completion to display copy.
          Proven instead in the automated browser harness across six
          controlled payload shapes.                        → §9.10

FORMER 8  "Mark done — close"
          Do NOT invoke in production. It writes done:true with
          completion_photo "stub://…" — the known defect scheduled for
          retirement at step 5. Executing it would deliberately create the
          bad state Release 0 exists to remove. Not a step 1 criterion.
                                    → LEGACY_COMPLETION_CONTROL_REGRESSION.md

FORMER 9  "Not 100% done"
          Do NOT invoke merely to prove the button works. It creates a real
          follow-up obligation representing an attempt that never occurred.
                                    → LEGACY_COMPLETION_CONTROL_REGRESSION.md
```

---

## 9.9 ⚠ A REAL STEP 1 DEFECT, FOUND BY THE HARNESS AND FIXED

**The deployed build `8cbfd1a` / code-bearing `b79f192` is broken. Step 1 must
be redeployed before the corrected acceptance can be run.**

Found on the harness's **first run** against the real deployed file — not a
harness artifact. Real Chromium loading `work-lifecycle-door.js` off disk:

```text
ReferenceError: proofSentence is not defined
    at detailHtml (work-lifecycle-door.js:288)
    at render     (work-lifecycle-door.js:408)
    at loadDetail (work-lifecycle-door.js:211)
```

### 9.9.1 The cause

The step 1 edit landed `proofOf` (93–103) and `proofSentence` (107–115)
**between `stateLine`'s first statement and its next comment.** `stateLine`
opens at 86 and does not close until 152 — so both were nested function
declarations, hoisted into `stateLine`'s scope alone. `detailHtml` is a sibling
inside the IIFE and could not see either one.

### 9.9.2 Why nothing caught it

```text
stateLine    the ONE caller that could still reach them   → the LIST rendered
detailHtml   a sibling                                    → every detail THREW
```

The throw propagates out of `render()`, out of `loadDetail`, and rejects
unhandled. **The list stays on screen, so clicking a work order does nothing at
all** — no error, no blank, no unavailable. A silent dead click.

**The production pass could not have caught this, because there was no row to
click.** The empty-state pass in §9.3 recorded three honest PASSes over a defect
that made the whole detail surface inert. That is precisely why §9.3 refused to
call itself progress.

### 9.9.3 The fix is scope, and only scope

Both functions move to module scope. `stateLine`'s opening and its
*"Named for the fact that caused it"* comment are restored to the shape they had
at base `6220ca5`. **No logic changed.** The existing 167-assertion normalizer
suite still passes unchanged.

```text
repaired candidate   44379d545114b00d3af4d1b09ae534b7840a017b
```

---

## 9.10 HARNESS RECEIPT — `proof_presentation_contract.browser.js`

Discharges the deterministic half of the former check 6. Real Chromium, real
deployed files off disk, no network, no database, no credential.

```text
43 assertions · 43 passed · 0 failed · exit 0
```

| Group | Covers |
|---|---|
| H1–H4 | normalizer defines `__psProof`; door defines `__psWorkOrders`; `index.html` carries exactly one `<script src>` for each, normalizer first |
| D1–D7 | the `completed` branch across all six payload shapes, plus both poles of the current boolean contract |
| C1–C7 | the `completion_claimed` branch across the same six |
| C8–C10 | the "Ask" control follows proof **meaning**, not the raw boolean |
| N1–N8 | negative controls — each malformed payload must render UNAVAILABLE **and** name its reason in the console |
| L1–L4 | list state line: Ready to close · Photo required to close · Proof evaluation missing · Proof state unavailable |
| F1–F4 | forward-looking — see §9.10.2 |
| V1–V3 | no stale proof state survives list → detail → list |
| P1–P3 | the raw proof object is touched in exactly one place |

### 9.10.1 The six payload shapes, as the ruling names them

```text
current boolean-only          OLD_TRUE / OLD_FALSE
future satisfied              read_status ok · state satisfied · satisfied true
future not_satisfied          read_status ok · state not_satisfied · false
legacy_indeterminate          read_status ok · satisfied null
missing_evaluation_defect     read_status ok · satisfied null
read unavailable              read_status unavailable · reason_code · no state
```

### 9.10.2 F1–F4 — the list projection is a narrowing point (STEP 2 REQUIREMENT)

`readPropertyWorkOrderStatuses` copies exactly three proof fields:
`required · satisfied · not_preserved_count`. Today that is harmless — those
three **are** the whole current contract.

The moment the canonical writer emits four states it stops being harmless.
Narrowing drops `read_status`, `state` and `legacy_evidence`, so the row arrives
looking like an OLD payload — and for the two states whose compatibility boolean
is `null`, that payload is **illegal**.

```text
F1  satisfied                  survives narrowing      (maps to old true)
F2  not_satisfied              survives narrowing      (maps to old false)
F3  legacy_indeterminate       BREAKS — proven         satisfied null
F4  missing_evaluation_defect  BREAKS — proven         satisfied null
```

Consequence: every legacy and every writer-defect work order would render
**unavailable in the LIST while the DETAIL renders it correctly**, one
contract-failure line per row. Two surfaces disagreeing about one work order is
the exact defect the single interpretation point exists to prevent.

**This is a step-2 requirement, not a step-1 defect** — nothing emits a
four-state payload yet. It is proven here so the requirement is a recorded
consequence rather than a remembered intention.

### 9.10.3 Falsification — the harness was made to fail

Run against a deliberately dead-open normalizer (`normalize` returns
`satisfied` unconditionally):

```text
17 passed · 26 FAILED · exit 1 · zero contract-failure lines
```

A suite that cannot fail proves nothing. `proof-normalizer.js` was restored from
git and verified byte-clean afterwards.

### 9.10.4 Two harness defects, found by running it

Recorded because an unrecorded test defect is indistinguishable from a product
fact.

```text
H3 (first cut)  searched index.html for the bare FILENAME and matched a prose
                comment 20k lines above the real tag, then reported the load
                order was wrong. It is not. Same error class as reading a
                column name out of prose — assert against <script src>.

L/F/V (first cut)  render() prefers state.detail whenever it is set, and
                loadList() does not clear it. List cases run after detail cases
                silently re-rendered the DETAIL and found no row — seven
                reported "product failures" that were all one missing
                backToList(). The door's own open() clears the same fields.
```

---

## 9.11 LEGACY HANDLERS WERE NOT MODIFIED BY STEP 1

Required by the ruling's completion rule. Base `6220ca5` → repaired candidate.

**`index.html` — the entire step 1 diff is three lines:**

```text
+<!-- The ONE proof interpretation point. Must load BEFORE any surface
+     that renders a proof condition. See proof-normalizer.js. -->
+<script src="./proof-normalizer.js"></script>
```

**The four legacy completion handlers, sha256 of each function body:**

| Handler | base `6220ca5` | repaired candidate | |
|---|---|---|---|
| `attachStubPhoto` | `b2bd671a8156379b` | `b2bd671a8156379b` | IDENTICAL |
| `toggleNotDone` | `ea0c9bf5bcd30309` | `ea0c9bf5bcd30309` | IDENTICAL |
| `closeoutDone` | `34b58c153e3ff433` | `34b58c153e3ff433` | IDENTICAL |
| `closeoutNotDone` | `df19acc7cfc2707e` | `df19acc7cfc2707e` | IDENTICAL |

---

## 9.12 THE OWNER REQUEST — controlled work order, idempotent

### 9.12.1 Step A — the property id, from the server (browser, signed in)

`property_id` is **derived from the staff session, never typed** (§21: the
browser requests, the server decides). Run in the signed-in browser console:

```js
await (await fetch(
  document.getElementById('apiBase').value.replace(/\/+$/,'') + '/operator/me',
  { headers: { 'x-staff-session':
      JSON.parse(sessionStorage.getItem('__ps_staff_session__')).t } }
)).json()
```

Copy `property_id` from the result. **A property id is not a credential.**

### 9.12.2 Step B — Render API shell, one block

`$OPERATOR_KEY` is referenced from Render's environment and **never printed**.
The read-only precheck is guarded by a real `if` on a captured value — an
earlier instruction in this release used a `#` comment as a guard and the
command ran anyway.

```bash
PROP='a50fbdd0-3642-431e-b532-0dcd6ab8a4fe'    # Solo on Chestnut, from /operator/me
IDK='release0-step1-acceptance-v1'

STATE=$(curl -sS -G -w '\n%{http_code}' "http://localhost:${PORT:-3000}/work-orders" \
  --data-urlencode "property_id=$PROP" \
  -H "x-operator-key: $OPERATOR_KEY" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const L=s.split("\n"); const code=L.pop().trim(); const body=L.join("\n");
      if(code!=="200"){console.log("PRECHECK_FAILED http "+code+" "+body.slice(0,160));return;}
      let r; try{r=JSON.parse(body)}catch(e){console.log("PRECHECK_FAILED unparseable body");return;}
      if(!Array.isArray(r)){console.log("PRECHECK_FAILED not a list "+JSON.stringify(r).slice(0,160));return;}
      const n=r.filter(w=>w.idempotency_key===process.argv[1]).length;
      console.log(n===0?"READY":("EXISTS "+n));})' "$IDK")

echo "precheck: $STATE"

if [ "$STATE" = "READY" ]; then
  curl -sS -X POST "http://localhost:${PORT:-3000}/work-orders" \
    -H "x-operator-key: $OPERATOR_KEY" \
    -H 'content-type: application/json' \
    -d "{\"property_id\":\"$PROP\",
         \"title\":\"RELEASE 0 STEP 1 CONTROLLED ACCEPTANCE - DO NOT DISPATCH\",
         \"description\":\"Controlled record created to run the Release 0 step 1 proof-presentation acceptance. Not a dispatchable repair. No resident is affected. Resolve only through a governed product path.\",
         \"idempotency_key\":\"$IDK\"}"
  echo
else
  echo "NOTHING WAS CREATED. Resolve the precheck result above before retrying."
fi
```

### 9.12.2a THE FIRST CUT OF THIS COMMAND REPORTED A FALSE REASON

Recorded because it is the same error class as the `#`-comment-as-a-guard, one
rung further in: **the guard held, and lied about why.**

The command was first run with `PROP` still set to `PASTE_PROPERTY_ID_HERE`.
That is not a UUID, so `where property_id = $1` threw and the route returned
**500**. The precheck printed `NOT_A_LIST`, and a two-way branch —
`if READY … else "a controlled record already exists"` — sent it down the else.

```text
observed    existing controlled records: NOT_A_LIST
            STOP - a controlled record already exists. NOTHING WAS CREATED.

true        the precheck never completed. Nothing is known about whether a
            record exists.
```

**Nothing was created, so the safety held.** But "a record already exists" is a
manufactured fact, and an operator who believed it would have stopped looking.
Failing closed is not enough — a guard must fail closed **and say the true
reason**, or the next person debugs the wrong thing.

The corrected block has **three** outcomes, not two:

```text
READY             0 matching records, HTTP 200, body is a list  → create
EXISTS n          n matching records                            → stop, and it
                                                                  is genuinely
                                                                  already there
PRECHECK_FAILED   any non-200, unparseable body, or non-list    → stop, and say
                                                                  exactly what
                                                                  came back
```

Exercised against all five outcomes before being handed over, including the
exact 500 that produced the false message.

### 9.12.3 Why every field is omitted

Verified against `workOrderService.createWorkOrder`. Required: `property_id`,
`title`, valid urgency. **An unobserved fact stays null rather than becoming a
tidy default.**

```text
is_emergency            omitted → urgency_status "regular", needs_pm_review false
unit_id                 omitted — no unit is affected
reported_by_person_id   omitted — no fabricated resident identity
affected_person_id      omitted — same
assigned_to             omitted — honest UNASSIGNED
est_cost                omitted — no invented number
cause / work_nature     omitted — closed vocabularies; a guess is a false fact
tenant_caused           OMITTED DELIBERATELY — see §9.12.5
```

### 9.12.4 Two independent duplicate protections

```text
1  idempotency_key   the SERVICE refuses a second create and returns the
                     existing row (work_order_service.js). Keyed on
                     (idempotency_key, property_id, reported_by_person_id);
                     with no reporter it matches on `is not distinct from null`.
2  the precheck      the OWNER sees it before acting
```

**Why both:** `POST /work-orders` drops `deduped` from its response — unlike
`POST /operator/work-orders`, which surfaces it. So on a re-run the response
would look identical to a fresh creation. **The precheck is what makes the
second run legible**, and the idempotency key is what makes it safe.

### 9.12.5 What to record afterwards — and what each fact rests on

```text
work_order_id      response .work_order.id
property_id        response .work_order.property_id
created_at         response .work_order.created_at
creation receipt   response .event.id   — the immutable work_order_opened event
```

**Requesting actor — an honest gap, recorded rather than invented.**
`POST /work-orders` sits behind the shared operator key and carries **no
authenticated user**. The response cannot name a person, and none may be
written into the receipt. Record it as *"operator key, human operator at the
Render shell, unattributed by the route."* (`POST /operator/work-orders` does
carry `acted_on.actor` from the session — noted for §21, not substituted here,
because the shell has no staff session.)

**No billback obligation was created — proven from the source, not from a UI.**
`spawnBillbackDecision` runs only on `tenant_caused === true` (strict identity,
`work_order_service.js`). The request omits the field, so it destructures to
`null`, and the spawn is in the same transaction — there is no later path.
**This is deliberately not evidenced by an empty obligations screen:** the
billback obligation has no operator surface listing it (migration 099, note 4),
so an absence there would prove nothing. Absence is not agreement.

**No resident communication was produced — same discipline.** `createWorkOrder`
writes `work_orders`, `events` and one routing obligation. It writes no
`work_order_progress` row, and `resident_update` is derived from `comm_events`
joined to a progress row — so it is necessarily empty. `GET
/operator/work-orders/:id/status` returning `resident_update: []` **corroborates**
this; it is not the proof.

## 9.13 CREATION RECEIPT — the controlled work order EXISTS

**Created 2026-08-06T18:15:23.427Z. `precheck: READY` — 0 matching records
before the write, so this is a first creation and not a dedupe replay.**

```text
work_order_id      f9fd039d-6e91-46af-a5d5-57b671024a27
work_order_ref     1006
property_id        a50fbdd0-3642-431e-b532-0dcd6ab8a4fe   Solo on Chestnut
created_at         2026-08-06T18:15:23.427Z
idempotency_key    release0-step1-acceptance-v1
status             open
source             maintenance_module

creation receipt   event 8ce60ccc-3db2-47f0-8c93-457bfca09d3b
                   type work_order_opened — the immutable history entry
routing obligation 5505f4c6-a523-4995-afe0-57c92c74b864
                   maintenance_repair · open · required_inputs [closeout_proof]
                   assigned_role maintenance · assigned_user_id NULL
```

### 9.13.1 Every condition of the authorisation, checked against the response

```text
low-risk, non-emergency      is_emergency false · urgency_status regular
                             needs_pm_review false
no resident identity         reported_by_person_id NULL
                             affected_person_id    NULL
                             event.person_id       NULL
                             obligation.person_id  NULL
no personal data             description names no person and no unit
no unit affected             unit_id NULL
honest UNASSIGNED            assigned_to NULL · assigned_user_id NULL
no completion evidence       completion_photo NULL · completion_note NULL
no completion                status open · completed_at NULL
no vendor dispatch           vendor_id NULL
no invented number           est_cost NULL
no guessed vocabulary        field_category · cause · work_nature all NULL
clearly labelled             title "RELEASE 0 STEP 1 CONTROLLED ACCEPTANCE
                                    - DO NOT DISPATCH"
```

### 9.13.2 The two negative confirmations, and what each actually rests on

**No billback obligation.** `tenant_caused` is **NULL** on the created row.
`spawnBillbackDecision` runs only on `tenant_caused === true` (strict identity),
in the same transaction, with no later path. **The response could not have
proven this either way** — `POST /work-orders` returns only
`{work_order, event, obligation}` and drops `billbackObligation` regardless of
whether one was spawned. The proof is structural, from the source and from the
persisted NULL. It is not an inference from the response's silence.

**No resident communication.** `createWorkOrder` writes `work_orders`, `events`
and one routing obligation. It writes no `work_order_progress` row, and
`resident_update` is derived from `comm_events` joined to a progress row — so it
is necessarily empty. Corroborated at acceptance time by
`GET /operator/work-orders/:id/status` returning `resident_update: []`.

### 9.13.3 The requesting actor — the honest gap, as predicted

The response names no user, because `POST /work-orders` sits behind the shared
operator key and carries no session.

```text
requesting actor   operator key · human operator at the Render shell
                   UNATTRIBUTED BY THE ROUTE — not recoverable from the record
```

Recorded as unattributed rather than filled in with the account that happened to
be signed into the browser. That account authenticated a *different* request on
a *different* surface, and writing it here would manufacture an attribution the
database does not hold.

`POST /operator/work-orders` does carry `acted_on.actor` from the staff session.
**For any future controlled record created from a surface that has a session,
that is the route to use.** It was not usable here because the Render shell has
no staff session — which is exactly the §21 observation worth carrying forward.

### 9.13.4 Predicted and observed

```text
deduped not surfaced   PREDICTED §9.12.4 · CONFIRMED — the response carries no
                       deduped field, so the precheck was the only thing that
                       could distinguish a first write from a replay. It read
                       READY, so this was a first write.
```

---

### 9.12.6 What the operator will see

```text
status              open
lifecycle state     scheduled
proof               required true · satisfied false · not_preserved_count 0
detail current line "Nobody has taken this yet."
list state line     "No owner"
```

The normalizer runs against a **real production payload** — `detailHtml` calls
`proofOf()` unconditionally — so check 11 becomes a statement about proof
interpretation rather than about an empty door.

---

## 9.14 ACCEPTANCE RESULT — STEP 1 STOPPED at checks 9 and 10

Run 2026-08-06 against deployed `main` after PR #36, on controlled work order
`f9fd039d-6e91-46af-a5d5-57b671024a27` (ref `1006`).

```text
 1  asset identity matches candidate       PASS   both digests exact
 2  normalizer loads before the door       PASS
 3  sign in · Property Home                PASS
 4  Work Orders renders the record         PASS   "Common area · RELEASE 0 …"
 5  list proof presentation                PASS   "No owner", no proof clause —
                                                  correct: proof is not the
                                                  question until work is claimed
 6  detail proof presentation              PASS   the render that THREW before
 7  real proof object accepted             PASS   proofOf() ran, logged nothing
 8  no stale state across navigation       PASS   desk → list → detail → desk →
                                                  list landed on the LIST
 9  "Mark done — close" visibly present    FAIL   unreachable
10  "Not 100% done" visibly present        FAIL   unreachable
11  zero CONTRACT FAILURE messages         PASS   console empty throughout
```

**Not "9 of 11." Not 82%.** Checks 9 and 10 did not pass, so step 1 is not
accepted.

### 9.14.1 What failed, exactly

Both controls exist in `index.html` and are **byte-identical to base**. They are
not reachable from any surface an operator can navigate to.

```text
Maintenance desk → OPEN WORK ORDERS   →  the new work-lifecycle door
the new door's entire action set          Assign · Review · Coordinate entry ·
                                          Retry — NO completion verb
workOrderPanel(), which renders both      reached ONLY via renderDetail with
controls                                  kind='work_order'
those rows are built ONLY by              renderMaintenanceWorkOrdersDashboard
                                          renderMaintenanceWorkInProgress
                                          renderMaintenanceWorkDone
the ONLY two call sites into those        both inside
lanes                                     renderMaintenanceWorkOrdersDashboard
                                          (lines 12238, 12241)
and THAT function's only callers          its own re-render helpers, and
                                          refreshWorkOrders — which the closeout
                                          actions call AFTER acting
```

**The entry point is circular.** Every path into the legacy closeout requires
already being on the legacy closeout.

### 9.14.2 STEP 1 IS NOT THE CAUSE — proven three ways

```text
1  the four handlers          byte-identical to 6220ca5          §9.11
2  openMaintenanceModule      byte-identical to 6220ca5
3  the call-site inventory    identical to 6220ca5 — the same two keys,
                              work_inprogress and work_done, and no others
```

The whole `index.html` step 1 diff is one comment and one `<script>` tag. **This
condition predates step 1 and is independent of it.**

### 9.14.3 Why this matters more than the check

The thing checks 9 and 10 exist to protect is named in
`LEGACY_COMPLETION_CONTROL_REGRESSION.md` §2: *do not strand the operator
without a way to close work.*

**That has already happened, and it happened before step 1.** On both surfaces
traced — the new door and the legacy panel — there is no operator-reachable way
to complete a maintenance work order today. The technician SMS rail that was to
replace it has no transport (`RELEASE_0_SMS_PREREQUISITE.md`: no operations
line, `provider_config` null on the only line that exists).

**Step 5's sequencing protection was designed to prevent a future state that is
already the present one.** That is a finding for the owner, not a decision this
packet may make.

### 9.14.4 Rollback

```text
rollback required          NO
```

Rolling back to `6220ca5` would reintroduce the detail-render defect (§9.9) and
would **not** restore the controls, because their unreachability is identical in
that build. There is nothing to roll back to that is better.

### 9.14.5 One observation, not a check

The Maintenance desk WORK ORDERS tile reads **"Work-order status unavailable."**
while the door beside it renders one work order needing action. That is an
honest blank rather than a false zero — it says unavailable, not "0" — so it is
not a §5 violation. It is a separate failed read on the desk summary, outside
step 1's scope, and is recorded here only so it is not discovered twice.

---

## 9.15 OWNER RULING — the acceptance contract was invalid, not the behaviour

**Option 3, with a release-plan correction.** Governing plan revision 5,
`property-spine-api` `3b58f3f`.

The two visibility checks tried to hold step 1 responsible for preserving
functionality **that did not exist at its base**. That is an invalid acceptance
requirement. It is removed, not waived.

### 9.15.1 The two checks are replaced

```text
REMOVED   9   "Mark done — close" visibly present
REMOVED  10   "Not 100% done" visibly present

REPLACED BY
  9a  legacy completion handlers unchanged by step 1
  9b  legacy routing unchanged by step 1
  9c  no previously reachable completion surface was removed by step 1
  9d  the existing unreachability is explicitly recorded as a baseline
```

**Nothing new had to be run.** All four were already proven before the ruling:

| | Proof | Where |
|---|---|---|
| 9a | `attachStubPhoto` · `toggleNotDone` · `closeoutDone` · `closeoutNotDone` — per-function sha256 identical to `6220ca5` | §9.11 |
| 9b | `openMaintenanceModule` byte-identical to `6220ca5` | §9.14.2 |
| 9c | call-site inventory identical to `6220ca5` — the same two keys, `work_inprogress` and `work_done`, and no others; the whole `index.html` diff is one comment and one `<script>` tag | §9.11, §9.14.2 |
| 9d | recorded as a production baseline fact | §9.14, plan §1.1 |

### 9.15.2 Why the control is not being restored

Reconnecting it would deliberately re-enable a known-invalid writer:

```text
writes status = closed
does NOT write the canonical completion event
accepts fabricated stub:// evidence
disagrees with the canonical reader
```

A defective completion rail is not reintroduced to make an earlier sequencing
assumption appear true. Plan §1.1.1.

### 9.15.3 What is explicitly NOT ruled

Operator completion authority is **not** declared permanently abolished. This is
a Release 0 containment decision. A governed operator or manager acceptance
surface may later be right for vendor work, SMS outages, supervisory inspection
or higher-risk clearance. **Do not invent it inside Release 0.** Plan §1.1.2.

---

## 9.16 STEP 1 COMPLETE

```text
STEP 1 COMPLETE
```

**At deployed app `main` = `9fdddd2` (code-bearing `44379d5`).**

What step 1 owns, and what the production run established:

```text
reviewed asset served                      PASS  both digests exact
normalizer loaded before its consumer      PASS
a real work order rendered                 PASS
detail rendered                            PASS  the render that THREW before
real current-API proof object normalized   PASS  proofOf() ran, logged nothing
navigation retained no stale proof state   PASS
zero contract failures                     PASS  console empty throughout

legacy handlers unchanged                  PASS  §9.11
legacy routing unchanged                   PASS  §9.14.2
no reachable surface removed               PASS  §9.14.2
unreachability recorded as baseline        PASS  §9.14, plan §1.1

completed-state presentation harness       PASS  43/43, falsified at 26 failures
```

```text
rollback required          NO
work order 1006            PRESERVED, unaltered. Not cleanup. It may serve the
                           evidence-ingress preflight and the formal completion
                           proof, provided its state remains eligible.
```

**This is not a waived failure.** The behaviour step 1 owns passed on every
check. The two removed checks tested something step 1 never touched and never
could have preserved.

---

## 10. Gates

```text
1  architecture frozen at 4f25f73                    CLOSED
2  credential rotated                                CLOSED  (api b636350 §4)
3  old credential proven dead                        CLOSED  (api b636350 §4 fact 5)
4  SMS technician rail phone-verified                OPEN — release step 4,
                                                     gates step 5, not step 1
5  LEGACY COMPLETION-CONTROL REGRESSION             §3.1 non-production still
                                                     OPEN. §3.2 production
                                                     presence WITHDRAWN — the
                                                     controls were already
                                                     unreachable at base.
                                                     docs/LEGACY_COMPLETION_CONTROL_REGRESSION.md
                                                     Never folded back into
                                                     step 1 acceptance.
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
| `proof_presentation_contract.browser.js` | 1 — permanent | Never. It is what keeps the completed-state presentation branches provable without manufacturing production completions. |
| `docs/LEGACY_COMPLETION_CONTROL_REGRESSION.md` | 3 — temporary governance record | Closed when its §3.1 and §3.2 are discharged and step 5 has removed the done control. |
| The controlled acceptance work order | 1 — real operating data | Not deleted, not cleaned up. Disposition happens through a governed product path like any other work order. |
| `attachStubPhoto` / `"Mark done — close"` | **4 — retired** | Removed at step 5, after step 4 phone verification. **Untouched by this step.** |
