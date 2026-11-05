# Research — Eleanor the Scout (codebase reconnaissance for `cells-as-objects`)

Read-only reconnaissance of `/Users/joelleibow/Projects/pi-jefferson` at `main` (`6bd6309`,
"Render live data from a session data store (#6)"). Every path below is repo-relative.
Line numbers refer to the working tree at that commit. No source file was modified.

## 0. Required reads

| Read | Status | Notes |
| --- | --- | --- |
| `CLAUDE.md` / `AGENTS.md` | not present | Neither exists at the repo root. |
| `ARCHITECTURE.md` | not present | Does not exist; architecture lives in file-header comments (e.g. `configuration.ts`, `row-renderer.ts`, `extensions/jefferson.ts`) and in `openspec/specs/`. |
| ADRs | not present | No `adr/` or `docs/adr` directory. Decision records exist as `design.md` / `*-gate.md` files inside `openspec/changes/archive/<change>/` (three archived changes: `2026-11-02-code-structure`, `2026-11-02-statusline-skeleton`, `2026-11-03-session-data-store`) and as header-comment "D-numbers" (`D1`–`D12`) sprinkled through source. `openspec/changes/cells-as-objects/` already contains `README.md` (one-line summary) and `owner-rulings.md` (binding decisions; summarized in §7). |
| `package.json` | read | `type: module`, pnpm workspace, `pi` extension manifest pointing at `./extensions/jefferson.ts`, scripts `test: node --test` and `typecheck: tsc --noEmit`. TypeScript ^7.0.2, `@types/node` ^26. |

## 1. The config surface as it ships (`extensions/jefferson/configuration.ts`)

**What `cells` accepts today.** A `cells` key on a row object must be an `Array`
(`normalizeRow`, line 103: `row ${index} has a cells value that is not a list` otherwise).
The array's entries are **strings only**, narrowed element-wise in `cellsFromNames`
(lines 67–87): a non-string entry at *any* position — including past the ceiling —
rejects the whole document (line 76: `row ${index} has a cells entry that is not a string`).
An **empty array rejects the document** (lines 68–70: `row ${index} has an empty cells list`).
An absent `cells` key yields `blankCells(DEFAULT_CELLS)` (line 107).

**Resolution of a string entry to an instrument.** `instrumentNamed(name)` from
`extensions/jefferson/instrument.ts` (line 78 of `configuration.ts`); the shipped table there
is `{ blank, model, thinking }` (`SHIPPED`). An unknown name yields `undefined`, which is
collected into `notices.unknownInstruments` (line 82) and renders as `blank`
(line 85: `cells.push({ instrument: instrument ?? blank })`).

**Order of operations within `cellsFromNames`** — the order matters because the change must
preserve it for objects:

1. empty-list check (reject) — line 68
2. per entry: string narrowing (reject) — line 76
3. `instrumentNamed` lookup + unknown-name collection into notices — lines 78–82
   (deliberately *before* the ceiling check, so a typo past the ceiling still warns)
4. ceiling truncation **last** — line 84 `if (cells.length === MAX_CELLS) break;`
5. push `{ instrument: instrument ?? blank }` — line 85

**Ceiling and defaults.** `DEFAULT_CELLS = 8` (line 42) and `MAX_CELLS = 8` (line 43), both
exported. `DEFAULT_CELLS` is used by `defaultRow()` (line 55) — which is what renders when a
document is absent, unparseable (line 183), rejected (line 204), or yields zero rows (line 200) —
and by `normalizeRow` for a row omitting `cells` (line 107). `MAX_CELLS` is used only as the
truncate-at check in `cellsFromNames` (line 84).

**Documented error policy (per failure mode).** All rejections throw `RejectedConfiguration`
(class, line 46), caught in `readConfiguration` (lines 202–209) and converted to
`{ rows: [defaultRow()], warning: \`pi-jefferson: ${path} was rejected (${error.message}); rendering the default row\` }`.
Failure modes and their exact messages:

- document not an object / not parseable — rejected or warned, default row
- both top-level row shapes at once — rejected
- `rows` not a list — rejected
- row not an object — rejected
- `cells` not a list — rejected
- empty `cells` list — rejected (`empty cells list`)
- non-string `cells` entry — rejected (`not a string`)
- duplicate row ids — rejected
- non-string/empty row `id` — rejected
- **accepted-document warnings** (`acceptedWarning`, lines 161–179), joined with `;` under one
  `pi-jefferson: <path> ...` prefix: the `containers` key ("...carries the containers key, which
  is no longer read; declare cells instead", once per document) and unknown instruments
  ("names instruments the extension does not implement: X, Y; those cells render blank").

The warning string is surfaced by the entry (`extensions/jefferson.ts`, `ctx.ui.notify(warning,
"warning")`).

**What the change must touch here:** the string narrowing at line 76 becomes object-shape
validation (`instrument` a string, optional `align`, unknown keys?), `instrumentNamed` is
called on `cell.instrument` rather than the entry itself, `DEFAULT_CELLS`/`MAX_CELLS` become 10,
`blankCells` must build the new cell shape, and the `Cell` interface (line 16) gains `align`.
`cellsFromNames`'s name and doc comment ("from its `cells` names") become wrong.

## 2. The `Cell` and `Row` types and every consumer

- `Cell` — `extensions/jefferson/configuration.ts:16` — `interface Cell { instrument: Instrument }`.
- `Row` — `extensions/jefferson/configuration.ts:21` — `interface Row { id: string; cells: Cell[] }`.
- `Configuration` — same file, line 27 — `{ rows: Row[]; warning: string | undefined }`.

**Consumers in `extensions/`:**

- `extensions/jefferson/configuration.ts` — constructs cells in `blankCells` (line 58) and
  `cellsFromNames` (line 85); the only writer of `Cell`.
- `extensions/jefferson/row-renderer.ts` — imports `type Row` (line 14); reads
  `cell.instrument.resolve(...)` (line 45). This is the only read of a cell's content; an
  `align` property would be consumed here.
- `extensions/jefferson.ts` — consumes `Row[]` opaquely (`rows`, `rows.length`,
  `createFooter(rows, ...)`); no direct `Cell` reference.
- `extensions/jefferson/session-data-store.ts` — no `Cell`/`cells` reference at all (grep
  confirms); it only serves `Readings`.
- `extensions/jefferson/instrument.ts` — defines `Instrument` (the cell's payload) but not
  `Cell`; unaffected by shape except that `instrumentNamed` stays the resolver for the
  `instrument` string inside the new object.

**Consumers in `tests/` (fixtures constructing cells):**

- `tests/row-renderer.test.ts` — imports `type Row` (line 10); fixtures `rowOf(count, text)`
  (line 23) and inline rows at lines 55–58, 76–83, 142–144, 162–163 build
  `{ instrument: ... }` objects directly — every one needs an `align` field or must keep
  compiling under a defaulted optional field.
- `tests/configuration.test.ts` — asserts cell shape heavily, including
  `Object.keys(cell)` equal to `["instrument"]` (line 299) — that test *will be wrong* the
  moment `align` (even defaulted) or any second key exists.
- `tests/jefferson.test.ts` — consumes cells end-to-end through JSON documents
  (`{ cells: ["model", "thinking"] }` fixtures at lines 244, 300, 334, 349, 364, 380, 417)
  and one explicit geometry assertion at line 251–254 (8 cells of 10 columns at width 80).
- `tests/instrument.test.ts`, `tests/session-data-store.test.ts` — no cell construction;
  unaffected by the shape, `instrument.test.ts` unaffected entirely.

## 3. The renderer's padding arithmetic (`extensions/jefferson/row-renderer.ts`)

`renderRow(row, width, helpers, readings)` (lines 36–50):

- `GAP` is a module constant `0` (line 29, "fixed at 0 for this change (D7's `g = 0` case)").
- `cellWidth = Math.floor((width - (N - 1) * GAP) / N)` (line 42) — i.e. `floor(W / N)` today
  because GAP is 0.
- Per cell (lines 44–46): resolve text via `cell.instrument.resolve(readings)`, truncate with
  the **host-injected** `helpers.truncateToWidth(text, cellWidth)` (truncation — including
  whether an ellipsis is added and where — is host behavior, in `@earendil-works/pi-tui`),
  then **pad on the right**: `truncated + " ".repeat(max(0, cellWidth - visibleWidth(truncated)))`.
  So every cell today is effectively left-aligned within its slot.
- Row remainder (lines 48–49): `remainder = width - visibleWidth(line)`; if positive it is
  appended as trailing spaces — the leftover `W mod N` columns sit blank at the **row's right
  edge**, after the last cell.

**What a right-aligned cell must do differently:** emit
`" ".repeat(max(0, cellWidth - visibleWidth(truncated))) + truncated` — the same pad amount,
prepended instead of appended. The truncation call is unchanged (end-anchored, per the owner
ruling), the cell still occupies exactly `cellWidth` visible columns, and the row remainder
still lands at the right edge. Note the cell-level pad computation already exists; only its
placement side is conditional. `visibleWidth` (host helper) already measures wide glyphs and
ANSI escapes, so a right-aligned padded cell inherits correct measurement.

## 4. The living specs

### `openspec/specs/statusline/spec.md` — requirement by requirement

| Requirement | Relation to this change |
| --- | --- |
| The statusline renders the declared rows | Leaves alone — no cell content/count/geometry claim. |
| Both configuration shapes normalize to a list of rows | Leaves alone — about row-level shape. |
| Row identifiers | Leaves alone. |
| Cells are evenly distributed across the width | Leaves alone in substance (`floor(W / N)` geometry unchanged; "every row renders as it does today" untouched). Scenarios use a row of 8 cells at width 80 — harmless examples, not count requirements. |
| Cell content comes from an instrument | **Modifies.** "…it is what the default row's **eight** cells hold" names the old default count; the rest (every cell holds an instrument; no third-party content API) survives untouched. |
| A row is one line tall | Leaves alone — truncation-to-cell-width stays, end-anchored per the ruling. |
| The configuration surface is extension-owned | Leaves alone. |
| **A row's cells are its count and its placement** | **Modifies heavily.** "An absent value MUST mean eight cells, and the ceiling MUST be 8" both move to 10. "Every entry … validated … an unknown name past it still warns" must be re-stated for object entries. Scenario "a cells entry that is not a string" must become a not-an-object entry. The scenario "names 12 instruments … renders the first 8" becomes "first 10". A new failure mode (an object entry without a valid `instrument`, or with an invalid `align`) has no requirement yet — the spec is silent on it. |
| Configuration designates each cell's instrument | **Modifies.** "A row MAY declare `cells`, the **names of instruments**" — entries are objects now; the requirement's substance (per-position resolution, unknown-name warning + blank render) carries over but its text names strings. |
| An instrument resolves a cell's text by reading the store | Leaves alone — `blank`'s constant and store reads unchanged. |
| The model instrument | Leaves alone (placement via configuration is already shape-agnostic). |
| The thinking instrument | Leaves alone. |
| Instrument text is bound by the row's geometry | **Modifies in text, not substance.** Truncate-and-pad stays, but "padded so the row stays one line" is now side-conditional; the requirement text does not need to name alignment unless the change wants it to, but any spec delta introducing `align` lives here or in the count/placement requirement. |

**No requirement or scenario anywhere in `statusline/spec.md` mentions `align`, a cell
property other than its instrument, or the string-ness of entries except in the two
requirements marked "Modifies" above.** The spec has no scenario asserting that a bare number
or a `cellCount` key is rejected — that is an absence the change's delta must decide whether to
state (the code rejects both today, incidentally, because `cells` must be a list).

### `openspec/specs/session-data-store/spec.md`

Nothing binds a cell's rendering. Every requirement is about datum storage, synchronous reads,
unknown, freshness, derived values, render-consistent state, session replacement, repaint, and
disposal. The closest touchpoints: "Every read in one render observes one state" and "Expensive
derivations are bounded" speak of *cells reading*, but only as consumers of `Readings`; a cell's
alignment never reaches the store. **This spec is untouched by the change.**

## 5. The tests that will move

### `tests/configuration.test.ts`

| Line | Test | What it needs |
| --- | --- | --- |
| 27 | top-level row normalizes to one row | Fixture `cells: ["blank" ×4]` becomes objects; count assertions stand. |
| 40 | both shapes at once rejected | `rows[0].cells.length` expected 8 → 10. |
| 47, 59, 66, 73, 79 | absent/empty/default cells = 8 | All `8` / `cells.length, 8` expectations → 10; line 79's `DEFAULT_CELLS` reference stands once the constant moves. |
| 89 | cells is count and placement | `["model","thinking","blank"]` fixture becomes objects; `cell.instrument` deepEqual stands. |
| 98 | 12 instruments keeps first 8 | Ceiling 8 → 10; consider a fixture past 10 (e.g. 12 → first 10, or 13). |
| 104 | non-string entry past ceiling rejects | Becomes a non-object (or invalid-object) entry; `/not a string/` warning match must follow whatever message the change picks. |
| 114 | unknown name past ceiling warns, renders 8 | 8-blank fixture → 10; 9th position still past a ceiling of 10 needs a longer fixture. |
| 124 | constants named for cells | `DEFAULT_CELLS, 8` / `MAX_CELLS, 8` → both 10. |
| 129, 139, 180, 242, 249, 265, 281, 311, 318 | rejected/default-row tests expecting 8 | All `cells.length, 8` expectations → 10 (the default row follows `DEFAULT_CELLS`). |
| 149, 155, 166 | unknown-instrument warnings | String-name fixtures become `{ instrument: "nope" }` objects; warning text/regexes may survive if the message keeps naming the instrument. |
| 188–201 | parametrized: entries of zero/negative/2.5/null/**`{ text: "x" }`** rejected | **Notably, a cell-descriptor object is *rejected today*** (line 197–198). The whole parametrization must be rewritten: objects become legal, so the rejection cases become a missing/invalid `instrument` key, a non-string `instrument`, etc. `[{ text: "x" }]` flips from rejected to accepted-with-warning-or-rejected-on-instrument-missing depending on the chosen policy. |
| 203–213 | cells given as number/string rejected | Survives as-is (still a list-or-absent rule) — verifies the no-bare-number ruling. |
| 249, 265, 281 | trusted/project/agent document tests | `[8, 8]` and `[3]` fixtures: string lists → objects; the 8s → 10. |
| 299 | every cell is a Cell object carrying only an instrument | `Object.keys(cell)` deepEqual `["instrument"]` — **must change**: either `["instrument", "align"]` (if align always materializes) or `["instrument"]` with align absent-until-set; a new fixture must assert the `align` default is `left`. |

### `tests/row-renderer.test.ts`

| Line | Test | What it needs |
| --- | --- | --- |
| 23 | `rowOf` fixture builder | Adds `align` to the built cells (default left keeps all existing assertions). |
| 30 | divides evenly (8 @ 80) | Unchanged arithmetic; fixture shape only. May want a 10-cell companion. |
| 37 | remainder blank at right edge (3 @ 100) | Fixture shape only. |
| 45 | truncated to one line | Fixture shape only. |
| 54 | clipped and stays one line | Fixture shape only. |
| 69 | short text padded full width | Fixture shape only; **new sibling test needed: right-aligned cell pads on the left** (`" ".repeat(pad) + text`). |
| 75 | wide glyphs / ANSI measured visibly | Fixture shape only; a right-aligned ANSI variant would protect the pad arithmetic under escapes. |
| 92 | one line per row | Fixture shape only. |
| 109 | more cells than columns | Fixture shape only. |
| 115 | widths recomputed on resize | Fixture shape only. |
| 123, 139, 161, 172 | store-sampling / consistency tests | Fixture shape only; no count assertions beyond fixture choices. |

### `tests/jefferson.test.ts`

| Line | Test | What it needs |
| --- | --- | --- |
| 244 | rejected configuration renders default row | Fixture `cells: ["blank"], rows: [{}]` (deliberate both-shapes rejection) becomes an object list; the geometry assertion at **251–254 — `truncateToWidth(DEFAULT_CELL_TEXT, 10).repeat(8)` at width 80 — becomes `.repeat(10)` with cell width 8**, the ruling's recorded cost made visible here. |
| 256 | exported surface offers no cell-content API | `Object.keys(configuration)` asserts exactly `["DEFAULT_CELLS", "MAX_CELLS", "readConfiguration"]` — unchanged if the change adds no new export. |
| 297, 332, 347, 362, 378, 415 | `{ cells: ["model", "thinking"] }` end-to-end fixtures | All become `{ cells: [{ instrument: "model" }, { instrument: "thinking" }] }` (or with `align`); rendering assertions (`startsWith`, `includes`) survive unchanged because both cells render left-aligned text today. A right-aligned end-to-end case (`{ instrument: "thinking", align: "right" }`) is the integration-level proof the ruling wants. |

### Tests with no cell-shape or count exposure: `tests/instrument.test.ts` (no change),
`tests/session-data-store.test.ts` (no change).

## 6. README prose that is now wrong

`README.md`:

- **Line 18** (Status): "Formatting, **alignment**, and gaps are not built yet." — alignment
  *is* built by this change; the sentence must drop "alignment".
- **Line 15** (Status): "A cell holds an instrument" — still true, but a cell now also carries
  an `align`; one clause may want updating.
- **Line 35** ("Why another statusline"): "you want a layout — rows, alignment, per-gap
  spacing, a stated truncation priority" — aspiration prose; alignment moves from aspiration
  to delivered, but this paragraph is about the *general case* and may survive. The change
  should decide.
- The README documents **no configuration example at all** — an absence: there is no
  `pi-jefferson.json` shape documented anywhere in the README, so no example prose to
  correct; adding one (with the new object shape) is a candidate the change can take or leave.
- Factually adjacent: `package.json`'s `description` field ("modules, a real layout, and
  per-module formatting") uses the word "modules", which `owner-rulings.md` bans; the README
  itself does not. Recorded as a fact, not a judgment.

## 7. The binding owner rulings (`openspec/changes/cells-as-objects/owner-rulings.md`, read in full)

- `cells` is a list of objects `{ "instrument": "model" }`; never a bare number, never a list
  of strings; no `cellCount` key; `cells` is a list of objects or absent.
- `align` on the cell, `left` default, `right` available; `center` out of scope; `width` and a
  `spacer` instrument declined.
- Truncation stays end-anchored; only the padding side moves.
- Default and ceiling move from 8 to 10.
- Vocabulary: row/cell/instrument/label-over-data; "module"/"widget" banned.

## 8. Absences and open questions

1. **No `align` exists anywhere in the code** (grep over `extensions/`, `tests/`,
   `openspec/specs/`, `README.md` finds only README aspiration prose). Everything for it is
   new work: type field, parse validation, renderer branch, tests.
2. **The spec is silent on what an invalid cell object is.** Today a cell-descriptor object is
   *rejected* (`configuration.test.ts:188–201`, including `[{ text: "x" }]`). The change must
   pick: missing `instrument` key — reject or blank-with-warning? Non-string `instrument` —
   reject? An `align` value other than `left`/`right` — reject or warn-and-default? Unknown
   extra keys — reject, warn, or ignore? None of these has a ruling or a spec line.
3. **The warning message wording is not ruled.** The unknown-instrument warning text
   ("names instruments the extension does not implement: …; those cells render blank") and the
   "not a string" rejection text both change shape with the object entries; tests at
   `configuration.test.ts:114, 155, 166` regex against the current text.
4. **Whether `align` materializes in the normalized `Cell` always (as `"left"`) or only when
   set** is undecided; `configuration.test.ts:299` currently pins `Object.keys(cell)` to
   exactly `["instrument"]`, so whichever choice must rewrite that test.
5. **Ellipsis behavior is host-owned.** "Truncation stays at the end" is delegated to
   `@earendil-works/pi-tui`'s `truncateToWidth`; the repo contains no local truncation code and
   no test pins whether an ellipsis is appended. The ruling's "keeps the ellipsis at the end"
   is therefore already satisfied by delegation, but nothing in-repo verifies it.
6. **The geometry cost at 80 columns** (10 cells × 8 columns) is recorded in the rulings; the
   end-to-end test at `jefferson.test.ts:251` is where it will show.
7. No `CLAUDE.md`/`AGENTS.md`/`ARCHITECTURE.md`/ADR directory exists; the only process
   guidance is `openspec/config.yaml` (empty template, schema `spec-driven`) and the archived
   changes' gate documents.

## 8b. Feature path (config → render, as it ships)

1. `extensions/jefferson.ts` — `jefferson(pi)`, `session_start` handler: resolves
   `pi-jefferson.json` paths (agent dir, trusted project), calls `readConfiguration`, notifies
   the warning, hands `rows` to `createFooter` with host width helpers.
2. `extensions/jefferson/configuration.ts` — `readConfiguration` → `normalizeDocument` →
   `normalizeRow` → `cellsFromNames` (string entries → `instrumentNamed` → `Cell{instrument}`)
   or `blankCells(DEFAULT_CELLS)`.
3. `extensions/jefferson/instrument.ts` — `instrumentNamed` lookup over
   `{blank, model, thinking}`; `blank` renders `DEFAULT_CELL_TEXT`.
4. `extensions/jefferson/row-renderer.ts` — `createFooter` → `renderRow`: `floor(W/N)`
   per cell, host `truncateToWidth` + right-pad, row remainder at the right edge.
5. `extensions/jefferson/session-data-store.ts` — `createSessionDataStore`, `sample()` →
   `Readings` handed once per render to every cell's instrument.
