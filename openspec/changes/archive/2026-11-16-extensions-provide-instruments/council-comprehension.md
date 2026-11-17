{
  "mode": "council",
  "lens": "council-comprehension",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design after reconciling the conflicting configuration scenario and specifying report identity, repaint behavior, provider-code containment, and actionable diagnostics. Keep the settled registration and naming rulings intact.",
  "findings": [
    {
      "id": "COM-1",
      "severity": "major",
      "location": "specs/statusline/spec.md — “An instrument's configuration lives in the extension's own document” and “A provided instrument's settings are checked when it registers”",
      "finding": "The retained scenario for an undeclared option rejects the entire document for any instrument, while the new requirement refuses only a provided instrument.",
      "rationale": "These give implementers and users opposite answers for the same provider configuration and conflict with Joel's settled choice.",
      "concrete_case": "The instruments block gives taiknr.savings an undeclared width option: one scenario says render the default row, while the other says keep all other entries as configured.",
      "recommendation": "Limit the existing whole-document scenario explicitly to Jefferson's own instruments and keep the provided-instrument scenario as the separate rule."
    },
    {
      "id": "COM-2",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md — “A provider reports a value for a declared field” and “A registration declares the fields Jefferson keeps”",
      "finding": "The reporting requirement says a message names a field and value, but does not define how that field is addressed among providers and multiple instruments.",
      "rationale": "The contract permits several instruments per provider and does not establish whether fields belong to an instrument or are shared provider-wide. Authors cannot tell which field a report updates or how resolvers receive overlapping names.",
      "concrete_case": "Two extensions both declare saved, or one extension's savings and totals instruments both declare saved; a report naming only saved has no specified destination.",
      "recommendation": "Define the field's scope and the complete report identity, including extension and instrument where necessary; document the matching resolver view and test same-named fields across providers and instruments."
    },
    {
      "id": "COM-3",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md — “A provider reports a value for a declared field”; specs/statusline/spec.md — “A name that registers during the session”",
      "finding": "The scenarios promise changes on the next render but do not explicitly require reporting or late registration to request a render.",
      "rationale": "A provider's report or late registration can otherwise leave a footer stale indefinitely when no unrelated host activity causes a repaint. The living store spec already requires a repaint for a change that alters displayed data.",
      "concrete_case": "A timer reports a new savings value while the user is idle, or a provider registers after startup with no further host events.",
      "recommendation": "Specify and test a repaint when a report changes displayed data and when registration changes an installed entry, including the no-op and disposed-footer cases."
    },
    {
      "id": "COM-4",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md — “Provider code costs one entry and no more”; michael-orientation.md §4; research-eleanor.md §3",
      "finding": "Containment is stated for a resolver, but the existing declaration shape contains several kinds of provider-supplied callbacks, and the delta does not say which are protected.",
      "rationale": "A provider author cannot tell whether forms, composed selection, foreground color, or timed-display callbacks have the same fault boundary. A guard around only the ordinary variable resolver would leave other callback failures able to disrupt rendering.",
      "concrete_case": "A provided instrument's composed.select or variableFg callback throws while a row contains other working entries.",
      "recommendation": "Name every permitted executable hook in the published declaration and apply the one-entry failure rule to all of them; cover throws and invalid or asynchronous results as applicable."
    },
    {
      "id": "COM-5",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md — “An extension registers its instruments over the pi event bus”; proposal.md — Open questions O5",
      "finding": "A malformed registration must be refused without changing rendering, but no author-visible diagnostic is required; the behavior of malformed or misaddressed reports is also left open.",
      "rationale": "The event bus does not return listener results to the emitter and listener errors go to the console, so silent refusal makes a provider look like an unknown instrument with no useful cause.",
      "concrete_case": "An author emits a registration with an invalid field declaration, or reports a misspelled field, and only sees a blank placeholder or an unknown-name warning.",
      "recommendation": "Specify validation and non-mutating failure for both message types, and require an actionable Jefferson diagnostic identifying the claimed provider and offending field or reason when safely available. State whether and how repeated faults are deduplicated."
    },
    {
      "id": "COM-6",
      "severity": "minor",
      "location": "specs/instrument-registration/spec.md — “A bare name means the default instrument of that name”; michael-orientation.md §3 T7",
      "finding": "The delta establishes that bare and fully qualified default names are the same instrument but does not state what happens if both spellings appear as keys in one instruments block.",
      "rationale": "Without a duplicate rule an author cannot predict which settings apply, and different implementations could silently choose different winners.",
      "concrete_case": "A document configures both path and jefferson.default.path with different formats.",
      "recommendation": "Normalize both spellings before duplicate detection, explicitly reject the duplicate under the existing document rule, and name the written keys in the diagnostic."
    },
    {
      "id": "COM-7",
      "severity": "minor",
      "location": "proposal.md — Documents and package impact; specs/extension-source-layout/spec.md — “The published contract resolves from the installed package”",
      "finding": "The planned author guide is named, but the proposal does not pin the operational prerequisites that make the two-message API usable.",
      "rationale": "A provider can miss registration by emitting from its factory, or fail outside pi if a runtime TypeScript subpath is loaded by plain Node. Whether a runtime import exists remains open, so the guide must follow the eventual package choice.",
      "concrete_case": "An extension author copies a factory-time emit, or adds a runtime import while assuming pi supplies pi-jefferson as an installed peer.",
      "recommendation": "Require an end-to-end author example that declares fields, registers at session_start, reports values including false, configures a namespaced entry, and stops timers at shutdown; explain dependency installation, testing and runtime-import limitations for the chosen contract surface."
    }
  ],
  "assumptions": [
    {
      "assumption": "The existing blank instrument displays placeholder text rather than necessarily an empty string.",
      "status": "verified"
    },
    {
      "assumption": "The host event bus carries no authenticated sender identity and does not replay past events.",
      "status": "verified"
    },
    {
      "assumption": "A report that changes displayed provider data should inherit the living store requirement to request a repaint.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Source code, package tarball, live host lifecycle and tests were not independently checked; platform and code facts are taken from the supplied research and orientation.",
    "No files were edited and pnpm was not run."
  ]
}