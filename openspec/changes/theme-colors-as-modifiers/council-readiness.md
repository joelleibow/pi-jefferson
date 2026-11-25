{
  "mode": "council",
  "lens": "council-readiness",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "The change is safe for stored data, because nothing is persisted or migrated, and it is safe for every format that works today. The gaps are in the provider-registration path and in version skew and rollback. (1) The delta contradicts itself about whether a bad colour in a provider's default format refuses the whole registration or only that instrument. (2) Order-independence (D14) and the uncontained bind-time throw (T3) have no scenario pinning them. (3) The spec requires warnings that name the offending name, and the warnings the code emits today for provided instruments cannot name it. (4) An extension author who ships a colour, or a user whose settings file uses one, breaks whole documents and whole registrations on an older Jefferson or pi. Nothing marks that, and no check can detect it. (5) Several scenarios have no provable test or owner (source inspection, faint colour, real slot table). I recommend settling F1 with Joel before design, and writing F2, F3, F5 and F6 into the delta so tasks can name a test for each scenario.",
  "findings": [
    {
      "id": "RD-01",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md, requirement and scenarios 2 and 3; instrument-registration.registration-listener.ts:142-146 and instrument-binding.ts:236-240",
      "finding": "The delta says two incompatible things about a bad colour in a provider's default format. The requirement says a default format that draws a refusal today MUST draw it still, whether or not a document names the instrument. Scenario 2 conditions the warning on a document naming the instrument, and says only that instrument renders nothing while the row renders as configured. Today an unparseable default format refuses the whole registration: `vetRegistration` returns one refusal, so every sibling instrument of that extension and its declared `fields` are refused with it. A misspelt colour is such a refusal today. The spec never says whether the bad colour still takes the whole registration or only the one instrument.",
      "rationale": "A coder cannot choose, because the two readings change what an extension author sees. Michael's orientation §4 already flags that moving the check to the configuration read alters a published behaviour and belongs to Joel. The delta must pick one outcome. The choice also decides whether a registration accepted before any theme exists can be retracted afterwards. The listener has no theme; the first one is `ctx.ui.theme` at Jefferson's `session_start`.",
      "concrete_case": "Extension `acme` registers `savings` (default format `$saved|notacolour`) and `budget` (valid), posting from its own `session_start` before Jefferson's. Today, both instruments and all of acme's fields are refused with one warning, whatever the document says. Under scenario 2, `budget` registers and works, and `savings` warns only if a row or the `instruments` block names it. An author who never places it hears nothing.",
      "recommendation": "Settle it with Joel (see owner_questions). Then rewrite the requirement and scenarios 2 and 3 to state the unit refused (instrument or registration), the unit warned about, and whether an unplaced instrument is warned about."
    },
    {
      "id": "RD-02",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md requirement text 'MUST NOT depend on the order'; configuration.ts:239-280, 487, 505-520, 584-595; instrument-binding.ts:283",
      "finding": "D14 (outcome independent of registration order) and Michael's T3/T4 have no scenario in the delta. Four conditions are unpinned. The instrument may register before or after the read. It may be placed by a row, named only in the `instruments` block, or named nowhere. A bad colour must not escape the bind as an uncontained throw: `readConfiguration` rethrows anything that is not `RejectedConfiguration` (configuration.ts:584-595), so session start would fail.",
      "rationale": "The spec carries the MUST but no scenario, so no test is required to prove it. Michael measured that the bind-time parse at instrument-binding.ts:283 is evaluated before `containProvided` wraps the result, and that it throws today if a bad format reaches it. Moving the colour check off registration removes the guard that makes this unreachable.",
      "concrete_case": "A declaration is accepted with default format `$x|notacolour`. A row places it, and there is no `instruments` entry. `bind` re-parses the default and throws `format names a modifier it does not implement`. The error escapes `readConfiguration` and session start fails.",
      "recommendation": "Add scenarios for the matrix (registered before the read / after the read, crossed with row-placed / block-only / unnamed), each stating the same outcome. Add one stating that a bad default format never fails session start. Tasks can then name one failing test per cell, driven through the session harness in `tests/registration.test.ts`."
    },
    {
      "id": "RD-03",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md scenario 2; specs/statusline/spec.md 'A background colour' and 'A name the theme does not have'; configuration.ts:170-177 and 143-148 (checkProvidedSettings); registration-listener.ts:142-146",
      "finding": "The spec requires warnings that name the offending name, but the warnings the code emits today for provided instruments cannot name it. For provided instruments, a settings-parse fault emits the fixed text `is configured with a format Jefferson cannot parse` (kind `settings-parse`), with no modifier. A default-format refusal emits `carries a default format Jefferson cannot parse`, also with no modifier. Only the own-instrument path forwards the parser's message, which does name the modifier. The proposal says a provided instrument's warning 'names the instrument and the name' (S9), and scenario 2 says 'the warning names the instrument and the name'.",
      "rationale": "Satisfying the spec forces the coder to change the fault shape for provided instruments. That includes choosing wording, whether the kind stays `settings-parse`, and how the parse error's modifier reaches `checkProvidedSettings` and the registration refusal. O4 leaves wording to the design, but the structural change needed to name the name is not listed in the proposal's Impact. Existing tests pin the current texts, and `tests/registration.test.ts:1983-1986` pins `{ refused: \"unparseable-default-format\" }`.",
      "concrete_case": "A provided instrument has the settings entry `{\"format\":\"$saved|acccent\"}`. `checkProvidedSettings` returns the generic text with no `|acccent` in it. The spec scenario is not met.",
      "recommendation": "State in the delta, or in the design, the exact shape for provided-instrument parse faults. It should carry the modifier name, and the existing `settings-parse` and `unparseable-default-format` kinds should either be extended or kept and enriched. Add `registration.test.ts` and `configuration` expectations for the named modifier. Mark which existing warning-text tests are legitimately rewritten by this delta."
    },
    {
      "id": "RD-04",
      "severity": "major",
      "location": "proposal.md 'Release' and 'Nothing that works today changes'; docs/extension-authors.md:310",
      "finding": "Version skew and rollback are not addressed. 'Nothing that works today changes' covers only the upgrade direction. Nothing is said about running an older Jefferson against input written for this one. (a) A user's settings, or a trusted project's `.pi/pi-jefferson.json` shared in a repo, that use `|colour` make an older Jefferson reject the whole document for Jefferson's own instruments, and the footer falls back to the default row. (b) An extension author who ships a colour in a default format has every one of their instruments, and their fields, refused by an older Jefferson, because registration is refused as a unit. The published contract has no version or capability marker an author could check. The proposal states 'no contract change' and calls the release a minor.",
      "rationale": "This is a feature-gated input that older consumers refuse loudly but wholesale, and a revert of Jefferson has the same effect on any file already edited. No data migrates, so the exposure is limited to warnings and fallbacks, but extension authors share the blast radius.",
      "concrete_case": "A team's repo pins `.pi/pi-jefferson.json` with `\"$model|toolDiffRemoved\"`, and one teammate is still on the previous Jefferson. That teammate's footer silently becomes the default row, with a warning. Separately, an author publishes `acme` with a coloured default format. Every user on the previous Jefferson loses all of acme's instruments with one warning.",
      "recommendation": "In design.md's Migration Plan, record both directions. Have the docs pass (Bambadjan, not tasks.md) state that colours need this release, name the earlier-release behaviour for authors, and suggest an author gate on it with a conservative default format, or accept the refusal. If Michael or Joel want a capability signal, that is an owner decision; otherwise state that none exists."
    },
    {
      "id": "RD-05",
      "severity": "minor",
      "location": "specs/statusline/spec.md 'A name's colour is the theme's own'; proposal.md S1; package.json peerDependencies '*'; configuration.ts source.theme (startup.ts:121)",
      "finding": "Which names are colours depends on the pi the user actually runs. The peer is `*`, but the facts were measured on pinned pi 1.4.0. A pi upgrade that renames or removes a foreground token (or a downgrade to a pi without `thinkingMax`, `bashMode` or the scrollbar tokens) turns a previously accepted colour into a rejected name, and for Jefferson's own instruments that rejects the whole document at the next read. The spec also defines acceptance as 'the accessor accepts the name'. It does not say what the probe does if a pi version's `getFgAnsi` returns `undefined` or a non-string instead of throwing.",
      "rationale": "The existing `validateStyle` has the same exposure, so this is consistent with precedent. But the new surface is the format string, where a typo-tolerant accessor would silently accept any word, and a background name could pass. Only the pinned pi was measured.",
      "concrete_case": "On a hypothetical pi whose `getFgAnsi(unknown)` returns `undefined` instead of throwing, `$model|acccent` would parse as a colour and `theme.style` would later throw or render nothing.",
      "recommendation": "Specify that a name is a colour only when `getFgAnsi` returns a string without throwing. State in the docs, not as a list, that names follow the running pi's theme documentation. Add a unit test with a fake accessor that returns `undefined`, so the rule is shown catching a wrong accessor."
    },
    {
      "id": "RD-06",
      "severity": "major",
      "location": "specs/statusline/spec.md 'The colour a format names is the strongest colour'; proposal.md ('Impact', T5); format.ts:269-275; instrument-binding.ts:186-206",
      "finding": "Michael's T5 says the built-in colour function (`variableFg`) must not run when a format colour covers the segment. Otherwise a provider's `variableFg` that faults records a warning for a colour the user replaced. No scenario in the delta states this. The requirement lists only the visible precedence, and 'A colour over the style' covers style, not the built-in colour. Today `variableFg` is called for every variable segment that declares one.",
      "rationale": "Without a scenario there is no named test, and a coder can satisfy the visible precedence while still calling the resolver and recording a spurious fault. This is the same principle as D16 (only what the format names is resolved).",
      "concrete_case": "A provider's `variableFg.level` throws or returns a non-token. The format is `$level|accent`. The segment renders in `accent`, which satisfies the visible spec, but a fault warning about `variableFg` is still recorded.",
      "recommendation": "Add a scenario to the statusline delta: when a format colour covers a segment, the instrument's built-in colour function is not called and records no fault. The test supplies a resolver that records its calls, a fake at an external boundary, and asserts none occurred."
    },
    {
      "id": "RD-07",
      "severity": "minor",
      "location": "specs/statusline/spec.md scenarios 'A name carried in a third place', 'No list of the theme's names', 'A faint colour'; tests/fake-theme.ts; tests/jefferson.test.ts:302",
      "finding": "Three scenarios have no provable test in the suite as it stands. 'A name carried in a third place' and 'No list of the theme's names' are source-inspection scenarios; the only inspection precedent is a comment-stripping check in `tests/jefferson.test.ts`, and the existing scenario 'A name carried in two places' has no test that reads source. 'A faint colour' cannot run on `fakeTheme`: it has no `muted` and no `dim` token, and its `style` goes through `styleTextWithAnsi` rather than pi's faint-token handling. The real slot table is proven only by Joel's live check (T11).",
      "rationale": "The standard fails a plan if a scenario is proven by no test and not marked as Joel's. The coder must not invent an inspection mechanism or add a test-only hook to production code.",
      "concrete_case": "The task for the faint colour says 'asserts the text renders faint', but `fakeTheme` cannot produce the faint SGR (`\\x1b[2m`) for `muted`, so the test would pass with no behaviour behind it.",
      "recommendation": "Mark the faint-colour scenario and the real-slot-table scenarios as Joel's to observe on pi's `system` theme in his own session. For the two source-inspection scenarios, either specify a concrete test (a scan of `extensions/jefferson` for the token names and for `readFileSync` use against theme paths, with a sample shown to fail it) or demote them to review checks, not tests. For the `dim` scenario, `foregroundOverrides: {dim: ...}` makes the fake theme carry a `dim` colour."
    },
    {
      "id": "RD-08",
      "severity": "minor",
      "location": "specs/statusline/spec.md 'A foreground colour of the theme is a modifier' and 'A colour's name is the theme's own'; tests/format.test.ts:259-264",
      "finding": "Boundary names are not stated. The probe's correctness rests on a Map lookup in pi's theme (`theme.js:117,212-216`), so inherited names like `constructor`, `toString` and `__proto__` cannot pass. No scenario or boundary is written for them, for a bare `|` with no name, or for a name containing a character the name run excludes. `tests/format.test.ts:259-264` asserts `|accent` is unknown, and `:383-404` assert the old unknown-modifier text for forms in the wrong place. Their expectations move with this delta, or with O4.",
      "rationale": "The test boundaries are discoverable, but a task that states 'none' or leaves boundaries to the coder fails the standard. The `fakeTheme` uses a Map, which makes `constructor` a faithful boundary case.",
      "concrete_case": "A format carries `$model|constructor`. A probe that looks the name up in an object literal would accept it; with pi's Map it is refused.",
      "recommendation": "Name the boundary set in the delta or the tasks: `constructor`, `toString`, `__proto__`, a background name (`selectedBg`), a case-different name (`Accent`), a form-named colour on a variable that declares that form, and an empty name after `|`. List which of the existing format tests are rewritten under this delta (T10)."
    },
    {
      "id": "RD-09",
      "severity": "minor",
      "location": "specs/statusline/spec.md requirement 'A foreground colour of the theme is a modifier', 'A colour after a form'; format.ts:103-117",
      "finding": "The lookup order is stated in the proposal (form, then Jefferson's own name, then colour, then rejection) but is only partly pinned in the delta. The scenarios test `|relative|accent` and `|dim`. None tests that a form wins over a colour of the same name on its own variable, or that a form is no longer a form once a modifier has come first, so the colour lookup is not tried for it. The proposal and Michael's T7 call the form shadow deliberate and documented.",
      "rationale": "This is the one place the new lookup could change an accepted format's meaning: a provider form named like a colour. Without a scenario, nothing proves the order, and the shadowing is documented only in the docs pass.",
      "concrete_case": "A provider declares `variableForms.price.accent` and a format has `$price|accent`. The form is selected, not the colour. After `$price|bold|accent`, `accent` is the colour, not the form.",
      "recommendation": "Add one scenario to the statusline delta for each of the two orderings. They make the coder's required test a stated behaviour rather than a guess."
    }
  ],
  "assumptions": [
    {
      "assumption": "No persisted data, schema or on-disk format changes, so migration is limited to settings files and provider registrations.",
      "status": "verified"
    },
    {
      "assumption": "Registration parses a provider's default format with no theme and refuses the whole registration on failure (vetRegistration returns one refusal for an extension).",
      "status": "verified"
    },
    {
      "assumption": "The bind-time parse in instrument-binding.ts:283 and the plain-format parses sit outside the provided-instrument containment, so a throw there reaches readConfiguration.",
      "status": "verified"
    },
    {
      "assumption": "The configuration reader takes its theme from ctx.ui.theme at session_start, and a theme switch does not re-read the document.",
      "status": "verified"
    },
    {
      "assumption": "Provided-instrument parse faults carry no modifier name today (settings-parse and unparseable-default-format texts are fixed).",
      "status": "verified"
    },
    {
      "assumption": "pi 1.4.0's foreground slot table is exactly 49 names and the probe via getFgAnsi matches it (taken from Michael's measurement and Chidi's research).",
      "status": "unverified"
    },
    {
      "assumption": "Foreground token names are invariant across themes within one pi process and across a theme switch (Michael re-measured on three built-in themes only).",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "When a provider's default format names a colour the theme does not have, what is refused, and is it refused when no document names the instrument?",
      "options": [
        "Keep today's contract: the whole registration is refused with a warning naming the instrument and the name, whether or not a document places it, by checking once a theme is in hand at Jefferson's session_start, and retracting any registration accepted earlier.",
        "Narrow it: only the offending instrument is refused. It warns when a row or the instruments block names it, and a never-placed instrument warns nobody.",
        "Narrow the unit but keep the warning unconditional: only the offending instrument is refused, but one warning always names the instrument and the name."
      ],
      "recommended_option": "Keep today's contract: the whole registration is refused with a warning naming the instrument and the name, whether or not a document places it, by checking once a theme is in hand at Jefferson's session_start, and retracting any registration accepted earlier.",
      "why": "The requirement and its scenarios contradict each other (RD-01). Michael's §4 says a design that cannot keep today's refusal alters a published contract and belongs to Joel. Keeping the contract also satisfies D3 and D14, and it keeps one outcome per name, whatever the order. If the check can run only after a registration was accepted, 'refuse' becomes 'retract', and that is a design cost Joel should weigh."
    }
  ],
  "not_checked": [
    "A live pi session across a theme switch, or a user theme that omits optional tokens (pi's fallbacks were read by Michael, not run).",
    "pi 1.4.0's theme.js and theme-tokens.js directly. I relied on Michael's and Chidi's measurements for the 49-name table and the Map-based lookup.",
    "The full text of registration.test.ts, configuration tests and docs; I read only the pinned lines I cite.",
    "Whether registrations posted after Jefferson's session_start can reach a theme at all. The listener holds none, and which context supplies one is the design's O1.",
    "Non-tui mode: session_start returns early there, so no theme is captured and no provider format is colour-checked. I did not trace whether any consumer depends on that.",
    "The ADR numbering and wording for the new ADR, and the docs pass lines Michael lists (S13)."
  ]
}