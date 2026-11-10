#!/bin/sh
# D7 item 5: the tarball's file list. Every tracked source file under extensions/ ships, nothing
# else under extensions/ does, every path is under the allowed roots, the entry ships, no test
# file ships, and pi.extensions still names the entry.
# usage: tarball.sh [repo]
set -eu
repo=${1:-/tmp/isl-spike}
cd "$repo"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
pnpm pack --dry-run --json > "$tmp/shipping.json" 2>/dev/null
git ls-files 'extensions/*' | sort > "$tmp/tracked.txt"

node -e '
  const fs = require("node:fs");
  const shipped = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).files.map((f) => f.path).sort();
  const tracked = fs.readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean).sort();
  const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const problems = [];

  console.log("shipped: " + shipped.join(", "));
  const allowed = (p) => p === "package.json" || p === "README.md" || p === "LICENSE" || p.startsWith("extensions/");
  for (const path of shipped) if (!allowed(path)) problems.push(`PATH OUTSIDE THE ROOTS ${path}`);

  const under = shipped.filter((p) => p.startsWith("extensions/"));
  console.log("source files under extensions/: " + under.length + " (tracked: " + tracked.length + ")");
  for (const path of under) {
    if (!path.endsWith(".ts")) problems.push(`NOT A SOURCE FILE ${path}`);
    if (path.endsWith(".test.ts")) problems.push(`TEST FILE SHIPPED ${path}`);
    if (!tracked.includes(path)) problems.push(`SHIPPED BUT NOT TRACKED ${path}`);
  }
  for (const path of tracked) if (!under.includes(path)) problems.push(`TRACKED BUT NOT SHIPPED ${path}`);
  if (!shipped.includes("extensions/jefferson.ts")) problems.push("THE ENTRY IS NOT SHIPPED extensions/jefferson.ts");
  if (JSON.stringify(manifest.pi?.extensions) !== JSON.stringify(["./extensions/jefferson.ts"]))
    problems.push(`pi.extensions IS NOT THE ENTRY ${JSON.stringify(manifest.pi?.extensions)}`);

  for (const problem of problems) console.log(problem);
  if (problems.length > 0) { console.log("TARBALL FAIL"); process.exit(1); }
  console.log("PASS");
' "$tmp/shipping.json" "$tmp/tracked.txt"
