# Proposal

## Why

pi-jefferson is still a name claim: the package ships one command that announces the statusline
is not built. The footer is the extension's whole purpose, and nothing in the package renders
one. The layout change that made a working-parts directory possible is settled, and
`extensions/jefferson/` does not exist on disk yet. This change builds the thinnest version
that is worth having: a footer row divided into evenly distributed cells, whose rows a user
declares in configuration, with Lorem text in every cell. It fixes the configuration shape and
the rendered-row contract that later changes (real cell content, module contributions) build on.

## What Changes

- The extension installs a custom TUI footer built from the rows its configuration declares,
  one footer line per row, in declaration order. Outside TUI mode no footer is installed and
  loading does not fail.
- Configuration accepts two shapes — a single row object at the top level, which implies one
  row, or a list of row objects — and normalizes both to a list of rows. Rejected: a
  configuration carrying both shapes at once, two rows sharing an `id`, and a `containers`
  count that is zero or not an integer.
- A row's `containers` count is the number of cells in that row: absent means 8, above the
  ceiling of 8 clamps to 8 rather than being rejected. Configuration speaks in counts, never in
  cells. A row's `id` is optional; the extension synthesizes one for an unnamed row.
- A row of N cells rendered at width W divides into equal cells of `floor(W / N)` columns, with
  the leftover `W mod N` columns unallocated at the row's right edge. That is the reading of the
  platform's allocator: equal `grow` weights do not produce equal widths (measured 66/34 for two
  cells at width 100), while a fixed equal `basis` with no growth does. Widths are recomputed
  from the width given at render time.
- Every cell's content is the same fixed Lorem placeholder text, truncated to its cell so a row
  stays one line tall. No module or contribution interface for cell content.
- New working parts land under `extensions/jefferson/` — a configuration reader and a row
  renderer — with tests under `tests/`. `package.json`, `tsconfig.json`, and CI are untouched:
  an ordinary module under the declared load root needs no manifest or workflow change.
- Out of scope: any module/contribution interface for cell content; the built-in footer's other
  data (git branch, statuses, model, context usage); per-cell differences of any kind.

## Capabilities

### New Capabilities

- `statusline`: the footer pi-jefferson installs — the rows a user declares in configuration and
  the evenly divided cells each row renders.

### Modified Capabilities

None. The settled `extension-source-layout` requirements do not change; this change adds modules
under the pattern they already establish.

## Impact

- `extensions/jefferson.ts` (the entry): gains the runtime host import for the footer hook — still
  the only file permitted one — and wires the configuration reader and row renderer into
  `ExtensionAPI`.
- `extensions/jefferson/` (new directory): the configuration reader and the row renderer, named
  for what they own, importing each other by relative path, with `import type` for host types.
- `tests/` (new tests): the configuration reader and the row renderer, imported by relative path.
- Untouched: `package.json`, `tsconfig.json`, `.github/workflows/ci.yml`.
- Left to design, not decided here: where the configuration document lives — a namespace key the
  extension owns inside pi's settings (which the loader preserves but does not document) or an
  extension-owned file under `.pi/` gated by `ctx.isProjectTrusted()` — and what the extension
  does when no rows are declared.
