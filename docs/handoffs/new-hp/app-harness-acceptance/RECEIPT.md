# App harness acceptance — September 12, 2026

The sanctioned runner completed with **65 harnesses, 2,156 passed assertions,
zero failed assertions, zero red harnesses, exit 0**. This candidate changes only
tests, test helpers, reporting, and the runner's LF checkout rule. No app product
source is changed by the test candidate.

## Exact source and custody

- Original live baseline: `993d40886959793bd8044c00913e5169558102b9`.
- Application product under review: `e5c6d8b`, followed by external-email product
  `5b14fe628a5c0ad24d862d3519ecf79c36c78b8a`.
- That external-email commit was cherry-picked into the isolated acceptance
  branch as `54416782a042b2d80ecd4e216c1e7dd2dfb222ae` solely to exercise the same
  final product. **Integrate only the subsequent test candidate commit** when
  the product commits are already integrated.
- All browser work used actual installed Chrome, with synthetic component
  adapters. `E2E_API_ROOT` locates the existing Playwright dependency; it does
  not select or call an API runtime.
- No production read/write, database, customer message, provider call,
  deployment, or push was performed in this lane.

## First reports and comparison

| Run | Harnesses | Passed | Failed | Red | Unreadable | Exit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original copied live 993 runner | 62 | 1696 | 6 | 21 | 17 | 1 |
| Original e5 runner | 62 | 1699 | 7 | 21 | 16 | 1 |
| First repaired e5 run | 63 | 1958 | 0 | 3 | 1 | 1 |
| Final e5 + external-email product | 65 | 2156 | 0 | 0 | 0 | 0 |

The two original reports are incomplete counts: unreadable harness output was
red, including tests that completed without printing a summary. The copied
baseline lacked dependencies; its browser import failures are not product
defects. A fresh archive of exact 993 was therefore rerun with the same Chrome
and Playwright resolver. Only the dependency import in its two historical DOM
tests was changed; their assertions and all product files were unchanged.

Those controls confirmed:

- Ask convergence (48/2), move-out entry (12/1), post-tour capture (16/2),
  shared frame (45/1), and the obsolete legacy initial-refusal guard already
  failed at 993. These were stale test scope or superseded behavior assumptions.
- The original exact-target test passed 30/0 at 993. Its e5 failure was a literal
  command string that did not allow the newly governed `delivery_method` field.
- Both historical terms DOM tests completed at 993 after dependency resolution,
  but printed no parseable assertion count. The old offer DOM extraction also
  stops matching at e5 because it assumes an obsolete `chooseUnit()` suffix.
- No product regression was reproduced in these bounded controls. This does not
  declare untested application behavior regression-free.

The first repaired run's three remaining reds were browser setup errors:
`addStyleTag` rejected remote font imports under the new network block. Optional
font stylesheets now receive an empty local test response, preserving actual
inline app CSS and installed font fallbacks. Every other unmocked browser
request is aborted before network. Explicit page routes provide the synthetic
component document where needed.

## What changed in acceptance

- `tests/assert_reporter.js` counts completed strict-assert calls, including
  settled asynchronous assertions. A caught failed assertion remains failed;
  zero completed or unfinished assertions refuse a usable report. Unexpected
  child exceptions still make the runner red independently of reported counts.
- The runner preserves child nonzero exits, refuses zero and impossible counts,
  accepts fractions only as complete registered summary lines, and prints all
  failed child output. It never assumes a count from a successful process.
- `harness_reporting.test.js` executes 29 controls against nonce-created trees:
  actual loop counts, async settlement, unfinished work, caught failure,
  nonzero child, no summary, zero summary, incidental URLs/dates, impossible
  fractions, supported syntax, and failure output retention.
- The actual shared offer component now proves date-first targeting, explicit
  concessions/no-fees choices, known zero terms, and one immutable offer across
  a failed send and retry (19 measured assertions).
- Composite command checks execute the actual Follow Ups controller and inspect
  the exact payload. SMS preparation alone is refused as delivery; explicit
  manual preparation retains `sent:false`. Opening review sends nothing.
- The actual legacy detail renderer proves missing identity/home context and
  an existing packet hide the proposal, while bound submitted/approved/lease-ready
  applications retain the governed initial-terms door (12 assertions).
- Ask tests execute the actual reference renderer: safe HTTPS links survive,
  dangerous schemes and user-info URLs are refused, labels are escaped, and
  record openers remain opaque. Screen-read checks exclude only the intervening
  knowledge editor, retaining both Ask renderers and Ask event handlers.
- The resident overview is executed to prove the transition remains in its
  layout. Shared frame checks target actual `.wrap` declarations rather than
  unrelated later rules.
- `manual_application_review.test.js` and `external_email_reply.test.js`
  explicitly enroll their existing component proofs in the sanctioned glob.
  Their measured counts are **84** and **86**, respectively; the scenario
  totals (16 and 10) are not substituted for assertion counts.

Six deliberate source mutations in separate nonce-created copies were each
refused with exit 1: wrong-bed command payload, allowing an unsafe link scheme,
unescaped link label, revision after a packet exists, a frame padding shorthand,
and removal of the resident transition. The mutation copies and reporting
fixtures were removed only after checking custody of their resolved paths.

## Reproduction and evidence

Put Node and GNU Bash utilities on PATH. Supply `E2E_API_ROOT` if Playwright is
installed with the API sibling rather than this app. `CHROMIUM` or `CHROME` may
name the browser; otherwise the helper uses standard installed Windows Chrome
or Playwright's installed Chromium on other platforms. Run:

```sh
./run_harnesses.sh > app-harnesses.log 2>&1
```

Inspect the runner's exit code directly; do not pipe the invocation through a
summary command. On this HP, bundled Git exposes GNU Bash as `sh.exe`; the run
used `sh ./run_harnesses.sh` with Node and Git utilities on PATH.

Portable evidence in this directory contains the final complete runner output,
the unchanged baseline control outputs, and the refused mutation outputs.
Original full reports remain preserved in workspace `tmp/day-one-app-harnesses.log`
and `tmp/day-one-app-baseline-harnesses.log`; the repaired font first-red remains
in `tmp/app-harness-acceptance-successor.log`.

**Ceiling:** source/VM/component-browser acceptance. This is not a browser-to-real-
HTTP rehearsal, deployed acceptance, live property configuration, or a production
leasing claim. Those are separate QB receipts. All browser instances in these
tests close in `finally` blocks; no owned database was used.
