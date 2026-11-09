# Red/green proof of every check (Derek, scratch spike)

Joel's ruling (2026-11-08 kickoff): *"Before drafting tasks, run every check a task relies on and show it go red and green."* Derek run `6726d9f2-aa6d-452f-8fbb-9169a3e53442`, 2026-11-08, worktree `/tmp/dl-spike`, branch `default-labels-spike`: red `b92c855`, green `f515a9b`, on `a8af447`. Nothing here ships. Conductor ruling during the run: a test whose subject is not the label, and whose assertion a default label would mask, takes `label: ""` in its fixture (the four replacement tests at jefferson.test.ts:656). Transcribed verbatim.

Everything is measured, restored and clean. Report follows.

## What is done and what is not

Every check the brief names was written, shown red against `a8af447`, shown green after the six declaration lines, and each declaration was reverted once so its bite is named; the 38 flipped tests are classified and moved; `pnpm test` is 317/317, `pnpm typecheck` clean, `openspec validate default-labels --strict` valid. Not done, by contract: no Markdown edit (docs list below), no live observation in Joel's pi session, nothing shipped.

**Spike commits** (branch `default-labels-spike`, from `a8af447`):
- `b92c855` — the eight new checks, red against `a8af447`'s code.
- `f515a9b` — the five `defaultLabel`s + `model`'s `defaultFormat`, and the 38 moved expectations. Working tree clean; nothing staged.

## Tasks

### 1. Red — the eight new checks (all through `readConfiguration` / `createFooter`, none through `render()`)

All in `tests/configuration.test.ts`, next to the existing label tests.

| # | Test | Line | Red line against `a8af447` |
|---|---|---|---|
| 1 | `each of the five shipped default labels renders in front of its default format` | 730, assert 741 | `AssertionError: path` — actual `['pi-jefferson']`, expected `['Path: pi-jefferson']` |
| 2 | `a configured label replaces a shipped default and keeps the one gap` | 745 | **passed** on today's code (see "what makes it bite") |
| 3 | `an empty configured label removes a shipped default and its gap` | 751 | **passed** |
| 4 | `a shipped default label does not render over an unknown datum` | 757 | **passed** |
| 5 | `blank declares no default label, so its placeholder and its empty format carry none` | 768 | **passed** |
| 6 | `a shipped default label precedes a configured format` (`$path!`) | 776, assert 779 | actual `['pi-jefferson!']`, expected `['Path: pi-jefferson!']` |
| 7 | `an empty format on a shipped instrument leaves its default label alone` (`context`, `format: ""`) | 782, assert 785 | actual `['']`, expected `['Context:']` |
| 8 | `a path, model and thinking row at 80 columns keeps every text in its columns` | 788, assert 800 | actual `'pi-jefferson…anthropic: claude-opus-4 Thinking: High'`, expected `'Path: pi-jefferson…Model: anthropic/claude-opus-4 Thinking: High'` |

Red run: `ℹ tests 317 / ℹ pass 313 / ℹ fail 4`, each at its own assertion (741, 779, 785, 800), not an import or fixture error.

**The four that pass on today's code, and what makes each bite** (all measured, below):
- **replaces** / **removes** — bite when binding prefers the declaration's default over a configured label: inverting `instrument-binding.ts:29` to `declaration.defaultLabel ?? entry?.label ?? ""` turns **30** tests red, including :745 and :751.
- **unknown datum** — bites when a label can render without its content: returning the literal segments from `format.ts:188` instead of `""` turns **7** red, including :757. (With the guard in place a label cannot outlive its datum — it is a literal segment inside `resolveFormat` — so it pins machinery this change leans on rather than proving a new default.)
- **blank** — bites when `blank` declares a label: `defaultLabel: "Blank:"` turns **38** red, including :768 (and `instrument.test.ts:229`, the width-0/200 invariant, because `Blank:` changes a fill cell's text).

**Row test — the "stated failure input".** Input: `path` (left), `model` and `thinking` (right) at 80 columns with nothing configured — the shape of the living scenario "The row is narrower" (spec.md:1239-1243). It fails if `path` stops absorbing the slack (the 17-column pad moves), or if any label is missing or doubled. Measured geometry: 18 + 17 pad + 30 + 1 joint + 14 = 80; model text ends at column 65, thinking runs to 80. Verified at the default all-left row too: there the last non-empty cell (`thinking`) absorbs (`'Path: pi-jefferson Model: anthropic/claude-opus-4 Thinking: High                '`), so the alignments are part of the input, not decoration.

**Disclosure on #8.** My first derivation of the expected line put the joint space before `model`; production puts it before `thinking` (`widthPlan`'s `jointCells` adds the right-hand cell, and the joint is that cell's leading space). I corrected the literal — the column count and the three invariant facts (path at column 1, model ending at 65, thinking ending at 80, width 80) were unchanged — and then re-ran the corrected expectation against `a8af447`'s `instrument.ts` to confirm it is still red at :800 (`actual 'pi-jefferson…anthropic: claude-opus-4 Thinking: High'` vs `expected 'Path: pi-jefferson…Model: anthropic/claude-opus-4 Thinking: High'`), and restored `instrument.ts` afterwards. No production code was touched to satisfy a test.

### 2. Green — the six declaration lines and the 38 moved expectations

Declaration change (`extensions/jefferson/visuals/instrument.ts`, 6 lines): `model` `defaultFormat: "$provider/$model"` + `defaultLabel: "Model:"`; `path` `"Path:"`; `context` `"Context:"`; `tokens` `"Tokens:"`; `cost` `"Cost:"`. `blank` untouched, `thinking` untouched, binding/format/layout untouched. `git diff --stat` is 6 insertions, 1 deletion in production.

Failing run after the declarations: `ℹ tests 317 / ℹ pass 279 / ℹ fail 38` — the design's predicted 38, from a run, not a grep.

**flipped — 27 tests** (unlabelled text → labelled text; configured format with no label → label in front):

| run location | test | old → new |
|---|---|---|
| configuration.test.ts:120 (:124) | cells is both the count and the placement, in order | `anthropic: claude-opus-4` → `Model: anthropic/claude-opus-4` |
| :196 (:199) | a cell that declares no align normalizes to left | same |
| :295 (:299) | an instrument the extension does not implement renders blank… | same |
| :487 | an absent rowGap renders one empty line between the rows | `MODEL_LINE` :479 `"anthropic: claude-opus-4".padEnd(40)` → `"Model: anthropic/claude-opus-4".padEnd(40)` |
| :506 | rowGap 3, the ceiling… | `MODEL_LINE` |
| :525 | a misspelt rowgap is ignored… | `MODEL_LINE` |
| :572 (:576) | the instruments section sits beside either row envelope | `configured claude-opus-4` → `Model: configured claude-opus-4` |
| :855 (:861, :863) | trusted project instruments replace the agent document whole… | `anthropic: claude-opus-4` → `Model: anthropic/claude-opus-4`; `agent-model` → `Model: agent-model` |
| :866 (:876) | a configured name binds once across cells and rows… | `🧠: claude-opus-4 from anthropic` → `Model: 🧠: …`; `↑1.0k ↓2.0k` → `Tokens: ↑1.0k ↓2.0k` |
| :884 (:887, :890) | unknown instrument names in the section and cells share one exact notice | `anthropic: claude-opus-4` → `Model: anthropic/claude-opus-4` (both) |
| :992 (:996, :1000) | all six attributes accept boolean values… | styled `claude-opus-4` → styled `Model: ` + styled `claude-opus-4`; `claude-opus-4` → `Model: claude-opus-4` |
| instrument.test.ts:53 (shapes :32, :63) | the seven shipped declarations own their names, variables, defaults… | `$provider: $model` → `$provider/$model`; **plus the rewritten label assertion** |
| :76 (:81) | every shipped default parses and renders its declared text | `anthropic: claude-opus-4` → `anthropic/claude-opus-4` |
| :89 (:93) | model and thinking default formats keep their original text shapes | text flips (title corrected, below) |
| :110 (:115) | each declaration reads only the datums its variables display | model text |
| :184 (:222) | a footer's bound cost and tokens read one identical totals object… | `"$0.123".padEnd(40) + "212".padEnd(40)` → `"Cost: $0.123".padEnd(40) + "Tokens: 212".padEnd(40)` |
| jefferson.test.ts:385:3 ×5 (:397) | a {startup,new,resume,fork,reload} session renders the model and thinking level it was seeded with | `startsWith("anthropic: claude-opus-4")` → `startsWith("Model: anthropic/claude-opus-4")` |
| :419 (:430) | a model selection push changes the line… | `openai: gpt-5` → `Model: openai/gpt-5` |
| :465 (:478) | a push carrying the values the store already holds… | model text |
| :481 (:511) | a second session_start releases the first install… | `openai: gpt-5` → `Model: openai/gpt-5` |
| :623 (:628, :633) | a dispatched turn boundary repaints only changed totals… | `"0".padEnd(40) + "$0.000".padEnd(40)` → `"Tokens: 0"… + "Cost: $0.000"…`; then `212`/`$0.125` likewise |
| :643 (:651) | an unchanged turn boundary before the first render… | `"0".padEnd(80)` → `"Tokens: 0".padEnd(80)` |
| row-renderer.test.ts:429 (:442) | two cells holding the model instrument resolve identical text | `anthropic: claude-opus-4` → `anthropic/claude-opus-4 ` (one pad column in the 24-column cell) |

**fixture `label: ""` — 9 tests** (expectation unchanged; the fixture isolates what it is not testing):

| run location | test | fixture change |
|---|---|---|
| configuration.test.ts:1087 (:1090) | configured prose around a bar is styled per segment… | `context` gains `label: ""` |
| jefferson.test.ts:564 (:567) | configured formats, styles and a width-taking bar render end to end | `model` and `context` gain `label: ""` |
| :583 (:586) | …the same under equal distribution | `model` and `context` gain `label: ""` |
| :738 (:746) | Joel's second row keeps its thirds, with a real bar | `context` gains `label: ""` |
| :760 (:768) | a bar takes only what its own cell leaves… | `path` and `context` gain `label: ""` (the path label changes the leftover columns the test computes) |
| :656:3 ×4 | a {new,resume,fork,reload} replacement drops the old cwd, model, totals… | `path`, `model`, `tokens`, `cost` gain `label: ""` (`thinking` already had it) — **the conductor's ruling** |

**rewritten — 2 tests** (their premise this change retires):
- `instrument.test.ts:60` (in the test at :53): `declaration.defaultLabel === (name === "thinking" ? "Thinking:" : undefined)` → a six-entry labels map asserted for every declaration, so the five texts and `thinking`'s are stated and `blank`'s absence with them.
- `configuration.test.ts:588` (test at :580): `["anthropic: claude-opus-4"]` with message `"no label and no default label renders as before"` → `["Model: anthropic/claude-opus-4"]` with message `"with no label configured the shipped default label renders"`.

**Third premise the change retires (title corrected, expectation flipped):** `configuration.test.ts:940` "an explicitly empty configured format is accepted and renders nothing" — `format: ""` on `model` with no label now renders `Model:`, so expectation `""` → `"Model:"` and title → "…is accepted and leaves the default label alone". **Title corrected for accuracy:** `instrument.test.ts:89` "model and thinking default formats keep their original text shapes" → "…render their declared text", because `model`'s shape is deliberately changed.

Counts after the test changes: `ℹ tests 317 / ℹ pass 317 / ℹ fail 0`; `pnpm typecheck` → `$ tsc --noEmit`, no diagnostics; `openspec validate default-labels --strict` → `Change 'default-labels' is valid`.

### 3. Bites (each reverted, measured, restored; `git status` clean after each)

| reverted piece | tests | what turns red |
|---|---|---|
| `path` `"Path:"` | 4 fail | five-defaults (:730), configured format (:776), **80-column row (:788)**, declaration table (instrument:53) |
| `context` `"Context:"` | 3 fail | five-defaults, empty format (:782), declaration table |
| `tokens` `"Tokens:"` | 6 fail | five-defaults, binds-once (config:866), footer totals (instrument:188), declaration table, both turn-boundary renders (jefferson:623, :643) |
| `cost` `"Cost:"` | 4 fail | five-defaults, footer totals, declaration table, turn boundary (:623) |
| `model` `"Model:"` | 24 fail | five-defaults, **80-column row**, every model-text test (config:120/196/295/487/506/525/572/580/855/866/884/940/992, jefferson:385×5/419/465/481), declaration table |
| `model` `defaultFormat` back to `$provider: $model` | 24 fail | five-defaults, **80-column row**, the `render()`-helper defaults (instrument:53/80/93/114), row-renderer:429, every model-text test — the format change and its label are independent bites |
| `defaultLabel: "Blank:"` on `blank` | 38 fail | blank pin (config:768), the width-0/200 invariant (instrument:229), the whole default row (jefferson:282/794/809), all blank-cell configuration tests |
| *(extra)* binding precedence inverted | 30 fail | proves :745/:751 bite |
| *(extra)* unknown guard stripped to literals | 7 fail | proves :757 bites |

### 4. `openspec validate default-labels --strict`

`Change 'default-labels' is valid`.

## Questions

1. Asked whether `jefferson.test.ts:656`'s four replacement tests may take `label: ""` in their fixture instead of being flipped, because at 80 columns / 8 per cell every labelled text clips to the same ellipsis for old and new (`truncateToWidth("Path: old", 8)` = `truncateToWidth("Path: new", 8)` = `"Path:..."`), leaving the test unable to tell a dropped context from a kept one. **Answer: A — fixture `label: ""`, report it as a fixture case and name the reason, and apply the same rule to any other test where flipping would stop an assertion telling cases apart.** I checked all 27 flips for that property: the replacement tests were the only ones (the others keep `0` vs `212`, `old-provider` vs `new-provider`, `openai` vs `google` distinguishable). Applied and marked as `fixture label: ""` in the table above.

## Your calls

- All eight new checks live in `tests/configuration.test.ts` beside the existing label tests rather than in a new file; they go through `readConfiguration` and `createFooter`.
- The five default renders are one check with a five-entry table and a per-name assertion message, so a failure names the instrument (`AssertionError: path`).
- The 80-column row uses the living spec's row shape (path left, model and thinking right) because that is the row in which `path` absorbs; measured the all-left variant too and reported the difference rather than assuming it.
- The row check asserts the stripped line exactly (not three separate column numbers), which catches a missing, doubled or moved label in one assertion; the width assertion stays separate.
- The declaration-table rewrite uses a six-entry `labels` map so `blank`'s `undefined` is asserted by the same call as the six texts.
- Two test titles the change made false were corrected in the test files themselves (`configuration.test.ts:940`, `instrument.test.ts:89`).

## Docs for Bambadjan

- `README.md:106` — table row `| \`model\` | \`$provider\`, \`$model\` | \`$provider: $model\` |`: the default format is now `$provider/$model`.
- `README.md:103-111` — the instruments table has no default-label column; it needs one (`Path:`, `Context:`, `Tokens:`, `Cost:`, `Model:`, `Thinking:`; `blank` none).
- `README.md:128` — "Only `thinking` has a default label, `Thinking:`, so its default cell reads `Thinking: High`." False: six declarations carry one, and `model`'s default cell reads `Model: anthropic/claude-opus-4`.
- `README.md:133-136` — the upgrading note: the default label now also fronts a *configured* format on `model`, `path`, `context`, `tokens` and `cost`; `format: ""` renders the label alone; `label: ""` with the old `format` restores `anthropic: claude-opus-4`.
- `openspec/changes/default-labels/design.md` Decision 7 — per the conductor's ruling, widen "a test or scenario whose subject is the format language" to also cover a test whose subject is *not* the label and whose assertion a default label would mask (the four replacement tests: fixture `label: ""`).
- `openspec/changes/default-labels/design.md` Decision 4 — "In a `path, model, thinking` row at 80 columns, `path` absorbs the growth": measured true for the row the spec's 80-column scenario uses (model and thinking right-aligned), where `path` takes 17 columns of slack; at the default all-left row the last non-empty cell (`thinking`) absorbs. Worth stating the alignments.
- Not made false, checked: `ARCHITECTURE.md:55` (mechanism unchanged), `AGENTS.md:21-22` ("a `defaultLabel` … if it needs them"), `docs/adr/0006:40`. The living spec lines that pin unlabelled text (586, 605) sit inside "The path instrument" and "The context instrument", both MODIFIED by the delta.

## Not verified

- Joel's live observation in his own pi session — his task, not run here; `~/.pi/agent/pi-jefferson.json` was never read or written, and `/Users/joelleibow/Projects/pi-jefferson` was never touched.
- The Markdown edits the ruling implies (design.md Decision 7 wording, README) — outside my remit.
- Michael's 38 at `60c647b` was not re-measured; my own run at `a8af447` produced 38 after the six declaration lines, which matches.
- Nothing here ships: the spikes' test text is a template for the real Implement run, not a commit to land.