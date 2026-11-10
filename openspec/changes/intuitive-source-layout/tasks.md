# Tasks

Sources: [D n] `design.md`; [RG] `redgreen-derek.md`, the red/green run of every check (Derek, scratch spike, 2026-11-10); [R] Joel's rulings. This is a refactor, so a task's "failing test" is the check's planted red from [RG], which shows the check catches the mistake it exists for, and the green is its value on the real branch. The behavioral assertion is the existing suite's: the footer renders what it rendered before.

**How to run a check.** Every script is in `checks/` of this change directory. Run it from there and pass the repository path, `/Users/joelleibow/Projects/pi-jefferson` or the working branch (the scripts default to `/tmp/isl-spike`). `R` below stands for that path. Expected files are in `checks/expected/`.

- suite: `./suite.sh 317 R`
- multiset: `./multiset.sh [--strip-export] <hash> R`
- graph: `node graph.mjs R expected/<file>`
- exports: `node exports.mjs R expected/<file>`
- tarball: `./tarball.sh R`; lodash: `./lodash.sh R`
- renames: `./renames.sh <base> <head> R`

Each group is one commit [D9]. Each commit passes `suite` (317 of 317, `pnpm typecheck` clean) before the next starts. No Markdown other than this file changes in the diff. Logging and error handling: none added, because no task adds a use case, adapter or entry point.

## 1. Commit 1: the moves and specifiers [D2, D9]

- [x] 1.1 `git mv` the six files (`format.ts` to `jefferson/`; `instrument.ts` and `instrument-binding.ts` to `components/instruments/`; `row.ts`, `width-plan.ts` and `row-renderer.ts` to `components/row/`), then edit only import specifiers, the paths in comments, and the test specifiers (22 static, 18 dynamic) [D2]. Boundary: the wrapped import in `configuration.ts` changes on its closing `} from "…"` line only. Verify: `suite` green at 317 [RG §1]. Red proof: the planted-mutation checks in 1.3 and 1.4 run against this commit.
- [x] 1.2 Multiset equals the trimmed baseline, no permitted difference [D7 item 3]. Verify: `./multiset.sh 37f605345cc24d3a R` → `944 lines, 37f605345cc24d3a`, PASS. Red: `const GAP = 0;` → `const GAP = 1;` in `row-renderer.ts` gives `944 lines, 2b8f959eabac57a6` against `37f605345cc24d3a`, MISMATCH, then revert [RG §2, mutation first run at the final commit; value measured at commit 1 by Michael, `michael-pl7.json`]. The old filter on this correct commit reads red (`946 lines, 587b7aff55e3c2ff`), which is why the wrapped-import pattern is in the script [RG §2].
- [x] 1.3 Import graph after the moves: 20 edges, no cycle, no entry import, every specifier ends in `.ts` [D7 item 4]. Verify: `node graph.mjs R expected/edges-after-commit-1.txt` → PASS. Reds, all shown in [RG §3]: `row.ts` importing `jefferson.ts` (`IMPORTS ENTRY`, `CYCLE`); `format.ts` importing the binding (`CYCLE`); `from "./width-plan"` (`BAD SPECIFIER`).
- [x] 1.4 Rename similarity: six renames, each at or above 90%, no add-and-delete pair [D7 item 7]. Verify: `./renames.sh <base> <commit 1> R` → `renames: 6`, scores R098 ×5 and R092 (`row.ts`), PASS. If `row.ts` dips below 90 it is named in the pull request [D7 item 7]. Red, the mistake it catches (a move git reads as delete-plus-add, which loses `git log --follow`) [RG, "Third run: the rename check's planted red"]: a move whose target gains 40 lines (`row.ts` padded) prints `NOT FOLLOWED AS A RENAME A …/components/row/row.ts`, `NOT FOLLOWED AS A RENAME D …/visuals/row.ts` and `RENAME FAIL`; deleting `width-plan.ts` and adding an unrelated `plan.ts` prints the same two lines for those paths and `RENAME FAIL`. The clean commit 1 then reads `renames: 6 … PASS`.

## 2. Commit 2: the instrument split, the export and the pin [D3, D4, D6]

- [ ] 2.1 Pin first: `tests/jefferson.test.ts` gains an exact-keys assertion for `compact-count.ts`, `blank.ts`, `model.ts`, `thinking.ts`, `path.ts`, `context.ts`, `tokens.ts`, `cost.ts`, `shipped.ts` and `instrument.ts` (its two values `DEFAULT_CELL_TEXT` and `FOUNDATIONAL_OPTIONS`); the name scan `/register|supply|contribute/i` iterates every module once; the stability block (`:365-369`) reads `instrumentNamed` from `shipped.ts`. The importers of `blank` and `instrumentNamed` (`tests/instrument.test.ts:4`, `tests/row-renderer.test.ts:7`, `tests/format.test.ts:8`) change their import lines [D3]. Boundary: `SHIPPED` and `THINKING_FG` stay unexported, and a test that finds either as a key fails. Red, in two stages in sequence [RG, "Second run: the two missing planted reds" §1]: the pin laid over the commit-1 tree first fails on the contract's exact keys, because `instrument.ts` still carries `blank` and `instrumentNamed`; with that one assertion set aside, it fails with `ERR_MODULE_NOT_FOUND` for `compact-count.ts`. Green comes at the split (2.2). Verify: `suite` green at 317.
- [ ] 2.2 Split `instrument.ts` into the files of D3's table: the contract stays in `instrument.ts` (`FOUNDATIONAL_OPTIONS` exported), `compact-count.ts`, `blank.ts`, `model.ts`, `thinking.ts`, `path.ts`, `context.ts`, `tokens.ts`, `cost.ts`, and `shipped.ts` at `jefferson/` holding the private `SHIPPED` and `instrumentNamed`. `configuration.ts` imports `blank` and `instrumentNamed` from their new files [D6]. No instrument file imports `shipped.ts`, `format.ts`, `components/row/` or another instrument, except `context.ts` and `tokens.ts` importing `compact-count.ts`. Verify: `suite` green at 317.
- [ ] 2.3 Multiset equals the export-stripped baseline, no permitted difference [D7 item 3]. Verify: `./multiset.sh --strip-export 5266812335e73621 R` → `944 lines`, PASS [RG §2]. Red: the same `GAP` mutation as 1.2 gives `944 lines, fd73a940030b6d32` against `5266812335e73621` under `--strip-export`, MISMATCH, then revert [`michael-pl7.json`]. The plain trimmed hash moves here by exactly the eight `export ` additions, which is why this pipeline is the one commit 2 is judged under.
- [ ] 2.4 Export union is 22 plus the eight D3 names (30), nothing else [D7 item 2]. Verify: `node exports.mjs R expected/exports-after-commit-2.txt` → `union: 30`, PASS. Red: `const GAP` → `export const GAP` in `row-renderer.ts` gives `UNEXPECTED EXPORT GAP`, exit 1 [RG §4].
- [ ] 2.5 Import graph after the split: 38 edges, and `shipped.ts` imported by `configuration.ts` and by no instrument file [D4, D6]. Verify: `node graph.mjs R expected/edges-after-commit-2.txt` → PASS. Red: `cost.ts` importing `../../shipped.ts` gives `CYCLE shipped.ts -> cost.ts -> shipped.ts` and `UNEXPECTED EDGE`, 39 edges [RG §3]. The spec scenario "Who names the instruments" is read off this edge list.
- [ ] 2.6 Tarball lists 21 source files, with `pi.extensions` and `files` unchanged [D7 item 5]. Verify: `./tarball.sh R` → PASS. Reds: an extra `extensions/jefferson/notes.md` gives `NOT A SOURCE FILE` (13 against 12 tracked); a `files` exclusion of one tracked file gives `TRACKED BUT NOT SHIPPED` [RG §5].
- [ ] 2.7 Test-diff read: `git diff -U0 main -- tests/` holds only specifier lines, new import lines for relocated names, and the pin [D7 item 1]. Verify: read the diff and list each hunk's kind in the pull request.

## 3. Commit 3: the bar extraction [D5]

- [ ] 3.1 Create `components/visuals/bar.ts` exporting `BarPart` (a type) and `drawBar(barWidth, percent, style)`, holding `WARNING_PERCENT`, `ERROR_PERCENT`, `filled`, `filledStyle` and the two glyph strings, importing only `ThemeStyle` from the host package. `format.ts` computes `barWidth` and `percent`, calls `drawBar` and maps `styledPiece` over the two parts. `instrument-binding.ts`'s `fills` line stays [D5]. The pin gains `bar.ts` with exact keys `["drawBar"]`. Red: the pin's `bar.ts` import with its `["drawBar"]` assertion fails `ERR_MODULE_NOT_FOUND` on the commit-2 tree; green at this commit. Verify: `suite` green at 317; `format.test.ts`'s existing bar assertions are the byte-for-byte proof. Boundary: percent `null` (no filled part) and 0, 70, 70.1, 90, 90.1, 100.
- [ ] 3.2 Threshold mutation shown red in the new file [D5]. In `components/visuals/bar.ts` set `WARNING_PERCENT` to 71 and `ERROR_PERCENT` to 91; `pnpm test` fails `bar thresholds replace only foreground above seventy and ninety` at `tests/format.test.ts:144` (`AssertionError: 70.1 … actual '\x1B[34m…' expected '\x1B[33m…'`), then revert and `suite` returns to 317 [RG, threshold mutation]. The same mutation in `format.ts` on the baseline fails at `:143` (the test declared at `:138`); after commit 2 the test is declared at `:139` [RG "Where the run contradicts the design" 2].
- [ ] 3.3 Multiset differs from commit 2 by D5's categories and by nothing else: 944 → 955 lines, trimmed `529431e8fb7a9fe6`. Verify: `./multiset.sh 529431e8fb7a9fe6 R` → PASS, and diff the sorted line sets of commit 2 and 3 (trimmed): 13 added and 2 removed, the exact lines in D5. The five lines D5 requires identical (`WARNING_PERCENT`, `ERROR_PERCENT`, `filled`, both `filledStyle`) appear once in both sets [RG §2].
- [ ] 3.4 Export union is 31 with `drawBar` [D3, D5]. Verify: `node exports.mjs R expected/exports-final.txt` → `union: 31`, PASS. Red: as 2.4.
- [ ] 3.5 Import graph: 39 edges, the new one `format.ts -> components/visuals/bar.ts`, and `bar.ts` has no local import [D6]. Verify: `node graph.mjs R` lists 39 edges with no cycle (no expected file exists for this commit [RG §3]). Red: as 1.3.
- [ ] 3.6 Tarball lists 22 source files [D7 item 5]. Verify: `./tarball.sh R` → PASS.

## 4. Commit 4: audit finding 7 [D8]

- [ ] 4.1 `format.ts` deletes its private `Readings` alias and imports `Readings` as a type from `data/session-data-store.ts`; the then-unused `Instrument` type import is removed. Red: none beyond `pnpm typecheck`, which fails if the alias is deleted before the `Readings` import is added; the multiset in 4.2 is the check. Verify: `pnpm typecheck` clean and `suite` green at 317. Boundary: the data home's types are the only addition, so `data/` still imports nothing outside itself.
- [ ] 4.2 Multiset differs by the one removed line, `type Readings = Parameters<Instrument["render"]>[0];`: 955 → 954 lines, trimmed `d1a326804f97195c` [D7 item 3]. Verify: `./multiset.sh d1a326804f97195c R` → PASS. Red: the `GAP` mutation of 1.2 gives `fc4749a7838a1411` against this value [RG §2].
- [ ] 4.3 Final graph and lodash: `node graph.mjs R expected/edges-final-D6.txt` → 40 edges equal to D6's list, PASS; `./lodash.sh R` → per-function `lodash-es/<fn>.js` imports in `format.ts` only, PASS [D7 items 4 and 6; RG §3, §6]. Red: as 1.3 for the graph; the lodash check's reds [RG, "Second run: the two missing planted reds"]: a whole-package `import _ from "lodash-es"` and `import { upperFirst } from "lodash"` each print `LODASH FAIL`.

## 5. Commit 5: the `release.yml` line [D8]

- [ ] 5.1 The release job gains `if: github.ref == 'refs/heads/main'` [D8]. Verify: `git diff` shows the one added line in `.github/workflows/release.yml` and nothing under `extensions/` or in `package.json`; the multiset stays `d1a326804f97195c` [RG §2]. Not run: CI and the release workflow were not run in [RG]; no requirement covers this line.

## 6. Before the pull request

- [ ] 6.1 Final measures on the real branch, attached to the pull request: `suite` 317 of 317; multiset `d1a326804f97195c` at 954 lines; graph 40 edges; exports 31; tarball 22 source files; shipped files 12 → 22 [D7; RG "Final counts"].
- [ ] 6.2 Docs pass: design D12, plus Derek's "Docs for Bambadjan" list in [RG] (`AGENTS.md` "Adding an instrument"; `ARCHITECTURE.md`'s `visuals/` lines; ADR 0007:30 restated by ADR 0009). Not a task of Derek's [Michael's tasks gate].

## 7. Joel's observation (his, ticked only by him, before the archive)

- [ ] 7.1 **Joel.** In his own pi session on the branch, with his config unedited: `/reload` runs clean; `/jefferson` reports his footer installed with his two rows; his footer looks exactly as before. This is the only end-to-end check that pi resolves the moved files three directories deep [RG, "Not verified"].

## 8. Sync and archive

- [ ] 8.1 Re-measure every requirement paragraph in the delta spec under 500 characters before the sync (the PL4 measure was 400, 447, 441, 436, 290, 307 for the added six and 491 and 389 for the modified two). Verify: the awk count per paragraph, all under 500.
- [ ] 8.2 Sync the delta spec into `openspec/specs/`, then archive the change on the branch. Verify: `openspec validate --strict` green before the sync, and the archived directory exists after. The merge waits for Joel's go. The release is a patch, unlabelled [D, Migration Plan].
