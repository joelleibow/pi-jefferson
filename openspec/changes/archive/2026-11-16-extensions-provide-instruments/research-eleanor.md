# Eleanor research — `extensions-provide-instruments`

Repository: `/Users/joelleibow/Projects/pi-jefferson` (branch `extensions-provide-instruments`). Scope: existing Jefferson code, tests, docs and decisions relevant to external instrument registration, instrument resolution, data, startup and package publishing. I read the brief and `owner-rulings.md` in full. No source/configuration files were changed. The initial git status showed the change directory untracked (`?? openspec/changes/extensions-provide-instruments/`); this report is its requested output.

## 1. Current instrument discovery

`extensions/jefferson/shipped.ts:2-16` imports each declaration and constructs a module-level `SHIPPED` record from `[blank, model, thinking, path, context, tokens, cost, branch, session, status, notice]`. `instrumentNamed` at lines 19-21 is a pure own-property lookup; unknown names return `undefined`. This is a fixed static table today.

Direct callers of `instrumentNamed`:

- `extensions/jefferson/configuration.ts:110`: instrument options are resolved while the configuration document is read; an unknown block key is collected as a notice.
- `extensions/jefferson/configuration.ts:228`: row entry names resolve during normalization/config read; unknowns are recorded and bound to `blank`.
- `tests/instrument.test.ts:6,59,87,92-93`: declaration/identity checks, including unknown lookup; test time.
- `tests/format.test.ts:9,25`: test helper resolves declarations for format tests; test time.
- `tests/session-data-feed.test.ts:294,298`: test resolves `status`; test time.
- `tests/row-renderer.test.ts:8,176,194,468`: tests resolve `notice` and `model`; test time.
- `tests/jefferson.test.ts:485-490`: export/lookup pin checks unresolved names and lookup stability; test time.

Other shipped enumeration: `tests/instrument.test.ts:71-90` enumerates declarations, checks the shipped names, labels/options/defaults, and unknowns; `tests/instrument.test.ts:~300-360` exercises fill behavior. Its width-0/width-200 equality check is in `tests/instrument.test.ts:~230-265` (AGENTS.md:43-44 calls it out). `tests/configuration.test.ts:557,734-762,839-845` tests shipped names/default labels. `tests/jefferson.test.ts:419-483` pins exports for shipped files and coverage of every shipped `.ts` file. Documentation enumeration is `docs/instruments.md:5-18` (table of all 11 current instruments). `AGENTS.md:30-43` describes adding an instrument as new declaration file plus `shipped.ts` entry. `/jefferson` does not enumerate instruments: `startup.ts:35-48` reports whether a footer and how many rows are installed. Render calls the already-bound instrument's `render` through row/cell code; lookup is not done at render (`configuration.ts` resolution happens first).

## 2. Resolution timing and unknown names

In `configuration.ts`, `readInstruments` resolves the names in the `instruments` block at line 110, then validates options/formats/styles and stores configuration by declaration name. `normalizeRow` resolves each entry name at line 228. A missing row declaration is substituted with `blank` when binding at line 237. The block unknown list is separately produced by `acceptedWarning` around lines 322-341; row notices are generated in `normalizeRow` and formatted there after normalization. The configuration result carries one `warning?: string` value, not deferred callback/logging state. Internally `Notices` is `{ unknownInRow: {row:number,name:string}[]; unknownInBlock:string[] }` (`configuration.ts:85-91`): row/name pairs in traversal order and unknown configured names in key order; final output joins notices (`configuration.ts:~322-341`). `readConfiguration` returns that warning as data at about lines 383-404. `startup.ts:73-74` sends it through `ctx.ui.notify` after constructing the feed and before installing the footer.

The design reason for data-shaped notices is recorded in ADRs and the archived configuration change: warnings are returned with parsed configuration for the composition root to present; `openspec/changes/archive/2026-11-15-reshape-the-configuration/design.md` (Context and decisions; especially the documented parser boundary) records that parser returns normalized rows and a warning rather than performing presentation. The archived change’s `research-eleanor.md` and design discuss the warning/read path. The exact user-facing semantics are in `docs/instruments.md:~58-75` and `docs/configuration.md` under “What a rejected document renders”.

Both name lookups and warning classification assume a complete known-name set at configuration-read time. `normalizeRow` replaces absent lookup immediately with `blank`; `readInstruments` treats absent declarations as permanently unknown and only returns a warning string. Therefore a later registration cannot automatically replace the already-bound fallback or retract the stored warning without new behavior.

## 3. Instrument declaration and binding

`extensions/jefferson/components/instruments/instrument.ts`:

- `Instrument` (`:8-11`) is the runtime seam: `fills:boolean` plus `render(readings:Readings,width:number,theme:Theme):string`.
- `InstrumentDeclaration` (`:30-65`) is declarative metadata mixed with resolver functions: `name`; `variables` (record of `(readings)=>string|undefined` functions); optional `variableForms` (variable → named form → resolver function); optional `bar` resolver; optional `fills`; `defaultFormat` string; optional `defaultLabel`; optional `variableFg` record of `(value)=>ThemeColor|undefined`; optional `composed`; optional `shownUntil` reading function; and `options` string list.
- `ComposedFormat` (`:18-27`) carries `variable`, per-value resolver functions in `variables`, selector function `select`, and default `formats` string record. `VariableForm` at `:16` is `(readings)=>string|undefined`.
- `FOUNDATIONAL_OPTIONS` at `:67` is frozen `['format','style','label']`.

The declarations are each in their own `components/instruments/*.ts`; for example the shipped table is visible at `shipped.ts:2-16`. Declaration fields mix plain data (names, defaults, option names, fill flags, format strings) with executable readers/functions (variables, forms, selectors, foreground resolvers, timed readings).

`instrument-binding.ts:18-75` binds config and declaration once per name, memoized in a `Map`. It parses declaration defaults or uses parsed configured segments, determines style and label, prepends a label literal and gap, and parses composed defaults. It produces a function-bearing `Instrument`: `fills` is based on declaration or `$bar`; `render` resolves composed selection and values, calls `resolveFormat`, and optionally applies `timed`. The bound signature is exactly `(readings,width,theme)=>string` (`instrument.ts:10`, implementation `instrument-binding.ts:43-73`).

## 4. Store and feed

`extensions/jefferson/data/session-data-store.ts:10-37` defines `Readings`: fixed fields `provider`, `model`, `thinkingLevel`, `cwd`, `home`, `branch`, `sessionName`, `statuses`, `contextUsage`, `totals`, optional timed `notice`, and `sampledAt`. Its key set is a static TypeScript interface; it is not dynamically keyed. `SessionDataStore` operations are likewise fixed (`:39-59`).

`createSessionDataStore` seeds six values from passed `seed` (`:82-90`), retains host readers and callbacks, and creates one sample (`:130-151`). Context usage and session identifiers/leaf are sampled through injected `readUsage`; totals scan entries and cache on `(sessionId,leafId)` (`:45-65,133-139`). `turnEnded` compares totals and calls `requestRender` only on change (`:203-214`). Selection, branch and session-name updates similarly repaint only if changed (`:163-194`). A notice is stamped with an expiry and requests repaint on arrival and at expiry (`:103-128`); the instrument’s timed visual decides whether it renders.

`session-data-feed.ts:35-59` seeds the store from `ctx`; this includes model/provider, thinking level, cwd, home and session name. Base subscriptions are installed at `:64-71`: `model_select`, `thinking_level_select`, `turn_end`, `session_info_changed`. Notice events `message_end`, `session_compact`, and `session_tree` are subscribed only when config has a notice cell (`:76-85`). Footer attachment (`:91-105`) supplies statuses and initial branch, then subscribes to branch changes. One `release` closure (`:109-126`) releases branch, base and notice subscriptions and disposes store; repeated release is guarded.

For a new extension-keyed top-level field, today’s `Readings` type and store implementation cannot express arbitrary top-level keys. The current static interface plus sample construction would need extension-owned data representation and a way for declarations to read it; the feed/store lifecycle and subscription/release path are the existing injection points. This is description of the present constraint, not a design recommendation.

## 5. Startup and host event calls

`extensions/jefferson/startup.ts:27-32` registers `session_shutdown` first, then `/jefferson` (`:37-49`), then `session_start` (`:51`). On TUI session start it releases previous install, reads configuration, creates the feed/subscriptions, stores release, notifies warning, sets row count, then installs footer (`:52-91`). Config is read before feed creation because notice timing config is passed to feed. `extensions/jefferson.ts:21-27` exports version and default entry invoking `startUp`.

The code’s plausible “startup completed” point is after the synchronous `session_start` handler has finished: the configuration has been read and footer install invoked. There is no separate startup-completed event or explicit state flag in Jefferson’s source. Whether pi has a distinct lifecycle notion is outside this code-only task and assigned to Chidi.

Every repository `pi.on`/`pi.events` occurrence in extension source: `startup.ts:31,51`; `data/session-data-feed.ts:64,67,70,71,82-84`. No `pi.events` use was found. Tests contain fakes/comments for `pi.on` (e.g. `tests/session-data-feed.test.ts:9`, `tests/jefferson.test.ts:33`), not additional production subscriptions.

## 6. Package surface

`package.json:2` name is `pi-jefferson`; `files` at `:11-15` ships `extensions`, `README.md`, `LICENSE`; `pi.extensions` at `:20-22` lists only `./extensions/jefferson.ts`. There is no `exports` field. Publishing a TS subpath is therefore not currently declared as a package export. `tsconfig.json:2-16` uses ES2023, NodeNext module/resolution, strict checks, `allowImportingTsExtensions`, `noEmit`, and includes `extensions/**/*.ts` and `tests/**/*.ts`; `AGENTS.md:20-27` says there is no build step and Node strips erasable TS directly.

`tests/jefferson.test.ts:419-490` pins exact runtime export keys for shipped files and scans extensions for coverage. Its shipped table includes `shipped.ts: [instrumentNamed]` at around line 446 and the entry export. `extensions/jefferson.ts:23-27` exports `VERSION` and default function `jefferson`; no instrument contract exports exist on this entry.

## 7. Instrument documentation and ADR evidence

- `docs/instruments.md:1-20`: an entry names an instrument; enumerates all current shipped names/variables/labels/default formats. `:22-39` describes name-keyed options and declaration options. `:58-75` describes unknown names, blank fallback, row-specific notices and unknown block names.
- `docs/configuration.md:1-14,20-48,80-110`: describes document/name references and `instruments` keyed by instrument name/options; no extension registration procedure currently described.
- `AGENTS.md:30-43`: “Adding an instrument” says one source file under `components/instruments`, import `FOUNDATIONAL_OPTIONS`, then one entry in `shipped.ts` for `instrumentNamed`; subsequent bullets specify render seam and store data constraints.
- `ARCHITECTURE.md:10-19,74-90,97-118,145-174`: names `shipped.ts` as shipped list/lookup; configuration resolves instrument names and unknowns; instrument declarations and bound render seam; import direction says `shipped.ts` imports instrument files.
- ADRs read for titles/summaries (titles are their filenames): `docs/adr/0001-imports-run-one-way.md` — import direction; `0005-source-is-laid-out-by-responsibility.md` and `0009-components-hold-the-parts-and-the-bar-stands-alone.md` — source homes and instrument file/table location; `0010-a-variable-declares-the-forms-it-accepts.md` — forms declared by instrument; `0012-a-composed-format-is-chosen-by-a-reading.md` — composed values/format structure; `0015-cell-is-no-longer-a-word-users-see.md` — user-facing naming vocabulary. Other instrument-relevant constraints include `0007-a-cell-takes-the-width-its-content-needs.md` (width/fill), `0011-the-store-keeps-time-on-an-injected-clock.md` (clock in store), `0013-a-visual-shows-and-hides-a-datum-on-the-clock.md` (timed display). ADR directory contains 0001–0016; the above titles are the ones directly relevant to finding/naming/declaring/rendering instruments. The status/title conventions are in each ADR header.
- Archived `openspec/changes/archive/2026-11-15-reshape-the-configuration/design.md` documents the current parser boundary and says the extension-author guide belongs in a later registration change; its non-goals explicitly exclude registration over events.

## 8. Tests and test helpers

There are 10 top-level `tests/*.test.ts` files: `configuration`, `format`, `instrument`, `jefferson`, `notice`, `row-renderer`, `session-data-feed`, `session-data-store`, `timed`, `width-plan`.

Instrument declarations/lookups/enumeration appear in five test files: `configuration.test.ts` (configuration binds names); `format.test.ts` (lookup helper); `instrument.test.ts` (declaration table, `instrumentNamed`, width check); `row-renderer.test.ts` (lookup for rendering); `session-data-feed.test.ts` (status lookup). `jefferson.test.ts` pins exports and lookup behavior. Store fakes/direct construction occur in `session-data-store.test.ts`, `session-data-feed.test.ts`, and render/config fixtures in `row-renderer.test.ts`/`configuration.test.ts`. The source test helpers include `tests/session-data-store.test.ts`’s readings/store factories; `tests/session-data-feed.test.ts`’s fake `pi.on`, context/session source and footer datum source; `tests/instrument.test.ts`’s declaration/render fixture and width samples; `tests/row-renderer.test.ts`’s row/cell/render helpers. Tests were located but not run (brief prohibits pnpm; no test command was required).

## Residual unknowns

- pi event-bus registration/loading semantics are intentionally outside this code-only reconnaissance (Chidi’s scope).
- No new package export or dynamic registry exists in current package metadata/source. The report makes no design judgment about the package API or when to warn; those are owner/Michael decisions.
- Exact event meaning of “session startup completed” cannot be established from Jefferson code: it has no explicit completion marker.
