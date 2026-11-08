# Design

Citations: **[R]** `owner-rulings.md`; **[E §n]** `research-eleanor.md`; **[C §n]** `research-chidi.md`;
**[CA §n]** `research-chidi.md`, "Chidi addendum 1: pi-tui 1.4.0 vs 1.5.0 allocator"; **[M n]** `michael-orientation.md`
item n (a consult, not a ruling); **[council]** `council.md`; **[Spec: name]** a requirement in this change's delta
`specs/statusline/spec.md`. "Spec l.n" is a line of the living `openspec/specs/statusline/spec.md`.

## Context

The motivation, the rulings and the requirements are in `proposal.md`, [R] and the delta spec; this section keeps only
what the mechanism rests on.

- **Geometry today is Jefferson's basis plus pi-tui's remainder.** Every cell gets `basis: floor(W / N)`, `grow: 1`,
  `shrink: 0`, gap 0; the cell pads whatever width it is given, so it always reports the whole width it was allocated
  [E §3]. The tree is built once and its entry options are re-seated (`clear()` plus `addChild`) only when the width
  changes [E §3, ADR 0002].
- **pi-tui's content basis is unusable as it stands.** `HStack.render` renders every child once at the full row width
  to measure it, even when the basis is numeric, then renders nonzero-width children at their allocated width; a child
  allocated 0 columns is not rendered in the final pass [CA §1(d), §2]. A cell that pads to the width it is given
  therefore always measures as W, so `basis: "auto"` makes every cell claim the whole row [M 2a, C §1.2].
- **The allocator is the same in the version the repository pins and the version Joel runs.** `dist/components/stack.js`
  and `dist/components/h-stack.js` are byte-for-byte identical in pi-tui 1.4.0 (pinned in `pnpm-lock.yaml`) and 1.5.0
  (the `pi` on Joel's machine), and every probe came out identical in both [CA §1, §2; M 2j].
- **`$bar` is the only width-taking variable**, and it takes exactly the columns the rest of its format leaves; at a
  width at or below the rest of the format it is empty [E §4]. No code measures an instrument at an unbounded or natural
  width today, and the width an instrument receives is always its cell's allocated width [E §4].
- **The memo misses every frame.** One slot keyed by `(sample, width)`, while pi-tui renders each cell at the full width
  and then at the allocated width, so every instrument resolves twice per frame and a repeated render of the same sample
  still misses (measured `[80, 80, 40, 40]`) [M 2b, CA §2, E §3].
- **The configuration surface.** A cell carries only `instrument` and `align` and any other key rejects the document,
  naming the key [E §5]. A row key other than `cells`, `id` and `containers` is ignored silently today [E §5]. Any
  rejection renders the default row and warns [E §5]. `Cell` and the `ALIGNMENTS` tuple live in `visuals/row.ts`
  [E §5].
- **Layering is fixed** by ADR 0005 and ADR 0001: `visuals/` holds geometry and imports only itself and the types of
  `data/`; configuration imports `visuals/`; host packages stay peer `*` [E §1, M 1j].
- **Joel's two rows.** Top: `path`, then `model` and `thinking` both right-aligned. Second: `blank`, `blank`,
  `context` right-aligned with `$bar` [R, M 2k]. His file is never read or edited by a task [R].

## Goals / Non-Goals

**Goals**

- A cell takes the columns its content needs by default, so neighbors sit against it and `model` and `thinking` read as
  one at the row's right edge [R, Spec: Two neighbouring instruments].
- `blank` and `$bar` cells fill; a row option restores today's equal shares, byte for byte [R, Spec: Cells are evenly
  distributed].
- Every column allocated, one line, any width, any content, with pi-tui doing the allocating [R 2026-11-03, Spec: A row
  spans the full width].
- No setting Joel has to touch: his two rows keep rendering right with no edit [R 2026-11-07, M 2k].

**Non-Goals** (each also in "What is deliberately not done")

- A cell holding several instruments, composing custom instruments, a spacer instrument, the declined `width` key,
  user-facing shrink priority, Jefferson-owned allocation beyond the numeric bases, a gap setting [R, council].

## Decisions

### 1. Content sizing is numeric bases that Jefferson computes and pi-tui allocates

Each render, Jefferson computes a numeric `basis` (and a `grow` of 0 or 1) per cell from the cells' content widths and
hands them to `HStack` through the same public `addChild` route; pi-tui still composes the line, spends any remainder
and handles overflow [R 2026-11-03 "let pi-tui do its thing"; ADR 0002].

The sizing rules are a pure function in one new source file under `visuals/` (called here the *width plan*): it takes the
row width, the row's distribution, and per cell its alignment, whether it fills, and its content width; it returns per
cell a `basis`, a `grow` and whether the cell carries a joint. It imports nothing, not even pi-tui. The footer renderer
(`visuals/row-renderer.ts`) stays the one adapter that names pi-tui: it asks each cell for its content width, calls the
plan and seats the result. What changes the plan is the rule set; what changes the renderer is pi-tui's API.

*Alternatives that lost:*

- **Raw `basis: "auto"`.** A padded cell measures at W [M 2a, CA §2]. The cell cannot tell a measuring call from an
  allocated one (a single cell allocated W receives the same `render(W)` in both), so it cannot answer differently.
- **A cell that reports its natural width in the measure pass** is the same trap one level down; rejected for the same
  reason.
- **A cell holding several instruments (option B)** and **a row-level justify or spacer (option C)**: Joel took A [R
  2026-11-07], and C re-invents the declined `spacer` [M 1c, council].

### 2. The content width is a probe at width 0, owned by the cell, in columns

A cell's content width is `visibleWidth` of its instrument's text rendered at width 0, label, gap and text included
(the label and its one gap are part of the instrument's text [E §4, ADR 0006]). The text is not padded and not clipped:
clipping and padding belong to the cell's final render and never feed back into the measure. Columns, never code units
[E §1, M 2h].

- **Where it lives.** The cell component in `visuals/row-renderer.ts` exposes the probe next to its `render`, through the
  cell's own memo (decision 8). Nothing outside the cell learns how text becomes columns.
- **Why width 0.** `$bar` is the only variable that reads the width, and at a width at or below its siblings it
  contributes nothing [E §4; `format.test.ts:121-125` pins it]. A width-0 render of any instrument is therefore its text
  with no bar, which is what [council] advised.
- **`$bar` accounting.** A `$bar` cell fills (decision 3), so the probe is never taken on one and a cell's width is never
  derived from the bar's own output [Spec: A width-taking bar; ADR 0006]. Inside its cell the bar's arithmetic is
  unchanged: the columns its own cell leaves after the rest of its format [E §4].
- **Empty.** A content cell whose probe is 0 columns (an unknown variable renders `""`, label included [E §4]) is *empty*:
  it takes 0 columns and takes part in nothing else.

*Alternatives that lost.* A `naturalWidth` method on every instrument duplicates the resolver, adds a contract each
instrument must keep, and answers nothing a width-0 render does not [E §4]. Probing at the full row width saves one
resolve per cell but is right only while no content cell holds a bar, a fact the width-0 probe does not need.

*Guard on the assumption.* A test walks every shipped instrument and asserts that one not marked as filling renders the
same text at width 0 as at width 200. A future instrument that reads the width and does not declare it fails there.

### 3. Which cells fill: `blank` and `$bar`, by a fact on the instrument

A cell *fills* when its instrument is `blank` or its format contains `$bar` [R 2026-11-07; Spec: A blank cell and a bar
cell fill]. Every other cell is content-sized. The bound `Instrument` gains one read-only fact, `fills`, which the cell
reads; it comes from the declaration for `blank` and from the format's parse for `$bar`, in the same files that already
enforce one `$bar` per format and bind the label [E §2, §4]. The parse is already in hand where the fact is set:
`instrumentBindings` in `visuals/instrument-binding.ts` holds the parsed `segments` at bind time [Michael's gate run
`f8bac3ce`; E §4], so `fills` reads the parse and there is no second one. A `context` cell whose format drops `$bar` is content-sized.

**No per-cell override.** The delta has no scenario that needs one: Joel's rows, every scenario in the delta and the
council's three calls are met by the default plus `blank` as the filler and the row option as the opt-out [R, Spec]. A
user who wants a particular cell to take the slack puts a `blank` cell beside it, which is a mechanism that exists [E §6,
§4]. A cell key nobody asked for would also reopen the declined-`width` ruling's neighborhood [M 1c] and change the
cell's exact keys [E §7, `configuration.test.ts:441`]. Deferred, not declined: if a real need appears, it is its own
change, as the 2026-11-04 ruling said of proportional layout [E §6].

### 4. The slack rule, as an algorithm

Inputs per cell *i* in a row of N, at row width W: `fills`, `align`, and for content cells the content width *n*.

1. **Equal distribution** (`distribution: "equal"`): every cell gets `basis = floor(W / N)`, `grow: 1`, no joint. No
   probe is taken. This is today's arithmetic [E §3, ADR 0002] and its only difference is the `shrink: 1` of step 4
   below.
2. **Content distribution (the default):**
   - *Classify.* Fill cells F (G of them). Content cells are empty (*n* = 0) or non-empty K.
   - *Absorber.* Only when G = 0: the last left-aligned cell among the non-empty K, else the first non-empty K, else
     the first cell. The slack goes to it and to no other cell. An empty cell never absorbs while a non-empty one exists;
     otherwise a datum that goes missing (it renders `""` [E §4]) would flip the whole row's geometry; the delta carries it (see "What the specs carry", 3).
   - *Joints (decision 6).* Compute the set of joint columns J: only boundaries between two non-empty content cells
     with no absorber slack and no fill cell between them count.
   - *Collapse.* C = sum of *n* over K. If C + J > W, J becomes 0.
   - *Slack.* S = W − C − J.
3. **Entry options.**
   - A K cell: `basis = n + (its joint ? 1 : 0)`, `grow: 0`. An empty cell: `basis: 0`, `grow: 0`.
   - A fill cell: `basis = max(0, floor(S / G))`, `grow: 1`. The remainder `S mod G` is smaller than G, and the allocator
     gives it to the earliest fill cells one column each [CA §1(a), §1(b)]. This is the only place the design leans on
     `grow` for surplus, and it stays inside the region the allocator is proven for: a surplus smaller than the
     candidate count [CA §1(a)]. A larger `grow: 1` surplus does not come out equal (two such children in 30 columns get
     `[20, 10]`) [C §1.3, CA §1(a)], which is why the shares are numeric.
   - The absorber (G = 0, S > 0): `basis = n + joint + S`, `grow: 0`. No surplus reaches the allocator at all.
   - S ≤ 0 and fills present: fill bases 0, the content bases stand, and the row is at or over W.
4. **Every cell**, in either distribution: `shrink: 1`, `minSize: 0`, no `maxSize`. These are pi-tui's defaults
   [C §1.1]; stating them keeps the overflow guarantee from resting on a default.

**What this gives.** Joel's second row (G = 3, C = 0) at 100: `[34, 33, 33]`. A row of `blank`, `model` and `$bar` at 90:
`model` takes its text width and the other two split the rest, differing by at most one. The default row of ten `blank`
cells at 80 and 132: 8 each, and `[14, 14, 13 × 8]` [E §7, Spec]. Equal distribution at 100 with three cells: `[34, 33, 33]`
whatever the content [CA §1(a), Spec].

*Alternatives that lost.* "The first cell absorbs" pushes `b` and `c` of an all-left row `[a, b, c]` to the right edge
[council]. Two `grow: 1` fill cells given the whole surplus [C §1.3]. Fill cells that keep their natural width, which
breaks Joel's second row's thirds (`context`'s text would add to its share). Jefferson-side proportional arithmetic
revises the 2026-11-05 ruling and needs Joel [M 1b, council].

### 5. The row option is `distribution`, with the values `"content"` and `"equal"`

```json
{ "id": "footer", "distribution": "equal", "cells": [ ... ] }
```

Absent means `"content"`. It sits on the row, as Joel specified [R 2026-11-07], next to `cells` and `id`, and reads in
the same function that reads them [E §5]. In a top-level row document it works the same way because the document is a row
[E §5].

- **Why this name.** Joel's words are "equal distribution" and the living requirement is titled "Cells are evenly
  distributed" [R, E §6]. *Distribution* names what the option decides without implying alignment (CSS `justify-*`) or a
  size on one cell (`width`).
- **Why an enum of two, not a boolean.** A boolean `equal: true` reads as a fact about the row and cannot grow when
  proportional or justified layouts (set aside, not ruled against [E §6, M 1d]) become a decision. A third value later is
  a non-breaking addition; a renamed boolean would not be.
- **Alternatives that lost.** `width` is declined and the council advises against reusing it [E §6, council]; `layout`
  and `justify` invite the set-aside features before anyone asked; a per-cell form is decision 3.
- **Contract.** `visuals/row.ts` gains the tuple `DISTRIBUTIONS = ["content", "equal"] as const` and `Row` gains
  `distribution`, mirroring `ALIGNMENTS` and `CellAlign` [E §5]. The default row carries `"content"`.
- **Validation.** A value that is not one of the two rejects the whole document, so the default row renders and the
  warning names the key and the value and lists the two valid ones, in the form of the align message
  (`…has an align that is not "left", "right" or "center"…`) [E §5]. Within a row `distribution` is checked
  first, then `cells`, then `id` (`normalizeRow` reads `cells`, then `id` [E §5]), so a row malformed in more than one
  place reports the distribution first; the whole order is envelope, instruments, then the row [E §7,
  `configuration.test.ts:864`].
- **Beside `rows`.** A top-level `cells` or `id` beside a `rows` list already rejects the document (`the configuration
  carries both a top-level row and a rows list`), while any other top-level key is ignored silently [Michael's gate run
  `f8bac3ce`, `configuration.ts:208`; E §5 `:209`]. A top-level `distribution` beside `rows` rejects the same way: it is a
  row option, the row is where it belongs, and a silent copy beside `rows` would never take effect
  [Spec: Cells are evenly distributed]. This envelope check runs before any row is read, so it precedes every
  precedence above.
- **Unknown keys.** A cell's unknown key still rejects, `width` still included, with today's message [E §5]. A row's
  unknown key is still ignored silently; this design does not add a rule nobody asked for. The cost is in Risks.

### 6. The joint: one collapsible column, owned by the right-hand cell

When two non-empty content cells meet with no spare room between them, the right-hand cell is one column wider and
renders that column as a leading space [R 2026-11-07, Spec: The joint collapses before content does].

- **Where it exists.** At a boundary between two non-empty content cells with only empty content cells between them. Not
  beside a fill cell: [R] is *"one system space"* between *content-sized* neighbors, and a fill cell is not
  content-sized, so the ruling gives none there [conductor ruling on the former open question 3]. Not at the boundary
  an absorber's slack lands on: the slack is the room, and it is at least one column whenever S ≥ 1, so the joint and
  the slack coincide. Both exclusions depend on that room being at least one column: the absorber's boundary has none
  when S = 0, and a fill boundary has none when S < G (the fill share is `floor(S / G)`) or S ≤ 0. A left-aligned absorber's slack lands after it, a
  right-aligned absorber's before it, a centered one's on both [E §3, `align` arithmetic]. In Joel's top row `path`
  absorbs, so the joint sits between `model` and `thinking` and not between `path` and `model`
  [Spec: Two neighbouring instruments, scenario 1: `model` takes only its text's width].
- **Counted and clipped.** The joint is in the right cell's `basis`, so it is in the measured width, and the cell clips
  the joint and its text together to its allocated width, so a surprise from the allocator can never overflow a line.
- **It gives way first.** If C + J > W every counted joint is dropped together (decision 4), before any cell's text is
  shortened and before pi-tui shrinks anything. J counts only the joints described above, so "all or none" means those:
  the absorber's boundary and a fill boundary are not in J and are present or absent with the slack. At W = C + J with an
  absorber, S = 0, so the absorber's neighbor abuts it while a counted joint elsewhere keeps its column; at S < G or
  S ≤ 0 two content cells with a fill cell between them abut while their texts fit. The counted joints never choose
  which to keep, and the collapse costs at most J − 1 columns of looks in a row already within J columns of overflowing.
- **Pad and ADR 0006.** The joint is part of the string the cell aligns and pads, ahead of the text, never part of the
  format: the label's one gap, the trim of a format's outer whitespace and `$bar`'s arithmetic are untouched
  [ADR 0006, E §4]. The joint is a plain unstyled space, so the reset-before-pad rule still concerns only the cell's own
  trailing pad [E §1, §3 `:40`].
- **No knob.** Joel chose one system space and no setting [R]. A stack `gap: 1` would put a column between every pair,
  empty cells and fill cells included, and break the byte-for-byte equal option and ADR 0002's "no gap" [E §6, M 1b]; it
  lost for that.
- **Reachable states.** The cases are the guards table's joint rows plus S = 0 with an absorber (the texts abut, because
  there is no column to give), S < G with a fill cell between content cells (they abut), and a centered absorber with S = 1 (one side abuts, because the pad splits `floor` left, remainder
  right [E §6, l.368]). Each is named and tested, not left to be discovered.

### 7. Overflow is pi-tui's; every cell can give up columns

When the bases exceed W, every cell has `shrink: 1` and `minSize: 0`, so pi-tui takes the deficit from whoever has
capacity and the allocated total is exactly W (46,201 over-width combinations, 0 bad totals) [CA §1(c)]. There is no
promise who loses first or by what ratio: earlier children often lose first (`[60, 40, 40]` in 80 gives `[26, 25, 29]`)
and the order is the allocator's [CA §1(c), Spec: Instrument text is bound by the row's geometry]. Each cell clips its
text at its allocated width with the end ellipsis and never wraps; a cell allocated 0 columns is not rendered and
contributes nothing [CA §1(d), R 2026-11-05, cells-as-objects ruling]. This is the 2026-11-05 ruling kept: no shrink
priority exists to configure [R].

**`align` in a cell with no spare columns** changes nothing: the pad is 0, so the left and right padding arithmetic emits
the same columns whatever the alignment [E §3 `:36-38`, Spec: An align in a cell with no spare columns]. No code is
added for it; a test shows it.

### 8. The memo keeps one text per (sample, width), several widths per sample

Each cell's memo holds the current sample and a map from width to the instrument's text at that width. A new sample
(identity) empties the map; `invalidate()` empties it [E §3, Spec: The footer's tree]. A frame now asks a content cell
for width 0 (the probe), the row width (pi-tui's measure) and the allocated width, three resolves; a second render of
the same sample asks for nothing new. That is the defect closed: the one slot could not serve two widths per frame
[M 2b, CA §2]. The joint, the clip and the pad are computed on every render from the cached text; they are cheap and
they depend on the plan, not on the sample, so they never sit in the memo.

### 9. The row re-seats when a cell's entry options change, not only when the window does

The footer computes each row's plan on every render (the probes are memoized), compares it with the options the row was
last seated with, and re-seats through `clear()` and `addChild` when the width or any field of the plan the cells read differs: `basis`,
`grow` and the joint flag [E §3, Spec: The footer's tree is built once]. The joint flag is in the set because a joint
and a text column trade one for one at the margin: a content change can leave every `basis` and `grow` equal while the
joint goes, and a stale joint then clips text (Michael's measured case, two right-aligned cells at 17, texts 8 and 8,
then 8 and 9). This replaces the width-only gate. A cell reads this render's joint flag
from the footer through a function handed to it when the tree is built, the same pattern as the sample slot it already
reads [E §3], not a shared object.

### 10. The cell-count ceiling rests only on Joel's earlier acceptance

Ten stays (`DEFAULT_CELLS` and `MAX_CELLS` [E §5]; the delta keeps it). The reason Joel gave, that with the remainder
spread by `grow` no ceiling has a geometric advantage [E §6, M 1f], does not hold for content-sized cells, and the
evidence names no other. The design therefore claims no new reason: ten is an accepted number, and the one thing that
grows with it is the per-frame probe work (one extra resolve per content cell). Closed: see Open Questions, 1.

### 11. The host version: what the design depends on and how it is checked

Depended on, in 1.4.0 and 1.5.0 alike [CA §1, §2]:

1. numeric `basis` is honored, and with `grow: 0` a child keeps it;
2. a `grow: 1` surplus smaller than the number of growing children goes one column each to the earliest ones;
3. with every child `shrink: 1` and `minSize: 0` the allocated total is exactly W;
4. each child is rendered at the full width and then, if its allocated width is nonzero, at that width.

The design never depends on pi-tui's behavior for a larger surplus (decision 4) or for who loses an overflow (decision 7).

**Evidence it holds on the version Joel runs.** The two files that implement 1 to 4 are byte-for-byte identical in the
pinned and the running versions and every probe agreed [CA §1]. The repository's end-to-end tests therefore exercise the
allocator that runs. The design does not move the `devDependencies` to 1.5.0: it is not needed for any claim above, and
the move would add transitive lockfile entries unrelated to this change [CA §3]; "don't invent what we don't have to" [R
2026-11-03]. A task's verification runs the footer tests once against pi-tui 1.5.0 in a scratch copy outside the
repository, and Joel confirms the result in his own pi session (his observation). This is decided, not open (Open
Questions, 2).

**If the allocator differs in a later version,** the end-to-end width tests at the boundaries in the guards table fail on
the first run against it. The design has no fallback in Jefferson: a fallback is Jefferson-owned allocation, which
revises Joel's ruling and needs him [M 1b]. The response would be a new decision, not a patch.

## What each guard refuses and what makes it fire

Each test must be shown failing against the named mutation before the code that satisfies it exists.

| Guard | Refuses | Fires on | Test that separates right from wrong | Mutation that must turn it red |
|---|---|---|---|---|
| One line when content grows | A cell wider than its allocation, a line break, a stale cached text | A cell's text longer than its allocation, a new sample | Text grows from short to long between two renders at W; each line is one line and W columns; a cell at 120 needed columns in 80 ends with the ellipsis in all three cells of 40 | `shrink: 0` is caught by the three-of-40 ellipsis assertion, because the host clips at W and the line stays W wide; a memo that survives a new sample is caught by the stale text (task 7.2), not by the line's width |
| Exactly W at every width | A column unallocated or over-allocated | Any W from 1 to 150 across rows of content, fill and absorber cells | Sum and `visibleWidth(line) === W` for each W; fixed cases at S = 0, S = 1, `S mod G` = 0 and G − 1, and W < N | An absorber base of `n + S − 1`, or `ceil` in place of `floor`, is off by one column at one of them |
| Content width in columns | A neighbor shifted by code units, an ellipsis when the text exactly fits | Wide BMP glyph (`漢`), combining mark, ANSI-styled text, the emoji label `🧠` | A cell at S = 0 renders its whole text with no ellipsis and no pad; the neighbor's text starts the same column styled or unstyled | Measuring `.length` fails on the combining mark and on the styled text, by columns |
| Joint absent when a cell is empty, present between two non-empty cells | A joint beside an empty or a fill cell; a joint inside the absorber's slack | `[a, empty, b]` (joint skips the empty cell), `[a, blank, b]` (none), `[path-left-absorber, model, thinking]` (only before `thinking`); `[model, blank, thinking]` at S < G, and at S ≤ 0 (the two content cells abut while their texts fit) | The column of each text start in each row at one width | Counting the empty cell as a neighbor, or giving every boundary a joint, moves a text start by one column |
| The joint gives way before content | A shortened text while the joint is present | C + J = W, C + J − 1, C + J + 1 with both-right-aligned cells; and W = C + J with an absorber (`[path-left-absorber, model, thinking]`) | At C + J − 1 the joint is gone and both texts are whole; at C + J it is there; with the absorber at W = C + J, `path` abuts `model` and `model`\|`thinking` keeps its joint, and at W = C every joint is gone and no text is shortened | A collapse test using `>=` in place of `>`, or a joint that clips text first, fails at exactly one of the widths |
| `$bar` and `blank` cells fill | A bar that starves, a hugging `blank` | Joel's second row at 100; `[blank, model, $bar]` at 90; `[path, context]` | 34, 33, 33; `model` at its text's width and the others differing by at most one; the bar's block count is the cell's share minus the rest of its format | A fill cell that keeps its natural width changes 34/33/33 |
| Overflow still clips | A line longer than W when the content needs more | Three cells of 40 columns in 80 (allocated 22, 27, 31), and other totals over W | One line, W columns, no line break; in the three-of-40 fixture each cell ends with the ellipsis, elsewhere each cell's text is whole or clipped at its end; no assertion on which cell lost how much [Spec] | `shrink: 0`: the host's composite clips at W, so the line stays one line, but the later cells are dropped by the clip and the earlier ones are not ellipsized, which the three-of-40 ellipsis assertion catches (Michael's measurement, gate run `cf833233-b180-4aa8-8d92-097b4e256db1`) |
| Equal distribution reproduces today | Any difference from today under the option | 8 cells at 80, 3 at 100, 10 at 132, 8 at 4, a right-aligned last cell at 132 | The strings of the current tests, unchanged: 10 each; 34/33/33; 14/14/13 × 8; the last cell ends at column 132 | An `equal` row that applies a joint changes one of the strings. An `equal` row that probes changes resolve counts, not strings, so the guard for that mutation is the resolve-sequence test (`[30, 30, 30, 10, 10, 10, 30]`, `tests/row-renderer.test.ts:330`) run under `equal` |
| Re-seat on content change | A stale basis after `High` becomes `Max` | The same row rendered twice at the same W, the thinking text one column shorter | `thinking` still ends at the row's right edge and the `model` text ends exactly one column before it | Re-seating on width only leaves `thinking`'s cell one column too wide, so the joint reads as two columns |
| Memo | A miss on every render | The same sample rendered twice at the same W, in a row of two or more cells whose allocated width differs from W (Joel's top row at 100: 61, 32, 7) | The instrument's resolve count after the second render equals the count after the first | The one-slot memo resolves again on the second render. The existing test at `tests/row-renderer.test.ts:292` is not this guard: its one cell has measured and allocated width both W, so it passes the one-slot defect |
| The probe assumption | A content cell that reads the width | Every shipped instrument not marked as filling | Text at width 0 equals text at width 200 | A new width-reading instrument without `fills` fails |
| The option's validation | A misspelled value taking effect | `"equl"`, `4`, `null`, `"Equal"` | The document rejects, the default row renders, the warning names the key and the value | Accepting an unknown string passes it |

The plan is unit tested as a pure function over the same cases (a table of inputs and the exact `basis`, `grow`, joint
flags), so the arithmetic is shown at its boundaries apart from pi-tui. The end-to-end cases run the real footer through
the fake host.

**Joel's two rows, with no edit** (a scratch agent directory holds a copy of the document his rulings describe; his file is
never read or edited [R]). With the sample he saw (`🧠 claude-opus-5-5 via Anthropic`, `🤔 Max`) and a working directory of
`~/Projects/pi-jefferson`:

- the contents are 15, 32 and 6 columns (`path` renders `basename(cwd)`, `visuals/instrument.ts:69`, and with Joel's
  label measured 15 [Michael's gate run `f8bac3ce`]), so C = 53 and the one joint (before `thinking`) makes J = 1. At
  100 columns S = 46: `path` takes 61 columns, `model` 32 and `thinking` 7. The line is the `path` text, 46 spaces, the
  model text, one space, the thinking text. At 132 the same row has 78 spaces and the same tail. The thinking text ends
  at the last column in both. The joint collapses below 54 columns (C + J);
- the second row at 100 columns: the three cells take 34, 33 and 33 columns and the bar fills the third's cell after the
  rest of its format, as before [Spec: Joel's second row keeps its thirds].

The test builds the expected strings from these counts and from the fixture's own text widths, not from the output.

## Risks / Trade-offs

- **[Neighbors move when a value changes length]** (`High` to `Max`, a model switch). A direct result of Joel's ruling [R,
  council]. → The row option `equal` restores stable shares per row; the re-seat and the memo keep the move correct.
- **[A misspelled option is ignored]** A row's unknown key is silent today [E §5], so `distrubtion` leaves the default
  on without telling the user. → Not designed in (no requirement asks); a once-per-document warning of the kind
  `containers` has [E §5] would close it, and would be its own change. Open question 4, closed.
- **[Overflow order is the allocator's]** The first column lost is the earlier cells', often the working directory
  [CA §1(c)]. → Accepted and unpromised by spec; a priority would revise Joel's 2026-11-05 ruling [R, M 1b].
- **[The joints collapse together]** A row within J columns of overflow loses every counted joint. → Named in decision 6;
  the cost is at most J − 1 columns of spacing.
- **[A fill cell next to a content cell can abut]** `[model, context]` puts the model's text hard against the context
  cell's start, as it did under equal shares. → The joint is Joel's for two content-sized cells [R] and a fill cell is not content-sized: none there
  (decision 6; open question 3, closed).
- **[The probe's assumption]** `$bar` is the only width-reading variable [E §4]. → The probe-assumption guard in the table.
- **[Three resolves per content cell per frame]** Not measured. → They are string formatting, pi-tui already renders each
  cell twice [CA §2], and the memo caps the count at three per sample; a measurement would be a task of Derek's report, not
  a gate.
- **[A terminal that draws an emoji wide and counts it narrow]** ADR 0006 records one [M 2h]. → An off-by-one now moves a
  neighbor, where before it moved a pad. Measured with `visibleWidth` as everywhere; the terminal's disagreement is not
  solved here.
- **[Host changes]** A later pi-tui may change the allocator. → Decision 11.

## Migration Plan

The change is **BREAKING** and Joel accepted it before 1.0 [R]. Documents with several cells re-lay: left-aligned cells
hug and the last one absorbs the slack [council]. There is no shim: `distribution: "equal"` on a row is the way back, per
row [R]. The rollback is reverting the change or setting that option; neither needs a data migration. No task touches
`~/.pi/agent/pi-jefferson.json`; his live observation of the two rows is his, in his own session, and is never ticked by
the writer [R].

## Consequences

**What the change takes away**

- Equal distribution as the default.
- Geometry independent of content: a cell's neighbors now move with its text.
- `align` meaning something in a hugging cell: it is a no-op unless the cell has spare columns.
- A cell's width is now a function of its content, so "Instrument text MUST NOT change the geometry" (spec l.341) is
  gone, modified by name in the delta.

**Existing tests this change flips** (Eleanor §7; line numbers may shift). The rule for every flip: a changed expectation
is derived from the rule in decision 4 by arithmetic written in the test, never copied from output, and the old string is
kept as a twin that runs with `distribution: "equal"`.

- *The fixture gains the option, the expectation is untouched.* These pin equal shares, which Joel's default no longer
  gives, so their rows declare `distribution: "equal"`; each passing unchanged is the evidence that the option reproduces
  today. In `tests/row-renderer.test.ts`: "a width that divides evenly gives every cell the same columns" (:46), "a width
  that does not divide evenly spends the remainder on the row's earliest cells" (:53), "the default row of ten cells at 132
  spans all 132 columns" (:63), "short cell text is padded so the line spans the full width" (:86), the four alignment tests
  at :92, :99, :109 and :118, "text wider than its cell renders identically under any alignment" (:127), the clip, wide-glyph
  and ANSI tests at :143, :157, :170, :183 and :221, "cell widths are recomputed when the width changes" (:257) and "each
  row seats its own basis on the first render" (:287). They test the cell's clip, pad and alignment inside an equal share,
  which the option keeps.
- *Held by the default.* "the footer renders one line per row, in order, each spanning the width" (:233), "more cells than
  columns still renders exactly one line of the width" (:250), "content wider than its cell is truncated to one line"
  (:63) and "an instrument resolving text wider than its cell is clipped and stays one line" (:73) assert one line and W
  columns, which the default keeps; where one pins a per-cell string it moves to the option.
- *The memo and call-count tests.* "the built-once tree keeps its cell memo when two renders share sample and width" (:269)
  and "an instrument resolves once per (sample, width) within a render, and again in the next render" (:315) count widths and
  resolves; under the default the probe adds width 0, and the Map memo changes the count on a repeat render. Their purpose
  is unchanged; they run with the option where the old sequence `[30, 30, 30, 10, 10, 10, 30]` is the point, and a new test
  asserts the default's sequence.
- *End to end, `tests/jefferson.test.ts`.* The default row at 80 (:278) holds, since the ten `blank` cells fill. "a right-aligned
  cell ends at its cell's right edge end to end" (:281) holds (the last cell ends at the edge under both). "configured formats,
  styles and a width-taking bar render end to end" (:551) changes under the default: the model cell hugs its text and the bar
  cell takes the rest of the 80 columns, so its `padEnd(40)` expectation becomes the rule's arithmetic and the old string
  stays as the `equal` twin. The per-cell `padEnd(40)`, `padEnd(8)` and `padEnd(80)` expectations at :587, :592, :610 and
  :626 are the same: each either gains the option or flips to the derived string, and Derek's report names which and why.
  The export pin (:297-312) gains `DISTRIBUTIONS` and the width plan's export: new exports, not a reshaped test. Its one
  assertion line, `assert.deepEqual(Object.keys(row).sort(), ["ALIGNMENTS"])`, is the single assertion line the diff
  edits and prints (A1); the fixture lines the other files gain are listed below.
- *Unchanged, because no per-cell key is added:* `configuration.test.ts` :139 (`width` still rejects, naming `"width"`), :441 (a
  cell's exact keys are `["instrument", "align"]`), :245 (the ceiling). Any test that deep-compares a `Row` gains the
  field `distribution: "content"`; E §7 names none, and Derek reports any he finds. One was found, below.
- `format.test.ts` and `instrument.test.ts` gain **fixture lines only; no assertion is edited**. The bar's arithmetic is
  untouched, but `fills` is a required fact on `Instrument`, so a fixture that builds an instrument declares
  `fills: false`, and a row literal declares `distribution: "equal"`. Eleanor's "Row literals are built nowhere else in
  tests/" was wrong [E §7]: `tests/format.test.ts:175` builds one. By file: `format.test.ts` gains `fills: false` on its
  instrument literal and `distribution: "equal"` on its footer row literal; `instrument.test.ts` gains
  `"distribution": "equal"` in the footer test's document (the conductor ruled it that test's `equal` twin, since the
  default would make `tokens` absorb and move its resolve count from 4 to 6) and the `fills: bound.fills` passthrough;
  `row-renderer.test.ts` gains `fills: false` on its fake `{ render }` literals. Task 9.2 lists the measured lines.

**Documents the change makes false** (the docs pass handles them; none is a task here):

- `README.md` Status ("evenly divided cells spanning its full width"), the configuration section (no `distribution` option),
  and its `$bar` paragraph if it speaks of equal shares [E §8].
- `ARCHITECTURE.md`: the row renderer paragraph ("The basis is ours (`floor(W / N)` per cell)…", the memo by `(sample, width)`,
  re-seating on width change) and the Fidelity section's remainder sentence [E §1].
- ADR 0002 stays as accepted history; its decision ("Give each of a row's N cells `basis: floor(W / N)`…") becomes the
  `equal` option and no longer the default. Whether a new ADR supersedes it, and what the new ADR records (content sizing,
  the joint, the option), is the docs pass's call.
- The living spec, by sync: the four modified requirements, plus spec l.368, whose wide-glyph scenario the delta modifies
  (see "What the specs carry"). Spec l.100 needs nothing: it has no `floor(W / N)` scenario.
- `AGENTS.md` and any other instruction file: only if Derek's report lists a sentence.

## What is deliberately not done

- **Composing custom instruments** from variables and visualizations such as `$bar`: its own card [R 2026-11-07].
- **A cell holding several instruments** (option B) [R].
- **A spacer instrument**, a filler concept or a row-level justify (option C); `blank` already fills [E §6, council].
- **The `width` key**, still declined and still rejected by name [E §6, spec l.221, l.613].
- **A per-cell override** (decision 3) and **a gap setting** (decision 6).
- **A user-facing shrink priority** and **Jefferson-owned allocation beyond the numeric bases** [R 2026-11-05, M 1b].
- **Clickable cells, the other three cards, any edit to Joel's file** [proposal.md Impact, R].
- **A fallback for a different allocator** (decision 11).

## What the specs carry

The items the design builds that the delta first lacked are now in `specs/statusline/spec.md`:

1. **The row option's values and rejection** (decision 5): [Spec: Cells are evenly distributed] has the requirement
   sentence and the scenarios for `"content"`, `"equal"`, a bad value, and a top-level `distribution` beside `rows`.
2. **Spec l.368 ("A cell's alignment is the padding side inside it")**: its wide-glyph scenario said the cell still
   occupies `floor(W / N)`; the delta modifies that requirement and the scenario now says the columns its row gave it.
   Living l.100 does not say `floor(W / N)` and is untouched.
3. **Empty cells and the absorber**: an empty cell takes 0 columns and never absorbs while a non-empty one exists
   (decision 4); a scenario in [Spec: Cells are evenly distributed].
4. **The joint beside an absorber, beside a fill cell, and its collapse** (decision 6): the placement rule is in [Spec: Two
   neighbouring instruments]; the scenarios are in [Spec: Cells are evenly distributed].

## Open Questions

None remains open. The conductor ruled on three (scope and routing are the conductor's; Joel is told) and Michael's is
decided.

1. **Ten as the ceiling.** Kept at ten, resting on Joel's earlier acceptance only. No new reason exists and none is
   invented ("Don't invent what we don't have to" [R 2026-11-03]). Changes no scenario. (Decision 10.)
2. **The `devDependencies`.** They stay at 1.4.0, with one scratch run on 1.5.0. Decided: the allocator files are
   byte-identical in both versions [CA §1, §2]. (Decision 11.)
3. **A joint beside a fill cell.** None. Joel's ruling is *"one system space"* between *content-sized* neighbors [R
   2026-11-07], and a fill cell is not content-sized, so the ruling gives none there. (Decisions 3 and 6.)
4. **An unknown row key.** Behavior unchanged: silent, as today [E §5]. A warning on unknown row keys is adjacent and
   would be its own change. (Decision 5.)
5. **Where `fills` is read.** At `instrumentBindings` in `visuals/instrument-binding.ts`, which already holds the parsed
   `segments` at bind time; `fills` reads the parse and no second parse exists [Michael's gate run `f8bac3ce`].
   (Decision 3.)
