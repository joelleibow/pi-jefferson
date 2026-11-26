{
  "mode": "council",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design only after fixing the specs. One scenario contradicts the selection rule: \"A fifth threshold\" expects the top-level settings where the four lowest still apply. The capability that says a declaration carrying `bar` MUST declare the two options cuts across the provider opt-in Joel ruled. Five gaps must be closed before design: (1) when the bar's reading is taken, so that unconfigured instruments still never run `bar` for a format that leaves it out; (2) a delta to instrument-registration's \"Provider code costs one entry\" for a faulting `bar` used only to pick the state; (3) one reading per sample, shared by the state, `fills`, the width-0 probe and the drawing; (4) the order in which a threshold's `style` and the top-level `fill` layer on the fill; (5) the input edges: a threshold list or entry with the wrong shape, unknown keys, `-0`, and an over-four count that includes entries above 100. The economics are fine: at most five parsed states per instrument, and one cheap reading per sample if it is cached.",
  "findings": [
    {
      "id": "CR-1",
      "severity": "blocking",
      "location": "specs/statusline/spec.md, Requirement \"Only the four lowest thresholds are honoured\", Scenario \"A fifth threshold\"",
      "finding": "This scenario expects the top-level settings at a percentage only the highest of five thresholds covers. Under the spec's own rule, the highest kept `activeAt` at or below the reading applies, so the fourth-lowest threshold applies there, not the top level.",
      "rationale": "\"A threshold sets the instrument's state\" and \"Two thresholds below the reading\" say the highest entry at or below the reading wins. Every reading at or above the fifth threshold is also at or above the four lower ones. So a reading that only the fifth 'covers' cannot exist under that rule. The scenario seems to assume Starship-style ranges (research-chidi §1), which the ruling rejected.",
      "concrete_case": "Thresholds are at 10, 20, 30, 40 and 50, and the bar reads 55. The correct implementation renders the state at 40. A test written from this scenario expects the top-level settings and fails, or pushes the implementer into a band model that breaks \"Two thresholds below the reading\".",
      "recommendation": "Rewrite it as: with thresholds at 10, 20, 30, 40 and 50 and a reading of 55, the state at 40 applies, the one at 50 never does, and one warning names the instrument. Keep \"The four lowest apply\" as the companion scenario."
    },
    {
      "id": "CR-2",
      "severity": "major",
      "location": "specs/statusline/spec.md, ADDED \"A declaration that can draw a bar declares the two options\", and MODIFIED \"A provided instrument takes only the options Jefferson implements\" (first paragraph)",
      "finding": "Both requirements are worded so that carrying `bar` alone grants or requires `thresholds` and `fill`. Joel ruled that a provider opts in by naming them in `options`, and that one which does not draws the default bar.",
      "rationale": "owner-rulings.md 2026-11-25: \"A provider that does not opt in draws the default bar\" and \"That's exactly it\" (`options: [\"thresholds\", \"fill\"]`). The ADDED requirement says \"A declaration that carries `bar` MUST declare `thresholds` and `fill`\", and it is not limited to shipped declarations. The MODIFIED one says a provided instrument takes them \"when its declaration carries `bar`\", without the opt-in. The proposal itself says \"names them in `options`\".",
      "concrete_case": "taiknr registers `bar` with no `options`, and a user writes `\"fill\": {\"fg\":\"muted\"}` under it. The ADDED text calls taiknr's declaration non-conforming. The MODIFIED text lets the key through, though taiknr never opted in. Either reading lets the adapter or the settings check diverge from the ruling, and the shipped-declarations test cannot tell them apart.",
      "recommendation": "Limit the ADDED requirement to Jefferson's own declarations, preferably derived from `bar` so it cannot drift. Reword the MODIFIED one: \"`thresholds` and `fill` when its declaration carries `bar` and names them in `options`\". Add a scenario where a provider with `bar` and no opt-in has a user's `fill` refused as an option it does not take, and draws the default bar."
    },
    {
      "id": "CR-3",
      "severity": "major",
      "location": "specs/statusline/spec.md, MODIFIED \"Only a variable the format names can blank an instrument\" (last sentence) and ADDED \"A threshold compares the bar's own reading\"; proposal \"One rule is amended, not dropped\"",
      "finding": "Every bar-capable instrument always has thresholds in force, because the 70/90 defaults apply when none are written. If the amended rule (\"choosing a state reads a bar's value\") applies unconditionally, unconfigured instruments start running `bar` where today they never do.",
      "rationale": "Today `declaration.bar!` runs only when a segment is `$bar` (format.ts, `resolveFormat`, the `segments.some(segment => segment.kind === \"bar\")` branch). The defaults change only the fill (spec \"The default thresholds are 70 and 90\"), and the fill matters only when `$bar` is drawn. michael-orientation T5 limits the consequence to \"only once the user has configured thresholds\", but the delta's requirement text does not.",
      "concrete_case": "A user has the default `context` (`$percent/$window`, no `$bar`), and a provider has a `bar` that throws, under its default format `$saved`. With no thresholds written, an unconditional state read calls the provider's `bar` on every uncached render, records a 'bar threw' fault, and shows the user a warning about a bar they never placed. Today nothing runs and nothing is reported.",
      "recommendation": "State the rule in the spec. A bar's reading is taken to choose a state only when the format in force names `$bar`, or when the user wrote a non-empty `thresholds` list. With the defaults alone, the state matters only to a drawn fill. Add a scenario: no thresholds written, a format with no `$bar`, and the bar is never read."
    },
    {
      "id": "CR-4",
      "severity": "major",
      "location": "openspec/specs/instrument-registration/spec.md:186-219 \"Provider code costs one entry and no more\" (no delta in this change); specs/statusline/spec.md \"A threshold compares the bar's own reading\"",
      "finding": "instrument-registration says a provided `bar` that throws or returns the wrong type \"blanks it, label included\". This change makes the bar's reading choose the state even when the format in force does not draw it, and counts unknown as 0. The two rules now conflict, and this change ships no delta to instrument-registration.",
      "rationale": "That rule was written when `bar` ran only for a drawn `$bar`. In the adapter, a faulting `bar` returns `undefined` (instrument-binding.ts, the `bar` wrapper and `fault`), which the new rule counts as 0 for state selection. And `containProvided` (instrument-binding.ts:266-279) guards only `render`. Its `fills` getter passes straight through, so if state selection runs for `fills`, a throw from the `then` getter escapes (michael-orientation T3).",
      "concrete_case": "A provider opts in, its `bar` returns \"50\", the user writes thresholds, and the format in force is `$saved`. instrument-registration requires the entry to render blank. The statusline delta requires the state at 0, or the top level, to render `$saved`. Separately, if state selection also feeds `fills`, a `bar` whose result has a throwing `then` getter fails the row plan and takes down the footer.",
      "recommendation": "Add a MODIFIED delta to instrument-registration. A faulting `bar` is unknown, which counts as 0 for choosing a state, is reported once, and blanks the entry only when the format in force names `$bar`. Add a requirement and scenario that a provided `bar` throwing while the state is chosen, including for width, costs only that entry and never the row."
    },
    {
      "id": "CR-5",
      "severity": "major",
      "location": "specs/statusline/spec.md, ADDED \"A threshold's format decides whether the instrument fills\" (\"The state at two widths\"); proposal \"Where the state is chosen\"",
      "finding": "The spec ties the state to the reading rather than the width, but not to a single reading per sample. Several consumers will each read the bar in one frame: the row plan's `fills`, the width-0 probe, the render at the cell's width, and `resolveFormat`'s own `declaration.bar!` call. Nothing requires them to see the same value.",
      "rationale": "row-renderer.ts reads `fills` on every plan through a getter that has no readings (`get fills()`, `contentWidth`). It then renders `textAt(0)` and `textAt(cellWidth)` separately. A provided `bar` reads a live `fields.view(extension)` (registration-listener.ts:203; instrument-binding.ts:181), not the sample. Provider code is arbitrary and may be impure, for example a bar computed from `Date.now()`.",
      "concrete_case": "A provider bar of elapsed-time progress has a threshold at 70 whose format adds `$bar`. The plan's `fills` read gets 69.9, so the cell does not fill. The render's read gets 70.1, so it draws the bar in a basis sized for text, and the bar gets 0 columns. Or the probe measures one state's text while the cell renders another's, and the text clips. The bar is also called again on every frame's plan, beyond the cached text.",
      "recommendation": "Require that the state is chosen once per instrument per sample, from one bar reading. That one state then decides `fills`, the probe, the rendered text and the fill drawn. The bar is never read a second time for the drawing. Add a scenario where the bar is read once per sample whatever widths are asked for."
    },
    {
      "id": "CR-6",
      "severity": "major",
      "location": "specs/statusline/spec.md, \"A threshold's state changes only the keys it names\" and \"`fill` styles the bar's fill and nothing else\"",
      "finding": "The spec does not say how four layers combine on the fill: top-level `style`, threshold `style`, top-level `fill` and threshold `fill`. It also has no scenario for a user's top-level `fill` against the default thresholds.",
      "rationale": "There are two plausible orders. One: (top style ⊕ threshold style) ⊕ (top fill ⊕ threshold fill). Two: top style ⊕ top fill ⊕ threshold style ⊕ threshold fill. They give different colours. bar.ts:21-22 today only does `{ ...style, fg }`, and none of the scenarios separates the two orders.",
      "concrete_case": "The top-level `fill` is `{\"fg\":\"muted\"}`, and a threshold at 70 sets only `\"style\": {\"fg\":\"error\"}`. Order one draws a muted fill at 75, order two a red one, and both pass every current scenario. Likewise, a user writes only `\"fill\": {\"fg\":\"accent\"}`. Under layering the default at 70 turns that fill `warning`, and no scenario tells the user or a test that this is intended.",
      "recommendation": "Pin the order once: the fill takes the effective style, then the effective fill on top, where each effective value is the top level with the threshold layered key by key. Add the two scenarios above, including the one where a default overrides a top-level `fill.fg` at 70. Add \"below 70\" to the precondition of \"Style still covers the whole instrument\"."
    },
    {
      "id": "CR-7",
      "severity": "minor",
      "location": "specs/statusline/spec.md, \"A malformed threshold rejects the settings\" and \"`fill` styles the bar's fill\" (\"A fill no style allows\")",
      "finding": "Only `activeAt` faults are specified. These inputs are not: a `thresholds` value that is not a list (`{}`, `null`, `70`), an entry that is not an object, an unknown key or a nested `thresholds` inside an entry, an invalid `format`, `label` or `style` inside an entry, and `-0`.",
      "rationale": "The feature-spec standard (§4) requires a guard for each bad input. configuration.ts checks the shape of every option it reads (for example `formats` is \"not an object\"). Research-chidi §4 shows JSON `-0` passes `Number.isInteger` and `>= 0`, so whether it counts as \"negative\" is open. validateStyle's messages say \"style\", and the provided path's kind is `settings-style`, so a bad `fill` would be reported as a style.",
      "concrete_case": "With `\"thresholds\": [70]`, an implementation that only checks `activeAt` either throws a TypeError or quietly ignores the entry. With `\"thresholds\": [{\"activeAt\": 70, \"format\": \"$nope\"}]`, nothing says to reject it or how to name its position. With `{\"activeAt\": -0}` beside `{\"activeAt\": 0}`, the result could be a duplicate rejection or a negative rejection, and neither is stated.",
      "recommendation": "Add one rule: every value inside a threshold is checked exactly as it would be at the top level. Each fault rejects the settings, the whole document for Jefferson's own instruments or that instrument for a provider's, and names the instrument and the threshold's 1-based position. Add scenarios for a non-list, a non-object entry and an unknown key. Rule `-0` as 0, so it duplicates 0. Word `fill` faults as `fill`, with their own fault kind."
    },
    {
      "id": "CR-8",
      "severity": "minor",
      "location": "specs/statusline/spec.md, \"Only the four lowest thresholds are honoured\" vs \"A percentage above 100\"",
      "finding": "The spec does not say whether an entry above 100 counts toward the more-than-four warning.",
      "rationale": "\"More than four thresholds MUST load with one warning\" counts what was written. \"A percentage above 100 … raises no warning\" was only tested with two entries. Joel's ruling (\"if someone defines more than 4\") reads as the written count.",
      "concrete_case": "Thresholds at 10, 20, 30, 40 and 101: one implementation warns because five were written, and another stays silent because nothing below 101 was dropped. Both pass every current scenario.",
      "recommendation": "Add a scenario that warns on the written count, per the ruling's literal wording, whatever the values."
    },
    {
      "id": "CR-9",
      "severity": "minor",
      "location": "specs/statusline/spec.md, \"A threshold sets the instrument's state\" (\"any option the instrument declares, `thresholds` excepted\")",
      "finding": "The set of options allowed inside a threshold is open-ended. Options the reader owns, such as `seconds`, which gates the notice feed at read time (configuration.ts, `declaredSeconds`), cannot vary with a render-time reading.",
      "rationale": "Today only `notice` has `seconds`, and it has no bar, so nothing breaks yet. But the neighbouring card on user-composed instruments could combine a bar with such an option, and \"thresholds excepted\" would then let a threshold's `seconds` through to do nothing.",
      "concrete_case": "A future instrument declares `bar` and `seconds`. `\"thresholds\": [{\"activeAt\": 50, \"seconds\": 5}]` passes the check and never takes effect, which is the kind of silent setting the provider rules refuse (instrument-binding.ts, `option-unimplemented`).",
      "recommendation": "Have the design name, in one canonical place, the options a state may carry (the binding's: format, label, style, fill, formats) and reject any other declared option inside a threshold."
    },
    {
      "id": "CR-10",
      "severity": "minor",
      "location": "michael-orientation.md S3 (\"two options are separate opt-ins\"); specs/statusline/spec.md, MODIFIED provided-options requirement",
      "finding": "A provider can opt into `thresholds` without `fill`. Then a user's list replaces the defaults, and only `style` can colour the fill, which colours the text too.",
      "rationale": "Joel ruled that the fill gets its own key so that threshold colours stay off the text. That intent is lost for a provider that names only `thresholds`.",
      "concrete_case": "taiknr declares `options: [\"thresholds\"]`, and a user writes `[{\"activeAt\": 90, \"label\": \"!\"}]`. The bar stops turning red at 90, and the only way to colour it is a threshold `style`, which also colours the label and the value.",
      "recommendation": "Either refuse `thresholds` without `fill`, as `formats` without `composed` is refused (instrument-binding.ts:161), or state the consequence in the extension-authors docs. Recommendation: refuse it, since such a registration has no use for authors that the coupled pair does not cover."
    },
    {
      "id": "CR-11",
      "severity": "minor",
      "location": "proposal.md, Impact and What Changes (BREAKING); no Migration note",
      "finding": "Rolling back or mixing versions fails loudly in two places, and nothing in the change records either for operators or authors.",
      "rationale": "Before this change, adaptProvidedDeclaration refuses any option other than `formats` and the foundational three (`option-unimplemented`, instrument-binding.ts:153-160). readInstruments rejects any key a Jefferson declaration does not list (configuration.ts, `carries an option its declaration does not have`).",
      "concrete_case": "taiknr ships `options: [\"thresholds\", \"fill\"]`, and a user still on the previous pi-jefferson sees taiknr's whole instrument refused and rendered as an unknown name. A user who writes `\"context\": {\"thresholds\": [...]}` and then downgrades gets the whole document rejected and the default row.",
      "recommendation": "Record both cases in the design's Migration Plan and in docs/extension-authors.md: the minimum Jefferson version for the two options, and that downgrading needs `thresholds` and `fill` removed first."
    },
    {
      "id": "CR-12",
      "severity": "minor",
      "location": "specs/statusline/spec.md, MODIFIED \"$bar takes the width the rest of the format leaves\" and \"Only a variable the format names can blank an instrument\"",
      "finding": "The rewritten \"The pressure a bar shows\" scenario dropped the living spec's source (\"the host's own footer\") but its requirement names no replacement. The amended ADR 0020 rule still cites only 2026-11-16.",
      "rationale": "The feature-spec standard §1 says a constraint without a source is an assumption. michael-orientation D2 says the delta must replace the source with Joel's 2026-11-25 `>=` ruling. The amendment to \"never resolved\" rests on the 2026-11-25 threshold rulings and the T5 analysis.",
      "concrete_case": "A later reader checking why a bar's reading is taken for a format without `$bar` finds only the 2026-11-16 ruling, which says the opposite.",
      "recommendation": "Add `Source: owner-rulings.md, 2026-11-25 (\">=\", fill)` to the `$bar` requirement, and add the 2026-11-25 threshold rulings to the amended blanking requirement, beside the ADR that retires pi parity."
    }
  ],
  "assumptions": [
    {
      "assumption": "Today `bar` runs only when the format names `$bar` (format.ts `resolveFormat`), so Jefferson's default `context` format never reads it.",
      "status": "verified"
    },
    {
      "assumption": "`Instrument.fills` is a boolean fixed at bind time from the top-level segments, and the row reads it through a getter with no readings (instrument-binding.ts `instrumentBindings`; row-renderer.ts `get fills`).",
      "status": "verified"
    },
    {
      "assumption": "`containProvided` guards only `render`; `fills` passes through unguarded (instrument-binding.ts `containProvided`).",
      "status": "verified"
    },
    {
      "assumption": "A provided `bar` reads the live `fields.view(extension)`, not the sample passed to `render` (registration-listener.ts:203).",
      "status": "verified"
    },
    {
      "assumption": "Settings faults found while reading are reported only for a document that installs (configuration.ts, `for (const fault of reading.faults) source.report(fault)` after normalization), so the ledger can carry an over-four warning for both origins without warning about a rejected document.",
      "status": "verified"
    },
    {
      "assumption": "The fault ledger dedupes by scope and kind for the whole session, and `close()` runs at `session_shutdown` (faults.ts; startup.ts:89-98).",
      "status": "verified"
    },
    {
      "assumption": "`sampleReadings()` returns a new object on each footer render, so the per-width text cache resets every frame.",
      "status": "unverified"
    },
    {
      "assumption": "Provider `bar` functions in the wild may be impure, for example time-based.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "components/row/width-plan.ts and how `fills` drives the allocator",
    "registration-listener.ts beyond the adapter call and refusal mapping",
    "docs/ pages and ADR texts (0009, 0012, 0015, 0020, 0021) beyond the orientation's citations",
    "tests other than tests/format.test.ts:140-170",
    "the CI pack/export pin",
    "the brain card itself (quoted via plan-context.md)"
  ]
}