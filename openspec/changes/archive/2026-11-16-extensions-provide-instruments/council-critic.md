{
  "mode": "council",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "The approach works on pi 1.4.0. The bus, `session_start` registration, `resources_discover` as the startup-complete marker and resolver-carrying payloads all hold up against the source. It is not ready to design until the deltas fix eight things.\n\n1. One statusline scenario contradicts another (C1).\n2. The J1(b) check must depend on whether the instrument is Jefferson's own, not on which extension loaded first (C2).\n3. A report or a registration must request a repaint (C3).\n4. Jefferson's report of a resolver fault must not feed back into repeated renders (C4).\n5. `undefined` must not count as a resolver fault (C5).\n6. A strict rule on message shape conflicts with letting the contract grow (C6).\n7. The binding must be keyed by the full registered name (C7).\n8. The timed visual must not be offered to providers without an expiry repaint (C8).\n\nThe design should also do two more things. It should make the contract types-only, with a fixture type check run under different compiler flags (C9). It should also limit the declaration's options and field types to what Jefferson actually uses (C10, C11).",
  "findings": [
    {
      "id": "C1",
      "severity": "major",
      "location": "specs/statusline/spec.md, MODIFIED \"An instrument's configuration lives in the extension's own document\", scenario \"An option the instrument does not declare\" vs ADDED \"A provided instrument's settings are checked when it registers\", scenario \"An option the registration does not declare\"",
      "finding": "The same delta gives two outcomes for the same input. The modified scenario has no scope, so it rejects the whole document for any undeclared option. The added scenario refuses only the provided instrument.",
      "rationale": "Joel's J1 ruling (option b) limits whole-document rejection to Jefferson's own instruments. The modified scenario was carried over unchanged and now covers provided instruments too. A test written to either scenario fails the other.",
      "concrete_case": "`{\"instruments\": {\"taiknr.savings\": {\"frmát\": \"x\"}}}`. Under the modified scenario the document is rejected and the default row renders. Under the added scenario only taiknr.savings is refused and renders blank.",
      "recommendation": "Limit the modified scenario to \"one of Jefferson's own instruments\" (bare or `jefferson.default.*`). Let the added requirement own the provided case."
    },
    {
      "id": "C2",
      "severity": "major",
      "location": "specs/statusline/spec.md, ADDED \"A provided instrument's settings are checked when it registers\"",
      "finding": "The check is triggered by the moment of registration. A provider that loads before Jefferson registers before the document has been read and before any theme exists, so the check cannot run then. Once the document is read, the provided declaration is already known. Nothing says which rule applies in that case, so the user's result depends on extension load order.",
      "rationale": "T2 and Chidi §2 show that a provider's `session_start` handler can run before Jefferson's (`runner.js:813-839` awaits handlers in extension order). `configuration.ts:106-178` would currently treat a declaration known at read time with whole-document rejection. `validateStyle` also needs `ctx.ui.theme`, which exists only from Jefferson's `session_start` (`startup.ts:58-62`).",
      "concrete_case": "One document carries a faulty `taiknr.savings` format. In settings order [jefferson, taiknr], taiknr registers after the read: one entry renders blank, and the rest renders as configured. In order [taiknr, jefferson], a naive reader sees the declaration at read time and rejects the whole document, so the default row renders.",
      "recommendation": "Key the rule on the namespace: any name whose first segment is not `jefferson` gets the J1(b) treatment. Run the check once both the document and the registration are in hand, whichever comes second. Add a scenario for a provider that registered before the read."
    },
    {
      "id": "C3",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md, \"A provider reports a value for a declared field\"; specs/statusline/spec.md, scenario \"A name that registers during the session\"; specs/session-data-store/spec.md (only \"Unknown\" modified)",
      "finding": "Nothing requires a report or a late registration to request a repaint. The deltas only say \"visible from the next render\". The session-data-store delta never says that provider fields are store datums, so the living rule that a change requests its own repaint (session-data-store :192) does not clearly bind them. The same goes for the enters/leaves rule (:9), the freshness rule (:70) and the feed-entry rule (:232).",
      "rationale": "The pi-tui `requestRender` (tui.js:658-708) paints only when something asks it to. An idle TUI asks nothing. The \"report reaches the row\" scenario dodges the problem by assuming \"the host renders the footer again\".",
      "concrete_case": "taiknr reports `working=true` while the user is idle and waiting on a decision call. With no repaint request, the footer keeps the old frame until the next keypress, which defeats the affordance Joel asked for. Likewise, taiknr registers after Jefferson has installed the footer at startup, and the entry shows \"Lorem ipsum dolor sit amet…\" until something else repaints.",
      "recommendation": "Add a session-data-store requirement: a provider's declared fields are store datums; a report that changes a placed field requests one repaint, and an unchanged value requests none. Add a statusline line: a registration that resolves a placed entry requests one repaint. Modify :232, which says data enters only through the host feed, or state that it does not cover reports. The pi-tui throttle makes report storms cheap (`MIN_RENDER_INTERVAL_MS`, `renderRequested` coalescing)."
    },
    {
      "id": "C4",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md, \"Provider code costs one entry and no more\", scenario \"A fault the host would not show\"",
      "finding": "\"Jefferson reports the fault itself\" sets no rate and no timing. A resolver that throws every time throws on every render. If the report is a `ctx.ui.notify` made inside render, it changes the TUI, which requests a render, which throws again: a loop at the throttle rate.",
      "rationale": "Render calls `cell.instrument.render` up to three times per cell per frame (the probe at width 0, the host's measure, and the allocation; `row-renderer.ts:44-60`). Notify adds a component and requests a render.",
      "concrete_case": "taiknr's `$saved` resolver does `fields.saved.toFixed(2)` before any report, so `saved` is undefined and it throws. Every frame produces a new warning, the transcript fills with copies, and frames keep coming.",
      "recommendation": "Require that each faulting provided instrument is reported once per session, deferred out of render (a microtask or timer), and that later faults from it stay silent. Pin this with a test that renders a throwing resolver N times and asserts one notify."
    },
    {
      "id": "C5",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md, \"Provider code costs one entry and no more\" (\"returns something other than a string\")",
      "finding": "`undefined` is the declaration type's signal for an unknown value: `variables` returns `string | undefined` (`instrument.ts:31`). The requirement as written makes every unknown a fault. It also says nothing about `bar` (`number | null`), `select` (`string | undefined`) or `variableFg` (`ThemeColor | undefined`), whose bad values throw somewhere else. For example, `theme.fg` throws \"Unknown theme color\" (theme.js:212-216), and `collapse(value)` throws on a number (`format.ts:37,223`).",
      "rationale": "A literal test of \"other than a string\" would blank every provided entry before its first report. The unknown rule is supposed to drop only that variable and the label.",
      "concrete_case": "taiknr declares `saved` and has not reported it yet. Its resolver correctly returns `undefined`. Under the spec text the whole entry is treated as faulted and reported, not rendered as unknown.",
      "recommendation": "Reword the rule as \"throws, or returns a value outside its declared result type (a Promise included)\". Contain faults by wrapping the whole bound `render` of a provided instrument in one try/catch, not each resolver, so every path through `format.ts` and the theme is covered."
    },
    {
      "id": "C6",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md, \"An extension registers its instruments over the pi event bus\" (\"A message of another shape MUST be refused\") vs michael-orientation O7",
      "finding": "A strict rule on message shape conflicts with letting the contract grow. Change 3 will add to the declaration. A provider built against the newer contract then sends a key that an older Jefferson calls \"another shape\" and refuses the whole message.",
      "rationale": "Providers and Jefferson update independently (D1, separate repositories). Pi installs each one separately, and nothing pins one to the other's version (Chidi §4: peers are not installed).",
      "concrete_case": "A user runs Jefferson 0.14 with a taiknr built for the 0.15 contract, which adds an optional visual mix-in key. 0.14 refuses the registration, every taiknr entry renders \"Lorem ipsum…\", and a warning blames taiknr, even though its 0.14-compatible fields were fine.",
      "recommendation": "The design should state the growth rule now. Either (a) unknown optional keys are ignored and required keys are validated strictly, or (b) the payload carries a contract version and Jefferson refuses only a newer major version, saying so. Then replace the delta's \"of another shape\" with the chosen rule."
    },
    {
      "id": "C7",
      "severity": "major",
      "location": "extensions/jefferson/components/instruments/instrument-binding.ts:21,35,70; configuration.ts:170",
      "finding": "The binding cache and the configured map are keyed by `declaration.name`. A provider's declaration names its own instrument (`savings`, `path`) inside its own namespace. Unless every key becomes the full registered name, a provided instrument can share a cache entry with a Jefferson instrument or with another provider's.",
      "rationale": "Under D6, `taiknr.path` and `jefferson.default.path` are different instruments, but `bound.get(\"path\")` cannot tell them apart. T7 covers only the bare-name and full-name spellings of Jefferson's own instruments.",
      "concrete_case": "taiknr registers an instrument it calls `path`, and a row names both `path` and `taiknr.path`. `bind` returns Jefferson's cached path instrument for both cells, so taiknr's resolver never runs, and `instruments[\"taiknr.path\"]` settings are applied to Jefferson's path.",
      "recommendation": "Normalise once into a `Map` keyed by the full name (`<extension>.<instrument>`), and key the binding, the configured map and `declaredSeconds` by it. Keep the spelling the document used separately for messages (T7). Use a `Map` rather than a record, so `__proto__` or `constructor` cannot be a name."
    },
    {
      "id": "C8",
      "severity": "major",
      "location": "extensions/jefferson/components/instruments/instrument.ts:44-50; instrument-binding.ts:67-71; living session-data-store :543-587",
      "finding": "Providers get the same declaration type as Jefferson's own instruments, so they get `shownUntil`, the timed visual. Only the store's notice slot ever schedules the repaint at a timed datum's instant (`session-data-store.ts:107-121`). A provider's timed instrument would therefore never hide on time.",
      "rationale": "Orientation §2 says provider declarations must use the same type as Jefferson's (for change 3). The timed visual hides only when a render happens after the instant, and that render must be requested.",
      "concrete_case": "taiknr declares `shownUntil: f => f.decidedAt + 5000` and reports `decidedAt`. Five seconds later nothing repaints, and \"deciding…\" stays on screen until the next keypress.",
      "recommendation": "Choose one of two fixes and write it down: (a) leave `shownUntil` out of the provider contract until a store-scheduled expiry exists for provider fields; or (b) the store arms one expiry repaint per timed provider field, under the existing injected clock and scheduler (ADR 0011). Option (a) is smaller and leaves change 3 to add it."
    },
    {
      "id": "C9",
      "severity": "major",
      "location": "proposal.md \"Package and shipping\"; specs/extension-source-layout/spec.md ADDED \"The published contract resolves from the installed package\"; michael-orientation T11/T14 (O4)",
      "finding": "Because the contract must expose the same declaration type, everything that type imports is type-checked under the provider's own compiler settings. Today that means `instrument.ts`, then `data/session-data-store.ts`, then `data/notice.ts` (a whole runtime module), then pi's types. `skipLibCheck` does not apply to `.ts` source (Chidi §4b). Nothing in CI checks the contract under any flags except Jefferson's own.",
      "rationale": "D1 depends on providers building in their own repositories. Jefferson's settings (`tsconfig.json`: ES2023 lib, `types: [\"node\"]`, `exactOptionalPropertyTypes`) are not the provider's. `notice.ts` uses runtime APIs such as `Object.hasOwn` (from ES2022).",
      "concrete_case": "taiknr's tsconfig sets `lib: [\"ES2021\"]`, or `noPropertyAccessFromIndexSignature`. `tsc --noEmit` fails inside `node_modules/pi-jefferson/extensions/jefferson/data/notice.ts`, and the provider cannot type-check its registration.",
      "recommendation": "(1) Make the contract types-only. Channel names become string-literal types and the provider writes the literal, so no runtime import, no `dependency`, no tarball copy, and no Node error about stripping types under node_modules (Chidi §4a). (2) Give the contract a small type closure: a generic declaration type `Declaration<R>` that imports nothing but pi types and one data/ type file with no imports. `instrument.ts` then derives `InstrumentDeclaration = Declaration<Readings>`, which also satisfies T14. (3) Add a CI fixture that packs the tarball, installs it, and runs `tsc` on a sample provider under a second, different set of flags. Put the file under `extensions/jefferson/`, not at the top of `extensions/`."
    },
    {
      "id": "C10",
      "severity": "minor",
      "location": "extensions/jefferson/components/instruments/instrument.ts:51; configuration.ts:115-175; instrument-binding.ts:11-16",
      "finding": "`options` is an open `string[]`. The only option values that reach rendering are format, style, label and formats (`ConfiguredInstrument`), plus `seconds`, which only the notice gate reads. A provider can declare an option that Jefferson accepts and then silently drops.",
      "rationale": "The published contract would promise that a declared option means something, and Jefferson cannot keep that promise. This goes against D12 and the standard's \"one canonical place\".",
      "concrete_case": "taiknr declares `options: [\"format\",\"style\",\"label\",\"currency\"]`. The user writes `\"currency\": \"EUR\"`, the document is accepted, and nothing changes. A provider that declares `seconds` gets the 1–60 check and no effect.",
      "recommendation": "In the contract, type a provided declaration's options as the foundational set, plus `formats` when it is composed. Refuse any other option at registration."
    },
    {
      "id": "C11",
      "severity": "minor",
      "location": "specs/instrument-registration/spec.md, \"A registration declares the fields Jefferson keeps\" (O8)",
      "finding": "Field types are open apart from \"MUST include boolean\". If objects or arrays are allowed, the store holds a live reference the provider can change without reporting. The store's `!==` change check then misses the change and no repaint is requested. The bus hands payloads over by reference (`event-bus.js`, orientation §4.3).",
      "rationale": "The store promises that a datum changes only through a report (D4) and that a change requests a repaint.",
      "concrete_case": "taiknr reports `stubs: [a]`, later pushes `b` onto the same array, and reports it again. `prev === next`, so no repaint is requested, and the render reads data that changed without any report.",
      "recommendation": "Limit field types to `string`, `number` (finite) and `boolean`. Refuse a report whose value does not match its declared type, and keep only the latest value per field. Also snapshot the declaration's plain-data members (name, defaultFormat, options, formats keys) at registration, so a later change by the provider cannot slip past the J1 check."
    },
    {
      "id": "C12",
      "severity": "minor",
      "location": "specs/instrument-registration/spec.md, \"A provided instrument's name is namespaced to its extension\", scenario \"A name in Jefferson's namespace\"",
      "finding": "\"Begins with `jefferson`\" reads as a string-prefix test, and the grammar defines no characters, no case rule and no number of parts for provided names. The bus is anonymous (T8), so the only thing that can tell Jefferson's own message apart is a check against the identity of the payload object it emitted itself.",
      "rationale": "A prefix test refuses names that should be legal. Mixed case lets a provider imitate Jefferson's names. If dots are allowed inside a segment, a name can have more than two parts, which overlaps the three-part `jefferson.custom.*` grammar.",
      "concrete_case": "An extension `jeffersonian` registering `jeffersonian.clock` is refused. A provider registering `Jefferson.default.path` or `taiknr.savings.daily` is accepted. Separately, a later Jefferson emitting `jefferson.custom.mine` through the same listener would be refused unless the listener can recognise its own message.",
      "recommendation": "Grammar: each segment matches `[a-z][a-z0-9-]*`; a provided name has exactly two segments; the first segment `jefferson` is reserved. Jefferson accepts its own registrations by checking the payload object's identity (a WeakSet of what it emitted), not by first claim."
    },
    {
      "id": "C13",
      "severity": "minor",
      "location": "specs/instrument-registration/spec.md, \"A provider registers once a session has started and stops at shutdown\" (\"or later\"); michael-orientation T4/O1",
      "finding": "I checked the `resources_discover` marker in 1.4.0 (`agent-session.js:2680-2683`, `:3028-3030`, `runner.js:1165-1198`). It fires after every `session_start` handler has been awaited, but it runs its own handlers in extension order. Registering later than that is allowed but always produces a false warning, and the spec's \"or later\" invites it.",
      "rationale": "D7 warns once startup completes. A registration after the marker is legal and shows up, but only after the user has been told the name is unknown.",
      "concrete_case": "taiknr registers from its own `resources_discover` handler, or lazily on its first turn. Jefferson's marker runs first, and the user is warned that `taiknr.savings` is not a known instrument. A moment later it renders.",
      "recommendation": "Adopt `resources_discover` for O1 with a pin comment. Change \"or later\" to say registration is complete by the end of the provider's `session_start` handler, awaited. Have the guide say that a later registration warns falsely."
    },
    {
      "id": "C14",
      "severity": "minor",
      "location": "extensions/jefferson/components/row/row-renderer.ts:54 (O2); michael-orientation O10",
      "finding": "Each `CellView` copies `fills` when the tree is built. A pending entry holds `blank`, which fills, so replacing it with a provided instrument that does not fill keeps the old geometry. Separately, a frame can paint the pending \"Lorem ipsum…\" text: pi-tui paints from a `setTimeout` (tui.js:693-708), so a later provider's `session_start` handler that waits on I/O gives the timer a turn.",
      "rationale": "T5 already describes the geometry problem, and this pins it to a line. The flash happens whenever Jefferson loads before a provider whose `session_start` does I/O.",
      "concrete_case": "[jefferson, taiknr] order, and taiknr's `session_start` reads a stub cache from disk. One frame shows \"Lorem ipsum dolor sit amet…\" across the entry. After the swap, the savings cell still fills and pushes right-aligned cells to the edge.",
      "recommendation": "Make `fills` a getter in `CellView`, read on every plan. Add a scenario under the delta's \"A name that registers during the session\" saying that the entry takes its new instrument's width behaviour. Measure O10 with `createEventBus` and a fake TUI. If it paints, see the owner question."
    },
    {
      "id": "C15",
      "severity": "minor",
      "location": "michael-orientation O3/T3; specs/session-data-store \"Store data does not survive a session replacement\" (:169)",
      "finding": "The holding area for registrations and reports before the store exists must be a latest-value-per-field map, not a queue. It must also be cleared at `session_shutdown`, never at Jefferson's `session_start`. Otherwise one of two promises breaks: that early reports are kept (T2), or that data does not survive a replacement (:169).",
      "rationale": "In pi every runtime has fresh factories (Chidi §1). In the test harness one factory sees several `session_start` events (`tests/jefferson.test.ts:294-295`). In print or RPC mode Jefferson returns early (`startup.ts:52`) but its listener keeps hearing reports.",
      "concrete_case": "Clearing at Jefferson's `session_start`, when taiknr loads first, drops taiknr's first report. A queue in `-p`/RPC mode, with taiknr reporting every turn, grows without bound for the whole process.",
      "recommendation": "Hold the latest value per (provider, field). Clear provider registrations and values in the `session_shutdown` handler that already exists (`startup.ts:31`). Keep Jefferson's own registrations, which were made from the factory."
    },
    {
      "id": "C16",
      "severity": "minor",
      "location": "specs/statusline/spec.md \"A bare name means the default instrument\" (instrument-registration) — instruments block; ARCHITECTURE.md:89",
      "finding": "No scenario covers an `instruments` block that configures both `path` and `jefferson.default.path` (T7). Both are Jefferson's own and known at read time.",
      "rationale": "The rule that each name is configured once loses its meaning when one instrument has two spellings, and `Object.entries` order decides which one wins.",
      "concrete_case": "`{\"instruments\": {\"path\": {\"format\": \"$path|base\"}, \"jefferson.default.path\": {\"format\": \"$path|absolute\"}}}` renders one or the other depending on key order, with no warning.",
      "recommendation": "Add a scenario: the duplicate rejects the document, and the warning quotes both spellings. This is a shape fault known at read time (D14)."
    },
    {
      "id": "C17",
      "severity": "minor",
      "location": "specs/instrument-registration/spec.md (observability); startup.ts:37-49",
      "finding": "Refusals, settings faults and resolver faults all arrive from a bus listener, which has no `ctx` and whose errors go only to `console.error` (T8). Nothing says where they wait before a `ctx` exists, in what order they sit among the D17 warnings, or how an operator sees which providers registered.",
      "rationale": "The standard's §4 requires a state the operator can see. `/jefferson` already reports install state and is the existing hook.",
      "concrete_case": "taiknr's payload fails validation in its own `session_start`, before Jefferson's. No `ctx.ui` exists yet, the refusal vanishes, and the user sees only \"taiknr.savings is not a known instrument\" with no reason.",
      "recommendation": "Hold bus-side faults and deliver them with the startup-complete batch, after the D17 parts, in a fixed order. Have `/jefferson` name the providers that registered and the instruments that were refused. That is one line, reusing the command that exists."
    }
  ],
  "assumptions": [
    {
      "assumption": "`resources_discover` fires after every awaited `session_start` handler on startup and on reload (when `hasBindings`), so Jefferson registering a handler for it makes it a reliable startup-complete marker in TUI mode.",
      "status": "verified"
    },
    {
      "assumption": "pi-tui coalesces and throttles `requestRender`, so a burst of reports costs about one frame per `MIN_RENDER_INTERVAL_MS`.",
      "status": "verified"
    },
    {
      "assumption": "`store.sample()` returns a fresh object on every render, so the per-sample text cache in `row-renderer.ts` already drops provided text on each render.",
      "status": "verified"
    },
    {
      "assumption": "`collapse` in `format.ts` turns control characters in variable values into spaces, so a provided value containing a newline cannot break \"one line per row\".",
      "status": "verified"
    },
    {
      "assumption": "`/new`, `/resume` and `/fork` go through `bindExtensions` and therefore emit `resources_discover`. This is taken from Michael's 1.5.2 trace. I checked only the 1.4.0 `bindExtensions` body.",
      "status": "unverified"
    },
    {
      "assumption": "A frame can paint between Jefferson's install and a later provider's `session_start` when that handler waits on I/O. This is inferred from pi-tui scheduling with `setTimeout`, not measured (O10).",
      "status": "unverified"
    },
    {
      "assumption": "The contract's type closure fails under some plausible provider tsconfig. This is inferred from `notice.ts` being in that closure and from Chidi's untested stricter-flags case, not run.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "Suppose the O10 measurement shows that a frame paints while a provided entry is waiting for its registration at startup. Should that entry show the `blank` placeholder text (\"Lorem ipsum dolor sit amet…\") for that frame, or show nothing until startup has completed and `blank` only after?",
      "options": [
        "Show `blank` while waiting, exactly as an unknown name does (current S7 reading)",
        "Show nothing until startup completes, then `blank` if it never registered",
        "Decide only after O10 is measured"
      ],
      "recommended_option": "Decide only after O10 is measured",
      "why": "Joel's quoted words cover the shorthand and when the warning fires. \"Renders blank until it does\" is the conductor's restatement (S7). Whether users see a flash of placeholder text at every startup is a product call, and it matters only if a frame actually paints."
    }
  ],
  "not_checked": [
    "Did not measure O10, whether a frame paints between Jefferson's install and a later provider's `session_start`. I did not run pi or the tests (no pnpm).",
    "Did not verify Michael's 1.5.2 citations for `agent-session-runtime.js` or the reload path beyond the 1.4.0 `agent-session.js:2660-2683` and `:3020-3031`.",
    "Did not run `tsc` on a provider fixture under stricter or different flags (C9 is inferred from the type closure).",
    "Did not read `tests/jefferson.test.ts` (the export pin) or the harness lines that Eleanor and Michael cited.",
    "Did not check whether pi deduplicates the same package installed at both user and project scope. If it does not, two Jefferson copies would each refuse the other's `jefferson.*` registration.",
    "Did not check the ThemeColor type surface or the `Theme` import cost in the contract's type closure beyond `instrument.ts`."
  ]
}