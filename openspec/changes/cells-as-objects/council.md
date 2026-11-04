# Council Synthesis

## Question and Scope

`cells-as-objects` turns `cells` from a list of instrument names into a list of cell objects
(`{"instrument": "model", "align": "right"}`), moves the default and ceiling cell count from 8 to 10,
and adds per-cell `align`. Clipping stays at the text's end; the pad lands on the side opposite
`align`. `width`, `spacer`, a bare number, `cellCount` and `center` are declined by the owner.

Evidence inputs: `owner-rulings.md`, `research-chidi.md`, `research-eleanor.md`, `proposal.md`,
`specs/statusline/spec.md`. Advisors were restricted to those documents and did not read the
repository. Roster: `council-kimi` and `council-argon`, one pass each, no fallbacks. `council-argon`'s
first reply failed schema validation at the child boundary (it omitted `changeMyMind`) and was re-run
once with all eight fields named; its analysis is in the record from that retry.

## Perspectives & Trade-offs

**Both advisors approved the shape and the declined scope**, independently. `align` supplies the gap
the owner wanted, powerline is the only prior art with per-cell alignment, and declining a share pool
avoids deciding what a pool totals and how a remainder distributes. Neither advisor proposed a
compatibility path for the string form.

**Both advisors found the same two spec defects**, which is why they are requirements rather than
opinions:

1. **The emoji, combining-mark and wide-glyph scenarios do not test alignment.** Each says the cell
   renders "at the width the cell declares, under both alignments" — which passes with `align`
   entirely unimplemented, because both alignments fill the cell. They test width, not pad side.
   `council-kimi` adds the sharpest version: the overflow scenario alone would also pass, so the
   load-bearing scenario is the narrow-text one.
2. **Rejecting an invalid `align` exists only in the proposal.** An implementation that warns and
   defaults to `left` satisfies every scenario in the delta while violating the ruled policy.

**They disagreed on unknown keys, and the disagreement resolves against silent ignoring.**
`council-argon` rejects unknown keys; `council-kimi` ignores truly-unknown keys but warns on a
known-declined one; the retained reviewer recommended ignoring all of them. The shipped codebase
already warns on a known-but-unread key — `containers` — so silent ignoring would contradict the
project's own precedent, and `aling: "right"` would render left-aligned with no signal at all. The
conductor rules for **rejecting an unrecognised key on a cell object, naming it**: a statusline that
silently renders something other than what was declared is worse than a loud failure, and it is the
same class as an invalid `align`, which everyone agrees rejects.

**One hazard neither the proposal nor the delta covers.** If a cell's text ends with an unterminated
SGR (underline or background), a pad placed *after* it inherits the styling. That is the `align:
left` case; the host resets styles at the end of the line, but the pad sits before that point. The
design must emit a reset before the pad, or prove the styling cannot leak.

**One consequence worth stating rather than solving.** Alignment hugs the *cell* edge, not the
terminal edge, so a right-aligned last cell ends `W mod N` columns short — 2 columns at 132 with ten
cells. That is a property of the owner's ruling, not a defect to close with a width or a trailing
spacer.

## Synthesis & Recommendation

Keep the shape. Amend the delta before design starts, in four places:

1. Make each wide-glyph, emoji, combining-mark and ANSI scenario assert the **pad side** — text
   narrower than the cell, with the pad's position distinguishing `left` from `right` — rather than
   asserting occupancy alone.
2. Add a scenario for **rejecting an invalid `align`**, including `center` and a non-string.
3. Add a scenario for **rejecting an unrecognised key on a cell object**, naming it, which is what
   makes the declined `width` fail loudly.
4. State in the geometry requirement that a right-aligned last cell ends inside the terminal edge by
   the row's remainder, so the consequence is part of the contract rather than a surprise.

Then design: pad is `cellWidth - visibleWidth(clippedText)` computed after clipping; the pad carries
no styling, with a reset emitted before it when the text may end styled; `align` normalizes to an
explicit `left` or is absent, and whichever is chosen is pinned by the shape test.

## Accepted & Rejected Feedback

- **Accepted:** the four delta amendments above; the ANSI reset before the pad; the recorded
  geometry consequence; rejecting an invalid `align`; the narrow-text scenario as the load-bearing
  alignment test; the measured 10-versus-8 rationale rather than a universal claim.
- **Rejected:** silently ignoring unknown cell keys, including the declined `width` (contradicts the
  shipped `containers` precedent and hides `aling` typos); asserting alignment through occupancy
  alone; warning-and-defaulting an invalid `align`; any string-form compatibility path; a share pool
  or `center`.
- **Not adopted, recorded as residual:** neither advisor could show a documented host width table, so
  the emoji and combining-mark requirements can only promise "measured the way the host measures".

## Owner Decisions Required

None outstanding. The owner ruled the shape, the alignment mechanism, the declined scope and the
count before the change existed, and both advisors confirmed the error policy follows the shipped
split. The unknown-key ruling above is error policy, which `proposal.md` delegates to design; it is
recorded here so the design gate can check it against a stated rule rather than an assumption.

## Evidence & Run IDs

- `council-kimi` — `b409db53-7356-46a0-a5b9-fbe6777d3340`
- `council-argon` — `fca57c63-17f2-4604-a39b-fb68dda02f70` (retry; the first reply failed the schema)
- Documents: `owner-rulings.md`, `research-chidi.md`, `research-eleanor.md`, `proposal.md`,
  `specs/statusline/spec.md`

## Confidence

High on the two shared findings — both advisors reached them independently from the documents. High
on the unknown-key ruling, which is settled by the codebase's own precedent rather than by preference.
The residual uncertainty is the ANSI pad-bleed case, which is a design-time hazard with a known
mitigation rather than an open question.
