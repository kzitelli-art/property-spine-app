# Slice 10E — Future Rent Roll renderer. State on this branch.

> **SUPERSEDED IN PART, 2026-08-03.** Browser acceptance has since been run and
> is green — **95 assertions passed, 0 failed** — on branch
> `claude/slice-10e-browser-acceptance-t0zk33`. The "browser acceptance not
> started" statement below is no longer current. That run found six real
> renderer defects, two of which made pagination inoperative, and every one of
> them was fixed by restoring a fact the server already carried.
>
> Receipt: `property-spine-api/docs/SLICE_10_RECEIPT.md` ·
> artifacts: `docs/slice10e-browser/` ·
> harness: `slice10e_future_rent_roll_browser_proof.browser.js` ·
> stack: `slice10e_run_browser_acceptance.sh`.

**Written 2026-08-03 at `a365381`.** App `main` @ `357fb15`.

**The full Slice 10 handoff lives in the API repository** at
`property-spine-api/docs/SLICE_10_HANDOFF.md`. Read it first — it carries the
frozen server contracts this renderer consumes, the proof state of 10B/10C/10D,
and the traps. This file records only what is specific to *this* repository.

---

## Where 10E stands

**Renderer complete and green. Browser acceptance not started.** Per PHILOSOPHY
§33, an operator workflow is not done until it is browser verified, so 10E is
open. Do not describe it as done, live or deployed.

```
bash run_harnesses.sh
→ 18 harnesses · 779 passed · 0 failed · 0 red      (re-run 2026-08-03)
```

That is harness level, not browser level.

---

## What this branch actually contains

`claude/slice-10e-future-rent-roll-renderer` was cut from
`security/incident-receipt-static-exposure`, so it carries **two** things:

```
index.html                              the renderer
docs/INCIDENT_STATIC_DATA_EXPOSURE.md   the security incident receipt
```

It is not a single-purpose branch. If 10E is ever PR'd on its own, rebase onto
`main` first — the receipt is already reachable on its own branch and does not
need to travel twice.

---

## The renderer, in one paragraph

`psLiveFutureRentRoll()` consumes `summary` / `coverage` / `positions` / `page`
from `forward_rent_roll_rows_v1`. `_psFrrAnchor` holds **the server's `as_of`**
and `psFrrHorizons()` computes every offset from it — the browser's clock is
never an input, and no business rule is evaluated here. `psFrrWithheld()` renders
withholding as withholding rather than as zero. The operator wordings
(`positions contractually locked`, `successor pending but not contractually
locked`, `covered but unproven`, `open or uncovered`, `with overlapping lease
claims`, `verified in Spine`, `Contractual facts only.`) read from `d.totals`,
which is whole-property, not page-scoped.

Five facts lost in the contract migration were restored **from the new
contract**. They were not recovered by deleting or weakening the assertions that
caught them, and they must not be in future.

---

## The browser proof still to run

Known-good stack, from Slice 9:

```
Chromium   /opt/pw-browsers/chromium-1194/chrome-linux/chrome
flags      --host-resolver-rules=MAP property-spine-api.onrender.com 127.0.0.1:443
           --ignore-certificate-errors --no-proxy-server
TLS front  :443
app        :8081
API        start with OPERATOR_APP_ORIGIN=http://127.0.0.1:8081
           — operator CORS is fail-closed and will otherwise deny silently
```

Seeded **synthetic** disposable Postgres. **No production resident data in any
screenshot or test artifact.** Assert: desktop and 390px; no horizontal dead end;
no clipped primary action; no console error; no hidden failed request; ten
contract states; seventeen position states; pagination (default bounded, next
page loads, no duplication, summary unchanged across pages, a late-page blocker
suppressing page one's rate, a malformed cursor failing visibly); the browser
never downloads all 10,000 rows; and at 390px the hierarchy holds — space →
target position → rent or withheld → conflict or blocker → the exact existing
action.

---

## The reactivation blocker (10F, not 10E)

The Future Rent Roll renderer itself is clean: live server contracts, nothing
else. But `index.html` still loads two real-data libraries globally for *other*
surfaces:

```
index.html:4501   <script src="property-spine-data.js"></script>
index.html:4503   <script src="policy.js"></script>
```

Until those are resolved, reactivating the app republishes loaded real-data
libraries. **This blocks 10F reactivation. It is not a 10E defect and 10E should
not be held for it.**

Still outstanding and requiring a human, not this lane: verify the Render
suspension in a private window, set **both** repositories private, check for
forks, and execute the prepared git-history remediation.
