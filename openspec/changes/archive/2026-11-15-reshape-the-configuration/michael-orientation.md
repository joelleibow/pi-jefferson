# Michael's orientation: `reshape-the-configuration`

This is the orientation pass, and it is a consult only. It approves nothing, and every gate still runs. I checked everything on `main` at `24ee86b`, where the tree is clean apart from this change directory. On that tree, `pnpm test` gives 425 pass and 0 fail, `pnpm typecheck` is clean, and `openspec validate --specs --strict` passes 3 of 3.

## 1. The decisions that bind this change

**Joel's rulings of 2026-11-15** (`owner-rulings.md`). These bind, and they are the newest decisions in play.

- **D1. Three changes, in order, and this is the first.** Registering instruments over `pi.events` and pi's spinner come later. Nothing from them lands here.
- **D2. Breaking is allowed before 1.0.0.** Joel said "getting closer to a 1.0.0", which means not yet.
- **D3. `rows` is a list of rows, and each row is a plain list of entries.** An entry is `{ "instrument": "<name>" }`. A plain list has no keys, so a row can no longer declare `id`, `distribution` or `containers`. That follows from the ruling and is not an open question.
- **D4. The top-level `instruments` block keeps its name and its job.**
- **D5. `align` stays on each entry.**
- **D6. "Cell" leaves the configuration's keys, its warnings and the README, and the code keeps the word.** This retires the half of the 2026-11-03 vocabulary ruling that users see.
  - The sentence saying an ADR must record this is the recorder's bold paraphrase. It is not Joel's words.
  - It agrees with `AGENTS.md`: "If a rule is being retired, say so in an ADR."
  - Plan the ADR as a deliverable. At a gate, though, a gap in it can only be closed by editing documentation, so under Joel's standing ruling that documentation never blocks a feature, it is minor.
- **D7. A warning calls an entry an instrument and places it by row and position.** Joel approved two examples:
  - `row 1, instrument 2: no "instrument" named`
  - `row 3: "taiknr.savings" is not a known instrument`
- **D8. `distribution` leaves the configuration.** The renderer's support for both distributions stays, and so do its tests.

**Rulings for the later changes.** This change binds to them only by not contradicting them.

- **D9. Names.** Extension instruments take names such as `taiknr.savings`, and Jefferson's own take `jefferson.default.*`. A bare name is shorthand for the `jefferson.default.*` one. An unknown name is warned about once startup has completed.
- **D10. Registration is event-based,** and Jefferson registers its own instruments the same way.

**Rulings this change inherits.**

- **D11. The 2026-11-03 vocabulary ruling still holds for the code:** a row holds cells, a cell holds an instrument, and "module" and "widget" are rejected.
- **D12. 2026-11-07:** "A user shouldn't have to configure any more than truly necessary."
- **D13. 2026-11-03:** "Don't invent what we don't have to."
- **D14. The 2026-11-02 owner rule** quoted in the archived skeleton design, `openspec/changes/archive/2026-11-02-statusline-skeleton/design.md:104-105`: "a list of row objects… if they just put that at the top level of the object then a single row is implied."
  - Today's single row at the top of the document comes from this rule.
  - D3 and D6 together make that shape impossible to write as it was. See JOEL-1.

**Standing records the change works within.** I checked where each one came from.

- **Every failure rejects the whole document,** renders the default row, and warns naming the offender. Sources: `ARCHITECTURE.md:87-89`, `configuration.ts:393-399`, skeleton D3.
- **An unknown instrument name warns and renders `blank`; it never rejects.** Sources: `configuration.ts:104-107` and `215-225`, and the spec requirement "Configuration designates each cell's instrument".
- **Unknown document keys are ignored silently.** Sources: the shortcut comment at `configuration.ts:304-306` and the spec scenario "A misspelt key" (`statusline/spec.md:1425`).
- **Release label.** PRs #14, #15, #16, #17, #21 and #22 were all labelled `release:minor` (`gh pr list`), and #15 was itself a breaking change before 1.0. In `.github/workflows/release.yml:57-59`, a PR with no label releases as a patch. SemVer rule 4 (Chidi) allows a breaking change in a minor release before 1.0.
- **ADR convention.** A new ADR's `Status:` line says what it narrows or supersedes (`docs/adr/0001:4`, `0007:4`, `0014:4`).

## 2. What the change must not touch or foreclose

- **The renderer (D8).** This covers `components/row/row-renderer.ts`, `width-plan.ts`, `Row.distribution` and `DISTRIBUTIONS` (`row.ts:9-10, 21`), and the tests that build `Row`s directly in `tests/row-renderer.test.ts` and `tests/width-plan.test.ts`.
  - The parser gives every row `"content"`.
  - `isDistribution` (`configuration.ts:36-39`) loses its only caller. It is parser code, not the renderer's, so it goes.
- **How the `instruments` block is read (D4).** `readInstruments` (`configuration.ts:93-173`) stays as it is. Only the wording of its unknown-name warning changes, because of D6.
- **Name lookup.** `shipped.ts` and `instrumentNamed` stay untouched.
  - Add no check on a name's syntax. `taiknr.savings` has to stay a valid name that is simply unknown today.
  - Do not rename anything to `jefferson.default.*`. That is change 2's work under D9.
- **Unknown names stay warnings and are still reported at `session_start` (`startup.ts:73`).**
  - Change 2 has to be able to hold these warnings back until registration settles.
  - An extension's settings in `instruments` will be written before that extension registers, so an unknown name there must keep warning rather than rejecting.
  - Moving when the warning fires is change 2's work.
- **The third-party clause is change 2's to revise.** The clause is "The extension MUST NOT expose an API by which third-party code supplies or replaces cell content" (`statusline/spec.md:188-189`, with the scenario "Contributing cell content" at `:197`). If this change re-homes that requirement (see T1), the sentence moves word for word. It is not dropped and not strengthened.
- **Code keeps the word "cell" (D6).** `Cell`, `CellAlign`, `cellView`, `MAX_CELLS`, `DEFAULT_CELLS` and `DEFAULT_CELL_TEXT` are not renamed.
- **These stay as they are:**
  - where the document lives and the trust check (`configuration.ts:352-369`);
  - the project document replacing the agent document whole;
  - the rules for `rowGap`;
  - the default row of ten `blank` entries sized by content;
  - the ceiling of ten, with entries past it still validated;
  - rejection of an empty row;
  - the `/jefferson` command;
  - the notice gate (`configuration.ts:323-324`);
  - the store and the feed;
  - the `session-data-store` and `extension-source-layout` specs. Searching both, neither names a configuration key.
- **What this change closes off.** Because a row is now a plain list (D3), a per-row `distribution`, if it comes back as D8 allows for, can only return at the document level, on each entry, or through another reshape. That follows from two of Joel's own rulings, and nothing needs deciding now. The design must not hide a per-row object to keep that door open (D13).

## 3. The traps

**T1. OpenSpec cannot drop or rename a scenario inside a `MODIFIED` requirement.**

- Chidi reported that archive refuses this (`specs-apply.js:392-395`). The validator also reports it as an error while the spec is being written (`validation/validator.js:~671`). Both checks go through `diffScenarioNames` (`parsers/requirement-blocks.js:453`).
- The current spec already shows the cost of working around it. The scenario "a cells entry that is not a string" (`statusline/spec.md:282-287`) keeps a heading that is no longer true and apologises for it in its body. Do not repeat that.
- A requirement that loses a scenario has to be `REMOVED`, with a Reason and a Migration, and `ADDED` again under a new name. The same name cannot appear in both sections (`specs-apply.js:196-202`).

By my reading, these requirements lose scenarios:

| Requirement | Scenarios this change removes |
| --- | --- |
| Both configuration shapes normalize to a list of rows | All three, if JOEL-1 retires the top-level row |
| Row identifiers | "Duplicate identifiers", and the requirement as a whole |
| Cells are evenly distributed across the width | "The row option's values", "A distribution that is not one of the two", "A distribution beside rows" |
| Cell content comes from an instrument | "A row that declares no cells" |
| A row's cells are its count and its placement | "cells absent" |
| Configuration designates each cell's instrument | "A row that names none" |
| rowGap sets the space between rows | "A gap beside either shape" (`:1413`), if JOEL-1 retires the top-level row |

Some scenarios keep a true heading but describe "the row option that restores equal shares" in their bodies (`spec.md:93, 98, 104, 453`). The design decides whether equal shares stay in the spec as renderer behavior or leave it. If they stay, the tests D8 keeps have a requirement to verify.

**T2. Three of the requirements to re-add are already at the length limit.**

- With `--strict`, an `ADDED` requirement fails above 500 characters (`validation/constants.js:9`).
- I measured with OpenSpec's own `extractRequirementText`:

  | Requirement | Characters |
  | --- | --- |
  | Configuration designates each cell's instrument | 500 |
  | Cell content comes from an instrument | 498 |
  | Cells are evenly distributed across the width | 496 |

- Re-adding the old text plus any new words fails strict validation.
- The 498-character one holds the third-party clause. The pressure to trim falls on the sentence change 2 owns.

**T3. Retiring the top-level row can make old documents fail silently.**

- Unknown top-level keys are ignored without a word (`configuration.ts:304-306`).
- If JOEL-1 retires the single top-level row and nothing else changes, a 0.12.0 document `{ "cells": [...] }` has no `rows` and renders the placeholder row with no warning.
  - The README teaches that shape at `README.md:65`.
  - 22 of the 26 inline `writeAgentDocument` documents in `tests/jefferson.test.ts` use it.
- A top-level `distribution` or `id` is rejected today when it sits beside `rows` (`configuration.ts:286-289`). Afterwards it would be ignored without a word.
- The design has to make a retired key produce a message.

**T4. Every 0.12.0 document breaks.**

- A row written as an object, `{ "cells": [...] }`, is now rejected because it is not a list.
- That rejection message is the only migration help a user sees. It should spell out the new shape, as the change that turned entries into objects did for string entries (`configuration.ts:196`, asserted at `tests/configuration.test.ts:139`).
- There is no reader for the old shape (D2, D13).

**T5. Today's warnings count rows from 0.**

- `normalizeRow` receives the zero-based map index (`configuration.ts:320`), and every message prints `row ${index}`. The first row is reported as "row 0".
- That base came from the synthesized id `row-<index>` in skeleton D6. It was never decided for users.
- No test, spec or README line pins it. Searching for `row \d` across `tests/`, `README.md`, `openspec/specs` and `docs/` finds nothing. See JOEL-2.

**T6. Several end-to-end tests get equal shares by setting `distribution: "equal"` in the document, and after the change they cannot.**

- In `tests/jefferson.test.ts`:
  - "the branch, session and status cells render their labels at their alignments end to end";
  - "configured formats, styles and a width-taking bar render end to end under equal distribution";
  - "a dispatched turn boundary repaints only changed totals…";
  - "an unchanged turn boundary before the first render…";
  - "a ${reason} replacement drops the old cwd…", which runs four times;
  - "distribution equal restores equal shares end to end".
- In `tests/instrument.test.ts`: "a footer's bound cost and tokens read one identical totals object…", which writes its document at line 312.
- `tests/configuration.test.ts` has its own tests of reading `distribution`.
- Several assert exact equal-share text. For example, `jefferson.test.ts:786` builds its expectation with `padEnd(8)`.
- The design has to say what happens to each test. It is either deleted because the renderer tests cover the geometry, or rewritten with a new input and an expectation worked out from the content layout.
- An expectation changed to whatever the new code prints blocks at the implementation gate.

**T7. `Row.id` loses its reason to exist.**

- Its only reader is the duplicate-id check (`configuration.ts:325-331`; searched across `extensions/`).
- With plain-list rows, every id is synthesized, so that check can never fire.
- `tests/row-renderer.test.ts` builds about 20 fixtures with an `id`.
- Keeping it would leave a zero-based `row-0` beside warnings that count from 1, if JOEL-2 goes that way.

**T8. The unknown-name warning combines two different cases.**

- `configuration.ts:341-346` joins every unknown name, from the rows and from the `instruments` block, into one line: "names instruments the extension does not implement: …; those cells render blank".
- That is already false for a name that appears only in the `instruments` block. The exact strings are asserted at `tests/configuration.test.ts:961, 964, 970`.
- The approved form in D7 places a name by its row, and a name in the `instruments` block has no row. Each case needs its own form.
- Keep the collected names as data, so change 2 can hold the report back (D9) without parsing the document again.

**T9. Where "cell" reaches users today.**

- In `configuration.ts`, the message strings at lines 190, 196, 200, 206, 252, 339 and 345, besides the `cells` key itself.
- 27 lines of `README.md`.
- No user-visible string in `format.ts`, `components/instruments/` or `data/` contains it.
- Tests that pin those words: `tests/configuration.test.ts:263, 331, 554, 961, 964, 970`.

**T10. The `containers` notice still says "declare cells instead".**

- The notice is at `configuration.ts:247, 296, 338-340`.
- With plain-list rows, its row-level trigger can no longer be reached, because a row written as an object is rejected for not being a list. Only the top-level trigger is left.
- Nothing written in the new shape uses `containers`.

**T11. `AGENTS.md:8` still says "A row holds cells, and a cell holds an instrument" with no qualifier.** An agent writing README text reads that line first. Fixing it is a documentation-only change, so it is minor at a gate.

**T12. The release label.** A PR with no label releases as a patch (`release.yml:57-59`). A forgotten label would ship this break as 0.12.1, so the PR needs `release:minor`.

## 4. Questions only Joel can answer

### JOEL-1: Does the single row at the top of the document survive?

**Where this comes from.** His own rule of 2026-11-02 (D14): "if they just put that at the top level of the object then a single row is implied."

- Today that shape is `{ "cells": [...] }`. Sources: `configuration.ts:298-300`, `README.md:65`, and the spec requirement "Both configuration shapes normalize to a list of rows".
- His 2026-11-15 rulings make a row a plain list and take `cells` out of the keys, so that shape can no longer be written.
- Changing his own rule is his call.

**Options.**

- **(a) Retire it.** `rows` is the only way to declare rows. A one-row document becomes `{ "rows": [[ { "instrument": "model" } ]] }`. There is one shape, no rule about carrying both shapes, and no new key.
- **(b) Keep it under a new key,** such as `{ "row": [ ... ] }`, and keep the rejection for carrying both shapes. It saves one pair of brackets, and it adds a key, a conflict rule and their messages.
- **(c) Let `rows` hold either a list of rows or a flat list of entries that means one row.** There is no new key, but what a document means depends on the type of its first member, and a mixed list needs its own rejection.

**My pick: (a).**

- "Don't invent what we don't have to" (D13) rules out (b)'s new key and (c)'s two readings.
- What either of them saves is one pair of brackets. That is not a meaningful gain under "configure no more than truly necessary" (D12).
- If he picks (a), T3 applies: a retired top-level key must reject with the new spelling rather than render silently.

### JOEL-2: In `row N, instrument M`, does counting start at 1?

**Where this comes from.** The examples he approved, `row 1, instrument 2` and `row 3`, do not say which base they use. Today's messages count from 0 only because the synthesized ids do (T5).

**Options.**

- **(a) Count from 1.** The first row is `row 1`, and its first entry is `instrument 1`.
- **(b) Count from 0,** as the code does today.

**My pick: (a).** People count the first row as row 1, and both approved examples read naturally that way. If `Row.id` survives (T7), its synthesized `row-0` is internal and does not have to match.

**What is not his.** These are already settled, so they need no question to him:

- the release label (T12);
- having no reader for the old shape (D2, D13);
- user-declared `id` being gone (D3);
- the default row and the ceiling of ten, because no ruling moves them.

## 5. What is settled and what stays open

**Settled, by a decision or by evidence:**

- **The shape:**

  ```json
  {
    "rows": [
      [ { "instrument": "model" }, { "instrument": "context", "align": "right" } ]
    ],
    "instruments": { },
    "rowGap": 1
  }
  ```

  - An entry carries only `instrument` and `align`. Any other key rejects the document and the warning names the key.
  - `align` is one of `ALIGNMENTS` and is `left` when absent (D3, D5; `configuration.ts:198-214`).
- **A row has no `id`, `distribution` or `containers` (D3, D8).** Every row is sized by `"content"`.
- **These rules carry over:**
  - `rows: []` renders the default row;
  - an empty row rejects;
  - the ceiling of ten applies, with entries past it still validated;
  - `rowGap` is unchanged.
- **Old documents.** There is no reader for the old shape, and an old document is rejected with a message that spells the new shape (D2, D13, T4).
- **Where "cell" goes (D6).** It leaves the keys, the warnings and the README. The code keeps it, and so may spec prose that describes the model, as long as it does not quote a key or a message.
- **Message prefixes.** A message about an entry starts with `row N, instrument M:`, and one about a row starts with `row N:` (D7). The base depends on JOEL-2.
- **Unknown names still warn rather than reject, at `session_start`** (follows from D9).
- **An ADR records the retirement of "cell" from user-facing words (D6),** and the PR carries `release:minor` (T12).

**Open for the council and the design:**

- **The wording of every message.** This includes:
  - the hint for an old-shaped row (T4);
  - how a retired top-level key is handled (T3);
  - the form of the unknown-name warning for an entry and for a name in the `instruments` block;
  - whether an unknown entry carries its position (T8). Joel's two approved examples disagree on that.
- **Whether `Row.id` goes (T7).** My view is that it should, because nothing breaks without it.
- **Whether the `containers` notice goes or is reworded (T10).** My view is that it goes.
- **How the spec delta is structured** (T1, T2): which requirements are removed and re-added under which new names within 500 characters, and whether equal shares stay in the spec as renderer behavior.
- **What happens to each end-to-end test in T6.**
- **The ADR's scope.** It could be one ADR that retires the user-facing word, narrows ADR 0007's `distribution` option and records the outcome of JOEL-1, or it could be several.
- **The README and AGENTS.md changes.**
  - The README needs a rewrite with an upgrade note. The note must tell users who followed `README.md:82` ("Set `"distribution": "equal"` on a row to keep that") that equal shares can no longer be configured.
  - The "Words" section of `AGENTS.md` needs an amendment (T11).

**What this pass did not cover:**

- I did not look at pi's spinner or at anything change 3 needs from rows.
- I had no Explore-session transcript, so I took the rulings as `owner-rulings.md` records them.
- The test counts are as of `24ee86b`. The count of single-row documents comes from a parse of the inline `writeAgentDocument` objects and leaves out documents built in variables.
- I had no write tool, and my role keeps `bash` for inspection, so I wrote nothing. This response is the full artifact for `openspec/changes/reshape-the-configuration/michael-orientation.md`, and the runtime is expected to save it.

Not done: I skipped checking that the pi 1.4.0 runtime still has `CONFIG_DIR_NAME` and `isProjectTrusted`, because the code already uses both and type-checks against 1.4.0. The main risk is JOEL-1: if Joel retires the top-level row, the design must close T3, or every single-row 0.12.0 document will quietly render the placeholder row.