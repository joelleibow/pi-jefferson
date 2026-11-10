// D7 item 4: the import graph of the shipped source under extensions/.
// Checks every relative specifier ends in .ts and resolves, no file imports the entry, data/
// imports nothing outside itself, and no cycle exists. Prints the edge list; with an expected
// edge file, compares it.
// usage: node graph.mjs [repo] [expected-edges-file]
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

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

const files = sources(join(repo, "extensions"));
const entry = join(repo, "extensions/jefferson.ts");
const rel = (path) => relative(repo, path);
const problems = [];
const edges = [];

const SPECIFIER = [
  /from\s+["']([^"']+)["']/g,             // import … from "x" / export … from "x"
  /import\s*\(\s*["']([^"']+)["']\s*\)/g, // dynamic import("x")
  /(?:^|\n)\s*import\s+["']([^"']+)["']/g, // side-effect import "x"
];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const specifiers = new Set();
  for (const pattern of SPECIFIER) for (const match of text.matchAll(pattern)) specifiers.add(match[1]);
  for (const specifier of specifiers) {
    if (!specifier.startsWith(".")) continue; // a host package, not part of this graph
    if (!specifier.endsWith(".ts")) {
      problems.push(`BAD SPECIFIER ${rel(file)}: ${specifier} does not end in .ts`);
      continue;
    }
    const target = join(dirname(file), specifier);
    if (!existsSync(target) || !statSync(target).isFile()) {
      problems.push(`MISSING ${rel(file)}: ${specifier} resolves to no file`);
      continue;
    }
    if (target === entry) problems.push(`IMPORTS ENTRY ${rel(file)} imports ${rel(entry)}`);
    const insideData = rel(file).startsWith("extensions/jefferson/data/");
    if (insideData && !rel(target).startsWith("extensions/jefferson/data/")) {
      problems.push(`DATA LEAK ${rel(file)} imports ${rel(target)}`);
    }
    edges.push([rel(file), rel(target)]);
  }
}

edges.sort((a, b) => (a[0] + a[1] < b[0] + b[1] ? -1 : 1));
const out = new Map(edges.map(([from]) => [from, []]));
for (const [from, to] of edges) out.get(from).push(to);

const state = new Map();
function visit(node, trail) {
  if (state.get(node) === "done") return;
  if (state.get(node) === "open") {
    problems.push(`CYCLE ${[...trail.slice(trail.indexOf(node)), node].join(" -> ")}`);
    return;
  }
  state.set(node, "open");
  for (const next of out.get(node) ?? []) visit(next, [...trail, node]);
  state.set(node, "done");
}
for (const file of files) visit(rel(file), []);

console.log(`files: ${files.length}`);
for (const [from, to] of edges) console.log(`edge: ${from} -> ${to}`);
console.log(`edges: ${edges.length}`);

const rendered = edges.map(([from, to]) => `${from} -> ${to}`);
if (expectedFile !== undefined) {
  const expected = readFileSync(expectedFile, "utf8").split("\n").map((line) => line.trim()).filter((line) => line !== "" && !line.startsWith("#"));
  const missing = expected.filter((edge) => !rendered.includes(edge));
  const extra = rendered.filter((edge) => !expected.includes(edge));
  for (const edge of missing) problems.push(`UNEXPECTED ABSENCE ${edge}`);
  for (const edge of extra) problems.push(`UNEXPECTED EDGE ${edge}`);
  console.log(`expected edges: ${expected.length}`);
}

for (const problem of problems) console.log(problem);
if (problems.length > 0) {
  console.log("GRAPH FAIL");
  process.exit(1);
}
console.log("PASS");
