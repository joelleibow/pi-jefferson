# Implementation evidence — configurable-instruments

All commands ran from the repository with `direnv exec .`. Check commands below use the project's pnpm runner. Scratch logs and mutation copies live outside the repository.

## Ground and contract answers

- Initial tree: clean `main` at `cf76151`; conductor approved that head instead of launch's `a593506` (the difference was gate metadata).
- Conductor then persisted the missing specialist addenda at `ca9db67` and authorized it as the branch base; `configurable-instruments` starts there.
- Retained host evidence: `research-chidi.md`, `research-chidi-addendum-1.md`, `research-chidi-addendum-2.md`, `research-chidi-addendum-3.md`; repository evidence: `research-eleanor.md`.
- Conductor confirmed tasks.md's PL7-approved group order supersedes design.md's Migration Plan execution order. Layout is group 2.
- Conductor confirmed tasks 1.6 / Michael PL7 finding 8 settle live-reader totality: no catch; disposal precedes context invalidation. The brief's open-point sentence was stale.
- Baseline `pnpm typecheck`: exit 0, `$ tsc --noEmit`, no diagnostics. Baseline `pnpm test`: tests 114, pass 114, fail 0, exit 0.

## Group 1 — store

Red commands: `pnpm exec node --test tests/session-data-store.test.ts` (1.1); targeted `--test-name-pattern` runs for 1.2, 1.3, 1.4, 1.6; `pnpm typecheck` for 1.1 and 1.5. All exited 1 as intended:

- 1.1: keys assertion returned only provider/model/thinkingLevel, missing cwd/contextUsage/totals; null-estimate assertion returned undefined. Typecheck reported missing Readings members and readers.
- 1.2: all-category, branch-summary and empty scan assertions returned undefined instead of five totals.
- 1.3: one-key scan count was 0, expected 1; moved-key totals were undefined.
- 1.4: per-sample context assertion returned undefined instead of the host's usage.
- 1.5: TS2339, `Property 'turnEnded' does not exist on type 'SessionDataStore'` at all six calls (the task's named compile-time red).
- 1.6: disposed keys assertion was missing the three new unknowns; pre-disposal value assertion was missing the new datums.

Green: store file 28/28; entry file 23/23. The fixture-only assertion diff was empty for instrument/renderer tests. Both prescribed host-handle/forbidden-getter searches were empty.

Raw group boundary:

```text
$ tsc --noEmit
typecheck_exit=0
ℹ tests 128
ℹ suites 0
ℹ pass 128
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 297.0065
test_exit=0
```
