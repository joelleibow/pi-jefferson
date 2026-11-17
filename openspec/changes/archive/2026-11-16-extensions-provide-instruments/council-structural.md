{
  "mode": "council",
  "lens": "council-structural",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design. The delta set is faithful to every ruling (D2–D8, J1-b) and the proposal's capability split is sound, but four major structural gaps must be closed before or during drafting: the registration payload's content has no requirement home while two other deltas presuppose it; the closed home enumerations in the living extension-source-layout spec will be falsified by files this change must add; provider-field data enters the store through a path no store-capability requirement admits, with no repaint rule; and 'Jefferson MUST report the fault itself' names no observable. Six minor drift risks (duplicated facts, a prefix-matched namespace refusal, a boundary crossed by the bare-name rule) should be fixed in delta text at low cost.",
  "findings": [
    {
      "id": "S-1",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md (requirements 'An extension registers its instruments over the pi event bus', 'A registration declares the fields Jefferson keeps', 'A provider's resolver reads only its own declared fields') and specs/statusline/spec.md (ADDED 'A provided instrument's settings are checked when it registers')",
      "finding": "What a registration carries beyond declared fields is stated by no requirement, while other deltas depend on it. instrument-registration requires only the extension name, per-instrument 'its declaration' (an undefined term), and fields with types; yet statusline's J1 requirement checks 'a format naming a variable its registration does not declare' and 'an option its registration does not declare', and the resolver requirement presupposes 'a resolver a provider supplies'. This also contradicts the proposal's own discipline claim that the deltas on O5 matters 'state no more than that'.",
      "rationale": "One home for each fact: the capability whose purpose is 'what an extension registers' must own the content categories of a registration, or the requirements that reference them are unsatisfiable and untestable. Michael's S1 settles that the payload carries resolver functions, and O4/O5 settle the wire shape — but content categories (fields, format variables, options, default format, resolvers) are load-bearing for two other deltas today.",
      "concrete_case": "An implementer registers {extension: 'taiknr', instruments: [{name: 'savings', fields: [{name: 'saved', type: 'string'}]}]} — no resolver, no variable list, no options. Every instrument-registration requirement passes; the statusline J1 scenario 'A variable the registration does not declare' has no referent to check against, and the entry renders nothing because no requirement ever required a resolver to exist.",
      "recommendation": "Add one requirement to instrument-registration stating that a registration carries, per instrument, its declaration: the fields Jefferson keeps, the format variables it names, the options it accepts, its default format, and the resolvers that produce its text — leaving the exact wire shape to the contract (O4/O5). Alternatively, record explicitly in the proposal that the statusline J1 delta is blocked on O4/O5 landing with variable and option declarations."
    },
    {
      "id": "S-2",
      "severity": "major",
      "location": "openspec/specs/extension-source-layout/spec.md lines 103 ('Responsibility is inferable from path'), 219 ('Each responsibility has a home recognizable from its path'), 327 ('The source tree has the ruled homes'); delta at specs/extension-source-layout/spec.md",
      "finding": "The extension-source-layout delta modifies the instrument-file and import requirements but leaves the living closed home enumerations untouched, and this change must add files those enumerations do not admit: at minimum the published contract file, and whatever home holds registrations, reported values and bus listeners.",
      "rationale": "Structural completeness: a living requirement whose closed list ('MUST sit directly', 'components/instruments/ MUST hold instrument.ts, instrument-binding.ts, compact-count.ts and one file per instrument') is falsified by implementation must be modified in this change's delta, per the same standard the change applies to the retired export rule (R1). O3/O4 defer which home is chosen, not whether new homes appear.",
      "concrete_case": "The design lands a registry or contract file anywhere under extensions/jefferson/ (or a contract at the extensions/ level beside the ruled tree): 'The source tree has the ruled homes' now names files the tree does not carry, and 'Responsibility is inferable from path' enumerates five responsibilities with no home for registration or the contract — a reviewer reading the living spec sees a tree the spec forbids.",
      "recommendation": "Extend this change's extension-source-layout delta to modify 'The source tree has the ruled homes' and 'Responsibility is inferable from path' once O3/O4 pick the homes, ruling where the contract file, the registration handler and the pre-store holding sit and what each may import. The design must not land new files against an unmodified closed enumeration."
    },
    {
      "id": "S-3",
      "severity": "major",
      "location": "specs/session-data-store/spec.md (delta) vs openspec/specs/session-data-store/spec.md lines 9, 169, 192, 232; also specs/instrument-registration/spec.md requirement 'A provider reports a value for a declared field'",
      "finding": "Provider-reported fields are a new class of store data with no home for their lifecycle. The session-data-store delta modifies only 'Unknown is a distinguished value'; the living store spec speaks of 'the extension's instruments' (:9), says a new datum enters 'the store and the feed' (:232), and requires a repaint only for 'a change the store receives' (:192) — none states that a provider report is such a change, that provider fields enter by report rather than feed wiring, or that a report repaints.",
      "rationale": "Separation of responsibilities: the store capability owns how data enters, stays current, repaints and dies; instrument-registration owns declaration and report. As written, instrument-registration's 'visible from the next render' is passively satisfiable and the store capability is silent or contradictory about the new class. O3 defers where values live before the store exists — not entry path, currency or repaint.",
      "concrete_case": "taiknr reports working=true on a decision call (Joel's explicit want: 'provide affordance that it's happening'). No turn ends, so nothing else repaints; the delta text is satisfied ('visible from the next render') and the user never sees the affordance. Separately, a reader taking :232's title literally concludes provider fields must enter through the feed, which they cannot.",
      "recommendation": "Add one session-data-store delta requirement (or extend :9/:232) stating that a field a provided instrument's registration declares is store data: it enters by report and by nothing else, reads unknown until reported, repaints on change under the existing :192 rule, and dies with the session under the existing :169 rule. Let instrument-registration reference it rather than restate it (see S-5)."
    },
    {
      "id": "S-4",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md, requirement 'Provider code costs one entry and no more', scenario 'A fault the host would not show'",
      "finding": "'Jefferson MUST report the fault itself' states an obligation with no observable: no channel, no format, no user-visible effect, and the scenario is circular ('THEN Jefferson reports the fault itself, because the host's only report is its console').",
      "rationale": "Calibrated claims: a MUST whose satisfaction cannot be distinguished from its violation is not a requirement. Containment is testable (the other two scenarios are); reporting is not. Michael's O6 covers containment only, so the reporting channel is currently unowned by both the deltas and the open-question list.",
      "concrete_case": "An implementation catches a provider resolver's throw silently. All containment scenarios pass; nothing in any test or spec can fail, because 'reports the fault' names nothing a user, operator or test can observe.",
      "recommendation": "Name the observable — e.g. 'Jefferson MUST write the fault to the host console' (matching Chidi's measured console.error path), or an entry-level fault marker — or strike the MUST and hand the decision to the design as a named open item next to O6."
    },
    {
      "id": "S-5",
      "severity": "minor",
      "location": "specs/instrument-registration/spec.md, requirement 'A provider reports a value for a declared field' ('MUST NOT survive a session replacement') vs openspec/specs/session-data-store/spec.md:169",
      "finding": "The session-replacement rule is restated: session-data-store :169 already owns 'Store data does not survive a session replacement', and instrument-registration repeats it for reported values.",
      "rationale": "One home for each fact: if replacement semantics ever change (for example, values inherited across a fork), a change editing session-data-store alone leaves instrument-registration contradicting it.",
      "concrete_case": "A later change makes fork inherit reported fields and edits session-data-store :169; instrument-registration's scenario 'A report after a session replacement' now asserts the opposite without having been reviewed.",
      "recommendation": "Scope instrument-registration's sentence to what the registration contract guarantees ('a report reaches only the session it was reported in') and let the S-3 store requirement carry the replacement rule, or fold the provider-field case into session-data-store's :169 scenarios in this delta."
    },
    {
      "id": "S-6",
      "severity": "minor",
      "location": "specs/statusline/spec.md MODIFIED 'Cell text is the instrument its entry names' (scenario 'Contributing cell content') vs specs/extension-source-layout/spec.md ADDED 'The export surface offers registration and no other way to contribute cell content'",
      "finding": "The rule 'registration is the only way to contribute cell content' is now stated twice with near-verbatim overlap: statusline's scenario ends 'the package offers no other way to supply or replace a cell's content', restating the export-surface facet that the extension-source-layout ADDED requirement and its pin own.",
      "rationale": "The historical rule legitimately lived in two homes with distinct facets (document behavior vs export surface); this change's statusline rewrite blurs the facets by asserting the package-surface fact inside the document-behavior capability.",
      "concrete_case": "A later change adds a second contribution path and must find and edit statusline, extension-source-layout and the pin; missing one leaves the two specs contradicting each other on the same sentence.",
      "recommendation": "Keep statusline's facet to document naming ('it registers an instrument the document then names') and leave 'the package offers no other way' to extension-source-layout's ADDED requirement, which owns the export pin."
    },
    {
      "id": "S-7",
      "severity": "minor",
      "location": "specs/instrument-registration/spec.md, requirement 'A provided instrument's name is namespaced to its extension', scenario 'A name in Jefferson's namespace'",
      "finding": "The namespace refusal scenario is phrased as a string prefix: 'WHEN an extension tries to register a name that begins with `jefferson`'. The requirement's intent is the first dotted segment, and the prefix reading refuses innocent names. The related consequence — an extension actually named `jefferson` cannot provide any instrument — is intended but stated nowhere.",
      "rationale": "Calibrated, implementable scenarios: a literal reading of the scenario over-reaches the requirement text ('The `jefferson` namespace MUST belong to Jefferson alone' means the namespace part, not the string).",
      "concrete_case": "An extension named `jeffersonfan` registers `jeffersonfan.stats`; a literal implementation of the scenario refuses it because the name 'begins with `jefferson`'. Likewise a user's own local extension named `jefferson` silently loses the ability to provide anything.",
      "recommendation": "Reword the scenario to 'whose first part is `jefferson`', and state once (requirement or guide) that an extension named `jefferson` cannot provide instruments — with the refusal warning O5 defines naming the cause."
    },
    {
      "id": "S-8",
      "severity": "minor",
      "location": "specs/instrument-registration/spec.md, requirement 'A bare name means the default instrument of that name', vs specs/statusline/spec.md MODIFIED 'An entry names the instrument its cell renders' and 'An instrument's configuration lives in the extension's own document'",
      "finding": "The bare-name shorthand — a rule about what a user's document means ('in a row's entry and in the `instruments` block') — is homed in the author-facing registration capability, while the proposal assigns document semantics to statusline. Statusline's modified requirements now depend silently on a requirement in another capability.",
      "rationale": "Scope boundaries: the proposal's own split says 'statusline states what a document declares'; the shorthand is document behavior. Housing it in instrument-registration is defensible as 'the name system', but the cross-capability dependency is nowhere acknowledged, inviting drift.",
      "concrete_case": "A reader of statusline alone cannot learn that `instruments: {path: …}` and `jefferson.default.path` are one configuration (the T7 duplicate collapse); a later change to the shorthand edits instrument-registration only, and statusline's 'One configuration, two cells holding it' behavior changes with no statusline delta.",
      "recommendation": "Either move the shorthand requirement into statusline (keeping the grammar in instrument-registration), or have statusline's 'An entry names the instrument its cell renders' state that name resolution follows the registration capability's grammar, so the dependency is explicit."
    },
    {
      "id": "S-9",
      "severity": "minor",
      "location": "specs/extension-source-layout/spec.md, ADDED 'The published contract resolves from the installed package', scenario 'What the host loads'; vs openspec/specs/extension-source-layout/spec.md:14 ('One host-loaded entry per extension')",
      "finding": "The ADDED contract requirement's scenario restates the one-host-loaded-entry invariant ('they still name exactly one entry, the extension's own') that the living 'One host-loaded entry per extension' requirement already owns.",
      "rationale": "One home for each fact: the entry-count rule has a standing home with its own CI assertion; restating it in the contract requirement means a later change to entry rules must edit two requirements.",
      "concrete_case": "A later change to how entries are declared edits :14 only; the contract requirement's scenario silently asserts the old invariant and the specs contradict.",
      "recommendation": "Keep the contract requirement's claim to what is new — 'the contract's export adds no `pi.extensions` entry' — and drop the restatement of the standing invariant."
    },
    {
      "id": "S-10",
      "severity": "minor",
      "location": "specs/instrument-registration/spec.md, requirement 'A provider registers once a session has started and stops at shutdown', scenarios 'A registration from a factory' and 'Reporting after the session ends'",
      "finding": "The requirement mixes Jefferson-testable guarantees with provider-side obligations Jefferson cannot enforce: 'a provider MUST NOT rely on it' and 'the provider's own call throws' describe third-party experience (the stale-context throw is pi's behavior, per T12), which no test in Jefferson's suite can pin.",
      "rationale": "Calibrated claims: a capability requirement's MUSTs should name what the system under spec does. Provider-side duties are the guide's and contract's promises (D4, D9), verified by the author's own experience, not by Jefferson's tests.",
      "concrete_case": "A reviewer asks which test pins 'Reporting after the session ends'; the answer is none — the throw happens inside the provider's process, in code Jefferson neither ships nor runs.",
      "recommendation": "Keep the requirement but state in the capability Purpose (or in the design) that provider-side MUSTs are the contract's promises to authors, carried by docs/extension-authors.md and the contract's types, while Jefferson's tests pin only Jefferson's side: accepting registrations from session_start or later, and sending no readiness message."
    }
  ],
  "assumptions": [
    {
      "assumption": "Delta requirement titles match the living specs exactly for every MODIFIED and REMOVED requirement (statusline :433/:1539/:1603; session-data-store :55; extension-source-layout :205/:308/:346).",
      "status": "verified"
    },
    {
      "assumption": "No ruling (D1–D9, J1-b, inherited D10–D18, R1) is contradicted by any delta: declare/report vocabulary, one message pair, name grammar with three parts, bare-name shorthand, J1 option b, boolean fields, published contract, no spinner.",
      "status": "verified"
    },
    {
      "assumption": "statusline's living 'An instrument is declared once, and every reader reads that declaration' (:413) survives unmodified because a registry holding declaration references is not a second table of names — this is a design-time obligation the design must uphold, not a delta gap.",
      "status": "verified"
    },
    {
      "assumption": "This change must add at least one new source file (the contract) regardless of how O3/O4 resolve, so the closed home enumerations in extension-source-layout will be falsified (finding S-2).",
      "status": "unverified"
    },
    {
      "assumption": "A provider report is not covered by session-data-store's existing repaint rule (:192) as written, because that rule's 'a change the store receives' has only ever meant feed pushes and sampled reads (finding S-3).",
      "status": "unverified"
    },
    {
      "assumption": "Platform facts (T1–T15: no bus replay, factory ordering, stale contexts, console.error-only handler errors, module copies per extension, tsconfig/CI reach) as recorded by Michael and Chidi are accurate; I spot-checked them against the research reports, not against pi's source.",
      "status": "unverified"
    },
    {
      "assumption": "Michael's S1 (the registration payload carries resolver functions) is a settled design decision supported by the cited evidence (ten of eleven shipped declarations carry functions; the bus passes payloads by reference), and challenging it is unwarranted.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No code was executed, no pnpm was run, and no files were edited; all code-level citations rest on the Eleanor, Chidi and Michael reports, which I read but did not independently re-verify beyond the living spec texts.",
    "I did not run pi or exercise the event bus, reload, /new, /resume or /fork; lifecycle and timing claims (T1–T5, T10–T12) are taken from the research artifacts.",
    "No design.md or tasks.md exists yet (pre-design), so module/file placement and task alignment could not be audited; S-2 flags the placement risk for that stage.",
    "The docs-pass items folded in by ruling (CONTRIBUTING.md, the releasing ADR, docs/extension-authors.md) were not structurally audited; they are settled scope, not re-opened.",
    "Whether a frame paints between install and a late registration (O10) was not measured; S-3's repaint finding is independent of it.",
    "The payload's exact wire shape, duplicate-claim rules, refused-registration messaging, and channel names (O4, O5, O7) were deliberately left to the design per the proposal's own deferral; my findings address only where those decisions must land so other requirements remain satisfiable."
  ]
}