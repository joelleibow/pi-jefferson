# Design

Citations: [R] `owner-rulings.md`; [J1], [J2] Joel's two PL2 rulings in `council.md` "Joel's rulings"; [C] `council.md` (synthesis and accepted feedback); [E heading] `research-eleanor.md`; [M n] `michael-orientation.md` section n (a consult, not a ruling). Motivation is in `proposal.md`.

## Context

- A declaration may carry a `defaultLabel`. Binding puts it in front of the format with one gap, a configured `label` (`""` included) beats it, and an unknown datum returns `""` before the label is reached. `thinking` alone declares one, `Thinking:`, without a trailing space [E Label path; M 1 B–E].
- The shape of the change was ruled at PL2: `Path:`, `Context:`, `Tokens:`, `Cost:` and `Model:` are added, `Thinking:` stays, `blank` gets none, the shape is a word with a colon [J1, J2].
- `model` carries one more ruling: its default format moves from `$provider: $model` to `$provider/$model` [J2]. That overrides both advisors, who rejected a format change [C "Rejected"].
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
- It flips the assertions that pin `anthropic: claude-opus-4` through the default: configuration.test.ts, row-renderer.test.ts, jefferson.test.ts and instrument.test.ts, about 20 lines [M 2, "`model`'s ... next to a colon label"]. Tests that set their own `format` are not affected.
- `label: ""` removes only the label. Whoever wants `anthropic: claude-opus-4` back sets `format: "$provider: $model"` too.
- Alternatives beaten: keep the format and get `Model: anthropic: claude-opus-4`, two colons, 31 columns (Neil [C]); no label (Matt [C]). Both lost to Joel's ruling [J2].

### 3. `blank` declares no default label

Source: [J1]. Reasons, in the council's and Michael's terms:
- `blank` displays no datum (living spec: an instrument that displays no datum is outside the duty), so nothing declared can ever suppress its label [M 2; C].
- A label would render `Blank:` in both blank cells of Joel's second row, because `format: ""` leaves the label alone, and `Blank: Lorem ipsum…` across the ten-cell default row and in any misspelt instrument name [M 2; C "Where both advisors agree"].
- That would change Joel's footer, which only he can repair, against "a user shouldn't have to configure any more than truly necessary" [R; M 4].
- The delta pins it: the added requirement says `blank` MUST declare no default label, with a scenario. A test pins it too (Decision 5).

### 4. Widths each label adds

Content-sized cells grow by label plus gap. Measured widths, no label to label [M 2]: path 12→18, tokens 1→9, cost 6→12, context 10→19, thinking 14→14. Michael measured `model` at 24→31 under the old format. With `$provider/$model` the format is one column shorter (the `: ` is replaced by `/`), so `Model: anthropic/claude-opus-4` is 30 columns. That 30 is derived from his 31, not measured; the cell-width test measures it.
- In a `path, model, thinking` row at 80 columns, `path` absorbs the growth and loses about 13 columns of slack [M 2]. Michael found the "path text still fits" scenario holds; with model one column shorter than he measured, the margin is one column larger.
- With a `$bar`, the label and gap come out of the bar, so `Context: ██░░░ 43.2%` fills exactly 20 columns [M 2]. At 8 columns the bar is 0 and the cell's clip handles the overflow, as before [M 2].
- No arithmetic changes: a label counts toward a content-sized cell already (ADR 0007).

### 5. Tests

All through the bindings, because the `render()` helper in `instrument.test.ts` bypasses labels and stays green with the label deleted [C "Tests must render through the bindings"; M 2].
- **Retired or rewritten, not re-pinned** [C "Accepted"]: the test asserting that only `thinking` has a default label (instrument.test.ts:60 [M 2]), rewritten to assert the five declared texts and `blank` and `thinking`'s; and the test titled "no label and no default label renders as before" (configuration.test.ts:449 region [M 2]), whose premise this change retires, rewritten around what an unlabelled configuration now renders.
- **Flipped**: the through-binding assertions that pin unlabelled `pi-jefferson`, `43.2%/200k`, `0`, `$0.123` or `anthropic: claude-opus-4` — about 36 lines across configuration.test.ts, row-renderer.test.ts and jefferson.test.ts [M 2, "Tests that pin unlabelled output"]. The tasks list them from a fresh grep; Michael's count is from grep, not from a failing run.
- **New, through bindings**: for each of the five, a default renders `Label content`; a configured label replaces it; `label: ""` removes it with no gap; an unknown datum renders nothing. `blank` renders no label with nothing configured and renders nothing under `format: ""`. A cell-width test pins the Decision 4 widths. Each new test must be red before its declaration is added.
- The `render()` helper tests of default formats stay as they are; the format change in Decision 2 still flips its `anthropic: claude-opus-4` lines [M 2].

### 6. Docs pass, and no ADR

Not tasks. The README instruments table (README.md:103-111, no label column) gets a default-label column or text, and README.md:128, "Only `thinking` has a default label", is corrected. Its upgrading note pattern (README.md:133-136, set `label: ""` for the previous text) gets `model`'s format as well [M 1 J, 2].
- No ADR is warranted. The change picks a text for each declaration; it adds no structure, pattern or dependency, and the mechanism is the decision ADR 0006 already records. `blank` excluded and `model`'s format change are product choices, recorded here and in the spec. If the docs pass reads this differently, that is its call under the architecture-docs rules.

## Risks / Trade-offs

- **A config that relied on unlabelled defaults now shows labels** → this is the break [R "Breaks are cheap before 1.0"]. `label: ""` is the way back for each, and README's upgrading note says so. Joel's footer is unaffected except `tokens` and `cost`, which his document does not configure [E Joel's live configuration].
- **`model`'s old text is not one `label: ""` away** → a user who wants `anthropic: claude-opus-4` sets the format too. Named in the README note (Decision 6).
- **Wider cells** → content-sized rows shift slack from the absorbing cell (Decision 4). No width test exists for the new totals until Decision 5 adds one.
- **A misspelt instrument name still renders as `blank`** → unchanged, and with no label it stays quiet [M 2].
- **A future unlabelled instrument** → nothing forces a label on a new instrument. The spec states only that a declared label behaves; it does not require one. Deliberate: "every shipped" is a statement about today, and `blank` shows a rule would need an exception.
- **Test count rests on grep** → the tasks start from a failing run after the declarations change, not from the list here.

## Migration Plan

One commit's worth of declarations and test flips; no data, no config schema, no flag. Rollback is reverting the five fields and the format. Users keep old text per instrument with `label: ""`, and for `model` with `format` as well.

## Open Questions

- Exact `model` width under the new format is derived (Decision 4), not measured; the width test settles it and changes nothing else.
