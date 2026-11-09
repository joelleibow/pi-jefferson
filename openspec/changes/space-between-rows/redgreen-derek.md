# Red/green proof of every check (Derek, scratch spike)

Joel's ruling: *"Before drafting tasks, run every check a task relies on and show it go red and green."* Derek run `31e2c477-ec7e-41e6-9121-d4e5de77aa91`, 2026-11-08, in the throwaway worktree `/tmp/sbr-spike` on branch `space-between-rows-spike` (red `4d3aa7a`, green `8567a57`, both on `16da136`). Nothing here ships; Implement rebuilds from `tasks.md`. Conductor rulings during the run: existing end-to-end reads move to the row line's new index (option a); `DEFAULT_ROW_GAP` and `MAX_ROW_GAP` stay unexported. Transcribed verbatim from his report.

All checks are done and the tree is clean. Here is the report.

## What is done and what is not

Every check design decision 8 names is written, shown red on `16da136`'s code at its own assertion, green after the smallest change the design specifies, and shown to bite by reverting each piece in turn. Two commits in `/tmp/sbr-spike`: `4d3aa7a` (red), `8567a57` (green). `pnpm typecheck` clean, `pnpm test` 308/308, `openspec validate space-between-rows --strict` valid. Not done: no live-pi run (out of scope here), and nothing ship-able — reverts were worked and reverted, not committed.

## Spike commits

| commit | what |
|---|---|
| `4d3aa7a` | Red: 12 new tests + 3 rewritten line-count tests; every one fails at its assertion |
| `8567a57` | Green: `DEFAULT_ROW_GAP`/`MAX_ROW_GAP`, the `rowGap` read and refusal, the threading, and `VStack([Spacer(0), …], { gap: rowGap })` |

## Each check: red line, green, and what turns it red

All commands are `pnpm test` (whole suite) at the spike root; "red run" is `4d3aa7a`'s tests against `16da136`'s `extensions/`.

| check (test, file:line now) | red output line | green | reverts that turn it red |
|---|---|---|---|
| one row renders `["", row]` — `tests/row-renderer.test.ts:286` | `:288` `actual: [row] expected: ['', row]` | pass | A, B, E |
| two rows render `["", row, "", row]` — `:291` | `:293` `actual: [row,row] expected: ['',row,'',row]` | pass | A, B, E |
| three rows render six lines — `:296` | `:303` `actual: 3 lines expected: 6` | pass | A, B, E |
| `rowGap: 2` → two empty lines in each place — `:306` | `:308` `actual: [r,r] expected: ['','',r,'','',r]` | pass | A, B, E |
| `rowGap: 0` → the pre-change lines, one and two rows — `:311` | **passes on today's code, by design** (it asserts today's lines) | pass | **A2 only** (see below) |
| absent `rowGap` renders one empty line in each place — `tests/configuration.test.ts:486` | `:489` `actual: undefined expected: 1` | pass | A, B, E |
| `-1, 1.5, "1", null, 4, 1e21` refused, default row with one empty line — `:493` | `:495` `actual: undefined expected: '…was rejected (rowGap must be a whole number from 0 to 3: -1)…'` | pass | C (first value that stops being refused is `4`), D, D2; A/B/E for its render half |
| `3` accepted, three empty lines in each place — `:506` | `:509` `actual: undefined expected: 3` | pass | A, B, E; D2 |
| `rowGap` beside `rows` and beside a single top-level row — `:515` | `:518` `actual: undefined expected: 2` | pass | **D2 only** (read-time check) |
| misspelt `rowgap` ignored, no warning, default space — `:525` | `:529` `actual: undefined expected: 1` | pass | A, B, E |
| other-reason refusal + unparseable file carry the default gap — `:533` | `:536` `actual: undefined expected: 1` | pass | A, B, E |
| the value is threaded through `startUp` — `tests/jefferson.test.ts:266` | `:272` `actual: 2 expected: 6` | pass | E (also A, B) |
| rewritten: empty line then one line per row, in order — `tests/row-renderer.test.ts:266` | `:274` `actual: 3 expected: 6` | pass | A, B, E |
| rewritten: invalidation keeps three rows and their gaps — `:407` | `:416` `actual: 3 expected: 6` | pass | A, B, E |
| rewritten: every column allocated at any width — `:759` | `:773` `actual: 6 expected: 11` (my draft's arithmetic; 6 rows carry 6 gaps → 12) | pass | A, B, E |
| rewritten: trusted project's two rows — `tests/jefferson.test.ts:262` | `:262` `actual: 2 expected: 4` | pass | A, B, E |
| rewritten: rejected configuration renders the default row — `:286` | `:286` `actual: 1 expected: 2` | pass | A, B, E |
| **seventh**, found here: formats carrying controls keep three rows — `tests/format.test.ts:170` | `:177` `actual: 6 expected: 3` (call site given the real gap, old body kept) | pass | A, B, E |

Reverts, each run and then restored from `8567a57`:

| # | revert | result |
|---|---|---|
| A | `new Spacer(0)` removed | 44 red / 264 pass |
| A2 | `new Spacer(0)` → `new Spacer(1)` (a hardcoded leading line — the "fix" a reader might make) | 94 red, including the `rowGap: 0` check with `+ ''` |
| B | `{ gap: rowGap }` → `{ gap: 0 }` | 44 red / 264 pass |
| C | `\|\| value > MAX_ROW_GAP` dropped | 1 red: the invalid-value check, at value `4` |
| D | the whole validation dropped (`rowGap = doc.rowGap as number`) | 1 red: the same check |
| D2 | `"rowGap"` added to the envelope-conflict keys | 3 red: invalid-value, `rowGap 3`, shapes |
| E | `rowGap` removed from `startUp`'s `installFooter` call | typecheck `TS2741` at `startup.ts:57`; 31 red / 277 pass, incl. the threading check |

The `rowGap: 0` check is the one that cannot go red on today's code: today's footer *is* gap 0, so it is a regression guard, not a new behavior. Its bite is A2. Reported as such rather than counted as a fifth red.

## Final counts

- `pnpm typecheck` → `$ tsc --noEmit`, no output (clean).
- `pnpm test` → `ℹ tests 308 / ℹ pass 308 / ℹ fail 0` (296 before, +12 new).
- `openspec validate space-between-rows --strict` → `Change 'space-between-rows' is valid`.
- `git status` → clean, nothing staged.

## What this run contradicts in the design/spec

1. **Decision 8 counts six line-count assertions; there are seven.** `tests/format.test.ts:170` also equates the footer's line count with its row count, and there are more single-line readers than that: 28 existing end-to-end tests in `tests/jefferson.test.ts` read their row at `lines(w)[0]`, which is the gap line now. I asked; the conductor ruled (a): point each read at the row line's new index, each test keeping its subject. Every moved expectation is listed above and below. Bambadjan should correct decision 8 from this list.
2. **Decision 3's "beside `DEFAULT_CELLS` and `MAX_CELLS`"**: those two are exported; `DEFAULT_ROW_GAP`/`MAX_ROW_GAP` are not, because nothing outside the reader consumes them and exporting them would force an edit to the exported-surface guard (`tests/jefferson.test.ts:313`). Conductor agreed. If a task wants them public, that guard needs its third edit.
3. **Decision 4 leaves error precedence open.** The reader now refuses a bad `rowGap` before it reads `instruments`, so `{ instruments: {model: {format: 42}}, rowGap: 1.5 }` warns about `rowGap`. The existing precedence test does not cover `rowGap`, so nothing pins this either way; it is the only order I chose that the design does not state.
4. Confirmed, not contradicted: `Spacer(0)` contributes a gap and adds no line (`v-stack.js:13–22`, `stack.js:55–57` on the pinned 1.4.0); gap lines come back as the bare `""`, never a frame; `three rows render six lines` is right and generalises to 2n.

## My calls inside the contract

- `rowGap` is the last parameter of `createFooter(rows, sample, theme, rowGap)`: appending is the smallest diff and it makes the red assertion-level (an extra argument is ignored, not a `TypeError`).
- Tests state the default as the literal `1`; the constant stays the one home in production, and a literal keeps the "absent leaves 1" and "1 renders these lines" checks non-circular.
- The refusal message interpolates `MAX_ROW_GAP`, so the ceiling has one home and the text is still exactly decision 4's.
- `rowGap: 0` is passed explicitly at the 20 `createFooter` call sites whose assertions are about horizontal geometry (18 in `tests/row-renderer.test.ts`, `footerFor` in `tests/configuration.test.ts`, one in `tests/instrument.test.ts`), so line 0 stays the row line there.

## Existing expectations that moved (for the tasks draft)

`tests/jefferson.test.ts`, all `[0]`→`[1]` unless stated: `:262` 2→4 lines · `:286` 1→2 lines and `[0]`→`[1]`, `[0]` is `""` · `:305`, `:428`, `:443`, `:452`, `:454`, `:460`, `:476`, `:556`, `:569`, `:589`, `:627`, `:632`, `:650`, `:667`, `:670`, `:671`, `:681`, `:716`, `:726`, `:731`, `:751`, `:774`, `:782`, `:793`, `:811`, `:821` · `:378` 1→2 lines plus `[0]` is `""` · `:394` and `:508` `const [line]`→`const [, line]` · `:602` 1→2 lines, `:604` `[0]`→`[1]`.
`tests/row-renderer.test.ts`: `:266`, `:407`, `:759` rewritten for the new counts; 18 call sites given `, 0`.
`tests/format.test.ts`: `:170` rewritten (seventh).

## Docs for Bambadjan (nothing edited)

`ARCHITECTURE.md:3` ("one footer line per configured row") and `ARCHITECTURE.md:76` ("`gap: 0`") are the two sites decision 9 names, confirmed. Beyond it: `README.md:77` says "`distribution` belongs on a row; beside a `rows` list it rejects the document" — true, but it now needs `rowGap` named as the one key allowed beside either envelope, or a reader infers no top-level key may sit beside `rows`.

## Not verified

- No live pi: leading blank line under the editor and fullscreen truncation are unobserved (design's own open question; Joel's session covers them).
- Only pi-tui 1.4.0 was exercised; a host on a newer version that changes a zero-line child's gap would break decision 2's shape silently, exactly as the design's risk note says.
- The worktree carries a pre-existing `stash@{0}` from branch `cells-as-objects`; I left it untouched.