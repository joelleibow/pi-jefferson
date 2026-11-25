{
  "mode": "council",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed with the existing configuration, instrument-binding and standalone-visual responsibilities; correct the provider opt-in scope and capped-list scenario before design. No new dependency or general state-machine framework is warranted.",
  "findings": [
    {
      "id": "ZO-1",
      "severity": "major",
      "location": "openspec/changes/bar-thresholds/specs/statusline/spec.md:7-9, 242-260, 314-318",
      "finding": "The delta makes bar capability automatically require thresholds and fill for every declaration, erasing the explicitly ruled provider opt-in boundary.",
      "rationale": "The newest owner rulings distinguish Jefferson-owned bar declarations, which must expose both settings, from provided declarations, which independently opt in through options. The proposal preserves that distinction, but the universal MUST at lines 244-245 and the provided-options paragraph would require changing or automatically expanding existing provider declarations. This moves responsibility for a provider's supported configuration away from its declared options. The current adapter already constructs its accepted option list from foundational options plus the provider's declared extras (instrument-binding.ts:226-237), and configuration.ts:167-174 enforces that list.",
      "concrete_case": "An existing provider declares bar with options omitted or options: []. Under the owner ruling it must continue drawing the default bar while refusing user thresholds/fill settings. Under the delta's universal requirement it is either an invalid declaration or gains these settings without opting in.",
      "recommendation": "Scope mandatory declaration of both options to Jefferson-owned instruments. State explicitly that provided instruments accept each option only when named in options and bar exists, while non-opt-in providers retain the default bar. Preserve declaration-driven checking rather than adding provider-name exceptions or automatic capability expansion."
    },
    {
      "id": "ZO-2",
      "severity": "major",
      "location": "openspec/changes/bar-thresholds/specs/statusline/spec.md:136-141 (Scenario: A fifth threshold)",
      "finding": "The capped-list scenario incorrectly returns to top-level settings above the ignored fifth threshold instead of retaining the highest honoured threshold.",
      "rationale": "Thresholds are lower bounds, not bounded intervals: the entry with the highest retained activeAt at or below the reading applies. Removing the fifth entry cannot make the fourth stop applying. The scenario contradicts the delta's opening selection requirement and owner-rulings.md's four-lowest rule. Implementing its expected result would introduce an unnecessary second mechanism in which an ignored threshold still changes state selection.",
      "concrete_case": "For activeAt values 10, 20, 30, 40 and 50 with distinct labels, a reading of 55 must use the state at 40 and emit the excess-count warning. This scenario instead demands the top-level label, despite 40 remaining a matching honoured threshold. Its phrase 'only the highest ... covers' is itself incompatible with lower-bound semantics.",
      "recommendation": "Replace the scenario with explicit values and expect the fourth-lowest threshold's state above the ignored fifth, plus one warning. Keep selection as one rule over the validated, filtered and capped list; ignored entries must not participate in runtime selection."
    }
  ],
  "assumptions": [
    {
      "assumption": "The newest owner rulings, rather than Eleanor's earlier shorthand about out-of-range rejection, govern above-100 acceptance and provider opt-in.",
      "status": "verified"
    },
    {
      "assumption": "Existing validateStyle in extensions/jefferson/format.ts can validate fill; the current shared instrument binding owns parsed formats, label gaps, composed selection and rendering, so no parallel formatting engine is needed.",
      "status": "verified"
    },
    {
      "assumption": "An existing scoped, deduplicating warning ledger is available in extensions/jefferson/faults.ts; this feature does not need a separate notification subsystem.",
      "status": "verified"
    },
    {
      "assumption": "The repository already has a standalone bar visual and declaration-driven option validation; responsibility placement can remain within these existing modules without introducing a general state-machine abstraction.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No design.md was supplied or audited; the explicitly deferred placement of defaults, per-state binding contract and shared threshold-reader shape remain design decisions.",
    "Did not execute tests, typechecking or OpenSpec validation; verification was read-only source and artifact inspection.",
    "Did not exhaustively inspect startup warning delivery or all provider registration tests."
  ]
}