# Red/green spike — `bar-thresholds`

Everything the design and the three delta specs imply that could be measured is measured here: 50
labelled checks, each written against a quoted expectation, and each red before the smallest change
the design specifies and green after it — except the six marked as pins (A33, A35 and P1–P4), which
were already green at the base. The change was built far enough to run every check through the real
settings paths, the real binding, the real row and the real registration bus — 628 tests and `pnpm
typecheck` clean in the copy — and then thrown away, as a spike's code is. Nothing ships from this
report.

## How the spike ran

- **Base:** `git archive HEAD` of branch `bar-thresholds` at `9c5b7f3` ("Proposal, specs and council
  for bar-thresholds"), whose code is identical to `main`'s `e44cb8c`. Two full copies under
  `mktemp -d`: `…/tmp.MelH8w2v6W/base` (pristine, for the base measurements) and `…/spike` (the
  working copy). Each installed its own dependencies with `pnpm install` (125 packages, its own
  `node_modules`, never a link to another checkout's).
- **Commands, in the copy:** `pnpm test` (`node --test`), `pnpm typecheck` (`tsc --noEmit`),
  `node --test tests/<file>.test.ts` for a single file, and — for the provider fixture — the CI
  step reproduced by hand: `pnpm pack`, extract the tarball into
  `$tmp/provider/node_modules/pi-jefferson`, `pnpm exec tsc -p $tmp/provider/tsconfig.json`, then the
  same for `tsconfig.reserved.json`, which must fail with `TS2344`.
- **The base's own numbers:** 578 tests pass, `pnpm typecheck` clean. Every red below is measured
  against that base or against the partially-built spine, and says which.
- **The project's checkout was never touched.** `git status` at the end is the same list it was at
  the start: the four modified and five untracked change artifacts, and this report.

## The base, measured

`…/base/.scratch/probe.ts`, run on the pristine copy:

```
drawBar(10, 70, {bold:true}, {fg:"warning"})[0].style -> {"bold":true}      # the fill argument is ignored
drawBar(10, 70.1, {}, {})[0].style                  -> {"fg":"warning"}     # strict "above"
{"label":"","format":"$bar"} at percent 70  -> warning: none, has warning: false
{"label":"","format":"$bar","thresholds":[]} -> warning: instrument "context" carries an option its declaration does not have: "thresholds"
{"label":"","format":"$bar","fill":{…}}      -> warning: instrument "context" carries an option its declaration does not have: "fill"
```

That is the whole change in three lines: the drawing makes its own colour choice at a strict
boundary, and neither new key exists.

## The change, in one place

Two new files and the design's nine modified ones, no more: `extensions/jefferson/thresholds.ts` (131
lines: the defaults, `readThresholds`, `stateAt`, `layerThreshold`, the fault vocabulary, the
over-four sentence) and `tests/thresholds.test.ts`; modified `components/visuals/bar.ts` (23 changed
lines), `format.ts` (30), `components/instruments/instrument.ts` (12),
`components/instruments/instrument-binding.ts` (198), `components/row/row-renderer.ts` (4),
`configuration.ts` (360), `registration-listener.ts` (5), `instrument-contract.ts` (7),
`components/instruments/context.ts` (5). On the test side: the new file plus `format.test.ts` (33),
`instrument.test.ts` (92), `configuration.test.ts` (186), `registration.test.ts` (268),
`jefferson.test.ts` (3), `row-renderer.test.ts` (62) and `fixtures/sample-provider/provider.mts`
(18). No new dependency, no change to `package.json`, and the published export and its CI pin are
untouched.

## The reader's rules

`tests/thresholds.test.ts`. Red at the base as a missing module — unavoidable for a new file, which
is why every rule below was also shown catching a deliberate mistake (see "Mutations").

| Check | Expectation it proves | Source |
|---|---|---|
| A1 | A list reads as honoured states, ascending | design `### Contracts`, "the sort ascending and keep four" |
| A2 | Not a list → `settings-thresholds` | statusline, "A thresholds value that is not a list" |
| A3 | An entry that is not an object → a fault at its written position | statusline, "An entry that is not an object" |
| A4 | `activeAt` missing, `"70"`, `70.5`, `-5`, `1e400` → a fault at its position | statusline, "A malformed threshold rejects the settings", "A number that parses to no whole number" |
| A5 | `70.0` and `7e1` are the threshold at 70; `-0` is the threshold at 0 | statusline, "A number JSON writes another way" |
| A6 | `-0` and `0` in one list are a duplicate | statusline, "A negative zero" |
| A7 | Two at 110 are a duplicate, "whatever the number" | statusline, "Two thresholds at one number above 100" |
| A8 | The fifth entry at 101 is still checked, and its refusal answers at position 5 | statusline, "A fault in a threshold above 100"; design, "check included, before the drop above 100" |
| A9 | Every threshold written is checked, in written order | design DEC-1; the round-4 CR4-1 fix |
| A10 | A duplicate written before a refused threshold is the fault answered | design, "The first fault met ends the read" |
| A11 | A threshold that sorts first keeps its written position | statusline, "A position counted before the sort" |
| A12 | Five written warns once, names the instrument, says more than the maximum and that entries past the four lowest are ignored; only four are honoured | statusline, "A fifth threshold", "The four lowest apply", "The over-four warning is composed once and reported once" |
| A13 | Four written warns nothing; an entry above 100 drops silently | statusline, "Four with one above 100", "A percentage above 100" |
| A14 | 10, 20, 30, 101, 102 → the three below 100 decide | statusline, "Three with two above 100" |
| A15 | The state is the highest `activeAt` at or below the reading, at its own number included | owner ruling `>=`; statusline, "A threshold at its own percentage", "Two thresholds below the reading", "Below every threshold" |
| A16 | 0 and 100 apply at their own numbers | statusline, "The boundaries" |
| A17 | An unknown reading counts as 0; otherwise the top level stays in force | owner ruling "unknown is always 0"; statusline, "An unknown percentage" |
| A18 | A negative reading sits below every threshold | statusline, "A negative reading" |
| A19 | A record merges one level deep, a list and a label replace whole, and a kind a threshold leaves out is the top level's | statusline, "A threshold's state changes only the keys it names"; design DEC-5 |
| A20 | The defaults are 70 → `warning`, 90 → `error` | statusline, "The default thresholds are 70 and 90"; design DEC-2 |

Green: 20 of 20.

## The drawing

`tests/format.test.ts`.

- **A21 "The drawing applies the fill it is handed unchanged, and chooses no colour of its own"** —
  extension-source-layout, "Looking for the bar" and "The bar renders as before"; design DEC-3. Red
  at the base *at the assertion*: `the fill at 0 … actual {"bold":true} - expected {"bold":true, fg:
  "warning"}`. Green once `drawBar` takes the fill.
- **A22 "The default thresholds colour the fill at seventy and ninety themselves"** — statusline,
  "Exactly 70", "Exactly 90", "Below the first default". 69.9 → `accent`, 70 → `warning`, 70.1 →
  `warning`, 90 → `error`, 90.1 → `error`, with the filled column counts 6, 7, 7, 9, 9 at width 10.
  Red at the base: the base gives `accent` at exactly 70, which is what today's own test pinned
  (`bar thresholds replace only foreground above seventy and ninety`, which passed on the base with
  `[70, "accent", 7]` and after the change had to be rewritten). Green: the whole file, 90 of 90.

## The settings path — Jefferson's own instruments

`tests/configuration.test.ts`, through `readConfiguration` and the real source. The whole group was
red before the two option names and the reader reached `context` (10 failures: `instrument "context"
carries an option its declaration does not have: "thresholds"`, exactly the base's behaviour
measured above), and green afterwards.

| Check | Expectation it proves | Source |
|---|---|---|
| A23 | At 70 the threshold's format and fill are in force; at 50 the top level's are | statusline, "A threshold reached", "Below every threshold" |
| A24 | One threshold at 90 leaves no default colour at 75; `[]` colours nothing at 95 | statusline, "One threshold and no default", "An empty list" |
| A25 | At exactly 70 the fill is `warning`, at exactly 90 `error`, below 70 the style's own; the text never takes the threshold's colour | statusline, "Exactly 70", "Exactly 90", "A default colours the fill and no text" |
| A26 | `"fill": {"fg": "accent", "bold": true}` colours the fill, and the 70 default replaces only the key it names, so bold survives | statusline, "A default over a top-level fill colour", "A default keeps another fill key", "A top-level fill before any threshold" |
| A27 | A threshold's `style` colours the text and never overrides a `fill`, and never reaches the track | statusline, "A threshold's style colours the text and not the fill" |
| A28 | A label a threshold leaves out renders; at 70 the background is the top level's, never the one the threshold at 30 set | statusline, "A key one threshold leaves out", "A second threshold inherits nothing from the first" |
| A29 | 10/20/30/40/50 at 60 → the state at 40, the fifth's label never renders, exactly one `thresholds-over-four` fault naming `"context"` | statusline, "A fifth threshold" |
| A30 | `-5`, `70.5`, `"70"`, absent, `1e400` → `instrument "context" thresholds 1 has an activeAt that is not a whole number at or above 0`; `70` as an entry → `… thresholds 1 is not an object`; `{}` → `… has thresholds that is not a list`; two at 70 and two at 110 → `… thresholds 2 repeats the threshold at N` | statusline, "A threshold that is no whole number", "Two thresholds at one number", "Two thresholds at one number above 100", "An entry that is not an object" |
| A31 | The fill fault at position 5 (above 100), the parse fault at position 5 (past the fourth), and the parse fault at position 2 written after 90 all reject the document at their written position | statusline, "A fault in a threshold above 100", "A fault past the fourth", "A position counted before the sort" |
| A32 | `"width": 5` and a nested `thresholds` are both refused through the unknown-option rule | statusline, "An unknown key in an entry", "A nested thresholds"; the options-a-threshold-may-carry row |
| A33 | `model` (no bar) refuses both keys *(pin: green at the base)* | statusline, "A Jefferson instrument without a bar" |
| A34 | An unknown reading with a state at 0 whose format names `$bar` renders nothing, label included; a null reading draws the whole track dim | statusline, "A state at 0 that names the bar", "A count of zero with nothing to fill" |
| A35 | Five thresholds with a malformed entry reject the document and report **no** over-four warning | statusline, "A rejected document stays silent" |
| A36 | A `fill` colour fault names `fill`: `instrument "context" has a fill whose fg is neither …`, and `has a fill key that …` for a bad key | statusline, "A threshold fault names its place", "The warning names the option as written"; design DEC-14 |

Green: 146 of 146, which includes every pre-existing configuration test unedited.

## The settings path — provided instruments, over the real bus

`tests/registration.test.ts`, through the harness's real event bus. The group was red before the
adapter and the listener knew the two names (8 failures), green after.

| Check | Expectation it proves | Source |
|---|---|---|
| A37 | `options: ["thresholds","fill"]`, a threshold at 50 setting `"fill": {"fg": "error"}`: from 50 the filled columns take `error` | statusline, "A provided instrument's thresholds" |
| A38 | `["thresholds"]` alone, a threshold at 50 setting a label: the label applies and **no** default colour reaches the fill | statusline, "A provider that names thresholds alone" |
| A39 | `["fill"]` alone: `muted`-style top-level fill below 70 (measured with `accent`), the default `warning` at 75 | statusline, "A provider that names fill alone" |
| A40 | `options: ["thresholds"]` without `bar` is refused, and one warning reads `pi-jefferson: "taiknr.usage" declares "thresholds" without a bar`; the row naming it renders the placeholder | statusline, "An option named without a bar"; design DEC-12 |
| A41 | A decimal `activeAt` under a provided name refuses **only** that instrument; one warning reads `… "taiknr.usage" thresholds 1 has an activeAt that is not a whole number at or above 0; it renders blank` | statusline, "A provider's malformed threshold" |
| A42 | Five thresholds warn once for the session, over repeated renders, naming `"taiknr.usage"` | statusline, "The over-four warning is composed once and reported once" |
| A43 | One bar read a sample with the instrument placed twice in row 1 and once in row 2; no placement shows the first reading's state; the next render reads again | statusline, "One reading a sample" |
| A44 | The discriminating pair for containment: with a top-level format that has no `$bar` and a threshold that adds one, the row's own line shows no placement takes the spare columns (the right-aligned sibling sits at column 0…79); with a top-level `$bar` and a threshold that drops it, the sibling starts the row because every placement still fills. Both: one read, every placement renders nothing, one notice, `"taiknr.usage" failed to render: its bar threw` | instrument-registration, "A state is chosen inside a provided instrument's boundary"; design DEC-9 |
| A45 | A bar that would throw is never read when the format names no `$bar` and no list is written (0 reads, no fault), and a provider that wrote no list still gets the defaults at exactly 70 | statusline, "A bar never read for a format without one", "A default fills a provider's bar with no list written" |
| A46 | A provider that names neither option has its written `fill` refused alone, naming `fill`; a `fill` inside a threshold under a `thresholds`-only opt-in is refused as a key it does not take | statusline, "A provider that names neither", "A key a threshold does not take is refused" |
| A47 | Five thresholds whose third sets a `fill` the theme lacks: only the refusal is reported, `… thresholds 3 is configured with a fill Jefferson cannot use; it renders blank`, and no over-four warning | statusline, "A refused provided instrument says nothing of the count" |

Green: 134 of 134, including every pre-existing registration test unedited.

## The binding and the row

`tests/instrument.test.ts`, `tests/row-renderer.test.ts`, `tests/jefferson.test.ts`.

| Check | Expectation it proves | Source |
|---|---|---|
| A48 | A threshold whose format adds `$bar` ends the fill below 70 and starts it at 70; the same state is in force at width 0 and at 200 | statusline, "A threshold that shows the bar", "The state at two widths"; `AGENTS.md` item 4 |
| A49 | A declaration that sets `fills: true` fills at 95 though its state's format drops the bar | statusline, "A declared fill outlasts the state" |
| A50 | A bar counting its reads (40 then 90) draws the filled columns of the **first** read on every render of one sample, and a new sample object reads again | statusline, "One reading a sample"; design DEC-6 |
| P1 | The row-level geometry cases at `jefferson.test.ts:524-538` and `:685-727` pass **unedited** *(pin)* | design, the `tests/jefferson.test.ts` row |
| P2 | `bar.ts`'s runtime surface is still `["drawBar"]`; `thresholds.ts` joins the shipped-file and export pins; the contract still strips to nothing *(pin)* | design DEC-2/DEC-3; `AGENTS.md` |
| P3 | `format.test.ts`'s `rendered` helper routed through the real binding passes every case: 90 of 90 (the design measured 89 of 89 before this change's own checks) *(measured, not asserted)* | design, the `tests/format.test.ts` row |
| P4 | `instrument.test.ts`'s `render` helper routed through the real binding: 39 of 39 before this spike's additions, matching the design's measurement *(measured)* | design, the `tests/instrument.test.ts` row |

## Mutations — each check catching its own mistake

Each row is a deliberate break of the implementation, the test that must notice, then the restored
file.

| # | Break | Caught by |
|---|---|---|
| M1 | `drawBar` ignores its fill argument | A21 (red at `the fill at 0`) |
| M2 | The reader checks only the first four entries | A8 (red at `{position: 1}` instead of `5`) |
| M3 | `stateAt` uses `<` rather than `<=` | A15 |
| M4 | `layerThreshold` replaces a record whole | A19 |
| M5 | The binding drops the per-sample slot and reads every call | A43 |
| M6 | `containProvided` stops wrapping `fills` | A44 |
| M7 | `resolveFormat` reads `declaration.bar` instead of the slot's reading | A50 |
| M8 | The over-four warning is reported before the instrument's settings are accepted | A29 (a second report) — and see the gap below about A35 |
| M9 | A `fill` colour fault's sentence names the key alone | A36 |

## Not verified

- **A real pi session.** No model call was spent and no live footer was watched. The end-to-end
  geometry is asserted through the harness's real bus and `createFooter`, which is what the existing
  suite trusts, but Joel's standing rule is that nothing is done until he has watched it on the real
  thing.
- **`openspec validate --strict`.** Not run: this spike changed no artifact.
- **The provider fixture under the repo's own `pnpm typecheck`.** `tsconfig.json` includes
  `tests/**/*.ts`, which does not pick up `.mts`, so a broken `provider.mts` does not fail locally —
  I proved it by introducing `fills: "yes"` there and watching `tsc` stay silent. The fixture's real
  check is the CI step, which I reproduced by hand (packed tarball, provider `tsconfig.json`):
  `FIXTURE COMPILES`, and `tsconfig.reserved.json` still fails with one `TS2344`.
- **The `docs/` pass and the ADR.** Design DEC-15's ADR and the docs corrections belong to Bambadjan
  after the implementation gate; nothing here was written for them.

## Docs this change makes false (for Bambadjan)

The design's Migration Plan lists most of them; these are the sentences I read and confirmed, with
the two additions marked:

- `docs/formats.md:92` — "The filled part takes the theme's `warning` colour above 70% and its
  `error` colour above 90%." Now: at 70% and at 90%, each an ordinary threshold, and a user's
  `thresholds` (or `fill`) replaces them.
- `docs/configuration.md:76` — "…and so does any instrument whose format holds `$bar`." No longer
  true: the state in force decides whether the instrument fills, so a threshold's format can add or
  drop `$bar`. **Addition:** the same page's `instruments` block section gains `thresholds` and
  `fill`, the four-item cap, the replacement of the defaults, and `"thresholds": []`.
- `docs/instruments.md:27-29` — "Every instrument takes three options". Some take five; the table and
  the section need the two names, saying which instruments take them.
- `docs/extension-authors.md:144`, `:247`, `:258` — `options: ["formats"]` is no longer the only extra
  option; the page needs the two opt-ins, the cost of naming either without `bar` (a refusal of its
  own kind), the new `option-without-bar` row in the sentence table, and the minimum version.
- `ARCHITECTURE.md:40` — "…formats, labels, styles and a composed instrument's `seconds` and
  `formats` are validated at read time". Now also `fill` and `thresholds`, for both settings origins,
  with the reader's one set of rules.
- `docs/adr/` — the new ADR DEC-15 owes (the boundary at the number, pi parity retired), with ADR
  0009's threshold sentence and ADR 0020's `$bar` wording marked as amended by it.
- **Addition** (`README.md`): no sentence I found names the threshold colours, so nothing there is
  false; worth a check by whoever reads it next, since the feature is user-facing.

## Gaps

1. **The design's `tests/jefferson.test.ts` row understates the pin change.** It says the shipped-file
   check gains `thresholds.ts` and the runtime export pin gains that file's surface. DEC-13 also puts
   the two option names in one place in `instrument.ts`, so that file gains an export (`BAR_OPTIONS`)
   and the pin's entry for it must gain the name too — otherwise the pin fails the moment the names
   have one home. Evidence: the pin asserts exact key sets; with `options: [...FOUNDATIONAL_OPTIONS,
   ...BAR_OPTIONS]` in `context.ts`, `Object.keys` of `instrument.ts` gains `BAR_OPTIONS`. Either the
   row says so or the names get a second spelling (which DEC-13's one-home rule forbids).
2. **The place phrase's wording is left open, and the parse sentence reads badly.** I implemented
   `thresholdPlace(printed, position)` as `` `${printed} thresholds ${position}` ``, as the design's
   "Contracts" describes, so the own path's forwarded parse fault reads ``"context" thresholds 5's
   format names a variable it does not declare: "$nope"``. Every other threshold sentence reads well
   (`instrument "context" thresholds 1 has an activeAt that is not a whole number at or above 0`). If
   Michael wants the parse sentence to read ``… threshold 5 has a format that names …``, the design's
   "forwarded, not reworded" rule for parse faults has to bend, so this needs his call rather than
   mine.
3. **`-0` normalisation.** The statusline delta says "`-0` MUST be the threshold at 0"; the honoured
   list therefore stores `0`, not `-0`, which the design does not state (it says only that the parsed
   number is judged). Without it, `-0` and `0` are one `Map` key for the duplicate rule but a
   different number in the honoured list, and a `deepEqual` on the honour's `activeAt` cannot be
   written. Worth one sentence in the design.
4. **`seconds` inside a threshold is accepted and ignored.** The own path's per-value checks no
   longer include the `seconds` range check (it stays at the top level, where the reader's share
   lives), so a declaration that carried both `bar` and `seconds` would accept any `seconds` inside a
   threshold without judging it. No shipped declaration carries both, and the design defers the
   question (Open Questions) — but the implementation *silently ignores* the value rather than
   refusing it, which is a different answer from "no threshold may carry it". A ruling is needed
   before Implement, or the design should say the value is ignored.
5. **`withDefaults` has no home in the design.** A threshold must carry "only the parsed values it
   wrote", so `segments` and `style` are present only when the settings wrote `format` and `style`;
   `ConfiguredInstrument` still requires both, so `configuration.ts` fills them in at the top-level
   call site (one small function, `withDefaults`, which also keeps the read-time parse of a
   declaration's default format). The design's `configuration.ts` row does not mention it, and a
   reviewer at the gate will look for it.
6. **A35 is a pin, not a mutation-sensitive check.** "A rejected document stays silent" holds because
   `readConfiguration` returns before `source.report` runs, not because of anything a single-line
   mutation can break: M8 shows the *once-only* sentence is guarded, and the rejection's silence is
   structural. Recorded so the gate does not read more into the check than it proves.
7. **DEC-9's "the `fills` catch records first" is the row's ordering, not the binding's.** It holds
   because `createFooter` plans every row (which reads `fills`) before it renders any cell. A future
   caller that renders before planning would record the `render` catch's sentence first. The design
   says the row plans first, and A44 proves it for the row; the guarantee is worth restating as the
   row's, not the wrapper's.
8. **The twice-read default format.** `withDefaults` parses a declaration's default format at read
   time for any settings object that wrote no `format`, exactly as the base did, so behaviour is
   preserved; but a provided declaration's default format is also parsed at adaptation, and a shipped
   one at bind. Three parses of the same string, all pre-existing except that the base did two. Not a
   defect; noted because the gate may ask.
