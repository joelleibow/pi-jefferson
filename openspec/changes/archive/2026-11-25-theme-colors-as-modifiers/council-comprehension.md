{
  "mode": "council",
  "lens": "council-comprehension",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Clarify theme-change failure handling, provider validation lifecycle, and collision and refusal rules before design.",
  "findings": [
    {
      "id": "C1",
      "severity": "major",
      "location": "specs/statusline/spec.md — A colour's name is the theme's own, The theme changes; specs/instrument-registration/spec.md — A provider's default format is checked against the theme",
      "finding": "The documents do not say what happens when a format's previously valid foreground name is absent from a newly selected theme.",
      "rationale": "Names are validated against a live theme, but render-time theme changes are specified only when the new theme supplies the same name. Users and providers cannot predict whether a theme switch rejects the configuration, disables an instrument, falls back to another colour, or emits a warning.",
      "concrete_case": "A document or provider default uses |toolDiffAdded, valid at read or registration time; the host switches to a theme whose foreground accessor does not accept that name.",
      "recommendation": "Specify revalidation timing, rendered fallback and warning scope for both document formats and provider defaults, including behavior if the user later switches back."
    },
    {
      "id": "C2",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md — A provider's default format is checked against the theme",
      "finding": "The provider-facing registration contract does not explain when theme-dependent acceptance occurs or how refusal is reported when the render theme is not yet available.",
      "rationale": "The requirement simultaneously promises theme-aware checking and registration-order independence, but its examples only say that an instrument registers or that a warning appears. A provider author cannot tell whether registration is synchronous, provisional, or deferred, nor what happens to an already registered instrument after a delayed check fails.",
      "concrete_case": "A provider registers $saved|toolDiffAdded before the extension has received the theme used for rendering, while another provider registers the same format after the theme is available.",
      "recommendation": "Define the observable registration and delayed-validation lifecycle, including the provider-visible result, warning timing, and whether or when a rejected instrument becomes available."
    },
    {
      "id": "C3",
      "severity": "major",
      "location": "proposal.md — What Changes, lookup order; specs/statusline/spec.md — A modifier follows a variable or literal text and A foreground colour of the theme is a modifier",
      "finding": "The delta does not fully state the collision resolution order that the proposal promises, especially when a variable form has the same name as a reserved modifier or theme colour.",
      "rationale": "The proposal distinguishes a form in first position from Jefferson's names and theme names, but the normative delta only says a form belongs to its variable, existing meanings remain, and a form can precede a colour. These statements do not resolve all collisions or identify what happens when a form name appears later in a chain.",
      "concrete_case": "A provider declares a form named bold or accent, and a user writes $saved|bold, $saved|accent, or $saved|dim|accent.",
      "recommendation": "Put the complete ordered lookup rule and first-position restriction in the statusline requirement, with examples covering a form colliding with a reserved name and a colour, plus the same name later in a chain."
    },
    {
      "id": "C4",
      "severity": "minor",
      "location": "proposal.md — What Changes, A bad name is a refusal; specs/statusline/spec.md — A foreground colour of the theme is a modifier",
      "finding": "The stated difference between rejecting a whole document and disabling only a provided instrument is not directly specified for a bad colour in a document-supplied provider format.",
      "rationale": "The statusline examples show whole-document fallback, while the registration example covers a provider's default format. A user configuring a provided instrument cannot determine from the delta alone whether unrelated cells remain visible or whether an override can rescue a bad provider default.",
      "concrete_case": "A document configures a provided instrument with $saved|acccent while also configuring other instruments, or overrides that provider's invalid default with a valid format.",
      "recommendation": "Add scenarios specifying warning contents and fallback scope for invalid document-supplied provider formats and for valid overrides of invalid provider defaults."
    },
    {
      "id": "C5",
      "severity": "minor",
      "location": "specs/statusline/spec.md — A style modifier only sets an attribute on, A color is not a modifier",
      "finding": "The retained scenario title says a colour is not a modifier even though its expected behavior and the newly added requirement say it is.",
      "rationale": "The title is likely to mislead readers scanning the spec or interpreting test reports about the new format language.",
      "concrete_case": "A reader sees the scenario named A color is not a modifier alongside A foreground colour of the theme is a modifier.",
      "recommendation": "Rename the scenario to distinguish foreground colour modifiers from the six boolean attribute modifiers."
    }
  ],
  "assumptions": [
    {
      "assumption": "The proposal's modified-capability list names the two relevant delta spec files.",
      "status": "verified"
    },
    {
      "assumption": "No additional files exist under the specs directory beyond the two named capability specs.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "The read tool cannot enumerate directories, so additional files under specs/ could not be ruled out; only the statusline and instrument-registration spec.md files named by the proposal were read.",
    "Existing source, baseline specifications, research, and other referenced documents were not read."
  ]
}