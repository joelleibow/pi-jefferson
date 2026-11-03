# Validate adjudication — `statusline-skeleton`

Reviewer: Michael (retained thread, resumed). Task: adjudicate the two independent reports against
the approved design and plan. Verdict: **approve** — the PR review's lone concern is **not a defect**
(its premise is false), the verify pass's concerns are documentation-level and already accounted for,
and no code fix is required before archiving. I ran the checks and a brute-force falsification of the
geometry; I changed nothing.

## What I read and ran

`verify-judge-gen.md` (verdict pass), `pr-review-judge-gen.md` (verdict approve, one concern),
`design.md` (D7), `specs/statusline/spec.md`, and `extensions/jefferson/row-renderer.ts` at HEAD
`cfebc4a` (working tree identical to HEAD for `extensions/` and `tests/`). I re-ran the suite:
`npm test` → **41 tests / 41 pass / 0 fail**; `npm run typecheck` → **exit 0**;
`openspec validate "statusline-skeleton"` → **valid**. Both reviewers stated they could not execute
commands; I could and did.

## The PR review's concern — narrow-width "column absorption"

**Ruling: not a defect. The reviewer's premise is false.**

The reviewer argues a cell "can grow to `max(cellWidth, visibleWidth(truncated))`", so at `W < 2*floor(W/N)`
the last cell absorbs a column the spec assigns to the right edge (their trace: N=3, W=8 → cells
2/2/3 + 1 leftover, where the spec requires 2/2/2 + 2). That premise requires
`visibleWidth(truncated) > cellWidth` to be possible. It is not.

`row-renderer.ts` computes `truncated = helpers.truncateToWidth(cell.text, cellWidth)` and pads with
`Math.max(0, cellWidth - visibleWidth(truncated))`. `truncateToWidth` is documented "Maximum visible
width" (`node_modules/@earendil-works/pi-tui/dist/utils.js:1018`), and every branch returns a value
whose visible width is ≤ `maxWidth` (it returns `""` for `maxWidth <= 0`; the non-padded branches
never exceed `maxWidth`). So `visibleWidth(truncated) <= cellWidth` always, the `Math.max(0, …)` never
clamps, and **each cell is exactly `cellWidth` wide**. The composed line is therefore exactly
`N * floor(W/N)`, and the line-level remainder is exactly `W mod N`.

**Quoting the requirement** (`specs/statusline/spec.md`, "Cells are evenly distributed across the
width"): *"For a row of N cells rendered at width W, each cell MUST occupy `floor(W / N)` columns, and
the leftover `W mod N` columns MUST stay unallocated at the row's right edge; the rendered line MUST
still span the full width."* This reading — each cell exactly `floor(W/N)`, leftover exactly `W mod N`
at the right edge — is precisely what the code does at every width, narrow ones included. Design D7
("each cell occupies `floor((W - (N - 1) * g) / N)` columns and the leftover columns stay unallocated
at the row's right edge"; `g = 0` here) says the same. Neither the spec nor the design leaves narrow
widths open; both settle them the way the code already behaves.

**I falsified the claimed band empirically.** Calling the real `renderRow`:

- Exhaustive sweep over N=1..12, W=1..48, and 8 cell texts (ASCII, a long Lorem, emoji, mixed
  wide/ASCII, ANSI, CJK, a single char, empty): **0 mismatches** against a spec-correct construction,
  and `visibleWidth(line) === W` in every case.
- Randomized sweep, 200,000 cases over N=1..12, W=1..50, per-cell random mixes of `a b space 😀 日
  ANSI x 🔥 combining`: **0 mismatches**.

The exact cases the reviewer named are correct in the code: `renderRow(rowOf(3,"ab"), 8)` = `"ababab  "`
(2/2/2 + 2 leftover, and this equals the reviewer's own proposed assertion, so it does not reproduce a
bug); `N=3, W=100` = 33/33/33 + 1; `N=8, W=15` = 8 cells of 1 + 7 leftover; `N=8, W=4` = 4 columns of
blanks. The band `W ∈ {3,5,6,7,8}` for N=3 is not reproducible.

**The requested fix** (cap each cell at `cellWidth` before compositing) is unnecessary: capping to
`cellWidth` is already the guaranteed behavior. It would not change any output, and the reviewer's
proposed clamp (`Math.min(cellWidth, width - used - visibleWidth(truncated))`) introduces a running
`used` count that is currently redundant — a change with no behavioral gain and new surface for a
regression. I would reject it. (Consequence the reviewer did not consider: because
`truncateToWidth` already caps, there is no bug to fix, so the "repro" they ask to add asserts the
correct output the code already produces.)

No further narrow-width case exists to fix, so the concern does not reach `requiredFixes`.

## The verify pass — accepted

I **accept its `pass` verdict** and the substance of its checks (completeness, geometry, fallback,
trust gating, test honesty, hygiene). Its four concerns are documentation-level and I adjudicate them
below. Its note that it could not execute the suite is resolved: I ran it (41/0, typecheck 0,
validate valid). Its "one untested non-defective edge" — a trusted project document that is present
but invalid yields the default row without consulting the agent document — is correct behavior under
D1's whole-document replacement, so it is not a finding.

## Adjudications

| # | Source | Claim | Ruling |
| --- | --- | --- | --- |
| 1 | PR review | Narrow widths let the last cell absorb a column; spec requires `floor(W/N)` each + `W mod N` leftover | **not-a-defect** — `truncateToWidth` caps visible width at `cellWidth`, so every cell is exactly `cellWidth` and the remainder is exactly `W mod N`; exhaustive + 200k randomized runs show zero deviation; the named band does not reproduce |
| 2 | PR review | The contribution-interface guard's third leg is a name regex (`/register\|supply\|contribute/i`), not an exact key set | **cosmetic** — the code satisfies the spec scenario today (single `DEFAULT_CELL_TEXT`, `Object.keys(cell) === ["text"]`, entry/renderer legs are exact key sets); this is guard-strength future-proofing, not a defect in this change |
| 3 | PR review (proposed fix) | Add a per-cell clamp and a repro assertion | **not-a-defect / reject** — the clamp changes no output and the repro asserts the current correct output; applying it adds surface without benefit |
| 4 | verify pass | README and `/jefferson` text still say no statusline is built | **cosmetic** — real drift, but no artifact in this change required a README or command-text edit (tasks 3.2 keeps the text deliberately); out of this change's declared scope |
| 5 | verify pass | design D9 says "at load and on every session_start" while the code installs only from the handler | **already-decided** — the PL6 reconciliation and design-gate/plan-gate record this wording; observable behavior matches (`reason: "startup"` covers initial load) |
| 6 | verify pass | Spec reject scenarios say "none of it is rendered" while the code renders the default row | **already-decided** — owner ruling 3 and design D3 define "none of it" as none of the rejected document; recorded at the design gate |

## Verdict

**approve.** The PR review's concern is not a defect: `truncateToWidth` guarantees
`visibleWidth(truncated) <= floor(W/N)`, so each cell is exactly `floor(W/N)` wide and the leftover is
exactly `W mod N` at the right edge — the spec's requirement, verified exhaustively and by 200,000
randomized cases against the real `renderRow`. The requested fix is unnecessary and would add surface
without changing behavior. The verify pass's concerns are cosmetic documentation drift, mostly already
recorded, and none is a spec violation. No code fix is required before archiving. The suite is green
(41/0), typecheck is clean, and `openspec validate` passes — commands the two independent reviewers
could not run and I did.
