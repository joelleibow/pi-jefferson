# Proposal

## Why

Joel's complaint of 2026-11-06: *"We aren't providing default instruments for all the data points that Pi gives us."* The objective he set is that every datum pi provides to an extension gets a shipped instrument [R "What the change is"]. Seven instruments ship today, and the store reads six host values plus the session's entries [E "Data path today"]. Chidi's inventory shows pi hands an extension far more than that [C §Q1].

## What Changes

- Three instruments ship: `branch` (`Branch:`, `$branch`), `session` (`Session:`, `$name`) and `status` (`Status:`, `$status`). Every other datum in the inventory below is named as not given one, and the reason is in the table at "Settled". [CR "Joel's rulings" 1]
- `$path` takes three modifiers, `|base`, `|absolute` and `|relative`; a bare `$path` stays the basename. [CR ruling 3]
- A datum the store does not hold enters the store and the feed first. The instrument only reads [E "Adding an instrument"; M 1D].
- Every new instrument that shows a datum has a default label, and `blank` stays label-free [R "default labels"].
- A new instrument renders nothing over a datum the store reads as unknown [M 1G]; the rule lives once, in the default-label requirement, and each instrument's requirement names its unknown case.
- The living `session-data-store` requirement that the store holds a fixed list of datums, with its exclusion scenario naming the branch, statuses and provider count, stops being true now that two of them get instruments [M 1D]. The delta restates it without a list and names the provider count and active tools as the exclusions.
- A datum the store holds only to derive a form, the home directory, enters the store too [design D3].
- Not in this change: git beyond the branch (dirty, ahead/behind) [R "2026-11-05, git"], anything that reads the terminal or shells out [R "the source of truth"], and the host-only values no extension can read: pi's routed model, the `(sub)` marker's source, the experimental flag and the entry count [C §Q1 1b, 1e].
- **Rider, not part of this change's scope.** The README gains the gallery image `docs/images/jefferson-cosmic-star-dragon.png` through its absolute raw GitHub URL, because `docs/` is not in the package. It rides in this pull request and is written in the docs pass [R "A rider"]. The conductor picks its place; Eleanor observed a fit before `## Status` [E "README rider"].

### The inventory

"Store today" is what the store and feed read now [E "Data path today"]. "Announced" says what tells a footer the value changed. Modes: every `ctx` read works in tui, rpc, json and print, but only the TUI has a footer to render into; `footerData` exists only in the TUI [C §Q3].

| Datum | How read | Store today | Announced by | Modes |
|---|---|---|---|---|
| Model (id, name, provider, window, cost…) | `ctx.model` | provider, id | `model_select`; not fired on restore, so read at `session_start` [C §Q1 1a] | all |
| Thinking level | `ctx.thinkingLevel` (optional) | yes | `thinking_level_select` [C §Q1 1a] | all |
| Working directory | `ctx.cwd` | yes | `session_start`; the host sets the new cwd before it fires [C A1 1] | all |
| Context usage (tokens, window, percent) | `ctx.getContextUsage()` | yes | no event; re-read after `turn_end`, `message_end`, `session_compact`, `model_select`. Percent is `null` after a compaction [C §Q1 1a] | all |
| Token totals and cost | summed from session entries; no `getUsage()` | yes | `message_end`, `turn_end`; the entry is in the session by then [C §Q1 1b] | all |
| Cache hit rate | derived from the latest assistant message's usage [C §Q2] | no | as the totals | all |
| Git branch | `footerData.getGitBranch()`: name, `"detached"` or `null` | no | `onBranchChange`. First read is a synchronous file read; `git` is spawned only for the reftable format [C A1 4] | tui only; never in rpc [C §Q3] |
| Extension statuses | `footerData.getExtensionStatuses()` | no | no event; `setStatus` itself requests a render [C A1 3] | tui only |
| Available provider count | `footerData.getAvailableProviderCount()` | no | no event; `0` at `session_start`, set later, and the refresh requests no render [C A1 2, 3] | tui only |
| Session name | `sessionManager.getSessionName()` | no | `session_info_changed`, from `/name` and `pi.setSessionName`; the name is readable first [C A1 5] | all |
| Session id, file, dir, header | `sessionManager` getters | session id only, as a key | `session_start` [C §Q1 1b] | all |
| Idle flag | `ctx.isIdle()` | no | `agent_start`, `agent_end`, `agent_settled` [C §Q1 1a] | all |
| Queue (boolean only) | `ctx.hasPendingMessages()` | no | no extension event; the host renders on its own `queue_update` [C A1 3] | all |
| Auto-compact setting | `pi.getSettings().compaction?.enabled`; the default is not printed in the research | no | no event; a `/settings` toggle ends in a render. Project settings are absent when the project is untrusted [C §Q1 1e, §Q3, A1 3] | all |
| Active tools | `pi.getActiveTools()` | no | no event, no render [C A1 3] | all |
| Subscription / OAuth | `ctx.modelRegistry.isUsingOAuth(model)`; the facade lacks `isUsingSubscription` [C §Q1 1e] | no | none | all |
| Pi version | `VERSION` package export | no | constant [C §Q1 1e] | all |
| Project trust, run mode, scoped models | `ctx.isProjectTrusted()`, `ctx.mode`, `ctx.scopedModels` | no | trust and mode are fixed; scoped models have no event [C §Q1 1a] | all |
| MCP servers | `pi.getMcpServers()` | no | `mcp_servers_change` [C §Q1 1e] | all |
| Per-message fields (`stopReason`, response model, …) | on each assistant message in the entries | no | `message_end` [C §Q1 1b] | all |
| Slash commands, flags, system prompt, theme, labels | `pi.getCommands()`, `pi.getFlag()`, `ctx.getSystemPrompt()`, `ctx.ui.theme`, `getLabel()` | no | mostly none [C §Q1 1a, 1e] | all |

Reported, not run: the research read source and docs; nothing ran in a live pi session [C §Assumptions]. Whether the first footer render precedes the provider count's first update was reasoned, not run [C A1 residual].

## Settled

Joel ruled at PL2, 2026-11-10 [CR "Joel's rulings"]; CR is `council.md`, the other keys are as above. Each open question the proposal first carried is settled below and none remains his.

| Question | Settled as |
|---|---|
| 1. Which data become instruments | The three above. Not given one: provider count, active tools, idle, queue, MCP servers, scoped models, trust, OAuth, auto-compact, `version`, `$cacheHit`, the model's `$name` and pi's internals [CR ruling 1]. Session id, file and header, per-message fields, slash commands, flags, system prompt, theme and labels stay out as internals the council named [CR "Perspectives"]. |
| 2. The freshness split | Branch and session name are seeded and pushed. Statuses are read per sample, since `setStatus` requests a render itself [C A1 3]. The data with no render trigger do not ship [CR "Accepted & Rejected"]. |
| 3. What an absent branch renders | Nothing, label included: `null` is unknown [CR "Perspectives"; spec "The branch instrument"]. |
| 4. The compact count band | Stays `20.4k` [CR ruling 2]. Nothing changes. |
| 5. A full-path working directory | `$path\|absolute` and `$path\|relative`; `path` is not renamed and `$path` stays the basename [CR ruling 3 and the conductor's reading]. |
| 6. Where the branch's name collides | `branch` shows the git branch [CR ruling 1; spec "The branch instrument"]. |
| 7. How the branch reaches the store | The feed's footer-data attachment [design D1]. |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `statusline`: the `branch`, `session` and `status` instruments; `path` gains three forms and the format language gains variable-declared forms; every datum-showing instrument declares a default label and renders nothing over an unknown datum.
- `session-data-store`: the store holds the branch, the session name, the statuses and the home directory, each with a stated freshness, and the footer-only data is attached and released with the feed.

## Impact

- Specs: the two capabilities above.
- Code, by the existing path [E "Adding an instrument"]: `Readings` and its sampling in the store, the feed's wiring and its single release, the instrument declarations table, and the tests whose fixtures count instruments [M 2]. The footer's construction hands the feed its footer data [design D1].
- Documentation: the README rider and the docs pass, after the implementation gate.
- No dependency changes are known; none is proposed.
- Breaking: none expected. Joel accepts breaks before 1.0 [R].
