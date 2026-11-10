# Council Synthesis

Two advisors sat on this council, both launched with `context: "fresh"` and reading only the change directory's artifacts:

- `council-neil` (cost), run `3594b86b-22b3-4298-9895-0c5cede4080d`
- `council-matt` (correctness), run `398a0c88-477e-4dcf-a2c5-cfb78288c72e`

There was one pass. A second pass was not run. The advisors agree on everything except how wide to read "every", and that question is Joel's.

## Question and Scope

The council answered six questions:

1. Which of the inventory's data in `proposal.md` become shipped instruments.
2. For each new instrument: its name, variables, format and label.
3. What to do with data that carry no freshness signal.
4. The compact count band.
5. Whether to show the full working directory.
6. What the branch renders outside a repository.

**Evidence:** the proposal and its inventory, the delta specs, `research-chidi.md` with Addendum 1, `research-eleanor.md`, `michael-orientation.md`, and the PL4 section of `michael-the-architect.md`.

**Out of scope:** git beyond the branch, thresholds, custom instruments, and the README rider.

## Perspectives & Trade-offs

**Both advisors agree on:**

- **Three new instruments, each with a default label in the ruled word-and-colon shape:**

  | Instrument | Variable | Label | Source of the datum |
  |---|---|---|---|
  | `branch` | `$branch` | `Branch:` | The git branch from `footerData.getGitBranch()`. It is seeded once when the footer installs and pushed on `onBranchChange`, so the synchronous first read stays out of every sample (`research-chidi.md` A1 4). `"detached"` renders as it is. |
  | `session` | `$name` | `Session:` | The session name, seeded from `getSessionName()` and pushed on `session_info_changed`. That event fires after the name becomes readable (A1 5). |
  | `status` | (see below) | `Status:` | Other extensions' `setStatus` text, read on every sample: sorted by key, whitespace collapsed, joined by one space, the way pi's own footer does it. Freshness is not a problem here, because `setStatus` asks for a render itself (A1 3). Reading per sample also handles statuses being cleared on a session switch (A1 1). |

- **Unknown renders nothing.** A `null` branch (outside a repository), an unnamed session and an empty status map are all unknown, so the cell renders nothing, label included. That is what pi's footer does (`footer.js:140-143`). Without this rule a bare `Branch:` would appear in every directory that is not a repository. The delta must pin this as a scenario.

- **The provider count and the active tools do not ship.**
  - The provider count is `0` at `session_start`, and its background refresh asks for no render (A1 2, 3), so `Providers: 0` would show as if it were a real value.
  - `setActiveTools` asks for no render either, and the list has no fixed length.

- **Internals are left out:** the system prompt (multi-line), slash commands, flags, theme, labels, per-message fields and the run mode. None of them is a single current value that fits in a one-line cell.

- **The count band stays `20.4k`.** It is the ratified living spec and is pinned by tests. pi's `formatTokens` is not exported, so mirroring it buys no reuse, and it carries pi's `9,999 → 10.0k` boundary quirk.

- **No full-path working-directory instrument.**
  - `path` shows the basename, and Joel's configuration uses `path`.
  - pi's `~` formatter is not exported, so a `~` form would have to be copied.
  - If he wants a full path anyway, the smallest form is an absolute `$cwd` variable on `path` with no new store field.

**Where the advisors differ:**

| Datum | Neil (cost) | Matt (correctness) |
|---|---|---|
| pi's version | Leave it out: static metadata, and "Don't invent what we don't have to." | Ship a `version` instrument (`Pi:`, seeded from the `VERSION` constant). |
| Latest message's cache-hit rate | Leave it out: derivable from the token totals. | Add a `$cacheHit` variable on `tokens`. |
| The model's display name | Not raised. | Add a `$name` variable on `model`. |
| Idle flag, queue, MCP servers, scoped models, trust, OAuth, auto-compact | Leave them out: TUI indicators, internals, or an API surface the extension cannot fully read (subscription state is internal, and the auto-compact default is not exposed). | Put them to Joel, with his own pick being no for this change. |

## Synthesis & Recommendation

**Ship three new instruments:** `branch`, `session` and `status`, with `Branch:`, `Session:` and `Status:`.

- The branch and the session name are seeded and pushed through the existing feed. The status is read per sample.
- The branch arrives through `setFooter`'s `footerData`. The design has to wire it so that its subscription joins the feed's one `release`.
- Unknown renders nothing.
- The provider count, the active tools and the internals stay out.
- The count band stays `20.4k`.
- `path` is unchanged.

The instrument is named `status`, singular. Each instrument is named for what one cell shows, so a single joined line is "status" (the conductor's call). Its variable is `$status`.

## Accepted & Rejected Feedback

**Accepted:**

- Everything in the agreed list.
- Matt's two correctness points:
  - The delta must pin `null` → unknown for the branch, and the scenario must say so.
  - The status resolver must collapse newlines, because a status set with a newline would otherwise break the one-line row.
- Neil's wiring point: seed the branch once and push it on `onBranchChange`, never sample it, because on a reftable repository the first read spawns `git` synchronously.

**Rejected:**

- **Shipping the provider count or the active tools** (both advisors). Neither has a freshness signal, and the provider count shows a false `0`.

**Put to Joel** (both sides are reasonable, and the choice is his reading of "every"):

- Matt's `version` instrument.
- Matt's `$cacheHit` and model `$name` variables.
- The idle flag, queue, MCP servers, scoped models, trust, OAuth and auto-compact.

## Owner Decisions Required

Each item was tested against `owner-rulings.md`. The board card requires his ruling on the `cwd` naming and on the count band. "Every" is his word, so its breadth is his to read.

1. **Scope.**
   - **Recommended:** the three instruments `branch`, `session` and `status`.
   - **Wider:** the same three, plus a `version` instrument and the `$cacheHit` and model `$name` variables.
   - **Left out under both:** idle, queue, MCP servers, scoped models, trust, OAuth, auto-compact, the provider count, the active tools and the internals.
2. **The count band.** Recommended: keep `20.4k`. The other option is to mirror pi's `20k`.
3. **The working directory.** Recommended: keep `path` as the basename only. The other option is to add an absolute `$cwd` variable on `path`.

### Joel's rulings

Recorded at PL2, 2026-11-10.

1. Asked which new instruments ship (the three, or the three plus `version`, `$cacheHit` and model `$name`), he chose **"The three (Recommended)"**. **`branch` (`Branch:`), `session` (`Session:`) and `status` (`Status:`) ship. The provider count, the active tools, idle, queue, MCP servers, scoped models, trust, OAuth, auto-compact, `version`, `$cacheHit`, model `$name` and pi's internals do not.**
2. Asked whether to keep the compact band or mirror pi's footer, he chose **"Keep 20.4k (Recommended)"**. **The band stays as the living spec states it.**
3. Asked whether to keep `path` as the basename or add a full-path `$cwd` variable, he answered in his own words: *"I am only currently using basename because nothing else is available. Would it be possible to include modifiers like we do for styling? e.g. $path|base, $path|absolute, $path|relative (relative would always be to ~/) This would be awesome flexibility if possible."* **`$path` takes three modifiers: `|base` (the directory's basename), `|absolute` (the full working directory) and `|relative` (the working directory relative to the home directory, written from `~/`).** This is the card's `cwd` ruling.

**The conductor's reading of ruling 3, binding on design:**

- A bare `$path` keeps rendering the basename, so every existing document, his included, reads as it does today, and `|base` states that default explicitly. This is the one reading that changes nothing he did not ask to change.
- How `|relative` renders a directory outside the home directory is a design question. The research's evidence is pi's own rule (`research-chidi.md` Q2): outside home the path stays absolute.
