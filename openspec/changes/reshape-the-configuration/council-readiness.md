{
  "mode": "council",
  "lens": "council-readiness",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "The shape and the rulings are settled, and the delta is close to archivable. Five gaps would otherwise force the coder or the test author to invent design. (1) The set of retired top-level keys and their precedence is undefined. A lone `{\"distribution\":\"equal\"}` or `{\"id\":\"x\"}` is a valid 0.12.0 one-row document and falls between two scenarios, and `cells` beside `rows` has no scenario. (2) `rows: []` has no scenario. (3) Warnings on an accepted document, meaning unknown instruments, have no placement rule, because the placement requirement is scoped to rejections. (4) The proposal's no-touch list for `components/row/` conflicts with the preferred answer to the `Row.id` question. (5) The migration is all-or-nothing: no dual reader, a whole-document rejection that falls back to the default row, and a rollback that gives the user no hint. The design's Migration Plan and the task order must therefore make the parser change and every fixture rewrite one atomic, green-at-the-end group. No Joel question is open; every item below is Michael's or the Conductor's. My picks are stated per finding.",
  "findings": [
    {
      "id": "R1",
      "severity": "major",
      "location": "specs/statusline/spec.md, ADDED 'A rows list is the only way to declare rows', scenarios 'The retired single row at the top', 'A retired key beside rows', 'No rows declared'",
      "finding": "The delta never states which top-level keys are retired or when they reject. The scenarios cover a row 'declared at the top level', and `id` or `distribution` 'beside a `rows` list'. A retired key with no `rows` beside it matches no scenario, and 'No rows declared' says the default row renders. `cells` beside `rows` is also uncovered. The old code rejected it with a 'both shapes' message, and Michael's T3 says this must produce a message. Which message wins when several retired keys appear is not stated either.",
      "rationale": "Zero-decision rule. Today any top-level `cells`, `id` or `distribution` is a legal one-row document, and these are exactly the documents that silently degrade if the parser treats them as unknown keys (`configuration.ts:304-306`, unknown keys ignored). The coder would have to choose the trigger set and the order of checks. The test author has no scenario to write against.",
      "concrete_case": "`{\"distribution\":\"equal\"}` is valid in 0.12.0 as a one-row document with ten blank cells. Under the delta, 'No rows declared' says it renders the default row silently, while 'A retired key beside rows' does not apply. Likewise `{\"cells\":[...],\"rows\":[[...]]}` has no scenario, and the old 'both shapes' wording is gone.",
      "recommendation": "Pick: the retired top-level key set is exactly `cells`, `id` and `distribution`, and it rejects whether or not `rows` is present. The check runs first, before `rowGap`, `instruments` and `rows`, so the migration hint wins over any other fault. The message names the first key found, in that fixed order, and shows `{\"rows\": [[{\"instrument\": \"model\"}]]}`. Replace the two scenarios with one for each trigger: lone `distribution`, lone `id`, lone `cells`, and `cells` beside `rows`. Qualify 'No rows declared' as 'no rows and no retired key'."
    },
    {
      "id": "R2",
      "severity": "major",
      "location": "specs/statusline/spec.md, ADDED 'A rows list is the only way to declare rows'",
      "finding": "There is no scenario for `rows: []`. The requirement says 'a document that declares no rows MUST render the default row', which is ambiguous between an absent key and an empty list. Michael §5 treats `rows: []` as settled, and the code does it (`configuration.ts:318-320`: `rawRows.length === 0` gives the default row), but no spec scenario pins it.",
      "rationale": "Boundary case ('empty'). Without a scenario the test author invents the behavior, and `rows: []` could equally be rejected, as an empty row is.",
      "concrete_case": "`{\"rows\": []}` and `{\"rows\": [], \"instruments\": {...}}`.",
      "recommendation": "Add scenario 'An empty rows list': the document is accepted with no warning, and the default row renders. If the design prefers rejection, that is a behavior change to flag. Pick: keep it accepted."
    },
    {
      "id": "R3",
      "severity": "major",
      "location": "specs/statusline/spec.md, ADDED 'A rejection locates its offender by row and position' and 'An entry names the instrument its cell renders'",
      "finding": "The placement requirement is titled and scoped to rejections, but the one warning that survives acceptance, the unknown instrument, has no placement rule. Joel approved `row 3: \"taiknr.savings\" is not a known instrument`, a row-only form for an entry-level fault. Open points: whether each unknown entry gets a line or one combined line; whether the same name in two rows is reported once or twice (today's `Set` dedupes); how an entry past the ceiling, say instrument 12, is placed; and what a name that appears only in the `instruments` block gets, since it has no row. The proposal and Michael's T8 leave all four open. Existing tests pin exact strings at `tests/configuration.test.ts:961, 964, 970`.",
      "rationale": "Zero-decision rule and error shape. Tests assert exact message text, so the coder cannot be left to choose the form. T8 also requires the collected unknown names to stay as data for change 2, which constrains the data shape.",
      "concrete_case": "Rows `[[{instrument:'taiknr.savings'},{instrument:'path'}],[{instrument:'taiknr.savings'}]]`, plus `instruments: {'zzz': {}}`. One line? Two? Is 'zzz' placed?",
      "recommendation": "Design must fix one message table in design.md. Pick: follow Joel's approved row-only form, `row N: \"<name>\" is not a known instrument`, once per distinct (row, name). The `instruments`-block case gets its own form with no row, for example `instruments: \"<name>\" is not a known instrument`. Keep `Notices` holding structured entries ({row, name} and block names) rather than a string set. Extend the placement requirement's scope to warnings, or add a separate requirement."
    },
    {
      "id": "R4",
      "severity": "major",
      "location": "proposal.md 'What this change must not touch' versus 'Whether a row id stays on the internal row (T7)'",
      "finding": "The proposal bans touching `components/row/` and keeps the renderer tests, yet Michael's preferred answer to T7 is that `Row.id` goes. `Row.id` is declared in `components/row/row.ts`, and about 20 fixtures in `tests/row-renderer.test.ts` build rows with `id:`. Removing it breaks the no-touch boundary and the D8 'keep the renderer's tests' ruling.",
      "rationale": "Verified file boundary. The design must choose, or the tasks cannot list exact Create/Modify/Delete paths. I confirmed by grep that `row.id` is read only at `configuration.ts:327-330`, the duplicate check, so the check is dead once `id` is not declarable. Nothing in the renderer reads it.",
      "concrete_case": "`row-renderer.test.ts:121,131,141,185,435,436,482,513,615,825` all build `{ id: ..., distribution: ..., cells }`.",
      "recommendation": "Pick: keep `Row.id` and `Row.distribution` untouched. The parser synthesizes `row-${index}`, or even the same `row-0` for every row, and the duplicate-id check is deleted as unreachable. Do not leave a dead branch, because it cannot be tested through the document. Say so in the design, with the file list."
    },
    {
      "id": "R5",
      "severity": "major",
      "location": "proposal.md Impact (tests) and the tasks that follow",
      "finding": "There is no dual reader, so the parser change and all fixture rewrites cannot land in separate green groups. 22 of the 26 inline documents in `tests/jefferson.test.ts`, the documents in `tests/configuration.test.ts` and `tests/instrument.test.ts:312`, and `tests/session-data-feed.test.ts:304` all use the retired shape. Eleven or so end-to-end tests also depend on `distribution:\"equal\"` for their exact expectations (`jefferson.test.ts` lines 340, 698-702, 740, 760, 778, 922-938).",
      "rationale": "Dependency order: each group must leave the suite green. A first group that only edits the parser turns most of the suite red. A first group of fixtures only is red until the parser lands. Fixing the expectations of the `distribution:\"equal\"` tests by pasting whatever the new code prints is the blocking pattern T6 warns about.",
      "concrete_case": "Task 'rewrite configuration.ts envelope' alone: `pnpm test` fails around 30 tests at once.",
      "recommendation": "The design should fix the grouping: group 1 is the failing new-shape tests, then the parser and messages, then all fixture migration, as one atomic group ending green. For each `distribution:\"equal\"` end-to-end test, the design states one disposition: (a) delete, with the equal-share geometry already covered by `row-renderer.test.ts` and `width-plan.test.ts`; or (b) rewrite on `createFooter` with a hand-built `Row`, the way `tests/format.test.ts:179` does, with the expectation derived from the spec's content-sized layout and not copied from output. Include `tests/session-data-feed.test.ts:304` in that list."
    },
    {
      "id": "R6",
      "severity": "major",
      "location": "design.md Migration Plan (to be written); proposal.md Impact 'Release' and 'Documentation'",
      "finding": "The migration has no automatic path, and its failure and rollback modes are undocumented. Facts verified in code: a rejected document renders the default row of ten placeholder cells and raises one `ctx.ui.notify` at `session_start` (`startup.ts:73`). `/jefferson` reports only the footer row count (`startup.ts:40-45`) and does not repeat the warning, so after the toast there is no persistent signal. Rejection falls back to the default row, not to the agent document. A trusted project's rejected document therefore also hides a good agent document. Rolling back to 0.12.0 after a hand edit gives `row 0 is not an object` with no hint. The only documents accepted by both versions are those with `instruments` and/or `rowGap` and no `rows`.",
      "rationale": "Version skew and rollback safety. A project document committed to a repo breaks every teammate on a different pi-jefferson version, in both directions, and the downgrade message misleads. Nothing is destroyed (the file is never rewritten), so this is data-safe. With 2.5k weekly downloads and breaking allowed by Joel, the risk is acceptable only if the plan states it.",
      "concrete_case": "Teammate A upgrades and commits `.pi/pi-jefferson.json` as `{\"rows\":[[{\"instrument\":\"model\"}]]}`. Teammate B on 0.12.0 sees ten placeholders and a 'row 0 is not an object' toast.",
      "recommendation": "The Migration Plan records: no auto-rewrite and no old-shape reader (D2, D13); the rejection message is the migration help, and the default row plus a single toast is the failure mode; the compatible subset (`instruments`/`rowGap` only); the rollback steps (restore the old shape by hand, or pin 0.12.0); and that `release:minor` is applied by a human to the PR. A forgotten label ships this as 0.12.1 (`release.yml:57-59`; Eleanor found no reminder mechanism). In `tasks.md`, mark the label as Joel's, not the coder's. README and ADR text stays out of `tasks.md`, since Bambadjan owns that pass."
    },
    {
      "id": "R7",
      "severity": "minor",
      "location": "proposal.md open items; `configuration.ts:247, 296, 338-340`",
      "finding": "The `containers` notice still says 'declare cells instead'. That is a retired user-facing word, and `cells` is also a retired key. The baseline spec does not mention `containers` at all, so no spec home exists for either keeping or rewording it.",
      "rationale": "A leftover user-facing 'cell' breaks the ruling that 'cell' leaves warnings. A reworded notice would invent behavior that no requirement covers.",
      "concrete_case": "`{\"rows\":[[{\"instrument\":\"model\"}]],\"containers\":{}}` still yields a warning containing 'declare cells instead'.",
      "recommendation": "Pick: remove the notice and the `Notices.containers` flag. `containers` becomes an ordinary unknown key, ignored silently like every other (consistent with D13 and the document-key rule in the proposal). Delete or update its tests in the same group as R5."
    },
    {
      "id": "R8",
      "severity": "minor",
      "location": "specs/statusline/spec.md, ADDED requirements; `openspec validate --strict`",
      "finding": "'A row's entries are its cells and their places' is by my count roughly 480-485 characters against the 500 limit that `--strict` enforces on ADDED requirements. Michael measured the old texts at 496-500. I could not run `openspec` here. The proposal states fixed literals (`{\"rows\": [[{\"instrument\": \"model\"}]]}`, `[{\"instrument\": \"model\"}]`) that tests will match as exact text, not as `JSON.stringify` output, because `JSON.stringify` would drop the spaces.",
      "rationale": "A near-limit requirement fails strict validation after any later wording edit. A literal that differs by one space from the implementation fails a test.",
      "concrete_case": "Adding one clause to the entries requirement (for example R1's retired-key wording, if moved there) crosses 500.",
      "recommendation": "Run `openspec validate --specs --strict` on the change before the design gate and record the lengths. Put any new rules into scenarios or a new requirement rather than that one. In the design's message table, mark the two example strings as literal constants."
    },
    {
      "id": "R9",
      "severity": "minor",
      "location": "specs/statusline/spec.md 'Purpose' section (baseline lines 3-4); `openspec/specs/extension-source-layout/spec.md`",
      "finding": "The baseline Purpose still says 'the evenly divided cells each row renders', which is no longer true. The layout spec cites 'Cell content comes from an instrument', which is REMOVED. A delta cannot edit Purpose, and the proposal acknowledges the citation but gives it no delta.",
      "rationale": "Stale text left behind after the archive. It is documentation-only and cannot block a feature.",
      "concrete_case": "After archive, a reader of `extension-source-layout` follows a citation to a requirement name that no longer exists.",
      "recommendation": "Leave both to the docs pass. Record them in the design as known follow-ups so they are not mistaken for a gap in tasks.md."
    }
  ],
  "assumptions": [
    {
      "assumption": "The parser in `configuration.ts` at 24ee86b has no reader other than `normalizeDocument`/`normalizeRow`, and `row.id` is read only by the duplicate-id check (lines 325-331).",
      "status": "verified"
    },
    {
      "assumption": "A rejected selected document falls back to the default row, not to the agent document (`readConfiguration`, lines 365-402).",
      "status": "verified"
    },
    {
      "assumption": "The warning is shown once through `ctx.ui.notify` at `session_start`, and `/jefferson` does not repeat it (`startup.ts:40-45, 73`).",
      "status": "verified"
    },
    {
      "assumption": "0.12.0 rejects `rows: [[...]]` with 'row 0 is not an object', and no hint is given (`configuration.ts:231-234`).",
      "status": "verified"
    },
    {
      "assumption": "The delta's MODIFIED requirements retain every baseline scenario (6, 9 and 6 respectively for instrument configuration, alignment and 'Instrument text is bound'), so the archive's dropped-scenario check will not fire.",
      "status": "verified"
    },
    {
      "assumption": "All ADDED requirements other than the entries requirement are comfortably under 500 characters.",
      "status": "unverified"
    },
    {
      "assumption": "A long absolute path plus the embedded example does not get truncated by pi's `notify`, so the migration hint survives.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "I did not run `openspec validate --strict` or measure requirement lengths with OpenSpec's extractor, so R8 is an estimate.",
    "I did not check whether pi truncates or wraps long `ctx.ui.notify` strings; that is a Chidi platform fact.",
    "I did not enumerate every test that pins old message text or the `distribution` key; the sampled list is representative, and a full count belongs in the design's file list.",
    "I did not look at README, AGENTS.md, ARCHITECTURE.md or the ADR content beyond what the research files cite, since these are the docs pass.",
    "I did not look at pi's spinner or the event registration that change 2 and change 3 need."
  ]
}