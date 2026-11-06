# Architecture

pi-jefferson draws one footer line per configured row. This file describes the parts and the
direction they depend in. It is deliberately short: everything here is a decision a change can break,
so it is worth reading before one.

## The parts

```
extensions/jefferson.ts          the entry: the only thing pi loads
extensions/jefferson/
  configuration.ts               reads pi-jefferson.json, validates it, binds instruments to cells
  instrument.ts                  declares names, variables, defaults and options
  format.ts                      owns the format-and-style language, including $bar
  session-data-store.ts          holds session datums, samples context usage, derives keyed totals
  row-renderer.ts                owns the footer tree and each cell's geometry
```

**Entry.** `extensions/jefferson.ts` is the only file the host loads. It owns `pi.on(...)`
subscriptions, the config file paths, `ctx.ui.setFooter`, and the repaint callback. It decides *when*
things run; it computes nothing.

**Store.** Holds provider, model, thinking level, working directory, context usage and usage totals.
The four static datums are seeded at `session_start`; the two selection pushes update model and
thinking level. Injected readers sample context usage each render and scan the whole session's
usage-bearing entries only when `(sessionId, leafId)` moves. `turn_end` compares the five totals and
requests a repaint only when they change. A read is synchronous, total, and never throws. The host
disposes the footer, and through it the store, before it invalidates the session context, so a read
cannot outlive its context; disposal clears the readers, and later samples are all-unknown. One sample
per render is handed to every cell, so cost and tokens share one totals object.

**Configuration.** Reads the document, validates it, resolves instrument names, and normalizes rows.
The optional `instruments` section configures each name once; formats and styles are validated at read
time against its declaration and the live theme, then one bound instrument per name is shared across
the document. Every failure mode rejects the whole document, renders the default row, and warns with a
message that names what was wrong. An unknown instrument *name* is different: it warns and renders
`blank` in that cell.

**Instrument.** One declaration owns its name, variables, default format and options. Variables read
the store and arrive already formatted. The bound `(readings, width, theme) => string` renders its
format with those values; the language collapses controls before styling each segment and drawing
`$bar`. Instruments know nothing about alignment.

**Row renderer.** Builds one `VStack` of `HStack` rows at install, retaining every cell component.
The basis is ours (`floor(W / N)` per cell); the remainder is the allocator's (`grow: 1`, `gap: 0`).
On a width change, `clear()` plus `addChild` re-seats the same components with the new basis. Every
cell reads the current render's sample from the footer's slot and memoizes by `(sample, width)`;
invalidation clears those memos. Each cell clips with `truncateToWidth`, pads with `visibleWidth`,
and returns one line; composition and allocation stay with the host.

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

Rows span the full width: the allocator gives leftover columns to the earliest cells, one each.
A right-aligned last cell ends at the window's edge. This replaces the former blank-right-edge
property, recorded in [ADR 0002](docs/adr/0002-rows-span-the-full-width.md).

## Tests

`node --test`, source executed directly with type stripping — erasable TypeScript only, no build step.
Tests live under `tests/` and never beside a source file. The renderer's expectations state the host's
per-child framing once, in a helper, and assert visible text where the framing is not the subject.
