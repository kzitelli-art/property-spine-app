# Leasing knowledge editor — local candidate

2026-09-09. Branch `codex/temple-leasing-knowledge-ui`, base `f2eda58`, paired with API `codex/temple-leasing-knowledge`, base `48a85ab`. See the API's `docs/LEASING_KNOWLEDGE_RECEIPT.md` for the shared contract and full limitations.

Gear → Leasing knowledge opens the existing agent-facts API through the sealed live loader. Staff with leasing access can record approved topic wording, supporting public links, source type and optional expiry, replace it while preserving history, or retire it. The editor clears on sign-out/property change. Ask Spine renders validated HTTPS references with safe new-tab links. There is no fixture fallback.

`leasing_knowledge.browser.js` passed against the actual local app and full owned API server: save, Ask response/link, mobile dialog and sign-out. API origin alone is transformed for the local browser; external requests are blocked. `team_access_live_boundary.test.js`, `live_first_safety_proof.test.js` and `inline_js_syntax.test.js` also passed (45 inline blocks). Screenshots were inspected.

This is a locally verified implementation, not a production receipt. The dialog's topic shelves are property-wide text and links, not structured layout assets or document uploads. Real Skyline/Greenery source content has not been published. The private document/financial readers keep their existing access paths. API and app must be reviewed as a pair before release.
