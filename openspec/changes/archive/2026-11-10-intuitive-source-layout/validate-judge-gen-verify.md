# Verification Report: intuitive-source-layout

Branch `intuitive-source-layout`, head `af589fa344e40f3b61c33c0f9cbc7543833f300f`. This matches PR #20's `headRefOid`. Schema `marbleization`. Read-only. The repository is clean after the run (`git status` is empty). Scratch copies are in `/tmp/isl/v-c1` to `v-c4`, made with `git archive`.

## What I ran, and what it printed

I ran every script from `openspec/changes/intuitive-source-layout/checks/` with this repository's path.

On the branch head:

| Check | Output |
|---|---|
| `./suite.sh 317 R` | `tsc --noEmit` clean. `suite: 317 passed, 0 failed`. PASS |
| `./multiset.sh d1a326804f97195c R` | `954 lines, d1a326804f97195c`. PASS |
| `node graph.mjs R expected/edges-final-D6.txt` | `files: 22`, `edges: 40`, matches the expected 40. No cycle, no entry import, no bad specifier. PASS |
| `node exports.mjs R expected/exports-final.txt` | `union: 31` (30 plus `drawBar`). PASS |
| `./tarball.sh R` | 22 source files under `extensions/`, 22 tracked. Only `LICENSE`, `README.md`, `package.json` and `extensions/`. PASS |
| `./lodash.sh R` | Three per-function `lodash-es/<fn>.js` imports in `format.ts`, plus one comment line. PASS |
| `openspec validate intuitive-source-layout --strict` | `Change 'intuitive-source-layout' is valid` |

Per-commit checks, on `git archive` copies of each commit:

| Commit | Check | Output |
|---|---|---|
| 1, `ec16431` | `renames.sh f685054 ec16431 R` | `renames: 6`, R098 ×5 and R092 (`row.ts`). PASS |
| 1 | multiset `37f605345cc24d3a` | 944 lines. PASS |
| 1 | graph | 20 edges. PASS |
| 1 | suite | 317. PASS |
| 2, `b520e82` | multiset `--strip-export 5266812335e73621` | 944 lines. PASS |
| 2 | exports | 30. PASS |
| 2 | graph | 38 edges. PASS |
| 2 | suite | 317. PASS |
| 2 | tarball | See the note after this table. |
| 3, `ee2cbe0` | multiset `529431e8fb7a9fe6` | 955 lines. PASS |
| 3 | graph | 39 edges. PASS |
| 3 | suite | 317. PASS |
| 4, `542b95c` | multiset `d1a326804f97195c` | 954 lines. PASS |
| 4 | suite | 317. PASS |

Three things in that table need explaining:

- **Commit 2 tarball:** `tarball.sh` failed there because the `git archive` copy has no `.git`. That is an artifact of my scratch copy, not a defect. The copy holds 21 `.ts` files, matching task 2.6's "21".
- **`renames.sh`:** on the whole branch against `main` it prints `NOT FOLLOWED AS A RENAME` for the ten new split files and the old `instrument.ts`, then `RENAME FAIL`. That is expected. The script is scoped to commit 1 (task 1.4), where it passes.
- **Threshold mutation (task 3.2):** I re-ran it in the scratch copy. I set `WARNING_PERCENT` to 71 and `ERROR_PERCENT` to 91 in `components/visuals/bar.ts`. The result was `✖ bar thresholds replace only foreground above seventy and ninety`, 316 pass and 1 fail. I made the change only in the scratch copy.

I also read the rest of the change:

- **Release line:** the `release.yml` diff is one added line, `if: github.ref == 'refs/heads/main'`.
- **Source:** I read `bar.ts`, `shipped.ts`, `format.ts`, the `configuration.ts` and `footer-setup.ts` diffs, and the import lines of every instrument file.
- **Tests:** I read the `tests/` diff. The only non-import hunks are the exact-key pin assertions, the widened name scan, and the stability block reading `instrumentNamed` from `shipped.ts`.
- **Spec sizes:** every requirement paragraph in the delta spec measures under 500 characters (290 to 447 by my awk, 491 for the first MODIFIED one by the design's own record).

## Summary

| Dimension | Status |
|---|---|
| Completeness | 23/26 tasks ticked. The 3 open tasks are the expected ones: 7.1, 8.1, 8.2. 8 requirements in the delta spec (6 ADDED, 2 MODIFIED), all with implementation. |
| Correctness | 8/8 requirements covered. All 22 scenarios have a code path or a check that evidences them. |
| Coherence | Followed. D1 to D12 are matched in the tree. Two SUGGESTIONs, below. |

Not verified: the end-to-end resolution of the moved files by pi in a live session. That is task 7.1, Joel's, and it is expected open.

## Completeness

- **Tasks:** 1.x to 6.x are all ticked, and the evidence I re-derived supports each tick. 7.1, 8.1 and 8.2 are open as the brief expects.
- **Task 8.1:** the lengths I measured are all under 500, so the pre-sync measure should pass.
- **Proposal and capabilities:** the change touches only `extension-source-layout`. The two named living requirements are modified, as the proposal says.

## Correctness (requirement to evidence)

- **Each shipped instrument has its own source file.** Seven files under `components/instruments/`: `blank`, `model`, `thinking`, `path`, `context`, `tokens`, `cost`. `shipped.ts:1-14` imports all seven and resolves them in `instrumentNamed`. The pin in `tests/jefferson.test.ts` fixes each file's exact keys, and the export union moved from 22 to 31, which is exactly the 22 plus the 9 the design argues.
- **The source tree has the ruled homes.** The tree matches D1. `extensions/jefferson/visuals/` does not exist. `format.ts`, `shipped.ts`, `startup.ts`, `configuration.ts` and `footer-setup.ts` are directly under `jefferson/`. `components/row/` holds exactly `row`, `width-plan` and `row-renderer`.
- **Imports between the homes run one way.** The graph's 40 edges show:
  - `data/` imports only within itself.
  - No instrument file imports `shipped`, `format`, `components/row/` or another instrument. `context` and `tokens` import `compact-count`.
  - `shipped.ts` imports all seven instruments.
  - Row files import only the row's own files, the data type and `instrument.ts` (type).
  - The importers of the instrument files are `shipped.ts` and `configuration.ts` (for `blank`).
- **The bar has its own file.** `components/visuals/bar.ts:1-27` holds the glyphs, the filled portion and the thresholds. It imports only the `ThemeStyle` type from the host package. `format.ts:5,193-197` parses `$bar`, measures the width and applies `styledPiece` to each returned part. The bar-render output is unchanged: the suite passes, and the threshold mutation turns the existing test red.
- **A layout change leaves the published surface unchanged.** The tarball check shows only `extensions/` plus the three root files. The diff touches neither `package.json` nor `pi.extensions`. The entry is still `extensions/jefferson.ts`.
- **The change carries the proof of unchanged behavior.** All seven checks exist and I reproduced them. The PR body (PR #20) attaches the results.
- **MODIFIED requirements.** `data/` imports nothing from `components/`, `format.ts` or `shipped.ts` (`session-data-feed.ts` imports only the store). A format file reading data types is exactly the `format.ts -> data/session-data-store.ts` type edge.

## Coherence

- **Design adherence:**
  - D1 to D4: the tree, the moves, the split and `shipped.ts` match.
  - D5: `drawBar` has the designed signature, and the multiset differences by category match.
  - D6: the edge list equals D6's, and no cycle exists.
  - D7: all seven items are reproduced.
  - D8: finding 7 is fixed (`format.ts:10`, no `Instrument` import left), and the `release.yml` line is exactly one line.
  - D9: the five commits are in the designed order, and each one is green on the 317-test suite.
  - D10: ADR 0009 exists, ADR 0005's body is not edited, and ADR 0007's sentence is restated by ADR 0009.
  - D11: no change to `instruments-for-every-datum`.
- **D12 docs:** `AGENTS.md` and `ARCHITECTURE.md` are updated. A grep for stale `visuals/` finds only ADR 0005 and 0007 (historical, by design), ADR 0009, `ARCHITECTURE.md` (correct `components/visuals/` references) and the living spec (stale until the 8.2 sync, expected). `README.md` names no moved path, so its lines 211 to 212 need no edit, even though D12 expected one.
- **Code pattern consistency:** file names are kebab-case and each file has a header doc comment. Relative imports carry the `.ts` extension, and only erasable TypeScript is used. This is consistent with the repository's `AGENTS.md`.

## Issues

**CRITICAL:** none.

**WARNING:** none.

**SUGGESTION:**

1. `tasks.md:2.7` says to "list each hunk's kind in the pull request". The PR body gives a one-line summary ("import specifiers, the export pin, and one renamed loop variable") but not a per-hunk list. The diff is small and fits that summary, as I confirmed by reading it. Either add the list to the PR or reword the task.
2. The `tasks.md` header says "No Markdown other than this file changes in the diff". The branch diff also changes `AGENTS.md`, `ARCHITECTURE.md` and ADR 0009, which are the docs pass (6.2, ticked), plus the many change-directory artifacts. The sentence is true of commits 1 to 5 only. Scope it to those commits so it doesn't mislead a later reader.

## Final assessment

No critical issues or warnings. 2 suggestions to consider. The only open items are Joel's live check (7.1) and the sync and archive (8.x), which the brief says come after this pass. 7.1 has not been observed in this report, so it is the one thing this pass could not verify.

**Verdict: Ready for archive, subject to Joel's observation (7.1) and the 8.x sync. Nothing blocks.**
