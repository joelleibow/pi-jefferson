#!/bin/sh
# D7 item 6: lodash reaches the source only as per-function lodash-es/<fn>.js imports (ADR 0004).
# usage: lodash.sh [repo]
set -eu
repo=${1:-/tmp/isl-spike}
cd "$repo"

out=$(rg -n lodash extensions/ || true)
printf '%s\n' "$out"
printf 'lodash lines: %s\n' "$(printf '%s\n' "$out" | rg -c . || true)"
# A comment may name lodash; only an import can widen the dependency.
bad=$(printf '%s\n' "$out" | rg -v '^extensions/[^:]+:[0-9]+:[[:space:]]*(import [A-Za-z]+ from "lodash-es/[A-Za-z]+\.js";|//|\*)' | rg . || true)
if [ -n "$bad" ]; then
  printf 'NOT A PER-FUNCTION IMPORT:\n%s\n' "$bad"
  echo "LODASH FAIL"
  exit 1
fi
echo "PASS"
