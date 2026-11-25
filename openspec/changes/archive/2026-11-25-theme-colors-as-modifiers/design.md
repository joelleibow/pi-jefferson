# Design

## Context

Why the change exists is `proposal.md`'s. These are the facts of the system that shape how it is built.

**The shorthand this design cites resolves as follows.** D-, R-, T-, S- and O-numbers are
`michael-orientation.md`'s (§1, §3, §5; D1-D4 quote `owner-rulings.md`); a ruling or a row number is
`michael-council-rulings.md`'s; lens finding ids (CB-, RD-, critic C, STR-) are `council.md`'s; and
"design N", "decision N", J1(b) and J1(c) are the archived extensions-provide-instruments change's:
`openspec/changes/archive/2026-11-16-extensions-provide-instruments/design.md` and its `owner-rulings.md`.

- **The format language is one source file.** `extensions/jefferson/format.ts` parses a format into
  segments and renders them into text with one `theme.style()` call per styled piece. The vocabulary after
  `|` is nine names in one table — six `ThemeStyle` booleans and `capitalize`, `upper`, `lower` — and a name
  that is none of them is refused when the document is read (`research-eleanor.md` §1; `format.ts:23-34`,
  `:113-121`, `:185-205`).
- **The language already asks a theme questions.** `validateStyle` probes `theme.getFgAnsi` for a style's
  `fg` and `getBgAnsi` for its `bg`, and falls back to pi-tui's `parseColor` for a concrete colour
  (`format.ts:150-186`; statusline spec, "An instrument's style is validated when its document is read").
  The binding makes the same foreground probe again for a provided `variableFg` (`instrument-binding.ts:198-205`).
  Two copies of that probe exist today (`michael-orientation.md` T6).
- **pi publishes no runtime list of its names.** The public entry exports the `Theme` class and
  `initTheme` and no theme instance; `ThemeColor` and `ThemeBg` are types only. The two slots are told
  apart only by which accessor accepts a name, and `getFgAnsi` accepts exactly pi's 49 foreground tokens
  and throws for a background name, an inherited object property and a case variant alike
  (`research-chidi.md` §1; `michael-orientation.md` T1; `michael-council-rulings.md` row 2).
- **A theme exists only inside a session.** `ctx.ui.theme` is the only route to one. Extensions load inside
  `createAgentSessionRuntime` before `initTheme` runs, so no theme exists while an extension registers, and
  every mode's `session_start` fires after `initTheme` (`michael-council-rulings.md` rows 2 and 10).
  Nothing renders before Jefferson's own `session_start` installs the footer, and a fault is delivered only
  at `resources_discover`, after every `session_start` handler (`startup.ts:64`, `:144`).
- **A provided default format is parsed without a theme, twice.** Registration parses it and refuses on any
  throw; the bind parses it again when no `instruments` entry configured the instrument, and a fault there
  escapes `containProvided` and fails session start (`instrument-binding.ts:236-240`, `:283`;
  `configuration.ts:483-488`, `:584-595`; `michael-orientation.md` T2, T3).
- **A registration's first fault refuses it whole.** The first fault refuses the whole registration
  (`registration-listener.ts:43-47`); fields are declared only on acceptance (`:248-249`), and a report from
  an extension with no registration is refused as `report-no-registration` (`:202-206`). The refusal a
  provider sees today is published (`docs/extension-authors.md:310`).

## Goals / Non-Goals

**Goals:**

- Make every foreground colour of the live theme a `|name`, with no copy of the host's names and no reading
  of a theme file (Joel's ruling D1, D13; the delta's "A colour's name is the theme's own").
- Read a name after `|` in one order, stated once, so a reserved word keeps its meaning and a form keeps its
  place (D2; ADR 0010).
- Decide a piece's foreground by the order the format writes, the instrument's built-in colour and the
  instrument's `style`, with the format's colour strongest (Joel's ruling D4).
- Give a provided instrument the same language, with the same refusal in both load orders and with or
  without a document, and keep today's whole-registration scope (`michael-council-rulings.md` rows 1-4).
- Name the fault in every path a colour can be written wrongly (row 5).
- Change nothing a user writes today: a colour turns a refused name into an accepted one and touches only a
  piece that carries a format colour (S0; D3).

**Non-Goals:**

- No raw colour after the pipe (`#bf5700` stays `style`'s business), no background colour, no colour list in
  the docs (S1, S3, S12).
- No capability marker and no new channel, so the release stays a minor (ruling 11).
- No new dependency, no change to the published contract, and no source file that reads pi's internals (D9;
  S11).
- No re-check of a format when the theme changes, and no guard at render (ruling 10).
- No restart of the neighbouring work: `|spinner`, user-composed instruments and `shownUntil` for providers
  stay as they are (`michael-orientation.md` §2).

## Module & File Placement

**This table is the change's one home for the files it touches** (`michael-council-rulings.md` row 9), so
`proposal.md`'s Impact points here rather than repeating it. It is also the one home for the test
expectations this delta may rewrite: the list came from
`rg -n 'does not implement|cannot parse|createRegistrationListener\(|adaptProvidedDeclaration\(' tests/`, and an
expectation outside these rows may not change.

The change adds no source file. The foreground probe's first two uses already live in `format.ts`
(`validateStyle`) and `instrument-binding.ts` (the guard), so the third use makes it a shared rule extracted
into the first of those homes. A new source file would own one function, add a row to the file-coverage
check in `tests/jefferson.test.ts`, and give a reader a third place to look for "is this name a colour".

| Path | What it solely owns | This change |
| --- | --- | --- |
| `extensions/jefferson/format.ts` | The format language: the names a `|name` may be, what a segment holds, and the one place a piece's text, attributes and foreground are decided. | `ForegroundCheck` and `foregroundCheck(theme: Theme): ForegroundCheck`, one exported check constructor beside `validateStyle`, which itself uses it for the foreground half; `parseFormat(declaration, format, check: ForegroundCheck, plain = false)` reads a name in the one order; the literal and variable `FormatSegment` members gain `colour?: ThemeColor`; the form gate also requires that the segment carries no colour; `resolveFormat` decides the piece's foreground before it styles. |
| `extensions/jefferson/components/instruments/instrument-binding.ts` | Turning a registration into the bindings the reader and the render use. | `adaptProvidedDeclaration(name, declaration, view, record, check: ForegroundCheck)` takes the check for the registration parse (`:236-240`); the bind's re-parse takes the same check (`:283`); `instrumentBindings(check: ForegroundCheck, configured: ReadonlyMap<string, ConfiguredInstrument> = new Map())`; the `variableFg` guard (`:198-205`) asks `foregroundCheck(theme)` of the theme the render is handed, instead of its own copy; `ProvidedRefusal`'s unparseable-default-format variant (`:46-53`) becomes `{ refused: "unparseable-default-format"; message: string }`, carrying the parser's message `adaptProvidedDeclaration` takes from the caught error (`:236-240`). |
| `extensions/jefferson/configuration.ts` | Reading a document: validating it and building what a row renders. | `readConfiguration` builds `foregroundCheck(source.theme)` once and passes it to every parse, to the watch, to `instrumentBindings(check, configured)` at `:483` and to `instrumentBindings(check)` at `:550`, the default row's bind on the no-document, unreadable-document and rejected-document paths; `normalizeDocument(document, reading, source, check)` and `readInstruments(raw, source, reading, check)` carry that check to the parses, and `checkProvidedSettings(name, raw, declaration, theme, check: ForegroundCheck)` takes it from the read at `:272` and from the watch at `:511` and passes it to its parses at `:177` and `:227`, keeping `theme` for `validateStyle(entry.style, theme)` at `:193`; the two parse sites that are not plain (`:177`, `:298`) take it; the settings-parse text (`:184-186`) becomes template 2 of the one-message decision. |
| `extensions/jefferson/registration-listener.ts` | Hearing a registration or a report, and vetting it exactly once. | Copies a provider's message at arrival, through the copy's member table, typed against the contract; returns a handle with one method, `receiveTheme(theme: Theme): void`; goes live at the first `receiveTheme`, then drains the queue through the one vet path, containing each message as pi's bus does; builds the `unparseable-default-format` refusal as template 3 of the one-message decision. |
| `extensions/jefferson/startup.ts` | The order of a session: the mode check, the document read, the footer install, fault delivery, and the pin note. | Keeps the handle it creates at `:39-46` and calls `receiveTheme(ctx.ui.theme)` on it first thing in every `session_start`, before the mode check (`:112`) and `readConfiguration` (`:118`); carries the pin fact about the theme's names. |
| `tests/format.test.ts` | The language's behaviour. | 35 `parseFormat` calls take a check, as do the new cases' calls; `:259-264` moves `accent` to accepted while `bd` and `fg` stay refused; `:383-405` follows the new message; scenarios for the order and precedence, and a case where `$path|accent|relative` is refused and the message names `|relative`. |
| `tests/instrument.test.ts` | An instrument's rendering across width and theme. | 6 `parseFormat` calls and 7 `instrumentBindings` sites: `:366`, `:401`, `:436` and `:451` become `instrumentBindings(check)`, `:389`, `:464` and `:483` become `instrumentBindings(check, map)`. |
| `tests/row-renderer.test.ts` | A row's geometry and its padding. | 1 `parseFormat` call and the `instrumentBindings` sites at `:197` and `:215`. |
| `tests/configuration.test.ts` | Reading a document's text and its warnings. | `:1090` expects `"model"'s format names neither … : "|bd"`, template 1 of the one-message decision. |
| `tests/session-data-feed.test.ts` | What the store feeds a render. | The `instrumentBindings` site at `:300`. |
| `tests/registration.test.ts` | Registration through the real wiring, in both load orders. | `:353`, `:416`, `:950`, `:1211` and `:1980-1986` rewritten to the template the one-message decision states, because each matches an old fixed text: `:353` and `:416` expect `"taiknr.savings"'s default format names a variable it does not declare: "$spent"`, `:1211` expects `"taiknr.usage"'s default format names neither … : "|name"`, `:950` expects `"taiknr.savings"'s format names neither … : "|wobble"; it renders blank`, and `:1980-1986` expect the variant with its message; `:598` and `:1217` unchanged in the provider-first order, as the copy at arrival's proof, and the new report case in both load orders; the refusal-parts table at `:320-391` gains provider-first cases, `from({ fields: "x", instruments: [] })` expecting `registration from "taiknr" declares "fields" as "x", which is not string, number or boolean` and `from({ instruments: [{ name: "savings", variables: "x", defaultFormat: "x" }] })` expecting `"taiknr.savings" carries no variables`, each passing at `cf90995` and each failing under a copy that ignores the shape rule; the two `null` cases in the refusal-parts tables, `events.emit("jefferson:registration", null)` in "A2 every registration refusal part is exact" (`:320-391`) expecting `a registration is not an object` and `events.emit("jefferson:update", null)` in "A2 every report refusal part is exact" (`:423-454`) expecting `a report is not an object`, both passing at `cf90995` and under a copy that keeps a non-object message as posted and failing under a copy that reads the table off it; `from({ fields: JSON.parse('{"__proto__":"array"}'), instruments: [] })` in the first of those tables, expecting `registration from "taiknr" declares "__proto__" as "array", which is not string, number or boolean`, passing at `cf90995` and under a copy that defines its entries and failing under one that assigns them; the containment case, a BigInt field type followed by a well-formed registration, and the live-first case, a `toJSON` that posts `{ extension: "acme" }`, each in both load orders; the `variableFg` case in the provider-first order, a posted `variableFg.saved` replaced by `5` before the session starts; `:660-669` calls `receiveTheme(fakeTheme())` on the handle before it emits; `:1797-1806` is unchanged, since it emits nothing, hands no theme and ignores the handle, and it is the proof that Jefferson's own payload registers every shipped name with no theme ever handed (ruling 2(d)); the five `adaptProvidedDeclaration` calls at `:1958`, `:1971`, `:1977`, `:1982` and `:1986` take the check, the last two inside the `:1980-1986` expectations above; the colour-in-a-default-format proof in both load orders through the harness (`:141-151` A8, `:781` A5); the covered-colour-function case beside `:1467-1482`. |
| `tests/jefferson.test.ts` | The package's shipped surface. | `:232-305`: the pinned export list for `format.ts` becomes `["collapse", "foregroundCheck", "parseFormat", "resolveFormat", "resolvePlain", "validateStyle"]`; the file-coverage part is unchanged, because no file is added. |
| `tests/fake-theme.ts` | A theme small enough to reason about. | No change: the check is built from it, and its ten foreground names, its overrides and its slot-answering lookup already carry the provenance test (ruling 13). |

**How the dependencies point.** `startup.ts` is the only file that knows a session exists: it takes
`ctx.ui.theme` and calls the listener handle's `receiveTheme` with it, and the read takes the same theme
where it already does (`startup.ts:118-127`). Each boundary that is handed a theme builds one check from it — the listener when
it is handed one, and the read when it reads a document — and passes that check down to the adapter, the
watch and the language, once per boundary rather than per name (`configuration.ts:505-520`). The binding's
`variableFg` guard builds its check from the theme the render is handed, at that render and not before.
`format.ts` takes declarations, text and a check and reads no host state, so nothing inward depends on the
host's lifecycle or on a captured theme. The one thing that touches the host's accessor is the check
constructor, and it lives beside `validateStyle`, which already did.

**Not this change.** No task in this change changes a Markdown file. The docs pass does, and its list of
files is the Migration Plan's "The docs pass, inside this change".

## Decisions

### The name after `|` is read in one order, and the parser owns it

The order a name after `|` is read in is the statusline delta's requirement "A foreground colour of the
theme is a modifier", and `parseFormat` is the one place it exists; this design restates it nowhere. A form
is a name an instrument's declaration lists for one variable under `variableForms`
(`instrument-contract.ts:39-40`, the member and its doc comment; ADR 0010), and where it may be written
is the delta's "A variable can declare forms". The two rules meet in the delta's scenarios "A form named like a colour" and "That name after
another modifier", which are the form-versus-colour example.

The order costs one condition and no second list: Jefferson's names are looked up before the theme is
asked, so `|dim` keeps its meaning without a second list, and a later pipe name joins the reserved set by
being added to the same table (`michael-orientation.md` §2, T7). A colour is held on the segment rather
than in `modifiers` (the decision "A colour is a field on the segment, and precedence is decided before
anything is styled" below), so the form gate at `format.ts:109-111`, which reads "no modifier yet" as
`modifiers.length === 0`, also requires that the segment carries no colour. Without that condition
`$path|accent|relative` is accepted with `relative` as its form (measured).

`$bar` takes no modifier (delta, "A modifier follows a variable or literal text", scenario "A modifier on
the width-taking variable"). The bar refusal stays where it runs today: on whatever name the order accepts,
after the lookup (`format.ts:113-120`). So `$bar|accent` is refused as `format puts a modifier on "$bar":
"|accent"`, as `$bar|bold` is today (`tests/format.test.ts:414-417`, unchanged), and a name the order
refuses on `$bar` draws the order's own refusal message, per the one-message decision below. Nothing is
reordered.

Rejected: a reserved-name list beside the colour check, which would be a second list to drift; and asking
the theme first, which lets a colour shadow `|dim` against Joel's ruling D2.

### One foreground probe, owned by the format language, and a check rather than a theme

`format.ts` exports `type ForegroundCheck = (name: string) => name is ThemeColor` and
`foregroundCheck(theme: Theme): ForegroundCheck`, which builds the probe from a theme — "does this theme
carry this name as a foreground colour" — and every caller takes the check it builds. It is the only code
that calls `getFgAnsi` for a foreground name: a name is a colour when the call returns, and not when it
throws. The parser, `validateStyle` and the binding's `variableFg` guard all ask that one check, built from
the theme each boundary holds — the listener's at its first call, the read's, and the render's for the
`variableFg` guard — while `validateStyle` builds it from the theme it is passed (`michael-orientation.md`
T6; ruling 7 for O2).

The parse takes the check, not the theme. That keeps `format.ts` from reading host state, and every
caller holds a theme when it parses — the listener once it is handed one, the read, and the watch. The
check is chosen because the parse asks the theme one question and takes only that answer (interface
segregation; `~/Projects/AGENTS.md`, "Architecture and design discipline").

The signature is `parseFormat(declaration, format, check: ForegroundCheck, plain = false)`. The check is
required, with no optional or lenient default, so the type checker lists every production site and all 42
test calls: under this signature `tsc` reports all 8 production sites and all 42 test calls
(`michael-orientation.md` O1's table; ruling 4). `validateStyle(raw, theme)` keeps its signature: it asks
`foregroundCheck(theme)` for a string `fg`, keeps its `parseColor` fallback and its own `getBgAnsi` probe
for `bg`, so none of its test sites move. `plain` stays the optional last parameter, as at `format.ts:54`
today. Every parse site, plain included, passes the check its boundary already built — `configuration.ts:227`
in `checkProvidedSettings`, `:327` in the read, `instrument-binding.ts:248` in the adapter and `:299` in the
bind — and a plain format refuses every `|name` before any lookup (`format.ts:101`; D15), so a plain parse
never consults the check. `instrumentBindings` gains the check the same way, which is what moves its ten
test sites (ruling 9).

Rejected: passing the theme, because it would hand the parser the whole `Theme` for one question, though it
would otherwise work; and a new source file for the probe, per Module & File Placement.

### A colour is a field on the segment, and precedence is decided before anything is styled

The literal and variable members of `FormatSegment` each gain `colour?: ThemeColor`, present only when the
chain names a colour, so the segment `deepEqual` assertions at `tests/format.test.ts:100`, `:169`,
`:376-379` and `:493-503` stay unchanged (`node:assert/strict` treats an own `undefined` property as
different from an absent one). The last colour written wins. Because the colour is held in that field and
not in `modifiers`, the form gate needs the extra condition the order decision states ("The name after `|`
is read in one order, and the parser owns it"). `resolveFormat` then picks a piece's foreground as the first
that applies: the segment's
colour; the variable's built-in colour, asked only when the segment carries none; the merged `style`'s
`fg`. Attributes and a configured `bg` merge exactly as they do today, and the piece is drawn with one
`theme.style()` call as today (`format.ts:188-191`, `:267-276`; T9).

A field, because the merged `ThemeStyle` cannot be the discriminator: with the style `{"fg": "accent"}`, the
format `$level` and the format `$level|accent` reach styling with the same merged `fg` and need opposite
results (CB-03; ruling 7). A field also expresses "the later colour wins" in the parser's one pass over the
format.

The built-in colour is not asked for a covered piece, because a provider's colour function that throws
would then warn about a colour the user's format has replaced (`michael-orientation.md` T5; ruling 6). That
is ADR 0020's "only what the format names is resolved" applied to colour.

The segment holds the name, never a resolved escape sequence, so the render's theme draws it — which is what
makes "the text is drawn with the colour the theme current at render time gives that name" true, and what
makes a faint colour come out faint without the extension doing anything (`theme.js:188-191`; T9).

Rejected: a tenth modifier kind that the merge skips, because the fold would have to consult the theme and
the merge would need an order over kinds; and resolving the sequence at parse time, which would freeze the
theme the document was read with.

### A provider's registration waits for the first theme and is vetted once, whole

This is O1, and it is what keeps today's refusal in both load orders (rulings 1 and 2).

- `startup.ts` hands the theme to the listener first thing in Jefferson's `session_start`, before the mode
  check at `:112` and before `readConfiguration` at `:118`. It hands the object `ctx.ui.theme` returns,
  never `ctx`, because a stale runner's `ctx.ui` throws (`runner.js:618-619`, `:488-491`).
- The listener's factory returns a handle with one method, `receiveTheme(theme: Theme): void`, and
  `startup.ts` keeps the handle it creates at `:39-46` and calls that method first in every
  `session_start`, before `:112`.
- **Holding**, from the factory until the first call, is what a provider's message meets: it is copied at
  arrival and queued, and it takes its place in the queue when its copy completes. It is not vetted until
  the first call.
- **The first call** builds the listener's check from the theme, sets the listener live, and then drains
  the queue in arrival order through the one vet-and-apply path. Each message is vetted once and complete,
  in the parser's one order; a refusal of one message does not stop the drain, and a report queued behind
  a refused registration fails as `report-no-registration`, as it does today.
  - **Each drained message is vetted inside its own containment.** A throw ends that message and is logged
    with `console.error` in the shape pi's bus uses for a live message: `Event handler error (<channel>):`
    and the error, naming that message's own channel, `jefferson:registration` or `jefferson:update`
    (`event-bus.js:14`). Nothing is accepted, recorded or warned for it, and the drain goes on to the next
    message.
  - **Going live before the drain.** A message posted while the drain runs is vetted at once, inside the
    vet that ran the provider code that posted it, which is the order today's inline vet takes. Nothing is
    queued once the listener is live, so nothing is stranded.
- **Live** afterwards, each message is copied at arrival and vetted at once against the check; nothing is
  queued again. **A later call** replaces the theme the check asks and drains nothing.
- Jefferson's own payload is accepted by identity in both states, and stays unheld (ruling 2(d); the next
  decision).
- Nothing is accepted before it is vetted, so the registry needs no removal path and readiness's retraction
  option is unnecessary (ruling 2(e)).
- This widens the hold the standing spec already promises: Jefferson "MUST hold a registration and a report
  from the moment its own factory runs" (instrument-registration spec:246-250). It is not the rejected
  J1(c): no document is held and no render waits.

**The copy, at arrival.** Every provider message — registration and report alike — is copied when it
arrives, inside the bus handler, before it is queued or vetted. This holds whether the listener is holding
or live, so there is one read path.

- **The table.** The copy reads each member through one member table in `registration-listener.ts`. The
  table maps every member the published contract names (`instrument-contract.ts`) to how it is copied: a
  value kept as posted; a map copied by defining its own enumerable entries, as
  `Object.fromEntries(Object.entries(value))` does, never by assigning them; a map of maps, copied two
  levels by that same definition; a list copied by its elements; and `composed`, copied by its own members.
  Defining rather than assigning is the rule and not a detail, because assignment sends an own `__proto__`
  key to the prototype setter, which drops or reparents it, while today's vet reads it as an entry
  (`provider-fields.ts:59`; `instrument-binding.ts:161`, `:242`). The adapter already copies maps by
  definition, so the rule introduces no new mechanism (`instrument-binding.ts:169`, `:221`). Each member
  the table names is read exactly once, by property access, when the copy is made at arrival, whether or
  not the vet would reach it. Today's vet reads lazily, stops at the first fault, and reads some members
  more than once: `variables` at `registration-listener.ts:108` and `instrument-binding.ts:161` and `:242`,
  and `defaultFormat` at `registration-listener.ts:111` and `instrument-binding.ts:227`.
- **How it is typed.** The table is typed `as const satisfies Record<keyof ProvidedDeclaration, …>`, with
  matching tables for `ComposedFormat`'s, `Registration`'s and `Report`'s members, so `tsc` fails (TS2741)
  when the contract gains a member a table lacks (measured).
- **Its entries.** The maps are `variables`, `variableFg`, `fields`, `composed.variables` and
  `composed.formats`; the map of maps is `variableForms`; the lists are `instruments` and `options`;
  `composed` is copied by its own members, through `ComposedFormat`'s table. Every other member is a value
  kept as posted, so a function is held by reference.
- **The shape rule.** The message itself is copied through the `Registration` or `Report` table only when
  `isPlainObject` accepts it (`registration-listener.ts:39-41`); any other posted value (`null`,
  `undefined`, a primitive, an array) is kept as posted, so `vetRegistration` and `vetReport` refuse it as
  `a registration is not an object` and `a report is not an object`, as today
  (`registration-listener.ts:54-56`, `:191-193`). A copy otherwise applies only to a value of the shape
  the contract gives it, as that same `isPlainObject` and `Array.isArray` read shape: a map member and
  `composed` only when the posted value is a plain object; a map of maps' inner value only when that value
  is one; and a list only when it is an array.
- **A wrong-shaped value.** Every copy in the table keeps a value that is not the shape its member's copy
  requires as posted, so the vet refuses it for the type it was posted with and its warning reads as today.
- **Elements.** Each element of `instruments` that is a plain object is copied through
  `ProvidedDeclaration`'s table, and its `composed` through `ComposedFormat`'s. Any other element, and every
  element of `options`, is kept as posted.
- **The measurement.** A copy that maps a wrong-shaped value by its entries turns `fields: "x"` into a
  field `"0"` and `variables: "x"` into a variable `"0"`, in both load orders. The warnings become
  `registration from "taiknr" declares "0" as "x", …` and `"taiknr.savings" carries a variable "0" that is
  not a function`, where today they read `… declares "fields" as "x", …` and `"taiknr.savings" carries no
  variables`.
  A copy that reads the table off a posted `null` instead throws in the bus handler: pi logs `Event handler
  error (jefferson:registration): Cannot read properties of null (reading 'extension')`, and no warning is
  drawn in either load order, where `cf90995` warns `a registration is not an object` (measured;
  `undefined` and `jefferson:update` alike). An assigning copy, in turn, accepts
  `fields: JSON.parse('{"__proto__":"array"}')` with no warning in both load orders, where today it reads
  `registration from "taiknr" declares "__proto__" as "array", which is not string, number or boolean`; the
  same holds for a `variables` map with an own `__proto__: 5` beside `saved`, which today reads
  `"taiknr.savings" carries a variable "__proto__" that is not a function`.
- **Export and keys.** The table is not exported, so the export pin (`tests/jefferson.test.ts:232-305`)
  does not move, and the copy reads no key outside the table, which is what keeps "What the copy never
  does".
- **What the copy never does.** It reads no key the contract does not name (the spec's "Jefferson reads
  both messages tolerantly"), and it calls no function the payload carries. A getter runs once, when the
  copy reads its member at arrival, even on a member past the first fault ("Two accepted differences from
  today").
- **Who reads the copy.** The queue, the drain and the live vet read only the copy. The copy lives in
  `registration-listener.ts`.

**Two accepted differences from today.** Both come from the copy reading every contract-named member at
arrival, and both are recorded rather than fixed.

- **A getter with a side effect runs at arrival.** The copy reads every named member before any is judged,
  so a getter with any side effect, a throw included, runs exactly once at arrival, even on a member today's
  vet never reaches. A payload that carries a fault and also throws in a later member now ends on the
  throw: pi's bus logs it, and nothing is queued, accepted or warned (`event-bus.js:9-15`), where today the
  fault's warning wins. A getter that posts on a member past the first fault now posts.
  - **Measured at `cf90995` under a prototype hold and copy.** Case: a declaration with `defaultFormat: 5`
    whose `variableFg` getter posts a well-formed `acme` registration. Today it draws only `"taiknr.s"
    carries no default format`, and `acme.x` never registers. Under the copy, in both load orders, the
    getter runs, and `acme.x` registers and renders.
  - **Accepted,** because only a payload whose own getters do work can show it, and the payload's own
    registration is refused either way.
  - **Rejected:** copying lazily in the vet's order and stopping at its first fault, which writes decision
    15's order a second time.
- **A field type posted as an object is quoted as it reads at the vet.** The copy keeps a `fields` entry,
  and a `fields` value that is not a plain object, as posted ("Its entries"). The field-type-outside text
  quotes it with `JSON.stringify` when the vet reaches it (`registration-listener.ts:162-167`).
  - **Concrete case.** A provider posts `{ extension: "taiknr", fields: { saved: { kind: "x" } },
    instruments: [] }` before Jefferson's `session_start` and then sets `fields.saved.kind = "y"`.
    Provider-first, the warning reads `registration from "taiknr" declares "saved" as {"kind":"y"}, which
    is not string, number or boolean`; Jefferson-first it reads `{"kind":"x"}`, which is what both orders
    quote at `cf90995` (measured under a prototype hold and copy). A `toJSON` that reads provider state
    behaves the same way.
  - **Why the spec still holds.** The refusal, its kind and its scope are the same in both orders. The check
    reads only the held value's type, which no later change can alter (`provider-fields.ts:59-61`), and
    nothing renders from it. So "A held message is judged as it was posted" holds: the quotation is neither
    a check nor a render.
  - **Accepted,** because only a payload that breaks the field contract and then changes the object it
    broke it with can show it.
  - **Rejected:** a deep copy, which reads keys the contract does not name and loops on a cycle; and
    stringifying the value at arrival, which adds a derived member to the copy, runs `toJSON` on payloads an
    earlier fault refuses, and re-opens the drain's settled containment.

**What provider code the drain can run.** The drain runs synchronously inside the method, and the copy
calls no function the payload carries (`instrument-binding.ts:162`, `:171`, `:178`, `:191`, `:217` and
`:219` call provider functions only from closures the bound render runs). The vet runs provider code in
one place: the field-type-outside refusal builds its text with `JSON.stringify` of the declared type
value, which the copy keeps as posted, one level (`registration-listener.ts:162-167`;
`provider-fields.ts:56`, `:59-61`). That call can run a `toJSON` or a Proxy trap, and it throws on a BigInt
or a cycle. Live, pi's bus contains such
a throw; at the drain, Jefferson's `session_start` is the caller, so an uncontained throw would skip
`readConfiguration` (`startup.ts:118`) and `installFooter` (`:144`) in the provider-first order only. The
per-message containment and going live before the drain are what keep the drain's outcome the arrival-time
outcome. `registry.accept` has no watch to run before the first read (`registration.ts:51-57`), and
`repaint` is a no-op before `installFooter` (`startup.ts:36`, `:150`).

**A message emitted during another message's copy** — a getter that emits — is copied inline, and it is
queued ahead of the message that emitted it while the listener is holding, or vetted at once inside the
outer copy once the listener is live. Either way it is vetted before the message that emitted it, which is
the order in which today's inline vet accepts them.

Why it keeps today's contract: between a message's arrival and the top of Jefferson's `session_start` one
actor is still active in that window, and it is the provider holding a reference to what it posted, so it can
change what it posted. Everything else there is quiet: Jefferson replies on neither channel
(`docs/extension-authors.md:33`), faults wait for `resources_discover` (`startup.ts:64`), and nothing renders
before the footer is installed (`startup.ts:144`). The copy at arrival is what makes the drain's outcome the
arrival-time outcome, so what registers, what is refused and with which kind, and what renders are what
they would have been at arrival (ruling 2's measurement). The one exception is the quoted value in one
warning, recorded under "Two accepted differences from today".

Why one vet rather than a structural half now and a colour half later: with a declaration whose colour is
wrong followed by one that carries no variables, each load order would find a different first fault, and
the warning's text would follow the load order, against D14 (ruling 2(a)).

The proof runs through the session harness in both load orders (`tests/registration.test.ts:141-151` A8,
`:781` A5): a provided instrument placed by a row with no `instruments` entry, its default format carrying a
colour, renders in that colour. With a bad name, its registration is refused and session start still
resolves, and the outcome is the delta's scenario "A default format naming a name the theme does not have",
with an unknown name rendered as the standing statusline spec defines it (statusline spec:1593-1611, "An
entry names the instrument its cell renders"): the instrument's position renders `blank`'s placeholder,
and the row's other instruments render theirs, and two warnings arrive in this order — the row's
unknown-name notice (`row 1: "taiknr.savings" is not a known instrument`), then the refusal naming the
instrument and `|notacolour`. Both quote the instrument's name, and only the refusal quotes
`|notacolour`. With no row naming the instrument, the refusal arrives alone. This is today's behaviour
for any refused registration, measured at `cf90995` in both load orders (`startup.ts:56-64`;
`configuration.ts:404-414`).

The copy at arrival carries six proofs of its own, and one measurement behind them.

- `tests/registration.test.ts:598` ("A2 a change made after registering does not reach the render or the
  check") and `:1217` ("A2 a composed select swapped after registering does not reach the render") pass
  unchanged in the provider-first order.
- A report object is posted with a number for a string field, changed to a string and posted again, in both
  load orders, so `report-wrong-type` arrives once and the render shows the second value.
- A registration whose `fields` is `{ saved: 1n }`, then a well-formed registration a row places, in both
  load orders: the footer installs, the second instrument renders, no warning is drawn, and the throw is
  logged once with its channel.
- A registration whose `fields.saved` is an object with a `toJSON` that posts `{ extension: "acme" }` and
  returns `"array"`, in both load orders: one warning line arrives, `registration from "acme" carries no
  instruments; registration from "taiknr" declares "saved" as "array", which is not string, number or
  boolean`.
- A provider posts a declaration with `variableFg: { saved: () => "accent" }`, then sets
  `variableFg.saved = 5` before Jefferson's `session_start`, in the provider-first order: the registration
  is accepted and the value renders in `accent`, as it does when the provider posts after Jefferson's
  `session_start`.
The measurement behind them is that queueing by reference fails `:598`, `:1217` and the no-session listener
test (535 pass, 3 fail over the suite), while a copy taken at arrival fails only the last of the three (537
pass, 1 fail), which the handle above changes. Both cases pass in both orders at `cf90995`; an
uncontained hold fails the BigInt case in the provider-first order, where session start throws and no footer
installs; a hold that stays holding during the drain loses the `toJSON` case's `acme` warning; and a
contained hold that goes live first passes both in both orders.

Rejected: checking a name only at the first read (the published-contract change ruling 1 and §4 of the
orientation reserved for Joel, and unnecessary); retracting an accepted registration (nothing is accepted
unvetted); reading pi's internal theme global (D9); holding the document read (ruling 2); vetting each
message at arrival and deferring only the colour answers, which without conditions lets the first fault
follow the load order (ruling 2(a)) and with them holds every later outcome conditional on earlier answers —
`name-taken` (`registration-listener.ts:95-99`) and `report-no-registration` (`:202-206`) depend on whether
an earlier queued message is accepted — which is the drain-time vet with more state; and holding Jefferson's
own payload for the theme, because ruling 2(d) forbids it and the instruments a document may name must be
registered before the read and before the unknown-name warning.

### Jefferson's own default formats are checked where a document's format is

Jefferson's own payload is accepted by identity and never parsed by the listener
(`registration-listener.ts:236-240`). Its default formats are parsed only at the read
(`configuration.ts:298`) and at the bind (`instrument-binding.ts:283`), both with the check built from the
read's theme, so a shipped default format may name a colour and is checked exactly as a document's format
is. None names one (S0). A shipped name the theme lacks fails session start, as any defect in a shipped
default format does today, because Jefferson's own instruments are never contained (design 10;
`instrument-binding.ts:257-258`). The suite fails first: `tests/instrument.test.ts:362-372` binds every
shipped default format against `fakeTheme`.

No `shortcut:` comment is recorded, because no limit exists.

Rejected: a load-time vet in the identity arm — a refuse-all check or a second check constructor — because
no ruling or requirement asks for one, Jefferson's own defects already fail loudly, and it would add a
mechanism and a second check shape for a leaf while moving the export pin (`tests/jefferson.test.ts:232-305`).

### One refusal message, owned by the parser and forwarded by every path

O4 is decided as one message, naming the theme as the source the name was measured against:

> `format names neither a modifier Jefferson implements nor a foreground colour of the theme: "|acccent"`

A bad name reaches three paths, and each composes the same sentence from the parser's message, so the
offending name reads alike wherever it is reached. Write P for the parser's message, which always begins
`format `.

- **The own-instrument read**, kind unchanged (`configuration.ts:297-301`, unchanged composition), composes
  `"<key as written>"'s <P>` inside today's rejection:
  `pi-jefferson: <path> was rejected ("model"'s format names neither a modifier Jefferson implements nor a
  foreground colour of the theme: "|acccent"); rendering the default row`.
- **The provided settings path**, kind `settings-parse` (`configuration.ts:184-186`), composes
  `"<name>"'s <P>; it renders blank` for every parse fault except an undeclared variable, which keeps
  `settings-variable`'s text (`:180-189`):
  `pi-jefferson: "taiknr.savings"'s format names neither a modifier Jefferson implements nor a foreground
  colour of the theme: "|acccent"; it renders blank`.
- **The registration arm**, kind `unparseable-default-format` (`registration-listener.ts:142-146`), composes
  `"<name>"'s default <P>` for every parse fault of the default format:
  `pi-jefferson: "taiknr.savings"'s default format names neither a modifier Jefferson implements nor a
  foreground colour of the theme: "|notacolour"`, and for `Spent $spent`,
  `pi-jefferson: "taiknr.savings"'s default format names a variable it does not declare: "$spent"`.

Templates 2 and 3 forward every parser message, because the refusal carries the caught error's message:
`ProvidedRefusal`'s unparseable-default-format variant hands it out of `adaptProvidedDeclaration`
(`instrument-binding.ts:46-53`, `:236-240`). The plain-kind paths keep their texts
(`configuration.ts:229-232`; `registration-listener.ts:137-141`), because a plain format refuses every
`|name` before any lookup (`format.ts:101`). The kind names stay as they are (ruling 5). The texts obey
D10: they say no "cell" and no "entry".

One message rather than a slot-specific one, because a background name has the same remedy as a misspelling
— write a foreground colour the theme has — and telling the two apart would mean probing the background
accessor on every refused name for a sentence that changes no action. The delta's background scenario asks
for the same refusal as any unimplemented name (S3).

A test expectation may be rewritten only where the table in Module & File Placement lists it, and that
table is the list's one home. Rulings 5 and 15 named the first entries in it.

Rejected: keeping "names a modifier it does not implement", which now under-describes a language in which a
colour is a modifier and gives a misspelt colour no lead; and a distinct background message, for the reason
above.

### The theme's name set is invariant at the pin: a cited fact, no guard

Every theme pi loads carries pi's 49 foreground names: each built-in theme carries all of them, pi's
validator refuses a user theme that leaves a required token out or adds an unknown key, and a theme that
omits one of the five failable tokens has its fallback filled in (ruling 10's measurement;
`theme-schema.js:65-95` installed at `main.js:453`; `theme.js:44-60`, `:127-133`). So at the pin a theme
switch cannot leave a format's name unknown, and the design adds no guard at render — parity with
`style.fg`, which has had the same exposure since it shipped (critic C8, declined).

A name is a colour exactly when the accessor accepts it; nothing about a returned value is checked, because
at the pin the accessor throws for every other name (`theme.js:212-216`, `:234`; RD-05 declined), and no
test runs against an invented accessor (ruling 14). The one case that could produce a partial theme is
another extension constructing pi's public `Theme` class and setting it as the theme, which breaks pi's own
interface too (ruling 10).

The no-guard rule rests on one fact: every theme in one pi process carries the same foreground names. It is
measured at the pin, recorded in the pin note beside `startup.ts`'s existing note, and re-checked at every
pi pin bump; the probe's comment points there rather than repeating it. The package already rests on that
fact outside this change: a style's `fg` is checked against the theme when it is read and drawn with the
footer's theme at render (`startup.ts:121`; `footer-setup.ts:24-27`), and the thinking, notice and bar
instruments draw fixed theme names at render with no check (`thinking.ts:7-10`; `notice.ts:38`;
`bar.ts:21-22`). So a pi on which the fact failed would break those today; a colour modifier adds no
exposure of a new kind, and a pin bump is where it would be found.

The rule's provenance is proven by behaviour, not by inspecting source: against `fakeTheme({invented: …})`
the invented name is a colour, and against `fakeTheme()` the pi name `bashMode` is refused
(`tests/fake-theme.ts:5-31`; ruling 13). A copied list or a read theme file fails the second half. `muted`'s
faint rendering is proven as pass-through, by comparing `$model|muted` with the style `{"fg": "muted"}` over
one theme, the way `tests/format.test.ts:145-147` compares; the faint look on pi's system theme is Joel's to
watch in his session (D11), because no test reads pi's files (T11).

## Risks / Trade-offs

- **A queued registration never drains.** A run that loads the extension and never reaches a `session_start`
  leaves a provider's queued message unvetted and unwarned. → Nothing renders without `installFooter`
  (`startup.ts:144`) and no warning channel exists without `resources_discover`, so the outcome is not
  observable; the queue holds copies only, for the process's life. Every mode that does start a session
  drains it (ruling 2's mode measurement).
- **A held message is read at the drain.** A provider's later change to an object it posted would reach the
  check and the render in one load order only (measured: `tests/registration.test.ts:598` and `:1217` fail
  when the queue holds the posted objects by reference). → Copy each message at arrival, inside the bus
  handler, and let the queue, the drain and the live vet read only the copy.
- **A held message is vetted in two halves and the fault follows the load order.** → Each message is vetted
  whole, once, and the proof drives both load orders through the harness (ruling 2(a); ruling 4).
- **A held message throws or posts during the drain.** A provider-first registration whose field type is a
  BigInt throws in the field-type-outside text and, uncontained, leaves the session with no footer
  (measured: session start throws and no footer installs in the provider-first order). → Each drained
  message is contained and logged as the bus logs it, and the listener goes live before the drain, so the
  drain's outcome is the arrival-time outcome in both orders.
- **The listener captures `ctx` instead of the theme.** Once the runner is stale, `ctx.ui` throws
  (`runner.js:618-619`, `:488-491`). → Hold the object `ctx.ui.theme` returns, and nothing else from `ctx`.
- **The bind refuses a format its admission accepted.** A fault at bind escapes containment and fails
  session start (`michael-orientation.md` T3; `configuration.ts:483-488`, `:584-595`). → The bind takes the
  same required check, so it cannot refuse what admission accepted, and a test drives a provided instrument
  placed by a row with no `instruments` entry in both load orders. A `try`/`catch` around the bind is not
  the fix: it would hide a Jefferson inconsistency (design 10; `instrument-binding.ts:257-258`).
- **The theme is handed after the mode check.** Print and RPC sessions would never drain, and reports would
  pile up for the process's life. → Hand it before `startup.ts:112` and `:118`; today's listener accepts in
  every mode, so draining in every mode keeps that behaviour.
- **A colour is folded into the merged style.** With the style `{"fg": "accent"}`, `$level` and
  `$level|accent` would render alike (CB-03). → Precedence is decided before anything is styled, and the
  segment carries the colour.
- **A built-in colour function runs under a format colour.** A provider whose `variableFg` throws draws a
  warning about a colour the user replaced (`michael-orientation.md` T5). → Ask it only for a piece the
  format does not colour, and assert on the absence of the warning beside the colour-fault tests at
  `tests/registration.test.ts:1467-1482`.
- **A theme switch selects a theme without a name a format uses.** `theme.style` would throw at render. → No
  theme pi loads at the pin can lack one, and why that needs no guard is the decision "The theme's name set
  is invariant at the pin: a cited fact, no guard"; the design warns about no upstream drift.
- **A later pipe name, or a provider's form, shadows a colour.** `|spinner` against a pi token, or a form
  named `accent`, would change what an existing format does with no warning (`michael-orientation.md` T7).
  → Jefferson's names are looked up before the theme, so a new pipe name joins the reserved set by being
  added to the table; forms are read only in their one position; no shipped form equals a pi foreground
  name; and the docs state the order.
- **The suite cannot prove pi's slot table.** The test theme carries ten foreground names and one
  background name, and no test reads pi's files (T11). → The provenance test proves the rule against a
  theme the source cannot know, and the real table is Joel's live check (D11).
- **A faint colour looks like `|dim` on pi's system theme.** `|muted` renders faint there, because pi turns
  faint on for its faint tokens (`michael-orientation.md` T9). → The extension compensates for nothing, as
  the delta requires; the docs pass says so; Joel's live check is the proof.

## Migration Plan

There is no deployment step: the package has no build, pi loads the extension, and nothing is stored. The
change lands in one minor release, because the language gains names and no format that works today changes
what it renders (`proposal.md`, "Release"; `AGENTS.md`, "Running things"). The PR carries `release:minor`,
applied by the conductor when it opens the PR (ADR 0018; `.github/workflows/release.yml:45-66`), and from
`v0.14.0` — the highest release tag at this writing — that releases 0.15.0.

**Version skew, both directions** (ruling 11):

- An older Jefferson reading a document that writes a colour rejects it whole for one of Jefferson's own
  instruments, and refuses that instrument alone for a provided one (J1(b); D8).
- An older Jefferson refuses a provider's registration whole when its default format names a colour, with
  its siblings, its fields and its later reports.
- No capability marker is added, and the reasons are ruling 11's: what an older release does cannot be
  altered here, a new channel name would hide every provider that moved to it from every older Jefferson,
  and a signal would need Jefferson to reply on a channel, which the published contract says it does not
  (`docs/extension-authors.md:33`). An author who must support older releases keeps colours out of a default
  format, and users add them in their own formats.

**A pi other than the pin.** The names are pi's and are asked of the running theme, so a user's pi can
differ from the pin without the package carrying a stale list; `peerDependencies` is `*`. The name-set fact,
and why it needs no guard, is the decision "The theme's name set is invariant at the pin: a cited fact, no
guard".

**Rollback** is a revert of the merge commit, as in the archived `default-thinking-instrument` design
(`:256`): a document that writes a colour is then rejected as an unknown modifier, with the default row and
a warning, and a provider's default format that names one refuses its registration whole.

**The docs pass, inside this change.** It runs on this change's branch, after the implementation gate and
before Validate, so its edits ship in the same PR as the feature (conductor-janet `SKILL.md:83`;
`references/implementation.md:10`). It has no gate and never blocks the feature (D12).

- a new ADR under `docs/adr/` (the next free number is 0021 at this writing) records the retirement of ADR
  0003's "`fg` and `bg` are not modifiers" and its one-direction consequence, and why a theme's name
  outranks an instrument's own colour (R1; `AGENTS.md`, "Where decisions live");
- `docs/formats.md` states the order after `|` and points at pi's theme documentation for the names rather
  than listing them; `|dim` is the attribute, the `dim` colour is reached through `style`, and on pi's
  system theme a faint colour looks faint (S12; T8; ruling 8);
- `docs/configuration.md:129` and `docs/extension-authors.md:310` show templates 2 and 3 of the
  one-message decision, which carry the parser's reason for every parse fault (ruling 5), and
  `docs/notices.md:60`, `docs/extension-authors.md:226`, `ARCHITECTURE.md:44,71` and `AGENTS.md:25` are
  corrected (S13);
- it names 0.15.0 (the release above) as the version colours need (ruling 11); the
  extensions-provide-instruments change did the same
  (`archive/2026-11-16-extensions-provide-instruments/design.md:735-738`; `docs/extension-authors.md:5`).

**No post-merge step.** The archive runs on this branch too, before the code PR merges
(`references/review.md:8`), and Joel's live check (D11) is a `tasks.md` task marked as his, run on the
branch before the archive (`references/review.md:7`; implementation-readiness standard §3). What it watches
is named in the decision "The theme's name set is invariant at the pin: a cited fact, no guard".

## Open Questions

None remain. The four the orientation left open are decided above:

- **O1**, how a theme reaches every parse that can meet a colour: one check built from a theme, a required
  parser parameter, and the listener's hold.
- **O2**, one home for the foreground probe: the check constructor in `format.ts`, used by the parser,
  `validateStyle` and the binding's guard.
- **O3**, how a piece holds a colour: a field on the segment, with precedence decided before styling.
- **O4**, the wording: one message naming the theme, owned by the parser and forwarded by every path.

The design commits nothing to Joel. The contingency in the orientation's §4 and council row 2 fires only if
the hold cannot be built, and the decisions above build it; had it failed, the question would have gone to
him with Michael's recommendation to keep the whole-registration refusal.
