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
working directory at the far left [R]. He wants the ideal solution and the range of flexibility, so this
proposal sets options out with their costs and does not pick one [R].

## What Changes

The objective only: **a row's cells need not take equal shares, and two neighboring instruments can read
as one at the row's right edge.** Which mechanism achieves it is not decided here. The constraints any
solution meets, each with its source:

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
  carry over to content-sized cells; a design that keeps ten says where ten now comes from [M 1f].
- **`width` and a `spacer` were declined** (cells-as-objects), and the spec rejects `width` as an unknown
  key by name (spec l.221, l.613) [E §6, M 1c]. A key named `width`, or a filler instrument, revises that
  ruling explicitly. Another name does not [M 1c].
- **Row-level justify, gaps, proportional widths and a fourth alignment were set aside, not ruled
  against** (configurable-instruments) [E §6, M 1d]. Options touching them are in bounds. They are new
  decisions, not revisions.
- **Host version.** The repository pins and tests pi-tui 1.4.0 (`pnpm-lock.yaml`); the `pi` on this machine
  reports 1.5.0, and the 2026-11-05 ruling describes the 1.5.0 allocator [M 2j]. Host packages are peer
  `*`, so the user's allocator is the one that runs [E §1, M 2j]. Any allocator claim is checked against
  the version Joel runs, or that version is pinned for the test [M 2j].
- **Joel's `~/.pi/agent/pi-jefferson.json` is never edited** by a task; a check that needs his two rows
  uses a scratch agent directory [R, M 2k].
- **Breaks are cheap before 1.0** [R]. Whether this change carries **BREAKING** depends on the default
  versus opt-in call below and is open.

### Requirements the change would revise

Named now, revised **by name** once the choice is made; the delta spec does not touch them yet.

- **"Cells are evenly distributed across the width"** (spec l.63). Today: each of N cells gets `basis:
  floor(W / N)` and `grow`, the remainder goes one column at a time to the earliest cells, widths are
  recomputed from the width at render time; scenarios 8 at 80 → 10 each, 3 at 100 → 34/33/33, ten at 132
  → 14/14/13×8 [E §6]. Equal shares are the thing Joel's objective departs from under option A.
- **"Instrument text is bound by the row's geometry"** (spec l.341). Today: *"Instrument text MUST NOT
  change the geometry"*; each cell occupies what pi-tui allocates it; *"Alignment hugs its cell's edge, not
  the row's"* [E §6, M 1a]. Content-sized cells reverse it; under option B it stays.
- Possibly, depending on the option: "A row's cells are its count and its placement" (spec l.163; the
  unknown-key rule and the count), "Cell content comes from an instrument" (spec l.100; each cell holds
  *an* instrument, `Cell` is `{ instrument, align }`) [E §5, §6], and "A cell's alignment is the padding
  side inside it" (spec l.368), whose `center` and `right` become no-ops in a cell with no pad [M 2g].

### Options the design must weigh

Questions, each with its sources and costs, unranked. The council brings Joel the options and their
costs [R].

**A. Can a cell take only the width its content needs, through pi-tui's `basis: "auto"` or an equivalent?**
Platform: missing or `"auto"` basis starts a child at its measured content width; default `grow` is 0 so
surplus goes only to `grow > 0` entries; shrink applies only to `shrink > 0` entries, and the total can
exceed the row when none can give [C §1.2, §1.3]. Pi-tui measures by rendering the child, with no
intrinsic-width callback [C §1.2, §5]. Costs and traps:

1. *A cell reports the full row.* `HStack.render` measures each child at the full row width, and the cell
   pads to whatever width it is given, so its measured width is always W [M 2a (measured), C §1.2,
   E §3 `:36`]. No code today measures an instrument at an unbounded width [E §4].
2. *The memo misses every render* (measured: `[80, 80, 40, 40]` for one sample on two renders). It holds
   one slot keyed by `(sample, width)`, so every instrument renders twice per frame today [M 2b, E §3].
   This change rewrites that path, so it is this change's own gap.
3. *`$bar` has no content width.* It fills whatever its cell leaves, so "no more than it needs" is circular
   for it [M 2c, E §4]. An instrument's content width is a function of the width it is asked at, so the
   measuring width needs a rule [M 2c].
4. *Something must absorb the slack.* Pi-tui gives surplus only to `grow > 0` [C §1.3]; ADR 0002 leaves no
   column blank [E §6]. In Joel's top row the natural absorber, `path`, is not right-aligned; in his second
   row two `blank` cells already act as spacers [M 2d, 2k]. The default absorber is the missing rule.
5. *Who shrinks on overflow.* Cells are `shrink: 0` today [E §3]. With shrink on, pi-tui weights by size
   [C §1.3]; with it off the total can exceed the row [C §1.3]. The one-line guarantee survives only if
   every cell still clips to its allocated width [M 2e].
6. *The joint.* Content-sized neighbors render hard together (`…Anthropic🤔 Max`). ADR 0006 trims a format's
   outer whitespace, so a user cannot add a space [M 2f, E §6].
7. *Reflow.* Geometry then depends on content: `High` to `Max`, or a model switch, moves every neighbor.
   Entry options are re-seated only on a width change today [E §3, M 2i].
8. *`center` and `right` in a zero-pad cell do nothing* — a user-visible change to `align` [M 2g].
9. *Allocator rounding is order-dependent* (two `basis: 0, grow: 1` children in 30 get `[20, 10]`) [C §1.3].

**B. Can one cell hold more than one instrument, rendered as one string, with the geometry unchanged?**
Michael's alternative; his reading is that the card's name, "cell-grouping", points the same way
[M 4]. It would keep the even shares, the memo, ADR 0002 and "Instrument text MUST NOT change the
geometry" [M 4]. It is a different shape from the mechanism Joel described, so it is weighed and brought to
him, not substituted quietly [M 4]. Costs the evidence shows: a cell today holds one instrument, and an
instrument's `render` returns one string with a width [E §4, §5]; the cell's key set, the rule that every
cell holds an instrument and the unknown-key rejection all change [E §5, §6]; the grouped text still clips
inside one share of the row [M 4], so the pair's room is a fraction of the row, not what the pair needs;
and the joint question (A.6) arises inside the group.

**C. Does a row-level justify, or a fill or spacer concept, meet the target, or something else the research supports?**
Prior art, reported as theirs: CSS `justify-content` and auto margins; Starship's `fill`; Neovim's `%=`;
Figma's *Fill container*; tmux's `align=right` [C §2]. Pi-tui's `Stack` `align` is cross-axis only, with no
main-axis justify [C §5]. A fill or spacer is the declined `spacer` and revises that ruling [M 1c];
row-level justify was set aside, not declined [M 1d]. A row-level key is currently ignored silently, except
`containers`, which warns [E §5, §9]. Costs: the slack and `$bar` rules reappear as the fill's rule [M 4,
C §2]. Prior art on who gives up columns first is per item, not global [C §3].

Where any option would be configured (a cell key, a row key, an instrument option) is a design question;
Eleanor maps the three surfaces and what each rejects today [E §5, §10].

### Open owner decisions

- **Joel.**
  1. *The joint.* Do content-sized neighbors butt at zero columns, or does the system supply a gap, given
     ADR 0006 gives the user no way to add one? [M 3(i), 2f]
  2. *Default or opt-in.* Is the new behavior the default (*"A user shouldn't have to configure any more
     than truly necessary"* [R]) or an opt-in property? If opt-in, may it reuse the declined name `width`?
     [M 3(ii)] Any default change re-lays both of his rows [M 2k].
  3. *Mechanism or grouping.* Does the mechanism he described meet his target, or may a multi-instrument cell
     (option B) be weighed against it? [M 3 follow-up 3, M 4]
- **Michael and the council.** The slack rule (who grows), the overflow rule (who shrinks) and the `$bar`
  rule (A.3–A.5) [M 2c–2e]; which width is the measuring width [M 2c]; and, if ten stays, where it comes
  from [M 1f].

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `statusline`: the delta adds only requirements that hold under every option above (two neighbors reading
  as one at the right edge, the full width, overflow, `$bar`, columns, the unconfigured row). It does not
  write MODIFIED text for "Cells are evenly distributed across the width" or "Instrument text is bound by
  the row's geometry"; the council gate and Joel's rulings decide that, after which the delta is amended.
  The full-width sentence of the first is restated as its own requirement so it survives its revision; the
  amendment removes the duplicate.

## Impact

Not in this change: the other three cards (default labels on every shipped instrument, an instrument for
every datum pi provides, thresholds on the context instrument) [R]; clickable cells (parked [E §6]); any
edit to Joel's configuration file [R].

Where the existing behavior lives, for the design to read, not a prescription [E §3, §5, §7, §8]: the row
renderer and cell geometry under `visuals/`; the cell and row types and the cell-key rejection in
`configuration.ts`, only if a key is added; the tests that pin even shares (34/33/33, 14/14/13×8, a
right-aligned last cell at 13 columns); the README's "evenly divided cells"; `ARCHITECTURE.md`'s row
renderer and Fidelity sections. ADR 0002 is accepted, so its body is not edited; the option chosen decides
whether a new ADR supersedes it (docs pass).
