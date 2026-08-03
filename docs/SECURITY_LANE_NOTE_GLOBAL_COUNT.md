# Security-lane note — the global count in the incident record

**Raised by the Slice 10 lane, 2026-08-03. Not actioned here, by design.**

`docs/INCIDENT_STATIC_DATA_EXPOSURE.md` is owned by the security lane. Slice 10
did not modify it and should not. This note exists so Slice 10 stops
propagating a number it inherited, without Slice 10 editing an incident record
that belongs to someone else.

---

## The discrepancy

`INCIDENT_STATIC_DATA_EXPOSURE.md` §3b, prose:

```
Both files define the same eighteen globals
```

**The document's own table immediately below enumerates nineteen**, across eight
rows — several rows list more than one name, which is the likely origin of the
undercount:

```
__PC_RESIDENT_RECORDS · __RENT_ROLL_LIBRARY · __CONVERSATIONS_LIB
__RENEWALS_LIBRARY · __RENEWAL_THREADS · __APPS_LIBRARY
__TOURS_LIBRARY · __TOUR_THREADS
__WO_LIBRARY · __REAL_WO_LIBRARY · __WO_FLOW_LIBRARY
__VENDOR_LIBRARY · __SUPPLY_LIBRARY · __COMPLIANCE_LIBRARY · __LEAD_ANALYTICS
__CAPITAL_DEMO · __RENT_TREND · __FOLLOWUPS_LIBRARY · __LEASING_OB_LIB
```

## Measured, not counted from the table

Both rails were measured on the tree at app
`claude/slice-10e-browser-acceptance-t0zk33`:

```
policy.js               19 distinct globals assigned
property-spine-data.js  19 distinct globals assigned
```

Method — assignment, not mention, so a file that merely *reads* a global is not
counted:

```bash
grep -oE "__[A-Z_]+[[:space:]]*=" <file> | grep -oE "__[A-Z_]+" | sort -u | wc -l
```

**Prose says eighteen. The table says nineteen. Both rails are nineteen.**

## Why it matters enough to write down

In an incident record the count bounds the exposure. §3b is the section that
establishes the exposure is *"far wider than work orders"* — the number is the
argument. An undercount of one is small; an undercount stated as measured, in a
document that will be read by whoever decides on notification, is the kind of
error that should not be discovered later by someone re-counting.

It changes no conclusion in the record: the same nineteen globals were exposed
either way, and every category §3b lists is still present.

## What the security lane should do

Correct §3b's prose from **eighteen** to **nineteen**. Nothing else in the
incident record depends on it, and no other section repeats the figure.

## What Slice 10 already did

- Corrected its own comments in `slice10e_publish_dir.js` and
  `slice10e_browser_stack_serve.js`, and in
  `property-spine-api/docs/SLICE_10_RECEIPT.md`. Slice 10 had inherited
  "eighteen" from the prose while its actual stub list was, and always was,
  the correct nineteen.
- Replaced the quoted number with a **measurement**: `slice10e_publish_dir.js`
  now reads both rails, extracts the globals they assign, and **refuses to
  build** if its stub list and the rails disagree in either direction. A stub
  that declared fewer globals than the rail it replaces would leave a
  ReferenceError waiting in whichever surface reads the missing one — and the
  publish directory would still have built, and the browser acceptance would
  still have passed, because nothing in the Future Rent Roll path touches
  them.

That is the durable fix. The count is no longer a sentence anyone has to keep
in sync.
