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

## Group 3 — declarations, format language, bound instruments

Conductor answers:

- Approved migrating the configuration tests' retired blank/model/thinking object-identity assertions to observable rendered text and same-bound-object identity within one read of one document. No cross-document identity is asserted; normalization, error-message and alignment expectations stayed byte-identical. The migrated subjects are omitted cells, declared cell order, default alignment's instrument, containers' blank cells, unknown-name fallback/siblings, and each cell's instrument.
- Approved honest TS2307 compile-time reds for 3.2–3.10 while the new format.ts (and task-named fake-theme.ts) did not exist, with no test-only stubs. The tests and real sources commit together, never as a red suite. After implementing the real sources, assertion-level mutations below prove the intended discriminators; the final 7.5 sweep is still required.

3.1 runtime red: declaration.name was undefined, expected blank; tests 6 / pass 1 / fail 5. Typecheck named missing InstrumentDeclaration (TS2305) and missing format.ts (TS2307). The inherited-name lookup was already own-safe and baseline green; its mutation below is its assertion proof. 3.2–3.10 each ran pnpm typecheck and exited 1 with TS2307 on the missing format.ts. After 3.11, the two declaration-shape/lookup tests pass. After 3.12–3.14, all 157 tests pass. Default bytes, all band edges, unknown/null/zero boundaries, and the bound cost/tokens footer agreement run through real declarations and the language.

Early assertion demonstrations (every edit individually restored; every command exited 1 at an AssertionError, not import/loading failure):

| Edit | Catching test | Result |
|---|---|---|
| 3-1: escape loses its literal-dollar meaning (extensions/jefferson/format.ts) | an escaped dollar is literal text, not a variable | exit 1, assertion red; restored |
| 3-2: brackets become groups (extensions/jefferson/format.ts) | brackets and parentheses are literal text rather than groups | exit 1, assertion red; restored |
| 3-3: Markdown markers are stripped (extensions/jefferson/format.ts) | Markdown characters in formats and values remain literal | exit 1, assertion red; restored |
| 3-4: unknown-variable guard removed (extensions/jefferson/format.ts) | an unknown variable rejects naming the instrument and variable | exit 1, assertion red; restored |
| 3-5: undeclared bar allowed (extensions/jefferson/format.ts) | bar is rejected when the declaration has no width-taking variable | exit 1, assertion red; restored |
| 3-6: second-bar guard removed (extensions/jefferson/format.ts) | a second bar rejects naming the second width-taking variable | exit 1, assertion red; restored |
| 3-7: bare-dollar guard removed (extensions/jefferson/format.ts) | a bare dollar rejects with the literal-dollar escape in the message | exit 1, assertion red; restored |
| 3-8: variable name stops early (extensions/jefferson/format.ts) | variable names consume the maximal alphanumeric and underscore run | exit 1, assertion red; restored |
| 3-9: empty format gains a segment (extensions/jefferson/format.ts) | an empty format has no segments and renders empty text | exit 1, assertion red; restored |
| 3-10: trailing backslash discarded (extensions/jefferson/format.ts) | a trailing backslash is literal | exit 1, assertion red; restored |
| 3-11: resolve only named variables (extensions/jefferson/format.ts) | unknown suppresses the whole model declaration even under a model-only format | exit 1, assertion red; restored |
| 3-12: compact band moved to host cutoff (extensions/jefferson/instrument.ts) | compact counts follow the ratified decimal band rather than the host's 10000 cutoff | exit 1, assertion red; restored |
| 3-13: null tokens become zero (extensions/jefferson/instrument.ts) | context distinguishes known estimates, null estimates, absent usage and real zero | exit 1, assertion red; restored |
| 3-14: null percent becomes zero (extensions/jefferson/instrument.ts) | context distinguishes known estimates, null estimates, absent usage and real zero | exit 1, assertion red; restored |
| 3-15: path returns whole cwd (extensions/jefferson/instrument.ts) | path renders only the basename including trailing-separator and root boundaries | exit 1, assertion red; restored |
| 3-16: token sum drops cache categories (extensions/jefferson/instrument.ts) | token variables use the four totals fields and cost uses the same totals | exit 1, assertion red; restored |
| 3-17: cost precision changes (extensions/jefferson/instrument.ts) | percent and cost variables arrive already formatted without a subscription annotation | exit 1, assertion red; restored |
| 3-18: bar ignores prose width (extensions/jefferson/format.ts) | bar takes the fourteen columns left by six columns of prose | exit 1, assertion red; restored |
| 3-19: bar refuses to shrink to zero (extensions/jefferson/format.ts) | a bar with no room contributes no track or escapes and leaves prose for the cell to clip | exit 1, assertion red; restored |
| 3-20: style wraps the whole format (extensions/jefferson/format.ts) | bar placement styles each prose segment so trailing prose keeps its configured style | exit 1, assertion red; restored |
| 3-21: warning threshold becomes inclusive (extensions/jefferson/format.ts) | bar thresholds replace only foreground above seventy and ninety | exit 1, assertion red; restored |
| 3-22: error threshold becomes inclusive (extensions/jefferson/format.ts) | bar thresholds replace only foreground above seventy and ninety | exit 1, assertion red; restored |
| 3-23: dim track loses configured background (extensions/jefferson/format.ts) | bar thresholds replace only foreground above seventy and ninety | exit 1, assertion red; restored |
| 3-24: null estimate fills the track (extensions/jefferson/format.ts) | a null estimate draws an entirely dim track beside the unknown estimate | exit 1, assertion red; restored |
| 3-25: fill rounds instead of floors (extensions/jefferson/format.ts) | bar-only formats fill their cell with clamped and floored pressure | exit 1, assertion red; restored |
| 3-26: collapse runs instead of characters (extensions/jefferson/format.ts) | control characters collapse per character in literals and substituted values | exit 1, assertion red; restored |
| 3-27: collapse moved after styling (extensions/jefferson/format.ts) | collapse runs before styling so data ESC becomes a space and the cell's SGR survives | exit 1, assertion red; restored |
| 3-28: variable lookup accepts inherited members (extensions/jefferson/format.ts) | inherited object properties are unknown format variables | exit 1, assertion red; restored |
| 3-29: instrument lookup accepts inherited members (extensions/jefferson/instrument.ts) | unimplemented and inherited names stay unresolved however often asked | exit 1, assertion red; restored |
| 3-30: collapse runs instead of characters (extensions/jefferson/format.ts) | control characters collapse per character in literals and substituted values | exit 1, assertion red; restored |

Raw group boundary after all restorations:

```text
$ tsc --noEmit
typecheck_exit=0
ℹ tests 157
ℹ suites 0
ℹ pass 157
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 310.215917
test_exit=0
```

The format geometry search finds only the one control-collapse replacement space; no truncateToWidth or padding exists in format.ts. The entry/configuration export pins are unchanged; the renderer pin is createFooter only. The contribution-key sweep now includes format.ts.
