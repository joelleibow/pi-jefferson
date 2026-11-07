# Design

## Context

Why the change exists is in `proposal.md` and `owner-rulings.md`; this section holds only what the mechanism rests on.

**What exists** (`research-eleanor.md` §2, §3 and Addendum 1):

- `extensions/jefferson.ts` (130 lines) is the one entry. Its default export holds three responsibilities: startup (the `/jefferson` command, the `session_start`/`model_select`/`thinking_level_select`/`turn_end` subscriptions, the release), config loading (the two `pi-jefferson.json` paths) and footer setup (the `setFooter` callback). It also exports `VERSION`, which no shipped file reads. Only tests read it (Addendum §1).
- `extensions/jefferson/configuration.ts` (324 lines) holds config loading and, with it, the binding of instruments to formats: `BindInstrument`, `ConfiguredInstrument` and `instrumentBindings` (Eleanor §2). Addendum §3 shows those three use only `./instrument.ts` and `./format.ts`, never anything defined in `configuration.ts`. The same file defines `Cell`, `CellAlign` and `Row`, the types the renderer consumes, and the tuple `ALIGNMENTS` that `CellAlign` derives from (`configuration.ts:18-19`). `isAlign`, `blankCells` and the rejection message read that tuple at run time (`configuration.ts:22-23`, `:148`, `:180`).
- `instrument.ts`, `format.ts` and `row-renderer.ts` each hold one responsibility, visuals. `session-data-store.ts` holds data and imports no local file. `Readings` reaches the visuals as a type only (Eleanor §2, §3).
- The graph is acyclic today. Only the entry imports the three working parts it needs, and nothing imports the entry (Eleanor §3). No standing check enforces this (`michael-orientation.md` T5).

**What binds the solution:**

- Joel's rulings: the objective, "restructure card and only that card", the two boyscout fixes with no workflow, plain imports and "just good discipline", and the vocabulary (`owner-rulings.md`). The council recommends extraction, not relocation, and no ruling is outstanding (`council.md`).
- The load shape: the entry stays a file named by `pi.extensions`, and working parts live under `extensions/jefferson/` (`michael-orientation.md` D-a). Nested directories are safe at any depth because the manifest is the allowlist (`research-chidi.md` §1). Relative imports name the file with `.ts`, and Node refuses a bare directory import (`research-chidi.md` §5).
- The host reloads the whole extension runtime on `/reload` and calls `session_shutdown` then `session_start`, so the footer is re-registered from `session_start` (`research-chidi.md` §3).
- ADRs 0002 to 0004 fix behavior this change carries over untouched, including `lodash-es` imported per function (`michael-orientation.md` D-d; Eleanor §1).

**How the requirements in `specs/extension-source-layout/spec.md` are met:**

| Requirement | Satisfied by |
|---|---|
| Behavior and the configuration surface preserved | D1, D3 to D6, D11: extraction moves code and changes no signature `readConfiguration`'s callers see; the install order is carried over step by step |
| The existing tests are the proof | D10 |
| The export surface stays free of any way to contribute cell content | D9 |
| Each responsibility has a home recognizable from its path | D2 and its table, D3, and the amended 'Looking for a responsibility' scenario |
| Data and its updates do not depend on visuals or process flow | D2, D7 and D8: the data home imports no file outside it, and the store imports no local file |
| Separation uses plain imports | D8 (no new seam; the store's readers stay as they are), D4 (`receiveRepaint` argued) |
| Relative imports name the file | D10: the graph check also refuses a specifier that does not end in `.ts` |
| The manifest names the entry as a file | D1: `package.json` `pi.extensions` is not edited |
| The import graph is shown acyclic | D8 states the edges; D10 produces the evidence |

The existing eight requirements are not revised. The new directory is nested under `extensions/jefferson/`, not a top-level source directory, so "Growth is a named change" does not apply to it. This change is the named change in any case.

## Goals / Non-Goals

**Goals:**

- Each of the five responsibilities (startup, config loading, footer setup, data and its updates, visuals) has a home whose path names it, and no shipped source file holds two.
- The seams are extracted from the two files that mix responsibilities, not just moved (`council.md`).
- The graph stays acyclic and every edge is plain, with no new seam of any kind.
- The behavior the user and the host observe is identical, and the existing tests prove it.
- Each step lands separately and stays green, so any one reverts alone. This is "make the change easy": the moves that touch only specifiers go first, and the extractions that change code follow.

**Non-Goals:**

- The other four cards: label gap, cell grouping, instruments for every datum pi provides, thresholds on the context instrument (`owner-rulings.md`).
- Any change to what the user sees, to `pi-jefferson.json`, to its warnings or to the `/jefferson` command's output. Michael's consult routes any such change to Joel first (`michael-orientation.md` §3).
- Moving or renaming the entry, a manifest that names a directory, a new top-level source root (`michael-orientation.md` §3, T1). Each would revise Joel's layout ruling.
- A registry, container, port or injection parameter introduced for separation or testing (`owner-rulings.md`, 2026-11-03; ADR 0001). The store's injected readers stay exactly as they are.
- Splitting `session-data-store.ts`, `instrument.ts`, `format.ts` or `row-renderer.ts`. Each holds one responsibility (Eleanor §2).
- A standing cycle check, a new test file or a new dependency. The proposal adds none.
- Removing `VERSION`. Nothing in shipped code reads it, but it is part of the pinned export surface and a restructure does not delete exports (Addendum §1).
- Moving the tests. They stay in `tests/`, and the layout spec forbids them beside shipped files.

## Decisions

### D1. Extract the mixed responsibilities; do not only move files

**Decision.** The entry and `configuration.ts` are split along the seams in Context. The three single-responsibility visual files move into a visuals directory, and the store joins the new data-side file in a data directory, so the data/visuals line shows in the tree.

**Reasoning.** Joel's complaint names seams inside files: startup, config loading, footer setup, and data kept apart from visuals (`owner-rulings.md`). Moving the five files into directories leaves the entry mixing three things and `configuration.ts` mixing two. The council recommends extraction and sends no question to Joel (`council.md`; `michael-orientation.md` §4).

**Alternative rejected.** Relocation only: it satisfies the words and keeps the complaint (`michael-orientation.md` §4, "a cosmetic move"). A new ruling from Joel that he meant relocation only would reverse this decision (`council.md`).

### D2. The homes: one file per responsibility, a grouping directory where a responsibility owns several files

Every new file sits under `extensions/jefferson/`. The manifest and `files` are unchanged, and `tsconfig.json` `include` already covers `extensions/**/*.ts` (Eleanor §5).

| Responsibility | Home | What would change it |
|---|---|---|
| Registering the extension | `extensions/jefferson.ts` (stays; `VERSION` and a default factory that calls `startUp`) | The load contract: what the host expects of an entry |
| Startup | `extensions/jefferson/startup.ts` | The install lifecycle: when an install starts and is released, and in what order its steps run |
| Config loading | `extensions/jefferson/configuration.ts` (stays; gains path resolution) | The `pi-jefferson.json` document: where it lives and what it may contain |
| Footer setup | `extensions/jefferson/footer-setup.ts` | pi's footer contract: the `setFooter` factory and the component it returns |
| Data and its updates | `extensions/jefferson/data/` | Which datums pi provides and how each is kept current. See the membership rule below |
| Visuals and process flow | `extensions/jefferson/visuals/` | See the membership rule below |

Files in `data/`, each with a single answer:

| File | Holds | What would change it |
|---|---|---|
| `data/session-data-store.ts` (moved; content untouched) | The datums, `sample`, the push targets, the totals scan and its cache | Which datums the store holds and how a reading is derived from them |
| `data/session-data-feed.ts` (new) | The adaptation from the host to the store, extracted from the entry: the seed from `ctx`, the readers `readUsage` and `readEntries`, the `model_select`, `thinking_level_select` and `turn_end` push bindings, and the release that undoes them and disposes the store | How the host's session and events reach the store: which `ctx` fields seed it, which events push into it, how each payload is unwrapped |

Files in `visuals/`, each with a single answer:

| File | Holds | What would change it |
|---|---|---|
| `visuals/instrument.ts` (moved) | The instrument declarations and their variables | The set of instruments and what each shows |
| `visuals/format.ts` (moved) | The format-and-style language | The grammar of a format or style |
| `visuals/instrument-binding.ts` (new) | `BindInstrument`, `ConfiguredInstrument`, `instrumentBindings`, extracted from `configuration.ts` | How a configured format and style are applied to an instrument declaration |
| `visuals/row.ts` (new) | The align set `ALIGNMENTS` and the types `CellAlign`, `Cell`, `Row`, extracted from `configuration.ts` | The shape of a row and a cell, and the alignments a cell may take |
| `visuals/row-renderer.ts` (moved) | The footer tree, clip, pad and align of a cell, and the per-render flow (see below) | How rows are drawn at a width |

**What process flow means here.** The delta spec makes "visuals and process flow" one home (`specs/extension-source-layout/spec.md`, "Each responsibility has a home recognizable from its path"). Process flow is the per-render flow held in `visuals/row-renderer.ts`: sampling the readings, memoizing the sample per render and re-seating on a width change. Eleanor §2 classifies that file as "visuals and process flow (footer tree, cell clip/pad/align, per-render sample memoization)"; the re-seat on a width change is `ARCHITECTURE.md:52` ("On a width change, `clear()` plus `addChild` re-seats the same components") and `extensions/jefferson/row-renderer.ts:61` (`stack.clear()`). The install lifecycle is startup, a separate home with its own row. No file is added for process flow.

**The directories' membership and rules** (the layout spec's "Responsibility is inferable from path" requires both).

- `data/` holds the source files that keep session data and take it from the host. A file in it may import host packages and other files in it. It must not import `startup.ts`, `footer-setup.ts`, `configuration.ts` or any file in `visuals/`. Files outside it may import any of its files; visual files import its types only.
- `visuals/` holds the source files that decide what a cell shows or how rows are laid out and drawn. A file in it may import host packages, other files in it, and types from `data/session-data-store.ts`. It must not import `startup.ts`, `footer-setup.ts` or `configuration.ts`. Files outside it may import any of its files.

**Reasoning.** Joel's complaint is a flat directory with everything in it (`owner-rulings.md`). Visuals owns several files (Eleanor §2), and data owns two once the adaptation leaves the entry (D3), so each earns a directory. Every other responsibility owns one file, already or after extraction, and the file's name states it. A directory holding one file adds a path segment and no information. The adaptation sits in the data home and not in `startup.ts` because Joel's objective is *"distinguishing data and data updates from visuals and process flow handling"* (`owner-rulings.md`): with the seed, the readers and the push bindings in `startup.ts`, a card that adds an instrument for another datum pi provides would edit the lifecycle file for a data reason, and "what would change this?" would have two answers. The archived `session-data-store` decision that the store names no host event stays true: the feed names them, the store does not.

**Alternatives rejected.**

- `config/` and `footer/` directories as well as `data/` and `visuals/`, all beside `startup.ts` (`council-argon`). The first two would hold a single file each.
- A `src/` root. Anything outside `extensions/` is not in the tarball, and tests pass locally either way (`michael-orientation.md` T2). A new source root also revises Joel's ruling.
- Naming the process-flow half of Joel's phrase as a separate home. It is the renderer's flow, which `visuals/row-renderer.ts` holds, so a separate home would split that file for no second reason to change.

### D3. The entry only registers; startup holds the lifecycle

**Decision.** `extensions/jefferson.ts` keeps its header comment, `VERSION` and a default `jefferson(pi)` that calls `startUp(pi)` from `startup.ts` and does nothing else. `startup.ts` exports `startUp(pi)` and holds the install lifecycle, which is what the entry holds today except the footer callback, the path resolution and the ctx-to-store adaptation:

- the `/jefferson` command (`registerCommand`, reading `footerRows`);
- the `session_start` handler with the mode guard, the release of the previous install, and the calls that install the store, read the configuration and install the footer, in the order D11 gives;
- `releasePrevious`, `footerRows` and the `requestRepaint` variable.

The state `startUp` keeps stays in its closure, where it is today (Addendum §2). Nothing about its lifetime changes.

The adaptation from `ctx` to the store moves to `data/session-data-feed.ts` (D2): the seed, the two readers `readUsage` and `readEntries`, the creation of the store, the three push subscriptions, and `release` with its idempotence flag. `data/session-data-feed.ts` exports `feedSessionData(pi, ctx, requestRender)` and returns `{ store, release }`. `requestRender` is the store's existing option of that name, forwarded; `startUp` passes `() => requestRepaint?.()`. The `released` flag stays in a closure per call, one per install, as it is today. `startUp` assigns the returned `release` to `releasePrevious` and passes it to the footer as `dispose`.

**Reasoning.** The entry then has one answer to "what would change this": the load contract. `startup.ts` has one: the install lifecycle. The three push subscriptions go with the seed and readers because all of them change when a datum is added or a payload is unwrapped differently, which is the data reason (D2). The delta spec's scenario "Looking for a responsibility" (`specs/extension-source-layout/spec.md`) agrees: it names startup as where the session-start lifecycle and the `/jefferson` command are registered, and the data home as where the host's session and events reach the session data.

**Alternatives rejected.**

- Leaving the lifecycle in the entry and extracting only the footer and the paths. The entry would stay the file a reader has to open to learn the install order, and it would still hold two answers.
- Leaving the seed, readers and push bindings in `startup.ts`. `startup.ts` would answer both the install lifecycle and which datums pi provides, and the next card (instruments for every datum pi provides, `owner-rulings.md`) would edit it for data reasons.
- Keeping the `pi.on` calls in `startup.ts` and moving only the payload unwrapping. Adding a datum would then still edit two files.

### D4. Footer setup is the adapter for `setFooter`

**Decision.** `footer-setup.ts` exports `installFooter(ui, { rows, sample, dispose, receiveRepaint })`. It calls `ui.setFooter` with a factory that builds `createFooter(rows, sample, theme)` and returns `{ render, invalidate, dispose }`, where `dispose` is the `dispose` it was given. Inside the factory it calls `receiveRepaint(() => tui.requestRender())`, handing over the repaint function once. `startUp` passes `sample: () => store.sample()`, `dispose: release`, and a `receiveRepaint` that sets the `requestRepaint` the feed's `requestRender` closure reads.

**Reasoning.**

- **One reason to change.** It is the only place that knows pi's footer factory shape and component contract (`research-chidi.md` §3).
- **`requestRepaint` crosses the boundary without shared state.** Today the factory writes the variable that the store's `requestRender` reads (Addendum §2). Passing the write through `receiveRepaint` keeps the exact timing, whether the host calls the factory synchronously or not.
- **`receiveRepaint` is not an injection seam.** It carries a value out of the host's callback to its only consumer. Nothing substitutes it for testing, and the existing tests run the real function. The layout spec's "Separation uses plain imports" refuses a parameter "only so that a dependency can be substituted". This one is not that. The PL4 gate closed the question and asked only that the name say what the parameter does.

**Alternative rejected.** `installFooter` returns the repaint function after `setFooter` returns. That is equivalent only if the host calls the factory synchronously inside `setFooter`. The entry's own comment and the test's fake assert this (Addendum §2), but pi's documentation does not (`research-chidi.md` §3). The callback holds either way.

### D5. Config-path resolution moves into `configuration.ts`

**Decision.** `configuration.ts` exports `configurationPaths(cwd)`, which returns `{ agentPath, projectPath }`, built with `join(getAgentDir(), "pi-jefferson.json")` and `join(cwd, CONFIG_DIR_NAME, "pi-jefferson.json")`. `startUp` calls `readConfiguration({ ...configurationPaths(ctx.cwd), projectTrusted, theme })`.

**Reasoning.** Where the document is and what it contains change together, for example if the file is renamed. That makes this one answer to "what would change this?". `readConfiguration`'s signature stays, because `tests/configuration.test.ts` calls it with explicit paths and its bodies must not change. The entry-driven tests exercise the real resolution through `PI_CODING_AGENT_DIR` and the project directory (Addendum §4: "a trusted project's document wins end to end", "an untrusted project's document is ignored end to end").

**Alternative rejected.** Folding the paths into `readConfiguration` by passing it `ctx`. That changes the signature the 889-line test file calls.

### D6. Instrument binding leaves `configuration.ts` for `visuals/instrument-binding.ts`; the align set and row types go to `visuals/row.ts`

**Binder.** `BindInstrument`, `ConfiguredInstrument` and `instrumentBindings` move whole. Addendum §3 shows they use only `./instrument.ts` and `./format.ts`, so the new file imports those two and nothing in `configuration.ts`. `readInstruments` stays in `configuration.ts` and keeps producing the `ConfiguredInstrument` map; `normalizeDocument` keeps the call `instrumentBindings(readInstruments(...))`. `RejectedConfiguration`, the unknown-name notices and the whole-document rejection stay with `configuration.ts` (Addendum §3). The binder holds the closure that turns a configured instrument into a rendering instrument. Config loading keeps reading, validating and warning.

**Why a separate file and not `format.ts`.** `council-argon` placed the binder in `format.ts` to avoid `instrument.ts` importing `format.ts` while `format.ts` imports `instrument.ts`. A third file avoids that cycle by itself: the binder imports both, and neither imports it.

**Why not `instrument.ts`.** That is the file that would close the loop.

**The align set and the row types.** `ALIGNMENTS`, `CellAlign`, `Cell` and `Row` move to `visuals/row.ts`, and `ALIGNMENTS` is exported. `CellAlign` is derived from the tuple (`configuration.ts:18-19`: "The type and every message derive from this tuple"), and `configuration.ts` also reads the tuple at run time, in `isAlign`, `blankCells` and the rejection message (`:22-23`, `:148`, `:180`). The two therefore move together. Moving the type alone leaves three choices, each of which contradicts this design:

- (a) export the tuple from `row.ts` for `configuration.ts` to read: this is the choice taken, and it makes `configuration.ts -> visuals/row.ts` a run-time edge (D8);
- (b) redeclare the union in `row.ts`: the align set would then have two homes;
- (c) leave the tuple in `configuration.ts` and type-import it from `row.ts`: `row.ts` would import `configuration.ts` and close the cycle that D10.3 plants as its own mistake.

`row.ts` imports `Instrument` from `instrument.ts` as a type. `configuration.ts` imports `ALIGNMENTS` as a value and the types as types, because it builds rows; `row-renderer.ts` and `footer-setup.ts` import the types, because they draw and hand them off. A row holds cells and a cell holds an instrument (`owner-rulings.md`, vocabulary), so these nouns sit beside the instrument they hold.

**Alternatives rejected.**

- Leaving them in `configuration.ts` (`council-kimi`'s default). `row-renderer.ts` would keep importing the configuration home, and `visuals/` could not state the rule "does not import `configuration.ts`".
- Putting them in `row-renderer.ts` (`council-argon`). `configuration.ts` would then import the file that imports pi-tui only to take the row's shape and the align tuple, and the renderer's reason to change (drawing) would also own the row's shape.

**No re-export.** `configuration.ts` does not re-export the moved types for old callers. Two tests import them (`tests/configuration.test.ts:11` for `Cell`; `tests/row-renderer.test.ts:6` for `Row`), and their specifiers change. `CellAlign` has no importer outside `configuration.ts`, and `ALIGNMENTS` is private to it today (Addendum §4).

### D7. The store's content stays untouched; it moves beside the feed

`session-data-store.ts` moves to `data/session-data-store.ts` with `git mv` and its content does not change. Its test body does not change either, only its two import specifiers. The store imports no local file, and `Readings` reaches the visuals as a type only (Eleanor §2, §3). The council recommends leaving its content alone (`council.md`). The ruling's concern, data and updates kept apart from visuals, is already true there. The restructure keeps it true by rule: the data home imports no file outside it, and the store imports no local file. The move is the cost of D2's rule that a responsibility owning two files gets a directory.

### D8. The import graph

All edges are local imports. A "type" edge is `import type`, erased at run time; an edge without the mark carries a run-time import. The check in D10.3 counts type edges too, which is stricter than the runtime graph.

```
extensions/jefferson.ts                     -> jefferson/startup.ts
jefferson/startup.ts                        -> jefferson/configuration.ts
jefferson/startup.ts                        -> jefferson/footer-setup.ts
jefferson/startup.ts                        -> jefferson/data/session-data-feed.ts
jefferson/footer-setup.ts                   -> jefferson/visuals/row-renderer.ts
jefferson/footer-setup.ts                   -> jefferson/visuals/row.ts                (type)
jefferson/footer-setup.ts                   -> jefferson/data/session-data-store.ts    (type)
jefferson/configuration.ts                  -> jefferson/visuals/instrument.ts
jefferson/configuration.ts                  -> jefferson/visuals/format.ts
jefferson/configuration.ts                  -> jefferson/visuals/instrument-binding.ts
jefferson/configuration.ts                  -> jefferson/visuals/row.ts                (run time: ALIGNMENTS; types)
jefferson/visuals/instrument-binding.ts     -> jefferson/visuals/instrument.ts         (type)
jefferson/visuals/instrument-binding.ts     -> jefferson/visuals/format.ts
jefferson/visuals/format.ts                 -> jefferson/visuals/instrument.ts         (type)
jefferson/visuals/row.ts                    -> jefferson/visuals/instrument.ts         (type)
jefferson/visuals/row-renderer.ts           -> jefferson/visuals/row.ts                (type)
jefferson/visuals/row-renderer.ts           -> jefferson/data/session-data-store.ts    (type)
jefferson/visuals/instrument.ts             -> jefferson/data/session-data-store.ts    (type)
jefferson/data/session-data-feed.ts         -> jefferson/data/session-data-store.ts
jefferson/data/session-data-store.ts        -> (no local file)
```

- **The edges are acyclic.** No file in `visuals/` or `data/` points at `startup.ts`, `footer-setup.ts` or `configuration.ts`, no file in `data/` points into `visuals/`, and nothing points at the entry. The longest chain is entry, `startup.ts`, `configuration.ts`, `instrument-binding.ts`, `format.ts`, `instrument.ts`, `data/session-data-store.ts`. The preserved edges (`format.ts` to `instrument.ts`, `instrument.ts` to the store) are the ones Eleanor §3 records.
- **The data home** has one internal edge, the feed to the store, and no edge out of `data/`. Visual files import its types only.
- **No new seam.** Every edge is an import of the file that holds what the importer needs. Two parameters carry a function across a boundary: `receiveRepaint` (D4), and the feed's `requestRender`, which forwards the store's existing option of that name. Neither exists so that a dependency can be substituted.
- **Host packages** are imported as today (ADR 0001). The vendor's name sits in `startup.ts`, `data/session-data-feed.ts`, `configuration.ts`, `footer-setup.ts` and the visuals, and not only in an adapter. This follows Joel's 2026-11-03 rulings ("import the files you need where you need them"), which bind and which the gate's generic layering rules do not override. This design adds no layer to hide it.

### D9. The export surface and the pin

**Exports of each shipped source file after the change:**

| File | Exports |
|---|---|
| `extensions/jefferson.ts` | `VERSION`, `default` (unchanged) |
| `startup.ts` | `startUp` |
| `footer-setup.ts` | `installFooter` |
| `configuration.ts` | `DEFAULT_CELLS`, `MAX_CELLS`, `configurationPaths`, `readConfiguration`, and the types `Configuration` and `ConfigurationSource` |
| `data/session-data-feed.ts` | `feedSessionData` |
| `data/session-data-store.ts` | unchanged (moved) |
| `visuals/instrument.ts` | unchanged |
| `visuals/format.ts` | unchanged |
| `visuals/instrument-binding.ts` | `instrumentBindings`, and the types `BindInstrument` and `ConfiguredInstrument` |
| `visuals/row.ts` | `ALIGNMENTS`, and the types `CellAlign`, `Cell` and `Row`; the runtime key list is `["ALIGNMENTS"]` |
| `visuals/row-renderer.ts` | `createFooter`, and the type `Footer` (unchanged) |

**Why none supplies cell content to third-party code.**

- A third party reaches the extension through the host, and the host loads only the manifest's entry. That entry exports `VERSION` and a factory that takes the host's `pi` and registers no hook for content (`michael-orientation.md` D-e; `research-chidi.md` §1).
- The new exports take values the extension itself builds. `startUp` takes `pi`, `feedSessionData` takes the host's `pi` and `ctx` and a repaint function, `installFooter` takes rows already read from the document, `configurationPaths` returns two strings, and `instrumentBindings` takes the map `readInstruments` made.
- None is named register, supply or contribute, and none stores a caller's declaration.
- `feedSessionData` subscribes to host events and pushes the host's readings into a store the extension creates. It accepts no caller's declaration and returns the store and a release, neither of which holds cell content.
- `visuals/row.ts` is pinned as `["ALIGNMENTS"]` and supplies no cell content. `ALIGNMENTS` is a tuple of the three names an `align` may take, and `align` chooses on which side a cell's padding falls (`configuration.ts`: a cell is "padded against its align"). The cell's text still comes from its instrument (`statusline`: "Cell content comes from an instrument"). The file holds no instrument, format or text, takes no argument and names no hook, and its other exports are types, erased at run time. Anything else added to it fails the exact-key assertion.
- `instrumentBindings` is the one new export that returns something which renders. Before the change the function was private to `configuration.ts` (Eleanor §2 lists no such export). It now has an export because the new file must be importable by `configuration.ts`. A third party would need to import that file from inside the package, which no host mechanism does. `instrumentNamed` has been exported from `instrument.ts` on the same terms.

**The pin, rewritten for the new files.** The test is "the exported surface offers no way to supply or replace cell content" (`tests/jefferson.test.ts`, lines 297–312). These are the only assertion changes; every other change in `tests/` is an import specifier:

- the expected key list for `configuration.ts` (line 307) gains `configurationPaths`;
- an exact-key assertion is added for each new file: `["startUp"]`, `["installFooter"]`, `["feedSessionData"]`, `["instrumentBindings"]` and `["ALIGNMENTS"]` for `visuals/row.ts`;
- the name scan for register, supply and contribute over instrument, store and format covers the five new files as well;
- the dynamic-import specifiers at lines 298–312 for the four moved files change (the three visual files and the store at line 311). They are specifier changes, not assertion changes.

The entry's assertion at line 299 (`["VERSION","default"]`) and `row-renderer`'s `["createFooter"]` do not change.

**Why the pin does not weaken the requirement.** It states more than before: five more files pinned exactly, and no assertion removed. A new export that offers a way to contribute content fails its file's exact-key assertion, or the name scan.

**Unpinned file.** A file added later without a pin line is not caught by a mechanism. The PL4 gate decided none is needed that enumerates `extensions/**`: each later change owes the pin by the spec's "A new file joins the pin" scenario, which requires the pin to cover the file or the design to state why it exports nothing a caller could use to supply content.

### D10. How the proof works

**1. The existing tests are the behavior proof.**

- Test bodies do not change. The edits are: import specifiers for `instrument.ts`, `format.ts`, `row-renderer.ts` and `session-data-store.ts` in `tests/configuration.test.ts:10-11,16-18`, `tests/format.test.ts:7-10`, `tests/instrument.test.ts:4-5,49,188-190`, `tests/row-renderer.test.ts:6-9,12-16` and `tests/session-data-store.test.ts:6-7`; the two type imports of `Cell` and `Row` (D6); and the pin above, including its dynamic import of the store at `tests/jefferson.test.ts:311` (Eleanor §5; the store's importers found with `git grep`).
- `tests/jefferson.test.ts:11-12` does not change, because the entry does not move.
- The entry-driven tests in `tests/jefferson.test.ts` cover the pieces this design extracts (Addendum §4): config paths (253–262, 328–337), `notify` warnings (264–279, 533–541), `setFooter` (231–251), the `/jefferson` output (192–229) and release on reload (436–517).
- **How a red step exists for a restructure.** The red state is a test whose specifier or pin line names a file that does not exist yet. The test fails to load, then passes when the file is in place. The step then carries a mutation that shows the entry-driven tests would notice the extracted behavior being wrong. Examples: the project path built without `CONFIG_DIR_NAME`, `releasePrevious` assigned after the configuration read, `receiveRepaint` never called, a push subscription left out of `release`. Each of these must turn at least one existing test red. The tasks name the exact mutation per step.

**2. The test diff check.** Command, runnable by Derek:

`git diff -U0 $(git merge-base HEAD <base>) -- tests/`

Its changed lines must be import lines or lines of the pin (D9). This is how the requirement "every changed line is an import specifier, a rename, or part of the pin" is read. A reviewer who finds an assertion edited outside the pin has found a nonconformity.

**3. The graph check.** No dependency is added and no standing check is built. The evidence is the output of a one-off script that Derek keeps outside the repository (for example `/tmp/import-graph.cjs`) and runs from the repository root with `node /tmp/import-graph.cjs`. Michael ran the script below verbatim in round 1, including the three planted mistakes (run `cbc43141-dbc7-437c-ae04-947b36bdf83f`), and again in round 2 on the current tree (run `367b4db2-39a6-43d1-b4d3-717b1c444ddd`); it worked as specified. Derek re-runs it on the restructured tree.

It must:

1. walk `extensions/` for `.ts` files and read every relative import of each (`from "./…"`, `export … from "./…"` and `import("./…")`);
2. print each edge as `file -> file`;
3. report `BAD SPECIFIER` for any relative import that does not end in `.ts` or does not resolve to a file;
4. report `CYCLE a -> b -> … -> a` when a depth-first walk finds one;
5. report `IMPORTS THE ENTRY` for any file other than the entry that imports `extensions/jefferson.ts`.

```js
const fs = require("node:fs"), path = require("node:path");
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true }))
    e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".ts") && files.push(path.join(d, e.name));
})("extensions");
const edges = new Map(files.map((f) => [f, []]));
for (const f of files)
  for (const m of fs.readFileSync(f, "utf8").matchAll(/\bfrom\s+["'](\.[^"']*)["']|\bimport\(\s*["'](\.[^"']*)["']\s*\)/g)) {
    const spec = m[1] ?? m[2];
    const target = path.join(path.dirname(f), spec);
    if (!spec.endsWith(".ts") || !edges.has(target)) console.log("BAD SPECIFIER", f, spec);
    else edges.get(f).push(target);
  }
for (const [f, ts] of edges) for (const t of ts) console.log(f, "->", t);
const state = new Map();
const visit = (f, trail) => {
  if (state.get(f) === 1) return console.log("CYCLE", [...trail, f].join(" -> "));
  if (state.get(f) === 2) return;
  state.set(f, 1);
  for (const t of edges.get(f)) visit(t, [...trail, f]);
  state.set(f, 2);
};
for (const f of files) visit(f, []);
for (const [f, ts] of edges) if (f !== "extensions/jefferson.ts" && ts.includes("extensions/jefferson.ts")) console.log("IMPORTS THE ENTRY", f);
```

- **What makes it fire.** A cycle, a file importing the entry, or a specifier without `.ts`. It reads the files on disk, not a list kept beside them.
- **How it is shown catching a mistake.** Before the real run, Derek adds three temporary edits and shows the output for each: `visuals/row.ts` importing a type from `configuration.ts` (a cycle through `configuration.ts` to `row.ts` and back), a file importing `../jefferson.ts`, and one specifier with `.ts` removed. All three revert before the real run. The edges printed in the real run must equal the list in D8.
- **Limit.** It matches `from` clauses and `import(...)` calls. A side-effect import (`import "./x.ts"`) would not be seen. Derek notes whether any exists; the evidence says none does today.

**4. The string-mutation spec scenario.** `grep -rn "lodash" extensions/` must show only per-function imports from `lodash-es/<fn>.js` in `visuals/format.ts` (ADR 0004; Eleanor §2). A wrong import passes `tsc` and fails `node --test` (`michael-orientation.md` D-d), so the full suite is the other half of this guard.

**5. The full suite.** `pnpm typecheck` and `pnpm test` pass after every step. At the baseline `pnpm test` reports 243 tests and 243 pass (Eleanor §7). The count is a reference for the reader, not a requirement; the requirement is that every test that passed before passes after.

**6. The runtime claim that no test makes.** The tests run under Node's type stripping. The host loads the entry through jiti (`research-chidi.md` §1, §5). Chidi did not verify jiti's resolution of `.ts` specifiers two directories deep inside an installed package (`research-chidi.md` Unknowns). The relative `.ts` imports already work one level deep today. Michael measured the deeper case in his gate run `cbc43141-dbc7-437c-ae04-947b36bdf83f`: pi's loader (jiti 2.7.0, `moduleCache: false`) loaded a `.ts` import chain two directories deep from an extension entry, on a `/tmp` fixture outside `node_modules`. That fixture was not an installed package, so Joel's check stays as the end-to-end observation: he loads the branch's package in pi, runs `/reload`, and reads `/jefferson` and the footer.

### D11. The install and reload order, carried over

This is the order in `startUp` after the change, taken from Eleanor §3 and Addendum §2. Nothing in it is new.

At factory time:

1. The entry's default factory calls `startUp(pi)`.
2. `startUp` registers the `/jefferson` command. It reports `footerRows`, undefined when no footer is installed.
3. `startUp` registers `pi.on("session_start", …)`.

In the `session_start` handler:

1. Return at once unless `ctx.mode === "tui"`. No footer is installed outside the terminal mode.
2. Call `releasePrevious?.()`. The previous install's subscriptions, store and footer are disposed first.
3. Declare `requestRepaint` (one per install, inside this handler) and call `feedSessionData(pi, ctx, () => requestRepaint?.())` (`data/session-data-feed.ts`, D3). In this order, inside the feed: it creates the store with `createSessionDataStore({ seed, requestRender, readUsage, readEntries })`, subscribes to `model_select`, `thinking_level_select` and `turn_end`, each pushing into the store, and defines `release`, which is idempotent through its `released` flag and calls the three unsubscribes and `store.dispose()`. It returns `{ store, release }`.
4. Assign `releasePrevious = release`, **before** the configuration is read. Addendum §2 puts this at line 109 and the read after it.
5. Call `readConfiguration` with the paths from `configurationPaths(ctx.cwd)`, `ctx.isProjectTrusted()` and `ctx.ui.theme`. If it returns a warning, call `ctx.ui.notify(warning, "warning")`. Set `footerRows = rows.length`.
6. Call `installFooter(ctx.ui, { rows, sample: () => store.sample(), dispose: release, receiveRepaint })`. The host calls the factory, and `receiveRepaint` sets `requestRepaint`. The host disposes a replaced footer, which runs `release` (`research-chidi.md` §3).

The host calls `session_shutdown` and then `session_start` with reason `"reload"` on `/reload`, and the extension re-registers from step 3 of the first list. The extension's side of that guarantee is unchanged. The host's side is the dispose-then-recreate cycle (`research-chidi.md` §3).

### D12. The two boyscout fixes

Both are made inside this change with no workflow of their own (`owner-rulings.md`).

1. **The description.** `package.json` `description` and the GitHub repository description are the same sentence, and both use a word Joel rejected for the statusline concept (Eleanor §6; `michael-orientation.md` §3). Both change to the one new sentence, which `proposal.md` ("Two boyscout fixes") holds and this design does not repeat. `package.json` is edited in the same commit as the restructure's last code step, because it ships to npm. The GitHub setting is not a file. The conductor runs `gh repo edit --description` with that sentence once the code pull request has merged, under Joel's ruling that the fix is boyscouted into this change (`owner-rulings.md`); it is not a Derek task. That command is **untested** here. Verification is `gh repo view --json description`, as Eleanor ran it. Rollback restores the old string, which `research-eleanor.md` §6 records.
2. **The keyword.** `package.json` `keywords` becomes `["pi", "statusline", "prompt", "pi-package"]`. `pi-package` makes the package eligible for the pi.dev gallery (`research-chidi.md` §4). Appending leaves the existing order alone, and nothing in the evidence gives the order meaning. Verification is `node -p "require('./package.json').keywords"`.

## Risks / Trade-offs

- **[A moved file keeps a stale specifier]** → `pnpm typecheck` and `pnpm test` fail on a bad specifier, and the graph check reports it as `BAD SPECIFIER`. Each step lands green.
- **[A cycle appears in an extraction]** → The graph check runs after each extraction and is shown catching one beforehand (D10.3).
- **[The extraction changes behavior without a test noticing]** → The entry-driven tests cover paths, warnings, `setFooter` and release (Addendum §4). Each extraction step carries a named mutation that must turn one of them red (D10.1). If a mutation does not turn one red, that is a gap the writer reports, not one to ignore.
- **[`releasePrevious` ordering shifts]** → D11 step 4 states it. The test "a second session_start releases the first install before installing its own" would notice the first install not being released (Addendum §4).
- **[`receiveRepaint` is read as an injection seam]** → Argued in D4; the PL4 gate closed the question.
- **[`instrumentBindings` becomes an export]** → It is the one new export that renders. D9 argues it and pins its file's exact keys.
- **[The entry's header comment and the moved files' headers go stale or cite archived decision numbers]** → Rewritten with the move, stating the fact each comment makes (`michael-orientation.md` T7). The unchanged `package.json` `pi.extensions` and the CI expectations still match the comment.
- **[Wrong paths ship]** → `files` is `["extensions", …]`, which includes every nested file (`research-chidi.md` §4). The CI pack check asserts the allowed root `extensions/` and the entry unchanged (Eleanor §5). Nothing moves outside `extensions/`.
- **Trade-off: one more path segment for visuals.** A reader opening a visuals file goes one directory deeper. The segment is what shows the data/visuals line, which is what Joel asked for.

### Consequences

What the change takes away or alters:

- `configuration.ts` no longer holds the binder, the align set or the row types. Every caller of `Cell` or `Row` now imports `visuals/row.ts`. Two tests do (D6).
- Four source paths change: `instrument.ts`, `format.ts` and `row-renderer.ts` move under `visuals/`, and `session-data-store.ts` moves under `data/`. The entry's path, the manifest, `files`, `tsconfig.json` `include` and the CI expectations do not change (Eleanor §5).
- The entry no longer contains the install order. A reader looks in `startup.ts`. The seed, the readers and the push subscriptions are in `data/session-data-feed.ts`.
- The entry no longer "owns `pi.on`, the config paths, `setFooter` and the repaint callback", as `ARCHITECTURE.md` says (`michael-orientation.md` D-f).

Documents this makes false, for the docs pass (not edited here):

- `ARCHITECTURE.md`: the parts diagram (including the store's path at line 15), the description of what the entry owns, and "the only file the host loads" if it reads as the entry holding the logic (Eleanor §5).
- `AGENTS.md` line 20, which names `extensions/jefferson/instrument.ts`, and any "adding an instrument" step that names a path under `extensions/jefferson/`.
- `README.md` lines 156–157, which describe where the source lives.
- The entry's header comment and the headers of the moved and extracted files. These are comments in the diff, handled by the implementation.
- ADRs 0001 and 0004, which name `row-renderer.ts` and `extensions/jefferson.ts` by file name. An accepted ADR's body is not edited, so the docs pass decides how the record stays true (Eleanor §5).
- Archived changes name the old paths. They are the historical record and are left as they are (Eleanor §5).

The comment at `ci.yml:34` about ordinary files under `extensions/jefferson/` stays true and stays as it is.

## Migration Plan

Each step lands as its own commit, and `pnpm typecheck` and `pnpm test` pass at each. Any one reverts alone with `git revert`. There is no flag or staged rollout: nothing runs differently, and the evidence shows no logging to add or keep. A step that changes behavior would be a defect, not a feature to switch off.

1. **Move** `instrument.ts`, `format.ts` and `row-renderer.ts` into `visuals/`, and `session-data-store.ts` into `data/`, with `git mv`. Rewrite the relative specifiers in the moved files, in `configuration.ts` and in the entry, and in the tests. Only specifiers change. Update the pin's dynamic-import lines.
2. **Extract `visuals/row.ts`.** Move `ALIGNMENTS` (now exported) and the three types. Update `configuration.ts`, which now reads `ALIGNMENTS` from `visuals/row.ts` at run time, `row-renderer.ts` and the two test type imports. Pin its exports as `["ALIGNMENTS"]`.
3. **Extract `visuals/instrument-binding.ts`.** Move the three binder items. Pin its exports.
4. **Add `configurationPaths`** to `configuration.ts`. Pin its export.
5. **Extract `data/session-data-feed.ts`** with `feedSessionData`: the seed, the readers, the store's creation, the three push subscriptions and `release`. The entry still calls it directly. Pin its export.
6. **Extract `footer-setup.ts`** with `installFooter`. The entry still calls it directly. Pin its export.
7. **Extract `startup.ts`.** Reduce the entry to `VERSION` and the hand-off. Pin its export. Rewrite the entry's header comment.
8. **Run the proof.** The graph check with its three planted mistakes, the test diff check, and the `lodash` grep. Attach the output. Rewrite the headers that cited archived decision numbers, if any remain.
9. **Make the two boyscout edits** to `package.json`. The conductor runs `gh repo edit --description` once the code pull request has merged (D12.1).
10. **Joel's check** in pi, as in D10.6.

**Rollback.** Revert the commits. The only effect outside the repository is the GitHub description, restored by `gh repo edit --description` with the old sentence (Eleanor §6).
