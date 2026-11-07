# Proposal

## Why

Joel, naming the second of four things that bother him about his footer: *"I have to use spaces in my
label config because it renders right up against the instrument content and looks bad."* (`owner-rulings.md`,
2026-11-06.) No step in the label's path adds a space today: the only gap a user sees is a trailing space
typed into the label string, as in the default `Thinking: ` (`research-eleanor.md` §3.4). Starship has the same
convention, with the space inside the symbol string and no automatic gap (`research-chidi.md` Q1).

Shown his footer with the space removed, he ruled the gap required and added that outer whitespace in a
label and in a format should be trimmed (`owner-rulings.md`, 2026-11-07). The two belong together: the gap
is the one separator, and the space a user typed to get it is no longer needed. So the scope is the label
and the outer whitespace of the format, as one change.

## What Changes

The objective, as Joel ruled it: **a label written with no trailing space renders with a gap before the
content** (`owner-rulings.md`, 2026-11-06). Two rulings of 2026-11-07 settle what the first left open and widen
the scope to trimming (`owner-rulings.md`, 2026-11-07):

- **The gap is required, with no configuration.** A label always renders with a gap before its content;
  no option, setting or opt-out is added for it; a label can no longer sit flush against its content.
  (*"A user shouldn't have to configure any more than truly necessary"*; *"There should at least be a
  miniscual quantity of gap"*.)
- **Outer whitespace is trimmed.** Whitespace at the front and back of a label, and at the front and back
  of a format, is removed, after the control-character collapse. A label that already ends in a space,
  such as `🧠 `, `🤔 `, `🔋 ` and the default `Thinking: `, renders with one gap, not two, and a format
  with leading or trailing space renders as if without it. (*"Remove spaces blased at the front or back of
  labels and format."*)

This change is that card and the trim, and nothing else. The mechanism, including where the gap and the
trim happen, is the design step's to choose and is not chosen here.

Constraints on any solution, each with its source:

- **Every instrument that has a label gets the gap.** The label is a foundational option on every
  instrument, always in front of the format, never a variable (living spec, "An instrument's label is
  placed in front of its format", `spec.md:934`; archived `2026-11-06-default-thinking-instrument`
  owner-rulings, "Label option").
- **An unknown datum still renders the whole cell empty, label included.** No lone gap appears in such a
  cell (living spec, same requirement; `research-eleanor.md` §3.2).
- **`$bar` still takes exactly the columns the rest of the format leaves**, so the gap's column must be
  counted in what the rest takes (living spec "$bar takes the width the rest of the format leaves",
  `spec.md:747`; `research-eleanor.md` §3.3).
- **Widths are columns, never characters** (`AGENTS.md:35`). The gap is one column: Joel's "miniscual
  quantity of gap" (`owner-rulings.md`, 2026-11-07) is the smallest quantity a terminal can draw, and a
  space measures one column whatever the terminal does to the emoji beside it (`research-chidi.md` Q3).
- **The gap appears when the label and the format are both non-empty after the trim**, a fact known from
  the document, and not when the format happens to render something. A label with an empty or
  whitespace-only format renders alone, with no trailing space (`council.md`, "Accepted & Rejected
  Feedback").
- **The gap takes the label's style**, so no unstyled hole shows between label and content under a `bg` or
  underline style (`council.md`; `AGENTS.md` pad-reset trap). How the row's colors stay clean past the cell
  is the design's.
- **A row stays one line** whatever a format contains; that guarantee belongs to the cell (Joel,
  2026-11-05, inherited).
- **A narrow cell clips the label, the gap and the content together**, with no truncation rule of its own
  (archived design risk, `research-eleanor.md` §3.3; `research-chidi.md` Q3: `truncateToWidth` treats a space
  as an ordinary width-1 grapheme).
- **The default label's rendered text, `Thinking: High`, is Joel's quoted ruling** (archived owner-rulings,
  "Default composition": *"The default label should just be "Thinking: ""*) and keeps rendering
  identically unless he rules otherwise.
- **The gap is not syntax.** Nothing in a label gains meaning, and no `$label` appears (living spec, label
  requirement; ADR 0003, `$` and `|` special, stays as it is).
- **BREAKING, with no shim.** A label that relied on sitting flush against its content now has a gap, and
  any document or test that relies on a trailing or leading space in a label or in a format changes: the
  space is removed, and the label's gap replaces it. Breaks are cheap before 1.0 (inherited ruling: 0.2.0 and
  0.3.0 each broke `cells` with no shim).
- **Existing scenarios the gap changes are restated, not left contradicting it.** They are MODIFIED in the
  delta (see Capabilities).

What stays out: a gap option, a gap width setting, an opt-out for a flush label and a per-instrument
separator (Joel ruled none is added, 2026-11-07; *"Don't invent what we don't have to"*, 2026-11-03); cell grouping, new
instruments and thresholds on the context instrument (separate cards, `owner-rulings.md`); the rider
commits on this branch (archive ticks, the openspec `config.yaml` context block and schema default); and
any edit to `~/.pi/agent/pi-jefferson.json`, which no task touches (2026-11-06).

Left to the design, because it is mechanism (`michael-orientation.md` §3): where in the code the gap and
the trim happen, and whether the default label drops its trailing space, with the one constraint that
`Thinking: High` renders identically (`council.md`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `statusline`:
  - **MODIFIED** "An instrument's label is placed in front of its format": the label is no longer
    only literal text rendered as written, so its text states the trim, the gap's presence
    condition and width, and the empty-label rule, once; the gap's style, `$bar`, clipping and the
    one-line guarantee are stated by its scenarios. Its
    scenarios are restated where the gap or the trim changes them: "A label in front of a configured
    format", "An empty format leaves the label alone" and "The label takes width from a bar", and new ones
    cover a label that ends in a space or a control character, a whitespace-only format and the gap's
    style.
  - **MODIFIED** "An instrument's format is plain text and variables": whitespace at the front and back
    of a format is removed, so "literal characters render verbatim" is qualified at the edges, with
    scenarios for it.
  - **MODIFIED** "The thinking instrument": the scenario "A configured label" (`🤔` then the capitalized
    level) gains the gap, and the default's rendered text is pinned to `Thinking: High`.
  - "$bar takes the width the rest of the format leaves" is not modified: its text already counts the
    label as part of "the rest", and the label requirement's scenario pins the gap's column.

## Impact

- **Specs:** `openspec/specs/statusline/spec.md`, the requirements above.
- **Code:** the label's binding and the format language's width arithmetic are where Eleanor found the
  label handled (`research-eleanor.md` §3.1); the design chooses the place.
- **Tests:** the tests that flip, and why, are in design D7, which is the one place that lists them; every test with a trailing space or a leading or trailing space in a format
  (`tests/configuration.test.ts:496-605`, `tests/jefferson.test.ts:433-441`,
  `tests/instrument.test.ts:58-59`) is revisited under the trim (`research-eleanor.md` §5,
  `michael-orientation.md` §2).
- **BREAKING:** any document or test that relies on a trailing or leading space in a label or a format
  changes. With no shim, cheap before 1.0 (inherited ruling).
- **Documentation:** `README.md:70-86` describes labels without the gap or the trim; that is the docs pass, not a
  task.
- **Host limit, not scope:** some terminals draw an emoji two cells wide while measuring it one, and the
  next cell is overdrawn (`research-chidi.md` Q4, S7). `visibleWidth` measures the three emoji in Joel's
  configuration at 2 columns under the pinned pi-tui (`michael-orientation.md` §2), so the gap he
  describes is a missing space and not a width mismatch.
- **Alternative declined by the ruling:** change nothing, because users already get the gap by writing the
  space (`michael-orientation.md` §4). Joel's ruling picks the change.
- **Joel's configuration:** `~/.pi/agent/pi-jefferson.json` is not edited; any check uses a scratch agent
  directory.
