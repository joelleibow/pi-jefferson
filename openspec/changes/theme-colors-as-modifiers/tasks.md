# Tasks

Every existing path below is the design's Module & File Placement table row for that file (the change's
one home for the files it touches, `michael-council-rulings.md` row 9), and every one of them was built
in the spike against base `cf90995` (`redgreen-derek.md`, "How the spike ran"). The change adds no
source file.

A behavioural test the spike ran carries its `redgreen-derek.md` label (A1-A22, B1-B3, C1-C7, P1, R1)
where it is named; a test the spike did not run is marked **new** where it is named, with its own measured
red or the mutation that shows it catching. `S0` is that report's label for the 538 tests that shipped at
`cf90995` all still passing. Task 2.1 is a refactor with no behaviour change, verified by its pins and a
search. Where a task rests on a measurement rather than a test, the measurement's `M`-label is cited.

**How the required signatures ripple.** Task 1.2 makes three parameters required at once: `parseFormat`'s
check, `adaptProvidedDeclaration`'s fifth parameter `check: ForegroundCheck`, and `instrumentBindings`'
first parameter `check: ForegroundCheck`. So `tsc` names every site in one pass:

- the 8 `parseFormat` production sites: `configuration.ts:177`, `:227`, `:298`, `:327` and
  `instrument-binding.ts:237`, `:248`, `:283`, `:299`;
- the 2 `instrumentBindings` production calls: `configuration.ts:483` and `:550`;
- the 1 `adaptProvidedDeclaration` production call: `registration-listener.ts:114`;
- in the tests, 42 `parseFormat` calls, 10 `instrumentBindings` sites and 5 `adaptProvidedDeclaration`
  calls.

Every boundary that holds a theme gets its final threading in 1.2. The listener holds no theme until task
3.2. Until then its vet passes a module-private check that accepts no name,
`(_name: string): _name is ThemeColor => false`. That is what its vet at arrival accepts at `cf90995`
(M5). Task 3.2 deletes it, and it carries no `shortcut:` comment, because it does not survive the change.
The parser consults no check until task 1.4, so the suite is at S0 through 1.2, and through 1.3 at S0
except the six expectations task 1.3 rewrites to the new sentence.

## File Boundary

| Path | Action | What changes and why |
| --- | --- | --- |
| `extensions/jefferson/format.ts` | Modify | Owns the format language. Gains `ForegroundCheck` and `foregroundCheck(theme)` beside `validateStyle`, which asks it for a string `fg`; `parseFormat` takes the check as a required third parameter and reads a name in the one order; the literal and variable `FormatSegment` members gain `colour?: ThemeColor`; the form gate also refuses a segment that carries a colour; `resolveFormat` decides a piece's foreground before styling. |
| `extensions/jefferson/components/instruments/instrument-binding.ts` | Modify | Owns turning a registration into bindings. `adaptProvidedDeclaration` and the bind's re-parse take the check; `instrumentBindings` takes it as its first parameter; the `variableFg` guard asks `foregroundCheck(theme)` of the theme the render is handed; `ProvidedRefusal`'s `unparseable-default-format` variant carries the parser's message. |
| `extensions/jefferson/registration-listener.ts` | Modify | Owns hearing and vetting a message. Copies every provider message at arrival through member tables typed against the contract; returns a handle with `receiveTheme(theme)`; holds, drains once through the one vet path with per-message containment, then stays live; builds the `unparseable-default-format` warning from the parser's message. |
| `extensions/jefferson/startup.ts` | Modify | Owns the order of a session. Keeps the listener handle it creates and calls `receiveTheme(ctx.ui.theme)` first thing in every `session_start`, before the mode check and the read; carries the pin fact about the theme's name set. |
| `extensions/jefferson/configuration.ts` | Modify | Owns reading a document. `readConfiguration` builds `foregroundCheck(source.theme)` once and passes it to `normalizeDocument`, `readInstruments`, `checkProvidedSettings`, the watch and both `instrumentBindings` calls; the settings-parse warning becomes the possessive template. |
| `tests/format.test.ts` | Modify | The language's behaviour: 35 existing `parseFormat` calls take the check, as do the new cases' calls, `:259-264` moves `accent` to accepted while `bd` and `fg` stay refused, `:383-405` follows the new message, and the order, precedence and theme-provenance cases are added. A8 and A9 use one new local declaration, the `$price` fixture task 1.4 writes out. It is shaped like the local declaration at `:215` and does not reuse it. |
| `tests/instrument.test.ts` | Modify | 6 `parseFormat` calls and 7 `instrumentBindings` sites take the check; the thinking, notice and label precedence cases are added. |
| `tests/row-renderer.test.ts` | Modify | 1 `parseFormat` call and the 2 `instrumentBindings` sites take the check. |
| `tests/session-data-feed.test.ts` | Modify | The `instrumentBindings` site takes the check. |
| `tests/configuration.test.ts` | Modify | The document-path cases: `:1090`'s expectation follows the parser's own sentence; B1 and B3 read a document whose format names a colour and a background name; and the document-level plain-format test at `:1362-1372` gains the `{ miss: "$tokens|accent" }` row. |
| `tests/registration.test.ts` | Modify | Both load orders through the real wiring: the rewritten fixed texts at `:353`, `:416`, `:950`, `:1211` and `:1980-1986`; the refusal-part tables' new rows; the containment case (C6) and the live-first pin, each in both orders; the held-`variableFg` case; `receiveTheme(fakeTheme())` at `:660-669`; the five `adaptProvidedDeclaration` calls, which take the module-level `fgCheck`; the guard pair beside `:1956-1967`; the colour-in-a-default-format proof in both orders; the covered-colour-function case (C4); and the getter-order pin, a getter that emits during another message's copy, in both orders. `:598`, `:1217` and `:1797-1806` stay unchanged. |
| `tests/jefferson.test.ts` | Modify | The pinned export list for `format.ts` gains `foregroundCheck`; the file-coverage part is unchanged, because no file is added. |

`tests/fake-theme.ts` is **unchanged**: the check is built from it, and its ten foreground names, its
overrides and its slot-answering lookup already carry the provenance test (design, ruling 13).
`tests/session-harness.ts` is **unchanged** too: its theme is `fakeTheme()`, which already carries
`accent` (`:158`, `:175`).

**Delete:** none.

**Not a task in this change.** Post-merge behaviour — version skew in both directions, rollback, the
`release:minor` label, the 0.15.0 release — is `design.md`'s Migration Plan. No task edits a Markdown
file. The docs pass does, after the implementation gate, from the list in the design's Migration Plan,
"The docs pass, inside this change".

## 1. The format language owns the foreground check and the colour

- [x] 1.1 Write the failing tests first: the export pin at `tests/jefferson.test.ts:232-305` lists
  `foregroundCheck` and stays red until `format.ts` exports it (R1; red at `cf90995` as
  `AssertionError: ../extensions/jefferson/format.ts + 'foregroundCheck'`); and **the check's pair
  (new)**, asserted directly on `foregroundCheck` in `tests/format.test.ts`, whose import from
  `../extensions/jefferson/format.ts` gains it:
  - `foregroundCheck(fakeTheme({ invented: "\x1b[35m" }))("invented")` is `true`;
  - `foregroundCheck(fakeTheme())(name)` is `false` for each of `bashMode`, `selectedBg`,
    `Accent`, `constructor`, `toString` and `__proto__`. An inherited name is refused because pi's lookup
    and `fakeTheme`'s are both Maps; `selectedBg` is a background name and `Accent` a case variant.

  The pair is red at `cf90995` as `SyntaxError: The requested module
  '../extensions/jefferson/format.ts' does not provide an export named 'foregroundCheck'`, the whole file
  failing to load, which is the red a new export has; it is green once the export exists (measured: 69
  pass, `tsc` clean). Then add to `extensions/jefferson/format.ts`
  `export type ForegroundCheck = (name: string) => name is ThemeColor` and
  `export function foregroundCheck(theme: Theme): ForegroundCheck`, the only code that calls `getFgAnsi`
  for a foreground name: a name is a colour when the call returns, and not when it throws (design, "One
  foreground probe"). `validateStyle` asks that check for a string `fg` and keeps its `parseColor`
  fallback and its own `getBgAnsi` probe for `bg`, so none of its test sites move. The file-coverage part
  of the pin is unchanged, because no file is added. Verify: R1 and the check's pair green,
  `pnpm typecheck` clean, and `pnpm test` green.

- [x] 1.2 Write the failing check first: three parameters become required, each with no optional or
  lenient default — `parseFormat(declaration, format, check: ForegroundCheck, plain = false)`,
  `adaptProvidedDeclaration(name, declaration, view, record, check: ForegroundCheck)` and
  `instrumentBindings(check: ForegroundCheck, configured: ReadonlyMap<string, ConfiguredInstrument> = new
  Map())` — so `tsc` names every production site and every test call, as the preamble lists. The compile
  error is the work list, and a lenient default is exactly the mechanism M5 measured failing (a check that
  accepts nothing fails C1). Then:
  - in `components/instruments/instrument-binding.ts`, the two signatures above; the file's four parses
    pass the check their function receives (`:237`, `:248`, `:283`, `:299`). The bind gets no
    `try`/`catch`: it must never refuse what admission accepted, and a caught bind fault would hide a
    Jefferson inconsistency;
  - in `configuration.ts`, `readConfiguration` builds `foregroundCheck(source.theme)` once, and passes it
    to `normalizeDocument(document, reading, source, check)` and `readInstruments(raw, source, reading,
    check)`; to `checkProvidedSettings(name, raw, declaration, theme, check)`, both from `:272` and from
    the watch at `:511`, the last keeping `theme` for `validateStyle(entry.style, theme)`; and to
    `instrumentBindings(check, configured)` at `:483` and `instrumentBindings(check)` at `:550`, which is
    one line in `readConfiguration` before the path is chosen;
  - `registration-listener.ts:114` passes the interim check the preamble names, module-private to that
    file and written once;
  - each test file that parses, binds or adapts — `tests/registration.test.ts` included, for its five
    `adaptProvidedDeclaration` calls and task 2.1's guard pair — imports `foregroundCheck` from
    `../extensions/jefferson/format.ts` and declares one module-level `fgCheck =
    foregroundCheck(fakeTheme())` for the calls that choose no theme. `rendered` in
    `tests/format.test.ts` builds its check from the theme it renders with:
    `foregroundCheck(options.theme ?? fakeTheme())`. The seven `tests/instrument.test.ts` sites follow the
    design's row — `:366`, `:401`, `:436` and `:451` become `instrumentBindings(fgCheck)`, and `:389`,
    `:464` and `:483` become `instrumentBindings(fgCheck, map)` — and the five
    `adaptProvidedDeclaration` calls take `fgCheck` and keep their expectations.

  Boundary cases: `plain` stays the fourth, optional parameter and a plain parse consults no check,
  because a plain format refuses every `|name` before any lookup; a format with no `|name` at all still
  takes the check; the three early returns bind the default row with the read's check; a provided
  instrument that a row places, with no `instruments` entry, reaches the bind's re-parse with the read's
  check. Verify: `pnpm typecheck` clean and `pnpm test` green at the 538 tests that shipped at `cf90995`
  (S0).

- [x] 1.3 Write the failing tests first: `$model|selectedBg` refused naming `|selectedBg` (A3),
  `$model|acccent` refused naming `|acccent` (A4), `$model|Accent` refused naming `|Accent` (A6); in
  `tests/format.test.ts`, `:259-264` and the four form-refusal tests at `:383-405` following the new
  sentence, with `bd`, `accent` and `fg` all still refused; in `tests/configuration.test.ts`, `:1090`
  expecting `"model"'s format names neither a modifier Jefferson implements nor a foreground colour of the
  theme: "|bd"` (template 1), and a document whose format names a background colour rejected naming the
  instrument and `|selectedBg` (B3). Then make the parser own one sentence, which every path forwards:
  `format names neither a modifier Jefferson implements nor a foreground colour of the theme: "|<name>"`.
  At `cf90995`, changing only that sentence fails exactly six existing tests (measured) —
  `tests/format.test.ts:259-264`, the four at `:383-405`, and
  `tests/configuration.test.ts:1090`. Boundary cases: a background name and a misspelling get the same
  sentence, because they have the same remedy (design, "One refusal message"); a name the order refuses on
  `$bar` draws the order's own refusal (task 1.4); a plain format never reaches this sentence. Verify:
  those cases green;
  `rg -n "names a modifier it does not implement" extensions tests` returning nothing — at `cf90995` it
  returns `format.ts:115` and exactly the six expectations above (measured);
  `pnpm typecheck` clean and `pnpm test` green.

- [x] 1.4 Write the failing tests first, the colour's read and draw landing together:
  - **The language's cases.** A colour on a variable, `$model|toolDiffRemoved` (A1); a colour on literal
    text, `$model via|muted $provider` (A2); a colour after a form, `$path|relative|accent` (A7); a colour
    and an attribute in either order (A13); a colour beating the `style`'s `fg` while literal text keeps
    it (A14, measured fail under M2); a colour setting no attribute and clearing none, including against
    `{"bold": false}` (A15); a faint colour passing through, by comparing `$model|muted` with the style
    `{"fg": "muted"}` over one theme the way `tests/format.test.ts:145-147` compares (A16); text parsed
    against one theme drawn in the other theme's `muted` (A18); `$provider|accent|warning` rendering
    `warning` (A12); `$model|dim` keeping the attribute where the theme also carries a `dim` colour (A5,
    measured fail under M1); `$path|accent|relative` refused with the message naming `|relative` (A10,
    measured fail under M3); `$bar|accent` refused as `format puts a modifier on "$bar": "|accent"`
    (A11); a plain `$tokens|accent` still refused (A19, a pin); a name the theme has and a pi name the
    theme lacks, both judged through a format (A17); and `tests/format.test.ts:259-264` moving `accent` to
    accepted while `bd` and `fg` stay refused. A17 is two parses:
    `assert.doesNotThrow(() => parseFormat(named("model"), "$model|invented", foregroundCheck(theme)))`
    with `theme = fakeTheme({ invented: "\x1b[35m" })`, and
    `parseFormat(named("model"), "$model|bashMode", fgCheck)` throwing a message naming `|bashMode`. At
    the start of this task it is red as `format names neither a modifier Jefferson implements nor a
    foreground colour of the theme: "|invented"`, which is task 1.3's sentence; the spike's red at
    `cf90995` was the old sentence.
  - **A8 and A9, on the `$price` fixture.** One local declaration shaped like `tests/format.test.ts:215`'s
    fixture: `{ name: "fixture", defaultFormat: "$price", options: [], variables: { price: () => "4.10" },
    variableForms: { price: { accent: () => "the form" } } }`. Parse it with `parseFormat(declaration,
    format, fgCheck)` and draw it with `resolveFormat(declaration, segments, {}, seed, 80, fakeTheme())`.
    `$price|accent` selecting the declared form and not the colour renders `the form` (A8, a pin);
    `$price|bold|accent` taking the colour and no form carries `colour: "accent"` (A9).
  - **Through the binding.** The notice's format colour beats `warning` with text and columns unchanged,
    `$notice|accent` (A20); `$level|accent` beats the thinking level's colour while a bare `$level` keeps
    it (A21); and a label keeps the style while the value takes the colour (A22, measured fail under M2).
  - **Through a document.** An own instrument's format naming a colour is accepted and rendered with no
    warning (B1; red at `cf90995` as `was rejected ("model"'s format names a modifier it does not
    implement: "|toolDiffRemoved")`); a **new** `{ miss: "$tokens|accent" }` row in the document-level
    plain-format test at `tests/configuration.test.ts:1362-1372`, expecting `puts a modifier in a plain
    format: "|accent"`, which pins the notice requirement's "a colour included".
  - **The colour function the format covers.** A provided instrument whose colour function throws and
    which the document configures with `$saved|accent` draws no warning, and its `$4.10` is drawn in
    `accent`, because the built-in colour is consulted only for a piece the format does not colour (C4).
    Build it with `settingsDocument(t, { format: "$saved|accent" }, payload)`
    (`tests/registration.test.ts:842-859`, provider-first), where `payload` is a `registration` whose
    one instrument carries `variableFg: { saved: () => { throw new Error("provider"); } }`.
    `line(started)` is `Model: anthropic/claude-opus-4 $4.10`, because the document's format replaces the
    default format and the fixture has no default label, so no `Savings:` is drawn; `rawLine(started)`
    includes `fakeTheme().style("$4.10", { fg: "accent" })`. Then `await settle()` (`:1103`), and only
    then assert `started.notified` is `[]`, in the order `:1346-1360` uses. The order is not cosmetic: a
    fault notice arrives only after a render and a tick — at `cf90995` the same sequence with `$saved`
    draws `"taiknr.savings" failed to render: its colour threw`, where reading `notified` first draws
    `[]` (measured). Place it beside the colour-fault tests at `tests/registration.test.ts:1467-1482`,
    asserting on the warnings the harness collects, with no spy on internals. It is red at the start,
    because the settings check refuses `$saved|accent`; once that parse is accepted it stays red until the
    pick skips the colour function that throws.
  - **Each check's theme.** Any SGR string serves as an override value. A17:
    `fakeTheme({ invented: "\x1b[35m" })`, the theme its first parse takes. A1: `rendered("model",
    "$model|toolDiffRemoved", { theme: fakeTheme({ toolDiffRemoved: "\x1b[38;5;1m" }) })`. A2 and A16:
    one `fakeTheme({ muted: … })` passed to `rendered`, A16 comparing `$model|muted` with
    `rendered("model", "$model", { theme, style: { fg: "muted" } })`. A5: `fakeTheme({ dim: … })`. A18:
    two themes with different `muted` values, parsed with `parseFormat(named("model"), "$model|muted",
    foregroundCheck(first))` and drawn with `resolveFormat(…, second)`. B1: `readDocument(document, theme)`
    with `theme = fakeTheme({ toolDiffRemoved: … })`, drawing the cell with
    `cell.holder.current.render(seed, 80, theme)` and not with `cellText`, which draws with `fakeTheme()`.
    Session-level checks — C1, C2, C4, C6 and the order pin — use `accent`, which the harness's
    `fakeTheme()` carries (`tests/session-harness.ts:158`, `:175`).

  Then, in `format.ts`: add `colour?: ThemeColor` to the literal and variable `FormatSegment` members,
  present only when the chain names one; read a name in the one order — a form directly after its variable
  and once, then Jefferson's own names, then a foreground colour of the theme, then a refusal — and add
  the form gate's second condition that the segment carries no colour. `resolveFormat` picks a piece's
  foreground as the first that applies — the segment's colour; the variable's built-in colour, asked only
  when the segment carries none; the merged `style`'s `fg` — and draws the piece with one `theme.style()`
  call, as today. Show M1, M2 and M3 each failing its check, then revert. Two mutations of this change's
  own also show the pins catching, and they are not `redgreen-derek.md`'s labels:
  - **plain-first**, consulting the colour lookup before the plain refusal (`format.ts:101`): A19 fails,
    because the plain `$tokens|accent` is accepted, and the `{ miss: "$tokens|accent" }` row goes through
    the same plain parse at `configuration.ts:327` and fails with it (measured with a prototype parser);
  - **form-first**, consulting it before the form branch while keeping the plain refusal first: A8 fails,
    because `$price|accent` takes `colour: "accent"` and no form (measured).

  Revert each. Boundary cases: a segment with no colour carries no `colour` key at all, so the
  `deepEqual` assertions at `tests/format.test.ts:100`, `:169`, `:376-379` and `:493-503` stay
  unchanged (`node:assert/strict` treats an own `undefined` as
  different from an absent key); two colours on one piece keep the later one; a `|` with no name after it
  stays literal text; no colour in the chain renders exactly as today; a `bg` and the boolean attributes
  merge unchanged; a label has no format, so nothing here colours it; the same colour-throwing instrument
  with no colour in the format still records its colour fault, unchanged from `cf90995` (S0). Do not fold
  the colour into the merged `ThemeStyle`: M2 is that measurement. Verify: those cases green,
  `pnpm typecheck` clean, `pnpm test` green.

## 2. The binding's own probe gives way to the language's check

- [x] 2.1 A refactor with no behaviour change: replace the `variableFg` guard's own foreground probe with
  `foregroundCheck(theme)` built from the theme the render is handed, at that render and not before, so
  `format.ts` stays the one home of the rule and the guard answers the same names a format does. **The
  guard pair (new)**, written first, in `tests/registration.test.ts` beside "A1 a provider variable reads
  its view" (`:1956-1967`):
  - **Setup.** Each half adapts `{ name: "savings", variables: { saved: () => "$4.10" },
    variableFg: { saved: () => token }, defaultFormat: "$saved" }` with
    `adaptProvidedDeclaration("taiknr.savings", declaration, () => ({}), fault => faults.push(fault),
    fgCheck)`, then calls the adapted declaration's own `variableFg`, as `:1964` calls its `variables`.
  - **First half.** With token `"invented"`,
    `adapted.variableFg?.saved?.("$4.10", fakeTheme({ invented: "\x1b[35m" }))` is `"invented"` and no
    fault is recorded.
  - **Second half.** With token `"bashMode"`, `adapted.variableFg?.saved?.("$4.10", fakeTheme())` is
    `undefined`, and exactly one fault is recorded, with the part `"taiknr.savings" failed to render: its
    colour returned "bashMode", where a theme colour is declared`.
  - **Green throughout.** Both halves are green at `cf90995` (measured, with the four-parameter signature)
    and stay green through this task.
  - **Shown catching, then reverted:** replace the guard's probe with a literal list of `fakeTheme()`'s ten
    foreground names and the first half fails; make the guard accept every string and the second half
    fails. Both were measured at `cf90995`.
  - **Why not the harness.** The pair goes through the adapter, because the harness's theme is a fixed
    `fakeTheme()` (`tests/session-harness.ts:158`, `:175`), which stays unchanged.

  The rest of its pins are the colour cases at `tests/registration.test.ts:1467-1482`, all green at
  `cf90995` and after. Its check: `rg -n "\.getFgAnsi\(" extensions/jefferson` counts calls, not
  mentions, and returns two lines before the task — `format.ts`'s `foregroundCheck`, after task 1.1, and
  `instrument-binding.ts:201` — and exactly one after, inside `foregroundCheck`. At `cf90995` the same
  search returns `format.ts:163` and `instrument-binding.ts:201` (measured). Boundary cases:
  a provided `variableFg` naming a theme colour still renders it and one that throws still records its
  colour fault, both unchanged from `cf90995` (S0); `validateStyle`'s `parseColor` fallback is never
  reached by a `|name`, which is always a string of name characters. Verify: the guard pair and the colour
  cases green, that search returning one line, `pnpm typecheck` clean and `pnpm test` green.

## 3. The listener holds, and the session hands it a theme

- [x] 3.1 Write the failing tests first, the copy at arrival, built while the listener still vets at
  arrival with task 1.2's interim check: the refusal-part tables' new rows — `fields: "x"`, `variables:
  "x"`, a `null` registration, a `null` report, an own `__proto__` field name and **a `variables` row
  (new)** — keep today's texts (P1, a pin). The `variables` row is
  `from({ instruments: [{ ...savings, variables: { ...savings.variables, ...JSON.parse('{"__proto__":5}') } }] })`
  in "A2 every registration refusal part is exact" (`tests/registration.test.ts:320-391`), expecting
  `"taiknr.savings" carries a variable "__proto__" that is not a function`; it is green at `cf90995` and
  under a defining copy (measured). Show P1 catching each, then revert: a copy that maps a wrong-shaped
  value by its entries, a copy that reads the table off a posted `null`, and a copy that assigns its
  entries each change one row's text, as the design's "The copy, at arrival" › "The measurement" records;
  the assigning copy now changes two rows, the `fields` `__proto__` row and this one, which draws no
  warning (measured).

  **C5, provider-first.** Post `registration` with `variableFg: { saved: () => "accent" }` on its one
  instrument, and the report `$4.10`, with rows `[[model, taiknr.savings]]`. Set `variableFg.saved = 5`
  before the session starts. Assert the line is `Model: anthropic/claude-opus-4 Savings: $4.10`, and after
  `settle()`, `notified` is `[]`.

  **C7, in both load orders.** Post `registration`; post the report object `{ extension: "taiknr",
  field: "saved", value: 42 }`; set its `value` to `"$4.10"`, then post the same object again. Assert the
  line is `Model: anthropic/claude-opus-4 Savings: $4.10`, and exactly one warning arrives,
  `pi-jefferson: taiknr reports "saved" as a number, and it declared string`.

  Both were measured at `cf90995` and under a hold with a copy at arrival. C5 and C7 pass here, because
  nothing is held yet; task 3.2 shows them catching M4, where both fail in the provider-first order
  (measured). Then add the copy at arrival: one member table per contract shape, typed
  `as const satisfies Record<keyof ProvidedDeclaration, …>` with matching tables for `ComposedFormat`,
  `Registration` and `Report`; maps copied by defining their own enumerable entries and never by assigning
  them;
  `variableForms` copied two levels; lists by their elements; `composed` by its own members; every other
  member kept as posted; the message itself copied only when `isPlainObject` accepts it. Show the table
  catching a mistake the way M6 did: add a member to `ContractDeclaration`, confirm `tsc` fails with
  TS2741 at the table until the table names it, then revert. Boundary cases:
  - **Proved by P1:** a posted `null` registration and report; `fields: "x"`; `variables: "x"`; an own
    `__proto__` field name; an own `__proto__` key on a `variables` map.
  - **Proved by tests that ship unchanged (S0):** a posted primitive
    (`tests/registration.test.ts:217-227`); an array (`:325`); `instruments` not a list (`:335`); an
    `instruments` element that is not an object (`:337`); a composed select that is not a function
    (`:370`); `options` not a list of strings (`:373`); a report primitive (`:427`).
  - **Proved in a later task:** a `toJSON`, by task 3.2's live-first pin; a `BigInt` field type, by task
    3.3's C6.
  - **None:**
    - `undefined`: it takes the same `isPlainObject` guard as `null`, which P1 pins, and the design's
      "The measurement" records it alike;
    - a cycle: the copy goes no deeper than the contract's shape, so it never walks one, and a cycle kept
      as posted throws at the vet's `JSON.stringify`, which is C6's class (design, "What provider code
      the drain can run");
    - a `composed` that is not a plain object: the shape rule is one rule, and P1's `fields: "x"` and
      `variables: "x"` rows pin it;
    - the two accepted differences (design, "Two accepted differences from today"): a getter with a side
      effect runs once at arrival, even past the first fault, and a field type posted as an object is
      quoted as it reads at the vet. There is no test for either, and no code avoids them. The copy reads
      each named member once at arrival, never lazily in the vet's order, which the design rejects.

  Verify: P1, C5 and C7 green, `:598` and `:1217` green in the provider-first order, `pnpm typecheck`
  clean and `pnpm test` green.

- [x] 3.2 Write the failing test first: **C1**, a provided instrument a row places, with no `instruments`
  entry, whose default format names a colour, registers and renders in that colour with no warning, in
  both load orders. Its fixture: call
  `registeredRow(t, payload, [{ instrument: "taiknr.savings" }], [saved("$4.10")], order)` for each
  `order`, where `payload` is `registration` with its one instrument's `defaultFormat` set to
  `"Savings: $saved|accent"`. Assert in the order `:1346-1360` uses: `line(session)` is
  `Savings: $4.10`; `rawLine(session)` includes `fakeTheme().style("$4.10", { fg: "accent" })`; then
  `await settle()`; then `session.notified` is `[]`. It is red at `cf90995` in both orders as
  `AssertionError: provider-first`, because the row rendered `blank`'s placeholder and two warnings
  arrived (measured): `… row 1: "taiknr.savings" is not a known instrument`, then `pi-jefferson:
  "taiknr.savings" carries a default format Jefferson cannot parse; taiknr reports "saved" without a
  registration`. It is red at the start of this task too, because the listener still vets at arrival with
  task 1.2's interim check, which accepts no name: M5. Then delete the interim check, and give the
  listener's factory a handle with one method, `receiveTheme(theme:
  Theme): void`, the first call's job being to build the check from the theme. Make `startup.ts` keep that
  handle and call it on the object `ctx.ui.theme` returns first thing in every `session_start` — before
  the mode check, before `readConfiguration` — never on `ctx`. From the factory until that call the
  listener holds: a message is copied at arrival and queued, taking its place when its copy completes.
  The first call goes live, then drains the queue in arrival order through the one vet-and-apply path, so
  each message is vetted once and whole, a refusal of one does not stop the drain, and a report queued
  behind a refused registration fails as `report-no-registration`. Nothing is queued once the listener is
  live, a later call replaces the theme the check asks and drains nothing, and a session that never runs
  `session_start` leaves queued copies unvetted, which nothing observes.

  **Logging:** none at arrival, at going live or at the drain, and no log field is added. The extension
  writes no console output (`rg -n "console\." extensions/` is empty at `cf90995`). What an operator sees
  is the fault notice delivered at `resources_discover` (`startup.ts:64`) and what renders. A drained
  refusal reaches the user as that notice. A message that is never drained renders nothing and warns
  nothing, because nothing renders before `installFooter`. This change's one console line is task 3.3's
  containment line, which reproduces the line pi's bus writes for a live message. The error behaviour at
  this boundary is task 3.3's containment.

  Record the pin fact beside `startup.ts`'s existing pin note: every theme pi loads at the pin carries the
  same 49 foreground names, which is why no guard runs at render, re-checked at every pin bump. The one
  expectation this task
  rewrites is the listener-level test at `tests/registration.test.ts:660-669`, which calls
  `receiveTheme(fakeTheme())` on the handle before it emits, because a held message is not accepted until
  the handle is called. **Show M4:** queue the posted object instead of its copy, confirm that C5, C7,
  `:598` and `:1217` fail, then revert. Boundary cases:
  - **A getter that emits during another message's copy**, a **new** pin in both orders:

    ```ts
    h.events.emit("jefferson:registration", {
      get extension() {
        h.events.emit("jefferson:registration", { extension: "acme" });
        return "taiknr";
      },
      instruments: 5,
    });
    ```

    It draws one warning, `pi-jefferson: registration from "acme" carries no instruments;
    registration from "taiknr" carries no instruments` — measured identical at `cf90995` and under a
    hold with a copy at arrival. Show it catching: make the outer message take its queue place before
    its copy completes, and the provider-first text inverts (measured); then revert.
  - **A message posted during the drain is vetted at once**, the **live-first pin**, **new**, in both
    load orders, with document rows `[[{ "instrument": "model" }]]`:

    ```ts
    h.events.emit("jefferson:registration", {
      extension: "taiknr",
      fields: {
        saved: {
          toJSON() {
            h.events.emit("jefferson:registration", { extension: "acme" });
            return "array";
          },
        },
      },
      instruments: [],
    });
    ```

    Render, `await settle()`, then assert that `notified` is exactly
    `[{ message: 'pi-jefferson: registration from "acme" carries no instruments; registration from
    "taiknr" declares "saved" as "array", which is not string, number or boolean', type: "warning" }]`,
    and that no `console.error` line was written. It is green at the start of this task, because the vet
    still runs at arrival, and after this task; it was measured identical at `cf90995` and under a hold
    that goes live before draining. Show it catching: make the drain go live only after it ends, and the
    provider-first warning loses its first part and reads `pi-jefferson: registration from "taiknr"
    declares "saved" as "array", which is not string, number or boolean` (measured); then revert. It is
    the proof of "goes live, then drains".
  - **Already proven, no new test:** a report queued behind a refused registration fails as
    `report-no-registration`, proven by C2b (task 3.4); nothing is queued once the listener is live,
    proven by C1's Jefferson-first order.
  - **With no test:** a later `receiveTheme` replaces the theme and drains nothing — none, because nothing
    is queued once live and every theme in one process carries the same names (ruling 10);
    `receiveTheme` running before the mode check — none, because outside `tui` Jefferson renders nothing
    and delivers no warning (`startup.ts:53`, `:112`), so no session can observe the drain, and the
    implementation gate reads `startup.ts` for it; a session that never runs `session_start` — none, for
    the reason the paragraph above gives.

  Jefferson's own payload is accepted by identity and never queued, so `tests/registration.test.ts:1797-1806`
  stays unchanged and remains the proof that every shipped name registers with no theme ever handed
  (ruling 2(d)). Verify: C1 green in both orders, `pnpm typecheck` clean and `pnpm test` green.

- [x] 3.3 Write the failing tests first: a payload that throws while vetting is contained (C6) — a
  registration whose `fields` is `{ saved: 1n }`, then a well-formed registration a row places, in both
  load orders: the footer installs, the second instrument renders, no warning is drawn, and exactly one
  `console.error` line `Event handler error (jefferson:registration):` is written, with the error object.
  The well-formed registration is `{ extension: "acme", fields: { x: "string" },
  instruments: [{ name: "x", variables: { x: () => "ok" }, defaultFormat: "Acme $x" }] }`, the document
  rows are `[[{ "instrument": "model" }, { "instrument": "acme.x" }]]`, and the asserted line is
  `Model: anthropic/claude-opus-4 Acme ok`. At `cf90995` pi's bus writes that one line in both orders
  (measured); after this task Jefferson's containment writes it in the provider-first order.
  C6 is red at the start of this task in the provider-first order, because the drain from task 3.2 is
  uncontained: a BigInt field type throws in the drain and session start throws (design, the hold
  decision's proof paragraph: an uncontained hold fails the BigInt case in the provider-first order). Then
  vet each drained message inside its own containment and log its throw with `console.error(\`Event handler
  error (${channel}):\`, error)`: the channel field is that message's own, `jefferson:registration` or
  `jefferson:update`, and the error object is passed, not stringified. Nothing is accepted, recorded or
  warned for a message that throws, and the drain goes on to the next. Boundary cases: a throw in the
  second message after an accepted first — none, because the containment is per message, so this is C6's
  path with the order reversed; a payload that posts a message while it throws — none, because the posted
  message is vetted at once, the listener being live (task 3.2's live-first pin), and the throw is
  contained as C6's is. Both load orders' outcomes identical is C6's own assertion. Verify: C6 green in
  both orders and `pnpm test` green.

- [x] 3.4 Write the failing tests first, the registration arm's text landing together with the
  `ProvidedRefusal` variant change:
  - `tests/registration.test.ts:1982` and `:1986` each expect
    `{ refused: "unparseable-default-format", message: 'format names a variable it does not declare:
    "$spent"' }`. The adapter's parse runs before its label check, so the two-fault payload at `:1986`
    carries the same message;
  - `:353` and `:416` expect `"taiknr.savings"'s default format names a variable it does not declare:
    "$spent"`, and `:1211` expects `"taiknr.usage"'s default format names neither …: "|name"`;
  - **a modifier on the bar (new)**, a row in "A2 every registration refusal part is exact"
    (`tests/registration.test.ts:320-391`), whose payload is
    `from({ instruments: [{ ...savings, bar: () => 50, defaultFormat: "Savings: $saved $bar|bold" }] })`,
    expecting `"taiknr.savings"'s default format puts a modifier on "$bar": "|bold"`. It is red at the
    start of this task as `"taiknr.savings" carries a default format Jefferson cannot parse` (measured at
    `cf90995`), and green with template 3 over the parser's message, `format puts a modifier on "$bar":
    "|bold"` (measured);
  - C2: a provider's default format naming a name the theme lacks is refused whole, alike in both orders —
    the row renders `blank`'s placeholder, the row's other instruments render theirs, two warnings arrive
    in that order (the row's unknown-name notice, then the refusal naming the instrument and
    `|notacolour`), exactly one message quotes the colour, and session start still resolves. It is red at
    the start of this task, because the arm still writes `carries a default format Jefferson cannot
    parse`;
  - **C2b**, in both load orders:
    `registeredRow(t, payload, [{ instrument: "model" }, { instrument: "taiknr.stubs" }],
    [saved("$4.10")], order)`, where `payload` is `{ extension: "taiknr", fields: { saved: "string" },
    instruments: [registration's `savings` with `defaultFormat: "Savings: $saved|notacolour"`,
    { name: "stubs", variables: { stubs: () => "3" }, defaultFormat: "Stubs: $stubs" }] }`. Assert: the
    line begins `Model: anthropic/claude-opus-4` and contains no `Stubs:`. After `await settle()`,
    exactly two warnings arrive: the first ends `row 1: "taiknr.stubs" is not a known instrument`, and
    the second is exactly `pi-jefferson: "taiknr.savings"'s default format names neither a modifier
    Jefferson implements nor a foreground colour of the theme: "|notacolour"; taiknr reports "saved"
    without a registration`. It is red at the start of this task, because the second warning still reads
    `… carries a default format Jefferson cannot parse; taiknr reports "saved" without a registration`
    (measured at `cf90995`, both orders).

  Then change the variant to `{ refused: "unparseable-default-format"; message: string }`, carrying the
  message `adaptProvidedDeclaration` takes from the caught error (`instrument-binding.ts:236-240`) by the
  repository's convention for a caught parse error (`configuration.ts:298-301`): `catch (error) { if
  (!(error instanceof Error)) throw error; return { refused: "unparseable-default-format", message:
  error.message }; }`. `parseFormat` throws only through `formatError`, so only the first branch runs.
  Compose `pi-jefferson: "<name>"'s default format <the parser's sentence>` in the arm from it. C2b
  proves the refusal takes its siblings, its fields and its later reports. **Show the mutation:** writing
  `String(error)` in place of `error.message` fails `:1982` with `Error: format …`, then revert
  (measured). Boundary cases: a composed format's parse fault keeps its own
  text, unchanged: the registration's `unparseable-composed-format` (`tests/registration.test.ts:382-384`);
  a registration whose only fault is `fields: "x"` reads as today (P1); an unknown name in a default
  format is refused whole, alike in both orders; the two orders' outcomes identical once the
  document's path is stripped.

  **C2's other three setups (new)**, each in both load orders and identical across them: each renders,
  awaits `settle()`, then reads `notified`. Each is red at the start of this task for C2's reason, the arm
  still writing the old text. Template 3's refusal is `pi-jefferson: "taiknr.savings"'s default format
  names neither a modifier Jefferson implements nor a foreground colour of the theme: "|notacolour"`.
  - **C2-no-document.** No configuration file. The default row's placeholders render, and one warning
    arrives: template 3's refusal.
  - **C2-rejected.** The document `{ "rows": 5 }`. Two warnings arrive in this order: `pi-jefferson:
    <path> was rejected (the rows value is not a list); rendering the default row`, then the refusal.
  - **C2-no-row.** A document whose one row is `[{ "instrument": "model" }]`. The row renders `Model:
    anthropic/claude-opus-4`, and the refusal arrives alone.

  Each shape was measured at `cf90995` with today's refusal text. Verify: those expectations, C2, C2's
  other three setups and C2b green, `pnpm test` green at the end of this group.

## 4. The document read forwards the parser's reason

- [ ] 4.1 Write the failing test first: the settings-parse warning becomes `pi-jefferson: "<name>"'s <the
  parser's sentence>; it renders blank`, so `tests/registration.test.ts:950` expects `"taiknr.savings"'s
  format names neither a modifier Jefferson implements nor a foreground colour of the theme: "|wobble"; it
  renders blank`. That loop at `tests/registration.test.ts:936-968` is also the proof of the delta's
  scenario "A provided instrument's format names a colour the theme does not have": once its `:950` row is
  written as template 2, the loop asserts exactly one warning quoting `|wobble` (`:965`), the rest of the
  row (`:966`), and the refused instrument blank (`:967`). Then compose template 2 in `configuration.ts`
  from the parser's message by the convention task 3.4 states (`configuration.ts:298-301`): the catch
  begins `if (!(error instanceof Error)) throw error;`, then reads the undeclared-variable regex over
  `error.message`, and returns `settings-parse` with the part
  `${JSON.stringify(name)}'s ${error.message}${consequence}` when the regex finds nothing — for every
  parse fault except an undeclared variable, which keeps `settings-variable`'s text. Boundary cases:
  an undeclared variable keeps `settings-variable`'s text, which already quotes the variable; a settings
  `formats` kind's parse fault keeps its own text, unchanged (`tests/registration.test.ts:959-960`); a
  thrown value that is not an `Error` is rethrown; it cannot happen, because `parseFormat` throws only
  through `formatError`.
  Verify: that expectation and that scenario green, `pnpm test` green at the end of this group.

## 5. The finished tree, proved whole

- [ ] 5.1 Run `pnpm typecheck` and `pnpm test` on the finished tree, and confirm the 538 tests that
  shipped at `cf90995` all pass (S0), alongside the 26 checks and 7 pins `redgreen-derek.md` lists.
  Boundary cases: none. Verify: both commands clean, and the counts stated in the PR.

- [ ] 5.2 Re-run each check a later task could have changed, now against the finished code: the export pin
  (task 1.1); the rewritten expectations (tasks 1.3, 3.4 and 4.1); the harness proofs — task 1.4's C4,
  provider-first through `settingsDocument`, and in both orders task 3.2's C1, its getter-order pin and
  its live-first pin, task 3.3's C6, and task 3.4's C2 with its three setups; and a check that the interim
  is gone: `rg -n "is ThemeColor => false" extensions/jefferson` returns nothing, which is the interim's
  exact text from the preamble. `tsc` would not catch a dead copy, because the tsconfig sets no
  `noUnusedLocals` (measured). Then walk both delta specs against the coverage table below; a scenario no
  task proves is a gap to report to the conductor, not a test to invent here.

- [ ] 5.3 **(Joel's — the writer never ticks this; the conductor ticks it with his observation in his
  words.)** In his own session on pi's system theme, watch that `|muted` looks faint and that a name taken
  from the live 49-name table colours a piece, because the suite proves the rule against `fakeTheme` by
  behaviour and no test reads pi's files (D11; `redgreen-derek.md`, "Not verified").

### Scenario coverage

| Delta scenario | Task | Test |
| --- | --- | --- |
| statusline "One vocabulary for styling" | 1.1, 1.4 | the check's pair, A17, A1 |
| statusline "A variable can declare forms": "A form after literal text", "A form on a variable that does not declare it", "A form after another modifier", "Two forms on one variable" | 1.3 | `tests/format.test.ts:383-405`, one test per scenario |
| statusline "A form after a colour" | 1.4 | A10 |
| statusline "A modifier follows a variable or literal text": "A modifier on the width-taking variable" | 1.4 | A11 |
| statusline "The thinking level…": "A colour in the format" | 1.4 | A21 |
| statusline "A notice takes the colour…": "A colour in the format" | 1.4 | A20 |
| statusline "A style modifier only adds an attribute": "A modifier over an attribute set off" | S0 | `tests/format.test.ts:282-286`, "a modifier sets an attribute its instrument's style sets off", unchanged |
| statusline "…": "A colour sets no attribute" | 1.4 | A15 |
| statusline "…": "A colour leaves an attribute set off" | 1.4 | A15 |
| statusline "A foreground colour of the theme is a modifier": "A colour on a variable" | 1.4 | A1 |
| statusline "…": "A colour on literal text" | 1.4 | A2 |
| statusline "…": "A colour after a form" | 1.4 | A7 |
| statusline "…": "A form named like a colour" | 1.4 | A8 |
| statusline "…": "That name after another modifier" | 1.4 | A9 |
| statusline "…": "A colour and an attribute on one piece" | 1.4 | A13 |
| statusline "…": "A background colour" | 1.3 | A3 |
| statusline "…": "A name the theme does not have" | 1.3 | A4 |
| statusline "…": "A provided instrument's format names a colour the theme does not have" | 4.1 | `registration.test.ts:936-968`, the `:950` row |
| statusline "…": "dim is the attribute" | 1.4 | A5 |
| statusline "The colour a format names is the strongest colour": "Two colours on one piece" | 1.4 | A12 |
| statusline "…": "A colour over the style" | 1.4 | A14 |
| statusline "…": "A label keeps the style" | 1.4 | A22 |
| statusline "…": "A colour function the format covers" | 1.4 | C4 |
| statusline "A colour's name is the theme's own": "A case-different name" | 1.3 | A6 |
| statusline "…": "A faint colour" | 1.4, 5.3 (Joel's) | A16, and Joel's watch on pi's system theme |
| statusline "…": "The theme changes" | 1.4 | A18 |
| statusline "…": "The names are the theme's, not a copy" | 1.1, 1.4 | the check's pair (the rule), A17 (through a format) |
| instrument-registration "A provider's default format is checked against the theme": "A default format naming a colour" | 3.2 | C1 |
| instrument-registration "…": "A default format naming a name the theme does not have" | 3.4 | C2, C2b, C2-no-document, C2-rejected, C2-no-row |
| instrument-registration "…": "A default format that is not a format" | 3.4 | `tests/registration.test.ts:353` and `:416` (a variable the declaration does not carry), `:1211` (a \|name no form or modifier takes), and the new bar row (a modifier where none may go) |
| instrument-registration "A held message is judged as it was posted" | 3.1 and 3.2 | C5, C7; M4 in 3.2 |

The scenarios that MODIFIED requirements restate unchanged, and whose tests ship at `cf90995`
unchanged, are proven by those tests (S0); a restated scenario whose test a task rewrites has its own row
above. The exception is "A name carried in two places", which inspects source, has no test at
`cf90995`, and is checked at the implementation gate. The notice requirement's "a colour included" is
pinned by task 1.4's `{ miss: "$tokens|accent" }` row.
