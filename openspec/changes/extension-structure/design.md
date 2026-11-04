# Design

## Context

The renderer builds each row by concatenating strings, and the layout spec confines runtime host
imports to the entry. Both were adopted without measurement. The measurements that matter:

- `HStack` with `grow: 1` does not divide a row: two children at width 100 come out 66/34, three come
  out 48/31/21, and the skew worsens with child count. With `basis: floor(W / N)`, `grow: 0`, the
  children occupy exactly their basis and the host pads the line to the width — which is the geometry
  the statusline spec already requires.
- The host composes each child behind a style reset and a hyperlink reset:
  `"\u001b[0m\u001b]8;;\u0007ab \u001b[0m\u001b]8;;\u0007cd \u001b[0m\u001b]8;;\u0007"`. That is the
  cross-cell styling bleed the renderer currently defends against by hand.
- A nested host import resolves to the host's copy; a physical copy is what breaks module identity, and
  the `peerDependencies` clause already forbids one.

## Goals / Non-Goals

**Goals:** compose rows from the host's components; import what we need where we need it; delete the
cross-cell ANSI state; record the architecture and the reversed rule where they survive archiving.

**Non-Goals:** no behaviour change in what a reader sees; no change to the config surface, the
instruments, the store, or the entry's wiring; no alignment work (that is the change above this one).

## Decisions

### D1. A row is an `HStack` of cell components

`renderRow` computes `cellWidth = floor((width - (N - 1) * GAP) / N)` and hands each child
`basis: cellWidth, grow: 0, shrink: 0`. The host composes and pads; the row's remainder therefore lands
at the right edge without our arithmetic. The division stays ours because the allocator distributes by
weight, not by division — measured, not assumed.

### D2. A cell owns only its clip and its pad

Each cell is a `Component` whose `render(cellWidth)` clips with the host's `truncateToWidth` and pads to
the cell width with the host's `visibleWidth`. It returns one line, so a row is one line.

Instruments resolve **once per row render**, not once per `render` call: the host asks a child to render
more than once (measure, then lay out), and an instrument must not pay for that twice.

### D3. The cross-cell ANSI state is deleted

The host resets styling between children. Only the intra-cell case remains: a pad that follows the
cell's own open SGR gets a reset first. This is a behaviour *reduction* in our code, from state threaded
across cells to one condition inside a cell.

### D4. The rendered bytes carry the host's framing

Every line gains `ESC[0m ESC]8;;BEL` before each child plus one at the end. Invisible, byte-different.
The tests declare it once (`FRAME` and `composed()` in the renderer tests; `visible()` where the framing
is not the subject) rather than scattering escape sequences through assertions.

### D5. Host imports are ordinary imports; the direction is what matters

`row-renderer.ts` imports `HStack` and `Component` from `@earendil-works/pi-tui`. The rule that survives
is the one with a failure mode: host packages stay `peerDependencies` with a `*` range and out of
`dependencies`; imports run one way, entry → working parts, never back, with no cycles. Recorded in
`docs/adr/0001-imports-run-one-way.md`.

The `WidthHelpers` parameter is deleted outright, not kept as a seam. It existed to serve the retired
rule; once host imports are ordinary, the only reason left to pass width helpers in would be the tests,
and a seam that exists for the tests is the tests dictating the design. `renderRow` and `createFooter`
lose the parameter, the entry stops passing it, and the tests call the real signatures.

## Risks / Trade-offs

- **[Host framing leaks into tests]** Every byte-exact expectation now encodes host output. → Stated
  once in a helper, so a host change moves one constant rather than twenty literals.
- **[Allocator semantics are now load-bearing]** `basis` plus `grow: 0` is what makes the geometry
  exact. → Recorded in D1 and in `ARCHITECTURE.md`; a future change that reaches for `grow` will see
  the measurement.
- **[Host renders children more than once]** An instrument that did work per call would double it. →
  D2 resolves instruments once per row render, and a test asserts the call count.
- **[Loss of the entry-only guarantee]** A physical copy of the host package would still break module
  identity. → Unchanged and still checked: `peerDependencies` with `*`, absent from `dependencies`.

## Migration Plan

An ordinary change under the established load root: one source file, two test files, three documents.
No manifest, `tsconfig`, or CI edit. Rollback is a revert; nothing is persisted.

## Open Questions

None.
