# PR review: #20 `intuitive-source-layout` into `main`

**Head commit reviewed:** `af589fa344e40f3b61c33c0f9cbc7543833f300f` (confirmed with `gh pr view --json headRefOid` at the start and at the end).

**Load assumed:** one person running a pi extension in a terminal. The only shared system is the release workflow, which runs on each push to `main`.

**What this change does:** It moves the source under `extensions/jefferson/` into a new tree. The `visuals/` directory is gone. `components/instruments/` holds one file per instrument, the contract, the binding and the count formatter. `components/row/` holds the row, the width plan and the renderer. `components/visuals/bar.ts` holds the progress bar. `format.ts` and `shipped.ts` sit at the top. It also adds one `if:` line to the release job, and `format.ts` now imports the `Readings` type instead of rebuilding it.

## How I checked it

- I read the whole code diff and every moved or new file, then each caller of the moved modules: `configuration.ts`, `footer-setup.ts`, `instrument-binding.ts` and the tests.
- I compared the bar code before and after, line by line. `drawBar` gives the same filled count, the same 70 and 90 thresholds, the same colors and the same dim track. `format.ts` runs each part through `styledPiece` in the same order and joins them.
- I compared the instrument declarations before and after. They are the same code, split across files. `shipped.ts` keeps the same list and the same `Object.hasOwn` lookup.
- I walked the import graph by hand against the spec's one-way rules. Instrument files import only `instrument.ts`, `compact-count.ts` and the `Readings` type. Row files import only their own directory and one type. `bar.ts` imports only a host type. `data/` imports nothing local. The only runtime cycle risk is `instrument-binding.ts` → `format.ts` → `bar.ts`, and it is one way. The `format.ts` → `instrument.ts` import is type-only.
- I ran `pnpm typecheck`, which is clean. I ran `pnpm test`, which passes 317 of 317. I ran `pnpm pack --dry-run`, which lists 22 files under `extensions/` plus `package.json`, `README.md` and `LICENSE`. The new files are in it, and `files` and `pi.extensions` are untouched.
- I searched the repo for stale `visuals/` paths. The only ones left are in ADR 0005 and ADR 0007. Those are accepted records, and ADR 0009 says it revises them.
- I held the diff against each requirement in `specs/extension-source-layout/spec.md`. The one-file-per-instrument, ruled-homes, import-direction, bar-file and published-surface requirements are met. The proof-of-unchanged-behavior requirement points at check scripts in the change directory. I did not rerun those.

## Must fix

None.

## Should fix

None.

## Nice to have

1. **The export-pin test repeats the same three lines eleven times** (`tests/jefferson.test.ts`, about L346-377)
   - **What this is:** The "no way to supply cell content" test checks the exported names of each new file. It does this with an `await import(...)` and an `assert.deepEqual`, once per file. It then lists the same modules again in `scanned`.
   - **Problem:** Each new instrument adds another three-line block here, and the paused change adds three more. The blocks differ only in file name and expected export. Nothing is wrong today. It is bulk that will grow.
   - **Fix:** Keep one table of `[path, expectedKeys]` pairs. Loop over it to import, pin and scan. This removes roughly 20 lines and gives each new instrument one line to add.
   - **If we skip it:** Nothing breaks. The test stays long, and each new instrument costs three more lines.

Lean: -20 lines possible.

## Notes, not findings

- `components/visuals/bar.ts` has no test file of its own. The threshold and fill cases are covered through `resolveFormat` in `tests/format.test.ts` (L141: 70, 70.1, 90 and 90.1). Those tests would fail if the thresholds or the fill rule changed, so this is enough.
- `release.yml`: the `if: github.ref == 'refs/heads/main'` line is on the only job. A push to `main` still releases, and a manual dispatch from another branch now skips the job. That is the intended fix, and I found no problem with it. The effect can only be seen on GitHub, not locally.
- The pull request description is clear about everything I needed. It names the riders and the proof checks. I found nothing I could not settle without the design files.

## Verdict

Verdict: Ship.

Not checked: the live `/reload` and `/jefferson` run inside pi (task 7.1, Joel's own check) was not run. It is the only proof that the host resolves files three directories deep. I also did not rerun the scripts in `openspec/changes/intuitive-source-layout/checks/`, did not trigger the release workflow, and did not read `design.md`, `tasks.md`, the council or the review files, as instructed.
