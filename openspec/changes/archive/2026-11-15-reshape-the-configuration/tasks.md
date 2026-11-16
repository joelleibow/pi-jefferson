# Tasks

## File Boundary

Repository-relative paths, verified against the working tree at `24ee86b`. The code boundary is the
one `redgreen-derek.md` measured: 8 files, and no file is created or deleted. The Markdown rows are
listed for completeness only: they are the docs pass's, and no box in this file covers them.

| Path | Action | What changes and why |
|---|---|---|
| `extensions/jefferson/configuration.ts` | Modify | The retired-key constant and guard, the row/entry reader, the message table, `Notices` as data, and the deletion of `isDistribution`, the `containers` notice and the `cells`/`id`/`distribution` handling (decisions 1, 2, 4, 5, 6, 7). The doc comment on `Configuration.warning` drops "or a `containers` key" (`:64-67`). |
| `extensions/jefferson/components/row/row.ts` | Modify | `Row` loses `id`; `distribution` stays (decision 3). |
| `tests/configuration.test.ts` | Modify | The new-shape parsing and message tests; the deletions, splits and rewrites decision 10 lists. |
| `tests/jefferson.test.ts` | Modify | End-to-end documents in the new shape; six tests lose `distribution`, and the alignment test and the equal-shares test change as decision 10 says. |
| `tests/instrument.test.ts` | Modify | Its one JSON document (`:312`) takes the new shape; its expectations stay the worked values in decision 10. |
| `tests/row-renderer.test.ts` | Modify | 24 `id:` lines come out of the hand-built rows; no assertion changes. |
| `tests/format.test.ts` | Modify | The mapper at `:179` drops `id:`. |
| `tests/session-data-feed.test.ts` | Modify | The literal at `:303` drops `id:`. |
| `README.md` | Modify | Docs pass, not a task here. Cut to what a README is for, with one working configuration and a `## Documentation` index (decision 11). |
| `docs/configuration.md` | Create | Docs pass, not a task here. The configuration document: location and trust, `rows`, entries, `align`, `rowGap`, the `instruments` block, rejection, and the upgrade from 0.12.0. |
| `docs/instruments.md` | Create | Docs pass, not a task here. Each shipped instrument's name, variables, options and defaults. |
| `docs/formats.md` | Create | Docs pass, not a task here. Format strings, variables, forms, modifiers, styles, `$bar`, composed formats, escaping. |
| `docs/notices.md` | Create | Docs pass, not a task here. The notice kinds, their formats and their visible seconds. |
| `docs/releasing.md` | Create | Docs pass, not a task here. The three labels, the patch default, and the workstation that cannot publish. |
| `docs/adr/0015-cell-is-no-longer-a-word-users-see.md` | Create | Docs pass, not a task here. Why "cell" left the words users read and stayed in the code. |
| `docs/adr/0016-the-equal-distribution-stays-in-the-code.md` | Create | Docs pass, not a task here. Why the equal branch survives with no way in. |
| `AGENTS.md` | Modify | Docs pass, not a task here. The vocabulary line gains its qualifier. |
| `ARCHITECTURE.md` | Modify | Docs pass, not a task here. The document's shape, the rows the parser produces, and that a distribution is no longer configuration input. |
| `docs/adr/0007-a-cell-takes-the-width-its-content-needs.md` | Modify | Docs pass, not a task here. The `Status:` line only; the body is not edited (decision 12). |
| `openspec/specs/statusline/spec.md` | Modify | Docs pass, not a task here. The `## Purpose` only, which still says "evenly divided cells" (council ruling 10). |

Deleted: no file. The tests this change deletes are cases inside the files above, listed in tasks 1.13
and 1.14.

## Conventions for every task

- **The checkout.** Run every command in this change's own checkout,
  `/Users/joelleibow/Projects/pi-jefferson`. A task's check is green only when `pnpm test` and
  `pnpm typecheck` both pass there.
- **A worktree that shares `node_modules`.** If you work in a git worktree whose `node_modules` is a
  symlink to another checkout, never run `pnpm` in it: `pnpm` 12 relinks packages through the shared
  directory and can damage the other checkout. Run `node --test` and
  `./node_modules/.bin/tsc --noEmit` instead. They are the same two checks by hand.
- **Red first.** Each of tasks 1.1–1.5 adds tests that must fail before any production code changes.
  If a new test passes there, it is not proving the change: fix the test, not the code.
- **One atomic migration.** Tasks 1.1–1.15 are one group for a reason: with no reader for the 0.12.0
  shape, the suite is red from task 1.1 until task 1.15. Write the tests, land the parser, migrate
  every fixture, then run the whole suite. Nothing ships between 1.1 and 1.15, so `main` is never
  red (`design.md`, decision 10; `redgreen-derek.md` § F). Because the suite stays red, tasks 1.7 to
  1.12 name the tests each one turns green and run them through a name filter; each pattern selects
  exactly the tests its task names. The rest of the suite stays red until 1.14.
- **Boundary behaviour, and the log fields.** The parser's boundary is
  `readConfiguration(source: ConfigurationSource)`, with `source` = `{ agentPath, projectPath,
  projectTrusted, theme }` (`configuration.ts:48-53`, `:365`), returning `Configuration`
  `{ rows, rowGap, noticeSeconds, warning }`. This change alters neither the signature nor the shape.
  Its decision is accept-or-reject for the whole document; its outcome is either rows or the default
  row plus one warning string, built as
  `pi-jefferson: <path> was rejected (<part>); rendering the default row` for a rejection and
  `pi-jefferson: <path> <part>[; <part>…]` for an accepted document with notices
  (`configuration.ts:348, 398`). No new log fields, because the extension writes no log; the warning
  reaches the user through `startup.ts`'s single `notify`, which does not change (decision 4).
- **Not tasks.** The `release:minor` label is applied by the conductor when the PR opens
  (decision 13). The docs pass is owned by `design.md` — decision 11's mapping table, decision 12 and
  `Migration Plan` steps 7–8 — and by the conductor's docs-pass brief. It runs after the
  implementation gate and before Validate, and no box in `tasks.md` covers it.

## 1. The document's shape: red tests, then the parser

One group, ending green. Every test here proves a scenario in `specs/statusline/spec.md`; the check
labels (`A1`, `B8`, …) are `redgreen-derek.md`'s, where each went red and green.

- [x] 1.1 **Add the retired-key and row-shape tests, red, and replace the two precedence pins.**
  In `tests/configuration.test.ts`: `a rows list of entry lists yields one row per member, in order`
  (A1); `a retired top-level key rejects alone, beside an empty rows list, and with another retired
  key` (A2 — `{"distribution": "equal"}`, `{"id": "footer"}`, `{"cells": […]}` alone,
  `{"cells": […], "rows": []}`, and two retired keys at once); `a row written as an object is
  rejected with the whole rows form, at either mistake` (A7 — `{"rows": [{"cells": […]}]}` and
  `{"rows": [{"instrument": "model"}]}`), plus three documents whose member of `rows` is neither a
  list nor an object, each through `rejected`: `{"rows": ["model"]}` and `{"rows": [4]}`, each
  expecting `row 1: is not a list; a row is a list of entries, as {"rows": [[{"instrument":
  "model"}]]}`, and `{"rows": [[{"instrument": "model"}], null]}`, expecting the same part placed
  `row 2:`; and the four pins A3–A6, which pass today and must keep passing — A3 `rows given as
  something other than a list is rejected naming rows`, A4 `an empty rows list is accepted with no
  warning, alone and beside settings`, A5 `a document with no rows and no retired key renders the
  default row`, and A6 `the configuration document must be an object`. In the precedence test `error precedence
  reads the envelope and the rowGap before instruments and instruments before cells`
  (`:1082-1088`), replace `:1083` and `:1084` with the two assertions that pin ruling 2's guard
  position, written through the file's `rejected` helper (`:974-981`) with `RETIRED` being decision
  5's part, `a row at the top level is retired; declare rows as {"rows": [[{"instrument":
  "model"}]]} and drop any top-level id or distribution`:
  `rejected({ cells: [{ instrument: "model" }], rows: 42, rowGap: 1.5, instruments: 42 }, RETIRED)`
  and `rejected({ id: "footer", rows: [[]] }, RETIRED)`. Leave `:1085` and `:1087` for task 1.14.
  **Proves:** the scenarios "Rows in a list", "A row of three entries", "A row written as an object",
  "A lone `distribution`", "A lone `id`", "A lone `cells`", "A top-level `cells` beside `rows`",
  "One message for every retired key", "rows is not a list", "An empty rows list" and "No rows
  declared".
  **Boundary cases:** absent, empty, non-list, a member of `rows` that is a string, a number or
  `null`, a retired key alone, a retired key beside `rows`, two retired keys at once, and a retired
  key beside a fault the guard must answer before.
  **Verify:** `pnpm test` — A1, A2 and A7 fail with the messages in `redgreen-derek.md` § A, the four
  pins A3–A6 pass, and the precedence test fails at its first new assertion with `the configuration
  carries both a top-level row and a rows list`; `pnpm typecheck` stays clean, since these tests add
  no `Row` literal.

- [x] 1.2 **Add the entry and placement tests, red.** In `tests/configuration.test.ts`:
  `an empty row is rejected and placed by its row alone` (B8, a later row so the number is 1-based);
  `an entry that is not an object is rejected and named by row and instrument` (B9 — `"model"`, `4`,
  `["model"]`, `null`); `an entry with an unrecognised key is rejected naming the key` (B10 —
  `distribution`, `width`, `aling`); `an entry with no instrument is rejected in Joel's words, placed
  by position` (B11, second entry); `an instrument that is not a non-empty string is rejected` (B12 —
  `4`, `""`); `an align outside the three is rejected naming the value` (B13 — `"middle"`,
  `"Center"`, `4`); `a row above the ceiling renders ten cells and is accepted` (B14, 12 entries);
  `an entry past the ceiling is still validated and placed by its position` (B15, `row 2, instrument
  12:`); `an unknown name past the ceiling still warns` (B16).
  **Proves:** the scenarios "An empty row", "An entry that is not an object", "An entry with a key the
  extension does not recognise", "An entry that carries no instrument", "An instrument that is not a
  name", "A row above the ceiling", "Entries past the ceiling are still validated", "The first row and
  its first entry", "A later row and a later entry", "An entry past the tenth" and "A row with no one
  entry to blame".
  **Boundary cases:** empty row, malformed entry of every JSON type, missing key, empty string, entry
  past the ceiling, non-string `align`. **A non-string `align` is shown by `JSON.stringify`, unquoted
  — `align is not "left", "right" or "center": 4` — as 0.12.0 does.** Do not add quotes around the
  number.
  **Verify:** `pnpm test` — each of B8–B16 fails with `row 0 is not an object` today, because a row
  list is not an object (`redgreen-derek.md` § B); `pnpm typecheck` stays clean.

- [x] 1.3 **Add the unknown-name tests, red, including the in-row order and the block order.** In
  `tests/configuration.test.ts`: `an unknown name warns by its row, and its cell renders blank` (C17,
  `row 3: "taiknr.savings" is not a known instrument`); `one unknown name in two rows is reported
  once for each row, in row order` (C18); `one unknown name twice in one row is reported once`
  (C19); `a name only the instruments block configures is reported by the block, with no row` (C20,
  `the instruments block names instruments the extension does not implement: "nope"`); `the
  instruments block names every unknown it configures, in key order` (C21, `"other", "nope"`);
  `a name a row and the block both name is reported by each, the row's part first` (C22); `every
  placed part joins in row order, then the block's one part` (C23); and **`two unknown names in one
  row follow the position of each name's first entry`** — a row of `[{"instrument": "bb"},
  {"instrument": "aa"}]` warns `row 1: "bb" is not a known instrument; row 1: "aa" is not a known
  instrument`, in that order (`design.md`, decision 6). That last test fails today with `row 0 is not
  an object`, like C17–C23, because a list member of `rows` is not a row object to 0.12.0.
  **Proves:** the scenarios "An instrument the extension does not implement", "One unknown name in
  two rows", "One unknown name twice in one row", "A name the extension does not implement",
  "A name the block and a row both name", and decision 6's in-row ordering rule.
  **Boundary cases:** one name in two rows, one name twice in one row, one name in both places, two
  distinct names in one row, several distinct names in the block, and one part per place.
  **Verify:** `pnpm test` — C17–C23 and the in-row order test fail with the pre-change strings quoted
  in `redgreen-derek.md` § C; `pnpm typecheck` stays clean.

- [x] 1.4 **Add the removal tests, red where the behaviour changes.** In
  `tests/configuration.test.ts`: `a row carries a distribution and no id, and the parser writes
  content` (D24, `Object.keys(row).sort()` is exactly `["cells", "distribution"]`); `a top-level
  containers key is an ordinary unknown key and is ignored in silence` (D25 — its document is
  `{"containers": 3, "rows": []}`, and it asserts `warning === undefined` and the default row of ten
  cells); `every row the parser writes is sized by content` (D26 — for the declared document it
  asserts `warning === undefined`, that `rows.length` is the declared row count, and that every
  row's `distribution` is `"content"`, and it repeats the distribution assertion for the absent
  file and a rejection's default row); and D27, which is covered by 1.2's key test at entry level and
  1.1's retired-key test at document level rather than by a test of its own. D25 carries `rows` on
  purpose: the `rows` key is what reaches the document-level trigger (`configuration.ts:296`), and a
  bare `{"containers": 3}` is silent from task 1.7 on, so it could not show that the trigger is gone.
  **Proves:** the scenarios "Cell text is the instrument its entry names" (its no-third-party-API
  half is the export pin in group 2) and decision 3's row shape, decision 7's silence, and decision
  8's content-only parser.
  **Boundary cases:** a declared document, an absent file, a rejection's default row; a top-level
  `containers`; an entry-level `distribution`; a row object's key set.
  **Verify:** `pnpm test` — D24 fails today with an extra `id`, D25 with the containers notice, and
  D26 fails on `warning`, because a new-shape document is rejected today; `pnpm typecheck` stays
  clean.

- [x] 1.5 **Add the end-to-end tests, red.** In `tests/jefferson.test.ts`:
  `a rows list of entry lists renders one line per row, with the gap between them` (E29 — the model
  row, the thinking row and one bare `""` gap line, with `session.notified` empty);
  `a 0.12.0 document is rejected end to end, in one toast that shows the rows form` (E30 — exactly
  one `warning` toast carrying the path, the retired-key part and the default row).
  **Proves:** the scenarios "Rows in a list" and "A lone `cells`" through the real harness, and the
  footer's gap behaviour, unchanged.
  **Boundary cases:** a document with two rows and a `rowGap`; a document the change rejects.
  **Verify:** `pnpm test` — E29 fails with a rejection toast and E30 with `[]`, as
  `redgreen-derek.md` § E records; `pnpm typecheck` stays clean.

- [x] 1.6 **Record the red run before touching production code.** Run the whole suite and keep the
  output, so the migration's red is on the record rather than asserted.
  **Proves:** the red run the plan's own test list produces.
  **Boundary cases:** none.
  **Verify:** `pnpm test` — every test that tasks 1.1–1.5 add fails, except the four pins A3–A6,
  which pass; the precedence test fails at its first new assertion; no other test fails.
  `pnpm typecheck` is clean, since `Row` still has `id`.

- [x] 1.7 **Replace the envelope with the retired-key guard.** One private constant holding the shown
  form `{"rows": [[{"instrument": "model"}]]}`, one holding `cells`, `id` and `distribution`, and one
  guard that rejects the document when any retired key sits at the top level — placed immediately
  after the document-is-an-object check and before the `rows` type check, `rowGap`, `instruments` and
  the rows. The retired-key part interpolates the one form constant, and so does the
  row-is-not-a-list part (`row N: is not a list; …`); the `rows`-level message `the rows value is not
  a list` carries no shown form, because it is not about a row. The constant is not exported. The
  guard makes the both-shapes check (`configuration.ts:286-290`) unreachable, so delete it. Read a
  document with no `rows` as no rows: `rawRows = []` in place of the shortcut `rawRows = [doc]`
  (`:298-300`), so `defaultRow` renders.
  **Proves:** task 1.1's retired-key tests, the precedence test's two new assertions, the scenarios
  "No rows declared" and "An empty rows list", and `design.md` decisions 1 and 5.
  **Boundary cases:** a retired key alone, beside an empty `rows`, beside a full `rows`, two at once,
  and beside a `rows`, `rowGap` or `instruments` fault the guard must answer before.
  **Verify:** `pnpm test` with
  `node --test --test-name-pattern="retired|error precedence|0.12.0|other than a list|empty rows list is accepted|must be an object" tests/configuration.test.ts tests/jefferson.test.ts`
  — A2–A6, the precedence test and E30 pass. A1 and A7 stay red until 1.8 and 1.9, and every
  document still written in the old shape stays red until 1.14. `pnpm typecheck` clean. Two more
  results, because the shortcut's removal takes the row-level `containers` trigger with it:
  `an empty object yields one row of ten with no warning` (`tests/configuration.test.ts:92`) and
  `the instruments section alone configures the default row` (`:557`) pass, while
  `a document carrying containers is accepted and renders ten blank cells` (deleted in 1.14) and
  `containers and multiple unknown section names retain the accepted-notice order` (rewritten in
  1.11) go red here, because both depended on that trigger. **Then show the pins catching a
  misplaced guard:** move the guard to just before
  `normalizeDocument`'s return, after the rows are read, and run
  `node --test --test-name-pattern="error precedence" tests/configuration.test.ts`. The test goes red
  at the first new assertion with `the rows value is not a list`. Delete that assertion for a moment
  and run again: the second goes red too, with `row 0 is not an object`. Restore both, and restore the
  guard's place, and it passes. Moving the guard only past `readInstruments` leaves the second
  assertion green, which is why the check uses the late position.

- [x] 1.8 **Replace the row-object reader with the list reader.** A row is a list; its first ten
  entries are its cells; every entry is validated, including those past the tenth; an empty row is
  rejected; an entry is an object whose `instrument` is a non-empty string and which may carry
  `align`, and an unrecognised key is named. The row-level `cells`, `id`, `distribution` and
  `containers` reads and their messages go with the old reader (`configuration.ts:230-257`). Every
  row still carries the synthesized identifier `id` set to `row-${index}`, an internal 0-based value
  that is never printed, and the duplicate-identifier check stays with it: both survive until task
  1.12, so `pnpm typecheck` is clean here. The parser writes `DISTRIBUTIONS[0]` for every row.
  **Proves:** `design.md` decisions 2 and 3, and the scenarios decision 2 states.
  **Boundary cases:** empty list, 12 entries, an entry past the tenth that is malformed, an entry
  that is not an object, a missing `instrument`, an empty string, an unknown key.
  **Verify:** `pnpm test` with
  `node --test --test-name-pattern="rows list of entry lists|above the ceiling|sized by content|one line per row" tests/configuration.test.ts tests/jefferson.test.ts`
  — A1, B14, D26 and E29 pass. B8–B13, B15, B16 and C17–C23 stay red until 1.9 and 1.10, and the
  old-shape documents stay red until 1.14. `pnpm typecheck` clean.

- [x] 1.9 **Build the message table, with one placement rule.** Every whole-row part begins `row N:`
  and every entry part begins `row N, instrument M:`, both counting from 1; the align part renders a
  non-string value with `JSON.stringify`, unquoted; no part contains "cell". Delete the parts
  `design.md` decision 5 lists.
  **Proves:** `design.md` decision 5's table and the scenarios "A row written as an object", "An
  empty row", "An entry that is not an object", "An entry with a key the extension does not
  recognise", "An entry that carries no instrument", "An instrument that is not a name", "Entries
  past the ceiling are still validated", "The first row and its first entry", "A later row and a
  later entry", "An entry past the tenth" and "A row with no one entry to blame", whose not-a-list
  placement at a later row the three new documents in task 1.1 pin.
  **Boundary cases:** the first row and its first entry, a later row and a later entry, an entry past
  the tenth, a whole-row fault, and a non-string `align`.
  **Verify:** `pnpm test` with
  `node --test --test-name-pattern="written as an object|empty row is rejected|not an object is rejected and named|unrecognised key is rejected|no instrument is rejected|non-empty string is rejected|align outside the three is rejected|ceiling is still validated" tests/configuration.test.ts`
  — A7, B8–B13 and B15 pass. B16 and C17–C23 stay red until 1.10, and the old-shape documents stay
  red until 1.14. `pnpm typecheck` clean.

- [x] 1.10 **Hold the unknown names as data and join them once.** `Notices` carries `(row, name)`
  pairs in row order and the block's unknown names in key order; the parts join with `"; "` after
  `pi-jefferson: <path> `, rows first and the single block part last; `Configuration.warning` stays
  `string | undefined`; `startup.ts` keeps one `notify`. The block list is fed from inside
  `readInstruments`: the one line that records an unknown name (`configuration.ts:106`) writes to it
  instead of the shared `Set`, and nothing else in `readInstruments` moves.
  **Proves:** task 1.3's tests and `design.md` decisions 4 and 6.
  **Boundary cases:** one name in two rows, one name twice in one row, two distinct names in one row,
  a block-only name, a name in both places, and several block names.
  **Verify:** `pnpm test` with
  `node --test --test-name-pattern="unknown name|instruments block|both name|placed part" tests/configuration.test.ts`
  — B16, C17–C23 and the in-row order test pass. Every document still written in the old shape stays
  red until 1.14. `pnpm typecheck` clean. **Then show the order assertion catching a wrong order:**
  temporarily report a row's distinct unknown names in sorted order, and the in-row order test goes
  red at its order assertion, because `"aa"` now comes before `"bb"`. Restore the order and it
  passes.

- [x] 1.11 **Delete what is left, and rewrite the block-order test.** `isDistribution`, whose last
  caller went with task 1.8's reader; the `containers` notice — its document-level trigger (`:296`),
  the `Notices.containers` flag and its part in `acceptedWarning`; and the phrase "or a `containers`
  key" from the `Configuration.warning` doc comment (`:64-67`). Nothing here claims the `cells`, `id`
  or `distribution` handling: that went with 1.8's reader, and the synthesized `id` waits for 1.12.
  Rewrite `containers and multiple unknown section names retain the accepted-notice order`
  (`tests/configuration.test.ts:968`) so its document is `{"instruments": {"nope": {}, "other":
  {}}}`, with no `containers`, and it asserts decision 6's block form with both names quoted in key
  order, and the default row's ten cells. Retitle it `several unknown names in the instruments block
  keep their key order, beside the default row`.
  **Proves:** task 1.4's tests, the block-order half of decision 6, and `design.md` decisions 7 and 8.
  **Boundary cases:** a top-level `containers` (silent), several unknown names in the block, and the
  doc comment's shape.
  **Verify:** `pnpm test` with
  `node --test --test-name-pattern="ordinary unknown key|keep their key order" tests/configuration.test.ts`
  — D25 passes and the rewritten test passes. D25 stays red, with the containers notice, until the
  `:296` trigger is deleted here. The old-shape documents stay red until 1.14. `pnpm typecheck` clean.

- [x] 1.12 **Remove `Row.id`.** Drop the field from `Row`, along with `defaultRow`'s and
  `normalizeRow`'s handling of it and the duplicate-identifier check. Nothing under
  `components/row/` gains knowledge of the document, and `Row.distribution` stays.
  **Proves:** `design.md` decision 3 and council ruling 7; the check is the compiler for the fixtures
  and the key-set assertion for the row.
  **Boundary cases:** the default row and a parsed row both carry exactly `cells` and `distribution`,
  which D24 asserts.
  **Verify:** `pnpm test` with
  `node --test --test-name-pattern="distribution and no id" tests/configuration.test.ts` — D24
  passes. `pnpm typecheck` reports exactly the 28 errors `redgreen-derek.md` § F records: 4 `.id`
  reads in `tests/configuration.test.ts` (the id tests task 1.13 deletes), 23 literals in
  `tests/row-renderer.test.ts`, and 1 in `tests/session-data-feed.test.ts`. The rest of `pnpm test`
  stays red in the old-shape documents and wherever a fixture still builds an `id`.

- [x] 1.13 **Strip `id:` from every hand-built row, delete the four id tests, and prove it.** The
  compiler forces the 28 errors task 1.12 records: the 4 `.id` reads in the four id tests at
  `tests/configuration.test.ts:360-391`, which this task deletes — `an unnamed row gets a synthesized
  deterministic id`, `an explicit id is kept`, `two explicit duplicate ids are rejected`, and `an
  explicit id colliding with a synthesized id is rejected` — the 23 literals in
  `tests/row-renderer.test.ts`, and the 1 in `tests/session-data-feed.test.ts`. It does **not** force
  a leftover `id:` inside a `.map` callback, so edit these two by hand: `tests/format.test.ts:179`'s
  mapper and `tests/row-renderer.test.ts:462`'s mapper. The file this plan measures for
  `tests/row-renderer.test.ts` is **24** `id:` lines.
  **Proves:** `design.md`'s file table, council ruling 7, and Derek's gap 1: typecheck alone leaves a
  leftover `id:` in a mapper clean.
  **Boundary cases:** a literal in a `.map` callback, a literal at the top level of a `Row` value, and
  a `.id` read inside a deleted test.
  **Verify:** `pnpm typecheck` is clean; `rg -n 'id: [`"]row-' tests/` prints nothing (it prints 27
  lines today: the 26 `Row` literals and one inside an id test); `pnpm test` stays red only in
  documents not yet migrated.

- [x] 1.14 **Apply every remaining test disposition.** Delete every test in `redgreen-derek.md`'s
  deletion table except the four id tests, which task 1.13 deletes. That includes `both shapes at
  once is rejected` (`tests/configuration.test.ts:71`), whose subject A2's multi-key document now
  owns. Beyond the table, also delete four tests whose subject a new test now owns: `a cell object
  with no instrument rejects` (`:158`, B11), `a document naming cells and no containers warns nothing
  extra` (`:292`, decision 7 and A1), `two unimplemented instruments in different rows share one
  warning` (`:309`, C23), and `an empty cells array is rejected` (`:326`, B8).

  Nine more tests go, because a test from tasks 1.1–1.4 subsumes each one: `a cells entry that is not
  an object rejects and names the object spelling` (B9 owns it), `an instrument that is not a
  non-empty string rejects` (B12), `an align outside the three rejects and names the value` (B13),
  `cells naming 12 instruments keeps the first 10 and warns nothing` (B14), `an align past the
  ceiling that is outside the three rejects the document` (B15), `a rows list normalizes to one row
  per entry in order` (A1), `an empty object yields one row of ten with no warning` (A5), `an empty
  rows list yields the default row with no warning` (A4), and `an instrument the extension does not
  implement renders blank and warns naming it` (C17). Two of those pairs stay. `a cell object with an
  unrecognised key rejects and names the key` is B10's pair, and its `{text: "x"}` case is the only
  test pinning the entry check order settled under CB5R2-3, because the unrecognised key is reported
  before the missing `instrument`. `a cells entry past the ceiling naming an unknown instrument warns
  and renders ten cells` is B16's pair, and its `rows.length === 1` is the only assertion that entries
  past the ceiling do not spill into a second row (`michael-consult-1.md`).

  Two tests are split, because half of each loses its subject (rule (e) below). Three are rewritten
  in place: `unknown instrument names in the section and cells share one exact notice` (`:959`), and
  the precedence test's `:1085` and `:1087` (both below).

  **Rewrite `:959` in place.** Keep both of its `cells.map(cellText)` assertions, including the
  unknown cell's `"configured blank"`, and replace its two exact warnings with decision 5's table and
  decision 6's join:
  `pi-jefferson: ${path} the instruments block names instruments the extension does not implement: "nope"`
  and
  `pi-jefferson: ${path} row 1: "nope" is not a known instrument; the instruments block names instruments the extension does not implement: "nope"`.
  Retitle it `an unknown name in the block and in a row each get their part, and its cell renders the
  configured blank`.

  **Rewrite the precedence test's two documents.** `:1085` becomes
  `rejected({ instruments: { model: { format: 42 } }, rows: [[{ instrument: "model", align: "middle" }]] }, 'instrument "model" has a format that is not a string')`.
  `:1087` becomes
  `rejected({ instruments: { model: { format: 42 } }, rows: [blankRows(10)], rowGap: 1.5 }, "rowGap must be a whole number from 0 to 3: 1.5")`,
  which is a nested list: one row of ten `{"instrument": "blank"}` entries.

  **Write the kept tests' literals.** The alignment test (`tests/jefferson.test.ts:336`) writes
  `{"rowGap": 0, "rows": [[{"instrument": "branch", "align": "left"}], [{"instrument": "session", "align": "center"}], [{"instrument": "status", "align": "right"}]]}`
  with today's host data, and at 80 columns asserts three lines, each 80 wide: `Branch: main` at
  column 0 of line 1, `Session: docs` at column 33 of line 2, and `Status: 3 tasks idle` ending at
  column 80 of line 3. The 132-column test, `a right-aligned last cell at a width that does not
  divide evenly ends at the window's edge`, writes `{"rows": [[` nine `{"instrument": "blank"}`
  entries, then `{"instrument": "blank", "align": "right"}` `]]}`, and at 132 columns asserts a
  132-column line of ten cells, the last 13 columns wide, with visible text ending in
  `truncateToWidth(DEFAULT_CELL_TEXT, 13)`'s text. The totals test (`tests/instrument.test.ts`) sets
  `seen.length` to 6 (it is 4 today) and its line to `"Cost: $0.123 Tokens: 212".padEnd(80)` (two
  `padEnd(40)` halves today); `scans` stays 1. The repaint lines are decision 10's —
  `"Tokens: 0 Cost: $0.000".padEnd(80)`, then `"Tokens: 212 Cost: $0.125".padEnd(80)`;
  `redgreen-derek.md` § F quotes their order reversed, and decision 10's measured order governs.

  **The rewrites, complete.** Every rule applies only to a test whose subject survives.

  - **(a) A top-level row.** `{cells: X, …rest}` becomes `{rows: [X], …rest}` and keeps its
    expectation, unless it also writes `distribution`. In that case drop the key and take the
    expectation decision 10 gives: the worked values (`tests/instrument.test.ts:312`, and
    `tests/jefferson.test.ts:740`, `:760` and `:778`); the changed inputs (`:340` and the 132-column
    half of the test at `:922`); and the deleted ones (`:698` and the 100-column half of `:922`).
  - **(b) An empty row.** A row written as `{}` becomes ten `{"instrument": "blank"}` entries,
    through a `blankRows(n)` helper in each file. Expectations do not move.
  - **(c) A row object inside `rows`.** `{cells: X}` becomes `X`. This includes the shared constant
    `MODEL_ROW` (`tests/configuration.test.ts:481`), which becomes `[{ instrument: "model" }]`.
  - **(d) A rejection test that carries a retired key beside `rows`.** The document stays unchanged.
    It is still rejected, now by the retired-key guard, and its assertions hold:
    `tests/jefferson.test.ts:321`, and `tests/configuration.test.ts:537` and `:1371`.
  - **(e) The two splits, spelled out.** `rowGap sits beside a rows list and beside a single
    top-level row` keeps its listed half; `{ ...MODEL_ROW, rowGap: 2 }` (`:523`) becomes
    `{ rowGap: 2 }`, which is accepted with no warning, a `rowGap` of 2 and the default row, and the
    test is retitled `rowGap sits beside a rows list and in a document with no rows`. `the
    instruments section sits beside either row envelope` (`:575`) keeps one document,
    `{ rows: [[{ instrument: "model" }]], instruments: { model: { format: "configured $model" } } }`,
    and its two assertions unchanged.
  **Proves:** `design.md` decision 10 in full, and rulings 8 and 15.
  **Boundary cases:** a deleted test per retired subject; a rewritten document that keeps its
  expectation; a split test whose two halves each keep a subject; a `{}` row inside a test about
  something else; a rejection test that keeps its retired key.
  **Verify:** `pnpm test` — the whole suite passes; `pnpm typecheck` clean. Every value written here
  is one of decision 10's, not one taken from a failing run.

- [x] 1.15 **Run the group's green gate.** The end of the atomic migration.
  **Proves:** the suite is green after the whole migration.
  **Boundary cases:** none.
  **Verify:** `pnpm test` reports 0 failures and `pnpm typecheck` reports no error. Record the total
  and reconcile it by name against `redgreen-derek.md` § F's per-file counts. The in-row order test
  and D24–D26 are in this plan's list, so the total may differ from the spike's 433. Do not add or
  remove a test to reach a number.

## 2. What must not move

Each task here changes no behaviour. Its check is the existing suite, and `Test: none` is deliberate:
the test that would fail does not exist because the behaviour is not touched.

- [x] 2.1 **Prove the equal branch and the renderer are untouched.**
  `components/row/width-plan.ts`, `components/row/row-renderer.ts`, `Row.distribution`,
  `DISTRIBUTIONS` and `tests/width-plan.test.ts` are unmodified, and
  `tests/row-renderer.test.ts`'s assertions are unmodified.
  **Test:** none — no behaviour changes here; the check is the existing suite (decision 8).
  **Boundary cases:** the equal branch at a width that does not divide by the cell count.
  **Verify:** `pnpm test` — all 7 `width-plan` tests and all 55 `row-renderer` tests pass, and
  `git diff --stat` shows no change under `components/row/row-renderer.ts` or `width-plan.ts`;
  `pnpm typecheck` clean.

- [x] 2.2 **Prove no export was added.** The export pin at `tests/jefferson.test.ts:392-394` still
  passes, `configuration.ts` exports nothing new, and the shown-form constant is private.
  **Test:** none — the pin is the check, and it fails if an export appears.
  **Boundary cases:** a helper that a later change would like exported; the pin lists exact keys.
  **Verify:** `pnpm test` — the export-pin test passes; `pnpm typecheck` clean.

- [x] 2.3 **Prove the rest of the boundary is untouched.** `startup.ts`, `shipped.ts`,
  `instrumentNamed`, `components/instruments/`, `data/`, `/jefferson`, both document paths, the trust
  check and `Configuration.noticeSeconds` are unmodified, and `readInstruments` changed only in the
  one line that records an unknown name.
  **Test:** none — no behaviour changes here; the check is the existing suite plus a diff.
  **Boundary cases:** the absent file, the untrusted project, the missing notice cell.
  **Verify:** `pnpm test` passes in full and `git diff` shows no change in those files except
  `configuration.ts` and `row.ts`; `pnpm typecheck` clean.
