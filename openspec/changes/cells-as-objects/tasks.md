# Tasks

Each group is red first, then the implementation, then green, and every group leaves
`pnpm typecheck` and `pnpm test` passing. Test files are named per task; D-references are to
`design.md`. Declined by the owner and absent from every task: `width`, a `spacer` instrument,
`center`, a bare number as `cells`, and a `cellCount` key — no task builds, reserves, or scaffolds
one.

## 1. The cell shape

- [x] 1.1 Red — in `tests/configuration.test.ts`, rename `every cell is a Cell object carrying only an instrument` to `every cell carries an instrument and an alignment` and assert `Object.keys(cell)` deep-equals `["instrument", "align"]` — the construction order D1 fixes, not alphabetical — for cells built both by `blankCells` and by `cellsFromNames`; add the sibling `the default row's cells carry the left alignment` proving a cell no document said anything about still materializes the side. Verified by: red before 1.3 under both checks — `node --test tests/configuration.test.ts` fails the keys assertion (one key, `align` undefined) and `pnpm typecheck` fails because `align` does not exist on `Cell`.
- [x] 1.2 Red — in `tests/row-renderer.test.ts`, give `rowOf` and every inline `Row` literal `align: "left"`; do not touch any expectation, so the file's existing bytes are the check that the shape alone moves nothing. Verified by: red before 1.3 under `pnpm typecheck` only — with `Cell` still carrying no `align`, each added property is the excess-property error — while `node --test tests/row-renderer.test.ts` stays green and every expectation is byte-identical. Once 1.3 lands the complementary error takes over: a `Row` literal that omits `align` no longer typechecks, which is the compiler-enforced check that no fixture forgets its side.
- [x] 1.3 Implement — in `extensions/jefferson/configuration.ts`, add `export type CellAlign = "left" | "right" | "center"` and make `Cell.align: CellAlign` required (D1); `blankCells` emits `{ instrument: blank, align: "left" }` and `cellsFromNames` pushes `{ instrument: instrument ?? blank, align: "left" }`, the string entries staying readable for this step only so the shape lands without touching the parser. `CellAlign` is a type, so the runtime export pin still holds. Verified by: `pnpm typecheck` clean, `pnpm test` green including 1.1, and `the exported surface offers no way to supply or replace cell content` still listing three names for the configuration source file.
- [x] 1.4 Green — `pnpm typecheck` and `pnpm test` both pass with no expectation changed beyond 1.1's two cells.

## 2. The parser

- [x] 2.1 Red — in `tests/configuration.test.ts`, object entries and their fields: `cells is both the count and the placement, in order` takes `[{instrument:"model"},{instrument:"thinking"},{instrument:"blank"}]`; `a cells entry that is not an object rejects and names the object spelling` (a string, a number, an array, `null`), matching `/not an object/` and `/declare \{"instrument": "model"\}/`; `a cell object with an unrecognised key rejects and names the key` for `{"instrument":"model","width":4}` and `{"instrument":"model","aling":"right"}`, and the old `[{text:"x"}]` case moves here now that the warning names `text`; `a cell object with no instrument rejects` for `{"align":"right"}`; `an instrument that is not a non-empty string rejects` for `{instrument:4}` and `{instrument:""}`; `an align outside the three rejects and names the value` for `"middle"`, `"Center"` and `4` (`center` is accepted now); `a cells list of strings is rejected with no converted read` for `{rows:[{cells:["model","thinking"]}]}`, asserting the default row, the warning, and that nothing converts or warns about the string form as a near miss; `a cell that declares no align normalizes to left` for `{instrument:"model"}` under no `align`, and for `"right"` and `"center"` declared from two documents — that one test carries all three. Every remaining string entry fixture in the file becomes a cell object — `["blank","blank","blank"]` → three `{instrument:"blank"}`, and the two unknown-instrument fixtures and the top-level row carry their names in `instrument` — so the string form survives in exactly one test: the one that proves it is rejected. Verified by: `node --test tests/configuration.test.ts` fails on every new case (objects rejected as "not a string") before 2.3.
- [x] 2.2 Red — in `tests/configuration.test.ts`, the counts and the ceiling's order: `the cell-count constants are named for cells` asserts both constants are 10; `cells naming 12 instruments keeps the first 10 and warns nothing`; `a cells entry past the ceiling that is not an object rejects the document`; `an align past the ceiling that is not a side rejects the document`; `a cells entry past the ceiling naming an unknown instrument warns and renders ten cells`; and the eight-cell expectations D10 lists move to ten — both shapes at once, an absent configuration, an empty object, an empty rows list, `a row omitting cells` (twice), the parametrized rejections, `an empty cells array`, the two duplicate-id cases, an unparseable document, and the trusted/agent document tests' `[8, 8]` → `[10, 10]`, while the `[3]` fixtures keep 3. Verified by: `node --test tests/configuration.test.ts` fails on the counts.
- [x] 2.3 Implement — in `extensions/jefferson/configuration.ts`, `cellsFromNames` takes cell objects in D2's order: the entry is an object (not an array, not `null`, not a primitive), then every own key is `instrument` or `align`, then `instrument` is present, then a non-empty string, then `align` is `"left"`, `"right"` or `"center"`, then resolve through `instrumentNamed` and collect an unknown into `notices.unknownInstruments`, then `if (cells.length === MAX_CELLS) break;` and `cells.push({ instrument: instrument ?? blank, align: align ?? "left" })`. The unrecognised-key check must narrow explicitly — `const unknownKey = Object.keys(entry).find((key) => key !== "instrument" && key !== "align")` types as `string | undefined` under `strict` with `noUncheckedIndexedAccess`, so narrow with `if (unknownKey !== undefined) throw new RejectedConfiguration(...)` before throwing: no non-null assertion and no cast in `configuration.ts`. The five rejection messages are byte-identical to D3's table — `row ${index} has a cells entry that is not an object; declare {"instrument": "model"}`, `row ${index} has a cell with an unrecognised key ${JSON.stringify(key)}; a cell carries only instrument and align`, `row ${index} has a cell with no instrument`, `row ${index} has an instrument that is not a non-empty string`, `row ${index} has an align that is not "left", "right" or "center": ${JSON.stringify(value)}` — and `DEFAULT_CELLS` and `MAX_CELLS` are both 10. No compatibility branch, notice, or conversion for the string form. Verified by: 1.1, 2.1 and 2.2 green, `pnpm typecheck` clean.
- [x] 2.4 — in `tests/jefferson.test.ts`, the six `{ cells: ["model", "thinking"] }` documents become `[{instrument:"model"},{instrument:"thinking"}]` (this task is red between 2.3 and now, because those documents are rejected); the rejected-document fixture becomes `{ cells: [{instrument:"blank"}], rows: [{}] }`, still rejected for carrying both shapes; and `a rejected configuration warns and still installs the default row` asserts `truncateToWidth(DEFAULT_CELL_TEXT, 8).repeat(10)` with its comment updated to ten cells at 80 columns. Verified by: `node --test tests/jefferson.test.ts` green and `visibleWidth(line) === 80`.
- [x] 2.5 Green — `pnpm typecheck` and `pnpm test` both pass, with the default row ten cells at both the parse and the end-to-end geometry assertions.

## 3. The renderer

- [x] 3.1 Red — in `tests/row-renderer.test.ts`, D10's byte-exact fixtures at width 20 with three cells (`cellWidth` 6, remainder 2) unless stated: `a left-aligned cell pads to the right of its text` → `"ab    ab    ab      "`; `a right-aligned cell pads to the left of its text` → `"    ab    ab    ab  "`; `text wider than its cell renders identically under any alignment`, two cells at width 21, all three lines equal; `a wide glyph dropped by the clip leaves a pad that keeps the cell's width` for `"ab漢字cd"`, both sides, 5 columns clipped into a 6-column cell; `an emoji clipped at the boundary leaves a one-column pad` for `"ab😀cdef"`, the same two expected lines as the wide-glyph case; `a combining mark is measured in columns, not code units` for `"abe\u0301"` — left `"abé   abé   abé     "`, right `"   abé   abé   abé  "`, where `length` arithmetic would produce a 2-column pad; `an ANSI-styled cell's pad carries no styling`, the closed `"\x1b[31mab\x1b[0m"` case and the open `"\x1b[4mab"` case under `left` with the reset before each pad; and `an open style from one cell resets before the next cell's pad` — `[{text:"\x1b[4mabcdefghij"},{text:"cd",align:"right"}]` at width 20 is byte-exactly `"\x1b[4mabcdefghij\x1b[0m        cd"`. Every fixture but the cross-cell one sits at a width whose remainder is non-zero, so the row's trailing blank cannot mask a pad on the wrong side. Exactly one test asserts the reset's position: the ANSI bullet stops at the closed and left-aligned open cases and carries no prose tail about a right-aligned cell behind an open one, because the cross-cell test owns that case alone and asserts the whole byte string rather than `includes(RESET)`, so it cannot pass with the reset after the pad. Verified by: `node --test tests/row-renderer.test.ts` fails on the right-aligned and reset cases before 3.3.
- [x] 3.2 Red — in `tests/jefferson.test.ts`, `a right-aligned cell ends at its cell's right edge end to end`: two cells at width 80, `{instrument:"model"}` and `{instrument:"thinking",align:"right"}`, seeded `anthropic` / `claude-opus-4` / `high`, so `cellWidth` is 40 with remainder 0, the model text measures 24 columns and the thinking text 14; assert `visibleWidth(line) === 80` and `line.indexOf("thinking: high") === 66` rather than a hand-written space count. Verified by: it fails before 3.3, where the pad lands on the wrong side and the index is 40.
- [x] 3.3 Implement — in `extensions/jefferson/row-renderer.ts`, D4's loop: `RESET`, `leavesStyleOpen`, a `spaces(count)` helper guarding `count <= 0`, and a `styleOpen` flag; the pad is `cellWidth - helpers.visibleWidth(clipped)` computed from the text the clip returned, never `String.length` and never the pre-clip text; `align: "right"` appends the pad before the cell's text, `left` appends it after, and `center` splits it — `floor(pad / 2)` before and the remainder after; every run of spaces — a cell's pad and the row's remainder — is preceded by `"\x1b[0m"` when the text before it leaves an SGR open. Signatures unchanged: `renderRow` keeps four parameters, `createFooter` three, `WidthHelpers` its two members, `GAP` stays 0, the row's remainder still lands at the right edge, and the helper is still called with two arguments so the host's own right-only pad stays off. Verified by: 3.1 and 3.2 green, `pnpm typecheck` clean.
- [x] 3.4 Green — `pnpm typecheck` and `pnpm test` both pass; the expectations in the existing `wide glyphs and ANSI escapes are measured in visible columns, not string length` test and in `a width that divides evenly gives every cell the same columns` (eight cells at 80) are unchanged, and the only diff inside those tests is the `align: "left"` fixture addition 1.2 requires — the check is on the expectation, not the hunk. Verified by: `git diff -U0 tests/row-renderer.test.ts | grep -E '^[+-].*assert\.'` shows only additions, none removed — the assertion lines in both preserved tests are byte-identical to `main`, and only fixture lines changed to carry `align: "left"`.

## 4. The README sentence

- [x] 4.1 — in `README.md`, the Status paragraph's `Formatting, alignment, and gaps are not built yet.` becomes `Formatting and gaps are not built yet.`, and no other README line moves: the later layout paragraph's mention of alignment is an aspiration for the product, not a claim that it is missing. Verified by: `rg -n "not built yet" README.md` shows the sentence without alignment, and `git diff README.md` is the changed paragraph only.

## 5. Verification

- [x] 5.1 — `pnpm typecheck` exits 0 with no output; record the exit status. Verified by: exit status 0, no output.
- [x] 5.2 — `pnpm test` exits 0 for every file, including the three files this change edits; record its summary lines as the evidence. Verified by: exit status 0; summary lines — tests 112, pass 112, fail 0.
- [x] 5.3 — `openspec validate cells-as-objects --strict` exits 0 and prints `Change 'cells-as-objects' is valid`; record the raw output. Verified by: raw output — Change 'cells-as-objects' is valid, exit status 0.
- [x] 5.4 — `git diff --stat` lists only `extensions/jefferson/configuration.ts`, `extensions/jefferson/row-renderer.ts`, `tests/configuration.test.ts`, `tests/row-renderer.test.ts`, `tests/jefferson.test.ts` and `README.md`; `extensions/jefferson/instrument.ts`, `extensions/jefferson/session-data-store.ts`, `extensions/jefferson.ts`, `package.json`, `tsconfig.json`, `pnpm-lock.yaml` and `.github/workflows/` show no diff. A diff in any of those is a design error to report, not a task to tick. Verified by: git diff --stat output lists only the six named files; no other path appeared.
- [x] 5.5 Terminal observation — performed by the owner at 136 columns on 2026-11-04, driving
  `pi -e ~/Projects/pi-jefferson/extensions/jefferson.ts` and reloading between documents.

  Observed, with the lines read from the screenshots:

  - **Right-align, two cells.** `[{model},{thinking,align:right}]` at 136 columns is two 68-column
    cells, no remainder. `thinking: high` ends flush at column 136 with all its gap to the left;
    `openrouter: ~deepseek/deepseek-flash-latest` sits at the left edge of cell 1.
  - **Centre, three cells.** `[{thinking},{thinking,align:center},{thinking}]` is 45 columns each with
    one blank column at the far right. Left text at columns 1–14, **middle text at 61–74**, right text
    starting at 91 — a 15/16 split, so the odd pad's extra column is on the right and the text sits
    half a column left of its cell's centre.
  - **Seven cells.** Seven × 19 columns with three blank columns at the right edge. The right-aligned
    last cell ends on column **133**, three short of the window, which is `136 mod 7`.
  - **Rejection.** `[{model,align:"middle"}]` warns, byte for byte:
    `row 0 has an align that is not "left", "right" or "center": "middle"` — naming the refused value
    and all three accepted ones — and renders the default ten-cell placeholder row.

  The three alignment rows were observed on their own; the warning and the default row were observed
  together in the fourth. No line differed from what the tests and the design predict.

## 6. Reconcile onto extension-structure

- [x] 6.1 — Merge `extension-structure` into this branch, so this change rests on the composition that
  change decided (its D1–D5) and both changes archive together; the merge brings
  `openspec/changes/extension-structure/` and its `extension-source-layout` delta with it, and neither
  is edited here. Resolve `extensions/jefferson/row-renderer.ts` by keeping the structure branch's
  shape — a row an `HStack` of cell views with `basis: floor(W / N)`, `grow: 0`, the footer a `VStack`
  of rows, host imports ordinary, `WidthHelpers` gone — and giving the cell view this change's pad: the
  three-way split on `cell.align` (D4) and the intra-cell reset (D6, D12). The reset is *added*, not
  preserved: the structure branch's cell view pads unconditionally (`clipped + " ".repeat(pad)`), so
  its own task 1.4 notwithstanding it holds no reset at all. `renderRow(row, width, readings)` and
  `createFooter(rows, sampleReadings)` keep the signatures the structure branch established — no
  `helpers` parameter — and the open-style reading is taken inside the cell from the text that cell just
  appended, never threaded across cells (D12). Resolve `tests/row-renderer.test.ts` and
  `tests/jefferson.test.ts` by taking the structure branch's two files wholesale, framing helpers
  included, and then re-applying this change's align fixtures on top of them in 6.2 — not by merging
  the two sets of expectations hunk by hunk, which would resolve either to this branch's version and
  turn 6.2 into a rewrite or to the structure branch's and silently drop the align fixtures 6.2
  re-expresses. Verified by: the merged lines carry the host's framing, the structure branch's
  expectations pass unchanged, this change's align fixtures are absent from both files — that absence
  is 6.2's red — and `pnpm typecheck` is clean on the resolved sources.
- [x] 6.2 — Reconcile every expectation with the host's framing, in one reviewed pass that re-applies
  this change's align fixtures on the structure branch's two test files (6.1): its `FRAME` and
  `composed(...)`/`visible()` helpers come across unchanged, and what follows is an invariant about
  where the pad sits, not a classification of which lines keep an intact frame. (a) Whether
  `visible(line)` reproduces a pre-merge string byte for byte depends on what each cell's rendered line
  ends with, so split by that rather than claiming it for every align fixture. Where every cell ends in
  pad spaces — pad ≥ 1 after the text, or any left pad — `visible(line)` equals the pre-merge string
  byte for byte: assert that, as written today, so the old expectations stand unchanged and the
  pad-side proof D10 promises is preserved. Where a cell is truncated to fill — pad 0, its line ending
  in `\x1b[0m` — `visible()` consumes that trailing reset along with the closing frame, the
  concatenation being `FRAME` exactly, so `visible(line)` equals the pre-merge string minus one reset
  for that cell; state that exact relation, and name the fixtures it governs so nobody discovers them
  by failing: `text wider than its cell renders identically under any alignment` (two cells at width
  21, both clipped to 10, so two resets go) and the two pre-existing truncation fixtures,
  `content wider than its cell is truncated to one line` and `an instrument resolving text wider than
  its cell is clipped and stays one line`, whose cells are also pad 0 — those two carry no byte-exact
  pre-merge string, and their width and substring assertions stand read from `visible(line)`. A
  fixture whose cells end in pad spaces is unaffected, which is why a general rule about `visible()`
  missed this. (b) Framing is asserted as `composed(cells)` on a line whose remainder is 0 — the
  cross-cell row, and the two-cell `ab` rows where the width divides evenly — and as
  `composed(cells) + " ".repeat(width - cellWidth * N)` anywhere the remainder is non-zero, because
  `composed(...)` ends with the closing frame but the host writes the row's trailing pad after it:
  measured, `composed("ab    ", "ab    ", "ab    ")` is not the line and `composed(...) + "  "` is.
  (c) The truncated, emoji, wide-glyph and combining-mark fixtures assert through `visible()` because a
  lookup is simpler than reproducing the collapse — **not** because their frames collapse, the cell
  truncated to fill of (a) excepted: a cell with pad 1 (wide glyph, emoji) or pad 3 (combining mark)
  ends in a pad space, so its frame stays intact, and only a cell truncated to fill (pad 0, ending in
  `\x1b[0m`) has that trailing reset absorbed into the closing frame's. The ANSI test asserts the pad
  carries no styling by counting the line's style-setting SGR sequences — one open, none between the
  cell's close and its pad — not by matching a substring. (d) The end-to-end index is taken on
  `visible(line)`: task 3.2's assertion becomes `visible(line).indexOf("thinking: high") === 66` with
  `visibleWidth(line) === 80` unchanged, because two frames of ten characters precede the text in the
  raw line — measured, 66 in `visible(line)` against 86 in the raw line — and no expectation anywhere,
  here or in 3.2, is adjusted to a framing-shifted character index: 86 would pin the frame's width as
  though it were alignment. Verified by: the align fixtures absent after 6.1 are present and pass,
  with `visibleWidth(line) === width` on each, the truncated-to-fill fixtures satisfying (a)'s
  minus-one-reset relation, and the end-to-end index asserted on `visible(line)`.
- [x] 6.3 — Rename the cross-cell test to what is now true — the host closes an open style between
  cells — and assert the frame sits between them:
  `[{text:"\x1b[4mabcdefghij"},{text:"cd",align:"right"}]` at width 20 (`cellWidth` 10, remainder 0)
  is byte-exactly `composed("\x1b[4mabcdefghij", "        cd")`, so the second cell's leading pad
  follows a reset the host wrote, not one this renderer wrote. No red: the assertion pins behaviour that
  moved to the host, and the bytes come from 6.2's measurement rather than from a new implementation.
  Verified by: `node --test tests/row-renderer.test.ts` green, with no assertion left claiming this
  renderer emits a reset across a cell boundary.
- [x] 6.4 Green — `pnpm typecheck`, `pnpm test`, `openspec validate cells-as-objects --strict` and
  `openspec validate extension-structure --strict` all pass, with no `extension-source-layout` delta
  edited here (the structure change owns it) and task 5.5 still open. Verified by: the four exit
  statuses, with `pnpm test`'s summary lines and both validate outputs recorded raw.
- [x] 6.5 — Bring `extension-structure`'s documents across in the same merge — `ARCHITECTURE.md`,
  `docs/adr/0001-imports-run-one-way.md`, `AGENTS.md` — and add one line to `ARCHITECTURE.md` naming the
  three-way pad and the `leavesStyleOpen` rule, since both now live in the model it describes. Verified
  by: the three documents are present after the merge, and the added line sits with the pad-and-reset
  paragraph it extends (`rg -n "three-way|leavesStyleOpen" ARCHITECTURE.md`).
