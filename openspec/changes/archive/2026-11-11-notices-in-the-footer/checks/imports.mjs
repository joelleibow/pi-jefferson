// Check 5: the import boundaries of the shipped source under extensions/ (the living
// extension-source-layout spec, and Michael's later-gate notes).
// Every relative specifier ends in .ts and resolves; no file imports the entry; data/ imports
// nothing outside itself; an instrument's file imports only the contract, the compact-count
// helper or a type of data/, never format.ts, shipped.ts, components/row/ or another instrument;
// the clock and the scheduler are named only in startup.ts; a file under components/visuals/ imports
// nothing of this package; and no cycle exists. Prints every edge; fails with the problems found.
// usage: node imports.mjs <repo>
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const repo = process.argv[2];
if (repo === undefined) {
  console.error("usage: node imports.mjs <repo>");
  process.exit(2);
}

function sources(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sources(path));
    else if (entry.name.endsWith(".ts")) found.push(path);
  }
  return found.sort();
}

const INSTRUMENT_DIR = "extensions/jefferson/components/instruments/";
// The files in the instruments' directory that are not an instrument: the contract, its binding
// and the compact-count helper. Every other file there declares one instrument.
const NOT_AN_INSTRUMENT = new Set([INSTRUMENT_DIR + "instrument.ts", INSTRUMENT_DIR + "instrument-binding.ts", INSTRUMENT_DIR + "compact-count.ts"]);
const INSTRUMENT_MAY_IMPORT = new Set([INSTRUMENT_DIR + "instrument.ts", INSTRUMENT_DIR + "compact-count.ts"]);
// A visual stands alone: it is mixed into an instrument, so it may not reach another part of the package.
const VISUAL_DIR = "extensions/jefferson/components/visuals/";

const files = sources(join(repo, "extensions"));
const entry = join(repo, "extensions/jefferson.ts");
const CLOCK_HOME = "extensions/jefferson/startup.ts";
const PROCESS_CLOCK = /\bperformance\.now\b|\bsetTimeout\b|\bclearTimeout\b/;
const rel = (path) => relative(repo, path).split("\\").join("/");
const problems = [];
const edges = [];

const SPECIFIER = [
  /from\s+["']([^"']+)["']/g,
  /import\s*\(\s*["']([^"']+)["']\s*\)/g,
  /(?:^|\n)\s*import\s+["']([^"']+)["']/g,
];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (rel(file) !== CLOCK_HOME && PROCESS_CLOCK.test(text)) {
    problems.push(`CLOCK ${rel(file)} names a process clock; only startup.ts may`);
  }
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
    const from = rel(file);
    const to = rel(target);
    if (target === entry) problems.push(`IMPORTS ENTRY ${from} imports ${to}`);
    if (from.startsWith("extensions/jefferson/data/") && !to.startsWith("extensions/jefferson/data/")) {
      problems.push(`DATA LEAK ${from} imports ${to}`);
    }
    if (from.startsWith(VISUAL_DIR)) {
      problems.push(`VISUAL IMPORTS ${from} imports ${to}`);
    }
    if (from.startsWith(INSTRUMENT_DIR) && !NOT_AN_INSTRUMENT.has(from)
      && !INSTRUMENT_MAY_IMPORT.has(to) && !to.startsWith("extensions/jefferson/data/")) {
      problems.push(`INSTRUMENT IMPORTS ${from} imports ${to}`);
    }
    edges.push([from, to]);
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
for (const problem of problems) console.log(problem);
if (problems.length > 0) {
  console.log("IMPORTS FAIL");
  process.exit(1);
}
console.log("PASS");
