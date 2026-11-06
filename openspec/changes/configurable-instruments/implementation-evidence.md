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

## Group 4 — document configuration and styles

Red runs 4.1–4.8 all failed at assertions before implementation: configured default/envelope/trust formats (3 failures), configured-by-name agreement (1), section notices (2), format guards and empty format (7), document style guards/accepted booleans (7), error precedence (align won instead of the instruments format error), footer style/clip/pad bytes (5), and theme-switch/harness scenarios (3). The new direct validateStyle tests also had the honest TS2339 missing-export compile red; ConfigurationSource.theme was absent (TS2353). No import-loader failure is counted.

Conductor decisions and bounded specialist answer:

- validateStyle stays `(raw, theme)` and throws style-specific Error fragments with no prefix/outer whitespace. Only its configuration call site prefixes `instrument ${JSON.stringify(declaration.name)} ` and wraps RejectedConfiguration; parseFormat's complete message is wrapped without another prefix. Full composed D3 messages, including wrong slots and invalid numeric indices, are asserted through documents.
- Chidi supplied verified pi-tui 1.4.0 fixtures: `oklch(70% 0.1 150)` and `okhsl(150 80% 60%)` (parseColor/colors.js 58–77, patterns 35–36). Separators are whitespace, not commas. Both accepted fixtures are covered by actual validator-result assertions.
- One new harness expectation was wrong: padEnd(39) built 79 columns. With approval, only that new expectation moved to padEnd(40). Measured arithmetic: model prose 32 + trailing pad 8 = 40; context prose 6 + track 34 = 40; line 80. Both cells default left-align. No production adjustment or existing pin changed to accommodate the typo.
- Small separate green refactor: once validateStyle existed, its two tests switched from the temporary namespace access to the ordinary named import, without changing an expectation; full suite green before and after.

Twelve early guard demonstrations, each caught at an assertion and individually restored (the first runner attempt stopped before editing because a mutation selector was non-unique; its selector was narrowed, not production code):

| Edit | Catching test | Result |
|---|---|---|
| 4-1: section shape guard disabled (extensions/jefferson/configuration.ts) | the instruments section shape guard rejects non-objects with the exact message | exit 1, assertion red; restored |
| 4-2: entry shape guard disabled (extensions/jefferson/configuration.ts) | the instrument entry shape guard rejects non-objects even without a holding cell | exit 1, assertion red; restored |
| 4-3: option-key guard disabled (extensions/jefferson/configuration.ts) | the declaration option-key guard names misspellings and the declined width option | exit 1, assertion red; restored |
| 4-4: format type guard disabled (extensions/jefferson/configuration.ts) | the format type guard rejects present non-strings including null | exit 1, assertion red; restored |
| 4-5: unknown-variable rejection disabled (extensions/jefferson/format.ts) | the document surfaces the unknown-variable guard's full message | exit 1, assertion red; restored |
| 4-6: second-width-taker rejection disabled (extensions/jefferson/format.ts) | the document surfaces the second-width-taker guard's full message | exit 1, assertion red; restored |
| 4-7: style shape guard disabled (extensions/jefferson/format.ts) | the style shape guard rejects a non-object with the full composed message | exit 1, assertion red; restored |
| 4-8: style key guard disabled (extensions/jefferson/format.ts) | the style-key guard rejects unknown keys with the full composed message | exit 1, assertion red; restored |
| 4-9: attribute type guard disabled (extensions/jefferson/format.ts) | the style attribute guard rejects non-booleans for all six attributes | exit 1, assertion red; restored |
| 4-10: foreground parser rejection swallowed (extensions/jefferson/format.ts) | the foreground value guard reports rejected types, wrong slots, colors and indices | exit 1, assertion red; restored |
| 4-11: background parser rejection swallowed (extensions/jefferson/format.ts) | the background value guard reports rejected colors, wrong slots and fractional indices | exit 1, assertion red; restored |
| 4-12: style key own-property check replaced by inherited lookup (extensions/jefferson/format.ts) | the style-key guard rejects inherited-name own keys including JSON proto keys | exit 1, assertion red; restored |

4.10 raw inspections:

```text
77:          if (key === "fg") theme.getFgAnsi(value as Parameters<Theme["getFgAnsi"]>[0]);
78:          else theme.getBgAnsi(value as Parameters<Theme["getBgAnsi"]>[0]);
```

The suppression search `rg -n '@ts-(ignore|expect-error|nocheck)' extensions/ tests/` is empty. The source runtime key record satisfies `Record<keyof ThemeStyle, true>`; no host token list or theme.colors membership check is copied. The only render-time theme-token literals are warning/error in the bar; the entry's existing warning notification level is not a token-membership list. Deleting underline is reserved for the final 7.5 compiler mutation.

Raw group boundary:

```text
$ tsc --noEmit
typecheck_exit=0
ℹ tests 188
ℹ suites 0
ℹ pass 188
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 461.925417
test_exit=0
```

## Group 5 — third subscription and replacement

- 5.1 red: subscription pin/release logs lacked turn_end, and the disposed-boundary dispatch had no handler (four assertion failures).
- 5.2 red: both dispatch scenarios failed at the harness's `no handler registered for turn_end` assertion before wiring. After wiring they prove one changed-totals repaint, no unchanged-totals repaint even after another append/leaf move, and scan reuse by the next render. Before the first footer render the install-time sample has already filled the cache (D8); an unchanged boundary does not repaint or scan again. The genuinely no-cache store boundary is covered in 1.5.
- 5.3 honest baseline: corrected setup yields five baseline-green cases before 5.4 — new/resume/fork/reload replacements and absent context usage. These behaviors were already built in groups 1–4. The conductor approved recording that truth, then omitting `store.dispose()` from release temporarily: the replaced footer rendered old text instead of 80 spaces, so the unchanged replacement assertion failed. The edit was restored.
- Approved fixture setup repair: this new ten-cell test expected bare high/low but had not configured thinking, whose default thinking: $level correctly clips to think... at eight columns. Only that fixture's document gained thinking.format = $level; every expected byte and all production code stayed unchanged for the repair.
- Exactly four registrations: session_start, model_select, thinking_level_select, turn_end. All three per-session subscriptions release once through the one teardown; post-dispose dispatch calls no reader.
- The unexpected .openspec.yaml Chidi run-id update was confirmed conductor-owned metadata. It stays unstaged and untouched, excluded from my commits; conductor will commit it after this run.

Raw group boundary:

```text
$ tsc --noEmit
typecheck_exit=0
ℹ tests 196
ℹ suites 0
ℹ pass 196
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 339.149958
test_exit=0
63:  pi.on("session_start", (_event, ctx) => {
90:    const releaseModel = pi.on("model_select", (event) =>
93:    const releaseThinking = pi.on("thinking_level_select", (event) =>
96:    const releaseTurn = pi.on("turn_end", () => store.turnEnded());
```
