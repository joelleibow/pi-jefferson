# Design gate — `statusline-skeleton`

Reviewer: Michael (retained thread, resumed). Gate: design (PL4). Verdict: **approve** — no blocking
finding. Three non-blocking concerns, none about a load-bearing claim. I did not re-open any of the
owner's rulings and raise no style preferences.

## What I re-checked

Read `design.md`, `proposal.md`, `specs/statusline/spec.md`, `council.md`, both research reports, and
`openspec/specs/extension-source-layout/spec.md`. Then verified the design's factual groundings
against the pinned host in `node_modules/@earendil-works/pi-coding-agent@1.4.0` (types, docs, examples)
and `@earendil-works/pi-tui@1.4.0` (component contract) — not taken on trust.

## The two ground truths — both stated and correctly grounded

- **Equal widths are `floor(W / N)`, recomputed inside `render(width)`, because the stack allocator
  drains greedily.** Stated in Context and D7; grounded in `research-chidi.md` Finding 3, which
  measured `allocateStackSizes` on the shipped `stack.js` of **both** 1.4.0 and 1.5.0: two `grow: 1`
  children at width 100 → `[66, 34]` (and `[48, 31, 21]` for three, `[38, 27, 20, 15]` for four —
  the design quotes these correctly). Held: **yes.**
- **Only `extensions/jefferson.ts` may runtime-import `@earendil-works/*`, so the width helpers must
  be injected from the entry into `extensions/jefferson/`.** Stated in Context and D8; grounded in
  `extension-source-layout` requirement 4 ("Runtime imports of host packages MUST occur only in the
  module the host loads as an entry") and Finding 4 (measure visible columns, not string length). The
  injection is not merely permitted but forced by the layout spec. Held: **yes.**

## The five settled items — stated as givens, not re-chosen

| # | Settled item | Where | Held |
|---|---|---|---|
| 1 | Extension-owned file; agent dir + project-local `<cwd>/.pi/`; project read gated on `ctx.isProjectTrusted()`; settings-namespace not live | D1 (+ "Requirement owed to implementation") | **yes** |
| 2 | Top-level row fields = one row; list under `rows`; both at once rejected structurally | D2 | **yes** |
| 3 | Absent/empty/rejected all install the DEFAULT ROW; "none of it is rendered" = none of the rejected document; rejected additionally warns | D3 | **yes** |
| 4 | Above 8 clamps (advisor reject suggestion declined); below 1 / non-integer / non-numeric rejects | D4 | **yes** |
| 5 | "Counts only" scoped to the configuration surface; internal model may be cell-shaped; descriptors permitted, not built | D5 | **yes** |

The design states each as a given with its rationale, and states D4's clamp as the owner's declined
suggestion verbatim. Nothing here is re-litigated in a way that reopens a ruling.

## The specific checks the gate named

- **Trust requirement present.** D1 gates the project-local read on `isProjectTrusted()` and repeats
  it as a MUST-owed-to-implementation. `isProjectTrusted()` is on `ExtensionContext` in 1.4.0
  (`types.d.ts:238`), so the requirement is implementable, not aspirational. Held: **yes.**
- **Id synthesis deterministic.** D6 synthesizes `row-<index>` from the zero-based declaration index,
  "deterministic across reloads and sessions." The spec only demands non-empty + unique; the design is
  stronger and correct. Collisions (explicit/synthesized) reject per D3. Held: **yes.**
- **Remainder as the `gap = 0` case.** D7 states each cell occupies
  `floor((W - (N - 1) * g) / N)` columns with the leftover at the right edge, and fixes `g = 0`, so it
  reduces to `floor(W / N)` — exactly the shape the council asked for so per-gap spacing later
  *extends* rather than conflicts. Held: **yes.**
- **TUI guard and `session_start` re-install.** D9 installs only when `ctx.mode === "tui"` and
  re-installs on every `session_start`, citing `resetExtensionUI` clearing the footer on reload. The
  host confirms `session_start` carries `reason: "startup" | "reload" | "new" | "resume" | "fork"`
  (`types.d.ts:578`), and the shipped `custom-header.ts` / `border-status-editor.ts` do their footer/
  header install inside a `session_start` handler. Held: **partly** — see Concern 1.

## Spec conformance — nothing forbidden, nothing left unimplementable

Every ADDED requirement maps to a decision: declared rows → D9/D7/D10; both shapes → D2; containers
count → D3/D4; ids → D6; even distribution → D7; fixed placeholder text + no contribution interface →
Non-Goals / D5; one line tall → D10; extension-owned surface → D1. No design decision violates a MUST,
and no MUST is left without a mechanism. In particular the spec's `floor(W / N)` recomputed at render
time is matched by D7 ("Widths are computed inside `render(width)`; no cell keeps a width from a
previous frame"), and the "one line per row" contract is preserved by D10's per-cell truncate-and-pad
(the design correctly rejects `Text`/`HStack` compositing, which wraps or silently clips per Finding 4).

## Concerns (non-blocking)

1. **D9 says the footer installs "at load," but the factory has no `ctx`.** `ExtensionFactory` is
   `(pi: ExtensionAPI) => void | Promise<void>` and `ExtensionAPI` exposes no `ui`; every shipped
   example installs a footer/header from a `session_start` handler (or a command), never the factory
   body. The required behavior (tui guard + re-install on `session_start`) is present and correct, and
   `session_start` with `reason: "startup"` covers the initial install, so nothing is broken — but
   "both at load and on every `session_start` event" is one moment described as two, and a task-writer
   could read it as "call `setFooter` in the factory body." Recommend the install be described as
   `session_start`-driven (startup/reload/new/resume/fork). Required change: reword D9.
2. **D1's precedence is "overrides the agent-directory document whole," while ruling 1's word is
   "merged."** The design's reading is transparent and defended ("merging row lists positionally has
   no defensible meaning"), and whole-document precedence is a defensible reading of "merged," so I do
   not treat this as re-choosing the ruling. Flagging only so the owner can confirm the intended
   semantics; if row-list merging was meant, D1 changes. Required change: none if the owner confirms
   whole-document precedence.
3. **The spec delta still reads "none of it is rendered" for rejects while the design renders the
   default row.** Ruling 3 *defines* the phrase ("none of the rejected document renders, not an empty
   footer"), so the design is authorized and the spec reading is coherent with the ruling — not a
   conflict I may reopen. For the archive, consider tightening the two reject scenarios so the spec
   text alone cannot be read as "blank footer." Required change: optional spec wording, not a design
   defect.

Minor note, not a finding: the Context and D8 omit `invalidate()` from the listed component contract
(`Component` requires it, per Finding 2); a builder will hit it from the types, so it does not block,
but the lifecycle description is thinner than D9's "one line per row" precision.

## Verdict

**approve.** The design's two ground truths are stated and correctly grounded; the trust requirement,
deterministic id synthesis, the `gap = 0` remainder formula, and the tui-guard/session_start lifecycle
are all present; and all five settled items are stated as givens rather than chosen. No ruling was
reopened. The three concerns are documentation-level and can be folded into tasks or confirmed by the
owner; none changes the contract.
