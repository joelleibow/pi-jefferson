#!/bin/sh
# Check 7: nothing reads the terminal and nothing shells out (owner ruling, 2026-11-05).
# Scans the shipped source under extensions/ for a process spawn or a read of the terminal.
# usage: terminal.sh <repo>
set -eu
if [ $# -lt 1 ]; then echo "usage: terminal.sh <repo>" >&2; exit 2; fi
repo=$1
cd "$repo"

pattern='child_process|execSync|execFileSync|execFile\(|spawnSync|spawn\(|process\.stdout|process\.stdin|/dev/tty|readline'
hits=$(grep -rEn "$pattern" extensions --include='*.ts' || true)
if [ -n "$hits" ]; then
  printf '%s\n' "$hits"
  echo "TERMINAL FAIL"
  exit 1
fi
echo "no spawn and no terminal read under extensions/ (pattern: $pattern)"
echo "PASS"
