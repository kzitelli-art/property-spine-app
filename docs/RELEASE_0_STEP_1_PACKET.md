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

## 9. Deployment receipt — TEMPLATE, fill from the real deploy

**Every field is empty. Do not pre-fill any of them.**

```text
deployed timestamp              <UTC>
deployed by                     <who>
Render deploy ID                <id>
resolved deployed SHA           <the commit Render actually built>
code-bearing SHA                b79f1921ee7dd659656d86df39405df119a39f49
base SHA replaced               6220ca5907137aa9036adaee23e8fee78a88a3f0
governing API plan              046895a3ea8f15a2149907c9dd16da4897d00bdf

ASSET BINDING (§7.2)
  served index verification     <normalizer line N < door line M — give both>
  served normalizer SHA-256     <digest>
  matches expected 1e44c1f9…    <yes/no — NO means STOP>
  four strict markers present   <yes/no>
  script-order result           <pass/fail>

BROWSER ACCEPTANCE (§8) — all ten
   1 sign in                            <pass/fail>
   2 Property Home opens                <pass/fail>
   3 Work Orders opens                  <pass/fail>
   4 list VISIBLY renders proof         <pass/fail>
   5 detail VISIBLY renders             <pass/fail>
   6 boolean-only renders correctly     <pass/fail>
       satisfied=true not unavailable   <pass/fail>
       satisfied=false → proof required <pass/fail>
       explicit count 0 still valid     <pass/fail>
   7 no stale content on navigation     <pass/fail>
   8 "Mark done — close" present+works  <pass/fail>
   9 "Not 100% done" present+works      <pass/fail>
  10 console CONTRACT FAILURE count     <MUST be 0 — paste any line>

old API contract confirmed      boolean-only, unchanged   <yes/no>
rollback required               <yes/no>
```

**A deploy proves only that files are serving.** §7.2 proves *which* files.
Only the browser proves the operator sees the right thing.

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
