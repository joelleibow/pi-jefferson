# Design

## Context

This change builds the thin first statusline: a TUI footer whose rows the user declares in
configuration, each row divided into evenly distributed cells carrying fixed Lorem text. See
`proposal.md` for motivation. The design is constrained by facts already measured and settled,
not open to re-litigation:

- `openspec/specs/extension-source-layout/spec.md` fixes the source layout. The manifest names
  the **file** `./extensions/jefferson.ts`, which is the only module the host loads and the only
  module permitted a **runtime** import of `@earendil-works/*`. Modules ship under
  `extensions/jefferson/` (which does not exist yet — this change creates it — and which the host
  never enumerates), import each other by relative path, use `import type` for host types, and
  use only erasable TypeScript. Tests live under `tests/`. Adding an ordinary module there needs
  no edit to `package.json`, `tsconfig.json`, or the CI guard.
- **Ground truth — equal widths are not the stack allocator's job.** `research-chidi.md` Finding
  3 measured that `allocateStackSizes` drains greedily left to right: two children with `grow: 1`
  at width 100 come out `[66, 34]`, three come out `[48, 31, 21]`, and this is byte-identical in
  pi-tui 1.4.0 and 1.5.0. Equal cells therefore come from explicit `floor(W / N)` arithmetic
  recomputed inside `render(width)`. The stack allocator must **not** divide the row. `HStack`
  is not used for cell division.
- **Ground truth — width helpers cross the load boundary by injection.** `truncateToWidth` and
  `visibleWidth` are runtime values of `@earendil-works/pi-tui`; only `extensions/jefferson.ts`
  may hold a runtime import of a host package. Modules under `extensions/jefferson/` therefore
  receive both helpers as parameters from the entry. Naive string slicing is wrong the moment a
  wide glyph, emoji, or ANSI escape replaces ASCII Lorem.
- The host config surface: `research-chidi.md` Finding 1 reports that a per-extension
  `settings.json` namespace is only a convention the loader tolerates, with no documented
  support, while the documented per-extension pattern is an extension-owned file under
  `<cwd>/<CONFIG_DIR_NAME>/`, gated by `ctx.isProjectTrusted()`. `CONFIG_DIR_NAME` and
  `getAgentDir()` are runtime exports of `@earendil-works/pi-coding-agent`
  (`dist/index.d.ts`); only the entry may import them.
- The host footer surface: `ctx.ui.setFooter(factory)` replaces the built-in footer with one
  component (`research-chidi.md` Finding 2). It is a single slot, last caller wins. `setFooter`
  is a documented no-op in RPC mode, and `ctx.mode === "tui"` is the documented guard for
  terminal-only features. `resetExtensionUI` clears the custom footer on reload/session
  replacement, so a reloaded extension must re-register it (`session_start` carries
  `reason: "startup" | "reload" | "new" | "resume" | "fork"`).
- The compiled component contract is `render(width): string[]` — every returned line must fit
  `width`, measured in visible columns, not string length (`research-chidi.md` Finding 4).

## Goals / Non-Goals

**Goals:**

- Install a TUI footer whose height is the number of declared rows, one footer line per row, in
  declaration order, replacing the built-in footer while the extension is loaded in TUI mode.
- Accept the configuration surface settled below, normalize both shapes to a list of rows, and
  render a defined default row when no usable rows are supplied.
- Render each row as `N` cells of `floor(W / N)` visible columns, recomputed from the width
  given at render time, with the remainder blank at the row's right edge.
- Keep every cell single-line by truncating and padding its own content.
- Land the working parts under `extensions/jefferson/` with tests under `tests/`, touching no
  manifest, `tsconfig`, or CI file.

**Non-Goals:**

- No module or contribution interface for cell content. The single export surface of the
  extension exposes no way for another module to supply or replace cell content.
- No **configuration** input of cell descriptors: configuration speaks in counts. (The
  *internal* model is permitted to be cell-shaped — see D5 — but nothing consumes descriptors.)
- No per-cell differences of any kind: every cell renders the same fixed Lorem text.
- No built-in footer data (git branch, statuses, model, context usage), no alignment, per-gap
  spacing, or truncation priority beyond what D7 fixes.
- No build step, no new dependency, no second entry, no settings-namespace reading.

## Decisions

### D1 — Configuration source and its trust boundary

The extension owns its configuration surface as a **file**, `pi-jefferson.json`, read in two
places and resolved with document-level precedence:

- agent directory: `<getAgentDir()>/pi-jefferson.json`
- project-local: `<ctx.cwd>/<CONFIG_DIR_NAME>/pi-jefferson.json`, read **only when
  `ctx.isProjectTrusted()` returns true**.

The project-local document, when trusted and present, overrides the agent-directory document
whole; otherwise the agent-directory document is used; otherwise configuration is absent.
Document-level precedence is deliberate — merging row lists positionally has no defensible
meaning.

Rationale: `research-chidi.md` Finding 1 — the documented per-extension pattern is an
extension-owned file under `CONFIG_DIR_NAME` gated by `isProjectTrusted()`; a `settings.json`
namespace is an undocumented convention the runtime merely tolerates. The entry performs the
runtime imports (`getAgentDir`, `CONFIG_DIR_NAME`) and passes the two resolved paths and the
trust decision into the configuration reader as data.

**Requirement owed to implementation:** reading the project-local file MUST be gated on
`ctx.isProjectTrusted()`; an untrusted project's project-local file is ignored and the
agent-directory document stands.

### D2 — Row envelope shape

The configuration object carries either row fields at its top level, meaning exactly one row, or
a list of row objects under the key `rows`, meaning one row per entry in order. There is no
top-level-array shape.

- `{ "containers": 4 }` → one row.
- `{ "rows": [ {}, {} ] }` → two rows.
- `{ "containers": 4, "rows": [ ... ] }` → **both shapes at once**, rejected.

Rationale: the owner's rule is "a list of row objects… if they just put that at the top level of
the object then a single row is implied." Putting the list under a key is what makes the
"both shapes at once" case structurally detectable and gives the spec's rejection scenario a
concrete trigger; a bare top-level array could never also carry row fields.

### D3 — Fallback: the default row

`containers` defaults to 8, so an absent configuration is one row of eight containers. The
fallback for **absent**, **empty**, and **rejected** configuration is the same observable
behavior: **install the default row** — one row, eight containers, Lorem cells — as the footer.

- absent (no file): default row.
- empty (`{}`, or `{ "rows": [] }`): default row. (`{}` is a row object with no fields, so it is
  itself one row of eight.)
- rejected (D2 both-shapes, D4 invalid count, D6 duplicate id, or any other parse failure):
  the default row renders and **none of the rejected document is rendered**.

For a rejected document the extension additionally reports a warning through the host
(`ctx.ui.notify`), because the user wrote something the extension refused; absent and empty
configuration warn nothing. The warning is diagnostic only — the rendered result is the same
default row.

Rationale: the owner's rules make absent configuration a valid one-row-of-eight configuration,
so "none of it is rendered" can only mean "none of the rejected document is rendered," and the
default row is what remains. An empty footer or an untouched built-in footer would both make a
declared-but-malformed configuration silently look like normal operation and violate the
defaults the owner set.

### D4 — The ceiling clamps

A declared `containers` value **greater than 8 clamps to 8**; the row renders 8 cells and the
configuration is accepted. The default is 8. Rejected, not clamped: a value below 1 (zero or
negative), and any value that is not an integer (including a non-number, a string, or a cell
descriptor array).

Rationale: the ceiling is a resource cap — a request for "more than the maximum" saturates to
the maximum and is honored. A value below 1 or a non-count is not a cell count at all, so there
is nothing to honor and the document is rejected. The advisors' suggestion that the ceiling
should reject was considered and declined by the owner: "greater than 8 equals 8."

### D5 — The cell seam: internal model is cell-shaped, configuration is counts-only

"Configuration speaks in counts and never in cells" is scoped to the **configuration surface
only**. The normalized row model the configuration reader produces represents each row's cells
as a list of cell descriptors, each currently carrying only the fixed Lorem text. The parser
accepts only an integer count for `containers` in this change — a descriptor array is a
non-integer and is rejected (D4).

Rationale: the seam is what lets a later change accept descriptors as configuration, or add
per-cell content, as an **addition** to the parser and the renderer rather than a rewrite of the
model. It is permitted, not built: no public API and no accepted configuration shape exposes
descriptors yet.

### D6 — Deterministic row identifiers

A row may declare `id`. A row that declares none is given a synthesized identifier derived from
its zero-based declaration index (`row-<index>`), which is deterministic across reloads and
sessions. After synthesis, all identifiers in the configuration must be unique; a collision
(explicit with explicit, or explicit with synthesized, e.g. a user id `row-1` against the second
row) rejects the document (D3: default row).

Rationale: a random or time-based scheme would satisfy the spec's letter while destroying
content-addressing across reloads. Index-based synthesis is stable and reproducible. Collisions
are rejected rather than silently disambiguated so an id always means one row.

### D7 — Geometry: explicit `floor(W / N)`, remainder at the right edge

For a row of N cells rendered at width W with inter-cell gap `g`, each cell occupies
`floor((W - (N - 1) * g) / N)` columns and the leftover columns stay unallocated at the row's
right edge. **This change fixes `g = 0`**, so the formula reduces to `floor(W / N)`. Widths are
computed inside `render(width)`; no cell keeps a width from a previous frame. The composed line
is padded to the full width W.

Rationale: the stack allocator cannot divide the row equally (Context ground truth), so the
renderer computes cell widths itself. Stating the remainder as the `g = 0` case of the gap
formula means a later per-gap-spacing change **extends** this requirement instead of conflicting
with it.

### D8 — Module layout and injected host helpers

- `extensions/jefferson.ts` (entry, existing): gains the runtime imports of
  `@earendil-works/pi-coding-agent` (`getAgentDir`, `CONFIG_DIR_NAME`, and the `ExtensionAPI`
  type already there) and `@earendil-works/pi-tui` (`truncateToWidth`, `visibleWidth`). It
  resolves the config paths and the trust decision, injects the two width helpers into the
  renderer, builds the footer component, and calls `ctx.ui.setFooter` (D9). It is still the only
  module with a runtime host import.
- `extensions/jefferson/configuration.ts` (new): owns the configuration surface — resolves the
  two paths it is handed, reads and parses the document, normalizes it (D2), applies defaults and
  the ceiling (D3, D4), synthesizes ids (D6), and yields the cell-shaped row model (D5). No
  runtime host import; `import type` only; erasable syntax.
- `extensions/jefferson/row-renderer.ts` (new): owns rendering a normalized row into one footer
  line — divides the width (D7), truncates and pads each cell using the injected helpers, returns
  one string. No runtime host import; `import type` only; erasable syntax.
- `tests/configuration.test.ts`, `tests/row-renderer.test.ts` (new): import both modules by
  relative path.

Module names name the behavior or data they own (layout requirement 7). The directory is the
established one the spec describes; no manifest, `tsconfig`, or CI edit is needed.

### D9 — Footer lifecycle: TUI-guarded, re-installed on `session_start`

The entry installs the footer only when `ctx.mode === "tui"`. Outside TUI mode it does not call
`setFooter` and loading does not fail. In TUI mode it installs the footer both at load and on
every `session_start` event, so `/reload` and session replacement (which clear the custom footer)
re-register it.

Rationale: `research-chidi.md` Findings 2 and 5 — `setFooter` is a no-op in RPC mode and the
documented guard is `ctx.mode === "tui"`; reload resets extension UI and the footer slot, so
without a `session_start` hook the footer would disappear after `/reload`. Re-installing reads
the configuration again, which is how a configuration change reaches the footer.

### D10 — Cells truncate and pad themselves

Each cell renders exactly one line. The renderer truncates the Lorem text to the cell's column
width with `truncateToWidth` and pads it to that width with `visibleWidth`, so the row's height
is always one line regardless of content and the total width is preserved. `Text` and `HStack`
compositing are not relied on for this: `Text` wraps over-wide content into extra lines and
defaults to `paddingX = 1, paddingY = 1`, and `HStack` clips silently with no ellipsis — either
would break the one-line-per-row contract.

## Risks / Trade-offs

- **[The stack allocator temptation returns]** A contributor "simplifying" the renderer back to
  `HStack` with `grow: 1` reintroduces the 66/34 skew. → D7 and the Context ground truth state
  the measured behavior; the row-renderer test asserts `floor(W / N)` at widths that do not
  divide evenly (e.g. N=3, W=100 → 33/33/33 with one blank column).
- **[Lean argument edges: ANSI and wide glyphs]** Truncation and padding correctness depends on
  using the injected helpers, not string length. → D8 injects both; D10 mandates them; tests can
  exercise a wide/emoji cell once content is non-ASCII (deferred, see Open Questions).
- **[Id-synthesis collisions]** Index-based ids can collide with a user's explicit id. → D6
  rejects the document (default row renders) rather than silently disambiguating; the failure is
  a warning the user can see.
- **[Trust gating read path]** Reading a project-local file before trust resolves would honor
  untrusted configuration. → D1 gates the project-local read on `isProjectTrusted()` and falls
  back to the agent-directory document.
- **[Config read timing vs live edits]** The extension reads configuration at load and on
  `session_start`, not per render, so an edit to `pi-jefferson.json` needs `/reload` to appear.
  → Acceptable for a skeleton and consistent with the platform (no settings-change event exists);
  documented here so it is not a surprise.
- **[Agent-dir API]** `getAgentDir()` is a runtime export of the pinned host; if a future host
  removes it the entry's import breaks. → It is the documented mechanism in the pinned 1.4.0
  types; the failure is at load, loud and immediate, not silent.
- **[Default-row fallback can mask a typo]** A rejected document renders the default row and only
  warns. → Deliberate per D3; the warning is the signal, and the alternative (blank footer or
  host crash) is worse.

## Migration Plan

- Deployment: an ordinary module added under the established load root. `package.json` (`files`,
  `pi.extensions`), `tsconfig.json` (`include`), and `.github/workflows/ci.yml` are untouched.
  No new dependency, no build step, no data migration. On merge to `main` the release workflow
  ships it as a normal patch.
- Rollback: revert the commit. No persisted state, no config the extension writes, no migration
  to undo. Users who created `pi-jefferson.json` simply lose the custom footer and get the
  built-in one back.

## Open Questions

- **Exact Lorem text and its width.** The design fixes only that every cell carries the same
  fixed constant and truncates to its cell; the literal string is a task detail and does not
  change the specs or the approach.
- **Cell padding side.** D10 pads to the cell width; whether padding sits left or right is a
  cosmetic task detail, not a contract. Left-aligned (right-padded) is the default.
- **Descriptor acceptance and per-gap spacing.** Both are explicitly out of scope and are the
  additions D5 and D7 are shaped to accept; neither changes this change's specs.
