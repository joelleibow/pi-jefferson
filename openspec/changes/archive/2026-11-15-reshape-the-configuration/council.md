# Council Synthesis

Seven lenses convened over `research-chidi.md`, `research-eleanor.md`, `proposal.md`,
`specs/statusline/spec.md`, `specs/extension-source-layout/spec.md`, `michael-orientation.md` and
`owner-rulings.md`. Their reports are `council-zoom-out.md`, `council-critic.md`,
`council-structural.md`, `council-readiness.md`, `council-codebase.md`, `council-comprehension.md`
and `council-catalyst.md`. Michael settled every dispute in `michael-council-rulings.md`; his
rulings are numbered 1 to 15 there in filing order, and this file uses those numbers. Nothing here
is a ruling. Where this file states a decision, it is Michael's, cited to that file.

## Question and Scope

**The question.** A row in `pi-jefferson.json` is an object carrying `cells`, and each entry in that
array is an object naming an instrument (`research-eleanor.md`, "Parser and source selection"). This
change makes a row a plain list of entries, `[{ "instrument": "model" }, { "instrument": "context",
"align": "right" }]`, so that the two changes after it — instrument registration over `pi.events`,
and pi's spinner — build on one shape. Joel settled the shape, the retirement of the one-row
shortcut, the vocabulary, the warning forms and the fate of `distribution` on 2026-11-15
(`owner-rulings.md`).

**What is fixed going in.** `rows` holds the rows and a row is a list (Joel: *"couldn't rows be a
list of lists of objects and we dont need the instruments per row?"*); `align` stays on the entry
(*"the left, right, and center would be on the instrument object?"*, answered yes); "cell" leaves
the words a user reads and not the code; a warning calls an entry an instrument and places it by
row and position; `distribution` leaves the configuration while its code stays (*"we should keep
the code in place though, in case it resurfaces"*); the top-level `instruments` block keeps its name
and its job. Breaking is allowed (*"we're safe to break things but we're getting closer toa
1.0.0"*). The one-row shortcut is retired; Joel answered *"a"*. Warnings count from 1.

**What was open.** How a retired document is answered and which keys trigger it; what `rows: []` and
a settings-only document do; the unknown-name message forms and their cardinality; whether `Row.id`
survives; whether the `containers` notice survives; how the test migration groups; whether the docs
pass can reach `openspec/specs`; whether `/jefferson` should report a rejection; whether equal shares
belong in the spec and what the ADR covers; three wording defects in the delta; who applies the
release label.

**Inputs.** The delta has 7 ADDED requirements, 3 MODIFIED blocks that keep every baseline scenario,
and 7 REMOVED requirements; the proposal names the parser, the tests, the documentation and the
release label as impact. Both artifacts passed `openspec validate --strict` before the council ran.

## Lens Findings & Trade-offs

**Two lenses found nothing to change.** Zoom Out found no blocker: this is a document-boundary
simplification, not a new subsystem, and validation, normalization and the migration diagnostics
belong where they already are, in `extensions/jefferson/configuration.ts`, reusing `cellsFromNames`,
`readInstruments`, `instrumentBindings` and the existing rejection and default-row path
(`council-zoom-out.md`). It asked that the `Row.id` and `containers` cleanups be settled in design
rather than propped up for hypothetical uses. Catalyst found no false compromise: the proposal
already separates the simpler configuration surface from the retained renderer capability, keeps the
migration diagnostics without a compatibility reader, and defers registration and the spinner
(`council-catalyst.md`); it warned only that preserving the direct renderer tests must not discard
unrelated integration coverage.

**One major contradiction, raised by four lenses.** The retired-key rule is stated differently in
the proposal and the delta, and the boundary cases are unpinned (`council-critic.md` CR-1,
`council-structural.md` S-2, `council-readiness.md` R1, `council-codebase.md` CB-1,
`council-comprehension.md` C2). The proposal says a top-level `id` or `distribution` rejects with no
condition; the delta's scenarios reject them only *beside* `rows`, and a lone `{"distribution":
"equal"}` — a valid 0.12.0 one-row document, exercised today at `tests/configuration.test.ts:1220`
— falls between "the retired single row" and "No rows declared". A top-level `cells` beside `rows`
has no scenario either, though the old reader rejected it with a "both shapes" message
(`tests/configuration.test.ts:72, 537, 1084`). Nobody states which message wins when a retired key
sits beside a bad `rowGap`. The risk is the one orientation T3 names: a document quietly rendering
the placeholder row instead of the promised migration hint.

**A second boundary case, raised by three lenses.** `rows: []` has no scenario
(`council-critic.md` CR-4, `council-readiness.md` R2, `council-comprehension.md` C1), and the
requirement said both that every document MUST declare its rows and that a document with none
renders the default. `rows: []` renders the default row today (`configuration.ts:318-320`,
`tests/configuration.test.ts:100, 1370`), so the omission invites an implementer to reject it.

**The warning contract, raised by four lenses.** `Configuration.warning` is one `string |
undefined` and `acceptedWarning` joins notices with "; " (`configuration.ts:64-74, 336-350`;
`startup.ts:73`), while the approved placements imply one message per offender
(`council-codebase.md` CB-4, `council-readiness.md` R3, `council-comprehension.md` C3,
`council-critic.md` CR-2). CB-4 noted that two unknowns in two rows plus a name in the block need
two or three placements the single string and the single `notify` cannot carry without a stated
rule. CR-2 read Joel's two approved examples as two kinds of message rather than a conflict, and
noted that a name only the block configures today gets a message claiming "those cells render
blank", which is false for it.

**The `containers` notice, raised by five lenses.** Its text is "carries the containers key, which
is no longer read; declare cells instead" (`configuration.ts:339`). Retiring object rows makes its
row-level trigger unreachable and leaves a top-level trigger whose advice points at a key this same
change rejects, in a word D6 retires (`council-critic.md` CR-1, `council-structural.md` S-3,
`council-readiness.md` R7, `council-codebase.md` CB-2, `council-comprehension.md` C5). No baseline
requirement mentions `containers`, so no spec home existed for keeping it or rewording it.

**`Row.id`, raised by three lenses.** The proposal put all of `components/row/` under "must not
touch" while leaving T7 open, and Michael's preferred answer removes `Row.id`
(`council-readiness.md` R4, `council-codebase.md` CB-3, `council-structural.md` S-4). CB-3 counted
the cost of a late decision: the field is constructed in four test files, not the one any artifact
named, and `pnpm typecheck` fails on the unlisted ones. S-4 observed that a synthesized `row-0`
would sit beside warnings that count from 1.

**The migration is all-or-nothing, raised by two lenses.** With no reader for the old shape, a
parser-only group turns most of the suite red, and a fixtures-only group is red until the parser
lands (`council-readiness.md` R5, `council-critic.md` CR-8). CR-8 measured that in a row where every
cell fills, `planRow`'s content and equal branches agree — `slack` equals the width, each cell takes
`floor(W/N)` with grow 1 and no joint — so some `distribution: "equal"` tests keep their expectation
and others must be recomputed from the content rule rather than pasted from output. R6 added what
the Migration Plan has to say: no auto-rewrite, a rejection that falls back to the default row and
not to the agent document, a toast that names the path and recurs every session start, and the
rollback story.

**The dangling cross-spec citation, raised by three lenses.** `extension-source-layout`'s
export-surface requirement argues its pin against statusline's "Cell content comes from an
instrument" (`extension-source-layout/spec.md:207`), which this delta removes
(`council-structural.md` S-1, `council-codebase.md` CB-8, `council-readiness.md` R9). S-1 called it
major because the docs pass the proposal named covers repository documentation, while a living
spec's requirement text changes only through a delta. It is prose, so no validator catches it.

**Three wording defects and a budget, raised by two lenses.** The entries requirement said a row's
length MUST be both its cell count and the entry at each position, which does not parse, and then
truncated a longer list at ten, so one accepted input implied both twelve cells and ten
(`council-comprehension.md` C4, `council-critic.md` CR-5). `rowGap: 0` was promised to render "as it
rendered before this change", which in a re-added requirement now points at the wrong change
(`council-critic.md` CR-6). R8 put the entries requirement near the 500-character limit and asked
for a machine measurement; S, CR and CB put it lower.

**Smaller findings.** The row-object hint is written only for the pre-change row object, while the
likeliest new mistake — a flat list of entries one bracket short — arrives at the same check
(`council-critic.md` CR-3). A rejection reports only the first offender, so migrating a multi-row
document costs a reload per row (CR-7). `{}` was the only way to ask for ten placeholder cells in a
declared row and the new shape has no equivalent, with about fifteen test documents using it
(`council-codebase.md` CB-5). The export pin is exact, so a new export breaks it with no behavioural
fault (`council-codebase.md` CB-7). The statusline Purpose still says "evenly divided cells" and a
delta cannot reach it (`council-critic.md` CR-9, `council-readiness.md` R9). And a rejected document
is observable once and never again, because `/jefferson` reports only a row count
(`council-codebase.md` CB-6, `council-readiness.md` R6).

**One owner question was raised and withdrawn from Joel's desk.** CB-6 asked whether a rejection
should stay diagnosable and proposed `/jefferson` report the outcome; Michael answered it himself
(ruling 11).

## Synthesis & Recommendation

Proceed to design. The shape is settled and the delta is structurally sound: all 7 REMOVED names
match the living spec exactly, all 3 MODIFIED blocks keep every baseline scenario, no ADDED name
collides, and the delta validates strict. No lens found a blocker, and no lens contested any of
Joel's rulings.

The recommended direction is the one zoom-out and catalyst both endorsed. The work stays inside
`extensions/jefferson/configuration.ts`: one constant naming the retired top-level keys, checked
right after the document-is-an-object check; one optional `rows` list; the entry rules the parser
already enforces; and the messages rewritten where they are built, with the unknown names kept as
data so change 2 can hold the report back. Nothing new is invented: no compatibility reader, no
schema framework, no registration abstraction, no directory, no new export. The renderer, its two
distributions, `DISTRIBUTIONS` and the store stay as they are, and the only edit inside
`components/row/` is the removal of a dead field.

The design then owns seven things: the message table and the order joined messages appear in; the
Migration Plan; the test dispositions that make the migration one group that ends green; the file
list including the not-touch boundary narrowed to what D8 protects; the follow-ups the docs pass
must carry (README, `AGENTS.md`, `ARCHITECTURE.md`, the statusline Purpose, the ADRs); the
`release:minor` label in the plan; and the two ADRs' scope.

## Accepted & Rejected Feedback

**Accepted.**

| Finding | Why |
|---|---|
| CR-1, S-2, R1, CB-1, C2 — name the retired set and pin every boundary case | Ruling 1 adopts the set `cells`, `id` and `distribution`, unconditional, one constant, four scenarios in place of two, and a qualified "No rows declared" |
| R1, CB-1 — fix the check order | Ruling 2 runs the retired-key check before `rowGap`, `instruments` and the rows |
| CR-7 — let the user fix every retired key in one edit | Ruling 2 meets it with one fixed message naming all three, refusing collect-all-errors machinery |
| CR-2 — read Joel's two examples as two message kinds | Ruling 5 adopts the literal reading |
| CB-4 — state the warning's cardinality | Ruling 6 keeps `string | undefined` with a stated join order and keeps the unknowns as data |
| R3, CR-2 — keep unknown names as data for change 2 | Ruling 6 does |
| CR-4, R2, C1 — pin `rows: []` | Ruling 4 adds the scenario and makes `rows` optional |
| R4, CB-3, S-4 — settle T7 | Ruling 7 removes `Row.id` and the dead check |
| R5, CR-8 — one atomic green group, and sort the equal-share tests | Ruling 8 adopts the grouping and the two dispositions |
| CR-3 — make the hint serve both mistakes | Ruling 9 shows the whole form, which contains the inner form |
| S-1, CB-8 — a fix path that can edit a living spec | Ruling 10 adds a one-requirement `MODIFIED` delta for `extension-source-layout` |
| S-5 — record why the retained branch stays | Ruling 12 puts it in `docs/adr`, and narrows ADR 0007's status |
| C4, CR-5 — the entries requirement must parse | Ruling 13 fixes it |
| CR-6 — `rowGap: 0` must not point at the wrong change | Ruling 13 rewrites it as "no empty line between rows" |
| R8 — measure, do not estimate, the length budget | Ruling 13 measures and sets the budget |
| R6, T12 — the release label | Ruling 14 settles minor and assigns the label to whoever opens the PR |
| CB-5 — a placeholder row | Ruling 15 states there is no shorthand |
| CR-9, R9 — the stale Purpose and citation | Ruling 10 keeps the Purpose in the docs pass and records it as a design follow-up |

**Rejected.**

| Finding or option | Why |
|---|---|
| S-2's alternative: narrow the retired-key rule to "beside `rows`" | Ruling 1 refuses it: `{"distribution": "equal"}` would quietly render the placeholder row, the trap orientation T3 names |
| CR-1's and CB-1's inclusion of `containers` in the retired set | Ruling 1 keeps it out; ruling 3 explains why rejecting it would break documents that render correctly today |
| CB-2's option to keep reading `containers` with the current string, or to reword it | Ruling 3 deletes the notice and the flag; the wording contains a retired word, and a reworded hint would point at a shape no reader reads |
| C3's form for unknown names with a position | Ruling 5 refuses it: Joel was never shown that form, and D13 rules out inventing a third |
| R3's proposal to extend the placement requirement to cover warnings | Ruling 5 keeps it scoped to rejections and puts the unknown-name forms in the scenarios that own them |
| R4's pick: keep `Row.id` untouched | Ruling 7 removes it; no renderer test reads `id`, and D8 covers distribution support only |
| R5's option (b): move an end-to-end test to a hand-built `Row` | Ruling 8 refuses it: it would duplicate the renderer tests and drop the document path the test exists to cover |
| CB-6's recommendation to report the outcome in `/jefferson` | Ruling 11 refuses it: the toast already names the file and recurs at every session start, and a lasting diagnostic is a card of its own |
| CB-7's implied budget for new exports | Not adopted as a change of plan: ruling 6 keeps the message table and helpers private to `configuration.ts` and leaves the export pin where it is |

## Michael's Rulings

Michael's file is `michael-council-rulings.md`. Each entry below is his ruling and what decided it;
the numbers are this file's, in that file's order.

1. **Which top-level keys mark the retired one-row form.** The retired set is exactly `cells`, `id`
   and `distribution`, held as one constant beside the envelope check. Any of them at the document's
   top level rejects, whether or not `rows` is present, including `cells` beside `rows`. The
   proposal's unconditional bullet was right and the delta changes: two scenarios become four — a
   lone `distribution`, a lone `id`, a lone `cells`, and `cells` beside `rows` — and "No rows
   declared" is qualified to "no `rows` and no retired key". *Decided by* Joel's orientation answer,
   which carries no condition, and the 0.12.0 reader, which treats a document without `rows` as a
   row (`configuration.ts:298-300`) and tests exactly those three keys at `:286`.
2. **Which message wins, and what it says.** The check runs first, right after the
   document-is-an-object check and before the `rows` type check, `rowGap`, `instruments` and any row.
   It raises one message for any combination of retired keys, showing the full form
   `{"rows": [[{"instrument": "model"}]]}`, letting the user fix every retired key in one edit, and
   containing no "cell". The exact words belong in the design's message table, which marks the form
   as a literal constant. *Decided by* the existing envelope-first order (`configuration.ts:284-292`
   before `:307` and `:316`), orientation T4, and Joel's D6.
3. **The `containers` notice.** It goes, with both triggers and the `Notices.containers` flag. A
   top-level `containers` becomes an ordinary unknown document key, ignored silently. It does not
   join the retired set, and rewording is refused. The design names the tests: three deleted,
   `configuration.test.ts:968` rewritten, and the `Configuration.warning` doc comment narrowed.
   *Decided by* the deletion test — the key is not read, so nothing that renders changes — the
   notice's provenance as a design decision rather than an owner ruling, and D6 with D13.
4. **An absent `rows`, `rows: []`, and a settings-only document.** `rows` is optional; when present
   it is the only way to declare rows. Absent with no retired key, empty, and empty beside settings
   all render the default row with no warning. `rows: [[]]` stays rejected. *Decided by* current
   behaviour (`configuration.ts:318-320`), the delta's own MODIFIED text, and orientation §5.
5. **Joel's two approved examples.** They do not conflict; each takes his literal string. A
   rejection of one entry is `row N, instrument M:`, M counting every entry including those past the
   tenth. A rejection of a whole row is `row N:`. An unknown name in a row reads `row N: "<name>"
   is not a known instrument`, placed by row and never by position, once per distinct (row, name),
   in row order. A name only the `instruments` block configures gets a form of its own with no row,
   which must not claim a cell renders blank, wording in the design's message table and free of
   "cell". A name in both is reported by each, with no deduplication. The placement requirement
   stays scoped to rejections; the unknown-name forms live in the scenarios that own them.
   *Decided by* Joel's approval of both strings, D13, and "both numbers count from 1".
6. **How many warnings an accepted document produces.** `Configuration.warning` stays `string |
   undefined` and `startup.ts` keeps its single `notify`. Placed messages join with "; " after the
   `pi-jefferson: <path> ` prefix. The design states the order; Michael's pick is row-placed names in
   row order, then block names in document order. Inside `configuration.ts`, `Notices` holds the
   unknowns as data — (row, name) pairs and block names, not a joined set — so change 2 can hold the
   report back. The message table and helpers stay private, the export pin does not move, and
   `DISTRIBUTIONS` stays exported. *Decided by* D13, D9 and orientation T8.
7. **`Row.id` goes.** Remove the field, its handling in `defaultRow` and `normalizeRow`, and the
   duplicate-id loop; delete the four id tests; strip `id:` from the hand-built row literals in
   `tests/row-renderer.test.ts`, `tests/format.test.ts:179` and
   `tests/session-data-feed.test.ts:303`, with no assertion changed. The proposal's no-touch line
   narrows to what D8 protects. *Decided by* the deletion test — no document can set `id` — and D8's
   scope, which names distribution support, not `Row.id`.
8. **The migration's grouping.** The parser change, the message rewrites and every fixture rewrite
   are one task group that ends green, with the new-shape tests written first and failing. Each test
   that writes `distribution` gets one disposition: delete it when its subject is equal shares from a
   document; otherwise keep its subject end to end, dropping the key where every cell fills and
   working the expectation out by hand from the content-sized rule where they do not. No end-to-end
   test moves to a hand-built `Row`. *Decided by* Joel's answer that the old form is rejected with no
   reader for it, the implementation-gate rule against pasting expectations, and D8.
9. **The hint for a member of `rows` that is an object.** One message serves both mistakes: it says
   each row is a list, shows the whole form, which contains the inner form, and adds no third
   reader. *Decided by* D13 and Joel's refusal of option (c), which makes a flat list a mistake to
   correct rather than a shape to read.
10. **Does the docs pass reach `openspec/specs`?** It is minor, not major, because the remedy changes
    no code. The citation is fixed inside this change with a one-requirement `MODIFIED` delta that
    copies the block whole and points it at "Cell text is the instrument its entry names", so the
    removal and the correction land together at archive. The proposal adds
    `extension-source-layout` to its Modified Capabilities. The statusline Purpose cannot be reached
    by a delta, so the docs pass edits it by hand and the design lists it as a known follow-up.
    *Decided by* Joel's standing ruling that documentation never blocks a feature, and the CLI's
    behaviour that an existing spec's Purpose is ignored in a delta.
11. **Should `/jefferson` report a rejection?** No: it stays untouched in this change. The rejection
    toast already names the file and fires again on every `session_start`, `reload` included, so a
    user who missed it sees it again. This change does not weaken that signal; a `/jefferson`
    diagnostic would be new behaviour outside the card's scope, and if Joel later wants one it is a
    card of its own. *Decided by* D1's scope, D13, and the measured behaviour of the toast.
12. **Equal shares and the ADR.** Equal shares stay out of the spec: a scenario states what a user or
    the host can observe, and no document can select equal shares. The retained branch is guarded by
    the renderer and width-plan tests D8 keeps, and why it stays goes in `docs/adr`, with its Status
    line narrowing ADR 0007's row option. The vocabulary retirement also gets an ADR; one or two is
    the docs pass's call. *Decided by* D8, `AGENTS.md`'s "Where decisions live", and Joel's standing
    documentation ruling.
13. **Three wording defects and the budget.** The entries requirement says the first ten entries are
    the row's cells in their order, that every entry is validated, and that an unknown name past the
    tenth still warns. `rowGap: 0` renders no empty line between rows, and the scenario says the
    same. The measured longest ADDED body is 456 characters, so the budget is met; every new rule
    goes in scenarios, which do not count toward the limit. *Decided by* measurement with OpenSpec's
    own extractor, the 500-character limit, and the delta's own ceiling scenario.
14. **Who applies the release label.** The bump is minor and settled. Applying `release:minor` is
    part of opening the PR, which is the conductor's step — not a coder task and not a question for
    Joel. `release:major` would be wrong: from 0.12.0 it cuts 1.0.0, and Joel said "getting closer to
    a 1.0.0". *Decided by* Joel's words, the repository's precedent on breaking PRs, and
    `release.yml`'s behaviour that no label means a patch.
15. **How a placeholder row is written now.** There is no shorthand and Joel need not be asked: a row
    lists the entries it wants, so `[{"instrument": "blank"}]` is one blank cell that fills the row,
    ten placeholders take ten entries, and an empty row stays rejected. The design states what each
    affected assertion becomes, worked out by hand, and the README upgrade note mentions rows that
    were written as `{}`. *Decided by* D3, the unchanged empty-row rejection, and D13.

## Owner Decisions Required

None.

All 15 disputes went to Michael as the change's resolver, and he settled every one without marking
any `joel` (`michael-council-rulings.md`). No new material trade-off survives that `owner-rulings.md`
does not already settle: the shape, the shortcut retirement, the vocabulary, the warning forms, the
fate of `distribution` and the numbers counting from 1 are all Joel's rulings of 2026-11-15, and
every question the council raised resolves against one of them. `council-codebase.md` CB-6 raised its
`/jefferson` question as Joel's; Michael answered it in ruling 11 as a scope question belonging to
the change, and it is not carried here.
