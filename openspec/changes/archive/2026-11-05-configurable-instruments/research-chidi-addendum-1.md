# Chidi addendum 1 — configurable-instruments council

Two resolutions examined:

- **Repo resolution:** `/Users/joelleibow/Projects/pi-jefferson/node_modules/@earendil-works/pi-coding-agent` = **1.4.0**, with pi-tui **1.4.0** at `/Users/joelleibow/Projects/pi-jefferson/node_modules/@earendil-works/pi-tui`.
- **Global resolution:** `/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent` = **1.5.0**, with pi-tui **1.5.0** at `.../pi-coding-agent/node_modules/@earendil-works/pi-tui`.

Below, `$PJ` is the repo 1.4.0 package root and `$PI` the global 1.5.0 package root; `$PT14`/`$PT15` are the two pi-tui roots.

---

## Q1 — The extension event set and turn boundaries

**Source:** `dist/core/extensions/types.d.ts` (`ExtensionAPI.on(...)` overloads and the event interfaces). The 1.4.0 overload list lives at `$PJ/dist/core/extensions/types.d.ts:1187–1227`; the 1.5.0 list at `$PI/dist/core/extensions/types.d.ts:1210–1250`. A full `diff` of the two `types.d.ts` files yields only seven hunks, none touching any event interface or `on(...)` overload (the hunks add `KeybindingHints`, a `blocked` option on `custom()`, `KeybindingHints` bases on the three render contexts, and `messageId`/`timestamp` on `MessageRenderOptions`). **The event set and every event payload below are byte-identical between 1.4.0 and 1.5.0.**

### The complete subscribable set (40 `on(event: ...)` overloads, both versions)

Session lifecycle:

- `project_trust` — `ProjectTrustEvent { type: "project_trust"; cwd: string }`; handler type `ProjectTrustHandler` returns `ProjectTrustEventResult { trusted: "yes" | "no" | "undecided"; remember?: boolean }` and receives a restricted `ProjectTrustContext`.
- `resources_discover` — `ResourcesDiscoverEvent { type: "resources_discover"; cwd: string; reason: "startup" | "reload" }`; may return `ResourcesDiscoverResult { skillPaths?; promptPaths?; themePaths? }`.
- `session_start` — `SessionStartEvent { type: "session_start"; reason: "startup" | "reload" | "new" | "resume" | "fork"; previousSessionFile?: string }`.
- `session_info_changed` — `SessionInfoChangedEvent { type: "session_info_changed"; name: string | undefined }`.
- `session_before_switch` — `SessionBeforeSwitchEvent { type: "session_before_switch"; reason: "new" | "resume"; targetSessionFile?: string }` (cancellable via result).
- `session_before_fork` — `SessionBeforeForkEvent { type: "session_before_fork"; entryId: string; position: "before" | "at" }` (cancellable).
- `session_before_compact` — `SessionBeforeCompactEvent { type; preparation: CompactionPreparation; branchEntries: SessionEntry[]; customInstructions?: string; reason: "manual" | "threshold" | "overflow"; willRetry: boolean; signal: AbortSignal }` (cancellable/customizable).
- `session_compact` — `SessionCompactEvent { type; compactionEntry: CompactionEntry; fromExtension: boolean; reason: "manual" | "threshold" | "overflow"; willRetry: boolean }`.
- `session_compact_failed` — `SessionCompactFailedEvent { type; reason: "manual" | "threshold" | "overflow"; errorMessage?: string; aborted: boolean; willRetry: boolean; fromExtension: boolean }`.
- `session_shutdown` — `SessionShutdownEvent { type; reason: "quit" | "reload" | "new" | "resume" | "fork"; targetSessionFile?: string }`.
- `mcp_servers_change` — `McpServersChangeEvent { type; servers: RegisteredMcpServer[] }`.
- `session_before_tree` — `SessionBeforeTreeEvent { type; preparation: TreePreparation; signal: AbortSignal }` (cancellable).
- `session_tree` — `SessionTreeEvent { type; newLeafId: string | null; oldLeafId: string | null; summaryEntry?: BranchSummaryEntry; fromExtension?: boolean }`.

LLM context / provider pipeline:

- `context` — `ContextEvent { type: "context"; messages: AgentMessage[] }`; result `ContextEventResult { messages?: AgentMessage[] }`. Doc comment: fired before each LLM call; pi restores prompt/tool state after the handler.
- `context_with_system` — `ContextWithSystemEvent { type: "context_with_system"; messages: AgentMessage[] }`; the handler owns prompt and tool declarations in the result.
- `cache_warming_decision` — re-exported from `dist/core/cache-warmer.d.ts`: `CacheWarmingDecisionEvent extends Pick<CacheWarmingDecision, "warmCost" | "missCost" | "continuationProbability" | "action"> { type: "cache_warming_decision" }`; result can override `action`.
- `before_provider_request` — `BeforeProviderRequestEvent { type; payload: unknown }` (can replace payload).
- `before_provider_headers` — `BeforeProviderHeadersEvent { type; headers: ProviderHeaders }` (mutated in place; `null` deletes a header; return ignored).
- `after_provider_response` — `AfterProviderResponseEvent { type; status: number; headers: Record<string, string> }`.
- `provider_stream_event` — `ProviderStreamEvent { type; provider: ProviderId; api: Api; model: string; data: unknown }`.

Agent loop and turn/message boundaries:

- `before_agent_start` — union `BeforeAgentStartUserEvent { type: "before_agent_start"; messageType: "user"; systemPrompt; systemPromptOptions; prompt: string; images?: ImageContent[] }` | `BeforeAgentStartCustomEvent { ...; messageType: "custom"; message: CustomMessage }`.
- `agent_start` — `AgentStartEvent { type: "agent_start" }`.
- `agent_end` — `AgentEndEvent { type: "agent_end"; messages: AgentMessage[] }`.
- `agent_before_settle` — `AgentBeforeSettleEvent extends BoundaryState { type: "agent_before_settle" }`; `BoundaryState` is `{ entries: SessionBoundaryDraft[]; continue: boolean; context: BoundaryContextPreview; outcome: "completed" | "aborted" | "error" }`; result `BoundaryResult { entries?; continue? }` can append draft entries.
- `agent_settled` — `AgentSettledEvent { type: "agent_settled"; aborted: boolean }`.
- `ui_prompt_start` / `ui_prompt_end` — `{ type; reason: "ui_prompt"; kind: "select" | "confirm" | "input" | "editor" | "custom"; title?: string }`.
- `turn_start` — `TurnStartEvent { type: "turn_start"; turnIndex: number; timestamp: number }`.
- `turn_end` — quoted verbatim:

```ts
/** Fired at the end of each turn */
export interface TurnEndEvent extends BoundaryState {
    type: "turn_end";
    turnIndex: number;
    message: AgentMessage;
    toolResults: ToolResultMessage[];
    messageEntryId: string;
    toolResultEntryIds: string[];
}
```

- `message_start` — `MessageStartEvent { type: "message_start"; message: AgentMessage }` ("Fired when a message starts (user, assistant, or toolResult)").
- `message_update` — `MessageUpdateEvent { type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }`.
- `message_end` — `MessageEndEvent { type: "message_end"; message: AgentMessage }`.

Tools, model, input:

- `tool_execution_start` — `{ type; toolCallId: string; toolName: string; args: any; parentToolCallId?: string }`.
- `tool_execution_update` — adds `partialResult: any`.
- `tool_execution_end` — `{ type; toolCallId; toolName; result: any; isError: boolean; durationMs?: number; parentToolCallId?: string }`.
- `tool_call` — union over `BashToolCallEvent | PowerShellToolCallEvent | ReadToolCallEvent | EditToolCallEvent | WriteToolCallEvent | GrepToolCallEvent | FindToolCallEvent | LsToolCallEvent | CustomToolCallEvent`, each `ToolCallEventBase { type: "tool_call"; toolCallId: string; parentToolCallId?: string }` plus a literal `toolName` and typed `input`; can block. (`isToolCallEventType` guards exported.)
- `tool_result` — mirror union; base is `ToolResultEventBase { type: "tool_result"; toolCallId; parentToolCallId?; input: Record<string, unknown>; content: (TextContent | ImageContent)[]; structuredContent?: JsonValue; isError: boolean; usage?: Usage }`; built-ins narrow `details`, custom tools get `details: unknown`. Can modify the result.
- `model_select` — `ModelSelectEvent { type; model: Model<any>; previousModel: Model<any> | undefined; source: "set" | "cycle" | "restore" }`.
- `thinking_level_select` — `ThinkingLevelSelectEvent { type; level: ThinkingLevel; previousLevel: ThinkingLevel }`.
- `user_bash` — `UserBashEvent { type; command: string; excludeFromContext: boolean; cwd: string }`.
- `input` — `InputEvent { type; text: string; images?: ImageContent[]; source: "interactive" | "rpc" | "extension"; streamingBehavior?: "steer" | "followUp" }`; result can `continue`, `transform` (new text/images), or `handled`.

The umbrella union `ExtensionEvent` (`types.d.ts:1081` in 1.4.0) lists exactly these.

### Turn-boundary / entry-appended events

Yes, on both counts:

1. **Turn boundary exists:** `turn_start` and `turn_end`, plus the coarser `agent_start`/`agent_end`/`agent_before_settle`/`agent_settled` and the per-message `message_start`/`message_update`/`message_end`. Per the docs (`docs/extensions.md`, identical section in both versions), "`turn_end` runs after the assistant and tool-result messages have been persisted and before the low-level `turn_end` event."
2. **An event payload does identify the session entries it appended:** `TurnEndEvent.messageEntryId: string` and `TurnEndEvent.toolResultEntryIds: string[]` are the persisted entry ids of the turn's assistant message and its tool results. Related entry-identifying payloads elsewhere: `SessionCompactEvent.compactionEntry: CompactionEntry`, `SessionTreeEvent.summaryEntry?: BranchSummaryEntry`, `SessionBeforeForkEvent.entryId: string`, and `SessionTreeEvent.newLeafId`/`oldLeafId`. Note the boundary-draft events (`turn_end`, `agent_before_settle` via `BoundaryState.entries`) carry *drafts* (`SessionBoundaryDraft` = `custom | custom_message | context_edit | compaction`) that are appended after handlers run; the drafts themselves have no ids — only `turn_end`'s `messageEntryId`/`toolResultEntryIds` are ids of already-persisted entries. `message_start`/`message_end`/`agent_end` carry `AgentMessage` objects, **not** session-entry ids.

**1.4.0 ↔ 1.5.0 differences for Q1: none.** The diff is limited to the seven hunks listed above (keybinding-hint plumbing and renderer-context additions).

---

## Q2 — pi-tui's `replaceControlCharacters`

**Exact signature** (`$PT15/dist/utils.d.ts:19–20`):

```ts
/** Replace each run of C0 and C1 control characters (ESC, BEL, newlines, ...) with one space. */
export declare function replaceControlCharacters(str: string): string;
```

**Implementation** (`$PT15/dist/utils.js:330–334`):

```js
const CONTROL_CHARACTERS = /[ --]+/g;
/** Replace each run of C0 and C1 control characters (ESC, BEL, newlines, ...) with one space. */
export function replaceControlCharacters(str) {
    return str.replace(CONTROL_CHARACTERS, " ");
}
```

That is, verbatim: `const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]+/g; return str.replace(CONTROL_CHARACTERS, " ");`

- **Which characters:** all of C0 (`U+0000`–`U+001F` — includes `\t` U+0009, `\n` U+000A, `\r` U+000D, BEL U+0007, ESC U+001B), DEL (`U+007F`), and C1 (`U+0080`–`U+009F`).
- **Replacement:** each *run* (the regex has `+`) becomes exactly one space. So `"\r\n\t"` (one contiguous run) collapses to a single `" "`, not three; two control runs separated by printable text each become one space. It does not collapse runs of resulting spaces with surrounding printable spaces the way pi's own footer helper does (`sanitizeStatusText` in `$PJ`/`$PI` `dist/modes/interactive/components/footer.js` additionally runs `.replace(/ +/g, " ").trim()`).
- **It is not escape-sequence-aware:** it operates character-wise, so applied to styled text it would replace the ESC byte of an ANSI sequence with a space and leave the printable remainder (e.g. `\x1b[0m` → `" [0m"`). It is a sanitizer for raw text, not for ANSI-styled strings.

**Export status:** In pi-tui **1.5.0** it is exported from the package index — `$PT15/dist/index.d.ts:35` and `$PT15/dist/index.js:49` both list it: `export { getOsc8LinkAtColumn, replaceControlCharacters, sliceByColumn, stripTerminalSequences, truncateToWidth, visibleWidth, wrapTextWithAnsi, } from "./utils.ts"` (`.js` at runtime). Both pi-tui `package.json` files have **no `exports` map** at all (`main: "dist/index.js"`, `types: "./dist/index.d.ts"`; `node -p ...package.json.exports` → `undefined`), so index export is the whole story for package-root imports.

**The 1.4.0/1.5.0 difference that matters here:** pi-tui **1.4.0 does not have `replaceControlCharacters` at all.** It is absent from `$PT14/dist/utils.d.ts`, `$PT14/dist/utils.js`, and from the index export line (`$PT14/dist/index.d.ts:35` / `dist/index.js:49`, which export only `getOsc8LinkAtColumn, sliceByColumn, stripTerminalSequences, truncateToWidth, visibleWidth, wrapTextWithAnsi`). It was added in 1.5.0. So the proposal's claim that "pi-tui exports no helper for that" is **true at the repository's resolved 1.4.0 and false at the globally installed 1.5.0**.

**For contrast, `stripTerminalSequences`** (identical in both versions — `$PT14/dist/utils.js:268–284` and `$PT15/dist/utils.js:268–284`): doc comment "Remove ANSI, OSC, and APC control sequences while preserving visible text." Implementation: if the string contains no `\x1b` it is returned unchanged; otherwise it walks the string with `extractAnsiCode` and drops recognized sequences, keeping every other character. `ansiCodeLength` (`utils.js:453–483`) recognizes exactly: CSI sequences `ESC [ …` terminated by `m`, `G`, `K`, `H`, or `J`; and OSC (`ESC ] …`) / APC (`ESC _ …`) sequences terminated by BEL (`\x07`) or ST (`ESC \`). Bare control characters that are not part of such a sequence — including lone `\n`, `\t`, `\r`, BEL — are **preserved** by `stripTerminalSequences`; it removes escape sequences, not control characters. The two helpers are complementary in that sense: `stripTerminalSequences` strips ESC-initiated sequences and leaves raw control bytes; `replaceControlCharacters` replaces raw control bytes and would mangle escape sequences.
