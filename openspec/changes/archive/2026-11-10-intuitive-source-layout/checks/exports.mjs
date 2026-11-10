// D7 item 2: the sorted union of runtime exports across the shipped source files.
// Prints every file's sorted keys, then the union; with an expected-names file, compares both.
// usage: node exports.mjs [repo] [expected-names-file]
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const repo = process.argv[2] ?? "/tmp/isl-spike";
const expectedFile = process.argv[3];

function sources(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sources(path));
    else if (entry.name.endsWith(".ts")) found.push(path);
  }
  return found.sort();
}

const problems = [];
const union = new Set();
for (const file of sources(join(repo, "extensions"))) {
  const module = await import(pathToFileURL(file).href);
  const keys = Object.keys(module).sort();
  for (const key of keys) union.add(key);
  console.log(`${relative(repo, file)}: ${keys.join(", ")}`);
}

const names = [...union].sort();
console.log(`union: ${names.length}`);
console.log(names.join(", "));

if (expectedFile !== undefined) {
  const expected = readFileSync(expectedFile, "utf8").split("\n").map((line) => line.trim()).filter((line) => line !== "" && !line.startsWith("#")).sort();
  const missing = expected.filter((name) => !names.includes(name));
  const extra = names.filter((name) => !expected.includes(name));
  for (const name of missing) problems.push(`MISSING EXPORT ${name}`);
  for (const name of extra) problems.push(`UNEXPECTED EXPORT ${name}`);
  console.log(`expected exports: ${expected.length}`);
}

for (const problem of problems) console.log(problem);
if (problems.length > 0) {
  console.log("EXPORTS FAIL");
  process.exit(1);
}
console.log("PASS");
