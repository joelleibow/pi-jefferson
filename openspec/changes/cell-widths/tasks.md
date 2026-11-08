# Tasks

Citations: **[R]** `owner-rulings.md`; **[D n]** `design.md`, decision n (Michael approved it in round 3, run
`e9183da7-e5a9-4dbe-8209-1df945a98b3e`); **[Spec: name]** a requirement or scenario of this change's delta
`specs/statusline/spec.md`; **[E §n]** `research-eleanor.md`; **[EA x]** its "Eleanor addendum 1" (measured answers,
item x); **[CA §n]** `research-chidi.md`, "Chidi addendum 1"; **[M n]** `michael-orientation.md` item n; **[council]**
`council.md`. Test line numbers are at the base commit `4b87494` (the commit the branch had when the plan was
approved; `905b14c`'s parent line is not the base); the tests are cited by name.

## How to read the tasks

- **Vocabulary.** A row holds cells and a cell holds an instrument [R 2026-11-03]. Cell notation in a test input:
  `L15` is a left-aligned content cell whose text is 15 columns; `R` right, `C` centered; `F` a filling cell (its
  `fills` fact is true, whatever its text); `L0` an empty cell. A plan output is `[basis…]` with `grow` and joint flags.
- **Fakes are at the boundary, never the thing under test.** A test's instrument is a fake `Instrument` (`render`
  returns a fixed string or counts its calls) and the theme is `tests/fake-theme.ts`. The real `createFooter`, pi-tui's
  `HStack`/`VStack`, `visibleWidth` and `truncateToWidth` run as they do in the existing tests [EA B5, E §7]. The width
  plan is a pure function and is tested with no pi-tui at all.
- **Red, then green, the suite still green.** Each task writes its test first and watches it fail for the reason the
  task names; after each task `pnpm typecheck` and `pnpm test` pass (baseline: 257 tests, 257 pass [E §7, EA A5]). A task
  that is characterization (its test is green on first run because the design adds no code for it) says so.
- **Mutations are unmeasured.** Each "Mutation" line names a deliberate break and the test that must turn red. None has
  been run: Derek applies each to the finished code, reports which named test went red, and says so where one stays
  green; nothing is claimed for a mutation that stays green. The **measured** results are the checks below [EA A1-A5].
- **Joel's two rows are checked on a scratch agent directory.** `useTempAgentDir` + `writeAgentDocument` and
  `harness().start({ cwd })` [EA B3]. No task reads or edits `~/.pi/agent/pi-jefferson.json` [R 2026-11-06].
- **Logging and error handling.** The change adds no use case, adapter or entry point. The one new error is the
  configuration option's whole-document rejection; its warning text is tested in 1.3 and 1.5, through the existing
  `readConfiguration` warning path [E §5]. The width plan and the footer do no I/O, and no log line is added anywhere.
- **Markdown documentation is not a task.** The README `cells` section, `ARCHITECTURE.md`, ADR 0002's consequences and any
  new ADR belong to the docs pass after the implementation gate. No task merges, pushes or fast-forwards.
- **No task edits a spec.** The two MODIFIED paragraphs that sit at 496 characters are Bambadjan's and Michael's; any
  later wording change to the delta is re-measured by whoever makes it, and does not happen in this list.

**Checks the tasks cite** (run from the repository root, `BASE=4b87494`). Each was run red and green on the real tree by
Eleanor, in a scratch copy [EA A1-A5].

- **A1** `git diff -U0 $BASE -- tests/ | grep -E '^-.*assert'`: silent on the unmodified tree; prints
  `-  assert.equal(visibleWidth(line), 80);` after one assertion is weakened; silent when only a fixture line
  (`id: "row-0",`) gains `distribution: "equal"`. Any line it prints is a removed assertion.
- **A2** `git diff -U0 $BASE -- tests/ | grep -E '^-[^-]'`: silent on the unmodified tree; prints every removed line,
  fixture lines included.
- **A3** `git diff --name-only $BASE -- '*.md'`: silent on the unmodified tree; prints `README.md` after an edit. The
  only path it may print at the end is `openspec/changes/cell-widths/tasks.md`.
- **A4** `grep -nE " from [\"']|import\(" <file>`: prints lines on `visuals/row-renderer.ts`; silent (exit 1) on a file
  with no imports. It must be silent on the width plan's file.
- **A5** The recipe for running the suite against pi-tui 1.5.0 in a scratch copy, in task 9.3.

## 1. The row option, `distribution`

The row option [R 2026-11-07 "The default"; D5]: its tuple, the row field, the read, the rejection. Files: `visuals/row.ts`,
`configuration.ts`; tests in `tests/configuration.test.ts`, `tests/row-renderer.test.ts`, `tests/jefferson.test.ts`.

- [ ] 1.1 **Every row carries a `distribution`, `"content"` by default.** Test first (`tests/configuration.test.ts`, with
  the bound rows read through `readConfiguration`): a row that declares no `distribution` reads `"content"`; `"content"`
  reads `"content"`; `"equal"` reads `"equal"`; a top-level row document (no `rows` list) declaring `"equal"` reads
  `"equal"`; the default row (an absent file, and a rejected document) reads `"content"`. Boundaries: absent, both values,
  the top-level row document, the default row. Red because `row.distribution` is `undefined`. Deliverable: the tuple
  `DISTRIBUTIONS = ["content", "equal"] as const` and `Row.distribution` in `visuals/row.ts` (mirroring `ALIGNMENTS`),
  the read beside `cells` and `id` in `normalizeRow`, and the default row carrying `"content"` [D5; E §5]. Verify:
  `pnpm test` shows the new test green. Mutation: the read defaults to `"equal"` and the absent case turns red.
  Source: [Spec: The row option's values], [D5].
- [ ] 1.2 **Test fixtures that build `Row` literals declare `distribution: "equal"`, expectations untouched.** This lands
  in the same commit as 1.1, because `Row` now has a required field and `pnpm typecheck` is red until it does [EA B5].
  Test first: `pnpm typecheck` fails on `tests/row-renderer.test.ts` (`rowOf` and the 17 `id: "row-…"` literals, all
  built there and nowhere else). Edit only fixture lines: `rowOf` and each inline row gain the field. The export pin in
  `tests/jefferson.test.ts` ("the exported surface offers no way to supply or replace cell content") gains `DISTRIBUTIONS`
  for `visuals/row.ts`: a new key, not a reshaped assertion. Verify: `pnpm typecheck` and `pnpm test` pass with the same
  257 plus 1.1's tests; **A1 is silent** (no removed assertion line); **A2** prints only fixture lines and the export
  pin's key line. Every row declares `"equal"` because that is what these expectations describe. Among them are the clip, wide-glyph, emoji, combining-mark and ANSI tests (base `:169`, `:185`, `:199`, `:212`, `:245`) and "the host closes an open style between cells" (`:230`): under `equal` a cell occupies `floor(W / N)` columns, so they are the evidence for the modified scenario of [Spec: A cell's alignment is the padding side inside it] ("the columns its row gave it"). The ruling that legitimises the edit is Joel's: *"a config option on the row can allow for the cells to get equal distribution as we
  started with"* [R 2026-11-07]. Mutation: none (an edit to fixtures; the evidence is A1 silent).
- [ ] 1.3 **A `distribution` that is not one of the two rejects the whole document.** Test first
  (`tests/configuration.test.ts`): for each of `"equl"`, `"Equal"`, `4`, `null` the document is rejected, the default row
  renders (one row, `"content"`), and the warning names the key `distribution` and the value (as JSON) and lists both
  valid values, `"content"` and `"equal"`, in the form of the align message (`…has an align that is not "left", "right"
  or "center"…`) [D5, E §5]. Boundaries: a wrong string, a wrong case, a number, `null` (a present key, so not absent).
  Red because today the key is ignored and the document is accepted. Verify: the new test passes. Mutation: accept any
  string and `"equl"` turns red; treat `null` as absent and the `null` case turns red. Source: [Spec: A distribution
  that is not one of the two], [D5].
- [ ] 1.4 **Within a row `distribution` is checked first, and the whole order is envelope, instruments, row.** Test first
  (`tests/configuration.test.ts`): a row with `distribution: "equl"` and an empty `cells` list reports the distribution
  warning, not the empty-cells one; a document with a bad instrument option and a bad `distribution` reports the
  instrument option. The existing precedence test (`configuration.test.ts` rejection precedence, "envelope → instruments
  → cells") passes unedited. Boundaries: two malformed things in one row; one in the instruments and one in the row.
  Red because the first case reports the empty-cells reason today. Mutation: read `distribution` after `cells` and the
  first case turns red. Source: [D5 "Validation"; E §7 `configuration.test.ts:864`].
- [ ] 1.5 **A top-level `distribution` beside `rows` rejects like a top-level `cells` or `id`.** Test first
  (`tests/configuration.test.ts`): a document with `"distribution": "equal"` and a `rows` list is rejected, the default
  row renders, and the warning says the configuration carries both a top-level row and a rows list; the same document
  whose `distribution` is also bad (`"equl"`) gives that same warning, because the envelope check runs before any row is
  read. Boundaries: a valid value beside `rows`; an invalid one beside `rows`. Red because the key is ignored silently
  today [D5; E §5]. Mutation: move the envelope check after the row reads and the bad-value case reports the
  distribution instead (red). Source: [Spec: A distribution beside rows], [D5 "Beside `rows`"].
- [ ] 1.6 **No cell key is added and the ceiling stays ten.** Characterization; no code. The existing tests pass without
  an edit: `configuration.test.ts` "unrecognised cell key" (still naming `"width"`), "every cell carries an instrument
  and an alignment" (exactly `["instrument", "align"]`), and the ceiling test (`DEFAULT_CELLS === 10`, `MAX_CELLS === 10`)
  [D3 "No per-cell override", D10, E §7]. Verify:
  `git diff -U0 4b87494 -- tests/configuration.test.ts | grep -E '^-[^-]'` is silent (same command form as A2, narrowed to one file; the
  red-by-edit was shown on the whole-directory form). Mutation: none; a cell key added by mistake turns the exact-keys
  test red.

## 2. The `fills` fact on the instrument

A bound instrument says whether it fills [D3]. Files: `visuals/instrument.ts`, `visuals/instrument-binding.ts`; tests in
`tests/configuration.test.ts` (bound instruments are exercised through `readConfiguration` and `cellText`) and
`tests/instrument.test.ts` [EA B2].

- [ ] 2.1 **`blank` fills, and an instrument fills when its format holds a `$bar` segment.** Test first
  (`tests/configuration.test.ts`): `blank` reports `fills`; `model`, `thinking`, `path`, `tokens`, `cost` and `context`
  at their default formats do not (`context`'s default `$percent/$window` has no `$bar` [EA B4]); `context` configured
  with format `$percent $bar` reports `fills`; `context` configured with the escaped `\$percent \$bar` does not (an
  escaped `\$bar` is plain text [EA B4, `format.test.ts:35`]). Boundaries: the default `context`, the configured bar,
  the escaped bar. Red because the fact does not exist. Deliverable: a read-only `fills` on `Instrument`, set for `blank`
  from its declaration and for a bar from the parsed `segments` that `instrumentBindings` already holds, with no second
  parse [D3, Open Question 5]. If `fills` is required, the fake `{ render }` literals in `tests/row-renderer.test.ts`
  gain it: fixture lines only, listed in Derek's report. Verify: the new test passes; `pnpm typecheck` passes.
  Mutation: derive `fills` by testing the format string for `"$bar"` (a substring) and the escaped case turns red;
  derive it from `bar` being declared and the default `context` case turns red. Source: [Spec: A blank cell and a bar
  cell fill], [R 2026-11-07 "The default"], [D3].
- [ ] 2.2 **The probe assumption is a test: an instrument that does not fill renders the same text at width 0 and 200.**
  Test first (`tests/instrument.test.ts`, beside "every shipped default parses and renders its declared text"
  [EA B2]): bind each of the seven shipped instruments at its default format, plus `context` configured with
  `$percent $bar`, and render each with the all-known `seed` readings at width 0 and at width 200. Assert that wherever
  `fills` is false the two texts are equal. Assert separately that the configured bar's text at 0 differs from its text
  at 200 and that its `fills` is true, so the guard is shown to discriminate. `blank` fills and is excluded from the
  equality; its flag is asserted. Boundary: seven shipped defaults and the configured bar. Red because `fills` does not
  exist until 2.1; after 2.1 it passes on first run. Mutation: `fills` constant false and the configured bar, now
  unmarked and differing, fails the equality (red). Re-run at the implementation gate in 9.4. Source: [D2 "Guard on the
  assumption"], [E §4, `format.test.ts:121-125`].

## 3. The width plan

The pure function [D1, D4, D6]: it takes the row width, the distribution and, per cell, its alignment, whether it fills
and its content width; it returns per cell a `basis`, a `grow` (0 or 1) and a joint flag. One new source file under
`extensions/jefferson/visuals/` (the design leaves its name to Derek), tested in a file of the same name under
`tests/`. The file imports nothing, not even pi-tui [D1]. The first run of each task's cases fails; for 3.1 it fails at
the import because the file does not exist yet.

- [ ] 3.1 **Equal distribution gives every cell `floor(W / N)` and `grow` 1, with no joint, whatever the content.** Test
  first: `(N, W)` of `(8, 80)`, `(3, 100)`, `(10, 132)`, `(8, 4)`, each with cell content widths 0 and 99 mixed and
  `L`/`R`/`C` alignments mixed: every output is `[floor(W/N)…]`, `grow` 1, no joint. The ones that matter: `(3, 100)`
  gives `[33, 33, 33]`, never 34 (the remainder is the allocator's [CA §1(a)]); `(8, 4)` gives `[0 × 8]`. Boundaries:
  W divisible, W with a remainder, W < N. Verify: the plan's test file passes. Mutation: the `equal` branch runs the
  joint rule and the `[R, R]` row gives a joint flag (red). Source: [Spec: A width that divides evenly / does not divide
  evenly / ten at 132], [D4 step 1, ADR 0002 via E §6].
- [ ] 3.2 **With no fill cell, the last left-aligned non-empty cell absorbs the slack, else the first non-empty cell.**
  Test first: `[L5, L5, L5]` at W=40 gives `[5, 6, 29]` (C=15, two joints, S=23); `[R7, R7]` at 30 gives `[22, 8]`
  (no left-aligned cell, so the first absorbs); `[L5, R7, L0]` at 40 gives `[33, 7, 0]` (the empty last-left cell does
  not absorb); `[L5]` at 40 gives `[40]`. Every `grow` is 0 here. The inputs that separate right from wrong: `[L5, L5, L5]`
  makes "the first cell absorbs" give `[28, 6, 6]`; `[L5, R7, L0]` makes "last left-aligned, empty or not" give
  `[5, 7, 28]`. Boundaries: all-left, none-left, an empty last-left cell, a single cell. Mutation: pick the first cell
  and `[L5, L5, L5]` turns red; drop the emptiness test and `[L5, R7, L0]` turns red. Source: [Spec: Cells are evenly
  distributed, the absorber sentence], [council "Slack"], [D4 "Absorber"].
- [ ] 3.3 **An empty content cell takes 0 columns; an all-empty row gives the slack to its first cell.** Test first:
  `[L0, R7]` at 30 gives `[0, 30]` (the empty cell is not the absorber while a non-empty one exists); `[L0, L0]` at 80
  gives `[80, 0]`; `[R0, R0, R0]` at 10 gives `[10, 0, 0]`; every empty cell's `basis` is 0 and `grow` 0 unless it is
  the all-empty row's first cell. Boundary: one empty, all empty, one cell. Mutation: an empty cell
  absorbs when it is the last left-aligned one and `[L5, R7, L0]` from 3.2 and `[L0, R7]` turn red. Source: [Spec: An
  empty cell takes no column; A row whose cells all render nothing], [D2 "Empty", D4].
- [ ] 3.4 **Fill cells share the slack as `floor(S / G)` with `grow` 1, and a fill cell's own content width is ignored.**
  Test first: `[F, F, F]` at 100 gives `[33, 33, 33]`, `grow` 1 each (Joel's second row; the allocator's 34/33/33 is the
  footer's, in 4.5); `[F, L31, F]` at 90 gives `[29, 31, 29]`, `grow` `[1, 0, 1]`; `[F, F]` at 80 gives `[40, 40]`;
  `[F, F, F]` at 99 and at 101 give `[33, 33, 33]` (`S mod G` 0 and G−1); and `[F(n=20), F, F]` at 100 gives the
  same `[33, 33, 33]` as the zero-width fills. The inputs that separate right from wrong: W=100 with G=3 makes `ceil`
  give 34 each (102 columns), and the `n=20` fill makes "a fill cell keeps its natural width" give 20. Mutation: `ceil`
  for `floor`, and a fill that keeps its natural width, each turn this red. Source: [Spec: A blank cell and a bar cell
  fill; Joel's second row keeps its thirds], [D4 step 3, CA §1(a), §1(b)].
- [ ] 3.5 **When the content needs W or more, nothing grows and nothing is negative.** Test first: `[L30, F, L30]` at 50
  gives `[30, 0, 30]` (S=−10, the fill basis is `max(0, …)`, no joint across the fill cell); `[L30, F]` at 30 gives
  `[30, 0]`; `[L40, L40, L40]` at 80 gives `[40, 40, 40]` with every `grow` 0 and no joint (C+J=122 > 80, so the joints
  drop, and the absorber's `n + S` is not applied for S ≤ 0). The allocator, not the plan, takes the deficit [D7,
  CA §1(c)]. Boundaries: S=0, S<0 with a fill cell, S<0 without. Mutation: drop the `max(0, …)` and `[L30, F, L30]` turns
  red with a −10. Source: [D4 step 3 "S ≤ 0 and fills present", "The absorber (G = 0, S > 0)"].
- [ ] 3.6 **A joint belongs to the right-hand cell of two non-empty content cells with no spare room between them.**
  Test first, each a plan input and the exact flags: `[L15, R32, R6]` at 100 gives `[61, 32, 7]`, joint `[no, no, yes]`
  (Joel's top row: `path` absorbs, so the joint sits before `thinking`, not before `model`); `[R5, R0, R7]` at 30 gives
  `[22, 0, 8]`, joint on the third (the joint skips the empty cell); `[R5, F, R7]` at 30 gives `[5, 18, 7]` with no joint,
  and at 12 and at 11 gives `[5, 0, 7]` with no joint; `[R5, F, F, R7]` at 13 (S=1 < G=2) gives `[5, 0, 0, 7]` with no
  joint; `[C5, R3, R3]` at 13 gives `[6, 3, 4]`, joint only on the third (a centered absorber's boundaries are not
  counted). The inputs that separate right from wrong: `[R5, R0, R7]` makes "an empty cell counts as a neighbor" put a
  joint on the empty cell or none on the third; `[L15, R32, R6]` makes "every boundary has a joint" give `path`'s
  neighbor a joint. Boundaries: absorber boundary, empty between, fill between, S<G, S≤0, centered absorber.
  Mutation: give every boundary a joint, and count an empty cell as a neighbor; each turns the named case red. Source:
  [Spec: Two neighbouring instruments (the joint's placement); No joint beside an absorbing cell; No joint beside a fill
  cell], [D6 "Where it exists"], [R 2026-11-07 "The joint"].
- [ ] 3.7 **Every counted joint drops together when C + J > W, and not before.** Test first: `[R8, R8]` at 18, 17 and 16
  gives `[9, 9]`, `[8, 9]` (joint kept at C+J=17) and `[8, 8]` (joint dropped at C+J−1); `[L15, R32, R6]` at 55, 54 and
  53 gives `[16, 32, 7]`, `[15, 32, 7]` (joint kept, S=0, `path` abuts `model`) and `[15, 32, 6]` (all joints gone, no
  text shortened); and `[R6, R6, R6]` at 20 and 19 (J=2: C+J=20) keeps both joints at 20 and drops both at 19, never one.
  The inputs that separate right from wrong: W = C+J exactly, where `>=` in place of `>` drops the joint; W = C+J−1,
  where a plan that shortens text first keeps it. Boundaries: C+J+1, C+J, C+J−1, C, and two joints dropping together.
  Mutation: `>=` for `>`, and a drop of one joint at a time; each turns red at the named width. Source: [Spec: A joint
  beside an absorbing cell at the margin; The joints collapse together; The joint collapses before content does], [D6
  "It gives way first"], [R 2026-11-07 "on a row too narrow for it, the column gives way before any content does"].
- [ ] 3.8 **The plan imports nothing, and its export is pinned.** Verify: **A4** on the plan's file is silent (no
  `import`, no `from`), and the export pin in `tests/jefferson.test.ts` gains an entry for the file: a new key, not a
  reshaped assertion (the pin goes red when the file exports, then the entry is added). Red/green evidence for A4: it
  prints four lines on `visuals/row-renderer.ts` and is silent on an import-free file [EA A4]. Mutation: an `import`
  of pi-tui added to the plan and A4 prints it. Source: [D1], [ADR 0005 via E §1].

## 4. The footer sizes its cells

`visuals/row-renderer.ts`, the one adapter that names pi-tui [D1]: it probes each content cell, calls the plan and seats
the result. Tests in `tests/row-renderer.test.ts` and `tests/jefferson.test.ts`. In this group the seat keeps today's
`shrink: 0`, the one-slot memo and the width-only re-seat; 6.2, 7.1 and 7.3 each start with a failing test and fix one.
The tests of 4.1, 4.5 and 4.6 are written together and are red together against the footer as 4.0 leaves it (each names
its red case); each ticks when its own behavior is green. 4.3 and 4.4 pin decisions 4.1's code makes and are
characterization.

- [ ] 4.0 **The end-to-end tests that pin equal shares declare `equal`, and the one that mixes a content cell and a bar
  keeps its old string as a twin.** Test first: green already, because the footer still lays out equal shares; this is
  the step that keeps the suite green when 4.1 flips the default. In `tests/jefferson.test.ts` the documents of the three tests that pin per-cell equal strings (five assertions) gain `"distribution": "equal"`, expectations untouched: the `padEnd(40)` pair
  (`:587`, `:592`) and `padEnd(80)` (`:610`) in "a dispatched turn boundary…" and "an unchanged turn boundary before the
  first render…", and the `padEnd(8)` pair (`:626`, `:629`) in the `new/resume/fork/reload` replacement test [EA B1]. Derek's report names each of the three tests. "configured formats, styles and a width-taking bar render end to end" (`:543`, assertion `:551`) is copied to a new test,
  "…under equal distribution", whose document carries the option and whose expectation is the old string. Verify: **A1** prints nothing; `pnpm test` passes. The
  ruling that legitimises each: Joel's default and its opt-out [R 2026-11-07], and each of these tests' subject is repaint,
  the cache or session replacement, not geometry. Derek's report names the twin. Mutation: none
  here; the evidence is A1 silent and the suite green.
- [ ] 4.1 **A content cell takes the width its text needs, and the footer asks for it at width 0.** Test first
  (`tests/row-renderer.test.ts`, rows declaring `"content"`): `[L "ab", R "cdef"]` at 40 renders `ab`, 34 spaces,
  `cdef`; `[L "ab"]` at 20 renders `ab` and 18 spaces; at 6 the same two cells render `ab` and `cdef` with no space
  between (W equals the text widths). Plus the same flip in `tests/jefferson.test.ts`: the assertion at `:551` becomes
  the rule's arithmetic, written in the test and not copied from output: the `model` cell takes its text's width (31
  columns [EA B1]), the `$bar` cell takes the other 49 of the 80, so the line is the model text, `43.2% ` and
  `floor(0.432 × 43)` = 18 `█` then 25 `░`; the old string is 4.0's twin. Red because every cell is `floor(W/N)` today (`[L "ab", R "cdef"]` at 40 gives two cells of 20).
  Deliverable: the footer computes the plan each render (probes taken at width 0, memoized by the cell), seats `basis` and
  `grow` through `clear()` and `addChild` as today, and leaves a cell's own pad and clip as they are [D1, D2, D9].
  Boundaries: two cells, one cell, W equal to the text widths. Verify: the new tests pass; every test under `equal` still
  passes. Mutation: seat `floor(W / N)` for every row and the `[L "ab", R "cdef"]` test turns red. Source: [Spec: The
  default gives each cell what its content needs; Content narrower than the row], [R 2026-11-07 "The default"].
- [ ] 4.2 **A row declaring `equal` is not probed and lays out as it always did.** Characterization: the existing
  test "an instrument resolves once per (sample, width) within a render, and again in the next render" (base `:330`, widths
  `[30, 30, 30, 10, 10, 10, 30]`) and the equal-string tests of 1.2 stay green with their expectations untouched; the
  plan's `equal` branch seats `floor(W / N)` and `grow` 1. Verify: **A1** prints nothing, and the sequence test passes
  with its original array. Mutation: an `equal` row probes at width 0 and the sequence test turns red in its first
  entry; an `equal` row applies a joint and a right-aligned `equal` fixture string changes. Source: [Spec: A width that
  divides evenly… with the row option that restores equal shares], [D4 step 1; design guards table, "Equal distribution reproduces today"].
- [ ] 4.3 **Content width is measured in columns, whatever the text holds.** Characterization of what 4.1 builds (the
  probe's measure is `visibleWidth`): the test passes on first run, and its failing side is the mutation. Test
  (`tests/row-renderer.test.ts`): `[L "🧠 ab", R "xy"]` at 20 puts `xy` at the last two columns and the first cell's text
  starts at column 0, whole, with no ellipsis; the same with `漢ab`, with `e` plus a combining mark (`é`), and with the
  text wrapped in a style escape; in each pair the neighbor's text starts at the same column styled or unstyled. At W
  exactly the two texts' columns the first text renders whole, no pad, no ellipsis (S=0). Boundaries: a wide emoji
  label, a wide BMP glyph, a combining mark, ANSI styling, S=0. Mutation: measure `.length` and the combining-mark, wide
  and styled cases turn red, by columns. Source: [Spec: Cell widths are measured in terminal columns, both scenarios],
  [D2], [E §1, M 2h].
- [ ] 4.4 **The probe is taken at width 0, unpadded and unclipped, not at the row's width.** Characterization of 4.1,
  same form. Test: a fake instrument not marked as filling that renders `ab` at width 0 and `ab` plus a `#` for each
  column of any other width, in `[L it, R "cd"]` at 40: the line is `ab`, 36 spaces, `cd`, with `cd` at the last two
  columns and no `#` anywhere. A second fake whose text at width 0 is 120 columns, in a row at 80, is measured whole,
  not clipped first: 6.2's three-cells-of-40 case covers the clip. Mutation: probe at the row's width and the cell
  claims the whole row, so the line carries `#` and `cd` is displaced (red). Source: [D2 "Why width 0"; M 2a; CA §1(d), §2].
- [ ] 4.5 **`blank` and `$bar` cells fill and share the rest, differing by at most one.** Test first
  (`tests/row-renderer.test.ts`, fakes marked as filling): `[F, F, F]` at 100 where the cells render `a`, `b`, `c` starts
  them at columns 0, 34 and 67 (34/33/33); `[F, L31, F]` at 90 lays out 30, 31 and 29 columns (the first fill takes the
  remainder), with the content cell at its text's width; `[F(n=20), F, F]` at 100 gives the same 34/33/33 as 3.4. The
  line is 100 and 90 columns wide. Boundaries: G=3 with a remainder of 1, G=2 with a remainder of 1, a fill with a long
  text. Red against the footer as 4.0 leaves it: `[F, L31, F]` at 90 gives three cells of 30, not 30, 31 and 29. Mutation: a fill keeps its natural width and the `n=20` case
  turns red. Source: [Spec: Joel's second row keeps its thirds; A blank cell and a bar cell fill], [D3, D4].
- [ ] 4.6 **An empty cell takes no column and does not change where any text sits.** Test first
  (`tests/row-renderer.test.ts`): the line of `[L "path", R "model", L ""]` at 80 equals the line of
  `[L "path", R "model"]` at 80, and the empty cell is allocated 0 columns; a row `[R "", R ""]` at 80 renders one line
  of 80 columns (the first cell, though empty, takes the spare columns). Red against the footer as 4.0 leaves it, where the empty cell takes a third of the row. The input that separates right from wrong:
  the trailing empty left-aligned cell, which "last left-aligned" would let absorb. Mutation: an empty cell absorbs and
  the first comparison turns red. Source: [Spec: An empty cell takes no column; A row whose cells all render nothing],
  [D4].

## 5. The joint, at the footer

The cell renders its joint as a leading space, counted in its `basis` and clipped with its text [D6]; the footer hands
each cell this render's joint flag through a function given when the tree is built, as it does the sample [D9]. All
tests in `tests/row-renderer.test.ts`, texts of 15, 32 and 6 columns standing for Joel's `path`, `model`, `thinking`.
5.1 builds the cell's half of the joint and starts red. 5.2 to 5.7 show the plan's joint rules (3.6, 3.7) through the real
allocator at the boundaries of the design's guards table, so they are first-run green by construction; their failing side
is the named mutation, and they are the boundary tests that D11 says would fail first against a different allocator.

- [ ] 5.1 **A joint sits ahead of a left-aligned or centered cell's text, plain and unstyled.** Test first: `[L5, L5, L5]`
  at 20 renders `aaaaa`, a space, `bbbbb`, a space, `ccccc` and 5 spaces (the joints sit before `b` and `c`, and `c`
  absorbs the slack to its right); `[R "a", R "bc"-styled-open]` at 4 renders `a`, a space, then the style escape and `bc`, with the space
  before the escape (the joint carries no styling), and the host's line-end reset is untouched. Boundaries: a left-aligned
  cell with a joint, a styled right cell. Red because 4.1 counts the joint in the cell's basis but the cell puts the spare
  column after a left-aligned text, so the `[L5, L5, L5]` line has its spaces in the wrong place. Deliverable: the cell
  renders the joint as a leading space, part of the string it aligns and pads, counted in its basis and clipped with its
  text, and reads this render's joint flag through a function given when the tree is built, as it does the sample
  [D6, D9]. Mutation: place the joint after the text, or inside the styled region, and the named cases turn red. Source:
  [D6 "Pad and ADR 0006"], [E §1, §3 `:40`].
- [ ] 5.2 **Two right-aligned instruments sit together at the right edge, whatever the width.** Characterization of 5.1
  and the plan (a right-aligned cell's spare column is its joint), passing on first run; its failing side is the
  mutation. Test: `[L15, R32, R6]` at 132, 100 and 80: the first text starts at column 0, the last text ends at column W,
  the second ends one column before the third starts, and the gap between the first and the second texts is `W − 54`
  columns (78, 46, 26). The expected line is built from the fixture's text widths, not from the output. Boundaries: three
  widths, all wider than `C + J = 54`. Mutation: a plan with no joint and the second text abuts the third (red); every
  boundary gets a joint and the first text is separated from the second by an extra column (red). Source: [Spec: Two
  neighbouring instruments, both scenarios], [R 2026-11-06, 2026-11-07], [D6].
- [ ] 5.3 **No joint where room already exists beside an absorbing cell.** Test: `[L15, R32]` at 80 leaves
  exactly the spare columns between the two texts and the second cell occupies exactly 32 columns (no 33). Source:
  [Spec: No joint beside an absorbing cell], [D6]. Boundary: absorber on the left, and `[R5, R7]` where the right-aligned
  first cell absorbs: only its spare columns are before it, and the joint before the second cell is present. Mutation:
  give the absorber's boundary a joint and the second cell is 33 wide (red).
- [ ] 5.4 **No joint beside a fill cell, and none for an empty cell.** Test: `[R5, F, R7]` at 12 (W equals the two
  texts) renders the two texts abutting with neither shortened, at 11 renders one line with one text clipped at its end,
  and at 30 shows the fill cell between them; `[R5, R0, R7]` at 20 puts a one-column joint before the third text and none
  at the empty cell. Boundaries: S=0 and S<0 with a fill between; an empty between two content cells. Mutation: count the empty cell as a
  neighbor or give the fill boundary a joint and the third text moves a column (red). Source: [Spec: No joint beside a
  fill cell], [D6 "Reachable states"].
- [ ] 5.5 **The joint gives way before content: both right-aligned.** Test: `[R8, R8]` at 18, 17 and 16 renders
  ` a8 b8` (1 spare column before the first text, the joint kept), `a8 b8` (no spare column, the joint kept; `a8` is the 8-column text) and `a8b8`
  (the joint gone, both texts whole), each one line W columns wide. Boundaries: C+J+1, C+J, C+J−1. Mutation: `>=`
  for `>` in the plan (3.7) and the 17-column line turns red here; a cell that clips its text before dropping the joint
  turns the 16-column line red. Source: [Spec: The joint collapses before content does], [D6 "It gives way first"].
- [ ] 5.6 **The joints collapse together, and `path` abuts `model` at the margin.** Test: `[L15, R32, R6]` at 54
  (the joint kept) renders `path`, `model` abutting with a one-column joint before the third text and no text shortened;
  at 53 no joint remains anywhere; at 55 one spare column goes to `path`. Boundaries: C+J, C, C+J+1. Mutation: drop one
  joint, not all, in a row with two counted joints (`[R6, R6, R6]` at 19 renders no joint at either) and the 19-column line turns red. Source: [Spec: A joint beside an absorbing cell at the margin; The joints collapse together].
- [ ] 5.7 **A centered absorber with one spare column puts it on the right.** Test: `[C5, R3, R3]` at 13 renders
  the first text at column 0, one pad column after it, then `R3`, a joint and `R3`; the line is one line of 13 columns.
  Characterization for the pad (the existing odd-pad test, "a centred cell's odd pad puts its extra column on the
  right", stays green under `equal`) and a first run for the plan's `[6, 3, 4]`. Boundary: S=1. Mutation: split the pad
  `ceil` left and the first text starts at column 1 (red). Source: [D6 "Reachable states"; E §6 l.368].

## 6. One line at every width, and overflow

- [ ] 6.1 **Every column is allocated, at any width, with the composition the host's.** Characterization of the plan and
  the footer through the real allocator (first-run green; its failing side is the mutation). Test
  (`tests/row-renderer.test.ts`): for each W from 1 to 150, over the rows `[L12, R20, R6]`, `[F, L10, F, R7]`, `[L0, L0]`,
  ten `F`, `[R6, R6, R6]` and one `equal` row of seven cells, the footer's line is one line, `visibleWidth(line) === W`,
  and the line equals the existing helper's `composed(…)` of the cell strings (so any padding the extension added to the
  composed line would show) [E §7]. Fixed cases at S=0, S=1, `S mod G` = 0 and G−1, and W < N. Mutation: an absorber base of `n + S − 1` and `ceil` in place of `floor` each turn a fixed case red.
  Also run in both pi-tui versions in 9.3. Source: [Spec: A row spans the full width however its cells are sized], [D4,
  D11 conditions 1-3].
- [ ] 6.2 **When the content needs more than the row, every cell can give up columns, and a row is still one line of
  W.** Test first: three cells of 40 columns each at 80 render one line of 80 columns, no cell's text carries a line break,
  and each of the three cells' text ends with the ellipsis (pi-tui allocates `[22, 27, 31]` [CA §1(c)]); the same three cells growing from 5 to 40 columns between two renders at 80 give the same one line of 80 columns on the second; a row whose
  cells need 41 columns with `[L40, L1]` at 40 renders 40. The assertion names no column count for who lost. Red
  because 4.1 keeps `shrink: 0`: the line is 120 columns. Deliverable: `shrink: 1`, `minSize: 0`, no `maxSize` seated on
  every cell in both distributions [D4 step 4, D7]. Boundaries: totals over W by 40 and by 1. Mutation: `shrink: 0` or
  `minSize` above 0 and the 80-column line becomes 120 (red). Source: [Spec: Content that needs more than the row;
  An instrument's text is wider than its cell; A cell's content grows], [R 2026-11-05], [D7, CA §1(c); design guards table, "One line when content grows"].
- [ ] 6.3 **`align` in a content cell with no spare columns changes nothing.** Characterization; the design adds no code
  for it [D7]. Test: `[X, L "yy"]` at 20, where `X` declares `left`, `right` and `center` in turn over text `abc`: the
  three lines are equal (the last cell is the left-aligned absorber each time; `X` has exactly its text's columns).
  Boundary: the three alignments. Mutation: give a non-absorbing content cell one extra column without a joint and the
  `right` and `center` lines differ from `left` (red). Source: [Spec: An align in a cell with no spare columns].
- [ ] 6.4 **The tests that assert only one line of W columns hold under the default.** Characterization. These four
  declare `"content"` in place of `"equal"` and pass with their expectations untouched: "content wider than its cell is
  truncated to one line", "an instrument resolving text wider than its cell is clipped and stays one line", "the footer
  renders one line per row, in order, each spanning the width", "more cells than columns still renders exactly one line
  of the width". A test that pins a per-cell string and cannot pass stays on `"equal"`, and Derek's report names it.
  Verify: **A1** prints nothing. Mutation: `shrink: 0` and "more cells than columns" turns red (8 cells at 4 columns).
  Source: [D "Existing tests this change flips, held by the default"], [Spec: Instrument text is bound by the row's geometry].

## 7. The memo and the re-seat

- [ ] 7.1 **A second render of the same sample asks for nothing new.** Test first (`tests/row-renderer.test.ts`):
  Joel's top row at 100, `[L15, R32, R6]` (allocated 61, 32 and 7), three call-counting fake instruments; after the first
  render each instrument resolved once at each of three widths (0, 100 and its allocation); after a second render of the
  same sample each count is unchanged. The input that makes right and wrong differ: three cells whose allocated width
  differs from W, which the existing test (`:292`, one cell, measured and allocated width both W) does not have.
  Red against the one-slot memo (`[80, 80, 40, 40]` per frame [M 2b, CA §2]). Deliverable: each cell's memo holds the
  sample and a map from width to text; a new sample and `invalidate()` empty it [D8]. Mutation: restore the one slot and
  the second render's counts rise (red). Source: [Spec: Two renders; The footer's tree is built once…], [D8].
- [ ] 7.2 **A new sample, or `invalidate()`, drops every cached width.** Test first: a fake whose text is `ab` for
  sample A and ten columns for sample B, rendered at the same W after a new sample: the second line shows the whole
  ten-column text; `invalidate()` followed by a render resolves once per width again. The existing tests "invalidation drops
  cell memos and keeps the footer's three lines" and "a push between two renders shows up in the next render and not
  before" stay green under their `equal` rows. Mutation: a map that survives a new sample shows `ab` (red). Source:
  [Spec: A push between two renders; The host invalidates the footer], [D8].
- [ ] 7.3 **The row re-seats when a cell's basis changes, not only when the window does.** Test first: a footer rendered at
  100 with `thinking` text of 7 columns and then, with a new sample, 6 columns (`High` to `Max`), over `[L15, R32, R7]` then `[L15, R32, R6]`:
  the second line equals a fresh footer's line for the 6-column text: the `thinking` text ends at column 100 and the
  `model` text ends exactly one column before it starts. The input that separates right from wrong: shorter text, so a stale
  `basis` of 8 leaves the joint reading as two columns. Red against 4.1's width-only gate. Deliverable: the footer
  compares each render's plan with the options it last seated and re-seats when the width or any `basis` or `grow`
  differs [D9]. Mutation: gate on the width only and the line has two spaces between the texts (red). Source: [Spec: A
  cell's content changes width], [D9, M 2i].
- [ ] 7.4 **A resize re-seats the default row.** Test first: the default-distribution twin of "cell widths are recomputed
  when the width changes": `[L15, R32, R6]` at 100, then at 90, equals a fresh footer's line at 90, and no cell keeps a
  width from 100. Boundary: a resize with the same content. Mutation: never re-seat and the 90-column line is 100
  wide (red). Source: [Spec: The terminal is resized (both)], [D9].

## 8. End to end, through the fake host

`tests/jefferson.test.ts` through `useTempAgentDir`, `writeAgentDocument` and `harness().start({ cwd })` [EA B3]; real
instruments. The expected lines are built from counts and from the fixture's own text widths, not from the output.

- [ ] 8.1 **Joel's top row, with no edit: `path` at the far left, `model` and `thinking` together at the right edge.**
  Test first: a scratch agent directory holds `path`, then `model` and `thinking` both `right`, with labels and formats set so
  the three texts are the 15-column `path` text (a one-emoji label and the 12-character basename `pi-jefferson`, so
  `2 + 1 + 12`), `🧠 claude-opus-5-5 via Anthropic` (32) and `🤔 Max` (6), with the working directory set by
  `start({ cwd })`. At 100 the line is the `path` text, 46 spaces, the `model` text, one space, the `thinking` text; at
  132, 78 spaces; at 80, 26 spaces; at 54 the `path` text abuts the `model` text and the joint remains; at 53 no joint
  remains. The `thinking` text ends at the last column each time. This is the check that Joel's two rows keep rendering
  with no edit [R 2026-11-07; M 2k]; **Joel's own observation is 10.1, and his.** This is the end-to-end tie: its first run comes after groups 4 to 7 and is green; its failing side is the base commit's equal shares, which Derek shows by running this test against `4b87494`'s sources in a scratch copy and reporting the failure. Mutation: none beyond 5.x's. Source: [Spec: A working directory
  at the left, two instruments together at the right; The row is narrower], [D "Joel's two rows, with no edit"].
- [ ] 8.2 **Joel's second row keeps its thirds, with a real `$bar`.** Characterization: the thirds are the same under
  the base commit's equal shares, so the test is green on first run and guards the fill rule. Test: `blank`, `blank` and
  `context` (`right`, format `$percent $bar`) at 100 occupy 34, 33 and 33 columns; the first two cells are
  `truncateToWidth(DEFAULT_CELL_TEXT, 34)` and `…, 33)`, the third is `43.2% ` and a bar of `floor(0.432 × 27)` = 11 `█` and
  16 `░`; the line is 100 columns [D "Joel's two rows"]. Boundary: G=3, remainder 1. Mutation: `context` not marked as
  filling (2.1's `$bar` read) and the third cell is content-sized, so the cells become 47, 47 and 6 (red). Source: [Spec:
  Joel's second row keeps its thirds; A bar in a row with other cells].
- [ ] 8.3 **A bar takes only what its own cell leaves, and draws nothing with no room.** Test first: `[path L, context
  "$percent $bar"]` at 80 is one line of 80 columns, the `path` cell occupies its text's width, and the bar's blocks are
  `floor(0.432 × (80 − path − 6))` filled plus the rest dim; and a `path` text of 100 columns at W=80 renders one line of
  80 columns with no `█` or `░` (the bar cell allocated 0 columns). Boundaries: room, no room. The first case is red against the base commit (the `path` cell is 40 columns there). Mutation: derive the bar cell's width from the bar's own output and the first count changes (red). Source: [Spec: A bar in a row with other
  cells; A bar with no room], [D2 "`$bar` accounting"].
- [ ] 8.4 **The default row of ten `blank` cells is unchanged: 8 each at 80, `[14, 14, 13 × 8]` at 132.**
  Characterization: both pass against the base commit too. The existing default-row assertion (in "a rejected
  configuration warns and still installs the default row", `truncateToWidth(DEFAULT_CELL_TEXT, 8).repeat(10)` at 80)
  passes with no edit [EA B1]; the new 132-column case lays out ten cells of 14, 14 and eight of 13 columns, the line
  132 wide. The spec's "cells absent" scenario (one line, 80 wide) is the 80-column assertion. Boundary: a width with
  remainder 2. Mutation: `blank` not marked as filling and the 80-column line is not eight columns per cell (red;
  unmeasured). Source: [Spec: cells absent; A row of ten cells at a width that does not divide evenly], [D4 "What this
  gives"].
- [ ] 8.5 **`distribution: "equal"` restores equal shares end to end.** Characterization: green on first run, since
  these are today's strings. Test: three cells of any content at 100 occupy 34, 33, 33; ten at 132 occupy 14, 14, 13 × 8;
  a right-aligned last cell at 132 ends at column 132. Boundaries: three at 100, ten at 132. The test at base `:281`
  ("a right-aligned cell ends at its cell's right edge end to end") passes under the default with no edit [D "Existing
  tests…"]. Mutation: an `equal` row that applies a joint and the right-aligned string changes (red). Source: [Spec: A
  width that does not divide evenly; A right-aligned last cell at a width that does not divide evenly], [R 2026-11-07].

## 9. Verification

Each step produces evidence for Derek's report. No step changes the repository.

- [ ] 9.1 **The whole suite, types and the spec validate green.** `pnpm typecheck`; `pnpm test` (257 plus this change's
  tests, 0 fail, 0 skipped); `openspec validate "cell-widths" --strict`. Verify: Derek's report quotes the three results.
- [ ] 9.2 **No other assertion was edited.** Run **A1** and **A2** against `4b87494` and list the output. A1 prints only
  the one assertion at `tests/jefferson.test.ts:551` (the model half, flipped by 4.1 to the rule's arithmetic, with the old
  string kept as 4.0's `equal` twin; ruling: Joel's default [R 2026-11-07], derivation in the test). A2 prints only
  fixture lines in `tests/row-renderer.test.ts` (each `distribution`), the export pin's keys, the five `distribution`
  lines in `tests/jefferson.test.ts` and the `:551` line; nothing in `configuration.test.ts`, `format.test.ts`,
  `instrument.test.ts` or `session-data-store.test.ts`. Run **A3**: it prints only
  `openspec/changes/cell-widths/tasks.md`. `git diff --name-only 4b87494 -- package.json pnpm-lock.yaml` prints nothing
  (the `devDependencies` stay at 1.4.0 [D11]; same command form as A3, red-by-edit not separately run). Any line outside this list is a
  finding. Mutation: none; the check is the evidence.
- [ ] 9.3 **The suite against pi-tui 1.5.0, in a scratch copy outside the repository.** Evidence goes in Derek's report;
  nothing changes in the repository. Recipe [EA A5]: copy the repository without `.git`; `npm pack
  @earendil-works/pi-tui@1.5.0`, unpack, and replace `node_modules/@earendil-works/pi-tui` with it; also `npm pack` and
  move in its three dependencies (`get-east-asian-width@1.6.0`, `marked@18.0.11`, `marked-cjk-friendly@0.1.2`), or the
  suite fails to load (`ERR_MODULE_NOT_FOUND … 'marked'`). Proof of the version:
  `node -e "console.log(require('./node_modules/@earendil-works/pi-tui/package.json').version)"` prints `1.5.0`. Then
  `pnpm test` in the scratch copy: all tests pass, including 6.1's every-width sweep and 3.x through the real
  allocator. This is the decision-4 simulation re-run against the real width plan, in both versions (1.4.0 is 9.1). Verify: version
  proof printed, result quoted. Source: [D11], [CA §1, §2, §3].
- [ ] 9.4 **The width-0 probe holds over every shipped declaration, at the implementation gate.** Re-run 2.2: for each of
  the seven shipped instruments a cell not marked as filling renders the same text at width 0 as at width 200, and the
  `$bar` instance is the one that differs. Derek's report prints the result per instrument. Mutation: `fills` constant
  false (from 2.2). Source: [D2 "Guard on the assumption"], [Michael's `later_gates`, rounds 2 and 3].
- [ ] 9.5 **Nothing was added for logging.** Derek's report states that the width plan and the footer add no log line
  and that the only new warning is the `readConfiguration` text tested in 1.3 and 1.5. Verify: those two tests pass;
  Michael reads the diff for a log call. No command is claimed for the absence.

## 10. Joel's observation

- [ ] 10.1 **(his)** In his own pi session, with `~/.pi/agent/pi-jefferson.json` as it is and no edit, Joel looks at the
  footer: the top row has `path` at the far left and `model` and `thinking` side by side at the right edge with one space
  between them; the second row shows its thirds and the bar fills its cell; and, in that pi, the allocator is 1.5.0's
  (9.3 ran it on 1.5.0 in a scratch copy). Not ticked by the writer: Joel ticks it, in his own words, before the
  archive (the conductor's Validate order). No task edits his file. Source: [R 2026-11-06, 2026-11-07], [D11 "Evidence it
  holds on the version Joel runs", Migration Plan].
