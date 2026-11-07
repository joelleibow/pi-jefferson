# Eleanor research — restructure-by-responsibility

Repository: `/Users/joelleibow/Projects/pi-jefferson` (existing project). Change directory:
`openspec/changes/restructure-by-responsibility/`, whose only artifact so far is `owner-rulings.md`
(binding: the change is the restructure card — startup, config loading, footer setup, and data/updates
kept apart from visuals and process flow — plus two boyscout fixes: the GitHub repo description and
the `package.json` keywords). This report maps what is; it proposes no layout.

## 1. Required reads

| Read | File | Status |
|---|---|---|
| Instructions | `AGENTS.md` | read (run commands; adding-an-instrument steps; two traps; where decisions live) |
| Architecture | `ARCHITECTURE.md` | read (parts diagram, entry/store/configuration/instrument/row-renderer, import direction, traps, tests) |
| ADRs | `docs/adr/0001…0004` | read in full (titles/summaries in §2 below) |
| Language config | `package.json`, `tsconfig.json`, `pnpm-workspace.yaml` | read |
| CI | `.github/workflows/ci.yml`, `.github/workflows/release.yml` | read |
| Change binding | `openspec/changes/restructure-by-responsibility/owner-rulings.md` | read |
| Living specs | `openspec/specs/{extension-source-layout,statusline,session-data-store}/spec.md` | read |
| Archived changes | `openspec/changes/archive/2026-11-02-code-structure/` and `2026-11-04-extension-structure/` (design.md, spec deltas, plus the rest of each directory) | read |
| Source and tests | all of `extensions/`, all of `tests/` | read |

ADR entries (exact paths, titles, one-line summaries):

- `docs/adr/0001-imports-run-one-way.md` — "1. Imports run one way; host packages are the host's to supply" (2026-11-03, Accepted; supersedes the entry-only import requirement of `extension-source-layout`). Host packages stay `peerDependencies` with a `*` range and out of `dependencies`; any shipped file may import a host package at runtime; imports run entry → working parts, never back, no cycles. `WidthHelpers` injection is gone.
- `docs/adr/0002-rows-span-the-full-width.md` — "2. Rows span the full width" (2026-11-05, Accepted; supersedes the blank-right-edge property). Each of N cells gets `basis: floor(W/N)`, `grow: 1`, `shrink: 0`, no gap; remainder goes to the earliest cells; on width change re-seat the same components via `clear()` + `addChild`.
- `docs/adr/0003-a-format-carries-modifiers.md` — "3. A format carries modifiers, and `|` is a second special character" (2026-11-06, Accepted; supersedes the plain-text/`$`-only clauses of the statusline spec). `$` and `|` are the two special characters (`\$`, `\|`); `|name` modifies the preceding variable or non-whitespace run; names are the six `ThemeStyle` booleans plus `capitalize`/`upper`/`lower`; unknown names, a modifier on `$bar`, and a modifier with nothing before it reject the document at read time.
- `docs/adr/0004-string-mutations-come-from-lodash-es.md` — "4. String mutations come from `lodash-es`, the package's first runtime dependency" (2026-11-06, Accepted). `lodash-es` `^4.18.1` in `dependencies`, imported per function from `lodash-es/{upperFirst,toUpper,toLower}.js`; `@types/lodash-es` `^4.17.12` in `devDependencies`; the CommonJS build's named imports pass `tsc` but throw under `node --test`, so the suite is the guard.

## 2. Structure map — every file under `extensions/` and `tests/`

The five responsibilities: **startup** (event subscriptions, lifecycle), **config loading** (file paths and reading), **footer setup** (`setFooter` wiring and the component it returns), **data and its updates** (the store), **visuals and process flow** (instruments, the format language, the row renderer).

### extensions/

| File | Lines | Exports | Imports | Responsibilities |
|---|---|---|---|---|
| `extensions/jefferson.ts` | 130 | `VERSION` ("0.0.0-alpha"), default `jefferson(pi)` | `node:path` `join`; `@earendil-works/pi-coding-agent` `CONFIG_DIR_NAME`, type `ExtensionAPI`, `getAgentDir`; `./jefferson/configuration.ts` `readConfiguration`; `./jefferson/row-renderer.ts` `createFooter`; `./jefferson/session-data-store.ts` `createSessionDataStore` | **Mixes three**: startup (`pi.registerCommand`, `pi.on("session_start"/"model_select"/"thinking_level_select"/"turn_end")`, the `release`/`releasePrevious` teardown), config loading (the two `pi-jefferson.json` paths: `join(getAgentDir(), "pi-jefferson.json")` and `join(ctx.cwd, CONFIG_DIR_NAME, "pi-jefferson.json")`), footer setup (`ctx.ui.setFooter` callback returning `{render, invalidate, dispose: release}`) |
| `extensions/jefferson/configuration.ts` | 324 | types `CellAlign`, `Cell`, `Row`, `ConfigurationSource`, `Configuration`, `FormatSegment` (re-exported type use); consts `DEFAULT_CELLS` = `MAX_CELLS` = 10; `readConfiguration` | `node:fs` `existsSync`, `readFileSync`; type `Theme`, `ThemeStyle` from pi-coding-agent; `./instrument.ts` `blank`, `instrumentNamed`, types `Instrument`, `InstrumentDeclaration`; `./format.ts` `collapse`, `parseFormat`, `resolveFormat`, `validateStyle`, type `FormatSegment` | **Mixes two**: config loading (document read/parse, `normalizeDocument`, `normalizeRow`, `cellsFromNames`, `readInstruments`, warnings) and visuals/binding (`instrumentBindings`, `ConfiguredInstrument` — builds the bound `Instrument.render` closures that call `resolveFormat`; `Cell`/`Row` are the types the renderer consumes) |
| `extensions/jefferson/instrument.ts` | 112 | `DEFAULT_CELL_TEXT`; types `Instrument`, `InstrumentDeclaration`; `blank` declaration; `instrumentNamed(name)`; (declarations `model`, `thinking`, `path`, `context`, `tokens`, `cost` are module-private, reachable via `SHIPPED`/`instrumentNamed`) | `node:path` `basename`; type `Theme`, `ThemeColor` from pi-coding-agent; **type-only** `Readings` from `./session-data-store.ts` | visuals (instrument declarations; variable resolvers read the store) |
| `extensions/jefferson/format.ts` | 212 | type `FormatSegment`; `collapse`, `parseFormat`, `validateStyle`, `resolveFormat` | type `Theme`, `ThemeStyle` from pi-coding-agent; `parseColor`, `visibleWidth` from `@earendil-works/pi-tui`; `lodash-es/toLower.js`, `lodash-es/toUpper.js`, `lodash-es/upperFirst.js`; type `Instrument`, `InstrumentDeclaration` from `./instrument.ts` | visuals (the format-and-style language, `$bar` geometry) |
| `extensions/jefferson/row-renderer.ts` | 76 | type `Footer`; `createFooter(rows, sampleReadings, theme)` | `HStack`, `VStack`, `truncateToWidth`, `visibleWidth`, type `Component` from `@earendil-works/pi-tui`; type `Theme` from pi-coding-agent; **type-only** `Cell`, `Row` from `./configuration.ts`; **type-only** `Readings` from `./session-data-store.ts` | visuals and process flow (footer tree, cell clip/pad/align, per-render sample memoization) |
| `extensions/jefferson/session-data-store.ts` | 111 | types `Reading`, `UsageTotals`, `Readings`, `SessionDataStore`; `createSessionDataStore(options)` | type-only `ContextUsage`, `SessionEntry` from pi-coding-agent; no local imports | data and its updates (the whole file: seed, `sample`, `modelSelected`, `thinkingLevelSelected`, `turnEnded`, `dispose`, `scanTotals`, the `(sessionId, leafId)`-keyed scan cache) |

Files mixing more than one of the five responsibilities, with symbols:

- `extensions/jefferson.ts` — the entry mixes **startup**, **config loading**, and **footer setup** in one default-exported `jefferson(pi)`: `pi.registerCommand("jefferson", …)` and the `pi.on(...)` registrations (startup), the `agentPath`/`projectPath`/`projectTrusted` arguments to `readConfiguration` (config loading), and the `ctx.ui.setFooter((tui, theme) => …)` callback (footer setup). It does not import `instrument.ts` or `format.ts` directly.
- `extensions/jefferson/configuration.ts` — mixes **config loading** with **visuals/binding**: `readConfiguration`/`normalizeDocument`/`normalizeRow`/`cellsFromNames`/`readInstruments` (config) alongside `instrumentBindings`/`ConfiguredInstrument`/`BindInstrument`, which construct the `Instrument` render closures by calling `parseFormat`/`resolveFormat` (visuals). `Cell`/`Row` are its output types for the renderer.
- No other shipped file mixes responsibilities: `session-data-store.ts` is pure data/updates; `instrument.ts`, `format.ts`, `row-renderer.ts` are pure visuals/process flow.

### tests/

| File | Lines | Imports of source | Notes |
|---|---|---|---|
| `tests/jefferson.test.ts` | 618 | `../extensions/jefferson.ts` (`jefferson` default, `VERSION`); dynamic imports of `../extensions/jefferson/{row-renderer,configuration,instrument,session-data-store,format}.ts` (lines 298–312) | asserts exact exported key sets per module by path; header comment (lines 15–20) states the tests-never-beside-extensions rule |
| `tests/configuration.test.ts` | 889 | `../extensions/jefferson/row-renderer.ts` (`createFooter`), `../extensions/jefferson/configuration.ts` (`Cell`, `Configuration`, plus a multi-line import), `../extensions/jefferson/instrument.ts` (`DEFAULT_CELL_TEXT`), `../extensions/jefferson/session-data-store.ts` (type `Readings`) | writes temp `pi-jefferson.json` documents via `mkdtempSync`/`writeFileSync` |
| `tests/format.test.ts` | 392 | `../extensions/jefferson/format.ts`, `../extensions/jefferson/instrument.ts`, `../extensions/jefferson/row-renderer.ts`, type `Readings` from `../extensions/jefferson/session-data-store.ts` | |
| `tests/instrument.test.ts` | 223 | `../extensions/jefferson/instrument.ts`, type `Readings` from `../extensions/jefferson/session-data-store.ts`; dynamic imports of `format.ts`, `configuration.ts`, `row-renderer.ts`, `session-data-store.ts` (lines 49, 188–190) | |
| `tests/row-renderer.test.ts` | 420 | types `Row` from `configuration.ts`; `instrumentNamed`, `Instrument` from `instrument.ts`; `parseFormat`, `resolveFormat` from `format.ts`; `createFooter` etc. from `row-renderer.ts`; types from `session-data-store.ts` | declares the host's per-child framing once (`FRAME`/`composed()`/`visible()` helpers) |
| `tests/session-data-store.test.ts` | 312 | `createSessionDataStore`, types `Readings`, `SessionDataStore` from `../extensions/jefferson/session-data-store.ts` | |
| `tests/fake-theme.ts` | 31 | no source imports (host types + `@earendil-works/pi-tui` only) | test helper, not a test |

## 3. Feature path — coupling between data and visuals, and the `session_start` wiring

Types that cross the store/visuals boundary, and the direction each import runs:

- `Readings` (and `Reading`, `UsageTotals`) defined in `extensions/jefferson/session-data-store.ts` flow **to** the visuals, type-only: `instrument.ts` line 5 `import type { Readings } from "./session-data-store.ts"`; `row-renderer.ts` line 7 same; `format.ts` reaches it indirectly as `Parameters<Instrument["render"]>[0]` (line 10). No runtime value crosses; the store never imports a visual file.
- Host types cross **into** the store, type-only: `ContextUsage`, `SessionEntry` from `@earendil-works/pi-coding-agent` (session-data-store.ts line 2). The store receives host data through injected readers (`readUsage`, `readEntries`), never a host handle.
- `Cell`, `Row` defined in `configuration.ts` flow to `row-renderer.ts` (type-only, line 6).
- `Instrument`, `InstrumentDeclaration` defined in `instrument.ts` flow to `configuration.ts` (runtime values `blank`, `instrumentNamed`; lines 15) and to `format.ts` (type-only, line 11).
- Entry direction: `jefferson.ts` → `configuration.ts`, `row-renderer.ts`, `session-data-store.ts`. No file imports the entry; no cycles.

The entry wires store, configuration, and footer together at `session_start`, in this order (symbols in `extensions/jefferson.ts`, `jefferson(pi)`):

1. `pi.registerCommand("jefferson", …)` at factory time (lines 41–58) — reports `footerRows`.
2. `pi.on("session_start", …)` handler: early return unless `ctx.mode === "tui"` (line 60).
3. `releasePrevious?.()` — disposes the previous install (line 63).
4. `createSessionDataStore({ seed: { provider: ctx.model?.provider, model: ctx.model?.id, thinkingLevel: ctx.thinkingLevel, cwd: ctx.cwd }, requestRender: () => requestRepaint?.(), readUsage: () => ({ contextUsage: ctx.getContextUsage(), sessionId: ctx.sessionManager.getSessionId(), leafId: ctx.sessionManager.getLeafId() }), readEntries: () => ctx.sessionManager.getEntries() })` (lines 74–86) — the **store** is created first, seeded from the context.
5. Push subscriptions unwrapped at the entry: `pi.on("model_select", …) → store.modelSelected(provider, id)`, `pi.on("thinking_level_select", …) → store.thinkingLevelSelected(level)`, `pi.on("turn_end", …) → store.turnEnded()` (lines 89–93), released by the single `release()` together with `store.dispose()` (lines 97–104), retained as `releasePrevious`.
6. `readConfiguration({ agentPath: join(getAgentDir(), "pi-jefferson.json"), projectPath: join(ctx.cwd, CONFIG_DIR_NAME, "pi-jefferson.json"), projectTrusted: ctx.isProjectTrusted(), theme: ctx.ui.theme })` (lines 106–111) — **config loading**; `warning` → `ctx.ui.notify(warning, "warning")`; `footerRows = rows.length`.
7. `ctx.ui.setFooter((tui, theme) => { const footer = createFooter(rows, () => store.sample(), theme); requestRepaint = () => tui.requestRender(); return { render: (width) => footer.render(width), invalidate: () => footer.invalidate(), dispose: release }; })` (lines 115–123) — **footer setup**: the store is sampled per render via `() => store.sample()`, the repaint callback is captured from `tui`, and disposal is the same `release`.

## 4. Binding layout decisions already on record

Living specs (`openspec/specs/`):

- `extension-source-layout/spec.md` — requirements that constrain where files may live, what ships, and what discovery may reach (quoted names):
  - "One host-loaded entry per extension" — exactly one discoverable entry, default-exporting a factory; helper modules MUST NOT be discoverable.
  - "The load root is singular and stated" — exactly one mechanism (`extensions/` convention or `pi.extensions`), every other source directory outside discovery.
  - "Tests never occupy a loadable or shipped path" — tests MUST live under `tests/`, never in the tarball.
  - "Every shipped source file is typechecked and erasable" — must match `tsconfig.json` `include`; erasable TypeScript only; no build step.
  - "The published file set is deliberate" — tarball = `files` + mandatory files; CI asserts invariants (allowed roots, declared entry present, no `*.test.ts`, load root value), not an enumerated list; a move MUST update `files`, the manifest, and the CI expectation together.
  - "Responsibility is inferable from path" — modules named for what they own; no `utils`/`helpers`/`misc`/`common`; a grouping directory's membership and dependency rule MUST be stated by the change that adds it.
  - "Growth is a named change" — new top-level source directory, second entry, or new kind of module MUST be a named change updating `package.json`, `tsconfig.json`, and the CI expectation; an ordinary module MUST NOT require one.
  - "Host packages are the host's to supply, and imports run one way" — `peerDependencies` `*`, never `dependencies`; any shipped file may import a host package; entry → working parts only, no cycles.
- `statusline/spec.md` — constrains behavior and the footer tree ("The footer's tree is built once and reads the current render's sample"), cell geometry ("Cells are evenly distributed across the width"), instrument declarations ("An instrument is declared once…"), and the config document surface ("An instrument's configuration lives in the extension's own document" — `pi-jefferson.json`). Not path-constraining except via the layout spec's discovery rules.
- `session-data-store/spec.md` — constrains the store's datums, read semantics, invalidations, and disposal; not path-constraining.

Archived changes:

- `openspec/changes/archive/2026-11-02-code-structure/` — `design.md` settles the current shape: **D1** layout is `extensions/jefferson.ts` beside `extensions/jefferson/`, declared by `package.json` `pi.extensions: ["./extensions/jefferson.ts"]` (the `pi` field makes the host take the manifest branch, so `extensions/` is never auto-scanned and the working-parts directory is never enumerated); **D2** the load contract's human home is the entry's header comment; **D3** the CI tarball check asserts path invariants plus the manifest pin (`entry = "extensions/jefferson.ts"`, `loadRoot = ["./extensions/jefferson.ts"]`); **D4** `extensions/jefferson/` membership = every file is a working part of the one `jefferson` extension, entry not in it, filenames name a responsibility; **D5** one package = one extension; **D6** `files` and `tsconfig include` already cover the whole `extensions/` subtree. Its `specs/extension-source-layout/spec.md` is the delta that added these requirements (including the original "Host packages are imported only at the load boundary"). **No `owner-rulings.md` exists in this archive** (it has `proposal.md`, `council.md`, gates, `research-*.md`).
- `openspec/changes/archive/2026-11-04-extension-structure/` — `design.md` D1–D5: rows are an `HStack` of cell components, a cell owns only clip and pad, cross-cell ANSI state deleted, host imports ordinary, imports run one way; its spec delta **REMOVED** "Host packages are imported only at the load boundary" and **ADDED** "Host packages are the host's to supply, and imports run one way" (now living, and superseded-in-part by ADR 0001). **No `owner-rulings.md` exists in this archive either.**

## 5. Path-dependent surfaces a file move would touch

| Surface | Path + line/symbol naming the old path |
|---|---|
| Test imports (static) | `tests/configuration.test.ts:10-11,16-18`; `tests/format.test.ts:7-10`; `tests/instrument.test.ts:4-5`; `tests/jefferson.test.ts:11-12`; `tests/row-renderer.test.ts:6-9,12-16`; `tests/session-data-store.test.ts:6-7` — all `../extensions/jefferson.ts` or `../extensions/jefferson/<name>.ts` |
| Test imports (dynamic) | `tests/jefferson.test.ts:298,301,304,310-312`; `tests/instrument.test.ts:49,188-190` |
| Path-asserting test | `tests/jefferson.test.ts` "the exported surface offers no way to supply or replace cell content" (≈line 297) dynamically imports each exact module path and asserts `Object.keys` per path |
| `package.json` | `pi.extensions: ["./extensions/jefferson.ts"]` (lines 17–19); `files: ["extensions", "README.md", "LICENSE"]` (lines 13–17) |
| `tsconfig.json` | `include: ["extensions/**/*.ts", "tests/**/*.ts"]` |
| CI | `.github/workflows/ci.yml` comment line 34 ("Ordinary modules under extensions/jefferson/"); line 59 `p.startsWith("extensions/")`; line 61 `const entry = "extensions/jefferson.ts"`; line 62 `const loadRoot = ["./extensions/jefferson.ts"]` (read from the packed tarball's manifest). `release.yml` has no source-path reference (it runs `.github/scripts/next-version.mjs`, typecheck, test, publish) |
| Entry header | `extensions/jefferson.ts` lines 1–17 doc comment: names `"./extensions/jefferson.ts"`, `extensions/jefferson/`, and the `./jefferson/configuration.ts`-style import convention |
| `ARCHITECTURE.md` | the parts diagram lines 10–16 names `extensions/jefferson.ts` and all five `extensions/jefferson/*.ts` paths; line 19 "the only file the host loads" |
| `AGENTS.md` | line 20: `extensions/jefferson/instrument.ts` |
| `README.md` | lines 156–157: "Tests live in `tests/` … Pi loads every direct `.ts` file in `extensions/`" |
| Test header | `tests/jefferson.test.ts` lines 15–20: the same rule stated beside the file it governs |
| ADRs | `docs/adr/0001…0004` reference `row-renderer.ts`, `extensions/jefferson.ts` by name (0001 Consequences; 0004 Decision) and link relatively (`docs/adr/0004…` from README line ~180) |
| Living specs | `openspec/specs/extension-source-layout/spec.md` references the `extensions/` convention, `pi.extensions`, `tests/`, `tsconfig.json` `include`, `package.json` `files` (requirements "The load root is singular and stated", "Tests never occupy…", "Every shipped source file is typechecked and erasable", "The published file set is deliberate") |
| Archived changes | many artifacts under `openspec/changes/archive/**` name `extensions/jefferson.ts` and `extensions/jefferson/<module>.ts` (e.g. `2026-11-02-code-structure/design.md` D1–D6) — historical record, not load-bearing |
| `.pi/` | `.pi/settings.json` (provider/model only) and `.pi/remote-pi/config.json` (agent name/relay only) name no source path; `.pi/skills/` are the OpenSpec workflow skills, path-independent of `extensions/` |

## 6. The two small fixes riding inside this change

- **GitHub repository description** (read-only `gh repo view --json description`): `"A starship-style statusline for pi — modules, a real layout, and per-module formatting."` — the same string as `package.json` line 4 `description`. Both use "modules"/"per-module" in the **rejected instrument sense**.
- **Current `package.json` keywords**: `["pi", "statusline", "prompt"]` — missing `pi-package` per Joel's ruling quoted in `owner-rulings.md`.
- Occurrences of the rejected words "module"/"widget" in shipped files, README, ADRs and living specs (archived changes excluded; they are historical record and do contain many, e.g. in `research-chidi.md` quotes of Starship docs and gate text):
  - `package.json:4` — "modules, a real layout, and per-module formatting" → **instrument sense (rejected)**; the same string is the live GitHub repo description.
  - `openspec/specs/extension-source-layout/spec.md` lines 5, 84, 107, 117, 128 ("modules" = source/ES modules that may depend on host packages, CI edits per module, grouping modules) → **Node/ES-module sense (fine)**.
  - `.github/workflows/ci.yml:34` — "Ordinary modules under extensions/jefferson/" → source-module sense.
  - `docs/adr/0001-imports-run-one-way.md:9` — "only in the module the host loads as an entry" → source-file/module sense.
  - `docs/adr/0004-string-mutations-come-from-lodash-es.md:15,26` — "CommonJS module", "loads three modules" → Node/ES-module sense.
  - `README.md:160` — "bypasses pi's module mapping" → Node module-mapping sense.
  - `tsconfig.json:5` `"module": "nodenext"`, `package.json:7` `"type": "module"` → module-system sense.
  - "widget": **no occurrence** in any shipped file, README, ADR, or living spec — the only non-archive hit is the rejection statement itself in `openspec/changes/restructure-by-responsibility/owner-rulings.md:14`.

## 7. Test suite shape and command results

- Tests import source exclusively by relative path from `tests/` (`../extensions/jefferson.ts`, `../extensions/jefferson/<name>.ts`), statically and dynamically; `tests/fake-theme.ts` is the shared theme helper. One test asserts module paths/structure: `tests/jefferson.test.ts` "the exported surface offers no way to supply or replace cell content", which dynamically imports all six module paths and asserts each `Object.keys(...)` exactly (`["VERSION","default"]`, `["createFooter"]`, `["DEFAULT_CELLS","MAX_CELLS","readConfiguration"]`, plus a register/supply/contribute name scan over instrument/store/format). No test asserts a directory structure beyond that; `tests/jefferson.test.ts:15-20` states the tests-never-beside-extensions rule in prose.
- `pnpm typecheck` (`tsc --noEmit`): **passed**, exit 0, no diagnostics.
- `pnpm test` (`node --test`): **243 tests, 243 pass, 0 fail, 0 skipped**, duration ≈ 513 ms (suites 0).

## 8. Unknowns and missing material

- The brief names `owner-rulings.md` inside the two archived changes (`2026-11-02-code-structure`, `2026-11-04-extension-structure`); **neither archive contains one** — only `restructure-by-responsibility`, `2026-11-03-session-data-store`, `2026-11-04-cells-as-objects`, `2026-11-05-configurable-instruments`, `2026-11-06-default-thinking-instrument` and `2026-11-06-variable-modifiers` have `owner-rulings.md`. I read the archives' `design.md` and spec deltas instead.
- Whether any *other* pi tooling or docs outside this repo hardcode `extensions/jefferson.ts` (the 2026-11-02 design recorded this as unverified in its `council.md`); Chidi's lane.
- The GitHub repo description is set on GitHub, not in any repo file; the only in-repo copy of the same string is `package.json` `description`.
- pi's own loading/discovery behavior was taken from the archived designs' measurements, not re-measured here (and reading pi's installed package source is Chidi's lane, explicitly out of scope for this seat).

## 9. Questions for the invoker

- Should the archived changes' many "module" occurrences (gate/council/research text quoting Starship docs and the old entry-only rule) count as violations of the 2026-11-03 vocabulary ruling, or does the ruling bind only living specs, designs, code and the shipped surface?
- Does the boyscout fix for the repo description mean changing only the GitHub setting (outside this repo), only `package.json` `description`, or both to the same new string?
- Is `keywords` meant to become exactly `["pi", "statusline", "prompt", "pi-package"]`, and in what order?

## Addendum 1 — seams of the entry and configuration

(Addendum 1 to `research-eleanor.md` for `restructure-by-responsibility`; tree at HEAD of branch
`restructure-by-responsibility`, commit `3b364b6`. Codebase facts with file:line citations only —
no layout proposals, no design judgment.)

## 1. `VERSION` in `extensions/jefferson.ts` — who reads it

- Defined at `extensions/jefferson.ts:35`: `export const VERSION = "0.0.0-alpha";`.
- The `/jefferson` handler (`extensions/jefferson.ts:49-60`) deliberately does **not** read it; the
  comment at lines 50-51 says it is not printed because it disagrees with `package.json` (`0.1.1`).
- Nothing reachable from `/jefferson` or `session_start` reads it: the `session_start` handler
  (lines 63-129) never references it, and no other shipped file names it (grep over `extensions/`,
  `docs/`, README, ARCHITECTURE, AGENTS, living specs: only `jefferson.ts:35,50`).
- The only reader anywhere is the test suite: `tests/jefferson.test.ts:12` imports it
  (`import jefferson, { VERSION } from "../extensions/jefferson.ts"`), asserts its value at line 215
  (`assert.equal(VERSION, "0.0.0-alpha")`, with the comment at 214 that the command message must not
  print it), and asserts its presence in the export surface at line 299
  (`Object.keys(entry).sort()` = `["VERSION", "default"]`).

## 2. Closure state inside `jefferson(pi)` (`extensions/jefferson.ts:37-130`)

Variables declared in the `jefferson(pi)` closure and its two handlers:

| Variable | Declared | Read/written by `/jefferson` handler (49-60) | Read/written by `session_start` handler (63-129) | Read/written by `setFooter` factory (120-128) |
|---|---|---|---|---|
| `releasePrevious: (() => void) \| undefined` | line 41 (outer closure) | no | read line 66 (`releasePrevious?.()`), written line 109 (`releasePrevious = release`) | no |
| `footerRows: number \| undefined` | line 45 (outer closure) | **read** lines 53-57 (the notify text) | written line 119 (`footerRows = rows.length`) | no |
| `requestRepaint: (() => void) \| undefined` | line 70 (inside `session_start`) | no | read indirectly line 80 — the store's `requestRender: () => requestRepaint?.()` closure | **written** line 122 (`requestRepaint = () => tui.requestRender()`) |
| `released: boolean` | line 100 (inside `session_start`) | no | read/written lines 102-103 inside `release` | `release` is returned as the footer's `dispose` (line 126), so the host's `dispose()` runs it |
| `release: () => void` | lines 101-108 (inside `session_start`) | no | defined here; assigned to `releasePrevious` line 109 | exposed as `dispose: release` line 126 |
| `store` | line 73 (inside `session_start`) | no | created here; its methods are the `pi.on` push targets lines 90-96; `store.dispose()` line 107 | **read** line 121 (`() => store.sample()`) |
| `releaseModel` / `releaseThinking` / `releaseTurn` | lines 90, 93, 96 | no | called inside `release` lines 104-106 | no |
| `rows` / `warning` | line 111 | no | `warning` notified line 117 | `rows` **read** line 121 (`createFooter(rows, …)`) |

`setFooter` factory timing: the entry's own comment (lines 68-69) records that the host invokes the
factory synchronously inside `setFooter(...)`, before any push can arrive. The tests' fake agrees:
`tests/jefferson.test.ts:134-138` — the fake `ctx.ui.setFooter` pushes `setFooter#n` to the log and
calls `factory(tui, fakeTheme())` (line 137) synchronously within the `setFooter` call, before
`harness.start()` awaits the `session_start` handler (line 146).

## 3. Seams in `extensions/jefferson/configuration.ts`

- `BindInstrument` — type alias, `configuration.ts:67`:
  `(declaration: InstrumentDeclaration) => Instrument`. Types from `./instrument.ts` (import line 14).
- `ConfiguredInstrument` — interface, `configuration.ts:69-73`:
  `{ segments: FormatSegment[]; style: ThemeStyle; label?: string }`. `FormatSegment` from
  `./format.ts` (import line 15), `ThemeStyle` from `@earendil-works/pi-coding-agent` (line 12).
- `instrumentBindings` — function, `configuration.ts:75`:
  `(configured: ReadonlyMap<string, ConfiguredInstrument> = new Map()): BindInstrument`. It uses
  `parseFormat`, `resolveFormat`, `collapse`, `FormatSegment` (all `./format.ts`, line 15) and the
  two instrument types (line 14). **None of the three uses anything defined in `configuration.ts`
  itself** — no `Cell`, `Row`, `CellAlign`, `Notices`, or `RejectedConfiguration` — so if they sat in
  another file they would need no import from `configuration.ts`.
- `readInstruments(raw, theme, notices)` (`configuration.ts:95`) returns
  `ReadonlyMap<string, ConfiguredInstrument>` (line 140). It is called once, at `configuration.ts:256`
  inside `normalizeDocument`: `instrumentBindings(readInstruments(doc.instruments, theme, notices))`,
  so `readInstruments` hands `instrumentBindings` the per-name configured `{segments, style, label}`
  map; `instrumentBindings` returns the `BindInstrument` closure that memoizes one bound `Instrument`
  per name (lines 76-92), building its `render` from `resolveFormat` (line 87).
- Bad format/style path: `parseFormat` throws at line 122, is caught at 123-126 and rethrown as
  `RejectedConfiguration(error.message)`; `validateStyle` throws at line 133, caught at 134-137 and
  rethrown as ``RejectedConfiguration(`instrument ${name} ${error.message}`)``. Unknown option keys
  throw directly at line 113; non-object `instruments`/entry at 99/103; non-string `format` at 118;
  non-string `label` at 129. An unknown instrument *name* does not throw — it is collected into
  `notices.unknownInstruments` (line 107) and becomes an accepted-document warning via
  `acceptedWarning` (lines 271-…). Every `RejectedConfiguration` propagates through
  `normalizeDocument` (called at line 310) to the catch in `readConfiguration` at lines 315-321,
  which returns `{ rows: [defaultRow(bind)], warning: "pi-jefferson: <path> was rejected (<msg>); rendering the default row" }`
  — whole-document rejection, default row, warning naming the offender. Unparseable JSON is a
  separate earlier catch (lines 299-306).

## 4. Tests that drive the default export through `session_start` with a fake `pi`/`ctx`

All in `tests/jefferson.test.ts`. Harness: `harness()` lines 75-156 — fake `pi` lines 83-95
(`registerCommand` line 84, `on` lines 85-93 returning an unsubscribe that logs
`unsubscribe:<event>`), fake `ctx` lines 116-140, `start()` lines 100-149 which builds the ctx and
invokes the registered `session_start` handler at line 146. Path helpers: `useTempAgentDir`
lines 171-180 (sets `PI_CODING_AGENT_DIR` to a temp dir, which is how `getAgentDir()` resolves the
agent path), `writeAgentDocument` lines 182-184 (`<agentDir>/pi-jefferson.json`),
`writeProjectDocument` lines 186-190 (`<cwd>/<CONFIG_DIR_NAME>/pi-jefferson.json`).

- Config paths read: "a trusted project's document wins end to end" (253-262, project document in
  cwd with `trusted: true`), "an untrusted project's document is ignored end to end" (328-337,
  `trusted: false` → agent document's one row renders).
- `notify` warnings: "a rejected configuration warns and still installs the default row"
  (264-279: `notified.length === 1`, `type === "warning"`, default row of ten 8-column cells
  renders), "a rejected style warns with its exact envelope and installs the default footer"
  (533-541: exact message `pi-jefferson: <agentDir>/pi-jefferson.json was rejected (instrument "model" has an fg …: "nope"); rendering the default row`).
- `setFooter`: "the session_start handler installs the footer in TUI mode" (231-236,
  `footers.length === 1`, no notifications), "…does not install a footer outside TUI mode"
  (238-242, mode `print` → 0 footers), "the footer is re-installed on every session_start"
  (244-251, reasons `startup` then `reload`).
- `/jefferson` output: "registers exactly one command" (166-168), "the jefferson command reports
  the installed footer and how many rows it renders" (192-216: `1 row.` / `3 rows.` messages, and
  line 215 that `VERSION` is not printed), "outside TUI mode the jefferson command reports that no
  footer is installed" (218-229).
- Release on reload / second `session_start`: "a second session_start releases the first install
  before installing its own" (436-472: first install's three unsubscribes each fired exactly once,
  log order `setFooter#1`, `unsubscribe:model_select`, `unsubscribe:thinking_level_select`,
  `unsubscribe:turn_end`, `setFooter#2`; repaints land on the second tui only), "disposing a footer
  then replacing the session releases the first install once" (474-517: `first.footers[0].dispose()`
  at line 484, unsubscribe counts stay `[1,1,1]` across both callers — the `released` flag at
  `extensions/jefferson.ts:100-103` makes `release` idempotent).
- Related: subscription counts (358-372), push/repaint behavior (374-435), turn-boundary/disposal
  tests (543-611).

Type imports from `configuration.ts`:
- `tests/configuration.test.ts:11` — `import type { Cell, Configuration } from "../extensions/jefferson/configuration.ts"`.
- `tests/row-renderer.test.ts:6` — `import type { Row } from "../extensions/jefferson/configuration.ts"`.
- `CellAlign` is imported by **no** shipped file and no test; it is used only inside
  `configuration.ts` (lines 19, 22, 29, 184).
- `FormatSegment` is imported from `configuration.ts` by nobody (see §5).
- `DEFAULT_CELLS` / `MAX_CELLS` consumers: only tests — `tests/configuration.test.ts:13-14` (import),
  110, 244-245 (`=== 10`), 251, 265; plus the export-surface assertion `tests/jefferson.test.ts:307`
  (`["DEFAULT_CELLS", "MAX_CELLS", "readConfiguration"]`). No shipped file outside `configuration.ts`
  reads them.

## 5. Does anything import `FormatSegment` via `configuration.ts`?

No. `FormatSegment` is defined and exported only in `extensions/jefferson/format.ts`. `configuration.ts`
imports it from `./format.ts` (line 15) for its own use (lines 70, 84, 120) but does not re-export it —
`configuration.ts`'s export surface is `CellAlign`, `Cell`, `Row`, `ConfigurationSource`,
`Configuration`, `DEFAULT_CELLS`, `MAX_CELLS`, `readConfiguration`. Grep across `extensions/` and
`tests/`: the only files naming `FormatSegment` are `format.ts` and `configuration.ts` itself; every
test that uses format symbols imports them directly from `../extensions/jefferson/format.ts`
(`tests/format.test.ts:7`, `tests/row-renderer.test.ts:8`).

## Addendum 2 — mutation runs for restructure-by-responsibility

Method: scratch copy at `/tmp/pi-jefferson-mutations` (`rsync -a --exclude .git --exclude
node_modules`, `node_modules` symlinked from the repo), baseline `node --test` = 243 pass / 0 fail,
one mutation at a time, pristine files restored between mutations, scratch copy removed afterwards.
The repository was not mutated. Test names + file:line + first failure line only.

## M1 — `releasePrevious = release` moved after `readConfiguration`

- The move itself: **none stays green** — full suite 243 pass / 0 fail.
- Smallest mutation near that line that DOES go red: **`releasePrevious` never assigned**
  (delete `extensions/jefferson.ts:109`). Red, 5 tests, all in `tests/jefferson.test.ts`:
  - `tests/jefferson.test.ts:436` "a second session_start releases the first install before
    installing its own" — first line `AssertionError [ERR_ASSERTION]: each of the first install's
    three unsubscribes fired exactly once`.
  - `tests/jefferson.test.ts:591` "a {new,resume,fork,reload} replacement drops the old cwd, model,
    totals and captured readers" (4 tests, loop at 591) — first line `AssertionError
    [ERR_ASSERTION]: Expected values to be strictly equal:`.
- Variant "assigned only inside the `setFooter` factory": green (34/34 in jefferson.test.ts) —
  every TUI-mode test calls `setFooter`, so the assignment still happens.
- Can `readConfiguration` throw in any existing test? **No.** It catches JSON/IO errors
  (`configuration.ts:299-306`) and every `RejectedConfiguration` (`:315-321`); only a
  non-`RejectedConfiguration` error rethrows (`:322`), and no existing test produces one.

## M2 — drop `releaseThinking()` from `release` (`extensions/jefferson.ts:105`)

2 red, both in `tests/jefferson.test.ts`:
- `:436` "a second session_start releases the first install before installing its own" —
  `AssertionError [ERR_ASSERTION]: each of the first install's three unsubscribes fired exactly once`
- `:474` "disposing a footer then replacing the session releases the first install once" —
  `AssertionError [ERR_ASSERTION]: each unsubscribe fired exactly once in total, across both callers`

## M3 — remove the `released` idempotence flag (`:100-103`)

1 red: `tests/jefferson.test.ts:474` "disposing a footer then replacing the session releases the
first install once" — `AssertionError [ERR_ASSERTION]: each unsubscribe fired exactly once in
total, across both callers`

## M4 — project path without `CONFIG_DIR_NAME` (`:113` → `join(ctx.cwd, "pi-jefferson.json")`)

1 red: `tests/jefferson.test.ts:253` "a trusted project's document wins end to end" —
`AssertionError [ERR_ASSERTION]: the project's two rows render`

## M5 — never assign `requestRepaint` in the `setFooter` factory (`:122`)

6 red, all in `tests/jefferson.test.ts`: `:374` "a model selection push changes the line and
requests one repaint", `:389` "a thinking-level push changes the line and requests one repaint",
`:404` "the thinking cell follows the host through the label path", `:436` "a second session_start
releases the first install before installing its own" (first line `AssertionError [ERR_ASSERTION]:
the repaint lands on the second tui`), `:474` "disposing a footer then replacing the session
releases the first install once", `:558` "a dispatched turn boundary repaints only changed totals
and its scan is reused by the footer". First lines are `AssertionError [ERR_ASSERTION]: Expected
values to be strictly equal:` except :436 above.

## M6 — store wiring in `extensions/jefferson.ts:73-87`

- **Drop `readEntries`** (`:86`): 18 red, all in `tests/jefferson.test.ts`: `:281` "a right-aligned
  cell ends at its cell's right edge end to end", `:340` "a {startup,new,resume,fork,reload} session
  renders the model and thinking level it was seeded with" (5), `:374` model push, `:389` thinking
  push, `:404` label path, `:420` "a push carrying the values the store already holds requests no
  repaint", `:436` second session_start, `:519` "configured formats, styles and a width-taking bar
  render end to end", `:558` dispatched turn boundary, `:578` "an unchanged turn boundary before the
  first render leaves the install-time cache filled without repainting", `:591` "a
  {new,resume,fork,reload} replacement drops the old cwd, model, totals and captured readers" (4).
- **`readUsage` returns empty `sessionId`**: **none stays green** — full suite 243/243. (The
  `(sessionId, leafId)` keying is exercised at store level in `tests/session-data-store.test.ts`
  with its own options, not through the entry; through the entry the fake's `leafId` still moves.)
- **Drop `cwd` from the seed** (`:78`): 4 red — `tests/jefferson.test.ts:591` "a {new,resume,fork,
  reload} replacement drops the old cwd, model, totals and captured readers" — first line
  `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:`.

## M7 — remove the `ctx.mode !== "tui"` guard (`:64`)

3 red, all in `tests/jefferson.test.ts`: `:218` "outside TUI mode the jefferson command reports that
no footer is installed" (`AssertionError [ERR_ASSERTION]: Expected values to be strictly
deep-equal:`), `:238` "the session_start handler does not install a footer outside TUI mode"
(`Expected values to be strictly equal:`), `:368` "outside TUI mode a session takes no subscription"
(`Expected values to be strictly deep-equal:`).

## M8 — `dispose: () => {}` instead of `dispose: release` (`:126`)

2 red, both in `tests/jefferson.test.ts`: `:474` "disposing a footer then replacing the session
releases the first install once" — first line `AssertionError [ERR_ASSERTION]: a disposed footer
requests no repaint`; `:543` "a turn boundary after disposal repaints nothing and calls no captured
reader" — first line `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:`
(the `assert.deepEqual(session.reads, before)` at `:551`).

## M9 — `ALIGNMENTS` hardcoded without `"right"` (`configuration.ts:18`)

4 red: `tests/configuration.test.ts:194` "a cell that declares no align normalizes to left"
(`Expected values to be strictly equal:`), `tests/configuration.test.ts:440` "every cell carries an
instrument and an alignment" (`Expected values to be strictly deep-equal:`),
`tests/configuration.test.ts:817` "right-aligned styled cells lead with unstyled pad and exact-fill
cells add no reset" (`Expected values to be strictly equal:`), `tests/jefferson.test.ts:281`
"a right-aligned cell ends at its cell's right edge end to end" (`Expected values to be strictly
equal:`).

## M10 — `instrumentBindings` binds `declaration.defaultFormat` instead of calling `resolveFormat`
(`configuration.ts:87`)

51 red across the suite (243 → 192 pass), spanning `tests/configuration.test.ts`,
`tests/format.test.ts`, `tests/instrument.test.ts`, `tests/row-renderer.test.ts` and
`tests/jefferson.test.ts` — including "a configured label is placed in front of a configured format
and a default format", "an unknown datum suppresses the whole cell, label included", "a model
selection push changes the line and requests one repaint" (jefferson.test.ts:374), "configured
formats, styles and a width-taking bar render end to end" (:519), and the seeded-session loop
(:340). I.e. the bound-render seam is what separates right code from wrong code for the whole
visual layer.

## Requested test inventory (`tests/jefferson.test.ts`)

- Push and repaint tests, lines 358-435: `:358` "in TUI mode a session takes exactly the three
  subscriptions it names" (358-366), `:368` "outside TUI mode a session takes no subscription"
  (368-372), `:374` "a model selection push changes the line and requests one repaint" (374-387;
  dispatches `model_select` at 383, asserts new line at 385 and `repaints() === 1` at 386), `:389`
  "a thinking-level push changes the line and requests one repaint" (389-402; `thinking_level_select`
  at 398, `Thinking: Low` at 400, `repaints() === 1` at 401), `:404` "the thinking cell follows the
  host through the label path" (404-418; repeated same level asserts no extra repaint at 414),
  `:420` "a push carrying the values the store already holds requests no repaint" (420-434;
  `repaints() === 0` at 432).
- "N rows" after one `session_start`: `:192` "the jefferson command reports the installed footer and
  how many rows it renders" (192-216; asserts `…installed, 1 row.` at 207-209 and `…3 rows.` at
  210-212).
- Push reaching the next render: `:374` (`model_select`), `:389` (`thinking_level_select`), and
  for `turn_end` `:558` "a dispatched turn boundary repaints only changed totals and its scan is
  reused by the footer" (558-577; dispatches `turn_end` at 566, asserts `repaints() === 1` at 567
  and the new totals on the next line at 568), plus `:543` and `:578` for disposal/unchanged cases.
