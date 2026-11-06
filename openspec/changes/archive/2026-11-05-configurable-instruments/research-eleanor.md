# Eleanor research — configurable-instruments

Reconnaissance of `/Users/joelleibow/Projects/pi-jefferson` for the `configurable-instruments`
change. Every finding cites a path and symbol. No web documentation or pi installed packages
were consulted (Chidi owns those). Nothing was edited.

Repo state note: the brief names head `8c2df25`; the actual checkout is branch `main` at
`8041f17` ("Ground configurable-instruments: rulings and marbleization state"), one commit
ahead of the brief's head. Latest tags reach `v0.3.0` while `package.json` says `0.1.1`
(see §7).

## 1. Structure map

- `extensions/jefferson.ts` — the only host-loaded entry (`package.json` `pi.extensions` is
  exactly `["./extensions/jefferson.ts"]`). Default-exports `jefferson(pi: ExtensionAPI)`;
  exports `VERSION = "0.0.0-alpha"`. Registers the `/jefferson` command and the
  `pi.on("session_start")` handler, which: returns early unless `ctx.mode === "tui"`; calls
  `releasePrevious?.()`; builds the store via `createSessionDataStore({ seed: { provider:
  ctx.model?.provider, model: ctx.model?.id, thinkingLevel: ctx.thinkingLevel }, requestRender })`;
  subscribes `model_select` → `store.modelSelected(...)` and `thinking_level_select` →
  `store.thinkingLevelSelected(...)`; reads config via `readConfiguration({ agentPath:
  join(getAgentDir(), "pi-jefferson.json"), projectPath: join(ctx.cwd, CONFIG_DIR_NAME,
  "pi-jefferson.json"), projectTrusted: ctx.isProjectTrusted() })`; notifies `warning` as
  `"warning"`; sets `footerRows = rows.length`; builds the footer with
  `createFooter(rows, () => store.sample())`; and installs it via `ctx.ui.setFooter((tui) => …)`
  returning `{ render: (width) => footer.render(width), invalidate, dispose: release }`.
  `requestRepaint` is captured from the factory's `tui` (`tui.requestRender()`).
- `extensions/jefferson/configuration.ts` — `readConfiguration(source)`, `Configuration`,
  `ConfigurationSource`, `Row`, `Cell`, `CellAlign`, `DEFAULT_CELLS`, `MAX_CELLS`; internal
  `ALIGNMENTS`, `RejectedConfiguration`, `Notices`, `defaultRow()`, `blankCells()`,
  `cellsFromNames()`, `normalizeRow()`, `normalizeDocument()`, `acceptedWarning()`.
- `extensions/jefferson/instrument.ts` — `Instrument` interface (`render(readings, width)`),
  `DEFAULT_CELL_TEXT`, `blank`, `model`, `thinking`, `labelled()`, `SHIPPED`,
  `instrumentNamed(name)`.
- `extensions/jefferson/row-renderer.ts` — `Footer`, `renderRow(row, width, readings)`,
  `createFooter(rows, sampleReadings)`; internal `GAP`, `RESET`, `leavesStyleOpen()`,
  the per-render `cellView` closure.
- `extensions/jefferson/session-data-store.ts` — `Reading`, `Readings` (`provider`, `model`,
  `thinkingLevel`), `SessionDataStore`, `createSessionDataStore({ seed, requestRender })`.
- `tests/` — `configuration.test.ts`, `instrument.test.ts`, `jefferson.test.ts`,
  `row-renderer.test.ts`, `session-data-store.test.ts` (tests live only under `tests/`, never
  beside a source file).
- Living specs — `openspec/specs/statusline/spec.md`, `openspec/specs/session-data-store/spec.md`,
  `openspec/specs/extension-source-layout/spec.md` (`openspec/config.yaml` is `schema:
  spec-driven`, no custom rules).
- `docs/adr/0001-imports-run-one-way.md` — the only ADR in `docs/adr/`.
- `ARCHITECTURE.md`, `AGENTS.md` (no `CLAUDE.md` exists), `README.md`, `package.json`,
  `tsconfig.json` (`include: ["extensions/**/*.ts", "tests/**/*.ts"]`, strict, erasable-only
  TS, `.ts` import extensions), `pnpm-workspace.yaml` (`allowBuilds` denials only).
- Change dir `openspec/changes/configurable-instruments/` currently holds only
  `owner-rulings.md` (Joel's 2026-11-05 rulings: 1–10 cells with ten as default; cells get
  `basis: floor(W/N)` + `grow: 1`; tree built once in `createFooter`; six instruments — model,
  thinking, path basename, context, tokens, cost — fed from pi's own data; per-instrument
  `format` over `$variables` plus a pi `ThemeStyle` `style`, configured once per instrument
  name in `pi-jefferson.json`; `$bar` width-taking variable; git held out). No proposal.md or
  design.md exists yet.
- CI — `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/scripts/next-version.mjs`.

## 2. Hardcoded names, defaults, limits (file + symbol)

- `extensions/jefferson/instrument.ts`:
  - `SHIPPED: Readonly<Record<string, Instrument>>` = `{ blank, model, thinking }` — the
    shipped-name table.
  - `instrumentNamed(name)` — the name→instrument lookup (`Object.hasOwn(SHIPPED, name)`).
  - `DEFAULT_CELL_TEXT` — the fixed Lorem-ipsum placeholder string `blank` renders.
  - `labelled(label, data)` — the helper producing `` `${l}: ${d}` `` (or `""` when either half
    is `undefined`); `model` and `thinking` are built from it.
- `extensions/jefferson/configuration.ts`:
  - `DEFAULT_CELLS = 10` and `MAX_CELLS = 10` — the ten-cell default and ceiling
    (`defaultRow()` uses `blankCells(DEFAULT_CELLS)`; `cellsFromNames` truncates at `MAX_CELLS`).
  - `ALIGNMENTS = ["left", "right", "center"] as const` — the align tuple; `CellAlign`,
    `isAlign()`, the default `ALIGNMENTS[0]` in `blankCells`, and the align rejection message
    all derive from it.
  - Rejection messages (all thrown as `RejectedConfiguration` from `cellsFromNames` /
    `normalizeRow` / `normalizeDocument`): `row ${i} has an empty cells list`;
    `row ${i} has a cells entry that is not an object; declare {"instrument": "model"}`;
    `row ${i} has a cell with an unrecognised key …; a cell carries only instrument and align`;
    `row ${i} has a cell with no instrument`;
    `row ${i} has an instrument that is not a non-empty string`;
    `row ${i} has an align that is not "left", "right" or "center": …`;
    `row ${i} is not an object`; `row ${i} has a cells value that is not a list`;
    `row ${i} has an id that is not a non-empty string`;
    `the configuration document is not an object`;
    `the configuration carries both a top-level row and a rows list`;
    `the rows value is not a list`;
    `two rows share the id …`. Plus in `readConfiguration`:
    `pi-jefferson: ${path} could not be read or parsed; rendering the default row` and
    `… was rejected (${message}); rendering the default row`.
- `extensions/jefferson/row-renderer.ts`:
  - `GAP = 0` — inter-cell gap ("fixed at 0 for this change").
  - `RESET = "\x1b[0m"` — emitted before a trailing pad when `leavesStyleOpen(text)`.
- Enforced in more than one place: the ten-cell default/ceiling lives in
  `configuration.ts` (`DEFAULT_CELLS`/`MAX_CELLS`/`defaultRow`/`blankCells`) and is asserted in
  `tests/configuration.test.ts` ("the cell-count constants are named for cells") and required by
  `openspec/specs/statusline/spec.md` ("A row's cells are its count and its placement"). The
  reset-before-pad rule lives in `row-renderer.ts` (`RESET`, `leavesStyleOpen`) and is restated
  in `AGENTS.md` and `ARCHITECTURE.md` ("Two things that will bite"). The columns-not-characters
  rule lives in `row-renderer.ts` (`visibleWidth`/`truncateToWidth`), `AGENTS.md`,
  `ARCHITECTURE.md`, and is asserted across `tests/row-renderer.test.ts`.

## 3. Current render path

`createFooter(rows, sampleReadings)` (`extensions/jefferson/row-renderer.ts`) returns a
`Footer`. `Footer.render(width)` takes **one sample per render** — `const readings =
sampleReadings()` — and hands that single `Readings` object to every row; the
one-sample-per-render rule is enforced here, in `createFooter.render`, and asserted by
`tests/row-renderer.test.ts` ("one render samples the store exactly once…" and "…every call
shares one readings object"). It maps rows to row `Component`s (`render: (rowWidth) =>
[renderRow(row, rowWidth, readings)]`) and composes them in `new VStack(rowViews, { gap: 0 })`.
`Footer.invalidate()` is a no-op ("the footer caches nothing").

`renderRow(row, width, readings)` computes `cellWidth = Math.floor((width - (N-1)*GAP) / N)`,
then constructs a **new `HStack` on every call** — i.e. per render — from
`row.cells.map(cell => ({ component: cellView(cell), basis: cellWidth, grow: 0, shrink: 0 }))`
with `{ gap: GAP }`, and takes `.render(width)[0]`. So today the tree is rebuilt per render;
building it once in `createFooter` (owner-rulings) is part of this change.

Inside, `cellView(cell)` returns a `Component` whose `render(cellRenderWidth)` memoizes per
width (`cached: { width, text }`), so the instrument renders **at most once per (cell, width)
per row render** — the host's measure pass (row width) and layout pass (cell width) share the
cache; asserted by `tests/row-renderer.test.ts` with call widths `[30,30,30,10,10,10,30]`.
It then clips with `truncateToWidth(text, cellRenderWidth)`, computes
`pad = cellRenderWidth - visibleWidth(clipped)` (from the clipped result, per the
wide-glyph rule), splits the pad by `cell.align` (`before`/`after`; center puts
`floor(pad/2)` left and the rest right), prepends `RESET` to the trailing pad when
`leavesStyleOpen(clipped)`, and returns `[leading + clipped + trailing]`. `invalidate()` is a
no-op.

After the `HStack` composes the line, the trailing-remainder guard runs:
`remainder = width - visibleWidth(composed)`; if positive the line is padded with spaces
("the host pads the composed line to width, so this is a guard rather than the normal path").
With `GAP = 0` and `grow: 0`, `W mod N` columns stay blank at the right edge — a property of
the geometry per `ARCHITECTURE.md` ("Fidelity").

## 4. Configuration path

`readConfiguration(source)` (`extensions/jefferson/configuration.ts`):

- Two file paths: `agentPath` (agent dir, supplied by the entry as
  `join(getAgentDir(), "pi-jefferson.json")`) and `projectPath`
  (`join(ctx.cwd, CONFIG_DIR_NAME, "pi-jefferson.json")`). Selection rule: `path =
  source.projectTrusted && existsSync(source.projectPath) ? source.projectPath :
  source.agentPath` — a **trusted project document replaces the agent document whole**; an
  untrusted project document is ignored entirely.
- Absent file → `{ rows: [defaultRow()], warning: undefined }`. Unparseable JSON → default
  row + `"… could not be parsed; rendering the default row"`.
- Validation: `normalizeDocument` accepts a top-level row object or a `rows` list, rejects
  both at once; an empty `rows` list normalizes to `[]` and `readConfiguration` substitutes
  the default row. `normalizeRow` synthesizes `id: "row-${index}"`, rejects duplicate ids,
  defaults missing `cells` to ten blank cells. `cellsFromNames` validates every entry — even
  past the ceiling — then truncates to `MAX_CELLS` (first 10 render).
- **Whole-document rejection semantics**: any `RejectedConfiguration` → the entire document
  is refused, the default row renders, and the warning is
  `pi-jefferson: ${path} was rejected (${error.message}); rendering the default row`.
- **Notices on an accepted document** (`acceptedWarning`): a `containers` key (top-level or
  on a row) → "carries the containers key, which is no longer read; declare cells instead"
  (once per document); unknown instrument names collected across all rows → "names instruments
  the extension does not implement: …; those cells render blank". Unknown instrument *name* is
  not a rejection: the cell renders `blank` and the warning names it.
- Normalization output: `Row = { id: string; cells: Cell[] }`, `Cell = { instrument:
  Instrument; align: CellAlign }`, instrument resolved at parse time via `instrumentNamed`.

## 5. Test inventory — expectations this change alters

- `tests/configuration.test.ts`:
  - Ten-cell default/ceiling: `assert.equal(rows[0]?.cells.length, 10)` in most tests;
    "an empty object yields one row of ten", "a row omitting cells renders 10 cells" /
    "holds ten blank cells" (`DEFAULT_CELLS`, cells are the `blank` object itself);
    "cells naming 12 instruments keeps the first 10 and warns nothing" (ceiling = truncation,
    accepted); "the cell-count constants are named for cells" (`DEFAULT_CELLS === 10`,
    `MAX_CELLS === 10`).
  - Rejection messages asserted by regex: `/not an object/` + `/declare {"instrument":
    "model"}/`, `/unrecognised key/` (names the key: `width`, `aling`, `text`), `/no
    instrument/`, `/not a non-empty string/`, `/align/` plus the offending value
    (`"middle"`, `"Center"`, `4`), `/empty cells/`; entries past the ceiling are still
    validated (`42` past the ceiling rejects; `brnach` past the ceiling warns; bad align past
    the ceiling rejects).
  - Notices: containers → `/containers/` + `/declare cells instead/`, exactly once per
    document; unknown instrument → warning names `nope`/`alpha`/`beta`, cell renders `blank`,
    siblings still render theirs.
  - Trust: "a trusted project document replaces the agent document whole"; "an untrusted
    project document is ignored"; agent-only fallback.
- `tests/row-renderer.test.ts`:
  - Geometry: "a width that divides evenly gives every cell the same columns" (8 cells at 80 →
    10 each); "a width that does not divide evenly leaves the remainder blank at the right
    edge" (3 cells at 100 → 33 each, `line.at(-1) === " "`, i.e. `floor(W/N)` + remainder
    blank right); "cell widths are recomputed when the width changes" (100→90, nothing
    retained). These encode `floor(W/N)` with `grow: 0`, which the change replaces with
    pi-tui allocation (`grow: 1`).
  - Per-render HStack / per-(cell,width) memoization: "an instrument renders once per (cell,
    width) — the row-width measure, then the cell-width layout…" asserts call widths
    `[30, 30, 30, 10, 10, 10, 30]`; the `composed()` helper (`FRAME = "\x1b[0m\x1b]8;;\x07"`
    per child) states the host's per-child framing once.
  - Alignment/pad/reset: left/right/center pad placement, odd center pad extra column right,
    wide-glyph/emoji/combining-mark clip pads, "an ANSI-styled cell's pad carries no styling",
    "the host closes an open style between cells".
  - One sample per render: "one render samples the store exactly once…" (3 rows × 8 cells →
    1 sample; 2 renders → 2 samples); "two cells holding the model instrument resolve
    identical text" (`composed("anthropic: claude-opus-4", "anthropic: claude-opus-4")`);
    "a push between two renders shows up in the next render and not before".
- `tests/instrument.test.ts`:
  - Text shapes: `blank.render(...) === DEFAULT_CELL_TEXT` (and reads no datum — the
    `unreadable()` readings fixture); `model.render(seed, 80) === "anthropic:
    claude-opus-4"` (the `provider: model` shape); `thinking.render(seed, 80) ===
    "thinking: high"` (the `thinking: level` shape); both yield `""` when a half is
    `undefined`; each instrument reads only the datums its text uses; `instrumentNamed`
    resolves `blank`/`model`/`thinking` and stays `undefined` for unknown names.
- `tests/jefferson.test.ts`:
  - Exported-surface test: "the exported surface offers no way to supply or replace cell
    content" — `Object.keys` of the entry (`["VERSION","default"]`), renderer
    (`["createFooter","renderRow"]`), configuration (`["DEFAULT_CELLS","MAX_CELLS",
    "readConfiguration"]`), and no register/supply/contribute keys in instrument/store.
  - End-to-end: rejected config warns once and renders the default row (10 cells of
    truncated `DEFAULT_CELL_TEXT` at 80 cols); seeded model/thinking render
    `anthropic: claude-opus-4` / `thinking: high` on every session reason; exactly two
    subscriptions (`model_select`, `thinking_level_select`); one repaint per changed push,
    none for a no-change push; second `session_start` releases the first install
    (`unsubscribe:model_select`, `unsubscribe:thinking_level_select` between `setFooter#1`
    and `setFooter#2`); disposed footer renders blanks; `VERSION === "0.0.0-alpha"`.
- `tests/session-data-store.test.ts`: store holds exactly `{provider, model, thinkingLevel}`;
  unknown ≠ `""` ≠ `0`; pushes replace values and request one repaint only on change;
  samples are values, not live views; dispose is idempotent and post-dispose reads are
  all-unknown with no repaint.

## 6. Spec inventory — requirements this change must amend (by name)

`openspec/specs/statusline/spec.md`:
- "Cells are evenly distributed across the width" — `floor(W / N)` + `W mod N` blank at the
  right edge; amended by pi-tui allocation with `grow: 1` (remainder distributed, row fills).
- "A row's cells are its count and its placement" — ten default, ceiling ten, entry-shape and
  unrecognised-key rejection, warning messages; cell-object key set may change if cells gain
  keys (rulings configure instruments by name, not per cell, but the key whitelist is what
  rejects new keys).
- "Cell content comes from an instrument" — `blank` placeholder text, default row of ten
  `blank` cells, no third-party content API.
- "Configuration designates each cell's instrument" — unknown name → warning + `blank` cell.
- "An instrument resolves a cell's text by reading the store" — read-only, synchronous,
  store-not-instrument rule for new data.
- "The model instrument" and "The thinking instrument" — the `provider: model` and
  `thinking: level` text shapes; new instruments (path, context, tokens, cost) are additions
  in the same requirement family.
- "Instrument text is bound by the row's geometry" — clip at cell width, remainder at right
  edge.
- "A cell's alignment is the padding side inside it" — `ALIGNMENTS` three values, pad side
  rules, pad measured in columns after clipping.
- "The statusline renders the declared rows", "Both configuration shapes normalize…", "Row
  identifiers", "A row is one line tall", "The configuration surface is extension-owned" —
  likely stable, but the per-instrument `format`/`style` config block lands on the
  configuration surface.

`openspec/specs/session-data-store/spec.md`:
- "The store holds the data its instruments display" — currently pinned to exactly provider,
  model, thinking level; its "A datum no instrument displays" scenario names the working
  directory (and git branch, extension statuses, provider count) as NOT held — path/context/
  tokens/cost change that.
- "Freshness never exceeds the host's delivery" — seeding at session start plus
  `model_select`/`thinking_level_select` pushes; new datums need their sources and push
  events stated (e.g. `ctx.cwd`, `ctx.getContextUsage()`, session-manager usage per
  owner-rulings; git held out).
- "Every read in one render observes one state", "A pushed change that alters displayed data
  results in a repaint", "Store data does not survive a session replacement", "Every
  subscription is released when the footer is disposed", "A read is synchronous and total",
  "Unknown is a distinguished value", "Expensive derivations are bounded and invalidated by
  name" — all remain binding on the enlarged store.

`openspec/specs/extension-source-layout/spec.md`:
- "Host packages are the host's to supply, and imports run one way" — the change imports
  pi's `ThemeStyle` type and more host API surface; ADR 0001 already permits any shipped file
  to import `@earendil-works/*`.
- "Tests never occupy a loadable or shipped path", "The published file set is deliberate"
  (CI asserts invariants, not a list), "Every shipped source file is typechecked and
  erasable", "Responsibility is inferable from path" (a new module for instrument
  declarations must be named for what it owns), "Growth is a named change" — new modules or
  a new kind of module must be named in this change.

## 7. Release mechanics constraining the change

- `.github/workflows/release.yml` runs only on `push` to `main` (plus `workflow_dispatch`);
  it self-gates (`pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test` before
  anything publishes). Publish is CI-only: `publishConfig.provenance: true` in
  `package.json` means provenance is signed from a CI OIDC provider, so the identical
  `pnpm publish` fails on a workstation (README: "A workstation cannot publish").
- Bump comes from PR labels: `release:major` / `release:minor` / `release:patch`; anything
  else, including no label, is a patch (defaults low on purpose).
- The version base is the git tags, not `package.json`: `.github/scripts/next-version.mjs`
  takes the highest non-prerelease `v*` tag reachable from `HEAD~1` (the commit before the
  one being released — a fixed point so a re-run computes the same version). The workflow
  applies it with `pnpm version … --no-git-tag-version`, publishes with
  `pnpm publish --tag latest --no-git-checks`, and creates the `v…` tag/GitHub Release.
  Re-run safety: a registry check (`pnpm view`) and a tag-existence check make an
  already-published run finish idempotently. Hence the committed `package.json` version
  (`0.1.1`) is not the published one — tags up to `v0.3.0` exist — and the entry's `VERSION`
  constant is `"0.0.0-alpha"`, deliberately not printed by `/jefferson`.
- `.github/workflows/ci.yml` runs on PRs and pushes to `main`: typecheck, `node --test`, and
  a tarball/load-contract invariant check on a real `pnpm pack` — allowed roots are
  `package.json`, `README.md`, `LICENSE`, `extensions/**`; entry must be
  `extensions/jefferson.ts`; no `*.test.ts` in the tarball; packed `pi.extensions` must equal
  exactly `[ "./extensions/jefferson.ts" ]`. A new module under `extensions/jefferson/` is
  allowed without a CI edit; changing roots/entry/load root is not.
- README: trunk-based, every merge to `main` is a release, no separate release step.

## 8. Unknowns and open questions

- The host APIs the six new instruments need (`ctx.cwd`, `ctx.getContextUsage()`,
  `ctx.sessionManager` assistant-usage sums, the path-basename source) are asserted by
  `owner-rulings.md` but not verified here — pi's installed packages were not read (Chidi's
  scope). Their exact shapes, event names, and push semantics are unknown to this report.
- `ThemeStyle`'s exact shape (colors + `bold`/`dim`/`italic`/`underline`/`inverse`/
  `strikethrough`) is unverified for the same reason.
- pi-tui's allocator behaviour under `grow: 1` (owner-rulings quotes the 13,11,10,9,8,7,6,6,
  5,5 sequence for `grow: 1` alone at 10 cells/80 columns) is unverified — pi-tui was not
  inspected.
- Whether the per-instrument `format`/`style` block is a top-level `instruments` key in
  `pi-jefferson.json` and how it interacts with the cell-object key whitelist in
  `cellsFromNames` is a design question, not reconnaissance; `owner-rulings.md` says
  "configured once per instrument name" without fixing the document shape.
- The brief's head `8c2df25` vs actual `8041f17` (see header) — findings are against `8041f17`.
- `openspec/changes/configurable-instruments/` has no `proposal.md`/`design.md`/`tasks.md`
  yet — only `owner-rulings.md`.
