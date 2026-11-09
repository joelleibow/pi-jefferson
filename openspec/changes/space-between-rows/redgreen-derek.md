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

## Second run: two checks from the tasks gate

Derek run `f6e2a03d-eb79-4f0a-85f0-fc1c775e1ad6`, spike commit `6b9bf1d`, for Michael's PL7 findings 1 and 2. Transcribed verbatim.

Both checks are in, red, green and biting, all in `/tmp/sbr-spike`; the recount of `4d3aa7a` matches Michael's 16 exactly. Nothing in `extensions/` changed this run — the green was already there at `8567a57`.

## Spike commit

`6b9bf1d` — "Two more checks: rowGap's precedence, and the gap when no document exists" (tests only; on top of `4d3aa7a` red, `8567a57` green). Working tree clean, nothing staged.

## Check 1 — precedence

| | |
|---|---|
| test | `error precedence reads the envelope and the rowGap before instruments and instruments before cells` |
| file:line | `tests/configuration.test.ts:933`, the added assertion at `:938` |
| **red** (`16da136`'s `extensions/`, this test) | fails at `tests/configuration.test.ts:938:3` via `rejected` at `:828:10` — `actual: '…was rejected (instrument "model" has a format that is not a string); rendering the default row'` vs `expected: '…was rejected (rowGap must be a whole number from 0 to 3: 1.5); rendering the default row'` |
| **green** at `8567a57` | pass |
| **bite** (the `rowGap` read moved below `readInstruments`, then restored) | 1 fail / 307 pass — this same test, same line, same actual warning |

Full red run for context: against `16da136`'s `extensions/` the suite is 308 tests, 260 pass, 48 fail (the whole rowGap surface, including these two checks).

Note for the tasks draft: this check settles the one order the design left open — a bad `rowGap` now answers before a bad `instruments` section, and a test pins it. My first report listed that as an unpinned choice; it no longer is.

## Check 2 — the no-document path

| | |
|---|---|
| test A | `an absent configuration yields the default row and the default gap, with no warning` — `tests/configuration.test.ts:75`, the new assertion at `:85` (`rowGap === 1` on the absent-file return, `configuration.ts:308`) |
| test B (end to end) | `the session_start handler installs the footer in TUI mode` — `tests/jefferson.test.ts:231`, new assertions at `:238`–`:241` (two lines, `''` first, a 80-column row second) |
| **red** (`16da136`) | A: `tests/configuration.test.ts:85:10` `AssertionError: no document to set a gap, so the default one` — `undefined !== 1` · B: `tests/jefferson.test.ts:238:10` `the default row under one empty line` — `1 !== 2` |
| **green** at `8567a57` | both pass, 308/308 |
| **bite** (`rowGap: 0` at the absent-file return, `configuration.ts:308`, then restored) | 3 fail / 305 pass: A at `:85` (`0 !== 1`) · B at `:238` (`1 !== 2`) · `the default row of ten blank cells is unchanged` at `tests/jefferson.test.ts:799` (`0 !== 132` — that test's session also has no document, so its row line moved to index 0) |

## Re-count of the red commit `4d3aa7a` against `16da136`'s code

Confirmed: **308 tests, 292 pass, 16 fail** — Michael's 16. Composition: **11 of the 12 new checks red, plus 5 rewritten assertions.**

New checks, 11 red (test line / assertion line, output):

| test | assertion line | red output |
|---|---|---|
| absent rowGap renders one empty line in each place (`configuration.test.ts:486`) | `:490` | `undefined !== 1` ("absent leaves the default") |
| invalid rowGap refused, default row with one empty line (`:493`) | `:495` | `actual: undefined` vs `expected: '…was rejected (rowGap must be a whole number from 0 to 3: -1)…'` |
| rowGap 3 accepted, three empty lines in each place (`:506`) | `:510` | `undefined !== 3` |
| rowGap beside `rows` and beside a single top-level row (`:515`) | `:519` | `undefined !== 2` |
| misspelt `rowgap` ignored, default space (`:525`) | `:530` | `undefined !== 1` |
| other-reason refusal + unparseable file carry the default gap (`:533`) | `:537` | `undefined !== 1` |
| the value is threaded through `startUp` (`jefferson.test.ts:266`) | `:277` | `2 !== 6` |
| one row renders an empty line above it (`row-renderer.test.ts:286`) | `:288` | `actual: [row]` vs `expected: ['', row]` |
| two rows render an empty line above and between (`:291`) | `:293` | `actual: [row,row]` vs `expected: ['',row,'',row]` |
| three rows render six lines (`:296`) | `:303` | `actual: [3 rows]` vs `[6 lines]` |
| a gap of two renders two empty lines in each place (`:306`) | `:308` | `actual: [r,r]` vs `['','',r,'','',r]` |

The 12th new check — `a gap of zero renders the lines the footer rendered before the space existed` (`row-renderer.test.ts:311`) — **passes on today's code by design**: today's footer *is* gap 0, so it is a regression guard, not a new behavior. That is the one test in the session that cannot go red on today's code; run 1 proved its bite separately by making the leading spacer `Spacer(1)` (extra `''` at gap 0).

The 5 rewritten assertions, all red:

| test | assertion line | red output |
|---|---|---|
| empty line then one line per row, in order (`row-renderer.test.ts:266`) | `:274` | `3 !== 6` |
| invalidation keeps three rows and their gaps (`:407`) | `:416` | `3 !== 6` |
| every column allocated at any width (`:759`) | `:773` | `6 !== 11` (my draft's arithmetic; the right count is 6 rows + 6 gaps = 12, fixed in the green commit) |
| a trusted project's document wins end to end (`jefferson.test.ts:253`) | `:262` | `2 !== 4` |
| a rejected configuration warns and installs the default row (`:278`) | `:286` | `1 !== 2` |

Still to carry into `tasks.md`: the seventh line-count assertion (`tests/format.test.ts:170`) is **not** in `4d3aa7a` — it was rewritten in the green commit, so it is outside this 16. Its own red (`actual: 6, expected: 3` at `format.test.ts:177`) was demonstrated in run 1 with the call site given the real gap and the old body kept.

## New totals at HEAD

- `pnpm typecheck` → `$ tsc --noEmit`, no diagnostics.
- `pnpm test` → `ℹ tests 308 / ℹ suites 0 / ℹ pass 308 / ℹ fail 0` (count unchanged: this run extended three existing tests, added none).
- `openspec validate space-between-rows --strict` → `Change 'space-between-rows' is valid`.
- `git status` → clean, nothing staged.

## Not verified

- No live pi (unchanged from run 1); both new checks are at the reader and the install seam, which the harness reaches directly.
- I did not open `michael-pl7.json` in the main repo — the brief's two findings were sufficient and that repo is off limits.

## Third run: Joel's live-observation rulings (no space above row one)

Derek run `90c87dc0-9f4e-4df4-8d75-c52cd0faa646`, spike commits `dace62e` (red), `89c0667` (green), `1732a55` (doc comments), on `e9eae2c`. Supersedes the first two runs wherever they count a leading line. Transcribed verbatim.

Done. Everything the brief asked for is built, measured and restored.

## Report

The ruling's change is in: the `Spacer(0)` is out, the footer's `VStack` is the rows alone, and every check the ruling changes is rewritten to the new line lists — red on `e9eae2c`, green after the one-line change, and each piece reverted and measured. Nothing is left staged or uncommitted.

### Spike commits (`/tmp/sbr-spike`, branch `space-between-rows-spike`)

| commit | what |
|---|---|
| `dace62e` | Red: rewrite the checks for no space above row one |
| `89c0667` | Green: the stack's gap alone, no Spacer above row one |
| `1732a55` | Correct the rowGap doc comments: the space is between rows only |

### The red run — `pnpm test` on `e9eae2c`'s code, tests rewritten

`ℹ tests 309 / ℹ pass 263 / ℹ fail 46`. 309 because I added one check the brief asks for (`rowGap: 3` in the renderer); the suite was 308. Every one of the 46 fails at its own assertion — no `TypeError`, no import error. `pnpm typecheck` clean.

### Each check: red line, green, bite

**`tests/row-renderer.test.ts`**

| check (test line) | red assertion | red output | bites |
|---|---|---|---|
| one line per row with an empty line between (`:266`) | `:274` | `actual 6 expected 5` (length) | i, ii |
| one row renders one line (`:286`) | `:288` | `actual ['', row] expected [row]` | i |
| two rows render one empty line between (`:291`) | `:293` | `actual ['',r,'',r] expected [r,'',r]` | i, ii |
| three rows render five lines (`:296`) | `:303` | `actual 6 lines expected 5` | i, ii |
| a gap of two between the rows (`:306`) | `:308` | `actual ['','',r,'','',r] expected [r,'','',r]` | i, ii |
| a gap of three between the rows (`:311`, **new**) | `:313` | `actual ['','','',r,'','','',r] expected [r,'','','',r]` | i, ii |
| a gap of zero renders the pre-change lines (`:316`) | — **passes on `e9eae2c`** | by design: today's footer is gap 0; this is the regression guard | none; its subject is the guard |
| invalidation keeps three rows and their gaps (`:412`) | `:421` | `actual 6 expected 5` | i, ii |
| every column allocated at any width (`:764`) | `:778` | `actual 12 expected 11` | i, ii |

**`tests/configuration.test.ts`**

| check | red | output | bites |
|---|---|---|---|
| absent `rowGap` renders one empty line between the rows (`:487`) | `:491` | `actual ['',M,'',M] expected [M,'',M]` | i, ii |
| a non-whole/out-of-range `rowGap` refused, default row one line (`:494`) | `:502` | `actual 2 expected 1` | i, ii, **iii** |
| `rowGap` 3 accepted, three lines between the rows (`:506`) | `:510` | `actual ['','','',M,'','','',M] expected [M,'','','',M]` | i, ii |
| a misspelt `rowgap` ignored, default space (`:525`) | `:530` | `actual ['',M,'',M] expected [M,'',M]` | i, ii |
| a refusal and an unparseable file render the default gap (`:533`) | `:538` | `actual 2 expected 1` | i, ii |
| error precedence: envelope and rowGap before instruments (`:934`) | `:939` | warning about the instrument's format, not `rowGap` | **iv** |

**`tests/format.test.ts`**

| check | red | output | bites |
|---|---|---|---|
| formats carrying controls keep three rows at one line each (`:170`) | `:177` | `actual 6 expected 5` | i, ii |

**`tests/jefferson.test.ts`** — the 28 end-to-end reads moved to `[0]`, plus the line-count rewrites. Every one is red at its own assertion:

| check | red | output | bites |
|---|---|---|---|
| the session_start handler installs the footer (`:231`) | `:238` | `actual 2 expected 1` | i |
| a trusted project's document wins (`:257`) | `:266` | `actual 4 expected 3` | i, ii, **vi** |
| a `rowGap` read reaches the footer (`:270`) | `:276` | `actual 6 expected 4` | i, ii, **vi** |
| a rejected configuration still installs the default row (`:282`) | `:290` | `actual 2 expected 1` | i |
| a right-aligned cell ends at the right edge (`:299`) | `:309` | row text read from the gap line (`false`) | i |
| an untrusted project's document is ignored (`:373`) | `:381` | `actual 2 expected 1` | i |
| a `<reason>` session renders its seed (×5, `:385`) | `:397` | model text read from the gap line | i |
| a model selection push (`:419`) | `:430` | startsWith false | i |
| a thinking-level push (`:434`) | `:445` | includes false | i |
| the thinking cell follows the label path (`:449`) | `:454`, `:457`, `:459`, `:465` | includes false | i |
| a push of held values requests no repaint (`:481`) | `:478` | startsWith false | i |
| a second session_start releases the first (`:519`) | `:511` | second context read from the gap line | i |
| disposing then replacing releases once (`:564`) | `:557` | `actual ' '×80 …` vs `['', ' '×80]` | i |
| configured formats … end to end (`:583`) | `:577` | `actual ['', line] expected [line]` | i |
| … under equal distribution (`:598`) | `:592` | same | i |
| a rejected style installs the default footer (`:604`) | `:604` | `actual 2 expected 1` | i |
| a turn boundary repaints changed totals (`:623`) | `:628` | line read from the gap line | i |
| an unchanged turn boundary before first render (`:643`) | `:651` | same | i |
| a `<reason>` replacement drops the old context (×4, `:656`) | `:668`, `:671` | same | i |
| a session without context usage (`:678`) | `:682` | same | i |
| Joel's top row (`:738`) | `:753` | `actual ['', line]` | i |
| Joel's second row (`:760`) | `:776` | same | i |
| a bar takes only its cell's columns (`:789`) | `:783` | same | i |
| the default row of ten blank cells (`:804`) | `:813` | same | i |
| distribution equal restores equal shares (`:816`, `:822`) | `:812` | same | i |

The one rewritten check that **passes on `e9eae2c`**: `a gap of zero renders the lines the footer rendered before the space existed` (`tests/row-renderer.test.ts:316`). It is the regression guard, and its subject is today's lines; it passes before and after. Reported as the brief asks.

### The green change

`extensions/jefferson/visuals/row-renderer.ts`: `new VStack(rowViews.map(({ stack }) => stack), { gap: rowGap })`, with the `Spacer` import and its two-line comment removed. Nothing else in production changed. `pnpm typecheck` → `$ tsc --noEmit`, no diagnostics. `pnpm test` → `tests 309 / pass 309 / fail 0`.

### Bites — each piece reverted, measured, restored

| bite | revert | result |
|---|---|---|
| **(i)** | put the `Spacer(0)` back | **46 red**, 263 pass — every check that reads a row's line or counts the lines. The full list is the red run's 46. |
| **(ii)** | `{ gap: rowGap }` → `{ gap: 0 }` | **13 red**, 296 pass: absent `rowGap` (`configuration.test.ts:487`), `rowGap` 3 (`:506`), misspelt (`:525`), format controls (`format.test.ts:170`), trusted project (`jefferson.test.ts:257`), `rowGap` threading (`:270`), and `row-renderer.test.ts:266, :291, :296, :306, :311, :412, :764`. |
| **(iii)** | drop `\|\| value > MAX_ROW_GAP` | **1 red**, 308 pass: `configuration.test.ts:494` (the `4` and `1e21` refusals). |
| **(iv)** | move the `rowGap` read below `readInstruments` | **1 red**, 308 pass: `configuration.test.ts:934` (the precedence check). |
| **(v)** | `rowGap: 0` at the absent-file return | **1 red**, 308 pass: `configuration.test.ts:75` (`rowGap === 1`). The no-document session check does **not** go red: a single-row footer renders one line at gap 0 and at gap 1 alike, so only the `Configuration` value catches this return. |
| **(vi)** | drop `rowGap` from `startUp`'s `installFooter` call | `pnpm typecheck`: **`TS2741` at `startup.ts:57`**; **2 red**, 307 pass: `jefferson.test.ts:257` and `:270`. |

### Existing expectations that moved — file:line and old → new

**`tests/row-renderer.test.ts`**
- `:266` title "an empty line, then one line per row" → "one line per row … with an empty line between rows"; `:274` `6` → `5`; `:275` gaps `[0],[2],[4]` → `[1],[3]`; `:276` rows `[1],[3],[5]` → `[0],[2],[4]`.
- `:286` "one row renders an empty line above it" → "one row renders one line"; `:288` `["", row]` → `[row]`.
- `:291` "two rows render an empty line above row one and between them" → "…one empty line between them"; `:293` `["", r, "", r]` → `[r, "", r]`.
- `:296` "three rows render six lines" → "…five lines"; `:303` `["", r, "", r, "", r]` → `[r, "", r, "", r]`.
- `:306` "a gap of two … above row one and between the rows" → "…between the rows"; `:308` `["","",r,"","",r]` → `[r,"","",r]`.
- `:311` **new**: "a gap of three renders three empty lines between the rows".
- `:412`/`:421` invalidation `6` → `5`, message "an empty line above row one and between each pair" → "an empty line between each pair".
- `:764`/`:778` "six rows and six gaps" `12` → "six rows and five gaps" `11`; gap-line parity `index % 2 === 0` → `=== 1`.

**`tests/configuration.test.ts`**
- `:487` title loses "above row one"; `:491` `["",M,"",M]` → `[M,"",M]`.
- `:494`/`:502` `2` lines with `lines[0] === ""` → `1` line, width 20 at `[0]`.
- `:506` title "in each place" → "between the rows"; `:510` `["","","",M,"","","",M]` → `[M,"","","",M]`.
- `:525`/`:530` `["",M,"",M]` → `[M,"",M]`.
- `:533`/`:538` `render(40)[0] === ""` → one line of width 40 at `[0]`.

**`tests/format.test.ts`**
- `:170`/`:177` `6` lines → `5`; gap parity `=== 0` → `=== 1`; the second filter `index % 2 === 1` → `=== 0`.

**`tests/jefferson.test.ts`** — 28 reads `[1]` → `[0]` at `:308, :430, :445, :454, :456, :462, :478, :511, :557, :571, :591, :628, :633, :651, :668, :671, :672, :682, :717, :727, :732, :752, :775, :783, :794, :812, :822`; destructures `const [, line]` → `const [line]` at `:396` and `:510`; line-count rewrites at `:231` (2→1), `:257` (4→3), `:270` (6→4), `:282` (2→1), `:373` (2→1), `:604` (2→1).

### The 20 geometry call sites — is `rowGap` 0 still needed?

They all stay 0. I measured it: setting **all 20** to 1 leaves **2 checks red** — `a gap of zero …` (`row-renderer.test.ts:316`, its two-row call) and `each row seats its own basis on the first render` (`:348`). A third, the gap-zero guard's one-row call (`:312`), is 0 by its subject. **The other 17 are inert now**: each reads line 0 of a single-row footer, which is the row line with the spacer gone. They stay 0 because it costs nothing and keeps "line 0 is the row" explicit; removing it would be 17 edits with no behavior to prove.

### Final counts and validation

- `pnpm typecheck` → `$ tsc --noEmit`, no diagnostics.
- `pnpm test` → `ℹ tests 309 / ℹ pass 309 / ℹ fail 0 / ℹ skipped 0`.
- `openspec validate space-between-rows --strict` → `Change 'space-between-rows' is valid`; `openspec validate --changes --strict` → `✓ change/space-between-rows`, `Totals: 1 passed, 0 failed`.
- `git status` → clean, nothing staged.

### Markdown the change makes false (for Bambadjan)

Code comments I corrected in `extensions/jefferson/configuration.ts:55,221` (the `rowGap` doc comments no longer say "above row one"). These Markdown files are now false and I did not edit them:

1. **`AGENTS.md:37`** — "The footer's first line is an empty line, and so is every line between rows." The first line is row one; only lines between rows are empty.
2. **`AGENTS.md:40`** — "Do not remove the `Spacer(0)` in `createFooter`; ADR 0008 says why." There is no `Spacer(0)`; the stack's `gap` alone carries the space.
3. **`ARCHITECTURE.md:3`** — "…with empty lines above the first row and between rows." Now between rows only.
4. **`ARCHITECTURE.md:73–75`** — "Its children are a leading `Spacer(0)` and one `HStack` per row … the zero-line `Spacer` is what gives row one its space above." Children are the `HStack`s alone.
5. **`README.md:83`** — "The footer leaves empty lines above its first row and between rows." Between rows only.
6. **`README.md:90`** — "Without it, one empty line sits above row one and one between each pair of rows." One between each pair only.
7. **`docs/adr/0008-row-gap-is-the-stacks-gap-behind-a-zero-line-spacer.md`** — title "…a zero-line Spacer carries it above row one", the "Decision" body ("The leading `Spacer(0)` is a child … the gap lands between the `Spacer` and row one") and "Do not remove the `Spacer(0)` as dead weight". The ADR's decision is reversed; it needs a superseding ADR (or an amendment), since AGENTS.md points at it.
8. **The change's own artifacts** (the conductor's to amend, not Implement's): `specs/statusline/spec.md` — the requirement "The footer has space above its first row and between its rows" and its "One row" scenario, the title "rowGap sets the space above row one and between rows", and "A row is one line tall"'s "The footer's height" scenario; `design.md` decisions 2, 8, 9 and its Goals/Context; `tasks.md` 1.1, 1.2, 3.1, 4.2; `proposal.md:140`; `redgreen-derek.md`; `validate-judge-gen-review.md:8,16`; `validate-judge-gen-verify.md:25,63`; `michael-orientation.md`.

### Not verified

- Nothing ran in a live pi; Joel's observation (task 7.1) is his.
- The fullscreen truncation and the blank line under the editor are unobserved, as before.
- The absent-file return's `rowGap: 0` is only observable through the `Configuration` value, not through a single-row footer (bite (v) shows one red, not three).
- `tasks.md` still describes the spacer build; I did not tick or rewrite it — it is the conductor's artifact and its statements are now false.