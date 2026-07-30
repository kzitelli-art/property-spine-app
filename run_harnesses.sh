#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  run_harnesses.sh — the only sanctioned way to report suite state.
#
#    ./run_harnesses.sh              # this repo
#    ./run_harnesses.sh <dir>        # a copied tree (falsification)
#
#  WHY THIS EXISTS. A hand-rolled summary line printed a hardcoded
#  "0 failed" while two harnesses were red, and that run was reported as
#  green and pushed. The defect was not in any assertion — it was in the
#  reporting. So the reporting is now a program, with rules:
#
#    1. Every harness's EXIT CODE is read. A harness is red on a nonzero
#       exit even if it printed nothing.
#    2. Counts are the harness's OWN numbers. Nothing is ever assumed.
#    3. UNPARSEABLE OUTPUT IS RED. If this script cannot read a harness's
#       passed/failed counts it does not shrug and move on — silence is
#       the failure mode that caused the incident. Three report shapes are
#       understood; a fourth must be added here, deliberately, before its
#       harness can ever read green.
#    4. This script's own exit code is the verdict. Nonzero if ANY harness
#       is red. DO NOT PIPE IT to tail/head/grep when you intend to check
#       $? — the pipeline's exit status is the LAST command's, so `run |
#       tail` reports tail's success and hides a red suite. That is the
#       same class of bug this file exists to prevent. Redirect instead:
#           ./run_harnesses.sh >/dev/null; echo $?
#    5. Falsify against a COPIED tree, never the working tree.
#
#  Tooling only. It changes no product source and asserts nothing itself.
# ════════════════════════════════════════════════════════════════════
set -u

TARGET="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
cd "$TARGET" || { echo "cannot enter $TARGET"; exit 2; }

shopt -s nullglob
harnesses=(*.test.js)
if [ ${#harnesses[@]} -eq 0 ]; then
  echo "no *.test.js harnesses found in $TARGET"
  exit 2
fi

pass_total=0; fail_total=0; red=0; unreadable=0

printf '%-34s %8s %8s %6s\n' "HARNESS" "PASSED" "FAILED" "EXIT"
printf '%s\n' "----------------------------------------------------------------"

for t in "${harnesses[@]}"; do
  out="$(node "$t" 2>&1)"; code=$?
  p=""; f=""

  # Shape 1 — "assertions passed: N" / "assertions failed: N"
  p="$(printf '%s' "$out" | grep -oE 'assertions passed: [0-9]+' | grep -oE '[0-9]+$' | tail -1)"
  f="$(printf '%s' "$out" | grep -oE 'assertions failed: [0-9]+' | grep -oE '[0-9]+$' | tail -1)"

  # Shape 2 — "==== 36 passed, 0 failed ====" (also with box-drawing rules)
  if [ -z "$p" ]; then
    line="$(printf '%s' "$out" | grep -oE '[0-9]+ passed, [0-9]+ failed' | tail -1)"
    if [ -n "$line" ]; then
      p="$(printf '%s' "$line" | grep -oE '^[0-9]+')"
      f="$(printf '%s' "$line" | grep -oE '[0-9]+ failed$' | grep -oE '^[0-9]+')"
    fi
  fi

  # Shape 3 — a trailing "N/M" fraction
  if [ -z "$p" ]; then
    frac="$(printf '%s' "$out" | grep -oE '[0-9]+/[0-9]+' | tail -1)"
    if [ -n "$frac" ]; then p="${frac%%/*}"; tot="${frac##*/}"; f=$(( tot - p )); fi
  fi

  # Shape 4 — "N passed · N failed" (middle dot; the S1 property-context proof).
  # Added deliberately per rule 3: a new report shape is registered here before
  # its harness can ever read green.
  if [ -z "$p" ]; then
    line="$(printf '%s' "$out" | grep -oE '[0-9]+ passed · [0-9]+ failed' | tail -1)"
    if [ -n "$line" ]; then
      p="$(printf '%s' "$line" | grep -oE '^[0-9]+')"
      f="$(printf '%s' "$line" | grep -oE '[0-9]+ failed' | grep -oE '^[0-9]+')"
    fi
  fi

  # RULE 3 — could not read it, so it is red. Not "probably fine".
  if [ -z "$p" ] || [ -z "$f" ]; then
    red=$((red+1)); unreadable=$((unreadable+1))
    printf '%-34s %8s %8s %6d   <- RED (counts unreadable)\n' "$t" "?" "?" "$code"
    continue
  fi

  pass_total=$((pass_total + p)); fail_total=$((fail_total + f))
  mark=""
  if [ "$code" -ne 0 ] || [ "$f" -ne 0 ]; then red=$((red+1)); mark="   <- RED"; fi
  printf '%-34s %8d %8d %6d%s\n' "$t" "$p" "$f" "$code" "$mark"
done

printf '%s\n' "----------------------------------------------------------------"
printf '%d harnesses · %d passed · %d failed · %d red' \
  "${#harnesses[@]}" "$pass_total" "$fail_total" "$red"
[ "$unreadable" -gt 0 ] && printf ' (%d unreadable)' "$unreadable"
printf '\n'

if [ "$red" -ne 0 ]; then
  printf '\nSUITE IS RED — do not push.\n'
  exit 1
fi
printf 'suite green.\n'
exit 0
