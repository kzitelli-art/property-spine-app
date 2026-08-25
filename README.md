# Seed Adapter — README

`seed_adapter.js` is a **standalone, tested** module that maps one per-deal seed
JSON (the May-2026 reconciled contract) into the row shape the operator app
already renders. No DOM, no app globals, no network — pure functions. It is
**not wired into the app yet** (per the "A" decision): it's proven against
`solo_4233_seed.json` and ready to drop in when the data layer is built.

---

## What it does

```js
const d = SpineSeedAdapter.loadSeed(seedJson);
```

`loadSeed(seed)` returns a normalized deal:

| field | what it is |
|---|---|
| `deal` | name, code, address, entity, asset_type, **space_kind** (`unit` or `bed`), space_count |
| `period` | month + as_of |
| `reconciliation` | the raw reconciliation block (status, targets, ties) — untouched, for tie-out |
| `financials` | the raw financials_may block (NOI, income, mortgage notes) |
| `headline` | occupancy %, occupied/vacant, NOI, **decomposed** AR (see below) |
| `spaces` | the occupancy spine — one mapped row per unit/bed |
| `future` | future_residents pipeline, **held separate** |
| `delinquents` | spaces that actually owe (`owed > 0`), sorted biggest-first |
| `anomalies` | spaces/future rows carrying `anomaly_flags` |
| `meta` | the seed `_meta` block |

Each row in `spaces` carries the fields the existing rent roll / tenant card
read: `unit_number`, `resident_name`, `tenant_id`, `unit_type`, `market_rent`,
`actual_rent`, `deposit`, `move_in`, `lease_exp`, `move_out`, `status`, plus the
decomposed money fields and `lease_detail` / `lease_history` / `anomaly_flags` /
`_raw` (the untouched source record).

---

## The load-bearing rule: money is decomposed, never combined

Every space carries **three separate money fields**. They are never summed into
one number:

- **`owed`** — what the resident actually owes (`ar_aging.total_unpaid`, positive). **This is what Delinquency keys off.**
- **`prepaid`** — credit / available prepay (`ar_aging.prepays`, negative).
- **`rent_roll_balance`** — the rent-roll net balance line (separate field).

`owes_money` is `owed > 0.005`; `has_credit` is `prepaid < -0.005`.

**Why this matters:** in the seed, a prepaid resident has a *negative* balance.
If you drive collections off `balance` you net real debt against prepays and
hide who owes. In Solo, only **29 of 119** aged units actually owe. The headline
`total_owed` is gross unpaid; `total_prepaid` is gross credit; they stay apart.

`headline.ar_balance_reported` holds the report's net AR line **for tie-out
only** — see the data note below.

---

## Honest blanks (verified)

- A space with **no `ar_aging`** → `aging: null` → render a clean blank, not zero, not an error.
- A vacant/down/model space → `occupancy` is null → `market_rent`, `actual_rent`, `deposit` are `null`; `resident_name` is `""`.
- Any absent field → blank. The adapter codes to the full contract.

---

## by-unit AND by-bed

- **by-unit** deals (Solo, UNO) use `seed.units` → `space_kind: 'unit'`.
- **by-bed** deals (Temple Nest, Skyline, Greenery, 1850) use `seed.rooms` → `space_kind: 'bed'`.
- The room branch reads `bed`/`room`/`space` as the identity and preserves
  `parent_space_label` for F/R rooms that share a parent. (This file is
  by-unit; the room branch is written to the spec, ready for those files.)

---

## Verified against `solo_4233_seed.json`

Mapped headline ties to `reconciliation.targets` to the penny:

```
occupancy_pct  87.58   ✓      occupied  247   ✓      vacant  30   ✓
total_spaces   282     ✓      actual_rent  413758.83 ✓   noi  301660.78 ✓
```

Money decomposition is internally exact: for all 119 aged units,
`balance == total_unpaid + prepays` (0 mismatches).

### One data note (not an adapter bug — surfaced, not cleaned)
The sum of per-unit `ar_aging.balance` (−$143,571.15) does **not** tie to the
report's stated `ar_balance_current` (−$136,066.48) — a ~$7,505 gap, even though
the reconciliation block marks `ties.ar_balance: true`. The adapter does **not**
force these to match. It reports gross `owed` as the collection signal and keeps
`ar_balance_reported` separate. Flag for the data/reporting thread; this is
exactly what "honest blank beats confident wrong" is for.

---

## How to wire it later (not done yet)

1. Load the JSON for the active deal (bundled at build, or fetched at runtime —
   that's the data-layer decision for the repo/backend thread).
2. `const d = SpineSeedAdapter.loadSeed(json);`
3. Feed `d.spaces` / `d.future` into the rent roll in place of the current inline
   seed rows; feed `d.headline` into the three-door Management counts.
4. The existing `managementRentRollRows` / tenant card read these field names, so
   the surfaces light up without rewriting them.

Include the script with a normal tag (it sets `window.SpineSeedAdapter`):
```html
<script src="seed_adapter.js"></script>
```

---

## Test it yourself

```bash
node -e '
  const A = require("./seed_adapter.js");
  const seed = require("./solo_4233_seed.json");
  const d = A.loadSeed(seed);
  console.log(d.deal, d.headline);
  console.log("delinquents:", d.delinquents.length, "future:", d.future.length);
'
```

## Files
- `seed_adapter.js` — the module (browser global + CommonJS).
- `SEED_ADAPTER_README.md` — this file.

---

## Ask Spine dashboard convergence — current browser proof

`ask_spine_dashboard_convergence.test.js` pins the app-side contract: one
canonical POST, one question-only body, no browser property/module authority,
no operator key, no client intent engine, generic server provenance, safe
server references, transcript retention, and scope-change clearing.

`ask_spine_dashboard_convergence.browser.js` opens the real `index.html` and
the real sealed live loader at desktop and phone widths. It intercepts only the
API transport so the proof can replay exact canonical response envelopes and
inspect the request on the wire. It verifies all supported outcomes, the four
silences, safe references, the quick-prompt path, later-failure retention,
session identity, absence of browser authority fields, overflow, and the
conversation/composer accessibility semantics.

```bash
NODE_PATH=/path/to/node_modules node ask_spine_dashboard_convergence.test.js
NODE_PATH=/path/to/node_modules node ask_spine_dashboard_convergence.browser.js
```

The browser proof writes rendered evidence to
`docs/ask-spine-dashboard-convergence/{desktop,phone}.png`.
Its current expected result is `BROWSER RUNG · 60 passed · 0 failed` across
the desktop and phone runs. The static contract proof currently reports
`30 passed · 0 failed`.

## Ask Spine Slice 1 — legacy attention browser proof

`ask_spine_browser_proof.browser.js` is the browser rung for Ask Spine Slice 1.

**It is deliberately NOT named `*.test.js`.** `run_harnesses.sh` globs
`(*.test.js)` and reads exit codes; this harness requires Playwright and
Chromium, which this repo does not depend on. Including it in that glob would
turn the suite red on any machine without them. Do not rename it, and do not
modify the runner to pick it up.

### Running it

```bash
# 1. Playwright is NOT a dependency of this repo. Install it anywhere:
mkdir -p /tmp/pw && cd /tmp/pw && npm install playwright

# 2. Chromium must be present. In the standard container it is pre-installed at
#    /opt/pw-browsers/chromium-<build>/chrome-linux/chrome — the harness points
#    at that path. Adjust `executablePath` in the harness if yours differs.
ls /opt/pw-browsers

# 3. Run it from the repo root. SP must point at the directory holding
#    node_modules/playwright from step 1.
cd /path/to/property-spine-app
SP=/tmp/pw node ask_spine_browser_proof.browser.js            # desktop, 1080x860
SP=/tmp/pw VP=phone node ask_spine_browser_proof.browser.js  # phone,   390x844
```

`SP` is required — the harness exits non-zero immediately if it is unset.
`VP=phone` switches the viewport; every assertion runs at both widths,
including a check that the composer does not overflow its container.

### Expected result

```text
27 assertions, B0–B16 (with sub-cases), all passing — at BOTH viewports
  BROWSER RUNG · 27 passed · 0 failed
exit 0
```

**Failure behaviour:** any failed assertion throws, prints `✗ <name>`, and the
process exits **non-zero**. A harness that cannot launch Chromium prints
`DIED: …` and also exits non-zero. There is no path on which this harness exits
0 without all 27 assertions having run — the counter is printed and the exit
code is derived from `fail === 0`.

### What it proves, and what it does not

Real Chromium, the real `index.html`, and the **real live loader** — which is
frozen (`hasSession` is non-writable), so it cannot be stubbed. The session is
seeded through `sessionStorage` exactly as the product rehydrates it, and the
API response is supplied by **network interception**.

**It does not prove** a real API or real Postgres behind that fetch. The
end-to-end rung — real browser against a real running API against real rows —
is still outstanding.

### Screenshots

Written to `$SP/ask_spine_<state>_<viewport>.png` — five states
(`0_idle`, `1_items`, `2_empty`, `3_failure`, `4_unsupported`, plus
`5_property_home`) at each of `_desktop` and `_phone`.
