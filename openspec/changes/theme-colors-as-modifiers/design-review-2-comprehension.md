{
  "mode": "review",
  "lens": "council-comprehension",
  "paraphrase_proposes": "The design adds live-theme foreground names as pipe modifiers in formats, with reserved modifiers and variable forms taking priority. A format colour overrides the instrument’s own colour and configured foreground for that piece. Provider messages received before a theme exists are queued and then checked in order, so invalid default formats still refuse the whole registration. The design also forwards a parser error that quotes an unrecognized name and defers documentation changes to a separate pass.",
  "paraphrase_existing": "Formats are parsed into segments and rendered with theme styling; unknown pipe names are currently refused. Style validation and provided-instrument colour checks already consult the theme, but provided default formats are parsed without one. A registration’s first fault refuses the whole registration, while reports from an unregistered provider are refused. Extensions register before the session theme exists, and Jefferson installs its footer after session start.",
  "recommendation": "Clarify the format vocabulary and release-facing behavior before implementation; also correct the inconsistent test-site count.",
  "findings": [
    {
      "id": "C1",
      "severity": "major",
      "location": "Decisions — The name after `|` is read in one order, and the parser owns it",
      "finding": "The design relies on variable forms and `$bar`'s special refusal without explaining what a form is, how one is declared or written, or what `$bar` refuses.",
      "rationale": "These project-specific rules determine whether a pipe name is interpreted as a form or a colour, but the document does not give a reader enough context to apply them or understand the exception.",
      "concrete_case": "A provider declares a form named `accent`, and a format contains `$variable|accent` or another pipe name after `$bar`.",
      "recommendation": "Define forms and the `$bar` restriction in plain language and give a short example showing form-versus-colour resolution and the bar refusal."
    },
    {
      "id": "C2",
      "severity": "major",
      "location": "Migration Plan — Post-merge hand-off; Goals / Non-Goals",
      "finding": "The only planned user-facing explanation of the new syntax and its precedence is a docs pass explicitly stated not to block the feature.",
      "rationale": "If the feature ships before that pass, users and provider authors have no documented way to discover the syntax, the reserved-name collision rules, or the older-version compatibility limitation.",
      "concrete_case": "A minor release ships the implementation while `docs/formats.md` and the extension-author guidance still describe the old language.",
      "recommendation": "Specify a release gate for the essential syntax, precedence, error and compatibility documentation, or identify another user-visible source that ships with the feature."
    },
    {
      "id": "C3",
      "severity": "major",
      "location": "Decisions — The theme's name set is invariant at the pin; Migration Plan — A pi other than the pin",
      "finding": "The no-render-guard rationale proves theme-name invariance at the pinned pi version, while the migration plan also supports other pi versions without saying what happens if their theme name sets vary.",
      "rationale": "Readers cannot tell whether the theme-switch safety claim applies to every supported pi version or is only an assumption for unpinned versions; the stated failure would be a render-time throw.",
      "concrete_case": "A user runs an allowed unpinned pi version whose second theme does not accept a name accepted when the format was parsed, then switches themes.",
      "recommendation": "State explicitly whether this case is unsupported or can fail at render, and explain the operator remedy or any intended compatibility requirement for unpinned pi versions."
    },
    {
      "id": "C4",
      "severity": "minor",
      "location": "Module & File Placement — `tests/instrument.test.ts`",
      "finding": "The table says there are six `instrumentBindings` sites but lists seven line locations.",
      "rationale": "The count makes the test-update scope ambiguous for an implementer following the file map.",
      "concrete_case": "The four no-registry sites at 366, 401, 436 and 451 plus the three Map sites at 389, 464 and 483 total seven.",
      "recommendation": "Correct the count or the list of locations."
    },
    {
      "id": "C5",
      "severity": "minor",
      "location": "Decisions — A provider's registration waits for the first theme and is vetted once, whole",
      "finding": "The proof says a row still renders after its provider registration is refused, but does not describe what the user sees in that row or whether a fallback is used.",
      "rationale": "The visible outcome is important to understanding the promised failure behavior and writing an actionable test.",
      "concrete_case": "A row names a provided instrument whose default format contains a misspelled theme colour; the whole registration is refused.",
      "recommendation": "Describe the row's resulting content or fallback and distinguish it from the single warning."
    }
  ],
  "assumptions": [
    {
      "assumption": "The review is limited to the design document and does not verify cited specifications or source behavior.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Source code, tests, specifications, research, rulings, and documentation were not read or verified.",
    "Actual pi theme behavior and release-process constraints were not independently verified."
  ]
}