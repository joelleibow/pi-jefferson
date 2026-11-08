# Proposal

Citations: **[R]** `owner-rulings.md`; **[E §n]** `research-eleanor.md`; **[C §n]** `research-chidi.md`;
**[M n]** `michael-orientation.md` item n (a consult, not a ruling; each item points at a decision it cites).
"Spec l.n" is a line of `openspec/specs/statusline/spec.md`.

## Why

Joel looked at his footer, where the model cell and the thinking cell each sit right-aligned inside their
own equal share of the row and leave a gap between them, and asked for *"a way to allow for cells to fill
no more than the width they need to display their content and neighboring cells then appear butted against
them… the 🧠 cell and the 🤔 cell to appear as if they're a single cell"* [R, 2026-11-07]. It is the same
complaint he made on 2026-11-06: two right-aligned neighbors adjacent at the row's right edge, with the
working directory at the far left [R]. He asked for the ideal solution and the range of flexibility [R].
The council weighed the options and their costs (`council.md`), and Joel chose [R, 2026-11-07 "The
council's three calls"].

## What Changes

The objective: **a row's cells need not take equal shares, and two neighboring instruments can read as one
at the row's right edge.** Joel's rulings, from the council's three questions [R, 2026-11-07]:

- **The mechanism is content-width cells.** A cell takes the width its content needs and its neighbors sit
  against it. A cell holding several instruments is not taken [R].
- **The default.** Every cell except `blank` and `$bar` cells takes the width its content needs; `blank` and
  `$bar` cells fill. A configuration option **on the row** restores today's equal distribution. The break to
  existing rows is accepted, since it is cheap before 1.0 [R]. This change is **BREAKING**. Whether a per-cell
  override is also needed is for the design to show a requirement for; this proposal does not decide it [R].
- **The joint.** Where two content-sized cells meet with no spare room between them, the system supplies
  one column between them. On a row too narrow for it, that column gives way before any content does [R].
- **Scope.** Content-width cells only. Composing custom instruments from variables and visualizations is its
  own card [R].

The council's rules that carry the rulings into observable behavior (`council.md`, "Accepted & Rejected
Feedback"; the delta spec states them as requirements):

- Spare columns go to a fill cell, else to the last left-aligned cell, else to the first. The exact rule is
  the design's to confirm with Michael.
- On overflow every cell may give up columns, and no promise says which loses the first column or by what
  ratio: the allocator's rounding is order-dependent and host-supplied, and a shrink priority would be
  Jefferson arithmetic, which revises Joel's 2026-11-05 ruling.
- `align` in a cell with no spare columns changes nothing. A row re-lays out when a cell's width changes,
  not only when the window does.

The constraints the design meets, each with its source:

- **Rows span the full width** (ADR 0002). Every column is allocated; pi-tui allocates; Jefferson does not
  pad the composed row; there is no gap [E §6, M 1b]. Underneath it is Joel's *"let pi-tui do its thing and
  we are spared anything that risks us having bugs"* [R; M 1b]. Moving layout arithmetic into Jefferson
  revises that ruling and needs Joel [M 1b].
- **A row is one line** whatever a cell holds, and the guarantee belongs to the cell (spec l.124) [E §6, R].
  Clipping stays at the end with the ellipsis (cells-as-objects ruling) [E §6, M 1e].
- **`$bar` takes the columns the rest of its format leaves**, at most one per format (spec l.759); its
  arithmetic never depends on its own output (ADR 0006) [E §4, M 1h].
- **Columns, not characters.** Measure with `visibleWidth`, clip with `truncateToWidth`, compute any pad
  from the clipped result [E §1 (`AGENTS.md`)]. Joel's labels are emoji, and ADR 0006 records a terminal
  that draws an emoji wide and counts it narrow [M 2h].
- **A pad needs a reset** before it when the cell's own text leaves a style open [E §1, §3 `:40`]. It still
  binds the cell that absorbs slack [M 2g].
- **The cell count is 1–10, and more than ten truncates** (spec l.163). Joel accepted ten because, with the
  remainder spread by `grow`, no ceiling has a geometric advantage [E §6, M 1f]. That reason does not
  carry over to content-sized cells [M 1f], and no evidence in this change names another. The delta keeps
  ten and says where it comes from only as Joel's earlier acceptance; the design says whether ten has a new
  reason [M 1f].
- **`width` and a `spacer` were declined** (cells-as-objects), and the spec rejects `width` as an unknown
  key by name (spec l.221, l.613) [E §6, M 1c]. A key named `width`, or a filler instrument, revises that
  ruling explicitly. Another name does not, and the council advises against reusing `width`
  (`council.md`) [M 1c]. The row option's name is the design's.
- **Row-level justify, gaps, proportional widths and a fourth alignment were set aside, not ruled
  against** (configurable-instruments) [E §6, M 1d]. The row option is a new decision, not a revision.
- **Host version.** The repository pins and tests pi-tui 1.4.0 (`pnpm-lock.yaml`); the `pi` on this machine
  reports 1.5.0, and the 2026-11-05 ruling describes the 1.5.0 allocator [M 2j]. Host packages are peer
  `*`, so the user's allocator is the one that runs [E §1, M 2j]. Any allocator claim is a constraint on the design: it is checked against
  the version Joel runs, or that version is pinned for the test [M 2j].
- **Joel's `~/.pi/agent/pi-jefferson.json` is never edited** by a task; a check that needs his two rows
  uses a scratch agent directory [R, M 2k].
- **Breaks are cheap before 1.0** [R]. The default change above is the break.

### Requirements this change revises

Five living requirements, revised by name under MODIFIED in the delta spec [`council.md`, "Accepted"]:

- **"Cells are evenly distributed across the width"** (spec l.63). Today each of N cells gets `basis:
  floor(W / N)` and `grow`, the remainder goes to the earliest cells; scenarios 8 at 80 → 10 each, 3 at 100
  → 34/33/33, ten at 132 → 14/14/13×8 [E §6]. Now the default is content width, and equal shares are the
  row option.
- **"Instrument text is bound by the row's geometry"** (spec l.341). Today *"Instrument text MUST NOT change
  the geometry"* and *"Alignment hugs its cell's edge, not the row's"* [E §6, M 1a]. Now the text sets the
  geometry, overflow keeps one line, and `align` changes nothing in a cell with no spare columns.
- **"A row's cells are its count and its placement"** (spec l.163). Its numbers stay (one to ten, more
  than ten truncates, an unknown key rejected by name) [E §5]. It is modified only so its default-row
  scenario states the row's width and line.
- **"The footer's tree is built once and reads the current render's sample"** (spec l.433). Today entry
  options are re-seated only on a width change [E §3, M 2i]; now also when a cell's width changes.

- **"A cell's alignment is the padding side inside it"** (spec l.368). Its wide-glyph scenario still says
  `floor(W / N)`, and its `center` and `right` become no-ops in a cell with no pad [M 2g]. The delta modifies
  it for that scenario.

### What the design must still handle

Costs and traps the council's option A carries, each with its source. The rulings answer some; the rest
are the design's:

1. *A cell reports the full row.* `HStack.render` measures each child at the full row width and the cell
   pads to whatever width it is given, so its measured width is always W [M 2a (measured), C §1.2,
   E §3 `:36`]. No code today measures an instrument at an unbounded width [E §4]. The council advises an
   unpadded, unclipped probe, with a width of 0 making `$bar` contribute nothing; unverified until Derek's
   run measures it [`council.md`].
2. *The memo misses every render* (measured: `[80, 80, 40, 40]` for one sample on two renders): one slot
   keyed by `(sample, width)`, so every instrument renders twice per frame today [M 2b, E §3]. This change
   rewrites that path, so the gap is its own.
3. *`$bar` has no content width.* Settled: it fills, as a fill cell [R]. Its arithmetic never depends on
   its own output (ADR 0006) [E §4].
4. *Pi-tui gives surplus only to `grow > 0`, and two `grow: 1` children given the whole surplus get
   `[20, 10]` in 30, not `[15, 15]`* [C §1.3]. The spare-column rule is observable; how it is reached is the
   design's.
5. *Shrink.* Cells are `shrink: 0` today [E §3]; the one-line guarantee survives only if every cell still
   clips to its allocated width [M 2e].
6. *The joint is clipped with its cell and counted in the measured width.* A format's outer whitespace is
   trimmed (ADR 0006), so a user cannot add the space [M 2f, E §6].
7. *Reflow.* Geometry depends on content, so `High` to `Max` or a model switch moves every neighbor
   [M 2i].
8. *Per-cell override.* Show a requirement for it, or leave it out [R].

The options weighed and not taken, for the record [`council.md`]: B, a cell holding several instruments
(Michael's alternative, [M 4]); C, a row-level justify or a fill/spacer concept (the declined `spacer`
[M 1c]). Where the row option is configured and what it is called are design questions; Eleanor maps what
each configuration surface rejects today [E §5, §10].

### Open questions for the design

All are closed in `design.md`; none remains open. Where each is settled:

- The slack rule and the equal share among fill cells: decision 4.
- Which width measures a content cell: decision 2.
- The per-cell override, and the row option's name and spelling: decision 5.
- Ten as the ceiling: kept on Joel's earlier acceptance only, no new reason (decision 10).
- The joint beside a fill cell: none (decisions 3 and 6). An unknown row key: unchanged, silent (decision 5).
  Where `fills` is read: the parse at bind time (decision 3).
- The requirement at spec l.368: modified for its wide-glyph scenario, now the fifth requirement above.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `statusline`: the delta modifies the five requirements named above, and adds the ones that hold whatever
  the mechanism: two neighbors reading as one at the right edge, the full width, `$bar` and column
  measurement. The overflow, no-cells and equal-distribution sentences that the first version of this
  delta carried as added requirements now live in the modified ones.

## Impact

Not in this change: composing custom instruments from variables and visualizations [R]; the other three cards (default labels on every shipped instrument, an instrument for
every datum pi provides, thresholds on the context instrument) [R]; clickable cells (parked [E §6]); any
edit to Joel's configuration file [R].

Where the existing behavior lives, for the design to read, not a prescription [E §3, §5, §7, §8]: the row
renderer and cell geometry under `visuals/`; the cell and row types and the cell-key rejection in
`configuration.ts`, only if a key is added; the tests that pin even shares (34/33/33, 14/14/13×8, a
right-aligned last cell at 13 columns); the README's "evenly divided cells"; `ARCHITECTURE.md`'s row
renderer and Fidelity sections. ADR 0002 is accepted, so its body is not edited; whether a new ADR
supersedes it is for the docs pass.
