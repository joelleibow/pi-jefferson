# Proposal

Citations: **[R]** `owner-rulings.md`; **[E §n]** `research-eleanor.md` (**[E A1]**, **[E A2 §n]** its
addenda); **[C §n]** `research-chidi.md` (**[C A1 Qn]** its addendum); **[M n]** `michael-orientation.md`,
by the numbered section (1 decisions on record, 2 traps, 3 calls that are Joel's, 4 strongest challenge).
The orientation is a consult, not a ruling; each of its items points at the decision it cites.
This proposal states the problem, the evidence and the questions. The council and Joel's rulings answered
them; each open question below ends with where it is settled. **[Co]** is `council.md`, **[J1]**, **[J2]**
and **[CR]** its "Joel's rulings" section, **[D n]** `design.md`'s numbered decision.

## Why

Joel looked at his footer after the cell-widths change and asked: *"Since our PR is opened is it the
right place to address the spacing between rows or do we want to merge and release this and follow up
with a patch?"* He merged that PR and opened this change with *"Next card: 'Space between rows'."* [R,
2026-11-08]. He also asked that something else be considered: *"Because we have active subagents there's
a informative row that seems to always be added during subagents being active. It always sits above the
jefferson footer."* [R, 2026-11-08]

## What Changes

The objective, from Joel: **the spacing between the footer's rows**, and only that card [R, "One card"].
The other cards (default labels, an instrument for every datum, context thresholds, composing custom
instruments, the OpenSpec `context:` block) are separate changes [R].

### What the evidence establishes

- **Today the footer has no space between rows.** Rows sit on adjacent lines. A row holds cells and the
  footer is one `VStack` of one `HStack` per row, built once, with the `VStack`'s `gap` at `0` [E §1;
  E A1]. At width 132 Joel's two rows render as exactly two lines, with no blank line before, between or
  after [E A1].
- **pi-tui already has two ways to put space between a stack's children.** `VStack` takes a `gap` option:
  a non-negative integer, default 0, floored, fixed at construction (`protected readonly`, no setter), and
  inserted as empty unstyled lines only between children, never before the first or after the last [C §1;
  M 2 "VStack gap"]. `Spacer(lines)` is an ordinary child that renders that many empty lines and has
  `setLines(n)` [C §1]. The `VStack` `gap` is uniform; a space of one pair of rows only is a `Spacer` entry
  between two `HStack`s [M 2 "VStack gap"]. pi-tui has no per-child margin [C §1]. 1.4.0 (the repo's pin)
  and 1.5.0 (what Joel runs) are identical for stacks, gaps and `Spacer` [C §1; M 2 "1.4.0 vs 1.5.0"].
- **Other tools.** CSS names the same idea `row-gap`, with `gap` as the shorthand, one value per
  container [C §3]. pi-tui's `gap` shares the name. Starship and powerlevel10k model a line break as an
  element of the layout and a global "blank line before the prompt" boolean; tmux and lualine have no
  inter-row spacing, and a blank row is an empty row; pi-powerline-footer's `padding` is horizontal; no
  statusline checked has a between-rows option [C §3]. pi's own built-in footer has no blank line between
  its lines [C §2].
- **A blank row works today, with no code.** A row of one `blank` cell, with `instruments.blank.format`
  set to `""`, renders a full-width line of spaces between two rows [E A2 §1; M 2 "A blank line already
  exists"]. Joel's document already sets that format. Without it `blank` renders placeholder text [E A2 §1].
  The workaround costs a row id and a row in the count the `/jefferson` command reports [M 2], and it is
  a configured row, not a default.
- **Row and document keys are silent when unknown.** A row key is checked only for `distribution`,
  `containers`, `cells` and `id`; a top-level key only for `rows`, `cells`, `id`, `distribution`,
  `containers` and `instruments`. A `gap` on a row, or at the top level beside `rows`, is accepted with no
  warning and never read [E A2 §2; M 2 "Row-level and top-level unknown keys"]. A key added by this change
  is therefore ignored without a word by an older pi-jefferson, and a misspelling of it is ignored too.
- **A row is one line, and the guarantee belongs to the cell** [R, archived 2026-11-05 ruling; M 1]. An
  `HStack`'s height is its tallest child's, so a cell that returned two lines would make its row two [M 2
  "The gap must never be a row's or a cell's line"]. Space between rows is therefore a concern of the
  stack that holds the rows.
- **The footer shrinks from the bottom in fullscreen.** Joel runs `tuiMode: fullscreen`. The footer is a
  dock entry that may shrink to nothing and the transcript grows; each footer line, a gap line included,
  costs the transcript one line, and on a short terminal the footer loses its bottom lines first [M 2
  "Fullscreen"; C §2]. Measured by Michael on the allocator's functions, not on a running pi [M 2].
- **Row one has nothing above it.** `VStack`'s gap adds nothing before the first child [C §1; M 2 "Space
  above row one"]. Row one sits directly under the editor's bottom border [M 2], and pi's built-in footer
  has no space above its first line either [M 2].
- **The row above the footer is another extension's.** Per Joel's ruling it is pi-subagents' fleet status,
  set through `ctx.ui.setWidget` with `belowEditor` placement [R]. (Chidi confirmed the call site at
  `fleet-status.js:638` and not the placement argument [C A1 Q3]; the placement is Joel's ruling.) pi
  mounts, in order, the editor, the below-editor widgets and the footer [C A1 Q1]. For `belowEditor` it
  adds no spacer before, after or when empty, while `aboveEditor` gets a one-line `Spacer` [C A1 Q1]. So
  the widget's last line is directly adjacent to the footer's first line, and pi puts nothing between
  them [C A1 Q1]. The footer factory receives `(tui, theme, footerData)`, `render` receives only a width,
  and no API found tells a footer that a widget sits above it [C A1 Q1]. Chidi did not audit `tui` for a
  public way to enumerate the widget containers [C A1 Q1]. A leading empty line in a footer component
  would sit between that widget and the footer, and with no widget present directly below the editor [C
  A1 Q3, read from source and not run]. Jefferson reads no `setStatus` text and renders no pi-provided
  content above its footer [E A1]. A custom footer drops `setStatus` text unless it renders it, through
  `footerData.getExtensionStatuses()` [C A1 Q2]; that is a different channel from the widget.
- **The renderer's trim and a fullscreen footer's gap lines are unrun.** Chidi did not audit the
  differential renderer end to end for trimming of empty lines [C "Assumptions"], and read the fullscreen
  path without running it [C "Assumptions"].

### The requirement any space revises

Whatever Joel rules, the living requirement "A row is one line tall" says *"so the footer's height is the
number of declared rows"* and its scenario says three rows render three lines [M 1; spec]. Any space
between rows, by default or by configuration, makes that false, so the delta modifies the requirement.
The first requirement, "The statusline renders the declared rows", carries a scenario saying two rows
render two lines, which a default gap would also falsify [M 1]; the delta rewrites that scenario so it
holds whatever is ruled. The "one line per row" half of both stays.

What holds whatever Joel rules, and so is all the delta states: a row stays one line; any space between
rows is the footer's stack's, never a row's or a cell's line; and the footer's height is its rows' lines
plus that space. How much space, whether there is any by default, and whether a user sets it are not in
the delta.

### Not in this change

- A per-row setting, a loud unknown-key rule or a `blank` row as the answer [Co, rejected].
- Per-cell vertical alignment, a row's height above one line, or a cell returning two lines: a row stays
  one line [R].
- The horizontal gap between cells, `GAP = 0` in the row renderer, and ADR 0002 and ADR 0007's "no gap",
  which are the `HStack`'s and are untouched [M 1 "standing records not revised"]. The label's one-column
  gap (ADR 0006) is likewise unrelated [M 1].
- Per-render changes to the amount of space: a stack's gap is fixed at construction, and so is the tree,
  built once at session start [C §1; M 2].
- Any edit to Joel's `~/.pi/agent/pi-jefferson.json`; a check that needs a configuration uses a scratch
  agent directory [R, 2026-11-06].

The archived line *"Row-level justify, gaps, proportional widths, a fourth alignment ... are separate
changes if they ever matter"* (configurable-instruments) is not prior art for a vertical gap: every
archived "gap" is horizontal, and no archived ruling, council or ADR mentions vertical space between rows
[M 1 "archived scope note"; E A2 §3, §4].

### Open questions

Each is a question for the council or for Joel, stated without an answer. The first seven are Michael's
list of the calls that are Joel's [M 3].

1. Is there any vertical space between rows **by default**? A default changes the height of every existing
   footer, turns six assertions that equate line count with row count red [M 1], and costs a fullscreen
   transcript line per gap [M 2]. It meets Joel's *"A user shouldn't have to configure any more than truly
   necessary"* [R]; his *"The ideal as the default, plus an escape hatch for what a break removes"* [R]
   would then call for a way back to no space. Joel's own two-row document would become three lines with no
   edit [M 2].
   **Settled:** yes, one line [J1, Co]; with a line above row one, four lines [J2, CR]; the way back is `rowGap: 0` [D 1, D 2].
2. **How much**: one line, or a number? pi-tui accepts any non-negative integer; a ceiling, if any, is a
   product call [M 3].
   **Settled:** one by default; a whole number from 0 to 3, a ceiling Joel ruled after the design gate because a huge value hangs pi [J1, J3, Co; D 4].
3. **Can a user set it at all, and where does it live**: once per document, or per row? A document-level
   value maps to a `VStack` `gap`, a per-row value to `Spacer` entries between `HStack`s [M 2 "VStack gap"].
   Which keys the "both shapes at once" rejection lists depends on the answer [M 2 "unknown keys"].
   **Settled:** once per document, no per-row setting, accepted beside either envelope and not a conflict with `rows` [Co, J1; D 4].
4. **What is the key called**, if there is one? `gap` already names three things here: the `HStack`'s
   inter-cell gap, the label's gap, and the `VStack` `{ gap: 0 }` [M 2 "The word gap"]. `row-gap` is
   CSS's term and `gap` pi-tui's [C §3]. The vocabulary rule rejects "module" and "widget" [R].
   **Settled:** `rowGap` [J1].
5. **Does "between rows" include space above row one**, between the editor and the footer? Today there is
   none, in Jefferson's footer or pi's [M 2]. A leading space is a `Spacer` first, not a `VStack` gap [M 2].
   **Settled:** yes, always; `rowGap` governs both places [J2, CR]; the mechanism is a zero-line `Spacer` first [D 2].
6. **Should a misspelled or unknown row or document key warn or reject?** Today it is silent [E A2 §2]. A
   loud rule is new mechanism with an interaction with `containers`, and Joel has not asked for it [M 2,
   M 3].
   **Settled:** silent, recorded as a `shortcut:` [Co rejected Q6; D 7].
7. **Is a `blank` row an acceptable answer** for anyone, since it works today [E A2 §1], or must the
   concept exist in its own right, without a row id, a count in `/jefferson` and a dependency on the
   `blank` format override? [M 2, M 4]
   **Settled:** no; it is a configured row, not a default [Co rejected Q7].
8. **The row above the footer.** Joel asked that it be considered [R]. What, if anything, does this change
   do about it? The evidence bears on the choices but does not make them:
   - pi adds no space between a `belowEditor` widget and the footer, and a footer cannot learn that the
     widget exists [C A1 Q1], so a space Jefferson adds above row one appears with or without a widget and
     cannot be made conditional on one with what has been found.
   - A space above row one is question 5; the fleet-status row is the case that makes it matter. Whether the
     answer to 5 is one thing for both is Joel's.
   - Is the fleet-status row's presence, its placement or its spacing something this extension should
     change, or only a reason the footer's own space is set? The row is another extension's [R].
   - Does Jefferson render pi's `setStatus` text through `footerData.getExtensionStatuses()` [C A1 Q2]? It
     does not today [E A1]; it is the card's neighbour, not this card [R, "One card"], unless Joel says
     otherwise.
   - Chidi did not run this live in pi, and did not audit `tui` for a public way to enumerate widget
     containers [C A1 Q1, Q3]. Both are unknowns, not findings.
   - **Settled:** nothing is done to the fleet-status row; the footer's space above row one is unconditional,
     which Joel chose knowing it shows in every session [J2; D 2]. `setStatus` stays out [R, "One card"].

The strongest challenge to the card, from the orientation: the capability exists, so the change is a
one-question product decision (a default, and if so the way back), not a spacing model [M 4]. If the council
designs a per-row spacing model, a ceiling or an unknown-key rule, it has left the card [M 4].

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `statusline`: the delta modifies two requirements. "A row is one line tall" no longer says the footer's
  height is the number of declared rows; it says any space above row one or between rows belongs to the
  footer's stack, never a row's or a cell's line. "The statusline renders the declared rows" has one scenario
  reworded. It adds two requirements: the default space above row one and between rows, and `rowGap`.

## Impact

Where the existing behavior lives, for the design to read and not as a prescription [E §1, §2, §5; M 1]: the
footer's tree in the row renderer under `visuals/`, where the `VStack` is built; the configuration reader,
only if a key is added; the tests that equate the footer's line count with the row count (six assertions
across `tests/row-renderer.test.ts` and `tests/jefferson.test.ts` [M 1]), which go red under a default and
stay green under a configured-only space; the README's description of footer rows [E §6]; and
`ARCHITECTURE.md`'s "one footer line per configured row" [M 1], which is the docs pass's. ADR 0002 and ADR
0007 are accepted and untouched.
