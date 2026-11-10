# Research Report

## Question and Scope

Investigated the current shipped TypeScript source under `extensions/`, its imports, relevant tests, layout requirements and pins, and baseline commands. Scope: repository `/Users/joelleibow/Projects/pi-jefferson`; source boundary `extensions/`. Also read the paused instruments design requested by the brief. No source/configuration files were changed. No layout is proposed.

## Sources / Files Examined

- `AGENTS.md`, `ARCHITECTURE.md`, `README.md` (README presence confirmed but content not needed to answer the requested source audit).
- `openspec/specs/extension-source-layout/spec.md`, `docs/adr/0005-source-is-laid-out-by-responsibility.md`, `openspec/changes/intuitive-source-layout/owner-rulings.md`.
- `package.json`, `tsconfig.json`, `.github/workflows/ci.yml`.
- Every TypeScript source file under `extensions/` and the test files under `tests/` relevant to source imports/path pins.
- `git show instruments-for-every-datum:openspec/changes/instruments-for-every-datum/design.md`.
- `openspec instructions research --change intuitive-source-layout --json` for the requested template and artifact metadata.

## Findings

### Source inventory: top-level declarations and mixed responsibilities

Line ranges below are 1-based; functions/types/constants are top-level declarations. Private helpers are included. Object-valued declarations are described as constants/declarations, not an exhaustive description of their internal fields.

- `extensions/jefferson.ts` (26 lines): `VERSION` (line 22), version string; default `jefferson` function (24), passes `pi` to `startUp`. Responsibilities: extension registration/entry only.
- `extensions/jefferson/configuration.ts` (345): `isAlign` (28), `isDistribution` (33), `orList` (38), validation/message helpers; exported `ConfigurationSource` (44), resolved paths/trust/theme input; exported `Configuration` (51), normalized rows/gap/warning result; exported `DEFAULT_CELLS` (59), `MAX_CELLS` (60), limits; `RejectedConfiguration` (64), internal rejection signal; `Notices` (67), accumulated accepted-document warnings; `readInstruments` (72), validates and parses per-instrument options; `defaultRow` (114), makes fallback row; `blankCells` (118), constructs fallback cells; `cellsFromNames` (127), validates/resolves cell entries and ceiling; `normalizeRow` (165), validates/defaults one row; `NormalizedDocument` (203), internal normalized shape; `normalizeDocument` (209), validates envelope, gap, instruments and rows; `acceptedWarning` (281), formats notices; exported `configurationPaths` (296), resolves agent/project paths; exported `readConfiguration` (309), selects/reads/validates document and falls back. Mixes configuration path resolution, document parsing/validation/normalization, instrument/format/style preparation, warnings and default row construction.
- `extensions/jefferson/footer-setup.ts` (31): exported `installFooter` (11), binds pi footer factory, creates footer, bridges repaint and disposal. Responsibilities: footer install and host-component adaptation.
- `extensions/jefferson/startup.ts` (67): exported `startUp` (7), command/session lifecycle, event ordering and release/repaint wiring. Responsibilities: startup lifecycle and command registration; calls config, feed, footer setup.
- `extensions/jefferson/data/session-data-feed.ts` (53): exported `feedSessionData` (9), seeds store from context, supplies readers, subscribes to model/thinking/turn events and returns unified release. Responsibilities: host session/event adaptation and store lifecycle.
- `extensions/jefferson/data/session-data-store.ts` (111): exported `Reading` (5), datum value-or-unknown type; `UsageTotals` (7), totals shape; `Readings` (15), sampled datum shape; `SessionDataStore` (25), store interface; `scanTotals` (35), aggregates session usage entries; exported `createSessionDataStore` (53), owns values, scan cache, pushes/sampling/disposal. Responsibilities: data model, aggregation and update/cache semantics.
- `extensions/jefferson/visuals/format.ts` (214): internal `Readings` alias (10), instrument-render reading type; exported `FormatSegment` (12), parsed literal/variable/bar union; `StyleAttribute` (17), style-only keys; `Modifier` (19), style/mutation union; `MODIFIERS` (23), supported modifier table; `WARNING_PERCENT` (35), `ERROR_PERCENT` (36), bar thresholds; exported `collapse` (38), replaces controls; `formatError` (42), instrument-named parse error; exported `parseFormat` (46), parses/trims/validates format language and modifiers; `STYLE_KEYS` (119), allowed style keys; exported `validateStyle` (123), checks theme/style values; `styledPiece` (155), applies style when nonempty; `mergedStyle` (160), combines style modifiers; exported `resolveFormat` (167), resolves values/mutations/bar/styling. Mixes format grammar parsing, style validation, string mutation, bar sizing/rendering and per-segment rendering.
- `extensions/jefferson/visuals/instrument-binding.ts` (39): exported `BindInstrument` (7), declaration-to-instrument function type; exported `ConfiguredInstrument` (9), parsed config/style/label type; exported `instrumentBindings` (15), memo-binds config/default formats and labels to instrument renderers. Mixes format binding, label/gap composition, fill determination and bound rendering.
- `extensions/jefferson/visuals/instrument.ts` (122): exported `DEFAULT_CELL_TEXT` (8), blank placeholder; exported `Instrument` (11), fills/render contract; exported `InstrumentDeclaration` (17), declaration shape; constants `FOUNDATIONAL_OPTIONS` (27), `THOUSAND` (28), `MILLION` (29), `DECIMAL_THOUSANDS_LIMIT` (30), `DECIMAL_MILLIONS_LIMIT` (31); `compactCount` (33), formats counts; exported `blank` (41), blank declaration; declarations `model` (48), `THINKING_FG` (55), `thinking` (61), `path` (70), `context` (77), `tokens` (90), `cost` (103): shipped instrument names, value resolvers, defaults and options (thinking also maps level colors); `SHIPPED` (113), lookup table; exported `instrumentNamed` (117), resolves supported declaration. Responsibilities: instrument contracts/catalog and display data formatting (including numeric counts and basename path logic).
- `extensions/jefferson/visuals/row-renderer.ts` (134): exported `Footer` (9), render/invalidate surface; `GAP` (14), horizontal host-stack gap; `RESET` (15), SGR reset; `leavesStyleOpen` (17), detects trailing open styling; internal `CellView` (24), component plus fill/probe contract; exported `createFooter` (30), builds stack/cell components, plans/reseats rows, samples/caches, clips and pads cells. Responsibilities: footer tree/render orchestration, width planning call, per-cell clipping/padding/alignment and memoization.
- `extensions/jefferson/visuals/row.ts` (23): import-only runtime dependency on instrument; exported `ALIGNMENTS` (5), align value tuple; exported `CellAlign` (6), alignment type; exported `DISTRIBUTIONS` (9), distribution tuple; exported `Distribution` (10), distribution type; exported `Cell` (13), instrument plus alignment; exported `Row` (19), row id/distribution/cells. Responsibilities: row and cell domain types/allowed values.
- `extensions/jefferson/visuals/width-plan.ts` (98): internal `Distribution` (7), `Alignment` (8), local value unions; exported `CellMeasure` (11), width-planning input; exported `PlannedCell` (22), allocation output; `contentCells` (31), content-cell indices; `absorberOf` (40), slack absorber; `jointCells` (50), joint placement; exported `planRow` (68), pure basis/grow/joint plan. Responsibilities: width planning and joint/slack geometry only.

### Import graph (local source imports; line numbers at import statements)

Edges: `extensions/jefferson.ts:20` → `extensions/jefferson/startup.ts`; `startup.ts:7` → `configuration.ts`, `:8` → `data/session-data-feed.ts`, `:9` → `footer-setup.ts`; `configuration.ts:20` → `visuals/instrument.ts`, `:21` → `visuals/format.ts`, `:22` → `visuals/row.ts`, `:26` → `visuals/instrument-binding.ts`; `footer-setup.ts:8` → `data/session-data-store.ts` (type), `:9` → `visuals/row-renderer.ts`, `:10` → `visuals/row.ts` (type); `data/session-data-feed.ts:4` → `data/session-data-store.ts`; `visuals/format.ts:8` → `visuals/instrument.ts` (type); `visuals/instrument-binding.ts:4` → `visuals/instrument.ts` (type), `:5` → `visuals/format.ts`; `visuals/instrument.ts:5` → `data/session-data-store.ts` (type); `visuals/row-renderer.ts:5` → `visuals/row.ts`, `:6` → `visuals/width-plan.ts`, `:7` → `data/session-data-store.ts` (type); `visuals/row.ts:2` → `visuals/instrument.ts` (type). `session-data-store.ts` and `width-plan.ts` have no local imports. No cycles found by inspection; data has no local imports outside its own directory. Host/platform imports omitted from this local graph.

### Where the requested concepts live

- instruments: `extensions/jefferson/visuals/instrument.ts:41-120`.
- the bar: parsing/width-taking token `visuals/format.ts:46-106`; bar rendering `:192-202`.
- modifiers: declaration/table `visuals/format.ts:19-34`; parser attachment/validation `:75-116`; application `:174-183`.
- styles and theme: validation `visuals/format.ts:119-153`; segment styling/render `:155-164`, `:203-212`; configured value enters through `configuration.ts:72-112`.
- labels and the gap: label/default composition and gap `visuals/instrument-binding.ts:19-32`.
- format parsing: `visuals/format.ts:46-117`.
- format rendering: `visuals/format.ts:167-213`.
- width planning: `visuals/width-plan.ts:68-98`, called by `visuals/row-renderer.ts:78-88`.
- cell clip and pad: `visuals/row-renderer.ts:49-65`.
- row and cell types: `visuals/row.ts:5-23`.
- configuration reading and validation: `configuration.ts:28-345`; paths specifically `:296-302`, selection/read `:309-345`.
- the store: `data/session-data-store.ts:5-111`.
- the feed: `data/session-data-feed.ts:9-53`.
- startup: `startup.ts:7-67`; entry handoff `extensions/jefferson.ts:24-26`.
- footer install: `footer-setup.ts:11-31`.

### Tests and path-sensitive test imports

The tests import source by direct relative file paths (all `.ts` suffixes), so a move requires updating the source import specifiers even if assertions stay unchanged.

- `tests/configuration.test.ts`: configuration, renderer, row, instrument, store; configuration reading, normalization, labels, styles, warnings and integrations.
- `tests/format.test.ts`: format, instruments, renderer, store; parser, mutation, validation, rendering and style behavior.
- `tests/instrument.test.ts`: instrument declarations and store types/values.
- `tests/jefferson.test.ts`: entry, startup integration indirectly, and dynamic import/export-surface checks for source files. The exported-surface guard at `:315-370` asserts keys by importing named paths: entry `VERSION/default`; renderer `createFooter`; configuration exports; row tuples; width plan `planRow`; binding `instrumentBindings`; feed `feedSessionData`; footer setup `installFooter`; startup `startUp`; instrument/store/format exports. Moving files or changing exported keys requires changing the pin.
- `tests/row-renderer.test.ts`: row, instrument, format, renderer, store; footer/cell layout and rendering.
- `tests/session-data-store.test.ts`: store; datum shape, aggregation, cache, push and disposal.
- `tests/width-plan.test.ts`: width-plan; geometry and allocation.
- `tests/fake-theme.ts` is a test helper and imports no source.
- Path assertions also include the export list above; `configuration.test.ts` and `session-data-store.test.ts` assert object key lists, not source paths. No other path assertion was identified.

### What pins the layout today

- Living spec `openspec/specs/extension-source-layout/spec.md`: direct requirements include “The package MUST expose exactly one module per extension as the entry the host discovers”; “Host discovery MUST reach exactly one source location”; “Tests MUST live under `tests/`”; “Every shipped source file MUST match `tsconfig.json`'s `include`”; “The tarball MUST contain exactly the set named by `package.json` `files` plus npm's mandatory files”; “Each source module MUST be named for the behavior or data it owns”; “Within this package, imports MUST run one way”; and “Every relative import MUST name its target file with the `.ts` extension, and none MUST name a directory.” Its responsibility requirements include each responsibility's recognizable home and an explicit explanation for any shipped source file holding multiple responsibilities.
- ADR 0005, `docs/adr/0005-source-is-laid-out-by-responsibility.md`, accepted 2026-11-06: “Each responsibility has one home whose path names it, and no shipped source file holds two.” It assigns entry, startup, configuration, footer setup, `data/` and `visuals/`; states data imports no file outside itself and visuals imports itself and data types; and says separation uses plain imports. It rejected single-file directories and says a responsibility that outgrows one file gets a directory.
- `package.json:17-20` `files` currently ships `extensions`, `README.md`, `LICENSE`. `package.json:23-25` `pi.extensions` explicitly declares only `./extensions/jefferson.ts`.
- `tsconfig.json:16` includes `extensions/**/*.ts` and `tests/**/*.ts`.
- `.github/workflows/ci.yml`: runs frozen install, typecheck and tests, then packs a real tarball. Its node assertion allows only `package.json`, `README.md`, `LICENSE`, and `extensions/` roots; requires `extensions/jefferson.ts`; rejects shipped `*.test.ts`; and requires packed manifest `pi.extensions` exactly `['./extensions/jefferson.ts']`. It checks invariants, not an enumerated shipped-source list.
- `tests/jefferson.test.ts:315-370` pins exact export keys of each shipped source file and tests absence of exports that offer third-party cell-content contribution. Any split/move requires revising file-path imports and exact lists. Spec also requires pin coverage for each shipped source file holding a relevant export.

### Baseline

Ran `pnpm typecheck && pnpm test`: passed. TypeScript emitted no errors; Node test run reported **317 tests, 317 pass, 0 fail** (duration about 605 ms). This is the command pair requested by the brief.

## Assumptions, Differences, and Unknowns

- `CLAUDE.md` and `ARCHITECTURE.md` were located; no `CLAUDE.md` exists. `AGENTS.md` and `ARCHITECTURE.md` were read. `README.md` exists but was not needed/read in full for the specified evidence.
- ADR titles were enumerated; ADR 0005 was read in full as specifically requested. Other ADR bodies were not read, consistent with the research rule to read titles/summaries only.
- The paused change design on branch `instruments-for-every-datum` specifies branch/session/status instruments, four additional store datums, footer-data attachment through feed, and variable forms in the format language; it is not implemented in this checked-out source. The design states its baseline as 317 passing, agreeing with this run.
- The local import graph was assembled from current source import statements and visually checked for cycles; no automated graph checker was run. CI has no standing cycle check, as ADR 0005 notes.
- `openspec instructions research --change intuitive-source-layout --json` returned the markdown template and wildcard output path. The requested authoritative destination `research-eleanor.md` was used instead of its unresolved `research-*.md` path.
