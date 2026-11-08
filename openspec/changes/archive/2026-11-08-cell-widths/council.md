# Council Synthesis

## Question and Scope

Joel wants the ideal solution and the range of flexibility for letting a cell take no more width than its content needs, so neighboring cells sit against it and the model and thinking cells can read as one (`owner-rulings.md`). The council's job was a map he can rule on: each option's configuration for his two rows, what it gives a user, what it costs, the rules any content-width option needs, and a recommendation on each of his three calls.

Evidence handed to the advisors: `owner-rulings.md`, `proposal.md`, `specs/statusline/spec.md`, `research-chidi.md`, `research-eleanor.md`, `michael-orientation.md` and Michael's PL4 section. Neither advisor read the repository and neither requested an addendum. Two passes were run (`council-kimi`, `council-argon`, both fresh context), the cap.

## Perspectives & Trade-offs

**The options.**

- **A, content-width cells.** A cell takes the width its content needs and the neighbors sit against it. pi-tui supports this through `basis: "auto"`, but it is not drop-in: the layout measures a child by rendering it at the full row width, today's cell pads to whatever width it is given and so reports the whole row, and a cell holding `$bar` has no content width because the bar fills what its cell leaves (`research-chidi.md` §1.2; `michael-orientation.md` §2a, §2c). Joel's rows need no edits under the recommended defaults below.
- **B, a cell that holds several instruments** (for example `{instruments: ["model","thinking"], align: "right"}`), geometry unchanged. It reaches the model-and-thinking target without content-dependent layout, but it breaks the one-instrument-per-cell contract, leaves `path` and the pair as fixed equal shares, and still needs the joint and `$bar` rules; it groups, and it does not give general content sizing.
- **C, row-level justify or a fill/spacer concept.** Re-invents the `spacer` Joel declined (cells-as-objects), cannot express his second row's equal thirds without weights, and still needs every rule A needs. Both advisors treat it as a possible escape hatch inside A, not as a standalone option.

**Agreement (both advisors, after both passes).**

- **A, not B or C**, for the stated general objective; B is the alternative to bring Joel in case stable equal-share geometry outweighs content sizing.
- **The declined `width` key is not reused.** A new key is a design name.
- **Overflow stays in pi-tui.** Every cell gets `shrink: 1` and `minSize: 0`, so shrink capacity is never exhausted and the one-line, full-width guarantees hold; each cell clips to its final allocation with the end ellipsis. The spec promises one line of exactly the row's width and that every cell is eligible for shrink. It does not promise who loses the first column or exact ratios, because the allocator's rounding is order-dependent and host-supplied; a mandatory shrink priority would be Jefferson arithmetic and would revise Joel's 2026-11-05 ruling (*"let pi-tui do its thing"*).
- **Slack.** With no explicit fill cell, exactly one cell grows: the last left-aligned cell, else the first. Explicit `fill` cells split the slack by a numeric base of `floor(S/G)` and use `grow: 1` only for the remainder, because two `grow: 1` children given the whole surplus get `[20, 10]` in width 30 and not `[15, 15]` (`research-chidi.md` §1.3). Joel's top row then reads `path` absorbing the slack at far left and `model`, `thinking` adjacent at the right edge.
- **A `$bar` cell and `blank` cells are fill cells by default**, so Joel's second row keeps its equal shares (34, 33, 33 at width 100) and the bar still fills its third. Measuring a content cell uses an unpadded, unclipped probe (a width of 0 makes `$bar` contribute nothing), and the memo must stop missing every frame (Michael §2b, measured).
- **Reflow.** The row re-seats when a cell's computed width changes, not only on a window resize.
- **`align` in a cell with no spare columns is a no-op**, which is a user-visible change to what `align` means in a content cell.
- **The joint.** After Pass 2 both advisors recommend one system-supplied space between adjacent non-empty cells with no pad between them, as a single decision with no knob, because ADR 0006 trims outer whitespace and the user can no longer add one, and his target is the pair reading *"as if they're a single cell"*. It is a collapsible cell joint included in the measured width and clipped with the cell, not a fixed stack gap, so a narrow row keeps its guarantees. `council-kimi` moved to this from a literal zero in Pass 2. Zero remains the cheaper alternative if he means literal concatenation (box-drawing or powerline glyphs touching).

**Still different.** The default. `council-kimi`: every non-`$bar` cell content-sized by default with an explicit `fill` escape. `council-argon`: a smart default (non-blank, non-`$bar` cells hug content, or only right-aligned ones do), or an opt-in per-cell key; and pointed out that making every cell content-sized with the first cell absorbing breaks `blank` cells and the ten-cell default row, which `council-kimi` accepted by moving `blank` and `$bar` to fill by default. The remaining difference is how far the default reaches: all content cells except `blank` and `$bar`; right-aligned cells only; or none unless a cell opts in.

## Synthesis & Recommendation

Draft the design as option A with the rules above. On the default, the council's recommendation to Joel is: **every cell sizes to its content except `blank` and `$bar` cells, which fill**, with an explicit per-cell override. It is the smallest contract, needs zero edits to his file, and is the reading of *"A user shouldn't have to configure any more than truly necessary"*. What he loses by it: any existing multi-cell row with left-aligned cells re-lays (the last left-aligned cell absorbs the slack and the others hug), and neighbors move when a value changes length. The two alternatives are in Owner Decisions below. The name of the override key and the exact slack rule are the design's to settle with Michael, not Joel's.

## Accepted & Rejected Feedback

**Accepted**

- The mechanism, the slack rule, the overflow policy, the `$bar` and `blank` defaults, the probe, the memo fix and the reflow rule (both advisors, after Pass 2).
- One system-supplied, collapsible joint of one column (both advisors after Pass 2), brought to Joel as a decision.
- Replace the delta's open wording with MODIFIED requirements by living-spec name once Joel rules: "Cells are evenly distributed across the width" (l.63), "Instrument text is bound by the row's geometry" (l.341), "A row's cells are its count and its placement" (l.163) and "The footer's tree is built once and reads the current render's sample" (l.433) (`council-argon`).

**Rejected or left to the design**

- `council-kimi`'s Pass 1 "the first cell absorbs the surplus" (the all-left row `[a, b, c]` would push `b` and `c` to the right edge); superseded by the last left-aligned cell, else the first.
- `council-kimi`'s Pass 1 "a `$bar` cell reserves its legacy `floor(W/N)` basis" as a separate rule; superseded by `$bar` being a fill cell by default (it takes its share of the slack), which keeps a row like `[path, context]` from starving the bar.
- `council-argon`'s Jefferson-side proportional shrink arithmetic; superseded by native shrink with `minSize: 0`.
- Any user-facing shrink priority or Jefferson-owned allocation: it revises his platform ruling, so it is not designed in.
- The override key's name and spelling: design, with Michael.
- Both advisors mark some claims "verified" with no repository access; those are inferences from Eleanor's report and Michael's measurements, treated as unverified until the design gate and Derek's run measure them (host version pinned 1.4.0, running 1.5.0).

## Owner Decisions Required

Three questions are Joel's, each with the council's recommendation (`owner-rulings.md` says he wants the options and their costs):

1. **The joint.** When two content-sized cells meet, do they touch (zero columns) or does the system put one space between them? Recommended: one collapsible space, because he cannot type one (ADR 0006) and wants them to read as one cell. Zero if he wants glyphs to touch.
2. **The default.** Which cells size to their content without being told: (a) every cell except `blank` and `$bar` (recommended); (b) only right-aligned cells; (c) none, unless a cell opts in with a new key.
3. **The mechanism.** Content-width cells, which he described and both advisors recommend, or a cell holding several instruments with the equal-share geometry unchanged (Michael's alternative, which keeps rows stable when values change).

## Evidence and run ids

Roster: `council-kimi` and `council-argon`, fresh context, two passes (cap reached). Run ids: Pass 1 `council-kimi` `128b7acd-2738-4f06-9976-6604bdb943b0`, `council-argon` `560d1cc6-3005-4733-bcbd-48b08ecf9ab6`; Pass 2 `council-kimi` `17ecb4c8-4ed2-44fe-956e-04aef5b3379f`, `council-argon` `26b5c225-0e36-4aa4-b75f-d664c2c5489e`. Confidence: medium-high on the mechanism and rules, owner-dependent on the three calls. What would change the decision: Joel preferring stable geometry (flips 2 and 3 toward opt-in or B); evidence that a width-0 probe changes non-bar output (needs an explicit intrinsic-width contract); a supported public intrinsic-measurement API.
