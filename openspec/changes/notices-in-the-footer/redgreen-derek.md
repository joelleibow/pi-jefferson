# Red/green measurement of every check a task will rely on (Derek, scratch spike)

Joel's ruling for this pipeline: *before `tasks.md` is drafted, every check a task relies on is run and shown going red and then green*, so each task can cite a measured command, a measured red and a measured green. Derek run on 2026-11-10, worktree `/Users/joelleibow/Projects/pi-jefferson/.pi/marbleization/notices-in-the-footer/spike`, branch `notices-in-the-footer-spike`, base `b9668d9` (clean, `pnpm install` done, 360 passing). Nothing here ships; Implement starts again from `tasks.md` on the real branch. Check scripts are in `openspec/changes/notices-in-the-footer/checks/` and take the repository path as an argument; none defaults to a repository, and nothing writes under `/tmp`. Transcribed verbatim.

**Done so far: the change is built as seven commits, each green, and every check the brief lists is measured and written here.** D9's docs pass is after the implementation gate, so it is not part of this spike and is not measured. The sections below fill in group by group; a group's reds and greens are recorded as it closes.

## The spike commits

```
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

## The checks

| Check | Command |
|---|---|
| 1 suite | `checks/suite.sh <repo> 413` |
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

The reds for the pure rule were measured at `65e8478`; they are not re-run here. The group's own reds follow.

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
4. **Nothing else.** D1's three subscriptions, D2's timer and its one repaint, D3's gate, D4's reorder,
   D5's composed format, D6's plain format, D7's feed's three subscriptions, and the spec deltas'
   scenarios held as written.

## Questions

None open. The design's silence on the alignment check is the only question, and the brief's §2 list
answers it; no decision is needed. The prior run's §2.1 reds for the pure rule are recorded as measured
at `65e8478` and are not re-run here.

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
- **The prior run's §2.1 reds for the pure rule are not re-run here**; they are recorded as measured at
  `65e8478`.
- **CI and the release workflow were not run**; the tarball was checked locally only.
- **The main checkout's report and `checks/` are written, not committed**, and the main checkout's branch
  is `notices-in-the-footer`.

## Tree as I left it

```
$ git status --porcelain --untracked-files=all
(empty)
$ git log --oneline -1
cf32ed1 Prove the notice cell's text sits at its alignment
$ git branch --show-current
notices-in-the-footer-spike
```
Checks green at HEAD: `suite: 413 passed, 0 failed (expected 413) PASS`; `imports: files 27, edges 51
PASS`; `terminal PASS`; `tarball: 27 (tracked: 27) PASS`; `specs: longest 441 / 375 / 356, none over
500 PASS`; `scope PASS` for `cf32ed1`; export pin green, and red with the notice's row removed.

Main checkout, `notices-in-the-footer`: `git status --porcelain --untracked-files=all` lists only the
seven `checks/` scripts and `redgreen-derek.md`, all untracked. Nothing committed there.
