{
  "mode": "council",
  "lens": "council-codebase",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Nothing in the proposal contradicts the code, and every current-state citation I checked in the proposal and the four delta specs resolves on disk (`configuration.ts:84-89`, `:110`, `:228`, `:238`; `startup.ts:51`, `:68-71`, `:73`; `shipped.ts:15-21`; `instrument-binding.ts:18-21`; `package.json` `files`/`pi.extensions`; `ci.yml` `allowed()`; `tsconfig.json` includes). The gap is what the deltas leave unstated at the two new boundaries they create. Two rules must exist before design or the coder invents them: how a boolean becomes text (CC2), and what an on-call engineer sees when a provider's registration is refused or its resolver faults (CC1, CC3). Four more should be closed in the deltas rather than decided downstream: partial reporting (CC4), the block's two spellings colliding (CC5), which fallback a fault takes (CC6), and the contract's self-containment (CC8). Council verdict: the proposal is sound; these six spec sentences are the price of a plan that needs no decisions.",
  "findings": [
    {
      "id": "CC1",
      "severity": "blocking",
      "location": "specs/instrument-registration/spec.md — 'An extension registers its instruments over the pi event bus' (scenario 'A message of another shape') and michael-orientation.md O5/T8",
      "finding": "The deltas require a wrong-shaped registration to be refused but never require the refusal to be observable, and O5 leaves 'what a refused registration tells the user' to the design. The only scenario is 'nothing a row renders changes', which passes for an implementation that drops every payload in silence.",
      "rationale": "T8 records that a bus listener's exception reaches only `console.error` through the host's `safeHandler` (Chidi §1: `event-bus.js`), and the TUI may garble it. So a silent refusal is indistinguishable from 'never registered' — the exact question an on-call engineer asks when a provider's entry stays blank. Implementation-readiness standard §5 requires entry/decision/outcome logging and explicit error behaviour wherever a task adds an entry point, and the bus listener is the change's new entry point. Left as is, the refusal rule is unfalsifiable and the guide (D9) has nothing to tell providers to look for.",
      "concrete_case": "taiknr ships a payload with `instruments` as an array instead of an object. It is refused per the delta. The user's row shows the `blank` placeholder, `/jefferson` says nothing (`startup.ts:37-49` reports only row count), no toast fires, and the host's `console.error` is garbled by the TUI. Nothing anywhere distinguishes 'payload refused' from 'taiknr not installed' or 'name misspelt'.",
      "recommendation": "Add one requirement to `instrument-registration`: a refused registration, a refused `jefferson.*` claim, a second claim on a taken name, a report for an undeclared field and a report before registration each report themselves once, naming the claimed extension namespace, the instrument name and the fault, through the same path configuration warnings already use. Then O5 decides the wording, not whether there is any."
    },
    {
      "id": "CC2",
      "severity": "blocking",
      "location": "specs/instrument-registration/spec.md — 'A registration declares the fields Jefferson keeps' (scenario 'A boolean field'); specs/session-data-store/spec.md — 'Unknown is a distinguished value'; extensions/jefferson/data/session-data-store.ts:5-7,23-37; extensions/jefferson/components/instruments/instrument.ts:32-34; extensions/jefferson/format.ts:216-224",
      "finding": "D8's boolean cannot get from a declaration to a rendered entry under the current types, and the delta's assertion is circular: 'the entry renders what its format gives `false`' states no rule for what a format gives `false`.",
      "rationale": "`Reading` is `string | undefined` (`session-data-store.ts:6`) and `Readings` is a closed interface (`:23-37`). A declaration's `variables` are `(readings: Readings) => string | undefined` (`instrument.ts:32-34`), and `resolveFormat` builds `Map<string, string>` and returns `\"\"` for any `undefined` (`format.ts:217-223`). The session-data-store delta widens the store's value domain to include `false` ('distinguishable from … false', 'not a false'), which `Reading` cannot hold. The existing `variableForms` mechanism cannot express true/false either: a form is a resolver chosen by `|name` in the format, not by the value. So the only way a reported `false` differs from unknown is a conversion rule that no artifact states — and the coder must invent it, which standard §1 forbids.",
      "concrete_case": "taiknr declares `working: boolean`, reports `false`, and the user writes `\"format\": \"$working\"`. Either the declaration fails typecheck (`boolean` is not `string | undefined`), or `false` is coerced to `\"false\"` and the footer prints the word, or it is dropped to unknown and the whole cell blanks — three different user-visible outcomes, none of them stated. Change 3 (the spinner, D8) is built directly on this.",
      "recommendation": "State the conversion in the delta: a boolean field reads as the word `true`/`false` in a format (or: a boolean field is declarable and readable but renders only through a visual, which is change 3's to add). Either sentence makes D8 testable; silence makes it a per-coder coin flip."
    },
    {
      "id": "CC3",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md — 'Provider code costs one entry and no more' (scenario 'A fault the host would not show')",
      "finding": "'Jefferson MUST report the fault itself' names no destination and no repetition bound, and the obvious implementation reports on every render.",
      "rationale": "A cell's text is resolved per width per sample: `row-renderer.ts:36-77` (`textAt`) is called for the probe width 0, the host's measure and the cell allocation, and the footer repaints on every turn boundary, model select and notice arrival (`session-data-feed.ts:64-71`, store `requestRender` calls). A resolver fault therefore fires many times per frame, and the only current user-facing channel is `ctx.ui.notify` (`startup.ts:73`), which is a toast. Reporting per occurrence is unbounded toast spam, and the delta cannot tell that implementation from a correct one.",
      "concrete_case": "taiknr's `saved` resolver throws because a host datum changed shape. With one toast per throw, a single turn repainting at three widths produces at least three warnings, and a 40-turn session produces over a hundred — a footer that is unusable rather than merely one cell short.",
      "recommendation": "Pin the destination and the bound in the delta: report once per (instrument, fault kind) per session, or to `console.error` with a `pi-jefferson:` prefix, or both — and say which. A once-per-session rule is also what makes the requirement testable in one assertion."
    },
    {
      "id": "CC4",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md — 'A declared field a format names' / 'A provider reports a value for a declared field' (scenario 'Two reports before one render'); extensions/jefferson/format.ts:217-223; docs/instruments.md:70",
      "finding": "The deltas never state what a partially reported instrument renders, and today the answer is 'nothing at all': one unknown variable empties the whole cell, label included.",
      "rationale": "`resolveFormat` returns `\"\"` if any declared variable resolves to `undefined` (`format.ts:222`), and `docs/instruments.md:70` states it for users: 'When an instrument's data is unknown, the entry renders nothing, the label included.' Every instrument-registration scenario sidesteps this by reporting all declared fields ('Two reports before one render' reports both). So a provider that declares three fields and reports one gets an empty entry and no rule telling it why, and the guide (D18) has nothing accurate to say.",
      "concrete_case": "taiknr declares `saved`, `omitted` and `working`, and reports only the two numbers on a turn where it made no decision calls. The entry renders empty on exactly those turns, so the savings the user asked for ('A measurement of stubs created, including a total tokens they hold') disappear whenever the decision-call flag is unreported — the inverse of what the spinner change wants.",
      "recommendation": "Add a scenario pinning today's rule ('a declared field nobody has reported renders the entry nothing, label included') or an explicit change to it. This belongs in the guide verbatim either way."
    },
    {
      "id": "CC5",
      "severity": "major",
      "location": "specs/statusline/spec.md — 'A bare name means the default instrument of that name' (scenario 'A bare name in the instruments block'); extensions/jefferson/configuration.ts:106-176",
      "finding": "The delta requires `path` and `jefferson.default.path` in the `instruments` block to name one instrument, but says nothing about a document that carries both. Today it would warn on one and use the other; after the change both resolve, and the configured map is keyed by `declaration.name` (`:170`), so the later key silently overwrites the earlier.",
      "rationale": "`readInstruments` writes `configured.set(declaration.name, …)` in `Object.entries` order (`configuration.ts:106-176`), and `instrumentBindings` memoizes by `declaration.name` (`instrument-binding.ts:21`). Two keys that normalize to one name therefore produce last-wins with no notice — a silent, key-order-dependent result where a user today gets an unknown-name warning for the second key. T7 records the duplicate as a hazard but no delta requires anything of it.",
      "concrete_case": "`{\"instruments\": {\"path\": {\"format\": \"A\"}, \"jefferson.default.path\": {\"format\": \"B\"}}}` renders `B`. Swap the two keys and it renders `A`. Neither order warns, and ARCHITECTURE.md:89's 'configures each name once' is violated silently.",
      "recommendation": "Add a scenario to the `instruments`-block requirement: two spellings of one instrument in one block are a fault that names both keys (and, per D14, rejects the document, since this is a fault in the document's shape and known at read time). That also gives the design the rejection string it needs, which Joel should approve at review."
    },
    {
      "id": "CC6",
      "severity": "major",
      "location": "specs/statusline/spec.md — ADDED 'A provided instrument's settings are checked when it registers' vs specs/instrument-registration/spec.md — 'Provider code costs one entry and no more'; components/instruments/blank.ts:4-10; docs/instruments.md:58-70",
      "finding": "The deltas use two different fallbacks for two provider-side faults and never say which is which: a settings fault renders `blank` (the instrument: filled, placeholder text), a resolver fault 'renders nothing' (empty, label suppressed).",
      "rationale": "S7 pins 'renders blank' to the `blank` instrument, whose `defaultFormat` is `DEFAULT_CELL_TEXT` and whose `fills` is `true` (`blank.ts:6-9`), so a `blank` cell swallows the row's spare columns and prints the placeholder. The instrument-registration delta says a throwing resolver makes the entry 'render nothing' — the unknown-datum behaviour, `docs/instruments.md:70`. These are two established, distinguishable behaviours in this codebase (unknown name vs unknown datum), and the deltas pick one each without saying so, nor whether a faulted cell keeps its `fills` geometry.",
      "concrete_case": "A two-cell row whose second cell is taiknr's `fills` instrument. A misspelt variable in its settings paints a full-width lorem-ipsum strip; a throwing resolver paints empty columns. Same provider, same user, two symptoms, and nothing in the spec lets an on-call engineer say which fault produced which picture.",
      "recommendation": "State the fallback in each requirement and its geometry: settings fault → the `blank` instrument (as an unknown name does, per Joel's answer to J1); resolver fault → empty text with the key's `fills` unchanged. One clause each; it removes an arbitrary choice from the coder."
    },
    {
      "id": "CC7",
      "severity": "major",
      "location": "proposal.md — Impact/Source; extensions/jefferson/configuration.ts:43-48,335; tests/configuration.test.ts:36-52; tests/jefferson.test.ts:94-107",
      "finding": "Resolution moving to what has registered changes the input contract of an exported, pinned function (`readConfiguration`/`ConfigurationSource`) and requires `events` on the test harness's fake `pi`. The proposal's Impact names 'the configuration reader' but neither the signature ripple nor the two test helpers.",
      "rationale": "`ConfigurationSource` is a four-field exported interface (`configuration.ts:43-48`) consumed by `readConfiguration` (`:335`) and pinned by the export test (`tests/jefferson.test.ts:428-431`). Eight direct call sites exist in tests (`configuration.test.ts:46,132,399,415,429,926,928,1233`; `instrument.test.ts:313`), most through the single `readDocument` helper (`configuration.test.ts:37-51`). Separately, S4 registers the built-ins from the factory, and the fake `pi` at `tests/jefferson.test.ts:94-107` has `registerCommand` and `on` only, so accessing `pi.events` there throws in the factory and every end-to-end test in that file (42 `harness()` call sites) fails before asserting anything. T15 mentions 'a test of registration'; the real ripple is the shared harness plus eight configuration call sites.",
      "concrete_case": "The coder adds `readConfiguration(source & { registry })`; 8 test call sites and the pinned export key list change, and `harness()` must grow a real `createEventBus()` bus before any of the 36 end-to-end tests can run. None of that is in the Impact list, so it surfaces mid-implementation as unplanned work.",
      "recommendation": "Name the seam in design (`ConfigurationSource` gaining a resolver/registry, or `readConfiguration` becoming a closure) and list `tests/configuration.test.ts`, `tests/instrument.test.ts` and `tests/jefferson.test.ts:86-110` as Modify targets in the plan."
    },
    {
      "id": "CC8",
      "severity": "major",
      "location": "specs/extension-source-layout/spec.md — ADDED 'The published contract resolves from the installed package'; AGENTS.md:29; tsconfig.json",
      "finding": "The delta pins where the contract lies but not that it must be self-contained. Every source file in this repo imports with an explicit `.ts` extension (repository rule, `AGENTS.md:29`), and a provider's `tsc` rejects that specifier form unless `allowImportingTsExtensions` is on — a flag this repo sets (`tsconfig.json`) and a provider probably will not.",
      "rationale": "Chidi §4b measured that the `exports` mapping itself type-checks under `nodenext` with and without `allowImportingTsExtensions`; it did not measure a contract file that *contains* `import … from \"./x.ts\"`. Under `nodenext`, extensionless relative imports are errors (TS2835) and `.ts` specifiers need the flag (TS5097), so a contract with any sibling import is only compilable by a provider whose tsconfig matches Jefferson's. `AGENTS.md` and `docs/` already promise providers a copy-paste path, and T11's 'a self-contained contract file keeps that surface small' is a record, not a requirement.",
      "concrete_case": "The contract is placed inside `extensions/jefferson/` and imports `type { Readings } from \"./data/session-data-store.ts\"` and `type { InstrumentDeclaration } from \"./components/instruments/instrument.ts\"`. A provider with a stock `nodenext` tsconfig and no `allowImportingTsExtensions` gets TS5097 on the package's own file and cannot type-check at all.",
      "recommendation": "Add one testable clause: the contract file imports no other source file, and its types are declared in it (with the store's provider-field type deriving from it, per T14). This is unverified by measurement — a three-line `tsc` check in a `mktemp -d` settles it and belongs to Chidi."
    },
    {
      "id": "CC9",
      "severity": "minor",
      "location": "proposal.md — Impact/Package and shipping; package.json:19-23; .github/workflows/ci.yml:52-57",
      "finding": "'`package.json` gains an `exports` entry for the contract, and `files` plus the CI expectation follow it' asserts a `files` change that the delta makes unnecessary and, on the delta's own rule, impossible.",
      "rationale": "The delta requires the contract to lie 'where the type check and the tarball already reach'. `files` already ships `extensions` (`package.json:19-23`), `tsconfig.json` includes `extensions/**/*.ts`, and CI's `allowed()` permits any path under `extensions/` and rejects everything else (`ci.yml:52-57`). So under the only legal placement, `files` does not change; what changes is a new CI assertion on the export target plus the export-pin test.",
      "concrete_case": "The coder reads the Impact list, adds the contract path to `files`, and either duplicates a root that already ships or puts the file outside `extensions/`, where CI's stray-path check fails the build.",
      "recommendation": "Say '`package.json` gains an `exports` entry; `files` already ships it; CI gains one assertion'. Two words, one avoided detour."
    },
    {
      "id": "CC10",
      "severity": "minor",
      "location": "tests/jefferson.test.ts:19-23; node_modules/@earendil-works/pi-coding-agent/dist/core/package-manager.js:1887-1902, 1934-1948; michael-orientation.md T15 citation",
      "finding": "A current-state record in the repo is contradicted by pi 1.4.0's source: the comment says pi loads every direct `.ts` file in `extensions/`, but package discovery is manifest-first, so with `pi.extensions` present the convention directory is never scanned. Separately, T15 cites `tests/jefferson.test.ts:150-200` for the harness's fake `pi`; the fake `pi` is at `:94-107`.",
      "rationale": "`collectDefaultResources` reads the manifest and returns early when `pi.extensions` is present (`package-manager.js:1887-1902`), and `collectManifestFiles` does the same (`:1934-1948`); the directory scan that would pick up a direct `.ts` child (`:408-459`) is only reached without a manifest. So the placement rationale for O4 should rest on the tsconfig/tarball constraints (which are certain), not on this comment. T15's citation is off by ~50 lines but points at a real absence (`fakePi` has no `events`).",
      "concrete_case": "A design that places the contract at `extensions/instruments.ts` and justifies it with 'a subdirectory is required or pi would load it' is arguing from a claim pi's own code refutes; conversely a design that trusts the comment and places it in `extensions/x/index.ts` is safe only because the manifest exists, which the comment does not say.",
      "recommendation": "Correct the comment in the same change (it is a shipped-source comment, not user docs), and do not let the placement decision lean on it. Fix T15's line range when the design quotes it."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every existing path, symbol, signature and line range cited by the proposal and the four delta specs as current state resolves on disk as cited.",
      "status": "verified"
    },
    {
      "assumption": "`renders blank` means the `blank` instrument (fills the row's leftover columns, prints `DEFAULT_CELL_TEXT`), which differs observably from 'renders nothing'.",
      "status": "verified"
    },
    {
      "assumption": "A format whose declared variable is unknown renders the whole cell empty, label included.",
      "status": "verified"
    },
    {
      "assumption": "The store's value domain cannot currently hold a boolean (`Reading = string | undefined`, closed `Readings` interface).",
      "status": "verified"
    },
    {
      "assumption": "pi 1.4.0 resolves a package's extensions from `pi.extensions` and does not also scan the `extensions/` convention directory.",
      "status": "verified"
    },
    {
      "assumption": "A provider's `tsc` rejects an explicit `.ts` relative import inside the contract unless `allowImportingTsExtensions` is set.",
      "status": "unverified"
    },
    {
      "assumption": "A `.ts` file placed inside `extensions/jefferson/` satisfies both the tarball and the type check without touching `files`.",
      "status": "verified"
    },
    {
      "assumption": "The `blank` fallback for a J1 refusal is what Joel's option (b) meant by 'render blank, as an unknown name does'.",
      "status": "verified"
    },
    {
      "assumption": "The single `Configuration.warning` string can absorb three warning sources at two delivery times without a shape change.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "Where should a provider's refused registration or resolver fault surface, so an on-call engineer can tell 'taiknr is broken' from 'taiknr is absent'?",
      "options": [
        "One warning per instrument per session through the existing `ctx.ui.notify` path, plus a line in `/jefferson`",
        "`console.error` with a `pi-jefferson:` prefix only, matching how the host reports bus-listener errors",
        "A warning on every occurrence, unbounded"
      ],
      "recommended_option": "One warning per instrument per session through the existing `ctx.ui.notify` path, plus a line in `/jefferson`",
      "why": "It reuses the one channel this extension already reports faults on (`startup.ts:73`) and the one command a user can ask (`startup.ts:37-49`), and the once-per-session bound is what makes the requirement testable. Unbounded toasts are unusable at three widths per repaint."
    },
    {
      "question": "May `/jefferson`'s output gain the registered instrument names and the refused ones? Its current strings are pinned by a test and its row-count sentence reads as Joel-approved.",
      "options": [
        "Yes — add a section listing registered and refused instruments, with new strings for Joel to approve at review",
        "No — keep `/jefferson` exactly as it is and put triage in `console.error` only",
        "No — add a separate read-only command for registration state"
      ],
      "recommended_option": "Yes — add a section listing registered and refused instruments, with new strings for Joel to approve at review",
      "why": "`/jefferson` is the only place a user can ask what is installed, and 'which instruments registered' is the first question for a blank entry. It costs no new mechanism, but the strings are user-facing, so they go to Joel rather than being invented in the design."
    }
  ],
  "not_checked": [
    "`openspec validate --strict` on these deltas (no shell tool in this session, and no pnpm run).",
    "The full text of `docs/releasing.md`, the ADR set beyond their titles, and `README.md`'s index — the docs pass is Bambadjan's and T16 marks it non-blocking.",
    "pi 1.5.2 behaviour; all platform checks above are against the repository's pinned 1.4.0.",
    "Whether `tsc` really rejects a `.ts` specifier inside a dependency file (CC8) — inferred from the flag's contract, not measured.",
    "The other nine test files' direct use of `harness`-like fakes (`tests/session-data-feed.test.ts` has its own fake `pi`); I checked `tests/jefferson.test.ts`, `tests/configuration.test.ts`, `tests/instrument.test.ts` and `tests/row-renderer.test.ts` only.",
    "Whether any shipped instrument's declaration would fail type-check under a widened `Reading`; I verified the type shape and `format.ts`'s string map, not every declaration file."
  ]
}