#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  slice10e_run_browser_acceptance.sh — bring the stack up and run the
#  Slice 10E browser acceptance. CLASS 3 (test infrastructure).
#
#  Slice 9's browser acceptance was run from an equivalent stack that was
#  never committed, so this thread rebuilt it from a recipe in a handoff.
#  This exists so the next run is a command.
#
#  PREREQUISITES, all disposable and all synthetic:
#    · a local Postgres with the API's migrations applied
#    · HARNESS_DATABASE_URL pointing at it, DIFFERENT from DATABASE_URL
#    · CURSOR_SECRET exported (any value) — without it the transport proofs
#      report one honest failure each, which is the harness policing its own
#      claim, not a regression
#    · API_DIR   the property-spine-api checkout
#    · SP        a scratch dir holding node_modules/playwright
#    · the 10D scale fixture built:
#         node "$API_DIR/tests/slice10d_build_fixture.js"
#    · the 10E stack seeded:
#         node slice10e_browser_stack_setup.js
#
#  Read the exit code by REDIRECT, never through a pipe: a pipeline reports
#  the LAST command's status, which is how a red run gets read as green.
# ════════════════════════════════════════════════════════════════════
set -u
: "${API_DIR:?set API_DIR to the property-spine-api checkout}"
: "${SP:?set SP to a scratch dir containing node_modules/playwright}"
: "${HARNESS_DATABASE_URL:?set HARNESS_DATABASE_URL to a DISPOSABLE database}"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export APP_DIR
export PUBLISH_DIR="${PUBLISH_DIR:-$SP/publish}"
export API_ORIGIN="${API_ORIGIN:-http://127.0.0.1:3000}"

#  The publish directory is an ALLOWLIST and refuses to build if a copied
#  file declares a production data global. See slice10e_publish_dir.js.
node "$APP_DIR/slice10e_publish_dir.js" || exit 2

if ! curl -s --noproxy '*' -o /dev/null "$API_ORIGIN/health"; then
  echo "starting the API against the harness database…"
  DATABASE_URL="$HARNESS_DATABASE_URL" \
  OPERATOR_APP_ORIGIN="http://127.0.0.1:8081" PORT=3000 \
  CURSOR_SECRET="${CURSOR_SECRET:-}" \
    nohup node "$API_DIR/server.js" > "$SP/api.log" 2>&1 &
  sleep 6
fi

#  The outage assertion kills the TLS front on purpose, so it is always
#  restarted rather than reused.
pkill -f slice10e_browser_stack_serve.js 2>/dev/null
sleep 1
nohup node "$APP_DIR/slice10e_browser_stack_serve.js" > "$SP/stack.log" 2>&1 &
sleep 2

cd "$APP_DIR"
node slice10e_future_rent_roll_browser_proof.browser.js > "$SP/acceptance.out" 2>&1
code=$?
cat "$SP/acceptance.out"
echo "EXIT $code"
exit $code
