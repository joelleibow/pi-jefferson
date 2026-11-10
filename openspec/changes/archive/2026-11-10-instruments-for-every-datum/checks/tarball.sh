#!/bin/sh
# Check 8: the tarball's file list. Every tracked source file under extensions/ ships, nothing
# else under extensions/ does, no test file ships, and pi.extensions still names the entry.
# usage: tarball.sh <repo> [expected number of source files under extensions/]
set -eu
if [ $# -lt 1 ]; then echo "usage: tarball.sh <repo> [expected-source-file-count]" >&2; exit 2; fi
repo=$1
expected=${2:-}
checks=$(cd "$(dirname "$0")" && pwd)
cd "$repo"

scratch=$(mktemp -d "$checks/.scratch.XXXXXX")
trap 'rm -rf "$scratch"' EXIT
pnpm pack --dry-run --json > "$scratch/shipping.json" 2>/dev/null
git ls-files 'extensions/*' | sort > "$scratch/tracked.txt"

node -e '
  const fs = require("node:fs");
  const shipped = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).files.map((f) => f.path).sort();
  const tracked = fs.readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean).sort();
  const expected = process.argv[3];
  const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const problems = [];

  const under = shipped.filter((p) => p.startsWith("extensions/"));
  console.log("shipped: " + shipped.join(", "));
  console.log("source files under extensions/: " + under.length + " (tracked: " + tracked.length + ")" + (expected ? " (expected: " + expected + ")" : ""));
  for (const path of under) {
    if (!path.endsWith(".ts")) problems.push(`NOT A SOURCE FILE ${path}`);
    if (path.endsWith(".test.ts")) problems.push(`TEST FILE SHIPPED ${path}`);
    if (!tracked.includes(path)) problems.push(`SHIPPED BUT NOT TRACKED ${path}`);
  }
  for (const path of tracked) if (!under.includes(path)) problems.push(`TRACKED BUT NOT SHIPPED ${path}`);
  if (expected && String(under.length) !== expected) problems.push(`SOURCE COUNT ${under.length} IS NOT ${expected}`);
  if (!shipped.includes("extensions/jefferson.ts")) problems.push("THE ENTRY IS NOT SHIPPED extensions/jefferson.ts");
  if (JSON.stringify(manifest.pi?.extensions) !== JSON.stringify(["./extensions/jefferson.ts"]))
    problems.push(`pi.extensions IS NOT THE ENTRY ${JSON.stringify(manifest.pi?.extensions)}`);

  for (const problem of problems) console.log(problem);
  if (problems.length > 0) { console.log("TARBALL FAIL"); process.exit(1); }
  console.log("PASS");
' "$scratch/shipping.json" "$scratch/tracked.txt" "$expected"
