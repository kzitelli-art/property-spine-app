# LEGACY COMPLETION-CONTROL REGRESSION

**A named, owed acceptance item.** Created by owner ruling during Release 0
step 1 ("split the acceptance by responsibility"). It is **not** part of the
step 1 production acceptance and must not be folded back into it.

```text
status   OPEN
owed by  before step 5 removes the legacy completion control
blocks   step 5
```

---

## 1. Why this exists as its own item

Step 1 shipped one thing: the app now normalises both the current proof
response and the future four-state response. It did **not** change how a work
order is completed.

The original step 1 acceptance list nonetheless asked whether
`"Mark done — close"` and `"Not 100% done"` still *work*. Answering that in
production means invoking them, and invoking them means:

```text
"Mark done — close"   → PATCH /work-orders/:id/closeout
                        done: true
                        completion_photo: "stub://closeout-photo/<id>/<ms>"

"Not 100% done"       → PATCH /work-orders/:id/closeout
                        done: false
                        not_done_reason: <governed reason>
                        → a real follow-up obligation
```

The first fabricates the exact stub-evidence state Release 0 exists to remove.
The second records that someone attempted work nobody attempted, and hangs a
real obligation off it. **Both write false operating history to prove a button
renders.** The check is legitimate; the venue was not.

## 2. What this item actually protects

One thing, and it is worth protecting: **do not strand the operator without a
way to close work.** Step 5 deletes the done control. If the technician SMS
completion rail is not genuinely working when that happens, an operator has no
completion path at all.

That is a sequencing protection, not a proof-interpretation question — which
is why it does not belong to step 1.

## 3. Scope

### 3.1 Non-production — behavioural

Against the same asset identity that is deployed.

```text
done path      sends the historically expected request
                 PATCH /work-orders/:id/closeout
                 done: true, completion_photo present, completion_note present
               refuses when either is absent, with the operator-facing refusal
               409 surfaces the missing required_inputs, not a bare error

not-done path  sends the historically expected request
                 done: false, not_done_reason from the governed list
               refuses an unrecognised reason (400) with the plain sentence

receipts       success and failure receipts render correctly on both paths
```

### 3.2 Production — presence only, before step 5

```text
both controls remain VISIBLY present   (rendered output, not DOM presence)
NO production invocation is required, or permitted, solely for testing
```

**Presence is not visibility.** Confirm rendered output — the hidden-lanes
defect is already in this repo's history.

### 3.3 Explicitly out of scope

```text
invoking either control in production to see what happens
creating a work order in order to complete it
any stub:// evidence written to the production database
```

## 4. Release condition on step 5

```text
Step 5 may remove the done control ONLY AFTER the formal technician SMS
completion rail is phone-verified (gate 4).
```

Gate 4 is presently **OPEN**, and the SMS transport prerequisite is recorded in
`property-spine-api` `docs/RELEASE_0_SMS_PREREQUISITE.md` as **absent** — no
operations line exists and `provider_config` is null on the only line that does.
That is a separate Release 0 dependency. **It does not block step 1.**

## 5. What step 1 already discharged, so it is not re-litigated here

`proof_presentation_contract.browser.js` proves the `completed` and
`completion_claimed` **presentation** branches against controlled payload
fixtures, in real Chromium, against the real deployed files. That covers the
part of the former check 6 that is deterministic rendering logic.

It does **not** cover anything in §3 above. The two are different subjects and
neither substitutes for the other.

## 6. Classification (§18)

| Component | Class | Removal condition |
|---|---|---|
| This item | 3 — temporary governance record | Closed when §3.1 and §3.2 are both discharged and step 5 has removed the done control. The record itself is then history, not an open obligation. |
