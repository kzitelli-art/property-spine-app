# Reusable Leasing setup overview — September 12

This app-only candidate composes the existing session-property `leasingKnowledge`, `tourSlots` and `leaseConfiguration` live readers. Settings and Leasing both open the same review dialog. It stores no readiness, task, completion percentage or business fact, and performs no writes. Property answers, Tour times and lease documents retain their existing editors. A return button reloads all three reads after visiting a door.

Knowledge coverage is current wording, not completeness. Tours show the returned window and bounded list, timezone and recorded policy, not global availability. Lease readiness means only the existing document/signer configuration verdict. Team and Deal Setup retain their own authority; Deal Setup has its own property selection, explicitly stated. Policies and website connections remain unassessed with administrator guidance: this slice does not invent missing app controls or imply their setup is complete. Pricing is outside the three-reader slice.

The overview renders successful absence separately from 401/403 and unavailable/malformed reads. Existing session-clear and property-selection fences remove both overview and return button; generation/scope checks discard stale responses. Reopening and returning fetch uncached live reads. Existing writers enforce permissions; the overview grants none.

## Evidence

Before product edits, `leasing_setup.test.js` failed with `Leasing setup must be reachable in the app` against the unchanged app. Successor Chromium component proof covers recorded/missing/expired answers, empty and configured domains, permission failure, malformed response, mobile width, editor-return refresh and a pending old-property read. It uses explicit read stubs and an editor callback, not real HTTP or a real editor save. Nineteen counted assertions pass, plus successful waits for the expected states. Independent browser challenge found that the real missing-timezone 422 was incorrectly shown as an outage. The successor recognizes only the canonical `property_operating_timezone_not_configured` code, shows its public configuration reason as text and offers no futile retry; the actual error shape is now covered. Existing `tour_times_app.test.js`: 21 passed, zero failed.

Reproduce with Node 24 and installed Playwright:

```powershell
$env:E2E_API_ROOT = '<absolute API checkout with node_modules/playwright>'
node leasing_setup.test.js
node tour_times_app.test.js
```

Navigation waits for asynchronous destination rendering and shows a contained error if the existing door rejects. The proof also checks both configured lease verdicts, 401, 403, 503, malformed data, the canonical timezone 422, delayed destination and navigation failure. Slot windows must be parseable before they are displayed.

The shared `tests/browser_runtime` denies provider network and `tests/assert_reporter` counts actual completed assertions. The new `*.test.js` is discovered by the existing `run_harnesses.sh`; it reports actual counted assertions in its supported format. No full-suite, real-HTTP, deployed or actual-property acceptance is claimed here. No database, provider, production or source-workbook action occurred.
