# Design

## Context

`proposal.md` has the motivation and the constraints, each with its source. This section holds only
what the mechanism needs.

"Gap" in this change means the space between an instrument's label and its content. It is not the row's
own `gap: 0` between cells (`research-eleanor.md` §3.1, `row-renderer.ts:13`; ADR 0002).

**What the label's path does today**, all of it from `research-eleanor.md` §3:

- `readInstruments` stores the label verbatim. It checks only that it is a string; it neither trims nor
  collapses (§3.1, `configuration.ts:95-106`).
- The binder, `visuals/instrument-binding.ts:23-25`, collapses the label once, resolves it (configured, else
  the declaration's `defaultLabel`, else `""`) and prepends it as one leading literal segment. It never goes
  through `parseFormat`. `collapse` turns every C0 and C1 control character into one space
  (`format.ts:40-42`) and trims nothing.
- The binder gets its format segments from `parseFormat` on both paths: `configuration.ts:90` for a
  configured instrument, `instrument-binding.ts:21` for an unconfigured one. A `parseFormat` result is the
  only way segments reach the binder (`research-eleanor.md` addendum 1 §3).
- `resolveFormat` returns `""` before styling any segment when a declared variable is unknown (`format.ts:183-187`),
  sums `visibleWidth` over every non-bar piece, the label's included, to size `$bar` (`:195-197`), and styles
  the label segment with the instrument's `style` (`:206-210`). `cellView` clips the whole line and pads from
  the clipped width (`row-renderer.ts:35-36`).
- No step trims, appends or inserts a space (§3.4). The only gap a user gets is one they typed, as in the
  default `Thinking: ` (`instrument.ts:63`).

**Binding constraints**, each with its source (restated from `proposal.md` only where a decision below
leans on it):

- The gap is required, takes no option, and a label can no longer sit flush (`owner-rulings.md`, 2026-11-07).
- Whitespace at the front and back of a label and of a format is removed; a label that already ends in a
  space renders with one gap (`owner-rulings.md`, 2026-11-07).
- A label configured as `""` replaces the instrument's default label with no label, and no gap renders
  (`owner-rulings.md`, 2026-11-07, "An explicit empty label is still acceptable").
- The default label renders `Thinking: High` (archived `2026-11-06-default-thinking-instrument`
  owner-rulings, "Default composition"; living spec).
- One guard and one styling path: the archived design's D3 chose the label as a leading literal segment over
  a seam after `resolveFormat` and over a `label` parameter into it.
- The layout: `visuals/` imports only itself and the types of `data/`, and neither imports startup, footer
  setup or configuration (ADR 0005). The binder and the format language are both in `visuals/`
  (`research-eleanor.md` §2).
- The gap is one column: Joel's "miniscual quantity of gap" is the smallest quantity a terminal can draw
  (`owner-rulings.md`, 2026-11-07), and a space measures one column (`research-chidi.md` Q3).
- Widths are columns (`AGENTS.md:35`; `research-chidi.md` Q3: a space is a width-1 grapheme under
  `visibleWidth` and `truncateToWidth`).

## Goals / Non-Goals

**Goals:**

- A label with a non-empty trimmed format always renders with one gap before its content, on every
  instrument, with no configuration (`owner-rulings.md`, 2026-11-07).
- Outer whitespace in a label and in a format is removed, so the gap is the one separator.
- No second guard, no second layout path, and no new arithmetic in `$bar`.
- Every requirement in the delta `specs/statusline/spec.md` has a mechanism below; the mapping is in
  "What each requirement rests on".

**Non-Goals:**

- A gap option, a gap-width setting, an opt-out for a flush label and a per-instrument separator. Joel ruled
  none is added (`owner-rulings.md`, 2026-11-07; *"Don't invent what we don't have to"*, 2026-11-03).
- Cell grouping, new instruments and thresholds on the context instrument. Separate cards
  (`owner-rulings.md`, 2026-11-06).
- The rider commits on this branch (`owner-rulings.md`, 2026-11-06).
- Any edit to `~/.pi/agent/pi-jefferson.json` (`owner-rulings.md`, 2026-11-06).
- Chasing a terminal that draws an emoji two cells wide while counting one (`research-chidi.md` Q4; a host
  limit, documented and not scope).
- A `$label` variable or any syntax in a label (ADR 0003; living label requirement).
- Default labels on the other shipped instruments (his examples: `Thinking:`, `Context:`, `Path:`). Ruled out
  of scope: it changes what every default cell shows and is its own card (`owner-rulings.md`, 2026-11-07,
  "Default labels for the shipped instruments are not this change"). `thinking` stays the only declaration
  with a `defaultLabel`.
- A trim of what a variable *substitutes*. Only the text a user wrote in a format and a label is trimmed.

## Decisions

### D1. The gap is one trailing space in the label's leading literal segment, decided in the binder at binding time

The binder (`instrument-binding.ts`, in `visuals/`) already builds the label's segment. It gives that
segment the label's text plus one space when a gap is due, and prepends it as it does today. Nothing
else in the pipeline learns about the gap. The shape, to show the order and not to dictate the code:

```ts
const label = collapse(entry?.label ?? declaration.defaultLabel ?? "").trim();
const segments = entry?.segments ?? parseFormat(declaration, declaration.defaultFormat); // already trimmed (D3)
const gap = label !== "" && segments.length > 0 ? " " : "";
const labelled = label === ""
  ? segments
  : [{ kind: "literal", text: label + gap, modifiers: [] }, ...segments];
```

What this keeps with no code of its own, each from the archived design's D3 and `research-eleanor.md` §3:

- **`$bar` counts the gap.** The gap is a character in piece 0 of `pieces`, so `nonBar` sums its column with
  the label's (`format.ts:195-197`). `resolveFormat` is not edited.
- **The unknown-datum rule returns an empty cell.** The guard returns `""` before any segment is styled
  (`format.ts:183-187`), so a lone gap cannot appear in an unknown cell. The guard reads every declared
  variable and not the segments, so a format trimmed to nothing does not shield an unknown datum.
- **The gap takes the label's style.** The label segment takes the instrument's `style` verbatim
  (`format.ts:206-210`), and the gap is inside it, so no unstyled column lies between two styled pieces.
  The cell's pad-reset guard covers only the cell's trailing pad (`row-renderer.ts:16-18, 40`;
  `AGENTS.md` pad-reset trap), and this design does not ask it to cover an inner gap.
- **The row stays one line.** A space is one column and no line break; the cell's clip and pad are unchanged
  (`row-renderer.ts:35-36`).
- **A narrow cell clips the gap with the rest.** `truncateToWidth` treats a space as an ordinary width-1
  grapheme and the cell has no truncation rule of its own (`research-chidi.md` Q3).

*Beat:*

- **A gap added after `resolveFormat` returns, or as a separate piece.** `$bar` overflows by one column
  because the arithmetic never saw the gap (`michael-orientation.md` §2, "Placement and `$bar`"). It also
  needs a second test for "is there content", which is a second guard.
- **A `label` parameter into `resolveFormat`.** The archived D3 beat it: it changes the function's
  contract and every call site. This change has no reason to reopen that.
- **The gap added by the cell, in `row-renderer.ts`.** The cell sees only finished text, so it cannot tell
  "label, then empty content" from "label and content". It would also give the cell a second reason to change.
- **A separate gap segment with its own style.** It adds a noun the label's segment already supplies.

### D2. Order: collapse, then trim, then gap

1. `collapse` runs first, on the raw label, once, as today (`format.ts:40-42`; archived D2). A control
   character at an edge becomes a space.
2. `trim` removes whitespace at both edges of the collapsed label. A label that already ends in a space,
   or ended in a control character, now ends in nothing.
3. The gap is decided last, from the two trimmed results.

The order is chosen because each step needs the one before it. Trim before collapse would leave a trailing
control character that collapse then turns into a space, and the gap would double it. This is observable:
`"🧠\u0085"` ends in a C1 character that `collapse` replaces (`format.ts:40-42`) and that ECMAScript does not list as
whitespace (from the language specification, not measured here; the first test run settles it), so trimming first keeps it, collapsing then makes a space,
and the gap makes a second one. A newline or tab would not catch this order, because a native trim strips
those too, so the test uses U+0085. A gap decided before the trim would count a space the trim removes.

Collapsing once, at binding, is the archived D2 and stays.

*Beat:* trimming in `readInstruments` (it would trim a label before collapse, wrong order for U+0085, and it
sits outside `visuals/` where the label's other handling lives); trimming per render (the label cannot change
between renders, and the binder memoizes per instrument name, `research-eleanor.md` §3.1).

### D3. A format's outer whitespace is trimmed in `parseFormat`, once, on the segment list

The trim is the last step of `parseFormat` in `visuals/format.ts`. It works on the segments the function
has just built, whose literal text `parseFormat` has already collapsed (`format.ts:54, :99`), so "after
collapse" holds without a second collapse. From the front, then from the back: while the edge segment is a
literal with no modifiers, remove the whitespace from its edge; if that leaves it empty, drop it and look at
the next segment; stop at the first variable or at text that remains.

Why this is enough, from `research-eleanor.md` addendum 1 §4:

- `parseFormat` never emits an empty-text literal, so after the trim the list is empty exactly when the
  format holds no variable and no non-whitespace text. That is the fact the gap condition reads (D4).
- It can emit two adjacent literals, a whitespace-bearing prefix and a modifier run (`format.ts:105-106`).
  The prefix carries no modifier and the loop handles it. A modifier-carrying literal is exactly
  `/\S+$/` and cannot hold edge whitespace (`format.ts:100, :106`; ADR 0003:33), so the loop never edits a
  modified literal. A format `  hello|dim` loses its prefix and keeps `hello`.
- Whitespace between a format's parts is untouched: `$percent $bar` keeps its space, and `"L\n$model"`
  (`tests/format.test.ts:145`) keeps its inner space.

This is one place for both producers of segments (`configuration.ts:90` and `instrument-binding.ts:21`), so a
configured format and a default format get the same rule. The living requirement "An instrument's format is
plain text and variables" is where the rule is stated, and the file that parses a format is where it is
enforced. The label's rules (D1, D2) stay in the binder, which is where the label is built. Each file has one
answer to "what would change this?": the format language for what a format means, the binder for how a label
and a format are put together.

*Beat:*

- **Trimming in the binder.** The binder also gets segments from `parseFormat`, so it would work for both
  producers. It would put a rule about the format's own text in a file that does not parse the format, and
  `parseFormat` would hand out segments that mean something different from the document.
- **Trimming in `readInstruments` (`configuration.ts:90`).** It misses the default format
  (`instrument-binding.ts:21`), and `configuration.ts` sits outside `visuals/` (ADR 0005).
- **Trimming the format string before parsing.** The string has not been collapsed, so a trailing C1 character
  would survive, and the gap condition would read a string and not the parsed segments it is about to build.
- **Trimming the rendered text.** It would also trim a variable's value, which Joel did not ask for
  (`owner-rulings.md`, 2026-11-07: "labels and format"), and it runs after `$bar` is sized.

### D4. What decides the gap: a non-empty trimmed label and a non-empty trimmed format, read from the artifact

`label !== ""` after D2, and `segments.length > 0` after D3. Both are the binder reading the thing it is about
to build, not a value computed earlier. The condition is a fact of the document, known at binding, and does not
depend on what the format renders (`council.md`, "Accepted & Rejected Feedback"; the council's note that a
runtime test would be circular when `$bar` gets zero columns in a narrow cell).

*Beat:* "content will follow", tested at render. It needs the rendered text before the segment that holds the
gap is built, and it makes `$bar`'s width depend on its own output (`council.md`).

### D5. `defaultLabel` drops its trailing space: `Thinking:`

The declaration changes from `"Thinking: "` to `"Thinking:"` (`instrument.ts:63`). The cell renders
`Thinking: High` as before: a configured `""` still wins over it (`entry?.label ?? declaration.defaultLabel`, `research-eleanor.md` §3.1: `""` is a legal label that removes the default), and the binder trims the declared string either way, and the gap supplies the one
space.

Reasons for dropping it:

- A declared trailing space would sit in the declaration as a character no code reads. A reader six months
  on would take it for load-bearing, and the trim would be the only thing keeping it from doubling.
- Joel's ruling that outer whitespace "really shouldn't be needed if we have sensible defaults"
  (`owner-rulings.md`, 2026-11-07) is a statement about defaults too.
- It is allowed because the rendered text is unchanged (`michael-orientation.md` §1: changing the declared
  string is allowed only if `Thinking: High` renders identically). The text Joel quoted is the rendered one,
  and it is pinned by `tests/jefferson.test.ts:433-441` and the living scenario "The default thinking label
  keeps its text".

*Beat:* leaving `"Thinking: "` in place. It renders identically and needs no test edit, and I rejected it for
the dead character. If Joel would rather the declaration keep his quoted string, this is a one-line revert
and nothing else moves.

### D6. Whitespace means JavaScript's `\s`, through the platform's `trim`, with no new dependency

The label's trim is `String.prototype.trim`, and the format's trim is `trimStart` and `trimEnd` on a literal's text.
ECMAScript defines trim's set and `\s` as the same set (WhiteSpace and LineTerminator), stated here from the
language specification and not measured. The language-level fact that matters is `research-eleanor.md`
addendum 1 §4: `\s` includes NBSP (`tests/format.test.ts:311`), and the modifier run uses `\S`, so the
format language already has one definition of whitespace and the trim uses the same one. A label or format
edged with NBSP is trimmed like a space.

ADR 0004 records that string mutations a format performs, the modifiers, come from `lodash-es`; its decision
names three case functions and a failure specific to the CommonJS `lodash` named import (named imports from
`lodash-es` work under both loaders; the CommonJS `lodash` named import passes `tsc` and fails the suite). A
platform method is not a library the ADR was written against, so no import is added and the ADR's risk does
not arise. Whether the ADR covers a trim was Open Question 2, now closed: it does not.

*Beat:* `trim`, `trimStart` and `trimEnd` from `lodash-es`. It would be the ADR's letter, and costs three
imports and a measurement I have not run; the platform's own method does the same job with no dependency.

### D7. Existing tests: which assertions change, and why none is reshaped to pass

The inventory is `research-eleanor.md` §5 and addendum 1 §1 and §5. I classified each from her descriptions and
not from the tests; the run confirms it. The rule that decides any one of them is D1 to D4, which is Joel's
ruling and not a reading of the test.

**Unchanged: the label already ends in a space and content follows, so trim then one gap renders the same text.**
These pass without an edit and now also prove the trim: `tests/configuration.test.ts` :272-277 (the default
thinking cell), :494-498 (every shipped instrument accepts a string label), :510-521 (`🧠 `, `ctx `, no label,
`label: ""`), :523-532 (unknown datum, then known), :542-549 (`$level `, `a\$b `), :551-554 (`A\nB\u0085C `),
:561-568 (`Q: `), :602-605 (`Q: ` beside `[$level]`) and `tests/jefferson.test.ts:428-441`
(`Thinking: High`, `Thinking: Low`, `Thinking: Xhigh`). The label inputs in them stay as written: their
trailing space is the legacy input this change must keep rendering with one gap.

**Unchanged for a different reason: no gap is due.** `tests/configuration.test.ts:284-285` ("an empty label
removes the default": `thinking` with `label: ""` renders the styled level alone, which is Joel's ruling that an
explicit `""` replaces the default with nothing), `tests/configuration.test.ts:534-539` (label `🤔` with
format `""` renders `🤔`; label `""` with format `""` renders `""`) and :719-722 hold under D4, since the
format is empty. They are the guards for "no gap when no content follows."

**Same string, new source.** `tests/configuration.test.ts:557-558`: label `"T\tB\r"` and format `$level`
expects `"T B "` plus the styled level. Collapse makes `T B `, the trim makes `T B`, the gap restores the
space. The expectation does not move and the test now proves the order in D2.

**Flips, each because a label with no trailing space now has its gap:**

- `tests/configuration.test.ts:279-282` ("a configured label replaces the default label"): label `🤔`, default
  format. The expectation `"🤔"` followed by the styled `High` gains one space between them. Joel's objective
  (`owner-rulings.md`, 2026-11-06) and the modified scenario "A configured label". Its second case (:284-285,
  `label: ""`) does not change.
- `tests/configuration.test.ts:577-578` ("a label as wide as the cell leaves the bar nothing"): label of 20
  `x`, format `$bar`, render width 20, expects `"x".repeat(20)`. The label and its gap are now 21 columns and
  the bar still gets 0, so `render` returns `"x".repeat(20)` plus one space, and the cell's clip, not `render`,
  brings it to 20 (`row-renderer.ts:35`). The property the test names (the bar gets nothing) is
  preserved; the string moves by the one column Joel ruled. This is the sibling of the `$bar` boundary test below.
- `tests/instrument.test.ts:58-59`: `defaultLabel` for `thinking` becomes `"Thinking:"` by D5. The test pins
  a declared string, and the declared string is the decision.

**One test measured, and it does not flip:** `tests/format.test.ts:137-140` parses `L${controls}R`, so the
control characters are internal to the format, not at an edge, and D3 does not touch them. The test passes on
Michael's scratch copy (his gate run `58e3125c-6ea3-4141-aed4-d6fbc6c46d95`, round 1; confirmed in round 2,
`49dfd3c9-f29a-450a-840a-e88e046b4323`). This was Open Question 1.

The new tests, which separate the right answer from the wrong:

| Guard | What it refuses | What makes it fire | Test (input → expected) | Right vs wrong |
| --- | --- | --- | --- | --- |
| Gap present (D1, D4) | a label flush against content | trimmed label and trimmed format both non-empty | label `🧠`, format `$model` → `🧠 ` + model id; and `🤔`, default format | no gap renders `🧠claude-opus-4` |
| `$bar` width (D1) | a bar one column too wide | the gap is in piece 0 | label `ab`, format `$percent $bar`, cell 20, rest takes 6 → bar 11 columns, line exactly 20 | gap outside the segment gives a 12-column bar and a 21-column line |
| Style (D1) | an unstyled hole under `bg`/underline | the gap is in the styled label segment | label `Q`, format `$percent`, style `{"bg":"selectedBg"}` then `{"underline":true}` → `Q ` is one styled run, built with the fake theme's own styling | an unstyled gap yields `style("Q")` + `" "` + `style(...)`, a different string |
| Label trim (D2) | a doubled gap | collapsed label ends in whitespace | label `🧠 `, ` 🧠 `, `🧠\n`, `🧠\u0085`, `🧠\u00a0` → each `🧠 ` + model id | no trim gives two columns; trim-before-collapse leaves two for `\u0085` |
| Format trim (D3) | edge space in a format | an unmodified literal at an edge | format `  $model  ` → `claude-opus-4`; format ending in `\n` → one line, no trailing space; `$percent $bar` keeps its inner space; in `parseFormat`, `  hello|dim` → `hello` carrying `dim` | no trim renders `  claude-opus-4  `; trimming inside renders `$percent$bar` |
| Whitespace-only format (D3, D4) | a trailing gap after a label with nothing to follow | trimmed format has no segments | label `🤔`, format `"   "` → `🤔` | the gap renders `🤔 ` |
| Known datum, empty format (D4) | the same | `segments.length === 0` | label `🤔`, format `""`, datum known → `🤔` (existing :535) | the gap renders `🤔 ` |
| Empty or whitespace-only label (D4) | a leading gap | `label === ""` after the trim | label `"  "`, format `$model` → model id with no leading space; `thinking` with label `""` and the default format → the styled level alone, no `Thinking:` and no gap (existing :284-285) | a gap-first rule renders ` claude-opus-4` or ` High` |
| Unknown datum (existing guard, D1) | a lone gap or label | any declared variable unknown | label `🤔`, formats `$level` and `""`, level unknown → `render` returns `""` (existing :523-532) | a gap added after the guard returns `" "` |
| Trailing control character in a label | two gaps | D2's order | the `\u0085` row above | see above |
| Default label (D5) | the default's text changing | `defaultLabel` trimmed, gap added | thinking default, level `high` → `Thinking: High` (existing :272-277, jefferson :433-441) | an untrimmed default plus a gap renders `Thinking:  High` |
| One line (D1) | a line break from the gap | a newline in the label | label with a newline and a C1 character plus the gap → one line | n/a: the existing scenario holds, a space is no line break |
| Joel's labels | a doubled gap from his own file | trim of `🧠 `, `🤔 `, `🔋 ` | a test builds a scratch agent directory carrying his three labels and renders the three cells | no trim shows two gaps; edits to his file are not made |

Each guard has a mutation that turns its test red: drop the trim, drop the gap, move the gap after
`resolveFormat`, drop the `segments.length > 0` condition, unstyle the gap, swap D2's order, and remove D3's
edge loop. The implementation gate re-runs them.

### D8. No flag, no log line and no new option

The gap is a pure function of the document, so a log line would say nothing a test does not. The rollback is
reverting the commit, and no flag exists because Joel ruled there is no option (`owner-rulings.md`, 2026-11-07).
Verification is the tests above and Joel's own observation in his live session (a task marked his, never ticked
by the writer).

## What each requirement rests on

| Requirement in the delta | Satisfied by |
| --- | --- |
| Label: trim, gap's presence, absence, width, style, `$bar`, one line, clip | D1 to D4 |
| Label scenarios (ends in a space, ends in a control character, whitespace-only format, default text, bg/underline, bar, narrow cell) | D1, D2, D4, D5 and the table in D7 |
| Format: outer whitespace removed, inner whitespace kept, control character at an edge | D3 |
| Thinking instrument: default renders `Thinking: High`; configured `🤔` gets the gap | D1, D5 |
| Label: a configured label that is empty, or empty after the trim, replaces the default with no label and no gap | D4 (`label === ""` after D2); `owner-rulings.md` 2026-11-07, "An explicit empty label is still acceptable"; existing test `tests/configuration.test.ts:284-285` |
| `$bar` (living, not modified) | D1: no edit to `resolveFormat` |

## Risks / Trade-offs

- **[A flush label is gone, and so is a format with edge space]** → This is what Joel ruled and what the
  change takes away (`owner-rulings.md`, 2026-11-07). No shim; breaks are cheap before 1.0 (inherited ruling).
  Nothing here restores either.
- **[A known variable that renders empty leaves a trailing gap]** → The condition is the format being non-empty,
  not what it renders (D4, `council.md`). The trailing space is padding the cell adds anyway and shows only
  under a `bg` or underline style. There is one such case: `path` uses `basename(cwd)`, and `basename("/")` is `""`, so on a
  scratch copy a label `P` with cwd `/` renders `P ` with a trailing gap (Michael's gate run
  `58e3125c-6ea3-4141-aed4-d6fbc6c46d95`). The consequence holds, so D4 stands.
- **[A label wider than its cell]** → The gap is the one column that can tip a label exactly as wide as the
  cell into a clip (the :577 case). A cell clips as any text does (`research-chidi.md` Q3), and the ellipsis
  `truncateToWidth` adds on overflow can replace the gap. No rule of its own is added.
- **[Terminals that draw an emoji wide and count it narrow]** → The one-column gap can be overdrawn
  (`research-chidi.md` Q4, S7). `visibleWidth` measures Joel's three emoji at 2 columns under the pinned
  pi-tui (`michael-orientation.md` §2), so what he sees is a missing space. A host limit, documented, not chased.
- **[`\s` trims more than the ASCII space]** → NBSP and the other whitespace in the set are trimmed from a
  label's and a format's edges (D6). The format language already treats that set as whitespace
  (`format.ts:100`), so there is one definition.
- **[The default label's declared string changes]** → Rendered text is identical and pinned (D5); the
  revert is one line.

## Migration Plan

- Every document and test that relied on a trailing or leading space in a label or format changes, with no
  shim. The tests are D7.
- **Joel's `~/.pi/agent/pi-jefferson.json` is never edited by any task.** His labels `🧠 `, `🤔 `, `🔋 `
  (`michael-orientation.md` §1) keep rendering with one gap, shown by the scratch-agent-directory test in D7
  and by his live observation, which is his task.
- **Documents this change makes false**, for the docs pass (not tasks):
  - `README.md:70-73`, which describes the label as literal text with no gap or trim; `:79`, which states the
    default `Thinking: ` with its trailing space; `:84-86`, the upgrade note about `Thinking: `
    (`research-eleanor.md` §6).
  - `ARCHITECTURE.md`'s Instrument paragraph, which says binding collapses the label once and hands it over as
    a leading literal segment (`research-eleanor.md` §1). It gains the trim and the gap, and the format's trim.
  - The living `openspec/specs/statusline/spec.md`, brought in line by the delta at sync, not the docs pass.
  - No ADR states anything about a label (`research-eleanor.md` §1); ADR 0003:33 is unchanged. Whether the
    placement of the gap earns an ADR is the docs pass's call under the `architecture-docs` test.
  - Archived changes are not edited.
- Rollback is reverting the commit; there is no stored state.

## Open Questions

1. **Closed.** Does `tests/format.test.ts:137-140` flip under D3? No. It parses `L${controls}R`, so the control
   characters are internal, not at an edge, and the test passes on Michael's scratch copy (his gate runs
   `58e3125c-6ea3-4141-aed4-d6fbc6c46d95`, round 1, and `49dfd3c9-f29a-450a-840a-e88e046b4323`, round 2). No
   assertion changes; D7 records the measured result.
2. **Closed.** Does ADR 0004's title ("String mutations come from `lodash-es`") cover a trim? No. Its Decision
   names three case functions, and `collapse` (`format.ts:40-42`) is already a native string operation inside the
   format language, so the ADR is scoped to modifiers and D6 stands (Michael's gate runs
   `58e3125c-6ea3-4141-aed4-d6fbc6c46d95` and `49dfd3c9-f29a-450a-840a-e88e046b4323`).
3. **Closed.** Does dropping the declared trailing space from `Thinking: ` need Joel's word? No. Joel's
   2026-11-07 trim ruling (`owner-rulings.md`) is newer than the 2026-11-06 quote and makes the declared trailing
   space a character nothing reads. The rendered `Thinking: High` is unchanged, so D5 stands without Joel
   (Michael's gate runs `58e3125c-6ea3-4141-aed4-d6fbc6c46d95` and `49dfd3c9-f29a-450a-840a-e88e046b4323`).
4. **Closed.** The amended spec carries the requirement sentence and the scenario "An empty label replaces
   the default label" for a label configured as `""` (Joel, `owner-rulings.md` 2026-11-07, "An explicit empty
   label is still acceptable"; existing test `tests/configuration.test.ts:284-285`).
5. **Closed.** Yes: `path` at cwd `/` renders `basename("/")`, which is `""`, for a known datum. It shows
   the risk above and does not change D4 (Michael's gate run `58e3125c-6ea3-4141-aed4-d6fbc6c46d95`).
