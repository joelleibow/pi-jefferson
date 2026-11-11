# Research Report — Chidi

## Question and Scope

What pi itself provides and does for the transcript notices drawn when `showCacheMissNotices` is on, so they could be shown in Jefferson's footer for a configurable time and then fade or disappear. Five parts: (1) the notices as drawn, (2) intercepting/suppressing/observing, (3) the events and data an extension gets, (4) timers and repaints, (5) fading in a terminal. Jefferson's own source is out of scope (Eleanor). No design is recommended. `owner-rulings.md` read first: pi is the source of truth, and the change moves the notices from the transcript to the footer with a configurable time.

Installed pi: `@earendil-works/pi-coding-agent` 1.5.2 (`package.json:3`), with `@earendil-works/pi-tui` 1.5.2 (its `package.json:3`). Evidence is the installed `docs/`, `dist/` and `examples/`. No online docs or repository were used, because the installed copy answered everything.

## Sources / Files Examined

Paths are relative to `…/node_modules/@earendil-works/pi-coding-agent/` (called `PI`) unless stated.

- `PI/dist/modes/interactive/interactive-mode.js` (the transcript drawing; abbreviated `IM`)
- `PI/dist/core/cache-stats.js` (`CACHE_TTL_MS`, noise floor, `detectMiss`, `scan`)
- `PI/dist/core/cache-warmer.js` (`formatCacheWarmingUsage`, warm loop, `cache_warming_decision`)
- `PI/dist/core/agent-session.js`, `agent-session-runtime.js`, `session-manager.js`, `settings-manager.js`, `settings-schema.js`, `settings-defaults.js`
- `PI/dist/core/extensions/{types.d.ts,loader.js,runner.js}`, `PI/dist/index.d.ts`
- `PI/dist/modes/interactive/components/{footer.js,status-indicator.js,countdown-timer.js,provider-brand.js}`
- `PI/dist/modes/interactive/theme/{theme.js,theme.d.ts,theme-tokens.js,dark.json}`
- `PI/node_modules/@earendil-works/pi-tui/dist/{colors.js,components/loader.js,tui.js,terminal-image.js,index.d.ts}`
- `PI/node_modules/@earendil-works/pi-ai/dist/{types.d.ts,utils/diagnostics.d.ts,providers/model-schema.d.ts}`
- `PI/docs/{extensions.md,settings.md,session-format.md,tui.md,themes.md,models-configuration.md}`, `PI/CHANGELOG.md`
- `PI/examples/extensions/{border-status-editor.ts,titlebar-spinner.ts,custom-footer.ts}`

## Findings

### 1. The notices as pi draws them

All notices are drawn only in `IM` (interactive TUI) as a `Spacer(1)` plus a one-line `ThemedText(…, 1, 0)` appended to `chatContainer`. All are gated by `settingsManager.getShowCacheMissNotices()`; the setting defaults to `false` (`settings-defaults.js:27`, `docs/settings.md:20`).

| Kind | Exact text | Condition | Colour | Drawn at |
|---|---|---|---|---|
| Cache miss | `Cache miss: {N} tokens re-billed` + ` (~$X.XX)` when `missedCost >= 0.01` | A miss survives `detectMiss` (below) **and** `missedTokens >= 20_000 \|\| missedCost >= 0.1` | `warning` | `addCacheMissNotice` `IM:3537-3551` (the 20k/$0.10 gate is `IM:3538`) |
| …after model switch | `Cache miss after model switch: …` | as above, and `modelChanged` | `warning` | `IM:3543-3545` |
| …after Nm idle | `Cache miss after {round(idleMs/60000)}m idle: …` | as above, not model-changed, and `idleMs >= CACHE_TTL_MS` (5 min) | `warning` | `IM:3546-3548`. A model change takes precedence over idle. |
| Cache warmed | `Cache warmed: $<cost>` or `Cache warmed (extension override): $<cost>` | A `usage` entry with `kind:"cache_warm"` is appended. Consecutive warms with the same note collapse into one line with the summed cost, only while that line is still the last chat child. | `dim` | `addCacheWarmingUsage` `IM:3457-3472`; text from `formatCacheWarmingUsage` `PI/dist/core/cache-warmer.js:273-277` (`toFixed(6)`, trailing zeros trimmed to at least 3 decimals) |
| Compaction usage | `Compaction: {tokens} tokens billed` + ` (~$X.XX)` when `usage.cost.total >= 0.01` | The compaction entry or result carries `usage`. `tokens = input+output+cacheRead+cacheWrite`, formatted by `formatTokens` (`PI/dist/modes/interactive/components/footer.js:20-31`). | `warning` | `addCompactionCostNotice` `IM:3477-3486` |
| Branch summary usage | `Branch summary: {tokens} tokens billed` + same cost suffix | A `branch_summary` entry has `usage` and yields a context message | `warning` | same function; reached only from `renderSessionEntries` `IM:3450-3452` |
| Dropped thinking | `Anthropic dropped {n} thinking block(s) (details in session)` | `message.diagnostics` has type `anthropic_input_transformations` whose `details.transformations` holds `thinking_dropped` entries. The notice shows only if the count exceeds that of the branch's last persisted assistant message. | `warning` | `countDroppedThinkingBlocks` `IM:3487-3500`; `maybeShowThinkingDropNotice` `IM:3501-3523` |

**Miss detection** (`PI/dist/core/cache-stats.js`):
- `CACHE_TTL_MS = 5*60*1000` (line 5). `NOISE_FLOOR_TOKENS = 1024` (line 7, **not exported**). The constants are checked at line 24 (`missedTokens <= 1024` is discarded).
- `detectMiss` (14-41): `promptTokens = input+cacheRead+cacheWrite`. It returns nothing on the first turn or after a reset, when `promptTokens <= 0`, or when the turn has zero cache activity and no cache was ever reported earlier (line 20).
- `missedTokens = min(prev.promptTokens, promptTokens) − usage.cacheRead` (line 23).
- `missedCost = missedTokens × max(0, paidPerToken − readPerToken)` (37). `paidPerToken = (cost.input+cost.cacheWrite)/(input+cacheWrite)` from the message's own cost breakdown (30-31). `readPerToken` is `cost.cacheRead/cacheRead`, or, if `cacheRead` is 0, the model's `cost.cacheRead/1_000_000` from `models.getModel(provider, model)` (32-34).
- `idleMs = max(0, message.timestamp − prev.timestamp)` (38). `message.timestamp` is the **request start** in ms (`pi-ai/dist/types.d.ts:405-406`). For a previous cache-warm entry, `prev.timestamp = Date.parse(entry.timestamp)` (line 72), which is an entry ISO time. `modelChanged` compares `provider/model` keys (39).
- `scan` (54-89): a `compaction` or `branch_summary` entry resets `prev` (59-65), so no miss is counted across them. Model switches are not exempt. A `usage`/`cache_warm` entry becomes the new `prev` (66-76). Only `message` entries with `role === "assistant"` are scanned (77).

**Persistence and re-derivation:**
- Cache miss notices are **not persisted**; `IM:3343-3347` says so and re-derives them with `collectCacheMisses(sessionManager.getEntries(), session.modelRuntime)`. They are injected after the assistant message that paid for them, and skipped when `stopReason` is `aborted` or `error` (`IM:3402-3406`).
- Cache warms are persisted as `usage` entries (`session-manager.js:876-890`, `cache-warmer.js:188`) and redrawn on rebuild (`IM:3443-3445`, `3357-3359`).
- Compaction and branch-summary usage is persisted on the entry (`CompactionEntry.usage`, `BranchSummaryEntry.usage`, `session-manager.d.ts:54,66`). The notice is derived at draw time and "not stored as a separate session entry" (`IM:3473-3476`). It is rebuilt at `IM:3450-3452` and requires `messages.length > 0`.
- Dropped-thinking: the `diagnostics` live on the persisted assistant message, but the notice is shown **only live** at `message_end` (`IM:3010`). `renderSessionItems` has no call to it, so it is **not re-derived** on reopen.
- Toggling the setting in `/settings` calls `rebuildChatFromMessages()` (`IM:4316-4319`), re-deriving everything above.

**When each is drawn live:**
- `message_end` (assistant, not aborted/error): thinking-drop then cache-miss, in that order (`IM:3010-3011`, inside `case "message_end"` at `IM:2977`).
- Warm: `entry_appended` event with `kind:"cache_warm"` (`IM:2890-2893`), fired from `cacheWarmer.onWarmed` (`agent-session.js:213`; `cache-warmer.js:188-189`).
- Compaction: `compaction_end` with `event.result.usage` (`IM:3112-3127`), and the boundary-compaction `entry_appended` path (`IM:2898-2915`).
- Branch summary: only by whole-chat rebuild after `/tree` navigation (`IM:4860-4862`, `renderInitialMessages`), and the summary entry's `usage` goes through `IM:3450`.

**Public exports.** None of `detectCacheMiss`, `computeCacheWaste`, `collectCacheMisses`, `CACHE_TTL_MS`, `formatCacheWarmingUsage` or the noise floor is exported. `PI/dist/index.d.ts` references the cache modules only at line 5 (`export type { CacheWarmingDecision, CacheWarmingStatus } from "./core/cache-warmer.ts"`). `grep` of `index.d.ts`/`index.js` for those names finds nothing. `InteractiveMode` is exported (`index.d.ts`) but its methods are not a hook. `package.json` `main` is `./dist/index.js`; I did not read its `exports` map beyond confirming `main`, so a deep import path is unverified.

### 2. Intercepting, suppressing, observing

- **No extension API intercepts or suppresses these transcript notices.** There is no event, hook or option for them in `PI/dist/core/extensions/types.d.ts`; `showCacheMissNotices` appears in `dist` only in settings files, `settings-selector`, and `interactive-mode.js`. The notice code is in `InteractiveMode` private methods, called directly from the session-event switch (`IM:2977-3016`, `2883-2921`, `3095-3129`), after extension handlers have run.
- **Observing is possible only indirectly**, by recomputing from the same data (part 3). The internal `entry_appended` event (`agent-session.js:213, 531, 694, 927, 2883`) is `session.subscribe`-level, not in the extension event union (`types.d.ts:1101`); `grep entry_appended core/extensions/` finds nothing.
- **Fact about `message_end`:** handlers may return `{ message }` and the host mutates the finalized message in place (`agent-session.js:938-951`), so the replacement is what the UI and the persisted entry then see. This would change persisted data and session totals as well as the notice; it is noted only as the one mutation path that reaches the notice inputs.
- **Reading the setting.** `pi.getSettings()` returns a `structuredClone` of the effective merged settings (`docs/extensions.md:2134-2136`; `settings-manager.js:329-331`; `loader.js:347-350`, which calls `assertActive`). `setShowCacheMissNotices` writes `globalSettings` and `save()` re-merges `this.settings` immediately (`settings-manager.js:766-769, 474-475`), so a fresh `getSettings()` call sees a `/settings` toggle at once. The value is the **raw** field: it is `undefined` when never set, and pi applies the default `false` itself (`getShowCacheMissNotices`, `settings-manager.js:747-749`). No settings-changed event for extensions was found (grep of `types.d.ts` for settings-change events found none).

### 3. Events and data an extension gets

| Notice | Event / data | Evidence |
|---|---|---|
| Cache miss | `message_end` with `event.message` (an `AssistantMessage`) plus `ctx.sessionManager.getEntries()` and `ctx.modelRegistry` | `types.d.ts:868-871`; `docs/extensions.md:752-786` |
| Compaction | `session_compact` (`compactionEntry` with `usage`, `fromExtension`, `reason`, `willRetry`), emitted after `appendCompaction` | `types.d.ts:633-641`; `agent-session.js:2393-2404, 2682-2693`; `docs/extensions.md:559-564` |
| Branch summary | `session_tree` (`newLeafId`, `oldLeafId`, `summaryEntry` as a `BranchSummaryEntry` with `usage`, `fromExtension`), emitted after the summary entry is appended | `types.d.ts:684-690`; `agent-session.js:3485-3516`; `docs/extensions.md:596-598` |
| Cache warm | **No event carries a completed warm.** `cache_warming_decision` fires **before** each refresh with `warmCost`, `missCost`, `continuationProbability`, `action` only (`types.d.ts:1244`; `cache-warmer.d.ts:10-12`; `docs/extensions.md:912-929`); it is not an after-warm signal. The completed warm is only a session `usage` entry with `kind:"cache_warm"`, `provider`, `model`, `usage`, optional `note: "extension override"`, ISO `timestamp` (`session-manager.js:876-890`, `cache-warmer.js:187-189`, `docs/session-format.md:113-121`). The only after-the-fact path is reading `getEntries()`/`getLeafEntry()` later. | as cited |
| Dropped thinking | `message_end` payload's `message.diagnostics` (`{type, timestamp, error?, details?}`, `pi-ai/dist/utils/diagnostics.d.ts`); the count logic is in `IM:3487-3500` | as cited |

**`message_end` details:**
- `AssistantMessage` fields available: `provider`, `model`, `responseModel?`, `diagnostics?`, `usage`, `stopReason`, `timestamp` (request start, ms), `errorMessage?` (`pi-ai/dist/types.d.ts:382-406`).
- `usage` has `input`, `output`, `cacheRead`, `cacheWrite`, `cacheWrite1h?`, `reasoning?`, `totalTokens` and `cost {input, output, cacheRead, cacheWrite, total, totalFromProvider?}` (`types.d.ts:292-317`).
- **Not yet persisted when it fires.** Order in `agent-session.js:810-830`: extension handlers first (`_emitExtensionEvent`, line 811), then public listeners including the TUI (`_emit`, 812), then `sessionManager.appendMessage` (816-829). `detectCacheMiss`'s own comment says "`entries` must not yet contain `message` (message_end fires before persistence)" (`cache-stats.js:107`), and `IM:3508-3509` repeats it for the thinking-drop check. So in an extension's `message_end` handler `ctx.sessionManager.getEntries()` and `getBranch()` end at the previous message.
- `message_end` also fires for user, tool-result and custom messages (`docs/extensions.md:756`); the pi TUI skips user messages (`IM:2978`).

**Reading entries and prices:**
- `ctx.sessionManager` is read-only: `getEntries()`, `getEntry()`, `getBranch()`, `getLeafEntry()`, `buildContextEntries()`, `buildSessionProjection()` and more (`docs/extensions.md:1203-1214`). Entry shapes: `UsageEntry`, `CompactionEntry`, `BranchSummaryEntry` (`session-manager.d.ts:36-70`; `docs/session-format.md`). `docs/session-format.md:121` says unknown usage `kind` values should be treated as normal usage.
- `ctx.modelRegistry` (`ModelRegistry`) has `find(provider, modelId)`, `getAll()`, `getAvailable()` (`model-registry.d.ts:27-31`). `Model.cost` has `input/output/cacheRead/cacheWrite` plus optional `tiers` (`model-schema.d.ts:37-49`). Units are USD per million tokens (`docs/models-configuration.md:41-44`; pi divides `cacheRead` by `1_000_000`, `cache-stats.js:34`). Pi itself uses `ModelRuntime.getModel(provider, model)` (`model-runtime.d.ts:71`), which is the object `detectMiss` receives; whether `ctx.modelRegistry.find` returns the same prices as that runtime path was not checked.
- Pi's own fallback `readPerToken` comes from the model's price only when the message's `cacheRead` is 0; otherwise the per-token rates come from the message's own `usage.cost` breakdown (`cache-stats.js:30-34`).

### 4. Time

- **Extensions may repaint from their own timer.** `docs/tui.md:28`: "After changing component state, invalidate the affected component and call the injected `tui.requestRender()`. The TUI coalesces render requests." The `setFooter` factory receives `tui` (`types.d.ts:122-124`). Throttle: `MIN_RENDER_INTERVAL_MS = 16` (`pi-tui/dist/tui.js:193, 693-711`).
- **Pi's own timed repaints:**
  - `Loader` (pi-tui): `setInterval` at 80 ms by default, each tick calls `updateDisplay` which calls `ui.requestRender()` (`pi-tui/dist/components/loader.js:3, 53-62, 67-74`); `stop()` clears it (32-37). Not `unref`'d.
  - `CountdownTimer`: 1 s `setInterval`, `tui.requestRender()` per tick, `dispose()` clears (`countdown-timer.js`).
  - Provider brand animation: `startBrandAnimation` runs a 50 ms interval that requests a render only while `isAnimating()` holds, is `unref`'d, and returns a stop function (`provider-brand.js:62-71`).
  - Cache warmer's `setTimeout` is `unref`'d (`cache-warmer.js:144-145`).
  - Extension examples: `border-status-editor.ts:85-104` starts a 80 ms `setInterval` on `agent_start`, calls `activeTui?.requestRender()`, and clears it in `agent_settled` and `session_shutdown` (also nulls `activeTui`). `titlebar-spinner.ts:35-57` does the same via `setTitle` and clears on `agent_settled` and `session_shutdown`. `custom-footer.ts` has no timer; it re-renders on `footerData.onBranchChange` and uses `dispose: unsub` (24-31).
  - Doc: working indicator frames with a cadence (`intervalMs`) are an extension-visible timed API (`docs/extensions.md:2902-2914`); timed dialogs via `{ timeout }` (`docs/extensions.md:2840-2862`).
- **Clearing timers.**
  - `docs/extensions.md:254-256`: do not start timers from the factory; start them in `session_start` or the command/tool/event that needs them; "Register an idempotent `session_shutdown` handler to close any session-scoped resources you start."
  - `session_shutdown` reasons: `"quit" | "reload" | "new" | "resume" | "fork"` (`types.d.ts:657-662`; `docs/extensions.md:601-611`).
  - Teardown order for session replacement: `session_shutdown` handlers run, then the host's synchronous `beforeSessionInvalidate` (which calls `resetExtensionUI`), then `session.dispose()` (`agent-session-runtime.js:102-113`; `IM:382-384`).
  - `resetExtensionUI` calls `setExtensionFooter(undefined)`, which calls the custom footer's `dispose()` if present, and clears widgets and statuses (`IM:2015-2045, 2076-2093`). `/reload` from the TUI calls `resetExtensionUI` before reloading (`IM:5510`). For `ctx.reload()`, `agent-session.js:3103-3104` emits `session_shutdown` (reason `reload`) then `oldRunner.invalidate()`; I did not trace whether that path also calls `resetExtensionUI`.
  - After `invalidate()`, any use of a captured `pi`/`ctx` throws the stale-context message (`runner.js:482-489`; `loader.js:117-121`; text at `docs/extensions.md:1471-1480`). `docs/extensions.md:1529-1534`: `ctx.reload()` emits `session_shutdown`, old code "must not assume old in-memory extension state is still valid".
  - Pi's `setFooter` factory-created component is passed `theme` as the global `theme` proxy (`IM:2084`; `theme.js:507-514`), whose identity never changes while the instance behind it is swapped on theme change.

### 5. Fading in a terminal

- **Tokens.** `muted` and `dim` are foreground tokens; `dim` is described as "Very dimmed text (more subtle than muted)" (`theme-tokens.js:25`). Default dark theme: `muted` is `okhsl(229 6% 67%)`, `dim` is `okhsl(229 8% 56%)`, `warning` is `yellow` (`dark.json:7,22-24`). `docs/extensions.md:3218-3224` lists `theme.fg("muted")` as "Secondary text" and `"dim"` as "Tertiary text" (`docs/tui.md:157-172`).
- **Concrete colours and stepping.** `theme.colors` returns concrete `Color` objects for all tokens (`theme.d.ts:67`; `theme.js:167-187`); `docs/tui.md:168` documents it and says to use `mixColors()` "when color math is needed", with theme tokens converted once per theme so concrete colours should be computed outside the render path where possible. `theme.style(text, { fg: token | Color, bg, bold, … })` accepts a concrete `Color` (`theme.d.ts:14-17, 68`; `theme.js:188-200`). Tokens that are the terminal default report the terminal's announced colour, or a guess when it did not (`theme.js:167-178`; `docs/tui.md:168`).
- **Colour helpers (`pi-tui`, importable by extensions per `docs/extensions.md:157-166`):**
  - `mixColors(first, second, amount 0..1, space = "oklch" | "srgb")` (`colors.js:165-180`; throws if `amount` is outside 0..1).
  - `rgbColor`, `indexedColor`, `oklchColor`, `okhslColor`, `parseColor`, `colorToRgb`, `colorToHex` (`colors.js:6-164`).
  - `foregroundAnsi(color, mode)`, `backgroundAnsi`, `styleText`, `styleTextWithAnsi` (`colors.js:224-250`). All re-exported at `pi-tui/dist/index.d.ts:3`.
  - Truecolor vs 256: `getTerminalColorMode()` returns `"truecolor"` or `"256color"` from capabilities (`terminal-image.js:136-138`), and `theme.getColorMode()` exposes the theme's mode (`theme.d.ts:80`). In `"256color"` mode `foregroundAnsi` maps RGB to the nearest of the 6-level colour cube or the 24-step gray ramp (`rgbToAnsi256`, `colors.js:97-98, 199-214, 215-223`). `indexedColor` always emits `38;5;N` regardless of mode. `docs/tui.md:168`: "Pi converts the result to truecolor or 256-color output based on terminal capabilities."
- **What pi already does that reads as a fade or animation:**
  - Dim tokens are approximated by mixing the colour toward the background by 0.4 (`mixColors(color, background, 0.4)`, `theme.js:179-183`), and rendered with SGR 2 faint (`theme.js:190-191, 236`). That is a static dimming, not a time-based step.
  - `openRouterGlow` breathes a colour between `base` and `peak` with a cosine over `GLOW_PERIOD_MS = 2400`, using `mixColors(…, "oklch")` (`provider-brand.js:41-55`); `radiusShimmer` moves a colour gradient with `mixColors(…, "srgb")` and smoothstep (`provider-brand.js:20-37`); both are redrawn by `startBrandAnimation` every 50 ms (`provider-brand.js:62-71`).
  - The documented working-indicator example steps `dim` → `muted` → `accent` → `muted` as frames at 120 ms (`docs/extensions.md:2906-2913`).
  - Pi's own transcript notices do **not** expire or fade: they are appended children of `chatContainer` and stay until the chat is rebuilt (`IM:3549-3550`).

## Assumptions, Differences, and Unknowns

**Differences from the brief's implied assumptions:**
- The brief's list of miss thresholds is incomplete: besides the 1024-token noise floor in `detectMiss`, the notice itself has a second display gate, `missedTokens >= 20_000 || missedCost >= 0.1` (`IM:3538`). `computeCacheWaste` does not apply this second gate (it only sums misses that survived the noise floor, `cache-stats.js:79-83`).
- `idleMs` is start-to-start (`message.timestamp`, request start, minus the previous message's or warm entry's timestamp), not end-to-start (`cache-stats.js:38`; `types.d.ts:405-406`).
- The dropped-thinking notice is live-only; the miss, warm, compaction and branch-summary notices are all rebuilt on reopen or when the setting is toggled.
- Branch-summary notices have no live-event draw of their own; they appear through the full chat rebuild after `/tree` navigation (`IM:4860-4862`).
- A completed cache warm produces no extension event. `cache_warming_decision` is pre-refresh, not post.

**Unknowns / unverified:**
- Whether `ctx.modelRegistry.find(provider, id).cost` equals what pi's internal `ModelRuntime.getModel` returns (I read only the types).
- Whether `ctx.reload()` (as distinct from the `/reload` command) calls `resetExtensionUI` and so disposes the custom footer; I only confirmed `session_shutdown` then `invalidate()` at `agent-session.js:3103-3104`.
- The `package.json` `exports` map was not read beyond `main`, so deep-import paths into `core/cache-stats.js` are unconfirmed (the public barrel `index.d.ts` does not export them).
- No test run was possible; nothing here was executed, only read.
- Render cost of a timer-driven footer repaint, and behaviour in tmux or terminals without truecolor beyond what the code shows, were not measured.

## Addendum 1 — notice strings and the price lookup

Answered for the repository's pi **1.4.0** (`node_modules/@earendil-works/pi-coding-agent/package.json:3`). Paths below are under that package unless marked 1.5.2. Read from source only; nothing executed.

### 1. Exact strings

All in `dist/modes/interactive/interactive-mode.js` (`IM`), colour token `warning`, each preceded by `new Spacer(1)`.

**`addCacheMissNotice` (`IM:3366-3380`)**
- Gate: `if (miss.missedTokens < 20_000 && miss.missedCost < 0.1) return;` (3367).
- Cost suffix: ``const cost = miss.missedCost >= 0.01 ? ` (~$${miss.missedCost.toFixed(2)})` : "";`` (3369). So two decimals, `~` prefix, a leading space, parentheses; omitted when under $0.01.
- ``const reBilled = `${formatTokens(miss.missedTokens)} tokens re-billed${cost}`;`` (3370).
- Label (3371-3377): default `"Cache miss"`; if `miss.modelChanged` then `"Cache miss after model switch"`; else if `miss.idleMs >= CACHE_TTL_MS` then ``Cache miss after ${Math.round(miss.idleMs / 60_000)}m idle``.
- Final text: ``${label}: ${reBilled}`` (3379), e.g. `Cache miss after 7m idle: 184k tokens re-billed (~$0.55)`.

**`addCompactionCostNotice` (`IM:3306-3315`)**
- `tokens = usage.input + usage.output + usage.cacheRead + usage.cacheWrite` (3310).
- ``cost = usage.cost.total >= 0.01 ? ` (~$${usage.cost.total.toFixed(2)})` : ""`` (3311).
- `label = notice.kind === "compaction" ? "Compaction" : "Branch summary"` (3312).
- Text: ``${label}: ${formatTokens(tokens)} tokens billed${cost}`` (3314).

**`maybeShowThinkingDropNotice` (`IM:3330-3352`)**
- `noun = droppedCount === 1 ? "thinking block" : "thinking blocks"` (3349), so it is chosen **by count**, not `block(s)`.
- Text: ``Anthropic dropped ${droppedCount} ${noun} (details in session)`` (3351).
- Shown only when `droppedCount` (3333, counted by `countDroppedThinkingBlocks` 3316-3329) is nonzero and greater than the previous assistant message's count (3347).

**`formatTokens` (`dist/modes/interactive/components/footer.js:20-30`)**
- `count < 1000` → `count.toString()`
- `count < 10000` → `` `${(count / 1000).toFixed(1)}k` ``
- `count < 1000000` → `` `${Math.round(count / 1000)}k` ``
- `count < 10000000` → `` `${(count / 1000000).toFixed(1)}M` ``
- otherwise → `` `${Math.round(count / 1000000)}M` ``
- Worked by those rules: `20000` → `20k`; `184000` → `184k`; `1500000` → `1.5M`. (Derived by hand from the code, not executed.) It is imported into `IM` at line 64.

**Dollar formatting:** `toFixed(2)` for both notices, shown only when the value is `>= 0.01`, as ` (~$X.XX)`. The warm notice uses a different formatter (`formatCacheWarmingUsage`, `toFixed(6)` with trailing zeros trimmed to at least 3 decimals; unchanged from my main report).

**1.5.2 differences:** none in text, gates or formatter. `footer.js` is byte-identical (diff empty), and the three methods read the same. Only line numbers differ: `addCompactionCostNotice` 3477-3486, `countDroppedThinkingBlocks`/`maybeShowThinkingDropNotice` 3487-3523, `addCacheMissNotice` 3537-3551.

### 2. `ctx.modelRegistry.find(...)?.cost` versus `detectMiss`'s fallback

- `detectMiss`'s fallback is `(models.getModel(message.provider, message.model)?.cost.cacheRead ?? 0) / 1_000_000` (`dist/core/cache-stats.js:32-34`), used only when the message's own `usage.cacheRead` is 0.
- `models` is `this.session.modelRuntime` (`IM:3362`, and `3197` for rebuild).
- The extension's `ctx.modelRegistry` is `new ModelRegistry(this._modelRuntime)` (`dist/core/agent-session.js:2983`), built from the **same** `ModelRuntime` instance (`modelRuntime` getter at `agent-session.js:216-217`).
- `ModelRegistry.find(provider, modelId)` is `return this.runtime.getModel(provider, modelId)` (`dist/core/model-registry.js:24-26`); the class comment calls it a "Synchronous compatibility facade exposed to extensions" (`model-registry.js:2-5`).
- `ModelRuntime.getModel` delegates to `this.models.getModel(...)` (`dist/core/model-runtime.js:292-294`).
- So it is the same function and returns the same `Model` object, with the same `.cost` object. Units are USD per million tokens (`docs/models-configuration.md:41-44`), which is why pi divides by `1_000_000`. An extension multiplying `cost.cacheRead` by tokens must divide by 1,000,000 too.
- Caveat: `Model.cost` also may carry optional `tiers` (1.5.2 `model-schema.d.ts:37-49`); `detectMiss` ignores them and uses only `cost.cacheRead`. I did not confirm the `tiers` field in 1.4.0's `pi-ai` (not installed separately in the repo's `node_modules`).
- **1.5.2 difference:** none; `model-registry.js` `find` and `agent-session.js:3079` have the same construction (line shifted).
