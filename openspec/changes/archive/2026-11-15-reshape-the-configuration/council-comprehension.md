{
  "mode": "council",
  "lens": "council-comprehension",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed with the settled list-of-lists shape, but make migration and warning behavior unambiguous before design.",
  "findings": [
    {
      "id": "C1",
      "severity": "major",
      "location": "specs/statusline/spec.md — A rows list is the only way to declare rows",
      "finding": "The requirement simultaneously says every document MUST declare `rows` and that a document with no rows renders the default. It also omits the separately recorded `rows: []` default behavior.",
      "rationale": "A user and implementer cannot tell whether a settings-only document or an empty rows list is valid without relying on another artifact.",
      "concrete_case": "`{\"instruments\":{\"model\":{\"label\":\"M\"}}}` has no `rows`; `{\"rows\":[]}` declares an empty list.",
      "recommendation": "Say `rows` is optional, is the only way to declare rows when present, and that absent `rows` and `rows: []` render the default row; add scenarios for both."
    },
    {
      "id": "C2",
      "severity": "major",
      "location": "proposal.md — retired key; specs/statusline/spec.md — A rows list is the only way to declare rows",
      "finding": "The retired-key scenarios do not define rejection for every old top-level shape the proposal says must fail. In particular, `id` and `distribution` are explicitly rejected only beside `rows`, while the no-rows scenario says the default renders.",
      "rationale": "Previously valid old documents can be silently treated as default-only configurations, depriving users of the promised migration warning. The interaction of old `cells` and new `rows` is also implicit.",
      "concrete_case": "`{\"distribution\":\"equal\"}`, `{\"id\":\"main\"}`, or `{\"cells\":[{\"instrument\":\"model\"}],\"rows\":[[{\"instrument\":\"path\"}]]}`.",
      "recommendation": "Explicitly reject each retired top-level key whether or not `rows` is present, including mixed old/new forms; show the new full `rows` form without using the retired terminology in warning text, and test each case."
    },
    {
      "id": "C3",
      "severity": "major",
      "location": "proposal.md — Open; specs/statusline/spec.md — An entry names the instrument its cell renders; An instrument's configuration lives in the extension's own document",
      "finding": "The proposal leaves the unknown-name warning contract open for row entries versus instrument settings, including whether it identifies an entry's position and how repeated occurrences are reported.",
      "rationale": "A single collected warning can incorrectly suggest a settings-only unknown renders a placeholder, or leave users unable to locate an offending occurrence. Names may occur in multiple rows and in the settings block.",
      "concrete_case": "`{\"rows\":[[{\"instrument\":\"typo\"}],[{\"instrument\":\"typo\"}]],\"instruments\":{\"other.typo\":{}}}`.",
      "recommendation": "Choose and specify distinct actionable diagnostics: row and 1-based instrument position for unknown entries, and the `instruments` setting name for settings-only unknowns; state how repeated occurrences are reported and retain warning-at-startup behavior."
    },
    {
      "id": "C4",
      "severity": "major",
      "location": "specs/statusline/spec.md — A row's entries are its cells and their places",
      "finding": "The normative text says a row's length MUST be its number of rendered cells, then says a list longer than ten MUST be truncated.",
      "rationale": "The same accepted input cannot both render a cell for every list entry and render only the first ten.",
      "concrete_case": "A row has 12 valid entries: the requirement implies 12 cells while its ceiling scenario requires 10.",
      "recommendation": "State that the first ten entries determine rendered cells and their order, while every supplied entry is still validated and unknown names still warn."
    },
    {
      "id": "C5",
      "severity": "minor",
      "location": "proposal.md — Impact and Open; michael-orientation.md — T10",
      "finding": "The still-open treatment of the legacy top-level `containers` notice leaves a known warning instructing users to declare the retired `cells` key, contrary to the binding user-facing vocabulary rule.",
      "rationale": "A user retaining this legacy key can receive a migration instruction that is both obsolete and prohibited, unless its behavior is deliberately addressed.",
      "concrete_case": "A document with a top-level `containers` key triggers the current notice `declare cells instead`.",
      "recommendation": "Choose and test a concrete outcome: remove the obsolete notice or replace it with a warning showing the new `rows` form, without using the retired word."
    }
  ],
  "assumptions": [
    {
      "assumption": "The quoted owner rulings settle the list-of-lists shape, retirement of the shortcut and configuration distribution, and 1-based warning positions.",
      "status": "verified"
    },
    {
      "assumption": "The current parser and warning behavior described by the research and orientation artifacts accurately reflects the pinned repository.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Source code, live platform behavior, test execution, and release automation were not independently checked; current-system claims rely on the supplied research."
  ]
}