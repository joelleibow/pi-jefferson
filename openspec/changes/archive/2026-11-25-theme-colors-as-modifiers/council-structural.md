{
  "assumptions": [
    {
      "assumption": "pi's foreground token names are identical across every theme in one pi process (the schema requires all tokens and the Theme constructor fills fallbacks), so a provider default format checked against one render's theme never goes stale on a theme switch.",
      "status": "verified"
    },
    {
      "assumption": "A fault in a provided instrument's configured format refuses that instrument alone, on the settings check that runs once document and registration are both in hand.",
      "status": "verified"
    },
    {
      "assumption": "Today the registration-time parse of a provider's default format refuses structural faults (variables, modifier placement) at registration.",
      "status": "verified"
    },
    {
      "assumption": "A theme is in hand wherever the delta's read-time colour check runs, including the path where a registration arrives second, possibly before session_start.",
      "status": "unverified"
    },
    {
      "assumption": "Michael's measured facts (49 foreground tokens of 56, `dim` the only collision, the T3 bind-throw path, 538 passing tests at the base) are accurate.",
      "status": "unverified"
    },
    {
      "assumption": "No test reads pi's dist files (Michael T11).",
      "status": "verified"
    }
  ],
  "findings": [
    {
      "concrete_case": "A provider registers from its `session_start` handler with the default format `$saved|notacolour` before the footer's theme is in hand, and no document names the instrument. The new requirement demands a warning naming the instrument, but no pinned timing can produce it: the registration check has no theme, the only bad-name scenario requires `a document names that instrument`, and the registration-second settings check can fire before a theme exists. The same seam exists for a provided instrument's configured format checked under statusline spec.md:1847.",
      "finding": "The change makes `|name` resolution theme-dependent, but the two existing requirements that promise when format checks run are not modified and their timing predates themes: instrument-registration's `Jefferson MUST check each member's shape when it registers` (whose check today includes parsing the default format and refusing it, at instrument-binding.ts:236-240), and statusline's `once both the document and that registration are in hand, whichever comes second, whether or not a row places the name` (spec.md:1847-1853). Registrations and the registration-second settings check can run before any theme exists (michael-orientation.md T2, T4), so the colour half of these checks cannot run at the time the existing requirements state. The new instrument-registration requirement pins the outcome (`MUST NOT depend on the order in which extensions register`) but not when the colour half runs, and T3 shows the bind-time parse can throw past the read's containment if the registration refusal is relaxed.",
      "id": "STR-1",
      "location": "openspec/changes/theme-colors-as-modifiers/specs/instrument-registration/spec.md (ADDED requirement) vs openspec/specs/instrument-registration/spec.md:40-46 and openspec/specs/statusline/spec.md:1847-1853",
      "rationale": "Two requirements in one capability now make ambiguous timing claims about the same check, and a spec-level outcome is asserted with no pinned moment that can deliver it. This is the exact seam Michael's T2-T4 measure, and the conductor's escalation to Joel (michael-orientation.md §4) hinges on which check survives; the spec should pin the observable outcome in both load orders before the design chooses a mechanism.",
      "recommendation": "State in the delta when the colour half of a format check runs — once a theme is in hand — with one sentence in the new instrument-registration requirement and a matching sentence or scenario in statusline's `once both are in hand` requirement; add the two load-order scenarios (registration before the read, registration after) with a bad colour in a default format and in a configured format. If that requires modifying the existing instrument-registration requirement, update the proposal's claim that `No existing requirement there changes`.",
      "severity": "major"
    },
    {
      "concrete_case": "A later change to what a colour may set (for example, allowing a colour to coexist with an instrument background rule) must be written into two requirements; a change made in only one leaves the spec self-contradictory.",
      "finding": "The rule that a colour sets only the foreground and nothing else is stated in two requirements of the same delta: the modified `A style modifier only sets an attribute on` gains `A foreground colour is the other kind of modifier, and it sets only the foreground`, and the ADDED `A foreground colour of the theme is a modifier` states `The colour MUST set the foreground of the piece the modifier attaches to, and MUST set nothing else`.",
      "id": "STR-2",
      "location": "openspec/changes/theme-colors-as-modifiers/specs/statusline/spec.md, modified `A style modifier only sets an attribute on` and ADDED `A foreground colour of the theme is a modifier`",
      "rationale": "The feature-spec standard requires each rule to be stated once with every other mention pointing at the stating section, so a change to the rule lands in one place.",
      "recommendation": "Keep the normative rule in the ADDED requirement, which owns the colour-modifier behaviour; in the modified requirement, drop the restating sentence or replace it with a pointer to the colour requirement.",
      "severity": "minor"
    },
    {
      "concrete_case": "The spinner change adds `|spinner`; the plain-format rule must reject `$working|spinner` inside a kind's format too. Today that rejection lives only in a colour requirement's last clause and in code, so a change to composed-format rules would have to be made in a requirement titled about foreground colours.",
      "finding": "The clause `A plain kind format rejects every |name, a colour included` pins a pre-existing behaviour — plain (composed-kind) formats reject all modifiers, implemented at format.ts:101 and listed in docs/formats.md's refusal list — that no current spec requirement states (verified by search: no statusline requirement mentions plain-format modifier rejection). The delta pins it inside a requirement whose subject is foreground colours.",
      "id": "STR-3",
      "location": "openspec/changes/theme-colors-as-modifiers/specs/statusline/spec.md, ADDED `A foreground colour of the theme is a modifier`, final clause",
      "rationale": "The plain-format rule is not a fact about colours: it outlives this change and must govern the spinner name and user-composed instruments. Giving it a home under a colour requirement means the wrong requirement owns it, and the proposal does not record that the delta is pinning a previously unpinned rule.",
      "recommendation": "Give the plain-format rejection one observable home of its own in the statusline spec (a composed-format requirement, or a sentence in the notice-format requirement generalized to composed sets), and have the colour requirement point at it; at minimum, note in the proposal that this delta newly pins a rule the spec never stated.",
      "severity": "minor"
    },
    {
      "concrete_case": "If the format language's lookup rule ever gains a class (say, visual names distinct from Jefferson's own), the instrument-registration requirement's restated order silently goes stale while the statusline rule is updated.",
      "finding": "The new requirement restates the format language's lookup order — `A name that is neither a form, nor one of Jefferson's own names, nor a foreground colour of the theme MUST be refused` — whose home is the statusline spec (S2, and the ADDED colour requirement's precedence).",
      "id": "STR-4",
      "location": "openspec/changes/theme-colors-as-modifiers/specs/instrument-registration/spec.md, ADDED `A provider's default format is checked against the theme`",
      "rationale": "One home for each fact: the lookup order is the format language's rule, owned by the statusline spec. The phrasing is generic enough to survive the spinner change, but a second statement means two requirements must move together if the language's lookup rule changes.",
      "recommendation": "Acceptable as a capability-facing restatement for extension authors, since the registration contract is what an author reads; align the wording exactly with the statusline rule, or reduce the clause to `checked as any format is` plus the two facts this requirement owns (the theme it is checked against, and order-independence).",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "A live pi session across a theme switch, and whether a theme is available before session_start on the registration paths (not run; taken from the research artifacts).",
    "pi's 49/56 foreground token counts and the dim-only collision, measured directly (relied on michael-orientation.md T1/T7 and research-chidi.md).",
    "The spinner and user-composed-instrument brain-vault notes (relied on plan-context.md's quotes of them).",
    "The ADR that will record R1's retirement (no draft exists in the change directory yet).",
    "design.md and tasks.md (not present at this stage of the change).",
    "Statusline requirements outside the delta's scope beyond those read in full (the section list and the requirements cited by the delta were read; no exhaustive read of all 50+ requirements)."
  ],
  "owner_questions": [
    {
      "options": [
        "State it in each new/added requirement as one sentence: the colour half runs once a theme is in hand, keeping the registration-time structural refusal and the instrument-alone refusal as they are.",
        "Modify the two existing timing requirements (instrument-registration's `when it registers`; statusline's `once both are in hand`) to add the theme as a third precondition.",
        "Leave the timing entirely to the design (O1) with no spec statement beyond the order-independence already written."
      ],
      "question": "Where should the timing of the theme-dependent half of the format checks live, given the existing requirements still promise theme-free timing?",
      "recommended_option": "State it in each new/added requirement as one sentence: the colour half runs once a theme is in hand, keeping the registration-time structural refusal and the instrument-alone refusal as they are.",
      "why": "The new fact stays in its new home, the two existing requirements keep statements that remain true for every non-colour fault, and the design owns the mechanism (O1) without the spec asserting a timing no path can deliver. Option (b) touches requirements the proposal says do not change and widens the delta; option (c) leaves an outcome pinned with no moment that produces it, which is the gap STR-1 found."
    },
    {
      "options": [
        "Keep the clause in the colour requirement and add a note that it restates a composed-format rule.",
        "Give it its own home in the statusline spec (a composed-format requirement or a generalized sentence beside the notice-format requirement) and have the colour requirement point at it.",
        "Leave it out of the spec deltas entirely and rely on the existing code and docs."
      ],
      "question": "Should the plain-kind-format rejection stay inside the colour requirement, or get its own home?",
      "recommended_option": "Give it its own home in the statusline spec and have the colour requirement point at it.",
      "why": "The rule is pre-existing, is not about colours, and must govern the spinner name and user-composed instruments after this change lands; pinning it under a requirement titled about foreground colours leaves the wrong owner and risks the rule being missed when composed formats next change. Leaving it out (option c) would leave a shipped behaviour unpinned in the specs, which is the gap the delta is silently closing today."
    }
  ],
  "paraphrase_existing": "Today the format language offers only nine Jefferson-owned `|name` modifiers (six ThemeStyle attributes and three string mutations) plus declaration-owned forms; colour lives in an instrument's `style`, validated against the live theme at read, and in a variable's built-in `variableFg`, which overrides the merged style's foreground at render (format.ts:262-276). A notice kind's format is plain and takes no modifier, `$bar` takes none, and a provider's registration is refused when its default format cannot be parsed at registration time (instrument-binding.ts:236-240).",
  "paraphrase_proposes": "The change makes every foreground colour of the live theme a `|name` modifier, asked of the theme one name at a time with no copied token list, behind a lookup order of form, Jefferson's own name, theme colour, then rejection at read time. A colour written in the format becomes the strongest colour, above a variable's built-in colour and the instrument's `style`, displacing the thinking level's colour and the notice's `warning`. Five statusline requirements are modified, three are added, and one instrument-registration requirement is added so a provider's default format is checked against the theme a render will read, with the outcome independent of registration order; ADR 0003's colour clause is retired in a new ADR.",
  "recommendation": "Approve the proposal and both deltas as a sound basis for the design, with one major fix before the design starts: the deltas must reconcile the timing of the new theme-dependent checks with the two existing requirements that promise theme-free timing on the registration paths (STR-1). The three minor findings are single-home issues inside the deltas and can be settled in one editing pass. Every calibrated claim I could check against the repository held: the test and doc citations, the ten-token test theme, the duplicated foreground probe, the variableFg inversion the change corrects, and the retirement targets R2-R6 all match the code and specs as cited."
}