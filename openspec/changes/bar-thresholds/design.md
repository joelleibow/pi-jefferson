# Design

## Context

Why the bar's state becomes a setting is `proposal.md`'s; this section records only what the current
shape forces on any design of it.

**The drawing owns the rule today.** `bar.ts` holds the two constants and the strict comparison: the
fill turns `warning` above 70 and `error` above 90 (`bar.ts:21-22`, `research-eleanor.md` §1). The
strict boundary is not an accident — it copies pi 1.4.0's own footer (`footer.js:176-180`,
`michael-orientation.md` D2), and the living statusline scenario "The pressure a bar shows" names
that footer as its source (`openspec/specs/statusline/spec.md:700-705`). Joel ruled `>=` and called
the strict rule a bug (`owner-rulings.md`, 2026-11-25).

**Four properties of the existing code shape every decision below.**

- **The instrument's bound form is built once, from the top-level format.**
  `Instrument.fills`, the label and its gap, and the choice of composed format set are all derived
  from one set of segments when the instrument is bound (`instrument-binding.ts:295-309`,
  `michael-orientation.md` T2). A state that changes the format therefore needs its own bound form;
  a state cannot reuse the top-level one.
- **The row reads `fills` on every plan, without the sample.** `row-renderer.ts:54-59` reads it with
  no readings, so the same instrument can be planned as filling and drawn as not filling
  (`michael-orientation.md` T2).
- **The provider's boundary wraps `render` only.** `containProvided` passes `fills` straight
  through, and the adapter's guard covers only the provider's own call: a returned value whose
  `then` getter throws escapes it (`instrument-binding.ts:100-113`, `:266-279`; measured in
  `michael-orientation.md` T3). Choosing a state at plan time therefore puts provider code on the
  row plan unless that call is wrapped too.
- **Two settings paths already restate the same rules.** Jefferson's own path throws and rejects the
  document; the provided path returns a refusal for one instrument
  (`configuration.ts:285-351`, `:142-238`; `michael-orientation.md` T6). Each already restates the
  format, label, style and `formats` rules, so a third restatement of the threshold rules would
  give the count, range, duplicate and order rules two homes.

**Constraints that hold the design still.** ADR 0020 and the living "Only a variable the format
names can blank an instrument": a named variable that is unknown blanks the instrument, so a state
may not be read through a `$bar` the format never draws (`michael-council-rulings.md`, the
when-the-bar-is-read row). `AGENTS.md` item 4: an instrument's text at width 0 must match its text
at any width unless it fills, so the state may never depend on the width. `bar.ts` is a visual: it
imports no file of this package, and its runtime surface is pinned to `drawBar`
(`tests/jefferson.test.ts:275`, `:293`). The published contract is types only and its CI pack check
stays as it is (`AGENTS.md`). ADR 0015: a configuration key and a printed warning say "instrument",
never another word.

## Goals / Non-Goals

**Goals:**

- A bar's state is a user setting: a `thresholds` list whose every element sets an integer
  `activeAt` and any option the instrument declares, chosen by the highest `activeAt` at or below the
  bar's own reading, with the top-level settings when none is.
- `fill` becomes an option in its own right, at the top level and inside a threshold, taking
  `style`'s shape and layering on it key by key without ever reaching the track.
- The 70 and 90 defaults become two ordinary thresholds at `>=`, reaching every bar — Jefferson's
  own and every provider's, opted in or not.
- One set of threshold rules, one fault vocabulary and one over-four sentence for both settings
  origins, and a provider opt-in by option name.
- The drawing stays a standalone visual that draws what it is handed, and the state is chosen once
  per instrument per sample, inside the provider's boundary.

**Non-Goals:**

- No change to the bar's width, grammar, geometry, or the dim unfilled track it draws for a `null`
  reading (`michael-orientation.md` D11, §2).
- No threshold on a non-numeric datum: `activeAt` is a percentage, and nothing else becomes
  thresholded.
- No change to `notice`, `seconds`, composed `formats`, or a provider's own code.
- No new published runtime statement, no new dependency, and no change to the types-only export or
  its CI pin.
- No second list of the options a state may carry, and no new notification subsystem: a state's
  options are its declaration's, and the fault ledger already exists.
- No persistence of thresholds. They live in the settings document and nowhere else.

## Module & File Placement

Two new files, nine modified source files and the tests that prove them. Every path is relative to
the repository root. This list is the complete set; `proposal.md`'s Impact names areas and does not
claim to be.

### New

| Path | The one responsibility it owns |
|---|---|
| `extensions/jefferson/thresholds.ts` | The threshold vocabulary and the one reader: the written-order walk that checks every threshold, `check` included, before the drop above 100, the sort and the four-item cap, as `### Contracts`'s "The reader's result" states, the state chosen at a reading, one threshold's settings layered on the top level, the 70 and 90 defaults, and the over-four sentence. The reader's input contract — the element's shape, and every input it accepts, rejects or ignores — is the statusline delta's and this design restates none of it: "A threshold sets the instrument's state at a percentage", "Only the four lowest thresholds are honoured", "A malformed threshold rejects the settings", "Every value inside a threshold is checked as a top-level value is" and "A key a threshold does not take is refused". Pure: it imports nothing from `configuration.ts`, `instrument-binding.ts`, the row or the visuals, and reads no host data. Its four runtime exports, and each of their signatures, are `### Contracts`'s "`thresholds.ts`'s surface" and "The reader's result". |
| `tests/thresholds.test.ts` | That reader's own rules, exercised directly: the check → warn → drop → sort → cap order, `-0`, `70.0`, `7e1` and `1e400`, a duplicate above 100, the state at exactly 0 and exactly 100, unknown as 0, layering a key and layering a `formats` kind, the defaults, and three cases on the seam with `check`: a `check` that refuses a threshold above 100, or the fifth of five, makes the reader answer that refusal at its written position; a duplicate written before a refused threshold is the fault answered; and a threshold that sorts first keeps its written position. Each case asserts the reader's answer and never the calls `check` received. |

**Why the reader cannot live in an existing file.** `bar.ts` is the drawing: it imports no file of
this package and its runtime surface is pinned to `drawBar`, so a default cannot live there
(`michael-council-rulings.md`, the defaults-location row). `configuration.ts` carries two settings
paths whose only difference is how a fault surfaces, so a rule placed inside one is not the other's:
the count, range, duplicate, sort and cap rules would exist twice, and a change to any of them would
have to land twice. `instrument-binding.ts` owns turning settings into a bound instrument, not
reading a list, and it must reach the defaults for an instrument with no settings at all.

**Why the tests have a file of their own.** Each existing test file covers one area — the format
language, configuration, registration, the declarations — and behaviour through those real paths
stays there, listed below. The reader's rules are arithmetic and ordering over a list, and they are
cheaper to prove where they live than through three layers of settings.

### Modified

| Path | What changes there |
|---|---|
| `extensions/jefferson/components/visuals/bar.ts` | `drawBar` takes the effective fill beside the effective style and makes no percentage-to-colour choice at all (`michael-council-rulings.md`, the extension-source-layout row); its signature, and what the filled columns and the track each take, are `### Contracts`'s "The drawing path". It imports no file of this package, as before. |
| `extensions/jefferson/format.ts` | `resolveFormat` receives the state in force and the slot's raw reading (DEC-6) instead of calling a declaration's `bar` itself (`format.ts:295-303`), in the signature and with the argument sources `### Contracts`'s "The drawing path" gives, and it judges blanking against the state's own segments. `validateStyle` takes the option's name, and its signature, its four sentences and the five pre-existing expectations that move with them are `### Contracts`'s, so a `fill` fault's sentence never says "style" (`format.ts:186`, `:201`, `:219`). |
| `extensions/jefferson/components/instruments/instrument.ts` | The two option names have one runtime home: `BAR_OPTIONS = Object.freeze(["thresholds", "fill"] as const)`, exported beside `FOUNDATIONAL_OPTIONS`. The published contract keeps its own literal type (`instrument-contract.ts:49`), because it is types only and imports no runtime value. `fills` stops being a value fixed when the instrument is bound and becomes a function of the sample's readings, in the two-member contract `### Contracts` states; a declaration that sets `fills: true` still answers true at every reading (DEC-7), so such a declaration is untouched. |
| `extensions/jefferson/components/instruments/instrument-binding.ts` | Binds at most five states per instrument — the top level and four thresholds — each with its own segments, label and gap, composed choice and kind formats, `fills`, effective style and effective fill. Owns the per-sample slot DEC-6 defines. Decides at bind whether the bar is read at all. Wraps each placement's `fills` and `render` in `containProvided` for a provided instrument, and accepts the two names from a provider's declaration by reading `BAR_OPTIONS` (`instrument-binding.ts:153-161`). `ConfiguredInstrument`'s `segments` and `style` become optional, and the binding's existing defaults complete them (`:290-291`). It declares `BoundInstrument`, a type that is new, and `instrumentBindings` returns a function producing it; that shape, and `ConfiguredInstrument` with the top-level `fill` and the honoured list, are `### Contracts`'s. |
| `extensions/jefferson/components/instruments/context.ts` | Lists `thresholds` and `fill` among its options as `Object.freeze([...FOUNDATIONAL_OPTIONS, ...BAR_OPTIONS])`, frozen as `tests/instrument.test.ts:84` requires: it is the only shipped declaration carrying `bar` today (`tests/instrument.test.ts:85`, `michael-orientation.md` D9). |
| `extensions/jefferson/components/row/row-renderer.ts` | Reads `fills` with the sample for each placement (`row-renderer.ts:54-59`) and renders each placement from that same sample. It resolves no reading and holds no state; its per-cell text memo stays unchanged. |
| `extensions/jefferson/configuration.ts` | Both settings paths hand the reader their existing per-value checks as its `check`, which the reader runs on every threshold written (`### Contracts`, "The reader's result"): the unknown-key check runs over a threshold's keys other than `activeAt`, which the reader judges, against the declaration's options minus `thresholds`, and the allowed key set itself belongs to the statusline delta ("A threshold sets the instrument's state at a percentage", "A key a threshold does not take is refused"). A fault is placed by the instrument, the option as the user wrote it and, for a fault about one threshold, the 1-based written position. The over-four warning enters the read's fault list, which reaches the ledger only for a document that installs (`configuration.ts:278`, `:503-505`); a late watch check reports through `source.report` (`:519`). The provided path's `checkProvidedSettings` (`:142-238`) is reshaped as `### Contracts` bids — the reader's per-value checks handed over as `check`, a top-level or threshold `fill` validated as `settings-fill`, a reader fault's `kind` forwarded with that path's sentence, and accepted settings answered as `{ settings, warning? }` rather than a bare instrument — so both of its callers move with the shape. Each path's per-value check parses a `format` and validates a `style` only when one is written (`configuration.ts:177`, `:194`, `:301`, `:339`) and carries only what the document wrote (`:237`, `:344-348`) — measured on today's code, that change alone leaves 578 of 578 tests passing and the typecheck clean. What the reader returns, and when each path moves that warning, are `### Contracts`'s. |
| `extensions/jefferson/registration-listener.ts` | Maps the new refusal kind and its sentence (`registration-listener.ts:214-223`). |
| `extensions/jefferson/instrument-contract.ts` | The declared option names gain `thresholds` and `fill` (`instrument-contract.ts:49`). Types only; no runtime statement, so the published export and its CI pin are unchanged. |
| `tests/row-renderer.test.ts` | Every `Instrument` literal the file builds writes `fills: () => <boolean>`, the helper's at `:622` as `fills: () => fills`, while the `{ fills }` option bags that helper is handed stay booleans because they are not `Instrument`s; so each case keeps its expectation and only the read moves from a value to a call with the sample. The file's one direct `resolveFormat` call at `:492` names no `$bar`, so it passes no `bar` and keeps its arguments. |
| `tests/format.test.ts` | The strict-edge expectations at `:147-153` flip to expect `warning` at exactly 70 and `error` at exactly 90, and the test at `:147` is retitled to the inclusive rule it now asserts ("the default thresholds replace only the foreground, from seventy and from ninety"); they are written first and run red against the drawing as it stands. The `rendered` helper (`:34-40`) binds through the real binding — `instrumentBindings(check, new Map([[declaration.name, { segments, style, label: "" }]]))(declaration).render(readings, width, theme)` — fresh per call, so no slot outlives its call and `label: ""` keeps the bound label out; every test body reaching the bar through it keeps its expectation, `:157-169` and `:147-153` (flipped only as above) among them, and the defaults reach the bar by the binding's own path. Measured on today's code, that routing passes 89 of 89. The stand-in literal at `:183` writes `fills: () => false`, its expectation unchanged, and `:246` and `:247` take the `style` wording `### Contracts` gives `validateStyle`'s fg/bg sentence. No direct call in the file names `$bar` — `:183`, `:224`, `:334`, `:341`, `:411`, `:685` and `:687` — so none passes a `bar` and each keeps its arguments, `preResolved` at `:687` included. |
| `tests/instrument.test.ts` | The options pin at `:82` expects `["thresholds", "fill"]` for a declaration that carries `bar`, derived from `declaration.bar`, and `:84`'s frozen check stays. The bar pin at `:85` gains the shipped-declaration invariant, its expectation derived from each shipped declaration's own `bar` rather than a hand-kept list. `:351`'s pass-through (`fills: bound.fills`) compiles unedited, because it hands the function on and so shares the binding's slot; the reads at `:377`, `:396` and `:425` become `fills(seed)`, their expectations unchanged. The `render` helper (`:69-73`) binds through the real binding by the same call, fresh per call and with `label: ""`, so `:180-192` keeps its expectation and the defaults reach the bar by the binding's own path. Measured on today's code, that routing passes 39 of 39. |
| `tests/configuration.test.ts` | A rejected document that carries `context` with five well-formed thresholds and a row the configuration read rejects (`configuration.ts:487` reads the instruments block before rows at `:494-496`), asserting the rejection and that no over-four warning is reported: a malformed threshold would end the read before the warning is composed (`### Contracts`, "The reader's result"), so only this document shape fails against a path that reports the warning before the document installs. The four-item cap and its warning, the 70 and 90 defaults at exactly those numbers, the empty list, and the 1-based position in a fault sentence, each case asserting the kind, and every part the table row and the spec scenario say the sentence names: the instrument, the option as written, the written position where the fault is about one threshold, and, for a duplicate, the number. The statusline delta's three cases of a fault inside a threshold above 100 or past the fourth are carried here through Jefferson's own path — the list at 10, 20, 30, 40 and 101 whose fifth carries a `fill` the theme lacks, five thresholds whose fifth has a format that does not parse, and thresholds written at 90 then 10 whose second does not parse — and each rejects the document with a sentence naming the instrument, the option as written and the written position. The reads at `:1333`, `:1340` and `:1344` become `fills(seed)`, their expectations unchanged, and `:1134` and `:1140` take that same `style` wording. |
| `tests/registration.test.ts` | A provided instrument that opts in, each opt-in combination, the without-`bar` refusal and its kind, a malformed threshold refused for that instrument alone, and a faulting bar chosen for a state. It also carries the once-per-sample case and the failure pair, posted over the harness's real bus (`tests/session-harness.ts:97`, `tests/registration.test.ts:1422`), because only a provided bar can answer two reads of one sample differently. The case: a `bar` counting its own calls, returning 69 then 71, a threshold at 70 setting a label, and the instrument placed twice in row 1 and once in row 2, so one footer render reads the bar once with no placement showing the label and a second render reads it again. The failure pair: a `bar` whose result has a `then` getter that throws, the same three placements, a sibling instrument beside them, and thresholds that change the format. **(a)** Top-level format `$percent` and a threshold at 50 giving `$percent $bar`: the row's exact line shows that no placement takes the spare columns, so a fallback that fills always, or whenever any state draws `$bar`, fails here. **(b)** Top-level format `$percent $bar` and a threshold at 50 giving `$percent`: every placement still takes the row's spare columns, so a fallback that never fills, or fills only when every state draws `$bar`, fails here. Each case asserts that the bar is read once in the sample, every placement renders nothing, the sibling renders, and one notice carries the `resolver-threw` sentence `### Contracts` gives. The row also carries a refused provided instrument given five thresholds whose fifth, at 101, sets an unknown `fill`, beside a sibling instrument: only that instrument is refused, its sentence names `fill` and position 5, the sibling renders, and no over-four warning is reported. Its cases assert the kind, and every part the table row and the spec scenario say the sentence names — the instrument, the option as written and the written position — and assert whole the full sentences of `option-without-bar` and `resolver-threw`. |
| `tests/jefferson.test.ts` | The row-level geometry cases at `:524-538` and `:685-727` stay unedited and passing. `pinned` (`:234-277`) gains a `thresholds.ts` entry with the key set `### Contracts` states, and `instrument.ts`'s entry (`:261`) gains `BAR_OPTIONS`; the shipped-file assertion at `:293` reads that list, because the defaults' home is a new shipped source file (`michael-council-rulings.md`, the defaults-location row). The pin's own entry for `instrument.ts` (`:261`) gains `BAR_OPTIONS` beside that new entry: the pin compares exact key sets (`:282`), and measured in a clean copy of HEAD it fails without that entry and passes with it. `bar.ts`'s own pin stays `["drawBar"]`: the drawing gains no export. |
| `tests/fixtures/sample-provider/provider.mts` | `progress` gains `thresholds` and `fill` in its options (`provider.mts:81`), so the widened option type is exercised through the real registration path and the packed-fixture CI check; it already carries `bar`, so no instrument is added. |

### Deliberately untouched

| Path | Why |
|---|---|
| `extensions/jefferson/startup.ts` | It already wires `report` to the fault ledger (`startup.ts:138`), which is the one channel the over-four warning needs (`michael-council-rulings.md`, the warning-path row). |
| `extensions/jefferson/faults.ts` | It already deduplicates by scope and kind (`faults.ts:54-56`), which gives one warning per instrument per session for free. |
| `extensions/jefferson/components/instruments/blank.ts` | `fills` is the declaration's, so the answer is true at every reading (DEC-7); nothing here moves (`blank.ts:8`). |
| `extensions/jefferson/components/row/width-plan.ts` | It takes one boolean per plan (`width-plan.ts:17-18`), which is what the row still hands it. |
| `docs/`, `ARCHITECTURE.md`, `docs/adr/` | The docs pass, under Joel's standing ruling that documents never block a feature. The Migration Plan lists every sentence that pass has to correct or retire. |

**How dependencies point.** `thresholds.ts` is the innermost thing here: rules over plain data,
importing nothing of this package. `configuration.ts` and `instrument-binding.ts` depend on it and it
depends on neither. `row-renderer.ts` depends on the binding; the binding depends on `format.ts`;
`format.ts` depends on `bar.ts`; `bar.ts` depends on nothing (ADR 0009). `instrument-contract.ts`
stays a file of type declarations. Nothing in the reader knows a row, a host, a theme's colours or a
fault's channel, which is what lets both settings origins and the binding call it.

### Contracts

The shapes the modified source files meet at, and the only place they are stated. This section owns:

- where the row and the binding meet — `Instrument` and `BoundInstrument`;
- where the settings paths and the binding meet — `ConfiguredInstrument` and the reader's result;
- the drawing path, where the binding, the format language and the drawing meet — "The drawing path"
  below;
- every fault's kind and what its sentence names — "Fault kinds and sentences" below.

DEC-1, DEC-3, DEC-4, DEC-5, DEC-6, DEC-7, DEC-9, DEC-11, DEC-12 and DEC-14 point here and restate
none of it. The per-sample slot is inside the binding and meets no other file, so its contents are
DEC-6's.

**`Instrument`** is the row's contract, and it holds exactly two members:
`fills(readings: Readings): boolean` and `render(readings, width, theme): string`
(`instrument.ts:14-18`). Those are the only members the row reads (`row-renderer.ts:49`, `:56-59`).

**`BoundInstrument`** is a new type, declared in `instrument-binding.ts` and not exported, because no
other file names it: an `Instrument` plus `readonly topLevelFills: boolean` — the top-level state's
`fills`, fixed at bind and needing no reading. `instrumentBindings` now returns
`(declaration: InstrumentDeclaration) => BoundInstrument`. Its one reader is `containProvided`,
which takes a `BoundInstrument` and returns an `Instrument` (`instrument-binding.ts:266-279`), and
`BindInstrument` (`:14`) and `configuration.ts:488-493` are unchanged, so the row never sees
`topLevelFills`. The row, and the fifty-odd stand-ins the tests build, therefore never carry it.

**`ConfiguredInstrument`** (`instrument-binding.ts:16-22`) gains two members. Its `segments` and
`style` also become optional (`instrument-binding.ts:16-22`), so the top level and every threshold
share one settings shape and carry only the parsed values the document wrote. The binding's existing
defaults complete the top level: an absent `segments` is the declaration's default format, parsed at
bind, and an absent `style` is `{}` (`instrument-binding.ts:290-291`). No completion helper exists,
and the reader parses no default format.

The two members:

- `fill?: ThemeStyle`, the top-level fill after validation;
- `thresholds?: readonly Threshold<Omit<ConfiguredInstrument, "thresholds">>[]`, the reader's honoured
  list stored as it is: sorted ascending, at most four, none above 100, each a `Threshold` whose
  `settings` carry only the parsed values it wrote.

An absent `thresholds` means the defaults (DEC-2), and `[]` means none (statusline, "A configured list
replaces the defaults"). The over-four warning is not a member.

**One honoured shape.** `Threshold<S>` is `{ readonly activeAt: number; readonly settings: S }`, and
it is the only shape a threshold has: the settings path parses a value once, the reader keeps it, and
the binding layers it and binds it. No flat form carries `activeAt` beside the values.

**Layering runs over those parsed values** (DEC-4, DEC-5). A plain record — `style`, `fill`,
`formats` — merges one level deep. A parsed format, which is a list of segments, and a label replace
whole, as the strings they came from would: a one-level spread of two segment lists gives an
index-keyed object, not a list.

**Type homes.** The list and layering types in `thresholds.ts` are generic over the settings a
threshold carries, and `ConfiguredInstrument` is that one settings shape plus `thresholds?`,
instantiated with the parsed values, so `thresholds.ts` still imports nothing of this package and
"How dependencies point" stays true. The three types it exports — `Threshold`, `ThresholdFault` and
`ThresholdsRead` — reach no runtime surface.

**`thresholds.ts`'s surface.** Its runtime exports are exactly `DEFAULT_THRESHOLDS`, `layerThreshold`,
`readThresholds` and `stateAt`, which is the key set `tests/jefferson.test.ts`'s `pinned` must list.
The over-four composer is not among them: its one caller is `readThresholds`, and a path receives the
sentence through `overFour`.

- `DEFAULT_THRESHOLDS` is a frozen
  `[{ activeAt: 70, settings: { fill: { fg: "warning" } } }, { activeAt: 90, settings: { fill: { fg:
  "error" } } }]` typed `as const`.
- `stateAt<E extends { readonly activeAt: number }>(honoured: readonly E[], reading: number | null |
  undefined): E | undefined` returns the last entry of the ascending list whose
  `activeAt <= (reading ?? 0)`. `undefined` means the top level.
- `layerThreshold<S extends object>(top: S, threshold: S): S`. For each key the threshold carries, a
  plain record over a plain record merges one level and any other value replaces whole; a key the
  threshold leaves out is the top level's.

**The drawing path** is the one home of both shapes below, and `bar.ts`, `format.ts` and the binding
restate neither.

- `drawBar(barWidth: number, percent: number | null, style: ThemeStyle, fill: ThemeStyle):
  [BarPart, BarPart]` (`bar.ts:18`). The filled part takes `{ ...style, ...fill }` and the track
  `{ ...style, dim: true }`. It makes no percentage-to-colour choice, and it keeps its clamp, floor
  and `null` track.
- `resolveFormat(declaration, segments, style, readings, width, theme, preResolved?, bar?)`
  (`format.ts:255-263`):
  - `segments` and `style` are the bound segments and effective style of the state in force.
  - The new trailing `bar?: { readonly reading: number | null | undefined; readonly fill:
    ThemeStyle }` carries the slot's raw reading (DEC-6) and the state's effective fill.
  - It never calls `declaration.bar`. A `$bar` segment reads `bar?.reading`, so an absent `bar` is
    the unknown reading and blanks as `undefined` does (DEC-10).
  - The binding hands `bar` whenever the state's segments name `$bar`. DEC-8 guarantees the reading
    exists: such a state is either the top level, whose `$bar` makes the bar read, or a threshold
    that sets a format, which is an option other than `fill`.
  - `preResolved` keeps its seventh position.

**The reader's result, and when its warning moves.**
`readThresholds<S, R>(raw: unknown, subject: string, check: (settings:
Readonly<Record<string, unknown>>, position: number) => { readonly settings: S } | { readonly refused:
R }): ThresholdsRead<S, R>` in `thresholds.ts`. It records nothing, reports nothing and catches
nothing.

- `subject` is the instrument as that path prints it: `instrument "<written key>"` on Jefferson's own
  path (`configuration.ts:292`), and `"<normalized name>"` on the provided path (`:275`). It is the
  same subject the place phrase below opens with.
- `ThresholdsRead<S, R>` is one of `{ readonly fault: ThresholdFault }`,
  `{ readonly refused: R; readonly position: number }` and
  `{ readonly honoured: readonly Threshold<S>[]; readonly overFour?: string }`.
- `ThresholdFault` is one of `{ readonly kind: "settings-thresholds" }`,
  `{ readonly kind: "settings-threshold" | "settings-threshold-active-at"; readonly position: number
  }` and `{ readonly kind: "settings-threshold-duplicate"; readonly position: number; readonly
  activeAt: number }`. These are the four kinds the fault table below lists, so the provided path
  forwards `fault.kind` as the ledger kind with no second mapping, and the reader still knows no
  channel: a kind is a name and not a delivery. A duplicate's `activeAt` is the repeat's number as
  parsed (redgreen-3).
- `check(settings, position)` is the settings path's own per-value check. It receives one threshold's
  keys other than `activeAt`, and that threshold's 1-based written position. It answers
  `{ settings: S }`, the parsed values the threshold wrote, or `{ refused: R }`. The same per-value
  check serves the top level and each threshold, so it never fills in a value the settings did not
  write. Jefferson's own path may throw `RejectedConfiguration` from it instead, as its checks
  already do (`configuration.ts:285-343`), and that throw ends the read.
- **The order.** The reader walks the list in written order. For each threshold it judges, in turn:
  its shape; its `activeAt`; whether it repeats a number an earlier threshold wrote; then `check`.
  The first fault met ends the read, so every threshold written is checked, those above 100 and past
  the fourth included. A fault's position is always its written position. Only after every threshold
  has passed does the reader warn on the written count, drop those above 100, sort ascending and keep
  four.
- It answers one of the three results above: `{ fault }` is its own fault, at the kind and position
  `ThresholdFault` names; `{ refused, position }` is the first refusal `check` answered;
  `{ honoured, overFour? }` is the honoured list, with the over-four sentence present when more than
  four were written.
- **The over-four sentence** (RDY-R1-5) is exactly `${subject} defines ${count} thresholds, more than
  the maximum of 4; those beyond the 4 lowest are ignored`, where `count` is the number written. It
  is composed inside `readThresholds` and reaches a path only through `overFour`, so it has no
  export. DEC-11 points here for the wording.
- **Each path's order.** Each path checks the instrument's top-level values first, and calls the
  reader only when the settings carry thresholds. An absent key means the defaults
  (`ConfiguredInstrument` above).
- **What binds.** The honoured list is what binds. It is never what was checked.

Only once that instrument's settings are accepted does the over-four warning move:

- Jefferson's own path pushes it to `reading.faults` after `configured.set` (`configuration.ts:344`),
  and a later rejection of the document discards the buffer (`:503-505`).
- The provided read-time path has `checkProvidedSettings` return `{ settings, warning? }` for accepted
  settings and `{ kind, part }` for a refusal; a refusal never carries the warning, and the caller
  pushes it after `configured.set` (`:281`).
- The watch reports it through `source.report` after `configured.set` (`:523`).

**Fault kinds and sentences.** This table is the home of every fault the change adds. A provided
instrument's fault refuses that instrument alone, takes a kind in the `settings-*` family, and its
sentence ends with that path's `; it renders blank` (`configuration.ts:145`).

| Kind | What it refuses, and what its sentence names |
|---|---|
| `settings-fill` | A top-level or threshold `fill` that `validateStyle` refuses. The sentence names `fill` and never `style`. |
| `settings-thresholds` | A `thresholds` value that is not a list. It has no position, so it takes no place phrase: the own path reads `instrument "<name>" has thresholds that is not a list` (the form `:319` gives `formats`), and the provided path reads `"<name>" is configured with thresholds that is not a list; it renders blank` (the form `:209` gives `formats`). |
| `settings-threshold` | A threshold that is not an object. The own path reads `instrument "<name>", thresholds <N>: is not an object`; the provided path reads the same followed by `; it renders blank`. |
| `settings-threshold-active-at` | An `activeAt` that is missing, not a number, not whole, or negative. The own path reads `instrument "<name>", thresholds <N>: has an activeAt that is not a whole number at or above 0`; the provided path reads the same followed by `; it renders blank`. |
| `settings-threshold-duplicate` | Two thresholds at one number. The own path reads `instrument "<name>", thresholds <N>: repeats the threshold at <number>`, where `<N>` is the repeat's position and `<number>` its parsed number as a template prints it, so `-0` prints `0`; the provided path reads the same followed by `; it renders blank`. |
| `thresholds-over-four` | More than four thresholds. Scope is the instrument's full name, and the sentence is the one `thresholds.ts` composes (DEC-11). |
| `option-without-bar` | A declaration naming `thresholds` or `fill` without a bar. The adapter refuses with `{ refused: "option-without-bar"; option: "thresholds" \| "fill" }`, and the listener's arm composes `${full} declares ${JSON.stringify(option)} without a bar`, where `${full}` is the instrument's full name in the form the two existing refusal sentences write it. |
| `resolver-threw` | A provided `bar` that throws while its state is chosen, caught by the wrapper's `fills`: `"<name>" failed to render: its bar threw` (`instrument-binding.ts:91-92`, `:105`). A throw out of `render` keeps today's sentence (`:275`). |

**The refusal's order**, inside the option loop (`instrument-binding.ts:154-159`), which walks the
names as written: a name in `BAR_OPTIONS` on a declaration with no `bar` refuses `option-without-bar`;
any other name outside `FOUNDATIONAL_OPTIONS`, `"formats"` and `BAR_OPTIONS` refuses
`option-unimplemented`; the first offending name decides, so `["seconds", "thresholds"]` with no bar
refuses `seconds`. `member-unusable` (`:127-152`) still runs first, and `formats-without-composed`
(`:161`) still runs after the loop.

A row that gives no full sentence is that path's sentence pattern (above), carrying the parts the row
names; inside a threshold, the place phrase below is the sentence's subject.

The same fault inside a threshold keeps the existing per-value kind — `settings-format`,
`settings-label`, `settings-option`, `settings-parse`, `settings-variable`, `settings-style`,
`settings-formats*` or `settings-fill` — and its sentence is the place phrase below followed by that
fault's top-level predicate.

Jefferson's own path rejects the document instead, through the same faults and the same place phrase
below, each sentence following the existing `instrument "<name>" …` pattern (`configuration.ts:292`,
`:297`, `:308`, `:341`).

**The place phrase** is the instrument's name as that path prints it, a comma, the key `thresholds`,
the threshold's 1-based written position, and a colon — the form a row sentence about one threshold
takes (`:382`). Jefferson's own path prints `instrument "<name>", thresholds <N>:` and the provided path
prints `"<name>", thresholds <N>:`. It is composed by one function in `configuration.ts` that both
paths call, and it names nothing else (ADR 0015). That function is not exported: `tests/jefferson.test.ts:237-240`
pins `configuration.ts`'s runtime exports exactly, so exporting it would break the pin. A sentence inside a threshold is the place phrase, a
space, then the predicate the same fault's top-level sentence carries after its subject; on the
provided path it keeps the closing `; it renders blank`. A forwarded parser sentence, which begins
`format …`, follows the colon whole, so it is forwarded and not reworded, and takes no possessive.
Two examples: `instrument "context", thresholds 5: format names a variable it does not declare:
"$nope"` and `"taiknr.usage", thresholds 3: is configured with a fill Jefferson cannot use; it
renders blank`.

**`validateStyle`'s sentences.** Its signature is `validateStyle(raw: unknown, theme: Theme, option:
"style" | "fill" = "style")`, and all four of its sentences name the option: `has a ${option} that
is not an object`, `has a ${option} key that pi's ThemeStyle does not have: …`, `has a ${option}
attribute that is not a boolean: …`, and `has a ${option} whose ${key} is neither a ${slot}-slot
theme token nor a color pi's parser accepts: …`. By DEC-14's one-shape rule `style`'s fg/bg sentence
therefore changes, and the five pre-existing expectations that move with it, and nothing else, are
`tests/format.test.ts:246`, `:247`, `tests/configuration.test.ts:1134`, `:1140` and
`tests/jefferson.test.ts:547`. The six two-argument calls at `tests/format.test.ts:230-250` compile
unchanged, because the parameter is defaulted.

## Decisions

Each decision below is the design's, and each rests on a ruling or a measurement named beside it.

**DEC-1. One threshold reader, in a new pure source file, called by both settings paths.**
The set rules are written once in `extensions/jefferson/thresholds.ts`, whose row in the New table
above points at the statusline delta for the input contract and restates none of it. Each settings
path keeps the per-value checks it already performs and hands them to the reader, which runs them over
every threshold written, before anything is dropped, so "every value inside a threshold is checked as
a top-level value is" is true by construction rather than by a copied rule
(`michael-council-rulings.md`, the malformed-input row). Because that check defaults no value, a
threshold that leaves out `format` takes the top level's, never the declaration's default (statusline,
"A threshold's state changes only the keys it names"). What the reader returns, and the point at
which an instrument's settings are accepted before its over-four warning moves, are `### Contracts`'s. *Alternatives weighed:* adding the rules to each path — rejected because the count,
range, duplicate, sort and cap rules would then have two homes and a later change would have to find
both (`michael-orientation.md` T6);
a settings-validation framework — rejected as invented machinery for five rules (`owner-rulings.md`,
2026-11-03, "Don't invent what we don't have to").

**DEC-2. The defaults live beside the reader, as the list in force when the settings carry none.**
`thresholds.ts` holds the two defaults — `activeAt` 70 setting the fill to `warning`, `activeAt` 90
setting it to `error` — and every instrument's threshold list is "what was configured, or the
defaults". Because a default is a threshold like any other, it is layered, bound, and reached by the
same code path as a written one. *Alternatives weighed:* `bar.ts` — rejected, since the visual draws
what it is handed, imports no file of this package, and its runtime surface is pinned to `drawBar`
(`michael-council-rulings.md`, the defaults-location row); `configuration.ts` — rejected, since the
binding needs the defaults for an instrument whose settings carry no such key, and a document that
never names an instrument must still give its bar the defaults; a third constants file — rejected,
one value with one home.

Because the defaults' home is a new shipped source file, the shipped-file check and the runtime
export pin in `tests/jefferson.test.ts` join the Modify set (`michael-council-rulings.md`, the
defaults-location row). `bar.ts`'s own pin does not move: the drawing gains no export.

**DEC-3. The drawing takes the fill's style and makes no colour decision.**
`drawBar` gains the state's effective fill beside its effective style and applies no percentage choice
at all: its signature, and what the filled columns and the track each take, are `### Contracts`'s
"The drawing path". This is what makes "Looking for the bar" provable by calling the exported
`drawBar` with a fill style and seeing it applied unchanged at every percentage
(`michael-council-rulings.md`, the extension-source-layout row). *Alternatives weighed:* keep the
constants in `bar.ts` and pass only the list — rejected: a default in the visual is a percentage-to-colour choice inside the drawing,
which the spec's own scenario forbids; a second drawing function for the thresholded case —
rejected: duplicate geometry, and the two would drift.

**DEC-4. Each honoured state is layered first, then bound in full, at bind time.**
The state in force is one settings object: each option is the threshold's value layered on the top
level's — never another threshold's — by the layering `### Contracts` states. That object is then
bound exactly as the top-level settings are, so each state has its own segments, label and gap,
composed choice and kind formats, `fills`, effective style and effective fill. At most five states
exist per instrument, and the cost is bounded at five because the cap is four
(`michael-council-rulings.md`, the layering-order and binding-each-state rows; `owner-rulings.md`,
2026-11-25, "replaces only the keys it names").
*Alternatives weighed:* layer at render time — rejected: the label's gap, the composed choice and
`fills` cannot be derived from a merge performed per frame, and each frame would redo a merge whose
answer never changes; bind the top-level form and patch in the threshold's format — rejected: a
patched form is a second binding rule beside the first.

**DEC-5. The default layering depth is one level, and it is general.**
Layering merges object-valued options one level deep, which is exactly what `style`, `fill` and
`formats` need and needs no list of which options are object-valued
(`michael-council-rulings.md`, the `formats`-depth row). What each value does once parsed — a record
merging one level, a segment list and a label replacing whole — is `### Contracts`'s.
*Alternatives weighed:* a deep merge — rejected: no option's value is an object of objects, and a
deep merge would invent a rule no setting uses; a named list of the mergeable options — rejected: a
second list beside the declaration's.

**DEC-6. The state is chosen once per instrument per sample, and every placement reads it from the
binding.** The bound instrument — one per name per read (`instrument-binding.ts:285-288`) — holds one
slot: the last sample object it was handed, and that sample's outcome. An outcome is one of two
things:

- the raw reading, exactly as the declaration's `bar` answered it — a number, `null` or `undefined` —
  together with the state that reading chose;
- the throw that choosing the state raised.

The slot keeps the raw reading beside the state rather than the state alone. Unknown counts as 0 only
in the comparison that picks the state (DEC-10); the value the slot holds is the one the declaration
answered, so the filled columns and DEC-10's `null`-versus-`undefined` judgment both come from that
single reading. That binding is the one object every placement shares, because `containProvided`
wraps each placement separately (`configuration.ts:491-493`, called per placement at `:423`). A call
with the same sample object answers from the slot, and a new sample object replaces it, since a
footer render takes one sample (`row-renderer.ts:123`, `session-data-store.ts:147-168`). So every
placement, in every row, sees one reading and one state per sample, and the next sample reads again
(instrument-registration, "The next render MUST try again"). Every call consumes the slot the same
way: `fills(readings)` answers the chosen state's `fills`, and `render(readings, width, theme)`
renders the chosen state's bound form and hands `resolveFormat` the slot's raw reading, in the shape
`### Contracts`'s "The drawing path" gives. Neither call reaches the declaration's `bar` again for
a sample the slot already holds. When DEC-8 decides at bind that the bar is not read, no reading is
taken at all and every call answers the top-level state.

The slot's lifetime, precisely:

- It is replaced, never cleared. The first call carrying a new sample object replaces it, which is
  the moment the row's per-sample text memo turns over (`row-renderer.ts:43-46`).
- Every footer render brings a new sample object (`row-renderer.ts:123`; `footer-setup.ts:30` is the
  host's only render path; `session-data-store.ts:147-168` builds a new object on every call).
- Between renders it holds the last sample and its outcome, as the row's memo holds its last sample
  and texts.
- It is released with the bound instrument, which lives as long as the configuration read that bound
  it (`configuration.ts:488`), and it goes when the next `session_start` installs a new footer
  (`startup.ts:126-156`).
- It answers only a call carrying the identical sample object, so no render is ever answered with a
  reading taken for another sample. That is the property `AGENTS.md`'s "never subscribe, poll, or
  cache host data" protects.
- Unlike the row's memo, `invalidate()` (`row-renderer.ts:71-74`) leaves it alone. The memo holds
  themed text, while the slot holds a reading and the bound state it chose, and every render is
  handed its theme (`instrument.ts:17`).

The row holds no reading and no state: it reads `fills(current)` and calls
`render(current, width, theme)` for each placement, as it already passes `current`
(`row-renderer.ts:49`), and its per-sample text memo stays unchanged. `format.ts` no longer reads a
declaration's `bar`; the binding hands it the slot's reading, as `### Contracts`'s "The drawing
path" says (`michael-council-rulings.md`, the one-reading row). That is the single guarantee making the plan and
the drawing agree: one choice per sample. A remembered throw answers every later placement in that
sample with the same throw (DEC-9). *Alternatives weighed:* leave each call site to read the bar —
rejected: today `textAt` renders at two widths and `fills` is read separately
(`row-renderer.ts:42-59`), so a provider whose value moves between reads would be planned at one
geometry and drawn at another; cache the state by reading — rejected: the slot is keyed to the sample
object, where a cache keyed to the value would outlive the sample it was read for, which `AGENTS.md`
forbids.

**DEC-7. `fills` becomes a function of the sample's readings.**
`Instrument.fills` stops being a value fixed when the instrument is bound and answers per sample, so
a threshold whose format adds or drops `$bar` decides the instrument's width from that percentage on.
A declaration that sets `fills: true` answers true at every reading, whatever the state in force draws
(statusline, "A threshold's format decides whether the instrument fills"), so nothing else moves. The
two members that contract then holds are `### Contracts`'s. The row asks it with the sample for each
placement, and every answer within one sample comes from the one state (DEC-6), so the row still hands
`width-plan.ts` one boolean. *Alternatives weighed:* make an
instrument fill whenever any of its states draws a bar — rejected: a state would then shape the
instrument below its own percentage, which is the coupling "thresholds are independent" and
"variables are never coupled" rule out (`michael-orientation.md` S1); have the row probe for `$bar`
itself — rejected: the row would then parse what the binding parses.

**DEC-8. Whether the bar is read at all is decided once, when the instrument is bound.**
The instrument reads the bar only when the reading can change what renders: its top-level format
names `$bar`, or an honoured threshold sets an option other than `fill`. Both conditions are known at
bind, so no record of who wrote the list is kept, and the defaults fall under the same rule
(`michael-council-rulings.md`, the when-the-bar-is-read row). *Alternatives weighed:* read whenever
the settings carry thresholds — rejected: a state that sets only `fill` changes nothing when no
`$bar` is drawn, and reading for it would report a fault for a bar the user never placed, against
ADR 0020; a flag recording whether the list was written — rejected: a flag the rule does not need,
since a written list that sets only `fill` gains nothing by being read.

**DEC-9. The state choice sits inside the provider's boundary.**
For a provided instrument, the wrapper on each placement catches a throw from `fills(readings)` and
from `render`, a remembered throw out of the sample's slot included, where `containProvided` today
wraps only `render` (`instrument-binding.ts:266-279`). A caught throw costs one fault and leaves every
placement of that instrument rendering nothing in the geometry the top-level settings give: the
`fills` catch answers the bind-time `topLevelFills` (`### Contracts`) without ever calling back into
the inner instrument, whose slot would replay the throw out of the wrapper, and the `render` catch
answers `""`. The row, every other row and pi keep rendering, and the ledger keeps the fault to one
(`faults.ts:51-58`, `michael-council-rulings.md`, the containment row). The `fills` catch records the
adapter's own fault, kind `resolver-threw` and the sentence `### Contracts` gives it, because while
`fills` runs the only provider code reached is the `bar` that chooses the state; the `render` catch
keeps today's sentence (`instrument-binding.ts:275`), since a variable's result can escape there too
and the wrapper cannot tell which member threw. The row plans `fills` before any render, so the
`fills` catch records first and the ledger keeps that sentence for the session. Jefferson's own
instruments stay unwrapped, as before. *Alternatives weighed:* guard at the row — rejected: a second
boundary beside the adapter's, which the next caller has to remember to use, and `AGENTS.md` asks for
the structural guarantee over the remembered rule; guard inside the resolution itself — rejected: the
adapter's existing guard covers only the provider's own call, and the measured escape is in reading
the returned value after it.

**DEC-10. Blanking is judged against the state in force, after the state is chosen.**
Both `undefined` and `null` count as 0 when the state is chosen. Then, if the state's own format names
`$bar`: `undefined` renders nothing, label included, and `null` draws the whole track unfilled in
`dim`. If it names no `$bar`, the instrument renders. This is what keeps a state at 0 able to drop
the bar, which judging against the top-level format would forbid
(`michael-council-rulings.md`, the blanking-against-the-state row; `owner-rulings.md`, 2026-11-25,
"unknown is always 0"). *Alternatives weighed:* judge against the top-level format — rejected: a top-level
`no estimate $bar` with a state at 0 giving `no estimate` would blank, though the state in force
names nothing unknown; treat unknown as a blank before choosing — rejected: the state's format is
not known until the state is chosen.

**DEC-11. The over-four warning is composed once and delivered through the fault ledger.**
`thresholds.ts` composes the sentence; its exact wording is `### Contracts`'s "The reader's
result". The reader returns it and reports nothing, and delivery is the ledger both times — each
path moves it only once that instrument's settings are accepted, which `### Contracts` states
(`configuration.ts:278`, `:519`, `startup.ts:138`).
`Configuration.warning` does not carry it, because its contract is a rejected or unreadable document
(`configuration.ts:88`). One warning per instrument per
session follows from the ledger's deduplication by scope and kind (`faults.ts:54-56`), and the
sentence is identical whichever side of the read the registration lands
(`michael-council-rulings.md`, the warning-path row). *Alternatives weighed:* a new `Configuration`
field with a second delivery — rejected: it gives one sentence two channels and contradicts the
field's contract; a notice raised directly — rejected: a late registration has no `ctx` to notify
through, which is the same limit `research-chidi.md` §3 found and the ledger already works around.

**DEC-12. The without-`bar` refusal gets its own kind and its own sentence.**
The kind is `option-without-bar`, a member beside `option-unimplemented` and
`formats-without-composed` (`registration-listener.ts:214-223`). Its refusal variant, its order
inside the option loop and its sentence are all `### Contracts`'s. `option-unimplemented` stays true for what it still covers: a name outside the
accepted set, `seconds` and anything else (`michael-council-rulings.md`, the refusal-kind row). *Alternatives weighed:* reuse
`option-unimplemented` — rejected: its sentence says Jefferson does not implement the option, which
is false for both new names once this change ships.

**DEC-13. The two opt-ins are separate, and both are declaration-driven.**
`thresholds` and `fill` are option names in the published contract, and a provided instrument takes
each when its declaration carries `bar` and names that option; a shipped declaration that carries
`bar` lists both. Naming either without `bar` is refused. No code names `context`: the declaration's
options decide, so the next bar-capable instrument — Jefferson's or, in a later change, a user's —
takes thresholds by declaring them (`owner-rulings.md`, 2026-11-25, "That's exactly it";
`michael-council-rulings.md`, the opt-in rows). *Alternatives weighed:* make `bar` alone grant both —
rejected: it erases the opt-in boundary the owner ruled and forbids a provider's own bar its own
choices; couple the two names — rejected: neither subset could never act, so the coupling would be a
rule whose removal breaks nothing.

**DEC-14. A fault inside a threshold names the option as written and the written position.**
The settings paths already place a fault by its position counted from one (`configuration.ts:372`,
`:382`), and the style validator's sentences hardcode the word "style" (`format.ts:186`, `:201`,
`:219`), so the validator takes the option's name from its caller. A `fill` fault then reads as
`fill`, and the position is the threshold's place in the list as written, whether or not an ignored
threshold stands before it (`michael-council-rulings.md`, the malformed-input row; ADR 0015). The
place phrase, and every fault's kind and what its sentence names, are `### Contracts`'s.
*Alternatives weighed:* a second sentence per option — rejected: one message shape with a parameter
beats two shapes; position after the drop above 100 — rejected: the user counts what they wrote.

**DEC-15. An ADR retires pi parity on the boundary, and it is written in the docs pass.**
The change owes a record that outlives it (`AGENTS.md`, "Where decisions live"). The ADR's decision:
a bar's threshold applies at its own percentage; the strict "above" copied pi 1.4.0's footer and is
retired; a future pi pin does not reintroduce it, and a later change to this boundary supersedes this
ADR rather than quietly differing from it. It also records why the living scenario could cite the
host — the boundary was parity, not a rule — and that the defaults are the owner's, not the host's.
Its home is `docs/adr/`, under the next free number, with ADR 0009's sentence about the bar's
threshold colours and ADR 0020's `$bar` wording marked as amended by it. The reasoning lands there
because an accepted ADR's body is never edited and a change's reasons do not belong in its own
directory once it archives. *Alternatives weighed:* leave the living scenario's source as it is —
rejected: it would name a rule this change retired, and the next reader would restore it; record the
retirement only in the change's own artifacts — rejected: the change archives, and the next reader of
the boundary would not find the reason.

## Risks / Trade-offs

- **A provider's bar throws while the row is planned.** A value whose `then` getter throws escapes
  the adapter's guard (`instrument-binding.ts:100-113`, measured in `michael-orientation.md` T3), and
  the row reads `fills` on every plan with no guard (`row-renderer.ts:56-59`, `:92`) while
  `pi-tui`'s container calls each child with no try/catch. → The state choice is wrapped by
  `containProvided` (DEC-9): one fault, that instrument renders nothing in the top-level geometry,
  and every row renders. The scenario is in the `instrument-registration` delta, and the pair of
  cases in `tests/registration.test.ts` covers the geometry either way.
- **The plan and the drawing disagree within one frame.** A provider's value that moves between two
  reads leaves the row sized for a format with no `$bar` and then drawing one, clipping the row. →
  One reading and one state per instrument per sample, held in the binding and answered to every
  placement in every row (DEC-6), with a test that renders one sample at both widths and places the
  instrument twice in one row and once in another.
- **A bar is read for a value that never changes what renders.** A `$bar`-less format with a user's
  list of fill-only thresholds would read the bar every frame, and a faulting provider bar would be
  reported for a bar no row draws. → The read rule of DEC-8: the reading is taken only when the
  top-level format names `$bar` or an honoured threshold sets an option other than `fill`, with the
  delta's scenario that a provided bar which would throw is never read.
- **The over-four warning becomes two warnings, or none.** A document read twice, or a registration
  that arrives after the read, could warn twice or not at all. → One composing function, one channel,
  a ledger keyed by scope and kind (DEC-11), and the delta's scenario for the late registration.
- **An existing bar changes colour at exactly 70 and exactly 90.** Every user's `context` bar turns
  `warning` at 70 rather than above it, and a provider's bar with no options does the same. → This is
  the ruled fix, recorded as breaking in `proposal.md`, proved by the flipped strict-edge test, and
  announced to extension authors in the docs pass with the ADR that retires pi parity (DEC-15).
- **A user's top-level fill colour is overridden from 70.** A user who writes
  `"fill": {"fg": "muted"}` and never writes a list finds `warning` from 70, because the defaults are
  two ordinary thresholds that layer key by key. → Recorded by the ruling and by the delta's two
  scenarios (`muted` at 75 is `warning`; `bold` survives). The escape is documented: `"thresholds":
  []` is no thresholds at all.
- **A threshold that adds or drops the bar reflows the row.** The row's columns shift when the
  percentage crosses such a threshold. → Accepted as the only reading consistent with independent
  states (DEC-7); the alternative fills the instrument whenever any state draws a bar, which shapes
  the instrument below that state's percentage.
- **A fault in a `fill` reads as a fault in a `style`.** The style validator's sentences hardcode the
  word (`format.ts:186`, `:201`, `:219`), so a `fill` colour the theme lacks would be reported as a
  style fault. → The validator takes the option's name, and both paths name the fault from
  `### Contracts`'s table — `settings-fill` for a provider's, the `instrument "<name>" …` sentence for
  Jefferson's own — with the place phrase (DEC-14), and a test asserting the sentence says `fill`.
- **A malformed threshold above 100 rejects a document whose value could never apply.** Two
  thresholds at 110, or `150.5`, refuse the whole document. → Ruled, and consistent: the duplicate
  and malformed rules carry no range qualifier, and every threshold is checked before the drop above
  100. Documented in the delta's scenario and in the docs pass.
- **Five bound states per instrument where one existed.** Binding segments, label, composed choice
  and `formats` five times over is more work at bind for a bar-carrying instrument. → Bounded at five
  by the four-item cap, and built once per configuration read when the instrument is bound and never
  per frame (DEC-4).
- **`-0` and `0` are the same threshold.** JSON cannot tell them apart, so a user who writes both is
  refused as a duplicate. → Ruled and documented; the parsed number is judged, never its spelling,
  which also makes `70.0` and `7e1` the threshold at 70.

## Migration Plan

**Rollout.** There is nothing to deploy and nothing to back-fill. Jefferson ships as a package, and
the change takes effect for every user on the release that carries it. Thresholds live only in the
settings document a user writes; Jefferson persists nothing, so no stored state moves.

**The three skew cases, all of them the standing strict-boundary rules working as designed**
(`AGENTS.md`; `michael-council-rulings.md`, the migration row).

1. **Downgrading while `thresholds` or `fill` is written.** An older Jefferson rejects the whole
   document for a key an instrument does not declare (`configuration.ts:290-293`), so the default row
   renders and one warning names the instrument and the key. The step: remove `thresholds` and `fill`
   from the settings document before downgrading, then re-add them on the newer release. Nothing is
   lost, because the document is the only copy and the user holds it.
2. **A provider that names either option on an older Jefferson.** Its registration is refused as an
   unimplemented option (`instrument-binding.ts:154-158`) and a row naming it renders as an unknown
   name. The step: extensions gate the opt-in on the first Jefferson version that ships it, and the
   docs pass writes that minimum version into `docs/extension-authors.md`. Providers already shipping
   `options: ["formats"]` are unaffected.
3. **Documents that are valid today.** None changes meaning. The only visible change is the boundary
   at exactly 70 and exactly 90, for every bar, which is the ruled bug fix and is recorded as
   breaking in `proposal.md`.

**Rollback.** Revert the commit and cut a release. There is no data migration to unwind, no schema,
and no cached state; a document carrying the new keys behaves as case 1 until the fix returns, so a
rollback that must not disturb users rests on the same step. A partial rollback that keeps the
settings reading and stops the drawing would leave the two disagreeing, so the change is reverted
whole.

**Post-merge hand-off (the docs pass), once Michael approves the implementation.** These cannot
happen inside the change, and none of them blocks the feature:

- `docs/formats.md:92` — "above 70%… above 90%" becomes the boundary at the number.
- `docs/configuration.md:76` — "any instrument whose format holds `$bar`" fills, no longer true once a
  state's format decides.
- `docs/instruments.md:27-29` — "Every instrument takes three options" gains the two names.
- `docs/extension-authors.md:144`, `:247`, `:258` — `formats` is no longer the only extra option; the
  page gains the two opt-ins, the cost of naming `thresholds` without `fill`, and the minimum version
  for case 2 above.
- `ARCHITECTURE.md` — the configuration paragraph's list of what is checked at read time.
- `docs/adr/` — the new ADR from DEC-15, with ADR 0009's threshold sentence and ADR 0020's `$bar`
  wording marked as amended by it.
- Every other Markdown file on the conductor's list, checked for a copy of a sentence this change
  makes false (Derek's list is the starting point).

## Open Questions

- **An option the reader applies, inside a threshold.** Today no declaration carries both `bar` and
  an option the reader itself acts on — `notice` is the only instrument with `seconds` and it has no
  bar, and providers are refused `seconds` (`tests/instrument.test.ts:82`, `:85`). If a later change
  gives a bar-carrying instrument such an option, that change decides whether a threshold may carry
  it and what a threshold would mean. Nothing here changes: a threshold takes its declaration's
  options minus `thresholds`, and no second list is added.
- **The exact version number in the extension-author docs.** The docs pass names the first release
  that accepts the two opt-ins; the number depends on the release, not on this design.
