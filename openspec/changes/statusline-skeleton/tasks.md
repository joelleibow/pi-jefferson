# Tasks

Implementation checklist for `statusline-skeleton`. It executes the approved `design.md`
(D1–D10) and the requirement text in `specs/statusline/spec.md`. Every step names the command that
verifies it and the expected observed output; every check that can fail on implementation or test
behavior is paired with a red run that is shown to fail, because a check only ever seen pass has
not been tested. The four whole-tree gate steps — 4.1 (`npm run typecheck`), 4.2 (pinned-mechanism
read-back), 4.3 (`npm test` tally), and 4.6 (`openspec validate`) — are **green-only by design**:
their own run is the pass/fail gate, so a mutation red is not meaningful for them (the failure
mode is the gate's non-zero exit, not a mutated module). They are named here so the standard does
not over-claim a red for every check.

The change adds two ordinary working-parts modules under `extensions/jefferson/` (created here),
wires them into the entry `extensions/jefferson.ts`, and adds tests under `tests/`. It touches no
manifest, `tsconfig`, or CI file — requirement 8's ordinary-module case.

**Revision note (PL6).** First plan revision. One reconciliation with `design.md` D9's wording is
recorded in group 3: the design gate (`design-gate.md`, concern 1) noted that `ExtensionFactory`
receives no `ctx`, so the footer cannot be installed "in the factory body"; every shipped example
installs it from a `session_start` handler. This plan therefore describes the install as
`session_start`-driven, where `reason: "startup"` covers initial load and `"reload"` covers
`/reload` — the same observable behavior D9 requires (TUI-guarded, re-installed on every
`session_start`), stated where it can actually run. This is a wording reconciliation, not a
decision change; it is called out again in 3.1.

## Goal

The acceptance criteria are the ADDED requirements in `specs/statusline/spec.md`. This change is
done when each is observable. The table adds no criterion of its own; `spec.md` is the contract.

| Requirement (`spec.md`) | Observable acceptance criterion | Shown by |
| --- | --- | --- |
| The statusline renders the declared rows | In TUI mode the footer factory returns one line per declared row, in order; outside TUI mode `setFooter` is never called and loading does not fail | 3.1, 3.4 |
| Both configuration shapes normalize to a list of rows | A top-level row object yields one row; `rows` yields one row per entry in order; both at once is rejected | 1.2, 1.3 |
| A row's containers count | Absent → 8; within ceiling honored; above 8 clamps to 8 and is accepted; zero/negative/non-integer rejected | 1.4, 1.5 |
| Row identifiers | An unnamed row gets a non-empty deterministic id; a duplicate id rejects the document | 1.6 |
| Cells are evenly distributed across the width | N cells at width W occupy `floor(W/N)` columns each; `W mod N` stays blank at the right edge; line spans W; recomputed per render | 2.1, 2.2, 2.3 |
| Cell content is fixed placeholder text | Every cell renders the same constant; the exported surface exposes no way to supply or replace cell content | 2.5, 3.5 |
| A row is one line tall | Over-wide cell content is truncated to the cell width, so footer height is the row count | 2.4, 2.7 |
| The configuration surface is extension-owned | Configuration is read from the extension-owned `pi-jefferson.json` files the entry resolves; no host settings block supplies rows | 1.7, 3.1 |

## Scope Out

Per `proposal.md` (*What Changes*, "Out of scope") and `design.md` (*Non-Goals*):

- No module or contribution interface for cell content. The entry's export surface must not grow a
  registration hook (design Non-Goals; spec's "Contributing cell content" scenario).
- No **configuration** input of cell descriptors: configuration speaks in counts. The internal
  model is permitted to be cell-shaped (D5); nothing consumes descriptors, and `containers` accepts
  only an integer.
- No per-cell differences, no alignment, no per-gap spacing (`gap` is fixed at 0), no truncation
  priority, and no built-in footer data (git branch, statuses, model, context usage).
- No build step, no new dependency, no second entry, no settings-namespace reading.
- `package.json`, `tsconfig.json`, and `.github/workflows/ci.yml` are untouched.

## Sequencing

Order is load-bearing:

1. **Group 1 and group 2 are independent** of each other and may run in parallel; the entry (group
   3) imports both, so both must exist first.
2. **3.1 before 3.2–3.5.** 3.1 rewrites the entry to register a `session_start` handler via
   `pi.on`; with the test fake still lacking `on` the existing suite throws (the red observed in
   3.1). 3.2 extends the fake with an `on` recorder so the suite passes again.
3. **Group 3 before group 4.** Whole-tree verification runs against the final tree.
4. **4.3 last.** `openspec validate` validates the finished change.

## Architecture

`design.md` D1–D10 is the architecture. This table maps each decision to the group that builds it.

| Decision | Where it lands | Built by |
| --- | --- | --- |
| D1 configuration source, trust gate, document-level precedence | `configuration.ts` owns reading/parsing; the entry resolves the two paths and the trust flag | 1.1, 3.1 |
| D2 row envelope (top-level = one row; `rows` key = list; both rejected) | `configuration.ts` normalization | 1.2, 1.3 |
| D3 default row for absent/empty/rejected; rejected also warns | `configuration.ts` result; the entry delivers the warning via `ctx.ui.notify` | 1.3, 3.4 |
| D4 ceiling clamps above 8; below 1 / non-integer / non-number rejects | `configuration.ts` | 1.4, 1.5 |
| D5 cell-shaped internal model, descriptors permitted not built | `configuration.ts` `Row`/`Cell` types; parser takes only integer counts | 1.1, 1.5, 1.8 |
| D6 deterministic id synthesis; collisions reject | `configuration.ts` | 1.6 |
| D7 `floor(W/N)` recomputed in `render(width)`, remainder at right edge, `gap = 0` case of `floor((W-(N-1)*gap)/N)` | `row-renderer.ts` | 2.1, 2.3 |
| D8 width helpers injected from the entry | `row-renderer.ts` takes a `WidthHelpers` argument; the entry injects `truncateToWidth`/`visibleWidth` | 2.1, 3.3 |
| D9 footer install TUI-guarded and re-installed on `session_start` | the entry's `pi.on("session_start", …)` handler | 3.1, 3.3 |
| D10 cells single-line truncate and pad themselves | `row-renderer.ts` | 2.4, 2.5 |

## Constraints carried from the settled layout spec

- Host packages stay `peerDependencies` at `"*"` and never `dependencies` (verified in 4.2).
- One package, one extension; the manifest keeps exactly one entry (verified in 4.4, 4.5).
- Erasable TypeScript, no build step; `npm test` executes the source under Node type stripping
  (verified in 4.1, 4.3).
- Tests live under `tests/`, never in the load path (all new tests land there).
- `extensions/jefferson.ts` is the entry and the **only** file that may hold a runtime import of a
  host package; `extensions/jefferson/` holds the working parts and uses `import type` only
  (verified in 4.2).

## Boyscouting

Nothing to clean. The tracked non-OpenSpec surface is one shipped source module and one test file
(`tests/jefferson.test.ts`); a scan for `TODO`/`FIXME`/`XXX`/`HACK` across `extensions/`, `tests/`,
and `.github/workflows/` returns nothing, and there is no dead code or unused export in the entry.
This change creates the working-parts directory and adds files; it removes none.

## 1. The configuration reader (`extensions/jefferson/configuration.ts`)

This group lands the module and its test file `tests/configuration.test.ts`. The module uses only
`node:` builtins (`node:fs`) and `import type` for any host type — no runtime host import (D8).
Types: `Cell { text: string }`, `Row { id: string; cells: Cell[] }`, a `WidthHelpers`-free module,
`ConfigurationSource { agentPath; projectPath; projectTrusted }`, and a result
`{ rows: Row[]; warning: string | undefined }`. The fixed placeholder constant is exported once
(`DEFAULT_CELL_TEXT`); every cell's `text` is that constant.

- [x] 1.1 Create `extensions/jefferson/configuration.ts` with the `Cell` and `Row` types, the
  `DEFAULT_CONTAINERS = 8` and `MAX_CONTAINERS = 8` constants, the `DEFAULT_CELL_TEXT` constant
  (the Lorem string — an open question in `design.md`, fixed here as one line of ASCII Lorem, left
  aligned), and `readConfiguration(source: ConfigurationSource): { rows: Row[]; warning: string | undefined }`.
  `readConfiguration` reads `source.agentPath`, and reads `source.projectPath` only when
  `source.projectTrusted` is true; the project document replaces the agent document **whole**
  (D1). Verify by importing the module in a throwaway `node --input-type=module` snippet over
  `node:fs`-written temp files and observing the returned rows; the module must import nothing from
  `@earendil-works/*` at runtime. Clean-tree: all temp documents are written under
  `mkdtempSync(join(tmpdir(), "jefferson-config-"))`, outside the repository, and the snippet
  imports the module by relative path so no scratch file is left in the repo; assert
  `git status --porcelain -- extensions/jefferson` lists only `?? extensions/jefferson/` (the
  directory this change creates).

  Shape — **Test:** not yet (the committed tests are 1.2–1.8). **Boundary cases:** agent-only;
  project-present-and-trusted; project-present-and-untrusted; neither present. **Impl:** the
  module, `node:fs` only. **Logging:** n/a. **Error handling:** a read error on a present file is
  treated as a rejected document (D3), not a throw.

- [x] 1.2 Add `tests/configuration.test.ts` with the envelope tests (D2): a top-level row object
  (`{ "containers": 4 }`) normalizes to exactly one row of 4 cells; a `rows` list
  (`{ "rows": [{}, {}] }`) normalizes to two rows in order. Verify with
  `node --test tests/configuration.test.ts`; expected: both tests pass. **Red:** temporarily make
  normalization ignore the top-level shape (treat every document as the `rows` shape, so a document
  with no `rows` key normalizes to zero rows), run the test file, and confirm the test named
  "a top-level row object normalizes to one row" fails; restore and re-run green.

  Shape — **Test:** the two tests and the red run. **Boundary cases:** one row vs many; empty
  list is covered in 1.3. **Impl:** n/a. **Logging:** record the failing test name. **Error
  handling:** n/a.

- [x] 1.3 Add the rejection and fallback tests (D2, D3): `{ "containers": 4, "rows": [{}] }` is
  rejected; a rejected document yields the default row **and** a non-empty warning; an absent
  configuration yields the default row with `warning === undefined`; `{}` yields one row of 8 with
  no warning; `{ "rows": [] }` yields the default row with no warning; an unparseable document is
  rejected. **Red:** temporarily delete the both-shapes check from `configuration.ts`, run
  `node --test tests/configuration.test.ts`, and confirm the test named "both shapes at once is
  rejected" fails with its own assertion (not a syntax error elsewhere); restore the exact original
  line and re-run green. Record `shasum extensions/jefferson/configuration.ts > /tmp/pl6-cfg-1.3`
  **before** the mutation and confirm `shasum -c /tmp/pl6-cfg-1.3` prints `OK` after the revert.

  Shape — **Test:** the rejection/fallback tests, plus the red run naming the specific failing
  test. **Boundary cases:** both-at-once; absent; `{}`; empty list; unparseable. **Impl:** n/a.
  **Logging:** record the red run's failing test name. **Error handling:** the red run is the proof
  the green is not vacuous.

- [x] 1.4 Add the `containers` default and clamp tests (D3, D4): a row omitting `containers`
  renders 8 cells; `containers: 3` renders 3; `containers: 12` renders 8 **and the configuration is
  accepted** (no warning). **Red:** temporarily change the clamp to reject (`containers > 8` →
  throw), run `node --test tests/configuration.test.ts`, and confirm the test named "containers
  above the ceiling clamps to 8" fails; restore and re-run green, `shasum -c /tmp/pl6-cfg-1.4`
  (`OK`).

  Shape — **Test:** the three tests and the red run. **Boundary cases:** absent; within; above.
  **Impl:** n/a. **Logging:** record the failing test name. **Error handling:** n/a.

- [x] 1.5 Add the invalid-count rejection tests (D4, D5): `containers` of `0`, `-1`, `2.5`,
  `"4"`, `null`, and a cell-descriptor array are each rejected (default row + warning). Confirm a
  valid integer count is the only accepted shape (D5 — descriptors permitted in the model, never
  accepted from configuration). **Red:** temporarily accept `"4"` by coercing with `Number(...)`,
  run the test file, confirm the test naming the string case fails; restore and re-run green,
  `shasum -c /tmp/pl6-cfg-1.5` (`OK`).

  Shape — **Test:** the rejection tests and the red run. **Boundary cases:** zero, negative,
  non-integer, non-number, non-count array. **Impl:** n/a. **Logging:** record the failing test
  name. **Error handling:** n/a.

- [x] 1.6 Add the id tests (D6): an unnamed row gets a synthesized id derived from its zero-based
  index (`row-0`, `row-1`), non-empty and unique; a document with two explicit duplicate ids is
  rejected; a document whose explicit id collides with a synthesized one (`["a", "row-1"]`) is
  rejected. **Red:** temporarily make synthesis non-repeatable with a **module-level counter**
  (`let n = 0; … \`row-${index}-${n++}\``) so two reads in the same millisecond still differ, run
  the test file, and confirm the determinism test fails on the second read (not merely when the
  millisecond happens to change); restore and re-run green, `shasum -c /tmp/pl6-cfg-1.6` (`OK`).

  Shape — **Test:** determinism and collision tests, plus the red run. **Boundary cases:**
  explicit-unchanged; synthesized; explicit-vs-synthesized collision. **Impl:** n/a. **Logging:**
  record the failing test name. **Error handling:** n/a.

- [x] 1.7 Add the source-resolution tests (D1): with both temp files present and `projectTrusted:
  true`, the project document's rows win whole; with `projectTrusted: false`, the project document
  is ignored and the agent document's rows are used; with only the agent file present, the agent
  rows are used. **Red:** temporarily ignore `source.projectTrusted` (always read the project
  file), run the test file, and confirm the untrusted test fails; restore and re-run green,
  `shasum -c /tmp/pl6-cfg-1.7` (`OK`). All temp files live under `mkdtempSync(tmpdir()…)`, outside
  the repo; assert `git status --porcelain -- extensions/jefferson/configuration.ts` is unchanged
  before and after by shasum.

  Shape — **Test:** the three precedence/trust tests and the red run. **Boundary cases:** trusted,
  untrusted, agent-only. **Impl:** n/a. **Logging:** record the failing test name. **Error
  handling:** n/a.

- [x] 1.8 Add the cell-model test (D5): every `Row`'s `cells` is a non-empty array of `Cell`
  objects and each `Cell.text` is exactly `DEFAULT_CELL_TEXT`; no `Cell` carries any other field.
  Verify with `node --test tests/configuration.test.ts`. This is the proof the model is
  cell-shaped while configuration still speaks in counts. **Red:** temporarily push the constant
  string into `cells` instead of a `Cell` object (`cells.push(DEFAULT_CELL_TEXT)`), run the test
  file, and confirm the cell-model test fails (a `Cell` is not an object); restore and re-run
  green.

  Shape — **Test:** the cell-model test and the red run. **Boundary cases:** each container count
  yields that many cells. **Impl:** n/a. **Logging:** record the failing test name. **Error
  handling:** n/a.

## 2. The row renderer (`extensions/jefferson/row-renderer.ts`)

This group lands the module and its test file `tests/row-renderer.test.ts`. The module imports
`type { Row }` from `./configuration.ts` and receives its width helpers as a parameter (D8) — it
holds no host runtime import. `renderRow(row, width, helpers)` returns one string; a footer factory
combines rows. `gap` is fixed at 0 (D7).

- [x] 2.1 Create `extensions/jefferson/row-renderer.ts` exporting a `WidthHelpers` interface
  (`truncateToWidth(text, maxWidth): string`, `visibleWidth(text): number`), `renderRow(row: Row,
  width: number, helpers: WidthHelpers): string`, and `createFooter(rows: Row[], helpers:
  WidthHelpers): { render(width: number): string[]; invalidate(): void }`. `renderRow` computes
  `cellWidth = Math.floor(width / cells.length)` (the `gap = 0` case of `floor((W - (N - 1) * gap) /
  N)`, written with an explicit `const GAP = 0` so the generalization is visible), truncates and
  pads each cell with the injected helpers (D10), and pads the composed line to the full `width`.
  The width is computed inside `renderRow`/`render(width)` and is never stored (D7). Verify by
  importing the module in a throwaway snippet with stub helpers that count calls, over a
  hand-built `Row`, and observing the returned line's `visibleWidth`. Clean-tree: the snippet
  leaves nothing in the repo; assert `git status --porcelain -- extensions/jefferson` lists only
  the directory.

  Shape — **Test:** not yet (the committed tests are 2.2–2.7). **Boundary cases:** even width,
  uneven width, `N > W`. **Impl:** the module. **Logging:** n/a. **Error handling:** n/a.

- [x] 2.2 Add `tests/row-renderer.test.ts` with the even/uneven geometry tests (D7): a row of 8
  cells at width 80 gives each cell 10 columns; a row of 3 cells at width 100 gives each cell 33
  columns, leaves the last column blank at the right edge, and the returned line's `visibleWidth`
  is 100. Verify `node --test tests/row-renderer.test.ts`. **Red:** temporarily replace
  `Math.floor` with `Math.ceil` in `renderRow`, run the test file, and confirm the test named "a
  width that does not divide evenly leaves the remainder blank at the right edge" fails; restore
  and re-run green, `shasum -c /tmp/pl6-render-2.2` (`OK`).

  Shape — **Test:** the two tests and the red run. **Boundary cases:** divisible and not.
  **Impl:** n/a. **Logging:** record the failing test name. **Error handling:** n/a.

- [x] 2.3 Add the resize test (D7): render the same 3-cell row at width 100 (33 each) then at
  width 90 (30 each), and assert the second call's line has no cell wider than 30 — i.e. widths are
  recomputed, not retained. **Red:** temporarily cache the first computed `cellWidth` in a module
  variable and reuse it, run the test file, and confirm the resize test fails (cells keep 33 at
  width 90); restore and re-run green, `shasum -c /tmp/pl6-render-2.3` (`OK`).

  Shape — **Test:** the resize test and the red run. **Boundary cases:** two widths, same row.
  **Impl:** n/a. **Logging:** record the failing test name. **Error handling:** n/a.

- [x] 2.4 Add the one-line truncation test (D10): build a row whose cell text is far wider than
  the cell (e.g. 3 cells at width 12 → cell width 4) and assert `renderRow` returns exactly one
  string whose `visibleWidth` is 12 and whose content is truncated. **Red:** temporarily remove
  the truncation call so the raw constant is returned, run the test file, and confirm the test
  named "content wider than its cell is truncated to one line" fails; restore and re-run green,
  `shasum -c /tmp/pl6-render-2.4` (`OK`).

  Shape — **Test:** the truncation test and the red run. **Boundary cases:** content wider than
  the cell. **Impl:** n/a. **Logging:** record the failing test name. **Error handling:** n/a.

- [x] 2.5 Add the padding and visible-column tests (D10): a short cell text is padded so the line
  spans exactly the width; and a cell text containing a wide glyph (e.g. `"😀"`) and one containing
  an ANSI escape are measured with `visibleWidth`, not `String.length` — assert the line's
  `visibleWidth` still equals the width and the row is one line. The wide-glyph/ANSI input must
  let the distinction survive the line-level remainder: use the ANSI cell **first** and a width
  with a nonzero remainder (2 cells at width 9, so `cellWidth` 4 and remainder 1); then padding
  the ANSI cell from `String.length` (12, not 2) under-pads it mid-line, and the remainder —
  computed with the correct `visibleWidth` — cannot restore the byte-identical string as it
  would if the under-padded cell were last or the remainder were 0. **Red:** temporarily compute
  padding from `text.length` instead of the injected `visibleWidth`, run the test file, and confirm
  the wide-glyph/ANSI test fails; restore and re-run green, `shasum -c /tmp/pl6-render-2.5` (`OK`).

  Shape — **Test:** the padding and visible-column tests and the red run. **Boundary cases:** wide
  glyph, ANSI escape, ASCII. **Impl:** n/a. **Logging:** record the failing test name. **Error
  handling:** n/a.

- [x] 2.6 Add the footer test (D7, "declared rows"): `createFooter([a, b, c], helpers).render(80)`
  returns exactly three strings in order, each one line and each of `visibleWidth` 80. Verify
  `node --test tests/row-renderer.test.ts`. **Red:** temporarily return `rows.slice(0, 2)` from
  `createFooter` (drop the third row), run the test file, and confirm the footer test fails with
  two lines; restore and re-run green, `shasum -c /tmp/pl6-render-2.6` (`OK`).

  Shape — **Test:** the footer test and the red run. **Boundary cases:** row count = footer
  height. **Impl:** n/a. **Logging:** record the failing test name. **Error handling:** n/a.

- [x] 2.7 Add the degenerate-width test (D7): a row of more cells than columns (e.g. 8 cells at
  width 4) still returns exactly one line whose `visibleWidth` is 4. **Red:** if `renderRow` were
  changed to return the number of lines equal to the cell count, this test fails; demonstrate by
  temporarily returning `cells.map(...)` instead of a joined string and confirm the test fails;
  restore and re-run green, `shasum -c /tmp/pl6-render-2.7` (`OK`).

  Shape — **Test:** the degenerate-width test and the red run. **Boundary cases:** `N > W`.
  **Impl:** n/a. **Logging:** record the failing test name. **Error handling:** n/a.

## 3. The entry: configuration resolution, footer install, TUI guard (`extensions/jefferson.ts`)

This group is the only place a runtime host import may live. It resolves the config paths and trust
flag, injects the width helpers, and installs the footer from a `session_start` handler. It also
updates `tests/jefferson.test.ts` — the entry change adds `pi.on`, which the current fake
`ExtensionAPI` lacks, so the fake must be extended in the same group.

- [x] 3.1 Rewrite `extensions/jefferson.ts` to keep `VERSION` and the `/jefferson` command, and
  add the runtime imports of `@earendil-works/pi-coding-agent` (`CONFIG_DIR_NAME`, `getAgentDir`)
  and `@earendil-works/pi-tui` (`truncateToWidth`, `visibleWidth`), the relative imports of
  `./jefferson/configuration.ts` and `./jefferson/row-renderer.ts` (naming the file, never the bare
  directory), and a `pi.on("session_start", (_event, ctx) => …)` handler. Inside the handler,
  return early unless `ctx.mode === "tui"` (D9); resolve `agentPath =
  join(getAgentDir(), "pi-jefferson.json")` and `projectPath = join(ctx.cwd, CONFIG_DIR_NAME,
  "pi-jefferson.json")` and pass both plus `projectTrusted: ctx.isProjectTrusted()` into
  `readConfiguration` (D1); when a warning is returned, call `ctx.ui.notify(warning, "warning")`
  (D3); then call `ctx.ui.setFooter(() => createFooter(rows, { truncateToWidth, visibleWidth }))`
  (D8). Header comment: extend the existing doc comment to note the entry now installs the footer
  and remains the only runtime host importer. **Red:** this step is the red for itself — the test
  fake still lacks `on` (3.2 has not run), so run `node --test tests/jefferson.test.ts` and observe
  both existing tests fail with `TypeError: pi.on is not a function`; 3.2 extends the fake and
  turns them green.

  This is the D9 reconciliation recorded at the top: the install lives in `session_start`, where
  `reason: "startup"` is initial load and `reason: "reload"` is `/reload`; the design's "at load
  and on every `session_start`" is one observable behavior, stated where `ctx` exists.

  Shape — **Test:** the red `TypeError` then, after 3.2, the two existing tests green. **Boundary
  cases:** TUI vs non-TUI (exercised in 3.3). **Impl:** the entry rewrite. **Logging:** record the
  failing `TypeError`. **Error handling:** the TUI guard prevents a `setFooter` call outside TUI.

- [x] 3.2 Update the fake `ExtensionAPI` in `tests/jefferson.test.ts` to record `on(event,
  handler)` registrations in a map, then confirm the two existing tests pass with
  `node --test tests/jefferson.test.ts` (the red `TypeError` observed in 3.1 now clears). After
  the change, the two tests cover: "registers exactly one command" — the command map is still
  exactly `["jefferson"]`; "the alpha announces that it is a name claim and nothing more" — the
  `/jefferson` notify text and `VERSION === "0.0.0-alpha"` are unchanged.

  Shape — **Test:** the two existing tests. **Boundary cases:** n/a. **Impl:** the fake gains an
  `on` recorder. **Logging:** n/a. **Error handling:** n/a (the red belongs to 3.1 and is already
  measured there).

- [x] 3.3 Add the entry lifecycle tests to `tests/jefferson.test.ts` (D9): capture the registered
  `session_start` handler; invoke it with a fake `ctx` whose `mode` is `"tui"` and confirm a
  `setFooter` factory was called, and whose `mode` is `"print"` and confirm `setFooter` was never
  called; invoke it twice with `"tui"` (startup then reload) and confirm `setFooter` was called
  twice. Set `process.env.PI_CODING_AGENT_DIR` to a `mkdtempSync(tmpdir()…)` directory and
  `ctx.cwd` to a temp directory so the reads are hermetic, and restore the env var after the test.
  Give the fake `ctx` an explicit `isProjectTrusted()` (default `false`) and a `ui.notify`
  recorder. **D1 entry wiring:** with the agent temp dir holding a default-shaped
  `pi-jefferson.json` and the project temp dir (`ctx.cwd`/`CONFIG_DIR_NAME`) holding a
  distinguishable two-row document, invoke the handler with `isProjectTrusted` `true` and assert
  the captured `setFooter` factory renders the project's two rows; invoke it with `false` and
  assert the project document is ignored (agent/default rows render) — proving the entry passes
  `ctx.isProjectTrusted()` through end to end, not merely that the reader honors a boolean passed
  by a test (plan-gate concern 3). **Red (trust wiring):** temporarily make the entry pass
  `projectTrusted: true` unconditionally, run the test file, and confirm the untrusted end-to-end
  test fails (project rows rendered); restore and re-run green. **Red (TUI guard):** temporarily
  remove the `ctx.mode === "tui"` guard, run `node --test tests/jefferson.test.ts`, and confirm
  the print-mode test fails (`setFooter` was called); restore and re-run green, `shasum -c
  /tmp/pl6-entry-3.3` (`OK`).

  Shape — **Test:** the lifecycle tests, the trusted/untrusted entry tests, and the two red runs.
  **Boundary cases:** TUI, non-TUI, repeated `session_start`, trusted/untrusted project. **Impl:**
  n/a. **Logging:** record the failing test names. **Error handling:** restores the env var and
  removes temp dirs (they are outside the repo; assert `git status --porcelain --
  tests/jefferson.test.ts` shows only this test file's expected edit).

- [x] 3.4 Add the rejected-configuration entry test (D3): point the handler at a temp agent
  directory whose `pi-jefferson.json` is the both-shapes document (`{ "containers": 4, "rows":
  [{}] }`); invoke the handler with a TUI fake `ctx`; assert `ctx.ui.notify` was called with a
  `"warning"` and that the captured `setFooter` factory still returns the default row (one line of
  8 cells at a test width). **Red:** temporarily remove the `ctx.ui.notify(...)` call, run the test
  file, and confirm the warning test fails; restore and re-run green, `shasum -c /tmp/pl6-entry-3.4`
  (`OK`).

  Shape — **Test:** the warning-and-default-row test and the red run. **Boundary cases:** rejected
  document still installs the default row. **Impl:** n/a. **Logging:** record the failing test
  name. **Error handling:** temp dirs are outside the repo.

- [x] 3.5 Add the no-contribution-interface test: import the entry module namespace and assert its
  exported keys are exactly `["VERSION", "default"]`, and that neither `row-renderer.ts` nor
  `configuration.ts` exports a function that registers or supplies cell content (inspect their
  exported keys). This is the spec's "Contributing cell content" scenario, made checkable. Verify
  `node --test tests/jefferson.test.ts`. **Red:** temporarily add an exported
  `registerCellContent(...)` function to `row-renderer.ts`, run the test file, and confirm the
  export-surface test fails (the module's keys are no longer the allowed set); restore and re-run
  green, `shasum -c /tmp/pl6-entry-3.5` (`OK`).

  Shape — **Test:** the export-surface test and the red run. **Boundary cases:** the three
  modules' export sets. **Impl:** n/a. **Logging:** record the failing test name. **Error
  handling:** n/a.

## 4. Whole-tree verification and change validation

- [x] 4.1 Run `npm run typecheck` against the final tree; expected exit 0 with no output. Every
  file under `extensions/jefferson/` is covered by `tsconfig.json`'s `extensions/**/*.ts` include
  with no include edit; the tests are covered by `tests/**/*.ts`.

  Shape — **Test:** typecheck exit 0 is the assertion. **Boundary cases:** n/a. **Impl:** n/a.
  **Logging:** n/a. **Error handling:** a non-zero exit is the failure signal. Green-only by
  design (see the header): the gate's own run is the check and a mutation red is not meaningful
  for it.

- [x] 4.2 Confirm the pinned mechanisms are untouched: `files` is still
  `["extensions","README.md","LICENSE"]`; `tsconfig.json` `include` is still
  `["extensions/**/*.ts","tests/**/*.ts"]`; both host packages remain in `peerDependencies` with
  `"*"` and absent from `dependencies`; and `extensions/jefferson.ts` is the only file under
  `extensions/` with a runtime import of `@earendil-works/*` (the two working-parts modules contain
  only `import type` or none). Verify with
  `node -e "const p=require('./package.json'); console.log(JSON.stringify({files:p.files, peers:p.peerDependencies, deps:p.dependencies, pi:p.pi}))"`,
  expected to print the unchanged values, and with
  `rg -n 'from "@earendil-works' extensions` showing the entry plus at most `import type` lines in
  `extensions/jefferson/`. Then confirm `git diff package.json tsconfig.json
  .github/workflows/ci.yml` is empty.

  Shape — **Test:** the read-back and the scoped `git diff` are the observations. **Boundary
  cases:** the four surfaces named. **Impl:** n/a (assert only). **Logging:** n/a. **Error
  handling:** n/a. Green-only by design (see the header): a read-back gate has no meaningful
  mutation red.

- [x] 4.3 Run `npm test` (i.e. `node --test`) against the final tree; expected: the existing two
  tests in `tests/jefferson.test.ts` plus the new `tests/configuration.test.ts` and
  `tests/row-renderer.test.ts` tests all pass, 0 fail. This is also the erasable-syntax check:
  Node executes the source directly, so a non-erasable construct fails to parse.

  Shape — **Test:** the runner's pass count is the assertion. **Boundary cases:** n/a. **Impl:**
  n/a. **Logging:** record the pass/fail tally. **Error handling:** a non-zero exit is the
  failure signal. Green-only by design (see the header): it is the aggregate of the reds already
  measured per group, so it carries none of its own.

- [x] 4.4 Run the host discovery command (adapted from the archived change's task 4.1) from the
  repository root with an isolated `agentDir`:

  ```sh
  node --input-type=module -e '
    import { mkdtempSync } from "node:fs";
    import { tmpdir } from "node:os";
    import { join } from "node:path";
    import { discoverAndLoadExtensions } from "@earendil-works/pi-coding-agent";
    const agentDir = mkdtempSync(join(tmpdir(), "jefferson-agentdir-"));
    const { extensions, errors } = await discoverAndLoadExtensions(["."], ".", agentDir);
    console.log("count:", extensions.length);
    const [ext] = extensions;
    if (ext) console.log("resolvedPath:", ext.resolvedPath, "commands:", [...ext.commands.keys()]);
    console.log("errors:", JSON.stringify(errors));
  '
  ```

  Expected: `count: 1`, `resolvedPath:` `<repoRoot>/extensions/jefferson.ts`, `commands: [
  'jefferson' ]`, `errors: []`. **Red:** in a throwaway copy of the repository (not this tree),
  point `pi.extensions` at a non-existent file (e.g. `["./extensions/lefferson.ts"]`) and re-run;
  expected `count: 0`. This confirms the green is not vacuous.

  Shape — **Test:** the discovery output and the red copy's `count: 0`. **Boundary cases:** the
  real entry vs a wrong manifest value. **Impl:** n/a. **Logging:** record both outputs. **Error
  handling:** the red input is applied only in the throwaway copy, so this tree's manifest is never
  edited.

- [x] 4.5 Confirm the tarball/load-contract guard still passes on a real pack: `pnpm pack --dry-run
  --json` and check the shipped set is exactly `LICENSE`, `README.md`, `extensions/jefferson.ts`,
  `extensions/jefferson/configuration.ts`, `extensions/jefferson/row-renderer.ts`, and
  `package.json` — the new modules ship under the allowed `extensions/` root with no `files`,
  `tsconfig`, or CI edit, and no `*.test.ts` ships. **Red (measured, not asserted):** temporarily
  add `extensions/jefferson/scratch.test.ts`, then execute the CI guard itself — the `node -e '…'`
  block from the `The tarball and the load contract are what we expect` step in
  `.github/workflows/ci.yml` — against the scratch pack. Build the two inputs the guard reads:
  `tmp=$(mktemp -d); pnpm pack --dry-run --json > "$tmp/shipping.json"; pnpm pack
  --pack-destination "$tmp" >/dev/null; tar -xOzf "$tmp"/*.tgz package/package.json >
  "$tmp/packed-package.json"`, then run that guard block with `"$tmp/shipping.json"
  "$tmp/packed-package.json"`. Expected: the guard exits 1 printing `test files shipped:
  extensions/jefferson/scratch.test.ts` — the rejection is measured by running the guard, not
  asserted from the pack list. Remove the scratch file, re-run the same guard invocation, and
  expect exit 0 with no problem printed. Finally assert `git status --porcelain -- extensions/
  jefferson/scratch.test.ts` prints nothing, scoped to what this step created.

  Shape — **Test:** the packed file list and the executed guard's exit codes and messages.
  **Boundary cases:** ordinary module ships; test file must not. **Impl:** one temporary scratch
  file, removed. **Logging:** record the packed list and both guard outputs. **Error handling:**
  the scoped `git status` proves the scratch is gone.

- [x] 4.6 Run `openspec validate "statusline-skeleton"` and confirm the change validates;
  record its exact output.

  Shape — **Test:** the validator's verdict is the assertion. **Boundary cases:** n/a. **Impl:**
  n/a (run only). **Logging:** record the exact output. **Error handling:** a validation error
  blocks archiving. Green-only by design (see the header): a validator run has no meaningful
  mutation red.
