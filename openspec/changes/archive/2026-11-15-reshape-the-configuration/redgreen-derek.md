# Red/green spike — `reshape-the-configuration`

Every check the design and the delta imply went red against `main` at `24ee86b` and green against a
minimal implementation of the design, and the whole suite plus `pnpm typecheck` end green at 433
tests. One design claim does not survive: two of the `id:` fixture edits decision 10 lists are not
forced by any check (gap 1).

## How the spike ran

- A worktree of `main` (`24ee86b`) in a `mktemp -d` directory, with
  `ln -s <main>/node_modules <worktree>/node_modules`. No `pnpm install` ran anywhere. The worktree,
  its branch `spike-reshape-redgreen` and the temporary directory are removed (§ Cleanup).
- **Red run 1**: the new-shape tests were appended to the files they will live in
  (`tests/configuration.test.ts`, `tests/jefferson.test.ts`) and run against unchanged code. 21 new
  tests failed and 4 passed (the four pins in § G, whose behaviour this change does not alter).
- **Green run**: the minimal change to `extensions/jefferson/configuration.ts` and
  `extensions/jefferson/components/row/row.ts`, then the fixtures, then `pnpm test` and
  `pnpm typecheck`.
- **Red run 2** (the migration's own red): a second `mktemp -d` worktree at `24ee86b` holding the
  finished test files against the unchanged 0.12.0 parser. It is the only way to show, per migrated
  fixture, that the migration cannot be green without the parser: **433 tests, 304 pass, 129 fail**,
  plus **26 `tsc` errors in three files**.
- Every expectation quoted below comes from `design.md`'s message table and the delta's scenarios,
  or from the content-sizing rule; none was pasted from output. Where a number had to be worked out
  (the totals test, the four replacement lines, the centred cell), § F shows the design's value
  landing exactly.

## Checks, red then green

Files the minimal change touched, once, for the whole change:

- `extensions/jefferson/configuration.ts` — the retired-key constant and guard, the row/entry reader,
  the message table, `Notices` as data, and the deletion of `isDistribution`, the `containers` notice
  and the `cells`/`id`/`distribution` handling.
- `extensions/jefferson/components/row/row.ts` — `Row` loses `id`.
- the six test files named in § F.

### A. Envelope and retired keys (decision 1, decision 5's table)

All in `tests/configuration.test.ts`.

1. **`a rows list of entry lists yields one row per member, in order`**
   Red: `assert.equal(warning, undefined)` — actual
   `pi-jefferson: … was rejected (row 0 is not an object); rendering the default row`. Today a member
   of `rows` must be an object, so a list is rejected and its placeholder row renders.
   Green: `warning === undefined`, rows `[1, 2]` cells, each holding the instrument its entry names.
2. **`a retired top-level key rejects alone, beside an empty rows list, and with another retired key`**
   Red: for `{"distribution": "equal"}` — actual `undefined`, expected the retired-key part. The
   document is **accepted and renders ten blank cells with no word**: exactly the silent failure
   orientation T3 names, and the reason ruling 1 refused "beside `rows`". `{"id": "footer"}` and
   `{"cells": [...]}` are accepted the same way; `{"cells": [...], "rows": []}` is rejected with the
   retired *both-shapes* message the change deletes.
   Green: all five reject with
   `a row at the top level is retired; declare rows as {"rows": [[{"instrument": "model"}]]} and drop any top-level id or distribution`,
   the message carries no "cell", and it shows the form.
3. **`rows given as something other than a list is rejected naming rows`** — *green today*:
   `the rows value is not a list` is unchanged. A regression pin, not a red (see § G).
4. **`an empty rows list is accepted with no warning, alone and beside settings`** — *green today*
   (`rows: []`, `rows: []` + `rowGap`, `rows: []` + `instruments`). Pin.
5. **`a document with no rows and no retired key renders the default row`** — *green today*
   (`{}`, only `instruments`, only `rowGap`). Pin.
6. **`the configuration document must be an object`** — *green today* (`42`, `null`, `[[]]`, `["x"]`).
   Pin.
7. **`a row written as an object is rejected with the whole rows form, at either mistake`**
   Red: actual `undefined` for `{"rows": [{"cells": […]}]}` — today that is the only shape, so it is
   accepted; `{"rows": [{"instrument": "model"}]}` (one bracket short in `rows`) is accepted as a row
   object and renders ten blank entries.
   Green: `row 1: is not a list; a row is a list of entries, as {"rows": [[{"instrument": "model"}]]}`
   for both mistakes — one message, as ruling 9 asks.

### B. A row and its entries, and where a rejection places its offender (decision 2, decision 5)

All in `tests/configuration.test.ts`. Every red in this group is the same cause: a row list is not an
object today, so the document is rejected with `row 0 is not an object` before the entry is read.

8. **`an empty row is rejected and placed by its row alone`**
   Red: actual `row 0 is not an object`; expected `row 2: is empty; a row lists the entries it renders`
   (a later row, so the number is 1-based and the fault is the row's).
9. **`an entry that is not an object is rejected and named by row and instrument`** (`"model"`, `4`,
   `["model"]`, `null`) → `row 1, instrument 1: is not an object; declare {"instrument": "model"}`.
10. **`an entry with an unrecognised key is rejected naming the key`** (`distribution`, `width`,
    `aling`) → `row 1, instrument 1: has an unrecognised key "width"; an entry carries instrument and align`.
11. **`an entry with no instrument is rejected in Joel's words, placed by position`** →
    `row 1, instrument 2: no "instrument" named` (Joel's own string, second entry).
12. **`an instrument that is not a non-empty string is rejected`** (`4`, `""`) →
    `row 3, instrument 2: "instrument" is not a non-empty string`.
13. **`an align outside the three is rejected naming the value`** (`"middle"`, `"Center"`, `4`) →
    `row 1, instrument 1: align is not "left", "right" or "center": "middle"`.
14. **`a row above the ceiling renders ten cells and is accepted`**
    Red: actual `was rejected (row 0 is not an object)`, expected `warning === undefined`.
    Green: 12 entries, 10 cells, no warning.
15. **`an entry past the ceiling is still validated and placed by its position`** →
    `row 2, instrument 12: align is not …` — 12 is the position in the list, past the ceiling.
16. **`an unknown name past the ceiling still warns`** →
    `row 1: "brnach" is not a known instrument`, and the row renders ten cells.

### C. Unknown names (decision 4, decision 6)

All in `tests/configuration.test.ts`.

17. **`an unknown name warns by its row, and its cell renders blank`**
    Red: actual `row 0 is not an object`; expected
    `pi-jefferson: <path> row 3: "taiknr.savings" is not a known instrument`, with that cell rendering
    the placeholder and the row's other cells their instruments.
18. **`one unknown name in two rows is reported once for each row, in row order`** → two row parts,
    row 1 then row 3, joined `; `.
19. **`one unknown name twice in one row is reported once`** → one part for the pair, not two.
20. **`a name only the instruments block configures is reported by the block, with no row`**
    Red: actual `names instruments the extension does not implement: nope; those cells render blank` —
    today's single combined line, which claims a cell renders blank when no cell holds the name.
    Green: `the instruments block names instruments the extension does not implement: "nope"`, no
    "cell" in it.
21. **`the instruments block names every unknown it configures, in key order`**
    Red: actual `… names instruments the extension does not implement: other, nope; those cells render blank`.
    Green: `…: "other", "nope"` — quoted, `, `-joined, in the block's key order.
22. **`a name a row and the block both name is reported by each, the row's part first`**
    Red: actual `row 0 is not an object`; expected
    `row 2: "nope" is not a known instrument; the instruments block names instruments the extension does not implement: "nope"`.
23. **`every placed part joins in row order, then the block's one part`**
    Red: actual `row 0 is not an object` (the document dies before a warning can be joined); expected
    one `pi-jefferson: <path> ` line carrying `row 1: …; row 2: …; the instruments block …`.

### D. The removals (decision 3, decision 7, decision 8)

24. **`a row carries a distribution and no id, and the parser writes content`**
    Red: `assert.deepEqual(Object.keys(row).sort(), ["cells", "distribution"])` — actual
    `["cells", "distribution", "id"]`.
    Green: exactly `cells` and `distribution`, and every parsed row is `"content"`.
25. **`a top-level containers key is an ordinary unknown key and is ignored in silence`**
    Red: actual `pi-jefferson: … carries the containers key, which is no longer read; declare cells instead`,
    expected `undefined`. Green: the default row, no warning. (The row-level trigger is unreachable in
    the new shape, so only the top-level one is testable.)
26. **`every row the parser writes is sized by content`** (replaces `every row carries a distribution,
    content by default`): a declared document, the absent file, and a rejection's default row all
    report `"content"`; nothing a document writes can change it.
27. **`distribution` is not configurable, at either level** — an entry's `distribution` is
    `row 1, instrument 1: has an unrecognised key "distribution"` (check 10); a top-level one is the
    retired-key rejection (check 2).
28. **The renderer's equal path and its direct tests stay green**: `tests/width-plan.test.ts`
    (`equal distribution gives every cell floor(W / N) and grow 1, with no joint, whatever the content`,
    and six more) and `tests/row-renderer.test.ts` are unchanged and pass; `Row.distribution`,
    `DISTRIBUTIONS` and `width-plan.ts` are untouched, and the export pin at
    `tests/jefferson.test.ts` (`ALIGNMENTS`, `DISTRIBUTIONS`) still passes — the change adds no export.

### E. End to end through the document

In `tests/jefferson.test.ts`.

29. **`a rows list of entry lists renders one line per row, with the gap between them`**
    Red: `session.notified` is
    `[{ message: 'pi-jefferson: … was rejected (row 0 is not an object); rendering the default row', type: 'warning' }]`,
    expected `[]` — the document is refused and one line renders.
    Green: two rows and one bare `""` gap line, the model row and the thinking row.
30. **`a 0.12.0 document is rejected end to end, in one toast that shows the rows form`**
    Red: `assert.deepEqual(session.notified, [one warning])` — actual `[]`, because `{"cells": […]}` is
    today a valid document.
    Green: exactly one `warning` toast carrying the path, the retired-key part, and the default row.

### F. The migration, and the expectations worked out by hand (decision 10)

**The compiler's red.** With `Row.id` removed and the fixtures not yet touched, `pnpm typecheck`:

```
tests/configuration.test.ts(364,33): error TS2339: Property 'id' does not exist on type 'Row'.
tests/row-renderer.test.ts(42,5): error TS2353: Object literal may only specify known properties,
  and 'id' does not exist in type 'Row'.
tests/session-data-feed.test.ts(303,7): error TS2353: …
```

28 errors across three files (4 configuration, 23 row-renderer, 1 session-data-feed); green after the
fixtures. That is the "one atomic group" decision 10 describes, measured from the other side.

**The suite's red.** The finished test files against the unchanged parser: **433 tests, 304 pass, 129
fail** (`configuration.test.ts` 38/98, `jefferson.test.ts` 15/30, `instrument.test.ts` 34/1), and
`tsc` reports **26 `error TS` in `tests/row-renderer.test.ts` (24), `tests/format.test.ts` (1) and
`tests/session-data-feed.test.ts` (1)**, because those files now omit a field `Row` still requires.
`row-renderer`, `format` and `session-data-feed` fail nothing at runtime: the compiler is their check.

**Deleted, with the subject each one lost:**

| Test | File | Why |
|---|---|---|
| `a top-level row object normalizes to one row` | configuration | the retired shortcut; decision 10 names it, replaced by `A2` |
| `both shapes at once is rejected` | configuration | no second shape; replaced by `A2`'s multi-key document |
| `a row omitting cells renders 10 cells` | configuration | `{}` is not a row; its subject is `A5`'s default row |
| `a row omitting cells holds ten blank cells` | configuration | same |
| `a document carrying containers is accepted and renders ten blank cells` | configuration | decision 7 |
| `two rows carrying containers still warn once per document` | configuration | decision 7 |
| `containers beside a rows list warns once rather than passing silently` | configuration | decision 7 |
| `cells given as a number is rejected rather than read as a list` | configuration | `cells` is not a key |
| `cells given as a string is rejected rather than read as a list` | configuration | same |
| `an unnamed row gets a synthesized deterministic id` | configuration | `Row` identifiers removed |
| `an explicit id is kept` | configuration | same |
| `two explicit duplicate ids are rejected` | configuration | same |
| `an explicit id colliding with a synthesized id is rejected` | configuration | same |
| `every row carries a distribution, content by default` | configuration | nothing selects one; replaced by `D26` |
| `a distribution that is not one of the two rejects the whole document` | configuration | same |
| `within a row the distribution is read before the cells list, and the envelope before any row` | configuration | its envelope-half subjects are retired; replaced by the rewritten precedence test |
| `a distribution beside a rows list rejects like a top-level cells or id` | configuration | same |
| `configured formats, styles and a width-taking bar render end to end under equal distribution` | jefferson | its only difference from the content case was the key |
| `distribution equal restores equal shares end to end` | jefferson | its 100-column half is gone; its 132-column half survives as check 33 |

**Kept, rewritten, expectation unchanged by rule (a) or (b):** every other document test in both
files — `{cells: X, …rest}` → `{rows: [X], …rest}`, and a row written as `{}` → ten
`{"instrument": "blank"}` entries (a `blankRows(n)` helper in each file). Two tests were **split**
because only half their subject was retired: `rowGap sits beside a rows list and beside a single
top-level row` (the top-level half becomes a `rowGap`-only document) and `the instruments section sits
beside either row envelope` (now one document). One test was **split into two** because its two
unknown-name forms are now two messages: `unknown instrument names in the section and cells share one
exact notice` → checks 20 and 22.

**`tests/instrument.test.ts`'s totals test** (34 of its 35 pass; the red is the rejection):
input `{"rows": [[{"instrument": "cost"}, {"instrument": "tokens"}]]}`, and the design's values land
exactly — a row of `cost` then `tokens` plans 12 and 68 at 80 columns, `tokens` is the last
left-aligned cell and absorbs the spare columns, so
`assert.equal(stripTerminalSequences(line), "Cost: $0.123 Tokens: 212".padEnd(80))`, `scans === 1`,
and `seen.length === 6` (each cell rendered at its probe 0, the host's measure 80 and its allocation).
All six `seen` entries are the same totals object.

**The two turn-boundary repaint tests** (`a dispatched turn boundary repaints only changed totals…`,
`an unchanged turn boundary before the first render…`): the key drops and the design's lines land
exactly — `"Cost: $0.000 Tokens: 0".padEnd(80)`, then `"Cost: $0.125 Tokens: 212".padEnd(80)`; the
repaint count stays 1 and the scan count 1 → 2 → 3.

**The four `${reason}` replacement runs** (`new`, `resume`, `fork`, `reload`): the design's two lines
land exactly — `"old old-id 17 $0.125 high old old-id 17 $0.125 high".padEnd(80)` for the first
install and `"new new-id 212 $0.250 low new new-id 212 $0.250 low".padEnd(80)` for the second, with
the released footer still `" ".repeat(80)`.

**The branch/session/status alignment test** keeps its subject by changing its input, as decision 10
rule 3 says: three rows of one entry each with `rowGap: 0`, and the design's arithmetic lands —
`Branch: main` at column 0 of line 1, `Session: docs` at column 33 of line 2
(`floor((80 − 13) / 2)`), `Status: 3 tasks idle` ending at column 80 of line 3, each line 80 wide.

**The 132-column half of the equal-share test** becomes
`a right-aligned last cell at a width that does not divide evenly ends at the window's edge`: ten
`blank` entries with `align: "right"` on the last, at 132 columns — ten cells, the last occupying 13
columns, its text ending at the window's edge.

### G. Checks that stayed green today, and why that is right

Four new tests pass against 0.12.0 because the change does not alter their subject: `rows` given as a
non-list keeps its message, `rows: []` and a settings-only document keep the default row, and a
non-object document keeps its message. They are pins for behaviour the delta keeps, and they are
listed in § A as checks 3–6. Everything else the brief names went red first.

`an instrument that does not fill renders the same text at width 0 and at width 200`
(`tests/instrument.test.ts`) is untouched and passes, as decision 10 requires.

## Totals

| | tests | pass | fail | `pnpm typecheck` |
|---|---|---|---|---|
| `main` at `24ee86b` (baseline) | 425 | 425 | 0 | clean |
| the finished change | **433** | **433** | **0** | **clean** |
| the finished tests against the 0.12.0 parser (red run 2) | 433 | 304 | **129** | 26 errors, 3 files |
| the new tests alone against 0.12.0 (red run 1) | — | — | 21 of 25 | — |

Per file at the end: `configuration.test.ts` 136 (129 before, 16 deleted, 23 added),
`jefferson.test.ts` 45 (44 before, 2 deleted, 3 added), `instrument.test.ts` 35 unchanged,
`row-renderer.test.ts` 55, `format.test.ts` 68, `session-data-feed.test.ts` 21,
`session-data-store.test.ts` 47, `notice.test.ts` 15, `width-plan.test.ts` 7, `timed.test.ts` 4.

`pnpm test` end of spike:

```
ℹ tests 433
ℹ suites 0
ℹ pass 433
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 434.805084
```

`pnpm typecheck` end of spike:

```
$ tsc --noEmit
Done in 41ms using pnpm v12.17.0
```

Diff of the spike: 8 files, +554 −540 — `extensions/jefferson/configuration.ts`,
`extensions/jefferson/components/row/row.ts`, and the six test files.

## Design gaps

Not decisions I made — things `tasks.md` has to settle, with the evidence.

1. **Two of the `id:` fixture edits are not forced by any check.** `design.md:91` lists
   `tests/format.test.ts` and `tests/session-data-feed.test.ts` as dropping `id:` "with no assertion
   changes", and the Migration Plan's gate is `pnpm test` and `pnpm typecheck`. A leftover `id:` in a
   `.map` callback is invisible to both. Verified twice in the spike worktree: restoring
   `id: \`row-${index}\`` in `tests/format.test.ts:179`'s mapper leaves `tsc --noEmit` **clean**, and
   the same for the mapper at `tests/row-renderer.test.ts:462`. The typecheck red at the midpoint
   listed 28 errors and none of them was `format.test.ts`. (The opposite direction is caught: with
   `Row.id` still required, omitting the key errors in both files, which is the 26-error run above.)
   So `tasks.md` should name both sites, and Validate needs `rg 'id:' tests/` — not typecheck alone.
2. **Decision 6's in-row ordering rule has no scenario and no test.** "Within a row the names follow
   the position of each name's first entry" (`design.md`, decision 6) and "once per distinct
   (row, name)" are what my `noteUnknownInRow` implements, but no delta scenario and no disposition
   in decision 10 pins the order of *two different* unknown names in one row — the delta's scenario
   covers one name twice. It cannot go red on its own, because 0.12.0's `Set` also iterates in
   insertion order; the placement form is what differs, and that is already red. Suggest one task
   asserting `row 1: "bb" …; row 1: "aa" …` ordering from a row `[bb, aa]`.
3. **The align part is stated only for a string value.** Decision 5's table gives
   `align is not "left", "right" or "center": "middle"`. For the delta's non-string case
   (`{"align": 4}`) the part carries `JSON.stringify(4)` — `4`, unquoted — which is what 0.12.0 does
   and what my implementation keeps. Worth one line in `tasks.md` so a coder does not invent quotes.
4. **`design.md:90` says row-renderer has "about 20 carrying an `id`"**; `24ee86b` has 24 lines
   carrying `id:` in that file. Cosmetic, but the count is the only estimate in the file list.

Checked and **not** gaps: the design's line references (`configuration.test.ts:51`, `:106`, `:112`,
`:253`, `:266`, `:549`, `:968`, `:1082-1088`, `:1220`, `:1269`) all point at the tests the design
names; the six test files it lists are exactly the files this change touches, and `rg 'id:'` finds no
other hand-built `Row`; the retired-key message's wording, the block form and the join order let every
message assertion be written from the table; and the design's hand-worked values for the totals test,
the two turn-boundary tests, the four replacement runs and the centred cell all land exactly.

## Docs for Bambadjan

I edited no Markdown. These are the sentences the spike's code makes false or incomplete, with the
line numbers as of `24ee86b` (all of them are already in `design.md`'s file table; this is the
confirmation a docs pass can work from, not a new list):

- **`ARCHITECTURE.md:80-89`** (the **Configuration** paragraph) never states the document's shape, and
  after this change it must: `rows` is a list of entry lists, `{"cells": …}` / a top-level `id` /
  `distribution` are rejected, and a row is placed by its position. The sentence "Every failure mode
  rejects the whole document, renders the default row, and warns…" stays true.
- **`ARCHITECTURE.md:139`** (`distribution: "equal" skips the probe…`) and **`:190-192`** ("Under
  `distribution: "equal"` they go to the earliest cells…") stay true of the renderer but are now
  unreachable from a document; they should say so.
- **`AGENTS.md:3-5`** — "A row holds cells, and a cell holds an instrument" needs the qualifier the
  design gives it: users read "entry" and "instrument", the code says "cell".
- **`README.md`** — every example from line ~36 to ~90 writes `{"cells": […]}` or a row `{}` or
  `"distribution": "equal"`, and the text around ~68-83 explains the two layouts; all of it is
  rejected now. The upgrade note must name the retired keys, `rows` as lists of entries, and the loss
  of equal shares.
- **`openspec/specs/statusline/spec.md`** — its Purpose still says "evenly divided cells" (a delta
  cannot reach it; design says the docs pass edits it by hand), and the archived delta carries the
  rest.
- **`docs/adr/0007-a-cell-takes-the-width-its-content-needs.md`** — its body states the row option
  `distribution`; the body is not edited, only its `Status:` line moves, per design decision 12.

## Not verified

- `openspec validate --strict` — not run: this spike edited no artifact.
- The spike ran on this machine only, against the installed `@earendil-works/pi-coding-agent` 1.4.0
  and `@earendil-works/pi-tui` 1.4.0, with `fakeTheme`; no host behaviour outside the fakes was
  exercised.
- One red run per check. The reds quoted for the parsing checks are from the single red run
  described above; each is a distinct assertion, but each was seen once.
- The four pins in § G, and `a top-level containers key …`, were not shown catching a deliberate
  break; their subjects are behaviour this change does not alter, which is why they were green.

## Cleanup

Both worktrees, the branch `spike-reshape-redgreen` and their `mktemp -d` directories are removed;
`git worktree remove --force` was used for each. `git worktree list` in the main checkout now shows:

```
/Users/joelleibow/Projects/pi-jefferson                                   24ee86b [main]
/Users/joelleibow/.herdr/worktrees/pi-jefferson/worktree-calm-forest-5599 52e39a0 [worktree/calm-forest-5599]
```

The second entry is **not mine**: it predates this run (`.git/worktrees/worktree-calm-forest-5599`
was created 6 Nov 15:13) and sits on a different commit. I left it alone; the conductor should
confirm whose it is. `git status` in the main checkout shows only the pre-existing untracked
`openspec/changes/reshape-the-configuration/`.
