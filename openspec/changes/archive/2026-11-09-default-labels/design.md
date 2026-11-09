# Design

Citations: [R] `owner-rulings.md`; [J1], [J2] Joel's two PL2 rulings in `council.md` "Joel's rulings"; [C] `council.md` (synthesis and accepted feedback); [E heading] `research-eleanor.md`; [M n] `michael-orientation.md` section n (a consult, not a ruling). Test line numbers are the locations from Derek's run at `a8af447`; on the branch, find each again by its title. Motivation is in `proposal.md`.

## Context

- A declaration may carry a `defaultLabel`. Binding puts it in front of the format with one gap, a configured `label` (`""` included) beats it, and an unknown datum returns `""` before the label is reached. `thinking` alone declares one, `Thinking:`, without a trailing space [E Label path; M 1 B–E].
- The shape of the change was ruled at PL2: `Path:`, `Context:`, `Tokens:`, `Cost:` and `Model:` are added, `Thinking:` stays, `blank` gets none, the shape is a word with a colon [J1, J2].
- `model` carries one more ruling: its default format moves from `$provider: $model` to `$provider/$model` [J2]. That overrides both advisors, who rejected a format change [C "Rejected"].
- A default label precedes whatever format binds, configured or default, when no `label` is configured. Joel ruled it for every instrument on 2026-11-06: "Always in front of format, including its default" (`archive/2026-11-06-default-thinking-instrument/owner-rulings.md:27`); README.md:133-134 already warns of it for `thinking`. It is settled, not decided here.
- Joel's own footer sets emoji labels on `path`, `model`, `thinking` and `context`, and a `blank` with `format: ""` and no label. His file is never edited [R 2026-11-06; E Joel's live configuration].

## Goals / Non-Goals

**Goals:**
- Every shipped instrument that displays a datum renders a labelled default.
- The living spec states each labelled text, so spec and behaviour agree [C "Accepted" (Matt)].
- Tests prove each new default through the bindings.

**Non-Goals:**
- No change to binding, format parsing, gap, trim or layout [C "Mechanism"].
- No label variable, no icon default, no font detection [C "Rejected"; R 2026-11-06 ruling quoted at E README and archived rulings].
- No new instruments, no `context` thresholds, no custom instruments, no rename of `path`, no OpenSpec `context:` block [R "One card"].
- No edit to Joel's `pi-jefferson.json` [R].

## Decisions

### 1. Five `defaultLabel` fields, one per declaration

`path: "Path:"`, `context: "Context:"`, `tokens: "Tokens:"`, `cost: "Cost:"`, `model: "Model:"`, each declared as `thinking` declares its own at the instrument declaration source file. No trailing space; the gap supplies it [M 1 C; ADR 0006]. `thinking` is untouched.
- Reasoning: the declaration is the one place a default lives, and every reader reads it [living requirement "An instrument is declared once"]. Nothing else has a reason to change when a label's text does.
- Source: texts [J1, J2]; mechanism [C "Mechanism"].
- Alternatives beaten: an icon (font-dependent, no detection [C "Rejected"; C Q3]); a label variable (rejected by Joel's earlier ruling [R]); a label table outside the declarations (a second copy of a default).

### 2. `model`'s `defaultFormat` becomes `$provider/$model`

The format changes with its label, so the cell renders `Model: anthropic/claude-opus-4` [J2].
- It revises the living requirement "The model instrument", which says the default format `$provider: $model` "renders the text it renders today". The delta MODIFIES that requirement to state the label and the new format.
- It flips the assertions that pin `anthropic: claude-opus-4` through the default: configuration.test.ts, row-renderer.test.ts, jefferson.test.ts and instrument.test.ts, about 20 lines [M 2, "`model`'s ... next to a colon label"]. The default label also precedes a *configured* format (Decision 7); that is separate from the format change here.
- `label: ""` removes only the label. Whoever wants `anthropic: claude-opus-4` back sets `format: "$provider: $model"` too.
- Alternatives beaten: keep the format and get `Model: anthropic: claude-opus-4`, two colons, 31 columns (Neil [C]); no label (Matt [C]). Both lost to Joel's ruling [J2].

### 3. `blank` declares no default label

Source: [J1]. Reasons, in the council's and Michael's terms:
- `blank` displays no datum (living spec: an instrument that displays no datum is outside the duty), so nothing declared can ever suppress its label [M 2; C].
- A label would render `Blank:` in both blank cells of Joel's second row, because `format: ""` leaves the label alone, and `Blank: Lorem ipsum…` across the ten-cell default row and in any misspelt instrument name [M 2; C "Where both advisors agree"].
- That would change Joel's footer, which only he can repair, against "a user shouldn't have to configure any more than truly necessary" [R; M 4].
- The delta pins it: the added requirement says `blank` MUST declare no default label, with a scenario. A test pins it too (Decision 5).

### 4. Widths each label adds

Content-sized cells grow by label plus gap. Measured widths, no label to label [M 2]: path 12→18, tokens 1→9, cost 6→12, context 10→19, thinking 14→14. Michael measured `model` at 24→31 under the old format. With `$provider/$model` the format is one column shorter (the `: ` is replaced by `/`), so `Model: anthropic/claude-opus-4` is 30 columns. Michael measured 30 through `instrumentBindings` at width 0 with the ruled declaration, and 23 for `anthropic/claude-opus-4` under `label: ""` [Michael's PL4 verdict, `michael-pl4.json`].
- In a `path, model, thinking` row at 80 columns with `model` and `thinking` right-aligned (the shape of the living scenario "The row is narrower"), `path` absorbs the growth and takes 17 columns of slack: 18 + 17 + 30 + 1 joint + 14 = 80. In the all-left row the last non-empty cell, `thinking`, absorbs instead, so the alignments are part of the row test's input [redgreen-derek.md "Row test"; M 2]. Michael found the "path text still fits" scenario holds; with model one column shorter than he measured, the margin is one column larger.
- With a `$bar`, the label and gap come out of the bar, so `Context: ██░░░ 43.2%` fills exactly 20 columns [M 2]. At 8 columns the bar is 0 and the cell's clip handles the overflow, as before [M 2].
- No arithmetic changes: a label counts toward a content-sized cell already (ADR 0007).

### 5. Tests

All through the bindings, because the `render()` helper in `instrument.test.ts` bypasses labels and stays green with the label deleted [C "Tests must render through the bindings"; M 2].
- **Retired or rewritten, not re-pinned** [C "Accepted"]: the test asserting that only `thinking` has a default label (instrument.test.ts:60 [M 2]), rewritten to assert the five declared texts and `blank` and `thinking`'s; and the assertion "no label and no default label renders as before" (configuration.test.ts:580-588, in the test starting at :580), whose premise this change retires, rewritten around what an unlabelled configuration now renders.
- **The 38 moved expectations**: the 38 of 309 tests that fail once the six declaration lines land, measured by Michael at 60c647b [Michael's PL4 verdict] and again by Derek at a8af447 [redgreen-derek.md]. The count comes from a failing run, not grep. They split into 27 flipped (unlabelled text becomes labelled text, or a configured format with no label gains one), 9 fixture `label: ""` (Decision 7) and 2 rewritten (configuration.test.ts:580 and :940, whose premise this change retires; the rewritten label assertion at instrument.test.ts:60 sits inside the flipped test at :53). The change also corrects two titles it made false: configuration.test.ts:940 and instrument.test.ts:89. The tasks list each with its file and line from Derek's run.
- **Format-language tests set `label: ""`** in their fixture (Decision 7); they are not given the label in their expectation.
- **New, through bindings**: for each of the five, a default renders `Label content`; a configured label replaces it; `label: ""` removes it with no gap; an unknown datum renders nothing. `blank` renders no label with nothing configured and renders nothing under `format: ""`. One row test renders `path`, `model` and `thinking` at 80 columns with no labels configured and asserts the texts' columns: it fails if `path` stops absorbing the growth, or if any label is missing or doubled. Each new test must be red before its declaration is added.
- The `render()` helper tests of default formats stay as they are; the format change in Decision 2 still flips its `anthropic: claude-opus-4` lines [M 2].

### 6. Docs pass, and no ADR

Not tasks. The README instruments table (README.md:103-111, no label column) gets a default-label column or text, and README.md:128, "Only `thinking` has a default label", is corrected. Its upgrading note pattern (README.md:133-136, set `label: ""` for the previous text) gets `model`'s format as well, and the configured-format case of Decision 7: a format with no label now shows the default label, `format: ""` shows it alone, `label: ""` restores the old text [M 1 J, 2].
- No ADR is warranted. The change picks a text for each declaration; it adds no structure, pattern or dependency, and the mechanism is the decision ADR 0006 already records. `blank` excluded and `model`'s format change are product choices, recorded here and in the spec. If the docs pass reads this differently, that is its call under the architecture-docs rules.

### 7. A default label precedes a configured format; format-language scenarios set `label: ""`

Binding puts the default label in front of whatever format binds when no `label` is configured [Joel, 2026-11-06, cited in Context]. So a document that sets `format` and no `label` on `model`, `path`, `context`, `tokens` or `cost` now shows the label; `format: ""` on one of them renders the label alone; `label: ""` is the way back.
- The delta's ADDED requirement states it with two scenarios, one for a configured format and one for `format: ""`. It leaves replacement and `""` to the living requirement "An instrument's label is placed in front of its format" (one fact, one place).
- **The rule** [conductor's call]: a test or scenario whose subject is the format language sets `label: ""` in its WHEN. The fixture isolates the format from the default label, and the expectation stays the format's own text. The rule widens to a test whose subject is not the label and whose assertion a default label would mask [conductor's ruling during the red/green run; redgreen-derek.md]. The case is the four replacement tests at jefferson.test.ts:656: at 80 columns and 8 per cell, every labelled text clips to the same ellipsis for old and new, so the test could no longer tell a dropped context from a kept one. `path`, `model`, `tokens` and `cost` take `label: ""` there (`thinking` already had it).
- Applied to seven living scenarios. The search: every living WHEN that configures `model`, `path`, `context`, `tokens` or `cost` with a format and no label, keeping those that pin an exact text or width (statusline spec 741, 774, 786, 879, 925, 930, 937). Four other hits state no exact text or width and stay true (702, 747, 967, 1270) [michael-pl4-2.json]. The seven: "Literal text among variables", "A pipe no name follows", "Space at the front or back of a format", "A bar in a cell with room", "A modifier on a variable", "A modifier on literal text" and "A chain on literal text". The delta MODIFIES their three requirements ("An instrument's format is plain text and variables", "$bar takes the width the rest of the format leaves", "A modifier follows a variable or literal text"), copying each whole and adding `label: ""` to those seven WHENs.
- Applied to the matching tests in the 38 (Decision 5), the `$bar` test among them: their fixtures gain `label: ""`; expectations do not change. The fixture class is 9 tests: five format-language or bar tests and the four replacement tests.

## Risks / Trade-offs

- **A config that relied on unlabelled defaults now shows labels** → this is the break [R "Breaks are cheap before 1.0"]. `label: ""` is the way back for each, and README's upgrading note says so.
- **A configured format with no label now shows the label** → on `model`, `path`, `context`, `tokens` and `cost`, a document with a `format` and no `label` renders the label before it, and `format: ""` renders the label alone. Already ruled [Joel, 2026-11-06]; `label: ""` restores the old text. Named in the upgrading note (Decision 6).
- **Joel's footer is unaffected** → his four configured labels replace the defaults, `blank` has none, and `tokens` and `cost` are in none of his cells [E Joel's live configuration; C].
- **`model`'s old text is not one `label: ""` away** → a user who wants `anthropic: claude-opus-4` sets the format too. Named in the README note (Decision 6).
- **Wider cells** → content-sized rows shift slack from the absorbing cell (Decision 4). The row test in Decision 5 pins the 80-column case.
- **A misspelt instrument name still renders as `blank`** → unchanged, and with no label it stays quiet [M 2].
- **A future unlabelled instrument** → nothing forces a label on a new instrument. The spec states only that a declared label behaves; it does not require one. Deliberate: "every shipped" is a statement about today, and `blank` shows a rule would need an exception.
- **The flip set is a measurement at 60c647b** → the tasks start from a fresh failing run after the declarations change and list every flipped test with file and line.

## Migration Plan

One commit's worth of declarations and test flips; no data, no config schema, no flag. Rollback is reverting the five fields and the format. Users keep old text per instrument with `label: ""`, and for `model` with `format` as well.

## Open Questions

- None. The `model` width, the one open question, is closed by measurement (Decision 4).
