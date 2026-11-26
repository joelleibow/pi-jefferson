# Design Review

Four stages of fresh-context review over `design.md` and, where a finding landed there, over
`proposal.md` and the three delta specs. Stages 1, 2 and 4 are single passes; Stage 3 looped with
Michael as resolver and took four rounds. The reviewer reports are `design-review-1-zoom-out.md`,
`design-review-2-comprehension.md`, `design-review-4-zoom-out.md` and, for Stage 3, the
`dr-s3-r*-council-critic.md` and `dr-s3-r*-council-structural.md` files beside Michael's
`dr-s3-r*-resolve.md`. This file is the synthesis; each finding's evidence stays in its report.

What this review did not cover: task readiness. Test order, failing-first discipline, sibling-entry
assertions and the exact sentences tasks must pin are the Implementation Readiness gate's, which
`tasks.md` opens. Line citations were spot-checked by every lens, not exhaustively re-verified.

## Stage 1: Initial Zoom Out

`council-zoom-out` against `zoom-out-standard.md`, over the design as first drafted. Two major
findings, both about where a fact lives rather than about architecture. The lens verified five
assumptions and rejected any general state-machine framework or new dependency.

**ZO-R1 — the once-per-instrument reading had no owner (major).** DEC-6 placed the reading at "an
existing reset point", `row-renderer.ts:36-52`, which is per cell: `createFooter` builds one
`cellView` for each placement (`:82`). One instrument placed twice in a row would therefore be read
twice in one footer sample. The lens's case: a threshold at 70 that adds `$bar`, a bar answering 69
on the first call and 71 on the second, and two placements of one instrument choosing different
states. Its recommendation was to give the sample-wide reading one owner above cell rendering, keep
width-specific text caching local, and extend the planned test to repeated placements.

**ZO-R2 — the thresholds-only provider scenario contradicted the design (major).**
`specs/statusline/spec.md:609-614` kept the default fill colours after a user had written a
replacement list, against DEC-2's single list and Joel's separate-opt-ins ruling. Satisfying it
would need a provider-specific second colour path. The finding was against the changed scenario, not
a reopening of the opt-in decision.

The lens's recommendation: retain the pure threshold rules and the existing binding, visual and
ledger paths; make per-instrument sample ownership explicit; correct the scenario. Both findings were
resolved in round 1 of Stage 1's triage (`dr-s1-resolve.md`).

## Stage 2: Comprehension Test

`council-comprehension`, doc-only over `design.md` alone, paraphrasing first.

**What this proposes (naive paraphrase):**

> The design makes a bar’s appearance configurable through thresholds, with default warning and error states beginning at 70 and 90. It binds a separate instrument form for each state and chooses one state per instrument and sample, so row planning and drawing agree. It also adds separate provider opt-ins for thresholds and fill, shares validation between settings paths, and contains provider failures during planning and rendering.

**How the existing system works, per design.md:**

> The drawing currently chooses warning and error colours using strict comparisons above 70 and 90. An instrument is bound once using its top-level format, and row planning reads its fixed fills property without the sample. Provider containment wraps rendering but not planning, while the two settings paths separately validate options and surface faults differently.

Both paraphrases are accurate, which is the test itself: the design communicated what it intended.

Four findings, three majors, all comprehension gaps rather than design errors:

- **COM-1 (major).** The document named range, shape and numeric edge cases for the reader's input
  but did not say where the contract is defined, so a reader could not implement or check it. The
  contract was complete and lived in the statusline delta; the design neither pointed nor restated.
- **COM-2 (major).** DEC-6's slot was described as holding "the chosen state or a throw", while the
  drawing also needs the raw reading — the filled columns come from it, and DEC-10's `null`-versus-
  `undefined` judgment needs the value from before unknown counted as 0.
- **COM-3 (major).** "Nothing outlives the sample" was asserted for a slot that retains the last
  sample between renders, with no lifecycle stated.
- **COM-4 (minor).** Asked for a provider opt-in matrix in `design.md` showing accepted settings for
  neither, either and both options.

The lens's recommendation was to make the threshold input contract and the per-sample reading
lifecycle explicit and to explain the separate opt-ins with an example. COM-1 to COM-3 were fixed;
COM-4 was declined as settled (`dr-s2-resolve.md`).

## Stage 3: Critic Review Loop

`council-critic` and `council-structural`, against `feature-spec-standard.md`, looping with Michael
as resolver. Four rounds; the loop stopped on two consecutive clean rounds, well inside the cap of
five, and never reached a churn stop.

| Round | Findings | Reviewer verdicts | Dispositions | Fixes landing |
|---|---|---|---|---|
| 1 | 11 (critic 7, structural 4) | Revise before approval | 10 `propose_fix`, 1 `decline` | `### Contracts` added with `BoundInstrument.topLevelFills`, the reader's result, and the fault table; the place phrase given one home; `fills` made a sample function across the test set; the `fills` catch given its own sentence |
| 2 | 2 (structural only) | Pass structurally, two minor fixes | 2 `propose_fix`, plus one major Michael raised himself | Source lines and council landing records trued up; the deleted living rule restored without breaking the strict body-length cap |
| 3 | 6 (critic 3, structural 3) | Approve after one major fix | 5 `propose_fix`, 1 `decline` | "The drawing path" added, so `drawBar` and `resolveFormat` have one stated seam; the two shared test helpers routed through the real binding; the containment test split into a discriminating pair; a registration refusal relocated whole |
| 4 | 3 (critic 2, structural 1) | Approve after one major fix | 3 `propose_fix` | The reader/path seam fixed in the reader's own contract; fault-table wording narrowed to what a sentence must name |

Round 2 has no critic report: that reviewer's model stopped with a provider refusal and produced
nothing, so the round carries the structural review alone. Michael's own `michael-MR2-1` is recorded
in that round's resolve at major severity, raised while re-reviewing the place a structural finding
named.

**What the loop was actually about.** Four themes, each found by both lenses where it mattered:

- *The seam nobody wrote down.* Round 1 found that `containProvided` had no reading-free way to reach
  the top-level geometry (CR-R1, STR-R3); round 4 found that the settings paths and the reader never
  settled which list the per-value checks run over, so a bad `fill` or `format` inside a dropped or
  capped threshold would go unchecked (CR4-1, STR-R4-1). Both are the same class: a contract two
  files meet at, stated only in prose one level away. Both fixes made the order structural rather
  than remembered — `topLevelFills` fixed at bind, and the path's own `check` run by the reader over
  every threshold in written order.
- *A rule kept in two artifacts, differently.* Round 1 found the MODIFIED "Provider code costs one
  entry and no more" carrying two clauses this change falsifies (STR-R1); round 3 found the statusline
  refusal requirement had dropped a living MUST and orphaned a scenario (STR-R3-1). Round 2's
  self-raised finding is the same defect caught mid-repair: a body patched down to fit the strict
  character cap had silently deleted three living rules, which `AGENTS.md` forbids retiring without
  an ADR.
- *Tests named as proof that could not fail the way they claimed.* Round 3 found the design had moved
  the bar read and the defaults out of `resolveFormat` and `drawBar` without naming the two shared test
  helpers that reach the bar through `resolveFormat`, so the geometry tests Joel ruled must stay
  unedited would have lost their default colours (CR3-1). Round 4's twin test could not tell the
  correct fallback from a wrong one (CR3-2 → fixed as a pair).
- *A claim outrunning its evidence.* The bind-cost mitigation claimed the declaration pin "measures"
  a cost it does not measure (CR-R6, STR-R4); two test rows claimed to assert sentences the fault
  table does not give (CR4-2).

Michael declined three findings across the loop and no finding was contested or prototyped. Each
decline is listed under Settled Findings with the reason Michael gave.

## Stage 4: Intermediate Zoom Out

`council-zoom-out` again, auditing what Stages 2 and 3 added for bloat and altitude drops.

**Verdict: pass on scope, reuse and responsibility placement.** The lens verified five assumptions,
including that the earlier sample-ownership finding is resolved by one sample outcome owned by the
shared name-bound instrument while the row keeps only per-cell text memoisation, and that the
thresholds-only provider contradiction is resolved. The new pure `thresholds.ts` was judged to have a
justified domain-rule responsibility in the existing flat shared-module layout, with both dependents
pointing inward and no new framework, dependency, notification subsystem or persistence layer.

**ZO4-1 (minor, untriaged).** The file map's `tests/format.test.ts` and `tests/instrument.test.ts` rows
drop below design altitude into helper implementation: the exact
`instrumentBindings(check, …)(declaration).render(…)` expression, per-call construction, argument
preservation, the inventory of direct call sites, and the measured 89-of-89 and 39-of-39 counts. The
lens's remedy is to keep the requirement — bar tests route through the real binding, geometry and
blanking expectations are preserved, the 70/90 assertions flip — and move the recipe and the counts
into `tasks.md`.

No triage exists for this finding: by the plan's rule a minor Stage 4 finding is not sent to Michael.
`design.md` still carries the text it names, and the recipe belongs in `tasks.md`, which is where it
is carried. The decision that produced it — route the helpers through the real binding, fresh per
call, with `label: ""` — stays in the design.

## Michael's Resolutions

Thirty items across the four stages: twenty-nine reviewer findings and one Michael raised himself.
Twenty-six were `propose_fix`, three were `decline`, one — Stage 4's — arrived after the loop closed
and has no disposition, and none was `contest`, `prototype` or `escalate`. Each round's triage is the record: `dr-s1-resolve.md`, `dr-s2-resolve.md`,
`dr-s3-r1-resolve.md` through `dr-s3-r4-resolve.md`. Every applied fix names its required change and
the locations it touches, so the design's text traces to a disposition rather than to a reviewer's
preference.

Five things are worth carrying forward from the triage:

- **Michael's own council ruling caused ZO-R1.** The "one reading" row pointed at
  `row-renderer.ts:42-46` as the place the row resets per sample; that reset is inside `cellView`. His
  resolution corrects the pointer and moves ownership of the state into the binding, keyed to the
  sample object, and measures the stand-in through the real `createFooter`, `instrumentBindings` and
  `containProvided`: 1 provider read per footer render across three placements in two rows today
  reads 5 times, and a remembered throw blanks every placement with one notice.
- **The strict validator's 500-character requirement cap drove two resolutions.** ``michael-MR2-1``
  and STR-R2-1 both turn on `MAX_REQUIREMENT_TEXT_LENGTH`: a MODIFIED body cannot both keep the living
  text and gain a Source line. The outcomes are recorded — the provider-code body states no rule of
  its own and takes no Source; the living registration-refusal sentence is relocated into the retitled
  ADDED requirement, which fits at 431 characters.
- **Two findings were closed by another finding's fix.** STR-R3 and STR-R4 in round 1, and STR-R4-1 in
  round 4, each name the resolution that closes them and ask for no separate edit. They appear here so
  that the counts add up and the reviewer's finding is on the record.
- **Michael measured where the design made a claim.** DEC-6's slot, the `fills` fallback, the helper
  routing and the seam's check order each carry a `mktemp -d` measurement in their resolve, and the
  designs say what those measurements passed (89 of 89 and 39 of 39 for the helper routing; seven
  cases for the reader's order).
- **Nothing was escalated to Joel.** Every resolve records an empty `owner_decisions`.

## Settled Findings

- **COM-4 — the provider opt-in matrix lives in the statusline delta, not in `design.md`.** Declined.
  The delta's provided-options requirement carries one scenario per combination, and the
  defaults-reach scenarios cover a provider that never opted in and one that named only `thresholds`.
  A threshold key a provider did not declare, `fill` under a `thresholds`-only opt-in included, is
  refused by "A key a threshold does not take is refused". Reopen only if DEC-13 or those requirements
  change.
- **CR-R7 — DEC-6 needs no explicit per-render preparation pass.** Declined. DEC-6's lifetime bullets
  already say the slot answers only a call carrying the identical sample object and holds its last
  sample as the row's text memo does, and the row memo already depends on a fresh sample per render. A
  preparation pass would be a procedural step every render path must remember — the ground `AGENTS.md`
  rejects it on and the ground DEC-9 rejects a row guard on — and it would put the dedupe of swappable
  holders into the row. Reopen only if DEC-6's slot or the store's `sample()` changes.
- **STR-R2-1 (provider-code part) — the MODIFIED "Provider code costs one entry and no more" carries no
  Source line.** Settled, because the body is 480 characters and any Source line takes it past the
  strict cap. It states no rule of its own: the bar's cost and the state choice are the two ADDED
  instrument-registration requirements, and each carries its Source. Reopen only if that body gains a
  rule of its own.
- **STR-R3-3 — DEC-2, DEC-8, DEC-10 and DEC-11 name the values and conditions their decisions place.**
  Declined. Each copy agrees with its statusline requirement, and a reader needs the conditions in view
  to follow the reasoning (DEC-8's "both conditions are known at bind", DEC-10's ordering). Reopen only
  if one of those copies disagrees with its requirement.

Also closed and not to be reopened without new evidence: the Stage 1 major findings, whose fixes the
Stage 4 lens verified — one sample outcome owned by the shared name-bound instrument, and the
thresholds-only scenario corrected to remove the default colours.

## Owner Decisions Required

None. No resolve records an `escalate` decision, and every owner-level question in this change was
settled by Joel's rulings already recorded in `owner-rulings.md` (the `>=` boundary, whole-list
replacement, separate opt-ins, `fills` as a declaration member rather than a setting, and
unknown-as-0), which the design cites as its sources.
