# Proposal

## Why

The bar that `context` draws already shifts colour as pressure rises, but where it shifts and what
it becomes are fixed in the code. Joel's card asks for both to be the user's: *"To start, I'd like to
give user's the option to set their threshold percentages and what their expected state for the bar
is at each of those changes."* (`owner-rulings.md`, 2026-11-25)

The rule it follows today is also the wrong one. It turns `warning` strictly above 70 and `error`
strictly above 90, copying pi 1.4.0's own footer (`michael-orientation.md` D2). Joel ruled the
boundary is `>=` and called the strict rule a bug: *"That was supposed to be a `>=`"*
(`owner-rulings.md`, 2026-11-25). So this change makes the bar's state a setting the user owns, and
puts the boundary where he ruled it.

## What Changes

- **A bar's state becomes a setting.** An instrument that takes `thresholds` accepts a list: each
  entry an integer `activeAt` and any option the instrument declares, `thresholds` excepted. The
  highest `activeAt` at or below the bar's reading sets the instrument's state; with no entry, the
  top-level settings apply.
- **`fill` styles the bar's fill.** A new option, at the top level and inside a threshold, taking
  `style`'s shape. `style` keeps covering the whole instrument, and a threshold's `style` and `fill`
  layer on the top-level ones key by key.
- **BREAKING: the defaults apply at 70 and 90 themselves.** An unconfigured bar keeps the theme's
  `warning` from 70 and `error` from 90, and now colours at exactly those numbers — every bar,
  Jefferson's own or a provider's. The strict "above" rule was pi's; it is retired, and an ADR
  records that.
- **A user's list replaces the defaults.** `"thresholds": []` turns the colours off.
- **The limits are ruled, not guessed.** A missing, non-whole, negative or duplicated `activeAt`
  rejects the settings; more than four entries load with one warning and the four lowest `activeAt`
  apply; a whole number above 100 loads and does nothing.
- **An unknown percentage counts as 0**, and the comparison uses the bar's own reading, not the
  rounded text `$percent` prints.
- **The state decides the instrument's width**, so a threshold that adds or drops `$bar` reflows the
  row at that percentage.
- **Providers opt in by name.** A provided instrument takes `thresholds` and `fill` when its
  declaration carries `bar` and names them in `options`, each name standing as its own opt-in;
  naming either without `bar` is refused by a sentence of its own. The published contract gains two
  option names and no runtime statement.
- **One rule is narrowed, not dropped.** The bar is read to choose a state only when the state can
  change what renders: the format in force names `$bar`, or a threshold sets an option other than
  `fill`. The rule that a variable the format leaves out is never resolved stays true for `$bar`
  itself.

## Capabilities

### New Capabilities

None. The change adds behaviour to capabilities the project already has.

### Modified Capabilities

- `statusline`: what a bar's state is, the defaults and their boundary, the `fill` option, the count
  and error rules, the reading compared, the width the state decides, a provided instrument's option
  list, and the rule for a variable the format leaves out.
- `extension-source-layout`: "The bar has its own file" — `bar.ts` no longer holds the thresholds,
  and the bar no longer renders byte for byte, because the fill's style now comes from the settings.
- `instrument-registration`: "Provider code costs one entry and no more" — a faulting `bar` is
  unknown, counts as 0 when a state is chosen, and blanks only a bar the format draws, and a throw
  while the state is chosen costs one entry and never the row.

## What this change does not do

- No threshold on a non-numeric datum: the card puts that out of scope, and `activeAt` is a
  percentage.
- No change to the bar's width, its grammar, the track it draws for a `null` reading, or its geometry
  (`michael-orientation.md` D11, §2).
- No change to `notice`, `seconds` or composed `formats`, and none to a provider's own code.
- No change to the published contract's types-only export or the CI pin on it.

## Impact

- Reading and checking settings: `extensions/jefferson/configuration.ts` and
  `extensions/jefferson/components/instruments/instrument-binding.ts`. The rules above are written
  once for both origins, which differ only in how a fault is surfaced (`michael-orientation.md` T6).
- The declaration and the binding: `extensions/jefferson/components/instruments/instrument.ts`,
  `instrument-binding.ts`, and `components/instruments/context.ts`, today's only shipped instrument
  with a bar.
- The registration path: `extensions/jefferson/registration-listener.ts`, for the refusal of
  `thresholds` or `fill` without a bar, which gets a kind and a sentence of its own rather than the
  sentence for an option Jefferson does not implement.
- The row: `extensions/jefferson/components/row/row-renderer.ts`, whose `fills` read carries no
  readings, so a state that decides the width has to reach the plan.
- The drawing: `extensions/jefferson/components/visuals/bar.ts`, and the format path in
  `extensions/jefferson/format.ts`.
- The published contract: `extensions/jefferson/instrument-contract.ts` gains option names only.
- Tests: the strict-edge expectations in `tests/format.test.ts` flip rather than disappear;
  `tests/instrument.test.ts` pins each shipped declaration's options and its `bar`; and new cases
  cover a configured threshold, the defaults at exactly 70 and 90, a rejected document, the
  four-entry cap, the empty list, the unknown-as-0 case and a provider's refusal.
  `tests/fixtures/sample-provider/provider.mts` gains an instrument that opts in, so the opt-in is
  exercised through the real registration path.
- Documentation the change makes false, for the docs pass: `docs/formats.md` ("above 70"),
  `docs/configuration.md` ("any instrument whose format holds `$bar`" fills), `docs/instruments.md`
  ("Every instrument takes three options"), `docs/extension-authors.md` (`formats` as the only extra
  option), the configuration paragraph in `ARCHITECTURE.md`, ADR 0009's sentence that the bar's
  threshold colours live in `bar.ts`, ADR 0020's wording, and one ADR retiring pi parity.
- The design's file map is the complete list. This one names the areas.
- Rollback and version skew are the design's Migration Plan, not this proposal: an older Jefferson
  rejects a document that writes `thresholds` or `fill`, refuses a provider that names either, and
  changes no document that is valid today except at exactly 70 and 90.

## Open questions

These belong to the design, and it must close each:

- **Where the defaults live.** They are the default value of `thresholds`, a setting of the
  instrument, so they live where the settings are applied, never in the visual, which draws what it
  is handed. Two constraints bound the choice: the bar's percentage is the instrument's setting by
  the delta's own words, and `bar.ts`'s runtime surface is pinned to `drawBar`. A choice that adds an
  export or a file extends that pin and the shipped-file check in `tests/jefferson.test.ts`.
- **Each state's bound form.** A threshold may set a format, a label, a composed choice or `formats`,
  so each honoured state is bound once as a whole instrument is: its own segments, its label and gap,
  its composed choice, its `fills`, and its effective style and fill.
- **One over-four warning: one wording, one channel, two moments.** The sentence is composed once and
  reaches the fault ledger through `source.report` at either moment: from the read's fault list for a
  document that installs, and from the watch for a check that runs later. `Configuration.warning`
  carries no such warning, and startup needs no change.
- **One threshold reader** serving both settings paths, so the rules above are written once.
- **Where the state is chosen**: once per instrument per sample, with one reading, inside the
  provider's boundary, and handed to the drawing in place of its own call to `bar`.
