{
  "mode": "council",
  "lens": "council-codebase",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Send this to design, not back to the proposal. Every current-state citation I opened lands where the proposal says: bar.ts's strict `>` at 70/90 (:14-22), `context` as the only shipped bar with `FOUNDATIONAL_OPTIONS`, `Instrument.fills` pinned at bind (:309) and read through an unwrapped getter (row-renderer.ts:56-59), the two parallel settings checkers, the pinned export lists, and all four requirement headings the deltas modify. The defects are in what the deltas leave unstated: a plan-time read of a provider's `bar` with no containment rule, an over-four warning that cannot be one path, style-validation messages that would name the wrong option, and an Impact list short by two source files and two pin tests. None of them blocks the proposal; each becomes a decision the coder would otherwise make alone.",
  "findings": [
    {
      "id": "CB-01",
      "severity": "major",
      "location": "specs/extension-source-layout/spec.md — MODIFIED \"The bar has its own file\", Scenario \"The bar renders as before\"; versus specs/statusline/spec.md — ADDED \"`fill` styles the bar's fill and nothing else\"",
      "finding": "The extension-source-layout scenario says \"only the fill's colour comes from the state\", while the statusline delta gives `fill` `style`'s full shape, attributes included, and proves it with `{\"bold\": true}`.",
      "rationale": "`fill` overrides `style` on the fill key by key, and the ADDED scenarios \"The top level's keys stay\" (bold survives a threshold's `fg`) and \"A fill inside a threshold\" (accent and bold) both require attributes to reach the fill. \"Only the fill's colour comes from the state\" denies exactly that. This scenario is the sole carrier of the \"the drawing did not change\" proof, so a wrong word here becomes a wrong test that passes on an implementation which ignores attribute settings.",
      "concrete_case": "A document writes `{\"context\": {\"fill\": {\"bold\": true}}}` and no thresholds; the bar reads 50. The statusline delta requires the filled columns bold. The extension-source-layout scenario says the filled columns are the ones the old drawing produced and only the colour may differ, so the same render is conformant and non-conformant depending on which delta the test is written from.",
      "recommendation": "Reword the scenario as \"only the fill's style comes from the settings — its `fg`, `bg` and attributes\", leaving \"the filled columns and the `dim` track are unchanged\" as the drawing's own claim."
    },
    {
      "id": "CB-02",
      "severity": "major",
      "location": "specs/statusline/spec.md — ADDED \"A threshold's format decides whether the instrument fills\"; code: components/instruments/instrument-binding.ts:266-279 and :309, components/row/row-renderer.ts:56-59 and :92, format.ts:298",
      "finding": "The requirement makes the bar's reading decide the instrument's width, which forces a provider's `bar` to run while the row is planned, and no requirement says what happens when it throws there. The provider boundary wraps `render` only, and `fills` — the one thing outside it — is read on every plan.",
      "rationale": "`Instrument.fills` is a plain boolean computed once from the top-level segments (instrument-binding.ts:309) and read through `containProvided`'s pass-through getter (:266-269) on every plan (row-renderer.ts:56-59, :92). A state-dependent fill must consult the bar at plan time, where nothing is wrapped. `openspec/specs/instrument-registration/spec.md:186-200` already requires a throwing provided `bar` to blank that entry while \"pi MUST keep running\", so an unguarded plan-time read breaks a living requirement rather than merely failing a test; pi-tui's `doRender` calls each component's render with no try/catch (`node_modules/@earendil-works/pi-tui/dist/tui.js:139-146`), so the throw leaves the footer path rather than the entry.",
      "concrete_case": "A provider declares `bar: () => { throw new Error(\"x\") }` and `options: [\"thresholds\"]`; the document writes one threshold at 50. The row is planned, the `fills` getter runs the bar, the exception leaves `plan()` and `footer.render()`, and the whole footer stops rendering instead of that entry blanking once with one warning.",
      "recommendation": "Add a scenario: a provided `bar` that throws while the state is chosen blanks that entry, reports one fault, and every row still renders — and have the design name the wrapped seam (a `fills(readings)` computed inside the boundary) instead of a property."
    },
    {
      "id": "CB-03",
      "severity": "major",
      "location": "proposal.md — \"Open questions\", \"One over-four warning path for both origins\"; code: configuration.ts:88, :505, :535, startup.ts:65-71, :140, :153, registration.ts `Registry.accept`, faults.ts:54-72",
      "finding": "\"One over-four warning path for both origins\" is not implementable as one path. A provider whose settings are checked after startup's delivery windows can only be warned through the faults ledger, by which time `Configuration.warning` has already been delivered and `acceptedWarning` has already run.",
      "rationale": "The three delivery moments are not interchangeable. `Configuration.warning` is a single string documented as set \"only when a present document could not be read or was rejected\" (configuration.ts:88) and notified once at `session_start` (:140, startup.ts:153). `acceptedWarning` takes only unknown names and runs at `resources_discover` (configuration.ts:535, startup.ts:65-71). The ledger is the only channel still open later, and a watch runs synchronously inside `Registry.accept`, which happens whenever the registration arrives — possibly after both earlier windows have closed. So the design must choose one wording with two deliveries, not one channel. The existing `Reading.faults` buffer (configuration.ts:505) already gives \"silent for a rejected document or a refused instrument\" for free.",
      "concrete_case": "A document gives `taiknr.savings` five thresholds, and the provider registers in its own `session_start` handler after Jefferson's (or later). Its settings are checked in the watch, after `resources_discover` ran and after `Configuration.warning` was notified. A warning carried on `Configuration.warning` reaches no one; only `faults.record` reaches the user.",
      "recommendation": "Restate the open question as \"one wording, two deliveries\": a reader-time warning for Jefferson's own instruments (a new `Configuration` field or the faults buffer) and the ledger for any check that runs after the ledger opens, both composing the sentence from one function."
    },
    {
      "id": "CB-04",
      "severity": "major",
      "location": "specs/statusline/spec.md — ADDED \"`fill` styles the bar's fill and nothing else\", Scenario \"A fill no style allows\"; ADDED \"A malformed threshold rejects the settings\"; code: format.ts:183-222, configuration.ts:171, :198, :341",
      "finding": "Both deltas require the warning to name the offender, but every style path hardcodes the word \"style\" and no path can name which threshold was at fault. Reusing `validateStyle` for `fill` will tell a user their `style` is wrong when they wrote `fill`.",
      "rationale": "`validateStyle` throws fixed sentences — \"has a style that is not an object\" (format.ts:186), \"has a style key that pi's ThemeStyle does not have\" (:201), \"has a style attribute that is not a boolean\" (:219) — and the readers wrap them as `instrument \"context\" ${message}` (configuration.ts:341) or `${name} is configured with a style Jefferson cannot use` (:198). Neither mentions the option the user wrote, and neither has any notion of a threshold's position, so a fault in `thresholds[2].fill` reads identically to one in `thresholds[0].style` or in the top-level `style`. The repo already has the convention the message needs: 1-based places at configuration.ts:372, :382.",
      "concrete_case": "A document writes `{\"context\": {\"thresholds\": [{\"activeAt\": 70, \"fill\": {\"colour\": \"red\"}}]}}`. The user gets `pi-jefferson: <path> was rejected (instrument \"context\" has a style key that pi's ThemeStyle does not have: \"colour\"); rendering the default row` — the word `style` and no threshold position, so they edit the instrument's `style` and the document is rejected again.",
      "recommendation": "Give `validateStyle` (or its caller) the option's name for the sentence and add the threshold's 1-based position, and put the required wording into the two delta scenarios so the design cannot settle for \"names the offender\"."
    },
    {
      "id": "CB-05",
      "severity": "major",
      "location": "proposal.md — \"## Impact\", \"Reading and checking settings\" and \"Tests\" bullets",
      "finding": "Impact under-counts the Modify set by two source files and two pinned tests. It names configuration.ts, instrument-binding.ts, instrument.ts, context.ts, bar.ts, format.ts, instrument-contract.ts and tests/format.test.ts, but not `startup.ts`, `registration-listener.ts`, `tests/instrument.test.ts:81-82`, or `tests/jefferson.test.ts`'s export pin.",
      "rationale": "Whichever channel the over-four warning takes, `startup.ts` is where it is wired (:65-71, :140, :153). A registration declaring `thresholds` or `fill` without `bar` must be refused for a reason; the repo's precedent is a distinct refusal kind with its own sentence (`formats-without-composed`, registration-listener.ts:219-223), while reusing `option-unimplemented` would print `declares the option \"thresholds\", which Jefferson does not implement` — false, since Jefferson implements it. And `tests/instrument.test.ts:81-82` asserts every shipped declaration's options are exactly `[\"format\",\"style\",\"label\"]` except `notice`; `context` gains two, so that test fails unedited, while :83 still requires `Object.isFrozen(declaration.options)`.",
      "concrete_case": "After the change `context.options` is `[\"format\",\"style\",\"label\",\"thresholds\",\"fill\"]`, so `tests/instrument.test.ts:82` fails; and a new runtime export — say `DEFAULT_THRESHOLDS` from bar.ts — or a new shipped file (a `thresholds.ts`) fails `tests/jefferson.test.ts:275` and its \"a shipped file the pin does not cover\" assertion until the pin is extended.",
      "recommendation": "Name all four in Impact, and have the design state which refusal kind `thresholds`-without-`bar` uses and its exact sentence, so `registration-listener.ts` is either a Modify or explicitly is not."
    },
    {
      "id": "CB-06",
      "severity": "minor",
      "location": "proposal.md — \"Documentation the change makes false, for the docs pass\"; docs/configuration.md:76; docs/adr/0009-components-hold-the-parts-and-the-bar-stands-alone.md (\"The bar stands alone\" bullet)",
      "finding": "The docs list is short by three live records: docs/configuration.md:76, ADR 0009's sentence that the bar's threshold colours live in bar.ts, and ADR 0020's wording (which michael-orientation T5 says this change amends and which the delta's scenario set already assumes).",
      "rationale": "docs/configuration.md:76 tells the user \"any instrument whose format holds `$bar`\" fills the row; after this change an instrument fills only while the state in force names `$bar`. ADR 0009's decision bullet reads \"Its drawing, filled portion and threshold colors live in `components/visuals/bar.ts`\", which is false once thresholds are settings — and this repo revises an old ADR's sentences in a new one, as ADR 0009 itself does to ADR 0005 and ADR 0007. ADR 0020's decision bullet \"a declared variable the format does not use is not resolved\" now needs the \"choosing a state reads the reading, not the variable\" half.",
      "concrete_case": "A user reads configuration.md:76, writes `format: \"$percent $bar\"` with a threshold at 90 giving `$percent`, and at 90% the instrument stops filling — the documented rule and the behaviour disagree, with no ADR recording why.",
      "recommendation": "Add the three to the docs pass scope, and mention in the formats.md:92 rewrite that `$percent` prints `70.0` while a threshold at 70 has not applied below it, since that is the first question this change will draw."
    },
    {
      "id": "CB-07",
      "severity": "minor",
      "location": "specs/statusline/spec.md — ADDED \"A malformed threshold rejects the settings\", clauses \"a negative one\" and \"two thresholds sharing one number\"",
      "finding": "JSON `-0` is a whole number, passes `>= 0`, and equals `0`, so the duplicate rule makes `[{activeAt: 0}, {activeAt: -0}]` a duplicate — but the other clause calls a negative `activeAt` a rejection, and nothing says which `-0` is.",
      "rationale": "research-chidi.md §4 measured it: `JSON.parse(\"-0\")` yields `-0`, `Number.isInteger(-0)` is true, and `-0 >= 0` passes, so a range check accepts it; `-0 === 0`, so the entries collide. A duplicate check written with `Object.is` treats them as distinct and accepts a document the spec says must be rejected, so two conformant-looking implementations disagree on an input a user can type.",
      "concrete_case": "`{\"thresholds\": [{\"activeAt\": 0, \"fill\": {\"fg\": \"accent\"}}, {\"activeAt\": -0, \"fill\": {\"fg\": \"error\"}}]}` is rejected under a `===`/`Set` duplicate check and accepted with an arbitrary winner under `Object.is`.",
      "recommendation": "Say `activeAt` is the integers 0 to 100, with `-0` read as 0 and therefore a duplicate of 0, and name the check (`typeof value === \"number\" && Number.isInteger(value)`, then `0 <= value`)."
    },
    {
      "id": "CB-08",
      "severity": "minor",
      "location": "specs/statusline/spec.md — ADDED \"Only the four lowest thresholds are honoured\" versus ADDED \"A malformed threshold rejects the settings\", Scenario \"A percentage above 100\"",
      "finding": "The warning's trigger counts written entries while the cap and the \"above 100 takes no place\" rule count applicable ones, so two different algorithms both read as conformant.",
      "rationale": "One sentence says \"More than four thresholds MUST load with one warning\"; another says a threshold above 100 \"MUST NOT take one of the four places\". An implementer who drops entries above 100 before counting warns only when more than four remain; an implementer who counts first warns whenever the list is longer than four. Both satisfy \"only the four with the lowest `activeAt` MUST apply\", and no scenario distinguishes them.",
      "concrete_case": "Five entries at 10, 20, 30, 101 and 102: the literal rule warns and honours three; the filter-first implementation warns not at all. A user with three usable thresholds and two typos gets a warning or none depending on the design's order of steps.",
      "recommendation": "State the order in the delta or the design: check every entry, warn if the written count exceeds four, drop entries above 100, sort ascending, keep the four lowest."
    },
    {
      "id": "CB-09",
      "severity": "minor",
      "location": "specs/statusline/spec.md — ADDED \"The default thresholds are 70 and 90\", sentence 1 and Scenario \"A default colours the fill and no text\"",
      "finding": "The requirement says each default colours \"on the fill alone\" but not whether a default behaves as a threshold's `fill` entry and so layers on the top-level `fill` key by key.",
      "rationale": "Layering is stated for a configured threshold only, and the ruling behind it — a key a threshold leaves out comes from the top level — applies to the defaults once they are described as two entries. Scenario \"The top level's keys stay\" proves layering for a configured entry and says nothing about the defaults, so a user who writes only `fill` and no thresholds gets bold-and-warning or plain warning depending on the reading.",
      "concrete_case": "Settings `{\"fill\": {\"bold\": true}}` with no thresholds, bar at 75: one reading gives a bold warning-coloured fill, the other a warning-coloured fill with no bold, and both conform to the delta as written.",
      "recommendation": "Say the defaults are two entries at 70 and 90 that set `fill.fg` only and therefore layer on the top-level `fill` as any threshold does."
    },
    {
      "id": "CB-10",
      "severity": "minor",
      "location": "proposal.md — \"Open questions\", \"Where the defaults live\"",
      "finding": "The stated reason is wrong: the import rule is one-way. A visual may import no file of this package, but a component file and `format.ts` MAY import the visual, so the constants could sit in bar.ts and be imported by the binding. What actually forbids it is the delta's own sentence and the runtime export pin.",
      "rationale": "extension-source-layout, \"The bar has its own file\": \"Any component file and `format.ts` MAY import a visual.\" The two real constraints are the delta's \"the percentage a bar changes state at is the instrument's setting and not the visual's\" and `tests/jefferson.test.ts:275`, which pins bar.ts's exported keys to exactly `[\"drawBar\"]`. A design reasoning from the proposal's premise can conclude the pin is not a constraint, or that a legal home is illegal.",
      "concrete_case": "A design exports `DEFAULT_THRESHOLDS` from bar.ts and imports it in instrument-binding.ts: the import rule permits it, the new spec sentence contradicts it, and the pin fails with `+ [\"DEFAULT_THRESHOLDS\", \"drawBar\"] - [\"drawBar\"]`.",
      "recommendation": "Reword the open question to cite the two real constraints, and add the export pin to the Modify set wherever the constants land."
    }
  ],
  "assumptions": [
    {
      "assumption": "bar.ts holds the 70 and 90 constants and compares strictly above with `>`, on the filled portion only; the track takes `{ ...style, dim: true }` (bar.ts:14-25).",
      "status": "verified"
    },
    {
      "assumption": "`context` is the only shipped declaration carrying `bar`, and its `options` is `FOUNDATIONAL_OPTIONS` ([format, style, label]); `tests/instrument.test.ts:85` pins the bar and :81-83 pin the options and their frozenness.",
      "status": "verified"
    },
    {
      "assumption": "`Instrument.fills` is a single boolean computed at bind from the top-level segments (instrument-binding.ts:309), passed through unchanged by `containProvided` (:266-269), and read on every plan (row-renderer.ts:56-59, :92).",
      "status": "verified"
    },
    {
      "assumption": "`containProvided` wraps only `render`, and pi-tui's `doRender` calls component renders with no try/catch, so a throw from a plan-time provider read leaves the footer path (pi-tui dist/tui.js:139-146).",
      "status": "verified"
    },
    {
      "assumption": "The only user-visible warning channel is `ctx.ui.notify`, and both delivery points are gated on `ctx.mode === \"tui\"` (startup.ts:60, :124); no structured logging facility exists in the package.",
      "status": "verified"
    },
    {
      "assumption": "The four MODIFIED requirement headings exist verbatim in the living specs (statusline spec.md:671, :1831, :1890; extension-source-layout spec.md:377), and each delta reproduces every scenario of the requirement it replaces, with only \"The pressure a bar shows\" and \"Looking for the bar\"/\"The bar renders as before\" rewritten.",
      "status": "verified"
    },
    {
      "assumption": "The published contract's `options` is `readonly \"formats\"[]` (instrument-contract.ts:49), the contract is types-only, and `exports[\"./instruments\"]` points at it (package.json:23).",
      "status": "verified"
    },
    {
      "assumption": "`validateStyle`'s three messages hardcode the word \"style\" and the two callers add the instrument name but never the option name (format.ts:186, :201, :219; configuration.ts:198, :341).",
      "status": "verified"
    },
    {
      "assumption": "Michael's baseline — `pnpm test` 578/578 and a clean typecheck on the branch — still holds; I did not run either.",
      "status": "unverified"
    },
    {
      "assumption": "pi's own error reporting would not catch an exception thrown from a footer component's render; pi-tui does not, and I did not trace the host's outer render timer.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Ran neither `pnpm test` nor `pnpm typecheck`; every test reference is read, not executed.",
    "Did not read the living statusline spec in full — only its requirement headings and the four requirements this change modifies.",
    "Did not read every page under docs/; I grepped the pages the proposal names plus configuration.md and instruments.md.",
    "Did not verify pi 1.4.0's footer `> 70` / `> 90` in node_modules (michael-orientation D2 measured it).",
    "Did not read the brain card itself; plan-context.md quotes its acceptance criteria.",
    "Did not examine width-plan.ts beyond its reads of `fills`, nor the CI pack/tarball step that pins the contract export."
  ]
}