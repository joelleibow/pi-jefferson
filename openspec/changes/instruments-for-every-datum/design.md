# Design

Source keys: **R** `owner-rulings.md`, **CR** `council.md` (with Joel's rulings of PL2, 2026-11-10), **C** `research-chidi.md` with Addendum 1 (A1), **E** `research-eleanor.md` with Addendum 1, **M** `michael-orientation.md`. The motivation is in `proposal.md`; it is not restated here.

## Context

- The store holds six host values plus the session's entries. The feed seeds four at session start, pushes two (`model_select`, `thinking_level_select`), samples the context usage each render and re-scans entries when the session or leaf id moves. One `release` removes every listener and disposes the store [E "Data path today"].
- `footerData` exists only as the third argument of the factory passed to `setFooter`, which the host calls synchronously inside `setFooter`. The store is built before the footer [M §2 "Branch wiring"; C §Q3]. `startup.ts` already hands the footer's repaint request back out to the data side after both exist, the `receiveRepaint` seam [M §2].
- A modifier is validated against one global name table, `MODIFIERS`, with six style booleans and three string mutations. Parsing checks each variable against the instrument's declaration separately. A modifier after literal text attaches to the last non-whitespace run of that text. An unknown name rejects the document with a message naming the instrument and the modifier [E A1 "Modifier mechanism today"].
- No modifier is bound to one variable today, resolvers return already-formatted strings from `Readings`, the store holds the full working directory, and nothing in the source reads the home directory [E A1 "Variable-specific modifiers", "Path datum", "Home directory"].
- pi's own footer shows the directory as `~` or `~/sub/dir` under `HOME||USERPROFILE`, absolute outside it, raw with no home [C §Q2].
- Rulings that bind: three instruments with labels `Branch:`, `Session:`, `Status:`; unknown renders nothing; `20.4k` stays; `$path` takes `|base`, `|absolute`, `|relative`, and a bare `$path` stays the basename [CR "Joel's rulings"]. pi is the source of truth; nothing reads the terminal and nothing shells out [R "2026-11-05"]. His configuration is never edited [R "2026-11-06"].

## Goals / Non-Goals

**Goals:**

- Ship `branch`, `session` and `status` with their data entering through the store and the feed, never an instrument.
- Give `$path` three forms without changing what a bare `$path` renders.
- Keep one release for every subscription, the feed's.

**Non-Goals:**

- Git beyond the branch: dirty, ahead and behind [R "2026-11-05, git"].
- The provider count, active tools, idle, queue, MCP servers, scoped models, trust, OAuth, auto-compact, `version`, `$cacheHit`, the model's `$name` and pi's internals [CR ruling 1].
- Renaming `path`, a second spelling of the working directory, a change to the count band [CR rulings 2 and 3; M 1J].
- Polling, an interval, or a repaint the extension requests on a timer [M §2; living statusline spec].
- A change to any user's configuration document. Nothing already valid becomes invalid: no existing format names `|base`, `|absolute` or `|relative`, which today reject [E A1 "Probe"].

## Decisions

### D1. The feed offers a footer-data attachment; the footer's factory calls it

The feed's return value gains one attachment, taking the footer data. `startup.ts` passes it to `installFooter`, which calls it from the factory's third parameter, the way the repaint request already travels the other way [M §2]. On attach the feed (1) seeds the branch from `getGitBranch()`, (2) subscribes with `onBranchChange` and registers the returned unsubscribe in the feed's single `release`, and (3) hands the store the statuses reader. The feed declares the structural shape it needs from `footerData` (the branch read, the change subscription, the statuses read), so pi's type stays in the edge that already names it [Joel's "vendor's name only in its adapter"; M 1M].

What each guard refuses:

| Guard | Fires when | Does |
|---|---|---|
| Attach after release | the factory runs after `release` | takes no subscription, seeds nothing |
| Attach twice | a second factory call with no release between | releases the first subscription before taking the second |
| Callback after dispose | the host fires a branch change after `release` | no store call, no repaint |

Alternatives it beat:

- **Reorder startup so the footer exists before the feed.** The footer factory needs the store, so the cycle returns, and the reorder only moves the late binding [M §2].
- **Subscribe inside `footer-setup.ts`.** The branch subscription would then live outside the feed, and "joins the single release" becomes a convention two files must keep [CR "Synthesis"]. One thing, one owner.
- **Poll `getGitBranch()` each sample.** The first read spawns `git` synchronously for a reftable repository, and the store's reads must not block [C A1 4; M §2].

Source: M §2 "Branch wiring", C A1 4, CR "Accepted" (Neil's wiring point). The footer is installed only when `ctx.mode === "tui"` [M §2], so `footerData` is always present when the factory runs.

### D2. Each datum takes one of the three freshness patterns the store already has

| Datum | Pattern | Read | Announced by | Unknown when |
|---|---|---|---|---|
| Branch | seed at footer build, push | `getGitBranch()` | `onBranchChange` re-reads. On the watcher path the host has set its cache first, so the re-read is a cache hit. On `setCwd` the cache is cleared first, but the host has already disposed this footer and released the subscription, because `resetExtensionUI` runs before `rebindCurrentSession` calls `setCwd` [C A1 1, A1 4; M §2] | host reports `null` |
| Session name | seed at `session_start`, push | `sessionManager.getSessionName()` | `session_info_changed`, using `event.name`; the name is readable first [C A1 5] | no name, or `event.name` undefined |
| Statuses | read per sample | `getExtensionStatuses()` | none needed: `setStatus` requests its own render [C A1 3] | no statuses, or every text collapses to nothing |

- **`null` is mapped to unknown by the feed**, not stored as `""`. An empty string renders the bare label, `Branch:` in every directory that is not a repository; pi's footer renders nothing there [CR "Perspectives"; C §Q2]. `detached` is text and renders as written.
- **The store holds the statuses raw**, the host's map as sampled each render, or unknown when it is empty, the way it holds the context usage [living store spec; M §2]. The sort, collapse, join and drop-empty rule lives in the `status` instrument's `$status` resolver, because formatting for display is the instrument's job [archived 2026-11-05 design D11; Michael PL4 finding 1]. The rule: sort by key as pi's footer does (`localeCompare`), collapse newlines, tabs and runs of spaces, trim, drop texts left empty, join by one space, and return unknown when nothing is left [C §Q2 Line 3; CR "Accepted" (Matt)]. Dropping a text that collapses to nothing is my reading of "collapsed", not a ruling; the spec pins it ("A status that collapses to nothing").
- **Session replacement.** The session name and home are re-seeded at `session_start`; the install is released and rebuilt by the existing handler [C A1 1; living store spec "Store data does not survive a session replacement"]. A footer built in that handler runs after the host's `setCwd`, so its branch is the new directory's [C A1 1]. Statuses cleared by the host on a switch read as unknown at the next sample [C A1 1].
- **The branch is read once at build, so the first read may spawn `git`** on a reftable repository; pi's own footer does the same on its first render. That is pi's act, not Jefferson's shell-out [M §2 "Scope line"].

### D3. The home directory is a store datum, seeded by the feed from `os.homedir()`

The feed reads `os.homedir()` once at session start and seeds `Readings` with it. A resolver reads it from the store like any datum.

- **Why in the store.** AGENTS.md: instruments read the store and never host state, the environment included [E "Adding an instrument"]. The store holds "the data its instruments display and any datum a displayed form derives from"; the delta rewrites the living requirement for that.
- **Why `os.homedir()`.** It is one call, it is a Node built-in rather than a project import, and it answers from `HOME` on POSIX and `USERPROFILE` on Windows, the variables pi's footer reads [C §Q2]. It runs no command and reads no terminal, so "nothing reads the terminal and nothing shells out" holds [R "2026-11-05"]. The home directory is a property of the process pi runs in, and pi's footer takes it from the same place.
- **Alternatives.** `process.env.HOME || process.env.USERPROFILE` copies pi's rule character for character, at the cost of two environment reads and the rule's "no HOME → raw" branch written out by us. `os.homedir()` differs only when `HOME` is unset on POSIX, where it consults the password database and pi's footer shows the path raw. Cheaper and the difference is an edge. An environment read inside the `path` resolver breaks the store-only rule [E AGENTS.md:23-24].
- **Unknown home.** The feed seeds home as unknown when `os.homedir()` returns an empty string, which it does when `HOME` is set to nothing; pi's footer treats an empty home as none [Michael PL4 finding 2; footer.js:32 as he measured]. If `os.homedir()` throws, because the password-database lookup failed, the feed catches it and seeds unknown; a throw at `session_start` must not stop the install. `|relative` then renders the absolute path, never an empty cell (spec "A home directory the store does not know"). Without the empty-string guard D6 would read every path as under home.

### D4. A variable declares forms; the format names one with `|name`

An instrument may declare, per variable, a set of **forms**: named resolvers over the same `Readings`, one of them the default. `path` declares `base` (the default), `absolute` and `relative`. Parsing already checks each variable against the declaration [E A1 "Variable-specific modifiers"], so it also checks a modifier directly after that variable against the declared forms and records the form on the segment, apart from the modifier chain. The binding hands the format language each variable's value per form, as strings. Whether it resolves the forms a format names or all of them is a task detail; a form is a pure function of the sample, so either is the same output.

- **Order and scope.** A form comes first after its variable, once, and applies before string and style modifiers, so `$path|relative|capitalize` mutates the relative text. The variable's foreground token, if one is declared, reads the form's value, as it reads a pre-mutation value today [E A1 "Modifier mechanism today"]. `path` declares no token.
- **A form selects, never mutates.** The string-modifier requirement says a text-changing modifier is one of `capitalize`, `upper`, `lower`; a form changes which datum text arrives, not that text, so the two do not collide.
- **The list of names is declared once**, on the instrument. Parsing and rendering read the same declaration [M 1H; living statusline spec "declared once"], and the existing scenario "A name carried in two places" is amended to say so.

Alternatives it beat:

| Option | Why not |
|---|---|
| Three global modifiers `base`, `absolute`, `relative` on the resolved string | By render time the string is the basename, so the other two cannot be derived [E A1 "Path datum"]. Making `$path` hand out the full directory and a global `base` the default turns `$model|base` valid, which Joel's example does not ask for. |
| The variable resolves the full cwd; a path-only modifier derives its form | Needs the same variable-scoped validation as D4, plus a bare `$path` that applies `base` implicitly. Same mechanism with an extra hidden step. |
| Three variables, `$base`, `$absolute`, `$relative` | Joel asked for modifiers "like we do for styling" [CR ruling 3]. |
| A new `cwd` instrument | Renaming and a second spelling were ruled out [CR "Synthesis"; M 1J]. |

This is a decision about the format language's structure; it extends ADR 0003, which made the modifier set global (see D9).

### D5. A form after literal text, after another variable, after another modifier, or twice is rejected when the document is read

It follows the existing rule for a modifier the extension does not implement: reject, default row, warning naming the instrument and the modifier [E A1 "Modifier mechanism today"; living spec "An unknown modifier rejects the document"]. `hello|base` and `$model|base` reject because no form named `base` is declared there; `$path|bold|absolute` and `$path|base|absolute` reject because the form is out of position. The alternative, treating `|base` after literal text as literal text, would render a misspelling silently, which the living spec forbids ("a misspelling never renders as literal text").

### D6. `|relative` follows pi's rule

Under the home directory it renders `~` for home itself and `~/sub/dir` below; elsewhere it renders the absolute path [C §Q2; CR "The conductor's reading of ruling 3"]. That is the conductor's reading, binding on this design; Joel can revise it.

The mechanism is pi's own rule, copied rather than invented [C §Q2; Michael PL4 finding 3]: resolve both the home directory and the working directory, take `path.relative(home, cwd)`, and call the directory under home if the result is `""` or neither starts with `..` nor is absolute. `""` renders `~`; otherwise the result follows `~/`. This handles `/Users/joelleibow2/app` under `/Users/joelleibow`, and a home written with a trailing separator, `/Users/joelleibow/`, which a string-prefix test would miss. A task names both as failing inputs.

### D7. Modes

`footerData` exists only in the TUI and never in RPC; json and print have no footer [C §Q3]. The footer is installed only in the TUI, so nothing renders where `footerData` is missing. The session name and home are seeded regardless of mode; no test depends on that, and nothing is rendered outside the TUI.

### D8. The tests run through the bindings, with the host faked at its boundary

- **Seam.** Each test builds the feed with a fake `pi` (`on`, the session context) and a fake `footerData` (branch, a branch-change callback it can fire, a statuses map, a counter of reads), attaches it, and renders through the bound instrument, the way the existing cell tests do [E "Adding an instrument"; M §2]. The end-to-end fake `setFooter` in `jefferson.test.ts` gains a `footerData` argument [M §2].
- **Inputs that make right and wrong differ.** Statuses inserted in the opposite order to their keys (sorting); a text with `\n` and runs of spaces (collapsing); a `null` branch versus `""` (bare label); `/Users/joelleibow2/app` under home `/Users/joelleibow` (the sibling prefix); `/Users/joelleibow/Projects` under home `/Users/joelleibow/` (the trailing separator); home itself; a home of `""` (`HOME=""`) and one that throws, both unknown; the branch-read counter asserting no read per sample after a fixed seed; a branch change to the held value asserting no repaint.
- **Expectations that must change, and are stated here so an edit is not a blocker.** The instrument count of seven, the `shapes`, `labels` and `expected` tables, the width-0 versus width-200 list of six, the store's key list of six, and the assertion that `instrumentNamed("branch")` resolves nothing [M §2 "Width-0"]. `"git"` stays unresolved.
- **Disposal.** After `release`, firing the fake branch callback runs no store code and requests no repaint; attaching after `release` leaves the fake with zero subscriptions.
- Commands are `pnpm typecheck` and `pnpm test`; baseline 317 passing [E "Baseline"].

### D9. The docs pass

After Michael approves the implementation, Bambadjan:

- **README.** Adds the three rows to the instruments table, documents the path forms where the modifiers are described, and adds `docs/images/jefferson-cosmic-star-dragon.png` through `https://raw.githubusercontent.com/joelleibow/pi-jefferson/main/docs/images/jefferson-cosmic-star-dragon.png` (HTTP 200 [E "README rider"]) between the introduction and `## Status`, the conductor's placement [R "A rider"].
- **ARCHITECTURE.md.** Store: the four new datums and which pattern each takes. Data feed: the footer-data attachment and its place in the single release. Instrument: forms, one sentence. Every sentence that lists six store datums or the feed's three subscriptions is corrected.
- **ADR.** One: *A variable declares the forms it accepts*, from D4, extending ADR 0003 without editing its body. D1 follows the repaint seam's precedent, so it goes in ARCHITECTURE and gets no ADR; D3 is a detail of the store.
- **AGENTS.md.** Corrected only if Derek's list names it; a convention for declaring a form goes there if the implementation adds one.
- The README example `$path` and any other `path` sentence is checked against the spec's three forms.

## Risks / Trade-offs

- [`os.homedir()` differs from pi's rule when `HOME` is unset on POSIX] → The path stays correct and absolute at worst; the spec pins unknown-home behavior. Accepted for one line over two.
- [The first branch read can spawn `git` for a reftable repository, at footer build] → pi's own provider does it, once; Jefferson reads a cache afterwards [C A1 4].
- [Status freshness is "as of the last render the host requested"] → `setStatus` requests one itself; the store claims no more [C A1 3; living store spec "Freshness"].
- [A form is a new concept the format language carries] → Bounded by D5's rejections and one declaration; it dismantles by removing the declaration.
- [`session_info_changed` is emitted with `void`, so the push may land after the setter returns] → The repaint comes from the event, not the setter [C A1 5].

## Migration Plan

None. A bare `$path` and every existing document render as before; the three instruments are new names. Rollback is a revert: the branch subscription and the added `Readings` fields leave with it.

## Open Questions

None.
