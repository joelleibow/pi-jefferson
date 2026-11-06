# Proposal

## Why

The footer says two things about a session — the active model and the thinking level — in cells that
leave `W mod N` columns blank at the window's right edge, in a text shape nobody can change. pi
already holds the rest of the data a statusline wants (`ctx.cwd`, `ctx.getContextUsage()`, the
session's usage entries), pi-tui already owns the allocation the row renderer reimplements, and the
owner has ruled the shape of all three parts of this change (`owner-rulings.md`, 2026-11-05). What
is missing is the wiring: layout handed to pi-tui, the instruments pi's own data supports, and a
per-instrument `format` and `style`.

## What Changes

No existing document stops working, so nothing here is marked **BREAKING**: the cell object keeps
its two keys and a document that declares none of the new configuration renders what it renders
today. Every document's *geometry* changes, because a row now fills the window.

- **The layout goes onto pi-tui.** The footer becomes a `VStack` of one `HStack` per configured row,
  built once when the footer is installed, and each cell reads the current render's sample. Every
  cell entry gets `basis: floor(W / N)` together with `grow: 1`, so the host's allocator hands the
  leftover columns out — one at a time to the row's earliest cells — and the row spans the full
  width. `basis` without `grow` is not an option: pi-tui's grow pass computes each share from what
  the cells before it left, so ten cells over 80 columns come out 13,11,10,9,8,7,6,6,5,5. Once built
  is not once sized: `Stack.addChild` copies its option values into fresh internal entries held
  behind `protected readonly entries`, with no setter, so a new per-render `basis` reaches a built
  row only through the public typed route — `clear()` plus `addChild(component, { basis, grow,
  shrink })` when the width changes, which keeps every cell component and retires only the entry
  options. No cast past `protected`, and no deep import of the unexported `LAYOUT_NODE` the stack
  hangs its layout node on.
- **The trailing-remainder guard dies.** With the allocator spending every column, the pad-to-width
  guard at the end of `renderRow` is unreachable and goes, and `ARCHITECTURE.md`'s "Fidelity"
  caveat — which states the remainder stays blank at the right edge — goes with it. Its "Row
  renderer" paragraph's claim that the division is wholly ours becomes half true and is rewritten:
  the basis is ours, the remainder is the allocator's.
- **A row holds 1 to 10 cells, and the default row is ten placeholder cells.** This confirms what
  ships (`DEFAULT_CELLS`/`MAX_CELLS` are already ten, an empty `cells` list is already rejected), so
  no requirement changes for it. The owner proposed a ceiling of seven and withdrew it: with the
  remainder spread by `grow`, no ceiling has a geometric advantage over another.
- **One line stays a cell guarantee, not a validation duty.** Whatever an instrument returns — a
  format carrying a line break, a bar, an emoji — its cell renders exactly one line clipped to its
  width. Configuration validation MUST NOT police format text to keep that true.
- **Four new instruments, from pi's own data.** `path` (the basename of `ctx.cwd`), `context`
  (`ctx.getContextUsage()`), `tokens` and `cost` (the usage-bearing entries of
  `ctx.sessionManager.getEntries()` summed the way pi's own built-in footer sums them). Nothing
  reads the terminal and nothing shells out; the basename is `node:path`, which the entry already
  imports. The six are model, thinking, path, context, tokens, cost.
- **Instruments are configured by name, once.** A new top-level `instruments` section of the
  existing extension-owned `pi-jefferson.json` configures each instrument once by name; a cell
  names the instrument it holds and renders it as configured, or with its declared defaults. The
  trusted-project document still replaces the agent document whole, and whole-document rejection
  still renders the default row with a warning that names what was wrong. An unknown instrument
  *name* in a cell is still a warning plus a `blank` cell, not a rejection.
- **Two foundational options.** `format` is plain text with `$variables` — an instrument hands out
  each of its variables already formatted, on the pattern of Starship's `memory_usage` offering
  `$ram` and `$ram_pct`, so the format language never formats a number. `style` is pi's
  `ThemeStyle`: theme color tokens plus `bold`, `dim`, `italic`, `underline`, `inverse`,
  `strikethrough`, applied with `theme.style()`. A cell's `style` is applied per non-`$bar` segment
  rather than once around the resolved format, because `$bar` emits resets of its own: styling the
  prose on either side of it as its own segment keeps those resets from stripping it. The owner's
  own model format, `🧠: $model from $provider`, is what a configured format looks like.
- **No Markdown.** pi-tui's `Markdown` wraps instead of clipping, parses block syntax, and would
  read Markdown inside data values. A format's text is literal: `[`, `]`, `(` and `)` are the
  characters they are, and `$` is the only special character, escaped `\$`.
- **`$bar` is a variable, not an option.** It takes the width the rest of the format leaves in the
  cell, shrinks to nothing when nothing is left, a format holds at most one width-taking variable,
  and it is drawn with block characters in theme colors — no new dependency.
- **Each instrument is declared once.** Its name, its variables, its defaults and its options live
  in one declaration that configuration, validation and rendering all read, so adding an instrument
  means adding one declaration and no second list of names.
- **Out of scope, by ruling:** the git instrument (a separate change — pi exposes only the branch,
  and dirty or ahead/behind counts would need git run directly), row-level justify, gaps,
  proportional widths, a fourth alignment, the manifest `description` drift, and the parked
  clickable-cell idea.

## Capabilities

### New Capabilities

None. Instruments and their configuration belong to the capability that already owns how a cell's
content is declared and rendered — `statusline` holds `Cell content comes from an instrument`,
`Configuration designates each cell's instrument`, `The model instrument` and `An instrument
resolves a cell's text by reading the store`. A second capability would put `The model instrument`
and `The cost instrument` in different specs for no reader's benefit.

### Modified Capabilities

- `statusline`: eight requirements are amended and eleven are added.
  Amended — `Cells are evenly distributed across the width` (basis plus `grow: 1`, remainder
  allocated, row spans the width); `Instrument text is bound by the row's geometry` (a cell occupies
  its allocated width, and a right-aligned last cell now ends at the window's edge); `A row is one
  line tall` (the one-line guarantee is the cell's, whatever an instrument returns); `Cell content
  comes from an instrument` (`blank` renders its configured format, whose default is the
  placeholder text); `An instrument resolves a cell's text by reading the store` (an instrument
  resolves its declared variables from the store and hands them to its format already formatted);
  `Configuration designates each cell's instrument` (a cell renders its instrument as configured,
  or with its defaults); `The model instrument` and `The thinking instrument` (each declares its
  variables and its default format).
  Added — `The footer's tree is built once and reads the current render's sample`; `An instrument is
  declared once, and every reader reads that declaration`; `An instrument's configuration lives in
  the extension's own document`; `An instrument's format is plain text and variables`; `An
  instrument's style is pi's ThemeStyle`; `An instrument's style is validated when its document is
  read`; `$bar takes the width the rest of the format leaves`; and the four instruments `The path
  instrument`, `The context instrument`, `The tokens instrument`, `The cost instrument`.
- `session-data-store`: five requirements are amended, all of them consequences of the store
  growing datums. `The store holds the data its instruments display` (the working directory, the
  host's context usage, and the session's token and cost totals enter; the working directory leaves
  the not-held list); `Freshness never exceeds the host's delivery` (each new datum's source and
  currency — the context usage read per render sample, the entry scan keyed on the session and leaf
  ids); `Expensive derivations are bounded and invalidated by name` (a derivation may read the host
  at sample time, and the entry scan is keyed and bounded, with `turn_end` a repaint trigger rather
  than a key); `A pushed change that alters displayed data results in a repaint` (a turn boundary
  that changes a displayed total repaints); `Store data does not survive a session replacement`
  (re-seeding covers the new datums).
- `extension-source-layout` is inspected and **not** amended: a declaration source file under
  `extensions/jefferson/` is an ordinary source file inside an established pattern, which its
  `Growth is a named change` requirement explicitly exempts; ADR 0001 already lets any shipped file
  import a host package, which is how pi's `ThemeStyle` type arrives; and no root, entry, or
  manifest field moves, so CI's invariant check is untouched.

## Impact

- `extensions/jefferson/row-renderer.ts`: the tree is built once in `createFooter` rather than per
  render; each cell entry carries `basis: floor(W / N)` and `grow: 1`, re-seated with `clear()` plus
  `addChild` when the width changes; the trailing-remainder guard goes; `invalidate()` stops being a
  no-op, because styled text may be cached by width and the host invalidates the footer when the
  theme changes.
- `extensions/jefferson/instrument.ts`: the shipped table of three becomes declarations of seven
  (`blank` plus the six), each carrying its name, variables, defaults and options. Where the
  declarations live — grown inside `instrument.ts`, or in a new source file named for what it owns —
  is design's; either is an ordinary source file under the declared load root.
- `extensions/jefferson/configuration.ts`: reads and validates the `instruments` section against
  the declarations, validates each `style` against the live theme the entry hands it
  (`ctx.ui.theme`), and resolves each cell's instrument together with its configuration.
- `extensions/jefferson/session-data-store.ts` and `extensions/jefferson.ts`: the store grows the
  new datums and the derivations behind them; the entry supplies what a sample-time read needs
  (`ctx.getContextUsage()`, `ctx.sessionManager`), passes the footer factory's `theme` argument
  through, and takes whatever subscription a named invalidation needs.
- `tests/`: the geometry expectations that encode `grow: 0` and a blank right edge (three cells at
  100 columns asserting a trailing space, ten cells at 80 asserting eight columns each); the
  per-render-tree and per-`(cell, width)` memoization expectations, which the once-built tree
  changes; the instrument text shapes, which become default formats; the exported-surface test,
  which pins the renderer's and the configuration reader's export lists exactly and forbids a
  contribution-shaped key in the instrument and store sources; the end-to-end harness, whose fake
  context has no `getContextUsage`, no `sessionManager` and hands the footer factory no `theme`; and
  new tests for the four instruments, formats, styles, `$bar`, and the new section's error policy.
- Docs: `ARCHITECTURE.md` (the "Row renderer" paragraph, the "Fidelity" section, the instrument and
  store paragraphs), `AGENTS.md` ("Adding an instrument" becomes "add one declaration"; the two
  traps stay), and `README.md` (its status paragraph says formatting is not built yet, which this
  change makes false, and names only two instruments).
- Untouched: `package.json`, `tsconfig.json`, and both workflows under `.github/workflows/`.
  No dependency moves — the host packages stay `peerDependencies` at `*`, and the bar
  is drawn from block characters rather than a package. A new source file under the declared load
  root needs no manifest or CI edit. The manifest `description` still names the retired vocabulary;
  the owner held that drift out of this change.
- Host version drift: `devDependencies` pin the host at `^1.4.0` and this repository resolves 1.4.0,
  while the research read the 1.5.0 installed globally. I re-read the load-bearing surfaces in the
  resolved 1.4.0 and they are all present and identical in shape: `ctx.getContextUsage()` and
  `ContextUsage`, `ctx.sessionManager: ReadonlySessionManager` (the same `Pick`, still without
  `getEntryCount`), `ThemeStyle` and `Theme.style()` exported from the package index, pi-tui's
  `TextAttributes` with exactly those six booleans, `SEGMENT_RESET` around every child segment, and
  `allocateStackSizes`' grow loop handing remainder columns to earlier entries one at a time.
  Nothing this change rests on is 1.5.0-only. Whether the floor is raised is design's.

## Where the evidence and the rulings collide

The ruling wins in every case; each collision is named so the council can re-check it.

1. **`ARCHITECTURE.md` states the opposite geometry.** Its "Fidelity" section says the remainder
   stays blank at the right edge and calls that a property, not a defect, and its "Row renderer"
   paragraph says the division is ours "because the allocator distributes by weight rather than
   dividing". The ruling hands the remainder to the allocator. Both passages change in this change.
2. **The host shows a full path; the ruling says basename.** pi's own footer renders
   `formatCwdForFooter(cwd, home)` — the whole directory with home collapsed to `~` — plus the
   branch and session name. The ruling is the basename of `ctx.cwd`, and pi provides no basename
   pre-chewed, so it is a `node:path` call.
3. **The host falls back where the store forbids it.** `ctx.thinkingLevel` is optional; pi's footer
   renders `state.thinkingLevel || "off"` and hides the level unless `model.reasoning`. The store's
   binding guarantee is that unknown stays distinguishable from a value, so `thinking` keeps
   rendering nothing when the level is unknown rather than claiming `"off"`.
4. **Chidi's cadence finding would retire two subscriptions.** Because the footer renders on every
   frame, a cell that reads the host fresh in `render()` needs no `model_select` or
   `thinking_level_select` subscription at all. The store's binding guarantee is that a pushed
   change altering displayed data results in a repaint the store requests itself, so both
   subscriptions stay.
5. **"Mirror pi's own footer" is not reachable by import.** The host sums its totals with
   `createUsageTotals`/`addUsageTotals` and formats them with `formatTokens`, but the package's
   `exports` map offers only `.` and `./rpc-entry`, so neither is importable and neither is
   re-exported from the index. The four-category scan and the compact-number formatting are
   therefore Jefferson's own, written to the host's categories and thresholds so the numbers match.
   Likewise `getEntryCount()` is not on `ReadonlySessionManager`, so the host's cache key cannot be
   copied: the available key is `getSessionId()` plus `getLeafId()`.
6. **The shipped example extension disagrees with the built-in footer.** `custom-footer.ts` sums
   only assistant messages on the current branch; the built-in footer sums four categories
   (`usage` entries, assistant messages, tool-result messages carrying usage, and
   compaction/branch-summary entries) across the whole session. The ruling says mirror the built-in
   footer, so the totals match pi's numbers and not the example's.
7. **pi-ai's `Usage` type is not declarable without a manifest change.** The entry union pi exports
   types usage through `@earendil-works/pi-ai`, which this package does not declare. The totals are
   summed structurally from what pi exports; adding a host package to `peerDependencies` to name one
   type would be a manifest change this proposal does not ask for.
8. **Clipping now meets styling.** `truncateToWidth` inserts a reset before and after its ellipsis
   and closes an open OSC 8 link, and `compositeTuiLine` puts a segment reset around every child.
   The intra-cell reset before a pad stays ours (`AGENTS.md`'s first trap), and styled text is new
   to this change, so the two interact for the first time.

## Shapes the owner left open

These are this proposal's choices, with reasoning — not rulings. The council and Michael should
treat every one as open.

1. **The document key and its nesting.** Chosen: a top-level `instruments` object keyed by
   instrument name, each value holding `format` and/or `style`, sitting beside either envelope
   shape (`{"instruments": …, "cells": […]}` and `{"instruments": …, "rows": […]}` both read). A
   document carrying only `instruments` renders the default row with those instruments configured,
   so a user who wants different formats need not declare rows. Reasoning: it matches the document's
   existing top-level `rows`, "configured once by name" maps to one key per name, and it keeps cell
   objects at their two ruled keys. Rejected: per-cell inline configuration, which the ruling
   excludes, and a namespace inside pi's `settings.json`, which does not exist.
2. **Whether usage-derived datums live in the store or are read at sample time.** Chosen: the store
   derives them, at most once per render, from a synchronous host read the entry supplies. The
   `getEntries()` scan is keyed on `(getSessionId(), getLeafId())` — the host's own footer key minus
   the entry count `ReadonlySessionManager` does not expose — and the leaf advances on every append,
   so any change to the session's entries re-runs it. `ctx.getContextUsage()` is read once per render
   sample rather than frozen between invalidations, because the host pushes no change to it and it
   moves on a model selection as well as on an append. `turn_end` remains available only as a
   repaint trigger and is not a sufficient invalidation on its own: it never fires for `compaction`,
   `branch_summary` or `type: "usage"` appends, while all three advance the leaf. A session
   replacement invalidates everything. Reasoning: `getEntries()` copies the whole session array, so
   it must not run per cell or per frame; the store's existing `Expensive derivations are bounded and
   invalidated by name` requirement already describes the frame; and the entry keeps computing
   nothing, which is its stated job. Rejected: the entry summing totals and pushing them in, which
   would put arithmetic in the entry and leave freshness to pi's own render cadence; and `turn_end`
   as the key, which the emit-site evidence shows misses three of the four categories the totals
   count.
3. **Variable names and default formats.** Chosen, using pi's own field spellings inside the `$`:
   `blank` — no variables, default the placeholder text; `model` — `$provider`, `$model`, default
   `$provider: $model`; `thinking` — `$level`, default `thinking: $level`; `path` — `$path`,
   default `$path`; `context` — `$tokens`, `$window`, `$percent`, `$bar`, default `$percent/$window`
   with `$bar` opt-in; `tokens` — `$input`, `$output`, `$cacheRead`, `$cacheWrite`, `$totalTokens`
   (the sum of those four, because pi's own `addUsageToTotals` accumulates exactly them and never
   reads `usage.totalTokens`), default `$totalTokens`; `cost` — `$cost`, default `$cost`.
   Reasoning: the two shipped instruments keep the text they render today, so no document changes
   appearance except by geometry; the new ones mirror the numbers pi's own footer shows
   (`43.2%/200k`, `20.4k`, `$0.123`). The owner's
   `🧠: $model from $provider` is read as a configured format, not a proposed default — if he wants
   it as the default, it is one line in one declaration.
4. **Error policy inside the `instruments` section.** Chosen: an option key an instrument does not
   have, a `$variable` it does not hand out, and a `style` whose shape pi's `ThemeStyle` does not
   allow each reject the whole document with a warning naming the offender — the cell-key precedent,
   which reasons that a statusline silently rendering something other than what was declared is
   worse than a loud failure. A name in `instruments` that the extension does not implement warns
   and the document is accepted — the unknown-instrument-name precedent. An unresolvable theme
   *token* name is caught at parse time, not at render time. The document is read in the
   `session_start` handler, where `ctx.ui.theme` hands the extension the live theme, so a string `fg`
   is checked against that theme's foreground slots and a string `bg` against its background slots,
   and a color string or number naming no token goes through pi-tui's `parseColor()` there and is
   kept as a `Color` object. It cannot wait for render: `theme.style()` throws `Error: Unknown theme
   color` on a raw color string and on a wrong-slot token. pi exports the token *type* but not the
   token list, so the check reads the live theme rather than a list copied into Jefferson, which
   would drift with the host's.
5. **Unknown values, per instrument.** Chosen: `model` and `thinking` render nothing when a datum is
   unknown, as they do today, rather than a format with a hole in it; `context` hands out `?` for a
   null estimate, so the cell renders `?/<window>` — what pi's own footer prints after a compaction —
   and `$bar` draws its whole track unfilled in `dim`, there being no fraction to fill; it renders
   nothing when the host reports no usage at all; `tokens` and `cost` start at zero, so a fresh
   session renders `0` and `$0.000`.
6. **`$bar`'s colors and thresholds, and who declares it.** Chosen: `context` is the only instrument
   declaring `$bar` in this change; the filled portion (`█`) takes the theme's `warning` above 70 %
   and `error` above 90 % — pi's own footer thresholds — and the cell's configured `style` below
   them, with the empty portion (`░`) `dim`. On the host's `{ tokens: null, percent: null,
   contextWindow }` there is no fraction to fill, so the whole track is the empty portion and
   renders `dim` while the cell shows `?/<window>`. Reasoning: the ruling fixes the pattern (block
   characters, theme color by threshold, no package) but not the values, and the host's are the ones
   a pi user already reads.
7. **How a cell reduces content to one line.** The ruling fixes that it must and does not fix how.
   Chosen: the cell collapses `\r`, `\n` and `\t` to a space and then clips, which is what pi's own
   footer does to status text internally, so it is one expression of Jefferson's own. That pi-tui
   exports no helper for it is version-relative, and true only of the pi-tui 1.4.0 this repository
   resolves (`stripTerminalSequences` strips ANSI and OSC, not control characters): 1.5.0 exports
   `replaceControlCharacters`, but it is escape-naive — its character class covers the ESC byte of an
   ANSI sequence — and it collapses each run of control characters to one space, so it cannot be
   applied to styled text. Jefferson's own collapse therefore stands at either version, and any
   collapse runs before styling, never after.
8. **Whether `blank` takes the two options.** Chosen: yes, like every other instrument, so there is
   one code path and one declaration shape; its default format is the placeholder text it renders
   today, and a configured format lets a user replace the placeholder without writing an instrument.
