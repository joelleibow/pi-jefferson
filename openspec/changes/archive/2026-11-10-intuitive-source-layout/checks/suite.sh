#!/bin/sh
# D7 item 1: the suite and the type check, with the expected pass count.
# usage: suite.sh [expected-pass-count] [repo]
set -eu
expected=${1:-317}
repo=${2:-/tmp/isl-spike}
cd "$repo"

pnpm typecheck
out=$(pnpm test 2>&1) || { printf '%s\n' "$out" | tail -20; echo "TESTS FAIL"; exit 1; }
printf '%s\n' "$out" | tail -12
pass=$(printf '%s\n' "$out" | rg '^[#ℹ] pass ' | awk '{print $3}')
fail=$(printf '%s\n' "$out" | rg '^[#ℹ] fail ' | awk '{print $3}')
printf 'suite: %s passed, %s failed (expected %s)\n' "$pass" "$fail" "$expected"
if [ "$pass" != "$expected" ] || [ "$fail" != 0 ]; then
  echo "SUITE MISMATCH"
  exit 1
fi
echo "PASS"
