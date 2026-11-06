# Eleanor addendum 2 — v0.5.0 format language and the one-line guard

Read at `origin/main` = `v0.5.0` = `e593968311946be0d762ecb1fed0a545f5eac11b` via `git show v0.5.0:<path>`;
HEAD `152cfe3` not used for source facts. No code/spec/design/test/metadata edits; no recommendation; no verdict.

## 1. `$level|capitalize` segment shape (`extensions/jefferson/format.ts`)

`parseFormat` pushes `{ kind: "variable", name: "level", modifiers: [] }` for `$level`, then the `|`
branch maps `capitalize` to `{ mutate: upperFirst }` in `MODIFIERS` and rewrites the last segment to
`{ ...subject, modifiers: [...subject.modifiers, modifier] }`. `$level|capitalize` is one segment —
`{ kind: "variable", name: "level", modifiers: [{ mutate: upperFirst }] }` — so yes, it retains
`name: "level"`. In `resolveFormat`, `pieces` applies only `mutate` modifiers ("high" → "High";
`tests/format.test.ts`, "capitalize upper-cases the first letter…"), and styling is
`styledPiece(piece, mergedStyle(style, segment.modifiers), theme)`: one `theme.style` call with the
instrument's `style`. `capitalize` adds no style; no per-variable fg hook exists at `v0.5.0`.

## 2. `collapse` and the newline open question

`collapse` in `format.ts` is `text.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")`, applied to literal
runs in `parseFormat` (`flush()`, the modifier-run split) and to every declared variable's value in
`resolveFormat` (`values.set(name, collapse(value))`). `\n`, `\r`, `\t` all fall in `\u0000-\u001F`, each
becoming one space, so a label on the same collapse path as literals stays on one line — a newline
cannot break the row. Open question: the guarantee is already tested at `v0.5.0` for literals and
values (`tests/format.test.ts`: "control characters collapse per character…"; "…three clipped footer
rows at one line each", `line.includes("\n") === false`). The label takes the same `collapse` call,
so no newline test is needed for the property itself.

## 3. `resolveFormat` guard, per-segment style, `$bar` in v0.5.0

Guard unchanged: still walks all `declaration.variables`, `return ""` on the first `undefined`.
Per-segment `theme.style` retained — one `styledPiece` per non-bar segment, now with
`mergedStyle(style, segment.modifiers)` instead of bare `style`. `$bar` unchanged:
`Math.max(0, width - nonBar)` over the mutated `pieces`. Signature unchanged, same parameter order
`resolveFormat(declaration, segments, style, readings, width, theme)`; no new parameters. v0.5.0's
type-level changes: `FormatSegment` literal/variable variants gain `modifiers: readonly Modifier[]`;
new `Modifier`, `StyleAttribute`, `MODIFIERS`, `mergedStyle`, `formatError`; `parseFormat` gains the
`|` branch, `afterName`, the `\|` escape.

## 4. Options surface

Yes and yes. `FOUNDATIONAL_OPTIONS = Object.freeze(["format", "style"] as const)` still lives in
`extensions/jefferson/instrument.ts` (unchanged in `v0.4.0..v0.5.0`), and `readInstruments` in
`extensions/jefferson/configuration.ts` still rejects any configured key not in the declaration:
`if (!declaration.options.includes(key)) throw new RejectedConfiguration(…)`. `configuration.ts` is
unchanged at `v0.5.0`.

## 5. Theme seam and `tests/fake-theme.ts`

Yes — `instrumentBindings` still emits
`render: (readings, width, renderTheme) => resolveFormat(declaration, segments, style, readings, width, renderTheme)`,
so the live theme from `cell.instrument.render(current, cellWidth, theme)` in
`extensions/jefferson/row-renderer.ts` (captured from the host's `setFooter((tui, theme) => …)`)
reaches `resolveFormat` as its last parameter. `tests/fake-theme.ts` is unchanged at `v0.5.0` (empty
`v0.4.0..v0.5.0` diff) and still lacks the seven `thinking*` foreground tokens — foregrounds hold only
`accent`, `warning`, `error`; `getFgAnsi` throws on an unknown token. Design D8's fake-theme gap
remains open at `v0.5.0`.

## 6. design.md symbols changed in v0.5.0

`v0.4.0..v0.5.0` changes only `extensions/jefferson/format.ts` among sources. Symbols design.md names
that changed enough to amend design: `FormatSegment` (literal/variable now carry `modifiers`);
`parseFormat` (new `|` branch with `afterName`, `formatError`, literal-run splitting, `\|` escape,
modifier-on-`$bar` rejection; a chain extends the same segment; the `$name` regex `/^[A-Za-z0-9_]+/`
is unchanged); `resolveFormat` internals (mutate pass; final style argument
`mergedStyle(style, segment.modifiers)`), so the Context bullet "one `theme.style(text, style)` call
per segment" now reads `theme.style(text, mergedStyle(…))` — signature, guard, and
`max(0, width - nonBar)` did not change. New symbols design.md does not name: `Modifier`,
`StyleAttribute`, `MODIFIERS`, `mergedStyle`, `formatError`. Unchanged as named: `FOUNDATIONAL_OPTIONS`,
`InstrumentDeclaration` (still no `defaultLabel`/`variableFg`), `readInstruments`,
`instrumentBindings`, `collapse`, the guard, `$bar` math, `tests/fake-theme.ts`. D5's confirmation:
the variable segment retains `name`, so `variableFg` keyed on it remains implementable.
