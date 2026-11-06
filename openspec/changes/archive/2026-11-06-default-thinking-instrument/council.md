# Council Synthesis

## Question and Scope

How should pi-jefferson add a cross-cutting `label` option, define the default `thinking` instrument, and color `$level` like pi's input-box thinking rules without breaking the existing unknown-datum rule or the parallel string-modifiers change? The evidence is `owner-rulings.md`, `research-chidi.md`, `research-chidi-addendum-1.md`, `research-eleanor.md`, `proposal.md`, `specs/statusline/spec.md`, and Michael's PL4 section. Advisors did not read the repository directly. The string-modifier syntax itself is out of scope and assumed functional by Joel's ruling.

## Perspectives & Trade-offs

Pass 1 ran with `council-kimi` and `council-argon`, both fresh context, pass cap 2. Pass 2 was one cross-exam; no fallbacks were used. Run IDs: Kimi Pass 1 `eda7ef6b-a27c-417a-be71-ad0d57f994d9`, Argon Pass 1 `066afe29-1c3d-40f9-8835-c563ad1d10ff`, Kimi Pass 2 `9e25176d-a010-4183-8755-7cd58bf28fc6`, Argon Pass 2 `05022dce-c096-44eb-8466-be9ddf3ff318`. Chidi's 1.4.x addendum is run `64a3f13f-d10e-45be-a25b-285c9fdad60e`.

Both advisors agreed on eight material points: `label` belongs in the shared foundational options; a per-instrument default label belongs beside `defaultFormat` and only `thinking` has one; the label is literal text and never parsed by `parseFormat`; an unknown datum suppresses the whole cell including the label; the label inherits the instrument's configured style; `$level` takes a per-level color that overrides configured `fg` for that segment only; the color resolves against the live render-time theme; and only Q5, sequencing against the parallel string-modifiers change, is Joel's decision. Both also agreed that Q1–Q4 and Q6 are settled by rulings, specs, and code evidence.

Three claims were disputed in Pass 1. C1, the color API, converged: Kimi accepted Argon's style-preservation challenge. Calling `theme.getThinkingBorderColor(level)` alone applies only `theme.fg("thinkingX", text)` and drops configured `style.bg` and other non-`fg` attributes on `$level`; the documented-token route through `theme.style(text, { ...style, fg: token })` preserves them while resolving the same token against the same live theme. C3 converged: Q2 and Q3 are not owner decisions. Joel's "always use the same color" ruling settles Q3, and the existing per-literal styling of the format settles Q2.

C2, the label prepend seam, did not converge. Kimi recommends prepending at `configuration.ts`'s `instrumentBindings` seam after `resolveFormat` returns non-empty, so an explicit `format: ""` renders nothing. Argon recommends validating and resolving the raw label in configuration and passing it into `resolveFormat`, then prepending and styling it after the undefined-variable guard, so one styling path remains in the format language. Both reject parsing the label and both preserve unknown-datum suppression. This is a design-judgment dispute for Michael's PL4 gate, not a Joel decision. Design must state the explicit empty-format behavior.

Chidi's addendum verified that `Theme.getThinkingBorderColor(level)` and all seven `thinking*` foreground tokens exist in published pi 1.4.0 and in every published npm release from 0.81.0 through 1.5.0. No compatibility floor is required by the evidence. Whether package metadata states one is a design judgment.

## Synthesis & Recommendation

Add `label` to `FOUNDATIONAL_OPTIONS`, validate it as a string in `readInstruments`, and give `InstrumentDeclaration` an optional `defaultLabel` beside `defaultFormat`. Only `thinking` declares `defaultLabel: "Thinking: "`; its `defaultFormat` becomes `$level|capitalize`. A configured label replaces the default label. The label is raw literal text, with `$` carrying no variable meaning, and is never passed through `parseFormat`.

Keep the living unknown-datum rule: when any declared variable is unknown, the whole cell renders nothing, including the label. The label inherits the instrument's configured `style`; `$level` is the only segment whose `fg` is overridden. Map the reported level to the documented `thinkingOff`…`thinkingMax` foreground token at render time and call `theme.style` with `{ ...style, fg: token }`, preserving `bg` and the other configured attributes. Resolve against the render-time theme and cache no themed text. Extend the slot-aware fake theme with the seven tokens. Do not call `getThinkingBorderColor` as the sole styler unless design also preserves the configured non-`fg` attributes.

Confidence is high: every mechanism rests on a ruling, a living spec, cited code, or a published-tarball check. Q5 is resolved by Joel's 2026-11-06 statement and the verified `v0.5.0` release: the wait-for-land path is complete. What would change the recommendation: evidence that the token route diverges visually from pi's input-box rule, or a Michael PL4 finding on C2's empty-format behavior. No owner decision is needed for Q1–Q6.

## Accepted & Rejected Feedback

Accepted: Argon's C1 challenge that `getThinkingBorderColor` is fg-only; Kimi's C3 reasoning that Q2 and Q3 fail the owner-decision test; both advisors' agreement that Q1 is settled by the living spec; both advisors' rejection of parsing labels through `parseFormat`; Chidi's addendum establishing 1.4.0 and published-release compatibility; and Kimi's note that design must state the empty configured-format rule explicitly.

Rejected: Kimi's Pass 1 recommendation to call `getThinkingBorderColor(level)` directly as the sole `$level` styler; Argon's Pass 1 request to escalate Q2 and Q3 to Joel; any `$label` variable or `$` parsing inside labels; and a temporary `$level` default format, which would ship the breaking default-text change twice.

C2 remains an unresolved design seam at the pass cap. Kimi's binding-seam non-empty rule and Argon's raw-label-parameter rule both satisfy the owner rulings; Michael's design gate should choose one and require a test that distinguishes unknown data from an intentionally empty format.

## Owner Decisions Required

None.

Q5 was the only owner decision. Joel, 2026-11-06: *"FYI, the string modifiers are merged and available on main now. version 0.5.0 is released with it."* The wait-for-land path is complete. Verified state: remote `main` and tag `v0.5.0` both resolve to `e593968311946be0d762ecb1fed0a545f5eac11b`, and the npm registry lists `pi-jefferson@0.5.0`. This worktree remains at `152cfe3`; implementation must start from a checkout containing `v0.5.0`.
