# Red/green proof of every check (Derek, scratch spike)

Joel's ruling: *"Before drafting tasks, run every check a task relies on and show it go red and green."* Derek run `3063c991-6b99-4ab9-898a-39c43b25254d`, 2026-11-10, worktree `/tmp/isl-spike`, branch `intuitive-source-layout-spike`: commits `f5ab4d6` (moves), `fa018fc` (instrument split), `8256b45` (bar), `8d0cf20` (audit 7), `f32c55f` (release.yml), on `3f177cd`. Check scripts in `/tmp/isl/checks/`. Nothing here ships. Conductor ruling during the run: the multiset filter gains `^\s*}\s*from\s+"` so a wrapped import's closing line counts as an import; the baseline is re-measured and the new values replace those in design.md D7 and michael-pl4-2.json. Transcribed verbatim.

Everything is measured. Here is the report.

**Done: all seven D7 checks built in `/tmp/isl/checks/`, each shown green on the baseline and red on its planted mistake, and the five D9 commits landed in `/tmp/isl-spike` with the suite green at every one.** Nothing is left unbuilt; the one open expectation (commit 1's multiset) was ruled on by the conductor and re-measured.

## The spike commits

```
f32c55f Release only from main
8d0cf20 Import Readings from the data store in format.ts
8256b45 Extract the bar into its own file
fa018fc Split the instruments into one file each
f5ab4d6 Move the row, instrument and format source to the ruled tree
3f177cd Record Michael's design approval      (base)
```
`git status --porcelain --untracked-files=all` is empty at HEAD; no staged files.

The final tree is Joel's tree exactly: `format.ts`, `shipped.ts`, `startup.ts`, `configuration.ts`, `footer-setup.ts`, `data/` (unchanged) under `jefferson/`; `components/instruments/` (instrument, instrument-binding, compact-count, blank, model, thinking, path, context, tokens, cost), `components/row/` (row, width-plan, row-renderer), `components/visuals/bar.ts`; no `visuals/` directory.

## The checks

All scripts are outside the repo. `repo` defaults to `/tmp/isl-spike`.

| Check | Command |
|---|---|
| suite | `cd /tmp/isl/checks && ./suite.sh 317` |
| multiset | `./multiset.sh [--strip-export] <hash>` (`multiset-old-filter.sh` = the pre-ruling filter, kept only to show its red) |
| graph | `node graph.mjs /tmp/isl-spike [expected-file]` |
| exports | `node exports.mjs /tmp/isl-spike [expected-file]` |
| tarball | `./tarball.sh` |
| lodash | `./lodash.sh` |
| renames | `./renames.sh <base> <head>` |

### 1. `suite.sh` — `pnpm typecheck` + `pnpm test`

- Baseline green: `tsc` clean; `ℹ pass 317 / ℹ fail 0` → `suite: 317 passed, 0 failed (expected 317) PASS`.
- Green after every commit: 317/317 at commits 1, 2, 3, 4, 5.
- Red shown through the threshold mutation below (the one mistake this check exists to catch); `pnpm test` is otherwise the whole suite's own proof.

### 2. `multiset.sh` — the sorted multiset of shipped non-import, non-comment lines

**The conductor's ruling changed the filter.** Baseline at `3f177cd`:

| pipeline | old filter (Michael's) | ruled filter |
|---|---|---|
| trimmed | 946 lines, `76f7eb251a60fa0e` | **944 lines, `37f605345cc24d3a`** |
| trimmed + `sed 's/^export //'` | 946 lines, `09563e1f7ed0b8c7` | **944 lines, `5266812335e73621`** |

The two dropped lines are the only two in the tree that start `} from "`:
`configuration.ts:18 } from "@earendil-works/pi-coding-agent";` and `configuration.ts:27 } from "./visuals/instrument-binding.ts";`. These four values replace Michael's.

- **Commit 1** green: `multiset (trimmed): 944 lines, 37f605345cc24d3a (expected 37f605345cc24d3a) PASS` — no permitted differences.
- **Commit 2** green: `multiset (export-stripped): 944 lines, 5266812335e73621 (expected 5266812335e73621) PASS` — no permitted differences.
- **Commit 3** measured as the D5 categories, not a hash: 944 → 955 lines, trimmed `529431e8fb7a9fe6`, 13 added and 2 removed (listed below). The four lines D5 requires identical after trimming are present once in both sets: `const WARNING_PERCENT = 70;`, `const ERROR_PERCENT = 90;`, `const filled = percent === null …`, and both `filledStyle` lines.
- **Commit 4**: 955 → 954 lines, trimmed `d1a326804f97195c`, export-stripped `e10db76f02a17680`. Difference: exactly `- type Readings = Parameters<Instrument["render"]>[0];`.
- **Commit 5**: unchanged at `d1a326804f97195c` (release.yml is outside `extensions/`).
- Red on a changed source line, under the final filter: `const GAP = 0;` → `const GAP = 1;` in `row-renderer.ts` → `954 lines, fc4749a7838a1411 (expected d1a326804f97195c) / MULTISET MISMATCH`, reverted → `PASS`.
- Red on the old filter (the ruled-away blind spot), same tree, commit 1: `946 lines, 587b7aff55e3c2ff (expected 76f7eb251a60fa0e) / MULTISET MISMATCH`; with the ruled filter: `944 lines, 37f605345cc24d3a … PASS`.
- The filter fix itself, red then green, on a planted move whose only edit is a wrapped import's closing line (`} from "./visuals/instrument-binding.ts";` → `} from "./instruments/instrument-binding.ts";`, `diff -r` shows that line alone): old filter `946 lines, 4f9a8e437e846872 (expected 76f7eb251a60fa0e) MULTISET MISMATCH`; ruled filter `944 lines, 37f605345cc24d3a (expected 37f605345cc24d3a) PASS`.
- After commit 2, the plain trimmed value moves only by the eight `export ` additions (diff shows 8 removed `const …`/`function …` lines and the same 8 with `export `), which is why the export-stripped pipeline is the one commit 2 is measured under.

### 3. `graph.mjs` — edges, cycles, entry, specifiers

- Baseline green: `files: 12 … edges: 20 … PASS` against `expected/edges-baseline.txt` (20 edges, equal to Michael's count).
- **Red, planted `row.ts` importing the entry** (`import "../../jefferson.ts";`):
  `IMPORTS ENTRY extensions/jefferson/visuals/row.ts imports extensions/jefferson.ts` / `CYCLE extensions/jefferson.ts -> … -> row.ts -> jefferson.ts` / `UNEXPECTED EDGE …` / `GRAPH FAIL`.
- **Red, planted cycle** (`format.ts` importing the binding, i.e. the instrument→`shipped`/`format` shape D4 exists to prevent): `edges: 21 / CYCLE …/format.ts -> …/instrument-binding.ts -> …/format.ts / GRAPH FAIL`.
- **Red, specifier without `.ts`** (`from "./width-plan"`): `edges: 19 / BAD SPECIFIER …/row-renderer.ts: ./width-plan does not end in .ts / GRAPH FAIL`.
- **Red after commit 2, an instrument file importing `shipped.ts`** (`cost.ts` gains `import { instrumentNamed } from "../../shipped.ts";`): `edges: 39 → CYCLE extensions/jefferson/shipped.ts -> …/cost.ts -> extensions/jefferson/shipped.ts / UNEXPECTED EDGE …/cost.ts -> extensions/jefferson/shipped.ts / GRAPH FAIL`.
- **Green after commit 1**: 20 edges on the moved paths (`expected/edges-after-commit-1.txt`), `PASS`.
- **Green after commit 2**: 38 edges (`expected/edges-after-commit-2.txt`), `PASS`.
- **Green after commit 3**: 39 edges (the new `format.ts -> components/visuals/bar.ts`; `bar.ts` has no local import), `PASS`.
- **Green after commit 4 (final)**: 40 edges, equal to D6's list with no difference: `edges: 40 / expected edges: 40 (D6, written into expected/edges-final-D6.txt) / PASS`.

### 4. `exports.mjs` — the sorted union of runtime exports

- Baseline green: `union: 22`, exactly Michael's list (`expected/exports-baseline.txt`).
- **Red on a widened export**: `const GAP` → `export const GAP` in `row-renderer.ts` → `UNEXPECTED EXPORT GAP / EXPORTS FAIL` (the script exits 1).
- **Green after commit 2**: `union: 30` = 22 + the eight D3 names (`FOUNDATIONAL_OPTIONS`, `compactCount`, `model`, `thinking`, `path`, `context`, `tokens`, `cost`), `PASS`.
- **Green after commits 3–5**: `union: 31` with `drawBar`, `PASS` against `expected/exports-final.txt`. `BarPart` is a type and is erased, so `bar.ts`'s pinned runtime keys are `["drawBar"]`; `SHIPPED` stays private.

### 5. `tarball.sh` — `pnpm pack --dry-run --json` against the tracked source

- Baseline green: `shipped: LICENSE, README.md, extensions/… (12), package.json / source files under extensions/: 12 (tracked: 12) / PASS`.
- **Red, an extra shipped file** (`extensions/jefferson/notes.md`): `source files under extensions/: 13 (tracked: 12) / NOT A SOURCE FILE … / SHIPPED BUT NOT TRACKED … / TARBALL FAIL`.
- **Red, a missing shipped file** (`files` gains `"!extensions/jefferson/visuals/width-plan.ts"`): `source files under extensions/: 11 (tracked: 12) / TRACKED BUT NOT SHIPPED extensions/jefferson/visuals/width-plan.ts / TARBALL FAIL`.
- **Green after commits 2, 3, 4**: 21, then 22 source files, `PASS` at each; `pi.extensions` and `files` unchanged throughout (the script asserts both).

### 6. `lodash.sh` — ADR 0004

- Green at every commit: three per-function imports in `format.ts` (`lodash-es/toLower.js`, `toUpper.js`, `upperFirst.js`) and one comment naming lodash; nothing else. `PASS`.

### 7. `renames.sh` — D7 item 7

- No baseline run: it compares a commit range. **Green on commit 1**: `renames: 6`, scores `R098` ×5 and `R092` for `row.ts` — all ≥ 90, so nothing dips and nothing needs naming; no add/delete pair. `PASS`.

### The threshold mutation (D5's red)

- On the baseline tree, `WARNING_PERCENT 70→71`, `ERROR_PERCENT 90→91` in `format.ts`: `✖ bar thresholds replace only foreground above seventy and ninety … AssertionError: 70.1 … at tests/format.test.ts:143:12` (the test declared at `:138`), reverted.
- **After commit 3, the same mutation in `components/visuals/bar.ts`**: `✖ bar thresholds replace only foreground above seventy and ninety … AssertionError: 70.1 … actual '\x1B[34m…' expected '\x1B[33m…' … at tests/format.test.ts:144:12`, reverted. The test still catches a mutated bar.

## Commit 3's exact lines

Added (13 lines; `git show -U0 8256b45 -- extensions/`):

```text
+/** The bar: a filled track and the track it leaves, colored by how full the datum is. */
+import type { ThemeStyle } from "@earendil-works/pi-coding-agent";
+
+/** One drawn part of the bar. The format language applies the theme to each part it is given. */
+export interface BarPart {
+  readonly text: string;
+  readonly style: ThemeStyle;
+}
+
+const WARNING_PERCENT = 70;
+const ERROR_PERCENT = 90;
+
+/** The bar's parts, the filled one first. It takes plain numbers, so it needs no theme and no other file. */
+export function drawBar(barWidth: number, percent: number | null, style: ThemeStyle): [BarPart, BarPart] {
+  const filled = percent === null ? 0 : Math.min(barWidth, Math.floor((percent / 100) * barWidth));
+  const filledStyle: ThemeStyle = percent !== null && percent > ERROR_PERCENT ? { ...style, fg: "error" }
+    : percent !== null && percent > WARNING_PERCENT ? { ...style, fg: "warning" } : style;
+  return [
+    { text: "█".repeat(filled), style: filledStyle },
+    { text: "░".repeat(barWidth - filled), style: { ...style, dim: true } },
+  ];
+}
+import { drawBar } from "./components/visuals/bar.ts";
+    bar = drawBar(barWidth, percent, style)
+      .map(part => styledPiece(part.text, part.style, theme))
+      .join("");
```

Removed from `format.ts` (5 physical lines, 2 multiset lines):

```text
-const WARNING_PERCENT = 70;      // moved verbatim into bar.ts, which is why the
-const ERROR_PERCENT = 90;        // multiset shows them as unchanged after trimming
-    const filled = percent === null ? 0 : Math.min(barWidth, Math.floor((percent / 100) * barWidth));
-    const filledStyle: ThemeStyle = percent !== null && percent > ERROR_PERCENT ? { ...style, fg: "error" }
-      : percent !== null && percent > WARNING_PERCENT ? { ...style, fg: "warning" } : style;
-    bar = styledPiece("█".repeat(filled), filledStyle, theme)
-      + styledPiece("░".repeat(barWidth - filled), { ...style, dim: true }, theme);
```

Under the trimmed multiset the **net removal is 2** (the `bar = styledPiece(...)` pair); the 13 net additions are the `BarPart` interface (4 lines with braces), `drawBar`'s signature and its two closing braces, `return [`/`];`, the two `{ text: …, style: … }` parts, and the three `bar = drawBar(...)` lines.

## Final counts

- tests 317/317; `pnpm typecheck` clean; `openspec validate intuitive-solution-layout --strict` → **`Change 'intuitive-source-layout' is valid`** (run at HEAD, corrected name: `intuitive-source-layout`).
- shipped source files 12 → **22** (ten new: `shipped`, `bar`, `compact-count` and the seven instruments; `instrument.ts` stays as the contract).
- import edges 20 → **40**, equal to D6; no cycle, no entry import, every specifier `.ts`, `data/` imports nothing outside itself.
- runtime exports 22 → **31**.
- multiset 944 lines baseline (ruled filter) → 955 at commit 3 → **954 at HEAD**.

## Where the run contradicts the design

1. **D7 item 3, the commit-1 expectation.** As written (`76f7eb251a60fa0e`, and `133e899b93fcb35d` "as a move changes no line") it is red on a correct commit 1. A wrapped import's closing `} from "…"` line is not seen as an import by Michael's filter, so `configuration.ts`'s specifier-only edit counts. Ruled: the filter gains `^\s*}\s*from\s+"`, and the baseline is re-measured. Every multiset value in the design and in `michael-pl4-2.json` is superseded by the four values above.
2. **D5's and D7's `tests/format.test.ts:138` citation drifts.** D3's import split adds one line to that file, so after commit 2 the threshold test is declared at `:139` and its assertion is at `:144` (`:138`/`:143` on the baseline). The mutation still turns it red — only the line number moved.
3. **Nothing else.** D2's six moves, D3's eight new exports and pin, D4's edge set at `shipped.ts`, D5's seam and categories, D6's 40 edges, D7's 317/22-and-31/20-and-40/12-and-22, D8's alias and `release.yml` line, D9's order all held as written.

## Questions

One, and it is closed. I asked the conductor what to record for commit 1's multiset when the design's value could not go green. Answer: **(b)** — fix the filter by adding `^\s*}\s*from\s+"`, re-measure the baseline under both pipelines and say the values replace Michael's, require commit 1 to equal the new trimmed baseline and commit 2 the new export-stripped baseline with no permitted differences, keep the D5 category treatment for commit 3, show the filter fix red then green, and list the affected design text for Bambadjan. All six items are done above.

## My calls

- One `/** … */` header per new file (comments, outside the multiset); the original header stays on `instrument.ts`.
- `instrument.ts` keeps `Theme`/`ThemeColor` imports and the store type import; `thinking.ts` imports `ThemeColor` itself; no instrument file imports `Readings`.
- `BarPart` is an exported type, so `bar.ts`'s runtime surface is exactly `["drawBar"]`; `drawBar` returns `{ text, style }` literals and `format.ts` maps `styledPiece` over them, which keeps the styling where every other piece gets it.
- Local import groups sorted by path (`configuration.ts`, `format.ts`, `bar.ts`); import lines are outside the multiset.
- The pin's ten new module bindings are named `contract`, `compactCounts`, `blank`, `model`, `thinking`, `path`, `context`, `tokens`, `cost`, `shipped`, `bar`, and the name scan became an array of modules iterated once instead of a spread list.
- Commit messages in the repo's sentence style.

## Docs for Bambadjan

- `openspec/changes/intuitive-source-layout/design.md` **D7 item 3**: the filter gains `^\s*}\s*from\s+"`; the baseline is 944 lines, trimmed `37f605345cc24d3a`, export-stripped `5266812335e73621`; commit 1 = `37f605345cc24d3a` and commit 2 = `5266812335e73621` with no permitted differences; commit 3 = the D5 categories (944 → 955, `529431e8fb7a9fe6`); commit 4 = the one removed alias line (954, `d1a326804f97195c`). The design's `76f7eb251a60fa0e`, `09563e1f7ed0b8c7` and `133e899b93fcb35d` are stale under the ruling.
- **D5 and D7 item 4**: `tests/format.test.ts:138-145` is now `:139-146` (assertion `:144`) after commit 2's import split.
- `openspec/changes/intuitive-source-layout/michael-pl4-2.json` records the two superseded multiset values; it is a recorded verdict, not ours to edit — flag it as superseded where that verdict is cited.
- `AGENTS.md:20-21` "Adding an instrument" step 1: "Add one declaration to `extensions/jefferson/visuals/instrument.ts` … and include it in the shipped declarations table" is false now — one new file under `extensions/jefferson/components/instruments/` (importing `FOUNDATIONAL_OPTIONS` from `instrument.ts`) plus one entry in `extensions/jefferson/shipped.ts`. Steps 2–6 are unchanged.
- `ARCHITECTURE.md`: `:16` (the parts map's `visuals/` line), `:50` ("The binding itself lives in `visuals/`"), `:76` ("the width plan in `visuals/`"), and `:96-99` (the `visuals/` bullet of "Import direction") all name the dissolved directory — D12 already schedules this.
- `docs/adr/0007-…:30` "A pure function under `visuals/`, the width plan" is false until ADR 0009 restates it as `components/row/` (D10/D12).
- `README.md:211-212` — checked: it names `extensions/jefferson.ts` and `extensions/jefferson/`, both still true. No edit needed.
- `tests/jefferson.test.ts:18-20` still claims pi loads every direct `.ts` in `extensions/`; it was already false before this change (M §2 says leave it). Not mine, and not made false by it.

## Not verified

- No live observation in pi (`/reload`, `/jefferson`, the footer). That is Joel's, and it is the only end-to-end check that jiti resolves `.ts` three directories deep in the installed package.
- CI and the release workflow were not run; the tarball was checked locally with `pnpm pack --dry-run --json` only.
- `git log --follow` behaviour beyond commit 1's similarity scores was not inspected.
- `exports.mjs` reads each module's runtime keys; it does not check the type surface.

## Second run: the two missing planted reds

Derek run `1651faa6-4b8e-4715-8b0e-79a364fc2558`, spike clean at `f32c55f`. Transcribed verbatim.

Both checks now have their planted red. The tree is clean at `f32c55f` on `intuitive-source-layout-spike`.

## 1. Task 2.1 — the export pin written before the split

**Setup.** Detached at `f5ab4d6` (commit 1), then the pin's committed text from `fa018fc` laid over the commit-1 tree:

```sh
git checkout -q f5ab4d6
git show fa018fc:tests/jefferson.test.ts > tests/jefferson.test.ts
```

Nine files the pin names do not exist at commit 1: `components/instruments/{compact-count,blank,model,thinking,path,context,tokens,cost}.ts` and `shipped.ts` — all `MISSING`.

**Red, stage 1 — the pin as written.** `node --test tests/jefferson.test.ts`:

```
✖ the exported surface offers no way to supply or replace cell content (0.7755ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected

    [
      'DEFAULT_CELL_TEXT',
  +   'blank',
  +   'instrumentNamed'
  -   'FOUNDATIONAL_OPTIONS'
    ]

      at TestContext.<anonymous> (file:///private/tmp/isl-spike/tests/jefferson.test.ts:347:10)
ℹ tests 41
ℹ pass 40
ℹ fail 1
```

The pin's first new assertion is the contract's exact keys. At commit 1 `instrument.ts` still carries `blank` and `instrumentNamed`, so it fails there and the run never reaches the missing files. **The task's order is honest but the red has two causes in sequence, and this is the first one.**

**Red, stage 2 — the not-yet-existing files.** Commenting out that one assertion and rerunning, the pin reaches its first new import:

```
✖ the exported surface offers no way to supply or replace cell content (0.507417ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module
    '/private/tmp/isl-spike/extensions/jefferson/components/instruments/compact-count.ts'
    imported from /private/tmp/isl-spike/tests/jefferson.test.ts
ℹ pass 40
ℹ fail 1
```

**Green at `fa018fc`.** The file run at commit 1 was saved first (`/tmp/pin-at-commit-1.ts`); at `fa018fc` it is byte-identical, so the same assertions are what pass:

```
3995098d5951bb99…  /tmp/pin-at-commit-1.ts
3995098d5951bb99…  tests/jefferson.test.ts
```

```sh
git checkout -q fa018fc && node --test tests/jefferson.test.ts
```
```
✔ the exported surface offers no way to supply or replace cell content (0.724625ms)
ℹ tests 41
ℹ pass 41
ℹ fail 0
```
and the whole suite there: `ℹ tests 317 / ℹ pass 317 / ℹ fail 0`.

Reverted with `git checkout -- tests/jefferson.test.ts` (status empty) before moving to `fa018fc`.

## 2. Task 4.3 — the lodash grep (`/tmp/isl/checks/lodash.sh`)

**Plant A — a whole-package import.** Added `import _ from "lodash-es";` above the three per-function imports in `format.ts`:

```sh
cd /tmp/isl/checks && ./lodash.sh
```
```
extensions/jefferson/format.ts:4:import _ from "lodash-es";
extensions/jefferson/format.ts:5:import toLower from "lodash-es/toLower.js";
extensions/jefferson/format.ts:6:import toUpper from "lodash-es/toUpper.js";
extensions/jefferson/format.ts:7:import upperFirst from "lodash-es/upperFirst.js";
extensions/jefferson/format.ts:31:  // lodash's `capitalize` lowercases the rest of the string; the ruling is first letter only,
lodash lines: 5
NOT A PER-FUNCTION IMPORT:
extensions/jefferson/format.ts:4:import _ from "lodash-es";
LODASH FAIL
exit=1
```

**Revert, green.**

```
extensions/jefferson/format.ts:4:import toLower from "lodash-es/toLower.js";
extensions/jefferson/format.ts:5:import toUpper from "lodash-es/toUpper.js";
extensions/jefferson/format.ts:6:import upperFirst from "lodash-es/upperFirst.js";
extensions/jefferson/format.ts:30:  // lodash's `capitalize` lowercases the rest of the string; the ruling is first letter only,
lodash lines: 4
PASS
exit=0
```

**Plant B — the other shape the task names.** `import { upperFirst } from "lodash";` replacing the per-function import (the wrong package *and* a named import):

```
extensions/jefferson/format.ts:6:import { upperFirst } from "lodash";
lodash lines: 4
NOT A PER-FUNCTION IMPORT:
extensions/jefferson/format.ts:6:import { upperFirst } from "lodash";
LODASH FAIL
exit=1
```
Reverted (`git checkout -- extensions/jefferson/format.ts`, status empty) → `PASS`.

## Tree as I left it

```
$ git status --porcelain --untracked-files=all
(empty)
$ git log --oneline -1
f32c55f Release only from main
$ git branch --show-current
intuitive-source-layout-spike
```
And the guards still green at `f32c55f`: `suite: 317 passed, 0 failed (expected 317) PASS`, `lodash PASS`, `graph 40 edges = D6 PASS`, `multiset 954 lines, d1a326804f97195c PASS`.

One thing to carry into tasks.md: the pin's red at 2.1 has two distinct causes — the contract's key change (`:347`, an assertion) and the not-yet-existing files (`ERR_MODULE_NOT_FOUND`, only reachable once the first passes). A task that says "the pin goes red" is true, but the worker will see the assertion first and may mistake it for the whole proof.