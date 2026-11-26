{
  "mode": "review",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Revise before approval: retain the pure threshold rules and existing binding/visual paths, but make per-instrument sample ownership explicit and remove the contradictory provider-default scenario. No general state-machine framework or new dependency is warranted.",
  "findings": [
    {
      "id": "ZO-R1",
      "severity": "major",
      "location": "openspec/changes/bar-thresholds/design.md:110,198-208 (DEC-6),318-323; extensions/jefferson/components/row/row-renderer.ts:36-52,84-85",
      "finding": "DEC-6 places the once-per-instrument reading at an existing reset point that is actually per cell, without specifying how repeated placements share their chosen state.",
      "rationale": "The source creates a separate sample/text memo inside every cellView invocation, including placements in different rows. Configuration permits repeated names and instrumentBindings shares the underlying binding by name. Adding a reading beside each existing text memo therefore gives once per placement, not the promised once per instrument per sample. This is an ownership gap in the proposed data flow, not a need for a general cache: the sample-wide chosen instrument state must have one owner above individual cell rendering. The design's planned test checks multiple widths but does not mention repeated placements.",
      "concrete_case": "Place the same provided bar instrument in two rows, with a threshold at 70 that adds $bar. Let its bar return 69 on the first invocation and 71 on the second. Resolving at each cited cell-local reset reads it twice in one footer sample, and the two placements choose different states despite the once-per-instrument contract.",
      "recommendation": "Specify where the sample-wide reading/state is shared across all placements of one instrument, while keeping width-specific text caching local to each cell. Keep provider invocation and state selection behind the bound instrument's containment seam; the row should consume the resulting sample state rather than acquire threshold internals. Extend the planned test to repeat one provider instrument within and across rows and assert one read and one selected state for the whole sample."
    },
    {
      "id": "ZO-R2",
      "severity": "major",
      "location": "openspec/changes/bar-thresholds/specs/statusline/spec.md:609-614 (Scenario: A provider that names thresholds alone), versus :88-102; design.md DEC-2 and DEC-13",
      "finding": "The newly added thresholds-only provider scenario retains default fill colours after the user supplies a replacement threshold list, contradicting the single-list design and the settled separate-opt-ins ruling.",
      "rationale": "The design consistently selects the configured list or the defaults, never both. The scenario instead says a configured label-only threshold still leaves the defaults colouring the fill. Satisfying that expectation requires a provider-specific second colour-threshold path or an exception to whole-list replacement. The separate-opt-ins ruling explicitly records the opposite cost: naming thresholds alone means a user's list switches off the default colours. This finding concerns the changed scenario, not reconsideration of the settled opt-in decision.",
      "concrete_case": "A provider declares bar and options: [\"thresholds\"]. Its settings contain thresholds: [{activeAt: 50, label: \"High\"}], and its bar reads 75. DEC-2 and the whole-list-replacement requirement yield the label High with no default warning fill; this scenario requires warning colouring to survive.",
      "recommendation": "Correct the scenario to say the label applies from 50 and the configured list replaces the default colours. Preserve the existing separate opt-ins and single threshold-selection path; do not introduce an independent default-colour mechanism for thresholds-only providers."
    }
  ],
  "assumptions": [
    {
      "assumption": "A pure shared thresholds.ts under extensions/jefferson is consistent with this repository's responsibility-based layout: both configuration and instrument binding need the rules, and the new module has no outward dependencies.",
      "status": "verified"
    },
    {
      "assumption": "Existing validateStyle, parseFormat and full instrument binding can be reused for threshold settings and fill rather than introducing a parallel validator or formatter.",
      "status": "verified"
    },
    {
      "assumption": "The fault ledger and existing configuration report/watch paths already provide the warning channel and deduplication needed by this feature.",
      "status": "verified"
    },
    {
      "assumption": "The existing row renderer's sample/text memo is scoped to an individual cell view, not shared by all placements of a bound instrument.",
      "status": "verified"
    },
    {
      "assumption": "The separate-opt-ins ruling requires a user's explicit thresholds-only list to replace default colours, rather than retaining them through another path.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No files were edited and no tests, typechecking or OpenSpec validation were executed.",
    "Implementation details and tasks.md readiness were not reviewed; this is the initial high-level design review.",
    "External platform documentation was not independently revalidated; research-chidi.md was read for platform facts and available mechanisms.",
    "Documentation hand-off items were not treated as feature blockers, consistent with the settled brief."
  ]
}