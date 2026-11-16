# Owner Rulings

Joel's rulings for this change, quoted and dated. They are binding, and newer than every other artifact in this change directory.

## 2026-11-15: What the change is

This change comes out of an Explore session about letting other extensions provide their own instruments. The session produced three changes, to land in sequence. This is the first.

- **Three changes, in order.** *"I think three is easier for implementation."* Asked to start, he said: *"that first card!!!"* **This change reshapes the configuration. Registering instruments over `pi.events` and pi's spinner are later changes, and they build on this one.**
- **Breaking is allowed.** *"we're safe to break things but we're getting closer toa 1.0.0."*
- **A row is a list.** He was shown three shapes for a row that holds its instruments. One of them, A, renamed the top-level `instruments` block to make room. He said: *"A feels ideal. couldn't rows be a list of lists of objects and we dont need the instruments per row? the top level key is safe"*. **`rows` is a list of rows, and each row is a plain list of entries. An entry names its instrument: `{ "instrument": "path" }`. The top-level `instruments` block keeps its name and its job, which is each instrument's settings: label, format, seconds and the rest.**
- **Alignment stays on the entry.** He asked: *"the left, right, and center would be on the instrument object?"* He was told yes, and the shape went forward on that. **`align` stays on each entry in a row: `{ "instrument": "model", "align": "right" }`.**
- **"Cell" leaves the words users see.** *"is now the time to remove `cell` from the nomenclature? it was a decision that we don't really need. its needed internally but I'm not certain the overloaded term should leak to users"*. **"Cell" no longer appears in the configuration's keys, in its warnings, or in the README. The code keeps the word.** This retires the user-facing half of the 2026-11-03 vocabulary ruling below, so an ADR must record the retirement.
- **A warning calls an entry an instrument.** He was shown warnings that place an entry by its row and its position, such as `row 1, instrument 2: no "instrument" named` and `row 3: "taiknr.savings" is not a known instrument`, and asked whether they read right. He said: *"yes"*.
- **`distribution` leaves the configuration, and its code stays.** *"yeah. it seems safe to drop. we should keep the code in place though, in case it resurfaces"*. **A configuration can no longer set `distribution`. The renderer's support for both distributions stays in the code, along with its tests.**

## 2026-11-15: Answers to Michael's orientation

- **The one-row shortcut is retired.** Joel was offered three choices for the 2026-11-02 shortcut, under which a one-row file put `"cells"` at the document's top level: (a) retire it, so that `rows` is the only form; (b) keep it under a new key; (c) let `rows` hold either a flat list or a list of lists. He answered: *"a"*. **`rows` is the only way to write rows. A document that still uses the old top-level form is rejected, and the message shows the new form.**
- **Warnings count from 1.** Joel was asked whether `row N, instrument M` counts from 1 or from 0. He answered: *"sure, 1"*. **Both numbers count from 1.**

## 2026-11-15: The README and docs/

Joel, during Plan: *"the readme is getting to be a dumping ground of bambadjan's thoughts. i'd really like to see that reduced to the essential informationa readme should provide anda logical abstraction of sections and their content created in the docs directory, especially considering the opening up for outside instruments and needing clear instructions for how someone does that. Hopefully that's enough to understand what would be great to have. plus writing those with /skill:what-the-fork verbiage through /skill:my-voice and i'd be pleased"*.

- **The README is cut down to what a README should hold.** The rest moves into topic documents under `docs/`, grouped in a way a reader can follow.
- **The writing follows two of Joel's skills.** The `what-the-fork` skill sets the wording: Simplified Technical English, one idea per sentence, and the same word for the same thing every time. The `my-voice` skill sets the register.
- **The structure leaves room for a guide for extension authors.** Jefferson will soon accept instruments from other extensions, and those authors need clear instructions.

Conductor's scope call: this change rewrites every configuration example in the README anyway, so it does the restructure. The guide for extension authors documents a contract that does not exist yet, so it belongs to the registration change, which adds it to the `docs/` structure this change creates.

## Rulings for the later changes

These were given in the same session. They bind the later changes, not this one. They are listed so that nothing in this change contradicts them.

- **Names.** *"namespaced to the extension, for sure. it's what mcp does"*. Extension instruments take names like `taiknr.savings`. Jefferson's own take `jefferson.default.*`: *"well there we go. default is needed"*. And: *"yes. path is default and after startup is completed we warn"*. **A bare name such as `path` is shorthand for `jefferson.default.path`. An unknown name gets its warning once startup has completed.**
- **Registration.** *"Shifting to event based registration is beneficial for outside instruments. Jefferson should follow the same pattern in registering provided instruments"*.

## Earlier rulings this change inherits

- **2026-11-03, vocabulary:** a row holds cells, and a cell holds an instrument. *"`module` and `widget` are rejected words."* The 2026-11-15 ruling above retires this for users only.
- **2026-11-07:** *"A user shouldn't have to configure any more than truly necessary."*
- **2026-11-03:** *"Don't invent what we don't have to."*
