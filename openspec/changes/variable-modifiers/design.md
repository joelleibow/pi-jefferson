# Design

## Context

The format language lives in one module. `parseFormat` turns a `format` string into segments —
`literal`, `variable`, `bar` — handling the `\$` escape, the variable-name run `/^[A-Za-z0-9_]+/`,
the undeclared-name throw and the second-`$bar` throw, and collapsing control characters in literals
as it goes. `resolveFormat` reads a sample, applies the undefined rule (any declared variable
resolving to `undefined` renders the whole cell empty), collapses each substituted value, draws
`$bar` in the columns the rest of the format leaves, and styles each segment through `styledPiece`,
which is a single `theme.style()` call returning the text unchanged for an empty style.
`validateStyle` and `STYLE_KEYS` guard the `style` option. Every throw from `parseFormat` becomes a
document rejection, and the default row renders — but not by being wrapped: `parseFormat`'s own
messages already begin with `"<name>"'s format …`, and `readInstruments` re-throws them unchanged as
`RejectedConfiguration(error.message)`. Only `validateStyle` errors get an `instrument "<name>" `
prefix attached (`configuration.ts:116-121` and `:127`, measured; `research-eleanor.md` §1, §5).

Everything a format sees is a string the instrument already formatted: provider and model ids, the
thinking level (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`), `compactCount` output
like `86.4k`, percent strings like `43.2%`, cost like `$0.123`, and the `?` placeholder
(`research-eleanor.md` §4; `research-chidi.md` §4). The format language never sees a number, and
this change does not change that.

Three standing constraints shape every decision below. A cell is one line tall and its pad carries
no style, which the renderer achieves with a reset before a trailing pad (`AGENTS.md`, quoted in
`research-eleanor.md`, "Required reads"). Widths are measured in terminal columns, never characters
(`research-eleanor.md` §1, §5). And import direction runs one way with no cycles, with the format
language's home in `format.ts` (`michael-orientation.md`, items 16-17).

What drives the change is in `proposal.md`. This document is the contract the tasks are written to;
`specs/statusline/spec.md` is the behavior it must satisfy.

## Goals / Non-Goals

**Goals:**

- Nine modifiers, one table, read by parsing, validation and rendering alike.
- A grammar extension small enough to sit inside the existing scanner: `|name` after a variable, a
  chain of them, and the same after plain text with a defined extent.
- String mutations and style attributes composed so that neither can corrupt the other nor the
  cell's width.
- Every malformed modifier rejected when the document is read, naming the instrument and the
  offender, on the path that already exists.
- Zero change to instruments, the store, the row renderer, the geometry, or the configuration
  reader.

**Non-Goals:**

- Grouping syntax, so a plain-text modifier covers one non-whitespace run and a multi-word phrase
  takes a modifier per word.
- Modifier arguments (`|truncate:10`).
- `fg`/`bg` modifiers, and any modifier that switches an attribute off.
- Modifiers on `$bar`.
- Per-cell configuration, Markdown, numbers formatted by the format language.
- A second module. The table lives in `format.ts`.

## Decisions

Each requirement in `specs/statusline/spec.md` is answered by a decision, and no decision answers
something the spec did not ask for: the format's special characters and escapes by D5, the
`ThemeStyle` vocabulary by D3 and D7, the modifier's grammar and its plain-text extent by D5 and D6,
add-only styling by D7, the three string modifiers by D1, D3, D4 and D8, and read-time rejection by
D5. D2, D9 and D10 are the conditions that keep those true.

### D1. The package is `lodash-es`, imported by name

```ts
import { toLower, toUpper, upperFirst } from "lodash-es";
```

Chidi measured the two builds against both loaders that matter. `lodash-es` named imports work under
pi's jiti loader (`JITI OK`) **and** under `node file.ts`, which is how `node --test` runs the suite
(`NODE OK`). `lodash`'s named imports work under jiti and **throw** under Node's own ESM loader —
`SyntaxError: Named export 'toLower' not found` — while `tsc --noEmit` accepts that same failing
form, so the type checker cannot catch it (`research-chidi.md`, Addendum 3A-3C). `lodash`'s default
import works under both.

- **Rejected — `lodash` with a default import.** It works, but it puts an `export =` interop default
  at every call site in a package that is `"type": "module"` with `verbatimModuleSyntax`, ships
  1.41 MB of CJS with no tree-shaking, and gives the mutation table a call shape that reads as
  `_.upperFirst` at each entry (`research-chidi.md` §6).
- **Rejected — `lodash` with named imports.** This is the trap the measurement exists to close: it
  passes `pnpm typecheck` and crashes `pnpm test`.
- **Rejected — the per-method packages** (`lodash.upperfirst` and friends). Three dependencies
  instead of one; `lodash.capitalize` is frozen at 4.2.1 since 2016, and it is the wrong function
  (`research-chidi.md` §6, Addendum 2).

Nothing else in the source names lodash; one import statement is the whole vendor surface.
**If the choice is left open**, the named-import form is the one a writer reaches for, it passes
`pnpm typecheck`, and it fails `pnpm test` — the failure would surface as a mystery in CI rather
than as a decision anyone made.

### D2. `@types/lodash-es` is a dev dependency, and the lockfile lands in this change

Neither build ships declarations, so `tsc --noEmit` fails with TS7016 for every import form until a
types package is present (`research-chidi.md`, Addendum 3C). `@types/lodash-es@4.17.12` declares
`@types/lodash: "*"` as its own dependency, so declaring `@types/lodash-es` alone installs both; the
measured passing configuration was the pair.

The manifest changes are two entries, and the runtime one creates a key that does not exist today:

```json
{
  "dependencies": { "lodash-es": "^4.18.1" },
  "devDependencies": { "@types/lodash-es": "^4.17.12" }
}
```

Both ranges name the versions Addendum 3 installed and measured — `lodash-es@4.18.1`,
`@types/lodash-es@4.17.12` — so the design pins what was proven rather than a newer guess
(`research-chidi.md`, Addendum 3). The caret matches the repo's own `devDependencies`, including
its `@types/node: ^26.6.6` entry (`research-eleanor.md` §8).

- **Rejected — declaring `@types/lodash` explicitly.** It would be a second statement of a fact
  `@types/lodash-es` already carries. Deleting it breaks nothing, which is the test. If pnpm's
  layout ever fails to link it, `pnpm typecheck` says so in the first task and the fix is one line.
- **Rejected — no types, with a suppression.** The repo runs `tsc --noEmit` as a gate and has no
  suppressions; adding one to import three functions is not a trade worth making.

`pnpm-lock.yaml` changes in the same commit as `package.json`: CI installs with
`--frozen-lockfile`, so a manifest change alone fails the build (`research-chidi.md`, Addendum 3D).
**If the types package is absent**, every import fails `tsc --noEmit` with TS7016; **if the lockfile
is not updated**, `pnpm install --frozen-lockfile` refuses and CI stops before the tests run.
No `allowBuilds` entry is needed — neither package has an install script — and `minimumReleaseAge`
cannot bite, because every version involved is months old (Addendum 3D). `files` does not change:
the dependency is not shipped, pi installs it consumer-side (`research-chidi.md` §7).

### D3. One table of nine modifiers, in `format.ts`

```ts
type StyleAttribute = Exclude<keyof ThemeStyle, "fg" | "bg">;

type Modifier =
  | { readonly style: StyleAttribute }
  | { readonly mutate: (text: string) => string };

const MODIFIERS: ReadonlyMap<string, Modifier> = new Map([
  ["bold", { style: "bold" }],
  ["dim", { style: "dim" }],
  ["italic", { style: "italic" }],
  ["underline", { style: "underline" }],
  ["inverse", { style: "inverse" }],
  ["strikethrough", { style: "strikethrough" }],
  // lodash's `capitalize` lowercases the rest of the string; the ruling is first letter only,
  // which is `upperFirst`. Swapping these two silently breaks owner-rulings.md, 2026-11-06.
  ["capitalize", { mutate: upperFirst }],
  ["upper", { mutate: toUpper }],
  ["lower", { mutate: toLower }],
]);
```

`StyleAttribute` derives the six from `ThemeStyle` instead of listing them a second time, so a key
of `fg` or `bg` in this table is a type error. Parsing resolves each name with `MODIFIERS.get` — an
`undefined` result *is* the unknown-name rejection — and stores the `Modifier` on the segment (D6),
so rendering reads only the segment's modifiers and never looks a name up again. Nothing else holds
a name. A modifier never reaches `validateStyle`: that function checks a `style` object's keys, and
a modifier's vocabulary is settled by the table lookup in the same pass that parses the format,
which is where "validation" happens for a `format` (`research-eleanor.md` §1).

- **A `Map`, not an object literal.** `declaration.variables` is an object, and every lookup on it
  goes through `Object.hasOwn` precisely so `toString` and `constructor` do not count as variables
  (`research-eleanor.md` §1). A `Map` removes that hazard by construction rather than repeating the
  guard; `|toString` is simply unknown.
- **Rejected — two tables, one for style and one for mutations.** Then the renderer branches on
  which table hit the name, and the spec's one-home rule is broken by the shape of the code.
- **What absence breaks:** the read-time rejection and the render-time application would each need
  their own list of the nine names, which is exactly what "An instrument is declared once" forbids
  by analogy (`michael-orientation.md`, item 4).

A test pins the nine names exactly. That is a second list on purpose: it is the assertion that
notices a seventh `ThemeStyle` attribute, which no type can force into the table.

### D4. `capitalize` maps to `upperFirst`, and the table says so

The ruling is *"the first letter only. all-caps would be the modifier"* (`owner-rulings.md`,
2026-11-06), and `_.upperFirst("hELLO")` is `"HELLO"` while `_.capitalize("hELLO")` is `"Hello"`
(`research-chidi.md`, Addendum 2, verified empirically). The name and the function are the one pair
in this change where the obvious choice is wrong, so the table carries a comment naming the trap and
a test pins `"hELLO"` → `"HELLO"` — the input on which a swap shows up. The council asked for both
(`council.md`, "Synthesis & Recommendation").

### D5. Grammar: what begins a modifier, what a name is, and what the guards refuse

A modifier name is a maximal run of `/^[A-Za-z0-9_]+/` — the character class the variable scanner
already uses (`research-eleanor.md` §1). One rule for both nouns, so `$cacheRead` and `|capitalize`
are spelled by the same grammar.

The scanner, on `|`, looks at the next character:

- **A name character.** Scan the maximal name, attach it by the subject rule below, or reject the
  document if `MODIFIERS` has no such name.
- **A space, the end of the format, `$`, `|` or punctuation.** The `|` is literal text, as it is
  today.

`$model | $provider` and a trailing `|` therefore keep rendering exactly as they do now, which is
what Joel's *"Literal text"* ruling buys (`council.md`, "Joel's rulings at the owner-decisions
gate").

**What a `|name` attaches to.** The thing before a `|` can be a variable, a modifier, or text, so
attachment is three ordered cases, checked in this order:

1. **Directly after a variable's name** — it attaches to that variable segment. `$model|bold` styles
   the value, and the empty plain-text buffer is not a subject problem.
2. **Directly after a previous modifier's name** — it extends that same segment's chain, whether the
   segment is a variable or a literal. `$model|bold|dim` and `via|dim|bold` each produce one
   segment carrying two modifiers.
3. **Otherwise** — it takes the trailing non-whitespace run of the literal buffer, which D6 splits
   off.

**Escapes.** The scanner already emits a literal `$` for `\` + `$` and a literal backslash for any
other `\`, including a trailing one (`research-eleanor.md` §1, test `"tail\\"` → `tail\`). `\|`
joins that same rule: a backslash followed by `$` or `|` emits the character, and any other
backslash emits itself. The format text writes one backslash; the TypeScript literal that produces
it is `"\\|"`, exactly as the existing `\$` is written `"\\$"` in source. Nothing else about
backslashes changes, including the trailing-backslash test.

**Guards, their placement and their messages.** All three fire inside `parseFormat`, whose messages
already start with the instrument's name; `readInstruments` passes each one through unchanged as a
document rejection and the default row renders — the path an undeclared `$name` already takes
(`research-eleanor.md` §1; `configuration.ts:116-121`). No change to `configuration.ts`.

- **An unknown name**, when the name after the `|` is not in `MODIFIERS`:
  `"<name>"'s format names a modifier it does not implement: "|bd"`.
- **A modifier on the bar**, when a `|name` follows a `$bar` segment:
  `"<name>"'s format puts a modifier on "$bar": "|bold"`.
- **Nothing to modify**, when case 3 applies and the plain-text run before the `|` is empty:
  `"<name>"'s format has a modifier with nothing before it: "|dim"`. Cases 1 and 2 never reach this
  guard: after a variable or after another modifier there is always a subject.

The messages follow the existing shape: the instrument's name first, the offending text last
(`research-eleanor.md` §1). A modifier after an undeclared variable reports the variable, not the
modifier, because the scan completes the variable before it reads what follows it — one error per
format, left to right, as today.

**If the guards are absent**, `|bd` renders as the characters `bd`, a typo becomes a footer nobody
can explain, and a modifier on `$bar` is silently dropped or silently applied — three quiet
failures in place of one loud message.

### D6. Plain text: the modifier takes the preceding non-whitespace run

The parsed segment kind gains its modifiers:

```ts
type FormatSegment =
  | { kind: "literal"; text: string; modifiers: readonly Modifier[] }
  | { kind: "variable"; name: string; modifiers: readonly Modifier[] }
  | { kind: "bar" };
```

`bar` takes none, by construction. In case 3 the run is the match of `/\S+$/` on the collapsed
literal buffer: that match becomes its own literal segment carrying the modifiers, and whatever
precedes it stays an unmodified literal. Naming the expression is the point, because it settles
the boundary — U+00A0 counts as whitespace, since JavaScript's `\S` excludes it, so `a\u00a0b|dim`
styles `b` alone. The literal is collapsed first and matched second, so a control character that
collapses to a space counts as the whitespace boundary it becomes on screen rather than as part of
the run. So `via|dim` styles `via`, `hello world|dim` styles `world`, and `$model via|dim` styles
`via` while the space before it and the variable after it are untouched — Joel's example
(`owner-rulings.md`, 2026-11-06), and the council's agreed extent (`council.md`, "Agreed by both
advisors").

If case 3's match is empty — `|dim` at the start of a format, or after a space — there is nothing
to modify and the document is rejected (D5, third guard). **This part is the design's judgment, not
a ruling:** the ruling makes a name after a pipe a modifier, so the format means something, and a
modifier with no subject is a malformed format. Rejected alternative: treat it as a no-op, which
makes `🧠 |dim $model` render silently unstyled — a state no user can see or debug, and the opposite
of the loud-rejection convention every other format error follows. Flipping this later is one guard
and one test.

**If the extent is not defined**, every writer invents one: the whole literal segment, the last
word, the text back to the previous variable, no room for a chain. The spec's "the run of
non-whitespace text immediately before it" is only true if the parser splits the segment here and
the chain rule in D5 keeps a second `|name` on the same segment.

### D7. Style: one `theme.style()` call per segment

Per segment, the style modifiers merge into the instrument's style and the result is the segment's
one call:

```ts
const effectiveStyle = modifiers.reduce(
  (style, modifier) =>
    "style" in modifier ? { ...style, [modifier.style]: true } : style,
  configuredStyle,
);
```

Only `true` is ever written, so add-only holds: `style: {bold: false}` plus `$model|bold` renders
bold, which is what the ruling means (`council.md`, "Joel's rulings at the owner-decisions gate";
`michael-orientation.md`, follow-up). `styledPiece` is unchanged and still returns the text
untouched for an empty style, so a segment with neither modifiers nor a configured style is
byte-identical to today.

Why one call: `theme.style()` delegates to pi-tui's `styleTextWithAnsi`, which concatenates a prefix
and a suffix and re-opens nothing, while bold and dim share SGR 22 — so wrapping an already bold or
dim run in another bold or dim truncates the outer attribute (`research-chidi.md` §5). Today each
segment gets its own call and the calls never nest (`research-eleanor.md` §5); the hazard arrives
only if a modifier is applied as a second wrap. Merging first makes nesting impossible rather than
merely unlikely.

- **Rejected — one wrap per modifier in chain order.** `$model|bold|dim` would be
  `style(style(t, {bold}), {dim})`, which happens to compose, but `$model|dim` over an instrument
  styled `bold` would not.
- **Rejected — styling first and mutating after.** A case mutation over `\x1b[1m` rewrites the
  escape sequence's own letters and corrupts the terminal state. This is why D8 puts mutation
  before styling and is the second reason a single call sits at the end.

Consequence worth stating: chain order is meaningful for string modifiers and meaningless for style
modifiers, because styling happens once, after the chain has run.

### D8. Order inside `resolveFormat`

1. **The undefined rule**, unchanged and first: any declared variable resolving to `undefined`
   returns `""` for the whole render. A modifier can never resurrect a cell that reads nothing.
2. **`collapse()`** on each substituted value, as today; literals were collapsed at parse time.
3. **String mutations** on the segment's text, in the order the format wrote them.
4. **`$bar`'s width**: `max(0, width − Σ visibleWidth(non-bar pieces))`, over the mutated pieces.
5. **One `theme.style()` per segment.**

Step 3 runs on literals too, not at parse time, so there is exactly one place that executes a
mutation and the parser stays a parser.

Step 3 precedes step 4 because a mutation can change a value's column count: `ß` upcases to `SS`,
two columns where there was one (`research-chidi.md` §3), and measuring first would leave the bar
counting columns the value no longer occupies. Step 5 follows step 4 because `visibleWidth` strips
SGR anyway, but ordering it last keeps the width a property of text rather than of escape
sequences. Mutations are case maps, so they cannot reintroduce a control character and the collapse
in step 2 still holds the one-line guarantee.

The order is the council's agreed one (`council.md`, "Agreed by both advisors"), and each position
is forced rather than chosen, except step 5, which is free and stated for the reason above.
**If step 3 moved after step 4**, a bar would count the columns a value used before it shrank or
grew, and `$model|upper $bar` would overrun its cell by one column for every `ß`. **If step 5 moved
before step 3**, `upper` would run over the escape sequence and emit `\x1b[1M`, which no terminal
reads as bold.

### D9. `$bar` takes no modifier

The guard fires in `parseFormat` when a `|name` follows a `bar` segment (D5). `$bar` is a segment
kind of its own, not text: its content is block characters whose colors the bar's own rules pick —
`warning` above 70 %, `error` above 90 %, a `dim` track — so a `|bold` on it would need a rule for
which of the two styling sources wins over the fill and the track, and a `|upper` on it has no
meaning at all (`research-eleanor.md` §1). The council rejected it and neither advisor contested
(`council.md`, "Agreed by both advisors"). **What absence breaks:** the implementation would have to
invent a precedence rule nobody ruled.

### D10. How the tests pin it

`tests/fake-theme.ts` hands the whole options object to pi-tui's `styleTextWithAnsi`, so it emits
the real SGR codes for the six booleans and can assert exact escape counts, per-segment styling and
which slot tokens were used; an empty style bypasses `theme.style()` entirely, so "no modifier" is
provable byte-for-byte. It cannot discriminate the host's real token list, or any SGR code the host
primitive does not emit (`research-eleanor.md` §7). So the tests assert that the extension *asks*
for an attribute, never that a terminal renders it.

**If the tests stop at the parser**, the half a user sees — the rejection, the exact warning, the
default row — is unproven, and the warning text could drift while every format test stayed green.

In `tests/format.test.ts`: the grammar (`$model|bold`, `via|dim`, a chain on a variable and a chain
on literal text, `\|`, a spaced pipe as text), the three rejections with their exact messages, one
style call per segment by escape count, `{bold: false}` plus `|bold`, the three mutations on `high`,
`HIGH`, `hELLO` and `ß`, and the nine names. Two of those exist to tell D8's order apart from its
two inversions, because every other test in the file passes under either:

- **Mutation before measurement.** For `context`, the format `straße|upper $bar` in a cell of known
  width: the bar's column count MUST be `width − visibleWidth("STRASSE ")`, and the cell's visible
  width MUST equal the cell width. Measuring before mutating leaves the bar one column wider and the
  cell overruns by one. This is the `ß`-against-`$bar` test the council accepted (`council.md`,
  "Accepted (`council-kimi`)").
- **Mutation before styling.** For an instrument styled `{"bold": true}`, the format `$model|upper`:
  the output MUST contain `\x1b[1m` and MUST NOT contain `\x1b[1M`. Styling first produces the
  latter, because `upper` rewrites the `m` of the escape sequence.

In `tests/configuration.test.ts`: a document whose `model` format carries `|bd` produces this
exactly, asserted through the existing `rejected(...)` helper the way that file already asserts
`$nope` (`tests/configuration.test.ts:569`):

`pi-jefferson: <path> was rejected ("model"'s format names a modifier it does not implement: "|bd"); rendering the default row`

No `instrument "<name>" ` prefix appears in a `parseFormat` message; only `validateStyle` failures
are given one, and the design does not add one. `tests/row-renderer.test.ts` needs nothing
new: a mutated cell is plain text, and the existing reset-before-pad rule already covers a
modifier-styled one (`research-eleanor.md` §5).

## Risks / Trade-offs

- [`lodash-es` is verified under pi's jiti loader and Node's, but pi's loader is not the package's
  to hold still] → The suite imports it under `node --test`, the stricter of the two measured
  loaders, so a loader regression shows in CI before release, not in a user's footer.
- [The pipe change can reject a document that renders today] → The rule is as narrow as the ruling:
  only a `|` directly followed by a name. `\|` is the escape, the warning names the modifier, and
  the audit found no shipped string affected (`research-eleanor.md` §3).
- [A modifier with nothing before it is rejected on this design's judgment, not a ruling (D6)] →
  Stated openly in D6; overturning it costs one guard, one message and one test.
- [A seventh `ThemeStyle` attribute would need the table, and no type can force it] →
  `STYLE_KEYS`'s `satisfies Record<keyof ThemeStyle, true>` fails typecheck on the new key, which
  points at this file, and the test pinning the nine names fails until the table grows.
- [`@types/lodash` arrives only transitively] → `pnpm typecheck` in the first task proves it; the
  fix, if ever needed, is one devDependency line.
- [Escape doubling reads wrong in source] → D5 states both forms: the format writes `\|`, the
  TypeScript literal is `"\\|"`. A test writes the literal so the doubling is pinned.
- [Instruction cost for the user] → Two more special characters than yesterday, and a multi-word
  phrase needs a modifier per word (Non-Goals). Both follow from rulings, not from this design.

## Consequences

What the change takes away: a literal `|` immediately before a name must now be escaped, and an
instrument's configured `dim` can no longer be escaped by a modifier, because no modifier turns an
attribute off. Neither is recoverable within a format; the escape and the `style` option are the
answers.

There is a second, quieter break in the escape itself. A format that writes `\|` renders `\|`
today, because a backslash not followed by `$` is a literal backslash (`research-eleanor.md` §1);
after this change it renders `|`. No shipped string writes one (`research-eleanor.md` §3), but a
user's document that does changes meaning without being rejected — the one case in this change that
changes output silently rather than with a warning.

What it leaves alone: instruments, their declarations, the store, `configuration.ts`, the row
renderer, cell geometry, the `$bar` math, and the published file set.

## Migration Plan

Nothing is persisted and no data moves: reverting the commit is the whole rollback, and it restores
`package.json` (the `dependencies` key it created and the one `devDependencies` entry it added) and
`pnpm-lock.yaml` (every line the install added) in the same stroke. The package is published, so a
user's document that
writes `$variable|word` changes meaning; the release note names `\|` and the warning names the
modifier when a document is rejected. CI needs no edit: `pnpm typecheck` and `pnpm test` cover the
dependency, and the pack invariant is untouched because `files` and `pi.extensions` do not move.

## Open Questions

None that defer. Every question the proposal carried is closed by a ruling or by the council's
agreed list, and the one the council left open — a `|` with no name after it — Joel answered as
literal text (`council.md`). The two judgment calls this design makes on its own are D6's empty run
and D9's bar precedence, both stated with their alternatives and both cheap to overturn.
