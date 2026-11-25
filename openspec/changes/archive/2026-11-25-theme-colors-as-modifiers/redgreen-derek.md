# Red/green spike: theme-colors-as-modifiers

**Everything the design and the delta specs imply is proven: 26 checks red at base and green with the
design's change, and 7 pins shown green at base and green after.** The change itself is built in the
spike copy, `pnpm typecheck` and `pnpm test` are clean there, and the project's own checkout is
untouched.

## How the spike ran

- Base commit `cf90995`, on its own branch `spike/theme-colors-as-modifiers` in a full clone at
  `/tmp/theme-colors-spike.VVLcCF/spike` (`mktemp -d`), with `pnpm install` run inside the copy.
- Before any change, in the copy: `pnpm typecheck` clean, `pnpm test` → `tests 538, pass 538, fail 0`.
- The design's change was then built in the copy (the files the design's Module & File Placement table
  names, no new source file): `format.ts`, `components/instruments/instrument-binding.ts`,
  `configuration.ts`, `registration-listener.ts`, `startup.ts`. The tests the table allows to move were
  moved, and the new checks were added to `tests/format.test.ts`, `tests/instrument.test.ts`,
  `tests/configuration.test.ts`, `tests/registration.test.ts` and the export pin in
  `tests/jefferson.test.ts`.
- After the change, in the copy: `pnpm typecheck` clean, `pnpm test` → `tests 569, pass 569, fail 0`.
  The 538 that shipped at `cf90995` all still pass, which is S0.
- **The red run.** Production files were reset to `cf90995` (`git checkout cf90995 -- extensions/`)
  and the new tests were expressed in the base's call shape: the extra `fgCheck` argument stripped
  (a 2-argument `parseFormat` call, or `parseFormat(a, b, true)`), and the base's behaviour for "is
  this name a colour" stood in where the base has no `foregroundCheck`. Nothing else was edited. A
  whole-suite red run at `cf90995`: `tests 569, pass 531, fail 38` — the 26 red checks below, plus
  the 12 rewritten expectations the design's table lists. The 7 pins pass there.
- No model call was spent. Every command is `pnpm typecheck`, `pnpm test` or `node --test
  --test-name-pattern=…` inside the copy.

## The checks

Each line is one test. "Red" is the base's observation as it arrived; "Green" is the assertion in the
spike tree.

### The language: a foreground colour of the theme is a `|name`

| # | Check | Red at `cf90995` | Green |
| --- | --- | --- | --- |
| A1 | A colour on a variable: `$model\|toolDiffRemoved` | `Error: format names a modifier it does not implement: "\|toolDiffRemoved"` | value drawn `theme.style("claude-opus-4", { fg: "toolDiffRemoved" })`, text unchanged |
| A2 | A colour on literal text: `$model via\|muted $provider` | `Error: …does not implement: "\|muted"` | segment 2 is `{kind:"literal", text:"via", modifiers:[], colour:"muted"}`; renders `claude-opus-4` + muted `via` + `anthropic` |
| A3 | A background name is refused, as any name the language lacks: `$model\|selectedBg` | refusal with the old sentence `names a modifier it does not implement` | `format names neither a modifier Jefferson implements nor a foreground colour of the theme: "\|selectedBg"` |
| A4 | A misspelt colour: `$model\|acccent` | old sentence | the new sentence, naming `\|acccent` (design's one-message decision, O4) |
| A5 | **Pin.** `dim` keeps its meaning where the theme carries a `dim` colour | green: `{modifiers:[{style:"dim"}]}`, drawn faint | green: unchanged (measured fail under M1) |
| A6 | A case-different name is another name: `$model\|Accent` | old sentence | new sentence, naming `\|Accent` |
| A7 | A colour after a form: `$path\|relative\|accent` | `Error: …"\|\|accent"` refused | one segment `{form:"relative", modifiers:[], colour:"accent"}`, drawn in accent |
| A8 | **Pin.** A form named like a colour wins directly after its variable: `$price\|accent` | green: the form | green: the form, not the colour |
| A9 | That name after another modifier is the colour: `$price\|bold\|accent` | `Error: …"\|\|accent"` refused | `{modifiers:[{style:"bold"}], colour:"accent"}`, no form |
| A10 | A form after a colour is refused: `$path\|accent\|relative` | old sentence, naming `\|accent` | new sentence, naming `\|relative` (measured fail when the form gate drops the colour condition, M3) |
| A11 | The bar takes no colour: `$bar\|accent` | old sentence (`names a modifier…`) | `format puts a modifier on "$bar": "\|accent"` |
| A12 | Two colours: the later wins: `$provider\|accent\|warning` | `Error: …"\|\|accent"` refused | `{colour:"warning"}`, drawn in warning |
| A13 | Colour and attribute in either order | `Error` | both `theme.style("anthropic",{fg:"accent",bold:true})` |
| A14 | A colour beats the `style`'s `fg`, and literal text keeps it | `Error: …"\|\|warning"` | value warning, `" via"` accent (measured fail when the colour is folded into the merged style, M2) |
| A15 | A colour sets no attribute and clears none | `Error` | value `{fg:"accent"}`; with `{bold:false}` the same plus `bold:false` |
| A16 | A faint colour is pass-through | `Error: …"\|\|muted"` | `$model\|muted` equals the style `{fg:"muted"}` over one theme |
| A17 | The names are the theme's, not a copy | `AssertionError: Got unwanted exception … Error: …"\|\|invented"` | `invented` accepted against `fakeTheme({invented})`; `bashMode` refused against `fakeTheme()` |
| A18 | The theme at render time decides the escape | `Error` | parsed against one theme, drawn in the other theme's `muted` |
| A19 | **Pin.** A plain format refuses every name before any lookup: `$tokens\|accent` | green: `format puts a modifier in a plain format` | green, unchanged |
| R1 | The export pin lists the new name | `AssertionError: ../extensions/jefferson/format.ts + 'foregroundCheck'` | `["collapse", "foregroundCheck", "parseFormat", "resolveFormat", "resolvePlain", "validateStyle"]` |

### The instruments whose own colour a format can now beat

| # | Check | Red | Green |
| --- | --- | --- | --- |
| A20 | A notice's format colour beats `warning`, text and columns unchanged | `Error: …"\|\|accent"` (the document's kind text is a cell format) | `Notice: ` + the text in `accent`; stripped text identical to the uncoloured render |
| A21 | Thinking: `$level\|accent` beats the level's colour, and the bare level keeps it | `Error` | `theme.style("high",{fg:"accent"})`, and `$level` alone still `thinkingHigh` |
| A22 | A label has no format, so it keeps the style while the value takes the colour | `Error` | `theme.style("Model: ", style) + theme.style(value,{fg:"warning"})` (measured fail under M2) |

### A document's own paths

| # | Check | Red | Green |
| --- | --- | --- | --- |
| B1 | An own instrument's format naming a colour is accepted and rendered | `was rejected ("model"'s format names a modifier it does not implement: "\|toolDiffRemoved")` | `warning === undefined`, text drawn in `toolDiffRemoved` |
| B3 | A background name is rejected in a document, naming the instrument and the modifier | the old rejection text | `("model"'s format names neither a modifier Jefferson implements nor a foreground colour of the theme: "\|selectedBg"); rendering the default row` |

### A provider's paths, and the hold

| # | Check | Red | Green |
| --- | --- | --- | --- |
| C1 | A provider's default format naming a colour registers and renders it, both load orders | `AssertionError: provider-first` — the row rendered `blank`'s placeholder, because the registration was refused | `Savings: $4.10` with `$4.10` drawn in `accent`, no warning, in both orders (measured fail when the listener vets at arrival with no theme, M5) |
| C2 | A default format naming a name the theme lacks is refused whole, alike in both orders | `AssertionError: provider-first` — two warnings, both with the old text | placeholder line; the unknown-name notice then `"taiknr.savings"'s default format names neither …: "\|notacolour"`; exactly one message names the colour; both orders identical after the document's path is stripped |
| C2b | The refusal takes its siblings, fields and later reports | `… carries a default format Jefferson cannot parse; taiknr reports "saved" without a registration` | `… 's default format names neither …: "\|notacolour"; taiknr reports "saved" without a registration`, and no `Stubs:` text |
| C4 | A colour function the format covers is never asked, so its throw warns nothing | placeholder, because the registration was refused | `Savings: $4.10`, no warning |
| C5 | **Pin.** A held registration is judged as it was posted (`variableFg.saved` replaced by `5` before the session starts) | green | green (measured fail when the queue holds the posted object by reference, M4) |
| C6 | **Pin.** A payload that throws while vetting is contained: the footer installs, the next registration renders, one log naming the channel | green, both orders | green, both orders |
| C7 | **Pin.** A held report is judged as it was posted (`value` changed after posting) | green | green |
| P1 | **Pin.** The refusal-part table's new rows: `fields: "x"`, `variables: "x"`, a `null` registration, a `null` report, an own `__proto__` field name | green: the whole table passes at `cf90995` once its two rewritten texts are put back | green: the same rows, unchanged |

## The design's own measurements, reproduced

Each is a one-line mutation of the spike tree, run and then reverted.

| # | Mutation | What it proves |
| --- | --- | --- |
| M1 | Ask the theme before Jefferson's own names (`colour = check(name) ? name : undefined`) | A5 fails: `$model\|dim` takes the theme's `dim` colour instead of the attribute, which is Joel's ruling D2 |
| M2 | Fold the written colour away (`foreground = token`) so the merged style decides | A2, A12, A14 and A22 fail: with the style `{fg:"accent"}`, `$model\|warning` renders accent, which is CB-03 |
| M3 | Drop `subject.colour === undefined` from the form gate | A10 fails: `$path\|accent\|relative` is accepted with `relative` as its form |
| M4 | Return the posted object instead of the copy (`const copy = payload`) | C5 fails; the refusal-part table still passes |
| M5 | Vet at arrival with a check that accepts nothing, as the base did with no theme | C1 fails and C2 still passes, which is why the hold is needed for acceptance but not for a refusal |
| M6 | Add `priority?: string` to `ContractDeclaration` | `TS2741: Property 'priority' is missing in type '{…}' but required in type 'Record<keyof ProvidedDeclaration, MemberCopy>'` at `registration-listener.ts` — the copy's table cannot fall behind the contract in silence |

## Tasks

There is no `tasks.md` in the change directory (the directory holds the artifacts and the council and
design-review reports only), so the checks above are derived from `design.md` and the two delta specs
and labelled for a `tasks.md` to cite. Nothing was ticked anywhere.

## Questions

None. The design settles every behaviour this spike needed, including the three the code made
interesting: the check travels as the shape of the format language's third parameter; the colour is a
field on the segment; and the listener's handle carries one method, `receiveTheme`.

## Your calls

Choices inside the contract, in the spike's code:

- `ForegroundCheck`'s predicate is `(name: string) => name is ThemeColor`, so a caller that tests a
  name gets the narrowed type without a cast; the probe casts once, at the accessor.
- `validateStyle` keeps its `getBgAnsi` probe as a local `isBackground` beside the shared
  `isForeground`, so each slot answers only its own names and neither probe is a second copy of the
  other's rule.
- The colour's console message and the copy's tables live where the design put them; the tables use
  module-level `kept` / `mapCopied` / `mapOfMapsCopied` / `listCopied` helpers rather than one
  hand-written closure per member, and `copyThrough` reads each named member exactly once.
- The drained message's log line is `console.error(\`Event handler error (${channel}):\`, error)`, the
  shape the design quotes from pi's bus; the error object is passed, not stringified.
- In the test files, one module-level `fgCheck` (`foregroundCheck(fakeTheme())`) replaces the argument
  for the calls that do not choose a theme, and `rendered` in `tests/format.test.ts` builds its check
  from the theme it renders with, so a test that overrides a name asks the theme it draws with.

## Docs for Bambadjan

The change makes these sentences false or incomplete. The design's Migration Plan already lists the
docs pass; these are the exact lines.

- `docs/formats.md:60` — "Six more modifiers set pi's text attributes: `bold`, `dim`, …". A `|name` may
  also be a foreground colour of the live theme, read after a form and after Jefferson's own names;
  `dim` stays the attribute where the theme carries a `dim` colour, and the `dim` colour is reached
  through the instrument's `style`.
- `docs/formats.md:64` — "an unknown modifier is refused" — now "a name that is neither a modifier
  Jefferson implements nor a foreground colour of the theme is refused".
- `docs/extension-authors.md:312` — the row "A default format Jefferson cannot parse |
  `pi-jefferson: "taiknr.savings" carries a default format Jefferson cannot parse`" is no longer what
  a provider sees: the text is `pi-jefferson: "taiknr.savings"'s default format <the parser's
  sentence>`, e.g. `… names neither a modifier Jefferson implements nor a foreground colour of the
  theme: "|notacolour"`.
- `docs/configuration.md:130` — the row "Any other format Jefferson cannot parse |
  `pi-jefferson: "taiknr.savings" is configured with a format Jefferson cannot parse; it renders
  blank`" is now `pi-jefferson: "taiknr.savings"'s format <the parser's sentence>; it renders blank`.
- `ARCHITECTURE.md:44` (the **Instrument.** paragraph) — "A variable's declared token can replace that
  segment's `fg`" is now conditional: the format's own colour beats it. "A format may carry `|name`
  modifiers … and the language commits to one order" needs the colour in that order, and `parseFormat`
  now takes a foreground check as its third argument.
- `ARCHITECTURE.md:71` — "its modifiers are pi's own six attributes" is false: a modifier is one of
  those, one of the three string mutations, or a foreground colour the live theme carries.
- `AGENTS.md:25` (project root) — "`parseFormat` rejects a `|name` the declaration does not carry" is
  incomplete: the language asks the theme next, and the parse takes a check.
- `docs/notices.md:60` — "`$notice` takes the theme's `warning` colour, which replaces a configured
  `fg` on it" is incomplete: a colour written in the format now beats `warning`.
- ADR 0003's "`fg` and `bg` are not modifiers" is retired by this change; the design's docs pass adds
  ADR 0021 to record it.

## Not verified

- Joel's live checks: `|muted` looking faint on pi's system theme (D11), and the real 49-name table
  against a live pi. The suite proves the rule against `fakeTheme`, by behaviour, and no test reads
  pi's files (T11).
- The two accepted differences the design records but does not require: a getter with a side effect
  running at arrival (`defaultFormat: 5` beside a `variableFg` getter that posts), and a field type
  posted as an object being quoted as it reads at the vet. The spike keeps the copy's behaviour those
  differences come from and does not test them, as the design accepts rather than requires them.
- `tests/registration.test.ts:598` and `:1217` (a composed select swapped after registering) were not
  re-run in isolation; the whole 538-test base suite passes in the spike tree, which includes them.
- The version-skew and rollback claims in the design's Migration Plan are not runnable here.

## Gaps

Every place the design, the specs or the plan did not survive contact with the code.

- **The change directory has no `tasks.md`.** The brief names the design, the deltas, the owner rulings
  and the design review as the contract, and they are enough to build and prove the change, but the
  "Spikes and prototypes" section says the checks are labelled so `tasks.md` can cite them, and there
  is no file to cite them from. Labels A1-A22, B1-B3, C1-C7, R1 and P1 above are therefore free-standing.
- **`fakeTheme` carries two usable colours, not the delta's example names.** The statusline delta's
  scenarios write `|toolDiffRemoved`, `|muted` and `|selectedBg`. `tests/fake-theme.ts` has no
  `toolDiffRemoved` or `muted`, and the harness's session theme is `fakeTheme()` with no overrides, so
  a format-level check adds the name through `fakeTheme({ toolDiffRemoved: … })` and a session-level
  check uses `accent`, a name the fake theme already carries. The design's sentence "the check is built
  from it, and its ten foreground names, its overrides … already carry the provenance test" is right
  about the provenance test and silent about the scenario names, which need an override in the test
  that uses them.
- **The delta's "A configured foreground" scenario for thinking** (the level's colour replacing a
  configured `fg`) is a pin that already holds at `cf90995`, because the built-in token was already
  applied over the style. The new half is only "unless the format names a colour for `$level`", which A21
  proves. The delta reads as though both halves were new.
- **C2's "exactly one of them quotes the name"** cannot mean the instrument's name: the unknown-name
  notice and the refusal both quote `"taiknr.savings"`. The check asserts what can be true — exactly
  one message quotes `|notacolour` — and the delta's sentence should say the colour.
- **The default-row and no-document binds take the check only through `readConfiguration`.** The three
  early returns (no document, unreadable document, rejected document) bind the default row with the
  check built from `source.theme`, which is right, but the design's row for `configuration.ts` lists
  `instrumentBindings(check)` at `:550` as if it were a separate site; it is one line in
  `readConfiguration`, before the path is chosen.
- **The copy's per-member functions are not in the contract's member order** and do not need to be:
  `copyThrough` reads each named member once, so the vet sees every member regardless. The design's
  sentence "Each member the table names is read exactly once, by property access" holds; nothing fixes
  an order, and nothing should.
- **`docs/formats.md`, `docs/configuration.md`, `docs/extension-authors.md`, `docs/notices.md`,
  `ARCHITECTURE.md` and `AGENTS.md` are now false or incomplete** in the lines listed above. The design
  assigns them to its docs pass; no task in this change was allowed to edit them, and none did.
