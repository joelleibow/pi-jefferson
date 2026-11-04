# Proposal

## Why

Two constraints are costing more than they buy, and both were adopted without measurement.

The `extension-source-layout` spec confines runtime host imports to the entry file. That is not a
Node constraint — a nested file importing `@earendil-works/pi-tui` resolves to the host's copy like any
other import. What the rule actually protects, one copy of the host package reaching the process, is
already guaranteed by the `peerDependencies` clause beside it. What it costs is injection: helpers
handed `truncateToWidth`, `visibleWidth`, and now `HStack` as parameters so one file can avoid writing
`import`.

The renderer assembles each row by concatenating strings. The host ships a component model for exactly
this: `HStack` composes children and pads the line, `Component` gives each child its own `render(width)`,
and the host wraps every child in a style reset, which is the cross-cell styling problem we solved by
hand last change.

## What Changes

- **The entry-only import rule is removed** and replaced by the rule that matters: host packages stay
  `peerDependencies` with a `*` range and out of `dependencies`; any shipped file may import one; and
  imports within the package run one way — the entry may import the working parts, never the reverse,
  with no cycles.
- **A row is composed from the host's `HStack`**: `basis: floor(W / N)`, `grow: 0`, `gap: 0`. Each cell
  is a `Component` whose `render(width)` returns one clipped, padded line. The division stays ours
  because the allocator distributes by weight rather than dividing; composition, child iteration and
  line padding become the host's.
- **The cross-cell ANSI handling goes away**: the host resets styling between children, so the renderer
  keeps only the reset a pad needs when the cell's own text left an SGR open.
- **The rendered bytes gain the host's framing** — `ESC[0m ESC]8;;BEL` before each child and one at the
  end. Invisible, but every byte-exact expectation moves with it. The tests state that framing once, in
  a helper, and assert visible text where the framing is not the subject.
- `ARCHITECTURE.md` and a decision record for the reversed rule are added, so the model and the reason
  survive the change directory.

## Capabilities

### New Capabilities

None. This change alters an existing structural contract and no user-facing behaviour.

### Modified Capabilities

- `extension-source-layout`: `Host packages are imported only at the load boundary` is removed with a
  migration note, and `Host packages are the host's to supply, and imports run one way` is added in its
  place.

## Impact

- `extensions/jefferson/row-renderer.ts` — composes an `HStack`; imports `@earendil-works/pi-tui`
  directly; the per-cell component owns clip and pad.
- `tests/row-renderer.test.ts`, `tests/jefferson.test.ts` — expectations state the host's framing once
  and assert visible text elsewhere.
- `ARCHITECTURE.md`, `docs/adr/0001-imports-run-one-way.md`, `AGENTS.md` — new.
- No change to the parser, the store, the instruments, `package.json`, `tsconfig.json`, or CI.
