{
  "mode": "council",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design after tightening the two spec details below. The event-based registry solves the actual fixed-table limitation and is explicitly required; no existing Jefferson module already provides it. Keep the implementation centered on the existing declaration, binding, format, store and repaint paths. Prefer a types-only published contract unless a concrete runtime-helper benefit outweighs the documented installation and plain-Node costs; do not add a parallel provider renderer, second declaration vocabulary, service container or compatibility framework. Put bus subscriptions and notifications in startup/wiring, registration policy in its owning application module, provider values in data/, and late geometry handling in the existing row renderer. The design should justify any new module and preserve inward dependencies rather than choosing a contract location solely because it ships.",
  "findings": [
    {
      "id": "ZO-1",
      "severity": "major",
      "location": "openspec/changes/extensions-provide-instruments/specs/instrument-registration/spec.md — Requirement: Provider code costs one entry and no more",
      "finding": "The blanket rule that a resolver returning anything other than a string is faulty does not match the declaration shape this change must reuse. It conflates the final instrument render result with the callbacks inside an InstrumentDeclaration.",
      "rationale": "Direct source inspection shows variables and forms legitimately return undefined, bar returns number|null, and shownUntil returns number|undefined (extensions/jefferson/components/instruments/instrument.ts:15-61). Existing formatting treats undefined as ordinary unknown rather than a provider fault (extensions/jefferson/format.ts, resolveFormat). Michael requires the same declaration type for shipped and provided instruments (§2) and correctly settles that declarations carry functions (§4). A universal string-only callback guard would require an unnecessary second contract or reject valid uses of that shared contract. This does not challenge containment; it makes containment compatible with reuse.",
      "concrete_case": "A provider declares a field but has not reported it yet, so its variable resolver returns undefined. The unknown-field requirements say this is normal unknown, but the containment wording requires reporting a fault. Likewise a provided bar returning 42 has the same valid shape as context.bar in extensions/jefferson/components/instruments/context.ts, yet violates the blanket string-only wording.",
      "recommendation": "State that the final bound render must yield text and that each declaration callback must satisfy its own declared return contract. Preserve undefined/null where the existing callback type allows them; treat unexpected results, promises and throws as contained faults. Add a small scenario distinguishing a valid unknown variable and valid numeric bar from a genuinely invalid resolver result."
    },
    {
      "id": "ZO-2",
      "severity": "minor",
      "location": "openspec/changes/extensions-provide-instruments/specs/instrument-registration/spec.md — Requirement: A bare name means the default instrument of that name; Scenario: One name in two spellings, two rows",
      "finding": "The scenario adds 'a notice shows once rather than twice' to name normalization, potentially requiring presentation deduplication across two explicitly configured entries.",
      "rationale": "The existing name-keyed binder already shares one instrument across entries while each cell renders independently (extensions/jefferson/components/instruments/instrument-binding.ts:18-75; extensions/jefferson/components/row/row-renderer.ts:39-70). The statusline delta explicitly retains 'One configuration, two cells holding it'. Normalizing aliases should preserve that behavior, not introduce a notice-specific deduplication mechanism. No owner ruling asks for suppression of an explicitly placed second notice entry.",
      "concrete_case": "Two configured rows contain notice and jefferson.default.notice respectively. With one active notice datum, the natural shared-binding implementation renders the notice in both requested entries. An implementation following 'shows once' literally must choose which entry to suppress or add cross-cell state.",
      "recommendation": "Make the scenario assert that both entries use the same normalized declaration, settings and notice gate. If 'once' means a single subscription/timer rather than one visible entry, say that explicitly; do not add cross-entry display suppression."
    }
  ],
  "assumptions": [
    {
      "assumption": "Opening the fixed shipped lookup is necessary: production name resolution currently goes through shipped.ts, and there is no existing pi.events registry in Jefferson to reuse.",
      "status": "verified"
    },
    {
      "assumption": "The current declaration/binding/format path already supports the executable declaration shape needed by providers, so a parallel formatting engine is unnecessary.",
      "status": "verified"
    },
    {
      "assumption": "A contract under extensions/ is reached by the existing files allowlist and extensions/**/*.ts typecheck include.",
      "status": "verified"
    },
    {
      "assumption": "A types-only contract avoids the runtime import and duplicate-module-state costs identified by Chidi; the exact installed-consumer contract still needs validation once its shape is designed.",
      "status": "unverified"
    },
    {
      "assumption": "The startup-completion marker and late-binding mechanism remain design decisions; no runtime experiment in this review establishes them.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No files edited; no pnpm, tests, compiler, live pi session or temporary experiment run.",
    "Platform lifecycle, loader and installed-package claims were assessed from the required research and orientation, not independently exercised.",
    "No design exists yet, so exact new-file placement, import graph, callback containment and session-state ownership cannot yet be approved.",
    "Did not measure first-frame timing, installed-consumer compiler compatibility or startup-completion ordering; those remain implementation/design validation risks."
  ]
}