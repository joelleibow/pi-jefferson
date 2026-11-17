# Orientation: extensions-provide-instruments

Michael, 2026-11-15. This is a consult. It approves nothing, and every gate still runs. The base is `37a1698` (0.13.0). I checked platform facts against pi 1.4.0, which is the repository's pin under `node_modules/@earendil-works/pi-coding-agent`. Where I name 1.5.2, I also checked the global install that Chidi used. I ran no pnpm, created no worktree and edited no file.

## 1. The decisions that bind this change

### Joel's rulings for this change (`owner-rulings.md`, 2026-11-15)

- **D1.** Each extension owns its instruments, in its own repository. Jefferson provides the contract, and a provider registers one instrument or several. This change does not touch taiknr.
- **D2.** Instruments register over `pi.events`. The shipped instruments use the same event path, and there is no separate static path for them.
- **D3.** The contract ships as `pi-jefferson/instruments`.
- **D4.** Jefferson owns the store. A provider declares the fields to keep when it registers, then reports a value when it learns one. The words are "declare" and "report", never "push".
- **D5.** There are two messages: *"I'm FOO and I have an instrument that will show this data"* and *"I'm FOO and my data, BAR, changed"*.
- **D6.** A provided instrument is named `<extension>.<instrument>`. Jefferson's own instruments are `jefferson.default.*`, because a later `jefferson.custom.*` will need a name of its own.
- **D7.** A bare name means the `jefferson.default.*` instrument of that name. An entry whose instrument has not registered renders blank until it does. An unknown name warns only after session startup has completed.
- **D8.** The spinner is change 3. This change must leave a provider able to declare and report a boolean field, and it builds no spinner.
- **D9.** This change adds the extension-author guide to `docs/`, written with `what-the-fork` and `my-voice`.

### Earlier rulings this change inherits

- **D10. Vocabulary.** The code says row, cell and instrument. Users read row, entry and instrument (2026-11-03, 2026-11-15, ADR 0015). "Module" and "widget" are rejected words.
- **D11.** *"A user shouldn't have to configure any more than truly necessary."* (2026-11-07)
- **D12.** *"Don't invent what we don't have to."* (2026-11-03)
- **D13.** Configurable strings over localization, and reusable, composable visuals over behaviour baked into one instrument.
- **D14. A fault in a document's shape rejects the whole document.** Joel ruled this twice:
  - an `align` outside the three values rejects the document (`archive/2026-11-04-cells-as-objects/owner-rulings.md:29`);
  - the retired one-row form is rejected (`archive/2026-11-15-reshape-the-configuration/owner-rulings.md:19`).
- **D15.** The equal-distribution code stays in the code (reshape-the-configuration rulings; ADR 0016).

### Decisions I approved, which bind this change

These come from the `reshape-the-configuration` design (`openspec/changes/archive/2026-11-15-reshape-the-configuration/design.md`):

- **D16 (decision 4).** Unknown names are held as data, in `Notices` (`configuration.ts:84-89`), so that this change can hold the report back without parsing the document again.
- **D17 (decision 6).** There are two unknown-name forms, reported in a fixed order:
  - `row N: "<name>" is not a known instrument`, a string Joel approved;
  - the `instruments` block form.
- **D18 (decision 11).** The guide is `docs/extension-authors.md`, and the README's index gains one line for it.

### A ruling this change revises

- **R1. The 2026-11-03 rule that no API lets third-party code supply cell content.** The source is `archive/2026-11-03-session-data-store/owner-rulings.md:70-74`: *"there is still no API by which third-party code supplies or replaces cell content."* It lives on in three places:
  - the statusline requirement "Cell text is the instrument its entry names", with its scenario "Contributing cell content" (`openspec/specs/statusline/spec.md:1603-1619`);
  - the extension-source-layout requirement "The export surface stays free of any way to contribute cell content" (`extension-source-layout/spec.md:205-218`);
  - the test that pins both, `tests/jefferson.test.ts:418-490`, which also scans export keys with `/register|supply|contribute/i`.

  D1–D3 are newer and revise this rule. The change must modify both requirements in its spec deltas and record the retirement in an ADR, as `AGENTS.md` ("Where decisions live") requires. At the implementation gate, rewriting that test is legitimate only because the delta retires what it tests. Without the delta, the rewrite is a test edited to make the code pass.

### Standing records the change leans on

These records state decisions, but they do not prove them.

- **statusline spec:**
  - an unknown name warns and renders `blank` (`:1539-1573`);
  - an instrument reads the store synchronously and never subscribes (`:73-79`);
  - the footer's tree is built once (`:260-266`);
  - an instrument is declared once, with "no second table of names" (`:413-431`).
- **session-data-store spec:**
  - a read is synchronous and total (`:33`);
  - unknown is a distinguished value (`:55`);
  - store data does not survive a session replacement (`:169`);
  - a change that alters displayed data requests a repaint (`:192`);
  - a new datum enters the store, never an instrument (`:232`).
- **extension-source-layout spec:**
  - one host-loaded entry (`:15`);
  - host packages are peers (`:138`);
  - `data/` imports nothing outside itself (`:243`, `:346`);
  - each shipped instrument has its own file, and `instrumentNamed` resolves it (`:308-325`);
  - "Separation uses plain imports". This one applies only to a layout change, and only to a seam whose purpose is separation or testing.
- **`ARCHITECTURE.md:92-94`:** every failure in a document rejects the whole document. D14 covers faults in the document's shape. For faults in the `instruments` block I found no ruling of Joel's. I searched every archived `owner-rulings.md` for "reject". That rule was written when every declaration was known at read time (`configuration.ts:110`). See J1.

## 2. What the change must not touch or foreclose

- **The taiknr repository (D1).**
- **The spinner (D8).** This change adds no spinner code and no animation clock. It must still leave change 3 room in three ways:
  - A boolean field must be declarable and reportable. A reported `false` must read as `false`, distinct from unknown (session-data-store `:55`).
  - A provider's declaration must use the same type as Jefferson's own declarations. Then change 3 adds its visual mix-in field once, as `shownUntil` was added for the timed visual (ADR 0013), not once per type.
  - The store's injected clock and scheduler (ADR 0011) stay as they are.
- **`jefferson.custom.*` (D6).** The name grammar must reserve `jefferson` for Jefferson and must parse three-part names. Nothing in this change may make a later `jefferson.custom.x` collide with something or need a migration.
- **The document's shape and the strings Joel approved (D14, D17).** This covers `rows`, entries, `align`, `rowGap`, the `instruments` block and the `row N, instrument M` placement. Bare names keep every existing document valid (D7), so no user has to migrate anything.
- **The one host-loaded entry.** `pi.extensions` stays exactly `["./extensions/jefferson.ts"]`, and CI asserts this (`.github/workflows/ci.yml:61-72`). The contract subpath is an `exports` entry, never a second `pi.extensions` entry.
- **Host packages stay peers, and `lodash-es` is still imported one function at a time.**
- **The equal-distribution code and its tests (D15).**
- **The notice path stays dormant while no row places a notice** (session-data-store `:502`; `AGENTS.md`). The rename to `jefferson.default.notice` must not break this gate (T7).
- **The README stays essential.** The guide lives in `docs/`, and the README gains one index line (D18).
- **The existing host-data feed.** D2 rules on how instruments register, not on how Jefferson's own data arrives. The feed's seeds, pushes and sampled readers stay. Nothing asks for its "push" vocabulary to be renamed; D4's wording governs what a provider does.

## 3. The traps (measured)

**T1. The bus has no replay, and Jefferson often loads after its providers.**
- `pi.events` is a bare `EventEmitter`. A listener hears an emit only if it is subscribed at that moment (`dist/core/event-bus.js`; Chidi found 1.5.2 identical).
- Package extensions load at rank 4, and local or auto-discovered extensions at ranks 0–3 (`package-manager.js:62-70`, sorted at `:2124`). The pre-trust pass also reorders when factories run (Chidi §2).
- So a provider that registers from its factory is lost whenever it loads before Jefferson.
- A provider that registers from `session_start` or later is always heard, as long as Jefferson subscribes in its factory. `session_start` is emitted only after every factory has run (`agent-session.js:2660-2683`).
- Today `startup.ts` does all of its work inside `session_start` (`startup.ts:51`).
- D5 rules out the other fix, a "ready" broadcast from Jefferson that providers answer, because that would be a third message. If the design finds a case that registering from `session_start` cannot serve, it brings that case to me as a revision of D5.

**T2. Registrations and reports can arrive before the store exists.**
- `session_start` handlers run one at a time in extension order, and each is awaited (`runner.js:813-839`).
- When a provider loads first, its registration and its first reports arrive before Jefferson's handler builds the feed and the store (`startup.ts:68-71`).
- So whatever holds registrations and reported values must exist from the factory on, and the store built at `session_start` must see what arrived earlier.

**T3. One factory sees one session, except in the tests.**
- In pi, a reload invalidates the old runner and runs fresh factories (`agent-session.js` reload path, about `:3000-3030`). `/new`, `/resume` and `/fork` build a fresh runtime (Chidi §1). So one factory instance sees one `session_start`.
- The test harness drives several `session_start` events through one factory (`tests/jefferson.test.ts:294-295`, `:805`).
- `startup.ts` also releases the previous install as if `session_start` repeats (`:20-23`, `:54`).
- The design must state how long provided values live in both situations. It must keep "store data does not survive a session replacement" (session-data-store `:169`) true, without discarding reports that arrived in this runtime before Jefferson's own `session_start` (T2).

**T4. No host event marks "startup has completed".**
- The event types in `types.d.ts` include no such event, and Jefferson's own `session_start` is too early (T1, T2).
- What I measured:
  - `bindExtensions` emits `session_start` to every extension, then emits `resources_discover`, but only if some handler for it exists (`agent-session.js:2680-2686` in 1.4.0; `:2776-2783` in 1.5.2).
  - `/new`, `/resume` and `/fork` go through the same `bindExtensions` (`agent-session-runtime.js:141-299`, 1.5.2).
  - A reload emits the same pair, guarded by `hasBindings` (`:3130-3132` in 1.5.2).
- So a `resources_discover` handler of Jefferson's own runs after every `session_start` handler, on every path that starts a session.
- This corrects Chidi §3, which called it unreliable. It is unreliable only when nobody registers a handler, and Jefferson registering one is what makes it fire.
- No pi document promises this order. If the design uses it, it carries a pin comment like the one in `data/notice.ts`.
- A timer is not a marker, because an async `session_start` handler later in the order can outlast it.

**T5. A late registration has to change an installed footer, and nothing today can.**
- The configuration reader binds each cell when it reads the document: `bind(instrument ?? blank)` (`configuration.ts:238`).
- The renderer reads `fills` once per cell, when it builds the tree (`row-renderer.ts:54`, used at `:88`). The spec requires the tree to be built once (statusline `:260-266`).
- `blank` fills, and it renders "Lorem ipsum dolor sit amet…" (`blank.ts:4-10`; `instrument.ts:6-7`). So replacing a pending blank with a provided instrument changes both the text and the geometry.
- This is the common case, not an edge case. Whenever Jefferson comes before a provider in settings order, every registration made at `session_start` lands after the footer is installed.
- D7's "renders blank until it does" requires the swap. The previous change kept the renderer out of bounds, so the design picks the narrowest mechanism and names the requirement it modifies.

**T6. The `instruments` block is validated against declarations that may not exist yet.**
- `readInstruments` checks options, `format`, `formats` and `style` against the declaration when the document is read. It files a name with no declaration as unknown (`configuration.ts:106-178`). `style` is checked against the live theme (statusline `:608-612`).
- A provided instrument's options can be checked only when it registers, which may be after the footer is installed. What a failure at that point does is J1.

**T7. A name needs one normalization point.**
- The configured map and the binding memo are both keyed by `declaration.name` (`configuration.ts:170`; `instrument-binding.ts:21`).
- The notice gate compares `bind(notice)` by identity and reads `declaredSeconds.get(notice.name)` (`configuration.ts:299-300`).
- Unless bare and full names collapse to one form before all of these run, two things break:
  - `instruments.path` and `instruments["jefferson.default.path"]` become two configurations of one instrument;
  - a row that names `jefferson.default.notice` misses the gate.
- Writing both spellings in one block is a duplicate, against "configures each name once" (`ARCHITECTURE.md:89`). The design must name that duplicate.
- Messages quote what the document wrote, so the user can find it.

**T8. The bus is an untrusted, anonymous boundary.**
- A payload is typed `unknown` (`event-bus.d.ts`: `emit(channel: string, data: unknown)`).
- Any extension can emit on any channel, and "I'm FOO" is only what the payload claims; the bus carries no sender.
- So the design must:
  - validate every payload before it reaches the registry or the store;
  - reserve the `jefferson` namespace;
  - state the rule for a second claim on a taken name. Jefferson registers its own instruments from its factory, before any `session_start` registration, so "first claim wins" protects the built-ins.
- An exception in a bus listener goes only to `console.error`, through the bus's `safeHandler` wrapper (`event-bus.js`), and the TUI may garble it (Chidi §1). Jefferson has to report any fault it cares about itself.

**T9. Provider code runs inside Jefferson's render.**
- A read is synchronous and total, and it never throws (`ARCHITECTURE.md:75`; session-data-store `:33`).
- A provider resolver that throws, returns something other than a string, or returns a Promise must cost one cell, not the footer.

**T10. Each extension gets its own copy of the contract module.**
- jiti loads each extension with `moduleCache: false` (`loader.js:481`). `docs/packages.md:92` says the same, and Chidi's experiment saw two instances of one file.
- Only plain objects and string channel names cross between copies. The contract can use no `Symbol`, no class, no `instanceof` and no module-level state.

**T11. Publishing a `.ts` subpath has costs.**
- A provider's `tsc` under `nodenext` needs an `exports` entry (Chidi §4b).
- The `exports` field does not change how pi loads the entry, because pi resolves `pi.extensions` by file path (`package-manager.js:381-392`).
- Node refuses to strip types from a `.ts` file under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`; Chidi §4a). So a provider's own `node --test` cannot import any runtime export of the contract.
- pi does not install peer dependencies (`docs/packages.md` ~100-114). A runtime import therefore makes `pi-jefferson` a `dependency` of the provider, which pulls in the whole tarball, `lodash-es` included.
- A provider's `tsc` type-checks the contract file and everything it imports, under the provider's compiler flags. Stricter flags are untested (Chidi §4b). A self-contained contract file keeps that surface small.
- Two limits in the repository:
  - CI ships only `package.json`, `README.md`, `LICENSE` and files under `extensions/` (`ci.yml:55-59`).
  - `tsconfig` includes only `extensions/**/*.ts` and `tests/**/*.ts`.

  So a contract file outside `extensions/` fails CI and escapes the type check.
- CI does not check that an `exports` target is in the tarball. A missing target becomes a permanent mistake once published (the comment at `ci.yml:33`).

**T12. A provider's captured `pi` goes stale.**
- After a reload or a session replacement, `events.emit` on the old `pi` throws "This extension ctx is stale…" (`loader.js:143-149`, `:423-433`).
- So a provider whose timer reports after `/new` throws inside its own code. The guide must tell providers to stop reporting at `session_shutdown`.

**T13. The configuration reader names `blank` and `notice` directly, and `shipped.ts` is a static lookup.**
- The imports are at `configuration.ts:20-21`, and the lookup at `shipped.ts:15-21`.
- Under D2, the configuration reader resolves every name, including the fallback and the notice gate, through what has registered. `shipped.ts` becomes the list Jefferson registers, not a second lookup ("no second table of names", statusline `:413-431`).
- `extension-source-layout` `:308-325` and `:360-363` name `instrumentNamed` and its importers, so the change must modify them.

**T14. `data/` imports nothing outside itself, not even types** (`extension-source-layout:245`, `:348`).
- If the store keeps provided fields, the types of the values it holds must be defined in `data/`, or the contract must sit where `data/` may import it.
- Otherwise the contract that providers see and the store's own type state one fact in two places. The design must make one derive from the other.

**T15. Tests can drive pi's real event bus.**
- pi exports `createEventBus` from its public index (`dist/index.d.ts:7`).
- The harness's fake `pi` has no `events` today (`tests/jefferson.test.ts:150-200`).
- A test of registration should use the real bus, not a hand-written emitter and not a substituted registry.

**T16. Documentation this change makes false.** This is minor and never blocks; it goes to the docs pass:
- `AGENTS.md:30-43`, which says adding an instrument means adding a `shipped.ts` entry so `instrumentNamed` resolves it;
- `ARCHITECTURE.md:16`, `:92-95` and `:164-170`;
- `docs/instruments.md:73-90`, which describes the unknown-name warning.

## 4. Questions only Joel can answer

### ▶ JOEL J1. What happens when a provided instrument's configuration doesn't fit its registration?

Take `{"instruments": {"taiknr.savings": {"format": "$saved"}}}`, where taiknr registers `savings` with no `$saved` variable. The same question covers an option the instrument doesn't declare.

Today, every fault in the `instruments` block rejects the whole document and renders the default row (`ARCHITECTURE.md:92-94`; the statusline scenario "An option the instrument does not declare", `:470-474`). That works because every declaration is known when the document is read (`configuration.ts:110`). A provided instrument's declaration arrives later, possibly after the footer is installed (T6).

- **(a) Reject the whole document when the registration arrives.** The installed footer turns into the default row, and the rejection warning names the instrument and the fault.
- **(b) Refuse only that instrument's configuration.** Its entries render blank, as an unknown name does, and a warning names the instrument and the fault. Every other entry renders as configured. Jefferson's own instruments keep the whole-document rule, because their declarations are known when the document is read.
- **(c) Hold the document back until startup completes, then validate it once.** A registration that arrives after startup still needs (a) or (b).

**My pick is (b).**
- The whole-document rule assumes every declaration is known at read time, and for provided instruments that is no longer true.
- Under (a), a provider update that renames one variable takes down the user's whole footer in the middle of a session, Jefferson's own instruments included. The cause is a change in someone else's contract.
- (c) delays every user's footer to handle a case that (b) handles without that delay.
- (b) reuses what a user already sees for an unknown name, a blank entry and a warning that names it, and it guesses no default.

**What this rests on.** `ARCHITECTURE.md:92-94`, the statusline spec's rejection scenarios and `configuration.ts:106-178`. All three are standing records, written while the shipped table was the only source of declarations. Joel's own rejection rulings (D14) are about the document's shape, and all three options keep them.

### Not a question for Joel: does the contract carry resolver code? (the brief's open item)

It does. The evidence settles it, so this is a design decision, not Joel's.

1. D2 puts the shipped instruments on the same path as outside providers.
2. Ten of the eleven shipped declarations carry functions:
   - in `variables`, `variableForms`, `bar`, `variableFg`, `composed.select` and `shownUntil` (`instrument.ts:30-52`);
   - for example, `path.ts`'s `relativeToHome` uses `node:path`, and `tokens.ts` calls `compactCount`.

   Only `blank` is pure data.
3. `pi.events` hands the payload over by reference: `emitter.emit(channel, data)`, with no clone (`event-bus.js`). So the functions arrive intact.
4. Keeping the payload data-only would mean inventing a formatter vocabulary and rewriting every shipped instrument in it. D12 refuses that, and `path`'s home rule and `notice`'s choice of kind would not fit such a vocabulary anyway.
5. A second, data-only shape just for outside providers would be the separate path that D2 forbids.

This revises no ruling. The resolver reads what Jefferson's store hands it, synchronously, as every instrument does today (statusline `:73-79`). Jefferson still owns the store, and a provider still declares and reports (D4). It leaves two obligations for the design: containment (T9), and the narrow readings view in S2.

Keep two things apart. The **registration payload** carries functions the provider wrote. Whether the **published package** carries runtime code is a separate choice (T11).

## 5. What is settled and what stays open

### Settled, by the decision named

- **S1.** The registration payload carries the declaration, resolver functions included (§4).
- **S2. A provider's resolvers read only that provider's declared fields.** Jefferson's own resolvers read the host readings, as they do today.
  - This follows from D4, whose words are *"tell it what to keep for their purpose"*, and from D12.
  - Handing providers Jefferson's `Readings` would turn every field of that interface (`session-data-store.ts:23`) into a published contract.
  - Widening the view later is additive; narrowing it later breaks providers.
- **S3. Providers register from `session_start` or later, and Jefferson subscribes from its factory.** There is no "ready" message (T1, D5).
- **S4. Jefferson emits its built-ins on the bus from its factory and hears them through its own listener.** The configuration reader resolves every name through what has registered (T13, D2).
- **S5. A bare name means `jefferson.default.<name>`, both in rows and in the `instruments` block.** A provider's instrument has no bare shorthand (D7).
- **S6. Both unknown-name forms move to the point where startup completes** (D7, D16, D17).
  - A rejected document still warns at `session_start`. Its faults don't depend on what has registered, and Joel's ruling defers only unknown names.
- **S7. "Renders blank" means the `blank` instrument.** That is the reading the living spec's unknown-name rule already uses (statusline `:1543-1545`).
  - The bold sentence in `owner-rulings.md` is the conductor's restatement. Joel's quoted words cover only the shorthand and when the warning fires.
  - It agrees with the spec, so it stands.
- **S8. R1 is retired by D1–D3**, with modified spec deltas and an ADR.
- **S9. The guide's home is fixed (D18), and the guide uses "declare" and "report" (D4).**
- **S10. The registry is the feature D2 asks for.** "Separation uses plain imports" does not apply to it, because that requirement governs layout changes and seams meant for separation or testing. For the same reason, no test substitutes it (T15).
- **S11. The release takes `release:minor`.** It is a feature before 1.0, by the same reasoning as decision 13 of the previous change.

### Open for the council and the design

- **O1.** The marker for "startup has completed" (T4).
- **O2.** How a cell takes its instrument after the footer is installed, and which renderer requirement that modifies (T5).
- **O3.** Where registrations and reported values live before the store exists, and how long they live (T2, T3, T14).
- **O4. The contract package:**
  - where the file sits under `extensions/`;
  - whether it is types-only;
  - its `exports` entry;
  - a CI check that the `exports` target ships;
  - the export pin, rewritten for the new surface (T10, T11, R1).
- **O5. Validation at the bus:**
  - the payload's shape;
  - the name grammar: dots, and the reserved `jefferson`;
  - the rule for duplicate names;
  - what a report does for an undeclared field, or before its provider registers;
  - what a refused registration tells the user (T8).
- **O6.** How provider code is contained at render time (T9).
- **O7. The two channel names, and how the contract grows:**
  - change 3 adds to it;
  - an older Jefferson can receive a newer provider's payload.
- **O8. What a field's declaration holds:** its name, its type (the types include boolean) and whether it carries a first value (D8).
- **O9. Where the spec text lives:**
  - deltas to statusline, extension-source-layout and session-data-store;
  - whether the contract gets a capability spec of its own;
  - the ADR for R1.
- **O10. Whether the pending state is ever painted.** Measure whether a frame paints between Jefferson's install and a later provider's registration at `session_start`. If one does, users see the `blank` placeholder in that entry for that frame (T5).

## What this pass did not cover

- I did not measure when the first frame paints relative to later `session_start` handlers (O10).
- I did not run pi live through `/reload`, `/new`, `/resume` or `/fork`. My lifecycle claims come from pi's source.
- I spot-checked Chidi's 1.5.2 citations only for `agent-session.js`, `agent-session-runtime.js` and the precedence ranks. The rest of the 1.5.2 citations, such as the loader lines, I took from the 1.4.0 copy.
- I did not measure how a provider's `tsc` behaves under stricter compiler flags (T11).

Later gates must check the design's chosen marker (O1) and the late-binding mechanism (O2) against a real bus, using `createEventBus`.