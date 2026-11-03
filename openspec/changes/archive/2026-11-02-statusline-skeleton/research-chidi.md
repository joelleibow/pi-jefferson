# Research: Where pi extension configuration lives, and what pi's TUI substrate provides for a footer row of evenly distributed cells

Researcher: Chidi (documentation-research subagent)
Date: 2026-11-02
Change: `statusline-skeleton` in `/Users/joelleibow/Projects/pi-jefferson`

This report records what the installed pi platform (documentation, type declarations, and shipped runtime code) says, and where it is silent. It does not propose a design.

## Question and Scope

Question as given: where does a pi extension's configuration live, and what does pi's TUI substrate actually provide for a footer row of evenly distributed cells?

Scope items, as given:

1. Where extension configuration lives and who owns it — settings files and path resolution; any API for an extension to declare or read its own settings block; whether a per-extension namespace in `settings.json` is supported or only a convention.
2. The footer integration point — `ctx.ui.setFooter` and its factory signature; the component contract; what `footerData` provides; `setStatus`/`setWidget` by comparison; run modes where `setFooter` is a no-op.
3. The layout substrate — `@earendil-works/pi-tui`'s HStack/VStack/Stack, `StackOptions`, `StackEntryOptions`, `gap`, `align`, `allocateStackSizes`; how a row of N equal-width children is expressed and how a remainder arises.
4. Width and truncation rules — `visibleWidth`/`truncateToWidth`/`sliceByColumn`/`wrapTextWithAnsi`; why string length is not display width; what happens to content wider than its cell.
5. Configuration reload — how a configuration change reaches a running footer.

## Sources / Files Examined

Two versions of the platform were examined because they differ in documentation coverage (see Differences):

- **Project-pinned** (`node_modules` of pi-jefferson): `@earendil-works/pi-coding-agent` **1.4.0**, `@earendil-works/pi-tui` **1.4.0**.
- **Globally installed** (`~/.local/share/fnm/.../@earendil-works/pi-coding-agent`): **1.5.0**, bundling `@earendil-works/pi-tui` **1.5.0** (1.5.0 is also the latest npm release of pi-tui, confirmed via `npm view`).

- [S1] `docs/configuration.md` (1.4.0 and 1.5.0 packages) — agent directory and project `.pi` locations, trust gating.
- [S2] `docs/settings.md` (1.5.0 package) — full settings reference; fixed key list; `$schema` URL `https://pi.dev/schemas/settings.schema.json`.
- [S3] `docs/extensions.md` (1.5.0 package) — `ctx.mode`, `ctx.hasUI`, `CONFIG_DIR_NAME` per-extension config example, `ctx.isProjectTrusted()`, `pi.getSettings()`, `setFooter`/`setStatus`/`setWidget` reference, `/reload` lifecycle, `ctx.reload()`.
- [S4] `docs/extensions.md` (1.4.0 package) — much thinner; no `setFooter`/`setStatus`/`setWidget`/`getSettings` prose; reload-lifecycle statements at lines 50, 137, 145.
- [S5] `docs/rpc-extension-ui.md` (both versions, line 18) — RPC-mode no-op list including `setFooter()`.
- [S6] `docs/tui.md` (both versions) — component model, width rules, built-in component list.
- [S7] `dist/core/extensions/types.d.ts` (1.4.0) — `ExtensionUIContext.setFooter` signature (lines 105–113), `pi.getSettings(): Settings` (line 1286), `ctx.isProjectTrusted()` (line 238).
- [S8] `dist/core/footer-data-provider.d.ts` (1.4.0) — `FooterDataProvider` / `ReadonlyFooterDataProvider`.
- [S9] `dist/core/settings-schema.js` / `settings-schema.d.ts` (1.4.0) — root `SettingsSchema` ends `}, { additionalProperties: true })` (line 290); `Settings` TS type.
- [S10] `dist/core/settings-manager.js` (1.4.0) — load path (`JSON.parse` + migrate, no validation; comment at line 81), `deepMergeSettings`/`deepMergeObjects`, `getSettings()` = `structuredClone(this.settings)` (line 329).
- [S11] `dist/modes/interactive/interactive-mode.js` (1.4.0) — `setExtensionFooter` (lines 1956–1972), `resetExtensionUI` (lines 1898–1924, called from lines 367 and 5337), `MAX_WIDGET_LINES = 10` (line 1927).
- [S12] `examples/extensions/custom-footer.ts` (shipped in both 1.4.0 and 1.5.0 packages) — canonical `setFooter` usage.
- [S13] `pi-tui/dist/components/stack.d.ts` and `stack.js` (1.4.0; `distribute` identical in 1.5.0, verified by `diff`) — `Stack`, `StackOptions`, `StackEntryOptions`, `allocateStackSizes`, `visibleStackEntries`.
- [S14] `pi-tui/dist/components/h-stack.js` (1.4.0) — `HStack.render` measurement/allocation/compositing.
- [S15] `pi-tui/dist/tui.js` (1.4.0) — `compositeTuiLine` (lines 157–178); `pi-tui/dist/tui.d.ts` — `Component` interface (lines 68–89).
- [S16] `pi-tui/dist/utils.js` (1.4.0) — `visibleWidth` (line 212), `wrapTextWithAnsi` (line 823), `truncateToWidth` (line 1018), `sliceByColumn`/`sliceWithWidth` (lines 1146–1154).
- [S17] `pi-tui/dist/components/text.js` (1.4.0) — `Text` wrapping, default `paddingX = 1`, `paddingY = 1`.
- [S18] Direct execution of the shipped `allocateStackSizes` from both pi-tui 1.4.0 (project) and 1.5.0 (global) with controlled inputs (commands and outputs quoted under Finding 3).

No web sources were needed; the platform's own documentation and shipped code are the authoritative surface and were available locally in two versions. Context7 was not queried because the libraries in question are pi's own packages, whose current documentation ships inside the installed packages.

## Findings

### Finding 1 — Where extension configuration lives, and who owns it

**File locations and resolution** [S1]: user-level configuration lives in the agent directory, default `~/.pi/agent`, relocatable via `PI_CODING_AGENT_DIR` or the SDK `agentDir` option; the user settings file is `<agent-dir>/settings.json`. Project configuration lives in `.pi/` under the working directory — `.pi/settings.json` — and "loads after project trust is granted" (sole exception: `sessionDir`, read before trust resolution). Precedence [S2]: "Project settings override agent-directory settings. Resource lists are combined." `/settings` (interactive) and `/reload` are the documented in-app companions (1.5.0 [S1]).

**No per-extension settings API exists.** The settings reference [S2] is a fixed list of pi-owned keys; neither version of the docs describes any way for an extension to declare a settings block, register a schema, or receive typed configuration. The only read API is `pi.getSettings()` — "Return a copy of the effective settings, with global and project settings merged and overrides applied" [S3]; implemented as `structuredClone(this.settings)` [S10].

**A per-extension namespace in `settings.json` is a convention the runtime happens to tolerate, not a supported pattern.** Evidence for tolerance, all from shipped 1.4.0 code:

- The root `SettingsSchema` is `Type.Object({ … }, { additionalProperties: true })` [S9, line 290] — unknown keys are schema-legal.
- Settings files are not validated on load: `loadFromStorage` is `JSON.parse(stripBom(content))` plus legacy-key migration, and the in-code comment states "Settings files are not validated; a malformed value replaces instead of throwing here." [S10, line 81]
- The user/project merge is a recursive `deepMergeObjects`, so an unknown object key deep-merges like any other and survives into `getSettings()`'s clone [S10].

Evidence that it is nonetheless only a convention: the published editor schema (`https://pi.dev/schemas/settings.schema.json` [S2]) and the exported `Settings` TypeScript type [S9] declare only pi's own keys, so an extension reading `(pi.getSettings() as any).myExtension` steps outside the typed surface, and nothing in either docs version blesses the practice.

**The documented per-extension configuration pattern is a separate file.** The 1.5.0 extensions guide [S3] shows an extension reading its own project-local file and gating it on trust:

> Use `CONFIG_DIR_NAME` instead of hardcoding `.pi` when constructing project-local config paths… `const projectConfigPath = join(ctx.cwd, CONFIG_DIR_NAME, "my-extension.json");`
> `ctx.isProjectTrusted()` — "Use this before reading project-local extension configuration that should only be honored for trusted projects."

`CONFIG_DIR_NAME` is exported from `@earendil-works/pi-coding-agent` and `isProjectTrusted()` exists on `ExtensionContext` already in 1.4.0 [S7 lines 238, 2]; only the *prose guidance* is new in 1.5.0. Ownership summary: pi owns `settings.json`'s known keys and the file itself (it writes it, e.g. via `/settings`); an extension's own file under `.pi/` is owned by that extension.

### Finding 2 — The footer integration point

**Factory signature** [S7, lines 105–113], verbatim from the 1.4.0 type declarations:

```typescript
setFooter(factory: ((tui: TUI, theme: Theme, footerData: ReadonlyFooterDataProvider) => Component & {
    dispose?(): void;
}) | undefined): void;
```

Its doc comment: "Set a custom footer component, or undefined to restore the built-in footer. The factory receives a FooterDataProvider for data not otherwise accessible: git branch and extension statuses from setStatus(). Context usage is on ctx.getContextUsage(), token stats on ctx.sessionManager.getEntries(), model info on ctx.model." The 1.5.0 guide adds: "Custom footer (replaces built-in footer entirely)" and "`ctx.ui.setFooter(undefined); // Restore built-in footer`" [S3].

**What the returned component must implement** — pi-tui's `Component` [S15]:

- `render(width: number): string[]` — required; each returned line must fit `width` (see Finding 4).
- `invalidate(): void` — required; "Called when theme changes or when component needs to re-render from scratch."
- Optional: `handleInput(data)`, `handleMouse(event)`, `wantsKeyRelease`; plus the `dispose?(): void` that `setFooter`'s own signature adds.

**What `footerData` provides** [S8]: `ReadonlyFooterDataProvider = Pick<FooterDataProvider, "getGitBranch" | "getExtensionStatuses" | "getAvailableProviderCount" | "onBranchChange">`. That is: current git branch (`null` outside a repo, `"detached"` for detached HEAD; watched via fs watchers with debounce and an `onBranchChange` subscription), the map of status texts set through `ctx.ui.setStatus()`, and a count of providers with available models. Everything else a footer typically shows comes from `ctx` (`getContextUsage()`, `sessionManager`, `model`), per the signature's doc comment. The shipped example subscribes `footerData.onBranchChange(() => tui.requestRender())` and returns the unsubscribe as `dispose` [S12].

**Runtime semantics** [S11, lines 1956–1972]: calling `setExtensionFooter` disposes the previous custom footer, clears the footer container, installs the new component (or restores the built-in footer on `undefined`), and requests a render. So **there is exactly one custom footer slot; the last caller wins.** `resetExtensionUI()` — invoked on session replacement/reload paths [S11, lines 367, 1898–1912, 5337] — calls `setExtensionFooter(undefined)`, so a custom footer does not survive a reload and must be re-registered.

**`setStatus` and `setWidget` by comparison** [S3]:

- `ctx.ui.setStatus(key, text | undefined)` — a keyed, persistent status string rendered inside the *built-in* footer's status area (and exposed to a custom footer via `footerData.getExtensionStatuses()`); fire-and-forget; functions in both TUI and RPC modes.
- `ctx.ui.setWidget(key, lines | factory | undefined, { placement: "aboveEditor" | "belowEditor" })` — a keyed, persistent multi-line region adjacent to the editor, accepting `string[]` or a `(tui, theme) => Component` factory; the runtime caps total widget lines at 10 [S11, line 1927].
- `setFooter` differs from both: it is not keyed and not additive — it *replaces* the whole footer row with one component.

**Run modes where `setFooter` is a no-op** [S5, line 18, identical in both doc versions]: in **RPC mode**, "`setWorkingMessage()`, `setWorkingVisible()`, `setWorkingIndicator()`, `setHiddenThinkingLabel()`, `setFooter()`, `setHeader()`, `addAutocompleteProvider()`, `setEditorComponent()`, and `setToolsExpanded()` are no-ops." `ctx.mode` is `"tui" | "rpc" | "json" | "print"`; `ctx.hasUI` is `true` in TUI and RPC, `false` in print (`-p`) and JSON modes [S3]. The 1.5.0 guide instructs: "Use `ctx.mode === "tui"` to guard terminal-only features such as `custom()`, component factories, terminal input, and direct TUI rendering." Behavior of calling `setFooter` in print/JSON modes is not documented; the documented guard is `ctx.mode === "tui"`.

### Finding 3 — The layout substrate, and how equal widths actually behave

**API surface** [S13, stack.d.ts]:

```typescript
interface StackEntryOptions {
    basis?: number | "auto";
    grow?: number;
    shrink?: number;
    minSize?: number;
    maxSize?: number;
    visible?: (viewport: LayoutViewport) => boolean;
}
interface StackOptions {
    gap?: number;                              // default 0
    align?: "stretch" | "start" | "center" | "end";  // default "stretch"
}
abstract class Stack extends Container {
    constructor(children?: StackChild[], options?: StackOptions);
    addChild(component: Component, options?: StackEntryOptions): void;
    removeChild(component: Component): void;
    clear(): void;
}
class HStack extends Stack { render(width: number): string[]; }
class VStack extends Stack { render(width: number): string[]; }
declare function allocateStackSizes(entries, intrinsicSizes, availableSize: number | undefined, gap): number[];
```

For HStack the main axis is terminal columns; `basis: "auto"` (or unset) means the child's measured intrinsic width. `visible` predicates are evaluated per render against `{ width, height: Number.MAX_SAFE_INTEGER }` [S14].

**Allocation algorithm** [S13, stack.js]: `contentSize = availableSize − (n−1)·gap`; initial sizes are the clamped bases; a surplus is distributed proportionally to `grow`, a deficit removed proportionally to `shrink × max(1, size)`, by an iterative `distribute` loop. `availableSize === undefined` returns bases unchanged.

**How HStack renders** [S14]: it first renders *every visible child at the full row width* to measure intrinsic widths, then calls `allocateStackSizes`, then re-renders each child at its allocated width (children allocated 0 render as nothing). Row height is the tallest child's line count; `align` sets the vertical offset of shorter children (`stretch`/`start` at top, `center` centered, `end` bottom). Lines are composited left to right at running `x += childWidth + gap` offsets via `compositeTuiLine`. Note the double render per frame per child.

**Critical finding — equal `grow` does not produce equal widths.** The `distribute` loop computes each candidate's share from the *remaining* amount inside the candidate iteration (`proposed = max(1, floor(remaining × weight / totalWeight))`, with `remaining` shrinking as it goes), so distribution drains greedily left to right and comes out geometric, not even. Verified by executing the shipped code from both installed versions [S18]; the `distribute` function is byte-identical between 1.4.0 and 1.5.0:

```text
n=2, w=100,  all {basis:0, grow:1}, gap=0 → [66, 34]
n=3, w=100,  same                        → [48, 31, 21]
n=3, w=101                             → [48, 32, 21]
n=4, w=100                             → [38, 27, 20, 15]
n=5, w=100                             → [30, 24, 18, 15, 13]
n=3, w=10                              → [5, 3, 2]
n=4, w=10                              → [3, 3, 2, 2]
n=2, w=9                               → [6, 3]
n=3, w=10, gap=1                       → [3, 3, 2]   (contentSize = 10 − 2)
```

So the answer to "how is a row of N children of equal width expressed" is **not** `grow: 1` on each child. What does produce exactly equal cells in the shipped code is a **fixed equal numeric `basis` with no grow**: `{basis:33}` ×3 at w=100 → `[33,33,33]`, with the leftover `100 − 99 = 1` column simply never composited (the base line is padded to the full width by `compositeTuiLine` [S15]). Because `basis` is fixed at `addChild` time while `render(width)` receives the width per frame, a width-adaptive equal-cell footer must either rebuild its stack children when the width changes (`clear()` + `addChild` with recomputed bases — both methods are public [S13]) or bypass Stack arithmetic and compute cell widths itself.

**How the remainder arises**: (a) under `grow`, as a multi-column left-biased skew (up to `ceil`-vs-`floor` by many columns — 66/34 for two cells at w=100), because of the greedy draining above; (b) under fixed equal `basis`, as `width − n·basis − (n−1)·gap` unused columns at the row's right edge. There is no largest-remainder or round-robin fair division anywhere in the allocator. Default shrink behavior for oversized `auto` content is also proportional-and-greedy (e.g. two 40-column children at w=50 shrink to `[20,30]`, not `[25,25]` [S18]).

### Finding 4 — Width and truncation rules

The rule, stated identically in both doc versions [S6]:

> Every rendered line must fit within the supplied width. Measure visible terminal columns rather than string length because ANSI escapes, wide characters, emoji, and combining characters change display width.
> Use `visibleWidth()`, `truncateToWidth()`, `sliceByColumn()`, and `wrapTextWithAnsi()` instead of implementing terminal-width handling yourself. Pi resets styling and hyperlinks after every line, so reapply styles on each rendered line.

Why string length is not display width, per the implementations [S16]: `visibleWidth` counts terminal columns — ANSI/OSC sequences are zero-width, East-Asian wide chars and most emoji are two columns, combining marks and ZWJ sequences attach to their grapheme — falling back to grapheme segmentation once the ASCII fast path fails. `truncateToWidth(text, maxWidth, ellipsis = "...", pad = false)` truncates to a column budget, appending an ellipsis only if the ellipsis itself fits; `sliceByColumn(line, startCol, length, strict)` takes a column-precise slice preserving ANSI state; `wrapTextWithAnsi(text, width)` word-wraps while carrying ANSI state across lines.

**What happens to content wider than its cell** [S14, S15]: HStack composites each child line through `compositeTuiLine`, which hard-clips it at the cell width via `sliceWithWidth(overlayLine, 0, overlayWidth, true)` and finally guards the whole row with `sliceByColumn(result, 0, totalWidth, true)`. So horizontal overflow is **silently clipped, with no ellipsis**, at the cell boundary. But clipping happens only at composite time: a wrapping child (notably `Text`, which wraps via `wrapTextWithAnsi` [S17]) turns over-wide content into *more lines*, increasing the whole row's height — a one-row footer becomes multi-row. Two corollaries for Lorem cells: each cell must truncate its own text (`truncateToWidth`, which also supplies the ellipsis the compositor will not), and a `Text` cell must be constructed as `new Text(text, 0, 0)` because its defaults are `paddingX = 1, paddingY = 1` [S17] — exactly what pi's own examples do (`new Text(theme.fg("accent", "Custom"), 0, 0)` [S3]; the custom-footer example truncates with `truncateToWidth` and measures with `visibleWidth` [S12]).

### Finding 5 — How a configuration change reaches a running footer

There is **no live settings-change event or watcher** on the documented surface: the extension event catalog [S3/S4] contains no settings-changed event, and `SettingsManager`'s public type surface exposes no subscribe/onChange [S10]. The documented paths are:

1. **Startup**: the extension's default export runs at load; it reads its configuration and calls `setFooter`.
2. **`/reload` (or programmatic `ctx.reload()`)**: the documented instruction is "Run `/reload` after manually changing settings, keybindings, instructions, or resources." [S1, 1.5.0]. Reload tears the extension runtime down and rebuilds it — "`session_start` carries `reason: "startup" | "reload" | …`", "`session_shutdown` carries `reason: "quit" | "reload" | …`" [S3]; 1.4.0 docs: "Reload and session replacement invalidate the old runtime." [S4, line 145]. Reload also resets extension UI including the custom footer (`resetExtensionUI` → `setExtensionFooter(undefined)` [S11]), so the reloaded extension must re-read configuration and re-register its footer. Auto-discovered extensions (`~/.pi/agent/extensions/`, `.pi/extensions/`) participate in hot-reload [S3]; `ctx.reload()` runs the same flow from code.
3. **Per render**: `pi.getSettings()` returns a fresh `structuredClone` of the merged settings on every call [S10], so a footer's `render(width)` *can* re-read settings every frame — the values will be current — at the cost of a full deep clone per call, and only for settings pi has actually loaded (pi itself only re-reads the files on reload). An extension-owned config file (Finding 1) would need the extension's own `fs.watch` for live updates; pi provides no watcher for it.

## Assumptions, Differences, and Unknowns

### Assumptions

- The project-pinned packages (pi-coding-agent 1.4.0, pi-tui 1.4.0) are the target platform; the global 1.5.0 install was used as the more complete documentation source and as a check that the layout allocator has not changed.
- "Run modes" means pi's `ctx.mode` values (`"tui"`, `"rpc"`, `"json"`, `"print"`), per the extension docs.
- Empirical outputs quoted in Finding 3 were produced by `node` running the shipped `dist/components/stack.js` with synthetic entries (`{component:{}, basis, grow}`); no pi runtime was started.

### Differences from the assumptions in the scope

1. **"Evenly distributed width" is not what the stack allocator does.** The scope asks how a row of N equal-width children "is expressed, and how a remainder arises, if it arises at all" — implying equal `grow` might suffice. It does not: equal `grow` weights yield a geometric left-biased distribution (66/34 for two cells at w=100; 48/31/21 for three), in both pi-tui 1.4.0 and 1.5.0 [S13, S18]. Exact equality requires fixed equal `basis` values (static per `addChild`) or extension-computed geometry, and the remainder then surfaces as unused columns at the row's right edge.
2. **Documentation coverage differs by version.** The scope's items 2 and 5 read as if `setFooter`, `setStatus`, `setWidget`, and `getSettings` are documented API. They are documented in **1.5.0** docs (and on the shipped-docs site they mirror), but the project's pinned **1.4.0** `docs/extensions.md` contains no prose for any of them — no `setFooter` mention at all. The API itself is real in 1.4.0: it is present in the type declarations [S7] and runtime [S11], and the 1.4.0 package ships `examples/extensions/custom-footer.ts` demonstrating it [S12]. Likewise, the "Run `/reload` after manually changing settings" sentence and the `CONFIG_DIR_NAME` per-extension-config example are 1.5.0 doc prose over capabilities whose code (`ctx.reload()`, `CONFIG_DIR_NAME`, `isProjectTrusted()`) already exists in 1.4.0.
3. **A per-extension `settings.json` namespace is not "supported" in any documented sense** — the scope's "supported pattern or only a convention" resolves to: undocumented convention that the loader and merger happen to preserve (additionalProperties: true, no validation, deep merge, structuredClone) [S9, S10]. The documented per-extension configuration mechanism is an extension-owned file under `.pi/` (`CONFIG_DIR_NAME`) gated by `ctx.isProjectTrusted()` [S3, S7].

### Unknowns and gaps

- **Whether the `distribute` skew is intentional or a bug.** No documentation describes the allocation algorithm; the behavior above is purely what the shipped code does in both released versions checked. The pi GitHub repository's issue tracker was not consulted.
- **`setFooter` behavior in print/JSON modes** is undocumented (the docs only say `hasUI` is false there and advise guarding with `ctx.mode === "tui"`); whether it throws, no-ops, or stores the factory was not traced.
- **Multi-extension contention for the footer** — last-caller-wins is observed in code [S11] but undocumented; there is no documented arbitration or namespacing for the single footer slot.
- **Cost of `pi.getSettings()` per render** (a `structuredClone` of the full merged settings per call [S10]) is unquantified; whether per-frame re-reading is an intended pattern is undocumented.
- **The published JSON schema's treatment of unknown keys** (`pi.dev/schemas/settings.schema.json`, referenced from [S2]) was not fetched; editor diagnostics for a custom namespace key are therefore unverified, though the runtime schema explicitly allows them [S9].
- **`align` semantics for HStack** (vertical placement of shorter children) are read from code [S14]; no doc prose defines them.
- Whether `VStack`'s `availableSize` path is ever exercised inside pi's renderer was not investigated (HStack always passes a concrete width).
