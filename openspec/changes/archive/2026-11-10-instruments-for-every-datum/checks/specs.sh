#!/bin/sh
# Check 9: `openspec validate --strict` on the change, and every paragraph of the two delta specs
# at 500 characters or fewer, measured per paragraph.
# usage: specs.sh <main checkout> <change name> [specs dir]
# (run from the main checkout, where openspec/ and its project config live; the specs dir is
# overridable so a planted paragraph can be measured on a scratch copy)
set -eu
if [ $# -lt 2 ]; then echo "usage: specs.sh <repo> <change-id> [specs-dir]" >&2; exit 2; fi
repo=$1
change=$2
checks=$(cd "$(dirname "$0")" && pwd)
specs=${3:-"$checks/../specs"}
cd "$repo"

openspec validate "$change" --strict

status=0
for spec in "$specs"/*/spec.md; do
  awk -v file="$spec" '
    function flush() {
      if (paragraph == "") return
      if (length(paragraph) > longest) longest = length(paragraph)
      if (length(paragraph) > 500) {
        printf "%s:%d: %d characters, over 500: %s\n", file, started, length(paragraph), substr(paragraph, 1, 70) "..."
        over++
      }
      paragraph = ""
    }
    /^[[:space:]]*$/ { flush(); next }
    { if (paragraph == "") started = NR; paragraph = paragraph (paragraph == "" ? "" : " ") $0 }
    END {
      flush()
      printf "%s: longest paragraph %d characters", file, longest
      if (over > 0) { printf ", %d paragraphs over 500\n", over; exit 1 }
      printf ", none over 500\n"
    }
  ' "$spec" || status=1
done
if [ "$status" = 0 ]; then echo "PASS"; fi
exit "$status"
