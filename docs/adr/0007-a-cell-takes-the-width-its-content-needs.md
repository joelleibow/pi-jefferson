# 7. A cell takes the width its content needs, and a row option restores equal shares

Date: 2026-11-07
Status: Accepted. Narrows [ADR 0002](0002-rows-span-the-full-width.md): both stay in force, and the
equal rule it records now applies where a row asks for it.

## Context

Joel's footer had the model cell and the thinking cell, both right-aligned, each inside its own equal
share of the row, with a gap between them. He wanted the two to read as one cell: *"a way to allow for
cells to fill no more than the width they need to display their content and neighboring cells then
appear butted against them."* ADR 0002 gave every cell `floor(W / N)` columns whatever its text
held, so no setting could close that gap.

His 2026-11-07 rulings settled four things. The default is content-sized cells, and a row option
restores equal distribution. The mechanism is the cell itself, with no cell holding several
instruments. Two content-sized neighbours get one system space between them, and it collapses when the
row is narrow. The break to existing rows is accepted before 1.0.

Two constraints shaped the mechanism. pi-tui allocates the row: *"That lets pi-tui do its thing and we
are spared anything that risks us having bugs"* (Joel, 2026-11-03). And pi-tui's `HStack` renders every
child at the full row width to measure it, so a cell that pads to the width it is given always
measures as the whole row.

## Decision

By default a cell takes the columns its text needs. A cell whose instrument is `blank`, or whose format
holds `$bar`, fills instead: it takes what the row leaves, shared evenly among the filling cells.

- **Jefferson computes numeric bases; pi-tui allocates.** A pure function under `visuals/`, the width
  plan, takes each cell's alignment, whether it fills and its content width, and returns a `basis`, a
  `grow` and whether the cell carries the joint. It imports nothing. The footer renderer stays the one
  place that names pi-tui. Every cell is `shrink: 1` with `minSize: 0`, so a row over its width loses
  columns to the host's allocator and stays one line. No priority is configurable.
- **A cell's content width is its text rendered at width 0,** measured in columns. `$bar` is the only
  variable that reads the width, and at width 0 it contributes nothing. An instrument that does not
  fill must render the same text at every width; a test holds every shipped one to that.
- **Where the spare columns go.** To the filling cells. With none, to the last left-aligned non-empty
  cell, else the first non-empty cell, else the first cell. An empty cell, one whose data is unknown,
  takes no columns and never absorbs while another cell has text.
- **The joint is one column, owned by the right-hand cell** and drawn as a leading space inside it.
  It exists between two non-empty content cells, and not beside a filling cell or at the boundary an
  absorber's spare columns land on. It is counted in the cell's basis. When text and joints need the
  row's width or more, every joint drops together, before any text is shortened.
- **The row option is `distribution`,** with the values `"content"` and `"equal"`; absent means
  `"content"`. It is an enum, so a third value later is not a breaking rename. A value outside the two
  rejects the document like a bad `align`. There is no per-cell key: a user who wants a cell to take
  the slack puts a `blank` cell beside it.
- **`"equal"` is ADR 0002's rule.** Every cell gets `basis: floor(W / N)` and `grow: 1`, with no
  probe and no joint, so its lines are the ones ADR 0002 produced. The one difference is `shrink: 1`
  where ADR 0002 said `shrink: 0`, which keeps the overflow guarantee the same under both
  distributions. ADR 0002 still states why the remainder goes to the earliest cells.
- **A cell's memo holds one text per width per sample,** since a content cell is now asked for three
  widths in a frame. A row re-seats its cells when the width changes or when any plan field they read
  does: the basis, the grow, or the joint.

Alternatives weighed and not taken:

- **`basis: "auto"` on the host.** A padded cell measures as the row's width, so every cell claims the
  whole row. A cell cannot tell a measuring call from an allocated one.
- **A `naturalWidth` method on every instrument.** It duplicates each resolver and adds a contract to
  keep, and a width-0 render answers the same question.
- **A cell holding several instruments,** and **a spacer instrument or row-level justify.** Joel took
  content-width cells. A spacer re-invents the declined `spacer`, and `blank` already fills.
- **Jefferson-owned shrink or proportional arithmetic.** It revises the 2026-11-05 ruling that the
  host allocates, and needs Joel's word before anyone writes it.
- **A stack `gap: 1` for the joint.** It would put a column between every pair, empty and filling cells
  included, and break the equal option's "no gap".
- **A boolean option, or the names `width`, `layout` and `justify`.** A boolean cannot take a third
  value. `width` is declined as a cell key, and the others invite features nobody asked for.

## Consequences

- Neighbours move when a value changes length: `High` becoming `Max` shifts the cell beside it. A row
  that wants stable shares sets `distribution: "equal"`.
- A cell with no spare columns has nothing for `align` to pad, so `align` changes nothing in it.
- Existing documents with several cells re-lay: left-aligned cells hug, and the last one absorbs the
  slack. The break is accepted, and `"equal"` on a row is the way back.
- The first column lost to overflow is the allocator's choice, often an earlier cell's, and no spec
  promises an order.
- A footer frame resolves a content cell's instrument up to three times, where it was twice, and a
  repeated render of the same sample resolves nothing new.
- A new instrument that reads the width must declare `fills`, or the probe test fails.
- Reversing the default means making `"equal"` the default again, with no data to migrate.
