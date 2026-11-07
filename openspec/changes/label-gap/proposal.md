# Proposal

## Why

Joel, naming the second of four things that bother him about his footer: *"I have to use spaces in my
label config because it renders right up against the instrument content and looks bad."* (`owner-rulings.md`,
2026-11-06.) No step in the label's path adds a space today: the only gap a user sees is a trailing space
typed into the label string, as in the default `Thinking: ` (`research-eleanor.md` §3.4). Starship has the same
convention, with the space inside the symbol string and no automatic gap (`research-chidi.md` Q1).

## What Changes

The objective, as Joel ruled it: **a label written with no trailing space renders with a gap before the
content** (`owner-rulings.md`, 2026-11-06). This change is that card and nothing else. The mechanism is
the design step's to choose and is not chosen here.

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
- **Widths are columns, never characters** (`AGENTS.md:35`). The gap spends the one column a typed trailing
  space spends (`research-chidi.md` Q3: a space is width 1 whatever the terminal does to the emoji beside
  it). Joel's ruling names "a gap", and his complaint is about having to type a space, so one column is
  this proposal's reading of it; it is not a separate ruling and the design gate may challenge it.
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
- **BREAKING, with no shim.** A label that relied on sitting flush against its content now has a gap; and,
  depending on open question (a) below, a document or test that already writes a trailing space may render
  a second gap. Breaks are cheap before 1.0 (inherited ruling: 0.2.0 and 0.3.0 each broke `cells` with no
  shim).
- **Existing scenarios the gap changes are restated, not left contradicting it.** They are MODIFIED in the
  delta (see Capabilities).

What stays out: a gap option, a gap width setting and a per-instrument separator (each would need a
requirement behind it: *"Don't invent what we don't have to"*, 2026-11-03); cell grouping, new
instruments and thresholds on the context instrument (separate cards, `owner-rulings.md`); the rider
commits on this branch (archive ticks, the openspec `config.yaml` context block and schema default); and
any edit to `~/.pi/agent/pi-jefferson.json`, which no task touches (2026-11-06).

Left to the design, because the rulings do not settle it and it is mechanism or a design judgment
(`michael-orientation.md` §3): whether the gap takes the label's style, and how a gap that is styled
under `bg` or underline leaves the row's colors clean (`AGENTS.md` pad-reset trap).

### Open owner decisions

Nothing in `owner-rulings.md` covers either. Both are Joel's; the council gate brings them to him.
`michael-orientation.md` §3 records Michael's advice on both. It is advice, not a ruling, and this
proposal settles neither.

- **(a)** A label that already ends in whitespace, such as Joel's own `🧠 `, `🤔 ` and `🔋 ` and the
  default `Thinking: `: does it render exactly as written, or does it get another gap added? Michael
  would render it as written. Joel's configuration file and every existing test and scenario that writes
  a trailing space depend on the answer. Whether a trailing control character, which collapses to a
  space (`research-eleanor.md` §3.1), counts as written whitespace belongs to the same answer.
- **(b)** May a label still sit flush against its content, for example `[` or `(` directly against the
  value, or is that ability given up? The ruling as quoted removes it and names no way out. Michael
  would give it up with no opt-out. Either answer is a consequence the spec and notes must state.

The delta states every requirement that holds under any answer to (a) and (b) and marks, in comments,
where each answer will bind. The comments come out when Joel rules.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `statusline`:
  - **MODIFIED** "An instrument's label is placed in front of its format": the label is no longer
    only literal text rendered as written, so it names the gap, and its scenarios are restated where the
    gap changes them: "A label in front of a configured format" (`spec.md:942-945`), "An empty format leaves
    the label alone" (`spec.md:957-960`) and "The label takes width from a bar" (`spec.md:978-982`).
  - **MODIFIED** "The thinking instrument": the scenario "A configured label" (`spec.md:329-332`, `🤔`
    then the capitalized level) gains the gap, and the default's rendered text is pinned to
    `Thinking: High`.
  - **ADDED** "A label is separated from the content it precedes": the gap's presence and absence
    conditions, its width and its interaction with `$bar`, the unknown datum, clipping and the one-line
    guarantee.
  - "$bar takes the width the rest of the format leaves" is not modified: its text already counts the
    label as part of "the rest" and the new requirement's scenario pins the gap's column.

## Impact

- **Specs:** `openspec/specs/statusline/spec.md`, the requirements above.
- **Code:** the label's binding and the format language's width arithmetic are where Eleanor found the
  label handled (`research-eleanor.md` §3.1); the design chooses the place.
- **Tests:** every test with a label and no trailing space flips (`tests/configuration.test.ts:280, 535,
  557, 577`); every test with a trailing space (`tests/configuration.test.ts:496-605`,
  `tests/jefferson.test.ts:433-441`, `tests/instrument.test.ts:58-59`) is correct or wrong according to
  answer (a) (`research-eleanor.md` §5, `michael-orientation.md` §2).
- **Documentation:** `README.md:70-86` describes labels without the gap; that is the docs pass, not a
  task.
- **Host limit, not scope:** some terminals draw an emoji two cells wide while measuring it one, and the
  next cell is overdrawn (`research-chidi.md` Q4, S7). `visibleWidth` measures the three emoji in Joel's
  configuration at 2 columns under the pinned pi-tui (`michael-orientation.md` §2), so the gap he
  describes is a missing space and not a width mismatch.
- **Alternative declined by the ruling:** change nothing, because users already get the gap by writing the
  space (`michael-orientation.md` §4). Joel's ruling picks the change.
- **Joel's configuration:** `~/.pi/agent/pi-jefferson.json` is not edited; any check uses a scratch agent
  directory.
