#!/bin/sh
# Check 3: the assertion lines the range adds and removes under tests/, so a reader can compare
# them with the design's list of expected edits.
# usage: testdiff.sh <repo> <base> [head]
set -eu
if [ $# -lt 2 ]; then echo "usage: testdiff.sh <repo> <base> [head]" >&2; exit 2; fi
repo=$1; base=$2; head=${3:-HEAD}
cd "$repo"

git diff --stat "$base" "$head" -- tests/
echo "--- assertion lines removed"
git diff "$base" "$head" -- tests/ | grep -E '^-' | grep -v '^---' | grep -E 'assert|deepEqual|indexOf' | sed 's/^-/  /' || echo "  (none)"
echo "--- assertion lines added"
git diff "$base" "$head" -- tests/ | grep -E '^\+' | grep -v '^+++' | grep -E 'assert|deepEqual|indexOf' | sed 's/^\+/  /' || echo "  (none)"
