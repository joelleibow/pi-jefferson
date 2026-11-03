# Research — Eleanor (codebase reconnaissance)

Change: `session-data-store` · Repository: `/Users/joelleibow/Projects/pi-jefferson` (`main` at `c7ef3a4`, clean tree) · Host read: `@earendil-works/pi-coding-agent` **1.5.0** installed at `/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent` (referred to below as `$HOST`).

Read-only report. No judgment of code quality, no design, no proceed/stop verdict. Absences are recorded as findings.

There is no `CLAUDE.md`, `AGENTS.md`, or `ARCHITECTURE.md` in the repository. The structural contract lives in `openspec/specs/`, `package.json`, `tsconfig.json`, and `.github/workflows/ci.yml`; the closest thing to ADRs is `openspec/changes/archive/` (two archived changes, proposals skimmed for context only).

---

## 1. The repository as it stands

### 1.1 Files and what each owns

| Path | Owns |
|---|---|
| `extensions/jefferson.ts` | The entry — the only module the host loads. Registers the `/jefferson` command and the `session_start` handler; the only module with runtime imports of host packages (`@earendil-works/pi-coding-agent`: `CONFIG_DIR_NAME`, `ExtensionAPI`, `getAgentDir`; `@earendil-works/pi-tui`: `truncateToWidth`, `visibleWidth`). |
| `extensions/jefferson/configuration.ts` | The `pi-jefferson.json` surface: `readConfiguration(source)` → `{ rows, warning }`. Exports `Cell { text }`, `Row { id, cells }`, `ConfigurationSource`, `DEFAULT_CONTAINERS`/`MAX_CONTAINERS` (8), `DEFAULT_CELL_TEXT` (the fixed Lorem placeholder). Imports only `node:` builtins. |
| `extensions/jefferson/row-renderer.ts` | Rendering: `renderRow(row, width, helpers)` and `createFooter(rows, helpers)` → `{ render(width): string[], invalidate(): void }`. Width helpers (`truncateToWidth`, `visibleWidth`) are **injected** by the entry (`WidthHelpers` interface) so this module holds no host runtime import. `GAP = 0`. |
| `tests/jefferson.test.ts` | Entry behavior: one command; footer installed only in TUI mode; re-installed on every `session_start`; trusted-project document wins; rejected config warns + default row; exported surface exposes no contribution interface. Uses fake `pi`/`ctx`, `PI_CODING_AGENT_DIR` temp dirs. |
| `tests/configuration.test.ts` | `readConfiguration` normalization: shapes, containers ceiling/clamp/reject, ids (synthesized `row-N`, duplicates rejected), trust precedence, unparseable document. |
| `tests/row-renderer.test.ts` | Geometry: `floor(W/N)` cells, remainder at right edge, truncation to one line, wide-glyph/ANSI widths, recompute on resize. |

Entry/helper boundary (fixed by `openspec/specs/extension-source-layout/spec.md` and the entry's header comment): `extensions/jefferson.ts` is the single host-loaded entry (`package.json` `pi.extensions` pins `["./extensions/jefferson.ts"]`). Everything else lives in `extensions/jefferson/` (the working-parts directory shares the entry's stem, so imports from the entry must name `./jefferson/<file>.ts`, never bare `./jefferson`). Helpers import each other by relative path (with `.ts` extensions — `allowImportingTsExtensions`) and use `import type` for host types.

### 1.2 The current footer installation and re-installation path

1. Host loads `extensions/jefferson.ts`, calls the default export `jefferson(pi: ExtensionAPI)`.
2. The entry registers the `/jefferson` command and `pi.on("session_start", handler)`.
3. On every `session_start` (any reason), the handler returns early unless `ctx.mode === "tui"`.
4. It resolves configuration: agent document at `join(getAgentDir(), "pi-jefferson.json")`, project document at `join(ctx.cwd, CONFIG_DIR_NAME, "pi-jefferson.json")` read only when `ctx.isProjectTrusted()`; `readConfiguration` normalizes to `rows` plus an optional `warning` (surfaced via `ctx.ui.notify(warning, "warning")`).
5. It calls `ctx.ui.setFooter(() => createFooter(rows, { truncateToWidth, visibleWidth }))`. Note: the factory closure **ignores the three parameters the host passes it** (`tui`, `theme`, `footerData`); cells are fixed Lorem text and nothing reads live data today.
6. Host side (`$HOST/dist/modes/interactive/interactive-mode.js`, `setExtensionFooter`, ~line 2041): disposes the previous custom footer's `dispose?()`, clears `footerContainer`, invokes `factory(this.ui, theme, this.footerDataProvider)`, adds the result, `this.ui.requestRender()`. Passing `undefined` restores the built-in `FooterComponent`.

**Re-registration event:** `session_start` with reason `"reload"` — and also `"new"`, `"resume"`, `"fork"`, `"startup"`. Every session replacement and every `/reload` first clears the custom footer (see §5) and then re-fires `session_start`, and the entry re-runs its install unconditionally (it does not branch on `event.reason`). The test `tests/jefferson.test.ts` ("the footer is re-installed on every session_start") pins this.

---

## 2. The structural contract that constrains new code

From `openspec/specs/extension-source-layout/spec.md`, `openspec/specs/statusline/spec.md`, `package.json`, `tsconfig.json`, `.github/workflows/ci.yml`:

**Forbidden to new source files:**

- **Runtime imports of host packages** (`@earendil-works/*`) anywhere except `extensions/jefferson.ts` (the host-loaded entry). Helper modules may use `import type` only. Host packages must stay in `peerDependencies` with a `*` range and must never appear in `dependencies` (a physical copy bypasses pi's module mapping and duplicates registries; pi warns on such manifests — README "Development").
- **Non-erasable TypeScript**: no `enum`, no parameter properties, no runtime `namespace`, no decorators. Node type-strips and executes the source directly; there is no build step and must not be one (`npm test` fails otherwise). `tsconfig.json`: `target ES2023`, `module/moduleResolution nodenext`, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `allowImportingTsExtensions` (relative imports carry `.ts`), `noEmit`, `include: ["extensions/**/*.ts", "tests/**/*.ts"]` — a shipped file outside those globs fails typecheck conformance.
- **Test location**: tests live under `tests/` only, never beside an extension, and no `*.test.ts` may ship in the tarball (CI asserts this from a real packed tarball).
- **Load-root discipline**: the load root is stated by exactly one mechanism — the manifest `pi.extensions` array, pinned by CI to exactly `["./extensions/jefferson.ts"]`. A stray `.ts` file directly under `extensions/` is the hazard the README warns about ("Pi loads every direct `.ts` file in `extensions/` as an extension"); new modules go under `extensions/jefferson/`.
- **Naming**: a module must be named for the behavior or data it owns; `utils`/`helpers`/`misc`/`common` are forbidden. A new grouping directory must state its membership and dependency rule in the change that adds it.
- **Growth**: an ordinary module under `extensions/jefferson/` following the established pattern needs no manifest/CI/CI-expectation change (CI asserts invariants — allowed roots, entry presence, no tests, exact load root — not an enumerated file list). A new top-level source directory, a second host-loaded entry, or a new kind of module that changes the pinned mechanisms is a named change that must update `package.json` `files`, the manifest, `tsconfig.json`, and the CI expectation together.
- **Manifest/CI implications for this change**: adding e.g. `extensions/jefferson/store.ts` ships automatically (`files: ["extensions", ...]`, everything under `extensions/` is allowed by the CI allowlist) and changes nothing pinned. The `statusline` spec additionally fixes: cells render the fixed placeholder (a "MUST NOT expose a module or contribution interface for cell content" requirement this change supersedes by named-change process), rows are one line, `floor(W/N)` distribution recomputed per render, and the extension owns its own configuration surface (there is no host-provided per-extension settings block).
- CI (`ci.yml`): Node 26, pnpm with frozen lockfile, `pnpm typecheck`, `pnpm test` (`node --test`), plus the tarball/load-contract invariant check described above.

---

## 3. The host data surface (host 1.5.0, read from `$HOST/dist`)

### 3.1 The footer factory's parameters

`ExtensionUIContext.setFooter` (`$HOST/dist/core/extensions/types.d.ts`, `ExtensionUIContext`):

```ts
setFooter(factory: ((tui: TUI, theme: Theme,
  footerData: ReadonlyFooterDataProvider
) => Component & { dispose?(): void }) | undefined): void
```

- **`tui: TUI`** (`@earendil-works/pi-tui` `tui.d.ts`): the live TUI. Notably `requestRender(force?)`, `renderNow(force?)`, `invalidate()` (recursive over children), `setFocus`, overlay APIs, `onTerminalColorSchemeChange`. Cheap to use; valid for the lifetime of the installed footer. **This is the only way a footer component can ask for a redraw** — there is no invalidation callback parameter.
- **`theme: Theme`**: the host's module-level `theme` export, which is a **Proxy over `globalThis[THEME_KEY]`** (`$HOST/dist/modes/interactive/theme/theme.js:507`). Property access always resolves to the current theme instance, so a theme captured at factory time never goes stale. Reading is cheap. It can change mid-session (`/theme`, `ctx.ui.setTheme`, theme-file watcher); the host's `onThemeChange` callback (`interactive-mode.js:817`) calls `this.ui.invalidate()` + `requestRender()`, which recursively calls `invalidate()` on every component **including the custom footer**, then re-renders. `Theme` offers `fg`/`bg`/`bold`/`style`/`colors`/`getThinkingBorderColor`, etc. (`$HOST/dist/modes/interactive/theme/theme.d.ts`).
- **`footerData: ReadonlyFooterDataProvider`**: see §3.2.

The factory's product is a `Component`: `render(width): string[]`, optional `handleInput`/`handleMouse`, and `invalidate(): void` (called on theme change and full invalidations — the current jefferson `Footer` type matches this shape).

### 3.2 The readonly footer data provider

`$HOST/dist/core/footer-data-provider.d.ts`. `ReadonlyFooterDataProvider = Pick<FooterDataProvider, "getGitBranch" | "getExtensionStatuses" | "getAvailableProviderCount" | "onBranchChange">`:

- `getGitBranch(): string | null` — the **only datum with its own change notification**: `onBranchChange(callback): () => void`. The provider owns an fs.watch-based watcher on `.git` HEAD/reftable paths with debounce (`WATCH_DEBOUNCE_MS`), retry timers, and a cached branch value ("detached" for detached HEAD, null outside a repo). Cheap to read (cached); can change mid-session; notifies subscribers.
- `getExtensionStatuses(): ReadonlyMap<string, string>` — texts set by any extension via `ctx.ui.setStatus(key, text)`. Cheap (map reference). Changes mid-session when extensions set/clear statuses; **no subscribe mechanism** — the host just calls `ui.requestRender()` after `setStatus` (`interactive-mode.js:1857`), so a custom footer sees new values on the next frame.
- `getAvailableProviderCount(): number` — a cached count of providers with available models, maintained by the host (`updateAvailableProviderCount`). Cheap; changes when provider availability changes; **no extension-visible notification**.

The mutable halves (`setExtensionStatus`, `setAvailableProviderCount`, `setCwd`, `dispose`) are excluded from the readonly pick.

### 3.3 The extension context (`ExtensionContext`, `$HOST/dist/core/extensions/types.d.ts`)

What a footer-relevant store can reach through a captured `ctx`, with cost / mutability / notification:

| Surface | Cheap? | Changes mid-session? | Notifies? |
|---|---|---|---|
| `ctx.mode`, `ctx.hasUI` | yes | no | — |
| `ctx.cwd` | yes (getter) | yes (session rebind) | no dedicated event |
| `ctx.sessionManager: ReadonlySessionManager` | see §3.4 | entries append; leaf moves | via lifecycle events (§5), not by the manager |
| `ctx.model: Model \| undefined` | yes (getter, resolved at call time) | yes (`/model`) | `model_select` event |
| `ctx.scopedModels: readonly ScopedModel[]` | yes (snapshot) | on scoping/registry change | no dedicated event |
| `ctx.thinkingLevel?: ThinkingLevel` | yes (getter) | yes | `thinking_level_select` event |
| `ctx.isIdle()`, `ctx.hasPendingMessages()`, `ctx.signal` | yes | continuously | `agent_start`/`agent_end`/`agent_settled` events |
| `ctx.isProjectTrusted()` | yes | rarely (trust grant) | `project_trust` event |
| `ctx.getContextUsage(): ContextUsage \| undefined` | **no** — see below | yes (messages, compaction) | no dedicated event; infer from `message_end`, `session_compact` |
| `ctx.compact(options)`, `ctx.abort()`, `ctx.shutdown()`, `ctx.getSystemPrompt()` | n/a (actions) | — | — |
| `ctx.ui: ExtensionUIContext` | cheap accessors | — | `setStatus` triggers a render; theme change invalidates components |
| `ctx.ui.theme: Theme` | yes (same proxy as §3.1) | yes | invalidation via `ui.invalidate()` |

`Model` (from `@earendil-works/pi-ai` `types.d.ts:653`): `id`, `provider`, `contextWindow`, `maxTokens`, `reasoning`, `thinkingLevelMap`, `promptCache`, `samplingParams`, etc.

**`getContextUsage()` cost** (`$HOST/dist/core/agent-session.js:3518`): every call runs `sessionManager.buildSessionProjection()` + `getBranch()`, scans for the latest compaction entry and post-compaction assistant usage, and estimates projected context tokens. It is a full tree walk + token estimate — the most expensive read on the context. The host's own footer therefore calls it **once per cache epoch, not once per render** (§4). Return shape: `{ tokens: number | null, contextWindow: number, percent: number | null }` — `null` right after compaction until the next LLM response.

**Validity of a captured ctx**: each `emit` builds a fresh context object (`runner.js:813`), but its getters delegate to the runner and call `runner.assertActive()` (`runner.js:488`). After reload or session replacement the runner is invalidated and **every access to a previously captured ctx throws**: "This extension ctx is stale after session replacement or reload. Do not use a captured pi or command ctx after ctx.newSession(), ctx.fork(), ctx.switchSession(), or ctx.reload()." (`runner.js:482`). Context values are otherwise resolved at call time, so within one runtime lifetime a captured ctx stays current.

### 3.4 The read-only session manager API

`ReadonlySessionManager = Pick<SessionManager, "getCwd" | "getSessionDir" | "getSessionId" | "getSessionFile" | "getLeafId" | "getLeafEntry" | "getEntry" | "getLabel" | "getBranch" | "buildContextEntries" | "buildSessionProjection" | "getHeader" | "getEntries" | "getTree" | "getSessionName">` (`$HOST/dist/core/session-manager.d.ts:178`).

- The pick is **type-level only**: at runtime the runner holds the full `SessionManager` reference (`runner.js:170,634`); nothing mechanically prevents a cast.
- Cheap, field- or map-backed: `getCwd`, `getSessionDir`, `getSessionId`, `getSessionFile` (`string | undefined` until the first user/assistant message — a file is only created then), `getLeafId`, `getLeafEntry`, `getEntry(id)`, `getLabel(id)`, `getHeader`.
- Copying scans (O(n) allocation per call): `getEntries(): SessionEntry[]` (shallow copy; session is append-only), `getTree()` (defensive copy of all entries as tree nodes), `getBranch(fromId?)`, `buildContextEntries()`, `buildSessionProjection()` (tree walks from the leaf).
- `getSessionName(): string | undefined` — from the latest `session_info` entry; changes on rename; notifies via the `session_info_changed` event.
- **Absence:** `getEntryCount()` — the cheap O(1) count the host's own footer uses for its cache key — **is not in the readonly pick**. An extension must use `getEntries().length` (a full copy) or `getLeafId()` for cheap change detection.
- **No notification surface of its own**: the manager has no subscribe/change API; a store learns of appends from lifecycle events (`message_end`, `tool_execution_end`, `turn_end`, `session_compact`, `session_tree`, `session_info_changed`).

### 3.5 The theme

Covered in §3.1: a proxy singleton, always current, cheap, invalidated host-side on change. `Theme` values can also be read from `ctx.ui.theme` or received as the factory's second parameter — all the same object. Not exported as the `theme` const from the package root (`index.js` exports only the `Theme` class, `initTheme`, and theme helpers); an extension does not need to import it.

---

## 4. How the host's own footer gets the same data

`$HOST/dist/modes/interactive/components/footer.js` (class `FooterComponent`, constructed by `interactive-mode.js:412` as `new FooterComponent(this.session, this.footerDataProvider)` — note it receives the **AgentSession**, not an extension context, so it reaches surfaces extensions cannot).

Per-datum acquisition in `render(width)`:

- **pwd**: `session.sessionManager.getCwd()` each render, `~`-abbreviated by its own `formatCwdForFooter(cwd, home)` helper (uses `process.env.HOME || USERPROFILE`).
- **git branch**: `this.footerData.getGitBranch()` — delegated to the provider's watcher cache (§3.2); appended as `(branch)` to the pwd line.
- **session name**: `session.sessionManager.getSessionName()` — appended as `• name`.
- **usage totals + context usage + cache hit rate**: `getSessionStats()` — the only caching in the file. **Caching key**: `{ session, sessionId, leafId, entryCount, limitsModel }` where `entryCount = sessionManager.getEntryCount()` and `limitsModel = session.routedModel?.model ?? session.model`. On key change it recomputes by scanning **all** `sessionManager.getEntries()` and aggregating: `usage` entries, assistant messages (`input/output/cacheRead/cacheWrite/cost` via `addUsageToTotals`), toolResult usage, and branch-summary/compaction usage; `latestCacheHitRate` from the latest assistant's `cacheRead / (input + cacheRead + cacheWrite)`; context usage from `session.getContextUsage()` (§3.3's expensive call — done once per cache epoch, not per frame). The cache rationale is stated in the file: entries are append-only and every append moves the leaf, so the key changes exactly when the data does.
- **cost / subscription**: `usageTotals.cost`, plus `session.modelRuntime.isUsingSubscription(state.model.provider)` — **host-internal, not reachable from `ExtensionContext`**.
- **model name / thinking level**: `session.state.model?.id`, `state.model.reasoning`, `state.thinkingLevel` — extensions get the equivalents from `ctx.model` / `ctx.thinkingLevel`, but see absences below.
- **routed (virtual) model**: `session.routedModel` — where the latest request actually went. **Absent from the extension surface.**
- **provider count**: `footerData.getAvailableProviderCount()` (§3.2).
- **extension statuses**: `footerData.getExtensionStatuses()` — sorted by key, sanitized by its own `sanitizeStatusText`, truncated to width.
- **experimental marker**: `areExperimentalFeaturesEnabled()` from `core/experimental.js` — **not exported through the package root.**
- **width helpers**: `truncateToWidth`, `visibleWidth` imported from `@earendil-works/pi-tui` (same functions jefferson injects).
- **theme**: the module-level `theme` proxy, read at render time.
- `invalidate()` is a **no-op** ("git branch caching now handled by provider"); `setSession`/`setAutoCompactEnabled` are host-side setters.

**Reachable through the package root vs not** (`$HOST/dist/index.js`, the package's only export entry):

- Exported: `FooterComponent` (via `modes/interactive/components/index.js:16`), `Theme`, `initTheme`, theme helpers, `truncateToWidth`/`visibleWidth` (from pi-tui), `SessionManager`, `CONFIG_DIR_NAME`, `getAgentDir`, `VERSION`, `SettingsManager`, skills/slash-command surfaces, etc.
- **Not exported through the root** (reachable only by deep import into `$HOST/dist/...`, which pi's module mapping does not give an extension): `formatTokens`, `formatCwdForFooter`, `sanitizeStatusText` (module-local exports of `components/footer.js`); `createUsageTotals`/`addUsageToTotals`/`UsageTotals` (`core/usage-totals.js`); `areExperimentalFeaturesEnabled` (`core/experimental.js`); `FooterDataProvider`/`ReadonlyFooterDataProvider` (the value arrives only as the `setFooter` factory's third parameter); the `theme` const (arrives as the factory's second parameter). An extension that wants the host's exact token formatting or usage aggregation must re-implement them from `getEntries()`.

**RPC mode**: `setFooter` is a no-op in RPC mode (`$HOST/dist/modes/rpc/rpc-mode.js:137` — "Custom footer not supported in RPC mode - requires TUI access"). Jefferson already guards on `ctx.mode === "tui"`.

---

## 5. Host lifecycle facts that affect a long-lived store

- **`session_start` reasons** (`types.d.ts:595`): `"startup" | "reload" | "new" | "resume" | "fork"`, with `previousSessionFile?` present for new/resume/fork. Emission sites: `agent-session.js:209` (startup default), `agent-session.js:3046` (reload), `agent-session-runtime.js:141,165,211/229/246,291` (resume/new/fork).
- **Reload** (`interactive-mode.js` reload flow + `agent-session.js:3020`): `resetExtensionUI()` runs first — it disposes extension dialogs, hides overlays, clears extension terminal-input listeners, calls `setExtensionFooter(undefined)` (restoring the built-in footer), `setExtensionHeader(undefined)`, clears widgets, and clears extension statuses (`interactive-mode.js:1985–1999`). Then `session.reload()` re-reads settings and resources, invalidates the old extension runner (`oldRunner.invalidate()`), rebuilds the extension runtime, **re-imports extension modules with `moduleCache: false`** (`core/extensions/loader.js:482`) — so module-level state does not survive a reload — and emits `session_start { reason: "reload" }` followed by `resources_discover { reason: "reload" }`.
- **Session replacement** (new/resume/fork/switch): `session_shutdown` fires first (`reason: "quit" | "reload" | "new" | "resume" | "fork"`), then the host's `beforeSessionInvalidate` callback runs `resetExtensionUI()` (same clearing), the old runner is invalidated, and a fresh `session_start` with the corresponding reason (and `previousSessionFile`) fires on the new runner (`agent-session-runtime.js:107,111,298,301`).
- **Context validity**: a captured `ctx` (or `pi`) throws on *every* property access once its runner is invalidated (§3.3). Therefore any store that captures `ctx` must treat `session_start` (any reason) as its re-initialization point, exactly as the current footer install does; a store holding raw values instead of the ctx survives until the next data refresh, but its refresh path must be rebuilt with the new ctx.
- **Useful notify events** for keeping store data current (all on `ExtensionAPI.on`): `model_select`, `thinking_level_select`, `session_info_changed`, `message_end` / `turn_end` / `agent_end` (usage and context changes), `session_compact` / `session_compact_failed` / `session_tree` (context and leaf changes), plus `footerData.onBranchChange` (§3.2). There is no event for: cwd change, provider-count change, extension-status change, or context-usage change per se.
- **Redraw**: nothing re-invokes the footer factory after installation; the component instance lives until replaced/cleared. The host re-renders on `ui.requestRender()` (called after `setStatus`, branch change, theme change, etc.) and calls the component's `invalidate()` on theme change / full invalidation. A store that keeps data fresh in the background must itself trigger `tui.requestRender()` (or rely on the render loop calling `render(width)` — the TUI renders on request, not on a timer).

---

## 6. Absences (host 1.5.0 shipped code)

- No `getEntryCount()` on the extension-visible session manager (only on the full `SessionManager` the host's own footer uses).
- No routed-model surface (`session.routedModel`) on `ExtensionContext` — an instrument cannot show where a virtual model routed the latest request.
- No subscription indicator (`modelRuntime.isUsingSubscription`) on `ExtensionContext`.
- No usage aggregation helpers exported at the package root (`createUsageTotals`, `addUsageToTotals`, `formatTokens`, `formatCwdForFooter`, `sanitizeStatusText` are internal).
- No `theme` singleton export at the package root (only the `Theme` class and helpers; the instance arrives as the `setFooter` factory's second parameter or `ctx.ui.theme`).
- No change-subscription on: extension statuses, provider count, cwd, context usage. Only git branch has a subscribe (`onBranchChange`).
- No invalidation/redraw callback passed to the footer component; redraw is `tui.requestRender()`, disposal is the optional `dispose()` the host calls when replacing/clearing the footer.
- No host-provided per-extension settings block (pinned by the `statusline` spec; the extension owns its config file).
- `setFooter` is a no-op outside TUI (RPC mode), so a store keyed to footer display is TUI-only by construction.

---

## 7. Unknowns and questions for the invoker

- **Version drift**: the repository's `node_modules` holds `@earendil-works/pi-coding-agent` and `pi-tui` **1.4.0** (devDependencies `^1.4.0`), while the runtime host is **1.5.0**. Everything reported above was read from the 1.5.0 install; the 1.4.0 type surface used by `pnpm typecheck` may differ (not diffed — out of scope for this pass). Should the change pin devDependencies to the shipped host?
- **Store scope**: the brief's vocabulary (rows hold cells, cells hold instruments; a store one place holding session and system data) does not say whether the store should own *system* data beyond the host surface (e.g., time, battery, external processes) — nothing in the host or the current specs names that boundary.
- **Refresh strategy**: whether "kept current behind the scenes" means event-driven refresh (§5's notify events), render-time lazy reads with caching (the host footer's approach, §4), a polling timer, or a combination is a design decision, not a reconnaissance finding.
- The `statusline` spec's current "Cell content is fixed placeholder text" requirement and its "no contribution interface" scenario will be superseded by this change; the delta to that requirement belongs to the proposal, not to this report.
