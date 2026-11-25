{
  "mode": "council",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Go ahead, but tighten two specs first. The statusline delta is sound, apart from small wording fixes. The instrument-registration delta does not yet pin what an author sees when a provider's default format names a bad colour. It must say how far the refusal reaches (the whole registration, as today), that it is the same for both load orders, and that it fires with no configuration file. A provider's colour function must also stop being called, and stop drawing warnings, when the format's colour covers its variable. The design must close the path where the bind is stricter than the check that admitted a provider, which today can make session start throw (T3). The likeliest fix is to parse a declaration once when it is admitted and keep that parse, with the colour check passed in as a required parameter.",
  "findings": [
    {
      "id": "C1",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md, \"A provider's default format is checked against the theme\"; extensions/jefferson/registration-listener.ts vetRegistration (first fault refuses the whole registration); startup.ts:39-47",
      "finding": "The delta never says how far a refusal reaches, or when it happens, once part of the check needs a theme. A registration can arrive before any theme exists, so the outcome can follow load order, which D14 forbids.",
      "rationale": "Today `vetRegistration` refuses the whole registration at its first fault: sibling instruments, `fields.declare` and every later report (`report-no-registration`) go with it. A theme exists only as `ctx.ui.theme` (`dist/core/extensions/types.d.ts:178-179`), and the listener runs at load. The scenario \"nothing from that instrument renders, and the rest of the row renders as configured\" fits both a whole-registration refusal and a refusal of that instrument alone. The registry has no way to take one extension's registration back (`registration.ts`: only `clearProvided`).",
      "concrete_case": "Provider P registers `a` with default format `$saved|notacolour` and a sibling `b`, and reports `saved`. Suppose the colour half is deferred until Jefferson's `session_start`. If P's handler runs after Jefferson's, the theme is in hand, the whole registration is refused, and `b` and the reports are refused too. If P's handler runs first, `a` and `b` are accepted, the fields are declared, and the reports are kept. The later check can then refuse at most `a`, because nothing can undo `b` or the fields. The same document shows `b` in one load order and not in the other.",
      "recommendation": "State in the delta that the refusal is the same whole-registration refusal as today: siblings, fields and reports. Add one scenario for each load order (provider handler before and after Jefferson's) with the same expected outcome. The design should then hold every provider registration, and the reports that follow it, until a theme is in hand and vet them in arrival order, or justify a retraction path. It should weigh holding them against reading pi's internal global theme symbol, which is not API and is ruled out by D9's no-pi-internals spirit and by `peerDependencies: *`."
    },
    {
      "id": "C2",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md, scenario \"A default format naming a name the theme does not have\"; configuration.ts readConfiguration (early returns for an absent or unparseable file, and the RejectedConfiguration catch)",
      "finding": "Only the case where a document names the instrument has a scenario. The requirement's \"whether or not a document names the instrument\" has none. A check attached to the configuration read would never run on three real paths.",
      "rationale": "`readConfiguration` returns the default row before `normalizeDocument` when the file is missing or its JSON does not parse. A rejected document returns from the catch. In all three cases no watch is registered and nothing checks a provided declaration. Today the refusal happens at registration and does not depend on the document.",
      "concrete_case": "A user has no `pi-jefferson.json`. Provider P ships `defaultFormat: \"$saved|notacolour\"`. Today P's registration is refused with one warning. With a check attached to the read, P registers silently, and the author never hears about the misspelling. The same happens with a document that fails to parse, or one rejected for an unrelated typo.",
      "recommendation": "Add scenarios to the delta for a missing configuration file and for a rejected document, each still giving the refusal and its warning. The design should run the colour check in the registration path, once a theme is in hand, and never in `normalizeDocument`."
    },
    {
      "id": "C3",
      "severity": "major",
      "location": "components/instruments/instrument-binding.ts instrumentBindings (`parseFormat(declaration, declaration.defaultFormat)` at bind); configuration.ts normalizeDocument `bind` (containProvided wraps after `binding(declaration)`); configuration.ts readConfiguration rethrow",
      "finding": "A provider can be admitted by a check that is more lenient than the parse at bind, and that parse runs outside `containProvided`. Any such mismatch turns a bad name into a throw that fails Jefferson's `session_start` (Michael's T3). Making the theme a parameter adds a new way to get the mismatch.",
      "rationale": "`bind` evaluates `binding(declaration)` before `containProvided` wraps it, and `readConfiguration` rethrows anything that is not `RejectedConfiguration`. If the colour predicate is optional, or has a lenient default at one site, the admission check and the bind check can disagree.",
      "concrete_case": "A design accepts names whose colour check is pending at registration, and binds with the theme. A row places `p.saved`, which has no `instruments` entry and the default format `$saved|notacolour`. The parse at bind throws `format names a modifier it does not implement`, `readConfiguration` rethrows, and pi reports a failed `session_start` with no footer. The reverse happens too: if `parseFormat`'s theme or predicate argument is optional and the bind site leaves it out, the bind rejects `$saved|toolDiffAdded`, which registration accepted, and session start fails the same way.",
      "recommendation": "Require that no format is parsed more strictly than the check that admitted it. The simplest way: parse each default format once, when it is admitted, and keep the segments on the adapted declaration so the bind reuses them. This also gives O1's \"parsed once per read\". If `parseFormat` takes the colour check, make it a required parameter so `tsc` lists all 42 test sites and every production site. Prefer a narrow predicate (`isForegroundColour(name): boolean`) over a `Theme`, so `format.ts` stays independent of the host and O2's single home for the check is that predicate's adapter."
    },
    {
      "id": "C4",
      "severity": "major",
      "location": "specs/statusline/spec.md, \"The colour a format names is the strongest colour\"; openspec/specs/instrument-registration/spec.md, \"Provider code costs one entry and no more\", scenario \"A colour the theme does not have\"; format.ts resolveFormat (variableFg is called for every declaring variable)",
      "finding": "No delta states what an author will observe once a format's colour covers a variable: the provider's `variableFg` is not called, so a fault in it draws no warning. The standing scenario still reads as if the warning is always due.",
      "rationale": "Under D4 and D16 (only what is shown is resolved), the built-in colour function must not run when the format's colour wins (T5). An author can see the warning appear or not, so this belongs in the spec, not only in the design (standard §1). As written, a test author could keep the warning and still satisfy every scenario.",
      "concrete_case": "A provider's `variableFg.saved` throws, and the user writes `$saved|accent`. Today the warning \"its colour threw\" appears once per session. After the change, the text renders in `accent` and, by T5, no warning should appear. The standing scenario \"A colour the theme does not have\" (a fault reported once) says nothing about this case.",
      "recommendation": "Add a scenario to the instrument-registration delta: when a format's colour covers a variable, that variable's colour function is not called and none of its faults is reported. Add the matching statusline scenario for `$level|accent`: the thinking instrument's built-in colour is never consulted."
    },
    {
      "id": "C5",
      "severity": "minor",
      "location": "proposal.md \"A bad name is a refusal, at read time\" and michael-orientation.md S10; specs/instrument-registration/spec.md scenario 2; configuration.ts checkProvidedSettings `settings-parse` part; registration-listener.ts `unparseable-default-format` part",
      "finding": "The artifacts disagree about the warning text. S10 keeps today's registration warning. The delta scenario wants the warning to name the bad name. The proposal claims a provided instrument's warning names the name, but today's `settings-parse` warning does not.",
      "rationale": "Today's parts are `carries a default format Jefferson cannot parse` and `is configured with a format Jefferson cannot parse`. Neither quotes the modifier. Only Jefferson's own instruments pass `error.message` through. One rule is stated three ways (standard §1).",
      "concrete_case": "An implementer keeps today's `unparseable-default-format` part to satisfy S10. The new scenario \"the warning names the instrument and the name\" then fails. Changing the part to satisfy the scenario breaks S10, and the scenarios in `tests/registration.test.ts` that match today's text.",
      "recommendation": "Settle this in O4 and state it once in a delta. Either the provided-settings warning and the registration warning quote the offending name (a MODIFIED scenario in each spec), or S10 and the new scenario both say today's wording stands and the proposal drops the claim."
    },
    {
      "id": "C6",
      "severity": "minor",
      "location": "specs/statusline/spec.md, \"A style modifier only sets an attribute on\", scenario \"A color is not a modifier\"",
      "finding": "The kept scenario title now contradicts its own body. The body shows a colour working as a modifier.",
      "rationale": "Scenario titles are how the suite and future readers find a rule. A title that says the opposite of its THEN points the next change at the retired rule (T10's risk, the other way round).",
      "concrete_case": "A reader searching the spec for whether `|accent` is allowed finds \"A color is not a modifier\" and decides it is refused, while the body says it renders in `accent`.",
      "recommendation": "Rename it to something like \"A colour sets no attribute\". The MODIFIED block already replaces the scenario, so renaming it costs nothing."
    },
    {
      "id": "C7",
      "severity": "minor",
      "location": "specs/statusline/spec.md, \"The colour a format names is the strongest colour\", scenario \"A colour over the style\"",
      "finding": "The scenario never names the format's colour, so a test can satisfy it with the same colour the `style` uses. The test would then pass whichever colour wins.",
      "rationale": "This precedence is the inversion D4 rules on, and the code does the opposite today (T5). The scenario that pins it must tell the two colours apart.",
      "concrete_case": "A test uses `style: {\"fg\": \"accent\"}` and `$model|accent`. It passes even if the format colour were ignored, because both give `accent`.",
      "recommendation": "Make it concrete: `style: {\"fg\": \"accent\"}`, format `$model|warning via`. The value renders in `warning`, and `via` renders in `accent`."
    },
    {
      "id": "C8",
      "severity": "minor",
      "location": "specs/statusline/spec.md, \"A colour's name is the theme's own\" (\"drawn with the colour the theme current at render time gives that name\"); format.ts styledPiece; configuration.ts normalizeDocument (Jefferson's own instruments are not wrapped)",
      "finding": "A name is checked against the theme at read time and drawn with the theme at render time. A theme switch does not re-read the document, and neither spec nor proposal says what happens when the render theme lacks a name.",
      "rationale": "`theme.style` throws `Unknown theme color` for a missing name (research-chidi §2). Jefferson's own instruments render unwrapped. Safety rests on the name set being the same across one pi process (D13, T1). That was measured on the three built-in themes at pin 1.4.0 only, while `peerDependencies` is `*`. A configured `style.fg` token has the same exposure, so this extends a known risk rather than creating a new one.",
      "concrete_case": "On a future pi where a user theme may leave out a foreground token without a fallback, `$model|scrollbarThumb` passes at read under `dark`. After `/theme` switches to that user theme, `theme.style` throws inside the footer render, and the whole footer fails rather than one instrument.",
      "recommendation": "In the design, state the dependence on the invariance as a cited assumption (D13, T1, theme.js:133), and give the operator's trigger: re-measure it on every pi bump, beside the existing `resources_discover` pin note in startup.ts. Add no render-time guard unless the design also adds one for `style.fg`."
    },
    {
      "id": "C9",
      "severity": "minor",
      "location": "specs/instrument-registration/spec.md requirement (\"the theme a render will read\") vs specs/statusline/spec.md \"A colour's name is the theme's own\" (\"the theme the host hands the extension\")",
      "finding": "One rule, which theme a name is checked against, is stated twice in different words. They name different objects: the footer factory's render theme, and `ctx.ui.theme` at the read.",
      "rationale": "Standard §1 requires each rule to be stated once. The two objects can differ after a theme switch, so the wording hides a real choice the design has to make.",
      "concrete_case": "An implementer reads \"the theme a render will read\" and waits for the footer factory's `theme`. The factory runs only after `installFooter`, which is after the read. That rules out the registration-time check that C1 and C2 need.",
      "recommendation": "State it once, in the statusline requirement, as \"a theme the host hands the extension\" (any one will do, since the name set is the same across the process). Have the registration requirement point to that requirement."
    }
  ],
  "assumptions": [
    {
      "assumption": "A pi theme reaches an extension only through `ctx.ui.theme` and through render-factory arguments. `ExtensionAPI` carries none at load.",
      "status": "verified"
    },
    {
      "assumption": "At registration, the first fault refuses the whole registration: sibling declarations and `fields.declare`. After that, reports from that extension are refused as `report-no-registration`.",
      "status": "verified"
    },
    {
      "assumption": "`readConfiguration` returns before `normalizeDocument`, and so registers no watch, when the file is missing or its JSON does not parse. A rejected document also registers none.",
      "status": "verified"
    },
    {
      "assumption": "The registry has no way to remove one extension's registration. Only `clearProvided` exists, and it clears every provider.",
      "status": "verified"
    },
    {
      "assumption": "pi-tui's `parseColor` accepts no string made only of the characters a `|name` may hold (only a `#` hex value, `oklch()`/`okhsl()`, or a number). A shared check that keeps validateStyle's parseColor fallback therefore cannot let a raw colour in after `|`.",
      "status": "verified"
    },
    {
      "assumption": "No pi event gives an extension a `ctx` with a theme before every other extension's `session_start` handler runs.",
      "status": "unverified"
    },
    {
      "assumption": "The foreground name set is the same for every theme in one pi process, user themes and pi versions other than 1.4.0 included.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "A provider's default format names a colour the theme does not have. Should that refuse the provider's whole registration, as any default-format fault does today, or only that instrument?",
      "options": [
        "The whole registration, as today: sibling instruments, fields and reports are refused, and the outcome is the same in either load order.",
        "That instrument alone: siblings and fields stay, which changes what extension authors see today."
      ],
      "recommended_option": "The whole registration, as today: sibling instruments, fields and reports are refused, and the outcome is the same in either load order.",
      "why": "It keeps S10 and the published refusal behaviour that `docs/extension-authors.md` describes. Under D14 the design has to hold registrations until a theme is in hand (C1). Refusing that instrument alone would be a change to the contract that Michael §4 says goes to Joel."
    }
  ],
  "not_checked": [
    "The line numbers the docs pass lists (`docs/formats.md`, `docs/notices.md`, `docs/extension-authors.md`, `ARCHITECTURE.md`, `AGENTS.md`)",
    "tests/registration.test.ts and tests/format.test.ts assertions beyond what Michael and Eleanor cite",
    "thinking.ts's built-in colour function and its theme use",
    "Behaviour in a live pi session across a theme switch or `/reload`",
    "Whether pi's global theme exists when extensions load (the internal-symbol alternative)"
  ]
}