# Design

## Context

Motivation is in `proposal.md`; the settled architecture and the two accepted amendments are in
`council.md`; the binding scope rulings are in `owner-rulings.md`. This section records only the
state the approach must fit and the host facts it rests on.

**Current state**, read at `c7ef3a4`:

- `extensions/jefferson.ts` — the entry, the only file the host loads (`package.json`
  `pi.extensions: ["./extensions/jefferson.ts"]`) and the only file with a runtime import of
  `@earendil-works/*`. On every `session_start` in TUI mode it reads the configuration, notifies a
  warning, and calls `ctx.ui.setFooter(() => createFooter(rows, { truncateToWidth, visibleWidth }))`.
  **The factory's three parameters — `tui`, `theme`, `footerData` — are discarded today**, so the
  footer has no way to ask for a repaint and no live data.
- `extensions/jefferson/configuration.ts` — `readConfiguration(source)` → `{ rows, warning }`,
  normalizing either document shape to `Row { id, cells: Cell[] }` with `Cell { text }`, applying
  `DEFAULT_CONTAINERS`/`MAX_CONTAINERS` (8/8) and `DEFAULT_CELL_TEXT`. Imports only `node:` builtins.
  Every page-level failure throws `RejectedConfiguration`, which becomes a warning plus the default
  row.
- `extensions/jefferson/row-renderer.ts` — `renderRow(row, width, helpers)` and
  `createFooter(rows, helpers)` → `{ render(width): string[], invalidate(): void }`. Equal cells come
  from `floor(W / N)` recomputed inside `render(width)`; each cell truncates and pads its own text so
  a row is always one line. Width helpers are injected (`WidthHelpers`), so this file has no host
  runtime import.
- `tests/` — `configuration.test.ts`, `jefferson.test.ts`, `row-renderer.test.ts`, none of which
  ships (CI asserts it).

**Constraints that bind the shape.** No build step and no new dependency; only erasable TypeScript.
Runtime imports of host packages only in the entry; `import type` elsewhere. Relative imports carry
`.ts`. Tests live under `tests/`. A new source file under `extensions/jefferson/` needs no
manifest, `tsconfig`, or CI change. `floor(W / N)` geometry and one line per row are existing
behavior, not re-derived here. The vocabulary is row → cell → instrument, label over data, `blank`
as the placeholder instrument; the owner's two rejected nouns (`owner-rulings.md`, "Vocabulary") do
not appear below, and where `extension-source-layout`'s term of art is meant, this design says
"source file".

**Host facts every claim below rests on** (1.5.0 shipped code, via `research-chidi.md` and
`research-eleanor.md`; section references are to those reports). Three facts are marked *verified
directly*: neither report documents them, so each was checked against the pinned devDependency
(1.4.0 — the code `pnpm typecheck` compiles against) instead.

1. `setFooter(factory)`'s factory receives `(tui, theme, footerData)`; its product may carry
   `dispose?()`, which the host calls when it replaces or clears the footer, including on session
   replacement and on reload (chidi Q1; eleanor §3.1, §5). `tui.requestRender()` is the only repaint
   request a footer has — the host re-renders on request, never on a footer-specific timer (chidi Q1;
   eleanor §5).
2. `render(width)` runs on the interactive path and is synchronous (chidi Q1, Q2 gaps).
3. `pi.on(event, handler)` returns an unsubscribe function, so a subscription's lifetime can be a
   footer's (eleanor §3.3's types; verified in the 1.4.0 devDependency types at
   `dist/core/extensions/types.d.ts:1222–1223`).
4. Restoring a session does not fire `model_select`; `ctx.model` must be read at `session_start`
   (chidi Q2). `ModelSelectSource` also carries `"restore"` (`types.d.ts:883`, 1.4.0; *verified
   directly*), so a restore may confirm the value by push as well — seeding is correct either way.
   `_emitModelSelect` returns before emitting when `modelsAreEqual(previousModel, nextModel)`
   (`agent-session.js:1992–1993`; *verified directly*), so an identical re-report never reaches the
   extension — which makes D7's no-change-no-repaint rule doubly guaranteed.
5. `model_select` carries `model` (with `provider` and `id`); `thinking_level_select` carries
   `level`; `ctx.thinkingLevel` is optional, so unknown is reachable. `thinking_level_select` is
   emitted only from `setThinkingLevel`, and only when the level actually changes
   (`agent-session.js:2121–2133`; *verified directly*), with no resume path calling it — so a
   restored session's thinking level, like its model, is only obtainable by reading `ctx` at
   `session_start`.
6. A context captured before a session replacement or reload throws on **every** access (eleanor
   §3.3). The host clears the custom footer before the replacement's `session_start` fires, and
   `footerData`'s `branchChangeCallbacks` are cleared only in the provider's own `dispose()`
   (chidi Q1; eleanor §3.2, §5) — so any subscription the footer takes must be released from the
   footer's `dispose()`, not from `session_shutdown`.
7. `ctx.mode !== "tui"` makes `setFooter` a no-op (eleanor §6), which is why no store exists outside
   TUI mode.

## Goals / Non-Goals

**Goals:**

- One store owning the three datums a shipped instrument displays, current behind the scenes, read
  through a synchronous total surface that cannot throw.
- A cell-holds-instrument seam: an instrument reads the store and returns text, and nothing else.
- Two live instruments — `model` and `thinking` — and `blank` as an instrument rather than a special
  case, with `cells` as a row's count and placement.
- A push that changes displayed data repaints itself, and every subscription dies with the footer.
- Prove each requirement of `specs/session-data-store/spec.md` and the amended requirements of
  `specs/statusline/spec.md` with a named test, except the derived-datum requirement this change
  satisfies vacuously because it derives nothing (`D13`).

**Non-Goals:**

- The wider data surface: git branch, extension statuses, provider count, working directory. Named
  deferred decision; `onBranchChange` is not subscribed.
- A catalog of instruments, any third-party contribution API, per-cell styling, composition of
  datums into a user-authored instrument (the shape allows it; the feature is not built).
- Any derived value. None of the three datums needs one.
- Bumping the devDependency host pin.
- Any change outside `extensions/`, `tests/`, and this change's artifacts.

## Decisions

### D1. The new working parts are two source files, each named for what it owns

```text
extensions/
├── jefferson.ts                     (entry: seeds, subscribes, injects, disposes)
└── jefferson/
    ├── configuration.ts             (document surface → rows of cells holding instruments)
    ├── row-renderer.ts              (geometry: one line per row, floor(W / N), truncate and pad)
    ├── session-data-store.ts        (NEW — the store: datums, unknown, one sample per frame,
    │                                 change detection, repaint, disposal)
    └── instrument.ts                (NEW — the instrument shape, blank, model, thinking,
                                      and name resolution)
```

What each new file owns:

- `session-data-store.ts` owns the three datums, the unknown sentinel, the frame sample, repaint on a
  displayed change, and the disposed flag. It holds no host handle except the injected
  `requestRender` callback, so it needs no host import at all.
- `instrument.ts` owns the label-over-data shape, the three shipped instruments, and
  `instrumentNamed(name)`. It imports one type (`Readings`) and nothing else.

Dependency direction, one way, no cycles: `instrument.ts` ← `configuration.ts` (resolution) and
`instrument.ts` — `session-data-store.ts` (type only); `row-renderer.ts` ← `configuration.ts` +
the `Readings` type; `extensions/jefferson.ts` → all four. Neither new file introduces a directory,
a manifest field, a `tsconfig` glob, or a CI expectation: both sit under the declared load root,
already covered by `files: ["extensions", …]` and `include: ["extensions/**/*.ts", …]`.

Two files rather than five: each shipped instrument is one application of the shared
label-over-data constructor (`D9`), so a file per instrument would add names without adding a
boundary. When an instrument needs data of its own, it becomes its own source file that
`instrument.ts` imports, and no consumer changes.

### D2. The store's surface: three named datums, `undefined` as unknown, and a sample an instrument reads

```ts
// extensions/jefferson/session-data-store.ts
export type Reading = string | undefined; // undefined is unknown — never "" and never 0

export interface Readings {
  readonly provider: Reading;
  readonly model: Reading;
  readonly thinkingLevel: Reading;
}

export interface SessionDataStore {
  /** This frame's values, taken once per render. Total: never blocks, awaits, or throws. */
  sample(): Readings;
  /** A model selection push. */
  modelSelected(provider: string, model: string): void;
  /** A thinking-level selection push. */
  thinkingLevelSelected(level: string): void;
  /** Releases the store; idempotent. */
  dispose(): void;
}

export function createSessionDataStore(options: {
  seed: Readings;
  requestRender: () => void;
}): SessionDataStore;
```

- **Unknown is `undefined`.** It is the platform's distinguished absent value, so `""` (a genuinely
  empty value) and `"0"` stay distinguishable without a new type or a magic string. The store never
  substitutes `""`, `0`, or a stale value for unknown.
- **An instrument is given `Readings`, and nothing else** — not the store, not a context, not `tui`,
  not `footerData`. It cannot subscribe, poll, mutate, or retain a handle, and `readonly` makes that
  a compile-time property rather than a convention. This is the whole answer to "how does an
  instrument read without seeing mutability".
- The store's datum names are the three from `owner-rulings.md`; `provider` and `model` are distinct
  datums rather than one composed value, so `model`'s label and data can be read independently and
  later composed differently.
- `modelSelected`/`thinkingLevelSelected` take plain strings, not host objects: the entry unwraps
  `event.model.provider` / `event.model.id` / `event.level`, so the store never names a host type.

### D3. Each datum declares one ingestion mode; all three are pushed; nothing is derived

| Datum | Mode | Delivery | Unknown when |
|---|---|---|---|
| `provider` | pushed | seeded at `session_start` from `ctx.model.provider`; updated by `model_select` | no model is active |
| `model` | pushed | same | no model is active |
| `thinkingLevel` | pushed | seeded at `session_start` from `ctx.thinkingLevel`; updated by `thinking_level_select` | the host reports no level |

Read at render and cached-with-a-named-invalidation are the store's other two declared modes and are
used by no datum in this change. A datum ingested at render time would have to reach the host through
an injected getter the entry replaces on each session start (the store may not hold a context — `D8`);
a cached datum would be memoized under a named invalidation (`D4`). Naming them now is what fixes the
rule a later datum must follow; building them now would be scaffolding for no caller.

**Cost.** `sample()` is O(1): one object with three string field copies. Each instrument is O(1): one
or two property reads and a template string. Truncation and padding stay O(cells) per row, unchanged.
Nothing in this change is super-constant per render, and nothing is derived, so the "derived at most
once per render" requirement is satisfied by having no derived datum. The rule that keeps it true
when one appears: a derived value is memoized under **named** invalidations (named for the datum
change that causes it), recomputed at most once after an invalidation, and carried in `Readings` like
any other value — never recomputed per render and never per cell.

### D4. One render sees one state, by a single sample taken at the start of `render(width)`

`render(width)` calls the injected sample **exactly once** and passes that one `Readings` object down
to every row and every cell. `createFooter` therefore takes `sampleReadings: () => Readings`, not the
store, so the renderer stays ignorant of store liveness:

```ts
// extensions/jefferson/row-renderer.ts
export function renderRow(row: Row, width: number, helpers: WidthHelpers, readings: Readings): string;
export function createFooter(rows: Row[], sampleReadings: () => Readings, helpers: WidthHelpers): Footer;
```

Because a cell's text comes from `cell.instrument.resolve(readings)` and every cell in the render
holds the same object, two cells reading one datum cannot disagree — agreement is structural, not
procedural. `invalidate()` stays a no-op: the footer caches nothing.

**Why this and not the rejected alternatives.** A mid-frame update cannot occur: `render(width)` is
synchronous, the host repaints only on request, and the runtime is single-threaded run-to-completion —
so an *immutable per-frame snapshot structure* with per-datum copies and version stamps would defend
against an impossible event and allocate per render for it; that is what the council rejected, and it
is not built. Live pass-through per cell — each cell reading the store directly — was rejected too:
it repeats work per cell and breaks silently the moment a datum is impure, read-at-render, or derived,
because two cells could then resolve from two different reads. The accepted middle is one flat sample
per render: one three-field object, allocated once per render, which is also the object an instrument
is handed, so no cell ever sees store mutability at all. Per-datum generation counters were rejected
for the same reason as the snapshot structure: they exist to detect a change that cannot happen inside
a synchronous render.

The observable consequence today is small and honestly stated: with three pushed datums and a
synchronous render, the sample mainly guarantees that all cells share one object. It is load-bearing
for the next datum whose mode is read-at-render or derived.

### D5. Subscriptions: the entry subscribes and retains the release, the store holds plain data, the
footer's `dispose` releases

The store cannot import host packages, so `pi.on` is the entry's, called at `session_start` right
after the store is created — one subscription set per store, existing only while that footer exists.
What must outlive one `session_start` call is the previous install's release, so the extension
factory's closure holds it:

```ts
// extensions/jefferson.ts
export default function jefferson(pi: ExtensionAPI): void {
  // Retained across session_start calls: the previous install's release, so a store the entry
  // still holds is disposed — and its subscriptions dropped — before its replacement exists.
  let releasePrevious: (() => void) | undefined;

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    releasePrevious?.(); // idempotent: the footer's dispose() may already have run

    let requestRepaint: (() => void) | undefined; // assigned when the host invokes the factory

    const store = createSessionDataStore({
      seed: { provider: ctx.model?.provider, model: ctx.model?.id, thinkingLevel: ctx.thinkingLevel },
      requestRender: () => requestRepaint?.(),
    });

    const releaseModel = pi.on("model_select", (event) =>
      store.modelSelected(event.model.provider, event.model.id),
    );
    const releaseThinking = pi.on("thinking_level_select", (event) =>
      store.thinkingLevelSelected(event.level),
    );

    // configuration read and its warning elided (D10, D11)
    const footer = createFooter(rows, () => store.sample(), { truncateToWidth, visibleWidth });

    let released = false;
    const release = (): void => {
      if (released) return; // the host's dispose() and the next session's releasePrevious() agree
      released = true;
      releaseModel();
      releaseThinking();
      store.dispose(); // clears the repaint callback; sample() returns unknown
    };
    releasePrevious = release;

    ctx.ui.setFooter((tui) => {
      requestRepaint = () => tui.requestRender();
      return {
        render: (width: number) => footer.render(width),
        invalidate: () => footer.invalidate(),
        dispose: release,
      };
    });
  });
}
```

`release` is the single teardown, and it is idempotent because two callers may reach it: the host's
`dispose()` and a later `releasePrevious?.()`. That second call is the line that makes D6's guarantee
true of the code and not only of the prose — a host that failed to dispose a replaced footer leaves
neither a live subscription nor a live repaint callback behind, because the next `session_start`
releases both before creating anything. Retaining `release` rather than the store alone is what makes
the subscription half of that sentence true: `store.dispose()` is inside it, so a call that disposed
only the store would leave both `pi.on` unsubscribes registered.

The forwarding contract, stated exactly:

| Event | Subscribed by | Reaches the store as | Effect |
|---|---|---|---|
| `model_select` | the entry, at `session_start` | `store.modelSelected(event.model.provider, event.model.id)` | updates `provider` and `model`; repaints if either changed |
| `thinking_level_select` | the entry, at `session_start` | `store.thinkingLevelSelected(event.level)` | updates `thinkingLevel`; repaints if it changed |
| `footerData.onBranchChange` | **nobody** — `owner-rulings.md`: the wider surface is deferred | — | — |
| `session_shutdown` | nobody; teardown is the footer's `dispose()`, which the host calls on replace and on reload (why this departs from the documented `session_shutdown` guidance: below) | — | — |

`tui.requestRender()` is reached only through the injected `requestRender` callback, whose target is
assigned when the host invokes the factory — synchronously inside `setFooter`, before any push can
arrive. `theme` and `footerData` are still unused: no datum in this change needs either, and injecting
an unused handle would be scaffolding. They stay available to the factory for the deferred decision.

**Why the footer's `dispose()` and not `session_shutdown`.** The documented guidance is to register
an idempotent `session_shutdown` handler to close session-scoped resources (`research-chidi.md`, Q6,
quoting `docs/extensions.md`, "Long-lived resources and shutdown"). This design departs from that
guidance deliberately: the resources here are footer-scoped, not session-scoped — they exist only to
serve one footer's repaints — and the host disposes the previous footer before the replacement's
`session_start` (Context fact 6), on the reload path as well as the replacement paths. So the release
the guidance asks for has already run by the time a `session_shutdown` handler could ask for it. The
two cannot disagree: a `session_shutdown` handler would call this same `release`, which is
idempotent, so the handler and the footer's `dispose()` release the same two subscriptions and the
same store and differ only in which fires first — never in what is released. The one path that ends
without a replacement `session_start` is quit, which ends the process, so a subscription that is
still registered there has nothing left to serve. The provider's own branch callbacks are also
cleared only in its `dispose()`, so a `session_shutdown` subscription would couple teardown to an
event whose ordering does not match the footer's lifetime. The store keeps no subscription object
itself, so "release every subscription the store holds" is satisfied jointly and visibly in one
`release`: the entry's two host unsubscribes and the store's repaint callback.

Nothing survives a replacement this way: a reload re-imports the extension with the host's import
cache disabled, so no value can outlive the runtime, and the store holds only plain strings — never
a context.

### D6. Both selection datums are seeded from the context at `session_start`

The host reports no model or thinking-level selection when it restores a session (Context facts 4, 5), so
seeding is the only thing that makes a restored session's `model` and `thinking` cells correct. The
seed is `ctx.model?.provider`, `ctx.model?.id`, and `ctx.thinkingLevel`, read once per store.

All five reasons take the identical path — no branch on `event.reason`:

| `session_start` reason | What the store does |
|---|---|
| `startup` | created and seeded from the context, then the footer is installed |
| `new` | created and seeded from the new session's context |
| `resume` | created and seeded from the restored session's context — **this is why seeding exists** |
| `fork` | created and seeded from the forked session's context |
| `reload` | created and seeded afresh; the extension was re-imported, so no earlier state is reachable |

A store the entry still holds is disposed before a new one is created, so a host that failed to
dispose a replaced footer cannot leave live subscriptions: the entry retains the previous install's
`release` and calls it first (D5). That release is idempotent, for the case where the host also
called the footer's `dispose()`.

### D7. A push repaints only when a held datum's value actually changes

The store holds exactly the datums a shipped instrument displays (`specs/session-data-store`'s first
requirement), so "a datum a cell displays" and "a datum the store holds" are the same set — which is
why the rule can be stated on held data and stay true for every configuration:

- on a push, compare each incoming value with the held one; assign every value;
- if any held value changed, call `requestRender()` once;
- if no held value changed (an identical selection re-reported, including a restore push confirming
  the seed), call nothing;
- after `dispose()`, call nothing, ever.

The instrument and the cell never ask for a repaint, and the footer's `invalidate()` stays a no-op;
`tui.requestRender()` through the injected callback is the only repaint path, and the entry's current
code discards it. One repaint per push, not one per changed datum: the host coalesces render requests
(chidi Q1, `docs/tui.md`).

### D8. Nothing survives disposal, and no context is ever touched after one

- The release (D5) is the single teardown: it releases both `pi.on` unsubscribes and calls
  `store.dispose()`. It has two idempotent callers — the footer's `dispose()` and the next
  `session_start`'s `releasePrevious?.()` — so the second caller does nothing. After either, no
  handler of the store can run and no repaint can be requested.
- `store.dispose()` clears the repaint callback, and makes `sample()` return
  `{ provider: undefined, model: undefined, thinkingLevel: undefined }`. A read after disposal is
  unknown, synchronously, and throws nothing. It is idempotent.
- **The store holds no context at all.** The context is read once, inside `session_start`, and the
  values leave as strings. So there is no context touch to gate with a `disposed` flag — the stronger
  form of the requirement the reviewer standard asks for: a captured context throws after a reload
  (Context fact 6), and nothing this change builds can touch one after the session that supplied it
  is gone. A future read-at-render datum must not weaken this: it goes through a getter the entry
  replaces at each session start, and the store's disposed flag gates the call.
- `dispose()` clearing the callback rather than merely flagging it is deliberate: the callback closes
  over `tui`, so dropping it releases the host handle as well.

### D9. An instrument is a label over a data field, where either may be data

```ts
// extensions/jefferson/instrument.ts
export interface Instrument {
  resolve(readings: Readings): string;
}

/** `label: data`, or "" when either half is unknown. */
function labelled(label: (r: Readings) => Reading, data: (r: Readings) => Reading): Instrument {
  return {
    resolve(readings) {
      const l = label(readings);
      const d = data(readings);
      return l === undefined || d === undefined ? "" : `${l}: ${d}`;
    },
  };
}

export const blank: Instrument = { resolve: () => DEFAULT_CELL_TEXT };
export const model: Instrument = labelled((r) => r.provider, (r) => r.model);
export const thinking: Instrument = labelled(() => "thinking", (r) => r.thinkingLevel);

export function instrumentNamed(name: string): Instrument | undefined;
```

`model` renders `provider: model` — its label is the provider datum. `thinking` renders
`thinking: level` — a literal label over the level datum. Both are one shape applied twice, which is
the owner's ruling that an instrument has a label and a data field and the label may itself be data.

**Composition without building composition.** An instrument's input is the *whole* `Readings`, not
"its own datum", so an instrument that formats two datums is already expressible: `labelled` is a
convenience for the label-over-data case, and a future instrument that composes differently is one
more `resolve` over the same `Readings`. Nothing about this shape assumes a single datum per
instrument, so composition later is a new instrument, not a rewrite of the seam. What is deliberately
not built: a record of labelled fragments, a per-instrument format string, or any user-authored
composition — the users' composition feature is future scope and its absence changes no code today.

`DEFAULT_CELL_TEXT` moves here from `configuration.ts`, because it is `blank`'s text and `blank` is an
instrument; the dependency runs `configuration.ts` → `instrument.ts`, never the reverse.

### D10. Resolve instrument names at configuration parse, once, through the existing warning channel

`readConfiguration` resolves each `cells` entry with `instrumentNamed(name)`. An unknown name becomes
`blank` and is collected; the resulting `Configuration.warning` names every unknown instrument once
(`pi-jefferson: <path> names instruments the extension does not implement: <names>; those cells render
blank`), and the row's other cells render theirs.

Chosen at parse, not at render, because parse happens once per `session_start` while render happens on
every repaint: at parse the warning is deterministic, arrives through the channel the entry already
uses (`ctx.ui.notify(warning, "warning")`), and can name every offending instrument at once; at render
it would repeat on every frame, or need a once-flag to avoid repeating, which is the same parse-time
detection spelled later. Parse-time resolution also means a `Cell` carries its instrument, so the
render path has no lookup to fail at.

Consequence to accept knowingly: a `Cell` now holds an instrument instead of text, so
`Configuration.warning` also becomes non-`undefined` for an *accepted* document. Its doc comment says
so; nothing else about the channel changes.

**What the two live instruments render when a datum is unknown:** the empty string — an empty cell.
`model` cannot state `provider: model` when either half is unknown, and rendering half a pair, a
placeholder glyph, or a stale value would claim a value the store does not have. The distinction
between unknown and genuinely empty is kept where the spec puts it, in the store's read
(`undefined` vs `""`); the instrument renders nothing because there is no text it can honestly
resolve. `blank` renders its placeholder regardless — it reads no datum.

### D11. Configuration: `cells` is the count and the placement; `containers` is not read

- `cells` is an array of instrument names in cell order. Present → one cell per entry, in order.
- Absent → eight `blank` cells, exactly as shipped (`DEFAULT_CELLS = 8`).
- Longer than 8 → the first eight are used and the document is accepted (`MAX_CELLS = 8`), the old
  clamp behavior under a truthful name. `DEFAULT_CONTAINERS`/`MAX_CONTAINERS` are renamed, not kept
  as aliases: `containers` is gone.
- An **empty** `cells` array is rejected: the whole document is rejected, the default row renders, and
  the warning names the reason. Rationale: a row with no cells has no geometry — `floor(W / 0)` — and
  the shipped policy already rejects `containers: 0` for the same reason. Treating empty as absent
  would silently render a row the user did not ask for; rejecting is the existing error policy applied
  to the same input class, not a new one.
- A `cells` entry that is not a string is rejected the same way, matching the existing treatment of a
  non-string `id` and a non-integer `containers`.
- A document carrying `containers` is **not rejected and the key is not read** — it cannot change what
  renders, so rejecting would punish a document whose output is already right. It warns once, naming
  the key and the migration (`declare cells instead`), because the break is breaking and silent
  behavior change is worse. The both-shapes guard that used to test `"containers" in doc || "id" in doc`
  now tests `"cells" in doc || "id" in doc`.
- The ceiling applies to the array's length; no other key states a cell count, and a length mismatch
  is no longer expressible. Every entry of a longer array is validated before the ceiling truncates
  it, so the ceiling clause applies to length only: an unknown name past the ceiling still warns
  though its cell does not render.

**Both error policies are settled here, not left open.** `proposal.md` delegates the error policy to
design, listing what a `cells` array renders as when it is empty and whether a document that still
carries a `containers` key is rejected, ignored, or warned about as its open questions for design —
deciding them is this design's job, and D11 decides both, with the rationale above. The delta now
states the empty-array rule as the scenario `cells empty` under `A row's cells are its count and its
placement`, so the shipped rejection is a spec requirement rather than an unratified choice. The
`containers` policy needs no spec requirement: the delta removes the key and its REMOVED requirement
already carries the migration guidance, so warning rather than rejecting is stated where a returning
user reads it.

### D12. The renderer's input is still text per cell; geometry is untouched

The only change inside `renderRow`'s loop is where the string comes from: `cell.instrument.resolve(
readings)` replaces `cell.text`. The arithmetic (`Math.floor((width - (n - 1) * GAP) / n)`), the
per-cell truncate-and-pad, and the row-level remainder are the code that ships today, unmodified.
The existing renderer tests keep their contract — same widths, same remainder, same one-line
assertions — with their fixtures becoming instruments that resolve to the same strings (`{ resolve: () =>
"Lorem ipsu" }` is a one-line fixture, because `Instrument` is a plain object). Nothing about
instrument text changes geometry, and a row of N cells still occupies `floor(W / N)` columns with
`W mod N` blank at the right edge.

### D13. Tests: one named test per exercisable requirement, all under `tests/`, none shipped

Two new test files and three extended ones. Tests use `node:test` and `node:assert/strict` as the
existing ones do, drive the real entry with a fake `pi`/`ctx`/`tui`, and never ship (the CI tarball
check already refuses `*.test.ts`).

**One requirement is satisfied vacuously, and no test is claimed for it.**
`specs/session-data-store`'s "Expensive derivations are bounded and invalidated by name" has no
subject in this change: D3 states that nothing is derived, so no derived value exists to be bounded,
reused, or invalidated, and none of that requirement's three scenarios can be exercised. What the
tests do pin is the mechanism that would carry a future derived value — one `sample()` per `render`
call. The rule such a value must follow is D3's named-invalidation memoization, not a test's.

| Requirement (spec) | Test | File |
|---|---|---|
| Store holds the data its instruments display | the store exposes exactly `provider`, `model`, `thinkingLevel` readings; no branch/status/count/cwd reading is taken | `session-data-store.test.ts` |
| A read is synchronous and total | reads before seeding, after a replacement, and after disposal return without throwing | `session-data-store.test.ts` |
| Unknown is a distinguished value | unseeded datum is `undefined`, not `""`; a seeded `""` reads `""` and differs from `undefined` | `session-data-store.test.ts` |
| Freshness never exceeds delivery | seed then push: the held value is the pushed one; a restore-style push carrying the seeded value changes nothing | `session-data-store.test.ts` |
| Expensive derivations bound | satisfied vacuously: this change derives nothing, so none of its scenarios has a subject (D3). The test in this row pins only the mechanism — one `sample()` per `render` call, however many cells read it | `session-data-store.test.ts`, `row-renderer.test.ts` |
| Every read in one render observes one state | two cells holding `model` resolve identically; a push between two renders changes both, a push during none | `row-renderer.test.ts` |
| Nothing survives a replacement | one fake `pi` shared across two `session_start` calls: the first store's two unsubscribes fire before the second store exists, and the render shows the new context's values, never the old | `jefferson.test.ts` |
| A pushed change repaints | `model_select`/`thinking_level_select` each request exactly one repaint; an unchanged value requests none | `jefferson.test.ts`, `session-data-store.test.ts` |
| Every subscription is released on dispose | footer `dispose()` calls both unsubscribes and no repaint follows; a disposed store samples unknown | `jefferson.test.ts`, `session-data-store.test.ts` |
| Cell content comes from an instrument / `blank` | default row's eight cells render the placeholder; a `cells` row renders its instruments' text | `configuration.test.ts`, `jefferson.test.ts` |
| A row's cells are its count and placement | absent → 8; 3 names → 3 cells in order; 12 → first 8, accepted | `configuration.test.ts` |
| Configuration designates each cell's instrument | unknown name warns naming it and renders `blank` while the rest of the row renders | `configuration.test.ts` |
| An instrument resolves text by reading the store | `resolve(readings)` returns text synchronously; `blank` resolves its constant without reading a datum; no host event, timer, or context appears in `instrument.ts` | `instrument.test.ts` |
| The model instrument / the thinking instrument | `provider: model` and `thinking: level`; `""` when a datum is unknown; correct text from a restored seed | `instrument.test.ts`, `jefferson.test.ts` |
| Instrument text is bound by geometry | instrument text wider than its cell clips; 3 cells at width 100 give 33 columns and a blank at the right edge | `row-renderer.test.ts` |

Tests that no shipped instrument can exercise in production, and are therefore written against the
store and a bare `Instrument` directly: an unknown datum rendering `""`; two cells reading one datum;
a read after disposal; an unchanged push requesting no repaint; `instrumentNamed` for a name the
extension does not implement. The exported-surface test in `jefferson.test.ts` is extended, not
replaced: the new files must still offer no name matching `register|supply|contribute`, and
`instrumentNamed` must remain a lookup rather than a registration path.

### D14. The host pin stays at 1.4.0; the parameters this design uses are checked against it

`devDependencies` pin `^1.4.0` while the running host is 1.5.0. The council ruled the bump a separate
change, and this design does not fold it in: the pin is a packaging decision about what `pnpm typecheck`
compiles against, not a behavior this change needs, and mixing it in would make a behavior change and a
dependency bump land as one reviewable unit.

The risk, stated so it is checkable: if the 1.4.0 type surface lacked a parameter used here,
`pnpm typecheck` would fail at the call site — loudly, not silently — and the bump would become a
prerequisite rather than a follow-up. The parameters used, and their 1.4.0 status (verified in the
installed devDependency types):

| Used | 1.4.0 location |
|---|---|
| `setFooter` factory's first parameter `tui` | `types.d.ts:111` |
| `tui.requestRender()` | `@earendil-works/pi-tui` `tui.d.ts:238` |
| the component's `dispose?()` | `types.d.ts:112` |
| `pi.on("model_select" \| "thinking_level_select")` → `() => void` | `types.d.ts:1222–1223` |
| `ctx.model`, `Model.provider`, `Model.id` | `types.d.ts` `ExtensionContext`; pi-ai `types.d.ts:631` |
| `ctx.thinkingLevel?: ThinkingLevel` | `types.d.ts:234` |
| `ModelSelectEvent.model`, `ThinkingLevelSelectEvent.level` | `types.d.ts:885–895` |

All are present, so the bump is not a prerequisite. Residual risk is behavioral (a 1.4.0 *runtime*
could differ), and it is small here: the code runs against the 1.5.0 host, while tests run against
1.4.0 types plus fake hosts, so no test asserts 1.4.0 runtime behavior.

## Risks / Trade-offs

- **[Risk]** The frame sample protects nothing today, since all three datums are pushed and `render`
  is synchronous, so it can rot into a decoration nobody understands. → **Mitigation:** D4 states
  exactly what it buys now (all cells share one object) and what it buys next (a read-at-render or
  derived datum cannot disagree between cells), and the test asserting one `sample()` per render pins
  the mechanism rather than the data.
- **[Risk]** A store that never receives a push after disposal could still call `requestRender` if a
  subscription leaked, and `tui` is a live handle that can throw or repaint after the footer is gone.
  → **Mitigation:** `dispose()` clears the callback *and* the entry calls both unsubscribes, and
  `sample()` guards on the disposed flag; both are tested.
- **[Risk]** Seeding reads `ctx.model`/`ctx.thinkingLevel` inside `session_start`, and a host that
  restored a session with no model leaves `model`/`provider` unknown — the footer's `model` cell then
  renders empty. → **Mitigation:** accepted and stated in D10: unknown is honest, and the cell fills in
  as soon as the host reports a selection. The alternative, showing a stale or fabricated model, is
  worse.
- **[Risk]** Rejecting an empty `cells` array is a policy this change adopts without an owner ruling
  on error policy. → **Mitigation:** it is the shipped policy for the identical input class
  (`containers: 0`), it protects the `floor(W / 0)` geometry the statusline spec binds, and the
  document renders the default row with a warning, so nothing is lost silently. Flagged in Open
  Questions for the owner to confirm or reverse.
- **[Risk]** Warning (rather than rejecting) on a document that still carries `containers` means a
  migrated-by-hand document keeps rendering eight blank cells while telling the user why. → Accepted:
  the key is not read, so it cannot corrupt the render, and the warning is the cheapest honest signal.
- **[Trade-off]** `Cell` changes from `{ text }` to `{ instrument }`, so `configuration.test.ts`,
  `row-renderer.test.ts`, and `DEFAULT_CELL_TEXT`'s import path all change. → Necessary: the seam the
  proposal sells is exactly "a cell holds an instrument"; a text-valued cell would have to be
  converted at render time, reintroducing the lookup D10 removes from the render path.
- **[Trade-off]** Two subscriptions are registered per `session_start` rather than once per extension
  load, so a session that never installs a footer (non-TUI) takes none and a reload takes fresh ones.
  → Accepted: it is what makes "released when the footer is disposed" literally true instead of a
  forwarding flag remembering not to run.
- **[Risk]** `setFooter`'s factory may in principle be invoked more than once per install (documentation
  is silent; shipped code invokes it once). A second invocation re-assigns `requestRepaint` to the same
  `tui` and returns another view of the same component, so no second store and no second subscription
  is created. → **Mitigation:** the store is created outside the factory (D6), which is what makes this
  safe.
- **[Risk]** The `thinking` and `model` instruments show raw host strings (`ProviderId`, `ThinkingLevel`),
  so a future host could widen either and change what renders. → Accepted for this change; both are
  `string`-assignable today.

## Migration Plan

A pre-release **BREAKING** change, shipped in one version; no deprecation shim (`owner-rulings.md`,
"Cells are the count and the placement").

Order the implementation so each step leaves a green tree:

1. Add `session-data-store.ts` and its tests; nothing imports it yet.
2. Add `instrument.ts` (`Instrument`, `labelled`, `blank`, `model`, `thinking`, `instrumentNamed`,
   `DEFAULT_CELL_TEXT`) and its tests; move `DEFAULT_CELL_TEXT` out of `configuration.ts` and update
   the two tests that import it.
3. Change `configuration.ts`: `Cell { instrument }`, `cells` replaces `containers`, rename the ceiling
   constants, resolve names, collect the unknown-name and `containers` warnings, reject an empty or
   non-string `cells`. Update `configuration.test.ts`.
4. Change `row-renderer.ts`: `createFooter(rows, sampleReadings, helpers)`, `renderRow(row, width,
   helpers, readings)`, resolve the instrument inside the loop. Update `row-renderer.test.ts`'s
   fixtures and keep every geometry assertion.
5. Rewire `extensions/jefferson.ts`: seed, subscribe, inject `tui.requestRender`, retain the
   previous release in the factory's closure, compose `dispose`.
   Update `jefferson.test.ts`'s fake `ctx`/`pi` with `model`, `thinkingLevel`, an `on` that records
   handlers and returns unsubscribes, a `tui` whose `requestRender` is counted, and a `setFooter` that
   keeps the component so `dispose` can be called.
6. Run `pnpm typecheck` and `pnpm test`; then install the packed extension and confirm in a real
   terminal that `cells: ["model", "thinking"]` renders `provider: model` and `thinking: level`, that
   `/model` and a thinking-level change repaint without a manual refresh, and that a `containers`
   document warns and still renders.

**Rollback:** before merge, the change is one branch and is discarded whole. After merge, reverting is
a new patch version: `containers` support is not restored by a rollback shim, because the owner
accepted the break pre-release and a shim would re-create the two spellings of one thing that this
change removes.

No `package.json`, `tsconfig.json`, `.github/workflows/ci.yml`, or `README.md` change is needed: the
two new files sit under the declared load root, `files` ships the whole `extensions/` subtree, the
`include` globs already match them, and the README documents no configuration keys.

## Spec alignment

One row per requirement, for the two delta specs this change carries.

`specs/session-data-store/spec.md`:

| Requirement | How this design satisfies it |
|---|---|
| The store holds the data its instruments display | D2: exactly `provider`, `model`, `thinkingLevel`; D3: no other datum and no subscription for one |
| A read is synchronous and total | D2's `sample()` is a pure field copy; D8 makes a disposed read unknown, and a seeded read is a string — nothing awaits, blocks, or throws |
| Unknown is a distinguished value | D2: `Reading = string \| undefined`, never `""` or `0` |
| Freshness never exceeds the host's delivery | D3's mode table, D6's seeding; the store claims the seed or the push and nothing fresher |
| Expensive derivations are bounded and invalidated by name | Satisfied vacuously: D3 derives nothing, so the requirement has no subject and none of its scenarios has a test (D13). D3 names the rule a future derived datum must follow — named-invalidation memoization, recomputed at most once — and D4 supplies the per-render bound |
| Every read in one render observes one state | D4: one sample per `render(width)`, one `Readings` object to every cell |
| Store data does not survive a session replacement | D6: a fresh store seeded from the new context at every `session_start`; D8: no context held, so no stale read |
| A pushed change that alters displayed data results in a repaint | D7: change-compared push plus the injected `tui.requestRender()` |
| Every subscription is released when the footer is disposed | D5, D8: both unsubscribes plus a cleared repaint callback, released from the footer's `dispose()` and, as a backstop, before a replacement store is created |

`specs/statusline/spec.md`:

| Requirement | How this design satisfies it |
|---|---|
| Cell content comes from an instrument | D9, D10, D12: a cell holds an instrument; `blank` is one; no registration API exists (D13's exported-surface test) |
| A row is one line tall | D12: truncate-and-pad unchanged |
| A row's cells are its count and its placement | D11: absent → 8, ceiling 8 truncates, no other key states a count |
| Configuration designates each cell's instrument | D10, D11: names resolve at parse; an unknown name warns and renders `blank`, the rest of the row unaffected |
| An instrument resolves a cell's text by reading the store | D2: an instrument that displays a datum receives that datum through `Readings` only — no event, timer, context, or store handle; `blank` reads no datum and resolves its constant (D9) |
| The model instrument / the thinking instrument | D9: `provider: model` and `thinking: level` over the three datums; D6 makes a restored session's text correct |
| Instrument text is bound by the row's geometry | D12: geometry is the shipped `floor(W / N)`; instrument text is only the string it clips |

## Where each review standard is answered

| Standard | Decision |
|---|---|
| Store lives under `extensions/jefferson/` with no runtime host import; every host value arrives by injection | D1, D2 (`requestRender` injected), D5 (`pi.on` is the entry's) |
| Read surface synchronous and total | D2, D8 |
| One ingestion mode per datum, no freshness claim its mode cannot support | D3 |
| Expensive derivations bounded and invalidated by name; what is O(1) per render stated | D3, D4 |
| One render sees one state, by a single sample, justified against the rejected alternative | D4 |
| Unknown is a distinguished value | D2, D10 |
| Nothing survives a replacement; subscriptions released on `dispose()`; a disposed flag gates what remains | D5, D6, D8 |
| A displayed push repaints through `tui.requestRender()` | D7 |
| The renderer's input stays text per cell; geometry and renderer tests untouched | D12 |

## Open Questions

- **When the deferred datum arrives** (git branch first, per `owner-rulings.md`), does it enter as a
  pushed datum via `footerData.onBranchChange` — the provider's only change subscription — or as
  read-at-render? It changes no code here; it decides which of D3's unbuilt modes gets built first.
- **Whether a later instrument should show a visible marker for unknown rather than an empty cell**
  (D10). Deferrable: no spec requirement asks for it, and changing it is a change inside
  `instrument.ts` alone.
