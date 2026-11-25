{
  "mode": "review",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Pass Stage 1 with one minor correction to the authoritative file-placement table. The parser owns lookup order, segments retain foreground intent, rendering owns precedence, and the existing listener/startup boundary owns waiting for a theme. Reusing the foreground probe and existing theme/test infrastructure avoids parallel validation paths, new dependencies, and unnecessary source files.",
  "findings": [
    {
      "id": "ZO-01",
      "severity": "minor",
      "location": "openspec/changes/theme-colors-as-modifiers/design.md:76 — Module & File Placement",
      "finding": "The authoritative placement table names `extensions/jefferson/instrument-binding.ts`, but that file does not exist. The existing binding lives under `extensions/jefferson/components/instruments/instrument-binding.ts`.",
      "rationale": "The standard requires constructs to land in the module owning their reason to change. The proposed responsibility is correctly the existing instrument binding, but the table's explicit path incorrectly places it outside its component directory. Source: direct directory inspection, the existing binding file, and ARCHITECTURE.md's components/instruments placement and import rules.",
      "concrete_case": "An implementer following the table's declared 'one home' for file changes looks for or creates a top-level instrument-binding.ts instead of modifying the existing adapter, foreground guard, and binding in components/instruments/.",
      "recommendation": "Correct the table row to `extensions/jefferson/components/instruments/instrument-binding.ts`; retain all proposed binding changes in that existing module and add no forwarding file."
    }
  ],
  "assumptions": [
    {
      "assumption": "The foreground probe is duplicated today in validateStyle and the provided variableFg guard, so the parser supplies a third real consumer justifying extraction into the existing format-language module.",
      "status": "verified"
    },
    {
      "assumption": "The existing source structure already separates startup wiring, registration bus handling, configuration reading, format-language behavior, and instrument binding; the proposed changes can reuse these owners without introducing a new layer or module.",
      "status": "verified"
    },
    {
      "assumption": "fakeTheme already supports invented foreground names, missing real pi names, background-slot rejection, and case-sensitive lookup without modification.",
      "status": "verified"
    },
    {
      "assumption": "The pinned host guarantees theme availability at session_start in every mode and invariant foreground names across supported theme switches; these are settled platform measurements recorded in michael-council-rulings.md, not independently remeasured in this review.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Implementation correctness or test execution: this was a read-only review of a pre-implementation design.",
    "Independent reproduction of pinned pi lifecycle and theme-schema measurements already settled by the council.",
    "Detailed task sequencing and post-implementation import/export coverage; no tasks or implementation changes were evaluated."
  ]
}