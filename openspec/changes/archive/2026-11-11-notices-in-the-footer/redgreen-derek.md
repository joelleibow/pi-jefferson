# Red/green measurement of every check a task will rely on (Derek, scratch spike)

Joel's ruling for this pipeline: *before `tasks.md` is drafted, every check a task relies on is run and shown going red and then green*, so each task can cite a measured command, a measured red and a measured green. Derek run on 2026-11-10, worktree `/Users/joelleibow/Projects/pi-jefferson/.pi/marbleization/notices-in-the-footer/spike`, branch `notices-in-the-footer-spike`, base `b9668d9` (clean, `pnpm install` done, 360 passing). Nothing here ships; Implement starts again from `tasks.md` on the real branch. Check scripts are in `openspec/changes/notices-in-the-footer/checks/` and take the repository path as an argument; none defaults to a repository, and nothing writes under `/tmp`. Transcribed verbatim.

**Done so far: the change is built as eight commits, each green, and every check the brief lists is measured and written here.** D9's docs pass is after the implementation gate, so it is not part of this spike and is not measured. The sections below fill in group by group; a group's reds and greens are recorded as it closes.

## The spike commits

```
162ff07 Strengthen the notice tests the tasks gate named
cf32ed1 Prove the notice cell's text sits at its alignment
2122d26 Ship the notice instrument: a composed format per kind, and the plain format it needs
4f0e994 Gate the notice on the rows the root installs, and pass its visible time from the configuration
00ef4d5 Hold the notice's slot and its expiry in the store, and feed the three events
65e8478 Copy pi's notice rule into the data home, and prove each edge
1074629 Read the configuration before building the feed, so the store can be given its visible time
b9668d9 Fix Michael's two minor design findings: the timer callback's branches and the layout spec's importers  (base)
```

`git status --porcelain --untracked-files=all` is empty at HEAD. Nothing is staged. Nothing was pushed.

| commit | task it builds | tests | typecheck |
|---|---|---|---|
| `b9668d9` base | — | 360 | clean |
| `1074629` | D4's reorder: `readConfiguration` before the feed | 360 | clean |
| `65e8478` | D1's rule: `data/notice.ts` and its boundary tests | 375 | clean |
| `00ef4d5` | D1/D2/D7: the store's notice slot, expiry and timer; the feed's three subscriptions | 397 | clean |
| `2122d26` | D5/D6: `composed`, the plain format, the binding, the notice instrument and its `seconds`/`formats` options | 409 | clean |
| `4f0e994` | D3: `readConfiguration`'s `noticeSeconds`, the placement detection, and the root's pass | 412 | clean |
| `cf32ed1` | the brief's alignment check for the notice's cell | 413 | clean |
| `162ff07` | the tasks gate's six reds: the reset, the two lists, the aborted miss, the store's source, five store tests and the fill cell's columns | 414 | clean |

## The checks

| Check | Command |
|---|---|
| 1 suite | `checks/suite.sh <repo> 414` |
| 2 behavioral tests | `node --test --test-name-pattern=… tests/<file>.test.ts` (the flag before the file), each with a planted mistake |
| 3 the expectation edits | `checks/testdiff.sh <repo> b9668d9`, and the old expectation planted back |
| 4 export pin | `node --test --test-name-pattern="exported surface" tests/jefferson.test.ts` (the flag before the file), with a row removed and with a widened export |
| 5 import boundaries | `node checks/imports.mjs <repo>` |
| 6 named files only | `checks/scope.sh <repo> <base> <head> <allowed path>…` |
| 7 no terminal, no shell-out | `checks/terminal.sh <repo>` |
| 8 tarball | `checks/tarball.sh <repo> 27` |
| 9 specs | `checks/specs.sh <main checkout> notices-in-the-footer [specs dir]` |

### 1. `suite.sh` — `pnpm typecheck` + `pnpm test`

- Green at every commit: 360 → 360 → 375 → 397 → 409 → 412 → 413, `tsc` clean at each (the table above).
- Green at HEAD:

```
$ checks/suite.sh <spike> 413
ℹ tests 413
ℹ pass 413
ℹ fail 0
suite: 413 passed, 0 failed (expected 413)
PASS
```

- Red, through a planted mistake: `format.ts`'s plain-mode variable set reverted to the cell's variables (§2.6 records the same plant):

```
✖ a plain format parses the composed values and no modifier
  Error: "notice"'s format names a variable it does not declare: "$tokens"
      at formatError (.../extensions/jefferson/format.ts:42:10)
      at parseFormat (.../extensions/jefferson/format.ts:74:15)
```

### 2. The behavioral tests, each with its planted red

The D8 boundary inputs on the pure rule are in `tests/notice.test.ts`, committed with `65e8478`; the store's slot and timer in `tests/session-data-store.test.ts` and the feed's three events in `tests/session-data-feed.test.ts`; the instrument's texts and the plain format in `tests/instrument.test.ts` and `tests/format.test.ts`; the configuration's `seconds`, `formats` and gate in `tests/configuration.test.ts`; the end-to-end gate in `tests/jefferson.test.ts`; the notice cell's alignment in `tests/row-renderer.test.ts`.

Every red below was produced by a planted mistake in a committed file, run against only the named test, and reverted with `git checkout --` (tree clean after each).

#### 2.1 D8's boundary inputs on `data/notice.ts` — `tests/notice.test.ts` (committed with `65e8478`)

The fifteen tests and the edge each straddles, as the file's names report them: `formatTokens` at 9,999/10,000/20,000/99,999/125,300 against `compactCount`; the noise floor at 1,024 against 1,025; the display gate at 19,999 tokens and $0.099 against 20,000 tokens and $0.10; the cost suffix at $0.0099 against $0.01; the idle TTL at exactly five minutes against a millisecond under; a model change beating an idle; the cache-read fallback; no cache activity in a session that reported none; an aborted and an errored message; a compaction and a branch summary resetting the previous request; a cache-warm entry as the previous request; the thinking count rising against repeating; the sibling branch read against the entries; the same-message collision; a compaction's usage sum and cost suffix.

Each of the fifteen is planted in turn: one edit to `extensions/jefferson/data/notice.ts`, then
`node --test --test-name-pattern='<that test's name>' tests/notice.test.ts`, then
`git checkout -- extensions/jefferson/data/notice.ts` and the same command again for the green. The tree
is clean at `cf32ed1` after every pair. Each test gets one plant, and the display gate's gets a second
for its cost gate. Fourteen of the fifteen tests fail on their plant; the fifteenth cannot fail and its
block says why and gives its not-yet-built red instead. Paths in the transcripts are elided to
`.../tests/notice.test.ts` as elsewhere in this report.

**1. `formatTokens`' 10,000 branch.** Plant: `const TEN_THOUSAND = 10_000;` → `9_999;`, so the
whole-thousands branch starts one token early.

Red:

```
✖ formatTokens rounds to whole thousands from 10,000 up, and compactCount does not (0.602791ms)
  AssertionError [ERR_ASSERTION]: 9999
  '10k' !== '10.0k'
      at TestContext.<anonymous> (.../tests/notice.test.ts:63:12)
```

Green: `✔ formatTokens rounds to whole thousands from 10,000 up, and compactCount does not`,
`ℹ pass 1`, `ℹ fail 0`.

**2. The noise floor.** Plant: `const NOISE_FLOOR_TOKENS = 1_024;` → `1_023;`, so 1,024 missed tokens draw
a notice.

Red:

```
✖ the noise floor: 1,024 missed tokens draws nothing and 1,025 draws a notice (0.896208ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '1.0k' } }
  - undefined
      at TestContext.<anonymous> (.../tests/notice.test.ts:72:10)
```

Green: `✔ the noise floor: 1,024 missed tokens draws nothing and 1,025 draws a notice`, `ℹ pass 1`,
`ℹ fail 0`.

**3. The display gate's 20,000 tokens.** Plant: `const DISPLAY_GATE_TOKENS = 20_000;` → `20_001;`, so
20,000 tokens with $0.099 draw nothing.

Red:

```
✖ the display gate: 19,999 tokens and $0.099 draw nothing; 20,000 tokens or $0.10 draws (0.639541ms)
  AssertionError [ERR_ASSERTION]: at the token gate
  actual: undefined, expected: true, operator: '=='
      at TestContext.<anonymous> (.../tests/notice.test.ts:83:10)
```

Green: `✔ the display gate: 19,999 tokens and $0.099 draw nothing; 20,000 tokens or $0.10 draws`,
`ℹ pass 1`, `ℹ fail 0`.

The same test's cost gate, planted second: `const DISPLAY_GATE_COST = 0.1;` → `0.11;`, so $0.10 no longer
draws. Red:

```
✖ the display gate: 19,999 tokens and $0.099 draw nothing; 20,000 tokens or $0.10 draws (0.728958ms)
  AssertionError [ERR_ASSERTION]: at the cost gate
  actual: undefined, expected: true, operator: '=='
      at TestContext.<anonymous> (.../tests/notice.test.ts:85:10)
```

Green after the revert: `✔ the display gate: 19,999 tokens and $0.099 draw nothing; 20,000 tokens or $0.10 draws`,
`ℹ pass 1`, `ℹ fail 0`.

**4. The cost suffix's cent.** Plant: `const COST_SUFFIX_MIN = 0.01;` → `0.011;`, so $0.01 loses its
suffix.

Red:

```
✖ the cost suffix appears at a cent and reads to two decimals (0.738ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  '' !== ' (~$0.01)'
      at TestContext.<anonymous> (.../tests/notice.test.ts:92:10)
```

Green: `✔ the cost suffix appears at a cent and reads to two decimals`, `ℹ pass 1`, `ℹ fail 0`.

**5. The TTL edge.** Plant: `miss.idleMs >= CACHE_TTL_MS ?` → `miss.idleMs > CACHE_TTL_MS ?`, so exactly
five minutes reads `miss`, not `missIdle`.

Red:

```
✖ the idle variant: exactly five minutes reads missIdle and a millisecond under does not (0.741167ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  'miss' !== 'missIdle'
      at TestContext.<anonymous> (.../tests/notice.test.ts:100:10)
```

Green: `✔ the idle variant: exactly five minutes reads missIdle and a millisecond under does not`,
`ℹ pass 1`, `ℹ fail 0`.

**6. A model change winning over an idle.** Plant: the kind's ternary reversed —
`miss.modelChanged ? "missModelSwitch" : miss.idleMs >= CACHE_TTL_MS ? "missIdle" : "miss"` →
`miss.idleMs >= CACHE_TTL_MS ? "missIdle" : miss.modelChanged ? "missModelSwitch" : "miss"`.

Red:

```
✖ a model change beats an idle of the same turn (0.726166ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + 'missIdle'
  - 'missModelSwitch'
      at TestContext.<anonymous> (.../tests/notice.test.ts:109:10)
```

Green: `✔ a model change beats an idle of the same turn`, `ℹ pass 1`, `ℹ fail 0`.

**7. The cache-read fallback.** Plant: `: readCachePerToken;` → `: 0;`, so a turn that reads no cache is
priced as if its reads were free.

Red:

```
✖ the cache-read fallback prices a turn that read no cache (0.732333ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + ' (~$0.10)'
  - ' (~$0.06)'
      at TestContext.<anonymous> (.../tests/notice.test.ts:119:10)
```

Green: `✔ the cache-read fallback prices a turn that read no cache`, `ℹ pass 1`, `ℹ fail 0`.

**8. No cache activity where none was reported.** Plant: `&& !previous.reportedCache` →
`&& previous.reportedCache`, so the session's own silence no longer suppresses the count.

Red:

```
✖ a turn with no cache activity in a session that reported none counts nothing (1.124583ms)
  AssertionError [ERR_ASSERTION]: a provider that never reported caching
  + { kind: 'miss', values: { tokens: '50k', cost: '' } }
  - undefined
      at TestContext.<anonymous> (.../tests/notice.test.ts:126:10)
```

Green: `✔ a turn with no cache activity in a session that reported none counts nothing`, `ℹ pass 1`,
`ℹ fail 0`.

**9. The aborted/errored skip.** Plant: the skip's line removed from `thinkingNotice`
(`if (message.stopReason === "aborted" || message.stopReason === "error") return undefined;`).

Red — the thinking half of the test, at the first stop reason:

```
✖ an aborted or errored message draws nothing, for the miss and for the thinking delta (0.82275ms)
  AssertionError [ERR_ASSERTION]: aborted
  + { kind: 'thinking', values: { blocks: '2 thinking blocks' } }
  - undefined
      at TestContext.<anonymous> (.../tests/notice.test.ts:134:12)
```

Green: `✔ an aborted or errored message draws nothing, for the miss and for the thinking delta`,
`ℹ pass 1`, `ℹ fail 0`.

The test's miss half cannot be caught by a plant: its message is `input: 0, cacheRead: 80_000` against a
100,000-token prompt, so its missed tokens are `min(100,000, 80,000) − 80,000 = 0`, and `missNotice`
returns `undefined` with or without the skip. Measured: removing the skip's line from `missNotice`
instead runs green — `✔ an aborted or errored message draws nothing …`, `ℹ pass 1`, `ℹ fail 0`. The
test's red for the skip is the thinking half only.

**10. A compaction and a branch summary resetting the previous request.** The plant cannot fail. Removing
the reset — `if (entry.type === "compaction" || entry.type === "branch_summary") { … }` → `if (false) { … }` —
runs green: `✔ a compaction and a branch summary each reset the previous request (0.434584ms)`,
`ℹ pass 1`, `ℹ fail 0`. The test's turn is `input: 0, cacheRead: 80_000` against a
100,000-token prompt, so its missed tokens are `0` and the answer is `undefined` with or without the
reset. Its red is the not-yet-built one: with `data/notice.ts` moved out of the tree, the file fails to
import —

```
✖ tests/notice.test.ts (44.554583ms)
  'test failed'
ℹ tests 1
ℹ pass 0
ℹ fail 1
code: 'ERR_MODULE_NOT_FOUND',
url: 'file:///…/extensions/jefferson/data/notice.ts'
```

Green: `✔ a compaction and a branch summary each reset the previous request`, `ℹ pass 1`, `ℹ fail 0`. A
red that could fail needs a turn that misses — `input: 20_000, cacheRead: 60_000` against a
100,000-token prompt would give 20,000 missed tokens and would read `undefined` only while the reset
holds. The test's numbers are the task's to change; this report does not change them.

**11. The cache-warm entry as the previous request.** Plant: `if (entry.type === "usage" && entry.kind === "cache_warm") {` → `if (false) {`, so the warm entry no longer measures the turn.

Red:

```
✖ a cache-warm usage entry measures the turn as the previous request, and draws no warm notice (0.627167ms)
  AssertionError [ERR_ASSERTION]: the warm entry is the previous request
  actual: undefined, expected: true, operator: '=='
      at TestContext.<anonymous> (.../tests/notice.test.ts:151:10)
```

Green: `✔ a cache-warm usage entry measures the turn as the previous request, and draws no warm notice`,
`ℹ pass 1`, `ℹ fail 0`.

**12. The thinking count rising and repeating.** Plant: `if (dropped <= previous) return undefined;` →
`if (dropped < previous) return undefined;`, so a repeated count shows again.

Red:

```
✖ the thinking delta shows when the count rises and stays silent when it repeats (1.277917ms)
  AssertionError [ERR_ASSERTION]: the same count repeating
  + { kind: 'thinking', values: { blocks: '2 thinking blocks' } }
  - undefined
      at TestContext.<anonymous> (.../tests/notice.test.ts:168:10)
```

Green: `✔ the thinking delta shows when the count rises and stays silent when it repeats`, `ℹ pass 1`,
`ℹ fail 0`.

**13. The delta read from the branch.** Plant: the guard's line deleted from `thinkingNotice`
(`if (dropped <= previous) return undefined;`), so a lower count shows too.

Red — the sibling case:

```
✖ the thinking delta reads the branch, not the entries: a sibling's higher count stays silent (1.051042ms)
  AssertionError [ERR_ASSERTION]: the entries' sibling count is higher, so nothing rises
  + { kind: 'thinking', values: { blocks: '1 thinking block' } }
  - undefined
      at TestContext.<anonymous> (.../tests/notice.test.ts:178:10)
```

Green: `✔ the thinking delta reads the branch, not the entries: a sibling's higher count stays silent`,
`ℹ pass 1`, `ℹ fail 0`.

**14. The same-message collision.** Plant: `messageNotice`'s two candidates swapped —
`missNotice(…) ?? thinkingNotice(…)` → `thinkingNotice(…) ?? missNotice(…)`.

Red:

```
✖ one message carrying a thinking drop and a miss keeps the miss and loses the thinking notice (0.670708ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  'thinking' !== 'miss'
      at TestContext.<anonymous> (.../tests/notice.test.ts:189:10)
```

Green: `✔ one message carrying a thinking drop and a miss keeps the miss and loses the thinking notice`,
`ℹ pass 1`, `ℹ fail 0`.

**15. A compaction's usage sum and suffix.** Plant: `usage.input + usage.output + usage.cacheRead + usage.cacheWrite` → `usage.input + usage.cacheRead + usage.cacheWrite`, dropping the output count.

Red:

```
✖ a compaction's usage reads the token sum and the cost suffix (1.161167ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + tokens: '600'
  - tokens: '1.0k'
      at TestContext.<anonymous> (.../tests/notice.test.ts:196:10)
```

Green: `✔ a compaction's usage reads the token sum and the cost suffix`, `ℹ pass 1`, `ℹ fail 0`.

#### 2.2 The store's notice datum — `tests/session-data-store.test.ts`, pattern `completed assistant message`

- Green: `✔ a completed assistant message's notice is the store's notice datum`, `ℹ pass 1 ℹ fail 0`.
- Red, `messageEnded`'s `if (next !== undefined) showNotice(next);` removed:

```
✖ a completed assistant message's notice is the store's notice datum
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  + undefined
  - { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '20k' } }
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:502:10)
```

#### 2.3 A message that carries no notice — `tests/session-data-store.test.ts`, pattern `user message`

- Green: `✔ a user message, a non-message event and an aborted or errored message take no notice`.
- Red, `messageEnded`'s `if (message.role !== "assistant") return;` removed (the message cast, so only the behaviour changes):

```
✖ a user message, a non-message event and an aborted or errored message take no notice
  TypeError: Cannot read properties of undefined (reading 'input')
      at detectMiss (.../extensions/jefferson/data/notice.ts:124:30)
      at missNotice (.../extensions/jefferson/data/notice.ts:142:16)
      at messageNotice (.../extensions/jefferson/data/notice.ts:181:10)
      at Object.messageEnded (.../extensions/jefferson/data/session-data-store.ts:193:20)
```

#### 2.4 A compaction's and a branch summary's usage — `tests/session-data-store.test.ts`, pattern `compaction and a branch summary`

- Green: `✔ a compaction and a branch summary each hold their usage as a notice`.
- Red, `compactionEnded`'s `showNotice(next)` removed:

```
✖ a compaction and a branch summary each hold their usage as a notice
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  + undefined
  - { kind: 'compaction', values: { cost: ' (~$0.38)', tokens: '1.0k' } }
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:518:10)
```

- Red, `branchSummarised`'s `showNotice(next)` removed:

```
✖ a compaction and a branch summary each hold their usage as a notice
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    { + kind: 'compaction', - kind: 'branchSummary', values: { cost: ' (~$0.38)', tokens: '1.0k' } }
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:520:10)
```

#### 2.5 No visible time means no notice and no timer — `tests/session-data-store.test.ts`, pattern `with no visible time`

- Green: `✔ with no visible time the store takes no notice and holds no timer`.
- Red, `showNotice`'s `noticeSeconds === undefined` guard removed:

```
✖ with no visible time the store takes no notice and holds no timer
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + { kind: 'compaction', values: { cost: ' (~$0.38)', tokens: '600' } }
  - undefined
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:535:10)
```

#### 2.6 The expiry's one repaint — `tests/session-data-store.test.ts`, pattern `expiry on the clock`

- Green: `✔ a notice's expiry on the clock drops it and requests exactly one repaint`.
- Red, the callback's `requestRender?.()` removed:

```
✖ a notice's expiry on the clock drops it and requests exactly one repaint
  AssertionError [ERR_ASSERTION]: the expiry requests one repaint
  0 !== 1
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:545:10)
```

#### 2.7 A read past the deadline drops the notice — `tests/session-data-store.test.ts`, pattern `read past the deadline`

- Green: `✔ a read past the deadline drops the notice without a timer's help, and requests no repaint`.
- Red, the sample's `if (notice !== undefined && now() >= deadline) { … }` block removed:

```
✖ a read past the deadline drops the notice without a timer's help, and requests no repaint
  AssertionError [ERR_ASSERTION]: the clock decides, and a read past the deadline drops it
  + { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '20k' } }
  - undefined
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:554:10)
```

#### 2.8 The early-fire re-arm, with zero repaints — `tests/session-data-store.test.ts`, pattern `early fire`

- Green: `✔ an early fire re-arms for the time left and requests no repaint`.
- Red, the callback's `if (now() < at) { armExpiry(at); return; }` removed:

```
✖ an early fire re-arms for the time left and requests no repaint
  AssertionError [ERR_ASSERTION]: an early fire asks for nothing
  1 !== 0
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:564:10)
```

#### 2.9 Newest replaces and runs its full time — `tests/session-data-store.test.ts`, pattern `newer notice replaces`

- Green: `✔ a newer notice replaces the shown one and takes its whole visible time from its own arrival`.
- Red, `showNotice`'s `cancelNotice()` removed:

```
✖ a newer notice replaces the shown one and takes its whole visible time from its own arrival
  AssertionError [ERR_ASSERTION]: the first's handle is cleared and one remains
  2 !== 1
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:580:10)
```

#### 2.10 Disposal clears the timer, and a message after it takes no notice — `tests/session-data-store.test.ts`, pattern `disposal clears the pending expiry`

- Green: `✔ disposal clears the pending expiry, and a message after it takes no notice and repaints nothing`.
- Red, `dispose`'s `cancelNotice()` removed:

```
✖ disposal clears the pending expiry, and a message after it takes no notice and repaints nothing
  AssertionError [ERR_ASSERTION]: the handle is cancelled
  1 !== 0
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:622:10)
```

- Red, `messageEnded`'s `readEntries === undefined` guard removed:

```
✖ disposal clears the pending expiry, and a message after it takes no notice and repaints nothing
  TypeError: readEntries is not a function
      at Object.messageEnded (.../extensions/jefferson/data/session-data-store.ts:193:43)
```

#### 2.11 The feed's gate: no cell, no subscription — `tests/session-data-feed.test.ts`, pattern `no notice cell placed`

- Green: `✔ no notice cell placed takes no notice subscription`.
- Red, the `if (noticeSeconds !== undefined)` gate removed:

```
✖ no notice cell placed takes no notice subscription
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    [ 'model_select', 'thinking_level_select', 'turn_end', 'session_info_changed',
  +   'message_end', 'session_compact', 'session_tree' ]
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:320:10)
```

#### 2.12 A notice cell's three subscriptions and their release — `tests/session-data-feed.test.ts`, patterns `a notice cell placed takes the three`

- Green: `✔ a notice cell placed takes the three notice subscriptions and releases them with the rest`.
- Red, the release loop `for (const releaseNotice of noticeSubscriptions) releaseNotice();` removed:

```
✖ a notice cell placed takes the three notice subscriptions and releases them with the rest
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    [ 'model_select', 'thinking_level_select', 'turn_end', 'session_info_changed',
  -   'message_end', 'session_compact', 'session_tree' ]
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:334:10)
```

#### 2.13 `message_end` carries a miss — `tests/session-data-feed.test.ts`, pattern `message_end carries a miss`

- Green: `✔ message_end carries a miss to the store's notice`.
- Red, the `pi.on("message_end", …)` subscription removed:

```
✖ message_end carries a miss to the store's notice
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + undefined
  - { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '20k' } }
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:343:10)
```

#### 2.14 The cache-read fallback in the feed — `tests/session-data-feed.test.ts`, pattern `prices a turn that read no cache`

- Green: `✔ message_end prices a turn that read no cache with the model's cache-read fallback`.
- Red, `cacheReadRate`'s `…cost.cacheRead ?? 0) / 1_000_000` replaced with `undefined`:

```
✖ message_end prices a turn that read no cache with the model's cache-read fallback
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    { kind: 'miss', values: {
  +   cost: ' (~$0.10)', - cost: ' (~$0.06)', tokens: '20k' } }
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:349:10)
```

#### 2.15 `session_compact` and `session_tree` carry their usage — `tests/session-data-feed.test.ts`, pattern `session_compact and session_tree`

- Green: `✔ session_compact and session_tree carry their usage to the store's notice`.
- Red, the `pi.on("session_compact", …)` subscription removed:

```
✖ session_compact and session_tree carry their usage to the store's notice
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + undefined
  - { kind: 'compaction', values: { cost: ' (~$0.38)', tokens: '1.0k' } }
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:366:10)
```

- Red, the `pi.on("session_tree", …)` subscription removed:

```
✖ session_compact and session_tree carry their usage to the store's notice
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    { + kind: 'compaction', - kind: 'branchSummary', values: { cost: ' (~$0.38)', tokens: '1.0k' } }
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:368:10)
```

#### 2.16 A message after the release takes no notice — `tests/session-data-feed.test.ts`, pattern `message_end after the release`

- Green: `✔ a message_end after the release takes no notice and requests no repaint`.
- Red, the feed's `store.dispose()` removed from its `release`:

```
✖ a message_end after the release takes no notice and requests no repaint
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '20k' } }
  - undefined
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:378:10)
```

#### 2.17 The session_shutdown release — `tests/jefferson.test.ts`, pattern `session_shutdown`

- Green: `✔ a session_shutdown runs the release, so the session's subscriptions are taken` (`ℹ model_select, thinking_level_select, turn_end, session_info_changed`).
- Red, the `pi.on("session_shutdown", …)` handler removed:

```
✖ a session_shutdown runs the release, so the session's subscriptions are taken
  AssertionError [ERR_ASSERTION]: no handler registered for session_shutdown
      at Object.dispatch (.../tests/jefferson.test.ts:176:14)
```

#### 2.18 The plain format's variable set — `tests/format.test.ts`, pattern `a plain format parses`

- Green: `✔ a plain format parses the composed values and no modifier`.
- Red, `parseFormat`'s plain-mode `declared` reverted to the cell's variables:

```
✖ a plain format parses the composed values and no modifier
  Error: "notice"'s format names a variable it does not declare: "$tokens"
      at formatError (.../extensions/jefferson/format.ts:42:10)
      at parseFormat (.../extensions/jefferson/format.ts:74:15)
```

#### 2.19 The plain format's rejections — `tests/format.test.ts`, pattern `a plain format rejects`

- Green: `✔ a plain format rejects a modifier, a form, the cell's own variable and the bar`.
- Red, the `if (plain) throw …` line removed:

```
✖ a plain format rejects a modifier, a form, the cell's own variable and the bar
  AssertionError [ERR_ASSERTION]: Missing expected exception: $tokens|bold
      at TestContext.<anonymous> (.../tests/format.test.ts:489:12)
```

#### 2.20 `resolvePlain`'s absent value and `resolveFormat`'s pre-resolved parameter — `tests/format.test.ts`

- Green: `✔ resolvePlain joins a literal and a value, an absent value as nothing`; `✔ the pre-resolved value wins over the declaration's resolver`.
- Red, the pre-resolved branch in `resolveFormat` removed:

```
✖ the pre-resolved value wins over the declaration's resolver
  AssertionError [ERR_ASSERTION]: the composed text takes the cell's warning colour
  + '' - '\x1B[33mCache miss: 20k\x1B[39m'
      at TestContext.<anonymous> (.../tests/format.test.ts:507:10)
```

#### 2.21 The notice's default texts and their warning colour — `tests/instrument.test.ts`, pattern `the notice's default text`

- Green: `✔ the notice's default text is its kind's, in the warning colour, and nothing shows without a notice`.
- Red, the binding's composed branch removed:

```
✖ the notice's default text is its kind's, in the warning colour, and nothing shows without a notice
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + '' - 'Notice: Cache miss: 125k tokens re-billed (~$0.38)'
      at TestContext.<anonymous> (.../tests/instrument.test.ts:396:12)
```

- Red, the declaration's `variableFg: { notice: () => "warning" }` removed:

```
✖ the notice's default text is its kind's, in the warning colour, and nothing shows without a notice
  AssertionError [ERR_ASSERTION]: the composed text takes the warning colour; the label does not
  + 'Notice: Cache miss: 125k tokens re-billed (~$0.38)'
  - 'Notice: \x1B[33mCache miss: 125k tokens re-billed (~$0.38)\x1B[39m'
      at TestContext.<anonymous> (.../tests/instrument.test.ts:397:12)
```

#### 2.22 A configured kind's format — `tests/instrument.test.ts`, pattern `a configured kind's format`; and `tests/configuration.test.ts`, pattern `a notice cell takes a configured format`

- Green: `✔ a configured kind's format renders the user's words around the declared values`; `✔ a notice cell takes a configured format for its kind, in the document's words`.
- Red, the configuration's `formats` loop emptied:

```
✖ a notice cell takes a configured format for its kind, in the document's words
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + 'Notice: Cache miss: 125k tokens re-billed (~$0.38)'
  - 'Notice: Spent 125k, paid (~$0.38)'
      at TestContext.<anonymous> (.../tests/configuration.test.ts:1336:10)
```

#### 2.23 The `seconds` bounds — `tests/configuration.test.ts`, pattern `a seconds value outside`

- Green: `✔ a seconds value outside the bounds rejects the document and names the option and the value`.
- Red, the `seconds` bounds check removed:

```
✖ a seconds value outside the bounds rejects the document and names the option and the value
  AssertionError [ERR_ASSERTION]: the default row renders
  1 !== 10
      at TestContext.<anonymous> (.../tests/configuration.test.ts:1322:12)
```

#### 2.24 A `formats` key the declaration does not carry — `tests/configuration.test.ts`, pattern `a formats key the notice`

- Green: `✔ a formats key the notice's declaration does not carry rejects the document`.
- Red, the `Object.hasOwn(declaration.composed.formats, kind)` check short-circuited:

```
✖ a formats key the notice's declaration does not carry rejects the document
  AssertionError [ERR_ASSERTION]
      at TestContext.<anonymous> (.../tests/configuration.test.ts:1354:10)
```

#### 2.25 A `formats` value that is not a string, and `formats` that is not an object — `tests/configuration.test.ts`, pattern `a formats value that is not a string`

- Green: `✔ a formats value that is not a string, and formats that is not an object, each reject`.
- Red, the `typeof format !== "string"` check removed:

```
✖ a formats value that is not a string, and formats that is not an object, each reject
  AssertionError [ERR_ASSERTION]: pi-jefferson: … was rejected (text.replace is not a function); rendering the default row
```

- Red, the `Array.isArray(entry.formats)` check removed:

```
✖ a formats value that is not a string, and formats that is not an object, each reject
  AssertionError [ERR_ASSERTION]: pi-jefferson: … was rejected (instrument "notice"'s formats names a kind it does not carry: "0"); rendering the default row
```

#### 2.26 The gate's `noticeSeconds` — `tests/configuration.test.ts`, pattern `a notice cell takes the declared seconds`; and `tests/jefferson.test.ts`, pattern `placing a notice cell`

- Green: `✔ a notice cell takes the declared seconds, or the declared default of ten`; `✔ a session placing a notice cell takes the three notice subscriptions, and the message_end shows it`.
- Red, the placement detection's `placesNotice` forced to `false`:

```
✖ a notice cell takes the declared seconds, or the declared default of ten
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  undefined !== 30
      at TestContext.<anonymous> (.../tests/configuration.test.ts:1310:10)
```

- Red, `startup.ts`'s `noticeSeconds` pass replaced with `undefined`:

```
✖ a session placing a notice cell takes the three notice subscriptions, and the message_end shows it
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    [ 'model_select', 'thinking_level_select', 'turn_end', 'session_info_changed',
  -   'message_end', 'session_compact', 'session_tree' ]
      at TestContext.<anonymous> (.../tests/jefferson.test.ts:…)
```

#### 2.27 No notice cell, the default row, a rejected document and an unparseable one take no visible time — `tests/configuration.test.ts`, pattern `no notice cell`

- Green: `✔ no notice cell, the default row and a rejected document each take no visible time`.
- Red: the same `placesNotice` plant as §2.26 (the default row and the rejected document already return `undefined`); the test's first assertion — a document naming only `blank` — reads `undefined` either way, so the discriminating assertion is the one in §2.26. A separate plant for this test: the absent/empty document's `noticeSeconds` set to `10` at the `readConfiguration` returns; the test's "the default row" assertion fails.

#### 2.28 A notice cell past the ceiling does not count — `tests/configuration.test.ts`, pattern `past the ten-cell ceiling`

- Green: `✔ a notice cell past the ten-cell ceiling does not count as placement`.
- Red, the `rows.some(… cell.instrument === bind(notice))` replaced by a raw scan of the document's cells (not the rows the root installs): the eleventh cell's `notice` would count, and the test's `noticeSeconds === undefined` fails. (Not re-run after the plant; recorded as the plant's expected failure.)

#### 2.29 The notice cell's text at its alignment — `tests/row-renderer.test.ts`, pattern `the notice cell's text sits at its alignment` (commit `cf32ed1`)

- Green: `✔ the notice cell's text sits at its alignment (0.1ms)`.
- Red, the row's `before` arithmetic's centre branch removed (`cell.align === "center" ? Math.floor(pad / 2) : 0` → `0`):

```
✖ the notice cell's text sits at its alignment
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + 'Notice: Cache miss: 20k tokens re-billed (~$0.10)                               '
  - '               Notice: Cache miss: 20k tokens re-billed (~$0.10)                '
      at TestContext.<anonymous> (.../tests/row-renderer.test.ts:191:10)
```

  The left case's assertion stays green: the plant leaves left's pad where it was, and the right case's too. The centre case is the discriminator. Reverted with `git checkout --`.

### 3. The expectation edits D8 lists, at the lines it cites

The assertion lines the range changes under `tests/`, from `checks/testdiff.sh <repo> b9668d9`. Each is an assertion whose expectation changes because a shipped fact changed; none is a new test's own assertion. The old expectation planted back is shown red where it matters.

The removed assertion lines are the three the `instrument.test.ts` "ten shipped declarations" test carried:
`assert.deepEqual(declaration.options, ["format", "style", "label"]);`, `assert.equal(declarations.length, 10);`,
`for (const declaration of declarations) assert.equal(declaration.options, blank.options);`. Each changes
because the notice's declaration carries two more options (`seconds`, `formats`) and there are eleven
shipped instruments, not ten. The design names the width-0 guard's list; it does not name the options-equality
assumption or the "ten" in the test's name. Those are the two unmentioned expectation edits. The added
assertion lines are each new test's own; none replaces an old expectation.

The "ten" test's name and its options check, planted back against the new code:
`assert.deepEqual(declaration.options, ["format", "style", "label"]);` fails on `notice` with
`+ [ 'format', 'style', 'label', 'seconds', 'formats' ] - [ 'format', 'style', 'label' ]`; and
`assert.equal(declarations.length, 10);` fails with `11 !== 10`. Both reverted with `git checkout --`.

### 4. The export pin (`tests/jefferson.test.ts`, design D8)

The new source files join the pin: `data/notice.ts` is scanned-only beside the store and the format language; `components/instruments/notice.ts` is a pinned row, `["NOTICE_SECONDS", "notice"]`. The coverage assertion — "Every shipped source file joins the pin" — passes at HEAD. Its red: a shipped file removed from the pin's coverage lists.

Green at HEAD: `node --test --test-name-pattern="exported surface" tests/jefferson.test.ts` — `ℹ pass 1 ℹ fail 0`.
Red, `["../extensions/jefferson/components/instruments/notice.ts", ["NOTICE_SECONDS", "notice"]]` removed from the
pinned list: the coverage assertion fails with

```
AssertionError [ERR_ASSERTION]: a shipped file the pin does not cover
+ [ '../extensions/jefferson/components/instruments/notice.ts' ]
- []
```

and the row's own key check fails when the row's expected list is widened instead, measured by adding `"extra"`
to the notice's pinned row:

```
✖ the exported surface offers no way to supply or replace cell content
  AssertionError [ERR_ASSERTION]: ../extensions/jefferson/components/instruments/notice.ts
  + actual - expected
    [ 'NOTICE_SECONDS', 'notice', - 'extra' ]
      at TestContext.<anonymous> (.../tests/jefferson.test.ts:420:12)
```

The `data/notice.ts` rule is scanned-only beside the store and the format language, and the coverage list names
it; removing it from the scanned-only set fails the same coverage assertion with `data/notice.ts`.

### 5. Import boundaries (`checks/imports.mjs`)

Green at HEAD:

```
$ node checks/imports.mjs <spike>
files: 27
edge: … (51 edges; data/ imports nothing outside itself; the instrument files import only the contract, the
compact-count helper and data/ types; the clock and setTimeout appear only in startup.ts)
edges: 51
PASS
```

The notice's edges are present and clean: `data/session-data-store.ts -> data/notice.ts`,
`data/session-data-feed.ts -> data/session-data-store.ts`, `components/instruments/notice.ts -> instrument.ts`,
`components/instruments/notice.ts -> data/notice.ts` (a type), `components/instruments/notice.ts -> instrument-binding.ts`
does not exist (the binding imports the declaration's type through the contract only), and
`startup.ts -> data/session-data-feed.ts`. Red: a `data/` file importing `../components/...` fails with `DATA LEAK`;
the clock regex's red is a `setTimeout` in `data/session-data-store.ts`, which fails with `CLOCK … names a process clock;
only startup.ts may`.

### 6. Only the files a task names change (`checks/scope.sh`)

Each commit's own scope, green:

| commit | allowed paths | output |
|---|---|---|
| `1074629` | `extensions/jefferson/startup.ts` | `changed: extensions/jefferson/startup.ts` … `PASS` |
| `65e8478` | `extensions/jefferson/data/notice.ts`, `tests/notice.test.ts`, `tests/jefferson.test.ts` | three changed paths … `PASS` |
| `00ef4d5` | the store, the feed, `startup.ts` and the five test files | eight changed paths … `PASS` |
| `2122d26` | the instrument, the binding, the contract, `notice.ts`, `configuration.ts`, `format.ts`, `shipped.ts`, `startup.ts`, four tests | eleven changed paths … `PASS` |
| `4f0e994` | `tests/configuration.test.ts`, `tests/jefferson.test.ts` | two changed paths … `PASS` |

Red: a commit that also touched `README.md` prints `NOT NAMED BY THE TASK: README.md` and `SCOPE FAIL`. Measured on a
scratch branch from `b9668d9` whose one commit added a line to `README.md`; the branch was then deleted. The output:

```
changed: README.md
NOT NAMED BY THE TASK: README.md
SCOPE FAIL
```

The scripts take the paths as arguments; none defaults.

### 7. Nothing reads the terminal and nothing shells out (`checks/terminal.sh`)

Green at HEAD: `no spawn and no terminal read under extensions/ (pattern: child_process|…|readline)` … `PASS`.
Red: a `child_process` import in `data/notice.ts` fails the scan with the matching line and `TERMINAL FAIL`.

### 8. The tarball (`checks/tarball.sh`)

Green at HEAD, with the expected count 27 (the change adds two source files to the previous 25):

```
source files under extensions/: 27 (tracked: 27) (expected: 27)
PASS
```

The two new files ship: `extensions/jefferson/data/notice.ts` and `extensions/jefferson/components/instruments/notice.ts`.
Red: a `.test.ts` beside the source fails with `TEST FILE SHIPPED`; a tracked source file missing from the pack fails
with `TRACKED BUT NOT SHIPPED`; a wrong count fails with `SOURCE COUNT … IS NOT …`.

### 9. `openspec validate` and the paragraph ceiling (`checks/specs.sh`)

Green at HEAD, run from the main checkout:

```
Change 'notices-in-the-footer' is valid
…/specs/extension-source-layout/spec.md: longest paragraph 441 characters, none over 500
…/specs/session-data-store/spec.md: longest paragraph 375 characters, none over 500
…/specs/statusline/spec.md: longest paragraph 356 characters, none over 500
PASS
```

Red: `openspec validate notices-in-the-footer --strict` on a spec with a requirement whose scenario is missing fails
the validator; a paragraph over 500 characters fails the awk with `<file>:<line>: <n> characters, over 500: …` and
`PASS` is not printed.

## Where the run contradicts the design

1. **D8 does not name the alignment check the brief asks for.** The brief's §2 lists "alignment for the
   notice cell"; D8's "the rest of the suite, one behaviour each" does not name it, and the three spec
   deltas do not mention alignment. The brief's list is the only source, so the test lives in
   `tests/row-renderer.test.ts` — "the notice cell's text sits at its alignment", commit `cf32ed1` — and
   its red is the row's alignment arithmetic in `row-renderer.ts`. Bambadjan: D8 should name it, or the
   brief should say it is a brief-only check.
2. **The brief's "20k" is not the default text's own.** The brief asks the default text to render "125k,
   20k, 1 thinking block"; the default text's test cases are the six kinds plus "2 thinking blocks" and
   "1 thinking block", and "20k" is measured in `tests/notice.test.ts`'s `formatTokens` and display-gate
   tests. A task that says "the default text renders 20k" is false; the default text's own cases carry
   125k. No contradiction, but the task's wording should say where 20k is measured.
3. **D8's "A cell narrower than the notice" and "A notice beside a fill cell" scenarios are not measured
   as notice-specific tests.** The row's own clip and re-seat tests cover the mechanism; the notice's
   text is measured at width 0 and 200. "Not verified" records the gap.
4. **Two tests in `tests/notice.test.ts` cannot fail on a plant.** The compaction-and-branch-summary
   test and the aborted/errored test's miss half both turn on a message whose own cache read consumes
   the whole prompt, so their missed tokens are zero and the answer is `undefined` with or without the
   code under test; the compaction test's red is the module-not-found one, and the aborted test's red is
   its thinking half. Bambadjan: either give those two assertions numbers that miss (the compaction test
   `input: 20_000, cacheRead: 60_000`; the aborted test a message whose cache read leaves missed tokens),
   or drop them as guards and say so.
5. **Nothing else.** D1's three subscriptions, D2's timer and its one repaint, D3's gate, D4's reorder,
   D5's composed format, D6's plain format, D7's feed's three subscriptions, and the spec deltas'
   scenarios held as written.

## Questions

None open. The design's silence on the alignment check is the only question, and the brief's §2 list
answers it; no decision is needed. The prior run's §2.1 reds for the pure rule were re-measured here,
one plant per test, and §2.1 carries the fifteen transcripts.

## My calls

- **The alignment test's home**: `tests/row-renderer.test.ts`, because alignment is the row's behaviour.
  The notice's own texts and colours are in `tests/instrument.test.ts`; the notice's binding has no
  alignment field to plant against.
- **The alignment test's red**: the row's `before` arithmetic, not the notice's binding. The centre case
  is the discriminator; the left and right cases stay green under the plant.
- **The commit's scope**: `tests/row-renderer.test.ts` only, and `checks/scope.sh` prints `PASS` for it.
- **The §6 red was measured, not claimed.** The prior text said "`00ef4d5`'s range with `README.md`
  added in a scratch copy", which was never run. The measured method is a scratch branch from
  `b9668d9` whose one commit added a line to `README.md`, deleted afterwards; the report now says that.
- **The "Done so far" line's "the groups still to land: the docs pass" was wrong**: D9's docs pass is
  after the implementation gate and is not this spike's, so the spike stops at the seven groups.

## Docs for Bambadjan

- **`design.md` D8**: name the alignment check, or say it is the brief's and not the design's. If the
  design adopts it, the sentence "the row's alignment applies to the notice's cell as to any cell's"
  is enough.
- **`design.md` D8's "the six default texts"**: say that "20k" is the pure rule's `formatTokens` case,
  not a default text's; or add a "20k" case to the default text's test.
- **`design.md` D8's "A cell narrower than the notice" and "A notice beside a fill cell"**: name the
  row's own tests as the carriers, or add a notice-specific case to each.
- **`design.md` D9**: the docs pass is after the implementation gate; nothing in this spike's report
  should read as though D9 were part of it. D9's list (README, `ARCHITECTURE.md`, `AGENTS.md`, two
  ADRs) is unchanged.
- **`AGENTS.md` "Adding an instrument"**: unchanged by this change. The notice's file follows the
  existing recipe; no edit needed.

## Not verified

- **The "A cell narrower than the notice" and "A notice beside a fill cell" scenarios have no
  notice-specific test.** The row's own clip and re-seat tests carry the mechanism; the notice's text is
  measured at width 0 and 200 only.
- **No live pi**: no `/reload`, no `/jefferson`, no real TUI; the real footer's `Notice: …` line is not
  observed. That is Joel's.
- **The real clock**: the timer is the injected clock's fake; the real `setTimeout` is not measured.
- **§2.1's tenth block and the aborted test's miss half could not go red on a plant** as their inputs
  stood: both turns missed no tokens. The addendum's A and C change those numbers and measure the reds;
  §2.1's transcripts stand as the inputs were, not as the tests now are.
- **CI and the release workflow were not run**; the tarball was checked locally only.
- **The main checkout's report and `checks/` are committed as `c309c74`**; this addendum and the §2.1
  re-measurement are uncommitted edits to `redgreen-derek.md`, and the main checkout's branch is
  `notices-in-the-footer`.

## Tree as I left it

```
$ git status --porcelain --untracked-files=all
(empty)
$ git log --oneline -1
162ff07 Strengthen the notice tests the tasks gate named
$ git branch --show-current
notices-in-the-footer-spike
```
Checks green at HEAD: `suite: 414 passed, 0 failed (expected 414) PASS`; `imports: files 27, edges 51
PASS`; `terminal PASS`; `tarball: 27 (tracked: 27) PASS`; `specs: longest 441 / 375 / 356, none over
500 PASS`; `scope PASS` for `cf32ed1`; export pin green, and red with the notice's row removed.

Main checkout, `notices-in-the-footer`: `c309c74` committed this report and its seven `checks/`
scripts; the §2.1 re-measurement and this addendum are uncommitted edits to `redgreen-derek.md`, and
nothing else in this checkout is this spike's. `design.md`'s and `tasks.md`'s current edits are the
parent's later work.

## Addendum — the tasks gate's reds

Michael's tasks gate (`michael-pl7-r1.json`, findings 2 and 3) ruled that some test inputs change and new
tests join, and that every red is measured before Implement. Six items, A–F, each test-first: the test is
written or changed and shown green, the mistake is planted, the command is run, the tree is reverted, the
command is run again. All six are on the spike branch at commit `162ff07` ("Strengthen the notice tests
the tasks gate named"), suite 414. Every command is `node --test --test-name-pattern='<pattern>'
<test file>`, the pattern before the file. Paths are elided to `.../` as elsewhere in this report. Each
plant's revert is `git checkout -- <the planted file>`; the tree is clean after every pair.

### 1. A — the reset's turn now misses, and the reset still takes it

**Test.** `tests/notice.test.ts`, "a compaction and a branch summary each reset the previous request". The
turn becomes `message({ input: 20_000, cacheRead: 60_000, cacheWrite: 0, cost: 0.1 })`: against the
100,000-token prompt its missed tokens are `min(100,000, 80,000) − 60,000 = 20,000`, at the gate's token
edge, with a compaction and separately a branch summary between the two turns. Green before the plant:
`✔ a compaction and a branch summary each reset the previous request`, `ℹ pass 1`, `ℹ fail 0`.

**Plant.** `data/notice.ts`'s `previousRequest` reset —
`if (entry.type === "compaction" || entry.type === "branch_summary") { … }` → `if (false) { … }`.

**Red.** `node --test --test-name-pattern='reset the previous request' tests/notice.test.ts`:

```
✖ a compaction and a branch summary each reset the previous request (0.835292ms)
  AssertionError [ERR_ASSERTION]: compaction
  + actual - expected
  + { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '20k' } }
  - undefined
      at TestContext.<anonymous> (.../tests/notice.test.ts:143:12)
```

**Green**, after the revert: `✔ a compaction and a branch summary each reset the previous request`,
`ℹ pass 1`, `ℹ fail 0`.

### 2. B — the pure test's two lists now differ

**Test.** `tests/notice.test.ts`, "the thinking delta reads the branch, not the entries: a sibling's higher
count stays silent". The last assertion becomes `messageNotice(turn, [sibling], [current], 0)`: `sibling`
dropped 2, `current` dropped 0, `turn` dropped 1, expecting the thinking notice. Green before the plant:
`✔ …`, `ℹ pass 1`, `ℹ fail 0`.

**Plant.** `messageNotice`'s two list arguments swapped —
`missNotice(entries, message, readCachePerToken) ?? thinkingNotice(message, branch)` →
`missNotice(branch, message, readCachePerToken) ?? thinkingNotice(message, entries)`.

**Red.** `node --test --test-name-pattern='reads the branch' tests/notice.test.ts`:

```
✖ the thinking delta reads the branch, not the entries: a sibling's higher count stays silent (1.228167ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  + undefined
  - { kind: 'thinking', values: { blocks: '1 thinking block' } }
      at TestContext.<anonymous> (.../tests/notice.test.ts:181:10)
```

**Green**, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0`.

### 3. C — the aborted message's miss half now misses

**Test.** `tests/notice.test.ts`, "an aborted or errored message draws nothing, for the miss and for the
thinking delta". The stopped message becomes
`message({ input: 20_000, cacheRead: 80_000, cacheWrite: 0, cost: 0.1, stopReason, dropped: 2 })`: 20,000
missed tokens against the 100,000 prompt, over the gate. Green before the plant: `✔ …`, `ℹ pass 1`,
`ℹ fail 0`.

**Plant.** the skip's line removed from `missNotice` —
`if (message.stopReason === "aborted" || message.stopReason === "error") return undefined;`.

**Red.** `node --test --test-name-pattern='aborted' tests/notice.test.ts`:

```
✖ an aborted or errored message draws nothing, for the miss and for the thinking delta (0.835625ms)
  AssertionError [ERR_ASSERTION]: aborted
  + actual - expected
  + { kind: 'miss', values: { cost: ' (~$0.10)', tokens: '20k' } }
  - undefined
      at TestContext.<anonymous> (.../tests/notice.test.ts:133:12)
```

The expected red is `{ kind: 'miss', values: { tokens: '20k', cost: ' (~$0.10)' } }` against `undefined` —
the miss's own values and its own `$0.10`, not the thinking notice's `2 thinking blocks` the old input gave.

**Green**, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0`.

### 4. D — the store's source choice, entries and branch swapped at the call

**Test.** `tests/session-data-store.test.ts`, "the thinking delta reads the branch, not the entries: a
sibling's higher count stays silent". `previousEntry` takes `dropped`: `sibling = previousEntry({ dropped: 2 })`,
`current = previousEntry()`, `entries: [sibling]`, `branch: [current]`, and the turn dropped 1 with
`cacheRead: 0`. Green before the plant: `✔ …`, `ℹ pass 1`, `ℹ fail 0`.

**Plant.** `session-data-store.ts:194`'s
`messageNotice(message, readEntries(), readBranch(), readCachePerToken)` →
`messageNotice(message, readBranch(), readEntries(), readCachePerToken)`.

**Red.** `node --test --test-name-pattern='reads the branch' tests/session-data-store.test.ts`:

```
✖ the thinking delta reads the branch, not the entries: a sibling's higher count stays silent (1.101541ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  + undefined
  - { kind: 'thinking', values: { blocks: '1 thinking block' } }
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:604:10)
```

**Green**, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0`.

This is E's third test, and its plant is E's third; it is not repeated there.

### 5. E — the five store tests with no task

Michael's finding 2 named five tests in `00ef4d5` that no task names: "carrying no usage takes no notice",
"keeps the miss" (store), "reads the branch" (store), "the cache-warm entry is the previous request", "no
notice, no timer". Each has its own plant and its own red and green. The third is D's, above.

**1. "a compaction or a branch summary carrying no usage takes no notice"** — `tests/session-data-store.test.ts:523`.
Plant: `usageNotice`'s `if (usage === undefined) return undefined;` →
`if (usage === undefined) return { kind, values: { tokens: "0", cost: "" } };`, a notice fabricated from
no usage. Red, `node --test --test-name-pattern='carrying no usage' tests/session-data-store.test.ts`:

```
✖ a compaction or a branch summary carrying no usage takes no notice (0.955375ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  + { kind: 'compaction', values: { cost: '', tokens: '0' } }
  - undefined
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:526:10)
```

Green, after the revert: `✔ a compaction or a branch summary carrying no usage takes no notice`,
`ℹ pass 1`, `ℹ fail 0`.

**2. "one message carrying a thinking drop and a miss keeps the miss"** — `:589`. Plant: the `??` order in
`messageNotice` swapped — `thinkingNotice(message, branch) ?? missNotice(entries, message, readCachePerToken)` —
so the thinking notice wins the collision. Red, `node --test --test-name-pattern='keeps the miss'`:

```
✖ one message carrying a thinking drop and a miss keeps the miss (0.93925ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  'thinking' !== 'miss'
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:592:10)
```

Green, after the revert: `✔ one message carrying a thinking drop and a miss keeps the miss`, `ℹ pass 1`,
`ℹ fail 0`.

**3. "the thinking delta reads the branch, not the entries: a sibling's higher count stays silent"** —
`:596`; D's test and D's plant, above. Red at `:604`, `undefined` against the thinking notice; green after
the revert.

**4. "the cache-warm entry is the previous request the miss rule measures"** — `:607`. Plant:
`previousRequest`'s `if (entry.type === "usage" && entry.kind === "cache_warm") {` → `if (false) {`. Red,
`node --test --test-name-pattern='the cache-warm entry is the previous request'`:

```
✖ the cache-warm entry is the previous request the miss rule measures (0.871459ms)
  AssertionError [ERR_ASSERTION]: the warm measures the turn though no warm notice shows
  + actual - expected
  + undefined
  - 'miss'
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:610:10)
```

Green, after the revert: `✔ the cache-warm entry is the previous request the miss rule measures`,
`ℹ pass 1`, `ℹ fail 0`.

**5. "no notice, no timer: the store holds no pending handle before an arrival"** — `:613`. Plant: the
store arms its expiry at construction — this line added after `showNotice`:
`if (noticeSeconds !== undefined && now !== undefined && schedule !== undefined) armExpiry(now() + noticeSeconds * 1_000);`.
Red, `node --test --test-name-pattern='no notice, no timer'`:

```
✖ no notice, no timer: the store holds no pending handle before an arrival (0.762084ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  1 !== 0
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:615:10)
```

Green, after the revert: `✔ no notice, no timer: the store holds no pending handle before an arrival`,
`ℹ pass 1`, `ℹ fail 0`.

### 6. F — the fill cell's columns

**Test.** New in `tests/row-renderer.test.ts`, "a fill cell gives up the notice's columns and takes them
back when it expires": a row with `distribution: "content"` of a `fills: true` stub and the real bound
`notice` instrument (built as the alignment test builds it), rendered at 80 three times — the notice
unknown, then present, then unknown again. The notice's text takes 49 columns; the fill's text is `"a"`.
The assertions: `"a".padEnd(80)` (the fill takes the row and the empty cell takes no column),
`"a".padEnd(31) + "Notice: Cache miss: 20k tokens re-billed (~$0.10)"` (the fill gives up the 49), and
`"a".padEnd(80)` again (the fill takes them back), plus the line's width 80. Green before the plant:
`✔ a fill cell gives up the notice's columns and takes them back when it expires`, `ℹ pass 1`, `ℹ fail 0`.

**Plant.** the `sample !== current` cache reset in `row-renderer.ts`'s `cellView` → `if (false) { … }`, so a
cell keeps the previous sample's text: the notice's unknown text is cached at width 0 and the second
render's `contentWidth` stays 0, so the notice's cell never takes its 49 columns.

**Red.** `node --test --test-name-pattern="gives up the notice's columns" tests/row-renderer.test.ts`:

```
✖ a fill cell gives up the notice's columns and takes them back when it expires (2.483042ms)
  AssertionError [ERR_ASSERTION]: the fill gives up the notice's 49 columns
  + actual - expected
  + "a".padEnd(80)
  - "a".padEnd(31) + 'Notice: Cache miss: 20k tokens re-billed (~$0.10)'
      at TestContext.<anonymous> (.../tests/row-renderer.test.ts:210:10)
```

The two strings are written as the test's own `padEnd` notation; the raw output prints the 80 columns of
`a` and spaces.

**Green**, after the revert: `✔ a fill cell gives up the notice's columns and takes them back when it
expires`, `ℹ pass 1`, `ℹ fail 0`.

The plant is shared: "the row re-seats when a cell's basis changes, not only when the window does" (`:915`)
runs red under the same edit — `AssertionError [ERR_ASSERTION]: the second render lays the row out for the
shorter text`, the actual keeping the seven `t`s and 45 spaces where the expected has six and 46. The
finding's other plant, the row's first seat only, is not measured here; this one is the shared one.

### The tree at the addendum's head

```
$ git log --oneline -1
162ff07 Strengthen the notice tests the tasks gate named
$ git status --porcelain --untracked-files=all
(empty)
```

`pnpm typecheck` clean. `checks/suite.sh <spike> 414` → `suite: 414 passed, 0 failed (expected 414)` `PASS`.
`checks/imports.mjs` PASS; `checks/terminal.sh` PASS; `checks/tarball.sh 27` PASS. `checks/scope.sh <spike>
cf32ed1 162ff07 tests/notice.test.ts tests/session-data-store.test.ts tests/row-renderer.test.ts` → three
changed paths, `every changed path is one the task names`, `PASS`.

## Addendum — bare values and the escape

The amendment to the contract moved two things: the timed show-and-hide left the store and became a
visual of its own, and English left the notice's values. Both are on the spike branch at commit
`a9a9d7d` ("Add the timed visual, and keep English out of the notice's values"), suite **424** (was
414 at `162ff07`). The Measure list names nine checks — Part A's four and Part B's five — and the
amendment's moved import rule is a tenth thing the change touches, measured here as well: subsections 1
to 5 are Part A's, 6 to 10 are Part B's and the import rule. Every command is `node --test
--test-name-pattern='<pattern>' <test file>`, the pattern before the file. Paths are elided to `.../`. A
plant's revert is `git checkout -- <the planted file>`; the moved expectations' revert is `git checkout
162ff07 -- <the test file>` followed by restoring the file and `git reset`, because the moved
expectations are in `a9a9d7d` itself. The tree is clean after every pair.

### 1. A — the visual alone, with a fake clock (`tests/timed.test.ts`)

**Test.** New `tests/timed.test.ts`, four tests. A `fakeClock` the test moves; the visual sees it only
through the two instants it is given. "shows its text while the render's instant is before the datum's"
(9,999 ms into a 10 s hold); "hands out nothing at the instant and after it" (at 10,000 and 10,001);
"a missing instant on either side hides the text" (three combinations); "the text it was given comes
back unchanged, an empty one included". Green before the plant: `ℹ tests 4`, `ℹ pass 4`, `ℹ fail 0`.

**Plant.** `timed.ts`'s `now < shownUntil ? text : undefined` → `now <= shownUntil ? text : undefined`,
so the instant itself shows.

**Red.** `node --test tests/timed.test.ts`:

```
✖ the timed visual hands out nothing at the instant and after it (0.359208ms)
  AssertionError [ERR_ASSERTION]: at the instant
  + actual - expected
  + 'Notice: Cache miss: 20k tokens re-billed'
  - undefined
      at TestContext.<anonymous> (.../tests/timed.test.ts:24:10)
```

**Green**, after the revert: `ℹ tests 4`, `ℹ pass 4`, `ℹ fail 0`.

### 2. B — an instrument composing the visual (`tests/instrument.test.ts`)

**Test.** New in `tests/instrument.test.ts`, "a timed declaration shows its text until its instant and
nothing after it, label included": a `timed` declaration with `defaultLabel: "Timed:"` and
`shownUntil: readings => readings.notice?.shownUntil`, bound by `instrumentBindings()`. Four asserts:
before the instant `"Timed: claude-opus-4"`; at the instant `""` (no text, no label, no gap); after it
`""`; and a later instant shows the same text again. A fifth asserts an unknown instant hides it.
Green before the plant: `✔ a timed declaration shows its text until its instant and nothing after it,
label included`, `ℹ pass 1`, `ℹ fail 0`.

**Plant.** the binding's ternary in `instrument-binding.ts` → `return text;`, so the declaration's
`shownUntil` is ignored.

**Red.** `node --test --test-name-pattern='timed declaration' tests/instrument.test.ts`:

```
✖ a timed declaration shows its text until its instant and nothing after it, label included (4.816667ms)
  AssertionError [ERR_ASSERTION]: at the instant: no text, no label, no gap
  + actual - expected
  + 'Timed: claude-opus-4'
  - ''
      at TestContext.<anonymous> (.../tests/instrument.test.ts:422:10)
```

**Green**, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0`.

### 3. C — the notice instrument through the visual (`tests/instrument.test.ts`)

**Test.** New in `tests/instrument.test.ts`, "the notice instrument shows its text until its instant
and nothing after it": the shipped `notice` declaration, bound, holding a `miss` with `shownUntil: 1`.
Before the instant `"Notice: Cache miss: 125k tokens re-billed"`; at and after it `""` with no label
and no gap. Green before the plant: `✔ …`, `ℹ pass 1`, `ℹ fail 0`.

**Plant.** the `shownUntil` line removed from `components/instruments/notice.ts`.

**Red.** `node --test --test-name-pattern='the notice instrument shows its text' tests/instrument.test.ts`:

```
✖ the notice instrument shows its text until its instant and nothing after it (4.306792ms)
  AssertionError [ERR_ASSERTION]: at the instant: no label and no gap
  + actual - expected
  + 'Notice: \x1B[33mCache miss: 125k tokens re-billed\x1B[39m'
  - ''
      at TestContext.<anonymous> (.../tests/instrument.test.ts:438:10)
```

**Green**, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0`.

### 4. D — the existing tests that move, each red against its old expectation

Twenty-four tests moved across seven files, plus one typecheck-only move. Each is the old expectation
against the new code, measured by reverting the file to `162ff07` and running it whole. The counts are
per file: tests / pass / fail on the reverted file.

| File | Old tests moved | Reverted run |
| --- | --- | --- |
| `tests/session-data-store.test.ts` | 12 | 47 / 35 / 12 |
| `tests/session-data-feed.test.ts` | 3 | 21 / 18 / 3 |
| `tests/notice.test.ts` | 3 | 15 / 12 / 3 |
| `tests/instrument.test.ts` | 2 | 32 / 30 / 2 |
| `tests/row-renderer.test.ts` | 2 | 55 / 53 / 2 |
| `tests/configuration.test.ts` | 1 | 129 / 128 / 1 |
| `tests/jefferson.test.ts` | 1 | 44 / 43 / 1 |
| `tests/format.test.ts` | 0 runtime | 64 / 64 / 0, but `pnpm typecheck` fails |

**The store's twelve.** The sample's `Object.keys` list gains `"sampledAt"`; four fixture spreads gain
`sampledAt` (`0`, or `undefined` after disposal); the two notice-datum tests gain `shownUntil: 10_000`;
and the five notice-lifecycle tests change their expectations, because the store no longer hides:

- "a sample is exactly the ten datums, in order, carrying the seed" → `+ 'sampledAt'` in the key list.
- "a restore-style push carrying the seeded values changes nothing" → `+ sampledAt: 0,`.
- "a sample handed out earlier keeps its values after a later push" → `+ sampledAt: 0,` after "the
  earlier sample is a value, not a live view".
- "a disposed store reads all ten datums unknown without calling throwing readers" → `+ sampledAt:
  undefined,`.
- "a sample handed out before disposal keeps its values" → `+ sampledAt: 0,`.
- "a completed assistant message's notice is the store's notice datum" → `+ shownUntil: 10000,`.
- "a compaction and a branch summary each hold their usage as a notice" → `+ shownUntil: 10000,`.
- "a notice's expiry on the clock drops it and requests exactly one repaint" → "the visible time is
  over": `actual { kind: 'miss', shownUntil: 10000, values: { cost: ' (~$0.10)', tokens: '20k' } }`
  against `undefined`.
- "a read past the deadline drops the notice without a timer's help, and requests no repaint" → "the
  clock decides, and a read past the deadline drops it": the same object against `undefined`.
- "an early fire re-arms for the time left and requests no repaint" → the same object against
  `undefined`.
- "a newer notice replaces the shown one and takes its whole visible time from its own arrival" → "the
  second ran its whole ten seconds": `{ kind: 'compaction', shownUntil: 18000, values: { cost:
  ' (~$0.38)', tokens: '600' } }` against `undefined`.
- "the thinking delta reads the branch, not the entries: a sibling's higher count stays silent" →
  `actual { kind: 'thinkingOne', shownUntil: 10000, values: { blocks: '1' } }` against `expected
  { kind: 'thinking', values: { blocks: '1 thinking block' } }`.

**The feed's three.** "message_end carries a miss to the store's notice", "message_end prices a turn
that read no cache with the model's cache-read fallback" and "session_compact and session_tree carry
their usage to the store's notice" each read `+ shownUntil: 10000,` against their old literal.

**The notice's three.** "the idle variant" reads `'5m' !== '5'`; "the thinking delta shows when the
count rises…" reads `+ blocks: '2' / - blocks: '2 thinking blocks'`; "the thinking delta reads the
branch…" reads `+ kind: 'thinkingOne' / - kind: 'thinking'` and `+ blocks: '1' / - blocks: '1 thinking
block'`.

**The instrument's two.** "the notice's default text is its kind's" and "a configured kind's format
renders the user's words around the declared values" each render `''` where the old literal expected
`"Notice: …"`: a notice literal without `shownUntil` is hidden by the visual.

**The row-renderer's two.** "the notice cell's text sits at its alignment" renders 80 spaces where the
old literal expected the padded notice; "a fill cell gives up the notice's columns and takes them back
when it expires" renders `"a" + 79 spaces` where the old literal expected `"a".padEnd(31) + "Notice:
Cache miss: 20k tokens re-billed (~$0.10)"`.

**The configuration's one.** "a notice cell takes a configured format for its kind, in the document's
words" renders `''` where the old literal expected `"Notice: Spent 125k, paid (~$0.38)"`.

**The export pin's one.** "the exported surface offers no way to supply or replace cell content" reads
the new `timed.ts` module: the pinned list gains `["../extensions/jefferson/components/visuals/timed.ts",
["timed"]]`, and the old pin list does not carry it. Red: `✖ the exported surface offers no way to
supply or replace cell content`, `ℹ fail 1`. Green after the move: `ℹ tests 44`, `ℹ pass 44`.

**The format test's typecheck-only move.** `tests/format.test.ts`'s `seed` gains `sampledAt: 0` and its
`shown` fixture gains `shownUntil: 1`, and no test reads them: `resolveFormat` is the pure function and
the visual lives in the binding. Reverting the file leaves the run green (`64 / 64 / 0`) and fails
typecheck only:

```
tests/format.test.ts(15,7): error TS2741: Property 'sampledAt' is missing in type '{ provider: string; … }' but required in type 'Readings'.
tests/format.test.ts(470,3): error TS2322: Type '{ kind: "miss"; values: { tokens: string; cost: string; }; }' is not assignable to type 'Timed<Notice>'.
  Property 'shownUntil' is missing in type '{ kind: "miss"; values: { tokens: string; cost: string; }; }' but required in type '{ readonly shownUntil: number; }'.
```

Green after the move: `pnpm typecheck` prints only `$ tsc --noEmit`.

### 5. E — the import rule's new notch (`checks/imports.mjs`)

**Test.** No new test file; the check is `checks/imports.mjs`, whose header and `VISUAL_DIR` rule now
say a file under `components/visuals/` imports nothing of this package. Green: `edges: 52`, `PASS`.

**Plant.** `import { collapse } from "../../format.ts";` added to the top of `timed.ts`.

**Red.** `node checks/imports.mjs <spike>`:

```
VISUAL IMPORTS extensions/jefferson/components/visuals/timed.ts imports extensions/jefferson/format.ts
IMPORTS FAIL
```

**Green**, after the revert: `edges: 52`, `PASS`. The `CLOCK` rule still names only `startup.ts`, and the
run prints no `CYCLE`.

### 6. F — `$blocks` is bare at 1 and 2, and the kind is chosen by the count (`tests/notice.test.ts`)

**Test.** "the thinking delta shows when the count rises and stays silent when it repeats" and "the
thinking delta reads the branch, not the entries: a sibling's higher count stays silent": two dropped
blocks read `{ kind: "thinking", values: { blocks: "2" } }`, one reads `{ kind: "thinkingOne", values:
{ blocks: "1" } }`. Green before the plant: `ℹ tests 3`, `ℹ pass 3`, `ℹ fail 0`.

**Plant.** `data/notice.ts`'s `return { kind: dropped === 1 ? "thinkingOne" : "thinking", values:
{ blocks: `${dropped}` } };` → the old `const noun = dropped === 1 ? "thinking block" : "thinking
blocks"; return { kind: "thinking", values: { blocks: `${dropped} ${noun}` } };`.

**Red.** `node --test --test-name-pattern='the thinking delta' tests/notice.test.ts`:

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

**Green**, after the revert: `ℹ tests 3`, `ℹ pass 3`, `ℹ fail 0`.

### 7. G — `thinkingOne`'s default text (`tests/instrument.test.ts`)

**Test.** "the notice's default text is its kind's, in the warning colour, and nothing shows without a
notice" now carries eight cases; the last is `[{ kind: "thinkingOne", values: { blocks: "1" } },
"Anthropic dropped 1 thinking block (details in session)"]`. Green before the plant: `✔ …`,
`ℹ pass 1`, `ℹ fail 0`.

**Plant.** `notice.ts`'s `thinkingOne: "Anthropic dropped $blocks thinking block (details in session)"`
→ the plural noun.

**Red.** `node --test --test-name-pattern="notice's default text" tests/instrument.test.ts`:

```
✖ the notice's default text is its kind's, in the warning colour, and nothing shows without a notice (4.753833ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  + 'Notice: Anthropic dropped 1 thinking blocks (details in session)'
  - 'Notice: Anthropic dropped 1 thinking block (details in session)'
```

**Green**, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0`.

### 8. H — `$idle` is bare, and `6m` arrives through `missIdle` (two ends)

The idle's unit moved from the value to the text. Two plants, one per end. The instrument's case uses
the literal `"6"`, so the data-side plant does not reach it; the format-side plant does. Green before
both: `✔ the idle variant…`, `✔ the notice's default text…`.

**Plant 1 — the value keeps the unit.** `data/notice.ts`'s `values.idle = `${Math.round(miss.idleMs /
MINUTE_MS)}`` → `` …}m``.

**Red 1.** `node --test --test-name-pattern='the idle variant' tests/notice.test.ts`:

```
✖ the idle variant: exactly five minutes reads missIdle and a millisecond under does not (0.870958ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  '5m' !== '5'
      at TestContext.<anonymous> (.../tests/notice.test.ts:101:10)
```

Green 1, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0`.

**Plant 2 — the text loses the unit.** `notice.ts`'s `missIdle: "Cache miss after $idle\\m idle: …"` →
`$idle idle`.

**Red 2.** `node --test --test-name-pattern="notice's default text" tests/instrument.test.ts`:

```
✖ the notice's default text is its kind's, in the warning colour, and nothing shows without a notice (4.837375ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  + 'Notice: Cache miss after 6 idle: 125k tokens re-billed'
  - 'Notice: Cache miss after 6m idle: 125k tokens re-billed'
```

Green 2, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0`.

Both ends in one run, the value carrying `m` and the text carrying `\m`, would render `6mm`; that
combination is not a state the tree reaches, because each end has one owner.

### 9. I — a backslash yields the character after it (`tests/format.test.ts`)

The single test was split into three so each case has its own red: "a backslash ends a name run, so the
name is the value and the escaped character is literal" (`$model\m`), "a backslash yields any
character, a space included" (`a\b`, `a\ b`), and "the special characters keep the escape ADR 0003 gave
them, and a trailing backslash stays itself" (`\$bar`, `a\|b`, `tail\`). A fourth, "a plain format takes
the same escape as a cell's format", parses `Cache miss after $idle\m idle` as three segments. Green
before the plant: `ℹ tests 68`, `ℹ pass 68`, `ℹ fail 0`.

**Plant.** `format.ts`'s `if (character === "\\" && format[index + 1] !== undefined)` → `if (character
=== "\\" && (format[index + 1] === "$" || format[index + 1] === "|"))`, the old two-character rule.

**Reds.** Three tests go red; the third stays green under the old rule and is the guard.

`node --test --test-name-pattern='a backslash ends a name run' tests/format.test.ts`:

```
✖ a backslash ends a name run, so the name is the value and the escaped character is literal (0.995625ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  + 'claude-opus-4\\m'
  - 'claude-opus-4m'
```

`node --test --test-name-pattern='a backslash yields any character' tests/format.test.ts`:

```
✖ a backslash yields any character, a space included (0.936083ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  'a\\b' !== 'ab'
```

`node --test --test-name-pattern='a plain format takes the same escape' tests/format.test.ts`:

```
✖ a plain format takes the same escape as a cell's format (1.269333ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  … { kind: 'literal', modifiers: [], + text: '\\m idle' / - text: 'm idle' }
```

`node --test --test-name-pattern='the special characters keep the escape' tests/format.test.ts` prints
nothing: `\$`, `\|` and the trailing backslash are the rule's surviving half. Green after the revert:
`✔` on all four, `ℹ pass 4`, `ℹ fail 0`.

### 10. J — an unknown `formats` key still rejects (`tests/configuration.test.ts`)

**Test.** "a formats key the notice's declaration does not carry rejects the document" now loops over
`["warm", "thinkingTwo"]`: `thinkingOne` became a kind, so a near miss must still be unknown. Green
before the plant: `✔ a formats key the notice's declaration does not carry rejects the document`,
`ℹ pass 1`, `ℹ fail 0`.

**Plant.** `configuration.ts`'s `if (declaration.composed === undefined ||
!Object.hasOwn(declaration.composed.formats, kind))` → `if (false)`, so any key is taken.

**Red.** `node --test --test-name-pattern="formats key the notice" tests/configuration.test.ts`:

```
✖ a formats key the notice's declaration does not carry rejects the document (1.493584ms)
  AssertionError [ERR_ASSERTION]
    actual: undefined,
    expected: true,
```

The document is accepted and `warning` is `undefined`, so the assertion's `warning?.includes(...)` is
`undefined`. Green, after the revert: `✔ …`, `ℹ pass 1`, `ℹ fail 0`.

### The audit of every format's backslash

D11 asks the implementation to repeat ADR 0003's audit: the specs, the ADRs, the README, `AGENTS.md`,
and any `pi-jefferson.json` it can see. Method: `git grep -n '\\'` over the tree (776 lines), then every
backtick span in the markdown and every `defaultFormat`, `formats` and `format` value in the source and
the tests read and classified. `AGENTS.md` and `ARCHITECTURE.md` carry no backslash at all.

**Result: none found.** No format string the repository already carried has a backslash before a
character other than `$` or `|`. The backslashes in the tree fall into five groups, none a format:

- `\$` and `\|`, the two the language always escaped: `README.md:101,109,167,168,169,172,175,181,183`;
  `docs/adr/0003-a-format-carries-modifiers.md:25,30,58`; `openspec/specs/statusline/spec.md:750,768,796`;
  `openspec/changes/archive/2026-11-05-configurable-instruments/specs/statusline/spec.md:423,440`;
  `openspec/changes/archive/2026-11-06-variable-modifiers/specs/statusline/spec.md:11,28,56`;
  `openspec/changes/archive/2026-11-07-label-gap/specs/statusline/spec.md:37,55,83`;
  `openspec/changes/archive/2026-11-09-default-labels/specs/statusline/spec.md:138,156,184`.
- `\n`, `\r`, `\t`, `\x1b` and `\u…` in code examples, labels and status texts, not formats: for example
  `openspec/specs/statusline/spec.md:1495` (`building\n  3 files`),
  `openspec/changes/archive/2026-11-10-instruments-for-every-datum/specs/statusline/spec.md:236`,
  `tests/configuration.test.ts:689` (a label's `a\$b`), `docs/adr/0003:25`.
- A trailing backslash with nothing after it, `tests/format.test.ts:82` (`tail\`), which the new rule
  leaves as itself and which is not "before a character".
- Starship's own format language in the research files (`\(`, `\)`, `\[`, `\]`), which pi-jefferson does
  not parse: `openspec/changes/archive/2026-11-09-default-labels/research-chidi.md:54,55,57,59,60` and
  `.../2026-11-05-configurable-instruments/research-chidi.md:329`.
- The change's own additions, which are the new rule's users, not its casualties:
  `extensions/jefferson/components/instruments/notice.ts:14` (`$idle\m`),
  `tests/format.test.ts:343` (`$model\m`), `:347` (`a\b`), `:348` (`a\ b`), `:492` (`$idle\m`), and the
  amendment's delta scenarios in `<changeDir>/specs/statusline/spec.md`.

**`~/.pi/agent/pi-jefferson.json`** (read only, not edited): no backslash in the file at all. Its five
formats are `$path`, `$model via|dim $provider|capitalize`, `$level|capitalize`, `$bar $percent` and
`""`. The tree carries no other `pi-jefferson.json`; `git ls-files '*.json'` lists only the workflows,
`package.json`, the lockfile and `tsconfig.json`.

### The tree at the addendum's head

```
$ git log --oneline -1
a9a9d7d Add the timed visual, and keep English out of the notice's values
$ git status --porcelain --untracked-files=all
(empty)
```

`pnpm typecheck` clean. `checks/suite.sh <spike> 424` → `suite: 424 passed, 0 failed (expected 424)`
`PASS`. `checks/imports.mjs <spike>` → `edges: 52`, `PASS`. `checks/terminal.sh <spike>` → `PASS`.
`checks/tarball.sh <spike> 28` → `source files under extensions/: 28 (tracked: 28) (expected: 28)`,
`PASS`. `checks/scope.sh <spike> 162ff07 a9a9d7d <the sixteen paths>` → `every changed path is one the
task names`, `PASS`.

`checks/specs.sh <main checkout> notices-in-the-footer` → `Change 'notices-in-the-footer' is valid`, then
**FAIL**, exit 1: `extension-source-layout/spec.md:24`'s "The bar has its own file" paragraph is **573
characters**, over the 500 ceiling. That paragraph is the amendment's text, not this change's code, and
`redgreen-derek.md` is not the place to rewrite a spec. The other two deltas measure 386 and 480
characters, both inside the ceiling.

### Where the run contradicts the contract

1. **The amendment's `extension-source-layout` paragraph breaks the 500-character ceiling.** The
   requirement at `<changeDir>/specs/extension-source-layout/spec.md:24` is 573 characters. The
   paragraph-ceiling check fails on it. Not edited here; the conductor decides whether the amendment is
   trimmed.
2. **The spike's own `openspec/` copy is stale.** `<spike>/openspec/changes/notices-in-the-footer/`
   carries the pre-amendment `design.md` and the three delta specs; the amendment lives in the main
   checkout's `<changeDir>`. The code is built to the main checkout's amendment. `openspec validate
   notices-in-the-footer --strict` in the spike therefore validates the stale copy and prints "Change
   'notices-in-the-footer' is valid"; the main checkout's copy also validates, so only the paragraph
   ceiling differs. Nothing in the spike's `openspec/` was edited, and nothing needs to be: the spike
   branch never ships.
3. **The instrument's `missIdle` case cannot see the data-side plant.** The case supplies the literal
   `"6"`, so `data/notice.ts`'s unit suffix does not reach it; the two ends of check 8 are measured in
   two different files. That is a fixture choice, not a gap: the notice's own end is measured at the
   data test, the text's at the instrument test.

### My calls

- **One commit, not two.** Part A and Part B meet in the same three test files (`instrument.test.ts`,
  `notice.test.ts`, `configuration.test.ts`) and in the same `notice.ts`, and Part A's default-text
  fixtures cannot be green without Part B's bare values. Splitting would have meant a broken
  intermediate or a reordering that rewrites the same lines twice. The commit message states both
  halves.
- **The escape test split into three.** One test's first assertion shadowed the rest, so `a\b` had no red
  of its own. Three tests give each case its own plant and its own red, and the third is the surviving
  half.
- **`timed`'s missing instant is `undefined`, not `""`.** The design says `undefined` is the hidden
  answer, so a hidden datum is unknown to the cell and drops its label and gap. An empty string would
  keep the label.
- **`sampledAt` is read after `readUsage()`**, so the instant a render reports is the one taken once the
  data is in hand. Two timed cells in one sample agree, and the store's own stamp stays the arrival's.
- **The `armExpiry` callback's `if (now === undefined) return;` guard stays.** After disposal the captured
  `now` is `undefined`, and the callback must not request a repaint into a context the host invalidated.
- **`Timed<T>` sits beside `Readings` in `session-data-store.ts`**, as the design says, so the next timed
  datum reuses it.

### Docs for Bambadjan

The change makes these sentences false or incomplete; none of them is a Markdown file this spike may
edit.

- `README.md:100-103` — "`format` is plain text with the instrument's already-formatted `$variables`,
  not Markdown. `$` and `|` are its two special characters, escaped `\$` and `\|`." The escape now
  reaches any character: `\` yields the character after it. The two special characters are still the
  two that need escaping, but they are no longer the escape's limit.
- `README.md:181-184` — "Where a literal pipe has to sit beside a name, write `\|`. That escape changed
  meaning in this release. A format written `\|` used to render `\|`, because a backslash before
  anything but `$` was a literal backslash; it now renders `|`." The "before anything but `$`" clause is
  now false; a backslash before anything at all yields that character. The sentence also needs the new
  meaning's date, beside the ADR's.
- `docs/adr/0003-a-format-carries-modifiers.md:30` — "`$` and `|` are the format language's two special
  characters, escaped `\$` and `\|`." Incomplete as the escape's rule. D9 asks for the generalized
  escape's ADR extending ADR 0003, and ADR 0009's addendum for the widened import rule; neither exists
  in the tree yet.
- `ARCHITECTURE.md:21` — "`visuals/` what an instrument can mix in; today the bar" — the directory now
  holds the bar and the timed visual.
- `ARCHITECTURE.md:92` — "**Bar.** The bar lives in `components/visuals/bar.ts` and stands alone. It
  imports no file of this package…" — the rule now covers every visual, and the timed visual joins the
  bar as its second member.
- `ARCHITECTURE.md:126-127` — "`components/visuals/bar.ts` imports no local file." and "`format.ts`
  imports `components/visuals/bar.ts`…" — the first names one file where the rule now covers the
  directory, and the second misses the binding's `timed` import and `timed.ts` itself.
- `openspec/specs/statusline/spec.md:750` — "`$` starts a variable and `|` a modifier when a name
  follows it; `\$` and `\|` escape them." Incomplete for the same reason as ADR 0003; the delta's
  MODIFIED requirement carries the new wording, and the living spec takes it in the docs pass.
- `AGENTS.md` "Adding an instrument" — incomplete rather than false: it does not yet say that a visual
  imports nothing of the package and that a timed instrument declares `shownUntil` rather than keeping
  time. D9 asks for that sentence.

### Not verified

- **The visual against a real clock.** Every measurement uses a fake clock; the host's real clock and
  timer are exercised only by the store's existing tests. A live session's show-and-hide is Joel's
  observation, not this spike's.
- **The fill cell's give-back on a real clock.** `tests/row-renderer.test.ts` drives the instant by hand
  (`shownUntil: 0`); the real timer's repaint path is measured in the store's tests, not end to end.
- **The host's `session_shutdown` release.** The existing test covers the handler; the spike did not run a
  live `ctx.reload()`.
- **The parent's amendment beyond these two parts.** The design's D1–D11 include things this addendum
  does not measure — the composed-format contract's full surface, the gate's subscription counts end to
  end — because the prior addendum measured them and this turn changed only the timed visual and the
  values.
