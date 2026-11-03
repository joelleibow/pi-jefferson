# Chidi — Documentation Research for `session-data-store`

Date: research run against the pinned host `@earendil-works/pi-coding-agent@1.5.0`.
Primary sources: the host's shipped `README.md`, `docs/`, `examples/extensions/`, and the
shipped type declarations / JS in `dist/` (cited as code corroboration, clearly marked).
Secondary: public documentation of prior-art statusline systems.

Host install root (all `PI/...` paths below are relative to):
`/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent`

---

## Q1 — The custom footer: factory arguments, footer data provider, render cadence, replace/reset

### Factory arguments

`ctx.ui.setFooter(factory | undefined)` is documented in `PI/docs/extensions.md` (section
"Widgets, Status, and Footer", ~line 2905) and in the shipped JSDoc at
`PI/dist/core/extensions/types.d.ts` (~line 118):

```ts
setFooter(factory: ((tui: TUI, theme: Theme, footerData: ReadonlyFooterDataProvider)
  => Component & { dispose?(): void }) | undefined): void;
```

The factory receives three arguments:

1. `tui` — the TUI instance (provides `tui.requestRender()`).
2. `theme` — the active theme.
3. `footerData` — a `ReadonlyFooterDataProvider`.

The factory returns a `Component` (`render(width): string[]`, `invalidate()`, `handleInput?`)
with an optional `dispose()`. The shipped example
`PI/examples/extensions/custom-footer.ts` returns `dispose: unsub` where `unsub` is the
unsubscribe from `footerData.onBranchChange(...)`.

### What the footer data provider exposes

`PI/dist/core/footer-data-provider.d.ts` declares `ReadonlyFooterDataProvider` as:

```ts
Pick<FooterDataProvider,
  "getGitBranch" | "getExtensionStatuses" | "getAvailableProviderCount" | "onBranchChange">
```

- `getGitBranch(): string | null` — current git branch, `null` outside a repo, `"detached"`
  on detached HEAD.
- `getExtensionStatuses(): ReadonlyMap<string, string>` — the texts extensions set via
  `ctx.ui.setStatus(key, text)`.
- `getAvailableProviderCount(): number` — number of unique providers with available models
  (used by the built-in footer display).
- `onBranchChange(callback): () => void` — subscribe to git branch changes; returns an
  unsubscribe function.

The class-level doc comment in the shipped declaration is explicit about the division of
labor (quoted verbatim):

> "Provides git branch and extension statuses - data not otherwise accessible to extensions.
> Context usage on ctx.getContextUsage(), token stats on ctx.sessionManager.getEntries(),
> model info on ctx.model."

The `setFooter` JSDoc repeats this: the provider exists for "data not otherwise accessible:
git branch and extension statuses from setStatus()."

Internally (code, not docs) the provider keeps a `cachedBranch`, watches `.git/HEAD` and
reftable files with a debounce (`WATCH_DEBOUNCE_MS`), and owns its own `dispose()`.

### How often `render` is called — documentation is silent on frequency

No shipped document states how often a custom footer's `render(width)` is invoked. The
closest documented statements:

- `PI/docs/tui.md` ("Understand the component model"): "After changing component state,
  invalidate the affected component and call the injected `tui.requestRender()`. The TUI
  coalesces render requests and updates the terminal."
- `PI/docs/tui.md` ("Keep rendering responsive"): "Rendering runs on the interactive path.
  Cache expensive layout and highlighting work by width and content, then clear that cache
  from `invalidate()`."
- `PI/docs/usage.md`: "The footer updates as the model uses context and reports usage."

So the documented model is **pull-based, event-driven**: nothing promises a periodic repaint;
the extension is expected to call `tui.requestRender()` when its data changes, and the TUI
coalesces. Code corroboration (not documentation): `PI/dist/modes/interactive/interactive-mode.js`
calls `this.ui.requestRender()` at ~30 sites (message updates, status changes, branch change
via `footerDataProvider.onBranchChange`, resize, etc.); there is no footer-specific interval
timer. The custom-footer example's own `render()` recomputes token totals from
`ctx.sessionManager.getBranch()` on every call — i.e., the shipped example treats `render`
as potentially frequent and does its own per-call work, while `docs/tui.md` simultaneously
advises caching expensive work keyed by width and content.

### Replace / reset semantics

- `ctx.ui.setFooter(undefined)` "Restore built-in footer" (`docs/extensions.md` ~line 2911).
- The returned component may implement `dispose?(): void` (type declaration). Code
  corroboration: `interactive-mode.js` `setCustomFooter` disposes the existing custom footer
  before installing a new one or restoring the built-in footer, and `clearExtensionStatuses()`
  plus `footer.invalidate()` runs on session reset paths.
- Session replacement (`/new`, `/resume`, `/fork`, `/reload`) tears down the whole extension
  runtime: `session_shutdown` fires, extensions are reloaded and rebound, then `session_start`
  fires with `reason: "new" | "resume" | "fork" | "reload"`
  (`docs/extensions.md`, "Lifecycle Overview" and "Session Events"). A custom footer
  registered by the old instance does not survive; the new extension instance must
  re-register it.

---

## Q2 — Documented mechanisms for learning that displayed state changed

Documented mechanisms, grouped by cadence (`PI/docs/extensions.md`):

**High-frequency (turn/stream level) — frequent enough to drive a statusline:**

| Mechanism | Fires | Notes |
|---|---|---|
| `footerData.onBranchChange(cb)` | On git branch change | The only documented host push-subscription for footer data; debounced file watcher inside the provider. |
| `message_update` | Token-by-token during assistant streaming | Carries `event.assistantMessageEvent`. Docs warn: "Notification handlers should not perform slow work on a streaming event." |
| `message_start` / `message_end` | Every message (user, assistant, tool-result, custom) | |
| `tool_execution_start/update/end` | Per tool call; updates may interleave in parallel mode | |
| `turn_start` / `turn_end` | Per turn | `turn_end` fires after assistant + tool-result messages are persisted — a natural point to recompute token/cost totals. |
| `provider_stream_event` | Each parsed provider stream event | Notification-only, not persisted. |

**Coarse (session/run level):**

| Mechanism | Fires |
|---|---|
| `session_start` / `session_shutdown` | Session startup, reload, new, resume, fork, quit |
| `session_info_changed` | Session renamed (`/name`, `pi.setSessionName()`) |
| `session_before_compact` / `session_compact` / `session_compact_failed` | Compaction (context-usage display changes here) |
| `session_before_tree` / `session_tree` | `/tree` navigation changes the active branch (totals change) |
| `model_select` | Model change (`/model`, `Ctrl+P`, `pi.setModel()`); docs: "Use this to update UI elements (status bars, footers)". Restoring a session does **not** fire it — read `ctx.model` in `session_start` to initialize. |
| `thinking_level_select` | Thinking-level change; notification-only; docs suggest `ctx.ui.setStatus` from it. |
| `agent_start` / `agent_end` / `agent_settled` | Run lifecycle; `agent_settled` is the documented final-idle signal (`agent_end` is not — retries/queued messages restart runs). |
| `cache_warming_decision` | Idle prompt-cache refresh. |
| `pi.events.on/emit` | Extension-to-extension event bus; no host topics are published on it by default. |

**Explicit invalidation (component level):** `invalidate()` clears cached render output;
`tui.requestRender()` asks for a repaint. A theme change "clears render caches" per
`docs/tui.md`, but does not remove ANSI-colored strings stored in extension state — "Do not
permanently store strings with theme colors unless `invalidate()` rebuilds them."

**Gaps:** There is no documented general host event-bus topic for "footer-visible value X
changed." Model, thinking level, session name, compaction, and tree navigation each have
their own event; git branch has the provider subscription; token/cost totals have **no**
dedicated change event — the documented sources are the message/turn lifecycle events
(after which `ctx.sessionManager` state is updated) and `ctx.getContextUsage()` read on
demand. `docs/extensions.md` notes that for `tool_call`, session-manager state is
"synchronized through the current assistant message before handlers run," but in parallel
tool mode sibling results may be missing.

---

## Q3 — Extension-owned configuration location, and writing files from an extension

**Where configuration lives** (`PI/docs/configuration.md`):

- User-level config lives in the agent directory, default `~/.pi/agent`
  (`PI_CODING_AGENT_DIR` overrides). It holds `settings.json`, `keybindings.json`,
  `mcp.json`, `models.json`, `auth.json`, plus `extensions/`, `skills/`, `prompts/`,
  `themes/` subdirectories.
- Project config lives in `.pi/` under the working directory and loads only after project
  trust is granted.
- `docs/extensions.md` (`ctx.cwd` section) documents the pattern for **project-local
  extension config**: use the exported `CONFIG_DIR_NAME` constant rather than hardcoding
  `.pi`, e.g. `join(ctx.cwd, CONFIG_DIR_NAME, "my-extension.json")`.
- `ctx.isProjectTrusted()` should be checked "before reading project-local extension
  configuration that should only be honored for trusted projects."
- `pi.getSettings()` returns a copy of the effective merged settings (global + project +
  overrides). Extension-specific keys are not a documented part of the settings schema.

**Gap:** No document defines a sanctioned per-extension data/state directory (nothing like
"put your cache in `<agent-dir>/data/<extension>/`"). The agent directory's documented
contents are the fixed table above; where an extension's own files may live inside it is
not specified.

**Writing files:**

- `docs/extensions.md` ("Available Imports", ~line 184): "Node.js built-ins (`node:fs`,
  `node:path`, etc.) are also available." Reading and writing files from extension code is
  therefore permitted and practiced — the shipped `file-trigger.ts` example uses `fs.watch`,
  `fs.readFileSync`, `fs.writeFileSync`.
- For session-durable data, the documented path is `pi.appendEntry(customType, data)`:
  "Persist extension data. Custom entries do NOT participate in LLM context," with
  reconstruction from `ctx.sessionManager.getEntries()` on `session_start`
  (`docs/extensions.md` "State Management": rebuild from `getBranch()`, not all entries).
- For custom tools that mutate files, `withFileMutationQueue()` is documented as required
  so extension writes join the per-file queue used by built-in `edit`/`write`
  (`docs/extensions.md` ~line 2178). This guidance is scoped to tool execution, not to
  extension background code such as a store.

---

## Q4 — Sanctioned access to what the built-in footer shows

Field by field, per the shipped docs, example, and declarations:

| Footer item | Documented extension access |
|---|---|
| Model | `ctx.model` (active model); initialize in `session_start`, track via `model_select`. |
| Thinking level | `ctx.thinkingLevel`; track via `thinking_level_select`; `pi.getThinkingLevel()`. |
| Context usage | `ctx.getContextUsage()` — "Returns current context usage for the active model. Uses last assistant usage when available, then estimates tokens for trailing messages." RPC docs (`docs/rpc-commands.md` ~line 565) confirm `contextUsage` is "the actual current context-window estimate used for compaction and footer display." |
| Token totals / cost | **Re-derive from session entries** — this is the documented path. The shipped `custom-footer.ts` example iterates `ctx.sessionManager.getBranch()`, sums `usage.input/output/cost.total` over assistant messages. `docs/extensions.md` (usage accounting, ~line 2269): tool-reported usage "counts toward the session cost in the footer and `/session`." |
| Git branch | `footerData.getGitBranch()` — explicitly "not otherwise accessible" per the shipped example's header comment and the provider's doc comment. |
| cwd | `ctx.cwd`, `ctx.sessionManager.getCwd()`. |
| Session name | `ctx.sessionManager.getSessionName()`, `pi.getSessionName()`; changes via `session_info_changed`. |
| Extension statuses | `footerData.getExtensionStatuses()`. |
| Provider count | `footerData.getAvailableProviderCount()`. |

So: **only the git branch, extension statuses, and provider count come from the sanctioned
push surface** (`footerData`). Everything else the built-in footer shows is documented as
read-on-demand from `ctx` (model, thinking level, context usage, cwd, session name) or
re-derived from session entries (token totals, cost). The shipped custom-footer example is
itself the canonical demonstration of the re-derive pattern. No document offers an API that
hands an extension the built-in footer's already-computed display values.

---

## Q5 — Prior art: separating data acquisition from rendering

**Redux (store vocabulary).** Redux's documented "Three Principles"
(<https://redux.js.org/understanding/thinking-in-redux/three-principles>): (1) *Single
source of truth* — "The global state of your application is stored in an object tree within
a single store," which "makes it easier to debug or inspect an application"; (2) *State is
read-only* — "the only way to change the state is to emit an action"; (3) changes via pure
functions. The Redux Fundamentals tutorial
(<https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow>) frames it as
"the state, the source of truth that drives our app; the view, a declarative description of
the UI based on the current state" — i.e., the canonical "one read surface, view renders
from it" rationale. Relevant vocabulary for the store design: single store, read-only
access for consumers, updates centralized.

**Starship (prompt/statusline).** The Starship configuration documentation
(<https://starship.rs/config/>) separates *modules* ("a component in the prompt giving
information based on contextual information from your OS") from *format strings* (the
template language arranging module *variables* into the rendered line). A module acquires
data; the format string renders it; the config reference documents per-module `format`
options independently of the module's data acquisition. Rendering concerns (order, style)
are configuration, not module code.

**tmux status line (polling model).** The tmux manual (mirrored at
<https://libtmux.org/en/tmux/latest/catalog/options/status-interval.md> and the tmux wiki
<https://github.com/tmux/tmux/wiki/Formats>): `status-interval` — "Update the status line
every `interval` seconds. By default, updates will occur every 15 seconds. A setting of
zero disables" automatic updates; `status-left`/`status-right` are format strings expanded
from `#{}` variables, and `#()` embeds shell commands that tmux itself re-runs on the
interval. tmux documents a *poll-based* acquisition/render merge: the status line both
acquires (runs `#()` commands) and renders on one timer. This is the contrasting design:
acquisition is not separated from render cadence, and the documented cost is that expensive
`#()` commands run every interval.

**Powerline (segments + renderer).** The Powerline developer docs
(<https://powerline.readthedocs.io/en/latest/develop/segments.html>,
<https://powerline.readthedocs.io/en/latest/develop/extensions.html>): a *segment* is "a
callable object" returning highlight-ready content; the *renderer* "render[s] all segments"
and "when a width is provided, low-priority segments are dropped one at a time until the
line is shorter than the width." The *extension* subclass "knows how to obtain local
configuration overrides ... and is the only instance that interacts directly with bindings
code." So Powerline documents a three-way split: segments acquire data, the renderer owns
width/layout, the extension subclass owns host integration.

**Summary of documented reasoning across prior art:** the recurring documented rationale
is that rendering should be a pure function of acquired state (Redux: view as declarative
description of state), that data-producing units should be composable and independent of
layout (Starship modules vs. format strings; Powerline segments vs. renderer), and that
merging acquisition with render cadence forces expensive re-acquisition on every repaint
(tmux's interval re-running `#()` commands — the anti-pattern a cached store avoids).

---

## Q6 — Warnings about long-running subscriptions, timers, watchers, teardown

Direct documentation (`PI/docs/extensions.md`):

1. **"Long-lived resources and shutdown"** (~line 252): "Extension factories may run in
   invocations that never start a session. **Do not start background resources such as
   processes, sockets, file watchers, or timers from the factory.** Defer background
   resource startup until `session_start` or the command/tool/event that needs the resource.
   **Register an idempotent `session_shutdown` handler to close any session-scoped resources
   you start.**"
2. **`session_shutdown`** event: "Fired before a started session runtime is torn down. Use
   this to clean up resources opened from `session_start` or other session-scoped hooks."
   Reasons: `"quit" | "reload" | "new" | "resume" | "fork"`. After switch/fork: "Do cleanup
   work in `session_shutdown`, then reestablish any in-memory state in `session_start`."
3. **Session replacement footguns** (~line 1469): after replacement, captured old
   `pi`/`ctx`/sessionManager objects "are stale after replacement and will throw if used";
   "Code in `withSession` should assume any state invalidated by your `session_shutdown`
   handler is already gone. Only capture plain data that survives shutdown cleanly."
4. **`ctx.reload()`** (~line 1512): emits `session_shutdown`, reloads, emits `session_start`
   with `reason: "reload"`; "Code after `await ctx.reload()` must not assume old in-memory
   extension state is still valid." Treat reload as terminal for the handler.
5. **Component disposal**: footer/widget factories return `Component & { dispose?(): void }`;
   the custom-footer example wires `dispose` to the branch-change unsubscribe. The footer
   data provider itself owns git watchers and a `dispose()` (shipped declaration); its
   watcher lifetimes are host-managed, but an extension's own subscriptions to
   `onBranchChange` are the extension's responsibility to release via `dispose`.
6. **Streaming-event cost warning** (~line 424): "Notification handlers should not perform
   slow work on a streaming event."
7. **Render path**: "Rendering runs on the interactive path. Cache expensive layout and
   highlighting work... clear that cache from `invalidate()`" (`docs/tui.md`).
8. **Theme caching**: "Do not permanently store strings with theme colors unless
   `invalidate()` rebuilds them" (`docs/tui.md`).

**Caveat found in the shipped examples themselves:** `examples/extensions/file-trigger.ts`
starts an `fs.watch` in `session_start` and never closes it — the example contradicts the
documented shutdown guidance. Worth knowing so the example is not treated as the teardown
pattern to copy; the prose guidance (items 1–2) is the authoritative statement.

**Gap:** nothing in the docs quantifies render frequency, coalescing windows, or a maximum
acceptable `render()` cost for a footer; "keep rendering responsive" is the only standard.

---

## Assumptions supplied vs. findings (differences)

- The brief assumed "a footer data provider with a change subscription" — confirmed, but
  narrower than implied: the only subscription is `onBranchChange`. Extension statuses and
  provider count have getters only, no change subscription.
- The brief assumed data "read on demand from the extension context" — confirmed; the
  documented reads are `ctx.model`, `ctx.thinkingLevel`, `ctx.getContextUsage()`,
  `ctx.sessionManager.*`, `ctx.cwd`, `pi.getSessionName()`.
- The brief's third mechanism (expensive computation cached across renders) matches the
  documented guidance in `docs/tui.md` (cache by width/content, clear in `invalidate()`),
  and the shipped example shows the uncached anti-pattern it warns about.

## Explicit gaps (documentation silence)

1. No documented render frequency or repaint guarantees for a custom footer.
2. No change event for token/cost totals; nearest documented signals are
   `message_end`/`turn_end`.
3. No sanctioned per-extension config/data directory; only the `CONFIG_DIR_NAME`
   project-local pattern and the fixed agent-directory table.
4. No API to read the built-in footer's computed display values; re-derivation from
   `ctx`/session entries is the documented path.
5. Docs do not state whether `setFooter`'s factory may be called more than once per
   registration or on theme change; code shows the factory is invoked on install and the
   old component is disposed on replacement.
