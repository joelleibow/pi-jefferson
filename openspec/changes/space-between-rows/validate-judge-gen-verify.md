# Verification Report: space-between-rows

Head reviewed: `59d64d0a2a6836584c7b4ac99e096de393e5a1d4` on branch `space-between-rows`. The working tree is clean.
I did not read the earlier `validate-judge-gen-*.md` files, the council, the rulings or the research reports. I read `proposal.md`, `specs/statusline/spec.md`, `design.md` and `tasks.md`, and I read the code and docs diff.

## What I ran

| Command | Printed |
|---|---|
| `pnpm typecheck` | `tsc --noEmit`, no diagnostics, exit 0 |
| `pnpm test` | `tests 309`, `pass 309`, `fail 0`, `cancelled 0`, `skipped 0` |
| `openspec validate space-between-rows --strict` | `Change 'space-between-rows' is valid` |
| `openspec instructions apply --change space-between-rows --json` | progress `total 26`, `complete 22`, `remaining 4` |
| Spec paragraph lengths (my own count, for task 8.1) | 250, 477, 257 and 424 characters. All are under 500. |

## Summary

| Dimension | Status |
|---|---|
| Completeness | 22/26 tasks. The 4 open tasks are 7.1 and 8.1–8.3, all expected. 4 requirements in the delta (2 MODIFIED, 2 ADDED), all implemented. |
| Correctness | 4/4 requirements covered. All 13 scenarios have an implementation and a test. |
| Coherence | Followed. All 7 design decisions match the code. Docs pass done as decision 9 lists. |

## Completeness

- **Tasks.** Tasks 1.1–6.1 are ticked, and what they claim holds. The suite is at `tests 309 / pass 309 / fail 0`, typecheck is clean and validation is green, as tasks 1.11, 5.1, 5.2 and 5.3 say.
- **Open tasks, all expected.**
  - 7.1 is the owner's live observation.
  - 8.1 to 8.3 are sync and archive.
  - Task 8.1's measure comes out under 500 for every requirement paragraph. I measured it only. Sync and archive remain to do.
- **Spec coverage.** There are no REMOVED or RENAMED entries. This is the check of what exists in the code:
  - `rowGap` is read and validated at `extensions/jefferson/configuration.ts:252-264`.
  - `Configuration.rowGap` is at `configuration.ts:55`.
  - The three returns carry the default at `:314`, `:322` and `:337` (the absent-file return, the unreadable-file return and the refusal return).
  - The value is passed on at `startup.ts:49,59`, `footer-setup.ts:14,23` and `visuals/row-renderer.ts:33,115`.

## Correctness

| Requirement | Evidence |
|---|---|
| The statusline renders the declared rows (modified) | The TUI two-row scenario is in `tests/jefferson.test.ts:257`. The non-TUI scenario is unchanged. |
| A row is one line tall (modified) | Height of five lines for three rows: `tests/row-renderer.test.ts:296` and `tests/format.test.ts:170`. Each row alone is one line, and the gap is a bare `""` in the stack: `row-renderer.ts:115`. |
| The footer has space between its rows and none above the first (added) | Two rows: `row-renderer.test.ts:291`. One row: `:286`. The default row: `jefferson.test.ts:231`. No `Spacer` remains anywhere under `extensions/`. |
| rowGap sets the space between rows (added) | See the scenario list below. |

Scenarios under `rowGap sets the space between rows`:
- The value 2: `row-renderer.test.ts:306`.
- The value 3: `:311` and `configuration.test.ts:506`.
- The value 0, one row and two rows: `row-renderer.test.ts:316`.
- Beside either shape: `configuration.test.ts:515`.
- `-1`, `1.5`, `"1"`, `null`, `4` and `1e21` refused with the warning that names `rowGap` and the value: `configuration.test.ts:494`.
- A misspelt key ignored: `:525`.

Divergence checks:
- The rejection message, `rowGap must be a whole number from 0 to 3: ${JSON.stringify(value)}`, matches design decision 4 and the spec's "names `rowGap` and the value".
- `rowGap` is not among the keys that conflict with `rows`. It is read before `readInstruments`, which is the precedence the design pins at `configuration.test.ts:934`.
- `rowGap: 0` gives `VStack gap: 0`, which is the old tree.
- `typeof value !== "number"` precedes `Number.isInteger`. `null` and a string are therefore refused, and nothing reaches `VStack` unvalidated.

## Coherence

- **Design adherence.**
  - Decision 1: the stack's `gap` is the whole mechanism.
  - Decision 2: there is no `Spacer`, no import and no leading line.
  - Decision 3: the constants are `DEFAULT_ROW_GAP = 1` and `MAX_ROW_GAP = 3`, both unexported (`configuration.ts:66-67`).
  - Decision 5: the signature is `createFooter(rows, sample, theme, rowGap)` with `rowGap` last and no default. Typecheck would fail on any caller that omitted it.
  - Decision 6: all three returns carry the default.
  - Decision 7: the `shortcut:` comment sits beside the read, at `configuration.ts:253-256`.
  - Decision 8: the tests are rewritten, not loosened.
  - Decision 9: `README.md`, `ARCHITECTURE.md`, `AGENTS.md` and ADR 0008 are corrected as listed, and no mention of a leading `Spacer(0)` or a space above row one is left in current docs. The `AGENTS.md` link to ADR 0008 and the `ARCHITECTURE.md` link both resolve.
- **Code pattern consistency.** The change follows the surrounding code: the `RejectedConfiguration` path, the `distribution` read-and-throw precedent, erasable TypeScript only and the `.ts` import extensions. No deviations.

## Issues

**CRITICAL:** none.

**WARNING:** none.

**SUGGESTION:**
1. `tasks.md` still gives test and source line numbers from the spike (for example `:286`, `:316`). The suite states they may shift. The ones I spot-checked match the branch, so this is only a note for the archive. The archived record is the source of those references. No action is needed.
2. The task 7.1 text ties the owner's observation to the committed build. I confirmed the build matches that shape: `new VStack(rowViews.map(({ stack }) => stack), { gap: rowGap })`, no `Spacer` (`row-renderer.ts:115`). The conductor can tick 7.1 on that basis.

## Not verified

- The live behaviour in a running pi, including fullscreen truncation of a squeezed footer. The design records it as unrun, and task 7.1 covers the owner's look.
- Sync of the delta into `openspec/specs/` and archive (tasks 8.2 and 8.3). They have not been done, and the living `statusline` spec still carries the old "number of declared rows" wording at `openspec/specs/statusline/spec.md:209`. That is expected until sync.

## Final assessment

No critical issues and no warnings in the checks that ran. There are 2 suggestions, neither needing action. All applicable checks ran. The remaining open work is 7.1 (the owner's observation) and 8.1 to 8.3 (sync and archive), which the brief places after this pass.

**Verdict: ready for archive once task 7.1 is ticked and sync and archive are done.**
