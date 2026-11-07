# Michael — orientation consult (not a gate)

Retained run `89be94f9-d89f-4bcb-acaf-4cd532e4ebae`, 2026-11-07. Written before Eleanor's report landed. A consult records no verdict.

## Answer

Consult only. Nothing is approved. Everything below was read or run read-only in /Users/joelleibow/Projects/pi-jefferson.

**1. Decisions on record that a content-sized cell must meet or explicitly revise**

- **(a) Cells share the row equally.** The living spec, `openspec/specs/statusline/spec.md`, says so in two requirements: "Cells are evenly distributed across the width" (l.63) and "Instrument text is bound by the row's geometry" (l.341). The second says "Instrument text MUST NOT change the geometry" and "Alignment hugs its cell's edge, not the row's." A content-sized cell directly breaks both, so the design has to revise them by name, with scenario changes (34/33/33 at width 100, 14/14/13… at 132).
- **(b) ADR 0002, rows span the full width.** It retired the old blank-right-edge property, where `basis: floor(W/N)` and `grow: 0` left the `W mod N` columns blank. It kept the rest:
  - every column is allocated, and a right-aligned last cell ends at the window's edge;
  - pi-tui allocates, Jefferson does not pad the composed row, and there is no gap;
  - the tree is built once and re-seated through `clear()`+`addChild` on a width change;
  - the cell's clip, alignment, column measurement and reset-before-pad are unchanged.

  Underneath it is Joel's 2026-11-05 ruling: *"let pi-tui do its thing and we are spared anything that risks us having bugs"* (configurable-instruments `owner-rulings.md`). A content-sized cell still has to fill the row and still has to leave allocation to pi-tui. Any move of layout arithmetic into Jefferson revises that ruling and needs Joel.
- **(c) `width` is declined (cells-as-objects `owner-rulings.md`).** Joel declined `width` and a `spacer` instrument, "Proportional layout is an addition … if a real need appears later". The spec rejects `width` as an unknown key, by name (l.221, l.613). A new cell key named `width`, or a filler instrument, revises that ruling explicitly. Another name does not.
- **(d) What was set aside, not ruled against.** Row-level justify, gaps, proportional widths and a fourth alignment were set aside as "separate changes if they ever matter" (configurable-instruments `owner-rulings.md` l.28 and `council.md` l.7). This change is where they might matter, so options touching them are in bounds. They are new decisions, not revisions.
- **(e) The cell owns the one-line guarantee** (configurable-instruments ruling; spec l.124). Clipping stays at the end with the ellipsis (cells-as-objects ruling).
- **(f) The cell count is 1–10, and above 10 truncates rather than rejects** (spec l.163). Joel accepted 10 "on the evidence that with the remainder spread by `grow` no ceiling has a geometric advantage". Once cells are content-sized, that evidence no longer bears on the ceiling. It is not a blocker, but if the design keeps 10 it must say where 10 now comes from.
- **(g) ADR 0006: a label gets one gap, and a format's outer whitespace is trimmed** (binding). See trap 2(f).
- **(h) `$bar` takes the columns the rest of the format leaves**, at most one per format (spec l.759; ADR 0006's "`$bar`'s arithmetic never depends on its own output").
- **(i) Rulings for this change** (`owner-rulings.md`, 2026-11-07):
  - the objective, quoted;
  - present the ideal shape, the range of flexibility and the costs;
  - *"A user shouldn't have to configure any more than truly necessary"*;
  - *"Don't invent what we don't have to"*;
  - row / cell / instrument vocabulary, with `module` and `widget` banned;
  - breaks are cheap before 1.0;
  - Joel's `~/.pi/agent/pi-jefferson.json` is never edited; checks use a scratch agent directory.
- **(j) ADRs 0001 and 0005: imports and layering.** Any geometry policy lives in `visuals/`, and host packages stay peer `*`.

**2. Traps (measured where marked)**

- **(a) The cell can't report its content width yet. Measured.** pi-tui 1.4.0 `HStack.render` measures each child by calling `render(safeWidth)` at the full row width. Only then does it call `render(allocated)` (`node_modules/@earendil-works/pi-tui/dist/components/h-stack.js`). For `basis` undefined or `"auto"`, `allocateStackSizes` uses that measured width. Our `cellView` (`visuals/row-renderer.ts`) pads to whatever width it is given, so its measured width is always W. `basis: "auto"` as the code stands makes every cell claim the whole row. pi-tui's primitive exists, but the cell can't currently answer "how wide is my content".
- **(b) The memo already misses every render. Measured.** The memo holds one slot, keyed by (sample, width). Because of the measure-then-render sequence it misses on every render today: a probe of a 2-cell row at 80 printed `[80, 80, 40, 40]` on two renders of the same sample. So every instrument renders twice per frame now. The defect predates this change, but this change rewrites exactly that path, so it is this change's own-work gap. A one-slot memo can't serve two widths per frame.
- **(c) `$bar` has no content width.** It takes whatever is left, so for a `$bar` cell "no more width than it needs" is circular. The context cell in Joel's second row is one. The design needs a rule for width-taking instruments: refuse content-sizing, treat `$bar` as zero, or make that cell the one that absorbs the slack. More generally, an instrument renders *at* a width, so its content width is a function of the width it's asked at. The design has to say which width is the measuring width.
- **(d) Something has to absorb the slack.** If cells take only what they need, the leftover columns have to go somewhere. Under ADR 0002 nothing may be left blank, so some cell must grow. In Joel's top row that cell is `path`, which is not right-aligned. In his second row, two `blank` cells already act as spacers. Choosing the absorber, and its default, is the missing rule. It's also exactly where row-level justify was set aside.
- **(e) Overflow and the one-line guarantee.** Cells are `shrink: 0` today. When content-sized cells together exceed W, pi-tui's shrink distribution decides who loses columns, weighted by size. The guarantee survives only if every cell still clips to its allocated width at the end. The design has to state who gives up columns first, and that it isn't the allocator's arbitrary order.
- **(f) The joint between butted cells.** Two content-sized neighbours render hard against each other, e.g. `…Anthropic🤔 Max`. ADR 0006 trims a format's outer whitespace, so a user cannot add a space to separate them. Either the system supplies a separator (the ADR 0006 precedent), or butting really means zero columns.
- **(g) Pad and reset.** A content-sized cell has no pad, but the absorbing cell still does, so the rule still applies to it. `center` and `right` inside a zero-pad cell become no-ops. That's a user-visible meaning change to `align`.
- **(h) Columns, not characters.** Content width must be the `visibleWidth` of the clipped, styled text including the label and its gap. Joel's labels are emoji, and ADR 0006 already records the case where the terminal draws an emoji wide but it's measured narrow. An off-by-one there now moves the neighbour, not just the pad.
- **(i) Reflow.** Geometry now depends on content, so a thinking change from `High` to `Max`, or a model switch, moves every neighbour. Two things follow. The tree's `addChild` options are re-seated only on a width change today, so anything computed in Jefferson would also have to re-seat on a content change. The spec's "recomputed from the width given at render time" is no longer the only trigger.
- **(j) Host version. Measured.** The repository pins and tests pi-tui 1.4.0 (`pnpm-lock.yaml`). The `pi` on this machine reports 1.5.0, and the 2026-11-05 ruling describes the 1.5.0 allocator. Host packages are peer `*`, so the user's host allocator is the one that runs. Allocator claims must be run against the version Joel runs, or that version must be pinned for the test.
- **(k) Joel's configuration.** His top row is `path`, then `model` and `thinking` both right-aligned. His second row is `blank, blank, context(right)` with `$bar`. Two consequences:
  - Any default change re-lays both his rows. A check of "looks right with no extra config" (the 2026-11-07 ruling) needs a scratch copy of his document, never his file.
  - Under content-sizing his `blank` spacers become 0-width or absorbers, which changes what they're for.

**3. Joel's rulings**

Nothing needs a ruling before research lands; options and costs go to him after research (his ruling). Two calls are certainly his and should be on that list, not decided in design:

- **(i) The joint.** Do content-sized neighbours butt at zero columns, or does the system supply a gap? Item 2(f) says why it's his to call.
- **(ii) Default or opt-in.** Is content-sizing the default (*"configure no more than truly necessary"*) or an opt-in cell property? If opt-in, may it be spelled `width`, which he declined in cells-as-objects?

**4. The strongest challenge to doing the change as stated**

As Joel states it, the change is "a cell takes only its content's width, and neighbours butt against it". That reverses "instrument text MUST NOT change the geometry", which is what makes rows stable and lets pi-tui own the layout. It also forces a slack rule (who grows), an overflow rule (who shrinks) and a `$bar` rule, which together are the row-level justify that was set aside.

His target, model and thinking "appear as if they're a single cell", might be reached without making geometry depend on content: for example, a cell that holds more than one instrument, rendered as one string. The "cell-grouping" card name points the same way. That would keep the even-share geometry, the memo and ADR 0002 untouched. But it is a different shape from the mechanism he described. The design must weigh it as an alternative and bring both to Joel, not quietly substitute it.

## Decided by

none. Nothing settles the open calls (the joint, default vs opt-in, the slack rule). The constraints cited above, which this change must meet or explicitly revise, are recorded in:
- cell-widths `owner-rulings.md` (2026-11-07)
- configurable-instruments `owner-rulings.md` (2026-11-05: layout on pi-tui, one line, 1–10 cells, `$bar`, deferred justify/gaps/proportional/fourth alignment)
- cells-as-objects `owner-rulings.md` (`width` and `spacer` declined, end truncation)
- ADR 0002 and ADR 0006
- `openspec/specs/statusline/spec.md`: requirements at l.63, l.124, l.163, l.341, l.759

## Owner

joel

## Follow-up

Joel's calls to put to him once research lands, with the measured costs:
1. **The joint:** do content-sized neighbours butt at zero columns, or does the system supply one gap? ADR 0006 leaves the user no way to add one.
2. **Default or opt-in:** is content-sizing the default, or an opt-in cell property? If opt-in, may it reuse the declined name `width`?
3. **Mechanism vs grouping:** is his target met only by the content-width mechanism he described, or may a cell holding more than one instrument (geometry unchanged) be weighed against it?
