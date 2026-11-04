# Architecture

pi-jefferson draws one footer line per configured row. This file describes the parts and the
direction they depend in. It is deliberately short: everything here is a decision a change can break,
so it is worth reading before one.

## The parts

```
extensions/jefferson.ts          the entry: the only thing pi loads
extensions/jefferson/
  configuration.ts               reads pi-jefferson.json, validates it, produces rows of cells
  instrument.ts                  turns store readings into one cell's content
  session-data-store.ts          holds the data instruments read, kept current by pushes
  row-renderer.ts                composes a row of cells into one line
```

**Entry.** `extensions/jefferson.ts` is the only module the host loads. It owns `pi.on(...)`
subscriptions, the config file paths, `ctx.ui.setFooter`, and the repaint callback. It decides *when*
things run; it computes nothing.

**Store.** Holds exactly the data a shipped instrument displays — provider, model, thinking level —
seeded from the context at `session_start` and updated by `model_select` and
`thinking_level_select`. A read is synchronous, total, and never throws. One sample per render is
handed to every cell, so two cells cannot disagree.

**Configuration.** Reads the document, validates it, resolves instrument names, and normalizes rows.
Every failure mode rejects the whole document, renders the default row, and warns with a message that
names what was wrong. An unknown instrument *name* is different: it warns and renders `blank` in that
cell.

**Instrument.** Given readings and the width it has, returns one line of content. Text today; a bar,
a sparkline, or a multi-part cell tomorrow. It does not know about alignment.

**Row renderer.** Composes a row from the host's `HStack`: one child per cell, `basis: floor(W / N)`,
`grow: 0`, `gap: 0`. Each cell is a `Component` that clips with `truncateToWidth`, pads with
`visibleWidth`, and returns one line. The division is ours because the allocator distributes by weight
rather than dividing; the composition is the host's.

## Import direction

One way only, and no cycles:

```
entry  →  configuration, instrument, store, row-renderer
working parts  →  each other (types and pure functions)
working parts  ✗→  entry
```

Host packages (`@earendil-works/*`) are `peerDependencies` with a `*` range and never `dependencies`.
Any shipped file may import one; see `docs/adr/0001-imports-run-one-way.md` for why the older
entry-only rule was retired.

## Two things that will bite

**A pad needs a reset.** Cell text may carry ANSI styling. A pad that follows text which left an SGR
open inherits that styling — underline painting trailing spaces, or a background bleeding across a
cell. The renderer emits a reset before such a pad. The host resets between children, so crossing a
cell boundary is already handled; the intra-cell case is ours. The pad itself splits three ways on
the cell's `align` — after the text for `left`, before it for `right`, halved around it for `center`
— and the `leavesStyleOpen` rule guards only the pad that follows the cell's own text.

**Widths are columns, not characters.** Always measure with `visibleWidth` and clip with
`truncateToWidth`. `String.length` is wrong for emoji, CJK, combining marks and ANSI escapes, and a
wide glyph dropped at a clip boundary leaves the text narrower than arithmetic predicts, so a pad must
be computed from the clipped result.

## Fidelity

`floor(W / N)` loses `W mod N` columns, which stay blank at the right edge. A right-aligned last cell
therefore ends a few columns short of the window. That is a property of the geometry, not a defect.

## Tests

`node --test`, source executed directly with type stripping — erasable TypeScript only, no build step.
Tests live under `tests/` and never beside a source file. The renderer's expectations state the host's
per-child framing once, in a helper, and assert visible text where the framing is not the subject.
