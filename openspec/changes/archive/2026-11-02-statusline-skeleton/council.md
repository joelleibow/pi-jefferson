# Council Synthesis

## Question and Scope

Is the specified contract the right one for a skeleton that later grows a real statusline — rows,
alignment, per-gap spacing, truncation priority, and cell content supplied by other code — or will
its requirements force a rewrite where an addition should do?

Advisors: `council-kimi` (389ca6ca) and `council-argon` (95b2a9cd). Both were handed
`proposal.md`, `specs/statusline/spec.md`, `research-chidi.md` and `research-eleanor.md`, and
neither read the repository. Inputs: the two research reports, the proposal, the delta spec, and the
grounding recorded in `.openspec.yaml`.

## Perspectives & Trade-offs

**Agreed by both advisors — and this corrects the grounding's own mechanism claim.** The stack
allocator must not be used to divide the row. Chidi's Finding 3 measured that
`allocateStackSizes` drains greedily left-to-right, so two `grow: 1` children at width 100 yield
66/34, not 50/50; only a fixed equal `basis` produces equal cells. Equal widths therefore require
explicit `floor(W / N)` arithmetic, recomputed inside `render(width)`. The grounding's statement
that equal distribution is `grow: 1` on every child is **wrong**, and the spec as drafted is right.

**Agreed.** Counts-only configuration with both shapes normalized to a row list at parse time, and
`both at once` rejected, is the correct minimal surface — provided "counts" is scoped to the config
surface and not to the internal model.

**Agreed.** No module or contribution interface for cell content belongs in this change. The
negative requirement is a scope guard, not a missing feature.

**Agreed.** Bypassing `HStack` means each cell must single-line truncate and pad its own content;
`Text` wraps to multiple lines and defaults to `paddingX=1, paddingY=1`, and `HStack` compositing
clips silently after wrapping.

**Agreed.** Because `extensions/jefferson.ts` is the only file permitted a runtime import of
`@earendil-works/*`, the modules under `extensions/jefferson/` must receive `truncateToWidth` and
`visibleWidth` by injection from the entry. An implementer who slices strings naively breaks as soon
as ANSI or wide glyphs replace ASCII Lorem.

**Agreed.** Where the configuration document lives is an owner decision the spec delta cannot
settle. Research shows a `settings.json` namespace is only a tolerated convention; the documented
pattern is an extension-owned file under `.pi/`.

**Disputed — three claims, and the dispute is about *where* the fix goes, not whether one is owed.**
Kimi argues each belongs in `spec.md` now; Argon agrees each is real but holds that location, trust
and fallback are owner/design territory. Kimi predicted all three of Argon's counter-positions
before Argon wrote them, and Argon took them. The three: scoping "counts, never in cells" and
permitting a cell-shaped internal model; naming visible-column measurement and clip-vs-ellipsis at
the truncation boundary; and requiring empty and rejected configuration behavior.

## Synthesis & Recommendation

The contract's core is right and should stand: pin the rendered geometry (`floor(W / N)`), recompute
per render, one line per row, two shapes normalized at parse time. That is the skeleton.

Three things should be settled before `design.md`, because they are rewrite-vs-addition pivots or
conformance gaps, and both advisors identified the same three even while disagreeing about which
artifact carries them:

1. The configuration source and its trust boundary.
2. The envelope shape of the multi-row configuration, since "both shapes at once" can only occur
   structurally if the list lives under a key.
3. What renders when the configuration is absent, empty, or rejected.

Two smaller corrections are cheap now and breaking later: require deterministic id synthesis (a
random or time-based scheme satisfies the spec as written and destroys content-addressing across
reloads), and state that the right-edge-remainder formula is the `gap = 0` case of
`floor((W - (N - 1) * gap) / N)` so per-gap spacing extends this requirement instead of conflicting
with it.

## Accepted & Rejected Feedback

**Adopted from both.** Do not divide the row via the stack allocator; inject width helpers from the
entry; cells truncate and pad themselves.

**Adopted from Kimi.** Scope "counts, never in cells" to the configuration surface and permit a
cell-shaped internal model — one sentence, and it is what makes per-cell content and alignment
additive. Name the truncation measurement basis (visible columns) and the clip-vs-ellipsis choice.

**Adopted from Argon.** Guard footer registration on `ctx.mode === "tui"` and re-install on
`session_start` so `/reload` and session replacement re-register the footer. Reject rather than
silently coerce `containers` typed as a string, and reject a non-object row entry.

**Disputed, left to the owner.** Whether `containers > 8` rejects or clamps — the advisors split,
and the inconsistency is real: the spec clamps above the ceiling while rejecting at or below zero.

**Rejected as premature by Argon, and not acted on here.** Writing the cell-descriptor schema now.
The seam should be *permitted* by the spec, not built.

## Owner Decisions Required

**Ruled by the conductor on evidence, 2026-11-02. None remain open to the owner.**

1. **Configuration source and trust boundary — resolved from research, not referred.**
   `research-chidi.md` Finding 1 reports that a `settings.json` per-extension namespace is only a
   tolerated convention, while the *documented* pattern is an extension-owned file. The configuration
   is therefore an extension-owned file, read from the agent directory and merged with a project-local
   `<cwd>/.pi/` file. Reading the project-local file is **gated on `ctx.isProjectTrusted()`**, which is
   documented platform guidance and was absent from the spec. That requirement is owed to the design
   step. The owner had already directed this question to the platform documentation; re-referring it
   was an error, corrected here.

2. **Envelope shape — design's decision, not the owner's.** A top-level array and `{ "rows": [...] }`
   are both viable, and the choice determines whether the "both shapes at once" rejection can occur
   structurally. It is a contract-shape decision made under the design gate, adjudicated by the
   retained Michael thread against the spec.

3. **Fallback on absent, empty, or rejected configuration — design's decision.** "None of it is
   rendered" must be defined as one observable behavior. That definition belongs in `design.md` and is
   reviewed there.

4. **The cell seam and the ceiling — design's decision.** Whether `containers` later accepts cell
   descriptors, and whether a count above the ceiling rejects rather than clamps, are contract-shape
   decisions for the design gate. The advisors split on the clamp; the design must state a resolved
   position and defend it.

None of the four is an objective or scope question the criteria cannot resolve, and none is a
difficult-reversal choice the owner alone can make. They belong to the design step, which is where
they are now routed.
