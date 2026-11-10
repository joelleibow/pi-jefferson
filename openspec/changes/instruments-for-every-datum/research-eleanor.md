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

## Addendum 1 — format modifiers and the path datum

### Modifier mechanism today

`extensions/jefferson/visuals/format.ts:48-115` parses the format. A segment stores its modifier chain (`:12-15`); `MODIFIERS` declares the recognized names at `:23-35`: six style booleans (`bold`, `dim`, `italic`, `underline`, `inverse`, `strikethrough`) and three string mutations (`capitalize`, `upper`, `lower`). `capitalize` uses lodash `upperFirst`, while `upper`/`lower` use `toUpper`/`toLower`.

Unknown names are rejected in `format.ts:91-94`, with exact error template: `"<instrument>"'s format names a modifier it does not implement: "|<name>"`. For example, the tested `$model|bd` error is `"model"'s format names a modifier it does not implement: "|bd"` (`tests/format.test.ts:255-259`).

At render time, variable resolvers run first and values are collapsed into strings (`format.ts:185-190`); `resolveFormat` then chooses each literal or already-resolved variable string and reduces that segment's modifier list over it (`:191-195`). Thus string mutations act on a variable's resolved string, not the raw datum. Modifiers chain in written order; the reducer at `:194` applies each in sequence. The test `$level|lower|capitalize` with `HIGH` gives `High` (`tests/format.test.ts:421-423`). Style modifiers are accumulated and applied when styling the piece (`:170-174`, `:207-212`); variable foreground tokens are selected from the pre-mutation value (`:210-212`), also pinned by `tests/format.test.ts:413-419` and `tests/instrument.test.ts:134-135`.

### Variable-specific modifiers and literal subjects

No current mechanism binds a modifier's validity to one variable: `MODIFIERS` is a global name-to-operation map (`format.ts:23-35`), and parse validation only checks that global map (`:91-94`). Variables are checked against the declaration separately (`:65-73`); `FormatSegment` stores a name plus generic `Modifier[]` (`:12-15`).

A recognized modifier after literal text applies to the final non-whitespace run of that literal, not a variable: `parseFormat` takes `literal` and extracts `text.match(/\S+$/)` (`format.ts:100-109`). Therefore `hello|capitalize` is a valid format and capitalizes the literal `hello` (same mechanism covered by `tests/format.test.ts:337-351`, which pins literal modifier scoping). A `|base` after literal text would currently be rejected before subject processing because `base` is absent from the global modifier table; the probe `hello|base` returns the unknown-modifier error above. Likewise `$model|base` currently errors as unknown (`tests` pin this generic unknown path, not a special path-specific case).

For a new modifier to work after `$model`, current parsing would attach it to the `model` variable segment; after literal text it would be attached to a literal segment's trailing non-whitespace run. The current data model has no conditional “only if subject variable is path” test. The desired path-only behavior would therefore require a new validation rule/mechanism distinguishing variable subjects from literals and other variables; that is not present today. This is an observation, not a design proposal.

### Path datum

The store's `Readings.cwd` is the full working-directory string (`extensions/jefferson/data/session-data-store.ts:15-23`). The feed seeds it from `ctx.cwd` (`extensions/jefferson/data/session-data-feed.ts:16-22`). The `path` variable resolver returns `basename(r.cwd)` (`extensions/jefferson/visuals/instrument.ts:73-79`), and the living statusline spec requires `$path` be the basename and prohibits rendering the whole directory (`openspec/specs/statusline/spec.md:573-580`).

AGENTS.md says variable resolvers “read the store and return already-formatted strings” (`AGENTS.md:20-22`), and instruments must not reach for host state (`:23-24`). To return different path forms according to a modifier, the resolver would need access to the modifier context or a raw full-path value from which a separate formatting operation can derive the requested form. Today it receives only `Readings`; its existing path resolver has only cwd and always applies basename. There is no variable modifier hook in the current format path.

### Home directory and environment

The home directory is not part of `Readings` (`session-data-store.ts:15-23`) and is not supplied by the feed, which seeds cwd and the other session values only (`session-data-feed.ts:16-30`). A repository search found no `os.homedir()` or `process.env.HOME` usage. `process.env` appears in `tests/jefferson.test.ts:172-178` for test setup (`PI_CODING_AGENT_DIR`); the application source does not otherwise read environment variables in the searched TypeScript files. Standard Node `os.homedir()` or `process.env.HOME` would be mechanisms to consult outside this store, but neither is currently used here; this report does not recommend choosing one.

### Tests and living-spec requirements

- All known modifiers and all six style attributes parse: `tests/format.test.ts:245-253`.
- Unknown modifier exact error: `tests/format.test.ts:255-260`; configuration-level propagation also tested at `tests/configuration.test.ts:970-975`.
- Literal modifier scope (trailing non-whitespace run): `tests/format.test.ts:337-351`; no-subject rejection: `:376-380`.
- String mutation behavior and order: `tests/format.test.ts:383-399`, `:421-423`.
- Basename edge cases: `tests/instrument.test.ts`, test “path renders only the basename including trailing-separator and root boundaries” (test begins near lines 180-200; exact body assertion should be verified against the current file if needed).
- Living spec: thinking's default `$level|capitalize` is required (`openspec/specs/statusline/spec.md:399`); path must be basename (`:573-580`); format syntax defines `|modifier`, escaped `\|`, and already formatted variable substitution (`:706-714`); variable datum is delivered already formatted (`:349-359`). The spec does not currently name `base`, `absolute`, or `relative` as supported modifiers.

### Probe

Ran a direct Node TypeScript-stripping probe against `parseFormat`: `hello|capitalize` parsed as a literal segment with a modifier; both `hello|base` and `$model|base` threw `"model"'s format names a modifier it does not implement: "|base"`.
