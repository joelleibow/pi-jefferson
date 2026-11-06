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

## Group 2 — tests prepared; implementation paused

- 2.1 red: three geometry tests, pass 1 / fail 2; the two remainder assertions still receive blank right-edge columns.
- 2.2 red: resize, identity and per-row first-seat tests all fail; identity resolves twice rather than once at constant sample/width.
- 2.3: install sample count red (0 versus 1), across-render half already green on the existing rebuilt tree. Conductor approved keeping these assertions and proving the latter with 7.5's width-only-memo mutation; if it does not fail, stop rather than adjusting the test. The task carries that note.
- 2.4 red: moved renderer tests, tests 26 / pass 11 / fail 15, all assertion failures on the existing geometry/tree/sample behavior. The renderer export pin still names renderRow until 2.6 retires it as planned.
- 2.5 baseline: the specified constant-sample invalidate test is already green on the per-render tree (three rows resolve 3 times before and 6 after invalidation). The task's claimed pre-2.6 red does not exist. Asked the conductor to approve showing its red after building the planned once-built tree with invalidate initially unchanged, then wiring the planned cascade for green. Repeated decision contacts timed out; no dependent production edits made.
- No group-2 box ticked and no red commit made. Remaining production work, mutations, strict validation, push and PR are not done. 7.6 remains Joel's.

Raw paused-tree checks:

```text
$ tsc --noEmit
typecheck_exit=0
ℹ tests 132
ℹ suites 0
ℹ pass 117
ℹ fail 15
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 454.3325
test_exit=1
```

### Group 2 completion after resume

The conductor confirmed 2.5's baseline-green handling: keep the assertion, demonstrate its red against the designed once-built tree with footer.invalidate temporarily still a no-op, then wire the designed cascade. That exact targeted run failed at `assert.equal(resolves, 6)`, actual `3`, expected `6`, exit 1. After the cascade, renderer tests 27/27 pass. No assertion changed during the demonstration.

All three prescribed renderer searches are empty when scoped as the tasks specify (encapsulation and retired geometry in the source; renderRow in tests). The sole pi-tui import names HStack, VStack, truncateToWidth, visibleWidth and type Component. The entry-test diff at this boundary changes only the renderer export pin; the default/rejected-document and right-alignment end-to-end expectations are unchanged.

Raw group boundary:

```text
$ tsc --noEmit
typecheck_exit=0
ℹ tests 132
ℹ suites 0
ℹ pass 132
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 438.091583
test_exit=0
```
