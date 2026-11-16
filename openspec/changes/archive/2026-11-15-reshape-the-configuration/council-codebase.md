{
  "mode": "council",
  "lens": "council-codebase",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Every current-state citation I checked resolves on disk, and the delta's shape rules match the live parser, so the proposal is sound where it speaks. It stops short of the code it retires in five places: the retired-key matrix (which top-level keys reject, in what order), the `containers` notice whose only surviving read sits inside the `rows` branch, the single-string `warning` contract that cannot carry one placed message per offender, `Row.id`'s open fate against a \"must not touch components/row/\" boundary, and a rejection signal that vanishes with the startup toast while `/jefferson` reports nothing about it. None re-opens a ruling; each needs the design to state an answer before tasks can be written.",
  "findings": [
    {
      "id": "CB-1",
      "severity": "major",
      "location": "proposal.md \"BREAKING — a retired key is rejected, not ignored\"; specs/statusline/spec.md \"A rows list is the only way to declare rows\" / \"Scenario: A retired key beside rows\"; extensions/jefferson/configuration.ts:278-300 and 231-247",
      "finding": "The set of retired top-level keys is not enumerated consistently. The proposal says a top-level `id` or `distribution` rejects with no qualifier; the delta's only scenario is \"a retired key beside rows\", and `cells` appears only in \"The retired single row at the top\". No scenario covers `cells` beside `rows` (rejected today with a different message), `id`/`distribution` with no `rows` at all (accepted today), or `containers`. Nor does either artifact say what wins when a retired key and a bad `rowGap` are both present, though the suite has a dedicated test pinning a sibling precedence rule.",
      "rationale": "The live parser treats a document with no `rows` as one top-level row (configuration.ts:298-300), so `{\"distribution\":\"equal\"}` and `{\"id\":\"banner\"}` are accepted and applied today. Joel's ruling rejects \"the old top-level form\" but names no keys, so the coder must choose both the triggering set and the message for each. That is a design decision leaking into implementation (implementation-readiness-standard §1).",
      "concrete_case": "`{\"distribution\":\"equal\"}`: accepted today, ten blanks sized equally — the path tests/configuration.test.ts:1220 exercises. After the change the proposal says reject, the delta has no scenario. `{\"cells\":[{\"instrument\":\"blank\"}],\"rows\":[{}]}`: rejected today as \"carries both a top-level row and a rows list\" (tests/configuration.test.ts:72, 537, 1084); after the change either that message or the new-form hint is defensible. `{\"distribution\":\"equal\",\"rowGap\":9}`: today reports `rowGap`; afterwards either message.",
      "recommendation": "State the matrix in the delta: one scenario per retired top-level key (`cells`, `id`, `distribution`, and a decision on `containers` from CB-2), with the exact message each produces, and one sentence fixing the check order — retired keys before `rowGap`, as the envelope is read before any row today. Keep every other unknown top-level key silently ignored, as the delta already promises."
    },
    {
      "id": "CB-2",
      "severity": "major",
      "location": "specs/statusline/spec.md (no mention of `containers`); extensions/jefferson/configuration.ts:247, 294-300, 338-340; tests/configuration.test.ts:961-971",
      "finding": "The `containers` notice loses its read. Today it is set twice: at row level (configuration.ts:247, reachable because a no-`rows` document is treated as a row) and at document level (:296, inside `if (\"rows\" in doc)`). Retiring the top-level row makes the row-level read unreachable, and the document-level read sits in the branch a no-`rows` document no longer takes. The delta says nothing about `containers`, so a coder following it drops the notice; the existing exact-string test writes exactly such a document.",
      "rationale": "This is the migration hint for the previous key retirement, and the change makes every 0.12.0 document hit the rejection path. Losing the notice silently, with no requirement and no test demanding it, is an unstated behaviour change in the artifact whose job is to state behaviour changes (implementation-readiness-standard §2).",
      "concrete_case": "`readDocument({ containers: 3, instruments: { nope: {}, other: {} } })` — the document behind the assertion at tests/configuration.test.ts:970 — warns today `pi-jefferson: <path> carries the containers key, which is no longer read; declare cells instead; names instruments the extension does not implement: nope, other; those cells render blank`. After a literal reading of the new rules it warns only about `nope, other`.",
      "recommendation": "Say where `containers` is read: at document level, once, regardless of `rows`, keeping the current string and the warning order — or drop the key and its notice outright and say so. Either way name `tests/configuration.test.ts:966-971` in the affected test list; today only the proposal's open question T10 raises it, and the delta does not."
    },
    {
      "id": "CB-3",
      "severity": "major",
      "location": "proposal.md \"What this change must not touch: components/row/\" and \"Tests that write a document\"; components/row/row.ts:19-23; configuration.ts:327-331; tests/format.test.ts:179; tests/session-data-feed.test.ts:303; tests/configuration.test.ts:359-390",
      "finding": "Dropping `Row.id` — an open decision (T7) that michael-orientation.md recommends taking — edits `components/row/row.ts`, which the proposal lists under \"must not touch\", and breaks two test files no artifact names. The id's only reader is the duplicate-id loop, but the field is constructed in four test files, not the one (tests/row-renderer.test.ts) that any artifact mentions; the two id tests in tests/configuration.test.ts die with the check.",
      "rationale": "The standard's exact-file-boundary rule (§2) and zero-decision rule (§1): a plan cannot leave an open decision that, if taken as recommended, contradicts its own not-touch list and omits Modify targets that fail `pnpm typecheck`.",
      "concrete_case": "Delete `id` from `Row` and `pnpm typecheck` fails at tests/format.test.ts:179 (`{ id: `row-${index}`, distribution: \"equal\" as const, cells: [...] }`) and tests/session-data-feed.test.ts:303-305, and ~20 literals in tests/row-renderer.test.ts; `tests/configuration.test.ts:359-390` (synthesized id, explicit id kept, duplicate rejected, collision rejected) has no subject left.",
      "recommendation": "Settle T7 in design. If `id` goes, list `components/row/row.ts`, `tests/row-renderer.test.ts`, `tests/format.test.ts`, `tests/session-data-feed.test.ts` and the id tests in `tests/configuration.test.ts` as `Modify`, and narrow the not-touch note to the row renderer, `width-plan.ts`, `Row.distribution` and `DISTRIBUTIONS`. If it stays, say that the synthesized `row-N` is internal, unreachable from a document, and unrelated to the 1-based numbers in warnings."
    },
    {
      "id": "CB-4",
      "severity": "major",
      "location": "configuration.ts:64-74 (Configuration.warning), 336-350 (acceptedWarning); startup.ts:73; tests/configuration.test.ts:961, 964, 970; specs/statusline/spec.md \"An entry names the instrument its cell renders\" and owner-rulings.md D7",
      "finding": "The warning's cardinality is unstated. `Configuration.warning` is one `string | undefined`, and `acceptedWarning` joins every notice with \"; \". The approved placement form (`row 3: \"taiknr.savings\" is not a known instrument`, plus `row 1, instrument 2:` for entries) implies one message per offender, so a document with unknowns in two rows plus a name in the `instruments` block needs two or three placements, which the single string and the single `ctx.ui.notify` cannot express without a rule. The proposal calls the wording open; neither artifact calls the count or the field's type open.",
      "rationale": "A design that keeps `string` must invent a joining convention; one that changes to `string[]` must change `Configuration`, `startup.ts` and three exact-string assertions. That is an interface and error-shape decision the standard says must be settled before implementation (§1).",
      "concrete_case": "`{\"rows\": [[{\"instrument\":\"nope\"}], [{\"instrument\":\"nope\"}]], \"instruments\": {\"other\": {}}}` produces exactly one line today: `names instruments the extension does not implement: nope, other; those cells render blank`. Under D7's per-row form it would produce two row-placed messages and one block-level message with no row to place it by.",
      "recommendation": "The design states the contract: either `warning` stays one string with placements inside it joined by \"; \" (and says in what order rows, entries and block names appear), or it becomes `string[]` with one `notify` per element. Also state which form a name that appears only in the `instruments` block takes, since today's shared string falsely claims \"those cells render blank\". Keep the collected names as data, as T8 asks, so change 2 can hold the report back."
    },
    {
      "id": "CB-5",
      "severity": "minor",
      "location": "specs/statusline/spec.md \"A row's entries are its cells and their places\"; configuration.ts:249-257; tests/configuration.test.ts:66, 107-120, 361-362, 402, 418, 499, 502, 550; tests/jefferson.test.ts:298-309; README.md:82",
      "finding": "`{}` — a row with no `cells` — was the only way to ask for ten blank cells in a declared row, and the new shape rejects it while offering no equivalent: an empty row is rejected and every entry must name a non-empty `instrument`. Roughly fifteen existing documents use `rows: [{}, ...]` as \"ten placeholder cells\", and the README upgrade note covers only `distribution`.",
      "rationale": "The retirement itself is settled (a row is a plain list of entries, and an empty row already rejects today), so this is not a re-open — it is a migration detail neither artifact notices. It also bears on Joel's \"configure no more than truly necessary\": after this change a placeholder row must be spelled out.",
      "concrete_case": "`{ \"rows\": [{}, {}], \"rowGap\": 2 }` (tests/jefferson.test.ts:309) is rejected whole after the change, and tests/configuration.test.ts:402's `[10, 10]` cell-count assertion from `rows: [{}, {}]` has no document that produces it; the nearest equivalent, `[[{ \"instrument\": \"blank\" }]]`, is one filling cell, not ten.",
      "recommendation": "Design states the replacement form and what the affected assertions become (`[[{ \"instrument\": \"blank\" }]]`, one cell), and the README upgrade note mentions rows that were `{}` beside the `distribution` note. If a placeholder row should stay writable without ten entries, that is a new rule needing Joel, and D13 argues against inventing one."
    },
    {
      "id": "CB-6",
      "severity": "major",
      "location": "startup.ts:34-49 (`/jefferson`), 73 (the one notify); configuration.ts:64-74; README.md:264-265",
      "finding": "A rejected document is observable once and never again. The only signal is `ctx.ui.notify(warning, \"warning\")` at `session_start`; nothing retains the outcome, the reason or the resolved path, and `/jefferson` reports \"the statusline footer is installed, N rows.\" — the same words for a clean one-row document, a document with no rows, and a rejected document. pi documents no persisted configuration diagnostic (research-chidi.md §2: only `notify`, `setStatus`, `hasUI`).",
      "rationale": "This change rejects every 0.12.0 document, so the toast becomes the single failure every upgrading user meets, and it is the only migration help the proposal promises. An on-call or user triaging \"why is my footer the placeholder?\" has nothing to read after the toast scrolls away, and nothing says which of the two documents was read when a project document shadows the agent document.",
      "concrete_case": "A user upgrades with `{\"cells\": [...]}`; the footer shows the default placeholder row; they reload or miss the toast; `/jefferson` answers \"pi-jefferson — the statusline footer is installed, 1 row.\" — indistinguishable from a deliberate `{}` document or a good `rows` document, and silent about both the path and the rejection reason.",
      "recommendation": "Retain `warning` and the resolved path beside the existing `footerRows` closure and have `/jefferson` report the outcome (accepted from which file, or rejected and why) — a handful of lines in startup.ts, the file that already owns both facts. If the proposal's \"must not touch `/jefferson`\" line stands, record explicitly that a rejection cannot be re-diagnosed after startup and let Joel accept the gap rather than leave it implied."
    },
    {
      "id": "CB-7",
      "severity": "minor",
      "location": "tests/jefferson.test.ts:385-410; configuration.ts:72-73",
      "finding": "The exported surface is pinned exactly, and this change is the kind that tempts a new export. `configuration.ts` must export exactly `DEFAULT_CELLS`, `MAX_CELLS`, `configurationPaths`, `readConfiguration`, and `row.ts` exactly `ALIGNMENTS`, `DISTRIBUTIONS`. A message table, a parse helper or a `ConfigWarning` const added as an export fails the pin; and `DISTRIBUTIONS` must stay exported and reachable (D8) even though no document can set it.",
      "rationale": "A design that extracts the rewritten messages into an exported constant, or 'cleans up' the now-unset distribution tuple, breaks a green test with no behavioural fault, and the files are pinned as the repository's guard against third-party cell content (extension-source-layout requirement).",
      "concrete_case": "Exporting `REJECTION_MESSAGES` or `parseRows` from configuration.ts makes the pinned array mismatch and `tests/jefferson.test.ts`'s export-surface test fail.",
      "recommendation": "Design names any new export and the pin edit, or keeps the messages and helpers private inside the module. State that `DISTRIBUTIONS` and both renderer branches stay (D8)."
    },
    {
      "id": "CB-8",
      "severity": "minor",
      "location": "openspec/specs/extension-source-layout/spec.md:205-212; specs/statusline/spec.md REMOVED \"Cell content comes from an instrument\"",
      "finding": "A living spec cites a requirement name this delta deletes. `extension-source-layout`'s export-surface requirement says a new pin \"MUST be ... argued against `statusline`'s 'Cell content comes from an instrument'\", and after archive no requirement of that name exists anywhere. The proposal declares the layout spec unchanged and defers the citation to a docs pass, but that file lives under `openspec/specs/`, which otherwise changes only through a delta and archive.",
      "rationale": "The dangling name is prose, so `openspec validate --strict` will not catch it, and the standard's rule that documents and specs change through their own channel means a docs pass editing a baseline spec is an out-of-band spec edit — worth a stated exception rather than an accident.",
      "concrete_case": "After archive, a reader following the layout spec's sentence searches `statusline` for \"Cell content comes from an instrument\", finds nothing, and cannot tell whether the clause was dropped or renamed.",
      "recommendation": "Either add a one-requirement `extension-source-layout` MODIFIED delta (whole block copied, no scenario renamed, per T1) pointing at the new name, or record explicitly that the prose sentence is corrected by hand outside this change, with the new name written into the proposal so the docs pass cannot guess it."
    }
  ],
  "assumptions": [
    {
      "assumption": "`isDistribution` has exactly one caller, so deleting it is a pure deletion.",
      "status": "verified"
    },
    {
      "assumption": "`Row.id`'s only reader is the duplicate-id loop in configuration.ts, so the field can be dropped without touching the renderer's behaviour.",
      "status": "verified"
    },
    {
      "assumption": "tests/jefferson.test.ts holds 26 inline `writeAgentDocument` documents and 22 of them use the retired top-level form, as the proposal claims.",
      "status": "verified"
    },
    {
      "assumption": "Every file path, symbol and line range the proposal, michael-orientation.md and research-eleanor.md cite that I sampled resolves on disk at 24ee86b (configuration.ts, row.ts, row-renderer.ts, width-plan.ts, shipped.ts, startup.ts, README.md, AGENTS.md, ARCHITECTURE.md, release.yml:57-59, ADR status lines, the archived skeleton design, the test files and the three living specs).",
      "status": "verified"
    },
    {
      "assumption": "The delta's three MODIFIED requirement blocks copy all their baseline scenarios, and no ADDED requirement name collides with a baseline name — checked by comparing requirement and scenario headings against openspec/specs/statusline/spec.md.",
      "status": "verified"
    },
    {
      "assumption": "The longest ADDED requirement body stays under the 500-character `--strict` limit (hand count, roughly 460 for \"A row's entries are its cells and their places\").",
      "status": "unverified"
    },
    {
      "assumption": "`ctx.ui.notify` is not re-readable or persisted by pi, so a warning is a one-shot signal.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "Should a rejected configuration stay diagnosable after the startup notification is gone — for example `/jefferson` reporting which document was read and why it was rejected — or is one warning at `session_start` enough?",
      "options": [
        "Report the outcome in `/jefferson`: which file, accepted or rejected, and the warning",
        "Leave `/jefferson` untouched; accept that a rejection is only visible in the moment",
        "Something narrower: report only the file path that was read"
      ],
      "recommended_option": "Report the outcome in `/jefferson`: which file, accepted or rejected, and the warning",
      "why": "This change rejects every existing document, so the loss is universal rather than occasional, and the proposal itself calls the rejection message \"the only migration help a user sees\" — a message a user can dismiss and never retrieve. The cost is a few lines in startup.ts, which the proposal currently lists as untouched, so the scope call is yours."
    }
  ],
  "not_checked": [
    "I did not run `pnpm test`, `pnpm typecheck` or `openspec validate --strict`; the 425-pass/0-fail and 3-of-3 validation figures are taken from michael-orientation.md at 24ee86b.",
    "I did not check pi's runtime for whether `ctx.ui.notify` is persisted or re-readable in any mode; that rests on research-chidi.md §2.",
    "I did not verify the 500-character strict limit against the delta's ADDED bodies beyond a hand character count.",
    "I did not audit `data/`, the store, the feed, `components/instruments/` or `format.ts` beyond the name-resolution and document-reading paths this change touches, relying on michael-orientation.md's not-touch list for those.",
    "I did not enumerate every document in tests/notice.test.ts, tests/timed.test.ts, tests/session-data-store.test.ts or tests/instrument.test.ts beyond confirming that none builds a `Row` literal with an `id`; their documents, if any, were not counted.",
    "I did not check whether pi's own spinner change (change 3) or `pi.events` registration (change 2) need anything from the row shape this delta fixes, since both are later changes."
  ]
}