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
