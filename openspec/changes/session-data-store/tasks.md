# Tasks

Implementation checklist for `session-data-store`. It executes the approved `design.md` (D1–D14) and
the requirement text in `specs/session-data-store/spec.md` and `specs/statusline/spec.md`.

Every task that changes behavior is red first: it names the test, the file that test lives in, and
the reason that test fails before the change. A green run that was never red is not evidence. Tasks
that only edit a test say what they prove. Tasks that only settle a declaration say so and state
their non-test assertion.

Vocabulary is the owner's (`owner-rulings.md`): a row holds cells, a cell holds an instrument, an
instrument is a label over a data field, `blank` is the placeholder instrument. Where the
`extension-source-layout` spec's term of art is meant, this plan says "source file".

## Sequencing

The group order is the dependency chain design D1 states, which is also `design.md`'s Migration Plan
order: the store declares `Reading`/`Readings`, the instruments import that type and own the three
instruments, configuration resolves instrument names, the renderer hands a `Readings` sample to each
cell, and the entry wires all four. A group cannot be verified before the group it imports exists,
so the brief's six areas land in this order and this table is how each one stays auditable:

| Brief's area | Group | What it lands |
| --- | --- | --- |
| 1. Configuration | 3 | `cells` is the count and the placement; `containers` not read; absent → eight `blank`; longer than 8 → first 8; an unknown name warns and renders `blank`; D11's non-string and empty-array policy |
| 2. Instruments | 2 | the label-over-data shape, `blank`, `model`, `thinking`, and `instrumentNamed` |
| 3. The store | 1 | three datums, unknown, the per-render sample, the selection updates, idempotent disposal, the released flag gating reads and repaints |
| 4. The entry | 5 | factory-scope release retention, `session_start` seeding for all five reasons, the two `pi.on` subscriptions, `tui.requestRender` injection, footer installation through the existing TUI guard |
| 5. Renderer | 4 | text per cell, unchanged geometry, unchanged one-line truncation |
| 6. Verification | 6 | `pnpm typecheck`, `pnpm test`, `openspec validate session-data-store --strict`, and the terminal demonstration |

One interval is knowingly not green, and the task texts say so where it starts: 3.1 changes `Cell`
to hold an instrument, which the renderer cannot resolve until 4.1 and the entry cannot sample until
5.1, so `tests/jefferson.test.ts` and `pnpm typecheck` are red from 3.1 until 5.1. That red is 5.1's
to close, and nothing else follows from it: `tests/configuration.test.ts` is green at 3.1 (its own
assertion), `tests/row-renderer.test.ts` at 4.1, and the only compile error left at 5.1 is the
entry's call site. 3.1 still migrates `tests/jefferson.test.ts:150` in its own task, so that file
has one reason to be red rather than two.

## Requirement → task map

`specs/session-data-store/spec.md`:

| Requirement | Tasks |
| --- | --- |
| The store holds the data its instruments display | 1.1, 1.2 (exactly three datums, no fourth), 5.2 (no subscription for a datum no instrument displays) |
| A read is synchronous and total | 1.2 (before any value), 1.5 (after a teardown, after disposal) |
| Unknown is a distinguished value | 1.2 |
| Freshness never exceeds the host's delivery | 1.3, 1.5, 5.1 (a restored session renders the seeded values with no push) |
| Expensive derivations are bounded and invalidated by name | **vacuous**: D3 derives nothing, so none of the requirement's three scenarios has a subject. No task is claimed. The mechanism that would carry a future derived value is pinned by 4.2 (one `sample()` per `render`) |
| Every read in one render observes one state | 4.2 |
| Store data does not survive a session replacement | 5.1, 5.3 |
| A pushed change that alters displayed data results in a repaint | 1.4, 5.2 |
| Every subscription is released when the footer is disposed | 1.5, 5.4 (plus 5.3 for the replacement path) |

`specs/statusline/spec.md`:

| Requirement | Tasks |
| --- | --- |
| Cell content comes from an instrument | 3.1, 5.5 |
| A row is one line tall | 4.1 |
| A row's cells are its count and its placement | 3.1 |
| Configuration designates each cell's instrument | 3.1, 3.4 |
| An instrument resolves a cell's text by reading the store | 2.1, 2.2, 2.3 |
| The model instrument | 2.2, 5.1 |
| The thinking instrument | 2.2, 5.1 |
| Instrument text is bound by the row's geometry | 4.1 |
| A row's containers count (REMOVED) | 3.3 |
| Configuration's `cells` error policy (D11): an entry that is not a string is rejected (3.1, whose narrowing implements it) and an empty array is rejected (3.2) | 3.1, 3.2 |

## Scope out

- No host pin bump. `devDependencies` stays `^1.4.0`; D14's claim is that the parameters used here
  exist in 1.4.0, so `pnpm typecheck` is the check and the bump is a separate change per the council.
- No datum beyond `provider`, `model`, `thinkingLevel`; `onBranchChange` is not subscribed.
- No API by which third-party code supplies or replaces cell content; 5.5 keeps that checkable.
- No manifest, `tsconfig`, or CI edit; 6.5 confirms it.
- `package.json`, `README.md`, and the archive/validation bookkeeping are untouched by these tasks.

## 1. The store (`extensions/jefferson/session-data-store.ts`)

The file owns the three datums, `undefined` as unknown, the frame sample, the selection updates, the
repaint request, and the disposed flag (D1, D2, D7, D8). It holds no host handle but the injected
`requestRender` callback, so it has no import at all. Its tests live in
`tests/session-data-store.test.ts`. Subscription ownership is the entry's (D5) and is group 5's.

- [ ] 1.1 Declare the store's data types, with no behavior: `export type Reading = string | undefined`
  (`undefined` is unknown — never `""`, never `0`, never a stale value) and
  `export interface Readings` with `readonly provider`, `readonly model`, `readonly thinkingLevel`,
  each a `Reading`. The file has no imports: instruments take these names through `import type`,
  which is what the layout spec permits a helper source file and nothing more, so this declaration
  must land before group 2 can import it. This task has no red run of its own — it settles a
  declaration — so its assertion is non-test: `rg -n "^import" extensions/jefferson/session-data-store.ts`
  prints nothing, and `pnpm typecheck` exits 0 with `tests/session-data-store.test.ts` carrying
  `import type { Readings }` and a `const seed: Readings` literal that the tasks below use.

- [ ] 1.2 Seed, sample, and unknown. **Test first** in `tests/session-data-store.test.ts`:
  `createSessionDataStore({ seed, requestRender })` returns a store whose `sample()` is exactly
  `{ provider, model, thinkingLevel }` — `Object.keys(sample)` in that order and no fourth datum —
  carrying the seed; a datum seeded `undefined` reads `undefined`, not `""` and not `0`; a datum
  seeded `""` reads `""`, distinguishable from `undefined`. **Red:** the file exports no
  `createSessionDataStore`, so the test fails at the import naming
  `extensions/jefferson/session-data-store.ts`. **Then implement** the factory and `sample()` as one
  flat three-field object allocated per call — a value, not a live view of the store. **Green:**
  `node --test tests/session-data-store.test.ts`.

- [ ] 1.3 The two selection updates, and freshness. **Test first:** `modelSelected(provider, model)`
  replaces the held `provider` and `model`; `thinkingLevelSelected(level)` replaces the held
  `thinkingLevel`; a restore-style push carrying exactly the seeded values leaves every reading as it
  was; a `Readings` object an earlier `sample()` returned keeps the values it returned after a later
  push. **Red:** neither selection method exists, so each fails with `TypeError: … is not a function`.
  **Then implement** both as plain string assignments into the held datums — the entry unwraps the
  host event, so the store never names a host type. **Green:**
  `node --test tests/session-data-store.test.ts`.

- [ ] 1.4 A displayed change repaints, an unchanged one does not. **Test first**, counting
  `requestRender` calls against a seeded store: `modelSelected` with a different provider or model
  requests exactly one repaint — one, though two datums changed; `thinkingLevelSelected` with a
  different level requests exactly one; a push carrying the values the store already holds requests
  none, which is the identical selection a restore can re-report. **Red:** 1.3's assignments never
  call `requestRender`, so the two changed-value tests count 0. **Then implement** D7: compare each
  incoming value with the held one, assign every value, call `requestRender()` once if any held value
  changed and nothing if none did. **Green:** `node --test tests/session-data-store.test.ts`.

- [ ] 1.5 Disposal, and total reads. **Test first:** `dispose()` is idempotent — a second call does
  not throw; after it `sample()` returns all three datums `undefined`, synchronously and without
  throwing; a push after disposal requests no repaint; two stores in sequence — the first disposed,
  the second seeded all-unknown, which is the state between a teardown and the replacement's first
  delivery — both read synchronously without throwing. **Red:** no `dispose` exists, so the test
  fails at `store.dispose is not a function`. **Then implement** the disposed flag gating `sample()`
  and the push methods, and `dispose()` clearing the repaint callback rather than merely flagging it,
  so the closure over the host handle is dropped (D8). **Green:** `node --test
  tests/session-data-store.test.ts`.

## 2. The instruments (`extensions/jefferson/instrument.ts`)

The file owns the label-over-data shape, the three shipped instruments, `instrumentNamed`, and
`DEFAULT_CELL_TEXT`, which moves here because it is `blank`'s text (D9). Its only import is
`import type { Readings }` from `./session-data-store.ts`; it imports no host package, starts no
timer, and sees no context. Its tests live in `tests/instrument.test.ts`.

- [ ] 2.1 The instrument shape, `blank`, and the placeholder's new home. **Test first** in
  `tests/instrument.test.ts`: `blank.resolve(readings)` returns `DEFAULT_CELL_TEXT` for any
  `Readings`, including all-unknown, and reads no datum — proven with a `Readings` whose three
  properties are throwing getters, so a datum read fails the test. **Red:** the file does not exist,
  so the test fails at the import naming `extensions/jefferson/instrument.ts`. **Then implement**
  `export interface Instrument { resolve(readings: Readings): string }`, `export const blank`, and
  `DEFAULT_CELL_TEXT` moved here from `configuration.ts`; update the constant's importers in the same
  task — `configuration.ts`'s cell construction, `tests/configuration.test.ts`, and
  `tests/jefferson.test.ts` — so no task leaves the tree red. **Green:**
  `node --test tests/instrument.test.ts`, and `rg -n "^import" extensions/jefferson/instrument.ts`
  prints exactly one line, the type-only import.

- [ ] 2.2 `model` and `thinking`. **Test first:** `model.resolve` yields `provider: model`;
  `thinking.resolve` yields `thinking: level`, its label literal even when the level is data; each
  yields `""` when either half is unknown, because there is no text it can honestly resolve (D10);
  neither reads a datum its text does not use. **Red:** neither instrument is exported. **Then
  implement** the `labelled(label, data)` constructor — either half `undefined` yields `""` — and
  apply it twice: `model` over `r.provider` as label and `r.model` as data, `thinking` over the
  literal `"thinking"` and `r.thinkingLevel` (D9). **Green:** `node --test tests/instrument.test.ts`, and
  `rg -n 'setTimeout|setInterval|pi\.on|ctx\.' extensions/jefferson/instrument.ts` prints nothing —
  no host event, timer, or context appears in the file that resolves a cell's text.

- [ ] 2.3 Name resolution. **Test first:** `instrumentNamed("blank")`, `("model")`, and `("thinking")`
  return the three instruments; a name the extension does not implement returns `undefined`, and
  asking twice for that name still returns `undefined` — the lookup gained nothing. **Red:**
  `instrumentNamed` is not exported. **Then implement** it as a lookup over the three shipped names,
  with no registration path and no mutable table. **Green:** `node --test tests/instrument.test.ts`.

## 3. Configuration (`extensions/jefferson/configuration.ts`)

`Cell` becomes `{ instrument: Instrument }`; `cells` replaces `containers`; instrument names resolve
once at parse through the existing warning channel (D10, D11). The file keeps its `node:`-only
imports and adds `./instrument.ts`. Its tests live in `tests/configuration.test.ts`.

- [ ] 3.1 `cells` is the count and the placement. **Test first** in `tests/configuration.test.ts`:
  a row with no `cells` yields 8 cells whose instrument is `blank` (identity, not just equal text);
  `cells: ["model", "thinking", "blank"]` yields 3 cells in that order, each holding the instrument
  named at its position; `cells` naming 12 instruments yields the first 8 and **no warning** (the
  clamp stays accepted behavior under its truthful name); `DEFAULT_CELLS`/`MAX_CELLS` replace
  `DEFAULT_CONTAINERS`/`MAX_CONTAINERS`. **Red:** `cells` is not read — every declared row still
  counts `containers` and defaults to 8, so the 3-name test sees 8 cells of placeholder text.
  **Then implement** the `cells` parse, the `Cell { instrument }` model, the constant rename, and
  the both-shapes guard testing `"cells" in doc || "id" in doc`; **narrow each entry before resolving
  it** — a `cells` entry arrives as `unknown`, and `instrumentNamed(name: string)` cannot take it
  under `strict`, so reject a non-string with `RejectedConfiguration` first. Leave the shipped
  `containers` parse and its reject path in place for now — when both keys appear, `cells` decides —
  because 3.2 re-points that path and 3.3 is the task that removes the key; removing it here would
  turn 3.2's and 3.3's tests red for a reason that is not theirs. **Migrate the shipped
  tests this change breaks, in this same task**, so its stated green is reachable without inventing
  policy: `:26` seeds `{cells: ["blank", "blank", "blank", "blank"]}` for its 4 cells; `:39`
  becomes `{cells: ["blank"], rows: [{}]}`, so it still tests the both-shapes guard and **`containers`
  never returns to that guard**; `:71` keeps its body and is renamed "a row omitting cells renders 8
  cells"; `:77` becomes `{rows: [{cells: ["blank", "blank", "blank"]}]}`; `:83` is rewritten as
  `cells` naming 12 instruments, expecting 8 cells and no warning, rather than left as a `containers`
  test that passes for the wrong reason; `:149`, `:162`, and `:174` seed
  `{rows: [{cells: ["blank", "blank", "blank"]}]}`, their asserted lengths unchanged; `:188` is
  rewritten into this task's `Cell { instrument }` shape assertion — `Object.keys(cell)` is exactly
  `["instrument"]`, and every default cell's instrument is `blank`; and `tests/jefferson.test.ts:150`
  seeds `{cells: ["blank"], rows: [{}]}`, so that document is still rejected and its
  `notified.length === 1` still holds. **Green:** `node --test tests/configuration.test.ts`.
  `tests/jefferson.test.ts` and `pnpm typecheck` are red from here until 5.1 — the renderer still
  reads `cell.text` and the entry still passes the width helpers where a sampler belongs — and that
  is the Sequencing interval, not a second task: this task closes its own green, and the entry
  test's red is 5.1's to close.

- [ ] 3.2 The document's error policy (D11). **Test first:** an empty `cells` array is rejected — the
  default row plus a warning naming the reason — because a row of no cells has no `floor(W / 0)`
  geometry, which is the shipped policy for `containers: 0`; a `cells` value that is not a list is
  rejected under the reader's existing "not a list" treatment, which `rows` already gets, so no new
  policy is invented. Re-point the shipped reject path onto the key that now exists: the loop at
  `tests/configuration.test.ts:89-97` is re-pointed to non-string *entries* (`[0]`, `[-1]`, `[2.5]`,
  `[null]`, `[[{text: "x"}]]`) — the rejection itself lives in 3.1's narrowing, so those cases are
  green on arrival, and no Red here depends on a mechanism `strict` forbids; `:104` becomes a
  non-list `cells` value (`4`, and `"4"` as a string that must be rejected rather than iterated),
  which is this task's non-list rejection. **Red:** after 3.1 an empty array yields a zero-cell row,
  so the default-row assertion fails; a non-list `cells` is not handled as a rejection — `4` makes
  the parse throw outside the `RejectedConfiguration` channel, and `"4"` is iterated as one entry —
  so no default row with a warning comes back either way. **Then implement** both rejections inside
  the existing `RejectedConfiguration` flow. D11's empty-array policy is flagged in `design.md`'s
  Open Questions for the owner to confirm or reverse; this task executes it as approved. **Green:**
  `node --test tests/configuration.test.ts`.

- [ ] 3.3 `containers` is no longer read. **Test first:** a document carrying `containers: 3` is
  accepted, renders 8 `blank` cells and produces one warning naming the key and the migration
  (`declare cells instead`); two rows both carrying `containers` still produce exactly one such
  warning — once per document, not once per row; a document with `cells` and no `containers` warns
  nothing extra. **Red:** after 3.1 `containers: 3` still yields 3 cells and no warning, so the
  eight-cell assertion fails and the warning is `undefined`. **Then implement** the key's removal
  from the parse and the once-per-document warning through `Configuration.warning`. **Green:**
  `node --test tests/configuration.test.ts`.

- [ ] 3.4 An instrument the extension does not implement. **Test first:** `cells: ["model", "nope",
  "thinking"]` yields 3 cells whose instruments are `model`, `blank`, `thinking` in order, and a
  warning naming `nope`; a document naming two unimplemented instruments in different rows names both
  once each in a single warning. **Red:** with 3.1's resolution the unknown name yields `undefined`
  as the cell's instrument, so rendering that row throws and the warning is `undefined`.
  **Then implement** `instrumentNamed(name) ?? blank` at parse, collecting the unknown names so one
  warning reports them all (D10). Accept knowingly that `Configuration.warning` is now non-`undefined`
  for an accepted document; its doc comment says so. **Green:** `node --test
  tests/configuration.test.ts`.

## 4. The renderer (`extensions/jefferson/row-renderer.ts`)

Only where each cell's string comes from changes: `cell.instrument.resolve(readings)` replaces
`cell.text` (D12). The arithmetic, the per-cell truncate-and-pad, and the row-level remainder are the
code that ships today. Its tests live in `tests/row-renderer.test.ts`.

- [ ] 4.1 Text per cell, geometry untouched. **Test first** in `tests/row-renderer.test.ts`: the
  fixture builder produces `{ instrument: { resolve: () => text } }` cells resolving to the same
  strings the fixtures use today; every existing geometry test keeps its exact width, remainder, and
  one-line assertions; add one test where an instrument resolves to text wider than its cell (clipped
  to the cell width, one line). **The wide-glyph/ANSI test's expected string is not to be adjusted** —
  `"\x1b[31mab\x1b[0m" + "  " + "😀" + "   "` at width 9, with the ANSI cell first, is the assertion
  that discriminates `visibleWidth` from `String.length`, and it must survive the fixture change
  byte for byte. **Red:** `renderRow` still reads `cell.text`, which the new fixture does not carry,
  so the geometry tests fail on content — the width helpers receive `undefined` for every cell.
  **Then implement** `renderRow(row, width, helpers, readings)`
  resolving each cell's instrument, and `createFooter(rows, sampleReadings, helpers)` sampling once
  per row body for now — 4.2's test is what moves that call to the top of `render(width)`.
  **Green:** `node --test tests/row-renderer.test.ts`.

- [ ] 4.2 One sample per render, and one state per render. **Test first:** a footer over three rows
  of eight cells, with a `sampleReadings` that counts calls, requests exactly one sample per
  `render(width)`, whatever the row and cell count; both cells of a two-cell `model` row are handed
  the same `Readings` object (identity) and resolve identical text; a push between two renders
  changes both cells in the second render, and the object the first render used keeps its values —
  an update becomes visible no earlier than the next render. **Red:** 4.1 samples once per row, so
  the call count is 3 and the rows see different objects. **Then implement** the single sample at the
  top of `render(width)`, passed to every row and every cell (D4); `invalidate()` stays a no-op.
  **Green:** `node --test tests/row-renderer.test.ts`.

## 5. The entry (`extensions/jefferson.ts`)

The entry stays the only file with a runtime import of `@earendil-works/*`. It seeds the store for
all five `session_start` reasons, takes the two subscriptions, injects `tui.requestRender`, and
disposes through the footer's component (D5, D6). Its tests live in `tests/jefferson.test.ts`.

Two constraints on every task in this group: the release is **retained at factory scope** and called
before the next store exists — no task may reintroduce a per-install-only teardown; and `theme` and
`footerData` stay unused, because no datum here needs them (D5).

- [ ] 5.1 The fake host, seeding at `session_start`, and the install. **Test first:** extend
  `tests/jefferson.test.ts`'s fake with `ctx.model = { provider, id }` (absent for a session with no
  model), `ctx.thinkingLevel` (optional), a `ui.setFooter(factory)` that invokes the factory with a
  fake `tui` whose `requestRender` counts calls and keeps the returned component so `render` and
  `dispose` are reachable, a `pi.on(event, handler)` that records handlers per event and returns an
  unsubscribe recording its own call, and helpers that dispatch an event and read a footer line;
  then assert that with a document `{ "cells": ["model", "thinking"] }`, a `ctx` carrying
  `model: { provider: "anthropic", id: "claude-opus-4" }` and `thinkingLevel: "high"`, the installed
  footer renders `anthropic: claude-opus-4` and `thinking: high` — for each of `startup`, `new`,
  `resume`, `fork`, and `reload`, and for `resume`/`reload` with no `model_select` and no
  `thinking_level_select` dispatched, because the host reports no selection when it restores. **Red:**
  4.1 changed `createFooter` to take a sampler, so the shipped entry test fails at render — the entry
  still passes the width helpers where a `() => Readings` belongs — and the seeding assertions have
  no seed to find. **Then implement** the entry's rewiring: create the store beside `createFooter`
  with `seed: { provider: ctx.model?.provider, model: ctx.model?.id, thinkingLevel:
  ctx.thinkingLevel }`, pass `() => store.sample()` as the renderer's sampler, and install through
  the existing `ctx.mode !== "tui"` guard with `ctx.ui.setFooter((tui) => { requestRepaint = () =>
  tui.requestRender(); … })` forwarding `render`, `invalidate`, and `dispose`. **Green:**
  `node --test tests/jefferson.test.ts` and `pnpm typecheck`.

- [ ] 5.2 The two subscriptions and the repaint path. **Test first:** in TUI mode `session_start`
  registers exactly two event subscriptions — `model_select` and `thinking_level_select`, nothing
  else, and no branch subscription for the deferred datum; outside TUI mode it registers neither;
  dispatching `model_select` changes the rendered line and requests exactly one repaint; dispatching
  a selection carrying the values the store already holds requests none. **Red:** no selection
  subscription is registered, so a dispatch reaches nothing and the repaint count is 0. **Then
  implement** both `pi.on` calls inside `session_start`, unwrapping `event.model.provider`,
  `event.model.id`, and `event.level` into `store.modelSelected` / `store.thinkingLevelSelected` so
  the store never names a host type (D5). **Green:** `node --test tests/jefferson.test.ts`.

- [ ] 5.3 Retained release across two `session_start` calls. This is the retained-release behavior
  with its own test, not a sentence inside 5.2. **Test first:** one fake `pi` shared across two
  `session_start` calls, each with its own `ctx` (different `model`/`thinkingLevel`) and its own
  counting `tui`. Assert the first install's two unsubscribes each fire exactly once, and before the
  second install's `setFooter` factory is invoked — the previous release runs before the new store is
  created and its footer installed, so the recorded order is `unsubscribe:model_select`,
  `unsubscribe:thinking_level_select`, `setFooter#2`; assert the second footer renders the second
  context's `provider: model` and `thinking: level`, never the first's; and assert a selection
  dispatched after the second start requests exactly one repaint, on the second `tui` only. **Red:**
  the entry retains no release across `session_start` calls, so the first install's unsubscribes
  never fire and both installs stay subscribed. **Then implement** the factory-closure
  `releasePrevious`: assigned inside `session_start`, called before the new store is created (D5,
  D6). **Green:** `node --test tests/jefferson.test.ts`.

- [ ] 5.4 The two callers of `release` do not double-release. **Test first:** both callers reach the
  same release — the host calling the footer component's `dispose()`, and a later `session_start`'s
  `releasePrevious()`. Dispose the first footer, then start a second session: each of the first
  install's unsubscribes fired exactly once in total; a selection pushed after the first footer's
  disposal requests no repaint from the first `tui`, before or after the second start; and rendering
  the disposed footer resolves empty cells rather than the old values. **Red:** without the released
  flag the dispose-then-replace path runs both unsubscribes twice and the first store still holds a
  live repaint callback. **Then implement** the `released` flag in `release`, with `releaseModel()`,
  `releaseThinking()`, and `store.dispose()` inside it, so whichever caller arrives second does
  nothing (D5, D8). **Green:** `node --test tests/jefferson.test.ts`.

- [ ] 5.5 The exported surface offers no way to supply or replace cell content. **Test only**,
  phrased as an assertion over the entry's exported surface: the entry's keys stay exactly
  `["VERSION", "default"]`; `row-renderer.ts`'s and `configuration.ts`'s exported names keep their
  kinds; no exported name of `session-data-store.ts` or `instrument.ts` matches
  `/register|supply|contribute/i`; and `instrumentNamed` is a lookup, not a registration path —
  calling it with a name the extension does not implement returns `undefined`, and the same name
  still returns `undefined` afterwards, with both files' exported key sets unchanged across the two
  calls. Proves the statusline spec's "Contributing cell content" scenario. **Red:** temporarily add
  `export function registerInstrument(...)` to `instrument.ts`, run `node --test
  tests/jefferson.test.ts`, confirm the test fails naming `registerInstrument`; remove it and re-run
  green.

## 6. Verification

- [ ] 6.1 `pnpm typecheck` against the final tree; expected exit 0 with no output. Every new file is
  covered by `tsconfig.json`'s `extensions/**/*.ts` include with no include edit. Green only: this
  gate's own exit is the assertion, so a mutation red is not meaningful for it.

- [ ] 6.2 `pnpm test`; expected every test in `tests/session-data-store.test.ts`,
  `tests/instrument.test.ts`, `tests/configuration.test.ts`, `tests/row-renderer.test.ts`, and
  `tests/jefferson.test.ts` passing, 0 fail. This is also the erasable-syntax check: Node executes
  the source directly, so a non-erasable construct fails to parse. Record the pass/fail tally.

- [ ] 6.3 `openspec validate session-data-store --strict`; expected
  `Change 'session-data-store' is valid`. Record the exact output.

- [ ] 6.4 The terminal demonstration the implementation gate demands. Pack and install the extension
  into a real `pi` session and observe, in a TUI: with `{ "cells": ["model", "thinking"] }` the
  footer renders `<provider>: <model>` and `thinking: <level>`; changing the model with `/model`
  repaints both cells with no manual refresh, and changing the thinking level does the same; a
  document carrying `containers: 3` warns naming the key and `declare cells instead` while still
  rendering its rows as eight `blank` cells. Record the observed lines and the warning text.

- [ ] 6.5 Nothing outside `extensions/` and `tests/` changed to make this work:
  `git diff --exit-code package.json tsconfig.json .github/workflows/ci.yml README.md` prints
  nothing, and `pnpm pack --dry-run --json` lists both new source files under `extensions/jefferson/`
  and no `*.test.ts`. The host pin stays `^1.4.0` (D14).
