# Existing-property and retained-source access

September 12, 2026. App-only candidate on `codex/onboarding-deal-access-20260912`, based on app `4fd0af8f006fd2a926dd422604696e8312501686`. API source traced at `f4e59ebd79158da39905cdfe28bbfb48296e2ec1`; no API, schema, provider, property configuration or production changes.

## Intent and existing mechanism

Staff should attach the existing building when creating a deal and retrieve the original rent roll that established its position. The current API already owns both actions. `src/onboarding/deal_setup.js` exposes the client-scoped available-properties read, the existing-property attachment command and the authenticated retained-source download. `deal_service.addProperty` refuses another client's property and a property held by another current deal; repeat attachment to the same deal returns `already_member`. Historical closeout notes describing absent durable membership are superseded by this source.

The unmodified app was exercised in Chromium with a synthetic deal read. It rendered one new-property name input and zero existing-property buttons. This is a missing UI connection, not evidence that the API mechanism is absent. No new membership or source store was introduced.

## Change

`dsOpenDeal` now reads `/deal-setup/deals/:id/available-properties` and renders an explicit property choice using its recorded name and address. A staff choice posts only `property_id` to the existing `/properties` attachment route. Successful attachment and repeat receipts trigger canonical deal/list reads. Creation remains a separate, explicitly labelled form using the existing `/properties/new` command. Attaching a property does not switch the active staff session or grant staff access.

Empty eligible lists, HTTP 401, HTTP 403, failed reads and malformed responses remain distinct. The server's list is bounded to 200 and excludes properties already on a current deal; it is not a full portfolio census. Transient request/session checks discard old deal/list/attachment results after navigation or session changes and refuse old selection actions before a write. These checks protect UI custody; server scope checks remain authoritative.

The setup review offers Download original source only when the canonical activation names `source_artifact_id`. It fetches that existing route with the normal staff headers, never a URL token. The returned bytes must match the canonical retained byte size and SHA-256 before a browser download is requested. The original recorded filename is used, path/control characters sanitized, and the temporary blob URL revoked. Refusals remain visible; a late response after navigation creates no download.

The actual CSS review then found a pre-existing mobile defect on both baseline and the first candidate: at a 390px viewport the fixed sidebar left a 200px main area with 262px scrolling content and a clipped long deal heading. Root authorized a bounded responsive correction. Rules scoped to `#dealSetupPanel` at 700px and below put navigation above the full-width content and wrap headings/buttons. Tables retain their own horizontal scroll. Desktop and shared Super Admin rules are unchanged.

## Evidence

- `deal_setup_access.test.js`: **77 completed assertions, 0 failed**, reported by the shared `tests/assert_reporter` across 29 named scenarios. Uses `tests/browser_runtime` with its supported local Chrome/browser discovery and default network denial, the actual Deal Setup markup/CSS/functions, and synthetic HTTP adapters. Covers exact identity/body/header, distinct empty/refusal/failure, malformed/retry, repeat attachment, double click, late deal/list/attachment responses, old-session actions, retained new-record creation, actual downloaded bytes/filename, blob cleanup, same-size wrong-content and truncated-content refusal, missing artifact identity and late-download cancellation. Real-CSS assertions verify desktop width/layout, full-width mobile content, long-heading/button wrapping and independent table scrolling.
- Existing `canonical_onboarding_review_app.test.js`: **51/51**.
- Existing `canonical_onboarding_summary.test.js`: **4/4**.
- `git diff --check`: passed.

The new-record button was renamed, so three existing full-browser files received only matching selector/headline updates: `canonical_onboarding_review.browser.js`, `canonical_onboarding_first_red.browser.js` and `deal_setup_opening_tenancy.browser.js`. Their owned-DB/browser workflows were not rerun in this lane. The combined suite and runner registration belong to root QB after integration.

Run the focused component proof with the app's pinned Playwright installed, or set `E2E_API_ROOT` to an existing API checkout containing `node_modules/playwright`, then run `node deal_setup_access.test.js`. The shared runtime honors `CHROMIUM`/`CHROME`, detects installed Windows Chrome, or uses Playwright's browser. No database or private fixture inputs are required. Browser/context and downloaded temporary files are closed by the proof; no local server, cluster or provider session was opened.

Desktop/mobile screenshots were captured and inspected using the actual panel markup and app CSS, with explicit synthetic adapters and locally substituted font stylesheets. Workspace outputs outside Git are `handoffs/new-hp/deal-setup-access-20260912/desktop.png` and `mobile.png`; the corresponding `baseline-desktop.png` and `baseline-mobile.png` preserve the observed parent. The temporary harness is `tmp/deal-access-visual-20260912.js`. Successor dimensions are desktop main 1250px with 1250px scroll width, mobile main 390px with 390px scroll width. This is component rendering, not full signed-in runtime acceptance.

This is component/browser acceptance with synthetic transport. It does not establish fresh DB/HTTP behavior, deployed behavior or actual-property launch acceptance.
