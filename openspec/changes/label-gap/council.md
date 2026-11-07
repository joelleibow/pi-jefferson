# Council Synthesis

## Question and Scope

What design should the label gap take, and are `proposal.md` and the delta spec the right basis for it? Three parts: where the gap should live so that `$bar` sizing, the unknown-datum rule and the one-line guarantee keep holding without a second guard or layout path; what the two open owner decisions cost and which the evidence favors; and what must change in the proposal or spec before `design.md` is drafted.

Evidence the advisors were handed: `owner-rulings.md` (as it stood at 2026-11-06), `proposal.md`, `specs/statusline/spec.md`, `research-chidi.md`, `research-eleanor.md`, `michael-orientation.md`, and the "The design gate (PL4)" section of `michael-the-architect.md`. Neither advisor read the repository and neither requested an addendum.

**Two rulings landed while Pass 1 ran** and are binding on this memo (`owner-rulings.md`, 2026-11-07): the gap is required, with no option, setting or opt-out, so a label can no longer sit flush against its content; and whitespace at the front or back of a label and of a format is removed, so a label that already ends in a space renders with one gap, not two. Both advisors answered the owner decisions before these rulings existed. The rulings settle those two decisions, so where an advisor's recommendation about them differs from a ruling, the ruling stands.

## Perspectives & Trade-offs

**Agreement (both advisors, and Michael's orientation).**

- **The gap lives inside the label's existing leading literal segment, decided at binding time in the instrument binder, after the one control-character collapse.** That is the one placement that keeps every invariant with no new code of its own: the segment already feeds the `$bar` width sum, so `$bar` shrinks by the gap's column; the unknown-datum guard returns empty before any segment renders, so no lone gap; a space is a one-column character, so the one-line guarantee and the cell's clip hold. A gap added after the format resolves, or as a separate piece, overflows `$bar` by a column or leaks a space into an unknown or label-only cell, which is a second guard and a second layout path.
- **No gap when no content follows.** A label with an empty format (`format: ""`) renders the label alone, with no trailing space.
- **The gap takes the label's style, because it lives in the label's segment.** An unstyled gap between two styled pieces would show as a hole under a `bg` or underline style, and the cell's pad-reset guard covers only the cell's trailing pad.
- **The default label keeps rendering `Thinking: High`.**
- **A terminal that draws `🧠`, `🤔` or `🔋` two cells wide while counting one can visually overdraw a one-column gap.** It is a host limit, documented, not chased (`research-chidi.md` Q4).

**Where they differ.** `council-argon` conditions the gap on the format being non-empty (`format !== ""`) because that is provable at binding time; `council-kimi` conditions it on "content will follow", which reads as a runtime check. Both land on the same binding-time test (the parsed format has segments), and `council-argon` shows a runtime test creates a circularity when `$bar` gets zero columns in a narrow cell.

## Synthesis & Recommendation

Draft the design with the gap **in the label's leading literal segment, at binding, after the collapse and the trim**: when the trimmed label is non-empty and the trimmed format is non-empty, the label segment carries one trailing space. Whitespace at the front and back of the label and of the format is removed (Joel's ruling), so the gap is one separator whatever a user typed, and a label that already ends in a space cannot double it. A label with an empty (or whitespace-only) format renders alone. The design says where the format's outer trim happens and proves the unknown-datum, `$bar`, label-only and style behavior with a test that separates right from wrong by one column or one styled cell.

## Accepted & Rejected Feedback

**Accepted**

- The mechanism above (both advisors; Michael's orientation, which names the same trap that an out-of-segment gap overflows `$bar` by one column).
- The gap's presence is conditioned on a non-empty format, a binding-time fact, and not on what the format renders (`council-argon`).
- Fold the new gap rule into the MODIFIED label requirement so the living spec states each fact once, and delete the duplicate ADDED requirement and its six repeated scenarios (`council-argon`, citing Michael's orientation §1 and his "One fact, one place" rule).
- Bake Joel's two rulings into the proposal and the spec, remove the OPEN markers, and add scenarios for a label that ends in a space or a collapsed control character, for a format with outer whitespace, and for a whitespace-only format (`council-argon`, updated for the trim ruling).
- Pin the gap's style: the gap takes the label's style, with a scenario under a `bg` or underline style so the answers differ (`council-argon`; `council-kimi`).
- Name the provenance of the one-column width in the spec: Joel's "miniscual quantity of gap" is the smallest quantity a terminal can draw, and a typed space measures one column (`council-kimi`; `research-chidi.md` Q3).

**Rejected or left to the design**

- `council-kimi`'s challenge that the proposal should itself say the mechanism is settled. Mechanism is the design step, the proposal stays mechanism-free, and the design argues it for Michael's gate.
- Both advisors' recommendation that a label already ending in whitespace "renders exactly as written". Joel ruled the trim, which gives the same visible result for his labels by a different rule (trim, then one gap); the rule the design states is Joel's.
- Both advisors' framing of the flush-label question as one for Joel to confirm. He ruled it.
- Where in the code the format's outer trim happens, and whether `defaultLabel` drops its trailing space. Both are design decisions with the one constraint that `Thinking: High` renders identically.

## Owner Decisions Required

None. Both open decisions were settled by Joel's 2026-11-07 rulings, recorded in `owner-rulings.md`.

## Evidence and run ids

Roster: `council-kimi` and `council-argon`, both requested in fresh context, pass cap 2. Pass 1 only: both reports converge on the same mechanism, and their remaining differences are drafting points settled above, so Pass 2 was not run. Run ids: `council-kimi` `980aed86-81f0-4d3f-994a-a36dad491d11`, `council-argon` `87fc801c-473c-48c7-bcfd-8fad85c5d7a0`. Confidence: high from both on the mechanism. What would change the decision: evidence that a binder cannot tell at binding time whether the parsed format is empty, which would move the condition into the format resolver while keeping one guard.
