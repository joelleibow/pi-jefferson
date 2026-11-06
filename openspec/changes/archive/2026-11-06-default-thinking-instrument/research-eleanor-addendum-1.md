# Eleanor addendum 1 — bounded answers for design.md (Bambadjan's questions)

Re-read at HEAD (`152cfe3`, branch `worktree/calm-forest-5599`), all citations from
`extensions/jefferson/format.ts`. No code, specs, proposal, design, or tests edited; no design
recommendation.

## 1. The undefined-variable guard in `resolveFormat` — answer: (b), every declared variable

`resolveFormat` opens with:

```ts
for (const [name, resolve] of Object.entries(declaration.variables)) {
  const value = resolve(readings);
  if (value === undefined) return "";
  values.set(name, collapse(value));
}
```

It iterates `declaration.variables` — **all variables the declaration declares**, not only those
the format string references — and returns `""` on the first `undefined`. Implication for
`thinking`: with a configured `format: ""` (or any format with no `$level`), an unknown
`thinkingLevel` still empties the whole render, because `level: r => r.thinkingLevel` is declared
and `undefined` short-circuits before segments are even mapped. A format that omits `$level` does
not shield the cell from an unknown level.

## 2. `FormatSegment` shape and per-segment styling

`FormatSegment` is the union:

```ts
export type FormatSegment =
  | { kind: "literal"; text: string }
  | { kind: "variable"; name: string }
  | { kind: "bar" };
```

`parseFormat` builds it: literal runs are accumulated and `flush()`ed as `{kind:"literal"}` after
`collapse()`; `\$` is a literal dollar; `$name` becomes `{kind:"variable", name}` after checking
`Object.hasOwn(declaration.variables, name)` (or `declaration.bar !== undefined` for `$bar`,
with a second `$bar` rejected); name matching is `/^[A-Za-z0-9_]+/`.

Styling is **per segment, not one wrap around the whole string**. `resolveFormat` ends with:

```ts
return segments.map((segment, index) => segment.kind === "bar" ? bar : styledPiece(pieces[index]!, style, theme)).join("");
```

and `styledPiece(text, style, theme)` returns `text` unchanged when `text === ""` or
`Object.keys(style).length === 0`, otherwise `theme.style(text, style)` — so each non-empty
literal/variable segment gets its own `theme.style` call with the instrument's `style`.

## 3. `$bar` width

Yes — computed inside `resolveFormat` as cell width minus the other segments' visible width:

```ts
const nonBar = pieces.reduce((sum, piece) => sum + visibleWidth(piece), 0);
const barWidth = Math.max(0, width - nonBar);
```

(`pieces` maps `bar` segments to `""`, so they contribute 0.) Fill is
`percent === null ? 0 : Math.min(barWidth, Math.floor((percent / 100) * barWidth))`, drawn as
`"█".repeat(filled)` styled with `filledStyle` (fg `error` above `ERROR_PERCENT = 90`, `warning`
above `WARNING_PERCENT = 70`) plus `"░".repeat(barWidth - filled)` in `{...style, dim: true}`.
