# Design

## Context

Motivation lives in `proposal.md`; the requirements this design satisfies live in `specs/statusline/spec.md`.
This section holds only the current state the mechanism has to fit. Code facts are from `research-eleanor.md`
and `research-eleanor-addendum-1.md` (both read at `152cfe3`), corrected where `research-eleanor-addendum-2.md`
read `v0.5.0`; host facts are from `research-chidi.md` and `research-chidi-addendum-1.md`.

- One declaration per instrument carries `name`, `variables`, optional `bar`, `defaultFormat` and `options`;
  `FOUNDATIONAL_OPTIONS` is `["format","style"]` and every declaration shares it (`research-eleanor.md` §2, §3.1).
- `readInstruments()` rejects any option key the declaration lacks, validates `format` as a string and
  parses it, and validates `style` (`research-eleanor.md` §2, §3.1).
- `instrumentBindings()` builds each bound `Instrument` from the parsed `segments`; its `render` calls
  `resolveFormat(declaration, segments, style, readings, width, theme)` (`research-eleanor.md` §3.1, §4).
- `resolveFormat(declaration, segments, style, readings, width, theme)` first walks **every variable the
  declaration declares** and returns `""` on the first `undefined`, whether or not the format references it.
  It then styles **each non-empty, non-bar segment separately** with one `styledPiece` call, which at `v0.5.0`
  is `theme.style(text, mergedStyle(style, segment.modifiers))` (a bare `style` at `152cfe3`). It computes
  `$bar` as `max(0, width - nonBar)`, `nonBar` being the visible width of the other pieces
  (`research-eleanor-addendum-1.md` §1–§3; `research-eleanor-addendum-2.md` §3).
- `FormatSegment` is `literal | variable | bar`. At `v0.5.0` the literal and variable variants carry
  `modifiers: readonly Modifier[]`, and `$level|capitalize` is one variable segment,
  `{ kind: "variable", name: "level", modifiers: [{ mutate: upperFirst }] }`, which keeps `name`
  (`research-eleanor-addendum-2.md` §1, §6). `parseFormat` reads `$name` with `/^[A-Za-z0-9_]+/`.
- `collapse` is `text.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")`, applied to literal runs in `parseFormat`
  and to every declared variable's value in `resolveFormat` (`research-eleanor-addendum-2.md` §2). A label
  enters through neither path, and `v0.5.0` tests the one-line property for literals and values only.
- Pi has seven levels, `off` through `max`. Its input-box rule takes `theme.getThinkingBorderColor(level)`,
  which is `theme.fg("thinkingX", text)` and so carries a foreground only. The seven `thinking*` tokens are
  documented foreground tokens, and `thinkingMax` falls back to `thinkingXhigh` in a theme that omits it
  (`research-chidi.md` Q3, Q4; `research-eleanor.md` §3.3). Both surfaces exist in every published release,
  `0.81.0` through `1.5.0` (`research-chidi-addendum-1.md` §1–§4).
- `tests/fake-theme.ts` is slot-aware but knows only the tokens `accent`, `warning`, `error` (fg) and
  `selectedBg` (bg) (`research-eleanor.md` §2, §5).
- **The code that gets changed is `v0.5.0`, not `152cfe3`.** String modifiers are merged on `main` and released
  as tag `v0.5.0` (`owner-rulings.md`, "Sequencing"; `council.md`, "Owner Decisions Required"). Among
  sources, `v0.4.0..v0.5.0` changed only `extensions/jefferson/format.ts`. `FOUNDATIONAL_OPTIONS`,
  `InstrumentDeclaration` (still no `defaultLabel` or `variableFg`), `readInstruments`, `instrumentBindings`,
  `collapse` and `tests/fake-theme.ts` (still without the `thinking*` tokens) are unchanged
  (`research-eleanor-addendum-2.md` §4–§6). `resolveFormat`'s signature, its guard and the `$bar` arithmetic
  are unchanged too.

## Goals / Non-Goals

**Goals:**

- Every instrument accepts a `label`, rendered in front of its format, configured or default.
- `thinking` defaults to label `Thinking: ` and format `$level|capitalize`.
- `$level` takes pi's per-level thinking color against the live render-time theme, keeping the instrument's
  other style attributes.
- Unknown data still renders the whole cell as nothing.

**Non-Goals:**

- No `$label` variable and no `$` handling inside a label (`owner-rulings.md`, "Label option").
- No string-modifier syntax, parsing or tests. `$level|capitalize` is assumed functional from `v0.5.0`
  (`owner-rulings.md`, "Default composition").
- No default label for any instrument but `thinking`.
- No call to `Theme.getThinkingBorderColor` as the styler.
- No compatibility floor in package metadata, and no change to `package.json`.
- No merge of `v0.5.0` here: this worktree stays at `152cfe3`.

## Decisions

### D1. `label` is a foundational option; a default label sits beside the default format

`FOUNDATIONAL_OPTIONS` becomes `["format","style","label"]`, so all declarations accept it at once.
`InstrumentDeclaration` gains an optional `defaultLabel` beside `defaultFormat`. Only `thinking` declares one,
`"Thinking: "`, and its `defaultFormat` becomes `$level|capitalize`: the `thinking: ` literal leaves the
format and becomes the label (`owner-rulings.md`, "Default composition", "Label option").

`readInstruments` validates `label` as a string, as it does `format`, and rejects the document naming the
instrument and the option otherwise. `ConfiguredInstrument` in `configuration.ts` gains `label?: string`, set
only when the document configures one. `instrumentBindings` resolves the label once per binding (D3):
configured `label`, else `declaration.defaultLabel`, else `""`. A configured label replaces the default
(`council.md`, "Synthesis"), and `""` is a legal label that removes it.

The exact shapes, added to `InstrumentDeclaration` in `instrument.ts`:

```ts
readonly defaultLabel?: string;
readonly variableFg?: Readonly<Record<string, (value: string) => ThemeColor | undefined>>;
```

`variableFg` is D5's. The value it receives is the one `variables` already resolved, so the level is read in
one place, `thinking.variables.level`.

*Beat:* a per-declaration `label` option (every declaration restating it, against the spec's "added for all
instruments"); a label stored in `defaultFormat` (it would be a variable-adjacent literal Joel ruled out).

### D2. The label is raw literal text, collapsed once where its segment is made

The label does not go through `parseFormat`, so `$level` or `\$` inside a label are the characters they are,
and no `$label` variable is declared. A `$label` in a format fails as any undeclared variable does, through
the existing rejection (`specs/statusline/spec.md`, "The label is not a variable").

The label is a new input path, so it is collapsed explicitly: `configuration.ts` calls the existing `collapse`
once on the resolved label, at the moment it builds the label's literal segment (D3). `collapse` is exported
from `format.ts` for that use; its control-character rule is not copied. Every control character, newline
included, becomes one space (`research-eleanor-addendum-2.md` §2), so a label stays on one line. Because
`v0.5.0` does not test labels, D8 carries a test that fails if this call is removed.

*Beat:* parsing the label as a format (rejected by both advisors and by `owner-rulings.md`, "Label option":
people would put variables in it); collapsing it inside `resolveFormat` on every render (the work would repeat
for a value that cannot change between renders).

### D3. C2: the label is a leading literal segment, built in `configuration.ts`

`resolveFormat` is unchanged: same six parameters, same call site. In `instrumentBindings`, wherever the
bound instrument takes its segments, the label is resolved and prepended as one literal segment:

```ts
const label = collapse(configured.label ?? declaration.defaultLabel ?? "");
const withLabel = label === "" ? segments : [{ kind: "literal", text: label, modifiers: [] }, ...segments];
// render: (readings, width, renderTheme) =>
//   resolveFormat(declaration, withLabel, style, readings, width, renderTheme)
```

The segment shape is `v0.5.0`'s literal variant (`research-eleanor-addendum-2.md` §1, §6). The guard,
the styling and the `$bar` arithmetic then treat the label as a literal like any other. The cases:

| Case | Renders |
| --- | --- |
| A declared datum is unknown (any format, including `""`) | `""`: the guard returns before any segment is styled |
| Datum known, format non-empty | label, then the format's text |
| Datum known, configured `format: ""` | the label alone |
| Datum known, `format: ""` and an empty label | `""` |

The first row is not new: the guard reads every declared variable, so a format with no `$level` does not shield
`thinking` from an unknown level (`research-eleanor-addendum-1.md` §1). That is what makes "unknown" and
"intentionally empty" different inputs.

*Beat:* **Kimi's binding-output seam** (prepend after `resolveFormat` returns non-empty; `council.md`,
"Perspectives"). It tests the guard's *output* as a proxy for the guard: a known level with `format: ""` and
an unknown level both return `""`, so it cannot tell them apart, a label-only cell
(`label: "🤔", format: ""`) is impossible, and it styles the label in a second place. **Argon's raw-label
parameter** (a `label` argument into `resolveFormat`, prepended after the guard; the council's leaning).
It gets the same cases right but changes `resolveFormat`'s contract and every call site, and puts a second
piece of label handling inside the format language. Michael's PL4 review named the literal segment as the
simpler route. It wins because it keeps one guard and one styling path, the label's width reaches `$bar`
without any code of its own, `resolveFormat`'s signature does not move, and there is no second styling site.

Consequence: `$bar` shrinks by the label's visible width, because the label is one of the pieces the
`nonBar` sum counts (`research-eleanor-addendum-1.md` §3). That follows from the living requirement that
`$bar` takes "the columns the rest of the format leaves in the cell"; the delta pins it in "The label takes
width from a bar".

### D4. The label inherits the instrument's `style`

Because the label is a literal segment (D3), it is styled with the instrument's configured `style` through the
same `styledPiece` path as any literal (`research-eleanor-addendum-1.md` §2). No separate label style exists.
`council.md` records the same conclusion, from the existing per-literal styling of formats.

### D5. `$level` is styled by a declared token, not by `getThinkingBorderColor`

`variableFg` (D1) maps a variable's value to the foreground token it takes, or `undefined`. `thinking`
declares one for `level`: the seven reportable levels map to `thinkingOff`, `thinkingMinimal`, `thinkingLow`,
`thinkingMedium`, `thinkingHigh`, `thinkingXhigh`, `thinkingMax` (`research-eleanor.md` §3.3). In
`resolveFormat`, the guard loop already holds each declared variable's resolved, collapsed value; for a variable
segment whose declaration has a `variableFg` entry, `resolveFormat` calls it with that value **before any
modifier mutates it**, and styles the segment as
`theme.style(text, { ...mergedStyle(style, segment.modifiers), fg: token })` against the theme passed to that
render. The token is spread last, so it wins over any `fg`. `styledPiece`'s early return on an empty `style`
must not skip it, since the token is the style. Consequences, each pinned by a test (D8):

- The token replaces a configured `fg` on `$level` only. A configured `bg` and the booleans survive. Literal
  text beside `$level`, and the label, keep the instrument's own `fg`.
- The token is resolved inside `render`, each call, from the theme passed in. No themed string is stored, so
  the existing invalidate-and-rebuild rule for themes holds (`research-chidi.md` Q4, citing S11;
  `specs/statusline/spec.md`, "An instrument's style is pi's ThemeStyle").
- A level string outside the seven (a future host value) is known, so the cell renders, and `variableFg`
  returns `undefined`, so `$level` keeps the instrument's own style. This follows the guard in D3 (unknown is
  `undefined`, nothing else) and invents no color the host did not name.
- The token follows the value before mutation, keyed on the segment's retained `name: "level"`, so
  `$level|capitalize` renders `High` in the `high` color, like a bare `$level` and not as an unrecognized
  `High` (`research-eleanor-addendum-2.md` §1, §6). `capitalize` adds no style, and the token is spread after
  whatever a modifier merges.

*Beat:* **`Theme.getThinkingBorderColor(level)` as the sole styler** (Kimi, Pass 1; rejected in `council.md`).
It returns `theme.fg("thinkingX", text)`, which sets a foreground only: configured `bg` and attributes on
`$level` would be dropped. It is also undocumented in prose (`research-chidi.md` Gap 1). The token route
resolves the same token against the same live theme, so the color matches the input-box rule
(`research-chidi.md` Q3, Q4); this design takes the documented route. **A color rule in `format.ts` keyed on
the name `level`:** the format language would then know an instrument. The `$bar` precedent is a variable the
declaration owns (`bar` on the declaration), and `variableFg` follows it.

### D6. No compatibility floor in package metadata

Both the method and all seven tokens are in every published pi release, `0.81.0` through `1.5.0`
(`research-chidi-addendum-1.md` §3–§4), and the design uses the tokens. The peer range stays `*` (ADR 0001, per
`research-eleanor.md` §1) and the `^1.4.0` devDependency is unchanged. A floor would assert a constraint the
evidence says does not exist. Reversal costs one metadata line if a pi release ever drops a token.

### D7. Implementation starts from a checkout containing `v0.5.0`

Remote `main` and tag `v0.5.0` both resolve to `e593968311946be0d762ecb1fed0a545f5eac11b`, and npm lists
`pi-jefferson@0.5.0` (`council.md`, "Owner Decisions Required"; `research-eleanor-addendum-2.md`, header).
`origin/main` has been fetched; this worktree is still at `152cfe3`, and no merge has been performed here.
Before editing, implementation must fast-forward this worktree to `v0.5.0`. The default format
`$level|capitalize` depends on it, and this change does not ship a temporary `$level` default, which would
change the default text twice (`council.md`, "Accepted & Rejected Feedback").

### D8. What the tests have to be able to fail

The tests are the guard for the choices above. Each names an input where the right and wrong implementations
differ; modifier behavior has no test here (`owner-rulings.md`, "Default composition").

| Behavior | Input that separates right from wrong |
| --- | --- |
| Unknown suppresses the label | `thinkingLevel: undefined`, label `"Thinking: "`, format `$level`, then format `""`: both `""` |
| Empty format is not unknown | `thinkingLevel: "high"`, `label: "🤔"`, `format: ""`: renders `🤔` (fails under the binding seam) |
| Label in front, default and configured | default `thinking`; `model` with `label` and a configured format |
| Label is literal | `label: "$level"` renders `$level`; `$label` in a format rejects the document |
| Non-string label | `label: 3` rejects the document, warning names instrument and option |
| `bar` loses the label's width | the input of the spec scenario "The label takes width from a bar", unrestated here; fails if the label's width is not counted |
| Label stays on one line | `label: "A\nB\u0085C "`, format `$level`, level `high`: renders `A B C high` with no `\n`; fails if the label's `collapse` call is removed |
| Token keys on the unmutated level | `format: "$level|capitalize"`, level `high`: renders `High` in `thinkingHigh` (fails if the token is looked up from `High`) |
| Label styled with the instrument | `style: {"fg":"accent"}` styles the label too |
| Level color per level | all seven levels, each asserting a distinct token (fails if one token is hard-coded) |
| Configured `fg` loses on `$level` | `style: {"fg":"accent"}`, level `high`: the segment's fg is `thinkingHigh`, not `accent` |
| `bg` and attributes survive | `style: {"bg":"selectedBg","bold":true}` plus a level: bg and bold kept, fg is the token (fails under `getThinkingBorderColor`) |
| Only `$level` is recolored | `style: {"fg":"accent"}`, format `[$level]`: the brackets keep `accent` |
| Theme change | two themes with different values for one token: the second render uses the second |
| Level outside the seven | `thinkingLevel: "ultra"`: renders, with the instrument's own style |

`tests/fake-theme.ts` needs the seven tokens as foreground slots. Its `getFgAnsi` throws on an unknown token, so
a token typo fails a test rather than hiding.

## Risks / Trade-offs

- **[Breaking default text and a surprise label]** `thinking: high` becomes `Thinking: High`. Anyone with a
  configured `thinking` format and no `label` now gets `Thinking: ` in front of it, because the default label
  applies whenever none is configured (D1). → Set `label: ""`. The README row and option prose are for the
  docs pass, not a task here.
- **[Cited line positions]** Facts cited at `152cfe3` were re-read at `v0.5.0` for every symbol this design
  names (`research-eleanor-addendum-2.md` §6). → The decisions state behavior (guard before any styling,
  per-segment styling), not positions.
- **[`theme.style` throws on a token missing from a theme]** The token route trusts pi's theme schema, which
  requires `thinkingOff`…`thinkingXhigh` and lets `thinkingMax` fall back (`research-chidi.md` Q3, S5/S6;
  `research-chidi-addendum-1.md` §2). → No guard is added: a theme without those tokens is invalid to pi
  itself. The fake theme throws on an unknown token to keep the tests honest.
- **[Token and rule drift]** If pi ever recolors its input-box rule by something other than these tokens,
  `$level` would stop matching it. → Accepted; the rulings ask for pi's own color and the tokens are pi's
  documented route (`research-chidi.md` Q4).
- **[A width cost]** The label spends columns in a narrow cell and gets clipped with the rest
  (`research-eleanor.md` §4, the cell's `truncateToWidth`). → Left to the user's label; no truncation rule is
  added.
- **[Observability]** Rendering logs nothing today and this adds no log. A rejected `label` surfaces through
  the existing document-rejection warning, which names the instrument and option.

## Migration Plan

1. Fast-forward this worktree to `v0.5.0` (D7).
2. Land the change in one release. There is no stored data and no flag.
3. Rollback is a revert of the change: configurations carrying a `label` would then be rejected as an unknown
   option, with the default row and a warning (`specs/statusline/spec.md`, "An option the instrument does not
   declare").

## Open Questions

None.
