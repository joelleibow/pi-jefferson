# Owner Rulings

Joel's rulings for this change, quoted and dated. They bind, and they are newer than every other artifact in this change directory.

## 2026-11-15: The feature, from the Explore session

He explored this with Conductor Janet. In his words, the idea: *"Since starting to work on taiknr it's feeling like there's a need to allow other extensions to provide instruments."* What taiknr wants in the footer: *"A measurement of stubs created, including a total tokens they hold. Each turn it reports omitted tokens, total tokens sent, and resulting savings of context and dollars. It would be great if it could report when it's making decision calls, as well, and provide affordance that it's happening."*

- **Each extension owns its instruments, in its own repository.** *"taiknr doing the work in its own repo is a driving requirement. other extensions own their instrument. And yes, it shouldbe able to provide multiple instruments but could just provide one"*. **Jefferson provides the contract. A provider builds its instruments in its own repository and may register one or several. This change does not touch the taiknr repository.**
- **Registration is by events, and Jefferson's own instruments use it too.** *"Shifting to event based registration is beneficial for outside instruments. Jefferson should follow the same pattern in registering provided instruments"*. **The shipped instruments register through the same event path that outside extensions use. There is no separate static path for them.**
- **The contract is a small package that Jefferson publishes, at `pi-jefferson/instruments`.** He was offered a published package or a documented event shape that providers copy. He said: *"I like the small package Jefferson publishes"*. Then: *"pi-jefferson/instruments is a better name than contracts."*
- **Jefferson owns the store. A provider declares what to keep, then reports changes.** *"Jefferson manages the store. other extensions tell it what to keep for their purpose. i think that's what you mean by pushing into the store. I'm confused because they aren't actually pushing as much as saying "hey, the store needs this""*. He was shown the two moments: a provider declares the fields to keep when it registers, then reports a new value when it learns one. He confirmed: *"yes, exactly! that's the place to start, at least"*. **Use the words "declare" and "report", never "push".**
- **There are two messages.** In his words: *"hey, I'm FOO and i have an instrument that will show this data"* and *"hey, I'm FOO and my data, BAR, changed"*.
- **A provided instrument's name is namespaced to its extension.** *"namespaced to the extension, for sure. it's what mcp does"*. **A provided instrument is named `<extension>.<instrument>`, for example `taiknr.savings`.**
- **Jefferson's own instruments are `jefferson.default.*`.** He asked: *"why does my gut say to do jefferson.default.*?"* He was told that a later set of user-composed instruments, `jefferson.custom.*`, would need a name of its own. He said: *"well there we go. default is needed"*.
- **A bare name is shorthand, and an unknown name warns only after startup.** He was asked whether a bare `path` should still mean `jefferson.default.path`, and when an unknown name should get its warning. He said: *"yes. path is default and after startup is completed we warn"*. **A bare name means the `jefferson.default.*` instrument of that name. An entry whose instrument has not registered renders blank until it does. Jefferson warns that a name is unknown only after session startup has completed.**

## 2026-11-15: Rulings that bind other changes

- **The spinner is the third change, not this one.** *"a would be what default pi does itself with working. users are going to like familiarity like that"*: pi's own spinner shows in-progress work. Joel also said: *"data can include bools like `working = true`"*. That change uses this change's contract. **This change must leave a provider able to declare and report a boolean field. It must not build the spinner.**
- **The guide for extension authors.** Joel ruled on the README and docs/ (see the archived change `reshape-the-configuration`, `owner-rulings.md`): *"... a logical abstraction of sections and their content created in the docs directory, especially considering the opening up for outside instruments and needing clear instructions for how someone does that ... plus writing those with /skill:what-the-fork verbiage through /skill:my-voice"*. **This change adds the guide for extension authors to `docs/`, in that voice.**

## 2026-11-15: Contributor documentation moves out of the user docs

Joel asked: *"Do we need releasing for users or is that strictly an internal and/or contributors doc?"* He was told that `docs/releasing.md` is for contributors only, and offered a fix. A root `CONTRIBUTING.md` would hold the release steps and the development commands that are now in the README. The README would keep its user index. The reasoning in `docs/releasing.md` would become an ADR. This would fold into this change's docs pass. He said: *"Yeah, fold it in. It'll help with clarity for folks."*

**This change's docs pass adds a root `CONTRIBUTING.md`, holding release and development. The README and `docs/` stay for users. The reasoning about how releases are versioned goes into an ADR. `docs/releasing.md` is removed once its content has a home.**

## 2026-11-15: Answer to Michael's orientation

- **J1, a provided instrument whose configuration does not fit its registration.** Joel's options were these:
  - (a) reject the whole document when the registration arrives;
  - (b) refuse only that instrument's settings, render its entries blank and warn, and keep the whole-document rule for Jefferson's own instruments;
  - (c) hold the whole document until startup completes.

  He answered: *"my pick is b"*. **When a provided instrument registers, Jefferson checks that instrument's settings in the `instruments` block against what it registered. A fault refuses only that instrument: its entries render blank, and a warning names the instrument and the fault. The rest of the document renders as configured. Jefferson's own instruments keep the whole-document rejection.**

## 2026-11-15: The contract is types-only

Michael's council ruling removed the `registerInstruments` runtime helper. Pi does not install the peer dependencies of the packages it manages, so a runtime import would force every provider to carry `pi-jefferson` as a full dependency. Joel was offered two choices: (a) types only, where each provider writes the handshake of about six lines against the types; or (b) types plus the helper. He said: *"I agree with Michael. That's honestly what my mind was seeing as the package, tyoe imports for sanity sake of the consumer and knowing they're valid without having to run anything."*

**`pi-jefferson/instruments` carries types only. A provider imports them with `import type` and writes the handshake itself. The extension-author guide shows the handshake. This clarifies the earlier ruling, "I like the small package Jefferson publishes": the package is the types.**

## 2026-11-15: The two channel names

The design left the channel strings open. Ruling M9 makes them permanent: a rename is a breaking change. Joel was offered three pairs: (a) `jefferson:declare` / `jefferson:report`; (b) `jefferson:register` / `jefferson:report`; and (c) nouns, following pi's `my:notification` pattern. He said: *"based on the pi my:notification noun thing, jefferson:registration and jefferson:update. those are what are being posted, so to speak"*.

**The two channels are `jefferson:registration` and `jefferson:update`. A provider posts a registration on `jefferson:registration`: it declares its instruments and fields. It posts an update on `jefferson:update`: it reports a field's new value. Each channel is named for the thing posted on it. "Declare" and "report" still name what the provider does.**

## 2026-11-16: Names and unused settings, during Validate

Judge Gen's Validate pass raised two items. W2: the settings of a provided instrument named only in the `instruments` block were never checked when Jefferson loaded first. W3: `"a.b.c"` slipped past the two-part rule for provided names. Joel answered both.

- **Names.** *"names should be able to be whatever someone wants them to be but `jefferson.default` belongs to Jefferson only. `default` is the important detail, not the number of namespaces."* **A provided instrument's name is no longer limited to `<extension>.<instrument>` in lowercase. The only reserved names are those under `jefferson.default.*`.** This replaces the two-part rule and the name grammar in the `instrument-registration` delta. Joel then settled the `jefferson.custom.*` question: *"A provider should never be able to do anything with an instrument starting with the jefferson namespace. That should immediately throw if they try to. eg, taiknr intends to have 4 instuments all starting with `taiknr.`"* **Everything under `jefferson.` belongs to Jefferson: `jefferson.default.*`, `jefferson.custom.*`, and any other name that starts with `jefferson.`. A provider's registration that claims one is refused at once. A provider's instruments live under its own name, such as `taiknr.`. Apart from that, an instrument name may be whatever its provider wants.**

  Joel was told that a throw cannot reach a provider over pi's bus: `safeHandler` catches it and logs it, and `emit` returns normally. He was offered a compile-time check in the published types, with the runtime refusal kept as a backstop. He said: *"yes!  that's perfect"*. **The types in `pi-jefferson/instruments` reject an instrument name that starts with `jefferson.`, so a provider's `tsc` fails before it runs. At runtime, a registration that claims a `jefferson.` name is refused with its warning.**
- **Unused settings.** Joel asked: *"should we not scan settings at all for instruments we don't know and only check them once we're aware of them? It seems that there's no harm in config for an unknown instrument sitting there that we're never made aware of."* He was offered two choices: Jefferson stays silent about an `instruments`-block entry whose instrument never registers, or Jefferson warns once after startup. He chose *"Silent (Recommended)"*. **An `instruments`-block entry for an instrument that never registers draws no warning. Its settings are checked only when that instrument registers. A row that names an unregistered instrument still warns after startup, because the row renders blank.**

## Earlier rulings this change inherits

- **2026-11-03, vocabulary:** a row holds cells, and a cell holds an instrument. *"`module` and `widget` are rejected words."* Since 2026-11-15, "cell" no longer appears in anything a user reads (ADR 0015).
- **2026-11-07:** *"A user shouldn't have to configure any more than truly necessary."*
- **2026-11-03:** *"Don't invent what we don't have to."*
- **Joel's preferences:** configurable strings over localization; reusable, composable visuals over behaviour baked into one instrument.
