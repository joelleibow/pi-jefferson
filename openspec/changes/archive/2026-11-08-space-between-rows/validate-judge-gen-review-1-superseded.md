# PR #16 review: space between footer rows

Head commit reviewed: `031c51af088cb1faa1aa21b7525e46622a44cf41` (`gh pr view` confirmed it did not move).
Read: the PR description and diff, `proposal.md`, `specs/statusline/spec.md`, the changed code, its callers, and pi-tui's `stack.js` and `spacer.js`. I ran `pnpm typecheck` (clean) and `pnpm test` (308 pass, 0 fail).
Load assumed: one person running pi in a terminal. The footer renders a few lines per repaint, so there is no scale concern.

What this change does:
The footer now draws an empty line above row one and one between each pair of rows. A new top-level `rowGap` key in the config (a whole number 0–3, default 1) sets how many; `0` gives back the old footer. The gap is the footer's `VStack` `gap`, plus a zero-line `Spacer(0)` as the first child so the gap also lands above row one. Any other `rowGap` value rejects the whole document.

## Findings

None in Must fix, Should fix or Nice to have.

## What I checked

- **Spacer trick is correct.** In `stack.js` the gap is only added between children, and `Spacer(0).render()` returns `[]`. So `[Spacer(0), row1, row2]` with gap N renders N empty lines, row1, N empty lines, row2. At N=0 nothing is added. `-0` is safe, since `Math.max(0, Math.floor(-0))` is `0`. A footer always has at least one row, because the default row fills in when there are none.
- **Validation matches the spec.** `-1`, `1.5`, `"1"`, `null`, `4` and `1e21` all fail the `typeof` / `isInteger` / range test, and the error message names `rowGap` and the value. `1e21` is a "safe integer" in `Number.isInteger` but is caught by the `> 3` test, so the hang case is closed. `rowGap` is read after the "both shapes" check and before the instruments, which matches the claimed order. `"rowGap" in doc` cannot be fooled by the prototype chain, because `doc` comes from `JSON.parse`.
- **Every path carries `rowGap`.** The paths are: absent file, unparseable file, rejected document, accepted document. Each returns `rowGap`, with the default of 1 on the first three. The only callers of `readConfiguration`, `installFooter` and `createFooter` are `startup.ts`, `footer-setup.ts` and tests, and all were updated. A test (`jefferson.test.ts:271`) proves the value reaches the installed footer.
- **Spec coverage.** Each scenario in the delta has a test: two rows, one row, gap 2, gap 3, gap 0, a gap beside either shape, the bad values, and the misspelt key. The `shortcut:` comment on the silent unknown key names its limit, so I treat it as a decision.
- **Tests.** The 35 moved expectations either pass `rowGap` 0 to keep line 0 as the row, or assert the exact new line list. They assert exact values, not looser ones.
- **Docs.** README, `ARCHITECTURE.md`, `AGENTS.md` and ADR 0008 agree with the code. The ADR states the reliance on pi-tui's undocumented behavior. `peerDependencies` is `*`, so a future pi-tui could change that behavior. The ADR names this risk and its fallback, so it is a recorded decision and not a finding.
- **Scope.** Nothing in the code goes beyond the proposal: no per-row setting, no unknown-key rule, no `setStatus` work.

Verdict: Ship.

Not checked: how the gap lines behave in a live pi, in fullscreen mode on a short terminal, or against pi-tui 1.5.0. I only read the allocator and ran the pinned 1.4.0. The PR and ADR already say this is unrun and that Joel's observation (task 7.1) covers it.
