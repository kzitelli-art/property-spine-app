# Cloudflare Pages migration — runbook

> Status: **prep complete, migration not started.** This document is the
> procedure; nothing in production has moved yet. Work the steps in order and
> check each box when OBSERVED, not when hoped for.

## What this app is

Committed static files, no build step, no framework. The repo root IS the
deployable directory. The backend API stays on Render
(`https://property-spine-api.onrender.com`) — this migration moves the
FRONTEND host only, so no `apiBase` change is needed (the API origin is
hardcoded as a default in `index.html` and overridable via
`localStorage.ps_api_base` for QA).

## What this repo already carries for the migration

| File | Purpose |
|---|---|
| `wrangler.toml` | Pages project config (`property-spine-app`, publish dir `.`) |
| `.assetsignore` | Keeps proofs, docs, `.env`, screenshots out of the deployed bundle |
| `_headers` | `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`; short must-revalidate cache for JS/HTML (no content hashes exist) |
| `package.json` | `wrangler` devDependency + `npm run preview` / `npm run deploy` |

**Deliberate omissions** — a Content-Security-Policy and `Cross-Origin-Opener-Policy`
are NOT set. The app loads CDN scripts (jsdelivr, Plaid Link) and contains
inline scripts; a wrong CSP silently breaks the operator surface, and COOP can
break Plaid Link popups. Both need an inventory pass first. Adding a weak CSP
to look secure is exactly the "confident wrong" this repo forbids.

## The one real constraint

The API's `/operator/*` CORS policy is **fail-closed**: it allows exactly the
origin configured in the API's `OPERATOR_APP_ORIGIN` env var and nothing else.
A new frontend origin will therefore sign in and then get CORS-refused on
every operator route until the API env var is updated. This is by design —
the migration ORDER below exists because of it.

## Steps

1. **Preflight (local)**
   - `npm install`
   - `npm run preview` → `http://localhost:8788` — sign in, verify the operator
     surface loads. (Preview serves the same files; CORS allows localhost
     only if the API was configured for it — if refused, verify against the
     deployed preview in step 3 instead.)
2. **Create the Pages project and first deploy**
   - `npx wrangler login`
   - `npx wrangler pages deploy . --commit-dirty=true`
   - Note the `*.pages.dev` URL this produces.
3. **API env update, BEFORE anyone uses the new origin**
   - Set `OPERATOR_APP_ORIGIN=https://property-spine-app.pages.dev` in Render
     and redeploy the API (deploys are MANUAL — `deploy.sh` or dashboard).
4. **Verify on the new origin (browser, real)**
   - Sign in with SMS OTP, load the operator surface, read a board, run one
     Ask Spine question. The repo's `*.browser.js` proofs are the pattern;
     run at least one against the new origin.
   - Verify a REFUSED origin is still refused (open the new origin, confirm
     the API still serves the old one; then confirm the inverse). Fail-closed
     means the allowlist moved, not widened.
5. **Custom domain (if used)**
   - Add the domain in the Pages project, move DNS, then repeat step 3 with
     the final origin if it differs from `*.pages.dev`.
6. **Rollback (keep until step 4 is observed)**
   - The previous host stays live and untouched. Rollback = DNS back + restore
     the previous `OPERATOR_APP_ORIGIN` + API redeploy. Nothing destructive
     happens at any point before step 5.

## Verification checklist (tick only what was OBSERVED)

- [ ] `*.pages.dev` serves the app (build-info stamp visible in the UI)
- [ ] Sign-in works from the new origin
- [ ] Operator surface loads boards/desks (CORS verified live)
- [ ] One Ask Spine question answered from the new origin
- [ ] A NON-allowlisted origin is still refused by the API
- [ ] Rollback path stated and (if exercised) observed
