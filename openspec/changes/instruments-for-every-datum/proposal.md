# Proposal

## Why

Joel's complaint of 2026-11-06: *"We aren't providing default instruments for all the data points that Pi gives us."* The objective he set is that every datum pi provides to an extension gets a shipped instrument [R "What the change is"]. Seven instruments ship today, and the store reads six host values plus the session's entries [E "Data path today"]. Chidi's inventory shows pi hands an extension far more than that [C §Q1].

## What Changes

- Every datum in the inventory below is either given a shipped instrument or named, with a reason, as not given one. Which is which is open (see Open questions). Nothing here chooses.
- A datum the store does not hold enters the store and the feed first. The instrument only reads [E "Adding an instrument"; M 1D].
- Every new instrument that shows a datum has a default label, and `blank` stays label-free [R "default labels"].
- A new instrument renders nothing over a datum the store reads as unknown [M 1G].
- The living `session-data-store` requirement that the store holds a fixed list of datums, with its exclusion scenario naming the branch, statuses and provider count, stops being true once any of them gets an instrument [M 1D]. The delta restates it without a list, so it holds whatever Joel rules.
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

## Open questions

Joel's unless a name says otherwise. None is answered here.

1. **Which data become instruments**, and each one's name, default label (a word and a colon), variables and default format. The ruling says "every datum" [R]; the inventory above is long, and Michael's challenge is that "every" is a quantifier over a list nobody had produced [M 4]. Rows like the idle flag, project trust or the system prompt are data pi provides, and "Don't invent what we don't have to" [R] pulls the other way. [M 3.1, 3.5]
2. **The freshness split** [M 4]. Some datums have a push or a clean read: branch, session name, working directory. Others only have "as current as the host's last render": statuses, provider count, active tools. Does "every" include the second group, knowing the store can promise no more than that? The living spec forbids claiming freshness beyond the host's delivery and forbids polling [M 1E, 2].
3. **What an absent branch renders.** pi reports `null` for "not a repository", which is a real value and not unknown [M 2]. The cell can render nothing, as pi's footer does, or the bare label. [M 3.2]
4. **The compact count band.** The ratified spec prints `20.4k`; pi's own rule prints `20k` [E "`compactCount`"; C §Q2]. Keep the ratified band or mirror pi, which is a spec change [M 1K, 3.4].
5. **A full-path working directory.** `path` shows the basename [E "Seven shipped instruments"]. Is a full path wanted beside it, `~`-abbreviated or absolute, and what is it called? Renaming `path` was ruled a separate card on 2026-11-08 [M 1J], and Joel's live config uses `path` [E "Joel's configuration"], which no task edits [R]. Does he reopen the rename? [M 3.3]
6. **Where the branch's name collides.** `branch` means the git branch and the session-tree branch in pi [M 2]. Which one an instrument named for it shows is Joel's naming call under question 1.
7. **How the branch reaches the store.** `footerData` exists only inside the footer factory, built after the store [M 2]. That is a design question for Michael's gate, not a rule here.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `statusline`: every shipped instrument that shows a datum declares a default label (the living requirement says "a shipped instrument that declares one"); a new instrument renders nothing over an unknown datum. No instrument is named, because none is ruled yet.
- `session-data-store`: the store holds the datums its instruments display without a closed list or a named exclusion; a new datum enters the store and the feed, never an instrument.

## Impact

- Specs: the two capabilities above.
- Code, by the existing path [E "Adding an instrument"]: `Readings` and its sampling in the store, the feed's wiring and its single release, the instrument declarations table, and the tests whose fixtures count instruments [M 2]. Which files move depends on the rulings.
- Documentation: the README rider and the docs pass, after the implementation gate.
- No dependency changes are known; none is proposed.
- Breaking: none expected. Joel accepts breaks before 1.0 [R].
