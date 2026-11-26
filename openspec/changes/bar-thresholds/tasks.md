# Tasks

Each task names the failing check that runs before its code, by the label `redgreen-derek.md` gave
it. `A1`–`A50` went red at the base or in the partially built spike and green once the change the
task makes landed, except the checks a task names as pins, which are green on arrival and proved by
the mutation that task names; `P1`–`P4` were green at the base and must stay green. `A51`–`A60` are
checks these tasks write first, red before their task's code or, where the task says so, a pin green
on arrival with a mutation as its proof, and `redgreen-derek.md` has no entry for them. M1–M9 are
`redgreen-derek.md`'s Mutations; M10–M24 are defined once, in 4.2, and a task that cites one before
4.2 points there. Where a task defines a check inline and its definition differs from
`redgreen-derek.md`'s row of the same label — A35, A47, and every half or extension a task names —
the task's definition governs: `redgreen-derek.md` is the spike's measurement record, not the plan.
Where 4.2 states a mutation's break, as it does for M8, 4.2 governs over `redgreen-derek.md`'s row
of the same mutation.

A task that changes only a signature, a pin's shape or a fixture has no check of its own in that
report; it says so and names the command that shows its check catching a mistake.

Every group ends with `pnpm typecheck` and `pnpm test` green. Inside a group an early task can leave
a later check red; the group's last task is where the group's green is provable, so a check a later
task can move is run again there.

No task here writes Markdown. `design.md`'s Migration Plan lists every sentence the docs pass
corrects, and the docs pass runs after the implementation gate. Task 5.1 is Joel's and no writer
ticks it.

Every interface these tasks meet at — `Instrument`, `BoundInstrument`, `ConfiguredInstrument`, the
reader's result, the drawing path, every fault's kind and what its sentence names — is stated once,
in `design.md` `### Contracts`. A task names what the coder types at that step, and where it repeats
a shape from there, `### Contracts` is the one home and governs.

## File Boundary

### Create

| Path | What it holds |
|---|---|
| `extensions/jefferson/thresholds.ts` | The threshold defaults, the reader, the state at a reading, one threshold layered on the top level, and the over-four sentence. Its four runtime exports — `DEFAULT_THRESHOLDS`, `layerThreshold`, `readThresholds`, `stateAt` — and each signature, with the walk, cap, sort and drop order, are `design.md` `### Contracts`'s. Pure: it imports nothing of this package. |
| `tests/thresholds.test.ts` | The reader's own rules, exercised directly, including its seam with `check` (`design.md`, the New table's row). |

### Modify — source

| Path | What changes, and why |
|---|---|
| `extensions/jefferson/components/visuals/bar.ts` | `drawBar` takes the effective fill beside the effective style and makes no percentage-to-colour choice (DEC-3, `### Contracts`, "The drawing path"). It still imports no file of this package. |
| `extensions/jefferson/format.ts` | `resolveFormat` takes the state in force and the slot's raw reading instead of calling a declaration's `bar` (DEC-6, "The drawing path"); `validateStyle` takes the option's name, so a `fill` fault never says `style`, with its signature, its four sentences and the five pre-existing expectations that move `### Contracts`'s (DEC-14). |
| `extensions/jefferson/components/instruments/instrument.ts` | `BAR_OPTIONS` beside `FOUNDATIONAL_OPTIONS` (DEC-13); `fills` becomes a function of the sample's readings (DEC-7). |
| `extensions/jefferson/components/instruments/instrument-binding.ts` | Binds the top level and up to four honoured states in full (DEC-4); owns the per-sample slot (DEC-6); decides at bind whether the bar is read (DEC-8); accepts the two option names from a provider's declaration that carries `bar`, and refuses either on one that carries none, as `### Contracts`' refusal order states; wraps a provided placement's `fills` and `render` (DEC-9); declares `BoundInstrument`, a new type, and `instrumentBindings` returns a function producing it; gains `ConfiguredInstrument`'s `fill`, `thresholds` and optional `segments`/`style` (`### Contracts`). |
| `extensions/jefferson/components/instruments/context.ts` | Lists the two option names, spread from `BAR_OPTIONS`, in its frozen option list. |
| `extensions/jefferson/components/row/row-renderer.ts` | Reads `fills` with the sample for each placement and renders each placement from that same sample (DEC-6); holds no reading and no state. |
| `extensions/jefferson/configuration.ts` | Both settings paths hand the reader their existing per-value checks; each path's per-value check parses a `format` and validates a `style` only when one is written, and carries only what the document wrote (`### Contracts`, the `check` bullet); carry `fill` and the honoured list; compose the place phrase; report the over-four warning only after the instrument's settings are accepted; keep the checked-list comment at `:135-140` true. |
| `extensions/jefferson/registration-listener.ts` | Maps the new `option-without-bar` kind and its sentence (DEC-12). |
| `extensions/jefferson/instrument-contract.ts` | The declared option names gain `thresholds` and `fill`. Types only, so the published export and its CI pin are unchanged. |

### Modify — tests and fixture

| Path | What changes |
|---|---|
| `tests/format.test.ts` | The strict-edge expectations at `:147-153` flip to `warning` at exactly 70 and `error` at exactly 90; the `rendered` helper at `:34-40` binds through the real binding, fresh per call, `label: ""`; the stand-in literal at `:183` writes `fills: () => false`, its expectation unchanged; `:246` and `:247` take `validateStyle`'s new `style` wording (`### Contracts`). |
| `tests/instrument.test.ts` | The options pin at `:82` derives `["thresholds","fill"]` from `declaration.bar`; `:84`'s frozen check stays; `:85` gains the shipped-declaration invariant derived from each shipped declaration's own `bar`; the `render` helper at `:69-73` binds through the real binding, fresh per call, `label: ""`; `:351`'s pass-through (`fills: bound.fills`) compiles unedited; the reads at `:377`, `:396` and `:425` become `fills(seed)`. |
| `tests/configuration.test.ts` | Jefferson's own path: acceptance at both levels, the cap and its warning, the defaults at exactly 70 and 90, the fault kinds with the place phrase, the rejected document's silence; the reads at `:1333`, `:1340` and `:1344` become `fills(seed)`; `:1134` and `:1140` take `validateStyle`'s new `style` wording (`### Contracts`). |
| `tests/registration.test.ts` | A provided instrument's opt-ins and their refusals, over the harness's real bus (`tests/session-harness.ts:97`, `tests/registration.test.ts:1422`), every provider refusal asserted beside a sibling instrument that renders. |
| `tests/row-renderer.test.ts` | Every `Instrument` literal writes `fills: () => <boolean>`, the helper's at `:622` included; the `{ fills }` option bags it is handed stay booleans, because they are not `Instrument`s; every expectation stays as it is. |
| `tests/jefferson.test.ts` | `pinned` (`:234-277`) gains a `thresholds.ts` entry with the key set `### Contracts` states, and `instrument.ts`'s entry (`:261`) gains `BAR_OPTIONS`; the shipped-file assertion at `:293` reads that list, and the pin compares exact key sets (`:282`); `bar.ts`'s entry stays `["drawBar"]`; an import check (A60) reads every `.ts` file under `components/visuals/` and `thresholds.ts` and asserts none imports a source file of this package; `:547` takes `validateStyle`'s new `style` wording (`### Contracts`); the geometry cases at `:524-538` and `:685-727` stay unedited. |
| `tests/fixtures/sample-provider/provider.mts` | `progress` (`:81`) gains `thresholds` and `fill` in its `options`, so the widened option type is compiled through the real registration path and the packed-fixture CI check; it already carries `bar`, so no instrument is added. |

### Delete

None.

### Deliberately untouched

`package.json` and the `./instruments` export's CI pin (no new runtime export reaches the contract);
`extensions/jefferson/startup.ts` (already wires `report` to the ledger); `faults.ts` (already
deduplicates by scope and kind); `components/instruments/blank.ts` and `components/row/width-plan.ts`
(unchanged by DEC-7); `docs/`, `ARCHITECTURE.md`, `docs/adr/`, `README.md` (the docs pass).

## 1. The threshold rules, in one pure source file

- [ ] 1.1 The reader's shape and number rules. **Test first:** before the file exists, add
  `["../extensions/jefferson/thresholds.ts", ["DEFAULT_THRESHOLDS", "layerThreshold",
  "readThresholds", "stateAt"]]` to `pinned` in `tests/jefferson.test.ts` (`:234-277`). That key set
  is `### Contracts`'s, and it is also the list the shipped-file assertion at `:293` reads; the pin
  stays red until 1.4 lands the last export, which the preamble allows, and 1.5 is where it is
  green. In that same file, beside "the contract and field-value strip to nothing" (`:296-304`), add
  A60: every `.ts` file under `extensions/jefferson/components/visuals/`, and
  `extensions/jefferson/thresholds.ts`, is read with `readFileSync`; its `from "…"`, `import("…")`
  and bare `import "…"` specifiers are collected; and the check asserts that none starts with `.`.
  The visuals half is green at the base and the `thresholds.ts` half is red before the file exists;
  show it catching a mistake by adding a relative import to `bar.ts` and watching it fail. Then
  create `tests/thresholds.test.ts` with A2–A7 and A4 extended, in the halves listed
  here — `{}`, `null` and `70` each answer `settings-thresholds` (A2); a threshold written as `70`,
  `null` or `[]` answers `settings-threshold` at its written position (A3); `activeAt` missing,
  `"70"`, `70.5`, `-5` and
  `1e400` each answer a fault at their position (A4), and a fifth threshold whose `activeAt` is
  `"70"`, and again one whose `activeAt` is `70.5`, each answer `settings-threshold-active-at` at
  position 5 (A4 extended, which proves "A malformed fifth threshold" and is the check M2 turns
  red); `70.0` and `7e1` each answer an honoured threshold whose `activeAt` equals 70, and `70`
  beside `70.0` is a duplicate (A5, its parse half); `0` then `-0` answers
  `settings-threshold-duplicate` at position 2, the assertion on the kind and the position only and
  never on the stored number (A6, its reader half); two at 110 are a duplicate (A7). At 1.1
  `readThresholds` answers its honoured list in written order, unsorted and uncapped, and 1.2 adds
  the drop, the sort and the cap. Red at the base because neither the file nor its functions exist —
  unavoidable for a new one, which is why each of these rules is exercised again through
  Jefferson's own settings path at 2.5 (A30) and 2.6 (A32).
  **Code:** create `extensions/jefferson/thresholds.ts`, whose exports and signatures are
  `### Contracts`'s "`thresholds.ts`'s surface" and "The reader's result", with the walk over the
  written list, judging shape, then the parsed number (`typeof value === "number"`, then
  `Number.isInteger`, then `>= 0`), then whether an earlier threshold wrote that number, then
  `check`, and answering one of the three results `ThresholdsRead` names. **Boundary cases:** `{}`,
  `null` and `70` as the list, `70`, `null` and `[]` as a threshold, a missing `activeAt`, a numeric
  string, a decimal, a negative, `1e400`, `-0`, `70.0`, `7e1`, a duplicate at 0, a duplicate at 110.
  The honoured list stores the parsed number as it is (redgreen-3). `-0`'s behaviour is proved by A6
  here, by A5's `stateAt` half at 1.3 and by A30 at 2.5. No check compares a stored `-0` with `deepEqual` or `Object.is`. **Proves:** statusline
  "A thresholds value that is not a list", the scenario beside it for a threshold that is not an
  object, "A malformed threshold rejects the settings" and "Two thresholds at one number above
  100", all at the reader; extension-source-layout "A visual's imports" and "Looking for the timed
  visual" (A60, with `tests/timed.test.ts` unedited); and design DEC-1's purity of `thresholds.ts`
  (A60). **Done when:** `node --test tests/thresholds.test.ts` passes A2–A7 in the halves listed
  here, A60 passes, and `pnpm typecheck` is clean.

- [ ] 1.2 The walk's order, the four-item cap, and the over-four sentence. **Test first:** A1, A8–A14 — a list
  written 70 then 30 answers honoured 30 then 70 (A1); a fifth threshold at 101 is still checked and
  its refusal answers at position 5 (A8); thresholds written 90 and
  then 10, each refused by `check`, answer the refusal at position 1, the first written, so every
  threshold is checked in written order and the first refusal met ends the read (A9); a duplicate
  written before a refused threshold is the
  fault answered (A10); a threshold that sorts first keeps its written position, and thresholds written 101, then 10, then
  20 whose third a `check` refuses answer that refusal at position 3 (A11, which proves "A fault in
  the third entry"); five written
  warn once, name the instrument, say more were defined than the maximum and that the thresholds
  past the four lowest are ignored, and only four are honoured (A12); thresholds at 10, 20, 30, 40
  and 101 answer `overFour` and honour 10 to 40 (A12 extended, which proves "Four with one above
  100"); four written warn nothing and a threshold above 100 drops silently (A13); thresholds at 0,
  50 and 100 answer no `overFour` and honour all three (A13 extended, which proves "The boundaries",
  A16's apply-at-its-own-number half being 1.3's); 10, 20, 30, 101, 102 loads with one warning and
  the three below 100 decide (A14). Red before the cap order exists. **Code:** after the last threshold passes,
  warn on the written count, drop every threshold above 100, sort ascending, keep four, and compose
  the sentence in `thresholds.ts` inside `readThresholds`, where it reaches a path only through
  `overFour`; its wording is `### Contracts`'s, and the test asserts it whole, so no later edit can
  change it silently. **Boundary cases:** 0,
  100, 101, 102, the fifth at 101, five with one above 100, three with two above 100, a fault
  before and after the drop. **Proves:** statusline "Only the four lowest thresholds are honoured",
  "The over-four warning is composed once and reported once" (the sentence's composition), "Four
  with one above 100", "The boundaries", and "A fault in the third entry" (A11).
  **Done when:** A1 and A8–A14 pass and the whole file is green.

- [ ] 1.3 The state a reading chooses, and the 70 and 90 defaults. **Test first:** A15–A18 and A20, and A5's `stateAt` half —
  the state is the highest `activeAt` at or below the reading, its own number included (A15); 0 and
  100 apply at their own numbers (A16); an unknown reading counts as 0 and the top level stays in
  force otherwise (A17); a negative reading sits below every threshold (A18); a stored `-0` is chosen
  at a reading of 0 and not at -1 (A5's `stateAt` half); the defaults are 70 → `warning` and 90 →
  `error` (A20). Red before `stateAt` and the default list exist. **Code:** add
  `stateAt` to `thresholds.ts` with the signature and the `<=` rule `### Contracts` gives, unknown
  counting as 0 only in the comparison, and the two defaults as `DEFAULT_THRESHOLDS` (DEC-2).
  **Boundary cases:** reading 0, exactly 70, exactly 90, 69.9, 90.1, 100, `undefined`, `null` and a
  negative. **Proves:** statusline "A threshold at its own percentage",
  "Two thresholds below the reading", "Below every threshold", "The default thresholds are 70 and
  90" (the values), "An unknown percentage" and "A negative reading". **Done when:** A15–A18,
  A20 and A5's `stateAt` half pass.

- [ ] 1.4 Layering one level deep, and the two values that replace whole. **Test first:** A19 — a
  record merges one level, a parsed format list and a label replace whole, and a `formats` kind a
  threshold leaves out is the top level's. Red before `layerThreshold` exists. **Code:** add
  `layerThreshold` to `thresholds.ts` with the signature and merging rule `### Contracts` gives,
  generic over the settings a threshold carries, so the file still imports nothing of this package.
  **Boundary cases:** a threshold that names no key, one key only, a `formats` kind, a `label`, `"thresholds": []` at the
  top level. **Proves:** statusline "A threshold's state changes only the keys it names", "A key one
  threshold leaves out", "The top level's keys stay", "A second threshold inherits nothing from the
  first", "A formats kind a threshold leaves out" (its reader half; 2.3's A56 (d) proves it through
  the binding). **Done when:** A19 passes and the whole file is green.

- [ ] 1.5 `pnpm typecheck` and `pnpm test` green. Nothing imports `thresholds.ts` yet, so the suite
  is the base's 578 tests, A60, and every check in `tests/thresholds.test.ts`, all of them passing
  (`redgreen-derek.md`, "The base, measured"), and the pin passes with its new entry.

## 2. The state reaches a bar Jefferson's own instrument draws

- [ ] 2.1 The two option names have one runtime home. **Test first:** rewrite the pins — in
  `tests/instrument.test.ts`, `:82`'s `slice(3)` expectation becomes `name === "notice" ? ["seconds",
  "formats"] : declaration.bar !== undefined ? ["thresholds", "fill"] : []`, so a declaration that
  carries `bar` expects `["thresholds", "fill"]`; `:81` stays, and so does `:84`'s frozen check; `:85`
  gains the shipped-declaration invariant, its expectation derived from each shipped declaration's
  own `bar`. In `tests/jefferson.test.ts`, the pin's `instrument.ts` entry (`:261`) becomes
  `["BAR_OPTIONS", "DEFAULT_CELL_TEXT", "FOUNDATIONAL_OPTIONS"]`. Run `node --test
  tests/instrument.test.ts tests/jefferson.test.ts` and watch both pins fail before the export and
  `context.ts`'s list land. **Code:** `instrument.ts` gains
  `BAR_OPTIONS = Object.freeze(["thresholds", "fill"] as const)` exported beside
  `FOUNDATIONAL_OPTIONS` (DEC-13); `instrument-contract.ts:49`'s declared names gain the two, types
  only; `context.ts`'s options become `Object.freeze([...FOUNDATIONAL_OPTIONS, ...BAR_OPTIONS])`.
  **Boundary cases:** a shipped declaration that carries `bar`, one that carries none, a provided
  declaration that names neither (refused at 3.2). **Proves:** statusline "A shipped declaration
  that can draw a bar declares the two options", "A shipped instrument with a bar", "An option a
  bar-capable instrument takes" (the acceptance half; application lands at 2.5). `redgreen-derek.md`
  has no check of its own for this pin — A33 pins the mirror instead (a declaration without a bar
  refuses both keys, green at the base) — and the pin is shown catching a mistake by writing
  `thresholds` alone in `context.ts` and watching it fail. **Done when:** the pins pass.

- [ ] 2.2 `fills` answers per sample. **Test first:** no expectation changes; flip
  `Instrument.fills` to `(readings: Readings) => boolean` and run `pnpm typecheck` and `pnpm test`.
  The typecheck names the object literals that build an `Instrument` with a boolean `fills`, and
  `pnpm test` names the assertions that read `fills`. Three groups, and measured, they leave the
  typecheck clean and 578 of 578 passing: stand-in literals that write `fills: () => <boolean>` —
  `tests/format.test.ts:183` as `fills: () => false`, and every `Instrument` literal in
  `tests/row-renderer.test.ts`, the helper's at `:622` as `fills: () => fills`, while the `{ fills }`
  option bags that helper is handed stay booleans, because they are not `Instrument`s; a
  pass-through that compiles unedited — `tests/instrument.test.ts:351`'s `fills: bound.fills`, which
  hands the function on, so the wrapper shares the binding's slot; and reads that become
  `fills(seed)` — `tests/instrument.test.ts:377`, `:396` and `:425`, and
  `tests/configuration.test.ts:1333`, `:1340` and `:1344`. **Code:** `instrument.ts`'s contract;
  `instrument-binding.ts` declares `BoundInstrument`, which is
  new, and its `instrumentBindings` now returns `(declaration: InstrumentDeclaration) =>
  BoundInstrument` (`### Contracts`), the `fills` member a closure answering today's bind-time value;
  `containProvided` passes `fills` through; `row-renderer.ts`
  reads `fills(current)` and renders each placement from that same `current`; a declaration that
  sets `fills: true` answers true at every reading, so `blank.ts` and its cases do not move (DEC-7).
  Mechanically updated, with no check of their own: those three groups. **Boundary cases:** a placement in row 1 and another in row 2, a
  declaration with `fills: true`, one whose format names no `$bar`, none. **Proves:** no behaviour
  changes; P1, P3 and P4 are the proof, passing unedited. **Done when:** `pnpm typecheck` and
  `pnpm test` are both green and no expectation moved.

- [ ] 2.3 Every honoured state is bound, and chosen once per sample from one reading. **Test first:**
  A48 — a threshold whose format adds `$bar` ends the fill below 70 and starts it at 70, the same
  state at width 0 and at 200; with the top-level format `$percent $bar` and a threshold at 90
  giving `$percent`, `fills` answers true at 89 and false at 90, and at 90 the width-0 text equals
  the width-200 text (A48 extended, which proves "A threshold that hides the bar"); A49 — a
  declaration that sets `fills: true` fills at 95 though its state's format drops the bar; A55 —
  `{ ...context, bar: <counts its calls, returns the percent> }`, the top-level format `$percent`,
  and the single threshold `{ activeAt: 50, settings: { fill: { fg: "muted" } } }`: one sample at
  75 reads the bar 0 times, through `fills` and through `render`, and the same set-up with the
  threshold setting `label: "hot"` reads it once and the text at 75 carries `hot` (A55, which
  proves "A list that changes only the fill" by separating DEC-8's rule from reading whenever
  thresholds exist); and A56, on the binding through `instrumentBindings` as
  `tests/instrument.test.ts:392-480` already call it: `context` with the top-level format `$percent`
  and a threshold at 70 setting `label: ""` renders `75.0%` at 75 and `Context: 50.0%` at 50 (a);
  the top-level format `$percent` with a threshold at 70 giving `$bar` renders `Context: ` and 11
  bar columns at width 20 and a reading of 75, and `fills` answers true (b); and a stand-in
  declaration carrying a `bar` and a `composed` set whose `select` counts its calls, its top-level
  format naming the composed variable and a threshold at 70 whose format names only another
  variable, calls `select` 0 times at 75 and once at 50 (c); and (d), on that stand-in's shape
  again: its `bar` answers the reading, `state` sits among its `variables` as `notice` declares
  `$notice`, and its `composed` set is over `state` with `formats` `busy` and `idle`; the top level
  gives format `$state`, `label: ""` and `formats` `{ busy: "A", idle: "B" }`, parsed as plain
  formats; one threshold, `{ activeAt: 70, settings: { formats: { busy: <"C" parsed plain> } } }`;
  and at a reading of 75, `select` answering `busy` renders `C` and `select` answering `idle`
  renders `B`, the busy half red before this task's code because the same set-up renders `A` on
  today's binding, as measured; and A57, over the harness's real bus: a
  provided declaration carrying `bar` and no `options`, its default format `$bar`, whose `bar`
  returns a value with a `then` getter that throws, beside a sibling — one footer render leaves the
  row rendering, the sibling rendering, that entry rendering nothing, and the one notice reading
  `pi-jefferson: "taiknr.usage" failed to render: its bar threw`; red at the base, where the notice
  says `its variable threw`, and red against this task's binding without the wrapper, where the
  throw leaves `footer.render`. A48, A55 and A56 are red before this task's code; A49 is a pin,
  green on arrival because 2.2's closure already answers a declared `fills: true`, and M18 turns it
  red. **Code:** `ConfiguredInstrument` gains `fill`, `thresholds` and optional `segments` and
  `style` (`### Contracts`); the top level and each honoured state — `thresholds`, or
  `DEFAULT_THRESHOLDS` when the settings carry none — are layered by 1.4's `layerThreshold` and
  bound in full (DEC-4), each honoured threshold being the `Threshold` `### Contracts` defines, so
  each has its own segments, label and gap, composed choice and kind formats, `fills`, effective
  style and effective fill; DEC-6's slot on the bound instrument — the last sample object and its
  outcome, the raw reading beside the state, a remembered throw kept for that sample — chooses the
  state once per sample; DEC-8's rule decides at bind whether the bar is read at all;
  `fills(readings)` answers a declared `fills: true`, and otherwise the chosen state's `fills`; and
  `render` renders the chosen state's bound form through `resolveFormat` and `drawBar` as they
  stand, which until 2.4 still read the declaration's `bar` themselves and choose the fill's
  colour, so a `$bar` format reads the bar twice per sample at this step (which is why A50 waits for
  2.4) and every pre-existing case stays unedited and green. `containProvided` wraps each
  placement's `fills` as well as its `render` (DEC-9): the `fills` catch records `resolver-threw`
  with `### Contracts`'s sentence and answers `topLevelFills`, the `render` catch answers `""` and
  keeps today's sentence, and the `fills` catch records first because the row plans before it
  renders, so a caller that rendered first would record the other sentence. **Boundary cases:** one instrument
  placed twice in a row and once in another; a new sample; a format naming no `$bar` with a list
  that sets only `fill`; no list written; a remembered throw; a threshold that sets `"label": ""`,
  one that adds `$bar` after a label, one that drops a composed variable, one that sets only
  `fill`, five honoured states, none. **Proves:** statusline "Each honoured state is bound as an
  instrument is", "A threshold that drops the label", "A threshold that adds a bar after a label",
  "A threshold whose format drops the composed variable", "A threshold's format decides whether the
  instrument fills", "A declared fill outlasts the state", "A threshold that shows the bar", "A
  threshold that hides the bar", "The state at two widths", "A list that changes only the fill", "A
  bar never read for a format without one", "A format that leaves the bar out", "A formats kind a
  threshold leaves out" through the binding (A56 (d)); instrument-registration
  "A state is chosen inside a provided instrument's boundary" (its body, for a provider that did not
  opt in, A57); ADR 0020's blanking rule. **Done when:** A48, A49, A55, A56 and A57 pass, M13 (the
  bar read whenever a threshold list is in force, the defaults included) turns A55's first half red,
  M18 (the chosen state's `fills` answering in place of a declared `fills: true`) turns A49 red, M6
  (`containProvided` no longer wrapping `fills`) turns A57 red, M15 (a state taking the top-level
  label and gap and its composed choice) turns A56's (a) and (c) red, M23 (4.2) turns A56 (d)'s busy
  half red, and `pnpm test` is green with no pre-existing expectation moved.

- [ ] 2.4 The drawing takes the reading and the fill it is handed. **Test first:** flip the
  strict-edge expectations at `tests/format.test.ts:147-153` to `warning` at exactly 70 and `error`
  at exactly 90 and run them red against today's `bar.ts`, which gives `accent` at exactly 70
  (A22); and retitle the test at `tests/format.test.ts:147` to name the inclusive rule ("the default
  thresholds replace only the foreground, from seventy and from ninety") as well as flipping it.
  Write A21, the direct `drawBar` case: handed a fill, the filled columns take it unchanged at every
  percentage and the drawing chooses no colour (red at the base at the assertion). Write A50 — a
  bar counting its reads draws the first read's filled columns on every render of one sample, and a
  new sample object reads again (red at the base, which reads on every call). Route
  `tests/format.test.ts`'s `rendered` helper (`:34-40`) and `tests/instrument.test.ts`'s `render`
  helper (`:69-73`) through the real binding, fresh per call and with `label: ""` (P3, P4).
  **Code:** `bar.ts`'s `drawBar(barWidth, percent, style, fill)` with the filled part taking
  `{ ...style, ...fill }` and the track `{ ...style, dim: true }`; `format.ts`'s `resolveFormat`
  gaining the trailing `bar?: { reading, fill }`, never calling `declaration.bar`, and blanking as
  `undefined` does when `bar` is absent; the binding handing `bar`, carrying the slot's raw reading
  and the state's effective fill, whenever the state's segments name `$bar`, and no other reader of
  the bar remaining. **Boundary cases:** 0, 69.9, exactly 70, 70.1, exactly 90, 90.1, 100, a `null`
  reading, an unknown reading. **Proves:** statusline "Exactly 70", "Exactly 90", "Below the first
  default", "One reading a sample" (A50), "The pressure a bar shows" (A22) and "A named bar with no
  usage" (`tests/instrument.test.ts:180-192` through the real binding, P4); extension-source-layout
  "Looking for the bar" and "The bar renders as before", and "A user places the bar", proved by
  `tests/format.test.ts:60`, `:123` and `:137`, unedited. **Done when:** A21, A22, A50, P1, P3 and
  P4 pass, `pnpm typecheck` is
  clean, M1 (`drawBar` ignoring its fill) turns A21 red, and M7 (`resolveFormat` reading the
  declaration's `bar`) turns A50 red.

- [ ] 2.5 Jefferson's own settings path accepts and applies a list and a fill. **Test first:**
  A23–A30, A34, A51 and A58 — a threshold's format and fill in force at 70 and the top level's at 50 (A23);
  one threshold at 90 leaving no default colour at 75, and `[]` colouring nothing at 95 (A24); at
  exactly 70 the fill is `warning`, at exactly 90 `error`, below 70 the style's own, and the text
  never takes the threshold's colour, and a `style` of `{bold: true}` with no `fill` at a reading of
  50 makes the filled part and the label bold and the track bold plus `dim`, as `"thresholds": []`
  at 95 does (A25, which proves "Style still covers the whole instrument"); a top-level `fill` of `{fg, bold}`, a default replacing only
  the key it names and bold surviving (A26); a threshold's `style` colouring text and never the
  fill or the track (A27); a label a threshold leaves out rendering, and a second threshold
  inheriting nothing (A28); 10/20/30/40/50 at 60 choosing 40 with the fifth never rendering, and
  exactly one `thresholds-over-four` fault naming `"context"` on the `reported` list
  `configurationSource` returns, which records every report without the ledger's deduplication
  (`tests/configuration-source.ts:21`, `:34`) (A29); the rebuilt pair of "A state at 0 that drops the bar" and "A state at 0 that names the
  bar" through `readConfiguration`, where the names-the-bar half renders nothing, label included, and the
  drops-the-bar half renders `Context: no estimate`, and a `null` reading under a state at 0 draws
  the whole track `dim` (A34); and A51 — `context` with the format `$percent`, a threshold at 70
  setting `label: "hot"`, and a percent of 69.99: the line reads `Context: 70.0%` without `hot`, because the
  reading is compared and not the printed text (A51, which proves "A reading between two printed
  values", and M16 turns it red); A58 — through `readConfiguration`, `instruments.context` as
  `{ "format": "$percent", "thresholds": [{ "activeAt": 50, "label": "hot" }] }`: at a reading of 60
  the line reads `hot 60.0%`, never `hot 60.0%/200k`, and at 40 it reads `Context: 40.0%`; and A30,
  asserting each own-path sentence whole: `{}`, `null` and
  `70` each rejecting with `instrument "context" has thresholds that is not a list`; a threshold
  written as `70`, `null` or `[]` rejecting with `instrument "context", thresholds 1: is not an
  object`; `-5`, `70.5`, `"70"`, absent and `1e400` each rejecting with `instrument "context",
  thresholds 1: has an activeAt that is not a whole number at or above 0`; two at 70 or at 110
  rejecting with `instrument "context", thresholds 2: repeats the threshold at 70` and
  `instrument "context", thresholds 2: repeats the threshold at 110`; and `0` then `-0` rejecting
  with `instrument "context", thresholds 2: repeats the threshold at 0`. Red before the path hands
  its checks to the reader and answers the reader's `{ fault }`, and A58 is also red against a path
  that reuses today's check unchanged. **Code:**
  `configuration.ts` calls the reader whenever the `thresholds` key is present (`### Contracts`),
  passes its own per-value check as `check` (the unknown-key check running over a threshold's keys
  other than `activeAt`, against the declaration's options minus `thresholds`, so a `seconds` key is
  refused wherever no declaration offers it), carries `fill` and the honoured list, moves the
  over-four warning into the read's fault list after `configured.set` (`:344`, `:503-505`), throws
  `RejectedConfiguration` for the reader's `{ fault }` branch with the own-path sentence
  `### Contracts`'s table gives that kind, and composes the reader's own positioned sentences with
  the one place-phrase function in `configuration.ts`, written here and called by 2.6 for a fault
  `check` raises inside a threshold, and by the provided path from 3.1. Until 2.6, a fault the own
  path's `check` raises inside a threshold carries the sentence the same check throws at the top
  level today, with no place phrase, so A31, A32 and A36 stay red until 2.6. The own path's per-value check parses a `format` and validates a `style`
  only when one is written (`configuration.ts:301`, `:339`) and sets only written values
  (`:344-348`), so the top level and every threshold carry only what the document wrote and the
  binding's defaults complete the top level (`### Contracts`, `ConfiguredInstrument` and the `check`
  bullet); measured on today's code, that edit alone leaves 578 of 578 passing. **Boundary cases:** no key written, `[]`, one threshold,
  five thresholds, a threshold above 100 alone, a threshold at 0, an unknown reading, a `null`
  reading, a top-level `fill` with a default over it. **Proves:** statusline "A threshold reached",
  "Below every threshold", "A configured list replaces the defaults", "One threshold and no
  default", "An empty list", "The style, the fill and the track layer in one order", "`fill` styles
  the bar's fill and nothing else", "A fill inside a threshold", "Style still covers the whole instrument" (A25), "A reading
  between two printed values" (A51), "A state at 0 that drops the bar", "A state at 0 that names the bar",
  "A count of zero with nothing to fill", "A malformed threshold rejects the settings" (A30), "A
  thresholds value that is not a list" (A30), "An entry that is not an object" (A30) and "A
  threshold's state changes only the keys it names" through Jefferson's own path (A58); plus "A
  default colours the fill and no text" (A25),
  "A top-level fill before any threshold" (A26) and the defaults' layering scenarios. **Done when:**
  A23–A30, A34, A51 and A58 pass, M21 (4.2) turns A58 red, M8 (4.2) makes A29's `reported` list hold
  two, and `pnpm test` is green.

- [ ] 2.6 A fault names its place. **Test first:** A31–A33 and A36 — the `fill` fault at position 5
  above 100, the parse fault at position 5 past the fourth and the parse fault at position 2 written
  after 90, each rejecting at its written position (A31); `"width": 5` and a nested `thresholds`
  both refused through the unknown-option rule, asserting the whole sentences `instrument "context",
  thresholds 1: carries an option its declaration does not have: "width"` and the same ending
  `"thresholds"`, so it is red until this task (A32); `model`, which carries no bar, refusing both
  keys (A33, a pin, green at the base); five well-formed thresholds beside a row the read rejects
  reporting no over-four warning (A35, a pin, green at the base and on arrival after 2.5, which M10
  turns red); a `fill` colour fault naming `fill` and a bad fill key naming the key (A36). Red
  before the faults `check` raises inside a threshold, and `validateStyle`'s option, exist. **Code:**
  the fault kinds and their sentences from `### Contracts`'s table, a fault `check` raises inside a
  threshold opening with 2.5's place phrase and then the predicate its top-level sentence carries
  after the subject, with a forwarded parser sentence following the colon whole and taking no
  possessive (so A32's sentences are the ones the test asserts); `validateStyle` takes the option's
  name from its caller, with the signature, the four sentences and the five pre-existing
  expectations that move `### Contracts`'s, as designed wording changes (`format.ts:186`, `:201`,
  `:210-215`, `:219`), where the fg/bg sentence at `:210` is the one whose shape changes for `style`
  callers and the only one that moves those five expectations. **Boundary cases:** a fault in a
  threshold above 100, past the fourth, before the sort, in the third threshold, in one that is not
  an object, in a `fill` with an unknown colour, in a `fill` with an unknown key, in a nested
  `thresholds`. **Proves:** statusline "Every value inside a threshold is checked as a top-level
  value is" (the scenarios left after 2.5's two), "A threshold fault names its place", "A key a
  threshold does not take is refused", "A Jefferson instrument without a bar", "A rejected document
  stays silent", "A fill no style allows" (A31, A36) and "A format inside an entry that does not
  parse" (A31). **Done when:** A31–A33, A35 and A36 pass, M9 (a `fill` fault's sentence naming the
  key alone) turns A36 red, and `pnpm test` is green.

- [ ] 2.7 The pins for the new file hold, re-run with no code. **Test first:** none — `pinned` in
  `tests/jefferson.test.ts` gained its `thresholds.ts` entry with the key set `### Contracts` states
  at 1.1, and `instrument.ts`'s entry gained `BAR_OPTIONS` at 2.1, so both are green by here.
  **Code:** none. **Boundary cases:** none. **Proves:** P2 (`bar.ts` still `["drawBar"]`, with
  `thresholds.ts` and `BAR_OPTIONS` pinned at 1.1 and 2.1) and P1 (the geometry cases at `:524-538`
  and `:685-727` unedited). **Done when:** P2 and P1 pass.

- [ ] 2.8 `pnpm typecheck` and `pnpm test` green, with every pre-existing case unedited except the
  strict-edge pair flipped and retitled at 2.4 and the five expectations `### Contracts` names,
  which move with `validateStyle`'s sentences at 2.6.

## 3. A provided instrument's bar

- [ ] 3.1 A provided declaration opts in by name, and the opt-in reaches its bar. **Test first:**
  over the harness's real bus, A37 (`options: ["thresholds","fill"]`, a threshold at 50 setting a
  fill, the filled columns taking `error` from 50), A38 (`["thresholds"]` alone, a threshold at 50
  setting a label, and no default colour reaching the fill at any reading; extended: a bar reporting
  `-1` with a threshold at 0 setting a label renders the top level without that label), A39
  (`["fill"]` alone,
  a muted top-level fill below 70 and the default `warning` at 75), A41 (a decimal `activeAt` under a
  provided name refuses only that instrument, one warning reading `"taiknr.usage", thresholds 1: has
  an activeAt that is not a whole number at or above 0; it renders blank`; extended: under a
  provided name beside a sibling, `"thresholds": {}` and `"thresholds": [70]` each refuse only that
  instrument, their kinds `settings-thresholds` and `settings-threshold`, each provided sentence
  `### Contracts`'s table gives asserted whole — `"taiknr.usage" is configured with thresholds that
  is not a list; it renders blank` and `"taiknr.usage", thresholds 1: is not an object; it renders
  blank` — and two thresholds at 70 and two at 110 each refuse only that instrument with kind
  `settings-threshold-duplicate`, their sentences `"taiknr.usage", thresholds 2: repeats the
  threshold at 70; it renders blank` and the same with 110, asserted whole; the sibling renders in
  every case), A42 (five thresholds warn once for the session over repeated renders, its one notice
  carrying `### Contracts`'s over-four sentence with the subject `"taiknr.usage"`, run in both
  orders — provider-first and Jefferson-first, `h.start({ afterSessionStart })` as
  `tests/registration.test.ts:422-429` does — and identical in both), A45 (its first half a provider
  carrying `bar` and no `options`, its format naming no `$bar` and no list written, so a bar that
  would throw is never read — a pin, green at the base, which M13 turns red; its default half
  `options: ["thresholds"]` with no list written, a provider that still gets the defaults at exactly
  70), A46's threshold half (a `fill` inside a threshold under a `thresholds`-only opt-in is refused
  as a key a threshold does not take), A47 (thresholds at 10, 20, 30, 40 and 101 whose fifth, at
  101, sets a `fill` the theme lacks, beside a sibling: only the refusal is reported, its kind is
  `settings-fill`, and its part names `fill` and position 5; no over-four warning is reported, the
  sibling renders, and all of this holds in both of A42's orders — `redgreen-derek.md` placed A47 at
  the third, and at 101 the same case also proves the provided path checks a threshold it drops),
  A53 — a provided declaration carrying `bar` and no `options`, its default format `$bar`, and no
  settings: at 70 the filled columns take `warning` and at 69 they do not, green on arrival because
  2.3 and 2.4 bind the defaults for every bar, and M14 turns it red — and A54 (an opted-in provider
  whose threshold `{activeAt: 50, format: "$nope"}` sits beside a sibling: only it is refused, kind
  `settings-variable`, with the part `"taiknr.usage", thresholds 1: is configured with a format
  naming "$nope", which the instrument does not declare; it renders blank`, and the sibling
  renders), and A59 (a provided declaration carrying `bar`, `options: ["thresholds"]`, the default
  format `$saved $bar`, no default label, `saved` reported as `$4.10`, and a `bar` answering 60; the
  document gives it `{ "format": "$saved", "thresholds": [{ "activeAt": 50, "label": "hot" }] }`, and
  the entry renders `hot $4.10` with no bar columns, the sibling rendering). All of these but A45's
  first half and A53 are red before the adapter knows the two
  names: at the base `instrument-binding.ts:154-158` refuses `thresholds` as `option-unimplemented`,
  so the instrument never registers and the sentence asserted is not the one printed. **Code:** `instrument-binding.ts:153-161` accepts the two names on a declaration that carries
  `bar`, by reading `BAR_OPTIONS`, so no code names `context` and a declaration decides (DEC-13);
  the without-`bar` branch is 3.2's; the same states, layering, cap and defaults apply
  to a provided instrument as to Jefferson's own. The provided path itself,
  `checkProvidedSettings` (`configuration.ts:142-238`), is written to `### Contracts`: it hands the
  reader its own per-value check as `check`, carrying only the values a threshold wrote, that check
  parsing a `format` and validating a `style` only when one is written (`configuration.ts:177`,
  `:194`) and setting only written values (`:237`); it
  validates a top-level or threshold `fill` with `validateStyle(…, "fill")`, refusing it as
  `settings-fill`; it forwards a reader fault's `kind` with that path's sentence; it carries `fill`
  and the honoured list; and it returns `{ settings, warning? }` for accepted settings and
  `{ kind, part }` for a refusal. Both of its callers move with that shape: the read-time caller
  pushes the warning to `reading.faults` after `configured.set` (`:281`), and the watch reports it
  through `source.report` after `configured.set` (`:523`). A42's Jefferson-first half, written here,
  and M11 (4.2) prove the watch's push. `checkProvidedSettings`'s comment (`configuration.ts:135-141`)
  moves with it: its list at `:136-137` gains `fill` and `thresholds`, ending "… modifier, style,
  fill and thresholds", and its sentence at `:139-140` names the options the adapted declaration
  lists — the foundational three, `formats` when it declares a composed set, and `thresholds` or
  `fill` when it carries `bar` and names that option. **Boundary cases:** neither name, `thresholds`
  only, `fill` only, both, a list written and none, a format naming no `$bar`, a bar that throws
  and is never read. **Proves:** statusline "A provided instrument takes only the options Jefferson
  implements" (its scenarios "A provided instrument's thresholds", "A provider that names thresholds
  alone", "A provider that names fill alone"), "The default thresholds are 70 and 90" (its provider
  scenarios, "A default reaches a provider's bar that did not opt in" among them), "The bar is read
  only when its reading can change what renders" (its last scenario), "A provider's malformed
  threshold", "A refused provided instrument says nothing of the count", "A provider that registers
  after the read" (A42's Jefferson-first half), "A threshold fault under a provided name" (A41), "A
  provider's faulty entry" (A54) and "A provider's threshold with an unknown key" (A46's threshold
  half), and "A negative reading", proved end to end here (1.3 keeps A18 as the reader half).
  **Done when:** A37–A39 (A38 extended included), A41, A42, A45, A46's threshold half, A47, A53,
  A54 and A59 pass, M21 (4.2) turns A59 red, M11 (4.2) turns A42's Jefferson-first half red, M17
  (4.2) turns A47 red, the file's
  pre-existing cases are unedited, and every provider refusal in the file is asserted beside a
  sibling instrument that renders.

- [ ] 3.2 Naming an option without a bar is refused, with its own kind. **Test first:** A40 — a
  registration declaring `["thresholds"]` and no `bar` is refused, one warning reads
  `pi-jefferson: "taiknr.usage" declares "thresholds" without a bar`, and a row naming it renders
  the placeholder, asserted whole. Red before the kind exists. A40 extended, over the bus, adds
  three registrations with no `bar`, each asserted whole: `options: ["seconds", "thresholds"]`
  refuses with `pi-jefferson: "taiknr.usage" declares the option "seconds", which Jefferson does
  not implement`, its half green at the base, and `options: ["thresholds", "seconds"]` refuses with
  `pi-jefferson: "taiknr.usage" declares "thresholds" without a bar`, red before this task; and
  `options: ["fill"]` refuses with `pi-jefferson: "taiknr.usage" declares "fill" without a bar`,
  with a row naming it rendering the placeholder, red before this task too because at the base the
  adapter refuses `fill` as `option-unimplemented` with that kind's sentence. A46's
  two remaining halves are pins,
  green at the base because the provided path's unknown-key loop already refuses an option the
  declaration does not list (`configuration.ts:167-174`): a provider naming neither option has its
  written `fill` refused alone, naming `fill`; and a provided declaration carrying no `bar`, which
  the `instruments` block gives `thresholds: []`, is refused alone beside a sibling that renders, its
  part reading `"<name>" is configured with "thresholds", which the instrument does not declare; it
  renders blank` (A46 extended, which proves "A provided instrument without a bar"). M20 turns both
  halves red. **Code:** `instrument-binding.ts`'s `ProvidedRefusal` (`:48-55`) gains the
  `option-without-bar` member, and its option loop (`:153-161`) gains the branch, in the order
  `### Contracts`' "The refusal's order" gives: a name in `BAR_OPTIONS` on a declaration with no
  `bar` refuses `option-without-bar`, and the first offending name decides.
  `registration-listener.ts:214-223` gains `option-without-bar` beside `option-unimplemented` and
  `formats-without-composed`, taking the refusal variant the adapter answers with, the order inside
  the option loop and the sentence from `### Contracts`; `option-unimplemented` keeps its sentence
  for what it still covers (`seconds` and anything outside the accepted set) (DEC-12).
  **Boundary cases:** `thresholds` without `bar`, `fill` without `bar`, the two ordering pairs
  (`["seconds", "thresholds"]` and `["thresholds", "seconds"]`, both with no `bar`), a name outside
  the accepted set, a `fill` under a `thresholds`-only opt-in, a fill key inside a threshold.
  **Proves:** statusline "A registration naming an option Jefferson cannot honour is refused" (both
  scenarios),
  "A provided instrument without a bar", "A provider that names neither", and "An option outside the
  accepted set", proved by the pre-existing `tests/registration.test.ts:382-384` (`seconds`),
  unedited. **Done when:** A40 and A46 pass, each asserted beside a sibling instrument in the same
  document that renders, and M20 (4.2) turns A46's two halves red.

- [ ] 3.3 The state choice holds for a provided instrument, with no new code. **Test first:** A43,
  A44 and A52, each green on arrival once 3.1 lets a provider name `thresholds` — A43 (a bar read one
  sample with the instrument placed twice in row 1 and once in row 2: no placement shows the first
  reading's state, and the next render reads again), A44 (the discriminating pair: no placement takes
  the spare columns when a threshold's format adds `$bar` to a `$bar`-less top level, and the sibling
  starts the row when a threshold drops `$bar` from a `$bar`-bearing top level; both with one read,
  every placement blank, one notice carrying `"taiknr.usage" failed to render: its bar threw`), and
  A52 (`options: ["thresholds"]`, the default format `$saved $bar`, thresholds at 0 giving `format:
  "$saved"` and at 50 giving `format: "$saved $bar"`, and `saved` reported as `$4.10`, beside a
  sibling: a `bar` returning the string `"50"` renders `$4.10` with one notice reading `"taiknr.usage"
  failed to render: its bar returned a string, where a finite number or null is declared`, and a
  `bar` that throws renders `$4.10` with one notice reading `"taiknr.usage" failed to render: its bar
  threw`, the sibling rendering either way). **Code:** none — `containProvided` wraps `fills` and
  `render` from 2.3 (DEC-9), so this task adds no code and its three checks pin behaviour that
  already holds. **Boundary cases:** a bar read once versus twice, a `then` getter that throws, a
  rejected document. **Proves:** instrument-registration "A faulting bar is unknown, and blanks only
  a drawn bar" (both scenarios, A52), "A state is chosen inside a provided instrument's boundary"
  (its scenario, A44) and "Provider code costs one entry and no more" (its bar scenarios);
  statusline "One reading a sample" through a provider (A43). **Done when:** A43, A44 and A52 pass;
  M5 (the slot dropped) turns A43 red, M6 and M19 turn A44 red, and M12 turns A52 red.

- [ ] 3.4 The fixture opts in. **Test first:** no check in `redgreen-derek.md` covers this file, and
  `pnpm typecheck` does not read it — `tsconfig.json` includes `tests/**/*.ts` and not `.mts` — so
  the check is the CI step, reproduced by hand. **Code:** `progress`'s options (`provider.mts:81`)
  become `["formats", "thresholds", "fill"]`; it already carries `bar`, so the fixture's header
  comment stays true and no instrument is added. **Boundary cases:** a declaration that opts in, the
  existing one that does not. **Done when:** run the CI block at `.github/workflows/ci.yml:101-118`
  by hand — `pnpm pack`, `mkdir -p` the provider's `node_modules/pi-jefferson`, `cp -R` the fixture
  into it, extract the tarball, then both `tsc` runs: the fixture's `tsc` exits 0 with no output
  (`.github/workflows/ci.yml:106`; the fixture's `tsconfig.json` sets `noEmit`), and the reserved
  config's run fails with one `TS2344`, after which the block prints `OK: a registration under
  jefferson. fails the type check` (`:119`). Show the check catching a mistake by misspelling an
  option name, which fails with `TS2820`.

- [ ] 3.5 `pnpm typecheck` and `pnpm test` green.

## 4. The finished change

- [ ] 4.1 Re-run every scenario's proof against the finished code. `pnpm test`, `pnpm typecheck` and
  `openspec validate --strict` — the last one to prove the deltas still describe what the code does.
  Then re-run the checks whose proof a later task could have moved: the flipped pair and the routed
  helper in `tests/format.test.ts` (A22, P3), the reader's seam cases in `tests/thresholds.test.ts`
  (A8, A10, A11), the geometry cases, the pins and the import check in `tests/jefferson.test.ts`
  (P1, P2, A60) and the
  helpers in `tests/instrument.test.ts` (A48–A50, P4).

- [ ] 4.2 Show each check catching its own mistake. Re-run M1–M9 (`redgreen-derek.md`) and M10–M24
  (defined here) against the finished code, one at a time and restoring after each: M1 (`drawBar` ignoring its fill) → A21; M2 (only the
  first four thresholds checked) → A8 and A4 extended; M3 (`<` for `<=`) → A15; M4 (a record replaced whole) → A19; M5
  (the slot dropped) → A43; M6 (`containProvided` no longer wrapping `fills`) → A57 and A44; M7
  (`resolveFormat` reading the declaration's `bar`) → A50; M8 (Jefferson's own path reporting the
  over-four warning through `source.report` as well as pushing it to `reading.faults`) → A29, whose
  `reported` list then holds two `thresholds-over-four` faults where one is asserted; M9 (a `fill` fault's sentence naming the key alone) → A36; M10 (Jefferson's own path reporting
  the
  over-four warning through `source.report` at once instead of pushing it to `reading.faults`) → A35;
  M11 (the watch dropping the reader's `overFour`) → A42's Jefferson-first half; M12 (blanking
  judged against the top-level format) → A34, A52; M13 (the bar read whenever a threshold list is in
  force, the defaults included) → A55's first half and A45's first half; M14 (the defaults applied
  only when the declaration names `thresholds`) → A53; M15 (a state taking the top-level label and
  gap and its composed choice) → A56's (a) and (c); M16 (the reading compared rounded to one
  decimal) → A51; M17 (the provided path running its per-value check over the honoured list after
  the reader, instead of handing that check to the reader) → A47; M18 (the chosen state's `fills`
  answering in place of a declared `fills: true`) → A49; M19 (the `fills` catch answering a constant
  in place of `topLevelFills`, run once as `true` and once as `false`) → A44 (a) and A44 (b); M20
  (the provided path's unknown-key check accepting `thresholds` and `fill` whatever the declaration
  lists) → A46's two pin halves; M21 (a settings path's per-value check filling in `segments` from
  the declaration's default format when the settings write no `format`, as `configuration.ts:177`
  and `:301` do today, run on each path) → A58 and A59; M22 (the reader sorting the list before it
  checks) → A9; M23 (a bound state reading the top-level `formats` in place of its own layered
  `formats`, the read `instrument-binding.ts:316-318` makes today) → A56 (d)'s busy half; M24 (a
  relative import added to `components/visuals/bar.ts`, and separately to `thresholds.ts`) → A60.
  A mutation that stays green means the check proves less than its row claims: report it in the
  change's notes rather than weakening or deleting the check.

- [ ] 4.3 `pnpm typecheck` and `pnpm test` green. Derek's copy of the finished change read 628 tests
  and a clean typecheck against a base of 578.

## 5. Joel's live observation

- [ ] 5.1 **Joel's — the writer never ticks this.** Joel watches the bar on the real thing:
  `context`'s bar turning `warning` at exactly 70 and `error` at exactly 90; a `thresholds` list
  turning the fill at its own percentage and the label and format changing with it; a threshold whose
  format adds `$bar` filling from that percentage on; five thresholds warning once and honouring the
  four lowest; `"thresholds": []` colouring nothing; and a provided instrument that opts in taking
  the same settings. The conductor ticks this with his words in place of the coder's, and
  `openspec validate --archived` fails the archive on it until he has.
