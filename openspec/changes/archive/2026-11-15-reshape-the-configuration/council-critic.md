{
  "mode": "council",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "The proposal and spec delta can go ahead. They follow every 2026-11-15 ruling. The re-added requirements look like they fit the 500-character limit, though I only estimated the counts. The third-party clause moves over word for word. The three MODIFIED blocks keep every scenario the baseline has. Before design is approved, two gaps need closing. (1) Which top-level keys does the 'retired single row' rejection fire on? The old reader treated every document without `rows` as a top-level row (configuration.ts:298-300). So the spec's 'declared a single row at the top level' does not say what to do with `{\"distribution\":\"equal\"}`, `{\"id\":\"main\"}`, a top-level `containers`, or `cells` beside `rows`. Name the retired keys in one list. (2) The proposal says Joel's two approved messages disagree. They agree if a rejection places the entry and an unknown-name warning places only the row. The design should take that reading rather than invent a third form. Runtime cost does not change: the document is still parsed once at session_start. The other findings are minor wording and coverage gaps.",
  "findings": [
    {
      "id": "CR-1",
      "severity": "major",
      "location": "specs/statusline/spec.md, ADDED 'A rows list is the only way to declare rows' (scenarios 'The retired single row at the top', 'A retired key beside rows'); extensions/jefferson/configuration.ts:284-300",
      "finding": "The spec never says which top-level keys make a document 'the retired shape'. Today any document without `rows` becomes a top-level row (`rawRows = [doc]`, configuration.ts:298-300). So the retired shape cannot be told apart from 'No rows declared', and the delta keeps `cells`, `id`, `distribution` and `containers` as four separate cases without naming them together.",
      "rationale": "Proposal T3 exists to stop an old document from quietly rendering the default row. The scenarios cover top-level `id`/`distribution` only beside `rows`, and the single top-level row only when `rows` is absent. Three cases are left unstated. Given that the README teaches `{ \"distribution\": \"equal\", \"cells\": [...] }` at README.md:65, one implementer may read the 'retired shape' trigger as `cells` alone and another as any row key.",
      "concrete_case": "`{\"distribution\": \"equal\", \"instruments\": {\"model\": {}}}` has no `rows`. It is valid in 0.12.0: ten blank cells in equal shares. The new spec lets it be accepted silently as 'No rows declared' or rejected as 'the retired single row', and both readings pass the scenarios as written. The same goes for `{\"id\": \"main\"}`. `{\"cells\": [...], \"rows\": [[...]]}` fits neither scenario, since one requires `rows` absent and the other names only `id`/`distribution`. A top-level `containers` today raises a notice that contains 'cell' (configuration.ts:296, 339), so if it stays it breaks D6.",
      "recommendation": "State one list of retired top-level keys, `cells`, `id`, `distribution` and `containers` (or say on record that `containers` goes silent, which closes T10). Make any of them reject the document whether or not `rows` is present. Say which key the message reports when several are present. Add one scenario for a retired key with `rows` absent and one for `cells` beside `rows`. Keep the list as one constant in configuration.ts so the parser and the messages read from the same place."
    },
    {
      "id": "CR-2",
      "severity": "major",
      "location": "proposal.md, 'Open, and not settled here' (second bullet); specs ADDED 'A rejection locates its offender by row and position'; owner-rulings.md 'A warning calls an entry an instrument'",
      "finding": "The proposal says Joel's two approved examples disagree on whether an unknown name carries its entry's position. They do not disagree. `row 1, instrument 2: no \"instrument\" named` is a rejection of one entry. `row 3: \"taiknr.savings\" is not a known instrument` is a non-rejecting warning about a name. The spec's placement requirement already covers rejections only. Left open, the design may invent a third form Joel was never shown.",
      "rationale": "The owner approved both strings with 'yes'. Reading them as two message kinds fits the spec as written and invents nothing (D13). It also leaves the `instruments`-block case as the only form still undecided, because a name there has no row. Today that message says 'those cells render blank', which is false for a block-only name (configuration.ts:341-346).",
      "concrete_case": "Row 3 holds `{\"instrument\":\"taiknr.savings\"}` at position 2. If the design picks `row 3, instrument 2: \"taiknr.savings\" ...`, the warning differs from the one Joel approved. The same name configured only in `instruments` also gets a row-based message that no row explains.",
      "recommendation": "Design should take the literal reading: rejections are `row N, instrument M:`, unknown names in a row are `row N: \"name\" is not a known instrument`, and the `instruments` block gets its own row-less form. Record each unknown as data `{name, row}` (or `{name}` for the block) rather than a `Set<string>` joined into prose, so change 2 can delay the report (D9). Ask Joel only if the design departs from his literal example."
    },
    {
      "id": "CR-3",
      "severity": "minor",
      "location": "specs ADDED 'A rows list is the only way to declare rows', scenario 'A row written as an object'",
      "finding": "The hint is written only for the pre-change row object. The likeliest new mistake is a flat list of entries in `rows`, which is Joel's rejected option (c). That also arrives as 'a member that is an object', so it gets a message about rows written as objects.",
      "rationale": "For most users this rejection is the only migration help they see (T4). A message about 'how a row was written before this change' reads wrong to someone who never wrote the old shape.",
      "concrete_case": "`{\"rows\": [{\"instrument\":\"model\"}, {\"instrument\":\"path\"}]}` is rejected as `row 1: ...a row is a list...`. The user has written no row object, and gets no sign that the fix is one more pair of brackets.",
      "recommendation": "Make the hint work for both cases. For example, always show the whole document form `{\"rows\": [[{\"instrument\": \"model\"}]]}` rather than only the inner row. Do not add a third reader."
    },
    {
      "id": "CR-4",
      "severity": "minor",
      "location": "specs ADDED 'A rows list is the only way to declare rows', scenario 'No rows declared'",
      "finding": "`rows: []` has no scenario. Michael §5 settles that it renders the default row (configuration.ts:318-320), but 'carries no `rows` at all' reads as the key being absent. Meanwhile `rows: [[]]` is rejected as an empty row.",
      "rationale": "Without a scenario, nothing ties the two neighbouring cases to their opposite outcomes, and a test could pin either one.",
      "concrete_case": "`{\"rows\": []}`: an implementer reading 'a rows list... each member MUST be a row' may reject it. Today it renders the default row with no warning.",
      "recommendation": "Add a scenario: `rows` is an empty list, so the default row renders with no warning."
    },
    {
      "id": "CR-5",
      "severity": "minor",
      "location": "specs ADDED 'A row's entries are its cells and their places', requirement text, first sentence",
      "finding": "The first sentence says 'its length MUST be both the number of cells in the row and the entry at each position'. A length cannot be an entry, so the sentence does not parse.",
      "rationale": "A requirement's text is the normative part. A sentence that does not parse invites people to argue over what it means at the verify gate.",
      "concrete_case": "A verifier checking 'the length is the entry at each position' cannot map it to any test.",
      "recommendation": "Reword along the lines of 'A row's list MUST be both its cell count and, position by position, its cells' entries'. That stays under 500 characters (estimated at about 457 now)."
    },
    {
      "id": "CR-6",
      "severity": "minor",
      "location": "specs ADDED 'rowGap sets the space between declared rows', requirement text and scenario 'A gap of zero'",
      "finding": "The re-added text keeps 'as it rendered before this change'. As an ADDED requirement of reshape-the-configuration, 'this change' now points to this change, not to the one that introduced `rowGap`.",
      "rationale": "Before this change, `rowGap: 0` already rendered no gap. The sentence now promises behaviour defined against the wrong point in time.",
      "concrete_case": "After archive, someone reading the main spec takes 'before this change' to mean before the reshape, when the default gap was 1. The intent is 'no empty line between rows'.",
      "recommendation": "Say it outright: `rowGap: 0` MUST render no empty line between rows."
    },
    {
      "id": "CR-7",
      "severity": "minor",
      "location": "proposal.md 'What Changes' (retired key is rejected); configuration.ts:393-399 (first offender wins)",
      "finding": "A rejection reports only the first offender. Migrating a multi-row 0.12.0 document therefore takes one reload per row.",
      "rationale": "Every 0.12.0 document breaks (T4), and the rejection message is the only migration help. Each fix-and-reload shows the default row again.",
      "concrete_case": "`{\"rows\":[{\"cells\":[...]},{\"cells\":[...]},{\"cells\":[...]}]}`: the user sees `row 1: ...`, fixes it, reloads, then sees `row 2: ...`, and so on.",
      "recommendation": "Phrase the row-object hint so it says every row is now a list (for example 'each row is a list'). The user can then convert them all at once. This needs no collect-all-errors machinery."
    },
    {
      "id": "CR-8",
      "severity": "minor",
      "location": "michael-orientation.md T6; extensions/jefferson/components/row/width-plan.ts:73-98",
      "finding": "Evidence for T6: in a row where every cell fills (all `blank`), `planRow`'s content branch gives the same plan as the equal branch. `slack` equals `width`, so each cell gets basis `floor(W/N)`, grow 1, no joint. Only end-to-end tests whose `distribution: \"equal\"` rows hold non-fill instruments change their geometry.",
      "rationale": "This divides the T6 tests into two groups. In one, dropping the key leaves the expectation unchanged. In the other, the expectation has to be worked out again from the content rule. That is not the same as rewriting it to match whatever the new code prints, which blocks at the implementation gate.",
      "concrete_case": "`jefferson.test.ts:786` builds `padEnd(8)` text for instrument cells under equal shares. Under content sizing those cells shrink to their text, so the expectation must be recomputed. An all-`blank` equal row keeps the same columns.",
      "recommendation": "In the design, sort each T6 test into one of two groups: all-fill rows, where the key is dropped and the expectation stays; and mixed rows, where the expectation is worked out from 'A cell takes the width its content needs' or the test is deleted because row-renderer and width-plan tests already cover equal shares."
    },
    {
      "id": "CR-9",
      "severity": "minor",
      "location": "openspec/specs/statusline/spec.md:4-5 (Purpose)",
      "finding": "The baseline Purpose still says 'the evenly divided cells each row renders'. Deltas cannot edit Purpose, so archiving leaves it contradicting the removal of equal shares.",
      "rationale": "One fact should have one home. After this change the main spec's opening sentence describes a layout no user can configure.",
      "concrete_case": "After archive, a reader of `openspec/specs/statusline/spec.md` sees 'evenly divided cells' above requirements that state only content sizing.",
      "recommendation": "Add the Purpose edit to the docs pass, next to the extension-source-layout citation fix already listed in proposal.md."
    }
  ],
  "assumptions": [
    {
      "assumption": "Today every document without `rows` becomes one top-level row, so 'declared a single row at the top level' has no key-level definition yet.",
      "status": "verified"
    },
    {
      "assumption": "The three MODIFIED requirements keep every baseline scenario name (6, 9 and 6), so the archive check that refuses a MODIFIED block missing a baseline scenario passes.",
      "status": "verified"
    },
    {
      "assumption": "Each ADDED requirement's text is under the 500-character strict limit. Estimated by hand: about 415-460 each. Not measured with extractRequirementText.",
      "status": "unverified"
    },
    {
      "assumption": "For an all-fill row, the content and equal branches of planRow give identical plans.",
      "status": "verified"
    },
    {
      "assumption": "The third-party clause in 'Cell text is the instrument its entry names' matches baseline spec.md:188-190 word for word.",
      "status": "verified"
    },
    {
      "assumption": "The configuration is parsed once at session_start, so the reshape has no runtime cost, memory, latency or concurrency impact. The trusted project document still replaces the agent document whole, and every warning names its path.",
      "status": "verified"
    },
    {
      "assumption": "No baseline requirement outside the delta quotes the `cells`, `id` or `distribution` keys (checked with grep), so no further MODIFIED block is needed.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Did not run `openspec validate --strict` on the change, because the task allows read-only inspection only. The character counts are hand estimates.",
    "Did not count every end-to-end test that sets `distribution: \"equal\"`. Relied on michael-orientation T6.",
    "Did not check pi-tui's allocator to confirm the remainder goes to the earliest cell in the MODIFIED 132-column ten-blank scenario. Took it from the existing equal-share scenario, which uses the same basis and grow.",
    "Did not review README, AGENTS.md, ARCHITECTURE.md or the ADR wording; that waits for the docs pass after approval."
  ]
}