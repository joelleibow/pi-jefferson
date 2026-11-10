# Research Report

## Question and Scope

Repository-side reconnaissance for `instruments-for-every-datum`: current store/feed/instrument path, seven shipped instruments, Joel's configuration (read-only), addition/testing convention, baseline checks, and README image rider. Scope is this repository and the specified live configuration; pi's complete host API inventory belongs to Chidi.

## Sources / Files Examined

- `openspec/changes/instruments-for-every-datum/owner-rulings.md` (binding rulings)
- `AGENTS.md`, `ARCHITECTURE.md`, `README.md`
- `extensions/jefferson/data/session-data-store.ts`, `extensions/jefferson/data/session-data-feed.ts`
- `extensions/jefferson/visuals/instrument.ts`, `extensions/jefferson/visuals/instrument-binding.ts`, `extensions/jefferson/visuals/row-renderer.ts`
- `extensions/jefferson/startup.ts`, `extensions/jefferson/footer-setup.ts`
- `tests/instrument.test.ts`, `tests/session-data-store.test.ts`, `tests/jefferson.test.ts`
- `package.json`, `~/.pi/agent/pi-jefferson.json`
- Research instructions from `openspec instructions research --change instruments-for-every-datum --json`

## Findings

### Data path today

`extensions/jefferson/data/session-data-store.ts:5-23` defines `Reading = string | undefined`, `UsageTotals` (input, output, cacheRead, cacheWrite, cost) and `Readings`: provider, model, thinkingLevel, cwd, contextUsage, totals. `undefined` means unknown. `scanTotals` at lines 33-52 totals supported usage records across all entries.

`extensions/jefferson/data/session-data-feed.ts:10-30` seeds static readings at install/session startup from `ctx.model?.provider`, `ctx.model?.id`, `ctx.thinkingLevel`, and `ctx.cwd`; supplies readers for `ctx.getContextUsage()`, `ctx.sessionManager.getSessionId()`, `getLeafId()` and `getEntries()`. Sampling happens per render through the injected readers; usage is sampled each time and entries are scanned only when sessionId/leafId changes (`session-data-store.ts:61-68`). The feed subscribes to `pi.on("model_select")`, `pi.on("thinking_level_select")`, and `pi.on("turn_end")` (`session-data-feed.ts:32-40`); first two push selected values, turn_end re-samples and repaints only changed totals. It returns a release that removes all three listeners and disposes the store (`:41-52`). Startup installs the feed at session start before footer setup (`extensions/jefferson/startup.ts`; architecture describes ordering).

Instrument declarations resolve variables from `Readings`, with no host subscription: `extensions/jefferson/visuals/instrument.ts:50-115`. Binding/render passes the sampled readings into variable resolvers (`visuals/instrument-binding.ts`); the row renderer samples once and shares it across cells (`visuals/row-renderer.ts`).

The store/feed reads the four context seed values, context usage, session id, leaf id, and session entries, and observes the three events above. It does not read any other host context property or subscribe to another event in the examined feed. This is a repository-side statement, not a complete inventory of data pi makes available; Chidi's host-side investigation is needed to enumerate the latter and establish coverage.

### Seven shipped instruments

Declarations and formats (`extensions/jefferson/visuals/instrument.ts:42-115`):

| Instrument | Variables | Default format / label |
|---|---|---|
| `blank` | none | placeholder text / no label; fills |
| `model` | provider, model | `$provider/$model` / `Model:` |
| `thinking` | level | `$level\|capitalize` / `Thinking:` |
| `path` | path (cwd basename) | `$path` / `Path:` |
| `context` | tokens, window, percent; width-taking bar | `$percent/$window` / `Context:` |
| `tokens` | input, output, cacheRead, cacheWrite, totalTokens | `$totalTokens` / `Tokens:` |
| `cost` | cost | `$cost` / `Cost:` |

The declarations accept foundational `format`, `style`, and `label` options. `blank` has the placeholder as its default format and fills; the six datum-bearing instruments have the listed labels.

`compactCount` is `extensions/jefferson/visuals/instrument.ts:31-40`: below 1,000 prints integer; 1,000–99,999 prints one decimal in thousands; 100,000–999,999 rounds thousands to integer; 1,000,000–9,999,999 prints one decimal in millions; 10,000,000 and above rounds millions to integer. This explains `20.4k`. `tests/instrument.test.ts:142-148` pins boundary examples including 20,400 → `20.4k`, 99,999 → `100.0k`, 100,000 → `100k`, and the million thresholds.

`path` uses Node `basename(r.cwd)` (`instrument.ts:73-79`), not the full path. Its default variable is named `path`; the tests cover trailing separators and root (`tests/instrument.test.ts`, test “path renders only the basename including trailing-separator and root boundaries”).

### Joel's configuration

Read `~/.pi/agent/pi-jefferson.json`; not edited. It uses `path` in the first cell of row one and configures `$path` with a folder emoji label. It does not use an instrument named `cwd`. Thus current configuration displays the basename through `path`, not the full cwd.

### Adding an instrument

`AGENTS.md`, “Adding an instrument”: add declaration (name, variables, defaults/options, optional label/variable foreground, required `fills` where applicable) to `extensions/jefferson/visuals/instrument.ts` and the shipped declarations table; variable resolvers read the store and return preformatted strings; bound render seam is `(readings, width, theme) => string`, never subscribe/poll/cache host data. If data is absent from the store, add it under `extensions/jefferson/data/` and arrange its seed/push. Add a cell-rendering test and an alignment test. The row sizes from rendered text at width 0, so non-fill instruments must not vary text with width. `tests/instrument.test.ts` test at lines 233-261 compares all shipped instruments at width 0 and width 200, with `$bar` as the permitted width-reading/filling exception.

A new datum costs a `Readings` field and store state/reader or seed in `session-data-store.ts`, plus feed wiring to the relevant host source (seed, sample reader, event subscription/push, or entry derivation as appropriate). It also adds the value to the feed's type/data plumbing and disposal responsibilities if adding subscriptions. An instrument alone must not reach host state.

### Baseline

- `pnpm typecheck` — passed (`tsc --noEmit`).
- `pnpm test` — passed: 317 tests, 0 failures.

### README rider

The gallery image belongs near the top after the introductory description/name lineage and before `## Status` (currently line 12), per the owner ruling that location is conductor's call. The first 20 lines of `README.md` are:

```text
# pi-jefferson

**Pre-1.0.** A statusline footer of configured rows for pi. Install with
`pi install npm:pi-jefferson`.

A starship-style statusline for [pi](https://github.com/earendil-works/pi): instruments you
place in a row's cells, a real layout, and per-instrument formatting.

The name is a nod to the lineage — Jefferson Airplane became Jefferson Starship became
Starship.

## Status

The statusline is a footer of one line per configured row, each spanning the full width. By default
a cell takes the width its content needs and its neighbours sit against it. `blank` cells and cells
with a `$bar` fill whatever the row leaves, and a [row option](#configuration) restores evenly
divided cells. The [configuration table](#configuration) lists the available instruments, their
variables and default formats. With no configuration you get the default single row of
placeholder cells.
```

Raw image URL checked with the requested curl status format: `https://raw.githubusercontent.com/joelleibow/pi-jefferson/main/docs/images/jefferson-cosmic-star-dragon.png` returned HTTP `200`.

## Assumptions, Differences, and Unknowns

- Repository inspection cannot establish every datum the pi host offers to extensions, nor whether any values are omitted beyond what the feed visibly reads. Chidi's host-side inventory is required for the full comparison and completeness claim.
- The README image's exact placement is explicitly left to the conductor; the suggested location above is an observed fit before the current `## Status`, not a design recommendation.
- Live configuration was inspected only; it was not changed.
