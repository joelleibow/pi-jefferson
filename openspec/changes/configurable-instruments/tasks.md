# Tasks

Built from `specs/statusline/spec.md`, `specs/session-data-store/spec.md` and the PL4-approved
`design.md`. `D<n>` is a design decision; `chidi §n`, `chidi Gaps n`, `addendum 1 (Qn)`,
`addendum 2 (Qn)` and `addendum 3` are the host-fact citations the design uses, and no task
re-derives host behaviour — where a task rests on a host fact it cites it and Michael verifies it at
his gate. Addenda 1 and 2 are the Chidi runs `council.md`'s evidence list names (`183718c4`,
`650e92d9`); addendum 3 is the PL8 export-route answer (run `676d9222`).

**Green rule.** Inside a group a `Red` task is meant to fail, and the group's `Implement` tasks
repair it; every *group* ends with `pnpm typecheck` and `pnpm test` passing, so no task leaves an
earlier guarantee broken past its own group's boundary. A red task states which command is red —
`node --test <file>`, `pnpm typecheck`, or both — and a task that changes no behaviour says so.

**Order, and why.** Store first, then layout, then the instrument seam, then the document surface,
then the entry, then docs, then verification (design, Migration Plan). The store leads because
nothing compiles against the grown `Readings` until it exists. Layout leads the seam because it is
the only group that retires an export and rewrites `tests/row-renderer.test.ts` wholesale: landing
it first means the seam's `render(readings, width, theme)` move touches the renderer's final shape
once rather than twice. Two consequences are stated where they land rather than hidden: `createFooter`
gains its `theme` argument in group 3, not group 2, because that is where its first consumer arrives
(no unused parameter); and the entry is edited in four groups (1, 3, 4, 5), each edit arriving with
the seam that forces it.

**Declined, and absent from every task.** The git instrument; row-level justify; gaps; proportional
widths; a fourth alignment; Markdown; Starship's `[text](style)` and `(conditional)` groups; any new
dependency; any manifest, lockfile, `tsconfig.json`, `.github/` or `openspec/specs/` edit (D12, D13);
the retired vocabulary (`widget`, `module`) in source, tests, messages or docs. No task builds,
reserves or scaffolds one. Merge to `main` publishes and needs no release task.

**One tasks-level choice the design left open** (design, Open Questions): the fake `Theme`. Chosen —
a structural fake in one home, `tests/fake-theme.ts`, exposing only `getFgAnsi`, `getBgAnsi` and
`style`, whose slot maps hold a known token set and whose `style` works the way the host's own
`Theme.style` works (addendum 2 Q3): it resolves a token **string** through the same slot maps
`getFgAnsi`/`getBgAnsi` read, passes a `Color` object through pi-tui's
`foregroundAnsi`/`backgroundAnsi`, and hands both to pi-tui's `styleTextWithAnsi` — all three
imported from the `@earendil-works/pi-tui` package root, which re-exports them at 1.4.0 and 1.5.0
alike (addendum 3) and is the route pi's own `theme.js` takes, so the fake needs no deep import. Its
output therefore carries the host's *selective* closes (`\x1b[39m`, `\x1b[22m`) and never a trailing
`\x1b[0m` (Michael's PL7 check of pi-tui `colors.js:237–262`). That last property is load-bearing:
it is what makes the RESET-before-pad path live by default (4.7). A constructed real
`Theme` was beaten — it needs complete per-slot token records (design fact 8), which would put the
host's theme data in a fixture. Naming real host tokens *in a test fixture* is not the copy the delta
forbids: the ban is on shipped source, pinned at 4.10.

---

## 1. The store: three new datums, the keyed scan, the turn boundary

D9, and the store side of D10. Traces to all five `session-data-store` delta requirements. The
readers are faked at the boundary — counting closures over a fixture entry array — never the store.

- [x] 1.1 Red — in `tests/session-data-store.test.ts`, grow `newStore` to inject the two readers
  (`readUsage`, `readEntries`) as counting fakes, and rename `a sample is exactly the three datums, in
  order, carrying the seed` to `a sample is exactly the six datums, in order, carrying the seed`,
  asserting `Object.keys(sample)` deep-equals `["provider", "model", "thinkingLevel", "cwd",
  "contextUsage", "totals"]` — D9's declaration order, not alphabetical — and that the seed's `cwd`
  comes back. `a datum seeded undefined reads undefined, not an empty string and not zero` extends to
  `cwd`. Boundary cases: `contextUsage: undefined` (no limits model, chidi §1.5) and
  `contextUsage: { tokens: null, percent: null, contextWindow: 200000 }` (post-compaction) both read
  back as given, the null never becoming `0`. Verified by: red before 1.7 under `pnpm typecheck`
  (`Readings` has no `cwd`, `contextUsage`, `totals`) and under `node --test
  tests/session-data-store.test.ts` for the keys assertion.
- [x] 1.2 Red — the scan fixture, D14's discriminating one: four entries, one per category the host
  counts (chidi §1.6, addendum 2 Q2) — a `type: "usage"` entry, an assistant message, a toolResult
  message carrying usage, a compaction entry carrying usage — with per-field usage
  `{input: 10, output: 5, cacheRead: 2, cacheWrite: 1, cost: {total: 0.125}}`,
  `{100, 50, 20, 10, 0.25}`, `{7, 3, 0, 0, 0.0625}`, `{1, 1, 1, 1, 0.03125}`, and **every one of
  them carrying a lying `usage.totalTokens`** (`999`, `777`, `555`, `444` — none equal to its own
  four-field sum). Assert `totals` is `{input: 118, output: 59, cacheRead: 23, cacheWrite: 12,
  cost: 0.46875}`, one deep-equal over all five fields: the right answer. Of the two repairs
  Michael's PL7 major finding offered, this takes the **binary-exact fixture**, not the tolerance:
  every cost is a negative power of two (`2^-3`, `2^-2`, `2^-4`, `2^-5`), so the accumulation is
  exact in IEEE 754 and the deep-equal needs neither a stated tolerance nor a rounding step in
  `scanTotals`. The finding is why the old costs are gone — `0.1 + 0.2 + 0.05 + 0.02` accumulates to
  `0.37000000000000005`, so a deep-equal on `0.37` could never go green against a correct
  implementation and would have pushed the writer to round in the store or edit the expectation. The
  wrong answers still differ on this one input — assistant-only gives `{100, 50, 20, 10}` and cost
  `0.25`; reading `totalTokens` gives `2775`; branch-scoping cannot be
  distinguished here, so 1.2's fixture is the whole array `getEntries()` returns and the test names
  that. Boundary cases: a `branch_summary` entry carrying usage counts identically to the compaction
  one; a toolResult message with no `usage` and a user message carrying one both count nothing; an
  entry array with no usage at all gives the five zeros; the `$0.123` cost-*rendering* pin (3.4,
  exercised again at 3.7) keeps its own numbers and stays separate from this fixture — no cost here
  is ever rendered. Verified by: red before 1.7.
- [x] 1.3 Red — the key cache, proven by counting `readEntries` calls: two samples under one
  `(sessionId, leafId)` → one call and the *same* `totals` object returned both times (so `cost` and
  `tokens` cannot disagree); a moved leaf → two calls; a changed session id → two calls; a sample
  after `dispose()` → no further call. Boundary cases: `leafId: null` is a key value like any other,
  and a leaf that moves and moves back is two moves, not a hit. Verified by: red before 1.7.
- [x] 1.4 Red — the per-sample context read: `readUsage` is called on **every** sample even when the
  key did not move, and a `contextUsage` that changes with no append (a model selection changing the
  window) is what the next sample returns. Boundary cases: `percent: null` stays `null` through the
  sample, never `0`; `contextUsage: undefined` stays `undefined`. Verified by: red before 1.7.
- [x] 1.5 Red — `turnEnded()`: with totals that changed → exactly one repaint and the next sample
  carrying them; with totals unchanged → no repaint at all; with no `scanCache` yet → the cache is
  filled, no repaint is requested, and the next `sample()` calls `readEntries` once in total (the
  boundary's scan is the one the render reuses); after `dispose()` → no repaint and no reader call.
  Boundary cases: a leaf move that changes only `cacheWrite` still repaints (the comparison is field
  by field, all five); a `turn_end` that arrives before any render is the no-cache case. Verified by:
  red before 1.7 — `turnEnded` does not exist, so `pnpm typecheck` is red too.
- [x] 1.6 Red — totality and replacement (the living `A read is synchronous and total` requirement,
  which this change puts under pressure because `sample()` now calls host readers): inject readers
  that **throw**, `dispose()`, then assert `sample()` returns the all-unknown sample
  (`totals: undefined`, `contextUsage: undefined`, the four strings `undefined`), does not throw, and
  called neither reader (count 0) — D9's step 1 runs before any read. Also: `dispose()` is idempotent,
  a push after disposal requests no repaint, and a sample handed out before disposal keeps its values
  (the existing three tests carry over unchanged). Boundary cases: none beyond the disposed and
  pre-seed paths named. **No `try`/`catch` is added around a live reader call** — the design describes
  none, and adding one would be mechanism the design never described. Totality does *not* rest on the
  readers' bodies being the host's own synchronous getters: a captured ctx's getters throw once the
  ctx goes stale (Michael's PL7 read of pi's `runner.js` `assertActive`). It rests on the host's
  ordering — the host disposes the footer, and through `release` the store, **before** it invalidates
  the ctx (`interactive-mode.js:366–367` `setBeforeSessionInvalidate` → `resetExtensionUI` →
  `setExtensionFooter(undefined)` at `:1898–1910`, which disposes the footer at `:1958`; the same
  ordering in chidi §2.3, at its approximate line numbers) — and 5.3 pins the release half end to
  end. **Settled by Michael at PL7, so the open point this task carried is closed:** the living
  totality requirement does not bind a *live* throwing reader, no design amendment follows, and the
  writer adds no catch. Verified by: red before 1.7.
- [x] 1.7 Implement — `extensions/jefferson/session-data-store.ts` to D9: `UsageTotals`; `Readings`
  grown to the six members in D9's order with `contextUsage: ContextUsage | undefined` (a **type-only**
  import of pi's exported `ContextUsage`, design fact 12) and `totals: UsageTotals | undefined`;
  `seed` grown to the four static datums; the two injected readers beside `requestRender`;
  `scanTotals` counting exactly the host's four categories over the whole session and accumulating the
  five fields, **never reading `usage.totalTokens`** and never naming pi-ai's `Usage` (design fact 6,
  fact 12; proposal collision 7); the `scanCache` closure record keyed `(sessionId, leafId)`;
  `sample()` in D9's four steps returning one `Readings` whose `totals` is the cache's object;
  `turnEnded()` with D9's compare-is-the-rescan rule; `dispose()` clearing both readers with
  `requestRender`. The store still holds no host handle and names no host event. Verified by: 1.1–1.6
  green, `pnpm typecheck` clean, and `rg -n "sessionManager|getContextUsage|pi.on" extensions/jefferson/session-data-store.ts`
  empty.
- [x] 1.8 Implement — grow every other `Readings` fixture so the tree compiles, changing no
  expectation: `tests/instrument.test.ts`'s `seed`, `unknown` and `unreadable()` (the three new
  members are throwing getters there too, so a resolver that reads a datum it does not display fails);
  `tests/row-renderer.test.ts`'s `readings` and `live`. Verified by: `pnpm typecheck` clean and
  `pnpm test` green with every assertion byte-identical to `main` apart from the grown fixture
  literals — `git diff -U0 tests/instrument.test.ts tests/row-renderer.test.ts | grep -E '^[+-].*assert\.'`
  shows no changed assertion line.
- [x] 1.9 Implement — `extensions/jefferson.ts` seeds `cwd: ctx.cwd` and wraps `ctx` in the two
  readers (`readUsage` returning `ctx.getContextUsage()` plus `getSessionId()`/`getLeafId()`;
  `readEntries` returning `ctx.sessionManager.getEntries()`), so the entry still computes nothing and
  the store still holds callbacks (D9). In the same task, `tests/jefferson.test.ts`'s fake `ctx` grows
  `getContextUsage()` and a fake `sessionManager` exposing exactly the three members the entry reads —
  `getSessionId`, `getLeafId`, `getEntries` over a fixture entry array (D14's harness bullet; chidi
  §1.6) — because an installed footer now samples through them. Boundary cases: a session whose
  `getContextUsage()` returns `undefined`, and an empty entry array, both install and render.
  Verified by: `node --test tests/jefferson.test.ts` green with no expectation changed, and
  `rg -n "getEntryCount|getBranch|buildSessionProjection" extensions/` empty (the readonly view
  withholds the first; the design keys on none of the others — design fact 5, chidi Gaps 1).
- [x] 1.10 Green — `pnpm typecheck` and `pnpm test` both pass at the group boundary. Verified by: the
  two exit statuses, recorded.

## 2. The layout: the once-built tree, the allocator's remainder, the sample-keyed memo

D8, and D7's steps 3–5 unchanged. Traces to `Cells are evenly distributed across the width`,
`Instrument text is bound by the row's geometry`, `A row is one line tall`, and `The footer's tree is
built once and reads the current render's sample`. D14's rule governs the whole group: the geometry
and memo expectations **move**, they are not duplicated — a parallel test left beside the old one
would let a stale expectation survive.

- [ ] 2.1 Red — in `tests/row-renderer.test.ts`, the three geometry fixtures D14 names, moved onto
  `createFooter([row], () => readings).render(width)[0]` (`renderRow` retires at 2.6). (a) Rename
  `a width that does not divide evenly leaves the remainder blank at the right edge` to
  `a width that does not divide evenly spends the remainder on the row's earliest cells`: three cells
  at 100 assert `composed(padEnd(34), padEnd(33), padEnd(33))` — **34/33/33**, with the old trailing
  `+ " "` and the old `line.at(-1) === " "` assertion both gone, and `visibleWidth(line) === 100`.
  (b) `a width that divides evenly gives every cell the same columns` keeps its bytes (eight cells at
  80 → `composed(...8 × "Lorem ipsu")`) but now proves the allocator reached the same answer with
  `grow: 1`; the comment saying the cell text fits exactly stays. (c) New, from the delta's scenario:
  `the default row of ten cells at 132 spans all 132 columns` — **14/14/13×8**. Boundary cases: a row
  whose cells outnumber the columns — `more cells than columns still renders exactly one line of the
  width` (eight cells at 4) keeps its two assertions, and the widths are now 1,1,1,1,0,0,0,0, so four
  cells clip to zero columns, where pi-tui's `truncateToWidth` returns `""` for `maxWidth <= 0`; and
  a width that divides evenly, where no cell grows. Discriminator: `grow: 0` gives 33/33/33 plus a
  blank column and 13×10 plus two blank columns, so (a) and (c) both fail under the shipped geometry,
  and `grow: 1` *without* the basis gives 13,11,10,9,8,7,6,6,5,5 at ten cells over 80 (owner-rulings;
  chidi §4.2), which (b) and (c) fail. Verified by: red before 2.6 under `node --test
  tests/row-renderer.test.ts`.
- [ ] 2.2 Red — the resize and the re-seat. `cell widths are recomputed when the width changes` moves
  onto one footer rendered at 100 then 90: assert the second line is `composed(3 × padEnd(30))`, that
  `visibleWidth` is 90, and that **no cell kept its previous width** (34/33/33 → 30/30/30). Beside it,
  the built-once proof: with a fixture `sampleReadings` returning **the same object identity** every
  call, render twice at the same width and assert the capture instrument resolved once per cell, not
  twice — a per-render tree rebuilds the cell closures and their memos, so it resolves again; a
  once-built tree whose memo is keyed on `(sample, width)` does not. That is how component identity is
  observed, the components being internal (D8). Also assert the re-seat took the public typed route:
  `rg -n "entries|LAYOUT_NODE|pi-tui/dist|as unknown as" extensions/jefferson/row-renderer.ts` is
  empty, and the file's only pi-tui imports are `HStack`, `VStack`, `truncateToWidth`, `visibleWidth`
  and `type Component` (design fact 2, fact 3; the council rejected the cast and the deep import).
  Boundary cases: the **first** render seats the empty stacks through the same path (`lastWidth` starts
  `undefined`) — assert a footer whose first render is at 100 gives 34/33/33 with no second sizing
  path; and rows of differing cell counts in one footer each take `floor(width / that row's count)`.
  Verified by: red before 2.6 — the identity half fails on `main` (the memo dies with the render) and
  the geometry half fails under `grow: 0`.
- [ ] 2.3 Red — the sample slot and the memo, restated per D14 rather than added beside:
  `one render samples the store exactly once, whatever the row and cell count` keeps its name and
  **accounts for the install-time initial sample** — `createFooter` seeds its render slot by calling
  `sampleReadings()` once at build (D8), so three rows of eight cells assert 1 after install, 2 after
  the first render, 3 after the second. `an instrument renders once per (cell, width) …` is renamed to
  `an instrument resolves once per (sample, width) within a render, and again in the next render`: the
  within-render half keeps the widths `[30, 30, 30, 10, 10, 10, 30]` and the one-`readings`-object
  assertion; the across-render half asserts that a second render at the same width with a **fresh
  sample object** resolves again. `a push between two renders shows up in the next render and not
  before` carries over unchanged (D14). `two cells holding the model instrument resolve identical
  text` carries over in **bytes but not in imports** — it imports the `model` `Instrument`, which
  3.1/3.11 retire, so it cannot cross the group boundary as it stands; 3.13 names the move.
  Boundary cases: two renders at the same width with the same sample object (2.2's hit) and a
  width change with the same sample object (a miss — the memo carries `width`). Discriminator: a
  width-only memo passes the within-render half and fails the across-render half, which is exactly the
  stale-styled-text survival D8 forbids. Verified by: red before 2.6 — the counts are off by the
  install-time sample and the across-render half fails.
- [ ] 2.4 Red — every remaining `renderRow` fixture moves onto a single-row footer with its expected
  bytes recomputed from the allocator's widths; the rule is `floor(W / N) + 1` for the first
  `W mod N` cells and the disappearance of every row-level `+ " ".repeat(remainder)` tail. Named, so
  nobody discovers them by failing: the three-cell-at-20 fixtures — `short cell text is padded…`,
  `a left-aligned cell pads to the right of its text`, `a right-aligned cell pads to the left of its
  text`, `a centred cell splits its pad across both sides`, `a centred cell's odd pad puts its extra
  column on the right`, `a wide glyph dropped by the clip…`, `an emoji clipped at the boundary…`,
  `a combining mark is measured in columns, not code units`, `an ANSI-styled cell's pad carries no
  styling` — go from 6/6/6-plus-2 to **7/7/6**, so the left case's `visible(line)` becomes
  `"ab     ab     ab    "`, the right case's `"     ab     ab    ab"`, the centred case's
  `"  ab     ab     ab  "`, and the pad-side invariant each test exists for is unchanged; the
  two-cell-at-21 fixture `text wider than its cell renders identically under any alignment` goes from
  10/10-plus-1 to **11/10**, so its three lines are still equal to each other and its
  `visible(left)` string is recomputed from an 11-column and a 10-column clip; the two-cell-at-9
  fixture `wide glyphs and ANSI escapes are measured in visible columns, not string length` goes from
  4/4-plus-1 to **5/4**; and the fixtures already at a zero remainder — 3@12, 2@20 (twice),
  `the host closes an open style between cells`, `the footer renders one line per row…` — keep their
  bytes exactly. Every moved test keeps `visibleWidth(line) === width` and its one-line assertion.
  Boundary cases: the odd-pad fixture's moved bytes are `"  abé  "` for each of the first two cells
  and `" abé  "` for the third — at 7/7/6 the first two pads are 4 and split evenly (2/2), so the
  extra-column-on-the-right invariant now rests on the **third** cell alone, whose pad of 3 splits
  1/2 (before the move all three cells had an odd pad of 3 at 6/6/6, which is what the retired
  sentence described); the wide-glyph and combining-mark pads are still computed from the
  **clipped** result (trap two). Verified by: red before 2.6 under `node --test
  tests/row-renderer.test.ts`, and `rg -n "renderRow" tests/` empty afterwards.
- [ ] 2.5 Red — `footer.invalidate()` stops being a no-op: with a fixture returning one constant
  sample object, render, call `invalidate()`, render again, and assert the capture instrument resolved
  again — and, for the row views, that a three-row configuration still renders three lines after the
  invalidation (`A row is one line tall`'s footer-height scenario, which the existing
  `the footer renders one line per row…` also carries). Boundary cases: `invalidate()` twice in a row
  is harmless; `invalidate()` before any render does not throw. Verified by: red before 2.6 — today's
  `invalidate()` is documented as a no-op, so the resolve count stays 1.
- [ ] 2.6 Implement — `extensions/jefferson/row-renderer.ts` to D8: the tree built once in
  `createFooter` (per row, in declaration order, the cell `Component`s constructed once and kept in a
  closure array; each row's `HStack` constructed empty as `new HStack([], { gap: GAP })` with `GAP`
  still `0`; the tree `new VStack(rowStacks, { gap: 0 })`); the `let current: Readings =
  sampleReadings()` render slot, overwritten at the start of every `footer.render(width)` before
  `tree.render(width)`, with no guard on the read (the invariant is structural — no cell is reachable
  except as a child of the tree); the `lastWidth` re-seat — on `width !== lastWidth`, each row runs
  `stack.clear()` then `stack.addChild(component, { basis: Math.floor(width / row.cells.length),
  grow: 1, shrink: 0 })` for each kept component in order, and the first render takes that same path;
  the memo `cached: { sample: Readings; width: number; text: string } | undefined` recomputed when
  `cached?.sample !== current || cached?.width !== cellWidth`; `component.invalidate()` clearing the
  memo and `footer.invalidate()` cascading it to every cell. The cell pipeline's clip, pad and
  RESET-before-pad stay exactly as they are (D7 steps 3–5, both traps). **Retired:** `renderRow`, the
  trailing-remainder guard, the width-only memo; the export list becomes `createFooter` and the
  `Footer` type, and in the same task `tests/jefferson.test.ts`'s export-surface pin for the renderer
  becomes `["createFooter"]` (D14). Verified by: 2.1–2.5 green, `pnpm typecheck` clean,
  `rg -n "renderRow|remainder" extensions/jefferson/row-renderer.ts` empty.
- [ ] 2.7 Green — `pnpm typecheck` and `pnpm test` both pass; the two end-to-end expectations that
  must *not* have moved are checked: `a rejected configuration warns and still installs the default
  row` (ten cells at 80 → 8 each, remainder 0) and `a right-aligned cell ends at its cell's right
  edge end to end` (two cells at 80 → 40 each, index 66) keep their bytes because 80 divides by ten
  and by two. Verified by: `git diff tests/jefferson.test.ts` shows only the renderer export pin and
  1.9's harness growth in those two tests' neighbourhoodhood.

## 3. The seam, the declarations, and the format language

D1, D2, D4, D5, D7's steps 1–2, D11. Traces to `Cell content comes from an instrument`,
`An instrument resolves a cell's text by reading the store`, `The model instrument`,
`The thinking instrument`, `The path instrument`, `The context instrument`, `The tokens instrument`,
`The cost instrument`, `An instrument is declared once…`, `An instrument's format is plain text and
variables`, `$bar takes the width the rest of the format leaves`, and the one-line half of
`A row is one line tall`. New source file `extensions/jefferson/format.ts` and new test file
`tests/format.test.ts` (the house rule: tests live under `tests/`, named for their source file; a
non-`.test.ts` helper under `tests/` is not run by `node --test`).

- [ ] 3.1 Red — in `tests/instrument.test.ts`, the declarations replace the instrument objects: a test
  asserts the shipped table holds exactly the seven names `blank`, `model`, `thinking`, `path`,
  `context`, `tokens`, `cost`; that each declaration carries its own variable names, its
  `defaultFormat` and `options` deep-equal to `["format", "style"]` (D2's one frozen
  `FOUNDATIONAL_OPTIONS` tuple); that `context` is the only one declaring `bar`; and that
  `instrumentNamed` resolves each of the seven and stays `undefined` for `git`, `branch`, `nope`,
  `toString`, `constructor` and `hasOwnProperty`. `labelled` retires, and `model`/`thinking` retire as
  individual exports (open point, named: `blank` **stays** exported as a declaration because
  `configuration.ts`'s `blankCells()` must not depend on a lookup that can miss — if Michael reads D2
  as retiring it too, the alternative is `instrumentNamed("blank")` with a fallback branch that can
  never run, and his word settles it; `DEFAULT_CELL_TEXT` stays exported either way). The three text
  shapes become default-format renders, same bytes: `anthropic: claude-opus-4`, `thinking: high`,
  `DEFAULT_CELL_TEXT`. Alongside, D14's default sweep: one test parses **and renders every shipped
  default** through `parseFormat`/`resolveFormat` against a fully-populated `Readings`, asserting the
  four new bytes too — `pi-jefferson` (from `/Users/joelleibow/Projects/pi-jefferson`), `43.2%/200k`,
  `0`, `$0.000`; a declaration whose default fails to parse is a shipped-code bug, and this loop is
  the check (D4). Boundary cases: `blank` declares no variables and no `bar`, so a format naming
  anything under `blank` is a rejection (3.2); `thinking`'s default keeps the literal `thinking: `
  prefix. Verified by: red before 3.12/3.13 under `pnpm typecheck` (`InstrumentDeclaration` does not
  exist) and `node --test tests/instrument.test.ts`.
- [ ] 3.2 Red — in `tests/format.test.ts`, one test per grammar rule (D4), each asserting behaviour
  through `parseFormat`/`resolveFormat` and, where the rule rejects, the **exact** thrown message from
  D3's table: `\$` renders a literal `$` and names no variable; `[a](b)` renders `[a](b)`; `**bold**`
  in a format *and* in a substituted value renders the characters `**bold**` (no Markdown, no group
  syntax); a `$name` the declaration does not have throws
  `"model"'s format names a variable it does not declare: "$nope"`; `$bar` under a declaration with no
  `bar` throws the same shape naming `"$bar"`; a second `$bar` throws
  `"context"'s format names a second width-taking variable: "$bar"`; a `$` not followed by a name
  character throws `"model"'s format has a bare $; escape a literal dollar as \$` — **the backslash is
  part of the emitted message**, so the source writes `\\$` inside the template literal. Note for the
  PL7 and implementation checks, per the conductor's supervisor reply to the tasks Builder
  (2026-11-06), derived from D4's escape rule and seen by Joel in session without objection — it is
  **not** in `owner-rulings.md`, is not the owner's ruling, and is not added there:
  `design.md`'s D3 table cell spells that template as `` `…escape a literal dollar as \$` ``, which
  evaluated as TypeScript loses the backslash its own sentence advises; the table cell is a notation
  slip, the pinned string carries the backslash, and `design.md` is not edited. Maximal-run is pinned
  by its own case: `$modelName` under `model` is **one** unknown name — the message names
  `"$modelName"`, never `"$model"` plus literal text (chidi §7). Boundary cases: `$` as the last
  character; `\` as the last character (a literal `\`); `$` followed by `_` or a digit (both are name
  characters, so `$_x` is one unknown name); an empty format string (zero segments, renders `""`, no
  rejection); a format of only `\$`; `\$bar` (a literal `$bar`, no width-taker). Verified by: red
  before 3.13.
- [ ] 3.3 Red — the whole-declaration unknown rule (D4 step 1), with the input that discriminates:
  under a configured **`$model`-only** format, `model` renders nothing when `provider` is unknown and
  `model` is known — resolving only the variables the format names would render `claude-opus-4`, which
  is the wrong answer and fails this test. Symmetrically `thinking` renders nothing when the level is
  unknown, and never claims `"off"` (proposal collision 3). `bar` is exempt: a null estimate still
  draws (3.8). Boundary cases: both datums unknown; `provider: ""` (a known empty string, which is not
  unknown, so the format renders with an empty hole — the store's `Unknown is a distinguished value`
  rule, not the instrument's to fix). Verified by: red before 3.12/3.13.
- [ ] 3.4 Red — the value formatters (D11), asserted **through the declarations' own resolvers** — a
  format naming one variable, resolved against fixture readings — never by exporting a formatter:
  `compactCount`'s band edges `0 → "0"`, `999 → "999"`, `1000 → "1.0k"`, `20400 → "20.4k"`,
  `86400 → "86.4k"`, `99999 → "100.0k"`, `100000 → "100k"`, `200000 → "200k"`, `999999 → "1000k"`,
  `1000000 → "1.0M"`, `9999999 → "10.0M"`, `10000000 → "10M"`; percent `43.2 → "43.2%"` and
  `null → "?"`; cost `0.123 → "$0.123"` and `0 → "$0.000"`, with **no `(sub)` annotation** (the delta
  pins the bare forms). Named honestly, as the design does: `86400 → "86.4k"` and `20400 → "20.4k"`
  are the delta's pins and deviate from chidi §1.6's reading of the host's `formatTokens` (which
  rounds to `86k`/`20k` at 10 000) — the ratified band wins (D11, design Open Questions), and
  `999999 → "1000k"` is this rule's output, not a host-mirroring claim. Boundary cases: every band
  edge above, and a negative or fractional count does not arise (the host's usage fields are
  non-negative integers, chidi §1.6) — stated, not tested. Verified by: red before 3.12.
- [ ] 3.5 Red — `context`'s three states, from the delta's scenarios: `{tokens: 86400, percent: 43.2,
  contextWindow: 200000}` renders `43.2%/200k` and hands `$tokens` `86.4k`; `{tokens: null, percent:
  null, contextWindow: 200000}` renders `?/200k` — never `0%`, never `0/200k`; `contextUsage:
  undefined` renders nothing at all. Boundary cases: `percent: 0` renders `0.0%` (a real zero, distinct
  from the null); `percent: 100`; a percent the host reports above 100 is handed out as reported (the
  format language never formats a number) while `$bar` clamps (3.8). Verified by: red before 3.12.
- [ ] 3.6 Red — `path`: `cwd: "/Users/joelleibow/Projects/pi-jefferson"` renders `pi-jefferson`;
  `cwd: undefined` renders nothing; the declaration reads `cwd` and no other datum (1.8's throwing
  fixture). Boundary cases: a trailing separator (`"/a/b/"` → `b`) and a single-character directory
  are `node:path`'s `basename` behaviour, asserted as such; `cwd: "/"` gives `basename("/") === ""`, so
  the cell renders empty — that is `node:path`'s answer, not a fallback the instrument invents, and the
  test pins it rather than "fixing" it. Verified by: red before 3.12.
- [ ] 3.7 Red — `tokens` and `cost` from the store's `totals`: the five variables
  (`$input`, `$output`, `$cacheRead`, `$cacheWrite`, `$totalTokens`) each render a compact count;
  `$totalTokens` is the four-field sum, proven with 1.2's fixture numbers (`212`, never `2775`);
  `totals: undefined` (post-dispose) renders nothing for both instruments; a fresh session's zeros
  render `0` and `$0.000`. Beside them the delta's one-render scenario, at the footer: one row holding
  a `cost` cell and a `tokens` cell over one store sample, asserting both texts come from the same
  `totals` object identity handed to both resolvers. Boundary cases: a cost of exactly `0` and a
  sub-tenth cost (`0.0004 → "$0.000"`); `cacheRead`/`cacheWrite` zero while `input`/`output` are not.
  Verified by: red before 3.12/3.14.
- [ ] 3.8 Red — `$bar` (D5, D14), at the `resolveFormat` boundary with a literal validated style:
  `$percent $bar` in a 20-column cell whose prose takes 6 columns draws a **14-column** track
  (`"43.2% "` is the 6, so `filled = floor(0.432 × 14) = 6` → six `█` then eight `░`); a format that
  fills the cell leaves the bar **nothing**, and the format's own text is what the cell clips;
  `$bar` between literal text and a variable sits where the format put it; thresholds at their edges —
  `70.0` styled as the cell, `70.1` `warning`, `90.0` `warning`, `90.1` `error`, the empty portion
  always `dim` **over** the configured style rather than instead of it (so a user's `bg` survives under
  the track); a null estimate draws the whole track unfilled in `dim` beside `?/200k`; `percent: 150`
  clamps to the track. Boundary cases: `barWidth` 0 (no track, no escapes for it); `percent: 0` (whole
  track empty); `percent: 100` (whole track filled); a bar-only format (`nonBar` 0 → the track is the
  cell width); floor, never round-half-up, at `percent` values whose product lands on `.5`.
  Discriminator for the per-segment rule: styling the whole resolved string once would let the bar's own
  resets strip the prose after it (council, accepted from argon), so the placement case asserts the
  trailing prose still carries its configured style. Verified by: red before 3.13.
- [ ] 3.9 Red — the one-line guarantee's collapse half (D7 steps 1–2): a format carrying `\n` and a
  datum carrying `\r`, `\t` and a lone `\x1b` each render **one line**, clipped to the cell width, with
  the footer's height unchanged (a three-row configuration still renders three lines). Each control
  character becomes **one space**, per character — not one space per run, which is pi-tui 1.5.0's
  `replaceControlCharacters` behaviour and is not available at the pinned 1.4.0 anyway (design fact 10,
  D12). The ordering proof: a datum carrying `\x1b[31m` inside a **styled** cell renders with the
  cell's own escapes intact and the datum's ESC now a space — collapse ran before styling.
  Discriminator: collapsing after styling shreds every escape into ` [31m` debris, so the test asserts
  the debris string is absent and the cell's own SGR is present. Boundary cases: `\u007f` (DEL) and a
  C1 character (`\u009b`) both become one space — the class is all of C0, DEL and C1; a value that is
  *only* control characters collapses to spaces and then clips; literals are collapsed at parse time
  and values at resolve time, and neither is collapsed twice. Verified by: red before 3.13.
- [ ] 3.10 Red — the `Object.hasOwn` pin (Michael's PL4 list): a format naming `$toString`,
  `$constructor`, `$hasOwnProperty` or `$valueOf` is an unknown-variable rejection naming that
  variable, never a resolution to an `Object.prototype` member; and `instrumentNamed("toString")`,
  `("constructor")`, `("__proto__")` stay `undefined`. Discriminator: an `in` check or a bare
  `variables[name]` index resolves all four, so the test fails the moment `Object.hasOwn` is dropped —
  named here as the mutation 7.5 re-runs. The same defect class has a third site, and this group
  cannot test it: D6's style-key check against the runtime `Record<keyof ThemeStyle, true>` list,
  which `validateStyle` only gains at 4.9 — so its rejecting case lives at 4.5, its own-property pin
  at 4.9 and its mutation at 7.5. Boundary cases: a declaration whose variables record was
  created with `Object.create(null)` still behaves identically (the guard is the lookup's, not the
  record's). Verified by: red before 3.12/3.13 only if the first implementation uses a bare index; the
  task exists so that it cannot, and 7.5 proves it by removal.
- [ ] 3.11 Implement — `extensions/jefferson/instrument.ts` to D2 and D11: `Instrument.render(readings,
  width, theme)`; `InstrumentDeclaration` with `name`, `variables` (each resolver returning
  `string | undefined`, `undefined` for unknown — never `""`, never `0`), the optional `bar`,
  `defaultFormat` and `options`; `FOUNDATIONAL_OPTIONS` as one frozen `["format", "style"]` tuple; the
  seven declarations with D2's variables, defaults and unknown placements (`context`'s `"?"` for a null
  estimate, `undefined` only when `contextUsage` itself is absent; `tokens`/`cost` `undefined` only
  when `totals` is unknown); `compactCount`, the percent and cost formatters; `SHIPPED` as a table of
  declarations; `instrumentNamed` returning `InstrumentDeclaration | undefined` through
  `Object.hasOwn`; `labelled()` retired. Imports stay D1's edges: pi's `type Theme`, `node:path`'s
  `basename`, the store's `type Readings`. Verified by: 3.1, 3.3–3.7, 3.10 green for the declaration
  half; `pnpm typecheck` clean.
- [ ] 3.12 Implement — `extensions/jefferson/format.ts` (new, D1) : `parseFormat(declaration, format)`
  scanning left to right to `FormatSegment[]` (`literal` with control characters already collapsed,
  `variable`, `bar`) and throwing D3's exact messages; `resolveFormat(declaration, segments, style,
  readings, width, theme)` in D4's six steps — resolve **every declared variable**, return `""` on any
  `undefined`, collapse every resolved value, measure `nonBar` with `visibleWidth` on the collapsed
  plain text **before** any styling, `barWidth = max(0, width − nonBar)`, draw the bar per D5, style
  each non-empty non-bar piece with `theme.style(text, style)` **only when the validated style carries
  at least one key**, skip empty pieces, concatenate unclipped; and the one collapse expression
  `text.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")` used at both collapse sites. Imports stay D1's
  edges: pi's `type Theme`/`type ThemeStyle`/`type Color`, pi-tui's `parseColor` and `visibleWidth`,
  `instrument.ts` types only. Clipping, padding and the pad reset stay the cell's (D7) — `format.ts`
  owns no geometry. Verified by: 3.2, 3.4, 3.8, 3.9 green; `pnpm typecheck` clean;
  `rg -n "truncateToWidth|\" \"" extensions/jefferson/format.ts` shows no clipping and no padding.
- [ ] 3.13 Implement — the consumers of the moved seam, in one task because the seam does not compile
  without them: `configuration.ts` binds one `Instrument` per configured name via D2's snippet —
  `parseFormat(declaration, declaration.defaultFormat)` and an empty validated style, memoized across
  the document so two cells holding one name hold the **same** bound object, with an unknown cell name
  resolving to the `blank` declaration before binding — and `readConfiguration`'s output is otherwise
  unchanged (no `instruments` section yet, no `theme` in its source yet);
  `row-renderer.ts`'s `createFooter` gains the third `theme` parameter and passes it to
  `cell.instrument.render(readings, cellWidth, theme)`; `extensions/jefferson.ts` moves the
  `createFooter(rows, () => store.sample(), theme)` call **inside**
  `ctx.ui.setFooter((tui, theme) => …)` — the factory is invoked synchronously inside `setFooter`, so
  install timing, `footerRows` and the `release` wiring do not move (design fact 1); and
  `tests/jefferson.test.ts`'s `setFooter` fake calls `factory(tui, theme)` with a fake from
  `tests/fake-theme.ts` (D14's harness bullet). New in this task: `tests/fake-theme.ts`, the one
  structural fake described in the intro. Also in this task, because 3.1/3.11 retire the export it
  imports: `tests/row-renderer.test.ts`'s `two cells holding the model instrument resolve identical
  text` (2.3) builds its instrument locally with D2's binding snippet over the `model` declaration —
  `resolveFormat(model, parseFormat(model, model.defaultFormat), {}, readings, width, theme)` — and
  keeps its bytes exactly. The alternative Michael offered, running that test through a bound
  instrument from `readConfiguration`, is beaten here: it would drag the configuration reader and a
  document harness into the renderer's test file, whose subject is the cell pipeline. Verified by:
  `pnpm typecheck` clean and `pnpm test` green, with 3.1's default sweep and 3.7's footer-level
  agreement now running through the real binding.
- [ ] 3.14 Pin — the contribution-key sweep extends to `format.ts` (D1's consequence): in
  `tests/jefferson.test.ts`, the exported-surface test's `register|supply|contribute` sweep covers
  `instrument.ts`, `session-data-store.ts` **and** `format.ts`, and the two-call
  `instrumentNamed("nope")` stability check stays. The configuration pin is unchanged
  (`["DEFAULT_CELLS", "MAX_CELLS", "readConfiguration"]` — the grown `ConfigurationSource` is a type)
  and the entry pin is unchanged (`["VERSION", "default"]`). Verified by: `node --test
  tests/jefferson.test.ts` green, and the three pins byte-identical to `main` apart from the renderer's
  (2.6).
- [ ] 3.15 Green — `pnpm typecheck` and `pnpm test` both pass. Verified by: the two exit statuses,
  recorded.

## 4. The `instruments` section: guards, style validation, and one bound instrument per name

D3, D6, D2's binding, and the render-time half of D4 step 5 and D7 step 5. Traces to
`An instrument's configuration lives in the extension's own document`,
`An instrument's style is pi's ThemeStyle`, `An instrument's style is validated when its document is
read`, `Configuration designates each cell's instrument`, and the rejection halves of
`An instrument's format is plain text and variables` and `$bar takes the width the rest of the format
leaves`. Every guard gets a test that fails when the guard is removed and asserts the **exact**
message string, inside the unchanged envelope
`pi-jefferson: <path> was rejected (<message>); rendering the default row`.

- [ ] 4.1 Red — in `tests/configuration.test.ts`, the section's position: `{"instruments": …}` **alone**
  normalizes to the default row with those instruments configured (envelope detection reads only
  `rows`/`cells`/`id`, so the section sits beside either shape); `{"instruments": …, "cells": […]}` and
  `{"instruments": …, "rows": […]}` both read; a trusted project document whose `instruments` differs
  from the agent document's replaces it **whole**, so only the project's formats render, and an
  untrusted project document is still ignored entirely. The existing `readDocument` helper and the four
  direct `readConfiguration` calls grow a `theme` (the fake) in this group's implement task; until then
  they are red under `pnpm typecheck`. Boundary cases: an `instruments` object that is empty (`{}`) is
  accepted and configures nothing; `instruments` beside a document that is *also* wrong in its rows is
  4.6's case, not this one. Verified by: red before 4.9.
- [ ] 4.2 Red — configured once by name: a document configuring `model`'s format as
  `🧠: $model from $provider` renders `🧠: claude-opus-4 from anthropic` in **every** cell holding
  `model`, in every declared row, and two cells in two rows hold the **same bound object**
  (`assert.equal(rows[0].cells[0].instrument, rows[1].cells[0].instrument)` — D2's memoized binding,
  which is what keeps the delta's agreement property structural). An instrument the document does not
  configure renders its declared defaults. `tokens` configured as `↑$input ↓$output` renders each
  variable exactly as the instrument formatted it, with no digit, group separator or unit added by the
  format. Boundary cases: a name configured in the section but held by no cell (accepted, no binding
  built, see 4.3); a cell holding a name the section does not mention (defaults); two cells holding
  one name in the *same* row. Verified by: red before 4.9.
- [ ] 4.3 Red — the accepted-document notice: a name in `instruments` the extension does not implement
  joins the existing `unknownInstruments` sentence — one set, one sentence, byte-exactly
  `pi-jefferson: <path> names instruments the extension does not implement: nope; those cells render
  blank` — gathered now from the section as well as from cells, so a name unknown in both places
  appears once. For a name only in the section the trailing clause is vacuous and no cell renders it,
  because no binding is built; an unknown name in a *cell* keeps its warning-plus-`blank` behaviour and
  its siblings still render theirs. Boundary cases: the `containers` notice and the unknown-instrument
  notice in one document still join with `; ` in the existing order; two unknown section names list
  both, once each. Verified by: red before 4.9 — the section is not read yet, so no warning names it.
- [ ] 4.4 Red — the format-side guards, one test each, each asserting the exact message and each
  **failing when its guard is removed** (the removal is 7.5's re-run): a non-object section →
  `the instruments value is not an object`; a non-object entry →
  `the instruments configuration for "model" is not an object`; a key the declaration's `options` does
  not have → `instrument "model" carries an option its declaration does not have: "frmát"`, with the
  declined `width` as a second case in the same test, and the check reading `declaration.options`
  rather than a restated list (D3's reasoning); a non-string `format` →
  `instrument "model" has a format that is not a string`; and the two grammar rejections surfacing
  through the document — `"model"'s format names a variable it does not declare: "$nope"` and
  `"context"'s format names a second width-taking variable: "$bar"`. Every one renders the default row.
  The bare-`$` and the `$bar`-without-`bar` guards are the two D3 rows whose tests live at **3.2**,
  not here, and 7.5 routes their removals there.
  Boundary cases: `format: ""` is a string and is accepted (it renders nothing); `format: null` is
  present-and-not-a-string and is rejected; an option key with a non-ASCII spelling (`frmát`) is named
  byte-exactly through `JSON.stringify`; a guard fires for a name in the section even when no cell
  holds it. Verified by: red before 4.9.
- [ ] 4.5 Red — the style side, at both seams. At `validateStyle`'s own boundary against the fake
  theme: a foreground-slot token is kept as the **string** (render-time resolution); `"#bf5700"` is
  kept as a parsed `Color`; an indexed number is kept as a `Color`; a background-slot token used as
  `fg` — and a foreground-slot token used as `bg` — is rejected naming the token, which is the case
  that discriminates a slot-aware probe from a single `theme.colors` key check (design fact 8, D6's
  alternatives beaten); a string `parseColor` rejects is rejected; an `fg` of any other type (object,
  boolean, `null`) is rejected, because JSON cannot carry a `Color` and `parseColor` takes only
  `string | number` (design fact 9). Through the document, the five exact messages:
  `instrument "model" has a style that is not an object`;
  `instrument "model" has a style key that pi's ThemeStyle does not have: "colour"`;
  `instrument "model" has a style attribute that is not a boolean: "bold"`;
  `instrument "model" has an fg that is neither a foreground-slot theme token nor a color pi's parser
  accepts: "nope"`; and the `bg` twin reading `background-slot`. Beside them, the style-key case
  Michael's PL7 major finding requires — 3.10's defect class at its third site: a style carrying
  `constructor`, `toString` or `__proto__` as a key is **rejected**, asserting
  `instrument "model" has a style key that pi's ThemeStyle does not have: "constructor"` byte for
  byte and the same shape naming `"toString"` and `"__proto__"`. An `in` or bare-index check against
  the `Record<keyof ThemeStyle, true>` list finds all three on `Object.prototype`, skips every value
  check and accepts the style, which silently breaks the spec's `A style pi's ThemeStyle does not
  allow` scenario; `JSON.parse` makes `__proto__` an **own** key of the parsed document object (it
  defines rather than assigns), so the document-level case reaches the key check with the key
  present and must name it. Boundary cases: all six attributes
  accepted as booleans and each rejected as `"true"`; `style: {}` accepted and rendering byte-identical
  to no style at all; `oklch(…)`/`okhsl(…)` accepted (design fact 9); **a number `parseColor`
  rejects** — `fg: 256` and `bg: 1.5` — takes D3's exact fg/bg message and *not* pi-tui's own
  `ANSI color index must be an integer from 0 to 255`, which is what an unpinned out-of-range number
  surfaces instead (Michael verified at PL7 that `parseColor` throws for `256`, `-1` and `1.5` at
  pi-tui 1.4.0; design fact 9); `fg` as `""` — the terminal
  default in the host's own vocabulary — is a string naming no token, so it goes to `parseColor` and is
  rejected, which is the honest reading of D6 and is pinned here rather than left to a reader.
  Verified by: red before 4.9.
- [ ] 4.6 Red — the read order is the error precedence: **envelope → `instruments` section →
  rows/cells**. One document wrong in both sections —
  `{"instruments": {"model": {"format": 42}}, "cells": [{"instrument": "model", "align": "middle"}]}` —
  is rejected naming the `instruments` offender, not the align. Boundary cases: a document whose
  envelope alone is wrong (`rows` and `cells` together) still rejects with the existing envelope
  message; a section guard and a cell guard both firing in a `rows` document names the section.
  Verified by: red before 4.9 — today the section is unread, so the align message wins.
- [ ] 4.7 Red — styled cells in the footer, now that a document can declare a style: a configured
  `{"fg": "accent"}` puts the theme's escapes around the **prose segments only**, so a format holding
  `$bar` between two literals keeps both literals styled and the bar's own resets inside the track;
  the empty-style path stays **byte-identical** to today's unstyled output (the default-document
  guarantee, D4 step 5); and the RESET-before-pad path is now reached by default, because
  `theme.style()` closes selectively (`\x1b[39m`, `\x1b[22m`) and never with `\x1b[0m` (chidi §3.1,
  pi-tui's `styleTextWithAnsi`), so `leavesStyleOpen` is true for every styled cell with a trailing
  pad. Byte shapes, extending the existing ANSI-pad tests rather than replacing them: a styled
  left-aligned cell narrower than its cell emits `\x1b[0m` before its pad and the pad carries none of
  the style; a styled cell clipped by `truncateToWidth` carries the clip's own resets around the
  ellipsis and then the pad; a right-aligned styled cell's **leading** pad carries no style and needs
  no reset of ours (the host's `SEGMENT_RESET` between children stays the host's, design fact 11);
  `Style and the pad`'s scenario asserted as an SGR count per cell, in the existing test's idiom, not
  as a substring match. Boundary cases: a styled cell whose text exactly fills its cell (pad 0, no
  reset of ours); a styled `dim` bar track under a configured `bg` (the `bg` survives, D5); a
  `strikethrough`-only style (no colour escapes at all, so the pad reset still fires). Verified by:
  red before 4.9 — no document can declare a style yet.
- [ ] 4.8 Red — the theme switch, end to end through the footer: render with fake theme A, call
  `footer.invalidate()` (as the host cascades on a theme change, design fact 1, chidi §3.2), render
  with theme B, and assert the cell's bytes carry B's escapes and **nothing cached from A survives**;
  and, end to end through the harness, one document configuring a format, a style and a `$bar` renders
  the configured text, while a document with a rejected style warns with the envelope and renders the
  default row. Boundary cases: `invalidate()` with no theme change still re-resolves (the memo is
  dropped, not compared); a second `invalidate()` is harmless; a styled cell at a width change
  re-styles rather than reusing the old width's text. Verified by: red before 4.9.
- [ ] 4.9 Implement — `extensions/jefferson/format.ts` gains `validateStyle(raw, theme)` exactly as D6
  states it: the eight `ThemeStyle` keys checked through an **own-property** lookup —
  `Object.hasOwn` against the runtime `Record<keyof ThemeStyle, true>` key record (4.10(b)), never
  `in` and never a bare index, both of which find `constructor`, `toString` and `__proto__` on
  `Object.prototype` and accept them (4.5's rejecting case) — the six attributes `typeof boolean`,
  `fg` probed through `theme.getFgAnsi(value)` in a `try`/`catch` with a throw falling through to
  `parseColor(value)` and a parse throw becoming the D3 rejection, `bg` symmetric through
  `getBgAnsi`, a number through `parseColor`, any other type rejected; a successful probe keeps the
  **string**, a successful parse keeps the **`Color` object**. `extensions/jefferson/configuration.ts`
  gains the `instruments` section in D3's read order, its guards with D3's exact messages,
  `ConfigurationSource.theme`, and the binding of a configured `format` and validated `style` into
  the memoized per-name `Instrument`.
  `extensions/jefferson.ts` passes `ctx.ui.theme` — the live theme at `session_start` (addendum 2 Q3) —
  and `tests/jefferson.test.ts`'s fake `ctx.ui` grows `theme`. Open point, named rather than decided:
  D3 says every guard *is* a `RejectedConfiguration` while D1's import edges forbid `format.ts` to
  import `configuration.ts`, so the reading implemented here is that `parseFormat`/`validateStyle` throw
  an `Error` carrying D3's message and `readConfiguration` turns it into the whole-document rejection —
  the envelope, the default row and the message are what every test asserts, so the two readings are
  indistinguishable from outside; if Michael wants `RejectedConfiguration` itself thrown from
  `format.ts`, that inverts a D1 edge and is his call at PL7. Verified by: 4.1–4.8 green,
  `pnpm typecheck` clean.
- [ ] 4.10 Pin — the two source-shape guarantees Michael's PL4 list names, asserted by inspection and
  by the compiler rather than by a new test double: (a) the `getFgAnsi`/`getBgAnsi` probe cast is
  **one expression wide with no suppression comment** —
  `rg -n "getFgAnsi|getBgAnsi" extensions/jefferson/format.ts` shows one call site each with the cast
  inline, `rg -n "@ts-(ignore|expect-error|nocheck)" extensions/ tests/` is empty, and the value never
  reaches `theme.style` unless the probe or `parseColor` accepted it; (b) Jefferson's runtime list of
  the eight `ThemeStyle` keys is tied to the type at compile time — it satisfies
  `Record<keyof ThemeStyle, true>` (D6) — shown by `pnpm typecheck` passing and by the mutation in 7.5
  (deleting `underline` from the list turns `pnpm typecheck` red). Also pin the delta's
  `The theme the check reads` scenario: the shipped source copies no token list — the only theme tokens
  named anywhere under `extensions/` are `warning` and `error`, D5's two bar thresholds, used at render
  time and not as a membership list. Verified by: the three `rg` outputs recorded, `pnpm typecheck`
  exit 0.
- [ ] 4.11 Green — `pnpm typecheck` and `pnpm test` both pass. Verified by: the two exit statuses,
  recorded.

## 5. The entry: exactly three subscriptions

D10, and the entry side of D9. Traces to `Freshness never exceeds the host's delivery` (the turn
boundary), `A pushed change that alters displayed data results in a repaint`, and `Store data does not
survive a session replacement`.

- [ ] 5.1 Red — in `tests/jefferson.test.ts`, rename `in TUI mode a session takes exactly the two
  selection subscriptions` to `in TUI mode a session takes exactly the three subscriptions it names`
  and assert `["model_select", "thinking_level_select", "turn_end"]` in that order; and grow the two
  release tests' expected logs with `unsubscribe:turn_end` between `setFooter#1` and `setFooter#2`,
  with each of the first install's three unsubscribe counts at exactly 1 across both callers.
  Boundary cases: outside TUI mode a session still takes **no** subscription; a `turn_end` dispatched
  after disposal requests no repaint and touches no reader. Verified by: red before 5.4 — the pin
  lists two and the logs lack the third unsubscribe.
- [ ] 5.2 Red — a dispatched `turn_end` whose totals changed (the harness's fixture entries gain a
  usage-bearing entry, moving the leaf) requests exactly one repaint and the next rendered line shows
  the new totals; a `turn_end` with unchanged totals requests none. Discriminator: repainting on every
  boundary without comparing passes the first half and fails the second, which is the guarantee the
  delta names (D9's comparison *is* the rescan). Boundary cases: a `turn_end` arriving before any
  render (no repaint, cache filled); two `turn_end`s in a row with one change between them (one
  repaint). Verified by: red before 5.4.
- [ ] 5.3 Red — replacement end to end: a second `session_start` with a different `cwd`, model and
  fixture entries re-seeds and re-scans, so the second install's footer shows the second session's
  basename, model and totals and none of the first's; the first install's disposed footer still renders
  `" ".repeat(80)` (all-unknown readings, ten cells at 80); and the first session's readers are never
  called again after its release. Boundary cases: a `resume`/`fork` reason re-seeds exactly as `startup`
  does (the existing five-reason loop carries over); a session whose `getContextUsage()` returns
  `undefined` installs and renders `context` as nothing. Verified by: red before 5.4 for the totals and
  basename halves — no `path`/`tokens` cell can be configured end to end until 4.9, and no `turn_end`
  reaches the store until 5.4.
- [ ] 5.4 Implement — `extensions/jefferson.ts` takes the third subscription,
  `pi.on("turn_end", () => store.turnEnded())`, the payload unwrapped to nothing at the entry so the
  store still names no host event, released in the single `release` beside the other two. **No other
  subscription is taken**: D10's deliberately-not-subscribed list stays unsubscribed — no
  `session_compact`, no `session_tree`, no `message_end`, no `agent_end` — because the keyed scan makes
  the appends no event announces correct on the next render any repaint produces (design fact 7).
  Verified by: 5.1–5.3 green, and `rg -n "pi.on\(" extensions/jefferson.ts` shows exactly four
  registrations — `session_start` plus the three.
- [ ] 5.5 Green — `pnpm typecheck` and `pnpm test` both pass. Verified by: the two exit statuses,
  recorded.

## 6. The docs this change rewrites, and the ADR it owes

D13, plus the two passages D13 does not name and this change makes false (Michael's implementation
gate: documentation the change made false is corrected). No code moves in this group.

- [ ] 6.1 — `ARCHITECTURE.md`, to D13's shapes: the parts diagram gains `format.ts` (the
  format-and-style language) and rewords the `instrument.ts` line (declarations) and the store line
  (the datums it now holds); the **Row renderer** paragraph loses "the division is ours because the
  allocator distributes by weight rather than dividing" and states the new split — the basis is ours
  (`floor(W / N)` seated per entry), the remainder is the allocator's (`grow: 1`), the tree is built
  once and re-seated on a width change through `clear()` + `addChild`, and cells read the render's
  sample from the footer's slot; the **Fidelity** section's retired property is replaced by the new one
  (the row spans the full width and a right-aligned last cell ends at the window's edge) and cites ADR
  0002 for what it replaced; the **Store** paragraph gains the per-sample context read and the keyed
  scan; "Two things that will bite" stays **as written** — both traps survive unchanged (D7 keeps the
  reset and the columns rule). Beyond D13's list, because the change makes them false: the
  **Instrument** paragraph's "Given readings and the width it has" and "Text today; a bar … tomorrow"
  (the seam is `(readings, width, theme)`, the bar is built, and content is a format with `$variables`),
  and the **Configuration** paragraph gains one clause for the `instruments` section and parse-time
  style validation. Verified by: `rg -n "distributes by weight|stay blank at the right edge|Text
  today" ARCHITECTURE.md` is empty, the diagram lists five working parts, and `git diff
  ARCHITECTURE.md` touches no other section.
- [ ] 6.2 — `AGENTS.md`'s "Adding an instrument", to D13's shape: add **one declaration** to
  `extensions/jefferson/instrument.ts` (name, variables, defaults, options) and register it in the
  declarations table so `instrumentNamed` resolves it; add the datum it displays to the store if the
  store does not hold it; add a test that the cell renders it and one that alignment still applies.
  Item 2's `An instrument is (readings, width) => string` sentence goes with it — the seam is
  `(readings, width, theme) => string` and an instrument is a declaration, not a closure. The two traps
  and the harness note stay; "Where decisions live" stays. Verified by: `rg -n "\(readings, width\)"
  AGENTS.md` is empty, `rg -n "declaration" AGENTS.md` shows the new step 1, and `git diff AGENTS.md`
  touches only that list.
- [ ] 6.3 — `README.md`'s status paragraph, to D13's shape: it stops saying formatting is not built yet
  (`format`, `style` and `$bar` are built) and names the six instruments instead of two, keeping the
  default single row of placeholder cells true. The later "Why another statusline" paragraph's mention
  of gaps and truncation priority stays — as in the archived `cells-as-objects` tasks, that paragraph
  is an aspiration for the product, not a claim that a feature is missing, and gaps are declined scope
  here. Verified by: `rg -n "not built yet" README.md` is empty, the six names appear, and
  `git diff README.md` touches only the status paragraph.
- [ ] 6.4 — `docs/adr/0002-<slug>.md`, the ADR D13 owes under `AGENTS.md`'s standing rule: it records
  the retired Fidelity property (the `W mod N` blank right edge was a **stated property**, not a
  defect), why it dies (the owner's 2026-11-05 layout ruling in `owner-rulings.md`, and the allocator
  evidence — `basis` alone under-fills, `grow: 1` alone skews to 13,11,10,9,8,7,6,6,5,5 — chidi §4.2),
  and what replaces it (the row spans the width; the remainder goes to the earliest cells). Dated, with
  a Status line, in ADR 0001's shape. Verified by: the file exists under `docs/adr/`, and
  `ARCHITECTURE.md`'s Fidelity section cites it (6.1).
- [ ] 6.5 Green — docs only: `pnpm typecheck` and `pnpm test` still pass, and `openspec/specs/` shows
  no diff — `extension-source-layout` is inspected and **not** amended (D13, proposal Capabilities).
  Verified by: the two exit statuses and `git status --porcelain openspec/specs/` empty.

## 7. Verification, and the owner's live look

- [ ] 7.1 — `pnpm typecheck` exits 0 with no output. Verified by: the exit status and the empty output,
  recorded raw.
- [ ] 7.2 — `pnpm test` exits 0 for every file, including the new `tests/format.test.ts` and the five
  existing files. Verified by: the exit status and the summary lines (`tests`, `pass`, `fail`),
  recorded raw.
- [ ] 7.3 — `openspec validate configurable-instruments --strict` exits 0 and prints
  `Change 'configurable-instruments' is valid`. Verified by: the raw output.
- [ ] 7.4 — the diff is inside D1's file map and nothing else: `git diff --stat` lists only
  `extensions/jefferson.ts`, the five files under `extensions/jefferson/` (`instrument.ts`,
  `format.ts` (new), `configuration.ts`, `session-data-store.ts`, `row-renderer.ts`), `tests/`,
  `ARCHITECTURE.md`, `AGENTS.md`, `README.md`, `docs/adr/0002-…` and this change directory. **No diff**
  in `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `.github/` or
  `openspec/specs/` — the host version floor stays (D12), a new ordinary source file under the declared
  load root needs no manifest or CI edit (eleanor §7, D1), and merge to `main` is the release. A diff
  in any of them is a design error to report, not a task to tick. Verified by: the `git diff --stat`
  output recorded raw.
- [ ] 7.5 — re-run every mutation check this list claims, one edit at a time, recording each edit and
  the test that catches it: remove each D3 guard in turn → its own test fails naming the exact
  message, routed by guard rather than by count — 4.4 catches the section, entry, option-key,
  format-type, unknown-variable and second-width-taker guards; 4.5 catches the style shape, style
  key, style attribute and `fg`/`bg` value guards; **3.2** catches the bare-`$` and the
  `$bar`-without-`bar` guards, whose tests live there; drop `Object.hasOwn` from the variable lookup
  → 3.10 fails with `$constructor` resolved; drop it from `instrumentNamed` → 3.1 fails; drop it from
  the style-key check → 4.5's `constructor`/`toString`/`__proto__` case fails, the document
  accepted; set `grow: 0` → 2.1 (a) and (c) fail; remove the
  `basis` and leave `grow: 1` → 2.1 (b) and (c) fail on the skewed shares; drop `sample` from the memo
  key → 2.3's across-render half fails; restore the per-render tree → 2.2's identity half fails; delete
  the RESET-before-pad → 4.7's styled byte shapes fail; move the collapse after styling → 3.9's ordering
  proof fails; collapse runs instead of per character → 3.9's boundary case fails; read
  `usage.totalTokens` in the scan → 1.2 fails with `2775`; drop one of the four scan categories → 1.2
  fails; key the scan on `turn_end` instead of the leaf → 1.3 fails; delete `underline` from the
  runtime `ThemeStyle` key list → `pnpm typecheck` fails (4.10); repaint on every `turn_end` without
  comparing → 5.2's second half fails. Verified by: the fifteen-plus edits and their failures recorded,
  each reverted afterwards, with `pnpm test` green again at the end.
- [ ] 7.6 **(Joel — the owner's own eyes; nobody else can tick this)** — the live-footer observation,
  in his own pi session, with the columns and the documents recorded, and the understanding that **one
  run is a sample, never proof** (owner-rulings 2026-11-05; the suite carries the proof). What he
  watches: the row spanning his window's full width with nothing blank at the right edge; a configured
  `format` (`🧠: $model from $provider`) and a configured `style` rendering as declared; a `$bar`
  taking the width the rest of the format leaves and recoloring to `warning` then `error` as context
  pressure crosses 70 and 90; a theme switch recoloring the footer with no re-installation; the six
  instruments' numbers against pi's own footer, with the one known deviation expected — Jefferson shows
  `20.4k` where the host shows `20k` at 20 400 tokens, by D11's ratified band and not by accident
  (design Open Questions); a rejected document's warning text naming the offender; and the default
  document rendering the placeholder row unchanged in text. Verified by: his recorded observation, with
  the terminal width and each document, appended to this task.

---

## Trace

Both directions, so an orphan is visible at a glance. Left column: the delta requirement or design
decision. Right: the tasks that build and prove it.

**`specs/statusline/spec.md`** — Cells are evenly distributed across the width: 2.1, 2.6, 7.5 ·
A row is one line tall: 2.4, 2.5, 3.9, 2.6 · Cell content comes from an instrument: 3.1, 3.11, 3.13,
3.14 · Configuration designates each cell's instrument: 4.2, 4.3, 4.9 · An instrument resolves a
cell's text by reading the store: 1.7, 3.3, 3.6, 3.11, 1.8 (the throwing-readings fixture); its
`A datum the host does not expose` scenario is satisfied by absence and pinned by 3.1 (`git` and
`branch` stay unresolved) and 5.4 (no fourth subscription) · The model instrument: 3.1, 3.3, 4.2 ·
The thinking instrument: 3.1, 3.3 · Instrument text is bound by the row's geometry: 2.1, 2.4, 4.7 ·
The footer's tree is built once and reads the current render's sample: 2.2, 2.3, 2.5, 2.6, 3.13 ·
The path instrument: 1.1, 1.9, 3.6 · The context instrument: 1.4, 3.5, 3.8 · The tokens instrument:
1.2, 3.4, 3.7 · The cost instrument: 1.2, 3.4, 3.7 · An instrument is declared once, and every reader
reads that declaration: 3.1, 3.10, 3.11, 4.4 (the option-key check reads `declaration.options`), and
its `Adding an instrument` scenario by 3.1's sweep over all seven plus 4.2's binding path, with the
"no second table" half pinned by inspection — `rg -n '"(blank|model|thinking|path|context|tokens|cost)"'
extensions/jefferson/configuration.ts extensions/jefferson/format.ts extensions/jefferson/row-renderer.ts`
finds no instrument-name literal, and no `$variable` name is restated outside `instrument.ts` except
`bar` in `format.ts`, which is the language's width-taking keyword (D4) and the second-`$bar` message's
subject (D3), not a copy of a declaration · An instrument's configuration lives in the extension's own
document: 4.1, 4.2, 4.3, 4.4, 4.9 · An instrument's format is plain text and variables: 3.2, 3.8, 4.4 ·
An instrument's style is pi's ThemeStyle: 4.5, 4.7, 4.8, 4.9 · An instrument's style is validated when
its document is read: 4.5, 4.9, 4.10 · $bar takes the width the rest of the format leaves: 3.8, 3.12,
4.4 (the second width-taker), 4.7; its `No new dependency` scenario by 7.4.

**`specs/session-data-store/spec.md`** — The store holds the data its instruments display: 1.1, 1.7 ·
Freshness never exceeds the host's delivery: 1.3, 1.4, 1.5, 1.9, 5.4 · Expensive derivations are
bounded and invalidated by name: 1.3, 1.5, 1.7, 7.5 · A pushed change that alters displayed data
results in a repaint: 1.5, 5.2, 5.4 · Store data does not survive a session replacement: 1.6, 1.9,
5.3. The living requirements this change leans on without amending are pinned too: `A read is
synchronous and total` by 1.6, `Unknown is a distinguished value` by 1.1 and 3.3, `Every read in one
render observes one state` by 2.3 and 3.7, `Every subscription is released when the footer is disposed`
by 5.1 and 5.4.

**`design.md`** — D1: 3.11, 3.12, 3.14, 7.4 · D2: 3.1, 3.11, 4.2, 4.9 · D3: 4.1, 4.3, 4.4, 4.5, 4.6,
4.9, 7.5, and 3.2 for the two grammar guards whose tests live there (bare `$`, `$bar` without
`bar`) · D4: 3.2, 3.3, 3.9, 3.12, 4.7 · D5: 3.8, 3.12, 7.5 · D6: 4.5, 4.8, 4.9, 4.10 · D7: 2.4,
2.6 (steps 3–5), 3.9, 3.12 (steps 1–2), 4.7 · D8: 2.2, 2.3, 2.5, 2.6, 3.13 · D9: 1.1–1.9 · D10: 5.1,
5.4 · D11: 3.4 · D12: 7.4 · D13: 6.1–6.5 · D14: 1.2, 1.9, 2.1–2.4, 3.1, 3.8, 3.9, 3.14, 4.5, 4.7,
4.10, 7.5. The design's Risks are covered by the tests their mitigation names: the O(entries) scan by
1.3, styled text meeting `truncateToWidth` by 4.7, the geometry change on upgrade by 2.1 and 6.4,
`compactCount`'s deviation by 3.4, the double render sizing `$bar` twice by 2.3 and 3.8, and the probe
cast by 4.10. The two Open Questions are answered where the design left them: the fake `Theme` in the
intro above, and the number-formatting question is Joel's, recorded at 7.6 and built to the ratified
band at 3.4.
