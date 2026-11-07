# Michael — orientation consult (not a gate)

Retained run `dfb5cfa4-63b3-4940-9b31-e9f7ae20fb15`, 2026-11-06, written after research landed. A consult records no verdict.

## Answer

Read-only orientation. I read: owner-rulings.md (label-gap); AGENTS.md; ARCHITECTURE.md; ADRs 0001–0005; openspec/specs/statusline/spec.md; the archived 2026-11-06-default-thinking-instrument rulings, design and spec delta; and the current code (visuals/instrument-binding.ts, visuals/instrument.ts, row-renderer.ts, format.ts:196), tests/, README.md:70-86, and Joel's ~/.pi/agent/pi-jefferson.json, which I only read.

1. DECISIONS ON RECORD THAT THE GAP MUST MEET OR NAME AS REVISED
- Scope is this one card. A label written with no trailing space renders with a gap before the content. Cell grouping, new instruments and context thresholds are separate changes. The three rider commits ride along and are not scope. (label-gap/owner-rulings.md, 2026-11-06)
- "Don't invent what we don't have to" (2026-11-03, inherited). Adding a gap option, a gap width setting or a per-instrument separator needs a requirement behind it.
- The label is a foundational option on every instrument, always in front of the format, and is never a variable. (archived owner-rulings "Label option"; living spec "An instrument's label is placed in front of its format", spec.md:934.) So the gap applies to every instrument, not only `thinking`. It must not open a way for `$` or a `$label` to mean anything inside a label.
- The label is "literal text" in the instrument's style (spec.md:936-940). A gap the user did not write changes what that sentence promises, so it has to come in as a MODIFIED requirement and not as an addition beside it. Whether the gap takes the label's style is still undecided. Today a written trailing space is a literal and is styled like one (archived design D3/D4).
- Scenarios that will change or become ambiguous, which the delta must restate:
  - spec.md:331-332, `🤔` plus capitalized level. Today that renders `🤔High`.
  - spec.md:957-960, label `🤔` with `format: ""` renders `🤔` "and nothing after it". A gap there would be a trailing pad and breaks this scenario.
  - spec.md:978-982, the bar scenario uses `ab ` (3 columns) and expects 11.
  - spec.md:944, `🧠 `.
- The default label is `Thinking: ` with its own trailing space. That literal is Joel's quoted ruling (archived owner-rulings "Default composition"; spec.md:314; instrument.ts:63). Changing the declared string to `Thinking:` is allowed only if the rendered `Thinking: High` stays identical. Otherwise it revises his ruling.
- The unknown datum rule: when a datum is unknown the whole cell renders nothing, label included. Empty format and unknown are separate inputs. (Living spec, label requirement; archived D3 case table.) The gap must never appear in an unknown cell, and must not appear in a label-only cell under the current scenario.
- `$bar` takes the columns the rest of the format leaves (spec.md:748, "$bar takes the width the rest of the format leaves"). Archived D3 made the label a leading literal segment so its width reaches the `nonBar` sum (format.ts:196) with no code of its own.
- Mechanism decisions that bind until a design names and revises them:
  - The label is collapsed once, at binding (D2).
  - The label is one leading literal segment built in `instrumentBindings` (instrument-binding.ts:23-25).
  - `resolveFormat`'s signature does not move, and there is one guard and one styling path (archived D3).
- A row is one line whatever a format contains, and that guarantee belongs to the cell (2026-11-05). Columns, never characters (AGENTS.md; ARCHITECTURE "Widths are columns").
- Joel's config file is never edited by a task. Checks use a scratch agent dir (2026-11-06).
- Breaking changes are cheap before 1.0, with no shim (inherited ruling).
- No ADR covers labels. ADR 0003 (`$` and `|` special) is untouched provided the gap is not syntax.

2. TRAPS
- **Placement and `$bar`.** If the gap is added anywhere except inside the label's literal segment, `$bar` overflows by one column. For example, Joel's `context` is `🔋` plus `$bar $percent`. That happens if the gap is added after `resolveFormat` returns, or as a separate piece the `nonBar` sum does not count. Putting it in the label segment gets the arithmetic for free. A test must use a label without a trailing space next to `$bar`, so the right and wrong answers differ by one column.
- **The unknown guard and the empty cell.** A gap added after the guard, or added unconditionally, can produce a lone space in an unknown cell. It can also leave a trailing space after a label-only cell, which contradicts spec.md:960. And the gap rule says "before the content": when a known datum's format renders empty, there is no content to put a gap in front of.
- **Pad needs a reset.** Under an underline or `bg` style, a styled gap paints. An unstyled gap between two styled pieces needs the reset discipline. leavesStyleOpen (row-renderer.ts:16-17, 40) guards only the cell's trailing pad, not an internal gap. So whether the gap is styled is a real decision, and its test must use a `bg` or underline style so the two answers differ.
- **Width.** A gap of one column measured by `visibleWidth` is fine. The check for whether a label already ends in a space has to run on the collapsed label. collapse turns `\t`, `\r`, `\n` and C1 characters into a space, so `"T\tB\r"` (configuration.test.ts:557) already ends in a space after collapse. Emoji widths: `🤔`, `🧠` and `🔋` measure 2 under the pinned pi-tui (I ran it), so the problem Joel describes is a missing space and not a width mismatch. A narrow cell still clips the label, the gap and the content together. truncateToWidth may leave the gap as the last visible column, which is acceptable but should be stated.
- **Existing data with a trailing space** (search: `rg 'label: ...' tests`, plus the config file):
  - Joel's own config: `🧠 `, `🤔 `, `🔋 `.
  - The default `Thinking: `.
  - configuration.test.ts:496, 511, 514, 526, 530, 543, 546, 552, 563, 566, 572, 603.
  - jefferson.test.ts:433-441, `Thinking: High`.
  - Tests with labels that have no trailing space, which this change flips: configuration.test.ts:280, 535, 557, 577 (the 20-x label filling the cell).
  - If a written trailing space still gets a gap, all of those turn into double spaces, including Joel's footer, which no task may edit.
- README.md:70-86 describes labels without the gap. That is for Bambadjan's docs pass and is not a task.

3. NEEDS JOEL BEFORE DESIGN: one user-facing contract.
- **(a) A label that already ends in whitespace.** Does it render as written, with no second gap, or does it always get one more? His own config and every existing test depend on the answer.
- **(b) Is a label flush against its content still possible?** For example `[` or `(` placed right against the content. The ruling as quoted removes that ability and names no way out, and adding one would be inventing.
- **What I would choose:** a gap of one column only when the collapsed label is non-empty and its last character is not whitespace. No opt-out. A flush label is given up, and the spec and the change's notes say so as a consequence.
- **Why:** his "I have to use spaces" makes the space redundant rather than doubled. His untouchable config keeps rendering exactly as it does now, and nothing new is invented.
- **For design to settle under that rule, not Joel:** gap styling, the label-only cell, the empty content cell, and whether `defaultLabel` drops its space.

4. STRONGEST CHALLENGE
The change turns "the label is literal text, rendered as written" into "the label is text plus a separator the renderer decides". That retires a contract the previous change pinned in several scenarios. It also costs the one thing literal labels allowed: content placed flush against the label.

The cheaper alternative is to change nothing in the mechanism. Users already get the gap by writing the space. Joel's complaint is ergonomic, and his config proves the workaround works.

The owner ruling picks the change over that alternative, so the challenge does not block it. But the change is only worth its cost if the rule is the narrow, idempotent one in item 3. A gap added unconditionally, or added after `resolveFormat` returns, would break the `$bar`, unknown datum and label-only rules at once. That is a second guard and a second layout path, which is exactly what archived D3 decided against.

Not covered: research has not landed, so I checked no prior art and no host facts. I did not run the test suite. Every claim above is from source and spec I read, plus the one `visibleWidth` measurement.

## Decided by

Item 1: label-gap/owner-rulings.md 2026-11-06 (objective, scope, inherited rulings); archived 2026-11-06-default-thinking-instrument owner-rulings ("Default composition", "Label option") and design D2-D4; living openspec/specs/statusline/spec.md (label requirement at :934, thinking at :314-332, $bar at :748); AGENTS.md / ARCHITECTURE.md (pad reset, columns). Item 3: no decision covers labels that already end in a space or flush labels, so that is Joel's.

## Owner

joel

## Follow-up

Question for Joel. (a) Should a label you already wrote with a trailing space, like your `🤔 `, `🧠 ` and `🔋 `, render exactly as now, or get another space added? (b) Is it fine that a label can no longer sit flush against its content? Michael recommends: add one space only when the label does not already end in whitespace, and accept losing flush labels with no opt-out.
