# Tasks

The first six groups are Derek's six spike commits, in his order (`redgreen-derek.md`, "The spike
commits"), and the SHA in a group's heading is that commit. Groups 7 and 8 are the plan amendment's
two halves, measured in one further spike commit, `a9a9d7d` (`redgreen-derek.md`, "Addendum — bare
values and the escape"). The ninth group holds the checks that span the change, Joel's live check and
the sync. The tenth holds the two fixes Validate asked for; its reds are Derek's to measure in
Implement, and its commands have not run. Every other command below ran in the spike, and the report
transcribes each beside its red and green.

**How to read a task.** Each task names the decision it builds, the command that proves it, the red,
the green, the boundary and the files it touches. A red is a planted mistake in a committed file, and
the failure it produced, reverted afterwards. A `--test-name-pattern` is the phrase the task names its
test by: write the test with that phrase in its name and the pattern finds it. The transcripts drop the
report's stack frames and keep the failure.

**The scripts.** They are in `openspec/changes/notices-in-the-footer/checks/`, and a command below
writes them `checks/<script>`. Each takes the repository as its first argument and defaults to none.
`<repo>` is the checkout the branch is read from; Derek measured in the spike worktree and the paths are
the same in either.

**The boundary.** Each group ends with one task carrying that group's `checks/scope.sh` allowed paths,
and every task names the files it touches. A group's list is a ceiling: the commit may touch every path
it lists and no path it does not, and every group allows
`openspec/changes/notices-in-the-footer/tasks.md` because the group's ticks ride in its commit. Groups 7
and 8 share one commit, so their boundary is 8.7's single task and 7.5 ends the first half.

**Logging and errors.** This change adds no logging and no entry point. The one error path it adds is a
rejected document, which the existing warning reports, and tasks 4.9 through 4.11 carry it.

## 1. Read the configuration before building the feed — D4, `1074629`

The group moves `readConfiguration` ahead of `feedSessionData` in `startup.ts` and changes no
behaviour: the reader takes its inputs from `ctx` alone, so the order changes no input and no output
(D4). It lands as its own step with the suite green on both sides, no notice behaviour in it, and no
test added (`michael-pl4-r2.json`, `later_gates`: "the reorder of `readConfiguration` lands as its own
green-to-green commit").

- [x] 1.1 `readConfiguration` runs before the feed and the store are built
  - Decision: D4 — the reader reads nothing the feed or the store creates.
  - Command: `checks/suite.sh <repo> 360` before the move, and again after it.
  - Red: none, by D4's design. The check is the suite on both sides: `pnpm typecheck` clean and
    `pnpm test` at 360 passing, with no other edit in the same commit.
  - Green: `suite: 360 passed, 0 failed (expected 360)` / `PASS` (`redgreen-derek.md`, the commit
    table).
  - Boundary: none — the group adds no behaviour.
  - Files: `extensions/jefferson/startup.ts`.
- [x] 1.2 The commit is green and touches only the paths this group names
  - Command: `checks/suite.sh <repo> 360` and
    `checks/scope.sh <repo> <base> <head> extensions/jefferson/startup.ts openspec/changes/notices-in-the-footer/tasks.md`
  - Green at `1074629`: `changed: extensions/jefferson/startup.ts` … `PASS` (`redgreen-derek.md` §6).
  - Red: a commit that also touched `README.md` printed `NOT NAMED BY THE TASK: README.md` and
    `SCOPE FAIL`, measured on a scratch branch from `b9668d9` (§6).
  - Boundary: this group's two allowed paths.

## 2. Copy pi's notice rule into the data home — D1, `65e8478`

The group adds `extensions/jefferson/data/notice.ts`. The file holds pi's miss scan, display gate,
thinking-drop delta, variant choice, value formatting, and the notices a compaction or a branch summary
yields. Each constant sits once, beside pi 1.4.0's file and line, with the `shortcut:` comment above
them (D1). The group also adds the boundary tests D8 lists. The suite goes from 360 to 375.

`redgreen-derek.md` §2.1 transcribes fifteen tests, each with its plant and its failure. Every red
below is quoted from it. Each task's command is run once with the plant and once after
`git checkout -- extensions/jefferson/data/notice.ts` for the green. No test reads pi's files (D8).

Three of the fifteen could not fail on their plant, because their inputs did not make the right and
wrong answers differ. Michael's tasks-gate ruling changed those inputs, and Derek measured the new reds
in `redgreen-derek.md`'s "Addendum — the tasks gate's reds": 2.10's miss half is §3, 2.11's reset is
§1 and 2.14's source swap is §2 (`michael-pl7-r1.json`, finding 2).

- [x] 2.1 The module's types and pi's five constants, with the `shortcut:` comment above them
  - Decision: D1 — `NoticeKind`'s six members, `NoticeValue`'s four, `CACHE_TTL_MS`,
    `NOISE_FLOOR_TOKENS`, `DISPLAY_GATE_TOKENS`, `DISPLAY_GATE_COST` and `COST_SUFFIX_MIN`, each
    beside pi's file and line, under `shortcut: copies pi 1.4.0's rule; drift in the user's global pi
    between pin bumps is invisible, re-check on every pin bump`.
  - Command: `checks/imports.mjs <repo>`, and `pnpm typecheck`.
  - Red: `checks/imports.mjs` fails with `DATA LEAK` when a `data/` file imports
    `../components/…`, and with `CLOCK … names a process clock; only startup.ts may` when this file
    names `setTimeout` (`redgreen-derek.md` §5).
  - Green: `checks/imports.mjs` passes with this file in the graph, and a constant that moves fails
    2.2 through 2.16.
  - Boundary: the constant values themselves, held by 2.4 (the gate), 2.5 (the suffix's floor) and
    2.6 (the TTL).
  - Files: `extensions/jefferson/data/notice.ts`.
- [x] 2.2 The count takes pi's `formatTokens`, not the formatter the cells share
  - Decision: D1 — pi's `footer.js:20-30`, copied.
  - Command: `node --test --test-name-pattern="formatTokens" tests/notice.test.ts`
  - Red, §2.1 #1 — plant `const TEN_THOUSAND = 10_000;` as `9_999;`, so the whole-thousands branch
    starts a token early:
    ```
    ✖ formatTokens rounds to whole thousands from 10,000 up, and compactCount does not
      AssertionError [ERR_ASSERTION]: 9999
      '10k' !== '10.0k'
    ```
  - Green: `✔ formatTokens rounds to whole thousands from 10,000 up, and compactCount does not`,
    `ℹ pass 1`, `ℹ fail 0` (§2.1 #1).
  - Boundary: 9,999, 10,000, 20,000, 99,999 and 125,300 through `formatTokens` against `compactCount`'s
    answer for the same input — `20k` where `compactCount` draws `20.0k`.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.3 A miss under the noise floor yields no notice
  - Decision: D1 — `NOISE_FLOOR_TOKENS`, applied as pi applies it (`cache-stats.js:7`, `:24`).
  - Command: `node --test --test-name-pattern="noise floor" tests/notice.test.ts`
  - Red, §2.1 #2 — plant `const NOISE_FLOOR_TOKENS = 1_024;` as `1_023;`, so 1,024 missed tokens draw
    a notice:
    ```
    ✖ the noise floor: 1,024 missed tokens draws nothing and 1,025 draws a notice
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '1.0k' } }
      - undefined
    ```
  - Green: `✔ the noise floor: 1,024 missed tokens draws nothing and 1,025 draws a notice`,
    `ℹ pass 1`, `ℹ fail 0` (§2.1 #2).
  - Boundary: 1,024 against 1,025 missed tokens.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.4 A miss under the display gate yields no notice
  - Decision: D1 — `DISPLAY_GATE_TOKENS` and `DISPLAY_GATE_COST` (`interactive-mode.js:3367`).
  - Command: `node --test --test-name-pattern="display gate" tests/notice.test.ts`
  - Red, §2.1 #3 — plant `const DISPLAY_GATE_TOKENS = 20_000;` as `20_001;`, so 20,000 tokens with
    $0.099 draw nothing:
    ```
    ✖ the display gate: 19,999 tokens and $0.099 draw nothing; 20,000 tokens or $0.10 draws
      AssertionError [ERR_ASSERTION]: at the token gate
      actual: undefined, expected: true, operator: '=='
    ```
  - Red, the same test's cost gate, planted second — `const DISPLAY_GATE_COST = 0.1;` as `0.11;`:
    ```
    ✖ the display gate: 19,999 tokens and $0.099 draw nothing; 20,000 tokens or $0.10 draws
      AssertionError [ERR_ASSERTION]: at the cost gate
      actual: undefined, expected: true, operator: '=='
    ```
  - Green: `✔ the display gate: 19,999 tokens and $0.099 draw nothing; 20,000 tokens or $0.10 draws`,
    `ℹ pass 1`, `ℹ fail 0` (§2.1 #3).
  - Boundary: 19,999 tokens and $0.099 against 20,000 tokens and $0.10 — each side of the gate on its
    own.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.5 The cost suffix appears only at pi's minimum
  - Decision: D1 — `COST_SUFFIX_MIN` and pi's ` (~$X.XX)` suffix (`interactive-mode.js:3369`,
    `:3311`).
  - Command: `node --test --test-name-pattern="appears at a cent" tests/notice.test.ts`
  - Red, §2.1 #4 — plant `const COST_SUFFIX_MIN = 0.01;` as `0.011;`, so a cent loses its suffix:
    ```
    ✖ the cost suffix appears at a cent and reads to two decimals
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      '' !== ' (~$0.01)'
    ```
  - Green: `✔ the cost suffix appears at a cent and reads to two decimals`, `ℹ pass 1`, `ℹ fail 0`
    (§2.1 #4).
  - Boundary: $0.0099 against $0.01.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.6 An idle of pi's TTL yields the idle variant, and a shorter one does not
  - Decision: D1 and the `missIdle` kind — `CACHE_TTL_MS`, measured start to start
    (`cache-stats.js:38`).
  - Command: `node --test --test-name-pattern="five minutes" tests/notice.test.ts`
  - Red, §2.1 #5 — plant `miss.idleMs >= CACHE_TTL_MS ?` as `miss.idleMs > CACHE_TTL_MS ?`, so exactly
    five minutes reads `miss`:
    ```
    ✖ the idle variant: exactly five minutes reads missIdle and a millisecond under does not
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      'miss' !== 'missIdle'
    ```
  - Green: `✔ the idle variant: exactly five minutes reads missIdle and a millisecond under does not`,
    `ℹ pass 1`, `ℹ fail 0` (§2.1 #5).
  - Boundary: exactly five minutes against a millisecond under.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.7 A model change wins over an idle
  - Decision: D1 and D5's `missModelSwitch` — the `provider/model` comparison (`cache-stats.js:39`).
  - Command: `node --test --test-name-pattern="model change beats" tests/notice.test.ts`
  - Red, §2.1 #6 — plant the kind's ternary reversed, so the idle branch is tested first:
    ```
    ✖ a model change beats an idle of the same turn
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + 'missIdle'
      - 'missModelSwitch'
    ```
  - Green: `✔ a model change beats an idle of the same turn`, `ℹ pass 1`, `ℹ fail 0` (§2.1 #6).
  - Boundary: a model change and an idle together, where the model change wins.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.8 A turn that read no cache is priced with the model's cache-read rate
  - Decision: D1 — `readPerToken` falling back to the model's price over a million
    (`cache-stats.js:30-34`).
  - Command: `node --test --test-name-pattern="cache-read fallback" tests/notice.test.ts`
  - Red, §2.1 #7 — plant `: readCachePerToken;` as `: 0;`, so a turn that reads no cache is priced as
    if its reads were free:
    ```
    ✖ the cache-read fallback prices a turn that read no cache
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + ' (~$0.10)'
      - ' (~$0.06)'
    ```
  - Green: `✔ the cache-read fallback prices a turn that read no cache`, `ℹ pass 1`, `ℹ fail 0`
    (§2.1 #7).
  - Boundary: a miss on a turn with no cache read, where the fallback rate is the only one in play.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.9 A session that never reported cache activity counts no miss
  - Decision: D1 — pi's guard (`cache-stats.js:20`).
  - Command: `node --test --test-name-pattern="no cache activity" tests/notice.test.ts`
  - Red, §2.1 #8 — plant `&& !previous.reportedCache` as `&& previous.reportedCache`, so the session's
    own silence no longer suppresses the count:
    ```
    ✖ a turn with no cache activity in a session that reported none counts nothing
      AssertionError [ERR_ASSERTION]: a provider that never reported caching
      + { kind: 'miss', values: { tokens: '50k', cost: '' } }
      - undefined
    ```
  - Green: `✔ a turn with no cache activity in a session that reported none counts nothing`,
    `ℹ pass 1`, `ℹ fail 0` (§2.1 #8).
  - Boundary: a first turn, a turn after a reset, zero prompt tokens, and a session that never
    reported cache activity.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.10 An aborted or errored message yields no notice
  - Decision: D1 — the `stopReason` skip (`interactive-mode.js:2859-2866`), and the store spec's
    "A message that carries no notice".
  - Command: `node --test --test-name-pattern="aborted" tests/notice.test.ts`
  - Red, §2.1 #9 — the skip's line removed from `thinkingNotice`, the thinking half's failure:
    ```
    ✖ an aborted or errored message draws nothing, for the miss and for the thinking delta
      AssertionError [ERR_ASSERTION]: aborted
      + { kind: 'thinking', values: { blocks: '2 thinking blocks' } }
      - undefined
    ```
  - Green: `✔ an aborted or errored message draws nothing, for the miss and for the thinking delta`,
    `ℹ pass 1`, `ℹ fail 0` (§2.1 #9).
  - The miss half, addendum §3 — the test's message became `input: 20_000, cacheRead: 80_000, cost: 0.1`,
    20,000 missed and over the gate; with `input: 0, cacheRead: 80_000` against a 100,000-token prompt
    the miss was zero, and §2.1 #9 measured the skip's removal green there. With the skip's line removed
    from `missNotice`:
    ```
    ✖ an aborted or errored message draws nothing, for the miss and for the thinking delta
      AssertionError [ERR_ASSERTION]: aborted
      + actual - expected
      + { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '20k' } }
      - undefined
    ```
  - Green: `✔ an aborted or errored message draws nothing, for the miss and for the thinking delta`,
    `ℹ pass 1`, `ℹ fail 0` (addendum §3).
  - Boundary: an aborted message and an errored one, each yielding nothing.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.11 A compaction and a branch summary reset the previous request
  - Decision: D1 — the resets at a `compaction` and a `branch_summary` entry
    (`cache-stats.js:59-65`), and the store spec's "A compaction between two turns".
  - Command: `node --test --test-name-pattern="reset the previous request" tests/notice.test.ts`
  - The test's turn is `message({ input: 20_000, cacheRead: 60_000, cacheWrite: 0, cost: 0.1 })`:
    against the 100,000-token prompt its missed tokens are `min(100,000, 80,000) − 60,000 = 20,000`, at
    the gate's token edge, with a compaction and separately a branch summary between the two turns
    (addendum §1).
  - Red: plant `previousRequest`'s reset —
    `if (entry.type === "compaction" || entry.type === "branch_summary") { … }` as `if (false) { … }`:
    ```
    ✖ a compaction and a branch summary each reset the previous request
      AssertionError [ERR_ASSERTION]: compaction
      + actual - expected
      + { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '20k' } }
      - undefined
    ```
  - Green: `✔ a compaction and a branch summary each reset the previous request`, `ℹ pass 1`,
    `ℹ fail 0` (addendum §1).
  - §2.1 #10's recorded red is a module-not-found from a missing `data/notice.ts`, which is not a
    behavioural red, and no task cites it.
  - Boundary: a compaction and a branch summary between two turns, which measure no miss across them.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.12 A cache-warm usage entry becomes the previous request
  - Decision: D1 — `cache_warm` becoming the previous request though no warm notice shows
    (`cache-stats.js:66-76`), and the store spec's "A cache-warm entry before the turn".
  - Command: `node --test --test-name-pattern="cache-warm" tests/notice.test.ts`
  - Red, §2.1 #11 — plant `if (entry.type === "usage" && entry.kind === "cache_warm") {` as
    `if (false) {`, so the warm entry no longer measures the turn:
    ```
    ✖ a cache-warm usage entry measures the turn as the previous request, and draws no warm notice
      AssertionError [ERR_ASSERTION]: the warm entry is the previous request
      actual: undefined, expected: true, operator: '=='
    ```
  - Green: `✔ a cache-warm usage entry measures the turn as the previous request, and draws no warm
    notice`, `ℹ pass 1`, `ℹ fail 0` (§2.1 #11).
  - Boundary: a cache-warm entry before the turn, which measures the turn and shows nothing.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.13 A dropped-thinking notice shows only when its count rises
  - Decision: D1 — the delta against the previous assistant message's count, with pi's noun by count
    (`interactive-mode.js:3349`), and the store spec's "A dropped-thinking notice shows only when its
    count rises".
  - Command: `node --test --test-name-pattern="count rises" tests/notice.test.ts`
  - Red, §2.1 #12 — plant `if (dropped <= previous) return undefined;` as
    `if (dropped < previous) return undefined;`, so a repeated count shows again:
    ```
    ✖ the thinking delta shows when the count rises and stays silent when it repeats
      AssertionError [ERR_ASSERTION]: the same count repeating
      + { kind: 'thinking', values: { blocks: '2 thinking blocks' } }
      - undefined
    ```
  - Green: `✔ the thinking delta shows when the count rises and stays silent when it repeats`,
    `ℹ pass 1`, `ℹ fail 0` (§2.1 #12).
  - Boundary: a count rising against one repeating, and one block against two for the noun.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.14 The thinking count comes from the branch, not from the entries
  - Decision: D1 — the thinking step compares against the branch's last assistant message
    (`interactive-mode.js:3338-3346`), while the miss scan reads `getEntries()`
    (`interactive-mode.js:3362`).
  - Command: `node --test --test-name-pattern="reads the branch" tests/notice.test.ts`
  - The test's last assertion is `messageNotice(turn, [sibling], [current], 0)`: `sibling` dropped 2,
    `current` dropped 0, `turn` dropped 1, expecting the thinking notice. Two identical lists could not
    tell the sources apart, which is why the input changed (`michael-pl7-r1.json`, finding 2c).
  - Red: plant `messageNotice`'s two list arguments swapped — `missNotice(entries, …) ??
    thinkingNotice(message, branch)` as `missNotice(branch, …) ?? thinkingNotice(message, entries)`, so
    the entries' higher count is read as the previous one:
    ```
    ✖ the thinking delta reads the branch, not the entries: a sibling's higher count stays silent
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
      + actual - expected
      + undefined
      - { kind: 'thinking', values: { blocks: '1 thinking block' } }
    ```
  - Green: `✔ the thinking delta reads the branch, not the entries: a sibling's higher count stays
    silent`, `ℹ pass 1`, `ℹ fail 0` (addendum §2).
  - §2.1 #13's recorded red is the delta guard's deletion, which 2.13's plant already catches, and no
    task cites it as this one's.
  - Boundary: an assistant message on a sibling branch carrying a higher dropped count than the
    current branch's — the input that makes the two sources disagree.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.15 One message carrying two notices keeps the miss
  - Decision: D7 — the thinking candidate first and the miss second, in pi's draw order
    (`interactive-mode.js:3010-3011`), resolved in memory before anything is scheduled.
  - Command: `node --test --test-name-pattern="keeps the miss" tests/notice.test.ts`
  - Red, §2.1 #14 — plant `missNotice(…) ?? thinkingNotice(…)` as
    `thinkingNotice(…) ?? missNotice(…)`, so the thinking notice wins:
    ```
    ✖ one message carrying a thinking drop and a miss keeps the miss and loses the thinking notice
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      'thinking' !== 'miss'
    ```
  - Green: `✔ one message carrying a thinking drop and a miss keeps the miss and loses the thinking
    notice`, `ℹ pass 1`, `ℹ fail 0` (§2.1 #14).
  - Boundary: one message that drops thinking blocks and pays for a miss.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.16 A compaction's and a branch summary's usage are summed with pi's suffix
  - Decision: D1 — the token sum `input + output + cacheRead + cacheWrite` (`interactive-mode.js:3306-3315`)
    and the cost suffix.
  - Command: `node --test --test-name-pattern="token sum" tests/notice.test.ts`
  - Red, §2.1 #15 — plant the sum without `usage.output`:
    ```
    ✖ a compaction's usage reads the token sum and the cost suffix
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
      + tokens: '600'
      - tokens: '1.0k'
    ```
  - Green: `✔ a compaction's usage reads the token sum and the cost suffix`, `ℹ pass 1`, `ℹ fail 0`
    (§2.1 #15).
  - Boundary: a compaction entry's usage and a branch summary's, each summed and suffixed.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 2.17 The new file joins the export pin
  - Decision: D8 — the pin's scanned-only set beside the store and the format language, and the
    coverage assertion that every shipped source file joins it.
  - Command: `node --test --test-name-pattern="exported surface" tests/jefferson.test.ts`
  - Red: with `data/notice.ts` removed from the scanned-only set, the coverage assertion fails naming
    `data/notice.ts` (`redgreen-derek.md` §4).
  - Green: `ℹ pass 1 ℹ fail 0` for the pin's run at HEAD (§4).
  - Boundary: the pin's coverage of a shipped file, and nothing it exports.
  - Files: `tests/jefferson.test.ts`.
- [x] 2.18 The commit is green and touches only the paths this group names
  - Command: `checks/suite.sh <repo> 375` and
    `checks/scope.sh <repo> <base> <head> extensions/jefferson/data/notice.ts tests/notice.test.ts tests/jefferson.test.ts openspec/changes/notices-in-the-footer/tasks.md`
  - Green at `65e8478`: `suite: 375 passed, 0 failed`, and `changed:` the three paths … `PASS`
    (`redgreen-derek.md` §6).
  - Red: the same `README.md` plant as 1.2 (§6).
  - Boundary: this group's four allowed paths.

## 3. Hold the notice's slot and its expiry in the store — D1, D2, D7, `00ef4d5`

The group gives the store the notice datum, its one slot, its deadline on the injected clock and its
scheduler handle, and gives the feed the three subscriptions and the release that clears them (D1's
Flow, D2, D7). Tasks 3.4 and 3.10 are D3's first half: the store's no-visible-time state and the feed's
gate, which the spike put in this commit and whose reading from the rows is group 5's. The suite goes
from 375 to 397.

The spike's commit also changed `tests/instrument.test.ts` and `tests/row-renderer.test.ts`: three
lines each, the store's fixtures gaining the three readers the store now takes — `readBranch: () => []`,
`now: () => 0`, `schedule: () => () => {}`. Fixture-only, no behaviour, and no task needs one for them
(`michael-pl7-r1.json`, finding 5).

- [x] 3.1 A completed assistant message's notice becomes the store's datum
  - Decision: D1 — `Readings.notice`, holding the kind and the values already formatted.
  - Command: `node --test --test-name-pattern="completed assistant message" tests/session-data-store.test.ts`
  - Red: with `messageEnded`'s `if (next !== undefined) showNotice(next);` removed:
    ```
    ✖ a completed assistant message's notice is the store's notice datum
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
      + actual - expected
      + undefined
      - { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '20k' } }
    ```
  - Green: `✔ a completed assistant message's notice is the store's notice datum`, `pass 1 fail 0`
    (`redgreen-derek.md` §2.2).
  - Boundary: none beyond the datum's shape; D1's unknown state is 3.4's.
  - Files: `extensions/jefferson/data/session-data-store.ts`,
    `tests/session-data-store.test.ts`.
- [x] 3.2 A message that carries no notice takes none
  - Decision: D1 — assistant messages only, and the store spec's "A message that carries no notice".
  - Command: `node --test --test-name-pattern="user message" tests/session-data-store.test.ts`
  - Red: with `messageEnded`'s `if (message.role !== "assistant") return;` removed:
    ```
    ✖ a user message, a non-message event and an aborted or errored message take no notice
      TypeError: Cannot read properties of undefined (reading 'input')
          at detectMiss (.../extensions/jefferson/data/notice.ts:124:30)
    ```
  - Green: `✔ a user message, a non-message event and an aborted or errored message take no notice`
    (§2.3).
  - Boundary: a user message, a non-message event, and an aborted or errored message.
  - Files: `extensions/jefferson/data/session-data-store.ts`,
    `tests/session-data-store.test.ts`.
- [x] 3.3 A compaction and a branch summary each hold their usage
  - Decision: D1 — the two events' `usage` becoming a notice, and the store spec's "A compaction ends"
    and "A branch summary ends".
  - Command: `node --test --test-name-pattern="compaction and a branch summary" tests/session-data-store.test.ts`
  - Red: with `compactionEnded`'s `showNotice(next)` removed:
    ```
    ✖ a compaction and a branch summary each hold their usage as a notice
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
      + actual - expected
      + undefined
      - { kind: 'compaction', values: { cost: ' (~$0.38)', tokens: '1.0k' } }
    ```
  - Red: with `branchSummarised`'s `showNotice(next)` removed:
    ```
    ✖ a compaction and a branch summary each hold their usage as a notice
      AssertionError [ERR_ASSERTION]: { + kind: 'compaction', - kind: 'branchSummary',
      values: { cost: ' (~$0.38)', tokens: '1.0k' } }
    ```
  - Green: `✔ a compaction and a branch summary each hold their usage as a notice` (§2.4).
  - Boundary: an entry carrying usage against one carrying none; each event on its own.
  - Files: `extensions/jefferson/data/session-data-store.ts`,
    `tests/session-data-store.test.ts`.
- [x] 3.4 With no visible time the store takes no notice and holds no timer
  - Decision: D3 — an `undefined` visible time means no notice, no previous-request record and no
    handle.
  - Command: `node --test --test-name-pattern="with no visible time" tests/session-data-store.test.ts`
  - Red: with `showNotice`'s `noticeSeconds === undefined` guard removed:
    ```
    ✖ with no visible time the store takes no notice and holds no timer
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + { kind: 'compaction', values: { cost: ' (~$0.38)', tokens: '600' } }
      - undefined
    ```
  - Green: `✔ with no visible time the store takes no notice and holds no timer` (§2.5).
  - Boundary: the absent visible time, which is the gate's own state.
  - Files: `extensions/jefferson/data/session-data-store.ts`,
    `tests/session-data-store.test.ts`.
- [x] 3.5 An expiry requests exactly one repaint
  - Decision: D2 — the clock decides and the scheduler requests the repaint, once.
  - Command: `node --test --test-name-pattern="expiry on the clock" tests/session-data-store.test.ts`
  - Red: with the callback's `requestRender?.()` removed:
    ```
    ✖ a notice's expiry on the clock drops it and requests exactly one repaint
      AssertionError [ERR_ASSERTION]: the expiry requests one repaint
      0 !== 1
    ```
  - Green: `✔ a notice's expiry on the clock drops it and requests exactly one repaint` (§2.6).
  - Boundary: one repaint against none — a second repaint would be the cadence D2 refuses.
  - Files: `extensions/jefferson/data/session-data-store.ts`,
    `tests/session-data-store.test.ts`.
- [x] 3.6 A read past the deadline drops the notice without a timer's help
  - Decision: D2 — the clock decides at the start of a read; the timer only requests the repaint.
  - Command: `node --test --test-name-pattern="read past the deadline" tests/session-data-store.test.ts`
  - Red: with the sample's `if (notice !== undefined && now() >= deadline) { … }` block removed:
    ```
    ✖ a read past the deadline drops the notice without a timer's help, and requests no repaint
      AssertionError [ERR_ASSERTION]: the clock decides, and a read past the deadline drops it
      + { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '20k' } }
      - undefined
    ```
  - Green: `✔ a read past the deadline drops the notice without a timer's help, and requests no
    repaint` (§2.7).
  - Boundary: the deadline itself, reached with no timer fired.
  - Files: `extensions/jefferson/data/session-data-store.ts`,
    `tests/session-data-store.test.ts`.
- [x] 3.7 An early fire re-arms for the time left and requests nothing
  - Decision: D2 — the callback's two branches (`michael-pl4-r2.json`, `later_gates`: the early-fire
    test asserts zero repaints and one re-arm on a fake clock).
  - Command: `node --test --test-name-pattern="early fire" tests/session-data-store.test.ts`
  - Red: with the callback's `if (now() < at) { armExpiry(at); return; }` removed:
    ```
    ✖ an early fire re-arms for the time left and requests no repaint
      AssertionError [ERR_ASSERTION]: an early fire asks for nothing
      1 !== 0
    ```
  - Green: `✔ an early fire re-arms for the time left and requests no repaint` (§2.8).
  - Boundary: a timer firing before the deadline, against one firing at or after it.
  - Files: `extensions/jefferson/data/session-data-store.ts`,
    `tests/session-data-store.test.ts`.
- [x] 3.8 A newer notice replaces the shown one for its whole visible time
  - Decision: D7 — one slot, the replaced handle cancelled, the newcomer's own arrival as its start.
  - Command: `node --test --test-name-pattern="newer notice replaces" tests/session-data-store.test.ts`
  - Red: with `showNotice`'s `cancelNotice()` removed:
    ```
    ✖ a newer notice replaces the shown one and takes its whole visible time from its own arrival
      AssertionError [ERR_ASSERTION]: the first's handle is cleared and one remains
      2 !== 1
    ```
  - Green: `✔ a newer notice replaces the shown one and takes its whole visible time from its own
    arrival` (§2.9).
  - Boundary: a second notice arriving 8 seconds into a 10-second one.
  - Files: `extensions/jefferson/data/session-data-store.ts`,
    `tests/session-data-store.test.ts`.
- [x] 3.9 Disposal clears the pending expiry, and a message after it takes no notice
  - Decision: D2 — the handle cancelled in the feed's release, which is the component's `dispose`.
  - Command: `node --test --test-name-pattern="disposal clears the pending expiry" tests/session-data-store.test.ts`
  - Red: with `dispose`'s `cancelNotice()` removed:
    ```
    ✖ disposal clears the pending expiry, and a message after it takes no notice and repaints nothing
      AssertionError [ERR_ASSERTION]: the handle is cancelled
      1 !== 0
    ```
  - Red: with `messageEnded`'s `readEntries === undefined` guard removed:
    ```
    ✖ disposal clears the pending expiry, and a message after it takes no notice and repaints nothing
      TypeError: readEntries is not a function
          at Object.messageEnded (.../extensions/jefferson/data/session-data-store.ts:193:43)
    ```
  - Green: `✔ disposal clears the pending expiry, and a message after it takes no notice and repaints
    nothing` (§2.10).
  - Boundary: a message arriving after the release, which must reach nothing.
  - Files: `extensions/jefferson/data/session-data-store.ts`,
    `tests/session-data-store.test.ts`.
- [x] 3.10 With no notice cell placed, the feed takes no notice subscription
  - Decision: D3 — the gate; the store spec's "No notice cell placed".
  - Command: `node --test --test-name-pattern="no notice cell placed" tests/session-data-feed.test.ts`
  - Red: with the `if (noticeSeconds !== undefined)` gate removed:
    ```
    ✖ no notice cell placed takes no notice subscription
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
        [ 'model_select', 'thinking_level_select', 'turn_end', 'session_info_changed',
      +   'message_end', 'session_compact', 'session_tree' ]
    ```
  - Green: `✔ no notice cell placed takes no notice subscription` (§2.11).
  - Boundary: an absent visible time, which is the gate's off state.
  - Files: `extensions/jefferson/data/session-data-feed.ts`, `tests/session-data-feed.test.ts`.
- [x] 3.11 A notice cell placed takes the three subscriptions, and the release takes them back
  - Decision: D1's Flow and D-b — three subscriptions joining the feed's single release.
  - Command: `node --test --test-name-pattern="a notice cell placed takes the three" tests/session-data-feed.test.ts`
  - Red: with the release loop `for (const releaseNotice of noticeSubscriptions) releaseNotice();`
    removed:
    ```
    ✖ a notice cell placed takes the three notice subscriptions and releases them with the rest
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
        [ 'model_select', 'thinking_level_select', 'turn_end', 'session_info_changed',
      -   'message_end', 'session_compact', 'session_tree' ]
    ```
  - Green: `✔ a notice cell placed takes the three notice subscriptions and releases them with the
    rest` (§2.12).
  - Boundary: the release, after which the three must be gone.
  - Files: `extensions/jefferson/data/session-data-feed.ts`, `tests/session-data-feed.test.ts`.
- [x] 3.12 `message_end` carries a miss to the store
  - Decision: D1's Flow — `message_end` brings the scan current, then hands the message over.
  - Command: `node --test --test-name-pattern="message_end carries a miss" tests/session-data-feed.test.ts`
  - Red: with the `pi.on("message_end", …)` subscription removed:
    ```
    ✖ message_end carries a miss to the store's notice
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
      + undefined
      - { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '20k' } }
    ```
  - Green: `✔ message_end carries a miss to the store's notice` (§2.13).
  - Boundary: none beyond the event's delivery; the collision is 2.15's.
  - Files: `extensions/jefferson/data/session-data-feed.ts`, `tests/session-data-feed.test.ts`.
- [x] 3.13 The feed prices a turn that read no cache with the model's cache-read rate
  - Decision: D1 — `ctx.modelRegistry.find(provider, model)?.cost.cacheRead / 1_000_000` supplied
    beside the message.
  - Command: `node --test --test-name-pattern="prices a turn that read no cache" tests/session-data-feed.test.ts`
  - Red: with `cacheReadRate`'s `…cost.cacheRead ?? 0) / 1_000_000` replaced by `undefined`:
    ```
    ✖ message_end prices a turn that read no cache with the model's cache-read fallback
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
        { kind: 'miss', values: {
      +   cost: ' (~$0.10)', - cost: ' (~$0.06)', tokens: '20k' } }
    ```
  - Green: `✔ message_end prices a turn that read no cache with the model's cache-read fallback`
    (§2.14).
  - Boundary: the two prices, where the fallback rate and no rate give different costs.
  - Files: `extensions/jefferson/data/session-data-feed.ts`, `tests/session-data-feed.test.ts`.
- [x] 3.14 `session_compact` and `session_tree` carry their usage to the store
  - Decision: D1's Flow, and the store spec's "A compaction ends" and "A branch summary ends".
  - Command: `node --test --test-name-pattern="session_compact and session_tree" tests/session-data-feed.test.ts`
  - Red: with the `pi.on("session_compact", …)` subscription removed:
    ```
    ✖ session_compact and session_tree carry their usage to the store's notice
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
      + undefined
      - { kind: 'compaction', values: { cost: ' (~$0.38)', tokens: '1.0k' } }
    ```
  - Red: with the `pi.on("session_tree", …)` subscription removed:
    ```
    ✖ session_compact and session_tree carry their usage to the store's notice
      AssertionError [ERR_ASSERTION]: { + kind: 'compaction', - kind: 'branchSummary',
      values: { cost: ' (~$0.38)', tokens: '1.0k' } }
    ```
  - Green: `✔ session_compact and session_tree carry their usage to the store's notice` (§2.15).
  - Boundary: an entry carrying usage against one carrying none, for each event.
  - Files: `extensions/jefferson/data/session-data-feed.ts`, `tests/session-data-feed.test.ts`.
- [x] 3.15 A `message_end` after the release takes no notice and repaints nothing
  - Decision: D2 and D-b — the release disposes the store, and nothing after it reaches the host.
  - Command: `node --test --test-name-pattern="message_end after the release" tests/session-data-feed.test.ts`
  - Red: with the feed's `store.dispose()` removed from its release:
    ```
    ✖ a message_end after the release takes no notice and requests no repaint
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '20k' } }
      - undefined
    ```
  - Green: `✔ a message_end after the release takes no notice and requests no repaint` (§2.16).
  - Boundary: an event delivered after the release.
  - Files: `extensions/jefferson/data/session-data-feed.ts`, `tests/session-data-feed.test.ts`.
- [x] 3.16 `session_shutdown` runs the release
  - Decision: D2 — `startup.ts` registers the handler, because `ctx.reload()` emits
    `session_shutdown` and never clears the footer.
  - Command: `node --test --test-name-pattern="session_shutdown" tests/jefferson.test.ts`
  - Red: with the `pi.on("session_shutdown", …)` handler removed:
    ```
    ✖ a session_shutdown runs the release, so the session's subscriptions are taken
      AssertionError [ERR_ASSERTION]: no handler registered for session_shutdown
    ```
  - Green: `✔ a session_shutdown runs the release, so the session's subscriptions are taken`
    (`model_select, thinking_level_select, turn_end, session_info_changed`), `redgreen-derek.md`
    §2.17.
  - Boundary: a shutdown that disposes no footer, against a footer disposed mid-notice (3.9).
  - Files: `extensions/jefferson/startup.ts`, `tests/jefferson.test.ts`.
- [x] 3.17 A compaction or a branch summary that carries no usage takes no notice
  - Decision: D1's Flow — `session_compact` and `session_tree` yield a notice only when the entry
    carries usage.
  - Command: `node --test --test-name-pattern='carrying no usage' tests/session-data-store.test.ts`
  - The behaviour landed in 3.1 and 3.3; this task pins the test's empty case.
  - Red, addendum §5.1 — plant `usageNotice`'s `if (usage === undefined) return undefined;` as
    `if (usage === undefined) return { kind, values: { tokens: "0", cost: "" } };`, a notice
    fabricated from no usage:
    ```
    ✖ a compaction or a branch summary carrying no usage takes no notice
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + actual - expected
      + { kind: 'compaction', values: { cost: '', tokens: '0' } }
      - undefined
    ```
  - Green: `✔ a compaction or a branch summary carrying no usage takes no notice`, `ℹ pass 1`,
    `ℹ fail 0` (addendum §5.1).
  - Boundary: an entry carrying no usage against one that carries it (3.3).
  - Files: `tests/session-data-store.test.ts`.
- [x] 3.18 One message carrying a thinking drop and a miss keeps the miss, at the store
  - Decision: D7 — the collision resolved in memory before anything is scheduled, with the miss
    second and therefore kept.
  - Command: `node --test --test-name-pattern='keeps the miss' tests/session-data-store.test.ts`
  - The behaviour landed in 3.1's datum and D7's ordering; this task pins the store-level test that
    2.15's pure-rule test does not stand in for.
  - Red, addendum §5.2 — plant the `??` order in `messageNotice` swapped, so the thinking notice wins
    the collision:
    ```
    ✖ one message carrying a thinking drop and a miss keeps the miss
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      'thinking' !== 'miss'
    ```
  - Green: `✔ one message carrying a thinking drop and a miss keeps the miss`, `ℹ pass 1`, `ℹ fail 0`
    (addendum §5.2).
  - Boundary: one message that carries both candidates, where the store must keep the miss.
  - Files: `tests/session-data-store.test.ts`.
- [x] 3.19 The store reads the thinking count from the branch, not from the entries
  - Decision: D1 — `messageNotice(message, readEntries(), readBranch(), …)` gives each step its own
    source.
  - Command: `node --test --test-name-pattern='reads the branch' tests/session-data-store.test.ts`
  - The test's `previousEntry` takes `dropped`: `sibling = previousEntry({ dropped: 2 })`,
    `current = previousEntry()`, `entries: [sibling]`, `branch: [current]`, the turn dropped 1 with
    `cacheRead: 0`.
  - Red, addendum §4 — plant `session-data-store.ts:194`'s
    `messageNotice(message, readEntries(), readBranch(), readCachePerToken)` as
    `messageNotice(message, readBranch(), readEntries(), readCachePerToken)`, so the sibling's higher
    count is read as the previous one:
    ```
    ✖ the thinking delta reads the branch, not the entries: a sibling's higher count stays silent
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
      + actual - expected
      + undefined
      - { kind: 'thinking', values: { blocks: '1 thinking block' } }
    ```
  - Green: `✔ the thinking delta reads the branch, not the entries: a sibling's higher count stays
    silent`, `ℹ pass 1`, `ℹ fail 0` (addendum §4).
  - Boundary: the two lists disagreeing, which is the input that makes the sources differ; the
    pure-rule twin is 2.14.
  - Files: `tests/session-data-store.test.ts`.
- [x] 3.20 A cache-warm usage entry is the previous request, at the store
  - Decision: D1 — the warm entry measures the turn though no warm notice shows.
  - Command: `node --test --test-name-pattern='the cache-warm entry is the previous request' tests/session-data-store.test.ts`
  - The behaviour landed in 3.1; this task pins the store-level test.
  - Red, addendum §5.4 — plant `previousRequest`'s
    `if (entry.type === "usage" && entry.kind === "cache_warm") {` as `if (false) {`:
    ```
    ✖ the cache-warm entry is the previous request the miss rule measures
      AssertionError [ERR_ASSERTION]: the warm measures the turn though no warm notice shows
      + actual - expected
      + undefined
      - 'miss'
    ```
  - Green: `✔ the cache-warm entry is the previous request the miss rule measures`, `ℹ pass 1`,
    `ℹ fail 0` (addendum §5.4).
  - Boundary: a turn after a warm entry against a session's first turn, which must stay silent.
  - Files: `tests/session-data-store.test.ts`.
- [x] 3.21 With no notice showing, the store holds no timer
  - Decision: D2 — the handle exists only while a notice does.
  - Command: `node --test --test-name-pattern='no notice, no timer' tests/session-data-store.test.ts`
  - The behaviour landed in 3.5's scheduler handle; this task pins the state before any arrival.
  - Red, addendum §5.5 — plant an expiry armed at construction, this line added after `showNotice`:
    `if (noticeSeconds !== undefined && now !== undefined && schedule !== undefined) armExpiry(now() +
    noticeSeconds * 1_000);`
    ```
    ✖ no notice, no timer: the store holds no pending handle before an arrival
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      1 !== 0
    ```
  - Green: `✔ no notice, no timer: the store holds no pending handle before an arrival`, `ℹ pass 1`,
    `ℹ fail 0` (addendum §5.5).
  - Boundary: the absent notice, where a pending handle would be the cadence D2 refuses.
  - Files: `tests/session-data-store.test.ts`.
- [x] 3.22 The commit is green and touches only the paths this group names
  - Command: `checks/suite.sh <repo> 397` and
    `checks/scope.sh <repo> <base> <head> extensions/jefferson/data/session-data-feed.ts extensions/jefferson/data/session-data-store.ts extensions/jefferson/startup.ts tests/instrument.test.ts tests/jefferson.test.ts tests/row-renderer.test.ts tests/session-data-feed.test.ts tests/session-data-store.test.ts openspec/changes/notices-in-the-footer/tasks.md`
  - Green at `00ef4d5`: `suite: 397 passed, 0 failed`, and `changed:` the eight paths … `PASS`
    (`redgreen-derek.md` §6). The count is the spike's, and it already includes the five tests 3.17
    through 3.21 pin.
  - Red: the same `README.md` plant as 1.2 (§6).
  - Boundary: this group's nine allowed paths, two of them the fixture edits group 3's intro names.

## 4. Ship the notice instrument — D5, D6, `2122d26`

The group adds the composed format to the declaration contract, the plain parse and resolve it needs,
the binding that composes a notice's text, the instrument's six defaults, and the `seconds` and
`formats` options with their rejections (D5, D6). It also lands the gate's production, which needs the
judgment D6 puts in the instrument's own file: 4.12 reads the visible time from the rows the root
installs, and 4.13 passes it to the feed. Group 5 lands the four tests that pin them, which is the cut
the spike measured, so both groups' suite counts are his (`michael-pl7-r1.json`, finding 4). The suite
goes from 397 to 409.

- [x] 4.1 A plain format parses the composed values and rejects the cell's own variable
  - Decision: D5 change 3 — the plain mode keeps the grammar and validates against
    `composed.variables`, and `$notice` inside a kind's format is an undeclared name.
  - Command: `node --test --test-name-pattern="a plain format parses" tests/format.test.ts`
  - Red: with `parseFormat`'s plain-mode `declared` reverted to the cell's variables:
    ```
    ✖ a plain format parses the composed values and no modifier
      Error: "notice"'s format names a variable it does not declare: "$tokens"
          at formatError (.../extensions/jefferson/format.ts:42:10)
    ```
  - Green: `✔ a plain format parses the composed values and no modifier` (§2.18).
  - Boundary: an undeclared name in a kind's format, against a declared one.
  - Files: `extensions/jefferson/format.ts`, `tests/format.test.ts`.
- [x] 4.2 A plain format rejects a modifier, a form, the cell's own variable and the bar
  - Decision: D5 — a kind's format carries no styling, so a modifier inside it rejects the document
    naming the instrument and the name (`statusline` spec, "An unknown modifier rejects the document
    when it is read").
  - Command: `node --test --test-name-pattern="a plain format rejects" tests/format.test.ts`
  - Red: with the `if (plain) throw …` line removed:
    ```
    ✖ a plain format rejects a modifier, a form, the cell's own variable and the bar
      AssertionError [ERR_ASSERTION]: Missing expected exception: $tokens|bold
    ```
  - Green: `✔ a plain format rejects a modifier, a form, the cell's own variable and the bar`
    (§2.19).
  - Boundary: each of the four refusals, starting with `$tokens|bold`.
  - Files: `extensions/jefferson/format.ts`, `tests/format.test.ts`.
- [x] 4.3 `resolvePlain` joins a literal and a value, and an absent value as nothing
  - Decision: D5 change 3 — no styling, and an absent value joins as `""` rather than blanking the
    text.
  - Command: `node --test --test-name-pattern="an absent value as nothing" tests/format.test.ts`
  - Red: none transcribed. §2.20 quotes the plant for the pre-resolved parameter only, so this test's
    own red has no transcript.
  - Green: `✔ resolvePlain joins a literal and a value, an absent value as nothing` (§2.20).
  - Boundary: a value the kind carries against one it does not.
  - Files: `extensions/jefferson/format.ts`, `tests/format.test.ts`.
- [x] 4.4 The pre-resolved value wins over the declaration's resolver
  - Decision: D5 change 3 — `resolveFormat`'s one optional parameter, whose only caller is the
    binding; the cell's `warning` foreground survives it (`michael-pl4-r2.json`, `later_gates`).
  - Command: `node --test --test-name-pattern="the pre-resolved value wins" tests/format.test.ts`
  - Red: with the pre-resolved branch in `resolveFormat` removed:
    ```
    ✖ the pre-resolved value wins over the declaration's resolver
      AssertionError [ERR_ASSERTION]: the composed text takes the cell's warning colour
      + '' - '\x1B[33mCache miss: 20k\x1B[39m'
    ```
  - Green: `✔ the pre-resolved value wins over the declaration's resolver` (§2.20).
  - Boundary: the parameter present against absent, where the `notice` resolver's `undefined` would
    blank the cell.
  - Files: `extensions/jefferson/format.ts`, `tests/format.test.ts`.
- [x] 4.5 The declaration may carry a composed format set
  - Decision: D5 change 1 — `composed?: { variable, variables, select, formats }` on
    `InstrumentDeclaration`.
  - Command: `pnpm typecheck`, and the tasks below, which exercise the field.
  - Red: the field removed, `components/instruments/notice.ts` no longer compiles, because its
    `formats` is typed `Record<NoticeKind, string>` over `data/`'s kind type (D5).
  - Green: `tsc --noEmit` clean (`redgreen-derek.md`, the commit table).
  - Boundary: none — a type, with no behaviour of its own.
  - Files: `extensions/jefferson/components/instruments/instrument.ts`.
- [x] 4.6 A notice cell renders its kind's default text in `warning`, and nothing without a notice
  - Decision: D5 changes 1 and 4 — six per-kind defaults, `variableFg` colouring `$notice`, and the
    declaration's `notice` resolver yielding nothing when `select` does.
  - Command: `node --test --test-name-pattern="the notice's default text" tests/instrument.test.ts`
  - Red: with the binding's composed branch removed:
    ```
    ✖ the notice's default text is its kind's, in the warning colour, and nothing shows without a
      notice
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + '' - 'Notice: Cache miss: 125k tokens re-billed (~$0.38)'
    ```
  - Red: with the declaration's `variableFg: { notice: () => "warning" }` removed:
    ```
    ✖ the notice's default text is its kind's, in the warning colour, and nothing shows without a
      notice
      AssertionError [ERR_ASSERTION]: the composed text takes the warning colour; the label does not
      + 'Notice: Cache miss: 125k tokens re-billed (~$0.38)'
      - 'Notice: \x1B[33mCache miss: 125k tokens re-billed (~$0.38)\x1B[39m'
    ```
  - Green: `✔ the notice's default text is its kind's, in the warning colour, and nothing shows
    without a notice` (§2.21).
  - Boundary: each of the six kinds' defaults, the singular `1 thinking block`, and the no-notice
    case.
  - Files: `extensions/jefferson/components/instruments/notice.ts`,
    `extensions/jefferson/components/instruments/instrument-binding.ts`, `tests/instrument.test.ts`.
- [x] 4.7 The instrument ships, and the tests that count shipped instruments say eleven
  - Decision: D5 and D6 — one `shipped.ts` entry, and the expectations the eleventh declaration
    moves: the shipped-declarations test's name, its length of ten, its options equality with
    `blank`'s, and the width-0 guard's list gaining `notice` (`redgreen-derek.md` §3;
    `michael-pl4-r2.json`, `later_gates`).
  - Command: `node --test --test-name-pattern="shipped declarations" tests/instrument.test.ts`, and
    `node --test --test-name-pattern="width 0" tests/instrument.test.ts`
  - Red: the old expectations planted back:
    ```
    AssertionError [ERR_ASSERTION]: + [ 'format', 'style', 'label', 'seconds', 'formats' ]
    - [ 'format', 'style', 'label' ]
    ```
    and `AssertionError [ERR_ASSERTION]: 11 !== 10` (§3).
  - Green: both runs pass, and the only assertion lines the change removes are the three this task
    replaces (`checks/testdiff.sh`, task 9.5).
  - Boundary: a list of ten declarations against a list of eleven — the count itself, and the width-0
    comparison for a text that does not depend on width.
  - Files: `extensions/jefferson/shipped.ts`, `tests/instrument.test.ts`.
- [x] 4.8 A configured kind's format renders the user's words around the declared values
  - Decision: D5 change 2 — `instruments.notice.formats`, each key a kind the declaration carries
    and each value parsed by the same `parseFormat`.
  - Command: `node --test --test-name-pattern="a configured kind's format" tests/instrument.test.ts`
    and
    `node --test --test-name-pattern="a notice cell takes a configured format" tests/configuration.test.ts`
  - Red: with the configuration's `formats` loop emptied, in the configuration half:
    ```
    ✖ a notice cell takes a configured format for its kind, in the document's words
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + 'Notice: Cache miss: 125k tokens re-billed (~$0.38)'
      - 'Notice: Spent 125k, paid (~$0.38)'
    ```
    The instrument half's own red is not transcribed (§2.22).
  - Green: `✔ a configured kind's format renders the user's words around the declared values`, and
    `✔ a notice cell takes a configured format for its kind, in the document's words` (§2.22).
  - Boundary: a format naming each value a kind carries, and one naming a value it does not.
  - Files: `extensions/jefferson/configuration.ts`,
    `extensions/jefferson/components/instruments/notice.ts`, `tests/configuration.test.ts`,
    `tests/instrument.test.ts`.
- [x] 4.9 A `formats` key the declaration does not carry rejects the document
  - Decision: D5 change 2 — the kind vocabulary is the declaration's, checked with
    `Object.hasOwn(declaration.composed.formats, kind)`.
  - Command: `node --test --test-name-pattern="a formats key the notice" tests/configuration.test.ts`
  - Red: with the membership check short-circuited:
    ```
    ✖ a formats key the notice's declaration does not carry rejects the document
      AssertionError [ERR_ASSERTION]
    ```
  - Green: `✔ a formats key the notice's declaration does not carry rejects the document` (§2.24).
  - Boundary: a key that is a kind against one that is not.
  - Files: `extensions/jefferson/configuration.ts`, `tests/configuration.test.ts`.
- [x] 4.10 `formats` that is not an object, and a value that is not a string, each reject
  - Decision: D5 change 2 — the option's two shape checks, each naming the offender.
  - Command: `node --test --test-name-pattern="a formats value that is not a string" tests/configuration.test.ts`
  - Red: with the `typeof format !== "string"` check removed:
    ```
    ✖ a formats value that is not a string, and formats that is not an object, each reject
      AssertionError [ERR_ASSERTION]: pi-jefferson: … was rejected (text.replace is not a function);
      rendering the default row
    ```
  - Red: with the `Array.isArray(entry.formats)` check removed:
    ```
    ✖ a formats value that is not a string, and formats that is not an object, each reject
      AssertionError [ERR_ASSERTION]: pi-jefferson: … was rejected (instrument "notice"'s formats
      names a kind it does not carry: "0"); rendering the default row
    ```
  - Green: `✔ a formats value that is not a string, and formats that is not an object, each reject`
    (§2.25).
  - Boundary: an array against an object, and a number against a string.
  - Files: `extensions/jefferson/configuration.ts`, `tests/configuration.test.ts`.
- [x] 4.11 A `seconds` value outside the bounds rejects the document, naming the option and the value
  - Decision: D6 — a whole number from 1 to 60, default 10 in `NOTICE_SECONDS`, rejected in `rowGap`'s
    shape: `seconds must be a whole number from 1 to 60: <JSON value>`.
  - Command: `node --test --test-name-pattern="a seconds value outside" tests/configuration.test.ts`
  - Red: with the `seconds` bounds check removed:
    ```
    ✖ a seconds value outside the bounds rejects the document and names the option and the value
      AssertionError [ERR_ASSERTION]: the default row renders
      1 !== 10
    ```
  - Green: `✔ a seconds value outside the bounds rejects the document and names the option and the
    value` (§2.23).
  - Boundary: 0, 61, 1.5, `"10"` and null, each against a value inside the bounds.
  - Files: `extensions/jefferson/components/instruments/notice.ts`,
    `extensions/jefferson/configuration.ts`, `tests/configuration.test.ts`.
- [x] 4.12 `readConfiguration` returns the notice's visible time, from the rows the root installs
  - Decision: D3 — the declared `seconds`, or the declared default, and `undefined` when no installed
    row places a `notice` cell; placement read from `cellsFromNames`'s resolved declarations inside the
    ten-cell ceiling, with `NOTICE_SECONDS` read from the instrument's own file.
  - Command: `pnpm typecheck`, and the four tests group 5 lands.
  - Red: this commit adds no test of its own; the four plants are 5.1's, 5.2's, 5.3's and 5.4's, and
    each fails when this return value is removed.
  - Green: `tsc --noEmit` clean (`redgreen-derek.md`, the commit table).
  - Boundary: a document with no `notice` cell and a rejected document, both of which must yield
    `undefined` rather than a number (5.3, 5.4).
  - Files: `extensions/jefferson/configuration.ts`.
- [x] 4.13 `startup.ts` passes the visible time it read to the feed
  - Decision: D3 and D4 — the root hands `feedSessionData` the value, so `data/` reads no
    configuration.
  - Command: `pnpm typecheck`, and 5.2.
  - Red: 5.2's plant, which replaces the pass with `undefined`.
  - Green: `tsc --noEmit` clean (`redgreen-derek.md`, the commit table).
  - Boundary: a document that places the cell against one that does not, at the root where the gate is
    set.
  - Files: `extensions/jefferson/startup.ts`.
- [x] 4.14 The commit is green and touches only the paths this group names
  - Command: `checks/suite.sh <repo> 409` and
    `checks/scope.sh <repo> <base> <head> extensions/jefferson/components/instruments/instrument-binding.ts extensions/jefferson/components/instruments/instrument.ts extensions/jefferson/components/instruments/notice.ts extensions/jefferson/configuration.ts extensions/jefferson/format.ts extensions/jefferson/shipped.ts extensions/jefferson/startup.ts tests/configuration.test.ts tests/format.test.ts tests/instrument.test.ts tests/jefferson.test.ts openspec/changes/notices-in-the-footer/tasks.md`
  - Green at `2122d26`: `suite: 409 passed, 0 failed`, and `changed:` the eleven paths … `PASS`
    (`redgreen-derek.md` §6).
  - Red: the same `README.md` plant as 1.2 (§6).
  - Boundary: this group's twelve allowed paths.

## 5. Gate the notice on the rows the root installs — D3, `4f0e994`

The group adds the four tests that pin the gate, and no production code. Task 4.12 and 4.13 land the
code, where the spike put it, and Derek's `checks/scope.sh` for `4f0e994` lists these two test files
alone (`redgreen-derek.md` §6). So the suite counts on both commits are his: 409 at group 4's, 412
here. The suite goes from 409 to 412.

- [x] 5.1 A notice cell takes the declared `seconds`, or the declared default of ten
  - Decision: D3 — placement read from `cellsFromNames`'s resolved declarations, inside the ten-cell
    ceiling, and `NOTICE_SECONDS` read from the instrument's own file.
  - The behaviour landed in 4.12; this task adds its test.
  - Command: `node --test --test-name-pattern="a notice cell takes the declared seconds" tests/configuration.test.ts`
  - Red: with the placement detection's `placesNotice` forced to `false`:
    ```
    ✖ a notice cell takes the declared seconds, or the declared default of ten
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      undefined !== 30
    ```
  - Green: `✔ a notice cell takes the declared seconds, or the declared default of ten` (§2.26).
  - Boundary: a declared `seconds` against none, where the default ten must appear.
  - Files: `tests/configuration.test.ts`.
- [x] 5.2 A session placing a notice cell takes the three subscriptions, and `message_end` shows it
  - Decision: D3 and D4 — `startup.ts` passes the value it read to `feedSessionData`.
  - The behaviour landed in 4.13; this task adds its test.
  - Command: `node --test --test-name-pattern="placing a notice cell" tests/jefferson.test.ts`
  - Red: with `startup.ts`'s `noticeSeconds` pass replaced by `undefined`:
    ```
    ✖ a session placing a notice cell takes the three notice subscriptions, and the message_end
      shows it
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
        [ 'model_select', 'thinking_level_select', 'turn_end', 'session_info_changed',
      -   'message_end', 'session_compact', 'session_tree' ]
    ```
  - Green: `✔ a session placing a notice cell takes the three notice subscriptions, and the
    message_end shows it` (§2.26).
  - Boundary: a placed cell against no cell, at the composition root where the gate is set.
  - Files: `tests/jefferson.test.ts`.
- [x] 5.3 No notice cell, the default row, and a rejected document each take no visible time
  - Decision: D3 — a rejected document installs the default row, which places no notice cell, so the
    gate and the value cannot disagree.
  - The behaviour landed in 4.12; this task adds its test.
  - Command: `node --test --test-name-pattern="no notice cell" tests/configuration.test.ts`
  - Red: with the absent or empty document's `noticeSeconds` set to `10` where `readConfiguration`
    returns, the test's default-row assertion fails (`redgreen-derek.md` §2.27 records the plant and
    not its output).
  - Green: `✔ no notice cell, the default row and a rejected document each take no visible time`
    (§2.27).
  - Boundary: the default row and the rejected document, against a row that places the cell (5.1).
  - Files: `tests/configuration.test.ts`.
- [x] 5.4 A notice cell past the ten-cell ceiling does not count as placement
  - Decision: D3 — only cells inside the ceiling the reader already applies.
  - The behaviour landed in 4.12; this task adds its test.
  - Command: `node --test --test-name-pattern="past the ten-cell ceiling" tests/configuration.test.ts`
  - Red: with `rows.some(… cell.instrument === bind(notice))` replaced by a raw scan of the
    document's cells, the eleventh cell's `notice` counts and the test's `noticeSeconds === undefined`
    fails. The report records the plant and its expected failure, not a run of it (§2.28).
  - Green: `✔ a notice cell past the ten-cell ceiling does not count as placement` (§2.28).
  - Boundary: the eleventh cell against the tenth.
  - Files: `tests/configuration.test.ts`.
- [x] 5.5 The commit is green and touches only the paths this group names
  - Command: `checks/suite.sh <repo> 412` and
    `checks/scope.sh <repo> <base> <head> tests/configuration.test.ts tests/jefferson.test.ts openspec/changes/notices-in-the-footer/tasks.md`
  - Green at `4f0e994`: `suite: 412 passed, 0 failed`, and `changed:` the two test paths … `PASS`
    (`redgreen-derek.md` §6).
  - Red: the same `README.md` plant as 1.2 (§6).
  - Boundary: this group's three allowed paths.

## 6. Prove the notice cell's alignment, and a fill cell giving up its columns — D8, `cf32ed1`

Alignment and a fill cell's re-seat are the row's arithmetic, so this group adds two assertions to the
row's own suite and no production code: the row already places a centred cell and already re-seats a
row, and the tests pin the notice's text to both. The suite goes from 412 to 414
(`redgreen-derek.md`, the addendum's tree, measured at `162ff07`).

- [x] 6.1 The notice cell's text sits at its alignment
  - Decision: D8 — the notice cell's alignment, in `tests/row-renderer.test.ts` because alignment is
    the row's behaviour (`redgreen-derek.md`, "Where the run contradicts the design" 1).
  - Command: `node --test --test-name-pattern="the notice cell's text sits at its alignment" tests/row-renderer.test.ts`
  - Red: with the row's centre branch removed (`cell.align === "center" ? Math.floor(pad / 2) : 0` →
    `0`):
    ```
    ✖ the notice cell's text sits at its alignment
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + actual - expected
      + 'Notice: Cache miss: 20k tokens re-billed (~$0.10)                               '
      - '               Notice: Cache miss: 20k tokens re-billed (~$0.10)                '
    ```
  - Green: `✔ the notice cell's text sits at its alignment` (§2.29).
  - Boundary: the centre case, which is the discriminator; the left and right cases stay green under
    the same plant.
  - Files: `tests/row-renderer.test.ts`.
- [x] 6.2 A fill cell gives up the notice's columns and takes them back when it expires
  - Decision: the statusline spec's "A notice beside a fill cell", and the ADR 0007 consequence D8
    records — a row holding a notice cell re-seats when a notice arrives and again when it expires
    (`michael-pl7-r1.json`, finding 3).
  - Command: `node --test --test-name-pattern="gives up the notice's columns" tests/row-renderer.test.ts`
  - The test: a row with `distribution: "content"` of a `fills: true` stub and the real bound `notice`
    instrument 6.1 builds, rendered at 80 three times — the notice unknown, then present, then unknown.
    The notice's text takes 49 columns and the fill's is `"a"`, so it asserts `"a".padEnd(80)`, then
    `"a".padEnd(31) + 'Notice: Cache miss: 20k tokens re-billed (~$0.10)'`, then `"a".padEnd(80)`
    again, plus the line's width 80.
  - Red, addendum §6 — plant `cellView`'s `sample !== current` cache reset in `row-renderer.ts` as
    `if (false) { … }`, so a cell keeps the previous sample's text and the notice's cell never takes its
    49 columns:
    ```
    ✖ a fill cell gives up the notice's columns and takes them back when it expires
      AssertionError [ERR_ASSERTION]: the fill gives up the notice's 49 columns
      + actual - expected
      + "a".padEnd(80)
      - "a".padEnd(31) + 'Notice: Cache miss: 20k tokens re-billed (~$0.10)'
    ```
    The plant is shared: the row's own re-seat test at `tests/row-renderer.test.ts:915` runs red under it
    too, so it is not this test's alone.
  - Green: `✔ a fill cell gives up the notice's columns and takes them back when it expires`,
    `ℹ pass 1`, `ℹ fail 0` (addendum §6).
  - Boundary: the empty → text → empty transition beside a fill cell, which no other test renders: the
    re-seat test shrinks a non-empty text with no fill cell, and the fill test and the empty-cell test
    are static (`michael-pl7-r1.json`, finding 3).
  - Files: `tests/row-renderer.test.ts`.
- [x] 6.3 The commit is green and touches only the path this group names
  - Command: `checks/suite.sh <repo> 414` and
    `checks/scope.sh <repo> <base> <head> tests/row-renderer.test.ts openspec/changes/notices-in-the-footer/tasks.md`
  - Green: `suite: 414 passed, 0 failed (expected 414)` / `PASS` at `162ff07`, the spike's commit that
    carries both row-renderer tests (`redgreen-derek.md`, the addendum's tree). For this group's own
    paths, `checks/scope.sh` prints `changed: tests/row-renderer.test.ts` … `PASS` at `cf32ed1` (§6,
    "My calls").
  - Red: the same `README.md` plant as 1.2 (§6).
  - Boundary: this group's two allowed paths.

## 7. Extract the timed show-and-hide into a visual — D10, `a9a9d7d`

The group takes the hiding out of the store and gives it to `components/visuals/timed.ts`: the
declaration's `shownUntil` field, the binding's `timed` call, `Timed<Notice>`, `sampledAt`, and the
store no longer clearing the datum (D10). It shares one commit with group 8, because Part A's
default-text fixtures cannot be green without Part B's bare values (`redgreen-derek.md`, the
addendum's "My calls"). The suite goes from 414 to 424.

Every red below is quoted from `redgreen-derek.md`'s "Addendum — bare values and the escape",
subsections 1 to 5, measured at `a9a9d7d`. Each plant's revert is
`git checkout -- <the planted file>`, and the tree is clean after every pair.

- [x] 7.1 The visual shows its text until the instant and nothing at or after it
  - Decision: D10 — `timed(text, shownUntil, now)`, where `undefined` past the instant is what makes a
    hidden datum unknown to the cell, label and gap included.
  - Command: `node --test tests/timed.test.ts`, the whole file: its four tests are the check.
  - The tests, addendum §1: "shows its text while the render's instant is before the datum's" (9,999 ms
    into a 10 s hold); "hands out nothing at the instant and after it" (10,000 and 10,001); "a missing
    instant on either side hides the text" (three combinations); "the text it was given comes back
    unchanged, an empty one included".
  - Red, §1 — plant `now < shownUntil ? text : undefined` as `now <= shownUntil ? text : undefined`, so
    the instant itself shows:
    ```
    ✖ the timed visual hands out nothing at the instant and after it (0.359208ms)
      AssertionError [ERR_ASSERTION]: at the instant
      + actual - expected
      + 'Notice: Cache miss: 20k tokens re-billed'
      - undefined
          at TestContext.<anonymous> (.../tests/timed.test.ts:24:10)
    ```
  - Green, after the revert: `ℹ tests 4`, `ℹ pass 4`, `ℹ fail 0` (§1).
  - Boundary: one millisecond before the instant against the instant itself and one after it, and an
    absent instant on either side.
  - Files: `extensions/jefferson/components/visuals/timed.ts`, `tests/timed.test.ts`.
- [x] 7.2 A timed declaration shows its text until its instant, and nothing after it
  - Decision: D10 — the binding applies `timed` to the resolved text with the declaration's
    `shownUntil` reading and `readings.sampledAt`, and a hidden text becomes `""`.
  - Command: `node --test --test-name-pattern='timed declaration' tests/instrument.test.ts`
  - The test, §2: a declaration with `defaultLabel: "Timed:"` and
    `shownUntil: readings => readings.notice?.shownUntil`, bound by `instrumentBindings()`. Before the
    instant `"Timed: claude-opus-4"`; at and after it `""` with no text, no label and no gap; a later
    instant shows the same text again; an unknown instant hides it.
  - Red, §2 — plant the binding's ternary as `return text;`, so the declaration's `shownUntil` is
    ignored:
    ```
    ✖ a timed declaration shows its text until its instant and nothing after it, label included (4.816667ms)
      AssertionError [ERR_ASSERTION]: at the instant: no text, no label, no gap
      + actual - expected
      + 'Timed: claude-opus-4'
      - ''
          at TestContext.<anonymous> (.../tests/instrument.test.ts:422:10)
    ```
  - Green, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0` (§2).
  - Boundary: the instant itself, where the label must go with the text; the left and right sides stay
    green under the same plant.
  - Files: `extensions/jefferson/components/instruments/instrument.ts`,
    `extensions/jefferson/components/instruments/instrument-binding.ts`, `tests/instrument.test.ts`.
- [x] 7.3 The notice instrument is timed through its own reading
  - Decision: D10 and D1 — the declaration carries `shownUntil: readings => readings.notice?.shownUntil`
    and nothing else about time; the composed step is untouched.
  - Command: `node --test --test-name-pattern='the notice instrument shows its text' tests/instrument.test.ts`
  - The test, §3: the shipped `notice` declaration, bound, holding a `miss` with `shownUntil: 1`.
    Before the instant `"Notice: Cache miss: 125k tokens re-billed"`; at and after it `""`.
  - Red, §3 — plant the `shownUntil` line removed from `components/instruments/notice.ts`:
    ```
    ✖ the notice instrument shows its text until its instant and nothing after it (4.306792ms)
      AssertionError [ERR_ASSERTION]: at the instant: no label and no gap
      + actual - expected
      + 'Notice: \x1B[33mCache miss: 125k tokens re-billed\x1B[39m'
      - ''
          at TestContext.<anonymous> (.../tests/instrument.test.ts:438:10)
    ```
  - Green, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0` (§3).
  - Boundary: the shipped instrument, which is the visual's first user; the composed text still takes
    `warning` before it hides.
  - Files: `extensions/jefferson/components/instruments/notice.ts`, `tests/instrument.test.ts`.
- [x] 7.4 Every test the amendment moves, each red against its old expectation
  - Decision: D10 — the sample carries `sampledAt`, a timed datum carries `shownUntil`, and the store
    never hides, so each old expectation now reads the new state.
  - Command: `git checkout 162ff07 -- <the file>`, then `node --test <the file>` whole, per file in the
    table. The revert is the plant: the old expectation against the new code.
  - Red, §4 — twenty-four tests across seven files, plus one typecheck-only move:

    | File | Old tests moved | Reverted run |
    | --- | --- | --- |
    | `tests/session-data-store.test.ts` | 12 | 47 / 35 / 12 |
    | `tests/session-data-feed.test.ts` | 3 | 21 / 18 / 3 |
    | `tests/notice.test.ts` | 3 | 15 / 12 / 3 |
    | `tests/instrument.test.ts` | 2 | 32 / 30 / 2 |
    | `tests/row-renderer.test.ts` | 2 | 55 / 53 / 2 |
    | `tests/configuration.test.ts` | 1 | 129 / 128 / 1 |
    | `tests/jefferson.test.ts` | 1 | 44 / 43 / 1 |
    | `tests/format.test.ts` | 0 runtime | 64 / 64 / 0, and `pnpm typecheck` fails |

    The store's twelve, quoted: the sample's key list gains `+ 'sampledAt'`; four fixture spreads gain
    `sampledAt` (`0`, or `undefined` after disposal); the two notice-datum tests gain
    `+ shownUntil: 10000,`; and five lifecycle tests read the held notice where they expected
    `undefined`, which is the hiding leaving the store — "the visible time is over" reads
    `{ kind: 'miss', shownUntil: 10000, values: { cost: ' (~$0.10)', tokens: '20k' } }` against
    `undefined`.
  - Red, the row-renderer's: "the notice cell's text sits at its alignment" renders 80 spaces where the
    old literal expected the padded notice, and "a fill cell gives up the notice's columns" renders
    `"a" + 79 spaces` where it expected `"a".padEnd(31) + "Notice: Cache miss: 20k tokens re-billed
    (~$0.10)"` (§4).
  - Red, the format test's typecheck-only move: `seed` gains `sampledAt: 0` and `shown` gains
    `shownUntil: 1`, no test reads them, and the reverted file runs `64 / 64 / 0` while `tsc` reports
    `error TS2741: Property 'sampledAt' is missing` and `error TS2322: … is not assignable to type
    'Timed<Notice>'` (§4).
  - Green, after each revert: the file's run at HEAD, and `pnpm typecheck` printing only
    `$ tsc --noEmit` (§4).
  - Boundary: every expectation the amendment moved, one file at a time, against the code that moved it.
  - Files: `tests/session-data-store.test.ts`, `tests/session-data-feed.test.ts`, `tests/notice.test.ts`,
    `tests/instrument.test.ts`, `tests/row-renderer.test.ts`, `tests/configuration.test.ts`,
    `tests/jefferson.test.ts`, `tests/format.test.ts`.
- [x] 7.5 A visual imports nothing of this package
  - Decision: D10 and the layout spec's generalized visual requirement — `components/visuals/` files
    import no source file of the package, and any component or `format.ts` may import one.
  - Command: `node checks/imports.mjs <repo>`
  - Red, §5 — plant `import { collapse } from "../../format.ts";` at the top of `timed.ts`:
    ```
    VISUAL IMPORTS extensions/jefferson/components/visuals/timed.ts imports extensions/jefferson/format.ts
    IMPORTS FAIL
    ```
  - Green, after the revert: `edges: 52`, `PASS`; the `CLOCK` rule still names only `startup.ts`, and
    the run prints no `CYCLE` (§5).
  - Boundary: the one edge the widening could open — a visual reaching back into the package it is
    mixed into.
  - Files: `checks/imports.mjs`.

## 8. Keep English out of the notice's values — D5, D11, `a9a9d7d`

The group makes `$blocks` the bare count with the kind split by number, makes `$idle` the bare
minutes with pi's `6m` arriving through `missIdle`'s `$idle\m`, and generalizes the format language's
escape so that `\` yields the character after it (D5, D11). It is the same commit as group 7, and the
suite is 424 on both sides of the pair. Every red is quoted from `redgreen-derek.md`'s addendum,
subsections 6 to 10.

- [x] 8.1 `$blocks` is the bare count, and the kind follows the count
  - Decision: D5 — the value carries the number, and the noun is the kind's, so `thinkingOne` exists
    for a count of one.
  - Command: `node --test --test-name-pattern='the thinking delta' tests/notice.test.ts`
  - Red, §6 — plant the old `const noun = dropped === 1 ? "thinking block" : "thinking blocks"` and its
    `{ kind: "thinking", values: { blocks: `${dropped} ${noun}` } }` back in place of
    `{ kind: dropped === 1 ? "thinkingOne" : "thinking", values: { blocks: `${dropped}` } }`:
    ```
    ✖ the thinking delta shows when the count rises and stays silent when it repeats (0.735834ms)
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
      + actual - expected
        { kind: 'thinking', values: { + blocks: '2 thinking blocks' / - blocks: '2' } }
    ✖ the thinking delta reads the branch, not the entries: a sibling's higher count stays silent (0.194375ms)
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
      + actual - expected
        { + kind: 'thinking' / - kind: 'thinkingOne', values: { + blocks: '1 thinking block' / - blocks: '1' } }
    ```
  - Green, after the revert: `ℹ tests 3`, `ℹ pass 3`, `ℹ fail 0` (§6).
  - Boundary: two blocks against one, where the noun and the kind both change.
  - Files: `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`.
- [x] 8.2 `thinkingOne`'s default text is pi's singular
  - Decision: D5 — the seventh kind's default,
    `Anthropic dropped $blocks thinking block (details in session)`.
  - Command: `node --test --test-name-pattern="notice's default text" tests/instrument.test.ts`
  - Red, §7 — plant `thinkingOne`'s default as the plural noun:
    ```
    ✖ the notice's default text is its kind's, in the warning colour, and nothing shows without a notice (4.753833ms)
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + actual - expected
      + 'Notice: Anthropic dropped 1 thinking blocks (details in session)'
      - 'Notice: Anthropic dropped 1 thinking block (details in session)'
    ```
  - Green, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0` (§7).
  - Boundary: the one-block case, which is the only case the kind chooses; the plural case stays green
    under the same plant.
  - Files: `extensions/jefferson/components/instruments/notice.ts`, `tests/instrument.test.ts`.
- [x] 8.3 `$idle` is bare, and `6m` arrives through `missIdle`
  - Decision: D5 and D11 — the value is the minutes, the text carries `$idle\m`, and each end has one
    owner.
  - Command: `node --test --test-name-pattern='the idle variant' tests/notice.test.ts`, then
    `node --test --test-name-pattern="notice's default text" tests/instrument.test.ts`
  - Red, §8, the value's end — plant
    `` values.idle = `${Math.round(miss.idleMs / MINUTE_MS)}` `` as `` …}m ``:
    ```
    ✖ the idle variant: exactly five minutes reads missIdle and a millisecond under does not (0.870958ms)
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      '5m' !== '5'
          at TestContext.<anonymous> (.../tests/notice.test.ts:101:10)
    ```
  - Red, the text's end — plant `missIdle: "Cache miss after $idle\\m idle: …"` as `$idle idle`:
    ```
    ✖ the notice's default text is its kind's, in the warning colour, and nothing shows without a notice (4.837375ms)
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + actual - expected
      + 'Notice: Cache miss after 6 idle: 125k tokens re-billed'
      - 'Notice: Cache miss after 6m idle: 125k tokens re-billed'
    ```
  - Green, after each revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0` (§8).
  - Boundary: the unit at each end. The instrument's case supplies the literal `"6"`, so the data-side
    plant does not reach it; both ends in one run would render `6mm`, which is not a state the tree
    reaches (`redgreen-derek.md`, "Where the run contradicts the contract" 3).
  - Files: `extensions/jefferson/data/notice.ts`,
    `extensions/jefferson/components/instruments/notice.ts`, `tests/notice.test.ts`,
    `tests/instrument.test.ts`.
- [x] 8.4 A backslash yields the character after it
  - Decision: D11 — `\` escapes any character, in a cell's format and a kind's alike.
  - Command: `node --test --test-name-pattern='backslash|same escape|ADR 0003' tests/format.test.ts` —
    the whole escape set: five tests, three red under the plant and two green (the trailing-backslash
    pair). The alternation is proposed and was not run; the reds and greens below were measured with
    the three per-case patterns (§9).
  - The tests, §9: five are selected, three red and two green. The three reds are the new tests "a
    backslash ends a name run, so the name is the value and the escaped character is literal"
    (`$model\m`), "a backslash yields any character, a space included" (`a\b`, `a\ b`) and "a plain
    format takes the same escape as a cell's format" (`$idle\m`). The two greens are the
    trailing-backslash pair: "the special characters keep the escape ADR 0003 gave them", and a
    trailing backslash stays itself.
  - Red, §9 — plant `if (character === "\\" && format[index + 1] !== undefined)` as the old
    two-character rule `if (character === "\\" && (format[index + 1] === "$" || format[index + 1] === "|"))`:
    ```
    ✖ a backslash ends a name run, so the name is the value and the escaped character is literal (0.995625ms)
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + actual - expected
      + 'claude-opus-4\\m'
      - 'claude-opus-4m'
    ```
    ```
    ✖ a backslash yields any character, a space included (0.936083ms)
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      'a\\b' !== 'ab'
    ```
    ```
    ✖ a plain format takes the same escape as a cell's format (1.269333ms)
      AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
      + actual - expected
      … { kind: 'literal', modifiers: [], + text: '\\m idle' / - text: 'm idle' }
    ```
  - Green, after the revert: `✔` on all four, `ℹ pass 4`, `ℹ fail 0` (§9).
  - Boundary: a backslash before a letter, before a space, and before the two characters the language
    already escaped; the trailing backslash has no character after it and stays itself.
  - Files: `extensions/jefferson/format.ts`, `tests/format.test.ts`.
- [x] 8.5 An unknown `formats` key still rejects, `thinkingTwo` included
  - Decision: D5 — the kind vocabulary is the declaration's, and a near miss is unknown.
  - Command: `node --test --test-name-pattern="formats key the notice" tests/configuration.test.ts`
  - The test, §10: it now loops over `["warm", "thinkingTwo"]`, because `thinkingOne` became a kind.
  - Red, §10 — plant the membership check as `if (false)`, so any key is taken:
    ```
    ✖ a formats key the notice's declaration does not carry rejects the document (1.493584ms)
      AssertionError [ERR_ASSERTION]
        actual: undefined,
        expected: true,
    ```
  - Green, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0` (§10).
  - Boundary: `thinkingTwo` against `thinkingOne`, the key the amendment added.
  - Files: `extensions/jefferson/configuration.ts`, `tests/configuration.test.ts`.
- [x] 8.6 The audit of every format's backslash, and its result
  - Decision: D11 — the escape changes what a document carrying a literal backslash before a letter
    means, silently, so ADR 0003's audit is repeated over the tree.
  - Command: `git grep -n '\\'` over the tree, then every backtick span in the markdown and every
    `defaultFormat`, `formats` and `format` value in the source and the tests read and classified.
  - Method and result, addendum's "The audit of every format's backslash": 776 lines matched, and
    **none found**. No format the repository already carried has a backslash before a character other
    than `$` or `|`.
  - The five groups the backslashes fall into: `\$` and `\|`, the two the language always escaped;
    `\n`, `\r`, `\t`, `\x1b` and `\u…` in code examples, labels and status texts; a trailing
    backslash with nothing after it (`tests/format.test.ts:82`); Starship's own language in the
    research files, which pi-jefferson does not parse; and the change's own additions, which are the
    new rule's users.
  - `~/.pi/agent/pi-jefferson.json`, read and not edited: no backslash at all, and its five formats are
    `$path`, `$model via|dim $provider|capitalize`, `$level|capitalize`, `$bar $percent` and `""`.
  - Green: no casualty, so no document changes meaning, and D11's cost is paid with nothing behind it.
  - Boundary: a format the repository carried against one the change adds — the first is what the audit
    is for, the second is the rule's own user.
  - Files: none; the audit reads the tree.
- [x] 8.7 The commit is green and touches only the paths the two amendment groups name
  - Command: `checks/suite.sh <repo> 424` and
    `checks/scope.sh <repo> 162ff07 a9a9d7d extensions/jefferson/components/instruments/instrument-binding.ts extensions/jefferson/components/instruments/instrument.ts extensions/jefferson/components/instruments/notice.ts extensions/jefferson/components/visuals/timed.ts extensions/jefferson/data/notice.ts extensions/jefferson/data/session-data-store.ts extensions/jefferson/format.ts checks/imports.mjs tests/configuration.test.ts tests/format.test.ts tests/instrument.test.ts tests/jefferson.test.ts tests/notice.test.ts tests/row-renderer.test.ts tests/session-data-feed.test.ts tests/session-data-store.test.ts tests/timed.test.ts openspec/changes/notices-in-the-footer/tasks.md`
  - Green at `a9a9d7d`: `suite: 424 passed, 0 failed (expected 424)` `PASS`, and `checks/scope.sh` over
    the sixteen paths the addendum's head names prints `every changed path is one the task names`,
    `PASS` (`redgreen-derek.md`, the addendum's "The tree at the addendum's head").
  - The allowed list above is every path the addendum's measurements name, and `tasks.md`; the
    addendum's head says sixteen and does not list them, so this list is the ceiling and not a count.
  - Red: the same `README.md` plant as 1.2, which prints `NOT NAMED BY THE TASK: README.md` and
    `SCOPE FAIL`.
  - Boundary: this group's paths, shared by both halves because one commit carries them.

## 9. The checks that span the change, Joel's check and the sync

These read the change as a whole, so they run after the eight groups are in. Task 9.6 runs before the
specs are synced. None of them adds behaviour.

- [x] 9.1 The whole suite passes and the type check is clean
  - Decision: D8 — the suite green with the change in.
  - Command: `checks/suite.sh <repo> 425`
  - Red: with `format.ts`'s plain-mode variable set reverted to the cell's variables:
    ```
    ✖ a plain format parses the composed values and no modifier
      Error: "notice"'s format names a variable it does not declare: "$tokens"
    ```
  - Green: `tests 425`, `pass 425`, `fail 0`, then `suite: 425 passed, 0 failed (expected 425)` /
    `PASS` (`redgreen-derek.md`, the amendment addendum's tree: 424 at `a9a9d7d`, 414 at `162ff07`;
    group 10's empty-kind test is the twenty-fifth, and 10.1 moves assertions only). The pinned count
    carries it; which tests are new is 7.4's, 8.1 to 8.5's and 10.2's business, by name.
  - Boundary: every task above, run together.
  - Files: none.
- [x] 9.2 The import boundaries hold
  - Decision: D-a, D-b and the layout spec's "Imports between the homes run one way"; the clock only
    in `startup.ts` (`michael-pl4-r2.json`, `later_gates`).
  - Command: `node checks/imports.mjs <repo>`
  - Red: a `data/` file importing `../components/…` prints `DATA LEAK`, and a `setTimeout` in
    `data/session-data-store.ts` prints `CLOCK … names a process clock; only startup.ts may`
    (`redgreen-derek.md` §5).
  - Green: `files: 28`, `edges: 52`, `PASS`, with `data/notice.ts` importing nothing outside `data/`,
    `components/instruments/notice.ts` importing the contract and a `data/` type only,
    `components/visuals/timed.ts` importing nothing of the package, and the clock and the scheduler in
    `startup.ts` alone (§5; the amendment addendum §5).
  - Boundary: the two leak directions the change could open — a `data/` file reaching out, and a
    process clock reached for outside the root.
  - Files: none.
- [x] 9.3 Nothing reads the terminal and nothing shells out
  - Decision: Joel's 2026-11-05 ruling, "pi is the source of truth".
  - Command: `checks/terminal.sh <repo>`
  - Red: a `child_process` import in `data/notice.ts` fails the scan with the matching line and
    `TERMINAL FAIL` (`redgreen-derek.md` §7).
  - Green: `no spawn and no terminal read under extensions/` … `PASS` (§7).
  - Boundary: none — the scan covers every shipped file.
  - Files: none.
- [x] 9.4 The tarball ships the new files and nothing else
  - Decision: the layout spec's shipped-path rule.
  - Command: `checks/tarball.sh <repo> 28`
  - Red: a `.test.ts` beside the source prints `TEST FILE SHIPPED`, a tracked source file missing
    from the pack prints `TRACKED BUT NOT SHIPPED`, and a wrong count prints `SOURCE COUNT … IS NOT …`
    (`redgreen-derek.md` §8).
  - Green: `source files under extensions/: 28 (tracked: 28) (expected: 28)` / `PASS`, the three new
    files among them (§8; the amendment addendum's "The tree at the addendum's head").
  - Boundary: the three new files added to the previous 25, and no test file among them.
  - Files: none.
- [x] 9.5 Every assertion line the change edits is one the tasks name
  - Decision: D8, and the expectation edits task 4.7 names — the eleventh declaration's length and
    options, and the width-0 guard's list (`redgreen-derek.md` §3).
  - Command: `checks/testdiff.sh <repo> b9668d9`, and again
    `checks/testdiff.sh <repo> 0d6cd85` for the amendment's range on this branch.
  - Red: the old expectations planted back fail with
    `+ [ 'format', 'style', 'label', 'seconds', 'formats' ] - [ 'format', 'style', 'label' ]`, and
    with `11 !== 10` (§3).
  - Green, `b9668d9..162ff07`: the removed lines are the three the shipped-declarations test carried,
    and every added line is a new test's own assertion (§3).
  - Green, `0d6cd85..HEAD`: twenty-five removed assertion lines, every one under `tests/`, measured
    with `checks/testdiff.sh` (`redgreen-derek.md` has no measure of the amendment's range). Michael
    measured the twenty at the implementation gate; the twenty-first is that gate's first finding, the
    store's reworded `the first's handle was cancelled when the second arrived`, where the range held
    the old wording; and Validate's four are 10.1's, each an expectation the arrival's repaint moves —
    `the arrival requests nothing; the host renders the event`, `an early fire asks for nothing`,
    `no expiry repaints after disposal` and `a message after disposal takes no notice`, which now read
    the arrival's one. The store's `undefined` expectations after the deadline, the `"5m"` idle, the
    `"1 thinking block"` blocks, the `"warm"` key message, the fill cell's last `padEnd(80)`, and the
    notice deep-equals that gain `shownUntil` are the twenty.
  - Each is a shipped fact that moved — the store no longer hides, `shownUntil` joins the datum,
    `$idle` and `$blocks` are bare, and `thinkingOne` exists — so each line is an expectation a task
    names: 7.4 by file and count, 8.1 to 8.5 by case, 10.1 by the arrival's request.
  - Re-run and ticked on the branch. The old green held only for `b9668d9..162ff07` and was false
    against the amended range, which is why the tick had gone back; the spike's `162ff07..a9a9d7d`
    is not this branch's range, because `162ff07` predates the implementation gate's fixes.
  - Boundary: an expectation edited to fit the new code, against one edited because a shipped fact
    changed.
  - Files: `tests/` only, as the report's diff names.
- [x] 9.6 Every requirement paragraph stays under the ceiling, and the change validates
  - Decision: the specs the sync will merge, measured before it.
  - Command: `checks/specs.sh /Users/joelleibow/Projects/pi-jefferson notices-in-the-footer`, run
    from the main checkout.
  - Red: a paragraph over 500 characters prints `<file>:<line>: <n> characters, over 500: …` and
    `PASS` is not printed, which is what `extension-source-layout/spec.md:24` did at 573; a requirement
    whose scenario is missing fails `openspec validate notices-in-the-footer --strict`
    (`redgreen-derek.md` §9).
  - Green: `Change 'notices-in-the-footer' is valid`, then `none over 500` for the three deltas. The
    amendment's own measures were 480 and 386 characters for `statusline` and `session-data-store`,
    and `extension-source-layout`'s visual requirement measured 573 — over the ceiling, which is
    `redgreen-derek.md`'s "Where the run contradicts the contract" 1. This amendment trimmed it to 470
    characters by count.
  - The trimming is counted, not run: I have no shell, so `checks/specs.sh` is the conductor's to run
    before the sync.
  - Boundary: 500 characters, measured per requirement paragraph, over the three delta specs.
  - Files: none.
- [ ] 9.7 **Joel's check** — the footer shows the notice as he wants it
  - Decision: his 2026-11-10 ruling ("Let's /skill:conductor-janet that thing up. I'd love to see it
    in action!!!") and `michael-pl4-r2.json`'s `later_gates`.
  - What it covers: a notice appears in the footer with the `Notice:` label, the 10-second default
    reads right to him, the configured `formats` read in his own words, and whether a fade follows
    (`design.md`, Open Questions 1 and 2).
  - Command: his own session, which no test stands in for.
  - Ticked by the conductor alone, with his observation in his words, before the archive. No writer
    ticks this.
  - Boundary: the real footer, the real clock and the real pi — the three things no check here
    reaches.
  - Files: none.

## 10. The fixes Validate asked for

Two fixes land before Derek re-validates. A notice's arrival requests its own repaint, which the living
store spec requires and which the change leaned on pi to supply; and an empty kind text silences its
kind, which Joel ruled at Validate (`michael-validate.json`, findings 1 and 2; `owner-rulings.md`,
"2026-11-11: At Validate").

The arrival fix adds no test, so its commit stays at 424; the empty-kind fix adds one and takes the
suite to 425. Michael's re-validation runs `checks/suite.sh . 425`, `checks/scope.sh` over the fix
commit, and `testdiff` over `0d6cd85..HEAD`, whose moved counts are 9.5's to name.

- [x] 10.1 A notice's arrival requests a repaint, as every push does
  - Decision: D1's Flow and the living store spec's "A pushed change that alters displayed data
    results in a repaint" — the store asks for its own repaint and never leans on the host's.
  - Test: "a completed assistant message's notice is the store's notice datum" in
    `tests/session-data-store.test.ts` asserts `repaints() === 1` after `messageEnded`; the expiry
    tests' counts move from 1 to 2, arrival then expiry; the early-fire test's "asks for nothing"
    holds for the fire alone with the arrival's request asserted first; "disposal … repaints nothing"
    and "with no visible time" stay at 0.
  - Command: `node --test --test-name-pattern="completed assistant message" tests/session-data-store.test.ts`
  - Plant: `requestRender?.()` removed from `showNotice`, after `armExpiry`.
  - Red, measured in Implement — the expectations moved and the plant applied:
    ```
    ✖ a completed assistant message's notice is the store's notice datum
      AssertionError [ERR_ASSERTION]: the arrival requests one repaint, as every push does
      0 !== 1
          at TestContext.<anonymous> (.../tests/session-data-store.test.ts:508:10)
    ```
    and `tests/session-data-store.test.ts` runs `ℹ tests 47`, `ℹ pass 42`, `ℹ fail 5`: the arrival's
    datum test, the instant's, the read-past's, the early fire's and disposal's. "With no visible time"
    stays at 0, because no notice is held to request a repaint for.
  - Green, after the revert: the five pass, the file is `ℹ tests 47` / `ℹ pass 47` / `ℹ fail 0`, and
    `checks/suite.sh . 424` prints `suite: 424 passed, 0 failed (expected 424)` / `PASS` — no test is
    added, only assertions moved.
  - Boundary: the arrival's request against the instant's, which are two and neither may be the only
    one.
  - Files: `extensions/jefferson/data/session-data-store.ts`, `tests/session-data-store.test.ts`.
- [x] 10.2 An empty kind text silences that kind
  - Decision: D5's empty-kind sentence, and Joel's 2026-11-11 ruling — a kind whose configured text is
    empty shows nothing, label and gap included, while that notice would otherwise show.
  - Test: `formats.miss: ""` with a miss held renders `""`, with no `Notice:` label and no gap, and a
    whitespace-only text trims to the same. A kind text whose only value a miss does not carry
    (`$idle`) is silenced by the same rule, which is the third input Validate reproduced. A kind with
    text still renders.
  - Command: `node --test --test-name-pattern="an empty kind text" tests/instrument.test.ts`
  - Plant: the binding's empty-text rule removed, so an empty composed text renders `Notice: ` as any
    empty value does.
  - Red, measured in Implement — the test written and the plant applied:
    ```
    ✖ an empty kind text silences that kind
      AssertionError [ERR_ASSERTION]: an empty kind text renders nothing, label included
      'Notice: ' !== ''
          at TestContext.<anonymous> (.../tests/instrument.test.ts:453:10)
    ```
    The three empty inputs fail at that first assertion; the kind-with-text case passes either way,
    which is what makes the plant a plant rather than a deletion.
  - Green, after the revert: `✔ an empty kind text silences that kind`, `ℹ tests 35` / `ℹ pass 35` /
    `ℹ fail 0` for the file, and `checks/suite.sh . 425` prints
    `suite: 425 passed, 0 failed (expected 425)` / `PASS` — one test more than the 424.
  - Boundary: an empty kind text against an absent one: the first silences that kind, and the second is
    the unknown rule's, not this one.
  - Files: `extensions/jefferson/components/instruments/instrument-binding.ts`, `tests/instrument.test.ts`.

## The docs pass — not tasks

`design.md` D9 lists them, and they are written after the implementation gate, in Bambadjan's docs
pass. `README.md` takes the instrument, `seconds`, `formats`, the contract with pi's
`showCacheMissNotices`, why cache warm is absent, and the amendment's escape — the two sentences at
`:100-103` and `:181-184` that say a backslash escapes only `$` and `|`. `ARCHITECTURE.md` takes the
datum, the events, the two injected readers, the composed-format contract and the gate, and the
amendment's `visuals/` sentences (`:21`, `:92`, `:126-127`). `AGENTS.md` takes adding a notice kind,
the `shortcut:` pin, the two traps, and the amendment's sentence that a visual imports nothing of the
package and a timed instrument declares `shownUntil`. `docs/adr/` takes four: the store keeping time,
an instrument's text composed from a format a reading chooses, the visual as a pure part, and the
generalized escape extending ADR 0003. No gate follows that pass, by Joel's ruling that documentation
gets no review loop and never blocks a feature.

## What these tasks do not claim

- **The spec's two row scenarios are not both notice tests.** "A cell narrower than the notice" is the
  row's clip arithmetic, which `tests/row-renderer.test.ts:86` and `:149` already measure, and the
  notice's text does not depend on width (4.7's guard), so no notice test carries it. "A notice beside
  a fill cell" is 6.2, added on Michael's ruling (`michael-pl7-r1.json`, finding 3; `design.md` D8).
- **No live pi was observed.** No `/reload`, no `/jefferson`, no real TUI, so the footer's real
  `Notice: …` line is Joel's check alone (9.7), not a measured green.
- **The clock is a fake.** The visible time is driven by an injected clock and a recording scheduler,
  and the hiding is the visual's, compared against the sample's instant; the real `setTimeout` and the
  host's clock are not measured ("Not verified").
- **Six tests were strengthened at `162ff07`.** The inputs and plants the tasks gate set (2.10's miss
  half, 2.11, 2.14, 3.17 through 3.21 and 6.2) were measured against the spike's `162ff07`, not the
  commits their groups name, and each task that cites `redgreen-derek.md`'s addendum says so
  (`michael-pl7-r1.json`, findings 2 and 3). Every red in this file is quoted from the report.
- **Two plants are described, not run.** 5.3's `noticeSeconds` plant and 5.4's raw-scan plant are
  recorded in `redgreen-derek.md` §2.27 and §2.28 as the plant and its expected failure, not as a
  quoted run. 4.3's and 4.8's instrument half are likewise untranscribed.
- **Group 1 adds no test.** D4 asks for the suite green on both sides of a reorder that changes no
  behaviour, and `michael-pl4-r2.json`'s `later_gates` confirms that shape for that step.
- **The amendment's reds are the spike's `a9a9d7d`, measured against this change's amended design and
  deltas while the spike's own `openspec/` copy stayed pre-amendment** (`redgreen-derek.md`, "Where the
  run contradicts the contract" 2).
- **CI and the release workflow were not run.** The tarball was checked locally only.
- **Render cost of a row re-seating on a notice's arrival and expiry was not measured**
  (`michael-pl4-r2.json`, `not_covered`), so no task claims a performance property.
