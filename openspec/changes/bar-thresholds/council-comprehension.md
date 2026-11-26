{
  "mode": "council",
  "lens": "council-comprehension",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Resolve the contradictory threshold examples and clarify provider opt-in, unknown readings, and style precedence before the design is implemented.",
  "findings": [
    {
      "id": "C1",
      "severity": "major",
      "location": "specs/statusline/spec.md — Only the four lowest thresholds are honoured, A fifth threshold",
      "finding": "The fifth-threshold scenario says the top-level settings apply above the discarded highest threshold, contradicting the rule that the highest retained threshold at or below the reading applies.",
      "rationale": "A user cannot determine which state appears at high readings, and the scenario would lead tests to encode the wrong behavior.",
      "concrete_case": "For thresholds at 10, 20, 30, 40 and 50 and a reading of 60, the four-lowest rule retains 40, but the fifth-threshold scenario says the top-level settings render.",
      "recommendation": "Change the scenario to expect the state at 40 and explain that a discarded threshold does not create a gap above it."
    },
    {
      "id": "C2",
      "severity": "major",
      "location": "proposal.md — Providers opt in by name; specs/statusline/spec.md — A declaration that can draw a bar declares the two options; A provided instrument takes only the options Jefferson implements",
      "finding": "Provider opt-in is inconsistent: the proposal says providers opt in by naming the options, while the declaration requirement mandates both options for every bar and the provider requirement says a bar-capable provider takes them without explicitly requiring the names.",
      "rationale": "Extension authors cannot tell whether a bar provider may omit either option or whether registration is refused unless both are named.",
      "concrete_case": "A provider declares a bar and options containing only \"thresholds\", or declares a bar with neither new option.",
      "recommendation": "Choose and state whether each option is independently optional or both are mandatory, and specify registration and configuration outcomes for each combination."
    },
    {
      "id": "C3",
      "severity": "major",
      "location": "specs/statusline/spec.md — A threshold compares the bar's own reading; Only a variable the format names can blank an instrument; $bar takes the width the rest of the format leaves",
      "finding": "The document does not distinguish an unknown bar value that blanks a named $bar from a null or unknown percentage that selects threshold 0 and may draw an unfilled track.",
      "rationale": "Both descriptions refer to missing usage or estimates, so an operator cannot predict whether the row disappears or displays a track, and a provider cannot know which value to return.",
      "concrete_case": "A host reports no usage and the active format names $bar: the unknown-reading scenario treats the percentage as 0, while the named-bar scenario says the whole instrument renders nothing; a null estimate separately draws the track.",
      "recommendation": "Define the distinct reading and bar-value states, their representation, and the rendering result for each, including when a threshold changes the format to include $bar."
    },
    {
      "id": "C4",
      "severity": "major",
      "location": "specs/statusline/spec.md — fill styles the bar's fill and nothing else, Style still covers the whole instrument; The default thresholds are 70 and 90; $bar takes the width the rest of the format leaves",
      "finding": "The style scenario says a bar with a style and no fill takes that style on both fill and track, but default thresholds colour the fill and the bar requirement draws the empty track in dim.",
      "rationale": "The scenario has no conditions excluding default thresholds, and the precedence of a foreground style versus the dim track is not explained.",
      "concrete_case": "At a reading of 90, an instrument with a foreground style and no configured fill or thresholds must both use that style on its filled portion and use the default error colour; its empty track is also specified as dim.",
      "recommendation": "Specify the precedence of instrument style, default or configured fill, and the track's dim styling, then qualify or replace the scenario with examples above and below the default thresholds."
    },
    {
      "id": "C5",
      "severity": "minor",
      "location": "proposal.md — Open questions, How deep a threshold's formats layers; specs/statusline/spec.md — A threshold's state changes only the keys it names",
      "finding": "The behavior of object-valued options other than style and fill is explicitly unresolved, even though thresholds may carry any declared option and the spec says they replace only named keys.",
      "rationale": "Users cannot know whether an overridden formats object preserves unspecified top-level format kinds or discards them.",
      "concrete_case": "A top-level formats object has busy and idle entries, while the selected threshold supplies only busy.",
      "recommendation": "Resolve whole-object replacement versus per-key layering in the design and add an example showing the resulting idle format and validation behavior."
    }
  ],
  "assumptions": [
    {
      "assumption": "The two capability paths named by the proposal are the relevant delta-spec files.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Repository source, existing baseline specs, research and owner rulings were not read.",
    "The available read tool cannot enumerate the specs directory; completeness beyond the two capability paths named in the proposal could not be verified."
  ]
}