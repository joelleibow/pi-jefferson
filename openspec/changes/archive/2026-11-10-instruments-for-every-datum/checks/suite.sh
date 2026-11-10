#!/bin/sh
# Check 1: `pnpm typecheck` and `pnpm test`, with the expected pass count.
# usage: suite.sh <repo> [expected-pass-count]
set -eu
if [ $# -lt 1 ]; then echo "usage: suite.sh <repo> [expected-pass-count]" >&2; exit 2; fi
repo=$1
expected=${2:-}
cd "$repo"

pnpm typecheck
out=$(pnpm test 2>&1) || { printf '%s\n' "$out" | tail -25; echo "TESTS FAIL"; exit 1; }
printf '%s\n' "$out" | tail -10
pass=$(printf '%s\n' "$out" | grep '^ℹ pass ' | awk '{print $3}')
fail=$(printf '%s\n' "$out" | grep '^ℹ fail ' | awk '{print $3}')
printf 'suite: %s passed, %s failed%s\n' "$pass" "$fail" "${expected:+ (expected $expected)}"
if [ "$fail" != 0 ]; then echo "SUITE FAIL"; exit 1; fi
if [ -n "$expected" ] && [ "$pass" != "$expected" ]; then echo "SUITE MISMATCH"; exit 1; fi
echo "PASS"
