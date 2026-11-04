# Design

## Context

Motivation is in `proposal.md`; the settled decisions and the rejected alternatives are in
`council.md`; the binding scope rulings are in `owner-rulings.md`. This section records only the
state the approach must fit and the host facts it rests on.

**Current state**, read at `6bd6309`:

- `extensions/jefferson/configuration.ts` — `readConfiguration(source)` → `{ rows, warning }`.
  `Cell` is `{ instrument: Instrument }` (line 16); `DEFAULT_CELLS` and `MAX_CELLS` are both 8
  (lines 42–43); `cellsFromNames` (line 67) rejects an empty list (line 69), narrows each entry to
  a string (line 76, `row ${index} has a cells entry that is not a string`), resolves the name
  through `instrumentNamed`, collects unknowns into `notices.unknownInstruments`, then breaks at the
  ceiling (line 84) before pushing. Every rejection throws `RejectedConfiguration`, which
  `readConfiguration` turns into `pi-jefferson: <path> was rejected (<message>); rendering the
  default row`.
- `extensions/jefferson/row-renderer.ts` — `renderRow(row, width, helpers, readings)` computes
  `cellWidth = floor((W - (N - 1) * GAP) / N)` with `GAP = 0` (lines 29, 42), and per cell resolves,
  truncates with the injected `helpers.truncateToWidth(text, cellWidth)`, then appends
  `" ".repeat(max(0, cellWidth - helpers.visibleWidth(truncated)))` — a right pad, unconditionally
  (lines 45–46). The row's remainder is appended at the right edge (lines 48–49).
  `createFooter(rows, sampleReadings, helpers)` and the `Footer` shape are unchanged by the plan.
- `extensions/jefferson.ts` — the entry and the only source file with a runtime host import; it
  injects exactly two helpers, `{ truncateToWidth, visibleWidth }`.
- `tests/` — `configuration.test.ts` (pins the normalized cell's keys at line 305, the string-list
  fixtures, and the 8-cell counts), `row-renderer.test.ts` (`rowOf` at line 23 and inline rows
  without `align`), `jefferson.test.ts` (six `cells: ["model", "thinking"]` documents and the
  geometry assertion at line 252, `truncateToWidth(DEFAULT_CELL_TEXT, 10).repeat(8)`).

**Constraints that bind the shape.** No new source file, dependency, manifest field, `tsconfig`
glob, or CI expectation (D8 lists what must show no diff). Erasable TypeScript only, no build step.
Runtime host imports only in `extensions/jefferson.ts`; every other working part takes helpers by
injection and uses `import type` for host types. Tests live under `tests/`. The vocabulary is
row → cell → instrument (a label over a data field), with `align` naming a cell property; the
owner's two rejected nouns do not appear below, and where `extension-source-layout`'s term of art
is meant this design says "source file".

**Host facts every claim below rests on** (via `research-chidi.md` and `research-eleanor.md`;
section references are to those reports). Facts marked *verified directly* were checked against the
pinned devDependency, `@earendil-works/pi-tui` 1.4.0 — the code `pnpm typecheck` compiles against —
because neither report documents them.

1. `visibleWidth(str)` returns visible terminal columns and ignores ANSI escapes (chidi Q1, S2/S3);
   `visibleWidth("\x1b[31mHello\x1b[0m")` is 5.
2. `truncateToWidth(text, maxWidth, ellipsis = "...", pad = false)` clips at the **end** and its
   `pad` option pads to the **right only** (`result + " ".repeat(maxWidth - visibleWidth)`),
   so it cannot implement right alignment (chidi Q1; *verified directly*,
   `dist/utils.js:1018–1042`, `:130–142`). The repository calls it with two arguments, so `pad`
   stays `false` and the renderer owns both pads.
3. There is no left-pad, `padLeft`, `justify` or `align` helper in the shipped declarations; the
   documented guidance is caller arithmetic against `visibleWidth` (chidi Q1). The pad side is
   necessarily this extension's code.
4. Truncation and widths are grapheme-cluster based, and the docs warn that a wide glyph dropped at
   a cut can leave a result narrower than `maxWidth`, so only `maxWidth - visibleWidth(result)` is
   the safe pad amount (chidi Q2). *Verified directly*: `finalizeTruncatedResult` returns
   `prefix + "\x1b[0m" + ellipsis + "\x1b[0m"`, so a clipped string always **ends with a reset**,
   and `truncateToWidth("ab漢字cd", 6)` yields 5 visible columns — the dropped glyph leaves a
   one-column deficit the pad must absorb (`dist/utils.js:130–142`).
5. The TUI appends a full SGR reset and an OSC 8 reset **at the end of each rendered line**, so
   styles do not carry across lines (chidi Q3, S2:267) — and that reset lands *after* any pad this
   renderer writes, which is why a pad placed after styled text is a live hazard, not a theoretical
   one. The host's own implementation closes underline and strikethrough "to prevent bleeding into
   padding" and exports `getActiveBackgroundAnsi` for the same reason (*verified directly*,
   `dist/utils.js:689`, `:719` in the pinned 1.4.0; chidi Q3 cites the 1.5.0 install's line 739,
   same comment).
6. `Component.render(width)` lines must not exceed the width, and shorter lines are legal — padding
   to the full width is optional (chidi Q4). Nothing in the docs constrains trailing spaces or
   alignment.
7. The docs document no width table, no emoji-ZWJ rule and no combining-mark rule beyond "measure,
   don't assume" (chidi Q2 gaps). This is why the delta promises "measured the way the host
   measures" and why every test below asserts the host helpers' own output.

## Goals / Non-Goals

**Goals:**

- `cells` is a list of cell objects carrying `instrument` and an optional `align`; a list of strings
  is not read, converted, or warned about as a near miss.
- `align` is `left` (default), `right` or `center`, and it moves only the pad's side inside the
  cell; clipping stays the host's end-anchored clip.
- The default row and the ceiling become ten cells, for the measured reason in D7.
- Every requirement and scenario of `specs/statusline/spec.md` as amended is proven by a named
  test, with the alignment ones written so that alignment cannot pass unimplemented (D10).
- The diff stays inside `extensions/jefferson/configuration.ts`,
  `extensions/jefferson/row-renderer.ts`, `tests/`, and one README sentence (D8).

**Non-Goals:**

- `width`, a `spacer` instrument, a bare number as `cells`, and a `cellCount` key — not built, not
  reserved, not scaffolded. A row that carries `cellCount` is still *ignored* rather than
  rejected: no scenario in the delta requires rejecting it, the baseline made the same promise, and
  rejecting unknown row keys is a rule the council did not rule (the shipped precedent for a
  known-but-unread row key, `containers`, warns rather than rejects).
- Any compatibility path for the string form — no deprecated read, no notice, no conversion.
- Any change to `Instrument`, to `instrument.ts`, to instrument text (no instrument emits padding or
  escapes), or to `resolve(readings)`'s signature.
- A README configuration example. The README documents no `pi-jefferson.json` shape at all today;
  the object spelling is documented by the rejection message and the proposal, and adding prose
  examples is a separate task this change does not take.
- Bumping the host pin, or fixing `package.json`'s `description`, which uses a word the vocabulary
  bans but must show no diff (D8).

## Decisions

### D1. A normalized cell has two keys, and `align` is always one of them

```ts
// extensions/jefferson/configuration.ts
export type CellAlign = "left" | "right" | "center";

/** A single cell of a row: the instrument whose text it displays, and the side it hugs. */
export interface Cell {
  instrument: Instrument;
  align: CellAlign;
}
```

- **A cell that declares no `align` normalizes to `align: "left"`; the property is never absent.**
  The alternative — an optional property, present only when declared — makes the parse result carry
  two shapes for one idea, and `tsconfig`'s `exactOptionalPropertyTypes` makes that distinction
  visible in the type system, so `renderRow` would need a fallback at every read. Normalizing once,
  at parse time, leaves the renderer with one shape and one branch on three values. It also keeps
  the parse result a *description* of what will be rendered rather than a partial echo of the
  document.
- **`renderRow` reads `cell.align`, required.** No `??`, no `"left"` literal in the renderer, no
  default stated twice.
- **`blankCells` emits `{ instrument: blank, align: "left" }`**, so the default row renders exactly
  as today (and a row omitting `cells` does too).
- **`CellAlign` is a type, erased at runtime**, so the export-surface pin still holds:
  `Object.keys(configuration)` stays `["DEFAULT_CELLS", "MAX_CELLS", "readConfiguration"]`
  (`tests/jefferson.test.ts`, line 265). No new runtime export.
- **`tests/configuration.test.ts:305` changes with the shape**: `Object.keys(cell)` becomes
  `["instrument", "align"]` (insertion order, since `cellsFromNames` and `blankCells` build
  `{ instrument, align }`), the test's name becomes "every cell carries an instrument and an
  alignment", and it additionally asserts `cell.align === "left"` for cells that declared none,
  `"right"` for a cell that declared that, and `"center"` for a cell that declared `center`. The old
  name claimed the object carried *only* an instrument; the assertion now pins the two-key shape
  rather than a one-key one.

### D2. The parse order, and why the ceiling stays last

Per entry of `cells`, in this order — the ceiling is still the last thing that happens, exactly as
`cellsFromNames` does today, so the property "the ceiling applies to length only" survives the
change from strings to objects:

1. **the entry is an object** — not an array, not `null`, not a primitive;
2. **every own key is `instrument` or `align`** — the first unrecognised key in `Object.keys` order
   rejects;
3. **`instrument` is present**;
4. **`instrument` is a non-empty string**;
5. **`align`, when present, is `"left"`, `"right"` or `"center"`**;
6. **resolve the instrument name** through `instrumentNamed` and collect an unknown into
   `notices.unknownInstruments` (the cell will render `blank`);
7. **then the ceiling**: `if (cells.length === MAX_CELLS) break;`, then
   `cells.push({ instrument: instrument ?? blank, align: align ?? "left" })`.

Consequences this order exists to guarantee, each of which a test in D10 pins:

- An invalid entry at position 11 of a 12-entry list still **rejects the whole document** — the
  ceiling never gets the chance to clamp a malformed entry away.
- An unrecognised instrument at position 11 still **warns** naming it, though its cell does not
  render.
- Nothing past the ceiling is half-constructed: the push is after the break, so a rejected field can
  never leave a cell in the list.
- **The key check precedes the `instrument` checks.** The key set is the object's outermost claim,
  and it is what catches both declined spellings the council ruled on: the declined `width` and the
  `aling` typo. Checking it first means a migrating user who wrote `{"name": "model"}` gets a
  message naming `name` rather than "no instrument" — the same edit, named more precisely. When a
  cell has several unknown keys the message names the first in `Object.keys` order, so the warning
  is deterministic.
- `align` is validated at step 5 but attached to the cell at step 7 (`align ?? "left"`), because the
  cell is only pushed once both its instrument and its side are known; "apply align" in the list
  above means the normalized cell carries the side it will render.
- **No compatibility branch.** A string entry fails step 1 like any other non-object; nothing
  inspects strings, nothing rewrites them, and no notice mentions the old spelling except as the
  example in the message below, which describes the new one.

### D3. The five rejection messages, in the order they are checked

Each is a `RejectedConfiguration` message, so each surfaces as
`pi-jefferson: <path> was rejected (<message>); rendering the default row` and the default ten-cell
row renders — the shipped path, unchanged. `index` is the row index; `JSON.stringify` renders string
values quoted, so the warning shows the offending value as it was written.

| Failure | Message |
|---|---|
| the entry is not an object | `row ${index} has a cells entry that is not an object; declare {"instrument": "model"}` |
| an unrecognised key on the cell object | `row ${index} has a cell with an unrecognised key ${JSON.stringify(key)}; a cell carries only instrument and align` |
| the cell object has no `instrument` | `row ${index} has a cell with no instrument` |
| `instrument` is not a non-empty string | `row ${index} has an instrument that is not a non-empty string` |
| `align` is outside the three | `row ${index} has an align that is not "left", "right" or "center": ${JSON.stringify(value)}` |

- **The non-object message carries the new spelling with an example because it is the one every
  migrating user sees.** `"cells": ["model", "thinking"]` stops rendering its named cells, the
  document is rejected, and this single line is the whole migration instruction: declare
  `{"instrument": "model"}`. It matches the proposal's wording verbatim, so the proposal, the delta
  and the code state one message.
- **The instrument message mirrors the shipped id message** (`row ${index} has an id that is not a
  non-empty string`), so the two field-type failures read as one family.
- **The align and key messages name the value or key**, which the delta requires of both scenarios
  ("the warning names the align value", "the warning names the key"). An empty string as `instrument`
  is rejected by the same message as a non-string: both are "not a non-empty string".
- `align: null`, `align: 4` and `align: "middle"` are one failure; `JSON.stringify` prints each as
  written. An absent `align` never reaches this check, and the message names all three accepted
  values so a reader never has to infer the enum.
- A JSON document cannot express `align: undefined`, so "absent" and "present" are the only two
  states the parser can observe.

### D4. `align` is read inside `renderRow`'s existing loop; no signature moves

`renderRow(row, width, helpers, readings)` keeps its four parameters, `createFooter(rows,
sampleReadings, helpers)` keeps its three, `WidthHelpers` keeps its two members, `Row` is unchanged,
and `Instrument.resolve(readings)` is untouched. `GAP` stays `0`. The cell width formula is
unchanged. Nothing about padding reaches an instrument, and `instrument.ts` shows no diff (D8).

```ts
const RESET = "\x1b[0m";

/** Whether cell text leaves an SGR open, so a run of spaces after it would inherit the style. */
function leavesStyleOpen(text: string): boolean {
  return text.includes("\x1b") && !text.endsWith(RESET);
}

export function renderRow(row: Row, width: number, helpers: WidthHelpers, readings: Readings): string {
  const cellWidth = Math.floor((width - (row.cells.length - 1) * GAP) / row.cells.length);
  let line = "";
  let styleOpen = false; // whether the last text appended left an SGR open
  /** The spaces a pad or the row's remainder adds: reset first, so a space never inherits a style. */
  const spaces = (count: number): string => {
    if (count <= 0) return "";
    const reset = styleOpen ? RESET : "";
    styleOpen = false;
    return reset + " ".repeat(count);
  };
  for (const cell of row.cells) {
    const clipped = helpers.truncateToWidth(cell.instrument.resolve(readings), cellWidth);
    const pad = cellWidth - helpers.visibleWidth(clipped);
    const before = cell.align === "right" ? pad : cell.align === "center" ? Math.floor(pad / 2) : 0;
    const after = cell.align === "left" ? pad : cell.align === "center" ? pad - Math.floor(pad / 2) : 0;
    line += spaces(before);
    line += clipped;
    styleOpen = leavesStyleOpen(clipped);
    line += spaces(after);
  }
  line += spaces(width - helpers.visibleWidth(line));
  return line;
}
```

- `align: "right"` puts the whole pad **before** the cell's text; `left` puts it **after**;
  `center` splits it — `floor(pad / 2)` columns before and `pad - floor(pad / 2)` after, so an odd
  pad leaves its extra column on the right and the text sits half a column left of exact centre. That
  is the whole implementation of the owner's ruling: two branch lines and the order of two appends.
- `spaces` guards `count <= 0`, which subsumes the current `Math.max(0, …)` and keeps the
  fewer-cells-than-columns case (`cellWidth` 0) a line of the full width.
- The `styleOpen` flag is what makes the reset land in the right place on **both** sides: a pad
  placed before the text follows the *previous* cell's text, a pad placed after it follows its own,
  and a centred cell has one of each — all three go through `spaces`. D6 is the reason it exists.
- **The row's remainder still lands at the right edge and is still not a cell.** Alignment hugs the
  cell's edge, so the `W mod N` columns sit after the last cell regardless of that cell's side: a
  right-aligned last cell ends `W mod N` columns short of the terminal edge — 2 columns at 132 with
  ten cells, 0 at 80 and 100. D7 and the delta's geometry requirement state that; it is a property
  of the ruling, not a defect, and this change does not close it with a width, a spacer, or a
  row-level alignment.

### D5. The pad arithmetic, named exactly

- **The pad is `cellWidth - visibleWidth(clipped)`, computed from the text the clip returned.**
  Never `String.length`, never a code-unit or code-point count, never the pre-clip text's width:
  `visibleWidth` is the host's measurement of terminal columns, and it is the only measurement the
  docs sanction (D-context fact 1). A truncated result can be *narrower* than `cellWidth` when a
  wide glyph straddles the cut (fact 4), and clipping can leave escapes in the string, so measuring
  the clipped text is the only arithmetic that yields a cell of exactly `cellWidth` columns.
- **The host's `truncateToWidth(..., pad: true)` is right-side only**, so it cannot implement
  `right` alignment (fact 2). It is not used on either side; every pad comes from the same
  arithmetic, so no alignment can disagree about a cell's width. The `WidthHelpers` interface keeps
  its two-argument call, so `pad` stays `false` and no host behavior changes.
- **Under `center` one pad becomes two that still sum to `pad`**: `floor(pad / 2)` columns before
  the text and `pad - floor(pad / 2)` after. An odd pad therefore puts its extra column on the
  right, which is the choice `owner-rulings.md` records, and it is why both halves come from one
  `pad` rather than from two separate measurements.
- **The pad is plain spaces with no styling of its own** (fact 5: a plain-space pad does not carry a
  background). D6 is the only thing the renderer adds in front of it, and only when needed.
- **A cell still occupies `floor(W / N)` columns under any alignment**, including when the clip
  dropped a glyph: the deficit flows into the pad, so the row stays one line and the columns after
  the cell do not shift.
- Measured fixtures that pin this (D10): `"ab漢字cd"` and `"ab😀cdef"` clip to 5 columns in a
  6-column cell (pad 1, glyph dropped); `"abe\u0301"` is 4 code units but 3 columns in a 6-column
  cell (pad 3, which `length` arithmetic would get wrong as 2; split as `center` that pad is 1
  column to the left and 2 to the right).

### D6. The ANSI hazard is decided: a reset before any run of spaces whose preceding text left an SGR open

The council left this to design. It is real, and it has two sides:

- **`left` (pad after the text).** A cell whose text ends with an unterminated SGR — `"\x1b[4mab"` —
  would style the pad that follows it: underline or a background painting trailing spaces.
- **`right` (pad before the text).** The pad sits after the *previous* cell's text, so an
  unterminated SGR from that cell styles this cell's pad instead.
- **`center` (pads on both sides).** Both hazards at once: the left half follows the previous
  cell's text, the right half follows its own.

The host does not save us: its reset is appended at the end of the rendered line (fact 5), after
every pad this renderer writes. The host's own implementation closes underline and strikethrough
"to prevent bleeding into padding" and ships `getActiveBackgroundAnsi` to detect a background still
active at the end of a string (fact 5) — so this hazard is the host's own concern, evidenced in
shipped code, not an inference from a terminal's behavior.

**Decision: every run of spaces the renderer appends — a left-aligned pad, a right-aligned pad, a
centred cell's two pads, and the row's remainder — is preceded by `"\x1b[0m"` when the text before
it leaves styling open**,
which is `leavesStyleOpen`: the text contains an escape and does not end with `"\x1b[0m"` (D4's
`styleOpen`). The reset adds no visible width — `visibleWidth` ignores ANSI (fact 1) — so geometry
is untouched, and the pad carries none of that styling. The delta's ANSI scenario states that
outcome and permits this mechanism rather than naming it: the renderer may reach an unstyled pad
with a reset before the pad, and the host's line-end reset is untouched.

Why this predicate rather than unconditional resets, and why it is not a no-op:

- An unconditional reset would add four bytes to every row and change every existing byte-exact
  expectation for no visual effect.
- **Host-clipped text always ends with `"\x1b[0m"`** (fact 4), so a truncated cell never triggers the
  guard and no existing truncation expectation moves.
- A cell whose text fits but leaves a style open — the only leaking case — triggers it. No shipped
  instrument emits escapes today (`blank`, `model` and `thinking` return plain text), so the guard
  costs nothing now and is required the moment a label over data carries styling; the delta's ANSI
  scenario requires it regardless.
- The guard covers SGR. An unterminated **OSC 8 hyperlink** is out of scope: a pad of spaces under a
  link is visually identical to unstyled spaces, and the host's own per-line close terminates it
  (fact 5).
- **Residual, named rather than discovered: the guard covers runs of spaces only.** The trigger is
  **no pad before the text**: a cell that fills its cell, or a centred cell whose left half rounds to
  zero, leaves no pad before the text, so no reset is emitted — and when that cell is right-aligned
  or centred and the *previous* cell's text left an SGR open, the cell's own text inherits that
  style. Measured: `[{text:"\x1b[4mabcdefghij"},{text:"abcdefghij",align:"right"}]` at width 20
  renders `"\x1b[4mabcdefghijabcdefghij"`, underlined throughout. That is pre-existing — today's
  renderer emits no reset at all — and it is outside this requirement's scope, which is about the
  pad and not about a cell's text inheriting a neighbour's style; closing it would mean resetting
  before every cell's text, four bytes per cell in every row.

### D7. Ten, for the measured reason

| Width | `floor(W / 10)` | remainder | `floor(W / 8)` | remainder |
|---|---|---|---|---|
| 80 | 8 | 0 | 10 | 0 |
| 100 | 10 | 0 | 12 | 4 |
| 120 | 12 | 0 | 15 | 0 |
| 132 | 13 | 2 | 16 | 4 |
| 160 | 16 | 0 | 20 | 0 |
| 200 | 20 | 0 | 25 | 0 |

Ten divides 80, 100, 120, 160 and 200 exactly; eight does not divide 100 or 132. Ten is **not**
universal — at 132 it leaves 2 columns against eight's 4 — which is why the claim is the measured
one, and never "every round width": ten divides more of the common widths and leaves a smaller
fragment where it does not. Both constants move together (`DEFAULT_CELLS = MAX_CELLS = 10`), so the
default row and the ceiling keep stating one number for one idea, as they do today.

The cost, recorded with the decision: at 80 columns a ten-cell row gives each cell 8 columns, so a
model name clips hard in a narrow window. `tests/jefferson.test.ts`'s geometry assertion makes that
visible — `truncateToWidth(DEFAULT_CELL_TEXT, 8).repeat(10)`.

### D8. The diff is two source files, the tests, and one README sentence

| Path | Diff |
|---|---|
| `extensions/jefferson/configuration.ts` | `CellAlign`, the two-key `Cell`, `10`/`10`, `cellsFromNames` → the object entry validation of D2/D3, `blankCells` emits `align: "left"` |
| `extensions/jefferson/row-renderer.ts` | the loop of D4 (`spaces`, `styleOpen`, `leavesStyleOpen`, and the three-way split of the pad on `cell.align`) |
| `tests/configuration.test.ts`, `tests/row-renderer.test.ts`, `tests/jefferson.test.ts` | D10 |
| `README.md` | the Status paragraph's "Formatting, alignment, and gaps are not built yet." loses "alignment" |
| `extensions/jefferson.ts` | **no diff** — it injects the same two width helpers and passes the same `rows`; nothing in the parse or render change reaches it |
| `extensions/jefferson/instrument.ts` | **no diff** — `Instrument`, `blank`, `model`, `thinking` and `instrumentNamed` are untouched; no instrument pads |
| `extensions/jefferson/session-data-store.ts` | **no diff** — alignment never reaches the store |
| `package.json`, `tsconfig.json`, `pnpm-lock.yaml`, `.github/workflows/ci.yml` | **no diff** — no new file, dependency, export, or glob; `include` already covers `extensions/**/*.ts` and `tests/**/*.ts`, and CI's tarball rule only pins the roots, the entry and the manifest, none of which move |

Nothing structural is added: no source file, no exported runtime name, no directory. The
`files: ["extensions", …]` and `pi.extensions: ["./extensions/jefferson.ts"]` surfaces are
identical, so CI's tarball and load-contract step passes unchanged.

### D9. The frozen scenario name is a recorded artifact wart

The delta's `MODIFIED` block for **A row's cells are its count and its placement** keeps
`#### Scenario: a cells entry that is not a string` even though the entry it describes must now be
an **object**. It is not a mistake and must not be "corrected":

- OpenSpec treats a `MODIFIED` requirement as replacing the whole block and compares scenario names
  against the current spec. A renamed scenario reads as a **dropped baseline scenario**, and archive
  refuses. Verified against a copy of this change with the name changed to "a cells entry that is
  not an object":

  ```
  MODIFIED "A row's cells are its count and its placement" omits scenario(s) the current spec
  still has: "a cells entry that is not a string". The modified block has 8 scenarios; the current
  spec has 5 scenarios. It adds 4 scenarios not in the current spec: "a cells entry that is not an
  object", "an entry that carries no instrument", "an instrument that is not a name" and 1 more.
  Copy the omitted scenarios into the MODIFIED block (a MODIFIED requirement replaces the whole
  block, so archive refuses to drop them).
  ```

  With the frozen name, `openspec validate cells-as-objects` passes.
- **The body is authoritative, and it says so itself.** The scenario's `WHEN` line says "a `cells`
  entry that is not an object — the string this key took before this change, a number, an array, or
  null (the heading predates this change, and OpenSpec refuses a scenario rename inside a MODIFIED
  block)", so the requirement is unambiguous even though the heading is stale, and the reader who
  meets the heading in the archived spec gets the explanation where it lives rather than having to
  find this design. This paragraph stays the fuller record. A later change can only rename the
  scenario if OpenSpec gains support for scenario renames, since the same rule applies in reverse.
- A reader who finds this surprising should read this paragraph rather than reach for the rename
  that the validator will reject.

### D10. Which test proves which requirement

Every fixture below sits at a width whose **remainder is non-zero**, so the row's trailing blank
cannot mask a pad on the wrong side; the one exception pins a reset's literal position by byte.
The expected strings are the host helpers' actual output (measured against `@earendil-works/pi-tui`
1.4.0), not hand-derived.

**`tests/configuration.test.ts`** — the delta's parsing requirements:

| Requirement / scenario | Test | Pinned assertion |
|---|---|---|
| A row's cells are its count and its placement — object entries in order | `cells is both the count and the placement, in order` | fixture becomes `[{instrument:"model"},{instrument:"thinking"},{instrument:"blank"}]`; instruments deep-equal `[model, thinking, blank]` |
| … the normalized shape (D1) | `every cell carries an instrument and an alignment` (renamed) | `Object.keys(cell)` is `["instrument","align"]`; `cell.align` is `"left"` when none was declared, `"right"` and `"center"` when one was |
| … default and ceiling are ten | `the cell-count constants are named for cells`; `cells naming 12 instruments keeps the first 10 and warns nothing` | `DEFAULT_CELLS`/`MAX_CELLS` are 10; 12 entries → 10 cells, no warning |
| … the ceiling applies to length only | `a cells entry past the ceiling that is not an object rejects the document`; `an align past the ceiling that is outside the three rejects the document`; `a cells entry past the ceiling naming an unknown instrument warns and renders ten cells` | a 12-entry fixture with position 11 malformed still rejects (D2's order); position 11 unknown still warns naming it, with 10 cells rendered |
| … a cells entry that is not an object (D9's scenario) | `a cells entry that is not an object rejects and names the object spelling` | default row, warning matches `/not an object/` and `/declare \{"instrument": "model"\}/` |
| … an unrecognised key | `a cell object with an unrecognised key rejects and names the key` | fixtures `{"instrument":"model","width":4}` and `{"instrument":"model","aling":"right"}`; warning matches `/unrecognised key/` and the key name |
| … an entry that carries no instrument | `a cell object with no instrument rejects` | fixture `{"align":"right"}`; warning matches `/no instrument/` |
| … an instrument that is not a name | `an instrument that is not a non-empty string rejects` | fixtures `{instrument: 4}` and `{instrument: ""}`; warning matches `/not a non-empty string/` |
| A cell's alignment — an align outside the three | `an align outside the three rejects and names the value` | fixtures `"middle"`, `"Center"` and `4`; warning matches `/align/` and the offending value |
| No compatibility path (Non-Goals) | `a cells list of strings is rejected with no converted read` | `{rows:[{cells:["model","thinking"]}]}` → default ten-cell row, warning matches `/not an object/` |
| Declined spellings that were already rejected | `cells given as a number` / `a string` (kept), and the parametrized non-object entries (zero, negative, non-integer, `null`, an array) | default row + warning; the old `[{text:"x"}]` case moves to the unrecognised-key test, which now names `text` |

The remaining eight-cell expectations move to ten: `both shapes at once`, `an absent
configuration`, `an empty object`, an `empty rows list`, `a row omitting cells` (twice), the
parametrized rejections, `an empty cells array`, `two explicit duplicate ids`, `an explicit id
colliding with a synthesized id`, `an unparseable document`, and the trusted/agent document tests
(`[8,8]` → `[10,10]`; the `[3]` fixtures keep 3).

**`tests/row-renderer.test.ts`** — the renderer requirements, three cells at width 20 (`cellWidth`
6, remainder 2) unless stated:

| Scenario | Test | Pinned assertion |
|---|---|---|
| A cell that declares no align | `a left-aligned cell pads to the right of its text` | `"ab    ab    ab      "` byte-exact, `visibleWidth === 20` — with D1's normalization test this is the whole "absent means left" proof |
| A right-aligned cell narrower than its cell | `a right-aligned cell pads to the left of its text` | `"    ab    ab    ab  "` byte-exact |
| A centred cell narrower than its cell | `a centred cell splits its pad across both sides` | text `"ab"` pads 4 into 2 and 2: `"  ab    ab    ab    "` byte-exact, `visibleWidth === 20` |
| A centred cell at an odd pad | `a centred cell's odd pad puts its extra column on the right` | text `"abe\u0301"` (3 columns) pads 3 into 1 left and 2 right: `" abé   abé   abé    "` byte-exact — a rounded split would leave 2 on the left and read differently |
| Text wider than the cell, under any alignment | `text wider than its cell renders identically under any alignment` | 2 cells at width 21 (`cellWidth` 10, remainder 1), text `"provider: a-very-long-model-name"`: all three lines equal `"provide\x1b[0m...\x1b[0mprovide\x1b[0m...\x1b[0m "` — no pad remains and the alignments are indistinguishable |
| A wide glyph at the clip boundary | `a wide glyph dropped by the clip leaves a pad that keeps the cell's width` | text `"ab漢字cd"` clips to 5 columns in a 6-column cell (D5): left `"ab\x1b[0m...\x1b[0m ab\x1b[0m...\x1b[0m ab\x1b[0m...\x1b[0m   "`, right `" ab\x1b[0m...\x1b[0m ab\x1b[0m...\x1b[0m ab\x1b[0m...\x1b[0m  "`, both 20 wide |
| An emoji in a cell | `an emoji clipped at the boundary leaves a one-column pad` | text `"ab😀cdef"` clips to 5 columns, same two expected lines as the wide-glyph case; the emoji never splits |
| A combining mark in a cell | `a combining mark is measured in columns, not code units` | text `"abe\u0301"` (4 code units, 3 columns) pads 3: left `"abé   abé   abé     "`, right `"   abé   abé   abé  "` — `length` arithmetic would produce 2 |
| ANSI styling in a cell | `an ANSI-styled cell's pad carries no styling` | closed `"\x1b[31mab\x1b[0m"` → left `"\x1b[31mab\x1b[0m    "` ×3 + `"  "`; open `"\x1b[4mab"` → left `"\x1b[4mab\x1b[0m    "` ×3 + `"  "` (D6's reset before each pad); right-aligned open text through a preceding open cell shows the reset before the pad |
| ANSI styling carried across a cell boundary (D6) | `an open style from one cell resets before the next cell's pad` | `[{text:"\x1b[4mabcdefghij"},{text:"cd",align:"right"}]` at width 20 (`cellWidth` 10, remainder 0) is byte-exactly `"\x1b[4mabcdefghij\x1b[0m        cd"` — the reset sits before the pad, not after it, so an `includes(RESET)` assertion cannot pass with it on the wrong side |
| Instrument text is bound by the row's geometry | `a width that does not divide evenly leaves the remainder blank at the right edge` (kept) | 3 cells at 100: 33 columns each, column 100 blank — unchanged |

Fixture-shape changes: `rowOf` (line 23) and every inline `Row` literal gain `align: "left"`. The
existing 8-cell test at width 80 stays as it is — a row may still declare any count up to the
ceiling, and it is the evidence that the geometry formula did not move.

**`tests/jefferson.test.ts`** — end to end:

- The six `{ cells: ["model", "thinking"] }` documents become
  `[{instrument:"model"},{instrument:"thinking"}]`; the rejected-document fixture (line 244)
  becomes `{ cells: [{instrument:"blank"}], rows: [{}] }`, still rejected for carrying both shapes.
- `a rejected configuration warns and still installs the default row` asserts
  `truncateToWidth(DEFAULT_CELL_TEXT, 8).repeat(10)` at width 80 — D7's cost, visible.
- New: `a right-aligned cell ends at its cell's right edge end to end` — two cells at width 80,
  `{instrument:"model"}` and `{instrument:"thinking", align:"right"}`, seeded
  `anthropic`/`claude-opus-4`/`high`. `cellWidth` is 40 with remainder 0, and
  `"anthropic: claude-opus-4"` measures **24** columns (9 + 2 + 13), so the model cell's pad is
  **16** and the right-aligned cell's pad is 26. Measured: `visibleWidth(line)` is **80** and
  `line.indexOf("thinking: high")` is **66**, so the right-aligned cell's text ends on column 80. The
  test asserts those two measured facts rather than a hand-written space count.
- `the exported surface offers no way to supply or replace cell content` passes unchanged (no new
  runtime export, D1/D8).

No test file is added: the three existing files cover every requirement, and CI's tarball step
already asserts no `.test.ts` ships.

### D11. Terminal observations, fixed by an exact document and width

A terminal's rendering cannot be asserted from `node --test`, so this is one task, completed by
recording what was seen. Each observation names its document and width, so the geometry it should
show is decided here rather than in whatever window the session happens to have:

| Observation | Document | Width | Expected, measured |
|---|---|---|---|
| the pad is visible under `right` | `[{instrument:"thinking"},{instrument:"thinking",align:"right"}]` | 80 | `cellWidth` 40, remainder 0; the right-aligned text occupies columns 67–80 |
| the shortfall is visible | seven cells: six `{instrument:"thinking"}`, the last `{instrument:"thinking",align:"right"}` | 132 | `cellWidth` 18, remainder 6; the last cell's text ends on column 126, so its 6-column gap to the terminal edge is plainly visible |
| the centre split is visible, and its odd pad lands on the right | `[{instrument:"thinking"},{instrument:"thinking",align:"center"},{instrument:"thinking"}]` | 100 | `cellWidth` 33, remainder 1; the centred middle cell's text occupies columns 43–56, with a 9-column pad to its left and 10 to its right, so it sits half a column left of its cell's exact centre |
| the align is rejected | any row carrying `{instrument:"model",align:"middle"}` | 80 | the notification `pi-jefferson: <path> was rejected (row 0 has an align that is not "left", "right" or "center": "middle"); rendering the default row` |

Recorded for each observation: the terminal width, the observed line, whether the right-aligned
cell's text ends against its cell's edge, with the last cell ending `W mod N` columns short of the
terminal edge — 6 columns for the seven-cell row at 132, and 2 columns for the ten-cell default at
the same width, as the delta states — and whether the centred cell's two pads are equal (an even
pad) or heavier on the right by one column (an odd one). The record goes in the change's
implementation record (not in a test), and this change is not complete until it holds the observed
lines.

**The task observes no wide glyph, because no configuration path stages one:** the model id is
host-supplied, and `blank` is fixed ASCII Lorem text, so a wide-glyph instrument value cannot be
put into a document. Wide-glyph correctness therefore rests on the unit fixtures of D10, where the
string — `"ab漢字cd"`, `"ab😀cdef"` — can be constructed.

### D12. The host owns the cross-cell reset; ours is the intra-cell pad

`extension-structure` composes a row from the host's `HStack` and the footer from a `VStack`, and the
host puts a style reset and a hyperlink close before every child it composes and one more at the end of
the line — which retires D6's premise that the host's reset lands only at the end of a rendered line.
That change decides the composition (its D1–D5); this decision records only what it does to D6.

**D6's decision stands, and narrows to one cell.** The case D6 decided had two sides, and the left one
is the host's: a right-aligned or centred cell's leading pad follows the *previous* cell's text, and the
host resets styling between children, so no reset of ours is needed there. What remains ours is the pad
that follows the cell's own text — a `left` pad and a centred cell's trailing half — with D6's rule
unchanged: a run of spaces is preceded by `"\x1b[0m"` when the text before it left an SGR open. So
D4's `styleOpen` stops being state threaded across a row: it is a reading of the text this cell just
appended, taken inside the cell view. The row's remainder is the host's too, and the host writes it
*after* the line's closing frame: measured, `composed(cells)` is not the line and
`composed(cells) + " ".repeat(width - cellWidth * N)` is, so the merged `renderRow`'s remainder branch
never fires — nothing is appended at all, not appended without a reset. Because the pad follows the
closing frame, the remainder cannot inherit a style either.

The signatures are what D12 moves: after the merge `renderRow(row, width, readings)` and
`createFooter(rows, sampleReadings)` take no helpers, because `extension-structure` deletes
`WidthHelpers` outright (its D5), and the entry stops injecting them. So D4's four-parameter signature
and D8's "no diff" row for `extensions/jefferson.ts` both give way to that branch's three-line entry
change; nothing else in D4 or D8 moves — the cell width formula, `GAP = 0`, the three-way split of the
pad, and the row's remainder at the right edge are the same arithmetic, now inside a cell view that
knows nothing of instruments.

**D8 stops being true once the merge lands.** Its table gains rows for the three root documents
`extension-structure` brings — `AGENTS.md`, `ARCHITECTURE.md`,
`docs/adr/0001-imports-run-one-way.md` — and for the one line 6.5 adds to `ARCHITECTURE.md`, and its
summary sentence — the one its title repeats — becomes "two source files, the tests, one README
sentence, and the structure change's documents". Left as written, the diff it describes contradicts
the merged tree on three paths and one added line.

**D10's table is retired as literal expectations and re-stated through `visible()`.** Its byte strings
stay as the proof of pad side, but read from `visible(line)` rather than from the raw line, with
framing asserted separately as 6.2 requires. As literal expectations all eleven of its rows present a
pre-merge string as what `renderRow` returns, and no framed line returns one: a reviewer checking D10
against the merged tree meets a contradiction per row and no way to tell a stale expectation from a
pad on the wrong side.

## Risks / Trade-offs

- **[Ten cells at 80 columns gives each cell 8 columns]** → recorded with the ruling; the model name
  clips hard in a narrow window. Mitigation: none, by ruling — the cost is stated in
  `owner-rulings.md`, this design, and the end-to-end geometry test rather than discovered later.
- **[Alignment hugs the cell edge, so a right-aligned last cell ends `W mod N` columns short]** →
  stated in the delta's geometry requirement, in D4, and in D11's observation, so it reads as a
  property of the ruling. Not solved: a trailing spacer or a row-level alignment is exactly the
  scope the owner declined.
- **[Every existing document stops rendering its named cells]** → deliberate and breaking. The
  mitigation is the message, which names the new spelling with an example (D3), and the proposal's
  migration note. No compatibility read exists to soften it, by ruling.
- **[Rejecting an unrecognised key makes a future cell property a breaking change]** → accepted by
  the council: a statusline that silently renders something other than what was declared is worse,
  and an older extension rejects a newer document's key loudly instead of rendering half of it. Any
  later property lands as an addition to the same object (as `align` did) with a release note.
- **[Emoji, wide glyph and combining-mark widths are host-measured, and the host documents no width
  table]** → the requirements say "measured the way the host measures", and every test asserts the
  helpers' own output, so a host change moves a fixture's expected string instead of silently
  changing the geometry. Residual: an untested host width change would be caught by the tests only
  at the fixtures they pin.
- **[A pad after styled text would inherit the style]** → D6's reset, kept narrow (only when an SGR
  is actually open) so no existing expectation moves, with the OSC 8 case recorded as out of scope.
- **[A cell key typo rejects the document, while the same typo one level up on the row is ignored]**
  → named, not fixed: the cell key set is additive and new, so it is validated from the start,
  whereas validating row keys would be a second behavior change the council did not rule — a row's
  declined `cellCount`, or an `aling` typo on the row rather than in a cell, is still silently
  ignored. This change does not change row-level behavior.
- **[The frozen scenario heading says "not a string" while the body says "not an object"]** → D9
  records why, with the validator's message, so a future reader neither "fixes" it nor assumes the
  body is wrong; the scenario body carries the same note in one parenthetical, so the explanation
  travels with the heading after archive.

## Migration Plan

- **Deployment:** one merge to `main`, which is a release (the README's trunk-based rule). No data is
  migrated and nothing is stored: the only "migration" is a user editing each `cells` entry from
  `"model"` to `{ "instrument": "model" }`, which the rejection message states. There is no
  deprecated read, no dual shape, and no version gate in the code.
- **Rollback:** revert the merge commit. A reverted extension reads the string form again and
  rejects object entries; a user who already migrated re-edits the document. Nothing else in the
  repository depends on either shape.
- **Order of work** (for tasks): `configuration.ts` and its tests first (shape, counts, messages),
  then `row-renderer.ts` and its tests, then the `jefferson.test.ts` fixtures, then the README
  sentence and the terminal observation. Each step leaves `pnpm typecheck` and `pnpm test` green,
  because the cell shape change reaches the fixtures in the same edit as the parser.

## Open Questions

None that change the specs, the approach, or the task breakdown. Two knowns are recorded rather
than open: the stale scenario heading (D9) can only be renamed if OpenSpec gains scenario renames,
and a README configuration example is deferred prose (Non-Goals), not a decision this change owes.
