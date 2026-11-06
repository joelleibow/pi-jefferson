# Eleanor research — 2026-11-06-default-thinking-instrument

Reconnaissance of the existing pi-jefferson worktree for the `2026-11-06-default-thinking-instrument`
change: a cross-cutting `label` option on every instrument, the default `thinking` instrument
(`Thinking: ` label, `$level|capitalize` default format), and a `$level` color that matches the
thinking horizontal rules on pi's input box. Every finding cites a path and symbol. Nothing was
edited.

Repo state note: checkout is branch `worktree/calm-forest-5599` at `152cfe3` ("Configure
instruments, formats and styles (#9)"), clean except the untracked change directory
`openspec/changes/2026-11-06-default-thinking-instrument/`, which holds exactly
`owner-rulings.md` and `.openspec.yaml` (`schema: marbleization`,
`x-marbleization.working_dir_state: existing_project`, `runs.michael: db2928cd-…`). No research,
proposal, specs, council, design, or tasks artifact exists yet in this change directory. The visual
reference `/tmp/pi-jefferson-current-thinking-bar.png` was viewed (Joel's current bar: a `🤔 high`
line under a colored HR) but **no token or color name was inferred from it**; all token names below
come from installed pi source only.

## 1. Required reads

- `AGENTS.md` — read in full. No `CLAUDE.md` exists. Key facts: `pnpm typecheck` / `pnpm test`
  (`node --test`, source executed directly, erasable TypeScript only, `.ts` import extensions, no
  build step); "Adding an instrument" recipe (one declaration in `extensions/jefferson/instrument.ts`
  + the shipped table so `instrumentNamed` resolves it; resolvers return already-formatted strings;
  bound render seam `(readings, width, theme) => string`); the two traps (reset before an open-SGR
  pad; measure with `visibleWidth`, clip with `truncateToWidth`); decisions live in
  `openspec/changes/<name>/design.md`, long-lived reasons in `docs/adr/`.
- `ARCHITECTURE.md` — read in full. Parts and import direction: entry `extensions/jefferson.ts` →
  `configuration.ts`, `instrument.ts`, `format.ts`, `session-data-store.ts`, `row-renderer.ts`;
  working parts never import the entry; no cycles; host packages are `peerDependencies` `*` (ADR
  0001). Store/Configuration/Instrument/Row-renderer responsibilities as implemented (see §3).
- ADRs — `docs/adr/` holds exactly two; both read:
  - `docs/adr/0001-imports-run-one-way.md` — "1. Imports run one way; host packages are the host's
    to supply" (2026-11-03, Accepted). Any shipped file may import `@earendil-works/*` at runtime;
    host packages stay peerDependencies, never dependencies.
  - `docs/adr/0002-rows-span-the-full-width.md` — "2. Rows span the full width" (2026-11-05,
    Accepted). Cells get `basis: floor(W/N)`, `grow: 1`, `shrink: 0`, `gap: 0`; tree built once,
    re-seated via `clear()`/`addChild` on width change.
- Language/build config — `package.json` (read): name `pi-jefferson` `0.1.1`, `"type": "module"`,
  `packageManager: pnpm@12.17.0`, scripts `test: node --test`, `typecheck: tsc --noEmit`,
  `pi.extensions: ["./extensions/jefferson.ts"]` (the only host-loaded entry), `files:
  ["extensions","README.md","LICENSE"]`, peerDeps `@earendil-works/pi-coding-agent: *`,
  `@earendil-works/pi-tui: *`, devDeps `^1.4.0` of both. `tsconfig.json` (read): ES2023, nodenext,
  strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` +
  `verbatimModuleSyntax` + `allowImportingTsExtensions`, `noEmit`, `include:
  ["extensions/**/*.ts", "tests/**/*.ts"]`. `pnpm-workspace.yaml` (read): `allowBuilds` denials
  for `@google/genai` and `protobufjs` only. `openspec/config.yaml` (read): `schema: spec-driven`,
  no custom rules.

## 2. Structure map (as it actually exists)

- `extensions/jefferson.ts` — the entry (default-exports `jefferson(pi: ExtensionAPI)`, exports
  `VERSION = "0.0.0-alpha"`). Registers `/jefferson`; on `session_start` in TUI mode: disposes the
  previous install, seeds `createSessionDataStore({ seed: { provider: ctx.model?.provider,
  model: ctx.model?.id, thinkingLevel: ctx.thinkingLevel, cwd: ctx.cwd }, requestRender, readUsage:
  () => ({ contextUsage: ctx.getContextUsage(), sessionId: ctx.sessionManager.getSessionId(),
  leafId: ctx.sessionManager.getLeafId() }), readEntries: () => ctx.sessionManager.getEntries() })`,
  subscribes `model_select` → `store.modelSelected`, `thinking_level_select` →
  `store.thinkingLevelSelected(event.level)`, `turn_end` → `store.turnEnded()`, reads config via
  `readConfiguration({ agentPath: join(getAgentDir(), "pi-jefferson.json"), projectPath:
  join(ctx.cwd, CONFIG_DIR_NAME, "pi-jefferson.json"), projectTrusted: ctx.isProjectTrusted(),
  theme: ctx.ui.theme })`, notifies `warning`, installs the footer via `ctx.ui.setFooter((tui, theme)
  => …)` returning `{ render, invalidate, dispose: release }` with `requestRepaint =
  () => tui.requestRender()`.
- `extensions/jefferson/instrument.ts` — `Instrument` (`render(readings, width, theme)`),
  `InstrumentDeclaration` (`name`, `variables`, `bar?`, `defaultFormat`, `options`),
  `DEFAULT_CELL_TEXT`, `FOUNDATIONAL_OPTIONS = Object.freeze(["format","style"])`, declarations
  `blank`, `model`, `thinking` (variables `{ level: r => r.thinkingLevel }`, defaultFormat
  `"thinking: $level"`), `path`, `context` (with `bar`), `tokens`, `cost`; `SHIPPED` table;
  `instrumentNamed(name)`.
- `extensions/jefferson/format.ts` — the format-and-style language: `parseFormat` (variable names
  match `/^[A-Za-z0-9_]+/` after `$`; `\$` escape; `$bar` special), `validateStyle` (fg/bg tokens
  checked against the live theme via `theme.getFgAnsi`/`getBgAnsi`, concrete colors via
  `parseColor`), `resolveFormat` (any variable `undefined` → whole render `""`; segments styled
  via `theme.style`; `$bar` thresholds `WARNING_PERCENT = 70`, `ERROR_PERCENT = 90`).
- `extensions/jefferson/configuration.ts` — `readConfiguration(source)`, `Configuration`, `Row`,
  `Cell { instrument, align }`, `CellAlign`, `DEFAULT_CELLS = 10`, `MAX_CELLS = 10`,
  `ALIGNMENTS = ["left","right","center"]`, `RejectedConfiguration`, `instrumentBindings()`
  (per-name bound `Instrument` cached; `render: (readings, width, renderTheme) =>
  resolveFormat(declaration, segments, style, readings, width, renderTheme)`),
  `readInstruments()` (rejects any key not in `declaration.options` — the option whitelist a
  `label` option must join), `cellsFromNames`, `normalizeRow`, `normalizeDocument`,
  `acceptedWarning`, whole-document rejection semantics (default row + warning).
- `extensions/jefferson/session-data-store.ts` — `Reading = string | undefined` (undefined is
  unknown, never ""/0/stale), `Readings` (provider, model, thinkingLevel, cwd, contextUsage,
  totals), `SessionDataStore`, `createSessionDataStore`, `scanTotals`. `thinkingLevelSelected`
  replaces the value and requests one repaint only on change.
- `extensions/jefferson/row-renderer.ts` — `createFooter(rows, sampleReadings, theme)`,
  `cellView` per cell (memo by `(sample, width)`, `truncateToWidth` clip, `visibleWidth` pad,
  `RESET = "\x1b[0m"` before a trailing pad when `leavesStyleOpen`), `VStack` of `HStack`s,
  re-seat on width change.
- `tests/` — `configuration.test.ts`, `format.test.ts`, `instrument.test.ts`,
  `jefferson.test.ts`, `row-renderer.test.ts`, `session-data-store.test.ts`, `fake-theme.ts`
  (slot-aware fake: `getFgAnsi`/`getBgAnsi` throw on unknown tokens; tokens `accent`/`warning`/
  `error` fg, `selectedBg` bg). Tests live only under `tests/`.
- Living specs — `openspec/specs/statusline/spec.md`, `openspec/specs/session-data-store/spec.md`,
  `openspec/specs/extension-source-layout/spec.md`. Archived changes under
  `openspec/changes/archive/` (five prior changes, each with its own `research-eleanor.md` — the
  template this report follows). CI: `.github/workflows/ci.yml`, `release.yml`,
  `.github/scripts/next-version.mjs`.
- `README.md` — the configuration table (instrument → variables → default format; `thinking`
  row: `$level` / `thinking: $level`) and the `format`/`style` prose.

## 3. Feature path — where each target of this change lands

### 3.1 `label` option on every instrument, always prepended to format (incl. default)

- `extensions/jefferson/instrument.ts`: `InstrumentDeclaration.options` + `FOUNDATIONAL_OPTIONS`
  (currently `Object.freeze(["format", "style"])`) — this is the single option list every
  declaration shares; adding `"label"` here (or per-declaration) is the declaration-side change.
  A default label per declaration would live beside `defaultFormat`.
- `extensions/jefferson/configuration.ts`: `readInstruments()` enforces the whitelist
  (`if (!declaration.options.includes(key)) throw new RejectedConfiguration(…)`), validates
  `format` is a string, parses it, validates `style`; `ConfiguredInstrument { segments, style }`
  and `instrumentBindings()` build the bound `Instrument` whose `render` calls
  `resolveFormat(declaration, segments, style, readings, width, renderTheme)` — the label
  prepend belongs at this seam (configured value or declaration default), not in the cell.
- `extensions/jefferson/format.ts`: `resolveFormat` produces the styled text; the label would be
  prepended here or in the binding, and its styling relative to the instrument `style` is an open
  design point (see §7).
- Tests that pin the current shape: `tests/instrument.test.ts` asserts
  `declaration.options` deep-equals `["format", "style"]` and is frozen; `tests/configuration.test.ts`
  asserts rejection of any option key the declaration lacks. README's per-instrument options
  prose would move.

### 3.2 `thinking` instrument: default label `Thinking: `, default format `$level|capitalize`

- `extensions/jefferson/instrument.ts`: the `thinking` declaration — today
  `defaultFormat: "thinking: $level"`, `variables: { level: r => r.thinkingLevel }`,
  `options: FOUNDATIONAL_OPTIONS`. The ruling's default format is `$level|capitalize` with the
  label supplied by the `label` option (default `Thinking: `); the current lowercase `thinking: `
  literal moves out of `defaultFormat` into the default label.
- `tests/instrument.test.ts`: `shapes` table entry `["thinking", ["level"], "thinking: $level"]`,
  `"model and thinking default formats keep their original text shapes"`,
  `"unknown thinking renders nothing and never invents off"`.
- `README.md` table row for `thinking`; `openspec/specs/statusline/spec.md` requirement
  "The thinking instrument" (default format `thinking: $level` renders today's text; renders
  nothing when the level is unknown).

### 3.3 `$level` color matching the input-box thinking HRs — host mechanism (installed pi source only)

Host: `@earendil-works/pi-coding-agent` 1.5.0 installed at
`/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent`.

- The thinking-HR color mechanism is `Theme.getThinkingBorderColor(level)`:
  `dist/modes/interactive/theme/theme.d.ts:81` —
  `getThinkingBorderColor(level: ThinkingLevel): (str: string) => string` — implemented at
  `dist/modes/interactive/theme/theme.js:244-263`, mapping level → foreground token:
  `off→thinkingOff`, `minimal→thinkingMinimal`, `low→thinkingLow`, `medium→thinkingMedium`,
  `high→thinkingHigh`, `xhigh→thinkingXhigh`, `max→thinkingMax`, anything else → `thinkingOff`,
  each as `(str) => this.fg("thinkingX", str)`.
- Tokens (all foreground slot): `dist/modes/interactive/theme/theme-tokens.d.ts:205-232` —
  `thinkingOff`, `thinkingMinimal`, `thinkingLow`, `thinkingMedium`, `thinkingHigh`,
  `thinkingXhigh`, `thinkingMax` (description "Thinking level border: max (falls back to
  thinkingXhigh when omitted)", `fallback: "thinkingXhigh"`); plus `thinkingText` (line 49, the
  thinking-block text color, distinct from the border tokens). Concrete values in
  `dist/modes/interactive/theme/dark.json:64-70` / `light.json`.
- Where the input box uses it: `dist/modes/interactive/interactive-mode.js` —
  `updateEditorBorderColor()` (~line 3760-3768) sets `this.editor.borderColor =
  theme.getThinkingBorderColor(this.session.thinkingLevel || "off")` (bash mode uses
  `getBashModeBorderColor()`); also used for the embedded working-status color at lines 1902, 3033,
  3125. `dist/modes/interactive/components/custom-editor.js:42-54` draws the editor's top/bottom
  `─` HR lines through `this.borderColor(…)` — these are the "thinking HRs on the input box".
- The `Theme` the extension already receives is the same class: exported from the package root
  (`dist/index.d.ts:38`: `export { …, Theme, … } from "./modes/interactive/theme/theme.ts"`), and
  the extension's render seam gets `theme: Theme` from `ctx.ui.theme` / the `setFooter` factory —
  so `theme.getThinkingBorderColor(level)` is callable from `resolveFormat`'s seam, and the
  `thinking*` tokens are valid foreground tokens for `theme.getFgAnsi`/`theme.style` (which is what
  `validateStyle` in `format.ts` checks against the live theme).
- Level type and delivery: `ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" |
  "xhigh" | "max"` (`node_modules/@earendil-works/pi-agent-core/dist/types.d.ts:300`);
  extension-side `ctx.thinkingLevel?: ThinkingLevel`
  (`dist/core/extensions/types.d.ts:253`) and the `thinking_level_select` event
  `{ type, level: ThinkingLevel, previousLevel }` (`types.d.ts:911-914`, handler registration
  `types.d.ts:1246`). The store already carries `thinkingLevel` and repaints on change
  (`session-data-store.ts` `thinkingLevelSelected`; entry subscribes in `jefferson.ts`).
- Implication for the extension: a per-level color at render time must key off the level reading
  (`readings.thinkingLevel`) and go through `theme.getThinkingBorderColor(level)` (or the
  equivalent `fg` token), not a static configured `style.fg`. Note the host's own default:
  an unrecognized level maps to `thinkingOff` — but the extension's unknown level is `undefined`,
  and the living spec says the cell renders nothing then (see §3.4), so the color path is only
  reached for a known level.

### 3.4 Unknown / off / unavailable level behavior (already in the living specs)

- `openspec/specs/statusline/spec.md`, requirement "The thinking instrument": the cell "MUST be
  nothing when the level is unknown — not a fallback the host did not report"; scenario "A level
  the host has not supplied" → renders nothing, does not claim a level the host never reported.
- `openspec/specs/session-data-store/spec.md`: "Unknown is a distinguished value" — `undefined`,
  never `""`, zero, or stale; post-dispose reads are all-unknown.
- Implemented at `format.ts` `resolveFormat`: any declared variable resolving to `undefined`
  returns `""` for the whole instrument. Pinned by `tests/instrument.test.ts`
  "unknown thinking renders nothing and never invents off" (`thinkingLevel: undefined` → `""`).
  `"off"` is a real, reportable level (renders `thinking: off` today; host colors it
  `thinkingOff`).

### 3.5 String modifiers (`$level|capitalize`) — the other conductor's feature, absent here

- In this worktree the format language has **no modifier syntax**: `parseFormat`
  (`format.ts`) consumes a variable name as `/^[A-Za-z0-9_]+/` after `$`, so `$level|capitalize`
  currently parses as `$level` followed by the literal text `|capitalize` (renders
  e.g. `high|capitalize`). No `|` handling, no `capitalize`, no modifier pipeline exists anywhere
  in `extensions/` or `tests/`.
- Per `owner-rulings.md` (2026-11-06, "Default composition") the modifier feature is assumed
  functional and its tests will come from the other conductor's change; it is recorded here as a
  **dependency / unknown**, and no test for it is proposed in this change.

## 4. Render path (current, for orientation)

`jefferson.ts` `session_start` → store seeded + three subscriptions → `readConfiguration` →
`ctx.ui.setFooter` → `createFooter(rows, () => store.sample(), theme)`
(`row-renderer.ts`) → per `render(width)`: one `sampleReadings()` shared by all cells; each cell
component memoizes by `(sample, width)` and calls `cell.instrument.render(current, cellWidth, theme)`
→ bound instrument (`configuration.ts` `instrumentBindings`) → `resolveFormat(declaration,
segments, style, readings, width, theme)` (`format.ts`) → styled text → cell clips with
`truncateToWidth`, pads with `visibleWidth`, emits `RESET` before an open-style trailing pad.

## 5. Test / spec / README surfaces this change would touch

- `tests/instrument.test.ts` — `shapes` table (thinking default format), options assertion
  (`["format","style"]`, frozen), default-render expectations (`"thinking: high"`, `"thinking: off"`),
  unknown-level test.
- `tests/configuration.test.ts` — instrument-option whitelist rejection, `instruments` section
  tests (lines ~467-520), cell rendering of `thinking` (`"thinking: high"` at several places).
- `tests/format.test.ts` — `parseFormat`/`resolveFormat` semantics (variable-name regex, unknown →
  `""`, style validation); a modifier syntax or label prepend lands here.
- `tests/jefferson.test.ts` — end-to-end (`thinking: high` seed/push assertions, e.g. lines ~283-400),
  exported-surface test (entry exports `["VERSION","default"]`).
- `tests/row-renderer.test.ts`, `tests/session-data-store.test.ts` — geometry and store semantics;
  largely stable unless the label/color work changes the cell contract.
- `tests/fake-theme.ts` — the fake `Theme` implements only `getFgAnsi`/`getBgAnsi`/`style`; it has
  **no** `getThinkingBorderColor` and no `thinking*` tokens, so any render-path test of the level
  color needs this fixture extended (host API) — noted as a surface, not decided here.
- `openspec/specs/statusline/spec.md` — requirements to amend by name: "The thinking instrument"
  (default format, unknown-level scenario), "An instrument's format is plain text and variables"
  (modifier syntax, when it lands), "An instrument's configuration lives in the extension's own
  document" / option-whitelist scenarios (a new `label` option), "An instrument is declared once…"
  (declaration owns defaults incl. label), possibly a new requirement for the `$level` color.
- `README.md` — the instruments table (thinking row, new `label` option prose).

## 6. Unknowns and missing material

- The string-modifier feature (`|capitalize` etc.) is **absent from this worktree** (see §3.5); its
  syntax, parser shape, and where modifiers apply are unknown here and assumed functional per the
  ruling. Dependency on the other conductor's change.
- Whether the `label` renders when the instrument's variables are unknown (today the whole cell
  renders `""`); whether the label is styled with the instrument's `style`; and whether `$level`'s
  level-color overrides a configured `fg` for that segment only — all design points for
  Michael/design, not resolved by this reconnaissance.
- `tests/fake-theme.ts` does not implement `getThinkingBorderColor` or the `thinking*` tokens, so
  the exact render-time call shape against the fake is unverified.
- The change directory has only `owner-rulings.md` and `.openspec.yaml`; no proposal/specs/council/
  design/tasks exist yet. `.openspec.yaml` names a michael run id; no other runs are recorded.
- Host installed here is 1.5.0 while `package.json` devDeps pin `^1.4.0` — the mechanism above was
  read from 1.5.0; whether `getThinkingBorderColor` exists in 1.4.x was not checked (Chidi owns
  host-version behavior).
- The screenshot was used only as a visual reference; no token or color was inferred from it.

## 7. Questions for the invoker (via the conductor, not Joel directly)

- When a `thinking` cell's level is unknown (renders `""` today), does the `label` still render,
  or does unknown suppress the whole cell including the label?
- Is the label styled with the instrument's configured `style`, and does the `$level` level-color
  override the style's `fg` for the level segment only (mirroring how `$bar` overrides `fg` above
  70/90)?
- Should the `label` option live in `FOUNDATIONAL_OPTIONS` (all seven declarations at once) or
  per-declaration with a `thinking`-specific default of `"Thinking: "` — and where does the
  default label value sit relative to `defaultFormat` in `InstrumentDeclaration`?
- Does the level color key off `readings.thinkingLevel` through `theme.getThinkingBorderColor(level)`
  at render time (theme passed through the existing seam), and what happens for a level string the
  host never reports (host maps it to `thinkingOff`; the spec says unknown renders nothing)?
