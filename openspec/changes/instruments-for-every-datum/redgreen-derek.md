# Red/green measurement of every check a task will rely on (Derek, scratch spike)

Joel's ruling for this pipeline: *before `tasks.md` is drafted, every check a task relies on is run and shown going red and then green*, so each task can cite a measured command, a measured red and a measured green. Derek run `derek-redgreen`, 2026-11-10, worktree `/Users/joelleibow/Projects/pi-jefferson/.pi/marbleization/instruments-for-every-datum/spike`, branch `instruments-for-every-datum-spike`, base `c5ff75e` (clean, `pnpm install` done, 317 passing). Nothing here ships; Implement starts again from `tasks.md` on the real branch. Check scripts are in `openspec/changes/instruments-for-every-datum/checks/` and take the repository path as an argument; none defaults to a repository, and nothing writes under `/tmp`. Transcribed verbatim.

**Done: the change is built as eight commits, each green, and every check below is measured — red on a planted mistake or on the not-yet-built state, green at the commit that closes it.** Two things are not measured and are named where they belong: the throwing `os.homedir()` branch of D3 cannot be reached from a test under `pnpm test`, and one plant I framed (a form looked up outside its declaring variable) has no distinguishing input in this tree. Both are in "Not verified".

## The spike commits

```
5451cea Read the statuses once per render, and prove two cells share the text
668ddc2 Show the three new cells at their own alignments end to end
69b89be Ship the status instrument, and pin every shipped file in one table
8f5e562 Ship the session instrument
d933bfc Ship the branch instrument
fb3e532 Let a variable declare forms, and give $path its absolute and relative ones
ac1a0f8 Attach the footer's own data through the feed, and release it with the feed
ad4803f Hold the home directory, the branch, the session's name and the statuses in the store
c5ff75e Amend the instruments design to the new source tree and record Michael's re-confirmation  (base)
```

`git status --porcelain --untracked-files=all` is empty at HEAD. Nothing is staged. Nothing was pushed.

| commit | task it builds | tests | typecheck |
|---|---|---|---|
| `c5ff75e` base | — | 317 | clean |
| `ad4803f` | the store: `home`, `branch`, `sessionName`, `statuses` + `branchChanged`, `sessionNamed`, `readStatusesFrom`; the feed's two seeds | 322 | clean |
| `ac1a0f8` | D1's attachment, its three guards, the `session_info_changed` subscription, `installFooter`'s `footerData` | 333 | clean |
| `fb3e532` | D4–D6: `variableForms` on the contract, `path`'s three forms, `parseFormat`/`resolveFormat` | 346 | clean |
| `d933bfc` | `branch.ts` + one `shipped.ts` entry | 348 | clean |
| `8f5e562` | `session.ts` + one `shipped.ts` entry | 350 | clean |
| `69b89be` | `status.ts` + one `shipped.ts` entry, D8's pin rewrite, the three new cells' alignment | 354 | clean |
| `668ddc2` | the alignment assertions made to discriminate | 354 | clean |
| `5451cea` | the spec's "Two cells, one render" scenario | 355 | clean |

## The checks

| Check | Command |
|---|---|
| 1 suite | `checks/suite.sh <repo> 355` |
| 2 behavioral tests | `node --test tests/<file>.test.ts [--test-name-pattern=…]`, each with a planted mistake |
| 3 D8's expectation edits | `checks/testdiff.sh <repo> c5ff75e`, `git diff -U0 … \| grep '^-.*assert'`, and the old expectation planted back |
| 4 export pin | `node --test tests/jefferson.test.ts` with a row removed and with a widened export |
| 5 import boundaries | `node checks/imports.mjs <repo>` |
| 6 named files only | `checks/scope.sh <repo> <base> <head> <allowed path>…` |
| 7 no terminal, no shell-out | `checks/terminal.sh <repo>` |
| 8 tarball | `checks/tarball.sh <repo> 25` |
| 9 specs | `checks/specs.sh <main checkout> instruments-for-every-datum [specs dir]` |

### 1. `suite.sh` — `pnpm typecheck` + `pnpm test`

- Green at every commit: 317 → 322 → 333 → 346 → 348 → 350 → 354 → 354 → 355, `tsc` clean at each (the table above; measured by checking out each commit and running `tsc --noEmit` and `node --test`).
- Green at HEAD:

```
$ checks/suite.sh <spike> 355
ℹ tests 355
ℹ pass 355
ℹ fail 0
suite: 355 passed, 0 failed (expected 355)
PASS
```

- Red, through a planted mistake rather than a threshold: `branch.ts`'s variable made to read `sessionName` (the same plant §2.16 records):

```
  AssertionError [ERR_ASSERTION]: the left cell is flush with the row's left edge

  -1 !== 0

      at TestContext.<anonymous> (.../tests/jefferson.test.ts:367:10)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:974:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: -1,
    expected: 0,
    operator: 'strictEqual',
    diff: 'simple'
  }
[ELIFECYCLE] Test failed. See above for more details.
TESTS FAIL
```

### 2. The new behavioral tests, each with its planted red

38 new tests: 317 → 355. Their names, in the order the suite reports them, are listed under §2.15. Every red below was produced by a planted mistake in a committed file, run against only the named test, and reverted with `git checkout --` (tree clean after each).

**2.1 The branch is seeded at the attach, and no sample asks the host again** — `tests/session-data-feed.test.ts`.

- Green: `✔ the attach seeds the branch before the first render, and no sample asks the host again`, `ℹ pass 1 ℹ fail 0`.
- Red, the seed deleted from `attachFooterData`:

```
✖ the attach seeds the branch before the first render, and no sample asks the host again
  AssertionError [ERR_ASSERTION]: the branch is held before the first render
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:103:10)
    actual: undefined,
    expected: 'main',
```
- Red, the rejected alternative "poll `getGitBranch()` each sample", planted as the statuses reader also pushing the branch: `store.readStatusesFrom(() => { store.branchChanged(footerData.getGitBranch()); return footerData.getExtensionStatuses(); })`:

```
✖ the attach seeds the branch before the first render, and no sample asks the host again
  AssertionError [ERR_ASSERTION]: one read at the attach
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:104:10)
    actual: 2,
    expected: 1,
```

**2.2 A branch change is pushed and repaints once; the held branch repaints nothing** — feed test.

- Green: `✔ a branch change is pushed and repaints once, and the held branch repaints nothing`.
- Red, the listener's push deleted:

```
✖ a branch change is pushed and repaints once, and the held branch repaints nothing
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:118:10)
    actual: 'main',
    expected: 'feature/x',
```
- Red for the "no repaint on the held value" half, at the store: `const changed = value !== branch` → `true`:

```
✖ a branch change repaints once, and a report of the branch already held repaints nothing
  AssertionError [ERR_ASSERTION]: the held branch repaints nothing
  2 !== 1
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:340:10)
```

**2.3 `null` versus `""`** — feed test and the branch cell.

- Green: `✔ a null branch is unknown, and an empty string is a datum the store keeps`.
- Red, `?? ""` in the attachment (`store.branchChanged(footerData.getGitBranch() ?? "")`):

```
✖ a null branch is unknown, and an empty string is a datum the store keeps
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:127:10)
    actual: '',
    expected: undefined,
```
- Red, the same collapse at the store's setter (`next ?? ""`):
```
✖ the branch is held as reported, and the host's null reads unknown rather than an empty string
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  '' !== undefined
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:331:10)
```
- Red for the cell, `readings.branch ?? ""` in `branch.ts`:
```
✖ the branch cell renders its default label, and nothing at all outside a repository
  AssertionError [ERR_ASSERTION]: unknown is not an empty string: no label and no gap
      at TestContext.<anonymous> (.../tests/configuration.test.ts:802:10)
    actual: [ 'Branch: ' ],
    expected: [ '' ],
```
- The green half that pins the distinction: the same test asserts an empty string *is* a datum and renders the bare label, `assert.deepEqual(empty, ["Branch: "], "an empty string is a datum, so the bare label renders")`.

**2.4 An attach after the release takes no subscription and seeds nothing** — feed test.

- Green: `✔ an attach after the release takes no subscription and seeds nothing`.
- Red, the `released` guard removed from `attachFooterData`:

```
✖ an attach after the release takes no subscription and seeds nothing
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:138:10)
    actual: 1,
    expected: 0,
```

**2.5 A second attach releases the first's** — feed test.

- Green: `✔ a second attach releases the first's subscription, and only the second's runs`.
- Red, `releaseBranch?.()` removed from the top of `attachFooterData`:

```
✖ a second attach releases the first's subscription, and only the second's runs
  AssertionError [ERR_ASSERTION]: the first build's subscription is released
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:151:10)
    actual: 0,
    expected: 1,
```

**2.6 A callback after dispose runs no store code and requests no repaint** — feed test.

- Green: `✔ a branch listener fired after the release touches no store code and requests no repaint`.
- Red, the listener's `if (released) return;` removed. The observable is the branch read the store call would run first:

```
✖ a branch listener fired after the release touches no store code and requests no repaint
  AssertionError [ERR_ASSERTION]: the store was not asked to read the branch
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:172:10)
    actual: 2,
    expected: 1,
```

**2.7 The release takes the branch and the name subscription with the rest** — feed test.

- Green: `✔ the release takes the branch subscription and the name subscription with the rest`, and the suite's end-to-end teardown tests (§3).
- Red, `releaseBranch?.()` removed from `release`:

```
✖ the release takes the branch subscription and the name subscription with the rest
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:180:10)
    actual: 0,
    expected: 1,
```
- Red, `releaseName()` removed:
```
✖ the release takes the branch subscription and the name subscription with the rest
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:181:10)
    actual: [ 'model_select', 'thinking_level_select', 'turn_end' ],
    expected: [ 'model_select', 'thinking_level_select', 'turn_end', 'session_info_changed' ],
```

**2.8 The session's name is seeded and pushed** — feed test.

- Green: `✔ the session's name is seeded at the start and pushed by the event the host announces`.
- Red, the seed deleted (`sessionName: ctx.sessionManager.getSessionName()`):
```
✖ the session's name is seeded at the start and pushed by the event the host announces
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:188:10)
    actual: undefined,
    expected: 'refactor footer',
```
- Red, the `session_info_changed` subscription deleted:
```
✖ the session's name is seeded at the start and pushed by the event the host announces
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:191:10)
    actual: 'refactor footer',
    expected: 'docs',
```
- Red for the cleared-name repaint, at the store (`name !== sessionName` → `name !== undefined`):
```
✖ the session's name is seeded, replaced by a push, and cleared to unknown
  AssertionError [ERR_ASSERTION]: clearing the name is a change and repaints
  1 !== 2
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:354:10)
```

**2.9 Statuses: sorted, collapsed, dropped-empty, unknown** — `tests/instrument.test.ts` (resolver) and `tests/configuration.test.ts` (label).

- Green: `✔ status orders by key, collapses whitespace, drops what is left empty and joins by one space`.
- Red, the sort removed:
```
✖ status orders by key, collapses whitespace, drops what is left empty and joins by one space
  AssertionError [ERR_ASSERTION]: insertion order is not key order
      at TestContext.<anonymous> (.../tests/instrument.test.ts:251:10)
    actual: 'idle 3 tasks',
    expected: '3 tasks idle',
```
- Red, `sanitize` returning its input unchanged:
```
  AssertionError [ERR_ASSERTION]: a newline and a run of spaces collapse
      at TestContext.<anonymous> (.../tests/instrument.test.ts:252:10)
    actual: 'building   3 files',
    expected: 'building 3 files',
```
- Red, the drop-empty filter removed:
```
  AssertionError [ERR_ASSERTION]: and is dropped from the join
      at TestContext.<anonymous> (.../tests/instrument.test.ts:256:10)
    actual: ' kept',
    expected: 'kept',
```
- Red, "nothing left" returned as `""` instead of unknown (`texts.join(" ")`), which matters at the label:
```
✖ the status cell renders its default label over the statuses, and nothing over none
  AssertionError [ERR_ASSERTION]: a status that collapses to nothing renders nothing, as with no statuses
      at TestContext.<anonymous> (.../tests/configuration.test.ts:833:10)
    actual: [ 'Status: ' ],
    expected: [ '' ],
```
- Red, the store's empty map held instead of unknown (`statuses === undefined || statuses.size === 0 ? undefined : statuses` → `statuses`):
```
✖ statuses are read once per sample, held raw, and an empty map reads unknown
  AssertionError [ERR_ASSERTION]: an empty set is unknown
  + actual - expected
  + Map(0) {}
  - undefined
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:372:10)
```
- The attach supplying no reader (`new Map()` instead of `footerData.getExtensionStatuses()`):
```
✖ statuses are read on every sample and an empty set reads unknown
  AssertionError [ERR_ASSERTION]: the host's map, held raw
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:203:10)
    actual: undefined,
    expected: Map(2) { 'b' => 'idle', 'a' => '3 tasks' },
```

**2.10 The spec's "Two cells, one render"** — `tests/session-data-feed.test.ts`, rendering two bound `status` cells through `createFooter`.

- Green: `✔ two status cells in one render ask the host once and read the same text`.
- Red, the rejected shape "sample per cell" (the cell view calling `sampleReadings()` instead of reading the render's one sample):
```
✖ two status cells in one render ask the host once and read the same text
  AssertionError [ERR_ASSERTION]: one render asks the host once
      at TestContext.<anonymous> (.../tests/session-data-feed.test.ts:257:10)
    actual: 5,
    expected: 1,
```

**2.11 `$path|base`, `|absolute`, `|relative`** — `tests/instrument.test.ts`.

- Green: `✔ path's base form is the basename a bare $path renders`, `✔ path's absolute form is the whole directory`, `✔ path's relative form is pi's rule: ~ at home, ~/ below it, the path outside it`.
- Red for "the render ignores the form the parse recorded":
```
✖ path's absolute form is the whole directory
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      at TestContext.<anonymous> (.../tests/instrument.test.ts:192:10)
    actual: 'pi-jefferson',
    expected: '/Users/joelleibow/Projects/pi-jefferson',
✖ a form with another modifier after it renders the form's text under that modifier
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      at TestContext.<anonymous> (.../tests/instrument.test.ts:227:10)
    actual: '\x1B[1mpi-jefferson\x1B[22m',
    expected: '\x1B[1m~/Projects/pi-jefferson\x1B[22m',
```
- Red for "home itself renders `~`":
```
✖ path's relative form is pi's rule: ~ at home, ~/ below it, the path outside it
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      at TestContext.<anonymous> (.../tests/instrument.test.ts:197:10)
    actual: '~/',
    expected: '~',
```
- Red for the sibling prefix `/Users/joelleibow2/app` under `/Users/joelleibow`, planted as a string-prefix test (the design's stated alternative):
```
✖ path's relative form resolves both paths, so a trailing separator and a sibling prefix both hold
  AssertionError [ERR_ASSERTION]: joelleibow2 is not under joelleibow
      at TestContext.<anonymous> (.../tests/instrument.test.ts:206:10)
    actual: '~/2/app',
    expected: '/Users/joelleibow2/app',
```
- Red for a home the store does not know, the guard removed:
```
✖ an unknown home directory renders the absolute directory, and the cell is not empty
  ℹ fail 1
```
- Green for an unknown working directory in every form: `✔ an unknown working directory renders nothing in every form`. Its planted red is masked: `absolute: readings => readings.cwd ?? ""` stays green, because `resolveFormat`'s whole-declaration check (`variables.path`, the base resolver) returns `""` before a form is consulted. That is a second guard, not a gap; see "Where the run contradicts the design" note 4.

**2.12 The five D5 rejections** — `tests/format.test.ts`.

- Green: `✔ a form is recorded on the variable's segment, apart from the modifier chain`, `✔ a form after literal text rejects naming the instrument and the name`, `✔ a form on a variable that does not declare it rejects naming that variable`, `✔ a form after another modifier rejects naming the instrument and the form`, `✔ two forms on one variable reject on the second`, `✔ a form applies to its own variable only, so two cells' forms do not swap`.
- Red, "a form is accepted after another modifier" (`subject.modifiers.length === 0` dropped):

```
✖ a form after another modifier rejects naming the instrument and the form
  AssertionError [ERR_ASSERTION]: Missing expected exception.
      at TestContext.<anonymous> (.../tests/format.test.ts:377:10)
    actual: undefined,
    expected: { message: `"path"'s format names a modifier it does not implement: "|absolute"` },
```
- Red, "a second form is accepted on the same variable" (`subject.form === undefined` dropped):
```
✖ two forms on one variable reject on the second
  AssertionError [ERR_ASSERTION]: Missing expected exception.
      at TestContext.<anonymous> (.../tests/format.test.ts:383:10)
    actual: undefined,
    expected: { message: `"path"'s format names a modifier it does not implement: "|absolute"` },
```
- The message for a form out of position is the existing unknown-modifier message, `"path"'s format names a modifier it does not implement: "|absolute"`, which names the instrument and the modifier as the living spec requires. My call, recorded below.

**2.13 The three default labels** — `tests/configuration.test.ts`.

- Green: `✔ the branch cell renders its default label, and nothing at all outside a repository`, `✔ the session cell renders its default label, and nothing at all for an unnamed session`, `✔ the status cell renders its default label over the statuses, and nothing over none`; plus the `labels` map in `tests/instrument.test.ts` (`✔ the ten shipped declarations own their names, variables, defaults and foundational options`).
- Red, each label replaced with a plausible wrong one:
```
✖ the branch cell renders its default label, and nothing at all outside a repository
    actual: [ 'Git: main' ],        expected: [ 'Branch: main' ],    (.../tests/configuration.test.ts:799:10)
✖ the session cell renders its default label, and nothing at all for an unnamed session
    actual: [ 'Name: refactor footer' ],  expected: [ 'Session: refactor footer' ],  (.../tests/configuration.test.ts:814:10)
✖ the status cell renders its default label over the statuses, and nothing over none
    actual: [ 'Set: 3 tasks idle' ],  expected: [ 'Status: 3 tasks idle' ],  (.../tests/configuration.test.ts:825:10)
```

**2.14 Alignment for each new cell** — `tests/jefferson.test.ts`, one row of the three cells at left, centre and right in `distribution: "equal"`, through the real `setFooter`.

- Green: `✔ the branch, session and status cells render their labels at their alignments end to end` (branch at index 0, `Session: docs` at 34, status ending at 80).
- Red, the cell view ignoring `align` (`const before = 0;`):
```
✖ the branch, session and status cells render their labels at their alignments end to end
  AssertionError [ERR_ASSERTION]: the centred cell is centred in its own cell
      at TestContext.<anonymous> (.../tests/jefferson.test.ts:368:10)
    actual: 27,
    expected: 34,
```
- `668ddc2` exists because the first framing of this test was vacuous: with the default distribution the centred cell's content filled its cell, so the same plant stayed green (`ℹ pass 1 ℹ fail 0`). The task that writes this test must pin the distribution.

**2.15 The 38 new tests, by file**

- `tests/session-data-feed.test.ts` (12, new file): no footer data means the branch and the statuses read unknown; the attach seeds the branch before the first render, and no sample asks the host again; a branch change is pushed and repaints once, and the held branch repaints nothing; a null branch is unknown, and an empty string is a datum the store keeps; an attach after the release takes no subscription and seeds nothing; a second attach releases the first's subscription, and only the second's runs; a branch listener fired after the release touches no store code and requests no repaint; the release takes the branch subscription and the name subscription with the rest; the session's name is seeded at the start and pushed by the event the host announces; statuses are read on every sample and an empty set reads unknown; the home directory is the one the host process reports, and none is unknown; two status cells in one render ask the host once and read the same text.
- `tests/session-data-store.test.ts` (5): a sample is exactly the ten datums, in order, carrying the seed (retitled, not new); the branch is held as reported, and the host's null reads unknown rather than an empty string; a branch change repaints once, and a report of the branch already held repaints nothing; the session's name is seeded, replaced by a push, and cleared to unknown; statuses are read once per sample, held raw, and an empty map reads unknown; a branch push, a name push and a status reader after disposal leave the store untouched.
- `tests/instrument.test.ts` (11): path's base form is the basename a bare `$path` renders; path's absolute form is the whole directory; path's relative form is pi's rule: `~` at home, `~/` below it, the path outside it; path's relative form resolves both paths, so a trailing separator and a sibling prefix both hold; an unknown home directory renders the absolute directory, and the cell is not empty; an unknown working directory renders nothing in every form; a form with another modifier after it renders the form's text under that modifier; branch reads only the branch, and renders the text the host reported; session reads only the name, and renders nothing for an unnamed session; status orders by key, collapses whitespace, drops what is left empty and joins by one space; status reads only the statuses.
- `tests/format.test.ts` (6): a form is recorded on the variable's segment, apart from the modifier chain; a form after literal text rejects naming the instrument and the name; a form on a variable that does not declare it rejects naming that variable; a form after another modifier rejects naming the instrument and the form; two forms on one variable reject on the second; a form applies to its own variable only, so two cells' forms do not swap.
- `tests/configuration.test.ts` (3): the three label tests above.
- `tests/jefferson.test.ts` (1): the alignment test above, plus the rewritten pin.
- Retitled, not new: "in TUI mode a session takes exactly the four subscriptions it names" (was three); "a sample is exactly the ten datums…" (was six); "the ten shipped declarations…" (was seven).

**2.16 Each new instrument reads only the datum it displays** — `tests/instrument.test.ts`, through the `unreadable()` helper that throws on any other datum.

- Green: `✔ branch reads only the branch, and renders the text the host reported`, `✔ session reads only the name…` and `✔ status reads only the statuses`.
- Red, `branch.ts`'s variable made to read `sessionName`:
```
✖ branch reads only the branch, and renders the text the host reported
  Error: the instrument read sessionName, a datum it does not display
```
- Red, `session.ts`'s variable made to read `branch`:
```
✖ session reads only the name, and renders nothing for an unnamed session
  Error: the instrument read branch, a datum it does not display
```
- This is also the plant `suite.sh`'s red uses (§1), and the cell it breaks end to end is the alignment test's first assertion.

### 3. The expectation edits D8 lists, at the lines it cites

`checks/testdiff.sh <repo> c5ff75e` prints every assertion line the range removes and adds. The removals are the whole of the evidence, so the boundary question is: which *existing* assertions moved, and are they D8's?

Removed `assert` lines per file (`git diff -U0 c5ff75e HEAD -- <file> | grep -c '^-.*assert'`):

| file | removed assert lines | what they are |
|---|---|---|
| `tests/instrument.test.ts` | 2 | D8: the instrument count (:73) and the width-0 list (:255) |
| `tests/session-data-store.test.ts` | 1 | D8: the store's key list (:55) |
| `tests/jefferson.test.ts` | 20 | D8: the pin's per-file `deepEqual`s only — every one of them is inside the `@@ -316,62` hunk |
| `tests/format.test.ts` | 0 | — |
| `tests/configuration.test.ts` | 0 | — |
| `tests/row-renderer.test.ts` | 0 | — |

The four D8 expectations, each red when the old text is planted back against the new code:

- **The instrument count of seven** (`tests/instrument.test.ts:79` at HEAD):
```
✖ the ten shipped declarations own their names, variables, defaults and foundational options
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      at TestContext.<anonymous> (.../tests/instrument.test.ts:79:10)
    actual: 10,
    expected: 7,
```
- **The store's key list of six** (`tests/session-data-store.test.ts:63`):
```
✖ a sample is exactly the ten datums, in order, carrying the seed
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
      at TestContext.<anonymous> (.../tests/session-data-store.test.ts:63:10)
    actual: [ 'provider', 'model', 'thinkingLevel', 'cwd', 'home', 'branch', 'sessionName', 'statuses', 'contextUsage', 'totals' ],
    expected: [ 'provider', 'model', 'thinkingLevel', 'cwd', 'contextUsage', 'totals' ],
```
- **`instrumentNamed("branch")` resolving nothing** (:85):
```
✖ unimplemented and inherited names stay unresolved however often asked
  AssertionError [ERR_ASSERTION]: branch
      at TestContext.<anonymous> (.../tests/instrument.test.ts:87:12)
    actual: [Object],
    expected: undefined,
```
- **The width-0 list of six** (:341):
```
✖ an instrument that does not fill renders the same text at width 0 and at width 200
  AssertionError [ERR_ASSERTION]: six of the seven are measured
      at TestContext.<anonymous> (.../tests/instrument.test.ts:338:10)
    actual: [
    expected: [ 'model', 'thinking', 'path', 'context', 'tokens', 'cost' ],
```

The `shapes` table, the `labels` map and the `expected` array D8 also names are all green as edited, and their content is the three new rows with `["branch"]`, `["name"]` and `["status"]`, the labels `Branch:`, `Session:` and `Status:`, and the defaults `main`, `refactor footer` and `3 tasks idle`.

**Edits outside D8's list — the one place the design is wrong as written.** The rule the conductor gave during this run: record them, don't edit `design.md`.

| base lines | test | old → new |
|---|---|---|
| `tests/jefferson.test.ts:432` | "in TUI mode a session takes exactly the three subscriptions it names" | title "three" → "four" |
| `:438-439` | same | `["model_select", "thinking_level_select", "turn_end"]` → `[…, "session_info_changed"]`; the message gains "and the session's name" |
| `:529-530` | a second session_start releases the first install… | `[1, 1, 1]` → `[1, 1, 1, 1]`; "three unsubscribes" → "four" |
| `:536` | same, `h.log` | gains `"unsubscribe:session_info_changed"` after `"unsubscribe:turn_end"` |
| `:571` | disposing a footer then replacing the session… | `[1, 1, 1]` → `[1, 1, 1, 1]` |
| `:580` | same, `h.log` | gains `"unsubscribe:session_info_changed"` after `"unsubscribe:turn_end"` |

Fifteen lines, all forced by D2's `session_info_changed` subscription; nothing else in those three tests changed. Conductor's ruling: confirmed, and to be added to D8's list.

**Fixture literals, no assertion changed.** The four new `Readings` fields are type-forced into five test fixtures: `tests/format.test.ts:14` (seed), `tests/configuration.test.ts:22` (seed) and `:771` (unknown), `tests/instrument.test.ts:10` (seed) and `:18` (unknown), `tests/row-renderer.test.ts:34` (readings) and `:459` (a `createSessionDataStore` seed), `tests/session-data-store.test.ts:10` (seed) and `:22` (unknown). The three files whose only `tests/` change is a fixture report zero removed `assert` lines in the table above; the other two carry D8's listed edits. Conductor's ruling: name the files, and the tasks can cite the removed-assert count as the boundary.

### 4. The export pin (`tests/jefferson.test.ts`, design D8)

Rewritten as one `[path, expectedKeys]` table: 23 rows (the 20 blocks it replaces plus `branch.ts`, `session.ts`, `status.ts`), the name scan kept over every pinned module plus the store and the format language, and the stability block kept around two `instrumentNamed("nope")` calls.

**One addition the design does not name**: a coverage assertion, `assert.deepEqual(shippedFiles.filter((path) => !covered.includes(path)), [], "a shipped file the pin does not cover")`, where `shippedFiles` is every `.ts` under `extensions/` and `covered` is the rows plus the scanned-only pair (the store and `format.ts`). Without it a missing row is invisible — see "Where the run contradicts the design" note 1. It is green on the base tree too (22 files = 20 rows + 2 scanned), so it costs the pin nothing.

- Green: `✔ the exported surface offers no way to supply or replace cell content`, `ℹ tests 41 ℹ pass 41`.
- Red, a new file with no row (`branch.ts`'s row removed):
```
✖ the exported surface offers no way to supply or replace cell content
  AssertionError [ERR_ASSERTION]: a shipped file the pin does not cover
      at TestContext.<anonymous> (.../tests/jefferson.test.ts:447:10)
    actual: [ '../extensions/jefferson/components/instruments/branch.ts' ],
    expected: [],
```
- Red, an unexpected export (`export const branchKeys = ["branch"];` added to `branch.ts`):
```
✖ the exported surface offers no way to supply or replace cell content
  AssertionError [ERR_ASSERTION]: ../extensions/jefferson/components/instruments/branch.ts
      at TestContext.<anonymous> (.../tests/jefferson.test.ts:421:12)
    actual: [ 'branch', 'branchKeys' ],
    expected: [ 'branch' ],
```
- The store's and `format.ts`'s name-scan-only status is unchanged, and `instrumentNamed("nope")` still returns `undefined` twice without moving either surface.

### 5. Import boundaries (`checks/imports.mjs`)

Rules enforced, from the living `extension-source-layout` spec and Michael's `later_gates`: every relative specifier ends in `.ts` and resolves; no file imports the entry; `data/` imports nothing outside itself; a file in `components/instruments/` other than `instrument.ts`, `instrument-binding.ts` and `compact-count.ts` imports only `instrument.ts`, `compact-count.ts` or a type of `data/`; no cycle.

- Green at HEAD:

```
$ node checks/imports.mjs <spike>
files: 25
…
edges: 46
PASS
```
- Red, `branch.ts` importing `format.ts`:
```
edges: 47
INSTRUMENT IMPORTS extensions/jefferson/components/instruments/branch.ts imports extensions/jefferson/format.ts
IMPORTS FAIL
```
- Red, the data home importing a visual (`session-data-feed.ts` importing `../format.ts`):
```
edges: 47
DATA LEAK extensions/jefferson/data/session-data-feed.ts imports extensions/jefferson/format.ts
IMPORTS FAIL
```
- Red, a cycle (`branch.ts` importing `shipped.ts`):
```
INSTRUMENT IMPORTS extensions/jefferson/components/instruments/branch.ts imports extensions/jefferson/shipped.ts
CYCLE extensions/jefferson/shipped.ts -> extensions/jefferson/components/instruments/branch.ts -> extensions/jefferson/shipped.ts
IMPORTS FAIL
```
- The tree as built conforms: `branch.ts`, `session.ts`, `status.ts` import `instrument.ts` only; `path.ts` imports `instrument.ts` and `node:path`; `data/` imports no file outside `data/`.

### 6. Only the files a task names change (`checks/scope.sh`)

`scope.sh <repo> <base> <head> <allowed path>…` prints every changed path and fails on any path the task does not name. Green, per commit, with each task's own list:

- `fb3e532` (the forms): `format.ts`, `instrument.ts`, `path.ts`, `tests/format.test.ts`, `tests/instrument.test.ts` → `every changed path is one the task names / PASS`.
- `d933bfc` (branch): full output —
```
changed: extensions/jefferson/components/instruments/branch.ts
changed: extensions/jefferson/shipped.ts
changed: tests/configuration.test.ts
changed: tests/instrument.test.ts
every changed path is one the task names
PASS
```
- `8f5e562` (session), `69b89be` (status + pin): `PASS` with `session.ts` / `status.ts`, `shipped.ts`, the two test files and, for the status commit, `tests/jefferson.test.ts`.
- `ac1a0f8` (the attachment): `session-data-feed.ts`, `footer-setup.ts`, `startup.ts`, `tests/session-data-feed.test.ts`, `tests/jefferson.test.ts` → `PASS`.
- **The claim the instrument tasks must be able to make holds**: with `extensions/jefferson/components/instruments/<name>.ts`, `shipped.ts` and the two test files as the whole allowed list, no other instrument's file appears in any of the three.
- Red, a stray touch: a scratch commit adding a line to `path.ts` on top of the status commit, checked against the status task's list —
```
changed: extensions/jefferson/components/instruments/path.ts
…
NOT NAMED BY THE TASK: extensions/jefferson/components/instruments/path.ts
SCOPE FAIL
```
(reverted with `git reset --hard 668ddc2`; `git status` empty).
- Not green with a tight list, and it should not be: the **store** commit changes 8 paths — `data/session-data-store.ts`, `data/session-data-feed.ts` (the two seeds), and five test files (the fixtures in §3) — because the four new `Readings` fields reach every fixture. A task that says "the store only" will be red on `scope.sh` unless the list names those files.

### 7. Nothing reads the terminal and nothing shells out (`checks/terminal.sh`)

Scans `extensions/**/*.ts` for `child_process`, `execSync`, `execFileSync`, `execFile(`, `spawnSync`, `spawn(`, `process.stdout`, `process.stdin`, `/dev/tty` or `readline`.

- Green at HEAD:
```
no spawn and no terminal read under extensions/ (pattern: child_process|execSync|…)
PASS
```
- Red, a shell-out planted in `session-data-feed.ts`:
```
extensions/jefferson/data/session-data-feed.ts:2:import { execSync } from "node:child_process";
TERMINAL FAIL
```
- Red, a terminal read planted in `status.ts`:
```
extensions/jefferson/components/instruments/status.ts:13:  process.stdout.write("");
TERMINAL FAIL
```
- `os.homedir()` does not trip it, which is design D3's claim, measured.

### 8. The tarball (`checks/tarball.sh`)

- Green at HEAD:
```
source files under extensions/: 25 (tracked: 25) (expected: 25)
PASS
```
The three new files ship (`…/instruments/branch.ts`, `session.ts`, `status.ts`) and nothing else is added: the list is the 22 files before the change plus exactly those three. `pi.extensions` is still `["./extensions/jefferson.ts"]` and every shipped path is under the allowed roots.
- Red, an extra file lands in the package (`extensions/jefferson/notes.md`):
```
source files under extensions/: 26 (tracked: 25) (expected: 25)
NOT A SOURCE FILE extensions/jefferson/notes.md
SHIPPED BUT NOT TRACKED extensions/jefferson/notes.md
SOURCE COUNT 26 IS NOT 25
TARBALL FAIL
```
- Red, one new file left out (`files` gaining `"!extensions/jefferson/components/instruments/status.ts"`):
```
source files under extensions/: 24 (tracked: 25) (expected: 25)
TRACKED BUT NOT SHIPPED extensions/jefferson/components/instruments/status.ts
SOURCE COUNT 24 IS NOT 25
TARBALL FAIL
```

### 9. `openspec validate` and the paragraph ceiling (`checks/specs.sh`)

- Green at HEAD:
```
Change 'instruments-for-every-datum' is valid
.../specs/session-data-store/spec.md: longest paragraph 477 characters, none over 500
.../specs/statusline/spec.md: longest paragraph 467 characters, none over 500
PASS
```
- Red, a paragraph padded past 500 in a scratch copy (`checks/.scratch/specs/`, never `<changeDir>/specs`), the specs dir passed as the third argument:
```
.../specs/statusline/spec.md:187: 656 characters, over 500: The extension MUST implement a `branch` instrument declaring the varia...
.../specs/statusline/spec.md: longest paragraph 656 characters, 1 paragraphs over 500
```
exit 1. The scratch copy was removed; `git status` in the main checkout shows no change under `specs/`.
- The longest real paragraph is 477 characters, 23 short of the ceiling, so a task that adds a sentence to the session-data-store spec needs the count.

## Where the run contradicts the design

1. **D8's pin has no way to notice a missing row.** As written, the pin asserts the keys of the files it names; a new file that is simply absent from the table is invisible to `pnpm test`, so the brief's "red when a new file is missing from the table" cannot be produced. The living spec's "A new file joins the pin" scenario asks for coverage, so the pin gained one assertion over `readdirSync(<extensions>, { recursive: true })`. Green on the base tree and on this tree. Bambadjan: D8 should name the coverage assertion; a task should cite it.
2. **D8's list of expectations that must change is short by three tests.** D2's `session_info_changed` subscription forces the title, event list, both `[1, 1, 1]` counts and both `h.log` arrays in `tests/jefferson.test.ts` (base lines 432, 438-439, 529-530, 536, 571, 580) to change. Ruled by the conductor during this run: the edits stand and the list is amended. No other existing assertion moved.
3. **D8's list also omits the fixture literals**, in `tests/format.test.ts:14`, `tests/configuration.test.ts:22` and `:771`, `tests/instrument.test.ts:10` and `:18`, `tests/row-renderer.test.ts:34` and `:459`. Type-forced; no assertion changed (removed-assert count 0 in the three files whose only change is a fixture).
4. **A form's own `undefined` is unreachable behind the whole-declaration check.** `resolveFormat` returns `""` as soon as any declared variable's default resolver is unknown, so `absolute: readings => readings.cwd ?? ""` stays green in "an unknown working directory renders nothing in every form". Two guards, not a gap; a task should not claim that test distinguishes the form-level guard.
5. **D6's "resolve both paths before comparing" is redundant.** `path.relative` resolves its arguments itself: with `relative(home, cwd)` un-resolved, the trailing-separator test (`/Users/joelleibow/` home, `/Users/joelleibow/Projects` cwd) still passes, and the sibling-prefix test is saved by `relative`'s `..` result, not by `resolve`. The implementation keeps `resolve` because it copies pi's rule shape for shape, and the string-prefix alternative the design names does go red. A task that says "resolve, or the trailing separator breaks" is false; "relative, or a sibling prefix breaks" is the true one.
6. **"The feed reads `os.homedir()` once" is untested for the throwing case.** See "Not verified".
7. **Nothing else.** D1's three guards, D2's patterns and its `null`/`""` mapping, D3's empty-string guard, D4's form-in-position rule, D5's five rejections, D6's four boundary inputs, D7's TUI-only install, D8's pin shape and disposal rules, and the delta specs' scenarios all held as written. Line citations in D8 drifted as the change landed — the width-0 test's measured list is at `:341` at HEAD and the pin at `:393-455` — which is expected, not a contradiction.

## Questions

One, asked and answered during the run.

- **What may change outside D8's list?** The three subscription assertions cannot stay as written once D2's `session_info_changed` subscription lands. Conductor: *(a)* yes — edit the three, record them here with base file:line and old and new values, and the D8 amendment goes to Bambadjan and back through Michael with tasks; do not edit `design.md`. *(b)* the fixture literals are type-forced and change no assertion — name the five files and show the removed-assert count as the boundary. Both done above.
- No question is open.

## My calls

- **The store's new datum order**: `provider, model, thinkingLevel, cwd, home, branch, sessionName, statuses, contextUsage, totals` — the four new ones after `cwd`, so the six existing ones keep their relative order.
- **The store's setters**: `branchChanged(branch: string | null)` owns the `null → undefined` mapping and the change test, so the seed and every push go through one place; `sessionNamed(name)` and `readStatusesFrom(read)` likewise. The seed at the attach therefore requests one repaint (unknown → `main`) the moment the footer is built; nothing observed it, and it costs one `tui.requestRender()` inside `setFooter`.
- **`FooterDatumSource`**: the feed declares the three-method shape with pi's own method names (`getGitBranch`, `onBranchChange`, `getExtensionStatuses`) so `ReadonlyFooterDataProvider` is assignable to it; `installFooter` takes pi's type and passes it through. `tsc` proves the assignability rather than a cast.
- **The forms record**: `InstrumentDeclaration.variableForms?: Record<string, { defaultForm: string; byName: Record<string, VariableForm> }>`, with the variable's own resolver also named in `byName`. `variables` keeps its shape, so no other instrument's file changes. `path.ts`'s `base` resolver exists once and `variables.path` and `byName.base` reference it.
- **A form out of position keeps the existing rejection**: `"path"'s format names a modifier it does not implement: "|absolute"`. A separate message for a misplaced form would be new mechanism for a nicer sentence; D5 only requires reject-and-name.
- **`resolveFormat` gained a second map** (`formValues`, keyed `name|form`) and an `arrived` array, so a variable's foreground token still reads the pre-mutation value and now reads the form's value. `instrument-binding.ts` needed no change, per D4's "either is the same output".
- **`status.ts` owns the collapse** as a two-regex `sanitize`, pi's rule character for character (`[\r\n\t]` → space, ` +` → one, trim), then filters empty and joins. `format.ts`'s `collapse` is not imported, which the layout spec's instrument rule requires and `imports.mjs` enforces.
- **The pin's table is a `const pinned: Array<[string, string[]]>`** iterated once into a `Map`, with the stability block reading `shipped` and `store` out of that map; the entry's `default` export is still asserted by its row.
- **Commit granularity**: one commit per instrument (branch, session, status) rather than the design's "the commit that adds the three instrument files", so each instrument task's file scope is checkable; the pin rewrite rode in the status commit. The alignment test rode in the status commit and was corrected in a ninth commit.
- **`checks/` scripts take the repository as their first argument** and exit 2 without it; `suite.sh` takes the expected count second, `tarball.sh` the expected source count second, `specs.sh` an optional specs dir third, `scope.sh` the allowed paths after the range. Scratch space is `${checks}/.scratch.XXXXXX` via `mktemp -d`, removed on exit; nothing uses `/tmp`.

## Docs for Bambadjan

- **`design.md` D8 "Expectations that must change"**: add the six `tests/jefferson.test.ts` lines from §3 (base `:432`, `:438-439`, `:529-530`, `:536`, `:571`, `:580`) and the five fixture files. Do not edit D8's pin paragraph until the coverage assertion is ruled on: it should name `assert.deepEqual(shippedFiles.filter(…), [], "a shipped file the pin does not cover")` and the `readdirSync` over `extensions/`.
- **`design.md` D8 "The export pin is rewritten…"**: "the pin in `tests/jefferson.test.ts:315-400`" is `:392-459` at HEAD (table `:394-421`); "the name scan at `:385-392`" is `:433-440`; the "store and format scanned, no exact-key row" pair at `:379-380` is `:431-432`; "the stability block at `:394-399`" is `:452-458`.
- **`design.md` D8 "Expectations that must change"**: "the width-0 against width-200 list of six, `:235-264`, with the hardcoded non-fill list at `:255`" — the measured list is at `:335-341` at HEAD; `:255` is right at the base only.
- **`design.md` D6**: "resolve both the home directory and the working directory" is not what makes the trailing separator work (`path.relative` does); the sentence survives as a description of pi's code but not as the reason.
- **`design.md` D4** could carry one sentence for the rejection message a form out of position produces, since D5's scenarios say "names the instrument and the modifier" and the message says "modifier it does not implement".
- **`AGENTS.md` "Adding an instrument"** is unchanged by this change: a new instrument is still one file plus one `shipped.ts` entry, and the three new files follow it. No edit needed. If a convention for declaring `variableForms` is wanted, D4's one sentence is the source.
- **`ARCHITECTURE.md`** already needs the D9 pass (four new datums, the footer-data attachment, forms). The run adds one measured fact for it: the store's `sample()` now makes one statuses read per call, and `createFooter` calls it once per render, which is what makes two status cells share one text.
- **`README.md`** is untouched by the run; nothing measured here contradicts it.

## Not verified

- **The throwing `os.homedir()` branch of D3 cannot be reached from a test under `pnpm test`.** `node:test`'s `mock.module` is not present (`TypeError: mock.module is not a function` without `--experimental-test-module-mocks`, and the project's measured command is plain `node --test`), and patching the `node:os` default export does not affect a named import: `os.homedir = () => { throw … }` then `homedir()` prints `named binding NOT affected`. The empty-string half is tested (`HOME=""` → unknown, session still starts) and its guard goes red when removed; the `catch` itself has no test, and a task must not claim one.
- **A form looked up outside its declaring variable** has no distinguishing input in this tree (only `path` declares forms, and it declares one variable), so the plant for that rule stays green both ways. The rule is enforced (`declaration.variableForms?.[subject.name]`) and `$model|base` rejects, but the "own variable" half is not proven by a failing test.
- **No live observation in pi** (`/reload`, `/jefferson`, a real repository's branch, a real extension's statuses). That is Joel's, and it is the only end-to-end check that the host's `footerData` reaches the feed in the real TUI and that a `setCwd` switch reads the new directory.
- **`getSessionName()` was not observed live**: the research report (C A1 5) says the name is readable before the event fires, and the feed reads it at `session_start`; the test fakes it.
- **CI and the release workflow were not run**; the tarball was checked locally with `pnpm pack --dry-run --json` only.
- **`imports.mjs` reads each file's text**; it does not type-check the graph, and it treats `import type` and a value import alike.
- **The main checkout was not touched by me, but it is not clean**: `git -C /Users/joelleibow/Projects/pi-jefferson status` reported `M openspec/changes/instruments-for-every-datum/design.md` (3 lines: the two AGENTS.md line citations and `:233-261`→`:235-264` in D8) when I first looked, and it still does. That is someone else's uncommitted amendment, not mine; I read the design from the working tree and left the file alone.

## Tree as I left it

```
$ git status --porcelain --untracked-files=all
(empty)
$ git log --oneline -1
5451cea Read the statuses once per render, and prove two cells share the text
$ git branch --show-current
instruments-for-every-datum-spike
```
Checks green at HEAD: `suite: 355 passed, 0 failed (expected 355) PASS`; `imports: edges 46 PASS`; `terminal PASS`; `tarball: 25 (tracked: 25) PASS`; `specs: longest 477 / 467, none over 500 PASS`; `scope PASS` for each of the five commits measured.

## Addendum — five more reds (for the tasks gate)

Five further plants, run after Michael's tasks gate, on the same worktree at `5451cea` with the same rules: plant one line, run the named test, transcribe the failure, `git checkout --` the file, run the green. The tree was clean `--untracked-files=all` before and after each, and `pnpm typecheck` plus `node --test` are green at `5451cea` afterwards: `ℹ tests 355 / ℹ pass 355 / ℹ fail 0`, `tsc` clean.

**A measured trap in the command, worth carrying into `tasks.md`.** The flag has to come *before* the file. `node --test --test-name-pattern='…' tests/x.test.ts` runs the one test; `node --test tests/x.test.ts --test-name-pattern='…'` (the order the brief writes) ignores the pattern and runs the whole file — measured: 12 tests, 11 pass, 1 fail, and every other test in the file scrolls past the reader. The transcripts below use the flag first.

### 1. `tests/session-data-feed.test.ts:94` — no footer data reads unknown

The brief offered two plants. **The statuses one cannot fail**, and that is worth knowing: the store's empty-set rule absorbs it.

- Plant: the statuses reader defaulted to an empty map, `let readStatuses: (() => ReadonlyMap<string, string>) | undefined = () => new Map();`

```
$ node --test --test-name-pattern="no footer data means" tests/session-data-feed.test.ts
✔ no footer data means the branch and the statuses read unknown (0.452291ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
```

- **Green with the mistake in place**, because `sample()` maps a map with nothing in it to unknown, exactly as it maps no reader at all. A task must not rely on this plant; it must plant the branch.

- Plant that does fail: the branch's initial value is an empty string instead of unknown, `let branch: Reading;` → `let branch: Reading = "";`

```
$ node --test --test-name-pattern="no footer data means" tests/session-data-feed.test.ts
✖ no footer data means the branch and the statuses read unknown (0.710125ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 53.655959

✖ failing tests:

test at tests/session-data-feed.test.ts:94:1
✖ no footer data means the branch and the statuses read unknown (0.710125ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  '' !== undefined

      at TestContext.<anonymous> (file:///…/spike/tests/session-data-feed.test.ts:97:10)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.start (node:internal/test_runner/test:1262:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:387:17) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: '',
    expected: undefined,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

- Green after revert:

```
✔ no footer data means the branch and the statuses read unknown (0.449541ms)
ℹ tests 1
```

### 2. Post-dispose silence — `tests/session-data-store.test.ts`, pattern `after disposal`

The pattern names two tests: `a push after disposal requests no repaint` and `a branch push, a name push and a status reader after disposal leave the store untouched`. **Two separate guards are load-bearing**, and each plant is caught by the second test.

- Plant A, the sample's disposed guard removed (the whole `if (readUsage === undefined || readEntries === undefined)` early return):

```
$ node --test --test-name-pattern="after disposal" tests/session-data-store.test.ts
✔ a push after disposal requests no repaint (0.482167ms)
✖ a branch push, a name push and a status reader after disposal leave the store untouched (0.124083ms)
ℹ tests 2
ℹ suites 0
ℹ pass 1
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0

✖ failing tests:

test at tests/session-data-store.test.ts:375:1
✖ a branch push, a name push and a status reader after disposal leave the store untouched (0.124083ms)
  TypeError: readUsage is not a function
      at Object.sample (file:///…/spike/extensions/jefferson/data/session-data-store.ts:82:51)
      at TestContext.<anonymous> (file:///…/spike/tests/session-data-store.test.ts:383:22)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:974:18)
      at Test.postRun (node:internal/test_runner/test:1542:19)
```

- Plant B, the setter's own guard removed from `branchChanged` (`if (requestRender === undefined) return;`):

```
✖ a branch push, a name push and a status reader after disposal leave the store untouched (0.09525ms)
  TypeError: requestRender is not a function
      at Object.branchChanged (file:///…/spike/extensions/jefferson/data/session-data-store.ts:118:20)
      at TestContext.<anonymous> (file:///…/spike/tests/session-data-store.test.ts:380:9)
```

- Green after each revert:

```
✔ a push after disposal requests no repaint (0.44275ms)
✔ a branch push, a name push and a status reader after disposal leave the store untouched (0.08325ms)
```

- The red is a thrown `TypeError`, not an assertion: the disposed store calls a reader the host has already invalidated, which is the data loss this guard exists to prevent. A task should say "no reader is called after disposal" rather than "the test asserts", because what the suite reports is the throw.

### 3. The form on its own variable's segment — `tests/format.test.ts:355`, pattern `a form is recorded on the variable`

- Plant: the form recorded on the modifier chain instead of the segment's `form` field, `{ ...subject, form: name }` → `{ ...subject, modifiers: [...subject.modifiers, { style: "dim" }] }`.

```
$ node --test --test-name-pattern="a form is recorded on the variable" tests/format.test.ts
✖ a form is recorded on the variable's segment, apart from the modifier chain (1.1655ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 91.325583

✖ failing tests:

test at tests/format.test.ts:355:1
✖ a form is recorded on the variable's segment, apart from the modifier chain (1.1655ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected

    [
      {
  -     form: 'relative',
        kind: 'variable',
  +     modifiers: [
  +       {
  +         style: 'dim'
  +       }
  +     ],
  -     modifiers: [],
        name: 'path'
      }
    ]

      at TestContext.<anonymous> (file:///…/spike/tests/format.test.ts:356:10)
    actual: [ { kind: 'variable', name: 'path', modifiers: [Array] } ],
    expected: [ { kind: 'variable', name: 'path', form: 'relative', modifiers: [] } ],
    operator: 'deepStrictEqual',
```

- Green after revert: `✔ a form is recorded on the variable's segment, apart from the modifier chain (0.754458ms)`.

- The plant goes red on the assertion, so the not-yet-built red is not needed; it is measured anyway, for a task that would rather cite it, on the base tree `c5ff75e` before `fb3e532`:

```
$ git checkout c5ff75e && node .base-red.mjs
$path: accepted
$path|base: "path"'s format names a modifier it does not implement: "|base"
```

  The base tree rejects `$path|base` as an unknown modifier and accepts the bare `$path`; the plant above is the sharper red, because it catches a form recorded in the wrong place rather than a form not recorded at all.

### 4. `path`'s base form is the basename — `tests/instrument.test.ts:191`, pattern `base form is the basename`

- Plant: `byName.base` pointed at the absolute resolver while `variables.path` keeps the basename, `byName: { base, … }` → `byName: { base: readings => readings.cwd, … }`.

```
$ node --test --test-name-pattern="base form is the basename" tests/instrument.test.ts
✖ path's base form is the basename a bare $path renders (4.33875ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0

✖ failing tests:

test at tests/instrument.test.ts:191:1
✖ path's base form is the basename a bare $path renders (4.33875ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected

  + '/Users/joelleibow/Projects/pi-jefferson'
  - 'pi-jefferson'

      at TestContext.<anonymous> (file:///…/spike/tests/instrument.test.ts:193:10)
    actual: '/Users/joelleibow/Projects/pi-jefferson',
    expected: 'pi-jefferson',
    operator: 'strictEqual',
```

- Green after revert: `✔ path's base form is the basename a bare $path renders (4.001916ms)`.

- Worth carrying into the task: this test is the one that holds `$path|base` and the bare `$path` to the *same* text, and it is the only test that separates `variables.path` from `byName.base`. A task that writes only "the base form renders the basename" will not catch the two drifting apart.

### 5. The status resolver reads only the statuses — `tests/instrument.test.ts:261`, pattern `status reads only the statuses`

- Plant: the variable made to read `branch`, one line, `variables: { status: statusText }` → `variables: { status: readings => readings.branch }`.

```
$ node --test --test-name-pattern="status reads only the statuses" tests/instrument.test.ts
✖ status reads only the statuses (3.580916ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0

✖ failing tests:

test at tests/instrument.test.ts:261:1
✖ status reads only the statuses (3.580916ms)
  Error: the instrument read branch, a datum it does not display
      at Object.get [as branch] (file:///…/spike/tests/instrument.test.ts:30:30)
      at status (file:///…/spike/extensions/jefferson/components/instruments/status.ts:26:45)
      at resolveFormat (file:///…/spike/extensions/jefferson/format.ts:192:19)
      at render (file:///…/spike/tests/instrument.test.ts:64:10)
      at async TestContext.<anonymous> (file:///…/spike/tests/instrument.test.ts:262:16)
```

- Green after revert: `✔ status reads only the statuses (3.705625ms)`.

### Tree as this addendum leaves it

```
$ git status --porcelain --untracked-files=all
(empty)
$ git log --oneline -1
5451cea Read the statuses once per render, and prove two cells share the text
```
`pnpm typecheck` clean; `node --test` `ℹ tests 355 / ℹ pass 355 / ℹ fail 0`.
