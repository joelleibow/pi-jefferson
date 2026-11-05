# Tasks

## 1. The host owns composition

- [x] 1.1 Red — in `tests/row-renderer.test.ts`, replace each byte-exact expectation with the host's composed form: a `FRAME` constant and a `composed(...cells)` helper that wraps each cell and closes the line, plus a `visible()` helper that strips the framing where the framing is not the subject. Run `node --test tests/row-renderer.test.ts` and record the failures as the pre-refactor baseline.
- [x] 1.2 Implement — in `extensions/jefferson/row-renderer.ts`, compose the row with `new HStack(children, { gap: GAP })`, each child `{ component, basis: cellWidth, grow: 0, shrink: 0 }`, imported directly from `@earendil-works/pi-tui`.
- [x] 1.3 Implement — each cell is a `Component` whose `render(cellWidth)` clips with the injected `truncateToWidth`, pads with `visibleWidth`, and returns one line. Instruments resolve once per row render, before the components are built.
- [x] 1.4 Implement — delete the cross-cell ANSI state: the host resets between children, so only the intra-cell reset remains, for a pad that follows the cell's own open SGR.
- [x] 1.5 Green — `pnpm typecheck` and `pnpm test` pass; `node --test tests/row-renderer.test.ts` is 13/13.

## 2. The end-to-end expectations

- [x] 2.1 Red — in `tests/jefferson.test.ts`, the assertions that read a rendered footer line by prefix or by exact string fail once the host frames each child; record them.
- [x] 2.2 Implement — add the same `FRAME`/`visible()` helpers and assert visible text where the framing is not the subject; keep the byte-exact default-row assertion as the one place the framing is pinned end to end.
- [x] 2.3 Green — `pnpm test` is 95 passing, `pnpm typecheck` clean, `openspec validate --strict` valid.

## 3. The rule and the record

- [x] 3.1 Write `openspec/changes/extension-structure/specs/extension-source-layout/spec.md`: remove `Host packages are imported only at the load boundary` with a migration note, and add `Host packages are the host's to supply, and imports run one way`.
- [x] 3.2 Write `ARCHITECTURE.md`: the model (entry, store, config, instruments, cell, row), the import direction, and where the pads and the reset live.
- [x] 3.3 Write `docs/adr/0001-imports-run-one-way.md`: the rule that was retired, why it was adopted without measurement, and what replaces it.
- [x] 3.4 Write `AGENTS.md`: how to add an instrument, how to run the gates, and the two traps this repo has already paid for (the abortable pager, the pad that needs a reset).
- [x] 3.5 `openspec validate extension-structure --strict` and `pnpm test` after the documents land.
