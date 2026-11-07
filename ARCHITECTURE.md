# Architecture

pi-jefferson draws one footer line per configured row. This file describes the parts and the
direction they depend in. It is deliberately short: everything here is a decision a change can break,
so it is worth reading before one.

## The parts

```
extensions/jefferson.ts          the entry: the only thing pi loads; it registers and calls startup
extensions/jefferson/
  startup.ts                     the install lifecycle: the command, and what a session start installs, in order
  configuration.ts               where pi-jefferson.json lives, reads it, validates it, normalizes rows
  footer-setup.ts                pi's footer factory and the component it returns
  data/                          the session data and how the host's session and events reach it
  visuals/                       what a cell shows, the format language, rows, binding, and drawing them
```

The decision behind the layout, and the alternatives it weighed, are in
[ADR 0005](docs/adr/0005-source-is-laid-out-by-responsibility.md).

**Entry.** `extensions/jefferson.ts` is the only file the host loads. It registers the extension and
hands the host's API to startup, and does nothing else.

**Startup.** Owns the `/jefferson` command and the `session_start` handler, which releases the
previous install and then installs the data, reads the configuration and installs the footer, in that
order. It owns the repaint callback's wiring: the footer hands the host's repaint request back out, and
the data side calls it. It decides *when* things run; it computes nothing.

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
across the document; the binding itself lives in `visuals/`. Every failure mode rejects the whole document, renders the default row, and warns with a
message that names what was wrong. An unknown instrument *name* is different: it warns and renders
`blank` in that cell.

**Instrument.** One declaration owns its name, variables, default format and options, and may carry a
default label and a per-variable foreground token. Variables read the store and arrive already
formatted. Binding resolves the label (configured, else the declaration's default), collapses its
control characters once, and hands it to the format language as a leading literal segment, so the label
is styled and measured like the format's own text. A variable's declared token can replace that
segment's `fg`. The bound `(readings, width, theme) => string` renders its format with those values. A format may carry `|name` modifiers after a variable or after the text
in front of them, and the language commits to one order: it renders the cell empty when a value it
declares is unknown, collapses control characters, runs a segment's string mutations in the order
the format writes them, measures the columns `$bar` leaves, and styles each segment once.
Instruments know nothing about alignment.

**Row renderer.** Builds one `VStack` of `HStack` rows at install, retaining every cell component.
The basis is ours (`floor(W / N)` per cell); the remainder is the allocator's (`grow: 1`, `gap: 0`).
On a width change, `clear()` plus `addChild` re-seats the same components with the new basis. Every
cell reads the current render's sample from the footer's slot and memoizes by `(sample, width)`;
invalidation clears those memos. Each cell clips with `truncateToWidth`, pads with `visibleWidth`,
and returns one line; composition and allocation stay with the host.

## Import direction

One way only, and no cycles: the entry imports startup and nothing else, startup imports what it
installs, and no file imports the entry. Within `extensions/jefferson/`:

- `data/` holds the files that keep session data and take it from the host. It imports host packages
  and its own files, and nothing outside itself.
- `visuals/` holds the files that decide what a cell shows or how rows are laid out and drawn. It
  imports host packages, its own files and the types of `data/`. It never imports startup, footer
  setup or configuration.
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

Rows span the full width: the allocator gives leftover columns to the earliest cells, one each.
A right-aligned last cell ends at the window's edge. This replaces the former blank-right-edge
property, recorded in [ADR 0002](docs/adr/0002-rows-span-the-full-width.md).

## Tests

`node --test`, source executed directly with type stripping — erasable TypeScript only, no build step.
Tests live under `tests/` and never beside a source file. The renderer's expectations state the host's
per-child framing once, in a helper, and assert visible text where the framing is not the subject.
