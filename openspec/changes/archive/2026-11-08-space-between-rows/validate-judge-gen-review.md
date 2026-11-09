# Judge Gen — PR review of #16 (`space-between-rows` into `main`)

**Head commit reviewed:** `59d64d0a2a6836584c7b4ac99e096de393e5a1d4` (confirmed with `gh pr view --json headRefOid`; local checkout is the same commit).

**Blindness note:** `gh pr diff` printed the whole diff, including the change directory's non-allowed files (the tail of `owner-rulings.md` and `redgreen-derek.md` scrolled past in the output). I did not open any of them on purpose and did not use them for this review. Every finding below rests on `proposal.md`, `specs/`, the PR description and the code. I did not read `design.md`, `tasks.md` or `council.md`.

What this change does:
The footer now puts one empty line between each pair of rows. It puts nothing above row one. A new top-level `rowGap` key in the configuration document (a whole number from 0 to 3) changes the count, and `0` gives back the old footer. The space is made by pi-tui's own `VStack` `gap` option. A row stays one line.

## Findings

No Must fix. No Should fix. No Lean findings.

### Nice to have

1. **Two over-long lines in `ARCHITECTURE.md`** (`ARCHITECTURE.md:3-4`, and the "Row renderer" paragraph around L71-75)
   - **What this is:** The docs pass edited two paragraphs that the rest of the file keeps wrapped at about 100 columns.
   - **Problem:** The new text runs past that on several lines (for example the sentence ending "…so row one sits flush on the editor; see [ADR 0008]… `rowGap` reaches the renderer once, at install. The vertical gap is that `gap`; the horizontal one below is the `HStack`'s."). It reads fine, but it makes the next diff on those lines noisy.
   - **Fix:** Re-wrap the two paragraphs. Nothing else changes.
   - **If we skip it:** Nothing breaks. A later edit shows a bigger diff than needed.

## What I checked, and why I found nothing more

- **Spec against code.**
  - Default of one line between rows, none above row one: `row-renderer.ts` builds `new VStack(stacks, { gap: rowGap })` with only the row `HStack`s as children. the tests (which run the real pi-tui `VStack`) show the gap lands only between children, so a one-row footer is one line and row one has nothing above it. This matches "The footer has space between its rows and none above the first".
  - `rowGap: 0` renders the old lines: the gap-zero test pins both the one-row and two-row output.
  - `rowGap` is accepted beside `rows` and beside a single top-level row. It is read after the `rows`/top-level-row conflict check, and that check does not list `rowGap`, so it is not a conflict.
  - A bad value (`-1`, `1.5`, `"1"`, `null`, `4`, `1e21`) throws `RejectedConfiguration`. `Number.isInteger` catches `1.5` and `1e21` is caught by the `> 3` test. The warning names `rowGap` and the value (`JSON.stringify`). The default row renders.
  - A misspelt key is ignored with no warning. The code carries the `shortcut:` comment that names its limit, which makes it a decision and not a finding.
- **Every path that returns a `Configuration` carries `rowGap`.** The no-file, unparseable-file, rejected-document and accepted-document returns all set it. TypeScript makes the field required, and `pnpm typecheck` is clean.
- **Callers.** `createFooter` has one production caller (`footer-setup.ts`), and `installFooter` has one (`startup.ts`). Both are updated. The new `rowGap` parameter has no default, so a missed caller would fail to compile.
- **Hang and load guard.** The ceiling of 3 stops a huge `rowGap` from becoming millions of empty lines. The check runs before the value reaches pi-tui. Load is one person's terminal, rendered per repaint. The extra work is at most 3 × (rows − 1) empty strings.
- **`/jefferson` row count** (`footerRows = rows.length`) still reports rows, not lines. That is correct.
- **Tests.** `pnpm typecheck` clean. `pnpm test`: 309 tests, 309 pass. The new tests cover the default, the gaps of 0, 2 and 3, each bad value, both envelopes, the misspelt key, the three fallback paths, and the threading through `startUp`. Old line-count assertions were rewritten to exact lines and not loosened.
- **Docs.** README, `ARCHITECTURE.md`, `AGENTS.md` and ADR 0008 agree with the code and spec. The README says that `rowGap` is the one key allowed beside `rows`. ADR 0008 explains why there is no `Spacer`. Older ADRs are left alone, and the ADR says why: their "no gap" is horizontal.
- **Requirement scope.** Nothing in the diff goes beyond the spec: no per-row setting, no unknown-key rule, no change to the horizontal gap.

Verdict: Ship.

Not checked: pi-tui's `VStack` in a live pi, and the fullscreen footer shrinking on a short terminal. I did not run pi. I trusted the tests (which run the real `VStack`) and the ADR for the fullscreen behavior; I did not read pi-tui's source myself.
