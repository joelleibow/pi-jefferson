# Design Review

## Stage 1: Initial Zoom Out

Two lenses reviewed `design.md` against the zoom-out standard before any other stage ran:
`council-zoom-out` (`s1-zoom-out.md`) and `council-catalyst` (`s1-catalyst.md`). Both returned
`findings: []` and no owner questions.

`council-zoom-out` passed the stage. Its verdict: the design simplifies the existing configuration
boundary without adding a subsystem, keeps the renderer boundary, and gives the documentation
restructure concrete responsibility-based homes. Seven assumptions came back verified — that
`configuration.ts` already owns validation, normalization, rejection and defaults with `startup.ts`
as its caller; that `cellsFromNames`, `readInstruments`, `instrumentBindings` and `acceptedWarning`
supply what the new shape needs without a schema dependency or a parallel parser; that `Row` lives in
`components/row/row.ts` and losing `id` does not pull document knowledge into the renderer; that the
import direction stays inward; that the documentation restructure is owner-requested scope while
registration, namespaced lookup, the spinner and the extension-author guide stay deferred; that
`docs/` holds only `adr/` and `images/`, so the new pages duplicate nothing; and that the retained
distribution, structured notices, `Row.id` removal and `containers` removal are settled decisions
rather than speculative mechanisms to reopen. It noted only what it did not check: it ran nothing,
recomputed no migrated assertion, and left published-package links to the docs pass, since
`package.json` excludes `docs/`.

`council-catalyst` found no false compromise. It read the design as separating a simpler
configuration contract from retained renderer capability, keeping migration diagnostics without a
compatibility reader, and keeping unrelated integration coverage. It named the accepted operational
costs — manual configuration migration, direct tests for a branch no configuration reaches, and
maintenance of cross-linked topic documents — and concluded no transform was warranted. Its residual
risk was that implementation must preserve validation past ten entries and unrelated end-to-end
coverage, and that equal-layout support continues to rest on its own renderer and width-plan tests.

## Stage 2: Comprehension Test

`council-comprehension` (`s2-comprehension.md`) reviewed `design.md` alone, deliberately reading no
spec, research, ruling, source or test, and paraphrased it before reporting.

**What this proposes (naive paraphrase):**

> The design replaces object-shaped configuration rows with lists of instrument entries and rejects
> retired top-level row keys with migration guidance. It preserves the renderer’s content
> distribution, removes internal row IDs, and specifies new warning messages and fixture migrations.
> It also proposes splitting the README into topic documents and releasing the breaking change as a
> minor version.

**How the existing system works, per design.md:**

> The existing parser reads one selected project or agent configuration file rather than merging
> them, and falls back to a default row when the file is missing, unreadable, or rejected. A document
> can currently declare a row at the top level or use a rows list; each row object has cells, a
> distribution, and an ID. The parser passes those rows to the footer renderer, which uses their
> distribution to plan widths.

The paraphrases landed. The lens's recommendation was to make the configuration defaults, the
existing sizing and instrument contracts, the warning rules and the release sequencing
understandable without the referenced artifacts, and it raised eight findings.

**Findings, as the lens made them:**

- **C1 (major).** The optional-row contract and several configuration defaults are not specified. A
  reader cannot tell what `{}`, `{"rows": []}` and `{"rows": [[…]]}` each produce, or the defaults
  for `align`, `rowGap` and the instruments block. Disposition: **propose_fix** (`s2-michael.md`).
- **C2 (major).** The design mentions project and agent files and a trust check without explaining
  paths, selection or prerequisites, though the configuration guide and the migration instructions
  depend on them. Disposition: **decline**, recorded as minor (`s2-michael.md`).
- **C3 (major).** Content sizing is named but not explained, though the test migration requires
  expectations to be calculated from it. Disposition: **propose_fix** (`s2-michael.md`).
- **C4 (major).** Decision 4 collects names only the `instruments` block configures, while Decision 6
  says a name in both places is reported by each — two instructions that produce different warnings
  for one input. Disposition: **propose_fix** (`s2-michael.md`).
- **C5 (major).** The `instruments` block is described only by name and by "eight unchanged
  messages" in another artifact. Disposition: **propose_fix** (`s2-michael.md`).
- **C6 (major).** The release and documentation hand-offs have no stated ordering, so the workflow
  may publish the break with the old README. Disposition: **propose_fix** (`s2-michael.md`).
- **C7 (minor).** The vocabulary rules conflict: the `docs/formats.md` row permits "cell" for the
  model, while Decision 9 and the planned grep treat it as a failure. Disposition: **decline**,
  documentation only (`s2-michael.md`).
- **C8 (minor).** Rollback relies on a release note describing the old shape, but no owner or step
  creates that note. Disposition: **decline** (`s2-michael.md`).

The lens marked one assumption unverified, and it was the one C6 turned on: that the release workflow
can publish immediately after merge without waiting for the separate docs pass. The resolver's
reading of `release.yml` confirmed it could, and that reading became the C6 remedy.

## Stage 3: Critic Review Loop

Two lenses ran against the feature-spec standard each round — `council-critic` (`s3-r*-critic.md`)
and `council-structural` (`s3-r*-structural.md`) — with Michael resolving and Bambadjan patching
`design.md`. The loop ran five rounds and closed on **two consecutive clean rounds, at round 4 and
round 5**. No round hit the cap and none stopped for churn: every round's record states that no fix
undid an earlier patch.

Twenty-one findings were raised across the five rounds: eleven in round 1, five in round 2, two in
round 3, one in round 4 and two in round 5. With Stage 2's eight, the review raised twenty-nine in
all: fourteen were resolved as `propose_fix` and fifteen as declined or contested.

**Round 1 — 11 findings (4 major, 7 minor), status `needs_fixes`.** The critic's verdict was that the
architecture, alternatives, boundary and Migration Plan order held, with three major defects left in
the message table and the test dispositions. The structural lens called the structure sound and asked
for four minor patches.

- **CR3-1 (major, critic).** The two whole-row rejection parts read `row N is not a list; …` and
  `row N is empty; …`, without the colon the spec scenario "A row with no one entry to blame" and
  rulings 5 and 9 put in the placement. → `propose_fix`.
- **CR3-2 (major, critic).** The design called the rejection wrapper unchanged and stated a wrapper
  the code does not produce; the real one is `pi-jefferson: <path> was rejected (<part>); rendering
  the default row`, pinned by two exact-equality tests. → `propose_fix`.
- **CR3-3 (major, critic).** The measured input for the branch/session/status alignment test exposes
  centring only: a row of `session` then `status` gives `status` no spare columns, so right alignment
  becomes unobservable. → `propose_fix`.
- **CR3-4 (major, critic).** The delete rule removed the only test of a retained MODIFIED scenario,
  "A right-aligned last cell at a width that does not divide evenly", because the test it deleted has
  two halves. → `propose_fix`.
- **CR3-5 (minor, critic).** The two mechanical rewrites omit the common `rows: [{ cells: X }]` form.
  → `decline`.
- **CR3-6 (minor, critic).** Decision 4 does not say whether the stored row number counts from 0 or 1,
  and change 2 is the stated consumer of that data. → `decline`.
- **CR3-7 (minor, critic).** `docs/` stays out of `files`, so the moved reference is not in the
  tarball, and the design does not say how the README links to it. → `decline`.
- **S3-R1-1 (minor, structural).** Ruling 3 assigned the design four test dispositions and a doc
  comment; Decision 7 named none of them. → `propose_fix`.
- **S3-R1-2 (minor, structural).** The shown form is embedded in two messages, and ruling 2 directs
  that the design mark it as one constant. → `propose_fix`.
- **S3-R1-3 (minor, structural).** The mapping table's "Stay" row hides a Status sentence this change
  falsifies and two links to a heading it moves. → `decline`.
- **S3-R1-4 (minor, structural).** Open Questions claims both items leave every rule, file list and
  task unchanged, which its own bullets contradict. → `decline`.

The round's churn check found no fix restoring text from before Stage 2: CR3-1, CR3-2 and S3-R1-2
edited message-table rows that Stage 2 did not touch, CR3-3 refined Stage 2's example, and CR3-4 and
S3-R1-1 added dispositions.

**Round 2 — 5 findings (1 major, 4 minor), status `needs_fixes`.** Both lenses re-verified that every
round-1 fix landed as directed; the critic confirmed all six by citation, and the structural lens
confirmed six fixes against the live code.

- **CR3R2-1 (major, critic).** Ruling 8 requires each kept test's hand-worked expectation in the
  design; the second bullet named its tests and gave no values. For the totals test the design's
  stated method cannot produce the value at all: `seen.length` comes from the renderer's probe and
  per-width cache, not from the content rule. → `propose_fix`.
- **CR3R2-2 (minor, critic).** The retired-subject list omitted equal shares chosen by a document,
  the top-level row shortcut and a `{}` row's default, so the mechanical rewrites would keep a
  duplicate test and tests named for behaviour that no longer exists. → `propose_fix`.
- **S3-R2-1 (minor, structural).** The Context section's third constraint still said the tests that
  build rows directly "stay as they are", which ruling 7 and the placement table narrow. →
  `decline`.
- **S3-R2-2 (minor, structural).** Decision 1 cited `tests/configuration.test.ts:1220` for a lone
  `distribution`, but that test asserts `{cells, distribution}`. → `decline`.
- **S3-R2-3 (minor, structural).** The placement table said "about 20 carrying an `id`" where ruling
  7 measured 24. → `decline`.

The round's churn check found no fix undoing an earlier patch: the two applied fixes added the values
ruling 8 requires and extended the retired-subject list, which round 1 had not touched, and round 1's
split of the equal-shares test and its three-row input stood.

**Round 3 — 2 findings (1 major, 1 minor), status `needs_fixes`.** The structural lens returned no
findings: it verified both round-2 fixes verbatim, re-checked every citation in the changed sections,
re-confirmed the delta against the living specs by name and line, and found the churn check clean.

- **CR3R3-1 (major, critic).** Ruling 2 fixes the check order, and the delete rule removed all three
  tests that pin it, with no spec scenario pinning it either — so a guard placed after
  `readInstruments` or after the rows would leave the whole migrated suite green. The precedence test
  at `:1082` had no disposition, though its subject survives. → `propose_fix`.
- **CR3R3-2 (minor, critic).** The Rollback paragraph said to revert "the parser commit", but the
  repository squash-merges, so `main` carries one commit for the whole change and a partial revert
  leaves the migrated tests red, which then blocks the release. → `decline`.

**Round 4 — 1 finding (minor), status `clean`.**

- **CR3R4-1 (minor, critic).** The rewritten `tests/configuration.test.ts:1087` fixture was one
  bracket short — a flat list of entries where rule (b) and the 132-column input write a nested list.
  → `decline`, with the correct nested form recorded for `tasks.md`. The critic's verdict was "Ready
  for tasks", with nothing blocking or major left.

**Round 5 — 2 findings (minor), status `clean`.** Both lenses reported `design.md` unchanged since
round 4 and every earlier fix standing.

- **CR3R5-1 (minor, critic).** Decision 4's *Why* said `string[]` "would change the shape of a field
  that three tests read", contradicting its own *Alternatives* line; the live tests read `warning`
  far more often. → `decline`.
- **S3-R5-1 (minor, structural).** The placement table's "about 20" count again, on a row unchanged
  since round 2. → **contest**, and it stays settled as S3-R2-3.

## Stage 4: Intermediate Zoom Out

`council-zoom-out` (`s4-zoom-out.md`) audited the Stage 2–3 edits for bloat and altitude drops and
returned `findings: []`. Its verdict: the edits clarify existing contracts, test dispositions and
release sequencing without adding runtime layers, speculative mechanisms or scope. It read Decision
10's added fixtures and worked expectations as the evidence binding rulings explicitly require rather
than as helper implementations or a new subsystem, and found no actionable altitude drop.

Eight assumptions came back verified, including that responsibility placement stays inward with no
new runtime file or layer; that the Stage 2 clarifications and the pre-merge documentation and
archive sequencing stay inside the existing boundary; that Stage 3's corrections, the private shared
shape literal, the `containers` dispositions, the surviving-test inputs and the precedence assertions
reuse existing production paths and test helpers; and that the expanded test migration preserves
unrelated integration subjects while removing redundant retired-shape coverage and leaving renderer
assertions intact. It closed by noting what it did not do: it ran nothing, so the implementation gate
must still show the atomic parser-and-fixture migration green; and it validated no future
documentation page, package link or release execution.

## Michael's Resolutions

Michael resolved every finding. Each disposition below cites the file that records it. Fourteen
findings were applied to `design.md`; fifteen were declined or contested, with reasons on the record.

**`s2-michael.md` — Stage 2 (5 applied, 3 declined).** C1, C3, C4, C5 and C6 were applied: the
optional-row outcomes and the unchanged defaults with pointers in decision 1; the content rule's home,
a worked example, the subject-disappears rule and the two mechanical rewrites in decision 10; the
block list defined and the message shapes ordered in decisions 4 and 6; the `instruments` row's count
replaced by a pointer and the block defined in decision 1; and the Migration Plan reordered so the
docs pass and the archive land on the PR's branch. C2, C7 and C8 were declined as minor or
documentation-only, with the file-selection rule, the vocabulary rule and the generated-release-notes
fact recorded so a later round would not re-derive them.

**`s3-r1-michael.md` — round 1 (6 applied, 5 declined).** CR3-1, CR3-2, CR3-3, CR3-4, S3-R1-1 and
S3-R1-2 were applied: the colon in both whole-row parts plus the placement sentence; the wrapper
restated as the code builds it, with both pins cited; the three-row alignment input with its worked
values; the split of the equal-shares test with its 132-column half kept; the four `containers` tests
and the doc comment named in decision 7; and the shown form declared one private constant. CR3-5,
CR3-6, CR3-7, S3-R1-3 and S3-R1-4 were declined, each with the reason and the fact that closes it.
Michael also corrected two of the critic's own readings on the record: that CR3-4's concrete
regression is already caught by the default-row test, so the real defect was a contradiction inside
decision 10; and that CR3-3 replaced an example Michael himself had supplied in Stage 2, which makes
it a correction rather than churn.

**`s3-r2-michael.md` — round 2 (2 applied, 3 declined).** CR3R2-1 and CR3R2-2 were applied: the
worked values for the totals, turn-boundary and `${reason}` runs written into decision 10, with the
*Why* narrowed to columns and text and render-call counts credited to the renderer's probe and cache;
and the retired-subject list extended with three subjects, four tests named for deletion, the
formats-and-styles test removed from the keep list, and the survive clause added to the rewrites. He
ran every value in a clone before adopting them. S3-R2-1, S3-R2-2 and S3-R2-3 were declined as
minor, the first two with the correct reading stated and the third on the ground that the rule and
`pnpm typecheck` already make the count self-enforcing.

**`s3-r3-michael.md` — round 3 (1 applied, 1 declined).** CR3R3-1 was applied as a kept-and-split
disposition for the precedence test, with `:1083` and `:1084` deleted rather than rewritten, two
assertions added through the file's own `rejected` helper to pin ruling 2's order, and `:1085` and
`:1087` rewritten to keep their expectations. He explicitly required no new spec scenario, because the
living spec pins no precedence and the order has its home in decision 1. CR3R3-2 was declined as
minor, with the rollback that works recorded: revert the squash-merge commit in a PR labelled
`release:minor`.

**`s3-r4-michael.md` — round 4 (0 applied, 1 declined).** CR3R4-1 was declined as minor. Michael
agreed the literal was one bracket short, rated the cost small, and recorded the correct nested
fixture so `tasks.md` copies it.

**`s3-r5-michael.md` — round 5 (0 applied, 1 declined, 1 contested).** CR3R5-1 was declined as minor,
with the undercount confirmed and the refusal of `string[]` left standing on ruling 6. S3-R5-1 was
contested: it is S3-R2-3 again, on a row unchanged since that round, so it stays settled.

## Settled Findings

Twenty-six items are settled across the stages. Each is Michael's record, and each names the evidence
that closes it.

**Stage 2 — three settled.**

- **C2** — file selection and trust are unchanged and not restated: the project document is read only
  when the project is trusted and the file exists, and it replaces the agent document whole; a missing
  file renders the default row silently, while an unreadable or rejected one warns with the path. The
  docs pass documents it from code. (`configuration.ts:352-398`, `startup.ts:60`.)
- **C7** — decision 9 governs, so no user-facing `docs/` page says "cell", and the `docs/formats.md`
  row's allowance gives way to it (`owner-rulings.md:13`, D6).
- **C8** — release notes are generated, old-shape guidance lives in the upgrade note, and the rollback
  message is accurate (`release.yml:111-114`, `configuration.ts:231-233`).

**Stage 3 round 1 — eight settled.**

- **CR3-3 is a correction of Michael's own Stage 2 remedy, not churn.** The rule stays; only the
  example input was replaced, and the replacement was measured through the real harness.
- **CR3-4's concrete regression is already caught.** A remainder handed to the last cell fails the
  default-row test; the real defect was a contradiction between decision 10's rule and its listing.
- **CR3-5 (declined as minor).** D3 leaves one reading of `rows: [{cells: X}]`, which becomes `X`.
- **CR3-6 (declined as minor).** Notices are private, and the printed placement is pinned by the
  delta's scenarios.
- **CR3-7 (declined, documentation only).** README links follow the absolute-URL convention, and
  `docs/` stays out of `files`.
- **S3-R1-3 (declined, documentation only).** The docs pass rewrites the Status sentence and
  re-targets its two anchors.
- **S3-R1-4 (declined as minor).** The Open Questions claim is inaccurate, but the `docs/` file list
  is the docs pass's deliverable, outside `tasks.md`.
- **Churn check, round 1:** no fix restores text from before Stage 2.

**Stage 3 round 2 — six settled.**

- **CR3R2-1's values were run:** all seven runs pass in a clone at 24ee86b, with `seen.length` 6 and
  `scans` 1, and the count comes from the renderer's per-width cache rather than the content rule.
- **CR3R2-2's coverage check holds:** deleting the three configuration tests loses no surviving
  subject, and the formats-and-styles test differs from its content twin only in the key.
- **S3-R2-1 (declined as minor).** The Context constraint gives way to ruling 7 and the placement
  table, and `pnpm typecheck` enforces the strip.
- **S3-R2-2 (declined as minor).** The cited test asserts `{cells, distribution}`, not a lone
  `distribution`, and the fall-through argument rests on the reader, not the test.
- **S3-R2-3 (declined as minor).** The count is 24, matching ruling 7.
- **Churn check, round 2:** no fix undoes an earlier patch; round 1's split and its three-row input
  stand.

**Stage 3 round 3 — three settled.**

- **CR3R3-1 was measured:** the two assertions pass against a guard placed right after the object
  check and fail against one placed after the rows loop; `:1083` is deleted rather than rewritten
  because rule (a) would make it a copy of `:1085`.
- **CR3R3-2 (declined as minor).** The rollback that works is to revert the squash-merge commit in a
  PR labelled `release:minor`; C8's rollback message stands.
- **Churn check, round 3:** no fix undoes an earlier patch; round 2's lists and round 1's fixes stand.

**Stage 3 round 4 — two settled.**

- **CR3R4-1 (declined as minor).** The rewritten `:1087` fixture is the nested form, with its
  expectation unchanged; the flat literal is a typo that rule (b) and D3 override, and `tasks.md`
  records the nested form.
- **Churn check, round 4:** no finding asks to undo an earlier patch, and both lenses re-verified the
  fixes against the live tests.

**Stage 3 round 5 — three settled.**

- **CR3R5-1 (declined as minor).** The "three tests" undercount is confirmed; the refusal of
  `string[]` stands on ruling 6, and the *Alternatives* line states the cost correctly.
- **S3-R5-1 stays settled as S3-R2-3.** The count is 24, and `pnpm typecheck` enforces the strip.
- **Churn check, round 5:** the round proposes no fix, so no earlier patch is undone.

**Stage 1 and the churn check before Stage 2.** `council-zoom-out` and `council-catalyst` returned
zero findings in Stage 1, so no fix in any later round undoes an earlier patch.

## Owner Decisions Required

None.

Every resolution record carries `owner_decisions: []` — `s2-michael.md`, `s3-r1-michael.md`,
`s3-r2-michael.md`, `s3-r3-michael.md`, `s3-r4-michael.md` and `s3-r5-michael.md` — and no lens
raised an owner question at any stage. Michael resolved all twenty-nine findings himself, fourteen as
applied fixes and fifteen as declines or contests, so no item is waiting on Joel before `tasks.md`
begins.
