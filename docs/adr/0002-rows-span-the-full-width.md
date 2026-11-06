# 2. Rows span the full width

Date: 2026-11-05
Status: Accepted. Supersedes the blank-right-edge property in `ARCHITECTURE.md`'s Fidelity section.

## Context

The previous geometry gave every cell `basis: floor(W / N)` and `grow: 0`. The remaining `W mod N`
columns stayed blank at the right edge, so a right-aligned last cell stopped short of the window.
That was a stated property, not a defect being repaired.

Joel's 2026-11-05 layout ruling in the `configurable-instruments` change's `owner-rulings.md` replaces
that property: pi-tui should allocate every column. The allocator evidence in `research-chidi.md`
§4.2 explains why both options matter. A basis without growth under-fills the row. `grow: 1` alone
skews ten cells over 80 columns to 13,11,10,9,8,7,6,6,5,5, because each share uses what earlier cells
left. Equal bases followed by growth distribute only the remainder, one column per earliest cell.

## Decision

Give each of a row's N cells `basis: floor(W / N)`, `grow: 1` and `shrink: 0`, with no gap. The host's
allocator spends the remainder and its `HStack` composes the line; Jefferson does not pad the
composed row.

Keep the footer tree and its cell components for the install's lifetime. On a width change, re-seat
the same components through `clear()` and `addChild` with the new per-row basis, using only public
stack methods.

## Consequences

- Every row spans the full window, and a right-aligned last cell ends at the window's edge.
- Remainder columns belong to the earliest cells: three at 100 become 34/33/33; ten at 132 become
  14/14/13/13/13/13/13/13/13/13.
- Existing documents keep their text and gain different geometry wherever the width has a remainder.
  The cell's clip, alignment, visible-column measurement and reset-before-pad guarantees are unchanged.
