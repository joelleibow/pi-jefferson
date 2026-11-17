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

## 2026-11-16: There is no "entry"

While reviewing `docs/extension-authors.md` for task 5.7, Joel read *"A row holds entries. An entry names one instrument. The instrument renders the text for that entry."* He said: *"This isn't accurrate. We don't have anything called an entry."* **"Entry" is not a word that users or extension authors read. A row holds instruments. User-facing text and printed warnings say "instrument", or describe a row's position, and never "entry". The code may keep its internal names.** This corrects the archived 0.13.0 change, whose bolded summary introduced "entry" when Joel had said *"the instrument object"*. It also corrects ADR 0015's line that users read "row, entry and instrument".

He also accepted a correction to the guide's opening line, *"That makes sense"*. The provider supplies the data, meaning its fields, its variables and a default format. The user places the instrument and may change its format in `pi-jefferson.json`. Jefferson draws it. User-facing text says "configuration file", not "document".

## 2026-11-16: The guide describes the contract and does not prescribe code

While reading `docs/extension-authors.md`, Joel quoted *"Write each channel name once, in a constant typed by the contract. TypeScript then rejects a misspelling"* and said: *"There's excessie `\n` in there and also througout the document. Also, I don't think we should be telling others how to write their code. There's no reason to state that they have to use a constant."*

- **The guide states what the contract is and what Jefferson does, and does not tell a provider how to structure its code.** It may mention that a type exists, such as `RegistrationChannel`. It does not instruct the provider to use one.
- **Markdown prose is not hard-wrapped.** A paragraph is one line, and a list item is one line. Fixed-width line breaks inside a sentence are removed from every Markdown file this project writes.

## 2026-11-16: Internal vocabulary is ours, not the author's

The guide told authors *"Use the words declare and report."* Joel said: *"They can use whatever names they want. They just need to know that they're posting a registration or posting an update. They can call a posted update a \"Flastoidbomsterous\", we don't care whatsoever."* **The guide never tells an author which words to use. It names the two things an author posts, a registration on `jefferson:registration` and an update on `jefferson:update`, and says what each carries. "Declare" and "report" stay the team's internal words (2026-11-15) and are not imposed on authors.**

## 2026-11-16: An unused variable never blanks an instrument

An instrument blanked whenever any variable it declares resolved `undefined`, including variables the user's format does not name. `resolveFormat` resolves every declared variable (`format.ts:222-226`), and this behaviour predates this change. For example, taiknr declares `$saved` and `$stubs`, the user's format is `"$saved"`, and `stubs` has not been reported yet: the whole instrument shows nothing. Joel said: *"That's a bug. Not every variable provided has to be consumed. It doesn't matter if it's in format or not. If the extension provides it the it's the extensions responsibility to provide updates. Whether someone is using it or not should have no bearing on the rendering of instruments that use other provided variables."* **Only the variables a format names can blank its instrument. A declared variable the format does not use is not resolved for that render and has no effect. This applies to Jefferson's own instruments as well as provided ones. It is a defect fix in this change.**

## 2026-11-16: Bare names belong to Jefferson; Jefferson does the namespacing

The guide said *"A name with no dot means one of Jefferson's own instruments. A bare name never reaches yours."* Joel asked whether that was true. When asked whether a bare name in a row should be able to reach a provided instrument, he said: *"Bare names are just Jefferson's. We do not require extensions to name their instruments with a `.` though. We should be doing that namespacing internally, not putting the responsibility onto consumers."* **In `pi-jefferson.json`, a bare name means `jefferson.default.<name>`, and a provided instrument is placed by its full name, `taiknr.savings`. A provider registers a plain name, `savings`, together with its extension name. Jefferson composes `<extension>.<name>` itself. The guide never asks an author to write a dot or to namespace anything.**

## 2026-11-16: User-facing docs get an editorial pass on Opus 5.5

Joel read the whole of `docs/extension-authors.md`, then said: *"I would really like all customer/user facing docs to go through a different model. Is it possible to run those through Opus 5.5 with high thinking and require a complete editorial pass over all user facing documents? The same /skill:what-the-fork and /skill:my-voice requirement with /skill:clear-prose stands."* **Every user-facing document gets a complete editorial pass, not a patch pass, by the documenter seat running `anthropic/claude-opus-5-5` with high thinking. That covers README.md, CONTRIBUTING.md, and docs/ apart from the ADRs. The pass applies the what-the-fork, my-voice and clear-prose skills.** (The seat's default model is DeepSeek Flash at medium thinking, and it wrote the prose Joel rejected.)

## 2026-11-16: Providers get what Jefferson's instruments get

Joel, during taiknr's Explore: *"there was a decision to not allow $bar within an extensions instruments. Why is that? Anything a Jefferson instrument can do should be open to extension authors to do, as well."* Michael's council ruling M14 had left `bar`, `variableForms`, `fills`, `variableFg`, `shownUntil`, `options` and `composed` out of the contract. That was minimalism, and it was never Joel's call. Joel was told that `shownUntil` needs a scheduled expiry repaint for a provider's value, which the store has only for the notice slot, and that change 3's spinner timer is the natural base for it. He said: *"I like that separation. Let's get them the easy parts now and we'll follow up with the showUntil part afterward."*

- **The principle:** anything a Jefferson instrument can do is open to extension authors.
- **This change:** the contract offers `bar`, `fills`, `variableForms`, `variableFg`, `options` and `composed` to providers, with the same fault containment as variables. It also checks provided options at registration, as J1(b) does for format, label and style. M14 is overruled for these six.
- **Follow-up:** `shownUntil` for providers, built on change 3's timer. It is not in this change.

## 2026-11-16: Variables are never coupled

Michael's re-validation asked whether a composed variable with nothing to compose (an empty `select`, or a kind whose text is empty) should blank the whole instrument when the user's format does not name it. That is K3's carve-out, which was kept for the 2026-11-11 notice ruling. Joel said: *"No. We shouldn't be coupling variables together like that in any way. If your neigbor doesn't have a car that's doesn't mean you can't drive."* **No variable's emptiness affects any other variable. A composed variable blanks its instrument only when the format names it, exactly like any other variable. K3's unconditional blank is removed. A notice format that leaves out `$notice` (for example `"!"`) renders even while a silenced kind is live. The 2026-11-11 notice ruling holds for any format that names `$notice`.**

## Earlier rulings this change inherits

- **2026-11-03, vocabulary:** a row holds cells, and a cell holds an instrument. *"`module` and `widget` are rejected words."* Since 2026-11-15, "cell" no longer appears in anything a user reads (ADR 0015).
- **2026-11-07:** *"A user shouldn't have to configure any more than truly necessary."*
- **2026-11-03:** *"Don't invent what we don't have to."*
- **Joel's preferences:** configurable strings over localization; reusable, composable visuals over behaviour baked into one instrument.
