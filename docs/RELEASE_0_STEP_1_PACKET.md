# Release 0 — Step 1 release packet (app proof-shape compatibility)

**CANDIDATE. NOT DEPLOYED. No production result is claimed anywhere in this
document.**

Architecture frozen at `property-spine-api` `4f25f73`. This is deployment
step 1 of the sequence in that repo's `docs/RELEASE_0_IMPLEMENTATION_PLAN.md`
§5.1.

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
base            6220ca5907137aa9036adaee23e8fee78a88a3f0   app main, deployed
rollback        6220ca5907137aa9036adaee23e8fee78a88a3f0   identical to base
candidate       1a61417b3d65c3f61b43f0c60133de00ffc95c3a   branch
                claude/release-0-audit-plan-55r5kd

DEPLOY THIS SHA: 1a61417. It holds the normalizer, the corrected contract,
the 110 assertions and the rewired door. The commit you are reading is a
documentation-only one that follows it, because a commit cannot name its own
SHA — the same self-referential lag THREAD_HANDOFF.md documents. Verify with
`git diff 1a61417..HEAD`, which should show this file and nothing else.
```

**Rollback is a redeploy of `6220ca5`.** Step 1 is additive on the app side —
one new file, one script tag, and six call sites rerouted. No API contract
changes, so the previous app runs against the same API it always did.

---

## 3. Files

```text
NEW   proof-normalizer.js                    the one interpretation point
NEW   proof_normalizer_contract.test.js      110 assertions
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
read_status = "ok"
  REQUIRES  state present and one of the four
  REQUIRES  satisfied present and exactly matching the frozen mapping
            satisfied → true · not_satisfied → false
            legacy_indeterminate → null · missing_evaluation_defect → null

read_status = "unavailable"
  REQUIRES  state ABSENT
  REQUIRES  satisfied ABSENT

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
proof_normalizer_contract.test.js     110 passed · 0 failed
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

restored → 110 passed · 0 failed
```

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

## 9. Deployment receipt — TEMPLATE, fill from the real deploy

**Every field below is empty. Do not pre-fill any of them.**

```text
deployed at                 <UTC timestamp>
deployed by                 <who>
candidate SHA deployed      <SHA>
base SHA replaced           6220ca5907137aa9036adaee23e8fee78a88a3f0
Render deploy id            <id>
deploy completed            <yes/no — how confirmed>

acceptance, from §8
  1 sign in                        <pass/fail>
  2 Property Home opens            <pass/fail>
  3 Work Orders opens              <pass/fail>
  4 list renders proof             <pass/fail>
  5 detail renders                 <pass/fail>
  6 boolean-only proof correct     <pass/fail — which states observed>
  7 no stale content on navigation <pass/fail>
  8 "Mark done — close" present    <pass/fail>
  9 not-done path works            <pass/fail>
 10 zero contract failures logged  <pass/fail — paste any line>

API contract at time of test       boolean-only (unchanged)
rollback needed?                   <yes/no>
```

**A deploy proves only that the files are serving.** Facts 4–10 require the
browser. Do not record step 1 as complete on a green deploy alone.

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
