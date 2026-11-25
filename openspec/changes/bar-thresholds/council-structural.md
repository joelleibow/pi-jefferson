{
  "assumptions": [
    {
      "assumption": "owner-rulings.md is binding and newest, superseding other artifacts where they differ",
      "status": "verified"
    },
    {
      "assumption": "validateStyle rejects unknown style keys, non-boolean attributes, and off-slot colours, so 'fill MUST be validated as a style is' is concretely implementable (format.ts:183-225)",
      "status": "verified"
    },
    {
      "assumption": "context is the only shipped instrument with a bar and today declares exactly FOUNDATIONAL_OPTIONS (context.ts:13-17; tests/instrument.test.ts:80-92)",
      "status": "verified"
    },
    {
      "assumption": "Delta files replace modified requirements whole, so scenarios retained unchanged in the deltas are deliberate (verified by diffing against the living spec sections)",
      "status": "verified"
    },
    {
      "assumption": "The over-four warning fires on written entry count rather than eligible (at-or-below-100) count",
      "status": "unverified"
    },
    {
      "assumption": "Documentation updates are deferred to a docs pass and never block the feature (standing ruling cited in michael-orientation)",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "taiknr registers an instrument with `bar` and no `options` (or `options: [fill]` only); the user writes `thresholds` for it in pi-jefferson.json. Ruling: refused, default bar. Delta text: accepted; ADDED requirement: the declaration itself violates a MUST with no stated consequence.",
      "finding": "The delta makes `thresholds` and `fill` automatic for any declaration carrying `bar` and forces every bar declaration to list both, erasing the ruled opt-in. The MODIFIED requirement says a provided instrument takes them 'when its declaration carries `bar`' with no mention of `options`, while its own scenario requires `options: [thresholds, fill]`; the ADDED declaration requirement says a declaration carrying `bar` MUST declare both options, with no home for a provider that opts out; and the ADDED state requirement opens 'An instrument whose declaration carries `bar` MUST take a `thresholds` option', unqualified by origin or opt-in.",
      "id": "struct-1",
      "location": "openspec/changes/bar-thresholds/specs/statusline/spec.md — ADDED 'A threshold sets the instrument's state at a percentage' (opening line), ADDED 'A declaration that can draw a bar declares the two options', and MODIFIED 'A provided instrument takes only the options Jefferson implements'",
      "rationale": "The binding ruling is opt-in by name — 'a provider writes options: [thresholds, fill]... That's exactly it' and 'A provider that does not opt in draws the default bar' (owner-rulings.md, 2026-11-25) — and michael-orientation S3 reads 'the two options are separate opt-ins'. The proposal itself says 'Providers opt in by name', but its first What-Changes bullet ('An instrument whose declaration carries bar accepts a thresholds list') carries the same blanket phrasing the delta inherited and worsened. As written the spec would enshrine contract behavior the owner refused, and the two requirements contradict each other and the scenario beside them.",
      "recommendation": "State the opt-in once: a provided instrument takes `thresholds` and `fill` only when its declaration carries `bar` and names each in `options`, each a separate opt-in. Scope the 'MUST declare both' invariant to shipped declarations only, and soften the state requirement's opener to 'an instrument whose declaration carries `bar` and offers `thresholds`'. Scope the acceptance scenario to an opted-in provider and add the refused case (bar without opt-in given `thresholds`/`fill` in the instruments block → that instrument alone is refused).",
      "severity": "blocking"
    },
    {
      "concrete_case": "The `instruments` block gives `taiknr:saved` (no bar) a `thresholds` list. Actual ruled behavior: only that instrument is refused with a warning; the rest of the document renders as configured. The scenario as written says the whole document is rejected and the default row renders.",
      "finding": "The scenario claims 'the document is rejected, the default row renders' for any instrument given `thresholds` without a bar, but that is the Jefferson-owned outcome only. A provided instrument given such a key is refused alone (inherited ruling J1(b)); the delta's own 'A malformed threshold rejects the settings' requirement correctly distinguishes the two origins.",
      "id": "struct-2",
      "location": "openspec/changes/bar-thresholds/specs/statusline/spec.md — ADDED 'A declaration that can draw a bar declares the two options', scenario 'An instrument without a bar'",
      "rationale": "Fault containment for provided instruments is a binding standing rule, and a spec scenario that states the wrong rejection scope will drive the wrong test and the wrong warning path. The same requirement already straddles both origins (its first scenario inspects shipped declarations only), so its document-level scenarios must say which origin they mean.",
      "recommendation": "Scope the scenario to Jefferson's own instruments, or split it per origin mirroring the malformed-threshold requirement's wording ('the whole document for Jefferson's own instrument, that instrument alone for a provider's').",
      "severity": "major"
    },
    {
      "concrete_case": "`thresholds` carries six entries of which two have `activeAt` above 100, leaving exactly four honourable. The ruling ('defines more than 4') and proposal ('more than four entries') say the warning fires; the requirement's clauses can be read to say it does not.",
      "finding": "'More than four thresholds MUST load with one warning' does not say whether the count is of entries written or of entries at or below 100, while the same requirement also rules that an above-100 entry MUST NOT take one of the four places. The ruling and the proposal both lean to written count, but the spec — the home of the observable behavior — can be read both ways.",
      "id": "struct-3",
      "location": "openspec/changes/bar-thresholds/specs/statusline/spec.md — ADDED 'Only the four lowest thresholds are honoured'",
      "rationale": "An unpinned warning trigger invites drift between the settings reader, the watch path and the tests, and the warning is operator-visible wording that must be identical whichever moment checks the instrument (proposal open question on the one warning path).",
      "recommendation": "Pin the trigger in the requirement (e.g. 'more than four entries written') and add a scenario for the mixed case (five written, one above 100) stating whether the warning fires and which four apply. Owner question 1 below asks Joel to confirm the trigger.",
      "severity": "minor"
    },
    {
      "concrete_case": "A document carries two entries with `activeAt` 110. Reject rule: the settings are rejected. Above-100 rule: the settings load and the entries apply nothing. No clause states which wins.",
      "finding": "Two rules with no stated precedence cover a duplicate `activeAt` above 100: the malformed-threshold requirement says two thresholds sharing one number MUST reject the settings, while the same requirement (and the four-lowest requirement) says a whole number above 100 MUST load and apply nothing.",
      "id": "struct-4",
      "location": "openspec/changes/bar-thresholds/specs/statusline/spec.md — ADDED 'A malformed threshold rejects the settings' vs 'Only the four lowest thresholds are honoured'",
      "rationale": "The duplicate ruling was answered without a range qualifier, and the above-100 ruling was answered without a duplicate qualifier, so the intersection is genuinely unruled; leaving it to whichever check runs first makes the outcome depend on reader order rather than a rule.",
      "recommendation": "Pick one semantics and say it in the requirement (the unconditional duplicate rule supports reject, the literal reading), or get a ruling; owner question 2 below asks Joel.",
      "severity": "minor"
    },
    {
      "concrete_case": "A provided instrument declares `options: [formats, thresholds, fill]` with `composed`; the top-level settings carry `formats: {busy: '…', done: '…'}` and a threshold at 70 sets `formats: {busy: '⚠ …'}`. At 70, does `done` survive? The spec does not say.",
      "finding": "A threshold entry may carry 'any option the instrument declares', which for an opted-in provider includes `formats`, but the layering requirement rules only `style` and `fill` key by key. Whether a threshold's `formats` layers by kind or replaces the set whole — and the same for any future object-valued option — is stated nowhere in the spec.",
      "id": "struct-5",
      "location": "openspec/changes/bar-thresholds/specs/statusline/spec.md — ADDED 'A threshold sets the instrument's state at a percentage' and ADDED 'A threshold's state changes only the keys it names'",
      "rationale": "The spec is the home of observable behavior, and this is a case the delta's own requirements admit; the proposal correctly lists it as a design open question, but a design ruling made later will land in code with no spec to pin it, and the two candidate semantics produce visibly different renders.",
      "recommendation": "Once the owner or design rules the depth, add it to the layering requirement (or a dedicated scenario) in this change's delta rather than leaving the spec silent; until then the proposal's open question is the only record, which is the right altitude for now but must not survive the design stage.",
      "severity": "minor"
    },
    {
      "concrete_case": "A reader auditing what Jefferson checks for a provided instrument reads 'shape, format, label, option, formats, variable, modifier and style' and concludes thresholds are unchecked; a provider's malformed `activeAt` then looks like a gap when the operative 'everything' in fact covers it.",
      "finding": "The requirement enumerates what Jefferson checks under a provided name as 'shape, format, label, option, formats, variable, modifier and style'; thresholds and fill add whole new check categories to that path, and the enumeration is not extended by this change's delta.",
      "id": "struct-6",
      "location": "openspec/specs/statusline/spec.md:1851-1858 — 'A provided instrument's settings are checked once both are in hand' (untouched by the delta)",
      "rationale": "The operative MUST is 'everything under a provided name's key', which covers thresholds and fill, but the enumeration reads as a closed list and the change adds the largest new check surface that requirement has seen; one home for the fact 'what is checked for a provided instrument' argues for keeping the enumeration true.",
      "recommendation": "Extend the enumeration in this change's delta (e.g. '… modifier, style, thresholds and fill'), or confirm the enumeration is illustrative and leave it; either way the decision should be deliberate, not silent.",
      "severity": "minor"
    },
    {
      "concrete_case": "A reader of the shipped `context` declaration's options after this change finds five options where `docs/instruments.md` says every instrument takes three, and `tests/instrument.test.ts` fails on the options pin — neither surface appears in the Impact list that claims to enumerate what the change falsifies.",
      "finding": "The Impact list of documentation the change makes false omits `docs/instruments.md` ('Every instrument takes three options', options section at :27-29), which becomes false when `context` gains `fill` and `thresholds`; the tests note also omits the shipped-options pin at `tests/instrument.test.ts:80-92`, which asserts `options.slice(3)` is `[]` for every instrument except `notice` and must change (michael-orientation T7 names it).",
      "id": "struct-7",
      "location": "openspec/changes/bar-thresholds/proposal.md — 'Impact', final two bullets (docs and tests)",
      "rationale": "Docs are deferred to a docs pass under the standing ruling, but the proposal presents its Impact inventory as the complete list of surfaces the change falsifies; an incomplete inventory invites the docs pass and the task list to miss them.",
      "recommendation": "Add `docs/instruments.md` to the documentation list and name the shipped-options pin in the tests bullet (or fold both into the docs pass explicitly, saying the list is not exhaustive).",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "No design.md or tasks.md exist yet, so module placement could not be audited: the one threshold reader for both settings paths (T6), the over-four warning's single home (T4), state selection inside the provider boundary (T3), per-state binding of segments/label/fills (T2), and where the 70/90 defaults live are design-stage and were only read as open questions.",
    "openspec validate --strict was not run against the change directory.",
    "The brain card itself was not read; plan-context.md's quotations of its acceptance criteria were taken as given.",
    "pi 1.4.0's footer source lines in node_modules were not re-verified; the pi-parity provenance was taken from michael-orientation D2.",
    "Docs beyond the targeted greps (README.md, docs/configuration.md, docs/formats.md, docs/instruments.md, ARCHITECTURE.md) were spot-checked only; other pages may hold further stale claims."
  ],
  "owner_questions": [
    {
      "options": [
        "The warning fires whenever more than four entries are written, whatever their activeAt values",
        "The warning fires only when more than four entries sit at or below 100"
      ],
      "question": "When more than four thresholds are written but fewer than five are at or below 100 (the rest above 100), does the over-four warning fire?",
      "recommended_option": "The warning fires whenever more than four entries are written, whatever their activeAt values",
      "why": "Your ruling words it as 'someone defines more than 4' and 'all those beyond the 4 lowest threshold numbers are ignored', and the proposal says 'more than four entries'; the alternative makes the warning depend on a derived count the user cannot see as easily."
    },
    {
      "options": [
        "Reject the settings, as any duplicate does",
        "Load the settings and ignore both entries, as above-100 entries apply nothing"
      ],
      "question": "Two thresholds share an activeAt above 100 (say 110 twice). Does that reject the settings, or load and ignore both?",
      "recommended_option": "Reject the settings, as any duplicate does",
      "why": "The duplicate ruling was answered without a range qualifier and reads unconditional, while the above-100 rule was answered without a duplicate qualifier; rejecting keeps one rule for duplicates instead of an exception carved by range."
    }
  ],
  "paraphrase_existing": "Jefferson renders a footer of rows of instruments, each declared once with its name, variables, defaults and options; user settings live in the `instruments` block of `pi-jefferson.json`, validated against the declaration, with a fault in Jefferson's own settings rejecting the whole document and a provided instrument's fault refusing that instrument alone. `context` is today the only shipped instrument with a `bar`, whose visual lives in `components/visuals/bar.ts` and colours its fill `warning` strictly above 70 and `error` strictly above 90 (a rule copied from pi's own footer), drawing a `dim` track otherwise. Provided instruments register over the event bus and take only the options Jefferson implements, `formats` via a declared opt-in.",
  "paraphrase_proposes": "The change makes a bar's state a user setting: an instrument declaring `bar` takes a `thresholds` list (integer `activeAt` 0-100, at most the four lowest honoured with one warning, malformed or duplicated `activeAt` rejecting the settings) and a new `fill` option sharing `style`'s shape that styles the fill alone. The highest `activeAt` at or below the bar's raw reading (unknown counts as 0) sets the state, layering `style` and `fill` key by key over the top level; the 70/90 defaults stay but flip to `>=` (breaking, retiring pi parity in an ADR), a configured list replaces them whole, and `[]` disables colouring. Providers opt in by naming `thresholds` and `fill` in `options`; the state decides the instrument's width, and the rule that a variable the format leaves out is never resolved is amended so state-choosing may read `$bar`'s value. `bar.ts` keeps only the drawing; the thresholds become the instrument's setting.",
  "recommendation": "Proceed to design only after fixing the delta's provider wording: struct-1 (the opt-in-by-name ruling must be restored across the three affected requirements) is blocking, and struct-2 (rejection scope for a provided instrument without a bar) must land with it. Pin the two edge semantics (over-four warning trigger, duplicate activeAt above 100) and close the threshold-formats depth gap in the spec once ruled. Otherwise the structure is sound: the threshold rules are homed once in the statusline delta, the defaults and malformed rules each have a single home, exactly the two affected capabilities carry deltas, and the extension-source-layout delta correctly relocates the threshold home off the visual while keeping the visual's import constraint intact."
}