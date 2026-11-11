#!/bin/sh
# Check 6: the commit touched only the files its task names.
# usage: scope.sh <repo> <base> <head> <allowed path> [allowed path ...]
# Prints every changed path, then names the ones the task does not allow.
set -eu
if [ $# -lt 4 ]; then echo "usage: scope.sh <repo> <base> <head> <allowed path>..." >&2; exit 2; fi
repo=$1; base=$2; head=$3; shift 3
cd "$repo"

changed=$(git diff --name-only "$base" "$head")
printf '%s\n' "$changed" | sed 's/^/changed: /'
bad=$(printf '%s\n' "$changed" | while IFS= read -r path; do
  if [ -z "$path" ]; then continue; fi
  allowed=no
  for one in "$@"; do
    if [ "$path" = "$one" ]; then allowed=yes; fi
  done
  if [ "$allowed" = no ]; then printf '%s\n' "$path"; fi
done
: )
if [ -n "$bad" ]; then
  printf '%s\n' "$bad" | sed 's/^/NOT NAMED BY THE TASK: /'
  echo "SCOPE FAIL"
  exit 1
fi
echo "every changed path is one the task names"
echo "PASS"
