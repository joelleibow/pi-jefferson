# Eleanor research — cell-widths

Reconnaissance for the change "a cell takes no more width than its content needs, so neighboring
cells sit against it". Evidence is the repository only: `owner-rulings.md` in this change directory
is read and binding; `research-chidi.md` in this directory was **not** read (Chidi's lane), and no
pi installed-package source was read. What is present is reported; no design is proposed.

## 1. Required reads

- `AGENTS.md` — read in full. Erasable TypeScript only (no `enum`, parameter properties, runtime
  `namespace`, decorators); relative imports carry `.ts`; `pnpm typecheck` = `tsc --noEmit`,
  `pnpm test` = `node --test`. Two traps recorded there: a pad needs a reset (`\x1b[0m`) before it
  when the cell's own text leaves an SGR open; measure columns with `visibleWidth`, clip with
  `truncateToWidth`, and compute the pad from the clipped result because a wide glyph dropped at the
  clip boundary leaves the text narrower than the arithmetic predicted.
- `ARCHITECTURE.md` — read in full. Row renderer: "The basis is ours (`floor(W / N)` per cell); the
  remainder is the allocator's (`grow: 1`, `gap: 0`). On a width change, `clear()` plus `addChild`
  re-seats the same components with the new basis. Every cell reads the current render's sample from
  the footer's slot and memoizes by `(sample, width)`; invalidation clears those memos. Each cell
  clips with `truncateToWidth`, pads with `visibleWidth`, and returns one line; composition and
  allocation stay with the host." Fidelity section: "Rows span the full width: the allocator gives
  leftover columns to the earliest cells, one each… replaces the former blank-right-edge property,
  recorded in ADR 0002."
- `docs/adr/` — all six read (0002, 0005, 0006 in full; 0001, 0003, 0004 in full this run):
  - `docs/adr/0001-imports-run-one-way.md` — "1. Imports run one way; host packages are the host's to supply" (2026-11-03, Accepted). Any shipped file may import a host package; host packages stay `peerDependencies` `*`, never `dependencies`; imports run entry → working parts, no cycles; the `WidthHelpers` injection seam is deleted.
  - `docs/adr/0002-rows-span-the-full-width.md` — "2. Rows span the full width" (2026-11-05, Accepted; supersedes the blank-right-edge property). Decision quoted in §6 below.
  - `docs/adr/0003-a-format-carries-modifiers.md` — "3. A format carries modifiers, and `|` is a second special character" (2026-11-06, Accepted). `$` and `|` are the two special characters, escaped `\$`/`\|`; modifiers are pi's six `ThemeStyle` booleans plus `capitalize`/`upper`/`lower`; `$bar` takes no modifier.
  - `docs/adr/0004-string-mutations-come-from-lodash-es.md` — "4. String mutations come from `lodash-es`, the package's first runtime dependency" (2026-11-06, Accepted). `lodash-es ^4.18.1` in `dependencies`, imported per function; the CommonJS `lodash` named imports pass `tsc` but throw under `node --test`, so the suite is the guard.
  - `docs/adr/0005-source-is-laid-out-by-responsibility.md` — "5. Source is laid out by responsibility, with data kept apart from visuals" (2026-11-06, Accepted). `data/` imports nothing outside itself; `visuals/` imports only itself and the types of `data/`; neither imports startup, footer setup or configuration.
  - `docs/adr/0006-a-label-gets-one-gap-and-outer-whitespace-is-not-text.md` — "6. A label gets one gap from the system, and a label's or format's outer whitespace is not text" (2026-11-07, Accepted). The gap is one trailing space in the label's own segment so `$bar` counts its column; no option exists for it.
- `package.json` — read. `"pi": { "extensions": ["./extensions/jefferson.ts"] }` (the one entry);
  `files: ["extensions", "README.md", "LICENSE"]`; scripts `test: node --test`,
  `typecheck: tsc --noEmit`; `peerDependencies` `@earendil-works/pi-coding-agent: *`,
  `@earendil-works/pi-tui: *`; the one runtime `dependencies` entry `lodash-es ^4.18.1`;
  devDependencies include both host packages `^1.4.0`, `@types/lodash-es`, `@types/node`,
  `typescript ^7.0.2`. Version `0.1.1`; entry's exported `VERSION` is deliberately `"0.0.0-alpha"`.
- `tsconfig.json` — read. `target/lib ES2023`, `module nodenext`, `strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`,
  `allowImportingTsExtensions`, `noEmit`, `include: ["extensions/**/*.ts", "tests/**/*.ts"]`.
- `openspec/changes/cell-widths/owner-rulings.md` — read in full (binding). The objective: "a way
  to allow for cells to fill no more than the width they need to display their content and
  neighboring cells then appear butted against them", target the model cell and the thinking cell
  reading as one cell; "I'm very curious what the ideal solution is for this and what flexibility we
  can provide." Inherited rulings: defaults beat settings; "Don't invent what we don't have to";
  "That lets pi-tui do its thing"; a row is one line whatever a format contains; breaks are cheap
  before 1.0; `~/.pi/agent/pi-jefferson.json` is never read or edited by a task.

## 2. Structure map

- Entry point: `extensions/jefferson.ts` — default export `jefferson(pi)` calls `startUp(pi)`; exports
  only `VERSION` and `default`. The only file pi loads (`package.json` `pi.extensions`).
- `extensions/jefferson/startup.ts` — `startUp`: `/jefferson` command; `session_start` handler
  (TUI mode only) releases the previous install, then `feedSessionData` → `readConfiguration` →
  `installFooter`, in that order; wires the repaint callback.
- `extensions/jefferson/configuration.ts` — `configurationPaths`, `readConfiguration`,
  `DEFAULT_CELLS`, `MAX_CELLS`; private `readInstruments`, `normalizeDocument`, `normalizeRow`,
  `cellsFromNames`, `defaultRow`, `blankCells`, `RejectedConfiguration`.
- `extensions/jefferson/footer-setup.ts` — `installFooter`: the one place that calls
  `ctx.ui.setFooter`, builds `createFooter(rows, sample, theme)`, returns
  `{ render, invalidate, dispose }`.
- `extensions/jefferson/data/session-data-store.ts` — `Readings`, `SessionDataStore`,
  `createSessionDataStore` (seed, `sample`, `modelSelected`, `thinkingLevelSelected`, `turnEnded`,
  `dispose`, the `(sessionId, leafId)`-keyed `scanTotals` cache).
- `extensions/jefferson/data/session-data-feed.ts` — `feedSessionData`: seeds from `ctx`, supplies
  `readUsage`/`readEntries`, subscribes `model_select`, `thinking_level_select`, `turn_end`; one
  `release()` undoes all.
- `extensions/jefferson/visuals/row.ts` — `ALIGNMENTS = ["left","right","center"] as const`,
  `CellAlign`, `Cell { instrument, align }`, `Row { id, cells }`.
- `extensions/jefferson/visuals/row-renderer.ts` — `Footer`, `createFooter(rows, sampleReadings,
  theme)`: the footer tree, cell clip/pad/align, `(sample, width)` memo, width-change re-seat.
- `extensions/jefferson/visuals/instrument.ts` — `Instrument`, `InstrumentDeclaration`,
  `DEFAULT_CELL_TEXT`, the seven declarations (`blank`, `model`, `thinking`, `path`, `context`,
  `tokens`, `cost`) in private `SHIPPED`, `instrumentNamed(name)`.
- `extensions/jefferson/visuals/instrument-binding.ts` — `BindInstrument`, `ConfiguredInstrument`,
  `instrumentBindings(configured)`: binds one instrument per name, shared across the document.
- `extensions/jefferson/visuals/format.ts` — `FormatSegment`, `collapse`, `parseFormat`,
  `validateStyle`, `resolveFormat`; the `$bar` width arithmetic; `MODIFIERS` table.
- `tests/` — `configuration.test.ts` (990 lines), `fake-theme.ts`, `format.test.ts` (419),
  `instrument.test.ts` (223), `jefferson.test.ts` (642), `row-renderer.test.ts` (420),
  `session-data-store.test.ts` (312). Tests import source only by relative path from `tests/`.
- `openspec/specs/` — living specs `statusline/spec.md` (1113 lines), `session-data-store/spec.md`,
  `extension-source-layout/spec.md`; `openspec/changes/archive/` holds ten archived changes.
- Data flow: host events → `session-data-feed.ts` → store → `sample()` once per render →
  `createFooter`'s slot → every cell's `instrument.render(readings, cellWidth, theme)` → clip/pad
  in `cellView` → `HStack`/`VStack` compose. Configuration flows `readConfiguration` → `Row[]` →
  `installFooter` → `createFooter` at install.

## 3. The geometry today (`extensions/jefferson/visuals/row-renderer.ts`, 76 lines)

- Tree built once at install: `const rowViews = rows.map((row) => ({ components: row.cells.map(cellView), stack: new HStack([], { gap: GAP }) }));` with `const GAP = 0;` (:13) and `const tree = new VStack(rowViews.map(({ stack }) => stack), { gap: 0 });` (:55).
- The cell component and its memo (:29-46):
  - `let cached: { sample: Readings; width: number; text: string } | undefined;` (:29)
  - `render(cellWidth)` (:31): on a miss,
    `cached = { sample: current, width: cellWidth, text: cell.instrument.render(current, cellWidth, theme) };` (:33) — the **only** width an instrument ever sees is its cell's allocated width.
  - clip: `const clipped = truncateToWidth(cached.text, cellWidth);` (:35)
  - pad: `const pad = Math.max(0, cellWidth - visibleWidth(clipped));` (:36)
  - align split: `const before = cell.align === "right" ? pad : cell.align === "center" ? Math.floor(pad / 2) : 0;` (:37) and `const after = cell.align === "left" ? pad : cell.align === "center" ? pad - Math.floor(pad / 2) : 0;` (:38)
  - pad emission with the reset guard: `const trailing = after > 0 ? (leavesStyleOpen(clipped) ? RESET : "") + " ".repeat(after) : "";` (:40, `RESET = "\x1b[0m"` :14, `leavesStyleOpen` :16-18), `const leading = before > 0 ? " ".repeat(before) : "";` (:41), `return [leading + clipped + trailing];` (:42) — one line per cell, always.
  - `invalidate()` clears the memo: `cached = undefined;` (:45).
- `Footer.render(width)` (:58-68): `current = sampleReadings();` (:59) — one sample per render, shared by every cell; on a width change
  `stack.clear();` (:61) then
  `stack.addChild(component, { basis: Math.floor(width / components.length), grow: 1, shrink: 0 });` (:63)
  for each cell — **the basis is ours, the remainder is the allocator's** — then `return tree.render(width);` (:67). `lastWidth` gates the re-seat (:60, :66).
- `Footer.invalidate()` (:70-74) clears every cell's memo.
- Consequence of today's shape: a cell always occupies exactly what pi-tui allocates it
  (`floor(W/N)` plus at most one remainder column), and the leftover inside the cell becomes pad on
  the side `align` names. There is no path by which a cell's rendered text influences the entry
  options; the only text→width feedback in the package is `$bar`, which fills columns *inside* its
  cell (§4).

## 4. What a cell knows about its own content

- The instrument interface (`extensions/jefferson/visuals/instrument.ts:10-12`):
  `render(readings: Readings, width: number, theme: Theme): string;` — a render returns a single
  string; the declaration may add `bar?: (readings: Readings) => number | null;` (:17).
- The bound seam (`extensions/jefferson/visuals/instrument-binding.ts:31`):
  `render: (readings, width, renderTheme) => resolveFormat(declaration, labelled, style, readings, width, renderTheme),`
  with the label prepended as a literal segment carrying the one-column gap (:26-29, ADR 0006).
- **No code anywhere measures an instrument's rendered width at a given or unbounded width.** The
  only `visibleWidth` uses in `extensions/` are `format.ts:198` (the bar's own arithmetic, below) and
  `row-renderer.ts:36` (the pad). `grep visibleWidth extensions/` returns exactly those two plus the
  imports. The `width` an instrument receives is always its cell's allocated width
  (`row-renderer.ts:33`); nothing calls `render` with an unbounded or "natural" width, and there is
  no measure/fit API on `Instrument`, `InstrumentDeclaration`, or any export (the export pin at
  `tests/jefferson.test.ts:297-312` lists each file's exact keys).
- `$bar` (`extensions/jefferson/visuals/format.ts:196-205`), the only width-taking variable, on
  `context` alone (`instrument.ts`, `bar: r => r.contextUsage?.percent ?? null`):
  - `const nonBar = pieces.reduce((sum, piece) => sum + visibleWidth(piece), 0);` (:198)
  - `const barWidth = Math.max(0, width - nonBar);` (:199)
  - `const filled = percent === null ? 0 : Math.min(barWidth, Math.floor((percent / 100) * barWidth));` (:201)
  - `bar = styledPiece("█".repeat(filled), filledStyle, theme) + styledPiece("░".repeat(barWidth - filled), { ...style, dim: true }, theme);` (:204-205)
  - **Natural width of a `$bar` instrument: exactly `nonBar`, the visible columns of its non-bar
    segments** — the bar contributes zero columns of its own choosing and instead takes *all*
    columns the cell leaves. At a very large width, `render(readings, W, theme)` returns the non-bar
    text followed by `W - nonBar` block columns (`█` filled per the percent, `░` for the rest), i.e.
    it grows without bound and fills the whole cell; at `width <= nonBar`, `barWidth` clamps to 0 and
    the bar is the empty string (spec scenario "A bar with no room"; test `format.test.ts:121-125`).
  - A second `$bar` in one format rejects the document at parse time (`format.ts:76`), and a
    modifier on `$bar` is rejected (`format.ts` parse, `parseFormat`).
- An instrument whose declared variable is unknown renders the empty string
  (`resolveFormat`, `format.ts:188-190`: `if (value === undefined) return "";`), label included.

## 5. The configuration shape (`extensions/jefferson/configuration.ts`, 300 lines)

- `export const DEFAULT_CELLS = 10; export const MAX_CELLS = 10;` (:51-52). Default row:
  `defaultRow` = `{ id: "row-0", cells: blankCells(DEFAULT_CELLS, bind) }` (:111-112), each blank
  cell `{ instrument: bind(blank), align: ALIGNMENTS[0] }` = `"left"` (:117-119).
- Cell entries are normalized in `cellsFromNames(names, index, notices, bind)` (:124-165):
  - empty list → `throw new RejectedConfiguration(`row ${index} has an empty cells list`)` (:126);
  - non-object entry → `…has a cells entry that is not an object; declare {"instrument": "model"}` (:132);
  - **unknown cell key →** `const unknownKey = Object.keys(entry).find((key) => key !== "instrument" && key !== "align");` (:134) then `…has a cell with an unrecognised key ${JSON.stringify(unknownKey)}; a cell carries only instrument and align` (:136) — **a new per-cell option (e.g. a width/fit key) is rejected here, and this is the exact line and message that would have to change**;
  - missing/non-string instrument → :142, :145; `align` validated by `isAlign` (:29-31) against `ALIGNMENTS` → `…has an align that is not "left", "right" or "center": ${JSON.stringify(alignValue)}` (:148-150); absent `align` defaults to `"left"` (:152);
  - unknown instrument name → warning notice, cell renders `blank` (:156-157);
  - **ceiling truncates last:** `if (cells.length < MAX_CELLS) { cells.push({ instrument: bind(instrument ?? blank), align }); }` (:161-163) — entries past the tenth are still validated and still warn about unknown names (:158-160).
- Row normalization `normalizeRow` (:168-196): non-object row rejected (:171); a `containers` key is not read and only sets a once-per-document warning notice (:176, :218, :241-242); `cells` must be a list (:181) else default ten blank cells (:185); `id` synthesized `row-${index}` and must be a non-empty unique string (:188-192, :229-233).
- Document envelope `normalizeDocument` (:199-236): not an object → rejected (:202); top-level row + `rows` list together → `the configuration carries both a top-level row and a rows list` (:209); `rows` must be a list (:214); empty list → default row (:225).
- Instrument options `readInstruments` (:64-108): unknown option key on an instrument → `instrument ${JSON.stringify(name)} carries an option its declaration does not have: ${JSON.stringify(key)}` (:81) — declared options per instrument are `FOUNDATIONAL_OPTIONS = ["format","style","label"]` (`instrument.ts:38`); `format` non-string :86, `label` non-string :97, `style` validated at read time against the live theme via `validateStyle` (:100-104).
- Whole-document rejection: every `RejectedConfiguration` → `readConfiguration` returns `{ rows: [defaultRow(bind)], warning: `pi-jefferson: ${path} was rejected (${error.message}); rendering the default row` }` (:296-301); unreadable/unparseable document → default row + `could not be read or parsed` warning (:278-283); absent file → default row, no warning (:272). Accepted-but-notable documents warn via `acceptedWarning` (:240-252): the `containers` key ("carries the containers key, which is no longer read; declare cells instead") and unknown instrument names ("names instruments the extension does not implement: …; those cells render blank").
- The two document paths: `configurationPaths(cwd)` (:259-264) — agent dir's `pi-jefferson.json` and trusted project's `<cwd>/.pi/pi-jefferson.json` (`CONFIG_DIR_NAME`); the trusted project document replaces the agent document whole (:268-269).
- **Where a new option would land:** per-cell → a new key on the cell object, rejected at :134-136 unless `Cell` (`visuals/row.ts:12-15`) and that find both change; per-row → a row key other than `cells`/`id`/`containers` is currently ignored silently (only `containers` warns), so a row-level option needs a new read in `normalizeRow`; per-instrument → a new key in the instrument's entry, rejected at :81 unless added to the declaration's `options` in `instrument.ts`. `Cell` is exactly `{ instrument: Instrument; align: CellAlign }` (`row.ts:12-15`); `ALIGNMENTS` is the tuple every align message derives from (`row.ts:6-8`).

## 6. Living specs, archived changes and ADRs on rows, cells and widths

Living spec `openspec/specs/statusline/spec.md` (requirement names and lines):
- `### Requirement: Cells are evenly distributed across the width` (:63) — "each cell MUST be given `floor(W / N)` columns as its `basis` and MUST be left free to `grow`, so pi-tui's allocator spends the leftover `W mod N` columns — one at a time, on the row's earliest cells — and the row spans the full width. The extension MUST NOT leave that remainder unallocated, and MUST NOT pad the composed line itself. Cell widths MUST be recomputed from the width given at render time." Scenarios: 8 cells at 80 → 10 each; 3 at 100 → "the first cell occupies 34 columns and the other two 33 each"; resize → `floor(new width / N)` plus one wherever the remainder reaches; ten at 132 → "the first two cells occupy 14 columns and the other eight 13 each"; "Composition and allocation are the host's" — the `HStack` composes, "the extension supplies each cell's `basis` and `grow`" (:98).
- `### Requirement: A row's cells are its count and its placement` (:163) — absent `cells` means ten, ceiling ten, longer truncated not rejected; each entry an object whose `instrument` is a non-empty string; "A key on a cell object that the extension does not recognise MUST be rejected, and the warning MUST name that key." Scenario "a cell object with an unrecognised key" names **the declined `width`** explicitly: "the declined `width`, or a misspelling such as `aling`".
- `### Requirement: Instrument text is bound by the row's geometry` (:341) — text clipped at its end and padded to the cell's full width "on the side opposite the cell's `align`, or across both sides under `center`"; "Instrument text MUST NOT change the geometry: each of a row's N cells occupies the width pi-tui allocates it… and the row spans the full width. Alignment hugs its cell's edge, not the row's." Scenario: a right-aligned last cell at 132 with ten cells "occupies 13 columns and its text ends at the window's edge".
- `### Requirement: A cell's alignment is the padding side inside it` (:368) — `align` MUST be `left`, `right` or `center`, absent means `left`; "`center` splits it across both sides", "`floor(pad / 2)` columns to its left and the remainder to its right, so an odd pad leaves its extra column on the right"; pad measured "in visible terminal columns, after clipping, never in code units"; an align outside the three ("middle", "Center", `4`) rejects the document.
- `### Requirement: The footer's tree is built once and reads the current render's sample` (:433) — VStack of one HStack per row; "A width change MUST re-seat the entry options through the stack's public typed route, keeping every component… by clearing the row's stack and adding the same cell components back, reaching no entry list the host keeps protected".
- `### Requirement: $bar takes the width the rest of the format leaves` (:759) — "MUST take the columns the rest of the format leaves in the cell, MUST shrink to nothing when nothing is left", at most one per format.
- Also relevant: "A row is one line tall" (:124) — the guarantee belongs to the cell, not to format validation; "Cell content comes from an instrument" (:100) — no API for third parties to supply or replace cell content.

Archived changes:
- `openspec/changes/archive/2026-11-04-cells-as-objects/owner-rulings.md` — **ruled:** "`align` is on the cell; **`width` and a `spacer` instrument are declined** — a relative share pool means deciding what the pool totals, what happens when shares overshoot, and how the remainder distributes, all to produce a gap that `align` already provides. **Proportional layout is an addition to this shape if a real need appears later.**" (deferred, not ruled out). `center` joined the enum on 2026-11-03 ("There should be left, right, and center"), with the odd-pad split `floor(pad/2)` left / remainder right recorded as a choice; truncation stays at the end; default and ceiling moved 8 → 10. Archived spec `…/2026-11-04-cells-as-objects/specs/statusline/spec.md:77-81` carries the same "declined `width`" scenario. That change's earlier spec text (:108-125) records the *superseded* geometry — `floor(W/N)` each with `W mod N` blank at the right edge ("a right-aligned last cell ends `W mod N` columns short of that edge — 2 columns at 132 with ten cells") — which ADR 0002 replaced.
- `openspec/changes/archive/2026-11-05-configurable-instruments/owner-rulings.md` — 2026-11-05 Layout: ceiling ten accepted ("with the remainder spread by `grow` no ceiling has a geometric advantage"); "Let pi-tui do the layout… Every cell gets `basis: floor(W / N)` together with `grow: 1`"; `grow: 1` alone ruled out (pi-tui 1.5.0's allocator computes each share from what earlier cells left: ten cells over 80 → 13,11,10,9,8,7,6,6,5,5); "build the VStack of HStacks once in createFooter". **"Scope held out of this change: Row-level justify, gaps, proportional widths, a fourth alignment, … are separate changes if they ever matter."** — deferred, not declined; same list at that change's `council.md:7`, `design.md:118`, `tasks.md:26`. Its spec (`…/2026-11-05-configurable-instruments/specs/statusline/spec.md:5-40`) is the source of the current 34/33/33 and 14/14/13×8 scenarios; its "declined `width`" option-key scenario is at :407-411.
- **ADR 0002** (`docs/adr/0002-rows-span-the-full-width.md`), exact decision: "Give each of a row's N cells `basis: floor(W / N)`, `grow: 1` and `shrink: 0`, with no gap. The host's allocator spends the remainder and its `HStack` composes the line; Jefferson does not pad the composed row. Keep the footer tree and its cell components for the install's lifetime. On a width change, re-seat the same components through `clear()` and `addChild` with the new per-row basis, using only public stack methods." Consequences: every row spans the full window and a right-aligned last cell ends at the window's edge; "Remainder columns belong to the earliest cells: three at 100 become 34/33/33; ten at 132 become 14/14/13/13/13/13/13/13/13/13"; existing documents keep their text and gain different geometry wherever the width has a remainder, while "the cell's clip, alignment, visible-column measurement and reset-before-pad guarantees are unchanged".

## 7. Tests

Helpers in `tests/row-renderer.test.ts`: `FRAME = "\x1b[0m\x1b]8;;\x07"` (:16, the host's per-child framing), `composed(...cells)` = `FRAME + cells.join(FRAME) + FRAME` (:20), `visible(line)` strips `FRAME` (:24), an all-unknown `readings` (:28), `rowOf(count, text)` (:31), `lineAt(row, width)` (:36). `tests/fake-theme.ts` is the shared theme.

Width/remainder/alignment/full-width assertions:
- `tests/row-renderer.test.ts:40` "a width that divides evenly gives every cell the same columns" — 8 cells at 80, each `"Lorem ipsu"`, `assert.equal(line, composed(...Array(8).fill("Lorem ipsu")))`, `visibleWidth(line) === 80`.
- `:47` "a width that does not divide evenly spends the remainder on the row's earliest cells" — 3 cells at 100 → `padEnd(34)`, `padEnd(33)`, `padEnd(33)`, width 100.
- `:56` "the default row of ten cells at 132 spans all 132 columns" — `"x".padEnd(14)` twice then eight `padEnd(13)`, width 132.
- `:63` "content wider than its cell is truncated to one line" — 3 cells at 12, width 12, no full text, one line.
- `:73` "an instrument resolving text wider than its cell is clipped and stays one line" — 2 cells at 20, first cell starts `provide`, width 20.
- `:86` "short cell text is padded so the line spans the full width" — `"ab"` ×3 at 12 → `"ab  "` each.
- `:92` left pads right (`"ab     "` ×2 + `"ab    "` at 20); `:99` right pads left (`"     ab"` ×2 + `"    ab"`); `:109` center splits (`"  ab   "` ×2 + `"  ab  "`); `:118` odd pad puts the extra column on the right (`"  abé  "` ×2 + `" abé  "`).
- `:127` "text wider than its cell renders identically under any alignment" — left = right = center at 21.
- `:143` wide glyph dropped by the clip leaves a pad keeping the cell's width (and the right-aligned variant); `:157` emoji clipped at the boundary leaves a one-column pad; `:170` combining mark measured in columns; `:183` ANSI-styled cell's pad carries no styling (one style-setting SGR per cell, reset before pad); `:205` "the host closes an open style between cells"; `:221` wide glyphs and ANSI measured in visible columns, not string length.
- `:233` "the footer renders one line per row, in order, each spanning the width" — rows of 2/4/8 cells at 80 → three lines, widths `[80, 80, 80]`.
- `:250` "more cells than columns still renders exactly one line of the width" — 8 cells at 4 → width 4.
- `:257` "cell widths are recomputed when the width changes" — render 100 → 34/33/33, then render 90 → three `padEnd(30)`.
- `:269` "the built-once tree keeps its cell memo when two renders share sample and width" — two renders at 30 resolve once; a render at 40 resolves again.
- `:287` "each row seats its own basis on the first render" — rows of 3 and 4 at 13 → `a    / a   / a   ` and `b   / b  / b  / b  `.
- `:296` "one render samples the store exactly once" — 3 rows × 8 cells → one extra sample per render.
- `:315` "an instrument resolves once per (sample, width) within a render, and again in the next render" — widths handed out `[30,30,30,10,10,10,30]`, one readings object per render, a new object next render.
- `:341` "invalidation drops cell memos and keeps the footer's three lines"; `:360` two cells holding `model` resolve identical text at 48; `:379` a push between two renders shows up in the next render and not before.
- `tests/format.test.ts` (helper `rendered(name, format, {readings, width, style, theme})`, default width 80, :27-30): `:103` `$bar $percent` at width 20 → 6 `█` + 8 dim `░` + `" 43.2%"`; `:114` "bar takes the fourteen columns left by six columns of prose" (`$percent $bar` at 20) and `visibleWidth(rendered("context", "😀$bar", {width: 6})) === 6`; `:121` "a bar with no room contributes no track…" (`fixed$bar` at 5 and 2, `$bar` at 0 → `""`); `:138` thresholds 70/90 (`70→accent, 70.1→warning, 90→warning, 90.1→error`); `:149` null estimate → whole dim track `░`.repeat(13) beside `?/200k`; `:154` "bar-only formats fill their cell" — `$bar` at width 10 fills all 10 columns (0% → 10 `░`, 100/150% → 10 `█`).
- `tests/configuration.test.ts`: `:128` non-object cells entry rejects and names `declare {"instrument": "model"}` (entries `"model"`, `4`, `["model"]`, `null`); `:139` unrecognised cell key rejects and names the key — cases include `{instrument:"model", width:4}` → `"width"`, `aling`, `text`; `:154` no instrument; `:172` align outside the three (`"middle"`, `"Center"`, `4`); `:187` cells as list of strings rejected; `:195` absent align normalizes to `"left"`; `:214` malformed entry past the ceiling still rejects; `:224` unknown instrument past the ceiling warns and renders ten cells; `:234` align past the ceiling still rejects; `:245` `DEFAULT_CELLS === 10`, `MAX_CELLS === 10`; `:322` empty cells array rejected; `:441` "every cell carries an instrument and an alignment" — `Object.keys(cell)` is exactly `["instrument","align"]`; `:778` instrument option keys `"frmát"`, `"width"`, `"lable"` rejected with `carries an option its declaration does not have`; `:864` rejection precedence envelope → instruments → cells.
- `tests/jefferson.test.ts` (end to end through a fake host): `:278` default row at 80 → ten 8-column clipped placeholder cells, `visibleWidth === 80`; `:281` "a right-aligned cell ends at its cell's right edge end to end" — two cells at 80, `stripTerminalSequences(line).indexOf("Thinking: High") === 66`; `:551` "configured formats, styles and a width-taking bar render end to end" — at 80: `"🧠: claude-opus-4 from anthropic".padEnd(40) + "43.2% " + "█".repeat(14) + "░".repeat(20)`, `visibleWidth === 80`; `:587/:592/:610/:626` per-cell `padEnd(40)`/`padEnd(8)`/`padEnd(80)` expectations at width 80.
- Command results this run: `pnpm typecheck` (`tsc --noEmit`) — **passed, exit 0, no diagnostics**.
  `pnpm test` (`node --test`) — **257 tests, 257 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo**, duration ≈ 510 ms, suites 0.

## 8. Documentation (`README.md`)

- `:13-17` Status — "a footer of one line per configured row, with evenly divided cells spanning its full width… With no configuration you get the default single row of placeholder cells."
- `:31-52` Configuration — example document with `rows` → `cells` → `{ "instrument": "context", "align": "right" }` (:41); "Each cell names its instrument; `instruments` configures each instrument once by name for every cell that uses it"; the instruments table (:55-63).
- `:122-124` — "`$bar` is available on `context`: it takes the width the rest of the format leaves in the cell, and shrinks to nothing when none is left. Use at most one per format, and no modifier after it."
- `:146-152` "Why another statusline" — the package is "for the case where you want a layout — rows, alignment, per-gap spacing, a stated truncation priority".
- `:185-199` Development — tests live in `tests/`; the manifest names the one entry; host packages are `peerDependencies`; `lodash-es` is the one runtime dependency (ADR 0004).

## 9. Unknowns and missing material

- pi-tui's allocator internals — what entry options `HStack` accepts besides `basis`/`grow`/`shrink`/`gap`, whether a child can declare a content-driven width or `shrink`, and how nested stacks resolve — were **not** read (installed package source is Chidi's lane; `research-chidi.md` in this change directory was not read either). The repository's own record (ADR 0002, the 2026-11-05 rulings) states `grow: 1` alone skews shares and that the allocator spends the remainder on the earliest cells, but nothing here proves what options exist.
- Whether `HStack.addChild`'s options type would even accept a new per-child width key is unknown from this repository.
- What happens today when `W < N` (more cells than columns) beyond "still one line of the width" (`row-renderer.test.ts:250`) — the allocator's behavior at basis 0 is the host's, unobserved here.
- Row-level keys other than `cells`, `id`, `containers` are silently ignored by `normalizeRow` — confirmed by reading, but whether that silence is intended for future options is not recorded anywhere in the repository.
- Joel's own `~/.pi/agent/pi-jefferson.json` was not read or edited, per the rulings; his described shape (top row: cwd, model right-aligned, thinking right-aligned; second row: two blank cells and the context cell right-aligned) comes from `owner-rulings.md`'s summary only.
- `openspec/changes/cell-widths/research-chidi.md` exists in the change directory (32 KB) and was deliberately not read; any platform-behavior claim above comes from the repository's own ADRs/rulings/specs, not from it.

## 10. Questions for the invoker

- A per-cell fit option would have to pass `configuration.ts:134-136` ("a cell carries only instrument and align") and extend `Cell` in `visuals/row.ts:12-15`; a per-row option would be a new read in `normalizeRow` (row keys other than `cells`/`id`/`containers` are currently ignored, not rejected); a per-instrument option would extend the declaration's `options` (`instrument.ts:38`) and pass `:81`. Which surface does the design intend, if any?
- ADR 0002 and the living spec pin `grow: 1`, `shrink: 0`, `basis: floor(W/N)` and "Instrument text MUST NOT change the geometry" — does this change intend to amend that requirement and ADR, or to add a per-cell opt-out that leaves the default untouched?
- The 2026-11-04 ruling declined `width` and `spacer` and deferred "proportional layout… if a real need appears later", and 2026-11-05 deferred row-level justify/gaps/proportional widths/a fourth alignment — should the design treat this change as the "real need" that reopens proportional layout, or as something narrower?
