# Research Report

## Question and Scope

Map Jefferson's data path, local timer/polling/freshness/repaint rules, instrument lifecycle and layout, configuration/options, styling, tests, and current baseline for notices-in-the-footer. Repository root: `/Users/joelleibow/Projects/pi-jefferson`; scoped to its source, tests, governing specs/ADRs and change directory. `owner-rulings.md` is binding: this change relocates pi's notices to the footer and makes their visibility configurable; fade versus disappear is unresolved (`openspec/changes/notices-in-the-footer/owner-rulings.md:7-10`). No pi behavior is inferred here.

## Sources / Files Examined

- `AGENTS.md`; `ARCHITECTURE.md`; `package.json`; `openspec/specs/statusline/spec.md`; `openspec/specs/session-data-store/spec.md`; change `owner-rulings.md`.
- `extensions/jefferson/data/session-data-store.ts`, `data/session-data-feed.ts`, `startup.ts`, `footer-setup.ts`, `components/instruments/instrument.ts`, `instrument-binding.ts`, `configuration.ts`, `format.ts`, `components/row/width-plan.ts`, `row-renderer.ts`, shipped instrument declarations.
- `tests/session-data-store.test.ts`, `session-data-feed.test.ts`, `instrument.test.ts`, `configuration.test.ts`, `row-renderer.test.ts`, `width-plan.test.ts`, `jefferson.test.ts`.
- Inspected relevant current specs and timer/repaint/freshness mentions in archived specs and ADR index/files. ADRs are summarized here only where relevant.

## Findings

### 1. Data path

- `createSessionDataStore` (`extensions/jefferson/data/session-data-store.ts:61-164`) stores provider/model/thinking/cwd/home/branch/sessionName, statuses, context usage and usage totals (`:18-29, :69-79`). Four mutable session values are seeded from context; branch is seeded through footer attachment. `sample()` reads context usage every sample, reads extension statuses once per sample, and scans all usage-bearing session entries only when `(sessionId, leafId)` differs from its cached key (`:81-95`). `scanTotals` counts `usage`, assistant/toolResult message usage, `compaction`, and `branch_summary` (`:34-55`).
- Feed (`extensions/jefferson/data/session-data-feed.ts:34-95`) subscribes to `model_select`, `thinking_level_select`, `turn_end`, and `session_info_changed` (`:61-70`). `turn_end` calls `turnEnded`; it compares five totals and repaints only when changed (`session-data-store.ts:122-131`). Branch and statuses are attached from footer-only data (`session-data-feed.ts:76-86`); branch change subscription pushes the new branch.
- Exactly one idempotent `release` removes branch, model, thinking, turn and name subscriptions and disposes store (`session-data-feed.ts:88-102`).
- Repaint seam: startup gives the store a closure that invokes the currently installed callback (`startup.ts:44-47`); `installFooter` sets it inside the host footer factory to `tui.requestRender()` (`footer-setup.ts:24-32`). Factory attaches footer data before first sample. Component `dispose` is the release callback (`footer-setup.ts:32`).

### 2. Time and local rules

Relevant binding statements (exact quotations):

- `openspec/specs/statusline/spec.md:348-353`: “An instrument MUST NOT subscribe to host events, poll, cache host data itself, read the terminal, run a command, or derive data the store can hold.” This rules out instrument polling/data acquisition, not timer-driven repaint of already-held state.
- `openspec/specs/session-data-store/spec.md:35-37`: “Every read from the store MUST return synchronously. A read MUST NOT block, await, request a repaint, or throw”.
- `openspec/specs/session-data-store/spec.md:72-75`: “For every datum it holds, the store MUST state how current that value is, and MUST NOT claim freshness greater than the host's own delivery.”
- `openspec/specs/session-data-store/spec.md:192-198`: “When a change the store receives alters a datum a cell displays, the store MUST request a repaint itself” and a host-read turn-boundary change “MUST likewise request a repaint, and MUST NOT rely on the host repainting for its own reasons.”
- `openspec/specs/session-data-store/spec.md:299-301`: statuses are read “once per render sample”; store “MUST claim no freshness beyond the last render the host requested, and MUST NOT poll.”
- Current `ARCHITECTURE.md` data-feed/store/startup descriptions (lines 16-35) describe event/read-driven samples and turn-boundary repaint; `AGENTS.md:36-38` says resolvers “never subscribe, poll, or cache host data.” Neither says the extension cannot repaint a timer that ages a locally stored notice.

Conclusion: current rules prohibit polling for host data (and instruments owning host subscriptions/data), but do not expressly forbid a timer used solely to advance notice visibility/fade and request repaint. Timer behavior and lifecycle/disposal still need design/spec coverage. The statusline layout creates its tree at install and retains cell components (`ARCHITECTURE.md:69-77`); render samples are cached per width/sample and invalidated on repaint (`row-renderer.ts:35-45, 95-116`).

### 3. Instrument whose text changes over time

- Contract: `Instrument` is `{ fills, render(readings, width, theme) }` (`instrument.ts:8-12`); binding memoizes one instance per declaration and resolves variables from the current readings (`instrument-binding.ts:16-37`). Resolvers are store-read-only and preformatted per `AGENTS.md:31-38`.
- Width-0 sizing: row renderer probes non-fill cells at width 0; test asserts unchanged text at widths 0 and 200 for non-fill shipped instruments (`tests/instrument.test.ts:337-361`). A changing string independent of width can work; if its length changes, row sizing/reseating must notice changed basis. Rendering is called against current sample after repaint.
- Empty behavior is explicit: statusline spec says “an empty cell MUST otherwise take none” and empty cell occupies 0 columns (`openspec/specs/statusline/spec.md:43-45, 103-110`); all-empty row still assigns slack to first cell (`:112-116`). Width-plan test covers both (`tests/width-plan.test.ts`, search test “empty content cell”).
- Alignment is applied by cell renderer after clipping: left pads right, right pads left, center splits (`tests/row-renderer.test.ts` tests `left-aligned cell pads`, `right-aligned`, `centred`; implementation `extensions/jefferson/components/row/row-renderer.ts:65-91`).
- No rule requires a cell to be permanently non-empty. A notice cell becoming text then empty is compatible with the empty-cell rule, provided width plan and alignment behave as existing dynamic samples do. Tests should cover transitions and changed width basis.

### 4. Options

- Each declaration lists accepted string keys in `InstrumentDeclaration.options`; foundational list is frozen `['format','style','label']` (`instrument.ts:15-33`). Shipped instruments generally set `options: FOUNDATIONAL_OPTIONS` (e.g. `components/instruments/status.ts:31-34`).
- `readInstruments` rejects every key not in that instrument's declaration (`configuration.ts:76-93`); currently reads/validates format string, label string and theme style (`:93-123`). A per-instrument duration belongs in the declaration's `options` (e.g. its file's frozen list including the key), with validation/parsing added to this reader before it is bound; it is not a universal config option by default.
- Existing bounded number precedent is document-level `rowGap`: default 1, max 3 (`configuration.ts:65-68`); must be numeric integer 0..3, else whole document rejected (`:253-265`). Tests exercise invalid values and accepted 3 (`tests/configuration.test.ts` around rowGap cases). This demonstrates manual finite-bound validation, not a reusable numeric option framework.

### 5. Styling

- Binding captures configured `style` (or `{}`) and passes it through `resolveFormat` (`instrument-binding.ts:23-37`). Config validates style against live theme via `validateStyle(entry.style, theme)` (`configuration.ts:115-120`; `format.ts:132+`). Segment rendering combines configured style and modifiers and calls theme styling; each render gets the passed live theme (`format.ts`, `resolveFormat`; `tests/configuration.test.ts` style/theme cases).
- Declaration `variableFg` maps variable names and rendered values to `ThemeColor` (`instrument.ts:30-31`); format resolution uses this to override that variable segment's foreground while retaining other styling. Thinking is the concrete example: per-level foreground tokens `thinkingHigh` etc. (`components/instruments/thinking.ts:6-18`), and tests check the level token, configured foreground precedence and live theme resolution (`tests/configuration.test.ts`, tests named `configured foreground...` and `level's token resolves...`). A later fade can use theme token/style machinery, but no existing fade token or alpha/transparency contract was established.

### 6. Tests and baseline

- Feed tests use fake `pi.on` handlers/release tracking and fake `ExtensionContext` (`tests/session-data-feed.test.ts:10-51`), plus fake footer source with controllable branch, statuses, callback and counters (`:99+`). Store tests inject fake readers/repaint counter (`tests/session-data-store.test.ts:36-58`).
- End-to-end harness is `tests/jefferson.test.ts`: fake extension host/session/UI and `setFooter`, invokes factory with fake TUI/theme/footer data and can dispatch subscribed events (`:1-...`, notably setup around `:113-160`); renders lines and counts repaint requests in integration assertions.
- `pnpm typecheck`: passed (`tsc --noEmit`). `pnpm test`: passed, 360 tests, 0 failures.

## Assumptions, Differences, and Unknowns

- Joel explicitly leaves “fade out or disappear” unsettled (`owner-rulings.md:9`); no product choice is made here.
- What exact notice data/events pi exposes, how to suppress transcript notices, and whether APIs permit this are Chidi's responsibility and are not established in this report.
- No alpha/opacity token support or established fade convention was found; whether fade is feasible in Jefferson's styling/terminal API remains unknown. Disappearance needs only text/state timing; fade requires additional verified rendering support.
- Timer lifetime/cleanup and policy for overlapping notices are design questions; no existing timer abstraction was found. Existing one-release teardown is the natural place for any subscription/timer cleanup, but not yet implemented.
- Dynamic width basis changes need explicit row-renderer verification: cached cell values are keyed per sample and width, but tests currently test new samples generally rather than notice expiry driven by clock.

## Addendum 1 — configuration timing and existing formatters

### Configuration timing and repeated cells

In TUI `session_start`, `startup.ts` first releases the prior install, creates the session data feed and store with `feedSessionData(...)`, and only then calls `readConfiguration(...)`; it subsequently passes the parsed rows and a `sample: () => store.sample()` callback to `installFooter` (`extensions/jefferson/startup.ts:36-60`). Thus configuration is read after store/feed creation, but before installing the footer. `installFooter` calls `ui.setFooter`; when the host invokes its factory, it attaches footer data, creates the footer tree, and establishes the repaint callback before returning the component (`extensions/jefferson/footer-setup.ts:24-33`).

A valid row may have one or several cells with the same instrument name. `cellsFromNames` resolves each cell's `instrument` name and binds it (`extensions/jefferson/configuration.ts:139-176`); the array must be non-empty and is capped at ten cells (`configuration.ts:65-66, 139-143, 167-175`). There is no uniqueness check on instrument names among cells. Instrument configuration is instead an `instruments` object keyed by instrument name; `readInstruments` iterates that object and prepares one configured binding per name (`configuration.ts:76-123`). `instrumentBindings` caches a bound instrument by declaration name (`extensions/jefferson/components/instruments/instrument-binding.ts:16-37`). Cell objects accept only `instrument` and `align`, so they cannot carry per-cell format/style/label or other option values (`configuration.ts:149-154`). Consequently two `notice` cells can be declared, but they share the single `notice` option set configured once under `instruments.notice`; the current configuration shape has no per-cell distinct options.

### Existing compact-token and USD-cost formatters

`compactCount` is the shared count formatter (`extensions/jefferson/components/instruments/compact-count.ts:2-13`): values below 1,000 are rendered as the integer/string unchanged; from 1,000 up to (exclusive) 100,000 it divides by 1,000, rounds to one decimal place, and appends lowercase `k`; from 100,000 up to (exclusive) 1,000,000 it rounds to the nearest whole thousand and appends `k`; from 1,000,000 up to (exclusive) 10,000,000 it divides by one million, uses one decimal place, and appends uppercase `M`; at 10,000,000 and above it rounds to the nearest whole million and appends `M`. The thresholds and branches are explicit at `compact-count.ts:2-12`.

The tokens instrument applies that formatter separately to input, output, cacheRead, cacheWrite and their summed total (`extensions/jefferson/components/instruments/tokens.ts:5-16`). Therefore:

- 20,000 → `20.0k`
- 184,000 → `184k`
- 1,500,000 → `1.5M`

USD cost has no separate helper: the cost variable formats the total as `$${totals.cost.toFixed(3)}` (`extensions/jefferson/components/instruments/cost.ts:4-9`), i.e. dollar sign and exactly three fractional digits (rounding according to JavaScript `Number.prototype.toFixed`). Examples:

- $0.004 → `$0.004`
- $0.41 → `$0.410`
- $1.84 → `$1.840`

`format.ts` parses and resolves the instrument's configured format, substitutes these already-formatted variable strings, applies string mutations/style modifiers, and renders segments (`extensions/jefferson/format.ts:62-...`, `resolveFormat`); it does not introduce another compact-count or USD format rule. A configured format can select or arrange the variables, but their formatting is owned by these instrument resolvers.

## Addendum 2 — configuration order, instrument options and formats

### Configuration order and inputs

In TUI `session_start`, `startup.ts` releases the previous install, then creates the feed and store with `feedSessionData(...)` (`extensions/jefferson/startup.ts:36-50`). Only after that does it call `readConfiguration(...)`, passing configuration paths derived from `ctx.cwd`, the trust result from `ctx.isProjectTrusted()`, and `ctx.ui.theme` (`startup.ts:51-55`). It then installs the footer with the resulting rows and a sample callback backed by the already-created store (`startup.ts:59-68`). The footer factory later attaches footer-only data, creates the footer renderer, and connects repaint (`extensions/jefferson/footer-setup.ts:24-33`).

`readConfiguration` accepts a `ConfigurationSource` and resolves/reads the agent or trusted-project document; it normalizes using only the document, notices, and `source.theme` (`extensions/jefferson/configuration.ts:41-49, 290-343`). It does not access or consume the feed or store. The theme it validates styles against is supplied directly from `ctx.ui.theme` at startup (`startup.ts:51-55`; style validation in `configuration.ts:115-120`). Moving `readConfiguration` before `feedSessionData` would not change its inputs as presently called or implemented: cwd, trust decision and UI theme are all taken from `ctx` independently, and the configuration reader does not depend on store/feed state.

### Instrument options and formats

`InstrumentDeclaration.options` is a declaration-owned readonly list (`extensions/jefferson/components/instruments/instrument.ts:18-33`). `FOUNDATIONAL_OPTIONS` is the frozen `format`, `style`, `label` list (`instrument.ts:35`). A declaration can supply a different list and therefore declare its own extra option keys; however, no existing shipped instrument demonstrates that: declarations for `path`, `status`, `tokens`, and the other shipped instruments use `FOUNDATIONAL_OPTIONS` (`extensions/jefferson/components/instruments/path.ts:33`, `status.ts:33`, `tokens.ts:16`).

`readInstruments` rejects option keys absent from that declaration's `options` (`extensions/jefferson/configuration.ts:76-92`). It currently gives special treatment to `format`: it must be a string, then `parseFormat(declaration, format ?? declaration.defaultFormat)` parses it (`configuration.ts:92-106`). `parseFormat` recognizes `$name` only when `name` is an own declared variable (or declared `$bar`), and rejects undeclared variables (`extensions/jefferson/format.ts:48-74`). It also processes declared variable forms and modifiers in the format (`format.ts:76-116`).

The existing configuration stores one `ConfiguredInstrument` per instrument name in a map, and the binding caches one bound instrument per declaration name (`configuration.ts:76-123`; `extensions/jefferson/components/instruments/instrument-binding.ts:16-37`). Thus the current `format` option is one configured format per instrument name, not a list of independent formats per cell or notice kind. `variableForms` are different: a declaration may provide multiple named resolvers for one variable, selected inline after that variable as `$variable|form` (`instrument.ts:21-25`; parser implementation at `format.ts:76-94`). The shipped `path` declaration demonstrates `base`, `absolute`, and `relative` forms for its one `path` variable (`components/instruments/path.ts:27-33`). Forms select alternative renderings for an individual variable within the single format; they do not configure multiple whole-instrument formats.

### `rowGap` bound

The reader defaults `rowGap` to 1 and caps its maximum at 3 (`extensions/jefferson/configuration.ts:65-68`). When present, it accepts only a number that is an integer and lies from 0 through 3 inclusive; otherwise it throws a `RejectedConfiguration` with this exact text template: `rowGap must be a whole number from 0 to 3: ${JSON.stringify(value)}` (`configuration.ts:253-265`). The top-level reader catches that rejection and reports it inside `pi-jefferson: <path> was rejected (<message>); rendering the default row` (`configuration.ts:328-344`).