# Design

## Context

Motivation is in `proposal.md`; the settled disputes and accepted corrections are in `council.md`;
the binding rulings are in `owner-rulings.md`. This section records only the state the approach must
fit and the host facts it rests on. Citations `chidi §n` / `chidi Gaps n` are to
`research-chidi.md`; `addendum 1 (Qn)` / `addendum 2 (Qn)` are to the two Chidi addenda recorded in
`council.md`'s evidence inputs; `eleanor §n` is to `research-eleanor.md`. Addendum 2 establishes
that `stack.js`, `h-stack.js`, the built-in `footer.js` and `colors.js` are byte-identical between
the repository's resolved 1.4.0 and the global 1.5.0, so every host fact below holds at the pinned
version Michael checks against.

**Current state**, read at `9a44767`:

- `extensions/jefferson.ts` — seeds the store with `{ provider, model, thinkingLevel }` from the
  `session_start` context, takes exactly two subscriptions (`model_select`, `thinking_level_select`),
  reads configuration with `readConfiguration({ agentPath, projectPath, projectTrusted })`, calls
  `createFooter(rows, () => store.sample())` **outside** the footer factory, and installs with
  `ctx.ui.setFooter((tui) => …)` using only the factory's `tui` argument. One `release` tears down
  both subscriptions and the store; `releasePrevious` runs it before the next install.
- `extensions/jefferson/row-renderer.ts` — `createFooter` rebuilds a `VStack` of row views **per
  render**; `renderRow` builds a **new `HStack` per call** with `basis: floor(W / N)`, `grow: 0`,
  `shrink: 0`, then runs the trailing-remainder pad guard. `cellView` memoizes per `(width)` inside
  a closure that dies with the render. One sample per render, shared by every row (tested).
  `Footer.invalidate()` is a no-op. `RESET` before a trailing pad when `leavesStyleOpen` (trap one),
  `visibleWidth`/`truncateToWidth` for measure and clip (trap two).
- `extensions/jefferson/instrument.ts` — `Instrument` is `render(readings, width): string`;
  `labelled()` builds `model` and `thinking` (`""` when either half is unknown); `SHIPPED` holds the
  three; `instrumentNamed` looks names up; `DEFAULT_CELL_TEXT` is `blank`'s constant.
- `extensions/jefferson/configuration.ts` — whole-document rejection through
  `RejectedConfiguration`; accepted-document notices (`containers`, unknown instrument names);
  trusted project document replaces the agent document whole; cells keep their two-key whitelist
  (`instrument`, `align`); `DEFAULT_CELLS`/`MAX_CELLS` are ten.
- `extensions/jefferson/session-data-store.ts` — three string datums, pushes unwrapped at the
  entry, no import at all, `dispose()` clears the render callback and post-dispose samples are
  all-unknown.
- `tests/jefferson.test.ts` — the harness's fake `ctx` has no `getContextUsage` and no
  `sessionManager`, its `setFooter` fake calls `factory(tui)` with one argument, and an end-to-end
  test pins **exactly two** subscriptions (eleanor §5).

**Constraints that bind the shape.** Erasable TypeScript only, no build step, `.ts` relative
imports. Host packages are `peerDependencies` at `*`; any shipped file may import one, imports run
one way from the entry down, no cycles (ADR 0001; `extension-source-layout`). Tests live under
`tests/`. A new ordinary source file under `extensions/jefferson/` needs no manifest, `tsconfig` or
CI edit, because CI asserts invariants, not a file list (eleanor §7; `extension-source-layout`'s
"Growth is a named change" exempts it). The retired vocabulary does not appear below; where
`extension-source-layout` says "module", this design says "source file".

**Host facts every claim below rests on**, cited per the orchestrator's ruling rather than
re-derived here:

1. The `setFooter` factory is invoked **synchronously inside `setFooter`** and receives
   `(tui, theme, footerData)`; its `theme` argument is the proxy that always resolves to the
   current theme; a theme switch cascades `invalidate()` to the installed footer
   (chidi §2.1, §2.3, §3.2).
2. `Stack.addChild` copies option values into fresh internal entries held behind
   `protected readonly entries`, with no setter; the public surface is exactly `addChild`,
   `removeChild`, `clear`; `HStack.render` re-reads the entries on every call and
   `allocateStackSizes` reads `basis` at call time; the grow pass hands leftover columns to the
   earliest growable entries one at a time (chidi §4.1–4.2; addendum 2 Q1). `basis: floor(W / N)`
   with `grow: 1` on N equal entries therefore spends every column (chidi §4.2).
3. The `LAYOUT_NODE` symbol is not exported from pi-tui's index, and pi-coding-agent's `exports`
   map offers only `.` and `./rpc-entry`, so both a layout-node deep import and a
   `THEME_TOKENS`/`formatTokens`/`createUsageTotals` import are closed routes (addendum 2 Q1, Q3;
   proposal collisions 5).
4. `ctx.getContextUsage(): ContextUsage | undefined` — `undefined` when no limits model applies;
   `{ tokens: null, percent: null, contextWindow }` after a compaction until the next response;
   `percent` is on a 0–100 scale; the host's own footer renders `?/<window>` for the null case and
   colors the percent `warning` above 70 and `error` above 90 (chidi §1.5).
5. `ctx.sessionManager` is a `ReadonlySessionManager` `Pick` including `getSessionId`, `getLeafId`
   and `getEntries`, and **excluding** `getEntryCount`; `getEntries()` copies the whole entry array;
   every append moves the leaf (chidi §1.6, Gaps 1).
6. The host footer's totals scan counts **four categories** over the whole session — `type: "usage"`
   entries, assistant messages, toolResult messages carrying usage, and compaction/branch-summary
   entries carrying usage — accumulating per-field `input`, `output`, `cacheRead`, `cacheWrite` and
   `cost.total`, and **never reads `usage.totalTokens`** (chidi §1.6; addendum 2 Q2).
7. `turn_end` fires once per agent turn, after that turn's messages are persisted, and for nothing
   else: `usage`, compaction and branch-summary appends move the leaf without firing it, and the
   cache warmer's `appendUsage` fires **no extension event at all** (addendum 2 Q2).
8. `theme.style()` resolves a string `fg`/`bg` **only** through its per-slot token maps and throws
   `Error: Unknown theme color: <token>` on an unknown or wrong-slot token; a non-token color must
   arrive as a `Color` object; `getFgAnsi`/`getBgAnsi` are public and throw through the same
   lookup; the `Theme` constructor takes complete per-slot token records, so slot membership is the
   same for every theme (chidi §3.1; addendum 2 Q3).
9. pi-tui's `parseColor(value: string | number)` accepts an indexed number, `#rgb`/`#rrggbb`,
   `oklch(…)`, `okhsl(…)`, and throws `Invalid color value` on anything else (addendum 2 Q3).
10. pi-tui **1.4.0 has no `replaceControlCharacters`**; at 1.5.0 it collapses each *run* of C0/C1
    to one space and is escape-naive — its class covers the ESC byte of an ANSI sequence.
    `stripTerminalSequences` removes ANSI/OSC/APC sequences and preserves bare control characters
    (addendum 1 Q2).
11. `truncateToWidth` inserts a reset before and after its ellipsis and closes an open OSC 8 when
    truncation occurs; `compositeTuiLine` pads every child to its allocated width and frames it
    with `SEGMENT_RESET`; `HStack` renders each child once at full width to measure and again at
    its allocated width, even with explicit `basis` (chidi §4.2–4.3, §5, Gaps 5).
12. pi's root index exports `ContextUsage`, the `SessionEntry` union, `Theme` and the `ThemeStyle`
    type; `THEME_TOKENS` and the `theme` proxy are not exported (addendum 2 Q3). pi-ai's `Usage`
    type reaches this package transitively through pi's own declarations; naming it directly would
    be a manifest change nobody asked for (proposal collision 7).

## Goals / Non-Goals

**Goals:**

- Every requirement of both delta specs has a mechanism below that satisfies it, and the mechanism
  is concrete enough to plan tasks from: files, seams, messages, algorithms, orderings.
- A document that declares none of the new configuration renders the text it renders today, byte
  for byte; only its geometry changes, because the allocator now spends every column.
- Adding an instrument is adding one declaration: no second name table, no edit to the
  configuration reader or the renderer that the new instrument's own shape does not require.
- Nothing style-related can throw at render time: every `style` is validated when its document is
  read, against the live theme.
- The diff stays inside the six source files of the file map (D1), `tests/`, and the docs D13
  names.

**Non-Goals** (all by ruling, `owner-rulings.md` 2026-11-05):

- The git instrument; row-level justify; gaps; proportional widths; a fourth alignment; the
  manifest `description` drift; the parked clickable-cell idea.
- Markdown in any form, Starship's `[text](style)` groups and `(conditional)` groups, and any
  style vocabulary beyond pi's `ThemeStyle`.
- Any new dependency; any use of the retired vocabulary in source, specs or messages.
- Raising the host version floor — decided, not merely excluded (D12).

## Decisions

### D1. The declarations grow inside `instrument.ts`; the format-and-style language is a new `format.ts`

One declaration per instrument lives in `instrument.ts`, beside the seam it renders through — the
declarations **are** the instruments, and `AGENTS.md`'s "Adding an instrument" already points
readers at that file. The format-and-style *language* — grammar, validation, resolution — is a new
source file `extensions/jefferson/format.ts`, named for what it owns.

| File | Owns | What this change does to it |
|---|---|---|
| `extensions/jefferson.ts` | wiring | seeds `cwd`; injects the two store readers; third subscription `turn_end`; hands `ctx.ui.theme` to the configuration reader; moves `createFooter` **inside** the factory to take its `theme` argument |
| `extensions/jefferson/instrument.ts` | the instruments | `Instrument.render` gains `theme`; seven declarations replace the three `labelled` instruments; `instrumentNamed` returns a declaration; `labelled()` retires |
| `extensions/jefferson/format.ts` (new) | the format-and-style language | `parseFormat`, `validateStyle`, `resolveFormat` — grammar, rejections, control-character collapse, `$bar` drawing, per-segment styling |
| `extensions/jefferson/configuration.ts` | the document surface | reads the `instruments` section, validates it against the declarations and the live theme, binds one configured `Instrument` per name |
| `extensions/jefferson/session-data-store.ts` | datums and derivations | `cwd`, `contextUsage`, `totals`; the keyed entry scan; `turnEnded()`; injected readers |
| `extensions/jefferson/row-renderer.ts` | the footer tree and cell geometry | once-built tree; the re-seat route; sample-keyed memo; `renderRow` and the remainder guard retire |

Import edges (all legal under ADR 0001 and `extension-source-layout`, none a cycle):
`format.ts →` pi (`type Theme`, `type ThemeStyle`, `type Color`) and pi-tui (`parseColor`,
`visibleWidth`) and `instrument.ts` (types only); `instrument.ts →` pi (`type Theme`), `node:path`
(`basename`), store (`type Readings`); `configuration.ts → instrument.ts`, `format.ts`;
`row-renderer.ts →` pi-tui (`HStack`, `VStack`, `truncateToWidth`, `visibleWidth`), pi
(`type Theme`), `configuration.ts` and store (types); `session-data-store.ts →` pi
(`type ContextUsage`, `type SessionEntry`, type-only). The store still holds no host handle and
names no host event: the entry injects plain callbacks and unwraps every push (D9, D10), which is
what the entry's "computes nothing" job (`ARCHITECTURE.md`) and the store's existing no-handle
shape require.

- **Reasoning.** Two responsibilities change for different reasons: a declaration changes when an
  instrument is added (the git instrument is already queued), the language changes when the grammar
  or styling mechanics change. One file per responsibility keeps "what would change this?" at one
  answer each, and `format.ts` is an ordinary source file under the declared load root — no
  manifest, `tsconfig` or CI edit (eleanor §7).
- **Alternatives beaten.** A separate declarations file (`instrument-declarations.ts` beside
  `instrument.ts`): splits one responsibility across two files and makes the path *less* inferable.
  The language inside `instrument.ts`: two answers to "what would change this?" in one file, and a
  large grammar hiding the seven declarations it serves. The language inside `configuration.ts`:
  the renderer would import the configuration reader for rendering mechanics, and parse results
  (segments) are rendering inputs, not document-surface facts.
- **Consequence.** The exported-surface test's sweep for contribution-shaped keys extends to
  `format.ts`; `renderRow` leaves the renderer's export list (D8).

### D2. The declaration shape, the moved seam, and one bound instrument per configured name

```ts
// extensions/jefferson/instrument.ts
export interface Instrument {
  render(readings: Readings, width: number, theme: Theme): string;
}

export interface InstrumentDeclaration {
  readonly name: string;
  /** Every $variable a format may name, each resolver handing the value out already formatted. */
  readonly variables: Readonly<Record<string, (readings: Readings) => string | undefined>>;
  /** The percentage (0–100) $bar fills; null is "no estimate". Present exactly where $bar is declared. */
  readonly bar?: (readings: Readings) => number | null;
  readonly defaultFormat: string;
  readonly options: readonly string[];
}
```

All seven declarations carry `options: FOUNDATIONAL_OPTIONS`, one frozen `["format", "style"]`
tuple the file declares once — the owner's "two foundational options", held per declaration
because the delta binds "its options" to the declaration, and a future instrument (git) can declare
its own tuple without a rule change. The seven: `blank` (no variables, no `bar`, default
`DEFAULT_CELL_TEXT`), `model` (`$provider`, `$model`; default `$provider: $model`), `thinking`
(`$level`; default `thinking: $level`), `path` (`$path`; default `$path`), `context` (`$tokens`,
`$window`, `$percent`, `bar`; default `$percent/$window`), `tokens` (`$input`, `$output`,
`$cacheRead`, `$cacheWrite`, `$totalTokens`; default `$totalTokens`), `cost` (`$cost`; default
`$cost`) — proposal open shape 3, unchanged. `SHIPPED` becomes a table of declarations;
`instrumentNamed(name)` returns `InstrumentDeclaration | undefined` and stays the only name lookup.

A variable resolver returns `undefined` for unknown — never `""`, never `0` — and each declaration
chooses where unknown sits: `model`'s resolvers pass the store's unknowns through; `context`'s
return `"?"` for a null estimate (a value pi's own footer prints, chidi §1.5) and `undefined` only
when `contextUsage` itself is absent; `tokens`/`cost` resolvers return `undefined` only when
`totals` is unknown (post-dispose), and `"0"`/`"$0.000"` for a fresh session's zeros.

`configuration.ts` binds one `Instrument` per configured name, memoized across the document, so
two cells holding one name hold the *same* bound object (the delta's agreement property stays
structural):

```ts
// extensions/jefferson/configuration.ts (binding, at parse time)
const segments = parseFormat(declaration, entry?.format ?? declaration.defaultFormat);
const style = validateStyle(entry?.style, theme); // {} when the document declares none
const instrument: Instrument = {
  render: (readings, width, renderTheme) =>
    resolveFormat(declaration, segments, style, readings, width, renderTheme),
};
```

An unknown cell name resolves to the `blank` declaration *before* binding, so a cell whose name
typo'd renders `blank` as the document configures `blank`. `blank` itself binds through the same
path — one code path, one declaration shape (proposal open shape 8).

- **Reasoning.** The seam gains `theme` because styling resolves against the theme current at
  render time and the render-time theme arrives through the factory (D6); `readings` and `width`
  stay, and the instrument stays **pure in `(readings, width, theme)`** — the host's double render
  (measure at row width, layout at cell width, fact 11) still happens, the composed line still
  comes from the cell-width call, and a memo of its own inside an instrument is still forbidden
  (prior design D13, unchanged).
- **Alternatives beaten.** Per-cell inline configuration (ruled out: configured once by name).
  Keeping `render(readings, width)` and injecting the theme into declarations at bind time: the
  bound theme would be the *install-time* theme, and the ruling routes render-time styling through
  the factory's proxy argument. Variables resolved lazily only for those the format names: beaten
  by D4's whole-declaration unknown rule, which the model/thinking requirements force anyway.
- **Consequence.** `labelled()` retires; `tests/instrument.test.ts`'s text shapes become assertions
  about default formats (same bytes: `anthropic: claude-opus-4`, `thinking: high`,
  `DEFAULT_CELL_TEXT`).

### D3. The `instruments` section: read order, guards, and the exact messages

`readConfiguration`'s source gains `theme: Theme` (the entry passes `ctx.ui.theme`, live at
`session_start` — addendum 2 Q3). The document is read in this order, and the order is the
error-precedence rule: **envelope → `instruments` section → rows/cells**. The section must be
validated before cells bind against it; a document wrong in both sections is rejected naming the
`instruments` offender. The top-level `instruments` object sits beside either envelope shape:
envelope detection reads only `rows`/`cells`/`id`, so `{"instruments": …}` alone normalizes to the
default row with those instruments configured, and `{"instruments": …, "cells": […]}` or
`{"instruments": …, "rows": […]}` both read. The trusted-project replacement and the rejection
envelope (`pi-jefferson: <path> was rejected (<message>); rendering the default row`) are
unchanged.

Every guard below is a `RejectedConfiguration` — whole-document semantics, fired by the
`session_start` read, never at render time. `${q(x)}` is `JSON.stringify(x)`:

| Guard | Refuses | Message |
|---|---|---|
| section shape | `instruments` present and not a plain object | `the instruments value is not an object` |
| entry shape | a name's value not a plain object | `the instruments configuration for ${q(name)} is not an object` |
| option keys | a key the declaration's `options` does not have — `frmát`, the declined `width` | `instrument ${q(name)} carries an option its declaration does not have: ${q(key)}` |
| format type | `format` present and not a string | `instrument ${q(name)} has a format that is not a string` |
| unknown variable | a `$name` outside the declaration's variables (and `$bar` where no `bar` is declared) | `${q(name)}'s format names a variable it does not declare: ${q("$" + variable)}` |
| bare `$` | a `$` not followed by a name character | `${q(name)}'s format has a bare $; escape a literal dollar as \$` |
| second width-taker | a second `$bar` in one format | `${q(name)}'s format names a second width-taking variable: "$bar"` |
| style shape | `style` present and not a plain object | `instrument ${q(name)} has a style that is not an object` |
| style keys | a key outside pi's `ThemeStyle` | `instrument ${q(name)} has a style key that pi's ThemeStyle does not have: ${q(key)}` |
| style attributes | one of the six booleans whose value is not a boolean | `instrument ${q(name)} has a style attribute that is not a boolean: ${q(key)}` |
| `fg`/`bg` value | a string that is neither a slot token nor a color `parseColor` accepts, a number `parseColor` rejects, or any other type | `instrument ${q(name)} has an fg that is neither a foreground-slot theme token nor a color pi's parser accepts: ${q(value)}` (bg: `background-slot`) |

Accepted-document warnings (the document renders): a name in `instruments` the extension does not
implement joins the existing `unknownInstruments` notice — one set, one sentence
(`names instruments the extension does not implement: …; those cells render blank`), now gathered
from the section as well as from cells; for a name only in the section the trailing clause is
vacuous and the delta's "no cell renders it" holds because no binding is built. An unknown name in
a cell keeps its warning-plus-`blank` behavior.

- **Reasoning.** The cell-key precedent: a statusline silently rendering something other than what
  was declared is worse than a loud failure (proposal open shape 4). Reading the declaration's own
  `options` for the key check is what makes "adding an instrument adds one declaration" true — the
  reader never restates an option list.
- **Alternatives beaten.** Per-cell inline configuration (ruled out). Rejection at footer install
  instead of parse time (kimi, rejected by the council: `ctx.ui.theme` makes the live theme
  reachable at `session_start`, and the delta mandates whole-document rejection when the document
  is read). Warning-instead-of-rejection for a bad `style` (the render-time throw of `theme.style`,
  fact 8, makes a warning a delayed crash).

### D4. The format grammar and the single-pass resolution

**Grammar** (parse time, once per configured or default format). Scan left to right:

- `\` followed by `$` → a literal `$`; any other `\` → a literal `\`.
- `$` followed by a maximal run of `[A-Za-z0-9_]` → a variable, looked up in the declaration
  (`bar` against `declaration.bar`, the rest against `declaration.variables`); unknown → the D3
  rejection naming instrument and variable. Maximal-run means `$modelName` under a declaration
  holding `model` is one unknown name, not `model` plus literal text — Starship's rule (chidi §7).
- `$` followed by anything else → the bare-`$` rejection. One rule, no silent literal: the escape
  exists for a literal dollar.
- Every other character → literal. `[`, `]`, `(`, `)` and `**` are the characters they are; no
  group syntax, no Markdown, no number formatting — the format language never formats a value.

The parse yields `FormatSegment[]` — `{ kind: "literal", text }` (control characters already
collapsed, D7), `{ kind: "variable", name }`, `{ kind: "bar" }` — and throws the D3 messages.
Default formats go through the same parse at bind time: a declaration whose default fails to parse
is a shipped-code bug, and a test parses and renders every default (D14).

**Resolution** (render time, one pass, in `resolveFormat`):

1. Resolve **every variable the declaration declares** — not only the ones the format names —
   through its resolver against this render's `readings`. Any `undefined` → return `""`: the cell
   renders nothing rather than a format with a hole in it. This is what makes `model` render
   nothing when *either* datum is unknown even under a configured `$model`-only format, which the
   requirement demands ("nothing when either datum is unknown" binds datums, not formats). `bar` is
   exempt: its `null` is a drawable state (D5), not an unknown.
2. Collapse control characters in every resolved value (D7). Literals were collapsed at parse.
3. If no `bar` segment: the bar-less path ends here — style each non-empty piece with the
   configured style (step 5) and concatenate in order.
4. If a `bar` segment: measure the non-bar pieces — `nonBar = Σ visibleWidth(piece)` over the
   collapsed plain texts, before any styling — and hand the remainder to the bar:
   `barWidth = max(0, width − nonBar)`. The bar draws at `barWidth` (D5); at `barWidth = 0` it
   contributes nothing and the format's own text is what the cell clips.
5. Style per piece: `theme.style(text, style)` for every non-bar segment **only when the validated
   style carries at least one key**; an empty style emits the collapsed text verbatim, so a default
   document's cells stay byte-identical to today's unstyled output. Per-segment styling (not one
   wrap around the resolved format) is what keeps `$bar`'s own resets from stripping the prose
   after it (council, accepted from argon). Empty pieces are skipped, not styled.
6. Return the concatenation, unclipped. Clipping, padding and the pad reset stay the cell's (D7) —
   the language composes content; the cell owns geometry, as today.

Measuring before styling is safe because styling adds no visible columns, and it is the order the
one-line guarantee needs (collapse and measure both run on plain text; nothing escape-bearing is
ever measured by `String.length` — trap two).

- **Reasoning.** The ruling fixes the semantics (plain text, `$variables`, `\$`, at most one
  width-taker); the maximal-run scanner is the smallest expression of it, and the two-phase
  measure-then-draw is forced by `$bar` taking "the width the rest of the format leaves".
- **Alternatives beaten.** Starship groups/conditionals and Markdown (ruled out; chidi §7 records
  the divergences). Resolving only the variables the format names (breaks the model/thinking
  unknown rule above). Styling the whole resolved string once (the bar's internal resets strip
  trailing prose — council). Measuring after styling (`visibleWidth` is ANSI-aware and would work,
  but measuring the collapsed plain text is the same number with one fewer escape-bearing string in
  the pipeline, and keeps "collapse before styling" the only order anyone must remember).

### D5. `$bar` drawing

In `resolveFormat`, given `barWidth` from D4 and `percent = declaration.bar(readings)`:

- `filled = percent === null ? 0 : min(barWidth, floor((percent / 100) * barWidth))` — floor is
  the repository's one rounding idiom (`floor(W / N)`, `floor(pad / 2)`), and the clamp keeps a
  percent above 100 inside the track.
- Filled portion: `"█".repeat(filled)` styled with the configured style whose `fg` is replaced by
  the theme token `"warning"` when `percent > 70` and `"error"` when `percent > 90` — pi's own
  footer thresholds on pi's own 0–100 scale (chidi §1.5); below them, the configured style as-is.
- Empty portion: `"░".repeat(barWidth − filled)` styled with the configured style plus
  `dim: true`.
- Null estimate: `filled = 0`, so the whole track is the empty portion, unfilled and `dim`, while
  the cell's text shows `?/<window>` — the council's accepted correction, matching the host's
  post-compaction rendering (chidi §1.5).
- Colors come from `theme.style` at render time through the factory's proxy theme, so a theme
  switch recolors the bar with no re-installation (fact 1).

Only `context` declares `bar` in this change; the drawing is shared language, not context's code,
because the delta binds `$bar` as a variable any instrument may declare.

- **Reasoning.** The ruling fixes the pattern (block characters, theme color by threshold, no
  package — Mario Zechner's gist, not npm); the values are pi's own so a pi user reads one
  visual language.
- **Alternatives beaten.** A `widget`-shaped option (vocabulary ruled out; the owner chose
  `$bar`-in-format so a bar can sit among prose). Round-half-up fill (breaks the one-idiom rule for
  no reader's benefit). Track styled `dim` *instead of* over the configured style (loses a user's
  `bg` under the track and reads as a second styling rule).

### D6. Style: validated at parse time against the live theme, applied at render time through the proxy

`validateStyle(raw, theme)` in `format.ts`, run at document read (D3):

- Keys checked against the eight `ThemeStyle` names; the six attributes must be `typeof boolean`.
- `fg` (string): membership in the theme's **foreground-slot map** is probed through
  `theme.getFgAnsi(value)` in a try/catch — the public typed door on `fgAnsi`, which throws
  `Unknown theme color` exactly when the token is unknown *or* belongs to the other slot (fact 8).
  A throw falls through to `parseColor(value)`; a parse throw is the D3 rejection. A successful
  probe keeps the **string** (render-time token resolution); a successful parse keeps the
  **`Color` object**. `bg` is symmetric through `getBgAnsi`.
- `fg`/`bg` (number): `parseColor` (indexed color), kept as a `Color`. Any other type: rejected —
  JSON cannot carry a `Color` instance and `parseColor` accepts only `string | number` (fact 9).
- The probe call passes the unvalidated string where the signature says `ThemeColor`; the cast is
  the probe — the narrowest one available, and the value never reaches `theme.style` unless the
  probe or `parseColor` accepted it.

The validated `ThemeStyle` (token strings and `Color` objects only) is what D4 step 5 hands
`theme.style` at render time, through the factory's `theme` argument — the proxy that always
resolves to the current theme (fact 1). **Cached styled strings live exactly one render**: the
cell memo is keyed on the render's sample identity (D8), so no styled text survives into a later
render, and `invalidate()` — which the host cascades on a theme change (fact 1) — clears the memos
through the tree, so the next render re-styles against the new theme. Parse-time validation cannot
go stale under a theme switch: every `Theme` is constructed with complete per-slot token records
(fact 8), so slot membership is theme-invariant; only the concrete colors move, and those resolve
at render.

- **Reasoning.** `theme.style()` throws at render time on a raw color string and on a wrong-slot
  token (fact 8), so an unvalidated style is a delayed crash in the footer; the delta mandates
  parse-time validation and forbids a copied token list, and `THEME_TOKENS` is not importable
  anyway (fact 3, 12).
- **Alternatives beaten.** A copied token list in Jefferson (drifts with the host; unimportable).
  Checking `theme.colors` keys (one record over both slots — cannot distinguish the slots the
  wrong-token scenario requires). Deferring validation to the first render or to footer install
  (council-rejected; kimi's softening). Mutating the user's raw value at render time with a
  `parseColor` fallback inside styling (a render-time throw the delta forbids, in the hot path).

### D7. The one-line guarantee: collapse, then style, then clip, then pad, then reset

The cell's pipeline, in this fixed order:

1. **Collapse** — every control character in every raw piece (format literals at parse time,
   substituted values at resolve time, D4) becomes one space:
   `text.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")`, all of C0, DEL and C1, per character.
   One expression of Jefferson's own, in `format.ts`, used at both collapse sites.
2. **Style** (D4 step 5) — after collapse, never before, and collapse never runs after: the class
   above covers the ESC byte, so running it on styled text would shred every escape into ` [31m`
   debris. This is exactly why pi-tui 1.5.0's `replaceControlCharacters` cannot replace it — it is
   escape-naive and run-collapsing (fact 10) — and why the ordering constraint is stated here
   rather than left to a reader: any collapse, ours or a future host helper's, runs on plain text
   only.
3. **Clip** — the cell clips the composed styled string with `truncateToWidth(text, cellWidth)`,
   the row's existing end-anchored ellipsis clip. `truncateToWidth` is ANSI-aware, resets around
   its ellipsis and closes an open OSC 8 (fact 11), so styled text clips safely.
4. **Pad** — `pad = max(0, cellWidth − visibleWidth(clipped))`, computed from the *clipped* result
   (trap two: a wide glyph dropped at the cut leaves a deficit), split by `cell.align` exactly as
   today.
5. **Reset** — the trailing pad is preceded by `RESET` when `leavesStyleOpen(clipped)` (trap one),
   unchanged and now load-bearing by default, because styled text is the normal case rather than a
   defensive one. The host's `SEGMENT_RESET` between children stays the host's (fact 11).

The guarantee belongs to this pipeline, not to validation: no D3 guard inspects a format's text
for line breaks, per the ruling ("don't break the concepts the package aims to provide") and the
delta ("configuration validation MUST NOT police format text").

- **Reasoning.** `replaceControlCharacters` does not exist at the pinned 1.4.0, and the peer range
  `*` means the extension can be loaded by a host carrying 1.4.0 — using the 1.5.0 helper would
  force a peer-floor raise (a manifest narrowing) for one regex; `stripTerminalSequences` strips
  escape sequences but preserves the bare control characters that break the line (fact 10); pi's
  own `sanitizeStatusText` is not importable (fact 3). A per-character collapse is the smallest
  total expression: every control character, one space, width arithmetic unchanged.
- **Alternatives beaten.** The host helper at 1.5.0 (above). Collapsing runs to one space
  (pi-tui's and pi's footer's choice — fine, but a second rule to state and no requirement asks
  for it; per-character keeps "each control character becomes one space" the whole semantics).
  Validating newlines out of formats (ruled out — the guarantee is the cell's). Stripping ANSI
  from data values (no shipped datum carries ANSI; a value's ESC becomes a space like any control
  character, which is the honest one-line behavior).

### D8. The once-built tree, the per-render sample slot, and the re-seat route

`createFooter(rows, sampleReadings, theme)` — the third argument is the factory's `theme` proxy,
which is why the entry moves the `createFooter` call **inside** `ctx.ui.setFooter((tui, theme) => …)`;
the factory is invoked synchronously inside `setFooter` (fact 1), so install timing, `footerRows`
and the `release` wiring do not move.

Built once, at install:

- Per row, in declaration order: the row's cell `Component`s are constructed once and kept in a
  closure array; the row's `HStack` is constructed empty, `new HStack([], { gap: GAP })` with
  `GAP = 0`; the tree is `new VStack(rowStacks, { gap: 0 })`.
- A render slot `let current: Readings = sampleReadings()` lives in the `createFooter` closure,
  initialized at build and overwritten at the start of every `footer.render(width)` before
  `tree.render(width)` runs. Cell components read `current` — the ruling's "have each cell read
  the current sample". No cell is reachable except as a child of the tree, and the tree renders
  only inside `footer.render`, after the slot is set: the invariant is structural, so the read
  needs no guard and no assertion.
- A width cache `let lastWidth: number | undefined` lives beside it. `footer.render(width)`:
  when `width !== lastWidth`, each row re-seats — `stack.clear()`, then
  `stack.addChild(component, { basis: Math.floor(width / row.cells.length), grow: 1, shrink: 0 })`
  for each kept cell component, in order — and `lastWidth = width`. The first render seats the
  empty stacks through the same path (`lastWidth` starts `undefined`); there is no second code
  path for initial sizing. `basis` is per row because rows may hold different cell counts.
- The cell memo becomes `cached: { sample: Readings; width: number; text: string } | undefined`,
  recomputed when `cached?.sample !== current || cached?.width !== cellWidth`. The sample object
  is fresh per render (one `sample()` call per render — existing, tested), so sample identity *is*
  render identity: text a cell cached cannot survive into a later render, whatever the width does.
  Within a render the memo still collapses the host's measure and layout passes per `(cell, width)`
  (fact 11). `component.invalidate()` clears the memo; `footer.invalidate()` cascades it to every
  cell (D6).
- **Retired:** `renderRow` (its arithmetic is now the entry options plus the allocator), the
  trailing-remainder guard (the allocator spends every column, and `compositeTuiLine` pads each
  child to its allocated width — fact 2, 11 — so the guard is unreachable and the delta forbids
  padding the composed line), and the width-only memo. The renderer's export list becomes
  `createFooter` and the `Footer` type.

The re-seat route is the public typed one: `clear()` plus `addChild` (fact 2). Cell components
survive it — only entry options are retired — and a width change misses every memo anyway, so the
re-seat and the memo cannot disagree.

- **Reasoning.** The ruling ("build the VStack of HStacks once in createFooter") plus the council's
  correction: `Stack.addChild` copies options into internal entries behind `protected readonly
  entries` with no setter, so a per-render `basis` reaches a built row only through
  `clear()`+`addChild` (proposal, council). Re-seating only on a width change keeps the per-frame
  cost at two getter comparisons; `HStack.render` re-reads entries every call (fact 2), so the
  seated values are live without any mutation of host internals.
- **Alternatives beaten.** A cast past `protected entries` (a type-level lie against the host's
  encapsulation; the council rejected it). A deep import of `LAYOUT_NODE` (not exported; the deep
  path exists only because pi-tui lacks an `exports` map — an accident, not an API; council
  rejected it). Rebuilding the tree per render (today's shape; the ruling replaces it, and it
  throws away the components the memo lives on). Seeding `basis` at construction with a stored
  initial width (there is no width at install — the factory gets none; one re-seat path beats
  two).

### D9. The store's new datums, the keyed scan, and the turn-boundary rule

`Readings` grows three members; `Reading = string | undefined` stays for the string datums:

```ts
// extensions/jefferson/session-data-store.ts
export interface UsageTotals {
  readonly input: number; readonly output: number;
  readonly cacheRead: number; readonly cacheWrite: number; readonly cost: number;
}
export interface Readings {
  readonly provider: Reading;
  readonly model: Reading;
  readonly thinkingLevel: Reading;
  readonly cwd: Reading;
  readonly contextUsage: ContextUsage | undefined; // host type, type-only import
  readonly totals: UsageTotals | undefined;        // undefined only after dispose
}
```

`UsageTotals` mirrors pi's own accumulation field for field (fact 6) and is Jefferson's only
because `createUsageTotals` is not importable (fact 3); the scan never reads `usage.totalTokens`,
and pi-ai's `Usage` type is never named here — the scan consumes pi's exported `SessionEntry`
union and reads the five fields structurally (fact 12; proposal collision 7).

**Wiring.** `createSessionDataStore` options grow: `seed` becomes the four static datums
`{ provider, model, thinkingLevel, cwd }` (seeded from `ctx.model?.provider`, `ctx.model?.id`,
`ctx.thinkingLevel`, `ctx.cwd` at `session_start` — the delta reads the working directory at
session start and names no push for it); two injected readers join `requestRender`:

- `readUsage(): { contextUsage: ContextUsage | undefined; sessionId: string; leafId: string | null }`
  — the cheap per-sample read: `ctx.getContextUsage()` plus the two scan-key getters.
- `readEntries(): SessionEntry[]` — the expensive copy, run **only** when the key moved.

The entry wraps `ctx` in both; the store holds callbacks, not the context, and `dispose()` clears
them with `requestRender`, so a disposed store reads nothing captured from a replaced session —
post-dispose samples are all-unknown (`totals: undefined`, `contextUsage: undefined`), which the
unknown rule (D2, D4 step 1) turns into cells rendering nothing.

**Scan cache.** One closure record in the store:
`scanCache: { sessionId: string; leafId: string | null; totals: UsageTotals } | undefined`.
`sample()`:

1. disposed → the all-unknown sample.
2. `readUsage()` → `contextUsage` for this sample (read fresh every render — the host pushes no
   change for it and it moves on a model selection as well as on an append, so it is never frozen
   between invalidations), plus the key.
3. Key differs from `scanCache` (or no cache) → `scanCache = { sessionId, leafId, totals:
   scanTotals(readEntries()) }`; else reuse.
4. Return one `Readings` object holding the held strings, this `contextUsage` and the cache's
   `totals` — the same `totals` object every cell of this render reads, so `cost` and `tokens`
   cannot disagree (the delta's one-render scenario, structural as the one-sample rule already
   is).

`scanTotals` counts exactly the host's four categories over the whole session and accumulates the
five fields (fact 6) — the built-in footer's numbers, not the shipped example's branch-scoped
assistant-only sum (proposal collision 6).

**Turn boundary.** `turnEnded()` — what the entry's third subscription calls, payload unwrapped
to nothing: if disposed, return; if no `scanCache`, fill it and request no repaint (no render has
displayed anything to be stale); else re-run steps 2–3 and compare the new five totals to the
cached ones field by field — repaint only when one differs. The comparison *is* the rescan: the
cache it fills is the one the next sample reuses, so a leaf move costs one scan whether the
boundary or the render arrives first, and a render with no invalidation recomputes nothing. The
boundary is a repaint trigger, never the scan's key — `usage`, compaction and branch-summary
appends move the leaf and fire no `turn_end` (fact 7), and the key catches all of them.

- **Reasoning.** `getEntries()` copies the array, so it must not run per cell or per frame; the
  available key is `(getSessionId(), getLeafId())` — the host's own footer key minus the
  `getEntryCount` the readonly view withholds (fact 5; chidi Gaps 1) — and every append moves the
  leaf, so the key is exactly as fresh as the host's own. The council settled the `turn_end`
  dispute on the emit-site evidence (fact 7): keying invalidation on the boundary would miss three
  of the four summed categories.
- **Alternatives beaten.** The entry summing totals and pushing them in (arithmetic in the entry,
  freshness at pi's render cadence — proposal shape 2's rejection). `turn_end` as the invalidation
  key (kimi's framing, rejected on evidence). Holding `ctx.sessionManager` in the store (a host
  handle where the store's shape holds none — and `ReadonlySessionManager` is not exported from
  pi's root index, so even the type would arrive by indexed access). Redeclaring the entry union
  structurally in the store (invents a parallel vocabulary for host data, losing the compile-time
  link that keeps the four-category mirror honest; "don't invent — use pi's own names").
  Repainting on every `turn_end` without comparing (violates "no repaint when no held datum
  changes").

### D10. Exactly three subscriptions

The entry takes `model_select`, `thinking_level_select` and `turn_end` — and nothing else:

| Subscription | Store call | Triggers |
|---|---|---|
| `model_select` | `modelSelected(provider, id)` | repaint iff either datum changed (existing) |
| `thinking_level_select` | `thinkingLevelSelected(level)` | repaint iff the level changed (existing) |
| `turn_end` | `turnEnded()` | rescan under the moved key; repaint iff a totals field changed (D9) |

All three release in the single `release`, so the install log grows one
`unsubscribe:turn_end` between footer installs and the end-to-end test pinning exactly two
subscriptions becomes three.

Deliberately not subscribed, with the reason each is safe: **no event exists** for the cache
warmer's `appendUsage` (fact 7) — the keyed scan makes its totals correct on the next render any
repaint produces, and freshness never claims more than the host delivers; compaction and
branch-summary appends move the leaf the same way, and their flows repaint the host's own
transcript — the delta names the turn boundary as the store's only read-to-learn repaint duty, and
"add whatever the named invalidations need and no more" stops there. `session_compact`/
`session_tree` subscriptions would repaint for changes the next render already reads correctly;
if Joel ever wants store-driven repaint on compaction, that is a named change to the freshness
requirement, not a quiet extra subscription. The two select subscriptions stay despite the
every-frame render cadence (chidi §2.3; proposal collision 4): the store's repaint guarantee is
that *the store* requests the repaint, not that the host happens to render.

- **Alternatives beaten.** Zero subscriptions (fresh-per-render reads — violates the store's
  repaint requirement, which exists so a displayed change never waits on the consumer). `message_end`
  or `agent_end` instead of `turn_end` (finer or coarser than the boundary the delta names; more
  repaint comparisons for the same displayed data). Subscribing the session-tree and compaction
  events (above — beyond the named invalidations).

### D11. The value formatters, and the one place the spec moves off Chidi's reading

All in `instrument.ts`, beside the declarations they serve — formatting for display is the
instrument's job, which is why variables "arrive already formatted" and the format language never
formats a number:

- `compactCount(n)` — `n < 1000` → `String(n)`; `n < 100_000` → `(n / 1000).toFixed(1) + "k"`;
  `n < 1_000_000` → `Math.round(n / 1000) + "k"`; `n < 10_000_000` → `(n / 1e6).toFixed(1) + "M"`;
  else `Math.round(n / 1e6) + "M"`. Used by `context`'s `$tokens`/`$window` and all five `tokens`
  variables.
- `percent` → `${p.toFixed(1)}%`; null estimate → `"?"` (the host's own post-compaction glyph,
  fact 4).
- `cost` → `$${totals.cost.toFixed(3)}` — and **no `(sub)` annotation**: the delta's scenarios pin
  the bare forms `$0.123`/`$0.000`, and subscription-backing is a datum no instrument displays, so
  the store does not hold it.

The bands are Jefferson's own — pi's `formatTokens` is not importable (fact 3) — and they are
written to the strings the delta pins: `86400 → "86.4k"`, `200000 → "200k"`, `20400 → "20.4k"`,
`0 → "0"`. Recorded honestly: chidi §1.6 describes `formatTokens` as switching to rounded-`Xk` at
10000, which would render `86400` as `"86k"`; the delta's pinned `86.4k` is the requirement, the
one-decimal band therefore runs to 100 000, and D14's fixtures pin the band edges. If Joel wants
host-identical rounding instead, it is one constant in one file — but it would contradict the
spec as ratified, so it is a spec change, not a design choice.

- **Alternatives beaten.** Formatting in the format language (ruled out — Starship's split, chidi
  §7: variables arrive pre-formatted). Importing or deep-importing `formatTokens` (fact 3).
  Per-instrument formatters (five `tokens` variables share one spelling of "compact count"; one
  helper, one home).

### D12. The host version floor stays: `devDependencies` `^1.4.0`, `peerDependencies` `*`

The proposal re-read every load-bearing surface in the resolved 1.4.0 and left the floor to this
design. It stays: every fact this design rests on is cited at 1.4.0 or byte-identical across both
versions (addendum 2's version-identity note), and the single 1.5.0-only surface anyone wanted —
`replaceControlCharacters` — is deliberately unused (D7). Raising the dev pin would buy nothing
typechecked; raising the peer range would narrow which hosts can install the extension for one
regex. No manifest moves.

### D13. The docs this change rewrites, and the ADR it owes

Shapes, not prose (the tasks write them):

- **`ARCHITECTURE.md`** — "The parts" diagram gains `format.ts` (the format-and-style language)
  and rewords `instrument.ts` (declarations) and the store line (the datums it now holds). The
  "Row renderer" paragraph loses "the division is ours because the allocator distributes by weight
  rather than dividing" and states the new split: the basis is ours (`floor(W / N)` seated per
  entry), the remainder is the allocator's (`grow: 1`), the tree is built once and re-seated on a
  width change through `clear()`+`addChild`, and cells read the render's sample from the footer's
  slot. The **Fidelity section's property is retired**: the row spans the full width and a
  right-aligned last cell ends at the window's edge. The store paragraph gains the per-sample and
  keyed-scan freshness statements. "Two things that will bite" stays as written — both traps
  survive unchanged (D7 keeps the reset, keeps the columns rule).
- **`AGENTS.md`** — "Adding an instrument" becomes: add one declaration to `instrument.ts`
  (name, variables, defaults, options) and register it in the declarations table so
  `instrumentNamed` resolves it; add the datum it displays to the store if the store does not hold
  it; add a test that the cell renders it and one that alignment still applies. The two traps
  stay. The harness note stays.
- **`README.md`** — the status paragraph stops saying formatting is not built yet (format, style
  and `$bar` are built) and names the six instruments instead of two; the default single row of
  placeholder cells stays true.
- **New ADR, `docs/adr/0002-…`** — `AGENTS.md`'s standing rule: a rule being retired gets an ADR
  rather than silent deletion. It records the retired Fidelity property (the `W mod N` blank right
  edge was a stated property, not a defect), why it dies (the owner's 2026-11-05 layout ruling and
  the allocator evidence: `basis` alone under-fills, `grow: 1` alone skews — chidi §4.2,
  `owner-rulings.md`), and what replaces it (the row spans the width; the remainder goes to the
  earliest cells).

`openspec/specs/extension-source-layout` is inspected and not amended, exactly as the proposal
states: `format.ts` is an ordinary source file inside an established pattern, and ADR 0001 already
lets it import pi-tui at runtime.

### D14. What proves it: the moved expectations and the discriminating fixtures

The tasks own the test list; this pins what existing expectations become and what each new
mechanism must be shown by, so no guard is asserted without a test that fails when the guard is
removed:

- **Geometry** — the "remainder blank at the right edge" expectations invert to the delta's: three
  cells at 100 → 34/33/33 spanning all 100; ten at 132 → 14/14/13×8; eight at 80 → 10 each, now
  through the allocator rather than `grow: 0`. The resize test asserts no cell keeps its previous
  width *and* that the re-seat kept component identity (the same instrument objects receive the
  layout-pass calls).
- **Memo** — the per-`(cell, width)` expectations restate as per-`(sample, width)`: within a
  render, widths `[row, row, row, cell, cell, cell]` resolve once each; across two renders at the
  same width, the instrument resolves again (a test that kept the old expectation would pass with
  stale styled text surviving — the new one fails). One-sample-per-render and
  push-between-renders tests carry over unchanged.
- **Scan categories** — the fixture carries one entry of each of the four categories *and* an
  assistant message with a lying `usage.totalTokens` (differing from its four-field sum): the right
  answer sums the categories' fields, the wrong answers (assistant-only, or reading `totalTokens`)
  differ on this one input. The key cache is proven by counting `readEntries` calls: two samples
  under one key → one call; a moved leaf → two.
- **Turn boundary** — `turnEnded` with changed totals repaints once; with unchanged totals, not at
  all; the three-subscription pin and the `unsubscribe:turn_end` log entry replace the two-pin.
- **Grammar** — one test per rule: `\$` literal, `$` bare rejection, maximal-run unknown-variable
  rejection naming instrument and variable, second-`$bar` rejection, `[a](b)` and `**bold**`
  verbatim, and every shipped default parsing and rendering today's bytes.
- **Style** — `validateStyle` against a fake theme at the boundary whose `getFgAnsi`/`getBgAnsi`
  throw for out-of-slot tokens and whose slot maps hold a known set: token kept as string,
  `"#bf5700"` kept as a parsed `Color`, wrong-slot token rejected naming it, non-boolean attribute
  rejected, unknown key rejected. Render-time: a configured `{"fg": …}` produces the theme's
  escapes around the prose segments only; the empty-style path stays byte-identical to today's
  unstyled output (the default-document guarantee).
- **`$bar`** — allocation (`$percent $bar` in a 20-column cell with 6 columns of prose → a
  14-column track), zero-room shrink, placement among prose, thresholds at their edges (70.0 styled
  as the cell, 70.1 `warning`; 90.0 `warning`, 90.1 `error`), null estimate → full `dim` track
  beside `?/200k`, and percent > 100 clamped to the track.
- **One-line guarantee** — a format carrying `\n` and a datum carrying `\r`, `\t` and a lone ESC
  each render one line at unchanged footer height; the styled clip/pad/reset byte shapes extend the
  existing ANSI-pad tests; a value containing an ESC proves collapse ran before styling (the
  cell's own escapes intact, the datum's ESC now a space).
- **Harness** — the fake `ctx` grows `getContextUsage` and a fake `sessionManager`
  (`getSessionId`/`getLeafId`/`getEntries` over fixture entries); `setFooter` passes a structural
  fake theme as the factory's second argument; `ctx.ui` grows `theme` for the configuration read.
- **Export surface** — the renderer pins `["createFooter"]` (the `renderRow` pin retires with the
  function); configuration's pin is unchanged (`DEFAULT_CELLS`, `MAX_CELLS`, `readConfiguration` —
  the grown `ConfigurationSource` is a type); the contribution-key sweep extends to `format.ts`.

## Risks / Trade-offs

- **[Every leaf move copies the whole entry array]** → the scan runs at most once per
  `(sessionId, leafId)` move, keyed exactly like the host's own footer scan (fact 5, 6); idle
  frames pay two getters. A very long session makes each append's rescan O(entries) — the same
  order the host pays for its own numbers, and the price of matching them (ruling).
- **[Appends no event announces — cache-warm usage, compaction, branch summaries — do not
  self-repaint]** → named, accepted (D10): the next render any repaint triggers reads them
  correctly, the freshness requirement claims nothing more, and a store-driven compaction repaint
  would need a requirement change, not a quiet subscription.
- **[Parse-time validation probes the theme as of `session_start`]** → slot membership is
  theme-invariant because every `Theme` carries complete slot records (fact 8), so a validated
  token cannot become a render-time throw across a switch; colors themselves are re-resolved every
  render through the proxy. Residual: a hypothetical host theme missing a token would throw inside
  `theme.style` at render — unreachable at the pinned version, recorded rather than guarded.
- **[Styled text meets `truncateToWidth` for the first time]** → the clip resets around its
  ellipsis and closes OSC 8 (fact 11); the intra-cell pad reset stays ours (D7 step 5); byte-shape
  tests pin the combination (D14).
- **[Every user's geometry changes on upgrade]** → not breaking (no document stops working) but
  visible: rows now span the full width. The ADR (D13) records the retired property and why; the
  README status paragraph and `ARCHITECTURE.md` change in the same merge.
- **[`compactCount`'s decimal band deviates from Chidi's reading of `formatTokens`]** → the delta's
  pinned `86.4k` wins (D11); fixtures pin every band edge so a future host-mirroring change is a
  deliberate, tested edit of one constant.
- **[The HStack double render sizes `$bar` twice per render]** → the measure-pass output is
  discarded by the explicit basis (fact 2, 11) and the memo bounds resolution to once per
  `(cell, width)`; the cost is two cheap resolutions per bar cell per frame, which is what today's
  tree already pays for text.
- **[Probing slot membership through `getFgAnsi`/`getBgAnsi` uses a rendering method as a
  validator]** → it is the only public typed door on the slot maps (fact 8; the maps are private,
  `THEME_TOKENS` unexported), the probe discards its return value, and the cast it needs is one
  expression wide, stated in D6. A future host export of the token lists would replace it — that
  is a one-function change behind `validateStyle`.

## Migration Plan

- **Deployment:** one merge to `main`, which is a release (trunk-based, README). No data migrates
  and nothing is stored: existing documents render their text unchanged and only gain the
  full-width geometry; the new `instruments` key is optional.
- **Rollback:** revert the merge commit. Documents written *for* this version degrade softly under
  the shipped code: today's reader inspects only `rows`/`cells`/`id`/`containers`, so a top-level
  `instruments` object is silently ignored — a document carrying only `instruments` renders the
  old default row rather than being rejected. No dual shape, no version gate, no stored state to
  clean.
- **Order of work** (for tasks; each group lands its tests, and the seam change lands with its
  consumers): store datums, scan and `turnEnded` first (nothing else compiles against the grown
  `Readings` until it exists); then the instrument seam with the declarations, `format.ts` and
  their tests in one group (the `render(readings, width, theme)` move touches renderer and
  instruments together); then the configuration section, validation and binding; then the
  once-built tree, re-seat and memo, retiring `renderRow` and the guard; then the entry wiring and
  the harness growth; then docs and ADR 0002. `pnpm typecheck` and `pnpm test` green at every
  group boundary; Joel watches the footer live in his own pi session — one run is a sample, never
  proof, so the suite carries the proof and the live look is his.

## Open Questions

None that changes the specs, the approach, or the task breakdown. Two knowns are recorded rather
than open:

- How faithfully the end-to-end harness fakes `Theme` — a structural fake exposing only
  `getFgAnsi`/`getBgAnsi`/`style`, or a constructed real `Theme` — is a tasks-level choice; either
  keeps the validation seam faked at the boundary, and nothing in D6 depends on which.
- The `compactCount` band deviation from chidi §1.6's `formatTokens` reading (D11) is settled
  toward the ratified delta; it is recorded here so a future reader who diffs Jefferson's output
  against the host footer's at, say, 43 210 tokens finds the reason without a council.
