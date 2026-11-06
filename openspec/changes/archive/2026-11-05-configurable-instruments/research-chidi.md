# Chidi research: what pi and pi-tui provide for a configurable-instruments footer

**Question.** What exactly do pi and pi-tui provide, at the versions installed on this machine, for a footer extension that renders configurable instruments from session data?

**Versions examined (live, installed):**

- `@earendil-works/pi-coding-agent` **1.5.0** at `/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent` (below: `$PI`)
- `@earendil-works/pi-tui` **1.5.0** at `$PI/node_modules/@earendil-works/pi-tui` (below: `$TUI`)
- Starship config docs at https://starship.rs/config/ (fetched live)

Everything below quotes these installed sources, not memory.

---

## 1. Session data surfaces for the six instruments

### 1.1 Model — `ctx.model`

`ExtensionContext.model: Model<any> | undefined` ("Current model (may be undefined)") — `$PI/dist/core/extensions/types.d.ts` (`ExtensionContext`). The `Model` shape comes from pi-ai:

- `BaseModel` (`$PI/node_modules/@earendil-works/pi-ai/dist/types.d.ts`): `id: string`, `name: string`, `api`, `provider: ProviderId`, `baseUrl`, `input`, `cost: ModelCost`, `headers?`.
- `Model` (same file): adds `reasoning: boolean`, `thinkingLevelMap?`, `contextWindow: number`, `maxTokens: number`.

Pi's built-in footer renders the model as `state.model?.id || "no-model"` (`$PI/dist/modes/interactive/components/footer.js`, `render()`), and prepends `(provider)` only when `footerData.getAvailableProviderCount() > 1` and it fits.

### 1.2 Thinking level — `ctx.thinkingLevel`

`ExtensionContext.thinkingLevel?: ThinkingLevel` — "Current thinking level, when provided by the session runtime" (`types.d.ts`). It is **optional**; an extension must tolerate `undefined`.

`ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"` — `$PI/node_modules/@earendil-works/pi-agent-core/dist/types.d.ts:300`.

The built-in footer only shows thinking level when `state.model?.reasoning` is true, rendering `model • thinking off` or `model • <level>` with `state.thinkingLevel || "off"` as fallback (`footer.js`).

### 1.3 Change events — `model_select` and `thinking_level_select`

`$PI/dist/core/extensions/types.d.ts`:

```ts
export interface ModelSelectEvent {
    type: "model_select";
    model: Model<any>;
    previousModel: Model<any> | undefined;
    source: "set" | "cycle" | "restore";   // ModelSelectSource
}
export interface ThinkingLevelSelectEvent {
    type: "thinking_level_select";
    level: ThinkingLevel;
    previousLevel: ThinkingLevel;
}
```

Docs (`$PI/docs/extensions.md`, "model_select" / "thinking_level_select" sections):

- `model_select` fires on `/model`, model cycling (`Ctrl+P`), or `pi.setModel()`. **"Restoring a session does not fire it; read `ctx.model` in `session_start` to initialize model-dependent state."** The doc example shows `source: "set" | "cycle"`; the installed type adds `"restore"` (doc/type drift — see Gaps).
- `thinking_level_select` is notification-only; handler return values are ignored. Both events are registered via `pi.on("model_select", handler)` / `pi.on("thinking_level_select", handler)` (`types.d.ts` lines ~1245-1246).

For a footer this matters only for cache invalidation: a component that reads `ctx.model` / `ctx.thinkingLevel` fresh in `render()` does not need these events at all, since the footer re-renders every frame (see §2.3).

### 1.4 Path basename — `ctx.cwd`

`ExtensionContext.cwd: string` ("Current working directory", `types.d.ts`). The session manager also exposes `getCwd()` through `ReadonlySessionManager`. The built-in footer does **not** show a basename; it shows the full cwd with the home directory collapsed to `~` via `formatCwdForFooter(cwd, home)` (`footer.js`, exported helper), then appends `(<git branch>)` and `• <session name>`. A basename instrument is a plain `node:path` operation on `ctx.cwd`; nothing in pi provides "basename" pre-chewed.

### 1.5 Context usage — `ctx.getContextUsage()`

`types.d.ts`:

```ts
export interface ContextUsage {
    /** Estimated context tokens, or null if unknown (e.g. right after compaction, before next LLM response). */
    tokens: number | null;
    contextWindow: number;
    /** Context usage as percentage of context window, or null if tokens is unknown. */
    percent: number | null;
}
getContextUsage(): ContextUsage | undefined;
```

Returns `undefined` when there is no limits model or the model's `contextWindow <= 0`; returns `{ tokens: null, percent: null, contextWindow }` after compaction until the first post-compaction assistant response (`$PI/dist/core/agent-session.js`, `getContextUsage()`, lines ~3518-3550). The built-in footer renders `?/<window>` for the null case and otherwise `<percent.toFixed(1)>%/<formatTokens(window)>`, coloring it `warning` above 70 % and `error` above 90 %, plus ` (auto)` when auto-compact is enabled (`footer.js`).

### 1.6 Token and cost totals — `ctx.sessionManager`

`ExtensionContext.sessionManager: ReadonlySessionManager`, where (`$PI/dist/core/session-manager.d.ts:178`):

```ts
export type ReadonlySessionManager = Pick<SessionManager,
  "getCwd" | "getSessionDir" | "getSessionId" | "getSessionFile" | "getLeafId" | "getLeafEntry" |
  "getEntry" | "getLabel" | "getBranch" | "buildContextEntries" | "buildSessionProjection" |
  "getHeader" | "getEntries" | "getTree" | "getSessionName">;
```

- `getEntries(): SessionEntry[]` returns **all** entries (copy); `getBranch(fromId?)` walks leaf→root in path order including all entry types.
- Note: `SessionManager.getEntryCount()` exists but is **not** in the `ReadonlySessionManager` pick (see Gaps — this blocks copying the built-in footer's exact cache key).

Entry union (`session-manager.d.ts:128`): `SessionMessageEntry | ThinkingLevelChangeEntry | ModelChangeEntry | UsageEntry | CompactionEntry | BranchSummaryEntry | CustomEntry | CustomMessageEntry | ContextEditEntry | LabelEntry | SessionInfoEntry`.

Usage-bearing entries and their fields:

- `SessionMessageEntry` — `entry.message`; assistant messages carry `message.usage`; toolResult messages may carry `message.usage`.
- `UsageEntry` (`type: "usage"`) — `kind` (arbitrary, e.g. `"cache_warm"`), `provider`, `model`, `usage: Usage`, optional `note`. Appended via `appendUsage(...)` — "model-attributed usage that does not participate in LLM context".
- `CompactionEntry` and `BranchSummaryEntry` — optional `usage?: Usage`.

`Usage` (`$PI/node_modules/@earendil-works/pi-ai/dist/types.d.ts:285`):

```ts
export interface Usage {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    cacheWrite1h?: number;   // Anthropic-only 1h-retention split of cacheWrite
    reasoning?: number;      // subset of output, only when the provider reports it
    totalTokens: number;
    cost: {
        input: number; output: number; cacheRead: number; cacheWrite: number;
        /** Best available total: provider-reported billed cost when supported, otherwise the catalog estimate. */
        total: number;
        totalFromProvider?: boolean;
    };
}
```

**How pi's own footer computes the totals** (`$PI/dist/modes/interactive/components/footer.js`, `getSessionStats()`): it scans `sessionManager.getEntries()` — the *whole* session, "not just post-compaction messages" — and accumulates via `createUsageTotals()` / `addUsageToTotals()` from `$PI/dist/core/usage-totals.js`, which sum `input`, `output`, `cacheRead`, `cacheWrite`, and `cost += usage.cost.total`. Entries counted:

1. `type === "usage"` → `entry.usage`;
2. `type === "message" && message.role === "assistant"` → `message.usage` (also used to derive a latest cache-hit rate);
3. `type === "message" && message.role === "toolResult" && message.usage` → `message.usage` (nested-LLM tool usage);
4. `(type === "branch_summary" || type === "compaction") && entry.usage` → `entry.usage`.

Display formatting: `formatTokens(count)` (`footer.js`, exported): `< 1000` → raw; `< 10000` → `X.Xk`; `< 1e6` → rounded `Xk`; `< 1e7` → `X.XM`; else rounded `XM`. Cost renders as `$${cost.toFixed(3)}`, with ` (sub)` appended for subscription-backed providers. The footer's rendered parts: `↑in`, `↓out`, `R<cacheRead>`, `W<cacheWrite>`, `CH<hit>%`, cost, and the context percent.

**Caching note from the built-in footer** (`footer.d.ts` comment): "the footer renders on every frame. Entries are append-only and every append moves the leaf, so the results only change with the session, leaf, entry count, or the model whose context window applies." Its cache key is `{session, sessionId, leafId, entryCount, limitsModel}`. Extensions cannot use `entryCount` (not on the readonly view); `getEntries().length` works but copies the array.

**Example divergence**: the shipped example `$PI/examples/extensions/custom-footer.ts` sums only assistant messages over `ctx.sessionManager.getBranch()` — it misses `usage` entries, toolResult usage, and compaction/branch-summary usage, and is branch-scoped rather than whole-session. The built-in footer's algorithm above is the one to mirror for matching numbers.

---

## 2. Footer installation

### 2.1 Factory signature and contract

`$PI/dist/core/extensions/types.d.ts` (`ExtensionUIContext.setFooter`):

```ts
/** Set a custom footer component, or undefined to restore the built-in footer.
 *
 * The factory receives a FooterDataProvider for data not otherwise accessible:
 * git branch and extension statuses from setStatus(). Context usage is on
 * ctx.getContextUsage(), token stats on ctx.sessionManager.getEntries(), model info on ctx.model.
 */
setFooter(factory: ((tui: TUI, theme: Theme, footerData: ReadonlyFooterDataProvider) => Component & {
    dispose?(): void;
}) | undefined): void;
```

The returned object must satisfy pi-tui's `Component` (`$TUI/dist/tui.d.ts:68`):

- `render(width: number): string[]` — "Render the component to lines for the given viewport width"; every line must fit within `width` (`$PI/docs/tui.md`: "Every rendered line must fit within the supplied width").
- `invalidate(): void` — "Invalidate any cached rendering state. Called when theme changes or when component needs to re-render from scratch."
- `dispose?(): void` — optional; pi calls it when replacing the footer.

Docs example (`$PI/docs/extensions.md`, "Widgets, Status, and Footer"):

```ts
// footerData provides the git branch and extension statuses from setStatus()
ctx.ui.setFooter((tui, theme, footerData) => ({
  render(width) { return [theme.fg("dim", "Custom footer")]; },
  invalidate() {},
}));
ctx.ui.setFooter(undefined);  // Restore built-in footer
```

### 2.2 `ReadonlyFooterDataProvider`

`$PI/dist/core/footer-data-provider.d.ts`:

```ts
/** Read-only view for extensions - excludes setExtensionStatus, setAvailableProviderCount and dispose */
export type ReadonlyFooterDataProvider = Pick<FooterDataProvider,
  "getGitBranch" | "getExtensionStatuses" | "getAvailableProviderCount" | "onBranchChange">;
```

- `getGitBranch(): string | null` — current branch, `null` outside a repo, `"detached"` for detached HEAD.
- `getExtensionStatuses(): ReadonlyMap<string, string>` — texts set via `ctx.ui.setStatus()`.
- `getAvailableProviderCount(): number` — unique providers with available models (used by the built-in footer for the `(provider)` prefix).
- `onBranchChange(callback: () => void): () => void` — subscription; the shipped example uses it as `const unsub = footerData.onBranchChange(() => tui.requestRender()); return { dispose: unsub, ... }` (`$PI/examples/extensions/custom-footer.ts`).

### 2.3 When the factory is invoked; lifetime across `session_start` and `/reload`

The factory is invoked **synchronously inside `setFooter`**, not lazily — `$PI/dist/modes/interactive/interactive-mode.js`, `setExtensionFooter(factory)` (lines ~2043-2060): it disposes the previous custom footer, clears `footerContainer`, calls `factory(this.ui, theme, this.footerDataProvider)`, adds the result to the container, and calls `this.ui.requestRender()`. So whatever pi state the factory closure needs must be captured from the extension's own scope (as `custom-footer.ts` captures `ctx`).

Lifetime: `resetExtensionUI()` (same file, line ~1985) calls `setExtensionFooter(undefined)` — which **disposes the custom footer and restores the built-in one**. It runs from two places:

1. `runtimeHost.setBeforeSessionInvalidate(() => this.resetExtensionUI())` (constructor, line ~369) — i.e. before session replacement (new/resume/fork).
2. The `/reload` flow (line ~5446) — `resetExtensionUI()` then reloads keybindings, extensions, skills, prompts, themes, and context files.

Docs (`$PI/docs/extensions.md`): `/reload` (or `ctx.reload()`) emits `session_shutdown` with `reason: "reload"` for the old extension instance, then reloads and rebinds extensions and emits `session_start` with `reason: "reload"`. So a custom footer installed from a `session_start` handler is torn down on reload and must be re-installed by the new extension instance's `session_start` handler; a `dispose()` that unsubscribes listeners is required for clean teardown.

Rendering cadence: the footer container is part of the TUI tree and renders on every frame; the built-in footer's own docstring states "the footer renders on every frame" (`footer.d.ts`). Dynamic data (tokens, cost, context) is therefore freshest when read inside `render()`; events are only needed to trigger `tui.requestRender()` for things pi does not itself re-render for (e.g. the git branch watcher).

---

## 3. Theming

### 3.1 `Theme.style()` and `ThemeStyle`

`$PI/dist/modes/interactive/theme/theme.d.ts`:

```ts
import { ..., type TextAttributes } from "@earendil-works/pi-tui";
/** Tokens are only accepted in their own slot, because "" (terminal default) means the default
 *  foreground or background depending on the slot. Use `theme.colors[token]` to use a token's
 *  color in the other slot. */
export interface ThemeStyle extends TextAttributes {
    fg?: ThemeColor | Color;
    bg?: ThemeBg | Color;
}
// class Theme:
style(text: string, options: ThemeStyle): string;
fg(color: ThemeColor, text: string): string;
bg(color: ThemeBg, text: string): string;
bold/italic/underline/inverse/strikethrough(text): string;
get colors(): Readonly<Record<ThemeToken, Color>>;
get appearance(): "dark" | "light";
```

`TextAttributes` (`$TUI/dist/colors.d.ts:36`): exactly `bold?`, `dim?`, `italic?`, `underline?`, `inverse?`, `strikethrough?` — all booleans. `Color` is `IndexedColor | RgbColorValue | OklchColorValue`, constructible via `indexedColor()`, `rgbColor()`, `oklchColor()`, `okhslColor()`, or `parseColor(value: string | number)` from pi-tui.

**Exact token names** (`$PI/dist/modes/interactive/theme/theme-tokens.d.ts`, `THEME_TOKENS`):

- Foreground (`ThemeColor`): `accent`, `border`, `borderAccent`, `borderMuted`, `success`, `error`, `warning`, `muted`, `dim`, `text`, `thinkingText`, `scrollbarTrack`, `scrollbarThumb`, `searchMatchText`, `userMessageText`, `customMessageText`, `customMessageLabel`, `toolTitle`, `toolOutput`, `mdHeading`, `mdLink`, `mdLinkUrl`, `mdCode`, `mdCodeBlock`, `mdCodeBlockBorder`, `mdQuote`, `mdQuoteBorder`, `mdHr`, `mdListBullet`, `toolDiffAdded`, `toolDiffRemoved`, `toolDiffContext`, `syntaxComment`, `syntaxKeyword`, `syntaxFunction`, `syntaxVariable`, `syntaxString`, `syntaxNumber`, `syntaxType`, `syntaxOperator`, `syntaxPunctuation`, `thinkingOff`, `thinkingMinimal`, `thinkingLow`, `thinkingMedium`, `thinkingHigh`, `thinkingXhigh`, `thinkingMax`, `bashMode`.
- Background (`ThemeBg` = tokens not in `ThemeColor`): `selectedBg`, `searchMatchBg`, `userMessageBg`, `customMessageBg`, `toolPendingBg`, `toolSuccessBg`, `toolErrorBg`.
- Optional tokens with fallbacks: `scrollbarTrack`→`muted`, `scrollbarThumb`→`text`, `searchMatchBg`→`selectedBg`, `searchMatchText`→`text`, `thinkingMax`→`thinkingXhigh`.

Doc guidance (`$PI/docs/tui.md`, "Apply themes correctly"): `theme.style("Done!", { fg: "success", bg: "toolSuccessBg", bold: true })`; a style color may be a token or a concrete `Color`; to use a token's color in the other slot pass `theme.colors.<token>`; "Tokens that a theme sets to the terminal default render with the terminal's own color"; "Theme tokens are converted once per theme; compute concrete colors outside the render path when possible." And the warning: "Do not permanently store strings with theme colors unless `invalidate()` rebuilds them."

### 3.2 How a theme change reaches rendered output

- The `theme` passed to the footer factory is the module-level **Proxy** exported from `$PI/dist/modes/interactive/theme/theme.js` (line ~507: `export const theme = new Proxy({}, { get: ... forwards to globalThis[THEME_KEY] })`) — "The theme instance behind the `theme` proxy, whose own identity never changes." So the factory's `theme` argument always resolves to the *current* theme; re-rendering after a switch picks up new colors with no re-installation.
- On theme change, `InteractiveThemeController` (`$PI/dist/modes/interactive/theme/theme-controller.js`) calls `this.ui.invalidate()` (and `requestRender()`) — see `preview()` (~line 116), terminal-color reapplication (~line 168), and `notifyChanged()` (~line 206).
- `TUI.invalidate()` (`$TUI/dist/tui.js`, ~line 585) invalidates all mounted roots and overlays; `Container.invalidate()` (line ~111) cascades `child.invalidate?.()` to every child — including the footer container and the custom footer.

Net contract for the extension: cache themed strings by width/content if desired, rebuild them in `invalidate()`, and read `theme` at render time. Stateless re-computation per render is explicitly acceptable ("Stateless components can also calculate themed output on every render", `tui.md`).

---

## 4. pi-tui layout: `Stack`/`HStack` and the allocation algorithm

### 4.1 Entry options

`$TUI/dist/components/stack.d.ts`:

```ts
export interface StackEntryOptions {
    basis?: number | "auto";
    grow?: number;
    shrink?: number;
    minSize?: number;
    maxSize?: number;
    visible?: (viewport: LayoutViewport) => boolean;
}
export interface StackOptions { gap?: number; align?: "stretch" | "start" | "center" | "end"; }
```

Normalization in `Stack.addChild()` (`stack.js`): `grow` defaults 0, `shrink` defaults 1, `minSize` defaults 0, `maxSize` defaults `Number.MAX_SAFE_INTEGER`; all are floored and clamped ≥ 0. `HStack extends Stack` with `layoutType = "hstack"` and `render(width)`; `VStack` likewise vertical.

### 4.2 `allocateStackSizes` semantics (`$TUI/dist/components/stack.js`)

1. **Initial sizes**: each entry starts at `clampSize(basis === undefined || basis === "auto" ? intrinsic : basis, entry)` — i.e. explicit `basis` wins over the measured intrinsic width, then clamps into `[minSize, maxSize]`.
2. `contentSize = availableSize − (entries.length − 1) * gap`. If `availableSize` is `undefined`, sizes are returned as-is.
3. **Grow pass** when `total < contentSize`: leftover is handed to entries with `grow > 0` and remaining `maxSize` headroom, proportionally to `grow` weight (`proposed = max(1, floor(remaining * weight / totalWeight))`), capped per pass at each entry's `maxSize` capacity; the loop repeats until nothing can absorb more. **Leftover columns from integer flooring are re-distributed in later iterations of the `while (remaining > 0)` loop**, each candidate receiving at least 1 column per pass while capacity lasts — so with equal weights, remainder columns go to earlier candidates first, one at a time.
4. **Shrink pass** when `total > contentSize`: symmetric, weighted by `shrink * max(1, currentSize)` (larger children give up more), floored at `minSize`.

So `basis: floor(W / N)` with `grow: 1` on N equal entries yields exact equal columns: bases sum to ≤ W (minus gap), and the 0..N−1 remainder columns are distributed one each to the first entries in order. Note `HStack.render` passes the **full** width as `availableSize` and measures intrinsic sizes by rendering each child at full width first (`h-stack.js`) — children are rendered twice per frame (once for measurement at full width, once at their allocated width).

### 4.3 `compositeTuiLine` — per-child compositing (`$TUI/dist/tui.js:157`)

`compositeTuiLine(baseLine, overlayLine, startCol, overlayWidth, totalWidth)`:

- Pads `baseLine` with spaces up to `startCol` if short (`beforePad`).
- Slices the overlay to `[0, overlayWidth)` via `sliceWithWidth(..., strict=true)` and right-pads it with spaces to `overlayWidth` (`overlayPad`) — **every child cell is padded to its allocated width**.
- Inserts `SEGMENT_RESET = "\x1b[0m\x1b]8;;\x07"` (SGR reset **and** OSC 8 hyperlink close) **before and after each child segment** — so a child's styling cannot bleed into its neighbor, and a child's own styles must be self-contained.
- Final safety: if the result exceeds `totalWidth`, it is hard-clipped with `sliceByColumn(result, 0, totalWidth, true)`.

HStack composites each child at `x` with `x += childWidth + gap` (`h-stack.js`); `align` only affects vertical offset of shorter children within the row height.

### 4.4 Component render contract

`$TUI/dist/tui.d.ts:68` + `$PI/docs/tui.md`: `render(width)` returns an array of lines; every line must fit within `width` measured in visible columns (ANSI, wide chars, emoji, combining chars all count via grapheme width); "Pi resets styling and hyperlinks after every line, so reapply styles on each rendered line"; after state changes, `invalidate()` and call `tui.requestRender()` (coalesced); cache expensive work by width and clear it in `invalidate()`.

---

## 5. Width utilities (`$TUI/dist/utils.d.ts` / `utils.js`)

- `visibleWidth(str): number` — visible terminal columns of a string (ANSI/OSC/APC stripped, grapheme-aware).
- `truncateToWidth(text, maxWidth, ellipsis = "...", pad = false): string` — ANSI-aware truncation. Behavior from `utils.js` (`finalizeTruncatedResult`, line ~130): when truncation actually occurs it emits **`prefix + OSC8-close + \x1b[0m + ellipsis + \x1b[0m`** — i.e. a style reset is inserted before the ellipsis and again after it (the ellipsis itself is unstyled), and any active OSC 8 hyperlink is closed first. If the text already fits, it is returned unchanged (optionally space-padded when `pad: true`); if `maxWidth <= 0` returns `""`; if the ellipsis alone is wider than `maxWidth`, the ellipsis itself is clipped. Pass `ellipsis: ""` to hard-clip without dots (the built-in footer uses `truncateToWidth(rightSide, available, "")` for its right segment and `"..."` for its left).
- `sliceByColumn(line, startCol, length, strict?)` — extract a column range, ANSI- and wide-char-aware; `strict: true` excludes wide chars straddling the boundary. (`sliceWithWidth` also returns the resulting width.)
- `wrapTextWithAnsi(text, width): string[]` — word-wrap into multiple lines; irrelevant for a one-line footer cell.
- Related: `stripTerminalSequences`, `replaceControlCharacters` (the built-in footer has its own `sanitizeStatusText` collapsing `\r\n\t` and runs of spaces — `footer.js`).

For a one-line clipped cell: compose the styled string, then `truncateToWidth(text, cellWidth, "…")` (or `pad: true` to fill the cell). HStack already clips and pads via `compositeTuiLine`, but pre-truncating gives the ellipsis; `sliceByColumn` is for windowing rather than truncation, and `wrapTextWithAnsi` is for multi-line content.

---

## 6. Configuration precedent for extensions

`$PI/docs/extensions.md` (section near line 1181, next to `ctx.isProjectTrusted()`):

> Use `CONFIG_DIR_NAME` instead of hardcoding `.pi` when constructing project-local config paths. Rebranded distributions can use a different config directory name.

```ts
import { CONFIG_DIR_NAME, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    const projectConfigPath = join(ctx.cwd, CONFIG_DIR_NAME, "my-extension.json");
    // ...
  });
}
```

So the documented pattern is an **extension-owned JSON file** — project-local at `.pi/my-extension.json` (guarded by `ctx.isProjectTrusted()`, which "includes temporary trust decisions and CLI trust overrides", and documented with "Use this before reading project-local extension configuration that should only be honored for trusted projects"), with the global analogue under the agent config directory (`~/.pi/agent/`, the same directory that holds `extensions/`, per the discovery docs at `extensions.md` line ~9/133). Pi's extension docs do **not** document a per-extension namespace inside pi's own `settings.json`; `settings.json` appears in the extension docs only for registering additional extension *paths* (`extensions.md` line ~138). Session-scoped persistence is a separate mechanism (`pi.appendEntry()` custom entries, `extensions.md` line ~1683) and is not a config-file substitute.

## 7. Starship prior art (https://starship.rs/config/, fetched live)

Format-string semantics Jefferson's `format` option follows:

- **Variables**: "A variable contains a `$` symbol followed by the name of the variable. The name of a variable can only contain letters, numbers and `_`." Examples: `'$git_branch$git_commit'`, or with literal text between: `'$git_branch $git_commit'`.
- **Literal text**: anything that is not a variable/group renders verbatim. The symbols `$ [ ] ( )` "have special usage in a format string and must be escaped to display as that character" — escaped with a backslash, e.g. `format = '\[\$\] '`.
- **Text groups**: `'[<format string>](<style string>)'` — the bracketed part is itself a format string (texts, variables, nested groups); the parenthesized part styles it. Examples: `'[on](red bold)'`, `'[a [b](red) c](green)'`.
- **Style strings**: a module-level `style` entry, e.g. `'fg:green bg:blue'`, `'bold fg:27'`, `'underline bg:#bf5700'`, `'bold italic fg:purple'`; `''` disables styling. In module formats, `($style)` references the module's `style` option from inside a text group.
- **Conditional groups**: "A conditional format string wrapped in `(` and `)` will not render if all variables inside are empty." Example: `'(@$region)'` shows nothing when `region` is empty, else `@<region>`.
- Config lives in `~/.config/starship.toml`; each module has `format`, `style`, `disabled`, etc.

Jefferson's documented divergences (per the brief, confirmed consistent with what Starship offers): style is a **separate `ThemeStyle` object** (pi `Theme.style()` options: `{fg, bg, bold, ...}`) rather than an inline `(style string)` group, and **conditional groups are not planned**. What that leaves of the Starship grammar is exactly: literal text + `$variables` (+ escaping of `$`), which is a strict subset and easy to keep forward-compatible.

---

## Gaps and discrepancies

1. **`getEntryCount()` is not on `ReadonlySessionManager`** (`session-manager.d.ts:178` vs `:335`). The built-in footer's cheap cache key (`session, sessionId, leafId, entryCount, limitsModel`) cannot be copied exactly by an extension; `getEntries()` copies the array, so an extension footer that caches totals must either pay the copy or key on `getSessionId()` + `getLeafId()` alone (both are on the readonly view and change on every append, since "every append moves the leaf" — `footer.d.ts` comment).
2. **Doc/type drift on `ModelSelectSource`**: `docs/extensions.md` shows `source: "set" | "cycle"`; the installed type is `"set" | "cycle" | "restore"` (`types.d.ts`, `ModelSelectSource`).
3. **Example vs built-in totals**: `examples/extensions/custom-footer.ts` sums only assistant messages on the current branch; the built-in footer sums four entry categories across *all* entries. An extension wanting pi-identical totals must implement the `getSessionStats()` scan itself — the helpers `createUsageTotals`/`addUsageToTotals` are internal to `dist/core` and are not re-exported for extensions (only reachable by deep import).
4. **`ctx.thinkingLevel` is optional** and only "when provided by the session runtime"; the built-in footer reads `session.state.thinkingLevel` with an `"off"` fallback and gates display on `model.reasoning`. Extensions should mirror the fallback and the `reasoning` gate.
5. **HStack double render**: `HStack.render` renders each child once at full width to measure intrinsic size, then again at the allocated width (`h-stack.js`). With explicit `basis` on every entry the measurement still happens — children whose `render` is expensive should cache by width.
6. Public docs at https://pi.dev/docs/latest/ mirror the installed `docs/` tree; this report cites the installed v1.5.0 files, which are authoritative for the installed runtime.
