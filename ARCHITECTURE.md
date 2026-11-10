# Architecture

pi-jefferson draws one footer line per configured row, with empty lines between rows. This file
describes the parts and the direction they depend in. It is deliberately short: everything here is a decision a change can break,
so it is worth reading before one.

## The parts

```
extensions/jefferson.ts          the entry: the only thing pi loads; it registers and calls startup
extensions/jefferson/
  startup.ts                     the install lifecycle: the command, then the session-start installs
  configuration.ts               where pi-jefferson.json lives, reads it, validates it, normalizes rows
  footer-setup.ts                pi's footer factory and the component it returns
  format.ts                      the format language every instrument shares: parses a format and places $bar
  shipped.ts                     the shipped instruments, and instrumentNamed to look one up
  data/                          the session data and how the host's session and events reach it
  components/                    the parts, each directory holding only its own logic
    instruments/                 the instrument contract, the binding, and one file per instrument
    row/                         a row, its cells' width plan, and the renderer that draws it
    visuals/                     what an instrument can mix in; today the bar
```

Logic that many parts share, and the process flow, sit directly under `extensions/jefferson/`. A
part's directory holds only that part's logic. The decision behind the layout, and the alternatives
it weighed, are in [ADR 0005](docs/adr/0005-source-is-laid-out-by-responsibility.md), revised by
[ADR 0009](docs/adr/0009-components-hold-the-parts-and-the-bar-stands-alone.md).

**Entry.** `extensions/jefferson.ts` is the only file the host loads. It registers the extension and
hands the host's API to startup, and does nothing else.

**Startup.** Owns the `/jefferson` command and the `session_start` handler. The handler releases the
previous install, then installs the data, reads the configuration and installs the footer, in that
order. Startup also wires the repaint callback: the footer hands the host's repaint request back out,
and the data side calls it. It decides *when* things run; it computes nothing.

**Data feed.** Lives in `data/`. Seeds the store from the session context, supplies the readers, and
subscribes to the events that push into the store. One release undoes the subscriptions and disposes
the store. The store names no host event; the feed does.

**Footer setup.** Calls `ctx.ui.setFooter` with a factory that builds the row renderer's footer, and
returns the component the host expects. Disposing that component runs the release it was given.

**Store.** Holds provider, model, thinking level, working directory, context usage and usage totals.
The four static datums are seeded at `session_start`; the two selection pushes update model and
thinking level. Injected readers sample context usage each render and scan the whole session's
usage-bearing entries only when `(sessionId, leafId)` moves. `turn_end` compares the five totals and
requests a repaint only when they change. A read is synchronous, total, and never throws. The host
disposes the footer, and through it the store, before it invalidates the session context, so a read
cannot outlive its context; disposal clears the readers, and later samples are all-unknown. One sample
per render is handed to every cell, so cost and tokens share one totals object.

**Configuration.** Resolves where the document lives (the agent directory's, and a trusted project's),
reads it, validates it, resolves instrument names, and normalizes rows.
The optional `instruments` section configures each name once; formats, labels and styles are validated
at read time against its declaration and the live theme, then one bound instrument per name is shared
across the document. The binding itself lives in `components/instruments/`. Every failure mode rejects the whole
document, renders the default row, and warns with a message that names what was wrong. An unknown
instrument *name* is different: it warns and renders `blank` in that cell.

**Instrument.** One declaration owns its name, variables, default format and options, and may carry a
default label and a per-variable foreground token. Variables read the store and arrive already
formatted. Binding resolves the label (configured, else the declaration's default), collapses its
control characters once, trims it, and hands it to the format language as a leading literal segment, so
the label is styled and measured like the format's own text. When a non-empty format follows, that
segment ends in one space, the gap, so the label's style covers it and `$bar` counts its column; see
[ADR 0006](docs/adr/0006-a-label-gets-one-gap-and-outer-whitespace-is-not-text.md). A variable's
declared token can replace that segment's `fg`. The bound `(readings, width, theme) => string`
renders its format with those values.
A format may carry `|name` modifiers after a variable or after the text
in front of them, and the language commits to one order: it renders the cell empty when a value it
declares is unknown, collapses control characters, trims a format's outer whitespace when it parses,
runs a segment's string mutations in the order the format writes them, measures the columns `$bar`
leaves, and styles each segment once.
It also says whether it fills the row's spare columns, which is how a row sizes its cell.
Instruments know nothing about alignment.

**Bar.** Lives in `components/visuals/bar.ts` and stands alone: it imports no file of this package, so
a change to the format language or to an instrument cannot reach it. The format language only places
it: `format.ts` parses `$bar` and gives it the columns the row left, and `bar.ts` draws it.

**Row renderer.** Builds one `VStack` at install, retaining every cell component. Its children are one
`HStack` per row and nothing else, and its `gap` is the configuration's `rowGap`. The stack puts `gap`
empty lines between its children, so row one sits flush on the editor; see
[ADR 0008](docs/adr/0008-the-space-between-rows-is-the-stacks-gap.md). `rowGap` reaches the renderer once, at install. The vertical gap is that `gap`; the horizontal one below is the `HStack`'s.
On each render the renderer asks every cell for the width of its text at width 0 and gives those to the width
plan in `components/row/`, a pure function that returns each cell's basis, grow and joint. `blank` and `$bar`
cells fill. The joint is one column owned by the right-hand cell, drawn as a leading space inside it.
Every cell is `shrink: 1` with `minSize: 0`, so a row over its width loses columns to the host's
allocator and stays one line; the allocator also spends any remainder (the `HStack`'s `gap: 0`). A row with
`distribution: "equal"` skips the probe: every cell gets `floor(W / N)` and `grow: 1`, as
[ADR 0002](docs/adr/0002-rows-span-the-full-width.md) recorded. The same components are re-seated with
`clear()` plus `addChild` when the width changes or any plan field the cells read does: the basis, the
grow or the joint. Every cell reads the current render's sample from the footer's slot, and its memo
holds one text per width per sample, so a repeated render of the same sample resolves nothing new;
invalidation clears the memo. Each cell clips with `truncateToWidth`, pads with `visibleWidth`, and
returns one line; composition and allocation stay with the host. The choice and what it weighed are
in [ADR 0007](docs/adr/0007-a-cell-takes-the-width-its-content-needs.md).

## Import direction

One way only, and no cycles. The entry imports startup and nothing else. Startup imports what it
installs. No file imports the entry. Within `extensions/jefferson/`:

- `data/` holds the files that keep session data and take it from the host. It imports host packages
  and its own files, and no file outside `data/`.
- `components/` holds the parts. Its files import host packages, their own directory, the types of
  `data/` and `format.ts`, and never startup, footer setup, configuration or `shipped.ts`. The
  directories differ in what else they reach: `row/` imports only the type of the instrument contract,
  `instruments/` imports `format.ts` only in the binding, and `components/visuals/bar.ts` imports no local file.
- `format.ts` imports `components/visuals/bar.ts` and the types of `components/instruments/` and
  `data/`. `shipped.ts` imports the instrument files.
- Everything above those directories may import any of their files.

Host packages (`@earendil-works/*`) are `peerDependencies` with a `*` range and never
`dependencies`. Any shipped file may import one; see `docs/adr/0001-imports-run-one-way.md` for why
the older entry-only rule was retired.

The package's one runtime dependency, `lodash-es`, supplies a format modifier's string mutations;
see [ADR 0004](docs/adr/0004-string-mutations-come-from-lodash-es.md). A format's styling needs no
dependency: its modifiers are pi's own six attributes.

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

Rows span the full width. The leftover columns go to the fill cells, split evenly with the odd
columns to the earliest; with no fill cell, to the last left-aligned non-empty cell, else the first
non-empty cell, else the first cell. Under `distribution: "equal"` they go to the earliest cells, one
each. A right-aligned last cell ends at the window's edge. This replaces the former blank-right-edge
property, recorded in [ADR 0002](docs/adr/0002-rows-span-the-full-width.md); the content-sized default
is [ADR 0007](docs/adr/0007-a-cell-takes-the-width-its-content-needs.md).

## Tests

`node --test`, source executed directly with type stripping — erasable TypeScript only, no build step.
Tests live under `tests/` and never beside a source file. The renderer's expectations state the host's
per-child framing once, in a helper, and assert visible text where the framing is not the subject.
