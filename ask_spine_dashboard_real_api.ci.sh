#!/usr/bin/env bash
# Portable CI orchestration for the existing real browser proof. The browser
# oracle remains ask_spine_dashboard_real_api.browser.js; this wrapper owns only
# an isolated PostgreSQL cluster and the environment needed to run that oracle.
set -Eeuo pipefail

readonly PINNED_API_SHA="d2a8841c9653a2d0c271706d8f64aa3c28b3b09c"
readonly API_ROOT="${1:?usage: $0 API_ROOT API_SHA APP_SHA}"
readonly API_SHA="${2:?usage: $0 API_ROOT API_SHA APP_SHA}"
readonly APP_SHA="${3:?usage: $0 API_ROOT API_SHA APP_SHA}"
readonly TEMP_PARENT="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"

if [[ "$API_SHA" != "$PINNED_API_SHA" ]]; then
  printf 'refusing unpinned API SHA: %s\n' "$API_SHA" >&2
  exit 2
fi
if [[ ! -d "$API_ROOT/.git" ]]; then
  printf 'API checkout is missing: %s\n' "$API_ROOT" >&2
  exit 2
fi
if [[ "$(git -C "$API_ROOT" rev-parse HEAD)" != "$API_SHA" ]]; then
  printf 'API checkout is not the pinned SHA\n' >&2
  exit 2
fi

postgres_bindir=""
for candidate in /usr/lib/postgresql/*/bin; do
  if [[ -x "$candidate/initdb" && -x "$candidate/pg_ctl" && -x "$candidate/psql" ]]; then
    postgres_bindir="$candidate"
  fi
done
if [[ -z "$postgres_bindir" ]]; then
  printf 'PostgreSQL initdb, pg_ctl, and psql were not found\n' >&2
  exit 2
fi

free_port() {
  node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})'
}

cluster_root="$(mktemp -d "$TEMP_PARENT/property-spine-dashboard-ci.XXXXXXXX")"
data_root="$cluster_root/data"
postgres_log="$cluster_root/postgres.log"
cluster_started=0
proof_exit=1

cleanup() {
  local original_exit=$?
  set +e
  if [[ "$cluster_started" == 1 ]]; then
    "$postgres_bindir/pg_ctl" -D "$data_root" -w stop -m fast
  fi
  case "$cluster_root" in
    "$TEMP_PARENT"/property-spine-dashboard-ci.*) rm -rf -- "$cluster_root" ;;
    *) printf 'refusing cleanup outside owned CI path: %s\n' "$cluster_root" >&2; original_exit=1 ;;
  esac
  if [[ -e "$cluster_root" ]]; then
    printf 'DISPOSABLE_CLUSTER_RESIDUE=%s\n' "$cluster_root" >&2
    original_exit=1
  else
    printf 'DISPOSABLE_CLUSTER_RESIDUE=false\n'
  fi
  exit "$original_exit"
}
trap cleanup EXIT INT TERM

"$postgres_bindir/initdb" \
  -D "$data_root" \
  --username=postgres \
  --auth-local=trust \
  --auth-host=trust \
  --encoding=UTF8 \
  --no-locale

postgres_port="$(free_port)"
api_port="$(free_port)"
app_port="$(free_port)"
if [[ "$postgres_port" == "$api_port" || "$postgres_port" == "$app_port" || "$api_port" == "$app_port" ]]; then
  printf 'port allocator returned a duplicate port\n' >&2
  exit 2
fi

"$postgres_bindir/pg_ctl" \
  -D "$data_root" \
  -l "$postgres_log" \
  -o "-h 127.0.0.1 -p $postgres_port" \
  -w start
cluster_started=1

# Remove committed receipts from the runner copy so an early failure cannot
# upload evidence from an older manual run as if CI produced it.
rm -f -- \
  docs/ask-spine-dashboard-real-api-proof/last-run.json \
  docs/ask-spine-dashboard-real-api-proof/*-real-api.png \
  docs/ask-spine-dashboard-real-api-proof/failure-retains-prior-answer.png

export PSPINE_REAL_API_ROOT="$API_ROOT"
export PSPINE_REAL_API_SHA="$API_SHA"
export PSPINE_REAL_APP_PRODUCT_SHA="$APP_SHA"
export PSPINE_REAL_POSTGRES_ADMIN_URL="postgresql://postgres@127.0.0.1:$postgres_port/postgres"
export PSPINE_REAL_PSQL="$postgres_bindir/psql"
export PSPINE_REAL_API_BASE="http://127.0.0.1:$api_port"
export PSPINE_REAL_APP_PORT="$app_port"
export PSPINE_REAL_API_OPERATOR_KEY="ci-proof-only-key"

node ./ask_spine_dashboard_real_api.browser.js
proof_exit=$?
exit "$proof_exit"

