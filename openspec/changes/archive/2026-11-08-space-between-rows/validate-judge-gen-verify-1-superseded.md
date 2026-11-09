# Verification Report: space-between-rows

Using change: `space-between-rows` (schema `marbleization`). Branch `space-between-rows`, head `031c51af088cb1faa1aa21b7525e46622a44cf41`. Working tree clean.

## What I ran
| Command | Printed |
|---|---|
| `pnpm typecheck` | `tsc --noEmit` with no errors. |
| `pnpm test` | `tests 308`, `pass 308`, `fail 0`, `cancelled 0`, `skipped 0`. |
| `openspec validate space-between-rows --strict` | `Change 'space-between-rows' is valid`. |
| `openspec instructions apply --change space-between-rows --json` | `progress`: total 26, complete 22, remaining 4. |

## Summary
| Dimension | Status |
|---|---|
| Completeness | 22/26 tasks. The 4 open ones are 7.1 and 8.1–8.3, as the brief expects. 4 requirements (2 MODIFIED, 2 ADDED), all with code present. |
| Correctness | 4/4 requirements implemented. All 14 scenarios are covered by code and tests. One wording loss in a MODIFIED requirement (W1). |
| Coherence | The design is followed (decisions 1–9). Code follows the project's patterns. One docs/spec nit (S1). |

## Completeness
- **Tasks.** 1.1–6.1 are ticked, and the code and tests bear them out. Open: 7.1 (the owner's live observation), 8.1 (the 500-character measure), 8.2 (sync), 8.3 (archive). These are the post-verification steps, so they are not findings.
- **Spec coverage.** The delta has no REMOVED or RENAMED entries. Every ADDED or MODIFIED requirement has an implementation:
  - *The statusline renders the declared rows*: `extensions/jefferson/visuals/row-renderer.ts` builds the footer tree. The footer still installs only in TUI mode (`startup.ts`, unchanged).
  - *A row is one line tall*: the gap lines come from the stack (`row-renderer.ts:115–117`), not from a row or a cell. Cell clipping is untouched.
  - *The footer has space above its first row and between its rows*: `new VStack([new Spacer(0), ...rowStacks], { gap: rowGap })` at `row-renderer.ts:117`, with `DEFAULT_ROW_GAP = 1` at `configuration.ts:66`. Every footer is built through this one path, so one-row, default-row and no-document footers all get the space.
  - *rowGap sets the space above row one and between rows*: the read and validation are at `configuration.ts:252–264`.
    - It is read beside either envelope and is not in the conflict keys.
    - It runs before `instruments` is read.
    - The ceiling is 3 (`MAX_ROW_GAP`).
    - The reason string matches design 4.
    - All three non-throw returns carry the default (`:314`, `:322`, `:339`).
    - It is threaded `startup.ts:49,59` → `footer-setup.ts:14,23` → `createFooter`.
- **Write-ups in 8.1 terms (ahead of the task).** I measured each requirement's lead paragraph. All are under 500 characters: 250, 465, 312 and 416. 8.1 is still open and I did not tick it.

## Correctness
Scenarios (all covered):
- Two rows give `["", row, "", row]`: `row-renderer.test.ts:291`.
- One row: `:286`.
- Three rows give six lines: `:266–296`.
- `rowGap` 2: `:306`.
- `rowGap` 3: `configuration.test.ts:507`.
- `rowGap` 0 gives today's lines: `row-renderer.test.ts:311`.
- `rowGap` beside `rows` and beside a single row: `configuration.test.ts:516`.
- The six invalid values (`-1`, `1.5`, `"1"`, `null`, `4`, `1e21`): `:494–496`.
- A misspelt `rowgap`: `:526`.
- Other refusals and an unreadable file keep the default gap: `:534`; the absent file: `:75`.
- Threading end to end: `jefferson.test.ts:271`.
- Error precedence: `configuration.test.ts:933–938`.
- The "A row is one line tall" scenarios (clipping, control characters) are kept in the pre-existing tests, rewritten with the new line indexes (`format.test.ts`, `jefferson.test.ts`).

Edge cases checked by reading the code:
- `null` is rejected (typeof check).
- `JSON.stringify(1e21)` renders as `1e+21`, so the warning names the value.
- `NaN` and `Infinity` cannot come from JSON.
- `Number.isInteger` plus the bounds covers the rest.

### WARNING
- **W1. The MODIFIED "A row is one line tall" drops a clause from the living requirement.** The baseline (`openspec/specs/statusline/spec.md:208–211`) ends: "…and no instrument output may add a line to the footer." The delta text (`specs/statusline/spec.md`, requirement "A row is one line tall") no longer carries it. Its place is taken by "Any vertical space between rows MUST come from the footer's stack…". The proposal's "What changes" does not announce the loss, and the proposal says only the "height is the number of declared rows" half changes. Once synced (8.2), the living spec will no longer say instrument output cannot add a footer line. The behavior is unchanged: cells still clip to one line, and the "multiple lines" scenario still holds. The rule just disappears from the spec.
  - Recommendation: before 8.2, either restore the clause in the delta (for example "…, and no instrument output may add a line to the footer") or add a line to the proposal saying it is retired deliberately. Mind the 500-character limit in 8.1: that paragraph is at 465, so restoring the clause (about 60 characters) will push it over. It would need trimming or splitting.

## Coherence
Design adherence: no contradictions.
- Decision 1/2: a `VStack` with `gap` and a leading `Spacer(0)` (shape (a)), with the comment at `row-renderer.ts:115–116`.
- Decision 3: constants are unexported (`configuration.ts:66–67`), so the export-surface guard is untouched.
- Decision 4: the read is in `normalizeDocument`, with the `shortcut:` comment (`:254–257`).
- Decision 5: `createFooter(rows, sample, theme, rowGap)`, last, no default.
- Decision 6: all three returns carry the default.
- Decision 9: README, ARCHITECTURE and ADR 0008 are done; the README `distribution`/`rows` sentence now names `rowGap`.

Code pattern consistency: the new code matches the surrounding style (named constants beside `DEFAULT_CELLS`, `RejectedConfiguration` for refusals, the `.ts` import extension, no non-erasable TypeScript). The ADR is numbered and formatted like its neighbors. No dependency changes.

### SUGGESTION
- **S1. The spec's "Both configuration shapes normalize to a list of rows" is not touched.** It says "a configuration that carries both shapes at once MUST be rejected", and the new `rowGap` scenario says `rowGap` beside `rows` "is not a conflict". The scenario states the exception, so there is no contradiction a reader would trip on. The README does name it. You could leave it as is. If you want it explicit, say so in the first requirement at sync time. Not a blocker.
- **S2. `AGENTS.md` gained a "Testing the footer's height" section that design 9 does not list among the docs sites.** It is useful and accurate, with no conflict. Mention it in the PR description so the reviewer is not surprised.

## Issues by priority
- **CRITICAL:** none.
- **WARNING:** 1 (W1).
- **SUGGESTION:** 2 (S1, S2).

## Not verified
- The live behavior (the blank line under the editor with and without the fleet-status row, the fullscreen truncation, a newer pi-tui's handling of a zero-line child). It is task 7.1, which is the owner's, and the suite pins the behavior only at pi-tui 1.4.0.
- The merge-ready state of 8.1–8.3, which come after this pass.

## Final assessment
No critical issues found in the checks that ran. 1 warning (W1) and 2 suggestions to consider. Live observation (7.1) is not verified, and it is not mine to verify. Fix or consciously accept W1 before the sync in 8.2, since that is the point where the clause is lost from the living spec.
