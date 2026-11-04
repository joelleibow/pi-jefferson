# Proposal

## Why

A cell today holds an instrument and nothing else, because `cells` is a list of instrument names,
so a per-cell property has nowhere to live. The one property wanted is content hugging the right
edge of its cell — a padding decision inside a cell, not a share of the row — which a string list
cannot express; `cells` becomes a list of cell objects, and the default row grows from eight cells
to ten, so its cells divide more common terminal widths exactly.

## What Changes

- **BREAKING**: `cells` is a list of **cell objects**, not a list of instrument-name strings. A
  cell object carries `instrument` and, optionally, `align`:

  ```json
  { "rows": [ { "cells": [ { "instrument": "model", "align": "right" }, { "instrument": "thinking" } ] } ] }
  ```

  Before this change those two cells were written `"cells": ["model", "thinking"]`. **Every
  existing document stops rendering its named cells**: each string entry is now a wrong-typed
  entry, so the document is rejected, the default ten-cell row renders, and the warning names the
  new spelling with an example (`row 0 has a cells entry that is not an object; declare
  {"instrument": "model"}`). The migration is editing the document: each name becomes
  `{ "instrument": <name> }`. There is no deprecated read of the string form and no compatibility
  path — a list of strings is not accepted, not warned about, and not converted.
- **`align` is a cell property**, `left` (the default, when `align` is absent) or `right`. It moves
  the padding inside the cell, not the clipping: text is still clipped at its **end** with the
  ellipsis the row already uses, and the pad lands on the side opposite `align`, so a right-aligned
  cell whose text is narrower than the cell ends against the cell's right edge. Content wider than the cell looks
  identical under both alignments, because clipping consumes the whole cell and leaves no pad.
- **The default and the ceiling move from 8 to 10 cells.** Ten divides 80, 100, 120, 160 and 200
  columns exactly under `floor(W / N)`; eight does not divide 100 or 132. Ten is not universal
  either — at 132 it leaves 2 columns against eight's 4 — so the claim is the measured one: ten
  divides more common widths exactly and leaves a smaller fragment where it does not. The recorded
  cost: at 80 columns a ten-cell row gives each cell 8 columns, so a model name clips hard in a
  narrow window.
- **Widths are measured in visible terminal columns, not code units.** The host offers no left-pad
  helper and its docs say to measure columns because ANSI escapes, wide characters, emoji and
  combining characters change display width, so a pad is the cell's width minus the *clipped*
  text's visible width. A wide glyph straddling the cut is dropped, which leaves the text narrower
  than an ASCII clip would, and the pad absorbs that difference so every cell still occupies
  `floor(W / N)` columns. Padding is plain: it does not inherit the cell text's styling — a style
  reset before the pad is how the renderer may achieve that — and the host's line-end reset is
  untouched.
- **Declined, and absent from this change:** `width`, a `spacer` instrument, a bare number as
  `cells`, a `cellCount` key, and `center`. Proportional layout means deciding what a share pool
  totals, what happens when shares overshoot, and how the remainder distributes, all to produce a
  gap `align` already provides; a count key would serve only widths the default does not cover, at
  the price of a second spelling for one idea.
- **The error policy follows the shipped split.** A shape or type error rejects the whole document,
  and the default row renders with a warning: a `cells` entry that is not an object, an entry with
  no `instrument`, an `instrument` that is not a string or is empty, and an `align` other than
  `left` or `right` (`center` included). An unknown-but-well-formed instrument name still only
  warns and renders `blank` in that cell, as it does today. An unrecognised key on a cell object —
  the declined `width`, or a misspelling such as `aling` — is rejected too, and the warning names
  that key, because a statusline that silently renders something other than what was declared is
  worse than a loud failure.
- **README.md's status paragraph changes**: it says alignment is not built yet, which this change
  makes false, so the sentence drops alignment from its list of what is missing.

## Capabilities

### New Capabilities

None. The behavior this change adds — a cell object carrying an alignment — belongs to the
capability that owns how a row's cells are declared and rendered, so it is added as a requirement
there rather than split into a second capability.

### Modified Capabilities

- `statusline`: four requirements change and one is added. `A row's cells are its count and its
  placement` states
  cell objects, the ten-cell default and ceiling, and the new invalid-entry rejections.
  `Configuration designates each cell's instrument` states that each entry is an object naming an
  instrument. `Instrument text is bound by the row's geometry` states that padding lands on the
  side opposite the cell's alignment. `Cell content comes from an instrument` moves the default
  row's cell count from eight to ten so the spec does not state two defaults. `A cell's alignment
  is the padding side inside it` is added.

## Impact

- `extensions/jefferson/configuration.ts`: a row's `cells` is validated as a list of cell objects
  rather than a list of names, `align` is accepted on a cell and defaults to `left`, the default
  and ceiling cell counts become ten, and the rejection message for a non-object entry names the
  object spelling with an example.
- `extensions/jefferson/`: the renderer pads on the side the cell's alignment names instead of
  always on the right; clipping stays the host's end-anchored clip, and the row's remainder stays
  at the right edge.
- `tests/`: the configuration tests that pin the string-list shape, the 8-cell expectations, the
  non-object rejection, and the cell's single key; the renderer tests' fixtures, plus right-aligned
  padding, a wide glyph at the clip boundary, and ANSI-styled and combining-mark text under both
  alignments; the end-to-end fixtures and the geometry assertion that spells out eight cells at
  width 80.
- `README.md`: the status paragraph's "alignment ... not built yet".
- Untouched: `openspec/specs/session-data-store/` — no store datum, read, or freshness claim
  changes, because alignment never reaches the store. `package.json`, `tsconfig.json`, and the CI
  workflow need no change: no dependency moves and no new structural rule is introduced. The
  extension's exported surface gains nothing, so the test pinning its exports to the shipped three
  names still holds.
- Left to design, not settled by the owner's rulings: the exact rejection and warning wording
  beyond the non-object message above, whether `align` materializes on every normalized cell or
  only when declared, and the host documentation gap that it names no width table and defines no
  emoji-ZWJ or combining-mark widths — which is why the requirement is measured the way the host
  measures, not against an absolute standard.
