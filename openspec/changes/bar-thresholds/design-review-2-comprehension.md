{
  "mode": "review",
  "lens": "council-comprehension",
  "paraphrase_proposes": "The design makes a bar’s appearance configurable through thresholds, with default warning and error states beginning at 70 and 90. It binds a separate instrument form for each state and chooses one state per instrument and sample, so row planning and drawing agree. It also adds separate provider opt-ins for thresholds and fill, shares validation between settings paths, and contains provider failures during planning and rendering.",
  "paraphrase_existing": "The drawing currently chooses warning and error colours using strict comparisons above 70 and 90. An instrument is bound once using its top-level format, and row planning reads its fixed fills property without the sample. Provider containment wraps rendering but not planning, while the two settings paths separately validate options and surface faults differently.",
  "recommendation": "Revise the design to make the threshold input contract and the per-sample reading lifecycle explicit, and explain the independent provider opt-ins with an example.",
  "findings": [
    {
      "id": "COM-1",
      "severity": "major",
      "location": "Module & File Placement: thresholds.ts; DEC-1; Risks / Trade-offs",
      "finding": "The document does not fully specify the threshold reader’s accepted inputs or their outcomes. It names range, shape, and numeric edge cases, but does not say, for example, whether negative activeAt values are rejected or describe the expected result for 1e400.",
      "rationale": "A reader cannot implement or independently check the shared validation contract from this document without consulting another artifact or guessing.",
      "concrete_case": "A settings document contains a threshold with activeAt: -1, or parses 1e400 as a non-finite number.",
      "recommendation": "State the complete element shape and numeric acceptance rules, including negative and non-finite values, and identify whether each invalid case rejects or is ignored."
    },
    {
      "id": "COM-2",
      "severity": "major",
      "location": "DEC-6; Module & File Placement: instrument-binding.ts and format.ts",
      "finding": "The per-sample slot is described as retaining the chosen state or a throw, but the formatter also needs the one bar reading. The document does not say where that reading is retained and shared with every placement.",
      "rationale": "The selected state alone cannot reproduce the bar’s filled width or distinguish null from undefined, so the described slot does not explain how a single reading reaches drawing and blanking.",
      "concrete_case": "A provider returns 69 on its first call and 71 on its second, and the instrument is rendered in several placements with a $bar.",
      "recommendation": "Specify that the successful sample outcome includes both the original reading and the selected state, and explain how fills and render consume that outcome without re-reading."
    },
    {
      "id": "COM-3",
      "severity": "major",
      "location": "DEC-6",
      "finding": "The slot retains the last sample object, yet the design also says nothing outlives the sample and that its lifetime matches the row’s per-sample memo. No clearing event or lifecycle guarantee is described.",
      "rationale": "It is unclear how retaining the last sample between calls satisfies the stated host-data caching constraint, especially when no later sample arrives.",
      "concrete_case": "A footer renders once and then remains idle while the bound instrument remains installed.",
      "recommendation": "Explain when the sample reference and its outcome are released, or explicitly document the relevant lifetime guarantee and why the retained reference complies with the constraint."
    },
    {
      "id": "COM-4",
      "severity": "minor",
      "location": "DEC-13; Migration Plan: post-merge hand-off",
      "finding": "The provider opt-ins are described separately, but the practical consequence of declaring thresholds without fill is deferred to a future docs pass rather than explained here.",
      "rationale": "Provider authors and implementers need to know which threshold values are accepted in each opt-in combination, including how automatic default fill thresholds interact with a provider that does not opt into fill.",
      "concrete_case": "A provider declares bar and thresholds but not fill, then a user writes a threshold containing fill.",
      "recommendation": "Add a short opt-in matrix or concrete examples showing accepted user settings and default behaviour for neither, either, and both options."
    }
  ],
  "assumptions": [
    {
      "assumption": "The design document is the only permitted source for this review.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Source code, specifications, research, owner rulings, and tests were not read; statements about them were assessed only as presented in design.md."
  ]
}