#!/bin/sh
# D7 item 7: every move in commit 1 is a rename git scores at or above 90% similarity, and no
# source file is added or deleted (a move git fails to follow shows as a delete plus an add).
# The modified importers are the specifier edits commit 1 is allowed to make.
# usage: renames.sh <base-commit> <head-commit> [repo]
set -eu
base=${1:?base commit}
head=${2:?head commit}
repo=${3:-/tmp/isl-spike}
cd "$repo"

git diff -M --stat "$base" "$head" -- extensions/
raw=$(git diff -M --raw "$base" "$head" -- extensions/)
printf '%s\n' "$raw"

renames=$(printf '%s\n' "$raw" | awk '$5 ~ /^R/' | wc -l | tr -d ' ')
printf 'renames: %s\n' "$renames"
low=$(printf '%s\n' "$raw" | awk '$5 ~ /^R/ {score = substr($5, 2) + 0; if (score < 90) print "LOW SIMILARITY " score "% " $6 " -> " $7}')
unfollowed=$(printf '%s\n' "$raw" | awk '$5 ~ /^[AD]/ {print "NOT FOLLOWED AS A RENAME " $5 " " $6}')
if [ -n "$low" ]; then printf '%s\n' "$low"; echo "RENAME FAIL"; exit 1; fi
if [ -n "$unfollowed" ]; then printf '%s\n' "$unfollowed"; echo "RENAME FAIL"; exit 1; fi
echo "PASS"
