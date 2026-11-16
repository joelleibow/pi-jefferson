{
  "assumptions": [
    {
      "assumption": "OpenSpec delta mechanics used to audit the delta (archive order RENAMED→REMOVED→MODIFIED→ADDED; MODIFIED must carry every baseline scenario; the same name may not appear in two sections; the 500-character limit applies to ADDED descriptions and fails --strict) are as documented in research-chidi.md §1.",
      "status": "verified"
    },
    {
      "assumption": "Applied against this delta and baseline: all 7 REMOVED names match baseline requirements exactly; all 3 MODIFIED blocks carry every baseline scenario name; no ADDED name collides with a surviving baseline requirement; no name appears in two sections.",
      "status": "verified"
    },
    {
      "assumption": "All 7 ADDED requirement descriptions sit under the 500-character strict limit (hand-counted estimates: ~316–456 characters, smallest margin ~44).",
      "status": "unverified"
    },
    {
      "assumption": "The proposal's 'docs pass' covers only repo documentation (README, AGENTS.md, ARCHITECTURE.md, ADRs) and has no mechanism to edit openspec/specs — the premise of finding S-1.",
      "status": "unverified"
    },
    {
      "assumption": "Today's parser reads a rows-less document as one top-level row, so {\"distribution\": \"equal\"} alone is currently valid (finding S-2's concrete case).",
      "status": "verified"
    }
  ],
  "findings": [
    {
      "concrete_case": "A 0.12.0 user's {\"distribution\": \"equal\"} (no rows key) today renders the default row with equal shares (configuration.ts:298-300 reads a rows-less document as one top-level row). If the design implements only the delta's scenario, the same document after the change silently renders the content-layout default row, and the proposal's 'rejected, not ignored' promise is broken with no message.",
      "finding": "The proposal promises unconditionally that a top-level `id` or `distribution` rejects the document ('BREAKING — a retired key is rejected, not ignored'), but the delta's only matching scenario ('A retired key beside rows') conditions the rejection on the key sitting beside a `rows` list. The delta also pins neither `rows: []` (which today renders the default row, configuration.ts:315-316) nor a top-level `cells` beside `rows` (today the both-shapes rejection, configuration.ts:284-287). Three boundary cases at the same edge have no stated disposition, and two artifacts state one rule differently.",
      "id": "S-2",
      "location": "openspec/changes/reshape-the-configuration/proposal.md 'What Changes' (retired-key bullet) vs specs/statusline/spec.md 'A rows list is the only way to declare rows', scenarios 'A retired key beside rows' / 'No rows declared' (delta lines 5-45)",
      "rationale": "One home for each fact: the spec is what the design, the parser and the tests derive from; when the proposal and the delta disagree on which documents reject, each reader implements a different parser. The retired-key list must also live as one constant in configuration.ts rather than scattered checks.",
      "recommendation": "Add delta scenarios pinning (a) `rows: []` renders the default row, (b) a top-level retired key with no `rows` rejects and shows the `rows` form — or narrow the proposal bullet to 'beside `rows`', (c) the message family for top-level `cells` beside `rows`. Keep every retired key in one named constant beside the envelope check.",
      "severity": "minor"
    },
    {
      "concrete_case": "A future change that moves an export between files reads extension-source-layout/spec.md:207, searches statusline for 'Cell content comes from an instrument', finds nothing (it was REMOVED by this change), and either stalls or argues its pin against the wrong anchor.",
      "finding": "The export-pin requirement at extension-source-layout/spec.md:207 says its argument is 'argued against statusline's \"Cell content comes from an instrument\"'. This change REMOVES that requirement name and re-adds its content under 'Cell text is the instrument its entry names' (delta line 149), so after archive the citation dangles. The proposal defers the fix to 'the docs pass', but the docs pass it names covers README.md, AGENTS.md, ARCHITECTURE.md and an ADR — repo documentation — while a living spec's requirement text is edited through the change mechanism (a MODIFIED delta). No artifact in this change owns the edit.",
      "id": "S-1",
      "location": "openspec/specs/extension-source-layout/spec.md:207; proposal.md open item 'A stale citation in another capability'; delta specs/statusline/spec.md REMOVED 'Cell content comes from an instrument' (line 467)",
      "rationale": "Cross-spec citations are the argument anchor future export-moving changes must cite; a citation naming a requirement that no longer exists breaks the corpus's internal cross-reference discipline the same way a broken link does, and 'the docs pass' has no delta to apply.",
      "recommendation": "Carry a one-requirement MODIFIED delta for extension-source-layout inside this change (copy the block whole, re-point the citation to 'Cell text is the instrument its entry names'), or open a companion spec change before this one archives. The behaviour does not change, so it stays a docs-tier gate item either way.",
      "severity": "major"
    },
    {
      "concrete_case": "A maintainer reading a row-renderer fixture sees id: \"row-0\" while the warning for the same row reads 'row 1', and must consult the orientation to learn the id is internal and meaningless; a later change touching the check re-learns the same.",
      "finding": "With plain-list rows every id is synthesized, so the duplicate-id check can never fire and `Row.id` (extensions/jefferson/components/row/row.ts:21) has no reader left besides the check (configuration.ts:325-331). Keeping it leaves a zero-based `row-0` id sitting beside warnings that count from 1 (owner ruling 2026-11-15), and a dead invariant check in the parse path.",
      "id": "S-4",
      "location": "proposal.md open item (michael-orientation.md T7); extensions/jefferson/components/row/row.ts:21; extensions/jefferson/configuration.ts:325-331",
      "rationale": "Dead code kept without a ruling is the debt this change exists to retire: unlike the distribution branch, which Joel explicitly ruled stays ('we should keep the code in place though'), nothing protects Row.id. A synthesized id that disagrees with the user-facing numbering invites exactly the confusion the 1-based ruling removed.",
      "recommendation": "Remove `Row.id` and the duplicate-id check in the design (T7 is open; Michael's view is that it goes), unless the design names a concrete future reader. The renderer fixtures that build ids (~20 in tests/row-renderer.test.ts) are updated in the same task.",
      "severity": "minor"
    },
    {
      "concrete_case": "A user whose document is {\"containers\": [...]} at the top level reads 'declare cells instead', writes {\"cells\": [...]}, and the document is rejected by a different message than the one that sent them there.",
      "finding": "The `containers` notice's exact text is 'carries the containers key, which is no longer read; declare cells instead' (configuration.ts:339). Its row-level trigger dies with object rows (a row object is now rejected for not being a list), but the top-level trigger remains reachable (configuration.ts:296). The advice names `cells`, a key that no longer exists in any position, and 'cell' in a warning is exactly what the 2026-11-15 ruling retires from user-visible words.",
      "id": "S-3",
      "location": "proposal.md open item (michael-orientation.md T10); extensions/jefferson/configuration.ts:296,339; no coverage in specs/statusline/spec.md",
      "rationale": "A user-visible message giving migration advice toward a shape the same change rejects is a wrong instruction — worse than no message — and the wording violates the settled vocabulary ruling. The delta states nothing, so the disposition must not fall through the design unwritten.",
      "recommendation": "Drop the notice (Michael's view: nothing written in the new shape uses `containers`), or reword it to show the `rows` form with no 'cell' wording. Either way, record the decision in the design so the implementation gate has a rule to test.",
      "severity": "minor"
    },
    {
      "concrete_case": "A future change deleting the equal branch as 'unreachable from configuration' finds no spec scenario and no ruling forbidding it — only tests and an ADR that, as scoped today, might not mention the branch at all.",
      "finding": "The delta removes 'Cells are evenly distributed across the width' and re-adds only the content layout ('A cell takes the width its content needs'), while the renderer keeps both distributions and their tests (owner ruling: 'we should keep the code in place though, in case it resurfaces'). After archive, the equal-share behaviour is guaranteed by nothing in any spec — only by tests/row-renderer.test.ts and tests/width-plan.test.ts — and the proposal leaves open whether the design gives it a spec requirement.",
      "id": "S-5",
      "location": "delta specs/statusline/spec.md REMOVED 'Cells are evenly distributed across the width' (line 456); proposal.md 'Equal shares leave the spec' decision; michael-orientation.md D8/T1",
      "rationale": "Retained-but-unconfigurable code needs one place that says why it exists and what pins it, or the next change deletes it as dead. The ADR this change already owes (vocabulary retirement, scope open per D6/T12) is the natural home; the delta's disposition (content layout only) is otherwise sound.",
      "recommendation": "Let the design decide the spec question (the proposal already assigns it there), and require the ADR to record that the equal branch is retained per the 2026-11-15 ruling, unreachable from configuration, with its tests as the only guarantee until a spec requirement returns.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "council",
  "not_checked": [
    "openspec CLI change-level validation (proposal format, delta parse) was not run: no shell tool in this pass, and michael-orientation.md reports only `openspec validate --specs --strict` (3 of 3). Run the change validation before archive.",
    "ADDED requirement lengths were estimated by hand from the delta text, not measured with extractRequirementText; margins are >= ~44 characters but a machine check is cheap insurance.",
    "pi platform facts (runtime exports, 1.4.0 vs 1.5.2 docs) are taken from research-chidi.md as read, not re-verified; the proposal rests on none of them.",
    "Test counts cited in the proposal (22 of 26 shortcut documents, the distribution:equal end-to-end tests, padEnd(8) assertions) are taken from michael-orientation.md and research-eleanor.md, not recounted.",
    "Sibling council artifacts in the change directory (catalyst, codebase, comprehension, critic, readiness, zoom-out) were not read; this lens reviewed independently and duplicate findings are for the conductor to reconcile.",
    "design.md and tasks.md do not exist yet (pre-design), so proposal-to-design and proposal-to-tasks alignment could not be checked."
  ],
  "owner_questions": [],
  "paraphrase_existing": "",
  "paraphrase_proposes": "",
  "recommendation": "Proceed to design. The delta is structurally sound: all 7 REMOVED names match the living spec exactly, all 3 MODIFIED blocks carry every baseline scenario, no ADDED name collides, and every ADDED description sits well under the 500-character strict limit. One major item: give the stale extension-source-layout citation a fix path that can edit a living spec (fold a one-requirement MODIFIED delta into this change) instead of the docs pass. Four minor items for the design: pin the three unpinned envelope boundary cases (rows: [], a retired key with no rows, cells beside rows), dispose of the containers notice, remove the dead Row.id path, and record in the ADR where the retained equal-share branch's guarantee lives. Nothing blocks design from starting."
}