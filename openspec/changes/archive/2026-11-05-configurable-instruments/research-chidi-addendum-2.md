# Chidi addendum 2 — configurable-instruments council

Resolutions examined:

- **Repo:** `/Users/joelleibow/Projects/pi-jefferson/node_modules/@earendil-works/pi-coding-agent` = pi **1.4.0**; `/Users/joelleibow/Projects/pi-jefferson/node_modules/@earendil-works/pi-tui` = pi-tui **1.4.0**. Below: `$PJ`, `$PT14`.
- **Global:** `/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent` = pi **1.5.0**; its nested `node_modules/@earendil-works/pi-tui` = pi-tui **1.5.0**. Below: `$PI`, `$PT15`.

Version-identity facts established by direct `diff` while answering: `$PT14/dist/components/stack.js`, `stack.d.ts`, and `h-stack.js` are **byte-identical** to `$PT15`'s; `$PJ/dist/modes/interactive/components/footer.js` is **byte-identical** to `$PI`'s; `$PT14/dist/colors.js` is **byte-identical** to `$PT15`'s. Other diffs are noted per question.

---

## Q1 — Once-built HStack and per-render basis

**How `Stack` stores entry options.** In `stack.js` (identical at both resolutions), the constructor iterates `children` and calls `this.addChild(child.component, child)` for entry-shaped children and `this.addChild(child)` for bare components. `addChild(component, options = {})` does **not** retain the caller's object; it pushes a **fresh internal entry** with the option values copied and normalized:

```js
this.entries.push({
    component,
    ...(options.basis === undefined ? {} : { basis: options.basis }),
    ...(options.grow === undefined ? {} : { grow: normalizeSize(options.grow, 0) }),
    ...(options.shrink === undefined ? {} : { shrink: normalizeSize(options.shrink, 1) }),
    ...(options.minSize === undefined ? {} : { minSize: normalizeSize(options.minSize, 0) }),
    ...(options.maxSize === undefined ? {} : { maxSize: normalizeSize(options.maxSize, Number.MAX_SAFE_INTEGER) }),
    ...(options.visible === undefined ? {} : { visible: options.visible }),
});
```

(`normalizeSize` floors and clamps at ≥ 0.) Note `basis` is copied verbatim, not normalized. So after construction there is no aliasing between the caller's `{ basis, grow, ... }` object and the stored entry.

**Visibility and update routes.** The stored array is declared in `stack.d.ts:20` as `protected readonly entries: StackLayoutEntry[]` — `protected`, and the property binding `readonly` (TypeScript-level only; the array contents and the entry objects' fields are mutable — `StackLayoutEntry` in `layout-node.d.ts` declares `basis?`, `grow?`, etc. as plain mutable fields). There is **no setter, no update method**: the public API surface of `Stack` is exactly `addChild(component, options?)`, `removeChild(component)`, and `clear()` (plus the symbol-keyed method below). So the routes to change `basis` on a once-built `HStack` are:

1. **A type-level cast past `protected`**, e.g. `(stack as unknown as { entries: StackLayoutEntry[] }).entries[i].basis = Math.floor(width / N)`. The `readonly` on the property only forbids reassigning `stack.entries` itself, not mutating the array's elements, so `protected` is the only modifier actually in the way. This is a cast, plainly — there is no typed public route.
2. **The public `[LAYOUT_NODE]()` method** (`stack.d.ts:23`, `stack.js`): it returns `{ type: this.layoutType, entries: this.entries, gap: this.gap, align: this.align }` — the **same array reference and the same entry objects**, typed `readonly StackLayoutEntry[]` in `StackLayoutNode` (`layout-node.d.ts:18`), so writing through it also needs a cast past `readonly`, though not past `protected`. However, `LAYOUT_NODE` is declared in `dist/layout-node.d.ts:2` but is **not exported from the pi-tui package index** (`dist/index.d.ts` at either version exports no `LAYOUT_NODE`, `getLayoutNode`, or `LayoutNode` symbols — grep confirms), so this route requires a deep import of `@earendil-works/pi-tui/dist/layout-node.js`, which resolves because neither pi-tui `package.json` has an `exports` map (`main: "dist/index.js"`, `types: "./dist/index.d.ts"`, `exports: undefined` at both versions).

**Whether the mutation reaches allocation.** Yes. `HStack.render(width)` (`h-stack.js`, identical at both versions) re-reads `this.entries` on every call: `const entries = visibleStackEntries(this.entries, viewport)` — `visibleStackEntries` filters but keeps the **same entry object references** — then `allocateStackSizes(entries, intrinsicWidths, safeWidth, this.gap)` reads `entry.basis` at call time (`entry.basis === undefined || entry.basis === "auto" ? intrinsic : basis`). So writing `basis` onto the stored entry objects before the HStack's render runs (for example in an enclosing `VStack` row component's own `render(width)`, which knows the width) takes effect on that very render, without reconstructing the `HStack`. The entry objects handed to `allocateStackSizes` are the same objects reachable from outside via either route above.

**1.4.0 ↔ 1.5.0 differences for Q1: none.** `stack.js`, `stack.d.ts`, `h-stack.js` are byte-identical.

---

## Q2 — `turn_end` firing conditions and usage accumulation

**What fires `turn_end`.** The extension event is dispatched only from `AgentSession._dispatchTurnEndBoundary(message, toolResults)` (`$PJ/dist/core/agent-session.js:488`; `$PI` equivalent at ~501). It is reached two ways, both rooted in the underlying agent loop's per-turn `turn_end` event: the agent-event forwarder at `$PJ/dist/core/agent-session.js:914` — `else if (event.type === "turn_end") { if (event.message.role === "assistant" && !this._boundaryDispatchedMessages.delete(event.message)) { await this._dispatchTurnEndBoundary(event.message, event.toolResults); } this._turnIndex++; }` — and `_installAgentBoundaryHooks()` (`:524`), which wraps `this.agent.finishTurn` to dispatch the boundary inline. The emit site (`:504–513`):

```js
const boundary = await this._extensionRunner.emitBoundary({
    type: "turn_end",
    turnIndex: this._turnIndex,
    message,
    toolResults,
    messageEntryId,
    toolResultEntryIds,
    outcome: this._lastActivityOutcome,
}, (entries) => this._buildBoundaryContext(entries, "turn_end"));
```

So `turn_end` fires once per agent turn, after that turn's assistant message and tool results have been persisted (the surrounding comment at `:789–794` states: "A turn ends after its assistant message and every tool result has been appended"). It is not fired for any other session mutation.

**Do compaction, branch-summary, and `appendUsage` entries append and advance the leaf without firing `turn_end`?** Yes, all three:

- **Compaction** — `agent-session.js:2297` (manual) and `:2586` (automatic) call `this.sessionManager.appendCompaction(summary, firstKeptEntryId, tokensBefore, details, fromExtension, usage)` and then emit `session_compact` (`:2305`, `:2594`) — not `turn_end`. `appendCompaction` in `session-manager.js` appends via `this._appendEntry(entry)`, and `_appendEntry` (`session-manager.js:815–820`) does `this.fileEntries.push(entry); this.byId.set(entry.id, entry); this.leafId = entry.id; this._persist(entry);` — the leaf advances.
- **Branch summary** — `SessionManager.branchWithSummary` (`session-manager.js:1177–1200`) sets `this.leafId = branchFromId`, then appends a `type: "branch_summary"` entry through the same `_appendEntry` (leaf advances to the new entry). The surrounding navigation flow emits `session_tree`, not `turn_end`.
- **`appendUsage`** — `session-manager.js:864` ("Append model-attributed usage that does not participate in LLM context") builds a `type: "usage"` entry and calls `_appendEntry` (leaf advances). Its in-pi caller, the cache warmer (`$PJ/dist/core/cache-warmer.js:249`: `this.sessionManager.appendUsage("cache_warm", message.provider, message.responseModel ?? message.model, message.usage, ...)`), emits **no extension event at all** around the append — no `turn_end`, nothing. (`cache-warmer.js` is byte-identical between versions.)

Version differences here are immaterial: `agent-session.js` differs in only 4 hunks (stream-function auth marking, active-tool ordering) and `session-manager.js` in 11 (persist-failure rollback inside `_appendEntry`, `pathsEqual` refactoring, single-fd file copy) — none alter the above semantics. The one relevant 1.5.0 change: `_appendEntry` in 1.5.0 wraps `_persist` in try/catch and rolls back `fileEntries`/`byId`/`leafId` on write failure (`$PI/dist/core/session-manager.js:817–831`); 1.4.0 advances the leaf unconditionally.

**How the token totals are accumulated.** In `usage-totals.js` (`addUsageToTotals`, identical at both resolutions):

```js
totals.input += usage.input;
totals.output += usage.output;
totals.cacheRead += usage.cacheRead;
totals.cacheWrite += usage.cacheWrite;
totals.cost += usage.cost.total;
```

The accumulation is **per-field sums of `input`, `output`, `cacheRead`, `cacheWrite`** — **`usage.totalTokens` is never read** by `addUsageToTotals` or by the footer (`footer.js` displays `↑<input> ↓<output> R<cacheRead> W<cacheWrite>` via `formatTokens` plus `$<cost.toFixed(3)>`; there is no single "total tokens" figure in the footer at all). `totalTokens` is summed only by `combineUsage`, which the footer does not use. The cost total is exactly **`usage.cost.total`** summed across entries. (1.5.0's only `usage-totals.js` change adds `totalFromProvider` propagation inside `combineUsage`; `addUsageToTotals` is unchanged. `footer.js` is byte-identical between versions.)

**Categories a `turn_end`-keyed invalidation would miss.** The footer counts four categories (`footer.js`, `getSessionStats()`): `type === "usage"` entries; assistant `message` entries; `toolResult` `message` entries carrying `usage`; and `branch_summary`/`compaction` entries carrying `usage`. Assistant and toolResult message entries are persisted within the turn before `turn_end` fires, so they are covered. The three categories that append **outside any turn boundary** — and therefore would not be reflected by invalidation keyed solely on `turn_end` — are: **`type: "usage"` entries** (e.g. cache-warmer appends, which can land between turns while idle), **`compaction` entries with usage** (manual `/compact`, threshold, and overflow compaction, the latter two mid-run but not at a turn boundary), and **`branch_summary` entries with usage** (tree navigation).

---

## Q3 — Theme validation exports and `theme.style()` input rules

**Root-entrypoint exports** (`dist/index.d.ts`; `dist/index.js` mirrors; neither pi-tui version has an `exports` map — `main: "dist/index.js"`, `types: "./dist/index.d.ts"`):

- `@earendil-works/pi-coding-agent` line 38 (identical at both resolutions): `export { getLanguageFromPath, getMarkdownTheme, getSelectListTheme, getSettingsListTheme, highlightCode, initTheme, Theme, type ThemeAppearance, type ThemeBg, type ThemeColor, type ThemeStyle, type ThemeToken, } from "./modes/interactive/theme/theme.ts";` So: **`Theme` (the class) — exported; `ThemeStyle`/`ThemeColor`/`ThemeBg`/`ThemeToken` types — exported. `THEME_TOKENS` — NOT exported** (it lives in `modes/interactive/theme/theme-tokens.ts`; `theme.d.ts` re-exports only the *types* `ThemeBg`/`ThemeColor`/`ThemeToken` from it). **The `theme` proxy singleton — NOT exported** from the root index. **`parseColor` and `replaceControlCharacters` — NOT exported** from pi-coding-agent's root index (no pi-tui re-export there at all). The whole-file diff of the two root `index.d.ts` versions shows only two additions in 1.5.0: `KeybindingHints` in the line-8 type list and `PackageInstallFailure` in line 16 — nothing theme-related.
- `theme.colors` is a getter on `Theme` instances (`theme.d.ts` / `theme.js` `get colors()`), not a standalone export. It is reachable from a root-exported channel only through a `Theme` instance the host hands the extension — the footer factory's `theme` argument or `ctx.ui.theme` (`$PJ/dist/core/extensions/types.d.ts:179`: `readonly theme: Theme;`).
- `@earendil-works/pi-tui` line 3 (both versions): `parseColor` **is exported** (with `rgbColor`, `indexedColor`, `oklchColor`, `okhslColor`, `mixColors`, etc.). Line 35: **`replaceControlCharacters` is exported only at 1.5.0** (`$PT15/dist/index.d.ts:35` and `dist/index.js:49`); it is entirely absent from 1.4.0 (`$PT14/dist/index.d.ts:35` exports only `getOsc8LinkAtColumn, sliceByColumn, stripTerminalSequences, truncateToWidth, visibleWidth, wrapTextWithAnsi`). `THEME_TOKENS` and `Theme` do not exist in pi-tui at either version.

**`theme.style(text, { fg, bg })` input rules.** The implementation (`$PJ/dist/modes/interactive/theme/theme.js:188–216`, and verified byte-identical in the same region at `$PI` — the only theme.js diffs are the 1.5.0 `CodeHighlighter` addition and an `mdCodeBlock` fallback coloring):

```js
style(text, options) {
    const { fg, bg } = options;
    if (typeof fg === "string" && this.dimTokens.has(fg))
        options = { ...options, dim: true };
    return styleTextWithAnsi(text, fg === undefined
        ? undefined
        : typeof fg === "string"
            ? this.tokenAnsi(this.fgAnsi, fg)
            : foregroundAnsi(fg, this.mode), bg === undefined
        ? undefined
        : typeof bg === "string"
            ? this.tokenAnsi(this.bgAnsi, bg)
            : backgroundAnsi(bg, this.mode), options);
}
```

A **string** `fg`/`bg` is looked up **only** as a theme token name via `tokenAnsi` — there is no `parseColor` fallback anywhere in `style()`, `fg()`, or `bg()`. Non-token colors must be passed as `Color` objects (the non-string branch calls `foregroundAnsi`/`backgroundAnsi`), i.e. they must first go through pi-tui's `parseColor()` (or `rgbColor()`/`indexedColor()`/`oklchColor()`/`okhslColor()`). A raw hex or CSS string placed directly in `fg` — say `"#bf5700"` — takes the string branch and throws. `parseColor` itself (`$PT15/dist/colors.js:58–78`, identical in 1.4.0) accepts a `number` (indexed color), `#rgb`/`#rrggbb` hex, `oklch(...)`, and `okhsl(...)`; anything else (e.g. CSS color names like `"red"`) throws `Invalid color value: <value>`.

**Unknown token and wrong-slot token behavior** — `tokenAnsi` (`theme.js:212–216`, identical at both resolutions):

```js
tokenAnsi(ansi, token) {
    const value = ansi.get(token);
    if (value === undefined)
        throw new Error(`Unknown theme color: ${token}`);
    return value;
}
```

There is no validation or coercion beyond this lookup: an unknown token name **throws `Error: Unknown theme color: <token>`**. A background-only token (a `ThemeBg` such as `selectedBg`) placed in `fg` hits the exact same path and throws the same error, because the constructor populates `this.fgAnsi` only from the foreground-slot record and `this.bgAnsi` only from the background-slot record (`theme.js` constructor: `for (const [token, value] of Object.entries(foregrounds)) this.fgAnsi.set(...)` / `Object.entries(backgrounds)) this.bgAnsi.set(...)`), so a background token is simply not a key in the `fgAnsi` map. TypeScript's `ThemeStyle` (`fg?: ThemeColor | Color; bg?: ThemeBg | Color`, `theme.d.ts`) rejects both mistakes at compile time, but at runtime the only guard is the throw. One asymmetry worth noting: a `fg` string that names a dim token (the theme's `dim`-list tokens) is additionally granted `dim: true` in `style()` and an SGR-2 wrap in `fg()`.

**1.4.0 ↔ 1.5.0 differences for Q3:** `replaceControlCharacters` exported from pi-tui's index only at 1.5.0 (absent in 1.4.0); pi-coding-agent root index adds `KeybindingHints` and `PackageInstallFailure` in 1.5.0; `theme.js`/`theme.d.ts` in 1.5.0 add `CodeHighlighter` and an `mdCodeBlock` color fallback in `getMarkdownTheme`. `style()`, `fg()`, `bg()`, `tokenAnsi()`, the `colors` getter, `parseColor`, and the export status of `THEME_TOKENS`/`Theme`/`theme` are unchanged between versions.
