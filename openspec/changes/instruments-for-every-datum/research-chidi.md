# Research Report

## Question and Scope

What does pi expose to an extension that a statusline could show (Q1), what does pi's own footer show and how does it format it (Q2), and what is unavailable or gated in print/JSON/RPC mode, before the first turn, or without project trust (Q3)? Facts only; no instrument recommendations.

**Version caveat (differs from the brief).** Joel's global install is **1.5.2**, not 1.5.0 (`$(npm root -g)/@earendil-works/pi-coding-agent/package.json:3`). I also unpacked the real **1.5.0** tarball (`npm pack @earendil-works/pi-coding-agent@1.5.0`, kept at `/tmp/p150/package`) and compared it with 1.5.2 and the repository's pinned **1.4.0** (`node_modules/@earendil-works/pi-coding-agent`). Everything below holds for all three unless a "Version differences" line says otherwise. Paths are relative to the package root. Line numbers for `footer.js` are identical in 1.4.0, 1.5.0 and 1.5.2. Line numbers for `types.d.ts` are 1.5.2's; 1.5.0's are one lower from roughly line 216 on.

## Sources / Files Examined

- `docs/extensions.md` (sections: lifecycle table ~l.395-410, `ctx.mode`/`ctx.hasUI` l.1171-1177, `ctx.cwd`, `ctx.isProjectTrusted()` l.1197, `ctx.sessionManager` l.1203-1214, `ctx.model`/`thinkingLevel` l.1216-1220, `ctx.getContextUsage()` l.1277, `model_select` l.935, `thinking_level_select` l.963, Widgets/Status/Footer l.2891-2931, Mode Behavior l.3262-3269); `docs/session-format.md` (usage entry l.115-121); `docs/settings.md`; `docs/rpc-extension-ui.md` (not read in full).
- `dist/modes/interactive/components/footer.js` (full, 1.5.2; byte-identical in 1.5.0 and 1.4.0).
- `dist/core/extensions/types.d.ts` (ExtensionContext l.233-273, ContextUsage l.217-223, ExtensionMode l.232, ExtensionUIContext l.~95-215, event interfaces l.595-1060, ExtensionAPI l.1229-1430).
- `dist/core/footer-data-provider.d.ts` (full), `dist/core/session-manager.d.ts` (ReadonlySessionManager l.178, entry types l.5-130), `dist/core/model-registry.d.ts`, `dist/core/model-runtime.d.ts` / `.js`, `dist/core/usage-totals.js`, `dist/core/agent-session.js` (`getContextUsage` l.3607-3640, `autoCompactionEnabled` l.2753), `dist/core/extensions/runner.js` (`noOpUIContext` l.132-, `createContext` l.~620-700), `dist/modes/print-mode.js`, `dist/modes/rpc/rpc-mode.js`, `dist/core/settings-manager.js`, `dist/config.d.ts`, `dist/index.d.ts`.
- `node_modules/@earendil-works/pi-ai/dist/types.d.ts` (Usage l.292, AssistantMessage l.382, Model l.660) and `pi-agent-core/dist/types.d.ts:300` (ThinkingLevel).
- `examples/extensions/custom-footer.ts`.

## Findings

### Q1. Every datum an extension can read for a footer

All reads below happen from a handler/ctx; `footerData` exists **only** inside a `ctx.ui.setFooter(factory)` callback (`types.d.ts:122`), i.e. TUI only. `ExtensionContext` properties are getters resolved at call time (`runner.js` `createContext`, "Context values are resolved at call time"), so a render function can re-read them every frame.

#### 1a. `ExtensionContext` (`types.d.ts:233-273`)

| Datum | Type | How read | Changes in a session? | Announcing event |
|---|---|---|---|---|
| Model | `Model<any> \| undefined` (`id`, `name`, `provider`, `api`, `reasoning`, `contextWindow`, `maxTokens`, `cost`, `input`…; pi-ai `types.d.ts:647-683`) | `ctx.model` (l.247) | Yes (`/model`, Ctrl+P, `pi.setModel()`, login auto-select) | `model_select` (`ModelSelectEvent`: `model`, `previousModel`, `source: "set"\|"cycle"\|"restore"`; l.905). **Not fired when a session is restored** (`extensions.md:935`): read `ctx.model` in `session_start` |
| Thinking level | `ThinkingLevel` = `"off"\|"minimal"\|"low"\|"medium"\|"high"\|"xhigh"\|"max"` (agent-core `types.d.ts:300`); declared **optional** `thinkingLevel?` on ctx (l.254) | `ctx.thinkingLevel`; or `pi.getThinkingLevel()` (l.1345, non-optional) | Yes; clamped to model capabilities | `thinking_level_select` (`level`, `previousLevel`; l.912). A model change that clamps the level fires it before `model_select` (`extensions.md:402`) |
| Working directory | `string` | `ctx.cwd` (l.241); also `ctx.sessionManager.getCwd()` | Changes only when the session is replaced into another cwd (new/resume/fork) | `session_start` (`reason`: startup/reload/new/resume/fork; l.595) and `session_shutdown` |
| Context usage | `ContextUsage \| undefined` = `{ tokens: number\|null; contextWindow: number; percent: number\|null }` (l.217-223) | `ctx.getContextUsage()` (l.268) | Yes, every LLM response and compaction | No dedicated event. Re-read on `turn_end` / `message_end` / `session_compact` / `model_select`. Returns `undefined` when no model or `contextWindow<=0`; `tokens`/`percent` are `null` after a compaction until the next assistant response (`agent-session.js:3607-3640`) |
| Idle flag | `boolean` | `ctx.isIdle()` (l.256) | Yes | `agent_start` / `agent_end` / `agent_settled` |
| Abort signal | `AbortSignal \| undefined` | `ctx.signal` (l.260) | Yes (defined only while streaming) | `agent_start`/`agent_end` |
| Queue | `boolean` only: `ctx.hasPendingMessages()` (l.264). No count or text is exposed | method | Yes | none dedicated; `message_start`/`input` events |
| Project trust | `boolean` | `ctx.isProjectTrusted()` (l.258) | Fixed per cwd/session | `project_trust` (decides trust; l.555) |
| Run mode / UI | `"tui"\|"rpc"\|"json"\|"print"` / `boolean` | `ctx.mode`, `ctx.hasUI` | Fixed | none |
| Scoped models | `readonly ScopedModel[]` (`{model, thinkingLevel?}`), empty when no scoping | `ctx.scopedModels` (l.252) | Yes (`/scoped-models`) | none |
| System prompt | `string` | `ctx.getSystemPrompt()` (l.272) | Yes | `before_agent_start` |
| Model registry | `ModelRegistry` facade | `ctx.modelRegistry` | Yes (login/logout) | none |

#### 1b. `ctx.sessionManager` (`ReadonlySessionManager`, `session-manager.d.ts:178`)

Exactly these methods: `getCwd, getSessionDir, getSessionId, getSessionFile, getLeafId, getLeafEntry, getEntry, getLabel, getBranch, buildContextEntries, buildSessionProjection, getHeader, getEntries, getTree, getSessionName`. **`getEntryCount` is not exposed** (pi's own footer uses it, `footer.js:83`).

| Datum | Type | How read | Changes? | Event |
|---|---|---|---|---|
| Session id | `string` | `getSessionId()` (d.ts:253) | Changes on new/fork/resume | `session_start` / `session_shutdown` |
| Session name | `string \| undefined` | `getSessionName()` (d.ts:284); also `pi.getSessionName()` (types l.1321) | Yes (`/name`, `pi.setSessionName()`; pi normalizes) | `session_info_changed` (`name`; l.603) |
| Session file | `string \| undefined` (undefined for in-memory sessions) | `getSessionFile()` (d.ts:254) | Per session | `session_start` |
| Session dir | `string` | `getSessionDir()` | Per session | `session_start` |
| Header | `SessionHeader`: `id`, `timestamp`, `cwd`, `version?`, `parentSession?` (d.ts:5-12) | `getHeader()` | Per session | `session_start` |
| Entries / branch / leaf | `SessionEntry[]` / `getBranch()` / `getLeafId()` | methods | Append-only; each append moves the leaf | `message_end`, `turn_end`, `session_tree` (`newLeafId`,`oldLeafId`; l.684), `session_compact` |
| Labels | `string\|undefined` | `getLabel(id)` | Yes | none |

Entry union (`session-manager.d.ts:128`): `message, thinking_level_change, model_change, usage, compaction, branch_summary, custom, custom_message, context_edit, label, session_info`.

**Usage (tokens and cost).** There is no `getUsage()` for extensions. Usage is derived by summing entries, as pi's footer does (`footer.js:97-115`) and as `examples/extensions/custom-footer.ts` does:
- `entry.type==="message" && message.role==="assistant"` → `message.usage`;
- `message.role==="toolResult" && message.usage` → nested-LLM-call usage;
- `entry.type==="usage"` (`UsageEntry`: `kind`, `provider`, `model`, `usage`, `note?`; d.ts:36-45; e.g. `"cache_warm"`; `session-format.md:115-121`);
- `compaction` / `branch_summary` entries with `.usage`.

`Usage` (pi-ai `types.d.ts:292-321`): `input, output, cacheRead, cacheWrite, cacheWrite1h?, reasoning?` (subset of `output`), `totalTokens`, `cost{input,output,cacheRead,cacheWrite,total,totalFromProvider?}`. `cost.total` is "provider-reported billed cost when supported, otherwise the catalog estimate" (l.315); `totalFromProvider` says which. Pi's own footer sums only `input, output, cacheRead, cacheWrite, cost.total` (`usage-totals.js:10-16`). Changes after every assistant message; announced by `message_end` / `turn_end` (the entry is in the session by then; `TurnEndEvent` carries `messageEntryId`, `toolResultEntryIds`, l.848-855).

Per-message data on `AssistantMessage` (pi-ai `types.d.ts:382-404`): `provider`, `model`, `responseModel?`, `responseId?`, `thinkingLevel?` (level the loop requested), `providerThinkingLevel?`, `stopReason` (`"pending"|"stop"|"length"|"toolUse"|"error"|"aborted"|"deferred"`), `errorMessage?`, `diagnostics?`, `usage`. For a **virtual model** (`registerVirtualModel`, types l.~1425), `ctx.model` names the virtual model while assistant messages record the physical model and thinking level the router picked (types l.1438-1441). `routedModel` (what pi's footer uses, `footer.js:86,208-212`) is a session property, **not** on `ExtensionContext`.

#### 1c. `footerData` (`ReadonlyFooterDataProvider`, `footer-data-provider.d.ts:62-63`; only inside `ctx.ui.setFooter`)

| Datum | Type | How read | Changes? | Event |
|---|---|---|---|---|
| Git branch | `string \| null` (`null` not a repo; `"detached"` for detached HEAD; d.ts:35-36) | `getGitBranch()` | Yes (watches HEAD / reftable; debounced) | `onBranchChange(cb)` returns unsubscribe (d.ts:39-40); example calls `tui.requestRender()` |
| Extension statuses | `ReadonlyMap<string,string>` keyed by `setStatus` key (d.ts:37-38) | `getExtensionStatuses()` | Yes | none (re-read on render; set through `ctx.ui.setStatus(key, text\|undefined)`, types l.95) |
| Available provider count | `number` (unique providers with available models; scoped models if set) (d.ts:45-46) | `getAvailableProviderCount()` | Yes (model select, scoped-models change, login/logout; set by interactive mode) | none |

Excluded from the read-only view: `setExtensionStatus`, `clearExtensionStatuses`, `setAvailableProviderCount`, `setCwd`, `dispose`. Git beyond the branch is not provided by pi (consistent with the 2026-11-05 ruling).

#### 1d. Events (`ExtensionAPI.on`, `types.d.ts:1229-1269`)

| Event | Payload highlights | Line |
|---|---|---|
| `session_start` | `reason`, `previousSessionFile?` | 595 |
| `session_info_changed` | `name` | 603 |
| `session_before_switch` / `session_before_fork` / `session_before_tree` / `session_tree` | cancellable pairs | 609-690 |
| `session_before_compact` / `session_compact` / `session_compact_failed` | `reason: "manual"\|"threshold"\|"overflow"`, `willRetry`, `compactionEntry` (has `tokensBefore`, `usage?`), `errorMessage?`, `aborted` | 621-655 |
| `session_shutdown` | `reason` quit/reload/new/resume/fork, `targetSessionFile?` | 657 |
| `agent_start` / `agent_end` (`messages`) / `agent_before_settle` / `agent_settled` (`aborted`) | run lifecycle | 764-822 |
| `turn_start` (`turnIndex`,`timestamp`) / `turn_end` (`turnIndex`,`message`,`toolResults`,`messageEntryId`,…) | | 842-855 |
| `message_start` / `message_update` / `message_end` | `message: AgentMessage` | 857-872 |
| `tool_execution_start` / `_update` / `_end` | `toolCallId`, `toolName`, `args`; end: `isError`, `durationMs?`, `parentToolCallId?` | 873-903 |
| `tool_call` / `tool_result` | per-tool typed events | 951-1060 |
| `model_select` / `thinking_level_select` | see 1a | 905-917 |
| `input` | `source: "interactive"\|"rpc"\|"extension"`, `streamingBehavior?: "steer"\|"followUp"` | 930 |
| `user_bash` | `command`, `excludeFromContext`, `cwd` | 918 |
| `ui_prompt_start` / `ui_prompt_end` | `kind`, `title?` | 828-840 |
| `mcp_servers_change` | `servers` | 589 |
| `before_provider_request` / `before_provider_headers` / `after_provider_response` / `provider_stream_event` / `context` / `context_with_system` / `before_agent_start` / `cache_warming_decision` / `resources_discover` / `project_trust` | request-level | 555-760 |

Nothing in this list is a push of context percent or cost; those are re-read after turn/message/compaction events.

#### 1e. Other readable data on `ExtensionAPI` / exports

| Datum | How read | Notes |
|---|---|---|
| Pi version | `import { VERSION } from "@earendil-works/pi-coding-agent"` (`index.d.ts:2`, `config.d.ts:109`: `string`) | Constant, a package export; not on ctx. Also `APP_NAME`, `APP_TITLE`, `CONFIG_DIR_NAME`, `PACKAGE_NAME` (`config.d.ts:105-110`) |
| Active tools | `pi.getActiveTools(): string[]` (types l.~1327); `pi.getAllTools(): ToolInfo[]` | Changes via `pi.setActiveTools`; no change event found |
| Slash commands | `pi.getCommands()` | |
| Effective settings | `pi.getSettings(): Settings` (l.1331), merged global+project | includes `compaction.enabled` (`settings-schema.d.ts:88-96`) |
| Auto-compact state | **No direct property.** Pi's footer reads `session.autoCompactionEnabled` = `settingsManager.getCompactionEnabled()` = `settings.compaction?.enabled ?? default` (`agent-session.js:2753-2754`; `settings-manager.js:643-645`). An extension can read `pi.getSettings().compaction?.enabled`; the default value lives in `SETTINGS_DEFAULTS` (footer assumes `true` before first set, `footer.js:48`) | `/settings` toggle has no extension event |
| Subscription / OAuth | `ctx.modelRegistry.isUsingOAuth(model): boolean` (`model-registry.d.ts:53`); `ctx.modelRegistry.getProvider(id)?.auth.oauth?.isSubscription` (`getProvider` d.ts:~35; `oauth.isSubscription` is on provider config, `types.d.ts` ProviderConfig `oauth.isSubscription?`); `getProviderAuthStatus(provider): AuthStatus`; `getProviderDisplayName(provider)` | `ModelRegistry` facade **does not expose** `isUsingSubscription`; that is on `ModelRuntime` (`model-runtime.d.ts:87`), which pi's footer calls. Pi's footer also hard-codes `provider === "kimi-coding"` as subscription (`footer.js:163-164`); an extension can only match that by provider id |
| Experimental flag ("xp") | none found on ctx/API | `areExperimentalFeaturesEnabled()` is internal (`footer.js:3,186`) |
| MCP servers | `pi.getMcpServers()` | event `mcp_servers_change` |
| Flags | `pi.getFlag(name)` | |
| Event bus | `pi.events` (EventBus) | extension-to-extension |
| Theme | `ctx.ui.theme`, `getAllThemes()`, `getTheme()` | |
| Session labels / custom entries | `getLabel`, `appendEntry`, `customType` entries | |

### Q2. Pi's built-in footer (`dist/modes/interactive/components/footer.js`)

Two lines, plus an optional third. Each line is `theme.fg("dim", …)` except the context percent (colored) and the status line.

**Line 1 (pwd line, l.137-148, 250):**
1. cwd via `formatCwdForFooter(sessionManager.getCwd(), HOME||USERPROFILE)` (l.31-42): path relative to home becomes `~` (exactly home) or `~/sub/dir` (the full path under home, not the basename); a path outside home stays absolute; with no HOME the cwd is shown raw.
2. If `footerData.getGitBranch()` is truthy: append ` (<branch>)` (l.140-143).
3. If `sessionManager.getSessionName()`: append ` • <name>` (l.145-148).
4. Truncated to width with a dim `...` (l.250).

**Line 2 (stats left + model right, l.149-251):** left parts joined by a space, in this order, each only if non-zero (l.151-161):
- `↑<input>` (`usageTotals.input`), `↓<output>`, `R<cacheRead>`, `W<cacheWrite>`, all through `formatTokens`;
- `CH<x.x>%`, the cache hit rate of the **latest assistant message** = `cacheRead / (input+cacheRead+cacheWrite) × 100`, `toFixed(1)`, shown only when `cacheRead>0 || cacheWrite>0` and the rate is defined (l.98-107, 159-161);
- cost (below);
- context (below);
- `• xp` (experimental flag, l.186-188).

Right side (l.190-221): `state.model?.id || "no-model"`. If `model.reasoning`: ` • <thinkingLevel>` or ` • thinking off` when level is `off` (`thinkingLevel || "off"`, l.201-206). If the session has a `routedModel` (virtual model): ` → <physicalId>[ • <level>]` (l.208-212). If `getAvailableProviderCount() > 1` and the model exists: prefix `(<provider>) `, dropped if it does not fit with a minimum 2-space gap (l.214-221). Left is truncated first with `...` (l.194-196); right is truncated with no ellipsis if short on width (l.230-238); right-aligned by padding.

**Context (l.116-136, 170-185):** `contextWindow = contextUsage?.contextWindow ?? state.model?.contextWindow ?? 0`; percent is `contextUsage.percent.toFixed(1)`, or `?` when `percent === null` (after compaction, before the next response). Display `"<pct>%/<formatTokens(window)>"` or `"?/<window>"`, plus ` (auto)` when auto-compaction is enabled (l.172-175). Percent > 90 → `error` colour; > 70 → `warning`; else uncoloured (l.176-184). Note: `contextUsage?.percent !== null` evaluates true when `contextUsage` is undefined, so `?` appears only when `contextUsage` exists with a null percent; with no usage object the display is `0.0%/<window>`.

**Compact count rule (`formatTokens`, l.20-30):**
- `< 1000` → the integer (`count.toString()`)
- `< 10,000` → `(count/1000).toFixed(1) + "k"` (1,234 → `1.2k`)
- `< 1,000,000` → `Math.round(count/1000) + "k"` (**20,400 → `20k`**; 200,000 → `200k`)
- `< 10,000,000` → `(count/1e6).toFixed(1) + "M"` (1,000,000 → `1.0M`)
- otherwise → `Math.round(count/1e6) + "M"`

Boundary artefacts of the rule as written: 9,999 → `10.0k`; 999,500-999,999 → `1000k`. It is a pure function exported from `footer.js` (`export function formatTokens`), but it is not in the public extension API surface I could confirm.

**Cost (l.162-169):** `usingSubscription = model && (model.provider === "kimi-coding" || modelRuntime.isUsingSubscription(model.provider))`. `isUsingSubscription(p)` = `isUsingOAuth(p) && provider(p).auth.oauth?.isSubscription === true` (`model-runtime.js:363-365`). Shown when `usageTotals.cost` is non-zero **or** `usingSubscription`: `$<cost.toFixed(3)>` plus ` (sub)` when subscribed. So under a subscription the cost segment always shows (even `$0.000 (sub)`) and still shows the summed `cost.total` (an estimate or provider-reported value); without a subscription and with zero cost it is omitted.

**Line 3 (l.252-261):** extension statuses from `footerData.getExtensionStatuses()`, sorted by key (`localeCompare`), each `sanitizeStatusText`'d (newline/tab/CR → space, spaces collapsed, trimmed; l.10-16), joined by a space, truncated with dim `...`. Present only when the map is non-empty.

**Caching (l.76-130):** totals and context are recomputed only when session, id, leaf, entry count or limits model changes.

### Q3. The edges

- **Mode matrix** (`extensions.md:3262-3269`; `runner.js:132-` `noOpUIContext`; `print-mode.js:56-62`; `rpc-mode.js:105-145`):
  - **TUI**: everything above is available, including `setFooter` and `footerData`.
  - **RPC**: `hasUI` true. `setStatus` and `setWidget` (string arrays only) are forwarded as `extension_ui_request` messages (`rpc-mode.js:105-135`); `setFooter` is a no-op ("Custom footer not supported in RPC mode", l.141); `setHeader`, `custom()`, `setWorkingIndicator` likewise. So `footerData` (git branch, statuses, provider count) is **never delivered in RPC**. `ctx.*` reads and session events still work.
  - **JSON / print**: `hasUI` false and the UI context is `noOpUIContext` (`setStatus`, `setWidget`, `setFooter` all do nothing; `print-mode.js` calls `bindExtensions({mode:"json"|"print", …})` without a `uiContext`). `ctx.model`, `cwd`, `sessionManager`, `getContextUsage()` and events still work; there is nothing to render into.
- **Before the first turn / at `session_start`:** `ctx.model` may be `undefined` (no model/auth); `getContextUsage()` returns `undefined` when no model or window ≤ 0, and `{tokens:null, percent:null}` after compaction until a post-compaction assistant response. With no assistant messages yet, usage entries sum to zero (pi's footer then hides the token and cost parts but still shows context). `model_select` does not fire for a restored model. `ctx.thinkingLevel` is typed optional ("when provided by the session runtime"). Session name is `undefined` until named. `getSessionFile()` may be `undefined`. `getGitBranch()` is `null` outside a repo.
- **Stale ctx:** every `ctx` getter calls `runner.assertActive()` (`runner.js` createContext). A ctx captured from a session that was replaced (new/resume/fork/reload) throws on use. `session_shutdown` precedes teardown; `session_start` hands a fresh ctx.
- **Project trust:** `ctx.isProjectTrusted()` (types l.258). When the project is untrusted, project-scope settings are not loaded (`settings-manager.js:257-258`, `loadFromStorage(storage, "project", projectTrusted)`), so `pi.getSettings()` reflects only global settings (relevant to `compaction.enabled`). `extensions.md:1197-1199` says to check it before reading project-local extension config. Reading model, cwd, session and usage, and `footerData` needs no permission or trust. `project_trust` handlers decide trust before project resources load.
- **Version differences:**
  - 1.4.0 vs 1.5.0 vs 1.5.2: `footer.js`, `footer-data-provider.d.ts`, `model-registry.d.ts` are identical; the `ExtensionContext`/`ExtensionUIContext` data surface is identical.
  - 1.4.0 → 1.5.x type additions unrelated to data: `KeybindingHints`, `MarkdownMessageType`, `registerMarkdownTransformer(…, options)`, `setWidget`/`custom` `blocked` option.
  - `session-manager.d.ts`: 1.5.2 exports `projectContextEntry`; the 1.4.0 diff is 8 lines (that and a doc comment).
  - 1.5.2 vs 1.5.0: `model-runtime.d.ts` gains `settleCredentialWrites()` (internal); `usage-totals.js` (1.4.0 → 1.5.x) adds `totalFromProvider` to `combineUsage`, in `Usage.cost`.
  - `routedModel` and virtual models are present in the 1.4.0 footer too (identical file).

## Assumptions, Differences, and Unknowns

- **Differs from the brief:** the installed global pi is 1.5.2, not 1.5.0. I verified 1.5.0 from its tarball. For the surface examined, 1.5.0 = 1.5.2 = 1.4.0 except as noted.
- Interpreting "pi's version" as `VERSION` (package export). I did not find it on `ctx`.
- I could not find an extension-readable property for auto-compact state other than `pi.getSettings().compaction?.enabled`; the default (`SETTINGS_DEFAULTS.compaction.enabled`) was not printed here. I did not verify if `getSettings()` in 1.5.0 reflects a live `/settings` toggle in-session (the toggle writes through `settingsManager`, `interactive-mode.js:4230`, which `getSettings` reads from at `agent-session.js:2819`, but I did not run it).
- `ModelRegistry.getProvider(...).auth.oauth.isSubscription` is inferred from the `Provider` type used in the interactive mode (`provider.auth.oauth?.isSubscription`) and the `ProviderConfig.oauth.isSubscription` declaration (`types.d.ts` ~l.1486); I did not open the pi-ai `Provider` declaration to cite its line.
- No change event exists for: active tools, auto-compact toggle, queue length, available provider count, extension statuses, or experimental flag. Not run: nothing was executed in a live pi session (no print/RPC runtime check of the no-op behaviour; evidence is source and docs).
- The queue is a boolean only; pi's own queued-message display (`updatePendingMessagesDisplay`) is not in the footer and its count is not exposed.
- Did not read `docs/rpc-extension-ui.md` in full or `docs/tui.md`.
- Not inspected, by instruction: this repository's code (Eleanor) and its compact-band behaviour (the brief says `20.4k`; pi's rule yields `20k` as shown above).
