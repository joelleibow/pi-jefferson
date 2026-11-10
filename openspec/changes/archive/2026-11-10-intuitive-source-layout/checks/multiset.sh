#!/bin/sh
# D7 item 3: the sorted multiset of shipped non-import, non-comment source lines, hashed.
# michael-orientation.md §2's command, plus the trim the design adds and the wrapped-import
# filter the conductor ruled in on 2026-11-10: a closing `} from "…"` line is an import.
# usage: multiset.sh [--strip-export] <expected-16-char-prefix> [repo]
set -eu
strip_export=false
if [ "${1:-}" = "--strip-export" ]; then strip_export=true; shift; fi
expected=${1:?expected hash prefix}
repo=${2:-/tmp/isl-spike}
cd "$repo"

lines=$(fd -e ts . extensions -x cat {} | rg -v '^\s*(import|export .* from|}\s*from\s+"|//|\*|/\*\*|\*/|$)')
count=$(printf '%s\n' "$lines" | wc -l | tr -d ' ')
trimmed=$(printf '%s\n' "$lines" | sed 's/^[[:space:]]*//')
label=trimmed
if [ "$strip_export" = true ]; then
  trimmed=$(printf '%s\n' "$trimmed" | sed 's/^export //')
  label=export-stripped
fi
hash=$(printf '%s\n' "$trimmed" | sort | shasum -a 256 | cut -c1-16)
printf 'multiset (%s): %s lines, %s (expected %s)\n' "$label" "$count" "$hash" "$expected"
if [ "$hash" != "$expected" ]; then
  echo "MULTISET MISMATCH"
  exit 1
fi
echo "PASS"
