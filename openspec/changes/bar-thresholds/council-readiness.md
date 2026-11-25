{
  "mode": "council",
  "lens": "council-readiness",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "The deltas are close to design-ready, and the rulings are applied faithfully. Before the design starts, close these gaps so tasks.md can leave the coder no choices. (1) The Migration Plan must state the downgrade and version-skew behaviour, which today only the docs pass would cover. (2) Fix the spec wording that makes provider opt-in contradictory. (3) Decide what the defaults do to non-opt-in provider bars and to a user's top-level `fill`. (4) Rule the over-four count when entries above 100 are present. (5) Add scenarios for malformed shapes inside `thresholds`, a threshold's `label` and `formats`, and a provider bar that throws or answers badly when a state is chosen. (6) Fix the cardinality and silence rules of the over-four warning. (7) Add `row-renderer.ts`, `registration-listener.ts` and the sample-provider fixture to Impact, because `Instrument.fills` cannot stay a static boolean. Nothing here needs Joel except F3 and F9's second half. I recommend decisions for both below.",
  "findings": [
    {
      "id": "F1",
      "severity": "major",
      "location": "proposal.md, What Changes and Impact; specs/statusline/spec.md, 'A provided instrument takes only the options Jefferson implements'",
      "finding": "Rollback and version skew are not addressed anywhere in the artifacts. The skew is asymmetric, so the design's Migration Plan has to name it.",
      "rationale": "Jefferson's own instruments reject the whole document on an unknown option (configuration.ts:291). A provider that declares `options` beyond `formats` is refused whole by the adapter (instrument-binding.ts:154-158, `option-unimplemented`). The contract change is types-only, so nothing at runtime tells a provider which Jefferson it is running against.",
      "concrete_case": "(a) A user adds `\"context\": {\"thresholds\":[...]}`, then reverts or downgrades Jefferson. The old code rejects the entire `~/.pi` document and renders the default row for every instrument, not only `context`, with a single warning. (b) A provider ships `options:[\"thresholds\",\"fill\"]` and a user runs it on an older Jefferson. The registration is refused and the instrument renders as an unknown name (blank), where before the provider adopted the option it drew a bar. (c) Going forward, no existing valid document changes meaning, because `thresholds` and `fill` were rejected before. The only observable change is the 70/90 edge.",
      "recommendation": "Have the design's Migration Plan (not tasks.md) state (a) to (c), and have the docs pass tell providers to gate the opt-in on a minimum Jefferson version. The spec needs no change. Add a task to flip the strict-edge test before touching bar.ts, and one to extend the sample-provider fixture (tests/fixtures/sample-provider/provider.mts:81) with a provider that opts in. The opt-in then has an end-to-end test through the real registration path rather than a hand-built declaration."
    },
    {
      "id": "F2",
      "severity": "major",
      "location": "specs/statusline/spec.md, 'The default thresholds are 70 and 90' and 'A threshold's state changes only the keys it names'",
      "finding": "The defaults' interaction with a user's top-level `fill` or `style` colour, and their reach into bars that have not opted in, are unspecified.",
      "rationale": "The spec says the defaults colour the fill 'at its own percentage', but a top-level `fill:{fg:\"muted\"}` followed by a default `warning` at 70 is never resolved. Layering implies `warning` wins, as bar.ts:21-22 does today with `{...style, fg}`, but no scenario pins it. The requirement text also reads 'An instrument whose settings carry no `thresholds`', which covers a provider's bar that did not opt in. Joel ruled 'draws the default bar' for that case, so the defaults must reach it. That makes this a second breaking change for provided bars, and no scenario says so.",
      "concrete_case": "(i) `context` has `fill:{\"fg\":\"muted\"}` and a reading of 75: does the fill render muted or warning? (ii) A provider declares `bar` with `options:[]` and the bar reads 70: today the fill is `accent`/unchanged, and the ruled rule makes it `warning`. (iii) A provider opts in with `options:[\"thresholds\"]` only (no `fill`): a threshold cannot carry `fill`, yet the defaults still colour the fill.",
      "recommendation": "Add three scenarios: the default colour layers over a top-level `fill` colour and wins on `fg`; defaults apply to every bar including a provider's that did not opt in; defaults apply regardless of whether `fill` is declared. Say that the defaults are the replaceable list of two implicit thresholds, each carrying only `fill`."
    },
    {
      "id": "F3",
      "severity": "major",
      "location": "specs/statusline/spec.md, 'Only the four lowest thresholds are honoured' and 'A malformed threshold rejects the settings'",
      "finding": "The over-four warning leaves the count ambiguous when entries above 100 are present, and no scenario covers exactly 0 or exactly 100.",
      "rationale": "Joel ruled: 'Nothing is broken and only a warning is shown if someone defines more than 4' and 'We honor the first 4 that have activeAt below 100'. The spec says a threshold above 100 'MUST NOT take one of the four places' and that one above 100 'raises no warning', but only in a two-entry scenario. A document with four in-range entries plus one at 101 has five entries, with nothing actually dropped. Whether it warns is a choice the coder would make. Exactly 100 is ruled valid ('it's not harmful') and has no scenario.",
      "concrete_case": "Thresholds at 10, 20, 30, 40 and 150: five written, four apply, and the 150 does nothing either way. Does the 'more than four were written' warning fire? Compare also 10, 20, 30, 150, 200: three applying, two ignored by the above-100 rule, and the literal 'more than four' rule still warns.",
      "recommendation": "Take Joel's literal wording: the warning is a count of written entries, five or more, including those above 100. That is the strictest reading of the ruling and needs no extra branch. Add scenarios for 4+1-above-100 (warns) and for 100 and 0 as accepted boundaries. Ask Joel only if the owner wants warnings limited to entries that are actually dropped."
    },
    {
      "id": "F4",
      "severity": "major",
      "location": "specs/statusline/spec.md, 'A threshold sets the instrument's state at a percentage' and 'A malformed threshold rejects the settings'",
      "finding": "Malformed shapes around `thresholds` and inside a threshold have no scenario or error shape, though the requirement allows 'any option the instrument declares' in an entry.",
      "rationale": "Only `activeAt` faults are specified. The reader must also decide what happens to a value that is not a list, an entry that is not an object, a nested `thresholds`, an unknown key in an entry, an entry whose `format` fails to parse, and an entry whose `style` or `fill` names a bad colour. Each of these is an error shape the coder would invent, and all are testable at the reader.",
      "concrete_case": "`\"thresholds\": null`, `\"thresholds\": {}`, `\"thresholds\": [70]`, `[{\"activeAt\":70,\"thresholds\":[]}]`, `[{\"activeAt\":70,\"width\":5}]`, `[{\"activeAt\":70,\"format\":\"$bar $bar\"}]` (a second width-taking variable), `[{\"activeAt\":70,\"fill\":{\"fg\":\"nope\"}}]`. Number edge cases are also unstated: `-0` and `0` passes `Number.isInteger` and `>= 0`, so the pair are duplicates (Chidi 4, orientation T9). `70.0` and `7e1` parse to 70, so a test that expects `70.0` to reject cannot be written. `1e21` loads and does nothing; `1e400` is Infinity and is rejected.",
      "recommendation": "Add one scenario for each shape above. State the wording rule: the warning names the instrument and the threshold by its 1-based position (ADR 0015) and, for `fill` and `style`, the offending key or colour. State that `-0` duplicates `0`, and that integrality is judged on the parsed number so `70.0` is accepted as 70. Decide for providers that a threshold's keys are checked against the adapted declaration's options, minus `thresholds`."
    },
    {
      "id": "F5",
      "severity": "major",
      "location": "proposal.md, Open questions (second bullet); specs/statusline/spec.md, requirement 1 and 'A threshold's state changes only the keys it names'",
      "finding": "The spec allows a threshold to carry `label` and `formats`, but has no scenario for either, and the proposal defers `formats` layering to the design even though it is a pure mechanism question.",
      "rationale": "A threshold's `label` changes whether the label and gap segment exists. A threshold's `format` changes whether the composed set is chosen at all, and a threshold's `formats` may or may not layer by kind. The binding today computes the label gap (instrument-binding.ts:295-298), the composed choice (:303-306) and `fills` (:309) once from top-level segments. The proposal's list of open questions omits this per-state binding, although the orientation lists it as open item 2.",
      "concrete_case": "A top-level format `$percent` with a label `ctx`, and a threshold at 70 with `label: \"\"` and `format: \"$percent $bar\"`: is there a gap before the bar, does the label disappear, does the instrument start to fill at 70? For a provider with a composed set, `formats:{\"busy\":\"X\"}` in a threshold: does the provider's untouched kind `idle` come from the top-level set, the declaration's default, or become unknown?",
      "recommendation": "Add the per-state binding to the proposal's open questions, so the design must close it. Recommended answer: each state binds its own segments, label gap, composed choice and `fills`. A threshold's `style` and `fill` layer by key (ruled). `formats` layers by kind, following the precedent at instrument-binding.ts:316-318, then declaration defaults. Add scenarios for a threshold's `label`, a threshold's format dropping or adding the composed variable, and a threshold's `formats`."
    },
    {
      "id": "F6",
      "severity": "major",
      "location": "specs/statusline/spec.md, 'A threshold compares the bar's own reading' and 'Only a variable the format names can blank an instrument' (added scenarios)",
      "finding": "A provider's `bar` that throws, returns a promise or returns a bad value while a state is chosen has no scenario. Calling `bar` once for the state and again for `$bar` is not ruled out either.",
      "rationale": "The adapter turns a fault into `undefined` and records it (instrument-binding.ts:180-186). T3 and T5 show that state selection runs even when the format names no `$bar`, so a provider's fault can now fire when nothing was drawn. Under the new rule `undefined` counts as 0, so a faulty bar would select the state at 0, which is probably surprising. The spec does not say that a fault blanks nothing, is recorded once, or is a `resolver-*` fault.",
      "concrete_case": "A provider's `bar` throws and the user configured thresholds with the format `$percent`: (a) is the instrument blanked, or rendered at state 0? (b) is a fault recorded once or per render? (c) a `then` getter that throws, which today escapes `call()` (T3): does it blank only that cell? A non-idempotent provider `bar` called twice per render (state, then `$bar`) can disagree with itself between the two calls.",
      "recommendation": "Add scenarios: a throwing bar, a promise-returning bar and a non-finite bar, each with and without `$bar` named; and a provider bar called once per render (read once, share the value between state choice and drawing). Recommend: a fault counts as unknown and so as 0, the fault is recorded once (the ledger dedupes by scope and kind), and no instrument is blanked unless the format names `$bar`. Keep state selection inside `containProvided`."
    },
    {
      "id": "F7",
      "severity": "major",
      "location": "proposal.md, Open questions (third bullet); specs/statusline/spec.md, 'Only the four lowest thresholds are honoured'",
      "finding": "The over-four warning's cardinality, scope and silence conditions are not fixed by the spec. The only scenario names the instrument and says 'one warning', and the proposal leaves the path open.",
      "rationale": "There are three delivery paths with different dedupe rules. `Configuration.warning` is for rejected documents only. `acceptedWarning` covers unknown names. The faults ledger dedupes by scope and kind. A provider's settings can be checked late, after the document is read, by the watch (configuration.ts:513-526). The silent cases are in the proposal's prose but absent from the spec, where the scenarios live.",
      "concrete_case": "(i) Two instruments each over four: one warning or two? (ii) The document is reloaded with the same fault: warn again, or once per process? (iii) A rejected document, or a provider that is refused, with five thresholds: the proposal says silent, and no scenario says it. (iv) A provider whose instrument never registers, with five thresholds: silence is owed by 'Unused settings'. (v) A provider registering before versus after the document read: the same wording and count are required (order independence at configuration.ts:514-515). (vi) Print/json mode drops `ctx.ui.notify` (Chidi §3), so the warning is lost there.",
      "recommendation": "Rule in the spec: one warning per instrument per settings read, worded 'instrument', with a count and the four lowest numbers kept. Add scenarios for: silent when the document is rejected, silent when a provider is refused, silent when the provider never registers, and equal outcome in both registration orders. Name print mode's drop in the Migration Plan as accepted, or add the existing file-level channel."
    },
    {
      "id": "F8",
      "severity": "major",
      "location": "specs/statusline/spec.md, 'A declaration that can draw a bar declares the two options' vs 'A provided instrument takes only the options Jefferson implements'",
      "finding": "The two requirements contradict each other as written, and the added scenarios do not exercise the provider's non-opt-in side.",
      "rationale": "The first says 'A declaration that carries `bar` MUST declare `thresholds` and `fill`'. A provider declaration with `bar` and `options: []` is valid and by Joel's ruling draws the default bar, so it would violate the MUST. The only scenario that tests it ('A shipped instrument with a bar') covers Jefferson's own declarations, and the rest speaks of a document naming a key. The real subject is Jefferson's own declarations and the existing unknown-option rule.",
      "concrete_case": "A provider declares `bar` and `options:[]`, and the user's `instruments` block gives it `thresholds`. The expected outcome by Joel's ruling is a refusal of that instrument alone, as for any option it does not take. No scenario states that outcome.",
      "recommendation": "Reword the requirement to 'A declaration Jefferson owns that carries `bar` MUST declare both options, and one that carries none MUST NOT'. Add a scenario for the non-opt-in provider with a bar: its block gives `thresholds`, only that instrument is refused, and it draws the default bar. For the structural scenario ('every shipped declaration that has a bar lists both'), derive the check from the shipped declarations in a test, not a hand-kept list, so a new instrument cannot slip by (tests/instrument.test.ts:84-98 is the precedent)."
    },
    {
      "id": "F9",
      "severity": "minor",
      "location": "proposal.md, Impact",
      "finding": "The Impact list omits files the change has to touch. Without them the later file boundary is incomplete.",
      "rationale": "`Instrument.fills` is a static boolean that the row reads without readings (row-renderer.ts:54-59, `holder.current.fills`, passed to `planRow` at :92, `width-plan.ts`). A state that decides width needs the reading at plan time, so `fills` has to become a function of the readings, or the plan has to receive them. That also reaches `blank.ts:8`, `containProvided` (instrument-binding.ts:268-270, a pass-through getter) and `instrument.ts:14-18`. The `option-unimplemented` mapping is at registration-listener.ts:214-217, and the sample provider and `tests/instrument.test.ts:82` pin `formats` as the only option.",
      "concrete_case": "A task list built from the proposal's Impact would never name `components/row/row-renderer.ts`, `width-plan.ts`, `blank.ts` or `registration-listener.ts`. The coder would then choose the `fills` signature in the middle of Implement.",
      "recommendation": "Add these files to Impact. Have the design fix the new `Instrument` surface: the exact signature for `fills`, who calls it with which readings, and that a provider's throwing `bar` stays inside the boundary. Tell the design to keep the row's caching rule (`texts` keyed by the sample) intact when a state flips."
    },
    {
      "id": "F10",
      "severity": "minor",
      "location": "specs/extension-source-layout/spec.md, 'The bar renders as before' and 'Looking for the bar'",
      "finding": "Both scenarios are partly structural or vague, so a test could prove them in more than one way.",
      "rationale": "'The filled columns and the `dim` track are the ones the drawing produced before' has no stated oracle, since the old drawing is being changed. 'The percentage a bar changes state at is the instrument's setting and not the visual's' is a location claim with no executable check unless a test greps bar.ts or reads its signature. The design also has to say what `drawBar` takes (the fill style, instead of choosing colour) so that the visual keeps importing nothing.",
      "concrete_case": "Without a stated oracle, the strict-edge test could be rewritten to expect the new colours and nothing else, and the 'as before' scenario would then be vacuous. Joel's 'Oops' ruling on `>=` makes the flip the only change to bar geometry.",
      "recommendation": "Make the oracle explicit: the flipped edge test (tests/format.test.ts:147-153) asserts 70 and 90 colour at exactly those numbers, while the geometry tests at :157-170 and tests/jefferson.test.ts:524-538 and :685-727 stay unchanged and pass. Mark the 'Looking for the bar' scenario as a structural check (a test that `bar.ts` holds no 70 or 90 and imports nothing), or as Joel's to observe."
    },
    {
      "id": "F11",
      "severity": "minor",
      "location": "specs/statusline/spec.md, 'A threshold compares the bar's own reading' and the `$percent` rounding scenario",
      "finding": "The rounded-text gap is correctly specified and has one boundary case. The negative-reading case and the unknown-versus-null case are not both pinned.",
      "rationale": "A reading of 69.99 prints `70.0` and must not apply a threshold at 70. The spec pins that. `undefined` and `null` both count as 0 (D8), and one scenario ('A count of zero with nothing to fill') covers `null` only. `undefined` is covered by the earlier scenario, but 'A named bar with no usage' blanks the instrument first, so the state-at-0 test with `$bar` named is unreachable and the 'at 0' state is observable only when the format omits `$bar`.",
      "concrete_case": "`context` with no usage, a threshold at 0 giving `format:\"$percent\"`, and the top-level format `$percent $bar`: the unknown bar blanks the instrument if `$bar` is named, but the threshold at 0 picks a format with no `$bar`, so it renders. The spec does not say that the state's format decides the blanking.",
      "recommendation": "Add one scenario: unknown usage with a threshold at 0 whose format drops `$bar` renders the instrument, while a threshold at 0 whose format names `$bar` blanks it. Say that blanking is judged against the format of the state in force."
    },
    {
      "id": "F12",
      "severity": "minor",
      "location": "specs/statusline/spec.md, 'Only a variable the format names can blank an instrument' (amended)",
      "finding": "The amended ADR 0020 rule is stated correctly, but the delta text 'choosing a state reads a bar's value without resolving a variable' leaves it open whether a named-but-unknown bar blanks before or after the state is chosen.",
      "rationale": "T5 shows that state selection happens before the state's format is known, so a bar that reads unknown must be treated as 0 for selection and as unknown (blank) for drawing, and the two readings must not mix.",
      "concrete_case": "Format in force names `$bar`; the bar reads `undefined`. The state is chosen at 0, which may change the format to one that drops `$bar`. The instrument should render, not blank. The delta's last scenario ('A named bar with no usage') only covers the case where the format in force names `$bar`.",
      "recommendation": "Fold this case into F11's scenario. Record the amendment in ADR 0020 (and the new ADR retiring pi parity) in the design's file list, so the docs pass picks it up without a design choice."
    },
    {
      "id": "F13",
      "severity": "minor",
      "location": "proposal.md, Impact (Tests) and 'What this change does not do'",
      "finding": "The test list is feature-level and names no failing-first order. Several listed cases can pass vacuously unless the checks are shown catching a fault.",
      "rationale": "The provider-refusal and over-four cases touch a late-checked path (configuration.ts:513-526), and the flipped edge test passes trivially only if it asserts exact colour at 70 and 90 with the old strict code failing it. The standard requires every scenario to name its task and test, and every automated check to show it catching one.",
      "concrete_case": "A test that asserts a provider's bad threshold 'only refuses that instrument' can pass even if the whole document is rejected when it also asserts nothing about neighbouring entries. The scenario 'every other entry renders as configured' needs a sibling entry in the same fixture.",
      "recommendation": "For tasks.md: write the flipped edge test first and run it red against the current bar.ts; give each provider scenario a neighbour entry; assert the exact warning text for the over-four case (instrument name and count); run the 4-and-100 boundary cases; and have the last group re-run every scenario's proof after any formatting pass. Fake only the provider's external bus, never the threshold reader."
    }
  ],
  "assumptions": [
    {
      "assumption": "The three living requirements the delta MODIFIES exist under exactly those headers (statusline `$bar takes the width the rest of the format leaves`, `A provided instrument takes only the options Jefferson implements`, `Only a variable the format names can blank an instrument`; extension-source-layout `The bar has its own file`), and each delta keeps every old scenario, so the strict validate will not drop a scenario by replacement.",
      "status": "verified"
    },
    {
      "assumption": "bar.ts:14-22 holds the 70/90 constants with strict `>` comparisons, and the strict edge test is tests/format.test.ts:147-153.",
      "status": "verified"
    },
    {
      "assumption": "The adapter refuses any option beyond `formats` and the foundational three (instrument-binding.ts:154-158), and `ContractDeclaration.options` is typed `readonly \"formats\"[]` (instrument-contract.ts:49).",
      "status": "verified"
    },
    {
      "assumption": "The row reads `fills` with no readings (row-renderer.ts:54-59), and `containProvided` passes `fills` straight through (instrument-binding.ts:266-270).",
      "status": "verified"
    },
    {
      "assumption": "An older Jefferson rejects an unknown own-instrument option with a whole-document rejection (configuration.ts:291), per ARCHITECTURE and orientation T6; I did not run an old build.",
      "status": "unverified"
    },
    {
      "assumption": "The faults ledger dedupes by scope and kind and opens at resources_discover, and print mode's `notify` is a no-op (taken from michael-orientation T4 and research-chidi §3, not re-read in startup.ts or faults.ts).",
      "status": "unverified"
    },
    {
      "assumption": "`registration-listener.ts:214-217` maps `option-unimplemented` to its message, and is the only place that wording needs a change if the accepted option list grows.",
      "status": "verified"
    }
  ],
  "owner_questions": [
    {
      "question": "When more than four thresholds are written and some of the extras are above 100, does the 'more than four defined' warning fire?",
      "options": [
        "Yes: count every written entry, so five or more warns (even if the extras are above 100 and so do nothing)",
        "No: warn only when an entry within 0 to 100 is actually dropped"
      ],
      "recommended_option": "Yes: count every written entry, so five or more warns",
      "why": "It matches Joel's literal words ('if someone defines more than 4') and needs no extra branch. His 'honor the first 4 below 100' wording can be read the other way, and the coder must not pick."
    },
    {
      "question": "Should the default 70/90 colours reach a provider's bar that did not opt in, and should they override a user's top-level `fill` or `style` foreground at those percentages?",
      "options": [
        "Yes to both: defaults are two implicit thresholds layered over the top level, so the default colour wins on `fg` and everything else is kept",
        "Defaults apply only to Jefferson's own instruments, and a user's top-level foreground wins over a default"
      ],
      "recommended_option": "Yes to both",
      "why": "It keeps today's behaviour (bar.ts:21-22 puts `warning` over the style's `fg`), honours 'a provider that does not opt in draws the default bar', and needs no special case. The cost is that provided bars also move to `>=` at 70 and 90, a second breaking edge for providers, which the docs pass must announce."
    }
  ],
  "not_checked": [
    "I did not read startup.ts, faults.ts or the full configuration.ts reader and watch (:142-238, :285-351, :503-526) in this pass, so the warning-channel facts rest on Michael's orientation.",
    "I did not run `openspec validate --strict` on the deltas or the existing tests.",
    "I did not check docs/, ARCHITECTURE.md or the ADR directory for the pages the change makes false.",
    "I did not verify the CI pack check or the tarball pin on the published contract.",
    "I did not inspect tests/fixtures/sample-provider/provider.mts beyond the orientation's citation of line 81, or the registration tests at tests/registration.test.ts:330-370.",
    "I did not test an older Jefferson build against a document or provider that uses the new options, so the rollback description in F1 follows from reading the code."
  ]
}