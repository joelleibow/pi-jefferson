{
  "mode": "council",
  "lens": "council-readiness",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Nothing here blocks the design, and no ruling is re-opened. The deltas leave eleven decisions open that a coder would otherwise make during implementation. The four to close first:\n- The seal that keeps `jefferson` reserved while Jefferson registers its own names by the same message.\n- The lifetime of registrations and reports, so a session-start clear does not wipe a provider that registered early.\n- One outlet and timing for every warning the bus path can raise.\n- A repaint on every registration and report.\n\nThe rest are version-skew rules for the contract, name-grammar edge cases, resolver `undefined` semantics, report validation, and test and CI mechanics.\n\nOn migration: no user document needs editing, and nothing is persisted. The risks are all in the published contract, which cannot be recalled once published, and in what a downgrade or a version mismatch does silently.",
  "findings": [
    {
      "id": "R-01",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md — 'An extension registers its instruments over the pi event bus' and 'A provided instrument's name is namespaced'; michael-orientation.md T8, S4",
      "finding": "Two requirements cannot both hold without an unstated rule. Jefferson MUST register its own `jefferson.default.*` names by the same message an outside extension uses, yet a registration of a name beginning with `jefferson` MUST be refused. The bus carries no sender, so the message cannot distinguish Jefferson's registration from a forged one. The delta never says what does.",
      "rationale": "The design must choose the mechanism, or the coder invents it. The workable one is ordering: Jefferson emits its built-ins synchronously in its factory, then the registry seals the `jefferson` namespace. Anything later claiming it is refused. This rests on `emit` calling listeners synchronously up to the first await (Chidi §1), so the listener must not await before it records the registration. The message's `extension` field is payload, so it proves nothing.",
      "concrete_case": "A provider whose factory loads after Jefferson's emits `{extension:\"jefferson\", instruments:[jefferson.default.path…]}`, or `jefferson.default.evil`. With no seal it is accepted or ignored depending on whichever check the coder wrote. A related failure: `safeHandler` sends any exception to `console.error` only (Chidi §1). If the validator wrongly refuses one shipped declaration, that instrument silently never registers, and the footer shows blanks with no warning.",
      "recommendation": "The design states the seal rule and the second-claim rule (first claim wins). Tests use `createEventBus` from pi's public index (verified at `dist/index.d.ts:7`) and assert three things:\n- All eleven shipped names are registered after the factory runs, before any `session_start`.\n- A later `jefferson.*` claim is refused and the built-in still renders.\n- A second claim on a provided name leaves the first intact.\n\nThe spec's prefix test should be 'first dot-part equals `jefferson`', not 'begins with `jefferson`', so a provider named `jeffersonville` is not caught."
    },
    {
      "id": "R-02",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md — 'A provider reports a value' (MUST NOT survive a session replacement); michael-orientation.md T2, T3; startup.ts:51-54",
      "finding": "The spec states that reports do not survive a session replacement but not when registry and report state are cleared. The natural implementation, clearing at Jefferson's `session_start` (as `startup.ts` does with `releasePrevious`), is wrong.",
      "rationale": "`session_start` handlers run one at a time in extension order (T2). A provider that loads before Jefferson registers and reports before Jefferson's handler runs. A clear at `session_start` then wipes a registration that arrived legitimately in this session. A clear only at `session_shutdown` is correct in pi, where each session builds new factories. It leaves the harness, which drives repeated `session_start` through one factory (`tests/jefferson.test.ts:294-295`), needing the same rule.",
      "concrete_case": "Settings order is [provider, jefferson]. The provider's `session_start` emits a registration and a report. Jefferson's `session_start` then clears 'for the new session', and `taiknr.savings` renders blank for the whole session. In the harness, a second `start()` on one factory must also show that the first session's reports are gone and the provider's re-registration is accepted, not refused as a duplicate.",
      "recommendation": "The design states the lifetime in one place: registrations and reports are dropped at `session_shutdown`, never at `session_start`, and a provider's re-registration after shutdown is accepted. It also states that a report arriving before its registration is dropped or held. Tests cover both orders, provider-first and Jefferson-first, plus the repeated-start harness case."
    },
    {
      "id": "R-03",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md — 'A provider reports a value' and the statusline delta 'A name that registers during the session'; openspec/specs/session-data-store/spec.md:192",
      "finding": "No requirement says that a report, or a late registration, requests a repaint. The deltas say a value is 'visible from the next render', but nothing causes a render.",
      "rationale": "Living requirement :192 covers 'a change the store receives that alters a datum a cell displays'. A late registration changes no datum, it swaps a `blank` for an instrument. Whether a report counts as a store change depends on a design (provider fields held in the store) that does not exist yet. The scenario 'A report reaches the row' says 'and the host renders again', which hides who triggers that.",
      "concrete_case": "A provider reports `working = true` and the footer shows nothing until some unrelated repaint, such as turn end. A late registration for `taiknr.savings` renders only on a later keystroke. A report that does not change the value must request no repaint, or a provider reporting every token floods the TUI.",
      "recommendation": "Add scenarios to `instrument-registration`:\n- A registration that arrives after install requests a repaint.\n- A report that changes a declared value requests a repaint.\n- A report of an identical value requests none.\n\nAlso state the case where the repaint hook does not exist yet because the provider reported before Jefferson's `session_start`. `requestRepaint?.()` is a no-op there, so the first install must read the held values."
    },
    {
      "id": "R-04",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md — 'Provider code costs one entry and no more'; extensions/jefferson/format.ts:200-231",
      "finding": "The spec treats a resolver returning 'something other than a string' as a fault Jefferson must report. In the existing contract `undefined` is the legitimate 'unknown' return: `resolveFormat` returns `\"\"` for it (format.ts:222) and the declaration type is `string | undefined`. For a provider, a declared field nobody has reported is the normal startup state, so `undefined` is the common return.",
      "rationale": "Read literally, every render of every unreported provider field is a 'fault'. The containment also has no home today: `resolveFormat` and `instrument-binding.ts` have no try/catch around resolvers. Jefferson's own resolvers 'read what they read today', so the design must say whether the wrapper applies to provider declarations only.",
      "concrete_case": "The resolver `$saved => readings.saved` returns `undefined` before the first report. A coder following the spec text raises a fault at every repaint. A resolver returning a number reaches `collapse(value)` and throws unless a guard catches it first.",
      "recommendation": "Amend the spec: `undefined` is unknown, not a fault. A throw, a non-string non-undefined value, or a promise is the fault. Specify that the fault costs the whole entry (the instrument's text), not one variable. Tests use a throwing resolver, a promise-returning resolver, a numeric resolver and an `undefined` resolver in one row, and assert the other entries and rows still render. Also assert that the wrapper is not applied to the shipped declarations. The coder otherwise adds it everywhere and changes shipped behaviour."
    },
    {
      "id": "R-05",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md ('A message of another shape', 'A fault the host would not show'); specs/statusline/spec.md ('A provided instrument's settings are checked when it registers'); proposal.md Open questions (O3, O5)",
      "finding": "Four new warnings have neither an outlet nor a timing: a refused registration, a resolver fault, a refused provider setting (J1b), and a late unknown name. The bus listener is subscribed in the factory and has no `ctx`. Only `session_start` and later handlers receive a `ctx.ui.notify`. A resolver fault occurs inside render, and render runs on every repaint.",
      "rationale": "Standard §5 requires explicit error behaviour at each boundary, and a test needs a defined channel and a defined count. A provider registering before Jefferson's `session_start` has no `ctx` to notify with. A throwing resolver reported on every frame becomes a notification flood.",
      "concrete_case": "A provider first in settings order registers a format naming an undeclared variable. The J1(b) warning is raised before any `ctx` exists. A coder either drops it or calls `ctx.ui.notify` on a stale or absent context. A throwing resolver warns on every repaint, with no rule such as once per instrument per session. A provider emitting a malformed registration produces no visible result at all, because `emit` returns `void` and nothing acknowledges it (Chidi §1).",
      "recommendation": "The design states one warning outlet: a queue held from the factory, flushed at the startup-complete marker, notifying directly afterwards. It also states a dedup rule per instrument and fault kind per session, and whether a refused registration warns at all. Pre-1.0, an author debugging a silent refusal is the main support cost. The new user-visible warning strings follow the precedent set by Joel's approved strings and go to Joel at his gate, with fixed wording the tests assert."
    },
    {
      "id": "R-06",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md ('A message of another shape'); michael-orientation.md O7; package export decision (O4)",
      "finding": "Version skew is unaddressed. The contract becomes permanent once published, and nothing states how an old Jefferson handles a newer payload, how a new Jefferson handles an older one, or what a provider on a Jefferson without the feature observes.",
      "rationale": "'A message of another shape MUST be refused' is ambiguous for forward compatibility. If unknown keys refuse the whole message, a provider adopting a later additive field (change 3's visual mix-in is planned) breaks on every older Jefferson. If unknown keys are ignored, a provider that needs the new field gets a silently degraded instrument. 'Widening MUST be additive' appears only for resolver readings. The channel names and any version marker are also undecided, and renaming a channel after publication breaks every provider with no Jefferson-side fix.",
      "concrete_case": "A provider built against contract 0.15 with an extra optional field is sent to Jefferson 0.14: refused or accepted? Jefferson 0.13 (no listener) receives the same registration and silently does nothing, so a provider author cannot tell 'Jefferson too old' from 'my payload is wrong'. A user downgrading 0.14 to 0.13 with a provider installed loses the provider's instruments with no warning.",
      "recommendation": "The design states four things:\n- Version marker: a suffix on the channel name or a payload field, decided now.\n- Unknown-key rule: ignore on both messages, and a missing optional key is the 'additive' direction.\n- Refusal rule: a message with a wrong required shape is refused, and a newer version marker is treated distinctly from a malformed message.\n- Guide wording: the guide must state the minimum Jefferson version and that an absent or older Jefferson fails silently.\n\nThe design's Migration Plan states that provider adoption happens after the contract's release, and that the contract's names cannot be changed afterwards without a new versioned channel."
    },
    {
      "id": "R-07",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md ('A provided instrument's name is namespaced', 'A bare name means…'); specs/statusline/spec.md; michael-orientation.md T7",
      "finding": "The name grammar is not decidable from the spec. Missing: the allowed characters; whether an extension name may contain `.`, `@` or `/` (npm scoped names do); whether a provided name can have a third part; what `jefferson.path` (two parts, reserved namespace) means; and what a document does when its `instruments` block carries both `path` and `jefferson.default.path`.",
      "rationale": "Both spellings now name one instrument. The configured map and binding memo are keyed by one string (`configuration.ts:170`, `instrument-binding.ts:21`), so normalisation has to be a single, tested function. The duplicate case is new, because before this change `jefferson.default.path` was an unknown name and the pair was impossible. Michael's T7 says the design must name the duplicate. No scenario does.",
      "concrete_case": "A document has `{\"instruments\": {\"path\": {...A}, \"jefferson.default.path\": {...B}}}`. Silent last-wins, silent first-wins and rejection all follow from reasonable code, and each changes a rendered footer. `a.b.c` from a provider is either rejected, parsed as extension `a`, or treated as a collision with the three-part `jefferson.custom.*` shape.",
      "recommendation": "The spec or design fixes the grammar and the duplicate rule. I recommend rejecting the document, as the existing 'configures each name once' rule for Jefferson's own instruments already does, with the warning quoting both spellings as the user wrote them. Tests cover empty parts, a leading or trailing `.`, a three-part provided name, a case-variant name, and a bare name that matches only a provider's instrument (no shorthand)."
    },
    {
      "id": "R-08",
      "severity": "major",
      "location": "specs/instrument-registration/spec.md ('A registration declares the fields Jefferson keeps', 'A provider reports a value'); michael-orientation.md O8",
      "finding": "The field type set is open, and the report boundary is unspecified. The deltas say only that the types 'include boolean'. They do not say what other types exist, whether a field can carry an initial value, or what happens on a report for an undeclared field, for a value of the wrong type, or before the provider's registration.",
      "rationale": "A report is a second message on an untyped bus (T8). The coder would invent at least five behaviours: coerce, drop, throw, warn and store. 'A declared field nobody has reported reads unknown, not false' constrains only the unreported case. Change 3's spinner needs `working = true`, so the boolean path must be proven, not just declared.",
      "concrete_case": "A provider declares `working: boolean` and reports the string `\"true\"`. A report names a field that was never declared. A report arrives before its registration: held or dropped? A reported `false` read through a provider's resolver must differ from `undefined`.",
      "recommendation": "The design lists the field types exactly (string, number and boolean), says whether a declaration may carry an initial value, and states one rule for each bad report. The boolean tests assert `false` renders the format's `false` result and `undefined` renders the unknown result, plus a test for each bad-report case with the exact warning or silence."
    },
    {
      "id": "R-09",
      "severity": "major",
      "location": "specs/extension-source-layout/spec.md ('Imports between the homes run one way', 'The published contract resolves from the installed package'); michael-orientation.md T10, T11, T14",
      "finding": "The deltas do not place the contract file or state what it may import. They require only that it sit 'where the type check and the tarball already reach' and 'not outside the load root'.",
      "rationale": "A provider's `tsc` type-checks the contract file and everything it imports under the provider's flags (Chidi §4b, with stricter flags untested). A contract that imports Jefferson internals such as `Readings` pulls those into every provider's compile and turns them into published API. `data/` imports nothing outside itself, not even types (`extension-source-layout` :245, :348), so the store's provided-field type and the contract's field type either duplicate each other or one must derive from the other. The pin test imports every `.ts` file under `extensions/` and compares exact keys (`tests/jefferson.test.ts:419-483`), so the new files must be listed there, a types-only file pinned as `[]`. Direct `.ts` children of `extensions/` are loaded by pi, and `tests/jefferson.test.ts` carries a comment saying so.",
      "concrete_case": "The coder places `extensions/instruments.ts` directly under `extensions/`, which pi may load as a second extension. Or the coder places it under `extensions/jefferson/` and imports `Readings` for the resolver signature, so `Readings` becomes a published contract. A new file left out of the pin fails the 'a shipped file the pin does not cover' assertion.",
      "recommendation": "The design gives the exact path (under `extensions/jefferson/`, not a direct child of `extensions/`), says it imports only type-only pi packages the provider already has as peers and nothing from Jefferson internals, and says which side derives from which for the field type. Another point is whether the contract exports any runtime value: channel names as exported constants would make it runtime code. In that case a provider's `node --test` fails with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` and `pi-jefferson` becomes a `dependency` of the provider (T11). I recommend a types-only contract with the channel names as literal types."
    },
    {
      "id": "R-10",
      "severity": "major",
      "location": "specs/extension-source-layout/spec.md ('The published contract resolves from the installed package'); .github/workflows/ci.yml:31-72; package.json (no `exports`, no `main`)",
      "finding": "The CI requirement ('CI MUST fail when the export's target is missing from the packed files') does not say which manifest it reads or how its failure is shown. The `exports` object's exact shape (`types` and `default` conditions, a bare string or an object) is not decided either.",
      "rationale": "The existing CI step deliberately reads the packed manifest, not the repo's `package.json`, because pnpm rewrites it (ci.yml comment). A check reading the repo copy would pass while the tarball is wrong. A target missing from a published tarball cannot be withdrawn. Adding `exports` also closes every other deep import. `package.json` has no `main` and no other `exports`, so `import 'pi-jefferson'` and `pi-jefferson/package.json` stop resolving for consumers unless listed.",
      "concrete_case": "The coder writes the check against `package.json` at the repo root, and it passes when `files` omits the contract's directory. Or the coder adds only `./instruments` and a consumer tool resolving `pi-jefferson/package.json` fails. Chidi tested only `nodenext` resolution, so a provider on `bundler` or `node10` resolution is unverified; `node10` ignores `exports`.",
      "recommendation": "The design fixes the export object. The CI step extends the existing node script: read `exports[\"./instruments\"]` from the packed manifest and require its target in the packed file list. Standard §3 asks how the check is shown catching a mistake: the coder demonstrates the failing case once with a temporary `files` mistake in a `mktemp -d` copy and records the output in the PR, since a CI shell script has no unit test. Decide whether `./package.json` is exported. The guide states the supported `moduleResolution` values."
    },
    {
      "id": "R-11",
      "severity": "major",
      "location": "specs/statusline/spec.md ('Unknown names warn after startup'); michael-orientation.md T4, O1; startup.ts:51; tests/jefferson.test.ts:122-137",
      "finding": "The 'startup has completed' marker has no automated check, and the test harness cannot reproduce it. Michael's candidate is a `resources_discover` handler, which pi emits after every `session_start` handler (`runner.js` `emitResourcesDiscover`, listed in `types.d.ts:1188`). The harness `start()` fires only `session_start`.",
      "rationale": "The ordering is undocumented, and pi only emits `resources_discover` when a handler exists. A pi change, or a path that skips the event, means the warning never fires, with no failure anywhere. Existing tests assert `session.notified` straight after `start()`. If the warning moves to a second event, those assertions break or pass for the wrong reason depending on whether `start()` is changed to also fire it. Separately, `harness()` builds a fake `pi` with only `registerCommand` and `on`. Once `startUp` calls `pi.events.on` in the factory, every `harness()` call throws a `TypeError` and every test fails.",
      "concrete_case": "`pi.events` is `undefined` in `fakePi`, so even `registers exactly one command` fails. A test that expects the late unknown-name warning passes against a harness that fires `resources_discover` itself, and proves nothing about pi's real order. The `handlers` map keeps one handler per event name, so a second `session_start` or `resources_discover` subscription overwrites the first.",
      "recommendation": "The tasks list the harness changes explicitly and put them in the first task group so the suite stays green: `fakePi.events = createEventBus()`, and `start()` fires `resources_discover` after `session_start`. The design carries a pin comment, as `data/notice.ts` does, naming pi's source locations. Joel observes once in a real session that a late unknown name warns, and the coder does not tick that task. The `instrumentNamed` replacement (five test files, `tests/jefferson.test.ts:485-490`) is a helper under `tests/`, not a test-only export from production code."
    }
  ],
  "assumptions": [
    {
      "assumption": "`createEventBus` is exported from pi's public index, so tests can use the real bus (michael-orientation.md T15).",
      "status": "verified"
    },
    {
      "assumption": "The test harness's fake `pi` has no `events`, and its `on` keeps a single handler per event name (`tests/jefferson.test.ts:96-110`).",
      "status": "verified"
    },
    {
      "assumption": "`undefined` returned by a resolver means unknown, and `resolveFormat` returns an empty string for it (`format.ts:222`). No resolver call is wrapped in try/catch today.",
      "status": "verified"
    },
    {
      "assumption": "`package.json` has no `exports` and no `main`; `files` ships `extensions`, `README.md` and `LICENSE`. CI reads the packed manifest and pins `pi.extensions` to the one entry (`ci.yml:31-72`).",
      "status": "verified"
    },
    {
      "assumption": "The pin test imports every `.ts` file under `extensions/` recursively and compares exact export keys, so a new contract file and registry file must be pinned. The scan regex `/register|supply|contribute/i` would reject a `register*` export key (`tests/jefferson.test.ts:418-490`).",
      "status": "verified"
    },
    {
      "assumption": "`startUp`'s `session_start` handler returns early outside TUI mode and releases the previous install at its start (`startup.ts:51-54`).",
      "status": "verified"
    },
    {
      "assumption": "`docs/releasing.md` is linked only from README line 73, outside the archive and this change's own artifacts.",
      "status": "verified"
    },
    {
      "assumption": "`resources_discover` follows every `session_start` handler on every session-start path, and a handler's presence is what makes it fire (Michael's source reading of `agent-session.js`, `runner.js`). I confirmed only that the event exists and that `emitResourcesDiscover` iterates handlers in extension order.",
      "status": "unverified"
    },
    {
      "assumption": "A provider's `tsc` resolves the `exports` entry under `bundler` and stricter flags. Chidi tested only `nodenext`.",
      "status": "unverified"
    },
    {
      "assumption": "Two copies of Jefferson loaded at once (project-local and package) would conflict on `jefferson.default.*`. Not traced.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "Who approves the wording of the new user-visible warnings (a refused registration, a refused provider setting, a resolver fault, and a late unknown name if its text changes)?",
      "options": [
        "Michael drafts the strings in the design and Joel approves them at his gate, as with the approved `row N: …` string",
        "Michael writes them and Joel sees them only in the shipped result"
      ],
      "recommended_option": "Michael drafts the strings in the design and Joel approves them at his gate, as with the approved `row N: …` string",
      "why": "No ruling in owner-rulings.md covers new strings. Joel's earlier rulings treat user-read strings as his, and the tests will assert these strings exactly, so they are fixed before tasks exist."
    }
  ],
  "not_checked": [
    "I did not run pnpm or the test suite, so no claim here depends on a green run.",
    "I did not measure whether a frame paints between Jefferson's install and a later provider's registration (O10).",
    "I did not verify against live pi that `resources_discover` fires after every `session_start` handler on `/new`, `/resume`, `/fork` and `/reload`. I took that from Michael's source reading.",
    "I did not test a provider's type-check under `moduleResolution: bundler` or `node10`, or under stricter flags such as `exactOptionalPropertyTypes`.",
    "I did not check whether any test asserts the exact list of `pi.on` subscriptions in a way a new `resources_discover` subscription would break. I did not read `session-data-feed.test.ts`'s subscription assertions in full.",
    "I did not check the behaviour of two Jefferson copies loaded together, or pi's package installer for a peer dependency on a non-host package (`peerDependenciesMeta.optional`).",
    "I did not review docs wording or the guide. ADRs, `CONTRIBUTING.md`, the guide and the removal of `docs/releasing.md` belong to the docs pass and must stay out of `tasks.md`. README:73 links to `docs/releasing.md` and must be updated in the same pass.",
    "I did not trace the remaining tests that use `instrumentNamed` beyond Eleanor's list of five test files."
  ]
}