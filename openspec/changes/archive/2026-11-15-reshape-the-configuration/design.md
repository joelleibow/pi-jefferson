# Design

## Context

`extensions/jefferson/configuration.ts` is the one module that knows what a configuration document
is. It reads only the selected file, project or agent, and never merges the two; a missing file, an
unreadable file and a rejected document each render the default row, and a rejection carries the
path and the reason in one warning (`research-eleanor.md`, "Parser and source selection"). Today the
document may carry either one row at its top level or a `rows` list, and each row is an object that
carries `cells`, a `distribution`, and a synthesized or declared `id`. `row.ts` then hands the
renderer a `Row` of `{ id, distribution, cells }`, and `width-plan.ts` reads the distribution
(`research-eleanor.md`, "Runtime shape and flow").

That shape is what this change retires: `rows` becomes a list of rows and a row becomes a plain list
of entries, each naming an instrument (`owner-rulings.md`, 2026-11-15; `michael-orientation.md` D3,
D5). The motivation is in `proposal.md`; the statement of every rule a user can observe is in
`specs/statusline/spec.md` and `specs/extension-source-layout/spec.md`; every dispute the shape
raised is settled in `council.md` and `michael-council-rulings.md`, and those rulings bind this
design.

Three constraints shape everything below.

- **A document is untrusted input.** Every failure rejects the whole document, renders the default
  row and names the offender (`ARCHITECTURE.md:87-89`; `configuration.ts:393-402`). Nothing guesses a
  default for a malformed document, and no retired key may fall through to a silent default
  (`michael-orientation.md` T3).
- **The renderer is out of bounds.** `row-renderer.ts`, `width-plan.ts`, `Row.distribution`,
  `DISTRIBUTIONS` and the tests that build rows directly stay as they are (`michael-orientation.md`
  §2; D8). The parser only ever writes `"content"`.
- **Words change for users only.** "Cell" leaves the configuration's keys, the messages and the
  README, and the code keeps the word (`owner-rulings.md`, D6; `michael-orientation.md` D11).

Joel's newest ruling adds a second deliverable to this change: the README is cut to what a README is
for, and its content moves into topic documents under `docs/`
(`owner-rulings.md`, 2026-11-15, "The README and docs/"; `research-eleanor-docs.md` §1–2).

## Goals / Non-Goals

**Goals:**

- One document shape for rows: a top-level `rows` list of rows, each row a plain list of entries.
- A retired document — a top-level `cells`, `id` or `distribution`, or a row written as an object —
  is rejected with a message that shows the shape to write, before any other check can answer for it
  (`council.md`, rulings 1 and 2).
- Every rule the retired `cells` key carried survives the move: the ceiling of ten, validation of
  entries past it, the rejection of an empty row, `align`, and the unknown-name warning.
- `Row.id` and its duplicate check go, because no document can set an identifier any more
  (`council.md`, ruling 7).
- The README becomes a README, and `docs/` gains the topic documents its sections move into, with a
  home for the extension-author guide the registration change will write
  (`owner-rulings.md`, 2026-11-15, "The README and docs/").

**Non-Goals:**

- Registering instruments over `pi.events`, namespaced names, and pi's spinner. They are changes 2
  and 3, and nothing from them lands here (D1, D9, D10).
- Any reader for the 0.12.0 shape. There is none, and `michael-orientation.md` T4 says why.
- Selecting equal shares from a document, and any per-row `distribution`. The renderer keeps its
  support; the configuration cannot reach it (D8; `council.md`, ruling 12).
- Restoring `containers` in any form. The notice is deleted (`council.md`, ruling 3).
- The extension-author guide itself. Its contract does not exist yet; the registration change writes
  it into the home this change leaves (`owner-rulings.md`, conductor's scope call).
- ADR bodies of earlier decisions. Only their `Status:` lines move (`michael-orientation.md` §1, ADR
  convention).

## Module & File Placement

This repository is not a layered application, and the design does not pretend it is. Its lines are:
`extensions/jefferson/data/` holds the store and the feed; `components/` holds the renderer and the
instruments; `configuration.ts` reads the document; and the extension's setup path calls the parser
once and hands the resulting rows to `createFooter` (`research-eleanor.md`, "Runtime shape and
flow"). The boundary that matters is document → rows: `configuration.ts` imports the instrument
declarations and produces `Row` values, and nothing under `components/row/` or `data/` imports the
parser. The dependency keeps pointing that way: the parser may name `Row`, and the renderer may not
name the document.

No new code file appears. Every rule this change states is a rule `configuration.ts` already enforces,
and it stays in the function that already enforces it: the change rewrites one boundary rather than
adding a subsystem, and nothing here needs a layer, a schema, a registry or a compatibility reader
(zoom-out finding, `council-zoom-out.md`; D13). The new files are prose: four `docs/` topic
documents, one release page and two ADRs.

| File | Change | The one responsibility it owns |
|---|---|---|
| `extensions/jefferson/configuration.ts` | modified | What a document may say. Envelope, the retired-key guard, `rows`, the entry rules, `instruments`, `rowGap`, and every message a user reads. Still the only place a document's shape is decided. |
| `extensions/jefferson/components/row/row.ts` | modified | The row the renderer draws. `Row` loses `id` and keeps `distribution`, which the parser writes as `"content"`. |
| `tests/configuration.test.ts` | modified | Parsing and messages. The largest rewrite: envelope, row and entry cases, message patterns. |
| `tests/jefferson.test.ts` | modified | End-to-end rendering from a document. 22 of its 26 inline documents use the retired top-level row, and six tests get equal shares by writing `distribution` (`michael-orientation.md` T3, T6). |
| `tests/instrument.test.ts` | modified | Its one JSON document (`:312`) takes the new shape. |
| `tests/row-renderer.test.ts` | modified | Hand-built rows, 24 lines carrying an `id`. The `id` keys come out; no assertion changes. |
| `tests/format.test.ts`, `tests/session-data-feed.test.ts` | modified | Their hand-built row literals drop `id:` (`:179`, `:303`). No assertion changes. |
| `README.md` | rewritten, cut | What the package is, whether it works, how to install it, one working configuration, where the documentation is, the two commands that run the suite, and the license. |
| `docs/configuration.md` | new | The configuration document: where it lives and when it is trusted, `rows`, entries, `align`, `rowGap`, the `instruments` block, what rejects a document, and the upgrade from 0.12.0. |
| `docs/instruments.md` | new | Each shipped instrument: its name, its variables, its options and its defaults. |
| `docs/formats.md` | new | How a cell's text is composed: format strings, variables, forms, modifiers, styles, `$bar`, composed formats and escaping. It uses "cell" only where it describes the model, never as a key. |
| `docs/notices.md` | new | The notice instrument: the kinds, their formats, and their visible seconds. |
| `docs/releasing.md` | new | How a release happens: the three labels, the patch default, and the workstation that cannot publish. |
| `docs/adr/0015-cell-is-no-longer-a-word-users-see.md` | new | Why "cell" left the words users read and stayed in the code. |
| `docs/adr/0016-the-equal-distribution-stays-in-the-code.md` | new | Why the equal branch survives a change that removed its only way in. |
| `AGENTS.md` | amended | The vocabulary line gains its qualifier: users read "entry" and "instrument", the code says "cell". |
| `ARCHITECTURE.md` | amended | The model: the document's shape, the rows the parser produces, and that a distribution is no longer configuration input. |
| `openspec/specs/statusline/spec.md` | Purpose only, amended in the docs pass | Its Purpose still says "evenly divided cells". A delta cannot reach a Purpose, so this is a hand edit (`council.md`, ruling 10). |

**Why new files and not the README.** `README.md` is a single file, and Joel's ruling asks for topic
documents a reader can follow instead of one long one. No existing module can own them: they are
prose about a user contract, not code. `docs/` already holds `adr/` and `images/`
(`research-eleanor-docs.md` §2), so the topic documents sit beside those two directories and the
image the README shows stays where it is.

**What this change does not touch.** `startup.ts`, `readInstruments`' validation and messages,
`shipped.ts`, `instrumentNamed`, `components/instruments/`, `components/row/row-renderer.ts`,
`components/row/width-plan.ts`, `tests/row-renderer.test.ts`'s assertions,
`tests/width-plan.test.ts`, `data/`, the store, the feed, `/jefferson`, both document paths, the
trust check, the notice gate, and `package.json`'s `files` (D4, D8, `michael-orientation.md` §2,
`council.md` ruling 11). One line inside `readInstruments` that records an unknown name
(`configuration.ts:106`) writes to the block list instead of the shared `Set`, which is where
decision 4 puts it; nothing else in it moves.

## Decisions

### 1. One shape, and the retired keys answer before anything else

The document's top level accepts `rows`, `instruments` and `rowGap`. `rows` is optional; when it is
present it is the only way to declare rows (`council.md`, ruling 4). With no retired key, a document
with no `rows` (including `{}` and a document that carries only `instruments` or `rowGap`) and a
document whose `rows` is `[]` both render the default row with no warning: ten `blank` entries,
left-aligned and sized by content (`defaultRow`, `configuration.ts:176`; `DEFAULT_CELLS`, `:71`).
`{"rows": [[]]}` is an empty row and is rejected (decision 2). The spec scenarios "An empty rows
list" and "No rows declared" own these cases. A constant beside the envelope check names the retired
keys — `cells`, `id`, `distribution` — and one guard rejects the document if any of them sits at the
top level, whether or not `rows` is present. The guard runs immediately after the
document-is-an-object check and before the `rows` type check, `rowGap`, `instruments` and the rows
(`council.md`, rulings 1 and 2).

Three defaults are unchanged by this change, and each already has a home:

- an absent `align` is `left` (spec, "A cell's alignment is the padding side inside it");
- an absent `rowGap` is `DEFAULT_ROW_GAP`, which is 1 (`configuration.ts:73`; spec, "rowGap sets the
  space between declared rows");
- an instrument the `instruments` block does not configure renders its declared defaults (spec, "An
  instrument's configuration lives in the extension's own document"), stated with the block's
  contract in the next paragraph.

The block is unchanged: `instruments` is an object keyed by instrument name, where each value is an
object that carries only options that instrument declares. Every instrument
declares `format`, `style` and `label` (`instrument.ts:54`), and `notice` adds `seconds` and `formats`
(`notice.ts:44`). An undeclared option rejects the document. An instrument the block does not
configure renders its declared defaults. The block's reader is unchanged (D4; spec, "An instrument's
configuration lives in the extension's own document").

*Why.* A 0.12.0 single-row document is `{"cells": [...]}`. With the shortcut retired and no guard, it
has no `rows`, so every unknown key is ignored and the placeholder row renders with no word said —
the exact silent failure `michael-orientation.md` T3 names. Joel's answer to JOEL-1 is unconditional
(*"a"*), and the 0.12.0 reader likewise treats a document without `rows` as a row
(`configuration.ts:298-300`). Rejecting only "beside `rows`", as the delta first had it, would let a
lone `{"distribution": "equal"}` — a document that works today, asserted at
`tests/configuration.test.ts:1220` — fall through as well (`council.md`, ruling 1).

*Alternatives weighed.* Keeping the shortcut under a new `row` key, or letting `rows` hold either a
flat list or a list of lists, each saves one pair of brackets and costs a key, a conflict rule and
its messages. Joel answered (a), and D13 refuses invented surface for that gain. Collecting every
fault before answering was refused for machinery nothing needs (`council.md`, ruling 2).

### 2. A row is a list, and its entries are its cells

A row is a list. Its first ten entries are its cells, in order; a longer list is truncated to ten and
every entry in it is still validated, so an unknown name past the tenth still warns. An empty row is
rejected. An entry is an object whose `instrument` is a non-empty string and which may carry `align`;
a key it carries that the extension does not recognise rejects the document and is named
(`specs/statusline/spec.md`, "A row's entries are its cells and their places"; `council.md`, ruling
13).

*Why.* Those rules are what the `cells` key carried, and Joel's shape ruling moves the key without
moving them (`michael-orientation.md` §2, "These stay as they are"). Keeping validation ahead of
truncation is what makes an entry past the ceiling behave as it does today
(`configuration.ts:215-225`).

*Alternatives weighed.* Rejecting a list longer than ten fails the carried-over behaviour; dropping
validation past the ceiling loses the warning a user needs to fix the document.

### 3. The internal row keeps `distribution` and loses `id`

The parser always writes `distribution: "content"` on every row. `Row.distribution` stays, along with
`DISTRIBUTIONS` and the renderer's two branches (D8). `Row.id` goes, with `defaultRow` and
`normalizeRow`'s handling of it and the duplicate-identifier check, because its only reader is that
check (`michael-orientation.md` T7; `council.md`, ruling 7).

*Why.* Removing `distribution` from `Row` would break the renderer boundary D8 protects, and there is
nothing to gain: a value that is always `"content"` costs one field. Removing `id` removes a
zero-based `row-0` that would otherwise sit beside warnings counting from 1 (`council.md`, ruling 5).

*Alternatives weighed.* Keeping `id` (ruling 7 refused: nothing breaks without it, and it duplicates
the position). Removing `distribution` (refused: it is renderer state, not configuration).

### 4. Warnings are collected as data and joined once

`Notices` holds the unknown names as data: `(row, name)` pairs in row order for names an entry
carries, and a list of every name the `instruments` block configures that the extension does not
implement, in the block's key order, whether or not a row also names it (`specs/statusline/spec.md`,
"A name the block and a row both name"). `Configuration.warning` stays `string | undefined`; the
parts join with `"; "` after the `pi-jefferson: <path> ` prefix; `startup.ts` keeps its single
`notify`. The order is row-placed names first, then block names (`council.md`, rulings 5 and 6).

*Why.* Change 2 has to hold the unknown-name report back until registration settles
(`michael-orientation.md` §2; D9), and it can only do that from data, not from a joined sentence.
Keeping one string keeps `startup.ts` and its tests untouched. A list would change the shape of a
field that three tests read.

*Alternatives weighed.* `warning: string[]` (refused: it moves the join into `startup.ts` and changes
every message assertion); joining at each site (refused: the join order then lives in four places).

### 5. The message table

The wrapper is unchanged. A rejection reads `pi-jefferson: <path> was rejected (<part>); rendering
the default row` (`configuration.ts:398`), and an accepted warning reads
`pi-jefferson: <path> <part>[; <part>…]` (`configuration.ts:348`). `tests/configuration.test.ts:977`
and `tests/jefferson.test.ts:717` already pin the rejection form. The parts are:

| Situation | Part |
|---|---|
| The document is not an object | `the configuration document is not an object` |
| A retired top-level key, one fixed message | `a row at the top level is retired; declare rows as {"rows": [[{"instrument": "model"}]]} and drop any top-level id or distribution` |
| `rows` is not a list | `the rows value is not a list` |
| A member of `rows` is not a list | `row N: is not a list; a row is a list of entries, as {"rows": [[{"instrument": "model"}]]}` |
| A row is empty | `row N: is empty; a row lists the entries it renders` |
| An entry is not an object | `row N, instrument M: is not an object; declare {"instrument": "model"}` |
| An entry carries an unrecognised key | `row N, instrument M: has an unrecognised key "distribution"; an entry carries instrument and align` |
| An entry carries no `instrument` | `row N, instrument M: no "instrument" named` |
| `instrument` is not a non-empty string | `row N, instrument M: "instrument" is not a non-empty string` |
| `align` is not one of the three | `row N, instrument M: align is not "left", "right" or "center": "middle"` |
| `rowGap` is out of range | `rowGap must be a whole number from 0 to 3: <value>` |
| The `instruments` block | every message `readInstruments` raises (`configuration.ts:93-173`), including those the format and style parsers raise through it, unchanged; none contains "cell" |

The shown form `{"rows": [[{"instrument": "model"}]]}` is a single private constant in
`configuration.ts`, and the retired-key part and the not-a-list part both interpolate it. It is not
exported, so the export pin does not move (the pin stays at `tests/jefferson.test.ts:392-394`).

Every part that places a whole row begins `row N:`, and every part that places an entry begins
`row N, instrument M:`.

Two warnings are not rejections and are stated with their own decision, below.

*Why.* The fixed retired-key message is the smallest one that names the retired set, shows the shape
to write and lets a user fix every retired key in one edit, and it contains no "cell"
(`council.md`, ruling 2; D6). `row N, instrument M: no "instrument" named` is Joel's own string. The
entry messages call the entry an instrument, never a cell, and the row message shows the whole form,
which contains the inner form a flat list needed (`council.md`, ruling 9).

*Deleted parts* — every one of these names a key or a shape this change removes:
`row N has an empty cells list`, `row N has a cells entry that is not an object; declare …`,
`row N has a cell with an unrecognised key …`, `row N has a cell with no instrument`,
`row N has an instrument that is not a non-empty string`, `row N has an align that is not …`,
`row N is not an object`, `row N has a distribution that is not …`,
`row N has a cells value that is not a list`, `row N has an id that is not a non-empty string`,
`the configuration carries both a top-level row and a rows list`, `two rows share the id …`, the
`containers` notice, and the combined `names instruments the extension does not implement … ; those
cells render blank` line (`research-eleanor.md`, "User-visible messages in configuration path").

### 6. Unknown names have two forms, and are reported once per place

A name an entry carries warns as `row N: "<name>" is not a known instrument`, placed by its row and
never by the entry's position. A name the `instruments` block configures warns as `the instruments
block names instruments the extension does not implement: "<name>"`, placed by the block and never
by a row, and claims nothing about what any cell renders. A name in both is reported by each
(`council.md`, ruling 5).

The block's warning is one message part that names every such name, each quoted, joined with ", ", in
key order. A row's warning is one part for each distinct (row, name) pair, and within a row the
names follow the position of each name's first entry. The full order is rows in order, then the
single block part.

*Why.* Joel approved the row-placed string in so many words; the block form is this design's wording,
because ruling 5 leaves it to the message table and requires it to be free of "cell"
(`council.md`, ruling 5). A positional form for an unknown name was never shown to Joel, so inventing
one would break D13. The current combined line is already false for a block-only name: those cells do
not render blank, because no cell holds the name (`michael-orientation.md` T8;
`tests/configuration.test.ts:961, 964, 970`).

*Alternatives weighed.* Today's one line (false for the block case, and it cannot place a row); a
position on the unknown-name form (never approved); deduplicating across rows (loses which row a user
must fix).

### 7. `containers` is deleted, not reworded

The notice goes, with both triggers and the `Notices.containers` flag. A top-level `containers`
becomes an ordinary unknown document key and is ignored silently (`council.md`, ruling 3).

*Why.* The key has not been read since 2026-11-03, so deleting it changes nothing that renders. Its
advice — "declare cells instead" — points at a key this same change rejects, and reworded it would
point at a shape no reader reads. Retired keys get their messages from decision 1; `containers` is
not one of them, because rejecting it would break a document that works today.

The tests and code this touches, by name as of `24ee86b` (`council.md`, ruling 3):

- delete "a document carrying containers is accepted and renders ten blank cells"
  (`tests/configuration.test.ts:253`);
- delete "two rows carrying containers still warn once per document" (`:266`);
- delete "containers beside a rows list warns once rather than passing silently" (`:549`);
- rewrite "containers and multiple unknown section names retain the accepted-notice order" (`:968`)
  to `{"instruments": {"nope": {}, "other": {}}}`, with no `containers`, asserting decision 6's
  block form with both names quoted and in key order. The string lives in decision 6, not here;
- `Configuration.warning`'s doc comment (`configuration.ts:64-67`) drops "or a `containers` key".

*Alternatives weighed.* Rewording (refused: a hint about a shape that rejects); adding `containers` to
the retired set (refused: a behaviour change for a key nobody reads).

### 8. Equal shares stay in the code, and leave the spec

`DISTRIBUTIONS`, `Row.distribution`, `width-plan.ts`'s equal branch and the renderer and width-plan
tests stay. The parser writes `"content"` and no document can ask for anything else. The statusline
delta states content sizing alone; the retained branch's only guarantee is those tests
(`council.md`, ruling 12).

*Why.* Joel ruled the code stays in case equal shares resurface. A spec scenario states what a user
or the host can observe, and no document selects a distribution, so a scenario would have nothing to
name (`proposal.md`, "Decisions this proposal takes"; `council.md`, ruling 12).

*Alternatives weighed.* Deleting the branch (D8 refuses); exposing a document-level `distribution`
(D8 and D3 refuse); keeping equal-share scenarios in the spec (they would describe behaviour no
input reaches).

### 9. "Cell" leaves the words, not the code

No user-visible string in this change contains "cell": not a message, not a key, not a README or
`docs/` sentence about what a user writes. `Cell`, `CellAlign`, `cellView`, `MAX_CELLS`,
`DEFAULT_CELLS` and `DEFAULT_CELL_TEXT` keep their names (D6, D11; `council.md`, ruling 5).

*Why.* Joel asked whether the overloaded term should reach users at all, and answered his own
question with no. Renaming the code's type would be change 2's kind of churn for no user benefit.

### 10. One atomic test migration, with hand-worked expectations

The parser change, the message rewrites and every fixture rewrite land as one group that ends green:
new-shape tests first and failing, then the parser, then the fixtures. Every affected test gets one
disposition, applied by this rule (`council.md`, rulings 8 and 15):

- **Delete it** when its subject is a retired shape: both shapes at once, a row id, `containers` (the
  tests decision 7 names), a row's own `distribution`, equal shares chosen by a document, the
  top-level row shortcut, or a row's `{}` default. That covers `tests/configuration.test.ts`'s tests
  of reading `distribution`, and four tests by name:
  - `tests/jefferson.test.ts`'s "configured formats, styles and a width-taking bar render end to end
    under equal distribution": its only difference from "configured formats, styles and a
    width-taking bar render end to end" is the key, so keeping it would make a second copy of that
    content case;
  - `tests/configuration.test.ts:51` "a top-level row object normalizes to one row", replaced by the
    first-written test of the "A lone `cells`" scenario;
  - `tests/configuration.test.ts:106` "a row omitting cells renders 10 cells" and `:112` "a row
    omitting cells holds ten blank cells", whose surviving subjects are already tested — the default
    row by `:99`, and one bound blank per document by `:444-453` and `:954-956`.

  A test with two subjects is split, and only the half whose subject is retired is deleted:
  `tests/jefferson.test.ts`'s "distribution equal restores equal shares end to end" loses its
  100-column half, whose cells take 34, 33 and 33, and keeps its 132-column half under the third
  bullet. The renderer and width-plan tests already own the equal geometry.
- **Keep it end to end, drop the key, and work its expectation out by hand from the content rule**
  when its subject survives the key's removal. That covers the two turn-boundary repaint tests, the
  four `${reason} replacement drops the old cwd` runs, and `tests/instrument.test.ts`'s totals test.
  The values, worked out by hand:
  - **Totals test** (`tests/instrument.test.ts:312-342`): a row of `cost` then `tokens` plans to 12
    and 68 at 80 columns, and `tokens` is the last left-aligned cell, so it absorbs the spare columns
    and keeps its joint. The line is `"Cost: $0.123 Tokens: 212".padEnd(80)`. `seen.length` is 6,
    because each cell is rendered at its probe (0), the host's measure (80) and its allocation;
    `scans` stays 1, and every `seen` entry is still the same totals object.
  - **Turn-boundary test** (`tests/jefferson.test.ts:738-756`): `"Tokens: 0 Cost: $0.000".padEnd(80)`,
    then `"Tokens: 212 Cost: $0.125".padEnd(80)`. The repaint and read counts do not change.
  - **Turn-boundary test** (`:758-767`): `"Tokens: 0".padEnd(80)` does not change.
  - **The four `${reason}` runs** (`:774-796`): the first install's line is
    `"old old-id 17 $0.125 high old old-id 17 $0.125 high".padEnd(80)`, the second install's is
    `"new new-id 212 $0.250 low new new-id 212 $0.250 low".padEnd(80)`, and the released footer's
    `" ".repeat(80)` does not change.

  Every value above was run against the 0.12.0 spelling with the key removed, and the parser keeps
  the entry path, so they carry over.
- **If dropping the key removes what a test observes, change the test's input** so that the content
  rule still exposes its subject. It is not deleted, and it does not move to a hand-built `Row`. Two
  tests land here.
  - The branch/session/status alignment test's subject is left, centre and right alignment inside
    spare columns. Under content sizing only a row's absorber has spare columns, so no single row can
    show both centre and right alignment; the worked example below is why the centred cell gets none.
    Its input becomes

    ```json
    {"rowGap": 0, "rows": [[{"instrument": "branch", "align": "left"}], [{"instrument": "session", "align": "center"}], [{"instrument": "status", "align": "right"}]]}
    ```

    with today's host data at 80 columns. Each entry is its row's only cell and takes all 80 columns,
    and the hand-worked expectations are: `Branch: main` at column 0 of line 1; `Session: docs` at
    floor((80−13)/2) = 33 of line 2; `Status: 3 tasks idle` ending at column 80 of line 3. Each
    assertion fails if its own alignment regresses. `tasks.md` records this input. It was measured
    with the 0.12.0 spelling, and the parser keeps the entry path, so the result carries over.
  - The 132-column half of "distribution equal restores equal shares end to end" becomes the test of
    the modified scenario "A right-aligned last cell at a width that does not divide evenly". Its
    input is the scenario's own: `{"rows": [[` nine `{"instrument": "blank"}` entries, then
    `{"instrument": "blank", "align": "right"}` `]]}`, at 132 columns. The fill cells share
    floor(132/10) = 13 columns with grow 1, and the host gives the remainder of 2 to the earliest
    cells, so the line is 132 columns, there are ten cells, the last is 13 columns, and the line's
    visible text ends with `truncateToWidth(DEFAULT_CELL_TEXT, 13)`'s text. `tasks.md` records the
    split.
- **Keep and split the precedence test.** `tests/configuration.test.ts` "error precedence reads the
  envelope and the rowGap before instruments and instruments before cells" (`:1082-1088`) survives,
  because the order of checks is its subject.

  - Delete `:1083` and `:1084`. Their subjects are retired shapes — the top-level row, and both
    shapes at once — and ruling 2 inverts `:1083` anyway, so it would otherwise duplicate `:1085`
    rewritten.
  - Replace them with two assertions that pin ruling 2's order, written through the file's own
    `rejected` helper (`:974-981`) and expecting decision 5's retired-key part:
    - `rejected({"cells": [{"instrument": "model"}], "rows": 42, "rowGap": 1.5, "instruments":
      42}, <retired-key part>)`, one document that carries a fault for the `rows` type check,
      `rowGap` and `instruments`;
    - `rejected({"id": "footer", "rows": [[]]}, <retired-key part>)`, one that carries a row fault.

    Both expectations come from ruling 2 and decision 5's table, not from a run.
  - Rewrite `:1085` under D3's reading to
    `{"instruments": {"model": {"format": 42}}, "rows": [[{"instrument": "model", "align":
    "middle"}]]}`. It keeps its expectation, because instruments are read before rows.
  - Rewrite `:1087` under rule (b) to `rows: [` ten `{"instrument": "blank"}` entries `]` beside
    the same `instruments` and `rowGap: 1.5`. It keeps its expectation, because `rowGap` is read
    before `instruments`.
  - "within a row the distribution is read before the cells list, and the envelope before any row"
    (`:1253`) and "a distribution beside a rows list rejects like a top-level cells or id" (`:1269`)
    stay deleted. Their envelope-first halves (`instrumentFirst`, `alsoBad`, `malformedRow`) are
    replaced by the two new assertions.
- **No end-to-end test moves to a hand-built `Row`**, which would duplicate the renderer tests and
  drop the document path the test exists to cover.

Two rewrites are mechanical, and ruling 15 requires them written down:

- **(a)** A 0.12.0 top-level row `{cells: X, …rest}` becomes `{rows: [X], …rest}` and keeps its
  expectation, unless it also wrote `distribution`, in which case the bullets above apply.
- **(b)** A row written as `{}` becomes ten `{"instrument": "blank"}` entries. That renders exactly
  what `{}` rendered, so no expectation moves.

Both rewrites apply only to a test whose subject survives. A test whose subject is one of the retired
shapes above is deleted instead, not rewritten.

*Why.* With no reader for the old shape, a parser-only group leaves most of the suite red, and a
fixtures-only group is red until the parser lands. The rule every kept expectation of columns and
text is recomputed from lives in the delta's requirement "A cell takes the width its content needs"
(`specs/statusline/spec.md`), which `planRow` in `components/row/width-plan.ts` computes; this change
edits neither. One worked example from that rule: at 80 columns a row of `branch` (left,
"Branch: main"), `session` (centre, "Session: docs") and `status` (right, "Status: 3 tasks idle")
plans 46, 13 and 21 columns, and the 21 carries the one-column joint, so the centred cell gets no
spare column. An expectation pasted from fresh output blocks at the implementation gate, so every
kept expectation of columns and text is recomputed from the rule — every kept row holds at least one
content cell, except the ten-`blank` row, where every cell fills and the all-fill agreement of
`council-critic.md` CR-8 is what fixes its 14-and-13 widths. Render-call counts do not come from that
rule: they follow the renderer's probe and its per-width text cache (`row-renderer.ts:37-55`, `:88-90`),
which `row-renderer.test.ts:895-898` already pins, and that is why the totals test's `seen.length` is
6.

*Alternatives weighed.* Two groups (red between merges); moving an end-to-end test to a hand-built
row (ruling 8 refused); leaving equal-share tests asserting text the content layout no longer
produces.

### 11. The documentation restructure: README, `docs/`, and the voice

**The rule the README follows.** The README keeps what a reader needs before the package works or
before a first pull request: what it is, its status, how to install it, one working configuration and
where the rest of the documentation is, the commands that run the suite, and the license. Everything
else moves under `docs/` (`owner-rulings.md`, 2026-11-15, "The README and docs/";
`research-eleanor-docs.md` §1).

| README today | Where it goes |
|---|---|
| `# pi-jefferson`, `## Status`, `## Install` (1–30) | Stay. The image stays at `docs/images/jefferson-cosmic-star-dragon.png`. |
| `## Configuration` (31–209) | The file's location, the document's shape, `rows`, entries, `align`, `rowGap`, the `instruments` block, rejection and the upgrade note move to `docs/configuration.md`; the instrument tables and their options move to `docs/instruments.md`; formats, variables, forms, styles and `$bar` move to `docs/formats.md`. The README keeps one working document and a link. |
| `### The notice instrument` (210–270) | `docs/notices.md`. |
| `## Why another statusline` (271–281) | Stays, shortened. It is the one thing a user reads before installing. |
| `## Development` (282–307) | The two commands stay, because a contributor needs them before opening a pull request. |
| `### A workstation cannot publish` (308–314), `## Releasing` (315–334) | `docs/releasing.md`. |
| `## License` (335) | Stays. |

**What the README gains.** A `## Documentation` section that lists the four configuration-and-model
documents and `docs/releasing.md`, plus the extension-author guide once the registration change
writes it. The list does not link a page that does not exist (D13).

**The home for extension authors.** The structure is a flat set of topic documents. The registration
change adds `docs/extension-authors.md` and one line to the README's index; this change writes no
placeholder, because a page that promises what does not exist is the inventing D13 rules out. The
name is fixed here so both changes use one word for the same thing.

**The voice.** The docs pass writes these documents under `what-the-fork`'s rules — Simplified
Technical English, one idea per sentence, active voice, present tense, and the same word for the same
thing every time — and in `my-voice`'s terse-operational register, because the audience is engineers
using a development tool. The fixed vocabulary is "row", "entry", "instrument", "variable", "format"
and "notice"; a stored list is "a list", never an "array". The upgrade note leads with the fact, as
the disclosure samples do: the key that no longer works, then what to write instead, then what
happens if they do nothing. Accuracy outranks voice: every command, path and default comes from the
code or a task's evidence, and a command the change did not run is labelled untested.

*Why.* Joel asked for this in his own words — an "essential" README, "a logical abstraction of
sections", and writing "those with /skill:what-the-fork verbiage through /skill:my-voice". The split
above is the smallest one that gives each document one job and leaves the author guide a home.

*Alternatives weighed.* A single `docs/configuration.md` holding all 240 lines (refused: the dumping
ground moves rather than being fixed); keeping `Development` and `Releasing` in the README (the
README keeps the commands, but the label rules and the publishing trap are maintainer detail, not
essentials); creating `docs/extension-authors.md` now (refused: it would document a contract that
does not exist yet).

### 12. Two ADRs, and the one body they narrow

`docs/adr/0015-cell-is-no-longer-a-word-users-see.md` records the vocabulary retirement, as the
2026-11-15 ruling requires and as `AGENTS.md` says a retired rule is recorded.
`docs/adr/0016-the-equal-distribution-stays-in-the-code.md` records why the branch survives with no
way in. Each has a `Status:` line that names what it narrows: 0015 retires the user-facing half of
the 2026-11-03 ruling, 0016 narrows ADR 0007's `distribution` row option and leaves ADR 0002's equal
layout reachable only from code. ADR 0007's body is not edited; its `Status:` line moves
(`council.md`, ruling 12; `michael-orientation.md` §1, ADR convention).

*Why.* One decision per file, and an accepted ADR's body is never edited.

*Alternatives weighed.* One ADR for both (they answer different questions: what a word means, and why
dead-looking code stays). Whether they merge is the docs pass's call, and they are planned as two.

### 13. The release is a minor version

The PR carries `release:minor`, applied by whoever opens it — the conductor, not a coder and not Joel
(`council.md`, ruling 14). From 0.12.0 a minor bump releases 0.13.0, which is right for a breaking
change before 1.0.0 (SemVer rule 4; `research-chidi.md` §3). An unlabelled PR releases as a patch
(`release.yml:57-59`).

*Alternatives weighed.* `release:major` would cut 1.0.0, and Joel said "getting closer to a 1.0.0",
not there. No label ships this break as 0.12.1.

## Risks / Trade-offs

- **A 0.12.0 document renders the placeholder row in silence.** `{"cells": [{"instrument": "model"}]}`
  has no `rows`, so without the guard nothing is rejected and the user sees ten blanks with no word.
  → Decision 1's guard, its retired-key scenarios, and `tests/jefferson.test.ts`'s rewritten documents
  all fail if the guard weakens.
- **A migrated document is one bracket short.** `{"rows": [{"instrument": "model"}]}` puts an entry
  where a row belongs. → The row message shows the whole form, which contains the entry form
  (`council.md`, ruling 9).
- **Two unknown names and a block name arrive as one toast.** A user sees `row 1: …; row 3: …; the
  instruments block …` in one notification. → The join order is fixed by decision 4 and asserted;
  change 2 reads the same data instead of re-parsing the document.
- **A message keeps the word "cell".** Any string missed leaves D6 half-done, and the README's own
  examples would reintroduce it. → The deleted-parts list in decision 5 is exhaustive against
  `research-eleanor.md`'s message inventory, and the docs pass greps the README and `docs/` for the
  word.
- **An expectation is pasted from fresh output.** A test that asserts whatever the new code prints
  passes while proving nothing. → Decision 10 names each test's disposition, and every kept
  expectation of columns and text is recomputed from the content rule: the kept rows hold content
  cells, and the one all-`blank` row fills, which that rule sizes as the equal branch would.
- **The suite is red between merges.** A parser-only or fixtures-only grouping leaves a red `main`. →
  Decision 10's single group.
- **The README drops a fact nobody carried across.** The configuration reference is 179 lines of
  detail. → Decision 11's mapping table is the checklist: each README section either stays or lands
  in a named document, and the docs pass verifies each row.
- **A surface edit goes out as a patch.** A forgotten label ships a break as 0.12.1. → Decision 13.
- **Rollback strands migrated documents.** A revert puts the 0.12.0 reader back, and a new-shape
  document then rejects: `row 0 is not an object`. → The rejection names the row, and the release note
  says what the old shape writes. It is recoverable by editing the document, never by data repair,
  because the document is the only stored state.

## Migration Plan

**In the PR, before merge.**

1. The spec deltas are already in `openspec/changes/reshape-the-configuration/specs/`.
2. Tests first: the new-shape parsing tests and the rejection tests, red against today's parser.
3. `configuration.ts`: the retired-key constant and guard, the optional `rows` list, the row and
   entry checks, the message table, `Notices` as data, and the deletion of `isDistribution`, the
   `containers` notice and the `cells`/`id`/`distribution` handling.
4. `row.ts`: remove `id`; keep `distribution`.
5. The fixtures and the message assertions, one group, ending green with `pnpm test` and
   `pnpm typecheck`.
6. Open the PR with `release:minor`.
7. After the implementation gate, the docs pass lands on the PR's branch, before Validate begins: the
   README cut, the four `docs/` topic documents, `docs/releasing.md`, `AGENTS.md`, `ARCHITECTURE.md`,
   ADRs 0015 and 0016, ADR 0007's `Status:` line, and the statusline spec's Purpose, edited by hand.
8. After Validate, the archive runs on the PR's branch, merging both deltas into the living specs.
   The docs pass comes first, so the Purpose edit is in place before the merge touches that file; the
   merge keeps a Purpose and replaces requirement blocks.

**After merge, only the release.** The push to `main` runs typecheck and test, publishes 0.13.0 to
npm with the merged commit's README, and tags the release with generated notes.

**Why this order.** The release workflow publishes on every push to `main` (`release.yml:3-5`), and
the published tarball carries `README.md` (`package.json`'s `files`). A docs or archive commit pushed
after merge would publish this break beside a README that teaches the rejected shape, and would then
cut its own patch release. The conductor workflow already places both steps on the PR's branch: the
docs pass runs after the implementation gate and before Validate begins (`SKILL.md:70`), and the
archive runs there too, so that it reaches `main` with the code (`SKILL.md:74`). The label is applied
when the PR opens, which is step 6.

**Rollback.** Revert the parser commit and release a new minor. A document written in the new shape
then rejects: the 0.12.0 reader sees a row that is not an object and reports `row 0 is not an object`.
No stored data migrates, so nothing else needs undoing, and a user recovers by editing the document.

## Open Questions

Nothing here blocks the tasks or changes the specs, and nothing here is Michael's to settle: both
items are calls the docs pass makes when it reads the prose, and either answer leaves every rule,
file list and task unchanged.

- **Whether Development and Releasing both stay in the README.** Decision 11 keeps the two commands
  and moves the release detail. If a reviewer wants the README to carry no contributor prose at all,
  the commands move to `docs/developing.md` and the README links it. It changes no rule and no code.
- **Whether `docs/formats.md` earns its own page.** The split assumes the configuration reference
  holds enough formatting detail to fill one. If it turns out thin, its content joins
  `docs/instruments.md` and the README's index loses a line. The docs pass, which reads the prose,
  decides.

No item needs Michael before tasks.